import { beforeEach, describe, expect, it } from 'vitest';
import { setLang } from '../i18n';
import { rankColor, rankLabel } from './rank';

// Chaque test part du français : la détection rendrait « en » dans cet
// environnement, et un test ne doit pas dépendre de l'ordre d'exécution.
beforeEach(() => setLang('fr'));

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

  it("nomme les mêmes paliers en anglais, prolongement compris", () => {
    setLang('en');
    expect(rankLabel(1)).toBe('Common');
    expect(rankLabel(6)).toBe('Excellent +2');
    expect(rankLabel(7)).toBe('Epic');
    expect(rankLabel(11)).toBe('Legend');
    expect(rankLabel(30)).toBe('Legend +19');
  });
});

describe('rankColor', () => {
  // Les seuils vivent dans `rankTier` (`theme.ts`) : ici on vérifie seulement
  // que les quatre paliers tombent sur les mêmes rangs que `rankLabel`.
  it('donne ses quatre paliers de lisibilité', () => {
    expect(rankColor(1)).toBe('var(--rank-0)');
    expect(rankColor(4)).toBe('var(--rank-1)');
    expect(rankColor(7)).toBe('var(--rank-2)');
    expect(rankColor(11)).toBe('var(--rank-3)');
  });

  // La couleur classe un rang, elle ne le nomme pas : elle ne doit rien devoir
  // à la langue.
  it('ne dépend pas de la langue', () => {
    setLang('en');
    expect(rankColor(11)).toBe('var(--rank-3)');
    expect(rankColor(1)).toBe('var(--rank-0)');
  });
});
