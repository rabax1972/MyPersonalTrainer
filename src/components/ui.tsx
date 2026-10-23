import type { ReactNode } from 'react';
import { goBack } from '../hooks/useRoute';

export function Header({ title, back, right }: { title: string; back?: boolean | string; right?: ReactNode }) {
  return (
    <header className="header">
      {back ? (
        <button className="icon-btn" onClick={() => goBack(typeof back === 'string' ? back : '/')} aria-label="Indietro">
          ←
        </button>
      ) : (
        <span className="header-spacer" />
      )}
      <h1>{title}</h1>
      {right ?? <span className="header-spacer" />}
    </header>
  );
}

export function ChipGroup<T extends string | number>({
  options, value, onChange, multiple = false, label,
}: {
  options: { value: T; label: string; hint?: string }[];
  value: T | T[];
  onChange: (v: T) => void;
  multiple?: boolean;
  label: string;
}) {
  const selected = (v: T) => (Array.isArray(value) ? value.includes(v) : value === v);
  return (
    <div className="chips" role={multiple ? 'group' : 'radiogroup'} aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role={multiple ? 'checkbox' : 'radio'}
          aria-checked={selected(o.value)}
          className={`chip ${selected(o.value) ? 'chip-on' : ''}`}
          onClick={() => onChange(o.value)}
        >
          <span>{o.label}</span>
          {o.hint && <small>{o.hint}</small>}
        </button>
      ))}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <label className="toggle-row">
      <span>
        <span className="toggle-label">{label}</span>
        {hint && <small className="muted block">{hint}</small>}
      </span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle" aria-hidden="true" />
    </label>
  );
}

export function Stepper({ value, onChange, min, max, step = 5, unit, label }: {
  value: number; onChange: (v: number) => void; min: number; max: number; step?: number; unit: string; label: string;
}) {
  return (
    <div className="stepper" role="group" aria-label={label}>
      <button type="button" className="icon-btn big" onClick={() => onChange(Math.max(min, value - step))} aria-label={`Diminuisci ${label}`} disabled={value <= min}>
        −
      </button>
      <output aria-live="polite">
        {value} <small>{unit}</small>
      </output>
      <button type="button" className="icon-btn big" onClick={() => onChange(Math.min(max, value + step))} aria-label={`Aumenta ${label}`} disabled={value >= max}>
        +
      </button>
    </div>
  );
}

export function Section({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {hint && <p className="muted">{hint}</p>}
      {children}
    </section>
  );
}
