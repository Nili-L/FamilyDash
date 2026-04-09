# Architecture

**Analysis Date:** 2026-04-09

## Pattern Overview

**Overall:** Client-server SPA with REST API

**Key Characteristics:**
- React SPA frontend communicates with Express REST API via JSON
- Server stores all data in a single JSON file (no database)
- Session-based authentication with HttpOnly cookies
- Code-split frontend using `React.lazy` for route-level components
- Single custom hook (`useFamilyData`) centralizes all data operations
- No router library; tab-based navigation managed via `useState` in `src/App.jsx`

## Layers

**Presentation Layer (Frontend):**
- Purpose: UI rendering, user interaction, form validation
- Location: `src/`
- Contains: React components (JSX), CSS, client-side utilities
- Depends on: API client (`src/api/client.js`), utility functions
- Used by: End users via browser

**API Client Layer:**
- Purpose: HTTP communication with server, auth-aware fetch wrapper
- Location: `src/api/client.js`
- Contains: `api()` wrapper function, resource-specific API objects (`authApi`, `familyMembersApi`, `medicationsApi`, `appointmentsApi`, `tasksApi`, `dataApi`)
- Depends on: Browser `fetch` API
- Used by: `src/hooks/useFamilyData.js`, `src/App.jsx` (auth calls)

**Data Hook Layer:**
- Purpose: State management, data fetching, CRUD orchestration
- Location: `src/hooks/useFamilyData.js`
- Contains: Single hook that manages all entity state (familyMembers, medications, appointments, tasks, settings)
- Depends on: API client layer
- Used by: `src/App.jsx` (single consumer, props drilled to children)

**Server Layer (single file):**
- Purpose: REST API, authentication, data persistence, Google OAuth
- Location: `server/index.js`
- Contains: Express routes, middleware (CORS, rate limiting, auth), encryption utilities, file I/O
- Depends on: `express`, `googleapis`, `crypto`, `fs`, `dotenv`
- Used by: Frontend via HTTP

**Data Layer:**
- Purpose: Persistent storage
- Location: `server/data.json`
- Contains: JSON object with `familyMembers`, `medications`, `appointments`, `tasks` arrays
- Depends on: Filesystem
- Used by: Server layer (read on startup, async writes on mutation)

## Data Flow

**Read Flow (e.g., load medications):**

1. `useFamilyData` hook calls `medicationsApi.getAll()` on mount
2. `api()` wrapper sends `GET /api/medications` with credentials (cookies)
3. Express `requireAuth` middleware validates session cookie
4. Route handler returns `data.medications` from in-memory state
5. Hook updates React state, components re-render

**Write Flow (e.g., add medication):**

1. Component calls `addMedication(data)` (passed as prop from `App.jsx`)
2. `useFamilyData` hook calls `medicationsApi.create(data)` via `withErrorHandling` wrapper
3. `api()` sends `POST /api/medications` with JSON body
4. Server validates required fields, sanitizes strings, generates UUID + timestamp
5. Server pushes to in-memory array, queues async write to `server/data.json`
6. Server returns created entity (201)
7. Hook appends to local React state via `setMedications(prev => [...prev, created])`

**Auth Flow:**

1. User submits password on login form (`App.jsx`)
2. `authApi.login(password)` sends `POST /auth/login`
3. Server rate-limits by IP, timing-safe compares password
4. Server generates 32-byte random session token, stores in `activeSessions` Map
5. Server sets `Set-Cookie: session=<token>; HttpOnly; SameSite=Strict`
6. All subsequent `/api/*` requests include cookie automatically
7. On 401, `api()` wrapper dispatches `auth:required` CustomEvent, App shows login

**Google OAuth Flow:**

1. Frontend calls `GET /auth/google?memberId=X` (requires auth)
2. Server generates CSRF token, stores in `pendingOAuthFlows` Map
3. Server returns Google authorization URL with state parameter
4. User authorizes in Google, redirected to `/auth/google/callback`
5. Server validates CSRF, exchanges code for tokens
6. Tokens encrypted with AES-256-GCM and stored in member's record
7. User redirected to frontend with `?status=success`

