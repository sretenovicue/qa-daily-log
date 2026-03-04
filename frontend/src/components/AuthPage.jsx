import { useState } from 'react';
import { useStore } from '../store';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateLogin(email, password) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email ili korisničko ime je obavezno';
  if (!password) errors.password = 'Lozinka je obavezna';
  return errors;
}

function validateRegister(email, username, password, confirm) {
  const errors = {};
  if (!email.trim()) errors.email = 'Email je obavezan';
  else if (!EMAIL_RE.test(email)) errors.email = 'Email format nije validan';
  if (!username.trim()) errors.username = 'Korisničko ime je obavezno';
  if (!password) errors.password = 'Lozinka je obavezna';
  else if (password.length < 8) errors.password = 'Lozinka mora imati najmanje 8 znakova';
  if (password !== confirm) errors.confirm = 'Lozinke se ne poklapaju';
  return errors;
}

export default function AuthPage() {
  const { login, register } = useStore();
  const [mode, setMode] = useState('login'); // 'login' | 'register'

  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');

  const [errors,  setErrors]  = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  function switchMode(m) {
    setMode(m);
    setErrors({});
    setApiError('');
    setPendingApproval(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setApiError('');

    const errs = mode === 'login'
      ? validateLogin(email, password)
      : validateRegister(email, username, password, confirm);

    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);

    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const result = await register(email, username, password);
        if (result?.pending) {
          setPendingApproval(true);
          return;
        }
      }
    } catch (err) {
      let msg = err.message;
      try { msg = JSON.parse(msg).error || msg; } catch (_) {}
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ position: 'relative' }}>
        <div style={{
          position: 'absolute',
          top: 12,
          right: 14,
          fontSize: 8,
          fontWeight: 600,
          letterSpacing: '0.06em',
          color: 'transparent',
          background: 'linear-gradient(90deg, var(--accent, #7c6ff7), #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          opacity: 0.75,
          textTransform: 'uppercase',
          pointerEvents: 'none',
          userSelect: 'none',
        }}>
          vibecoded by Bosko
        </div>
        <div className="auth-logo">
          <div className="logo-icon">🧪</div>
          <h1>QA <span>Daily</span> Log</h1>
        </div>

        {pendingApproval && (
          <div style={{
            background: 'rgba(72,199,142,0.12)',
            border: '1px solid rgba(72,199,142,0.35)',
            borderRadius: 10,
            padding: '14px 16px',
            marginBottom: 16,
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>Registracija uspješna!</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
              Nalog čeka odobrenje menadžera. Bićete obaviješteni kada se nalog aktivira.
            </div>
            <button
              type="button"
              style={{ marginTop: 12, fontSize: 12, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => { setPendingApproval(false); switchMode('login'); }}
            >
              Idi na prijavu
            </button>
          </div>
        )}

        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
          >
            Prijava
          </button>
          <button
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}
            type="button"
          >
            Registracija
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label htmlFor="auth-email">{mode === 'login' ? 'Email ili korisničko ime' : 'Email'}</label>
            <input
              id="auth-email"
              type={mode === 'login' ? 'text' : 'email'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={mode === 'login' ? 'Email ili korisničko ime' : 'vas@email.com'}
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-username">Korisničko ime</label>
              <input
                id="auth-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Vaše ime"
                autoComplete="username"
              />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-password">Lozinka</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? 'Minimum 8 znakova' : ''}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-confirm">Potvrda lozinke</label>
              <input
                id="auth-confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder="Ponovite lozinku"
                autoComplete="new-password"
              />
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>
          )}

          {apiError && <div className="auth-api-error">{apiError}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Učitavanje…' : mode === 'login' ? 'Prijavi se' : 'Registruj se'}
          </button>
        </form>
      </div>
    </div>
  );
}
