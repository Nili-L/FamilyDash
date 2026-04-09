# Testing Patterns

**Analysis Date:** 2026-04-09

## Test Framework

**Runner:**
- Vitest 4.1.3 - Used for both frontend and backend tests
- Config files:
  - Frontend: No dedicated vitest.config (uses defaults, but test script in `package.json`)
  - Server: `server/vitest.config.js`

**Assertion Library:**
- Vitest built-in `expect()` from `vitest` package

**Run Commands:**
```bash
npm test              # Run all tests (includes server/index.test.js)
npm run test:watch   # Watch mode for development
```

Server-specific:
```bash
cd server && npm test
```

## Test File Organization

**Location:**
- **Frontend:** Co-located with source files
  - Example: `src/utils/dateHelpers.js` → `src/utils/dateHelpers.test.js`
- **Server:** Single integration test file at `server/index.test.js`

**Naming:**
- Pattern: `{source}.test.js`
- All tests use `.test.js` suffix (not `.spec.js`)

**Structure:**
```
src/
├── utils/
│   ├── dateHelpers.js
│   └── dateHelpers.test.js
├── hooks/
│   └── useFamilyData.js (no test yet)
└── components/
    └── (no tests yet)

server/
└── index.test.js (integration tests for entire API)
```

## Test Structure

**Suite Organization:**

Frontend (from `src/utils/dateHelpers.test.js`):
```javascript
describe('formatDate', () => {
  it('returns "Today" for today\'s date', () => { ... });
  it('returns "Tomorrow" for tomorrow', () => { ... });
  // Multiple test cases per function
});
```

Server (from `server/index.test.js`):
```javascript
describe('Token encryption', () => {
  // Single responsibility per describe block
});

describe('Auth', () => {
  // Related test suite
});
```

**Patterns:**
- `describe()` wraps related tests
- `it()` names test cases with clear language
- Vitest globals enabled: `describe`, `it`, `expect`, `beforeEach`, `afterEach` imported from 'vitest'

**Setup/Teardown:**

Server tests (from `server/index.test.js`):
```javascript
beforeEach(() => {
  _setData(freshData());
  rateLimitStore.clear();
  activeSessions.clear();
});
```

Frontend date tests (from `src/utils/dateHelpers.test.js`):
```javascript
const NOW = new Date('2026-04-09T12:00:00Z');
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(NOW); });
afterEach(() => { vi.useRealTimers(); });
```

## Mocking

**Framework:**
- Vitest `vi` utilities for fake timers and module mocking
- `supertest` for HTTP request/response mocking in server tests

**Patterns:**

Fake timers (from `dateHelpers.test.js`):
```javascript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

beforeEach(() => { 
  vi.useFakeTimers(); 
  vi.setSystemTime(NOW); 
});
afterEach(() => { vi.useRealTimers(); });
```

HTTP mocking (from `server/index.test.js`):
```javascript
import request from 'supertest';

async function login() {
  const res = await request(app)
    .post('/auth/login')
    .send({ password: 'test-password' });
  return res.headers['set-cookie']?.[0];
}

// Usage in test:
const cookie = await login();
const res = await request(app)
  .get('/api/family-members')
  .set('Cookie', cookie);
```

**What to Mock:**
- External dates/time: Use `vi.useFakeTimers()` and `vi.setSystemTime()`
- HTTP requests: Use `supertest` for Express app testing
- Internal state: Reset/clear test data via `_setData()` and `.clear()` methods

**What NOT to Mock:**
- Utility function logic (test directly)
- Crypto functions (test with real output)
- Date-fns library (use as-is for formatting)

## Fixtures and Factories

**Test Data:**

Helper function (from `server/index.test.js`):
```javascript
function freshData() {
  return {
    familyMembers: [],
    medications: [],
    appointments: [],
    tasks: [],
  };
}
```

Used in `beforeEach`:
```javascript
beforeEach(() => {
  _setData(freshData());  // Reset to clean state
});
```

**Location:**
- Fixtures defined in test files alongside tests
- No separate fixtures directory
- Server exposes `_setData()` function for test data injection
- Server exposes `_test` object containing internal functions for testing

