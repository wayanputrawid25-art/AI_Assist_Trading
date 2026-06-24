# Repository Guidelines - Personal Forex Trading Operating System

## Overview

Guidelines for contributing to and maintaining the ForexOS repository.

## Branch Strategy

### Branch Types

```
main                    # Production-ready code
├── develop             # Integration branch
│   ├── feature/*       # Feature branches
│   ├── fix/*           # Bug fix branches
│   ├── refactor/*      # Refactoring branches
│   ├── docs/*          # Documentation branches
│   └── chore/*         # Maintenance branches
└── release/*           # Release branches
```

### Branch Naming

```bash
# Feature branches
feature/position-sizing
feature/user-authentication
feature/pattern-detection

# Bug fixes
fix/order-validation-error
fix/margin-calculation
fix/rate-limiting

# Refactoring
refactor/trading-service
refactor/api-routes

# Documentation
docs/api-documentation
docs/readme-updates
```

### Workflow

```bash
# 1. Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/position-sizing

# 2. Make changes and commit
git add .
git commit -m "feat(trading): add position sizing calculator"

# 3. Keep branch updated
git fetch origin
git rebase origin/develop

# 4. Push and create PR
git push -u origin feature/position-sizing

# 5. After review, merge via PR
# Select "Squash and merge" for feature branches
```

## Pull Request Guidelines

### PR Template

```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Related Issue
Fixes #(issue number)

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Screenshots (if applicable)

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-reviewed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No console.log or debug code
- [ ] No TODO comments in production code
```

### PR Size

| Type | Lines Changed | Recommendation |
|------|--------------|----------------|
| Small | < 200 | Ideal, quick review |
| Medium | 200-500 | OK, may need explanation |
| Large | 500-1000 | Consider splitting |
| Huge | > 1000 | Must split |

### Review Checklist

- [ ] Code follows coding standards
- [ ] Tests pass and coverage adequate
- [ ] No security vulnerabilities
- [ ] No performance issues
- [ ] Documentation updated
- [ ] Breaking changes documented
- [ ] Error handling complete

## Commit Guidelines

### Atomic Commits

Each commit should represent a single logical change:

```bash
# ✅ Good - Single logical change
git commit -m "fix(risk): correct margin calculation for hedging"

# ❌ Bad - Multiple changes in one commit
git commit -m "fix: various fixes and improvements"
```

### Commit Message Format

```bash
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Examples

```bash
# Feature
git commit -m "feat(trading): add market order execution

Implemented market order placement with real-time
confirmation from MT5. Includes validation for
symbol, volume, and margin requirements.

Closes #123"

# Bug fix
git commit -m "fix(risk): prevent negative position sizing

Added validation to ensure calculated lot size is
always positive. Added unit tests for edge cases.

Fixes #456"

# Refactor
git commit -m "refactor(auth): extract JWT validation

Moved JWT token validation from middleware to
AuthService for better testability."

# Documentation
git commit -m "docs(api): update order endpoint documentation

Added examples for all order types and error codes.
Closes #789"

# Chore
git commit -m "chore(deps): update dependencies

Updated all npm packages to latest versions.
Ran npm audit fix."
```

## Code Review Guidelines

### For Authors

1. **Keep PRs focused**: One feature or fix per PR
2. **Self-review first**: Review your own code before requesting
3. **Write good descriptions**: Explain why, not just what
4. **Be responsive**: Address feedback promptly
5. **Don't take feedback personally**: Reviews are about code

### For Reviewers

1. **Be constructive**: Suggest improvements, don't just criticize
2. **Be timely**: Review within 24 hours
3. **Be specific**: Explain why something should change
4. **Be fair**: Same standards for all code
5. **Approve when ready**: Don't block for minor issues

### Review Focus Areas

```typescript
// ✅ Correctness
// Does the code do what it's supposed to?

// Security
// Any security vulnerabilities?
// Is sensitive data protected?

// Performance
// Any obvious performance issues?
// N+1 queries? Memory leaks?

// Maintainability
// Is the code easy to understand?
// Are there clear names?
// Is logic appropriately complex?

// Testing
// Are edge cases covered?
// Is coverage adequate?

// Documentation
// Are complex parts explained?
// Is API documented?
```

## Issues

### Issue Template

```markdown
## Bug Report
**Description**
Clear description of the bug.

**Steps to Reproduce**
1. Go to '...'
2. Click on '...'
3. See error

**Expected Behavior**
What should happen.

**Actual Behavior**
What actually happens.

**Screenshots**
If applicable.

**Environment**
- OS: [e.g., macOS]
- Browser: [e.g., Chrome]
- Version: [e.g., 1.0.0]

---

## Feature Request
**Is your feature request related to a problem?**
Describe.

**Describe the solution you'd like**
Describe.

**Describe alternatives you've considered**
Describe.

**Additional context**
Add any other context.
```

## Versioning

### Semantic Versioning (SemVer)

```
MAJOR.MINOR.PATCH
1.2.3

- MAJOR: Breaking changes
- MINOR: New features (backward compatible)
- PATCH: Bug fixes (backward compatible)
```

### Version Tags

```bash
# Create version tag
git tag -a v1.0.0 -m "Release v1.0.0

Features:
- User authentication
- Basic trading
- Position tracking

BREAKING: None"

# Push tag
git push origin v1.0.0
```

## Releases

### Release Process

```bash
# 1. Update version in package.json
# 2. Update CHANGELOG.md
# 3. Create release commit
git commit -m "release: v1.0.0"

# 4. Create and push tag
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin main --tags

# 5. Create GitHub release
gh release create v1.0.0 \
  --title "v1.0.0" \
  --notes "$(cat CHANGELOG.md)"
```

### Changelog Format

```markdown
# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2025-01-01

### Added
- User authentication with JWT
- MT5 account connection
- Market order execution
- Position tracking

### Changed
- Updated API response format

### Fixed
- Margin calculation for hedged positions
- Race condition in order processing

### Removed
- Legacy v0 API endpoints

### Breaking
- Order response format changed
```

## Security

### Reporting Vulnerabilities

1. Email security@forexos.com (private)
2. Wait for acknowledgment (24 hours)
3. Provide details and reproduction
4. Allow time for fix (30 days)
5. Public disclosure after fix

### Security Checklist

- [ ] No secrets in code
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS prevention
- [ ] CSRF protection
- [ ] Rate limiting
- [ ] Secure headers
- [ ] Encryption for sensitive data

## Community Guidelines

### Code of Conduct

- Be respectful and inclusive
- Be patient with beginners
- Give constructive feedback
- Focus on the code, not the person
- Help others learn

### Getting Help

1. Read documentation first
2. Search existing issues
3. Ask in discussions
4. Create new issue if needed

### Recognition

Contributors will be:
- Listed in CONTRIBUTORS.md
- Mentioned in release notes
- Given credit in documentation
