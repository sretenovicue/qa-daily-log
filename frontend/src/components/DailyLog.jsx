import { useEffect, useCallback, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { CATEGORIES, ACTIONS, STATUSES, PROJECTS, secondsToHuman, todayStr } from '../constants';
import EditModal from './EditModal';
import ConfirmDialog from './ConfirmDialog';

export default function DailyLog() {
  const { t, i18n } = useTranslation();
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
  const canEdit   = (e) => isManager || (!isGuest && e.user_id === currentUser?.id);

  const [editing,   setEditing]   = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const dateLocale = i18n.language === 'sr' ? 'sr-Latn' : 'en-GB';

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
    const dateStr = d.toLocaleDateString(dateLocale, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const rows = dailyEntries.map(e => ({
      [t('xlsx.num')]:         e.task_number,
      [t('xlsx.project')]:     e.project || '—',
      [t('xlsx.category')]:    t(`categories.${e.category}`, (CATEGORIES[e.category] || CATEGORIES.other).label),
      [t('xlsx.action')]:      t(`actions.${e.action}`, ACTIONS[e.action] || e.action),
      [t('xlsx.status')]:      t(`statuses.${e.status}`, (STATUSES[e.status] || STATUSES['in-progress']).label),
      [t('xlsx.description')]: e.description || '',
      [t('xlsx.duration')]:    e.duration ? secondsToHuman(e.duration) : '—',
      [t('xlsx.time')]:        e.time,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 40 }, { wch: 10 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, dateStr.slice(0, 31));
    XLSX.writeFile(wb, `qa-log-${viewDate}.xlsx`);
  }, [dailyEntries, viewDate, t, dateLocale]);

  const copyDay = useCallback(() => {
    let txt = `QA LOG — ${viewDate}\n\n`;
    dailyEntries.forEach((e, i) => {
      const cat = CATEGORIES[e.category] || CATEGORIES.other;
      txt += `${i + 1}. [${cat.emoji} ${t(`categories.${e.category}`, cat.label)}]`;
      if (e.project) txt += ` [${e.project}]`;
      txt += ` ${t(`actions.${e.action}`, ACTIONS[e.action] || e.action)}`;
      if (e.description) txt += ` — ${e.description}`;
      if (e.duration) txt += ` (${secondsToHuman(e.duration)})`;
      txt += '\n';
    });
    navigator.clipboard.writeText(txt).then(() =>
      useStore.getState().addToast(t('common.copied'), 'info')
    );
  }, [dailyEntries, viewDate, t]);

  // Memoized computed values
  const { isToday, dateLabel, totalDur } = useMemo(() => {
    const isToday = viewDate === todayStr();
    const d = new Date(viewDate + 'T12:00:00');
    const dateLabel = (isToday ? t('nav2.today') + ' — ' : '') +
      d.toLocaleDateString(dateLocale, { weekday: 'long', day: 'numeric', month: 'long' });
    const totalDur = dailyEntries.reduce((s, e) => s + (e.duration || 0), 0);
    return { isToday, dateLabel, totalDur };
  }, [viewDate, dailyEntries, i18n.language, dateLocale, t]);

  return (
    <div>
      <div className="date-nav">
        <button className="btn btn-ghost btn-sm" onClick={() => changeDay(-1)}>{t('nav2.prev')}</button>
        <div className="date-label">{dateLabel}</div>
        <button className="btn btn-ghost btn-sm" onClick={() => changeDay(1)}>{t('nav2.next')}</button>
      </div>

      <div className="sort-bar">
        <label>{t('sort.label')}</label>
        <select value={dailySort} onChange={e => setDailySort(e.target.value)}>
          <option value="date-desc">{t('sort.dateDesc')}</option>
          <option value="date-asc">{t('sort.dateAsc')}</option>
          <option value="category">{t('sort.category')}</option>
          <option value="duration">{t('sort.duration')}</option>
          <option value="status">{t('sort.status')}</option>
        </select>
        <label>{t('sort.project')}</label>
        <select value={dailyProjectFilter} onChange={e => setDailyProjectFilter(e.target.value)}>
          <option value="">{t('form.all')}</option>
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
          ✕ {dailyError} — <button className="btn btn-sm btn-ghost" onClick={fetchDailyEntries}>{t('common.retry')}</button>
        </div>
      )}

      {dailyLoading ? (
        <div className="empty-state"><span className="emoji">⏳</span>{t('common.loading')}</div>
      ) : dailyEntries.length === 0 ? (
        <div className="empty-state"><span className="emoji">📋</span>{t('common.noDailyEntries')}</div>
      ) : (
        <div className="entries-table-wrap">
          <table className="entries-table">
            <thead>
              <tr>
                <th>{t('table.user')}</th>
                <th>{t('table.num')}</th>
                <th>{t('table.project')}</th>
                <th>{t('table.type')}</th>
                <th>{t('table.status')}</th>
                <th>{t('table.description')}</th>
                <th>{t('table.duration')}</th>
                <th>{t('table.time')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dailyEntries.map(e => {
                const cat = CATEGORIES[e.category] || CATEGORIES.other;
                const st  = STATUSES[e.status]    || STATUSES['in-progress'];
                const catLabel = t(`categories.${e.category}`, cat.label);
                const stLabel  = t(`statuses.${e.status}`, st.label);
                const actLabel = t(`actions.${e.action}`, ACTIONS[e.action] || e.action);
                return (
                  <tr key={e.id}>
                    <td style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap' }}>{e.username || '—'}</td>
                    <td><span style={{ fontSize: 10, color: 'var(--text2)', fontWeight: 700 }}>{e.task_number}</span></td>
                    <td>
                      {e.project
                        ? <span className="badge" style={{ background: 'rgba(124,111,247,0.15)', color: 'var(--accent)' }}>{e.project}</span>
                        : <span style={{ color: 'var(--text2)', fontSize: 11 }}>—</span>
                      }
                    </td>
                    <td>
                      <span className="badge" style={{ background: cat.color + '22', color: cat.color }}>
                        {cat.emoji} {catLabel}
                      </span>
                    </td>
                    <td>
                      <span className="badge" style={{ background: st.color + '22', color: st.color }}>
                        {st.emoji} {stLabel}
                      </span>
                    </td>
                    <td className="entry-desc-cell">
                      <div className="desc-text" data-full={e.description || actLabel}>
                        {e.description || <span style={{ color: 'var(--text2)' }}>{actLabel}</span>}
                      </div>
                      {e.description && (
                        <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 2 }}>
                          {actLabel}
                        </div>
                      )}
                    </td>
                    <td className="duration-cell">{e.duration ? `⏱ ${secondsToHuman(e.duration)}` : '—'}</td>
                    <td className="time-cell">{e.time}</td>
                    <td>
                      <div className="action-cell">
                        {canEdit(e) && (
                          <button
                            className="btn btn-sm btn-edit"
                            onClick={() => setEditing(e)}
                            title={t('entry.editBtnTitle')}
                          >✏️</button>
                        )}
                        {canEdit(e) && (
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(e.id)}
                            title={t('entry.deleteBtnTitle')}
                          >🗑</button>
                        )}
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
        <button className="btn btn-ghost btn-sm" onClick={copyDay} disabled={isGuest}>{t('common.copyDay')}</button>
      </div>

      {editing && (
        <EditModal entry={editing} onSave={handleSave} onClose={() => setEditing(null)} />
      )}

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
