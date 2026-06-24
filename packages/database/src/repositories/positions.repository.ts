// Positions Repository
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../index';
import { positions, type Position, type NewPosition } from '../schema/positions';

export class PositionsRepository {
  async findById(id: string): Promise<Position | undefined> {
    return db.query.positions.findFirst({
      where: eq(positions.id, id),
    });
  }

  async findByMt5Ticket(ticket: number): Promise<Position | undefined> {
    return db.query.positions.findFirst({
      where: eq(positions.mt5Ticket, ticket),
    });
  }

  async findByAccountId(
    accountId: string,
    options: {
      symbol?: string;
      type?: 'buy' | 'sell';
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Position[]> {
    const conditions = [eq(positions.accountId, accountId)];

    if (options.symbol) {
      conditions.push(eq(positions.symbol, options.symbol));
    }
    if (options.type) {
      conditions.push(eq(positions.type, options.type));
    }

    return db.query.positions.findMany({
      where: and(...conditions),
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
      orderBy: desc(positions.openedAt),
    });
  }

  async findAllOpen(accountId: string): Promise<Position[]> {
    return db.query.positions.findMany({
      where: and(
        eq(positions.accountId, accountId),
        sql`${positions.closedAt} IS NULL`
      ),
      orderBy: desc(positions.openedAt),
    });
  }

  async create(data: NewPosition): Promise<Position> {
    const [position] = await db.insert(positions).values(data).returning();
    return position;
  }

  async update(id: string, data: Partial<NewPosition>): Promise<Position | undefined> {
    const [position] = await db
      .update(positions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(positions.id, id))
      .returning();
    return position;
  }

  async updatePrice(id: string, priceCurrent: string, profit: string): Promise<void> {
    await db
      .update(positions)
      .set({
        priceCurrent,
        profit,
        updatedAt: new Date(),
      })
      .where(eq(positions.id, id));
  }

  async close(id: string, priceClose: string): Promise<Position | undefined> {
    const [position] = await db
      .update(positions)
      .set({
        priceCurrent: priceClose,
        closedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(positions.id, id))
      .returning();
    return position;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(positions).where(eq(positions.id, id));
    return result.rowCount > 0;
  }

  async countOpenByAccountId(accountId: string): Promise<number> {
    const result = await db
      .select({ count: positions.id })
      .from(positions)
      .where(
        and(
          eq(positions.accountId, accountId),
          sql`${positions.closedAt} IS NULL`
        )
      );
    return result.length;
  }

  async getTotalProfit(accountId: string): Promise<string> {
    const result = await db
      .select({ total: sql<string>`COALESCE(SUM(${positions.profit}), 0)::TEXT` })
      .from(positions)
      .where(
        and(
          eq(positions.accountId, accountId),
          sql`${positions.closedAt} IS NULL`
        )
      );
    return result[0]?.total ?? '0';
  }
}

export const positionsRepository = new PositionsRepository();
