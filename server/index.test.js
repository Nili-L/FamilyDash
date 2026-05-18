import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';

// Set required env vars before importing the app
process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.APP_PASSWORD = 'test-password';

const { app, _setData, _test } = await import('./index.js');
const { encryptTokens, decryptTokens, timingSafeCompare, rateLimitStore, activeSessions } = _test;

function freshData() {
  return {
    familyMembers: [],
    medications: [],
    appointments: [],
    tasks: [],
  };
}

// Helper: log in and return the session cookie
async function login() {
  const res = await request(app)
    .post('/auth/login')
    .send({ password: 'test-password' });
  const cookie = res.headers['set-cookie']?.[0];
  return cookie;
}

beforeEach(() => {
  _setData(freshData());
  rateLimitStore.clear();
  activeSessions.clear();
});

// ── Encryption ────────────────────────────────────────────────────────
describe('Token encryption', () => {
  it('round-trips correctly', () => {
    const original = { access_token: 'ya29.test', refresh_token: '1//test', expiry_date: 1234567890 };
    const encrypted = encryptTokens(original);
    const decrypted = decryptTokens(encrypted);
    expect(decrypted).toEqual(original);
  });

  it('produces different ciphertext for the same input (random IV)', () => {
    const tokens = { access_token: 'ya29.test' };
    const a = encryptTokens(tokens);
    const b = encryptTokens(tokens);
    expect(a.data).not.toBe(b.data);
    expect(a.iv).not.toBe(b.iv);
  });

  it('does not contain plaintext tokens in the envelope', () => {
    const tokens = { access_token: 'ya29.super_secret_token' };
    const encrypted = encryptTokens(tokens);
    const blob = JSON.stringify(encrypted);
    expect(blob).not.toContain('ya29');
    expect(blob).not.toContain('super_secret_token');
  });

  it('returns null for missing or malformed envelope', () => {
    expect(decryptTokens(null)).toBeNull();
    expect(decryptTokens({})).toBeNull();
    expect(decryptTokens({ iv: 'abc' })).toBeNull();
    expect(decryptTokens({ iv: 'a', tag: 'b' })).toBeNull();
  });

  it('returns null for tampered ciphertext (integrity check)', () => {
    const encrypted = encryptTokens({ access_token: 'test' });
    // Flip a byte in the ciphertext
    const tampered = { ...encrypted, data: encrypted.data.slice(0, -2) + 'ff' };
    expect(decryptTokens(tampered)).toBeNull();
  });

  it('returns null for tampered auth tag', () => {
    const encrypted = encryptTokens({ access_token: 'test' });
    const tampered = { ...encrypted, tag: crypto.randomBytes(16).toString('hex') };
    expect(decryptTokens(tampered)).toBeNull();
  });

  it('returns null when decrypting with wrong key context', () => {
    const encrypted = encryptTokens({ access_token: 'test' });
    // Corrupt IV — simulates wrong key scenario
    const corrupted = { ...encrypted, iv: crypto.randomBytes(12).toString('hex') };
    expect(decryptTokens(corrupted)).toBeNull();
  });
});

// ── timingSafeCompare ─────────────────────────────────────────────────
describe('timingSafeCompare', () => {
  it('returns true for matching strings', () => {
    expect(timingSafeCompare('hello', 'hello')).toBe(true);
  });

  it('returns false for non-matching same-length strings', () => {
    expect(timingSafeCompare('hello', 'world')).toBe(false);
  });

  it('returns false for different-length strings', () => {
    expect(timingSafeCompare('short', 'a much longer string')).toBe(false);
  });

  it('returns false for non-string inputs', () => {
    expect(timingSafeCompare(null, 'hello')).toBe(false);
    expect(timingSafeCompare('hello', undefined)).toBe(false);
    expect(timingSafeCompare(123, 456)).toBe(false);
    expect(timingSafeCompare('', '')).toBe(true); // edge case: both empty
  });
});

