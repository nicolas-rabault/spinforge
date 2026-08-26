/** Catalogue des toupies. Univers original — voir la règle IP de CLAUDE.md.
 *  Saison 0, les quatre Fondateurs. La Saison 1 (Génération Rafale, douze
 *  toupies) viendra au jalon 4 en ajoutant des lignes ici et dans `pieces.ts`.
 *
 *  Le châssis n'est **pas** un cinquième emplacement : c'est le corps de la
 *  toupie, porteur du type. Et « signature » qualifie l'*origine* d'une pièce —
 *  la toupie qui la débloque et dont les doublons tombent alors des coffres —
 *  jamais une restriction de port : toutes les pièces sont interchangeables. */
export type TopType = 'attaque' | 'endurance' | 'defense' | 'equilibre';

export type ToupieId =
  | 'brasier-solaire'
  | 'typhon-primal'
  | 'carapace-abyssale'
  | 'tigre-foudre';

export interface Toupie {
  id: ToupieId;
  label: string;
  type: TopType;
  signature: { lame: string; noyau: string };
}

/** Ordre stable — l'écran Toupies l'affiche tel quel. */
export const TOUPIES: Toupie[] = [
  {
    id: 'brasier-solaire',
    label: 'Brasier Solaire',
    type: 'equilibre',
    signature: { lame: 'lame.couronne-solaire', noyau: 'noyau.fournaise' },
  },
  {
    id: 'typhon-primal',
    label: 'Typhon Primal',
    type: 'attaque',
    signature: { lame: 'lame.croc-de-tempete', noyau: 'noyau.oeil-du-cyclone' },
  },
  {
    id: 'carapace-abyssale',
    label: 'Carapace Abyssale',
    type: 'defense',
    signature: { lame: 'lame.ecaille-abyssale', noyau: 'noyau.caparacon' },
  },
  {
    id: 'tigre-foudre',
    label: 'Tigre Foudre',
    type: 'endurance',
    signature: { lame: 'lame.griffe-orageuse', noyau: 'noyau.arc-electrique' },
  },
];

/** La seule toupie possédée au départ. Équilibre : le type neutre, hors du
 *  triangle — un débutant n'est jamais contré tant qu'il n'a pas choisi. */
export const STARTER_TOUPIE: ToupieId = 'brasier-solaire';

const BY_ID = new Map(TOUPIES.map((t) => [t.id, t]));

export function toupieById(id: ToupieId): Toupie {
  const t = BY_ID.get(id);
  if (!t) throw new Error(`toupie inconnue : ${id}`);
  return t;
}
