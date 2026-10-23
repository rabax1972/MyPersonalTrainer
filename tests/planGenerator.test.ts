import { describe, expect, it } from 'vitest';
import { EXERCISES, EXERCISE_BY_ID } from '../src/data/exercises';
import type { Equipment, Goal, Level, Limitation, UserConfig } from '../src/data/types';
import {
  alternativesFor, defaultIntervals, generatePlan, isEligible, regenerateSession, removeExercise,
  replaceExercise, WEEKDAY_LAYOUT, weeklySplit,
} from '../src/lib/planGenerator';
import { buildSteps, totalDuration } from '../src/lib/sessionBuilder';

const GOALS: Goal[] = ['dimagrire', 'tonificare', 'forza', 'mobilita', 'totalbody'];
const LEVELS: Level[] = [1, 2, 3];
const MINUTES = [10, 20, 30, 45, 60];
const EQUIPMENT_SETS: Equipment[][] = [[], ['tappetino'], ['manubri'], ['elastici'], ['sbarra'], ['tappetino', 'manubri', 'elastici', 'sbarra']];
const LIMITATION_SETS: Limitation[][] = [[], ['ginocchia'], ['schiena', 'spalle'], ['ginocchia', 'schiena', 'spalle', 'polsi', 'salti']];

function config(over: Partial<UserConfig> = {}): UserConfig {
  const level = over.level ?? 2;
  const goal = over.goal ?? 'totalbody';
  return {
    daysPerWeek: 3, sessionMinutes: 30, level, goal, equipment: [], limitations: [],
    ...defaultIntervals(level, goal), ...over,
  };
}

/** Tutte le combinazioni rilevanti di configurazione. */
function* allConfigs(): Generator<UserConfig> {
  for (const goal of GOALS)
    for (const level of LEVELS)
      for (const sessionMinutes of MINUTES)
        for (const equipment of EQUIPMENT_SETS)
          for (const limitations of LIMITATION_SETS)
            yield config({ goal, level, sessionMinutes, equipment, limitations, daysPerWeek: 1 + ((sessionMinutes + level) % 7) });
}

