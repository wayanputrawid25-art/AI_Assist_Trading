// Backtest Engine - Historical Simulation and Strategy Testing
import type { Candle, Timeframe } from '@forexos/types';
import type {
  BacktestConfig,
  BacktestResult,
  BacktestMetrics,
  EquityPoint,
  BacktestTrade,
  DailyStats,
  MonthlyStats,
  SymbolStats,
  BacktestPosition,
  BacktestOrder,
  TickData,
  BacktestFilters,
  OptimizationResult,
  WalkForwardResult,
  MonteCarloResult,
  DEFAULT_BACKTEST_CONFIG,
} from './types';
import { atr } from '../indicators/volatility';

/**
 * Backtest Engine - Simulates trading on historical data
 */
export class BacktestEngine {
  private config: Required<BacktestConfig>;
  private positions: Map<string, BacktestPosition> = new Map();
  private trades: BacktestTrade[] = [];
  private equityCurve: EquityPoint[] = [];
  private dailyStats: DailyStats[] = [];
  private errors: string[] = [];
  private warnings: string[] = [];
  private balance: number;
  private equity: number;
  private peakBalance: number;
  private currentCandles: Map<string, Candle[]> = new Map();
  private filters: BacktestFilters;

  constructor(config: BacktestConfig, filters?: BacktestFilters) {
    this.config = {
      leverage: 100,
      spread: 2,
      commission: 7,
      slippage: 1,
      useMargin: true,
      ...config,
    };
    this.filters = filters || {};
    this.balance = config.initialBalance;
    this.equity = config.initialBalance;
    this.peakBalance = config.initialBalance;
  }

  /**
   * Run backtest with candles
   */
  async run(candles: Candle[], strategy: (candle: Candle, positions: BacktestPosition[]) => BacktestOrder | null): Promise<BacktestResult> {
    const startTime = Date.now();
    
    // Initialize
    this.reset();
    this.currentCandles.set(this.config.symbol, candles);
    
    // Main simulation loop
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const openPositions = Array.from(this.positions.values());
      
      // Check for stop loss / take profit hits
      this.checkSLTP(candle);
      
      // Generate signal from strategy
      const signal = strategy(candle, openPositions);
      
      if (signal) {
        if (signal.type === 'close') {
          this.closeAllPositions(signal.symbol, candle);
        } else {
          this.executeOrder(signal, candle);
        }
      }
      
      // Update unrealized P&L
      this.updateEquity(candle);
      
      // Record equity curve point (every 10 candles)
      if (i % 10 === 0) {
        this.recordEquity(candle);
      }
      
      // Check daily stats (if timeframe supports it)
      if (i % 24 === 0) {
        this.updateDailyStats(candle);
      }
    }
    
    // Close all remaining positions
    const lastCandle = candles[candles.length - 1];
    for (const position of this.positions.values()) {
      this.closePosition(position.id, lastCandle, 'End of backtest');
    }
    
    // Calculate metrics
    const metrics = this.calculateMetrics();
    const monthlyStats = this.calculateMonthlyStats();
    const symbolStats = this.calculateSymbolStats();
    
    const endTime = Date.now();
    
