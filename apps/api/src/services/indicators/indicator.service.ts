// Indicator Calculation Service
import type { Candle, Timeframe } from '@forexos/types';
import type { 
  IndicatorType, 
  IndicatorSignal,
  IndicatorResult,
  MACD,
  Stochastic,
  RSI,
  ATR,
  BollingerBands,
  SignalType
} from '@forexos/types';
import type { 
  CombinedIndicators 
} from '../../../../packages/engine/src/indicators/types';
import * as trendIndicators from '../../../../packages/engine/src/indicators/trend';
import * as momentumIndicators from '../../../../packages/engine/src/indicators/momentum';
import * as volatilityIndicators from '../../../../packages/engine/src/indicators/volatility';
import * as volumeIndicators from '../../../../packages/engine/src/indicators/volume';

export interface CalculateIndicatorOptions {
  type: IndicatorType;
  candles: Candle[];
  params?: Record<string, number>;
}

export interface IndicatorCalculationResult {
  type: IndicatorType;
  values: number[];
  timestamps: number[];
  parameters: Record<string, number>;
  current?: number;
  previous?: number;
  signals?: IndicatorSignal[];
}

export class IndicatorService {
  /**
   * Calculate a single indicator
   */
  calculate(options: CalculateIndicatorOptions): IndicatorCalculationResult {
    const { type, candles, params = {} } = options;
    
    let result: IndicatorCalculationResult;
    
    switch (type) {
      // Trend
      case 'sma':
        result = this.formatResult(trendIndicators.sma(candles, params.period || 20));
        break;
      case 'ema':
        result = this.formatResult(trendIndicators.ema(candles, params.period || 20));
        break;
      case 'wma':
        result = this.formatResult(trendIndicators.wma(candles, params.period || 20));
        break;
      case 'dema':
        result = this.formatResult(trendIndicators.dema(candles, params.period || 20));
        break;
      case 'tema':
        result = this.formatResult(trendIndicators.tema(candles, params.period || 20));
        break;
      case 'vwap':
        result = this.formatResult(trendIndicators.vwap(candles));
        break;
      
      // Momentum
      case 'rsi':
        result = this.formatRSI(momentumIndicators.rsi(candles, params.period || 14));
        break;
      case 'macd':
        result = this.formatMACD(momentumIndicators.macd(
          candles,
          params.fastPeriod || 12,
          params.slowPeriod || 26,
          params.signalPeriod || 9
        ));
        break;
      case 'stoch':
        result = this.formatStochastic(momentumIndicators.stochastic(
          candles,
          params.kPeriod || 14,
          params.dPeriod || 3,
          params.smoothK || 3
        ));
        break;
      case 'adx':
        result = this.formatResult(momentumIndicators.adx(candles, params.period || 14));
        break;
      case 'momentum':
        result = this.formatResult(momentumIndicators.momentum(candles, params.period || 14));
        break;
      case 'roc':
        result = this.formatResult(momentumIndicators.roc(candles, params.period || 14));
        break;
      
      // Volatility
      case 'bb':
        result = this.formatBollingerBands(volatilityIndicators.bollingerBands(
          candles,
          params.period || 20,
          params.stdDev || 2
        ));
        break;
      case 'atr':
        result = this.formatATR(volatilityIndicators.atr(candles, params.period || 14));
        break;
      case 'stddev':
        result = this.formatResult(volatilityIndicators.standardDeviation(candles, params.period || 20));
        break;
      case 'kc':
        result = this.formatKeltner(volatilityIndicators.keltnerChannel(
          candles,
          params.emaPeriod || 20,
          params.atrPeriod || 10,
          params.multiplier || 2
        ));
        break;
      
      // Volume
      case 'obv':
        result = this.formatResult(volumeIndicators.obv(candles));
        break;
      case 'cmf':
        result = this.formatResult(volumeIndicators.cmf(candles, params.period || 20));
        break;
      case 'adl':
        result = this.formatResult(volumeIndicators.adl(candles));
        break;
      case 'vpt':
        result = this.formatResult(volumeIndicators.vpt(candles));
        break;
      
      default:
        throw new Error(`Unknown indicator type: ${type}`);
    }
    
    // Add signals
    result.signals = this.generateSignals(type, result);
    
    return result;
  }

  /**
   * Calculate multiple indicators at once
   */
  calculateAll(candles: Candle[]): CombinedIndicators {
    return {
      trend: {
        sma: trendIndicators.sma(candles, 20),
        ema: trendIndicators.ema(candles, 20),
        vwap: trendIndicators.vwap(candles),
      },
      momentum: {
        rsi: momentumIndicators.rsi(candles, 14),
        macd: momentumIndicators.macd(candles, 12, 26, 9),
        stoch: momentumIndicators.stochastic(candles, 14, 3, 3),
      },
      volatility: {
        bb: volatilityIndicators.bollingerBands(candles, 20, 2),
        atr: volatilityIndicators.atr(candles, 14),
      },
      volume: {
        obv: volumeIndicators.obv(candles).values,
        timestamps: candles.map(c => c.timestamp),
      },
    };
  }

  /**
   * Calculate Ichimoku Cloud
   */
  calculateIchimoku(candles: Candle[]): {
    tenkanSen: number[];
    kijunSen: number[];
    senkouSpanA: number[];
    senkouSpanB: number[];
    chikouSpan: number[];
    timestamps: number[];
  } {
    const result = trendIndicators.ichimoku(candles);
    return {
      tenkanSen: result.lines.find(l => l.name === 'tenkanSen')?.values || [],
      kijunSen: result.lines.find(l => l.name === 'kijunSen')?.values || [],
      senkouSpanA: result.lines.find(l => l.name === 'senkouSpanA')?.values || [],
      senkouSpanB: result.lines.find(l => l.name === 'senkouSpanB')?.values || [],
      chikouSpan: result.lines.find(l => l.name === 'chikouSpan')?.values || [],
      timestamps: result.timestamps,
    };
  }

