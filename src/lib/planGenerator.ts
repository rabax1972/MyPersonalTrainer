import { EXERCISES, EXERCISE_BY_ID } from '../data/exercises';
import type {
  DayType, Exercise, Focus, Goal, Phase, PlannedSession, Region, Role, UserConfig, WeeklyPlan,
} from '../data/types';
import { createRng, newSeed, weightedPick } from './random';
import { easyPhaseCount, mainExerciseCount, phaseBudget } from './sessionBuilder';

export const DAY_TITLES: Record<DayType, string> = {
  full: 'Total body',
  upper: 'Parte alta',
  lower: 'Gambe e glutei',
  cardioCore: 'Cardio e addome',
  hiit: 'Circuito brucia-grassi',
  mobility: 'Mobilità e stretching',
};

const DAY_REGION: Record<DayType, Region> = {
  full: 'full', upper: 'upper', lower: 'lower', cardioCore: 'core', hiit: 'full', mobility: 'full',
};

/** Sequenza di schemi di movimento della parte centrale per ogni tipo di giornata. */
const MAIN_PATTERNS: Record<DayType, Focus[]> = {
  full: ['legs', 'push', 'core', 'pull', 'legs', 'cardio', 'push', 'core'],
  upper: ['push', 'pull', 'push', 'pull', 'core', 'push', 'pull', 'core'],
  lower: ['legs', 'legs', 'core', 'legs', 'cardio', 'legs', 'core', 'legs'],
  cardioCore: ['cardio', 'core', 'cardio', 'core', 'legs', 'core', 'cardio', 'core'],
  hiit: ['cardio', 'legs', 'push', 'cardio', 'core', 'legs', 'cardio', 'pull'],
  mobility: ['mobility', 'mobility', 'core', 'mobility', 'mobility', 'legs', 'mobility', 'mobility'],
};

/** Se uno schema non ha esercizi disponibili si ripiega su questi, in ordine. */
const FOCUS_FALLBACK: Record<Focus, Focus[]> = {
  push: ['core', 'legs'],
  pull: ['core', 'legs'],
  legs: ['cardio', 'core'],
  cardio: ['legs', 'core'],
  core: ['legs', 'mobility'],
  mobility: ['core', 'legs'],
};

const BASE_SPLITS: Record<number, DayType[]> = {
  1: ['full'],
  2: ['full', 'full'],
  3: ['upper', 'lower', 'full'],
  4: ['upper', 'lower', 'cardioCore', 'full'],
  5: ['upper', 'lower', 'cardioCore', 'upper', 'lower'],
  6: ['upper', 'lower', 'cardioCore', 'upper', 'lower', 'mobility'],
  7: ['upper', 'lower', 'cardioCore', 'upper', 'lower', 'full', 'mobility'],
};

const FAT_LOSS_SPLITS: Record<number, DayType[]> = {
  1: ['hiit'],
  2: ['full', 'hiit'],
  3: ['full', 'hiit', 'full'],
  4: ['upper', 'hiit', 'lower', 'hiit'],
  5: ['full', 'hiit', 'upper', 'lower', 'hiit'],
  6: ['full', 'hiit', 'upper', 'lower', 'hiit', 'mobility'],
  7: ['full', 'hiit', 'upper', 'lower', 'hiit', 'cardioCore', 'mobility'],
};

/** Giorni della settimana (0 = lunedì) distribuiti per lasciare recupero tra le sedute. */
export const WEEKDAY_LAYOUT: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export const WEEKDAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export function weeklySplit(daysPerWeek: number, goal: Goal): DayType[] {
  const days = Math.min(7, Math.max(1, Math.round(daysPerWeek)));
  switch (goal) {
    case 'mobilita':
      return Array<DayType>(days).fill('mobility');
    case 'totalbody':
      return days <= 5
        ? Array<DayType>(days).fill('full')
        : [...Array<DayType>(days - 1).fill('full'), 'mobility'];
    case 'dimagrire':
      return FAT_LOSS_SPLITS[days];
    case 'forza':
      return BASE_SPLITS[days].map((d) => (d === 'cardioCore' ? 'full' : d));
    default:
      return BASE_SPLITS[days];
  }
}

/** L'esercizio è compatibile con attrezzatura, limitazioni e livello dell'utente? */
export function isEligible(ex: Exercise, config: UserConfig): boolean {
  if (ex.level > config.level) return false;
  if (!ex.equipment.every((eq) => config.equipment.includes(eq))) return false;
  if (ex.stress.some((s) => config.limitations.includes(s))) return false;
  return true;
}

function weightFor(ex: Exercise, config: UserConfig, region: Region): number {
  let w = 1;
  if (ex.goals.includes(config.goal)) w += 2;
  if (config.level === 3 && ex.level >= 2) w += 1.5;
  if (config.level === 2 && ex.level === 2) w += 0.5;
  // Chi ha attrezzatura vuole usarla, soprattutto per forza e tonificazione.
  if (ex.equipment.length > 0 && (config.goal === 'forza' || config.goal === 'tonificare')) w += 1.5;
  if (region !== 'full' && ex.region === region) w += 1.5;
  return w;
}

function pool(role: Role, config: UserConfig): Exercise[] {
  return EXERCISES.filter((e) => e.roles.includes(role) && isEligible(e, config));
}

