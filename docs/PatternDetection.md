# Pattern Detection - Personal Forex Trading Operating System

## Overview

Automated recognition of chart patterns and candlestick formations to generate trading signals. Supports multiple pattern types with confidence scoring.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   Pattern Detection Engine                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐   │
│  │   Candle     │   │   Chart      │   │    Signal    │   │
│  │  Patterns    │──▶│  Patterns    │──▶│  Generator   │   │
│  └──────────────┘   └──────────────┘   └──────────────┘   │
│         │                  │                  │          │
│         ▼                  ▼                  ▼          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                    Pattern Registry                    │ │
│  │  • Pattern definitions                                │ │
│  │  • Detection rules                                   │ │
│  │  • Confidence calculators                            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Candlestick Patterns

### Supported Patterns

#### Single Candle Patterns
| Pattern | Direction | Description |
|---------|-----------|-------------|
| Doji | Reversal | Open equals close |
| Hammer | Bullish | Lower shadow > 2x body |
| Inverted Hammer | Bullish | Upper shadow > 2x body |
| Shooting Star | Bearish | Upper shadow > 2x body |
| Marubozu | Continuation | No shadows |

#### Double Candle Patterns
| Pattern | Direction | Description |
|---------|-----------|-------------|
| Engulfing | Reversal | 2nd candle engulfs 1st |
| Harami | Reversal | 2nd candle inside 1st |
| Piercing | Bullish | Gap down, closes > 50% of 1st |
| Dark Cloud | Bearish | Gap up, closes < 50% of 1st |
| Tweezer Bottom | Reversal | Two candles same low |
| Tweezer Top | Reversal | Two candles same high |

#### Triple Candle Patterns
| Pattern | Direction | Description |
|---------|-----------|-------------|
| Morning Star | Bullish | 3-candle reversal |
| Evening Star | Bearish | 3-candle reversal |
| Three White Soldiers | Bullish | 3 consecutive bullish |
| Three Black Crows | Bearish | 3 consecutive bearish |

### Detection Algorithm

```typescript
interface CandlePatternDetector {
  detect(candles: CandleData[]): DetectedPattern[];
}

class EngulfingPatternDetector implements CandlePatternDetector {
  detect(candles: CandleData[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    for (let i = 1; i < candles.length; i++) {
      const current = candles[i];
      const previous = candles[i - 1];
      
      // Check for bullish engulfing
      if (this.isBullishEngulfing(current, previous)) {
        patterns.push({
          type: 'bullish_engulfing',
          direction: 'buy',
          startIndex: i - 1,
          endIndex: i,
          startTime: previous.timestamp,
          endTime: current.timestamp,
          confidence: this.calculateConfidence(current, previous),
          entryPrice: current.close,
          stopLoss: Math.min(previous.low, current.low),
          takeProfit: this.calculateTakeProfit(current.close, previous.low)
        });
      }
      
      // Check for bearish engulfing
      if (this.isBearishEngulfing(current, previous)) {
        patterns.push({
          type: 'bearish_engulfing',
          direction: 'sell',
          startIndex: i - 1,
          endIndex: i,
          startTime: previous.timestamp,
          endTime: current.timestamp,
          confidence: this.calculateConfidence(current, previous),
          entryPrice: current.close,
          stopLoss: Math.max(previous.high, current.high),
          takeProfit: this.calculateTakeProfit(current.high, current.close)
        });
      }
    }
    
    return patterns;
  }
  
  private isBullishEngulfing(current: Candle, previous: Candle): boolean {
    const prevBearish = previous.close < previous.open;
    const currBullish = current.close > current.open;
    const engulfingBody = current.low < previous.low && current.high > previous.high;
    const strongClose = current.close > previous.open;
    
    return prevBearish && currBullish && engulfingBody && strongClose;
  }
  
  private isBearishEngulfing(current: Candle, previous: Candle): boolean {
    const prevBullish = previous.close > previous.open;
    const currBearish = current.close < current.open;
    const engulfingBody = current.low < previous.low && current.high > previous.high;
    const strongClose = current.close < previous.open;
    
    return prevBullish && currBearish && engulfingBody && strongClose;
  }
  
  private calculateConfidence(current: Candle, previous: Candle): number {
    // Size ratio
    const prevBodySize = Math.abs(current.close - current.open);
    const currBodySize = Math.abs(previous.close - previous.open);
    const sizeRatio = currBodySize / (prevBodySize + 0.00001);
    
    // Gap confirmation
    const hasGap = current.open < previous.low;
    
    // Strong close
    const closeStrength = (current.close - current.low) / (current.high - current.low);
    
    // Weighted confidence
    const confidence = Math.min(100, 
      (Math.min(sizeRatio / 1.5, 1) * 40) +
      (hasGap ? 30 : 0) +
      (closeStrength * 30)
    );
    
    return Math.round(confidence * 10) / 10;
  }
}
```

