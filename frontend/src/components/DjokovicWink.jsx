import { useEffect, useState } from 'react';

const WINK_INTERVAL = 2 * 60 * 1000; // every 2 minutes

export default function DjokovicWink({ active }) {
  const [visible, setVisible] = useState(false);
  const [winking, setWinking] = useState(false);

  useEffect(() => {
    if (!active) return;

    const show = () => {
      setVisible(true);
      setWinking(false);
      // start wink cycle after a short delay
      setTimeout(() => setWinking(true), 400);
      setTimeout(() => setWinking(false), 900);
      setTimeout(() => setWinking(true), 1400);
      setTimeout(() => setWinking(false), 1900);
      setTimeout(() => setVisible(false), 7000);
    };

    show();
    const interval = setInterval(show, WINK_INTERVAL);
    return () => clearInterval(interval);
  }, [active]);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 90,
      right: 24,
      zIndex: 1000,
      animation: 'slideUp 0.3s ease',
      userSelect: 'none',
      pointerEvents: 'none',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #0c4a9e, #1a6fc4)',
        border: '2px solid #4a9eff',
        borderRadius: 16,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 4px 24px rgba(74,158,255,0.35)',
        minWidth: 220,
      }}>
        {/* Face */}
        <div style={{ fontSize: 42, lineHeight: 1, flexShrink: 0 }}>
          {winking ? '😉' : '🎾'}
        </div>

        <div>
          <div style={{
            fontWeight: 800,
            fontSize: 15,
            color: '#fff',
            letterSpacing: 0.3,
          }}>
            Novak Đoković
          </div>
          <div style={{
            fontSize: 11,
            color: '#a0c8ff',
            marginTop: 2,
            fontWeight: 500,
          }}>
            #1 ATP · 25 Grand Slemova 🏆
          </div>
        </div>
      </div>
    </div>
  );
}
