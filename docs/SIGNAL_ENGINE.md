# ForexOS Signal Engine

**Last Updated:** 2026-06-25

Complete guide for ForexOS Signal Engine - multi-source signal aggregation and scoring system.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Signal Sources](#signal-sources)
4. [Signal Aggregation](#signal-aggregation)
5. [Signal Scoring](#signal-scoring)
6. [Signal Filtering](#signal-filtering)
7. [Signal Validation](#signal-validation)
8. [API Reference](#api-reference)
9. [Usage Examples](#usage-examples)

---

## Overview

### What Is the Signal Engine?

The Signal Engine aggregates signals from multiple sources to generate unified trading signals:

- **Indicator Signals**: RSI, MACD, Stochastic, EMA
- **Pattern Signals**: Chart patterns, candlestick patterns
- **Trend Signals**: Direction, strength, phase
- **Volume Signals**: Volume spikes, accumulation/distribution

### Key Features

| Feature | Description |
|---------|-------------|
| Multi-Source | Combine 5+ signal sources |
| Weighted Scoring | Different weights per source |
| Agreement Analysis | Measure signal consensus |
| Confidence Scoring | Quantify signal strength |
| Signal Validation | Check signal quality |

---

## Architecture

### Signal Engine Structure

```
packages/engine/src/signals/
├── types.ts    # Type definitions
├── engine.ts   # Signal generation and scoring
└── index.ts   # Module exports
```

### Signal Flow

```
Candles → Generate Signals → Aggregate → Score → Validate → Action
         ↓
    [Trend, Indicator, Pattern, Candlestick, Volume]
```

---

## Signal Sources

### Supported Sources

| Source | Type | Default Weight |
|--------|------|----------------|
| Indicators | RSI, MACD, Stochastic, EMA | 35% |
| Patterns | Chart, Candlestick | 25% |
| Trend | Direction, Strength, ADX | 25% |
| Candlesticks | Reversal patterns | 10% |
| Volume | Spikes, accumulation | 5% |

### Signal Structure

```typescript
interface Signal {
  id: string;
  source: SignalSource;           // indicator | pattern | trend | candlestick | volume
  sourceName: string;             // RSI, MACD, Double Top, etc.
  category: SignalCategory;       // momentum | trend | reversal | breakout
  direction: SignalDirection;     // bullish | bearish | neutral
  score: number;                  // 0-100
  weight: number;                 // 0-1
  confidence: number;             // 0-100
  description: string;
  value?: number;                 // Current indicator value
  threshold?: number;             // Reference threshold
  timestamp: number;
}
```

---

## Signal Sources

### Indicator Signals

**RSI (Relative Strength Index)**
```typescript
// RSI < 30 → Bullish (oversold)
// RSI > 70 → Bearish (overbought)
// Score based on distance from thresholds
```

**MACD (Moving Average Convergence Divergence)**
```typescript
// MACD > Signal → Bullish
// MACD < Signal → Bearish
// Histogram expansion increases score
```

**Stochastic**
```typescript
// %K < 20 → Bullish (oversold)
// %K > 80 → Bearish (overbought)
// %K > %D → Bullish crossover
```

**EMA Alignment**
```typescript
// Price > EMA20 > EMA50 → Bullish
// Price < EMA20 < EMA50 → Bearish
```

### Trend Signals

**Direction**
```typescript
// Based on EMA crossover alignment
// Score = ADX strength
```

**ADX Strength**
```typescript
// ADX > 25 → Confirms trend exists
// ADX > 40 → Strong trend
```

### Pattern Signals

**Chart Patterns**
- Double Top/Bottom
- Head & Shoulders
- Triangles
- Flags, Wedges
- Cup & Handle

**Support/Resistance**
```typescript
// Near resistance → Bearish
// Near support → Bullish
// Distance affects score
```

### Candlestick Signals

```typescript
// Hammer, Doji, Engulfing, etc.
// Direct bullish/bearish signals
// Lower weight due to noise
```

### Volume Signals

```typescript
// Volume > 1.5x average → Breakout signal
// Direction based on trend
```

---

## Signal Aggregation

### Aggregation Process

```typescript
import { aggregateSignals } from '@forexos/engine';

const signals = generateSignals(candles);
const aggregated = aggregateSignals(signals);

// Aggregated result
{
  direction: 'bullish',
  totalScore: 65.5,
  confidence: 72.3,
  signalCount: 8,
  bullishSignals: 5,
  bearishSignals: 2,
  neutralSignals: 1,
  primarySource: 'indicator',
}
```

### Weighted Score Calculation

```typescript
// totalScore = Σ(score × weight) / Σ(weight)
```

### Direction Determination

```typescript
// Bullish if: bullishSignals > bearishSignals × 1.5
// Bearish if: bearishSignals > bullishSignals × 1.5
// Neutral otherwise
```

### Primary Source Detection

```typescript
// Primary source = source with highest total weighted score
```

---

## Signal Scoring

### Scoring Formula

```typescript
strengthScore = (confidence × 0.6) + (agreement × 40)
```

### Agreement Calculation

```typescript
agreement = max(bullishCount, bearishCount) / (bullishCount + bearishCount)
```

### Strength Classification

```typescript
const SIGNAL_THRESHOLDS = {
  STRONG: 70,      // >70 = Strong signal
  MODERATE: 50,    // 50-70 = Moderate
  WEAK: 30,        // <30 = Weak
  MIN_CONFIDENCE: 40,
  MIN_AGREEMENT: 0.6,
};
```

### Risk/Reward Calculation

```typescript
if (action === 'buy') {
  stopLoss = currentPrice - ATR × 1.5;
  takeProfit = currentPrice + ATR × 3;
}

riskReward = reward / risk;  // Target > 2.0
```

---

## Signal Filtering

### Filter Options

```typescript
interface SignalFilter {
  minConfidence?: number;    // Minimum confidence (0-100)
  minScore?: number;         // Minimum score (0-100)
  directions?: Direction[];   // bullish | bearish | neutral
  sources?: Source[];         // Filter by source
  categories?: Category[];   // Filter by category
  maxAge?: number;           // Maximum age in ms
}
```

### Filter Examples

```typescript
// Filter high-confidence bullish signals
const filtered = filterSignals(signals, {
  directions: ['bullish'],
  minConfidence: 60,
});

// Filter indicator signals only
const indicatorSignals = filterSignals(signals, {
  sources: ['indicator'],
});
```

### Ranking

```typescript
// Rank by score, then confidence, then weight
const ranked = rankSignals(signals);
```

---

## Signal Validation

### Validation Checks

```typescript
interface SignalValidation {
  valid: boolean;
  errors: string[];    // Critical issues
  warnings: string[];   // Non-critical warnings
}
```

### Validation Rules

| Check | Error | Warning |
|-------|-------|---------|
| Action | "hold" action | - |
| Confidence | - | < 40% |
| Agreement | - | < 60% |
| Signal Count | - | < 3 |
| Risk/Reward | - | < 1.5 |
| Strength | - | "weak" |

---

## API Reference

### Core Functions

```typescript
// Generate all signals
generateSignals(candles: Candle[], options?: SignalOptions): Signal[]

// Aggregate signals
aggregateSignals(signals: Signal[]): AggregatedSignal

// Score aggregated signal
scoreSignal(aggregated: AggregatedSignal, candles: Candle[]): ScoredSignal

// Calculate agreement
calculateAgreement(signals: Signal[]): number

// Filter signals
filterSignals(signals: Signal[], filter: SignalFilter): Signal[]

// Rank signals
rankSignals(signals: Signal[]): Signal[]

// Validate signal
validateSignal(scored: ScoredSignal): SignalValidation

// Generate summary
generateSignalSummary(candles: Candle[], options?: SignalOptions): SignalSummary

// Extract components
extractSignalComponents(candles: Candle[]): SignalComponents
```

### Types

```typescript
// Signal Source
type SignalSource = 'indicator' | 'pattern' | 'trend' | 'candlestick' | 'volume';

// Signal Direction
type SignalDirection = 'bullish' | 'bearish' | 'neutral';

// Signal Category
type SignalCategory = 'momentum' | 'trend' | 'reversal' | 'breakout' | 'range' | 'divergence';

// Aggregated Signal
interface AggregatedSignal {
  id: string;
  direction: SignalDirection;
  totalScore: number;
  confidence: number;
  signalCount: number;
  bullishSignals: number;
  bearishSignals: number;
  neutralSignals: number;
  signals: Signal[];
  primarySource: SignalSource;
  timestamp: number;
}

// Scored Signal
interface ScoredSignal {
  signal: AggregatedSignal;
  action: 'buy' | 'sell' | 'hold';
  strength: 'strong' | 'moderate' | 'weak';
  strengthScore: number;
  reasons: string[];
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskReward?: number;
  timeframe: Timeframe;
  symbol: string;
  expiresAt?: number;
}
```

---

## Usage Examples

### Basic Signal Generation

```typescript
import { generateSignalSummary } from '@forexos/engine';

const candles = await mt5Service.getCandles('EURUSD', 'H1', undefined, undefined, 100);
const summary = generateSignalSummary(candles);

console.log(`Direction: ${summary.direction}`);
console.log(`Confidence: ${summary.confidence.toFixed(1)}%`);
console.log(`Agreement: ${(summary.agreement * 100).toFixed(1)}%`);

if (summary.scored) {
  console.log(`Action: ${summary.scored.action}`);
  console.log(`Strength: ${summary.scored.strength}`);
  console.log(`Risk/Reward: ${summary.scored.riskReward?.toFixed(2)}`);
}
```

### Custom Signal Options

```typescript
import { generateSignals, aggregateSignals, scoreSignal } from '@forexos/engine';

const options: SignalOptions = {
  includeIndicators: true,
  includePatterns: true,
  includeTrend: true,
  includeCandlestick: true,
  includeVolume: true,
  
  weights: {
    indicator: 0.40,   // Increase indicator weight
    pattern: 0.30,      // Increase pattern weight
    trend: 0.20,
    candlestick: 0.05,
    volume: 0.05,
  },
  
  filters: {
    minConfidence: 50,
    directions: ['bullish', 'bearish'],
  },
};

const signals = generateSignals(candles, options);
const aggregated = aggregateSignals(signals);
const scored = scoreSignal(aggregated, candles, options);
```

### Signal Filtering

```typescript
import { generateSignals, filterSignals, rankSignals } from '@forexos/engine';

const allSignals = generateSignals(candles);

// Filter bullish momentum signals
const bullishMomentum = filterSignals(allSignals, {
  directions: ['bullish'],
  categories: ['momentum'],
  minConfidence: 60,
});

// Rank and get top 5
const topSignals = rankSignals(bullishMomentum).slice(0, 5);

console.log('Top Bullish Momentum Signals:');
for (const signal of topSignals) {
  console.log(`  ${signal.sourceName}: ${signal.score.toFixed(0)}%`);
}
```

### Signal Validation

```typescript
import { generateSignalSummary, validateSignal } from '@forexos/engine';

const summary = generateSignalSummary(candles);

if (summary.scored) {
  const validation = validateSignal(summary.scored);
  
  if (!validation.valid) {
    console.log('Errors:', validation.errors);
  }
  
  if (validation.warnings.length > 0) {
    console.log('Warnings:', validation.warnings);
  }
  
  if (validation.valid && validation.warnings.length === 0) {
    console.log('Signal is fully validated!');
  }
}
```

### Multi-Signal Analysis

```typescript
import { extractSignalComponents } from '@forexos/engine';

const components = extractSignalComponents(candles);

// Trend
console.log(`Trend: ${components.trend?.direction}`);
console.log(`Strength: ${components.trend?.strength}`);
console.log(`ADX: ${components.trend?.adx.toFixed(1)}`);

// Indicators
console.log('Indicator Signals:');
for (const ind of components.indicators) {
  console.log(`  ${ind.indicator}: ${ind.signal} (${ind.score.toFixed(0)}%)`);
}

// Patterns
console.log('Pattern Signals:');
for (const pat of components.patterns) {
  console.log(`  ${pat.pattern}: ${pat.direction} (${pat.confidence.toFixed(0)}%)`);
}
```

### Trading Decision Flow

```typescript
import { generateSignalSummary } from '@forexos/engine';

function getTradingDecision(candles: Candle[]): TradingDecision | null {
  const summary = generateSignalSummary(candles);
  
  // Require strong signal
  if (summary.scored?.strength !== 'strong') {
    return null;
  }
  
  // Require good agreement
  if (summary.agreement < 0.6) {
    return null;
  }
  
  // Require favorable risk/reward
  if (summary.scored.riskReward && summary.scored.riskReward < 2.0) {
    return null;
  }
  
  const scored = summary.scored;
  
  return {
    action: scored.action,
    confidence: scored.strengthScore,
    entryPrice: scored.entryPrice,
    stopLoss: scored.stopLoss,
    takeProfit: scored.takeProfit,
    reason: scored.reasons.join(', '),
  };
}
```

---

## Configuration

### Default Weights

```typescript
const DEFAULT_WEIGHTS = {
  indicator: 0.35,     // 35%
  pattern: 0.25,       // 25%
  trend: 0.25,          // 25%
  candlestick: 0.10,   // 10%
  volume: 0.05,        // 5%
};
```

### Thresholds

```typescript
const SIGNAL_THRESHOLDS = {
  STRONG: 70,           // Strong signal threshold
  MODERATE: 50,        // Moderate signal threshold
  WEAK: 30,            // Weak signal threshold
  MIN_CONFIDENCE: 40,  // Minimum confidence to act
  MIN_AGREEMENT: 0.6,  // 60% agreement required
};
```

---

## Quick Reference

### Signal Strength Matrix

| Confidence | Agreement | Strength |
|-----------|-----------|----------|
| >70% | >80% | **Strong** |
| >70% | 60-80% | **Strong** |
| 50-70% | >80% | **Moderate** |
| 50-70% | 60-80% | **Moderate** |
| <50% | <60% | **Weak** |

### Action Decision Matrix

| Direction | Strength | Agreement | Action |
|-----------|----------|-----------|--------|
| Bullish | >70% | >60% | **Buy** |
| Bullish | 50-70% | >60% | Buy |
| Bearish | >70% | >60% | **Sell** |
| Bearish | 50-70% | >60% | Sell |
| Neutral | Any | Any | Hold |
| Any | <50% | Any | Hold |

---

## Summary

| Feature | Status | Function |
|---------|--------|----------|
| Multi-Source Signals | ✅ | `generateSignals()` |
| Indicator Signals | ✅ | RSI, MACD, Stochastic, EMA |
| Pattern Signals | ✅ | Chart + Candlestick |
| Trend Signals | ✅ | Direction, ADX |
| Volume Signals | ✅ | Volume spikes |
| Aggregation | ✅ | `aggregateSignals()` |
| Weighted Scoring | ✅ | Built-in weights |
| Agreement Analysis | ✅ | `calculateAgreement()` |
| Signal Filtering | ✅ | `filterSignals()` |
| Signal Ranking | ✅ | `rankSignals()` |
| Signal Validation | ✅ | `validateSignal()` |
| Summary Generation | ✅ | `generateSignalSummary()` |

---

*Last updated: 2026-06-25*
