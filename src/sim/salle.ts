import { ARENA_RADIUS, BOSS, BOT_BASE, BOT_SCALING, BOT_SPAWN_RING, SALLES_PER_CHAPTER } from './config';
import { nextRandom } from './rng';
import type { Top } from './types';

export function botCountFor(salle: number): number {
  if (salle === SALLES_PER_CHAPTER) return 1;
  return Math.min(1 + Math.floor((salle - 1) / 3), 3);
}

export function makeBot(salle: number, index: number, angle: number): Top {
  const boss = salle === SALLES_PER_CHAPTER;
  const spinScale = 1 + BOT_SCALING.spinPerSalle * (salle - 1);
  const attackScale = 1 + BOT_SCALING.attackPerSalle * (salle - 1);
  const spinMax = BOT_BASE.spinMax * spinScale * (boss ? BOSS.spinMult : 1);
  const dist = ARENA_RADIUS * BOT_SPAWN_RING;
  return {
    id: `bot-${salle}-${index}`,
    isPlayer: false,
    aim: null,
    pos: { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist },
    vel: { x: 0, y: 0 },
    radius: boss ? BOSS.radius : BOT_BASE.radius,
    spin: spinMax,
    spinMax,
    spinDecay: BOT_BASE.spinDecay,
    attack: BOT_BASE.attack * attackScale * (boss ? BOSS.attackMult : 1),
    defense: BOT_BASE.defense,
    maxSpeed: BOT_BASE.maxSpeed,
    accel: BOT_BASE.accel,
  };
}

export function spawnSalle(salle: number, rngState: number): { bots: Top[]; rngState: number } {
  const bots: Top[] = [];
  let rng = rngState;
  for (let i = 0; i < botCountFor(salle); i++) {
    const r = nextRandom(rng);
    rng = r.state;
    // angle ∈ [π, 2π] → sin ≤ 0 → moitié haute (y négatif) ; le joueur spawn en (0, 80)
    const angle = Math.PI + r.value * Math.PI;
    bots.push(makeBot(salle, i, angle));
  }
  return { bots, rngState: rng };
}
