import { describe, expect, it } from 'vitest';
import { CHAPTER_COUNT } from '../content/chapters';
import { MODELS } from '../content/pieces';
import { TOUPIES } from '../content/toupies';
import { PROFILE_AXES } from '../sim/profile';
import { TALENTS_BY_SLOT } from '../sim/talents';
import { en } from './en';
import { fr } from './fr';

type Key = keyof typeof fr;
const KEYS = new Set<string>(Object.keys(fr));

/** Rend les clés manquantes plutôt qu'un booléen : le message d'échec nomme
 *  alors ce qui manque, au lieu de dire « attendu true ». */
const missing = (keys: string[]) => keys.filter((k) => !KEYS.has(k));

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();

describe('parité des catalogues', () => {
  it('le français et l’anglais ont exactement le même jeu de clés', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(fr).sort());
  });

  // Une variable perdue à la traduction produit une phrase cassée qu'aucun type
  // n'attrape : « Salle {n} » rendu « Room », sans le numéro.
  it('chaque variable du gabarit français se retrouve dans l’anglais', () => {
    for (const key of Object.keys(fr) as Key[]) {
      expect({ key, vars: placeholders(en[key]) })
        .toEqual({ key, vars: placeholders(fr[key]) });
    }
  });

  // `tn` retombe sur `.other` : sans cette variante, une forme plurielle
  // afficherait du vide au lieu de son texte.
  it('toute clé plurielle a ses deux variantes, dans les deux langues', () => {
    for (const key of Object.keys(fr)) {
      if (!key.endsWith('.one')) continue;
      const other = `${key.slice(0, -'.one'.length)}.other`;
      expect(missing([other])).toEqual([]);
      expect(en[other as Key]).toBeTypeOf('string');
    }
  });
});

describe('clés dérivées du contenu', () => {
  // Ces quatre familles de clés sont construites par concaténation
  // (`toupie.${id}`) : le typage ne les couvre pas, ce test est leur seul filet.
  it('nomme les quatre toupies', () => {
    expect(missing(TOUPIES.map((t) => `toupie.${t.id}`))).toEqual([]);
  });

  it('nomme les vingt modèles de pièces', () => {
    expect(missing(MODELS.map((m) => `piece.${m.id}`))).toEqual([]);
  });

  it('nomme les huit chapitres et leurs boss', () => {
    const chapters = Array.from({ length: CHAPTER_COUNT }, (_, i) => i + 1);
    expect(missing(chapters.flatMap((c) => [`chapter.${c}.name`, `chapter.${c}.boss`]))).toEqual([]);
  });

  it('nomme les sept axes de profil, en toutes lettres et en abrégé', () => {
    expect(missing(PROFILE_AXES.map((a) => `axis.${a}`))).toEqual([]);
    expect(missing(PROFILE_AXES.map((a) => `axis.abbr.${a}`))).toEqual([]);
  });

  it('nomme les quatre types, en toutes lettres et en abrégé', () => {
    const types = TOUPIES.map((t) => t.type);
    expect(new Set(types).size).toBe(4);
    expect(missing(types.flatMap((ty) => [`type.${ty}`, `type.abbr.${ty}`]))).toEqual([]);
  });

  it('nomme les douze talents', () => {
    const ids = Object.values(TALENTS_BY_SLOT).flat();
    expect(ids).toHaveLength(12);
    expect(missing(ids.map((id) => `talent.${id}`))).toEqual([]);
  });
});

describe('catalogue sans reste', () => {
  // Une clé qui n'est plus lue par personne est du texte mort à traduire à
  // chaque évolution. Les familles dérivées échappent au grep : on les exclut.
  it('n’a aucune valeur vide', () => {
    const blank = (Object.keys(fr) as Key[]).filter((k) => !fr[k].trim() || !en[k].trim());
    expect(blank).toEqual([]);
  });
});
