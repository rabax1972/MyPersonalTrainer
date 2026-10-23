import type { Equipment, Goal, Level, Limitation, Phase } from './types';

export const LEVEL_LABELS: Record<Level, string> = { 1: 'Principiante', 2: 'Intermedio', 3: 'Avanzato' };

export const GOAL_LABELS: Record<Goal, { label: string; hint: string }> = {
  dimagrire: { label: 'Dimagrire', hint: 'Circuiti cardio e HIIT' },
  tonificare: { label: 'Tonificare', hint: 'Forza e resistenza' },
  forza: { label: 'Forza', hint: 'Meno esercizi, più serie' },
  mobilita: { label: 'Mobilità e stretching', hint: 'Flessibilità e postura' },
  totalbody: { label: 'Total body', hint: 'Tutto il corpo ogni volta' },
};

export const EQUIPMENT_LABELS: Record<Equipment, string> = {
  tappetino: 'Tappetino',
  manubri: 'Manubri',
  elastici: 'Elastici',
  sbarra: 'Sbarra per trazioni',
};

export const LIMITATION_LABELS: Record<Limitation, string> = {
  ginocchia: 'Ginocchia',
  schiena: 'Schiena',
  spalle: 'Spalle',
  polsi: 'Polsi',
  salti: 'Niente salti',
};

export const PHASE_LABELS: Record<Phase, string> = {
  warmup: 'Riscaldamento',
  main: 'Parte centrale',
  cooldown: 'Defaticamento',
};
