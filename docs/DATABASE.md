# ForexOS Database Guide

**Last Updated:** 2026-06-25

Complete guide for ForexOS database setup, configuration, and management using Neon PostgreSQL and Drizzle ORM.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Schema Overview](#schema-overview)
3. [Neon Configuration](#neon-configuration)
4. [Drizzle ORM Setup](#drizzle-orm-setup)
5. [Migrations](#migrations)
6. [Indexes](#indexes)
7. [Connection Management](#connection-management)
8. [Commands](#commands)
9. [Troubleshooting](#troubleshooting)

---

## Architecture

### Technology Stack

| Component | Technology | Version | Purpose |
|-----------|------------|---------|---------|
| Database | PostgreSQL | 15+ | Primary data store |
| Hosting | Neon | - | Serverless PostgreSQL |
| ORM | Drizzle | 0.30 | Type-safe database queries |
| Driver | @neondatabase/serverless | 0.9 | WebSocket connections |
| Migrations | Drizzle Kit | 0.21 | Schema migrations |

### Connection Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      FOREXOS APPLICATION                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│   ┌─────────────┐         ┌─────────────┐                   │
│   │   Drizzle   │ ──────► │   Neon      │                   │
│   │   ORM       │         │   Driver    │                   │
│   │  (0.30.0)   │         │  (0.9.0)    │                   │
│   └──────┬──────┘         └──────┬──────┘                   │
│          │                        │                          │
│          │                   WebSocket                       │
│          │                        │                          │
└──────────┼────────────────────────┼──────────────────────────┘
           │                        │
           │ TCP/SSL                │
           ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                         NEON CLOUD                           │
│  ┌─────────────┐         ┌─────────────┐                   │
│  │  Proxy      │ ──────► │  PostgreSQL  │                   │
│  │  (WebSocket)│         │   15+       │                   │
│  └─────────────┘         └─────────────┘                   │
└─────────────────────────────────────────────────────────────┘
```

### Why Neon?

1. **Serverless**: No connection management needed
2. **Branching**: Create preview databases for testing
3. **Autoscaling**: Automatic scaling based on load
4. **WebSocket Support**: Direct connection without connection poolers
5. **Free Tier**: Generous free tier for development

---

## Schema Overview

### Database Diagram

```
┌─────────────┐
│   users     │ (1)
└──────┬──────┘
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────┐
│  sessions   │       │  accounts   │ (1)
└─────────────┘       └──────┬──────┘
                             │ 1:N
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
       ▼                     ▼                     ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   orders   │       │  positions  │       │   trades   │
└─────────────┘       └─────────────┘       └─────────────┘

┌─────────────┐       ┌─────────────┐
│ strategies  │ (1)   │   symbols   │
└──────┬──────┘       └─────────────┘
       │ 1:N                   
       ▼                      
┌─────────────┐
│  patterns   │
└─────────────┘

┌─────────────┐
│  candles    │ (Historical OHLCV data)
└─────────────┘
```

### Tables

| Table | Description | Key Columns |
|-------|-------------|-------------|
| `users` | User accounts | email, passwordHash, settings |
| `sessions` | User authentication sessions | token, expiresAt |
| `accounts` | MT5 trading accounts | mt5Login, mt5Server, balance |
| `orders` | Pending/filled orders | symbol, type, status |
| `positions` | Open positions | mt5Ticket, symbol, profit |
| `trades` | Closed trades | mt5Ticket, pips, isWin |
| `symbols` | Trading symbols | name, digits, spread |
| `strategies` | Trading strategies | parameters, riskSettings |
| `patterns` | Detected patterns | type, confidence, symbol |
| `candles` | OHLCV historical data | symbol, timeframe, timestamp |

---

## Neon Configuration

### Connection String Format

```bash
# Standard connection
postgresql://user:password@host.neon.tech/dbname?sslmode=require

# With connection pool
postgresql://user:password@host.neon.tech/dbname?sslmode=require&pool_mode=transaction

# With project branch
postgresql://user:password@host.region.aws.neon.tech/dbname?sslmode=require
```

### Environment Variable

```bash
# .env (root shared)
DATABASE_URL=postgresql://user:password@host.neon.tech/dbname?sslmode=require
```

### SSL Configuration

The `@neondatabase/serverless` driver automatically handles SSL:

```typescript
// packages/database/src/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });
```

**SSL is always required** - Neon enforces SSL connections.

### Connection Pooling

Neon provides **built-in serverless pooling**:

| Mode | Description | Use Case |
|------|-------------|----------|
| `transaction` (default) | Pool per transaction | API routes, serverless |
| `session` | Pool per session | Long-running processes |

```typescript
// Transaction mode (default, recommended for serverless)
postgresql://user:pass@host/dbname?sslmode=require

// Session mode (for long connections)
postgresql://user:pass@host/dbname?sslmode=require&pool_mode=session
```

---

## Drizzle ORM Setup

### Project Structure

```
packages/database/
├── drizzle/
│   └── migrations/          # Generated migration files
│       ├── 0000_fresh_jamie_braddock.sql
│       └── meta/
│           ├── _journal.json
│           └── 0000_snapshot.json
├── src/
│   ├── index.ts             # Database instance export
│   ├── schema/
│   │   ├── index.ts         # Schema exports
│   │   ├── users.ts
│   │   ├── sessions.ts
│   │   ├── accounts.ts
│   │   ├── orders.ts
│   │   ├── positions.ts
│   │   ├── trades.ts
│   │   ├── symbols.ts
│   │   ├── strategies.ts
│   │   ├── patterns.ts
│   │   └── candles.ts
│   └── repositories/       # Data access layer
├── drizzle.config.ts
├── drizzle.config.js
└── package.json
```

### Drizzle Config

```typescript
// drizzle.config.ts
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

### Schema Example

```typescript
// src/schema/users.ts
import { pgTable, uuid, varchar, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
```

### Database Instance

```typescript
// src/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export * from './schema';
export * from './repositories';
```

---

## Migrations

### Migration Files

| File | Description |
|------|-------------|
| `0000_fresh_jamie_braddock.sql` | Initial schema creation |
| `meta/_journal.json` | Migration journal tracking |
| `meta/0000_snapshot.json` | Schema snapshot |

### Running Migrations

```bash
# Generate migration from schema changes
npm run db:generate

# Push schema to database (development)
npm run db:push

# Run migrations
npm run db:migrate

# Open Drizzle Studio (GUI)
npm run db:studio
```

### Migration Flow

```
1. Edit schema files (src/schema/*.ts)
       │
       ▼
2. Run: npm run db:generate
       │
       ▼
3. Review generated SQL in drizzle/migrations/
       │
       ▼
4. Run: npm run db:migrate (production)
       │
       ▼
5. Or: npm run db:push (development)
```

### Migration Journal

```json
// meta/_journal.json
{
  "version": "7",
  "dialect": "postgresql",
  "entries": [
    {
      "idx": 0,
      "version": "7",
      "when": 1719283200000,
      "tag": "0000_fresh_jamie_braddock",
      "breakpoints": true
    }
  ]
}
```

---

## Indexes

### Index Summary

| Table | Index Name | Columns | Type |
|-------|-----------|---------|------|
| `users` | (primary) | id | PRIMARY KEY |
| `sessions` | (primary) | id | PRIMARY KEY |
| | sessions_token_unique | token | UNIQUE |
| `accounts` | accounts_user_id_idx | userId | INDEX |
| | accounts_mt5_login_idx | mt5Login | INDEX |
| `orders` | orders_account_id_idx | accountId | INDEX |
| | orders_symbol_idx | symbol | INDEX |
| | orders_status_idx | status | INDEX |
| `positions` | positions_account_id_idx | accountId | INDEX |
| | positions_symbol_idx | symbol | INDEX |
| | positions_mt5_ticket_idx | mt5Ticket | INDEX |
| `trades` | (primary) | id | PRIMARY KEY |
| | trades_mt5_ticket_unique | mt5Ticket | UNIQUE |
| `symbols` | (primary) | id | PRIMARY KEY |
| | symbols_name_unique | name | UNIQUE |
| | symbols_category_idx | category | INDEX |
| | symbols_is_active_idx | isActive | INDEX |
| `strategies` | (primary) | id | PRIMARY KEY |
| `patterns` | (primary) | id | PRIMARY KEY |
| `candles` | (primary) | id | PRIMARY KEY |
| | candles_symbol_timeframe_timestamp_idx | symbol, timeframe, timestamp | UNIQUE |
| | candles_symbol_timeframe_idx | symbol, timeframe | INDEX |

### Index Usage

**Orders table indexes:**
```typescript
}, (table) => ({
  accountIdIdx: index('orders_account_id_idx').on(table.accountId),
  symbolIdx: index('orders_symbol_idx').on(table.symbol),
  statusIdx: index('orders_status_idx').on(table.status),
}));
```

**Candles unique index (prevents duplicates):**
```typescript
}, (table) => ({
  candlesSymbolTimeframeTimestampIdx: uniqueIndex('candles_symbol_timeframe_timestamp_idx')
    .on(table.symbol, table.timeframe, table.timestamp),
  candlesSymbolTimeframeIdx: index('candles_symbol_timeframe_idx')
    .on(table.symbol, table.timeframe),
}));
```

### Query Optimization

Use these indexes for:

| Query | Index |
|--------|-------|
| `SELECT * FROM orders WHERE accountId = ?` | orders_account_id_idx |
| `SELECT * FROM orders WHERE symbol = ? AND status = 'pending'` | orders_symbol_idx, orders_status_idx |
| `SELECT * FROM candles WHERE symbol = 'EURUSD' AND timeframe = 'H1'` | candles_symbol_timeframe_idx |
| `SELECT * FROM candles WHERE symbol = 'EURUSD' AND timeframe = 'M5' AND timestamp > ?` | candles_symbol_timeframe_timestamp_idx |

---

## Connection Management

### Serverless Pattern

```typescript
// Good: Per-request connection
export async function handler(req: Request) {
  const sql = neon(process.env.DATABASE_URL!);
  const db = drizzle(sql, { schema });
  
  const users = await db.select().from(usersTable);
  return users;
}

// Avoid: Global connection (may timeout)
let globalDb: Database;
export async function handler(req: Request) {
  if (!globalDb) {
    globalDb = drizzle(neon(process.env.DATABASE_URL!), { schema });
  }
  // ...
}
```

### Best Practices

1. **Create connection per request** - Neon driver handles pooling
2. **Use transactions** - Wrap multiple operations in transactions
3. **Set timeouts** - Configure query timeouts
4. **Handle errors** - Implement proper error handling

```typescript
// Transaction example
const result = await db.transaction(async (tx) => {
  const [order] = await tx.insert(orders).values(orderData).returning();
  await tx.update(accounts).set({ balance: newBalance }).where(eq(accounts.id, accountId));
  return order;
});
```

### Connection Limits

| Plan | Max Connections |
|------|-----------------|
| Free | 100 |
| Starter | 200 |
| Production | Unlimited |

---

## Commands

### Database Scripts

```json
// package.json scripts
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:push": "drizzle-kit push",
    "db:migrate": "drizzle-kit migrate",
    "db:studio": "drizzle-kit studio",
    "db:check": "drizzle-kit check"
  }
}
```

### Common Commands

```bash
# Install dependencies
npm install

# Generate migrations from schema changes
npm run db:generate

# Push schema (development - auto applies)
npm run db:push

# Run migrations (production - staged)
npm run db:migrate

# Open GUI studio
npm run db:studio

# Check schema consistency
npm run db:check
```

### Docker Commands

```bash
# Run migrations in Docker
docker exec forexos-api npm run db:migrate

# Push schema in Docker
docker exec forexos-api npm run db:push
```

---

## Schema Reference

### Users Table

```typescript
pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  name: varchar('name', { length: 100 }).notNull(),
  avatarUrl: varchar('avatar_url', { length: 500 }),
  settings: jsonb('settings').$type<Record<string, unknown>>().default({}),
  timezone: varchar('timezone', { length: 50 }).default('UTC'),
  isActive: boolean('is_active').default(true),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})
```

### Orders Table

```typescript
pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  accountId: uuid('account_id').notNull().references(() => accounts.id, { onDelete: 'cascade' }),
  mt5Ticket: integer('mt5_ticket'),
  symbol: varchar('symbol', { length: 10 }).notNull(),
  type: varchar('type', { length: 10 }).notNull().$type<'buy' | 'sell'>(),
  kind: varchar('kind', { length: 10 }).notNull().$type<'market' | 'limit' | 'stop'>(),
  volume: decimal('volume', { precision: 10, scale: 2 }).notNull(),
  price: decimal('price', { precision: 18, scale: 5 }).notNull(),
  stopLoss: decimal('stop_loss', { precision: 18, scale: 5 }),
  takeProfit: decimal('take_profit', { precision: 18, scale: 5 }),
  status: varchar('status', { length: 20 }).notNull().$type<'pending' | 'filled' | 'cancelled' | 'rejected'>().default('pending'),
  // ...
})
```

### Candles Table (Time-Series)

```typescript
pgTable('candles', {
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
})
```

---

## Troubleshooting

### Connection Issues

#### "Connection refused"

**Problem:** Cannot connect to Neon.

**Solution:**
1. Check `DATABASE_URL` is correct
2. Verify SSL mode is enabled: `?sslmode=require`
3. Check Neon console for connection issues
4. Verify IP whitelist (if configured)

#### "SSL handshake failed"

**Problem:** SSL configuration issue.

**Solution:**
```bash
# Ensure sslmode=require in connection string
DATABASE_URL=postgresql://user:pass@host/dbname?sslmode=require
```

### Migration Issues

#### "Migration out of date"

**Problem:** Schema drift detected.

**Solution:**
```bash
# Check migration status
npm run db:check

# Push changes (development)
npm run db:push

# Or generate and run migration (production)
npm run db:generate
npm run db:migrate
```

#### "Duplicate key violation"

**Problem:** Index/constraint conflict.

**Solution:**
1. Check migration SQL for duplicate constraints
2. Use `IF NOT EXISTS` in custom SQL
3. Reset journal if needed (development only)

### Performance Issues

#### "Slow queries on candles table"

**Problem:** Missing index or full table scan.

**Solution:**
```sql
-- Create additional index if needed
CREATE INDEX candles_timestamp_idx ON candles (timestamp);

-- Or use the existing composite index
-- candles_symbol_timeframe_timestamp_idx
```

#### "Connection pool exhausted"

**Problem:** Too many concurrent connections.

**Solution:**
1. Use connection pooling mode
2. Add connection timeouts
3. Scale Neon plan

---

## Security

### Connection Security

- ✅ SSL always required (enforced by Neon)
- ✅ WebSocket connections (via Neon proxy)
- ✅ Connection pooling (serverless mode)
- ❌ No hardcoded credentials
- ❌ No SQL in application code (use Drizzle)

### Data Security

| Feature | Status | Description |
|---------|--------|-------------|
| Password Hashing | ✅ | bcrypt for user passwords |
| JWT Secrets | ✅ | Separate from database |
| API Keys | ✅ | Stored in environment |
| Sensitive Data | ✅ | Never logged |

### Backup & Recovery

| Feature | Availability | Notes |
|---------|--------------|-------|
| Point-in-time recovery | ✅ | Available on paid plans |
| Automated backups | ✅ | Continuous archiving |
| Manual snapshots | ✅ | Via Neon console |
| Branching | ✅ | Create preview databases |

---

## Performance Tips

### 1. Use Selective Queries

```typescript
// Bad: Select all columns
const users = await db.select().from(users);

// Good: Select specific columns
const users = await db.select({
  id: users.id,
  email: users.email,
  name: users.name
}).from(users);
```

### 2. Use Appropriate Indexes

```typescript
// Create composite index for common query pattern
const candles = await db.select().from(candles)
  .where(and(
    eq(candles.symbol, 'EURUSD'),
    eq(candles.timeframe, 'H1'),
    gt(candles.timestamp, startDate)
  ));
```

### 3. Batch Operations

```typescript
// Insert multiple records
await db.insert(orders).values(ordersArray);

// Update multiple records
await db.update(accounts)
  .set({ updatedAt: new Date() })
  .where(inArray(accounts.id, accountIds));
```

### 4. Use Pagination

```typescript
// Paginated query
const page = await db.select().from(trades)
  .orderBy(desc(trades.closedAt))
  .limit(100)
  .offset(0);
```

---

## Quick Reference

### Connection String Template

```bash
postgresql://[user]:[password]@[host]/[database]?sslmode=require
```

### Drizzle Column Types

| TypeScript | PostgreSQL |
|------------|------------|
| `uuid()` | UUID |
| `varchar(n)` | VARCHAR(n) |
| `text()` | TEXT |
| `integer()` | INTEGER |
| `decimal(p,s)` | NUMERIC(p,s) |
| `boolean()` | BOOLEAN |
| `timestamp()` | TIMESTAMP |
| `jsonb()` | JSONB |

### Common Drizzle Operations

```typescript
// Select
const result = await db.select().from(users).where(eq(users.email, email));

// Insert
await db.insert(users).values({ email, name, passwordHash });

// Update
await db.update(users).set({ name }).where(eq(users.id, id));

// Delete
await db.delete(users).where(eq(users.id, id));

// Transaction
await db.transaction(async (tx) => {
  await tx.insert(orders).values(orderData);
  await tx.update(accounts).set({ balance });
});
```

---

*Last updated: 2026-06-25*
