import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CircularTimer } from '../components/CircularTimer';
import { ExerciseMedia } from '../components/ExerciseMedia';
import { getExercise } from '../data/exercises';
import { PHASE_LABELS } from '../data/labels';
import type { SessionStep } from '../data/types';
import { navigate } from '../hooks/useRoute';
import { useWakeLock } from '../hooks/useWakeLock';
import { dateKey, formatDuration } from '../lib/dates';
import { countdownBeep, phaseSound, speak, unlockAudio, vibrate } from '../lib/feedback';
import { buildSteps } from '../lib/sessionBuilder';
import { back, pause, resume, skip, snapshot, type TimerState } from '../lib/timer';
import type { ActiveSession } from '../lib/storage';
import { useStore } from '../store';

const TICK_MS = 200;

export function RunScreen() {
  const { active } = useStore();
  const [completed, setCompleted] = useState<{ title: string; minutes: number } | null>(null);

  if (completed) return <CompletedView {...completed} />;
  if (!active) {
    return (
      <div className="screen">
        <p>Nessuna sessione in corso.</p>
        <button className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>Torna al piano</button>
      </div>
    );
  }
  return <Runner active={active} onCompleted={setCompleted} />;
}

function announcement(step: SessionStep, prev: SessionStep | undefined): string {
  const name = getExercise(step.exerciseId).name;
  const phaseIntro = !prev || prev.phase !== step.phase ? `${PHASE_LABELS[step.phase]}. ` : '';
  if (step.kind === 'work') return `${phaseIntro}Via! ${name}`;
  if (step.kind === 'prepare') return `${phaseIntro}Preparati: ${name}`;
  return `${phaseIntro}Riposo. Prossimo: ${name}`;
}

