import { describe, expect, it } from 'vitest';
import { canOpen, chestPrice, openChest } from './chest';
import { createInitialMeta } from './meta';
import { CHESTS } from './config';
import { modelById } from '../content/pieces';
import type { MetaState } from './types';

function rich(): MetaState {
  const meta = createInitialMeta(12345);
  meta.credits = 10_000_000;
  meta.gems = 10_000_000;
  return meta;
}

describe('prix', () => {
  it('applique la remise du ×10', () => {
    expect(chestPrice('bronze', 1)).toEqual({ currency: 'credits', amount: CHESTS.bronze.price });
    expect(chestPrice('bronze', 10)).toEqual({ currency: 'credits', amount: CHESTS.bronze.price10 });
    expect(CHESTS.bronze.price10).toBeLessThan(CHESTS.bronze.price * 10);
  });

  it('Arène et Mythique se paient en gemmes', () => {
    expect(chestPrice('arene', 1).currency).toBe('gems');
    expect(chestPrice('mythique', 10).currency).toBe('gems');
  });
});

describe('débit', () => {
  it('refuse et ne touche à rien si la monnaie manque', () => {
    const meta = createInitialMeta(1);
    meta.credits = 100;
    expect(canOpen(meta, 'bronze', 1)).toBe(false);
    expect(openChest(meta, 'bronze', 1)).toBeNull();
    expect(meta.credits).toBe(100);
    expect(meta.rngState).toBe(createInitialMeta(1).rngState);
  });

  it('débite la bonne monnaie et rend le bon nombre de pièces', () => {
    const meta = rich();
    const before = meta.credits;
    const pulls = openChest(meta, 'bronze', 10)!;
    expect(pulls).toHaveLength(10);
    expect(meta.credits).toBe(before - CHESTS.bronze.price10);
    expect(meta.gems).toBe(10_000_000);
  });
});

describe('contenu', () => {
  it('Bronze ne tire que des Disques et des Pointes, du Commun au Rare', () => {
    const meta = rich();
    for (let i = 0; i < 40; i++) {
      for (const piece of openChest(meta, 'bronze', 10)!) {
        expect(['disque', 'pointe']).toContain(modelById(piece.model).slot);
        expect(piece.rank).toBeGreaterThanOrEqual(1);
        expect(piece.rank).toBeLessThanOrEqual(3);
        expect(piece.level).toBe(0);
      }
    }
  });

  it('Arène tire les quatre emplacements, donc des doublons signature', () => {
    const meta = rich();
    const slots = new Set<string>();
    for (let i = 0; i < 40; i++) {
      for (const piece of openChest(meta, 'arene', 10)!) slots.add(modelById(piece.model).slot);
    }
    expect(slots).toEqual(new Set(['lame', 'disque', 'pointe', 'noyau']));
  });
});

describe('pity', () => {
  it('Arène garantit un Excellent au dixième tirage sans Excellent', () => {
    const meta = rich();
    // On force le compteur au seuil moins un : le prochain tirage doit être forcé.
    meta.pity.arene = CHESTS.arene.pityThreshold - 1;
    const piece = openChest(meta, 'arene', 1)![0];
    expect(piece.rank).toBe(CHESTS.arene.pityRank);
    expect(meta.pity.arene).toBe(0);
  });

  it('un ×10 ne peut pas repartir sans Excellent', () => {
    const meta = rich();
    meta.pity.arene = 0;
    const pulls = openChest(meta, 'arene', 10)!;
    expect(pulls.some((p) => p.rank >= CHESTS.arene.pityRank)).toBe(true);
  });

  it('Mythique garantit une Légende au trentième', () => {
    const meta = rich();
    meta.pity.mythique = CHESTS.mythique.pityThreshold - 1;
    expect(openChest(meta, 'mythique', 1)![0].rank).toBe(CHESTS.mythique.pityRank);
    expect(meta.pity.mythique).toBe(0);
  });

  it('le compteur retombe à zéro dès qu’un tirage naturel atteint le rang garanti', () => {
    const meta = rich();
    let sawNatural = false;
    for (let i = 0; i < 200 && !sawNatural; i++) {
      meta.pity.arene = 3; // loin du seuil : tout Excellent obtenu ici est naturel
      const piece = openChest(meta, 'arene', 1)![0];
      if (piece.rank >= CHESTS.arene.pityRank) {
        expect(meta.pity.arene).toBe(0);
        sawNatural = true;
      } else {
        expect(meta.pity.arene).toBe(4);
      }
    }
    expect(sawNatural).toBe(true);
  });

  it('Bronze n’a pas de pity : son compteur ne bouge pas', () => {
    const meta = rich();
    openChest(meta, 'bronze', 10);
    expect(meta.pity.bronze).toBe(0);
  });
});

describe('déterminisme', () => {
  it('même graine ⇒ mêmes tirages', () => {
    const a = rich();
    const b = rich();
    expect(openChest(a, 'arene', 10)).toEqual(openChest(b, 'arene', 10));
  });

  it('chaque tirage consomme le même nombre de valeurs, forcé ou non', () => {
    const free = rich();
    free.pity.arene = 0;
    openChest(free, 'arene', 1);
    const freeAdvance = free.rngState;

    const forced = rich();
    forced.pity.arene = CHESTS.arene.pityThreshold - 1;
    openChest(forced, 'arene', 1);

    // Les deux tirages donnent des rangs différents, mais consomment le même
    // nombre de valeurs : trois pas de RNG depuis l'état initial dans les deux cas.
    const probe = rich();
    for (let i = 0; i < 3; i++) probe.rngState = nextState(probe.rngState);
    expect(forced.rngState).toBe(probe.rngState);
    expect(freeAdvance).toBe(probe.rngState);
  });
});

// Reproduit l'avancement du RNG sans exposer d'API supplémentaire.
function nextState(state: number): number {
  return (state + 0x6d2b79f5) | 0;
}
