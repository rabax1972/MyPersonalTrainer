/*
 * Timer della sessione basato su timestamp assoluti.
 *
 * Lo stato memorizza solo quando è iniziato lo step corrente (e quando è stata
 * messa la pausa): il tempo trascorso si ricalcola sempre da `now`. Così, se il
 * telefono blocca i timer in background (chiamata, cambio app, schermo spento),
 * al ritorno il timer è comunque coerente e avanza degli step trascorsi.
 * Tutte le funzioni sono pure: ricevono e restituiscono uno stato serializzabile.
 */

export interface TimerState {
  stepIndex: number;
  /** Timestamp (ms) di inizio dello step corrente, al netto delle pause. */
  stepStartedAt: number;
  /** Timestamp (ms) di inizio pausa, oppure null se in esecuzione. */
  pausedAt: number | null;
  finished: boolean;
}

export interface TimerSnapshot {
  stepIndex: number;
  elapsedInStepMs: number;
  remainingInStepMs: number;
  totalElapsedMs: number;
  totalRemainingMs: number;
  totalMs: number;
  paused: boolean;
  finished: boolean;
}

/** Dopo questa soglia "indietro" riavvia lo step corrente invece di tornare al precedente. */
export const BACK_RESTART_THRESHOLD_MS = 3000;

export function startTimer(now: number): TimerState {
  return { stepIndex: 0, stepStartedAt: now, pausedAt: null, finished: false };
}

const effectiveNow = (state: TimerState, now: number) => state.pausedAt ?? now;

/** Avanza lo stato oltre gli step già conclusi in base al tempo trascorso. */
export function resolve(state: TimerState, durationsSec: number[], now: number): TimerState {
  if (state.finished) return state;
  let { stepIndex, stepStartedAt } = state;
  const t = effectiveNow(state, now);
  while (stepIndex < durationsSec.length && t - stepStartedAt >= durationsSec[stepIndex] * 1000) {
    stepStartedAt += durationsSec[stepIndex] * 1000;
    stepIndex++;
  }
  if (stepIndex >= durationsSec.length) {
    return { ...state, stepIndex: durationsSec.length - 1, stepStartedAt, finished: true };
  }
  if (stepIndex === state.stepIndex && stepStartedAt === state.stepStartedAt) return state;
  return { ...state, stepIndex, stepStartedAt };
}

export function snapshot(state: TimerState, durationsSec: number[], now: number): TimerSnapshot {
  const s = resolve(state, durationsSec, now);
  const totalMs = durationsSec.reduce((a, d) => a + d * 1000, 0);
  if (s.finished) {
    return {
      stepIndex: s.stepIndex, elapsedInStepMs: durationsSec[s.stepIndex] * 1000, remainingInStepMs: 0,
      totalElapsedMs: totalMs, totalRemainingMs: 0, totalMs, paused: false, finished: true,
    };
  }
  const durMs = durationsSec[s.stepIndex] * 1000;
  const elapsed = Math.min(durMs, Math.max(0, effectiveNow(s, now) - s.stepStartedAt));
  const before = durationsSec.slice(0, s.stepIndex).reduce((a, d) => a + d * 1000, 0);
  return {
    stepIndex: s.stepIndex,
    elapsedInStepMs: elapsed,
    remainingInStepMs: durMs - elapsed,
    totalElapsedMs: before + elapsed,
    totalRemainingMs: totalMs - before - elapsed,
    totalMs,
    paused: s.pausedAt !== null,
    finished: false,
  };
}

export function pause(state: TimerState, durationsSec: number[], now: number): TimerState {
  const s = resolve(state, durationsSec, now);
  if (s.finished || s.pausedAt !== null) return s;
  return { ...s, pausedAt: now };
}

export function resume(state: TimerState, now: number): TimerState {
  if (state.finished || state.pausedAt === null) return state;
  return { ...state, stepStartedAt: state.stepStartedAt + (now - state.pausedAt), pausedAt: null };
}

/** Porta all'inizio dello step `index`, mantenendo lo stato di pausa. */
export function goTo(state: TimerState, durationsSec: number[], index: number, now: number): TimerState {
  if (index >= durationsSec.length) {
    return { ...state, stepIndex: durationsSec.length - 1, finished: true, pausedAt: null };
  }
  const i = Math.max(0, index);
  return { stepIndex: i, stepStartedAt: now, pausedAt: state.pausedAt === null ? null : now, finished: false };
}

export function skip(state: TimerState, durationsSec: number[], now: number): TimerState {
  const s = resolve(state, durationsSec, now);
  if (s.finished) return s;
  return goTo(s, durationsSec, s.stepIndex + 1, now);
}

export function back(state: TimerState, durationsSec: number[], now: number): TimerState {
  const s = resolve(state, durationsSec, now);
  const elapsed = effectiveNow(s, now) - s.stepStartedAt;
  if (s.finished) return goTo(s, durationsSec, durationsSec.length - 1, now);
  if (elapsed > BACK_RESTART_THRESHOLD_MS || s.stepIndex === 0) return goTo(s, durationsSec, s.stepIndex, now);
  return goTo(s, durationsSec, s.stepIndex - 1, now);
}
