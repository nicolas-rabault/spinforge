/**
 * Barème du game feel. Ce ne sont PAS des chiffres d'équilibrage : rien ici ne
 * touche la simulation, et rien ici n'a sa place dans src/sim/config.ts.
 * Durées en secondes, distances en unités de simulation.
 */
export const FEEL = {
  // rotation : ω = base + span × ratio^exp   (rad/s)
  omegaBase: 2,
  omegaSpan: 18,
  omegaExp: 1.15,

  // incandescence
  haloRadiusMult: 1.9,
  haloAlphaBase: 0.2,
  haloAlphaSpan: 0.8,

  // usure : seuils de bascule des textures ébréchées
  wearLevel1: 0.45,
  wearLevel2: 0.22,
  chipStart: 0.4,
  chipCount: 5,

  // traînée
  trailSpeedRatio: 0.55,
  trailMax: 9,
  trailLife: 0.22,

  // impact — hitReference est ABSOLU : normaliser contre spinMax ferait faiblir
  // les chocs à mesure que le joueur monte son Noyau.
  hitReference: 90,
  hitEpsilon: 1e-6,
  flashLife: 0.11,
  waveLife: 0.38,
  waveRadius: 46,
  shakeMax: 9,
  shakePerHit: 5,
  shakeDamping: 0.86,
  sparkBase: 6,
  sparkSpan: 8,
  sparkPool: 120,
  sparkLife: 0.5,

  // agonie
  deathLife: 0.9,

  // marque du joueur : le repère qui répond à « laquelle est la mienne ? ».
  // Sa teinte ne suit JAMAIS le spin — un repère qui s'éteint avec la toupie
  // disparaît exactement quand on le cherche.
  markerRadiusMult: 2.15,
  markerAlphaBase: 0.3,
  markerAlphaPulse: 0.16,
  markerPulseHz: 1.15,
  caretSizeMult: 0.62,
  caretGapMult: 1.45,
  caretBobMult: 0.16,

  // repère de type : point posé sur le corps de chaque toupie non-joueur, teinte
  // fixe (TYPE_TINT, jamais spinTint) — même règle que le marqueur ci-dessus.
  // Rayon + décalage < 1 : il ne doit jamais dépasser du disque.
  typeMarkSizeMult: 0.22,
  typeMarkGapMult: 0.62,

  // boss
  bossHaloMult: 2.7,
  bossRingSpeed: -0.42,
  bossEntryLife: 1.2,

  // transition « reforge »
  reforgeLife: 0.45,
  reforgeFlashLife: 0.22,
  reforgeQuickWindow: 3,
  reforgeQuickScale: 0.4,
} as const;

/** Vitesse de rotation à l'écran, en rad/s, pour un ratio de spin donné. */
export function spinOmega(ratio: number): number {
  const r = Math.max(0, Math.min(1, ratio));
  return FEEL.omegaBase + FEEL.omegaSpan * Math.pow(r, FEEL.omegaExp);
}
