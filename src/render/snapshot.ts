import type { Phase, RunState } from '../sim/types';

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
  tops: TopSnapshot[];
}

function snap(top: RunState['player']): TopSnapshot {
  return {
    id: top.id,
    x: top.pos.x,
    y: top.pos.y,
    spin: top.spin,
    spinDecay: top.spinDecay,
    isPlayer: top.isPlayer,
  };
}

export function takeSnapshot(run: RunState): Snapshot {
  return {
    salle: run.salle,
    phase: run.phase,
    tops: [snap(run.player), ...run.bots.map(snap)],
  };
}

export function snapshotById(s: Snapshot): Map<string, TopSnapshot> {
  return new Map(s.tops.map((t) => [t.id, t]));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
