import { describe, expect, it } from 'vitest';
import { farm, newFarmSession } from './farm';
import { createInitialMeta } from './meta';
import { MAX_CHAPTER, SALLES_PER_CHAPTER } from './config';
import type { MetaState } from './types';

/** Un méta qui a validé `best`, prêt à farmer. */
const farmer = (best: number, seed = 42): MetaState => {
  const meta = createInitialMeta(seed);
  meta.bestChapter = best;
  return meta;
};

describe('farm', () => {
  it('ne fait rien tant qu’aucun chapitre n’est validé', () => {
    const meta = farmer(0);
    const report = farm(meta, newFarmSession(), 600, 7);
    expect(report.seconds).toBe(0);
    expect(report.credits).toBe(0);
    expect(meta.credits).toBe(0);
  });

  // LE PILIER. Le chapitre farmé est strictement inférieur à MAX_CHAPTER, sans
  // quoi le test ne pourrait pas échouer même si le farm battait le boss —
  // c'est le piège rencontré au lot A.
  it('ne fait jamais monter bestChapter', () => {
    expect(MAX_CHAPTER).toBeGreaterThan(1); // sinon le test ci-dessous est vide
    const meta = farmer(1);
    farm(meta, newFarmSession(), 3600, 7);
    expect(meta.bestChapter).toBe(1);
  });

  it('n’atteint jamais la salle du boss', () => {
    const meta = farmer(1);
    const session = newFarmSession();
    farm(meta, session, 3600, 7);
    expect(session.run!.salle).toBeLessThan(SALLES_PER_CHAPTER);
  });

  // Corollaire du précédent : les gemmes ne tombent que du boss.
  it('ne rapporte aucune gemme', () => {
    const meta = farmer(1);
    const report = farm(meta, newFarmSession(), 3600, 7);
    expect(report.gems).toBe(0);
    expect(meta.gems).toBe(0);
  });

  it('rapporte des crédits et des coffres', () => {
    const meta = farmer(1);
    const report = farm(meta, newFarmSession(), 600, 7);
    expect(report.credits).toBeGreaterThan(0);
    expect(report.salles).toBeGreaterThan(0);
    expect(report.chests.bronze).toBeGreaterThan(0);
    expect(meta.credits).toBe(report.credits);
  });

  it('rejoue la même chose à graine égale', () => {
    const a = farm(farmer(1), newFarmSession(), 600, 7);
    const b = farm(farmer(1), newFarmSession(), 600, 7);
    expect(a).toEqual(b);
  });

  // LE TEST DE CONTINUITÉ. Il garde la promesse « un seul mécanisme » : l'AUTO
  // appelle farm en petits paquets, le hors-ligne en un seul. Les deux doivent
  // payer exactement le même tarif.
  it('N petits paquets valent un gros paquet', () => {
    const gros = farm(farmer(1), newFarmSession(), 600, 7);

    const meta = farmer(1);
    const session = newFarmSession();
    const petits = { credits: 0, salles: 0, seconds: 0, bronze: 0 };
    for (let i = 0; i < 60; i++) {
      const r = farm(meta, session, 10, 7);
      petits.credits += r.credits;
      petits.salles += r.salles;
      petits.seconds += r.seconds;
      petits.bronze += r.chests.bronze;
    }
    expect(petits.seconds).toBeCloseTo(gros.seconds, 9);
    expect(petits.salles).toBe(gros.salles);
    expect(petits.credits).toBeCloseTo(gros.credits, 9);
    expect(petits.bronze).toBe(gros.chests.bronze);
  });

  // Le report de reste : un taux qui ne tombe pas juste sur le pas de 100 ms ne
  // doit rien perdre. 0,15 s par paquet = un tick et demi.
  it('ne perd pas les fractions de tick entre deux paquets', () => {
    const meta = farmer(1);
    const session = newFarmSession();
    let seconds = 0;
    for (let i = 0; i < 100; i++) seconds += farm(meta, session, 0.15, 7).seconds;
    expect(seconds).toBeCloseTo(15, 9);
  });

  it('suit bestChapter quand il monte en cours de session', () => {
    const meta = farmer(1);
    const session = newFarmSession();
    farm(meta, session, 60, 7);
    expect(session.run!.chapter).toBe(1);
    meta.bestChapter = 2;
    farm(meta, session, 60, 7);
    expect(session.run!.chapter).toBe(2);
  });
});
