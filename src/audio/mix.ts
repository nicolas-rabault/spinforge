/**
 * Barème du son. Jumeau sonore de `src/render/feel.ts` : ce ne sont PAS des
 * chiffres d'équilibrage, rien ici ne touche la simulation, et rien de ce qui est
 * ici n'a le droit d'exister en dur ailleurs.
 * Durées en secondes (horloge WebAudio). Les motifs haptiques sont en millisecondes,
 * seule unité que comprend `navigator.vibrate`.
 */
/** Ré1. Toute hauteur du jeu — musique ET bruitages — en dérive par demi-tons.
 *  Elle n'est pas dans `MIX` : `noteHz()` et `NOTE` sont juste dessous et `MIX`
 *  lui-même y puise, une constante ne peut pas se référencer elle-même. */
const ROOT_HZ = 36.71;

/** Hauteur d'un degré du mode, à l'octave demandée au-dessus de la racine.
 *  `noteHz(0, 0)` rend la racine, `noteHz(0, 1)` l'octave au-dessus. */
export function noteHz(semitone: number, octave: number): number {
  return ROOT_HZ * Math.pow(2, octave + semitone / 12);
}

/** Ré phrygien, en demi-tons depuis la fondamentale : ré, mi♭, fa, sol, la, si♭, do.
 *  Le mode le plus sombre qui reste chantable — et son demi-ton ré → mi♭ EST la
 *  tension du boss. C'est la règle que `mode.test.ts` fait tenir à TOUTES les
 *  hauteurs du jeu, musique et bruitages ensemble. */
export const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10] as const;

/**
 * La table des notes : le seul endroit du son où une hauteur s'écrit. La musique
 * et les bruitages y puisent tous les deux, et c'est ce partage — pas la bonne
 * volonté de chaque recette — qui garantit qu'un « ting » de coffre ne frotte
 * jamais contre le bourdon.
 *
 * Nommage scientifique : le do d'une octave de ré porte le numéro suivant, la
 * numérotation changeant d'octave au do. N'y figurent que les notes réellement
 * jouées ; une hauteur qu'on ajoute se déclare ici d'abord.
 */
export const NOTE = {
  A1: noteHz(7, 0),
  D2: noteHz(0, 1),
  F2: noteHz(3, 1),
  A2: noteHz(7, 1),
  Bb2: noteHz(8, 1),
  D3: noteHz(0, 2),
  Eb3: noteHz(1, 2),
  D4: noteHz(0, 3),
  F4: noteHz(3, 3),
  G4: noteHz(5, 3),
  A4: noteHz(7, 3),
  Bb4: noteHz(8, 3),
  D5: noteHz(0, 4),
  Eb5: noteHz(1, 4),
  G5: noteHz(5, 4),
  A5: noteHz(7, 4),
  Bb5: noteHz(8, 4),
  D6: noteHz(0, 5),
} as const;

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
  hitClickGainSpan: 0.1,
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
  /** Quatre seuils sur le même axe — la puissance d'un choc — et il faut les lire
   *  ensemble : 0,25 un choc entre bots mérite un son (les tiens sonnent toujours),
   *  0,30 il gagne son poids grave, 0,35 il se sent dans la main, 0,45 il creuse la
   *  musique et le rotor. */
  hitBotThreshold: 0.25,
  hitSubThreshold: 0.3,
  /** Départ du glissando du poids. À un quart de ton du mode, volontairement : ce
   *  qui s'entend d'une chute de 120 à 55 Hz en 120 ms, c'est son arrivée. */
  hitSubFrom: 120,
  hitSubTo: NOTE.A1,
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
 * par couche, chacune le timbre complet de CETTE couche (notes, gains, filtres).
 * `LAYERS` porte les seuils d'entrée, `MIX` le tempo et la forme, `NOTE` toutes
 * les hauteurs.
 *
 * Ce qui reste dans `music.ts`, et lui seul, c'est le CALENDRIER : quel pas de la
 * grille déclenche quoi — le pouls tous les huit pas, l'enclume sur les
 * contretemps 6 et 11, le motif sur les deux dernières mesures d'un groupe de
 * quatre. Ce sont des motifs rythmiques, pas des réglages : sortis de la boucle
 * qui les applique, ils ne diraient plus rien.
 */
