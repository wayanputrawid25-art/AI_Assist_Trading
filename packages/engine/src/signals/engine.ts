// Signal Engine - Multi-Source Signal Aggregation and Scoring
import type { Candle, Timeframe } from '@forexos/types';
import { rsi, macd, stochastic, adx } from '../indicators/momentum';
import { ema, sma } from '../indicators/trend';
import { atr } from '../indicators/volatility';
import { analyzeTrend } from '../trend/engine';
import type { TrendAnalysis } from '../trend/types';
import { detectAllChartPatterns } from '../patterns/chart';
import { detectAllCandlestickPatterns } from '../patterns/candlestick';
import { calculateSupportResistance } from '../patterns/chart';
import type { PatternSignal } from '../patterns/types';
import {
  type Signal,
  type SignalSource,
  type SignalDirection,
  type SignalCategory,
  type AggregatedSignal,
  type ScoredSignal,
  type SignalOptions,
  type SignalFilter,
  type SignalSummary,
  type SignalComponents,
  type IndicatorSignalValue,
  type PatternSignalValue,
  type SignalValidation,
  SIGNAL_THRESHOLDS,
  DEFAULT_WEIGHTS,
} from './types';

// Re-export constants
export { SIGNAL_THRESHOLDS, DEFAULT_WEIGHTS };

/**
 * Generate all signals from candles
 */
export function generateSignals(
  candles: Candle[],
  options: SignalOptions = {}
): Signal[] {
  const signals: Signal[] = [];
  const {
    includeIndicators = true,
    includePatterns = true,
    includeTrend = true,
    includeCandlestick = true,
    includeVolume = true,
  } = options;

  // Trend signals
  if (includeTrend) {
    signals.push(...generateTrendSignals(candles));
  }

  // Indicator signals
  if (includeIndicators) {
    signals.push(...generateIndicatorSignals(candles));
  }

  // Chart pattern signals
  if (includePatterns) {
    signals.push(...generatePatternSignals(candles));
  }

  // Candlestick signals
  if (includeCandlestick) {
    signals.push(...generateCandlestickSignals(candles));
  }

  // Volume signals
  if (includeVolume) {
    signals.push(...generateVolumeSignals(candles));
  }

  // Apply filters if provided
  if (options.filters) {
    return filterSignals(signals, options.filters);
  }

  return signals;
}

/**
 * Generate trend-based signals
 */
function generateTrendSignals(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];
  const trend = analyzeTrend(candles);
  
  // Trend direction signal
  signals.push({
    id: `trend_direction_${Date.now()}`,
    source: 'trend',
    sourceName: 'Trend Analysis',
    category: 'trend',
    direction: trend.direction as SignalDirection,
    score: trend.strengthScore,
    weight: DEFAULT_WEIGHTS.trend,
    confidence: trend.strengthScore,
    description: `${trend.direction.charAt(0).toUpperCase() + trend.direction.slice(1)} trend with ${trend.strength} strength (ADX: ${trend.adx.toFixed(1)})`,
    value: trend.adx,
    timestamp: Date.now(),
    metadata: { phase: trend.phase, slopePercent: trend.slopePercent },
  });

  // ADX strength signal
  if (trend.adx > 25) {
    signals.push({
      id: `trend_adx_${Date.now()}`,
      source: 'trend',
      sourceName: 'ADX',
      category: 'trend',
      direction: trend.direction === 'neutral' || trend.direction === 'ranging' ? 'neutral' : trend.direction,
      score: Math.min(trend.adx, 100),
      weight: DEFAULT_WEIGHTS.trend * 0.5,
      confidence: trend.adx,
      description: `ADX ${trend.adx.toFixed(1)} indicates ${trend.adx > 40 ? 'strong' : 'moderate'} trend`,
      value: trend.adx,
      threshold: 25,
      timestamp: Date.now(),
    });
  }

  return signals;
}

/**
 * Generate indicator-based signals
 */
