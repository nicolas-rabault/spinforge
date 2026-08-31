import { t, type MessageKey } from '../i18n';
import type { TopType } from '../content/toupies';

const KEYS: Record<TopType, MessageKey> = {
  attaque: 'type.attaque',
  endurance: 'type.endurance',
  defense: 'type.defense',
  equilibre: 'type.equilibre',
};

/** Libellé joueur d'un type. Partagé entre l'écran Toupies (carte composition,
 *  fiches) et l'écran Combat (annonce du type à la transition de salle) : les
 *  deux doivent nommer le type de la même façon. Une fonction et non une table :
 *  une table figée resterait dans la langue du démarrage. */
export function typeLabel(type: TopType): string {
  return t(KEYS[type]);
}
