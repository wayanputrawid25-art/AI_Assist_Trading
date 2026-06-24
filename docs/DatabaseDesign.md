# Database Design - Personal Forex Trading Operating System

## Overview

This document describes the database schema for ForexOS, using Neon PostgreSQL (serverless PostgreSQL).

## Design Principles

1. **Normalization**: 3NF for transactional data
2. **Audit Trail**: All changes logged with timestamps
3. **Soft Deletes**: No permanent data deletion
4. **UUID Primary Keys**: For distributed systems
5. **Timestamp Everything**: Created/Updated/Deleted timestamps

---

## Schema Diagram

```
┌─────────────────┐      ┌─────────────────┐
│     users       │      │  mt5_accounts   │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │──────│ id (PK)         │
│ email           │      │ user_id (FK)    │
│ password_hash   │      │ account_id      │
│ name            │      │ server          │
│ settings        │      │ is_connected    │
│ created_at      │      │ last_sync       │
│ updated_at      │      │ created_at      │
└─────────────────┘      └─────────────────┘
        │
        │
        ▼
┌─────────────────┐      ┌─────────────────┐
│    positions    │      │     orders      │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ account_id (FK) │      │ account_id (FK) │
│ ticket          │      │ ticket          │
│ symbol          │      │ symbol          │
│ type            │      │ type            │
│ volume          │      │ volume          │
│ price_open      │      │ price           │
│ price_current   │      │ stop_loss       │
│ stop_loss       │      │ take_profit     │
│ take_profit     │      │ status          │
│ profit          │      │ filled_volume    │
│ opened_at       │      │ created_at      │
│ closed_at       │      │ filled_at       │
│ created_at      │      │ rejected_reason  │
└─────────────────┘      └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│  market_data    │      │    patterns     │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ symbol           │      │ symbol          │
│ timeframe       │      │ pattern_type    │
│ timestamp       │      │ direction       │
│ open            │      │ start_time      │
│ high            │      │ end_time        │
│ low             │      │ confidence      │
│ close           │      │ is_valid        │
│ tick_volume     │      │ created_at      │
│ spread          │      └─────────────────┘
│ created_at      │
└─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│    signals      │      │  backtests      │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ symbol          │      │ name            │
│ pattern_type    │      │ strategy_type   │
│ direction       │      │ parameters      │
│ entry_price     │      │ symbols         │
│ stop_loss       │      │ timeframe       │
│ take_profit     │      │ start_date      │
│ confidence      │      │ end_date        │
│ status          │      │ results         │
│ expires_at      │      │ equity_curve    │
│ created_at      │      │ metrics         │
└─────────────────┘      │ status          │
                         │ created_at      │
                         └─────────────────┘

┌─────────────────┐      ┌─────────────────┐
│   risk_settings │      │  trade_history  │
├─────────────────┤      ├─────────────────┤
│ id (PK)         │      │ id (PK)         │
│ account_id (FK) │      │ account_id (FK) │
│ max_risk_percent│      │ order_id (FK)   │
│ daily_loss_limit│      │ position_id (FK)│
│ max_drawdown    │      │ symbol          │
│ max_positions   │      │ type            │
│ max_lot_per_trade│     │ volume          │
│ created_at      │      │ entry_price     │
│ updated_at      │      │ exit_price      │
└─────────────────┘      │ profit          │
                         │ duration        │
                         │ created_at      │
                         └─────────────────┘
```

---

## Table Definitions

### users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    avatar_url VARCHAR(500),
    settings JSONB DEFAULT '{}',
    timezone VARCHAR(50) DEFAULT 'UTC',
    is_active BOOLEAN DEFAULT true,
    email_verified_at TIMESTAMPTZ,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_users_email ON users(email) WHERE deleted_at IS NULL;
CREATE INDEX idx_users_created_at ON users(created_at);
```

### mt5_accounts

```sql
CREATE TABLE mt5_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    account_id VARCHAR(50) NOT NULL,
    account_name VARCHAR(100),
    server VARCHAR(100) NOT NULL,
    login VARCHAR(50) NOT NULL,
    password_encrypted VARCHAR(500),
    is_demo BOOLEAN DEFAULT false,
    is_connected BOOLEAN DEFAULT false,
    is_primary BOOLEAN DEFAULT false,
    balance DECIMAL(18, 2) DEFAULT 0,
    equity DECIMAL(18, 2) DEFAULT 0,
    margin DECIMAL(18, 2) DEFAULT 0,
    free_margin DECIMAL(18, 2) DEFAULT 0,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    
    UNIQUE(account_id, server)
);

