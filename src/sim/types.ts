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
  vel: Vec;
  aim: Vec | null; // direction IA (bots) — null pour le joueur
  radius: number;
  /** Masse propre, hors talent. 1 pour toute toupie ordinaire ; le boss est le
   *  seul à en porter davantage aujourd'hui. Se **multiplie** avec
   *  `talents.mass` (Masse, rang 11) au lieu de la remplacer. */
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
  chapterValidated: boolean;
}
