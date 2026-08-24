import { describe, expect, it } from 'vitest';
import { applySteering, moveAndBounce } from './physics';
import { ARENA_RADIUS, FRICTION, TICK_S } from './config';
import type { Top } from './types';

function top(over: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: 12, spin: 1000, spinMax: 1000, spinDecay: 10,
    attack: 10, defense: 10, maxSpeed: 240, accel: 900,
    ...over,
  };
}

describe('applySteering', () => {
  it('accélère dans la direction visée (normalisée)', () => {
    const t = top();
    applySteering(t, { x: 10, y: 0 });
    expect(t.vel.x).toBeCloseTo(900 * TICK_S, 5);
    expect(t.vel.y).toBe(0);
  });

  it('freine par friction quand on relâche', () => {
    const t = top({ vel: { x: 100, y: 0 } });
    applySteering(t, null);
    expect(t.vel.x).toBeCloseTo(100 * FRICTION, 5);
  });

  it('plafonne à maxSpeed', () => {
    const t = top({ vel: { x: 239, y: 0 } });
    applySteering(t, { x: 1, y: 0 });
    expect(Math.hypot(t.vel.x, t.vel.y)).toBeCloseTo(240, 5);
  });
});

describe('moveAndBounce', () => {
  it('avance de vel × TICK_S', () => {
    const t = top({ vel: { x: 50, y: -30 } });
    moveAndBounce(t);
    expect(t.pos.x).toBeCloseTo(5, 5);
    expect(t.pos.y).toBeCloseTo(-3, 5);
  });

  it('rebondit sur le bord et reste dans l’arène', () => {
    const t = top({ pos: { x: ARENA_RADIUS, y: 0 }, vel: { x: 100, y: 0 } });
    moveAndBounce(t);
    expect(t.pos.x).toBeCloseTo(ARENA_RADIUS - t.radius, 5);
    expect(t.vel.x).toBeLessThan(0);
  });
});
