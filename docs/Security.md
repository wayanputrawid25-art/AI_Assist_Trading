# Security - Personal Forex Trading Operating System

## Overview

Security-first approach to protect user data, trading credentials, and financial information. All security measures are implemented by default, not as an afterthought.

## Security Principles

1. **Defense in Depth**: Multiple layers of security
2. **Least Privilege**: Minimum permissions for all operations
3. **Secure by Default**: Safe configurations out of the box
4. **Zero Trust**: Never trust, always verify
5. **Transparency**: Open source for public security review

## Authentication & Authorization

### JWT Authentication

```typescript
interface JWTPayload {
  sub: string;        // User ID
  email: string;
  iat: number;        // Issued at
  exp: number;         // Expiration
  type: 'access' | 'refresh';
}

interface AuthConfig {
  accessTokenExpiry: number = 900;      // 15 minutes
  refreshTokenExpiry: number = 604800;  // 7 days
  refreshTokenRotation: boolean = true;
  maxRefreshTokens: number = 5;
}

// Token Generation
async function generateTokens(userId: string): Promise<Tokens> {
  const accessToken = await jwt.sign(
    { sub: userId, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  
  const refreshToken = await jwt.sign(
    { sub: userId, type: 'refresh', jti: generateId() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  // Store refresh token hash
  const refreshTokenHash = await hashToken(refreshToken);
  await storeRefreshToken(userId, refreshTokenHash);
  
  return { accessToken, refreshToken };
}

// Token Validation
async function validateAccessToken(token: string): Promise<JWTPayload> {
  try {
    const payload = await jwt.verify(token, process.env.JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    throw new AuthError('INVALID_TOKEN');
  }
}
```

### Password Security

```typescript
// Argon2id Password Hashing
async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,    // 64MB
    timeCost: 3,           // 3 iterations
    parallelism: 4,        // 4 parallel threads
    saltLength: 16,
    hashLength: 32
  });
}

async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

// Password Strength Requirements
interface PasswordRequirements {
  minLength: number = 12;
  requireUppercase: boolean = true;
  requireLowercase: boolean = true;
  requireNumbers: boolean = true;
  requireSymbols: boolean = true;
  banCommonPasswords: boolean = true;
  banUserInfo: boolean = true;
}

function validatePasswordStrength(
  password: string,
  userInfo?: { email: string; name: string }
): ValidationResult {
  const errors: string[] = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain special character');
  }
  
  if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
    errors.push('Password is too common');
  }
  
  if (userInfo) {
    const userInfoString = `${userInfo.email}${userInfo.name}`.toLowerCase();
    if (password.toLowerCase().includes(userInfoString)) {
      errors.push('Password cannot contain personal information');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
```

### Session Management

```typescript
interface Session {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

class SessionManager {
  async createSession(userId: string, request: Request): Promise<Session> {
    const session: Session = {
      id: generateId(),
      userId,
      ipAddress: getClientIP(request),
      userAgent: request.headers['user-agent'],
      createdAt: new Date(),
      lastActivityAt: new Date(),
      expiresAt: addDays(new Date(), 30),
      isActive: true
    };
    
    await db.sessions.insert(session);
    await this.logSessionEvent(session.id, 'created');
    
    return session;
  }
  
  async validateSession(sessionId: string): Promise<boolean> {
    const session = await db.sessions.find(sessionId);
    
    if (!session || !session.isActive) return false;
    if (new Date() > session.expiresAt) {
      await this.invalidateSession(sessionId);
      return false;
    }
    
    // Update last activity
    await db.sessions.update(sessionId, { lastActivityAt: new Date() });
    
    return true;
  }
  
  async invalidateSession(sessionId: string): Promise<void> {
    await db.sessions.update(sessionId, { isActive: false });
    await this.logSessionEvent(sessionId, 'invalidated');
  }
  
  async invalidateAllUserSessions(userId: string): Promise<void> {
    await db.sessions.updateMany(
      { userId, isActive: true },
      { isActive: false }
    );
    await this.logSessionEvent(null, 'all_invalidated', { userId });
  }
}
```

## Data Encryption

### Encryption at Rest

```typescript
// AES-256-GCM Encryption for sensitive data
class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  
  async encrypt(plaintext: string): Promise<EncryptedData> {
    const key = await this.getEncryptionKey();
    const iv = crypto.randomBytes(this.ivLength);
    
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('hex'),
      encryptedData: encrypted,
      authTag: authTag.toString('hex')
    };
  }
  
  async decrypt(data: EncryptedData): Promise<string> {
    const key = await this.getEncryptionKey();
    const iv = Buffer.from(data.iv, 'hex');
    const authTag = Buffer.from(data.authTag, 'hex');
    
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(data.encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

// Fields to encrypt
const SENSITIVE_FIELDS = [
  'mt5_password',
  'api_key',
  'api_secret',
  'bank_account_number',
  'id_number'
];
```