describe('dataset esercizi', () => {
  it('contiene 60-80 esercizi con id unici e dati completi', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(60);
    expect(EXERCISES.length).toBeLessThanOrEqual(80);
    expect(new Set(EXERCISES.map((e) => e.id)).size).toBe(EXERCISES.length);
    for (const e of EXERCISES) {
      expect(e.cues.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.cues.length, e.id).toBeLessThanOrEqual(4);
      expect(e.commonMistake.length, e.id).toBeGreaterThan(5);
      expect(e.instructions.length, e.id).toBeGreaterThan(0);
      expect(e.roles.length, e.id).toBeGreaterThan(0);
      expect(e.media.type).toBe('frames');
    }
  });

  it('copre tutti i gruppi di movimento', () => {
    for (const focus of ['push', 'pull', 'legs', 'core', 'cardio', 'mobility']) {
      expect(EXERCISES.filter((e) => e.focus === focus).length, focus).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('piano settimanale', () => {
  it('genera esattamente il numero di giorni scelto, su giorni della settimana distinti', () => {
    for (let days = 1; days <= 7; days++) {
      for (const goal of GOALS) {
        const plan = generatePlan(config({ daysPerWeek: days, goal }), 42);
        expect(plan.sessions).toHaveLength(days);
        const weekdays = plan.sessions.map((s) => s.weekday);
        expect(new Set(weekdays).size).toBe(days);
        expect(weekdays).toEqual(WEEKDAY_LAYOUT[days]);
      }
    }
  });

  it('con obiettivo mobilità propone solo giornate di mobilità', () => {
    expect(weeklySplit(4, 'mobilita')).toEqual(['mobility', 'mobility', 'mobility', 'mobility']);
  });

  it('con obiettivo dimagrire include giornate HIIT', () => {
    expect(weeklySplit(3, 'dimagrire')).toContain('hiit');
  });

  it('è deterministico a parità di seme', () => {
    const c = config({ equipment: ['manubri'] });
    expect(generatePlan(c, 7).sessions).toEqual(generatePlan(c, 7).sessions);
  });
});

describe('rispetto dei vincoli', () => {
  it('ogni sessione dura esattamente il tempo scelto', () => {
    for (const c of allConfigs()) {
      const plan = generatePlan(c, 123);
      for (const s of plan.sessions) {
        const steps = buildSteps(s, c);
        expect(totalDuration(steps), `${c.goal} ${c.sessionMinutes}min`).toBe(c.sessionMinutes * 60);
        expect(steps.every((st) => st.durationSec > 0)).toBe(true);
      }
    }
  });

  it('usa solo attrezzatura disponibile ed evita le zone indicate e i livelli superiori', () => {
    for (const c of allConfigs()) {
      for (const s of generatePlan(c, 99).sessions) {
        for (const id of [...s.warmup, ...s.main, ...s.cooldown]) {
          const e = EXERCISE_BY_ID[id];
          expect(e.equipment.every((eq) => c.equipment.includes(eq)), `${id} attrezzatura`).toBe(true);
          expect(e.stress.some((z) => c.limitations.includes(z)), `${id} limitazioni`).toBe(false);
          expect(e.level).toBeLessThanOrEqual(c.level);
        }
      }
    }
  });

  it('ogni sessione ha riscaldamento, parte centrale e defaticamento, senza ripetizioni', () => {
    for (const c of allConfigs()) {
      for (const s of generatePlan(c, 5).sessions) {
        expect(s.warmup.length).toBeGreaterThanOrEqual(2);
        expect(s.main.length).toBeGreaterThanOrEqual(3);
        expect(s.cooldown.length).toBeGreaterThanOrEqual(2);
        const all = [...s.warmup, ...s.main, ...s.cooldown];
        expect(new Set(all).size).toBe(all.length);
        const steps = buildSteps(s, c);
        expect(steps[0].phase).toBe('warmup');
        expect(steps[steps.length - 1].phase).toBe('cooldown');
      }
    }
  });

  it('i ruoli degli esercizi corrispondono alla fase', () => {
    const c = config({ equipment: ['manubri', 'elastici'] });
    for (const s of generatePlan(c, 11).sessions) {
      s.warmup.forEach((id) => expect(EXERCISE_BY_ID[id].roles).toContain('warmup'));
      s.main.forEach((id) => expect(EXERCISE_BY_ID[id].roles).toContain('main'));
      s.cooldown.forEach((id) => expect(EXERCISE_BY_ID[id].roles).toContain('cooldown'));
    }
  });

  it('usa i manubri quando disponibili e l’obiettivo è la forza', () => {
    const c = config({ goal: 'forza', equipment: ['manubri'], level: 2 });
    const main = generatePlan(c, 3).sessions.flatMap((s) => s.main);
    expect(main.some((id) => EXERCISE_BY_ID[id].equipment.includes('manubri'))).toBe(true);
  });

  it('rispetta i tempi di lavoro e riposo scelti nella parte centrale', () => {
    const c = config({ workSec: 50, restSec: 25 });
    const s = generatePlan(c, 1).sessions[0];
    const main = buildSteps(s, c).filter((st) => st.phase === 'main');
    expect(main.filter((st) => st.kind === 'work').every((st) => st.durationSec === 50)).toBe(true);
    expect(main.filter((st) => st.kind === 'rest').every((st) => st.durationSec === 25)).toBe(true);
  });
});

describe('modifica della sessione', () => {
  const c = config({ equipment: ['manubri'] });
  const session = generatePlan(c, 8).sessions[0];

  it('sostituisce un esercizio con un’alternativa compatibile', () => {
    const alts = alternativesFor(session, 'main', 0, c);
    expect(alts.length).toBeGreaterThan(0);
    alts.forEach((a) => expect(isEligible(a, c)).toBe(true));
    expect(alts.map((a) => a.id)).not.toContain(session.main[0]);
    const updated = replaceExercise(session, 'main', 0, alts[0].id);
    expect(updated.main[0]).toBe(alts[0].id);
    expect(updated.main.slice(1)).toEqual(session.main.slice(1));
  });

  it('rimuove un esercizio mantenendo la durata della sessione', () => {
    const updated = removeExercise(session, 'main', 1);
    expect(updated.main).toHaveLength(session.main.length - 1);
    expect(totalDuration(buildSteps(updated, c))).toBe(c.sessionMinutes * 60);
  });

  it('mantiene la durata anche togliendo tutto il riscaldamento', () => {
    let s = session;
    while (s.warmup.length) s = removeExercise(s, 'warmup', 0);
    expect(totalDuration(buildSteps(s, c))).toBe(c.sessionMinutes * 60);
  });

  it('rigenera la sessione mantenendo giorno e tipo', () => {
    const regen = regenerateSession(session, c, 999);
    expect(regen.id).toBe(session.id);
    expect(regen.weekday).toBe(session.weekday);
    expect(regen.dayType).toBe(session.dayType);
  });
});
