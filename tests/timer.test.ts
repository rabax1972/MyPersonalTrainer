import { describe, expect, it } from 'vitest';
import { back, pause, resolve, resume, skip, snapshot, startTimer } from '../src/lib/timer';

const D = [10, 30, 20, 30]; // durate degli step in secondi (totale 90 s)
const T0 = 1_000_000;
const s = (sec: number) => T0 + sec * 1000;

describe('timer basato su timestamp', () => {
  it('calcola step e tempo rimanente dal tempo trascorso', () => {
    const st = startTimer(T0);
    expect(snapshot(st, D, s(0))).toMatchObject({ stepIndex: 0, remainingInStepMs: 10_000, totalRemainingMs: 90_000 });
    expect(snapshot(st, D, s(4))).toMatchObject({ stepIndex: 0, remainingInStepMs: 6_000 });
    expect(snapshot(st, D, s(10))).toMatchObject({ stepIndex: 1, remainingInStepMs: 30_000, totalElapsedMs: 10_000 });
    expect(snapshot(st, D, s(45))).toMatchObject({ stepIndex: 2, remainingInStepMs: 15_000, totalRemainingMs: 45_000 });
  });

  it('resta coerente dopo un lungo periodo in background (nessun tick intermedio)', () => {
    const st = startTimer(T0);
    // Nessuna chiamata per 65 s, come se l'app fosse stata sospesa durante una telefonata.
    const snap = snapshot(st, D, s(65));
    expect(snap.stepIndex).toBe(3);
    expect(snap.remainingInStepMs).toBe(25_000);
  });

  it('termina quando il tempo totale è trascorso', () => {
    const st = startTimer(T0);
    expect(snapshot(st, D, s(90)).finished).toBe(true);
    expect(snapshot(st, D, s(500))).toMatchObject({ finished: true, totalRemainingMs: 0 });
  });

  it('in pausa il tempo non scorre e alla ripresa prosegue da dove era', () => {
    let st = startTimer(T0);
    st = pause(st, D, s(5));
    expect(snapshot(st, D, s(5)).paused).toBe(true);
    // Pausa lunga: lo step non avanza.
    expect(snapshot(st, D, s(300))).toMatchObject({ stepIndex: 0, remainingInStepMs: 5_000 });
    st = resume(st, s(300));
    expect(snapshot(st, D, s(300))).toMatchObject({ stepIndex: 0, remainingInStepMs: 5_000, paused: false });
    expect(snapshot(st, D, s(306))).toMatchObject({ stepIndex: 1, remainingInStepMs: 29_000 });
  });

  it('pausa e ripresa ripetute non accumulano errori', () => {
    let st = startTimer(T0);
    let now = T0;
    for (let i = 0; i < 50; i++) {
      now += 333; // 333 ms di esecuzione
      st = pause(st, D, now);
      now += 1000; // 1 s di pausa
      st = resume(st, now);
    }
    expect(snapshot(st, D, now).totalElapsedMs).toBe(50 * 333);
  });

  it('pausa due volte di fila non sposta il momento della pausa', () => {
    let st = startTimer(T0);
    st = pause(st, D, s(3));
    st = pause(st, D, s(8));
    expect(st.pausedAt).toBe(s(3));
  });

  it('salta allo step successivo ripartendo da zero', () => {
    let st = startTimer(T0);
    st = skip(st, D, s(3));
    expect(snapshot(st, D, s(3))).toMatchObject({ stepIndex: 1, remainingInStepMs: 30_000 });
    st = skip(st, D, s(4));
    expect(snapshot(st, D, s(4))).toMatchObject({ stepIndex: 2, remainingInStepMs: 20_000 });
  });

  it('saltare l’ultimo step termina la sessione', () => {
    let st = startTimer(T0);
    for (let i = 0; i < D.length; i++) st = skip(st, D, s(i));
    expect(st.finished).toBe(true);
  });

  it('indietro: riavvia lo step se è iniziato da più di 3 s, altrimenti torna al precedente', () => {
    let st = startTimer(T0);
    st = skip(st, D, s(1)); // step 1 inizia a 1 s
    expect(snapshot(back(st, D, s(10)), D, s(10))).toMatchObject({ stepIndex: 1, remainingInStepMs: 30_000 });
    expect(snapshot(back(st, D, s(2)), D, s(2))).toMatchObject({ stepIndex: 0, remainingInStepMs: 10_000 });
  });

  it('indietro al primo step lo riavvia', () => {
    const st = startTimer(T0);
    expect(snapshot(back(st, D, s(1)), D, s(1))).toMatchObject({ stepIndex: 0, remainingInStepMs: 10_000 });
  });

  it('saltare in pausa mantiene la pausa', () => {
    let st = startTimer(T0);
    st = pause(st, D, s(2));
    st = skip(st, D, s(5));
    expect(snapshot(st, D, s(60))).toMatchObject({ stepIndex: 1, remainingInStepMs: 30_000, paused: true });
  });

  it('resolve restituisce lo stesso oggetto se non cambia nulla', () => {
    const st = startTimer(T0);
    expect(resolve(st, D, s(2))).toBe(st);
  });

  it('lo stato è serializzabile in JSON (ripristino dopo ricarica della pagina)', () => {
    let st = startTimer(T0);
    st = pause(st, D, s(12));
    const restored = JSON.parse(JSON.stringify(st));
    expect(snapshot(restored, D, s(100))).toEqual(snapshot(st, D, s(100)));
  });
});
