import type { TopType } from '../content/toupies';
import { drainPerTick } from '../sim/combat';
import { zoneModsAt, type ArenaLayout } from '../sim/terrain';
import type { Phase, RunState, Top } from '../sim/types';

/** Ce que le rendu retient d'une toupie entre deux ticks. */
export interface TopSnapshot {
  id: string;
  x: number;
  y: number;
  spin: number;
  /** Perte de spin **effective** du tick à venir : décroissance naturelle,
   *  talents et terrain compris. `observe()` la retranche pour isoler ce qui
   *  vient d'un choc — sans le terrain, une toupie posée sur des pointes
   *  produirait des étincelles en continu sans qu'aucun contact ait eu lieu. */
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
  /** Ids éjectés pendant le tick que cet instantané clôt. */
  ejected: string[];
}

function snap(top: Top, layout: ArenaLayout): TopSnapshot {
  return {
    id: top.id,
    x: top.pos.x,
    y: top.pos.y,
    spin: top.spin,
    decayPerTick: drainPerTick(top, zoneModsAt(layout, top.pos)),
    isPlayer: top.isPlayer,
    type: top.type,
  };
}

export function takeSnapshot(run: RunState): Snapshot {
  return {
    salle: run.salle,
    phase: run.phase,
    tops: [snap(run.player, run.arena), ...run.bots.map((bot) => snap(bot, run.arena))],
    // `tick()` réaffecte `run.ejected` à un tableau neuf : cet instantané garde
    // donc bien celui de son propre tick, sans copie.
    ejected: run.ejected,
  };
}

export function snapshotById(s: Snapshot): Map<string, TopSnapshot> {
  return new Map(s.tops.map((t) => [t.id, t]));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
