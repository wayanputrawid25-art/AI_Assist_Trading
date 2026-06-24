// Trading Symbols table
import { pgTable, uuid, varchar, decimal, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';

export const symbols = pgTable('symbols', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 10 }).notNull().unique(),
  description: varchar('description', { length: 255 }),
  category: varchar('category', { length: 50 }).$type<'forex' | 'crypto' | 'commodity' | 'index' | 'stock'>().default('forex'),
  digits: integer('digits').notNull().default(5),
  contractSize: decimal('contract_size', { precision: 10, scale: 2 }).default('100000'),
  tickValue: decimal('tick_value', { precision: 18, scale: 8 }),
  tickSize: decimal('tick_size', { precision: 18, scale: 8 }),
  spreadMin: decimal('spread_min', { precision: 10, scale: 1 }),
  spreadAvg: decimal('spread_avg', { precision: 10, scale: 1 }),
  swapLong: decimal('swap_long', { precision: 10, scale: 2 }),
  swapShort: decimal('swap_short', { precision: 10, scale: 2 }),
  marginHedge: decimal('margin_hedge', { precision: 5, scale: 2 }).default('0.5'),
  isEnabled: boolean('is_enabled').default(true),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  categoryIdx: index('symbols_category_idx').on(table.category),
  isActiveIdx: index('symbols_is_active_idx').on(table.isActive),
}));

export type Symbol = typeof symbols.$inferSelect;
export type NewSymbol = typeof symbols.$inferInsert;
