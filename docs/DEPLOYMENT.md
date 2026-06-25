# ForexOS Deployment Guide

Complete deployment documentation for ForexOS monorepo.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Local Development](#local-development)
5. [Vercel Deployment](#vercel-deployment)
6. [Environment Setup](#environment-setup)
7. [Build Pipeline](#build-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## Overview

ForexOS is a monorepo with the following structure:

```
forexos/
├── apps/
│   ├── api/          # Node.js REST API (Express)
│   └── web/          # Next.js Frontend
├── packages/
│   ├── database/     # Drizzle ORM
│   ├── engine/       # Trading Engine
│   ├── trading-config/ # Configuration Service
│   ├── types/        # Shared TypeScript Types
│   ├── ui/           # UI Components
│   └── utils/        # Utilities
├── robot/            # Python MT5 Robot
└── config/           # Trading Configuration
```

---

## Architecture

### Deployment Topology

```
┌─────────────────────────────────────────────────────────────┐
│                        VERCEL                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Frontend   │  │   Backend    │  │   Edge Config   │  │
│  │  (Next.js)  │  │  (Express)  │  │  (Monorepo)    │  │
│  └──────┬──────┘  └──────┬──────┘  └─────────────────┘  │
│         │                 │                               │
│         │    NEXT_PUBLIC_API_URL                          │
│         │                 │                               │
│         ▼                 ▼                               │
│  ┌─────────────────────────────────────────────┐          │
│  │              Neon PostgreSQL                 │          │
│  │              (Serverless)                    │          │
│  └─────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### Services

| Service | Technology | Hosting | Purpose |
|---------|-----------|---------|---------|
| Frontend | Next.js 14 | Vercel | Web application |
| Backend | Express.js | Vercel/Railway | REST API |
| Database | PostgreSQL | Neon | Primary database |
| Cache | Redis | Upstash | Session & cache |
| MT5 Bridge | WebSocket | Railway/Render | MT5 connectivity |

---

## Prerequisites

### Required Tools

```bash
# Node.js (>=20.0.0)
node --version  # v20.x.x

# npm (>=10.0.0)
npm --version   # v10.x.x

# Git
git --version
```

### Accounts

- [ ] GitHub Account
- [ ] Vercel Account
- [ ] Neon PostgreSQL Account
- [ ] MT5 Broker Account

---

## Local Development

### 1. Clone Repository

```bash
git clone https://github.com/wayanputrawid25-art/AI_Assist_Trading.git
cd AI_Assist_Trading
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Setup Environment

```bash
# Copy environment files
cp .env.example .env
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env
cp robot/.env.example robot/.env

# Edit each .env with your values
nano .env
```

### 4. Generate Database

```bash
npm run db:generate
npm run db:push
```

### 5. Start Development

```bash
# All apps
npm run dev

# Individual apps
cd apps/api && npm run dev
cd apps/web && npm run dev
```

### 6. Verify Setup

| App | URL | Status |
|-----|-----|--------|
| Frontend | http://localhost:3000 | ✅ |
| Backend | http://localhost:3001 | ✅ |
| API Docs | http://localhost:3001/docs | ✅ |

---

## Vercel Deployment

### 1. Connect Repository

1. Go to [Vercel Dashboard](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Configure project settings

### 2. Configure Environment Variables

In Vercel Dashboard → Settings → Environment Variables:

| Variable | Value | Environments |
|----------|-------|--------------|
| `NEXT_PUBLIC_APP_URL` | `https://your-domain.vercel.app` | Production, Preview |
| `NEXT_PUBLIC_API_URL` | `https://your-api.vercel.app` | Production, Preview |
| `NEXT_PUBLIC_APP_ENV` | `production` | Production |
| `NEXT_PUBLIC_ENABLE_ANALYTICS` | `false` | Production |

### 3. Deploy

```bash
# Using Vercel CLI
npm i -g vercel
vercel --prod
```

### 4. Configure Domains

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records

---

## Environment Setup

### Development Environment

```bash
# .env (root)
NODE_ENV=development
```

### Production Environment (Vercel)

```bash
# Environment Variables in Vercel Dashboard
NEXT_PUBLIC_APP_URL=https://forexos.vercel.app
NEXT_PUBLIC_API_URL=https://forexos-api.vercel.app
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_NODE_ENV=production
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_DEBUG_MODE=false
```

### Staging Environment

```bash
NEXT_PUBLIC_APP_URL=https://staging.forexos.vercel.app
NEXT_PUBLIC_API_URL=https://staging-api.vercel.app
NEXT_PUBLIC_APP_ENV=staging
```

---

## Build Pipeline

### Turbo Pipeline

The monorepo uses Turbo for build orchestration:

```json
{
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### Build Order

```
1. packages/types      → Base types
2. packages/utils      → Utilities  
3. packages/database    → Database layer
4. packages/trading-config → Configuration
5. packages/engine     → Trading engine
6. packages/ui        → UI components
7. apps/api           → Backend API
8. apps/web           → Frontend
```

### Build Commands

```bash
# Build all
npm run build

# Build specific app
npx turbo build --filter=@forexos/api
npx turbo build --filter=@forexos/web

# Clean build
npm run clean
npm run build
```

### Outputs

| Package | Output Directory | Artifact |
|---------|------------------|----------|
| `apps/api` | `apps/api/dist/` | Node.js bundle |
| `apps/web` | `apps/web/.next/` | Next.js build |
| `packages/*` | `packages/*/dist/` | TypeScript declarations |

---

## Configuration Files

### vercel.json

```json
{
  "framework": "nextjs",
  "buildCommand": "npx turbo build --filter=//web",
  "outputDirectory": "apps/web/.next",
  "installCommand": "npm install",
  "regions": ["sin1"]
}
```

### turbo.json

Key configurations:
- Global dependencies on `.env`
- Build order dependencies
- Output caching
- Task pipelines

### .npmrc

Package manager settings:
- Registry configuration
- Build strictness
- Cache settings

### .gitignore

Comprehensive exclusions:
- Environment files (`.env`)
- Build outputs (`dist/`, `.next/`)
- Test coverage
- IDE files

---

## Troubleshooting

### Build Failures

#### "Cannot find module"

```bash
# Rebuild all packages
npm run clean
npm install
npm run build
```

#### "TypeScript errors"

```bash
# Type check all packages
npm run type-check

# Fix errors in individual packages
cd packages/database && npm run type-check
```

### Environment Issues

#### "NEXT_PUBLIC_* not set"

1. Check Vercel environment variables
2. Redeploy after adding variables
3. Verify variable names match exactly

#### "DATABASE_URL not found"

1. Ensure Neon connection string is set
2. Check for `?sslmode=require` suffix
3. Verify database is accessible

### Deployment Issues

#### Preview deployments not working

1. Check GitHub PR status
2. Verify Vercel GitHub integration
3. Check build logs for errors

#### Custom domain not working

1. Verify DNS configuration
2. Wait for DNS propagation
3. Check SSL certificate status

---

## CI/CD Pipeline

### GitHub Actions

See `.github/workflows/` for:

- `ci.yml` - Build and test on PR
- `deploy.yml` - Deploy to Vercel on merge

### Workflow

```
PR Created
    ↓
Lint & Type Check
    ↓
Build Packages
    ↓
Run Tests
    ↓
Deploy Preview (Vercel)
    ↓
Code Review
    ↓
Merge to main
    ↓
Deploy Production (Vercel)
```

---

## Monitoring

### Vercel Analytics

Enable in Vercel Dashboard:
- Core Web Vitals
- Runtime metrics
- Build analytics

### Logging

Configure logging in `config/trading.yaml`:

```yaml
logging:
  level: "info"
  destinations:
    console:
      enabled: true
      level: "info"
    database:
      enabled: true
      level: "warn"
```

---

## Security

### Environment Variables

| Type | Example | Exposed to Browser |
|------|---------|-------------------|
| Public | `NEXT_PUBLIC_*` | ✅ Yes |
| Secret | `DATABASE_URL` | ❌ No |
| Internal | `PORT` | ❌ No |

### Never Commit

- `.env` files
- API keys
- Database credentials
- JWT secrets

---

## Support

For deployment issues:

1. Check [Vercel Documentation](https://vercel.com/docs)
2. Check [Turbo Documentation](https://turbo.build/repo)
3. Open GitHub Issue with deployment logs

---

*Last updated: 2026-06-24*
