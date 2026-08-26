import { describe, expect, it } from 'vitest';
import { applySteering, clampToArena, moveAndBounce } from './physics';
import { ARENA, ARENA_RADIUS, FRICTION, TICK_S, ZONES } from './config';
import { NEUTRAL_ZONE, type ArenaLayout, type ZoneMods } from './terrain';
import { NEUTRAL_TALENTS } from './talents';
import type { Top } from './types';

function layout(breaches: ArenaLayout['breaches'] = []): ArenaLayout {
  return { zones: [], breaches, shard: null, shardTimer: 0 };
}

function top(over: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: 12, spin: 1000, spinMax: 1000, spinDecay: 10,
    attack: 10, defense: 10, maxSpeed: 240, accel: 900,
    talents: NEUTRAL_TALENTS, decayPauseTicks: 0,
    ...over,
  };
}

describe("applySteering", () => {
  it("accélère dans la direction visée (normalisée)", () => {
    const t = top();
    applySteering(t, { x: 10, y: 0 }, NEUTRAL_ZONE);
    expect(t.vel.x).toBeCloseTo(900 * TICK_S, 5);
    expect(t.vel.y).toBe(0);
  });

  it("freine par friction quand on relâche", () => {
    const t = top({ vel: { x: 100, y: 0 } });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeCloseTo(100 * FRICTION, 5);
  });

  it("plafonne à maxSpeed", () => {
    const t = top({ vel: { x: 239, y: 0 } });
    applySteering(t, { x: 1, y: 0 }, NEUTRAL_ZONE);
    expect(Math.hypot(t.vel.x, t.vel.y)).toBeCloseTo(240, 5);
  });
});

function zoneMods(over: Partial<ZoneMods> = {}): ZoneMods {
  return { ...NEUTRAL_ZONE, ...over };
}

describe('applySteering — amortissement de surcharge', () => {
  it('ne tronque plus une vitesse reçue d’un choc', () => {
    // Le défaut d'origine : le recul d'une collision était ramené au plafond au
    // tick suivant, AVANT que moveAndBounce ne l'ait parcouru d'un seul pixel.
    const t = top({ vel: { x: 500, y: 0 } });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeGreaterThan(240);
  });

  it('amortit d’un facteur constant tant qu’on est au-dessus du plafond', () => {
    const t = top({ vel: { x: 500, y: 0 } });
    applySteering(t, null, NEUTRAL_ZONE);
    // Le plafond du tick vaut 500 × 0,9 = 450 ; la friction seule donnerait 470,
    // c'est donc le plafond qui tranche.
    expect(t.vel.x).toBeCloseTo(500 * ARENA.overspeedDamping, 5);
  });

  it('le pilotage seul ne franchit jamais le plafond', () => {
    // Le garde-fou du plafond lu AVANT le pilotage. Amorti après coup, tenir son
    // doigt ferait converger le joueur vers 810 px/s au lieu de 240.
    const t = top();
    for (let i = 0; i < 60; i++) applySteering(t, { x: 1, y: 0 }, NEUTRAL_ZONE);
    expect(Math.hypot(t.vel.x, t.vel.y)).toBeCloseTo(240, 5);
  });

  it('ne descend jamais sous le plafond par amortissement', () => {
    const t = top({ vel: { x: 241, y: 0 }, talents: { ...NEUTRAL_TALENTS, friction: 1 } });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeCloseTo(240, 5);
  });

  it('converge vers le plafond en une poignée de ticks', () => {
    const t = top({ vel: { x: 500, y: 0 } });
    for (let i = 0; i < 20; i++) applySteering(t, null, NEUTRAL_ZONE);
    expect(Math.hypot(t.vel.x, t.vel.y)).toBeLessThanOrEqual(240 + 1e-9);
  });
});

describe('applySteering — zones', () => {
  it('un accélérateur relève le plafond', () => {
    const zone = zoneMods({ speedMult: ZONES.accelerateur.speedMult });
    const t = top({ vel: { x: 239, y: 0 } });
    applySteering(t, { x: 1, y: 0 }, zone);
    expect(Math.hypot(t.vel.x, t.vel.y)).toBeGreaterThan(240);
  });

  it('un accélérateur multiplie l’accélération', () => {
    const zone = zoneMods({ accelMult: 2 });
    const t = top();
    applySteering(t, { x: 1, y: 0 }, zone);
    expect(t.vel.x).toBeCloseTo(900 * 2 * TICK_S, 5);
  });

  it('une plaque glissante l’emporte sur la friction ordinaire', () => {
    const zone = zoneMods({ friction: 0.99 });
    const t = top({ vel: { x: 100, y: 0 } });
    applySteering(t, null, zone);
    expect(t.vel.x).toBeCloseTo(100 * 0.99, 5);
  });

  it('une zone ne peut pas rendre une toupie plus adhérente qu’elle ne l’est', () => {
    // friction de zone neutre = 0 : le `max` laisse la friction du talent intacte.
    const t = top({ vel: { x: 100, y: 0 }, talents: { ...NEUTRAL_TALENTS, friction: 0.96 } });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeCloseTo(100 * 0.96, 5);
  });
});

