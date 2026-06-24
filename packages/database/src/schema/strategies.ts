// Trading Strategies table
import { pgTable, uuid, varchar, text, boolean, jsonb, timestamp, decimal } from 'drizzle-orm/pg-core';
import { users } from './users';

export const strategies = pgTable('strategies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  type: varchar('type', { length: 50 }).$type<'manual' | 'automated' | 'semi-automatic'>().default('manual'),
  timeframe: varchar('timeframe', { length: 20 }),
  parameters: jsonb('parameters').$type<Record<string, unknown>>().default({}),
  riskSettings: jsonb('risk_settings').$type<{
    maxRiskPercent: number;
    maxPositions: number;
    maxDrawdownPercent: number;
  }>(),
  isActive: boolean('is_active').default(true),
  isBacktested: boolean('is_backtested').default(false),
  winRate: decimal('win_rate', { precision: 5, scale: 2 }),
  profitFactor: decimal('profit_factor', { precision: 5, scale: 2 }),
  sharpeRatio: decimal('sharpe_ratio', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Strategy = typeof strategies.$inferSelect;
export type NewStrategy = typeof strategies.$inferInsert;
