// Trading Decision Engine - Main orchestrator
import type { Candle, Timeframe } from '@forexos/types';
import type { 
  TradingDecision, 
  DecisionContext, 
  ExecutionPlan,
  DecisionConfidence,
  DecisionReason,
  PositionSizeResult
} from './types';
import { SignalAggregator, AggregatedSignal } from './aggregator';
import { RiskCalculator } from './risk';
import { atr } from '../indicators/volatility';

export interface DecisionEngineConfig {
  minConfidenceScore: number;
  defaultRiskPerTrade: number;
  minRiskReward: number;
  confidenceThresholds: {
    high: number;
    medium: number;
    low: number;
  };
}

const DEFAULT_CONFIG: DecisionEngineConfig = {
  minConfidenceScore: 20,
  defaultRiskPerTrade: 2,
  minRiskReward: 1.5,
  confidenceThresholds: {
    high: 60,
    medium: 30,
    low: 20,
  },
};

export class DecisionEngine {
  private config: DecisionEngineConfig;
  private signalAggregator: SignalAggregator;
  private riskCalculator: RiskCalculator;

  constructor(config: Partial<DecisionEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.signalAggregator = new SignalAggregator();
    this.riskCalculator = new RiskCalculator({
      maxRiskPerTrade: this.config.defaultRiskPerTrade,
      minRiskReward: this.config.minRiskReward,
    });
  }

  /**
   * Generate a trading decision based on market context
   */
  decide(context: DecisionContext): TradingDecision | null {
    const { candles, symbol, timeframe, accountBalance, riskPerTrade } = context;
    
    if (candles.length < 50) {
      return null; // Not enough data
    }

    const lastCandle = candles[candles.length - 1];
    const aggregatedSignal = this.signalAggregator.analyze(context);
    
    // Determine action
    let action: 'buy' | 'sell' | 'hold';
    let reason: DecisionReason;
    let reasons: string[] = [];
    
    const { direction, score, dominantSignals, confluenceCount } = aggregatedSignal;
    
    // Check if we have enough confidence
    if (Math.abs(score) < this.config.minConfidenceScore) {
      return this.createHoldDecision({
        symbol,
        timeframe,
        candles,
        score,
        reasons: ['Insufficient signal strength'],
      });
    }
    
    // Determine action based on direction
    if (direction === 'bullish' && score > 0) {
      action = 'buy';
      reason = this.determineReason(aggregatedSignal);
      reasons = this.buildReasons(aggregatedSignal, 'bullish');
    } else if (direction === 'bearish' && score < 0) {
      action = 'sell';
      reason = this.determineReason(aggregatedSignal);
      reasons = this.buildReasons(aggregatedSignal, 'bearish');
    } else {
      return this.createHoldDecision({
        symbol,
        timeframe,
        candles,
        score,
        reasons: ['Neutral market conditions'],
      });
    }

    // Calculate entry, stop loss, and take profit
    const isBullish = action === 'buy';
    const atrResult = atr(candles, 14);
    const atrValue = atrResult.value[atrResult.value.length - 1] || (lastCandle.close * 0.001);
    
    const entryPrice = lastCandle.close;
    const atrMultiplier = isBullish ? 1.5 : 1.5;
    const stopLossDistance = atrValue * atrMultiplier;
    
    const stopLoss = isBullish
      ? entryPrice - stopLossDistance
      : entryPrice + stopLossDistance;
    
    const riskRewardRatio = 2; // 1:2 risk-reward
    const takeProfit = isBullish
      ? entryPrice + stopLossDistance * riskRewardRatio
      : entryPrice - stopLossDistance * riskRewardRatio;
    
    // Calculate confidence level
    const confidence = this.getConfidence(score);
    
    // Build decision
    const decision: TradingDecision = {
      id: `dec_${symbol}_${timeframe}_${Date.now()}`,
      action,
      confidence,
      confidenceScore: Math.abs(score),
      reason,
      reasons,
      symbol,
      timeframe,
      entryPrice,
      stopLoss,
      takeProfit,
      riskAmount: Math.abs(entryPrice - stopLoss),
      rewardAmount: Math.abs(takeProfit - entryPrice),
      riskRewardRatio,
      timestamp: Date.now(),
      metadata: {
        score,
        dominantSignals,
        confluenceCount,
        atr: atrValue,
        signals: aggregatedSignal.signals.slice(0, 5),
      },
    };
    
    return decision;
  }

  /**
   * Generate full execution plan with position sizing
   */
  createExecutionPlan(context: DecisionContext): ExecutionPlan | null {
    const decision = this.decide(context);
    
    if (!decision) {
      return null;
    }
    
    const { accountBalance, riskPerTrade, symbol } = context;
    
    // Calculate position size
    let positionSize: PositionSizeResult;
    
    if (decision.action === 'hold') {
      positionSize = {
        lotSize: 0,
        units: 0,
        riskAmount: 0,
        pipValue: 10,
        marginRequired: 0,
      };
    } else {
      this.riskCalculator.updateParameters({ maxRiskPerTrade: riskPerTrade });
      
      positionSize = this.riskCalculator.calculatePositionSize({
        symbol,
        accountBalance,
        entryPrice: decision.entryPrice!,
        stopLoss: decision.stopLoss!,
        isBullish: decision.action === 'buy',
      });
    }
    
    // Validate trade
    const validation = this.riskCalculator.validateTrade({
      symbol,
      accountBalance,
      currentPositions: context.currentPositions,
      riskAmount: positionSize.riskAmount,
      riskRewardRatio: decision.riskRewardRatio || 2,
      marginRequired: positionSize.marginRequired,
      dailyRiskUsed: 0, // Would need actual daily risk tracking
    });
    
    // Add position size to decision
    decision.positionSize = positionSize.lotSize;
    decision.riskAmount = positionSize.riskAmount;
    
    return {
      decision,
      positionSize,
      orderType: decision.action === 'buy' ? 'buy' : decision.action === 'sell' ? 'sell' : 'market',
      validation,
    };
  }

