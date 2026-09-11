'use client';

import { useEffect, useRef, useState } from 'react';
import type { Timer } from './timer-contract';
import { claimNotification, EventTracker, eventKey } from './notification-state';

const messages = {
  ru: {
    enable: 'Включить уведомления', enabled: 'Уведомления включены', blocked: 'Уведомления заблокированы', unavailable: 'Уведомления недоступны', help: 'Об уведомлениях',
    hint: 'Держите сайт открытым, можно в фоновой вкладке. После сна компьютера уведомление может задержаться.',
    denied: 'Уведомления заблокированы. Разрешите их в настройках браузера для этого сайта.',
    unsupported: 'Этот браузер не поддерживает уведомления сайта.',
    failed: 'Не удалось включить или показать уведомление. Проверьте настройки браузера.',
    requesting: 'Запрашиваем разрешение…',
  },
  en: {
    enable: 'Enable notifications', enabled: 'Notifications enabled', blocked: 'Notifications blocked', unavailable: 'Notifications unavailable', help: 'About notifications',
    hint: 'Keep this site open, including in a background tab. Notifications may be delayed while your computer sleeps.',
    denied: 'Notifications are blocked. Allow them in your browser settings for this site.',
    unsupported: 'This browser does not support site notifications.',
    failed: 'Could not enable or display a notification. Check your browser settings.',
    requesting: 'Requesting permission…',
  },
};

function permissionState(): NotificationPermission | 'unsupported' {
  return window.isSecureContext && 'Notification' in window ? Notification.permission : 'unsupported';
}

export function TimerNotifications({ userKey, language, timers, now, ready }: {
  userKey: string; language: 'ru' | 'en'; timers: Timer[]; now: number; ready: boolean;
}) {
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [failed, setFailed] = useState(false);
  const tracker = useRef(new EventTracker());
  const requestInFlight = useRef(false);
  const live = useRef({ active: true, timers: new Map<string, Timer>() });
  const t = messages[language];

  useEffect(() => {
    const lifecycle = live.current;
    lifecycle.active = true;
    const refresh = () => setPermission(permissionState());
    const id = window.setTimeout(refresh, 0);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      lifecycle.active = false;
      window.clearTimeout(id);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    live.current.timers = new Map(timers.map((timer) => [eventKey(timer), timer]));
    const due = tracker.current.update(timers, Date.now());
    if (permissionState() !== 'granted') return;
    for (const timer of due) {
      void claimNotification(userKey, timer).then((claimed) => {
        const current = live.current.timers.get(eventKey(timer));
        if (!claimed || !live.current.active || !current || permissionState() !== 'granted') return;
        const notification = new Notification(`The «${current.title}» event has arrived!`, {
          tag: JSON.stringify([userKey, eventKey(timer)]),
          icon: '/brand-mark.png',
        });
        notification.onerror = () => { if (live.current.active) setFailed(true); };
        notification.onclick = () => { window.focus(); notification.close(); };
      }).catch(() => { if (live.current.active) setFailed(true); });
    }
  }, [timers, now, ready, userKey]);

  async function enable() {
    if (requestInFlight.current || permissionState() !== 'default') return;
    requestInFlight.current = true;
    setRequesting(true);
    setFailed(false);
    try {
      setPermission(await Notification.requestPermission());
    } catch {
      setFailed(true);
    } finally {
      requestInFlight.current = false;
      setRequesting(false);
    }
  }

  if (permission === null) return null;
  return (
    <div className={`notification-settings ${permission === 'granted' ? 'is-enabled' : ''}`}>
      <div className="notification-status">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 21h4" /></svg>
        {permission === 'default'
          ? <button type="button" disabled={requesting} onClick={() => void enable()}>{requesting ? t.requesting : t.enable}</button>
          : <span role="status">{permission === 'granted' ? t.enabled : permission === 'denied' ? t.blocked : t.unavailable}</span>}
        <details className="notification-help">
          <summary aria-label={t.help} title={t.help}>i</summary>
          <div className="notification-help-content">
            {permission === 'denied' && <p>{t.denied}</p>}
            {permission === 'unsupported' && <p>{t.unsupported}</p>}
            <p>{t.hint}</p>
          </div>
        </details>
      </div>
      {failed && <p className="notification-error" role="alert">{t.failed}</p>}
    </div>
  );
}
