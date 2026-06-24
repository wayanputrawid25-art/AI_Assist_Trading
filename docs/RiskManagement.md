# Risk Management - Personal Forex Trading Operating System

## Overview

Comprehensive risk management system designed to protect capital, limit drawdowns, and ensure long-term trading sustainability. All risk controls are enforced before any trade execution.

## Core Principles

1. **Capital Preservation**: Protect against catastrophic losses
2. **Consistency**: Apply same rules to all trades
3. **Adaptability**: Adjust to market conditions
4. **Transparency**: Clear visibility into risk metrics
5. **Automation**: Remove emotional decision-making

## Risk Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Risk Management System                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                   Risk Calculator                     │ │
│  │  • Position sizing                                    │ │
│  │  • Margin calculation                                 │ │
│  │  • Risk/Reward analysis                              │ │
│  └──────────────────────────────────────────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                 Risk Validators                       │ │
│  │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐      │ │
│  │  │ Daily  │ │ Position│ │ Drawdown│ │Margin │      │ │
│  │  │ Limit  │ │  Limit  │ │  Check  │ │ Check │      │ │
│  │  └────────┘ └────────┘ └────────┘ └────────┘      │ │
│  └──────────────────────────────────────────────────────┘ │
│                            │                                │
│                            ▼                                │
│  ┌──────────────────────────────────────────────────────┐ │
│  │                Risk Monitor                           │ │
│  │  • Real-time tracking                                │ │
│  │  • Alert system                                      │ │
│  │  • Auto-cutoff                                       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Position Sizing

### Fixed Lot Size

Simplest method - trade same volume every time.

```typescript
interface FixedLotSettings {
  lotSize: number;
}

function calculatePositionSize(
  settings: FixedLotSettings,
  symbol: string
): number {
  return settings.lotSize;
}
```

### Fixed Percentage Risk

Risk a fixed percentage of account on each trade.

```typescript
interface FixedPercentSettings {
  riskPercent: number;  // e.g., 1.0 for 1%
}

function calculatePositionSize(
  account: AccountInfo,
  settings: FixedPercentSettings,
  entryPrice: number,
  stopLoss: number,
  symbol: string
): number {
  const riskAmount = account.equity * (settings.riskPercent / 100);
  const pipValue = getPipValue(symbol);
  const stopLossPips = Math.abs(entryPrice - stopLoss) / getPipSize(symbol);
  
  const lotSize = riskAmount / (stopLossPips * pipValue);
  
  // Round to broker's lot step
  return roundToStep(lotSize, getLotStep(symbol));
}
```

### Fixed Risk Amount

Risk a fixed dollar amount per trade.

```typescript
interface FixedRiskSettings {
  riskAmount: number;
}

function calculatePositionSize(
  settings: FixedRiskSettings,
  entryPrice: number,
  stopLoss: number,
  symbol: string
): number {
  const pipValue = getPipValue(symbol);
  const stopLossPips = Math.abs(entryPrice - stopLoss) / getPipSize(symbol);
  
  const lotSize = settings.riskAmount / (stopLossPips * pipValue);
  
  return roundToStep(lotSize, getLotStep(symbol));
}
```

### ATR-Based Position Sizing

Adjust position size based on current volatility.

```typescript
interface ATRSettings {
  atrPeriod: number;
  riskPercent: number;
  minLot: number;
  maxLot: number;
}

function calculateATRPositionSize(
  account: AccountInfo,
  settings: ATRSettings,
  candles: CandleData[],
  entryPrice: number,
  stopLoss: number,
  symbol: string
): number {
  // Calculate ATR
  const atr = calculateATR(candles, settings.atrPeriod);
  
  // Calculate stop loss in pips using ATR
  const atrMultiplier = 1.5;
  const atrStopPips = (atr * atrMultiplier) / getPipSize(symbol);
  
  // Use larger of manual SL or ATR-based SL
  const manualStopPips = Math.abs(entryPrice - stopLoss) / getPipSize(symbol);
  const effectiveStopPips = Math.max(manualStopPips, atrStopPips);
  
  // Calculate risk amount
  const riskAmount = account.equity * (settings.riskPercent / 100);
  const pipValue = getPipValue(symbol);
  
  // Calculate lot size
  let lotSize = riskAmount / (effectiveStopPips * pipValue);
  
  // Apply limits
  lotSize = Math.max(settings.minLot, lotSize);
  lotSize = Math.min(settings.maxLot, lotSize);
  
  return roundToStep(lotSize, getLotStep(symbol));
}
```

