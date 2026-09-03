import { describe, expect, it } from 'vitest';
import {
  bouncePillars,
  buildLayout,
  inBreach,
  NEUTRAL_ZONE,
  takeShard,
  updatePillars,
  updateShard,
  zoneModsAt,
  type ArenaLayout,
  type Zone,
} from './terrain';
import { ARENA, ARENA_RADIUS, BREACH, chapterArena, LAYOUTS, PLAYER_SPAWN, SHARD, ZONES } from './config';
import { NEUTRAL_TALENTS } from './talents';
import type { Top } from './types';

function layout(over: Partial<ArenaLayout> = {}): ArenaLayout {
  return {
    zones: [], breaches: [], shard: null, shardTimer: 0,
    wallRestitution: ARENA.wallRestitution, pillars: [],
    ...over,
  };
}

function zone(kind: Zone['kind'], x: number, y: number): Zone {
  return { kind, x, y, radius: ZONES[kind].radius };
}

describe('zoneModsAt', () => {
  it('rend les valeurs neutres hors de toute zone', () => {
    const l = layout({ zones: [zone('pointes', 100, 0)] });
    expect(zoneModsAt(l, { x: -100, y: 0 })).toBe(NEUTRAL_ZONE);
  });

  it('rend les valeurs neutres sur une arène nue', () => {
    expect(zoneModsAt(layout(), { x: 0, y: 0 })).toBe(NEUTRAL_ZONE);
  });

  it('applique la zone dont on occupe le centre', () => {
    const l = layout({ zones: [zone('accelerateur', 0, 0)] });
    const mods = zoneModsAt(l, { x: 0, y: 0 });
    expect(mods.speedMult).toBeCloseTo(ZONES.accelerateur.speedMult, 10);
    expect(mods.accelMult).toBeCloseTo(ZONES.accelerateur.accelMult, 10);
  });

  it('appartenir à une zone se juge au centre de la toupie, pas à son bord', () => {
    // Le repère au sol sous la toupie est ce que le joueur voit : la règle doit
    // être celle-là, pas un chevauchement de disques qu'il ne peut pas estimer.
    const r = ZONES.pointes.radius;
    const l = layout({ zones: [zone('pointes', 0, 0)] });
    expect(zoneModsAt(l, { x: r - 1, y: 0 }).spinDrain).toBe(ZONES.pointes.spinDrain);
    expect(zoneModsAt(l, { x: r + 1, y: 0 }).spinDrain).toBe(0);
  });

  it('compose deux zones superposées : produit, maximum, somme', () => {
    const l = layout({ zones: [zone('accelerateur', 0, 0), zone('pointes', 0, 0), zone('glisse', 0, 0)] });
    const mods = zoneModsAt(l, { x: 0, y: 0 });
    expect(mods.speedMult).toBeCloseTo(ZONES.accelerateur.speedMult, 10);
    expect(mods.spinDrain).toBeCloseTo(ZONES.pointes.spinDrain, 10);
    expect(mods.friction).toBeCloseTo(ZONES.glisse.friction, 10);
  });

  it('somme la perte de spin de deux zones de pointes superposées', () => {
    const l = layout({ zones: [zone('pointes', 0, 0), zone('pointes', 0, 0)] });
    expect(zoneModsAt(l, { x: 0, y: 0 }).spinDrain).toBeCloseTo(ZONES.pointes.spinDrain * 2, 10);
  });

  it('compose speedMult de deux accélérateurs : produit, pas maximum', () => {
    // Deux accélérateurs superposés : le produit rend a², le maximum rendrait a.
    // C'est ce qui sépare les deux règles de composition.
    const l = layout({ zones: [zone('accelerateur', 0, 0), zone('accelerateur', 0, 0)] });
    const mods = zoneModsAt(l, { x: 0, y: 0 });
    expect(mods.speedMult).toBeCloseTo(ZONES.accelerateur.speedMult ** 2, 10);
    expect(mods.accelMult).toBeCloseTo(ZONES.accelerateur.accelMult ** 2, 10);
  });

  it('compose friction de deux glisse : maximum, pas somme', () => {
    // Deux glisse superposées : le maximum rend a, la somme rendrait 2a.
    // C'est ce qui sépare les deux règles de composition.
    const l = layout({ zones: [zone('glisse', 0, 0), zone('glisse', 0, 0)] });
    const mods = zoneModsAt(l, { x: 0, y: 0 });
    expect(mods.friction).toBeCloseTo(ZONES.glisse.friction, 10);
  });

  it('ne laisse jamais muter les valeurs neutres', () => {
    // NEUTRAL_ZONE est rendu par référence dans le cas courant : une mutation
    // accidentelle contaminerait toutes les toupies de toutes les salles.
    expect(Object.isFrozen(NEUTRAL_ZONE)).toBe(true);
  });
});

