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

/** Un méta qui a validé `best` ET qui a de quoi battre le boss : sans cet
 *  équipement, l'autopilote ne dépasse pas la salle 7 en une heure simulée et
 *  les tests du pilier ne peuvent pas échouer, mutation ou pas — ils
 *  observeraient toujours « le boss n'est jamais atteint », vrai pour une
 *  tout autre raison. La Pointe reste d'origine : au rang 11 elle porte la
 *  toupie à ~1300 px/s, très au-dessus du seuil d'éjection, et la descente se
 *  termine hors de l'arène — même choix, et pour la même raison, que
 *  `scripts/verrou.mjs` (`NIVEAU_MAXED`). */
const farmerArme = (best: number, seed = 42): MetaState => {
  const meta = farmer(best, seed);
  for (const slot of ['lame', 'disque', 'noyau'] as const) {
    meta.equipped[slot].rank = 11;
    meta.equipped[slot].level = 400;
  }
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

  // `reopen` doit ouvrir sur `meta.bestChapter`, jamais sur le chapitre
  // suivant (non validé) : sans ce test, une réouverture sur
  // `maxPlayableChapter(meta)` passerait inaperçue — c'est elle qui casse
  // vraiment le pilier « le farm ne progresse jamais » (voir le test suivant).
  it('farme le chapitre validé, jamais le suivant', () => {
    const meta = farmer(1);
    const session = newFarmSession();
    farm(meta, session, 60, 7);
    expect(session.run!.chapter).toBe(1);
  });

  // LE PILIER. Sur un méta désarmé, `reward.chapter` vaut toujours
  // `meta.bestChapter` au moment de l'ouverture — `Math.max(n, n) = n` quoi
  // qu'il arrive, même si `reopen` ouvrait le mauvais chapitre. Armé (voir
  // `farmerArme`), une réouverture sur le chapitre suivant validerait pour de
  // bon ce chapitre-là : c'est ce qui rend ce test sensible à la mutation que
  // détecte aussi « farme le chapitre validé, jamais le suivant ».
  it('ne fait jamais monter bestChapter', () => {
    expect(MAX_CHAPTER).toBeGreaterThan(1); // sinon le test ci-dessous est vide
    const meta = farmerArme(1);
    farm(meta, newFarmSession(), 3600, 7);
    expect(meta.bestChapter).toBe(1);
  });

  it('n’atteint jamais la salle du boss', () => {
    const meta = farmerArme(1);
    const session = newFarmSession();
    farm(meta, session, 3600, 7);
    expect(session.run!.salle).toBeLessThan(SALLES_PER_CHAPTER);
  });

  // Corollaire du précédent : les gemmes ne tombent que du boss. Sur un méta
  // désarmé, le boss n'est de toute façon jamais atteint (équipement de
  // départ, ~salle 7 au mieux) — ce test ne prouverait rien qui lui soit
  // propre ; armé, l'autopilote atteint et bat le boss dès que le garde-fou
  // qui l'en empêche disparaît.
  it('ne rapporte aucune gemme', () => {
    const meta = farmerArme(1);
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
  // payer exactement le même tarif. Chaque petit paquet reçoit une graine
  // DIFFÉRENTE (7 + i) : `seed` ne doit servir qu'à la toute première
  // ouverture de la session — sans cette variation, une réouverture qui
  // reseederait à tort sur `seed` au lieu de suivre le flux tromperait les
  // deux côtés de la même façon et l'égalité resterait vraie par accident.
  it('N petits paquets valent un gros paquet', () => {
    const gros = farm(farmer(1), newFarmSession(), 600, 7);

    const meta = farmer(1);
    const session = newFarmSession();
    const petits = { credits: 0, salles: 0, seconds: 0, bronze: 0 };
    for (let i = 0; i < 60; i++) {
      const r = farm(meta, session, 10, 7 + i);
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

  // Paquets courts (5 ticks) : la descente est encore vivante quand
  // `bestChapter` change. Avec des paquets longs, la mort naturelle en cours
  // de paquet ferait rouvrir la descente par le garde-fou interne à la
  // boucle — non muté ici — qui relit `meta.bestChapter` et masquerait
  // l'absence du contrôle explicite en tête d'appel.
  it('suit bestChapter quand il monte en cours de session', () => {
    const meta = farmer(1);
    const session = newFarmSession();
    farm(meta, session, 0.5, 7); // 5 ticks : la descente vit encore
    expect(session.run!.chapter).toBe(1);
    meta.bestChapter = 2;
    farm(meta, session, 0.5, 7); // doit rouvrir sur le chapitre 2
    expect(session.run!.chapter).toBe(2);
  });
});
