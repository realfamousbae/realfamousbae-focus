import assert from 'node:assert/strict';
import test from 'node:test';
import { mergeCalendarEvents, parseCalendarFile } from './calendar-import.ts';

const now = Date.parse('2026-08-24T00:00:00.000Z');

test('parses future ICS events and skips cancelled events', () => {
  const result = parseCalendarFile('apple.ics', `BEGIN:VCALENDAR
BEGIN:VEVENT
UID:1
DTSTART:20260901T120000Z
SUMMARY:Project launch
DESCRIPTION:Ship it
END:VEVENT
BEGIN:VEVENT
UID:2
DTSTART:20260902T120000Z
SUMMARY:Cancelled
STATUS:CANCELLED
END:VEVENT
END:VCALENDAR`, now);

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].title, 'Project launch');
  assert.equal(result.events[0].targetAt, '2026-09-01T12:00:00.000Z');
});

test('expands a recurring ICS event inside the 12 month window', () => {
  const result = parseCalendarFile('google.ical', `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260901T090000Z
SUMMARY:Weekly review
RRULE:FREQ=WEEKLY;COUNT=3
END:VEVENT
END:VCALENDAR`, now);

  assert.deepEqual(result.events.map((event) => event.targetAt), [
    '2026-09-01T09:00:00.000Z',
    '2026-09-08T09:00:00.000Z',
    '2026-09-15T09:00:00.000Z',
  ]);
});

test('parses Google Calendar CSV including quoted descriptions', () => {
  const result = parseCalendarFile('calendar.csv', `Subject,Start Date,Start Time,Description,Location
Planning,09/10/2026,02:30 PM,"Agenda, goals",Studio`, now);

  assert.equal(result.events.length, 1);
  assert.equal(result.events[0].title, 'Planning');
  assert.match(result.events[0].description ?? '', /Agenda, goals/);
  assert.match(result.events[0].description ?? '', /Studio/);
});

test('deduplicates identical events merged from several files', () => {
  const event = { title: 'Same', description: null, accent: 'green' as const, targetAt: '2026-10-01T10:00:00.000Z' };
  const result = mergeCalendarEvents([{ events: [event], skipped: 0 }, { events: [event], skipped: 0 }]);
  assert.equal(result.events.length, 1);
  assert.equal(result.skipped, 1);
});
