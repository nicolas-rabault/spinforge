import { describe, expect, it } from 'vitest';
import { MIX } from './mix';
import { SALLES_PER_CHAPTER } from '../sim/config';
import { MOTIF, PHRYGIAN, TENSION, activeLayers, intensityFor, noteHz } from './music';

describe("l'intensité de la musique", () => {
  it('se tait quand le joueur est mort', () => {
    expect(intensityFor(true, 3, true)).toBe(0);
  });

  it('reste basse hors combat', () => {
    expect(intensityFor(false, 3, false)).toBe(MIX.intensityMenus);
  });

  it('monte en combat', () => {
    expect(intensityFor(true, 3, false)).toBe(MIX.intensityCombat);
  });

  it('atteint son maximum dans la salle du boss', () => {
    expect(intensityFor(true, SALLES_PER_CHAPTER, false)).toBe(MIX.intensityBoss);
  });
});

describe('les couches actives', () => {
  it("n'en allume aucune à intensité nulle", () => {
    expect(activeLayers(0)).toEqual([]);
  });

  it('empile les couches à mesure que ça monte', () => {
    expect(activeLayers(MIX.intensityMenus)).toEqual(['drone', 'pulse']);
    expect(activeLayers(MIX.intensityCombat)).toEqual(['drone', 'pulse', 'anvil', 'motif']);
    expect(activeLayers(MIX.intensityBoss)).toEqual(['drone', 'pulse', 'anvil', 'motif', 'tension']);
  });
});

describe('le matériau musical', () => {
  it('ne joue que des degrés de ré phrygien', () => {
    // Un mi ou un si NATURELS (4 et 11 demi-tons) sonneraient faux contre la
    // fondamentale : le mode porte un mi bémol et un si bémol.
    for (const semitone of [...MOTIF, TENSION]) expect(PHRYGIAN).toContain(semitone);
  });

  it('place la fondamentale à ré4 trois octaves au-dessus de la racine', () => {
    expect(noteHz(0, 3)).toBeCloseTo(293.68, 1);
  });

  it('monte bien de la quinte pour le la du motif', () => {
    expect(noteHz(7, 3)).toBeCloseTo(440.03, 1);
  });
});
