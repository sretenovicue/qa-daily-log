import { useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { secondsToHuman } from '../constants';

function nowYMD() {
  return new Date().toISOString().slice(0, 10);
}
function firstOfMonth() {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth(), 1).toISOString().slice(0, 10);
}

export default function TeamReport() {
  const { t } = useTranslation();
  const {
    teamStats, teamStatsLoading, teamStatsError, fetchTeamStats, currentUser,
  } = useStore();
  const isGuest = currentUser?.role === 'guest';

  const from = teamStats?.from || firstOfMonth();
  const to   = teamStats?.to   || nowYMD();

  useEffect(() => {
    if (!isGuest) fetchTeamStats({ from: firstOfMonth(), to: nowYMD() });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRange = useCallback((e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    fetchTeamStats({ from: fd.get('from'), to: fd.get('to') });
  }, [fetchTeamStats]);

  function exportXLSX() {
    if (!teamStats) return;
    const wb = XLSX.utils.book_new();

    const empRows = teamStats.byEmployee.map(r => ({
      [t('table.name')]:       r.username,
      [t('table.total')]:      Number(r.total),
      'Auto':                  Number(r.auto),
      'Manual':                Number(r.manual),
      [t('table.added')]:      Number(r.added),
      [t('table.updated')]:    Number(r.updated),
      [t('table.duration')]:   r.duration ? secondsToHuman(Number(r.duration)) : '—',
    }));
    const wsEmp = XLSX.utils.json_to_sheet(empRows);
    wsEmp['!cols'] = [{ wch: 20 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsEmp, t('xlsx.byEmployee'));

    const projRows = teamStats.byProject.map(r => ({
      [t('table.project')]:    r.project,
      [t('table.total')]:      Number(r.total),
      'Auto':                  Number(r.auto),
      'Manual':                Number(r.manual),
      [t('table.added')]:      Number(r.added),
      [t('table.updated')]:    Number(r.updated),
      [t('table.duration')]:   r.duration ? secondsToHuman(Number(r.duration)) : '—',
    }));
    const wsProj = XLSX.utils.json_to_sheet(projRows);
    wsProj['!cols'] = [{ wch: 16 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsProj, t('xlsx.byProject'));

    XLSX.writeFile(wb, `qa-tim-${from}-${to}.xlsx`);
  }

  const hdStyle = { background: 'var(--bg2)', fontWeight: 700, fontSize: 12 };

  return (
    <div>
      <form onSubmit={handleRange} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{t('team.from')}</label>
          <input type="date" name="from" defaultValue={firstOfMonth()} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>{t('team.to')}</label>
          <input type="date" name="to" defaultValue={nowYMD()} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isGuest}>{t('team.show')}</button>
        {teamStats && !isGuest && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportXLSX} style={{ marginLeft: 'auto' }}>
            {t('common.xlsx')}
          </button>
        )}
      </form>

      {teamStatsError && (
        <div style={{ background: 'rgba(240,108,108,0.1)', border: '1px solid rgba(240,108,108,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--red)' }}>
          ✕ {teamStatsError}
        </div>
      )}

      {teamStatsLoading ? (
        <div className="empty-state"><span className="emoji">⏳</span>{t('common.loading')}</div>
      ) : teamStats ? (
        <>
          {/* ── By employee ── */}
          <h3 style={{ marginBottom: 10, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>{t('team.byEmployee')}</h3>
          {teamStats.byEmployee.length === 0 ? (
            <div className="empty-state" style={{ marginBottom: 24 }}><span className="emoji">👤</span>{t('team.noData')}</div>
          ) : (
            <div className="entries-table-wrap" style={{ marginBottom: 28 }}>
              <table className="entries-table">
                <thead>
                  <tr style={hdStyle}>
                    <th>{t('table.name')}</th>
                    <th style={{ textAlign: 'right' }}>{t('table.total')}</th>
                    <th style={{ textAlign: 'right' }}>Auto</th>
                    <th style={{ textAlign: 'right' }}>Manual</th>
                    <th style={{ textAlign: 'right' }}>{t('table.added')}</th>
                    <th style={{ textAlign: 'right' }}>{t('table.updated')}</th>
                    <th style={{ textAlign: 'right' }}>{t('table.duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.byEmployee.map(r => (
                    <tr key={r.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{r.username}</div>
                        {r.title && <div style={{ fontSize: 11, color: 'var(--text2)', opacity: 0.7 }}>{r.title}</div>}
                      </td>
                      <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>{r.total}</td>
                      <td style={{ textAlign: 'right' }}>{r.auto}</td>
                      <td style={{ textAlign: 'right' }}>{r.manual}</td>
                      <td style={{ textAlign: 'right' }}>{r.added}</td>
                      <td style={{ textAlign: 'right' }}>{r.updated}</td>
                      <td style={{ textAlign: 'right' }}>{r.duration ? secondsToHuman(Number(r.duration)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── By project ── */}
          <h3 style={{ marginBottom: 10, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>{t('team.byProject')}</h3>
          {teamStats.byProject.length === 0 ? (
            <div className="empty-state"><span className="emoji">🏗</span>{t('team.noData')}</div>
          ) : (
            <div className="entries-table-wrap">
              <table className="entries-table">
                <thead>
                  <tr style={hdStyle}>
                    <th>{t('table.project')}</th>
                    <th style={{ textAlign: 'right' }}>{t('table.total')}</th>
                    <th style={{ textAlign: 'right' }}>Auto</th>
                    <th style={{ textAlign: 'right' }}>Manual</th>
                    <th style={{ textAlign: 'right' }}>{t('table.added')}</th>
                    <th style={{ textAlign: 'right' }}>{t('table.updated')}</th>
                    <th style={{ textAlign: 'right' }}>{t('table.duration')}</th>
                  </tr>
                </thead>
                <tbody>
                  {teamStats.byProject.map(r => (
                    <tr key={r.project}>
                      <td><span className="badge" style={{ background: 'rgba(124,111,247,0.15)', color: 'var(--accent)' }}>{r.project}</span></td>
                      <td style={{ textAlign: 'right', color: 'var(--accent)', fontWeight: 700 }}>{r.total}</td>
                      <td style={{ textAlign: 'right' }}>{r.auto}</td>
                      <td style={{ textAlign: 'right' }}>{r.manual}</td>
                      <td style={{ textAlign: 'right' }}>{r.added}</td>
                      <td style={{ textAlign: 'right' }}>{r.updated}</td>
                      <td style={{ textAlign: 'right' }}>{r.duration ? secondsToHuman(Number(r.duration)) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
