import { MIX } from './mix';
import { admitHit, createGate } from './gate';
import { createHaptics, type Haptics } from './haptics';
import { loadSettings, saveSettings, type AudioSettings } from './settings';
import { burst, createBus, metalBody, tone, type Bus } from './synth';

export type TapKind = 'tap' | 'chest' | 'fuse' | 'upgrade';

export interface Audio {
  /** À appeler au premier geste, où qu'il tombe : les navigateurs interdisent de
   *  créer un contexte audio autrement. Idempotent. */
  start(): void;
  /** Le rotor ne souffle que pendant un combat : `null` le coupe. */
  setSpin(ratio: number | null): void;
  hit(power: number): void;
  death(): void;
  door(): void;
  settings(): AudioSettings;
  setSetting(key: keyof AudioSettings, on: boolean): void;
  destroy(): void;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function createAudio(): Audio {
  let bus: Bus | null = null;
  let whirrFilter: BiquadFilterNode | null = null;
  let whirrGain: GainNode | null = null;
  let whirrSource: AudioBufferSourceNode | null = null;
  let sub: OscillatorNode | null = null;
  let subGain: GainNode | null = null;
  let spin = 0;

  const gate = createGate();
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
    if (!bus || !whirrGain || power < MIX.duckPower) return;
    const t = bus.ctx.currentTime;
    const target = MIX.whirrGain * (0.25 + 0.75 * spin);
    whirrGain.gain.cancelScheduledValues(t);
    whirrGain.gain.setValueAtTime(target * MIX.duckWhirr, t);
    whirrGain.gain.setTargetAtTime(target, t + MIX.duckHoldS, MIX.duckReleaseS);
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

      whirrFilter = bus.ctx.createBiquadFilter();
      whirrFilter.type = 'bandpass';
      whirrFilter.frequency.value = MIX.whirrFreqLow;
      whirrFilter.Q.value = 1.1;
      whirrGain = bus.ctx.createGain();
      whirrGain.gain.value = 0;
      whirrSource = bus.ctx.createBufferSource();
      whirrSource.buffer = bus.noise;
      whirrSource.loop = true;
      whirrSource.connect(whirrFilter).connect(whirrGain).connect(bus.sfx);
      whirrSource.start();

      sub = bus.ctx.createOscillator();
      sub.frequency.value = MIX.subFreqLow;
      subGain = bus.ctx.createGain();
      subGain.gain.value = 0;
      sub.connect(subGain).connect(bus.sfx);
      sub.start();
    },

    setSpin(ratio) {
      const b = live();
      if (!b || !whirrFilter || !whirrGain || !sub || !subGain) return;
      const t = b.ctx.currentTime;
      if (ratio === null) {
        spin = 0;
        whirrGain.gain.setTargetAtTime(0, t, 0.1);
        subGain.gain.setTargetAtTime(0, t, 0.1);
        return;
      }
      spin = clamp01(ratio);
      whirrFilter.frequency.setTargetAtTime(
        MIX.whirrFreqLow + (MIX.whirrFreqHigh - MIX.whirrFreqLow) * spin, t, 0.12,
      );
      sub.frequency.setTargetAtTime(MIX.subFreqLow + (MIX.subFreqHigh - MIX.subFreqLow) * spin, t, 0.12);
      whirrGain.gain.setTargetAtTime(MIX.whirrGain * (0.25 + 0.75 * spin), t, 0.1);
      subGain.gain.setTargetAtTime(MIX.subGain * spin, t, 0.1);
    },

    hit(power) {
      const p = clamp01(power);
      // La vibration est indépendante du son : elle a ses propres garde-fous, et
      // elle doit fonctionner même quand les bruitages sont coupés.
      haptics.hit(p, performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      if (!admitHit(gate, b.ctx.currentTime, p)) return;
      duck(p);
      // Le transitoire : l'attaque, ce qui fait « maintenant ».
      burst(b, b.sfx, {
        type: 'highpass',
        freq: MIX.hitClickHz,
        gain: MIX.hitClickGain + MIX.hitClickSpan * p,
        duration: MIX.hitClickS,
        rate: 0.7 + Math.random() * 0.6,
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
      metalBody(b, b.sfx, { freq: 190, gain: 0.07, decay: 0.55 });
      tone(b, b.sfx, { from: 190, to: 55, duration: 0.55, gain: 0.06 });
      burst(b, b.sfx, { freq: 520, q: 0.9, gain: 0.05, duration: 0.4 });
    },

    door() {
      const b = live();
      if (!b || !settings.sfx) return;
      // Ré5 puis la5 : deux degrés de ré phrygien, donc deux notes qui
      // s'accordent avec la musique au lieu de lui rentrer dedans.
      tone(b, b.sfx, { from: 587.33, duration: 0.11, gain: 0.045 });
      tone(b, b.sfx, { from: 880, duration: 0.16, gain: 0.04, at: b.ctx.currentTime + 0.09 });
      tone(b, b.sfx, { from: 110, to: 70, duration: 0.22, gain: 0.05 });
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
      if (key === 'sfx') bus.sfx.gain.setTargetAtTime(on ? MIX.sfxGain : 0, t, 0.03);
      if (key === 'music') bus.music.gain.setTargetAtTime(on ? MIX.musicGain : 0, t, 0.03);
    },

    destroy() {
      whirrSource?.stop();
      sub?.stop();
      void bus?.ctx.close();
      bus = null;
      whirrFilter = null;
      whirrGain = null;
      whirrSource = null;
      sub = null;
      subGain = null;
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
