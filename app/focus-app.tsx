'use client';

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { ACCENTS, type Accent, type Timer } from './timer-contract';

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
    newTimer: '[ + новый таймер ]', active: 'Активные', completed: 'Завершённые',
    activeHint: 'от ближайшего к самому позднему', completedHint: 'сохраняются до ручного удаления',
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
    newTimer: '[ + new timer ]', active: 'Active', completed: 'Completed',
    activeHint: 'nearest first', completedHint: 'kept until you remove them',
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

  return (
    <main className={`site-shell ${user ? 'is-dashboard' : ''}`}>
      <Header language={language} toggleLanguage={toggleLanguage} user={user} />
      {user ? (
        <Dashboard
          t={t} language={language} user={user} active={sorted.active} completed={sorted.completed}
          now={now} loading={loading} loadError={loadError} onCreate={() => setEditor('new')}
          onEdit={setEditor} onDelete={setDeleting}
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
        <span className="brand-mark" aria-hidden="true">◉</span>
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

function Dashboard({ t, language, user, active, completed, now, loading, loadError, onCreate, onEdit, onDelete }: {
  t: typeof copy.ru | typeof copy.en; language: Language; user: NonNullable<User>; active: Timer[]; completed: Timer[]; now: number;
  loading: boolean; loadError: boolean; onCreate: () => void; onEdit: (timer: Timer) => void; onDelete: (timer: Timer) => void;
}) {
  return (
    <div className="dashboard" id="top">
      <section className="dashboard-intro">
        <div>
          <p className="eyebrow">{t.dashboardEyebrow}</p>
          <h1>{t.dashboardTitle}<span className="cursor" aria-hidden="true">_</span></h1>
          <p>{t.dashboardCopy}</p>
        </div>
        <button className="primary-button" type="button" onClick={onCreate}>{t.newTimer}</button>
      </section>

      {loading ? <StatePanel label={t.loading} pulse /> : loadError ? <StatePanel label={t.error} /> : (
        <>
          <TimerSection title={t.active} hint={t.activeHint} count={active.length}>
            {active.length ? active.map((timer, index) => (
              <TimerCard key={timer.id} timer={timer} now={now} language={language} featured={index === 0} onEdit={() => onEdit(timer)} onDelete={() => onDelete(timer)} />
            )) : (
              <div className="empty-state">
                <span aria-hidden="true">⌁</span><h3>{t.emptyTitle}</h3><p>{t.emptyCopy}</p>
                <button className="outline-button" type="button" onClick={onCreate}>{t.emptyAction}</button>
              </div>
            )}
          </TimerSection>
          {completed.length > 0 && (
            <TimerSection title={t.completed} hint={t.completedHint} count={completed.length} completed>
              {completed.map((timer) => <TimerCard key={timer.id} timer={timer} now={now} language={language} onEdit={() => onEdit(timer)} onDelete={() => onDelete(timer)} />)}
            </TimerSection>
          )}
        </>
      )}
      <footer className="footer-line"><span>realfamousbae focus</span><span>{user.email} · cloud sync on</span></footer>
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
  const style = { '--accent': accentColors[timer.accent] } as CSSProperties;
  return (
    <article className={`timer-card ${featured ? 'featured' : ''} ${ended ? 'is-completed' : ''}`} style={style}>
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
