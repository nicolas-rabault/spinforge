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
  markerPulseHz: 1.15,
  caretSizeMult: 0.62,
  caretGapMult: 1.78,
  caretBobMult: 0.16,

  // jauge de spin portée par chaque toupie. La piste sombre est tracée en entier
  // et ne s'efface jamais : c'est elle qui tient le rôle de l'ancien anneau de
  // marquage quand le spin du joueur tombe à zéro.
  gaugeRadiusMult: 1.34,
  gaugeWidthPlayer: 0.3,
  gaugeWidthBot: 0.2,
  /** Pas de ratio en deçà duquel la jauge n'est pas retracée. */
  gaugeStep: 0.008,

  // badge d'avantage porté par les adversaires (jamais par le joueur).
  badgeGapMult: 2.4,

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

/**
 * Barème de la révélation de coffre. Il vit ici avec le reste du ressenti, mais
 * il parle au DOM et non à PixiJS : les distances sont donc en **pixels
 * d'écran**, pas en unités de simulation. Les durées restent en secondes.
 *
 * Un palier par rareté, dans l'ordre de `rankTier` : acier, bleui, violet, or.
 * Rien ici n'a d'effet sur ce qui est tiré — seulement sur la façon dont la
 * pièce arrive à l'écran.
 */
export interface RevealFeel {
  /** Attente avant la pièce suivante. Un commun enchaîne, une légende respire. */
  hold: number;
  /** Durée de la gerbe. */
  life: number;
  /** Nombre d'étincelles. Zéro : le palier n'en projette aucune. */
  sparks: number;
  /** Portée des étincelles, en multiples de la taille de la pièce. */
  reach: number;
  /** Épaisseur d'une étincelle, en pixels. Une Légende doit projeter des traits
   *  épais : à épaisseur constante, sa gerbe se lit comme celle d'un Rare. */
  thick: number;
  /** Échelle finale de l'onde de choc. Zéro : pas d'onde. */
  ring: number;
  /** Opacité du flash plein écran. Zéro : pas de flash. */
  flash: number;
  /** Amplitude de la secousse d'écran, en pixels. Zéro : pas de secousse. */
  shake: number;
}

export const REVEAL: readonly [RevealFeel, RevealFeel, RevealFeel, RevealFeel] = [
  { hold: 0.09, life: 0.3, sparks: 0, reach: 0, thick: 0, ring: 0, flash: 0, shake: 0 },
  { hold: 0.22, life: 0.45, sparks: 8, reach: 0.95, thick: 2.5, ring: 1.7, flash: 0, shake: 0 },
  { hold: 0.5, life: 0.62, sparks: 16, reach: 1.45, thick: 3.4, ring: 2.5, flash: 0.16, shake: 6 },
  { hold: 0.95, life: 0.85, sparks: 28, reach: 2.15, thick: 4.6, ring: 3.3, flash: 0.42, shake: 14 },
];

/** Secousse d'ouverture, en pixels : le couvercle qui cède se sent dans tout
 *  l'écran, et un Mythique tape plus fort qu'un Bronze. */
export const CHEST_QUAKE = { bronze: 7, arene: 11, mythique: 17 } as const;
export const CHEST_QUAKE_LIFE = 0.5;
