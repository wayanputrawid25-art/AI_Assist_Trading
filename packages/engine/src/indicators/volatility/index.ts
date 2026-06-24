// Volatility Indicators
import type { Candle } from '@forexos/types';
import type { IndicatorResult, BollingerBands, ATR } from '../types';
import { ema } from '../trend';

/**
 * Bollinger Bands
 */
export function bollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDev: number = 2
): BollingerBands {
  const closes = candles.map(c => c.close);
  const middle = ema(candles, period);
  const upper: number[] = [];
  const lower: number[] = [];
  const bandwidth: number[] = [];
  const percent: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1 || isNaN(middle.values[i])) {
      upper.push(NaN);
      lower.push(NaN);
      bandwidth.push(NaN);
      percent.push(NaN);
    } else {
      // Calculate standard deviation
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = middle.values[i];
      const squaredDiffs = slice.map(v => Math.pow(v - mean, 2));
      const avgSquaredDiff = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const sd = Math.sqrt(avgSquaredDiff);
      
      upper.push(mean + stdDev * sd);
      lower.push(mean - stdDev * sd);
      
      // Bandwidth: (Upper - Lower) / Middle
      bandwidth.push((upper[i] - lower[i]) / middle.values[i]);
      
      // %B: (Close - Lower) / (Upper - Lower)
      const range = upper[i] - lower[i];
      percent.push(range > 0 ? (closes[i] - lower[i]) / range : 0.5);
    }
  }
  
  return {
    upper,
    middle: middle.values,
    lower,
    bandwidth,
    percent,
    timestamps: candles.map(c => c.timestamp),
  };
}

/**
 * Average True Range (ATR)
 */
export function atr(candles: Candle[], period: number = 14): ATR {
  const values: number[] = [];
  
  if (candles.length < 2) {
    return {
      value: candles.map(() => NaN),
      timestamps: candles.map(c => c.timestamp),
    };
  }
  
  // Calculate True Range for each candle
  const trueRanges: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      // First candle: High - Low
      trueRanges.push(candles[i].high - candles[i].low);
    } else {
      const high = candles[i].high;
      const low = candles[i].low;
      const prevClose = candles[i - 1].close;
      
      const tr1 = high - low;
      const tr2 = Math.abs(high - prevClose);
      const tr3 = Math.abs(low - prevClose);
      
      trueRanges.push(Math.max(tr1, tr2, tr3));
    }
  }
  
  // Calculate smoothed ATR (Wilder's method)
  if (trueRanges.length < period) {
    return {
      value: trueRanges.map(() => NaN),
      timestamps: candles.map(c => c.timestamp),
    };
  }
  
  // First ATR is simple average
  let atrValue = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      values.push(NaN);
    } else if (i === period - 1) {
      values.push(atrValue);
    } else {
      // Wilder's smoothing: ((Prior ATR * (period - 1)) + Current TR) / period
      atrValue = ((atrValue * (period - 1)) + trueRanges[i]) / period;
      values.push(atrValue);
    }
  }
  
  return {
    value: values,
    timestamps: candles.map(c => c.timestamp),
  };
}

/**
 * Standard Deviation
 */
export function standardDeviation(
  candles: Candle[],
  period: number = 20
): IndicatorResult {
  const closes = candles.map(c => c.close);
  const values: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      values.push(NaN);
    } else {
      const slice = closes.slice(i - period + 1, i + 1);
      const mean = slice.reduce((a, b) => a + b, 0) / period;
      const squaredDiffs = slice.map(v => Math.pow(v - mean, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      values.push(Math.sqrt(variance));
    }
  }
  
  return {
    type: 'stddev',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Keltner Channel
 */
export function keltnerChannel(
  candles: Candle[],
  emaPeriod: number = 20,
  atrPeriod: number = 10,
  multiplier: number = 2
): {
  upper: number[];
  middle: number[];
  lower: number[];
  timestamps: number[];
} {
  const middle = ema(candles, emaPeriod);
  const atrValues = atr(candles, atrPeriod);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (isNaN(middle.values[i]) || isNaN(atrValues.value[i])) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      upper.push(middle.values[i] + multiplier * atrValues.value[i]);
      lower.push(middle.values[i] - multiplier * atrValues.value[i]);
    }
  }
  
  return {
    upper,
    middle: middle.values,
    lower,
    timestamps: candles.map(c => c.timestamp),
  };
}

/**
 * Donchian Channel
 */
export function donchianChannel(
  candles: Candle[],
  period: number = 20
): {
  upper: number[];
  middle: number[];
  lower: number[];
  timestamps: number[];
} {
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const upper: number[] = [];
  const middle: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      middle.push(NaN);
      lower.push(NaN);
    } else {
      const periodHigh = Math.max(...high.slice(i - period + 1, i + 1));
      const periodLow = Math.min(...low.slice(i - period + 1, i + 1));
      upper.push(periodHigh);
      lower.push(periodLow);
      middle.push((periodHigh + periodLow) / 2);
    }
  }
  
  return {
    upper,
    middle,
    lower,
    timestamps: candles.map(c => c.timestamp),
  };
}
