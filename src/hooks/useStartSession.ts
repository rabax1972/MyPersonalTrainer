import type { PlannedSession } from '../data/types';
import { unlockAudio } from '../lib/feedback';
import { startTimer } from '../lib/timer';
import { useStore } from '../store';
import { navigate } from './useRoute';

export function useStartSession(): (session: PlannedSession) => void {
  const { active, setActive, config } = useStore();
  return (session) => {
    if (!config) return;
    if (active && !window.confirm('C’è già una sessione in corso. Vuoi abbandonarla e iniziare questa?')) return;
    // Il tocco su "Inizia" sblocca l'audio per i beep successivi.
    unlockAudio();
    setActive({ session, config, timer: startTimer(Date.now()), startedAt: new Date().toISOString() });
    navigate('/run');
  };
}
