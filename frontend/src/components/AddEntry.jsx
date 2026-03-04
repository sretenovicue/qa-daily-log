import { useState, useCallback } from 'react';
import { useStore } from '../store';
import { CATEGORIES, ACTIONS, STATUSES, PROJECTS } from '../constants';
import { ValidationError } from '../validate';

const CATEGORY_KEYS = Object.keys(CATEGORIES);
const ACTION_KEYS   = Object.keys(ACTIONS);
const STATUS_KEYS   = Object.keys(STATUSES);

const INITIAL_FORM = {
  category:    '',
  action:      '',
  status:      '',
  project:     '',
  description: '',
  manualTime:  '',
};

export default function AddEntry() {
  const [form, setForm]     = useState(INITIAL_FORM);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState([]);

  const { addEntry } = useStore();

  const set = useCallback((field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    if (errors.length) setErrors([]); // clear errors on change
  }, [errors.length]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setLoading(true);
    try {
      await addEntry(form);
      setForm(INITIAL_FORM);
    } catch (err) {
      if (err instanceof ValidationError) {
        setErrors(err.errors);
      } else {
        setErrors(['Greška pri dodavanju. Provjeri konekciju sa serverom.']);
        console.error(err);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <div className="card-title">Novi unos</div>
      <form onSubmit={handleSubmit} noValidate>

        <div className="form-group">
          <label>Projekat</label>
          <select value={form.project} onChange={e => set('project', e.target.value)}>
            <option value="">— Bez projekta —</option>
            {PROJECTS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Kategorija</label>
          <select value={form.category} onChange={e => set('category', e.target.value)}>
            <option value="">— Odaberi —</option>
            {CATEGORY_KEYS.map(k => (
              <option key={k} value={k}>{CATEGORIES[k].emoji} {CATEGORIES[k].label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Akcija</label>
          <select value={form.action} onChange={e => set('action', e.target.value)}>
            <option value="">— Odaberi —</option>
            {ACTION_KEYS.map(k => (
              <option key={k} value={k}>{ACTIONS[k]}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Status</label>
          <select value={form.status} onChange={e => set('status', e.target.value)}>
            <option value="">— Odaberi —</option>
            {STATUS_KEYS.map(k => (
              <option key={k} value={k}>{STATUSES[k].emoji} {STATUSES[k].label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Opis</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Npr: Test slučaj za login, bug #123..."
          />
        </div>

        <div className="form-group">
          <label>Trajanje (h:mm) — npr. 1:30</label>
          <input
            type="text"
            value={form.manualTime}
            onChange={e => set('manualTime', e.target.value)}
            placeholder="0:45"
          />
        </div>

        {errors.length > 0 && (
          <div style={{
            background: 'rgba(240,108,108,0.1)',
            border: '1px solid rgba(240,108,108,0.3)',
            borderRadius: 8, padding: '10px 12px',
            marginBottom: 10,
          }}>
            {errors.map((err, i) => (
              <div key={i} style={{ color: 'var(--red)', fontSize: 12, fontWeight: 600 }}>
                {err}
              </div>
            ))}
          </div>
        )}

        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? 'Dodavanje...' : '+ Dodaj unos'}
        </button>
      </form>
    </div>
  );
}
