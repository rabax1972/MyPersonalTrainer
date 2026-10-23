import type { HistoryEntry } from '../data/types';
import { addDays, dateKey, parseDateKey, startOfWeek } from './dates';

export interface Stats {
  totalSessions: number;
  totalMinutes: number;
  thisWeek: number;
  /** Media sessioni a settimana nelle ultime 4 settimane (inclusa la corrente). */
  weeklyAverage: number;
  currentStreak: number;
  bestStreak: number;
}

export function computeStats(history: HistoryEntry[], today: Date = new Date()): Stats {
  const days = new Set(history.map((h) => h.date));
  const weekStart = startOfWeek(today);
  const weekStartKey = dateKey(weekStart);
  const fourWeeksKey = dateKey(addDays(weekStart, -21));
  const todayKey = dateKey(today);

  const thisWeek = history.filter((h) => h.date >= weekStartKey && h.date <= todayKey).length;
  const lastFour = history.filter((h) => h.date >= fourWeeksKey && h.date <= todayKey).length;

  // Serie attuale: giorni consecutivi fino a oggi (o fino a ieri, se oggi non ci si è ancora allenati).
  let currentStreak = 0;
  let cursor = days.has(todayKey) ? today : addDays(today, -1);
  while (days.has(dateKey(cursor))) {
    currentStreak++;
    cursor = addDays(cursor, -1);
  }

  let bestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const key of [...days].sort()) {
    const d = parseDateKey(key);
    run = prev && dateKey(addDays(prev, 1)) === key ? run + 1 : 1;
    bestStreak = Math.max(bestStreak, run);
    prev = d;
  }

  return {
    totalSessions: history.length,
    totalMinutes: Math.round(history.reduce((s, h) => s + h.durationSec, 0) / 60),
    thisWeek,
    weeklyAverage: Math.round((lastFour / 4) * 10) / 10,
    currentStreak,
    bestStreak,
  };
}
