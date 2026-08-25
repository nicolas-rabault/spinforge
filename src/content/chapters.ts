/** Les 8 arènes-chapitres. Univers original — aucun nom officiel Beyblade. */
export interface Chapter {
  name: string;
  boss: string;
}

export const CHAPTERS: Chapter[] = [
  { name: 'Hangar Rouillé', boss: 'Gardien du Hangar' },
  { name: 'Dojo Néon', boss: 'Maître des Néons' },
  { name: 'Marché Souterrain', boss: 'Doyen des Piliers' },
  { name: 'Cratère de Magma', boss: 'Forgeron du Cratère' },
  { name: 'Temple sous la Glace', boss: 'Veilleur de Givre' },
  { name: 'Jardin Suspendu', boss: 'Sentinelle Suspendue' },
  { name: 'Station Orbitale', boss: 'Pilote Orbital' },
  { name: 'Le Vortex', boss: 'Cœur du Vortex' },
];

export function chapterOf(chapter: number): Chapter {
  return CHAPTERS[Math.min(Math.max(1, chapter), CHAPTERS.length) - 1];
}
