import { describe, expect, it } from 'vitest';
import { playerStats, salleReward, tryUpgrade, upgradeCost } from './economy';
import { ECON, PLAYER_BASE } from './config';
import type { SimState, Top } from './types';

function fakeState(credits: number): SimState {
  const player: Top = {
    id: 'player', isPlayer: true, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: PLAYER_BASE.radius,
    spin: PLAYER_BASE.spinMax, spinMax: PLAYER_BASE.spinMax, spinDecay: PLAYER_BASE.spinDecay,
    attack: PLAYER_BASE.attack, defense: PLAYER_BASE.defense,
    maxSpeed: PLAYER_BASE.maxSpeed, accel: PLAYER_BASE.accel,
  };
  return {
    tick: 0, rngState: 1, chapter: 1, salle: 1, credits,
    pieces: { noyau: 0, lame: 0, disque: 0, pointe: 0 },
    player, bots: [], phase: 'fighting', chapterValidated: false,
  };
}

describe('courbes', () => {
  it('coût = 100 × 1,08^niveau', () => {
    expect(upgradeCost(0)).toBe(100);
    expect(upgradeCost(10)).toBeCloseTo(215.89, 1);
  });

  it('revenu = rewardBase × rewardGrowth^(salle−1), boss × bossRewardMult', () => {
    expect(salleReward(1, false)).toBeCloseTo(ECON.rewardBase, 5);
    expect(salleReward(5, false)).toBeCloseTo(ECON.rewardBase * Math.pow(ECON.rewardGrowth, 4), 5);
    expect(salleReward(10, true)).toBeCloseTo(
      ECON.rewardBase * Math.pow(ECON.rewardGrowth, 9) * ECON.bossRewardMult,
      5,
    );
  });
});

describe('pièces', () => {
  it('la Lame monte l’attaque de 10 % par niveau', () => {
    expect(playerStats({ noyau: 0, lame: 5, disque: 0, pointe: 0 }).attack).toBeCloseTo(PLAYER_BASE.attack * 1.5, 5);
  });

  it('niveau 0 = stats de base', () => {
    const s = playerStats({ noyau: 0, lame: 0, disque: 0, pointe: 0 });
    expect(s.attack).toBe(PLAYER_BASE.attack);
    expect(s.spinDecay).toBe(PLAYER_BASE.spinDecay);
  });
});

describe('tryUpgrade', () => {
  it('débite, incrémente le niveau et applique la stat au joueur', () => {
    const state = fakeState(100);
    expect(tryUpgrade(state, 'lame')).toBe(true);
    expect(state.credits).toBe(0);
    expect(state.pieces.lame).toBe(1);
    expect(state.player.attack).toBeCloseTo(PLAYER_BASE.attack * 1.1, 5);
  });

  it('refuse si crédits insuffisants', () => {
    const state = fakeState(50);
    expect(tryUpgrade(state, 'lame')).toBe(false);
    expect(state.pieces.lame).toBe(0);
    expect(state.credits).toBe(50);
  });
});
