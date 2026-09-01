import { describe, expect, it } from 'vitest';
import { createInitialMeta } from './meta';
import { talentsOf } from './talents';
import { dominatesEquipped } from './upgrade';
import { STARTER_TOUPIE } from '../content/toupies';
import type { MetaState } from './types';

/** Un méta neuf dont un seul emplacement a été remplacé. L'inventaire ne joue
 *  aucun rôle ici : la règle compare une pièce *candidate* à celle qui est
 *  montée, pas deux piles. */
function withEquipped(slot: 'lame' | 'disque' | 'pointe', model: string, rank: number, level: number): MetaState {
  const meta = createInitialMeta(1);
  meta.equipped[slot] = { model, rank, level };
  return meta;
}

describe('dominatesEquipped', () => {
  it('un rang au-dessus, même modèle et même niveau, domine', () => {
    const meta = withEquipped('disque', 'disque.lourd', 1, 0);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.lourd', 2, 0)).toBe(true);
  });

  // La raison d'être de la règle. Facteur équipé : (1 + 0,1 × 8) × 1,08^0 = 1,80.
  // Facteur candidat : (1 + 0) × 1,08^1 = 1,08. Le rang monte, la défense tombe.
  it('ne se laisse pas prendre par un rang supérieur au niveau 0', () => {
    const meta = withEquipped('disque', 'disque.lourd', 1, 8);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.lourd', 2, 0)).toBe(false);
  });

  // disque.axial : défense +15 %, masse −5 %. Un échange, pas une évidence.
  it('refuse un gain payé par une perte sur un autre axe', () => {
    const meta = withEquipped('disque', 'disque.lourd', 1, 0);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.axial', 1, 0)).toBe(false);
  });

  // pointe.furie : vitesse +30 %, accélération +10 %, mais spinDecay ×1,30 —
  // et spinDecay est une perte, donc ×1,30 est une aggravation.
  it('lit spinDecay dans le bon sens', () => {
    const meta = withEquipped('pointe', 'pointe.plate', 1, 0);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'pointe.furie', 1, 0)).toBe(false);
  });

  it('ne domine pas une pièce strictement identique', () => {
    const meta = withEquipped('disque', 'disque.lourd', 3, 2);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.lourd', 3, 2)).toBe(false);
  });

  // Le niveau compense le rang dans l'autre sens aussi : (1 + 0,1 × 12) × 1,08^0
  // = 2,20 contre 1,08^2 = 1,1664. Aucun palier de talent de Disque ne se
  // situe entre les rangs 1 et 3 (ils tombent à 4, 7, 11) : cette pièce reste
  // un cas propre où seules les stats tranchent.
  it('accepte un rang inférieur assez monté pour dominer', () => {
    const meta = withEquipped('disque', 'disque.lourd', 3, 0);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.lourd', 1, 12)).toBe(true);
  });

  // Rang où la Lame débloque son premier talent (Estoc) : dérivé de `talentsOf`
  // plutôt que recopié depuis balance.json, pour ne pas devenir invisible à un
  // changement d'équilibrage. Équipée à ce rang, niveau 0 ; candidate un rang
  // en dessous mais montée assez haut pour l'emporter sur les sept stats (les
  // Lames n'ont pas de profil : seule `attack` bouge, cf. `profile.ts`). Sans
  // le garde-fou sur les talents elle dominerait — c'est le scénario du FIX 1 :
  // le joueur perd Estoc (+30 % dégâts au-delà d'une vitesse d'impact) sans
  // qu'aucune des sept stats ne recule, donc sans que la règle actuelle le voie.
  it('refuse un rang qui fait perdre un talent, même dominant sur les stats', () => {
    let threshold = 1;
    while (talentsOf('lame', threshold).length === 0) threshold++;
    expect(talentsOf('lame', threshold - 1).length).toBe(0);
    const meta = withEquipped('lame', 'lame.couronne-solaire', threshold, 0);
    expect(
      dominatesEquipped(meta, STARTER_TOUPIE, 'lame.couronne-solaire', threshold - 1, 8),
    ).toBe(false);
  });
});