  /**
   * Generate trading signals from indicator values
   */
  private generateSignals(type: IndicatorType, result: IndicatorCalculationResult): IndicatorSignal[] {
    const signals: IndicatorSignal[] = [];
    const { current, previous, values } = result;
    
    if (current === undefined || previous === undefined || isNaN(current) || isNaN(previous)) {
      return signals;
    }
    
    switch (type) {
      case 'sma':
      case 'ema':
        // Price crossing SMA/EMA
        if (values.length >= 2) {
          const currentPrice = values[values.length - 1];
          const smaValue = current;
          if (!isNaN(currentPrice) && !isNaN(smaValue)) {
            if (currentPrice > smaValue && values[values.length - 2] <= previous) {
              signals.push(this.createSignal('bullish', 70, 'Price crossed above ' + type.toUpperCase()));
            } else if (currentPrice < smaValue && values[values.length - 2] >= previous) {
              signals.push(this.createSignal('bearish', 70, 'Price crossed below ' + type.toUpperCase()));
            }
          }
        }
        break;
      
      case 'rsi':
        // RSI overbought/oversold
        if (current >= 70) {
          signals.push(this.createSignal('overbought', 80, `RSI at ${current.toFixed(1)} - Overbought`));
        } else if (current <= 30) {
          signals.push(this.createSignal('oversold', 80, `RSI at ${current.toFixed(1)} - Oversold`));
        }
        
        // RSI crossover
        if (previous < 50 && current >= 50) {
          signals.push(this.createSignal('bullish', 75, 'RSI crossed above 50'));
        } else if (previous > 50 && current <= 50) {
          signals.push(this.createSignal('bearish', 75, 'RSI crossed below 50'));
        }
        break;
      
      case 'macd':
        if (result.values && Array.isArray(result.values)) {
          // MACD histogram crossover
          const histValues = result.values;
          if (histValues.length >= 2) {
            const currentHist = typeof histValues[histValues.length - 1] === 'number' 
              ? histValues[histValues.length - 1] : NaN;
            const prevHist = typeof histValues[histValues.length - 2] === 'number'
              ? histValues[histValues.length - 2] : NaN;
            
            if (!isNaN(currentHist) && !isNaN(prevHist)) {
              if (prevHist <= 0 && currentHist > 0) {
                signals.push(this.createSignal('bullish', 80, 'MACD histogram crossed above zero'));
              } else if (prevHist >= 0 && currentHist < 0) {
                signals.push(this.createSignal('bearish', 80, 'MACD histogram crossed below zero'));
              }
            }
          }
        }
        break;
      
      case 'stoch':
        // Stochastic overbought/oversold
        if (current >= 80) {
          signals.push(this.createSignal('overbought', 70, `Stochastic %K at ${current.toFixed(1)}`));
        } else if (current <= 20) {
          signals.push(this.createSignal('oversold', 70, `Stochastic %K at ${current.toFixed(1)}`));
        }
        break;
    }
    
    return signals;
  }

  private createSignal(type: SignalType, strength: number, message: string): IndicatorSignal {
    return {
      indicator: type as any,
      type,
      strength,
      message,
      timestamp: Date.now(),
    };
  }

  // Format results
  private formatResult(result: IndicatorResult): IndicatorCalculationResult {
    return {
      type: result.type,
      values: result.values,
      timestamps: result.timestamps,
      parameters: result.parameters,
      current: result.current,
      previous: result.previous,
    };
  }

  private formatRSI(result: RSI): IndicatorCalculationResult {
    return {
      type: 'rsi',
      values: result.value,
      timestamps: result.timestamps,
      parameters: { period: 14 },
      current: result.value[result.value.length - 1],
      previous: result.value[result.value.length - 2],
    };
  }

  private formatMACD(result: MACD): IndicatorCalculationResult {
    return {
      type: 'macd',
      values: result.histogram,
      timestamps: result.timestamps,
      parameters: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
      current: result.histogram[result.histogram.length - 1],
      previous: result.histogram[result.histogram.length - 2],
    };
  }

  private formatStochastic(result: Stochastic): IndicatorCalculationResult {
    return {
      type: 'stoch',
      values: result.k,
      timestamps: result.timestamps,
      parameters: { kPeriod: 14, dPeriod: 3, smoothK: 3 },
      current: result.k[result.k.length - 1],
      previous: result.k[result.k.length - 2],
    };
  }

  private formatATR(result: ATR): IndicatorCalculationResult {
    return {
      type: 'atr',
      values: result.value,
      timestamps: result.timestamps,
      parameters: { period: 14 },
      current: result.value[result.value.length - 1],
      previous: result.value[result.value.length - 2],
    };
  }

  private formatBollingerBands(result: BollingerBands): IndicatorCalculationResult {
    return {
      type: 'bb',
      values: result.percent,
      timestamps: result.timestamps,
      parameters: { period: 20, stdDev: 2 },
      current: result.percent[result.percent.length - 1],
      previous: result.percent[result.percent.length - 2],
    };
  }

  private formatKeltner(result: { upper: number[]; middle: number[]; lower: number[]; timestamps: number[] }): IndicatorCalculationResult {
    return {
      type: 'kc',
      values: result.middle,
      timestamps: result.timestamps,
      parameters: { emaPeriod: 20, atrPeriod: 10, multiplier: 2 },
      current: result.middle[result.middle.length - 1],
      previous: result.middle[result.middle.length - 2],
    };
  }
}

export const indicatorService = new IndicatorService();
export default IndicatorService;
