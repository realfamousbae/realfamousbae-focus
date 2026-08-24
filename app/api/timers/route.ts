import { NextResponse } from 'next/server';
import { createTimer, listTimers } from '../../../db/timers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { parseTimerInput, serializeTimer } from '../../timer-contract';

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return errorResponse('unauthorized', 401);

  const rows = await listTimers(user.userId);
  return NextResponse.json({ timers: rows.map(serializeTimer) });
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return errorResponse('unauthorized', 401);

  const parsed = parseTimerInput(await request.json().catch(() => null));
  if (!parsed.data) return errorResponse(parsed.error ?? 'invalid_body', 400);

  const now = Date.now();
  const row = await createTimer({
    id: crypto.randomUUID(),
    ownerId: user.userId,
    title: parsed.data.title,
    description: parsed.data.description,
    accent: parsed.data.accent,
    targetAt: parsed.data.targetAt,
    createdAt: now,
    updatedAt: now,
  });
  return NextResponse.json({ timer: serializeTimer(row) }, { status: 201 });
}

function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}
