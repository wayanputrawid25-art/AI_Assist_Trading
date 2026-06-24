# Trading Engine - Personal Forex Trading Operating System

## Overview

The Trading Engine handles all order execution, position management, and trade lifecycle management. It interfaces with MT5 through the Python Robot module.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Trading Engine                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │    Order     │   │  Position    │   │   Account    │   │
│  │   Manager    │──▶│   Manager    │──▶│   Manager    │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│         │                  │                  │          │
│         ▼                  ▼                  ▼          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                  Risk Validator                       │ │
│  │  • Position sizing                                    │ │
│  │  • Drawdown check                                     │ │
│  │  • Margin check                                      │ │
│  │  • Daily loss limit                                  │ │
│  └──────────────────────────────────────────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                  MT5 Gateway                          │ │
│  │  • Order routing                                      │ │
│  │  • Quote management                                   │ │
│  │  • Connection handling                               │ │
│  └──────────────────────────────────────────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                  Python Robot                         │ │
│  │  • MetaTrader5 API                                   │ │
│  │  • Real-time execution                               │ │
│  │  • Price streaming                                   │ │
│  └──────────────────────────────────────────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                     MT5                               │ │
│  │  • Order execution                                    │ │
│  │  • Position storage                                  │ │
│  │  • Account state                                    │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Order Manager

**Responsibilities:**
- Create, modify, cancel orders
- Track order lifecycle
- Handle order rejections
- Maintain order history

**Order Types:**
```typescript
enum OrderType {
  MARKET = 'market',
  LIMIT = 'limit',
  STOP = 'stop',
  STOP_LIMIT = 'stop_limit'
}

enum OrderSide {
  BUY = 'buy',
  SELL = 'sell'
}

enum OrderStatus {
  PENDING = 'pending',
  FILLED = 'filled',
  PARTIALLY_FILLED = 'partially_filled',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected'
}
```

**Order Flow:**
```
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────┐
│  Client │────▶│  Validate   │────▶│  Risk Check │────▶│   MT5   │
│ Request │     │   Order     │     │             │     │  Send   │
└─────────┘     └─────────────┘     └─────────────┘     └─────────┘
                                                               │
                                                               ▼
┌─────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Store  │◀────│   Update    │◀────│  Handle     │◀────│   Confirm   │
│  Order  │     │   Status    │     │  Response   │     │  / Fill     │
└─────────┘     └─────────────┘     └─────────────┘     └─────────────┘
```

### 2. Position Manager

**Responsibilities:**
- Track open positions
- Calculate P&L
- Handle partial closes
- Aggregate position data

**Position State Machine:**
```
┌────────────┐    Execute     ┌─────────────┐    Close     ┌───────────┐
│   OPEN     │──────────────▶│  MODIFIABLE │─────────────▶│  CLOSED   │
└────────────┘               └─────────────┘              └───────────┘
      │                            │                            │
      │                            │ Modify SL/TP               │ Archive
      ▼                            ▼                            ▼
┌────────────┐               ┌─────────────┐              ┌───────────┐
│  TRIGGERED │               │  FLAGGED    │              │  HISTORY  │
│  (SL/TP)   │               │  (Warning)  │              └───────────┘
└────────────┘               └─────────────┘
```

### 3. Account Manager

**Responsibilities:**
- Sync account state with MT5
- Track balance, equity, margin
- Calculate free margin
- Monitor margin level

**Account Metrics:**
```typescript
interface AccountMetrics {
  balance: number;           // Account balance
  equity: number;           // Current equity
  margin: number;           // Used margin
  freeMargin: number;        // Available margin
  marginLevel: number;       // Equity / Margin * 100
  unrealizedPnL: number;     // Open positions P&L
  realizedPnL: number;      // Closed trades P&L
  dailyPnL: number;         // Today's P&L
}
```

### 4. Risk Validator

**Responsibilities:**
- Validate all trades against risk rules
- Calculate position sizes
- Check margin requirements
- Enforce daily limits

**Validation Rules:**
```typescript
interface RiskValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  positionSize: number;
  riskAmount: number;
  riskPercent: number;
}
```

**Validation Checklist:**
- [ ] Position within max lot per trade
- [ ] Total positions within limit
- [ ] Daily loss not exceeded
- [ ] Max drawdown not exceeded
- [ ] Sufficient margin available
- [ ] Risk percent within limit
- [ ] Risk/Reward meets minimum

### 5. MT5 Gateway

**Responsibilities:**
- Abstract MT5 API differences
- Handle connection/reconnection
- Manage quote caching
- Queue commands during disconnection

**Connection States:**
```typescript
enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  SYNCING = 'syncing',
  ERROR = 'error'
}
```

## Order Execution Flow

### Market Order Execution

```
1. Client sends order request
   {
     "symbol": "EURUSD",
     "type": "buy",
     "volume": 0.10,
     "sl": 1.09000,
     "tp": 1.10500
   }

2. Validate order parameters
   - Symbol valid
   - Volume within limits
   - Price within market hours

3. Risk validation
   - Calculate required margin
   - Check free margin
   - Calculate risk amount
   - Validate against risk settings

4. Get current quote
   - Fetch bid/ask from MT5
   - Apply spread markup if configured

5. Send order to MT5
   - Format order request
   - Send via Python Robot
   - Include SL/TP

6. Handle response
   - Success: Update order status
   - Failure: Log reason, notify client

7. Update positions
   - Create position record
   - Update account metrics
   - Broadcast via WebSocket
```

### Limit/Stop Order Execution

