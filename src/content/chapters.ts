/** Les 8 arènes-chapitres. Univers original — aucun nom officiel Beyblade.
 *  Les noms et ceux des boss vivent dans les catalogues i18n, sous
 *  `chapter.<n>.name` et `chapter.<n>.boss`, et se lisent par
 *  `src/ui/contentLabels.ts` : ce module ne porte plus que ce qui n'est pas du
 *  texte. `src/sim` dépend de `src/content/`, et y loger la traduction ferait
 *  entrer `localStorage` et `navigator` dans le cœur pur. */
export interface Chapter {
  /** Couleur d'ambiance du décor, derrière l'anneau de jeu. Huit chapitres qui
   *  portaient le même noir se ressemblaient tous ; c'est la seule chose qui
   *  distingue le Hangar Rouillé du Temple sous la Glace avant d'en lire le nom. */
  ambience: number;
}

export const CHAPTERS: Chapter[] = [
  { ambience: 0x7a3a1c },
  { ambience: 0xd42b8f },
  { ambience: 0xb08128 },
  { ambience: 0xd63a12 },
  { ambience: 0x3fa8d8 },
  { ambience: 0x2fa869 },
  { ambience: 0x4257c8 },
  { ambience: 0x8f3fd8 },
];

export const CHAPTER_COUNT = CHAPTERS.length;

export function chapterOf(chapter: number): Chapter {
  return CHAPTERS[Math.min(Math.max(1, chapter), CHAPTER_COUNT) - 1];
}
