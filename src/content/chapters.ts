/** Les 8 arènes-chapitres. Univers original — aucun nom officiel Beyblade. */
export interface Chapter {
  name: string;
  boss: string;
  /** Couleur d'ambiance du décor, derrière l'anneau de jeu. Huit chapitres qui
   *  portaient le même noir se ressemblaient tous ; c'est la seule chose qui
   *  distingue le Hangar Rouillé du Temple sous la Glace avant d'en lire le nom. */
  ambience: number;
}

export const CHAPTERS: Chapter[] = [
  { name: 'Hangar Rouillé', boss: 'Gardien du Hangar', ambience: 0x7a3a1c },
  { name: 'Dojo Néon', boss: 'Maître des Néons', ambience: 0xd42b8f },
  { name: 'Marché Souterrain', boss: 'Doyen des Piliers', ambience: 0xb08128 },
  { name: 'Cratère de Magma', boss: 'Forgeron du Cratère', ambience: 0xd63a12 },
  { name: 'Temple sous la Glace', boss: 'Veilleur de Givre', ambience: 0x3fa8d8 },
  { name: 'Jardin Suspendu', boss: 'Sentinelle Suspendue', ambience: 0x2fa869 },
  { name: 'Station Orbitale', boss: 'Pilote Orbital', ambience: 0x4257c8 },
  { name: 'Le Vortex', boss: 'Cœur du Vortex', ambience: 0x8f3fd8 },
];

export function chapterOf(chapter: number): Chapter {
  return CHAPTERS[Math.min(Math.max(1, chapter), CHAPTERS.length) - 1];
}
