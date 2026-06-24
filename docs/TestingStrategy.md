# Testing Strategy - Personal Forex Trading Operating System

## Overview

Comprehensive testing strategy ensuring reliability, correctness, and security for the trading operating system.

## Testing Pyramid

```
                    ┌───────────┐
                    │     E2E   │        ← End-to-End
                   ┌────────────┴┐
                   │ Integration │        ← API & Module Integration
                  ┌──────────────┴─┐
                  │    Unit Tests  │     ← Business Logic
                 ┌──────────────────┴─┐
                 │    Static Analysis │  ← TypeScript types, linting
                └─────────────────────┘
```

## Unit Testing

### Framework: Jest + Vitest

```typescript
// __tests__/unit/risk/positionSizing.test.ts
import { describe, it, expect } from 'vitest';
import { calculatePositionSize, calculateRiskAmount } from '@/lib/risk/positionSizing';

describe('Position Sizing', () => {
  describe('calculatePositionSize', () => {
    it('should calculate correct lot size for given risk', () => {
      const result = calculatePositionSize({
        accountBalance: 10000,
        riskPercent: 1,
        stopLossPips: 50,
        pipValue: 10,
        lotStep: 0.01
      });
      
      expect(result).toBe(0.2); // $50 risk / (50 pips * $10) = 0.1, rounded to 0.01 = 0.1
    });
    
    it('should respect minimum lot size', () => {
      const result = calculatePositionSize({
        accountBalance: 100,
        riskPercent: 1,
        stopLossPips: 100,
        pipValue: 10,
        lotStep: 0.01,
        minLot: 0.01
      });
      
      expect(result).toBe(0.01); // Below calculated value, use minimum
    });
    
    it('should respect maximum lot size', () => {
      const result = calculatePositionSize({
        accountBalance: 100000,
        riskPercent: 5,
        stopLossPips: 10,
        pipValue: 10,
        lotStep: 0.01,
        maxLot: 1.0
      });
      
      expect(result).toBe(1.0); // Exceeds max, cap at max
    });
    
    it('should throw for invalid risk percent', () => {
      expect(() => calculatePositionSize({
        accountBalance: 10000,
        riskPercent: 0,
        stopLossPips: 50,
        pipValue: 10,
        lotStep: 0.01
      })).toThrow('Risk percent must be between 0 and 100');
    });
  });
  
  describe('calculateRiskAmount', () => {
    it('should calculate correct risk amount', () => {
      const result = calculateRiskAmount(10000, 2, 200);
      expect(result).toBe(200);
    });
    
    it('should return 0 for 0 risk percent', () => {
      const result = calculateRiskAmount(10000, 0, 200);
      expect(result).toBe(0);
    });
  });
});
```

### Python Unit Tests

```python
# tests/unit/test_position_sizing.py
import pytest
from robot.risk.position_sizing import (
    calculate_position_size,
    calculate_risk_amount,
    calculate_kelly_fraction
)


class TestPositionSizing:
    def test_calculate_position_size_basic(self):
        """Test basic position size calculation."""
        result = calculate_position_size(
            account_balance=10000,
            risk_percent=1.0,
            stop_loss_pips=50,
            pip_value=10.0
        )
        assert result == pytest.approx(0.2, rel=0.01)
    
    def test_calculate_position_size_respects_min_lot(self):
        """Test that minimum lot size is enforced."""
        result = calculate_position_size(
            account_balance=100,
            risk_percent=1.0,
            stop_loss_pips=200,
            pip_value=10.0,
            min_lot=0.01
        )
        assert result == 0.01
    
    def test_calculate_position_size_respects_max_lot(self):
        """Test that maximum lot size is enforced."""
        result = calculate_position_size(
            account_balance=100000,
            risk_percent=10.0,
            stop_loss_pips=5,
            pip_value=10.0,
            max_lot=1.0
        )
        assert result == 1.0
    
    def test_calculate_position_size_invalid_risk(self):
        """Test error for invalid risk percent."""
        with pytest.raises(ValueError, match="Risk percent must be"):
            calculate_position_size(
                account_balance=10000,
                risk_percent=0,
                stop_loss_pips=50,
                pip_value=10.0
            )
    
    @pytest.mark.parametrize("risk_percent,expected_risk", [
        (1.0, 100.0),
        (2.0, 200.0),
        (0.5, 50.0),
    ])
    def test_calculate_risk_amount(self, risk_percent, expected_risk):
        """Test risk amount calculation with various percentages."""
        result = calculate_risk_amount(10000, risk_percent)
        assert result == expected_risk


class TestKellyCriterion:
    def test_kelly_fraction_calculation(self):
        """Test Kelly fraction calculation."""
        result = calculate_kelly_fraction(
            win_rate=0.6,
            avg_win=100,
            avg_loss=50
        )
        # Kelly = (W*R - L) / R = (0.6*2 - 0.4) / 2 = 0.4
        assert result == pytest.approx(0.4, rel=0.01)
    
    def test_kelly_fraction_negative_for_losing_system(self):
        """Test that negative Kelly is handled."""
        result = calculate_kelly_fraction(
            win_rate=0.3,
            avg_win=100,
            avg_loss=100
        )
        assert result <= 0
```

