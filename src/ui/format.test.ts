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
});