CREATE INDEX idx_mt5_accounts_user ON mt5_accounts(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_mt5_accounts_is_connected ON mt5_accounts(is_connected) WHERE deleted_at IS NULL;
```

### orders

```sql
CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    order_id BIGINT NOT NULL,
    ticket BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    order_type VARCHAR(20) NOT NULL,
    volume DECIMAL(18, 8) NOT NULL,
    price DECIMAL(18, 5) NOT NULL,
    stop_loss DECIMAL(18, 5),
    take_profit DECIMAL(18, 5),
    deviation INTEGER DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    filled_volume DECIMAL(18, 8) DEFAULT 0,
    remaining_volume DECIMAL(18, 8) DEFAULT 0,
    comment VARCHAR(100),
    magic_number INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    filled_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    rejected_reason TEXT,
    expires_at TIMESTAMPTZ,
    created_from VARCHAR(20) DEFAULT 'web',
    
    UNIQUE(mt5_account_id, ticket)
);

CREATE INDEX idx_orders_mt5_account ON orders(mt5_account_id);
CREATE INDEX idx_orders_symbol ON orders(symbol);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_ticket ON orders(ticket);
```

### positions

```sql
CREATE TABLE positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    position_id BIGINT NOT NULL,
    ticket BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL,
    volume DECIMAL(18, 8) NOT NULL,
    price_open DECIMAL(18, 5) NOT NULL,
    price_current DECIMAL(18, 5) NOT NULL,
    stop_loss DECIMAL(18, 5),
    take_profit DECIMAL(18, 5),
    profit DECIMAL(18, 2) DEFAULT 0,
    swap DECIMAL(18, 2) DEFAULT 0,
    commission DECIMAL(18, 2) DEFAULT 0,
    comment VARCHAR(100),
    magic_number INTEGER,
    is_closed BOOLEAN DEFAULT false,
    opened_at TIMESTAMPTZ NOT NULL,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(mt5_account_id, ticket)
);

CREATE INDEX idx_positions_mt5_account ON positions(mt5_account_id);
CREATE INDEX idx_positions_symbol ON positions(symbol);
CREATE INDEX idx_positions_type ON positions(type);
CREATE INDEX idx_positions_is_closed ON positions(is_closed);
CREATE INDEX idx_positions_opened_at ON positions(opened_at DESC);
CREATE INDEX idx_positions_ticket ON positions(ticket);
```

### market_data

```sql
CREATE TABLE market_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    open DECIMAL(18, 5) NOT NULL,
    high DECIMAL(18, 5) NOT NULL,
    low DECIMAL(18, 5) NOT NULL,
    close DECIMAL(18, 5) NOT NULL,
    tick_volume BIGINT DEFAULT 0,
    volume DECIMAL(18, 2) DEFAULT 0,
    spread DECIMAL(10, 1) DEFAULT 0,
    is_complete BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(symbol, timeframe, timestamp)
);

CREATE INDEX idx_market_data_symbol_timeframe ON market_data(symbol, timeframe);
CREATE INDEX idx_market_data_timestamp ON market_data(timestamp DESC);
CREATE INDEX idx_market_data_symbol ON market_data(symbol);
```

### patterns

```sql
CREATE TABLE patterns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    entry_price DECIMAL(18, 5),
    stop_loss DECIMAL(18, 5),
    take_profit DECIMAL(18, 5),
    confidence DECIMAL(5, 2) DEFAULT 0,
    risk_reward_ratio DECIMAL(5, 2),
    is_valid BOOLEAN DEFAULT true,
    validation_reason TEXT,
    outcome VARCHAR(20),
    profit DECIMAL(18, 2),
    chart_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ
);

CREATE INDEX idx_patterns_symbol ON patterns(symbol);
CREATE INDEX idx_patterns_type ON patterns(pattern_type);
CREATE INDEX idx_patterns_is_valid ON patterns(is_valid);
CREATE INDEX idx_patterns_created_at ON patterns(created_at DESC);
CREATE INDEX idx_patterns_direction ON patterns(direction);
```

### signals

```sql
CREATE TABLE signals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    pattern_type VARCHAR(50) NOT NULL,
    direction VARCHAR(10) NOT NULL,
    entry_price DECIMAL(18, 5) NOT NULL,
    stop_loss DECIMAL(18, 5),
    take_profit DECIMAL(18, 5),
    confidence DECIMAL(5, 2) DEFAULT 0,
    risk_amount DECIMAL(18, 2),
    status VARCHAR(20) DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    triggered_at TIMESTAMPTZ,
    linked_order_id UUID REFERENCES orders(id),
    linked_position_id UUID REFERENCES positions(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_signals_symbol ON signals(symbol);
CREATE INDEX idx_signals_status ON signals(status);
CREATE INDEX idx_signals_created_at ON signals(created_at DESC);
CREATE INDEX idx_signals_expires_at ON signals(expires_at);
```

### risk_settings

```sql
CREATE TABLE risk_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    max_risk_percent DECIMAL(5, 2) DEFAULT 1.00,
    max_risk_amount DECIMAL(18, 2),
    daily_loss_limit DECIMAL(18, 2) DEFAULT 5.00,
    max_drawdown_percent DECIMAL(5, 2) DEFAULT 10.00,
    max_positions INTEGER DEFAULT 5,
    max_lot_per_trade DECIMAL(10, 2) DEFAULT 1.00,
    max_total_lot DECIMAL(10, 2) DEFAULT 10.00,
    min_risk_reward_ratio DECIMAL(3, 1) DEFAULT 1.5,
    use_kelly_criterion BOOLEAN DEFAULT false,
    kelly_fraction DECIMAL(3, 2) DEFAULT 0.25,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(mt5_account_id)
);