describe('buildLayout', () => {
  it('suit le gabarit de la salle', () => {
    for (const entry of LAYOUTS) {
      const { layout } = buildLayout(1, entry.fromSalle, 12345);
      expect(layout.zones.map((z) => z.kind)).toEqual(entry.zones);
    }
  });

  it('garde le gabarit du dernier palier franchi', () => {
    // La salle 5 n'a pas d'entrée propre : elle hérite du palier 4.
    const palier4 = LAYOUTS.find((e) => e.fromSalle === 4)!;
    const { layout } = buildLayout(1, 5, 999);
    expect(layout.zones.map((z) => z.kind)).toEqual(palier4.zones);
  });

  it('rend exactement le même gabarit pour la même graine', () => {
    const a = buildLayout(1, 8, 4242);
    const b = buildLayout(1, 8, 4242);
    expect(a.layout).toEqual(b.layout);
    expect(a.rngState).toBe(b.rngState);
  });

  it('fait avancer l’état du RNG', () => {
    const { rngState } = buildLayout(1, 8, 4242);
    expect(rngState).not.toBe(4242);
  });

  it('ne pose aucune zone sur le point d’apparition du joueur', () => {
    // Commencer une salle dans les pointes serait une perte de spin qu'aucun
    // geste ne peut éviter. 300 graines (et non 200) pour que la boucle couvre
    // au moins une activation du repli déterministe : il est rare (la première
    // graine qui l'active, 221, tombait hors de la plage 1..200 initiale — voir
    // le test suivant, qui l'épingle explicitement).
    for (let seed = 1; seed <= 300; seed++) {
      const { layout } = buildLayout(1, 10, seed);
      for (const z of layout.zones) {
        const d = Math.hypot(z.x - PLAYER_SPAWN.x, z.y - PLAYER_SPAWN.y);
        expect(d, `graine ${seed}, zone ${z.kind}`).toBeGreaterThanOrEqual(z.radius + ARENA.spawnClearance);
      }
    }
  });

  it('replie une zone hors du point d’apparition quand les tirages échouent', () => {
    // La graine 221 (salle 10) est la première — trouvée par recherche linéaire,
    // graine 1, 2, 3… — dont un tirage de zone épuise les douze essais de
    // `PLACEMENT_TRIES` sans jamais dégager le point d'apparition : c'est la
    // seule preuve directe que le repli `awayFromSpawn` s'active un jour, pas
    // seulement en théorie. Si `ARENA.spawnClearance` ou le rayon d'une zone de
    // `ZONES` change, cette graine peut cesser de déclencher le repli : il faut
    // alors la rechercher à nouveau (même recherche linéaire), jamais supprimer
    // le test.
    const { layout } = buildLayout(1, 10, 221);
    const d = Math.hypot(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    // Même calcul que la production, pour ne jamais dupliquer un rayon ou une
    // clearance en dur : la position attendue suit `balance.json`.
    const expectedFallback = (radius: number) => {
      const span = ARENA_RADIUS - radius;
      const k = Math.min(span, d + radius + ARENA.spawnClearance) / d;
      return { x: -PLAYER_SPAWN.x * k, y: -PLAYER_SPAWN.y * k };
    };
    const replied = layout.zones.find((z) => {
      const away = expectedFallback(z.radius);
      return Math.abs(z.x - away.x) < 1e-9 && Math.abs(z.y - away.y) < 1e-9;
    });
    expect(replied, 'aucune zone au point de repli attendu pour la graine 221').toBeDefined();
    const toSpawn = Math.hypot(replied!.x - PLAYER_SPAWN.x, replied!.y - PLAYER_SPAWN.y);
    expect(toSpawn).toBeGreaterThanOrEqual(replied!.radius + ARENA.spawnClearance);
  });

  it('garde chaque zone entièrement dans l’anneau', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { layout } = buildLayout(1, 10, seed);
      for (const z of layout.zones) {
        expect(Math.hypot(z.x, z.y) + z.radius, `graine ${seed}`).toBeLessThanOrEqual(ARENA_RADIUS + 1e-9);
      }
    }
  });

  it('n’ouvre aucune brèche avant la salle prévue', () => {
    for (let salle = 1; salle < BREACH.fromSalle; salle++) {
      expect(buildLayout(1, salle, 7).layout.breaches).toHaveLength(0);
    }
    expect(buildLayout(1, BREACH.fromSalle, 7).layout.breaches).toHaveLength(BREACH.count);
  });

  it('répartit les brèches régulièrement — il reste toujours du bord plein', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { layout } = buildLayout(1, 10, seed);
      for (let i = 1; i < layout.breaches.length; i++) {
        const gap = layout.breaches[i].angle - layout.breaches[i - 1].angle;
        expect(gap).toBeCloseTo((Math.PI * 2) / BREACH.count, 10);
      }
    }
  });

  it('arme le compte à rebours de l’éclat sans éclat présent', () => {
    const { layout } = buildLayout(1, 1, 3);
    expect(layout.shard).toBeNull();
    expect(layout.shardTimer).toBe(SHARD.everyTicks);
  });

  it('un chapitre sans identité propre garde la restitution de l’arène', () => {
    expect(buildLayout(1, 1, 7).layout.wallRestitution).toBe(ARENA.wallRestitution);
    expect(buildLayout(1, 1, 7).layout.pillars).toEqual([]);
  });

  it('le Dojo Néon a des murs plus élastiques que le Hangar Rouillé', () => {
    expect(buildLayout(2, 1, 7).layout.wallRestitution)
      .toBeGreaterThan(buildLayout(1, 1, 7).layout.wallRestitution);
  });
});

