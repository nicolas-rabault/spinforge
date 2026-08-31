/**
 * Les recettes de dessin — **des données, jamais du code**. Chaque modèle du
 * catalogue (`src/content/`) y a une ligne, interprétée par le dessinateur de sa
 * silhouette (`src/art/piece.ts`). Ajouter une pièce ou une toupie, c'est ajouter
 * une ligne ici ; `recipes.test.ts` fait échouer la suite si on l'oublie.
 *
 * Ce fichier est pur : aucune dépendance au DOM, aucun canvas. Il décrit *quoi*
 * dessiner ; `draw.ts` sait *comment*.
 */
import { MODELS, type Slot } from '../content/pieces';
import { TOUPIES, type ToupieId } from '../content/toupies';
import type { ChestKind } from '../sim/types';
import type { RankTier } from '../theme';

// ── Pièces ───────────────────────────────────────────────────────────────────
// Une silhouette par emplacement, quatre familles qui ne peuvent pas se confondre :
// la Lame mord (couronne de crocs), le Disque pèse (anneau lobé), la Pointe touche
// le sol (le seul objet à axe vertical), le Noyau brille (gemme dans son logement).

export interface LameRecipe {
  slot: 'lame';
  /** Nombre de crocs. Peu et longs = agressif, nombreux et courts = dense. */
  fangs: number;
  /** Courbure du croc, 0 = droit, 0.5 = franchement recourbé. Donne le sens de rotation. */
  hook: number;
  /** Profondeur du creux entre deux crocs, en fraction du rayon. */
  depth: number;
  ornament?: 'flamme' | 'ecailles' | 'eclair';
}

export interface DisqueRecipe {
  slot: 'disque';
  /** Lobes de masse sur le pourtour. 0 = anneau lisse. */
  lobes: number;
  /** Épaisseur de l'anneau, en fraction du rayon. C'est ce qui se lit comme du poids. */
  thickness: number;
  /** Rayons traversants. 0 = plein. */
  spokes: number;
  ornament?: 'orbites' | 'pales' | 'rivets' | 'crateres';
}

export interface PointeRecipe {
  slot: 'pointe';
  /** Largeur du pied, en fraction du rayon. Large = stable, fin = vif. */
  footWidth: number;
  /** Hauteur de la pointe, en fraction du rayon. */
  height: number;
  ornament?: 'bille' | 'cardans' | 'dents' | 'spire';
}

export interface NoyauRecipe {
  slot: 'noyau';
  /** Facettes de la gemme centrale. */
  facets: number;
  ornament: 'braise' | 'spirale' | 'bouclier' | 'arc';
}

export type PieceRecipe = LameRecipe | DisqueRecipe | PointeRecipe | NoyauRecipe;

export const PIECE_RECIPES: Record<string, PieceRecipe> = {
  // Lames — la couronne qui mord.
  'lame.couronne-solaire': { slot: 'lame', fangs: 8, hook: 0.18, depth: 0.30, ornament: 'flamme' },
  'lame.croc-de-tempete': { slot: 'lame', fangs: 3, hook: 0.42, depth: 0.46 },
  'lame.ecaille-abyssale': { slot: 'lame', fangs: 6, hook: 0.10, depth: 0.22, ornament: 'ecailles' },
  'lame.griffe-orageuse': { slot: 'lame', fangs: 4, hook: 0.34, depth: 0.38, ornament: 'eclair' },

  // Disques — l'anneau qui pèse.
  'disque.lourd': { slot: 'disque', lobes: 0, thickness: 0.34, spokes: 0 },
  'disque.gravite': { slot: 'disque', lobes: 3, thickness: 0.22, spokes: 0, ornament: 'orbites' },
  'disque.eventail': { slot: 'disque', lobes: 0, thickness: 0.20, spokes: 9, ornament: 'pales' },
  'disque.axial': { slot: 'disque', lobes: 0, thickness: 0.18, spokes: 4 },
  'disque.colosse': { slot: 'disque', lobes: 6, thickness: 0.42, spokes: 0, ornament: 'rivets' },
  'disque.meteorite': { slot: 'disque', lobes: 5, thickness: 0.30, spokes: 0, ornament: 'crateres' },

  // Pointes — le seul objet à axe vertical.
  'pointe.plate': { slot: 'pointe', footWidth: 0.62, height: 0.50 },
  'pointe.aiguille': { slot: 'pointe', footWidth: 0.16, height: 1.00 },
  'pointe.orbitale': { slot: 'pointe', footWidth: 0.40, height: 0.62, ornament: 'bille' },
  'pointe.gyroscope': { slot: 'pointe', footWidth: 0.34, height: 0.70, ornament: 'cardans' },
  'pointe.furie': { slot: 'pointe', footWidth: 0.44, height: 0.82, ornament: 'dents' },
  'pointe.ressort': { slot: 'pointe', footWidth: 0.34, height: 0.86, ornament: 'spire' },

  // Noyaux — la gemme qui brille.
  'noyau.fournaise': { slot: 'noyau', facets: 6, ornament: 'braise' },
  'noyau.oeil-du-cyclone': { slot: 'noyau', facets: 8, ornament: 'spirale' },
  'noyau.caparacon': { slot: 'noyau', facets: 6, ornament: 'bouclier' },
  'noyau.arc-electrique': { slot: 'noyau', facets: 5, ornament: 'arc' },
};

