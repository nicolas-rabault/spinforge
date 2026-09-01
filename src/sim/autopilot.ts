import { ARENA_RADIUS } from './config';
import type { ArenaLayout, Breach } from './terrain';
import type { RunState, Vec } from './types';

/**
 * La politique de pilotage de l'autopilote. Elle vivait dans
 * `scripts/calibrate.mjs`, d'où chaque chiffre d'équilibrage du projet est
 * sorti ; elle est ici **à l'identique**, et le harnais l'importe désormais au
 * lieu de la définir.
 *
 * Rien n'y a été « amélioré » au passage, et c'est délibéré : changer cette
 * politique changerait d'un coup tous les chiffres de référence du projet. Sa
 * neutralité est prouvée par mesure — les huit garde-fous de `npm run calibrate`
 * doivent ressortir au chiffre près (§ 2.2 de la spec du lot).
 */

/** Brèche dont le centre est angulairement le plus proche de ce point. Retourne
 *  `null` avant la salle où les brèches apparaissent. */
function nearestBreach(arena: ArenaLayout, pos: Vec): Breach | null {
  const angle = Math.atan2(pos.y, pos.x);
  let best: Breach | null = null;
  let bestGap = Infinity;
  for (const breach of arena.breaches) {
    // Écart signé replié dans [-π, π], comme `inBreach` : sans ce repli, 6,2 rad
    // et 0,05 rad — le même endroit à 2π près — sembleraient opposés.
    const raw = angle - breach.angle;
    const gap = Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw)));
    if (gap < bestGap) { bestGap = gap; best = breach; }
  }
  return best;
}

/** Politique « terrain » : pousser la cible vers la brèche la plus proche d'elle,
 *  et couper vers l'éclat quand on en est le plus près. Sans elle, l'autopilote
 *  mesurerait un jeu que personne ne joue. */
export function steerWithTerrain(run: RunState): Vec | null {
  const me = run.player.pos;
  const shard = run.arena.shard;
  if (shard) {
    const mine = Math.hypot(shard.x - me.x, shard.y - me.y);
    const contested = run.bots.some((b) => Math.hypot(shard.x - b.pos.x, shard.y - b.pos.y) < mine);
    if (!contested) return { x: shard.x - me.x, y: shard.y - me.y };
  }
  let target = null;
  let best = Infinity;
  for (const bot of run.bots) {
    const d = Math.hypot(bot.pos.x - me.x, bot.pos.y - me.y);
    if (d < best) { best = d; target = bot; }
  }
  if (!target) return null;
  const breach = nearestBreach(run.arena, target.pos);
  if (!breach) return { x: target.pos.x - me.x, y: target.pos.y - me.y };
  // Se placer sur la ligne brèche → cible, du côté opposé à la brèche, pour que
  // le choc pousse la cible dehors.
  const bx = Math.cos(breach.angle) * ARENA_RADIUS;
  const by = Math.sin(breach.angle) * ARENA_RADIUS;
  const dx = target.pos.x - bx;
  const dy = target.pos.y - by;
  const len = Math.hypot(dx, dy) || 1;
  const spot = { x: target.pos.x + (dx / len) * 26, y: target.pos.y + (dy / len) * 26 };
  const toSpot = Math.hypot(spot.x - me.x, spot.y - me.y);
  return toSpot > 18
    ? { x: spot.x - me.x, y: spot.y - me.y }
    : { x: target.pos.x - me.x, y: target.pos.y - me.y };
}
