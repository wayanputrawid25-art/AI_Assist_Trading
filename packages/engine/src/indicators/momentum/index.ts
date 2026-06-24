// Momentum Indicators
import type { Candle } from '@forexos/types';
import type { IndicatorResult, MACD, Stochastic, RSI } from '../types';

/**
 * Relative Strength Index (RSI)
 */
export function rsi(candles: Candle[], period: number = 14): RSI {
  const closes = candles.map(c => c.close);
  const values: number[] = [];
  let gains: number[] = [];
  let losses: number[] = [];
  
  // Calculate price changes
  for (let i = 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  // Calculate first average
  let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period;
  
  // First RSI value
  if (avgLoss === 0) {
    values.push(100);
  } else {
    const rs = avgGain / avgLoss;
    values.push(100 - (100 / (1 + rs)));
  }
  
  // Fill initial NaN values
  for (let i = 0; i < period; i++) {
    values.unshift(NaN);
  }
  
  // Calculate RSI using smoothed averages
  for (let i = period; i < gains.length; i++) {
    avgGain = (avgGain * (period - 1) + gains[i]) / period;
    avgLoss = (avgLoss * (period - 1) + losses[i]) / period;
    
    if (avgLoss === 0) {
      values.push(100);
    } else {
      const rs = avgGain / avgLoss;
      values.push(100 - (100 / (1 + rs)));
    }
  }
  
  return {
    value: values,
    timestamps: candles.map(c => c.timestamp),
  };
}

/**
 * Moving Average Convergence Divergence (MACD)
 */
export function macd(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MACD {
  const closes = candles.map(c => c.close);
  
  // Calculate EMAs
  const fastEMA = calculateEMA(closes, fastPeriod);
  const slowEMA = calculateEMA(closes, slowPeriod);
  
  // MACD Line = Fast EMA - Slow EMA
  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    if (isNaN(fastEMA[i]) || isNaN(slowEMA[i])) {
      macdLine.push(NaN);
    } else {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
  }
  
  // Signal Line = EMA of MACD Line
  const signalLine = calculateEMA(macdLine, signalPeriod);
  
  // Histogram = MACD Line - Signal Line
  const histogram: number[] = [];
  for (let i = 0; i < macdLine.length; i++) {
    if (isNaN(macdLine[i]) || isNaN(signalLine[i])) {
      histogram.push(NaN);
    } else {
      histogram.push(macdLine[i] - signalLine[i]);
    }
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
    timestamps: candles.map(c => c.timestamp),
  };
}

/**
 * Calculate EMA helper
 */
function calculateEMA(data: number[], period: number): number[] {
  const values: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // First value is SMA
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
    values.push(NaN);
  }
  
  if (data.length >= period) {
    values[period - 1] = sum / period;
    
    for (let i = period; i < data.length; i++) {
      const emaValue = (data[i] - values[i - 1]) * multiplier + values[i - 1];
      values.push(isNaN(values[i - 1]) ? (data[i] + sum / period) / 2 : emaValue);
    }
  }
  
  return values;
}

/**
 * Stochastic Oscillator
 */
export function stochastic(
  candles: Candle[],
  kPeriod: number = 14,
  dPeriod: number = 3,
  smoothK: number = 3
): Stochastic {
  const kValues: number[] = [];
  
  // Calculate %K
  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      kValues.push(NaN);
    } else {
      const periodCandles = candles.slice(i - kPeriod + 1, i + 1);
      const highestHigh = Math.max(...periodCandles.map(c => c.high));
      const lowestLow = Math.min(...periodCandles.map(c => c.low));
      const currentClose = candles[i].close;
      
      const range = highestHigh - lowestLow;
      if (range === 0) {
        kValues.push(50); // Default to middle if no range
      } else {
        kValues.push(((currentClose - lowestLow) / range) * 100);
      }
    }
  }
  
  // Smooth %K (if smoothK > 1)
  const smoothedK: number[] = [];
  if (smoothK > 1) {
    for (let i = 0; i < kValues.length; i++) {
      if (i < smoothK - 1 || isNaN(kValues[i])) {
        smoothedK.push(NaN);
      } else {
        const sum = kValues.slice(i - smoothK + 1, i + 1)
          .filter(v => !isNaN(v))
          .reduce((a, b) => a + b, 0);
        const count = kValues.slice(i - smoothK + 1, i + 1).filter(v => !isNaN(v)).length;
        smoothedK.push(sum / count);
      }
    }
  } else {
    smoothedK.push(...kValues);
  }
  
  // Calculate %D (SMA of %K)
  const dValues: number[] = [];
  for (let i = 0; i < smoothedK.length; i++) {
    if (i < dPeriod - 1 || isNaN(smoothedK[i])) {
      dValues.push(NaN);
    } else {
      const sum = smoothedK.slice(i - dPeriod + 1, i + 1)
        .filter(v => !isNaN(v))
        .reduce((a, b) => a + b, 0);
      const count = smoothedK.slice(i - dPeriod + 1, i + 1).filter(v => !isNaN(v)).length;
      dValues.push(sum / count);
    }
  }
  
  return {
    k: smoothedK,
    d: dValues,
    timestamps: candles.map(c => c.timestamp),
  };
}

