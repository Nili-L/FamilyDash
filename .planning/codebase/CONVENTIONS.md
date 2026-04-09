# Coding Conventions

**Analysis Date:** 2026-04-09

## Naming Patterns

**Files:**
- React components: PascalCase with `.jsx` extension (e.g., `MedicationTracker.jsx`, `AddItemForm.jsx`)
- JavaScript utilities: camelCase with `.js` extension (e.g., `dateHelpers.js`, `dataValidation.js`)
- Test files: Same as source with `.test.js` suffix (e.g., `dateHelpers.test.js`)
- Hook files: camelCase with `use` prefix (e.g., `useFamilyData.js`, `useFocusTrap.js`)

**Functions:**
- React components: PascalCase (e.g., `MedicationTracker`, `AddItemForm`)
- Exported utilities: camelCase (e.g., `formatDate`, `validateMedication`, `getMemberById`)
- Callbacks/handlers: camelCase with `handle` prefix (e.g., `handleSubmit`, `handleLogin`, `handleEdit`)
- Internal/private functions: camelCase, no prefix (e.g., `freshData`, `login` in test helpers)

**Variables:**
- State variables: camelCase (e.g., `isFormOpen`, `editingMedication`, `activeTab`)
- Constants: PascalCase for React components/imports, UPPER_SNAKE_CASE for config values
  - Example: `const Icon = tab.icon;` vs `const RATE_LIMIT_MAX = 30;`
  - Exception: `const NOW = new Date('2026-04-09T12:00:00Z');` (test constants)

**Types/Objects:**
- No TypeScript in frontend, but JSDoc used sparingly
- API objects use camelCase (e.g., `authApi`, `familyMembersApi`)
- Data field names: camelCase (e.g., `familyMembers`, `takenAt`, `completedAt`)

## Code Style

**Formatting:**
- No Prettier config detected; manual formatting follows:
  - 2-space indentation (observed in code)
  - Semicolons used consistently
  - Single quotes in JSX attributes, double quotes avoided in strings
  - Template literals for interpolation (e.g., `` formatDate(`2026-04-09`) ``)

**Linting:**
- ESLint enabled with React plugins: `eslint:recommended`, `plugin:react/recommended`, `plugin:react-hooks/recommended`
- Config file: `.eslintrc.json`
- Key rules enforced:
  - `react/react-in-jsx-scope`: off (React 17+ auto JSX)
  - `react/prop-types`: off (no propTypes validation)
  - `react-hooks/rules-of-hooks`: error (strict hook rules)
  - `react-hooks/exhaustive-deps`: warn (dependency arrays)
  - `no-unused-vars`: warn with `argsIgnorePattern: "^_"` (allow underscore-prefixed unused args)
  - `react-refresh/only-export-components`: warn (dev mode only)

**Linting commands:**
```bash
npm run lint              # Run ESLint with strict max-warnings 0
```

## Import Organization

**Order:**
1. React and core libraries: `import React, { useState, useEffect } from 'react';`
2. Third-party packages: `import { Pill, Plus } from 'lucide-react';`
3. Local components: `import AddItemForm from './AddItemForm';`
4. Local utilities: `import { formatTime } from '../utils/dateHelpers';`
5. Local hooks: `import { useFamilyData } from './hooks/useFamilyData';`

**Path Aliases:**
- Not used; relative paths (`./`, `../`) throughout
- Imports in server use `require()` for CJS modules
- Imports in frontend use ES6 `import/export`

**Barrel Files:**
- Not used; components and utilities exported directly
- API client exports multiple endpoint objects: `authApi`, `familyMembersApi`, `medicationsApi`, etc.

## Error Handling

**Patterns:**
- Try-catch for async operations with fallback returns
  - Example: `try { ... } catch { return { authenticated: false }; }`
- Error state managed in React via `useState`, typically `error` or specific error objects
- Validation returns `{ isValid: boolean, errors: {} }` object (see `dataValidation.js`)
- API client wraps fetch and throws Error for non-ok responses, catches 401 and fires custom event `auth:required`
- Server uses HTTP status codes (400 for validation, 401 for auth, 404 for not found, 429 for rate limit)

**Example from `api/client.js`:**
```javascript
async function api(url, options = {}) {
  const res = await fetch(url, { ...options });
  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:required'));
    throw new Error('Authentication required');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}
```

## Logging

**Framework:** `console` (no logging library)

**Patterns:**
- `console.error()` for significant errors (e.g., failed data fetch in `useFamilyData.js`)
- Minimal logging in production — errors logged only for debugging
- No structured logging, no log levels

## Comments

**When to Comment:**
- Inline comments used for non-obvious logic sections
- Block comments with section dividers: `// ── Section Name ──────────────────────────`
- Comments explain "why", not "what" (e.g., explaining ref usage in `useFamilyData.js`)

**JSDoc/TSDoc:**
- Not used; no TypeScript and minimal JSDoc
- Function signatures are self-documenting via parameter names

**Example from `useFamilyData.js`:**
```javascript
// Refs for current state — avoids stale closures in toggle callbacks
const medicationsRef = useRef(medications);
medicationsRef.current = medications;
```

## Function Design

**Size:**
- Most functions are small (10-30 lines)
- Larger components (App, MedicationTracker, TaskManager) are 300-400 lines but organized with clear sections
- Section dividers mark logical groupings

**Parameters:**
- Single object destructuring for multiple related params (e.g., `{ medications, familyMembers, onAdd, onUpdate }`)
- Keep param count ≤ 5; use object for more

**Return Values:**
- Functions return data directly or promise-wrapped results
- Callbacks return promises for async operations
- Validation functions return `{ isValid, errors }` objects
- Helpers return primitives or objects (no null-coalescing overuse)

## Module Design

**Exports:**
- Named exports for utilities and helpers (e.g., `export const formatDate = ...`)
- Default exports for React components (e.g., `export default App;`)
- API client exports named object APIs: `export const authApi = { ... }`
- Server uses dynamic import with destructuring: `const { app, _setData, _test } = await import('./index.js');`

**Barrel Files:**
- Not used in frontend
- Server test imports test utilities via `_test` namespace object

## Custom Hooks

**Pattern:**
- Custom hooks use `use` prefix: `useFamilyData`, `useFocusTrap`
- Return destructured object of state + callbacks
- Use `useCallback` to stabilize callback identity
- Use `useRef` to capture current state for callbacks avoiding stale closures

**Example from `useFamilyData.js`:**
```javascript
const medicationsRef = useRef(medications);
medicationsRef.current = medications;

const toggleMedicationTaken = useCallback((id) => withErrorHandling(async () => {
  const med = medicationsRef.current.find((m) => m.id === id);
  // ...
})(), [withErrorHandling]);
```

## React Patterns

**Props:**
- Props passed as inline object in parameter list
- Destructuring used at function top
- No prop validation (react/prop-types disabled)

**State Management:**
- Multiple `useState` calls per component for fine-grained state
- Refs used for non-rendering state (current medications for toggle callbacks)
- `useMemo` for expensive computations (filtered/sorted medication lists)
- No global state management library

**Lazy Loading:**
- Dynamic imports with `React.lazy()` for route components
  - Example: `const DashboardOverview = lazy(() => import('./components/DashboardOverview'));`
- Suspense boundary with loading fallback in `App.jsx`

**Event Handling:**
- Inline arrow functions or named handlers
- Event bubbling controlled with `preventDefault()` where needed (keyboard shortcuts in `App.jsx`)
- Custom events: `window.dispatchEvent(new CustomEvent('auth:required'))` for auth state sync

---

*Convention analysis: 2026-04-09*
