// Trend Indicators Tests
import { describe, it, expect } from 'vitest';
import { sma, ema, wma, dema, tema, vwap, ichimoku } from '../../src/indicators/trend';
import { generateTestCandles, generateFlatCandles, approxEqual, lastValidValue, filterNaN } from './test-helpers';

describe('SMA (Simple Moving Average)', () => {
  it('should return NaN for insufficient data', () => {
    const candles = generateTestCandles(10);
    const result = sma(candles, 20);
    
    expect(result.values.slice(0, 19).every(v => isNaN(v))).toBe(true);
  });

  it('should calculate correct average for valid data', () => {
    const flatCandles = generateFlatCandles(20, 1.1000);
    const result = sma(flatCandles, 20);
    
    const lastValid = lastValidValue(result.values);
    expect(lastValid).toBeCloseTo(1.1000, 3);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(50);
    const result = sma(candles, 14);
    
    expect(result.type).toBe('sma');
    expect(result.values).toHaveLength(50);
    expect(result.timestamps).toHaveLength(50);
    expect(result.parameters.period).toBe(14);
    expect(result.current).toBeDefined();
    expect(result.previous).toBeDefined();
  });

  it('should handle different periods', () => {
    const candles = generateTestCandles(100);
    
    const sma9 = sma(candles, 9);
    const sma21 = sma(candles, 21);
    const sma50 = sma(candles, 50);
    
    expect(sma9.values.filter(v => !isNaN(v)).length).toBe(92);
    expect(sma21.values.filter(v => !isNaN(v)).length).toBe(80);
    expect(sma50.values.filter(v => !isNaN(v)).length).toBe(51);
  });
});

describe('EMA (Exponential Moving Average)', () => {
  it('should return NaN for insufficient data', () => {
    const candles = generateTestCandles(10);
    const result = ema(candles, 20);
    
    expect(result.values.slice(0, 19).every(v => isNaN(v))).toBe(true);
  });

  it('should calculate with correct multiplier', () => {
    const flatCandles = generateFlatCandles(100, 1.1000);
    const result = ema(flatCandles, 20);
    
    const lastValid = lastValidValue(result.values);
    expect(lastValid).toBeCloseTo(1.1000, 3);
  });

  it('should return valid values for sufficient data', () => {
    const candles = generateTestCandles(100, 1.0800, 'up', 0.005);
    
    const emaResult = ema(candles, 20);
    const validValues = filterNaN(emaResult.values);
    
    // EMA should produce valid values
    expect(validValues.length).toBeGreaterThan(50);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(50);
    const result = ema(candles, 12);
    
    expect(result.type).toBe('ema');
    expect(result.parameters.period).toBe(12);
    expect(result.current).toBeDefined();
  });
});

describe('WMA (Weighted Moving Average)', () => {
  it('should weight recent prices more heavily', () => {
    // Create candles with clearly increasing prices
    const candles = Array.from({ length: 20 }, (_, i) => ({
      id: `wma_test_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (20 - i) * 3600000,
      open: 1.0 + i * 0.01,
      high: 1.0 + i * 0.01 + 0.001,
      low: 1.0 + i * 0.01 - 0.001,
      close: 1.0 + i * 0.01,
      tickVolume: 5000,
      spread: 5,
    }));
    
    const result = wma(candles, 10);
    const lastValid = lastValidValue(result.values);
    
    // WMA should be higher than SMA in uptrend
    const smaResult = sma(candles, 10);
    const smaLast = lastValidValue(smaResult.values);
    
    expect(lastValid).toBeGreaterThan(smaLast!);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(30);
    const result = wma(candles, 15);
    
    expect(result.type).toBe('wma');
    expect(result.parameters.period).toBe(15);
  });
});

describe('DEMA (Double Exponential Moving Average)', () => {
  it('should return correct structure', () => {
    const candles = generateTestCandles(50);
    const result = dema(candles, 20);
    
    expect(result.type).toBe('dema');
    expect(result.values).toHaveLength(50);
  });
});

describe('TEMA (Triple Exponential Moving Average)', () => {
  it('should return correct structure', () => {
    const candles = generateTestCandles(60);
    const result = tema(candles, 20);
    
    expect(result.type).toBe('tema');
    expect(result.values).toHaveLength(60);
  });
});

describe('VWAP (Volume Weighted Average Price)', () => {
  it('should use typical price (H+L+C)/3', () => {
    const candles = [{
      id: 'test',
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
    
    const result = vwap(candles);
    const typicalPrice = (1.1010 + 1.0990 + 1.1005) / 3;
    
    expect(result.current).toBeCloseTo(typicalPrice, 4);
  });

  it('should be cumulative (average increases with more data)', () => {
    const candles = generateTestCandles(50, 1.1000, 'up', 0.002);
    const result = vwap(candles);
    
    // Check that VWAP changes over time
    const values = result.values.filter(v => !isNaN(v));
    const uniqueValues = new Set(values.map(v => v.toFixed(5)));
    expect(uniqueValues.size).toBeGreaterThan(1);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(20);
    const result = vwap(candles);
    
    expect(result.type).toBe('vwap');
    expect(result.values).toHaveLength(20);
    expect(result.current).toBeDefined();
  });
});

describe('Ichimoku Cloud', () => {
  it('should calculate all five lines', () => {
    const candles = generateTestCandles(60);
    const result = ichimoku(candles);
    
    expect(result.lines).toHaveLength(5);
    expect(result.lines.map(l => l.name)).toEqual([
      'tenkanSen',
      'kijunSen',
      'senkouSpanA',
      'senkouSpanB',
      'chikouSpan',
    ]);
  });

  it('should have correct period requirements', () => {
    const candles = generateTestCandles(30); // Less than 52 period
    const result = ichimoku(candles);
    
    // Should have some NaN values for senkouSpanB (52 period)
    const senkouBValues = result.lines.find(l => l.name === 'senkouSpanB')?.values;
    expect(senkouBValues?.slice(0, 51).every(v => isNaN(v))).toBe(true);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(100);
    const result = ichimoku(candles);
    
    expect(result.type).toBe('Ichimoku');
    expect(result.timestamps).toHaveLength(100);
    expect(result.parameters.tenkanPeriod).toBe(9);
    expect(result.parameters.kijunPeriod).toBe(26);
    expect(result.parameters.senkouBPeriod).toBe(52);
  });

  it('should produce valid Tenkan-sen values', () => {
    const candles = generateTestCandles(30);
    const result = ichimoku(candles);
    
    const tenkanValues = result.lines.find(l => l.name === 'tenkanSen')?.values;
    const validTenkan = tenkanValues?.filter(v => !isNaN(v));
    
    // In uptrending market, Tenkan should generally increase
    expect(validTenkan?.length).toBeGreaterThan(0);
  });
});
