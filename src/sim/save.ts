import { createInitialMeta } from './meta';
import type { MetaState } from './types';

/** Numéro de schéma du méta sérialisé. À incrémenter dès que la forme de
 *  `MetaState` change, en ajoutant la migration correspondante ci-dessous. */
export const SAVE_SCHEMA = 1;

interface Envelope {
  v: number;
  meta: unknown;
}

export function serializeMeta(meta: MetaState): string {
  return JSON.stringify({ v: SAVE_SCHEMA, meta } satisfies Envelope);
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
  const equipped = m.equipped as Record<string, unknown> | undefined;
  return (
    typeof m.rngState === 'number' &&
    typeof m.credits === 'number' &&
    typeof m.gems === 'number' &&
    Array.isArray(m.inventory) &&
    typeof m.pity === 'object' && m.pity !== null &&
    equipped !== undefined && slots.every((s) => typeof equipped[s] === 'object' && equipped[s] !== null)
  );
}

export function deserializeMeta(json: string): MetaState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const env = parsed as Partial<Envelope>;
  if (typeof env.v !== 'number' || env.v > SAVE_SCHEMA) return null;
  if (typeof env.meta !== 'object' || env.meta === null) return null;

  const raw = env.meta as Record<string, unknown>;
  // Schéma courant : exigence stricte. Schéma antérieur : on complète.
  if (env.v === SAVE_SCHEMA && !isComplete(raw)) return null;
  return hydrate(structuredClone(raw));
}
