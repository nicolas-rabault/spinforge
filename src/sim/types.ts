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
}

export interface PieceLevels {
  noyau: number;
  lame: number;
  disque: number;
  pointe: number;
}

export interface Stats {
  attack: number;
  defense: number;
  maxSpeed: number;
  accel: number;
  spinMax: number;
  spinDecay: number;
}

export type Phase = 'fighting' | 'dead';

export interface Input {
  steer: Vec | null;
}

export interface SimState {
  tick: number;
  rngState: number;
  chapter: number;
  salle: number;
  credits: number;
  pieces: PieceLevels;
  player: Top;
  bots: Top[];
  phase: Phase;
  chapterValidated: boolean;
}
