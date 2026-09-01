import { describe, expect, it } from 'vitest';
import { MIX, MUSIC, NOTE, PHRYGIAN, REVEAL_HZ, SFX, noteHz } from './mix';

/** Écart, en cents, à la hauteur du mode la plus proche — toutes octaves
 *  confondues, puisqu'un degré reste un degré à n'importe quelle octave. */
function centsOffMode(hz: number): number {
  const cents = 1200 * Math.log2(hz / noteHz(0, 0));
  let best = Infinity;
  for (let octave = -2; octave <= 7; octave++) {
    for (const semitone of PHRYGIAN) {
      const dev = cents - (octave * 1200 + semitone * 100);
      if (Math.abs(dev) < Math.abs(best)) best = dev;
    }
  }
  return best;
}

/** Ce qu'on laisse passer. Un quart de ton vaut 50 cents, et les deux fautes que
 *  ce test a été écrit pour attraper étaient à 49 et 52 : la marge de 10 cents ne
 *  couvre que l'arrondi des ratios (la quarte juste de `chordRatios` tombe à
 *  2 cents de la quarte tempérée). */
const TOLERANCE_CENTS = 10;

type Pitch = readonly [string, number];

/**
 * Toutes les hauteurs FIXES du son — musique et bruitages ensemble, parce que
 * c'est ensemble qu'elles s'entendent. Ne sont volontairement pas de la liste :
 *
 * - les `burst()`, du bruit passé dans un filtre : `MUSIC.anvil.freq`,
 *   `SFX.equip`, `SFX.tap.freq`, `SFX.chestStep`, `SFX.chestShake`,
 *   `SFX.fuse.rise`, les grains de `SFX.reward`. Une coupure de filtre n'est pas
 *   une hauteur ;
 * - les coupures de filtre proprement dites (`MUSIC.tension.filterHz`,
 *   `MUSIC.drone.noiseFilterHz`, `MIX.whirrFreq*`, `MIX.subFreq*`,
 *   `MIX.hitClickHz`) ;
 * - le corps du choc, `MIX.hitBodyHz + MIX.hitBodySpan · p` : un continuum qui
 *   suit la puissance, jamais une note ;
 * - les partiels de timbre exprimés en ratio de leur fondamentale
 *   (`MIX.hitBodyPartials`, `SFX.pieceRevealed.overtoneRatio`) : ils sonnent AVEC
 *   elle, ils en sont la couleur et pas une seconde voix.
 */
const PITCHES: readonly Pitch[] = [
  // La table elle-même : un degré mal recopié y serait invisible autrement.
  ...Object.entries(NOTE).map(([name, hz]) => [`NOTE.${name}`, hz] as const),

  ['MIX.hitSubTo', MIX.hitSubTo],

  ['MUSIC.drone.note', MUSIC.drone.note],
  ['MUSIC.pulse.from', MUSIC.pulse.from],
  ['MUSIC.anvil.combNote', MUSIC.anvil.combNote],
  ['MUSIC.tension.note', MUSIC.tension.note],
  ...MUSIC.motif.notes.map((hz, i) => [`MUSIC.motif.notes[${i}]`, hz] as const),

  ['SFX.death.tone.to', SFX.death.tone.to],
  ['SFX.door.first.from', SFX.door.first.from],
  ['SFX.door.second.from', SFX.door.second.from],
  ['SFX.door.thud.from', SFX.door.thud.from],
  ['SFX.reward.floor.from', SFX.reward.floor.from],
  ['SFX.bossDown.body.freq', SFX.bossDown.body.freq],
  ...SFX.bossDown.chord.map((hz, i) => [`SFX.bossDown.chord[${i}]`, hz] as const),
  ['SFX.chestOpened.toneA.from', SFX.chestOpened.toneA.from],
  ['SFX.chestOpened.toneB.from', SFX.chestOpened.toneB.from],
  ['SFX.fuse.anvil.freq', SFX.fuse.anvil.freq],
  ['SFX.upgrade.freq', SFX.upgrade.freq],
  ['SFX.tap.spendTone.from', SFX.tap.spendTone.from],
  ['SFX.tap.spendTone.to', SFX.tap.spendTone.to],

  ...REVEAL_HZ.map((hz, i) => [`REVEAL_HZ[${i}]`, hz] as const),
  // Les douze notes que `chestDone` peut jouer : la triade posée sous la pièce la
  // plus rare du butin. C'est le seul endroit où une hauteur naît d'un produit.
  ...SFX.chestDone.chordRatios.flatMap((ratio, j) =>
    REVEAL_HZ.map((hz, i) => [`SFX.chestDone : REVEAL_HZ[${i}] × chordRatios[${j}]`, hz * ratio] as const),
  ),
];

