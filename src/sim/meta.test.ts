import { describe, expect, it } from 'vitest';
import { addPiece, applyReward, applyRunReward, createInitialMeta, equipFromStack, pendingTotal, stackOf, takePiece } from './meta';
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

  it('démarre avec une file de butin vide', () => {
    const meta = createInitialMeta(1);
    expect(meta.pending).toEqual({ bronze: 0, arene: 0, mythique: 0 });
    expect(pendingTotal(meta)).toBe(0);
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
    applyReward(meta, { credits: 120, gems: 0, chests: [] });
    applyReward(meta, { credits: 30, gems: 40, chests: [] });
    expect(meta.credits).toBe(150);
    expect(meta.gems).toBe(40);
  });

  it('le butin d’une récompense rejoint la file', () => {
    const meta = createInitialMeta(1);
    applyReward(meta, { credits: 0, gems: 0, chests: ['bronze', 'arene'] });
    expect(meta.pending.bronze).toBe(1);
    expect(meta.pending.arene).toBe(1);
  });
});

describe('applyRunReward', () => {
  it('ne valide pas le chapitre sur une salle ordinaire', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 120, gems: 0, chests: [] }, 3);
    expect(meta.chapterValidated).toBe(false);
  });

  it('valide le chapitre quand la salle vidée était la dernière', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 1, gems: 40, chests: [] }, SALLES_PER_CHAPTER);
    expect(meta.chapterValidated).toBe(true);
    expect(meta.gems).toBe(40);
  });
});

describe('inventaire', () => {
  it('empile les pièces de même modèle et même rang', () => {
    const meta = createInitialMeta(1);
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 4 });
    expect(meta.inventory).toHaveLength(1);
    expect(stackOf(meta, 'disque.lourd', 1)).toEqual({ model: 'disque.lourd', rank: 1, levels: [4, 0] });
  });

  it('sépare les piles quand le rang diffère', () => {
    const meta = createInitialMeta(1);
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 2, level: 0 });
    expect(meta.inventory).toHaveLength(2);
  });

  it('retire la pile quand elle se vide', () => {
    const meta = createInitialMeta(1);
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    expect(takePiece(meta, 'disque.lourd', 1)).toBe(0);
    expect(meta.inventory).toHaveLength(0);
    expect(takePiece(meta, 'disque.lourd', 1)).toBeNull();
  });

  it('équiper renvoie la pièce remplacée dans l’inventaire', () => {
    const meta = createInitialMeta(1);
    const previous = { ...meta.equipped.disque };
    addPiece(meta, { model: 'disque.colosse', rank: 3, level: 2 });
    expect(equipFromStack(meta, 'disque.colosse', 3)).toBe(true);
    expect(meta.equipped.disque).toEqual({ model: 'disque.colosse', rank: 3, level: 2 });
    expect(stackOf(meta, previous.model, previous.rank)!.levels).toEqual([previous.level]);
  });

  it('refuse d’équiper une pièce absente', () => {
    const meta = createInitialMeta(1);
    expect(equipFromStack(meta, 'disque.colosse', 9)).toBe(false);
  });
});

describe('pendingTotal', () => {
  it('somme les trois types', () => {
    const meta = createInitialMeta(1);
    meta.pending.bronze = 3;
    meta.pending.arene = 2;
    meta.pending.mythique = 1;
    expect(pendingTotal(meta)).toBe(6);
  });
});
