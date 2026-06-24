# Backtest Engine - Personal Forex Trading Operating System

## Overview

The Backtest Engine provides historical simulation of trading strategies, enabling traders to validate their approaches before risking real capital. It processes historical market data and simulates trade execution with realistic conditions.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Backtest Engine                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │    Data      │   │   Strategy   │   │   Results     │   │
│  │  Generator   │──▶│    Runner     │──▶│   Analyzer    │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│         │                  │                  │              │
│         ▼                  ▼                  ▼              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    Core Engine                          │ │
│  │  • Price replay                                         │ │
│  │  • Order simulation                                     │ │
│  │  • Commission/swap                                       │ │
│  │  • Margin calculation                                   │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Data Generator

**Responsibilities:**
- Load historical data from database
- Generate synthetic ticks from candles
- Manage data caching
- Handle multiple timeframes

```typescript
interface DataConfig {
  symbols: string[];
  timeframes: Timeframe[];
  startDate: Date;
  endDate: Date;
  dataSource: 'mt5' | 'imported';
}

interface TickData {
  symbol: string;
  timestamp: Date;
  bid: number;
  ask: number;
  volume: number;
}
```

### 2. Strategy Runner

**Responsibilities:**
- Execute strategy logic on historical data
- Generate trading signals
- Manage simulated orders
- Track position states

```typescript
interface StrategyConfig {
  name: string;
  type: StrategyType;
  parameters: Record<string, number | string | boolean>;
  riskSettings: RiskSettings;
  moneyManagement: MoneyManagementConfig;
}

interface BacktestResult {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  metrics: PerformanceMetrics;
  equityCurve: EquityPoint[];
  trades: TradeResult[];
  errors: string[];
}
```

### 3. Results Analyzer

**Responsibilities:**
- Calculate performance metrics
- Generate equity curves
- Analyze trade distribution
- Export reports

## Execution Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Setup     │────▶│    Load     │────▶│    Run       │────▶│   Report    │
│   Config    │     │    Data     │     │   Strategy   │     │   Results   │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                                           │
                                           ▼
                                    ┌─────────────┐
                                    │   Iterate   │
                                    │   Candles   │
                                    └─────────────┘
                                           │
                    ┌──────────────────────┼──────────────────────┐
                    ▼                      ▼                      ▼
             ┌─────────────┐         ┌─────────────┐         ┌─────────────┐
             │   Strategy  │         │   Check     │         │   Update    │
             │   Signals    │         │   Orders    │         │   Metrics   │
             └─────────────┘         └─────────────┘         └─────────────┘
```

## Order Simulation

### Market Order Simulation

```typescript
async function simulateMarketOrder(
  signal: Signal,
  currentPrice: Price,
  spread: number
): Promise<SimulatedOrder> {
  // Apply realistic spread
  const executionPrice = signal.direction === 'buy'
    ? currentPrice.ask + spread
    : currentPrice.bid - spread;
  
  // Apply slippage based on volume
  const slippage = calculateSlippage(signal.volume, currentPrice);
  const finalPrice = signal.direction === 'buy'
    ? executionPrice + slippage
    : executionPrice - slippage;
  
  return {
    id: generateId(),
    signal,
    price: finalPrice,
    spread,
    slippage,
    executedAt: currentPrice.timestamp
  };
}

function calculateSlippage(volume: number, price: Price): number {
  // Simulate slippage based on volume and volatility
  const volatility = calculateHistoricalVolatility(price);
  const volumeFactor = Math.log10(volume + 1) * 0.0001;
  const volatilityFactor = volatility * 0.1;
  
  return (volumeFactor + volatilityFactor) * (Math.random() > 0.5 ? 1 : -1);
}
```

### Stop/Limit Order Simulation

```typescript
function checkPendingOrders(
  pendingOrders: PendingOrder[],
  currentPrice: Price
): ExecutedOrder[] {
  const executed: ExecutedOrder[] = [];
  
  for (const order of pendingOrders) {
    const triggered = isOrderTriggered(order, currentPrice);
    
    if (triggered) {
      executed.push(executeOrder(order, currentPrice));
    }
  }
  
  return executed;
}

