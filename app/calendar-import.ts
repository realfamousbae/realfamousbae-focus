import type { Accent } from './timer-contract';

export type CalendarImportEvent = {
  title: string;
  description: string | null;
  accent: Accent;
  targetAt: string;
};

export type CalendarParseResult = {
  events: CalendarImportEvent[];
  skipped: number;
};

const MAX_EVENTS = 500;
const HORIZON_MONTHS = 12;

export function parseCalendarFile(fileName: string, source: string, now = Date.now()): CalendarParseResult {
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith('.csv')) return parseGoogleCsv(source, now);
  if (lowerName.endsWith('.ics') || lowerName.endsWith('.ical')) return parseIcs(source, now);
  throw new Error('unsupported_calendar');
}

export function mergeCalendarEvents(results: CalendarParseResult[]): CalendarParseResult {
  const seen = new Set<string>();
  const events: CalendarImportEvent[] = [];
  let skipped = results.reduce((sum, result) => sum + result.skipped, 0);

  for (const result of results) {
    for (const event of result.events) {
      const key = `${event.title.toLocaleLowerCase()}\u0000${event.targetAt}`;
      if (seen.has(key) || events.length >= MAX_EVENTS) {
        skipped += 1;
        continue;
      }
      seen.add(key);
      events.push(event);
    }
  }
  return { events: events.sort((a, b) => Date.parse(a.targetAt) - Date.parse(b.targetAt)), skipped };
}

function parseIcs(source: string, now: number): CalendarParseResult {
  const unfolded = source.replace(/^\uFEFF/, '').replace(/\r?\n[ \t]/g, '');
  const blocks = unfolded.match(/BEGIN:VEVENT[\s\S]*?END:VEVENT/gi) ?? [];
  const horizon = addMonths(new Date(now), HORIZON_MONTHS).getTime();
  const events: CalendarImportEvent[] = [];
  let skipped = 0;

  for (const block of blocks) {
    if (events.length >= MAX_EVENTS) { skipped += 1; continue; }
    const lines = block.split(/\r?\n/);
    const status = propertyValues(lines, 'STATUS')[0]?.value.toUpperCase();
    const startProp = propertyValues(lines, 'DTSTART')[0];
    const title = decodeIcsText(propertyValues(lines, 'SUMMARY')[0]?.value ?? '').trim();
    if (status === 'CANCELLED' || !startProp || !title) { skipped += 1; continue; }

    const start = parseIcsDate(startProp.meta, startProp.value);
    if (!start) { skipped += 1; continue; }
    const description = buildDescription(
      decodeIcsText(propertyValues(lines, 'DESCRIPTION')[0]?.value ?? ''),
      decodeIcsText(propertyValues(lines, 'LOCATION')[0]?.value ?? ''),
    );
    const excluded = new Set(
      propertyValues(lines, 'EXDATE')
        .flatMap((property) => property.value.split(',').map((value) => parseIcsDate(property.meta, value)?.getTime()))
        .filter((value): value is number => typeof value === 'number'),
    );
    const rule = parseRecurrence(propertyValues(lines, 'RRULE')[0]?.value);
    const occurrences = rule ? expandRecurrence(start, rule, now, horizon) : [start];

    for (const occurrence of occurrences) {
      const time = occurrence.getTime();
      if (time <= now || time > horizon || excluded.has(time)) { skipped += 1; continue; }
      events.push(toImportEvent(title, description, occurrence));
      if (events.length >= MAX_EVENTS) break;
    }
  }

  return mergeCalendarEvents([{ events, skipped }]);
}

function parseGoogleCsv(source: string, now: number): CalendarParseResult {
  const rows = parseCsvRows(source.replace(/^\uFEFF/, ''));
  if (rows.length < 2) return { events: [], skipped: rows.length };
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const index = (name: string) => headers.indexOf(name.toLowerCase());
  const subjectIndex = index('subject');
  const dateIndex = index('start date');
  const timeIndex = index('start time');
  const descriptionIndex = index('description');
  const locationIndex = index('location');
  if (subjectIndex < 0 || dateIndex < 0) throw new Error('invalid_google_csv');

  const horizon = addMonths(new Date(now), HORIZON_MONTHS).getTime();
  const events: CalendarImportEvent[] = [];
  let skipped = 0;
  for (const row of rows.slice(1)) {
    const title = (row[subjectIndex] ?? '').trim();
    const start = parseCsvDate(row[dateIndex] ?? '', timeIndex >= 0 ? row[timeIndex] ?? '' : '');
    if (!title || !start || start.getTime() <= now || start.getTime() > horizon || events.length >= MAX_EVENTS) {
      skipped += 1;
      continue;
    }
    const description = buildDescription(
      descriptionIndex >= 0 ? row[descriptionIndex] ?? '' : '',
      locationIndex >= 0 ? row[locationIndex] ?? '' : '',
    );
    events.push(toImportEvent(title, description, start));
  }
  return mergeCalendarEvents([{ events, skipped }]);
}

function propertyValues(lines: string[], name: string) {
  const upperName = name.toUpperCase();
  return lines.flatMap((line) => {
    const colon = line.indexOf(':');
    if (colon < 0) return [];
    const meta = line.slice(0, colon);
    if (meta.split(';', 1)[0].toUpperCase() !== upperName) return [];
    return [{ meta, value: line.slice(colon + 1) }];
  });
}

