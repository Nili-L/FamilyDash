import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';

// Set required env vars before importing the app
process.env.TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
process.env.APP_PASSWORD = 'test-password';

const { app, _setData } = await import('./index.js');

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

  it('logs out and invalidates session', async () => {
    const cookie = await login();
    await request(app).post('/auth/logout').set('Cookie', cookie);
    const res = await request(app)
      .get('/api/family-members')
      .set('Cookie', cookie);
    expect(res.status).toBe(401);
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

    // Add a medication for this member
    await request(app)
      .post('/api/medications')
      .set('Cookie', cookie)
      .send({ name: 'Aspirin', person: member.body.id, time: '08:00' });

    await request(app)
      .delete(`/api/family-members/${member.body.id}`)
      .set('Cookie', cookie);

    // Member gone
    const members = await request(app)
      .get('/api/family-members')
      .set('Cookie', cookie);
    expect(members.body).toHaveLength(0);

    // Medication cascaded
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

    // Create
    const created = await request(app)
      .post('/api/medications')
      .set('Cookie', cookie)
      .send({ name: 'Aspirin', person: 'p1', time: '08:00' });
    expect(created.status).toBe(201);
    expect(created.body.taken).toBe(false);

    // Read
    const list = await request(app)
      .get('/api/medications')
      .set('Cookie', cookie);
    expect(list.body).toHaveLength(1);

    // Update (toggle taken)
    const updated = await request(app)
      .put(`/api/medications/${created.body.id}`)
      .set('Cookie', cookie)
      .send({ taken: true, takenAt: new Date().toISOString() });
    expect(updated.body.taken).toBe(true);

    // Delete
    const deleted = await request(app)
      .delete(`/api/medications/${created.body.id}`)
      .set('Cookie', cookie);
    expect(deleted.status).toBe(204);

    const empty = await request(app)
      .get('/api/medications')
      .set('Cookie', cookie);
    expect(empty.body).toHaveLength(0);
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
});
