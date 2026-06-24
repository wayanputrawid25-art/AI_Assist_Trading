// Users Repository
import { eq, and, isNull, desc } from 'drizzle-orm';
import { db } from '../index';
import { users, type User, type NewUser } from '../schema/users';

export class UsersRepository {
  async findById(id: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: and(eq(users.id, id), isNull(users.deletedAt)),
    });
  }

  async findByEmail(email: string): Promise<User | undefined> {
    return db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });
  }

  async findAll(limit = 50, offset = 0): Promise<User[]> {
    return db.query.users.findMany({
      where: isNull(users.deletedAt),
      limit: limit ?? undefined,
      offset: offset ?? undefined,
      orderBy: desc(users.createdAt),
    });
  }

  async create(data: NewUser): Promise<User> {
    const [user] = await db.insert(users).values(data).returning();
    if (!user) {
      throw new Error('Failed to create user');
    }
    return user;
  }

  async update(id: string, data: Partial<NewUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();
    return user;
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .update(users)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)));
    return (result.rowCount ?? 0) > 0;
  }

  async hardDelete(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async count(): Promise<number> {
    const result = await db
      .select({ count: users.id })
      .from(users)
      .where(isNull(users.deletedAt));
    return result.length;
  }
}

export const usersRepository = new UsersRepository();
