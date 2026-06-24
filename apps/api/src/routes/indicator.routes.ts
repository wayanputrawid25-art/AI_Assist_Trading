import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { indicatorService } from '../services/indicators';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/auth';
import type { Candle, Timeframe } from '@forexos/types';
import type { IndicatorType } from '@forexos/types';

export const indicatorRouter = Router();

// Validation schemas
const candleSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  timeframe: z.enum(['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']),
  timestamp: z.number(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  tickVolume: z.number(),
  spread: z.number(),
});

const calculateIndicatorSchema = z.object({
  type: z.enum([
    'sma', 'ema', 'wma', 'dema', 'tema', 'vwap',
    'rsi', 'macd', 'stoch', 'adx', 'momentum', 'roc',
    'bb', 'atr', 'stddev', 'kc',
    'obv', 'cmf', 'adl', 'vpt'
  ]),
  candles: z.array(candleSchema).min(2),
  params: z.record(z.number()).optional(),
});

const calculateAllSchema = z.object({
  candles: z.array(candleSchema).min(2),
});

/**
 * POST /api/v1/indicators/calculate
 * Calculate a single indicator
 */
indicatorRouter.post('/calculate', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = calculateIndicatorSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
        details: validation.error.errors,
      },
    });
    return;
  }

  const { type, candles, params } = validation.data;
  
  try {
    const result = indicatorService.calculate({
      type: type as IndicatorType,
      candles: candles as Candle[],
      params,
    });

    res.json({
      success: true,
      data: {
        indicator: {
          type: result.type,
          current: result.current,
          previous: result.previous,
          parameters: result.parameters,
          signals: result.signals,
          candlesCount: result.values.length,
        },
        // Include last 100 values for charting
        values: result.values.slice(-100).map((v, i) => ({
          value: v,
          timestamp: result.timestamps[result.timestamps.length - 100 + i],
        })),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CALCULATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to calculate indicator',
      },
    });
  }
}));

/**
 * POST /api/v1/indicators/all
 * Calculate all indicators at once
 */
indicatorRouter.post('/all', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = calculateAllSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      },
    });
    return;
  }

  const { candles } = validation.data;
  
  try {
    const result = indicatorService.calculateAll(candles as Candle[]);

    res.json({
      success: true,
      data: {
        trend: {
          sma: {
            current: result.trend.sma?.current,
            values: result.trend.sma?.values.slice(-50) || [],
          },
          ema: {
            current: result.trend.ema?.current,
            values: result.trend.ema?.values.slice(-50) || [],
          },
          vwap: {
            current: result.trend.vwap?.current,
            values: result.trend.vwap?.value.slice(-50) || [],
          },
        },
        momentum: {
          rsi: {
            current: result.momentum.rsi?.value[result.momentum.rsi.value.length - 1],
            values: result.momentum.rsi?.value.slice(-50) || [],
          },
          macd: {
            current: result.momentum.macd?.histogram[result.momentum.macd.histogram.length - 1],
            values: result.momentum.macd?.histogram.slice(-50) || [],
            signal: result.momentum.macd?.signal.slice(-50) || [],
          },
          stoch: {
            current: result.momentum.stoch?.k[result.momentum.stoch.k.length - 1],
            values: result.momentum.stoch?.k.slice(-50) || [],
          },
        },
        volatility: {
          bb: result.volatility.bb ? {
            upper: result.volatility.bb.upper.slice(-50),
            middle: result.volatility.bb.middle.slice(-50),
            lower: result.volatility.bb.lower.slice(-50),
          } : null,
          atr: {
            current: result.volatility.atr?.value[result.volatility.atr.value.length - 1],
            values: result.volatility.atr?.value.slice(-50) || [],
          },
        },
        volume: {
          obv: result.volume.obv?.slice(-50) || [],
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CALCULATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to calculate indicators',
      },
    });
  }
}));

