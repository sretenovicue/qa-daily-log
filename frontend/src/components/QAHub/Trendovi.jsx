import { useState, useEffect } from 'react';
import { getHubFeed, refreshHubFeed } from '../../api';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'danas';
  if (days === 1) return 'juče';
  if (days < 7) return `${days}d`;
  if (days < 30) return `${Math.floor(days / 7)}sed`;
  return `${Math.floor(days / 30)}mj`;
}

const SOURCE_COLORS = {
  devto:       '#4fc3f7',
  mot:         '#f9ca24',
  filiphric:   '#43e97b',
  stefanjudis: '#ffa726',
  testguild:   '#ff6584',
  debbie:      '#ab47bc',
};

export default function Trendovi() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter,  setFilter]  = useState('sve');
  const [refreshing, setRefreshing] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      setLoading(true);
      setError('');
      const res = await getHubFeed();
      setData(res);
    } catch (e) {
      setError('Greška pri učitavanju feedova.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshing(true);
    try {
      const res = await refreshHubFeed();
      setData(res);
    } catch (e) {
      setError('Refresh nije uspio.');
    } finally {
      setRefreshing(false);
    }
  }

  const items = data?.items || [];
  const sources = data?.sources || [];
  const filtered = filter === 'sve' ? items : items.filter(i => i.sourceId === filter);

  if (loading) return (
    <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)' }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🔄</div>
      Učitavam feedove...
    </div>
  );

  return (
    <div>
      {/* Filter + Refresh */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
          {[{ id: 'sve', name: 'Sve' }, ...sources].map(src => (
            <button
              key={src.id}
              onClick={() => setFilter(src.id)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                border: '1px solid',
                borderColor: filter === src.id
                  ? (SOURCE_COLORS[src.id] || 'var(--accent)')
                  : 'rgba(255,255,255,0.1)',
                background: filter === src.id
                  ? `${SOURCE_COLORS[src.id] || 'var(--accent)'}22`
                  : 'transparent',
                color: filter === src.id
                  ? (SOURCE_COLORS[src.id] || 'var(--accent)')
                  : 'var(--text2)',
                fontSize: 12,
                fontWeight: filter === src.id ? 600 : 400,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              {src.name}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          style={{
            padding: '5px 12px',
            borderRadius: 20,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'transparent',
            color: 'var(--text2)',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 5,
          }}
        >
          {refreshing ? '⏳' : '🔄'} Osvježi
        </button>
      </div>

      {error && (
        <div style={{ color: 'var(--danger, #ff6b6b)', fontSize: 13, marginBottom: 12 }}>{error}</div>
      )}

      {filtered.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text2)' }}>
          Nema dostupnih vijesti.
        </div>
      )}

      {/* Article cards */}
      <div style={{ display: 'grid', gap: 10 }}>
        {filtered.map(item => (
          <a
            key={item.id}
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              padding: '14px 16px',
              background: 'var(--card, rgba(255,255,255,0.04))',
              border: '1px solid rgba(255,255,255,0.07)',
              borderLeft: `3px solid ${SOURCE_COLORS[item.sourceId] || 'var(--accent)'}`,
              borderRadius: 8,
              textDecoration: 'none',
              color: 'inherit',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--card, rgba(255,255,255,0.04))'}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14, lineHeight: 1.4, flex: 1 }}>
                {item.title}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text2)', whiteSpace: 'nowrap', marginTop: 2 }}>
                {timeAgo(item.date)}
              </span>
            </div>
            {item.summary && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 5, lineHeight: 1.5 }}>
                {item.summary}
              </div>
            )}
            <div style={{
              marginTop: 8,
              fontSize: 11,
              color: SOURCE_COLORS[item.sourceId] || 'var(--accent)',
              fontWeight: 500,
            }}>
              {item.source}
            </div>
          </a>
        ))}
      </div>

      {data?.cachedAt > 0 && (
        <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text2)', opacity: 0.5, textAlign: 'right' }}>
          Keš: {new Date(data.cachedAt).toLocaleTimeString('sr-Latn')}
        </div>
      )}
    </div>
  );
}
