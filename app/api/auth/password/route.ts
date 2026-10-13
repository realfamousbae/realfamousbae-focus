import { NextResponse } from 'next/server';
import {
  clientKey, createSessionToken, getSessionUser, hashPassword, PASSWORD_MAX, PASSWORD_MIN,
  SESSION_COOKIE, sessionCookieOptions, tooManyAttempts, verifyPassword,
} from '../../../auth';
import { findUserById, updatePasswordHash } from '../../../../db/users';

export async function POST(request: Request) {
  const session = await getSessionUser();
  if (!session) return error('unauthorized', 401);
  if (tooManyAttempts(`password:${session.userId}:${clientKey(request)}`)) return error('too_many_attempts', 429);

  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null;
  if (typeof body?.currentPassword !== 'string' || typeof body.newPassword !== 'string') return error('invalid_body', 400);
  if (body.newPassword.length < PASSWORD_MIN || body.newPassword.length > PASSWORD_MAX) return error('invalid_password', 400);

  const user = await findUserById(session.userId);
  if (!user) return error('unauthorized', 401);
  if (!(await verifyPassword(body.currentPassword, user.passwordHash))) return error('invalid_credentials', 403);
  if (body.currentPassword === body.newPassword) return error('same_password', 400);

  await updatePasswordHash(user.id, await hashPassword(body.newPassword));

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
  return response;
}

function error(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}