// ── Auth ──────────────────────────────────────────────────────────────
describe('Auth', () => {
  it('rejects API calls without authentication', async () => {
    const res = await request(app).get('/api/family-members');
    expect(res.status).toBe(401);
  });

  it('rejects wrong password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'wrong' });
    expect(res.status).toBe(401);
  });

  it('rejects missing password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({});
    expect(res.status).toBe(401);
  });

  it('logs in with correct password', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'test-password' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns authenticated status when logged in', async () => {
    const cookie = await login();
    const res = await request(app)
      .get('/auth/status')
      .set('Cookie', cookie);
    expect(res.body.authenticated).toBe(true);
  });

  it('returns unauthenticated for no cookie', async () => {
    const res = await request(app).get('/auth/status');
    expect(res.body.authenticated).toBe(false);
  });

  it('returns unauthenticated for invalid cookie', async () => {
    const res = await request(app)
      .get('/auth/status')
      .set('Cookie', 'session=bogus-token');
    expect(res.body.authenticated).toBe(false);
  });

  it('logs out and invalidates session', async () => {
    const cookie = await login();
    await request(app).post('/auth/logout').set('Cookie', cookie);
    const res = await request(app)
      .get('/api/family-members')
      .set('Cookie', cookie);
    expect(res.status).toBe(401);
  });

  it('rate limits login attempts', async () => {
    let rateLimitedCount = 0;
    for (let i = 0; i < 32; i++) {
      const res = await request(app).post('/auth/login').send({ password: 'wrong' });
      if (res.status === 429) rateLimitedCount++;
    }
    expect(rateLimitedCount).toBeGreaterThan(0);
  });
});

