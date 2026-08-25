import type { Phase, SimState } from '../sim/types';

/** Ce que le rendu retient d'une toupie entre deux ticks. */
export interface TopSnapshot {
  id: string;
  x: number;
  y: number;
  spin: number;
  spinDecay: number;
  isPlayer: boolean;
}

export interface Snapshot {
  salle: number;
  phase: Phase;
  chapterValidated: boolean;
  tops: TopSnapshot[];
}

function snap(top: SimState['player']): TopSnapshot {
  return {
    id: top.id,
    x: top.pos.x,
    y: top.pos.y,
    spin: top.spin,
    spinDecay: top.spinDecay,
    isPlayer: top.isPlayer,
  };
}

export function takeSnapshot(state: SimState): Snapshot {
  return {
    salle: state.salle,
    phase: state.phase,
    chapterValidated: state.chapterValidated,
    tops: [snap(state.player), ...state.bots.map(snap)],
  };
}

export function snapshotById(s: Snapshot): Map<string, TopSnapshot> {
  return new Map(s.tops.map((t) => [t.id, t]));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
