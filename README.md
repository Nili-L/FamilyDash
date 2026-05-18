# Family Dashboard

A family management dashboard designed for families with special needs children. Track medications, appointments, daily tasks, and family members — with Google Calendar integration, encrypted data storage, and session-based authentication.

![Family Dashboard](https://img.shields.io/badge/version-1.0.0-blue.svg)
![React](https://img.shields.io/badge/React-18.2.0-61dafb.svg)
![Express](https://img.shields.io/badge/Express-5.1.0-000.svg)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.3.3-38bdf8.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)

## Features

### Core Functionality

- **Family Member Management** — Add, edit, and remove family members with custom color themes
- **Medication Tracking** — Schedule medications, mark as taken, overdue alerts
- **Appointment Management** — Schedule and track appointments with dates, times, and locations
- **Daily Task Management** — Create and track tasks with priority levels (high/medium/low)
- **Dashboard Overview** — Today's medications, appointments, and priority tasks at a glance
- **Google Calendar Integration** — Connect family members' Google Calendars via OAuth
- **Data Export/Import** — Backup and restore all data as JSON

### Security

- Session-based authentication with a shared family password
- AES-256-GCM encryption for Google OAuth tokens at rest
- Per-request OAuth client instances (no credential leakage)
- CSRF protection on OAuth flows
- Timing-safe password comparison
- Rate limiting on login attempts
- CORS with configurable allowed origins
- Input validation and field whitelisting on all endpoints
- Global error handler (no stack trace leaks)

### Accessibility

- Focus trapping and ARIA attributes on modal dialogs (`role="dialog"`, `aria-modal`, `aria-labelledby`)
- Keyboard navigation (Alt+D/F/M/A/T for tab switching, Escape to close modals)
- Screen reader labels on all interactive elements

## Architecture

FamilyDash is a full-stack application:

- **Frontend** — React 18 + Vite + Tailwind CSS (SPA)
- **Backend** — Express 5 server with JSON file storage
- **Data flow** — Frontend `useFamilyData` hook calls server API; all data persisted in `server/data.json`

```
FamilyDash/
├── src/                        # React frontend
│   ├── api/
│   │   └── client.js           # Fetch wrapper with auth handling
│   ├── components/
│   │   ├── DashboardOverview.jsx
│   │   ├── MedicationTracker.jsx
│   │   ├── TaskManager.jsx
│   │   └── AddItemForm.jsx     # Reusable modal form
│   ├── hooks/
│   │   ├── useFamilyData.js    # Server-backed data hook
│   │   └── useFocusTrap.js     # Accessibility focus trap
│   ├── pages/
│   │   ├── FamilyPage.jsx
│   │   └── AppointmentsPage.jsx
│   ├── utils/
│   │   ├── dateHelpers.js
│   │   ├── dataValidation.js
│   │   ├── memberHelpers.js
│   │   └── priorityHelpers.js
│   ├── App.jsx                 # Main app with auth gate
│   └── main.jsx
├── server/
│   ├── index.js                # Express API server
│   ├── index.test.js           # Server tests (Vitest + Supertest)
│   ├── .env.example            # Required environment variables
│   └── package.json
├── package.json                # Frontend dependencies
├── vite.config.js              # Vite config with API proxy
└── tailwind.config.js
```

## Quick Start

### Prerequisites

- Node.js 18+
- npm

### 1. Install dependencies

```bash
# Frontend
npm install

# Server
cd server && npm install && cd ..
```

### 2. Configure the server

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and set:

- `APP_PASSWORD` — shared family login password
- `TOKEN_ENCRYPTION_KEY` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- Google OAuth credentials (optional, for Calendar integration)

### 3. Start both servers

```bash
# Terminal 1: Start the API server
cd server && node index.js

# Terminal 2: Start the frontend dev server
npm run dev
```

The frontend dev server proxies `/api` and `/auth` requests to the Express server (port 3001).

Open `http://localhost:5173` and log in with your `APP_PASSWORD`.

## API Endpoints

All `/api/*` routes require authentication (session cookie).

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Log in with family password |
| POST | `/auth/logout` | Log out |
| GET | `/auth/status` | Check auth state |
| GET/POST/PUT/DELETE | `/api/family-members` | Family member CRUD |
| GET/POST/PUT/DELETE | `/api/medications` | Medication CRUD |
| GET/POST/PUT/DELETE | `/api/appointments` | Appointment CRUD |
| GET/POST/PUT/DELETE | `/api/tasks` | Task CRUD |
| GET | `/api/data/export` | Export all data |
| POST | `/api/data/import` | Import data (validates and sanitizes) |
| DELETE | `/api/data` | Clear all data |
| GET | `/auth/google` | Start Google OAuth flow (requires auth) |
| GET | `/auth/google/callback` | OAuth callback from Google |
| GET | `/api/family-members/:id/calendar-events` | Fetch Google Calendar events |

## Testing

```bash
# Run all tests (frontend + server)
npx vitest run

# Frontend tests only
npx vitest run --dir src

# Server tests only
cd server && npx vitest run

# Watch mode
npm run test:watch
```

98 tests covering: data validation, date helpers, encryption round-trip and tamper detection, authentication, rate limiting, CORS, all CRUD endpoints, cascade deletes, bulk import/export, and field whitelisting.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Alt + D` | Dashboard |
| `Alt + F` | Family |
| `Alt + M` | Medications |
| `Alt + A` | Appointments |
| `Alt + T` | Tasks |
| `Escape` | Close modal |

## Environment Variables

See `server/.env.example` for all configuration options:

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_PASSWORD` | Yes | Family login password |
| `TOKEN_ENCRYPTION_KEY` | Yes | 64-char hex key for token encryption |
| `GOOGLE_CLIENT_ID` | For Calendar | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Calendar | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | For Calendar | OAuth callback URL |
| `FRONTEND_URL` | No | Frontend origin (default: `http://localhost:5173`) |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `NODE_ENV` | No | Set to `production` for Secure cookies |

## Technology Stack

- **React 18** — UI with hooks
- **Vite** — Build tool and dev server
- **Tailwind CSS** — Utility-first styling
- **Express 5** — API server
- **Google APIs** — Calendar integration
- **Node.js crypto** — AES-256-GCM token encryption
- **Vitest** — Test framework
- **Supertest** — HTTP assertion library
- **Lucide React** — Icons
- **date-fns** — Date utilities

## License

MIT License. See the LICENSE section below.

```
MIT License

Copyright (c) 2024 Family Dashboard

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
