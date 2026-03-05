import { useEffect, useRef, useState } from 'react';

const DURATION = 7000;        // visible for 7s
const INTERVAL = 2 * 60 * 1000; // every 2 minutes

export default function QuoteToast({ quotes, active, icon = '💬' }) {
  const [current, setCurrent] = useState(null);
  const idxRef = useRef(Math.floor(Math.random() * quotes.length));

  useEffect(() => {
    if (!active) return;

    const show = () => {
      const q = quotes[idxRef.current % quotes.length];
      idxRef.current++;
      setCurrent(q);
      setTimeout(() => setCurrent(null), DURATION);
    };

    show();
    const interval = setInterval(show, INTERVAL);
    return () => clearInterval(interval);
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 110,
      right: 80,
      zIndex: 999,
      animation: 'slideUp 0.25s ease',
      pointerEvents: 'none',
      maxWidth: 340,
    }}>
      <div style={{
        background: 'rgba(124,111,247,0.13)',
        border: '1px solid rgba(124,111,247,0.3)',
        borderRadius: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        backdropFilter: 'blur(8px)',
      }}>
        <span style={{ fontSize: 16, flexShrink: 0, marginTop: 1 }}>{icon}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#c4b9ff', lineHeight: 1.4 }}>
            "{current.text}"
          </div>
          <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 4, opacity: 0.75 }}>
            — {current.author}
          </div>
        </div>
      </div>
    </div>
  );
}