## Integration Testing

### API Integration Tests

```typescript
// __tests__/integration/api/trading.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestServer } from '@/test/utils';
import { createTestUser, createTestAccount, getAuthToken } from '@/test/factories';

describe('Trading API', () => {
  const server = createTestServer();
  
  beforeAll(async () => {
    await server.start();
  });
  
  afterAll(async () => {
    await server.stop();
  });
  
  describe('POST /api/v1/trading/orders', () => {
    it('should place a market order successfully', async () => {
      const { token } = await getAuthToken();
      const account = await createTestAccount();
      
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/trading/orders',
        headers: {
          Authorization: `Bearer ${token}`
        },
        payload: {
          accountId: account.id,
          symbol: 'EURUSD',
          type: 'buy',
          orderType: 'market',
          volume: 0.1,
          stopLoss: 1.0900,
          takeProfit: 1.1100
        }
      });
      
      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.order).toMatchObject({
        symbol: 'EURUSD',
        type: 'buy',
        orderType: 'market',
        volume: 0.1
      });
    });
    
    it('should reject order with insufficient margin', async () => {
      const { token } = await getAuthToken();
      const account = await createTestAccount({ balance: 100 });
      
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/trading/orders',
        headers: {
          Authorization: `Bearer ${token}`
        },
        payload: {
          accountId: account.id,
          symbol: 'EURUSD',
          type: 'buy',
          orderType: 'market',
          volume: 10 // Too large for balance
        }
      });
      
      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error.code).toBe('INSUFFICIENT_MARGIN');
    });
    
    it('should reject duplicate orders', async () => {
      const { token } = await getAuthToken();
      const account = await createTestAccount();
      const idempotencyKey = `test-${Date.now()}`;
      
      // First request
      await server.inject({
        method: 'POST',
        url: '/api/v1/trading/orders',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        },
        payload: {
          accountId: account.id,
          symbol: 'EURUSD',
          type: 'buy',
          orderType: 'market',
          volume: 0.1
        }
      });
      
      // Duplicate request
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/trading/orders',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Idempotency-Key': idempotencyKey
        },
        payload: {
          accountId: account.id,
          symbol: 'EURUSD',
          type: 'buy',
          orderType: 'market',
          volume: 0.1
        }
      });
      
      expect(response.statusCode).toBe(409);
    });
  });
});
```

### Database Integration Tests

```typescript
// __tests__/integration/db/position.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { db, resetDatabase } from '@/test/db';
import { createTestPosition, createTestAccount } from '@/test/factories';

describe('Position Repository', () => {
  beforeEach(async () => {
    await resetDatabase();
  });
  
  describe('createPosition', () => {
    it('should create position and return with ID', async () => {
      const account = await createTestAccount();
      
      const position = await db.positions.create({
        mt5AccountId: account.id,
        symbol: 'EURUSD',
        type: 'buy',
        volume: 0.1,
        priceOpen: 1.0950,
        priceCurrent: 1.0950
      });
      
      expect(position.id).toBeDefined();
      expect(position.createdAt).toBeInstanceOf(Date);
    });
  });
  
  describe('getOpenPositions', () => {
    it('should return only open positions', async () => {
      const account = await createTestAccount();
      await createTestPosition({ isClosed: false });
      await createTestPosition({ isClosed: true });
      await createTestPosition({ isClosed: false });
      
      const positions = await db.positions.getOpenPositions(account.id);
      
      expect(positions.length).toBe(2);
      expect(positions.every(p => !p.isClosed)).toBe(true);
    });
  });
  
  describe('updatePosition', () => {
    it('should update stop loss and take profit', async () => {
      const position = await createTestPosition();
      
      const updated = await db.positions.update(position.id, {
        stopLoss: 1.0900,
        takeProfit: 1.1100
      });
      
      expect(updated.stopLoss).toBe(1.0900);
      expect(updated.takeProfit).toBe(1.1100);
    });
  });
});
```

