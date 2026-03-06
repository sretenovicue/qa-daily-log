import { useEffect, useState } from 'react';
import { confirmEmail } from '../api';

export default function ConfirmPage({ token }) {
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [error, setError] = useState('');

  useEffect(() => {
    confirmEmail(token)
      .then(() => setStatus('ok'))
      .catch(err => {
        let msg = err.message;
        try { msg = JSON.parse(msg).error || msg; } catch (_) {}
        setError(msg);
        setStatus('error');
      });
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  function goToLogin() {
    window.history.pushState({}, '', '/');
    window.location.reload();
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ textAlign: 'center', padding: '40px 32px' }}>
        <div className="auth-logo" style={{ justifyContent: 'center', marginBottom: 24 }}>
          <div className="logo-icon">🧪</div>
          <h1>QA <span>Daily</span> Log</h1>
        </div>

        {status === 'loading' && (
          <div>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏳</div>
            <p style={{ color: 'var(--text2)' }}>Potvrđujemo email adresu...</p>
          </div>
        )}

        {status === 'ok' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--green, #43e97b)' }}>Email potvrđen!</h3>
            <p style={{ color: 'var(--text2)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
              Vaš nalog čeka odobrenje menadžera.<br />
              Bićete obaviješteni emailom kada se odobri.
            </p>
            <button className="auth-submit" onClick={goToLogin}>
              Idi na prijavu →
            </button>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
            <h3 style={{ margin: '0 0 8px', color: 'var(--danger, #ff6b6b)' }}>
              Potvrda nije uspjela
            </h3>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginBottom: 24 }}>
              {error || 'Link nije validan ili je već iskorišten.'}
            </p>
            <button className="auth-submit" onClick={goToLogin}>
              Idi na prijavu →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
