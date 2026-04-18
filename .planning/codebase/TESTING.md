# Codebase Testing

**Mapped:** 2026-04-18

## Test Framework

**No testing framework configured.**

- No test runner (Jest, Vitest, etc.) in any `package.json`
- No test files found in the codebase
- `apps/api` has placeholder: `"test": "echo \"Error: no test specified\" && exit 1"`
- No CI/CD pipeline detected

## Test Structure

N/A — No tests exist.

## Coverage

N/A — No coverage tooling configured.

## Recommendations

Given the stack:
- **Frontend (`apps/web`):** Vitest (native Vite integration) + React Testing Library
- **Backend (`apps/api`):** Vitest or Jest with supertest for API testing
- **Database (`packages/database`):** Vitest with test database container or Neon branch
- **E2E:** Playwright or Cypress for cross-stack integration tests

## Mocking

N/A — No mocking patterns established.
