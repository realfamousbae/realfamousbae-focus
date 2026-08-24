import { NextResponse } from 'next/server';
import { deleteTimer, updateTimer } from '../../../../db/timers';
import { getChatGPTUser } from '../../../chatgpt-auth';
import { parseTimerInput, serializeTimer } from '../../../timer-contract';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return errorResponse('unauthorized', 401);

  const parsed = parseTimerInput(await request.json().catch(() => null));
  if (!parsed.data) return errorResponse(parsed.error ?? 'invalid_body', 400);

  const { id } = await context.params;
  const updated = await updateTimer(user.userId, id, {
    title: parsed.data.title,
    description: parsed.data.description,
    accent: parsed.data.accent,
    targetAt: parsed.data.targetAt,
    updatedAt: Date.now(),
  });
  if (!updated) return errorResponse('not_found', 404);
  return NextResponse.json({ timer: serializeTimer(updated) });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getChatGPTUser();
  if (!user) return errorResponse('unauthorized', 401);

  const { id } = await context.params;
  const deleted = await deleteTimer(user.userId, id);
  if (!deleted) return errorResponse('not_found', 404);
  return new Response(null, { status: 204 });
}

function errorResponse(code: string, status: number) {
  return NextResponse.json({ error: { code } }, { status });
}
