# ForexOS Technical Indicators

**Last Updated:** 2026-06-25

Complete guide for ForexOS technical indicators - mathematical calculations used to analyze price data and generate trading signals.

---

## Table of Contents

1. [Overview](#overview)
2. [Indicator Categories](#indicator-categories)
3. [Trend Indicators](#trend-indicators)
4. [Momentum Indicators](#momentum-indicators)
5. [Volatility Indicators](#volatility-indicators)
6. [Volume Indicators](#volume-indicators)
7. [Usage Examples](#usage-examples)
8. [Signal Generation](#signal-generation)
9. [Configuration](#configuration)
10. [API Reference](#api-reference)
11. [Testing](#testing)

---

## Overview

### What Are Technical Indicators?

Technical indicators are mathematical calculations based on historical price, volume, or open interest data that traders use to:
- Identify trends
- Measure momentum
- Detect overbought/oversold conditions
- Generate trading signals
- Confirm price patterns

### Indicator Library Structure

```
packages/engine/src/indicators/
├── index.ts           # Main exports
├── types.ts           # Type definitions
├── trend/            # Trend indicators
│   └── index.ts       # SMA, EMA, WMA, VWAP, Ichimoku
├── momentum/         # Momentum indicators
│   └── index.ts       # RSI, MACD, Stochastic, ADX, Momentum, ROC
├── volatility/       # Volatility indicators
│   └── index.ts       # Bollinger Bands, ATR, Keltner, Donchian
└── volume/           # Volume indicators
    └── index.ts       # OBV, CMF, ADL, VPT, EOM
```

---

## Indicator Categories

### Trend Indicators

Measure the direction and strength of price movements.

| Indicator | Description | Output |
|-----------|-------------|--------|
| SMA | Simple Moving Average | Single line |
| EMA | Exponential Moving Average | Single line |
| WMA | Weighted Moving Average | Single line |
| DEMA | Double Exponential Moving Average | Single line |
| TEMA | Triple Exponential Moving Average | Single line |
| VWAP | Volume Weighted Average Price | Single line |
| Ichimoku | Ichimoku Cloud | 5 lines |

### Momentum Indicators

Measure the speed of price changes.

| Indicator | Description | Output |
|-----------|-------------|--------|
| RSI | Relative Strength Index | 0-100 |
| MACD | Moving Average Convergence Divergence | 3 lines |
| Stochastic | Stochastic Oscillator | %K, %D |
| ADX | Average Directional Index | 0-100 |
| Momentum | Price momentum | +/- values |
| ROC | Rate of Change | Percentage |

### Volatility Indicators

Measure the rate of price changes.

| Indicator | Description | Output |
|-----------|-------------|--------|
| Bollinger Bands | Price envelope | Upper, Middle, Lower |
| ATR | Average True Range | Single value |
| StdDev | Standard Deviation | Single value |
| Keltner Channel | ATR-based channel | Upper, Middle, Lower |
| Donchian Channel | Highest/Lowest channel | Upper, Middle, Lower |

### Volume Indicators

Measure trading volume patterns.

| Indicator | Description | Output |
|-----------|-------------|--------|
| OBV | On Balance Volume | Cumulative line |
| Volume SMA | Volume Moving Average | Single line |
| ADL | Accumulation/Distribution | Cumulative line |
| CMF | Chaikin Money Flow | -1 to +1 |
| VPT | Volume Price Trend | Cumulative line |
| EOM | Ease of Movement | Single value |

---

## Trend Indicators

### SMA (Simple Moving Average)

The arithmetic mean of prices over a specified period.

```typescript
import { sma } from '@forexos/engine';

const candles = getCandles('EURUSD', 'H1', 100);
const result = sma(candles, 20);

// Result structure
{
  type: 'sma',
  values: number[],      // Array of SMA values
  timestamps: number[],   // Timestamps for each value
  parameters: { period: 20 },
  current: 1.0850,       // Current SMA value
  previous: 1.0845       // Previous SMA value
}
```

**Parameters:**
- `period` (default: 20) - Number of bars for calculation

**Trading Use:**
- Price above SMA = Uptrend
- Price below SMA = Downtrend
- SMA crossover = Signal

### EMA (Exponential Moving Average)

Weighted average that gives more weight to recent prices.

```typescript
import { ema } from '@forexos/engine';

const result = ema(candles, 12);  // Fast EMA
const slowEma = ema(candles, 26); // Slow EMA
```

**Parameters:**
- `period` (default: 20) - Number of bars

**Advantages over SMA:**
- More responsive to price changes
- Less lag
- Weighs recent data more heavily

**Calculation:**
```
Multiplier = 2 / (period + 1)
EMA = (Close - Previous EMA) * Multiplier + Previous EMA
```

### WMA (Weighted Moving Average)

Weighted average with linearly increasing weights.

```typescript
import { wma } from '@forexos/engine';

const result = wma(candles, 20);
```

**Calculation:**
```
Weight Sum = n(n+1)/2
WMA = Σ(Price × Weight) / Weight Sum
```

### VWAP (Volume Weighted Average Price)

Average price weighted by volume.

```typescript
import { vwap } from '@forexos/engine';

const result = vwap(candles);
```

**Calculation:**
```
Typical Price = (High + Low + Close) / 3
VWAP = Σ(Typical Price × Volume) / Σ(Volume)
```

**Use Cases:**
- Intraday trading benchmark
- Support/resistance levels
- Trade execution quality

### Ichimoku Cloud

Comprehensive trend indicator with multiple components.

```typescript
import { ichimoku } from '@forexos/engine';

const result = ichimoku(candles);

// Five lines returned:
{
  lines: [
    { name: 'tenkanSen', values: [...] },   // Conversion Line (9-period)
    { name: 'kijunSen', values: [...] },   // Base Line (26-period)
    { name: 'senkouSpanA', values: [...] }, // Leading Span A
    { name: 'senkouSpanB', values: [...] }, // Leading Span B
    { name: 'chikouSpan', values: [...] }   // Lagging Span
  ],
  parameters: {
    tenkanPeriod: 9,
    kijunPeriod: 26,
    senkouBPeriod: 52,
    displacement: 26
  }
}
```

**Signal Rules:**
- **Bullish:** Price above cloud, Tenkan > Kijun
- **Bearish:** Price below cloud, Tenkan < Kijun
- **Cloud Thickness:** Indicates strength

---

## Momentum Indicators

### RSI (Relative Strength Index)

Oscillator measuring speed and magnitude of price changes (0-100).

```typescript
import { rsi } from '@forexos/engine';

const result = rsi(candles, 14);

// Result structure
{
  value: number[],     // RSI values (0-100)
  timestamps: number[]
}
```

**Parameters:**
- `period` (default: 14) - Number of bars

**Standard Levels:**
- **Overbought:** RSI > 70
- **Oversold:** RSI < 30
- **Neutral:** 30-70

**Trading Signals:**
- RSI < 30 = Potential buy (oversold)
- RSI > 70 = Potential sell (overbought)
- RSI crossover 50 = Trend confirmation

**Calculation:**
```
RSI = 100 - (100 / (1 + RS))
RS = Average Gain / Average Loss
```

### MACD (Moving Average Convergence Divergence)

Trend-following momentum indicator.

```typescript
import { macd } from '@forexos/engine';

const result = macd(candles, 12, 26, 9);

// Result structure
{
  macd: number[],       // MACD Line (Fast EMA - Slow EMA)
  signal: number[],     // Signal Line (EMA of MACD)
  histogram: number[],  // MACD - Signal
  timestamps: number[]
}
```

**Parameters:**
- `fastPeriod` (default: 12)
- `slowPeriod` (default: 26)
- `signalPeriod` (default: 9)

**Trading Signals:**
- MACD crosses above Signal = Bullish
- MACD crosses below Signal = Bearish
- MACD above 0 = Uptrend
- Histogram expansion = Momentum strengthening

### Stochastic Oscillator

Momentum indicator comparing close to high-low range.

```typescript
import { stochastic } from '@forexos/engine';

const result = stochastic(candles, 14, 3, 3);

// Result structure
{
  k: number[],    // %K values (fast or smoothed)
  d: number[],    // %D values (SMA of %K)
  timestamps: number[]
}
```

**Parameters:**
- `kPeriod` (default: 14) - Lookback for %K
- `dPeriod` (default: 3) - Smoothing for %D
- `smoothK` (default: 3) - Additional smoothing

**Trading Signals:**
- %K > 80 = Overbought
- %K < 20 = Oversold
- %K crosses above %D = Buy signal
- %K crosses below %D = Sell signal

**Calculation:**
```
%K = (Close - Lowest Low) / (Highest High - Lowest Low) × 100
%D = SMA(%K, dPeriod)
```

### ADX (Average Directional Index)

Measures trend strength (not direction).

```typescript
import { adx } from '@forexos/engine';

const result = adx(candles, 14);

// Result structure
{
  type: 'adx',
  values: number[],    // ADX values (0-100)
  timestamps: number[],
  parameters: { period: 14 },
  current: 25.5,
  previous: 24.8
}
```

**Parameters:**
- `period` (default: 14)

**Interpretation:**
- ADX < 20 = Weak trend (ranging)
- ADX 20-40 = Emerging trend
- ADX 40-60 = Strong trend
- ADX > 60 = Extreme trend

**Note:** ADX does not indicate direction. Use with +DI and -DI.

---

## Volatility Indicators

### Bollinger Bands

Price envelope with dynamic width based on standard deviation.

```typescript
import { bollingerBands } from '@forexos/engine';

const result = bollingerBands(candles, 20, 2);

// Result structure
{
  upper: number[],      // Upper band
  middle: number[],      // Middle band (EMA)
  lower: number[],      // Lower band
  bandwidth: number[],  // (Upper - Lower) / Middle
  percent: number[],    // %B position
  timestamps: number[]
}
```

**Parameters:**
- `period` (default: 20) - EMA period
- `stdDev` (default: 2) - Standard deviation multiplier

**Trading Signals:**
- Price touches upper band = Potential sell
- Price touches lower band = Potential buy
- Bands squeeze = Volatility contraction (breakout coming)
- Bands expand = Volatility expansion

**Bandwidth Indicator:**
- Low bandwidth = Squeeze (low volatility)
- High bandwidth = Expanded (high volatility)

### ATR (Average True Range)

Measures market volatility.

```typescript
import { atr } from '@forexos/engine';

const result = atr(candles, 14);

// Result structure
{
  value: number[],      // ATR values
  timestamps: number[]
}
```

**Parameters:**
- `period` (default: 14) - Smoothing period

**Use Cases:**
- Position sizing: Risk = ATR × Multiplier
- Stop loss: 1.5 × ATR below entry
- Breakout confirmation: Price moves > ATR

**Calculation:**
```
True Range = Max(
  High - Low,
  |High - Previous Close|,
  |Low - Previous Close|
)
ATR = Wilder Smoothing(TR, period)
```

### Keltner Channel

ATR-based price channel.

```typescript
import { keltnerChannel } from '@forexos/engine';

const result = keltnerChannel(candles, 20, 10, 2);

// Result structure
{
  upper: number[],
  middle: number[],     // EMA
  lower: number[],
  timestamps: number[]
}
```

**Parameters:**
- `emaPeriod` (default: 20)
- `atrPeriod` (default: 10)
- `multiplier` (default: 2)

### Donchian Channel

Highest high / Lowest low channel.

```typescript
import { donchianChannel } from '@forexos/engine';

const result = donchianChannel(candles, 20);

// Result structure
{
  upper: number[],     // Highest high
  middle: number[],     // (Upper + Lower) / 2
  lower: number[],      // Lowest low
  timestamps: number[]
}
```

**Parameters:**
- `period` (default: 20)

---

## Volume Indicators

### OBV (On Balance Volume)

Cumulative volume indicator.

```typescript
import { obv } from '@forexos/engine';

const result = obv(candles);

// Result structure
{
  type: 'obv',
  values: number[],
  timestamps: number[],
  current: 150000,
  previous: 148000
}
```

**Calculation:**
```
If Close > Previous Close: OBV += Volume
If Close < Previous Close: OBV -= Volume
If Close = Previous Close: OBV unchanged
```

**Use Cases:**
- Confirm trends: OBV and price should move together
- Divergence: OBV moves opposite to price = Reversal warning

### CMF (Chaikin Money Flow)

Measures money flow over a period (-1 to +1).

```typescript
import { cmf } from '@forexos/engine';

const result = cmf(candles, 20);

// Result structure
{
  type: 'cmf',
  value: number[],      // CMF values
  timestamps: number[],
  parameters: { period: 20 }
}
```

**Interpretation:**
- CMF > 0 = Buying pressure
- CMF < 0 = Selling pressure
- CMF crosses 0 = Potential reversal

### ADL (Accumulation/Distribution)

Tracks cumulative money flow.

```typescript
import { adl } from '@forexos/engine';

const result = adl(candles);

// Result structure
{
  type: 'adl',
  values: number[],
  timestamps: number[],
  current: 25000,
  previous: 24000
}
```

### VWAP Volume

Volume-weighted average price (from volume category).

```typescript
import { vwapVolume } from '@forexos/engine';

const result = vwapVolume(candles);
```

---

## Usage Examples

### Basic Usage

```typescript
import { 
  sma, ema, rsi, macd, bollingerBands, atr 
} from '@forexos/engine';

// Get candles
const candles = await mt5Service.getCandles('EURUSD', 'H1', undefined, undefined, 100);

// Calculate indicators
const sma20 = sma(candles, 20);
const ema50 = ema(candles, 50);
const rsiValue = rsi(candles, 14);
const macdResult = macd(candles);
const bbResult = bollingerBands(candles, 20, 2);
const atrValue = atr(candles, 14);

// Access current values
console.log(`SMA(20): ${sma20.current}`);
console.log(`EMA(50): ${ema50.current}`);
console.log(`RSI(14): ${rsiValue.value[rsiValue.value.length - 1]}`);
console.log(`MACD: ${macdResult.macd[macdResult.macd.length - 1]}`);
console.log(`BB Upper: ${bbResult.upper[bbResult.upper.length - 1]}`);
console.log(`ATR: ${atrValue.value[atrValue.value.length - 1]}`);
```

### Multiple Timeframes

```typescript
import { ema, rsi } from '@forexos/engine';

async function analyzeMultiTimeframe(symbol: string) {
  const timeframes = ['M5', 'M15', 'H1', 'H4'];
  const analysis = {};
  
  for (const tf of timeframes) {
    const candles = await mt5Service.getCandles(symbol, tf, undefined, undefined, 100);
    
    analysis[tf] = {
      ema: ema(candles, 20),
      rsi: rsi(candles, 14),
    };
  }
  
  return analysis;
}
```

### Trend Confirmation

```typescript
function getTrendConfirmation(candles: Candle[]) {
  const ema9 = ema(candles, 9);
  const ema21 = ema(candles, 21);
  const ema50 = ema(candles, 50);
  const adxValue = adx(candles, 14);
  
  const currentPrice = candles[candles.length - 1].close;
  const ema9Current = ema9.values[ema9.values.length - 1];
  const adxCurrent = adxValue.values[adxValue.values.length - 1];
  
  // Bullish: Price > EMA9 > EMA21 > EMA50, ADX > 25
  const isBullish = 
    currentPrice > ema9Current &&
    ema9Current > ema50.values[ema50.values.length - 1] &&
    adxCurrent > 25;
  
  // Bearish: Price < EMA9 < EMA21 < EMA50, ADX > 25
  const isBearish = 
    currentPrice < ema9Current &&
    ema9Current < ema50.values[ema50.values.length - 1] &&
    adxCurrent > 25;
  
  return { isBullish, isBearish, adx: adxCurrent };
}
```

### Overbought/Oversold Strategy

```typescript
function getRSISignals(candles: Candle[]) {
  const rsiResult = rsi(candles, 14);
  const macdResult = macd(candles);
  const bbResult = bollingerBands(candles, 20, 2);
  
  const rsiValue = rsiResult.value[rsiResult.value.length - 1];
  const bbLower = bbResult.lower[bbResult.lower.length - 1];
  const bbUpper = bbResult.upper[bbResult.upper.length - 1];
  const currentPrice = candles[candles.length - 1].close;
  
  // Buy signal: RSI oversold + price at lower band
  if (rsiValue < 30 && currentPrice <= bbLower) {
    return { signal: 'buy', reason: 'RSI oversold at lower band' };
  }
  
  // Sell signal: RSI overbought + price at upper band
  if (rsiValue > 70 && currentPrice >= bbUpper) {
    return { signal: 'sell', reason: 'RSI overbought at upper band' };
  }
  
  return { signal: 'neutral' };
}
```

### Position Sizing with ATR

```typescript
function calculatePositionSize(
  accountBalance: number,
  riskPercent: number,
  candles: Candle[]
) {
  const atrResult = atr(candles, 14);
  const atrValue = atrResult.value[atrResult.value.length - 1];
  
  // Risk amount in account currency
  const riskAmount = accountBalance * (riskPercent / 100);
  
  // Position size (lots)
  // Assuming EURUSD with $10 per pip per lot
  const pipValue = 10;
  const pipsRisk = atrValue / 0.0001; // Convert to pips
  const positionSize = riskAmount / (pipsRisk * pipValue);
  
  return {
    positionSize: Math.round(positionSize * 100) / 100, // Round to 2 decimals
    stopLossPips: pipsRisk,
    riskAmount
  };
}
```

---

## Signal Generation

### Combining Indicators

```typescript
interface TradingSignal {
  action: 'buy' | 'sell' | 'hold';
  confidence: number;    // 0-100
  reasons: string[];
  indicators: Record<string, number>;
}

function generateSignal(candles: Candle[]): TradingSignal {
  const reasons: string[] = [];
  let buySignals = 0;
  let sellSignals = 0;
  
  // 1. Trend (EMAs)
  const ema9 = ema(candles, 9);
  const ema21 = ema(candles, 21);
  const currentPrice = candles[candles.length - 1].close;
  const ema9Val = ema9.values[ema9.values.length - 1];
  
  if (currentPrice > ema9Val) buySignals += 2;
  else sellSignals += 2;
  
  if (ema9Val > ema21.values[ema21.values.length - 1]) buySignals++;
  else sellSignals++;
  
  // 2. Momentum (RSI)
  const rsiResult = rsi(candles, 14);
  const rsiVal = rsiResult.value[rsiResult.value.length - 1];
  
  if (rsiVal < 30) {
    buySignals += 2;
    reasons.push('RSI oversold');
  }
  if (rsiVal > 70) {
    sellSignals += 2;
    reasons.push('RSI overbought');
  }
  
  // 3. MACD
  const macdResult = macd(candles);
  const macdVal = macdResult.macd[macdResult.macd.length - 1];
  const signalVal = macdResult.signal[macdResult.signal.length - 1];
  
  if (macdVal > signalVal) buySignals++;
  else sellSignals++;
  
  // 4. ADX
  const adxResult = adx(candles, 14);
  const adxVal = adxResult.values[adxResult.values.length - 1];
  
  if (adxVal > 25) {
    reasons.push(adxVal > 40 ? 'Strong trend' : 'Moderate trend');
  }
  
  // Determine action
  const totalSignals = buySignals + sellSignals;
  const confidence = Math.abs(buySignals - sellSignals) / totalSignals * 100;
  
  let action: 'buy' | 'sell' | 'hold';
  if (buySignals > sellSignals && buySignals >= 4) {
    action = 'buy';
  } else if (sellSignals > buySignals && sellSignals >= 4) {
    action = 'sell';
  } else {
    action = 'hold';
  }
  
  return {
    action,
    confidence: Math.round(confidence),
    reasons,
    indicators: { rsi: rsiVal, macd: macdVal, adx: adxVal }
  };
}
```

---

## Configuration

### Trading Config

```yaml
# config/trading.yaml
indicators:
  trend:
    sma:
      defaultPeriod: 20
      enabled: true
    ema:
      defaultPeriod: 12
      enabled: true
    wma:
      defaultPeriod: 20
      enabled: true
  
  momentum:
    rsi:
      defaultPeriod: 14
      overbought: 70
      oversold: 30
      enabled: true
    macd:
      fastPeriod: 12
      slowPeriod: 26
      signalPeriod: 9
      enabled: true
    stochastic:
      kPeriod: 14
      dPeriod: 3
      enabled: true
    adx:
      defaultPeriod: 14
      enabled: true
  
  volatility:
    bollingerBands:
      period: 20
      stdDev: 2.0
      enabled: true
    atr:
      defaultPeriod: 14
      enabled: true
```

---

## API Reference

### Import

```typescript
// From trend indicators
import { sma, ema, wma, dema, tema, vwap, ichimoku } from '@forexos/engine';

// From momentum indicators
import { rsi, macd, stochastic, adx, momentum, roc } from '@forexos/engine';

// From volatility indicators
import { bollingerBands, atr, standardDeviation, keltnerChannel, donchianChannel } from '@forexos/engine';

// From volume indicators
import { obv, volumeSMA, adl, cmf, vpt, eom, vwapVolume } from '@forexos/engine';
```

### Common Types

```typescript
// Single value indicator result
interface IndicatorResult {
  type: string;
  values: number[];
  timestamps: number[];
  parameters: Record<string, number>;
  current?: number;
  previous?: number;
}

// Multi-value indicator result (e.g., Bollinger Bands)
interface MultiValueResult {
  type: string;
  lines: { name: string; values: number[] }[];
  timestamps: number[];
  parameters: Record<string, number>;
}
```

### Return Structures

| Function | Returns |
|----------|---------|
| `sma(candles, period)` | `IndicatorResult` |
| `ema(candles, period)` | `IndicatorResult` |
| `rsi(candles, period)` | `{ value: number[], timestamps }` |
| `macd(candles, fast, slow, signal)` | `{ macd, signal, histogram, timestamps }` |
| `stochastic(candles, k, d, smooth)` | `{ k, d, timestamps }` |
| `adx(candles, period)` | `IndicatorResult` |
| `bollingerBands(candles, period, stdDev)` | `{ upper, middle, lower, bandwidth, percent, timestamps }` |
| `atr(candles, period)` | `{ value: number[], timestamps }` |
| `ichimoku(candles)` | `{ lines, timestamps, parameters }` |

---

## Testing

### Running Tests

```bash
# Run all indicator tests
npm test -- --run

# Run specific test file
npm test -- --run trend.test.ts

# Watch mode
npm test -- --watch
```

### Test Structure

```
packages/engine/tests/indicators/
├── test-helpers.ts       # Test utilities
├── trend.test.ts        # Trend indicator tests
├── momentum.test.ts     # Momentum indicator tests
├── volatility.test.ts    # Volatility indicator tests
└── volume.test.ts       # Volume indicator tests
```

### Test Coverage

| Category | Tests | Coverage |
|----------|-------|----------|
| Trend | 19 | SMA, EMA, WMA, DEMA, TEMA, VWAP, Ichimoku |
| Momentum | 25 | RSI, MACD, Stochastic, ADX, Momentum, ROC |
| Volatility | 23 | Bollinger Bands, ATR, StdDev, Keltner, Donchian |
| Volume | 24 | OBV, Volume SMA, ADL, CMF, VPT, EOM, VWAP |
| **Total** | **91** | **All indicators tested** |

### Test Examples

```typescript
describe('RSI', () => {
  it('should return values between 0 and 100', () => {
    const candles = generateTestCandles(50);
    const result = rsi(candles, 14);
    
    const validValues = result.value.filter(v => !isNaN(v));
    validValues.forEach(value => {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(100);
    });
  });
});
```

---

## Quick Reference

### Indicator Summary

| Category | Indicator | Period | Output Range |
|----------|-----------|--------|--------------|
| **Trend** | SMA | 20 | Price scale |
| | EMA | 12, 26 | Price scale |
| | VWAP | - | Price scale |
| | Ichimoku | 9, 26, 52 | Multiple lines |
| **Momentum** | RSI | 14 | 0-100 |
| | MACD | 12, 26, 9 | Price scale |
| | Stochastic | 14, 3 | 0-100 |
| | ADX | 14 | 0-100 |
| **Volatility** | Bollinger | 20 | Price scale |
| | ATR | 14 | Price scale |
| **Volume** | OBV | - | Cumulative |
| | CMF | 20 | -1 to +1 |

### Common Period Settings

| Indicator | Fast | Slow | Signal |
|-----------|------|------|--------|
| EMA | 12 | 26 | - |
| MACD | 12 | 26 | 9 |
| RSI | 14 | - | - |
| Stochastic | 14 | 3 | - |
| Bollinger | 20 | - | 2 std |
| ATR | 14 | - | - |

---

*Last updated: 2026-06-25*
