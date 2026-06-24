# Money Management - Personal Forex Trading Operating System

## Overview

Advanced money management system that calculates optimal position sizing, tracks profitability, manages compounding, and ensures sustainable account growth.

## Core Concepts

1. **Preserve Capital**: Never risk more than you can afford
2. **Consistent Returns**: Steady growth over flashy gains
3. **Mathematical Edge**: Let statistics work in your favor
4. **Compounding**: Grow capital through reinvestment

## Position Sizing Methods

### 1. Fixed Lot

Simplest approach - trade the same lot every time.

```typescript
interface FixedLotStrategy {
  type: 'fixed_lot';
  lotSize: number;
}

function calculateLot(
  strategy: FixedLotStrategy,
  context: TradingContext
): number {
  return strategy.lotSize;
}
```

### 2. Fixed Percentage

Risk a fixed percentage of account equity.

```typescript
interface FixedPercentStrategy {
  type: 'fixed_percent';
  riskPercent: number;  // e.g., 1.0 for 1%
}

function calculateLot(
  strategy: FixedPercentStrategy,
  context: TradingContext
): number {
  const { equity, entryPrice, stopLoss, pipValue, lotStep } = context;
  
  const riskAmount = equity * (strategy.riskPercent / 100);
  const stopLossPips = Math.abs(entryPrice - stopLoss) / pipValue;
  
  let lotSize = riskAmount / stopLossPips;
  lotSize = roundToStep(lotSize, lotStep);
  
  return Math.max(lotSize, getMinimumLot(context.symbol));
}
```

### 3. Kelly Criterion

Mathematically optimal position sizing based on win rate and average win/loss.

```typescript
interface KellyStrategy {
  type: 'kelly';
  fraction: number;  // e.g., 0.25 for half-Kelly
}

function calculateKellyLot(
  strategy: KellyStrategy,
  context: TradingContext
): number {
  const { equity, winRate, avgWin, avgLoss, lotStep } = context;
  
  // Calculate Kelly percentage
  const winProbability = winRate / 100;
  const lossProbability = 1 - winProbability;
  const winLossRatio = avgWin / Math.abs(avgLoss);
  
  // Full Kelly
  const kellyPercent = (
    (winProbability * winLossRatio - lossProbability) / winLossRatio
  ) * 100;
  
  // Apply fraction (half-Kelly is more conservative)
  const effectivePercent = kellyPercent * strategy.fraction;
  
  // Convert to lot size (simplified)
  const riskAmount = equity * (effectivePercent / 100);
  const stopLossPips = Math.abs(context.entryPrice - context.stopLoss) / context.pipValue;
  let lotSize = riskAmount / stopLossPips;
  lotSize = roundToStep(lotSize, lotStep);
  
  return Math.max(lotSize, getMinimumLot(context.symbol));
}
```

### 4. Optimal F (Ralph Vince)

Find position size that maximizes geometric growth.

```typescript
interface OptimalFStrategy {
  type: 'optimal_f';
}

function calculateOptimalFLot(
  strategy: OptimalFStrategy,
  trades: TradeResult[]
): number {
  // Find TWR for different f values
  let maxTWR = 0;
  let optimalF = 0;
  
  for (let f = 0.01; f <= 1; f += 0.01) {
    let TWR = 1;
    
    for (const trade of trades) {
      const HPR = 1 + (f * trade.dailyLoss / getWorstLoss(trades));
      TWR *= HPR;
    }
    
    if (TWR > maxTWR) {
      maxTWR = TWR;
      optimalF = f;
    }
  }
  
  // Apply to current account
  const riskAmount = context.equity * optimalF;
  // ... calculate lot from risk amount
}
```

### 5. Martingale / Anti-Martingale

Progressive betting systems with risk controls.

