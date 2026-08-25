import { describe, expect, it } from 'vitest';
import { applyReward, applyRunReward, createInitialMeta } from './meta';
import { SALLES_PER_CHAPTER } from './config';

describe('createInitialMeta', () => {
  it('démarre sans monnaie, sans doublon, avec quatre pièces équipées', () => {
    const meta = createInitialMeta(42);
    expect(meta.credits).toBe(0);
    expect(meta.gems).toBe(0);
    expect(meta.inventory).toHaveLength(0);
    expect(Object.keys(meta.equipped).sort()).toEqual(['disque', 'lame', 'noyau', 'pointe']);
    expect(meta.pity).toEqual({ bronze: 0, arene: 0, mythique: 0 });
    expect(meta.chapterValidated).toBe(false);
  });

  it('ne partage aucun objet avec le modèle d’équipement de départ', () => {
    const a = createInitialMeta(1);
    const b = createInitialMeta(1);
    a.equipped.lame.level = 5;
    expect(b.equipped.lame.level).toBe(0);
  });

  it('a son propre flux de RNG, distinct de la graine brute nulle', () => {
    expect(createInitialMeta(0).rngState).toBe(1);
    expect(createInitialMeta(42).rngState).toBe(42);
  });
});

describe('applyReward', () => {
  it('ajoute crédits et gemmes', () => {
    const meta = createInitialMeta(1);
    applyReward(meta, { credits: 120, gems: 0 });
    applyReward(meta, { credits: 30, gems: 40 });
    expect(meta.credits).toBe(150);
    expect(meta.gems).toBe(40);
  });
});

describe('applyRunReward', () => {
  it('ne valide pas le chapitre sur une salle ordinaire', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 120, gems: 0 }, 3);
    expect(meta.chapterValidated).toBe(false);
  });

  it('valide le chapitre quand la salle vidée était la dernière', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 1, gems: 40 }, SALLES_PER_CHAPTER);
    expect(meta.chapterValidated).toBe(true);
    expect(meta.gems).toBe(40);
  });
});
