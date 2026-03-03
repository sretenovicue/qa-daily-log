import { useEffect, useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useStore } from '../store';
import { CATEGORIES, ACTIONS, STATUSES, PROJECTS, secondsToHuman, todayStr } from '../constants';
import EditModal from './EditModal';
import ConfirmDialog from './ConfirmDialog';

export default function DailyLog() {
  const {
    viewDate, setViewDate,
    dailyEntries, dailyLoading, dailyError,
    dailySort, setDailySort,
    dailyProjectFilter, setDailyProjectFilter,
    fetchDailyEntries, removeEntry, editEntry,
    currentUser,
  } = useStore();
  const isManager = currentUser?.role === 'manager';
  const isGuest   = currentUser?.role === 'guest';

  const [editing,   setEditing]   = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  // Initial fetch + re-fetch when viewDate changes
  useEffect(() => { fetchDailyEntries(); }, []);

  const changeDay = useCallback((dir) => {
    const d = new Date(viewDate + 'T12:00:00');
    d.setDate(d.getDate() + dir);
    setViewDate(d.toISOString().slice(0, 10));
  }, [viewDate, setViewDate]);

  const handleDelete = useCallback((id) => {
    setConfirmId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    const id = confirmId;
    setConfirmId(null);
    try { await removeEntry(id); } catch (_) { /* toast shown by store */ }
  }, [confirmId, removeEntry]);

  const handleSave = useCallback(async (id, data) => {
    await editEntry(id, data);
  }, [editEntry]);

  const exportXLSX = useCallback(() => {
    const d = new Date(viewDate + 'T12:00:00');
    const dateStr = d.toLocaleDateString('sr-Latn', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const rows = dailyEntries.map(e => ({
      '#':          e.task_number,
      'Projekat':   e.project || '—',
      'Kategorija': (CATEGORIES[e.category] || CATEGORIES.other).label,
      'Akcija':     ACTIONS[e.action] || e.action,
      'Status':     (STATUSES[e.status] || STATUSES['in-progress']).label,
      'Opis':       e.description || '',
      'Trajanje':   e.duration ? secondsToHuman(e.duration) : '—',
      'Vreme':      e.time,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, dateStr.slice(0, 31));
    XLSX.writeFile(wb, `qa-log-${viewDate}.xlsx`);
  }, [dailyEntries, viewDate]);

  const copyDay = useCallback(() => {
    let txt = `QA LOG — ${viewDate}\n\n`;
    dailyEntries.forEach((e, i) => {
      const cat = CATEGORIES[e.category] || CATEGORIES.other;
      txt += `${i + 1}. [${cat.emoji} ${cat.label}]`;
      if (e.project) txt += ` [${e.project}]`;
      txt += ` ${ACTIONS[e.action] || e.action}`;
      if (e.description) txt += ` — ${e.description}`;
      if (e.duration) txt += ` (${secondsToHuman(e.duration)})`;
      txt += '\n';
    });
    navigator.clipboard.writeText(txt).then(() =>
      useStore.getState().addToast('Kopirano u clipboard!', 'info')
    );
  }, [dailyEntries, viewDate]);

  // Memoized computed values
  const { isToday, dateLabel, totalDur } = useMemo(() => {
    const isToday = viewDate === todayStr();
    const d = new Date(viewDate + 'T12:00:00');
    const dateLabel = (isToday ? 'Danas — ' : '') +
      d.toLocaleDateString('sr-Latn', { weekday: 'long', day: 'numeric', month: 'long' });
    const totalDur = dailyEntries.reduce((s, e) => s + (e.duration || 0), 0);
    return { isToday, dateLabel, totalDur };
  }, [viewDate, dailyEntries]);

  return (
    <div>
      <div className="date-nav">
        <button className="btn btn-ghost btn-sm" onClick={() => changeDay(-1)}>← Prethodni</button>
        <div className="date-label">{dateLabel}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => changeDay(1)}>Sledeći →</button>
      </div>

      <div className="sort-bar">
        <label>Sortiraj:</label>
        <select value={dailySort} onChange={e => setDailySort(e.target.value)}>
          <option value="date-desc">Vreme (najnoviji)</option>
          <option value="date-asc">Vreme (najstariji)</option>
          <option value="category">Kategorija</option>
          <option value="duration">Trajanje</option>
          <option value="status">Status</option>
        </select>
        <label>Projekat:</label>
        <select value={dailyProjectFilter} onChange={e => setDailyProjectFilter(e.target.value)}>
          <option value="">Svi</option>
          {PROJECTS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
        {totalDur > 0 && (
          <span style={{ marginLeft: 'auto', color: 'var(--accent)', fontWeight: 700, fontSize: 13 }}>
            ⏱ {secondsToHuman(totalDur)}
          </span>
        )}
      </div>

      {dailyError && (
        <div style={{
          background: 'rgba(240,108,108,0.1)', border: '1px solid rgba(240,108,108,0.3)',
          borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--red)',
        }}>
          ✕ {dailyError} — <button className="btn btn-sm btn-ghost" onClick={fetchDailyEntries}>Pokušaj ponovo</button>
        </div>
      )}

      {dailyLoading ? (
        <div className="empty-state"><span className="emoji">⏳</span>Učitavanje...</div>
      ) : dailyEntries.length === 0 ? (
        <div className="empty-state"><span className="emoji">📋</span>Nema unosa za ovaj dan</div>
      ) : (
        <div className="entries-table-wrap">
          <table className="entries-table">
            <thead>
              <tr>
                {isManager && <th>Korisnik</th>}
                <th>#</th>
                <th>Projekat</th>
                <th>Tip</th>
                <th>Status</th>
                <th>Opis</th>
                <th>Trajanje</th>
                <th>Vreme</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dailyEntries.map(e => {
                const cat = CATEGORIES[e.category] || CATEGORIES.other;
                const st  = STATUSES[e.status]    || STATUSES['in-progress'];
                return (
                  <tr key={e.id}>
                    {isManager && (
                      <td style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{e.username || '—'}</td>
                    )}
                    <td><span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700 }}>{e.task_number}</span></td>
                    <td>
                      {e.project
                        ? <span className="badge" style={{ background: 'rgba(124,111,247,0.15)', color: 'var(--accent)' }}>{e.project}</span>
                        : <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>
                      }
                    </td>
                    <td>
                      <span className="badge" style={{ background: cat.color + '22', color: cat.color }}>
                        {cat.emoji} {cat.label}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: st.color + '22', color: st.color }}>
                        {st.emoji} {st.label}
                      </span>
                    </td>
                    <td className="entry-desc-cell">
                      <div className="desc-text">
                        {e.description || <span style={{ color: 'var(--text2)' }}>{ACTIONS[e.action] || e.action}</span>}
                      </div>
                      {e.description && (
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                          {ACTIONS[e.action] || e.action}
                        </div>
                      )}
                    </td>
                    <td className="duration-cell">{e.duration ? `⏱ ${secondsToHuman(e.duration)}` : '—'}</td>
                    <td className="time-cell">{e.time}</td>
                    <td>
                      <div className="action-cell">
                        {!isGuest && <button className="btn btn-sm btn-edit" onClick={() => setEditing(e)} title="Izmeni">✏️</button>}
                        {!isGuest && <button className="btn btn-sm btn-danger" onClick={() => handleDelete(e.id)} title="Obriši">🗑</button>}
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
        <button className="btn btn-ghost btn-sm" onClick={exportXLSX}>⬇ Excel (.xlsx)</button>
        <button className="btn btn-ghost btn-sm" onClick={copyDay}>📋 Kopiraj dan</button>
      </div>

      {editing && (
        <EditModal entry={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}

      {confirmId && (
        <ConfirmDialog
          message="Obrisati ovaj unos?"
          onConfirm={confirmDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
