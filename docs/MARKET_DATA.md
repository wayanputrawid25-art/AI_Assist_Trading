# ForexOS Market Data Engine

**Last Updated:** 2026-06-25

Complete guide for the ForexOS Market Data Engine - real-time and historical market data for trading.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Timeframes](#timeframes)
3. [Historical Candles](#historical-candles)
4. [Real-Time Candles](#real-time-candles)
5. [Tick Stream](#tick-stream)
6. [Symbol Data](#symbol-data)
7. [Cache & Storage](#cache--storage)
8. [Data Validation](#data-validation)
9. [Missing Candle Detection](#missing-candle-detection)
10. [API Reference](#api-reference)
11. [Configuration](#configuration)
12. [Error Handling](#error-handling)

---

## Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MARKET DATA FLOW                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────────┐                                                       │
│  │   MT5 Terminal   │──── Ticks ────▶│                                     │
│  │   (Exchange)     │──── Candles ───▶│                                     │
│  └──────────────────┘               │                                        │
│                                     ▼                                        │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                       MT5 BRIDGE SERVER                               │  │
│  │  • WebSocket API                                                    │  │
│  │  • Real-time tick streaming                                         │  │
│  │  • Historical data requests                                         │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     │                                        │
│                                     ▼ WebSocket                             │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                      MT5MarketService                                 │  │
│  │                                                                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐               │  │
│  │  │ Tick Cache   │  │ Candle Agg  │  │ Symbol Cache │               │  │
│  │  └─────────────┘  └─────────────┘  └─────────────┘               │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                     │                                        │
│        ┌───────────────────────────┼───────────────────────────┐          │
│        ▼                           ▼                           ▼          │
│  ┌──────────────┐          ┌──────────────┐          ┌──────────────┐  │
│  │   REST API   │          │   WebSocket  │          │   Database   │  │
│  │   /market/* │          │   Streaming  │          │   (Cache)    │  │
│  └──────────────┘          └──────────────┘          └──────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Type | Description |
|-----------|------|-------------|
| `MT5MarketService` | Service | Core market data provider |
| `CandlesRepository` | Repository | Database operations for candles |
| `marketRouter` | Express Router | REST API endpoints |
| `candles` | Database Table | OHLCV storage |

### Data Types

```typescript
// Tick - Single price update
interface Tick {
  symbol: string;      // "EURUSD"
  bid: number;          // 1.0850
  ask: number;          // 1.0852
  last: number;         // 1.0851
  volume: number;       // 1000
  timestamp: number;    // 1719283200000
}

// Candle - OHLCV aggregation
interface Candle {
  id: string;           // "candle_EURUSD_H1_1719283200000"
  symbol: string;       // "EURUSD"
  timeframe: Timeframe; // "H1"
  timestamp: number;    // Candle open time
  open: number;          // 1.0840
  high: number;          // 1.0860
  low: number;           // 1.0835
  close: number;         // 1.0855
  tickVolume: number;    // 5000
  spread: number;        // 8
}

// Ticker - Aggregated market data
interface Ticker {
  symbol: string;
  bid: number;
  ask: number;
  last: number;
  high: number;          // Daily high
  low: number;           // Daily low
  change: number;        // Price change
  changePercent: number; // % change
  volume: number;
  timestamp: number;
}

// Symbol - Trading instrument info
interface Symbol {
  id: string;
  name: string;          // "EURUSD"
  description: string;   // "Euro vs US Dollar"
  category: string;      // "Forex"
  digits: number;        // 5
  contractSize: number;   // 100000
  tickValue: number;      // 10
  tickSize: number;       // 0.00001
  volumeMin: number;      // 0.01
  volumeMax: number;      // 100
  volumeStep: number;     // 0.01
  isActive: boolean;
}
```

---

## Timeframes

### Supported Timeframes

```typescript
type Timeframe = 'M1' | 'M5' | 'M15' | 'M30' | 'H1' | 'H4' | 'D1' | 'W1';
```

### Timeframe Reference

| Timeframe | Minutes | Description | Common Use |
|-----------|---------|-------------|------------|
| `M1` | 1 | 1 Minute | Scalping, high-frequency |
| `M5` | 5 | 5 Minutes | Short-term trading |
| `M15` | 15 | 15 Minutes | Intraday trading |
| `M30` | 30 | 30 Minutes | Intraday analysis |
| `H1` | 60 | 1 Hour | Standard intraday |
| `H4` | 240 | 4 Hours | Swing trading |
| `D1` | 1440 | Daily | Position trading |
| `W1` | 10080 | Weekly | Long-term analysis |

### Timeframe Mapping

```typescript
// Timeframe to minutes conversion
const TIMEFRAME_MINUTES: Record<Timeframe, number> = {
  M1: 1,
  M5: 5,
  M15: 15,
  M30: 30,
  H1: 60,
  H4: 240,
  D1: 1440,
  W1: 10080,
};

// Milliseconds for calculations
const timeframeMs = TIMEFRAME_MINUTES[timeframe] * 60 * 1000;
```

---

## Historical Candles

### Fetching Historical Data

```typescript
// Via MT5MarketService
const candles = await mt5Service.getCandles(
  'EURUSD',           // symbol
  'H1',               // timeframe
  Date.now() - 7 * 24 * 60 * 60 * 1000, // from (7 days ago)
  Date.now(),         // to (now)
  100                 // limit
);
```

### API Endpoint

```
GET /api/v1/market/candles
```

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `symbol` | string | Yes | - | Symbol name (e.g., "EURUSD") |
| `timeframe` | string | Yes | - | M1, M5, M15, M30, H1, H4, D1, W1 |
| `from` | number | No | - | Start timestamp (ms) |
| `to` | number | No | - | End timestamp (ms) |
| `limit` | number | No | 100 | Max candles (1-10000) |

### Example Request

```bash
# Get last 100 hourly candles for EURUSD
curl -X GET "http://localhost:3001/api/v1/market/candles?symbol=EURUSD&timeframe=H1&limit=100" \
  -H "Authorization: Bearer <token>"
```

### Example Response

```json
{
  "success": true,
  "data": {
    "symbol": "EURUSD",
    "timeframe": "H1",
    "candles": [
      {
        "id": "candle_EURUSD_H1_1719283200000",
        "symbol": "EURUSD",
        "timeframe": "H1",
        "timestamp": 1719283200000,
        "open": 1.0840,
        "high": 1.0860,
        "low": 1.0835,
        "close": 1.0855,
        "tickVolume": 5000,
        "spread": 8
      }
    ],
    "total": 100
  }
}
```

### Candle Generation (Demo Mode)

```typescript
private generateDemoCandles(
  symbol: string,
  timeframe: Timeframe,
  from?: number,
  to?: number,
  limit: number = 100
): Candle[] {
  const candles: Candle[] = [];
  const timeframeMs = TIMEFRAME_MINUTES[timeframe] * 60 * 1000;
  
  const endTime = to || Date.now();
  const startTime = from || endTime - (limit * timeframeMs);
  
  let currentTime = startTime;
  let lastClose = BASE_PRICES[symbol]?.bid || 1.0;

  while (candles.length < limit && currentTime <= endTime) {
    const volatility = 0.001;
    const change = (Math.random() - 0.5) * volatility;
    
    const open = lastClose;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

    candles.push({
      id: `candle_${symbol}_${timeframe}_${currentTime}`,
      symbol,
      timeframe,
      timestamp: currentTime,
      open,
      high,
      low,
      close,
      tickVolume: Math.floor(Math.random() * 10000),
      spread: Math.random() * 10,
    });

    lastClose = close;
    currentTime += timeframeMs;
  }

  return candles;
}
```

---

## Real-Time Candles

### Real-Time Aggregation

The market data engine aggregates ticks into real-time candles:

```typescript
// Tick → Candle aggregation
class CandleAggregator {
  private currentCandle: Candle | null = null;
  private timeframeMs: number;

  constructor(timeframe: Timeframe) {
    this.timeframeMs = TIMEFRAME_MINUTES[timeframe] * 60 * 1000;
  }

  processTick(tick: Tick): Candle | null {
    const candleTimestamp = this.alignToTimeframe(tick.timestamp);
    
    // New candle period
    if (!this.currentCandle || this.currentCandle.timestamp !== candleTimestamp) {
      const completedCandle = this.currentCandle;
      this.currentCandle = this.createNewCandle(tick, candleTimestamp);
      return completedCandle; // Return completed candle
    }
    
    // Update current candle
    this.currentCandle.high = Math.max(this.currentCandle.high, tick.last);
    this.currentCandle.low = Math.min(this.currentCandle.low, tick.last);
    this.currentCandle.close = tick.last;
    this.currentCandle.tickVolume += tick.volume;
    
    return null; // Candle still forming
  }
}
```

### WebSocket Streaming

```typescript
// Subscribe to real-time candles
async *subscribeCandles(symbols: string[], timeframe: Timeframe): AsyncGenerator<Candle> {
  const aggregator = new CandleAggregator(timeframe);
  
  for await (const tick of mt5Service.subscribeTicks(symbols)) {
    const completedCandle = aggregator.processTick(tick);
    if (completedCandle) {
      yield completedCandle; // Emit completed candle
    }
  }
}
```

---

## Tick Stream

### Tick Data Structure

```typescript
interface Tick {
  symbol: string;      // Trading symbol
  bid: number;         // Bid price
  ask: number;         // Ask price  
  last: number;         // Last traded price
  volume: number;       // Tick volume
  timestamp: number;   // Unix timestamp (ms)
}
```

### Subscribing to Ticks

```typescript
// Async iterator for tick stream
async function streamTicks(symbols: string[]) {
  for await (const tick of mt5Service.subscribeTicks(symbols)) {
    console.log(`${tick.symbol}: ${tick.bid}/${tick.ask}`);
    
    // Process tick data
    processTick(tick);
  }
}

// Start streaming
streamTicks(['EURUSD', 'GBPUSD', 'USDJPY']);
```

### API Endpoint

```
GET /api/v1/market/tick/:symbol
```

### Example Response

```json
{
  "success": true,
  "data": {
    "tick": {
      "symbol": "EURUSD",
      "bid": 1.0850,
      "ask": 1.0852,
      "last": 1.0851,
      "volume": 1250,
      "timestamp": 1719283200000
    }
  }
}
```

### Multi-Symbol Tickers

```typescript
// Get tickers for multiple symbols
const tickers = await mt5Service.getTickers(['EURUSD', 'GBPUSD', 'USDJPY']);
```

### Demo Tick Generation

```typescript
private generateDemoTick(symbol: string): Tick {
  const base = BASE_PRICES[symbol];
  if (!base) {
    return {
      symbol,
      bid: 1.0,
      ask: 1.0003,
      last: 1.00015,
      volume: 0,
      timestamp: Date.now(),
    };
  }

  // Add small random variation
  const variation = (Math.random() - 0.5) * 0.0005;
  const spread = base.ask - base.bid;

  return {
    symbol,
    bid: base.bid + variation,
    ask: base.bid + variation + spread,
    last: base.bid + variation + spread / 2,
    volume: Math.floor(Math.random() * 1000),
    timestamp: Date.now(),
  };
}
```

---

## Symbol Data

### Available Forex Symbols

| Symbol | Description | Category | Digits |
|--------|-------------|----------|--------|
| EURUSD | Euro vs US Dollar | Forex | 5 |
| GBPUSD | British Pound vs US Dollar | Forex | 5 |
| USDJPY | US Dollar vs Japanese Yen | Forex | 3 |
| USDCHF | US Dollar vs Swiss Franc | Forex | 5 |
| AUDUSD | Australian Dollar vs US Dollar | Forex | 5 |
| USDCAD | US Dollar vs Canadian Dollar | Forex | 5 |
| NZDUSD | New Zealand Dollar vs US Dollar | Forex | 5 |
| EURGBP | Euro vs British Pound | Forex | 5 |
| EURJPY | Euro vs Japanese Yen | Forex | 3 |
| GBPJPY | British Pound vs Japanese Yen | Forex | 3 |

### Get All Symbols

```
GET /api/v1/market/symbols
```

### Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | No | Filter by category (e.g., "Forex") |
| `isActive` | string | No | "true" or "false" |

### Get Single Symbol

```
GET /api/v1/market/symbol/:symbol
```

### Get Ticker

```
GET /api/v1/market/ticker/:symbol
GET /api/v1/market/tickers
```

### Symbol Specification

```typescript
interface SymbolSpec {
  name: string;              // "EURUSD"
  description: string;       // "Euro vs US Dollar"
  category: string;          // "Forex"
  digits: number;            // 5 (decimal places)
  contractSize: number;      // 100000 (units per lot)
  tickValue: number;         // 10 (value per tick)
  tickSize: number;          // 0.00001
  volumeMin: number;          // 0.01 (minimum lot)
  volumeMax: number;          // 100 (maximum lot)
  volumeStep: number;        // 0.01 (lot increment)
  spread: number;             // Current spread
  isConnected: boolean;      // Connection status
}
```

---

## Cache & Storage

### Database Schema

```typescript
// packages/database/src/schema/candles.ts
export const candles = pgTable('candles', {
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
}, (table) => ({
  candlesSymbolTimeframeTimestampIdx: uniqueIndex('candles_symbol_timeframe_timestamp_idx')
    .on(table.symbol, table.timeframe, table.timestamp),
  candlesSymbolTimeframeIdx: index('candles_symbol_timeframe_idx')
    .on(table.symbol, table.timeframe),
}));
```

### Indexes

| Index | Columns | Type | Purpose |
|-------|---------|------|---------|
| `candles_symbol_timeframe_timestamp_idx` | symbol, timeframe, timestamp | UNIQUE | Primary lookup |
| `candles_symbol_timeframe_idx` | symbol, timeframe | INDEX | Range queries |

### Candles Repository

```typescript
class CandlesRepository {
  // Find latest candle
  async findLatest(symbol: string, timeframe: string): Promise<Candle | undefined>;

  // Find candles in range
  async findBySymbolAndTimeframe(
    symbol: string,
    timeframe: string,
    options?: { from?: Date; to?: Date; limit?: number }
  ): Promise<Candle[]>;

  // Create single candle
  async create(data: NewCandle): Promise<Candle>;

  // Create multiple candles
  async createMany(data: NewCandle[]): Promise<number>;

  // Upsert candle (insert or update)
  async upsert(data: NewCandle): Promise<Candle>;

  // Delete old candles
  async deleteOldCandles(beforeDate: Date): Promise<number>;

  // Count candles
  async count(symbol?: string, timeframe?: string): Promise<number>;
}
```

### Upsert Pattern

```typescript
// Insert or update candle (handles duplicates)
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
```

---

## Data Validation

### Input Validation (Zod)

```typescript
// Candles request validation
const getCandlesSchema = z.object({
  symbol: z.string().min(1),
  timeframe: z.enum(['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']),
  from: z.string().optional(),
  to: z.string().optional(),
  limit: z.coerce.number().min(1).max(10000).optional().default(100),
});

// Symbol validation
const getSymbolsSchema = z.object({
  category: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});
```

### Validation Rules

| Field | Rule | Error |
|-------|------|-------|
| symbol | Non-empty string | `Symbol is required` |
| timeframe | Valid enum | `Invalid timeframe` |
| limit | 1-10000 | `Limit must be between 1 and 10000` |
| from/to | Valid timestamp | `Invalid timestamp` |

### Price Validation

```typescript
// Validate candle data integrity
function validateCandle(candle: Candle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // OHLC relationship
  if (candle.high < candle.low) {
    errors.push('High must be >= Low');
  }
  if (candle.high < candle.open || candle.high < candle.close) {
    errors.push('High must be >= Open and Close');
  }
  if (candle.low > candle.open || candle.low > candle.close) {
    errors.push('Low must be <= Open and Close');
  }

  // Positive values
  if (candle.volume < 0) {
    errors.push('Volume must be non-negative');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

---

## Missing Candle Detection

### Gap Detection Algorithm

```typescript
interface CandleGap {
  symbol: string;
  timeframe: Timeframe;
  expectedTimestamp: number;
  actualTimestamp: number | null;
  gapMs: number;
  severity: 'minor' | 'major' | 'critical';
}

// Detect missing candles
function detectMissingCandles(
  candles: Candle[],
  timeframe: Timeframe
): CandleGap[] {
  const gaps: CandleGap[] = [];
  const timeframeMs = TIMEFRAME_MINUTES[timeframe] * 60 * 1000;
  
  for (let i = 1; i < candles.length; i++) {
    const prev = candles[i - 1];
    const curr = candles[i];
    
    const expectedGap = curr.timestamp - prev.timestamp;
    
    if (expectedGap > timeframeMs) {
      const gapMs = expectedGap - timeframeMs;
      let severity: 'minor' | 'major' | 'critical';
      
      if (gapMs <= timeframeMs * 0.5) {
        severity = 'minor';
      } else if (gapMs <= timeframeMs * 2) {
        severity = 'major';
      } else {
        severity = 'critical';
      }
      
      gaps.push({
        symbol: curr.symbol,
        timeframe,
        expectedTimestamp: prev.timestamp + timeframeMs,
        actualTimestamp: curr.timestamp,
        gapMs,
        severity,
      });
    }
  }
  
  return gaps;
}
```

### Weekend Gap Detection

```typescript
// Detect weekend gaps (market closed)
function isWeekendGap(timestamp1: number, timestamp2: number): boolean {
  const timeDiff = timestamp2 - timestamp1;
  const fridayClose = 5 * 24 * 60 * 60 * 1000; // Friday midnight
  const mondayOpen = 1 * 24 * 60 * 60 * 1000;   // Monday midnight
  
  // If gap spans weekend
  return timeDiff > fridayClose;
}
```

### Fill Missing Candles

```typescript
// Fill gaps with synthetic candles
async function fillMissingCandles(
  symbol: string,
  timeframe: Timeframe,
  gaps: CandleGap[]
): Promise<Candle[]> {
  const filledCandles: Candle[] = [];
  const timeframeMs = TIMEFRAME_MINUTES[timeframe] * 60 * 1000;
  
  for (const gap of gaps) {
    let currentTime = gap.expectedTimestamp;
    
    while (currentTime < gap.actualTimestamp!) {
      // Create synthetic candle (forward-filled)
      const synthetic: Candle = {
        id: `synthetic_${symbol}_${timeframe}_${currentTime}`,
        symbol,
        timeframe,
        timestamp: currentTime,
        open: NaN, // Unknown
        high: NaN,
        low: NaN,
        close: NaN,
        tickVolume: 0,
        spread: -1, // Indicate synthetic
      };
      
      filledCandles.push(synthetic);
      currentTime += timeframeMs;
    }
  }
  
  return filledCandles;
}
```

---

## API Reference

### Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/market/symbols` | Get all symbols |
| GET | `/api/v1/market/symbol/:symbol` | Get single symbol |
| GET | `/api/v1/market/ticker/:symbol` | Get ticker for symbol |
| GET | `/api/v1/market/tickers` | Get all tickers |
| GET | `/api/v1/market/candles` | Get historical candles |
| GET | `/api/v1/market/tick/:symbol` | Get current tick |
| GET | `/api/v1/market/status` | Get market service status |

### GET /api/v1/market/candles

**Query Parameters:**
```
symbol=EURUSD&timeframe=H1&limit=100&from=1719283200000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "symbol": "EURUSD",
    "timeframe": "H1",
    "candles": [...],
    "total": 100
  }
}
```

### GET /api/v1/market/status

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "mode": "demo",
    "timestamp": 1719283200000
  }
}
```

---

## Configuration

### Environment Variables

```bash
# MT5 Connection
MT5_HOST=localhost
MT5_PORT=8888
MT5_USE_DEMO=true

# Demo Mode
MT5_USE_DEMO=true   # Set false for live data
```

### Trading Config (trading.yaml)

```yaml
# Symbol configuration
symbols:
  EURUSD:
    contractSize: 100000
    pipDecimal: 0.0001
    pipValue: 10.0
    minLot: 0.01
    maxLot: 100.0
    lotStep: 0.01
    minSpread: 1
    maxSpread: 50

# Decision engine timeframes
decision:
  timeframes:
    - H1
    - H4
    - D1
```

---

## Error Handling

### Error Codes

| Code | Message | Description |
|------|---------|-------------|
| `VALIDATION_ERROR` | Invalid request | Invalid query parameters |
| `NOT_FOUND` | Symbol not found | Unknown symbol |
| `CONNECTION_ERROR` | MT5 disconnected | Cannot reach MT5 |

### Error Responses

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid timeframe",
    "details": [
      { "field": "timeframe", "message": "Invalid enum value" }
    ]
  }
}
```

### Connection Handling

```typescript
// Check connection before requests
async function ensureConnected(): Promise<void> {
  if (!mt5Service.isConnected()) {
    await mt5Service.connect();
  }
}

// Auto-reconnect on failure
try {
  await ensureConnected();
  const candles = await mt5Service.getCandles(...);
} catch (error) {
  if (error instanceof ConnectionError) {
    await mt5Service.connect();
    // Retry
  }
}
```

---

## Quick Start

### Basic Usage

```typescript
import { mt5Service } from '@forexos/api';

// Connect
await mt5Service.connect();

// Get historical candles
const candles = await mt5Service.getCandles('EURUSD', 'H1', undefined, undefined, 100);

// Stream real-time ticks
for await (const tick of mt5Service.subscribeTicks(['EURUSD'])) {
  console.log(`${tick.symbol}: ${tick.bid}/${tick.ask}`);
}
```

### Fetch Multiple Timeframes

```typescript
async function fetchAllTimeframes(symbol: string) {
  const timeframes: Timeframe[] = ['M5', 'M15', 'H1', 'H4', 'D1'];
  const data: Record<Timeframe, Candle[]> = {};
  
  for (const tf of timeframes) {
    data[tf] = await mt5Service.getCandles(symbol, tf, undefined, undefined, 100);
  }
  
  return data;
}
```

---

## Performance Tips

### 1. Cache Frequently Used Data

```typescript
// Cache symbols list
const symbolsCache = new Map<string, Symbol[]>();
let lastFetch = 0;

async function getCachedSymbols(): Promise<Symbol[]> {
  const now = Date.now();
  if (now - lastFetch > 60000 || !symbolsCache.get('forex')) {
    const symbols = await mt5Service.getSymbols('Forex');
    symbolsCache.set('forex', symbols);
    lastFetch = now;
  }
  return symbolsCache.get('forex')!;
}
```

### 2. Batch Requests

```typescript
// Get multiple symbols efficiently
const tickers = await mt5Service.getTickers(['EURUSD', 'GBPUSD', 'USDJPY']);
```

### 3. Limit Historical Data

```typescript
// Don't fetch more than needed
const candles = await mt5Service.getCandles('EURUSD', 'H1', undefined, undefined, 100);
// Default limit is 100, max is 10000
```

---

*Last updated: 2026-06-25*
