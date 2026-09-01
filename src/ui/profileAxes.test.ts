import { describe, expect, it } from 'vitest';
import { HIGHER_IS_BETTER, PROFILE_AXES } from '../sim/profile';
import { isGain } from './profileAxes';

describe('HIGHER_IS_BETTER', () => {
  it('couvre les sept axes, une seule fois chacun', () => {
    expect(Object.keys(HIGHER_IS_BETTER).sort()).toEqual([...PROFILE_AXES].sort());
  });

  // `spinDecay` est une perte de spin par seconde : descendre est le gain.
  // C'est le seul axe qui va dans ce sens, et le piège que la table existe
  // pour n'avoir à corriger qu'à un endroit.
  it('inverse spinDecay et lui seul', () => {
    expect(HIGHER_IS_BETTER.spinDecay).toBe(false);
    for (const axis of PROFILE_AXES) {
      if (axis !== 'spinDecay') expect(HIGHER_IS_BETTER[axis]).toBe(true);
    }
  });
});

describe('isGain', () => {
  it('lit le sens dans HIGHER_IS_BETTER', () => {
    expect(isGain('attack', 1.1)).toBe(true);
    expect(isGain('attack', 0.9)).toBe(false);
    expect(isGain('spinDecay', 0.9)).toBe(true);
    expect(isGain('spinDecay', 1.3)).toBe(false);
  });

  // Un multiplicateur neutre ne gagne rien, dans les deux sens.
  it('ne prend jamais 1 pour un gain', () => {
    for (const axis of PROFILE_AXES) expect(isGain(axis, 1)).toBe(false);
  });
});
