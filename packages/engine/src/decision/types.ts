// Trading Decision Engine Types
import type { Candle, Timeframe, OrderType } from '@forexos/types';
import type { PatternSignal } from '../patterns/types';

// Decision Types
export type DecisionAction = 'buy' | 'sell' | 'hold' | 'close';
export type DecisionConfidence = 'high' | 'medium' | 'low';
export type DecisionReason = 'pattern' | 'indicator' | 'confluence' | 'risk' | 'multi';

export interface TradingDecision {
  id: string;
  action: DecisionAction;
  confidence: DecisionConfidence;
  confidenceScore: number; // 0-100
  reason: DecisionReason;
  reasons: string[];
  symbol: string;
  timeframe: Timeframe;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskAmount?: number;
  rewardAmount?: number;
  riskRewardRatio?: number;
  positionSize?: number;
  timestamp: number;
  expiresAt?: number;
  metadata?: Record<string, unknown>;
}

export interface SignalScore {
  indicator: string;
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100 to 100
  weight: number;
  weightedScore: number;
}

export interface DecisionContext {
  candles: Candle[];
  symbol: string;
  timeframe: Timeframe;
  accountBalance: number;
  riskPerTrade: number; // Percentage (e.g., 1 = 1%)
  maxPositions: number;
  currentPositions: number;
}

export interface RiskParameters {
  maxRiskPerTrade: number; // Percentage of account
  maxDailyRisk: number; // Percentage of account
  maxOpenPositions: number;
  maxCorrelation: number; // 0-1
  minRiskReward: number;
}

export interface PositionSizeResult {
  lotSize: number;
  units: number;
  riskAmount: number;
  pipValue: number;
  marginRequired: number;
}

export interface ExecutionPlan {
  decision: TradingDecision;
  positionSize: PositionSizeResult;
  orderType: OrderType;
  validation: {
    valid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface BacktestResult {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netProfit: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
}

export interface StrategySignal {
  type: 'entry' | 'exit' | 'adjust';
  action: DecisionAction;
  strength: number;
  reason: string;
  indicators: {
    name: string;
    value: number;
    signal: string;
  }[];
  patterns?: {
    name: string;
    confidence: number;
  }[];
}
