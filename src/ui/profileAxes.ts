import { t, type MessageKey } from '../i18n';
import { HIGHER_IS_BETTER, PROFILE_AXES, type ProfileAxis } from '../sim/profile';

/** Repris tel quel dans ForgeScreen, InventoryPanel et ToupiesScreen : les trois
 *  écrans qui montrent un profil de pièce ou de châssis doivent lire les mêmes
 *  sept axes, avec les mêmes libellés et la même règle de sens — sans quoi une
 *  Pointe Furie ou un Disque Gravité redeviennent invisibles sur un seul des
 *  trois écrans pendant qu'ils sont corrigés sur les autres. */
export const AXIS_ORDER: ProfileAxis[] = PROFILE_AXES;

const AXIS_KEYS: Record<ProfileAxis, MessageKey> = {
  attack: 'axis.attack',
  defense: 'axis.defense',
  maxSpeed: 'axis.maxSpeed',
  spinMax: 'axis.spinMax',
  accel: 'axis.accel',
  mass: 'axis.mass',
  spinDecay: 'axis.spinDecay',
};

/** Abrégé d'un axe. Le radar (`StatRadar`) et la Forge le lisent tous les deux :
 *  le joueur n'apprend qu'un vocabulaire, pas deux. */
export function axisAbbr(axis: ProfileAxis): string {
  return t(`axis.abbr.${axis}` as MessageKey);
}

/** > 1 est un gain pour six axes sur sept ; `spinDecay` est une perte, donc < 1
 *  y est le gain. Le sens vient de `HIGHER_IS_BETTER` : le tester ici en plus
 *  ferait deux endroits à corriger. */
export function isGain(axis: ProfileAxis, value: number): boolean {
  return HIGHER_IS_BETTER[axis] ? value > 1 : value < 1;
}

/** Le gabarit `axis.line` porte l'espace avant le signe pourcent : le français
 *  en met une, l'anglais non. */
export function axisLine(axis: ProfileAxis, value: number): string {
  const pct = Math.round((value - 1) * 100);
  return t('axis.line', { label: t(AXIS_KEYS[axis]), sign: pct > 0 ? '+' : '', pct });
}