/**
 * POST /api/v1/indicators/ichimoku
 * Calculate Ichimoku Cloud
 */
indicatorRouter.post('/ichimoku', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = calculateAllSchema.safeParse(req.body);
  
  if (!validation.success) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: validation.error.errors[0].message,
      },
    });
    return;
  }

  const { candles } = validation.data;
  
  if (candles.length < 52) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_DATA',
        message: 'Ichimoku requires at least 52 candles',
      },
    });
    return;
  }
  
  try {
    const result = indicatorService.calculateIchimoku(candles as Candle[]);

    res.json({
      success: true,
      data: {
        tenkanSen: result.tenkanSen.slice(-50),
        kijunSen: result.kijunSen.slice(-50),
        senkouSpanA: result.senkouSpanA.slice(-50),
        senkouSpanB: result.senkouSpanB.slice(-50),
        chikouSpan: result.chikouSpan.slice(-50),
        timestamps: result.timestamps.slice(-50),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'CALCULATION_ERROR',
        message: error instanceof Error ? error.message : 'Failed to calculate Ichimoku',
      },
    });
  }
}));

/**
 * GET /api/v1/indicators/types
 * Get all supported indicator types
 */
indicatorRouter.get('/types', asyncHandler(async (_req: Request, res: Response) => {
  const types = {
    trend: [
      { type: 'sma', name: 'Simple Moving Average', params: [{ name: 'period', default: 20 }] },
      { type: 'ema', name: 'Exponential Moving Average', params: [{ name: 'period', default: 20 }] },
      { type: 'wma', name: 'Weighted Moving Average', params: [{ name: 'period', default: 20 }] },
      { type: 'dema', name: 'Double EMA', params: [{ name: 'period', default: 20 }] },
      { type: 'tema', name: 'Triple EMA', params: [{ name: 'period', default: 20 }] },
      { type: 'vwap', name: 'Volume Weighted Average Price', params: [] },
    ],
    momentum: [
      { type: 'rsi', name: 'Relative Strength Index', params: [{ name: 'period', default: 14 }] },
      { type: 'macd', name: 'MACD', params: [{ name: 'fastPeriod', default: 12 }, { name: 'slowPeriod', default: 26 }, { name: 'signalPeriod', default: 9 }] },
      { type: 'stoch', name: 'Stochastic Oscillator', params: [{ name: 'kPeriod', default: 14 }, { name: 'dPeriod', default: 3 }] },
      { type: 'adx', name: 'Average Directional Index', params: [{ name: 'period', default: 14 }] },
      { type: 'momentum', name: 'Momentum', params: [{ name: 'period', default: 14 }] },
      { type: 'roc', name: 'Rate of Change', params: [{ name: 'period', default: 14 }] },
    ],
    volatility: [
      { type: 'bb', name: 'Bollinger Bands', params: [{ name: 'period', default: 20 }, { name: 'stdDev', default: 2 }] },
      { type: 'atr', name: 'Average True Range', params: [{ name: 'period', default: 14 }] },
      { type: 'stddev', name: 'Standard Deviation', params: [{ name: 'period', default: 20 }] },
      { type: 'kc', name: 'Keltner Channel', params: [{ name: 'emaPeriod', default: 20 }, { name: 'atrPeriod', default: 10 }, { name: 'multiplier', default: 2 }] },
    ],
    volume: [
      { type: 'obv', name: 'On Balance Volume', params: [] },
      { type: 'cmf', name: 'Chaikin Money Flow', params: [{ name: 'period', default: 20 }] },
      { type: 'adl', name: 'Accumulation/Distribution', params: [] },
      { type: 'vpt', name: 'Volume Price Trend', params: [] },
    ],
  };

  res.json({
    success: true,
    data: types,
  });
}));

/**
 * GET /api/v1/indicators/health
 * Health check
 */
indicatorRouter.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'IndicatorService',
      timestamp: Date.now(),
    },
  });
}));
