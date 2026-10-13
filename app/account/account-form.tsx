'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

type Language = 'ru' | 'en';

const copy = {
  ru: {
    title: 'смена пароля', current: 'текущий пароль', next: 'новый пароль', repeat: 'повторите новый пароль',
    submit: '[ сменить пароль ]', back: '← на главную', busy: '…', done: 'Пароль изменён.',
    mismatch: 'Пароли не совпадают.',
    errors: {
      invalid_credentials: 'Текущий пароль указан неверно.', invalid_password: 'Новый пароль: от 8 до 200 символов.',
      same_password: 'Новый пароль совпадает с текущим.', too_many_attempts: 'Слишком много попыток. Попробуйте позже.',
      unauthorized: 'Сессия истекла. Войдите заново.', generic: 'Что-то пошло не так. Попробуйте ещё раз.',
    },
  },
  en: {
    title: 'change password', current: 'current password', next: 'new password', repeat: 'repeat new password',
    submit: '[ change password ]', back: '← back home', busy: '…', done: 'Password changed.',
    mismatch: 'Passwords do not match.',
    errors: {
      invalid_credentials: 'The current password is wrong.', invalid_password: 'New password must be 8–200 characters.',
      same_password: 'The new password is the same as the current one.', too_many_attempts: 'Too many attempts. Try again later.',
      unauthorized: 'Session expired. Please sign in again.', generic: 'Something went wrong. Please try again.',
    },
  },
} as const;

export default function AccountForm({ username }: { username: string }) {
  const [language, setLanguage] = useState<Language>('ru');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const t = copy[language];

  useEffect(() => {
    const saved = window.localStorage.getItem('focus-language');
    const id = window.setTimeout(() => { if (saved === 'en' || saved === 'ru') setLanguage(saved); }, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setDone(false);
    if (newPassword !== repeat) {
      setError(t.mismatch);
      return;
    }
    setBusy(true);
    try {
      const response = await fetch('/api/auth/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (response.ok) {
        setDone(true);
        setCurrentPassword('');
        setNewPassword('');
        setRepeat('');
        return;
      }
      const body = await response.json().catch(() => null) as { error?: { code?: string } } | null;
      const code = body?.error?.code as keyof typeof t.errors | undefined;
      setError(code && code in t.errors ? t.errors[code] : t.errors.generic);
    } catch {
      setError(t.errors.generic);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="site-shell">
      <div className="auth-card">
        <Link className="auth-back" href="/">{t.back}</Link>
        <h1>{t.title}</h1>
        <p className="auth-hint">{username}</p>
        <form onSubmit={submit}>
          <label>{t.current}
            <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} autoComplete="current-password" required maxLength={200} />
          </label>
          <label>{t.next}
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" required minLength={8} maxLength={200} />
          </label>
          <label>{t.repeat}
            <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" required minLength={8} maxLength={200} />
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {done && <p className="auth-hint" role="status">{t.done}</p>}
          <button className="primary-button" type="submit" disabled={busy}>{busy ? t.busy : t.submit}</button>
        </form>
      </div>
    </main>
  );
}
