import { ARENA_RADIUS, FRICTION, TICK_S, WALL_RESTITUTION } from './config';
import type { Top, Vec } from './types';

export function applySteering(top: Top, steer: Vec | null): void {
  if (steer) {
    const len = Math.hypot(steer.x, steer.y) || 1;
    top.vel.x += (steer.x / len) * top.accel * TICK_S;
    top.vel.y += (steer.y / len) * top.accel * TICK_S;
  } else {
    top.vel.x *= FRICTION;
    top.vel.y *= FRICTION;
  }
  const speed = Math.hypot(top.vel.x, top.vel.y);
  if (speed > top.maxSpeed) {
    const k = top.maxSpeed / speed;
    top.vel.x *= k;
    top.vel.y *= k;
  }
}

export function moveAndBounce(top: Top): void {
  top.pos.x += top.vel.x * TICK_S;
  top.pos.y += top.vel.y * TICK_S;
  const d = Math.hypot(top.pos.x, top.pos.y);
  const limit = ARENA_RADIUS - top.radius;
  if (d > limit && d > 0) {
    const nx = top.pos.x / d;
    const ny = top.pos.y / d;
    top.pos.x = nx * limit;
    top.pos.y = ny * limit;
    const dot = top.vel.x * nx + top.vel.y * ny;
    if (dot > 0) {
      top.vel.x -= (1 + WALL_RESTITUTION) * dot * nx;
      top.vel.y -= (1 + WALL_RESTITUTION) * dot * ny;
    }
  }
}

/**
 * Repousse une toupie à l'intérieur de l'anneau sans toucher à sa vitesse.
 * Appelé après les collisions, qui déplacent les positions sans les re-borner.
 */
export function clampToArena(top: Top): void {
  const d = Math.hypot(top.pos.x, top.pos.y);
  const limit = ARENA_RADIUS - top.radius;
  if (d <= limit || d === 0) return;
  const k = limit / d;
  top.pos.x *= k;
  top.pos.y *= k;
}
