// Detected Patterns table
import { pgTable, uuid, varchar, decimal, timestamp, text, boolean, integer, foreignKey } from 'drizzle-orm/pg-core';
import { users } from './users';
import { strategies } from './strategies';

export const patterns = pgTable('patterns', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  strategyId: uuid('strategy_id').references(() => strategies.id, { onDelete: 'set null' }),
  name: varchar('name', { length: 100 }).notNull(),
  type: varchar('type', { length: 50 }).$type<
    | 'candlestick'
    | 'chart'
    | 'technical'
  >().notNull(),
  category: varchar('category', { length: 100 }).notNull(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  timeframe: varchar('timeframe', { length: 10 }),
  direction: varchar('direction', { length: 10 }).$type<'bullish' | 'bearish' | 'neutral'>(),
  confidence: decimal('confidence', { precision: 5, scale: 2 }).notNull(),
  startTimestamp: timestamp('start_timestamp', { withTimezone: true }).notNull(),
  endTimestamp: timestamp('end_timestamp', { withTimezone: true }),
  priceAtDetection: decimal('price_at_detection', { precision: 18, scale: 5 }),
  description: text('description'),
  parameters: text('parameters'), // JSON string
  imageUrl: varchar('image_url', { length: 500 }),
  isConfirmed: boolean('is_confirmed').default(false),
  outcome: varchar('outcome', { length: 20 }).$type<'success' | 'failed' | 'pending'>(),
  profitAtCompletion: decimal('profit_at_completion', { precision: 18, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Pattern = typeof patterns.$inferSelect;
export type NewPattern = typeof patterns.$inferInsert;
