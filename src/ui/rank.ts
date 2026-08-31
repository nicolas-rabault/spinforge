import { rankTier } from '../theme';

/** Couleur d'un rang. Les seuils vivent dans `theme.ts` (`rankTier`) et nulle part
 *  ailleurs : cette fonction et les cadres dessinés par `src/art/` doivent classer
 *  un rang de la même façon, sinon le même objet change de rareté selon l'écran. */
export function rankColor(rank: number): string {
  return `var(--rank-${rankTier(rank)})`;
}