// ── Family Members ────────────────────────────────────────────────────
describe('Family Members API', () => {
  it('returns empty array initially', async () => {
    const cookie = await login();
    const res = await request(app)
      .get('/api/family-members')
      .set('Cookie', cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('creates a family member', async () => {
    const cookie = await login();
    const res = await request(app)
      .post('/api/family-members')
      .set('Cookie', cookie)
      .send({ name: 'Alice' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Alice');
    expect(res.body.id).toBeDefined();
  });

  it('rejects member without name', async () => {
    const cookie = await login();
    const res = await request(app)
      .post('/api/family-members')
      .set('Cookie', cookie)
      .send({});
    expect(res.status).toBe(400);
  });

  it('rejects empty name on update', async () => {
    const cookie = await login();
    const created = await request(app)
      .post('/api/family-members')
      .set('Cookie', cookie)
      .send({ name: 'Alice' });
    const res = await request(app)
      .put(`/api/family-members/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ name: '' });
    expect(res.status).toBe(400);
  });

  it('updates a family member', async () => {
    const cookie = await login();
    const created = await request(app)
      .post('/api/family-members')
      .set('Cookie', cookie)
      .send({ name: 'Alice' });

    const res = await request(app)
      .put(`/api/family-members/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ name: 'Bob' });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Bob');
  });

  it('deletes a family member and cascades', async () => {
    const cookie = await login();
    const member = await request(app)
      .post('/api/family-members')
      .set('Cookie', cookie)
      .send({ name: 'Alice' });

    await request(app)
      .post('/api/medications')
      .set('Cookie', cookie)
      .send({ name: 'Aspirin', person: member.body.id, time: '08:00' });

    await request(app)
      .delete(`/api/family-members/${member.body.id}`)
      .set('Cookie', cookie);

    const members = await request(app)
      .get('/api/family-members')
      .set('Cookie', cookie);
    expect(members.body).toHaveLength(0);

    const meds = await request(app)
      .get('/api/medications')
      .set('Cookie', cookie);
    expect(meds.body).toHaveLength(0);
  });

  it('returns 404 for nonexistent member', async () => {
    const cookie = await login();
    const res = await request(app)
      .delete('/api/family-members/nonexistent')
      .set('Cookie', cookie);
    expect(res.status).toBe(404);
  });
});

// ── Medications ───────────────────────────────────────────────────────
describe('Medications API', () => {
  it('CRUD cycle works', async () => {
    const cookie = await login();

    const created = await request(app)
      .post('/api/medications')
      .set('Cookie', cookie)
      .send({ name: 'Aspirin', person: 'p1', time: '08:00' });
    expect(created.status).toBe(201);
    expect(created.body.taken).toBe(false);

    const list = await request(app)
      .get('/api/medications')
      .set('Cookie', cookie);
    expect(list.body).toHaveLength(1);

    const updated = await request(app)
      .put(`/api/medications/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ taken: true, takenAt: new Date().toISOString() });
    expect(updated.body.taken).toBe(true);

    const deleted = await request(app)
      .delete(`/api/medications/${created.body.id}`)
      .set('Cookie', cookie);
    expect(deleted.status).toBe(204);

    const empty = await request(app)
      .get('/api/medications')
      .set('Cookie', cookie);
    expect(empty.body).toHaveLength(0);
  });

  it('rejects medication without name', async () => {
    const cookie = await login();
    const res = await request(app)
      .post('/api/medications')
      .set('Cookie', cookie)
      .send({ person: 'p1', time: '08:00' });
    expect(res.status).toBe(400);
  });
});

// ── Appointments ──────────────────────────────────────────────────────
describe('Appointments API', () => {
  it('CRUD cycle works', async () => {
    const cookie = await login();

    const created = await request(app)
      .post('/api/appointments')
      .set('Cookie', cookie)
      .send({ title: 'Checkup', person: 'p1', date: '2026-05-01', time: '10:00' });
    expect(created.status).toBe(201);

    const updated = await request(app)
      .put(`/api/appointments/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ location: 'Room 5' });
    expect(updated.body.location).toBe('Room 5');

    await request(app)
      .delete(`/api/appointments/${created.body.id}`)
      .set('Cookie', cookie);

    const list = await request(app)
      .get('/api/appointments')
      .set('Cookie', cookie);
    expect(list.body).toHaveLength(0);
  });

  it('rejects appointment without title', async () => {
    const cookie = await login();
    const res = await request(app)
      .post('/api/appointments')
      .set('Cookie', cookie)
      .send({ person: 'p1', date: '2026-05-01' });
    expect(res.status).toBe(400);
  });
});

// ── Tasks ─────────────────────────────────────────────────────────────
describe('Tasks API', () => {
  it('CRUD cycle works', async () => {
    const cookie = await login();

    const created = await request(app)
      .post('/api/tasks')
      .set('Cookie', cookie)
      .send({ task: 'Buy groceries', person: 'p1', priority: 'high' });
    expect(created.status).toBe(201);
    expect(created.body.completed).toBe(false);

    const updated = await request(app)
      .put(`/api/tasks/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ completed: true });
    expect(updated.body.completed).toBe(true);

    await request(app)
      .delete(`/api/tasks/${created.body.id}`)
      .set('Cookie', cookie);

    const list = await request(app)
      .get('/api/tasks')
      .set('Cookie', cookie);
    expect(list.body).toHaveLength(0);
  });

  it('rejects task without description', async () => {
    const cookie = await login();
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', cookie)
      .send({ person: 'p1', priority: 'high' });
    expect(res.status).toBe(400);
  });
});

// ── Bulk data ─────────────────────────────────────────────────────────
describe('Bulk data API', () => {
  it('exports all data', async () => {
    const cookie = await login();
    await request(app)
      .post('/api/family-members')
      .set('Cookie', cookie)
      .send({ name: 'Alice' });

    const res = await request(app)
      .get('/api/data/export')
      .set('Cookie', cookie);
    expect(res.body.familyMembers).toHaveLength(1);
    expect(res.body.exportedAt).toBeDefined();
  });

  it('exports do not leak tokens', async () => {
    const cookie = await login();
    _setData({
      ...freshData(),
      familyMembers: [{ id: 'x', name: 'Alice', tokens: { encrypted: 'secret' } }],
    });
    const res = await request(app)
      .get('/api/data/export')
      .set('Cookie', cookie);
    expect(res.body.familyMembers[0]).not.toHaveProperty('tokens');
  });

  it('imports data and overwrites', async () => {
    const cookie = await login();
    await request(app)
      .post('/api/data/import')
      .set('Cookie', cookie)
      .send({
        familyMembers: [{ id: 'x', name: 'Imported' }],
        medications: [],
        appointments: [],
        tasks: [],
      });

    const res = await request(app)
      .get('/api/family-members')
      .set('Cookie', cookie);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Imported');
  });

  it('import strips tokens from family members', async () => {
    const cookie = await login();
    await request(app)
      .post('/api/data/import')
      .set('Cookie', cookie)
      .send({
        familyMembers: [{ id: 'x', name: 'Hacker', tokens: { access_token: 'stolen' } }],
      });

    // The stored member should have tokens: null
    const res = await request(app)
      .get('/api/family-members')
      .set('Cookie', cookie);
    expect(res.body[0].googleConnected).toBe(false);
  });

  it('partial import preserves other collections', async () => {
    const cookie = await login();
    await request(app)
      .post('/api/medications')
      .set('Cookie', cookie)
      .send({ name: 'Aspirin', person: 'p1', time: '08:00' });

    // Import only family members
    await request(app)
      .post('/api/data/import')
      .set('Cookie', cookie)
      .send({ familyMembers: [{ id: 'x', name: 'Alice' }] });

    // Medications should still exist
    const meds = await request(app)
      .get('/api/medications')
      .set('Cookie', cookie);
    expect(meds.body).toHaveLength(1);
  });

  it('clears all data', async () => {
    const cookie = await login();
    await request(app)
      .post('/api/family-members')
      .set('Cookie', cookie)
      .send({ name: 'Alice' });

    await request(app)
      .delete('/api/data')
      .set('Cookie', cookie);

    const res = await request(app)
      .get('/api/family-members')
      .set('Cookie', cookie);
    expect(res.body).toHaveLength(0);
  });

  it('rejects non-array import fields', async () => {
    const cookie = await login();
    const res = await request(app)
      .post('/api/data/import')
      .set('Cookie', cookie)
      .send({ medications: 'not-an-array' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/array/);
  });

  it('import filters out entries missing required fields', async () => {
    const cookie = await login();
    await request(app)
      .post('/api/data/import')
      .set('Cookie', cookie)
      .send({
        medications: [
          { name: 'Valid', person: 'p1', time: '08:00' },
          { person: 'p1' }, // missing name — should be filtered out
        ],
        appointments: [
          { title: 'Valid Apt', date: '2026-05-01' },
          { date: '2026-05-01' }, // missing title
        ],
        tasks: [
          { task: 'Valid Task', priority: 'high' },
          { priority: 'low' }, // missing task
        ],
      });

    const meds = await request(app).get('/api/medications').set('Cookie', cookie);
    expect(meds.body).toHaveLength(1);
    expect(meds.body[0].name).toBe('Valid');

    const apts = await request(app).get('/api/appointments').set('Cookie', cookie);
    expect(apts.body).toHaveLength(1);
    expect(apts.body[0].title).toBe('Valid Apt');

    const tasks = await request(app).get('/api/tasks').set('Cookie', cookie);
    expect(tasks.body).toHaveLength(1);
    expect(tasks.body[0].task).toBe('Valid Task');
  });

  it('import whitelists fields and assigns defaults', async () => {
    const cookie = await login();
    await request(app)
      .post('/api/data/import')
      .set('Cookie', cookie)
      .send({
        medications: [{ name: 'Aspirin', _injected: 'evil' }],
      });

    const meds = await request(app).get('/api/medications').set('Cookie', cookie);
    expect(meds.body[0]).not.toHaveProperty('_injected');
    expect(meds.body[0].taken).toBe(false);
    expect(meds.body[0].createdAt).toBeDefined();
  });

  it('clear works correctly when called twice', async () => {
    const cookie = await login();

    // Add, clear, add, clear — the shallow copy bug would break this
    await request(app)
      .post('/api/family-members')
      .set('Cookie', cookie)
      .send({ name: 'Alice' });
    await request(app).delete('/api/data').set('Cookie', cookie);

    await request(app)
      .post('/api/family-members')
      .set('Cookie', cookie)
      .send({ name: 'Bob' });
    await request(app).delete('/api/data').set('Cookie', cookie);

    const res = await request(app)
      .get('/api/family-members')
      .set('Cookie', cookie);
    expect(res.body).toHaveLength(0);
  });
});

// ── CORS ──────────────────────────────────────────────────────────────
describe('CORS', () => {
  it('sets CORS headers for allowed origin', async () => {
    const res = await request(app)
      .options('/api/family-members')
      .set('Origin', 'http://localhost:5173');
    expect(res.status).toBe(204);
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });

  it('does not set CORS headers for disallowed origin', async () => {
    const res = await request(app)
      .options('/api/family-members')
      .set('Origin', 'http://evil.com');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
