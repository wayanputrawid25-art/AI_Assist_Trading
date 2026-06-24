// Trading Decision Service
import type { Candle, Timeframe } from '@forexos/types';
import type { 
  TradingDecision, 
  DecisionContext, 
  ExecutionPlan,
  RiskParameters,
  PositionSizeResult
} from '@forexos/types';
import { 
  DecisionEngine, 
  DecisionEngineConfig,
  SignalAggregator,
  RiskCalculator
} from '../../../packages/engine/src/decision';

export class DecisionService {
  private engine: DecisionEngine;
  private riskCalculator: RiskCalculator;

  constructor(config?: Partial<DecisionEngineConfig>) {
    this.engine = new DecisionEngine(config);
    this.riskCalculator = new RiskCalculator();
  }

  /**
   * Get trading decision for symbol
   */
  getDecision(context: DecisionContext): TradingDecision | null {
    return this.engine.decide(context);
  }

  /**
   * Get full execution plan
   */
  getExecutionPlan(context: DecisionContext): ExecutionPlan | null {
    return this.engine.createExecutionPlan(context);
  }

  /**
   * Quick market analysis
   */
  quickAnalyze(candles: Candle[]): {
    direction: 'bullish' | 'bearish' | 'neutral';
    score: number;
    strength: 'strong' | 'moderate' | 'weak';
    signals: {
      indicator: string;
      direction: string;
      score: number;
    }[];
  } {
    const analysis = this.engine.quickAnalyze(candles);
    return {
      ...analysis,
      signals: [], // Simplified for quick analysis
    };
  }

  /**
   * Analyze multiple symbols
   */
  analyzeMultiple(
    candlesBySymbol: Map<string, Candle[]>,
    accountBalance: number,
    riskPerTrade: number = 2
  ): {
    decisions: TradingDecision[];
    opportunities: {
      symbol: string;
      direction: 'bullish' | 'bearish';
      score: number;
    }[];
  } {
    const decisions: TradingDecision[] = [];
    const opportunities: { symbol: string; direction: 'bullish' | 'bearish'; score: number }[] = [];

    for (const [symbol, candles] of candlesBySymbol) {
      const context: DecisionContext = {
        candles,
        symbol,
        timeframe: 'H1',
        accountBalance,
        riskPerTrade,
        maxPositions: 5,
        currentPositions: 0,
      };

      const decision = this.engine.decide(context);
      
      if (decision && decision.action !== 'hold') {
        decisions.push(decision);
        
        opportunities.push({
          symbol,
          direction: decision.action as 'bullish' | 'bearish',
          score: decision.confidenceScore,
        });
      }
    }

    // Sort by score
    opportunities.sort((a, b) => b.score - a.score);

    return { decisions, opportunities };
  }

  /**
   * Calculate position size
   */
  calculatePositionSize(params: {
    symbol: string;
    accountBalance: number;
    entryPrice: number;
    stopLoss: number;
    isBullish: boolean;
    leverage?: number;
  }): PositionSizeResult {
    return this.riskCalculator.calculatePositionSize(params);
  }

  /**
   * Calculate take profit
   */
  calculateTakeProfit(params: {
    entryPrice: number;
    stopLoss: number;
    riskRewardRatio: number;
    isBullish: boolean;
  }): number {
    return this.riskCalculator.calculateTakeProfit(params);
  }

  /**
   * Validate trade
   */
  validateTrade(params: {
    symbol: string;
    accountBalance: number;
    currentPositions: number;
    riskAmount: number;
    riskRewardRatio: number;
    marginRequired: number;
    dailyRiskUsed: number;
  }): { valid: boolean; errors: string[]; warnings: string[] } {
    return this.riskCalculator.validateTrade(params);
  }

  /**
   * Get risk parameters
   */
  getRiskParameters(): RiskParameters {
    return this.riskCalculator.getParameters();
  }

  /**
   * Update risk parameters
   */
  updateRiskParameters(params: Partial<RiskParameters>): void {
    this.riskCalculator.updateParameters(params);
  }

  /**
   * Get engine configuration
   */
  getConfig(): DecisionEngineConfig {
    return this.engine.getConfig();
  }

  /**
   * Update engine configuration
   */
  updateConfig(config: Partial<DecisionEngineConfig>): void {
    this.engine.updateConfig(config);
  }
}

export const decisionService = new DecisionService();
export default DecisionService;