function isOrderTriggered(order: PendingOrder, price: Price): boolean {
  switch (order.type) {
    case 'buy_limit':
      return price.bid <= order.price;
    case 'sell_limit':
      return price.ask >= order.price;
    case 'buy_stop':
      return price.ask >= order.price;
    case 'sell_stop':
      return price.bid <= order.price;
    default:
      return false;
  }
}
```

## Position Management

### Position Tracking

```typescript
interface BacktestPosition {
  id: string;
  symbol: string;
  type: 'buy' | 'sell';
  volume: number;
  entryPrice: number;
  entryTime: Date;
  stopLoss: number;
  takeProfit: number;
  currentPrice: number;
  unrealizedPnL: number;
  swap: number;
  commission: number;
}

function updatePosition(
  position: BacktestPosition,
  currentPrice: Price,
  dayProgress: number // 0-1 representing progress through the day
): BacktestPosition {
  // Update current price
  position.currentPrice = position.type === 'buy'
    ? currentPrice.bid
    : currentPrice.ask;
  
  // Calculate unrealized P&L
  const points = calculatePoints(
    position.entryPrice,
    position.currentPrice,
    position.type
  );
  position.unrealizedPnL = points * getPointValue(position.symbol) * position.volume;
  
  // Calculate swap
  const swapRate = position.type === 'buy'
    ? getSwapRate(position.symbol, 'buy')
    : getSwapRate(position.symbol, 'sell');
  position.swap += swapRate * position.volume * dayProgress;
  
  return position;
}
```

### Stop Loss / Take Profit Check

```typescript
function checkExitConditions(
  position: BacktestPosition,
  currentPrice: Price,
  high: number,
  low: number
): 'none' | 'stop_loss' | 'take_profit' | 'trailing_stop' {
  if (position.type === 'buy') {
    // Check stop loss (sell if price goes below SL)
    if (low <= position.stopLoss) {
      return 'stop_loss';
    }
    // Check take profit (sell if price reaches TP)
    if (high >= position.takeProfit) {
      return 'take_profit';
    }
  } else {
    // Check stop loss (buy if price goes above SL)
    if (high >= position.stopLoss) {
      return 'stop_loss';
    }
    // Check take profit (buy if price reaches TP)
    if (low <= position.takeProfit) {
      return 'take_profit';
    }
  }
  
  return 'none';
}
```

## Cost Modeling

### Spread

```typescript
interface SpreadConfig {
  type: 'fixed' | 'variable';
  baseSpread: number;  // In points
  maxSpread: number;  // For variable
  marketSpreadMultiplier: number;
}

function getSimulatedSpread(
  config: SpreadConfig,
  currentMarketSpread: number,
  volatility: number
): number {
  if (config.type === 'fixed') {
    return config.baseSpread;
  }
  
  const marketSpread = currentMarketSpread * config.marketSpreadMultiplier;
  const volatilitySpread = volatility * 10;
  const simulatedSpread = Math.max(marketSpread, volatilitySpread);
  
  return Math.min(simulatedSpread, config.maxSpread);
}
```

### Commission

```typescript
interface CommissionConfig {
  type: 'per_lot' | 'percentage';
  rate: number;
  currency: string;
}

function calculateCommission(
  config: CommissionConfig,
  volume: number,
  price: number
): number {
  if (config.type === 'per_lot') {
    return config.rate * volume;
  }
  
  const notional = volume * getContractSize() * price;
  return notional * (config.rate / 100);
}
```

### Swap

```typescript
interface SwapConfig {
  longSwap: number;  // Per lot per day
  shortSwap: number;
  tripleOnWednesday: boolean;
}