```
1. Client sends pending order
   {
     "symbol": "EURUSD",
     "type": "sell_limit",
     "price": 1.10000,
     "volume": 0.10,
     "sl": 1.10500,
     "tp": 1.08000
   }

2. Validate order
   - Price meets distance requirements
   - Volume within limits

3. Risk pre-validation
   - Calculate simulated margin
   - Check future exposure

4. Store pending order
   - Mark status as pending
   - Set expiration if provided

5. Monitor for execution
   - Robot watches price feed
   - Trigger when price reached
   - Execute as market order

6. Handle execution
   - Fill pending order
   - Create position
   - Update metrics
```

## Position Modification

### Stop Loss / Take Profit Update

```typescript
async function modifyPosition(
  positionId: string,
  newSL?: number,
  newTP?: number
): Promise<Position> {
  // 1. Validate new values
  validatePriceDistance(position.symbol, newSL, newTP);
  
  // 2. Send to MT5
  await mt5.PositionModify(position.ticket, newSL, newTP);
  
  // 3. Update local record
  position.stopLoss = newSL;
  position.takeProfit = newTP;
  position.updatedAt = new Date();
  
  // 4. Broadcast update
  await broadcast('position:updated', position);
  
  return position;
}
```

## Position Closing

### Full Close

```typescript
async function closePosition(positionId: string): Promise<Trade> {
  const position = await getPosition(positionId);
  
  // 1. Send close request
  await mt5.PositionClose(position.ticket);
  
  // 2. Create trade history
  const trade = await createTradeHistory(position);
  
  // 3. Update position
  position.isClosed = true;
  position.closedAt = new Date();
  
  // 4. Update metrics
  await recalculateAccountMetrics();
  
  // 5. Broadcast
  await broadcast('position:closed', trade);
  
  return trade;
}
```

### Partial Close

```typescript
async function partialClose(
  positionId: string,
  volume: number
): Promise<Trade> {
  const position = await getPosition(positionId);
  
  // 1. Validate volume
  if (volume >= position.volume) {
    throw new Error('Use full close for complete exit');
  }
  
  // 2. Send partial close
  await mt5.PositionClosePartial(position.ticket, volume);
  
  // 3. Update position
  position.volume -= volume;
  
  // 4. Create partial trade
  const trade = await createTradeHistory({
    ...position,
    volume,
    type: position.type
  });
  
  return trade;
}
```

## Margin Calculation

```typescript
function calculateMargin(
  symbol: string,
  volume: number,
  price: number
): number {
  const contractSize = getContractSize(symbol);
  const marginRate = getMarginRate(symbol);
  
  // Margin = (Volume * Contract Size * Price) / Margin Rate
  const margin = (volume * contractSize * price) / marginRate;
  
  return Math.round(margin * 100) / 100;
}

function calculateFreeMargin(
  balance: number,
  equity: number,
  margin: number
): number {
  return equity - margin;
}

function calculateMarginLevel(
  equity: number,
  margin: number
): number {
  if (margin === 0) return 0;
  return (equity / margin) * 100;
}
```

## P&L Calculation

```typescript
function calculatePositionPnL(position: Position): number {
  const tickValue = getTickValue(position.symbol);
  const tickSize = getTickSize(position.symbol);
  const points = (position.priceCurrent - position.priceOpen) / tickSize;
  
  let profit = 0;
  
  if (position.type === 'buy') {
    profit = points * tickValue * position.volume;
  } else {
    profit = -points * tickValue * position.volume;
  }
  
  return Math.round(profit * 100) / 100;
}

function calculateDailyPnL(
  closedTrades: Trade[],
  openPositions: Position[]
): number {
  const realizedPnL = closedTrades
    .filter(t => isToday(t.closedAt))
    .reduce((sum, t) => sum + t.profit, 0);
  
  const unrealizedPnL = openPositions
    .reduce((sum, p) => sum + calculatePositionPnL(p), 0);
  
  return realizedPnL + unrealizedPnL;
}
```

## Error Handling

### MT5 Connection Errors

```typescript
class MT5ConnectionError extends Error {
  constructor(
    message: string,
    public code: string,
    public retryable: boolean
  ) {
    super(message);
  }
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      if (!isRetryable(error)) {
        throw error;
      }
      
      await delay(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
  
  throw lastError;
}
```

### Order Rejection Handling

```typescript
const REJECTION_HANDLERS: Record<string, (order: Order, reason: string) => void> = {
  'NO_CONNECTION': handleNoConnection,
  'INSUFFICIENT_MARGIN': handleInsufficientMargin,
  'INVALID_VOLUME': handleInvalidVolume,
  'MARKET_CLOSED': handleMarketClosed,
  'INVALID_PRICE': handleInvalidPrice,
  'DUPLICATE_ORDER': handleDuplicateOrder
};
```

## Events

```typescript
// Trading Engine Events
enum TradingEvent {
  ORDER_PLACED = 'order:placed',
  ORDER_FILLED = 'order:filled',
  ORDER_CANCELLED = 'order:cancelled',
  ORDER_REJECTED = 'order:rejected',
  POSITION_OPENED = 'position:opened',
  POSITION_MODIFIED = 'position:modified',
  POSITION_CLOSED = 'position:closed',
  ACCOUNT_UPDATED = 'account:updated',
  CONNECTION_STATE_CHANGED = 'connection:state_changed',
  RISK_WARNING = 'risk:warning',
  MARGIN_CALL = 'margin:call'
}
```

## Performance Requirements

| Metric | Target |
|--------|--------|
| Order execution time | < 500ms |
| Position update latency | < 100ms |
| Quote latency | < 50ms |
| Concurrent positions | 50+ |
| Orders per second | 10+ |
| Uptime | 99.9% |
