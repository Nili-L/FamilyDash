const express = require('express');
const dotenv = require('dotenv');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

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
}

// ---------------------------------------------------------------------------
// Data persistence — single JSON file for all entity types
// ---------------------------------------------------------------------------
const DATA_FILE = path.join(__dirname, 'data.json');

const DEFAULT_DATA = {
  familyMembers: [],
  medications: [],
  appointments: [],
  tasks: [],
};

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading data file:', err);
  }

  // Migrate from legacy familyMembers.json if it exists
  const legacyPath = path.join(__dirname, 'familyMembers.json');
  try {
    if (fs.existsSync(legacyPath)) {
      const members = JSON.parse(fs.readFileSync(legacyPath, 'utf8'));
      const migrated = { ...DEFAULT_DATA, familyMembers: members };
      saveData(migrated);
      return migrated;
    }
  } catch (err) {
    console.error('Error migrating legacy data:', err);
  }

  return { ...DEFAULT_DATA };
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

let data = loadData();

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

app.post('/api/family-members', (req, res) => {
  const { name, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const newMember = { id: crypto.randomUUID(), name, color: color || null, tokens: null };
  data.familyMembers.push(newMember);
  saveData(data);
  res.status(201).json({ id: newMember.id, name: newMember.name, color: newMember.color, googleConnected: false });
});

app.put('/api/family-members/:id', (req, res) => {
  const idx = data.familyMembers.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const { name, color } = req.body;
  if (name !== undefined) data.familyMembers[idx].name = name;
  if (color !== undefined) data.familyMembers[idx].color = color;
  saveData(data);

  const m = data.familyMembers[idx];
  res.json({ id: m.id, name: m.name, color: m.color, googleConnected: !!m.tokens });
});

app.delete('/api/family-members/:id', (req, res) => {
  const { id } = req.params;
  const before = data.familyMembers.length;
  data.familyMembers = data.familyMembers.filter((m) => m.id !== id);
  if (data.familyMembers.length === before) return res.status(404).json({ error: 'Not found' });

  // Cascade: remove associated medications, appointments, tasks
  data.medications = data.medications.filter((m) => m.person !== id);
  data.appointments = data.appointments.filter((a) => a.person !== id);
  data.tasks = data.tasks.filter((t) => t.person !== id);
  saveData(data);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------
app.get('/api/medications', (_req, res) => {
  res.json(data.medications);
});

app.post('/api/medications', (req, res) => {
  const med = {
    ...req.body,
    id: crypto.randomUUID(),
    taken: false,
    createdAt: new Date().toISOString(),
  };
  data.medications.push(med);
  saveData(data);
  res.status(201).json(med);
});

app.put('/api/medications/:id', (req, res) => {
  const idx = data.medications.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  data.medications[idx] = { ...data.medications[idx], ...req.body, id: req.params.id };
  saveData(data);
  res.json(data.medications[idx]);
});

app.delete('/api/medications/:id', (req, res) => {
  const before = data.medications.length;
  data.medications = data.medications.filter((m) => m.id !== req.params.id);
  if (data.medications.length === before) return res.status(404).json({ error: 'Not found' });
  saveData(data);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
app.get('/api/appointments', (_req, res) => {
  res.json(data.appointments);
});

app.post('/api/appointments', (req, res) => {
  const apt = {
    ...req.body,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  data.appointments.push(apt);
  saveData(data);
  res.status(201).json(apt);
});

app.put('/api/appointments/:id', (req, res) => {
  const idx = data.appointments.findIndex((a) => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  data.appointments[idx] = { ...data.appointments[idx], ...req.body, id: req.params.id };
  saveData(data);
  res.json(data.appointments[idx]);
});

app.delete('/api/appointments/:id', (req, res) => {
  const before = data.appointments.length;
  data.appointments = data.appointments.filter((a) => a.id !== req.params.id);
  if (data.appointments.length === before) return res.status(404).json({ error: 'Not found' });
  saveData(data);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
app.get('/api/tasks', (_req, res) => {
  res.json(data.tasks);
});

app.post('/api/tasks', (req, res) => {
  const task = {
    ...req.body,
    id: crypto.randomUUID(),
    completed: false,
    createdAt: new Date().toISOString(),
  };
  data.tasks.push(task);
  saveData(data);
  res.status(201).json(task);
});

app.put('/api/tasks/:id', (req, res) => {
  const idx = data.tasks.findIndex((t) => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  data.tasks[idx] = { ...data.tasks[idx], ...req.body, id: req.params.id };
  saveData(data);
  res.json(data.tasks[idx]);
});

app.delete('/api/tasks/:id', (req, res) => {
  const before = data.tasks.length;
  data.tasks = data.tasks.filter((t) => t.id !== req.params.id);
  if (data.tasks.length === before) return res.status(404).json({ error: 'Not found' });
  saveData(data);
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

app.post('/api/data/import', (req, res) => {
  const incoming = req.body;
  if (incoming.familyMembers) data.familyMembers = incoming.familyMembers;
  if (incoming.medications) data.medications = incoming.medications;
  if (incoming.appointments) data.appointments = incoming.appointments;
  if (incoming.tasks) data.tasks = incoming.tasks;
  saveData(data);
  res.json({ success: true, message: 'Data imported successfully' });
});

app.delete('/api/data', (_req, res) => {
  data = { ...DEFAULT_DATA };
  saveData(data);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Google OAuth routes
// ---------------------------------------------------------------------------
app.get('/auth/google', (req, res) => {
  const { memberId } = req.query;
  if (!memberId) return res.status(400).json({ error: 'memberId is required' });

  const scopes = ['https://www.googleapis.com/auth/calendar.readonly'];
  const authorizationUrl = createOAuthClient().generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: memberId,
    prompt: 'consent',
  });
  res.json({ authorizationUrl });
});

app.get('/auth/google/callback', async (req, res) => {
  const { code, state: memberId } = req.query;
  if (!code || !memberId) return res.status(400).send('Missing code or memberId');

  try {
    const client = createOAuthClient();
    const { tokens } = await client.getToken(code);

    const idx = data.familyMembers.findIndex((m) => m.id === memberId);
    if (idx === -1) return res.status(404).send('Family member not found');

    data.familyMembers[idx].tokens = encryptTokens(tokens);
    saveData(data);
    res.redirect(`${process.env.FRONTEND_URL}/family?status=success`);
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
    res.json(response.data.items);
  } catch (error) {
    console.error('Error fetching calendar events:', error.message);
    if (error.code === 401 || error.code === 403) {
      const idx = data.familyMembers.findIndex((m) => m.id === req.params.memberId);
      if (idx > -1) {
        data.familyMembers[idx].tokens = null;
        saveData(data);
      }
      return res.status(401).json({ error: 'Google authentication expired. Please re-authenticate.' });
    }
    res.status(500).json({ error: 'Failed to fetch calendar events' });
  }
});

// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`FamilyDash server running on port ${PORT}`);
});
