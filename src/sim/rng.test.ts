import { describe, expect, it } from 'vitest';
import { nextRandom } from './rng';

describe('nextRandom', () => {
  it('est déterministe pour un même état', () => {
    expect(nextRandom(42)).toEqual(nextRandom(42));
  });

  it('produit des séquences différentes selon la graine', () => {
    expect(nextRandom(42).value).not.toBe(nextRandom(7).value);
  });

  it('reste dans [0, 1) sur 1000 tirages chaînés', () => {
    let s = 1;
    for (let i = 0; i < 1000; i++) {
      const r = nextRandom(s);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      s = r.state;
    }
  });
});
