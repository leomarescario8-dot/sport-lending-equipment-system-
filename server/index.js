import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { HashTable, Queue, Stack, Trie, makeComparator, mergeSort, quickSort, binarySearch, linearSearch } from './dsa.js';

const { SUPABASE_URL, SUPABASE_SERVICE_KEY, CLIENT_URL, PORT = 4000 } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const app = express();
app.use(cors({ origin: CLIENT_URL ? CLIENT_URL.split(',').map((s) => s.trim()) : '*' }));
app.use(express.json());


class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => {
    if (!(e instanceof HttpError)) console.error(e);
    res.status(e.status || 500).json({ error: e.message || 'Server error' });
  });
const ok = ({ data, error }) => {
  if (error) throw new HttpError(500, error.message);
  return data;
};
const all = async (table, orderBy = 'created_at') =>
  ok(await supabase.from(table).select('*').order(orderBy, { ascending: true }));
const logAction = async (action, payload) => ok(await supabase.from('action_log').insert({ action, payload }));

const CATEGORIES = ['Ball', 'Racket', 'Protective Gear', 'Fitness', 'Other'];
const CONDITIONS = ['Good', 'Fair', 'Poor'];
const SORT_FIELDS = ['name', 'category', 'quantity', 'available', 'condition', 'created_at'];


function validateEquipment(b) {
  const errors = [];
  const name = String(b.name ?? '').trim();
  const quantity = Number(b.quantity);
  if (name.length < 2 || name.length > 60) errors.push('Name must be 2-60 characters');
  if (!CATEGORIES.includes(b.category)) errors.push('Invalid category');
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > 1000) errors.push('Quantity must be a whole number from 0 to 1000');
  if (!CONDITIONS.includes(b.condition)) errors.push('Invalid condition');
  if (errors.length) throw new HttpError(400, errors.join('. '));
  return { name, category: b.category, quantity, condition: b.condition };
}
function validateBorrower(b) {
  const errors = [];
  const borrower_name = String(b.borrower_name ?? '').trim();
  const student_id = String(b.student_id ?? '').trim();
  const days = Number(b.days);
  if (borrower_name.length < 2 || borrower_name.length > 60) errors.push('Borrower name must be 2-60 characters');
  if (!/^[A-Za-z0-9-]{4,20}$/.test(student_id)) errors.push('Student ID must be 4-20 letters, numbers or dashes');
  if (!Number.isInteger(days) || days < 1 || days > 14) errors.push('Days must be a whole number from 1 to 14');
  if (errors.length) throw new HttpError(400, errors.join('. '));
  return { borrower_name, student_id, days };
}

const equipmentTable = async () => {
  const table = new HashTable();
  (await all('equipment')).forEach((e) => table.set(e.id, e));
  return table;
};


app.get('/api/equipment', wrap(async (req, res) => {
  const { search = '', category = '', sort = 'name', order = 'asc', algo = 'merge' } = req.query;
  if (!SORT_FIELDS.includes(sort)) throw new HttpError(400, 'Invalid sort field');
  const start = performance.now();
  let items = await all('equipment');
  if (category) items = items.filter((i) => i.category === category);
  items = linearSearch(items, String(search), ['name', 'category', 'condition']);
  const cmp = makeComparator(sort, order === 'desc' ? 'desc' : 'asc');
  items = algo === 'quick' ? quickSort(items, cmp) : mergeSort(items, cmp);
  res.json({
    items,
    meta: { algorithm: algo === 'quick' ? 'Quick Sort' : 'Merge Sort', search: 'Linear Search', count: items.length, ms: +(performance.now() - start).toFixed(2) },
  });
}));

app.get('/api/suggest', wrap(async (req, res) => {
  const trie = new Trie();
  (await all('equipment')).forEach((e) => trie.insert(e.name));
  res.json(trie.startsWith(String(req.query.q ?? '')));
}));

