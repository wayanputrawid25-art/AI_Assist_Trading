// Volume Indicators Tests
import { describe, it, expect } from 'vitest';
import { obv, volumeSMA, adl, cmf, vpt, eom, vwapVolume } from '../../src/indicators/volume';
import { generateTestCandles, filterNaN, lastValidValue } from './test-helpers';

describe('OBV (On Balance Volume)', () => {
  it('should accumulate volume', () => {
    const candles = generateTestCandles(20);
    const result = obv(candles);
    
    expect(result.values).toHaveLength(20);
    expect(result.current).toBeDefined();
  });

  it('should increase when price goes up', () => {
    const upCandles = Array.from({ length: 10 }, (_, i) => ({
      id: `obv_up_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (10 - i) * 3600000,
      open: 1.0 + i * 0.01,
      high: 1.0 + i * 0.01 + 0.001,
      low: 1.0 + i * 0.01 - 0.001,
      close: 1.0 + i * 0.01 + 0.005,
      tickVolume: 1000,
      spread: 5,
    }));
    
    const result = obv(upCandles);
    
    // OBV should generally increase
    expect(result.values[result.values.length - 1]).toBeGreaterThan(result.values[0]);
  });

  it('should decrease when price goes down', () => {
    const downCandles = Array.from({ length: 10 }, (_, i) => ({
      id: `obv_down_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (10 - i) * 3600000,
      open: 1.1 - i * 0.01,
      high: 1.1 - i * 0.01 + 0.001,
      low: 1.1 - i * 0.01 - 0.001,
      close: 1.1 - i * 0.01 - 0.005,
      tickVolume: 1000,
      spread: 5,
    }));
    
    const result = obv(downCandles);
    
    // OBV should generally decrease
    expect(result.values[result.values.length - 1]).toBeLessThan(result.values[0]);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(20);
    const result = obv(candles);
    
    expect(result.type).toBe('obv');
    expect(result.values).toHaveLength(20);
    expect(result.timestamps).toHaveLength(20);
  });
});

describe('Volume SMA', () => {
  it('should return moving average of volume', () => {
    const candles = generateTestCandles(50);
    const result = volumeSMA(candles, 20);
    
    expect(result.values).toHaveLength(50);
  });

  it('should produce NaN for insufficient data', () => {
    const candles = generateTestCandles(10);
    const result = volumeSMA(candles, 20);
    
    expect(result.values.slice(0, 19).every(v => isNaN(v))).toBe(true);
  });

  it('should smooth volume data', () => {
    const candles = generateTestCandles(50);
    const result = volumeSMA(candles, 10);
    
    const validValues = filterNaN(result.values);
    // Values should not change drastically
    const differences: number[] = [];
    for (let i = 1; i < validValues.length; i++) {
      differences.push(Math.abs(validValues[i] - validValues[i - 1]));
    }
    const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
    const avgVolume = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    
    // Changes should be small relative to volume
    expect(avgDiff / avgVolume).toBeLessThan(0.5);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(30);
    const result = volumeSMA(candles, 15);
    
    expect(result.type).toBe('vwap_vol');
    expect(result.parameters.period).toBe(15);
  });
});

