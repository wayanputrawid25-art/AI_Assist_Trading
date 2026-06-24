# Folder Structure - Personal Forex Trading Operating System

## Overview

Project structure following monorepo architecture with clear separation of concerns. Uses Turborepo for build orchestration.

## Root Structure

```
forexos/
├── .github/                    # GitHub configurations
│   ├── workflows/             # GitHub Actions
│   │   ├── ci.yml            # CI pipeline
│   │   ├── deploy.yml        # Deployment
│   │   └── test.yml          # Testing
│   └── ISSUE_TEMPLATE/        # Issue templates
├── apps/
│   ├── web/                  # Next.js frontend
│   └── api/                   # Node.js backend
├── packages/
│   ├── ui/                    # Shared UI components
│   ├── config/                # Shared configs
│   ├── database/              # Database schema & client
│   ├── types/                 # Shared TypeScript types
│   └── utils/                 # Shared utilities
├── robot/                     # Python trading robot
├── docs/                      # Documentation
├── scripts/                   # Build scripts
├── turbo.json                 # Turborepo config
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
├── .gitignore
├── README.md
└── LICENSE
```

## Frontend (apps/web)

```
apps/web/
├── public/                    # Static assets
│   ├── favicon.ico
│   └── images/
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/           # Auth group
│   │   │   ├── login/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   ├── register/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/       # Protected routes
│   │   │   ├── layout.tsx     # Dashboard layout with sidebar
│   │   │   ├── page.tsx      # Dashboard home
│   │   │   ├── trading/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── TradingPanel.tsx
│   │   │   │       ├── OrderBook.tsx
│   │   │   │       └── SymbolSelector.tsx
│   │   │   ├── positions/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── PositionList.tsx
│   │   │   │       └── PositionRow.tsx
│   │   │   ├── analytics/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── EquityCurve.tsx
│   │   │   │       ├── PerformanceMetrics.tsx
│   │   │   │       └── TradeDistribution.tsx
│   │   │   ├── signals/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── SignalList.tsx
│   │   │   │       └── SignalCard.tsx
│   │   │   ├── backtest/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── BacktestRunner.tsx
│   │   │   │       ├── ResultsChart.tsx
│   │   │   │       └── OptimizationPanel.tsx
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx
│   │   │   │   └── components/
│   │   │   │       ├── RiskSettings.tsx
│   │   │   │       ├── AccountSettings.tsx
│   │   │   │       └── NotificationSettings.tsx
│   │   │   └── mt5/
│   │   │       ├── page.tsx
│   │   │       └── components/
│   │   │           ├── AccountList.tsx
│   │   │           └── ConnectAccount.tsx
│   │   ├── api/               # API route handlers
│   │   │   └── [...trpc]/
│   │   │       └── route.ts
│   │   ├── layout.tsx         # Root layout
│   │   ├── page.tsx           # Landing page
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/               # Base UI components (shadcn/ui)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   └── ...
│   │   ├── charts/           # Chart components
│   │   │   ├── candlestick-chart.tsx
│   │   │   ├── equity-curve.tsx
│   │   │   └── pie-chart.tsx
│   │   ├── trading/          # Trading-specific components
│   │   │   ├── price-ticker.tsx
│   │   │   ├── order-form.tsx
│   │   │   ├── position-card.tsx
│   │   │   └── trade-history.tsx
│   │   └── layout/           # Layout components
│   │       ├── sidebar.tsx
│   │       ├── header.tsx
│   │       ├── footer.tsx
│   │       └── mobile-nav.tsx
│   ├── hooks/                # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useTrading.ts
│   │   ├── usePositions.ts
│   │   ├── useMarketData.ts
│   │   ├── useSignals.ts
│   │   └── useWebSocket.ts
│   ├── lib/                  # Utilities
│   │   ├── api-client.ts    # API client
│   │   ├── auth.ts          # Auth utilities
│   │   ├── formatters.ts    # Number/date formatters
│   │   └── validators.ts    # Zod schemas
│   ├── stores/               # State management
│   │   ├── auth-store.ts    # Zustand store
│   │   ├── trading-store.ts
│   │   └── settings-store.ts
│   ├── types/               # TypeScript types
│   │   ├── api.ts
│   │   ├── trading.ts
│   │   └── analytics.ts
│   └── styles/              # Styles
│       └── globals.css
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vitest.config.ts
└── .env.example
```

## Backend (apps/api)

