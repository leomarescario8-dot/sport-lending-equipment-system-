const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';
const TOKEN_KEY = 'sle_token';
const EMAIL_KEY = 'sle_email';

export const auth = {
  token: () => localStorage.getItem(TOKEN_KEY),
  email: () => localStorage.getItem(EMAIL_KEY),
  save: (token, email) => { localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(EMAIL_KEY, email); },
  clear: () => { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(EMAIL_KEY); },
};

async function request(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = auth.token();
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== '/api/login') {
    auth.clear();
    window.dispatchEvent(new Event('auth-expired'));
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const qs = (o) => new URLSearchParams(o).toString();

export const api = {
  login: (email, password) => request('/api/login', { method: 'POST', body: { email, password } }),
  listEquipment: (p) => request('/api/equipment?' + qs(p)),
  suggest: (q) => request('/api/suggest?' + qs({ q })),
  lookup: (name) => request('/api/equipment/lookup?' + qs({ name })),
  addEquipment: (b) => request('/api/equipment', { method: 'POST', body: b }),
  updateEquipment: (id, b) => request('/api/equipment/' + id, { method: 'PUT', body: b }),
  deleteEquipment: (id) => request('/api/equipment/' + id, { method: 'DELETE' }),
  undo: () => request('/api/undo', { method: 'POST' }),
  borrow: (b) => request('/api/borrow', { method: 'POST', body: b }),
  returnLoan: (id) => request('/api/return/' + id, { method: 'POST' }),
  listLoans: (p) => request('/api/loans?' + qs(p)),
  listWaitlist: () => request('/api/waitlist'),
  cancelWait: (id) => request('/api/waitlist/' + id, { method: 'DELETE' }),
};
