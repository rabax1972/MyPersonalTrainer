import { useState } from 'react';
import { EQUIPMENT_LABELS, GOAL_LABELS, LEVEL_LABELS, LIMITATION_LABELS } from '../data/labels';
import type { Equipment, Goal, Level, Limitation, UserConfig } from '../data/types';
import { DisclaimerNote } from '../components/Disclaimer';
import { ChipGroup, Header, Section, Stepper } from '../components/ui';
import { navigate } from '../hooks/useRoute';
import { DEFAULT_CONFIG, defaultIntervals, generatePlan } from '../lib/planGenerator';
import { useStore } from '../store';

const MINUTES = [10, 20, 30, 45, 60];

const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function SetupScreen() {
  const { config, plan, setPlan } = useStore();
  const [c, setC] = useState<UserConfig>(config ?? DEFAULT_CONFIG);
  const set = (patch: Partial<UserConfig>) => setC((prev) => ({ ...prev, ...patch }));

  // Cambiando livello o obiettivo si propongono i tempi consigliati (poi modificabili).
  const setLevelGoal = (level: Level, goal: Goal) => set({ level, goal, ...defaultIntervals(level, goal) });

  const submit = () => {
    setPlan(generatePlan(c));
    navigate('/', { replace: true });
  };

  return (
    <div className="screen">
      <Header title={plan ? 'Modifica allenamento' : 'Configura allenamento'} back={!!plan} />

      <Section title="Giorni a settimana">
        <ChipGroup label="Giorni a settimana" options={[1, 2, 3, 4, 5, 6, 7].map((d) => ({ value: d, label: String(d) }))}
          value={c.daysPerWeek} onChange={(daysPerWeek) => set({ daysPerWeek })} />
      </Section>

      <Section title="Durata della sessione">
        <ChipGroup label="Durata" options={MINUTES.map((m) => ({ value: m, label: `${m} min` }))}
          value={c.sessionMinutes} onChange={(sessionMinutes) => set({ sessionMinutes })} />
      </Section>

      <Section title="Livello">
        <ChipGroup label="Livello" options={([1, 2, 3] as Level[]).map((l) => ({ value: l, label: LEVEL_LABELS[l] }))}
          value={c.level} onChange={(level) => setLevelGoal(level, c.goal)} />
      </Section>

      <Section title="Obiettivo">
        <ChipGroup label="Obiettivo"
          options={(Object.keys(GOAL_LABELS) as Goal[]).map((g) => ({ value: g, label: GOAL_LABELS[g].label, hint: GOAL_LABELS[g].hint }))}
          value={c.goal} onChange={(goal) => setLevelGoal(c.level, goal)} />
      </Section>

      <Section title="Attrezzatura disponibile" hint="Nessuna selezione = solo corpo libero. Alcuni esercizi usano una sedia o un gradino.">
        <ChipGroup<Equipment | 'nessuna'> label="Attrezzatura" multiple
          options={[{ value: 'nessuna', label: 'Nessuna' }, ...(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((e) => ({ value: e, label: EQUIPMENT_LABELS[e] }))]}
          value={c.equipment.length ? c.equipment : ['nessuna']}
          onChange={(e) => set({ equipment: e === 'nessuna' ? [] : toggle(c.equipment, e) })} />
      </Section>

      <Section title="Zone da evitare o limitazioni" hint="Gli esercizi che sollecitano queste zone non verranno proposti.">
        <ChipGroup label="Limitazioni" multiple
          options={(Object.keys(LIMITATION_LABELS) as Limitation[]).map((l) => ({ value: l, label: LIMITATION_LABELS[l] }))}
          value={c.limitations} onChange={(l) => set({ limitations: toggle(c.limitations, l) })} />
      </Section>

      <Section title="Tempi della parte centrale" hint="Valori consigliati in base a livello e obiettivo. Puoi modificarli.">
        <div className="stepper-row">
          <span>Lavoro</span>
          <Stepper label="tempo di lavoro" value={c.workSec} onChange={(workSec) => set({ workSec })} min={15} max={120} unit="s" />
        </div>
        <div className="stepper-row">
          <span>Riposo</span>
          <Stepper label="tempo di riposo" value={c.restSec} onChange={(restSec) => set({ restSec })} min={5} max={120} unit="s" />
        </div>
      </Section>

      <DisclaimerNote />

      <div className="sticky-bottom">
        <button className="btn btn-primary btn-block btn-lg" onClick={submit}>
          {plan ? 'Rigenera il piano' : 'Crea il mio piano'}
        </button>
      </div>
    </div>
  );
}