```
apps/api/
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express app setup
│   ├── routes/               # Route definitions
│   │   ├── auth.routes.ts
│   │   ├── trading.routes.ts
│   │   ├── market.routes.ts
│   │   ├── analytics.routes.ts
│   │   ├── risk.routes.ts
│   │   ├── patterns.routes.ts
│   │   └── backtest.routes.ts
│   ├── controllers/          # Request handlers
│   │   ├── auth.controller.ts
│   │   ├── trading.controller.ts
│   │   ├── market.controller.ts
│   │   └── ...
│   ├── services/             # Business logic
│   │   ├── auth.service.ts
│   │   ├── trading.service.ts
│   │   ├── market.service.ts
│   │   ├── risk.service.ts
│   │   ├── pattern.service.ts
│   │   └── analytics.service.ts
│   ├── repositories/         # Data access
│   │   ├── user.repository.ts
│   │   ├── position.repository.ts
│   │   ├── order.repository.ts
│   │   ├── market.repository.ts
│   │   └── ...
│   ├── middleware/           # Express middleware
│   │   ├── auth.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── logging.middleware.ts
│   ├── validators/          # Request validation
│   │   ├── auth.validator.ts
│   │   ├── trading.validator.ts
│   │   └── ...
│   ├── errors/              # Custom error classes
│   │   ├── base.error.ts
│   │   ├── auth.error.ts
│   │   ├── trading.error.ts
│   │   └── validation.error.ts
│   ├── config/              # Configuration
│   │   ├── index.ts
│   │   ├── database.config.ts
│   │   ├── redis.config.ts
│   │   └── mt5.config.ts
│   ├── utils/               # Utilities
│   │   ├── logger.ts
│   │   ├── helpers.ts
│   │   └── constants.ts
│   └── types/               # TypeScript types
│       └── express.d.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── mocks/
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── .env.example
```

## Robot (robot/)

```
robot/
├── pyproject.toml
├── poetry.lock
├── Dockerfile
├── docker-compose.yml
├── src/
│   ├── __init__.py
│   ├── main.py              # Entry point
│   ├── config/
│   │   ├── __init__.py
│   │   ├── settings.py      # Settings management
│   │   │   └── logging.py   # Logging config
│   ├── connectors/
│   │   ├── __init__.py
│   │   ├── mt5_connector.py # MT5 API wrapper
│   │   └── api_connector.py  # Backend API client
│   ├── services/
│   │   ├── __init__.py
│   │   ├── data_service.py   # Market data handling
│   │   ├── order_service.py # Order management
│   │   └── sync_service.py  # Account sync
│   ├── strategies/
│   │   ├── __init__.py
│   │   ├── base_strategy.py  # Strategy base class
│   │   ├── trend_strategy.py
│   │   └── breakout_strategy.py
│   ├── risk/
│   │   ├── __init__.py
│   │   ├── position_sizing.py
│   │   ├── drawdown_monitor.py
│   │   └── margin_manager.py
│   ├── patterns/
│   │   ├── __init__.py
│   │   ├── candlestick.py    # Candlestick patterns
│   │   └── chart.py          # Chart patterns
│   ├── backtest/
│   │   ├── __init__.py
│   │   ├── engine.py         # Backtest engine
│   │   ├── data_loader.py    # Historical data
│   │   └── optimizer.py      # Parameter optimization
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── logger.py
│   │   ├── helpers.py
│   │   └── indicators.py     # Technical indicators
│   └── models/
│       ├── __init__.py
│       ├── position.py
│       ├── order.py
│       └── candle.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── scripts/
│   ├── run_backtest.py
│   └── optimize.py
└── requirements.txt
```

## Shared Packages (packages/)

```
packages/
├── ui/
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   └── ...
│   │   ├── index.ts
│   │   └── styles/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── config/
│   ├── eslint/
│   │   └── base.js
│   ├── typescript/
│   │   └── base.json
│   └── package.json
├── database/
│   ├── src/
│   │   ├── schema/          # Drizzle schema
│   │   │   ├── users.ts
│   │   │   ├── accounts.ts
│   │   │   ├── positions.ts
│   │   │   ├── orders.ts
│   │   │   └── ...
│   │   ├── migrations/       # Database migrations
│   │   ├── index.ts         # DB client
│   │   └── seeders/         # Data seeders
│   ├── package.json
│   ├── drizzle.config.ts
│   └── tsconfig.json
├── types/
│   ├── src/
│   │   ├── api.ts           # API types
│   │   ├── trading.ts       # Trading types
│   │   ├── analytics.ts     # Analytics types
│   │   ├── risk.ts          # Risk types
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
└── utils/
    ├── src/
    │   ├── formatters.ts
    │   ├── validators.ts
    │   ├── calculations.ts
    │   └── index.ts
    ├── package.json
    └── tsconfig.json
```

## Key Directory Purposes

| Directory | Purpose |
|-----------|---------|
| `apps/web/src/app` | Next.js App Router pages |
| `apps/web/src/components` | React components |
| `apps/web/src/hooks` | Custom React hooks |
| `apps/api/src/services` | Business logic layer |
| `apps/api/src/repositories` | Data access layer |
| `apps/api/src/middleware` | Express middleware |
| `robot/src/connectors` | External API clients |
| `robot/src/strategies` | Trading strategies |
| `packages/database/schema` | Database schema |
| `packages/types` | Shared TypeScript types |

## Module Structure (Clean Architecture)

Each module follows consistent structure:

```
module/
├── domain/
│   ├── entities/           # Domain entities
│   ├── value-objects/      # Value objects
│   ├── events/             # Domain events
│   └── interfaces/         # Repository interfaces
├── application/
│   ├── use-cases/         # Application use cases
│   ├── services/          # Application services
│   └── dto/               # Data transfer objects
├── infrastructure/
│   ├── repositories/      # Repository implementations
│   ├── external/         # External service clients
│   └── persistence/      # Database implementations
└── presentation/
    ├── controllers/       # API controllers
    ├── routes/           # Route definitions
    └── middleware/       # Module-specific middleware
```
