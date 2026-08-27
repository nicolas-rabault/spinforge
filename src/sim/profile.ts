import { CHASSIS, MODELS_PROFILE } from './config';
import type { MetaState } from './types';

/** Les sept axes qu'un profil peut multiplier. Châssis et modèles génériques
 *  puisent dans le même jeu : rien n'interdit à un Disque de peser sur la
 *  vitesse ni à une Pointe sur la masse. Ce qui distingue les systèmes est
 *  l'emphase, pas l'axe autorisé.
 *
 *  `spinDecay` est le piège : c'est une *perte* de spin par seconde, donc un
 *  multiplicateur inférieur à 1 est un gain. Les six autres vont dans l'autre sens. */
export type ProfileAxis =
  | 'attack' | 'defense' | 'maxSpeed' | 'spinMax' | 'accel' | 'mass' | 'spinDecay';

export type StatProfile = Partial<Record<ProfileAxis, number>>;

/** Ordre stable des sept axes — source unique. L'affichage (`ui/profileAxes.ts`)
 *  et la validation de `balance.json` (`config.test.ts`) le réutilisent tel quel
 *  plutôt que de retenir chacun leur propre liste. */
export const PROFILE_AXES: ProfileAxis[] = [
  'attack', 'defense', 'maxSpeed', 'spinMax', 'accel', 'mass', 'spinDecay',
];

export const NEUTRAL_PROFILE: Record<ProfileAxis, number> = Object.fromEntries(
  PROFILE_AXES.map((a) => [a, 1]),
) as Record<ProfileAxis, number>;

/** Produit des profils qui pèsent sur la toupie : le châssis, le modèle de
 *  Disque et le modèle de Pointe. Les Lames et Noyaux n'ont pas de profil —
 *  leur différenciation passe par le talent signature de leur rang.
 *
 *  Tout se compose par multiplication : rien n'écrase rien. Un Colosse (masse
 *  ×1,30) sur une Carapace Abyssale (×1,40) donne ×1,82, auquel le talent
 *  Masse ajoutera encore son facteur au montage de la toupie. */
export function resolveProfile(meta: MetaState): Record<ProfileAxis, number> {
  const out = { ...NEUTRAL_PROFILE };
  const sources: (StatProfile | undefined)[] = [
    CHASSIS[meta.toupies.active],
    MODELS_PROFILE[meta.equipped.disque.model],
    MODELS_PROFILE[meta.equipped.pointe.model],
  ];
  for (const source of sources) {
    if (!source) continue;
    for (const axis of PROFILE_AXES) {
      const v = source[axis];
      if (v !== undefined) out[axis] *= v;
    }
  }
  return out;
}