```typescript
interface MartingaleSettings {
  type: 'martingale' | 'anti_martingale';
  multiplier: number;
  maxLosses: number;
  resetOnProfit: boolean;
}

function calculateMartingaleLot(
  settings: MartingaleSettings,
  context: TradingContext,
  streak: { wins: number; losses: number }
): number {
  const baseLot = context.equity * 0.01; // 1% base
  let multiplier = settings.multiplier;
  
  if (settings.type === 'martingale') {
    // Double after loss
    multiplier = Math.pow(settings.multiplier, streak.losses);
  } else {
    // Anti-Martingale: Double after win
    multiplier = Math.pow(settings.multiplier, streak.wins);
  }
  
  // Cap at maximum
  multiplier = Math.min(multiplier, Math.pow(settings.multiplier, settings.maxLosses));
  
  let lotSize = baseLot * multiplier;
  lotSize = roundToStep(lotSize / context.pipValue, context.lotStep);
  
  return Math.max(lotSize, getMinimumLot(context.symbol));
}
```

## Portfolio Management

### Position Concentration

```typescript
interface ConcentrationLimits {
  maxPerSymbol: number;     // Max lot per symbol
  maxPerSector: number;     // Max lot per currency pair type
  maxCorrelation: number;   // Max correlation between positions
}

class ConcentrationMonitor {
  checkLimits(
    positions: Position[],
    proposed: ProposedTrade,
    limits: ConcentrationLimits
  ): ConcentrationResult {
    const symbolConcentration = this.getSymbolConcentration(positions, proposed);
    const correlationRisk = this.getCorrelationRisk(positions, proposed);
    
    const violations: string[] = [];
    
    if (symbolConcentration > limits.maxPerSymbol) {
      violations.push(`Symbol concentration ${symbolConcentration} exceeds ${limits.maxPerSymbol}`);
    }
    
    if (correlationRisk > limits.maxCorrelation) {
      violations.push(`Correlation risk ${correlationRisk} exceeds ${limits.maxCorrelation}`);
    }
    
    return {
      isAllowed: violations.length === 0,
      violations,
      symbolConcentration,
      correlationRisk
    };
  }
}
```

### Portfolio Rebalancing

```typescript
class PortfolioRebalancer {
  calculateRebalanceTrades(
    currentPositions: Position[],
    targetAllocation: Map<string, number>
  ): RebalanceTrade[] {
    const trades: RebalanceTrade[] = [];
    
    const currentAllocation = this.calculateCurrentAllocation(currentPositions);
    
    for (const [symbol, target] of targetAllocation) {
      const current = currentAllocation.get(symbol) || 0;
      const difference = target - current;
      
      if (Math.abs(difference) > 0.01) { // 1% threshold
        trades.push({
          symbol,
          direction: difference > 0 ? 'buy' : 'sell',
          lotSize: Math.abs(difference) * this.totalEquity / this.getPrice(symbol),
          reason: 'rebalance'
        });
      }
    }
    
    return trades;
  }
}
```

## Profit Tracking

### Session Statistics

```typescript
interface SessionStats {
  date: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  avgWin: number;
  avgLoss: number;
  largestWin: number;
  largestLoss: number;
  avgDuration: number;
  startedAt: Date;
  endedAt?: Date;
}

class SessionTracker {
  private currentSession: SessionStats;
  
  startSession(): void {
    this.currentSession = {
      date: this.getTodayDate(),
      trades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      grossProfit: 0,
      grossLoss: 0,
      netProfit: 0,
      avgWin: 0,
      avgLoss: 0,
      largestWin: 0,
      largestLoss: 0,
      avgDuration: 0,
      startedAt: new Date()
    };
  }
  
  recordTrade(trade: TradeResult): void {
    this.currentSession.trades++;
    
    if (trade.profit > 0) {
      this.currentSession.wins++;
      this.currentSession.grossProfit += trade.profit;
      this.currentSession.largestWin = Math.max(this.currentSession.largestWin, trade.profit);
    } else {
      this.currentSession.losses++;
      this.currentSession.grossLoss += Math.abs(trade.profit);
      this.currentSession.largestLoss = Math.max(this.currentSession.largestLoss, Math.abs(trade.profit));
    }
    
    this.calculateAverages();
  }
  
  private calculateAverages(): void {
    if (this.currentSession.wins > 0) {
      this.currentSession.avgWin = this.currentSession.grossProfit / this.currentSession.wins;
    }
    
    if (this.currentSession.losses > 0) {
      this.currentSession.avgLoss = this.currentSession.grossLoss / this.currentSession.losses;
    }
    
    this.currentSession.winRate = 
      (this.currentSession.wins / this.currentSession.trades) * 100;
    
    this.currentSession.netProfit = 
      this.currentSession.grossProfit - this.currentSession.grossLoss;
  }
}
```

