import { en } from './en';
import { fr, type MessageKey } from './fr';

export type { MessageKey };
export type Lang = 'fr' | 'en';

/** Le paramètre nommé est nécessaire : un type conditionnel ne distribue que
 *  sur un paramètre nu, pas sur une union concrète écrite en place. */
type BaseOf<K> = K extends `${infer B}.one` ? B : never;
/** Bases des couples pluriels — `chest.loot.one` + `.other` donnent `chest.loot`. */
export type PluralKey = BaseOf<MessageKey>;

type Vars = Record<string, string | number>;

const KEY = 'spinforge.lang';
const CATALOGS: Record<Lang, Record<MessageKey, string>> = { fr, en };

function isLang(v: unknown): v is Lang {
  return v === 'fr' || v === 'en';
}

/** Cœur pur de la détection, isolé pour être testable sans navigateur : le
 *  choix stocké prime, puis les préférences du navigateur, puis l'anglais —
 *  un joueur ni francophone ni anglophone le lira plus probablement. */
export function pickLang(stored: string | null, preferred: readonly string[]): Lang {
  if (isLang(stored)) return stored;
  for (const tag of preferred) {
    const base = tag.toLowerCase().split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null; // Stockage refusé (navigation privée) : le navigateur tranchera seul.
  }
}

export function detectLang(): Lang {
  const nav = typeof navigator === 'undefined' ? undefined : navigator;
  return pickLang(stored(), nav?.languages ?? (nav?.language ? [nav.language] : []));
}

let current: Lang = detectLang();

export function getLang(): Lang {
  return current;
}

/** Ne touche pas au DOM : `document.documentElement.lang` est posé par
 *  `main.tsx` et par le sélecteur. Ce module reste testable en environnement
 *  node, où ni `document` ni `localStorage` n'existent. */
export function setLang(lang: Lang): void {
  current = lang;
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Idem : la langue vaut alors pour la session seulement.
  }
}

/** Gabarit brut du catalogue courant. Réservé à `tx`, qui le découpe lui-même
 *  pour y insérer des nœuds React ; partout ailleurs, passer par `t`. */
export function raw(key: MessageKey): string {
  return CATALOGS[current][key];
}

/** Le repli sur `.other` n'est pas décoratif : le CLDR récent classe le million
 *  en « many » pour le français, et le typage n'exige que `.one` et `.other`. */
export function rawPlural(base: PluralKey, count: number): string {
  const catalog = CATALOGS[current];
  const exact = catalog[`${base}.${new Intl.PluralRules(current).select(count)}` as MessageKey];
  return exact ?? catalog[`${base}.other` as MessageKey];
}

/** Une variable absente laisse son marqueur en place plutôt que « undefined » :
 *  le trou se voit et se corrige, au lieu de passer pour du texte. */
function interpolate(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}

export function t(key: MessageKey, vars?: Vars): string {
  const template = raw(key);
  return vars ? interpolate(template, vars) : template;
}

export function tn(base: PluralKey, count: number, vars?: Vars): string {
  return interpolate(rawPlural(base, count), { n: count, ...vars });
}

/** Le suffixe est une clé : « 12,4 k » en français, « 12.4k » en anglais. Le
 *  séparateur décimal vient d'`Intl`, non plus d'un `replace` codé en dur. */
export function formatCredits(n: number): string {
  if (n < 1000) return Math.floor(n).toString();
  const fixed = (value: number, digits: number) =>
    new Intl.NumberFormat(current, {
      minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: false,
    }).format(value);
  if (n < 999950) return fixed(n / 1000, 1) + t('format.thousand');
  return fixed(n / 1e6, 2) + t('format.million');
}
