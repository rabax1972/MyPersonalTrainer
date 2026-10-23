import { useRef, useState } from 'react';
import { DISCLAIMER_TEXT } from '../components/Disclaimer';
import { ChipGroup, Header, Section, Toggle } from '../components/ui';
import { navigate } from '../hooks/useRoute';
import { dateKey } from '../lib/dates';
import { countdownBeep, phaseSound, speak, speechSupported, unlockAudio, vibrate } from '../lib/feedback';
import { disableReminders, enableReminders } from '../lib/reminders';
import { buildBackup, downloadJson, parseBackup } from '../lib/storage';
import { useStore } from '../store';

export function SettingsScreen() {
  const { settings, updateSettings, config, plan, history, replaceAll } = useStore();
  const [message, setMessage] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const reminderConfig = (enabled: boolean, hour = settings.reminderHour) => ({
    enabled, hour, weekdays: plan?.sessions.map((s) => s.weekday) ?? [], doneDates: history.map((h) => h.date),
  });

  const onReminders = async (on: boolean) => {
    if (!on) {
      updateSettings({ reminders: false });
      await disableReminders(reminderConfig(false));
      setMessage('Promemoria disattivati.');
      return;
    }
    const res = await enableReminders(reminderConfig(true));
    updateSettings({ reminders: res.ok });
    setMessage(res.message);
  };

  const onExport = () => {
    downloadJson(`personal-trainer-backup-${dateKey()}.json`, buildBackup({ config, plan, history, settings }));
    setMessage('Backup esportato. Conservalo in un posto sicuro (es. Google Drive).');
  };

  const onImport = async (file: File) => {
    try {
      const data = parseBackup(await file.text());
      if (!window.confirm(`Importare il backup? Sostituirà i dati attuali (${data.history.length} allenamenti nel backup).`)) return;
      replaceAll(data);
      setMessage('Dati importati correttamente.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Importazione non riuscita.');
    }
  };

  const onReset = () => {
    if (!window.confirm('Cancellare tutti i dati (piano, storico, impostazioni)? Ti consigliamo di esportare prima un backup.')) return;
    localStorage.clear();
    window.location.hash = '/';
    window.location.reload();
  };

  return (
    <div className="screen">
      <Header title="Impostazioni" />
      {message && <p className="toast" role="status" onClick={() => setMessage(null)}>{message}</p>}

      <Section title="Allenamento">
        <button className="btn btn-ghost btn-block" onClick={() => navigate('/setup')}>Modifica configurazione e piano</button>
      </Section>

      <Section title="Aspetto">
        <ChipGroup label="Tema" value={settings.theme} onChange={(theme) => updateSettings({ theme })}
          options={[{ value: 'system', label: 'Automatico' }, { value: 'light', label: 'Chiaro' }, { value: 'dark', label: 'Scuro' }]} />
      </Section>

      <Section title="Avvisi durante la sessione">
        <Toggle label="Suoni" hint="Beep negli ultimi 3 secondi e al cambio fase" checked={settings.sound}
          onChange={(sound) => { updateSettings({ sound }); if (sound) { unlockAudio(); countdownBeep(); } }} />
        <Toggle label="Vibrazione" checked={settings.vibration}
          onChange={(vibration) => { updateSettings({ vibration }); if (vibration) vibrate(200); }} />
        <Toggle label="Voce guida" hint={speechSupported() ? 'Annuncia il nome degli esercizi in italiano' : 'Non supportata da questo browser'}
          checked={settings.voice} onChange={(voice) => { updateSettings({ voice }); if (voice) speak('Voce guida attivata'); }} />
        <button className="btn btn-ghost btn-sm" onClick={() => { unlockAudio(); phaseSound('work'); }}>🔊 Prova suono</button>
      </Section>

      <Section title="Promemoria" hint="Notifica nei giorni di allenamento se non hai ancora fatto la sessione. Funziona con l’app installata su Android; altrimenti viene semplicemente ignorata.">
        <Toggle label="Promemoria allenamento" checked={settings.reminders} onChange={(v) => void onReminders(v)} />
        {settings.reminders && (
          <label className="field-row">
            Dalle ore
            <select value={settings.reminderHour} onChange={(e) => {
              const hour = Number(e.target.value);
              updateSettings({ reminderHour: hour });
            }}>
              {Array.from({ length: 17 }, (_, i) => i + 6).map((h) => <option key={h} value={h}>{h}:00</option>)}
            </select>
          </label>
        )}
      </Section>

      <Section title="Backup dei dati" hint="I dati restano solo su questo telefono. Esporta un backup per non perderli.">
        <div className="row">
          <button className="btn btn-ghost btn-grow" onClick={onExport}>⬇ Esporta JSON</button>
          <button className="btn btn-ghost btn-grow" onClick={() => fileRef.current?.click()}>⬆ Importa JSON</button>
        </div>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onImport(f); e.target.value = ''; }} />
      </Section>

      <Section title="Informazioni">
        <p className="disclaimer">{DISCLAIMER_TEXT}</p>
        <button className="btn btn-ghost btn-block" onClick={() => navigate('/credits')}>Crediti e licenze</button>
        <button className="btn btn-danger btn-block" onClick={onReset}>Cancella tutti i dati</button>
      </Section>
    </div>
  );
}