app.get('/api/equipment/lookup', wrap(async (req, res) => {
  const name = String(req.query.name ?? '').trim().toLowerCase();
  if (!name) throw new HttpError(400, 'Enter a name');
  const sorted = mergeSort(await all('equipment'), (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));
  const idx = binarySearch(sorted, name, (e) => e.name.toLowerCase());
  if (idx === -1) throw new HttpError(404, 'No exact match found');
  res.json(sorted[idx]);
}));


app.get('/api/equipment/:id', wrap(async (req, res) => {
  const item = (await equipmentTable()).get(req.params.id);
  if (!item) throw new HttpError(404, 'Equipment not found');
  res.json(item);
}));

app.post('/api/equipment', wrap(async (req, res) => {
  const clean = validateEquipment(req.body);
  const dup = (await all('equipment')).find((e) => e.name.toLowerCase() === clean.name.toLowerCase());
  if (dup) throw new HttpError(409, 'Equipment with that name already exists');
  const [row] = ok(await supabase.from('equipment').insert({ ...clean, available: clean.quantity }).select());
  await logAction('add', { id: row.id });
  res.status(201).json(row);
}));

app.put('/api/equipment/:id', wrap(async (req, res) => {
  const table = await equipmentTable();
  const old = table.get(req.params.id);
  if (!old) throw new HttpError(404, 'Equipment not found');
  const clean = validateEquipment(req.body);
  const dup = table.values().find((e) => e.id !== old.id && e.name.toLowerCase() === clean.name.toLowerCase());
  if (dup) throw new HttpError(409, 'Another equipment already has that name');
  const borrowed = old.quantity - old.available;
  if (clean.quantity < borrowed) throw new HttpError(400, `Quantity cannot be less than currently borrowed (${borrowed})`);
  const [row] = ok(await supabase.from('equipment').update({ ...clean, available: clean.quantity - borrowed }).eq('id', old.id).select());
  await logAction('update', { before: old });
  res.json(row);
}));

app.delete('/api/equipment/:id', wrap(async (req, res) => {
  const old = (await equipmentTable()).get(req.params.id);
  if (!old) throw new HttpError(404, 'Equipment not found');
  if (old.quantity - old.available > 0) throw new HttpError(409, 'Cannot delete: some units are still borrowed');
  ok(await supabase.from('equipment').delete().eq('id', old.id));
  await logAction('delete', { item: old });
  res.json({ deleted: true });
}));


app.post('/api/undo', wrap(async (req, res) => {
  const logs = ok(await supabase.from('action_log').select('*').order('id', { ascending: false }).limit(50));
  const stack = new Stack();
  [...logs].reverse().forEach((l) => stack.push(l)); 
  const last = stack.pop();
  if (!last) throw new HttpError(400, 'Nothing to undo');
  const { action, payload } = last;
  if (action === 'add') {
    ok(await supabase.from('equipment').delete().eq('id', payload.id));
  } else if (action === 'update') {
    const { id, name, category, quantity, available, condition } = payload.before;
    ok(await supabase.from('equipment').update({ name, category, quantity, available, condition }).eq('id', id));
  } else if (action === 'delete') {
    ok(await supabase.from('equipment').insert(payload.item));
  }
  ok(await supabase.from('action_log').delete().eq('id', last.id));
  res.json({ undone: action });
}));

// ---------- LOANS ----------
app.post('/api/borrow', wrap(async (req, res) => {
  const { equipment_id } = req.body;
  const person = validateBorrower(req.body);
  const item = (await equipmentTable()).get(equipment_id);
  if (!item) throw new HttpError(404, 'Equipment not found');

  const activeLoans = ok(await supabase.from('loans').select('*').eq('equipment_id', equipment_id).is('returned_at', null));
  const waiting = ok(await supabase.from('waitlist').select('*').eq('equipment_id', equipment_id).order('created_at'));
  if (activeLoans.some((l) => l.student_id === person.student_id)) throw new HttpError(409, 'This student already borrowed this item');
  if (waiting.some((w) => w.student_id === person.student_id)) throw new HttpError(409, 'This student is already on the waitlist');

  if (item.available > 0 && waiting.length === 0) {
    const due = new Date(Date.now() + person.days * 86400000).toISOString();
    ok(await supabase.from('equipment').update({ available: item.available - 1 }).eq('id', item.id));
    const [loan] = ok(await supabase.from('loans').insert({
      equipment_id, borrower_name: person.borrower_name, student_id: person.student_id, due_date: due,
    }).select());
    return res.status(201).json({ status: 'borrowed', loan });
  }
  // none available -> enqueue
  const queue = new Queue();
  waiting.forEach((w) => queue.enqueue(w));
  ok(await supabase.from('waitlist').insert({ equipment_id, ...person }));
  res.status(202).json({ status: 'waitlisted', position: queue.length + 1 });
}));