## End-to-End Testing

### Playwright E2E Tests

```typescript
// __tests__/e2e/trading.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Trading Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('[type="submit"]');
    await page.waitForURL('/dashboard');
  });
  
  test('should complete full trading flow', async ({ page }) => {
    // Navigate to trading page
    await page.click('text=Trading');
    await page.waitForURL('/trading');
    
    // Select symbol
    await page.click('[data-testid="symbol-selector"]');
    await page.click('text=EURUSD');
    
    // Set order parameters
    await page.fill('[data-testid="volume-input"]', '0.10');
    await page.fill('[data-testid="stop-loss-input"]', '1.0900');
    await page.fill('[data-testid="take-profit-input"]', '1.1100');
    
    // Place order
    await page.click('text=Buy');
    
    // Verify order confirmation
    await expect(page.locator('[data-testid="order-confirmation"]')).toBeVisible();
    await expect(page.locator('[data-testid="order-status"]')).toHaveText('Pending');
    
    // Verify position appears in list
    await page.waitForSelector('[data-testid="position-item"]');
    await expect(page.locator('[data-testid="position-symbol"]')).toHaveText('EURUSD');
    await expect(page.locator('[data-testid="position-volume"]')).toHaveText('0.10');
  });
  
  test('should validate order parameters', async ({ page }) => {
    await page.goto('/trading');
    
    // Try to place order without required fields
    await page.click('text=Buy');
    
    // Verify validation messages
    await expect(page.locator('[data-testid="volume-error"]')).toHaveText('Volume is required');
    await expect(page.locator('[data-testid="symbol-error"]')).toHaveText('Symbol is required');
  });
  
  test('should show risk warning for large position', async ({ page }) => {
    await page.goto('/trading');
    await page.click('[data-testid="symbol-selector"]');
    await page.click('text=EURUSD');
    
    // Enter high risk volume
    await page.fill('[data-testid="volume-input"]', '10.0');
    
    // Verify warning appears
    await expect(page.locator('[data-testid="risk-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="risk-warning"]')).toContainText('exceeds recommended');
  });
});
```

## Test Coverage Requirements

### Minimum Coverage

| Module | Coverage Target |
|--------|----------------|
| Core Trading Logic | 90% |
| Risk Calculations | 95% |
| Position Sizing | 95% |
| Order Validation | 90% |
| API Handlers | 80% |
| React Components | 70% |
| Overall | 80% |

### Coverage Report

```bash
# Generate coverage report
npm run test:coverage

# View report
open coverage/lcov-report/index.html
```

## Mocking Strategy

### MT5 Mocking

```typescript
// __mocks__/mt5.ts
export const mockMT5 = {
  connect: vi.fn().mockResolvedValue({ connected: true }),
  disconnect: vi.fn().mockResolvedValue({ disconnected: true }),
  getAccountInfo: vi.fn().mockResolvedValue({
    login: '12345678',
    balance: 10000,
    equity: 10500,
    margin: 500,
    freeMargin: 10000
  }),
  getSymbols: vi.fn().mockResolvedValue([
    { name: 'EURUSD', bid: 1.0955, ask: 1.0958 },
    { name: 'GBPUSD', bid: 1.2650, ask: 1.2653 }
  ]),
  getCandles: vi.fn().mockResolvedValue([
    { time: Date.now(), open: 1.0950, high: 1.0960, low: 1.0945, close: 1.0955 }
  ]),
  orderSend: vi.fn().mockImplementation((order) => {
    if (order.symbol === 'INVALID') {
      return Promise.reject(new Error('Invalid symbol'));
    }
    return Promise.resolve({
      ticket: Math.floor(Math.random() * 1000000),
      retcode: 0
    });
  }),
  positionClose: vi.fn().mockResolvedValue({ retcode: 0 }),
  positionModify: vi.fn().mockResolvedValue({ retcode: 0 })
};
```

### API Mocking

