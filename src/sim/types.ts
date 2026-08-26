import type { ToupieId } from '../content/toupies';
import type { PieceInstance, PieceStack, Slot } from './piece';
import type { TalentMods } from './talents';

export interface Vec {
  x: number;
  y: number;
}

export interface Top {
  id: string;
  isPlayer: boolean;
  pos: Vec;
  vel: Vec;
  aim: Vec | null; // direction IA (bots) — null pour le joueur
  radius: number;
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
}

export interface Stats {
  attack: number;
  defense: number;
  maxSpeed: number;
  spinMax: number;
  spinDecay: number;
}

export type Phase = 'fighting' | 'dead';

export interface Input {
  steer: Vec | null;
}

export type ChestKind = 'bronze' | 'arene' | 'mythique';

/** Ce qu'une salle vidée rapporte. `tick()` le retourne, il ne l'applique pas :
 *  la simulation de combat ne touche jamais au méta. */
export interface RunReward {
  credits: number;
  gems: number;
}

/** Ce qui vit à la cadence du tick. Jamais sauvegardé : fermer l'onglet en
 *  plein combat équivaut à abandonner le run. */
export interface RunState {
  tick: number;
  rngState: number;
  chapter: number;
  salle: number;
  player: Top;
  bots: Top[];
  phase: Phase;
  secondSouffleUsed: boolean;
}

/** Ce qui survit au run et à la fermeture de l'app. Seul état sauvegardé. */
export interface MetaState {
  rngState: number;
  credits: number;
  gems: number;
  equipped: Record<Slot, PieceInstance>;
  inventory: PieceStack[];
  pity: Record<ChestKind, number>;
  chapterValidated: boolean;
  /** Les toupies possédées et celle qu'on pilote. `unlocked` est une liste et
   *  non un `Set` : elle doit se sérialiser en JSON. */
  toupies: { unlocked: ToupieId[]; active: ToupieId };
  /** Le Fondateur offert à la validation du chapitre a-t-il été réclamé ?
   *  Champ explicite, et non déduit de `unlocked.length` : la déduction
   *  deviendrait fausse dès qu'un joueur achète avant de réclamer. */
  founderGiftClaimed: boolean;
}
