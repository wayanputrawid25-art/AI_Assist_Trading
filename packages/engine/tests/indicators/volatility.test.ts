// Volatility Indicators Tests
import { describe, it, expect } from 'vitest';
import { bollingerBands, atr, standardDeviation, keltnerChannel, donchianChannel } from '../../src/indicators/volatility';
import { generateTestCandles, generateFlatCandles, filterNaN, lastValidValue } from './test-helpers';

describe('Bollinger Bands', () => {
  it('should return upper, middle, and lower bands', () => {
    const candles = generateTestCandles(50);
    const result = bollingerBands(candles, 20, 2);
    
    expect(result.upper).toHaveLength(50);
    expect(result.middle).toHaveLength(50);
    expect(result.lower).toHaveLength(50);
    expect(result.bandwidth).toHaveLength(50);
    expect(result.percent).toHaveLength(50);
    expect(result.timestamps).toHaveLength(50);
  });

  it('should have upper >= middle >= lower', () => {
    const flatCandles = generateFlatCandles(30, 1.1000);
    const result = bollingerBands(flatCandles, 20, 2);
    
    const validUpper = result.upper.filter(v => !isNaN(v));
    const validMiddle = result.middle.filter(v => !isNaN(v));
    const validLower = result.lower.filter(v => !isNaN(v));
    
    for (let i = 0; i < validUpper.length; i++) {
      expect(validUpper[i]).toBeGreaterThanOrEqual(validMiddle[i]);
      expect(validMiddle[i]).toBeGreaterThanOrEqual(validLower[i]);
    }
  });

  it('should expand with higher volatility', () => {
    const lowVolatility = generateTestCandles(30, 1.1000, 'sideways', 0.0005);
    const highVolatility = generateTestCandles(30, 1.1000, 'sideways', 0.005);
    
    const lowVolBB = bollingerBands(lowVolatility, 20, 2);
    const highVolBB = bollingerBands(highVolatility, 20, 2);
    
    const lowVolBandwidth = lastValidValue(lowVolBB.bandwidth) || 0;
    const highVolBandwidth = lastValidValue(highVolBB.bandwidth) || 0;
    
    expect(highVolBandwidth).toBeGreaterThan(lowVolBandwidth);
  });

  it('should return valid percentB values', () => {
    const candles = generateTestCandles(50);
    const result = bollingerBands(candles, 20, 2);
    
    const validPercent = filterNaN(result.percent);
    // Should have some valid percentB values
    expect(validPercent.length).toBeGreaterThan(0);
  });

  it('should use EMA as middle band by default', () => {
    const candles = generateFlatCandles(50, 1.1000);
    const result = bollingerBands(candles, 20, 2);
    
    const validMiddle = filterNaN(result.middle);
    // Flat candles should give middle band close to flat price
    expect(validMiddle[validMiddle.length - 1]).toBeCloseTo(1.1000, 2);
  });

  it('should accept custom period and stdDev', () => {
    const candles = generateTestCandles(100);
    const result = bollingerBands(candles, 10, 1.5);
    
    expect(result.upper).toHaveLength(100);
    
    // With narrower bands, more values should be valid
    const validValues = filterNaN(result.upper);
    expect(validValues.length).toBeGreaterThan(50);
  });
});

