import { DisclaimerModal } from './components/Disclaimer';
import { navigate, useRoute } from './hooks/useRoute';
import { useTheme } from './hooks/useTheme';
import { CreditsScreen } from './screens/CreditsScreen';
import { EditSessionScreen } from './screens/EditSessionScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { HomeScreen } from './screens/HomeScreen';
import { RunScreen } from './screens/RunScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { SetupScreen } from './screens/SetupScreen';
import { useStore } from './store';

const TABS = [
  { path: '/', label: 'Piano', icon: '📋' },
  { path: '/history', label: 'Storico', icon: '📅' },
  { path: '/settings', label: 'Impostazioni', icon: '⚙️' },
];

function screenFor(route: string) {
  const edit = route.match(/^\/edit\/(.+)$/);
  if (edit) return <EditSessionScreen id={decodeURIComponent(edit[1])} />;
  switch (route) {
    case '/setup': return <SetupScreen />;
    case '/run': return <RunScreen />;
    case '/history': return <HistoryScreen />;
    case '/settings': return <SettingsScreen />;
    case '/credits': return <CreditsScreen />;
    default: return <HomeScreen />;
  }
}

export function App() {
  const route = useRoute();
  const { settings, updateSettings } = useStore();
  useTheme(settings.theme);
  const showTabs = route !== '/run';

  return (
    <>
      <main className={showTabs ? 'with-tabs' : ''}>{screenFor(route)}</main>
      {showTabs && (
        <nav className="tabbar" aria-label="Navigazione principale">
          {TABS.map((t) => {
            const current = t.path === '/' ? route === '/' || route.startsWith('/edit') : route.startsWith(t.path);
            return (
              <button key={t.path} className={`tab ${current ? 'tab-on' : ''}`} aria-current={current ? 'page' : undefined}
                onClick={() => navigate(t.path)}>
                <span aria-hidden="true">{t.icon}</span>
                {t.label}
              </button>
            );
          })}
        </nav>
      )}
      {!settings.disclaimerAccepted && <DisclaimerModal onAccept={() => updateSettings({ disclaimerAccepted: true })} />}
    </>
  );
}
