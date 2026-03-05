import { useEffect, useState } from 'react';

const FISH = ['🐟', '🐠', '🐡', '🎣', '🦈', '🐙'];
const INTERVAL = 2 * 60 * 1000;
const DURATION = 7000;

export default function FishAnimation({ active }) {
  const [visible, setVisible] = useState(false);
  const [fish, setFish] = useState('🐟');

  useEffect(() => {
    if (!active) return;

    const show = () => {
      setFish(FISH[Math.floor(Math.random() * FISH.length)]);
      setVisible(true);
      setTimeout(() => setVisible(false), DURATION);
    };

    show();
    const interval = setInterval(show, INTERVAL);
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
      pointerEvents: 'none',
      userSelect: 'none',
    }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(6,90,120,0.85), rgba(0,140,180,0.75))',
        border: '2px solid rgba(0,200,255,0.4)',
        borderRadius: 16,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow: '0 4px 24px rgba(0,180,220,0.3)',
        minWidth: 200,
      }}>
        <div style={{ fontSize: 42, lineHeight: 1, flexShrink: 0, animation: 'fishWiggle 0.6s ease-in-out infinite alternate' }}>
          {fish}
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: '#e0f7ff' }}>
            Srećan ribolov, Stanko!
          </div>
          <div style={{ fontSize: 11, color: '#7dd8f0', marginTop: 3 }}>
            🎣 Uvek veći ulov od juče
          </div>
        </div>
      </div>
      <style>{`
        @keyframes fishWiggle {
          from { transform: rotate(-8deg); }
          to   { transform: rotate(8deg); }
        }
      `}</style>
    </div>
  );
}