/**
 * Les hauteurs délibérément hors du mode. Toutes sont des extrémités de
 * glissando ou des corps inharmoniques : ce qui s'entend d'un son qui glisse,
 * c'est le mouvement et l'arrivée, pas le point de départ.
 */
const EXEMPTED: readonly Pitch[] = [
  // Le corps de la mort est inharmonique (ratios de plaque), et la chute qui
  // l'accompagne, elle, atterrit sur le la1 : c'est elle qu'on entend.
  ['SFX.death.body.freq', SFX.death.body.freq],
  ['SFX.death.tone.from', SFX.death.tone.from],
  // Le coup sourd de la porte : 110 → 70 Hz en 220 ms. À l'arrivée il ne reste
  // qu'un poids, pas une hauteur.
  ['SFX.door.thud.to', SFX.door.thud.to],
  // Le départ du poids du choc : 120 → 55 Hz en 120 ms, et c'est le la1 d'arrivée
  // qui s'accorde avec la musique.
  ['MIX.hitSubFrom', MIX.hitSubFrom],
  // La queue de la grosse caisse : une peau frappée est un coup, pas une note.
  ['MUSIC.pulse.to', MUSIC.pulse.to],
];

describe('le mode — ré phrygien', () => {
  it('mesure bien un écart en cents', () => {
    // Sans ce garde, une mesure cassée rendrait le test suivant vert à vide.
    expect(centsOffMode(noteHz(0, 3))).toBeCloseTo(0, 6);
    expect(centsOffMode(noteHz(0, 3) * Math.pow(2, 0.3 / 12))).toBeCloseTo(30, 3);
    // Le mi et le si NATURELS sont exactement ce que le mode exclut.
    expect(Math.abs(centsOffMode(noteHz(4, 3)))).toBeCloseTo(100, 3);
    expect(Math.abs(centsOffMode(noteHz(11, 3)))).toBeCloseTo(100, 3);
  });

  it('tient sur toutes les hauteurs fixes du son, bruitages compris', () => {
    const hors = PITCHES
      .filter(([, hz]) => Math.abs(centsOffMode(hz)) > TOLERANCE_CENTS)
      .map(([name, hz]) => `${name} : ${hz.toFixed(2)} Hz, ${centsOffMode(hz).toFixed(1)} cents hors du mode`);
    expect(hors).toEqual([]);
  });

  it("n'exempte que des hauteurs réellement hors du mode", () => {
    // Une exemption devenue inutile masquerait la faute suivante au même endroit.
    const inutiles = EXEMPTED
      .filter(([, hz]) => Math.abs(centsOffMode(hz)) <= TOLERANCE_CENTS)
      .map(([name]) => name);
    expect(inutiles).toEqual([]);
  });

  it('place la fondamentale à ré4 trois octaves au-dessus de la racine', () => {
    expect(noteHz(0, 3)).toBeCloseTo(293.68, 1);
  });

  it('monte bien de la quinte pour le la du motif', () => {
    expect(noteHz(7, 3)).toBeCloseTo(440.03, 1);
  });
});
