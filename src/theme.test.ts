import { describe, expect, it } from 'vitest';
import { PALETTE, hex, spinTint } from './theme';

describe('hex', () => {
  it('formate un entier de couleur en notation CSS', () => {
    expect(hex(0x80e8ff)).toBe('#80e8ff');
    expect(hex(0x000000)).toBe('#000000');
    expect(hex(0x0b0e13)).toBe('#0b0e13');
  });
});

describe('spinTint', () => {
  it('rend la couleur de camp intacte à plein régime', () => {
    expect(spinTint('player', 1)).toBe(PALETTE.player);
    expect(spinTint('bot', 1)).toBe(PALETTE.bot);
    expect(spinTint('boss', 1)).toBe(PALETTE.boss);
  });

  it('garde 18 % de l’incandescence à spin nul', () => {
    const c = spinTint('player', 0);
    expect((c >> 16) & 0xff).toBe(Math.round(0x80 * 0.18));
    expect((c >> 8) & 0xff).toBe(Math.round(0xe8 * 0.18));
    expect(c & 0xff).toBe(Math.round(0xff * 0.18));
  });

  it('ne fait jamais tourner la teinte : les canaux gardent leur ordre', () => {
    for (const ratio of [0, 0.05, 0.25, 0.5, 0.9, 1]) {
      const c = spinTint('bot', ratio);
      const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
      expect(r).toBeGreaterThanOrEqual(g);
      expect(g).toBeGreaterThanOrEqual(b);
    }
  });

  it('est monotone croissante en ratio', () => {
    const lum = (c: number) => ((c >> 16) & 0xff) + ((c >> 8) & 0xff) + (c & 0xff);
    let prev = -1;
    for (const ratio of [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1]) {
      const l = lum(spinTint('player', ratio));
      expect(l).toBeGreaterThan(prev);
      prev = l;
    }
  });

  it('borne les ratios hors [0, 1]', () => {
    expect(spinTint('player', -3)).toBe(spinTint('player', 0));
    expect(spinTint('player', 42)).toBe(spinTint('player', 1));
  });
});
