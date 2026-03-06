import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { getEntries } from '../api';
import { useStore } from '../store';
import { CATEGORIES, ACTIONS, STATUSES, PROJECTS, secondsToHuman, todayStr } from '../constants';
import EditModal from './EditModal';
import ConfirmDialog from './ConfirmDialog';

export default function PeriodView() {
  const { t } = useTranslation();
  const now      = new Date();
  const pad      = n => String(n).padStart(2, '0');
  const firstDay = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-01`;

  const [from,          setFrom]   = useState(firstDay);
  const [to,            setTo]     = useState(todayStr());
  const [catFilter,     setCat]    = useState('all');
  const [statusFilter,  setSt]     = useState('all');
  const [projectFilter, setPF]     = useState('all');
  const [sort,          setSort]   = useState('date-desc');
  const [entries,       setEntries] = useState([]);
  const [loading,       setLoading] = useState(false);
  const [error,         setError]   = useState(null);
  const [editing,   setEditing]   = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const { editEntry, removeEntry, currentUser } = useStore();
  const isGuest = currentUser?.role === 'guest';
  const isManager = currentUser?.role === 'manager';

  const fetchEntries = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const params = { from, to, sort };
      if (catFilter    !== 'all') params.category = catFilter;
      if (statusFilter !== 'all') params.status   = statusFilter;
      if (projectFilter !== 'all') params.project  = projectFilter;
      const data = await getEntries(params);
      setEntries(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to, catFilter, statusFilter, projectFilter, sort]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  function localDateStr(d) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function setPeriodQuick(days) {
    const toD = new Date(); const fromD = new Date();
    fromD.setDate(fromD.getDate() - days + 1);
    setFrom(localDateStr(fromD));
    setTo(localDateStr(toD));
  }

  function setPeriodThisMonth() {
    const n = new Date();
    setFrom(`${n.getFullYear()}-${pad(n.getMonth() + 1)}-01`);
    setTo(localDateStr(n));
  }

  const handleDelete = useCallback((id) => {
    setConfirmId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    const id = confirmId;
    setConfirmId(null);
    await removeEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, [confirmId, removeEntry]);

  const handleSave = useCallback(async (id, data) => {
    const updated = await editEntry(id, data);
    setEntries(prev => prev.map(e => e.id === id ? updated : e));
  }, [editEntry]);

  function exportXLSX() {
    const rows = entries.map(e => ({
      [t('xlsx.date')]:        e.date,
      [t('xlsx.time')]:        e.time,
      [t('xlsx.num')]:         e.task_number,
      [t('xlsx.project')]:     e.project || '—',
      [t('xlsx.category')]:    t(`categories.${e.category}`, (CATEGORIES[e.category] || CATEGORIES.other).label),
      [t('xlsx.action')]:      t(`actions.${e.action}`, ACTIONS[e.action] || e.action),
      [t('xlsx.status')]:      t(`statuses.${e.status}`, (STATUSES[e.status] || STATUSES['in-progress']).label),
      [t('xlsx.description')]: e.description || '',
      [t('xlsx.duration')]:    e.duration ? secondsToHuman(e.duration) : '—',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${from} — ${to}`);
    XLSX.writeFile(wb, `qa-period-${from}-${to}.xlsx`);
  }

  function copyPeriod() {
    let txt = `QA LOG — Period: ${from} — ${to}\n\n`;
    entries.forEach((e, i) => {
      const cat = CATEGORIES[e.category] || CATEGORIES.other;
      txt += `${i + 1}. [${e.date} ${e.time}] [${cat.emoji} ${t(`categories.${e.category}`, cat.label)}]`;
      if (e.project) txt += ` [${e.project}]`;
      txt += ` ${t(`actions.${e.action}`, ACTIONS[e.action] || e.action)}`;
      if (e.description) txt += ` — ${e.description}`;
      if (e.duration) txt += ` (${secondsToHuman(e.duration)})`;
      txt += '\n';
    });
    navigator.clipboard.writeText(txt).then(() =>
      useStore.getState().addToast(t('common.copied'), 'info')
    );
  }

  const { totalDur, totalDays, catCount } = useMemo(() => ({
    totalDur:  entries.reduce((s, e) => s + (e.duration || 0), 0),
    totalDays: new Set(entries.map(e => e.date)).size,
    catCount:  entries.reduce((acc, e) => { acc[e.category] = (acc[e.category] || 0) + 1; return acc; }, {}),
  }), [entries]);

  return (
    <div>
      <div className="period-controls">
        <div className="form-group">
          <label htmlFor="period-from">{t('period.from')}</label>
          <input id="period-from" type="date" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="period-to">{t('period.to')}</label>
          <input id="period-to" type="date" value={to} onChange={e => setTo(e.target.value)} />
        </div>
        <div className="form-group" style={{ minWidth: 'auto' }}>
          <label htmlFor="period-project">{t('form.project')}</label>
          <select id="period-project" value={projectFilter} onChange={e => setPF(e.target.value)}>
            <option value="all">{t('form.all')}</option>
            {PROJECTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 'auto' }}>
          <label htmlFor="period-category">{t('form.category')}</label>
          <select id="period-category" value={catFilter} onChange={e => setCat(e.target.value)}>
            <option value="all">{t('form.allF')}</option>
            {Object.keys(CATEGORIES).map(k => (
              <option key={k} value={k}>{CATEGORIES[k].emoji} {t(`categories.${k}`, CATEGORIES[k].label)}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 'auto' }}>
          <label htmlFor="period-status">{t('form.status')}</label>
          <select id="period-status" value={statusFilter} onChange={e => setSt(e.target.value)}>
            <option value="all">{t('form.all')}</option>
            {Object.keys(STATUSES).map(k => (
              <option key={k} value={k}>{STATUSES[k].emoji} {t(`statuses.${k}`, STATUSES[k].label)}</option>
            ))}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 'auto' }}>
          <label htmlFor="period-sort">{t('sort.label').replace(':', '')}</label>
          <select id="period-sort" value={sort} onChange={e => setSort(e.target.value)}>
            <option value="date-desc">{t('sort.dateDescLong')}</option>
            <option value="date-asc">{t('sort.dateAscLong')}</option>
            <option value="category">{t('sort.category')}</option>
            <option value="duration">{t('sort.duration')}</option>
            <option value="status">{t('sort.status')}</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setPeriodQuick(7)}>{t('period.last7')}</button>
        <button className="btn btn-ghost btn-sm" onClick={() => setPeriodQuick(30)}>{t('period.last30')}</button>
        <button className="btn btn-ghost btn-sm" onClick={setPeriodThisMonth}>{t('period.thisMonth')}</button>
      </div>

      {error && (
        <div style={{ background: 'rgba(240,108,108,0.1)', border: '1px solid rgba(240,108,108,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--red)' }}>
          ✕ {error}
        </div>
      )}

      {entries.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 12 }}>
            <div className="stat-card"><div className="stat-number" style={{ color: 'var(--accent)' }}>{entries.length}</div><div className="stat-label">{t('period.entries')}</div></div>
            <div className="stat-card"><div className="stat-number" style={{ color: 'var(--green)' }}>{totalDays}</div><div className="stat-label">{t('period.days')}</div></div>
            <div className="stat-card"><div className="stat-number" style={{ color: 'var(--yellow)', fontSize: 18 }}>{totalDur ? secondsToHuman(totalDur) : '—'}</div><div className="stat-label">{t('period.totalTime')}</div></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(catCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cat, cnt]) => {
              const c = CATEGORIES[cat] || CATEGORIES.other;
              return <span key={cat} className="badge" style={{ background: c.color + '22', color: c.color, padding: '4px 10px' }}>{c.emoji} {t(`categories.${cat}`, c.label)}: {cnt}</span>;
            })}
          </div>
        </div>
      )}

      {loading ? (
        <div className="empty-state"><span className="emoji">⏳</span>{t('common.loading')}</div>
      ) : entries.length === 0 ? (
        <div className="empty-state"><span className="emoji">📋</span>{t('period.noEntries')}</div>
      ) : (
        <div className="entries-table-wrap">
          <table className="entries-table">
            <thead>
              <tr>
                {isManager && <th>{t('table.user')}</th>}
                <th>{t('table.date')}</th>
                <th>{t('table.num')}</th>
                <th>{t('table.project')}</th>
                <th>{t('table.type')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.description')}</th>
                <th>{t('table.duration')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {entries.map(e => {
                const cat = CATEGORIES[e.category] || CATEGORIES.other;
                const st  = STATUSES[e.status]    || STATUSES['in-progress'];
                const catLabel = t(`categories.${e.category}`, cat.label);
                const stLabel  = t(`statuses.${e.status}`, st.label);
                const actLabel = t(`actions.${e.action}`, ACTIONS[e.action] || e.action);
                return (
                  <tr key={e.id}>
                    {isManager && (
                      <td style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{e.username || '—'}</td>
                    )}
                    <td className="date-cell">{e.date}<br /><span style={{ color: 'var(--text2)', fontWeight: 400 }}>{e.time}</span></td>
                    <td><span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700 }}>{e.task_number}</span></td>
                    <td>{e.project ? <span className="badge" style={{ background: 'rgba(124,111,247,0.15)', color: 'var(--accent)' }}>{e.project}</span> : <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>}</td>
                    <td><span className="badge" style={{ background: cat.color + '22', color: cat.color }}>{cat.emoji} {catLabel}</span></td>
                    <td><span className="badge" style={{ background: st.color + '22', color: st.color }}>{st.emoji} {stLabel}</span></td>
                    <td className="entry-desc-cell">
                      <div className="desc-text">{e.description || <span style={{ color: 'var(--text2)' }}>{actLabel}</span>}</div>
                      {e.description && <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>{actLabel}</div>}
                    </td>
                    <td className="duration-cell">{e.duration ? `⏱ ${secondsToHuman(e.duration)}` : '—'}</td>
                    <td>
                      <div className="action-cell">
                        {!isGuest && <button className="btn btn-sm btn-edit" onClick={() => setEditing(e)}>✏️</button>}
                        {!isGuest && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e.id)}>🗑</button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="export-section">
        <button className="btn btn-ghost btn-sm" onClick={exportXLSX} disabled={isGuest}>{t('common.xlsx')}</button>
        <button className="btn btn-ghost btn-sm" onClick={copyPeriod} disabled={isGuest}>{t('period.copy')}</button>
      </div>

      {editing && <EditModal entry={editing} onSave={handleSave} onClose={() => setEditing(null)} />}

      {confirmId && (
        <ConfirmDialog
          message={t('entry.deleteConfirm')}
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
