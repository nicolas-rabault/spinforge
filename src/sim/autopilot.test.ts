import { describe, expect, it } from 'vitest';
import { steerWithTerrain } from './autopilot';
import { createInitialMeta } from './meta';
import { startRun } from './sim';

describe('steerWithTerrain', () => {
  it('ne vise rien quand la salle est vide', () => {
    const run = startRun(createInitialMeta(1), 1, 7);
    run.bots = [];
    run.arena.shard = null;
    expect(steerWithTerrain(run)).toBeNull();
  });

  it('vise l’éclat quand le joueur en est le plus près', () => {
    const run = startRun(createInitialMeta(1), 1, 7);
    run.player.pos = { x: 0, y: 0 };
    run.arena.shard = { x: 10, y: 0, ttl: 60 };
    run.bots[0].pos = { x: -140, y: 0 };
    const aim = steerWithTerrain(run)!;
    expect(aim.x).toBeGreaterThan(0);
    expect(Math.abs(aim.y)).toBeLessThan(1e-9);
  });

  it('rend deux fois la même direction pour le même état', () => {
    const run = startRun(createInitialMeta(1), 1, 7);
    expect(steerWithTerrain(run)).toEqual(steerWithTerrain(run));
  });
});
