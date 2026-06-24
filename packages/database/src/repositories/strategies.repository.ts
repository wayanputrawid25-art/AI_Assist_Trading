// Strategies Repository
import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '../index';
import { strategies, type Strategy, type NewStrategy } from '../schema/strategies';

export class StrategiesRepository {
  async findById(id: string): Promise<Strategy | undefined> {
    return db.query.strategies.findFirst({
      where: eq(strategies.id, id),
    });
  }

  async findByUserId(userId: string): Promise<Strategy[]> {
    return db.query.strategies.findMany({
      where: eq(strategies.userId, userId),
      orderBy: desc(strategies.createdAt),
    });
  }

  async findActive(userId: string): Promise<Strategy[]> {
    return db.query.strategies.findMany({
      where: and(
        eq(strategies.userId, userId),
        eq(strategies.isActive, true)
      ),
      orderBy: desc(strategies.createdAt),
    });
  }

  async create(data: NewStrategy): Promise<Strategy> {
    const [strategy] = await db.insert(strategies).values(data).returning();
    return strategy;
  }

  async update(id: string, data: Partial<NewStrategy>): Promise<Strategy | undefined> {
    const [strategy] = await db
      .update(strategies)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(strategies.id, id))
      .returning();
    return strategy;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(strategies).where(eq(strategies.id, id));
    return result.rowCount > 0;
  }

  async toggleActive(id: string): Promise<Strategy | undefined> {
    const strategy = await this.findById(id);
    if (!strategy) return undefined;

    const [updated] = await db
      .update(strategies)
      .set({ 
        isActive: !strategy.isActive, 
        updatedAt: new Date() 
      })
      .where(eq(strategies.id, id))
      .returning();
    return updated;
  }

  async updateStats(
    id: string, 
    stats: { winRate?: string; profitFactor?: string; sharpeRatio?: string }
  ): Promise<Strategy | undefined> {
    const [strategy] = await db
      .update(strategies)
      .set({ 
        ...stats,
        isBacktested: true,
        updatedAt: new Date() 
      })
      .where(eq(strategies.id, id))
      .returning();
    return strategy;
  }
}

export const strategiesRepository = new StrategiesRepository();
