/**
 * Barème du son. Jumeau sonore de `src/render/feel.ts` : ce ne sont PAS des
 * chiffres d'équilibrage, rien ici ne touche la simulation, et rien de ce qui est
 * ici n'a le droit d'exister en dur ailleurs.
 * Durées en secondes (horloge WebAudio). Les motifs haptiques sont en millisecondes,
 * seule unité que comprend `navigator.vibrate`.
 */
export const MIX = {
  master: 0.5,
  musicGain: 0.3,
  sfxGain: 0.85,

  // — le choc —
  /** Garde entre deux chocs. Mesurée : sans elle, l'arène monte à 20 sons/s.
   *  Doit rester SUPÉRIEURE au tick de simulation (100 ms), sinon un contact
   *  prolongé la refranchit à chaque tick et ne filtre rien. */
  hitGapS: 0.14,
  /** Plancher absolu : deux sons plus rapprochés se superposent sur la même image. */
  hitFloorS: 0.04,
  /** De combien un choc doit dépasser le précédent pour casser sa garde. */
  hitPriorityStep: 0.25,
  hitClickHz: 3200,
  hitClickS: 0.008,
  hitClickGain: 0.05,
  hitClickSpan: 0.1,
  /** La fondamentale DESCEND quand la puissance monte : un gros choc est plus grave. */
  hitBodyHz: 520,
  hitBodySpan: -180,
  /** Ratios de plaque : inharmoniques, c'est ce qui fait « métal » plutôt que « note ». */
  hitBodyPartials: [1, 2.76, 5.4],
  hitBodyDecayS: 0.12,
  hitBodyDecaySpan: 0.18,
  hitBodyGain: 0.06,
  hitBodyGainSpan: 0.12,
  /** Désaccord aléatoire : c'est lui qui tue l'effet mitraillette PERÇU, quel que
   *  soit le débit réel. */
  hitDetune: 0.08,
  hitSubThreshold: 0.3,
  hitSubFrom: 120,
  hitSubTo: 55,
  hitSubS: 0.12,
  hitSubGain: 0.05,

  // — le rotor : une texture, plus un personnage —
  whirrGain: 0.018,
  whirrFreqLow: 380,
  whirrFreqHigh: 2200,
  subGain: 0.02,
  subFreqLow: 48,
  subFreqHigh: 96,

  // — ducking : un son tenu qui s'interrompt cesse d'être un son tenu —
  duckPower: 0.45,
  duckMusic: 0.55,
  duckWhirr: 0.35,
  duckHoldS: 0.15,
  duckReleaseS: 0.25,

  // — musique —
  bpm: 92,
  bars: 8,
  stepsPerBar: 16,
  lookaheadS: 0.1,
  timerMs: 25,
  /** Ré1. Toute la musique est dérivée d'elle par demi-tons. */
  rootHz: 36.71,
  layerFadeS: 0.35,
  intensityMenus: 0.35,
  intensityCombat: 0.7,
  intensityBoss: 1,
  deathFadeS: 0.6,

  // — vibration —
  hapticMinGapMs: 60,
  hapticBudgetMs: 220,
  hapticWindowMs: 1000,
  hapticHitThreshold: 0.35,
  hapticHitBaseMs: 8,
  hapticHitSpanMs: 10,
} as const;

/** Intensité à partir de laquelle chaque couche musicale entre. */
export const LAYERS = {
  drone: 0,
  pulse: 0.25,
  anvil: 0.55,
  motif: 0.65,
  tension: 0.9,
} as const;

/** Motifs de vibration, en millisecondes (durée, pause, durée, …). */
export const BUZZ = {
  tap: [8],
  reward: [12, 40, 12],
  chestOpened: [18],
  chestDone: [30, 60, 18, 40, 45],
  fuse: [20, 50, 45],
  equip: [10],
  bossDown: [40, 40, 40, 40, 80],
  death: [40, 60, 90],
} as const;

/**
 * Recettes des bruitages nommés — une entrée par événement, chacune la recette
 * complète de CE son : ses hauteurs, ses gains, ses durées. Différent de `MIX`,
 * qui porte ce qui est TRANSVERSAL (bus, seuils, gardes, ducking, musique,
 * vibration) et sert plusieurs sons à la fois. Même partage que
 * `src/render/feel.ts` (le barème) et `src/art/recipes.ts` (une recette par
 * objet). Le choc (`hit`) reste dans `MIX` : sa recette varie avec la puissance
 * du coup, ce n'est pas une signature fixe comme celles-ci.
 */
export const SFX = {
  death: {
    body: { freq: 190, gain: 0.07, decay: 0.55 },
    tone: { from: 190, to: 55, duration: 0.55, gain: 0.06 },
    burst: { freq: 520, q: 0.9, gain: 0.05, duration: 0.4 },
  },
  door: {
    /** Ré5 puis la5 : deux degrés de ré phrygien, deux notes qui s'accordent
     *  avec la musique au lieu de lui rentrer dedans. */
    first: { from: 587.33, duration: 0.11, gain: 0.045 },
    /** Jouée `secondDelayS` après la première. */
    second: { from: 880, duration: 0.16, gain: 0.04 },
    secondDelayS: 0.09,
    thud: { from: 110, to: 70, duration: 0.22, gain: 0.05 },
  },
} as const;
