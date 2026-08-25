import { describe, expect, it } from 'vitest';
import { NEUTRAL_TALENTS, resolveTalents, talentsOf } from './talents';
import { createInitialMeta } from './meta';
import { TALENTS, FRICTION, HEAL_BETWEEN_SALLES } from './config';

describe('talentsOf', () => {
  it('ne donne rien en dessous du premier palier nommé', () => {
    expect(talentsOf('lame', 1)).toEqual([]);
    expect(talentsOf('lame', 3)).toEqual([]);
  });

  it('donne le talent d’Excellent au rang 4', () => {
    expect(talentsOf('lame', 4)).toEqual(['estoc']);
    expect(talentsOf('disque', 4)).toEqual(['ancrage']);
  });

  it('est cumulatif : une Légende porte les trois de son emplacement', () => {
    expect(talentsOf('lame', 11)).toEqual(['estoc', 'riposte', 'percee']);
    expect(talentsOf('noyau', 11)).toEqual(['reserve', 'secondSouffle', 'coeurGyre']);
  });

  it('ne donne rien de plus au-delà de Légende', () => {
    expect(talentsOf('pointe', 40)).toEqual(talentsOf('pointe', 11));
  });

  it('ne donne pas le talent d’un autre emplacement', () => {
    expect(talentsOf('disque', 11)).not.toContain('estoc');
  });
});

describe('resolveTalents', () => {
  it('rend les valeurs neutres sur l’équipement de départ', () => {
    expect(resolveTalents(createInitialMeta(1))).toEqual(NEUTRAL_TALENTS);
  });

  it('applique Estoc dès que la Lame est Excellente', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.rank = 4;
    const mods = resolveTalents(meta);
    expect(mods.estocThreshold).toBe(TALENTS.estoc.speedThreshold);
    expect(mods.estocBonus).toBe(TALENTS.estoc.damageBonus);
    expect(mods.riposte).toBe(0);
  });

  it('cumule les talents de plusieurs emplacements', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.rank = 11;
    meta.equipped.disque.rank = 11;
    const mods = resolveTalents(meta);
    expect(mods.defenseIgnore).toBe(TALENTS.percee.defenseIgnore);
    expect(mods.mass).toBe(TALENTS.masse.mass);
    expect(mods.impulseTaken).toBe(TALENTS.ancrage.impulseTaken);
  });

  it('laisse leurs valeurs neutres aux champs des emplacements non montés', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.rank = 11;
    const mods = resolveTalents(meta);
    expect(mods.friction).toBe(FRICTION);
    expect(mods.spinDecayMult).toBe(1);
    expect(mods.healBetweenSalles).toBe(HEAL_BETWEEN_SALLES);
    expect(mods.secondSouffle).toBe(0);
  });
});
