// Auth-aware fetch wrapper. Fires a custom event on 401 so the app can
// show the login screen without every component needing to handle it.
async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });

  if (res.status === 401) {
    window.dispatchEvent(new CustomEvent('auth:required'));
    throw new Error('Authentication required');
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------
export const authApi = {
  login: (password) => api('/auth/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => api('/auth/logout', { method: 'POST' }),
  status: async () => {
    try {
      const r = await fetch('/auth/status');
      if (!r.ok) return { authenticated: false };
      return r.json();
    } catch {
      return { authenticated: false };
    }
  },
};

// ---------------------------------------------------------------------------
// Family Members
// ---------------------------------------------------------------------------
export const familyMembersApi = {
  getAll: () => api('/api/family-members'),
  create: (member) => api('/api/family-members', { method: 'POST', body: JSON.stringify(member) }),
  update: (id, updates) => api(`/api/family-members/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  remove: (id) => api(`/api/family-members/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Medications
// ---------------------------------------------------------------------------
export const medicationsApi = {
  getAll: () => api('/api/medications'),
  create: (med) => api('/api/medications', { method: 'POST', body: JSON.stringify(med) }),
  update: (id, updates) => api(`/api/medications/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  remove: (id) => api(`/api/medications/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Appointments
// ---------------------------------------------------------------------------
export const appointmentsApi = {
  getAll: () => api('/api/appointments'),
  create: (apt) => api('/api/appointments', { method: 'POST', body: JSON.stringify(apt) }),
  update: (id, updates) => api(`/api/appointments/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  remove: (id) => api(`/api/appointments/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------
export const tasksApi = {
  getAll: () => api('/api/tasks'),
  create: (task) => api('/api/tasks', { method: 'POST', body: JSON.stringify(task) }),
  update: (id, updates) => api(`/api/tasks/${id}`, { method: 'PUT', body: JSON.stringify(updates) }),
  remove: (id) => api(`/api/tasks/${id}`, { method: 'DELETE' }),
};

// ---------------------------------------------------------------------------
// Bulk data operations
// ---------------------------------------------------------------------------
export const dataApi = {
  exportAll: () => api('/api/data/export'),
  importAll: (payload) => api('/api/data/import', { method: 'POST', body: JSON.stringify(payload) }),
  clearAll: () => api('/api/data', { method: 'DELETE' }),
};
