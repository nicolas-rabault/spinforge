/**
 * Les primitives de dessin. Canvas 2D et rien d'autre — **c'est le choix central
 * de `src/art/`** : deux backends (SVG pour le DOM, canvas pour PixiJS) rouvriraient
 * exactement la divergence qu'on cherche à fermer entre l'arène et l'inventaire.
 * Un seul code de dessin, deux consommateurs.
 *
 * Toutes les fonctions travaillent dans un repère **déjà centré**, avec un rayon `r`
 * en pixels. Elles ne translatent ni ne remettent à l'échelle : c'est l'appelant qui
 * pose le repère, et lui seul.
 */
import type { Metal } from '../theme';

export type Ctx = CanvasRenderingContext2D;
export type { Metal };

export function makeCanvas(px: number): { el: HTMLCanvasElement; ctx: Ctx } {
  const el = document.createElement('canvas');
  el.width = px;
  el.height = px;
  return { el, ctx: el.getContext('2d')! };
}

export function mix(a: number, b: number, t: number): number {
  const k = Math.max(0, Math.min(1, t));
  const ch = (shift: number) => {
    const av = (a >> shift) & 0xff;
    const bv = (b >> shift) & 0xff;
    return Math.round(av + (bv - av) * k);
  };
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
}

export function rgba(color: number, alpha: number): string {
  return `rgba(${(color >> 16) & 0xff},${(color >> 8) & 0xff},${color & 0xff},${alpha})`;
}

/** Un chemin est une fonction qui le (re)construit. Il faut pouvoir le rejouer :
 *  `clip()` consomme le chemin courant, et on peint en trois passes — corps, matière,
 *  arête. Passer un chemin déjà tracé obligerait à le retracer à la main trois fois. */
export type Path = () => void;

/** Peint une forme en métal : dégradé de corps, brossage concentrique, volume, arête.
 *  C'est cette fonction qui donne sa matière à « Métal & Braise » — sans elle les
 *  silhouettes seraient des aplats, et le jeu ressemblerait à un diagramme. */
