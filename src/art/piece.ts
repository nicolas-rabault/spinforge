/**
 * Le dessin d'une pièce. Une seule fonction publique, deux consommateurs : l'UI
 * (via `cache.ts`) et l'arène (via `render/textures.ts`, qui assemble la toupie).
 *
 * L'objet est dessiné **nu** ; la plaque de rang est séparée (`drawPieceTile`) pour
 * que la Forge puisse montrer la pièce sans son écrin.
 */
import { RANK_TIERS, STEEL, rankTier, type Metal } from '../theme';
import {
  conePath, crownPath, gemPath, glow, mix, ornArc, ornBille, ornBouclier, ornCardans,
  ornCrateres, ornDents, ornEcailles, ornEclair, ornFlamme, ornOrbites, ornPales,
  ornRivets, ornSpirale, ornSpire, paintMetal, rankGems, rankPlate, rgba, sheen,
  type Ctx, type Path,
} from './draw';
import { pieceRecipe, type PieceRecipe } from './recipes';

/** Le métal d'un objet à un rang donné : l'acier nu, teinté par le palier. Un
 *  Commun reste de l'acier brut ; une Légende est de l'acier **doré**, pas de l'or
 *  plat — c'est ce mélange qui garde la matière cohérente sur les onze rangs. */
export function metalFor(rank: number): Metal {
  const tier = rankTier(rank);
  if (tier === 0) return STEEL;
  const t = RANK_TIERS[tier];
  return {
    // Seule la LUMIÈRE prend la teinte du palier ; les ombres restent de l'acier.
    // Teinter les trois arrêts donnait un aplat monochrome où le modèle disparaissait.
    light: mix(STEEL.light, t.light, 0.72),
    mid: mix(STEEL.mid, t.mid, 0.34),
    dark: mix(STEEL.dark, t.dark, 0.2),
    accent: t.accent,
  };
}

function drawLame(ctx: Ctx, r: number, m: Metal, rec: Extract<PieceRecipe, { slot: 'lame' }>): void {
  const crown: Path = () => crownPath(ctx, r, rec.fangs, rec.hook, rec.depth);
  paintMetal(ctx, crown, r, m);

  // Moyeu rivé : sans lui la couronne flotte et ne se lit pas comme une pièce montée.
  const hub: Path = () => {
    ctx.beginPath();
    ctx.arc(0, 0, r * (1 - rec.depth) * 0.56, 0, Math.PI * 2);
  };
  paintMetal(ctx, hub, r * 0.6, { ...m, light: mix(m.light, m.dark, 0.35) }, { edge: r * 0.03 });

  const rin = r * (1 - rec.depth);
  if (rec.ornament === 'flamme') ornFlamme(ctx, rin, rec.fangs, m.accent);
  if (rec.ornament === 'ecailles') ornEcailles(ctx, rin, 2, m.accent);
  if (rec.ornament === 'eclair') ornEclair(ctx, rin * 0.8, m.accent);
}

function drawDisque(ctx: Ctx, r: number, m: Metal, rec: Extract<PieceRecipe, { slot: 'disque' }>): void {
  const rInner = r * (1 - rec.thickness * 1.6);
  const amp = rec.lobes > 0 ? 0.12 : 0;
  const ring: Path = () => {
    ctx.beginPath();
    const steps = Math.max(72, rec.lobes * 28);
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const rr = r * (rec.lobes > 0 ? 1 - amp + amp * Math.abs(Math.cos((a * rec.lobes) / 2)) : 1);
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.moveTo(rInner, 0);
    ctx.arc(0, 0, rInner, 0, Math.PI * 2, true);
    ctx.closePath();
  };
  paintMetal(ctx, ring, r, m);

  if (rec.spokes > 0) {
    const bars: Path = () => {
      ctx.beginPath();
      const w = (Math.PI * 2) / rec.spokes * 0.2;
      for (let i = 0; i < rec.spokes; i++) {
        const a = (i / rec.spokes) * Math.PI * 2;
        ctx.moveTo(Math.cos(a - w) * rInner * 0.2, Math.sin(a - w) * rInner * 0.2);
        ctx.lineTo(Math.cos(a - w) * rInner, Math.sin(a - w) * rInner);
        ctx.lineTo(Math.cos(a + w) * rInner, Math.sin(a + w) * rInner);
        ctx.lineTo(Math.cos(a + w) * rInner * 0.2, Math.sin(a + w) * rInner * 0.2);
        ctx.closePath();
      }
    };
    paintMetal(ctx, bars, r, m, { edge: r * 0.025 });
    // Moyeu qui referme les rayons au centre.
    const hub: Path = () => {
      ctx.beginPath();
      ctx.arc(0, 0, rInner * 0.3, 0, Math.PI * 2);
    };
    paintMetal(ctx, hub, r * 0.3, m, { edge: r * 0.025 });
  }

  if (rec.ornament === 'orbites') ornOrbites(ctx, r, rec.lobes, m);
  if (rec.ornament === 'pales') ornPales(ctx, r, rInner, rec.spokes, m.accent);
  if (rec.ornament === 'rivets') ornRivets(ctx, (r + rInner) / 2, rec.lobes * 2, m);
  if (rec.ornament === 'crateres') {
    ctx.save();
    ring();
    ctx.clip();
    ornCrateres(ctx, r, 9);
    ctx.restore();
  }
}

