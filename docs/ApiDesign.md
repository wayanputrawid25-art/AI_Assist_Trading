# API Design - Personal Forex Trading Operating System

## Overview

RESTful API built with Node.js, TypeScript, and Express. All endpoints follow consistent patterns for request/response, error handling, and authentication.

## Base URL

```
Development: http://localhost:3000/api/v1
Production:  https://api.forexos.com/api/v1
```

## Authentication

### JWT Bearer Token
```
Authorization: Bearer <access_token>
```

### Endpoints

#### POST /auth/register
Register new user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "createdAt": "2025-01-01T00:00:00Z"
    },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900
    }
  }
}
```

#### POST /auth/login
Authenticate user.

**Request:**
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": { "id": "uuid", "email": "...", "name": "..." },
    "tokens": {
      "accessToken": "eyJ...",
      "refreshToken": "eyJ...",
      "expiresIn": 900
    }
  }
}
```

#### POST /auth/refresh
Refresh access token.

**Request:**
```json
{
  "refreshToken": "eyJ..."
}
```

#### POST /auth/logout
Invalidate session.

---

## MT5 Account Management

### Endpoints

#### GET /mt5/accounts
List user's MT5 accounts.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "uuid",
        "accountId": "12345678",
        "accountName": "Main Account",
        "server": "ICMarkets-Demo",
        "isDemo": false,
        "isConnected": true,
        "isPrimary": true,
        "balance": 10000.00,
        "equity": 10500.00,
        "margin": 500.00,
        "freeMargin": 10000.00
      }
    ]
  }
}
```

#### POST /mt5/accounts
Add new MT5 account.

**Request:**
```json
{
  "accountId": "12345678",
  "server": "ICMarkets-Demo",
  "login": "trader123",
  "password": "encrypted_password"
}
```

#### GET /mt5/accounts/:id
Get account details.

#### PUT /mt5/accounts/:id
Update account settings.

#### DELETE /mt5/accounts/:id
Remove account connection.

#### POST /mt5/accounts/:id/connect
Connect to MT5 terminal.

#### POST /mt5/accounts/:id/disconnect
Disconnect from MT5 terminal.

#### GET /mt5/accounts/:id/sync
Force sync with MT5.

---

## Market Data

### Endpoints

#### GET /market/quotes
Get real-time quotes.

**Query Parameters:**
- `symbols`: comma-separated symbols (e.g., "EURUSD,GBPUSD")

**Response (200):**
```json
{
  "success": true,
  "data": {
    "quotes": [
      {
        "symbol": "EURUSD",
        "bid": 1.09550,
        "ask": 1.09553,
        "spread": 0.3,
        "timestamp": "2025-01-01T12:00:00Z"
      }
    ]
  }
}
```

#### GET /market/candles
Get historical candle data.

**Query Parameters:**
- `symbol`: symbol name (required)
- `timeframe`: M1, M5, M15, M30, H1, H4, D1, W1 (required)
- `from`: start timestamp (required)
- `to`: end timestamp (required)
- `limit`: max candles (default: 1000)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "symbol": "EURUSD",
    "timeframe": "H1",
    "candles": [
      {
        "timestamp": "2025-01-01T00:00:00Z",
        "open": 1.09500,
        "high": 1.09600,
        "low": 1.09450,
        "close": 1.09550,
        "tickVolume": 15000,
        "spread": 0.3
      }
    ]
  }
}
```

#### GET /market/symbols
List available symbols.

---

## Trading

### Endpoints

#### GET /trading/orders
List orders.

**Query Parameters:**
- `accountId`: filter by account
- `status`: pending, filled, cancelled, rejected
- `symbol`: filter by symbol
- `from`, `to`: date range
- `page`, `limit`: pagination

**Response (200):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "ticket": 12345678,
        "symbol": "EURUSD",
        "type": "buy",
        "orderType": "market",
        "volume": 0.10,
        "price": 1.09550,
        "stopLoss": 1.09000,
        "takeProfit": 1.10500,
        "status": "filled",
        "filledVolume": 0.10,
        "createdAt": "2025-01-01T12:00:00Z",
        "filledAt": "2025-01-01T12:00:01Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

#### POST /trading/orders
Place new order.

