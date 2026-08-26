import { describe, expect, it } from 'vitest';
import { buildLayout, inBreach, NEUTRAL_ZONE, zoneModsAt, type ArenaLayout, type Zone } from './terrain';
import { ARENA, ARENA_RADIUS, BREACH, LAYOUTS, PLAYER_SPAWN, SHARD, ZONES } from './config';

function layout(over: Partial<ArenaLayout> = {}): ArenaLayout {
  return { zones: [], breaches: [], shard: null, shardTimer: 0, ...over };
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
      const { layout } = buildLayout(entry.fromSalle, 12345);
      expect(layout.zones.map((z) => z.kind)).toEqual(entry.zones);
    }
  });

  it('garde le gabarit du dernier palier franchi', () => {
    // La salle 5 n'a pas d'entrée propre : elle hérite du palier 4.
    const palier4 = LAYOUTS.find((e) => e.fromSalle === 4)!;
    const { layout } = buildLayout(5, 999);
    expect(layout.zones.map((z) => z.kind)).toEqual(palier4.zones);
  });

  it('rend exactement le même gabarit pour la même graine', () => {
    const a = buildLayout(8, 4242);
    const b = buildLayout(8, 4242);
    expect(a.layout).toEqual(b.layout);
    expect(a.rngState).toBe(b.rngState);
  });

  it('fait avancer l’état du RNG', () => {
    const { rngState } = buildLayout(8, 4242);
    expect(rngState).not.toBe(4242);
  });

  it('ne pose aucune zone sur le point d’apparition du joueur', () => {
    // Commencer une salle dans les pointes serait une perte de spin qu'aucun
    // geste ne peut éviter.
    for (let seed = 1; seed <= 200; seed++) {
      const { layout } = buildLayout(10, seed);
      for (const z of layout.zones) {
        const d = Math.hypot(z.x - PLAYER_SPAWN.x, z.y - PLAYER_SPAWN.y);
        expect(d, `graine ${seed}, zone ${z.kind}`).toBeGreaterThanOrEqual(z.radius + ARENA.spawnClearance);
      }
    }
  });

  it('garde chaque zone entièrement dans l’anneau', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { layout } = buildLayout(10, seed);
      for (const z of layout.zones) {
        expect(Math.hypot(z.x, z.y) + z.radius, `graine ${seed}`).toBeLessThanOrEqual(ARENA_RADIUS + 1e-9);
      }
    }
  });

  it('n’ouvre aucune brèche avant la salle prévue', () => {
    for (let salle = 1; salle < BREACH.fromSalle; salle++) {
      expect(buildLayout(salle, 7).layout.breaches).toHaveLength(0);
    }
    expect(buildLayout(BREACH.fromSalle, 7).layout.breaches).toHaveLength(BREACH.count);
  });

  it('répartit les brèches régulièrement — il reste toujours du bord plein', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { layout } = buildLayout(10, seed);
      for (let i = 1; i < layout.breaches.length; i++) {
        const gap = layout.breaches[i].angle - layout.breaches[i - 1].angle;
        expect(gap).toBeCloseTo((Math.PI * 2) / BREACH.count, 10);
      }
    }
  });

  it('arme le compte à rebours de l’éclat sans éclat présent', () => {
    const { layout } = buildLayout(1, 3);
    expect(layout.shard).toBeNull();
    expect(layout.shardTimer).toBe(SHARD.everyTicks);
  });
});

describe('inBreach', () => {
  const l: ArenaLayout = {
    zones: [], breaches: [{ angle: 0, halfWidth: 0.4 }], shard: null, shardTimer: 0,
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
    };
    expect(inBreach(wrapped, 0.05)).toBe(true);
  });

  it('rend faux sans aucune brèche', () => {
    expect(inBreach({ zones: [], breaches: [], shard: null, shardTimer: 0 }, 0)).toBe(false);
  });
});
