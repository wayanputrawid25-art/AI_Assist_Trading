import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { DecisionService } from '../services/decision';
import { asyncHandler } from '../middleware/error-handler';
import { requireAuth } from '../middleware/auth';
import type { Candle, Timeframe } from '@forexos/types';

export const decisionRouter = Router();

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

const decisionSchema = z.object({
  candles: z.array(candleSchema).min(50, 'At least 50 candles required'),
  symbol: z.string().min(1),
  timeframe: z.enum(['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1', 'W1']),
  accountBalance: z.number().positive().default(10000),
  riskPerTrade: z.number().min(0.1).max(10).default(2),
  maxPositions: z.number().min(1).max(20).default(5),
  currentPositions: z.number().min(0).default(0),
});

const quickAnalyzeSchema = z.object({
  candles: z.array(candleSchema).min(20, 'At least 20 candles required'),
});

const multiAnalyzeSchema = z.object({
  symbols: z.array(z.object({
    symbol: z.string(),
    candles: z.array(candleSchema),
  })).min(1),
  accountBalance: z.number().positive().default(10000),
  riskPerTrade: z.number().min(0.1).max(10).default(2),
});

const positionSizeSchema = z.object({
  symbol: z.string().min(1),
  accountBalance: z.number().positive(),
  entryPrice: z.number().positive(),
  stopLoss: z.number().positive(),
  isBullish: z.boolean(),
  leverage: z.number().min(1).max(500).optional().default(100),
});

/**
 * POST /api/v1/decision/analyze
 * Get trading decision with full analysis
 */
decisionRouter.post('/analyze', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = decisionSchema.safeParse(req.body);
  
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

  const service = new DecisionService();
  const context = {
    candles: validation.data.candles as Candle[],
    symbol: validation.data.symbol,
    timeframe: validation.data.timeframe as Timeframe,
    accountBalance: validation.data.accountBalance,
    riskPerTrade: validation.data.riskPerTrade,
    maxPositions: validation.data.maxPositions,
    currentPositions: validation.data.currentPositions,
  };

  const decision = service.getDecision(context);

  if (!decision) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_DATA',
        message: 'Not enough candles for analysis (need at least 50)',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      decision: {
        id: decision.id,
        action: decision.action,
        confidence: decision.confidence,
        confidenceScore: decision.confidenceScore,
        reason: decision.reason,
        reasons: decision.reasons,
        symbol: decision.symbol,
        timeframe: decision.timeframe,
        entryPrice: decision.entryPrice,
        stopLoss: decision.stopLoss,
        takeProfit: decision.takeProfit,
        riskRewardRatio: decision.riskRewardRatio,
        timestamp: decision.timestamp,
      },
      positionSize: decision.positionSize ? {
        lotSize: decision.positionSize,
      } : null,
    },
  });
}));

/**
 * POST /api/v1/decision/plan
 * Get full execution plan
 */
decisionRouter.post('/plan', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = decisionSchema.safeParse(req.body);
  
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

  const service = new DecisionService();
  const context = {
    candles: validation.data.candles as Candle[],
    symbol: validation.data.symbol,
    timeframe: validation.data.timeframe as Timeframe,
    accountBalance: validation.data.accountBalance,
    riskPerTrade: validation.data.riskPerTrade,
    maxPositions: validation.data.maxPositions,
    currentPositions: validation.data.currentPositions,
  };

  const plan = service.getExecutionPlan(context);

  if (!plan) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_DATA',
        message: 'Not enough candles for planning',
      },
    });
    return;
  }

  res.json({
    success: true,
    data: {
      decision: plan.decision,
      positionSize: plan.positionSize,
      orderType: plan.orderType,
      validation: plan.validation,
    },
  });
}));

/**
 * POST /api/v1/decision/quick
 * Quick market analysis (minimal data)
 */
decisionRouter.post('/quick', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = quickAnalyzeSchema.safeParse(req.body);
  
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

  const service = new DecisionService();
  const result = service.quickAnalyze(validation.data.candles as Candle[]);

  res.json({
    success: true,
    data: {
      direction: result.direction,
      score: result.score,
      strength: result.strength,
      timestamp: Date.now(),
    },
  });
}));

/**
 * POST /api/v1/decision/multi
 * Analyze multiple symbols
 */
decisionRouter.post('/multi', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = multiAnalyzeSchema.safeParse(req.body);
  
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

  const service = new DecisionService();
  
  const candlesBySymbol = new Map<string, Candle[]>();
  for (const item of validation.data.symbols) {
    if (item.candles.length >= 50) {
      candlesBySymbol.set(item.symbol, item.candles as Candle[]);
    }
  }

  if (candlesBySymbol.size === 0) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INSUFFICIENT_DATA',
        message: 'No symbols with sufficient data (need 50+ candles each)',
      },
    });
    return;
  }

  const result = service.analyzeMultiple(
    candlesBySymbol,
    validation.data.accountBalance,
    validation.data.riskPerTrade
  );

  res.json({
    success: true,
    data: {
      opportunities: result.opportunities,
      totalAnalyzed: candlesBySymbol.size,
      timestamp: Date.now(),
    },
  });
}));

/**
 * POST /api/v1/decision/position-size
 * Calculate position size
 */
decisionRouter.post('/position-size', requireAuth, asyncHandler(async (req: Request, res: Response) => {
  const validation = positionSizeSchema.safeParse(req.body);
  
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

  const service = new DecisionService();
  const result = service.calculatePositionSize(validation.data);

  res.json({
    success: true,
    data: result,
  });
}));

/**
 * GET /api/v1/decision/config
 * Get risk parameters
 */
decisionRouter.get('/config', requireAuth, asyncHandler(async (_req: Request, res: Response) => {
  const service = new DecisionService();
  const config = service.getRiskParameters();

  res.json({
    success: true,
    data: config,
  });
}));

/**
 * GET /api/v1/decision/health
 * Health check
 */
decisionRouter.get('/health', asyncHandler(async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      service: 'DecisionService',
      engine: 'TradingDecisionEngine',
      timestamp: Date.now(),
    },
  });
}));
