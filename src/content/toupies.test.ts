import { describe, expect, it } from 'vitest';
import { STARTER_TOUPIE, TOUPIES, toupieById } from './toupies';
import { modelById } from './pieces';

describe('catalogue des toupies', () => {
  it('contient les quatre Fondateurs', () => {
    expect(TOUPIES).toHaveLength(4);
    expect(TOUPIES.map((t) => t.id)).toEqual([
      'brasier-solaire', 'typhon-primal', 'carapace-abyssale', 'tigre-foudre',
    ]);
  });

  it('couvre les quatre types, une fois chacun', () => {
    expect([...TOUPIES.map((t) => t.type)].sort()).toEqual(
      ['attaque', 'defense', 'endurance', 'equilibre'],
    );
  });

  it('démarre sur Brasier Solaire, le type neutre', () => {
    expect(STARTER_TOUPIE).toBe('brasier-solaire');
    expect(toupieById(STARTER_TOUPIE).type).toBe('equilibre');
  });

  // Un identifiant de signature qui ne correspond à aucun modèle ferait lever
  // `modelById` au premier tirage de coffre, en pleine partie et pas ici.
  it('a des pièces signature qui existent et occupent le bon emplacement', () => {
    for (const toupie of TOUPIES) {
      expect(modelById(toupie.signature.lame).slot).toBe('lame');
      expect(modelById(toupie.signature.noyau).slot).toBe('noyau');
    }
  });

  it('ne partage aucune pièce signature entre deux toupies', () => {
    const ids = TOUPIES.flatMap((t) => [t.signature.lame, t.signature.noyau]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lève sur un identifiant inconnu', () => {
    expect(() => toupieById('inconnue' as never)).toThrow();
  });
});
