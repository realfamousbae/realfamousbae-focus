import type { Accent } from './timer-contract';

export function fiveHourInput(
  fields: { title: string; description: string; accent: Accent },
  defaultTitle: string,
  now: number,
) {
  return {
    title: fields.title.trim() || defaultTitle,
    description: fields.description.trim() || null,
    accent: fields.accent,
    targetAt: new Date(now + 18_000_000).toISOString(),
  };
}
