/** Generatore pseudo-casuale con seme (mulberry32): stesse scelte a parità di seme. */
export function createRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Sceglie un elemento con probabilità proporzionale al peso. */
export function weightedPick<T>(items: T[], weight: (item: T) => number, rng: () => number): T | undefined {
  const weights = items.map((i) => Math.max(0, weight(i)));
  const total = weights.reduce((s, w) => s + w, 0);
  if (items.length === 0 || total <= 0) return undefined;
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}
