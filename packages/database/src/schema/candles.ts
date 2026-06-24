// Market Candles (OHLCV) table for historical data
import { pgTable, uuid, varchar, decimal, timestamp, integer, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const candles = pgTable('candles', {
  id: uuid('id').primaryKey().defaultRandom(),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  timeframe: varchar('timeframe', { length: 10 }).notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true, precision: 3 }).notNull(),
  open: decimal('open', { precision: 18, scale: 5 }).notNull(),
  high: decimal('high', { precision: 18, scale: 5 }).notNull(),
  low: decimal('low', { precision: 18, scale: 5 }).notNull(),
  close: decimal('close', { precision: 18, scale: 5 }).notNull(),
  volume: decimal('volume', { precision: 18, scale: 3 }).notNull(),
  tickVolume: integer('tick_volume'),
  spread: integer('spread'),
}, (table) => [
  // Indexes for efficient queries
  uniqueIndex('candles_symbol_timeframe_timestamp_idx')
    .on(table.symbol, table.timeframe, table.timestamp),
  index('candles_symbol_timeframe_idx')
    .on(table.symbol, table.timeframe),
]);

export type Candle = typeof candles.$inferSelect;
export type NewCandle = typeof candles.$inferInsert;