### Monthly/Yearly Reports

```typescript
interface PeriodReport {
  period: string;
  startingBalance: number;
  endingBalance: number;
  netProfit: number;
  profitPercent: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  avgWin: number;
  avgLoss: number;
  bestTrade: number;
  worstTrade: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  expectancy: number;
}

async function generateMonthlyReport(
  year: number,
  month: number
): Promise<PeriodReport> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  
  const trades = await getTradesInRange(startDate, endDate);
  const balance = await getBalanceAtDate(startDate);
  
  const wins = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit <= 0);
  
  const grossProfit = sum(wins.map(t => t.profit));
  const grossLoss = Math.abs(sum(losses.map(t => t.profit)));
  
  return {
    period: `${year}-${month.toString().padStart(2, '0')}`,
    startingBalance: balance,
    endingBalance: balance + sum(trades.map(t => t.profit)),
    netProfit: sum(trades.map(t => t.profit)),
    profitPercent: (sum(trades.map(t => t.profit)) / balance) * 100,
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    winRate: (wins.length / trades.length) * 100,
    profitFactor: grossLoss > 0 ? grossProfit / grossLoss : 0,
    maxDrawdown: calculateMaxDrawdown(trades),
    avgWin: wins.length > 0 ? grossProfit / wins.length : 0,
    avgLoss: losses.length > 0 ? grossLoss / losses.length : 0,
    bestTrade: Math.max(...wins.map(t => t.profit)),
    worstTrade: Math.min(...losses.map(t => t.profit)),
    longestWinStreak: calculateLongestStreak(trades, 'win'),
    longestLoseStreak: calculateLongestStreak(trades, 'loss'),
    expectancy: calculateExpectancy(trades)
  };
}
```

## Compound Growth Calculator

```typescript
interface GrowthProjection {
  month: number;
  balance: number;
  profit: number;
  cumulativeProfit: number;
}

function projectCompoundGrowth(
  startingBalance: number,
  monthlyReturnPercent: number,
  months: number,
  withdrawalPercent: number = 0
): GrowthProjection[] {
  const projections: GrowthProjection[] = [];
  let balance = startingBalance;
  let cumulativeProfit = 0;
  
  for (let month = 1; month <= months; month++) {
    const profit = balance * (monthlyReturnPercent / 100);
    cumulativeProfit += profit;
    
    // Apply withdrawal
    if (withdrawalPercent > 0) {
      const withdrawal = profit * (withdrawalPercent / 100);
      balance += profit - withdrawal;
    } else {
      balance += profit;
    }
    
    projections.push({
      month,
      balance: Math.round(balance * 100) / 100,
      profit: Math.round(profit * 100) / 100,
      cumulativeProfit: Math.round(cumulativeProfit * 100) / 100
    });
  }
  
  return projections;
}

function calculateRequiredWinRate(
  targetMonthlyReturn: number,
  avgRiskReward: number
): number {
  // Using expectancy formula
  // Expectancy = (WinRate × AvgWin) - (LossRate × AvgLoss)
  // For 0% expectancy (break-even): WinRate × AvgWin = LossRate × AvgLoss
  // WinRate × R = (1 - WinRate) where R = AvgWin/AvgLoss
  
  // For target return, we need positive expectancy
  // Solving: WinRate = (TargetReturn + LossRate) / (WinRate + LossRate)
  // Simplified: WinRate = 1 / (1 + R)
  
  const R = avgRiskReward;
  const requiredWinRate = 1 / (1 + R);
  
  return requiredWinRate * 100;
}

function calculateRequiredRR(
  targetMonthlyReturn: number,
  currentWinRate: number
): number {
  // From expectancy formula
  // WinRate × RR - LossRate = TargetReturn
  // WinRate × RR - (1 - WinRate) = TargetReturn
  // RR = (TargetReturn + 1 - WinRate) / WinRate
  
  const winRate = currentWinRate / 100;
  const requiredRR = (targetMonthlyReturn / 100 + 1 - winRate) / winRate;
  
  return Math.max(0, requiredRR);
}
```

