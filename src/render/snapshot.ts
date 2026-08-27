import type { TopType } from '../content/toupies';
import { decayPerTick } from '../sim/combat';
import type { Phase, RunState } from '../sim/types';

/** Ce que le rendu retient d'une toupie entre deux ticks. */
export interface TopSnapshot {
  id: string;
  x: number;
  y: number;
  spin: number;
  /** Décroissance **effective** du tick à venir, talents compris. `observe()`
   *  la retranche pour isoler ce qui vient d'un choc ; la valeur brute
   *  `spinDecay` mentirait dès qu'un talent module l'endurance. */
  decayPerTick: number;
  isPlayer: boolean;
  /** Type du triangle des forces (Task 4) — constant pour une toupie donnée,
   *  porte le repère visuel de topView.ts. */
  type: TopType;
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
    decayPerTick: decayPerTick(top),
    isPlayer: top.isPlayer,
    type: top.type,
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
