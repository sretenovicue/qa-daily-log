import { useState, useEffect } from 'react';
import { getCourses, createCourse, updateCourse, deleteCourse } from '../../api';

const STATUS_CONFIG = {
  planned:     { label: 'Planirano',  color: '#8b8fa8', bg: 'rgba(139,143,168,0.12)' },
  in_progress: { label: 'U toku',     color: '#4fc3f7', bg: 'rgba(79,195,247,0.12)'  },
  done:        { label: 'Završeno',   color: '#43e97b', bg: 'rgba(67,233,123,0.12)'  },
};

const STATUS_ORDER = ['in_progress', 'planned', 'done'];

function CourseCard({ course, onStatusChange, onDelete }) {
  const cfg = STATUS_CONFIG[course.status] || STATUS_CONFIG.planned;
  return (
    <div style={{
      background: 'var(--surface2, rgba(255,255,255,0.04))',
      border: '1px solid rgba(255,255,255,0.07)',
      borderLeft: `3px solid ${cfg.color}`,
      borderRadius: 8,
      padding: '12px 14px',
      display: 'flex',
      gap: 12,
      alignItems: 'flex-start',
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>
          {course.url
            ? <a href={course.url} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = 'var(--accent)'}
                onMouseLeave={e => e.target.style.color = 'inherit'}>
                {course.title} ↗
              </a>
            : course.title
          }
        </div>
        {course.author && (
          <div style={{ fontSize: 11, color: 'var(--text2)' }}>{course.author}</div>
        )}
        {course.notes && (
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, fontStyle: 'italic' }}>
            {course.notes}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
        <select
          value={course.status}
          onChange={e => onStatusChange(course.id, e.target.value)}
          style={{
            background: cfg.bg,
            border: `1px solid ${cfg.color}40`,
            borderRadius: 20,
            color: cfg.color,
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 8px',
            cursor: 'pointer',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k} style={{ background: 'var(--surface)', color: 'var(--text)' }}>
              {v.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onDelete(course.id)}
          style={{ background: 'none', border: 'none', color: 'var(--text2)', cursor: 'pointer', fontSize: 14, padding: '2px 4px', opacity: 0.5 }}
          title="Obriši"
        >✕</button>
      </div>
    </div>
  );
}

function AddForm({ onAdd }) {
  const [open,   setOpen]   = useState(false);
  const [title,  setTitle]  = useState('');
  const [url,    setUrl]    = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState('planned');
  const [notes,  setNotes]  = useState('');
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onAdd({ title, url, author, status, notes });
      setTitle(''); setUrl(''); setAuthor(''); setNotes(''); setStatus('planned');
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          width: '100%',
          padding: '10px',
          background: 'transparent',
          border: '1px dashed rgba(124,111,247,0.3)',
          borderRadius: 8,
          color: 'var(--accent)',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'all 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,111,247,0.08)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
      >
        + Dodaj kurs / resurs
      </button>
    );
  }

  return (
    <form onSubmit={handleAdd} style={{
      background: 'var(--surface2, rgba(255,255,255,0.04))',
      border: '1px solid rgba(124,111,247,0.2)',
      borderRadius: 10,
      padding: '14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <input
        className="auth-field"
        placeholder="Naziv kursa / resursa *"
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
        style={{ padding: '9px 12px', fontSize: 13 }}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <input
          className="auth-field"
          placeholder="URL (opciono)"
          value={url}
          onChange={e => setUrl(e.target.value)}
          type="url"
          style={{ padding: '9px 12px', fontSize: 13 }}
        />
        <input
          className="auth-field"
          placeholder="Autor (opciono)"
          value={author}
          onChange={e => setAuthor(e.target.value)}
          style={{ padding: '9px 12px', fontSize: 13 }}
        />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <select
          value={status}
          onChange={e => setStatus(e.target.value)}
          style={{
            background: 'var(--surface2)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 8,
            color: 'var(--text)',
            padding: '9px 12px',
            fontSize: 13,
            fontFamily: 'inherit',
          }}
        >
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <input
          className="auth-field"
          placeholder="Beleška (opciono)"
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ padding: '9px 12px', fontSize: 13 }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button type="submit" className="auth-submit" disabled={saving || !title.trim()}
          style={{ flex: 1, padding: '9px', fontSize: 13, margin: 0 }}>
          {saving ? '...' : 'Dodaj'}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          style={{ padding: '9px 16px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'var(--text2)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
          Otkaži
        </button>
      </div>
    </form>
  );
}

export default function MojiKursevi() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      setCourses(await getCourses());
    } catch {
      setError('Greška pri učitavanju kurseva.');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(data) {
    const created = await createCourse(data);
    setCourses(prev => [created, ...prev]);
  }

  async function handleStatusChange(id, newStatus) {
    const updated = await updateCourse(id, { status: newStatus });
    setCourses(prev => prev.map(c => c.id === id ? updated : c));
  }

  async function handleDelete(id) {
    if (!confirm('Obrisati ovaj kurs?')) return;
    await deleteCourse(id);
    setCourses(prev => prev.filter(c => c.id !== id));
  }

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
      Učitavam kurseve...
    </div>
  );

  const grouped = STATUS_ORDER.reduce((acc, s) => {
    acc[s] = courses.filter(c => c.status === s);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <AddForm onAdd={handleAdd} />

      {error && <div style={{ color: 'var(--danger, #ff6b6b)', fontSize: 13 }}>{error}</div>}

      {courses.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text2)', fontSize: 13 }}>
          Još uvek nema kurseva. Dodaj prvi! 📚
        </div>
      )}

      {STATUS_ORDER.map(status => {
        const list = grouped[status];
        if (!list.length) return null;
        const cfg = STATUS_CONFIG[status];
        return (
          <div key={status}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: cfg.color }}>
                {cfg.label}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>({list.length})</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {list.map(c => (
                <CourseCard key={c.id} course={c} onStatusChange={handleStatusChange} onDelete={handleDelete} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
