/**
 * Jetons de la direction artistique « Métal & Braise ».
 * Source unique : PixiJS lit les entiers, React lit les variables CSS injectées par
 * applyThemeToDocument(). Aucune couleur ne doit être écrite en dur ailleurs.
 */
import type { TopType } from './content/toupies';

export const PALETTE = {
  bg: 0x0b0e13,
  panel: 0x131922,
  line: 0x2c3644,
  floorInner: 0x2a323d,
  floorOuter: 0x141a22,
  rim: 0x3e4959,
  rimShadow: 0x0a0d12,
  player: 0x80e8ff,
  bot: 0xff7c30,
  boss: 0xba78ff,
  zoneBoost: 0x6cf2c0,
  zoneSpike: 0xff5a5a,
  zoneSlick: 0x7ab6ff,
  ember: 0xffc24a,
  /** Le point « quelque chose t'attend ici ». Distinct de `zoneSpike` et de
   *  `bot`, qui vivent dans l'arène : celui-ci ne se rencontre que dans les
   *  menus et sur la barre d'onglets. */
  alert: 0xff3b30,
  ink: 0x151109,
  text: 0xe8eaee,
  muted: 0x8a94a6,
} as const;

/** Une teinte par type, pour le repère porté par chaque toupie. Distinctes de
 *  `PALETTE.player` / `.bot` / `.boss`, qui disent le camp : le camp et le type
 *  sont deux informations différentes et doivent rester lisibles séparément. */
export const TYPE_TINT: Record<TopType, number> = {
  attaque: 0xff5f56,
  endurance: 0x5fd98a,
  defense: 0x5f9dff,
  equilibre: 0xd7c9a8,
};

/** Les quatre paliers de rareté, acier → bleui → violet → or. **Une seule échelle
 *  pour tout le jeu** : les cadres de pièce (`src/art/`) et les libellés de rang
 *  (`src/ui/rank.ts`) lisent celle-ci. Avant, `ui/rank.ts` portait ses propres
 *  seuils *et* une échelle inversée (Légende violet, Épique doré) — un doublon qui
 *  suffisait à faire dire deux choses différentes au même rang selon l'écran.
 *
 *  Chaque palier est un métal complet, pas une teinte : `light`/`mid`/`dark` font le
 *  dégradé du corps, `accent` est la couleur d'identité (gemmes, liseré, texte). */
export interface Metal {
  light: number;
  mid: number;
  dark: number;
  accent: number;
}

export const RANK_TIERS: readonly [Metal, Metal, Metal, Metal] = [
  { light: 0x9fb0c4, mid: 0x5d6b7d, dark: 0x252c36, accent: 0xb9c6d6 },
  { light: 0x8fc4ff, mid: 0x3f74c4, dark: 0x1b2a44, accent: 0x5f9dff },
  { light: 0xd7b4ff, mid: 0x8a52d8, dark: 0x2a1b40, accent: 0xba78ff },
  { light: 0xffe3a0, mid: 0xd9922a, dark: 0x3a2408, accent: 0xffc24a },
];

/** L'acier nu : le métal de base sur lequel la teinte du palier vient se mêler.
 *  Un objet Commun est cet acier exactement ; une Légende en garde le brossage. */
export const STEEL: Metal = { light: 0x8fa0b6, mid: 0x46515f, dark: 0x1c222a, accent: 0xb9c6d6 };

export type RankTier = 0 | 1 | 2 | 3;

/** Seuils des paliers — source unique. Alignés sur les paliers *nommés* de
 *  `rankLabel()` : Commun-Rare, Excellent, Épique, Légende et au-delà. */
export function rankTier(rank: number): RankTier {
  if (rank >= 11) return 3;
  if (rank >= 7) return 2;
  if (rank >= 4) return 1;
  return 0;
}

export type Camp = 'player' | 'bot' | 'boss';

/** Atténuation multiplicative : l'incandescence baisse, la teinte reste intacte. */
const DIM_FLOOR = 0.18;
const DIM_SPAN = 0.82;
const DIM_EXP = 0.62;

export function spinTint(camp: Camp, ratio: number): number {
  const base = PALETTE[camp];
  const k = DIM_FLOOR + DIM_SPAN * Math.pow(Math.max(0, Math.min(1, ratio)), DIM_EXP);
  const r = Math.round(((base >> 16) & 0xff) * k);
  const g = Math.round(((base >> 8) & 0xff) * k);
  const b = Math.round((base & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function applyThemeToDocument(): void {
  const root = document.documentElement.style;
  for (const [name, value] of Object.entries(PALETTE)) {
    root.setProperty(`--${name}`, hex(value));
  }
  for (const [type, value] of Object.entries(TYPE_TINT)) {
    root.setProperty(`--type-${type}`, hex(value));
  }
  RANK_TIERS.forEach((tier, i) => root.setProperty(`--rank-${i}`, hex(tier.accent)));
}