export function paintMetal(
  ctx: Ctx,
  path: Path,
  r: number,
  m: Metal,
  opts: { edge?: number; edgeAlpha?: number; grain?: 'radial' | 'vertical' } = {},
): void {
  path();
  const g = ctx.createLinearGradient(-r * 0.9, -r, r * 0.6, r);
  g.addColorStop(0, rgba(m.light, 1));
  g.addColorStop(0.42, rgba(m.mid, 1));
  g.addColorStop(1, rgba(m.dark, 1));
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  path();
  ctx.clip();
  // Brossage : des cercles concentriques très pâles. C'est ce qui fait « tourné »
  // plutôt que « rempli ».
  ctx.globalAlpha = 0.09;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(0.5, r * 0.011);
  if (opts.grain === 'vertical') {
    for (let x = -r * 1.2; x < r * 1.2; x += r * 0.075) {
      ctx.beginPath();
      ctx.moveTo(x, -r * 1.5);
      ctx.lineTo(x + r * 0.04, r * 1.5);
      ctx.stroke();
    }
  } else {
    for (let rr = r * 0.1; rr < r * 1.2; rr += r * 0.068) {
      ctx.beginPath();
      ctx.arc(0, 0, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  // Volume : lumière en haut à gauche, ombre en bas à droite.
  const vol = ctx.createRadialGradient(-r * 0.42, -r * 0.5, r * 0.04, 0, 0, r * 1.3);
  vol.addColorStop(0, 'rgba(255,255,255,.30)');
  vol.addColorStop(0.48, 'rgba(255,255,255,.04)');
  vol.addColorStop(1, 'rgba(0,0,0,.30)');
  ctx.fillStyle = vol;
  ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
  ctx.restore();

  // Contour sombre PUIS arête claire. Sans le contour sombre, l'objet se dissout
  // dans sa plaque de rang dès que les deux partagent la teinte du palier — le
  // défaut n°1 relevé sur la première planche de style.
  const edge = opts.edge ?? r * 0.05;
  ctx.lineJoin = 'round';
  path();
  ctx.lineWidth = edge * 2.4;
  ctx.strokeStyle = 'rgba(5,7,11,.9)';
  ctx.stroke();
  path();
  ctx.lineWidth = edge;
  ctx.strokeStyle = rgba(m.accent, opts.edgeAlpha ?? 0.95);
  ctx.stroke();
}

/** Halo additif — braise, gemme, incandescence. Toujours sous la forme qu'il éclaire. */
export function glow(ctx: Ctx, r: number, color: number, alpha: number): void {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, rgba(color, alpha));
  g.addColorStop(0.45, rgba(color, alpha * 0.35));
  g.addColorStop(1, rgba(color, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Balayage lumineux en diagonale. Réservé au palier Légende : c'est le seul
 *  mouvement figé qu'on s'autorise, et il doit rester exceptionnel pour signifier. */
export function sheen(ctx: Ctx, path: Path, r: number): void {
  ctx.save();
  path();
  ctx.clip();
  const g = ctx.createLinearGradient(-r, r * 0.4, r * 0.5, -r);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.44, 'rgba(255,255,255,0)');
  g.addColorStop(0.52, 'rgba(255,255,255,.45)');
  g.addColorStop(0.6, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-r * 1.5, -r * 1.5, r * 3, r * 3);
  ctx.restore();
}

// ── Chemins ──────────────────────────────────────────────────────────────────

/**
 * Couronne de crocs — la silhouette de la Lame. Chaque croc a un **dos arrondi** et
 * une **face d'attaque droite** : c'est cette asymétrie, et elle seule, qui fait lire
 * le sens de rotation sur une pièce immobile.
 *
 * `chip` ébrèche une fraction des crocs, de façon déterministe (jamais aléatoire :
 * une usure qui scintille d'une image à l'autre se lit comme un défaut de rendu).
 */
export function crownPath(
  ctx: Ctx,
  r: number,
  fangs: number,
  hook: number,
  depth: number,
  chip = 0,
): void {
  const step = (Math.PI * 2) / fangs;
  const ri = r * (1 - depth);
  ctx.beginPath();
  for (let i = 0; i < fangs; i++) {
    const a = i * step;
    const worn = chip > 0 && ((i * 7) % fangs) / fangs < chip;
    const ro = r * (worn ? 0.84 : 1);
    const tip = a + step * (0.30 + hook * 0.34);
    ctx.arc(0, 0, ro, a, tip);
    const hollow = a + step * 0.66;
    ctx.quadraticCurveTo(
      Math.cos(tip + step * hook * 0.7) * ro * 0.88,
      Math.sin(tip + step * hook * 0.7) * ro * 0.88,
      Math.cos(hollow) * ri,
      Math.sin(hollow) * ri,
    );
    ctx.arc(0, 0, ri, hollow, a + step);
  }
  ctx.closePath();
}

/** Anneau lobé — la silhouette du Disque. Le trou est tracé en sens inverse : c'est
 *  ce qui en fait un anneau et non un disque plein, sans mode de remplissage exotique. */
export function ringPath(ctx: Ctx, rOuter: number, rInner: number, lobes: number, amp: number): void {
  ctx.beginPath();
  const steps = Math.max(72, lobes * 28);
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const rr = rOuter * (lobes > 0 ? 1 - amp + amp * Math.abs(Math.cos((a * lobes) / 2)) : 1);
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.moveTo(rInner, 0);
  ctx.arc(0, 0, rInner, 0, Math.PI * 2, true);
  ctx.closePath();
}

/** Cône de la Pointe, accroché en (0,0) et descendant. Le seul objet à axe vertical
 *  du jeu : c'est ce qui le rend reconnaissable à 24 px au milieu de trois formes rondes. */
export function conePath(ctx: Ctx, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(w / 2, 0);
  ctx.quadraticCurveTo(w * 0.20, h * 0.72, 0, h);
  ctx.quadraticCurveTo(-w * 0.20, h * 0.72, -w / 2, 0);
  ctx.closePath();
}

/** Gemme facettée du Noyau. */
export function gemPath(ctx: Ctx, r: number, facets: number, rot = -Math.PI / 2): void {
  ctx.beginPath();
  for (let i = 0; i < facets; i++) {
    const a = rot + (i / facets) * Math.PI * 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ── Ornements ────────────────────────────────────────────────────────────────
// Un ornement est ce qui distingue deux modèles de même silhouette. Chacun est
// minuscule et doit rester lisible à 64 px : pas de détail sous le pixel.

export function ornFlamme(ctx: Ctx, r: number, count: number, color: number): void {
  ctx.fillStyle = rgba(color, 0.9);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.22;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52);
    ctx.quadraticCurveTo(
      Math.cos(a + 0.16) * r * 0.74, Math.sin(a + 0.16) * r * 0.74,
      Math.cos(a) * r * 0.9, Math.sin(a) * r * 0.9,
    );
    ctx.quadraticCurveTo(
      Math.cos(a - 0.1) * r * 0.72, Math.sin(a - 0.1) * r * 0.72,
      Math.cos(a) * r * 0.52, Math.sin(a) * r * 0.52,
    );
    ctx.fill();
  }
}

export function ornEcailles(ctx: Ctx, r: number, rows: number, color: number): void {
  ctx.strokeStyle = rgba(color, 0.5);
  ctx.lineWidth = Math.max(0.6, r * 0.028);
  for (let row = 0; row < rows; row++) {
    const rr = r * (0.42 + row * 0.17);
    const n = 6 + row * 3;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + row * 0.3;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.11, a - 2.4, a + 0.7);
      ctx.stroke();
    }
  }
}

export function ornEclair(ctx: Ctx, r: number, color: number): void {
  ctx.strokeStyle = rgba(color, 0.95);
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.lineJoin = 'miter';
  ctx.beginPath();
  ctx.moveTo(-r * 0.30, -r * 0.5);
  ctx.lineTo(r * 0.04, -r * 0.08);
  ctx.lineTo(-r * 0.16, r * 0.04);
  ctx.lineTo(r * 0.26, r * 0.52);
  ctx.stroke();
}

export function ornOrbites(ctx: Ctx, r: number, count: number, m: Metal): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r * 0.82;
    const y = Math.sin(a) * r * 0.82;
    ctx.save();
    ctx.translate(x, y);
    const g = ctx.createRadialGradient(-r * 0.06, -r * 0.06, 0, 0, 0, r * 0.2);
    g.addColorStop(0, rgba(m.light, 1));
    g.addColorStop(1, rgba(m.dark, 1));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rgba(m.accent, 0.8);
    ctx.lineWidth = Math.max(0.8, r * 0.03);
    ctx.stroke();
    ctx.restore();
  }
}

