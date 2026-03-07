import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from './store';
import AddEntry from './components/AddEntry';
import DailyLog from './components/DailyLog';
import PeriodView from './components/PeriodView';
import Statistics from './components/Statistics';
import ProjectsView from './components/ProjectsView';
import TeamReport from './components/TeamReport';
import UsersPanel from './components/UsersPanel';
import WeeklyReport from './components/WeeklyReport';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import AuthPage from './components/AuthPage';
import ConfirmPage from './components/ConfirmPage';
import QAHub from './components/QAHub';
import Avatar from './components/Avatar';

function PendingBadge({ count }) {
  if (!count) return null;
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#ef4444',
      color: '#fff',
      borderRadius: 999,
      fontSize: 10,
      fontWeight: 700,
      minWidth: 16,
      height: 16,
      padding: '0 4px',
      marginLeft: 5,
      lineHeight: 1,
    }}>{count}</span>
  );
}

function useHeaderDate(language) {
  const [date, setDate] = useState(() => formatDate(language));

  useEffect(() => {
    setDate(formatDate(language));
    const interval = setInterval(() => setDate(formatDate(language)), 60_000);
    return () => clearInterval(interval);
  }, [language]);

  return date;
}

function formatDate(language) {
  const locale = language === 'sr' ? 'sr-Latn' : 'en-GB';
  return new Date().toLocaleDateString(locale, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

function resizeToBase64(file, maxSize = 200) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = reject;
    img.src = url;
  });
}

// Handle /confirm/:token URL — no React Router needed
const confirmToken = window.location.pathname.match(/^\/confirm\/([a-f0-9]{64})$/)?.[1] ?? null;

export default function App() {
  if (confirmToken) return <ConfirmPage token={confirmToken} />;

  const { activeTab, setActiveTab, currentUser, authToken, fetchMe, logout, pendingUsersCount, fetchPendingCount, uploadAvatar, addToast } = useStore();
  const { t, i18n } = useTranslation();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const headerDate = useHeaderDate(i18n.language);
  const isManager  = currentUser?.role === 'manager';
  const isGuest    = currentUser?.role === 'guest';

  function changeLang(lang) {
    i18n.changeLanguage(lang);
    localStorage.setItem('lang', lang);
  }

  const BASE_TABS = [
    { id: 'log',      label: `📋 ${t('nav.log')}` },
    { id: 'period',   label: `📅 ${t('nav.period')}` },
    { id: 'projects', label: `🏗 ${t('nav.projects')}` },
    { id: 'stats',    label: `📊 ${t('nav.stats')}` },
    { id: 'hub',      label: `🚀 ${t('nav.hub')}` },
  ];

  const MANAGER_TABS = [
    { id: 'team',   label: `👥 ${t('nav.team')}` },
    { id: 'users',  label: `⚙️ ${t('nav.users')}` },
    { id: 'weekly', label: `📋 ${t('nav.weekly')}` },
  ];

  useEffect(() => {
    if (authToken) fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isManager) return;
    fetchPendingCount();
    const interval = setInterval(fetchPendingCount, 60_000);
    return () => clearInterval(interval);
  }, [isManager]); // eslint-disable-line react-hooks/exhaustive-deps


  if (!currentUser) return <><AuthPage /><Toast /></>;

  const tabs = (isManager || isGuest) ? [...BASE_TABS, ...MANAGER_TABS] : BASE_TABS;

  return (
    <ErrorBoundary>
      <header>
        <div className="logo">
          <div className="logo-icon">🧪</div>
          <h1>QA <span>Daily</span> Log</h1>
        </div>
        <div className="header-right">
          <div className="header-date">{headerDate}</div>

          <div className="lang-switcher">
            <button
              className={`lang-btn${i18n.language === 'sr' ? ' active' : ''}`}
              onClick={() => changeLang('sr')}
            >
              🇷🇸 SRB
            </button>
            <button
              className={`lang-btn${i18n.language === 'en' ? ' active' : ''}`}
              onClick={() => changeLang('en')}
            >
              🇬🇧 ENG
            </button>
          </div>

          <div className="header-user">
            {isManager && (
              <span className="badge" style={{ background: 'rgba(124,111,247,0.2)', color: 'var(--accent)', marginRight: 6, fontSize: 11 }}>
                {t('header.managerBadge')}
              </span>
            )}
            <label title={t('header.changeAvatar')} style={{ cursor: avatarUploading ? 'wait' : 'pointer', position: 'relative', flexShrink: 0 }}>
              <Avatar username={currentUser.username} avatarData={currentUser.avatar_data} size={30} style={{ border: '2px solid rgba(255,255,255,0.12)' }} />
              {!isGuest && (
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  disabled={avatarUploading}
                  onChange={async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    setAvatarUploading(true);
                    try {
                      const base64 = await resizeToBase64(file);
                      await uploadAvatar(base64);
                      addToast(t('header.avatarUpdated'), 'success');
                    } catch {
                      addToast(t('header.avatarError'), 'error');
                    } finally {
                      setAvatarUploading(false);
                      e.target.value = '';
                    }
                  }}
                />
              )}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span className="header-username">{currentUser.username}</span>
              {currentUser.title && (
                <span style={{ fontSize: 10, color: 'var(--text2)', opacity: 0.7 }}>{currentUser.title}</span>
              )}
            </div>
            <button className="logout-btn" onClick={logout} title={t('header.logoutTitle')}>
              {t('header.logout')}
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {isGuest && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(124,111,247,0.15), rgba(167,139,250,0.08))',
            border: '1px solid rgba(124,111,247,0.35)',
            borderRadius: 12,
            padding: '14px 18px',
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 22 }}>👀</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>{t('guest.title')}</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                {t('guest.desc')}
              </div>
            </div>
          </div>
        )}

        {!isGuest && (
          <div>
            <AddEntry />
          </div>
        )}

        <div>
          <div className="tabs">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`tab${activeTab === tab.id ? ' active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
                {tab.id === 'users' && isManager && <PendingBadge count={pendingUsersCount} />}
              </button>
            ))}
          </div>

          {/* Keep all tabs mounted — avoids remount/refetch on tab switch */}
          <div style={{ display: activeTab === 'log'      ? 'block' : 'none' }}><DailyLog /></div>
          <div style={{ display: activeTab === 'period'   ? 'block' : 'none' }}><PeriodView /></div>
          <div style={{ display: activeTab === 'projects' ? 'block' : 'none' }}><ProjectsView /></div>
          <div style={{ display: activeTab === 'stats'    ? 'block' : 'none' }}><Statistics /></div>
          <div style={{ display: activeTab === 'hub'      ? 'block' : 'none' }}><QAHub lang={i18n.language} /></div>
          {(isManager || isGuest) && (
            <>
              <div style={{ display: activeTab === 'team'   ? 'block' : 'none' }}><TeamReport /></div>
              <div style={{ display: activeTab === 'users'  ? 'block' : 'none' }}><UsersPanel /></div>
              <div style={{ display: activeTab === 'weekly' ? 'block' : 'none' }}><WeeklyReport /></div>
            </>
          )}
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 12, left: 16, fontSize: 13, color: '#fff', opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
        Vibecoded by Bosko
      </footer>

      <Toast />
    </ErrorBoundary>
  );
}
