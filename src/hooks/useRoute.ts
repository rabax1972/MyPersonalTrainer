import { useEffect, useState } from 'react';

/*
 * Router minimale basato sull'hash (#/percorso): funziona su qualsiasi hosting
 * statico (GitHub Pages compreso) e il tasto "indietro" di Android torna alla
 * schermata precedente.
 */

const current = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute(): string {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    const onChange = () => {
      setRoute(current());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}

export function navigate(path: string, { replace = false } = {}): void {
  if (replace) window.location.replace(`#${path}`);
  else window.location.hash = path;
}

export function goBack(fallback = '/'): void {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}
