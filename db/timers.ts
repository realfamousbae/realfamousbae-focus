import { env } from 'cloudflare:workers';
import { and, asc, eq } from 'drizzle-orm';
import { getDb } from './index';
import { timers, type TimerRow } from './schema';

let schemaReady: Promise<void> | null = null;

export function ensureTimerSchema() {
  schemaReady ??= (async () => {
    const d1 = env.DB;
    await d1.batch([
      d1.prepare(`CREATE TABLE IF NOT EXISTS timers (
        id text PRIMARY KEY NOT NULL,
        owner_id text NOT NULL,
        title text NOT NULL,
        description text,
        accent text DEFAULT 'green' NOT NULL,
        target_at integer NOT NULL,
        created_at integer NOT NULL,
        updated_at integer NOT NULL
      )`),
      d1.prepare(`CREATE INDEX IF NOT EXISTS idx_timers_owner_target
        ON timers (owner_id, target_at)`),
      d1.prepare('PRAGMA optimize'),
    ]);
  })();
  return schemaReady;
}

export async function listTimers(ownerId: string) {
  await ensureTimerSchema();
  return getDb().select().from(timers).where(eq(timers.ownerId, ownerId)).orderBy(asc(timers.targetAt));
}

export async function createTimer(row: TimerRow) {
  await ensureTimerSchema();
  await getDb().insert(timers).values(row);
  return row;
}

export async function updateTimer(ownerId: string, id: string, values: Pick<TimerRow, 'title' | 'description' | 'accent' | 'targetAt' | 'updatedAt'>) {
  await ensureTimerSchema();
  const updated = await getDb()
    .update(timers)
    .set(values)
    .where(and(eq(timers.id, id), eq(timers.ownerId, ownerId)))
    .returning();
  return updated[0] ?? null;
}

export async function deleteTimer(ownerId: string, id: string) {
  await ensureTimerSchema();
  const deleted = await getDb()
    .delete(timers)
    .where(and(eq(timers.id, id), eq(timers.ownerId, ownerId)))
    .returning({ id: timers.id });
  return deleted.length > 0;
}
