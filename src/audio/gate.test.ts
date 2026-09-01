import { describe, expect, it } from 'vitest';
import { admitHit, createGate } from './gate';

describe('la garde de débit des chocs', () => {
  it('refuse un second choc de même puissance avant 140 ms', () => {
    const gate = createGate();
    expect(admitHit(gate, 0, 0.5)).toBe(true);
    expect(admitHit(gate, 0.1, 0.5)).toBe(false);
  });

  it('accepte un choc nettement plus fort pendant la garde', () => {
    const gate = createGate();
    admitHit(gate, 0, 0.2);
    // +0,4 sur le précédent : c'est le coup décisif, il ne doit pas être avalé
    // par le frôlement qui l'a précédé de 50 ms.
    expect(admitHit(gate, 0.05, 0.6)).toBe(true);
  });

  it('refuse même le plus fort des chocs sous le plancher de 40 ms', () => {
    const gate = createGate();
    admitHit(gate, 0, 0.1);
    expect(admitHit(gate, 0.02, 1)).toBe(false);
  });

  it('accepte de nouveau une fois la garde écoulée', () => {
    const gate = createGate();
    admitHit(gate, 0, 0.5);
    expect(admitHit(gate, 0.14, 0.5)).toBe(true);
  });

  it("n'avance l'horloge que sur un choc accepté", () => {
    const gate = createGate();
    admitHit(gate, 0, 0.5);
    admitHit(gate, 0.1, 0.5); // refusé
    // Si le refus avait quand même repoussé `lastAt` à 0,1, ce choc-ci serait
    // refusé lui aussi et la garde se prolongerait indéfiniment sous contact.
    expect(admitHit(gate, 0.14, 0.5)).toBe(true);
  });
});
