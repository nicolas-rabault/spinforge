import { PROFILE_AXES, type ProfileAxis } from '../sim/profile';

/** Repris tel quel dans ForgeScreen, InventoryPanel et ToupiesScreen : les trois
 *  écrans qui montrent un profil de pièce ou de châssis doivent lire les mêmes
 *  sept axes, avec les mêmes libellés et la même règle de sens — sans quoi une
 *  Pointe Furie ou un Disque Gravité redeviennent invisibles sur un seul des
 *  trois écrans pendant qu'ils sont corrigés sur les autres. */
export const AXIS_ORDER: ProfileAxis[] = PROFILE_AXES;

export const AXIS_LABELS: Record<ProfileAxis, string> = {
  attack: 'Attaque',
  defense: 'Défense',
  maxSpeed: 'Vitesse max',
  spinMax: 'Spin max',
  accel: 'Accélération',
  mass: 'Masse',
  spinDecay: 'Décroissance',
};

/** > 1 est un gain pour six axes sur sept. `spinDecay` est une perte de spin par
 *  seconde (voir `sim/profile.ts`) : là, c'est < 1 qui est le gain. Piège de sens
 *  à ne pas reproduire ici — la couleur suit cette règle, pas le signe du %. */
export function isGain(axis: ProfileAxis, value: number): boolean {
  return axis === 'spinDecay' ? value < 1 : value > 1;
}

export function axisLine(axis: ProfileAxis, value: number): string {
  const pct = Math.round((value - 1) * 100);
  const sign = pct > 0 ? '+' : '';
  return `${AXIS_LABELS[axis]} ${sign}${pct} %`;
}