## Drawdown Protection

### Maximum Drawdown Limits

```typescript
interface DrawdownSettings {
  maxDrawdownPercent: number;  // e.g., 10%
  maxDrawdownDollars: number;   // e.g., $500
  actionOnBreach: 'stop' | 'reduce' | 'alert';
  reductionPercent: number;     // e.g., 50% (if reduce action)
}

class DrawdownMonitor {
  private peakEquity: number;
  private currentDrawdown: number;
  
  constructor(private settings: DrawdownSettings) {
    this.peakEquity = 0;
    this.currentDrawdown = 0;
  }
  
  update(equity: number): DrawdownStatus {
    // Update peak
    if (equity > this.peakEquity) {
      this.peakEquity = equity;
    }
    
    // Calculate drawdown
    const drawdownDollars = this.peakEquity - equity;
    const drawdownPercent = (drawdownDollars / this.peakEquity) * 100;
    
    this.currentDrawdown = drawdownPercent;
    
    // Check limits
    const breachedDollars = drawdownDollars >= this.settings.maxDrawdownDollars;
    const breachedPercent = drawdownPercent >= this.settings.maxDrawdownPercent;
    
    if (breachedDollars || breachedPercent) {
      return {
        isBreached: true,
        drawdownPercent,
        drawdownDollars,
        action: this.settings.actionOnBreach,
        reductionPercent: this.settings.reductionPercent
      };
    }
    
    // Warning zone (80% of limit)
    if (drawdownPercent >= this.settings.maxDrawdownPercent * 0.8) {
      return {
        isBreached: false,
        isWarning: true,
        drawdownPercent,
        drawdownDollars,
        action: 'alert'
      };
    }
    
    return { isBreached: false, drawdownPercent, drawdownDollars };
  }
  
  reset(): void {
    this.peakEquity = 0;
    this.currentDrawdown = 0;
  }
}
```

### Daily Loss Limit

```typescript
interface DailyLossSettings {
  maxDailyLoss: number;      // e.g., 5%
  maxDailyLossDollars: number;
  resetTime: string;         // e.g., "00:00" (midnight)
  actionOnBreach: 'stop' | 'reduce' | 'alert';
}

class DailyLossMonitor {
  private dailyStartBalance: number;
  private dailyPnL: number;
  private lastResetDate: string;
  
  constructor(private settings: DailyLossSettings) {
    this.dailyPnL = 0;
    this.lastResetDate = this.getCurrentDate();
  }
  
  update(equity: number, balance: number): DailyLossStatus {
    // Reset at new day
    const today = this.getCurrentDate();
    if (today !== this.lastResetDate) {
      this.reset(balance);
    }
    
    // Calculate daily P&L
    this.dailyPnL = equity - this.dailyStartBalance;
    const dailyLossPercent = (Math.abs(this.dailyPnL) / this.dailyStartBalance) * 100;
    
    // Check if in loss
    if (this.dailyPnL < 0) {
      const breachedDollars = Math.abs(this.dailyPnL) >= this.settings.maxDailyLossDollars;
      const breachedPercent = dailyLossPercent >= this.settings.maxDailyLoss;
      
      if (breachedDollars || breachedPercent) {
        return {
          isBreached: true,
          dailyPnL: this.dailyPnL,
          dailyLossPercent,
          action: this.settings.actionOnBreach
        };
      }
    }
    
    // Warning zone
    if (this.dailyPnL < 0) {
      const warningThreshold = this.settings.maxDailyLoss * 0.8;
      if (dailyLossPercent >= warningThreshold) {
        return {
          isBreached: false,
          isWarning: true,
          dailyPnL: this.dailyPnL,
          dailyLossPercent
        };
      }
    }
    
    return { isBreached: false, dailyPnL: this.dailyPnL, dailyLossPercent };
  }
  
  private reset(balance: number): void {
    this.dailyStartBalance = balance;
    this.dailyPnL = 0;
    this.lastResetDate = this.getCurrentDate();
  }
}
```

## Margin Management

### Margin Requirements

