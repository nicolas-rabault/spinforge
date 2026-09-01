import { describe, expect, it } from 'vitest';
import { addPiece, createInitialMeta } from '../sim/meta';
import { STARTER_TOUPIE } from '../content/toupies';
import { attention, shoppingToupie, stackKey } from './attention';
import type { MetaState, RunState } from '../sim/types';

function empty(): MetaState {
  return createInitialMeta(1);
}

describe('attention', () => {
  it('n’allume rien sur une partie neuve', () => {
    const att = attention(empty(), STARTER_TOUPIE);
    expect(att.coffres).toBe(0);
    expect(att.stacks.size).toBe(0);
    expect(att.markedSlots.size).toBe(0);
    expect(att.betterSlots.size).toBe(0);
    expect(att.toupies).toBe(false);
  });

  it('compte les coffres en attente, tous types confondus', () => {
    const meta = empty();
    meta.pending.bronze = 2;
    meta.pending.mythique = 1;
    expect(attention(meta, STARTER_TOUPIE).coffres).toBe(3);
  });

  // Trois exemplaires identiques au rang 1 : la recette de base est réunie.
  it('marque une pile fusionnable, sans allumer sa ligne d’emplacement', () => {
    const meta = empty();
    for (let i = 0; i < 3; i++) addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    const att = attention(meta, STARTER_TOUPIE);
    expect(att.stacks.has(stackKey('disque.lourd', 1))).toBe(true);
    expect(att.markedSlots.has('disque')).toBe(true);
    // Fusionner ne change pas la toupie montée : rien à faire sur la ligne.
    expect(att.betterSlots.has('disque')).toBe(false);
  });

  it('marque une pile dominante et allume sa ligne d’emplacement', () => {
    const meta = empty();
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    const att = attention(meta, STARTER_TOUPIE);
    expect(att.stacks.has(stackKey('disque.lourd', 4))).toBe(true);
    expect(att.betterSlots.has('disque')).toBe(true);
    expect(att.markedSlots.has('disque')).toBe(true);
  });

  it('n’allume que l’emplacement concerné', () => {
    const meta = empty();
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    const att = attention(meta, STARTER_TOUPIE);
    for (const slot of ['lame', 'pointe', 'noyau'] as const) {
      expect(att.betterSlots.has(slot)).toBe(false);
    }
  });

  // Une pile qui ne bat rien et ne se fusionne pas ne doit rien allumer :
  // sans quoi l'inventaire finirait entièrement marqué.
  it('ignore une pile ni dominante ni fusionnable', () => {
    const meta = empty();
    addPiece(meta, { model: 'disque.axial', rank: 1, level: 0 });
    const att = attention(meta, STARTER_TOUPIE);
    expect(att.stacks.size).toBe(0);
    expect(att.markedSlots.size).toBe(0);
  });

  // `chapterValidated` est le champ d'aujourd'hui. `jalon-3-lot-a` le remplace
  // par `bestChapter` (schéma 5) : après un rebase sur leur travail, ce test
  // devra lire le nouveau champ — voir la tâche 9, étape 7.
  it('signale le Fondateur dès qu’il est réclamable', () => {
    const meta = empty();
    meta.chapterValidated = true;
    expect(attention(meta, STARTER_TOUPIE).toupies).toBe(true);
    meta.founderGiftClaimed = true;
    expect(attention(meta, STARTER_TOUPIE).toupies).toBe(false);
  });

  // Le meilleur exemplaire est celui que `equipFromStack` monterait : comparer
  // un autre annoncerait un gain que l'échange ne donnerait pas.
  it('compare le meilleur exemplaire de la pile', () => {
    const meta = empty();
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 5 });
    const att = attention(meta, STARTER_TOUPIE);
    expect(att.betterSlots.has('disque')).toBe(true);
  });
});

describe('shoppingToupie', () => {
  // La Forge chiffre la toupie sur laquelle l'achat va porter : celle de
  // l'arène tant que le run vit, celle qui attend une fois la descente perdue.
  it('suit la toupie de l’arène tant que le run vit', () => {
    const meta = createInitialMeta(1);
    const run = { phase: 'fighting', toupie: 'brasier-solaire' } as RunState;
    meta.toupies.active = 'typhon-primal';
    expect(shoppingToupie(meta, run)).toBe('brasier-solaire');
  });

  it('bascule sur la toupie active une fois la descente perdue', () => {
    const meta = createInitialMeta(1);
    const run = { phase: 'dead', toupie: 'brasier-solaire' } as RunState;
    meta.toupies.active = 'typhon-primal';
    expect(shoppingToupie(meta, run)).toBe('typhon-primal');
  });
});