## Withdrawal Management

### Safe Withdrawal Rate

```typescript
interface WithdrawalPlan {
  monthlyWithdrawal: number;
  withdrawalPercent: number;
  inflationAdjusted: boolean;
  inflationRate: number;
}

function calculateSafeWithdrawal(
  accountBalance: number,
  expectedReturn: number,
  withdrawalPeriodYears: number,
  maxDrawdownTolerance: number
): WithdrawalPlan {
  // Monte Carlo simulation for withdrawal sustainability
  const simulations = runMonteCarloSimulation({
    iterations: 10000,
    startingBalance: accountBalance,
    annualReturn: expectedReturn,
    years: withdrawalPeriodYears,
    withdrawalPercentages: [2, 3, 4, 5, 6]
  });
  
  // Find highest safe withdrawal rate
  for (const rate of [6, 5, 4, 3, 2]) {
    const successRate = simulations.getSuccessRate(rate);
    if (successRate > 95) {
      return {
        monthlyWithdrawal: (accountBalance * rate / 100) / 12,
        withdrawalPercent: rate,
        inflationAdjusted: true,
        inflationRate: 2.5
      };
    }
  }
  
  // Default to conservative 2%
  return {
    monthlyWithdrawal: (accountBalance * 2 / 100) / 12,
    withdrawalPercent: 2,
    inflationAdjusted: true,
    inflationRate: 2.5
  };
}
```

## Risk Metrics

### Expectancy Calculator

```typescript
interface ExpectancyResult {
  expectancy: number;
  expectancyPercent: number;
  edge: number;
  monthlyExpectedProfit: number;
}

function calculateExpectancy(
  trades: TradeResult[],
  accountBalance: number
): ExpectancyResult {
  const wins = trades.filter(t => t.profit > 0);
  const losses = trades.filter(t => t.profit < 0);
  
  const winRate = wins.length / trades.length;
  const lossRate = losses.length / trades.length;
  
  const avgWin = wins.length > 0 
    ? sum(wins.map(t => t.profit)) / wins.length 
    : 0;
  const avgLoss = losses.length > 0 
    ? Math.abs(sum(losses.map(t => t.profit))) / losses.length 
    : 0;
  
  const expectancy = (winRate * avgWin) - (lossRate * avgLoss);
  const expectancyPercent = (expectancy / accountBalance) * 100;
  
  return {
    expectancy,
    expectancyPercent,
    edge: winRate * avgWin - lossRate * avgLoss,
    monthlyExpectedProfit: expectancy * 20 // Assume 20 trades/month
  };
}
```

### Trade Distribution

```typescript
interface DistributionAnalysis {
  percentiles: {
    p10: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
  };
  standardDeviation: number;
  skewness: number;
  kurtosis: number;
}

function analyzeTradeDistribution(
  trades: TradeResult[]
): DistributionAnalysis {
  const profits = trades.map(t => t.profit).sort((a, b) => a - b);
  const n = profits.length;
  
  return {
    percentiles: {
      p10: profits[Math.floor(n * 0.1)],
      p25: profits[Math.floor(n * 0.25)],
      p50: profits[Math.floor(n * 0.5)],
      p75: profits[Math.floor(n * 0.75)],
      p90: profits[Math.floor(n * 0.9)]
    },
    standardDeviation: calculateStdDev(profits),
    skewness: calculateSkewness(profits),
    kurtosis: calculateKurtosis(profits)
  };
}
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Monthly Return Consistency | > 60% months profitable |
| Drawdown Recovery | < 30 days average |
| Win Rate Minimum | > 40% |
| Profit Factor Minimum | > 1.2 |
| Risk/Reward Minimum | > 1.5 |
| Position Size Accuracy | 100% |
