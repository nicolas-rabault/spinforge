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
  /** Fondu au basculement d'un interrupteur (musique, bruitages). */
  settingFadeS: 0.03,

  // — le limiteur en sortie : les gains sont délibérément bas parce que TOUT
  //   passe par lui, et l'arène peut empiler jusqu'à dix chocs par seconde —
  limiterThresholdDb: -14,
  limiterKneeDb: 14,
  limiterRatio: 8,
  limiterAttackS: 0.003,
  limiterReleaseS: 0.18,

  // — primitives : réglages par défaut d'un burst() qui n'en précise pas —
  burstQ: 1,
  burstAttackS: 0.004,
  /** Attaque par défaut de `tone()`, quand l'appelant n'en précise pas. */
  toneAttackS: 0.008,
  /** Attaque des partiels de `metalBody()` : décide de la netteté de l'attaque
   *  du métal — égale à `burstAttackS` aujourd'hui par coïncidence, pas par
   *  intention, ce sont deux réglages de timbre différents. */
  metalAttackS: 0.004,
  /** Vitesse à laquelle les partiels aigus de `metalBody()` s'éteignent plus
   *  vite que la fondamentale : plus ce facteur est grand, plus le corps
   *  métallique perd ses harmoniques hautes tôt dans le son. */
  metalRolloff: 1.6,

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
  /** Variation de la vitesse de lecture du transitoire — même rôle que
   *  `hitDetune`, mais sur le bruit plutôt que sur le corps tonal : deux
   *  anti-répétitions différentes, sur les deux couches du choc. */
  hitClickRateBase: 0.7,
  hitClickRateSpan: 0.6,
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
  /** Facteur de qualité du passe-bande du souffle. */
  whirrQ: 1.1,
  /** Palier de croisière du souffle à un spin donné : un plancher (le rotor ne
   *  s'éteint jamais tout à fait tant qu'il tourne) plus une part proportionnelle
   *  au spin. Partagés par `duck()` et `setSpin()` via `whirrTarget()` — la même
   *  cible des deux côtés, pour qu'un duck revienne exactement en régime de
   *  croisière plutôt que sur une valeur qui aurait divergé en silence. */
  whirrGainFloor: 0.25,
  whirrGainSpan: 0.75,
  subGain: 0.02,
  subFreqLow: 48,
  subFreqHigh: 96,
  /** Lissage de `setSpin()` : temps de convergence de `setTargetAtTime`, distinct
   *  pour le gain et pour la fréquence — ce ne sont pas les mêmes valeurs. */
  spinGainSmoothS: 0.1,
  spinFreqSmoothS: 0.12,

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

/**
 * Recettes des cinq couches de la musique — même esprit que `SFX` : une entrée
 * par couche, chacune le timbre complet de CETTE couche (hauteurs, gains,
 * filtres). `LAYERS` (les seuils d'entrée) et `MIX` (tempo, forme, intensités)
 * restent transversaux ; ceci est du signal, pas du calendrier.
 */
export const MUSIC = {
  drone: {
    /** Coupure du passe-bas qui filtre le souffle grave sous le sinus. */
    noiseFilterHz: 180,
    /** Dosage du souffle mélangé au sinus de fondamentale. */
    noiseGain: 0.35,
    /** Gain = `gainBase * (gainFloor + gainSpan * intensité)` : un plancher dès
     *  l'entrée, plus une part qui suit l'intensité — même patron que
     *  `whirrTarget()` pour le souffle du rotor. */
    gainBase: 0.09,
    gainFloor: 0.5,
    gainSpan: 0.5,
  },
  pulse: {
    from: 110,
    to: 44,
    duration: 0.09,
    gain: 0.16,
    attack: 0.003,
  },
  anvil: {
    freq: 1400,
    q: 1.2,
    gain: 0.05,
    duration: 0.05,
    /** Retour du filtre en peigne partagé par toutes les frappes d'enclume. */
    combFeedback: 0.72,
  },
  motif: {
    duration: 0.28,
    gain: 0.05,
  },
  tension: {
    /** Coupure du passe-bas qui adoucit la scie de la nappe. */
    filterHz: 700,
    /** Gain cible une fois la couche entrée. */
    gain: 0.03,
  },
} as const;