```typescript
// __tests__/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/v1/market/quotes', () => {
    return HttpResponse.json({
      success: true,
      data: {
        quotes: [
          { symbol: 'EURUSD', bid: 1.0955, ask: 1.0958 }
        ]
      }
    });
  }),
  
  http.post('/api/v1/trading/orders', async ({ request }) => {
    const body = await request.json();
    
    if (body.volume > 100) {
      return HttpResponse.json(
        { success: false, error: { code: 'INSUFFICIENT_MARGIN' } },
        { status: 400 }
      );
    }
    
    return HttpResponse.json({
      success: true,
      data: {
        order: {
          id: 'test-order-id',
          ticket: 12345678,
          ...body
        }
      }
    }, { status: 201 });
  }),
  
  http.get('/api/v1/trading/positions', () => {
    return HttpResponse.json({
      success: true,
      data: {
        positions: [
          {
            id: 'test-position-id',
            symbol: 'EURUSD',
            type: 'buy',
            volume: 0.1,
            profit: 50.00
          }
        ]
      }
    });
  })
];
```

## CI/CD Testing

### GitHub Actions Configuration

```yaml
# .github/workflows/test.yml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:unit -- --coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: true
  
  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: forexos_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:integration -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/forexos_test
          REDIS_URL: redis://localhost:6379
  
  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run build
      - run: npm run start &
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/forexos_test
        wait-on: 'http://localhost:3000'
      - run: npm run test:e2e
        env:
          NEXT_PUBLIC_API_URL: http://localhost:3000/api/v1
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

## Test Data Management

### Factories

```typescript
// test/factories/user.ts
import { faker } from '@faker-js/faker';
import { db } from '@/lib/db';

export async function createTestUser(overrides = {}) {
  const user = {
    id: generateUUID(),
    email: faker.internet.email(),
    passwordHash: await hashPassword('TestPassword123!'),
    name: faker.person.fullName(),
    timezone: 'UTC',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  };
  
  return db.users.create(user);
}

export async function createTestAccount(overrides = {}) {
  const user = await createTestUser();
  const account = {
    id: generateUUID(),
    userId: user.id,
    accountId: faker.string.numeric(8),
    server: 'ICMarkets-Demo',
    login: faker.string.alphanumeric(10),
    isConnected: true,
    balance: overrides.balance ?? 10000,
    equity: overrides.equity ?? 10000,
    margin: 0,
    freeMargin: overrides.balance ?? 10000,
    ...overrides
  };
  
  return db.mt5Accounts.create(account);
}
```

### Fixtures

```typescript
// test/fixtures/sample-candles.ts
export const sampleCandles = {
  EURUSD: [
    { time: new Date('2025-01-01T00:00:00Z'), open: 1.0950, high: 1.0960, low: 1.0945, close: 1.0955, tickVolume: 15000 },
    { time: new Date('2025-01-01T01:00:00Z'), open: 1.0955, high: 1.0970, low: 1.0950, close: 1.0965, tickVolume: 18000 },
    { time: new Date('2025-01-01T02:00:00Z'), open: 1.0965, high: 1.0975, low: 1.0955, close: 1.0958, tickVolume: 20000 },
    { time: new Date('2025-01-01T03:00:00Z'), open: 1.0958, high: 1.0965, low: 1.0940, close: 1.0945, tickVolume: 25000 },
    { time: new Date('2025-01-01T04:00:00Z'), open: 1.0945, high: 1.0955, low: 1.0930, close: 1.0935, tickVolume: 30000 }
  ]
};
```

## Performance Testing

### Load Testing with k6

```javascript
// __tests__/performance/trading.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up
    { duration: '5m', target: 100 },  // Steady state
    { duration: '2m', target: 200 },  // Spike
    { duration: '5m', target: 200 },  // Steady state
    { duration: '2m', target: 0 }    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% under 500ms
    http_req_failed: ['rate<0.01'],    // Error rate under 1%
  }
};

export default function() {
  const token = 'Bearer test-token';
  const headers = {
    'Authorization': token,
    'Content-Type': 'application/json'
  };
  
  // Get positions
  const positions = http.get('https://api.forexos.com/api/v1/trading/positions', { headers });
  check(positions, {
    'positions status 200': (r) => r.status === 200,
    'positions has data': (r) => JSON.parse(r.body).data.positions
  });
  
  sleep(1);
  
  // Place order
  const order = http.post(
    'https://api.forexos.com/api/v1/trading/orders',
    JSON.stringify({
      symbol: 'EURUSD',
      type: 'buy',
      volume: 0.1
    }),
    { headers }
  );
  
  check(order, {
    'order created': (r) => r.status === 201 || r.status === 400
  });
  
  errorRate.add(order.status !== 201);
}
```
