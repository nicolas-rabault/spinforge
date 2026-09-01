import { rankTier } from '../theme';
import { t, type MessageKey } from '../i18n';

/** Couleur d'un rang. Les seuils vivent dans `theme.ts` (`rankTier`) et nulle part
 *  ailleurs : cette fonction et les cadres dessinés par `src/art/` doivent classer
 *  un rang de la même façon, sinon le même objet change de rareté selon l'écran. */
export function rankColor(rank: number): string {
  return `var(--rank-${rankTier(rank)})`;
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
