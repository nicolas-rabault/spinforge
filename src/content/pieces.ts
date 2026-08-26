/** Catalogue des modèles de pièces. Univers original — voir la règle IP de CLAUDE.md.
 *  Les quatre Fondateurs sont au catalogue, chacun avec sa Lame et son Noyau
 *  signature. La Saison 1 viendra s'ajouter de la même façon : des lignes en plus. */
export type Slot = 'lame' | 'disque' | 'pointe' | 'noyau';

export interface PieceModel {
  id: string;
  slot: Slot;
  label: string;
}

export const MODELS: PieceModel[] = [
  { id: 'lame.couronne-solaire', slot: 'lame', label: 'Couronne Solaire' },
  { id: 'lame.croc-de-tempete', slot: 'lame', label: 'Croc de Tempête' },
  { id: 'lame.ecaille-abyssale', slot: 'lame', label: 'Écaille Abyssale' },
  { id: 'lame.griffe-orageuse', slot: 'lame', label: 'Griffe Orageuse' },
  { id: 'noyau.fournaise', slot: 'noyau', label: 'Fournaise' },
  { id: 'noyau.oeil-du-cyclone', slot: 'noyau', label: 'Œil du Cyclone' },
  { id: 'noyau.caparacon', slot: 'noyau', label: 'Caparaçon' },
  { id: 'noyau.arc-electrique', slot: 'noyau', label: 'Arc Électrique' },
  { id: 'disque.lourd', slot: 'disque', label: 'Lourd' },
  { id: 'disque.gravite', slot: 'disque', label: 'Gravité' },
  { id: 'disque.eventail', slot: 'disque', label: 'Éventail' },
  { id: 'disque.axial', slot: 'disque', label: 'Axial' },
  { id: 'disque.colosse', slot: 'disque', label: 'Colosse' },
  { id: 'disque.meteorite', slot: 'disque', label: 'Météorite' },
  { id: 'pointe.plate', slot: 'pointe', label: 'Plate' },
  { id: 'pointe.aiguille', slot: 'pointe', label: 'Aiguille' },
  { id: 'pointe.orbitale', slot: 'pointe', label: 'Orbitale' },
  { id: 'pointe.gyroscope', slot: 'pointe', label: 'Gyroscope' },
  { id: 'pointe.furie', slot: 'pointe', label: 'Furie' },
  { id: 'pointe.ressort', slot: 'pointe', label: 'Ressort' },
];

const BY_ID = new Map(MODELS.map((m) => [m.id, m]));
const BY_SLOT = new Map<Slot, PieceModel[]>(
  (['lame', 'disque', 'pointe', 'noyau'] as Slot[]).map((s) => [s, MODELS.filter((m) => m.slot === s)]),
);

export function modelById(id: string): PieceModel {
  const m = BY_ID.get(id);
  if (!m) throw new Error(`modèle de pièce inconnu : ${id}`);
  return m;
}

/** Ordre stable — les tirages de coffre indexent dedans, le déterminisme en dépend. */
export function modelsForSlot(slot: Slot): PieceModel[] {
  return BY_SLOT.get(slot)!;
}
