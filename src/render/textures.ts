import { Texture } from 'pixi.js';
import { hex, PALETTE } from '../theme';

export type Shape = 'player' | 'bot';

/** Résolution des textures de toupie, généreuse : elles sont réduites à l'écran. */
const TOP_PX = 256;
const NOTCHES: Record<Shape, number> = { player: 6, bot: 5 };
const HOOK: Record<Shape, number> = { player: 0, bot: 0.16 };
/** Trois niveaux d'usure : intact, ébréché, très ébréché. */
const WEAR_CHIP = [0, 0.34, 0.6];

/** Rayon du disque dessiné dans floorTexture(), en fraction du canevas carré qui le
 * contient. Exporté pour qu'arena.ts en dérive le rayon visuel du sol au lieu de
 * réestimer le même facteur de son côté — source unique des deux bugs de débordement
 * (voile carré du boss, éclair débordant) déjà rencontrés sur cette branche. */
export const FLOOR_EDGE = 0.94;
/** Facteur de surdimensionnement du sprite du sol par rapport à ARENA_RADIUS × 2 :
 * la plaque déborde légèrement de l'anneau de jeu pour ne jamais laisser voir la page
 * derrière au bord. Même raison d'être exportée que FLOOR_EDGE. */
export const FLOOR_OVERSCAN = 1.06;

export interface Textures {
  body: Record<Shape, Texture[]>;
  rim: Record<Shape, Texture[]>;
  core: Texture;
  halo: Texture;
  spark: Texture;
  wave: Texture;
  shadow: Texture;
  caret: Texture;
  typeMark: Texture;
}

function canvas(size: number): { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const el = document.createElement('canvas');
  el.width = size;
  el.height = size;
  return { el, ctx: el.getContext('2d')! };
}

/**
 * Disque encoché vu de dessus : bord d'attaque net pour que le sens de rotation
 * se lise, creux vers l'intérieur. Le motif d'ébréchure est fixe pour ne pas scintiller.
 */
function notchedDisc(ctx: CanvasRenderingContext2D, r: number, shape: Shape, chip: number): void {
  const n = NOTCHES[shape];
  const hook = HOOK[shape];
  const step = (Math.PI * 2) / n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i * step;
    const worn = chip > 0 && ((i * 7) % n) / n < chip;
    const ro = r * (worn ? 0.86 : 1);
    ctx.arc(0, 0, ro, a, a + step * (0.58 - hook));
    const b = a + step * (0.58 - hook);
    ctx.lineTo(Math.cos(b + step * 0.16) * r * 0.7, Math.sin(b + step * 0.16) * r * 0.7);
    ctx.lineTo(Math.cos(a + step) * r * (0.82 + hook), Math.sin(a + step) * r * (0.82 + hook));
  }
  ctx.closePath();
}

function bodyTexture(shape: Shape, chip: number): Texture {
  const { el, ctx } = canvas(TOP_PX);
  const c = TOP_PX / 2;
  const r = c * 0.94;
  ctx.translate(c, c);
  notchedDisc(ctx, r, shape, chip);
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#5a6779');
  g.addColorStop(0.5, '#3a4450');
  g.addColorStop(1, '#222932');
  ctx.fillStyle = g;
  ctx.fill();
  // disque central rivé
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  const d = ctx.createRadialGradient(-r * 0.24, -r * 0.28, 1, 0, 0, r * 0.6);
  d.addColorStop(0, '#515f71');
  d.addColorStop(1, '#1f252e');
  ctx.fillStyle = d;
  ctx.fill();
  ctx.fillStyle = '#161c24';
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44, r * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  return Texture.from(el);
}

function rimTexture(shape: Shape, chip: number): Texture {
  const { el, ctx } = canvas(TOP_PX);
  const c = TOP_PX / 2;
  ctx.translate(c, c);
  notchedDisc(ctx, c * 0.94, shape, chip);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = TOP_PX * 0.022;
  ctx.lineJoin = 'round';
  ctx.stroke();
  return Texture.from(el);
}

