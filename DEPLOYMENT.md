# Deployment Guide

FamilyDash is a full-stack application (React frontend + Express API server). Both must be running for the app to work.

## Prerequisites

- Node.js 18+
- npm
- The server environment variables configured (see `server/.env.example`)

## Development

```bash
# Install dependencies
npm install
cd server && npm install && cd ..

# Configure server
cp server/.env.example server/.env
# Edit server/.env — set APP_PASSWORD and TOKEN_ENCRYPTION_KEY at minimum

# Start both servers
cd server && node index.js &   # API on port 3001
npm run dev                     # Frontend on port 5173 (proxies /api to 3001)
```

## Production Deployment

### Option 1: Single Server (Recommended for Home Use)

Run Express to serve both the API and the built frontend.

1. Build the frontend:
```bash
npm run build
```

2. Add static file serving to the Express server (or use a reverse proxy):
```bash
# Start the server
cd server
NODE_ENV=production node index.js
```

3. Use a reverse proxy (nginx, Caddy) to:
   - Serve `dist/` for static files
   - Proxy `/api/*` and `/auth/*` to `http://localhost:3001`

**Example nginx config:**
```nginx
server {
    listen 443 ssl;
    server_name familydash.example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    root /path/to/FamilyDash/dist;
    index index.html;

    # SPA routing — serve index.html for all frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Proxy API and auth to Express
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /auth/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### Option 2: Docker

1. Create `Dockerfile`:
```dockerfile
FROM node:18-alpine AS frontend
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY server/package*.json ./
RUN npm ci --omit=dev
COPY server/ .
COPY --from=frontend /app/dist ./public

EXPOSE 3001
CMD ["node", "index.js"]
```

2. Create `docker-compose.yml`:
```yaml
version: '3.8'
services:
  familydash:
    build: .
    ports:
      - "3001:3001"
    env_file:
      - server/.env
    volumes:
      - data:/app/data
    restart: unless-stopped

volumes:
  data:
```

3. Build and run:
```bash
docker compose up -d
```

**Note:** For the Docker setup, you would need to add static file serving to `server/index.js`:
```javascript
// Add before the error handler, after all API routes
const serveStatic = require('path');
app.use(express.static(path.join(__dirname, 'public')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
```

### Option 3: Separate Hosting

Host the frontend on a static host (Vercel, Netlify, GitHub Pages) and the API server separately.

1. Set `CORS_ORIGINS` in `server/.env` to the frontend's origin
2. Update `FRONTEND_URL` to the frontend's production URL
3. Update the frontend's API base URL (or configure a proxy)

**Frontend (Vercel/Netlify):**
```bash
npm run build
# Deploy the dist/ directory
```

**API server (VPS, Railway, Render):**
```bash
cd server
NODE_ENV=production node index.js
```

## Environment Variables

All required for production. See `server/.env.example` for details.

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_PASSWORD` | Yes | Family login password |
| `TOKEN_ENCRYPTION_KEY` | Yes | 64-char hex AES key |
| `GOOGLE_CLIENT_ID` | For Calendar | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For Calendar | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | For Calendar | Must match Google Cloud Console exactly; use HTTPS in production |
| `FRONTEND_URL` | Recommended | Frontend origin for OAuth redirects |
| `CORS_ORIGINS` | Recommended | Comma-separated allowed origins |
| `NODE_ENV` | Recommended | Set to `production` for Secure cookies |
| `PORT` | No | Server port (default: 3001) |

## Production Checklist

- [ ] `NODE_ENV=production` is set (enables Secure cookie flag)
- [ ] `APP_PASSWORD` is strong (12+ chars, mixed case, numbers, symbols)
- [ ] `TOKEN_ENCRYPTION_KEY` is randomly generated and securely stored
- [ ] HTTPS is configured (required for Secure cookies and OAuth)
- [ ] `CORS_ORIGINS` is set to the frontend's production origin only
- [ ] `FRONTEND_URL` is set to the production URL
- [ ] `GOOGLE_REDIRECT_URI` uses HTTPS and matches Google Cloud Console
- [ ] `server/data.json` is backed up regularly
- [ ] `server/.env` is not committed to version control
- [ ] Server is managed by a process manager (PM2, systemd, Docker)
- [ ] Tests pass: `npx vitest run`

## Data Backup

All data is stored in `server/data.json`. Back it up regularly:

```bash
# Manual backup
cp server/data.json server/data.json.backup-$(date +%Y%m%d)

# Or use the in-app export (Settings > Export Data)
```

## Troubleshooting

### "Authentication required" on every request
- Check that the server is running and reachable
- If behind a proxy, ensure cookies are forwarded (no cookie stripping)
- If using HTTPS, make sure `NODE_ENV=production` so the Secure flag is set

### Google Calendar not connecting
- Verify all 4 Google OAuth env vars are set
- `GOOGLE_REDIRECT_URI` must exactly match the authorized redirect URI in Google Cloud Console
- In production, the redirect URI must use HTTPS

### Data not persisting
- Check file permissions on `server/data.json` and its directory
- Check disk space
- Server logs will show `ENOSPC` or `EACCES` errors

### Build failures
- Requires Node.js 18+
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
