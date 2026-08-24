import { NextResponse } from 'next/server';
import { importTimers } from '../../../../db/timers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { parseTimerInput, serializeTimer, type TimerInput } from '../../../timer-contract';

const MAX_IMPORT = 500;

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return errorResponse('unauthorized', 401);

  const body = await request.json().catch(() => null) as { timers?: unknown[] } | null;
  if (!body || !Array.isArray(body.timers) || body.timers.length === 0 || body.timers.length > MAX_IMPORT) {
    return errorResponse('invalid_import', 400);
  }

  const valid: TimerInput[] = [];
  let skipped = 0;
  for (const value of body.timers) {
    const parsed = parseTimerInput(value);
    if (parsed.data) valid.push(parsed.data);
    else skipped += 1;
  }
  if (valid.length === 0) return errorResponse('no_future_events', 400);

  const rows = await importTimers(user.userId, valid);
  skipped += valid.length - rows.length;
  return NextResponse.json({ timers: rows.map(serializeTimer), imported: rows.length, skipped });
}

function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}
