import { describe, expect, it } from 'vitest';
import { decayPerTick, decaySpin, drainPerTick, resolveCollision } from './combat';
import { CHARGE_BONUS, DAMAGE_K, TALENTS, TICK_S } from './config';
import { NEUTRAL_ZONE, type ZoneMods } from './terrain';
import { NEUTRAL_TALENTS } from './talents';
import type { Top } from './types';
import type { TopType } from '../content/toupies';

function top(over: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: 12, spin: 1000, spinMax: 1000, spinDecay: 10,
    attack: 10, defense: 10, maxSpeed: 240, accel: 900,
    talents: NEUTRAL_TALENTS, decayPauseTicks: 0,
    type: 'attaque', mass: 1,
    ...over,
  };
}

describe('decaySpin', () => {
  it('décroît de spinDecay × TICK_S', () => {
    const t = top({ spinDecay: 20 });
    decaySpin(t, NEUTRAL_ZONE);
    expect(t.spin).toBeCloseTo(1000 - 20 * TICK_S, 5);
  });
});

describe('decayPerTick', () => {
  it('vaut 0 pendant une suspension de décroissance (Relance)', () => {
    // decaySpin teste déjà decayPauseTicks avant d'appeler decayPerTick, mais
    // snapshot.ts (rendu) l'appelle désormais directement pour prédire le
    // tick à venir : lui aussi doit voir la pause.
    const t = top({ decayPauseTicks: 3 });
    expect(decayPerTick(t)).toBe(0);
  });
});

describe('decaySpin — zones', () => {
  it('ajoute la perte de zone à la décroissance naturelle', () => {
    const zone: ZoneMods = { ...NEUTRAL_ZONE, spinDrain: 50 };
    const t = top({ spinDecay: 20 });
    decaySpin(t, zone);
    expect(t.spin).toBeCloseTo(1000 - (20 + 50) * TICK_S, 5);
  });

  it('Relance suspend la décroissance naturelle, pas les pointes', () => {
    // Les pointes sont des dégâts, pas de l'endurance : aucun talent d'endurance
    // ne doit en protéger.
    const zone: ZoneMods = { ...NEUTRAL_ZONE, spinDrain: 50 };
    const t = top({ spinDecay: 20, decayPauseTicks: 3 });
    decaySpin(t, zone);
    expect(t.spin).toBeCloseTo(1000 - 50 * TICK_S, 5);
  });

  it('ne reprend la décroissance qu’au tick qui suit la fin de la pause', () => {
    // La valeur doit être lue AVANT le décrément : lue après, le dernier tick de
    // pause reprendrait la décroissance un tick trop tôt.
    const t = top({ spinDecay: 20, decayPauseTicks: 1 });
    decaySpin(t, NEUTRAL_ZONE);
    expect(t.spin).toBe(1000);
    expect(t.decayPauseTicks).toBe(0);
    decaySpin(t, NEUTRAL_ZONE);
    expect(t.spin).toBeCloseTo(1000 - 20 * TICK_S, 5);
  });
});

describe('drainPerTick', () => {
  it('somme décroissance naturelle et perte de zone', () => {
    const zone: ZoneMods = { ...NEUTRAL_ZONE, spinDrain: 50 };
    expect(drainPerTick(top({ spinDecay: 20 }), zone)).toBeCloseTo(70, 10);
  });

  it('ne compte que la zone pendant une suspension', () => {
    const zone: ZoneMods = { ...NEUTRAL_ZONE, spinDrain: 50 };
    expect(drainPerTick(top({ spinDecay: 20, decayPauseTicks: 3 }), zone)).toBeCloseTo(50, 10);
  });
});

