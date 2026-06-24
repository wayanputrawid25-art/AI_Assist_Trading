# Coding Standards - Personal Forex Trading Operating System

## Overview

Coding standards ensure consistency, readability, and maintainability across the codebase. All contributors must follow these standards.

## TypeScript/JavaScript

### Naming Conventions

```typescript
// Classes: PascalCase
class TradingEngine {}
class PositionManager {}

// Interfaces: PascalCase with 'I' prefix (optional, but consistent)
interface OrderConfig {}
interface ITradingStrategy {}

// Types: PascalCase
type OrderStatus = 'pending' | 'filled' | 'cancelled';
type RiskLevel = 'low' | 'medium' | 'high';

// Variables and functions: camelCase
const accountBalance = 10000;
function calculatePositionSize() {}

// Constants: SCREAMING_SNAKE_CASE
const MAX_POSITIONS = 10;
const DEFAULT_RISK_PERCENT = 1.0;

// Enums: PascalCase, members: PascalCase
enum OrderType {
  Market = 'market',
  Limit = 'limit',
  Stop = 'stop'
}

// Private properties: prefix with _
class TradingService {
  private _mt5Client: MT5Client;
  private _positionCache: Map<string, Position>;
}

// Files: kebab-case
// trading-engine.ts, position-manager.ts, risk-calculator.ts
```

### TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "jsx": "preserve",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "exactOptionalPropertyTypes": true,
    "noPropertyAccessFromIndexSignature": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Best Practices

```typescript
// ✅ Use explicit types, avoid 'any'
function calculateRisk(amount: number, percent: number): number {
  return amount * (percent / 100);
}

// ❌ Avoid 'any'
function calculateRisk(amount: any, percent: any): any {
  return amount * (percent / 100);
}

// ✅ Use readonly for immutable data
interface Position {
  readonly id: string;
  readonly symbol: string;
  readonly type: OrderType;
  volume: number;
}

// ✅ Use discriminated unions
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error };

// ✅ Nullish coalescing and optional chaining
const balance = account?.balance ?? 0;
const userName = user?.profile?.name;

// ✅ Template literals for strings
const message = `Order ${order.id} ${status} at ${price}`;

// ✅ Async/await over .then()
async function fetchPosition(id: string): Promise<Position> {
  const response = await api.get(`/positions/${id}`);
  return response.data;
}

// ✅ Early returns to reduce nesting
function validateOrder(order: Order): ValidationResult {
  if (!order.symbol) {
    return { valid: false, error: 'Symbol required' };
  }
  
  if (order.volume <= 0) {
    return { valid: false, error: 'Invalid volume' };
  }
  
  return { valid: true };
}
```

## Python (Robot)

### PEP 8 + Type Hints

```python
# ✅ Use type hints
def calculate_position_size(
    account_balance: float,
    risk_percent: float,
    stop_loss_pips: float,
    pip_value: float
) -> float:
    """Calculate optimal position size based on risk parameters.
    
    Args:
        account_balance: Current account balance
        risk_percent: Risk percentage (0-100)
        stop_loss_pips: Stop loss distance in pips
        pip_value: Value per pip per lot
        
    Returns:
        Calculated lot size
    """
    risk_amount = account_balance * (risk_percent / 100)
    lot_size = risk_amount / (stop_loss_pips * pip_value)
    return round(lot_size, 2)

# ❌ Avoid 'any' type equivalent
def calculate_position_size(account_balance, risk_percent, stop_loss_pips, pip_value):
    risk_amount = account_balance * (risk_percent / 100)
    return risk_amount / (stop_loss_pips * pip_value)
```

### Naming Conventions

```python
# Classes: PascalCase
class MT5Connector:
class RiskCalculator:

# Functions and variables: snake_case
def calculate_position_size():
account_balance = 10000

# Constants: SCREAMING_SNAKE_CASE
MAX_POSITIONS = 10
DEFAULT_RISK_PERCENT = 1.0

# Private: prefix with _
class PositionManager:
    def _update_cache(self):
        pass
```

### Project Structure

```python
# robot/
# ├── __init__.py
# ├── main.py                 # Entry point
# ├── config/
# │   ├── __init__.py
# │   └── settings.py         # Configuration
# ├── connectors/
# │   ├── __init__.py
# │   └── mt5_connector.py    # MT5 API
# ├── strategies/
# │   ├── __init__.py
# │   └── base_strategy.py
# ├── risk/
# │   ├── __init__.py
# │   └── risk_manager.py
# └── utils/
#     ├── __init__.py
#     └── helpers.py
```

## React/Next.js

### Component Structure

```tsx
// components/TradingPanel.tsx

// 1. Imports
import { useState, useCallback } from 'react';
import { useTrading } from '@/hooks/useTrading';
import { formatCurrency } from '@/utils/format';
import { Button } from '@/components/ui/Button';
import type { Order } from '@/types';

// 2. Types (if not exported)
interface TradingPanelProps {
  symbol: string;
  onOrderSubmit: (order: Order) => void;
}

// 3. Component
export function TradingPanel({ symbol, onOrderSubmit }: TradingPanelProps) {
  // State
  const [volume, setVolume] = useState(0.01);
  const [stopLoss, setStopLoss] = useState<number | null>(null);
  
  // Hooks
  const { positions, placeOrder, isLoading } = useTrading();
  
  // Callbacks
  const handleSubmit = useCallback(() => {
    const order: Order = {
      symbol,
      volume,
      stopLoss,
      type: 'buy'
    };
    onOrderSubmit(order);
  }, [symbol, volume, stopLoss, onOrderSubmit]);
  
  // Render
  return (
    <div className="trading-panel">
      <VolumeSelector value={volume} onChange={setVolume} />
      <StopLossInput value={stopLoss} onChange={setStopLoss} />
      <Button onClick={handleSubmit} loading={isLoading}>
        Buy {symbol}
      </Button>
    </div>
  );
}

// 4. Sub-components (if small)
function VolumeSelector() { /* ... */ }
function StopLossInput() { /* ... */ }
```