/**
 * Average Directional Index (ADX)
 */
export function adx(candles: Candle[], period: number = 14): IndicatorResult {
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);
  const close = candles.map(c => c.close);
  
  // Calculate True Range and Directional Movement
  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];
  
  for (let i = 1; i < candles.length; i++) {
    const currentHigh = high[i];
    const currentLow = low[i];
    const prevHigh = high[i - 1];
    const prevLow = low[i - 1];
    const prevClose = close[i - 1];
    
    // True Range
    const tr1 = currentHigh - currentLow;
    const tr2 = Math.abs(currentHigh - prevClose);
    const tr3 = Math.abs(currentLow - prevClose);
    tr.push(Math.max(tr1, tr2, tr3));
    
    // Directional Movement
    const upMove = currentHigh - prevHigh;
    const downMove = prevLow - currentLow;
    
    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }
    
    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }
  
  // Calculate smoothed averages
  const smoothedTR = smoothValues(tr, period);
  const smoothedPlusDM = smoothValues(plusDM, period);
  const smoothedMinusDM = smoothValues(minusDM, period);
  
  // Calculate DI+ and DI-
  const plusDI: number[] = [];
  const minusDI: number[] = [];
  const dx: number[] = [];
  
  for (let i = 0; i < smoothedTR.length; i++) {
    if (smoothedTR[i] === 0 || isNaN(smoothedTR[i])) {
      plusDI.push(0);
      minusDI.push(0);
      dx.push(NaN);
    } else {
      const pdm = smoothedPlusDM[i] || 0;
      const mdm = smoothedMinusDM[i] || 0;
      plusDI.push((pdm / smoothedTR[i]) * 100);
      minusDI.push((mdm / smoothedTR[i]) * 100);
      
      const sumDI = plusDI[i] + minusDI[i];
      if (sumDI === 0) {
        dx.push(0);
      } else {
        dx.push(Math.abs((plusDI[i] - minusDI[i]) / sumDI) * 100);
      }
    }
  }
  
  // Calculate ADX (smoothed DX)
  const adxValues = smoothValues(dx, period);
  
  // Pad with NaN at the beginning
  const padLength = candles.length - adxValues.length;
  const values = Array(padLength).fill(NaN).concat(adxValues);
  
  return {
    type: 'adx',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Smooth values using Wilder's smoothing method
 */
function smoothValues(data: number[], period: number): number[] {
  if (data.length < period) return [];
  
  const smoothed: number[] = [];
  
  // First value is simple sum
  let sum = data.slice(0, period).reduce((a, b) => a + b, 0);
  smoothed.push(sum);
  
  // Subsequent values use Wilder's smoothing
  for (let i = period; i < data.length; i++) {
    sum = sum - (sum / period) + data[i];
    smoothed.push(sum);
  }
  
  return smoothed;
}

/**
 * Momentum
 */
export function momentum(candles: Candle[], period: number = 14): IndicatorResult {
  const closes = candles.map(c => c.close);
  const values: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      values.push(NaN);
    } else {
      values.push(closes[i] - closes[i - period]);
    }
  }
  
  return {
    type: 'momentum',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Rate of Change (ROC)
 */
export function roc(candles: Candle[], period: number = 14): IndicatorResult {
  const closes = candles.map(c => c.close);
  const values: number[] = [];
  
  for (let i = 0; i < closes.length; i++) {
    if (i < period) {
      values.push(NaN);
    } else {
      values.push(((closes[i] - closes[i - period]) / closes[i - period]) * 100);
    }
  }
  
  return {
    type: 'roc',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}