function generateIndicatorSignals(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];

  // RSI Signal
  const rsiValue = rsi(candles, 14);
  const currentRSI = rsiValue.value[rsiValue.value.length - 1];
  
  if (!isNaN(currentRSI)) {
    let direction: SignalDirection = 'neutral';
    let score = 50;
    let description = '';

    if (currentRSI < 30) {
      direction = 'bullish';
      score = 100 - currentRSI;
      description = `RSI oversold at ${currentRSI.toFixed(1)}`;
    } else if (currentRSI > 70) {
      direction = 'bearish';
      score = currentRSI;
      description = `RSI overbought at ${currentRSI.toFixed(1)}`;
    } else if (currentRSI < 50) {
      direction = 'bullish';
      score = 50 - currentRSI + 50;
      description = `RSI neutral-low at ${currentRSI.toFixed(1)}`;
    } else {
      direction = 'bearish';
      score = currentRSI;
      description = `RSI neutral-high at ${currentRSI.toFixed(1)}`;
    }

    signals.push({
      id: `rsi_${Date.now()}`,
      source: 'indicator',
      sourceName: 'RSI',
      category: 'momentum',
      direction,
      score,
      weight: DEFAULT_WEIGHTS.indicator,
      confidence: Math.min(score, 100),
      description,
      value: currentRSI,
      threshold: 30,
      timestamp: Date.now(),
    });
  }

  // MACD Signal
  const macdValue = macd(candles);
  const macdLine = macdValue.macd[macdValue.macd.length - 1];
  const signalLine = macdValue.signal[macdValue.signal.length - 1];
  const histogram = macdValue.histogram[macdValue.histogram.length - 1];

  if (!isNaN(macdLine) && !isNaN(signalLine)) {
    let direction: SignalDirection = 'neutral';
    let score = 50;

    if (macdLine > signalLine && histogram > 0) {
      direction = 'bullish';
      score = 70 + Math.min(Math.abs(histogram) * 1000, 30);
    } else if (macdLine > signalLine) {
      direction = 'bullish';
      score = 60;
    } else if (macdLine < signalLine && histogram < 0) {
      direction = 'bearish';
      score = 70 + Math.min(Math.abs(histogram) * 1000, 30);
    } else {
      direction = 'bearish';
      score = 60;
    }

    signals.push({
      id: `macd_${Date.now()}`,
      source: 'indicator',
      sourceName: 'MACD',
      category: 'momentum',
      direction,
      score,
      weight: DEFAULT_WEIGHTS.indicator,
      confidence: score,
      description: `MACD ${direction === 'bullish' ? 'bullish' : 'bearish'} (histogram: ${histogram?.toFixed(5)})`,
      value: macdLine,
      timestamp: Date.now(),
    });
  }

  // Stochastic Signal
  const stochValue = stochastic(candles);
  const k = stochValue.k[stochValue.k.length - 1];
  const d = stochValue.d[stochValue.d.length - 1];

  if (!isNaN(k) && !isNaN(d)) {
    let direction: SignalDirection = 'neutral';
    let score = 50;

    if (k < 20 && d < 20) {
      direction = 'bullish';
      score = 80;
    } else if (k > 80 && d > 80) {
      direction = 'bearish';
      score = 80;
    } else if (k > d && k < 80 && d < 80) {
      direction = 'bullish';
      score = 60;
    } else if (k < d && k > 20 && d > 20) {
      direction = 'bearish';
      score = 60;
    }

    signals.push({
      id: `stochastic_${Date.now()}`,
      source: 'indicator',
      sourceName: 'Stochastic',
      category: 'momentum',
      direction,
      score,
      weight: DEFAULT_WEIGHTS.indicator * 0.7,
      confidence: score,
      description: `Stochastic %K: ${k.toFixed(1)}, %D: ${d.toFixed(1)}`,
      value: k,
      timestamp: Date.now(),
    });
  }

  // EMA Alignment Signal
  const ema20 = ema(candles, 20).values;
  const ema50 = ema(candles, 50).values;
  const currentPrice = candles[candles.length - 1].close;

  const ema20Val = ema20[ema20.length - 1];
  const ema50Val = ema50[ema50.length - 1];

  if (!isNaN(ema20Val) && !isNaN(ema50Val)) {
    let direction: SignalDirection = 'neutral';
    let score = 50;

    if (currentPrice > ema20Val && ema20Val > ema50Val) {
      direction = 'bullish';
      score = 75;
    } else if (currentPrice < ema20Val && ema20Val < ema50Val) {
      direction = 'bearish';
      score = 75;
    } else if (currentPrice > ema20Val || ema20Val > ema50Val) {
      direction = 'bullish';
      score = 55;
    } else {
      direction = 'bearish';
      score = 55;
    }

    signals.push({
      id: `ema_alignment_${Date.now()}`,
      source: 'indicator',
      sourceName: 'EMA Alignment',
      category: 'trend',
      direction,
      score,
      weight: DEFAULT_WEIGHTS.indicator * 0.8,
      confidence: score,
      description: 'EMA 20 > EMA 50 alignment',
      timestamp: Date.now(),
    });
  }

  return signals;
}

