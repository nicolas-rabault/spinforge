import { modelById } from '../content/pieces';
import { playerStats } from './economy';
import { HIGHER_IS_BETTER, PROFILE_AXES } from './profile';
import type { ToupieId } from '../content/toupies';
import type { MetaState } from './types';

/**
 * Monter cette pièce à la place de celle qui occupe son emplacement ferait-il
 * gagner **sans rien coûter** ?
 *
 * Vrai quand aucune des sept stats ne recule et qu'au moins une avance.
 *
 * Comparer le rang seul mentirait : `factor = (1 + perLevel × niveau) ×
 * rarityMult(rang)`, donc une pièce de rang supérieur au niveau 0 est
 * régulièrement plus faible qu'une équipée montée. Et un échange — de la masse
 * contre de la défense — n'est pas une évidence mais un choix du joueur : il ne
 * se signale pas, sinon le point rouge donnerait un mauvais conseil une fois
 * sur deux.
 *
 * Le châssis entre dans le calcul via `resolveProfile`, appelé par
 * `playerStats` : c'est pourquoi `toupie` est un paramètre et non une lecture
 * de `meta.toupies.active`.
 */
export function dominatesEquipped(
  meta: MetaState, toupie: ToupieId, model: string, rank: number, level: number,
): boolean {
  const slot = modelById(model).slot;
  const before = playerStats(meta, toupie);
  const after = playerStats(
    { ...meta, equipped: { ...meta.equipped, [slot]: { model, rank, level } } },
    toupie,
  );
  let gain = false;
  for (const axis of PROFILE_AXES) {
    // Un seul recul suffit à disqualifier : inutile de regarder la suite.
    if (HIGHER_IS_BETTER[axis] ? after[axis] < before[axis] : after[axis] > before[axis]) {
      return false;
    }
    // Aucun recul n'a été toléré au-dessus : toute différence restante est un gain.
    if (after[axis] !== before[axis]) gain = true;
  }
  return gain;
}
