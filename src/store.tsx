import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { HistoryEntry, PlannedSession, Settings, UserConfig, WeeklyPlan } from './data/types';
import { dateKey } from './lib/dates';
import { writeReminderConfig } from './lib/reminders';
import { DEFAULT_SETTINGS, KEYS, load, save, uid, type ActiveSession } from './lib/storage';

interface Store {
  config: UserConfig | null;
  plan: WeeklyPlan | null;
  history: HistoryEntry[];
  settings: Settings;
  active: ActiveSession | null;
  setPlan: (plan: WeeklyPlan) => void;
  updateSession: (session: PlannedSession) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  addHistory: (entry: Omit<HistoryEntry, 'id' | 'completedAt'>) => void;
  removeHistory: (id: string) => void;
  setActive: (active: ActiveSession | null) => void;
  replaceAll: (data: { config: UserConfig | null; plan: WeeklyPlan | null; history: HistoryEntry[]; settings: Settings }) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [plan, setPlanState] = useState<WeeklyPlan | null>(() => load(KEYS.plan, null));
  const [history, setHistory] = useState<HistoryEntry[]>(() => load(KEYS.history, []));
  const [settings, setSettings] = useState<Settings>(() => ({ ...DEFAULT_SETTINGS, ...load(KEYS.settings, {}) }));
  const [active, setActiveState] = useState<ActiveSession | null>(() => load(KEYS.active, null));
  const config = plan?.config ?? load<UserConfig | null>(KEYS.config, null);

  useEffect(() => save(KEYS.plan, plan), [plan]);
  useEffect(() => save(KEYS.history, history), [history]);
  useEffect(() => save(KEYS.settings, settings), [settings]);

  // Tiene aggiornati i dati letti dal service worker per i promemoria.
  useEffect(() => {
    const doneDates = history.map((h) => h.date).filter((d) => d >= dateKey(new Date(Date.now() - 8 * 864e5)));
    void writeReminderConfig({
      enabled: settings.reminders,
      hour: settings.reminderHour,
      weekdays: plan?.sessions.map((s) => s.weekday) ?? [],
      doneDates,
    }).catch(() => undefined);
  }, [history, plan, settings.reminders, settings.reminderHour]);

  const setPlan = useCallback((p: WeeklyPlan) => {
    save(KEYS.config, p.config);
    setPlanState(p);
  }, []);

  const updateSession = useCallback((session: PlannedSession) => {
    setPlanState((p) => (p ? { ...p, sessions: p.sessions.map((s) => (s.id === session.id ? session : s)) } : p));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  const addHistory = useCallback((entry: Omit<HistoryEntry, 'id' | 'completedAt'>) => {
    setHistory((h) => [...h, { ...entry, id: uid(), completedAt: new Date().toISOString() }]);
  }, []);

  const removeHistory = useCallback((id: string) => setHistory((h) => h.filter((e) => e.id !== id)), []);

  // La sessione attiva viene salvata subito (non in un effetto) per non perderla se la pagina viene chiusa.
  const setActive = useCallback((a: ActiveSession | null) => {
    save(KEYS.active, a);
    setActiveState(a);
  }, []);

  const replaceAll: Store['replaceAll'] = useCallback((data) => {
    if (data.config) save(KEYS.config, data.config);
    setPlanState(data.plan);
    setHistory(data.history);
    setSettings(data.settings);
  }, []);

  const value = useMemo<Store>(
    () => ({ config, plan, history, settings, active, setPlan, updateSession, updateSettings, addHistory, removeHistory, setActive, replaceAll }),
    [config, plan, history, settings, active, setPlan, updateSession, updateSettings, addHistory, removeHistory, setActive, replaceAll],
  );
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore fuori da StoreProvider');
  return s;
}
