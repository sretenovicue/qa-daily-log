import { useEffect, useState } from 'react';
import { useStore } from '../store';
import Avatar from './Avatar';
import { getTitle } from '../userProfiles';

const ROLE_LABELS = { manager: 'Manager', user: 'Korisnik' };

export default function UsersPanel() {
  const {
    users, usersLoading, usersError, fetchUsers, createUser, toggleUser, approveUser,
    currentUser, addToast,
  } = useStore();
  const isGuest = currentUser?.role === 'guest';

  const [form, setForm] = useState({ email: '', username: '', password: '', role: 'user' });
  const [formError,   setFormError]   = useState('');
  const [formLoading, setFormLoading] = useState('');

  useEffect(() => { if (!isGuest) fetchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(user) {
    try {
      const updated = await toggleUser(user.id);
      addToast(`${updated.username} ${updated.active ? 'aktiviran' : 'deaktiviran'}`, 'info');
    } catch (err) {
      addToast(parseError(err), 'error');
    }
  }

  async function handleApprove(user) {
    try {
      const updated = await approveUser(user.id);
      addToast(`${updated.username} odobren ✓`, 'success');
    } catch (err) {
      addToast(parseError(err), 'error');
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setFormError('');
    setFormLoading(true);
    try {
      await createUser(form);
      setForm({ email: '', username: '', password: '', role: 'user' });
      addToast('Korisnik kreiran ✓', 'success');
    } catch (err) {
      setFormError(parseError(err));
    } finally {
      setFormLoading(false);
    }
  }

  function parseError(err) {
    try { return JSON.parse(err.message).error || err.message; } catch { return err.message; }
  }

  return (
    <div>
      {/* ── User table ── */}
      <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Korisnici</h3>

      {usersError && (
        <div style={{ background: 'rgba(240,108,108,0.1)', border: '1px solid rgba(240,108,108,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--red)' }}>
          ✕ {usersError}
        </div>
      )}

      {usersLoading ? (
        <div className="empty-state"><span className="emoji">⏳</span>Učitavanje...</div>
      ) : (
        <div className="entries-table-wrap" style={{ marginBottom: 32 }}>
          <table className="entries-table">
            <thead>
              <tr>
                <th></th>
                <th>Email</th>
                <th>Ime</th>
                <th>Uloga</th>
                <th>Odobrenje</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ width: 40 }}><Avatar username={u.username} avatarData={u.avatar_data} size={30} /></td>
                  <td style={{ fontSize: 12 }}>{u.email}</td>
                  <td>
                    <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{u.username}</div>
                    {getTitle(u.username) && (
                      <div style={{ fontSize: 11, color: 'var(--text2)', opacity: 0.7 }}>{getTitle(u.username)}</div>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: u.role === 'manager' ? 'rgba(124,111,247,0.2)' : 'rgba(255,255,255,0.06)',
                      color:      u.role === 'manager' ? 'var(--accent)' : 'var(--text2)',
                    }}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: u.approved !== false ? 'rgba(72,199,142,0.15)' : 'rgba(255,193,7,0.15)',
                      color:      u.approved !== false ? 'var(--green)' : '#f0a500',
                    }}>
                      {u.approved !== false ? 'Odobren' : 'Na čekanju'}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: u.active !== false ? 'rgba(72,199,142,0.15)' : 'rgba(240,108,108,0.15)',
                      color:      u.active !== false ? 'var(--green)' : 'var(--red)',
                    }}>
                      {u.active !== false ? 'Aktivan' : 'Neaktivan'}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    {!isGuest && u.approved === false && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleApprove(u)}
                        title="Odobri korisnika"
                      >
                        Odobri
                      </button>
                    )}
                    {!isGuest && u.id !== currentUser?.id && !['admin', 'guest'].includes(u.username) && (
                      <button
                        className={`btn btn-sm ${u.active !== false ? 'btn-danger' : 'btn-edit'}`}
                        onClick={() => handleToggle(u)}
                        title={u.active !== false ? 'Deaktiviraj' : 'Aktiviraj'}
                      >
                        {u.active !== false ? 'Deaktiviraj' : 'Aktiviraj'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Add user form ── */}
      {!isGuest && (
      <>
      <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Dodaj korisnika</h3>
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
          <label>Email</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
            placeholder="ime@kompanija.com"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
          <label>Korisničko ime</label>
          <input
            type="text"
            required
            value={form.username}
            onChange={e => setForm(s => ({ ...s, username: e.target.value }))}
            placeholder="Ime Prezime"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
          <label>Lozinka</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
            placeholder="min 8 znakova"
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 120 }}>
          <label>Uloga</label>
          <select value={form.role} onChange={e => setForm(s => ({ ...s, role: e.target.value }))}>
            <option value="user">Korisnik</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={formLoading}>
          {formLoading ? 'Kreiranje...' : '+ Dodaj'}
        </button>
      </form>
      {formError && (
        <div style={{ marginTop: 8, fontSize: 13, color: 'var(--red)' }}>✕ {formError}</div>
      )}
      </>
      )}
    </div>
  );
}