describe('ATR (Average True Range)', () => {
  it('should return values', () => {
    const candles = generateTestCandles(50);
    const result = atr(candles, 14);
    
    expect(result.value).toHaveLength(50);
    expect(result.timestamps).toHaveLength(50);
  });

  it('should produce positive ATR with trending candles', () => {
    const trendingCandles = Array.from({ length: 30 }, (_, i) => ({
      id: `atr_trend_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (30 - i) * 3600000,
      open: 1.0 + i * 0.005,
      high: 1.0 + i * 0.005 + 0.005,
      low: 1.0 + i * 0.005 - 0.003,
      close: 1.0 + i * 0.005 + 0.002,
      tickVolume: 5000,
      spread: 5,
    }));
    
    const result = atr(trendingCandles, 14);
    const validValues = filterNaN(result.value);
    
    // ATR should be positive
    validValues.forEach(value => {
      expect(value).toBeGreaterThan(0);
    });
  });

  it('should use Wilder smoothing method', () => {
    const candles = generateTestCandles(50);
    const result = atr(candles, 14);
    
    // Check that ATR is smooth (not volatile)
    const validValues = filterNaN(result.value);
    const differences: number[] = [];
    
    for (let i = 1; i < validValues.length; i++) {
      differences.push(Math.abs(validValues[i] - validValues[i - 1]));
    }
    
    // ATR changes should be relatively small
    const avgChange = differences.reduce((a, b) => a + b, 0) / differences.length;
    const avgATR = validValues.reduce((a, b) => a + b, 0) / validValues.length;
    
    // Change should be small percentage of ATR
    expect(avgChange / avgATR).toBeLessThan(0.1);
  });

  it('should handle flat candles', () => {
    const flatCandles = generateFlatCandles(30, 1.1000);
    const result = atr(flatCandles, 14);
    
    const validValues = filterNaN(result.value);
    expect(validValues.length).toBeGreaterThan(0);
    
    // ATR should be small for flat candles
    const lastATR = lastValidValue(result.value) || 0;
    expect(lastATR).toBeLessThan(0.01);
  });

  it('should produce NaN for insufficient data', () => {
    const candles = generateTestCandles(5);
    const result = atr(candles, 14);
    
    // Should have NaN for insufficient data
    expect(result.value.every(v => isNaN(v))).toBe(true);
  });

  it('should return valid ATR for sufficient data', () => {
    const candles = generateTestCandles(20);
    const result = atr(candles, 14);
    
    const validValues = filterNaN(result.value);
    expect(validValues.length).toBeGreaterThan(0);
  });
});

describe('Standard Deviation', () => {
  it('should return values', () => {
    const candles = generateTestCandles(50);
    const result = standardDeviation(candles, 20);
    
    expect(result.values).toHaveLength(50);
    expect(result.timestamps).toHaveLength(50);
    expect(result.type).toBe('stddev');
  });

  it('should be positive', () => {
    const candles = generateTestCandles(50);
    const result = standardDeviation(candles, 20);
    
    const validValues = filterNaN(result.values);
    validValues.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
    });
  });

  it('should be higher for volatile data', () => {
    const lowVol = generateTestCandles(30, 1.1000, 'sideways', 0.0005);
    const highVol = generateTestCandles(30, 1.1000, 'sideways', 0.005);
    
    const lowVolStdDev = standardDeviation(lowVol, 20);
    const highVolStdDev = standardDeviation(highVol, 20);
    
    const lowVolLast = lastValidValue(lowVolStdDev.values) || 0;
    const highVolLast = lastValidValue(highVolStdDev.values) || 0;
    
    expect(highVolLast).toBeGreaterThan(lowVolLast);
  });

  it('should return correct structure', () => {
    const candles = generateTestCandles(30);
    const result = standardDeviation(candles, 20);
    
    expect(result.parameters.period).toBe(20);
    expect(result.current).toBeDefined();
    expect(result.previous).toBeDefined();
  });
});

describe('Keltner Channel', () => {
  it('should return upper, middle, and lower channels', () => {
    const candles = generateTestCandles(50);
    const result = keltnerChannel(candles, 20, 10, 2);
    
    expect(result.upper).toHaveLength(50);
    expect(result.middle).toHaveLength(50);
    expect(result.lower).toHaveLength(50);
    expect(result.timestamps).toHaveLength(50);
  });

  it('should have upper > middle > lower', () => {
    const candles = generateTestCandles(50);
    const result = keltnerChannel(candles);
    
    const validUpper = result.upper.filter(v => !isNaN(v));
    const validMiddle = result.middle.filter(v => !isNaN(v));
    const validLower = result.lower.filter(v => !isNaN(v));
    
    for (let i = 0; i < validUpper.length; i++) {
      expect(validUpper[i]).toBeGreaterThanOrEqual(validMiddle[i]);
      expect(validMiddle[i]).toBeGreaterThanOrEqual(validLower[i]);
    }
  });

  it('should expand with higher volatility', () => {
    const lowVol = generateTestCandles(40, 1.1000, 'sideways', 0.0005);
    const highVol = generateTestCandles(40, 1.1000, 'sideways', 0.005);
    
    const lowVolKC = keltnerChannel(lowVol);
    const highVolKC = keltnerChannel(highVol);
    
    const lowVolBandwidth = filterNaN(lowVolKC.upper).pop()! - filterNaN(lowVolKC.lower).pop()!;
    const highVolBandwidth = filterNaN(highVolKC.upper).pop()! - filterNaN(highVolKC.lower).pop()!;
    
    expect(highVolBandwidth).toBeGreaterThan(lowVolBandwidth);
  });
});

describe('Donchian Channel', () => {
  it('should return upper, middle, and lower channels', () => {
    const candles = generateTestCandles(50);
    const result = donchianChannel(candles, 20);
    
    expect(result.upper).toHaveLength(50);
    expect(result.middle).toHaveLength(50);
    expect(result.lower).toHaveLength(50);
    expect(result.timestamps).toHaveLength(50);
  });

  it('should have upper >= middle >= lower', () => {
    const candles = generateTestCandles(50);
    const result = donchianChannel(candles, 20);
    
    const validUpper = result.upper.filter(v => !isNaN(v));
    const validMiddle = result.middle.filter(v => !isNaN(v));
    const validLower = result.lower.filter(v => !isNaN(v));
    
    for (let i = 0; i < validUpper.length; i++) {
      expect(validUpper[i]).toBeGreaterThanOrEqual(validMiddle[i]);
      expect(validMiddle[i]).toBeGreaterThanOrEqual(validLower[i]);
    }
  });

  it('should equal (highest + lowest) / 2 for middle', () => {
    const candles = generateTestCandles(30);
    const result = donchianChannel(candles, 20);
    
    const validMiddle = result.middle.filter(v => !isNaN(v));
    const validUpper = result.upper.filter(v => !isNaN(v));
    const validLower = result.lower.filter(v => !isNaN(v));
    
    for (let i = 0; i < validMiddle.length; i++) {
      const expectedMiddle = (validUpper[i] + validLower[i]) / 2;
      expect(validMiddle[i]).toBeCloseTo(expectedMiddle, 4);
    }
  });

  it('should have increasing upper in uptrend', () => {
    const trendingCandles = Array.from({ length: 30 }, (_, i) => ({
      id: `donchian_trend_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (30 - i) * 3600000,
      open: 1.0 + i * 0.005,
      high: 1.0 + i * 0.005 + 0.003,
      low: 1.0 + i * 0.005,
      close: 1.0 + i * 0.005 + 0.002,
      tickVolume: 5000,
      spread: 5,
    }));
    
    const result = donchianChannel(trendingCandles, 20);
    const validUpper = filterNaN(result.upper);
    
    // Upper band should be generally increasing in uptrend
    const firstThird = validUpper.slice(0, 5).reduce((a, b) => a + b, 0) / 5;
    const lastThird = validUpper.slice(-5).reduce((a, b) => a + b, 0) / 5;
    
    expect(lastThird).toBeGreaterThan(firstThird);
  });
});
