import { describe, expect, it } from 'vitest';
import { playerStats, salleReward, tryUpgrade, upgradeCost } from './economy';
import { createInitialMeta } from './meta';
import { STARTER_TOUPIE } from '../content/toupies';
import { ECON, PLAYER_BASE } from './config';
import { rarityMult } from './piece';

describe('courbes', () => {
  it('coût = 100 × 1,08^niveau', () => {
    expect(upgradeCost(0)).toBe(100);
    expect(upgradeCost(10)).toBeCloseTo(215.89, 1);
  });

  it('revenu = rewardBase × rewardGrowth^(salle−1), boss × bossRewardMult', () => {
    expect(salleReward(1, false).credits).toBeCloseTo(ECON.rewardBase, 5);
    expect(salleReward(5, false).credits).toBeCloseTo(ECON.rewardBase * Math.pow(ECON.rewardGrowth, 4), 5);
    expect(salleReward(10, true).credits).toBeCloseTo(
      ECON.rewardBase * Math.pow(ECON.rewardGrowth, 9) * ECON.bossRewardMult,
      5,
    );
  });

  it('seul le boss donne des gemmes', () => {
    expect(salleReward(9, false).gems).toBe(0);
    expect(salleReward(10, true).gems).toBe(ECON.bossGems);
  });
});

describe('pièces', () => {
  it('équipement de départ = stats de base', () => {
    const s = playerStats(createInitialMeta(1), STARTER_TOUPIE);
    expect(s.attack).toBeCloseTo(PLAYER_BASE.attack, 10);
    expect(s.spinDecay).toBeCloseTo(PLAYER_BASE.spinDecay, 10);
  });

  it('la Lame monte l’attaque de 10 % par niveau', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.level = 5;
    expect(playerStats(meta, STARTER_TOUPIE).attack).toBeCloseTo(PLAYER_BASE.attack * 1.5, 5);
  });

  it('le rang multiplie par-dessus le niveau', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.level = 5;
    meta.equipped.lame.rank = 4;
    expect(playerStats(meta, STARTER_TOUPIE).attack).toBeCloseTo(PLAYER_BASE.attack * 1.5 * rarityMult(4), 5);
  });
});

describe('tryUpgrade', () => {
  it('débite et incrémente le niveau de la pièce équipée', () => {
    const meta = createInitialMeta(1);
    meta.credits = 100;
    expect(tryUpgrade(meta, 'lame')).toBe(true);
    expect(meta.credits).toBe(0);
    expect(meta.equipped.lame.level).toBe(1);
    expect(playerStats(meta, STARTER_TOUPIE).attack).toBeCloseTo(PLAYER_BASE.attack * 1.1, 5);
  });

  it('refuse si crédits insuffisants', () => {
    const meta = createInitialMeta(1);
    meta.credits = 50;
    expect(tryUpgrade(meta, 'lame')).toBe(false);
    expect(meta.equipped.lame.level).toBe(0);
    expect(meta.credits).toBe(50);
  });
});
