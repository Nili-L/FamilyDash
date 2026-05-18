# External Integrations

**Analysis Date:** 2026-04-09

## APIs & External Services

**Google Calendar:**
- Purpose: Read-only calendar event sync for family members
- SDK: `googleapis` ^154.0.0 (Google APIs Node.js client)
- Scope: `https://www.googleapis.com/auth/calendar.readonly`
- Auth: OAuth2 with offline access + refresh tokens
- Env vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
- Implementation: `server/index.js` lines 267-616
- OAuth flow: `/auth/google` initiates, `/auth/google/callback` completes
- Calendar endpoint: `GET /api/family-members/:memberId/calendar-events` (returns next 30 days)
- Token storage: AES-256-GCM encrypted in `server/data.json` per family member
- Token refresh: handled by googleapis client library; expired tokens are cleared on 401/403

## Data Storage

**Primary Database:**
- JSON file: `server/data.json`
- Schema: `{ familyMembers[], medications[], appointments[], tasks[] }`
- Read: synchronous on startup (`fs.readFileSync`), then in-memory
- Write: async with serialized queue (`saveQueue` promise chain) via `fs.writeFile`
- Location: `server/data.json` (relative to server directory)
- Legacy migration: auto-migrates from `server/familyMembers.json` if found

**Client-side Storage:**
- `localStorage` key `familyDashboard_settings` - UI preferences only (theme, notifications, language)
- Used in `src/hooks/useFamilyData.js`

**File Storage:**
- Local filesystem only (JSON file)

**Caching:**
- None (all data served from in-memory JavaScript objects)

## Authentication & Identity

**App Authentication:**
- Custom session-based auth with shared family password
- Password comparison: timing-safe (`crypto.timingSafeEqual`)
- Session tokens: `crypto.randomBytes(32)` stored in `activeSessions` Map
- Cookie: `session=<token>; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400`
- Secure flag added when `NODE_ENV=production`
- Session TTL: 24 hours with periodic cleanup every 30 minutes
- Rate limiting: 30 attempts per 15-minute window per IP (sliding window)

**Google OAuth2:**
- Per-request OAuth2 client (no shared credential state)
- CSRF protection via random state parameter stored in `pendingOAuthFlows` Map
- Pending flows expire after 10 minutes
- Tokens encrypted at rest with AES-256-GCM before storage

## Monitoring & Observability

**Error Tracking:**
- None (no Sentry, Datadog, etc.)
- Global Express error handler prevents stack trace leaks (`server/index.js` line 621)

**Logs:**
- `console.error` for server-side errors (token decryption failures, calendar API errors, unhandled errors)
- `console.log` for startup message only
- No structured logging framework

## CI/CD & Deployment

**Hosting Options:**
- Docker container (multi-stage `Dockerfile`): single process serves both API and static frontend
- GitHub Pages (frontend-only): `.github/workflows/deploy.yml` deploys `dist/` on push to `main`

**CI Pipeline:**
- GitHub Actions: `.github/workflows/ci.yml`
- Steps: checkout, setup Node 20, npm ci, lint, build, frontend Vitest, server npm ci, server Vitest
- Triggers: push to `main`, PRs targeting `main`

## Environment Configuration

**Required env vars (server):**
- `APP_PASSWORD` - Shared family login password
- `TOKEN_ENCRYPTION_KEY` - 64-char hex string (32 bytes) for AES-256-GCM

**Optional env vars (server):**
- `GOOGLE_CLIENT_ID` - Google OAuth client ID (required for calendar features)
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - OAuth callback URL (default: `http://localhost:3001/auth/google/callback`)
- `FRONTEND_URL` - URL to redirect after OAuth (default: `http://localhost:5173`)
- `CORS_ORIGINS` - Comma-separated allowed origins (default: `http://localhost:5173`)
- `NODE_ENV` - Set to `production` for Secure cookie flag
- `PORT` - Server port (default: `3001`)

**Secrets location:**
- `server/.env` file (gitignored)
- Template: `server/.env.example`

## Webhooks & Callbacks

**Incoming:**
- `GET /auth/google/callback` - Google OAuth2 redirect callback with authorization code

**Outgoing:**
- None

---

*Integration audit: 2026-04-09*
