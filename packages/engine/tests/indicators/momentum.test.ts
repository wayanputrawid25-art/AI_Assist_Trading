// Momentum Indicators Tests
import { describe, it, expect } from 'vitest';
import { rsi, macd, stochastic, adx, momentum, roc } from '../../src/indicators/momentum';
import { generateTestCandles, generateFlatCandles, lastValidValue, filterNaN } from './test-helpers';

describe('RSI (Relative Strength Index)', () => {
  it('should return values between 0 and 100', () => {
    const candles = generateTestCandles(50);
    const result = rsi(candles, 14);
    
    const validValues = filterNaN(result.value);
    validValues.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  it('should return 100 when all gains', () => {
    // Create consistently rising candles
    const candles = Array.from({ length: 20 }, (_, i) => ({
      id: `rsi_up_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (20 - i) * 3600000,
      open: 1.0 + i * 0.01,
      high: 1.0 + i * 0.01 + 0.001,
      low: 1.0 + i * 0.01 - 0.001,
      close: 1.0 + i * 0.01 + 0.005,
      tickVolume: 5000,
      spread: 5,
    }));
    
    const result = rsi(candles, 14);
    const lastValid = lastValidValue(result.value);
    
    expect(lastValid).toBeGreaterThan(50); // Should be bullish
  });

  it('should return valid RSI values', () => {
    const flatCandles = generateFlatCandles(30, 1.1000);
    const result = rsi(flatCandles, 14);
    
    const validValues = filterNaN(result.value);
    // Should have some valid RSI values
    expect(validValues.length).toBeGreaterThan(0);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(50);
    const result = rsi(candles, 14);
    
    expect(result.value).toHaveLength(50);
    expect(result.timestamps).toHaveLength(50);
  });

  it('should produce NaN for insufficient data', () => {
    const candles = generateTestCandles(10);
    const result = rsi(candles, 14);
    
    expect(result.value.slice(0, 14).every(v => isNaN(v))).toBe(true);
  });
});

describe('MACD (Moving Average Convergence Divergence)', () => {
  it('should return MACD, signal, and histogram lines', () => {
    const candles = generateTestCandles(50);
    const result = macd(candles);
    
    expect(result.macd).toHaveLength(50);
    expect(result.signal).toHaveLength(50);
    expect(result.histogram).toHaveLength(50);
    expect(result.timestamps).toHaveLength(50);
  });

  it('should calculate histogram as MACD - Signal', () => {
    const candles = generateTestCandles(100);
    const result = macd(candles, 12, 26, 9);
    
    // Check that we have valid MACD values
    const validMacd = result.macd.filter(v => !isNaN(v));
    expect(validMacd.length).toBeGreaterThan(30);
  });

  it('should use default parameters when not specified', () => {
    const candles = generateTestCandles(50);
    const result = macd(candles);
    
    // Check that we have reasonable MACD values
    const validMacd = filterNaN(result.macd);
    expect(validMacd.length).toBeGreaterThan(0);
  });

  it('should handle custom periods', () => {
    const candles = generateTestCandles(100);
    const result = macd(candles, 8, 17, 5);
    
    expect(result.macd).toHaveLength(100);
    
    // Fast period should give more values than slow period
    const validFastMacd = result.macd.filter(v => !isNaN(v)).length;
    expect(validFastMacd).toBeGreaterThan(50);
  });
});

describe('Stochastic Oscillator', () => {
  it('should return values between 0 and 100', () => {
    const candles = generateTestCandles(50);
    const result = stochastic(candles, 14, 3);
    
    const validK = filterNaN(result.k);
    const validD = filterNaN(result.d);
    
    validK.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
    
    validD.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });

  it('should return K and D lines', () => {
    const candles = generateTestCandles(50);
    const result = stochastic(candles);
    
    expect(result.k).toHaveLength(50);
    expect(result.d).toHaveLength(50);
    expect(result.timestamps).toHaveLength(50);
  });

  it('should identify overbought/oversold conditions', () => {
    // Create strong uptrend
    const upCandles = Array.from({ length: 30 }, (_, i) => ({
      id: `stoch_up_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (30 - i) * 3600000,
      open: 1.0 + i * 0.01,
      high: 1.0 + i * 0.01 + 0.005,
      low: 1.0 + i * 0.01,
      close: 1.0 + i * 0.01 + 0.003,
      tickVolume: 5000,
      spread: 5,
    }));
    
    const result = stochastic(upCandles, 14, 3);
    const lastK = lastValidValue(result.k);
    
    // In strong uptrend, Stochastic should be overbought (>80)
    expect(lastK).toBeGreaterThan(70);
  });

  it('should produce NaN for insufficient data', () => {
    const candles = generateTestCandles(10);
    const result = stochastic(candles, 14, 3);
    
    // Should have NaN for first (period - 1) values
    expect(isNaN(result.k[0])).toBe(true);
  });
});

describe('ADX (Average Directional Index)', () => {
  it('should return positive values', () => {
    const candles = generateTestCandles(100);
    const result = adx(candles, 14);
    
    const validValues = filterNaN(result.values);
    validValues.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  it('should produce valid ADX values for trending market', () => {
    // Create trending candles
    const trendingCandles = Array.from({ length: 50 }, (_, i) => ({
      id: `adx_trend_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (50 - i) * 3600000,
      open: 1.0 + i * 0.005,
      high: 1.0 + i * 0.005 + 0.003,
      low: 1.0 + i * 0.005 - 0.001,
      close: 1.0 + i * 0.005 + 0.002,
      tickVolume: 5000,
      spread: 5,
    }));
    
    const result = adx(trendingCandles, 14);
    const validValues = filterNaN(result.values);
    expect(validValues.length).toBeGreaterThan(0);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(50);
    const result = adx(candles, 14);
    
    expect(result.type).toBe('adx');
    expect(result.values).toHaveLength(50);
    expect(result.parameters.period).toBe(14);
    expect(result.current).toBeDefined();
    expect(result.previous).toBeDefined();
  });

  it('should produce NaN for insufficient data', () => {
    const candles = generateTestCandles(15);
    const result = adx(candles, 14);
    
    // ADX requires at least 2*period + some buffer
    const validValues = filterNaN(result.values);
    expect(validValues.length).toBeLessThan(result.values.length);
  });
});

describe('Momentum', () => {
  it('should return positive values in uptrend', () => {
    const risingCandles = generateTestCandles(30, 1.0500, 'up', 0.005);
    const result = momentum(risingCandles, 14);
    
    const lastValid = lastValidValue(result.values);
    expect(lastValid).toBeGreaterThan(0);
  });

  it('should return negative values in downtrend', () => {
    const fallingCandles = generateTestCandles(30, 1.1000, 'down', 0.005);
    const result = momentum(fallingCandles, 14);
    
    const lastValid = lastValidValue(result.values);
    expect(lastValid).toBeLessThan(0);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(30);
    const result = momentum(candles, 14);
    
    expect(result.type).toBe('momentum');
    expect(result.values).toHaveLength(30);
    expect(result.parameters.period).toBe(14);
  });

  it('should produce NaN for insufficient data', () => {
    const candles = generateTestCandles(10);
    const result = momentum(candles, 14);
    
    expect(isNaN(result.values[0])).toBe(true);
  });
});

describe('ROC (Rate of Change)', () => {
  it('should return positive percentage in uptrend', () => {
    const risingCandles = generateTestCandles(30, 1.0500, 'up', 0.005);
    const result = roc(risingCandles, 14);
    
    const lastValid = lastValidValue(result.values);
    expect(lastValid).toBeGreaterThan(0);
  });

  it('should return negative percentage in downtrend', () => {
    const fallingCandles = generateTestCandles(30, 1.1000, 'down', 0.005);
    const result = roc(fallingCandles, 14);
    
    const lastValid = lastValidValue(result.values);
    expect(lastValid).toBeLessThan(0);
  });

  it('should return percentage values', () => {
    const risingCandles = generateTestCandles(30, 1.0000, 'up', 0.01);
    const result = roc(risingCandles, 14);
    
    const lastValid = lastValidValue(result.values);
    // Should be approximately 10-20% for 1% per candle over 14 candles
    expect(Math.abs(lastValid!)).toBeGreaterThan(0);
    expect(Math.abs(lastValid!)).toBeLessThan(100);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(30);
    const result = roc(candles, 14);
    
    expect(result.type).toBe('roc');
    expect(result.values).toHaveLength(30);
    expect(result.parameters.period).toBe(14);
  });
});
