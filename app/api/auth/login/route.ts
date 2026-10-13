import { NextResponse } from 'next/server';
import { clientKey, createSessionToken, SESSION_COOKIE, sessionCookieOptions, tooManyAttempts, verifyPassword } from '../../../auth';
import { findUserByUsername } from '../../../../db/users';

export async function POST(request: Request) {
  if (tooManyAttempts(`login:${clientKey(request)}`)) return error('too_many_attempts', 429);

  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown } | null;
  if (typeof body?.username !== 'string' || typeof body.password !== 'string') return error('invalid_body', 400);

  const user = await findUserByUsername(body.username.trim());
  const ok = user ? await verifyPassword(body.password, user.passwordHash) : false;
  if (!user || !ok) return error('invalid_credentials', 401);

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
  return response;
}

function error(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}
