import { useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
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
      'Ime':       r.username,
      'Ukupno':    Number(r.total),
      'Auto':      Number(r.auto),
      'Manual':    Number(r.manual),
      'Dodato':    Number(r.added),
      'Ažurirano': Number(r.updated),
      'Trajanje':  r.duration ? secondsToHuman(Number(r.duration)) : '—',
    }));
    const wsEmp = XLSX.utils.json_to_sheet(empRows);
    wsEmp['!cols'] = [{ wch: 20 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsEmp, 'Po zaposlenom');

    const projRows = teamStats.byProject.map(r => ({
      'Projekat':  r.project,
      'Ukupno':    Number(r.total),
      'Auto':      Number(r.auto),
      'Manual':    Number(r.manual),
      'Dodato':    Number(r.added),
      'Ažurirano': Number(r.updated),
      'Trajanje':  r.duration ? secondsToHuman(Number(r.duration)) : '—',
    }));
    const wsProj = XLSX.utils.json_to_sheet(projRows);
    wsProj['!cols'] = [{ wch: 16 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 9 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsProj, 'Po projektu');

    XLSX.writeFile(wb, `qa-tim-${from}-${to}.xlsx`);
  }

  const hdStyle = { background: 'var(--bg2)', fontWeight: 700, fontSize: 12 };

  return (
    <div>
      <form onSubmit={handleRange} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginBottom: 20, flexWrap: 'wrap' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Od datuma</label>
          <input type="date" name="from" defaultValue={firstOfMonth()} />
        </div>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label>Do datuma</label>
          <input type="date" name="to" defaultValue={nowYMD()} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm" disabled={isGuest}>Prikaži</button>
        {teamStats && !isGuest && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={exportXLSX} style={{ marginLeft: 'auto' }}>
            ⬇ Excel (.xlsx)
          </button>
        )}
      </form>

      {teamStatsError && (
        <div style={{ background: 'rgba(240,108,108,0.1)', border: '1px solid rgba(240,108,108,0.3)', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: 'var(--red)' }}>
          ✕ {teamStatsError}
        </div>
      )}

      {teamStatsLoading ? (
        <div className="empty-state"><span className="emoji">⏳</span>Učitavanje...</div>
      ) : teamStats ? (
        <>
          {/* ── Po zaposlenom ── */}
          <h3 style={{ marginBottom: 10, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Po zaposlenom</h3>
          {teamStats.byEmployee.length === 0 ? (
            <div className="empty-state" style={{ marginBottom: 24 }}><span className="emoji">👤</span>Nema podataka</div>
          ) : (
            <div className="entries-table-wrap" style={{ marginBottom: 28 }}>
              <table className="entries-table">
                <thead>
                  <tr style={hdStyle}>
                    <th>Ime</th>
                    <th style={{ textAlign: 'right' }}>Ukupno</th>
                    <th style={{ textAlign: 'right' }}>Auto</th>
                    <th style={{ textAlign: 'right' }}>Manual</th>
                    <th style={{ textAlign: 'right' }}>Dodato</th>
                    <th style={{ textAlign: 'right' }}>Ažurirano</th>
                    <th style={{ textAlign: 'right' }}>Trajanje</th>
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

          {/* ── Po projektu ── */}
          <h3 style={{ marginBottom: 10, fontSize: 14, color: 'var(--text2)', fontWeight: 600 }}>Po projektu</h3>
          {teamStats.byProject.length === 0 ? (
            <div className="empty-state"><span className="emoji">🏗</span>Nema podataka</div>
          ) : (
            <div className="entries-table-wrap">
              <table className="entries-table">
                <thead>
                  <tr style={hdStyle}>
                    <th>Projekat</th>
                    <th style={{ textAlign: 'right' }}>Ukupno</th>
                    <th style={{ textAlign: 'right' }}>Auto</th>
                    <th style={{ textAlign: 'right' }}>Manual</th>
                    <th style={{ textAlign: 'right' }}>Dodato</th>
                    <th style={{ textAlign: 'right' }}>Ažurirano</th>
                    <th style={{ textAlign: 'right' }}>Trajanje</th>
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