export function ornPales(ctx: Ctx, rOuter: number, rInner: number, count: number, color: number): void {
  ctx.fillStyle = rgba(color, 0.32);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    const w = (Math.PI * 2) / count * 0.42;
    ctx.beginPath();
    ctx.arc(0, 0, rOuter * 0.98, a, a + w);
    ctx.arc(0, 0, rInner * 1.02, a + w + 0.12, a + 0.12, true);
    ctx.closePath();
    ctx.fill();
  }
}

export function ornRivets(ctx: Ctx, r: number, count: number, m: Metal): void {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + 0.2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.09, 0, Math.PI * 2);
    ctx.fillStyle = rgba(m.dark, 0.9);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - r * 0.02, y - r * 0.025, r * 0.045, 0, Math.PI * 2);
    ctx.fillStyle = rgba(m.light, 0.85);
    ctx.fill();
  }
}

export function ornCrateres(ctx: Ctx, r: number, count: number): void {
  // Positions figées par la suite de Vogel : reproductibles, jamais aléatoires.
  for (let i = 0; i < count; i++) {
    const a = i * 2.399;
    const d = r * 0.72 * Math.sqrt((i + 0.5) / count);
    const rr = r * (0.09 + 0.05 * (((i * 37) % 10) / 10));
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d, Math.sin(a) * d, rr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,.34)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(Math.cos(a) * d - rr * 0.2, Math.sin(a) * d - rr * 0.2, rr * 0.72, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,.07)';
    ctx.fill();
  }
}

export function ornBille(ctx: Ctx, y: number, rr: number, m: Metal): void {
  const g = ctx.createRadialGradient(-rr * 0.35, y - rr * 0.4, 0, 0, y, rr);
  g.addColorStop(0, rgba(m.light, 1));
  g.addColorStop(0.6, rgba(m.mid, 1));
  g.addColorStop(1, rgba(m.dark, 1));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, y, rr, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = rgba(m.accent, 0.7);
  ctx.lineWidth = Math.max(0.8, rr * 0.14);
  ctx.stroke();
}

