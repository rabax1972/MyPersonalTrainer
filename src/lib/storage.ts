import type { HistoryEntry, PlannedSession, Settings, UserConfig, WeeklyPlan } from '../data/types';
import type { TimerState } from './timer';

const PREFIX = 'mpt:';
export const KEYS = {
  config: `${PREFIX}config`,
  plan: `${PREFIX}plan`,
  history: `${PREFIX}history`,
  settings: `${PREFIX}settings`,
  active: `${PREFIX}active`,
} as const;

export interface ActiveSession {
  session: PlannedSession;
  config: UserConfig;
  timer: TimerState;
  startedAt: string;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  sound: true,
  vibration: true,
  voice: false,
  reminders: false,
  reminderHour: 18,
  disclaimerAccepted: false,
};

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function save(key: string, value: unknown): void {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Spazio esaurito o storage bloccato: l'app continua a funzionare in memoria.
  }
}

export interface BackupData {
  app: 'my-personal-trainer';
  version: 1;
  exportedAt: string;
  config: UserConfig | null;
  plan: WeeklyPlan | null;
  history: HistoryEntry[];
  settings: Settings;
}

export function buildBackup(data: {
  config: UserConfig | null; plan: WeeklyPlan | null; history: HistoryEntry[]; settings: Settings;
}): BackupData {
  return { app: 'my-personal-trainer', version: 1, exportedAt: new Date().toISOString(), ...data };
}

/** Valida un backup importato. Lancia un errore con un messaggio leggibile se non è valido. */
export function parseBackup(text: string): BackupData {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Il file non è un JSON valido.');
  }
  const d = data as Partial<BackupData>;
  if (!d || d.app !== 'my-personal-trainer') throw new Error('Il file non è un backup di questa app.');
  if (!Array.isArray(d.history)) throw new Error('Backup incompleto: manca lo storico.');
  for (const h of d.history) {
    if (typeof h?.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(h.date) || typeof h.durationSec !== 'number') {
      throw new Error('Backup danneggiato: voce di storico non valida.');
    }
  }
  return {
    app: 'my-personal-trainer',
    version: 1,
    exportedAt: d.exportedAt ?? '',
    config: d.config ?? null,
    plan: d.plan ?? null,
    history: d.history,
    settings: { ...DEFAULT_SETTINGS, ...(d.settings ?? {}) },
  };
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
