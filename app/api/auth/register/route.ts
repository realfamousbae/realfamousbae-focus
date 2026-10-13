import { NextResponse } from 'next/server';
import {
  clientKey, createSessionToken, hashPassword, PASSWORD_MAX, PASSWORD_MIN, SESSION_COOKIE,
  sessionCookieOptions, tooManyAttempts, USERNAME_PATTERN,
} from '../../../auth';
import { createUser } from '../../../../db/users';

export async function POST(request: Request) {
  if (process.env.ALLOW_REGISTRATION === 'false') return error('registration_closed', 403);
  if (tooManyAttempts(`register:${clientKey(request)}`)) return error('too_many_attempts', 429);

  const body = await request.json().catch(() => null) as { username?: unknown; password?: unknown } | null;
  if (typeof body?.username !== 'string' || typeof body.password !== 'string') return error('invalid_body', 400);

  const username = body.username.trim();
  if (!USERNAME_PATTERN.test(username)) return error('invalid_username', 400);
  if (body.password.length < PASSWORD_MIN || body.password.length > PASSWORD_MAX) return error('invalid_password', 400);

  const user = await createUser(username, await hashPassword(body.password));
  if (!user) return error('username_taken', 409);

  const response = NextResponse.json({ ok: true }, { status: 201 });
  response.cookies.set(SESSION_COOKIE, createSessionToken(user), sessionCookieOptions());
  return response;
}

function error(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}
