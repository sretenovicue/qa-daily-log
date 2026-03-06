import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import Avatar from './Avatar';

function TitleCell({ user, isGuest }) {
  const { t } = useTranslation();
  const { setUserTitle, addToast } = useStore();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(user.title || '');

  async function save() {
    setEditing(false);
    const newTitle = value.trim();
    if (newTitle === (user.title || '')) return;
    try {
      await setUserTitle(user.id, newTitle);
    } catch {
      addToast(t('users.titleSaveError'), 'error');
      setValue(user.title || '');
    }
  }

  if (isGuest) {
    return <div style={{ fontSize: 11, color: 'var(--text2)', opacity: 0.7 }}>{user.title || ''}</div>;
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={save}
        onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setEditing(false); setValue(user.title || ''); } }}
        style={{
          fontSize: 11, background: 'var(--surface2)', border: '1px solid var(--accent)',
          borderRadius: 4, padding: '2px 6px', color: 'var(--text)', outline: 'none', width: 140,
        }}
      />
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      title={t('users.titleClickHint')}
      style={{ fontSize: 11, color: 'var(--text2)', opacity: 0.7, cursor: 'pointer', minHeight: 14 }}
    >
      {user.title || <span style={{ opacity: 0.35, fontStyle: 'italic' }}>{t('users.titlePlaceholder')}</span>}
    </div>
  );
}

export default function UsersPanel() {
  const { t } = useTranslation();
  const {
    users, usersLoading, usersError, fetchUsers, createUser, toggleUser, approveUser,
    changeUserRole, currentUser, addToast,
  } = useStore();
  const isGuest = currentUser?.role === 'guest';

  const [form, setForm] = useState({ email: '', username: '', password: '', role: 'user' });
  const [formError,   setFormError]   = useState('');
  const [formLoading, setFormLoading] = useState('');

  useEffect(() => { if (!isGuest) fetchUsers(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(user) {
    try {
      const updated = await toggleUser(user.id);
      addToast(`${updated.username} ${updated.active ? t('users.activated') : t('users.deactivated')}`, 'info');
    } catch (err) {
      addToast(parseError(err), 'error');
    }
  }

  async function handleApprove(user) {
    try {
      const updated = await approveUser(user.id);
      addToast(`${updated.username} ${t('users.approvedSuccess')}`, 'success');
    } catch (err) {
      addToast(parseError(err), 'error');
    }
  }

  async function handleRoleChange(user, newRole) {
    try {
      const updated = await changeUserRole(user.id, newRole);
      addToast(`${updated.username} → ${newRole === 'manager' ? t('users.roleManager') : t('users.roleUser')}`, 'info');
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
      addToast(t('users.created'), 'success');
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
      <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>{t('users.title')}</h3>

      {usersError && (
        <div style={{ background: 'rgba(240,108,108,0.1)', border: '1px solid rgba(240,108,108,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--red)' }}>
          ✕ {usersError}
        </div>
      )}

      {usersLoading ? (
        <div className="empty-state"><span className="emoji">⏳</span>{t('common.loading')}</div>
      ) : (
        <div className="entries-table-wrap" style={{ marginBottom: 32 }}>
          <table className="entries-table">
            <thead>
              <tr>
                <th></th>
                <th>{t('users.email')}</th>
                <th>{t('users.name')}</th>
                <th>{t('users.role')}</th>
                <th>{t('users.approval')}</th>
                <th>{t('users.status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id}>
                  <td style={{ width: 40 }}><Avatar username={u.username} avatarData={u.avatar_data} size={30} /></td>
                  <td style={{ fontSize: 12 }}>
                    <div>{u.email}</div>
                    <TitleCell user={u} isGuest={isGuest} />
                  </td>
                  <td style={{ fontWeight: 600 }}>{u.username}</td>
                  <td>
                    {!isGuest && u.id !== currentUser?.id && !['admin', 'guest'].includes(u.username) ? (
                      <button
                        className="badge"
                        onClick={() => handleRoleChange(u, u.role === 'manager' ? 'user' : 'manager')}
                        title={u.role === 'manager' ? t('users.demoteToUser') : t('users.promoteToManager')}
                        style={{
                          background: u.role === 'manager' ? 'rgba(124,111,247,0.2)' : 'rgba(255,255,255,0.06)',
                          color:      u.role === 'manager' ? 'var(--accent)' : 'var(--text2)',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        {u.role === 'manager' ? t('users.roleManager') : t('users.roleUser')}
                      </button>
                    ) : (
                      <span className="badge" style={{
                        background: u.role === 'manager' ? 'rgba(124,111,247,0.2)' : 'rgba(255,255,255,0.06)',
                        color:      u.role === 'manager' ? 'var(--accent)' : 'var(--text2)',
                      }}>
                        {u.role === 'manager' ? t('users.roleManager') : t('users.roleUser')}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: u.approved !== false ? 'rgba(72,199,142,0.15)' : 'rgba(255,193,7,0.15)',
                      color:      u.approved !== false ? 'var(--green)' : '#f0a500',
                    }}>
                      {u.approved !== false ? t('users.approved') : t('users.pending')}
                    </span>
                  </td>
                  <td>
                    <span className="badge" style={{
                      background: u.active !== false ? 'rgba(72,199,142,0.15)' : 'rgba(240,108,108,0.15)',
                      color:      u.active !== false ? 'var(--green)' : 'var(--red)',
                    }}>
                      {u.active !== false ? t('users.active') : t('users.inactive')}
                    </span>
                  </td>
                  <td style={{ display: 'flex', gap: 6 }}>
                    {!isGuest && u.approved === false && (
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleApprove(u)}
                        title={t('users.approveTitle')}
                      >
                        {t('users.approve')}
                      </button>
                    )}
                    {!isGuest && u.id !== currentUser?.id && !['admin', 'guest'].includes(u.username) && (
                      <button
                        className={`btn btn-sm ${u.active !== false ? 'btn-danger' : 'btn-edit'}`}
                        onClick={() => handleToggle(u)}
                        title={u.active !== false ? t('users.deactivate') : t('users.activate')}
                      >
                        {u.active !== false ? t('users.deactivate') : t('users.activate')}
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
      <h3 style={{ marginBottom: 12, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>{t('users.addTitle')}</h3>
      <form onSubmit={handleCreate} style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 180 }}>
          <label>{t('users.email')}</label>
          <input
            type="email"
            required
            value={form.email}
            onChange={e => setForm(s => ({ ...s, email: e.target.value }))}
            placeholder={t('users.emailPlaceholder')}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
          <label>{t('users.name')}</label>
          <input
            type="text"
            required
            value={form.username}
            onChange={e => setForm(s => ({ ...s, username: e.target.value }))}
            placeholder={t('users.usernamePlaceholder')}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 140 }}>
          <label>{t('auth.password')}</label>
          <input
            type="password"
            required
            minLength={8}
            value={form.password}
            onChange={e => setForm(s => ({ ...s, password: e.target.value }))}
            placeholder={t('users.passwordPlaceholder')}
          />
        </div>
        <div className="form-group" style={{ marginBottom: 0, minWidth: 120 }}>
          <label>{t('users.role')}</label>
          <select value={form.role} onChange={e => setForm(s => ({ ...s, role: e.target.value }))}>
            <option value="user">{t('users.roleUser')}</option>
            <option value="manager">{t('users.roleManager')}</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={formLoading}>
          {formLoading ? t('users.creating') : t('users.addBtn')}
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
