import { describe, expect, it } from 'vitest';
import { formatCredits } from './format';

describe('formatCredits', () => {
  it('affiche brut sous 1000', () => {
    expect(formatCredits(950)).toBe('950');
    expect(formatCredits(999.9)).toBe('999');
  });

  it('milliers en « 12,4 k »', () => {
    expect(formatCredits(12400)).toBe('12,4 k');
  });

  it('millions en « 2,50 M »', () => {
    expect(formatCredits(2500000)).toBe('2,50 M');
  });

  it('bascule en M plutôt que d’afficher « 1000,0 k »', () => {
    expect(formatCredits(999999)).toBe('1,00 M');
    expect(formatCredits(999949)).toBe('999,9 k');
  });
});
