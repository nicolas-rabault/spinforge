import { MIX } from './mix';

export interface GateState {
  lastAt: number;
  lastPower: number;
}

export function createGate(): GateState {
  return { lastAt: -Infinity, lastPower: 0 };
}

/**
 * Décide si un choc mérite son son, et note son passage.
 *
 * La garde de 140 ms est mesurée (cf. `docs/ameliorations.md` § 3.2), mais elle est
 * aveugle : un effleurement peut avaler le coup décisif arrivé 50 ms plus tard. Un
 * choc nettement plus fort casse donc la garde — jamais l'inverse, et jamais sous
 * le plancher de 40 ms, où deux sons se superposeraient sur la même image.
 *
 * Mute l'état : à n'appeler qu'une fois par choc.
 */
export function admitHit(state: GateState, now: number, power: number): boolean {
  const since = now - state.lastAt;
  const admitted =
    since >= MIX.hitGapS ||
    (power >= state.lastPower + MIX.hitPriorityStep && since >= MIX.hitFloorS);
  if (admitted) {
    state.lastAt = now;
    state.lastPower = power;
  }
  return admitted;
}