```typescript
interface MarginInfo {
  requiredMargin: number;
  availableMargin: number;
  usedMargin: number;
  marginLevel: number;
  marginCallLevel: number;
  stopOutLevel: number;
}

function calculateMarginRequirements(
  positions: Position[],
  pendingOrders: Order[],
  account: AccountInfo
): MarginInfo {
  // Calculate used margin
  let usedMargin = 0;
  
  for (const position of positions) {
    const positionMargin = calculatePositionMargin(
      position.symbol,
      position.volume,
      position.priceCurrent
    );
    usedMargin += positionMargin;
  }
  
  // Add pending order margin (if order would execute)
  for (const order of pendingOrders) {
    const orderMargin = calculatePositionMargin(
      order.symbol,
      order.volume,
      order.price
    );
    usedMargin += orderMargin;
  }
  
  const availableMargin = account.equity - usedMargin;
  const marginLevel = usedMargin > 0 ? (account.equity / usedMargin) * 100 : 0;
  
  return {
    requiredMargin: usedMargin,
    usedMargin,
    availableMargin,
    marginLevel,
    marginCallLevel: 100,  // Typically 100%
    stopOutLevel: 50       // Typically 50%
  };
}

function validateMargin(
  marginInfo: MarginInfo,
  proposedMargin: number
): MarginValidation {
  if (marginInfo.availableMargin < proposedMargin) {
    return {
      isValid: false,
      error: 'INSUFFICIENT_MARGIN',
      message: `Required margin ${proposedMargin}, available ${marginInfo.availableMargin}`,
      shortfall: proposedMargin - marginInfo.availableMargin
    };
  }
  
  // Check margin level after trade
  const newMarginLevel = (marginInfo.requiredMargin + proposedMargin) > 0
    ? (marginInfo.availableMargin - proposedMargin) / (marginInfo.requiredMargin + proposedMargin) * 100
    : 0;
  
  if (newMarginLevel < marginInfo.marginCallLevel) {
    return {
      isValid: false,
      error: 'MARGIN_LEVEL_WARNING',
      message: `Trade would bring margin level to ${newMarginLevel.toFixed(2)}%`,
      marginLevelAfterTrade: newMarginLevel
    };
  }
  
  return { isValid: true };
}
```

### Margin Call Prevention

```typescript
class MarginGuard {
  private marginCallThreshold: number = 120;
  private stopOutThreshold: number: number = 100;
  
  constructor(private account: AccountInfo) {}
  
  checkMarginSafety(): MarginSafetyStatus {
    const marginLevel = this.calculateMarginLevel();
    
    if (marginLevel <= this.stopOutThreshold) {
      return {
        level: 'stop_out',
        action: 'EMERGENCY_CLOSE',
        message: 'Stop out imminent - close positions or add funds immediately',
        positionsToClose: this.calculatePositionsToClose()
      };
    }
    
    if (marginLevel <= this.marginCallThreshold) {
      return {
        level: 'margin_call',
        action: 'REDUCE_EXPOSURE',
        message: 'Margin call warning - consider reducing positions',
        recommendedReduction: this.calculateRecommendedReduction(marginLevel)
      };
    }
    
    if (marginLevel <= 150) {
      return {
        level: 'warning',
        action: 'MONITOR',
        message: 'Margin level declining - monitor closely'
      };
    }
    
    return { level: 'safe', action: 'NONE' };
  }
}
```

## Risk Validation Pipeline