function radialTexture(size: number, stops: [number, number][]): Texture {
  const { el, ctx } = canvas(size);
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  for (const [offset, alpha] of stops) g.addColorStop(offset, `rgba(255,255,255,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(el);
}

function waveTexture(): Texture {
  const size = 256;
  const { el, ctx } = canvas(size);
  const c = size / 2;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.86, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.05;
  ctx.stroke();
  return Texture.from(el);
}

/** Chevron « c'est toi », pointe en bas, dessiné dans le tiers haut du carré. */
function caretTexture(): Texture {
  const size = 64;
  const { el, ctx } = canvas(size);
  ctx.beginPath();
  ctx.moveTo(size * 0.5, size * 0.92);
  ctx.lineTo(size * 0.06, size * 0.1);
  ctx.lineTo(size * 0.5, size * 0.34);
  ctx.lineTo(size * 0.94, size * 0.1);
  ctx.closePath();
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  return Texture.from(el);
}

/** Point de repère de type : disque plein, contour sombre pour rester net une
 *  fois teinté par-dessus n'importe quelle usure du corps. */
function typeMarkTexture(): Texture {
  const size = 64;
  const { el, ctx } = canvas(size);
  const c = size / 2;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.8, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.lineWidth = size * 0.09;
  ctx.strokeStyle = 'rgba(10,13,18,.55)';
  ctx.stroke();
  return Texture.from(el);
}

function shadowTexture(): Texture {
  const size = 128;
  const { el, ctx } = canvas(size);
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(0,0,0,.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(el);
}

export function createTextures(): Textures {
  const shapes: Shape[] = ['player', 'bot'];
  const body = {} as Record<Shape, Texture[]>;
  const rim = {} as Record<Shape, Texture[]>;
  for (const shape of shapes) {
    body[shape] = WEAR_CHIP.map((chip) => bodyTexture(shape, chip));
    rim[shape] = WEAR_CHIP.map((chip) => rimTexture(shape, chip));
  }
  return {
    body,
    rim,
    core: radialTexture(128, [[0, 1], [0.55, 0.75], [1, 0]]),
    halo: radialTexture(256, [[0, 0.55], [1, 0]]),
    spark: radialTexture(32, [[0, 1], [0.4, 0.9], [1, 0]]),
    wave: waveTexture(),
    shadow: shadowTexture(),
    caret: caretTexture(),
    typeMark: typeMarkTexture(),
  };
}

export function destroyTextures(t: Textures): void {
  const all = [
    ...t.body.player, ...t.body.bot, ...t.rim.player, ...t.rim.bot,
    t.core, t.halo, t.spark, t.wave, t.shadow, t.caret, t.typeMark,
  ];
  for (const tex of all) tex.destroy(true);
}

/** Sol de l'arène : plaque d'acier tournée, rouillée et rivetée du Hangar Rouillé. */
export function floorTexture(pixelSize: number): Texture {
  const { el, ctx } = canvas(pixelSize);
  const c = pixelSize / 2;
  const r = c * FLOOR_EDGE;

  const g = ctx.createRadialGradient(c, c - r * 0.3, r * 0.1, c, c, r);
  g.addColorStop(0, hex(PALETTE.floorInner));
  g.addColorStop(0.72, '#1d242d');
  g.addColorStop(1, hex(PALETTE.floorOuter));
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,138,164,.05)';
  ctx.lineWidth = Math.max(1, pixelSize / 360);
  for (let rr = r * 0.16; rr < r; rr += r * 0.085) {
    ctx.beginPath();
    ctx.arc(c, c, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(146,78,44,.055)';
  for (const [x, y, s] of [[-0.44, -0.28, 0.2], [0.46, 0.18, 0.15], [-0.06, 0.52, 0.17], [0.24, -0.55, 0.11], [-0.62, 0.34, 0.12]]) {
    ctx.beginPath();
    ctx.ellipse(c + x * r, c + y * r, r * s, r * s * 0.62, x * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(120,60,32,.05)';
  const grain = Math.max(2, pixelSize / 180);
  for (let i = 0; i < 90; i++) {
    const a = i * 2.399;
    const d = r * Math.sqrt(((i * 37) % 100) / 100);
    ctx.fillRect(c + Math.cos(a) * d, c + Math.sin(a) * d, grain, grain);
  }
  ctx.restore();

  // rebord biseauté : ombre extérieure épaisse, liseré intérieur éclairé
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.lineWidth = pixelSize * 0.026;
  ctx.strokeStyle = hex(PALETTE.rimShadow);
  ctx.stroke();
  ctx.lineWidth = pixelSize * 0.008;
  ctx.strokeStyle = hex(PALETTE.rim);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, r - pixelSize * 0.014, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, pixelSize * 0.004);
  ctx.strokeStyle = 'rgba(160,182,212,.22)';
  ctx.stroke();

  ctx.fillStyle = '#151a22';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, pixelSize * 0.006, 0, Math.PI * 2);
    ctx.fill();
  }
  return Texture.from(el);
}
