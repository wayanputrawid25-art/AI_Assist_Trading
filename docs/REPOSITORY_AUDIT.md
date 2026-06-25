# ForexOS Repository Audit Report

**Audit Date:** 2026-06-25  
**Auditor:** Senior Software Architect  
**Repository:** https://github.com/forexos/forexos

---

## Executive Summary

This comprehensive audit examines the ForexOS monorepo structure, configuration, dependencies, and build pipeline. The repository follows a well-organized Turborepo-based monorepo architecture with npm workspaces.

| Component | Status |
|-----------|--------|
| Monorepo Integrity | ⚠️ Issues Found |
| Turbo Configuration | ❌ Incompatible |
| Workspaces | ✅ Valid |
| Package Exports | ✅ Valid |
| TypeScript References | ✅ Valid |
| Dependency Graph | ✅ Valid |
| Duplicate Packages | ⚠️ 85 Packages |
| Broken Imports | ✅ None |
| Circular Dependencies | ✅ None |
| Build Order | ⚠️ Partial Issues |

---

## 1. Monorepo Structure

### 1.1 Workspace Configuration

```json
// Root package.json
{
  "workspaces": ["apps/*", "packages/*"]
}
```

**Status:** ✅ Valid npm workspaces configuration

### 1.2 Package Inventory

| Package | Type | Location |
|---------|------|----------|
| `@forexos/api` | Application | `apps/api/` |
| `@forexos/web` | Application | `apps/web/` |
| `@forexos/config` | Shared Package | `packages/config/` |
| `@forexos/database` | Shared Package | `packages/database/` |
| `@forexos/engine` | Shared Package | `packages/engine/` |
| `@forexos/trading-config` | Shared Package | `packages/trading-config/` |
| `@forexos/types` | Shared Package | `packages/types/` |
| `@forexos/ui` | Shared Package | `packages/ui/` |
| `@forexos/utils` | Shared Package | `packages/utils/` |
| `forexos-robot` | Python Package | `robot/` |

### 1.3 Issues Found

| Issue | Severity | Description |
|-------|----------|-------------|
| Missing tsconfig.json | Medium | `packages/engine` lacks a tsconfig.json file |
| Missing tsconfig.json | Medium | `packages/trading-config` lacks a tsconfig.json file extending base config |
| Python package isolation | Info | `robot/` is a separate Poetry project, not part of npm workspaces |

---

## 2. Turbo Configuration

### 2.1 Current Configuration

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build#api": { "dependsOn": ["^build", "build#database", "build#trading-config", "build#engine"] },
    "build#web": { "dependsOn": ["^build", "build#api"] },
    ...
  }
}
```

### 2.2 Critical Issue: Schema Version Mismatch

**Status:** ❌ **BREAKING INCOMPATIBILITY**

| Issue | Details |
|-------|---------|
| Schema URL | `https://turbo.build/schema.json` |
| Turbo Version | `1.13.4` (installed) / `^1.12.0` (declared) |
| Problem | Turbo v2+ uses `pipeline` instead of `tasks` |

**Error Message:**
```
turbo_json_parse_error
  x Found an unknown key `tasks`.
```

**Recommendation:** Either:
1. Upgrade Turbo to v2+ and update schema to `https://turbo.build/schema.json` (v2 format)
2. Or downgrade syntax to Turbo v1 format using `pipeline` key

