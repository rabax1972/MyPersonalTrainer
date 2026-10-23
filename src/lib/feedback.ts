/* Avvisi sonori (Web Audio, nessun file audio), vibrazione e sintesi vocale. */

let ctx: AudioContext | null = null;

/** Va chiamata in risposta a un tocco dell'utente: i browser bloccano l'audio altrimenti. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

function tone(freq: number, startOffset: number, duration: number, volume = 0.25): void {
  if (!ctx) return;
  const t = ctx.currentTime + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(volume, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + duration + 0.02);
}

/** Beep breve degli ultimi 3 secondi. */
export function countdownBeep(): void {
  tone(880, 0, 0.12);
}

/** Suono di cambio fase: ascendente per l'inizio del lavoro, discendente per il riposo. */
export function phaseSound(kind: 'work' | 'rest' | 'end'): void {
  if (kind === 'work') {
    tone(660, 0, 0.12);
    tone(990, 0.13, 0.25);
  } else if (kind === 'rest') {
    tone(740, 0, 0.12);
    tone(520, 0.13, 0.25);
  } else {
    tone(660, 0, 0.15);
    tone(830, 0.16, 0.15);
    tone(990, 0.32, 0.4);
  }
}

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Non supportato (es. iOS): ignora.
  }
}

let italianVoice: SpeechSynthesisVoice | null | undefined;

function pickVoice(): SpeechSynthesisVoice | null {
  if (italianVoice !== undefined && italianVoice !== null) return italianVoice;
  const voices = window.speechSynthesis?.getVoices() ?? [];
  italianVoice = voices.find((v) => v.lang.toLowerCase().startsWith('it')) ?? null;
  return italianVoice;
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string): void {
  if (!speechSupported()) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'it-IT';
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1;
    window.speechSynthesis.speak(u);
  } catch {
    // Sintesi vocale non disponibile.
  }
}
