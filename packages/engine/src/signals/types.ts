// Signal Engine Types
import type { Candle, Timeframe } from '@forexos/types';
import type { TrendAnalysis } from '../trend/types';
import type { PatternSignal } from '../patterns/types';

/**
 * Signal Source Types
 */
export type SignalSource = 
  | 'indicator' 
  | 'pattern' 
  | 'trend' 
  | 'candlestick'
  | 'volume';

/**
 * Signal Direction
 */
export type SignalDirection = 'bullish' | 'bearish' | 'neutral';

/**
 * Signal Category
 */
export type SignalCategory = 
  | 'momentum'
  | 'trend'
  | 'reversal'
  | 'breakout'
  | 'range'
  | 'divergence';

/**
 * Individual Signal
 */
export interface Signal {
  id: string;
  source: SignalSource;
  sourceName: string;
  category: SignalCategory;
  direction: SignalDirection;
  score: number; // 0-100
  weight: number; // 0-1
  confidence: number; // 0-100
  description: string;
  value?: number;
  threshold?: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Aggregated Signal
 */
export interface AggregatedSignal {
  id: string;
  direction: SignalDirection;
  totalScore: number; // Weighted sum of scores
  confidence: number; // 0-100
  signalCount: number;
  bullishSignals: number;
  bearishSignals: number;
  neutralSignals: number;
  signals: Signal[];
  primarySource: SignalSource;
  timestamp: number;
}

/**
 * Scored Signal with Trading Info
 */
export interface ScoredSignal {
  signal: AggregatedSignal;
  action: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'moderate' | 'weak';
  strengthScore: number;
  reasons: string[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: number;
  timeframe: Timeframe;
  symbol: string;
  expiresAt?: number;
}

/**
 * Signal Filter Options
 */
export interface SignalFilter {
  minConfidence?: number;
  minScore?: number;
  directions?: SignalDirection[];
  sources?: SignalSource[];
  categories?: SignalCategory[];
  maxAge?: number; // ms
}

/**
 * Signal Options
 */
export interface SignalOptions {
  includeIndicators?: boolean;
  includePatterns?: boolean;
  includeTrend?: boolean;
  includeCandlestick?: boolean;
  includeVolume?: boolean;
  
  weights?: {
    indicator?: number;
    pattern?: number;
    trend?: number;
    candlestick?: number;
    volume?: number;
  };
  
  thresholds?: {
    minConfidence?: number;
    minScore?: number;
    minDirectionAgreement?: number; // 0-1
  };
  
  filters?: SignalFilter;
}

/**
 * Signal Summary
 */
export interface SignalSummary {
  bullishScore: number;
  bearishScore: number;
  neutralScore: number;
  direction: SignalDirection;
  confidence: number;
  agreement: number; // 0-1
  signals: Signal[];
  aggregated: AggregatedSignal;
  scored: ScoredSignal | null;
  timestamp: number;
}

/**
 * Indicator Signal Values
 */
export interface IndicatorSignalValue {
  indicator: string;
  value: number;
  signal: SignalDirection;
  score: number;
}

/**
 * Pattern Signal Value
 */
export interface PatternSignalValue {
  pattern: string;
  confidence: number;
  direction: SignalDirection;
  score: number;
}

/**
 * Signal Components
 */
export interface SignalComponents {
  trend?: TrendAnalysis;
  indicators: IndicatorSignalValue[];
  patterns: PatternSignalValue[];
  candlesticks: PatternSignalValue[];
  volumes: IndicatorSignalValue[];
}

/**
 * Signal Validation
 */
export interface SignalValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Signal Strength Thresholds
 */
export const SIGNAL_THRESHOLDS = {
  STRONG: 70,
  MODERATE: 50,
  WEAK: 30,
  MIN_CONFIDENCE: 40,
  MIN_AGREEMENT: 0.6,
} as const;

/**
 * Default Signal Weights
 */
export const DEFAULT_WEIGHTS = {
  indicator: 0.35,
  pattern: 0.25,
  trend: 0.25,
  candlestick: 0.10,
  volume: 0.05,
} as const;