  /**
   * Quick analysis without generating full decision
   */
  quickAnalyze(candles: Candle[]): {
    direction: 'bullish' | 'bearish' | 'neutral';
    score: number;
    strength: 'strong' | 'moderate' | 'weak';
  } {
    if (candles.length < 20) {
      return { direction: 'neutral', score: 0, strength: 'weak' };
    }
    
    const context: DecisionContext = {
      candles,
      symbol: candles[0].symbol,
      timeframe: candles[0].timeframe,
      accountBalance: 10000,
      riskPerTrade: 2,
      maxPositions: 5,
      currentPositions: 0,
    };
    
    const signal = this.signalAggregator.analyze(context);
    
    let strength: 'strong' | 'moderate' | 'weak';
    if (Math.abs(signal.score) >= 50) {
      strength = 'strong';
    } else if (Math.abs(signal.score) >= 25) {
      strength = 'moderate';
    } else {
      strength = 'weak';
    }
    
    return {
      direction: signal.direction,
      score: signal.score,
      strength,
    };
  }

  /**
   * Determine the primary reason for the decision
   */
  private determineReason(signal: AggregatedSignal): DecisionReason {
    const { dominantSignals } = signal;
    
    // Check dominant signals
    if (dominantSignals.some(s => ['RSI14', 'MACD', 'STOCHASTIC'].includes(s))) {
      return 'indicator';
    }
    if (dominantSignals.some(s => ['EMA_CROSSOVER', 'EMA_ALIGNMENT'].includes(s))) {
      return 'confluence';
    }
    if (dominantSignals.some(s => ['BB_PERCENT', 'BB_SQUEEZE'].includes(s))) {
      return 'pattern';
    }
    
    return 'multi';
  }

  /**
   * Build human-readable reasons
   */
  private buildReasons(signal: AggregatedSignal, direction: 'bullish' | 'bearish'): string[] {
    const reasons: string[] = [];
    
    // Check for specific signals
    const bullishSignals = signal.signals.filter(s => s.direction === 'bullish' && s.score > 20);
    const bearishSignals = signal.signals.filter(s => s.direction === 'bearish' && s.score > 20);
    
    if (direction === 'bullish') {
      if (bullishSignals.some(s => s.indicator === 'RSI14')) reasons.push('RSI showing oversold');
      if (bullishSignals.some(s => s.indicator === 'MACD_HIST')) reasons.push('MACD histogram turning positive');
      if (bullishSignals.some(s => s.indicator === 'EMA_CROSSOVER')) reasons.push('Price crossed above EMA');
      if (bullishSignals.some(s => s.indicator === 'BB_PERCENT')) reasons.push('Price near lower Bollinger Band');
      if (signal.confluenceCount >= 3) reasons.push(`Multiple confirmations (${signal.confluenceCount} signals)`);
    } else {
      if (bearishSignals.some(s => s.indicator === 'RSI14')) reasons.push('RSI showing overbought');
      if (bearishSignals.some(s => s.indicator === 'MACD_HIST')) reasons.push('MACD histogram turning negative');
      if (bearishSignals.some(s => s.indicator === 'EMA_CROSSOVER')) reasons.push('Price crossed below EMA');
      if (bearishSignals.some(s => s.indicator === 'BB_PERCENT')) reasons.push('Price near upper Bollinger Band');
      if (signal.confluenceCount >= 3) reasons.push(`Multiple confirmations (${signal.confluenceCount} signals)`);
    }
    
    if (reasons.length === 0) {
      reasons.push(`Overall ${direction} signal (score: ${signal.score})`);
    }
    
    return reasons;
  }

  /**
   * Get confidence level from score
   */
  private getConfidence(score: number): DecisionConfidence {
    const absScore = Math.abs(score);
    if (absScore >= this.config.confidenceThresholds.high) {
      return 'high';
    } else if (absScore >= this.config.confidenceThresholds.medium) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Create a hold decision
   */
  private createHoldDecision(params: {
    symbol: string;
    timeframe: Timeframe;
    candles: Candle[];
    score: number;
    reasons: string[];
  }): TradingDecision {
    return {
      id: `dec_${params.symbol}_${params.timeframe}_${Date.now()}`,
      action: 'hold',
      confidence: 'low',
      confidenceScore: Math.abs(params.score),
      reason: 'risk',
      reasons: params.reasons,
      symbol: params.symbol,
      timeframe: params.timeframe,
      timestamp: Date.now(),
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<DecisionEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): DecisionEngineConfig {
    return { ...this.config };
  }
}

export const decisionEngine = new DecisionEngine();
