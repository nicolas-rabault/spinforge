import { modelById } from '../content/pieces';
import { canFuse } from '../sim/fusion';
import { canClaimFounderGift, pendingTotal } from '../sim/meta';
import { dominatesEquipped } from '../sim/upgrade';
import type { Slot } from '../sim/piece';
import type { ToupieId } from '../content/toupies';
import type { MetaState, RunState } from '../sim/types';

/**
 * Ce qui attend le joueur, à l'instant du rendu.
 *
 * **Dérivé, jamais stocké.** Un point rouge s'éteint parce que l'action est
 * faite, jamais parce qu'on a regardé l'écran — donc aucun champ de sauvegarde
 * et rien à réconcilier entre l'onglet, la section et la vignette : les trois
 * lisent cette même fonction.
 *
 * Ne recense **que des actions gratuites**. Une amélioration payable n'y entre
 * pas : les crédits rentrent en continu, le point serait allumé en permanence,
 * et un point toujours allumé ne dit plus rien.
 */
export interface Attention {
  /** Coffres en attente, tous types confondus — la pastille chiffrée. */
  coffres: number;
  /** Piles marquées : dominantes **ou** fusionnables. Clés `model:rank`. */
  stacks: Set<string>;
  /** Emplacements dont une pile marquée relève — les filtres de l'inventaire. */
  markedSlots: Set<Slot>;
  /** Emplacements dont la pièce équipée est **battue** — les lignes de la pile
   *  en Forge. Distinct de `markedSlots` : fusionner ne change pas la toupie
   *  montée, il n'y a donc rien à faire sur la ligne. */
  betterSlots: Set<Slot>;
  /** Un Fondateur attend d'être réclamé. */
  toupies: boolean;
}

export function stackKey(model: string, rank: number): string {
  return `${model}:${rank}`;
}

/** La toupie sur laquelle porte l'achat : celle de l'arène tant que le run vit,
 *  celle qui attend une fois la descente perdue — `resetRun` la montera au clic.
 *  La Forge et `attention` doivent lire la même, sinon le point rouge et la
 *  ligne « avant → après » juste à côté se contrediraient. */
export function shoppingToupie(meta: MetaState, run: RunState): ToupieId {
  return run.phase === 'dead' ? meta.toupies.active : run.toupie;
}

export function attention(meta: MetaState, toupie: ToupieId): Attention {
  const stacks = new Set<string>();
  const markedSlots = new Set<Slot>();
  const betterSlots = new Set<Slot>();

  for (const stack of meta.inventory) {
    // `levels[0]` est le meilleur exemplaire — celui que `equipFromStack`
    // monterait réellement (`takePiece` sort toujours la tête de pile).
    const better = dominatesEquipped(meta, toupie, stack.model, stack.rank, stack.levels[0]);
    const fusable = canFuse(meta, stack.model, stack.rank);
    if (!better && !fusable) continue;
    const slot = modelById(stack.model).slot;
    stacks.add(stackKey(stack.model, stack.rank));
    markedSlots.add(slot);
    if (better) betterSlots.add(slot);
  }

  return {
    coffres: pendingTotal(meta),
    stacks,
    markedSlots,
    betterSlots,
    toupies: canClaimFounderGift(meta),
  };
}