**State Management:**
- All entity state lives in `useFamilyData` hook (single source of truth in React)
- State is initialized via parallel `Promise.all` fetch of all 4 entity types
- Optimistic-ish updates: hook updates local state after successful server response (not before)
- Settings stored in `localStorage` (client-only, not synced to server)
- Server holds authoritative data in memory, persisted to JSON file

## Key Abstractions

**API Client (`src/api/client.js`):**
- Purpose: Auth-aware fetch wrapper with automatic 401 handling
- Pattern: Each resource exports an object with `getAll`, `create`, `update`, `remove` methods
- Error handling: Dispatches `auth:required` CustomEvent on 401, throws Error with server message

**AddItemForm (`src/components/AddItemForm.jsx`):**
- Purpose: Reusable modal form component driven by field configuration
- Pattern: Declarative field definitions (type, name, label, options, validation errors)
- Used by: `MedicationTracker`, `TaskManager`

**useFamilyData (`src/hooks/useFamilyData.js`):**
- Purpose: Centralized data management hook
- Pattern: Each CRUD operation wrapped in `withErrorHandling` for consistent error state
- Uses refs for current state to avoid stale closures in toggle callbacks

**useFocusTrap (`src/hooks/useFocusTrap.js`):**
- Purpose: Accessibility - trap Tab focus within modal dialogs
- Pattern: Returns a ref to attach to dialog container, auto-focuses first element, restores focus on close

## Entry Points

**Frontend:**
- Location: `src/main.jsx`
- Triggers: Browser loads `index.html`, which loads `/src/main.jsx`
- Responsibilities: Renders `<App />` into `#root` with `React.StrictMode`

**Server:**
- Location: `server/index.js`
- Triggers: `node server/index.js` (or Docker CMD)
- Responsibilities: Loads env, validates required config, reads data file, starts Express on PORT
- Conditional start: Only calls `app.listen()` when `require.main === module` (enables test imports)

**Docker:**
- Location: `Dockerfile`
- Multi-stage: Stage 1 builds frontend with Vite, Stage 2 runs server with static files
- Result: Single container serving both API and frontend on port 3001

## Error Handling

**Strategy:** Errors bubble up, caught at hook level, displayed in UI

**Frontend Patterns:**
- `withErrorHandling` wrapper in `useFamilyData` catches async errors and sets `error` state
- `api()` wrapper throws `Error` with server error message or status code
- `App.jsx` renders error banner when `error` state is truthy
- 401 errors trigger `auth:required` event to show login screen

**Server Patterns:**
- Input validation returns 400 with `{ error: "message" }` JSON
- Not-found returns 404 with `{ error: "Not found" }`
- Global error handler (`app.use((err, _req, res, _next) => ...)`) catches unhandled errors, logs them, returns generic 500
- Google OAuth errors: expired tokens auto-cleared from member record, 401 returned to frontend

## Cross-Cutting Concerns

**Logging:**
- `console.error` on server for critical failures (no structured logging)
- `console.error` in `useFamilyData` for fetch failures

**Validation:**
- Frontend: `src/utils/dataValidation.js` provides validators per entity type (returns `{ isValid, errors }`)
- Server: Basic required-field checks per route (name, title, task description)
- Input sanitization: Both client (`sanitizeInput`) and server (`sanitize`) strip `<>` and truncate to 500 chars

**Authentication:**
- `requireAuth` middleware on all `/api/*` routes
- Session cookie with HttpOnly, SameSite=Strict, optional Secure
- Rate limiting on `/auth/login` only

**CORS:**
- Custom middleware (not `cors` package) checking `Origin` header against `CORS_ORIGINS` allowlist
- Credentials allowed (`Access-Control-Allow-Credentials: true`)

---

*Architecture analysis: 2026-04-09*
