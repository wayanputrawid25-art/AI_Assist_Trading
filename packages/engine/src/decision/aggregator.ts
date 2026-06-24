// Signal Aggregator - Combines patterns and indicators into unified signals
import type { Candle, Timeframe } from '@forexos/types';
import type { SignalScore, DecisionContext } from './types';
import { rsi, macd, stochastic, adx } from '../indicators/momentum';
import { sma, ema } from '../indicators/trend';
import { bollingerBands, atr } from '../indicators/volatility';

// Indicator weights for scoring
const INDICATOR_WEIGHTS = {
  trend: 0.25,
  momentum: 0.35,
  volatility: 0.20,
  volume: 0.20,
};

export interface AggregatedSignal {
  direction: 'bullish' | 'bearish' | 'neutral';
  score: number; // -100 to 100
  signals: SignalScore[];
  confluenceCount: number;
  dominantSignals: string[];
  warnings: string[];
}

export class SignalAggregator {
  /**
   * Analyze all indicators and return aggregated signal
   */
  analyze(context: DecisionContext): AggregatedSignal {
    const signals: SignalScore[] = [];
    const warnings: string[] = [];
    
    // Trend signals
    const trendSignals = this.analyzeTrend(context);
    signals.push(...trendSignals.signals);
    warnings.push(...trendSignals.warnings);
    
    // Momentum signals
    const momentumSignals = this.analyzeMomentum(context);
    signals.push(...momentumSignals.signals);
    warnings.push(...momentumSignals.warnings);
    
    // Volatility signals
    const volatilitySignals = this.analyzeVolatility(context);
    signals.push(...volatilitySignals.signals);
    
    // Calculate weighted score
    const weightedScore = this.calculateWeightedScore(signals);
    
    // Determine direction
    let direction: 'bullish' | 'bearish' | 'neutral';
    if (weightedScore > 15) {
      direction = 'bullish';
    } else if (weightedScore < -15) {
      direction = 'bearish';
    } else {
      direction = 'neutral';
    }
    
    // Find confluence signals
    const bullishSignals = signals.filter(s => s.direction === 'bullish' && s.score > 20);
    const bearishSignals = signals.filter(s => s.direction === 'bearish' && s.score > 20);
    const confluenceCount = Math.max(bullishSignals.length, bearishSignals.length);
    
    // Get dominant signal names
    const sortedSignals = [...signals]
      .filter(s => s.score > 20)
      .sort((a, b) => b.weightedScore - a.weightedScore);
    const dominantSignals = sortedSignals.slice(0, 3).map(s => s.indicator);
    
    return {
      direction,
      score: Math.round(weightedScore),
      signals,
      confluenceCount,
      dominantSignals,
      warnings,
    };
  }

  /**
   * Analyze trend indicators
   */
  private analyzeTrend(context: DecisionContext): { signals: SignalScore[]; warnings: string[] } {
    const signals: SignalScore[] = [];
    const warnings: string[] = [];
    const { candles } = context;
    const lastCandle = candles[candles.length - 1];
    const closes = candles.map(c => c.close);
    
    // Price vs EMA
    const ema20 = ema(candles, 20);
    const ema20Current = ema20.values[ema20.values.length - 1];
    const ema20Prev = ema20.values[ema20.values.length - 2];
    
    if (!isNaN(ema20Current)) {
      const priceVsEMA = ((lastCandle.close - ema20Current) / ema20Current) * 100;
      
      signals.push({
        indicator: 'EMA20',
        direction: priceVsEMA > 0 ? 'bullish' : priceVsEMA < 0 ? 'bearish' : 'neutral',
        score: Math.min(Math.abs(priceVsEMA) * 5, 100) * (priceVsEMA > 0 ? 1 : -1),
        weight: INDICATOR_WEIGHTS.trend,
        weightedScore: 0,
      });
      
      // EMA crossover
      if (!isNaN(ema20Prev) && ema20Prev !== ema20Current) {
        const crossover = lastCandle.close > ema20Current && closes[closes.length - 2] <= ema20Prev
          ? 'bullish'
          : lastCandle.close < ema20Current && closes[closes.length - 2] >= ema20Prev
          ? 'bearish'
          : 'neutral';
        
        if (crossover !== 'neutral') {
          signals.push({
            indicator: 'EMA_CROSSOVER',
            direction: crossover,
            score: 40,
            weight: INDICATOR_WEIGHTS.trend,
            weightedScore: 0,
          });
        }
      }
    }
    
    // EMA alignment (multiple EMAs)
    const ema50 = ema(candles, 50);
    const ema50Current = ema50.values[ema50.values.length - 1];
    
    if (!isNaN(ema20Current) && !isNaN(ema50Current)) {
      const emaBullish = ema20Current > ema50Current && ema20Current > closes[closes.length - 1] * 0.99;
      const emaBearish = ema20Current < ema50Current && ema20Current < closes[closes.length - 1] * 1.01;
      
      if (emaBullish) {
        signals.push({
          indicator: 'EMA_ALIGNMENT',
          direction: 'bullish',
          score: 30,
          weight: INDICATOR_WEIGHTS.trend,
          weightedScore: 0,
        });
      } else if (emaBearish) {
        signals.push({
          indicator: 'EMA_ALIGNMENT',
          direction: 'bearish',
          score: 30,
          weight: INDICATOR_WEIGHTS.trend,
          weightedScore: 0,
        });
      }
    }
    
    return { signals, warnings };
  }

