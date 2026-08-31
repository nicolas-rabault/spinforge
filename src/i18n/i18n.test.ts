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

  it('remplace les variables nommées', () => {
    expect(t('combat.salle', { n: 3, max: 10 })).toBe('SALLE 3 / 10');
  });

  // Le remplacement doit être global : une variable citée deux fois doit être
  // substituée deux fois, pas seulement à sa première occurrence.
  it('remplace toutes les occurrences d’une même variable', () => {
    expect(t('type.bonus.dominant', { pct: 25 }))
      .toBe('+25 % de dégâts contre son type dominé, +25 % subis face à qui la domine.');
  });

  // Un trou doit se voir et se corriger, pas passer pour du texte.
  it('laisse le marqueur en place quand la variable manque', () => {
    expect(t('toupies.salle', {})).toBe('Salle {n}');
  });
});

describe('tn', () => {
  it('choisit le singulier et le pluriel français', () => {
    expect(tn('chest.loot', 0)).toBe('Butin — 0 coffre');
    expect(tn('chest.loot', 1)).toBe('Butin — 1 coffre');
    expect(tn('chest.loot', 2)).toBe('Butin — 2 coffres');
  });

  it('choisit le singulier et le pluriel anglais', () => {
    setLang('en');
    expect(tn('chest.loot', 0)).toBe('Loot — 0 chests');
    expect(tn('chest.loot', 1)).toBe('Loot — 1 chest');
    expect(tn('chest.loot', 2)).toBe('Loot — 2 chests');
  });

  it('complète les autres variables du gabarit', () => {
    expect(tn('chest.pity', 3, { rank: 'Épique' })).toBe('Épique garanti dans 3 tirages');
  });

  // Le CLDR récent classe le million en « many » pour le français. Sans repli,
  // cette clé — que le typage n'exige pas — afficherait du vide.
  it('retombe sur `.other` quand la catégorie Intl n’a pas de clé', () => {
    expect(new Intl.PluralRules('fr').select(1_000_000)).toBe('many');
    expect(tn('chest.loot', 1_000_000)).toBe('Butin — 1000000 coffres');
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
