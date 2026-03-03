import { useEffect } from 'react';

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  // Close on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  return (
    <div className="modal-overlay" onClick={onCancel} style={{ zIndex: 300 }}>
      <div
        className="modal-box"
        style={{ maxWidth: 360, padding: '28px 28px 20px' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑</div>
        <p style={{ textAlign: 'center', marginBottom: 24, color: 'var(--text1)', fontSize: 15 }}>
          {message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn-ghost" onClick={onCancel} autoFocus>
            Otkaži
          </button>
          <button className="btn btn-danger" onClick={onConfirm}>
            Obriši
          </button>
        </div>
      </div>
    </div>
  );
}
