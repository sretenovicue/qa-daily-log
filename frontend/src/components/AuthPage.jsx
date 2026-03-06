import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '../store';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthPage() {
  const { t, i18n } = useTranslation();
  const { login, register } = useStore();
  const [mode, setMode] = useState('login');

  const [email,    setEmail]    = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');

  const [errors,        setErrors]        = useState({});
  const [apiError,      setApiError]      = useState('');
  const [loading,       setLoading]       = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);

  function validate() {
    const errs = {};
    if (!email.trim()) {
      errs.email = mode === 'login'
        ? t('authValidation.emailRequired')
        : t('authValidation.emailOnlyRequired');
    } else if (mode === 'register' && !EMAIL_RE.test(email)) errs.email = t('authValidation.emailInvalid');
    if (mode === 'register' && !username.trim()) errs.username = t('authValidation.usernameRequired');
    if (!password) errs.password = t('authValidation.passwordRequired');
    else if (mode === 'register' && password.length < 8) errs.password = t('authValidation.passwordMin');
    if (mode === 'register' && password !== confirm) errs.confirm = t('authValidation.passwordMismatch');
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
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else {
        const result = await register(email, username, password);
        if (result?.pending) { setPendingApproval(true); return; }
      }
    } catch (err) {
      let msg = err.message;
      try { msg = JSON.parse(msg).error || msg; } catch (_) {}
      setApiError(msg);
    } finally {
      setLoading(false);
    }
  }

  if (pendingApproval) {
    return (
      <div className="auth-page">
        <div className="auth-card auth-minimal">
          <div className="auth-brand">🧪 <span>QA Daily Log</span></div>
          <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📬</div>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 6, color: 'var(--accent)' }}>
              {t('auth.pendingTitle')}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6 }}>
              {t('auth.pendingDesc')}
            </div>
            <button
              type="button"
              className="auth-link-btn"
              onClick={() => { setPendingApproval(false); switchMode('login'); }}
              style={{ marginTop: 20 }}
            >
              ← {t('auth.goToLogin')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-minimal">

        {/* Brand */}
        <div className="auth-brand">🧪 <span>QA Daily Log</span></div>

        {/* Mode switch — subtle */}
        <div className="auth-mode-switch">
          <button
            type="button"
            className={`auth-mode-btn${mode === 'login' ? ' active' : ''}`}
            onClick={() => switchMode('login')}
          >
            {t('auth.login')}
          </button>
          <button
            type="button"
            className={`auth-mode-btn${mode === 'register' ? ' active' : ''}`}
            onClick={() => switchMode('register')}
          >
            {t('auth.register')}
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Fields — no labels, aria-label for accessibility + PW tests */}
          <div>
            <input
              className="auth-field"
              type={mode === 'login' ? 'text' : 'email'}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder={mode === 'login' ? t('auth.emailLoginPlaceholder') : t('auth.emailPlaceholder')}
              aria-label={mode === 'login' ? t('auth.emailOrUsername') : t('auth.email')}
              autoComplete="email"
            />
            {errors.email && <span className="field-error">{errors.email}</span>}
          </div>

          {mode === 'register' && (
            <div>
              <input
                className="auth-field"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder={t('auth.usernamePlaceholder')}
                aria-label={t('auth.username')}
                autoComplete="username"
              />
              {errors.username && <span className="field-error">{errors.username}</span>}
            </div>
          )}

          <div>
            <input
              className="auth-field"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={mode === 'register' ? t('auth.passwordMinPlaceholder') : t('auth.password')}
              aria-label={t('auth.password')}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {errors.password && <span className="field-error">{errors.password}</span>}
          </div>

          {mode === 'register' && (
            <div>
              <input
                className="auth-field"
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                placeholder={t('auth.confirmPlaceholder')}
                aria-label={t('auth.confirmPassword')}
                autoComplete="new-password"
              />
              {errors.confirm && <span className="field-error">{errors.confirm}</span>}
            </div>
          )}

          {apiError && <div className="auth-api-error">{apiError}</div>}

          <button type="submit" className="auth-submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? t('auth.loading') : mode === 'login' ? t('auth.submit') : t('auth.registerSubmit')}
          </button>
        </form>

        {/* Demo button — minimal */}
        {mode === 'login' && (
          <button
            type="button"
            disabled={loading}
            className="auth-demo-btn"
            onClick={async () => {
              setLoading(true);
              try { await login('guest', 'guest'); }
              catch (err) {
                let msg = err.message;
                try { msg = JSON.parse(msg).error || msg; } catch (_) {}
                setApiError(msg);
              } finally { setLoading(false); }
            }}
          >
            👀 {t('auth.demoTitle')}
          </button>
        )}

        {/* Lang + watermark */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 }}>
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={`lang-btn${i18n.language === 'sr' ? ' active' : ''}`}
              onClick={() => changeLang('sr')} type="button"
            >🇷🇸 SRB</button>
            <button
              className={`lang-btn${i18n.language === 'en' ? ' active' : ''}`}
              onClick={() => changeLang('en')} type="button"
            >🇬🇧 ENG</button>
          </div>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            vibecoded by bosko
          </span>
        </div>
      </div>
    </div>
  );
}