**Request:**
```json
{
  "accountId": "uuid",
  "symbol": "EURUSD",
  "type": "buy",
  "orderType": "market",
  "volume": 0.10,
  "stopLoss": 1.09000,
  "takeProfit": 1.10500,
  "comment": "Strategy entry"
}
```

**Response (201):**
```json
{
  "success": true,
  "data": {
    "order": {
      "id": "uuid",
      "ticket": 12345679,
      "symbol": "EURUSD",
      "type": "buy",
      "orderType": "market",
      "volume": 0.10,
      "price": 1.09550,
      "status": "pending"
    }
  }
}
```

#### GET /trading/orders/:id
Get order details.

#### DELETE /trading/orders/:id
Cancel pending order.

#### GET /trading/positions
List open positions.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "positions": [
      {
        "id": "uuid",
        "ticket": 12345678,
        "symbol": "EURUSD",
        "type": "buy",
        "volume": 0.10,
        "priceOpen": 1.09000,
        "priceCurrent": 1.09550,
        "profit": 55.00,
        "swap": -2.50,
        "stopLoss": 1.08500,
        "takeProfit": 1.10000,
        "openedAt": "2025-01-01T10:00:00Z"
      }
    ],
    "summary": {
      "totalProfit": 550.00,
      "totalSwap": -25.00,
      "positionsCount": 5
    }
  }
}
```

#### PUT /trading/positions/:id
Modify position (SL/TP).

**Request:**
```json
{
  "stopLoss": 1.09200,
  "takeProfit": 1.11000
}
```

#### DELETE /trading/positions/:id
Close position.

**Request:**
```json
{
  "volume": 0.10,
  "comment": "Manual close"
}
```

#### POST /trading/positions/close-all
Close all positions.

---

## Analytics

### Endpoints

#### GET /analytics/performance
Get performance metrics.

**Query Parameters:**
- `accountId`: account UUID
- `from`, `to`: date range

**Response (200):**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalTrades": 100,
      "winningTrades": 60,
      "losingTrades": 40,
      "winRate": 60.0,
      "profitFactor": 1.85,
      "maxDrawdown": 8.5,
      "sharpeRatio": 1.2,
      "totalProfit": 2500.00,
      "avgWin": 83.33,
      "avgLoss": -45.00,
      "avgRiskReward": 1.85
    },
    "byMonth": [
      { "month": "2025-01", "profit": 500, "trades": 20 },
      { "month": "2025-02", "profit": 800, "trades": 25 }
    ],
    "bySymbol": [
      { "symbol": "EURUSD", "profit": 1500, "trades": 50 },
      { "symbol": "GBPUSD", "profit": 1000, "trades": 50 }
    ]
  }
}
```

#### GET /analytics/equity-curve
Get equity curve data.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "points": [
      { "date": "2025-01-01", "equity": 10000 },
      { "date": "2025-01-02", "equity": 10100 },
      { "date": "2025-01-03", "equity": 9950 }
    ]
  }
}
```

#### GET /analytics/drawdown
Get drawdown analysis.

---

## Pattern Detection

### Endpoints

#### GET /patterns/detected
Get detected patterns.

**Query Parameters:**
- `symbol`: filter by symbol
- `timeframe`: M15, H1, H4, D1
- `patternType`: engulfing, hammer, head_shoulders, etc.
- `isValid`: true/false
- `page`, `limit`: pagination

**Response (200):**
```json
{
  "success": true,
  "data": {
    "patterns": [
      {
        "id": "uuid",
        "symbol": "EURUSD",
        "timeframe": "H4",
        "patternType": "bullish_engulfing",
        "direction": "buy",
        "startTime": "2025-01-01T08:00:00Z",
        "endTime": "2025-01-01T12:00:00Z",
        "confidence": 85.5,
        "stopLoss": 1.09000,
        "takeProfit": 1.11000,
        "isValid": true
      }
    ]
  }
}
```

#### GET /patterns/:id
Get pattern details.

#### GET /patterns/history
Get pattern history with outcomes.

**Query Parameters:**
- `symbol`: filter by symbol
- `patternType`: pattern type
- `from`, `to`: date range

---

## Signals

### Endpoints

#### GET /signals/active
Get active trading signals.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "signals": [
      {
        "id": "uuid",
        "symbol": "EURUSD",
        "timeframe": "H1",
        "patternType": "bullish_engulfing",
        "direction": "buy",
        "entryPrice": 1.09550,
        "stopLoss": 1.09000,
        "takeProfit": 1.11000,
        "confidence": 82.0,
        "riskAmount": 55.00,
        "status": "active",
        "expiresAt": "2025-01-01T14:00:00Z"
      }
    ]
  }
}
```

