# Codebase Structure

**Analysis Date:** 2026-04-09

## Directory Layout

```
FamilyDash/
├── .github/
│   └── workflows/
│       ├── ci.yml              # Lint + build + test pipeline
│       └── deploy.yml          # GitHub Pages deployment
├── public/
│   └── example-data.json       # Sample data for demo/testing
├── server/
│   ├── .env.example            # Environment variable template
│   ├── data.json               # Persistent data store (gitignored in prod)
│   ├── index.js                # Entire server: routes, auth, middleware, persistence
│   ├── index.test.js           # Server integration tests (Vitest + Supertest)
│   ├── package.json            # Server dependencies (express, googleapis, dotenv)
│   ├── package-lock.json       # Server lockfile
│   └── vitest.config.js        # Server test config
├── src/
│   ├── api/
│   │   └── client.js           # Auth-aware fetch wrapper + resource API objects
│   ├── components/
│   │   ├── AddItemForm.jsx     # Reusable modal form (field-config driven)
│   │   ├── ConfirmDialog.jsx   # Confirmation modal with focus trap
│   │   ├── DashboardOverview.jsx # Main dashboard with summary cards
│   │   ├── MedicationTracker.jsx # Medication CRUD + filtering
│   │   ├── TaskManager.jsx     # Task CRUD + priority/status filtering
│   │   └── Toast.jsx           # Timed notification toast
│   ├── hooks/
│   │   ├── useFamilyData.js    # Central data hook (all CRUD + bulk ops)
│   │   └── useFocusTrap.js     # Accessibility: modal focus trapping
│   ├── pages/
│   │   ├── AppointmentsPage.jsx # Appointment list + inline form
│   │   └── FamilyPage.jsx      # Family member list + add form
│   ├── utils/
│   │   ├── dataValidation.js   # Entity validators + sanitizer
│   │   ├── dataValidation.test.js
│   │   ├── dateHelpers.js      # Date formatting, overdue checks, time slots
│   │   ├── dateHelpers.test.js
│   │   ├── memberHelpers.js    # Member lookup by ID, color, name
│   │   └── priorityHelpers.js  # Priority ordering + CSS class mapping
│   ├── App.jsx                 # Root component: auth, navigation, settings
│   ├── index.css               # Tailwind directives + custom component classes
│   └── main.jsx                # React entry point (ReactDOM.createRoot)
├── .eslintrc.json              # ESLint config (React + Hooks plugins)
├── .nvmrc                      # Node version pin (20)
├── Dockerfile                  # Multi-stage production build
├── index.html                  # Vite HTML template
├── package.json                # Frontend dependencies + scripts
├── package-lock.json           # Frontend lockfile
├── postcss.config.js           # PostCSS: Tailwind + Autoprefixer
├── tailwind.config.js          # Tailwind theme customization
└── vite.config.js              # Vite: React plugin, dev proxy, base path
```

## Directory Purposes

**`src/api/`:**
- Purpose: HTTP communication layer between frontend and server
- Contains: Single file with fetch wrapper and per-resource API objects
- Key files: `client.js`

**`src/components/`:**
- Purpose: Reusable and feature-specific React components
- Contains: UI components that render data and handle user interaction
- Key files: `AddItemForm.jsx` (reusable), `DashboardOverview.jsx`, `MedicationTracker.jsx`, `TaskManager.jsx`

**`src/hooks/`:**
- Purpose: Custom React hooks for data management and accessibility
- Contains: `useFamilyData.js` (central data hook), `useFocusTrap.js` (a11y)
- Key files: `useFamilyData.js` is the most critical file in the frontend

**`src/pages/`:**
- Purpose: Top-level page components (tab content)
- Contains: Components that represent full "pages" in the tab navigation
- Key files: `AppointmentsPage.jsx`, `FamilyPage.jsx`
- Note: `DashboardOverview`, `MedicationTracker`, `TaskManager` live in `components/` despite being page-level

**`src/utils/`:**
- Purpose: Pure utility functions (no React dependencies except test files)
- Contains: Validators, date helpers, member lookup, priority helpers
- Key files: `dataValidation.js`, `dateHelpers.js`

