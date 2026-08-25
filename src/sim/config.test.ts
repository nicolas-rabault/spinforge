import { describe, expect, it } from 'vitest';
import { BALANCE, BOTS_PER_SALLE, CHESTS, FUSION, SALLES_PER_CHAPTER } from './config';

const SLOTS = ['lame', 'disque', 'pointe', 'noyau'];

describe('balance.json', () => {
  it('a autant d’entrées de bots que de salles par chapitre', () => {
    expect(BOTS_PER_SALLE).toHaveLength(SALLES_PER_CHAPTER);
    expect(BOTS_PER_SALLE.every((n) => Number.isInteger(n) && n >= 1)).toBe(true);
    // La 10ᵉ salle est le boss : un seul adversaire.
    expect(BOTS_PER_SALLE[SALLES_PER_CHAPTER - 1]).toBe(1);
  });

  it('chaque coffre ne tire que des emplacements valides', () => {
    for (const chest of Object.values(CHESTS)) {
      expect(chest.slots.length).toBeGreaterThan(0);
      for (const slot of chest.slots) expect(SLOTS).toContain(slot);
      expect(['credits', 'gems']).toContain(chest.currency);
    }
  });

  it('chaque distribution de rang somme à 1', () => {
    for (const [name, chest] of Object.entries(CHESTS)) {
      const total = chest.ranks.reduce((acc, r) => acc + r.p, 0);
      expect(total, `coffre ${name}`).toBeCloseTo(1, 10);
      expect(chest.ranks.every((r) => Number.isInteger(r.rank) && r.rank >= 1)).toBe(true);
    }
  });

  it('un coffre qui a un pity vise un rang qu’il peut garantir', () => {
    for (const [name, chest] of Object.entries(CHESTS)) {
      if (chest.pityThreshold === 0) continue;
      expect(chest.pityRank, `coffre ${name}`).toBeGreaterThan(0);
      // Le rang garanti doit être le meilleur que le coffre sait produire,
      // sans quoi le pity serait une régression déguisée.
      const best = Math.max(...chest.ranks.map((r) => r.rank));
      expect(chest.pityRank, `coffre ${name}`).toBe(best);
    }
  });

  it('les règles de fusion couvrent tous les rangs, la dernière étant ouverte', () => {
    expect(FUSION.length).toBeGreaterThan(0);
    expect(FUSION[FUSION.length - 1].throughRank).toBe(0);
    const bounded = FUSION.slice(0, -1).map((r) => r.throughRank);
    // Bornes strictement croissantes : sans quoi une règle en masquerait une autre.
    for (let i = 1; i < bounded.length; i++) expect(bounded[i]).toBeGreaterThan(bounded[i - 1]);
    for (const rule of FUSION) expect(rule.identical).toBeGreaterThanOrEqual(2);
  });

  it('porte un numéro de version', () => {
    expect(Number.isInteger(BALANCE.version)).toBe(true);
    expect(BALANCE.version).toBeGreaterThanOrEqual(1);
  });
});
