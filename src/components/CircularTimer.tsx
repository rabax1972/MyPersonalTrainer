interface Props {
  remainingMs: number;
  durationMs: number;
  variant: 'work' | 'rest' | 'prepare';
  size?: number;
  label?: string;
}

/** Timer circolare con conto alla rovescia in secondi. */
export function CircularTimer({ remainingMs, durationMs, variant, size = 200, label }: Props) {
  const stroke = Math.round(size * 0.08);
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = durationMs > 0 ? remainingMs / durationMs : 0;
  const seconds = Math.ceil(remainingMs / 1000);
  const display = seconds >= 60 ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : String(seconds);

  return (
    <div className={`timer timer-${variant}`} style={{ width: size, height: size }} role="timer" aria-live="off" aria-label={`${seconds} secondi rimanenti`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="timer-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} fill="none" />
        <circle
          className="timer-progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="timer-center">
        <span className="timer-value" style={{ fontSize: size * (display.length > 2 ? 0.26 : 0.36) }}>{display}</span>
        {label && <span className="timer-label">{label}</span>}
      </div>
    </div>
  );
}
