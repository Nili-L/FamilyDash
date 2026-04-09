const express = require('express');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const crypto = require('crypto');

dotenv.config();

// Fail fast on missing required configuration
const REQUIRED_ENV = ['APP_PASSWORD', 'TOKEN_ENCRYPTION_KEY'];
for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error(`FATAL: ${key} environment variable is required`);
    if (require.main === module) process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 3001;
const ALLOWED_ORIGINS = (process.env.CORS_ORIGINS || 'http://localhost:5173').split(',').map((o) => o.trim());

app.use(express.json({ limit: '1mb' }));

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.status(204).send();
  next();
});

// ---------------------------------------------------------------------------
// Rate limiting (sliding window per IP)
// ---------------------------------------------------------------------------
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX = 30; // max login attempts per window

// Periodic rate limit cleanup
const rateLimitCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(ip);
  }
}, RATE_LIMIT_WINDOW_MS);
rateLimitCleanupInterval.unref();

function rateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress;
  const now = Date.now();
  let entry = rateLimitStore.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    entry = { windowStart: now, count: 0 };
    rateLimitStore.set(ip, entry);
  }
  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }
  next();
}

// ---------------------------------------------------------------------------
// Session-based authentication (with TTL eviction)
// ---------------------------------------------------------------------------
const APP_PASSWORD = process.env.APP_PASSWORD;
const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — matches cookie Max-Age
const activeSessions = new Map(); // token → { createdAt }

function timingSafeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA); // constant-time even on length mismatch
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function sessionCookie(token, maxAge) {
  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  return `session=${token}; HttpOnly;${secure} SameSite=Strict; Path=/; Max-Age=${maxAge}`;
}

function getSessionToken(req) {
  const cookies = req.headers.cookie || '';
  const match = cookies.match(/session=([^;]+)/);
  return match ? match[1] : null;
}

function isSessionValid(token) {
  const session = activeSessions.get(token);
  if (!session) return false;
  if (Date.now() - session.createdAt > SESSION_TTL_MS) {
    activeSessions.delete(token);
    return false;
  }
  return true;
}

function requireAuth(req, res, next) {
  const token = getSessionToken(req);
  if (!token || !isSessionValid(token)) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

// Periodic session cleanup (every 30 minutes)
const sessionCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [token, session] of activeSessions) {
    if (now - session.createdAt > SESSION_TTL_MS) activeSessions.delete(token);
  }
}, 30 * 60 * 1000);
sessionCleanupInterval.unref(); // don't prevent process exit

app.post('/auth/login', rateLimit, (req, res) => {
  if (!APP_PASSWORD) {
    return res.status(500).json({ error: 'APP_PASSWORD not configured on server' });
  }
  const { password } = req.body;
  if (!password || !timingSafeCompare(password, APP_PASSWORD)) {
    return res.status(401).json({ error: 'Invalid password' });
  }
  const token = crypto.randomBytes(32).toString('hex');
  activeSessions.set(token, { createdAt: Date.now() });
  res.setHeader('Set-Cookie', sessionCookie(token, 86400));
  res.json({ success: true });
});

app.post('/auth/logout', (req, res) => {
  const token = getSessionToken(req);
  if (token) activeSessions.delete(token);
  res.setHeader('Set-Cookie', sessionCookie('', 0));
  res.json({ success: true });
});

app.get('/auth/status', (req, res) => {
  const token = getSessionToken(req);
  res.json({ authenticated: !!token && isSessionValid(token) });
});

// Protect all /api/* routes
app.use('/api', requireAuth);

// ---------------------------------------------------------------------------
// Token encryption (AES-256-GCM) — tokens are never stored in plaintext
// ---------------------------------------------------------------------------
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY; // 64-char hex string (32 bytes)

function getEncryptionKey() {
  if (!ENCRYPTION_KEY || Buffer.from(ENCRYPTION_KEY, 'hex').length !== 32) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }
  return Buffer.from(ENCRYPTION_KEY, 'hex');
}

function encryptTokens(tokens) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = JSON.stringify(tokens);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
    data: encrypted.toString('hex'),
  };
}

