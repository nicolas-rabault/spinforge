import { describe, expect, it } from 'vitest';
import { lerp, snapshotById, takeSnapshot } from './snapshot';
import { createInitialMeta } from '../sim/meta';
import { createRun } from '../sim/sim';

describe('takeSnapshot', () => {
  it('reprend salle, phase, identité, position, spin et le drapeau joueur', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    const snap = takeSnapshot(run);

    expect(snap.salle).toBe(run.salle);
    expect(snap.phase).toBe(run.phase);

    const player = snap.tops[0];
    expect(player.id).toBe('player');
    expect(player.isPlayer).toBe(true);
    expect(player.x).toBe(run.player.pos.x);
    expect(player.y).toBe(run.player.pos.y);
    expect(player.spin).toBe(run.player.spin);
  });

  it('les bots suivent le joueur, dans le même ordre que run.bots', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    expect(run.bots.length).toBeGreaterThan(0); // sinon ce test ne prouve rien

    const snap = takeSnapshot(run);
    expect(snap.tops.slice(1).map((t) => t.id)).toEqual(run.bots.map((b) => b.id));
    expect(snap.tops.slice(1).every((t) => t.isPlayer === false)).toBe(true);
  });

  // --- decayPerTick : c'est la ligne que cette tâche livre (snap() appelle
  // désormais decayPerTick(top) au lieu de recopier top.spinDecay). Sans ce
  // test, un retour silencieux à `spinDecay: top.spinDecay` ne casserait
  // aucun test existant : combat.test.ts teste decayPerTick() isolément,
  // observer.test.ts fabrique ses instantanés à la main sans jamais passer
  // par snap(). ---

  it('decayPerTick vaut la décroissance nominale pour une toupie ordinaire', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    // Talents neutres au rang de départ : spinDecayMult = 1, la valeur
    // nominale et la valeur brute spinDecay coïncident encore ici — le test
    // suivant (talent qui module) est celui qui les distingue vraiment.
    const snap = takeSnapshot(run);
    const player = snap.tops[0];
    expect(player.decayPerTick).toBeGreaterThan(0);
    expect(player.decayPerTick).toBeCloseTo(run.player.spinDecay * run.player.talents.spinDecayMult, 10);
  });

  it('decayPerTick vaut 0 quand la décroissance du joueur est suspendue (Relance)', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    run.player.decayPauseTicks = 5;

    const snap = takeSnapshot(run);
    expect(snap.tops[0].decayPerTick).toBe(0);
  });

  it('decayPerTick porte la valeur modulée par un talent (Cœur Gyre), pas la valeur brute spinDecay', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    run.player.talents = { ...run.player.talents, spinDecayMult: 0.5 };

    const snap = takeSnapshot(run);
    expect(snap.tops[0].decayPerTick).toBeCloseTo(run.player.spinDecay * 0.5, 10);
    // La valeur brute (non modulée) aurait été le double : c'est elle que
    // l'ancien champ spinDecay aurait exposée, et qu'observe() aurait
    // retranchée à tort.
    expect(snap.tops[0].decayPerTick).not.toBeCloseTo(run.player.spinDecay, 5);
  });
});

describe('snapshotById', () => {
  it('indexe les instantanés par id', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    const snap = takeSnapshot(run);

    const byId = snapshotById(snap);
    expect(byId.size).toBe(snap.tops.length);
    expect(byId.get('player')).toBe(snap.tops[0]);
  });
});

describe('lerp', () => {
  it('interpole linéairement entre deux valeurs', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(4, 8, 0.25)).toBeCloseTo(5, 10);
  });
});
