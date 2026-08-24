import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const timers = sqliteTable(
  'timers',
  {
    id: text('id').primaryKey(),
    ownerId: text('owner_id').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    accent: text('accent').notNull().default('green'),
    targetAt: integer('target_at').notNull(),
    createdAt: integer('created_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [index('idx_timers_owner_target').on(table.ownerId, table.targetAt)],
);

export type TimerRow = typeof timers.$inferSelect;