describe('resolveCollision', () => {
  it('ne fait rien sans chevauchement', () => {
    const a = top();
    const b = top({ pos: { x: 100, y: 0 } });
    resolveCollision(a, b);
    expect(a.spin).toBe(1000);
    expect(b.spin).toBe(1000);
  });

  it('sépare, fait rebondir et échange des dégâts — l’attaquant fort gagne l’échange', () => {
    const a = top({ id: 'a', vel: { x: 100, y: 0 }, attack: 30, defense: 10 });
    const b = top({ id: 'b', pos: { x: 20, y: 0 }, attack: 18, defense: 6 });
    resolveCollision(a, b);
    const dist = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
    expect(dist).toBeGreaterThanOrEqual(24 - 1e-9);
    expect(a.spin).toBeLessThan(1000);
    expect(b.spin).toBeLessThan(1000);
    expect(b.spin).toBeLessThan(a.spin); // 30/(30+6) > 18/(18+10)
    expect(b.vel.x).toBeGreaterThan(0); // b est poussé
  });

  it('celui qui fonce inflige plus et encaisse moins que l’immobile', () => {
    // Mêmes stats des deux côtés : seul le pilotage sépare les deux issues.
    const fonceur = top({ id: 'a', vel: { x: 100, y: 0 } });
    const immobile = top({ id: 'b', pos: { x: 20, y: 0 } });
    resolveCollision(fonceur, immobile);
    expect(1000 - immobile.spin).toBeGreaterThan(1000 - fonceur.spin);
  });

  it('un choc frontal reste symétrique — le partage ne change que les assauts', () => {
    const a = top({ id: 'a', vel: { x: 50, y: 0 } });
    const b = top({ id: 'b', pos: { x: 20, y: 0 }, vel: { x: -50, y: 0 } });
    resolveCollision(a, b);
    expect(a.spin).toBeCloseTo(b.spin, 9);
    // Les deux poids somment à 2 : le total infligé est celui d’avant le partage.
    expect(1000 - a.spin).toBeCloseTo((100 * 10) / 20 * DAMAGE_K, 9);
  });

  it('ignore des toupies qui s’éloignent déjà', () => {
    const a = top({ vel: { x: -50, y: 0 } });
    const b = top({ pos: { x: 20, y: 0 }, vel: { x: 50, y: 0 } });
    resolveCollision(a, b);
    expect(a.spin).toBe(1000);
    expect(b.spin).toBe(1000);
  });
});

/** Deux toupies qui se rentrent dedans de face, en collision garantie : un choc
 *  frontal parfait, donc share = 0,5 et chargeWeight = 1 des deux côtés — la
 *  charge est neutre, chaque test ci-dessous n'isole donc qu'un seul talent. */
function headOn(a: Partial<Top>, b: Partial<Top>): [Top, Top] {
  return [
    top({ id: 'a', pos: { x: -10, y: 0 }, vel: { x: 100, y: 0 }, ...a }),
    top({ id: 'b', pos: { x: 10, y: 0 }, vel: { x: -100, y: 0 }, ...b }),
  ];
}

describe('talent Estoc', () => {
  it('majore les dégâts au-delà du seuil de vitesse', () => {
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);
    const plain = 1000 - b0.spin;

    const [a1, b1] = headOn({ talents: { ...NEUTRAL_TALENTS, estocThreshold: 0, estocBonus: TALENTS.estoc.damageBonus } }, {});
    resolveCollision(a1, b1);
    expect(1000 - b1.spin).toBeCloseTo(plain * (1 + TALENTS.estoc.damageBonus), 6);
  });

  it('ne fait rien sous le seuil', () => {
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);
    const plain = 1000 - b0.spin;

    const [a1, b1] = headOn({ talents: { ...NEUTRAL_TALENTS, estocThreshold: Infinity, estocBonus: 5 } }, {});
    resolveCollision(a1, b1);
    expect(1000 - b1.spin).toBeCloseTo(plain, 6);
  });
});

describe('talent Percée', () => {
  it('ignore une part de la défense adverse', () => {
    const [a0, b0] = headOn({}, { defense: 100 });
    resolveCollision(a0, b0);
    const plain = 1000 - b0.spin;

    const [a1, b1] = headOn({ talents: { ...NEUTRAL_TALENTS, defenseIgnore: 0.5 } }, { defense: 100 });
    resolveCollision(a1, b1);
    expect(1000 - b1.spin).toBeGreaterThan(plain);
  });
});

