# Deployment - Personal Forex Trading Operating System

## Overview

Deployment architecture for ForexOS, covering infrastructure, CI/CD pipelines, and operational procedures.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Vercel Cloud                             │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Next.js Frontend                          │ │
│  │  • Edge Network CDN                                         │ │
│  │  • ISR for static pages                                    │ │
│  │  • Image Optimization                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                  API Routes (Serverless)                    │ │
│  │  • Node.js + TypeScript                                    │ │
│  │  • Auto-scaling                                            │ │
│  │  • Edge Functions for low latency                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Neon PostgreSQL                             │
│  • Serverless database                                          │
│  • Branching for development                                    │
│  • Auto-scaling                                                │
│  • Point-in-time recovery                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   Self-Hosted Robot Server                      │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│  │   Python    │ │    MT5      │ │    Redis    │             │
│  │   Robot     │ │  Terminal   │ │   Cache     │             │
│  │  (VPS/AWS)  │ │  (Always On)│ │  (Pub/Sub)  │             │
│  └─────────────┘ └─────────────┘ └─────────────┘             │
└─────────────────────────────────────────────────────────────────┘
```

## Vercel Deployment

### Project Configuration

```json
// vercel.json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install --legacy-peer-deps",
  "regions": ["iad1", "sfo1", "sin1"],
  "functions": {
    "api/**/*.ts": {
      "memory": 512,
      "maxDuration": 10
    }
  },
  "headers": [
    {
      "source": "/api/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "no-store" }
      ]
    }
  ]
}
```

### Environment Variables

```bash
# .env.example

# Database
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
DIRECT_URL=postgresql://user:pass@host/db?sslmode=require

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Encryption
ENCRYPTION_KEY=your-32-byte-encryption-key
ENCRYPTION_ALGORITHM=aes-256-gcm

# Redis (for caching and pub/sub)
REDIS_URL=rediss://user:pass@host:6379

# MT5 Robot Connection
ROBOT_API_KEY=your-robot-api-key
ROBOT_API_URL=https://your-robot-server.com

# External APIs
MARKET_DATA_API_KEY=your-market-data-key

# Application
NEXT_PUBLIC_APP_URL=https://forexos.com
NEXT_PUBLIC_API_URL=https://api.forexos.com
NODE_ENV=production

# Security
ALLOWED_ORIGINS=https://forexos.com,https://app.forexos.com
RATE_LIMIT_ENABLED=true

# Monitoring
SENTRY_DSN=your-sentry-dsn
LOG_LEVEL=info
```

### Vercel Environment Variables

```bash
# Set via Vercel CLI
vercel env add DATABASE_URL
vercel env add JWT_SECRET
vercel env add ENCRYPTION_KEY
vercel env add REDIS_URL

# Or use Vercel Dashboard
# Settings → Environment Variables
```

## CI/CD Pipeline

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  TURBO_TOKEN: ${{ secrets.TURBO_TOKEN }}
  TURBO_TEAM: ${{ vars.TURBO_TEAM }}

jobs:
  lint:
    name: Lint
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  type-check:
    name: Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run type-check

  test:
    name: Test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: forexos_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run test:ci
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/forexos_test
      - uses: codecov/codecov-action@v4

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [lint, type-check, test]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
      - uses: actions/upload-artifact@v4
        with:
          name: build
          path: .next
          retention-days: 7

  deploy-preview:
    name: Deploy Preview
    runs-on: ubuntu-latest
    needs: [build]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: .next
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          scope: ${{ secrets.VERCEL_ORG_ID }}

  deploy-production:
    name: Deploy Production
    runs-on: ubuntu-latest
    needs: [build]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://forexos.com
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
      - uses: actions/download-artifact@v4
        with:
          name: build
          path: .next
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          github-token: ${{ secrets.GITHUB_TOKEN }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
```

### Database Migrations

