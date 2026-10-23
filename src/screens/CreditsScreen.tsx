import { EXERCISES } from '../data/exercises';
import { DISCLAIMER_TEXT } from '../components/Disclaimer';
import { Header, Section } from '../components/ui';

export function CreditsScreen() {
  return (
    <div className="screen credits">
      <Header title="Crediti" back="/settings" />

      <Section title="Esercizi e immagini">
        <p>
          I {EXERCISES.length} esercizi, le istruzioni originali (in inglese) e le immagini provengono dal dataset{' '}
          <a href="https://github.com/yuhonas/free-exercise-db" target="_blank" rel="noreferrer">free-exercise-db</a>{' '}
          di yuhonas, basato a sua volta su{' '}
          <a href="https://github.com/wrkout/exercises.json" target="_blank" rel="noreferrer">exercises.json</a>{' '}
          di Ollie Jennings.
        </p>
        <p>
          <strong>Licenza: The Unlicense (pubblico dominio).</strong> Il dataset è dedicato al pubblico dominio e può
          essere copiato, modificato e distribuito liberamente, anche per uso commerciale, senza obbligo di attribuzione.
          Lo citiamo comunque per riconoscenza.
        </p>
        <p className="muted">
          Modifiche apportate in questa app: selezione di un sottoinsieme di esercizi, traduzione e adattamento in italiano
          di nomi e istruzioni, aggiunta di indicazioni tecniche ed errori comuni, conversione delle immagini in WebP
          ridimensionato e animazione a dissolvenza tra le due pose.
        </p>
        <details>
          <summary>Testo della licenza (The Unlicense)</summary>
          <p className="license">
            This is free and unencumbered software released into the public domain. Anyone is free to copy, modify,
            publish, use, compile, sell, or distribute this software, either in source code form or as a compiled
            binary, for any purpose, commercial or non-commercial, and by any means. In jurisdictions that recognize
            copyright laws, the author or authors of this software dedicate any and all copyright interest in the
            software to the public domain. […] THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND.
            For more information, please refer to <a href="https://unlicense.org" target="_blank" rel="noreferrer">unlicense.org</a>.
          </p>
        </details>
      </Section>

      <Section title="Software">
        <p>Realizzata con React, Vite, Workbox (vite-plugin-pwa) e lottie-web, tutti con licenza MIT.</p>
      </Section>

      <Section title="Avvertenza">
        <p className="disclaimer">{DISCLAIMER_TEXT}</p>
      </Section>
    </div>
  );
}
