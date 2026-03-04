import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { getStats, getEntries } from '../api';
import { useStore } from '../store';
import { CATEGORIES, PROJECTS, secondsToHuman } from '../constants';

const MONTHS = [
  'Januar', 'Februar', 'Mart', 'April', 'Maj', 'Jun',
  'Jul', 'Avgust', 'Septembar', 'Oktobar', 'Novembar', 'Decembar',
];

// Map categories to spreadsheet-like column groups
const COL_DEFS = [
  { key: 'manual',        label: 'Manual TC',        short: 'Manual' },
  { key: 'auto',          label: 'Auto testovi',      short: 'Auto' },
  { key: 'postman',       label: 'API testovi',       short: 'API' },
  { key: 'regression',    label: 'Regresija',         short: 'Reg.' },
  { key: 'bug',           label: 'Bugovi',            short: 'Bug' },
];

export default function ProjectsView({ refresh }) {
  const now  = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [data,  setData]  = useState([]);
  const [loading, setLoading] = useState(false);
  const { currentUser } = useStore();
  const isGuest = currentUser?.role === 'guest';

  useEffect(() => { fetchData(); }, [year, month, refresh]);

  async function fetchData() {
    setLoading(true);
    try {
      const from = `${year}-${String(month + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month + 1, 0).getDate();
      const to   = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`;
      const entries = await getEntries({ from, to });
      setData(entries);
    } finally {
      setLoading(false);
    }
  }

  // Build matrix: project → category → count
  const matrix = {};
  const totals = {};
  PROJECTS.forEach(p => { matrix[p.value] = {}; });
  matrix[''] = {}; // "no project" bucket

  data.forEach(e => {
    const proj = e.project || '';
    if (!matrix[proj]) matrix[proj] = {};
    matrix[proj][e.category] = (matrix[proj][e.category] || 0) + 1;
    totals[e.category] = (totals[e.category] || 0) + 1;
  });

  const projectsWithData = PROJECTS.filter(p => {
    const m = matrix[p.value] || {};
    return Object.values(m).some(v => v > 0);
  });

  const noProjectCount = Object.values(matrix[''] || {}).reduce((s, v) => s + v, 0);

  function exportXLSX() {
    const monthLabel = `${MONTHS[month]} ${year}`;
    const headers = ['Projekat', ...COL_DEFS.map(c => c.label), 'Ukupno'];
    const rows = PROJECTS.map(p => {
      const m = matrix[p.value] || {};
      const total = Object.values(m).reduce((s, v) => s + v, 0);
      return [p.label, ...COL_DEFS.map(c => m[c.key] || 0), total];
    });
    const totalRow = ['TOTAL', ...COL_DEFS.map(c => totals[c.key] || 0), data.length];
    rows.push(totalRow);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = [{ wch: 16 }, ...COL_DEFS.map(() => ({ wch: 12 })), { wch: 10 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, monthLabel);
    XLSX.writeFile(wb, `qa-projekti-${year}-${String(month + 1).padStart(2, '0')}.xlsx`);
  }

  const monthLabel = `${MONTHS[month]} ${year}`;

  return (
    <div>
      <div className="sort-bar" style={{ marginBottom: 20 }}>
        <label>Mesec:</label>
        <select value={month} onChange={e => setMonth(Number(e.target.value))}>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <label>Godina:</label>
        <input
          type="number" value={year}
          onChange={e => setYear(Number(e.target.value))}
          style={{ width: 80 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>📅 {monthLabel}</div>
        <div style={{ color: 'var(--text2)', fontSize: 12 }}>{data.length} unosa ukupno</div>
      </div>

      {loading ? (
        <div className="empty-state"><span className="emoji">⏳</span>Učitavanje...</div>
      ) : (
        <>
          <div className="entries-table-wrap" style={{ marginBottom: 24 }}>
            <table className="entries-table">
              <thead>
                <tr>
                  <th>Projekat</th>
                  {COL_DEFS.map(c => (
                    <th key={c.key} title={c.label}>{c.short}</th>
                  ))}
                  <th>Ukupno</th>
                </tr>
              </thead>
              <tbody>
                {PROJECTS.map(p => {
                  const m     = matrix[p.value] || {};
                  const total = Object.values(m).reduce((s, v) => s + v, 0);
                  return (
                    <tr key={p.value} style={total === 0 ? { opacity: 0.45 } : {}}>
                      <td style={{ fontWeight: 600 }}>{p.label}</td>
                      {COL_DEFS.map(c => (
                        <td key={c.key} style={{ textAlign: 'right' }}>
                          {m[c.key]
                            ? <span style={{ color: CATEGORIES[c.key]?.color, fontWeight: 700 }}>{m[c.key]}</span>
                            : <span style={{ color: 'var(--text2)' }}>—</span>
                          }
                        </td>
                      ))}
                      <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                        {total || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: '2px solid var(--border)' }}>
                  <td style={{ fontWeight: 700, color: 'var(--text2)' }}>TOTAL</td>
                  {COL_DEFS.map(c => (
                    <td key={c.key} style={{ textAlign: 'right', fontWeight: 700 }}>
                      {totals[c.key] || 0}
                    </td>
                  ))}
                  <td style={{ textAlign: 'right', fontWeight: 700, color: 'var(--accent)' }}>
                    {data.length}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Per-project breakdown bars */}
          {projectsWithData.length > 0 && (
            <>
              <div className="card-title" style={{ marginBottom: 12 }}>Aktivnost po projektima</div>
              {projectsWithData.map(p => {
                const m     = matrix[p.value] || {};
                const total = Object.values(m).reduce((s, v) => s + v, 0);
                const maxTotal = Math.max(...PROJECTS.map(pp => Object.values(matrix[pp.value] || {}).reduce((s,v) => s+v, 0)), 1);
                return (
                  <div key={p.value} className="cat-row">
                    <span style={{ minWidth: 120, fontWeight: 600 }}>{p.label}</span>
                    <div className="cat-bar-wrap">
                      <div className="cat-bar" style={{ width: `${Math.round(total / maxTotal * 100)}%`, background: 'var(--accent)' }} />
                    </div>
                    <span className="cat-count">{total}</span>
                    <div style={{ display: 'flex', gap: 6, marginLeft: 8 }}>
                      {Object.entries(m).sort((a, b) => b[1] - a[1]).map(([cat, cnt]) => {
                        const c = CATEGORIES[cat] || CATEGORIES.other;
                        return (
                          <span key={cat} className="badge" style={{ background: c.color + '22', color: c.color }}>
                            {c.emoji} {cnt}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {noProjectCount > 0 && (
            <div style={{ marginTop: 16, color: 'var(--text2)', fontSize: 12 }}>
              ℹ️ {noProjectCount} unosa bez dodeljenog projekta
            </div>
          )}

          {data.length === 0 && (
            <div className="empty-state">
              <span className="emoji">📊</span>
              Nema unosa za {monthLabel}
            </div>
          )}
        </>
      )}

      <div className="export-section">
        <button className="btn btn-ghost btn-sm" onClick={exportXLSX} disabled={isGuest}>⬇ Excel (.xlsx) — {monthLabel}</button>
      </div>
    </div>
  );
}