describe('piliers', () => {
  it("le Hangar Rouillé n'a aucun pilier", () => {
    for (let salle = 1; salle <= 10; salle++) {
      expect(buildLayout(1, salle, 42).layout.pillars, `salle ${salle}`).toEqual([]);
    }
  });

  it('le Marché Souterrain en pose le nombre déclaré, dégagés du spawn', () => {
    const def = chapterArena(3).pillars!;
    for (const seed of [1, 77, 4242, 99991]) {
      const { layout } = buildLayout(3, 5, seed);
      expect(layout.pillars).toHaveLength(def.count);
      for (const p of layout.pillars) {
        expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(ARENA_RADIUS - p.radius + 1e-9);
        expect(Math.hypot(p.x - PLAYER_SPAWN.x, p.y - PLAYER_SPAWN.y))
          .toBeGreaterThanOrEqual(p.radius + ARENA.spawnClearance - 1e-9);
        expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(def.speed, 6);
      }
    }
  });

  it('un pilier avance à sa vitesse et ne sort jamais de l’arène', () => {
    const l = layout({ pillars: [{ x: 0, y: 0, radius: 16, vx: 300, vy: 0 }] });
    for (let i = 0; i < 200; i++) {
      updatePillars(l);
      expect(Math.hypot(l.pillars[0].x, l.pillars[0].y))
        .toBeLessThanOrEqual(ARENA_RADIUS - l.pillars[0].radius + 1e-9);
    }
  });

  it('un pilier garde sa vitesse en rebondissant sur le bord', () => {
    const l = layout({ pillars: [{ x: 0, y: 0, radius: 16, vx: 300, vy: 0 }] });
    for (let i = 0; i < 200; i++) updatePillars(l);
    expect(Math.hypot(l.pillars[0].vx, l.pillars[0].vy)).toBeCloseTo(300, 6);
  });

  it('un pilier repousse une toupie sans jamais lui retirer de spin', () => {
    const l = layout({ pillars: [{ x: 0, y: 0, radius: 16, vx: 0, vy: 0 }] });
    const top = shardTop({ pos: { x: 8, y: 0 }, vel: { x: -100, y: 0 } });
    const spinAvant = top.spin;
    bouncePillars(l, top);
    expect(top.spin).toBe(spinAvant);
    expect(Math.hypot(top.pos.x, top.pos.y)).toBeCloseTo(16 + top.radius, 6);
    expect(top.vel.x).toBeGreaterThan(0);
  });

  it('un pilier repousse un bot comme le joueur', () => {
    const l = layout({ pillars: [{ x: 0, y: 0, radius: 16, vx: 0, vy: 0 }] });
    const bot = shardTop({ isPlayer: false, pos: { x: 8, y: 0 }, vel: { x: -100, y: 0 } });
    bouncePillars(l, bot);
    expect(bot.vel.x).toBeGreaterThan(0);
  });
});