describe('talent Riposte', () => {
  it('renvoie une part des dégâts encaissés à l’agresseur', () => {
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);
    const takenByA = 1000 - a0.spin;
    const takenByB = 1000 - b0.spin;

    const [a1, b1] = headOn({}, { talents: { ...NEUTRAL_TALENTS, riposte: 0.5 } });
    resolveCollision(a1, b1);
    expect(1000 - a1.spin).toBeCloseTo(takenByA + takenByB * 0.5, 6);
    // Le porteur du talent n'encaisse pas plus pour autant.
    expect(1000 - b1.spin).toBeCloseTo(takenByB, 6);
  });
});

describe('talent Frôlement', () => {
  it('annule les dégâts subis sous le seuil', () => {
    const [a, b] = headOn({}, { talents: { ...NEUTRAL_TALENTS, frolementThreshold: Infinity } });
    resolveCollision(a, b);
    expect(b.spin).toBe(1000);
    // L'autre encaisse normalement : le talent ne protège que son porteur.
    expect(a.spin).toBeLessThan(1000);
  });

  it('protège aussi contre la riposte que son coup a déclenchée chez l’adversaire', () => {
    // b est protégé sous le seuil ; a porte Riposte, qui renvoie une part de ce
    // qu'a encaisse (donc causé par b) vers... b. Ce renvoi doit lui aussi
    // buter sur le seuil de b, pas seulement le coup direct de a.
    const [a, b] = headOn(
      { talents: { ...NEUTRAL_TALENTS, riposte: 0.5 } },
      { talents: { ...NEUTRAL_TALENTS, frolementThreshold: Infinity } },
    );
    resolveCollision(a, b);
    expect(b.spin).toBe(1000);
  });

  it('ne renvoie pas, via Riposte, des dégâts que son propre Frôlement vient d’annuler', () => {
    // a porte Frôlement (protégé sous le seuil) ET Riposte : le coup de b sur a
    // est annulé par le Frôlement de a, donc rien à renvoyer vers b — atteignable
    // avec un Disque et une Lame de rang Épique.
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);
    const plainToB = 1000 - b0.spin; // dégâts que a inflige à b, sans aucun talent

    const [a, b] = headOn(
      { talents: { ...NEUTRAL_TALENTS, frolementThreshold: Infinity, riposte: 0.5 } },
      {},
    );
    resolveCollision(a, b);
    expect(a.spin).toBe(1000); // a est protégé par son propre Frôlement
    expect(1000 - b.spin).toBeCloseTo(plainToB, 6); // ... et ne riposte que sur ce qu'il a réellement pris : rien
  });
});

describe('talent Ancrage', () => {
  it('réduit l’impulsion reçue sans changer celle de l’autre', () => {
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);

    const [a1, b1] = headOn({}, { talents: { ...NEUTRAL_TALENTS, impulseTaken: 0.5 } });
    resolveCollision(a1, b1);
    expect(Math.abs(b1.vel.x)).toBeLessThan(Math.abs(b0.vel.x));
    expect(a1.vel.x).toBeCloseTo(a0.vel.x, 6);
  });
});

describe('masse', () => {
  it('fait reculer l’autre davantage et soi-même moins', () => {
    // La masse résolue vit désormais sur la toupie (Top.mass), plus dans les
    // talents : trois systèmes (châssis, Disque, talent Masse) y contribuent
    // en amont — voir « lit la masse sur la toupie, pas sur ses talents ».
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);

    const [a1, b1] = headOn({ mass: 2 }, {});
    resolveCollision(a1, b1);
    expect(Math.abs(a1.vel.x)).toBeLessThan(Math.abs(a0.vel.x));
    expect(Math.abs(b1.vel.x)).toBeGreaterThan(Math.abs(b0.vel.x));
  });

  it('lit la masse sur la toupie, pas sur ses talents', () => {
    const a = top({ pos: { x: -10, y: 0 }, vel: { x: 100, y: 0 } });
    const b = top({ pos: { x: 10, y: 0 }, vel: { x: 0, y: 0 } });
    a.mass = 4;
    const before = b.vel.x;
    resolveCollision(a, b);
    // Une toupie quatre fois plus lourde pousse : la légère repart plus vite
    // que dans un choc à masses égales.
    expect(b.vel.x).toBeGreaterThan(before + 100);
  });
});