### 2.3 Recommended Turbo v1 Configuration

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build#api": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "build#web": {
      "dependsOn": ["^build", "build#api"],
      "outputs": [".next/**", "!.next/cache/**"]
    },
    "build#database": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "build#trading-config": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "build#engine": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "build#types": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "build#utils": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "build#ui": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    }
  }
}
```

---

## 3. Package Exports Verification

### 3.1 Export Map Status

| Package | Export | Path | Status |
|---------|--------|------|--------|
| `@forexos/database` | `.` | `src/index.ts` | ✅ OK |
| `@forexos/database` | `./schema` | `src/schema/index.ts` | ✅ OK |
| `@forexos/database` | `./repositories` | `src/repositories/index.ts` | ✅ OK |
| `@forexos/types` | `.` | `src/index.ts` | ✅ OK |
| `@forexos/types` | `./api` | `src/api.ts` | ✅ OK |
| `@forexos/types` | `./trading` | `src/trading.ts` | ✅ OK |
| `@forexos/types` | `./user` | `src/user.ts` | ✅ OK |
| `@forexos/types` | `./database` | `src/database.ts` | ✅ OK |
| `@forexos/ui` | `.` | `src/index.ts` | ✅ OK |
| `@forexos/ui` | `./button` | `src/components/ui/button.tsx` | ✅ OK |
| `@forexos/ui` | `./card` | `src/components/ui/card.tsx` | ✅ OK |
| `@forexos/ui` | `./input` | `src/components/ui/input.tsx` | ✅ OK |
| `@forexos/utils` | `.` | `src/index.ts` | ✅ OK |
| `@forexos/utils` | `./formatters` | `src/formatters.ts` | ✅ OK |
| `@forexos/utils` | `./validators` | `src/validators.ts` | ✅ OK |
| `@forexos/trading-config` | `.` | `src/index.ts` | ✅ OK |
| `@forexos/trading-config` | `./schema` | `src/schema.ts` | ✅ OK |
| `@forexos/trading-config` | `./loader` | `src/loader.ts` | ✅ OK |
| `@forexos/trading-config` | `./service` | `src/service.ts` | ✅ OK |
| `@forexos/config` | `./eslint` | `eslint/index.js` | ✅ OK |
| `@forexos/config` | `./typescript/base.json` | `typescript/base.json` | ✅ OK |
| `@forexos/config` | `./typescript/nextjs.json` | `typescript/nextjs.json` | ✅ OK |

**All declared exports are valid and resolve correctly.**

---

## 4. TypeScript Configuration

### 4.1 Configuration Files

| Package | Extends | Composite | Notes |
|---------|---------|-----------|-------|
| Root | None | No | Base configuration |
| `apps/api` | `@forexos/config/typescript/nextjs.json` | No | Path aliases configured |
| `apps/web` | `@forexos/config/typescript/nextjs.json` | No | Next.js plugin enabled |
| `packages/config` | None | No | No src directory |
| `packages/database` | `@forexos/config/typescript/base.json` | Yes | |
| `packages/engine` | **None** | No | ❌ Missing tsconfig.json |
| `packages/trading-config` | **None** | No | ❌ Missing tsconfig.json |
| `packages/types` | `@forexos/config/typescript/base.json` | No | |
| `packages/ui` | `@forexos/config/typescript/base.json` | No | JSX configured |
| `packages/utils` | `@forexos/config/typescript/base.json` | No | |

### 4.2 Issues

| Issue | Severity | Package |
|-------|----------|---------|
| Missing tsconfig.json | Medium | `packages/engine` |
| Missing tsconfig.json | Medium | `packages/trading-config` |
| No composite mode | Low | Several packages that build to dist |

### 4.3 Recommended tsconfig.json for packages/engine

```json
{
  "extends": "@forexos/config/typescript/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "composite": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

---

## 5. Dependency Graph

### 5.1 Internal Dependencies

```
@forexos/config       (no dependencies)
       │
       ├── @forexos/database
       ├── @forexos/types
       ├── @forexos/ui
       ├── @forexos/api
       └── @forexos/web

@forexos/utils        (no dependencies)

@forexos/trading-config  (no dependencies)
       │
       └── @forexos/engine

@forexos/types ─────────────┐
       │                    │
       ├── @forexos/engine  │
       ├── @forexos/api ────┤
       └── @forexos/web ────┤
                            │
       @forexos/ui ─────────┤
             │              │
             └── @forexos/web

       @forexos/database ────┘
             │
             └── @forexos/api

       @forexos/utils ───────┘
             │
             └── @forexos/api
```

### 5.2 Package Dependencies Summary

| Package | Depends On | Required By |
|---------|-----------|-------------|
| `@forexos/config` | (none) | database, types, ui, api, web |
| `@forexos/database` | config | api |
| `@forexos/types` | config | engine, api, web |
| `@forexos/utils` | (none) | api, web |
| `@forexos/ui` | config | web |
| `@forexos/trading-config` | (none) | engine |
| `@forexos/engine` | types, trading-config | api |
| `@forexos/api` | config, database, types, utils | web |
| `@forexos/web` | config, types, ui, utils | (none) |

### 5.3 Circular Dependencies

**Status:** ✅ **No circular dependencies detected**

### 5.4 Topological Build Order

| Order | Package | Dependencies |
|-------|---------|--------------|
| 1 | `@forexos/config` | None |
| 2 | `@forexos/utils` | None |
| 3 | `@forexos/trading-config` | None |
| 4 | `@forexos/database` | config |
| 5 | `@forexos/types` | config |
| 6 | `@forexos/ui` | config |
| 7 | `@forexos/engine` | types, trading-config |
| 8 | `@forexos/api` | config, database, types, utils |
| 9 | `@forexos/web` | config, types, ui, utils |

### 5.5 Turbo Build Configuration Analysis

| Task | Declared Dependencies | Matches Graph |
|------|----------------------|---------------|
| `build#config` | (none) | ✅ |
| `build#utils` | (none) | ✅ |
| `build#trading-config` | (none) | ✅ |
| `build#database` | `^build` | ✅ |
| `build#types` | `^build` | ✅ |
| `build#ui` | `^build` | ✅ |
| `build#engine` | `^build` | ✅ |
| `build#api` | `^build` + explicit | ⚠️ Partial (missing utils) |
| `build#web` | `^build` + explicit | ⚠️ Partial (missing ui) |

**Note:** Turbo's `^build` syntax handles transitive dependencies, but explicit declarations improve clarity and parallelism.

---

## 6. Duplicate Packages Analysis

### 6.1 Summary

| Metric | Value |
|--------|-------|
| Total packages in lock file | 1,340 |
| Packages with multiple versions | 85 |
| Percentage with duplicates | 6.3% |

### 6.2 Critical Duplicates (Version Spread > 3)

| Package | Versions | Impact |
|---------|----------|--------|
| `@vercel/backends` | 14 versions (0.8.16 - 8.3.0) | ⚠️ High |
| `@isaacs/cliui` | 7 versions | ⚠️ High |
| `@vercel/nft` | 8 versions | ⚠️ High |
| `@vercel/node` | 13 versions | ⚠️ High |
| `@vercel/fun` | 10 versions | ⚠️ High |
| `@vercel/rust` | 9 versions | ⚠️ High |
| `@micro` | 10 versions | ⚠️ High |
| `vercel` | 4 versions | ⚠️ Medium |

### 6.3 Moderate Duplicates (2-3 versions)

| Package | Versions |
|---------|----------|
| `next` | 2 |
| `eslint` | 3 |
| `express` | 3 |
| `drizzle-kit` | 4 |
| `tsx` | 2 |
| `vite` | 2 |
| `tailwindcss` | 2 |

### 6.4 Root Cause

The proliferation of Vercel-related packages is due to the `vercel` CLI being a dependency. The `vercel` package bundles multiple backend adapters and should be moved to `devDependencies` or removed entirely if not used directly.

### 6.5 Recommendations

1. **Move `vercel` to devDependencies** in root package.json
2. **Consider using selective resolutions** for critical packages
3. **Regular npm dedupe** to minimize hoisting issues

---

## 7. Broken Imports Check

### 7.1 All Imports Verified

| Import Pattern | Count | Status |
|---------------|-------|--------|
| `@forexos/types` | 11 | ✅ All valid |
| `@forexos/database/auth` | 2 | ✅ Valid (barrel export) |
| `@forexos/trading-config` | 1 | ✅ Valid |
| `@forexos/config` | 0 direct imports | ✅ N/A |
| `@forexos/ui` | 0 direct imports | ✅ N/A |
| `@forexos/utils` | 0 direct imports | ✅ N/A |

**No broken imports detected.**

---

## 8. Build Order Verification

### 8.1 Issues

| Issue | Description |
|-------|-------------|
| Turbo JSON Parse Error | Cannot run builds due to schema incompatibility |
| Inconsistent task naming | Using `build#name` pattern instead of standard `build` |

### 8.2 Build Pipeline Recommendations

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "type-check": {},
    "test": {
      "dependsOn": ["build"]
    },
    "test:coverage": {
      "dependsOn": ["build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

**Note:** Standard Turbo pattern uses `dependsOn: ["^build"]` with package-specific output overrides. The `^` prefix ensures all dependencies are built first.

---

## 9. Python Robot Package

### 9.1 Configuration

| Property | Value |
|----------|-------|
| Package Manager | Poetry |
| Python Version | ^3.11 |
| Location | `robot/` |
| Not in npm workspaces | ✅ Intentional separation |

### 9.2 Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| MetaTrader5 | ^5.0.45 | MT5 integration |
| numpy | ^1.26.0 | Numerical operations |
| pandas | ^2.2.0 | Data analysis |
| pydantic | ^2.6.0 | Data validation |
| httpx | ^0.27.0 | HTTP client |
| redis | ^5.0.0 | Caching |

### 9.3 Status

✅ **Isolated correctly** - Python robot is a separate project using Poetry, which is the recommended approach for polyglot monorepos.

---

## 10. Security Considerations

### 10.1 Dependencies with Known Vulnerabilities

```bash
47 vulnerabilities found
- 1 low
- 15 moderate
- 29 high
- 2 critical
```

**Recommendation:** Run `npm audit fix` regularly and monitor CVE announcements.

### 10.2 Secrets in Configuration

The `turbo.json` references environment variables:
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `ENCRYPTION_KEY`
- `REDIS_URL`

✅ **Properly externalized** - No hardcoded secrets found.

---

## 11. Summary of Issues

### Critical (Must Fix)

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 1 | Turbo v2 schema with v1 syntax | Build completely broken | Change `tasks` to `pipeline` |
| 2 | 85 duplicate packages | Bundle bloat, potential conflicts | Move `vercel` to devDeps, run dedupe |

### High Priority

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 3 | Missing tsconfig.json | packages/engine, packages/trading-config | Add tsconfig.json files |
| 4 | 47 npm vulnerabilities | Security risk | Run `npm audit fix` |

### Medium Priority

| # | Issue | Impact | Fix |
|---|-------|--------|-----|
| 5 | Inconsistent build task naming | Maintenance burden | Standardize to single `build` task |
| 6 | @forexos/database depends on @forexos/config | Unnecessary coupling | Review if config is truly needed |
| 7 | @forexos/types depends on @forexos/config | Unnecessary coupling | Review if config is truly needed |

---

## 12. Recommendations

### Immediate Actions

1. **Fix turbo.json** - Replace `tasks` with `pipeline` for Turbo v1 compatibility
2. **Add missing tsconfig.json** files to `packages/engine` and `packages/trading-config`
3. **Move `vercel` to devDependencies** to reduce duplicate packages
4. **Run `npm audit fix`** to address security vulnerabilities

### Short-term Improvements

1. Implement selective package resolutions for heavily duplicated packages
2. Add composite mode to TypeScript configurations for faster builds
3. Standardize build task naming across all packages
4. Consider moving root-level dependencies (bcryptjs, jsonwebtoken) to api package

### Long-term Architecture

1. Consider upgrading to Turbo v2+ with updated schema format
2. Implement proper TypeScript project references for incremental builds
3. Add workspace-level lint-staged configuration
4. Consider adding pre-commit hooks for type checking

---

## Appendix A: File Inventory

### Configuration Files
- `/package.json` - Root npm configuration
- `/turbo.json` - Turbo pipeline configuration ⚠️
- `/tsconfig.json` - Root TypeScript configuration
- `/.eslintrc.js` - ESLint configuration
- `/packages/config/eslint/index.js` - Shared ESLint config
- `/packages/config/typescript/base.json` - Base TS config
- `/packages/config/typescript/nextjs.json` - Next.js TS config

### Package.json Files
- `/apps/api/package.json`
- `/apps/web/package.json`
- `/packages/config/package.json`
- `/packages/database/package.json`
- `/packages/engine/package.json`
- `/packages/trading-config/package.json`
- `/packages/types/package.json`
- `/packages/ui/package.json`
- `/packages/utils/package.json`
- `/robot/pyproject.toml`

### Missing Configuration
- ❌ `/packages/engine/tsconfig.json`
- ❌ `/packages/trading-config/tsconfig.json`

---

*Report generated by OpenHands Repository Auditor*
