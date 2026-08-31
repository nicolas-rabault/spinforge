import { t, type MessageKey } from '../i18n';

/** Quatre paliers de lisibilité, alignés sur les paliers nommés de l'échelle.
 *  Un rang doit se reconnaître à la couleur sans lire son étiquette. */
export function rankColor(rank: number): string {
  if (rank >= 11) return 'var(--boss)';
  if (rank >= 7) return 'var(--ember)';
  if (rank >= 4) return 'var(--player)';
  return 'var(--muted)';
}

/** Ordre du catalogue : l'index vaut `rang − 1`. Vient de `sim/piece.ts`, qui
 *  n'avait pas à porter des mots destinés au joueur. */
const RANK_KEYS: MessageKey[] = [
  'rank.commun', 'rank.bon', 'rank.rare',
  'rank.excellent', 'rank.excellent.1', 'rank.excellent.2',
  'rank.epique', 'rank.epique.1', 'rank.epique.2', 'rank.epique.3',
  'rank.legende',
];

/** Aucun plafond : « rang infini » exige que la nomenclature se prolonge d'elle-même
 *  au-delà du catalogue, comme le fait déjà `rarityMult`. */
export function rankLabel(rank: number): string {
  if (rank <= RANK_KEYS.length) return t(RANK_KEYS[rank - 1]);
  return t('rank.legende.plus', { n: rank - RANK_KEYS.length });
}