describe('inBreach', () => {
  const l: ArenaLayout = {
    zones: [], breaches: [{ angle: 0, halfWidth: 0.4 }], shard: null, shardTimer: 0,
    wallRestitution: ARENA.wallRestitution, pillars: [],
  };

  it('reconnaît un angle dans le secteur', () => {
    expect(inBreach(l, 0)).toBe(true);
    expect(inBreach(l, 0.39)).toBe(true);
    expect(inBreach(l, -0.39)).toBe(true);
  });

  it('rejette un angle hors du secteur', () => {
    expect(inBreach(l, 0.41)).toBe(false);
    expect(inBreach(l, Math.PI)).toBe(false);
  });

  it('recolle les angles à 2π près', () => {
    // atan2 rend ]-π, π] ; une brèche centrée sur 0,1 rad et un point à 6,2 rad
    // sont au même endroit, et un écart calculé naïvement les croirait opposés.
    const wrapped: ArenaLayout = {
      zones: [], breaches: [{ angle: 6.2, halfWidth: 0.4 }], shard: null, shardTimer: 0,
      wallRestitution: ARENA.wallRestitution, pillars: [],
    };
    expect(inBreach(wrapped, 0.05)).toBe(true);
  });

  it('rend faux sans aucune brèche', () => {
    expect(inBreach(
      { zones: [], breaches: [], shard: null, shardTimer: 0, wallRestitution: ARENA.wallRestitution, pillars: [] },
      0,
    )).toBe(false);
  });
});

function shardTop(over: Partial<Top> = {}): Top {
  const built: Top = {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, from: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: 12, spin: 500, spinMax: 1000, spinDecay: 10,
    attack: 10, defense: 10, maxSpeed: 240, accel: 900,
    talents: NEUTRAL_TALENTS, decayPauseTicks: 0,
    type: 'attaque', mass: 1,
    ...over,
  };
  if (!over.from) built.from = { ...built.pos };
  return built;
}

describe('updateShard', () => {
  it('ne fait rien tant que le compte à rebours court', () => {
    const l = layout({ shardTimer: 5 });
    updateShard(l, 1);
    expect(l.shard).toBeNull();
    expect(l.shardTimer).toBe(4);
  });

  it('ne consomme aucun tirage tant qu’aucun éclat n’apparaît', () => {
    const l = layout({ shardTimer: 5 });
    expect(updateShard(l, 77)).toBe(77);
  });

  it('fait apparaître un éclat quand le compte tombe à zéro', () => {
    const l = layout({ shardTimer: 1 });
    const after = updateShard(l, 1234);
    expect(l.shard).not.toBeNull();
    expect(l.shard!.ttl).toBe(SHARD.lifeTicks);
    expect(after).not.toBe(1234);
  });

  it('place l’éclat dans la couronne prévue', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const l = layout({ shardTimer: 1 });
      updateShard(l, seed);
      const d = Math.hypot(l.shard!.x, l.shard!.y);
      expect(d).toBeGreaterThanOrEqual(ARENA_RADIUS * SHARD.minRadius - 1e-9);
      expect(d).toBeLessThanOrEqual(ARENA_RADIUS * SHARD.maxRadius + 1e-9);
    }
  });

  it('efface un éclat expiré et rearme le compte à rebours', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 1 } });
    updateShard(l, 1);
    expect(l.shard).toBeNull();
    expect(l.shardTimer).toBe(SHARD.everyTicks);
  });
});

