'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react';
import { ACCENTS, type Accent, type Timer } from './timer-contract';
import { mergeCalendarEvents, parseCalendarFile } from './calendar-import';

type Language = 'ru' | 'en';
type User = { displayName: string; email: string } | null;

const copy = {
  ru: {
    navDemo: 'демо', navTimers: 'таймеры', signIn: 'войти', signOut: 'выйти',
    eyebrow: '// время имеет значение', heroA: 'До важного', heroB: 'осталось немного.',
    heroCopy: 'Красивые живые таймеры для событий, которые не хочется упустить. Сохраняются в облаке и всегда идут рядом с вами.',
    createFirst: '[ создать первый таймер → ]', private: 'вход через ChatGPT · приватно',
    demoOverline: '01 / live countdown', demoTitle: 'Следующий важный момент', synced: 'синхронизировано',
    nearest: 'БЛИЖАЙШЕЕ СОБЫТИЕ', newYear: 'Новый год', quote: 'Мечты становятся планами, когда у них появляется дата.',
    dashboardEyebrow: '// ваш личный временной контур', dashboardTitle: 'Ваши события', dashboardCopy: 'Все важные моменты — в одном месте и на каждом устройстве.',
    newTimer: '[ + новый таймер ]', dropTitle: 'или перетащите календарь', dropHint: '.ics · .ical · Google .csv', chooseFile: '[ выбрать файл ]', importing: 'импортируем события…', importEmpty: 'В файле нет будущих событий.', importError: 'Не удалось прочитать календарь.', active: 'Активные', completed: 'Завершённые',
    activeHint: 'от ближайшего к самому позднему', completedHint: 'сохраняются до ручного удаления',
    viewLabel: 'Вид карточек', tileSize: 'Масштаб', connections: 'Связи', connectionsOn: 'линии: вкл', connectionsOff: 'линии: выкл',
    overview: 'Календарная шкала', overviewHint: 'события связаны с таймерами ниже', shortcutHint: '⌘/Ctrl + L — линии', scaleShortcutHint: 'Выберите масштаб карточек', sizeSmall: 'S', sizeMedium: 'M', sizeLarge: 'L',
    emptyTitle: 'Здесь пока тихо.', emptyCopy: 'Создайте первый таймер — и время начнёт двигаться к вашей цели.',
    emptyAction: '[ создать событие ]', loading: 'синхронизируем таймеры…', error: 'Не удалось загрузить таймеры. Попробуйте обновить страницу.',
    days: 'дней', hours: 'часов', minutes: 'минут', seconds: 'секунд', finished: 'СОБЫТИЕ НАСТУПИЛО',
    edit: 'редактировать', remove: 'удалить', formCreate: 'Создать таймер', formEdit: 'Редактировать таймер',
    formHint: 'Укажите точный момент — остальное мы посчитаем.', title: 'Название', titlePlaceholder: 'Например, запуск проекта',
    date: 'Дата и время', description: 'Описание', optional: 'необязательно', descriptionPlaceholder: 'Почему этот момент важен?', accent: 'Акцент',
    cancel: '[ отмена ]', save: '[ сохранить → ]', create: '[ создать → ]', saving: 'сохраняем…',
    deleteTitle: 'Удалить таймер?', deleteCopy: 'Это действие нельзя отменить. Таймер исчезнет со всех ваших устройств.',
    deleteAction: '[ удалить ]', created: 'Таймер создан', updated: 'Изменения сохранены', deleted: 'Таймер удалён', requestError: 'Что-то пошло не так. Попробуйте ещё раз.',
    titleError: 'Введите название до 80 символов.', dateError: 'Выберите будущую дату и время.', descError: 'Описание должно быть короче 280 символов.',
  },
  en: {
    navDemo: 'demo', navTimers: 'timers', signIn: 'sign in', signOut: 'sign out',
    eyebrow: '// time is what matters', heroA: 'The important things', heroB: 'are getting closer.',
    heroCopy: 'Beautiful live countdowns for the moments you do not want to miss. Saved to the cloud and always moving with you.',
    createFirst: '[ create your first timer → ]', private: 'ChatGPT sign-in · private',
    demoOverline: '01 / live countdown', demoTitle: 'Your next important moment', synced: 'synchronized',
    nearest: 'NEXT EVENT', newYear: 'New Year', quote: 'Dreams become plans when they have a date.',
    dashboardEyebrow: '// your personal time horizon', dashboardTitle: 'Your events', dashboardCopy: 'Every important moment, in one place and on every device.',
    newTimer: '[ + new timer ]', dropTitle: 'or drop a calendar here', dropHint: '.ics · .ical · Google .csv', chooseFile: '[ choose a file ]', importing: 'importing events…', importEmpty: 'No future events were found in this file.', importError: 'Could not read this calendar.', active: 'Active', completed: 'Completed',
    activeHint: 'nearest first', completedHint: 'kept until you remove them',
    viewLabel: 'Card view', tileSize: 'Scale', connections: 'Connections', connectionsOn: 'lines: on', connectionsOff: 'lines: off',
    overview: 'Calendar timeline', overviewHint: 'events connect to the timers below', shortcutHint: '⌘/Ctrl + L — lines', scaleShortcutHint: 'Choose a card scale', sizeSmall: 'S', sizeMedium: 'M', sizeLarge: 'L',
    emptyTitle: 'Quiet in here.', emptyCopy: 'Create your first timer and watch time start moving toward your goal.',
    emptyAction: '[ create an event ]', loading: 'synchronizing timers…', error: 'Could not load your timers. Try refreshing the page.',
    days: 'days', hours: 'hours', minutes: 'minutes', seconds: 'seconds', finished: 'THE MOMENT HAS ARRIVED',
    edit: 'edit', remove: 'delete', formCreate: 'Create timer', formEdit: 'Edit timer',
    formHint: 'Set the exact moment. We will count the rest.', title: 'Title', titlePlaceholder: 'For example, project launch',
    date: 'Date and time', description: 'Description', optional: 'optional', descriptionPlaceholder: 'Why does this moment matter?', accent: 'Accent',
    cancel: '[ cancel ]', save: '[ save → ]', create: '[ create → ]', saving: 'saving…',
    deleteTitle: 'Delete this timer?', deleteCopy: 'This cannot be undone. The timer will disappear from all your devices.',
    deleteAction: '[ delete ]', created: 'Timer created', updated: 'Changes saved', deleted: 'Timer deleted', requestError: 'Something went wrong. Please try again.',
    titleError: 'Enter a title up to 80 characters.', dateError: 'Choose a future date and time.', descError: 'Keep the description under 280 characters.',
  },
} as const;

