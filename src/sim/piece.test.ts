import { describe, expect, it } from 'vitest';
import { rankLabel, rarityMult, STARTER_EQUIPMENT } from './piece';
import { MODELS, modelById, modelsForSlot } from '../content/pieces';
import { RARITY } from './config';

describe('rarityMult', () => {
  it("vaut 1 au rang Commun", () => {
    expect(rarityMult(1)).toBe(1);
  });

  it("multiplie par le pas de rareté à chaque rang", () => {
    expect(rarityMult(2)).toBeCloseTo(RARITY.step, 10);
    expect(rarityMult(11)).toBeCloseTo(Math.pow(RARITY.step, 10), 10);
  });

  it("ne connaît aucun plafond — Légende +N continue de multiplier", () => {
    expect(rarityMult(20)).toBeGreaterThan(rarityMult(11));
    expect(rarityMult(21) / rarityMult(20)).toBeCloseTo(RARITY.step, 10);
  });
});

describe('rankLabel', () => {
  it("nomme les onze rangs de l'échelle", () => {
    expect(rankLabel(1)).toBe('Commun');
    expect(rankLabel(4)).toBe('Excellent');
    expect(rankLabel(6)).toBe('Excellent +2');
    expect(rankLabel(7)).toBe('Épique');
    expect(rankLabel(10)).toBe('Épique +3');
    expect(rankLabel(11)).toBe('Légende');
  });

  it("prolonge en Légende +N au-delà du onzième", () => {
    expect(rankLabel(12)).toBe('Légende +1');
    expect(rankLabel(30)).toBe('Légende +19');
  });
});

describe('catalogue', () => {
  it("n'a aucun identifiant en double", () => {
    expect(new Set(MODELS.map((m) => m.id)).size).toBe(MODELS.length);
  });

  it("donne six Disques et six Pointes génériques, une Lame et un Noyau signature", () => {
    expect(modelsForSlot('disque')).toHaveLength(6);
    expect(modelsForSlot('pointe')).toHaveLength(6);
    expect(modelsForSlot('lame')).toHaveLength(1);
    expect(modelsForSlot('noyau')).toHaveLength(1);
  });

  it("refuse un identifiant inconnu plutôt que de rendre undefined", () => {
    expect(() => modelById('disque.inexistant')).toThrow();
  });
});

describe("équipement de départ", () => {
  it("donne quatre pièces Commun niveau 0, une par emplacement", () => {
    for (const slot of ['lame', 'disque', 'pointe', 'noyau'] as const) {
      const piece = STARTER_EQUIPMENT[slot];
      expect(piece.rank).toBe(1);
      expect(piece.level).toBe(0);
      expect(modelById(piece.model).slot).toBe(slot);
    }
  });
});
