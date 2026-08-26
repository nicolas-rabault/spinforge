import { describe, expect, it } from 'vitest';
import { canFuse, fusionRecipe, tryFuse } from './fusion';
import { addPiece, createInitialMeta, stackOf } from './meta';
import type { MetaState } from './types';

function withStack(model: string, rank: number, count: number, levels: number[] = []): MetaState {
  const meta = createInitialMeta(1);
  for (let i = 0; i < count; i++) addPiece(meta, { model, rank, level: levels[i] ?? 0 });
  return meta;
}

describe('fusionRecipe', () => {
  it('demande trois identiques du Commun au Rare', () => {
    for (const rank of [1, 2, 3]) expect(fusionRecipe(rank)).toEqual({ identical: 3, sacrifice: 0 });
  });

  it('demande deux identiques et un sacrifice d’Excellent à Épique +2', () => {
    for (const rank of [4, 5, 6, 7, 8, 9]) expect(fusionRecipe(rank)).toEqual({ identical: 2, sacrifice: 1 });
  });

  it('redemande trois identiques pour franchir Épique +3 → Légende', () => {
    expect(fusionRecipe(10)).toEqual({ identical: 3, sacrifice: 0 });
  });

  it('demande deux identiques pour chaque Légende +N, sans limite', () => {
    for (const rank of [11, 12, 30, 500]) expect(fusionRecipe(rank)).toEqual({ identical: 2, sacrifice: 0 });
  });
});

describe('fusion des bas rangs', () => {
  it('trois Communs identiques donnent un Bon', () => {
    const meta = withStack('disque.lourd', 1, 3);
    expect(canFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(tryFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(stackOf(meta, 'disque.lourd', 1)).toBeUndefined();
    expect(stackOf(meta, 'disque.lourd', 2)!.count).toBe(1);
  });

  it('refuse à deux exemplaires', () => {
    // Modèle distinct du disque de départ (`disque.lourd` rang 1, voir STARTER_EQUIPMENT) :
    // sinon la pièce équipée comblerait le troisième exemplaire et fausserait le test.
    const meta = withStack('disque.gravite', 1, 2);
    expect(canFuse(meta, 'disque.gravite', 1)).toBe(false);
    expect(tryFuse(meta, 'disque.gravite', 1)).toBe(false);
    expect(stackOf(meta, 'disque.gravite', 1)!.count).toBe(2);
  });

  it('ne consomme que ce qu’il faut', () => {
    const meta = withStack('disque.lourd', 1, 5);
    tryFuse(meta, 'disque.lourd', 1);
    expect(stackOf(meta, 'disque.lourd', 1)!.count).toBe(2);
  });
});

describe('sacrifice', () => {
  it('exige un troisième exemplaire du même emplacement à partir d’Excellent', () => {
    const meta = withStack('disque.lourd', 4, 2);
    expect(canFuse(meta, 'disque.lourd', 4)).toBe(false);
    addPiece(meta, { model: 'disque.meteorite', rank: 1, level: 0 });
    expect(canFuse(meta, 'disque.lourd', 4)).toBe(true);
    expect(tryFuse(meta, 'disque.lourd', 4)).toBe(true);
    expect(stackOf(meta, 'disque.lourd', 5)!.count).toBe(1);
    expect(stackOf(meta, 'disque.meteorite', 1)).toBeUndefined();
  });

  it('refuse un sacrifice d’un autre emplacement', () => {
    const meta = withStack('disque.lourd', 4, 2);
    addPiece(meta, { model: 'pointe.furie', rank: 1, level: 0 });
    expect(canFuse(meta, 'disque.lourd', 4)).toBe(false);
  });

  it('ne sacrifie jamais un des identiques nécessaires', () => {
    const meta = withStack('disque.lourd', 4, 2);
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    expect(tryFuse(meta, 'disque.lourd', 4)).toBe(true);
    expect(stackOf(meta, 'disque.lourd', 5)!.count).toBe(1);
    expect(stackOf(meta, 'disque.lourd', 1)).toBeUndefined();
  });
});

describe('niveau conservé', () => {
  it('la pièce produite prend le plus haut niveau consommé', () => {
    const meta = withStack('disque.lourd', 1, 3, [0, 12, 5]);
    tryFuse(meta, 'disque.lourd', 1);
    expect(stackOf(meta, 'disque.lourd', 2)!.bestLevel).toBe(12);
  });

  it('le sacrifice compte aussi — on ne perd jamais de niveau en fusionnant', () => {
    const meta = createInitialMeta(1);
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    addPiece(meta, { model: 'disque.colosse', rank: 1, level: 30 });
    tryFuse(meta, 'disque.lourd', 4);
    expect(stackOf(meta, 'disque.lourd', 5)!.bestLevel).toBe(30);
  });
});

describe('pièce équipée', () => {
  it('peut être consommée, et le résultat prend sa place', () => {
    const meta = createInitialMeta(1);
    meta.equipped.disque = { model: 'disque.lourd', rank: 1, level: 7 };
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    expect(canFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(tryFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(meta.equipped.disque).toEqual({ model: 'disque.lourd', rank: 2, level: 7 });
    expect(stackOf(meta, 'disque.lourd', 1)).toBeUndefined();
    expect(stackOf(meta, 'disque.lourd', 2)).toBeUndefined();
  });

  it('n’est pas consommée si l’inventaire suffit', () => {
    const meta = createInitialMeta(1);
    meta.equipped.disque = { model: 'disque.lourd', rank: 1, level: 7 };
    for (let i = 0; i < 3; i++) addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    tryFuse(meta, 'disque.lourd', 1);
    expect(meta.equipped.disque).toEqual({ model: 'disque.lourd', rank: 1, level: 7 });
    expect(stackOf(meta, 'disque.lourd', 2)!.count).toBe(1);
  });
});
