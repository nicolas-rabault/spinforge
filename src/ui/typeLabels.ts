import type { TopType } from '../content/toupies';

/** Libellé joueur d'un type. Partagé entre l'écran Toupies (carte composition,
 *  fiches) et l'écran Combat (annonce du type à la transition de salle) : les
 *  deux doivent nommer le type de la même façon. */
export const TYPE_LABELS: Record<TopType, string> = {
  attaque: 'Attaque',
  endurance: 'Endurance',
  defense: 'Défense',
  equilibre: 'Équilibre',
};