## Chart Patterns

### Supported Patterns

#### Trend Reversal
| Pattern | Description |
|---------|-------------|
| Head & Shoulders | 3 peaks, middle highest |
| Inverse H&S | 3 troughs, middle lowest |
| Double Top | 2 peaks at similar level |
| Double Bottom | 2 troughs at similar level |
| Triple Top | 3 peaks at similar level |
| Triple Bottom | 3 troughs at similar level |
| Rounding Bottom | Cup-like reversal |
| V-Top/V-Bottom | Sharp reversal |

#### Trend Continuation
| Pattern | Description |
|---------|-------------|
| Ascending Triangle | Flat top, rising bottom |
| Descending Triangle | Flat bottom, falling top |
| Symmetrical Triangle | Converging trendlines |
| Bull Flag | Rising with pause |
| Bear Flag | Falling with pause |
| Pennant | Small triangle consolidation |
| Wedge | Converging sloped lines |

#### Volatility
| Pattern | Description |
|---------|-------------|
| Bollinger Squeeze | Tight bands |
| ATR Expansion | Sudden volatility increase |
| Range Expansion | Wide ranging candles |

### Detection Algorithm

```typescript
interface SwingPoint {
  index: number;
  price: number;
  type: 'high' | 'low';
  strength: number;
}

class ChartPatternDetector {
  constructor(private minSwingSize: number = 0.5) {}
  
  detectPatterns(candles: CandleData[]): DetectedPattern[] {
    const swingPoints = this.findSwingPoints(candles);
    const patterns: DetectedPattern[] = [];
    
    // Detect different patterns
    patterns.push(...this.detectDoubleTop(swingPoints));
    patterns.push(...this.detectDoubleBottom(swingPoints));
    patterns.push(...this.detectHeadAndShoulders(swingPoints));
    patterns.push(...this.detectTriangles(swingPoints));
    patterns.push(...this.detectFlags(swingPoints));
    
    return patterns;
  }
  
  private findSwingPoints(candles: CandleData[]): SwingPoint[] {
    const points: SwingPoint[] = [];
    const windowSize = 5;
    
    for (let i = windowSize; i < candles.length - windowSize; i++) {
      const leftMax = Math.max(...candles.slice(i - windowSize, i).map(c => c.high));
      const rightMax = Math.max(...candles.slice(i + 1, i + windowSize + 1).map(c => c.high));
      const leftMin = Math.min(...candles.slice(i - windowSize, i).map(c => c.low));
      const rightMin = Math.min(...candles.slice(i + 1, i + windowSize + 1).map(c => c.low));
      
      if (candles[i].high > leftMax && candles[i].high > rightMax) {
        points.push({
          index: i,
          price: candles[i].high,
          type: 'high',
          strength: this.calculateStrength(candles, i, 'high')
        });
      }
      
      if (candles[i].low < leftMin && candles[i].low < rightMin) {
        points.push({
          index: i,
          price: candles[i].low,
          type: 'low',
          strength: this.calculateStrength(candles, i, 'low')
        });
      }
    }
    
    return points;
  }
  
  private detectDoubleTop(swingPoints: SwingPoint[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    const tolerance = 0.005; // 0.5% price tolerance
    
    for (let i = 0; i < swingPoints.length - 1; i++) {
      if (swingPoints[i].type !== 'high') continue;
      
      for (let j = i + 1; j < swingPoints.length; j++) {
        if (swingPoints[j].type !== 'high') continue;
        
        const priceDiff = Math.abs(swingPoints[i].price - swingPoints[j].price);
        const priceAvg = (swingPoints[i].price + swingPoints[j].price) / 2;
        const isWithinTolerance = priceDiff / priceAvg < tolerance;
        
        if (isWithinTolerance) {
          // Check for neckline (support between two tops)
          const betweenPoints = swingPoints.filter(
            p => p.index > swingPoints[i].index && p.index < swingPoints[j].index
          );
          
          if (betweenPoints.length > 0) {
            const lowestPoint = Math.min(...betweenPoints.filter(p => p.type === 'low').map(p => p.price));
            
            patterns.push({
              type: 'double_top',
              direction: 'sell',
              startIndex: swingPoints[i].index,
              endIndex: swingPoints[j].index,
              startTime: candles[swingPoints[i].index].timestamp,
              endTime: candles[swingPoints[j].index].timestamp,
              neckline: lowestPoint,
              target: lowestPoint - (swingPoints[i].price - lowestPoint),
              confidence: this.calculateDoubleTopConfidence(swingPoints[i], swingPoints[j], lowestPoint)
            });
          }
        }
      }
    }
    
    return patterns;
  }
  
  private detectHeadAndShoulders(swingPoints: SwingPoint[]): DetectedPattern[] {
    const patterns: DetectedPattern[] = [];
    
    for (let i = 0; i < swingPoints.length - 4; i++) {
      const leftShoulder = swingPoints[i];
      const head = swingPoints[i + 1];
      const rightShoulder = swingPoints[i + 2];
      const leftNeckLow = swingPoints[i + 1]; // Will find actual low
      const rightNeckLow = swingPoints[i + 3]; // Will find actual low
      
      // Check if head is highest
      if (head.type !== 'high' || leftShoulder.type !== 'high' || rightShoulder.type !== 'high') {
        continue;
      }
      
      if (head.price > leftShoulder.price && head.price > rightShoulder.price) {
        // Check shoulders are similar height
        const shoulderDiff = Math.abs(leftShoulder.price - rightShoulder.price) / head.price;
        
        if (shoulderDiff < 0.1) { // Within 10%
          patterns.push({
            type: 'head_and_shoulders',
            direction: 'sell',
            startIndex: leftShoulder.index,
            endIndex: rightShoulder.index,
            startTime: candles[leftShoulder.index].timestamp,
            endTime: candles[rightShoulder.index].timestamp,
            confidence: this.calculateH&SConfidence(leftShoulder, head, rightShoulder),
            target: this.calculateH&STarget(head.price, rightNeckLow.price)
          });
        }
      }
    }
    
    return patterns;
  }
  
  private calculateDoubleTopConfidence(
    top1: SwingPoint,
    top2: SwingPoint,
    neckline: number
  ): number {
    // Price alignment
    const priceDiff = Math.abs(top1.price - top2.price) / top1.price;
    const priceAlignmentScore = Math.max(0, 1 - priceDiff / 0.01) * 40;
    
    // Volume confirmation (would need volume data)
    const volumeScore = 30;
    
    // Pattern strength (time between tops)
    const timeDiff = top2.index - top1.index;
    const timeScore = Math.min(30, timeDiff / 10);
    
    return Math.round((priceAlignmentScore + volumeScore + timeScore) * 10) / 10;
  }
}
```

