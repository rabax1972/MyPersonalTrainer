// Modello dati condiviso dall'app.

export type Level = 1 | 2 | 3; // 1 principiante, 2 intermedio, 3 avanzato

export type Goal = 'dimagrire' | 'tonificare' | 'forza' | 'mobilita' | 'totalbody';

/** Attrezzatura richiesta. Il corpo libero non compare: un esercizio senza attrezzatura ha `equipment: []`. */
export type Equipment = 'tappetino' | 'manubri' | 'elastici' | 'sbarra';

export type Limitation = 'ginocchia' | 'schiena' | 'spalle' | 'polsi' | 'salti';

/** In quale parte della sessione può comparire l'esercizio. */
export type Role = 'warmup' | 'main' | 'cooldown';

/** Schema di movimento usato dal generatore per bilanciare la sessione. */
export type Focus = 'push' | 'pull' | 'legs' | 'core' | 'cardio' | 'mobility';

export type Region = 'upper' | 'lower' | 'core' | 'full';

export type Muscle =
  | 'addominali' | 'adduttori' | 'abduttori' | 'bicipiti' | 'polpacci' | 'petto' | 'avambracci'
  | 'glutei' | 'femorali' | 'dorsali' | 'lombari' | 'dorso' | 'collo' | 'quadricipiti'
  | 'spalle' | 'trapezi' | 'tricipiti';

/**
 * Media dell'esercizio. Per sostituire l'animazione basta cambiare questo campo
 * nel file dati: i percorsi sono relativi alla cartella `public/`.
 */
export type ExerciseMedia =
  | { type: 'frames'; frames: string[]; crossfadeMs?: number }
  | { type: 'gif'; src: string }
  | { type: 'video'; src: string; poster?: string }
  | { type: 'lottie'; src: string };

export interface Exercise {
  id: string;
  /** id nel dataset free-exercise-db (cartella immagini). */
  sourceId?: string;
  name: string;
  nameEn?: string;
  primaryMuscles: Muscle[];
  secondaryMuscles: Muscle[];
  roles: Role[];
  focus: Focus;
  region: Region;
  level: Level;
  equipment: Equipment[];
  /** Zone sollecitate: l'esercizio viene escluso se l'utente le indica come limitazione. */
  stress: Limitation[];
  /** Obiettivi per cui l'esercizio è particolarmente indicato (aumenta la probabilità di scelta). */
  goals: Goal[];
  /** Si esegue un lato alla volta: a metà tempo l'app avvisa di cambiare lato. */
  unilateral?: boolean;
  /** Durata di una ripetizione completa in secondi (ritmo dell'animazione). */
  tempoSec: number;
  /** Esercizio statico (tenuta): l'animazione rallenta. */
  isometric?: boolean;
  instructions: string[];
  cues: string[];
  commonMistake: string;
  /** Nota pratica (es. oggetti di casa necessari). */
  note?: string;
  media: ExerciseMedia;
}

export interface UserConfig {
  daysPerWeek: number; // 1-7
  sessionMinutes: number; // 10, 20, 30, 45, 60
  level: Level;
  goal: Goal;
  equipment: Equipment[];
  limitations: Limitation[];
  workSec: number;
  restSec: number;
}

export type DayType = 'full' | 'upper' | 'lower' | 'cardioCore' | 'hiit' | 'mobility';

export interface PlannedSession {
  id: string;
  dayType: DayType;
  title: string;
  /** 0 = lunedì … 6 = domenica */
  weekday: number;
  warmup: string[];
  main: string[];
  cooldown: string[];
  seed: number;
}

export interface WeeklyPlan {
  createdAt: string;
  config: UserConfig;
  sessions: PlannedSession[];
}

export type StepKind = 'prepare' | 'work' | 'rest';
export type Phase = 'warmup' | 'main' | 'cooldown';

export interface SessionStep {
  kind: StepKind;
  phase: Phase;
  durationSec: number;
  /** Esercizio eseguito (work) o in arrivo (prepare/rest). */
  exerciseId: string;
  /** Serie / giro corrente e totale (solo parte centrale). */
  round?: number;
  totalRounds?: number;
  /** Posizione dell'esercizio nella sua fase (1-based) e numero di esercizi della fase. */
  position: number;
  phaseCount: number;
}

export interface HistoryEntry {
  id: string;
  /** Data locale YYYY-MM-DD */
  date: string;
  title: string;
  durationSec: number;
  source: 'app' | 'manuale';
  sessionId?: string;
  completedAt: string;
}

export interface Settings {
  theme: 'system' | 'light' | 'dark';
  sound: boolean;
  vibration: boolean;
  voice: boolean;
  reminders: boolean;
  reminderHour: number;
  disclaimerAccepted: boolean;
}