  /**
   * Analyze momentum indicators
   */
  private analyzeMomentum(context: DecisionContext): { signals: SignalScore[]; warnings: string[] } {
    const signals: SignalScore[] = [];
    const warnings: string[] = [];
    const { candles } = context;
    
    // RSI
    const rsiResult = rsi(candles, 14);
    const rsiCurrent = rsiResult.value[rsiResult.value.length - 1];
    
    if (!isNaN(rsiCurrent)) {
      let rsiSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      let rsiScore = 0;
      
      if (rsiCurrent < 30) {
        rsiSignal = 'bullish';
        rsiScore = ((30 - rsiCurrent) / 30) * 80 + 20;
      } else if (rsiCurrent > 70) {
        rsiSignal = 'bearish';
        rsiScore = ((rsiCurrent - 70) / 30) * 80 + 20;
      } else if (rsiCurrent < 50) {
        rsiScore = -20;
      } else {
        rsiScore = 20;
      }
      
      signals.push({
        indicator: 'RSI14',
        direction: rsiSignal,
        score: Math.min(Math.abs(rsiScore), 100),
        weight: INDICATOR_WEIGHTS.momentum,
        weightedScore: 0,
      });
      
      if (rsiCurrent < 30) warnings.push('RSI Oversold');
      if (rsiCurrent > 70) warnings.push('RSI Overbought');
    }
    
    // MACD
    const macdResult = macd(candles, 12, 26, 9);
    const macdCurrent = macdResult.macd[macdResult.macd.length - 1];
    const signalCurrent = macdResult.signal[macdResult.signal.length - 1];
    const histCurrent = macdResult.histogram[macdResult.histogram.length - 1];
    
    if (!isNaN(macdCurrent) && !isNaN(signalCurrent)) {
      // MACD vs Signal line
      const macdVsSignal = (macdCurrent - signalCurrent) / Math.abs(signalCurrent || 1);
      
      signals.push({
        indicator: 'MACD_LINE',
        direction: macdCurrent > signalCurrent ? 'bullish' : 'bearish',
        score: Math.min(Math.abs(macdVsSignal) * 100, 100),
        weight: INDICATOR_WEIGHTS.momentum,
        weightedScore: 0,
      });
      
      // Histogram slope
      if (macdResult.histogram.length >= 2) {
        const histPrev = macdResult.histogram[macdResult.histogram.length - 2];
        if (!isNaN(histPrev)) {
          signals.push({
            indicator: 'MACD_HIST',
            direction: histCurrent > histPrev ? 'bullish' : 'bearish',
            score: Math.min(Math.abs(histCurrent - histPrev) * 50, 60),
            weight: INDICATOR_WEIGHTS.momentum,
            weightedScore: 0,
          });
        }
      }
    }
    
    // Stochastic
    const stochResult = stochastic(candles, 14, 3, 3);
    const stochK = stochResult.k[stochResult.k.length - 1];
    const stochD = stochResult.d[stochResult.d.length - 1];
    
    if (!isNaN(stochK) && !isNaN(stochD)) {
      let stochSignal: 'bullish' | 'bearish' | 'neutral' = 'neutral';
      let stochScore = 0;
      
      if (stochK < 20 && stochD < 20) {
        stochSignal = 'bullish';
        stochScore = 60;
      } else if (stochK > 80 && stochD > 80) {
        stochSignal = 'bearish';
        stochScore = 60;
      } else if (stochK > stochD && stochK < 50) {
        stochSignal = 'bullish';
        stochScore = 30;
      } else if (stochK < stochD && stochK > 50) {
        stochSignal = 'bearish';
        stochScore = 30;
      }
      
      if (stochSignal !== 'neutral') {
        signals.push({
          indicator: 'STOCHASTIC',
          direction: stochSignal,
          score: stochScore,
          weight: INDICATOR_WEIGHTS.momentum,
          weightedScore: 0,
        });
      }
    }
    
    // ADX
    const adxResult = adx(candles, 14);
    const adxCurrent = adxResult.values[adxResult.values.length - 1];
    
    if (!isNaN(adxCurrent)) {
      // Strong trend (ADX > 25)
      const trendStrength = adxCurrent > 25 ? Math.min(adxCurrent, 50) : adxCurrent;
      
      signals.push({
        indicator: 'ADX',
        direction: 'neutral',
        score: trendStrength,
        weight: INDICATOR_WEIGHTS.momentum,
        weightedScore: 0,
      });
      
      if (adxCurrent < 20) {
        warnings.push('Weak trend - choppy market');
      }
    }
    
    return { signals, warnings };
  }