describe('takeShard', () => {
  it('rend du spin au premier arrivé et efface l’éclat', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const t = shardTop({ id: 'a', spin: 500 });
    expect(takeShard(l, [t])).toBe('a');
    expect(t.spin).toBeCloseTo(500 + SHARD.spinGain * 1000, 5);
    expect(l.shard).toBeNull();
    expect(l.shardTimer).toBe(SHARD.everyTicks);
  });

  it('ne dépasse jamais le spin maximum', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const t = shardTop({ spin: 990 });
    takeShard(l, [t]);
    expect(t.spin).toBe(1000);
  });

  it('n’en donne qu’à un seul, dans l’ordre du tableau', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const a = shardTop({ id: 'a' });
    const b = shardTop({ id: 'b' });
    expect(takeShard(l, [a, b])).toBe('a');
    expect(b.spin).toBe(500);
  });

  it('ignore une toupie hors de portée', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const t = shardTop({ pos: { x: SHARD.radius + 12 + 5, y: 0 } });
    expect(takeShard(l, [t])).toBeNull();
    expect(l.shard).not.toBeNull();
  });

  it('ramasse un éclat traversé en cours de tick', () => {
    // 80 px parcourus dans le tick pour 26 px de portée : ni le départ ni
    // l'arrivée ne sont à portée, mais le trajet passe sur l'éclat.
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const t = shardTop({ id: 'a', from: { x: -40, y: 0 }, pos: { x: 40, y: 0 } });
    expect(takeShard(l, [t])).toBe('a');
    expect(l.shard).toBeNull();
  });

  it('ignore un trajet qui passe à côté sans jamais l’approcher', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const t = shardTop({ from: { x: -40, y: 30 }, pos: { x: 40, y: 30 } });
    expect(takeShard(l, [t])).toBeNull();
    expect(l.shard).not.toBeNull();
  });

  it('ne ramasse pas un éclat droit devant, pas encore atteint', () => {
    // Aligné sur la trajectoire, mais 60 px au-delà du point d'arrivée : le
    // trajet s'arrête avant. Mesurer sur la droite plutôt que sur le segment le
    // ferait ramasser d'avance.
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const t = shardTop({ from: { x: -100, y: 0 }, pos: { x: -60, y: 0 } });
    expect(takeShard(l, [t])).toBeNull();
    expect(l.shard).not.toBeNull();
  });

  it('rend null sans éclat', () => {
    expect(takeShard(layout(), [shardTop()])).toBeNull();
  });

  it('ne ressuscite pas une toupie déjà à zéro', () => {
    // takeShard tourne avant le filtre des morts : sans cette garde, un joueur
    // éjecté au même tick esquiverait sa mort en effleurant l'éclat.
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const dead = shardTop({ id: 'mort', spin: 0 });
    const alive = shardTop({ id: 'vif' });
    expect(takeShard(l, [dead, alive])).toBe('vif');
    expect(dead.spin).toBe(0);
  });
});

/**
 * Épingle de non-régression du chapitre 1 (jalon 3, lot C1).
 *
 * Le chapitre 1, Hangar Rouillé, n'a aucun piège et ne doit jamais en avoir.
 * Le lot C1 fait apprendre le chapitre au gabarit ; « neutre au chapitre 1 »
 * y veut dire bit à bit, pas « à peu près comme avant ». Ces valeurs sont
 * relevées sur `origin/main` à d6991fa, AVANT la couture, et aucune tâche du
 * lot n'a le droit de les faire bouger.
 *
 * La salle 10 tient le cas du repli déterministe (`awayFromSpawn`) : sa
 * dernière zone est exactement (0, -122), qu'aucun tirage ne produit.
 */
describe('chapitre 1 — épingle de non-régression (lot C1)', () => {
  const pins = [
    {
      salle: 1, seed: 3, rngState: -631835667, shardTimer: 72,
      zones: [['accelerateur', -4.242, -22.410789, 34]],
      breaches: [] as number[][],
    },
    {
      salle: 5, seed: 999, rngState: -1327611538, shardTimer: 72,
      zones: [
        ['accelerateur', 90.773443, -17.371635, 34],
        ['pointes', -89.244967, 24.937261, 28],
        ['pointes', 27.862806, -42.312898, 28],
      ],
      breaches: [[2.232355, 0.593412], [5.373948, 0.593412]],
    },
    {
      salle: 10, seed: 221, rngState: -951541434, shardTimer: 72,
      zones: [
        ['accelerateur', -62.301051, -38.964414, 34],
        ['pointes', -3.852297, -75.613901, 28],
        ['pointes', -109.751949, 24.860843, 28],
        ['pointes', 0, -122, 28],
      ],
      breaches: [[0.026905, 0.593412], [3.168497, 0.593412]],
    },
  ];

  for (const pin of pins) {
    it(`salle ${pin.salle} rend exactement le gabarit relevé`, () => {
      const { layout, rngState } = buildLayout(1, pin.salle, pin.seed);
      expect(rngState).toBe(pin.rngState);
      expect(layout.shardTimer).toBe(pin.shardTimer);
      expect(layout.shard).toBeNull();
      expect(layout.zones.map((z) => [z.kind, +z.x.toFixed(6), +z.y.toFixed(6), z.radius]))
        .toEqual(pin.zones);
      expect(layout.breaches.map((b) => [+b.angle.toFixed(6), +b.halfWidth.toFixed(6)]))
        .toEqual(pin.breaches);
    });
  }
});
