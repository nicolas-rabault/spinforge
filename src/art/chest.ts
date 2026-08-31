/**
 * Les coffres. Trois objets, trois matières, un même vocabulaire de rang que les
 * pièces : le joueur reconnaît l'or du Mythique avant d'en lire le nom.
 *
 * `open` (0 → 1) soulève le couvercle et allume l'intérieur : l'ouverture d'un
 * coffre est une animation, pas un changement d'écran.
 */
import { RANK_TIERS, type Metal } from '../theme';
import type { ChestKind } from '../sim/types';
import { glow, paintMetal, rgba, type Ctx, type Path } from './draw';
import { chestRecipe } from './recipes';

/** Les ferrures. Le Bronze prend un vrai cuivre plutôt que l'acier du palier 0 :
 *  un « Coffre Bronze » gris se lisait comme un coffre sans qualité, pas comme le
 *  premier échelon d'une échelle. Les deux autres suivent l'échelle des rangs. */
const CHEST_METAL: Record<ChestKind, Metal> = {
  bronze: { light: 0xe0a86c, mid: 0x9c6234, dark: 0x3c2413, accent: 0xd7924e },
  arene: RANK_TIERS[1],
  mythique: RANK_TIERS[3],
};

export function drawChest(ctx: Ctx, kind: ChestKind, px: number, open = 0): void {
  const rec = chestRecipe(kind);
  const m = CHEST_METAL[kind];
  // Un corps par palier : bois chaud, bois sombre bleuté, laque presque noire. Sans
  // cette variation les trois coffres n'étaient que trois ferrures de couleur.
  const BODY: Record<ChestKind, [number, number, number]> = {
    bronze: [0x7a5638, 0x4a3320, 0x1f160e],
    arene: [0x4d5a6b, 0x2a333f, 0x121820],
    mythique: [0x3a3040, 0x211a2a, 0x0e0a13],
  };
  const [bl, bm, bd] = BODY[kind];
  const wood = { light: bl, mid: bm, dark: bd, accent: m.accent };
  const w = px * 0.78;
  const h = px * 0.52;
  const lidH = px * 0.3;

  ctx.save();
  ctx.translate(px / 2, px * 0.58);

  if (rec.tier > 0) glow(ctx, px * 0.6, m.accent, 0.08 + 0.07 * rec.tier);

  // Corps.
  const body: Path = () => {
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h * 0.1, w, h, px * 0.04);
  };
  paintMetal(ctx, body, w * 0.5, wood, { edge: px * 0.014, edgeAlpha: 0.55, grain: 'vertical' });

  // Lueur d'ouverture : elle sort du corps, sous le couvercle soulevé.
  if (open > 0) {
    ctx.save();
    body();
    ctx.clip();
    const g = ctx.createLinearGradient(0, -h * 0.1, 0, h * 0.5);
    g.addColorStop(0, rgba(0xfff2c8, 0.95 * open));
    g.addColorStop(1, rgba(m.accent, 0));
    ctx.fillStyle = g;
    ctx.fillRect(-w / 2, -h * 0.1, w, h);
    ctx.restore();
  }

  // Cerclages verticaux.
  ctx.fillStyle = rgba(m.mid, 1);
  ctx.strokeStyle = rgba(m.light, 0.9);
  ctx.lineWidth = Math.max(0.8, px * 0.008);
  for (let i = 0; i < rec.bands; i++) {
    const t = (i + 1) / (rec.bands + 1);
    const x = -w / 2 + w * t - px * 0.022;
    ctx.beginPath();
    ctx.roundRect(x, -h * 0.1, px * 0.044, h, px * 0.008);
    ctx.fill();
    ctx.stroke();
  }

  // Couvercle : bombé selon la recette, soulevé et pivoté par `open`.
  // Charnière au bord arrière-gauche : pivoter autour du centre décrochait le
  // couvercle du coffre à mi-ouverture.
  ctx.save();
  ctx.translate(-w / 2, -h * 0.1);
  ctx.rotate(-open * 0.85);
  ctx.translate(w / 2, 0);
  const lid: Path = () => {
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -lidH * 0.34);
    ctx.quadraticCurveTo(0, -lidH * (0.34 + rec.domed * 2), w / 2, -lidH * 0.34);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
  };
  paintMetal(ctx, lid, w * 0.5, wood, { edge: px * 0.014, edgeAlpha: 0.55, grain: 'vertical' });
  // Ferrure de couvercle.
  ctx.strokeStyle = rgba(m.accent, 0.75);
  ctx.lineWidth = Math.max(1, px * 0.014);
  lid();
  ctx.stroke();
  if (rec.gem) {
    ctx.save();
    ctx.translate(0, -lidH * (0.3 + rec.domed));
    glow(ctx, px * 0.09, m.accent, 0.9);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * px * 0.045;
      const y = Math.sin(a) * px * 0.045;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = rgba(m.accent, 1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.75)';
    ctx.lineWidth = Math.max(0.8, px * 0.008);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();

  // Serrure, sur le corps : le point de mire du coffre fermé.
  ctx.save();
  ctx.translate(0, h * 0.06);
  ctx.beginPath();
  ctx.roundRect(-px * 0.052, -px * 0.052, px * 0.104, px * 0.104, px * 0.016);
  const lockGrad = ctx.createLinearGradient(-px * 0.05, -px * 0.05, px * 0.05, px * 0.05);
  lockGrad.addColorStop(0, rgba(m.light, 1));
  lockGrad.addColorStop(1, rgba(m.dark, 1));
  ctx.fillStyle = lockGrad;
  ctx.fill();
  ctx.strokeStyle = rgba(m.accent, 0.8);
  ctx.lineWidth = Math.max(0.8, px * 0.007);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, -px * 0.008, px * 0.016, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.7)';
  ctx.fill();
  ctx.restore();

  ctx.restore();
}