  /**
   * Analyze volatility indicators
   */
  private analyzeVolatility(context: DecisionContext): { signals: SignalScore[]; warnings: string[] } {
    const signals: SignalScore[] = [];
    const warnings: string[] = [];
    const { candles } = context;
    const lastCandle = candles[candles.length - 1];
    
    // Bollinger Bands
    const bb = bollingerBands(candles, 20, 2);
    const bbUpper = bb.upper[bb.upper.length - 1];
    const bbLower = bb.lower[bb.lower.length - 1];
    const bbPercent = bb.percent[bb.percent.length - 1];
    
    if (!isNaN(bbUpper) && !isNaN(bbLower)) {
      const position = (lastCandle.close - bbLower) / (bbUpper - bbLower);
      
      signals.push({
        indicator: 'BB_PERCENT',
        direction: position < 0.2 ? 'bullish' : position > 0.8 ? 'bearish' : 'neutral',
        score: position < 0.2 ? 50 : position > 0.8 ? 50 : 10,
        weight: INDICATOR_WEIGHTS.volatility,
        weightedScore: 0,
      });
      
      // Bollinger Squeeze detection
      const bandwidth = bb.bandwidth[bb.bandwidth.length - 1];
      const prevBandwidth = bb.bandwidth[bb.bandwidth.length - 10];
      
      if (!isNaN(bandwidth) && !isNaN(prevBandwidth) && bandwidth < prevBandwidth * 0.8) {
        warnings.push('Bollinger Squeeze - potential breakout');
        signals.push({
          indicator: 'BB_SQUEEZE',
          direction: 'neutral',
          score: 30,
          weight: INDICATOR_WEIGHTS.volatility,
          weightedScore: 0,
        });
      }
    }
    
    // ATR for volatility assessment
    const atrResult = atr(candles, 14);
    const atrCurrent = atrResult.value[atrResult.value.length - 1];
    
    if (!isNaN(atrCurrent)) {
      const atrPercent = (atrCurrent / lastCandle.close) * 100;
      
      signals.push({
        indicator: 'ATR_VOLATILITY',
        direction: 'neutral',
        score: Math.min(atrPercent * 5, 40),
        weight: INDICATOR_WEIGHTS.volatility,
        weightedScore: 0,
      });
      
      if (atrPercent > 2) {
        warnings.push('High volatility');
      }
    }
    
    return { signals, warnings };
  }

  /**
   * Calculate weighted score from all signals
   */
  private calculateWeightedScore(signals: SignalScore[]): number {
    let totalWeight = 0;
    let totalScore = 0;
    
    for (const signal of signals) {
      const weightedScore = signal.score * signal.weight;
      signal.weightedScore = weightedScore;
      totalWeight += signal.weight;
      totalScore += weightedScore;
    }
    
    return totalWeight > 0 ? (totalScore / totalWeight) : 0;
  }
}

export const signalAggregator = new SignalAggregator();