    return {
      config: this.config,
      metrics,
      equityCurve: this.equityCurve,
      trades: this.trades,
      dailyStats: this.dailyStats,
      monthlyStats,
      symbolStats,
      errors: this.errors,
      warnings: this.warnings,
      startTime,
      endTime,
      duration: endTime - startTime,
    };
  }

  /**
   * Reset engine state
   */
  private reset(): void {
    this.positions.clear();
    this.trades = [];
    this.equityCurve = [];
    this.dailyStats = [];
    this.errors = [];
    this.warnings = [];
    this.balance = this.config.initialBalance;
    this.equity = this.config.initialBalance;
    this.peakBalance = this.config.initialBalance;
  }

  /**
   * Execute order
   */
  private executeOrder(order: BacktestOrder, candle: Candle): void {
    // Check if position already exists for symbol
    const existingPosition = Array.from(this.positions.values()).find(p => p.symbol === order.symbol);
    
    if (existingPosition) {
      // Close existing position first
      this.closePosition(existingPosition.id, candle, `Reversal: ${order.type}`);
    }
    
    // Calculate prices with spread
    const spreadPips = this.config.spread;
    const pipSize = this.getPipSize(order.symbol);
    const spreadCost = spreadPips * pipSize;
    
    let openPrice = candle.close;
    if (order.type === 'buy') {
      openPrice = candle.close + spreadCost;
    } else {
      openPrice = candle.close - spreadCost;
    }
    
    // Apply slippage
    const slippageCost = (this.config.slippage || 0) * pipSize;
    openPrice = order.type === 'buy' 
      ? openPrice + slippageCost 
      : openPrice - slippageCost;
    
    // Calculate volume/lots
    const volume = order.volume;
    const contractSize = 100000;
    const lots = volume;
    
    // Calculate margin required
    const marginRequired = (lots * contractSize * openPrice) / this.config.leverage;
    
    // Check margin
    if (this.balance < marginRequired) {
      this.warnings.push(`Insufficient margin for ${order.symbol}`);
      return;
    }
    
    // Create position
    const position: BacktestPosition = {
      id: `bt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ticket: this.trades.length + 1000000,
      symbol: order.symbol,
      type: order.type,
      openTime: candle.timestamp,
      openPrice,
      volume,
      lots,
      stopLoss: order.stopLoss,
      takeProfit: order.takeProfit,
      currentPrice: openPrice,
      profit: 0,
      unrealizedPnL: 0,
    };
    
    this.positions.set(position.id, position);
  }

  /**
   * Close position
   */
  private closePosition(positionId: string, candle: Candle, reason: string): void {
    const position = this.positions.get(positionId);
    if (!position) return;
    
    // Calculate close price with spread
    const spreadPips = this.config.spread;
    const pipSize = this.getPipSize(position.symbol);
    const spreadCost = spreadPips * pipSize;
    
    let closePrice = candle.close;
    if (position.type === 'buy') {
      closePrice = candle.close - spreadCost;
    } else {
      closePrice = candle.close + spreadCost;
    }
    
    // Calculate profit
    const priceDiff = position.type === 'buy' 
      ? closePrice - position.openPrice 
      : position.openPrice - closePrice;
    const profit = priceDiff * position.volume * 100000; // Contract size
    const commission = this.config.commission * position.lots;
    const swap = 0; // Simplified - would calculate overnight swaps
    
    const netProfit = profit - commission - swap;
    
    // Update balance
    this.balance += netProfit;
    
    // Calculate duration
    const duration = candle.timestamp - position.openTime;
    const barsInTrade = this.estimateBarsInTrade(position.openTime, candle.timestamp);
    
    // Create trade record
    const trade: BacktestTrade = {
      id: position.id,
      ticket: position.ticket,
      symbol: position.symbol,
      type: position.type,
      openTime: position.openTime,
      closeTime: candle.timestamp,
      openPrice: position.openPrice,
      closePrice,
      volume: position.volume,
      lots: position.lots,
      profit,
      commission,
      swap,
      netProfit,
      duration,
      barsInTrade,
      openReason: 'Signal',
      closeReason: reason,
      isWin: netProfit > 0,
      isLongest: false,
      isLargest: false,
    };
    
    this.trades.push(trade);
    this.positions.delete(positionId);
  }

  /**
   * Close all positions for symbol
   */
  private closeAllPositions(symbol: string, candle: Candle): void {
    const positionsToClose = Array.from(this.positions.values()).filter(p => p.symbol === symbol);
    for (const position of positionsToClose) {
      this.closePosition(position.id, candle, 'Strategy close signal');
    }
  }

  /**
   * Check stop loss / take profit
   */
  private checkSLTP(candle: Candle): void {
    for (const position of this.positions.values()) {
      if (position.symbol !== candle.symbol) continue;
      
      // Check take profit
      if (position.takeProfit) {
        if (position.type === 'buy' && candle.high >= position.takeProfit) {
          this.closePosition(position.id, candle, 'Take profit hit');
          continue;
        }
        if (position.type === 'sell' && candle.low <= position.takeProfit) {
          this.closePosition(position.id, candle, 'Take profit hit');
          continue;
        }
      }
      
      // Check stop loss
      if (position.stopLoss) {
        if (position.type === 'buy' && candle.low <= position.stopLoss) {
          this.closePosition(position.id, candle, 'Stop loss hit');
          continue;
        }
        if (position.type === 'sell' && candle.high >= position.stopLoss) {
          this.closePosition(position.id, candle, 'Stop loss hit');
          continue;
        }
      }
    }
  }

  /**
   * Update equity
   */
  private updateEquity(candle: Candle): void {
    let unrealizedPnL = 0;
    
    for (const position of this.positions.values()) {
      if (position.symbol === candle.symbol) {
        const priceDiff = position.type === 'buy'
          ? candle.close - position.openPrice
          : position.openPrice - candle.close;
        unrealizedPnL += priceDiff * position.volume * 100000;
        position.currentPrice = candle.close;
        position.unrealizedPnL = unrealizedPnL;
      }
    }
    
    this.equity = this.balance + unrealizedPnL;
    
    // Update peak
    if (this.balance > this.peakBalance) {
      this.peakBalance = this.balance;
    }
  }

  /**
   * Record equity curve point
   */
  private recordEquity(candle: Candle): void {
    const drawdown = this.peakBalance - this.balance;
    const drawdownPercent = this.peakBalance > 0 ? (drawdown / this.peakBalance) * 100 : 0;
    
    this.equityCurve.push({
      timestamp: candle.timestamp,
      equity: this.equity,
      balance: this.balance,
      drawdown,
      drawdownPercent,
    });
  }

  /**
   * Update daily stats
   */
  private updateDailyStats(candle: Candle): void {
    const date = new Date(candle.timestamp).toISOString().split('T')[0];
    const lastStats = this.dailyStats[this.dailyStats.length - 1];
    
    const dayTrades = this.trades.filter(t => {
      const tradeDate = new Date(t.closeTime).toISOString().split('T')[0];
      return tradeDate === date;
    });
    
    const wins = dayTrades.filter(t => t.netProfit > 0).length;
    const losses = dayTrades.filter(t => t.netProfit <= 0).length;
    const profit = dayTrades.reduce((sum, t) => sum + t.netProfit, 0);
    
    const drawdown = this.peakBalance - this.balance;
    const drawdownPercent = this.peakBalance > 0 ? (drawdown / this.peakBalance) * 100 : 0;
    
    this.dailyStats.push({
      date,
      trades: dayTrades.length,
      wins,
      losses,
      profit,
      equity: this.equity,
      drawdown,
      drawdownPercent,
    });
  }

  /**
   * Calculate metrics
   */
  private calculateMetrics(): BacktestMetrics {
    const totalTrades = this.trades.length;
    const winningTrades = this.trades.filter(t => t.netProfit > 0).length;
    const losingTrades = totalTrades - winningTrades;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const grossProfit = this.trades.filter(t => t.netProfit > 0).reduce((sum, t) => sum + t.netProfit, 0);
    const grossLoss = Math.abs(this.trades.filter(t => t.netProfit < 0).reduce((sum, t) => sum + t.netProfit, 0));
    const netProfit = grossProfit - grossLoss;
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0;
    
    const avgWin = winningTrades > 0 ? grossProfit / winningTrades : 0;
    const avgLoss = losingTrades > 0 ? grossLoss / losingTrades : 0;
    const avgWinLossRatio = avgLoss > 0 ? avgWin / avgLoss : 0;
    
    // Drawdown
    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = this.config.initialBalance;
    
    for (const point of this.equityCurve) {
      if (point.balance > peak) {
        peak = point.balance;
      }
      const dd = peak - point.balance;
      const ddPercent = peak > 0 ? (dd / peak) * 100 : 0;
      if (dd > maxDrawdown) maxDrawdown = dd;
      if (ddPercent > maxDrawdownPercent) maxDrawdownPercent = ddPercent;
    }
    
    // Duration
    const startDate = new Date(this.config.startDate).getTime();
    const endDate = new Date(this.config.endDate).getTime();
    const years = (endDate - startDate) / (365.25 * 24 * 60 * 60 * 1000);
    const annualizedReturn = years > 0 ? netProfit / years : 0;
    const annualizedReturnPercent = years > 0 ? (netProfit / this.config.initialBalance / years) * 100 : 0;
    
    // Expectancy
    const expectancy = totalTrades > 0 
      ? this.trades.reduce((sum, t) => sum + t.netProfit, 0) / totalTrades 
      : 0;
    const expectancyPercent = this.config.initialBalance > 0 
      ? (expectancy / this.config.initialBalance) * 100 
      : 0;
    
    // Consecutive wins/losses
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    
    for (const trade of this.trades) {
      if (trade.netProfit > 0) {
        consecutiveWins++;
        consecutiveLosses = 0;
        maxConsecutiveWins = Math.max(maxConsecutiveWins, consecutiveWins);
      } else {
        consecutiveLosses++;
        consecutiveWins = 0;
        maxConsecutiveLosses = Math.max(maxConsecutiveLosses, consecutiveLosses);
      }
    }
    
    // Largest wins/losses
    const sortedByProfit = [...this.trades].sort((a, b) => b.netProfit - a.netProfit);
    const largestWin = sortedByProfit[0]?.netProfit || 0;
    const largestLoss = sortedByProfit[sortedByProfit.length - 1]?.netProfit || 0;
    
    // Average trade duration
    const avgTradeDuration = totalTrades > 0 
      ? this.trades.reduce((sum, t) => sum + t.duration, 0) / totalTrades 
      : 0;
    const avgBarsInTrade = totalTrades > 0 
      ? this.trades.reduce((sum, t) => sum + t.barsInTrade, 0) / totalTrades 
      : 0;
    
    // Sharpe Ratio (simplified)
    const returns = this.equityCurve.slice(1).map((point, i) => {
      const prev = this.equityCurve[i];
      return prev.balance > 0 ? (point.balance - prev.balance) / prev.balance : 0;
    });
    
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const stdDev = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1)
    );
    const sharpeRatio = stdDev > 0 ? (avgReturn * Math.sqrt(252)) / (stdDev * Math.sqrt(252)) : 0;
    
    // Sortino Ratio (downside deviation)
    const negativeReturns = returns.filter(r => r < 0);
    const downsideDev = Math.sqrt(
      negativeReturns.reduce((sum, r) => sum + r * r, 0) / (negativeReturns.length || 1)
    );
    const sortinoRatio = downsideDev > 0 ? (avgReturn * Math.sqrt(252)) / (downsideDev * Math.sqrt(252)) : 0;
    
    // Calmar Ratio
    const maxDrawdownForCalmar = maxDrawdownPercent > 0 ? maxDrawdownPercent : 1;
    const calmarRatio = maxDrawdownForCalmar > 0 ? annualizedReturnPercent / maxDrawdownForCalmar : 0;
    
    // Recovery Factor
    const recoveryFactor = maxDrawdown > 0 ? netProfit / maxDrawdown : netProfit > 0 ? Infinity : 0;
    
    return {
      totalReturn: netProfit,
      totalReturnPercent: (netProfit / this.config.initialBalance) * 100,
      annualizedReturn,
      annualizedReturnPercent,
      maxDrawdown,
      maxDrawdownPercent,
      maxDrawdownDuration: 0, // Would calculate based on time in drawdown
      totalTrades,
      winningTrades,
      losingTrades,
      winRate,
      grossProfit,
      grossLoss,
      netProfit,
      profitFactor,
      avgWin,
      avgLoss,
      avgWinLossRatio,
      avgTradeDuration,
      avgBarsInTrade,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      largestWin,
      largestLoss,
      longestWin: maxConsecutiveWins,
      longestLoss: maxConsecutiveLosses,
      consecutiveWins,
      consecutiveLosses,
      expectancy,
      expectancyPercent,
      recoveryFactor,
    };
  }

  /**
   * Calculate monthly stats
   */
  private calculateMonthlyStats(): MonthlyStats[] {
    const monthlyMap = new Map<string, MonthlyStats>();
    
    for (const trade of this.trades) {
      const date = new Date(trade.closeTime);
      const key = `${date.getFullYear()}-${date.getMonth()}`;
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          trades: 0,
          wins: 0,
          losses: 0,
          profit: 0,
          equity: this.balance,
          drawdown: 0,
          returnPercent: 0,
        });
      }
      
      const stats = monthlyMap.get(key)!;
      stats.trades++;
      if (trade.netProfit > 0) stats.wins++;
      else stats.losses++;
      stats.profit += trade.netProfit;
    }
    
    return Array.from(monthlyMap.values());
  }

  /**
   * Calculate symbol stats
   */
  private calculateSymbolStats(): Map<string, SymbolStats> {
    const symbolMap = new Map<string, SymbolStats>();
    
    for (const trade of this.trades) {
      if (!symbolMap.has(trade.symbol)) {
        symbolMap.set(trade.symbol, {
          symbol: trade.symbol,
          trades: 0,
          wins: 0,
          losses: 0,
          winRate: 0,
          profit: 0,
          avgProfit: 0,
          avgLoss: 0,
          profitFactor: 0,
        });
      }
      
      const stats = symbolMap.get(trade.symbol)!;
      stats.trades++;
      if (trade.netProfit > 0) stats.wins++;
      else stats.losses++;
      stats.profit += trade.netProfit;
    }
    
    // Calculate derived stats
    for (const stats of symbolMap.values()) {
      stats.winRate = stats.trades > 0 ? (stats.wins / stats.trades) * 100 : 0;
      stats.avgProfit = stats.wins > 0 
        ? stats.trades > 0 
          ? stats.profit / stats.trades 
          : 0 
        : 0;
      const loss = stats.trades - stats.wins;
      stats.avgLoss = loss > 0 ? Math.abs(stats.profit - (stats.wins * stats.avgProfit)) / loss : 0;
      stats.profitFactor = stats.avgLoss > 0 ? stats.avgProfit / stats.avgLoss : 0;
    }
    
    return symbolMap;
  }

  /**
   * Get pip size for symbol
   */
  private getPipSize(symbol: string): number {
    if (symbol.includes('JPY')) return 0.01;
    return 0.0001;
  }

  /**
   * Estimate bars in trade
   */
  private estimateBarsInTrade(openTime: number, closeTime: number): number {
    const timeframeMinutes = this.getTimeframeMinutes(this.config.timeframe);
    const diffMs = closeTime - openTime;
    return Math.round(diffMs / (timeframeMinutes * 60 * 1000));
  }

  /**
   * Get timeframe in minutes
   */
  private getTimeframeMinutes(timeframe: Timeframe): number {
    const map: Record<string, number> = {
      M1: 1, M5: 5, M15: 15, M30: 30,
      H1: 60, H4: 240, D1: 1440, W1: 10080,
    };
    return map[timeframe] || 60;
  }

  /**
   * Get pip size helper
   */
  getPipSizeStatic(symbol: string): number {
    return this.getPipSize(symbol);
  }
}

/**
 * Run simple backtest with signals
 */
export async function runBacktest(
  config: BacktestConfig,
  candles: Candle[],
  signalGenerator: (candle: Candle, index: number, candles: Candle[]) => { type: 'buy' | 'sell' | 'close'; stopLoss?: number; takeProfit?: number } | null
): Promise<BacktestResult> {
  const engine = new BacktestEngine(config);
  
  return engine.run(candles, (candle, positions) => {
    const index = candles.findIndex(c => c.timestamp === candle.timestamp);
    const signal = signalGenerator(candle, index, candles);
    
    if (!signal) return null;
    
    return {
      type: signal.type === 'close' ? 'close' : signal.type,
      symbol: candle.symbol,
      volume: 0.1, // Default lot size
      stopLoss: signal.stopLoss,
      takeProfit: signal.takeProfit,
      timestamp: candle.timestamp,
    };
  });
}

/**
 * Optimize strategy parameters
 */
export async function optimizeStrategy(
  config: BacktestConfig,
  candles: Candle[],
  baseParams: Record<string, number>,
  paramRanges: Record<string, { min: number; max: number; step: number }>,
  signalGenerator: (candle: Candle, params: Record<string, number>) => { type: 'buy' | 'sell' | 'close'; stopLoss?: number; takeProfit?: number } | null,
  metric: keyof BacktestMetrics = 'profitFactor'
): Promise<OptimizationResult[]> {
  const results: OptimizationResult[] = [];
  
  // Generate all parameter combinations
  const paramNames = Object.keys(paramRanges);
  const combinations = generateCombinations(paramRanges);
  
  for (const params of combinations) {
    const fullParams = { ...baseParams, ...params };
    
    const result = await runBacktest(
      config,
      candles,
      (candle) => signalGenerator(candle, fullParams)
    );
    
    results.push({
      params: fullParams,
      metrics: result.metrics,
      score: result.metrics[metric] as number || 0,
    });
  }
  
  // Sort by metric
  results.sort((a, b) => b.score - a.score);
  
  return results;
}

/**
 * Generate parameter combinations
 */
function generateCombinations(ranges: Record<string, { min: number; max: number; step: number }>): Record<string, number>[] {
  const keys = Object.keys(ranges);
  const values = keys.map(key => {
    const range = ranges[key];
    const arr: number[] = [];
    for (let v = range.min; v <= range.max; v += range.step) {
      arr.push(v);
    }
    return arr;
  });
  
  const combinations: Record<string, number>[] = [];
  
  function combine(index: number, current: Record<string, number>) {
    if (index === keys.length) {
      combinations.push({ ...current });
      return;
    }
    
    const key = keys[index];
    for (const value of values[index]) {
      current[key] = value;
      combine(index + 1, current);
    }
  }
  
  combine(0, {});
  return combinations;
}

/**
 * Run walk-forward analysis
 */
export async function runWalkForward(
  config: BacktestConfig,
  candles: Candle[],
  trainPercent: number,
  stepPercent: number,
  signalGenerator: (candle: Candle, params: Record<string, number>) => { type: 'buy' | 'sell' | 'close' } | null,
  paramRanges: Record<string, { min: number; max: number; step: number }>
): Promise<WalkForwardResult> {
  const trainResults: BacktestResult[] = [];
  const testResults: BacktestResult[] = [];
  
  const trainSize = Math.floor(candles.length * (trainPercent / 100));
  const stepSize = Math.floor(candles.length * (stepPercent / 100));
  
  let trainStart = 0;
  let testStart = trainStart + trainSize;
  
  while (testStart + stepSize <= candles.length) {
    // Train
    const trainCandles = candles.slice(trainStart, testStart);
    const bestParams = await optimizeStrategy(config, trainCandles, {}, paramRanges, signalGenerator);
    
    if (bestParams.length > 0) {
      const trainResult = await runBacktest(config, trainCandles, candle => signalGenerator(candle, bestParams[0].params));
      trainResults.push(trainResult);
      
      // Test
      const testCandles = candles.slice(testStart, Math.min(testStart + stepSize, candles.length));
      const testResult = await runBacktest(config, testCandles, candle => signalGenerator(candle, bestParams[0].params));
      testResults.push(testResult);
    }
    
    trainStart = testStart;
    testStart = trainStart + stepSize;
  }
  
  // Calculate stability
  const trainScores = trainResults.map(r => r.metrics.profitFactor);
  const testScores = testResults.map(r => r.metrics.profitFactor);
  const inSampleScore = trainScores.reduce((a, b) => a + b, 0) / (trainScores.length || 1);
  const outOfSampleScore = testScores.reduce((a, b) => a + b, 0) / (testScores.length || 1);
  
  const stability = outOfSampleScore > 0 ? inSampleScore / outOfSampleScore : 0;
  
  return {
    trainResults,
    testResults,
    inSampleScore,
    outOfSampleScore,
    stability,
  };
}

/**
 * Run Monte Carlo simulation
 */
export async function runMonteCarlo(
  result: BacktestResult,
  simulations: number = 1000
): Promise<MonteCarloResult> {
  const trades = result.trades;
  const finalBalances: number[] = [];
  const maxDrawdowns: number[] = [];
  const sharpeRatios: number[] = [];
  const winRates: number[] = [];
  
  for (let i = 0; i < simulations; i++) {
    // Shuffle trades randomly
    const shuffledTrades = [...trades].sort(() => Math.random() - 0.5);
    
    let balance = result.config.initialBalance;
    let peak = balance;
    let maxDD = 0;
    const returns: number[] = [];
    let wins = 0;
    
    for (const trade of shuffledTrades) {
      balance += trade.netProfit;
      returns.push(trade.netProfit / (balance - trade.netProfit || 1));
      
      if (balance > peak) peak = balance;
      const dd = peak - balance;
      if (dd > maxDD) maxDD = dd;
      
      if (trade.netProfit > 0) wins++;
    }
    
    finalBalances.push(balance);
    maxDrawdowns.push(maxDD);
    winRates.push((wins / shuffledTrades.length) * 100);
    
    // Calculate Sharpe from returns
    const avgReturn = returns.reduce((a, b) => a + b, 0) / (returns.length || 1);
    const stdDev = Math.sqrt(returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length || 1));
    sharpeRatios.push(stdDev > 0 ? (avgReturn * Math.sqrt(252)) / (stdDev * Math.sqrt(252)) : 0);
  }
  
  finalBalances.sort((a, b) => a - b);
  const meanBalance = finalBalances.reduce((a, b) => a + b, 0) / finalBalances.length;
  const medianBalance = finalBalances[Math.floor(finalBalances.length / 2)];
  const stdDevBalance = Math.sqrt(finalBalances.reduce((sum, b) => sum + Math.pow(b - meanBalance, 2), 0) / finalBalances.length);
  const percentile5 = finalBalances[Math.floor(finalBalances.length * 0.05)];
  const percentile95 = finalBalances[Math.floor(finalBalances.length * 0.95)];
  const probabilityOfRuin = finalBalances.filter(b => b < result.config.initialBalance * 0.5).length / finalBalances.length;
  
  return {
    simulations,
    finalBalances,
    maxDrawdowns,
    sharpeRatios,
    winRates,
    meanBalance,
    medianBalance,
    stdDevBalance,
    percentile5,
    percentile95,
    probabilityOfRuin,
  };
}
