import { useEffect, useState } from 'react';

const MESSAGES = [
  'Slalom do deploymenta! 🏔',
  'Brže od bugovana! ⛷',
  'Svaki test — nova staza! 🎿',
  'Jana carves through bugs! ❄️',
  'Na stazu, na posao! 🏔',
];

const INTERVAL = 2 * 60 * 1000;
const DURATION = 7000;

export default function SkierAnimation({ active }) {
  const [visible, setVisible] = useState(false);
  const [msg, setMsg] = useState(MESSAGES[0]);
  const [skiing, setSkiing] = useState(false);

  useEffect(() => {
    if (!active) return;

    const show = () => {
      setMsg(MESSAGES[Math.floor(Math.random() * MESSAGES.length)]);
      setSkiing(false);
      setVisible(true);
      setTimeout(() => setSkiing(true), 100);
      setTimeout(() => setVisible(false), DURATION);
    };

    show();
    const interval = setInterval(show, INTERVAL);
    return () => clearInterval(interval);
  }, [active]);

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes skiSlide {
          0%   { transform: translateX(120vw) rotate(-5deg); opacity: 0; }
          8%   { opacity: 1; }
          92%  { opacity: 1; }
          100% { transform: translateX(-120vw) rotate(-5deg); opacity: 0; }
        }
        @keyframes skiWobble {
          0%   { transform: rotate(-8deg); }
          50%  { transform: rotate(5deg); }
          100% { transform: rotate(-8deg); }
        }
        .skier-wrap {
          animation: skiSlide 6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
      <div style={{
        position: 'fixed',
        bottom: 60,
        left: 0,
        right: 0,
        zIndex: 9999,
        pointerEvents: 'none',
        userSelect: 'none',
        display: 'flex',
        justifyContent: 'flex-start',
      }}>
        <div className={skiing ? 'skier-wrap' : ''} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'linear-gradient(135deg, rgba(20,80,160,0.88), rgba(80,140,220,0.78))',
          border: '2px solid rgba(120,180,255,0.45)',
          borderRadius: 20,
          padding: '12px 20px',
          boxShadow: '0 4px 28px rgba(40,100,220,0.35)',
          whiteSpace: 'nowrap',
        }}>
          <div style={{ fontSize: 40, lineHeight: 1, animation: 'skiWobble 0.5s ease-in-out infinite' }}>
            ⛷️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#dff0ff' }}>
              Jana na stazi!
            </div>
            <div style={{ fontSize: 11, color: '#9cc8ff', marginTop: 2 }}>
              {msg}
            </div>
          </div>
          <div style={{ fontSize: 28, marginLeft: 4 }}>🎿</div>
        </div>
      </div>
    </>
  );
}
