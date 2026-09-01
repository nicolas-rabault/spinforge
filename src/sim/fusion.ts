import { FUSION } from './config';
import { modelById } from '../content/pieces';
import { addPiece, stackOf, takePiece } from './meta';
import type { MetaState } from './types';

/** La recette dépend du rang **des pièces consommées**. `throughRank: 0`
 *  marque la règle ouverte, qui couvre tous les rangs au-delà. `config.test.ts`
 *  impose que la dernière règle de `FUSION` porte toujours `throughRank: 0` :
 *  la recherche aboutit donc toujours, pas de repli à écrire après coup. */
export function fusionRecipe(rank: number): { identical: number; sacrifice: number } {
  const rule = FUSION.find((r) => r.throughRank === 0 || rank <= r.throughRank)!;
  return { identical: rule.identical, sacrifice: rule.sacrifice };
}

/** Nombre d'exemplaires disponibles, la pièce équipée comprise. */
function availableIdentical(meta: MetaState, model: string, rank: number): number {
  const slot = modelById(model).slot;
  const equipped = meta.equipped[slot];
  const inStack = stackOf(meta, model, rank)?.levels.length ?? 0;
  const fromEquipped = equipped.model === model && equipped.rank === rank ? 1 : 0;
  return inStack + fromEquipped;
}

/** Une pile du même emplacement utilisable en sacrifice, hors les identiques.
 *  La pièce équipée n'est jamais sacrifiée : elle n'est consommée que comme
 *  identique, où le résultat reprend sa place. */
function sacrificeStack(meta: MetaState, model: string, rank: number) {
  const slot = modelById(model).slot;
  return meta.inventory.find(
    (s) => s.levels.length > 0 && modelById(s.model).slot === slot && !(s.model === model && s.rank === rank),
  );
}

/** Total des exemplaires sacrifiables (même emplacement, hors les identiques
 *  nécessaires) toutes piles confondues. `sacrificeStack` ne rend qu'une pile à
 *  la fois ; celle-ci additionne pour que `canFuse` compare un vrai nombre à
 *  `recipe.sacrifice`, plutôt que de traiter le sacrifice comme un booléen. */
function availableSacrifice(meta: MetaState, model: string, rank: number): number {
  const slot = modelById(model).slot;
  return meta.inventory
    .filter((s) => modelById(s.model).slot === slot && !(s.model === model && s.rank === rank))
    .reduce((sum, s) => sum + s.levels.length, 0);
}

export interface FusionProgress {
  identical: { have: number; need: number };
  sacrifice: { have: number; need: number };
}

/** Où en est une pile de sa prochaine fusion. Exporté pour que l'inventaire
 *  *montre* l'avancement (des pastilles remplies) au lieu de l'énoncer
 *  (« 2 identiques + 1 sacrifice ») — et surtout pour qu'il n'ait pas à
 *  recompter les exemplaires de son côté : deux comptes, et l'un des deux
 *  finirait par mentir. */
export function fusionProgress(meta: MetaState, model: string, rank: number): FusionProgress {
  const recipe = fusionRecipe(rank);
  return {
    identical: { have: availableIdentical(meta, model, rank), need: recipe.identical },
    sacrifice: { have: availableSacrifice(meta, model, rank), need: recipe.sacrifice },
  };
}

export function canFuse(meta: MetaState, model: string, rank: number): boolean {
  const p = fusionProgress(meta, model, rank);
  return p.identical.have >= p.identical.need && p.sacrifice.have >= p.sacrifice.need;
}

/**
 * Fusionne et range le résultat. Le niveau produit est **le plus haut de toutes
 * les pièces consommées, sacrifice compris** : on ne perd jamais de niveau en
 * fusionnant. Aucun abus possible, le coût d'un niveau étant le même quel que
 * soit le rang de la pièce sur laquelle on l'achète.
 */
export function tryFuse(meta: MetaState, model: string, rank: number): boolean {
  if (!canFuse(meta, model, rank)) return false;
  const recipe = fusionRecipe(rank);
  const slot = modelById(model).slot;

  let bestLevel = 0;
  let taken = 0;
  // On puise d'abord dans l'inventaire : l'équipée n'est consommée qu'en dernier recours.
  while (taken < recipe.identical) {
    const level = takePiece(meta, model, rank);
    if (level === null) break;
    bestLevel = Math.max(bestLevel, level);
    taken++;
  }
  let wasEquipped = false;
  if (taken < recipe.identical) {
    const equipped = meta.equipped[slot];
    bestLevel = Math.max(bestLevel, equipped.level);
    wasEquipped = true;
    taken++;
  }

  // Autant de sacrifices que la recette l'exige — jamais un seul par hypothèse.
  for (let i = 0; i < recipe.sacrifice; i++) {
    const victim = sacrificeStack(meta, model, rank)!;
    const level = takePiece(meta, victim.model, victim.rank)!;
    bestLevel = Math.max(bestLevel, level);
  }

  const result = { model, rank: rank + 1, level: bestLevel };
  if (wasEquipped) meta.equipped[slot] = result;
  else addPiece(meta, result);
  return true;
}