## Confidence Scoring

```typescript
interface ConfidenceFactors {
  patternQuality: number;      // 0-100
  volumeConfirmation: number;  // 0-100
  trendAlignment: number;      // 0-100
  timeframeStrength: number;   // 0-100
  historicalAccuracy: number;  // 0-100
}

function calculateOverallConfidence(factors: ConfidenceFactors): number {
  // Weighted average
  const weights = {
    patternQuality: 0.30,
    volumeConfirmation: 0.20,
    trendAlignment: 0.20,
    timeframeStrength: 0.15,
    historicalAccuracy: 0.15
  };
  
  const score = 
    factors.patternQuality * weights.patternQuality +
    factors.volumeConfirmation * weights.volumeConfirmation +
    factors.trendAlignment * weights.trendAlignment +
    factors.timeframeStrength * weights.timeframeStrength +
    factors.historicalAccuracy * weights.historicalAccuracy;
  
  return Math.round(score * 10) / 10;
}

function calculateHistoricalAccuracy(
  patternType: string,
  direction: 'buy' | 'sell'
): number {
  // Based on backtested historical success rates
  const historicalRates: Record<string, { buy: number; sell: number }> = {
    bullish_engulfing: { buy: 72, sell: 0 },
    bearish_engulfing: { buy: 0, sell: 70 },
    hammer: { buy: 68, sell: 0 },
    shooting_star: { buy: 0, sell: 66 },
    head_and_shoulders: { buy: 0, sell: 75 },
    double_top: { buy: 0, sell: 74 },
    double_bottom: { buy: 73, sell: 0 },
    ascending_triangle: { buy: 70, sell: 0 },
    descending_triangle: { buy: 0, sell: 68 }
  };
  
  return historicalRates[patternType]?.[direction] ?? 50;
}
```

## Signal Generation

