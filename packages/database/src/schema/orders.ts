// Trading Orders table
import { pgTable, uuid, varchar, integer, decimal, timestamp, boolean, text, foreignKey } from 'drizzle-orm/pg-core';
import { accounts } from './accounts';

export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  mt5Ticket: integer('mt5_ticket'),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  type: varchar('type', { length: 10 }).notNull().$type<'buy' | 'sell'>(),
  kind: varchar('kind', { length: 10 }).notNull().$type<'market' | 'limit' | 'stop'>(),
  volume: decimal('volume', { precision: 10, scale: 2 }).notNull(),
  price: decimal('price', { precision: 18, scale: 5 }).notNull(),
  stopLoss: decimal('stop_loss', { precision: 18, scale: 5 }),
  takeProfit: decimal('take_profit', { precision: 18, scale: 5 }),
  deviation: integer('deviation'),
  status: varchar('status', { length: 20 }).notNull().$type<'pending' | 'filled' | 'cancelled' | 'rejected'>().default('pending'),
  comment: text('comment'),
  reason: varchar('reason', { length: 50 }),
  filledPrice: decimal('filled_price', { precision: 18, scale: 5 }),
  filledAt: timestamp('filled_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
