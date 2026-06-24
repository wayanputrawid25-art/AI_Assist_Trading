// Database types - re-exports from @forexos/database
// These are TypeScript types for use in API and UI

// Re-export database entity types
export interface DbUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  settings: Record<string, unknown>;
  timezone: string;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export interface DbAccount {
  id: string;
  userId: string;
  mt5Login: number;
  mt5Server: string;
  accountName: string | null;
  balance: string;
  equity: string;
  margin: string;
  freeMargin: string;
  marginLevel: string;
  isConnected: boolean;
  isPrimary: boolean;
  lastSyncAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbOrder {
  id: string;
  accountId: string;
  mt5Ticket: number | null;
  symbol: string;
  type: 'buy' | 'sell';
  kind: 'market' | 'limit' | 'stop';
  volume: string;
  price: string;
  stopLoss: string | null;
  takeProfit: string | null;
  deviation: number | null;
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  comment: string | null;
  reason: string | null;
  filledPrice: string | null;
  filledAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbPosition {
  id: string;
  accountId: string;
  mt5Ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  volume: string;
  priceOpen: string;
  priceCurrent: string;
  stopLoss: string | null;
  takeProfit: string | null;
  profit: string;
  commission: string;
  swap: string;
  comment: string | null;
  magic: number | null;
  openedAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
}

export interface DbTrade {
  id: string;
  accountId: string;
  mt5Ticket: number;
  symbol: string;
  type: 'buy' | 'sell';
  volume: string;
  priceOpen: string;
  priceClose: string;
  stopLoss: string | null;
  takeProfit: string | null;
  profit: string;
  commission: string;
  swap: string;
  comment: string | null;
  magic: number | null;
  isWin: boolean | null;
  pips: string | null;
  durationMinutes: number | null;
  openedAt: Date;
  closedAt: Date;
  createdAt: Date;
}

export interface DbSession {
  id: string;
  userId: string;
  token: string;
  refreshToken: string | null;
  userAgent: string | null;
  ipAddress: string | null;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
}

export interface DbStrategy {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  type: 'manual' | 'automated' | 'semi-automatic';
  timeframe: string | null;
  parameters: Record<string, unknown>;
  riskSettings: {
    maxRiskPercent: number;
    maxPositions: number;
    maxDrawdownPercent: number;
  } | null;
  isActive: boolean;
  isBacktested: boolean;
  winRate: string | null;
  profitFactor: string | null;
  sharpeRatio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DbCandle {
  id: string;
  symbol: string;
  timeframe: string;
  timestamp: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  tickVolume: number | null;
  spread: number | null;
}

export interface DbPattern {
  id: string;
  userId: string;
  strategyId: string | null;
  name: string;
  type: 'candlestick' | 'chart' | 'technical';
  category: string;
  symbol: string;
  timeframe: string | null;
  direction: 'bullish' | 'bearish' | 'neutral' | null;
  confidence: string;
  startTimestamp: Date;
  endTimestamp: Date | null;
  priceAtDetection: string | null;
  description: string | null;
  parameters: string | null;
  imageUrl: string | null;
  isConfirmed: boolean;
  outcome: 'success' | 'failed' | 'pending' | null;
  profitAtCompletion: string | null;
  createdAt: Date;
}
