import { MIX, REVEAL_HZ, SFX } from './mix';
import { admitHit, createGate } from './gate';
import { createHaptics, type Haptics } from './haptics';
import { createMusic } from './music';
import { loadSettings, saveSettings, type AudioSettings } from './settings';
import { burst, createBus, metalBody, tone, type Bus } from './synth';

export type TapKind = 'tap' | 'chest' | 'fuse' | 'upgrade';

export interface Audio {
  /** À appeler au premier geste, où qu'il tombe : les navigateurs interdisent de
   *  créer un contexte audio autrement. Idempotent. */
  start(): void;
  /** Le rotor ne souffle que pendant un combat : `null` le coupe. */
  setSpin(ratio: number | null): void;
  /** L'intensité de la musique, dérivée du contexte de jeu par `intensityFor`. */
  setIntensity(value: number): void;
  hit(power: number): void;
  death(): void;
  door(): void;
  reward(chests: number): void;
  bossDown(): void;
  chestShake(): void;
  chestStep(index: number): void;
  chestOpened(): void;
  pieceRevealed(tier: number): void;
  chestDone(bestTier: number): void;
  fuse(): void;
  upgrade(): void;
  equip(): void;
  tap(kind: TapKind): void;
  settings(): AudioSettings;
  setSetting(key: keyof AudioSettings, on: boolean): void;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Le palier de croisière du souffle à un spin donné : un plancher (le rotor ne
 *  s'éteint jamais tout à fait tant qu'il tourne) plus une part proportionnelle au
 *  spin. Il n'appartient qu'à `setSpin()` — le ducking passe par un nœud à part,
 *  pour que les deux ne se disputent pas le même `AudioParam`. */
const whirrTarget = (spin: number) => MIX.whirrGain * (MIX.whirrGainFloor + MIX.whirrGainSpan * spin);

function createAudio(): Audio {
  let bus: Bus | null = null;
  let whirrFilter: BiquadFilterNode | null = null;
  let whirrGain: GainNode | null = null;
  /** Nœud propre au ducking du rotor, en série après `whirrGain` — même partage que
   *  `duckNode` côté musique. Mesuré : quand les deux écrivaient sur le même gain,
   *  le `setSpin()` du tick suivait de quelques millisecondes la pose du duck et
   *  redémarrait la remontée à `t` avec 0,1 s de constante au lieu de `t + 0,15`
   *  avec 0,25 s — le rotor était déjà revenu à 86 % de sa croisière à la fin d'un
   *  palier censé le tenir à 35 %. */
  let whirrDuck: GainNode | null = null;
  let whirrSource: AudioBufferSourceNode | null = null;
  let sub: OscillatorNode | null = null;
  let subGain: GainNode | null = null;
  let spin = 0;
  let tapAlt = false;

  const gate = createGate();
  const music = createMusic();
  let settings = loadSettings(localStorage);
  const haptics: Haptics = createHaptics(
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? (pattern) => { navigator.vibrate(pattern); }
      : null,
    settings.haptics,
  );

  function live(): Bus | null {
    if (!bus) return null;
    if (bus.ctx.state === 'suspended') void bus.ctx.resume();
    return bus;
  }

  /** Le rotor s'efface sous un choc fort, puis revient. Un son tenu qui
   *  s'interrompt cesse d'être un son tenu : c'est ce qui le fait disparaître de
   *  la conscience sans le retirer de la scène. */
  function duck(power: number): void {
    if (power < MIX.duckPower) return;
    music.duck();
    if (!bus || !whirrDuck) return;
    const t = bus.ctx.currentTime;
    whirrDuck.gain.cancelScheduledValues(t);
    whirrDuck.gain.setValueAtTime(MIX.duckWhirr, t);
    whirrDuck.gain.setTargetAtTime(1, t + MIX.duckHoldS, MIX.duckReleaseS);
  }

  /** Onglet caché : suspendre le contexte sans arrêter le séquenceur laisserait
   *  son minuteur planifier des notes dans le vide, à rattraper toutes d'un coup
   *  au retour. Les deux se suspendent et reprennent ensemble. */
  function onVisibility(): void {
    if (!bus) return;
    if (document.hidden) {
      music.suspend();
      void bus.ctx.suspend();
    } else {
      void bus.ctx.resume();
      music.resume();
    }
  }

  return {
    start() {
      if (bus) {
        void bus.ctx.resume();
        return;
      }
      bus = createBus();
      bus.sfx.gain.value = settings.sfx ? MIX.sfxGain : 0;
      bus.music.gain.value = settings.music ? MIX.musicGain : 0;
      music.attach(bus);

      // Le rotor : bruit filtré (un souffle), jamais un oscillateur tonal — une
      // dent de scie tenue à 60-250 Hz est un bourdon de scie sauteuse, pas une
      // toupie (cf. `docs/ameliorations.md` § 3.1). À ne pas « simplifier » un
      // jour en oscillateur : l'erreur diagnostiquée là reviendrait avec.
      whirrFilter = bus.ctx.createBiquadFilter();
      whirrFilter.type = 'bandpass';
      whirrFilter.frequency.value = MIX.whirrFreqLow;
      whirrFilter.Q.value = MIX.whirrQ;
      whirrGain = bus.ctx.createGain();
      whirrGain.gain.value = 0;
      whirrDuck = bus.ctx.createGain();
      whirrSource = bus.ctx.createBufferSource();
      whirrSource.buffer = bus.noise;
      whirrSource.loop = true;
      whirrSource.connect(whirrFilter).connect(whirrGain).connect(whirrDuck).connect(bus.sfx);
      whirrSource.start();

      sub = bus.ctx.createOscillator();
      sub.frequency.value = MIX.subFreqLow;
      subGain = bus.ctx.createGain();
      subGain.gain.value = 0;
      sub.connect(subGain).connect(bus.sfx);
      sub.start();

      // Sans ça, la musique continue dans un onglet en arrière-plan — et le
      // séquenceur continue de tourner pour rien.
      document.addEventListener('visibilitychange', onVisibility);
    },

    setSpin(ratio) {
      const b = live();
      if (!b || !whirrFilter || !whirrGain || !sub || !subGain) return;
      const t = b.ctx.currentTime;
      if (ratio === null) {
        spin = 0;
        whirrGain.gain.setTargetAtTime(0, t, MIX.spinGainSmoothS);
        subGain.gain.setTargetAtTime(0, t, MIX.spinGainSmoothS);
        return;
      }
      spin = clamp01(ratio);
      whirrFilter.frequency.setTargetAtTime(
        MIX.whirrFreqLow + (MIX.whirrFreqHigh - MIX.whirrFreqLow) * spin, t, MIX.spinFreqSmoothS,
      );
      sub.frequency.setTargetAtTime(
        MIX.subFreqLow + (MIX.subFreqHigh - MIX.subFreqLow) * spin, t, MIX.spinFreqSmoothS,
      );
      // Le souffle s'efface avec le spin : une toupie qui meurt se tait.
      whirrGain.gain.setTargetAtTime(whirrTarget(spin), t, MIX.spinGainSmoothS);
      subGain.gain.setTargetAtTime(MIX.subGain * spin, t, MIX.spinGainSmoothS);
    },

    setIntensity(value) {
      music.setIntensity(value);
    },

    hit(power) {
      const p = clamp01(power);
      // La vibration est indépendante du son : elle a ses propres garde-fous, et
      // elle doit fonctionner même quand les bruitages sont coupés.
      haptics.hit(p, performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      if (!admitHit(gate, b.ctx.currentTime, p)) return;
      // Volontairement après le garde `settings.sfx` : le ducking fait de la
      // place à un son de choc. Si les bruitages sont coupés, ce son ne joue
      // pas — creuser la musique ouvrirait alors un trou que rien ne vient
      // remplir, et le joueur l'entendrait hoqueter sans raison. Couper les
      // bruitages demande le silence sur les impacts, pas une musique qui
      // tressaute à chaque contact.
      duck(p);
      // Le transitoire : l'attaque, ce qui fait « maintenant ».
      burst(b, b.sfx, {
        type: 'highpass',
        freq: MIX.hitClickHz,
        gain: MIX.hitClickGain + MIX.hitClickSpan * p,
        duration: MIX.hitClickS,
        rate: MIX.hitClickRateBase + Math.random() * MIX.hitClickRateSpan, // pas deux chocs identiques
      });
      // Le corps : c'est lui qui manquait. Plus le choc est fort, plus il est grave.
      const detune = 1 + (Math.random() * 2 - 1) * MIX.hitDetune;
      metalBody(b, b.sfx, {
        freq: (MIX.hitBodyHz + MIX.hitBodySpan * p) * detune,
        gain: MIX.hitBodyGain + MIX.hitBodyGainSpan * p,
        decay: MIX.hitBodyDecayS + MIX.hitBodyDecaySpan * p,
      });
      // Le poids : seuls les vrais coups le méritent.
      if (p > MIX.hitSubThreshold) {
        tone(b, b.sfx, {
          from: MIX.hitSubFrom, to: MIX.hitSubTo, duration: MIX.hitSubS, gain: MIX.hitSubGain * p,
        });
      }
    },

    death() {
      haptics.buzz('death', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      metalBody(b, b.sfx, SFX.death.body);
      tone(b, b.sfx, SFX.death.tone);
      burst(b, b.sfx, SFX.death.burst);
    },

    door() {
      const b = live();
      if (!b || !settings.sfx) return;
      // Deux notes brèves qui montent — une porte qui s'ouvre, pas une alarme.
      // Ré5 puis la5 : deux degrés de ré phrygien, donc deux notes qui
      // s'accordent avec la musique au lieu de lui rentrer dedans.
      tone(b, b.sfx, SFX.door.first);
      tone(b, b.sfx, { ...SFX.door.second, at: b.ctx.currentTime + SFX.door.secondDelayS });
      tone(b, b.sfx, SFX.door.thud);
    },

    reward(chests) {
      haptics.buzz('reward', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const r = SFX.reward;
      // Les pièces qui tombent dans la caisse : des grains de métal, hauteur
      // montante, espacés irrégulièrement — une cascade, pas un arpège.
      const grains = r.grainsBase + Math.min(r.grainsChestBonus, chests);
      for (let i = 0; i < grains; i++) {
        burst(b, b.sfx, {
          freq: r.grainFreqFrom + (r.grainFreqTo - r.grainFreqFrom) * (i / grains),
          q: r.grainQ,
          gain: r.grainGain,
          duration: r.grainDuration,
          at: b.ctx.currentTime + i * r.grainSpacingS + Math.random() * r.grainJitterS,
        });
      }
      // Le fond de la caisse.
      tone(b, b.sfx, {
        from: r.floor.from, duration: r.floor.duration, gain: r.floor.gain,
        at: b.ctx.currentTime + r.floor.delayS,
      });
    },

    bossDown() {
      haptics.buzz('bossDown', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const t = b.ctx.currentTime;
      const d = SFX.bossDown;
      metalBody(b, b.sfx, d.body);
      d.chord.forEach((hz, i) => {
        tone(b, b.sfx, { from: hz, duration: d.chordToneDuration, gain: d.chordToneGain, at: t + i * d.chordSpacingS });
      });
    },

    chestShake() {
      const b = live();
      if (!b || !settings.sfx) return;
      // Un grondement sourd tenu le temps de la secousse (600 ms côté écran).
      burst(b, b.sfx, SFX.chestShake);
    },

    chestStep(index) {
      const b = live();
      if (!b || !settings.sfx) return;
      const s = SFX.chestStep;
      burst(b, b.sfx, {
        freq: s.freqBase + s.freqBase * s.freqIndexStep * index, q: s.q, gain: s.gain, duration: s.duration,
      });
    },

    chestOpened() {
      haptics.buzz('chestOpened', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      burst(b, b.sfx, SFX.chestOpened.burst);
      tone(b, b.sfx, SFX.chestOpened.toneA);
      tone(b, b.sfx, SFX.chestOpened.toneB);
    },

    pieceRevealed(tier) {
      const b = live();
      if (!b || !settings.sfx) return;
      const p = SFX.pieceRevealed;
      const hz = REVEAL_HZ[Math.max(0, Math.min(REVEAL_HZ.length - 1, tier))];
      tone(b, b.sfx, { from: hz, duration: p.duration, gain: p.gain, type: 'triangle' });
      tone(b, b.sfx, { from: hz * p.overtoneRatio, duration: p.overtoneDuration, gain: p.overtoneGain });
    },

    chestDone(bestTier) {
      haptics.buzz('chestDone', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const c = SFX.chestDone;
      const top = REVEAL_HZ[Math.max(0, Math.min(REVEAL_HZ.length - 1, bestTier))];
      // Décalé : la dernière pièce révélée sonne au même instant, et les deux sons
      // empilés s'annulaient au lieu de se succéder.
      const t = b.ctx.currentTime + c.delayS;
      c.chordRatios.forEach((ratio, i) => {
        tone(b, b.sfx, { from: top * ratio, duration: c.toneDuration, gain: c.toneGain, at: t + i * c.spacingS, type: 'triangle' });
      });
    },

    fuse() {
      haptics.buzz('fuse', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const t = b.ctx.currentTime;
      // La montée, puis l'enclume au bout : on entend l'effort avant le résultat.
      burst(b, b.sfx, SFX.fuse.rise);
      metalBody(b, b.sfx, { ...SFX.fuse.anvil, at: t + SFX.fuse.rise.duration });
    },

    upgrade() {
      const b = live();
      if (!b || !settings.sfx) return;
      metalBody(b, b.sfx, SFX.upgrade);
    },

    equip() {
      haptics.buzz('equip', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const t = b.ctx.currentTime;
      burst(b, b.sfx, SFX.equip.first);
      burst(b, b.sfx, { ...SFX.equip.second, at: t + SFX.equip.secondDelayS });
    },

    tap(kind) {
      haptics.buzz('tap', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const s = SFX.tap;
      // Deux variantes alternées : deux clics rigoureusement identiques à la
      // suite s'entendent comme un défaut, pas comme un retour.
      tapAlt = !tapAlt;
      burst(b, b.sfx, {
        freq: tapAlt ? s.freq : s.freq * s.freqAltRatio, q: s.q, gain: s.gain, duration: s.duration,
      });
      if (kind !== 'tap') {
        // L'appui qui engage une dépense sonne plus lourd que celui qui navigue.
        tone(b, b.sfx, s.spendTone);
      }
    },

    settings() {
      return { ...settings };
    },

    setSetting(key, on) {
      settings = { ...settings, [key]: on };
      saveSettings(localStorage, settings);
      if (key === 'haptics') haptics.setEnabled(on);
      if (!bus) return;
      const t = bus.ctx.currentTime;
      if (key === 'sfx') bus.sfx.gain.setTargetAtTime(on ? MIX.sfxGain : 0, t, MIX.settingFadeS);
      if (key === 'music') bus.music.gain.setTargetAtTime(on ? MIX.musicGain : 0, t, MIX.settingFadeS);
    },
  };
}

/**
 * Singleton de module, sur le modèle de `src/i18n/`. Cinq composants ont besoin du
 * son, dont deux à deux niveaux de profondeur : enfiler une prop `audio` à travers
 * `ForgeScreen` → `InventoryPanel` → `PieceSheet` coûterait plus que ça ne prouve.
 * Le contexte WebAudio, lui, ne naît qu'au premier geste — voir `start()`.
 */
export const audio: Audio = createAudio();
