import { describe, expect, it } from 'vitest';
import { observe } from './observer';
import { FEEL } from './feel';
import { TICK_S, SALLES_PER_CHAPTER } from '../sim/config';
import type { Snapshot, TopSnapshot } from './snapshot';

function topSnap(over: Partial<TopSnapshot> = {}): TopSnapshot {
  return {
    id: 'player', x: 0, y: 0,
    spin: 1000, decayPerTick: 20, isPlayer: true, type: 'equilibre',
    ...over,
  };
}

function snapshot(tops: TopSnapshot[], over: Partial<Snapshot> = {}): Snapshot {
  return { salle: 1, phase: 'fighting', tops, ...over };
}

/** Le spin qu'une toupie aurait après un tick sans aucun choc. */
const decayed = (t: TopSnapshot) => t.spin - t.decayPerTick * TICK_S;

describe('observe — chocs', () => {
  it('n’émet rien quand seule la décroissance normale s’applique', () => {
    const before = topSnap();
    const after = topSnap({ spin: decayed(before) });
    expect(observe(snapshot([before]), snapshot([after])).hits).toHaveLength(0);
  });

  it('émet un choc quand la perte dépasse la décroissance', () => {
    const before = topSnap();
    const after = topSnap({ spin: decayed(before) - 35 });
    const { hits } = observe(snapshot([before]), snapshot([after]));
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('player');
    expect(hits[0].power).toBeCloseTo(35 / FEEL.hitReference, 5);
  });

  it('borne la puissance à 1 pour un choc énorme', () => {
    const before = topSnap();
    const after = topSnap({ spin: decayed(before) - FEEL.hitReference * 10 });
    expect(observe(snapshot([before]), snapshot([after])).hits[0].power).toBe(1);
  });

  it('oriente le choc vers la toupie la plus proche', () => {
    const p = topSnap({ id: 'player' });
    const b = topSnap({ id: 'bot-1', x: 24, y: 0, isPlayer: false });
    const after = [topSnap({ id: 'player', spin: decayed(p) - 20 }), topSnap({ id: 'bot-1', x: 24, y: 0, isPlayer: false, spin: decayed(b) })];
    const { hits } = observe(snapshot([p, b]), snapshot(after));
    expect(hits[0].nx).toBeCloseTo(1, 5);
    expect(hits[0].ny).toBeCloseTo(0, 5);
  });

  it('ne prend pas un gain de spin (soin entre salles) pour un choc', () => {
    const before = topSnap();
    const after = topSnap({ spin: before.spin + 200 });
    expect(observe(snapshot([before]), snapshot([after])).hits).toHaveLength(0);
  });
});

describe('observe — morts', () => {
  it('émet une mort pour un bot disparu, à sa dernière position connue', () => {
    const p = topSnap();
    const b = topSnap({ id: 'bot-1', x: 40, y: -30, isPlayer: false, spin: 3 });
    const { deaths } = observe(snapshot([p, b]), snapshot([p]));
    expect(deaths).toHaveLength(1);
    expect(deaths[0]).toMatchObject({ id: 'bot-1', x: 40, y: -30, isPlayer: false });
  });

  it('émet la mort du joueur quand la phase bascule', () => {
    const p = topSnap({ x: 5, y: 6 });
    const { deaths } = observe(snapshot([p]), snapshot([p], { phase: 'dead' }));
    expect(deaths).toHaveLength(1);
    expect(deaths[0]).toMatchObject({ id: 'player', isPlayer: true });
  });
});

describe('observe — progression', () => {
  it('signale un changement de salle', () => {
    const p = topSnap();
    const r = observe(snapshot([p]), snapshot([p], { salle: 2 }));
    expect(r.salleChanged).toBe(true);
    expect(r.bossEntered).toBe(false);
  });

  it('signale l’entrée du boss', () => {
    const p = topSnap();
    const r = observe(
      snapshot([p], { salle: SALLES_PER_CHAPTER - 1 }),
      snapshot([p], { salle: SALLES_PER_CHAPTER }),
    );
    expect(r.bossEntered).toBe(true);
  });

  it('signale la validation du chapitre au retour de la salle 10 vers la salle 1', () => {
    const p = topSnap();
    const boss = snapshot([p], { salle: SALLES_PER_CHAPTER });
    const restart = snapshot([p], { salle: 1 });
    expect(observe(boss, restart).chapterValidated).toBe(true);
    // Une seule fois : l'événement tient à la transition, pas à un drapeau qui resterait levé.
    expect(observe(restart, restart).chapterValidated).toBe(false);
  });

  it('ne signale rien quand rien ne bouge', () => {
    const p = topSnap();
    const r = observe(snapshot([p]), snapshot([p]));
    expect(r).toEqual({ hits: [], deaths: [], salleChanged: false, bossEntered: false, chapterValidated: false });
  });
});

it('ne masque pas un choc quand la décroissance est suspendue', () => {
  const before: Snapshot = {
    salle: 1, phase: 'fighting',
    tops: [
      { id: 'player', x: 0, y: 0, spin: 1000, decayPerTick: 0, isPlayer: true, type: 'equilibre' },
      { id: 'bot-1-0', x: 30, y: 0, spin: 500, decayPerTick: 12, isPlayer: false, type: 'endurance' },
    ],
  };
  const after: Snapshot = {
    salle: 1, phase: 'fighting',
    tops: [
      { id: 'player', x: 0, y: 0, spin: 950, decayPerTick: 0, isPlayer: true, type: 'equilibre' },
      { id: 'bot-1-0', x: 30, y: 0, spin: 500 - 1.2, decayPerTick: 12, isPlayer: false, type: 'endurance' },
    ],
  };
  const events = observe(before, after);
  // Le joueur a perdu 50 sans décroissance : c'est un choc, il doit être vu.
  expect(events.hits.some((h) => h.id === 'player')).toBe(true);
  // Le bot n'a perdu que son endurance : ce n'en est pas un.
  expect(events.hits.some((h) => h.id === 'bot-1-0')).toBe(false);
});