export function pieceRecipe(model: string): PieceRecipe {
  const r = PIECE_RECIPES[model];
  if (!r) throw new Error(`pas de recette de dessin pour la pièce : ${model}`);
  return r;
}

// ── Châssis ──────────────────────────────────────────────────────────────────
// Le corps de la toupie, porteur du type. Ce qui distingue les quatre : le nombre
// de lobes, l'asymétrie (une toupie d'attaque est visiblement fuyante) et
// l'étalement (une toupie de défense est large et basse).

export interface ChassisRecipe {
  /** Lobes du corps. */
  lobes: number;
  /** Asymétrie des lobes : 0 = radialement régulier, 0.5 = franchement fuyant. */
  sweep: number;
  /** Étalement du corps, en fraction du rayon disponible. Large = trapu. */
  spread: number;
  /** Hauteur relative du portrait 3/4. Bas = ramassé, haut = élancé. */
  stance: number;
}

export const CHASSIS_RECIPES: Record<ToupieId, ChassisRecipe> = {
  'brasier-solaire': { lobes: 6, sweep: 0.12, spread: 0.88, stance: 0.90 },
  'typhon-primal': { lobes: 3, sweep: 0.46, spread: 0.82, stance: 1.00 },
  'carapace-abyssale': { lobes: 8, sweep: 0.06, spread: 0.98, stance: 0.74 },
  'tigre-foudre': { lobes: 5, sweep: 0.30, spread: 0.86, stance: 0.94 },
};

export function chassisRecipe(id: ToupieId): ChassisRecipe {
  const r = CHASSIS_RECIPES[id];
  if (!r) throw new Error(`pas de recette de dessin pour le châssis : ${id}`);
  return r;
}

// ── Coffres ──────────────────────────────────────────────────────────────────
// Trois objets, trois matières. Le palier de rang réutilise la même échelle que les
// pièces : un joueur reconnaît l'or du Mythique avant d'en lire le nom.

export interface ChestRecipe {
  /** Cerclages métalliques sur le corps. */
  bands: number;
  /** Bombement du couvercle, en fraction de la hauteur. Plat = caisse, bombé = coffre. */
  domed: number;
  /** Gemme sertie sur le couvercle. */
  gem: boolean;
  tier: RankTier;
}

export const CHEST_RECIPES: Record<ChestKind, ChestRecipe> = {
  bronze: { bands: 2, domed: 0.10, gem: false, tier: 0 },
  arene: { bands: 3, domed: 0.26, gem: true, tier: 1 },
  mythique: { bands: 4, domed: 0.42, gem: true, tier: 3 },
};

export function chestRecipe(kind: ChestKind): ChestRecipe {
  const r = CHEST_RECIPES[kind];
  if (!r) throw new Error(`pas de recette de dessin pour le coffre : ${kind}`);
  return r;
}

// ── Garde-fous de couverture ─────────────────────────────────────────────────

/** Modèles du catalogue sans recette. Vide = tout le catalogue est dessinable.
 *  Utilisé par le test de couverture, qui est la promesse centrale de `src/art/` :
 *  on ne peut pas ajouter du contenu et le laisser muet à l'écran. */
export function modelsWithoutRecipe(): string[] {
  return MODELS.filter((m) => !PIECE_RECIPES[m.id]).map((m) => m.id);
}

/** Modèles dont la recette ne décrit pas la bonne silhouette. */
export function modelsWithWrongSlot(): { id: string; expected: Slot; got: Slot }[] {
  return MODELS.flatMap((m) => {
    const r = PIECE_RECIPES[m.id];
    return r && r.slot !== m.slot ? [{ id: m.id, expected: m.slot, got: r.slot }] : [];
  });
}

export function toupiesWithoutRecipe(): ToupieId[] {
  return TOUPIES.filter((t) => !CHASSIS_RECIPES[t.id]).map((t) => t.id);
}
