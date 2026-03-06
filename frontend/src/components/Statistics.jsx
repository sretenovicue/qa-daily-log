import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';
import { CATEGORIES, STATUSES, secondsToHuman } from '../constants';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const CHART_OPTS = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: {
    x: { ticks: { color: '#7a7e9a', font: { size: 10 } }, grid: { color: '#272b42' } },
    y: { ticks: { color: '#7a7e9a', font: { size: 10 }, stepSize: 1 }, grid: { color: '#272b42' }, beginAtZero: true },
  },
};

const DONUT_OPTS = {
  responsive: true,
  plugins: {
    legend: { position: 'right', labels: { color: '#e2e4f0', font: { size: 11 }, boxWidth: 12, padding: 8 } },
  },
};

export default function Statistics() {
  const { t } = useTranslation();
  const { stats, statsLoading, statsError, fetchStats } = useStore();

  useEffect(() => { fetchStats(); }, []);

  if (statsLoading || !stats) {
    return <div className="empty-state"><span className="emoji">⏳</span>{t('stats.loading')}</div>;
  }

  if (statsError) {
    return (
      <div className="empty-state">
        <span className="emoji">⚠️</span>
        {statsError}
        <br />
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 12 }} onClick={fetchStats}>{t('stats.retry')}</button>
      </div>
    );
  }

  const { total, today, byCategory, byStatus, activity } = stats;

  const last14Labels = [];
  const last14Counts = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    last14Labels.push(ds.slice(5));
    const found = activity.find(a => a.date === ds);
    last14Counts.push(found ? found.cnt : 0);
  }

  const catKeys   = byCategory.map(r => r.category);
  const catCounts = byCategory.map(r => r.cnt);
  const catColors = catKeys.map(k => (CATEGORIES[k] || CATEGORIES.other).color);
  const catLabels = catKeys.map(k => {
    const c = CATEGORIES[k] || CATEGORIES.other;
    return `${c.emoji} ${t(`categories.${k}`, c.label)}`;
  });
  const maxCat = Math.max(...catCounts, 1);

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-number" style={{ color: 'var(--accent)' }}>{today?.cnt ?? 0}</div>
          <div className="stat-label">{t('stats.today')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: 'var(--green)', fontSize: 20 }}>
            {today?.dur ? secondsToHuman(today.dur) : '—'}
          </div>
          <div className="stat-label">{t('stats.todayTime')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: 'var(--yellow)' }}>{total?.cnt ?? 0}</div>
          <div className="stat-label">{t('stats.totalEntries')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: 'var(--orange)', fontSize: 20 }}>
            {total?.dur ? secondsToHuman(total.dur) : '—'}
          </div>
          <div className="stat-label">{t('stats.totalTime')}</div>
        </div>
      </div>

      {byStatus.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
          {byStatus.map(({ status, cnt }) => {
            const st = STATUSES[status] || STATUSES['in-progress'];
            return (
              <div key={status} className="stat-card" style={{ flex: '1', minWidth: 100, padding: '10px 14px' }}>
                <div style={{ fontSize: 20 }}>{st.emoji}</div>
                <div style={{ fontWeight: 700, color: st.color, fontSize: 22 }}>{cnt}</div>
                <div className="stat-label">{t(`statuses.${status}`, st.label)}</div>
              </div>
            );
          })}
        </div>
      )}

      <div className="charts-row">
        <div className="chart-card">
          <div className="card-title">{t('stats.activity14')}</div>
          <Bar data={{
            labels: last14Labels,
            datasets: [{ label: t('stats.entriesDataset'), data: last14Counts, backgroundColor: 'rgba(124,111,247,0.7)', borderRadius: 4 }],
          }} options={CHART_OPTS} />
        </div>
        {catKeys.length > 0 && (
          <div className="chart-card">
            <div className="card-title">{t('stats.categoriesAll')}</div>
            <Doughnut data={{
              labels: catLabels,
              datasets: [{ data: catCounts, backgroundColor: catColors, borderWidth: 2, borderColor: '#1c1f2e' }],
            }} options={DONUT_OPTS} />
          </div>
        )}
      </div>

      {byCategory.length > 0 && (
        <>
          <div className="card-title" style={{ marginBottom: 12 }}>{t('stats.categoryBreakdown')}</div>
          {byCategory.map(({ category, cnt, dur }) => {
            const c = CATEGORIES[category] || CATEGORIES.other;
            return (
              <div key={category} className="cat-row">
                <span style={{ minWidth: 120 }}>{c.emoji} {t(`categories.${category}`, c.label)}</span>
                <div className="cat-bar-wrap">
                  <div className="cat-bar" style={{ width: `${Math.round(cnt / maxCat * 100)}%`, background: c.color }} />
                </div>
                <span className="cat-count">{cnt}</span>
                {dur > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--accent)', minWidth: 60, textAlign: 'right' }}>
                    {secondsToHuman(dur)}
                  </span>
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
