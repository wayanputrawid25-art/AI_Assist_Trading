// Indicator Types and Interfaces
import type { Candle } from '@forexos/types';

export type IndicatorType = 
  // Trend Indicators
  | 'sma'           // Simple Moving Average
  | 'ema'           // Exponential Moving Average
  | 'wma'           // Weighted Moving Average
  | 'dema'          // Double Exponential Moving Average
  | 'tema'          // Triple Exponential Moving Average
  | 'vwap'          // Volume Weighted Average Price
  | 'Ichimoku'      // Ichimoku Cloud
  // Momentum Indicators
  | 'rsi'           // Relative Strength Index
  | 'macd'          // MACD
  | 'stoch'         // Stochastic Oscillator
  | 'adx'           // Average Directional Index
  | 'momentum'      // Momentum
  | 'roc'           // Rate of Change
  // Volatility Indicators
  | 'bb'            // Bollinger Bands
  | 'atr'           // Average True Range
  | 'stddev'        // Standard Deviation
  | 'kc'            // Keltner Channel
  // Volume Indicators
  | 'obv'           // On Balance Volume
  | 'vwap_vol'      // Volume Weighted Average Price (Volume)
  | 'adl'           // Accumulation/Distribution Line
  | 'cmf'           // Chaikin Money Flow
  | 'vpt'           // Volume Price Trend;

export type SignalType = 'bullish' | 'bearish' | 'neutral' | 'overbought' | 'oversold';

export interface IndicatorResult {
  type: IndicatorType;
  values: number[];
  timestamps: number[];
  parameters: Record<string, number>;
  current?: number;
  previous?: number;
}

export interface MultiValueResult {
  type: IndicatorType;
  lines: {
    name: string;
    values: number[];
    current?: number;
  }[];
  timestamps: number[];
  parameters: Record<string, number>;
}

export interface IndicatorSignal {
  indicator: IndicatorType;
  type: SignalType;
  value?: number;
  strength: number; // 0-100
  message: string;
  timestamp: number;
}

export interface IchimokuResult {
  tenkanSen: number[];
  kijunSen: number[];
  senkouSpanA: number[];
  senkouSpanB: number[];
  chikouSpan: number[];
  timestamps: number[];
}

export interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
  bandwidth: number[];
  percent: number[];
  timestamps: number[];
}

export interface MACD {
  macd: number[];
  signal: number[];
  histogram: number[];
  timestamps: number[];
}

export interface Stochastic {
  k: number[];
  d: number[];
  timestamps: number[];
}

export interface RSI {
  value: number[];
  timestamps: number[];
}

export interface ATR {
  value: number[];
  timestamps: number[];
}

export interface VWAP {
  value: number[];
  timestamps: number[];
}

export interface IndicatorConfig {
  type: IndicatorType;
  params: Record<string, number>;
}

export interface CombinedIndicators {
  trend: {
    sma?: IndicatorResult;
    ema?: IndicatorResult;
    vwap?: VWAP;
  };
  momentum: {
    rsi?: RSI;
    macd?: MACD;
    stoch?: Stochastic;
  };
  volatility: {
    bb?: BollingerBands;
    atr?: ATR;
  };
  volume: {
    obv?: number[];
    timestamps: number[];
  };
}
