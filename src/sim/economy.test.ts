import { describe, expect, it } from 'vitest';
import { playerStats, salleReward, tryUpgrade, upgradeCost } from './economy';
import { createInitialMeta } from './meta';
import { ECON, LOOT, PLAYER_BASE } from './config';
import { rarityMult } from './piece';

describe('courbes', () => {
  it('coût = 100 × 1,08^niveau', () => {
    expect(upgradeCost(0)).toBe(100);
    expect(upgradeCost(10)).toBeCloseTo(215.89, 1);
  });

  it('revenu = rewardBase × rewardGrowth^(salle−1), boss × bossRewardMult', () => {
    expect(salleReward(1, false, 1).reward.credits).toBeCloseTo(ECON.rewardBase, 5);
    expect(salleReward(5, false, 1).reward.credits).toBeCloseTo(
      ECON.rewardBase * Math.pow(ECON.rewardGrowth, 4),
      5,
    );
    expect(salleReward(10, true, 1).reward.credits).toBeCloseTo(
      ECON.rewardBase * Math.pow(ECON.rewardGrowth, 9) * ECON.bossRewardMult,
      5,
    );
  });

  it('seul le boss donne des gemmes', () => {
    expect(salleReward(9, false, 1).reward.gems).toBe(0);
    expect(salleReward(10, true, 1).reward.gems).toBe(ECON.bossGems);
  });
});

describe('salleReward — butin', () => {
  it('donne toujours le coffre de base de la salle', () => {
    const { reward } = salleReward(1, false, 1);
    expect(reward.chests[0]).toBe(LOOT.bySalle.chest);
  });

  it('n’ajoute jamais d’extra avant la salle prévue', () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (let salle = 1; salle < LOOT.bySalle.fromSalle; salle++) {
        expect(salleReward(salle, false, seed).reward.chests).toHaveLength(1);
      }
    }
  });

  it('ajoute parfois un extra à partir de la salle prévue', () => {
    const withExtra = Array.from({ length: 300 }, (_, i) =>
      salleReward(LOOT.bySalle.fromSalle, false, i + 1).reward.chests,
    ).filter((c) => c.length === 2);
    expect(withExtra.length).toBeGreaterThan(0);
    expect(withExtra[0][1]).toBe(LOOT.bySalle.extra);
  });

  it('le boss donne toujours son coffre garanti', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(salleReward(10, true, seed).reward.chests[0]).toBe(LOOT.boss.chest);
    }
  });

  it('consomme exactement un tirage, extra ou non', () => {
    // Un flux qui n'avancerait pas de la même façon selon la salle rendrait
    // toute mesure de déterminisme illisible.
    const a = salleReward(1, false, 999);
    const b = salleReward(9, false, 999);
    expect(a.rngState).toBe(b.rngState);
    expect(a.rngState).not.toBe(999);
  });
});

describe('pièces', () => {
  it('équipement de départ = stats de base', () => {
    const s = playerStats(createInitialMeta(1));
    expect(s.attack).toBeCloseTo(PLAYER_BASE.attack, 10);
    expect(s.spinDecay).toBeCloseTo(PLAYER_BASE.spinDecay, 10);
  });

  it('la Lame monte l’attaque de 10 % par niveau', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.level = 5;
    expect(playerStats(meta).attack).toBeCloseTo(PLAYER_BASE.attack * 1.5, 5);
  });

  it('le rang multiplie par-dessus le niveau', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.level = 5;
    meta.equipped.lame.rank = 4;
    expect(playerStats(meta).attack).toBeCloseTo(PLAYER_BASE.attack * 1.5 * rarityMult(4), 5);
  });
});

describe('tryUpgrade', () => {
  it('débite et incrémente le niveau de la pièce équipée', () => {
    const meta = createInitialMeta(1);
    meta.credits = 100;
    expect(tryUpgrade(meta, 'lame')).toBe(true);
    expect(meta.credits).toBe(0);
    expect(meta.equipped.lame.level).toBe(1);
    expect(playerStats(meta).attack).toBeCloseTo(PLAYER_BASE.attack * 1.1, 5);
  });

  it('refuse si crédits insuffisants', () => {
    const meta = createInitialMeta(1);
    meta.credits = 50;
    expect(tryUpgrade(meta, 'lame')).toBe(false);
    expect(meta.equipped.lame.level).toBe(0);
    expect(meta.credits).toBe(50);
  });
});
