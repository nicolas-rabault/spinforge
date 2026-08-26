import { TYPES } from './config';
import type { TopType } from '../content/toupies';

/** Attaque bat Endurance bat Défense bat Attaque. Équilibre est **hors** du
 *  cycle : il ne domine personne et personne ne le domine. */
const BEATS: Record<'attaque' | 'endurance' | 'defense', TopType> = {
  attaque: 'endurance',
  endurance: 'defense',
  defense: 'attaque',
};

/**
 * Facteur de dégâts qu'un attaquant de type `att` applique à un défenseur de
 * type `def`. Appelé des **deux** côtés de chaque choc : si le type d'un bot
 * domine celui du joueur, le bot inflige +25 % lui aussi. Sans cette symétrie
 * le triangle serait un bonus gratuit et non une décision.
 *
 * Équilibre est testé en premier : étant hors du triangle, il gagne un bonus
 * plat contre tout le monde, mais il n'est le type dominé de personne — c'est
 * son vrai atout, et il est entièrement passif.
 */
export function typeMult(att: TopType, def: TopType): number {
  if (att === 'equilibre') return 1 + TYPES.equilibreBonus;
  if (BEATS[att] === def) return 1 + TYPES.dominantBonus;
  return 1;
}
