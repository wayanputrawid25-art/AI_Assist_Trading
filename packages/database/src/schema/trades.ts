// Completed Trades (closed positions) table
import { pgTable, uuid, varchar, integer, decimal, timestamp, text, boolean, foreignKey } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const trades = pgTable('trades', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  mt5Ticket: integer('mt5_ticket').notNull().unique(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  type: varchar('type', { length: 10 }).notNull().$type<'buy' | 'sell'>(),
  volume: decimal('volume', { precision: 10, scale: 2 }).notNull(),
  priceOpen: decimal('price_open', { precision: 18, scale: 5 }).notNull(),
  priceClose: decimal('price_close', { precision: 18, scale: 5 }).notNull(),
  stopLoss: decimal('stop_loss', { precision: 18, scale: 5 }),
  takeProfit: decimal('take_profit', { precision: 18, scale: 5 }),
  profit: decimal('profit', { precision: 18, scale: 2 }).notNull(),
  commission: decimal('commission', { precision: 18, scale: 2 }).default('0'),
  swap: decimal('swap', { precision: 18, scale: 2 }).default('0'),
  comment: text('comment'),
  magic: integer('magic'),
  isWin: boolean('is_win'),
  pips: decimal('pips', { precision: 10, scale: 1 }),
  durationMinutes: integer('duration_minutes'),
  openedAt: timestamp('opened_at', { withTimezone: true }).notNull(),
  closedAt: timestamp('closed_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Trade = typeof trades.$inferSelect;
export type NewTrade = typeof trades.$inferInsert;
