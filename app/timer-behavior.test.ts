import assert from 'node:assert/strict';
import test from 'node:test';
import { fiveHourInput } from './timer-quick-create.ts';
import { EventTracker, eventKey } from './notification-state.ts';

const now = Date.parse('2026-09-11T12:34:56.789Z');
const timer = (id: string, offset: number) => ({
  id, title: id, targetAt: new Date(now + offset).toISOString(),
  description: null, accent: 'green' as const,
  createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(),
});

test('quick timer preserves fields and exactly five hours including milliseconds', () => {
  const result = fiveHourInput({ title: ' My timer ', description: ' Details ', accent: 'cyan' }, 'Fallback', now);
  assert.deepEqual(result, { title: 'My timer', description: 'Details', accent: 'cyan', targetAt: '2026-09-11T17:34:56.789Z' });
});

test('empty and whitespace titles use the supplied localized default', () => {
  for (const fallback of ['Сброс 5-часового лимита код-агента', 'Coding agent 5-hour limit reset']) {
    for (const title of ['', '   ']) {
      const result = fiveHourInput({ title, description: ' ', accent: 'violet' }, fallback, now);
      assert.equal(result.title, fallback);
      assert.equal(result.description, null);
    }
  }
});

test('old events are silent; multiple active events fire once after sleep', () => {
  const tracker = new EventTracker();
  const events = [timer('old', -100), timer('a', 1000), timer('b', 2000)];
  assert.deepEqual(tracker.update(events, now), []);
  assert.deepEqual(tracker.update(events, now + 5000).map(t => t.id), ['a', 'b']);
  assert.deepEqual(tracker.update(events, now + 6000), []);
  assert.deepEqual(new EventTracker().update(events, now + 6000), []);
});

test('renaming keeps identity while moving deadline arms a new event', () => {
  const tracker = new EventTracker();
  const initial = timer('a', 1000);
  tracker.update([initial], now);
  const renamed = { ...initial, title: 'Новое имя' };
  assert.equal(eventKey(initial), eventKey(renamed));
  assert.equal(tracker.update([renamed], now + 1000)[0].title, 'Новое имя');
  const moved = timer('a', 3000);
  assert.deepEqual(tracker.update([moved], now + 2000), []);
  assert.deepEqual(tracker.update([moved], now + 3000), [moved]);
});

test('deleted and replaced deadlines cannot trigger stale notifications', () => {
  const tracker = new EventTracker();
  tracker.update([timer('a', 1000)], now);
  assert.deepEqual(tracker.update([], now + 2000), []);
  const moved = timer('a', 4000);
  tracker.update([moved], now + 2500);
  const newer = timer('a', 6000);
  assert.deepEqual(tracker.update([newer], now + 4000), []);
  assert.deepEqual(tracker.update([newer], now + 6000), [newer]);
});
