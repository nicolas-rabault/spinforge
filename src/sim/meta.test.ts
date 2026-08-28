import { describe, expect, it } from 'vitest';
import {
  addPiece,
  applyReward,
  applyRunReward,
  buyToupie,
  canClaimFounderGift,
  claimFounderGift,
  createInitialMeta,
  equipFromStack,
  pendingTotal,
  setActiveToupie,
  stackOf,
  takePiece,
} from './meta';
import { SALLES_PER_CHAPTER, TOUPIE_SHOP } from './config';

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

describe('toupies du méta', () => {
  it('démarre avec la seule toupie de départ, active', () => {
    const meta = createInitialMeta(1);
    expect(meta.toupies.unlocked).toEqual(['brasier-solaire']);
    expect(meta.toupies.active).toBe('brasier-solaire');
    expect(meta.founderGiftClaimed).toBe(false);
  });

  it('n’active que ce qui est débloqué', () => {
    const meta = createInitialMeta(1);
    expect(setActiveToupie(meta, 'typhon-primal')).toBe(false);
    expect(meta.toupies.active).toBe('brasier-solaire');
  });

  it('achète une toupie, une seule fois, et débite les gemmes', () => {
    const meta = createInitialMeta(1);
    meta.gems = TOUPIE_SHOP.priceGems * 2;
    expect(buyToupie(meta, 'typhon-primal')).toBe(true);
    expect(meta.gems).toBe(TOUPIE_SHOP.priceGems);
    expect(meta.toupies.unlocked).toContain('typhon-primal');
    // Deuxième achat de la même : refusé, et surtout pas débité.
    expect(buyToupie(meta, 'typhon-primal')).toBe(false);
    expect(meta.gems).toBe(TOUPIE_SHOP.priceGems);
  });

  it('refuse l’achat sans les gemmes, sans rien débiter', () => {
    const meta = createInitialMeta(1);
    meta.gems = TOUPIE_SHOP.priceGems - 1;
    expect(buyToupie(meta, 'typhon-primal')).toBe(false);
    expect(meta.gems).toBe(TOUPIE_SHOP.priceGems - 1);
    expect(meta.toupies.unlocked).toEqual(['brasier-solaire']);
  });

  it('n’ouvre le cadeau qu’une fois le chapitre validé', () => {
    const meta = createInitialMeta(1);
    expect(canClaimFounderGift(meta)).toBe(false);
    expect(claimFounderGift(meta, 'carapace-abyssale')).toBe(false);
    meta.chapterValidated = true;
    expect(canClaimFounderGift(meta)).toBe(true);
    expect(claimFounderGift(meta, 'carapace-abyssale')).toBe(true);
    expect(meta.toupies.unlocked).toContain('carapace-abyssale');
    expect(meta.founderGiftClaimed).toBe(true);
  });

  // Le drapeau explicite existe pour ce cas précis : la déduction
  // « unlocked.length === 1 » deviendrait fausse dès qu’on achète avant de réclamer.
  it('laisse le cadeau réclamable après un achat en boutique', () => {
    const meta = createInitialMeta(1);
    meta.chapterValidated = true;
    meta.gems = TOUPIE_SHOP.priceGems;
    buyToupie(meta, 'typhon-primal');
    expect(canClaimFounderGift(meta)).toBe(true);
    expect(claimFounderGift(meta, 'tigre-foudre')).toBe(true);
    expect(meta.toupies.unlocked).toHaveLength(3);
  });

  it('ne réclame pas deux fois', () => {
    const meta = createInitialMeta(1);
    meta.chapterValidated = true;
    claimFounderGift(meta, 'carapace-abyssale');
    expect(canClaimFounderGift(meta)).toBe(false);
    expect(claimFounderGift(meta, 'tigre-foudre')).toBe(false);
    expect(meta.toupies.unlocked).not.toContain('tigre-foudre');
  });

  it('refuse de réclamer une toupie déjà possédée', () => {
    const meta = createInitialMeta(1);
    meta.chapterValidated = true;
    expect(claimFounderGift(meta, 'brasier-solaire')).toBe(false);
    expect(meta.founderGiftClaimed).toBe(false);
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
