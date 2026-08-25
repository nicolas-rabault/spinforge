/**
 * Jetons de la direction artistique « Métal & Braise ».
 * Source unique : PixiJS lit les entiers, React lit les variables CSS injectées par
 * applyThemeToDocument(). Aucune couleur ne doit être écrite en dur ailleurs.
 */

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
  ember: 0xffc24a,
  ink: 0x151109,
  text: 0xe8eaee,
  muted: 0x8a94a6,
} as const;

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
}