/**
 * Generate chart pattern signals
 */
function generatePatternSignals(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];
  const patterns = detectAllChartPatterns(candles);

  for (const pattern of patterns) {
    if (pattern.pattern.confidence < SIGNAL_THRESHOLDS.WEAK) continue;

    signals.push({
      id: `pattern_${pattern.pattern.id}_${Date.now()}`,
      source: 'pattern',
      sourceName: pattern.pattern.name,
      category: 'reversal' as SignalCategory,
      direction: pattern.pattern.direction as SignalDirection,
      score: pattern.pattern.confidence,
      weight: DEFAULT_WEIGHTS.pattern,
      confidence: pattern.pattern.confidence,
      description: `${pattern.pattern.name} pattern (${pattern.pattern.strength})`,
      timestamp: Date.now(),
      metadata: { patternType: pattern.pattern.type, formed: pattern.formed },
    });
  }

  // Support/Resistance signals
  const levels = calculateSupportResistance(candles);
  const currentPrice = candles[candles.length - 1].close;

  for (const resistance of levels.resistance.slice(0, 2)) {
    const distance = ((resistance - currentPrice) / currentPrice) * 100;
    
    if (distance > 0 && distance < 2) {
      signals.push({
        id: `resistance_${resistance}_${Date.now()}`,
        source: 'pattern',
        sourceName: 'Resistance',
        category: 'range',
        direction: 'bearish',
        score: Math.max(50, 80 - distance * 10),
        weight: DEFAULT_WEIGHTS.pattern * 0.5,
        confidence: Math.max(50, 80 - distance * 10),
        description: `Price approaching resistance at ${resistance.toFixed(5)}`,
        value: resistance,
        threshold: resistance,
        timestamp: Date.now(),
      });
    }
  }

  for (const support of levels.support.slice(0, 2)) {
    const distance = ((currentPrice - support) / currentPrice) * 100;
    
    if (distance > 0 && distance < 2) {
      signals.push({
        id: `support_${support}_${Date.now()}`,
        source: 'pattern',
        sourceName: 'Support',
        category: 'range',
        direction: 'bullish',
        score: Math.max(50, 80 - distance * 10),
        weight: DEFAULT_WEIGHTS.pattern * 0.5,
        confidence: Math.max(50, 80 - distance * 10),
        description: `Price near support at ${support.toFixed(5)}`,
        value: support,
        threshold: support,
        timestamp: Date.now(),
      });
    }
  }

  return signals;
}

/**
 * Generate candlestick pattern signals
 */
