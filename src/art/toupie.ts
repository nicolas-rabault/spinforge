/**
 * La toupie assemblée. Une toupie n'est pas un nom : c'est un châssis plus quatre
 * pièces, et c'est ainsi qu'on la dessine.
 *
 * Deux vues de la **même** description, jamais deux dessins :
 *  - `drawToupiePortrait` — trois quarts, pour la Forge et l'écran Toupies ;
 *  - `drawToupieTop` — vue de dessus, pour l'arène.
 *
 * C'est la promesse centrale de `src/art/` : la Lame vue en inventaire est celle
 * qui tourne à l'écran.
 */
import { toupieById, TOUPIES, type TopType, type ToupieId } from '../content/toupies';
import type { Slot } from '../content/pieces';
import type { PieceInstance } from '../sim/piece';
import { rankTier, TYPE_TINT, type Metal } from '../theme';
import {
  conePath, crownPath, gemPath, glow, mix, paintMetal, rgba, type Ctx, type Path,
} from './draw';
import { chassisRecipe, pieceRecipe } from './recipes';
import { metalFor } from './piece';

export interface ToupieArt {
  chassis: ToupieId;
  pieces: Record<Slot, { model: string; rank: number }>;
}

export function typeOf(art: ToupieArt): TopType {
  return toupieById(art.chassis).type;
}

export const ART_SLOTS: Slot[] = ['lame', 'disque', 'pointe', 'noyau'];

/** La toupie du joueur : son châssis de descente et ses quatre pièces équipées.
 *  C'est cette fonction qui fait apparaître la Forge dans l'arène. */
export function playerArt(equipped: Record<Slot, PieceInstance>, chassis: ToupieId): ToupieArt {
  return {
    chassis,
    pieces: {
      lame: { model: equipped.lame.model, rank: equipped.lame.rank },
      disque: { model: equipped.disque.model, rank: equipped.disque.rank },
      pointe: { model: equipped.pointe.model, rank: equipped.pointe.rank },
      noyau: { model: equipped.noyau.model, rank: equipped.noyau.rank },
    },
  };
}

/** Identité d'une toupie montée, au **palier** de rang près. Sert de clé aux deux
 *  caches — celui de l'UI (`art/cache.ts`) et celui de l'arène
 *  (`render/toupieTextures.ts`) : deux clés différentes, et les deux vues
 *  finiraient par montrer deux objets différents. */
export function toupieKey(art: ToupieArt): string {
  const slots = ART_SLOTS.map((s) => `${art.pieces[s].model}:${rankTier(art.pieces[s].rank)}`).join(',');
  return `${art.chassis}|${slots}`;
}

/** Les pièces que porte un adversaire. Les bots n'ont pas d'inventaire : on leur
 *  monte **le châssis de leur type et ses pièces signature**. Un joueur reconnaît
 *  donc dans son adversaire la toupie qu'il pourra posséder — le catalogue se montre
 *  de lui-même, sans un mot d'explication. */
const BOT_GENERIC: Record<TopType, { disque: string; pointe: string }> = {
  attaque: { disque: 'disque.eventail', pointe: 'pointe.aiguille' },
  defense: { disque: 'disque.colosse', pointe: 'pointe.plate' },
  endurance: { disque: 'disque.gravite', pointe: 'pointe.gyroscope' },
  equilibre: { disque: 'disque.lourd', pointe: 'pointe.orbitale' },
};

export function botArt(type: TopType): ToupieArt {
  const toupie = TOUPIES.find((t) => t.type === type) ?? TOUPIES[0];
  const generic = BOT_GENERIC[type];
  return {
    chassis: toupie.id,
    pieces: {
      lame: { model: toupie.signature.lame, rank: 1 },
      noyau: { model: toupie.signature.noyau, rank: 1 },
      disque: { model: generic.disque, rank: 1 },
      pointe: { model: generic.pointe, rank: 1 },
    },
  };
}

/** Le profil du châssis vu de dessus : un disque encoché dont l'asymétrie donne le
 *  sens de rotation. `chip` ébrèche le profil à mesure que le spin tombe. */
function chassisPath(ctx: Ctx, r: number, id: ToupieId, chip: number): Path {
  const rec = chassisRecipe(id);
  return () => crownPath(ctx, r * rec.spread, rec.lobes, rec.sweep, 0.16 + rec.sweep * 0.18, chip);
}

