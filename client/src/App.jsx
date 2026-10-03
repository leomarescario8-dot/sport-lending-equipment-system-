import { useEffect, useState, useCallback } from 'react';
import { api } from './api.js';

const CATEGORIES = ['Ball', 'Racket', 'Protective Gear', 'Fitness', 'Other'];
const CONDITIONS = ['Good', 'Fair', 'Poor'];
const emptyForm = { name: '', category: 'Ball', quantity: 1, condition: 'Good' };
const emptyBorrow = { borrower_name: '', student_id: '', days: 3 };

export default function App() {
  const [tab, setTab] = useState('equipment');
  const [msg, setMsg] = useState(null); 
  const notify = (text, type = 'ok') => { setMsg({ text, type }); setTimeout(() => setMsg(null), 4000); };

  return (
    <div className="app">
      <header>
        <h1>🏀 Sport Lending Equipment</h1>
        <nav>
          {['equipment', 'loans', 'waitlist'].map((t) => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>
          ))}
        </nav>
      </header>
      {msg && <div className={'toast ' + msg.type}>{msg.text}</div>}
      {tab === 'equipment' && <Equipment notify={notify} />}
      {tab === 'loans' && <Loans notify={notify} />}
      {tab === 'waitlist' && <Waitlist notify={notify} />}
    </div>
  );
}


function Equipment({ notify }) {
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState(null);
  const [f, setF] = useState({ search: '', category: '', sort: 'name', order: 'asc', algo: 'merge' });
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState(null);       
  const [borrowing, setBorrowing] = useState(null); 
  const [bForm, setBForm] = useState(emptyBorrow);
  const [exact, setExact] = useState('');

  const load = useCallback(async () => {
    try {
      const d = await api.listEquipment(f);
      setItems(d.items); setMeta(d.meta);
    } catch (e) { notify(e.message, 'err'); }
  }, [f]);
  useEffect(() => { load(); }, [load]);

  const onSearch = async (v) => {
    setF({ ...f, search: v });
    try { setSuggestions(v ? await api.suggest(v) : []); } catch { setSuggestions([]); }
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, quantity: Number(form.quantity) };
      if (form.id) await api.updateEquipment(form.id, body); else await api.addEquipment(body);
      notify(form.id ? 'Equipment updated' : 'Equipment added');
      setForm(null); load();
    } catch (err) { notify(err.message, 'err'); }
  };
  const remove = async (it) => {
    if (!confirm(`Delete ${it.name}?`)) return;
    try { await api.deleteEquipment(it.id); notify('Deleted (you can Undo)'); load(); }
    catch (err) { notify(err.message, 'err'); }
  };
  const undo = async () => {
    try { const r = await api.undo(); notify('Undid: ' + r.undone); load(); }
    catch (err) { notify(err.message, 'err'); }
  };
  const borrow = async (e) => {
    e.preventDefault();
    try {
      const r = await api.borrow({ ...bForm, days: Number(bForm.days), equipment_id: borrowing.id });
      notify(r.status === 'borrowed' ? 'Borrowed successfully' : `None available. Added to waitlist (position ${r.position})`);
      setBorrowing(null); setBForm(emptyBorrow); load();
    } catch (err) { notify(err.message, 'err'); }
  };
  const findExact = async () => {
    try { const r = await api.lookup(exact); notify(`Binary Search found: ${r.name} (${r.available}/${r.quantity} available)`); }
    catch (err) { notify(err.message, 'err'); }
  };

  return (
    <section>
      <div className="toolbar">
        <input list="sugg" placeholder="Search equipment…" value={f.search} onChange={(e) => onSearch(e.target.value)} />
        <datalist id="sugg">{suggestions.map((s) => <option key={s} value={s} />)}</datalist>
        <select value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>
          <option value="">All categories</option>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
        <select value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })}>
          {['name', 'category', 'quantity', 'available', 'condition'].map((s) => <option key={s}>{s}</option>)}
        </select>
        <select value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })}>
          <option value="asc">A → Z</option><option value="desc">Z → A</option>
        </select>
        <select value={f.algo} onChange={(e) => setF({ ...f, algo: e.target.value })}>
          <option value="merge">Merge Sort</option><option value="quick">Quick Sort</option>
        </select>
      </div>
      <div className="toolbar">
        <input placeholder="Exact name (Binary Search)" value={exact} onChange={(e) => setExact(e.target.value)} />
        <button onClick={findExact}>Find</button>
        <button className="primary" onClick={() => setForm(emptyForm)}>+ Add</button>
        <button onClick={undo}>↩ Undo</button>
      </div>
      {meta && <p className="meta">{meta.algorithm} · {meta.search} · {meta.count} items · {meta.ms} ms</p>}

      <div className="tablewrap">
        <table>
          <thead><tr><th>Name</th><th>Category</th><th>Qty</th><th>Available</th><th>Condition</th><th></th></tr></thead>
          <tbody>
            {items.map((it) => (
              <tr key={it.id}>
                <td>{it.name}</td><td>{it.category}</td><td>{it.quantity}</td>
                <td className={it.available === 0 ? 'bad' : ''}>{it.available}</td><td>{it.condition}</td>
                <td className="actions">
                  <button onClick={() => setBorrowing(it)}>{it.available > 0 ? 'Borrow' : 'Waitlist'}</button>
                  <button onClick={() => setForm({ id: it.id, name: it.name, category: it.category, quantity: it.quantity, condition: it.condition })}>Edit</button>
                  <button className="danger" onClick={() => remove(it)}>Delete</button>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan="6" className="empty">No equipment found</td></tr>}
          </tbody>
        </table>
      </div>

      {form && (
        <Modal title={form.id ? 'Edit equipment' : 'Add equipment'} onClose={() => setForm(null)}>
          <form onSubmit={save}>
            <label>Name<input required minLength={2} maxLength={60} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>Category<select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Quantity<input type="number" required min={0} max={1000} value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
            <label>Condition<select value={form.condition} onChange={(e) => setForm({ ...form, condition: e.target.value })}>{CONDITIONS.map((c) => <option key={c}>{c}</option>)}</select></label>
            <button className="primary">Save</button>
          </form>
        </Modal>
      )}

      {borrowing && (
        <Modal title={`${borrowing.available > 0 ? 'Borrow' : 'Join waitlist for'} ${borrowing.name}`} onClose={() => setBorrowing(null)}>
          <form onSubmit={borrow}>
            <label>Borrower name<input required minLength={2} maxLength={60} value={bForm.borrower_name} onChange={(e) => setBForm({ ...bForm, borrower_name: e.target.value })} /></label>
            <label>Student ID<input required pattern="[A-Za-z0-9\-]{4,20}" title="4-20 letters, numbers or dashes" value={bForm.student_id} onChange={(e) => setBForm({ ...bForm, student_id: e.target.value })} /></label>
            <label>Days (1-14)<input type="number" required min={1} max={14} value={bForm.days} onChange={(e) => setBForm({ ...bForm, days: e.target.value })} /></label>
            <button className="primary">Confirm</button>
          </form>
        </Modal>
      )}
    </section>
  );
}

