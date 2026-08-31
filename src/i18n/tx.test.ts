import { createElement, type ReactElement } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { setLang } from './index';
import { tx, txn } from './tx';

// Chaque test part du français : la détection rendrait « en » dans cet
// environnement, et un test ne doit pas dépendre de l'ordre d'exécution.
beforeEach(() => setLang('fr'));

/** `createElement(Fragment, null, a)` range un enfant unique hors tableau —
 *  d'où la normalisation, sans quoi le cas « aucune variable » se lirait mal. */
function parts(el: ReactElement): unknown[] {
  const children = (el.props as { children: unknown }).children;
  return Array.isArray(children) ? children : [children];
}

describe('tx', () => {
  it('découpe le gabarit autour du nœud inséré, dans l’ordre', () => {
    const charge = createElement('strong', null, "Fonce dans l'adversaire");
    expect(parts(tx('combat.hint.body', { charge }))).toEqual([
      "Glisse le doigt n'importe où pour la piloter. ",
      charge,
      ' : qui charge casse plus et encaisse moins.',
    ]);
  });

  // Un gabarit qui commence par une variable ne doit pas produire de segment
  // vide au bord — React le rendrait sans dommage, mais le test qui compte les
  // parts deviendrait illisible et le cas « collées » passerait inaperçu.
  it('n’émet pas de segment vide aux bords', () => {
    const pending = createElement('span', null, 'Carapace Abyssale');
    expect(parts(tx('toupies.waiting.dead', { pending }))).toEqual([
      pending,
      ' monte sur le ring dès que tu relances la descente.',
    ]);
  });

  it('place chaque nœud à sa variable quand il y en a deux', () => {
    const piloted = createElement('span', null, 'Brasier Solaire');
    const pending = createElement('span', null, 'Tigre Foudre');
    const out = parts(tx('toupies.waiting.alive', { piloted, pending }));
    expect(out.indexOf(piloted)).toBeLessThan(out.indexOf(pending));
    expect(out[0]).toBe('Tu pilotes ');
  });

  it('laisse le gabarit entier quand il n’a aucune variable', () => {
    expect(parts(tx('inventory.empty', {}))).toEqual([
      "Rien ici pour l'instant. Ouvre un coffre pour trouver des pièces.",
    ]);
  });

  // Même règle que `t` : un trou se voit et se corrige, il ne passe pas pour
  // du texte — ni pour un « undefined » au milieu d'une phrase.
  it('laisse le marqueur en place quand la variable manque', () => {
    expect(parts(tx('toupies.waiting.dead', {}))).toEqual([
      '{pending}',
      ' monte sur le ring dès que tu relances la descente.',
    ]);
  });

  it('suit la langue courante', () => {
    setLang('en');
    expect(parts(tx('inventory.empty', {}))).toEqual(['Nothing here yet. Open a chest to find parts.']);
  });
});

describe('txn', () => {
  it('accorde le gabarit avant d’y insérer les nœuds', () => {
    expect(parts(txn('chest.pity', 1, { rank: 'Épique', n: '1' })).join(''))
      .toBe('Épique garanti dans 1 tirage');
    expect(parts(txn('chest.pity', 3, { rank: 'Épique', n: '3' })).join(''))
      .toBe('Épique garanti dans 3 tirages');
  });

  it('injecte le compte comme variable `n` par défaut', () => {
    expect(parts(txn('chest.loot', 2)).join('')).toBe('Butin — 2 coffres');
  });

  it('laisse un nœud fourni pour `n` primer sur le compte brut', () => {
    const n = createElement('span', null, '4');
    expect(parts(txn('chest.loot', 4, { n }))).toContain(n);
  });
});
