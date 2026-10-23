import { useMemo, useState } from 'react';
import { Header } from '../components/ui';
import { addDays, dateKey, formatLongDate, startOfWeek } from '../lib/dates';
import { computeStats } from '../lib/stats';
import { useStore } from '../store';

const WEEK_HEAD = ['L', 'M', 'M', 'G', 'V', 'S', 'D'];

export function HistoryScreen() {
  const { history, plan, addHistory, removeHistory } = useStore();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [adding, setAdding] = useState(false);
  const stats = useMemo(() => computeStats(history), [history]);
  const byDate = useMemo(() => {
    const m = new Map<string, number>();
    history.forEach((h) => m.set(h.date, (m.get(h.date) ?? 0) + 1));
    return m;
  }, [history]);

  const todayKey = dateKey();
  const gridStart = startOfWeek(month);
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const lastRowNeeded = cells.findIndex((d, i) => i % 7 === 0 && d.getMonth() !== month.getMonth() && d > month);
  const visibleCells = lastRowNeeded > 0 ? cells.slice(0, lastRowNeeded) : cells;
  const monthLabel = month.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
  const recent = [...history].sort((a, b) => b.date.localeCompare(a.date) || b.completedAt.localeCompare(a.completedAt));

  return (
    <div className="screen">
      <Header title="Storico" />

      <div className="stats-grid">
        <Stat value={stats.thisWeek} label="questa settimana" />
        <Stat value={stats.weeklyAverage.toLocaleString('it-IT')} label="media a settimana (4 sett.)" />
        <Stat value={stats.totalMinutes} label="minuti totali" />
        <Stat value={stats.currentStreak} label={stats.currentStreak === 1 ? 'giorno di fila' : 'giorni di fila'} />
        <Stat value={stats.bestStreak} label="serie migliore" />
        <Stat value={stats.totalSessions} label="sessioni totali" />
      </div>

      <section className="card calendar">
        <div className="calendar-head">
          <button className="icon-btn" aria-label="Mese precedente" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>‹</button>
          <h2>{monthLabel}</h2>
          <button className="icon-btn" aria-label="Mese successivo" onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>›</button>
        </div>
        <div className="calendar-grid" role="grid">
          {WEEK_HEAD.map((d, i) => <span key={i} className="calendar-dow" aria-hidden="true">{d}</span>)}
          {visibleCells.map((d) => {
            const key = dateKey(d);
            const count = byDate.get(key) ?? 0;
            const inMonth = d.getMonth() === month.getMonth();
            return (
              <span key={key} role="gridcell"
                className={`calendar-day ${inMonth ? '' : 'out'} ${count ? 'done' : ''} ${key === todayKey ? 'today' : ''}`}
                aria-label={`${formatLongDate(key)}${count ? `, ${count} allenament${count > 1 ? 'i' : 'o'}` : ''}`}>
                {d.getDate()}
              </span>
            );
          })}
        </div>
      </section>

      {adding ? (
        <ManualEntry
          titles={[...new Set(plan?.sessions.map((s) => s.title) ?? [])]}
          defaultMinutes={plan?.config.sessionMinutes ?? 20}
          onCancel={() => setAdding(false)}
          onSave={(date, title, minutes) => {
            addHistory({ date, title, durationSec: minutes * 60, source: 'manuale' });
            setAdding(false);
          }}
        />
      ) : (
        <button className="btn btn-ghost btn-block" onClick={() => setAdding(true)}>+ Segna un allenamento fatto</button>
      )}

      <h2 className="list-title">Allenamenti</h2>
      {recent.length === 0 && <p className="muted">Ancora nessun allenamento. Il primo è il più importante!</p>}
      <ul className="history-list">
        {recent.map((h) => (
          <li key={h.id} className="history-item">
            <div>
              <strong>{h.title}</strong>
              <small className="muted block">
                {formatLongDate(h.date)} · {Math.round(h.durationSec / 60)} min{h.source === 'manuale' ? ' · segnato a mano' : ''}
              </small>
            </div>
            <button className="icon-btn" aria-label={`Elimina ${h.title} del ${formatLongDate(h.date)}`}
              onClick={() => window.confirm('Eliminare questo allenamento dallo storico?') && removeHistory(h.id)}>🗑</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  return (
    <div className="stat">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function ManualEntry({ titles, defaultMinutes, onSave, onCancel }: {
  titles: string[]; defaultMinutes: number; onSave: (date: string, title: string, minutes: number) => void; onCancel: () => void;
}) {
  const [date, setDate] = useState(dateKey());
  const [title, setTitle] = useState(titles[0] ?? 'Allenamento');
  const [minutes, setMinutes] = useState(defaultMinutes);
  return (
    <form className="card form" onSubmit={(e) => { e.preventDefault(); onSave(date, title.trim() || 'Allenamento', minutes); }}>
      <h2>Segna un allenamento</h2>
      <label>Data<input type="date" value={date} max={dateKey()} onChange={(e) => setDate(e.target.value)} required /></label>
      <label>Allenamento
        <input list="session-titles" value={title} onChange={(e) => setTitle(e.target.value)} />
        <datalist id="session-titles">{titles.map((t) => <option key={t} value={t} />)}</datalist>
      </label>
      <label>Minuti<input type="number" inputMode="numeric" min={1} max={300} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 1)} /></label>
      <div className="row">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>Annulla</button>
        <button type="submit" className="btn btn-primary btn-grow">Salva</button>
      </div>
    </form>
  );
}
