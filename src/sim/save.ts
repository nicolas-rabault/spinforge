import { createInitialMeta } from './meta';
import type { MetaState } from './types';

/** Numéro de schéma du méta sérialisé. À incrémenter dès que la forme de
 *  `MetaState` change, en ajoutant la migration correspondante ci-dessous. */
export const SAVE_SCHEMA = 2;

interface Envelope {
  v: number;
  meta: unknown;
}

export function serializeMeta(meta: MetaState): string {
  return JSON.stringify({ v: SAVE_SCHEMA, meta } satisfies Envelope);
}

/** Forme d'une pile au schéma 1 : un compteur et le meilleur niveau vu. Elle ne
 *  pouvait représenter qu'un seul exemplaire amélioré à la fois dans une pile —
 *  c'est le défaut que le schéma 2 corrige en gardant un niveau par exemplaire. */
interface StackV1 {
  model?: unknown;
  rank?: unknown;
  count?: unknown;
  bestLevel?: unknown;
}

/**
 * Migration schéma 1 → 2 : `{ count, bestLevel }` devient `{ levels }`. Le
 * meilleur niveau connu passe en tête ; les autres exemplaires, dont le
 * schéma 1 ne connaissait pas le niveau individuel, prennent 0 — la même
 * hypothèse conservatrice que l'ancien `takePiece`, appliquée une bonne fois
 * ici plutôt qu'à chaque retrait.
 */
function migrateInventoryV1(inventory: unknown): unknown {
  if (!Array.isArray(inventory)) return inventory;
  return inventory.map((raw) => {
    const s = raw as StackV1;
    if (typeof s.count !== 'number') return raw; // forme déjà inattendue : laissée telle quelle, isComplete tranchera
    const best = typeof s.bestLevel === 'number' ? s.bestLevel : 0;
    const levels = [best, ...(Array(Math.max(0, s.count - 1)).fill(0) as number[])];
    return { model: s.model, rank: s.rank, levels };
  });
}

/** Complète un méta partiel avec les valeurs de départ. C'est le mécanisme sur
 *  lequel reposent les migrations : une version antérieure est, par
 *  construction, un méta auquel il manque des champs. */
function hydrate(partial: Record<string, unknown>): MetaState {
  const base = createInitialMeta(1);
  const meta: MetaState = {
    rngState: typeof partial.rngState === 'number' ? partial.rngState : base.rngState,
    credits: typeof partial.credits === 'number' ? partial.credits : base.credits,
    gems: typeof partial.gems === 'number' ? partial.gems : base.gems,
    equipped: (partial.equipped as MetaState['equipped']) ?? base.equipped,
    inventory: (partial.inventory as MetaState['inventory']) ?? base.inventory,
    pity: (partial.pity as MetaState['pity']) ?? base.pity,
    chapterValidated: partial.chapterValidated === true,
  };
  return meta;
}

/** Vrai si le méta porte tous ses champs à la forme du schéma courant. Un blob
 *  du schéma courant est refusé s'il est amputé — c'est un blob corrompu, pas
 *  une version antérieure, et le compléter en silence masquerait le problème. */
function isComplete(m: Record<string, unknown>): boolean {
  const slots = ['lame', 'disque', 'pointe', 'noyau'];
  const equipped = m.equipped as Record<string, unknown> | null | undefined;
  return (
    typeof m.rngState === 'number' &&
    typeof m.credits === 'number' &&
    typeof m.gems === 'number' &&
    Array.isArray(m.inventory) &&
    typeof m.pity === 'object' && m.pity !== null &&
    typeof equipped === 'object' && equipped !== null &&
    slots.every((s) => typeof equipped[s] === 'object' && equipped[s] !== null)
  );
}

export function deserializeMeta(json: string): MetaState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  try {
    if (typeof parsed !== 'object' || parsed === null) return null;
    const env = parsed as Partial<Envelope>;
    if (typeof env.v !== 'number' || env.v > SAVE_SCHEMA) return null;
    if (typeof env.meta !== 'object' || env.meta === null) return null;

    const raw = env.meta as Record<string, unknown>;
    // Schéma courant : exigence stricte. Schéma antérieur : migration puis complétion.
    if (env.v === SAVE_SCHEMA && !isComplete(raw)) return null;
    if (env.v < SAVE_SCHEMA) raw.inventory = migrateInventoryV1(raw.inventory);
    return hydrate(raw);
  } catch {
    // Filet : toute forme imprévue (un champ non nul mais du mauvais type,
    // une structure inattendue que les gardes ci-dessus n'ont pas anticipée)
    // doit retourner null, jamais laisser une exception s'échapper jusqu'à
    // l'appelant. Un blob dont la forme surprend est, par définition, un
    // blob illisible — c'est la promesse même de désérialiser une donnée
    // qu'on ne contrôle pas.
    return null;
  }
}