describe('talent Relance', () => {
  it('arme la suspension de décroissance sur le porteur uniquement', () => {
    const [a, b] = headOn({ talents: { ...NEUTRAL_TALENTS, relanceTicks: 20 } }, {});
    resolveCollision(a, b);
    expect(a.decayPauseTicks).toBe(20);
    expect(b.decayPauseTicks).toBe(0);
  });
});

describe('décroissance modulée', () => {
  it('Cœur Gyre ralentit la perte naturelle', () => {
    const t = top({ talents: { ...NEUTRAL_TALENTS, spinDecayMult: 0.5 } });
    decaySpin(t, NEUTRAL_ZONE);
    expect(1000 - t.spin).toBeCloseTo(10 * 0.5 * 0.1, 10);
  });

  it('Relance suspend la perte et consomme un tick', () => {
    const t = top({ decayPauseTicks: 2 });
    decaySpin(t, NEUTRAL_ZONE);
    expect(t.spin).toBe(1000);
    expect(t.decayPauseTicks).toBe(1);
    decaySpin(t, NEUTRAL_ZONE);
    expect(t.decayPauseTicks).toBe(0);
    decaySpin(t, NEUTRAL_ZONE);
    expect(t.spin).toBeLessThan(1000);
  });
});

describe('triangle des forces dans le combat', () => {
  /** Deux toupies identiques qui se percutent de face : tout écart de dégâts
   *  ne peut venir que du type. */
  function headOn(attType: TopType, defType: TopType) {
    const a = top({ pos: { x: -10, y: 0 }, vel: { x: 100, y: 0 }, type: attType });
    const b = top({ pos: { x: 10, y: 0 }, vel: { x: -100, y: 0 }, type: defType });
    const spinB = b.spin;
    resolveCollision(a, b);
    return spinB - b.spin;
  }

  it('fait mal quand le type domine', () => {
    const neutre = headOn('attaque', 'attaque');
    const dominant = headOn('attaque', 'endurance');
    expect(dominant).toBeGreaterThan(neutre);
    expect(dominant / neutre).toBeCloseTo(1.25, 2);
  });

  it('donne à Équilibre son +10 % contre tous', () => {
    const neutre = headOn('attaque', 'attaque');
    for (const def of ['attaque', 'endurance', 'defense', 'equilibre'] as TopType[]) {
      expect(headOn('equilibre', def) / neutre).toBeCloseTo(1.1, 2);
    }
  });

  it('n’expose jamais Équilibre au +25 %', () => {
    const neutre = headOn('attaque', 'attaque');
    expect(headOn('attaque', 'equilibre') / neutre).toBeCloseTo(1, 2);
  });

  it('joue dans les deux sens — le bot dominant frappe plus fort aussi', () => {
    const a = top({ pos: { x: -10, y: 0 }, vel: { x: 100, y: 0 }, type: 'attaque' });
    const b = top({ pos: { x: 10, y: 0 }, vel: { x: -100, y: 0 }, type: 'defense' });
    const spinA = a.spin;
    const spinB = b.spin;
    resolveCollision(a, b);
    // Défense domine Attaque : b encaisse moins que ce qu'il inflige.
    expect(spinA - a.spin).toBeGreaterThan(spinB - b.spin);
  });

  // Le triangle s'ajoute au partage de charge, il ne s'y substitue pas.
  it('se compose avec le partage de charge sans l’écraser', () => {
    // Assaut pur : seul a avance. b est immobile.
    const charge = (attType: TopType, defType: TopType) => {
      const a = top({ pos: { x: -10, y: 0 }, vel: { x: 200, y: 0 }, type: attType });
      const b = top({ pos: { x: 10, y: 0 }, vel: { x: 0, y: 0 }, type: defType });
      const spinB = b.spin;
      resolveCollision(a, b);
      return spinB - b.spin;
    };
    const chargeNeutre = charge('attaque', 'attaque');
    const chargeDominante = charge('attaque', 'endurance');
    const frontalNeutre = headOn('attaque', 'attaque');
    // Le rapport de type est le même quel que soit le mode d'engagement…
    expect(chargeDominante / chargeNeutre).toBeCloseTo(1.25, 2);
    // …et la prime de charge existe toujours par-dessus, à son rapport exact.
    expect(chargeNeutre / frontalNeutre).toBeCloseTo(1 + CHARGE_BONUS, 5);
  });
});
