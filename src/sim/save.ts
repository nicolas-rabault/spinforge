import { STARTER_TOUPIE, TOUPIES, type ToupieId } from '../content/toupies';
import { createInitialMeta } from './meta';
import type { MetaState } from './types';
import type { PieceInstance, PieceStack } from './piece';

/** Numéro de schéma du méta sérialisé. Trois migrations ont existé ci-dessous ;
 *  seule celle du schéma 1 vers le 2 subsiste (inventaire `{count, bestLevel}`
 *  devenu `{levels}`). Le passage au schéma 4 fusionne deux dialectes du schéma 3
 *  livrés en parallèle — `toupies`/`founderGiftClaimed` d'un côté, `pending` de
 *  l'autre. Pas de migration écrite pour ce passage : il n'en faut pas. Un blob
 *  v3, désormais antérieur au schéma courant, tombe dans la branche « schéma
 *  antérieur » de `deserializeMeta` et traverse `hydrate`, qui comble les
 *  champs que son dialecte ignorait (`pending` pour le dialecte
 *  `toupies`/`founderGiftClaimed`, ou l'inverse). Le joueur garde crédits,
 *  gemmes, équipement, inventaire et pity.
 *  Le passage au schéma 5 remplace `chapterValidated: boolean` par
 *  `bestChapter: number`. La migration tient dans `hydrate` : un blob antérieur
 *  est, par construction, un méta auquel il manque le champ. */
export const SAVE_SCHEMA = 5;

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

const KNOWN_TOUPIES = new Set<string>(TOUPIES.map((t) => t.id));

/**
 * Normalise le bloc `toupies`. Trois cas se rejoignent ici : le champ absent
 * (schéma 2, migration), un identifiant inconnu (données trafiquées ou
 * catalogue réduit depuis), et une toupie active qu'on ne possède pas. Tous
 * retombent sur la toupie de départ plutôt que de propager une valeur qui
 * ferait lever `toupieById` à la création du run.
 */
function hydrateToupies(raw: unknown): MetaState['toupies'] {
  const fallback = { unlocked: [STARTER_TOUPIE], active: STARTER_TOUPIE };
  if (typeof raw !== 'object' || raw === null) return fallback;
  const t = raw as Record<string, unknown>;
  const unlocked = Array.isArray(t.unlocked)
    ? (t.unlocked.filter((id): id is ToupieId => typeof id === 'string' && KNOWN_TOUPIES.has(id)))
    : [];
  if (!unlocked.includes(STARTER_TOUPIE)) unlocked.unshift(STARTER_TOUPIE);
  const active = typeof t.active === 'string' && unlocked.includes(t.active as ToupieId)
    ? (t.active as ToupieId)
    : STARTER_TOUPIE;
  return { unlocked, active };
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
    pending: (partial.pending as MetaState['pending']) ?? base.pending,
    // Migration 4 → 5 : le booléen devient un numéro. Un blob antérieur au 4
    // traverse la même branche et retombe sur 0, ce qui est exact.
    // Normalisé comme tout le reste ici : `isComplete` ne vérifie que « c'est un
    // nombre », et un `bestChapter` fractionnaire ou négatif ressortait tel quel
    // pour donner un `maxPlayableChapter` fractionnaire, un `chapterOf` sur un
    // index qui n'existe pas, donc un `TypeError` à la création du run — page
    // blanche définitive, sans bandeau puisque le blob n'a pas été refusé.
    bestChapter: typeof partial.bestChapter === 'number'
      ? Math.max(0, Math.trunc(partial.bestChapter))
      : (partial.chapterValidated === true ? 1 : 0),
    toupies: hydrateToupies(partial.toupies),
    founderGiftClaimed: partial.founderGiftClaimed === true,
  };
  return meta;
}

/** Vrai si `p` est une pièce utilisable : un modèle, un rang et un niveau, tous
 *  du bon type. Un objet vide (`{}`) est un objet non nul — la garde qui se
 *  contentait de ça laissait passer des pièces sans aucune de ces trois
 *  valeurs, d'où des statistiques à `NaN` partout où la pièce est lue ensuite. */
