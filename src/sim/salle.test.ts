import { describe, expect, it } from 'vitest';
import { botCountFor, botTypeFor, makeBot, spawnSalle } from './salle';
import { BOSS, BOT_BASE, BOT_SCALING, SALLES_PER_CHAPTER } from './config';

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
    const b1 = makeBot(1, 1, 0, 0);
    const b5 = makeBot(1, 5, 0, 0);
    expect(b1.spinMax).toBe(BOT_BASE.spinMax);
    expect(b5.spinMax).toBeCloseTo(BOT_BASE.spinMax * 1.6, 5);
  });

  it('la salle 10 produit un boss', () => {
    const boss = makeBot(1, 10, 0, 0);
    expect(boss.radius).toBe(BOSS.radius);
    expect(boss.spinMax).toBeGreaterThan(makeBot(1, 9, 0, 0).spinMax * 2);
  });

  it('le boss est lourd, le bot ordinaire ne l’est pas', () => {
    expect(makeBot(1, SALLES_PER_CHAPTER, 0, 0).mass).toBe(BOSS.mass);
    expect(makeBot(1, 1, 0, 0).mass).toBe(1);
  });

  // Vérifié par mutation : remplacer l'exposant `chapter - 1` par `chapter` fait
  // rougir ce test. C'est lui qui rend exacte la comparaison des garde-fous du
  // chapitre 1 avant/après ce lot.
  it('le chapitre 1 est inchangé par le facteur de chapitre', () => {
    // Le facteur n'apparaît nulle part dans les attendus : c'est le point. Au
    // chapitre 1 l'exposant vaut 0, donc la formule est exactement celle du
    // palier de salle, quelle que soit la valeur du facteur.
    for (const salle of [1, 5, 9]) {
      expect(makeBot(1, salle, 0, 0).spinMax, `salle ${salle}`).toBeCloseTo(
        BOT_BASE.spinMax * (1 + BOT_SCALING.spinPerSalle * (salle - 1)), 6);
      expect(makeBot(1, salle, 0, 0).attack, `salle ${salle}`).toBeCloseTo(
        BOT_BASE.attack * (1 + BOT_SCALING.attackPerSalle * (salle - 1)), 6);
    }
  });

  it('le facteur de chapitre est géométrique et se compose avec le palier de salle', () => {
    const salle = 5;
    const c1 = makeBot(1, salle, 0, 0);
    const c3 = makeBot(3, salle, 0, 0);
    expect(c3.spinMax / c1.spinMax).toBeCloseTo(Math.pow(BOT_SCALING.spinPerChapter, 2), 6);
    expect(c3.attack / c1.attack).toBeCloseTo(Math.pow(BOT_SCALING.attackPerChapter, 2), 6);
  });
});

describe('spawnSalle', () => {
  it('est déterministe et fait avancer le RNG', () => {
    const a = spawnSalle(1, 4, 123);
    const b = spawnSalle(1, 4, 123);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.bots).toHaveLength(2);
    expect(a.rngState).not.toBe(123);
  });

  it('place les bots dans la moitié haute, loin du spawn joueur', () => {
    const { bots } = spawnSalle(1, 7, 99);
    for (const bot of bots) expect(bot.pos.y).toBeLessThanOrEqual(0);
  });
});

describe('types des bots', () => {
  it('suit la table du chapitre 1', () => {
    expect([1, 2, 3].map((s) => botTypeFor(1, s))).toEqual(['endurance', 'endurance', 'endurance']);
    expect([4, 5, 6].map((s) => botTypeFor(1, s))).toEqual(['defense', 'defense', 'defense']);
    expect([7, 8, 9].map((s) => botTypeFor(1, s))).toEqual(['attaque', 'attaque', 'attaque']);
    expect(botTypeFor(1, 10)).toBe('attaque');
  });

  it('borne les salles hors plage au lieu de rendre indéfini', () => {
    expect(botTypeFor(1, 0)).toBe('endurance');
    expect(botTypeFor(1, 99)).toBe('attaque');
  });

  it('retombe sur le chapitre 1 pour un chapitre sans table', () => {
    expect(botTypeFor(7, 5)).toBe(botTypeFor(1, 5));
  });

  it('donne son type au bot qu’il fabrique, et une masse ordinaire', () => {
    const bot = makeBot(1, 5, 0, 0);
    expect(bot.type).toBe('defense');
    expect(bot.mass).toBe(1);
  });
});
