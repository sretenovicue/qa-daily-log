import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useTranslation } from 'react-i18next';
import { PROJECTS } from '../constants';
import { useStore } from '../store';

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const pad = n => String(n).padStart(2, '0');
  return {
    from: `${mon.getFullYear()}-${pad(mon.getMonth() + 1)}-${pad(mon.getDate())}`,
    to:   `${sun.getFullYear()}-${pad(sun.getMonth() + 1)}-${pad(sun.getDate())}`,
  };
}

function formatPeriodLabel(from, to) {
  if (!from || !to) return '';
  const f = new Date(from + 'T12:00:00');
  const t = new Date(to   + 'T12:00:00');
  const fStr = `${f.getDate()}.${f.getMonth() + 1}`;
  const tStr = `${t.getDate()}.${String(t.getMonth() + 1).padStart(2, '0')}.${t.getFullYear()}`;
  return `${fStr}-${tStr}`;
}

export default function WeeklyReport() {
  const { t } = useTranslation();
  const { addToast } = useStore();
  const week = getWeekDates();

  const [from, setFrom] = useState(week.from);
  const [to,   setTo]   = useState(week.to);
  const [notes, setNotes] = useState(() => {
    const obj = {};
    PROJECTS.forEach(p => { obj[p.value] = ''; });
    return obj;
  });
  const [copied, setCopied] = useState(false);

  const periodLabel = formatPeriodLabel(from, to);

  const preview = useMemo(() => {
    const lines = [`Weekly update (${periodLabel})`, ''];
    PROJECTS.forEach(p => {
      const text = (notes[p.value] || '').trim();
      if (!text) return;
      lines.push(`${p.label}:`);
      text.split('\n').forEach(line => { if (line.trim()) lines.push(line.trim()); });
      lines.push('');
    });
    return lines.join('\n').trim();
  }, [notes, periodLabel]);

  function exportXLSX() {
    const rows = [];
    PROJECTS.forEach(p => {
      const text = (notes[p.value] || '').trim();
      if (!text) return;
      text.split('\n').forEach((line, i) => {
        if (!line.trim()) return;
        rows.push({
          Projekat: i === 0 ? p.label : '',
          Stavka: line.trim(),
        });
      });
      // blank separator row
      rows.push({ Projekat: '', Stavka: '' });
    });
    if (!rows.length) return;

    const wb  = XLSX.utils.book_new();
    const ws  = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, ws, `Weekly update ${periodLabel}`);
    XLSX.writeFile(wb, `weekly-update-${from}-${to}.xlsx`);
  }

  function handleCopy() {
    if (!preview) return;
    navigator.clipboard.writeText(preview).then(() => {
      setCopied(true);
      addToast(t('common.copied'), 'info');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ padding: '24px 0' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>
            📋 Weekly update
          </h2>
          {periodLabel && (
            <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>({periodLabel})</div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="btn btn-ghost"
            onClick={exportXLSX}
            disabled={!preview}
          >
            ⬇ Excel
          </button>
          <button
            className="btn btn-primary"
            onClick={handleCopy}
            disabled={!preview}
            style={{ minWidth: 130 }}
          >
            {copied ? '✓ Kopirano' : '📋 Kopiraj sve'}
          </button>
        </div>
      </div>

      {/* Date range */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 28 }}>
        <div className="form-group" style={{ minWidth: 'auto', marginBottom: 0 }}>
          <label htmlFor="weekly-from">{t('period.from')}</label>
          <input
            id="weekly-from"
            type="date"
            value={from}
            onChange={e => setFrom(e.target.value)}
          />
        </div>
        <div className="form-group" style={{ minWidth: 'auto', marginBottom: 0 }}>
          <label htmlFor="weekly-to">{t('period.to')}</label>
          <input
            id="weekly-to"
            type="date"
            value={to}
            onChange={e => setTo(e.target.value)}
          />
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28, alignItems: 'start' }}>

        {/* Left — form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PROJECTS.map(p => (
            <div key={p.value}>
              <label style={{
                fontWeight: 700,
                fontSize: 12,
                color: notes[p.value]?.trim() ? 'var(--accent)' : 'var(--text3)',
                display: 'block',
                marginBottom: 5,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'color 0.15s',
              }}>
                {p.label}
              </label>
              <textarea
                value={notes[p.value]}
                onChange={e => setNotes(prev => ({ ...prev, [p.value]: e.target.value }))}
                placeholder={`Stavke za ${p.label}...`}
                rows={3}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  background: notes[p.value]?.trim() ? 'var(--surface2)' : 'var(--surface)',
                  border: `1px solid ${notes[p.value]?.trim() ? 'rgba(124,111,247,0.3)' : 'var(--border2)'}`,
                  borderRadius: 8,
                  color: 'var(--text)',
                  padding: '8px 12px',
                  fontSize: 13,
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  transition: 'border-color 0.15s, background 0.15s',
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* Right — preview */}
        <div style={{ position: 'sticky', top: 80 }}>
          <div style={{
            fontWeight: 700,
            fontSize: 11,
            color: 'var(--text3)',
            marginBottom: 8,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}>
            Preview
          </div>
          <div style={{
            background: 'var(--surface2)',
            border: '1px solid var(--border2)',
            borderRadius: 12,
            padding: '16px 18px',
            minHeight: 220,
            position: 'relative',
          }}>
            {preview ? (
              <pre style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.75,
                color: 'var(--text)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: 'inherit',
              }}>
                {preview}
              </pre>
            ) : (
              <div style={{
                color: 'var(--text3)',
                fontSize: 13,
                fontStyle: 'italic',
                marginTop: 8,
              }}>
                Unesite stavke levo da se pojavi preview...
              </div>
            )}
          </div>

          {preview && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleCopy}
              style={{ marginTop: 10, width: '100%' }}
            >
              {copied ? '✓ Kopirano' : '📋 Kopiraj'}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
