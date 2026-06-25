# ForexOS MT5 Bridge

**Last Updated:** 2026-06-25

Complete guide for the ForexOS MT5 Bridge - the connection layer between ForexOS and MetaTrader 5 trading platform.

---

## Table of Contents

1. [Architecture](#architecture)
2. [Connection Management](#connection-management)
3. [Authentication](#authentication)
4. [Heartbeat & Monitoring](#heartbeat--monitoring)
5. [Account Synchronization](#account-synchronization)
6. [Position Synchronization](#position-synchronization)
7. [Symbol Validation](#symbol-validation)
8. [Auto Recovery](#auto-recovery)
9. [API Reference](#api-reference)
10. [Error Handling](#error-handling)
11. [Configuration](#configuration)
12. [Demo Mode](#demo-mode)

---

## Architecture

### Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FOREXOS SYSTEM                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │   Decision   │     │   Risk       │     │  Execution   │               │
│  │   Engine     │────▶│   Manager    │────▶│   Service    │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
│                                                        │                     │
│                                                        ▼                     │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                         MT5 BRIDGE LAYER                               │  │
│  │                                                                       │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐          │  │
│  │  │  MT5Connector  │  │    Order       │  │   Position     │          │  │
│  │  │  (WebSocket)   │  │   Executor     │  │   Manager      │          │  │
│  │  └────────┬───────┘  └────────┬───────┘  └────────┬───────┘          │  │
│  │           │                  │                  │                     │  │
│  │           └──────────────────┼──────────────────┘                     │  │
│  │                              │                                        │  │
│  │                    ┌─────────▼─────────┐                              │  │
│  │                    │   Config Service  │                              │  │
│  │                    │  (config.yaml)    │                              │  │
│  │                    └───────────────────┘                              │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                    │                                         │
└────────────────────────────────────┼─────────────────────────────────────────┘
                                     │
                                     ▼ WebSocket (ws://)
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MT5 BRIDGE SERVER                                  │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    Python/External MT5 Bridge                           │  │
│  │                                                                       │  │
│  │  • Receives WebSocket commands                                        │  │
│  │  • Communicates with MT5 Terminal via API                              │  │
│  │  • Returns real-time data (ticks, positions, account)                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           METAQUOTE MT5                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐               │
│  │   MT5        │     │   Trading    │     │   Market     │               │
│  │   Terminal   │────▶│   Accounts   │◀────│   Data       │               │
│  └──────────────┘     └──────────────┘     └──────────────┘               │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Package | Responsibility |
|-----------|---------|-----------------|
| `MT5Connector` | `@forexos/engine` | WebSocket connection, authentication |
| `OrderExecutor` | `@forexos/engine` | Order validation, execution |
| `PositionManager` | `@forexos/engine` | Position tracking, sync |
| `ConfigService` | `@forexos/trading-config` | MT5 configuration |

---

## Connection Management

### Initializing Connection

```typescript
import { MT5Connector, mt5Connector } from '@forexos/engine';

// Option 1: Use default config from trading.yaml
const connector = mt5Connector;

// Option 2: Create with custom config
const customConnector = new MT5Connector({
  host: '192.168.1.100',
  port: 8888,
  login: 12345678,
  password: 'your_password',
  server: 'MT5Server',
});
```

### Connecting

```typescript
// Connect to MT5
async function connectToMT5() {
  try {
    const success = await connector.connect();
    
    if (success) {
      console.log('MT5 connected and authenticated');
    } else {
      console.log('Connection failed - check credentials');
    }
  } catch (error) {
    console.error('Connection error:', error);
  }
}

// Disconnect
function disconnectFromMT5() {
  connector.disconnect();
}
```

### Connection State

```typescript
interface MT5ConnectionState {
  connected: boolean;           // WebSocket open
  authenticated: boolean;      // Login successful
  lastError?: string;          // Last error message
  reconnectAttempts: number;   // Current retry count
}

// Check state
const state = connector.getState();
console.log(`Connected: ${state.connected}, Authenticated: ${state.authenticated}`);
```

### WebSocket Flow

```
Client                          MT5 Bridge Server
  │                                    │
  │──── CONNECT (WebSocket) ──────────▶│
  │                                    │
  │◀──── WebSocket Open ───────────────│
  │                                    │
  │──── CONNECT {login, pass, server}─▶│
  │                                    │
  │◀──── {success: true} ─────────────│
  │                                    │
  │──── REQUEST ───────────────────────▶│
  │◀──── RESPONSE ─────────────────────│
  │                                    │
  │──── ... (repeat) ─────────────────▶│
  │                                    │
  │◀──── WebSocket Close ──────────────│
```

---

## Authentication

### Login Process

```typescript
// Automatic during connect()
const response = await connector.sendRequest({
  command: 'CONNECT',
  id: generateId(),
  params: {
    login: this.config.login,
    password: this.config.password,
    server: this.config.server,
  },
});

if (response.success) {
  // Authentication successful
}
```

### Authentication Flow

```
1. WebSocket Connection Opens
         │
         ▼
2. Send CONNECT Command with credentials
         │
         ▼
3. Server validates login/password
         │
         ├──▶ Success: response.success = true
         │           state.authenticated = true
         │
         └──▶ Failure: response.success = false
                     state.authenticated = false
                     Connection closed
```

### Demo Mode Authentication

```typescript
// Demo mode bypasses authentication
if (this.isDemo) {
  console.log('[MT5] Running in DEMO mode');
  this.state.connected = true;
  this.state.authenticated = true;
  return true;
}
```

---

## Heartbeat & Monitoring

### Connection Health

```typescript
interface ConnectionHealth {
  lastMessageTime: number;      // Last received message
  latency: number;               // Round-trip time (ms)
  isHealthy: boolean;            // Connection status
}

// Monitor connection health
function checkHealth() {
  const state = connector.getState();
  
  if (!state.connected) {
    console.log('Connection lost');
    return false;
  }
  
  if (!state.authenticated) {
    console.log('Not authenticated');
    return false;
  }
  
  return true;
}
```

### Request Timeouts

```typescript
// Each request has 30-second timeout
private sendRequest(request: MT5Request): Promise<MT5Response> {
  return new Promise((resolve, reject) => {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      reject(new Error('Not connected'));
      return;
    }

    const timeout = setTimeout(() => {
      if (this.pendingRequests.has(request.id)) {
        this.pendingRequests.delete(request.id);
        reject(new Error('Request timeout'));
      }
    }, 30000);  // 30 second timeout

    this.pendingRequests.set(request.id, { resolve, reject, timeout });
    this.ws.send(JSON.stringify(request));
  });
}
```

### State Tracking

```typescript
// MT5ConnectionState tracks health
private state: MT5ConnectionState = {
  connected: false,
  authenticated: false,
  lastError: undefined,
  reconnectAttempts: 0,
};

// Get current state
const state = connector.getState();
```

---

## Account Synchronization

### Get Account Info

```typescript
interface AccountInfo {
  login: number;           // Account number
  name: string;             // Account name
  server: string;          // Broker server
  currency: string;        // Account currency
  balance: number;         // Current balance
  equity: number;          // Current equity
  margin: number;          // Used margin
  freeMargin: number;      // Available margin
  marginLevel: number;     // Margin level %
  leverage: number;        // Account leverage
  trades: number;          // Total trades
  deals: number;           // Total deals
}

// Fetch account info
async function getAccountInfo() {
  const info = await connector.getAccountInfo();
  
  if (info) {
    console.log(`Account: ${info.login}`);
    console.log(`Balance: ${info.balance} ${info.currency}`);
    console.log(`Equity: ${info.equity}`);
    console.log(`Margin Level: ${info.marginLevel}%`);
  }
}
```

### Demo Account Info

```typescript
// Demo mode returns mock data
private getDemoAccountInfo(): AccountInfo {
  return {
    login: 12345678,
    name: 'Demo Trader',
    server: 'Demo Server',
    currency: 'USD',
    balance: 10000,
    equity: 10000,
    margin: 0,
    freeMargin: 10000,
    marginLevel: 0,
    leverage: 100,
    trades: 0,
    deals: 0,
  };
}
```

### Account Monitoring

```typescript
// Periodic account sync
async function syncAccount(intervalMs: number = 5000) {
  setInterval(async () => {
    const info = await connector.getAccountInfo();
    if (info) {
      // Update UI, check margin levels, etc.
    }
  }, intervalMs);
}
```

---

## Position Synchronization

### Position Manager

```typescript
import { PositionManager } from '@forexos/engine';
import { OrderExecutor } from '@forexos/engine';

const executor = new OrderExecutor(mt5Connector);
const positionManager = new PositionManager(executor);

// Start tracking
positionManager.startTracking(5000); // Update every 5 seconds

// Get all positions
const positions = positionManager.getPositions();

// Get position by symbol
const eurPositions = positionManager.getPositionsBySymbol('EURUSD');

// Check if symbol has position
const hasEurPosition = positionManager.hasPosition('EURUSD');

// Stop tracking
positionManager.stopTracking();
```

### Position Data Structure

```typescript
interface Position {
  id: string;               // Unique position ID
  mt5Ticket: number;         // MT5 ticket number
  symbol: string;            // Trading symbol (e.g., "EURUSD")
  type: 'buy' | 'sell';      // Position type
  volume: number;            // Position volume (lots)
  priceOpen: number;         // Opening price
  priceCurrent: number;      // Current market price
  stopLoss?: number;         // Stop loss price
  takeProfit?: number;       // Take profit price
  profit: number;            // Current profit/loss
  swap: number;              // Swap value
  commission: number;        // Commission
  comment?: string;          // Trade comment
  openTime: number;          // Open timestamp
  updateTime: number;        // Last update timestamp
}
```

### Position Summary

```typescript
interface PositionSummary {
  totalPositions: number;    // Number of open positions
  totalVolume: number;      // Total volume
  totalProfit: number;      // Total profit
  totalLoss: number;        // Total loss
  buyPositions: number;     // Buy positions count
  sellPositions: number;    // Sell positions count
  largestPosition: number;  // Largest volume
  averageProfit: number;    // Average P/L per position
}

// Get position summary
const summary = positionManager.getSummary();
console.log(`Open Positions: ${summary.totalPositions}`);
console.log(`Total P/L: ${summary.totalProfit - summary.totalLoss}`);
```

### Position Operations

```typescript
// Close position by ticket
const result = await positionManager.closePosition(12345678);
if (result.success) {
  console.log('Position closed');
}

// Close all positions for symbol
const closeResult = await positionManager.closeAllBySymbol('EURUSD');
console.log(`Closed ${closeResult.closed} positions`);

// Close all positions
const closeAllResult = await positionManager.closeAll();

// Modify stop loss
await positionManager.setStopLoss(12345678, 1.0800);

// Modify take profit
await positionManager.setTakeProfit(12345678, 1.1000);

// Move to breakeven
await positionManager.moveToBreakeven(12345678);
```

---

## Symbol Validation

### Symbol Specifications

```typescript
interface SymbolSpec {
  contractSize: number;    // Units per lot
  pipDecimal: number;       // Pip decimal places
  minVolume: number;         // Minimum lot size
  maxVolume: number;         // Maximum lot size
  volumeStep: number;        // Lot increment
  stopLevel: number;         // Min stop distance (pips)
}

// Predefined symbols
const SYMBOL_SPECS = {
  EURUSD: { contractSize: 100000, pipDecimal: 0.0001, ... },
  GBPUSD: { contractSize: 100000, pipDecimal: 0.0001, ... },
  USDJPY: { contractSize: 100000, pipDecimal: 0.01, ... },
  // ... more symbols
};
```

### Order Validation

```typescript
interface ExecutionValidation {
  valid: boolean;           // Is order valid
  errors: string[];          // Validation errors
  warnings: string[];        // Warnings (e.g., loose SL)
}

// Validate order before execution
const validation = executor.validateOrder({
  symbol: 'EURUSD',
  type: 'buy',
  kind: 'market',
  volume: 0.1,
  stopLoss: 1.0800,
  takeProfit: 1.1000,
});

if (!validation.valid) {
  console.log('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.log('Warnings:', validation.warnings);
}
```

### Validation Rules

| Check | Rule | Error |
|-------|------|-------|
| Symbol | Must be in SYMBOL_SPECS | `Unknown symbol: XXX` |
| Volume Min | `volume >= minVolume` | `Volume too small` |
| Volume Max | `volume <= maxVolume` | `Volume too large` |
| Volume Step | `volume % volumeStep === 0` | `Volume must be in steps of X` |
| Stop Loss | Must be on correct side | `Invalid SL/TP for buy order` |
| Take Profit | Must be on correct side | `Invalid SL/TP for sell order` |
| Pending Price | Required for limit/stop | `Price required for X orders` |

### Get Symbol Info

```typescript
interface MT5SymbolInfo {
  symbol: string;            // Symbol name
  bid: number;               // Current bid
  ask: number;               // Current ask
  spread: number;            // Current spread (points)
  digits: number;            // Price digits
  volumeMin: number;         // Minimum volume
  volumeMax: number;         // Maximum volume
  volumeStep: number;        // Volume step
  contractSize: number;      // Contract size
  marginHedge: number;       // Hedge margin factor
  swapLong: number;          // Swap for long
  swapShort: number;         // Swap for short
}

// Get real-time symbol info
async function getSymbolInfo(symbol: string) {
  const info = await connector.getSymbolInfo(symbol);
  
  if (info) {
    console.log(`${symbol}: Bid=${info.bid}, Ask=${info.ask}`);
    console.log(`Spread: ${info.spread} points`);
  }
}

// Get current tick
async function getTick(symbol: string) {
  const tick = await connector.getTick(symbol);
  
  if (tick) {
    console.log(`${tick.symbol}: ${tick.bid}/${tick.ask}`);
    console.log(`Time: ${new Date(tick.timestamp)}`);
  }
}
```

---

## Auto Recovery

### Automatic Reconnection

```typescript
// When WebSocket closes
this.ws.onclose = () => {
  console.log('[MT5] WebSocket closed');
  this.state.connected = false;
  this.state.authenticated = false;
  this.handleDisconnect();
};

// Handle disconnection with auto-reconnect
private handleDisconnect(): void {
  if (this.state.reconnectAttempts < this.config.maxRetries) {
    this.state.reconnectAttempts++;
    console.log(`[MT5] Reconnecting in ${this.config.reconnectInterval}ms (attempt ${this.state.reconnectAttempts})`);
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect().catch(console.error);
    }, this.config.reconnectInterval);
  } else {
    console.error('[MT5] Max reconnect attempts reached');
    this.state.lastError = 'Max reconnect attempts reached';
  }
}
```

### Reconnection Flow

```
Connection Lost
       │
       ▼
Check retry count < maxRetries?
       │
       ├──▶ No ──▶ Stop, report error
       │
       └──▶ Yes
             │
             ▼
       Increment retry count
             │
             ▼
       Wait reconnectInterval (default 5000ms)
             │
             ▼
       Attempt reconnect
             │
             ├──▶ Success ──▶ Reset retry count
             │               Continue normal operation
             │
             └──▶ Failure ──▶ handleDisconnect() again
```

### Configuration

```typescript
// From config/trading.yaml
execution:
  mt5:
    host: "localhost"
    port: 8888
    reconnectInterval: 5000    # 5 seconds
    maxRetries: 3              # Max retry attempts
    timeout: 30000             # 30 second timeout
    useDemo: false
```

### Manual Recovery

```typescript
// Force reconnection
async function forceReconnect() {
  connector.disconnect();
  
  // Reset retry counter
  const state = connector.getState();
  state.reconnectAttempts = 0;
  
  // Reconnect
  await connector.connect();
}
```

---

## API Reference

### MT5Connector

```typescript
class MT5Connector {
  // Connection
  connect(): Promise<boolean>;        // Connect to MT5
  disconnect(): void;                  // Disconnect
  getState(): MT5ConnectionState;    // Get connection state

  // Account
  getAccountInfo(): Promise<AccountInfo | null>;

  // Market Data
  getSymbolInfo(symbol: string): Promise<MT5SymbolInfo | null>;
  getTick(symbol: string): Promise<MT5Tick | null>;

  // Positions
  getPositions(): Promise<Position[]>;

  // Trading
  sendOrder(params: OrderParams): Promise<TradeResult | null>;
  closePosition(ticket: number, volume?: number): Promise<TradeResult | null>;
  modifyPosition(ticket: number, stopLoss?: number, takeProfit?: number): Promise<boolean>;
}
```

### OrderExecutor

```typescript
class OrderExecutor {
  constructor(connector: MT5Connector, isDemo?: boolean);

  // Validation
  validateOrder(order: OrderRequest): ExecutionValidation;

  // Execution
  executeBuy(order: OrderRequest): Promise<OrderResult>;
  executeSell(order: OrderRequest): Promise<OrderResult>;

  // Position Management
  closePosition(request: ClosePositionRequest): Promise<OrderResult>;
  modifyPosition(request: ModifyPositionRequest): Promise<OrderResult>;
  getOpenPositions(): Promise<Position[]>;
  getPosition(ticket: number): Promise<Position | null>;

  // Calculations
  calculateMargin(symbol: string, volume: number, price: number, leverage?: number): number;
  calculatePipValue(symbol: string, volume: number): number;
}
```

### PositionManager

```typescript
class PositionManager {
  constructor(executor: OrderExecutor);

  // Tracking
  startTracking(intervalMs?: number): void;
  stopTracking(): void;
  refreshPositions(): Promise<void>;

  // Queries
  getPositions(): Position[];
  getPosition(ticket: number): Position | undefined;
  getPositionsBySymbol(symbol: string): Position[];
  hasPosition(symbol: string): boolean;
  getSummary(): PositionSummary;

  // Operations
  closePosition(ticket: number): Promise<{ success: boolean; error?: string }>;
  closeAll(): Promise<{ success: boolean; closed: number; errors: string[] }>;
  closeAllBySymbol(symbol: string): Promise<{ success: boolean; closed: number; errors: string[] }>;
  setStopLoss(ticket: number, stopLoss: number): Promise<boolean>;
  setTakeProfit(ticket: number, takeProfit: number): Promise<boolean>;
  moveToBreakeven(ticket: number): Promise<boolean>;

  // Analytics
  calculatePnL(): { profit: number; loss: number; net: number };
  calculateStats(): TradeStatistics;
  getHistory(limit?: number): TradeHistory[];
  getHistoryBySymbol(symbol: string, limit?: number): TradeHistory[];
  addToHistory(trade: TradeHistory): void;
}
```

---

## Error Handling

### Connection Errors

```typescript
async function safeConnect() {
  try {
    const success = await connector.connect();
    return success;
  } catch (error) {
    if (error instanceof Error) {
      switch (error.message) {
        case 'Connection failed':
          console.error('Cannot reach MT5 server');
          break;
        case 'Not connected':
          console.error('Connection lost');
          break;
        default:
          console.error('Connection error:', error.message);
      }
    }
    return false;
  }
}
```

### Trade Execution Errors

```typescript
async function safeExecuteOrder(order: OrderRequest) {
  const result = await executor.executeBuy(order);
  
  if (!result.success) {
    console.error('Order failed:', result.error);
    return null;
  }
  
  return result;
}
```

### Error Codes

| Code | Message | Description |
|------|---------|-------------|
| 10009 | TRADE_RETCODE_DEAL | Order executed successfully |
| 10006 | TRADE_RETCODE_REJECT | Request rejected |
| 10007 | TRADE_RETCODE_CANCEL | Request cancelled |
| 10015 | TRADE_RETCODE_INVALID | Invalid request |
| 10016 | TRADE_RETCODE_NO_CONNECTION | No connection |
| 10017 | TRADE_RETCODE_NO_MONEY | Insufficient funds |

---

## Configuration

### trading.yaml

```yaml
execution:
  mt5:
    host: "localhost"
    port: 8888
    reconnectInterval: 5000    # 5 seconds
    maxRetries: 3              # 3 retry attempts
    timeout: 30000             # 30 second timeout
    useDemo: false             # Set true for testing
```

### Environment Variables

```bash
# Alternative to config.yaml
MT5_HOST=192.168.1.100
MT5_PORT=8888
MT5_LOGIN=12345678
MT5_PASSWORD=your_password
MT5_SERVER=MT5Server
MT5_USE_DEMO=true
```

---

## Demo Mode

### Enable Demo Mode

```typescript
// Option 1: In config
execution:
  mt5:
    useDemo: true

// Option 2: Environment
MT5_USE_DEMO=true

// Option 3: Code
const connector = new MT5Connector({ useDemo: true });
```

### Demo Data

```typescript
// Demo account info
{
  login: 12345678,
  name: 'Demo Trader',
  server: 'Demo Server',
  currency: 'USD',
  balance: 10000,
  equity: 10000,
  margin: 0,
  freeMargin: 10000,
  leverage: 100,
}

// Demo symbol prices
const basePrices = {
  EURUSD: 1.0850,
  GBPUSD: 1.2650,
  USDJPY: 149.50,
  USDCHF: 0.8850,
  AUDUSD: 0.6550,
  USDCAD: 1.3650,
};

// Demo trade result
{
  deal: 1000000 + random,
  order: 1000000 + random,
  retcode: 10009,  // Success
  retstring: 'Done'
}
```

---

## Quick Start

### Basic Usage

```typescript
import { MT5Connector, OrderExecutor, PositionManager } from '@forexos/engine';

// 1. Create connector
const connector = new MT5Connector();

// 2. Connect
await connector.connect();

// 3. Create executor
const executor = new OrderExecutor(connector, false);

// 4. Create position manager
const positionManager = new PositionManager(executor);

// 5. Start tracking
positionManager.startTracking(5000);

// 6. Execute order
const result = await executor.executeBuy({
  symbol: 'EURUSD',
  type: 'buy',
  kind: 'market',
  volume: 0.1,
  stopLoss: 1.0800,
  takeProfit: 1.1000,
});

// 7. Clean up
connector.disconnect();
positionManager.stopTracking();
```

---

## Troubleshooting

### Connection Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Connection failed` | Server unreachable | Check host/port |
| `Authentication failed` | Wrong credentials | Verify login/password/server |
| `Request timeout` | Server busy | Retry with backoff |
| `Max reconnect attempts` | Persistent failure | Check network/firewall |

### Trading Issues

| Symptom | Cause | Solution |
|---------|-------|----------|
| `Unknown symbol` | Symbol not in specs | Check symbol name |
| `Volume too small` | Below minimum | Increase volume |
| `Invalid SL/TP` | Wrong side | Check order direction |
| `Insufficient funds` | Margin exceeded | Reduce position size |

---

*Last updated: 2026-06-25*
