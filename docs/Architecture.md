# Personal Forex Trading Operating System - Architecture

## Overview

A comprehensive, modular trading system that combines advanced analytics, automated trading, and risk management capabilities. The system is built with a focus on transparency, security, and extensibility.

## Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| Backend | Node.js + TypeScript | API, business logic, data processing |
| Frontend | Next.js | User interface, dashboards, analytics |
| Database | Neon PostgreSQL | Data storage, persistence |
| Robot | Python | MT5 integration, algorithmic trading |
| Deployment | Vercel | Hosting, CI/CD |
| MT5 | MetaTrader 5 | Trading execution platform |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js)                        │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │  Dashboard  │ │  Analytics  │ │   Trading   │ │  Settings  │ │
│  │    Page     │ │    Page     │ │    Panel    │ │    Page    │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js + TS)                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                      API Layer                               │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │  Auth   │ │ Trading │ │Analytics│ │  Risk   │          │ │
│  │  │ Module  │ │ Module  │ │ Module  │ │ Module  │          │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Domain Layer                              │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │  User   │ │ Account │ │  Order  │ │ Position│          │ │
│  │  │ Domain  │ │ Domain  │ │ Domain  │ │ Domain  │          │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Infrastructure Layer                        │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │ │
│  │  │  Database   │ │    Redis    │ │   MT5 API   │            │ │
│  │  │  (Neon)     │ │  (Cache)    │ │   Client    │            │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ROBOT (Python)                                │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   MT5 Integration                           │ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │  Data   │ │  Order  │ │ Position│ │ Account │          │ │
│  │  │ Fetcher │ │ Executor│ │ Manager │ │ Manager │          │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                 Trading Algorithms                           │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │ │
│  │  │   Pattern   │ │    Risk     │ │    Money    │            │ │
│  │  │  Detection  │ │ Management │ │ Management  │            │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  Backtest Engine                             │ │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │ │
│  │  │    Data     │ │   Strategy  │ │   Results   │            │ │
│  │  │  Generator  │ │   Runner    │ │   Analyzer  │            │ │
│  │  └─────────────┘ └─────────────┘ └─────────────┘            │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    MT5 (MetaTrader 5)                           │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐          │ │
│  │  │ Market  │ │   Order │ │ Position│ │  Account│          │ │
│  │  │  Data   │ │ Execution│ │ Manager │ │ Manager │          │ │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Principles

### 1. Clean Architecture

```
┌────────────────────────────────────────┐
│           Presentation Layer          │
│  (API Routes, Controllers, DTOs)      │
├────────────────────────────────────────┤
│           Application Layer           │
│  (Use Cases, Services, Commands)      │
├────────────────────────────────────────┤
│             Domain Layer              │
│  (Entities, Value Objects, Interfaces)│
├────────────────────────────────────────┤
│         Infrastructure Layer          │
│  (DB, External APIs, MT5 Client)      │
└────────────────────────────────────────┘
```

### 2. Domain Driven Design (DDD)

- **Bounded Contexts**: Trading, Analytics, Risk Management, User Management
- **Aggregates**: Order, Position, Account, Strategy
- **Value Objects**: Money, Price, Volume, Timeframe
- **Domain Events**: OrderPlaced, PositionOpened, TradeClosed

### 3. Modular Architecture

```
src/
├── modules/
│   ├── trading/           # Trading domain
│   │   ├── domain/
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── api/
│   ├── analytics/         # Analytics domain
│   ├── risk/              # Risk management domain
│   └── user/              # User management domain
├── shared/                # Shared kernel
└── core/                  # Core utilities
```

## Communication Patterns

### 1. REST API (Backend ↔ Frontend)
- JSON over HTTPS
- JWT authentication
- OpenAPI specification

### 2. WebSocket (Real-time Updates)
- Market data streaming
- Order status updates
- Position monitoring

### 3. Message Queue (Backend ↔ Robot)
- RabbitMQ or Redis Pub/Sub
- Order execution commands
- Trade synchronization events

## Data Flow

### Trading Flow
```
User Request → API Gateway → Auth Middleware → Trading Service
    → Domain Validation → MT5 Client → Order Executor
    → Response → WebSocket Notification
```

### Analytics Flow
```
Market Data → Data Fetcher → Storage → Analytics Engine
    → Pattern Detection → Risk Calculator → Signals
    → Dashboard Update
```

## Security Architecture

See [Security.md](./Security.md) for detailed security measures.

## Scalability Considerations

1. **Horizontal Scaling**: Stateless backend with Redis session storage
2. **Database**: Neon PostgreSQL with connection pooling
3. **Caching**: Redis for frequently accessed data
4. **CDN**: Vercel Edge Network for frontend assets
5. **WebSocket**: Scalable WebSocket servers with Redis adapter

## Deployment Architecture

```
┌─────────────────────────────────────────────────┐
│                  Vercel Edge                    │
│  ┌─────────────┐ ┌─────────────┐               │
│  │  Next.js    │ │   API       │               │
│  │  Frontend   │ │  Functions  │               │
│  └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│              Neon PostgreSQL                    │
│           (Serverless Database)                 │
└─────────────────────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────┐
│           Self-Hosted Robot Server              │
│  ┌─────────────┐ ┌─────────────┐               │
│  │   Python    │ │    MT5      │               │
│  │   Robot     │ │  Terminal   │               │
│  └─────────────┘ └─────────────┘               │
└─────────────────────────────────────────────────┘
```

## Key Design Decisions

### 1. Why Node.js + TypeScript for Backend?
- Strong typing for financial calculations
- Excellent async support for real-time data
- Rich ecosystem for trading APIs

### 2. Why Python for Robot?
- Superior numerical computing (pandas, numpy)
- Excellent MT5 library support (mt5api, MetaTrader5)
- Easy integration with ML/AI libraries

### 3. Why Neon PostgreSQL?
- Serverless, pay-per-use model
- Branching for development
- Built-in connection pooling
- Free tier available

### 4. Why Vercel?
- Optimized for Next.js
- Edge functions for low latency
- Built-in CI/CD
- Free tier available

## Future Considerations

1. **Multi-broker support**: Abstract MT5 interface for other brokers
2. **Mobile app**: React Native wrapper for mobile trading
3. **ML integration**: TensorFlow for advanced pattern recognition
4. **Social trading**: Copy trading functionality
5. **Multi-language support**: i18n for global users
