import { eq } from 'drizzle-orm';
import { getDb } from './index';
import { ensureTimerSchema } from './timers';
import { users, type UserRow } from './schema';

export async function findUserByUsername(username: string): Promise<UserRow | null> {
  await ensureTimerSchema();
  const rows = await getDb().select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return rows[0] ?? null;
}

/** Returns null when the username is already taken. */
export async function createUser(username: string, passwordHash: string): Promise<UserRow | null> {
  await ensureTimerSchema();
  const rows = await getDb()
    .insert(users)
    .values({ id: crypto.randomUUID(), username: username.toLowerCase(), passwordHash })
    .onConflictDoNothing()
    .returning();
  return rows[0] ?? null;
}
