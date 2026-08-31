/** Les 8 arènes-chapitres. Univers original — aucun nom officiel Beyblade.
 *  Leurs noms et ceux de leurs boss vivent dans les catalogues i18n, sous
 *  `chapter.<n>.name` et `chapter.<n>.boss` ; il ne reste ici que leur nombre.
 *  Les libellés sont lus par `src/ui/contentLabels.ts` et non depuis ce module :
 *  `src/sim` importe les catalogues de `src/content/`, et y loger la traduction
 *  ferait entrer `localStorage` et `navigator` dans le cœur pur. */
export const CHAPTER_COUNT = 8;