**`server/`:**
- Purpose: Complete Express backend (single-file architecture)
- Contains: Server code, tests, data file, env template
- Key files: `index.js` (641 lines, entire server)

**`public/`:**
- Purpose: Static assets served as-is by Vite
- Contains: Example data JSON for demo purposes

## Key File Locations

**Entry Points:**
- `src/main.jsx`: React app bootstrap (renders `<App />` into `#root`)
- `server/index.js`: Express server (routes, auth, persistence, OAuth)
- `index.html`: Vite HTML template

**Configuration:**
- `vite.config.js`: Build config, dev proxy, base path
- `tailwind.config.js`: Custom colors (primary/success/warning/danger), animations
- `.eslintrc.json`: Linting rules
- `server/.env.example`: Required environment variables template
- `postcss.config.js`: CSS processing pipeline

**Core Logic:**
- `src/hooks/useFamilyData.js`: All frontend data operations (CRUD for 4 entity types + bulk ops)
- `src/api/client.js`: Auth-aware API communication
- `server/index.js`: All server logic (auth, CRUD routes, OAuth, encryption, persistence)

**Testing:**
- `server/index.test.js`: Server integration tests (~60 tests)
- `src/utils/dateHelpers.test.js`: Date utility unit tests (~20 tests)
- `src/utils/dataValidation.test.js`: Validation unit tests (~25 tests)

## Naming Conventions

**Files:**
- Components: PascalCase `.jsx` - `DashboardOverview.jsx`, `MedicationTracker.jsx`
- Hooks: camelCase with `use` prefix `.js` - `useFamilyData.js`, `useFocusTrap.js`
- Utilities: camelCase `.js` - `dateHelpers.js`, `dataValidation.js`
- Tests: co-located with `.test.js` suffix - `dateHelpers.test.js`
- Pages: PascalCase with `Page` suffix `.jsx` - `FamilyPage.jsx`, `AppointmentsPage.jsx`

**Directories:**
- Lowercase, plural: `components/`, `hooks/`, `pages/`, `utils/`
- Exception: `api/` (singular)

## Where to Add New Code

**New Tab/Page:**
- Create component in `src/pages/` with PascalCase `Page` suffix (e.g., `CalendarPage.jsx`)
- Add lazy import in `src/App.jsx`
- Add tab entry to `tabs` array in `App.jsx`
- Add case to `renderContent()` switch in `App.jsx`
- Add keyboard shortcut to `keyMap` in `App.jsx`

**New Feature Component:**
- Create in `src/components/` with PascalCase naming
- If it needs data, receive it as props from `App.jsx` (data flows through `useFamilyData`)

**New API Endpoint:**
- Add route in `server/index.js` (follow existing CRUD pattern with comment section dividers)
- Add corresponding API object/methods in `src/api/client.js`
- Add state + CRUD callbacks in `src/hooks/useFamilyData.js`
- Add tests in `server/index.test.js`

**New Utility Function:**
- Add to existing file in `src/utils/` if it fits (date, validation, member, priority)
- Create new `src/utils/<name>Helpers.js` file for new categories
- Co-locate tests as `src/utils/<name>Helpers.test.js`

**New Custom Hook:**
- Create in `src/hooks/` with `use` prefix
- Follow `useFocusTrap.js` pattern for simple hooks

**New Reusable UI Component:**
- Create in `src/components/`
- Follow `Toast.jsx` or `ConfirmDialog.jsx` patterns (small, focused)

## Special Directories

**`server/data.json`:**
- Purpose: Runtime data persistence (JSON file database)
- Generated: Yes (created by server on first write)
- Committed: Present in repo as seed/example data
- Warning: Will be overwritten at runtime

**`dist/`:**
- Purpose: Vite production build output
- Generated: Yes (`npm run build`)
- Committed: No (gitignored)

**`.planning/`:**
- Purpose: GSD planning and analysis documents
- Generated: By analysis tooling
- Committed: Project-specific decision

---

*Structure analysis: 2026-04-09*
