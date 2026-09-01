/** Catalogue des modèles de pièces. Univers original — voir la règle IP de CLAUDE.md.
 *  Les quatre Fondateurs sont au catalogue, chacun avec sa Lame et son Noyau
 *  signature. La Saison 1 viendra s'ajouter de la même façon : des lignes en plus. */
export type Slot = 'lame' | 'disque' | 'pointe' | 'noyau';

export interface PieceModel {
  id: string;
  slot: Slot;
}

export const MODELS: PieceModel[] = [
  { id: 'lame.couronne-solaire', slot: 'lame' },
  { id: 'lame.croc-de-tempete', slot: 'lame' },
  { id: 'lame.ecaille-abyssale', slot: 'lame' },
  { id: 'lame.griffe-orageuse', slot: 'lame' },
  { id: 'noyau.fournaise', slot: 'noyau' },
  { id: 'noyau.oeil-du-cyclone', slot: 'noyau' },
  { id: 'noyau.caparacon', slot: 'noyau' },
  { id: 'noyau.arc-electrique', slot: 'noyau' },
  { id: 'disque.lourd', slot: 'disque' },
  { id: 'disque.gravite', slot: 'disque' },
  { id: 'disque.eventail', slot: 'disque' },
  { id: 'disque.axial', slot: 'disque' },
  { id: 'disque.colosse', slot: 'disque' },
  { id: 'disque.meteorite', slot: 'disque' },
  { id: 'pointe.plate', slot: 'pointe' },
  { id: 'pointe.aiguille', slot: 'pointe' },
  { id: 'pointe.orbitale', slot: 'pointe' },
  { id: 'pointe.gyroscope', slot: 'pointe' },
  { id: 'pointe.furie', slot: 'pointe' },
  { id: 'pointe.ressort', slot: 'pointe' },
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