function generateCandlestickSignals(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];
  const patterns = detectAllCandlestickPatterns(candles);

  for (const pattern of patterns) {
    if (pattern.pattern.confidence < SIGNAL_THRESHOLDS.WEAK) continue;

    signals.push({
      id: `candle_${pattern.pattern.id}_${Date.now()}`,
      source: 'candlestick',
      sourceName: pattern.pattern.name,
      category: 'reversal',
      direction: pattern.pattern.direction as SignalDirection,
      score: pattern.pattern.confidence,
      weight: DEFAULT_WEIGHTS.candlestick,
      confidence: pattern.pattern.confidence,
      description: `${pattern.pattern.name} candlestick pattern`,
      timestamp: Date.now(),
    });
  }

  return signals;
}

/**
 * Generate volume-based signals
 */
function generateVolumeSignals(candles: Candle[]): Signal[] {
  const signals: Signal[] = [];

  if (candles.length < 20) return signals;

  // Calculate average volume
  const volumes = candles.slice(-20).map(c => c.tickVolume);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const currentVolume = candles[candles.length - 1].tickVolume;
  const volumeRatio = currentVolume / avgVolume;

  // Volume spike signal
  if (volumeRatio > 1.5) {
    const trend = analyzeTrend(candles);
    
    signals.push({
      id: `volume_spike_${Date.now()}`,
      source: 'volume',
      sourceName: 'Volume Spike',
      category: 'breakout',
      direction: trend.direction as SignalDirection,
      score: Math.min(80, 50 + volumeRatio * 20),
      weight: DEFAULT_WEIGHTS.volume,
      confidence: Math.min(80, 50 + volumeRatio * 20),
      description: `Volume ${volumeRatio.toFixed(1)}x average`,
      value: volumeRatio,
      threshold: 1.5,
      timestamp: Date.now(),
    });
  }

  return signals;
}

/**
 * Aggregate multiple signals into a single signal
 */
export function aggregateSignals(signals: Signal[]): AggregatedSignal {
  if (signals.length === 0) {
    return {
      id: `aggregated_${Date.now()}`,
      direction: 'neutral',
      totalScore: 0,
      confidence: 0,
      signalCount: 0,
      bullishSignals: 0,
      bearishSignals: 0,
      neutralSignals: 0,
      signals: [],
      primarySource: 'indicator',
      timestamp: Date.now(),
    };
  }

  // Count directions
  let bullishSignals = 0;
  let bearishSignals = 0;
  let neutralSignals = 0;
  const sourceCounts: Record<string, number> = {};

  // Calculate weighted scores
  let totalWeightedScore = 0;
  let totalWeight = 0;
  let totalConfidence = 0;

  for (const signal of signals) {
    // Count directions
    if (signal.direction === 'bullish') bullishSignals++;
    else if (signal.direction === 'bearish') bearishSignals++;
    else neutralSignals++;

    // Track primary source
    sourceCounts[signal.source] = (sourceCounts[signal.source] || 0) + signal.score;

    // Calculate weighted score
    const weightedScore = signal.score * signal.weight;
    totalWeightedScore += weightedScore;
    totalWeight += signal.weight;
    totalConfidence += signal.confidence;
  }

  // Normalize score
  const normalizedScore = totalWeight > 0 ? (totalWeightedScore / totalWeight) : 0;
  const avgConfidence = signals.length > 0 ? totalConfidence / signals.length : 0;

  // Determine direction based on weighted scores
  let direction: SignalDirection = 'neutral';
  
  if (bullishSignals > bearishSignals * 1.5) {
    direction = 'bullish';
  } else if (bearishSignals > bullishSignals * 1.5) {
    direction = 'bearish';
  } else if (bullishSignals > bearishSignals) {
    direction = 'bullish';
  } else if (bearishSignals > bullishSignals) {
    direction = 'bearish';
  }

  // Find primary source
  const primarySource = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] as SignalSource || 'indicator';

  return {
    id: `aggregated_${Date.now()}`,
    direction,
    totalScore: normalizedScore,
    confidence: avgConfidence,
    signalCount: signals.length,
    bullishSignals,
    bearishSignals,
    neutralSignals,
    signals,
    primarySource,
    timestamp: Date.now(),
  };
}

