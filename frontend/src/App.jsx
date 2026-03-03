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

export default function App() {
  const { activeTab, setActiveTab, currentUser, authToken, fetchMe, logout } = useStore();
  const headerDate = useHeaderDate();
  const isManager  = currentUser?.role === 'manager';
  const isGuest    = currentUser?.role === 'guest';

  useEffect(() => {
    if (authToken) fetchMe();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!currentUser) return <><AuthPage /><Toast /></>;

  const tabs = isManager ? [...BASE_TABS, ...MANAGER_TABS] : BASE_TABS;

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
            <span className="header-username">{currentUser.username}</span>
            <button className="logout-btn" onClick={logout} title="Odjavi se">Odjava</button>
          </div>
        </div>
      </header>

      <div className="container">
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
              </button>
            ))}
          </div>

          {/* Keep all tabs mounted — avoids remount/refetch on tab switch */}
          <div style={{ display: activeTab === 'log'      ? 'block' : 'none' }}><DailyLog /></div>
          <div style={{ display: activeTab === 'period'   ? 'block' : 'none' }}><PeriodView /></div>
          <div style={{ display: activeTab === 'projects' ? 'block' : 'none' }}><ProjectsView /></div>
          <div style={{ display: activeTab === 'stats'    ? 'block' : 'none' }}><Statistics /></div>
          {isManager && (
            <>
              <div style={{ display: activeTab === 'team'  ? 'block' : 'none' }}><TeamReport /></div>
              <div style={{ display: activeTab === 'users' ? 'block' : 'none' }}><UsersPanel /></div>
            </>
          )}
        </div>
      </div>

      <footer style={{ position: 'fixed', bottom: 12, left: 16, fontSize: 13, color: '#fff', opacity: 0.45, pointerEvents: 'none', userSelect: 'none' }}>
        Vibecoded by Bosko Sretenovic
      </footer>

      <Toast />
    </ErrorBoundary>
  );
}
