import { describe, expect, it } from 'vitest';
import { NEUTRAL_ZONE, zoneModsAt, type ArenaLayout, type Zone } from './terrain';
import { ZONES } from './config';

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

  it('ne laisse jamais muter les valeurs neutres', () => {
    // NEUTRAL_ZONE est rendu par référence dans le cas courant : une mutation
    // accidentelle contaminerait toutes les toupies de toutes les salles.
    expect(Object.isFrozen(NEUTRAL_ZONE)).toBe(true);
  });
});
