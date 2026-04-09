# Contributing to Family Dashboard

Thank you for considering contributing to Family Dashboard! This tool helps families with special needs children manage medications, appointments, and daily routines.

## Getting Started

1. Fork and clone the repository
2. Install dependencies for both frontend and server:
```bash
npm install
cd server && npm install && cd ..
```
3. Configure the server:
```bash
cp server/.env.example server/.env
# Set APP_PASSWORD and TOKEN_ENCRYPTION_KEY
```
4. Start development:
```bash
cd server && node index.js &   # API server on port 3001
npm run dev                     # Frontend on port 5173
```

## Project Structure

This is a full-stack app:

- `src/` — React frontend (Vite + Tailwind)
- `server/` — Express API server (JSON file storage, Google OAuth, encryption)
- `src/hooks/useFamilyData.js` — Central data hook that calls the server API
- `src/api/client.js` — Fetch wrapper with auth handling

See the README for the full project structure.

## Before Submitting a Pull Request

### 1. Run tests

```bash
# All tests (98 total)
npx vitest run

# Or run frontend and server separately
npx vitest run --dir src     # 53 frontend tests
cd server && npx vitest run  # 45 server tests
```

### 2. Run the linter

```bash
npm run lint
```

### 3. Verify the build

```bash
npm run build
```

### 4. Test manually

- Test on mobile viewports
- Test keyboard navigation (Tab, Shift+Tab, Escape, Alt+key shortcuts)
- Test the login flow (correct and incorrect password)

## Writing Code

### React Components

- Use functional components with hooks
- Keep components focused on a single responsibility
- Use `useFamilyData()` for all data access — don't call the API directly from components
- Modal dialogs must use `useFocusTrap` and include `role="dialog"`, `aria-modal`, `aria-labelledby`

### Server Endpoints

- All `/api/*` routes are behind `requireAuth` middleware
- Use field whitelisting on POST/PUT (never spread `req.body` directly)
- Validate required fields and return 400 for missing/empty values
- All mutations must call `await saveData(data)` (async)
- Never expose OAuth tokens in API responses

### Writing Tests

- **Frontend tests** go in `src/utils/*.test.js` (colocated with source)
- **Server tests** go in `server/index.test.js`
- Server tests use `supertest` to drive the Express app
- Clear state in `beforeEach` — call `_setData(freshData())`, `rateLimitStore.clear()`, `activeSessions.clear()`
- Use `vi.useFakeTimers()` for date-dependent tests

### Accessibility

This app is designed for families with special needs children — accessibility matters:

- All interactive elements must be keyboard accessible
- Use semantic HTML
- Provide ARIA labels for icon-only buttons
- Ensure color is not the only indicator of state
- Test with a screen reader if possible

## Reporting Bugs

Include:
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS
- Console errors (if any)
- Whether the issue is in the frontend, server, or both

## Suggesting Features

Open an issue describing:
- What the feature does
- Why it helps families using the dashboard
- Any alternative approaches you considered