/**
 * Calculate agreement between signals
 */
export function calculateAgreement(signals: Signal[]): number {
  if (signals.length === 0) return 0;

  let bullishCount = 0;
  let bearishCount = 0;

  for (const signal of signals) {
    if (signal.direction === 'bullish') bullishCount++;
    else if (signal.direction === 'bearish') bearishCount++;
  }

  const total = bullishCount + bearishCount;
  if (total === 0) return 0;

  const majority = Math.max(bullishCount, bearishCount);
  return majority / total;
}

/**
 * Score aggregated signal
 */
export function scoreSignal(
  aggregated: AggregatedSignal,
  candles: Candle[],
  options: SignalOptions = {}
): ScoredSignal {
  const currentPrice = candles[candles.length - 1].close;
  const atrValues = atr(candles, 14).value;
  const atrValue = atrValues[atrValues.length - 1] || 0;

  // Calculate strength score
  const agreement = calculateAgreement(aggregated.signals);
  const strengthScore = (aggregated.confidence * 0.6 + agreement * 40);

  // Determine action
  let action: 'buy' | 'sell' | 'hold' = 'hold';
  if (aggregated.direction === 'bullish' && strengthScore >= SIGNAL_THRESHOLDS.MIN_CONFIDENCE) {
    action = 'buy';
  } else if (aggregated.direction === 'bearish' && strengthScore >= SIGNAL_THRESHOLDS.MIN_CONFIDENCE) {
    action = 'sell';
  }

  // Generate reasons
  const reasons = generateReasons(aggregated);

  // Calculate risk/reward
  let riskReward: number | undefined;
  let stopLoss: number | undefined;
  let takeProfit: number | undefined;

  if (action !== 'hold' && atrValue > 0) {
    
    if (action === 'buy') {
      stopLoss = currentPrice - atrValue * 1.5;
      takeProfit = currentPrice + atrValue * 3;
    } else {
      stopLoss = currentPrice + atrValue * 1.5;
      takeProfit = currentPrice - atrValue * 3;
    }
    
    const risk = Math.abs(currentPrice - stopLoss);
    const reward = Math.abs(takeProfit - currentPrice);
    riskReward = reward / risk;
  }

  return {
    signal: aggregated,
    action,
    strength: strengthScore >= SIGNAL_THRESHOLDS.STRONG ? 'strong' 
      : strengthScore >= SIGNAL_THRESHOLDS.MODERATE ? 'moderate' 
      : 'weak',
    strengthScore,
    reasons,
    entryPrice: currentPrice,
    stopLoss,
    takeProfit,
    riskReward,
    timeframe: candles[0].timeframe,
    symbol: candles[0].symbol,
    expiresAt: Date.now() + 3600000, // 1 hour
  };
}

/**
 * Generate reasons for the signal
 */
function generateReasons(aggregated: AggregatedSignal): string[] {
  const reasons: string[] = [];

  // Add directional reasons
  if (aggregated.bullishSignals > aggregated.bearishSignals) {
    reasons.push(`${aggregated.bullishSignals} bullish signals`);
  }
  if (aggregated.bearishSignals > aggregated.bullishSignals) {
    reasons.push(`${aggregated.bearishSignals} bearish signals`);
  }

  // Add top signal reasons
  const topSignals = [...aggregated.signals]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  for (const signal of topSignals) {
    reasons.push(`${signal.sourceName}: ${signal.direction} (${signal.score.toFixed(0)}%)`);
  }

  return reasons;
}

/**
 * Filter signals by criteria
 */
