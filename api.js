const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}
const qs = (o) => new URLSearchParams(o).toString();

export const api = {
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
