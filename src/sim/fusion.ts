import { FUSION } from './config';
import { modelById } from '../content/pieces';
import { addPiece, stackOf, takePiece } from './meta';
import type { MetaState } from './types';

/** La recette dépend du rang **des pièces consommées**. `throughRank: 0`
 *  marque la règle ouverte, qui couvre tous les rangs au-delà. */
export function fusionRecipe(rank: number): { identical: number; sacrifice: number } {
  for (const rule of FUSION) {
    if (rule.throughRank === 0 || rank <= rule.throughRank) {
      return { identical: rule.identical, sacrifice: rule.sacrifice };
    }
  }
  const last = FUSION[FUSION.length - 1];
  return { identical: last.identical, sacrifice: last.sacrifice };
}

/** Nombre d'exemplaires disponibles, la pièce équipée comprise. */
function availableIdentical(meta: MetaState, model: string, rank: number): number {
  const slot = modelById(model).slot;
  const equipped = meta.equipped[slot];
  const inStack = stackOf(meta, model, rank)?.count ?? 0;
  const fromEquipped = equipped.model === model && equipped.rank === rank ? 1 : 0;
  return inStack + fromEquipped;
}

/** Une pile du même emplacement utilisable en sacrifice, hors les identiques.
 *  La pièce équipée n'est jamais sacrifiée : elle n'est consommée que comme
 *  identique, où le résultat reprend sa place. */
function sacrificeStack(meta: MetaState, model: string, rank: number) {
  const slot = modelById(model).slot;
  return meta.inventory.find(
    (s) => s.count > 0 && modelById(s.model).slot === slot && !(s.model === model && s.rank === rank),
  );
}

export function canFuse(meta: MetaState, model: string, rank: number): boolean {
  const recipe = fusionRecipe(rank);
  if (availableIdentical(meta, model, rank) < recipe.identical) return false;
  if (recipe.sacrifice > 0 && !sacrificeStack(meta, model, rank)) return false;
  return true;
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

  if (recipe.sacrifice > 0) {
    const victim = sacrificeStack(meta, model, rank)!;
    const level = takePiece(meta, victim.model, victim.rank)!;
    bestLevel = Math.max(bestLevel, level);
  }

  const result = { model, rank: rank + 1, level: bestLevel };
  if (wasEquipped) meta.equipped[slot] = result;
  else addPiece(meta, result);
  return true;
}
