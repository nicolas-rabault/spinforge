import { SALLES_PER_CHAPTER, TICK_S } from '../sim/config';
import { FEEL } from './feel';
import { snapshotById, type Snapshot, type TopSnapshot } from './snapshot';

export interface HitEvent {
  id: string;
  x: number;
  y: number;
  /** Direction normalisée du contact, vers la toupie la plus proche. */
  nx: number;
  ny: number;
  /** Puissance du choc, bornée à [0, 1]. */
  power: number;
}

export interface DeathEvent {
  id: string;
  x: number;
  y: number;
  isPlayer: boolean;
}

export interface RenderEvents {
  hits: HitEvent[];
  deaths: DeathEvent[];
  salleChanged: boolean;
  bossEntered: boolean;
  chapterValidated: boolean;
}

function nearest(from: TopSnapshot, tops: TopSnapshot[]): { nx: number; ny: number } {
  let bestX = 0;
  let bestY = 0;
  let bestD = Infinity;
  for (const other of tops) {
    if (other.id === from.id) continue;
    const dx = other.x - from.x;
    const dy = other.y - from.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < bestD) {
      bestD = d;
      bestX = dx / d;
      bestY = dy / d;
    }
  }
  return { nx: bestX, ny: bestY };
}

/**
 * Déduit les événements de rendu en comparant deux instantanés.
 * Fonction pure : la simulation n'émet rien, c'est ici qu'on reconstruit.
 */
export function observe(before: Snapshot, after: Snapshot): RenderEvents {
  const wasThere = snapshotById(before);
  const hits: HitEvent[] = [];
  const deaths: DeathEvent[] = [];

  for (const top of after.tops) {
    const prev = wasThere.get(top.id);
    if (!prev) continue;
    // Ce qui a été perdu au-delà de la décroissance d'endurance est un choc.
    const extra = prev.spin - top.spin - prev.spinDecay * TICK_S;
    if (extra <= FEEL.hitEpsilon) continue;
    const { nx, ny } = nearest(top, after.tops);
    hits.push({
      id: top.id,
      x: top.x,
      y: top.y,
      nx,
      ny,
      power: Math.min(1, extra / FEEL.hitReference),
    });
  }

  const stillThere = snapshotById(after);
  for (const top of before.tops) {
    // La simulation retire les bots morts de state.bots dès le tick où ils tombent.
    if (!top.isPlayer && !stillThere.has(top.id)) {
      deaths.push({ id: top.id, x: top.x, y: top.y, isPlayer: false });
    }
  }
  if (before.phase !== 'dead' && after.phase === 'dead') {
    const player = stillThere.get('player') ?? wasThere.get('player');
    if (player) deaths.push({ id: player.id, x: player.x, y: player.y, isPlayer: true });
  }

  return {
    hits,
    deaths,
    salleChanged: before.salle !== after.salle,
    bossEntered: before.salle !== SALLES_PER_CHAPTER && after.salle === SALLES_PER_CHAPTER,
    chapterValidated: !before.chapterValidated && after.chapterValidated,
  };
}
