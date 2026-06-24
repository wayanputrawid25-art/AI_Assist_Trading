// Sessions Repository
import { eq, and, isNull, desc, sql, lt } from 'drizzle-orm';
import { db } from '../index';
import { sessions, type Session, type NewSession } from '../schema/sessions';

export class SessionsRepository {
  async findById(id: string): Promise<Session | undefined> {
    return db.query.sessions.findFirst({
      where: and(
        eq(sessions.id, id),
        eq(sessions.isActive, true)
      ),
    });
  }

  async findByToken(token: string): Promise<Session | undefined> {
    return db.query.sessions.findFirst({
      where: and(
        eq(sessions.token, token),
        eq(sessions.isActive, true)
      ),
    });
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return db.query.sessions.findMany({
      where: and(
        eq(sessions.userId, userId),
        eq(sessions.isActive, true)
      ),
      orderBy: desc(sessions.createdAt),
    });
  }

  async create(data: NewSession): Promise<Session> {
    const [session] = await db.insert(sessions).values(data).returning();
    return session;
  }

  async update(id: string, data: Partial<NewSession>): Promise<Session | undefined> {
    const [session] = await db
      .update(sessions)
      .set(data)
      .where(eq(sessions.id, id))
      .returning();
    return session;
  }

  async invalidate(id: string): Promise<boolean> {
    const result = await db
      .update(sessions)
      .set({ isActive: false })
      .where(eq(sessions.id, id));
    return result.rowCount > 0;
  }

  async invalidateAllForUser(userId: string): Promise<number> {
    const result = await db
      .update(sessions)
      .set({ isActive: false })
      .where(
        and(
          eq(sessions.userId, userId),
          eq(sessions.isActive, true)
        )
      );
    return result.rowCount ?? 0;
  }

  async deleteExpired(): Promise<number> {
    const result = await db
      .update(sessions)
      .set({ isActive: false })
      .where(
        and(
          eq(sessions.isActive, true),
          lt(sessions.expiresAt, new Date())
        )
      );
    return result.rowCount ?? 0;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db.delete(sessions).where(eq(sessions.id, id));
    return result.rowCount > 0;
  }
}

export const sessionsRepository = new SessionsRepository();
