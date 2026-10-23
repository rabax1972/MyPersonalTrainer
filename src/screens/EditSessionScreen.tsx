import { useState } from 'react';
import { EXERCISES, getExercise } from '../data/exercises';
import { EQUIPMENT_LABELS, PHASE_LABELS } from '../data/labels';
import type { Exercise, Phase, PlannedSession } from '../data/types';
import { Header } from '../components/ui';
import { navigate } from '../hooks/useRoute';
import { useStartSession } from '../hooks/useStartSession';
import { alternativesFor, isEligible, regenerateSession, removeExercise, replaceExercise, WEEKDAY_NAMES } from '../lib/planGenerator';
import { buildSteps, intervalsFor, totalDuration } from '../lib/sessionBuilder';
import { useStore } from '../store';

const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;
const PHASES: Phase[] = ['warmup', 'main', 'cooldown'];

type Picker = { phase: Phase; index: number | null } | null;

export function EditSessionScreen({ id }: { id: string }) {
  const { plan, config, updateSession } = useStore();
  const start = useStartSession();
  const [picker, setPicker] = useState<Picker>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const session = plan?.sessions.find((s) => s.id === id);

  if (!session || !config) {
    return (
      <div className="screen">
        <Header title="Sessione" back />
        <p>Sessione non trovata.</p>
        <button className="btn btn-primary" onClick={() => navigate('/', { replace: true })}>Torna al piano</button>
      </div>
    );
  }

  const steps = buildSteps(session, config);
  const { work, rest } = intervalsFor(session.dayType, config);
  const rounds = steps.find((s) => s.phase === 'main')?.totalRounds ?? 0;
  const save = (s: PlannedSession) => updateSession(s);

  const choose = (exerciseId: string) => {
    if (!picker) return;
    if (picker.index === null) save({ ...session, [picker.phase]: [...session[picker.phase], exerciseId] });
    else save(replaceExercise(session, picker.phase, picker.index, exerciseId));
    setPicker(null);
  };

  if (picker) {
    const inSession = new Set([...session.warmup, ...session.main, ...session.cooldown]);
    const options: Exercise[] = picker.index === null
      ? EXERCISES.filter((e) => e.roles.includes(picker.phase) && isEligible(e, config) && !inSession.has(e.id))
      : alternativesFor(session, picker.phase, picker.index, config);
    return (
      <div className="screen">
        <Header title={picker.index === null ? 'Aggiungi esercizio' : 'Sostituisci esercizio'} right={
          <button className="btn btn-ghost" onClick={() => setPicker(null)}>Annulla</button>
        } />
        {options.length === 0 && <p className="muted">Nessun esercizio compatibile con attrezzatura, livello e limitazioni.</p>}
        <ul className="exercise-list">
          {options.map((e) => (
            <li key={e.id}>
              <button className="exercise-row" onClick={() => choose(e.id)}>
                <Thumb exercise={e} />
                <span className="exercise-row-text">
                  <strong>{e.name}</strong>
                  <small className="muted">{e.primaryMuscles.join(', ')}{e.equipment.length ? ` · ${e.equipment.map((q) => EQUIPMENT_LABELS[q]).join(', ')}` : ''}</small>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="screen">
      <Header title={session.title} back />
      <p className="plan-summary">
        {WEEKDAY_NAMES[session.weekday]} · {Math.round(totalDuration(steps) / 60)} min · lavoro {work}s / riposo {rest}s · {rounds} {rounds === 1 ? 'giro' : 'giri'}
      </p>

      {PHASES.map((phase) => (
        <section key={phase} className="section">
          <h2>{PHASE_LABELS[phase]}</h2>
          {session[phase].length === 0 && <p className="muted">Nessun esercizio: il tempo viene assegnato alle altre fasi.</p>}
          <ul className="exercise-list">
            {session[phase].map((exId, index) => {
              const e = getExercise(exId);
              const key = `${phase}-${index}`;
              const open = expanded === key;
              return (
                <li key={key} className="exercise-item">
                  <button className="exercise-row" onClick={() => setExpanded(open ? null : key)} aria-expanded={open}>
                    <Thumb exercise={e} />
                    <span className="exercise-row-text">
                      <strong>{e.name}</strong>
                      <small className="muted">{e.primaryMuscles.join(', ')}{e.unilateral ? ' · per lato' : ''}</small>
                    </span>
                  </button>
                  {open && (
                    <div className="exercise-details">
                      <ol>{e.instructions.map((i) => <li key={i}>{i}</li>)}</ol>
                      {e.note && <p className="muted">ℹ️ {e.note}</p>}
                    </div>
                  )}
                  <div className="row row-tight">
                    <button className="btn btn-ghost btn-sm" onClick={() => setPicker({ phase, index })}>⇄ Sostituisci</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => save(removeExercise(session, phase, index))}>✕ Rimuovi</button>
                  </div>
                </li>
              );
            })}
          </ul>
          <button className="btn btn-ghost btn-sm" onClick={() => setPicker({ phase, index: null })}>+ Aggiungi</button>
        </section>
      ))}

      <div className="sticky-bottom row">
        <button className="btn btn-ghost" onClick={() => save(regenerateSession(session, config))}>↻ Rigenera</button>
        <button className="btn btn-primary btn-grow" onClick={() => start(session)}>▶ Inizia</button>
      </div>
    </div>
  );
}

function Thumb({ exercise }: { exercise: Exercise }) {
  const src = exercise.media.type === 'frames' ? exercise.media.frames[0] : exercise.media.type === 'video' ? exercise.media.poster : undefined;
  return src ? <img className="thumb" src={asset(src)} alt="" loading="lazy" decoding="async" /> : <span className="thumb" />;
}