**Example (from `server/index.test.js` line 9-10):**
```javascript
const { app, _setData, _test } = await import('./index.js');
const { encryptTokens, decryptTokens, timingSafeCompare, rateLimitStore, activeSessions } = _test;
```

## Coverage

**Requirements:** Not enforced

**View Coverage:**
- No coverage command configured
- No coverage reporting setup

## Test Types

**Unit Tests:**
- **Scope:** Single utility functions
- **Approach:** Direct assertion on function output
- **Example:** `dateHelpers.test.js` tests `formatDate()`, `formatTime()`, `isOverdue()`, etc. independently
- **Files:** `src/utils/dateHelpers.test.js`, `src/utils/dataValidation.test.js`

**Integration Tests:**
- **Scope:** Full Express API with authentication, CRUD operations, state management
- **Approach:** HTTP request/response testing via Supertest
- **Files:** `server/index.test.js` (593 lines, 30+ test cases)
- **Coverage areas:**
  - Token encryption/decryption (8 tests)
  - Authentication (8 tests)
  - Family Members CRUD (5 tests)
  - Medications CRUD (2 tests)
  - Appointments CRUD (2 tests)
  - Tasks CRUD (2 tests)
  - Bulk data operations (11 tests)
  - CORS (2 tests)

**E2E Tests:**
- Not present
- No Cypress, Playwright, or other E2E framework configured

## Common Patterns

**Async Testing:**

From `server/index.test.js`:
```javascript
it('logs in with correct password', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({ password: 'test-password' });
  expect(res.status).toBe(200);
  expect(res.body.success).toBe(true);
});
```

Pattern: `async` test function with `await` on async operations, assertions after completion

**Error Testing:**

From `server/index.test.js`:
```javascript
it('rejects wrong password', async () => {
  const res = await request(app)
    .post('/auth/login')
    .send({ password: 'wrong' });
  expect(res.status).toBe(401);
});
```

Pattern: Test error paths by asserting HTTP status codes and error responses

**State Isolation:**

From `server/index.test.js`:
```javascript
it('returns empty array initially', async () => {
  const cookie = await login();
  const res = await request(app)
    .get('/api/family-members')
    .set('Cookie', cookie);
  expect(res.status).toBe(200);
  expect(res.body).toEqual([]);
});
```

Pattern: Each test starts with `freshData()` via `beforeEach()`, all rate limit and session stores cleared

**Mutation Testing:**

From `dateHelpers.test.js`:
```javascript
it('does not mutate the original array', () => {
  const items = [{ date: '2026-04-10' }, { date: '2026-04-09' }];
  const sorted = sortByDateTime(items);
  expect(sorted).not.toBe(items);
  expect(items[0].date).toBe('2026-04-10');
});
```

Pattern: Verify that returned values are new objects, not mutated originals

**Caching Verification:**

From `dateHelpers.test.js`:
```javascript
it('caches results', () => {
  const a = getTimeSlots(30);
  const b = getTimeSlots(30);
  expect(a).toBe(b);  // Exact same reference
});
```

Pattern: Use `toBe()` for reference equality to verify caching

## Test Coverage Summary

**Well-tested areas:**
- Date/time formatting and calculations (`dateHelpers.test.js`: 11 tests)
- Data validation functions (`dataValidation.test.js`: exists, presumed tested)
- API authentication and authorization (server tests: 8 tests)
- CRUD operations for all data models (30+ tests in server)
- Token encryption with tampering detection (8 tests)
- Rate limiting (1 test)
- CORS headers (2 tests)

**Untested areas:**
- React components (no component tests)
- Custom hooks (no hook tests)
- Client-side API wrapper logic (untested beyond server)
- UI interactions, event handling, form validation
- Error state rendering in components

## Vitest Configuration

**Server config** (`server/vitest.config.js`):
```javascript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,  // Enable describe, it, expect without imports
  },
});
```

**Key setting:** `globals: true` makes Vitest functions available globally in all test files (no import required in server tests, but frontend tests still import)

---

*Testing analysis: 2026-04-09*