function calculateSwap(
  config: SwapConfig,
  position: BacktestPosition,
  days: number
): number {
  let swapRate = position.type === 'buy'
    ? config.longSwap
    : config.shortSwap;
  
  // Some brokers charge 3x swap on Wednesday for forex
  if (config.tripleOnWednesday) {
    const wednesdaySwaps = Math.floor(days);
    const remainderDays = days - wednesdaySwaps;
    
    // Simplified: assume 1/7 of days are Wednesday
    const wednesdayCount = Math.floor(days / 7) * 3;
    const regularDays = days - wednesdayCount;
    
    swapRate = (swapRate * 3 * wednesdayCount + swapRate * regularDays) / days;
  }
  
  return swapRate * position.volume * days;
}
```

## Performance Metrics

### Core Metrics

```typescript
interface PerformanceMetrics {
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  
  // Profit/Loss
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  
  // Risk Metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number;  // Days
  profitFactor: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Time Metrics
  avgTradeDuration: number;  // Hours
  totalTradingDays: number;
  
  // Efficiency
  expectancy: number;
  edge: number;
  consecutiveWins: number;
  consecutiveLosses: number;
}
```

### Metric Calculations

```typescript
function calculateMetrics(trades: TradeResult[]): PerformanceMetrics {
  const wins = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit < 0);
  
  return {
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate: wins.length / trades.length * 100,
    grossProfit: sum(wins.map(t => t.profit)),
    grossLoss: Math.abs(sum(losses.map(t => t.profit))),
    netProfit: sum(trades.map(t => t.profit)),
    avgWin: avg(wins.map(t => t.profit)),
    avgLoss: avg(losses.map(t => t.profit)),
    profitFactor: sum(wins.map(t => t.profit)) / Math.abs(sum(losses.map(t => t.profit))),
    maxDrawdown: calculateMaxDrawdown(equityCurve),
    sharpeRatio: calculateSharpeRatio(returns),
    // ... more metrics
  };
}

function calculateSharpeRatio(returns: number[]): number {
  const avgReturn = avg(returns);
  const stdDev = standardDeviation(returns);
  const riskFreeRate = 0.02 / 252; // Daily risk-free rate
  
  return (avgReturn - riskFreeRate) / stdDev * Math.sqrt(252);
}

function calculateSortinoRatio(returns: number[]): number {
  const avgReturn = avg(returns);
  const downsideReturns = returns.filter(r => r < 0);
  const downsideDeviation = standardDeviation(downsideReturns);
  const riskFreeRate = 0.02 / 252;
  
  return (avgReturn - riskFreeRate) / downsideDeviation * Math.sqrt(252);
}

function calculateMaxDrawdown(equityCurve: EquityPoint[]): number {
  let maxEquity = 0;
  let maxDrawdown = 0;
  let maxDrawdownPercent = 0;
  
  for (const point of equityCurve) {
    if (point.equity > maxEquity) {
      maxEquity = point.equity;
    }
    
    const drawdown = maxEquity - point.equity;
    const drawdownPercent = (drawdown / maxEquity) * 100;
    
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownPercent = drawdownPercent;
    }
  }
  
  return maxDrawdownPercent;
}
```

## Walk-Forward Analysis

```typescript
interface WalkForwardConfig {
  trainRatio: number;      // e.g., 0.7 (70% training)
  stepRatio: number;        // e.g., 0.2 (20% step)
  optimizationMetric: string; // e.g., 'profitFactor'
}

async function runWalkForwardAnalysis(
  data: CandleData[],
  config: WalkForwardConfig
): Promise<WalkForwardResult[]> {
  const results: WalkForwardResult[] = [];
  const stepSize = Math.floor(data.length * config.stepRatio);
  
  for (let i = 0; i < data.length - stepSize; i += stepSize) {
    const trainEnd = i + Math.floor(stepSize * config.trainRatio);
    const testStart = trainEnd;
    const testEnd = Math.min(testStart + stepSize, data.length);
    
    // Train on in-sample data
    const trainData = data.slice(i, trainEnd);
    const optimizedParams = optimizeStrategy(trainData);
    
    // Test on out-of-sample data
    const testData = data.slice(testStart, testEnd);
    const testResult = runBacktest(testData, optimizedParams);
    
    results.push({
      trainPeriod: { start: i, end: trainEnd },
      testPeriod: { start: testStart, end: testEnd },
      params: optimizedParams,
      testMetrics: testResult.metrics
    });
  }
  
  return results;
}
```

## Monte Carlo Simulation

```typescript
interface MonteCarloConfig {
  iterations: number;
  initialBalance: number;
  riskPercent: number;
}

