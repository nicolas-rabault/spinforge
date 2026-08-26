import { describe, expect, it } from 'vitest';
import { createInitialMeta } from './meta';
import { resolveProfile } from './profile';
import { playerStats } from './economy';
import { PLAYER_BASE } from './config';

describe('resolveProfile', () => {
  it('est strictement neutre pour l’équipement de départ', () => {
    const p = resolveProfile(createInitialMeta(1));
    for (const axis of Object.values(p)) expect(axis).toBe(1);
  });

  it('multiplie châssis, Disque et Pointe sur le même axe', () => {
    const meta = createInitialMeta(1);
    meta.toupies = { unlocked: ['brasier-solaire', 'carapace-abyssale'], active: 'carapace-abyssale' };
    meta.equipped.disque = { model: 'disque.colosse', rank: 1, level: 0 };
    // Carapace ×1,40 et Colosse ×1,30 sur la masse.
    expect(resolveProfile(meta).mass).toBeCloseTo(1.4 * 1.3, 5);
  });

  it('laisse à 1 les axes qu’aucun profil ne touche', () => {
    const meta = createInitialMeta(1);
    meta.equipped.pointe = { model: 'pointe.aiguille', rank: 1, level: 0 };
    expect(resolveProfile(meta).defense).toBe(1);
  });
});

describe('playerStats avec les profils', () => {
  it('ne bouge pas d’un iota pour une sauvegarde neuve', () => {
    const s = playerStats(createInitialMeta(1));
    expect(s.attack).toBeCloseTo(PLAYER_BASE.attack, 9);
    expect(s.defense).toBeCloseTo(PLAYER_BASE.defense, 9);
    expect(s.maxSpeed).toBeCloseTo(PLAYER_BASE.maxSpeed, 9);
    expect(s.spinMax).toBeCloseTo(PLAYER_BASE.spinMax, 9);
    expect(s.spinDecay).toBeCloseTo(PLAYER_BASE.spinDecay, 9);
    expect(s.accel).toBeCloseTo(PLAYER_BASE.accel, 9);
    expect(s.mass).toBe(1);
  });

  it('applique le châssis à l’accélération', () => {
    const meta = createInitialMeta(1);
    meta.toupies = { unlocked: ['brasier-solaire', 'typhon-primal'], active: 'typhon-primal' };
    expect(playerStats(meta).accel).toBeCloseTo(PLAYER_BASE.accel * 1.25, 6);
  });

  // La décroissance est une perte : un multiplicateur < 1 est un gain.
  it('compose la décroissance dans le bon sens', () => {
    const meta = createInitialMeta(1);
    meta.toupies = { unlocked: ['brasier-solaire', 'tigre-foudre'], active: 'tigre-foudre' };
    const base = playerStats(createInitialMeta(1)).spinDecay;
    expect(playerStats(meta).spinDecay).toBeCloseTo(base * 0.75, 6);
    expect(playerStats(meta).spinDecay).toBeLessThan(base);
  });

  it('empile profil et rang sur le même axe sans que l’un n’écrase l’autre', () => {
    const meta = createInitialMeta(1);
    meta.equipped.pointe = { model: 'pointe.furie', rank: 1, level: 0 };
    const withProfile = playerStats(meta).maxSpeed;
    meta.equipped.pointe = { model: 'pointe.furie', rank: 3, level: 0 };
    const withRank = playerStats(meta).maxSpeed;
    expect(withRank).toBeCloseTo(withProfile * Math.pow(1.08, 2), 6);
  });
});
