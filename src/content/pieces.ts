/** Catalogue des modèles de pièces. Univers original — voir la règle IP de CLAUDE.md.
 *  Au jalon 2a une seule toupie est débloquée (Brasier Solaire), donc un seul
 *  modèle de Lame et un seul de Noyau. Les trois autres Fondateurs arrivent au 2b
 *  et n'auront qu'à ajouter des lignes ici. */
export type Slot = 'lame' | 'disque' | 'pointe' | 'noyau';

export interface PieceModel {
  id: string;
  slot: Slot;
  label: string;
}

export const MODELS: PieceModel[] = [
  { id: 'lame.couronne-solaire', slot: 'lame', label: 'Couronne Solaire' },
  { id: 'noyau.fournaise', slot: 'noyau', label: 'Fournaise' },
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
