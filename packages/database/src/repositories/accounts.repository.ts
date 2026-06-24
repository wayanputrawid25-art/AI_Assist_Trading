// Accounts Repository
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { db } from '../index';
import { accounts, type Account, type NewAccount } from '../schema/accounts';

export class AccountsRepository {
  async findById(id: string): Promise<Account | undefined> {
    return db.query.accounts.findFirst({
      where: and(eq(accounts.id, id), isNull(accounts.deletedAt)),
    });
  }

  async findByUserId(userId: string): Promise<Account[]> {
    return db.query.accounts.findMany({
      where: and(eq(accounts.userId, userId), isNull(accounts.deletedAt)),
      orderBy: desc(accounts.createdAt),
    });
  }

  async findByMt5Login(mt5Login: number): Promise<Account | undefined> {
    return db.query.accounts.findFirst({
      where: eq(accounts.mt5Login, mt5Login),
    });
  }

  async findPrimaryByUserId(userId: string): Promise<Account | undefined> {
    return db.query.accounts.findFirst({
      where: and(
        eq(accounts.userId, userId),
        eq(accounts.isPrimary, true),
        isNull(accounts.deletedAt)
      ),
    });
  }

  async create(data: NewAccount): Promise<Account> {
    // If this is set as primary, unset other primary accounts for this user
    if (data.isPrimary) {
      await db
        .update(accounts)
        .set({ isPrimary: false })
        .where(eq(accounts.userId, data.userId));
    }

    const [account] = await db.insert(accounts).values(data).returning();
    if (!account) {
      throw new Error('Failed to create account');
    }
    return account;
  }

  async update(id: string, data: Partial<NewAccount>): Promise<Account | undefined> {
    // If setting as primary, unset other primary accounts
    if (data.isPrimary) {
      const account = await this.findById(id);
      if (account) {
        await db
          .update(accounts)
          .set({ isPrimary: false })
          .where(
            and(
              eq(accounts.userId, account.userId),
              sql`${accounts.id} != ${id}`
            )
          );
      }
    }

    const [updated] = await db
      .update(accounts)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(accounts.id, id))
      .returning();
    return updated;
  }

  async updateBalance(id: string, balance: string, equity: string, margin: string, freeMargin: string): Promise<void> {
    await db
      .update(accounts)
      .set({
        balance,
        equity,
        margin,
        freeMargin,
        updatedAt: new Date(),
        lastSyncAt: new Date(),
      })
      .where(eq(accounts.id, id));
  }

  async delete(id: string): Promise<boolean> {
    const result = await db
      .update(accounts)
      .set({ updatedAt: new Date() })
      .where(eq(accounts.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async count(): Promise<number> {
    const result = await db
      .select({ count: accounts.id })
      .from(accounts);
    return result.length;
  }
}

export const accountsRepository = new AccountsRepository();