app.post('/api/return/:loanId', wrap(async (req, res) => {
  const [loan] = ok(await supabase.from('loans').select('*').eq('id', req.params.loanId));
  if (!loan) throw new HttpError(404, 'Loan not found');
  if (loan.returned_at) throw new HttpError(409, 'Already returned');
  ok(await supabase.from('loans').update({ returned_at: new Date().toISOString() }).eq('id', loan.id));

  // Dequeue next person in line (FIFO)
  const queue = new Queue();
  ok(await supabase.from('waitlist').select('*').eq('equipment_id', loan.equipment_id).order('created_at'))
    .forEach((w) => queue.enqueue(w));
  const next = queue.dequeue();
  if (next) {
    const due = new Date(Date.now() + next.days * 86400000).toISOString();
    ok(await supabase.from('loans').insert({
      equipment_id: loan.equipment_id, borrower_name: next.borrower_name, student_id: next.student_id, due_date: due,
    }));
    ok(await supabase.from('waitlist').delete().eq('id', next.id));
    return res.json({ returned: true, assignedTo: next.borrower_name });
  }
  const item = (await equipmentTable()).get(loan.equipment_id);
  if (item) ok(await supabase.from('equipment').update({ available: item.available + 1 }).eq('id', item.id));
  res.json({ returned: true });
}));

app.get('/api/loans', wrap(async (req, res) => {
  const { status = 'active', search = '', sort = 'due_date', order = 'asc' } = req.query;
  if (!['borrowed_at', 'due_date', 'borrower_name', 'equipment_name'].includes(sort)) throw new HttpError(400, 'Invalid sort field');
  const table = await equipmentTable();
  const now = Date.now();
  let loans = (await all('loans', 'borrowed_at')).map((l) => ({
    ...l,
    equipment_name: table.get(l.equipment_id)?.name ?? 'Unknown', 
    overdue: !l.returned_at && new Date(l.due_date).getTime() < now,
  }));
  if (status === 'active') loans = loans.filter((l) => !l.returned_at);
  loans = linearSearch(loans, String(search), ['borrower_name', 'student_id', 'equipment_name']);
  loans = mergeSort(loans, makeComparator(sort, order === 'desc' ? 'desc' : 'asc'));
  res.json(loans);
}));

// ---------- WAITLIST ----------
app.get('/api/waitlist', wrap(async (req, res) => {
  const table = await equipmentTable();
  const queues = new HashTable(); 
  (await all('waitlist')).forEach((w) => {
    if (!queues.has(w.equipment_id)) queues.set(w.equipment_id, new Queue());
    queues.get(w.equipment_id).enqueue(w);
  });
  const out = [];
  queues.values().forEach((q) => q.toArray().forEach((w, i) => out.push({ ...w, position: i + 1, equipment_name: table.get(w.equipment_id)?.name ?? 'Unknown' })));
  res.json(out);
}));

app.delete('/api/waitlist/:id', wrap(async (req, res) => {
  ok(await supabase.from('waitlist').delete().eq('id', req.params.id));
  res.json({ deleted: true });
}));

app.get('/', (req, res) => res.json({ status: 'Sport Lending API running' }));
app.listen(PORT, () => console.log(`API running on port ${PORT}`));
