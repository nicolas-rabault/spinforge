import { describe, expect, it } from 'vitest';
import { createInitialState, resetRun, tick } from './sim';
import { salleReward } from './economy';
import { spawnSalle } from './salle';
import { botCountFor } from './salle';

function runTicks(seed: number, n: number): string {
  const s = createInitialState(seed);
  for (let i = 0; i < n; i++) {
    tick(s, { steer: i % 20 < 10 ? { x: 1, y: 0.5 } : null });
  }
  return JSON.stringify(s);
}

// Force la salle à se vider régulièrement : sans ça, 300 ticks se jouent
// entièrement dans la salle 1 et le déterminisme n'est testé que sur la physique.
function runTicksThroughSalles(seed: number, n: number): string {
  const s = createInitialState(seed);
  for (let i = 0; i < n; i++) {
    if (i % 25 === 24) for (const b of s.bots) b.spin = 0.0001;
    tick(s, { steer: i % 20 < 10 ? { x: 1, y: 0.5 } : null });
  }
  return JSON.stringify(s);
}

describe('createInitialState', () => {
  it('démarre chapitre 1, salle 1, phase fighting, avec les bots de la salle 1', () => {
    const s = createInitialState(42);
    expect(s.chapter).toBe(1);
    expect(s.salle).toBe(1);
    expect(s.phase).toBe('fighting');
    expect(s.bots).toHaveLength(botCountFor(1));
    expect(s.player.spin).toBe(s.player.spinMax);
  });
});

describe('déterminisme', () => {
  it('même seed + mêmes inputs ⇒ états strictement identiques', () => {
    expect(runTicks(42, 300)).toBe(runTicks(42, 300));
  });

  it('seeds différentes ⇒ états différents', () => {
    expect(runTicks(42, 300)).not.toBe(runTicks(7, 300));
  });

  it('reste déterministe à travers les transitions de salle et la validation du chapitre', () => {
    const a = runTicksThroughSalles(42, 300);
    expect(a).toBe(runTicksThroughSalles(42, 300));
    expect(a).not.toBe(runTicksThroughSalles(7, 300));
    // Garde-fou : si ce scénario cessait de franchir des salles, il ne testerait
    // plus rien de plus que le test précédent.
    expect(JSON.parse(a).chapterValidated).toBe(true);
  });
});

describe('progression', () => {
  it('vider une salle crédite la récompense et fait avancer', () => {
    const s = createInitialState(1);
    for (const b of s.bots) b.spin = 0.0001; // le decay du prochain tick les achève
    tick(s, { steer: null });
    expect(s.credits).toBeCloseTo(salleReward(1, false), 5);
    expect(s.salle).toBe(2);
    expect(s.bots).toHaveLength(botCountFor(2));
  });

  it('vider la salle 10 valide le chapitre et repart en salle 1', () => {
    const s = createInitialState(1);
    s.salle = 10;
    const spawned = spawnSalle(10, s.rngState);
    s.bots = spawned.bots;
    s.rngState = spawned.rngState;
    for (const b of s.bots) b.spin = 0.0001;
    tick(s, { steer: null });
    expect(s.chapterValidated).toBe(true);
    expect(s.salle).toBe(1);
    expect(s.credits).toBeCloseTo(salleReward(10, true), 5);
  });

  it('spin à zéro ⇒ mort ; resetRun repart salle 1 en gardant les crédits', () => {
    const s = createInitialState(1);
    s.credits = 500;
    s.player.spin = 0.0001;
    tick(s, { steer: null });
    expect(s.phase).toBe('dead');
    resetRun(s);
    expect(s.phase).toBe('fighting');
    expect(s.salle).toBe(1);
    expect(s.credits).toBe(500);
    expect(s.player.spin).toBe(s.player.spinMax);
  });
});