function Runner({ active, onCompleted }: { active: ActiveSession; onCompleted: (c: { title: string; minutes: number }) => void }) {
  const { settings, setActive, addHistory } = useStore();
  const steps = useMemo(() => buildSteps(active.session, active.config), [active.session, active.config]);
  const durations = useMemo(() => steps.map((s) => s.durationSec), [steps]);
  const [timer, setTimerState] = useState<TimerState>(active.timer);
  const [now, setNow] = useState(() => Date.now());
  const [confirmEnd, setConfirmEnd] = useState(false);

  useWakeLock(true);

  // Ogni modifica (pausa, salta…) viene salvata: se la pagina si chiude, la sessione riprende da qui.
  const setTimer = useCallback((t: TimerState) => {
    setTimerState(t);
    setActive({ ...active, timer: t });
  }, [active, setActive]);

  // Il "tick" serve solo a ridisegnare: il tempo si calcola sempre dai timestamp.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), TICK_MS);
    const onVisible = () => setNow(Date.now());
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  const snap = snapshot(timer, durations, now);
  const step = steps[snap.stepIndex];
  const exercise = getExercise(step.exerciseId);
  const remainingSec = Math.ceil(snap.remainingInStepMs / 1000);
  const isWork = step.kind === 'work';

  // Avvisi: cambio fase, ultimi 3 secondi, cambio lato a metà degli esercizi unilaterali.
  const cue = useRef({ index: -1, sec: -1, halfDone: false });
  useEffect(() => {
    if (snap.finished) return;
    const c = cue.current;
    const visible = document.visibilityState === 'visible';
    if (c.index !== snap.stepIndex) {
      const first = c.index === -1;
      cue.current = { index: snap.stepIndex, sec: remainingSec, halfDone: snap.elapsedInStepMs >= snap.remainingInStepMs };
      if (!visible) return;
      if (!first && settings.sound) phaseSound(isWork ? 'work' : 'rest');
      if (!first && settings.vibration) vibrate(isWork ? [200, 80, 200] : 300);
      if (settings.voice) speak(announcement(step, steps[snap.stepIndex - 1]));
      return;
    }
    if (!snap.paused && visible && remainingSec !== c.sec && remainingSec >= 1 && remainingSec <= 3) {
      if (settings.sound) countdownBeep();
      if (settings.vibration) vibrate(60);
    }
    c.sec = remainingSec;
    if (isWork && exercise.unilateral && !c.halfDone && snap.elapsedInStepMs >= snap.remainingInStepMs) {
      c.halfDone = true;
      if (!visible) return;
      if (settings.sound) phaseSound('work');
      if (settings.vibration) vibrate([100, 60, 100]);
      if (settings.voice) speak('Cambia lato');
    }
  }, [snap.stepIndex, remainingSec, snap.paused, snap.finished, snap.elapsedInStepMs, snap.remainingInStepMs, step, steps, isWork, exercise.unilateral, settings]);

  // Fine sessione: salva nello storico.
  const finishedRef = useRef(false);
  useEffect(() => {
    if (!snap.finished || finishedRef.current) return;
    finishedRef.current = true;
    if (settings.sound) phaseSound('end');
    if (settings.vibration) vibrate([300, 100, 300, 100, 500]);
    if (settings.voice) speak('Allenamento completato. Ottimo lavoro!');
    const total = durations.reduce((a, d) => a + d, 0);
    addHistory({ date: dateKey(), title: active.session.title, durationSec: total, source: 'app', sessionId: active.session.id });
    setActive(null);
    onCompleted({ title: active.session.title, minutes: Math.round(total / 60) });
  }, [snap.finished, settings, durations, addHistory, active.session, setActive, onCompleted]);

  // Precarica le immagini del prossimo esercizio diverso.
  const nextExercise = steps.slice(snap.stepIndex + 1).find((s) => s.exerciseId !== step.exerciseId)?.exerciseId;
  useEffect(() => {
    if (!nextExercise) return;
    const m = getExercise(nextExercise).media;
    if (m.type === 'frames') m.frames.forEach((f) => { new Image().src = `${import.meta.env.BASE_URL}${f}`; });
  }, [nextExercise]);

  const t = () => Date.now();
  const onPauseToggle = () => {
    unlockAudio();
    setTimer(snap.paused ? resume(timer, t()) : pause(timer, durations, t()));
  };
  const onSkip = () => { unlockAudio(); setTimer(skip(timer, durations, t())); };
  const onBack = () => { unlockAudio(); setTimer(back(timer, durations, t())); };

  const endSession = (saveIt: boolean) => {
    if (saveIt) {
      addHistory({ date: dateKey(), title: active.session.title, durationSec: Math.round(snap.totalElapsedMs / 1000), source: 'app', sessionId: active.session.id });
    }
    window.speechSynthesis?.cancel();
    setActive(null);
    navigate('/', { replace: true });
  };

  if (snap.finished) return null;

  const progress = snap.totalElapsedMs / snap.totalMs;
  const counter = step.phase === 'main'
    ? `Esercizio ${step.position}/${step.phaseCount} · Giro ${step.round}/${step.totalRounds}`
    : `${step.position}/${step.phaseCount}`;
  const kindLabel = step.kind === 'work' ? (exercise.unilateral && snap.elapsedInStepMs >= snap.remainingInStepMs ? 'Cambia lato' : 'Lavoro')
    : step.kind === 'prepare' ? 'Preparati' : 'Riposo';

  return (
    <div className={`run run-${step.kind} ${snap.paused ? 'is-paused' : ''}`}>
      <div className="run-top">
        <div className="progress" role="progressbar" aria-label="Avanzamento sessione" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
          <div className="progress-bar" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="run-top-row">
          <span className="run-phase">{PHASE_LABELS[step.phase]}</span>
          <span className="run-total" aria-label="Tempo totale rimanente">⏱ {formatDuration(snap.totalRemainingMs / 1000)}</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setConfirmEnd(true)}>Termina</button>
        </div>
      </div>

      <div className="run-media">
        <ExerciseMedia exercise={exercise} playing={!snap.paused} />
        {!isWork && <span className="media-badge">Prossimo</span>}
      </div>

      <div className="run-main">
        <div className="run-title">
          <p className="run-kind">{kindLabel}</p>
          <h1>{exercise.name}</h1>
          <p className="muted">{exercise.primaryMuscles.concat(exercise.secondaryMuscles).slice(0, 4).join(' · ')}</p>
          <p className="run-counter">{counter}</p>
        </div>
        <CircularTimer remainingMs={snap.remainingInStepMs} durationMs={step.durationSec * 1000}
          variant={step.kind} size={150} label={snap.paused ? 'in pausa' : undefined} />
      </div>

      <div className="run-cues">
        <ul>{exercise.cues.map((c) => <li key={c}>{c}</li>)}</ul>
        <p className="mistake"><strong>Errore comune:</strong> {exercise.commonMistake}</p>
        {exercise.note && <p className="muted">ℹ️ {exercise.note}</p>}
        <p className="muted small">In caso di dolore interrompi l’esercizio.</p>
      </div>

      <div className="run-controls">
        <button className="ctrl" onClick={onBack} aria-label="Torna indietro">⏮<span>Indietro</span></button>
        <button className="ctrl ctrl-main" onClick={onPauseToggle} aria-label={snap.paused ? 'Riprendi' : 'Pausa'}>
          {snap.paused ? '▶' : '⏸'}<span>{snap.paused ? 'Riprendi' : 'Pausa'}</span>
        </button>
        <button className="ctrl" onClick={onSkip} aria-label="Salta">⏭<span>Salta</span></button>
      </div>

      {confirmEnd && (
        <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="end-title">
          <div className="modal">
            <h2 id="end-title">Terminare la sessione?</h2>
            <p>Hai completato {formatDuration(snap.totalElapsedMs / 1000)} su {formatDuration(snap.totalMs / 1000)}.</p>
            {snap.totalElapsedMs >= 60_000 ? (
              <button className="btn btn-primary btn-block" onClick={() => endSession(true)}>Termina e salva nello storico</button>
            ) : (
              <p className="muted">Meno di un minuto: la sessione non verrà salvata.</p>
            )}
            <button className="btn btn-ghost btn-block" onClick={() => endSession(false)}>Esci senza salvare</button>
            <button className="btn btn-ghost btn-block" onClick={() => setConfirmEnd(false)} autoFocus>Continua l’allenamento</button>
          </div>
        </div>
      )}
    </div>
  );
}

function CompletedView({ title, minutes }: { title: string; minutes: number }) {
  return (
    <div className="screen completed">
      <div className="hero">
        <div className="big-emoji" aria-hidden="true">🎉</div>
        <h1>Allenamento completato!</h1>
        <p>{title} · {minutes} minuti</p>
        <p className="muted">Salvato nello storico. Ricorda di bere e di recuperare.</p>
        <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/', { replace: true })}>Torna al piano</button>
        <button className="btn btn-ghost btn-block" onClick={() => navigate('/history', { replace: true })}>Vedi lo storico</button>
      </div>
    </div>
  );
}
