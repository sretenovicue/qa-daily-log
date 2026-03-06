import { useState } from 'react';
import Trendovi    from './Trendovi';
import MojiKursevi from './MojiKursevi';
import AIPreporuka from './AIPreporuka';

const SUB_TABS = [
  { id: 'trends',  label: '📡 Trendovi',    labelEn: '📡 Trends'    },
  { id: 'courses', label: '📚 Moji kursevi', labelEn: '📚 My courses' },
  { id: 'ai',      label: '✨ AI preporuka', labelEn: '✨ AI advice'  },
];

export default function QAHub({ lang = 'sr' }) {
  const [active, setActive] = useState('trends');

  return (
    <div style={{ padding: '0 0 32px' }}>
      <div style={{
        marginBottom: 20,
        display: 'flex',
        gap: 4,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        paddingBottom: 0,
      }}>
        {SUB_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: `2px solid ${active === tab.id ? 'var(--accent)' : 'transparent'}`,
              padding: '8px 16px',
              marginBottom: -1,
              fontSize: 13,
              fontWeight: active === tab.id ? 700 : 500,
              color: active === tab.id ? 'var(--accent3)' : 'var(--text2)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'color 0.15s, border-color 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            {lang === 'en' ? tab.labelEn : tab.label}
          </button>
        ))}
      </div>

      <div style={{ paddingTop: 4 }}>
        {active === 'trends'  && <Trendovi />}
        {active === 'courses' && <MojiKursevi />}
        {active === 'ai'      && <AIPreporuka />}
      </div>
    </div>
  );
}