```typescript
interface RiskValidationRequest {
  accountId: string;
  symbol: string;
  direction: 'buy' | 'sell';
  volume: number;
  entryPrice: number;
  stopLoss?: number;
  takeProfit?: number;
}

interface RiskValidationResult {
  isValid: boolean;
  errors: RiskError[];
  warnings: RiskWarning[];
  calculated: {
    lotSize: number;
    riskAmount: number;
    riskPercent: number;
    marginRequired: number;
    riskRewardRatio?: number;
  };
}

class RiskValidator {
  async validate(request: RiskValidationRequest): Promise<RiskValidationResult> {
    const errors: RiskError[] = [];
    const warnings: RiskWarning[] = [];
    
    // 1. Load account data
    const account = await this.getAccount(request.accountId);
    const positions = await this.getOpenPositions(request.accountId);
    const settings = await this.getRiskSettings(request.accountId);
    
    // 2. Validate position limits
    if (positions.length >= settings.maxPositions) {
      errors.push({
        code: 'MAX_POSITIONS_EXCEEDED',
        message: `Maximum ${settings.maxPositions} positions allowed`
      });
    }
    
    // 3. Validate lot size limits
    if (request.volume > settings.maxLotPerTrade) {
      errors.push({
        code: 'MAX_LOT_EXCEEDED',
        message: `Maximum lot size is ${settings.maxLotPerTrade}`
      });
    }
    
    // 4. Calculate risk metrics
    let riskAmount = 0;
    let riskPercent = 0;
    
    if (request.stopLoss) {
      const pips = this.calculatePips(request.entryPrice, request.stopLoss);
      const pipValue = this.getPipValue(request.symbol);
      riskAmount = pips * pipValue * request.volume;
      riskPercent = (riskAmount / account.equity) * 100;
      
      // Check risk limit
      if (riskPercent > settings.maxRiskPercent) {
        errors.push({
          code: 'MAX_RISK_EXCEEDED',
          message: `Risk ${riskPercent.toFixed(2)}% exceeds limit ${settings.maxRiskPercent}%`
        });
      }
      
      // Check risk amount
      if (settings.maxRiskAmount && riskAmount > settings.maxRiskAmount) {
        errors.push({
          code: 'MAX_RISK_AMOUNT_EXCEEDED',
          message: `Risk amount $${riskAmount.toFixed(2)} exceeds limit $${settings.maxRiskAmount}`
        });
      }
    }
    
    // 5. Validate risk/reward ratio
    let riskRewardRatio: number | undefined;
    if (request.stopLoss && request.takeProfit) {
      const lossPips = Math.abs(request.entryPrice - request.stopLoss);
      const profitPips = Math.abs(request.takeProfit - request.stopLoss);
      riskRewardRatio = profitPips / lossPips;
      
      if (riskRewardRatio < settings.minRiskRewardRatio) {
        errors.push({
          code: 'LOW_RISK_REWARD',
          message: `Risk/Reward ${riskRewardRatio.toFixed(2)} below minimum ${settings.minRiskRewardRatio}`
        });
      }
    }
    
    // 6. Check margin
    const marginRequired = this.calculateMargin(request.symbol, request.volume, request.entryPrice);
    if (marginRequired > account.freeMargin) {
      errors.push({
        code: 'INSUFFICIENT_MARGIN',
        message: `Margin required $${marginRequired.toFixed(2)}, available $${account.freeMargin.toFixed(2)}`,
        shortfall: marginRequired - account.freeMargin
      });
    }
    
    // 7. Check daily loss limit
    const dailyStatus = this.checkDailyLoss(account);
    if (dailyStatus.isBreached) {
      errors.push({
        code: 'DAILY_LOSS_LIMIT',
        message: 'Daily loss limit reached - trading disabled'
      });
    } else if (dailyStatus.isWarning) {
      warnings.push({
        code: 'DAILY_LOSS_WARNING',
        message: `Daily loss at ${dailyStatus.dailyLossPercent.toFixed(2)}% of limit`
      });
    }
    
    // 8. Check drawdown limit
    const ddStatus = this.checkDrawdown(account);
    if (ddStatus.isBreached) {
      errors.push({
        code: 'DRAWDOWN_LIMIT',
        message: 'Maximum drawdown reached - trading disabled'
      });
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      calculated: {
        lotSize: request.volume,
        riskAmount,
        riskPercent,
        marginRequired,
        riskRewardRatio
      }
    };
  }
}
```

## Risk Alerts

```typescript
interface RiskAlert {
  id: string;
  type: AlertType;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

enum AlertType {
  DAILY_LOSS_WARNING = 'DAILY_LOSS_WARNING',
  DAILY_LOSS_BREACH = 'DAILY_LOSS_BREACH',
  DRAWDOWN_WARNING = 'DRAWDOWN_WARNING',
  DRAWDOWN_BREACH = 'DRAWDOWN_BREACH',
  MARGIN_WARNING = 'MARGIN_WARNING',
  MARGIN_CALL = 'MARGIN_CALL',
  CONCENTRATION_WARNING = 'CONCENTRATION_WARNING',
  CORRELATION_WARNING = 'CORRELATION_WARNING'
}

class RiskAlertManager {
  private alerts: RiskAlert[] = [];
  private subscribers: ((alert: RiskAlert) => void)[] = [];
  
  async createAlert(
    type: AlertType,
    severity: 'info' | 'warning' | 'critical',
    message: string
  ): Promise<RiskAlert> {
    const alert: RiskAlert = {
      id: generateUUID(),
      type,
      severity,
      message,
      timestamp: new Date(),
      acknowledged: false
    };
    
    this.alerts.push(alert);
    
    // Store in database
    await this.storeAlert(alert);
    
    // Notify subscribers
    for (const subscriber of this.subscribers) {
      subscriber(alert);
    }
    
    return alert;
  }
  
  subscribe(callback: (alert: RiskAlert) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      this.subscribers = this.subscribers.filter(s => s !== callback);
    };
  }
  
  getUnacknowledgedAlerts(): RiskAlert[] {
    return this.alerts.filter(a => !a.acknowledged);
  }
  
  acknowledge(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
    }
  }
}
```