export function filterSignals(signals: Signal[], filter: SignalFilter): Signal[] {
  return signals.filter(signal => {
    // Check confidence
    if (filter.minConfidence && signal.confidence < filter.minConfidence) {
      return false;
    }

    // Check score
    if (filter.minScore && signal.score < filter.minScore) {
      return false;
    }

    // Check direction
    if (filter.directions && !filter.directions.includes(signal.direction)) {
      return false;
    }

    // Check source
    if (filter.sources && !filter.sources.includes(signal.source)) {
      return false;
    }

    // Check category
    if (filter.categories && !filter.categories.includes(signal.category)) {
      return false;
    }

    // Check age
    if (filter.maxAge) {
      const age = Date.now() - signal.timestamp;
      if (age > filter.maxAge) return false;
    }

    return true;
  });
}

/**
 * Rank signals by score
 */
export function rankSignals(signals: Signal[]): Signal[] {
  return [...signals].sort((a, b) => {
    // First by score
    if (b.score !== a.score) return b.score - a.score;
    // Then by confidence
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    // Then by weight
    return b.weight - a.weight;
  });
}

/**
 * Validate signal
 */
export function validateSignal(scored: ScoredSignal): SignalValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (scored.action === 'hold') {
    errors.push('Signal is neutral (hold action)');
  }

  if (scored.strengthScore < SIGNAL_THRESHOLDS.MIN_CONFIDENCE) {
    warnings.push(`Low confidence: ${scored.strengthScore.toFixed(1)}%`);
  }

  const agreement = calculateAgreement(scored.signal.signals);
  if (agreement < SIGNAL_THRESHOLDS.MIN_AGREEMENT) {
    warnings.push(`Low agreement: ${(agreement * 100).toFixed(1)}%`);
  }

  if (scored.signal.signalCount < 3) {
    warnings.push(`Few signals: ${scored.signal.signalCount}`);
  }

  if (scored.riskReward && scored.riskReward < 1.5) {
    warnings.push(`Low risk/reward: ${scored.riskReward.toFixed(2)}`);
  }

  if (scored.strength === 'weak') {
    warnings.push('Signal strength is weak');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Generate complete signal summary
 */
export function generateSignalSummary(
  candles: Candle[],
  options: SignalOptions = {}
): SignalSummary {
  // Generate all signals
  const signals = generateSignals(candles, options);

  // Aggregate signals
  const aggregated = aggregateSignals(signals);

  // Calculate agreement
  const agreement = calculateAgreement(signals);

  // Score the aggregated signal
  const scored = scoreSignal(aggregated, candles, options);

  // Calculate direction scores
  let bullishScore = 0;
  let bearishScore = 0;
  let neutralScore = 0;

  for (const signal of signals) {
    if (signal.direction === 'bullish') bullishScore += signal.score * signal.weight;
    else if (signal.direction === 'bearish') bearishScore += signal.score * signal.weight;
    else neutralScore += signal.score * signal.weight;
  }

  return {
    bullishScore,
    bearishScore,
    neutralScore,
    direction: aggregated.direction,
    confidence: aggregated.confidence,
    agreement,
    signals,
    aggregated,
    scored,
    timestamp: Date.now(),
  };
}

/**
 * Extract signal components for analysis
 */
export function extractSignalComponents(
  candles: Candle[]
): SignalComponents {
  const trend = analyzeTrend(candles);
  const indicators = generateIndicatorSignals(candles);
  const patterns = generatePatternSignals(candles);
  const candlesticks = generateCandlestickSignals(candles);
  const volumes = generateVolumeSignals(candles);

  return {
    trend,
    indicators: indicators.map(s => ({
      indicator: s.sourceName,
      value: s.value || 0,
      signal: s.direction,
      score: s.score,
    })),
    patterns: patterns.map(s => ({
      pattern: s.sourceName,
      confidence: s.confidence,
      direction: s.direction,
      score: s.score,
    })),
    candlesticks: candlesticks.map(s => ({
      pattern: s.sourceName,
      confidence: s.confidence,
      direction: s.direction,
      score: s.score,
    })),
    volumes: volumes.map(s => ({
      indicator: s.sourceName,
      value: s.value || 0,
      signal: s.direction,
      score: s.score,
    })),
  };
}
