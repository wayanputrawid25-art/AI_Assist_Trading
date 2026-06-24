// Trend Indicators
import type { Candle } from '@forexos/types';
import type { IndicatorResult, MultiValueResult } from '../types';

/**
 * Simple Moving Average (SMA)
 */
export function sma(candles: Candle[], period: number = 20): IndicatorResult {
  const closes = candles.map(c => c.close);
  const values: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      values.push(NaN);
    } else {
      const sum = closes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      values.push(sum / period);
    }
  }
  
  return {
    type: 'sma',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Exponential Moving Average (EMA)
 */
export function ema(candles: Candle[], period: number = 20): IndicatorResult {
  const closes = candles.map(c => c.close);
  const values: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First EMA is SMA
  let sum = 0;
  for (let i = 0; i < period && i < closes.length; i++) {
    sum += closes[i];
    values.push(NaN);
  }
  
  if (closes.length >= period) {
    values[period - 1] = sum / period;
    
    // Calculate EMA
    for (let i = period; i < closes.length; i++) {
      const emaValue = (closes[i] - values[i - 1]) * multiplier + values[i - 1];
      values.push(emaValue);
    }
  }
  
  return {
    type: 'ema',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Weighted Moving Average (WMA)
 */
export function wma(candles: Candle[], period: number = 20): IndicatorResult {
  const closes = candles.map(c => c.close);
  const values: number[] = [];
  const weightSum = (period * (period + 1)) / 2;
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) {
      values.push(NaN);
    } else {
      let weightedSum = 0;
      for (let j = 0; j < period; j++) {
        weightedSum += closes[i - j] * (period - j);
      }
      values.push(weightedSum / weightSum);
    }
  }
  
  return {
    type: 'wma',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Double Exponential Moving Average (DEMA)
 */
export function dema(candles: Candle[], period: number = 20): IndicatorResult {
  const ema1 = ema(candles, period);
  const ema2 = ema(candles.map((c, i) => ({ ...c, close: ema1.values[i] })), period);
  
  const values = ema1.values.map((v, i) => {
    if (isNaN(v) || isNaN(ema2.values[i])) return NaN;
    return 2 * v - ema2.values[i];
  });
  
  return {
    type: 'dema',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Triple Exponential Moving Average (TEMA)
 */
export function tema(candles: Candle[], period: number = 20): IndicatorResult {
  const ema1 = ema(candles, period);
  const ema2 = ema(candles.map((c, i) => ({ ...c, close: ema1.values[i] })), period);
  const ema3 = ema(candles.map((c, i) => ({ ...c, close: ema2.values[i] })), period);
  
  const values = ema1.values.map((v, i) => {
    if (isNaN(v) || isNaN(ema2.values[i]) || isNaN(ema3.values[i])) return NaN;
    return 3 * v - 3 * ema2.values[i] + ema3.values[i];
  });
  
  return {
    type: 'tema',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function vwap(candles: Candle[]): IndicatorResult {
  const values: number[] = [];
  let cumulativeTPV = 0;
  let cumulativeVolume = 0;
  
  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativeTPV += typicalPrice * candle.tickVolume;
    cumulativeVolume += candle.tickVolume;
    
    values.push(cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice);
  }
  
  return {
    type: 'vwap',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: {},
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Ichimoku Cloud
 */
export function ichimoku(candles: Candle[]): MultiValueResult {
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const close = candles.map(c => c.close);
  
  const tenkanPeriod = 9;
  const kijunPeriod = 26;
  const senkouBPeriod = 52;
  const displacement = 26;
  
  const tenkanSen: number[] = [];
  const kijunSen: number[] = [];
  const senkouSpanA: number[] = [];
  const senkouSpanB: number[] = [];
  const chikouSpan: number[] = [];
  
  // Calculate Tenkan-sen (Conversion Line)
  for (let i = 0; i < high.length; i++) {
    if (i < tenkanPeriod - 1) {
      tenkanSen.push(NaN);
    } else {
      const periodHigh = Math.max(...high.slice(i - tenkanPeriod + 1, i + 1));
      const periodLow = Math.min(...low.slice(i - tenkanPeriod + 1, i + 1));
      tenkanSen.push((periodHigh + periodLow) / 2);
    }
  }
  
  // Calculate Kijun-sen (Base Line)
  for (let i = 0; i < high.length; i++) {
    if (i < kijunPeriod - 1) {
      kijunSen.push(NaN);
    } else {
      const periodHigh = Math.max(...high.slice(i - kijunPeriod + 1, i + 1));
      const periodLow = Math.min(...low.slice(i - kijunPeriod + 1, i + 1));
      kijunSen.push((periodHigh + periodLow) / 2);
    }
  }
  
  // Calculate Senkou Span A (Leading Span A)
  for (let i = 0; i < high.length; i++) {
    if (i < kijunPeriod - 1) {
      senkouSpanA.push(NaN);
    } else {
      senkouSpanA.push((tenkanSen[i] + kijunSen[i]) / 2);
    }
  }
  
  // Calculate Senkou Span B (Leading Span B)
  for (let i = 0; i < high.length; i++) {
    if (i < senkouBPeriod - 1) {
      senkouSpanB.push(NaN);
    } else {
      const periodHigh = Math.max(...high.slice(i - senkouBPeriod + 1, i + 1));
      const periodLow = Math.min(...low.slice(i - senkouBPeriod + 1, i + 1));
      senkouSpanB.push((periodHigh + periodLow) / 2);
    }
  }
  
  // Calculate Chikou Span (Lagging Span)
  for (let i = 0; i < close.length; i++) {
    chikouSpan.push(close[i]);
  }
  
  return {
    type: 'Ichimoku',
    lines: [
      { name: 'tenkanSen', values: tenkanSen },
      { name: 'kijunSen', values: kijunSen },
      { name: 'senkouSpanA', values: senkouSpanA },
      { name: 'senkouSpanB', values: senkouSpanB },
      { name: 'chikouSpan', values: chikouSpan },
    ],
    timestamps: candles.map(c => c.timestamp),
    parameters: { tenkanPeriod, kijunPeriod, senkouBPeriod, displacement },
  };
}

/**
 * Get multiple moving averages at once
 */
export function getMovingAverages(
  candles: Candle[],
  periods: number[] = [9, 20, 50, 200]
): { period: number; sma: IndicatorResult; ema: IndicatorResult }[] {
  return periods.map(period => ({
    period,
    sma: sma(candles, period),
    ema: ema(candles, period),
  }));
}