## Correlation Risk

```typescript
interface CorrelationRiskSettings {
  maxCorrelation: number;  // e.g., 0.7
  checkCorrelatedPositions: boolean;
}

class CorrelationAnalyzer {
  private correlationMatrix: Map<string, Map<string, number>>;
  
  constructor(private settings: CorrelationRiskSettings) {
    this.correlationMatrix = new Map();
  }
  
  async analyzePositionRisk(
    positions: Position[],
    newPosition: NewPosition
  ): Promise<CorrelationRiskResult> {
    const correlatedPositions: CorrelatedPosition[] = [];
    let maxCorrelation = 0;
    
    for (const existing of positions) {
      if (existing.symbol === newPosition.symbol) {
        correlatedPositions.push({
          position: existing,
          correlation: 1.0,
          riskFactor: 'SAME_SYMBOL'
        });
        maxCorrelation = 1.0;
        continue;
      }
      
      const correlation = await this.getCorrelation(
        existing.symbol,
        newPosition.symbol
      );
      
      if (Math.abs(correlation) > this.settings.maxCorrelation) {
        // Check if positions are in same direction
        const sameDirection = existing.type === newPosition.type;
        
        correlatedPositions.push({
          position: existing,
          correlation,
          riskFactor: sameDirection ? 'SAME_DIRECTION' : 'HEDGE'
        });
        
        maxCorrelation = Math.max(maxCorrelation, Math.abs(correlation));
      }
    }
    
    if (correlatedPositions.length > 0) {
      return {
        hasRisk: true,
        maxCorrelation,
        correlatedPositions,
        recommendedAction: maxCorrelation > 0.8 ? 'BLOCK' : 'WARNING'
      };
    }
    
    return { hasRisk: false };
  }
  
  async getCorrelation(symbol1: string, symbol2: string): Promise<number> {
    // Check cache
    const cached = this.correlationMatrix.get(symbol1)?.get(symbol2);
    if (cached !== undefined) return cached;
    
    // Calculate from historical data
    const data1 = await this.getPriceData(symbol1);
    const data2 = await this.getPriceData(symbol2);
    
    const correlation = this.calculatePearsonCorrelation(data1, data2);
    
    // Cache result
    if (!this.correlationMatrix.has(symbol1)) {
      this.correlationMatrix.set(symbol1, new Map());
    }
    this.correlationMatrix.get(symbol1)!.set(symbol2, correlation);
    
    return correlation;
  }
}
```

## Real-time Risk Monitoring

```typescript
class RiskMonitor {
  private updateInterval: number = 1000; // 1 second
  
  start(): void {
    setInterval(() => this.checkRisks(), this.updateInterval);
  }
  
  async checkRisks(): Promise<void> {
    const accounts = await this.getActiveAccounts();
    
    for (const account of accounts) {
      // Check all risk metrics
      await this.checkMarginLevel(account);
      await this.checkDrawdown(account);
      await this.checkDailyLoss(account);
      await this.checkConcentration(account);
    }
  }
  
  private async checkMarginLevel(account: Account): Promise<void> {
    const marginInfo = await this.getMarginInfo(account);
    
    if (marginInfo.marginLevel < 150) {
      await this.riskAlertManager.createAlert(
        AlertType.MARGIN_WARNING,
        'warning',
        `Margin level at ${marginInfo.marginLevel.toFixed(1)}%`
      );
    }
    
    if (marginInfo.marginLevel < 120) {
      await this.riskAlertManager.createAlert(
        AlertType.MARGIN_CALL,
        'critical',
        `Margin call! Level at ${marginInfo.marginLevel.toFixed(1)}%`
      );
      
      // Emergency actions
      if (marginInfo.marginLevel < 100) {
        await this.emergencyClosePositions(account);
      }
    }
  }
}
```

## Performance Targets

| Metric | Target |
|--------|--------|
| Risk validation latency | < 50ms |
| Position size calculation | < 10ms |
| Risk alert delivery | < 1 second |
| Max consecutive losses protected | Yes |
| Drawdown recovery automation | Yes |