export function ornCardans(ctx: Ctx, y: number, rr: number, color: number): void {
  ctx.strokeStyle = rgba(color, 0.85);
  ctx.lineWidth = Math.max(1, rr * 0.16);
  for (const squash of [1, 0.52, 0.2]) {
    ctx.beginPath();
    ctx.ellipse(0, y, rr, rr * squash, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
}

export function ornDents(ctx: Ctx, w: number, h: number, count: number, color: number): void {
  ctx.fillStyle = rgba(color, 0.9);
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const side = i % 2 === 0 ? 1 : -1;
    const x = side * (w / 2) * (1 - t) * 0.9;
    const y = h * t;
    ctx.beginPath();
    ctx.moveTo(x, y - h * 0.09);
    ctx.lineTo(x + side * w * 0.4, y);
    ctx.lineTo(x, y + h * 0.09);
    ctx.closePath();
    ctx.fill();
  }
}

export function ornSpire(ctx: Ctx, w: number, h: number, turns: number, color: number): void {
  ctx.strokeStyle = rgba(color, 0.8);
  ctx.lineWidth = Math.max(1, w * 0.16);
  ctx.beginPath();
  const steps = turns * 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = Math.cos(t * turns * Math.PI * 2) * (w / 2) * (1 - t * 0.75);
    const y = h * t;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
}

export function ornSpirale(ctx: Ctx, r: number, color: number): void {
  ctx.strokeStyle = rgba(color, 0.9);
  ctx.lineWidth = Math.max(1, r * 0.1);
  ctx.lineCap = 'round';
  ctx.beginPath();
  for (let i = 0; i <= 64; i++) {
    const t = i / 64;
    const a = t * Math.PI * 3.2;
    const rr = r * 0.9 * t;
    const x = Math.cos(a) * rr;
    const y = Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function ornBouclier(ctx: Ctx, r: number, color: number): void {
  ctx.strokeStyle = rgba(color, 0.85);
  ctx.lineWidth = Math.max(1, r * 0.11);
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.85);
  ctx.lineTo(r * 0.7, -r * 0.42);
  ctx.lineTo(r * 0.7, r * 0.3);
  ctx.quadraticCurveTo(r * 0.4, r * 0.85, 0, r * 0.95);
  ctx.quadraticCurveTo(-r * 0.4, r * 0.85, -r * 0.7, r * 0.3);
  ctx.lineTo(-r * 0.7, -r * 0.42);
  ctx.closePath();
  ctx.stroke();
}

export function ornArc(ctx: Ctx, r: number, color: number): void {
  ctx.strokeStyle = rgba(color, 0.95);
  ctx.lineWidth = Math.max(1, r * 0.09);
  for (const dir of [1, -1]) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.78 * dir, -r * 0.34 * dir);
    ctx.quadraticCurveTo(0, r * 0.5 * dir, r * 0.78 * dir, -r * 0.34 * dir);
    ctx.stroke();
  }
}

// ── Marques de rang ──────────────────────────────────────────────────────────

/** Les gemmes de palier, posées en éventail au-dessus de l'objet. Zéro à trois :
 *  c'est le compteur qui rend le rang lisible à 24 px, quand plus rien ne l'est. */
export function rankGems(ctx: Ctx, r: number, count: number, m: Metal): void {
  if (count === 0) return;
  const rr = r * 0.15;
  const spread = r * 0.34;
  for (let i = 0; i < count; i++) {
    const x = (i - (count - 1) / 2) * spread;
    const y = -r * 1.02;
    ctx.save();
    ctx.translate(x, y);
    glow(ctx, rr * 2.6, m.accent, 0.5);
    gemPath(ctx, rr, 4, -Math.PI / 2);
    ctx.fillStyle = rgba(m.accent, 1);
    ctx.fill();
    ctx.lineWidth = Math.max(0.8, rr * 0.3);
    ctx.strokeStyle = rgba(0x0a0d12, 0.75);
    ctx.stroke();
    gemPath(ctx, rr * 0.42, 4, -Math.PI / 2);
    ctx.fillStyle = 'rgba(255,255,255,.85)';
    ctx.fill();
    ctx.restore();
  }
}

/** Ergots d'angle du palier Épique et au-delà : quatre pointes qui débordent du
 *  cadre. Elles se voient en vision périphérique, ce qu'une couleur ne fait pas. */
export function rankSpurs(ctx: Ctx, half: number, m: Metal): void {
  ctx.fillStyle = rgba(m.accent, 0.9);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i * Math.PI) / 2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.moveTo(0, -half * 1.34);
    ctx.lineTo(half * 0.14, -half * 1.06);
    ctx.lineTo(-half * 0.14, -half * 1.06);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

/** Plaque de rang : le fond sur lequel une pièce est présentée en inventaire.
 *  Rendue à part de l'objet pour que la Forge puisse montrer la pièce **nue**. */
export function rankPlate(ctx: Ctx, half: number, m: Metal, tier: number): void {
  const radius = half * 0.28;
  const plate: Path = () => {
    ctx.beginPath();
    ctx.roundRect(-half, -half, half * 2, half * 2, radius);
  };
  plate();
  const g = ctx.createLinearGradient(-half, -half, half, half);
  g.addColorStop(0, rgba(mix(0x131922, m.mid, 0.12), 1));
  g.addColorStop(1, rgba(mix(0x07090d, m.dark, 0.18), 1));
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  plate();
  ctx.clip();
  const vig = ctx.createRadialGradient(0, -half * 0.3, half * 0.1, 0, 0, half * 1.5);
  vig.addColorStop(0, rgba(m.accent, tier === 0 ? 0.04 : 0.10));
  vig.addColorStop(1, 'rgba(0,0,0,.5)');
  ctx.fillStyle = vig;
  ctx.fillRect(-half, -half, half * 2, half * 2);
  ctx.restore();

  plate();
  ctx.lineWidth = Math.max(1, half * 0.055);
  ctx.strokeStyle = rgba(m.accent, tier === 0 ? 0.5 : 0.95);
  ctx.stroke();
  if (tier >= 2) rankSpurs(ctx, half, m);
}