### Encryption in Transit

```typescript
// TLS 1.3 configuration
const sslOptions = {
  protocols: ['TLSv1.3'],
  ciphers: [
    'TLS_AES_256_GCM_SHA384',
    'TLS_CHACHA20_POLY1305_SHA256',
    'TLS_AES_128_GCM_SHA256'
  ].join(':'),
  honorCipherOrder: true,
  minVersion: 'TLSv1.3'
};

// HSTS Header
const hstsConfig = {
  maxAge: 31536000,           // 1 year
  includeSubDomains: true,
  preload: true
};
```

## API Security

### Rate Limiting

```typescript
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator: (request: Request) => string;
}

class RateLimiter {
  private store: Map<string, { count: number; resetAt: Date }>;
  
  constructor(private config: RateLimitConfig) {
    this.store = new Map();
  }
  
  async checkLimit(request: Request): Promise<RateLimitResult> {
    const key = this.config.keyGenerator(request);
    const now = new Date();
    
    let record = this.store.get(key);
    
    if (!record || record.resetAt < now) {
      record = {
        count: 0,
        resetAt: addMilliseconds(now, this.config.windowMs)
      };
    }
    
    record.count++;
    this.store.set(key, record);
    
    const remaining = Math.max(0, this.config.maxRequests - record.count);
    const resetIn = Math.max(0, record.resetAt.getTime() - now.getTime());
    
    return {
      allowed: record.count <= this.config.maxRequests,
      limit: this.config.maxRequests,
      remaining,
      resetIn
    };
  }
}

// Rate limit configurations by endpoint
const RATE_LIMITS = {
  auth: { windowMs: 60000, maxRequests: 10 },     // 10/min
  trading: { windowMs: 60000, maxRequests: 60 },   // 60/min
  market: { windowMs: 60000, maxRequests: 120 },   // 120/min
  analytics: { windowMs: 60000, maxRequests: 30 }, // 30/min
  default: { windowMs: 60000, maxRequests: 100 }  // 100/min
};
```

### Input Validation

```typescript
// Zod Schema Validation
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email().max(255),
  password: z.string()
    .min(12)
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/[0-9]/, 'Must contain number')
    .regex(/[!@#$%^&*]/, 'Must contain special char'),
  name: z.string().min(2).max(100).trim()
});

const orderSchema = z.object({
  symbol: z.string().regex(/^[A-Z]{6}$/),
  type: z.enum(['buy', 'sell']),
  volume: z.number().positive().max(100),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional()
});

// Validation middleware
function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: formatZodErrors(error)
        }
      });
    }
  };
}
```

### CORS Configuration

```typescript
const corsConfig = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With'
  ],
  exposedHeaders: ['X-Request-Id'],
  maxAge: 86400  // 24 hours
};
```

## MT5 Credential Security

### Credential Storage

```typescript
interface MT5Credentials {
  login: string;
  password: string;    // Encrypted
  server: string;
  accountId: string;
}

// Store with maximum encryption
async function storeMT5Credentials(
  userId: string,
  accountId: string,
  credentials: MT5Credentials
): Promise<void> {
  const encrypted = await encryptionService.encrypt(credentials.password);
  
  await db.mt5Accounts.upsert({
    userId,
    accountId,
    login: credentials.login,
    encryptedPassword: encrypted.encryptedData,
    encryptionIv: encrypted.iv,
    encryptionTag: encrypted.authTag,
    server: credentials.server,
    encryptedAt: new Date()
  });
}

// Retrieve and decrypt
async function getMT5Credentials(
  userId: string,
  accountId: string
): Promise<MT5Credentials> {
  const record = await db.mt5Accounts.find({
    userId,
    accountId
  });
  
  if (!record) {
    throw new NotFoundError('MT5 account not found');
  }
  
  const decrypted = await encryptionService.decrypt({
    encryptedData: record.encryptedPassword,
    iv: record.encryptionIv,
    authTag: record.encryptionTag
  });
  
  return {
    login: record.login,
    password: decrypted,
    server: record.server,
    accountId: record.accountId
  };
}
```

## Logging & Monitoring

### Security Audit Logging

