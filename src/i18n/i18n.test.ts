import { beforeEach, describe, expect, it } from 'vitest';
import { formatCredits, getLang, pickLang, setLang, t, tn } from './index';

// Chaque test part du français : la détection rendrait « en » dans cet
// environnement, et un test ne doit pas dépendre de l'ordre d'exécution.
beforeEach(() => setLang('fr'));

describe('pickLang', () => {
  it('donne priorité au choix stocké sur les préférences du navigateur', () => {
    expect(pickLang('fr', ['en-US'])).toBe('fr');
    expect(pickLang('en', ['fr-FR'])).toBe('en');
  });

  it('ignore une valeur stockée qui n’est pas une langue connue', () => {
    expect(pickLang('de', ['fr-FR'])).toBe('fr');
    expect(pickLang('', ['fr-FR'])).toBe('fr');
  });

  it('lit la région comme la langue de base', () => {
    expect(pickLang(null, ['fr-CA'])).toBe('fr');
    expect(pickLang(null, ['en-GB'])).toBe('en');
  });

  it('prend la première préférence connue, pas la première tout court', () => {
    expect(pickLang(null, ['de-DE', 'fr-FR', 'en-US'])).toBe('fr');
  });

  // Un joueur ni francophone ni anglophone lira plus probablement l'anglais.
  it('retombe sur l’anglais quand rien n’est reconnu', () => {
    expect(pickLang(null, ['ja-JP'])).toBe('en');
    expect(pickLang(null, [])).toBe('en');
  });
});

describe('t', () => {
  it('rend la chaîne de la langue courante', () => {
    expect(t('tab.combat')).toBe('Combat');
    setLang('en');
    expect(t('tab.combat')).toBe('Battle');
    expect(getLang()).toBe('en');
  });

  // Le remplacement doit être global : sans le drapeau `g`, seule la première
  // variable du gabarit serait substituée et la seconde resterait à nu.
  it('remplace toutes les variables, pas seulement la première', () => {
    expect(t('toupies.salleType', { n: 3, type: 'Défense' })).toBe('Salle 3 : Défense');
  });

  // Un trou doit se voir et se corriger, pas passer pour du texte.
  it('laisse le marqueur en place quand la variable manque', () => {
    expect(t('toupies.salleType', { n: 4 })).toBe('Salle 4 : {type}');
  });
});

describe('tn', () => {
  // Le français accorde 0 au singulier, l'anglais au pluriel : c'est la borne
  // que six `n > 1 ? 's' : ''` codés en dur rataient.
  it('choisit le singulier et le pluriel français', () => {
    expect(tn('tab.chestsBadge', 0)).toBe('0 coffre à ouvrir');
    expect(tn('tab.chestsBadge', 1)).toBe('1 coffre à ouvrir');
    expect(tn('tab.chestsBadge', 2)).toBe('2 coffres à ouvrir');
  });

  it('choisit le singulier et le pluriel anglais', () => {
    setLang('en');
    expect(tn('tab.chestsBadge', 0)).toBe('0 chests to open');
    expect(tn('tab.chestsBadge', 1)).toBe('1 chest to open');
    expect(tn('tab.chestsBadge', 2)).toBe('2 chests to open');
  });

  it('complète les autres variables du gabarit', () => {
    expect(tn('inventory.copies', 2, { name: 'Furie', rank: 'Rare' }))
      .toBe('Furie, Rare, 2 exemplaires');
  });

  // Le CLDR récent classe le million en « many » pour le français. Sans repli,
  // cette clé — que le typage n'exige pas — afficherait du vide.
  it('retombe sur `.other` quand la catégorie Intl n’a pas de clé', () => {
    expect(new Intl.PluralRules('fr').select(1_000_000)).toBe('many');
    expect(tn('tab.chestsBadge', 1_000_000)).toBe('1000000 coffres à ouvrir');
  });
});

describe('formatCredits', () => {
  it('affiche brut sous 1000', () => {
    expect(formatCredits(950)).toBe('950');
    expect(formatCredits(999.9)).toBe('999');
  });

  it('milliers en « 12,4 k » et millions en « 2,50 M »', () => {
    expect(formatCredits(12400)).toBe('12,4 k');
    expect(formatCredits(2500000)).toBe('2,50 M');
  });

  it('bascule en M plutôt que d’afficher « 1000,0 k »', () => {
    expect(formatCredits(999999)).toBe('1,00 M');
    expect(formatCredits(999949)).toBe('999,9 k');
  });

  it('passe au point décimal et colle le suffixe en anglais', () => {
    setLang('en');
    expect(formatCredits(12400)).toBe('12.4k');
    expect(formatCredits(2500000)).toBe('2.50M');
    expect(formatCredits(999999)).toBe('1.00M');
    expect(formatCredits(950)).toBe('950');
  });
});
