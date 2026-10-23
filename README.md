# Il Mio Personal Trainer

PWA in italiano per allenarsi a casa: piano settimanale generato dalle tue preferenze,
sessioni guidate con animazioni, timer, avvisi sonori/vocali, storico e statistiche.
Funziona completamente offline dopo il primo caricamento. Nessun server: i dati restano sul telefono.

> ⚠️ L'app non sostituisce il parere di un medico o di un preparatore. In caso di dolore interrompi l'esercizio.

## Avvio in locale

Requisiti: [Node.js](https://nodejs.org) 20 o superiore.

```bash
npm install        # una volta sola
npm run dev        # server di sviluppo su http://localhost:5173
npm test           # test di generatore piani e timer
npm run build      # build di produzione in dist/
npm run preview    # prova del build (con service worker) su http://localhost:4173
```

Per provarla sul telefono nella stessa rete Wi-Fi: `npm run dev -- --host` e apri dal telefono
l'indirizzo `http://<IP-del-PC>:5173`. Nota: service worker, installazione e wake lock richiedono
HTTPS, quindi per la prova completa conviene pubblicarla (vedi sotto).

## Struttura

```
public/exercises/<id>/0.webp,1.webp   immagini degli esercizi (generate dallo script)
public/icons/                         icone PWA
scripts/build_exercise_images.py      scarica il dataset e converte le immagini in WebP
src/data/exercises.ts                 80 esercizi tradotti (nomi, istruzioni, consigli, media)
src/data/types.ts                     modello dati
src/lib/planGenerator.ts              generatore del piano settimanale e delle sessioni
src/lib/sessionBuilder.ts             timeline della sessione (durata esatta)
src/lib/timer.ts                      timer basato su timestamp (coerente in background)
src/lib/feedback.ts                   beep, vibrazione, sintesi vocale
src/lib/reminders.ts, src/sw.ts       promemoria e service worker (offline)
src/screens/                          schermate
tests/                                test Vitest
```

### Cambiare l'animazione di un esercizio

In `src/data/exercises.ts` aggiungi il campo `media` all'esercizio e metti il file in `public/media/`:

```ts
media: { type: 'video', src: 'media/squat.mp4', poster: 'media/squat.jpg' }
media: { type: 'gif', src: 'media/squat.gif' }
media: { type: 'lottie', src: 'media/squat.json' }
```

### Rigenerare le immagini

```bash
pip install pillow
npm run images            # clona il dataset in .free-exercise-db/ e converte le immagini usate
```

## Pubblicazione gratuita

### Opzione A: GitHub Pages (automatica)

1. Crea un repository su GitHub (es. `my-personal-trainer`).
2. Dalla cartella del progetto:
   ```bash
   git init
   git add .
   git commit -m "Prima versione"
   git branch -M main
   git remote add origin https://github.com/<tuo-utente>/my-personal-trainer.git
   git push -u origin main
   ```
3. Su GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
4. Il workflow `.github/workflows/deploy.yml` esegue test e build a ogni push. Dopo 1-2 minuti l'app è su
   `https://<tuo-utente>.github.io/my-personal-trainer/`.

### Opzione B: Netlify

- **Senza account Git**: esegui `npm run build` e trascina la cartella `dist` su
  <https://app.netlify.com/drop>.
- **Con Git**: su Netlify scegli *Add new site → Import from Git*, seleziona il repository:
  il file `netlify.toml` imposta già comando di build e cartella.

## Installazione su Android

1. Apri l'indirizzo pubblicato con **Chrome** sul telefono.
2. Attendi qualche secondo che la pagina finisca di caricare (scarica anche le immagini per l'offline).
3. Tocca il menu **⋮** in alto a destra → **Installa app** (oppure **Aggiungi a schermata Home**).
4. Conferma: l'icona compare nella schermata Home e l'app si apre a schermo intero, anche senza rete.

Consigli: nelle impostazioni dell'app attiva suoni, vibrazione e, se vuoi, la voce guida. Per i promemoria
attiva l'opzione dalle Impostazioni con l'app installata e consenti le notifiche.

## Crediti

Esercizi e immagini da [free-exercise-db](https://github.com/yuhonas/free-exercise-db)
(The Unlicense, pubblico dominio), basato su [exercises.json](https://github.com/wrkout/exercises.json).
