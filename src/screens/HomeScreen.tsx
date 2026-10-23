import { useMemo } from 'react';
import { DisclaimerNote } from '../components/Disclaimer';
import { getExercise } from '../data/exercises';
import { GOAL_LABELS, LEVEL_LABELS } from '../data/labels';
import type { PlannedSession } from '../data/types';
import { navigate } from '../hooks/useRoute';
import { useStartSession } from '../hooks/useStartSession';
import { dateKey, startOfWeek, weekdayIndex } from '../lib/dates';
import { WEEKDAY_NAMES } from '../lib/planGenerator';
import { buildSteps, totalDuration } from '../lib/sessionBuilder';
import { snapshot } from '../lib/timer';
import { useStore } from '../store';

const asset = (p: string) => `${import.meta.env.BASE_URL}${p}`;

export function HomeScreen() {
  const { plan, history, active, setActive, addHistory } = useStore();
  const start = useStartSession();
  const today = weekdayIndex();
  const todayKey = dateKey();
  const weekStartKey = dateKey(startOfWeek(new Date()));

  const doneThisWeek = useMemo(
    () => new Set(history.filter((h) => h.date >= weekStartKey && h.sessionId).map((h) => h.sessionId)),
    [history, weekStartKey],
  );
  const trainedToday = history.some((h) => h.date === todayKey);

  if (!plan) {
    return (
      <div className="screen">
        <div className="hero">
          <img src={asset('icons/icon-192.png')} alt="" width={96} height={96} />
          <h1>Il tuo personal trainer</h1>
          <p>Allenamenti guidati a casa, con timer, animazioni e indicazioni passo passo. Funziona anche offline.</p>
          <button className="btn btn-primary btn-lg btn-block" onClick={() => navigate('/setup')}>
            Configura l’allenamento
          </button>
        </div>
        <DisclaimerNote />
      </div>
    );
  }

  const activeSnap = active
    ? snapshot(active.timer, buildSteps(active.session, active.config).map((s) => s.durationSec), Date.now())
    : null;
  const sorted = [...plan.sessions].sort((a, b) => a.weekday - b.weekday);
  const todaySession = sorted.find((s) => s.weekday === today);
  const { config } = plan;

  const markDone = (s: PlannedSession) => {
    addHistory({ date: todayKey, title: s.title, durationSec: config.sessionMinutes * 60, source: 'manuale', sessionId: s.id });
  };

  return (
    <div className="screen">
      <header className="home-header">
        <div>
          <p className="muted">{new Date().toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <h1>Il tuo piano</h1>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/setup')}>Modifica</button>
      </header>

      <p className="plan-summary">
        {config.daysPerWeek} giorni · {config.sessionMinutes} min · {LEVEL_LABELS[config.level]} · {GOAL_LABELS[config.goal].label}
      </p>

      {active && activeSnap && !activeSnap.finished && (
        <div className="card card-accent">
          <strong>Sessione in corso: {active.session.title}</strong>
          <p className="muted">Mancano {Math.ceil(activeSnap.totalRemainingMs / 60000)} min</p>
          <div className="row">
            <button className="btn btn-primary" onClick={() => navigate('/run')}>Riprendi</button>
            <button className="btn btn-ghost" onClick={() => setActive(null)}>Abbandona</button>
          </div>
        </div>
      )}
      {active && activeSnap?.finished && (
        <div className="card card-accent">
          <strong>La sessione “{active.session.title}” è terminata mentre l’app era chiusa.</strong>
          <div className="row">
            <button className="btn btn-primary" onClick={() => {
              addHistory({ date: dateKey(new Date(active.startedAt)), title: active.session.title, durationSec: active.config.sessionMinutes * 60, source: 'app', sessionId: active.session.id });
              setActive(null);
            }}>Segna come fatta</button>
            <button className="btn btn-ghost" onClick={() => setActive(null)}>Scarta</button>
          </div>
        </div>
      )}

      {todaySession ? (
        <div className="card today-card">
          <p className="eyebrow">Oggi · {WEEKDAY_NAMES[today]}</p>
          <h2>{todaySession.title}</h2>
          <SessionMeta session={todaySession} />
          {doneThisWeek.has(todaySession.id) || trainedToday ? (
            <p className="done-badge">✓ Fatto oggi, ottimo lavoro!</p>
          ) : null}
          <button className="btn btn-primary btn-lg btn-block" onClick={() => start(todaySession)}>▶ Inizia allenamento</button>
          <div className="row">
            <button className="btn btn-ghost" onClick={() => navigate(`/edit/${todaySession.id}`)}>Vedi / modifica</button>
            {!trainedToday && <button className="btn btn-ghost" onClick={() => markDone(todaySession)}>Segna come fatta</button>}
          </div>
        </div>
      ) : (
        <div className="card">
          <p className="eyebrow">Oggi · {WEEKDAY_NAMES[today]}</p>
          <h2>Giorno di riposo 😌</h2>
          <p className="muted">Il recupero fa parte dell’allenamento. Se vuoi, puoi comunque fare una sessione qui sotto.</p>
        </div>
      )}

      <h2 className="list-title">Settimana</h2>
      <ul className="session-list">
        {sorted.map((s) => (
          <li key={s.id} className={`card session-card ${s.weekday === today ? 'is-today' : ''}`}>
            <div className="session-card-main" onClick={() => navigate(`/edit/${s.id}`)}>
              <p className="eyebrow">{WEEKDAY_NAMES[s.weekday]}{doneThisWeek.has(s.id) && ' · ✓ fatta'}</p>
              <h3>{s.title}</h3>
              <SessionMeta session={s} />
            </div>
            <div className="row">
              <button className="btn btn-primary" onClick={() => start(s)} aria-label={`Inizia ${s.title}`}>▶ Inizia</button>
              <button className="btn btn-ghost" onClick={() => navigate(`/edit/${s.id}`)}>Modifica</button>
              {!doneThisWeek.has(s.id) && <button className="btn btn-ghost" onClick={() => markDone(s)}>Fatta</button>}
            </div>
          </li>
        ))}
      </ul>

      <DisclaimerNote />
    </div>
  );
}

export function SessionMeta({ session }: { session: PlannedSession }) {
  const { config } = useStore();
  if (!config) return null;
  const minutes = Math.round(totalDuration(buildSteps(session, config)) / 60);
  const muscles = [...new Set(session.main.flatMap((id) => getExercise(id).primaryMuscles))].slice(0, 4).join(', ');
  return (
    <p className="muted">
      {minutes} min · {session.main.length} esercizi{muscles ? ` · ${muscles}` : ''}
    </p>
  );
}