export const MUSIC = {
  drone: {
    /** Le bourdon sonne le ré2, une octave au-dessus de la racine : à la racine
     *  même, un petit haut-parleur ne rend plus qu'un souffle. */
    note: NOTE.D2,
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
    from: NOTE.A2,
    /** L'arrivée de la chute de la grosse caisse. Pas un degré du mode, et c'est
     *  voulu : la queue d'une peau frappée est un coup, pas une note. */
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
    /** Accord du filtre en peigne : c'est lui qui donne sa hauteur au bruit. */
    combNote: NOTE.D6,
    /** Retour du filtre en peigne partagé par toutes les frappes d'enclume. */
    combFeedback: 0.72,
  },
  motif: {
    /** Ré, la, si♭, fa — les quatre notes du motif, dans l'ordre où elles tombent. */
    notes: [NOTE.D4, NOTE.A4, NOTE.Bb4, NOTE.F4],
    duration: 0.28,
    gain: 0.05,
  },
  tension: {
    /** Le mi♭ tenu contre le bourdon en ré : le demi-ton phrygien, entier. */
    note: NOTE.Eb3,
    /** Coupure du passe-bas qui adoucit la scie de la nappe. */
    filterHz: 700,
    /** Gain cible une fois la couche entrée. */
    gain: 0.03,
  },
} as const;

/** Hauteur du « ting » de révélation, un palier de rang par entrée. Le tuple à
 *  quatre places n'est pas décoratif : indexé par un `RankTier` (`0 | 1 | 2 | 3`),
 *  il rend tout garde de borne inutile côté `audio.ts`. */
export const REVEAL_HZ: readonly [number, number, number, number] =
  [NOTE.Eb5, NOTE.G5, NOTE.Bb5, NOTE.D6];

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
 *
 * Toute hauteur vient de `NOTE`. Les rares nombres bruts qui restent sont des
 * extrémités de glissando volontairement hors du mode : `mode.test.ts` en tient
 * la liste, avec la raison de chacune.
 */
export const SFX = {
  death: {
    /** 190 Hz n'est aucun degré du mode (54 cents sous le sol3), et n'a pas à
     *  l'être : un corps métallique inharmonique n'est pas une note, et la chute
     *  qui l'accompagne, elle, atterrit sur le la1. */
    body: { freq: 190, gain: 0.07, decay: 0.55 },
    tone: { from: 190, to: NOTE.A1, duration: 0.55, gain: 0.06 },
    burst: { freq: 520, q: 0.9, gain: 0.05, duration: 0.4 },
  },
  door: {
    /** Ré5 puis la5 : deux notes brèves qui montent — une porte qui s'ouvre, pas
     *  une alarme. */
    first: { from: NOTE.D5, duration: 0.11, gain: 0.045 },
    /** Jouée `secondDelayS` après la première. */
    second: { from: NOTE.A5, duration: 0.16, gain: 0.04 },
    secondDelayS: 0.09,
    /** Le coup sourd sous les deux notes. Sa chute s'arrête hors du mode : à
     *  70 Hz sur 220 ms, ce qui reste est le poids, pas la hauteur. */
    thud: { from: NOTE.A2, to: 70, duration: 0.22, gain: 0.05 },
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
    /** Le fond de la caisse, sous la cascade de grains. Fa2 : un sinus fixe de
     *  90 ms sans glissando, joué à chaque récompense par-dessus le bourdon —
     *  c'est la hauteur du catalogue qui pardonne le moins un quart de ton. */
    floor: { from: NOTE.F2, duration: 0.09, gain: 0.04, delayS: 0.02 },
  },
  bossDown: {
    body: { freq: NOTE.D3, gain: 0.09, decay: 0.9 },
    /** Ré4, la4, ré5 : la fondamentale, sa quinte, son octave. */
    chord: [NOTE.D4, NOTE.A4, NOTE.D5],
    chordToneDuration: 0.5,
    chordToneGain: 0.05,
    chordSpacingS: 0.12,
  },
  chestShake: { type: 'lowpass', freq: 220, gain: 0.05, duration: 0.6, rate: 0.4 },
  chestStep: { freqBase: 700, freqIndexStep: 0.18, q: 2, gain: 0.045, duration: 0.04 },
  chestOpened: {
    burst: { type: 'highpass', freq: 2600, gain: 0.05, duration: 0.35 },
    toneA: { from: NOTE.D4, duration: 0.35, gain: 0.04 },
    toneB: { from: NOTE.A4, duration: 0.35, gain: 0.035 },
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
    anvil: { freq: NOTE.D4, gain: 0.09, decay: 0.35 },
  },
  upgrade: { freq: NOTE.G4, gain: 0.06, decay: 0.2 },
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
    /** Jouée en plus quand l'appui engage une dépense. Mi♭3 → si♭2 : le si
     *  NATUREL est exactement la note que le mode exclut. */
    spendTone: { from: NOTE.Eb3, to: NOTE.Bb2, duration: 0.04, gain: 0.03 },
  },
} as const;