function decodeIcsText(value: string) {
  return value.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function parseIcsDate(meta: string, value: string): Date | null {
  const clean = value.trim();
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?)?(Z)?$/);
  if (!match) return null;
  const [, year, month, day, hour = '00', minute = '00', second = '00', utc] = match;
  const parts = [year, month, day, hour, minute, second].map(Number);
  if (utc) return new Date(Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]));
  const timeZone = meta.match(/(?:^|;)TZID=(?:"([^"]+)"|([^;:]+))/i)?.slice(1).find(Boolean);
  if (timeZone) return zonedDate(parts, timeZone);
  return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
}

function zonedDate(parts: number[], timeZone: string) {
  try {
    const desiredUtc = Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
    let guess = desiredUtc;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const formatted = new Intl.DateTimeFormat('en-CA', {
        timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
      }).formatToParts(new Date(guess));
      const values = Object.fromEntries(formatted.map((part) => [part.type, part.value]));
      const represented = Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day), Number(values.hour), Number(values.minute), Number(values.second));
      guess += desiredUtc - represented;
    }
    return new Date(guess);
  } catch {
    return new Date(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]);
  }
}

type Recurrence = { freq: string; interval: number; count: number | null; until: number | null };

function parseRecurrence(value?: string): Recurrence | null {
  if (!value) return null;
  const parts = Object.fromEntries(value.split(';').map((part) => {
    const [key, ...rest] = part.split('=');
    return [key.toUpperCase(), rest.join('=')];
  }));
  if (!['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'].includes(parts.FREQ)) return null;
  const until = parts.UNTIL ? parseIcsDate('UNTIL', parts.UNTIL)?.getTime() ?? null : null;
  return {
    freq: parts.FREQ,
    interval: Math.max(1, Number.parseInt(parts.INTERVAL || '1', 10) || 1),
    count: parts.COUNT ? Math.max(1, Number.parseInt(parts.COUNT, 10) || 1) : null,
    until,
  };
}

function expandRecurrence(start: Date, rule: Recurrence, now: number, horizon: number) {
  const dates: Date[] = [];
  for (let index = 0; index < 5_000; index += 1) {
    if (rule.count !== null && index >= rule.count) break;
    const date = occurrenceAt(start, rule.freq, rule.interval * index);
    const time = date.getTime();
    if (rule.until !== null && time > rule.until) break;
    if (time > horizon) break;
    if (time > now) dates.push(date);
    if (dates.length >= MAX_EVENTS) break;
  }
  return dates;
}

function occurrenceAt(start: Date, frequency: string, step: number) {
  const date = new Date(start);
  if (frequency === 'DAILY') date.setDate(date.getDate() + step);
  if (frequency === 'WEEKLY') date.setDate(date.getDate() + step * 7);
  if (frequency === 'MONTHLY') return addMonths(start, step);
  if (frequency === 'YEARLY') {
    const month = date.getMonth();
    date.setFullYear(date.getFullYear() + step, month, 1);
    date.setDate(Math.min(start.getDate(), daysInMonth(date.getFullYear(), month)));
  }
  return date;
}

function addMonths(date: Date, count: number) {
  const result = new Date(date);
  const wantedDay = result.getDate();
  result.setDate(1);
  result.setMonth(result.getMonth() + count);
  result.setDate(Math.min(wantedDay, daysInMonth(result.getFullYear(), result.getMonth())));
  return result;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function parseCsvRows(source: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];
    if (char === '"' && quoted && next === '"') { cell += '"'; index += 1; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (char === ',' && !quoted) { row.push(cell); cell = ''; continue; }
    if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(cell); cell = '';
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      continue;
    }
    cell += char;
  }
  row.push(cell);
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

function parseCsvDate(dateValue: string, timeValue: string) {
  const date = dateValue.trim();
  const iso = date.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dot = date.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  const slash = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  let year: number; let month: number; let day: number;
  if (iso) [, year, month, day] = iso.map(Number);
  else if (dot) [, day, month, year] = dot.map(Number);
  else if (slash) [, month, day, year] = slash.map(Number);
  else return null;

  const time = timeValue.trim();
  let hour = 0; let minute = 0;
  if (time) {
    const match = time.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (!match) return null;
    hour = Number(match[1]); minute = Number(match[2]);
    if (match[3]?.toUpperCase() === 'PM' && hour < 12) hour += 12;
    if (match[3]?.toUpperCase() === 'AM' && hour === 12) hour = 0;
  }
  const result = new Date(year, month - 1, day, hour, minute);
  return Number.isFinite(result.getTime()) ? result : null;
}

function buildDescription(description: string, location: string) {
  const cleanDescription = description.trim();
  const cleanLocation = location.trim();
  const combined = [cleanDescription, cleanLocation ? `📍 ${cleanLocation}` : ''].filter(Boolean).join('\n');
  return combined ? combined.slice(0, 280) : null;
}

function toImportEvent(title: string, description: string | null, date: Date): CalendarImportEvent {
  return { title: title.slice(0, 80), description, accent: accentFor(title), targetAt: date.toISOString() };
}

function accentFor(value: string): Accent {
  const accents: Accent[] = ['green', 'cyan', 'violet', 'amber', 'coral'];
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return accents[Math.abs(hash) % accents.length];
}
