import { ARENA_RADIUS, BOSS, BOTS_PER_SALLE, BOT_BASE, BOT_SCALING, BOT_SPAWN_RING, BOT_TYPES, SALLES_PER_CHAPTER } from './config';
import { nextRandom } from './rng';
import { NEUTRAL_TALENTS } from './talents';
import type { Top } from './types';
import type { TopType } from '../content/toupies';

export function botCountFor(salle: number): number {
  return BOTS_PER_SALLE[Math.min(Math.max(1, salle), BOTS_PER_SALLE.length) - 1];
}

/** Type des bots d'une salle. La table est indexée par chapitre ; un chapitre
 *  sans entrée retombe sur celle du chapitre 1, ce qui laisse les chapitres 2
 *  à 8 arriver un par un sans casser la simulation entre-temps. */
export function botTypeFor(chapter: number, salle: number): TopType {
  const table = BOT_TYPES[String(chapter)] ?? BOT_TYPES['1'];
  return table[Math.min(Math.max(1, salle), table.length) - 1];
}

export function makeBot(chapter: number, salle: number, index: number, angle: number): Top {
  const boss = salle === SALLES_PER_CHAPTER;
  const spinScale = 1 + BOT_SCALING.spinPerSalle * (salle - 1);
  const attackScale = 1 + BOT_SCALING.attackPerSalle * (salle - 1);
  const spinMax = BOT_BASE.spinMax * spinScale * (boss ? BOSS.spinMult : 1);
  const dist = ARENA_RADIUS * BOT_SPAWN_RING;
  return {
    id: `bot-${chapter}-${salle}-${index}`,
    isPlayer: false,
    aim: null,
    pos: { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist },
    vel: { x: 0, y: 0 },
    radius: boss ? BOSS.radius : BOT_BASE.radius,
    mass: boss ? BOSS.mass : 1,
    spin: spinMax,
    spinMax,
    spinDecay: BOT_BASE.spinDecay,
    attack: BOT_BASE.attack * attackScale * (boss ? BOSS.attackMult : 1),
    defense: BOT_BASE.defense,
    maxSpeed: BOT_BASE.maxSpeed,
    accel: BOT_BASE.accel,
    talents: NEUTRAL_TALENTS,
    decayPauseTicks: 0,
    type: botTypeFor(chapter, salle),
  };
}

export function spawnSalle(chapter: number, salle: number, rngState: number): { bots: Top[]; rngState: number } {
  const bots: Top[] = [];
  let rng = rngState;
  for (let i = 0; i < botCountFor(salle); i++) {
    const r = nextRandom(rng);
    rng = r.state;
    // angle ∈ [π, 2π] → sin ≤ 0 → moitié haute (y négatif) ; le joueur spawn en (0, 80)
    const angle = Math.PI + r.value * Math.PI;
    bots.push(makeBot(chapter, salle, i, angle));
  }
  return { bots, rngState: rng };
}
