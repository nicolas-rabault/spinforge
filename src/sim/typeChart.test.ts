import { describe, expect, it } from 'vitest';
import { typeMult } from './typeChart';
import type { TopType } from '../content/toupies';

const TYPES: TopType[] = ['attaque', 'endurance', 'defense', 'equilibre'];

describe('typeMult', () => {
  it('applique +25 % dans le sens du triangle', () => {
    expect(typeMult('attaque', 'endurance')).toBeCloseTo(1.25);
    expect(typeMult('endurance', 'defense')).toBeCloseTo(1.25);
    expect(typeMult('defense', 'attaque')).toBeCloseTo(1.25);
  });

  it('ne donne rien dans le sens inverse — le dominé n’est pas puni deux fois', () => {
    expect(typeMult('endurance', 'attaque')).toBe(1);
    expect(typeMult('defense', 'endurance')).toBe(1);
    expect(typeMult('attaque', 'defense')).toBe(1);
  });

  it('ne donne rien entre types identiques', () => {
    expect(typeMult('attaque', 'attaque')).toBe(1);
    expect(typeMult('endurance', 'endurance')).toBe(1);
    expect(typeMult('defense', 'defense')).toBe(1);
    expect(typeMult('equilibre', 'equilibre')).toBeCloseTo(1.1);
  });

  it('donne +10 % à Équilibre contre tout le monde', () => {
    for (const def of TYPES) expect(typeMult('equilibre', def)).toBeCloseTo(1.1);
  });

  // C’est l’atout réel d’Équilibre, et il est passif : hors du triangle, il
  // n’est jamais le type dominé de personne.
  it('n’expose jamais Équilibre au +25 %', () => {
    for (const att of TYPES) {
      if (att === 'equilibre') continue;
      expect(typeMult(att, 'equilibre')).toBe(1);
    }
  });

  it('couvre les seize cases sans jamais sortir de [1 ; 1,25]', () => {
    for (const att of TYPES) {
      for (const def of TYPES) {
        const m = typeMult(att, def);
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(1.25);
      }
    }
  });
});
