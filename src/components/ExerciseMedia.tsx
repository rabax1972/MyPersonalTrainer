import { useEffect, useRef, useState } from 'react';
import type { Exercise } from '../data/types';

const asset = (path: string) => `${import.meta.env.BASE_URL}${path}`;

interface Props {
  exercise: Exercise;
  /** Se falso l'animazione si ferma (pausa o anteprima statica). */
  playing: boolean;
  className?: string;
}

/**
 * Mostra l'animazione di un esercizio in base al tipo di media definito nel file dati:
 * - frames: immagini alternate in loop con crossfade, al ritmo dell'esercizio
 * - gif / video / lottie: riprodotti in loop
 */
export function ExerciseMedia({ exercise, playing, className = '' }: Props) {
  const { media } = exercise;
  const label = `Animazione: ${exercise.name}`;
  switch (media.type) {
    case 'frames':
      return <FramesAnimation exercise={exercise} frames={media.frames} crossfadeMs={media.crossfadeMs} playing={playing} className={className} />;
    case 'gif':
      return (
        <div className={`media ${className}`}>
          <img src={asset(media.src)} alt={label} />
        </div>
      );
    case 'video':
      return <VideoMedia src={asset(media.src)} poster={media.poster && asset(media.poster)} playing={playing} label={label} className={className} />;
    case 'lottie':
      return <LottieMedia src={asset(media.src)} playing={playing} label={label} className={className} />;
  }
}

function FramesAnimation({ exercise, frames, crossfadeMs, playing, className }: {
  exercise: Exercise; frames: string[]; crossfadeMs?: number; playing: boolean; className: string;
}) {
  const [frame, setFrame] = useState(0);
  // Mezza ripetizione per immagine: partenza → arrivo → partenza in `tempoSec` secondi.
  // Gli esercizi di tenuta alternano più lentamente.
  const holdMs = Math.max(1000, (exercise.tempoSec * 1000) / 2);
  const fadeMs = crossfadeMs ?? Math.min(900, holdMs * 0.8);

  useEffect(() => setFrame(0), [exercise.id]);

  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const id = window.setInterval(() => setFrame((f) => (f + 1) % frames.length), holdMs);
    return () => window.clearInterval(id);
  }, [playing, holdMs, frames.length, exercise.id]);

  return (
    <div className={`media frames ${className}`} role="img" aria-label={`Animazione: ${exercise.name}`}>
      {frames.map((src, i) => (
        <img
          key={src}
          src={asset(src)}
          alt=""
          decoding="async"
          draggable={false}
          style={{ opacity: i === frame ? 1 : 0, transitionDuration: `${fadeMs}ms` }}
        />
      ))}
    </div>
  );
}

function VideoMedia({ src, poster, playing, label, className }: {
  src: string; poster?: string; playing: boolean; label: string; className: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (playing) void v.play().catch(() => undefined);
    else v.pause();
  }, [playing, src]);
  return (
    <div className={`media ${className}`}>
      <video ref={ref} src={src} poster={poster} loop muted playsInline aria-label={label} />
    </div>
  );
}

function LottieMedia({ src, playing, label, className }: { src: string; playing: boolean; label: string; className: string }) {
  const container = useRef<HTMLDivElement>(null);
  const anim = useRef<{ play(): void; pause(): void; destroy(): void } | null>(null);

  useEffect(() => {
    let disposed = false;
    // Caricata solo quando serve, per non appesantire l'avvio.
    void import('lottie-web').then(({ default: lottie }) => {
      if (disposed || !container.current) return;
      anim.current = lottie.loadAnimation({ container: container.current, path: src, loop: true, autoplay: true, renderer: 'svg' });
    });
    return () => {
      disposed = true;
      anim.current?.destroy();
      anim.current = null;
    };
  }, [src]);

  useEffect(() => {
    if (playing) anim.current?.play();
    else anim.current?.pause();
  }, [playing]);

  return <div ref={container} className={`media ${className}`} role="img" aria-label={label} />;
}
