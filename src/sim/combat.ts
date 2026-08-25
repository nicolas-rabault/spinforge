import { CHARGE_BONUS, DAMAGE_K, RESTITUTION, TICK_S } from './config';
import type { Top } from './types';

export function decaySpin(top: Top): void {
  top.spin -= top.spinDecay * TICK_S;
}

export function resolveCollision(a: Top, b: Top): void {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;
  if (dist === 0 || dist >= minDist) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = (minDist - dist) / 2;
  a.pos.x -= nx * overlap;
  a.pos.y -= ny * overlap;
  b.pos.x += nx * overlap;
  b.pos.y += ny * overlap;
  const rvx = b.vel.x - a.vel.x;
  const rvy = b.vel.y - a.vel.y;
  const vrel = rvx * nx + rvy * ny;
  if (vrel >= 0) return;
  const impact = -vrel;
  // Qui a provoqué le rapprochement ? Se lit AVANT l'impulsion de rebond, qui
  // échange précisément les vitesses des deux toupies et inverserait donc la
  // réponse. `impact` est la somme exacte des deux vitesses de fermeture, donc
  // `share` les répartit entre assaillant et assailli et les deux poids somment
  // toujours à 2. Sans ce partage, foncer et attendre infligeaient rigoureusement
  // les mêmes dégâts : mesuré à l'autopilote, un joueur qui ne touchait jamais
  // l'écran validait le chapitre 1 aussi vite qu'un joueur qui charge.
  const share = clamp01((a.vel.x * nx + a.vel.y * ny) / impact);
  const j = (-(1 + RESTITUTION) * vrel) / 2;
  a.vel.x -= j * nx;
  a.vel.y -= j * ny;
  b.vel.x += j * nx;
  b.vel.y += j * ny;
  b.spin -= ((impact * a.attack) / (a.attack + b.defense)) * DAMAGE_K * chargeWeight(share);
  a.spin -= ((impact * b.attack) / (b.attack + a.defense)) * DAMAGE_K * chargeWeight(1 - share);
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 1 quand les deux avancent autant, 1 + CHARGE_BONUS pour un assaut pur. */
function chargeWeight(share: number): number {
  return 1 - CHARGE_BONUS + 2 * CHARGE_BONUS * share;
}