function lamePath(ctx: Ctx, r: number, model: string, chip: number): Path {
  const rec = pieceRecipe(model);
  if (rec.slot !== 'lame') throw new Error(`${model} n'est pas une Lame`);
  return () => crownPath(ctx, r, rec.fangs, rec.hook, rec.depth, chip);
}

function disquePath(ctx: Ctx, r: number, model: string): Path {
  const rec = pieceRecipe(model);
  if (rec.slot !== 'disque') throw new Error(`${model} n'est pas un Disque`);
  const rInner = r * (1 - rec.thickness * 1.6);
  const amp = rec.lobes > 0 ? 0.12 : 0;
  return () => {
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
}

/** Le noyau incandescent, au centre des deux vues. */
function drawCore(ctx: Ctx, r: number, model: string, rank: number): void {
  const rec = pieceRecipe(model);
  if (rec.slot !== 'noyau') throw new Error(`${model} n'est pas un Noyau`);
  const m = metalFor(rank);
  glow(ctx, r * 1.9, m.accent, 0.38);
  gemPath(ctx, r, rec.facets);
  const g = ctx.createRadialGradient(-r * 0.25, -r * 0.3, 0, 0, 0, r);
  g.addColorStop(0, 'rgba(255,255,255,.95)');
  g.addColorStop(0.45, rgba(m.accent, 0.95));
  g.addColorStop(1, rgba(mix(m.accent, 0x000000, 0.5), 1));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = Math.max(0.8, r * 0.16);
  ctx.strokeStyle = rgba(m.light, 0.85);
  ctx.stroke();
}

/**
 * Vue de dessus, centrée dans une boîte de `px`. L'ordre d'empilement est celui de
 * l'objet réel : le châssis dessous, la Lame par-dessus, le Disque au centre, le
 * Noyau au sommet. La Pointe n'apparaît pas — de dessus, on ne la voit pas.
 */
export function drawToupieTop(ctx: Ctx, art: ToupieArt, px: number, chip = 0): void {
  const r = px * 0.46;
  ctx.save();
  ctx.translate(px / 2, px / 2);

  const chassisMetal: Metal = {
    light: 0x6d7c90, mid: 0x39424f, dark: 0x181d25,
    accent: mix(0x8a94a6, TYPE_TINT[toupieById(art.chassis).type], 0.8),
  };
  paintMetal(ctx, chassisPath(ctx, r, art.chassis, chip), r, chassisMetal, { edge: r * 0.03 });

  const lameMetal = metalFor(art.pieces.lame.rank);
  paintMetal(ctx, lamePath(ctx, r * 0.74, art.pieces.lame.model, chip), r * 0.74, lameMetal, { edge: r * 0.028 });

  const disqueMetal = metalFor(art.pieces.disque.rank);
  paintMetal(ctx, disquePath(ctx, r * 0.48, art.pieces.disque.model), r * 0.48, disqueMetal, { edge: r * 0.022 });

  drawCore(ctx, r * 0.2, art.pieces.noyau.model, art.pieces.noyau.rank);
  ctx.restore();
}

/**
 * Le contour seul, en blanc : l'arène le teinte par camp (`spinTint`) au fil du spin.
 * Séparé du corps parce que le corps ne doit **pas** s'éteindre avec le spin — seul
 * le liseré porte l'état de santé.
 */
export function drawToupieTopRim(ctx: Ctx, art: ToupieArt, px: number, chip = 0): void {
  const r = px * 0.46;
  ctx.save();
  ctx.translate(px / 2, px / 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineJoin = 'round';
  ctx.lineWidth = px * 0.02;
  chassisPath(ctx, r, art.chassis, chip)();
  ctx.stroke();
  ctx.lineWidth = px * 0.014;
  lamePath(ctx, r * 0.74, art.pieces.lame.model, chip)();
  ctx.stroke();
  ctx.restore();
}

/** Extrusion : la même silhouette répétée vers le bas, de plus en plus sombre.
 *  C'est ce qui donne son épaisseur au portrait sans modèle 3D. */
function extrude(ctx: Ctx, path: Path, yTop: number, depth: number, k: number, m: Metal): void {
  const steps = 8;
  for (let i = steps; i >= 1; i--) {
    const t = i / steps;
    ctx.save();
    ctx.translate(0, yTop + depth * t);
    ctx.scale(1, k);
    path();
    ctx.fillStyle = rgba(mix(m.mid, 0x000000, 0.34 + 0.34 * t), 1);
    ctx.fill();
    ctx.restore();
  }
}

function face(ctx: Ctx, path: Path, y: number, k: number, r: number, m: Metal, edge: number): void {
  ctx.save();
  ctx.translate(0, y);
  ctx.scale(1, k);
  paintMetal(ctx, path, r, m, { edge });
  ctx.restore();
}

/**
 * Portrait trois quarts : la pile complète, Lame en haut, Disque au milieu, Pointe
 * en bas, Noyau en façade. Changer une pièce change le portrait — c'est ce qui rend
 * la Forge lisible sans lire.
 */
export function drawToupiePortrait(ctx: Ctx, art: ToupieArt, px: number): void {
  const rec = chassisRecipe(art.chassis);
  const r = px * 0.34;
  const k = 0.40; // écrasement de la perspective
  const cy = px * 0.5;
  const type = toupieById(art.chassis).type;

  ctx.save();
  ctx.translate(px / 2, cy);

  // Ombre portée : sans elle la toupie flotte.
  ctx.save();
  ctx.translate(0, r * 1.42);
  ctx.scale(1, 0.3);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.95, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,.45)';
  ctx.fill();
  ctx.restore();

  // Halo de type, très en retrait : il colore la scène sans repeindre l'objet.
  glow(ctx, r * 1.9, TYPE_TINT[type], 0.16);

  // Les trois hauteurs se recouvrent volontairement : c'est l'extrusion du châssis
  // qui comble l'écart entre la couronne et le disque. Écartées, les pièces se
  // lisaient comme une vue éclatée — le défaut n°2 de la première planche de style.
  const yLame = -r * 0.30 * rec.stance;
  const yDisque = r * 0.18;
  const yPointe = r * 0.30;

  // Pointe, dessinée en premier : elle passe derrière tout le reste.
  const pRec = pieceRecipe(art.pieces.pointe.model);
  if (pRec.slot === 'pointe') {
    const pm = metalFor(art.pieces.pointe.rank);
    ctx.save();
    ctx.translate(0, yPointe);
    paintMetal(ctx, () => conePath(ctx, pRec.footWidth * r * 1.7, pRec.height * r * 1.5), r, pm, {
      edge: r * 0.03,
    });
    ctx.restore();
  }

  const disqueMetal = metalFor(art.pieces.disque.rank);
  const dPath = disquePath(ctx, r * 0.82, art.pieces.disque.model);
  extrude(ctx, dPath, yDisque, r * 0.20, k, disqueMetal);
  face(ctx, dPath, yDisque, k, r * 0.82, disqueMetal, r * 0.028);

  const chassisMetal: Metal = {
    light: 0x6d7c90, mid: 0x39424f, dark: 0x181d25,
    accent: mix(0x8a94a6, TYPE_TINT[type], 0.85),
  };
  const cPath = chassisPath(ctx, r, art.chassis, 0);
  extrude(ctx, cPath, yLame + r * 0.08, r * 0.20, k, chassisMetal);
  face(ctx, cPath, yLame + r * 0.08, k, r, chassisMetal, r * 0.05);

  // La couronne est nettement plus petite que le châssis — même rapport que la vue
  // de dessus. À 0,9 elle le recouvrait entièrement et les quatre châssis
  // donnaient quatre portraits identiques.
  const lameMetal = metalFor(art.pieces.lame.rank);
  const lPath = lamePath(ctx, r * 0.66, art.pieces.lame.model, 0);
  extrude(ctx, lPath, yLame, r * 0.16, k, lameMetal);
  face(ctx, lPath, yLame, k, r * 0.66, lameMetal, r * 0.028);

  // Noyau en façade, au creux de la pile : c'est le point le plus lumineux du portrait.
  ctx.save();
  ctx.translate(0, yLame + r * 0.02);
  ctx.scale(1, k * 1.5);
  drawCore(ctx, r * 0.22, art.pieces.noyau.model, art.pieces.noyau.rank);
  ctx.restore();

  ctx.restore();
}
