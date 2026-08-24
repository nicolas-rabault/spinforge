import { DAMAGE_K, RESTITUTION, TICK_S } from './config';
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
  const j = (-(1 + RESTITUTION) * vrel) / 2;
  a.vel.x -= j * nx;
  a.vel.y -= j * ny;
  b.vel.x += j * nx;
  b.vel.y += j * ny;
  const impact = -vrel;
  b.spin -= ((impact * a.attack) / (a.attack + b.defense)) * DAMAGE_K;
  a.spin -= ((impact * b.attack) / (b.attack + a.defense)) * DAMAGE_K;
}