const accentColors: Record<Accent, string> = {
  green: '#75fb91', cyan: '#67e8f9', violet: '#c4a7ff', amber: '#f3bd72', coral: '#ff857a',
};

const TILE_SCALES = [0.58, 0.78, 1.25] as const;

function getScaleMetrics(scale: number) {
  const digitSize = Math.min(51, Math.max(27, Math.round(51 * scale)));
  const unitPadding = Math.min(28, Math.max(16, 28 * scale));
  return {
    digitSize,
    titleSize: Math.min(36, Math.max(20, Math.round(36 * scale))),
    metaHeight: scale <= TILE_SCALES[0] ? 116 : 120,
    gridHeight: Math.round(digitSize + 19 + unitPadding * 2),
  };
}

function splitTime(targetAt: string, now: number) {
  const remaining = Math.max(0, Date.parse(targetAt) - now);
  return {
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining / 3_600_000) % 24),
    minutes: Math.floor((remaining / 60_000) % 60),
    seconds: Math.floor((remaining / 1_000) % 60),
  };
}

function nextNewYearIso() {
  const date = new Date();
  return new Date(date.getFullYear() + 1, 0, 1).toISOString();
}

function toLocalInput(iso: string) {
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function minLocalInput() {
  const date = new Date(Date.now() + 60_000);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function FocusApp({ user }: { user: User }) {
  const [language, setLanguage] = useState<Language>('ru');
  const [now, setNow] = useState(() => Date.now());
  const [timers, setTimers] = useState<Timer[]>([]);
  const [loading, setLoading] = useState(Boolean(user));
  const [loadError, setLoadError] = useState(false);
  const [editor, setEditor] = useState<Timer | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Timer | null>(null);
  const [notice, setNotice] = useState('');
  const [importing, setImporting] = useState(false);
  const t = copy[language];

  useEffect(() => {
    const saved = window.localStorage.getItem('focus-language');
    const preferred = saved === 'en' || saved === 'ru' ? saved : navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en';
    const id = window.setTimeout(() => setLanguage(preferred), 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    fetch('/api/timers')
      .then(async (response) => {
        if (!response.ok) throw new Error('load_failed');
        return response.json() as Promise<{ timers: Timer[] }>;
      })
      .then((data) => { if (!cancelled) setTimers(data.timers); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [user]);

  function toggleLanguage() {
    const next = language === 'ru' ? 'en' : 'ru';
    setLanguage(next);
    window.localStorage.setItem('focus-language', next);
  }

  function showNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 2800);
  }

  const sorted = useMemo(() => {
    const active = timers.filter((timer) => Date.parse(timer.targetAt) > now).sort((a, b) => Date.parse(a.targetAt) - Date.parse(b.targetAt));
    const completed = timers.filter((timer) => Date.parse(timer.targetAt) <= now).sort((a, b) => Date.parse(b.targetAt) - Date.parse(a.targetAt));
    return { active, completed };
  }, [timers, now]);

  async function saveTimer(input: Omit<Timer, 'id' | 'createdAt' | 'updatedAt'>, existing: Timer | null) {
    const response = await fetch(existing ? `/api/timers/${existing.id}` : '/api/timers', {
      method: existing ? 'PATCH' : 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });
    if (!response.ok) throw new Error('save_failed');
    const { timer } = await response.json() as { timer: Timer };
    setTimers((current) => existing ? current.map((item) => item.id === timer.id ? timer : item) : [...current, timer]);
    setEditor(null);
    showNotice(existing ? t.updated : t.created);
  }

  async function confirmDelete() {
    if (!deleting) return;
    const response = await fetch(`/api/timers/${deleting.id}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('delete_failed');
    setTimers((current) => current.filter((timer) => timer.id !== deleting.id));
    setDeleting(null);
    showNotice(t.deleted);
  }

  async function importCalendarFiles(files: File[]) {
    if (!files.length || importing) return;
    setImporting(true);
    try {
      const results = await Promise.all(files.map(async (file) => parseCalendarFile(file.name, await file.text())));
      const parsed = mergeCalendarEvents(results);
      if (!parsed.events.length) {
        showNotice(t.importEmpty);
        return;
      }
      const response = await fetch('/api/timers/import', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ timers: parsed.events }),
      });
      if (!response.ok) throw new Error('import_failed');
      const data = await response.json() as { timers: Timer[]; imported: number; skipped: number };
      setTimers((current) => [...current, ...data.timers]);
      const skipped = parsed.skipped + data.skipped;
      showNotice(language === 'ru'
        ? `Импортировано: ${data.imported}${skipped ? ` · пропущено: ${skipped}` : ''}`
        : `Imported: ${data.imported}${skipped ? ` · skipped: ${skipped}` : ''}`);
    } catch {
      showNotice(t.importError);
    } finally {
      setImporting(false);
    }
  }

  return (
    <main className={`site-shell ${user ? 'is-dashboard' : ''}`}>
      <Header language={language} toggleLanguage={toggleLanguage} user={user} />
      {user ? (
        <Dashboard
          t={t} language={language} user={user} active={sorted.active} completed={sorted.completed}
          now={now} loading={loading} loadError={loadError} onCreate={() => setEditor('new')}
          onEdit={setEditor} onDelete={setDeleting} onImport={importCalendarFiles} importing={importing}
        />
      ) : (
        <Landing t={t} language={language} now={now} />
      )}

      {editor && (
        <TimerEditor
          key={editor === 'new' ? 'new' : editor.id}
          timer={editor === 'new' ? null : editor}
          t={t}
          onClose={() => setEditor(null)}
          onSave={saveTimer}
        />
      )}
      {deleting && (
        <ConfirmDialog
          t={t}
          title={deleting.title}
          onClose={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      )}
      {notice && <div className="toast" role="status"><i /> {notice}</div>}
    </main>
  );
}

function Header({ language, toggleLanguage, user }: { language: Language; toggleLanguage: () => void; user: User }) {
  const t = copy[language];
  return (
    <header className="topbar">
      <a className="brand" href="#top" aria-label="realfamousbae focus — home">
        <Image className="brand-mark" src="/brand-mark.png" width={28} height={28} alt="" aria-hidden="true" priority />
        <span>realfamousbae <strong>focus</strong></span>
      </a>
      <nav className="top-actions" aria-label="Primary">
        <button className="language-button" type="button" onClick={toggleLanguage} aria-label="Switch language">{language === 'ru' ? 'RU / EN' : 'EN / RU'}</button>
        {user ? (
          <>
            <span className="account-chip" title={user.email}><i />{user.displayName}</span>
            <a className="outline-button" href="/signout-with-chatgpt?return_to=/">[ {t.signOut} ]</a>
          </>
        ) : (
          <a className="outline-button" href="/signin-with-chatgpt?return_to=/">[ {t.signIn} ]</a>
        )}
      </nav>
    </header>
  );
}

function Landing({ t, language, now }: { t: typeof copy.ru | typeof copy.en; language: Language; now: number }) {
  const demoTimer: Timer = {
    id: 'demo', title: t.newYear, description: t.quote, accent: 'green', targetAt: nextNewYearIso(), createdAt: '', updatedAt: '',
  };
  return (
    <>
      <section className="hero" id="top">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.heroA}<br /><span>{t.heroB}</span></h1>
        <p className="hero-copy">{t.heroCopy}</p>
        <div className="hero-actions">
          <a className="primary-button" href="/signin-with-chatgpt?return_to=/">{t.createFirst}</a>
          <span className="privacy-note"><i /> {t.private}</span>
        </div>
      </section>
      <section className="demo-section" aria-labelledby="demo-title">
        <div className="section-heading">
          <div><p className="eyebrow">{t.demoOverline}</p><h2 id="demo-title">{t.demoTitle}</h2></div>
          <span className="status-pill"><i /> {t.synced}</span>
        </div>
        <TimerCard timer={demoTimer} now={now} language={language} featured demo />
      </section>
    </>
  );
}

function Dashboard({ t, language, user, active, completed, now, loading, loadError, onCreate, onEdit, onDelete, onImport, importing }: {
  t: typeof copy.ru | typeof copy.en; language: Language; user: NonNullable<User>; active: Timer[]; completed: Timer[]; now: number;
  loading: boolean; loadError: boolean; onCreate: () => void; onEdit: (timer: Timer) => void; onDelete: (timer: Timer) => void;
  onImport: (files: File[]) => Promise<void>; importing: boolean;
}) {
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [showConnections, setShowConnections] = useState(false);
  const [tileScale, setTileScale] = useState<number>(TILE_SCALES[1]);
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem('focus-dashboard-view');
    const id = window.setTimeout(() => {
      if (saved) try {
        const value = JSON.parse(saved) as { connections?: boolean; tileScale?: number };
        setShowConnections(Boolean(value.connections));
        if (value.tileScale === 1) setTileScale(TILE_SCALES[1]);
        else if (typeof value.tileScale === 'number' && TILE_SCALES.some((scale) => scale === value.tileScale)) setTileScale(value.tileScale);
      } catch { /* Ignore malformed local preferences. */ }
      setPreferencesReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('focus-dashboard-view', JSON.stringify({ connections: showConnections, tileScale }));
  }, [showConnections, tileScale, preferencesReady]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        setShowConnections((visible) => !visible);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const scaleMetrics = getScaleMetrics(tileScale);

  return (
    <div
      className={`dashboard ${showConnections ? 'show-connections' : ''}`}
      id="top"
      ref={dashboardRef}
      style={{
        '--tile-scale': tileScale,
        '--timer-digit-size': `${scaleMetrics.digitSize}px`,
        '--timer-title-size': `${scaleMetrics.titleSize}px`,
        '--timer-meta-height': `${scaleMetrics.metaHeight}px`,
        '--timer-grid-height': `${scaleMetrics.gridHeight}px`,
      } as CSSProperties}
    >
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">{t.dashboardEyebrow}</p>
          <h1>{t.dashboardTitle}<span className="cursor" aria-hidden="true">_</span></h1>
          <p>{t.dashboardCopy}</p>
        </div>
        <CalendarDropzone t={t} onCreate={onCreate} onImport={onImport} importing={importing} />
      </section>

      {loading ? <StatePanel label={t.loading} pulse /> : loadError ? <StatePanel label={t.error} /> : (
        <>
          <DashboardControls t={t} showConnections={showConnections} tileScale={tileScale} onConnections={() => setShowConnections((value) => !value)} onScale={setTileScale} />
          {active.length > 0 && <CalendarTimeline t={t} timers={active} />}
          <div><TimerSection title={t.active} hint={t.activeHint} count={active.length}>
              {active.length ? active.map((timer, index) => (
                <TimerCard key={timer.id} timer={timer} now={now} language={language} featured={index === 0} onEdit={() => onEdit(timer)} onDelete={() => onDelete(timer)} />
              )) : (
                <div className="empty-state">
                  <span aria-hidden="true">⌁</span><h3>{t.emptyTitle}</h3><p>{t.emptyCopy}</p>
                  <button className="outline-button" type="button" onClick={onCreate}>{t.emptyAction}</button>
                </div>
              )}
            </TimerSection></div>
          {completed.length > 0 && (
            <TimerSection title={t.completed} hint={t.completedHint} count={completed.length} completed>
              {completed.map((timer) => <TimerCard key={timer.id} timer={timer} now={now} language={language} onEdit={() => onEdit(timer)} onDelete={() => onDelete(timer)} />)}
            </TimerSection>
          )}
          {showConnections && active.length > 0 && <ConnectionLayer containerRef={dashboardRef} />}
        </>
      )}
      <footer className="footer-line"><span>realfamousbae focus</span><span>{user.email} · cloud sync on</span></footer>
    </div>
  );
}

function DashboardControls({ t, showConnections, tileScale, onConnections, onScale }: {
  t: typeof copy.ru | typeof copy.en; showConnections: boolean; tileScale: number;
  onConnections: () => void; onScale: (scale: number) => void;
}) {
  const options = [[TILE_SCALES[0], t.sizeSmall], [TILE_SCALES[1], t.sizeMedium], [TILE_SCALES[2], t.sizeLarge]] as const;
  return <div className="dashboard-controls" aria-label={t.viewLabel}>
    <span>{t.tileSize}</span>
    <div className="scale-options" aria-label={t.tileSize} title={t.scaleShortcutHint}>{options.map(([value, label]) => <button key={label} type="button" className={tileScale === value ? 'selected' : ''} onClick={() => onScale(value)} aria-pressed={tileScale === value}>{label}</button>)}</div>
    <button className={`view-toggle ${showConnections ? 'is-active' : ''}`} type="button" onClick={onConnections} aria-pressed={showConnections} title={t.shortcutHint}>{showConnections ? t.connectionsOn : t.connectionsOff}</button>
  </div>;
}

function CalendarTimeline({ t, timers }: { t: typeof copy.ru | typeof copy.en; timers: Timer[] }) {
  const first = Date.parse(timers[0].targetAt);
  const last = Date.parse(timers[timers.length - 1].targetAt);
  const span = Math.max(last - first, 86_400_000);
  return <section className="calendar-timeline" aria-label={t.overview}>
    <div className="timeline-heading"><div><p className="eyebrow">00 / calendar</p><h2>{t.overview}</h2></div><span>{t.overviewHint}</span></div>
    <div className="timeline-track">
      {timers.map((timer) => {
        const position = timers.length === 1 ? 50 : 5 + ((Date.parse(timer.targetAt) - first) / span) * 90;
        const date = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'short' }).format(new Date(timer.targetAt));
        return <span key={timer.id} className="timeline-marker" data-timer-marker={timer.id} style={{ left: `${position}%`, '--accent': accentColors[timer.accent] } as CSSProperties} title={`${timer.title} · ${date}`}><i /><b>{date}</b></span>;
      })}
    </div>
  </section>;
}

function ConnectionLayer({ containerRef }: { containerRef: { current: HTMLDivElement | null } }) {
  const [paths, setPaths] = useState<Array<{ d: string; accent: string; x1: number; y1: number; x2: number; y2: number }>>([]);
  useEffect(() => {
    const update = () => {
      const container = containerRef.current;
      if (!container) return;
      const host = container.getBoundingClientRect();
      const next = Array.from(container.querySelectorAll<HTMLElement>('[data-timer-marker]')).flatMap((marker) => {
        const card = container.querySelector<HTMLElement>(`[data-timer-card="${marker.dataset.timerMarker}"]`);
        if (!card) return [];
        const a = marker.getBoundingClientRect(); const b = card.getBoundingClientRect();
        const x1 = a.left + a.width / 2 - host.left; const y1 = a.bottom - host.top;
        const x2 = b.left + Math.min(40, b.width / 2) - host.left; const y2 = b.top - host.top;
        const bend = y1 + Math.max(26, (y2 - y1) * .42);
        return [{ d: `M ${x1} ${y1} C ${x1} ${bend}, ${x2} ${bend}, ${x2} ${y2}`, accent: getComputedStyle(marker).getPropertyValue('--accent').trim() || '#75fb91', x1, y1, x2, y2 }];
      });
      setPaths(next);
    };
    update();
    const observer = new ResizeObserver(update); if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', update); window.addEventListener('scroll', update, { passive: true });
    return () => { observer.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update); };
  }, [containerRef]);
  return <svg className="connection-layer" aria-hidden="true">
    <defs>{paths.map((path, index) => <linearGradient key={`gradient-${path.d}-${index}`} id={`connection-gradient-${index}`} gradientUnits="userSpaceOnUse" x1={path.x1} y1={path.y1} x2={path.x2} y2={path.y2}>
      <stop offset="0" stopColor={path.accent} stopOpacity=".92" />
      <stop offset=".76" stopColor={path.accent} stopOpacity=".86" />
      <stop offset="1" stopColor={path.accent} stopOpacity="0" />
    </linearGradient>)}</defs>
    {paths.map((path, index) => <g key={`${path.d}-${index}`} style={{ color: path.accent }}>
      <path className="connection-haze" d={path.d} stroke={`url(#connection-gradient-${index})`} />
      <path className="connection-stroke" d={path.d} stroke={`url(#connection-gradient-${index})`} />
    </g>)}
  </svg>;
}

function CalendarDropzone({ t, onCreate, onImport, importing }: {
  t: typeof copy.ru | typeof copy.en; onCreate: () => void; onImport: (files: File[]) => Promise<void>; importing: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function acceptFiles(list: FileList | null) {
    if (!list) return;
    const files = Array.from(list).filter((file) => /\.(ics|ical|csv)$/i.test(file.name));
    void onImport(files);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div
      className={`calendar-dropzone ${dragging ? 'is-dragging' : ''} ${importing ? 'is-importing' : ''}`}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; }}
      onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFiles(event.dataTransfer.files); }}
      aria-busy={importing}
    >
      <button className="primary-button" type="button" onClick={onCreate}>{t.newTimer}</button>
      <span className="drop-divider">{importing ? t.importing : t.dropTitle}</span>
      <span className="drop-formats">{t.dropHint}</span>
      <input ref={inputRef} className="visually-hidden" type="file" accept=".ics,.ical,.csv,text/calendar,text/csv" multiple onChange={(event) => acceptFiles(event.target.files)} />
      <button className="import-file-button" type="button" disabled={importing} onClick={() => inputRef.current?.click()}>{t.chooseFile}</button>
      <span className="calendar-badges" aria-label="Supported calendars"><i>Apple</i><i>Google</i><i>Android</i></span>
    </div>
  );
}

function TimerSection({ title, hint, count, completed = false, children }: { title: string; hint: string; count: number; completed?: boolean; children: React.ReactNode }) {
  return (
    <section className={`timer-section ${completed ? 'completed-section' : ''}`}>
      <div className="section-heading">
        <div><p className="eyebrow">{completed ? '02 / history' : '01 / countdowns'}</p><h2>{title} <sup>{String(count).padStart(2, '0')}</sup></h2></div>
        <span className="section-hint">{hint}</span>
      </div>
      <div className="timer-list">{children}</div>
    </section>
  );
}

function TimerCard({ timer, now, language, featured = false, demo = false, onEdit, onDelete }: {
  timer: Timer; now: number; language: Language; featured?: boolean; demo?: boolean; onEdit?: () => void; onDelete?: () => void;
}) {
  const t = copy[language];
  const ended = Date.parse(timer.targetAt) <= now;
  const parts = splitTime(timer.targetAt, now);
  const units = [[parts.days, t.days], [parts.hours, t.hours], [parts.minutes, t.minutes], [parts.seconds, t.seconds]];
  const date = new Intl.DateTimeFormat(language === 'ru' ? 'ru-RU' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(timer.targetAt));
  const titleFit = timer.title.length > 40 ? 0.56 : timer.title.length > 30 ? 0.66 : timer.title.length > 22 ? 0.8 : 1;
  const style = { '--accent': accentColors[timer.accent], '--title-fit': titleFit } as CSSProperties;
  return (
    <article className={`timer-card ${featured ? 'featured' : ''} ${ended ? 'is-completed' : ''}`} data-timer-card={timer.id} style={style}>
      <div className="card-topline">
        <span className="terminal-dots" aria-hidden="true"><i /><i /><i /></span>
        <span>event://{timer.id.slice(0, 8)}</span>
        {!demo ? <span className="card-actions"><button type="button" onClick={onEdit}>{t.edit}</button><button type="button" onClick={onDelete}>{t.remove}</button></span> : <span />}
      </div>
      <div className="event-meta">
        <div><p className="event-label">{ended ? t.finished : t.nearest}</p><h3>{timer.title}</h3></div>
        <time dateTime={timer.targetAt}>{date}</time>
      </div>
      <div className="countdown-grid" aria-label={`${timer.title}: ${parts.days} ${t.days}, ${parts.hours} ${t.hours}, ${parts.minutes} ${t.minutes}, ${parts.seconds} ${t.seconds}`}>
        {units.map(([value, label], index) => (
          <div className="countdown-unit" key={label}><span className="digit-value">{index === 0 ? value : String(value).padStart(2, '0')}</span><small>{label}</small></div>
        ))}
      </div>
      <div className="card-footer"><span>{timer.description || t.quote}</span><span className="pulse-line" aria-hidden="true" /></div>
    </article>
  );
}

function TimerEditor({ timer, t, onClose, onSave }: {
  timer: Timer | null; t: typeof copy.ru | typeof copy.en; onClose: () => void;
  onSave: (input: Omit<Timer, 'id' | 'createdAt' | 'updatedAt'>, existing: Timer | null) => Promise<void>;
}) {
  const [title, setTitle] = useState(timer?.title ?? '');
  const [description, setDescription] = useState(timer?.description ?? '');
  const [targetAt, setTargetAt] = useState(timer ? toLocalInput(timer.targetAt) : '');
  const [accent, setAccent] = useState<Accent>(timer?.accent ?? 'green');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const date = new Date(targetAt);
    if (!cleanTitle || cleanTitle.length > 80) return setError(t.titleError);
    if (cleanDescription.length > 280) return setError(t.descError);
    if (!targetAt || !Number.isFinite(date.getTime()) || date.getTime() <= Date.now()) return setError(t.dateError);
    setSaving(true); setError('');
    try {
      await onSave({ title: cleanTitle, description: cleanDescription || null, accent, targetAt: date.toISOString() }, timer);
    } catch {
      setError(t.requestError); setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="editor-title">
        <div className="modal-top"><span>timer.editor</span><button type="button" onClick={onClose} aria-label="Close">×</button></div>
        <div className="modal-heading"><p className="eyebrow">{'// event configuration'}</p><h2 id="editor-title">{timer ? t.formEdit : t.formCreate}</h2><p>{t.formHint}</p></div>
        <form onSubmit={submit}>
          <label><span>{t.title}</span><input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder={t.titlePlaceholder} maxLength={80} /></label>
          <label><span>{t.date}</span><input type="datetime-local" value={targetAt} min={minLocalInput()} onChange={(e) => setTargetAt(e.target.value)} /></label>
          <label><span>{t.description} <small>({t.optional})</small></span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t.descriptionPlaceholder} maxLength={280} rows={3} /></label>
          <fieldset><legend>{t.accent}</legend><div className="accent-options">{ACCENTS.map((value) => <button key={value} type="button" className={accent === value ? 'selected' : ''} style={{ '--swatch': accentColors[value] } as CSSProperties} onClick={() => setAccent(value)} aria-label={value}><i /></button>)}</div></fieldset>
          {error && <p className="form-error" role="alert">! {error}</p>}
          <div className="modal-actions"><button className="outline-button" type="button" onClick={onClose}>{t.cancel}</button><button className="primary-button" type="submit" disabled={saving}>{saving ? t.saving : timer ? t.save : t.create}</button></div>
        </form>
      </section>
    </div>
  );
}

function ConfirmDialog({ t, title, onClose, onConfirm }: { t: typeof copy.ru | typeof copy.en; title: string; onClose: () => void; onConfirm: () => Promise<void> }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');
  async function confirm() { setWorking(true); try { await onConfirm(); } catch { setError(t.requestError); setWorking(false); } }
  return (
    <div className="modal-backdrop"><section className="modal confirm-modal" role="alertdialog" aria-modal="true" aria-labelledby="delete-title">
      <div className="danger-symbol">!</div><h2 id="delete-title">{t.deleteTitle}</h2><strong>{title}</strong><p>{t.deleteCopy}</p>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button className="outline-button" type="button" onClick={onClose}>{t.cancel}</button><button className="danger-button" type="button" onClick={confirm} disabled={working}>{working ? t.saving : t.deleteAction}</button></div>
    </section></div>
  );
}

function StatePanel({ label, pulse = false }: { label: string; pulse?: boolean }) {
  return <div className="state-panel"><span className={pulse ? 'loading-glyph' : ''}>◌</span><p>{label}</p></div>;
}
