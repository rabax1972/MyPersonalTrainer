/// <reference lib="webworker" />
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { clientsClaim } from 'workbox-core';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: Array<{ url: string; revision: string | null }> };

// Tutti i file del build (immagini comprese) vengono salvati alla prima visita: poi l'app funziona offline.
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();
self.skipWaiting();
clientsClaim();

const REMINDER_CACHE = 'mpt-reminders';
const REMINDER_URL = 'reminder-config.json';
const NOTIFIED_URL = 'reminder-last.json';

interface ReminderConfig {
  enabled: boolean;
  hour: number;
  weekdays: number[];
  doneDates: string[];
}

function todayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function maybeNotify(): Promise<void> {
  const cache = await caches.open(REMINDER_CACHE);
  const res = await cache.match(REMINDER_URL);
  if (!res) return;
  const config = (await res.json()) as ReminderConfig;
  const now = new Date();
  const today = todayKey(now);
  const weekday = (now.getDay() + 6) % 7;
  if (!config.enabled || !config.weekdays.includes(weekday) || now.getHours() < config.hour) return;
  if (config.doneDates.includes(today)) return;
  const last = await cache.match(NOTIFIED_URL);
  if (last && (await last.text()) === today) return;
  await self.registration.showNotification('È il tuo giorno di allenamento 💪', {
    body: 'La sessione di oggi ti aspetta. Bastano pochi minuti!',
    icon: 'icons/icon-192.png',
    badge: 'icons/icon-192.png',
    tag: 'mpt-reminder',
  });
  await cache.put(NOTIFIED_URL, new Response(today));
}

self.addEventListener('periodicsync', (event) => {
  const e = event as ExtendableEvent & { tag: string };
  if (e.tag === 'mpt-reminder') e.waitUntil(maybeNotify());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients[0];
      if (existing) return existing.focus();
      return self.clients.openWindow(self.registration.scope);
    }),
  );
});
