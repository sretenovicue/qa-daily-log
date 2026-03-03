import { useStore } from '../store';

const TYPE_STYLES = {
  success: { background: 'rgba(61,214,140,0.12)', border: '1px solid rgba(61,214,140,0.3)', color: '#3dd68c', icon: '✓' },
  error:   { background: 'rgba(240,108,108,0.12)', border: '1px solid rgba(240,108,108,0.3)', color: '#f06c6c', icon: '✕' },
  info:    { background: 'rgba(124,111,247,0.12)', border: '1px solid rgba(124,111,247,0.3)', color: '#7c6ff7', icon: 'ℹ' },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useStore();

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 999, pointerEvents: 'none',
    }}>
      {toasts.map(t => {
        const s = TYPE_STYLES[t.type] || TYPE_STYLES.info;
        return (
          <div
            key={t.id}
            onClick={() => removeToast(t.id)}
            style={{
              ...s,
              padding: '10px 16px',
              borderRadius: 10,
              fontSize: 13,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              backdropFilter: 'blur(8px)',
              pointerEvents: 'all',
              cursor: 'pointer',
              animation: 'slideUp 0.2s ease',
              minWidth: 200,
              maxWidth: 320,
            }}
          >
            <span style={{ fontSize: 15 }}>{s.icon}</span>
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