async function runMonteCarloSimulation(
  historicalTrades: TradeResult[],
  config: MonteCarloConfig
): Promise<MonteCarloResult> {
  const simulations: EquityCurve[] = [];
  
  for (let i = 0; i < config.iterations; i++) {
    const equityCurve = simulateWithResampling(
      historicalTrades,
      config.initialBalance,
      config.riskPercent
    );
    simulations.push(equityCurve);
  }
  
  return {
    probabilityOfRuin: calculateProbabilityOfRuin(simulations),
    averageOutcome: calculateAverageOutcome(simulations),
    percentile10: calculatePercentile(simulations, 10),
    percentile90: calculatePercentile(simulations, 90),
    bestCase: calculateBestCase(simulations),
    worstCase: calculateWorstCase(simulations),
    projections: generateProjections(simulations)
  };
}

function simulateWithResampling(
  trades: TradeResult[],
  initialBalance: number,
  riskPercent: number
): EquityCurve {
  const curve: EquityCurve = [{ day: 0, equity: initialBalance }];
  let equity = initialBalance;
  
  const shuffledTrades = shuffle(resample(trades, trades.length));
  
  for (const trade of shuffledTrades) {
    equity += calculateTradeProfit(trade, equity, riskPercent);
    curve.push({ day: curve.length, equity });
    
    if (equity <= 0) break; // Ruin
  }
  
  return curve;
}
```

## Data Requirements

### Minimum Data for Reliable Backtest

| Timeframe | Minimum Historical Data | Purpose |
|-----------|------------------------|---------|
| M1 | 1 year | Intraday strategies |
| M5 | 3 years | Short-term |
| M15 | 5 years | Swing trading |
| H1 | 10 years | Position trading |
| D1 | 20 years | Long-term |

### Data Quality Checks

```typescript
function validateHistoricalData(candles: CandleData[]): DataQualityReport {
  const issues: DataIssue[] = [];
  
  // Check for gaps
  for (let i = 1; i < candles.length; i++) {
    const expectedTime = addTimeframe(candles[i-1].timestamp, candles[0].timeframe);
    if (candles[i].timestamp !== expectedTime) {
      issues.push({
        type: 'gap',
        timestamp: candles[i].timestamp,
        missingCandles: calculateMissingCandles(candles[i-1].timestamp, candles[i].timestamp)
      });
    }
  }
  
  // Check for anomalies
  for (const candle of candles) {
    const priceChange = Math.abs(candle.close - candle.open) / candle.open;
    if (priceChange > MAX_NORMAL_MOVE) {
      issues.push({
        type: 'anomaly',
        timestamp: candle.timestamp,
        priceChange: priceChange * 100
      });
    }
  }
  
  return {
    isValid: issues.length === 0,
    issues,
    completeness: calculateCompleteness(candles)
  };
}
```

## Performance Considerations

### Optimization Strategies

```typescript
// 1. Use connection pooling for database
const pool = new Pool({ max: 10 });

// 2. Batch data loading
async function loadCandlesBatch(symbol: string, from: Date, to: Date) {
  const batches = chunk(dateRange(from, to), 30 * 24 * 60 * 60 * 1000);
  const results = await Promise.all(
    batches.map(batch => db.queryCandles(symbol, batch.start, batch.end))
  );
  return results.flat();
}

// 3. Use typed arrays for calculations
const pricesFloat64 = new Float64Array(candles.map(c => c.close));
const volumesFloat64 = new Float64Array(candles.map(c => c.volume));

// 4. Cache computed values
const indicatorCache = new Map<string, Float64Array>();
```

### Target Performance

| Metric | Target |
|--------|--------|
| 1 year M1 data processing | < 5 seconds |
| 10 year H1 data processing | < 10 seconds |
| 1000-trade Monte Carlo | < 2 seconds |
| Memory usage per iteration | < 100MB |