function decryptTokens(envelope) {
  if (!envelope || !envelope.iv || !envelope.tag || !envelope.data) return null;
  try {
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      Buffer.from(envelope.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(envelope.tag, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(envelope.data, 'hex')),
      decipher.final(),
    ]);
    return JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    console.error('Token decryption failed (key rotation or data corruption?):', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Data persistence — async JSON file for all entity types
// ---------------------------------------------------------------------------
const DATA_FILE = path.join(__dirname, 'data.json');

const DEFAULT_DATA = Object.freeze({
  familyMembers: Object.freeze([]),
  medications: Object.freeze([]),
  appointments: Object.freeze([]),
  tasks: Object.freeze([]),
});

function freshData() {
  return { familyMembers: [], medications: [], appointments: [], tasks: [] };
}

function loadData() {
  // Synchronous on startup only — before server is listening
  try {
    if (fsSync.existsSync(DATA_FILE)) {
      return JSON.parse(fsSync.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading data file:', err);
  }

  const legacyPath = path.join(__dirname, 'familyMembers.json');
  try {
    if (fsSync.existsSync(legacyPath)) {
      const members = JSON.parse(fsSync.readFileSync(legacyPath, 'utf8'));
      const migrated = { ...DEFAULT_DATA, familyMembers: members };
      fsSync.writeFileSync(DATA_FILE, JSON.stringify(migrated, null, 2), 'utf8');
      return migrated;
    }
  } catch (err) {
    console.error('Error migrating legacy data:', err);
  }

  return freshData();
}

let saveQueue = Promise.resolve();
async function saveData(d) {
  saveQueue = saveQueue.then(async () => {
    const tmp = DATA_FILE + '.tmp';
    await fs.writeFile(tmp, JSON.stringify(d, null, 2), 'utf8');
    await fs.rename(tmp, DATA_FILE);
  });
  return saveQueue;
}

let data = loadData();

// ---------------------------------------------------------------------------
// Input sanitization — strip angle brackets and trim
// ---------------------------------------------------------------------------
function sanitize(val) {
  if (typeof val !== 'string') return val;
  return val.trim().replace(/[<>]/g, '').slice(0, 500);
}

// ---------------------------------------------------------------------------
// Google OAuth2 — per-request client factory (no shared credential state)
// ---------------------------------------------------------------------------
function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

// ---------------------------------------------------------------------------
// Family Members
// ---------------------------------------------------------------------------
app.get('/api/family-members', (_req, res) => {
  res.json(
    data.familyMembers.map((m) => ({
      id: m.id,
      name: m.name,
      color: m.color,
      googleConnected: !!m.tokens,
    })),
  );
});

app.post('/api/family-members', async (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const newMember = { id: crypto.randomUUID(), name: sanitize(name), color: color || null, tokens: null };
  data.familyMembers.push(newMember);
  await saveData(data);
  res.status(201).json({ id: newMember.id, name: newMember.name, color: newMember.color, googleConnected: false });
});

app.put('/api/family-members/:id', async (req, res) => {
  const idx = data.familyMembers.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { name, color } = req.body;
  if (name !== undefined) {
    if (!name) return res.status(400).json({ error: 'Name cannot be empty' });
    data.familyMembers[idx].name = sanitize(name);
  }
  if (color !== undefined) data.familyMembers[idx].color = color;
  await saveData(data);

  const m = data.familyMembers[idx];
  res.json({ id: m.id, name: m.name, color: m.color, googleConnected: !!m.tokens });
});

app.delete('/api/family-members/:id', async (req, res) => {
  const { id } = req.params;
  const before = data.familyMembers.length;
  data.familyMembers = data.familyMembers.filter((m) => m.id !== id);
  if (data.familyMembers.length === before) return res.status(404).json({ error: 'Not found' });

  data.medications = data.medications.filter((m) => m.person !== id);
  data.appointments = data.appointments.filter((a) => a.person !== id);
  data.tasks = data.tasks.filter((t) => t.person !== id);
  await saveData(data);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------
app.get('/api/medications', (_req, res) => {
  res.json(data.medications);
});

app.post('/api/medications', async (req, res) => {
  const { name, person, time, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Medication name is required' });
  const med = {
    name: sanitize(name), person: person || null, time: time || null, notes: sanitize(notes) || null,
    id: crypto.randomUUID(),
    taken: false,
    createdAt: new Date().toISOString(),
  };
  data.medications.push(med);
  await saveData(data);
  res.status(201).json(med);
});

app.put('/api/medications/:id', async (req, res) => {
  const idx = data.medications.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { name, person, time, notes, taken, takenAt } = req.body;
  if (name !== undefined && !name) return res.status(400).json({ error: 'Medication name cannot be empty' });
  const allowed = { name: sanitize(name), person, time, notes: sanitize(notes), taken, takenAt };
  Object.keys(allowed).forEach((k) => { if (allowed[k] !== undefined) data.medications[idx][k] = allowed[k]; });
  await saveData(data);
  res.json(data.medications[idx]);
});

app.delete('/api/medications/:id', async (req, res) => {
  const before = data.medications.length;
  data.medications = data.medications.filter((m) => m.id !== req.params.id);
  if (data.medications.length === before) return res.status(404).json({ error: 'Not found' });
  await saveData(data);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
app.get('/api/appointments', (_req, res) => {
  res.json(data.appointments);
});

app.post('/api/appointments', async (req, res) => {
  const { title, person, date, time, location, notes } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });
  const apt = {
    title: sanitize(title), person: person || null, date: date || null, time: time || null,
    location: sanitize(location) || null, notes: sanitize(notes) || null,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  data.appointments.push(apt);
  await saveData(data);
  res.status(201).json(apt);
});

app.put('/api/appointments/:id', async (req, res) => {
  const idx = data.appointments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { title, person, date, time, location, notes } = req.body;
  if (title !== undefined && !title) return res.status(400).json({ error: 'Title cannot be empty' });
  const allowed = { title: sanitize(title), person, date, time, location: sanitize(location), notes: sanitize(notes) };
  Object.keys(allowed).forEach((k) => { if (allowed[k] !== undefined) data.appointments[idx][k] = allowed[k]; });
  await saveData(data);
  res.json(data.appointments[idx]);
});

app.delete('/api/appointments/:id', async (req, res) => {
  const before = data.appointments.length;
  data.appointments = data.appointments.filter((a) => a.id !== req.params.id);
  if (data.appointments.length === before) return res.status(404).json({ error: 'Not found' });
  await saveData(data);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
app.get('/api/tasks', (_req, res) => {
  res.json(data.tasks);
});

app.post('/api/tasks', async (req, res) => {
  const { task: taskText, person, priority, notes } = req.body;
  if (!taskText) return res.status(400).json({ error: 'Task description is required' });
  const task = {
    task: sanitize(taskText), person: person || null, priority: priority || null, notes: sanitize(notes) || null,
    id: crypto.randomUUID(),
    completed: false,
    createdAt: new Date().toISOString(),
  };
  data.tasks.push(task);
  await saveData(data);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', async (req, res) => {
  const idx = data.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { task: taskText, person, priority, notes, completed, completedAt } = req.body;
  if (taskText !== undefined && !taskText) return res.status(400).json({ error: 'Task description cannot be empty' });
  const allowed = { task: sanitize(taskText), person, priority, notes: sanitize(notes), completed, completedAt };
  Object.keys(allowed).forEach((k) => { if (allowed[k] !== undefined) data.tasks[idx][k] = allowed[k]; });
  await saveData(data);
  res.json(data.tasks[idx]);
});

app.delete('/api/tasks/:id', async (req, res) => {
  const before = data.tasks.length;
  data.tasks = data.tasks.filter((t) => t.id !== req.params.id);
  if (data.tasks.length === before) return res.status(404).json({ error: 'Not found' });
  await saveData(data);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Bulk data operations (export / import / clear)
// ---------------------------------------------------------------------------
app.get('/api/data/export', (_req, res) => {
  res.json({
    familyMembers: data.familyMembers.map((m) => ({ id: m.id, name: m.name, color: m.color })),
    medications: data.medications,
    appointments: data.appointments,
    tasks: data.tasks,
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  });
});

app.post('/api/data/import', async (req, res) => {
  const incoming = req.body;

  // Validate arrays
  for (const key of ['familyMembers', 'medications', 'appointments', 'tasks']) {
    if (incoming[key] !== undefined && !Array.isArray(incoming[key])) {
      return res.status(400).json({ error: `${key} must be an array` });
    }
  }

  if (incoming.familyMembers) {
    data.familyMembers = incoming.familyMembers.map((m) => ({
      id: m.id || crypto.randomUUID(),
      name: m.name || 'Unknown',
      color: m.color || null,
      tokens: null,
    }));
  }
  if (incoming.medications) {
    data.medications = incoming.medications
      .filter((m) => m && m.name)
      .map((m) => ({ id: m.id || crypto.randomUUID(), name: m.name, person: m.person || null, time: m.time || null, notes: m.notes || null, taken: !!m.taken, takenAt: m.takenAt || null, createdAt: m.createdAt || new Date().toISOString() }));
  }
  if (incoming.appointments) {
    data.appointments = incoming.appointments
      .filter((a) => a && a.title)
      .map((a) => ({ id: a.id || crypto.randomUUID(), title: a.title, person: a.person || null, date: a.date || null, time: a.time || null, location: a.location || null, notes: a.notes || null, createdAt: a.createdAt || new Date().toISOString() }));
  }
  if (incoming.tasks) {
    data.tasks = incoming.tasks
      .filter((t) => t && t.task)
      .map((t) => ({ id: t.id || crypto.randomUUID(), task: t.task, person: t.person || null, priority: t.priority || null, notes: t.notes || null, completed: !!t.completed, completedAt: t.completedAt || null, createdAt: t.createdAt || new Date().toISOString() }));
  }
  await saveData(data);
  res.json({ success: true, message: 'Data imported successfully' });
});

app.delete('/api/data', async (_req, res) => {
  data = freshData();
  await saveData(data);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Google OAuth routes
// ---------------------------------------------------------------------------
const pendingOAuthFlows = new Map();

app.get('/auth/google', requireAuth, (req, res) => {
  const { memberId } = req.query;
  if (!memberId) return res.status(400).json({ error: 'memberId is required' });

  const csrfToken = crypto.randomBytes(16).toString('hex');
  const state = JSON.stringify({ memberId, csrf: csrfToken });
  pendingOAuthFlows.set(csrfToken, { memberId, createdAt: Date.now() });

  // Clean up expired entries (older than 10 minutes)
  for (const [key, val] of pendingOAuthFlows) {
    if (Date.now() - val.createdAt > 10 * 60 * 1000) pendingOAuthFlows.delete(key);
  }

  const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
  const authorizationUrl = createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent',
  });
  res.json({ authorizationUrl });
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state) return res.status(400).send('Missing code or state');

  let memberId, csrf;
  try {
    const parsed = JSON.parse(state);
    memberId = parsed.memberId;
    csrf = parsed.csrf;
  } catch {
    return res.status(400).send('Invalid state parameter');
  }

  const pending = pendingOAuthFlows.get(csrf);
  if (!pending || pending.memberId !== memberId) {
    return res.status(403).send('Invalid or expired OAuth state — possible CSRF');
  }
  pendingOAuthFlows.delete(csrf);

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    const idx = data.familyMembers.findIndex((m) => m.id === memberId);
    if (idx === -1) return res.status(404).send('Family member not found');

    data.familyMembers[idx].tokens = encryptTokens(tokens);
    await saveData(data);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/family?status=success`);
  } catch (error) {
    console.error('Error retrieving access token', error);
    res.status(500).send('Authentication failed');
  }
});

app.get('/api/family-members/:memberId/calendar-events', async (req, res) => {
  const member = data.familyMembers.find((m) => m.id === req.params.memberId);
  if (!member || !member.tokens) {
    return res.status(404).json({ error: 'Family member not found or Google not connected' });
  }

  try {
    const tokens = decryptTokens(member.tokens);
    if (!tokens) return res.status(401).json({ error: 'Failed to decrypt tokens. Please re-authenticate.' });
    const client = createOAuthClient();
    client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: client });
    const now = new Date();
    const oneMonthLater = new Date();
    oneMonthLater.setMonth(now.getMonth() + 1);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: now.toISOString(),
      timeMax: oneMonthLater.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    // Sanitize: only return fields the frontend needs
    const events = (response.data.items || []).map((e) => ({
      id: e.id,
      summary: e.summary || '(No title)',
      start: e.start,
      end: e.end,
      location: e.location || null,
    }));
    res.json(events);
  } catch (error) {
    console.error('Error fetching calendar events:', error.message);
    if (error.code === 401 || error.code === 403) {
      const idx = data.familyMembers.findIndex((m) => m.id === req.params.memberId);
      if (idx > -1) {
        data.familyMembers[idx].tokens = null;
        await saveData(data);
      }
      return res.status(401).json({ error: 'Google authentication expired. Please re-authenticate.' });
    }
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// ---------------------------------------------------------------------------
// Global error handler — prevent stack trace leaks
// ---------------------------------------------------------------------------
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Export for testing; start server only when run directly
// ---------------------------------------------------------------------------
module.exports = {
  app,
  _getData: () => data,
  _setData: (d) => { data = d; },
  _test: { encryptTokens, decryptTokens, timingSafeCompare, rateLimitStore, activeSessions },
};

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`FamilyDash server running on port ${PORT}`);
  });
}
