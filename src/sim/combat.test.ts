import { describe, expect, it } from 'vitest';
import { decaySpin, resolveCollision } from './combat';
import { TICK_S } from './config';
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

describe('decaySpin', () => {
  it('décroît de spinDecay × TICK_S', () => {
    const t = top({ spinDecay: 20 });
    decaySpin(t);
    expect(t.spin).toBeCloseTo(1000 - 20 * TICK_S, 5);
  });
});

describe('resolveCollision', () => {
  it('ne fait rien sans chevauchement', () => {
    const a = top();
    const b = top({ pos: { x: 100, y: 0 } });
    resolveCollision(a, b);
    expect(a.spin).toBe(1000);
    expect(b.spin).toBe(1000);
  });

  it('sépare, fait rebondir et échange des dégâts — l’attaquant fort gagne l’échange', () => {
    const a = top({ id: 'a', vel: { x: 100, y: 0 }, attack: 30, defense: 10 });
    const b = top({ id: 'b', pos: { x: 20, y: 0 }, attack: 18, defense: 6 });
    resolveCollision(a, b);
    const dist = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
    expect(dist).toBeGreaterThanOrEqual(24 - 1e-9);
    expect(a.spin).toBeLessThan(1000);
    expect(b.spin).toBeLessThan(1000);
    expect(b.spin).toBeLessThan(a.spin); // 30/(30+6) > 18/(18+10)
    expect(b.vel.x).toBeGreaterThan(0); // b est poussé
  });

  it('ignore des toupies qui s’éloignent déjà', () => {
    const a = top({ vel: { x: -50, y: 0 } });
    const b = top({ pos: { x: 20, y: 0 }, vel: { x: 50, y: 0 } });
    resolveCollision(a, b);
    expect(a.spin).toBe(1000);
    expect(b.spin).toBe(1000);
  });
});
