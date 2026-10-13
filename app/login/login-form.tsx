'use client';

import Link from 'next/link';
import { useEffect, useState, type FormEvent } from 'react';

type Language = 'ru' | 'en';

const copy = {
  ru: {
    login: 'вход', register: 'регистрация', username: 'логин', password: 'пароль', submitLogin: '[ войти ]',
    submitRegister: '[ создать аккаунт ]', switchToRegister: 'нет аккаунта? зарегистрироваться',
    switchToLogin: 'уже есть аккаунт? войти', back: '← на главную', busy: '…',
    hintRegister: 'логин: 3–32 символа (a–z, 0–9, _ . -), пароль: от 8 символов',
    errors: {
      invalid_credentials: 'Неверный логин или пароль.', username_taken: 'Этот логин уже занят.',
      invalid_username: 'Логин: 3–32 символа, только латиница, цифры, _ . -', invalid_password: 'Пароль: от 8 до 200 символов.',
      too_many_attempts: 'Слишком много попыток. Попробуйте позже.', registration_closed: 'Регистрация закрыта.',
      generic: 'Что-то пошло не так. Попробуйте ещё раз.',
    },
  },
  en: {
    login: 'sign in', register: 'sign up', username: 'username', password: 'password', submitLogin: '[ sign in ]',
    submitRegister: '[ create account ]', switchToRegister: 'no account? sign up', switchToLogin: 'have an account? sign in',
    back: '← back home', busy: '…',
    hintRegister: 'username: 3–32 chars (a–z, 0–9, _ . -), password: 8+ characters',
    errors: {
      invalid_credentials: 'Wrong username or password.', username_taken: 'This username is already taken.',
      invalid_username: 'Username: 3–32 chars, letters, digits, _ . -', invalid_password: 'Password must be 8–200 characters.',
      too_many_attempts: 'Too many attempts. Try again later.', registration_closed: 'Registration is closed.',
      generic: 'Something went wrong. Please try again.',
    },
  },
} as const;

export default function LoginForm({ allowRegistration }: { allowRegistration: boolean }) {
  const [language, setLanguage] = useState<Language>('ru');
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const t = copy[language];

  useEffect(() => {
    const saved = window.localStorage.getItem('focus-language');
    const id = window.setTimeout(() => { if (saved === 'en' || saved === 'ru') setLanguage(saved); }, 0);
    return () => window.clearTimeout(id);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (response.ok) {
        window.location.href = '/';
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
        <h1>{mode === 'login' ? t.login : t.register}</h1>
        <form onSubmit={submit}>
          <label>{t.username}
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required minLength={3} maxLength={32} />
          </label>
          <label>{t.password}
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required minLength={mode === 'register' ? 8 : 1} maxLength={200} />
          </label>
          {mode === 'register' && <p className="auth-hint">{t.hintRegister}</p>}
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? t.busy : mode === 'login' ? t.submitLogin : t.submitRegister}
          </button>
        </form>
        {allowRegistration && (
          <button className="auth-switch" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}>
            {mode === 'login' ? t.switchToRegister : t.switchToLogin}
          </button>
        )}
        <button className="auth-switch" type="button" onClick={() => { const next = language === 'ru' ? 'en' : 'ru'; setLanguage(next); window.localStorage.setItem('focus-language', next); }}>
          {language === 'ru' ? 'RU / EN' : 'EN / RU'}
        </button>
      </div>
    </main>
  );
}
