import { describe, expect, it, vi } from 'vitest';
import { BUZZ, MIX } from './mix';
import { admitBuzz, createHaptics, createHapticsState, hitPattern, type BuzzKind } from './haptics';

describe('le motif de choc', () => {
  it('ne vibre pas sous le seuil de puissance', () => {
    expect(hitPattern(0.34)).toBeNull();
  });

  it('vibre plus longtemps quand le choc est plus fort', () => {
    expect(hitPattern(0.35)).toEqual([12]);
    expect(hitPattern(1)).toEqual([18]);
  });
});

describe('les garde-fous de débit', () => {
  it('ignore un motif arrivé trop tôt après le précédent', () => {
    const state = createHapticsState();
    expect(admitBuzz(state, 0, [10], false)).toEqual([10]);
    expect(admitBuzz(state, 30, [10], false)).toBeNull();
    expect(admitBuzz(state, 60, [10], false)).toEqual([10]);
  });

  it('laisse passer un motif urgent malgré l\'intervalle', () => {
    const state = createHapticsState();
    admitBuzz(state, 0, [10], false);
    expect(admitBuzz(state, 30, [18], true)).toEqual([18]);
  });

  it('tient le budget de la fenêtre glissante, même en urgence', () => {
    const state = createHapticsState();
    let vibrated = 0;
    for (let now = 0; now < 1000; now += 60) {
      const out = admitBuzz(state, now, [18], true);
      if (out) vibrated += 18;
    }
    expect(vibrated).toBeLessThanOrEqual(MIX.hapticBudgetMs);
  });

  it('libère le budget une fois la fenêtre passée', () => {
    const state = createHapticsState();
    for (let now = 0; now < 1000; now += 60) admitBuzz(state, now, [18], true);
    expect(admitBuzz(state, 2000, [18], false)).toEqual([18]);
  });
});

describe('la façade haptique', () => {
  it('appelle le moteur avec le motif de son événement', () => {
    const emit = vi.fn();
    createHaptics(emit, true).buzz('reward', 0);
    expect(emit).toHaveBeenCalledWith([...BUZZ.reward]);
  });

  it('ne fait rien quand la vibration est coupée', () => {
    const emit = vi.fn();
    const haptics = createHaptics(emit, true);
    haptics.setEnabled(false);
    haptics.buzz('reward', 0);
    expect(emit).not.toHaveBeenCalled();
  });

  it("ne jette pas quand l'appareil n'a pas de moteur haptique", () => {
    const haptics = createHaptics(null, true);
    expect(() => haptics.buzz('chestDone', 0)).not.toThrow();
    expect(() => haptics.hit(1, 0)).not.toThrow();
  });

  // Mesuré au navigateur sur une fusion réussie : le clic du bouton vibre à
  // t≈0, sa conclusion arrive quelques millisecondes plus tard — bien avant
  // les 60 ms de `hapticMinGapMs` — et se faisait avaler par l'appui puisque
  // `fuse` ne figurait pas dans `URGENT`. Généralisé aux quatre membres du
  // `Set` : chacun conclut une action, la mesure n'en couvrait qu'un seul.
  // Une instance `createHaptics` fraîche par membre, pas un état partagé :
  // `chestDone` (93 ms) et `bossDown` (160 ms) coûtent chacun une bonne part
  // des 220 ms de `MIX.hapticBudgetMs`, et s'épuiseraient l'un l'autre dans
  // la même fenêtre glissante — un échec qui n'aurait alors plus rien à voir
  // avec `URGENT`.
  const CONCLUSIONS: BuzzKind[] = ['chestDone', 'bossDown', 'fuse', 'equip'];

  it.each(CONCLUSIONS)('%s conclut une action et passe malgré l\'intervalle minimum', (kind) => {
    const emit = vi.fn();
    const haptics = createHaptics(emit, true);
    haptics.buzz('tap', 0);
    haptics.buzz(kind, 30);
    expect(emit).toHaveBeenCalledTimes(2);
  });
});