CREATE INDEX idx_risk_settings_account ON risk_settings(mt5_account_id);
```

### backtests

```sql
CREATE TABLE backtests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    strategy_type VARCHAR(50) NOT NULL,
    parameters JSONB DEFAULT '{}',
    symbols TEXT[] NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    initial_balance DECIMAL(18, 2) DEFAULT 10000,
    results JSONB,
    equity_curve JSONB,
    trades_count INTEGER DEFAULT 0,
    wins_count INTEGER DEFAULT 0,
    losses_count INTEGER DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    profit_factor DECIMAL(6, 2) DEFAULT 0,
    max_drawdown DECIMAL(5, 2) DEFAULT 0,
    sharpe_ratio DECIMAL(6, 2),
    avg_trade_duration INTEGER,
    metrics JSONB,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_backtests_user ON backtests(user_id);
CREATE INDEX idx_backtests_status ON backtests(status);
CREATE INDEX idx_backtests_strategy ON backtests(strategy_type);
CREATE INDEX idx_backtests_created_at ON backtests(created_at DESC);
```

### trade_history

```sql
CREATE TABLE trade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mt5_account_id UUID NOT NULL REFERENCES mt5_accounts(id) ON DELETE CASCADE,
    order_id UUID REFERENCES orders(id),
    position_id UUID REFERENCES positions(id),
    symbol VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL,
    volume DECIMAL(18, 8) NOT NULL,
    entry_price DECIMAL(18, 5) NOT NULL,
    exit_price DECIMAL(18, 5),
    profit DECIMAL(18, 2) DEFAULT 0,
    commission DECIMAL(18, 2) DEFAULT 0,
    swap DECIMAL(18, 2) DEFAULT 0,
    duration_minutes INTEGER,
    risk_reward_ratio DECIMAL(5, 2),
    trade_type VARCHAR(20),
    pattern_id UUID REFERENCES patterns(id),
    signal_id UUID REFERENCES signals(id),
    strategy_id UUID,
    entry_reason VARCHAR(50),
    exit_reason VARCHAR(50),
    is_winner BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trade_history_account ON trade_history(mt5_account_id);
CREATE INDEX idx_trade_history_symbol ON trade_history(symbol);
CREATE INDEX idx_trade_history_created_at ON trade_history(created_at DESC);
CREATE INDEX idx_trade_history_is_winner ON trade_history(is_winner);
```

### sessions

```sql
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(500) NOT NULL,
    refresh_token VARCHAR(500),
    ip_address VARCHAR(45),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

### audit_logs

```sql
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);
```

---

## Indexes Strategy

### Composite Indexes
```sql
-- For market data queries
CREATE INDEX idx_market_data_symbol_timeframe_timestamp 
    ON market_data(symbol, timeframe, timestamp DESC);

-- For position queries
CREATE INDEX idx_positions_account_symbol_open 
    ON positions(mt5_account_id, symbol, opened_at DESC);

-- For signal queries
CREATE INDEX idx_signals_symbol_status_confidence 
    ON signals(symbol, status, confidence DESC);
```

### Partial Indexes
```sql
-- Only active positions
CREATE INDEX idx_positions_active 
    ON positions(mt5_account_id) WHERE is_closed = false;

-- Only valid patterns
CREATE INDEX idx_patterns_valid 
    ON patterns(symbol, created_at DESC) WHERE is_valid = true;

-- Expiring signals
CREATE INDEX idx_signals_expiring 
    ON signals(expires_at) WHERE status = 'active' AND expires_at > NOW();
```

---

## Data Retention Policy

| Table | Retention | Action |
|-------|-----------|--------|
| market_data | 10 years | Partition by year |
| orders | Forever | Soft delete |
| positions | Forever | Soft delete |
| trade_history | Forever | None |
| patterns | 2 years | Archive old |
| signals | 1 year | Archive old |
| backtests | Forever | None |
| sessions | 30 days | Hard delete |
| audit_logs | 1 year | Archive old |

---

## Migration Guide

### Migration v0.1
```sql
-- Run all table definitions
-- Use migrations like Prisma or Drizzle
-- Example with Drizzle:
import { pgTable, uuid, varchar, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).unique().notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
```