```yaml
# .github/workflows/migrations.yml
name: Database Migrations

on:
  push:
    branches: [main]
    paths: ['**/migrations/**', '**/drizzle.config.ts']

jobs:
  migrate:
    name: Run Migrations
    runs-on: ubuntu-latest
    environment:
      name: production
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
      - run: npm ci
      - run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
```

## Neon PostgreSQL Setup

### Connection Pooling

```typescript
// lib/db.ts
import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from '@/db/schema';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });
```

### Connection String

```
postgresql://user:password@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

## Robot Server Deployment

### VPS Requirements

| Component | Specification |
|-----------|---------------|
| CPU | 2+ cores |
| RAM | 4GB+ |
| Storage | 50GB+ SSD |
| Bandwidth | 100Mbps+ |
| OS | Ubuntu 22.04 LTS |
| Uptime | 99.9% |

### Docker Deployment

```dockerfile
# Dockerfile.robot
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.robot.txt .
RUN pip install --no-cache-dir -r requirements.robot.txt

# Copy application
COPY robot/ ./robot/

# Run
CMD ["python", "-m", "robot.main"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  robot:
    build:
      context: .
      dockerfile: Dockerfile.robot
    container_name: forexos-robot
    restart: unless-stopped
    environment:
      - MT5_LOGIN=${MT5_LOGIN}
      - MT5_PASSWORD=${MT5_PASSWORD}
      - MT5_SERVER=${MT5_SERVER}
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - API_KEY=${ROBOT_API_KEY}
    volumes:
      - mt5_data:/app/data
    networks:
      - forexos-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: forexos-redis
    restart: unless-stopped
    volumes:
      - redis_data:/data
    networks:
      - forexos-network

volumes:
  mt5_data:
  redis_data:

networks:
  forexos-network:
    driver: bridge
```

### Systemd Service

```ini
# /etc/systemd/system/forexos-robot.service
[Unit]
Description=ForexOS Trading Robot
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/forexos
Environment=MT5_LOGIN=12345678
Environment=MT5_PASSWORD=secret
Environment=MT5_SERVER=ICMarkets-Demo
Environment=DATABASE_URL=postgresql://...
ExecStart=/usr/bin/python3 -m robot.main
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

## Monitoring & Observability

### Sentry Configuration

```typescript
// lib/sentry.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  profilesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
  enabled: process.env.NODE_ENV === 'production',
});
```

### Health Checks

```typescript
// app/api/health/route.ts
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    robot: await checkRobotConnection(),
  };
  
  const healthy = Object.values(checks).every(c => c.status === 'healthy');
  
  return Response.json(
    { status: healthy ? 'healthy' : 'unhealthy', checks },
    { status: healthy ? 200 : 503 }
  );
}
```

## Backup Strategy

### Database Backups

- Neon automatically provides:
  - Continuous backup
  - Point-in-time recovery
  - 7-day retention on free tier
  - 30-day retention on paid tier

### Manual Backup Script

```bash
#!/bin/bash
# scripts/backup.sh

# Database backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Upload to S3
aws s3 cp backup_*.sql s3://forexos-backups/

# Keep last 30 backups locally
ls -t backup_*.sql | tail -n +31 | xargs rm
```

## Rollback Procedures

### Code Rollback

```bash
# Using Vercel CLI
vercel rollback [deployment-url]

# Or via Dashboard
# Deployments → Select deployment → "Promote to Production"
```

### Database Rollback

```bash
# Using Neon point-in-time recovery
# 1. Create new branch from point-in-time
# 2. Verify data
# 3. Promote to production
```

## Deployment Checklist

### Pre-Deployment
- [ ] All tests passing
- [ ] Code reviewed
- [ ] Environment variables set
- [ ] Database migrations ready
- [ ] Backup completed
- [ ] Rollback plan documented

### Post-Deployment
- [ ] Health check passed
- [ ] No error spikes in Sentry
- [ ] No increase in error rates
- [ ] Key features working
- [ ] Monitoring dashboards reviewed
- [ ] Stakeholders notified
