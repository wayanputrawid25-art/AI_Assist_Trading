// Orders Repository
import { eq, and, desc, asc, sql, gte, lte } from 'drizzle-orm';
import { db } from '../index';
import { orders, type Order, type NewOrder } from '../schema/orders';

export class OrdersRepository {
  async findById(id: string): Promise<Order | undefined> {
    return db.query.orders.findFirst({
      where: eq(orders.id, id),
    });
  }

  async findByMt5Ticket(ticket: number): Promise<Order | undefined> {
    return db.query.orders.findFirst({
      where: eq(orders.mt5Ticket, ticket),
    });
  }

  async findByAccountId(
    accountId: string,
    options: {
      status?: string;
      symbol?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Order[]> {
    const conditions = [eq(orders.accountId, accountId)];

    if (options.status) {
      conditions.push(eq(orders.status, options.status as 'pending' | 'filled' | 'cancelled' | 'rejected'));
    }
    if (options.symbol) {
      conditions.push(eq(orders.symbol, options.symbol));
    }

    return db.query.orders.findMany({
      where: and(...conditions),
      limit: options.limit ?? 100,
      offset: options.offset ?? 0,
      orderBy: desc(orders.createdAt),
    });
  }

  async findPending(accountId: string): Promise<Order[]> {
    return db.query.orders.findMany({
      where: and(
        eq(orders.accountId, accountId),
        eq(orders.status, 'pending')
      ),
      orderBy: asc(orders.createdAt),
    });
  }

  async create(data: NewOrder): Promise<Order> {
    const [order] = await db.insert(orders).values(data).returning();
    return order;
  }

  async update(id: string, data: Partial<NewOrder>): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async fill(id: string, filledPrice: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status: 'filled',
        filledPrice,
        filledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async cancel(id: string): Promise<Order | undefined> {
    const [order] = await db
      .update(orders)
      .set({
        status: 'cancelled',
        cancelledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(orders).where(eq(orders.id, id));
    return result.rowCount > 0;
  }

  async countByAccountId(accountId: string): Promise<number> {
    const result = await db
      .select({ count: orders.id })
      .from(orders)
      .where(eq(orders.accountId, accountId));
    return result.length;
  }

  async countPendingByAccountId(accountId: string): Promise<number> {
    const result = await db
      .select({ count: orders.id })
      .from(orders)
      .where(
        and(
          eq(orders.accountId, accountId),
          eq(orders.status, 'pending')
        )
      );
    return result.length;
  }
}

export const ordersRepository = new OrdersRepository();