### Hooks

```tsx
// hooks/usePosition.ts
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Position } from '@/types';

export function usePosition(positionId: string) {
  const [position, setPosition] = useState<Position | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    async function fetchPosition() {
      try {
        setIsLoading(true);
        const data = await api.getPosition(positionId);
        if (mounted) {
          setPosition(data);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }
    
    fetchPosition();
    
    return () => {
      mounted = false;
    };
  }, [positionId]);
  
  const closePosition = useCallback(async () => {
    await api.closePosition(positionId);
    setPosition(null);
  }, [positionId]);
  
  return { position, isLoading, error, closePosition };
}
```

## Code Formatting

### ESLint Configuration

```json
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/consistent-type-imports": "error",
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "prefer-const": "error",
    "eqeqeq": "error"
  }
}
```

### Prettier Configuration

```json
// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

### Python Black

```toml
# pyproject.toml
[tool.black]
line-length = 100
target-version = ['py311']
include = '\.pyi?$'
exclude = '''
/(
    \.git
  | \.venv
  | __pycache__
)/
'''
```

### Python Ruff

```toml
# pyproject.toml
[tool.ruff]
line-length = 100
select = [
  "E",   # pycodestyle errors
  "W",   # pycodestyle warnings
  "F",   # pyflakes
  "I",   # isort
  "B",   # flake8-bugbear
  "C4",  # flake8-comprehensions
  "UP",  # pyupgrade
]
ignore = ["E501"]
```

## Git Commit Conventions

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|------|-------------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation changes |
| style | Formatting, no code change |
| refactor | Code refactoring |
| test | Adding tests |
| chore | Maintenance tasks |
| perf | Performance improvement |
| ci | CI/CD changes |

### Examples

```bash
# Feature
git commit -m "feat(trading): add position sizing calculator"

# Bug fix
git commit -m "fix(risk): prevent negative lot size on edge case"

# Documentation
git commit -m "docs(api): update order endpoint documentation"

# Refactoring
git commit -m "refactor(auth): extract token validation to service"

# Breaking change
git commit -m "feat(api)!: change order response format

BREAKING CHANGE: order response now includes position_id"
```

## Documentation

### Functions

```typescript
/**
 * Calculate position size based on risk parameters.
 * 
 * Uses fixed percentage risk method to determine optimal lot size
 * that limits potential loss to specified percentage of account.
 * 
 * @param accountBalance - Current account balance
 * @param riskPercent - Risk percentage (0-100)
 * @param stopLossPips - Stop loss distance in pips
 * @param pipValue - Value per pip per standard lot
 * @returns Calculated lot size rounded to broker's lot step
 * 
 * @example
 * const lotSize = calculatePositionSize(10000, 1, 50, 10);
 * // Returns: 0.2 (risk $50 = 1% of $10000 on 50 pip SL)
 * 
 * @throws {Error} If riskPercent <= 0 or > 100
 * @throws {Error} If stopLossPips <= 0
 */
function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  stopLossPips: number,
  pipValue: number
): number {
  if (riskPercent <= 0 || riskPercent > 100) {
    throw new Error('Risk percent must be between 0 and 100');
  }
  
  const riskAmount = accountBalance * (riskPercent / 100);
  const lotSize = riskAmount / (stopLossPips * pipValue);
  
  return roundToStep(lotSize, 0.01);
}
```

### Classes

```typescript
/**
 * Manages trading positions and tracks P&L.
 * 
 * Responsible for:
 * - Tracking open positions
 * - Calculating unrealized P&L
 * - Managing position modifications
 * - Handling position closures
 * 
 * @example
 * const manager = new PositionManager(account);
 * await manager.openPosition({ symbol: 'EURUSD', volume: 0.1 });
 * const positions = manager.getOpenPositions();
 */
class PositionManager {
  private positions: Map<string, Position> = new Map();
  
  /**
   * Open a new trading position.
   * 
   * @param params - Position parameters
   * @param params.symbol - Trading symbol
   * @param params.volume - Position volume
   * @param params.type - Position type (buy/sell)
   * @param params.stopLoss - Optional stop loss price
   * @param params.takeProfit - Optional take profit price
   * 
   * @returns Created position
   * 
   * @throws {InsufficientMarginError} If margin is insufficient
   * @throws {InvalidSymbolError} If symbol is not tradeable
   */
  async openPosition(params: OpenPositionParams): Promise<Position> {
    // Implementation
  }
}
```

## File Organization

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Protected routes
│   │   ├── layout.tsx
│   │   ├── trading/
│   │   ├── analytics/
│   │   └── settings/
│   ├── api/                      # API routes
│   │   ├── auth/
│   │   ├── trading/
│   │   └── analytics/
│   ├── layout.tsx
│   └── page.tsx
├── components/                   # Shared components
│   ├── ui/                      # Base UI components
│   ├── trading/                 # Trading components
│   └── analytics/               # Analytics components
├── lib/                         # Utilities
│   ├── api.ts
│   ├── db.ts
│   └── utils.ts
├── hooks/                       # React hooks
├── types/                       # TypeScript types
└── styles/                      # Global styles
```
