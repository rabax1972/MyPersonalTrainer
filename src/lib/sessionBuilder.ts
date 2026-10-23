import type { DayType, Phase, PlannedSession, SessionStep, UserConfig } from '../data/types';

/** Conto alla rovescia iniziale prima del primo esercizio. */
export const PREPARE_SEC = 10;
/** Pausa breve tra gli esercizi di riscaldamento e defaticamento. */
export const TRANSITION_SEC = 5;

export interface PhaseBudget {
  warmup: number;
  main: number;
  cooldown: number;
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Ripartisce la durata della sessione: ~15% riscaldamento, ~12% defaticamento, il resto parte centrale. */
export function phaseBudget(sessionMinutes: number): PhaseBudget {
  const total = Math.round(sessionMinutes * 60);
  const warmup = clamp(Math.round(total * 0.15), 120, 420);
  const cooldown = clamp(Math.round(total * 0.12), 90, 360);
  return { warmup, cooldown, main: total - warmup - cooldown };
}

/** Numero di esercizi di riscaldamento/defaticamento (circa 45 s ciascuno). */
export function easyPhaseCount(budgetSec: number): number {
  return clamp(Math.round(budgetSec / 45), 2, 8);
}

/** Numero di esercizi diversi nella parte centrale. */
export function mainExerciseCount(sessionMinutes: number, goal: UserConfig['goal']): number {
  const base = sessionMinutes <= 10 ? 4 : sessionMinutes <= 20 ? 5 : sessionMinutes <= 30 ? 6 : sessionMinutes <= 45 ? 7 : 8;
  return goal === 'forza' ? Math.max(3, base - 1) : base;
}

/** Tempi di lavoro/riposo effettivi: nelle giornate di mobilità le tenute sono più lunghe e le pause brevi. */
export function intervalsFor(dayType: DayType, config: UserConfig): { work: number; rest: number } {
  if (dayType === 'mobility') {
    return { work: Math.max(config.workSec, 40), rest: Math.min(config.restSec, 15) };
  }
  return { work: config.workSec, rest: config.restSec };
}

/** Divide `total` secondi in `n` parti intere che sommano esattamente a `total`. */
function splitEvenly(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

/**
 * Costruisce la sequenza di step (preparazione, lavoro, riposo) di una sessione.
 * La somma delle durate è esattamente `sessionMinutes * 60`: il tempo che avanza
 * dalla parte centrale (che procede a intervalli interi lavoro+riposo) viene
 * aggiunto al defaticamento.
 */
export function buildSteps(session: PlannedSession, config: UserConfig): SessionStep[] {
  const total = Math.round(config.sessionMinutes * 60);
  const budget = phaseBudget(config.sessionMinutes);
  const { work, rest } = intervalsFor(session.dayType, config);
  const steps: SessionStep[] = [];

  const hasWarmup = session.warmup.length > 0;
  const hasMain = session.main.length > 0;
  const hasCooldown = session.cooldown.length > 0;
  if (!hasWarmup && !hasMain && !hasCooldown) return steps;

  // Le fasi vuote cedono il loro tempo alla parte centrale (o al defaticamento).
  let warmBudget = hasWarmup ? budget.warmup : 0;
  let mainBudget = budget.main + (hasWarmup ? 0 : budget.warmup);
  let coolBudget = hasCooldown ? budget.cooldown : 0;
  if (!hasCooldown) mainBudget += budget.cooldown;
  if (!hasMain) {
    if (hasCooldown) coolBudget += mainBudget;
    else warmBudget += mainBudget;
    mainBudget = 0;
  }

  const pushEasyPhase = (phase: Phase, ids: string[], phaseSec: number, firstPause: number) => {
    const pauses = firstPause + (ids.length - 1) * TRANSITION_SEC;
    const works = splitEvenly(phaseSec - pauses, ids.length);
    ids.forEach((exerciseId, i) => {
      const common = { phase, exerciseId, position: i + 1, phaseCount: ids.length };
      steps.push({ ...common, kind: 'prepare', durationSec: i === 0 ? firstPause : TRANSITION_SEC });
      steps.push({ ...common, kind: 'work', durationSec: works[i] });
    });
  };

  if (hasWarmup) pushEasyPhase('warmup', session.warmup, warmBudget, PREPARE_SEC);

  if (hasMain) {
    const k = session.main.length;
    const slot = work + rest;
    const firstRest = hasWarmup ? rest : PREPARE_SEC;
    const n = Math.max(1, Math.floor((mainBudget - firstRest + rest) / slot));
    const totalRounds = Math.ceil(n / k);
    let used = 0;
    for (let i = 0; i < n; i++) {
      const common = {
        phase: 'main' as const,
        exerciseId: session.main[i % k],
        round: Math.floor(i / k) + 1,
        totalRounds,
        position: (i % k) + 1,
        phaseCount: k,
      };
      const pause = i === 0 ? firstRest : rest;
      const kind = i === 0 && !hasWarmup ? 'prepare' : 'rest';
      steps.push({ ...common, kind, durationSec: pause });
      steps.push({ ...common, kind: 'work', durationSec: work });
      used += pause + work;
    }
    const leftover = mainBudget - used;
    if (hasCooldown) coolBudget += leftover;
    else steps[steps.length - 1].durationSec += leftover;
  }

  if (hasCooldown) pushEasyPhase('cooldown', session.cooldown, coolBudget, TRANSITION_SEC);

  // Rete di sicurezza: la somma deve coincidere con la durata scelta.
  const sum = steps.reduce((s, st) => s + st.durationSec, 0);
  if (sum !== total) steps[steps.length - 1].durationSec += total - sum;
  return steps;
}

export function totalDuration(steps: SessionStep[]): number {
  return steps.reduce((s, st) => s + st.durationSec, 0);
}
