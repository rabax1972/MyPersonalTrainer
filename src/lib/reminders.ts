/*
 * Promemoria nei giorni di allenamento.
 *
 * Senza un server non si possono programmare notifiche a un orario preciso.
 * Si usa quindi la Periodic Background Sync (Chrome per Android, solo con l'app
 * installata): il browser risveglia periodicamente il service worker, che mostra
 * una notifica se oggi è un giorno di allenamento, è passata l'ora scelta e la
 * sessione non è ancora stata fatta. La frequenza dipende dal browser, quindi il
 * promemoria è "al meglio delle possibilità". Se non supportata, la funzione
 * viene semplicemente disattivata.
 */

export const REMINDER_CACHE = 'mpt-reminders';
export const REMINDER_URL = 'reminder-config.json';
export const REMINDER_TAG = 'mpt-reminder';

export interface ReminderConfig {
  enabled: boolean;
  hour: number;
  /** 0 = lunedì … 6 = domenica */
  weekdays: number[];
  /** Date (YYYY-MM-DD) in cui ci si è già allenati. */
  doneDates: string[];
}

interface PeriodicSyncManager {
  register(tag: string, options: { minInterval: number }): Promise<void>;
  unregister(tag: string): Promise<void>;
}

export interface ReminderSupport {
  notifications: boolean;
  periodicSync: boolean;
}

export async function reminderSupport(): Promise<ReminderSupport> {
  const notifications = 'Notification' in window && 'serviceWorker' in navigator;
  let periodicSync = false;
  if (notifications) {
    const reg = await navigator.serviceWorker.getRegistration();
    periodicSync = !!reg && 'periodicSync' in reg;
  }
  return { notifications, periodicSync };
}

export async function writeReminderConfig(config: ReminderConfig): Promise<void> {
  if (!('caches' in window)) return;
  const cache = await caches.open(REMINDER_CACHE);
  await cache.put(REMINDER_URL, new Response(JSON.stringify(config), { headers: { 'Content-Type': 'application/json' } }));
}

/** Attiva i promemoria. Restituisce un messaggio per l'utente. */
export async function enableReminders(config: ReminderConfig): Promise<{ ok: boolean; message: string }> {
  const support = await reminderSupport();
  if (!support.notifications) {
    return { ok: false, message: 'Questo browser non supporta le notifiche: i promemoria non sono disponibili.' };
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { ok: false, message: 'Permesso per le notifiche negato. Puoi abilitarlo dalle impostazioni del browser.' };
  }
  await writeReminderConfig(config);
  const reg = await navigator.serviceWorker.ready;
  if ('periodicSync' in reg) {
    try {
      await (reg as ServiceWorkerRegistration & { periodicSync: PeriodicSyncManager }).periodicSync.register(
        REMINDER_TAG, { minInterval: 4 * 60 * 60 * 1000 },
      );
      return { ok: true, message: 'Promemoria attivi. Il telefono li mostrerà nei giorni di allenamento.' };
    } catch {
      // Di solito: app non installata nella schermata Home.
    }
  }
  return {
    ok: true,
    message: 'Notifiche consentite, ma il promemoria in background richiede l’app installata (Chrome su Android). Nel frattempo vedrai l’avviso quando apri l’app.',
  };
}

export async function disableReminders(config: ReminderConfig): Promise<void> {
  await writeReminderConfig({ ...config, enabled: false });
  if (!('serviceWorker' in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration();
  if (reg && 'periodicSync' in reg) {
    try {
      await (reg as ServiceWorkerRegistration & { periodicSync: PeriodicSyncManager }).periodicSync.unregister(REMINDER_TAG);
    } catch {
      // ignora
    }
  }
}
