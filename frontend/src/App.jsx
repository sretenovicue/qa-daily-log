import { useEffect, useState } from 'react';
import { useStore } from './store';
import AddEntry from './components/AddEntry';
import DailyLog from './components/DailyLog';
import PeriodView from './components/PeriodView';
import Statistics from './components/Statistics';
import ProjectsView from './components/ProjectsView';
import TeamReport from './components/TeamReport';
import UsersPanel from './components/UsersPanel';
import Toast from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import AuthPage from './components/AuthPage';
import Avatar from './components/Avatar';
import { getTitle } from './userProfiles';

const BASE_TABS = [
  { id: 'log',      label: '📋 Dnevni log' },
  { id: 'period',   label: '📅 Period' },
  { id: 'projects', label: '🏗 Projekti' },
  { id: 'stats',    label: '📊 Statistike' },
];

const MANAGER_TABS = [
  { id: 'team',  label: '👥 Tim' },
  { id: 'users', label: '⚙️ Korisnici' },
];

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

function useHeaderDate() {
  const [date, setDate] = useState(formatDate());

  useEffect(() => {
    // Update when day changes (check every minute)
    const interval = setInterval(() => setDate(formatDate()), 60_000);
    return () => clearInterval(interval);
  }, []);

  return date;
}

function formatDate() {
  return new Date().toLocaleDateString('sr-Latn', {
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

export default function App() {
  const { activeTab, setActiveTab, currentUser, authToken, fetchMe, logout, pendingUsersCount, fetchPendingCount, uploadAvatar, addToast } = useStore();
  const [avatarUploading, setAvatarUploading] = useState(false);
  const headerDate = useHeaderDate();
  const isManager  = currentUser?.role === 'manager';
  const isGuest    = currentUser?.role === 'guest';

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
          <div className="header-user">
            {isManager && <span className="badge" style={{ background: 'rgba(124,111,247,0.2)', color: 'var(--accent)', marginRight: 6, fontSize: 11 }}>manager</span>}
            <label title="Promeni profilnu sliku" style={{ cursor: avatarUploading ? 'wait' : 'pointer', position: 'relative', flexShrink: 0 }}>
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
                      addToast('Profilna slika ažurirana ✓', 'success');
                    } catch {
                      addToast('Greška pri uploadu slike', 'error');
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
              {getTitle(currentUser.username) && (
                <span style={{ fontSize: 10, color: 'var(--text2)', opacity: 0.7 }}>{getTitle(currentUser.username)}</span>
              )}
            </div>
            <button className="logout-btn" onClick={logout} title="Odjavi se">Odjava</button>
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
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--accent)' }}>Demo mod — samo pregled</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                Prijavljeni ste kao gost. Možete pregledati aplikaciju, ali ne možete dodavati unose.
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
            {tabs.map(t => (
              <button
                key={t.id}
                className={`tab${activeTab === t.id ? ' active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
                {t.id === 'users' && isManager && <PendingBadge count={pendingUsersCount} />}
              </button>
            ))}
          </div>

          {/* Keep all tabs mounted — avoids remount/refetch on tab switch */}
          <div style={{ display: activeTab === 'log'      ? 'block' : 'none' }}><DailyLog /></div>
          <div style={{ display: activeTab === 'period'   ? 'block' : 'none' }}><PeriodView /></div>
          <div style={{ display: activeTab === 'projects' ? 'block' : 'none' }}><ProjectsView /></div>
          <div style={{ display: activeTab === 'stats'    ? 'block' : 'none' }}><Statistics /></div>
          {(isManager || isGuest) && (
            <>
              <div style={{ display: activeTab === 'team'  ? 'block' : 'none' }}><TeamReport /></div>
              <div style={{ display: activeTab === 'users' ? 'block' : 'none' }}><UsersPanel /></div>
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