describe('ADL (Accumulation/Distribution Line)', () => {
  it('should accumulate money flow', () => {
    const candles = generateTestCandles(30);
    const result = adl(candles);
    
    expect(result.values).toHaveLength(30);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(20);
    const result = adl(candles);
    
    expect(result.type).toBe('adl');
    expect(result.values).toHaveLength(20);
  });

  it('should increase with accumulation (uptrend with volume)', () => {
    const accumulativeCandles = Array.from({ length: 15 }, (_, i) => ({
      id: `adl_accum_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (15 - i) * 3600000,
      open: 1.0 + i * 0.01,
      high: 1.0 + i * 0.01 + 0.005,
      low: 1.0 + i * 0.01 - 0.001,
      close: 1.0 + i * 0.01 + 0.003,
      tickVolume: 1000,
      spread: 5,
    }));
    
    const result = adl(accumulativeCandles);
    
    // ADL should increase during accumulation
    expect(result.values[result.values.length - 1]).toBeGreaterThan(result.values[0]);
  });
});

describe('CMF (Chaikin Money Flow)', () => {
  it('should return values between -1 and 1', () => {
    const candles = generateTestCandles(50);
    const result = cmf(candles, 20);
    
    const validValues = filterNaN(result.values);
    validValues.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(-1);
      expect(value).toBeLessThanOrEqual(1);
    });
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(30);
    const result = cmf(candles, 20);
    
    expect(result.type).toBe('cmf');
    expect(result.values).toHaveLength(30);
    expect(result.parameters.period).toBe(20);
  });

  it('should produce NaN for insufficient data', () => {
    const candles = generateTestCandles(10);
    const result = cmf(candles, 20);
    
    expect(result.values.slice(0, 19).every(v => isNaN(v))).toBe(true);
  });

  it('should indicate buying pressure with positive values', () => {
    const buyingCandles = Array.from({ length: 30 }, (_, i) => ({
      id: `cmf_buy_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (30 - i) * 3600000,
      open: 1.0 + i * 0.005,
      high: 1.0 + i * 0.005 + 0.003,
      low: 1.0 + i * 0.005 - 0.001,
      close: 1.0 + i * 0.005 + 0.002,
      tickVolume: 1000,
      spread: 5,
    }));
    
    const result = cmf(buyingCandles, 20);
    const lastValid = lastValidValue(result.values);
    
    // Should show positive money flow
    expect(lastValid).toBeGreaterThan(0);
  });
});

describe('VPT (Volume Price Trend)', () => {
  it('should combine volume and price change', () => {
    const candles = generateTestCandles(30);
    const result = vpt(candles);
    
    expect(result.values).toHaveLength(30);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(20);
    const result = vpt(candles);
    
    expect(result.type).toBe('vpt');
    expect(result.values).toHaveLength(20);
  });

  it('should increase in uptrend with volume', () => {
    const upCandles = Array.from({ length: 20 }, (_, i) => ({
      id: `vpt_up_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (20 - i) * 3600000,
      open: 1.0 + i * 0.01,
      high: 1.0 + i * 0.01 + 0.002,
      low: 1.0 + i * 0.01 - 0.001,
      close: 1.0 + i * 0.01 + 0.001,
      tickVolume: 1000,
      spread: 5,
    }));
    
    const result = vpt(upCandles);
    
    // VPT should increase in uptrend
    expect(result.values[result.values.length - 1]).toBeGreaterThan(result.values[0]);
  });
});

describe('EOM (Ease of Movement)', () => {
  it('should return values', () => {
    const candles = generateTestCandles(30);
    const result = eom(candles, 14);
    
    expect(result.values).toHaveLength(30);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(30);
    const result = eom(candles, 14);
    
    expect(result.type).toBe('eom');
    expect(result.parameters.period).toBe(14);
  });

  it('should smooth values with SMA', () => {
    const candles = generateTestCandles(30);
    const result = eom(candles, 14);
    
    // Should have some NaN values at start
    expect(isNaN(result.values[0])).toBe(true);
  });
});

describe('VWAP Volume', () => {
  it('should return volume-weighted average', () => {
    const candles = generateTestCandles(20);
    const result = vwapVolume(candles);
    
    expect(result.values).toHaveLength(20);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(20);
    const result = vwapVolume(candles);
    
    expect(result.type).toBe('vwap');
    expect(result.current).toBeDefined();
    expect(result.previous).toBeDefined();
  });

  it('should use typical price', () => {
    const singleCandle = [{
      id: 'vwap_test',
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now(),
      open: 1.1000,
      high: 1.1010,
      low: 1.0990,
      close: 1.1005,
      tickVolume: 10000,
      spread: 5,
    }];
    
    const result = vwapVolume(singleCandle);
    const typicalPrice = (1.1010 + 1.0990 + 1.1005) / 3;
    
    expect(result.current).toBeCloseTo(typicalPrice, 4);
  });
});
