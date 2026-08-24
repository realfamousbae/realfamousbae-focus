import type { TimerRow } from '../db/schema';

export const ACCENTS = ['green', 'cyan', 'violet', 'amber', 'coral'] as const;
export type Accent = (typeof ACCENTS)[number];

export type Timer = {
  id: string;
  title: string;
  description: string | null;
  accent: Accent;
  targetAt: string;
  createdAt: string;
  updatedAt: string;
};

export type TimerInput = {
  title: string;
  description: string | null;
  accent: Accent;
  targetAt: number;
};

export function serializeTimer(row: TimerRow): Timer {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    accent: ACCENTS.includes(row.accent as Accent) ? (row.accent as Accent) : 'green',
    targetAt: new Date(row.targetAt).toISOString(),
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export function parseTimerInput(value: unknown): { data?: TimerInput; error?: string } {
  if (!value || typeof value !== 'object') return { error: 'invalid_body' };
  const body = value as Record<string, unknown>;
  const title = typeof body.title === 'string' ? body.title.trim() : '';
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const accent = typeof body.accent === 'string' ? body.accent : '';
  const targetAt = typeof body.targetAt === 'string' ? Date.parse(body.targetAt) : NaN;

  if (!title || title.length > 80) return { error: 'invalid_title' };
  if (description.length > 280) return { error: 'invalid_description' };
  if (!ACCENTS.includes(accent as Accent)) return { error: 'invalid_accent' };
  if (!Number.isFinite(targetAt) || targetAt <= Date.now()) return { error: 'invalid_target' };

  return {
    data: {
      title,
      description: description || null,
      accent: accent as Accent,
      targetAt,
    },
  };
}
