import { describe, expect, it } from 'vitest';
import { applySteering, clampToArena, moveAndBounce } from './physics';
import { ARENA_RADIUS, FRICTION, TICK_S } from './config';
import { NEUTRAL_TALENTS } from './talents';
import type { Top } from './types';

function top(over: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: 12, spin: 1000, spinMax: 1000, spinDecay: 10,
    attack: 10, defense: 10, maxSpeed: 240, accel: 900,
    talents: NEUTRAL_TALENTS, decayPauseTicks: 0,
    type: 'attaque', mass: 1,
    ...over,
  };
}

describe("applySteering", () => {
  it("accélère dans la direction visée (normalisée)", () => {
    const t = top();
    applySteering(t, { x: 10, y: 0 });
    expect(t.vel.x).toBeCloseTo(900 * TICK_S, 5);
    expect(t.vel.y).toBe(0);
  });

  it("freine par friction quand on relâche", () => {
    const t = top({ vel: { x: 100, y: 0 } });
    applySteering(t, null);
    expect(t.vel.x).toBeCloseTo(100 * FRICTION, 5);
  });

  it("plafonne à maxSpeed", () => {
    const t = top({ vel: { x: 239, y: 0 } });
    applySteering(t, { x: 1, y: 0 });
    expect(Math.hypot(t.vel.x, t.vel.y)).toBeCloseTo(240, 5);
  });
});

describe("moveAndBounce", () => {
  it("avance de vel × TICK_S", () => {
    const t = top({ vel: { x: 50, y: -30 } });
    moveAndBounce(t);
    expect(t.pos.x).toBeCloseTo(5, 5);
    expect(t.pos.y).toBeCloseTo(-3, 5);
  });

  it("rebondit sur le bord et reste dans l’arène", () => {
    const t = top({ pos: { x: ARENA_RADIUS, y: 0 }, vel: { x: 100, y: 0 } });
    moveAndBounce(t);
    expect(t.pos.x).toBeCloseTo(ARENA_RADIUS - t.radius, 5);
    expect(t.vel.x).toBeLessThan(0);
  });
});

describe("clampToArena", () => {
  it("repousse une toupie sortie de l’anneau sur le bord", () => {
    const t = top({ pos: { x: 200, y: 0 } });
    clampToArena(t);
    expect(Math.hypot(t.pos.x, t.pos.y)).toBeCloseTo(ARENA_RADIUS - t.radius, 5);
    expect(t.pos.x).toBeGreaterThan(0);
  });

  it("conserve la direction de la position", () => {
    const t = top({ pos: { x: 300, y: 400 } }); // direction 3/4/5
    clampToArena(t);
    const d = Math.hypot(t.pos.x, t.pos.y);
    expect(t.pos.x / d).toBeCloseTo(0.6, 5);
    expect(t.pos.y / d).toBeCloseTo(0.8, 5);
  });

  it("ne touche ni à la vitesse ni à une toupie déjà à l’intérieur", () => {
    const t = top({ pos: { x: 10, y: 10 }, vel: { x: 50, y: -20 } });
    clampToArena(t);
    expect(t.pos).toEqual({ x: 10, y: 10 });
    expect(t.vel).toEqual({ x: 50, y: -20 });
  });

  it("ne divise pas par zéro au centre exact", () => {
    const t = top({ pos: { x: 0, y: 0 } });
    clampToArena(t);
    expect(t.pos).toEqual({ x: 0, y: 0 });
  });
});

function movingTop(overrides: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 100, y: 0 },
    radius: 12, spin: 1000, spinMax: 1000, spinDecay: 10,
    attack: 30, defense: 10, maxSpeed: 200, accel: 500,
    talents: NEUTRAL_TALENTS, decayPauseTicks: 0,
    type: 'attaque', mass: 1,
    ...overrides,
  };
}

describe('talent Glisse', () => {
  it('conserve mieux la vitesse en roue libre', () => {
    const plain = movingTop();
    applySteering(plain, null);

    const glisse = movingTop({ talents: { ...NEUTRAL_TALENTS, friction: 0.99 } });
    applySteering(glisse, null);

    expect(glisse.vel.x).toBeGreaterThan(plain.vel.x);
    expect(plain.vel.x).toBeCloseTo(100 * FRICTION, 10);
  });
});

describe('talent Toupie folle', () => {
  it('ne change rien à spin plein', () => {
    const t = movingTop({ vel: { x: 1000, y: 0 }, talents: { ...NEUTRAL_TALENTS, toupieFolle: 0.4 } });
    applySteering(t, null);
    expect(t.vel.x).toBeCloseTo(200, 6);
  });

  it('relève la vitesse maximale à mesure que le spin baisse', () => {
    const t = movingTop({ vel: { x: 1000, y: 0 }, spin: 0, talents: { ...NEUTRAL_TALENTS, toupieFolle: 0.4 } });
    applySteering(t, null);
    expect(t.vel.x).toBeCloseTo(200 * 1.4, 6);
  });

  it('ne fait rien sans le talent', () => {
    const t = movingTop({ vel: { x: 1000, y: 0 }, spin: 0 });
    applySteering(t, null);
    expect(t.vel.x).toBeCloseTo(200, 6);
  });
});