function drawPointe(ctx: Ctx, r: number, m: Metal, rec: Extract<PieceRecipe, { slot: 'pointe' }>): void {
  const w = rec.footWidth * r * 2.0;
  const h = rec.height * r * 1.75;
  const plateH = r * 0.34;
  // Centrage vertical de l'ensemble « platine + cône » dans la boîte.
  const top = -(h + plateH) / 2;
  ctx.save();
  ctx.translate(0, top + plateH * 0.5);

  const cone: Path = () => conePath(ctx, w, h);
  paintMetal(ctx, cone, r, m);

  if (rec.ornament === 'dents') ornDents(ctx, w, h * 0.9, 5, m.accent);
  if (rec.ornament === 'spire') ornSpire(ctx, w * 0.9, h * 0.92, 4, m.accent);
  if (rec.ornament === 'bille') ornBille(ctx, h * 0.88, w * 0.34, m);
  if (rec.ornament === 'cardans') ornCardans(ctx, h * 0.6, w * 0.5, m.accent);

  // La platine de montage vient par-dessus le cône : c'est elle qui dit « ça se visse ».
  const plate: Path = () => {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.8, plateH * 0.6, 0, 0, Math.PI * 2);
  };
  paintMetal(ctx, plate, r * 0.9, m, { edge: r * 0.035 });
  ctx.restore();
}

function drawNoyau(ctx: Ctx, r: number, m: Metal, rec: Extract<PieceRecipe, { slot: 'noyau' }>): void {
  // Logement griffu : quatre griffes qui tiennent la gemme.
  const socket: Path = () => {
    ctx.beginPath();
    const steps = 120;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const rr = r * (0.9 + 0.1 * Math.abs(Math.cos(a * 2)));
      const x = Math.cos(a) * rr;
      const y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.moveTo(r * 0.58, 0);
    ctx.arc(0, 0, r * 0.58, 0, Math.PI * 2, true);
    ctx.closePath();
  };
  paintMetal(ctx, socket, r, m);

  glow(ctx, r * 0.92, m.accent, 0.55);
  const gem: Path = () => gemPath(ctx, r * 0.6, rec.facets);
  gem();
  const g = ctx.createRadialGradient(-r * 0.18, -r * 0.22, 0, 0, 0, r * 0.62);
  g.addColorStop(0, 'rgba(255,255,255,.92)');
  g.addColorStop(0.42, rgba(m.accent, 0.95));
  g.addColorStop(1, rgba(mix(m.accent, 0x000000, 0.55), 1));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.strokeStyle = rgba(m.light, 0.9);
  ctx.stroke();
  // Facettes : des arêtes du centre vers chaque sommet, ce qui fait « taillé ».
  ctx.strokeStyle = 'rgba(255,255,255,.28)';
  ctx.lineWidth = Math.max(0.6, r * 0.022);
  for (let i = 0; i < rec.facets; i++) {
    const a = -Math.PI / 2 + (i / rec.facets) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
    ctx.stroke();
  }

  if (rec.ornament === 'spirale') ornSpirale(ctx, r * 0.5, 0x0a0d12);
  if (rec.ornament === 'bouclier') ornBouclier(ctx, r * 0.44, 0x0a0d12);
  if (rec.ornament === 'arc') ornArc(ctx, r * 0.46, 0x0a0d12);
  if (rec.ornament === 'braise') {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    glow(ctx, r * 0.5, 0xffc24a, 0.85);
    ctx.restore();
  }
}

/** Contour de l'objet, pour le balayage du palier Légende. Approché par un disque :
 *  le balayage n'a pas à épouser chaque croc pour se lire. */
function bodyPath(ctx: Ctx, r: number): Path {
  return () => {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
  };
}

/**
 * Dessine la pièce nue, centrée dans une boîte de `px` de côté.
 * Le repère est posé ici et nulle part ailleurs : les dessinateurs de silhouette
 * reçoivent un repère centré, jamais la taille de la boîte.
 */
export function drawPieceGlyph(ctx: Ctx, model: string, rank: number, px: number): void {
  const rec = pieceRecipe(model);
  const m = metalFor(rank);
  const tier = rankTier(rank);
  const r = px * 0.37;

  ctx.save();
  ctx.translate(px / 2, px / 2);
  if (tier > 0) glow(ctx, r * 1.5, m.accent, 0.1 + 0.06 * tier);

  if (rec.slot === 'lame') drawLame(ctx, r, m, rec);
  else if (rec.slot === 'disque') drawDisque(ctx, r, m, rec);
  else if (rec.slot === 'pointe') drawPointe(ctx, r, m, rec);
  else drawNoyau(ctx, r, m, rec);

  if (tier === 3) sheen(ctx, bodyPath(ctx, r), r);
  rankGems(ctx, r, tier, m);
  ctx.restore();
}

/** La pièce dans son écrin : plaque de rang plus objet. C'est la forme utilisée en
 *  inventaire, où la rareté doit se lire avant le modèle. */
export function drawPieceTile(ctx: Ctx, model: string, rank: number, px: number): void {
  const tier = rankTier(rank);
  ctx.save();
  ctx.translate(px / 2, px / 2);
  rankPlate(ctx, px * 0.44, RANK_TIERS[tier], tier);
  ctx.restore();
  ctx.save();
  ctx.translate(px * 0.5, px * 0.52);
  ctx.scale(0.74, 0.74);
  ctx.translate(-px / 2, -px / 2);
  drawPieceGlyph(ctx, model, rank, px);
  ctx.restore();
}