function pickMain(dayType: DayType, count: number, config: UserConfig, rng: () => number): string[] {
  const candidates = pool('main', config);
  const region = DAY_REGION[dayType];
  const chosen: Exercise[] = [];
  const pattern = MAIN_PATTERNS[dayType];

  for (let i = 0; i < count; i++) {
    const focus = pattern[i % pattern.length];
    const available = candidates.filter((c) => !chosen.includes(c));
    let pick: Exercise | undefined;
    for (const f of [focus, ...FOCUS_FALLBACK[focus]]) {
      // Nelle giornate non di mobilità lo stretching non sostituisce la parte allenante.
      if (f === 'mobility' && dayType !== 'mobility') continue;
      pick = weightedPick(available.filter((c) => c.focus === f), (c) => weightFor(c, config, region), rng);
      if (pick) break;
    }
    if (!pick) {
      pick = weightedPick(
        available.filter((c) => dayType === 'mobility' || c.focus !== 'mobility'),
        (c) => weightFor(c, config, region),
        rng,
      );
    }
    if (!pick) break;
    chosen.push(pick);
  }
  return chosen.map((c) => c.id);
}

const WARMUP_ORDER: Focus[] = ['mobility', 'pull', 'push', 'core', 'legs', 'cardio'];

function pickEasyPhase(
  role: 'warmup' | 'cooldown', dayType: DayType, count: number, config: UserConfig,
  exclude: Set<string>, rng: () => number,
): string[] {
  const region = DAY_REGION[dayType];
  const candidates = pool(role, config).filter((c) => !exclude.has(c.id));
  const chosen: Exercise[] = [];

  // Nel riscaldamento delle giornate allenanti inserisci un esercizio che alzi i battiti.
  if (role === 'warmup' && dayType !== 'mobility') {
    const cardio = weightedPick(candidates.filter((c) => c.focus === 'cardio' || c.focus === 'legs'), () => 1, rng);
    if (cardio) chosen.push(cardio);
  }
  while (chosen.length < count) {
    const pick = weightedPick(
      candidates.filter((c) => !chosen.includes(c)),
      (c) => (c.region === region || c.region === 'full' ? 3 : 1) + (c.focus === 'mobility' ? 1 : 0),
      rng,
    );
    if (!pick) break;
    chosen.push(pick);
  }
  if (role === 'warmup') {
    chosen.sort((a, b) => WARMUP_ORDER.indexOf(a.focus) - WARMUP_ORDER.indexOf(b.focus));
  }
  return chosen.map((c) => c.id);
}

export function generateSession(
  dayType: DayType, weekday: number, config: UserConfig, seed: number, id: string,
): PlannedSession {
  const rng = createRng(seed);
  const budget = phaseBudget(config.sessionMinutes);
  const main = pickMain(dayType, mainExerciseCount(config.sessionMinutes, config.goal), config, rng);
  const used = new Set(main);
  const warmup = pickEasyPhase('warmup', dayType, easyPhaseCount(budget.warmup), config, used, rng);
  warmup.forEach((w) => used.add(w));
  const cooldown = pickEasyPhase('cooldown', dayType, easyPhaseCount(budget.cooldown), config, used, rng);
  return { id, dayType, title: DAY_TITLES[dayType], weekday, warmup, main, cooldown, seed };
}

export function generatePlan(config: UserConfig, seed: number = newSeed()): WeeklyPlan {
  const split = weeklySplit(config.daysPerWeek, config.goal);
  const weekdays = WEEKDAY_LAYOUT[split.length];
  const rng = createRng(seed);
  const sessions = split.map((dayType, i) =>
    generateSession(dayType, weekdays[i], config, Math.floor(rng() * 2 ** 31), `s${i + 1}`),
  );
  return { createdAt: new Date().toISOString(), config, sessions };
}

/** Rigenera una singola sessione con un nuovo seme, mantenendo giorno e tipo. */
export function regenerateSession(session: PlannedSession, config: UserConfig, seed: number = newSeed()): PlannedSession {
  return generateSession(session.dayType, session.weekday, config, seed, session.id);
}

export function replaceExercise(session: PlannedSession, phase: Phase, index: number, newId: string): PlannedSession {
  const list = [...session[phase]];
  list[index] = newId;
  return { ...session, [phase]: list };
}

export function removeExercise(session: PlannedSession, phase: Phase, index: number): PlannedSession {
  return { ...session, [phase]: session[phase].filter((_, i) => i !== index) };
}

/** Esercizi con cui sostituire quello in posizione `index`: prima quelli con lo stesso schema di movimento. */
export function alternativesFor(session: PlannedSession, phase: Phase, index: number, config: UserConfig): Exercise[] {
  const current = EXERCISE_BY_ID[session[phase][index]];
  const inSession = new Set([...session.warmup, ...session.main, ...session.cooldown]);
  const role: Role = phase;
  return pool(role, config)
    .filter((e) => !inSession.has(e.id))
    .sort((a, b) => {
      const sa = a.focus === current?.focus ? 0 : 1;
      const sb = b.focus === current?.focus ? 0 : 1;
      return sa - sb || a.name.localeCompare(b.name, 'it');
    });
}

export function defaultIntervals(level: UserConfig['level'], goal: Goal): { workSec: number; restSec: number } {
  if (goal === 'mobilita') return { workSec: 45, restSec: 10 };
  if (goal === 'forza') return level === 1 ? { workSec: 30, restSec: 40 } : { workSec: 40, restSec: 35 };
  if (level === 1) return { workSec: 30, restSec: 30 };
  if (level === 2) return { workSec: 40, restSec: 20 };
  return { workSec: 45, restSec: 15 };
}

export const DEFAULT_CONFIG: UserConfig = {
  daysPerWeek: 3,
  sessionMinutes: 20,
  level: 1,
  goal: 'totalbody',
  equipment: ['tappetino'],
  limitations: [],
  ...defaultIntervals(1, 'totalbody'),
};
