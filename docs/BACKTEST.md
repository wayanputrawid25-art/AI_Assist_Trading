# ForexOS Backtest Engine

**Last Updated:** 2026-06-25

Complete guide for ForexOS Backtest Engine - historical simulation, strategy testing, and optimization.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backtest Configuration](#backtest-configuration)
4. [Running Backtests](#running-backtests)
5. [Performance Metrics](#performance-metrics)
6. [Strategy Optimization](#strategy-optimization)
7. [Walk-Forward Analysis](#walk-forward-analysis)
8. [Monte Carlo Simulation](#monte-carlo-simulation)
9. [API Reference](#api-reference)
10. [Usage Examples](#usage-examples)

---

## Overview

### What Is the Backtest Engine?

The Backtest Engine simulates trading strategies on historical data to evaluate performance:

- **Historical Simulation**: Test strategies on past market data
- **Trade Replay**: Accurate trade execution simulation
- **Performance Metrics**: Comprehensive statistics
- **Optimization**: Find optimal parameters
- **Walk-Forward**: Validate strategy robustness
- **Monte Carlo**: Assess risk and variability

### Features

| Feature | Description |
|---------|-------------|
| Multi-Symbol | Test across multiple pairs |
| Custom Costs | Spread, commission, slippage |
| Position Tracking | Full position lifecycle |
| Equity Curve | Detailed balance history |
| Risk Metrics | Sharpe, Sortino, Drawdown |
| Optimization | Grid search parameter tuning |
| Walk-Forward | Out-of-sample validation |
| Monte Carlo | Statistical confidence |

---

## Architecture

### Module Structure

```
packages/engine/src/backtest/
├── types.ts    # Type definitions
├── engine.ts   # Backtest engine implementation
└── index.ts   # Module exports
```

### Core Components

| Component | Purpose |
|-----------|---------|
| `BacktestEngine` | Main simulation engine |
| `runBacktest()` | Simple backtest runner |
| `optimizeStrategy()` | Parameter optimization |
| `runWalkForward()` | Walk-forward analysis |
| `runMonteCarlo()` | Monte Carlo simulation |

---

## Backtest Configuration

### Configuration Options

```typescript
interface BacktestConfig {
  symbol: string;           // Trading symbol
  timeframe: Timeframe;      // M1, M5, H1, D1, etc.
  startDate: Date;         // Backtest start
  endDate: Date;           // Backtest end
  initialBalance: number;   // Starting balance
  leverage?: number;        // Account leverage
  spread?: number;          // Spread in pips
  commission?: number;      // Commission per lot
  slippage?: number;         // Slippage in pips
  useMargin?: boolean;      // Use margin trading
}
```

### Default Configuration

```typescript
const DEFAULT_CONFIG = {
  leverage: 100,
  spread: 2,
  commission: 7,
  slippage: 1,
  useMargin: true,
};
```

### Creating Engine

```typescript
import { BacktestEngine } from '@forexos/engine';

const config: BacktestConfig = {
  symbol: 'EURUSD',
  timeframe: 'H1',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-12-31'),
  initialBalance: 10000,
  leverage: 100,
  spread: 2,
  commission: 7,
};

const engine = new BacktestEngine(config);
```

---

## Running Backtests

### Basic Backtest

```typescript
import { runBacktest } from '@forexos/engine';

// Simple moving average crossover strategy
const strategy = (candle: Candle, index: number, candles: Candle[]) => {
  if (index < 50) return null;
  
  const ema20 = calculateEMA(candles.slice(0, index + 1), 20);
  const ema50 = calculateEMA(candles.slice(0, index + 1), 50);
  const prevEma20 = calculateEMA(candles.slice(0, index), 20);
  const prevEma50 = calculateEMA(candles.slice(0, index), 50);
  
  // Golden cross
  if (prevEma20 <= prevEma50 && ema20 > ema50) {
    return { type: 'buy' as const, stopLoss: candle.close * 0.99, takeProfit: candle.close * 1.02 };
  }
  
  // Death cross
  if (prevEma20 >= prevEma50 && ema20 < ema50) {
    return { type: 'sell' as const, stopLoss: candle.close * 1.01, takeProfit: candle.close * 0.98 };
  }
  
  return null;
};

const result = await runBacktest(config, candles, strategy);

console.log(`Net Profit: $${result.metrics.netProfit.toFixed(2)}`);
console.log(`Win Rate: ${result.metrics.winRate.toFixed(1)}%`);
console.log(`Sharpe Ratio: ${result.metrics.sharpeRatio.toFixed(2)}`);
console.log(`Max Drawdown: ${result.metrics.maxDrawdownPercent.toFixed(1)}%`);
```

### Using BacktestEngine Class

```typescript
const engine = new BacktestEngine(config);

const result = await engine.run(candles, (candle, positions) => {
  // Your strategy logic here
  const signal = generateSignal(candle);
  
  if (signal.type === 'buy') {
    return {
      type: 'buy',
      symbol: candle.symbol,
      volume: 0.1,
      stopLoss: candle.close - 0.0030,
      takeProfit: candle.close + 0.0060,
      timestamp: candle.timestamp,
    };
  }
  
  return null;
});
```

### Signal Generator

```typescript
type SignalGenerator = (
  candle: Candle,
  index: number,
  candles: Candle[]
) => {
  type: 'buy' | 'sell' | 'close';
  stopLoss?: number;
  takeProfit?: number;
} | null;

// Return null for no action
// Return { type: 'close' } to close positions
// Return { type: 'buy' } with SL/TP for entries
```

---

## Performance Metrics

### Return Metrics

```typescript
// Total Return
result.metrics.totalReturn        // $ profit/loss
result.metrics.totalReturnPercent  // % profit/loss

// Annualized
result.metrics.annualizedReturn    // $ per year
result.metrics.annualizedReturnPercent  // % per year
```

### Risk Metrics

```typescript
// Drawdown
result.metrics.maxDrawdown           // $ max drawdown
result.metrics.maxDrawdownPercent    // % max drawdown

// Risk-Adjusted Returns
result.metrics.sharpeRatio           // Sharpe Ratio
result.metrics.sortinoRatio           // Sortino Ratio
result.metrics.calmarRatio            // Calmar Ratio
```

### Trade Statistics

```typescript
// Trade Counts
result.metrics.totalTrades    // Total trades
result.metrics.winningTrades   // Winning trades
result.metrics.losingTrades   // Losing trades
result.metrics.winRate        // Win rate %

// Profit/Loss
result.metrics.grossProfit    // Total wins
result.metrics.grossLoss      // Total losses
result.metrics.netProfit      // Net profit
result.metrics.profitFactor   // Gross / Loss
result.metrics.avgWin         // Average win
result.metrics.avgLoss        // Average loss
result.metrics.avgWinLossRatio // Avg win / avg loss

// Trade Details
result.metrics.avgTradeDuration    // Hours in trade
result.metrics.avgBarsInTrade       // Bars in trade
result.metrics.expectancy           // Expected value
```

### Streak Metrics

```typescript
result.metrics.consecutiveWins      // Current winning streak
result.metrics.consecutiveLosses    // Current losing streak
result.metrics.longestWin           // Longest winning streak
result.metrics.longestLoss          // Longest losing streak
result.metrics.largestWin            // Biggest win
result.metrics.largestLoss          // Biggest loss
```

### All Metrics

```typescript
interface BacktestMetrics {
  // Returns
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  annualizedReturnPercent: number;
  
  // Risk
  maxDrawdown: number;
  maxDrawdownPercent: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Trades
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // P&L
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  avgWinLossRatio: number;
  
  // Details
  avgTradeDuration: number;
  avgBarsInTrade: number;
  
  // Streaks
  largestWin: number;
  largestLoss: number;
  longestWin: number;
  longestLoss: number;
  
  // Expectancy
  expectancy: number;
  expectancyPercent: number;
  recoveryFactor: number;
}
```

---

## Strategy Optimization

### Parameter Optimization

```typescript
import { optimizeStrategy } from '@forexos/engine';

// Define parameter ranges
const paramRanges = {
  emaFast: { min: 5, max: 20, step: 5 },    // 5, 10, 15, 20
  emaSlow: { min: 20, max: 50, step: 10 },  // 20, 30, 40, 50
  stopLoss: { min: 0.001, max: 0.005, step: 0.001 }, // 0.1%, 0.2%, etc.
};

// Strategy with parameters
const parameterizedStrategy = (candle: Candle, params: Record<string, number>) => {
  // Use params.emaFast, params.emaSlow, params.stopLoss
  // ...
  return signal;
};

// Run optimization
const results = await optimizeStrategy(
  config,
  candles,
  {},                    // Base params
  paramRanges,           // Parameter ranges
  parameterizedStrategy, // Strategy function
  'profitFactor'         // Optimization metric
);

// Get best parameters
const best = results[0];
console.log(`Best params:`, best.params);
console.log(`Profit Factor: ${best.metrics.profitFactor?.toFixed(2)}`);
```

### Optimization Results

```typescript
// Results sorted by metric
results[0]  // Best result
results[1]  // Second best

// Each result contains
{
  params: { emaFast: 10, emaSlow: 30, stopLoss: 0.002 },
  metrics: { profitFactor: 2.5, sharpeRatio: 1.8, ... },
  score: 2.5  // Value of optimized metric
}
```

---

## Walk-Forward Analysis

### Walk-Forward Overview

Walk-forward analysis validates strategy robustness by:

1. Training on in-sample data
2. Testing on out-of-sample data
3. Walking forward through time

```typescript
import { runWalkForward } from '@forexos/engine';

const walkForwardResult = await runWalkForward(
  config,
  candles,
  70,    // 70% training data
  10,    // 10% step forward
  parameterizedStrategy,
  paramRanges
);

console.log(`In-Sample Score: ${walkForwardResult.inSampleScore.toFixed(2)}`);
console.log(`Out-of-Sample Score: ${walkForwardResult.outOfSampleScore.toFixed(2)}`);
console.log(`Stability: ${walkForwardResult.stability.toFixed(2)}`);
```

### Interpreting Results

| Stability | Interpretation |
|-----------|----------------|
| 1.0 - 1.5 | Excellent - strategy is robust |
| 1.5 - 2.0 | Good - minor overfitting |
| 2.0 - 3.0 | Acceptable - some overfitting |
| > 3.0 | Poor - significant overfitting |

---

## Monte Carlo Simulation

### Monte Carlo Overview

Monte Carlo simulates thousands of possible outcomes to assess risk:

```typescript
import { runMonteCarlo } from '@forexos/engine';

const monteCarlo = await runMonteCarlo(result, 1000);

console.log(`Simulations: ${monteCarlo.simulations}`);
console.log(`Mean Balance: $${monteCarlo.meanBalance.toFixed(2)}`);
console.log(`Median Balance: $${monteCarlo.medianBalance.toFixed(2)}`);
console.log(`5th Percentile: $${monteCarlo.percentile5.toFixed(2)}`);
console.log(`95th Percentile: $${monteCarlo.percentile95.toFixed(2)}`);
console.log(`Probability of Ruin: ${(monteCarlo.probabilityOfRuin * 100).toFixed(1)}%`);
```

### Monte Carlo Results

```typescript
interface MonteCarloResult {
  simulations: number;
  finalBalances: number[];        // Array of final balances
  maxDrawdowns: number[];           // Array of max drawdowns
  sharpeRatios: number[];           // Array of Sharpe ratios
  winRates: number[];               // Array of win rates
  
  // Statistics
  meanBalance: number;
  medianBalance: number;
  stdDevBalance: number;
  percentile5: number;              // 5th percentile balance
  percentile95: number;             // 95th percentile balance
  probabilityOfRuin: number;        // % chance of 50% drawdown
}
```

---

## API Reference

### BacktestEngine

```typescript
class BacktestEngine {
  constructor(config: BacktestConfig, filters?: BacktestFilters);
  
  // Run backtest
  run(
    candles: Candle[],
    strategy: (candle: Candle, positions: Position[]) => Order | null
  ): Promise<BacktestResult>;
}
```

### Helper Functions

```typescript
// Simple backtest runner
runBacktest(
  config: BacktestConfig,
  candles: Candle[],
  signalGenerator: (candle: Candle, index: number, candles: Candle[]) => Signal | null
): Promise<BacktestResult>

// Parameter optimization
optimizeStrategy(
  config: BacktestConfig,
  candles: Candle[],
  baseParams: Record<string, number>,
  paramRanges: Record<string, { min: number; max: number; step: number }>,
  signalGenerator: (candle: Candle, params: Record<string, number>) => Signal | null,
  metric?: keyof BacktestMetrics
): Promise<OptimizationResult[]>

// Walk-forward analysis
runWalkForward(
  config: BacktestConfig,
  candles: Candle[],
  trainPercent: number,
  stepPercent: number,
  signalGenerator: (candle: Candle, params: Record<string, number>) => Signal | null,
  paramRanges: Record<string, { min: number; max: number; step: number }>
): Promise<WalkForwardResult>

// Monte Carlo simulation
runMonteCarlo(
  result: BacktestResult,
  simulations?: number
): Promise<MonteCarloResult>
```

---

## Usage Examples

### Complete Strategy Backtest

```typescript
import { BacktestEngine, type BacktestConfig } from '@forexos/engine';

// Configuration
const config: BacktestConfig = {
  symbol: 'EURUSD',
  timeframe: 'H1',
  startDate: new Date('2023-01-01'),
  endDate: new Date('2023-12-31'),
  initialBalance: 10000,
  leverage: 100,
  spread: 2,
  commission: 7,
  slippage: 1,
};

// Strategy: RSI + EMA
function strategy(candle: Candle, index: number, candles: Candle[]) {
  if (index < 50) return null;
  
  const closes = candles.slice(0, index + 1).map(c => c.close);
  const rsi = calculateRSI(closes, 14);
  const ema20 = calculateEMA(closes, 20);
  
  const prevCandle = candles[index - 1];
  
  // Buy: RSI oversold + price above EMA
  if (rsi < 30 && candle.close > ema20 && prevCandle.close <= ema20) {
    return {
      type: 'buy' as const,
      stopLoss: candle.close * 0.99,
      takeProfit: candle.close * 1.03,
    };
  }
  
  // Sell: RSI overbought + price below EMA
  if (rsi > 70 && candle.close < ema20 && prevCandle.close >= ema20) {
    return {
      type: 'sell' as const,
      stopLoss: candle.close * 1.01,
      takeProfit: candle.close * 0.97,
    };
  }
  
  // Close: Opposite signal or extreme RSI
  if (rsi > 70 || rsi < 30) {
    return { type: 'close' as const };
  }
  
  return null;
}

// Run
const result = await runBacktest(config, candles, strategy);

// Report
console.log('=== BACKTEST RESULTS ===');
console.log(`Period: ${config.startDate.toISOString().split('T')[0]} to ${config.endDate.toISOString().split('T')[0]}`);
console.log(`Trades: ${result.metrics.totalTrades}`);
console.log(`Win Rate: ${result.metrics.winRate.toFixed(1)}%`);
console.log(`Net Profit: $${result.metrics.netProfit.toFixed(2)}`);
console.log(`Profit Factor: ${result.metrics.profitFactor.toFixed(2)}`);
console.log(`Max Drawdown: ${result.metrics.maxDrawdownPercent.toFixed(1)}%`);
console.log(`Sharpe Ratio: ${result.metrics.sharpeRatio.toFixed(2)}`);
```

### Optimization Example

```typescript
// Define optimization
const paramRanges = {
  rsiPeriod: { min: 10, max: 20, step: 2 },
  rsiOversold: { min: 20, max: 35, step: 5 },
  rsiOverbought: { min: 65, max: 80, step: 5 },
  emaPeriod: { min: 20, max: 50, step: 10 },
};

const results = await optimizeStrategy(
  config,
  candles,
  {}, // No base params
  paramRanges,
  (candle, params) => {
    // Use params.rsiPeriod, params.rsiOversold, etc.
    // ...
  },
  'sharpeRatio' // Optimize for Sharpe
);

console.log('=== TOP 5 PARAMETER SETS ===');
results.slice(0, 5).forEach((r, i) => {
  console.log(`${i + 1}. Sharpe: ${r.metrics.sharpeRatio?.toFixed(2)}`);
  console.log(`   PF: ${r.metrics.profitFactor?.toFixed(2)}, WinRate: ${r.metrics.winRate?.toFixed(1)}%`);
  console.log(`   Params:`, r.params);
});
```

### Full Analysis Pipeline

```typescript
async function analyzeStrategy(config, candles) {
  // 1. Run initial backtest
  console.log('Running initial backtest...');
  const initial = await runBacktest(config, candles, strategy);
  
  // 2. Run optimization
  console.log('Optimizing parameters...');
  const optimized = await optimizeStrategy(config, candles, {}, paramRanges, strategy);
  const bestParams = optimized[0].params;
  
  // 3. Run walk-forward
  console.log('Running walk-forward analysis...');
  const walkForward = await runWalkForward(config, candles, 70, 10, strategy, paramRanges);
  
  // 4. Run Monte Carlo on best result
  console.log('Running Monte Carlo...');
  const monteCarlo = await runMonteCarlo(initial, 1000);
  
  // 5. Summary
  console.log('\n=== STRATEGY ANALYSIS ===');
  console.log(`Best Params:`, bestParams);
  console.log(`In-Sample Sharpe: ${walkForward.inSampleScore.toFixed(2)}`);
  console.log(`Out-of-Sample Sharpe: ${walkForward.outOfSampleScore.toFixed(2)}`);
  console.log(`Stability: ${walkForward.stability.toFixed(2)}`);
  console.log(`Prob. of Ruin: ${(monteCarlo.probabilityOfRuin * 100).toFixed(1)}%`);
  console.log(`95th Percentile Balance: $${monteCarlo.percentile95.toFixed(2)}`);
  
  return { initial, optimized, walkForward, monteCarlo };
}
```

---

## Configuration

### Trading Costs

```typescript
const config: BacktestConfig = {
  // Account
  initialBalance: 10000,
  leverage: 100,
  
  // Costs
  spread: 2,        // 2 pip spread
  commission: 7,    // $7 per lot
  slippage: 1,      // 1 pip slippage
  
  // Or disable costs
  // spread: 0,
  // commission: 0,
  // slippage: 0,
};
```

### Filters

```typescript
const filters: BacktestFilters = {
  maxSpread: 5,           // Max spread to trade
  minVolume: 1000,        // Min tick volume
  sessions: [              // Trading sessions
    { name: 'London', startHour: 8, endHour: 10 },
    { name: 'NY', startHour: 13, endHour: 16 },
  ],
  excludeWeekends: true,
};
```

---

## Quick Reference

### Performance Rating

| Rating | Sharpe | Max DD | Win Rate | PF |
|--------|--------|--------|----------|-----|
| Excellent | >2.0 | <10% | >55% | >2.0 |
| Good | >1.5 | <15% | >50% | >1.5 |
| Acceptable | >1.0 | <20% | >45% | >1.2 |
| Poor | >0.5 | <30% | >40% | >1.0 |
| Failing | <0.5 | >30% | <40% | <1.0 |

### Key Metrics to Watch

| Metric | Good | Acceptable | Poor |
|--------|------|------------|------|
| Sharpe | >1.5 | 1.0-1.5 | <1.0 |
| Profit Factor | >1.5 | 1.2-1.5 | <1.2 |
| Win Rate | >50% | 40-50% | <40% |
| Max DD | <15% | 15-25% | >25% |
| Recovery | >3.0 | 1.5-3.0 | <1.5 |

---

## Summary

| Feature | Status | Function |
|---------|--------|----------|
| Backtest Engine | ✅ | `BacktestEngine` class |
| Trade Simulation | ✅ | `run()` method |
| Equity Curve | ✅ | `equityCurve` data |
| Trade History | ✅ | `trades` array |
| Performance Metrics | ✅ | `calculateMetrics()` |
| Parameter Optimization | ✅ | `optimizeStrategy()` |
| Walk-Forward | ✅ | `runWalkForward()` |
| Monte Carlo | ✅ | `runMonteCarlo()` |

---

*Last updated: 2026-06-25*
