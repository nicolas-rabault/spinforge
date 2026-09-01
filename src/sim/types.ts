import type { ToupieId, TopType } from '../content/toupies';
import type { PieceInstance, PieceStack, Slot } from './piece';
import type { ArenaLayout } from './terrain';
import type { TalentMods } from './talents';

export interface Vec {
  x: number;
  y: number;
}

export interface Top {
  id: string;
  isPlayer: boolean;
  pos: Vec;
  /** Position au début du tick, avant `moveAndBounce`. Le contact se cherche sur
   *  le segment `from` → `pos` et non sur les seules positions d'arrivée : à
   *  100 ms de pas, deux toupies rapides se rapprochent de plus que la somme de
   *  leurs rayons en un tick, et n'échantillonner que les arrivées les laisse se
   *  traverser. Réécrite par `moveAndBounce` avant chaque déplacement, elle ne
   *  peut donc pas dater d'un tick — ni d'une salle — précédent. */
  from: Vec;
  vel: Vec;
  aim: Vec | null; // direction IA (bots) — null pour le joueur
  radius: number;
  /** Masse résolue pour le calcul d'impulsion. Quatre systèmes y contribuent :
   *  châssis × modèle de Disque × talent Masse pour le joueur, masse propre pour
   *  le boss. Vit sur la toupie et non dans `talents`, parce que `talents.mass`
   *  n'en est plus que l'un des facteurs. */
  mass: number;
  spin: number;
  spinMax: number;
  spinDecay: number;
  attack: number;
  defense: number;
  maxSpeed: number;
  accel: number;
  /** Modificateurs de talent. Les bots partagent `NEUTRAL_TALENTS`. */
  talents: TalentMods;
  /** Ticks restants de suspension de la décroissance (talent Relance). */
  decayPauseTicks: number;
  /** Type du triangle des forces. Vient du châssis pour le joueur, de la table
   *  de chapitre pour les bots. */
  type: TopType;
}

export interface Stats {
  attack: number;
  defense: number;
  maxSpeed: number;
  spinMax: number;
  spinDecay: number;
  accel: number;
  /** Masse issue des seuls profils. Le talent Masse s'y multiplie au montage
   *  de la toupie, pas ici. */
  mass: number;
}

export type Phase = 'fighting' | 'dead' | 'won';

export interface Input {
  steer: Vec | null;
}

export type ChestKind = 'bronze' | 'arene' | 'mythique';

/** Ce qu'une salle vidée rapporte. `tick()` le retourne, il ne l'applique pas :
 *  la simulation de combat ne touche jamais au méta. */
export interface RunReward {
  credits: number;
  gems: number;
  /** Coffres lâchés par la salle. Le premier est garanti, le second est l'extra
   *  quand il est tombé. */
  chests: ChestKind[];
  /** La salle vidée était le boss. Porté par la récompense pour que personne ne
   *  le redérive d'un numéro de salle — trois sites le faisaient, chacun à sa
   *  façon, et le troisième (`observer.ts`) était déjà mort-né. */
  boss: boolean;
  /** Le chapitre d'où vient cette récompense. Ici plutôt qu'en paramètre à part :
   *  un appelant ne peut pas se tromper de chapitre s'il ne le fournit pas. */
  chapter: number;
}

/** Ce qui vit à la cadence du tick. Jamais sauvegardé : fermer l'onglet en
 *  plein combat équivaut à abandonner le run. */
export interface RunState {
  tick: number;
  rngState: number;
  chapter: number;
  salle: number;
  /** Le châssis de cette descente. Lu une seule fois, par `startRun`, et jamais
   *  relu ensuite : c'est ce qui empêche de contre-piocher salle par salle. Le
   *  choix en attente vit dans `meta.toupies.active` et ne monte qu'à la
   *  descente suivante. */
  toupie: ToupieId;
  player: Top;
  bots: Top[];
  /** Le terrain de la salle en cours. Reconstruit à chaque entrée de salle
   *  depuis `rngState` — donc jamais sauvegardé, et couvert par le test de
   *  déterminisme sans qu'il ait à le connaître. */
  arena: ArenaLayout;
  phase: Phase;
  secondSouffleUsed: boolean;
  /** Ids éjectés pendant le dernier tick. Vidé en début de tick, lu par le rendu
   *  seul — c'est ce qui distingue une éjection d'une mort par épuisement. */
  ejected: string[];
}

/** Ce qui survit au run et à la fermeture de l'app. Seul état sauvegardé. */
export interface MetaState {
  rngState: number;
  credits: number;
  gems: number;
  equipped: Record<Slot, PieceInstance>;
  inventory: PieceStack[];
  pity: Record<ChestKind, number>;
  /** Coffres gagnés et pas encore ouverts, par type. Un compteur plutôt qu'une
   *  file : pas de plafond à inventer, donc jamais de butin jeté. */
  pending: Record<ChestKind, number>;
  /** Le meilleur chapitre jamais validé ; 0 tant qu'aucun ne l'est. Ne descend
   *  jamais : c'est la référence de farm du jalon 3, et un joueur qui redescend
   *  un chapitre déjà validé ne doit pas la perdre en jouant. */
  bestChapter: number;
  /** Les toupies possédées et celle qu'on pilote. `unlocked` est une liste et
   *  non un `Set` : elle doit se sérialiser en JSON. */
  toupies: { unlocked: ToupieId[]; active: ToupieId };
  /** Le Fondateur offert à la validation du chapitre a-t-il été réclamé ?
   *  Champ explicite, et non déduit de `unlocked.length` : la déduction
   *  deviendrait fausse dès qu'un joueur achète avant de réclamer. */
  founderGiftClaimed: boolean;
}
