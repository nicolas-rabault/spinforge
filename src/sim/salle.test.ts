import { describe, expect, it } from 'vitest';
import { botCountFor, makeBot, spawnSalle } from './salle';
import { BOSS, BOT_BASE, SALLES_PER_CHAPTER } from './config';

describe('botCountFor', () => {
  it('suit la table de la spec : 1-3→1, 4-6→2, 7-9→3, 10→1 boss', () => {
    expect(botCountFor(1)).toBe(1);
    expect(botCountFor(3)).toBe(1);
    expect(botCountFor(4)).toBe(2);
    expect(botCountFor(7)).toBe(3);
    expect(botCountFor(9)).toBe(3);
    expect(botCountFor(10)).toBe(1);
  });
});

describe('makeBot', () => {
  it('scale le spin avec la salle', () => {
    const b1 = makeBot(1, 0, 0);
    const b5 = makeBot(5, 0, 0);
    expect(b1.spinMax).toBe(BOT_BASE.spinMax);
    expect(b5.spinMax).toBeCloseTo(BOT_BASE.spinMax * 1.6, 5);
  });

  it('la salle 10 produit un boss', () => {
    const boss = makeBot(10, 0, 0);
    expect(boss.radius).toBe(BOSS.radius);
    expect(boss.spinMax).toBeGreaterThan(makeBot(9, 0, 0).spinMax * 2);
  });

  it('le boss est lourd, le bot ordinaire ne l’est pas', () => {
    expect(makeBot(SALLES_PER_CHAPTER, 0, 0).mass).toBe(BOSS.mass);
    expect(makeBot(1, 0, 0).mass).toBe(1);
  });
});

describe('spawnSalle', () => {
  it('est déterministe et fait avancer le RNG', () => {
    const a = spawnSalle(4, 123);
    const b = spawnSalle(4, 123);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.bots).toHaveLength(2);
    expect(a.rngState).not.toBe(123);
  });

  it('place les bots dans la moitié haute, loin du spawn joueur', () => {
    const { bots } = spawnSalle(7, 99);
    for (const bot of bots) expect(bot.pos.y).toBeLessThanOrEqual(0);
  });
});
