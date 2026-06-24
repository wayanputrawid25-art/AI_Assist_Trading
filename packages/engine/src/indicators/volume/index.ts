// Volume Indicators
import type { Candle } from '@forexos/types';
import type { IndicatorResult } from '../types';

/**
 * On Balance Volume (OBV)
 */
export function obv(candles: Candle[]): IndicatorResult {
  const values: number[] = [];
  let cumulative = 0;
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      values.push(candles[i].tickVolume);
      cumulative = candles[i].tickVolume;
    } else {
      if (candles[i].close > candles[i - 1].close) {
        cumulative += candles[i].tickVolume;
      } else if (candles[i].close < candles[i - 1].close) {
        cumulative -= candles[i].tickVolume;
      }
      values.push(cumulative);
    }
  }
  
  return {
    type: 'obv',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: {},
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Volume SMA
 */
export function volumeSMA(candles: Candle[], period: number = 20): IndicatorResult {
  const volumes = candles.map(c => c.tickVolume);
  const values: number[] = [];
  
  for (let i = 0; i < volumes.length; i++) {
    if (i < period - 1) {
      values.push(NaN);
    } else {
      const sum = volumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      values.push(sum / period);
    }
  }
  
  return {
    type: 'vwap_vol',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Accumulation/Distribution Line (A/D)
 */
export function adl(candles: Candle[]): IndicatorResult {
  const values: number[] = [];
  let cumulative = 0;
  
  for (let i = 0; i < candles.length; i++) {
    const { high, low, close, tickVolume } = candles[i];
    
    // Money Flow Multiplier
    const range = high - low;
    let mfm: number;
    let mfv: number;
    
    if (range === 0) {
      mfm = 0;
      mfv = 0;
    } else {
      mfm = ((close - low) - (high - close)) / range;
      mfv = mfm * tickVolume;
    }
    
    cumulative += mfv;
    values.push(cumulative);
  }
  
  return {
    type: 'adl',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: {},
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Chaikin Money Flow (CMF)
 */
export function cmf(candles: Candle[], period: number = 20): IndicatorResult {
  const mfvValues: number[] = [];
  const volumeSum: number[] = [];
  
  // Calculate money flow volume for each candle
  for (let i = 0; i < candles.length; i++) {
    const { high, low, close, tickVolume } = candles[i];
    const range = high - low;
    
    let mfv: number;
    if (range === 0) {
      mfv = 0;
    } else {
      const mfm = ((close - low) - (high - close)) / range;
      mfv = mfm * tickVolume;
    }
    mfvValues.push(mfv);
  }
  
  // Calculate CMF
  const values: number[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      values.push(NaN);
    } else {
      const periodMFV = mfvValues.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      const periodVolume = candles.slice(i - period + 1, i + 1)
        .reduce((sum, c) => sum + c.tickVolume, 0);
      
      values.push(periodVolume > 0 ? periodMFV / periodVolume : 0);
    }
  }
  
  return {
    type: 'cmf',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Volume Price Trend (VPT)
 */
export function vpt(candles: Candle[]): IndicatorResult {
  const values: number[] = [];
  let cumulative = 0;
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      cumulative = candles[i].tickVolume;
      values.push(cumulative);
    } else {
      const priceChange = ((candles[i].close - candles[i - 1].close) / candles[i - 1].close) * 100;
      cumulative += candles[i].tickVolume * (priceChange / 100);
      values.push(cumulative);
    }
  }
  
  return {
    type: 'vpt',
    values,
    timestamps: candles.map(c => c.timestamp),
    parameters: {},
    current: values[values.length - 1],
    previous: values[values.length - 2],
  };
}

/**
 * Ease of Movement (EOM)
 */
export function eom(candles: Candle[], period: number = 14): IndicatorResult {
  const values: number[] = [];
  
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      values.push(NaN);
    } else {
      const { high, low, tickVolume } = candles[i];
      const { close: prevClose } = candles[i - 1];
      
      const range = high - low;
      if (range === 0) {
        values.push(0);
      } else {
        const distanceMoved = ((high + low) / 2) - ((prevClose + (high > prevClose ? high : low)) / 2);
        const boxRatio = (tickVolume / 1000000) / range;
        values.push(distanceMoved / boxRatio);
      }
    }
  }
  
  // Smooth with SMA
  const smoothedValues: number[] = [];
  for (let i = 0; i < values.length; i++) {
    if (i < period - 1) {
      smoothedValues.push(NaN);
    } else {
      const sum = values.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      smoothedValues.push(sum / period);
    }
  }
  
  return {
    type: 'eom',
    values: smoothedValues,
    timestamps: candles.map(c => c.timestamp),
    parameters: { period },
    current: smoothedValues[smoothedValues.length - 1],
    previous: smoothedValues[smoothedValues.length - 2],
  };
}

/**
 * VWAP (Volume Weighted Average Price) - Volume indicator version
 */
export function vwapVolume(candles: Candle[]): IndicatorResult {
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
