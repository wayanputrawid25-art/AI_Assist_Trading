// Candles Repository (OHLCV market data)
import { eq, and, desc, asc, sql, gte, lte, inArray } from 'drizzle-orm';
import { db } from '../index';
import { candles, type Candle, type NewCandle } from '../schema/candles';

export class CandlesRepository {
  async findById(id: string): Promise<Candle | undefined> {
    return db.query.candles.findFirst({
      where: eq(candles.id, id),
    });
  }

  async findLatest(symbol: string, timeframe: string): Promise<Candle | undefined> {
    return db.query.candles.findFirst({
      where: and(
        eq(candles.symbol, symbol),
        eq(candles.timeframe, timeframe)
      ),
      orderBy: desc(candles.timestamp),
    });
  }

  async findBySymbolAndTimeframe(
    symbol: string,
    timeframe: string,
    options: {
      from?: Date;
      to?: Date;
      limit?: number;
    } = {}
  ): Promise<Candle[]> {
    const conditions = [
      eq(candles.symbol, symbol),
      eq(candles.timeframe, timeframe),
    ];

    if (options.from) {
      conditions.push(gte(candles.timestamp, options.from));
    }
    if (options.to) {
      conditions.push(lte(candles.timestamp, options.to));
    }

    return db.query.candles.findMany({
      where: and(...conditions),
      limit: options.limit ?? undefined,
      orderBy: asc(candles.timestamp),
    });
  }

  async create(data: NewCandle): Promise<Candle> {
    const [candle] = await db.insert(candles).values(data).returning();
    return candle;
  }

  async createMany(data: NewCandle[]): Promise<number> {
    const result = await db.insert(candles).values(data).returning();
    return result.length;
  }

  async upsert(data: NewCandle): Promise<Candle> {
    const [candle] = await db
      .insert(candles)
      .values(data)
      .onConflictDoUpdate({
        target: [candles.symbol, candles.timeframe, candles.timestamp],
        set: {
          open: data.open,
          high: data.high,
          low: data.low,
          close: data.close,
          volume: data.volume,
          tickVolume: data.tickVolume ?? null,
          spread: data.spread ?? null,
        },
      })
      .returning();
    return candle;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(candles).where(eq(candles.id, id));
    return result.rowCount > 0;
  }

  async deleteOldCandles(beforeDate: Date): Promise<number> {
    const result = await db
      .delete(candles)
      .where(lte(candles.timestamp, beforeDate));
    return result.rowCount ?? 0;
  }

  async deleteBySymbol(symbol: string): Promise<number> {
    const result = await db
      .delete(candles)
      .where(eq(candles.symbol, symbol));
    return result.rowCount ?? 0;
  }

  async count(symbol?: string, timeframe?: string): Promise<number> {
    const conditions = [];
    if (symbol) conditions.push(eq(candles.symbol, symbol));
    if (timeframe) conditions.push(eq(candles.timeframe, timeframe));

    const result = conditions.length
      ? await db
          .select({ count: candles.id })
          .from(candles)
          .where(and(...conditions))
      : await db.select({ count: candles.id }).from(candles);

    return result.length;
  }
}

export const candlesRepository = new CandlesRepository();