function Loans({ notify }) {
  const [loans, setLoans] = useState([]);
  const [f, setF] = useState({ status: 'active', search: '', sort: 'due_date', order: 'asc' });
  const load = useCallback(async () => {
    try { setLoans(await api.listLoans(f)); } catch (e) { notify(e.message, 'err'); }
  }, [f]);
  useEffect(() => { load(); }, [load]);

  const giveBack = async (id) => {
    try {
      const r = await api.returnLoan(id);
      notify(r.assignedTo ? `Returned. Auto-lent to ${r.assignedTo} (next in queue)` : 'Returned');
      load();
    } catch (e) { notify(e.message, 'err'); }
  };
  const fmt = (d) => new Date(d).toLocaleDateString();

  return (
    <section>
      <div className="toolbar">
        <input placeholder="Search borrower / ID / item" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value })} />
        <select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
          <option value="active">Active</option><option value="all">All history</option>
        </select>
        <select value={f.sort} onChange={(e) => setF({ ...f, sort: e.target.value })}>
          <option value="due_date">Due date</option><option value="borrowed_at">Borrowed</option>
          <option value="borrower_name">Borrower</option><option value="equipment_name">Equipment</option>
        </select>
        <select value={f.order} onChange={(e) => setF({ ...f, order: e.target.value })}>
          <option value="asc">Asc</option><option value="desc">Desc</option>
        </select>
      </div>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Equipment</th><th>Borrower</th><th>ID</th><th>Due</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {loans.map((l) => (
              <tr key={l.id}>
                <td>{l.equipment_name}</td><td>{l.borrower_name}</td><td>{l.student_id}</td><td>{fmt(l.due_date)}</td>
                <td className={l.overdue ? 'bad' : ''}>{l.returned_at ? 'Returned' : l.overdue ? 'OVERDUE' : 'Borrowed'}</td>
                <td>{!l.returned_at && <button onClick={() => giveBack(l.id)}>Return</button>}</td>
              </tr>
            ))}
            {loans.length === 0 && <tr><td colSpan="6" className="empty">No loans</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}


function Waitlist({ notify }) {
  const [rows, setRows] = useState([]);
  const load = useCallback(async () => {
    try { setRows(await api.listWaitlist()); } catch (e) { notify(e.message, 'err'); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const cancel = async (id) => {
    try { await api.cancelWait(id); notify('Removed from waitlist'); load(); } catch (e) { notify(e.message, 'err'); }
  };
  return (
    <section>
      <p className="meta">Queue (FIFO): the first person in line gets the item when it is returned.</p>
      <div className="tablewrap">
        <table>
          <thead><tr><th>Equipment</th><th>#</th><th>Name</th><th>ID</th><th></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}><td>{r.equipment_name}</td><td>{r.position}</td><td>{r.borrower_name}</td><td>{r.student_id}</td>
                <td><button className="danger" onClick={() => cancel(r.id)}>Cancel</button></td></tr>
            ))}
            {rows.length === 0 && <tr><td colSpan="5" className="empty">Nobody is waiting</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Modal({ title, onClose, children }) {
  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
        <button className="link" onClick={onClose}>Cancel</button>
      </div>
    </div>
  );
}
