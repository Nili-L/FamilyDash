# Technology Stack

**Analysis Date:** 2026-04-09

## Languages

**Primary:**
- JavaScript (ES2021+) - Frontend (JSX) and backend (CommonJS)

**Secondary:**
- CSS (Tailwind utility classes + `@layer` directives) - Styling via `src/index.css`

## Runtime

**Environment:**
- Node.js 20 (pinned in `.nvmrc`, CI, and `Dockerfile`)

**Package Manager:**
- npm (workspaces NOT used; frontend and server have independent `package.json` files)
- Lockfiles: `package-lock.json` (root) and `server/package-lock.json` (server)

## Frameworks

**Core:**
- React 18.2 - Single-page frontend (`src/main.jsx` entry)
- Express 5.1 - REST API server (`server/index.js`, single-file monolith)

**Testing:**
- Vitest 4.1 - Test runner for both frontend and server
- Supertest 7.2 - HTTP-level server integration tests (`server/index.test.js`)

**Build/Dev:**
- Vite 7.0 - Dev server, HMR, production bundler (`vite.config.js`)
- PostCSS 8.4 + Autoprefixer 10.4 - CSS processing (`postcss.config.js`)
- Tailwind CSS 3.3 - Utility-first CSS framework (`tailwind.config.js`)
- ESLint 8.45 - Linting with React/Hooks plugins (`.eslintrc.json`)

## Key Dependencies

**Critical (Frontend):**
- `react` ^18.2.0 / `react-dom` ^18.2.0 - UI framework
- `date-fns` ^2.30.0 - Date formatting, comparison, parsing (`src/utils/dateHelpers.js`)
- `lucide-react` ^0.263.1 - Icon library (used in every component)
- `clsx` ^2.0.0 - Conditional className composition (imported but lightly used)

**Critical (Server):**
- `express` ^5.1.0 - HTTP framework (note: Express 5, not 4)
- `googleapis` ^154.0.0 - Google Calendar API + OAuth2 client
- `dotenv` ^17.2.1 - Environment variable loading

**Infrastructure (Node built-ins used by server):**
- `crypto` - AES-256-GCM encryption, session tokens, CSRF tokens, UUIDs
- `fs/promises` + `fs` (sync) - JSON file persistence
- `path` - Data file resolution

## Configuration

**Environment:**
- Server configured via `server/.env` (see `server/.env.example` for template)
- Required vars: `APP_PASSWORD`, `TOKEN_ENCRYPTION_KEY`
- Optional vars: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, `CORS_ORIGINS`, `NODE_ENV`, `PORT`
- Frontend has no env vars; it uses Vite's dev proxy to reach the server

**Build:**
- `vite.config.js` - Vite + React plugin, base path `/FamilyDash/`, dev proxy for `/api` and `/auth` to `localhost:3001`
- `tailwind.config.js` - Custom color scales (primary, success, warning, danger), custom animations (fadeIn, slideIn)
- `postcss.config.js` - Tailwind + Autoprefixer
- `.eslintrc.json` - ESLint with react, react-hooks, react-refresh plugins

**Module Systems:**
- Frontend: ES Modules (`"type": "module"` in root `package.json`)
- Server: CommonJS (`"type": "commonjs"` in `server/package.json`) with `require()` syntax

## Platform Requirements

**Development:**
- Node.js >= 18 (engine constraint in root `package.json`), Node 20 recommended (`.nvmrc`)
- Two processes required: `npm run dev` (Vite on :5173) + `node server/index.js` (Express on :3001)
- Vite proxies `/api/*` and `/auth/*` to the server in dev mode

**Production:**
- Docker multi-stage build (`Dockerfile`): builds frontend with Vite, serves static files + API from single Express process on port 3001
- Frontend static assets served from `server/public/` (copied from `dist/` in Docker build)
- GitHub Pages deployment for frontend-only (via `.github/workflows/deploy.yml`) with base path `/FamilyDash/`

**CI:**
- GitHub Actions (`.github/workflows/ci.yml`): lint, build, frontend tests, server tests
- Runs on push/PR to `main`, Node 20, npm ci for both root and server

---

*Stack analysis: 2026-04-09*
