// Trades Repository (closed positions history)
import { eq, and, desc, asc, sql, gte, lte, count, sum } from 'drizzle-orm';
import { db } from '../index';
import { trades, type Trade, type NewTrade } from '../schema/trades';

export class TradesRepository {
  async findById(id: string): Promise<Trade | undefined> {
    return db.query.trades.findFirst({
      where: eq(trades.id, id),
    });
  }

  async findByMt5Ticket(ticket: number): Promise<Trade | undefined> {
    return db.query.trades.findFirst({
      where: eq(trades.mt5Ticket, ticket),
    });
  }

  async findByAccountId(
    accountId: string,
    options: {
      symbol?: string;
      type?: 'buy' | 'sell';
      from?: Date;
      to?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Trade[]> {
    const conditions = [eq(trades.accountId, accountId)];

    if (options.symbol) {
      conditions.push(eq(trades.symbol, options.symbol));
    }
    if (options.type) {
      conditions.push(eq(trades.type, options.type));
    }
    if (options.from) {
      conditions.push(gte(trades.closedAt, options.from));
    }
    if (options.to) {
      conditions.push(lte(trades.closedAt, options.to));
    }

    return db.query.trades.findMany({
      where: and(...conditions),
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
      orderBy: desc(trades.closedAt),
    });
  }

  async create(data: NewTrade): Promise<Trade> {
    const [trade] = await db.insert(trades).values(data).returning();
    if (!trade) {
      throw new Error('Failed to create trade');
    }
    return trade;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(trades).where(eq(trades.id, id));
    return result.rowCount > 0;
  }

  async countByAccountId(accountId: string): Promise<number> {
    const result = await db
      .select({ count: trades.id })
      .from(trades)
      .where(eq(trades.accountId, accountId));
    return result.length;
  }

  async getStats(accountId: string, from?: Date, to?: Date) {
    const conditions = [eq(trades.accountId, accountId)];
    if (from) conditions.push(gte(trades.closedAt, from));
    if (to) conditions.push(lte(trades.closedAt, to));

    const stats = await db
      .select({
        totalTrades: count(trades.id),
        winningTrades: count(trades.id),
        totalProfit: sum(trades.profit),
        totalCommission: sum(trades.commission),
        totalSwap: sum(trades.swap),
      })
      .from(trades)
      .where(and(...conditions));

    const wins = await db
      .select({ count: count(trades.id) })
      .from(trades)
      .where(
        and(
          eq(trades.accountId, accountId),
          sql`${trades.profit} > 0`
        )
      );

    return {
      totalTrades: stats[0]?.totalTrades ?? 0,
      winningTrades: wins[0]?.count ?? 0,
      losingTrades: (stats[0]?.totalTrades ?? 0) - (wins[0]?.count ?? 0),
      winRate: stats[0]?.totalTrades 
        ? ((wins[0]?.count ?? 0) / stats[0]?.totalTrades * 100) 
        : 0,
      totalProfit: stats[0]?.totalProfit ?? '0',
      totalCommission: stats[0]?.totalCommission ?? '0',
      totalSwap: stats[0]?.totalSwap ?? '0',
    };
  }
}

export const tradesRepository = new TradesRepository();
