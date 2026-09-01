import { beforeEach, describe, expect, it } from 'vitest';
import { MODELS } from '../content/pieces';
import { TOUPIES, type ToupieId } from '../content/toupies';
import { CHESTS } from '../sim/config';
import { setLang } from '../i18n';
import { rankTier, RANK_TIERS } from '../theme';
import { rankColor, rankLabel } from '../ui/rank';
import {
  CHASSIS_RECIPES, CHEST_RECIPES, PIECE_RECIPES,
  modelsWithoutRecipe, modelsWithWrongSlot, toupiesWithoutRecipe,
} from './recipes';

/** La promesse centrale de `src/art/` : **on ne peut pas ajouter du contenu et le
 *  laisser muet à l'écran.** C'est exactement ce qui est arrivé jusqu'ici — vingt
 *  pièces et quatre toupies au catalogue, zéro dessin. */
describe('couverture du catalogue', () => {
  it('dessine tous les modèles de pièces', () => {
    expect(modelsWithoutRecipe()).toEqual([]);
  });

  it('dessine toutes les toupies', () => {
    expect(toupiesWithoutRecipe()).toEqual([]);
  });

  it('dessine tous les coffres', () => {
    const missing = Object.keys(CHESTS).filter((k) => !(k in CHEST_RECIPES));
    expect(missing).toEqual([]);
  });

  it('donne à chaque pièce la silhouette de son emplacement', () => {
    expect(modelsWithWrongSlot()).toEqual([]);
  });

  it("n'a pas de recette orpheline", () => {
    const known = new Set(MODELS.map((m) => m.id));
    expect(Object.keys(PIECE_RECIPES).filter((id) => !known.has(id))).toEqual([]);
    const toupies = new Set(TOUPIES.map((t) => t.id));
    expect(Object.keys(CHASSIS_RECIPES).filter((id) => !toupies.has(id as ToupieId))).toEqual([]);
  });
});

/** Une recette hors plage ne casse rien : elle produit une géométrie dégénérée
 *  (un disque vide, une couronne à un croc) qu'aucun test de couverture ne verrait.
 *  Ces bornes sont là pour attraper la faute de frappe, pas le goût. */
describe('plages des recettes', () => {
  it('borne les réglages de chaque silhouette', () => {
    for (const [id, rec] of Object.entries(PIECE_RECIPES)) {
      if (rec.slot === 'lame') {
        expect(rec.fangs, id).toBeGreaterThanOrEqual(3);
        expect(rec.hook, id).toBeGreaterThanOrEqual(0);
        expect(rec.hook, id).toBeLessThan(0.5);
        expect(rec.depth, id).toBeGreaterThan(0);
        expect(rec.depth, id).toBeLessThan(0.6);
      } else if (rec.slot === 'disque') {
        expect(rec.lobes, id).toBeGreaterThanOrEqual(0);
        expect(rec.thickness, id).toBeGreaterThan(0);
        // Au-delà de 0,625 l'anneau se referme : rInner = r × (1 − 1,6 × thickness) ≤ 0.
        expect(rec.thickness, id).toBeLessThan(0.62);
        expect(rec.spokes, id).toBeGreaterThanOrEqual(0);
      } else if (rec.slot === 'pointe') {
        expect(rec.footWidth, id).toBeGreaterThan(0);
        expect(rec.footWidth, id).toBeLessThanOrEqual(1);
        expect(rec.height, id).toBeGreaterThan(0);
        expect(rec.height, id).toBeLessThanOrEqual(1);
      } else {
        expect(rec.facets, id).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('donne à chaque châssis un corps traçable', () => {
    for (const [id, rec] of Object.entries(CHASSIS_RECIPES)) {
      expect(rec.lobes, id).toBeGreaterThanOrEqual(3);
      expect(rec.sweep, id).toBeGreaterThanOrEqual(0);
      expect(rec.sweep, id).toBeLessThan(0.5);
      expect(rec.spread, id).toBeGreaterThan(0.5);
      expect(rec.spread, id).toBeLessThanOrEqual(1);
    }
  });
});

/** Une seule échelle de rareté pour tout le jeu. Avant, `ui/rank.ts` portait ses
 *  propres seuils et une échelle inversée : le même rang changeait de couleur selon
 *  l'écran. Ces tests verrouillent l'unicité, pas le choix des teintes. */
// Les paliers sont comparés à leurs noms français : sans cette épingle, la
// détection de langue rendrait l'anglais dans cet environnement.
beforeEach(() => setLang('fr'));

describe('paliers de rang', () => {
  it('bascule exactement aux paliers nommés', () => {
    // Les frontières de `rankTier` doivent coïncider avec celles de `rankLabel`.
    expect(rankLabel(3)).toBe('Rare');
    expect(rankLabel(4)).toBe('Excellent');
    expect(rankLabel(6)).toBe('Excellent +2');
    expect(rankLabel(7)).toBe('Épique');
    expect(rankLabel(10)).toBe('Épique +3');
    expect(rankLabel(11)).toBe('Légende');

    expect([1, 2, 3].map(rankTier)).toEqual([0, 0, 0]);
    expect([4, 5, 6].map(rankTier)).toEqual([1, 1, 1]);
    expect([7, 8, 9, 10].map(rankTier)).toEqual([2, 2, 2, 2]);
    expect([11, 12, 40].map(rankTier)).toEqual([3, 3, 3]);
  });

  it('ne décroît jamais quand le rang monte', () => {
    for (let r = 1; r < 30; r++) expect(rankTier(r + 1)).toBeGreaterThanOrEqual(rankTier(r));
  });

  it('donne quatre métaux distincts', () => {
    const accents = RANK_TIERS.map((t) => t.accent);
    expect(new Set(accents).size).toBe(4);
  });

  it('fait basculer la couleur de texte aux mêmes rangs que les cadres', () => {
    // Deux rangs du même palier partagent la couleur ; deux paliers voisins non.
    // Portée exacte, vérifiée par mutation : ce test tue une table de seuils
    // *dérivante* dans `ui/rank.ts` (10 au lieu de 11 le fait échouer), pas une
    // table dupliquée à seuils rigoureusement identiques — celle-là se comporte
    // pareil, et seule la relecture du code la distingue.
    for (const [a, b] of [[1, 3], [4, 6], [7, 10], [11, 40]]) {
      expect(rankColor(a)).toBe(rankColor(b));
    }
    for (const [a, b] of [[3, 4], [6, 7], [10, 11]]) {
      expect(rankColor(a)).not.toBe(rankColor(b));
    }
  });
});
