import { Texture } from 'pixi.js';
import { hex, PALETTE } from '../theme';
import type { ZoneKind } from '../sim/config';

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
  core: Texture;
  halo: Texture;
  spark: Texture;
  wave: Texture;
  shadow: Texture;
  caret: Texture;
  zone: Record<ZoneKind, Texture>;
  shard: Texture;
}

function canvas(size: number): { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const el = document.createElement('canvas');
  el.width = size;
  el.height = size;
  return { el, ctx: el.getContext('2d')! };
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

/** Disque de zone : un halo doux au centre, un liseré net au bord. Le liseré est
 * ce qui rend la frontière estimable — sans lui le joueur ne sait pas où il entre. */
function zoneTexture(color: number, dashed: boolean): Texture {
  const size = 256;
  const { el, ctx } = canvas(size);
  const r = size / 2;
  ctx.translate(r, r);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, `${hex(color)}44`);
  grad.addColorStop(0.72, `${hex(color)}22`);
  grad.addColorStop(1, `${hex(color)}00`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `${hex(color)}cc`;
  ctx.lineWidth = size * 0.018;
  if (dashed) ctx.setLineDash([size * 0.05, size * 0.04]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.93, 0, Math.PI * 2);
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

/** Éclat de Gyre : une étoile à quatre branches dans un halo. Des branches, quand
 * tout le reste de l'arène est fait de disques : il doit se repérer au coin de
 * l'œil sans jamais se confondre avec une toupie. */
function shardTexture(): Texture {
  const size = 128;
  const { el, ctx } = canvas(size);
  const r = size / 2;
  ctx.translate(r, r);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  glow.addColorStop(0, `${hex(PALETTE.ember)}cc`);
  glow.addColorStop(0.45, `${hex(PALETTE.ember)}33`);
  glow.addColorStop(1, `${hex(PALETTE.ember)}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hex(PALETTE.text);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r * 0.52 : r * 0.16;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
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
  return {
    core: radialTexture(128, [[0, 1], [0.55, 0.75], [1, 0]]),
    halo: radialTexture(256, [[0, 0.55], [1, 0]]),
    spark: radialTexture(32, [[0, 1], [0.4, 0.9], [1, 0]]),
    wave: waveTexture(),
    shadow: shadowTexture(),
    caret: caretTexture(),
    zone: {
      // Le trait continu se lit comme un sol, le pointillé comme un danger.
      accelerateur: zoneTexture(PALETTE.zoneBoost, false),
      pointes: zoneTexture(PALETTE.zoneSpike, true),
      glisse: zoneTexture(PALETTE.zoneSlick, false),
    },
    shard: shardTexture(),
  };
}

export function destroyTextures(t: Textures): void {
  const all = [t.core, t.halo, t.spark, t.wave, t.shadow, t.caret, t.shard];
  for (const tex of all) tex.destroy(true);
  for (const tex of Object.values(t.zone)) tex.destroy(true);
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

/** Décor du chapitre, derrière l'anneau de jeu. L'arène passée en plein écran a
 *  libéré de la place *autour* du disque : sans décor, cette place est du noir, et
 *  les huit chapitres se ressemblent tous. La texture est carrée et étirée au
 *  canvas — un dégradé radial supporte l'étirement, contrairement à un motif. */
export function backdropTexture(pixelSize: number, ambience: number): Texture {
  const { el, ctx } = canvas(pixelSize);
  const c = pixelSize / 2;
  ctx.fillStyle = hex(PALETTE.bg);
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  // Deux nappes : une large qui teinte toute la scène, une serrée derrière l'anneau
  // qui détache le disque de jeu de son fond. Une seule nappe pâle laissait l'écran
  // noir dès qu'on sortait de l'arène — le défaut relevé sur la première capture
  // de l'arène plein écran.
  const wide = ctx.createRadialGradient(c, c * 0.7, 0, c, c * 0.7, c * 1.35);
  wide.addColorStop(0, `${hex(ambience)}52`);
  wide.addColorStop(0.5, `${hex(ambience)}22`);
  wide.addColorStop(1, `${hex(ambience)}00`);
  ctx.fillStyle = wide;
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  const halo = ctx.createRadialGradient(c, c, c * 0.34, c, c, c * 0.62);
  halo.addColorStop(0, `${hex(ambience)}00`);
  halo.addColorStop(0.55, `${hex(ambience)}3a`);
  halo.addColorStop(1, `${hex(ambience)}00`);
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, pixelSize, pixelSize);

  // Hachures obliques très pâles : de la matière, pas un motif reconnaissable —
  // ce qui la rend insensible à l'étirement.
  ctx.strokeStyle = 'rgba(255,255,255,.035)';
  ctx.lineWidth = Math.max(1, pixelSize / 400);
  for (let i = -pixelSize; i < pixelSize * 2; i += pixelSize * 0.055) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i - pixelSize, pixelSize);
    ctx.stroke();
  }

  const vig = ctx.createRadialGradient(c, c, c * 0.3, c, c, c * 1.05);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.62, 'rgba(0,0,0,.28)');
  vig.addColorStop(1, 'rgba(0,0,0,.8)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, pixelSize, pixelSize);
  return Texture.from(el);
}
