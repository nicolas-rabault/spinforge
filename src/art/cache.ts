/**
 * Mémoïsation des dessins, sous forme de data-URL.
 *
 * **Ce n'est pas une optimisation, c'est une condition de correction.** `App` se
 * re-rend à chaque tick (10 Hz) ; redessiner les icônes à chaque rendu brûlerait le
 * processeur pendant le combat, exactement quand il est le plus sollicité.
 *
 * Le rang n'entre dans la clé que par son **palier** (4 valeurs), pas par ses onze
 * niveaux : le cache est donc borné à quelques centaines d'entrées, atteintes une
 * fois pour toutes.
 */
import { rankTier } from '../theme';
import type { ChestKind } from '../sim/types';
import { makeCanvas, type Ctx } from './draw';
import { drawPieceGlyph, drawPieceTile } from './piece';
import { drawChest } from './chest';
import { drawToupiePortrait, toupieKey, type ToupieArt } from './toupie';

const MAX_DPR = 2;
const cache = new Map<string, string>();

function pixelRatio(): number {
  return Math.min(window.devicePixelRatio || 1, MAX_DPR);
}

function render(key: string, size: number, draw: (ctx: Ctx, px: number) => void): string {
  const hit = cache.get(key);
  if (hit) return hit;
  const px = Math.round(size * pixelRatio());
  const { el, ctx } = makeCanvas(px);
  draw(ctx, px);
  const url = el.toDataURL();
  cache.set(key, url);
  return url;
}

export function pieceTileUrl(model: string, rank: number, size: number): string {
  return render(`tile|${model}|${rankTier(rank)}|${size}`, size, (ctx, px) =>
    drawPieceTile(ctx, model, rank, px));
}

export function pieceGlyphUrl(model: string, rank: number, size: number): string {
  return render(`glyph|${model}|${rankTier(rank)}|${size}`, size, (ctx, px) =>
    drawPieceGlyph(ctx, model, rank, px));
}

export function toupiePortraitUrl(art: ToupieArt, size: number): string {
  return render(`portrait|${toupieKey(art)}|${size}`, size, (ctx, px) =>
    drawToupiePortrait(ctx, art, px));
}

/** Le coffre ouvert n'est pas mémoïsé par pas d'animation : seules les deux poses
 *  utilisées hors animation (fermé, grand ouvert) passent par ici. */
export function chestUrl(kind: ChestKind, size: number, open = 0): string {
  return render(`chest|${kind}|${open}|${size}`, size, (ctx, px) =>
    drawChest(ctx, kind, px, open));
}