```typescript
interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

class AuditLogger {
  async log(event: AuditLog): Promise<void> {
    // Never log passwords or sensitive data
    const sanitizedEvent = this.sanitize(event);
    
    await db.auditLogs.insert(sanitizedEvent);
    
    // Send to SIEM if configured
    if (process.env.SIEM_WEBHOOK_URL) {
      await this.sendToSIEM(sanitizedEvent);
    }
  }
  
  private sanitize(event: AuditLog): AuditLog {
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    
    const sanitized = { ...event };
    
    if (sanitized.oldValues) {
      sanitized.oldValues = this.removeSensitiveData(sanitized.oldValues);
    }
    
    if (sanitized.newValues) {
      sanitized.newValues = this.removeSensitiveData(sanitized.newValues);
    }
    
    return sanitized;
  }
}

// Events to log
const AUDIT_EVENTS = {
  AUTH: ['login', 'logout', 'register', 'password_change', '2fa_enable', '2fa_disable'],
  TRADE: ['order_place', 'order_cancel', 'position_open', 'position_close', 'position_modify'],
  ACCOUNT: ['mt5_connect', 'mt5_disconnect', 'settings_change'],
  RISK: ['risk_limit_change', 'risk_breach', 'margin_call'],
  ADMIN: ['user_delete', 'data_export', 'config_change']
};
```

### Intrusion Detection

```typescript
class IntrusionDetector {
  async checkLoginAttempt(
    email: string,
    ip: string,
    userAgent: string
  ): Promise<IntrusionCheck> {
    // Check for brute force
    const recentAttempts = await this.getRecentAttempts(ip, 15 * 60 * 1000);
    if (recentAttempts.length > 5) {
      return {
        blocked: true,
        reason: 'TOO_MANY_ATTEMPTS',
        blockedUntil: addMinutes(new Date(), 15)
      };
    }
    
    // Check for credential stuffing
    const suspiciousEmails = await this.getSuspiciousEmails(ip);
    if (suspiciousEmails > 3) {
      await this.flagAccount(email, 'POSSIBLE_CREDENTIAL_STUFFING');
    }
    
    // Check for unusual location
    const lastLogin = await this.getLastLogin(email);
    if (lastLogin) {
      const locationChange = await this.detectLocationChange(
        lastLogin.ip,
        ip
      );
      if (locationChange.risk > 0.8) {
        await this.sendSecurityAlert(email, 'UNUSUAL_LOCATION');
      }
    }
    
    return { blocked: false };
  }
  
  async detectAnomalousTrading(
    userId: string,
    order: Order
  ): Promise<AnomalyResult> {
    const recentTrades = await this.getRecentTrades(userId);
    const avgVolume = this.calculateAvgVolume(recentTrades);
    const stdDevVolume = this.calculateStdDev(recentTrades.map(t => t.volume));
    
    // Check for unusual volume
    const zScore = (order.volume - avgVolume) / stdDevVolume;
    if (zScore > 3) {
      return {
        isAnomaly: true,
        type: 'UNUSUAL_VOLUME',
        risk: zScore / 3,
        recommendation: 'REVIEW'
      };
    }
    
    // Check for rapid trading
    const recentCount = recentTrades.filter(
      t => new Date(t.timestamp).getTime() > Date.now() - 60000
    ).length;
    if (recentCount > 10) {
      return {
        isAnomaly: true,
        type: 'RAPID_TRADING',
        risk: recentCount / 10,
        recommendation: 'BLOCK'
      };
    }
    
    return { isAnomaly: false };
  }
}
```

## Security Headers

```typescript
const securityHeaders = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self'",
    "connect-src 'self' wss: https:",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "base-uri 'self'",
    "object-src 'none'"
  ].join('; '),
  
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=(self)'
  ].join(', ')
};
```

## Security Checklist

### Development
- [ ] No secrets in code
- [ ] Environment variables for all secrets
- [ ] Input validation on all endpoints
- [ ] Output encoding/escaping
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Secure error messages
- [ ] Logging implemented
- [ ] Dependencies audited

### Deployment
- [ ] HTTPS enforced
- [ ] HSTS enabled
- [ ] Security headers set
- [ ] Rate limiting configured
- [ ] CORS configured
- [ ] Database encryption enabled
- [ ] Backup configured
- [ ] Monitoring enabled
- [ ] Incident response plan ready

### Operations
- [ ] Regular security updates
- [ ] Log monitoring
- [ ] Penetration testing
- [ ] Dependency scanning
- [ ] Code review process
- [ ] Access control audited
- [ ] Encryption keys rotated
- [ ] Backup tested