/** Hauteur du « ting » de révélation, par palier de rang. Mi♭5, sol5, si♭5, ré6 :
 *  quatre degrés de ré phrygien, donc quatre notes qui s'accordent avec la
 *  musique. Un mi ou un si naturels sonneraient faux contre la fondamentale. */
export const REVEAL_HZ = [622.25, 784, 932.33, 1174.66] as const;

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
    first: { from: 587.33, duration: 0.11, gain: 0.045 },
    /** Jouée `secondDelayS` après la première. */
    second: { from: 880, duration: 0.16, gain: 0.04 },
    secondDelayS: 0.09,
    thud: { from: 110, to: 70, duration: 0.22, gain: 0.05 },
  },
  reward: {
    grainsBase: 4,
    /** Bonus quand un second coffre est tombé — un butin plus gros tombe plus dru. */
    grainsChestBonus: 1,
    grainFreqFrom: 1800,
    grainFreqTo: 3200,
    grainQ: 6,
    grainGain: 0.035,
    grainDuration: 0.025,
    grainSpacingS: 0.045,
    grainJitterS: 0.015,
    /** Le fond de la caisse, sous la cascade de grains. */
    floor: { from: 90, duration: 0.09, gain: 0.04, delayS: 0.02 },
  },
  bossDown: {
    body: { freq: 146.83, gain: 0.09, decay: 0.9 },
    /** Ré4, la4, ré5 : la fondamentale, sa quinte, son octave. */
    chord: [293.66, 440, 587.33],
    chordToneDuration: 0.5,
    chordToneGain: 0.05,
    chordSpacingS: 0.12,
  },
  chestShake: { type: 'lowpass', freq: 220, gain: 0.05, duration: 0.6, rate: 0.4 },
  chestStep: { freqBase: 700, freqIndexStep: 0.18, q: 2, gain: 0.045, duration: 0.04 },
  chestOpened: {
    burst: { type: 'highpass', freq: 2600, gain: 0.05, duration: 0.35 },
    toneA: { from: 293.66, duration: 0.35, gain: 0.04 },
    toneB: { from: 440, duration: 0.35, gain: 0.035 },
  },
  pieceRevealed: {
    duration: 0.18,
    gain: 0.035,
    /** Harmonique ajoutée au-dessus du « ting » : ratio, pas note à part. */
    overtoneRatio: 2.4,
    overtoneDuration: 0.09,
    overtoneGain: 0.015,
  },
  chestDone: {
    /** La dernière pièce révélée sonne au même instant que `chestDone` : sans ce
     *  délai, les deux sons empilés s'annulaient au lieu de se succéder. */
    delayS: 0.12,
    /** Ratios de la triade jouée sous la note la plus rare du butin. */
    chordRatios: [0.5, 0.75, 1],
    toneDuration: 0.25,
    toneGain: 0.04,
    spacingS: 0.1,
  },
  fuse: {
    /** La montée ; l'enclume démarre pile quand elle s'éteint. */
    rise: { freq: 300, toFreq: 2000, q: 3, gain: 0.045, duration: 0.35 },
    anvil: { freq: 293.66, gain: 0.09, decay: 0.35 },
  },
  upgrade: { freq: 392, gain: 0.06, decay: 0.2 },
  equip: {
    first: { freq: 1400, q: 5, gain: 0.035, duration: 0.03 },
    second: { freq: 900, q: 5, gain: 0.03, duration: 0.04 },
    secondDelayS: 0.04,
  },
  tap: {
    freq: 1200,
    /** Seconde variante, en alternance avec `freq` : deux clics identiques à la
     *  suite s'entendent comme un défaut, pas comme un retour. */
    freqAltRatio: 1.12,
    q: 4,
    gain: 0.03,
    duration: 0.025,
    /** Jouée en plus quand l'appui engage une dépense. */
    spendTone: { from: 160, to: 120, duration: 0.04, gain: 0.03 },
  },
} as const;
