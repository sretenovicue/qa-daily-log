import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage() {
  const { t, i18n } = useTranslation();
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

  function validateLogin(emailVal, passwordVal) {
    const errs = {};
    if (!emailVal.trim()) errs.email = t('authValidation.emailRequired');
    if (!passwordVal) errs.password = t('authValidation.passwordRequired');
    return errs;
  }

  function validateRegister(emailVal, usernameVal, passwordVal, confirmVal) {
    const errs = {};
    if (!emailVal.trim()) errs.email = t('authValidation.emailOnlyRequired');
    else if (!EMAIL_RE.test(emailVal)) errs.email = t('authValidation.emailInvalid');
    if (!usernameVal.trim()) errs.username = t('authValidation.usernameRequired');
    if (!passwordVal) errs.password = t('authValidation.passwordRequired');
    else if (passwordVal.length < 8) errs.password = t('authValidation.passwordMin');
    if (passwordVal !== confirmVal) errs.confirm = t('authValidation.passwordMismatch');
    return errs;
  }

  function switchMode(m) {
    setMode(m);
    setErrors({});
    setApiError('');
    setPendingApproval(false);
  }

  function changeLang(lang) {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
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
        {/* Language switcher on auth page */}
        <div style={{ position: 'absolute', top: 12, left: 14, display: 'flex', gap: 4 }}>
          <button
            className={`lang-btn${i18n.language === 'sr' ? ' active' : ''}`}
            onClick={() => changeLang('sr')}
            type="button"
          >
            🇷🇸 SRB
          </button>
          <button
            className={`lang-btn${i18n.language === 'en' ? ' active' : ''}`}
            onClick={() => changeLang('en')}
            type="button"
          >
            🇬🇧 ENG
          </button>
        </div>

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
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--green)' }}>{t('auth.pendingTitle')}</div>
            <div style={{ fontSize: 13, color: 'var(--text2)', marginTop: 4 }}>
              {t('auth.pendingDesc')}
            </div>
            <button
              type="button"
              style={{ marginTop: 12, fontSize: 12, background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', textDecoration: 'underline' }}
              onClick={() => { setPendingApproval(false); switchMode('login'); }}
            >
              {t('auth.goToLogin')}
            </button>
          </div>
        )}

        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
          >
            {t('auth.login')}
          </button>
          <button
            className={`auth-tab${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}
            type="button"
          >
            {t('auth.register')}
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {mode === 'register' && (
            <div style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: 'rgba(124,111,247,0.08)',
              border: '1px solid rgba(124,111,247,0.25)',
              borderRadius: 8,
              padding: '10px 12px',
              marginBottom: 14,
            }}>
              <span style={{ fontSize: 16, marginTop: 1 }}>ℹ️</span>
              <span style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>
                {t('auth.registerNotice')}
              </span>
            </div>
          )}
          <div className="form-group">
            <label htmlFor="auth-email">{mode === 'login' ? t('auth.emailOrUsername') : t('auth.email')}</label>
            <input
              id="auth-email"
              type={mode === 'login' ? 'text' : 'email'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={mode === 'login' ? t('auth.emailLoginPlaceholder') : t('auth.emailPlaceholder')}
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-username">{t('auth.username')}</label>
              <input
                id="auth-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t('auth.usernamePlaceholder')}
                autoComplete="username"
              />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="auth-password">{t('auth.password')}</label>
            <input
              id="auth-password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? t('auth.passwordMinPlaceholder') : ''}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          {mode === 'register' && (
            <div className="form-group">
              <label htmlFor="auth-confirm">{t('auth.confirmPassword')}</label>
              <input
                id="auth-confirm"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder={t('auth.confirmPlaceholder')}
                autoComplete="new-password"
              />
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>
          )}

          {apiError && <div className="auth-api-error">{apiError}</div>}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? t('auth.loading') : mode === 'login' ? t('auth.submit') : t('auth.registerSubmit')}
          </button>
        </form>

        {mode === 'login' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 14px' }}>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ fontSize: 11, color: 'var(--text2)', opacity: 0.5, letterSpacing: '0.05em' }}>{t('auth.or')}</span>
              <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.08)' }} />
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={async () => {
                setLoading(true);
                try { await login('guest', 'guest'); }
                catch (err) {
                  let msg = err.message;
                  try { msg = JSON.parse(msg).error || msg; } catch (_) {}
                  setApiError(msg);
                } finally { setLoading(false); }
              }}
              style={{
                width: '100%',
                padding: '11px 16px',
                borderRadius: 10,
                border: '1px dashed rgba(124,111,247,0.4)',
                background: 'rgba(124,111,247,0.06)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                transition: 'all 0.18s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(124,111,247,0.13)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(124,111,247,0.06)'}
            >
              <span style={{ fontSize: 20 }}>👀</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{t('auth.demoTitle')}</div>
                <div style={{ fontSize: 11, color: 'var(--text2)', marginTop: 1 }}>{t('auth.demoDesc')}</div>
              </div>
              <span style={{ marginLeft: 'auto', fontSize: 16, color: 'var(--accent)', opacity: 0.6 }}>→</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
}
