import { RARITY } from './config';
import type { Slot } from '../content/pieces';

export type { Slot, PieceModel } from '../content/pieces';

/** Une pièce possédée : un modèle, un rang de rareté, un niveau d'amélioration.
 *  Deux pièces sont *identiques* — donc fusionnables — si `model` et `rank`
 *  coïncident. Le niveau n'entre pas dans l'identité : sans quoi la stratégie
 *  optimale deviendrait « ne jamais améliorer avant d'avoir fini de fusionner ». */
export interface PieceInstance {
  model: string;
  rank: number;
  level: number;
}

/** Les doublons vivent en piles, un niveau par exemplaire, triés du meilleur au
 *  moins bon (`levels[0]` est toujours le meilleur). Un résumé du genre
 *  « meilleur niveau vu » a été tenté et abandonné : il ne peut représenter
 *  qu'un seul exemplaire amélioré à la fois, et en oublie le niveau des autres
 *  dès qu'on en retire un — violation directe de « on ne perd jamais de niveau
 *  en fusionnant ». La liste explicite n'a pas ce problème. */
export interface PieceStack {
  model: string;
  rank: number;
  levels: number[];
}

const RANK_LABELS = [
  'Commun', 'Bon', 'Rare',
  'Excellent', 'Excellent +1', 'Excellent +2',
  'Épique', 'Épique +1', 'Épique +2', 'Épique +3',
  'Légende',
];

/** Multiplicateur de la stat portée par la pièce. Aucun plafond : la formule
 *  se prolonge d'elle-même dans Légende +N, ce que « rang infini » exige. */
export function rarityMult(rank: number): number {
  return Math.pow(RARITY.step, rank - 1);
}

export function rankLabel(rank: number): string {
  if (rank <= RANK_LABELS.length) return RANK_LABELS[rank - 1];
  return `Légende +${rank - RANK_LABELS.length}`;
}

export const STARTER_EQUIPMENT: Record<Slot, PieceInstance> = {
  lame: { model: 'lame.couronne-solaire', rank: 1, level: 0 },
  noyau: { model: 'noyau.fournaise', rank: 1, level: 0 },
  disque: { model: 'disque.lourd', rank: 1, level: 0 },
  pointe: { model: 'pointe.plate', rank: 1, level: 0 },
};