#### POST /signals/:id/execute
Execute signal as trade.

#### PUT /signals/:id/dismiss
Dismiss signal.

---

## Risk Management

### Endpoints

#### GET /risk/settings
Get risk settings.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "settings": {
      "maxRiskPercent": 1.0,
      "maxRiskAmount": 100.00,
      "dailyLossLimit": 5.0,
      "maxDrawdownPercent": 10.0,
      "maxPositions": 5,
      "maxLotPerTrade": 1.0,
      "useKellyCriterion": false,
      "isActive": true
    }
  }
}
```

#### PUT /risk/settings
Update risk settings.

#### GET /risk/calculator
Calculate position size.

**Query Parameters:**
- `accountId`: account UUID
- `symbol`: symbol name
- `entryPrice`: entry price
- `stopLoss`: stop loss price
- `riskPercent`: risk percentage (optional)

**Response (200):**
```json
{
  "success": true,
  "data": {
    "recommendedLot": 0.10,
    "riskAmount": 55.00,
    "riskPercent": 1.0,
    "pipValue": 10.00,
    "stopLossPips": 55,
    "maxLot": 2.00
  }
}
```

#### GET /risk/daily-status
Get daily risk status.

---

## Backtesting

### Endpoints

#### GET /backtests
List backtests.

#### POST /backtests
Create new backtest.

**Request:**
```json
{
  "name": "EURUSD H1 Strategy",
  "strategyType": "trend_following",
  "parameters": {
    "maPeriod": 20,
    "atrPeriod": 14,
    "riskPercent": 1.0
  },
  "symbols": ["EURUSD"],
  "timeframe": "H1",
  "startDate": "2020-01-01",
  "endDate": "2024-12-31",
  "initialBalance": 10000
}
```

#### GET /backtests/:id
Get backtest results.

**Response (200):**
```json
{
  "success": true,
  "data": {
    "backtest": {
      "id": "uuid",
      "name": "EURUSD H1 Strategy",
      "status": "completed",
      "results": {
        "totalTrades": 500,
        "winningTrades": 300,
        "losingTrades": 200,
        "winRate": 60.0,
        "profitFactor": 1.85,
        "maxDrawdown": 8.5,
        "sharpeRatio": 1.2,
        "netProfit": 5000.00,
        "grossProfit": 12000.00,
        "grossLoss": -7000.00
      },
      "equityCurve": [
        { "date": "2020-01-01", "equity": 10000 },
        { "date": "2020-01-02", "equity": 10200 }
      ]
    }
  }
}
```

#### DELETE /backtests/:id
Delete backtest.

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      { "field": "email", "message": "Invalid email format" }
    ]
  }
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| VALIDATION_ERROR | 400 | Request validation failed |
| UNAUTHORIZED | 401 | Invalid or expired token |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| CONFLICT | 409 | Resource conflict |
| RATE_LIMITED | 429 | Too many requests |
| MT5_ERROR | 500 | MT5 connection/execution error |
| INTERNAL_ERROR | 500 | Internal server error |

---

## Rate Limiting

| Endpoint | Limit |
|----------|-------|
| `/auth/*` | 10/minute |
| `/trading/*` | 60/minute |
| `/market/*` | 120/minute |
| `/analytics/*` | 30/minute |
| `/risk/*` | 30/minute |

---

## WebSocket API

### Connection
```
wss://api.forexos.com/ws?token=<access_token>
```

### Subscribe to Channels
```json
{
  "action": "subscribe",
  "channel": "quotes",
  "params": { "symbols": ["EURUSD", "GBPUSD"] }
}
```

### Channels
- `quotes`: Real-time price updates
- `positions`: Position updates
- `orders`: Order updates
- `signals`: New signal alerts
