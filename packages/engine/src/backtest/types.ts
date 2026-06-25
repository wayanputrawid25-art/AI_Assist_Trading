// Backtest Engine Types
import type { Candle, Timeframe } from '@forexos/types';

/**
 * Backtest Configuration
 */
export interface BacktestConfig {
  symbol: string;
  timeframe: Timeframe;
  startDate: Date;
  endDate: Date;
  initialBalance: number;
  leverage?: number;
  spread?: number;              // Spread in pips
  commission?: number;           // Commission per lot
  slippage?: number;             // Slippage in pips
  useMargin?: boolean;
}

/**
 * Backtest Result
 */
export interface BacktestResult {
  config: BacktestConfig;
  metrics: BacktestMetrics;
  equityCurve: EquityPoint[];
  trades: BacktestTrade[];
  dailyStats: DailyStats[];
  monthlyStats: MonthlyStats[];
  symbolStats: Map<string, SymbolStats>;
  errors: string[];
  warnings: string[];
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Backtest Metrics
 */
export interface BacktestMetrics {
  // Returns
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  annualizedReturnPercent: number;
  
  // Risk Metrics
  maxDrawdown: number;
  maxDrawdownPercent: number;
  maxDrawdownDuration: number; // Days
  
  // Trade Statistics
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  
  // Profit/Loss
  grossProfit: number;
  grossLoss: number;
  netProfit: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  avgWinLossRatio: number;
  
  // Trade Details
  avgTradeDuration: number; // Hours
  avgBarsInTrade: number;
  
  // Risk-Adjusted Returns
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  
  // Other
  largestWin: number;
  largestLoss: number;
  longestWin: number; // Trades
  longestLoss: number; // Trades
  consecutiveWins: number;
  consecutiveLosses: number;
  
  // Expectancy
  expectancy: number;
  expectancyPercent: number;
  
  // Recovery
  recoveryFactor: number;
}

/**
 * Equity Curve Point
 */
export interface EquityPoint {
  timestamp: number;
  equity: number;
  balance: number;
  drawdown: number;
  drawdownPercent: number;
}

/**
 * Backtest Trade
 */
export interface BacktestTrade {
  id: string;
  ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  openTime: number;
  closeTime: number;
  openPrice: number;
  closePrice: number;
  volume: number;
  lots: number;
  profit: number;
  commission: number;
  swap: number;
  netProfit: number;
  duration: number; // milliseconds
  barsInTrade: number;
  openReason: string;
  closeReason: string;
  isWin: boolean;
  isLongest: boolean;
  isLargest: boolean;
}

/**
 * Daily Statistics
 */
export interface DailyStats {
  date: string;
  trades: number;
  wins: number;
  losses: number;
  profit: number;
  equity: number;
  drawdown: number;
  drawdownPercent: number;
}

/**
 * Monthly Statistics
 */
export interface MonthlyStats {
  year: number;
  month: number;
  trades: number;
  wins: number;
  losses: number;
  profit: number;
  equity: number;
  drawdown: number;
  returnPercent: number;
}

/**
 * Symbol Statistics
 */
export interface SymbolStats {
  symbol: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  profit: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
}

/**
 * Strategy Signal
 */
export interface StrategySignal {
  type: 'buy' | 'sell' | 'close';
  symbol: string;
  price: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: number;
  reason: string;
  confidence?: number;
}

/**
 * Backtest Position
 */
export interface BacktestPosition {
  id: string;
  ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  openTime: number;
  openPrice: number;
  volume: number;
  lots: number;
  stopLoss?: number;
  takeProfit?: number;
  currentPrice: number;
  profit: number;
  unrealizedPnL: number;
}

/**
 * Order for Backtest
 */
export interface BacktestOrder {
  type: 'buy' | 'sell';
  symbol: string;
  volume: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
  timestamp: number;
}

/**
 * Optimization Parameter
 */
export interface OptimizationParam {
  name: string;
  min: number;
  max: number;
  step: number;
  current: number;
}

/**
 * Optimization Result
 */
export interface OptimizationResult {
  params: Record<string, number>;
  metrics: Partial<BacktestMetrics>;
  score: number; // Combined score for comparison
}

/**
 * Walk-Forward Result
 */
export interface WalkForwardResult {
  trainResults: BacktestResult[];
  testResults: BacktestResult[];
  inSampleScore: number;
  outOfSampleScore: number;
  stability: number; // How consistent train/test performance is
}

/**
 * Monte Carlo Result
 */
export interface MonteCarloResult {
  simulations: number;
  finalBalances: number[];
  maxDrawdowns: number[];
  sharpeRatios: number[];
  winRates: number[];
  
  // Statistics
  meanBalance: number;
  medianBalance: number;
  stdDevBalance: number;
  percentile5: number;
  percentile95: number;
  probabilityOfRuin: number;
}

/**
 * Tick Data (for intrabar backtesting)
 */
export interface TickData {
  timestamp: number;
  bid: number;
  ask: number;
  volume: number;
}

/**
 * OHLCV Data
 */
export interface OHLCVData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

/**
 * Trade Session
 */
export interface TradeSession {
  name: string;
  startHour: number;
  endHour: number;
  allowedDays?: number[]; // 0=Sunday, 6=Saturday
}

/**
 * Filter Configuration
 */
export interface BacktestFilters {
  maxSpread?: number;
  minVolume?: number;
  sessions?: TradeSession[];
  excludeWeekends?: boolean;
}

/**
 * Default Backtest Configuration
 */
export const DEFAULT_BACKTEST_CONFIG: Partial<BacktestConfig> = {
  leverage: 100,
  spread: 2,
  commission: 7,
  slippage: 1,
  useMargin: true,
};

/**
 * Performance Rating
 */
export type PerformanceRating = 
  | 'excellent'
  | 'good'
  | 'acceptable'
  | 'poor'
  | 'failing';

/**
 * Rating Thresholds
 */
export const PERFORMANCE_RATING: Record<PerformanceRating, {
  minSharpe: number;
  maxDD: number;
  minWinRate: number;
  minProfitFactor: number;
}> = {
  excellent: { minSharpe: 2.0, maxDD: 10, minWinRate: 55, minProfitFactor: 2.0 },
  good: { minSharpe: 1.5, maxDD: 15, minWinRate: 50, minProfitFactor: 1.5 },
  acceptable: { minSharpe: 1.0, maxDD: 20, minWinRate: 45, minProfitFactor: 1.2 },
  poor: { minSharpe: 0.5, maxDD: 30, minWinRate: 40, minProfitFactor: 1.0 },
  failing: { minSharpe: -Infinity, maxDD: Infinity, minWinRate: 0, minProfitFactor: 0 },
};