function isValidPiece(p: unknown): p is PieceInstance {
  if (typeof p !== 'object' || p === null) return false;
  const piece = p as Record<string, unknown>;
  return (
    typeof piece.model === 'string' &&
    typeof piece.rank === 'number' &&
    typeof piece.level === 'number'
  );
}

/** Vrai si `s` est une pile utilisable : un modèle, un rang, et un tableau de
 *  niveaux qui ne contient que des nombres. La garde précédente ne vérifiait
 *  que « c'est un tableau » — un inventaire de nombres nus la passait puis
 *  faisait lever à l'ouverture de la Forge. */
function isValidStack(s: unknown): s is PieceStack {
  if (typeof s !== 'object' || s === null) return false;
  const stack = s as Record<string, unknown>;
  return (
    typeof stack.model === 'string' &&
    typeof stack.rank === 'number' &&
    Array.isArray(stack.levels) &&
    stack.levels.every((l) => typeof l === 'number')
  );
}

/** Vrai si le méta porte tous ses champs à la forme du schéma courant, avec un
 *  contenu réellement exploitable — pas seulement des objets non nuls. Un
 *  `pity` vide casserait silencieusement les deux garanties de coffre ; un
 *  emplacement équipé sans modèle/rang/niveau produit des statistiques à
 *  `NaN` (le joueur devient immortel : une comparaison avec `NaN` est toujours
 *  fausse) ; un inventaire de valeurs non-pièces fait lever à l'ouverture de
 *  la Forge. Un blob amputé — schéma courant ou migré — est refusé : c'est un
 *  blob corrompu, et le compléter en silence masquerait le problème. */
function isComplete(m: Record<string, unknown>): boolean {
  const slots = ['lame', 'disque', 'pointe', 'noyau'];
  const chestKinds = ['bronze', 'arene', 'mythique'];
  const equipped = m.equipped as Record<string, unknown> | null | undefined;
  const pity = m.pity as Record<string, unknown> | null | undefined;
  const pending = m.pending as Record<string, unknown> | null | undefined;
  return (
    typeof m.rngState === 'number' &&
    typeof m.credits === 'number' &&
    typeof m.gems === 'number' &&
    typeof m.bestChapter === 'number' &&
    Array.isArray(m.inventory) && m.inventory.every(isValidStack) &&
    typeof pity === 'object' && pity !== null &&
    chestKinds.every((k) => typeof pity[k] === 'number') &&
    typeof pending === 'object' && pending !== null &&
    chestKinds.every((k) => typeof pending[k] === 'number') &&
    typeof equipped === 'object' && equipped !== null &&
    slots.every((s) => isValidPiece(equipped[s])) &&
    typeof m.toupies === 'object' && m.toupies !== null &&
    Array.isArray((m.toupies as Record<string, unknown>).unlocked) &&
    typeof (m.toupies as Record<string, unknown>).active === 'string'
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
    // Schéma courant : un champ manquant est un blob corrompu, refusé avant même
    // de tenter de le compléter. Schéma antérieur : migration puis complétion —
    // c'est le mécanisme même de l'évolution de schéma.
    if (env.v === SAVE_SCHEMA && !isComplete(raw)) return null;
    // Borne explicite : cette migration est celle du schéma 1 vers le 2, et elle
    // seule. La comparer au schéma courant la ferait tourner sur tout blob plus
    // ancien que le courant — donc sur des blobs v2 et v3 depuis que SAVE_SCHEMA
    // vaut 4.
    if (env.v < 2) raw.inventory = migrateInventoryV1(raw.inventory);
    const meta = hydrate(raw);
    // Filet appliqué au résultat final, quelle que soit la version d'origine :
    // la migration ci-dessus ne passe par aucune des deux gardes précédentes
    // (ni `isComplete(raw)`, réservée au schéma courant, ni la reconstruction de
    // `hydrate`, qui ne comble que les champs *absents* — jamais un emplacement
    // présent mais malformé). Sans ce filet, un blob migré dont un emplacement
    // équipé est amputé ou vaut `null` ressortait non nul d'ici pour faire
    // lever un `TypeError` à la création du run, sans barrière d'erreur en
    // amont : page blanche définitive, aucun bandeau, aucune copie de secours.
    if (!isComplete(meta as unknown as Record<string, unknown>)) return null;
    return meta;
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
