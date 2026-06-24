// MT5 Trading Accounts table
import { pgTable, uuid, varchar, integer, decimal, timestamp, boolean, foreignKey } from 'drizzle-orm/pg-core';
import { users } from './users';

export const accounts = pgTable('accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  mt5Login: integer('mt5_login').notNull(),
  mt5Server: varchar('mt5_server', { length: 100 }).notNull(),
  accountName: varchar('account_name', { length: 100 }),
  balance: decimal('balance', { precision: 18, scale: 2 }).default('0'),
  equity: decimal('equity', { precision: 18, scale: 2 }).default('0'),
  margin: decimal('margin', { precision: 18, scale: 2 }).default('0'),
  freeMargin: decimal('free_margin', { precision: 18, scale: 2 }).default('0'),
  marginLevel: decimal('margin_level', { precision: 10, scale: 2 }).default('0'),
  isConnected: boolean('is_connected').default(false),
  isPrimary: boolean('is_primary').default(false),
  lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
