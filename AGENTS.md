# ForexOS - OpenHands Agent Guidelines

## Project Overview

**ForexOS** is a Personal Forex Trading Operating System - a comprehensive, free, and open-source platform for retail forex traders.

## Core Principles

1. **100% Free & Open Source**: No paid APIs, no subscriptions, no proprietary SDKs
2. **MT5 Only**: MetaTrader 5 is the sole execution platform
3. **Security First**: Your data stays yours
4. **Modular Architecture**: Independent, testable modules
5. **Clean Architecture**: Domain-Driven Design with SOLID principles

## Technology Stack

| Component | Technology |
|-----------|------------|
| Backend | Node.js + TypeScript |
| Frontend | Next.js |
| Database | Neon PostgreSQL |
| Robot | Python |
| Deployment | Vercel |
| Execution | MT5 |

## Project Structure

```
forexos/
├── apps/
│   ├── web/         # Next.js frontend
│   └── api/         # Node.js backend
├── packages/        # Shared packages
├── robot/          # Python trading robot
└── docs/           # Documentation
```

## Agent Instructions

### Before Writing Code

1. **Read the architecture docs** in `/docs`:
   - Architecture.md
   - CodingStandards.md
   - TestingStrategy.md
   - FolderStructure.md

2. **Understand the domain**:
   - Trading Engine handles order execution
   - Risk Management protects capital
   - Pattern Detection generates signals
   - Backtest Engine validates strategies

3. **Check existing patterns**:
   - Look at similar modules before creating new ones
   - Follow established conventions

### Code Requirements

1. **TypeScript**:
   - Strict mode enabled
   - No `any` types
   - Explicit return types
   - Interface over type where appropriate

2. **Python (Robot)**:
   - Type hints required
   - PEP 8 compliant
   - docstrings for functions

3. **Testing**:
   - Unit tests for all business logic
   - Coverage > 80%
   - Mock external dependencies

4. **Security**:
   - Never log sensitive data
   - Validate all inputs
   - Use parameterized queries

### Module Creation

When creating a new module:

```
module/
├── domain/         # Entities, value objects
├── application/    # Use cases, services
├── infrastructure/ # DB, external APIs
└── api/           # Controllers, routes
```

### Commit Format

```bash
<type>(<scope>): <description>

Types: feat, fix, docs, refactor, test, chore
Scope: trading, risk, auth, patterns, analytics
```

Examples:
```bash
feat(trading): add market order execution
fix(risk): correct margin calculation
docs(api): update order endpoint
```

### Pull Request Requirements

- [ ] Title describes change
- [ ] Linked to issue (if applicable)
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes (or documented)

## Key Rules

### DO

- ✅ Follow Clean Architecture
- ✅ Write type-safe code
- ✅ Add tests for new features
- ✅ Document complex logic
- ✅ Use existing patterns
- ✅ Keep modules independent

### DON'T

- ❌ Use `any` type
- ❌ Skip tests for "simple" changes
- ❌ Hardcode secrets (use env vars)
- ❌ Create duplicate code
- ❌ Bypass risk management
- ❌ Submit without self-review

## Important Notes

### Trading Module

- All trades MUST pass through Risk Validator
- Position sizing MUST respect user settings
- Daily loss limits are NON-negotiable

### MT5 Integration

- Robot handles all MT5 communication
- Backend uses robot API (not direct MT5)
- Real-time sync via WebSocket

### Database

- Neon PostgreSQL with Prisma/Drizzle ORM
- Migrations managed via CLI
- Never modify production data manually

### Deployment

- Vercel for frontend and serverless functions
- Self-hosted for robot server
- CI/CD via GitHub Actions

## File Locations

| Purpose | Location |
|---------|----------|
| API Design | `/docs/ApiDesign.md` |
| Database Schema | `/packages/database/schema/` |
| Trading Logic | `/apps/api/src/services/trading.service.ts` |
| Risk Rules | `/apps/api/src/services/risk.service.ts` |
| Pattern Detection | `/robot/src/patterns/` |
| Frontend Pages | `/apps/web/src/app/(dashboard)/` |
| Shared Types | `/packages/types/` |

## Testing Commands

```bash
# Frontend
npm run lint
npm run type-check
npm run test
npm run test:coverage

# Backend
npm run lint
npm run type-check
npm run test

# Robot
pytest
pytest --cov=src tests/
```

## Environment Variables

Required for development:

```bash
# Database
DATABASE_URL=postgresql://...

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...

# Encryption
ENCRYPTION_KEY=...

# MT5 Robot
ROBOT_API_KEY=...
ROBOT_API_URL=...
```

## Getting Help

1. Check `/docs/` for architecture details
2. Search existing code for patterns
3. Check GitHub issues for context
4. Review tests for usage examples

## Important Reminders

- **WAIT FOR APPROVAL** before implementing production code
- This file contains project rules - follow them
- When in doubt, ask before assuming
- Keep security in mind at all times