describe("moveAndBounce", () => {
  it("avance de vel × TICK_S", () => {
    const t = top({ vel: { x: 50, y: -30 } });
    moveAndBounce(t, layout());
    expect(t.pos.x).toBeCloseTo(5, 5);
    expect(t.pos.y).toBeCloseTo(-3, 5);
  });

  it("rebondit sur le bord et reste dans l’arène", () => {
    const t = top({ pos: { x: ARENA_RADIUS, y: 0 }, vel: { x: 100, y: 0 } });
    moveAndBounce(t, layout());
    expect(t.pos.x).toBeCloseTo(ARENA_RADIUS - t.radius, 5);
    expect(t.vel.x).toBeLessThan(0);
  });
});

describe('moveAndBounce — brèches', () => {
  // Une brèche centrée sur l'axe +x : une toupie qui sort par la droite y passe.
  const breached = () => layout([{ angle: 0, halfWidth: 0.4 }]);
  const atRim = () => ({ x: ARENA_RADIUS - 12 - 1, y: 0 });

  it('éjecte au-dessus du seuil, dans la brèche', () => {
    const t = top({ pos: atRim(), vel: { x: ARENA.breach.ejectSpeed + 50, y: 0 } });
    expect(moveAndBounce(t, breached())).toBe(true);
  });

  it('n’éjecte pas hors brèche, à la même vitesse', () => {
    // Même toupie, même vitesse, brèche à l'opposé : le mur tient.
    const t = top({ pos: atRim(), vel: { x: ARENA.breach.ejectSpeed + 50, y: 0 } });
    expect(moveAndBounce(t, layout([{ angle: Math.PI, halfWidth: 0.4 }]))).toBe(false);
  });

  it('n’éjecte pas sous le seuil, même dans la brèche', () => {
    const t = top({ pos: atRim(), vel: { x: ARENA.breach.ejectSpeed - 20, y: 0 } });
    expect(moveAndBounce(t, breached())).toBe(false);
  });

  it('n’éjecte jamais sur une arène sans brèche', () => {
    const t = top({ pos: atRim(), vel: { x: 900, y: 0 } });
    expect(moveAndBounce(t, layout())).toBe(false);
  });

  it('arrête net la toupie éjectée, au bord', () => {
    // Sinon le sursis de Second souffle la ressusciterait au bord, toujours
    // sortante, pour la faire éjecter au tick suivant.
    const t = top({ pos: atRim(), vel: { x: 400, y: 0 } });
    moveAndBounce(t, breached());
    expect(t.vel.x).toBe(0);
    expect(t.vel.y).toBe(0);
    expect(Math.hypot(t.pos.x, t.pos.y)).toBeCloseTo(ARENA_RADIUS - 12, 5);
  });

  it('rebondit normalement quand il n’y a pas éjection', () => {
    const t = top({ pos: atRim(), vel: { x: 100, y: 0 } });
    moveAndBounce(t, layout([{ angle: Math.PI, halfWidth: 0.4 }]));
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
    ...overrides,
  };
}

describe('talent Glisse', () => {
  it('conserve mieux la vitesse en roue libre', () => {
    const plain = movingTop();
    applySteering(plain, null, NEUTRAL_ZONE);

    const glisse = movingTop({ talents: { ...NEUTRAL_TALENTS, friction: 0.99 } });
    applySteering(glisse, null, NEUTRAL_ZONE);

    expect(glisse.vel.x).toBeGreaterThan(plain.vel.x);
    expect(plain.vel.x).toBeCloseTo(100 * FRICTION, 10);
  });
});

describe('talent Toupie folle', () => {
  // Vitesse de départ modérée et friction neutralisée (1) : à 1000 px/s, le plafond
  // hérité (vitesse courante × overspeedDamping) dominerait le max() et masquerait
  // l'effet de toupieFolle sur effectiveMaxSpeed — ce n'est pas ce que ce bloc teste.
  it('ne change rien à spin plein', () => {
    const t = movingTop({ vel: { x: 210, y: 0 }, talents: { ...NEUTRAL_TALENTS, toupieFolle: 0.4, friction: 1 } });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeCloseTo(200, 6);
  });

  it('relève la vitesse maximale à mesure que le spin baisse', () => {
    const t = movingTop({
      vel: { x: 290, y: 0 }, spin: 0,
      talents: { ...NEUTRAL_TALENTS, toupieFolle: 0.4, friction: 1 },
    });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeCloseTo(200 * 1.4, 6);
  });

  it('ne fait rien sans le talent', () => {
    const t = movingTop({ vel: { x: 210, y: 0 }, spin: 0, talents: { ...NEUTRAL_TALENTS, friction: 1 } });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeCloseTo(200, 6);
  });
});
