// Test helpers for indicators
import type { Candle } from '@forexos/types';

/**
 * Generate test candles with predictable price movements
 */
export function generateTestCandles(
  count: number,
  startPrice: number = 1.0850,
  trend: 'up' | 'down' | 'sideways' = 'sideways',
  volatility: number = 0.001
): Candle[] {
  const candles: Candle[] = [];
  let currentPrice = startPrice;

  for (let i = 0; i < count; i++) {
    let change: number;
    switch (trend) {
      case 'up':
        change = (Math.random() * volatility * 0.7) + (volatility * 0.3);
        break;
      case 'down':
        change = -(Math.random() * volatility * 0.7) - (volatility * 0.3);
        break;
      default:
        change = (Math.random() - 0.5) * volatility;
    }

    const open = currentPrice;
    const close = open * (1 + change);
    const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
    const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);

    candles.push({
      id: `test_${i}`,
      symbol: 'EURUSD',
      timeframe: 'H1',
      timestamp: Date.now() - (count - i) * 3600000,
      open,
      high,
      low,
      close,
      tickVolume: Math.floor(Math.random() * 10000) + 1000,
      spread: Math.floor(Math.random() * 10) + 5,
    });

    currentPrice = close;
  }

  return candles;
}

/**
 * Generate candles with a specific trend pattern
 */
export function generateTrendingCandles(
  startPrice: number,
  trendPoints: { price: number; timestamp: number }[]
): Candle[] {
  return trendPoints.map((point, i) => ({
    id: `trend_${i}`,
    symbol: 'EURUSD',
    timeframe: 'H1',
    timestamp: point.timestamp,
    open: point.price * 0.999,
    high: point.price * 1.001,
    low: point.price * 0.998,
    close: point.price,
    tickVolume: 5000,
    spread: 5,
  }));
}

/**
 * Generate flat candles (no movement)
 */
export function generateFlatCandles(count: number, price: number = 1.0850): Candle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `flat_${i}`,
    symbol: 'EURUSD',
    timeframe: 'H1',
    timestamp: Date.now() - (count - i) * 3600000,
    open: price,
    high: price * 1.0001,
    low: price * 0.9999,
    close: price,
    tickVolume: 5000,
    spread: 5,
  }));
}

/**
 * Generate candles with known high/low for testing
 */
export function generateTestCandleWithKnownRange(
  high: number,
  low: number,
  close: number
): Candle {
  return {
    id: 'test_candle',
    symbol: 'EURUSD',
    timeframe: 'H1',
    timestamp: Date.now(),
    open: (high + low) / 2,
    high,
    low,
    close,
    tickVolume: 5000,
    spread: 5,
  };
}

/**
 * Round to specified decimal places
 */
export function roundTo(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Check if value is approximately equal
 */
export function approxEqual(
  actual: number,
  expected: number,
  tolerance: number = 0.0001
): boolean {
  return Math.abs(actual - expected) < tolerance;
}

/**
 * Filter out NaN values
 */
export function filterNaN(values: number[]): number[] {
  return values.filter(v => !isNaN(v));
}

/**
 * Get last non-NaN value
 */
export function lastValidValue(values: number[]): number | undefined {
  for (let i = values.length - 1; i >= 0; i--) {
    if (!isNaN(values[i])) {
      return values[i];
    }
  }
  return undefined;
}