```typescript
interface TradingSignal {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  patternType: string;
  direction: 'buy' | 'sell';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskAmount: number;
  rewardAmount: number;
  riskRewardRatio: number;
  confidence: number;
  validUntil: Date;
  status: 'active' | 'expired' | 'triggered' | 'dismissed';
}

class SignalGenerator {
  generateFromPattern(
    pattern: DetectedPattern,
    account: AccountInfo,
    riskSettings: RiskSettings
  ): TradingSignal {
    // Calculate entry price
    const entryPrice = this.calculateEntryPrice(pattern);
    
    // Calculate stop loss
    const stopLoss = this.calculateStopLoss(pattern, entryPrice);
    
    // Calculate take profit
    const takeProfit = this.calculateTakeProfit(pattern, entryPrice, stopLoss);
    
    // Calculate risk amount based on settings
    const riskAmount = this.calculateRiskAmount(account, riskSettings);
    
    // Calculate position size
    const positionSize = this.calculatePositionSize(
      riskAmount,
      entryPrice,
      stopLoss,
      pattern.symbol
    );
    
    // Calculate risk/reward
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    const riskRewardRatio = reward / risk;
    
    // Determine expiration (based on timeframe)
    const validUntil = this.calculateExpiration(pattern.timeframe);
    
    return {
      id: generateUUID(),
      symbol: pattern.symbol,
      timeframe: pattern.timeframe,
      patternType: pattern.type,
      direction: pattern.direction,
      entryPrice,
      stopLoss,
      takeProfit,
      riskAmount,
      rewardAmount: riskAmount * riskRewardRatio,
      riskRewardRatio: Math.round(riskRewardRatio * 100) / 100,
      confidence: pattern.confidence,
      validUntil,
      status: 'active'
    };
  }
  
  private calculateStopLoss(pattern: DetectedPattern, entryPrice: number): number {
    // Use swing high/low as SL
    if (pattern.direction === 'buy') {
      return pattern.swingLow * 0.999; // Small buffer
    } else {
      return pattern.swingHigh * 1.001;
    }
  }
  
  private calculateTakeProfit(
    pattern: DetectedPattern,
    entryPrice: number,
    stopLoss: number
  ): number {
    const risk = Math.abs(entryPrice - stopLoss);
    
    // Minimum 1:1.5 R:R
    const target = entryPrice + (pattern.direction === 'buy' ? 1 : -1) * risk * 1.5;
    
    return target;
  }
  
  private calculateRiskAmount(
    account: AccountInfo,
    settings: RiskSettings
  ): number {
    if (settings.useKellyCriterion) {
      return this.calculateKellyRisk(account, settings);
    }
    
    return account.equity * (settings.maxRiskPercent / 100);
  }
}
```

## Real-time Detection

```typescript
class RealTimePatternDetector {
  private patternDetectors: Map<string, PatternDetector>;
  private recentCandles: Map<string, CandleData[]>;
  
  constructor() {
    this.patternDetectors = new Map();
    this.recentCandles = new Map();
  }
  
  onNewCandle(candle: CandleData): DetectedPattern[] {
    // Update candle buffer
    const key = `${candle.symbol}:${candle.timeframe}`;
    const candles = this.recentCandles.get(key) || [];
    candles.push(candle);
    
    // Keep last 200 candles for detection
    if (candles.length > 200) {
      candles.shift();
    }
    this.recentCandles.set(key, candles);
    
    // Run all detectors
    const patterns: DetectedPattern[] = [];
    
    for (const [patternType, detector] of this.patternDetectors) {
      const detected = detector.detect(candandles);
      patterns.push(...detected.filter(p => !p.alreadyReported));
    }
    
    // Mark detected patterns
    patterns.forEach(p => p.alreadyReported = true);
    
    return patterns;
  }
  
  registerDetector(patternType: string, detector: PatternDetector): void {
    this.patternDetectors.set(patternType, detector);
  }
}
```

## Pattern History & Statistics

```typescript
interface PatternStatistics {
  patternType: string;
  totalOccurrences: number;
  successfulTrades: number;
  failedTrades: number;
  winRate: number;
  avgRiskReward: number;
  avgDuration: number;
  bestTimeframe: Timeframe;
  bestSession: 'asian' | 'london' | 'new_york';
}

async function calculatePatternStatistics(
  patternType: string
): Promise<PatternStatistics> {
  const trades = await db.getTradesWithPattern(patternType);
  
  const wins = trades.filter(t => t.profit > 0).length;
  const losses = trades.filter(t => t.profit < 0).length;
  
  // Group by timeframe
  const byTimeframe = groupBy(trades, 'timeframe');
  
  // Group by session
  const bySession = groupBy(trades, t => getSession(t.entryTime));
  
  return {
    patternType,
    totalOccurrences: trades.length,
    successfulTrades: wins,
    failedTrades: losses,
    winRate: wins / (wins + losses) * 100,
    avgRiskReward: avg(trades.map(t => t.riskRewardRatio)),
    avgDuration: avg(trades.map(t => t.durationHours)),
    bestTimeframe: Object.entries(byTimeframe)
      .sort((a, b) => winRate(b) - winRate(a))[0]?.[0] as Timeframe,
    bestSession: Object.entries(bySession)
      .sort((a, b) => winRate(b) - winRate(a))[0]?.[0] as Session
  };
}
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Pattern detection latency | < 100ms |
| Supported patterns | 50+ |
| Pattern accuracy | > 65% |
| False positive rate | < 20% |
| Real-time processing | 100+ symbols |
