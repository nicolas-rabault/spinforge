import { describe, expect, it } from 'vitest';
import { FUSION } from './config';
import { canFuse, fusionRecipe, tryFuse } from './fusion';
import { addPiece, createInitialMeta, stackOf } from './meta';
import type { MetaState } from './types';

function withStack(model: string, rank: number, count: number, levels: number[] = []): MetaState {
  const meta = createInitialMeta(1);
  for (let i = 0; i < count; i++) addPiece(meta, { model, rank, level: levels[i] ?? 0 });
  return meta;
}

// Aucune valeur de `FUSION` n'est recopiée en dur ici : ces tests prouvent que
// `fusionRecipe` choisit la bonne règle pour un rang donné, pas que telle règle
// contient tel nombre — ces nombres vivent dans balance.json et sont déjà
// vérifiés structurellement par `config.test.ts` (bornes croissantes, dernière
// règle ouverte, `identical >= 2`).
describe('fusionRecipe', () => {
  it('le premier rang appartient à la première règle', () => {
    const first = FUSION[0];
    expect(fusionRecipe(1)).toEqual({ identical: first.identical, sacrifice: first.sacrifice });
  });

  it('sélectionne la règle dont l’intervalle couvre le rang, à chaque frontière', () => {
    for (let i = 0; i < FUSION.length; i++) {
      const rule = FUSION[i];
      if (rule.throughRank === 0) {
        // Règle ouverte : un rang loin au-delà de la borne précédente lui appartient toujours.
        const previous = FUSION[i - 1];
        const probe = (previous?.throughRank ?? 0) + 500;
        expect(fusionRecipe(probe)).toEqual({ identical: rule.identical, sacrifice: rule.sacrifice });
        continue;
      }
      // Le dernier rang couvert par la règle lui appartient encore...
      expect(fusionRecipe(rule.throughRank)).toEqual({ identical: rule.identical, sacrifice: rule.sacrifice });
      // ...et le premier rang suivant appartient déjà à la règle d'après.
      const next = FUSION[i + 1];
      expect(fusionRecipe(rule.throughRank + 1)).toEqual({ identical: next.identical, sacrifice: next.sacrifice });
    }
  });
});

describe('fusion des bas rangs', () => {
  it('trois Communs identiques donnent un Bon', () => {
    const meta = withStack('disque.lourd', 1, 3);
    expect(canFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(tryFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(stackOf(meta, 'disque.lourd', 1)).toBeUndefined();
    expect(stackOf(meta, 'disque.lourd', 2)!.levels).toHaveLength(1);
  });

  it('refuse à deux exemplaires', () => {
    // Modèle distinct du disque de départ (`disque.lourd` rang 1, voir STARTER_EQUIPMENT) :
    // sinon la pièce équipée comblerait le troisième exemplaire et fausserait le test.
    const meta = withStack('disque.gravite', 1, 2);
    expect(canFuse(meta, 'disque.gravite', 1)).toBe(false);
    expect(tryFuse(meta, 'disque.gravite', 1)).toBe(false);
    expect(stackOf(meta, 'disque.gravite', 1)!.levels).toHaveLength(2);
  });

  it('ne consomme que ce qu’il faut', () => {
    const meta = withStack('disque.lourd', 1, 5);
    tryFuse(meta, 'disque.lourd', 1);
    expect(stackOf(meta, 'disque.lourd', 1)!.levels).toHaveLength(2);
  });
});

describe('sacrifice', () => {
  it('exige un troisième exemplaire du même emplacement à partir d’Excellent', () => {
    const meta = withStack('disque.lourd', 4, 2);
    expect(canFuse(meta, 'disque.lourd', 4)).toBe(false);
    addPiece(meta, { model: 'disque.meteorite', rank: 1, level: 0 });
    expect(canFuse(meta, 'disque.lourd', 4)).toBe(true);
    expect(tryFuse(meta, 'disque.lourd', 4)).toBe(true);
    expect(stackOf(meta, 'disque.lourd', 5)!.levels).toHaveLength(1);
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
    expect(stackOf(meta, 'disque.lourd', 5)!.levels).toHaveLength(1);
    expect(stackOf(meta, 'disque.lourd', 1)).toBeUndefined();
  });
});

describe('niveau conservé', () => {
  it('la pièce produite prend le plus haut niveau consommé', () => {
    const meta = withStack('disque.lourd', 1, 3, [0, 12, 5]);
    tryFuse(meta, 'disque.lourd', 1);
    expect(stackOf(meta, 'disque.lourd', 2)!.levels).toEqual([12]);
  });

  it('le sacrifice compte aussi — on ne perd jamais de niveau en fusionnant', () => {
    const meta = createInitialMeta(1);
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    addPiece(meta, { model: 'disque.colosse', rank: 1, level: 30 });
    tryFuse(meta, 'disque.lourd', 4);
    expect(stackOf(meta, 'disque.lourd', 5)!.levels).toEqual([30]);
  });

  // Régression : une pile où *plusieurs* exemplaires portent un niveau réel non
  // nul est le cas que l'ancien modèle `{ count, bestLevel }` ne pouvait pas
  // représenter — il ne retenait qu'un seul « meilleur niveau vu », remis à 0
  // dès qu'un exemplaire quittait la pile alors qu'il en restait d'autres. Une
  // fusion partielle laissait donc les survivants avec un niveau menti à 0,
  // invisible tant qu'on ne les fusionnait pas une seconde fois.
  it('une pile aux niveaux réellement variés ne perd rien à une fusion partielle suivie d’une autre', () => {
    const rank = 1;
    const { identical } = fusionRecipe(rank);
    const meta = createInitialMeta(1);
    const levels = [20, 15, 8, 4, 0]; // plusieurs exemplaires réellement améliorés dans la même pile
    for (const level of levels) addPiece(meta, { model: 'disque.gravite', rank, level });

    // Première fusion : consomme les `identical` meilleurs, laisse le reste en pile.
    expect(tryFuse(meta, 'disque.gravite', rank)).toBe(true);
    const survivors = levels.length - identical;
    expect(stackOf(meta, 'disque.gravite', rank)!.levels).toHaveLength(survivors);

    // On complète jusqu'au compte requis pour refusionner sur ce qui reste.
    for (let i = 0; i < identical - survivors; i++) {
      addPiece(meta, { model: 'disque.gravite', rank, level: 0 });
    }
    expect(tryFuse(meta, 'disque.gravite', rank)).toBe(true);

    // La pile de rang 2 porte déjà la pièce à 20 produite par la première fusion ;
    // la seconde doit s'y ajouter à 4 — le meilleur des survivants réels — et non
    // à 0, ce que rendrait un « meilleur niveau vu » retombé à zéro après la
    // première extraction.
    expect(stackOf(meta, 'disque.gravite', rank + 1)!.levels).toEqual([20, 4]);
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
    expect(stackOf(meta, 'disque.lourd', 2)!.levels).toHaveLength(1);
  });
});
