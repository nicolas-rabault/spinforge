# Jalon 2b — Les toupies · plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner au joueur un corps — quatre châssis de Fondateur, quatre types, un triangle des forces qui fait qu'un combat se gagne aussi avant d'entrer dans l'arène — et un caractère aux douze modèles de pièces génériques.

**Architecture:** Le type et le profil de stats vivent sur un **châssis** (pas un 5ᵉ emplacement). Le triangle est une fonction pure `typeMult(att, def)` branchée comme un facteur de plus dans `damage()`, à côté du partage de charge et d'Estoc — il se compose, il ne remplace rien. Les profils sont des multiplicateurs sur sept axes, produits ensemble (châssis × modèle de Disque × modèle de Pointe), appliqués après les axes rang/niveau existants.

**Tech Stack:** TypeScript strict, Vite, Vitest (imports explicites, pas de globals), PixiJS pour l'arène, React pour l'UI.

**Spec:** `docs/superpowers/specs/2026-08-27-jalon-2b-toupies-design.md`

## Global Constraints

Ces règles s'appliquent à **toutes** les tâches. Aucune exception.

- **`src/sim/` est pur et déterministe.** Aucun import de DOM, PixiJS, React, `Date` ou `Math.random`. Le RNG est sérialisé dans l'état ; le temps n'avance que par `tick()` à pas fixe de 100 ms.
- **Le rendu est spectateur.** `src/render/` et `src/ui/` lisent l'état, ne le mutent jamais directement — toute mutation passe par une fonction de `src/sim/`.
- **Tout l'équilibrage vit dans `src/content/balance.json`**, dont `src/sim/config.ts` est la porte unique. Jamais de constante d'équilibrage en dur ailleurs.
- **Le partage de charge dans `resolveCollision` est un acquis non négociable.** `share` se lit impérativement **avant** l'impulsion de rebond. Les trois tests qui le verrouillent (`src/sim/combat.test.ts`) doivent rester verts **sans être retouchés**. S'ils demandent le moindre ajustement : **arrêter et le signaler**, ne pas les modifier.
- **Aucun nom officiel Beyblade** (toupies, personnages, produits) dans le code, les données ou l'UI.
- **Textes joueur en français, code et identifiants en anglais** — sauf le vocabulaire métier déjà en place (`salle`, `toupie`, `lame`, `disque`, `pointe`, `noyau`).
- **Pas de code mort, pas de code « au cas où ».**
- `npm run test` et `npm run build` doivent être verts à la fin de **chaque** tâche.

### Vocabulaire figé (utilisé tel quel dans toutes les tâches)

```ts
export type TopType = 'attaque' | 'endurance' | 'defense' | 'equilibre';
export type ToupieId = 'brasier-solaire' | 'typhon-primal' | 'carapace-abyssale' | 'tigre-foudre';
export type ProfileAxis = 'attack' | 'defense' | 'maxSpeed' | 'spinMax' | 'accel' | 'mass' | 'spinDecay';
```

**Piège de sens sur `spinDecay`** : c'est une *perte* de spin par seconde. Un multiplicateur **`< 1` est meilleur** (`×0,75` = « perd son spin 25 % moins vite »). Les six autres axes vont dans l'autre sens. Ne jamais l'inverser par réflexe.

---

### Task 1: Catalogue des toupies et pièces signature

Contenu pur, aucun comportement. Les trois autres Fondateurs apportent chacun une Lame et un Noyau ; `pieces.ts` n'en connaît qu'un de chaque aujourd'hui.

**Files:**
- Create: `src/content/toupies.ts`
- Create: `src/content/toupies.test.ts`
- Modify: `src/content/pieces.ts:13-27` (le tableau `MODELS`)

**Interfaces:**
- Consumes: `Slot` et `modelById` de `src/content/pieces.ts`
- Produces: `TopType`, `ToupieId`, `Toupie`, `TOUPIES`, `toupieById(id: ToupieId): Toupie`, `STARTER_TOUPIE: ToupieId`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/content/toupies.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { STARTER_TOUPIE, TOUPIES, toupieById } from './toupies';
import { modelById } from './pieces';

describe('catalogue des toupies', () => {
  it('contient les quatre Fondateurs', () => {
    expect(TOUPIES).toHaveLength(4);
    expect(TOUPIES.map((t) => t.id)).toEqual([
      'brasier-solaire', 'typhon-primal', 'carapace-abyssale', 'tigre-foudre',
    ]);
  });

  it('couvre les quatre types, une fois chacun', () => {
    expect([...TOUPIES.map((t) => t.type)].sort()).toEqual(
      ['attaque', 'defense', 'endurance', 'equilibre'],
    );
  });

  it('démarre sur Brasier Solaire, le type neutre', () => {
    expect(STARTER_TOUPIE).toBe('brasier-solaire');
    expect(toupieById(STARTER_TOUPIE).type).toBe('equilibre');
  });

  // Un identifiant de signature qui ne correspond à aucun modèle ferait lever
  // `modelById` au premier tirage de coffre, en pleine partie et pas ici.
  it('a des pièces signature qui existent et occupent le bon emplacement', () => {
    for (const toupie of TOUPIES) {
      expect(modelById(toupie.signature.lame).slot).toBe('lame');
      expect(modelById(toupie.signature.noyau).slot).toBe('noyau');
    }
  });

  it('ne partage aucune pièce signature entre deux toupies', () => {
    const ids = TOUPIES.flatMap((t) => [t.signature.lame, t.signature.noyau]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lève sur un identifiant inconnu', () => {
    expect(() => toupieById('inconnue' as never)).toThrow();
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/content/toupies.test.ts`
Expected: FAIL — `Failed to resolve import "./toupies"`.

- [ ] **Step 3: Ajouter les six modèles signature**

Dans `src/content/pieces.ts`, remplacer les deux premières lignes du tableau `MODELS` par les huit qui suivent (garder les Disques et Pointes tels quels, en dessous) :

```ts
  { id: 'lame.couronne-solaire', slot: 'lame', label: 'Couronne Solaire' },
  { id: 'lame.croc-de-tempete', slot: 'lame', label: 'Croc de Tempête' },
  { id: 'lame.ecaille-abyssale', slot: 'lame', label: 'Écaille Abyssale' },
  { id: 'lame.griffe-orageuse', slot: 'lame', label: 'Griffe Orageuse' },
  { id: 'noyau.fournaise', slot: 'noyau', label: 'Fournaise' },
  { id: 'noyau.oeil-du-cyclone', slot: 'noyau', label: 'Œil du Cyclone' },
  { id: 'noyau.caparacon', slot: 'noyau', label: 'Caparaçon' },
  { id: 'noyau.arc-electrique', slot: 'noyau', label: 'Arc Électrique' },
```

Mettre aussi à jour le commentaire d'en-tête du fichier, qui dit encore « Au jalon 2a une seule toupie est débloquée […] Les trois autres Fondateurs arrivent au 2b et n'auront qu'à ajouter des lignes ici » — c'est fait, il doit maintenant dire que les quatre Fondateurs sont au catalogue et que la Saison 1 viendra s'ajouter de la même façon.

- [ ] **Step 4: Écrire le catalogue des toupies**

Créer `src/content/toupies.ts` :

```ts
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
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/content/ && npm run build`
Expected: PASS sur les six tests, build vert.

- [ ] **Step 6: Commit**

```bash
git add src/content/toupies.ts src/content/toupies.test.ts src/content/pieces.ts
git commit -m "feat(2b): catalogue des quatre Fondateurs et de leurs pièces signature"
```

---

### Task 2: `typeMult` — le triangle en fonction pure

Isolé de tout, testé exhaustivement, avant d'être branché nulle part.

**Files:**
- Create: `src/sim/typeChart.ts`
- Create: `src/sim/typeChart.test.ts`

**Interfaces:**
- Consumes: `TopType` de `src/content/toupies.ts`
- Produces: `typeMult(att: TopType, def: TopType): number`

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/sim/typeChart.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { typeMult } from './typeChart';
import type { TopType } from '../content/toupies';

const TYPES: TopType[] = ['attaque', 'endurance', 'defense', 'equilibre'];

describe('typeMult', () => {
  it('applique +25 % dans le sens du triangle', () => {
    expect(typeMult('attaque', 'endurance')).toBeCloseTo(1.25);
    expect(typeMult('endurance', 'defense')).toBeCloseTo(1.25);
    expect(typeMult('defense', 'attaque')).toBeCloseTo(1.25);
  });

  it('ne donne rien dans le sens inverse — le dominé n’est pas puni deux fois', () => {
    expect(typeMult('endurance', 'attaque')).toBe(1);
    expect(typeMult('defense', 'endurance')).toBe(1);
    expect(typeMult('attaque', 'defense')).toBe(1);
  });

  it('ne donne rien entre types identiques', () => {
    expect(typeMult('attaque', 'attaque')).toBe(1);
    expect(typeMult('endurance', 'endurance')).toBe(1);
    expect(typeMult('defense', 'defense')).toBe(1);
    expect(typeMult('equilibre', 'equilibre')).toBeCloseTo(1.1);
  });

  it('donne +10 % à Équilibre contre tout le monde', () => {
    for (const def of TYPES) expect(typeMult('equilibre', def)).toBeCloseTo(1.1);
  });

  // C’est l’atout réel d’Équilibre, et il est passif : hors du triangle, il
  // n’est jamais le type dominé de personne.
  it('n’expose jamais Équilibre au +25 %', () => {
    for (const att of TYPES) {
      if (att === 'equilibre') continue;
      expect(typeMult(att, 'equilibre')).toBe(1);
    }
  });

  it('couvre les seize cases sans jamais sortir de [1 ; 1,25]', () => {
    for (const att of TYPES) {
      for (const def of TYPES) {
        const m = typeMult(att, def);
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(1.25);
      }
    }
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

Run: `npx vitest run src/sim/typeChart.test.ts`
Expected: FAIL — `Failed to resolve import "./typeChart"`.

- [ ] **Step 3: Ajouter les deux chiffres à `balance.json` et à `config.ts`**

Dans `src/content/balance.json`, passer `"version": 1` à `"version": 2` et ajouter, après le bloc `"combat"` :

```json
  "types": { "dominantBonus": 0.25, "equilibreBonus": 0.1 },
```

Dans `src/sim/config.ts`, ajouter le champ à l'interface `Balance`, juste après `combat` :

```ts
  types: { dominantBonus: number; equilibreBonus: number };
```

et l'export, à côté des autres :

```ts
export const TYPES = BALANCE.types;
```

- [ ] **Step 4: Écrire `typeChart.ts`**

Créer `src/sim/typeChart.ts` :

```ts
import { TYPES } from './config';
import type { TopType } from '../content/toupies';

/** Attaque bat Endurance bat Défense bat Attaque. Équilibre est **hors** du
 *  cycle : il ne domine personne et personne ne le domine. */
const BEATS: Record<'attaque' | 'endurance' | 'defense', TopType> = {
  attaque: 'endurance',
  endurance: 'defense',
  defense: 'attaque',
};

/**
 * Facteur de dégâts qu'un attaquant de type `att` applique à un défenseur de
 * type `def`. Appelé des **deux** côtés de chaque choc : si le type d'un bot
 * domine celui du joueur, le bot inflige +25 % lui aussi. Sans cette symétrie
 * le triangle serait un bonus gratuit et non une décision.
 *
 * Équilibre est testé en premier : étant hors du triangle, il gagne un bonus
 * plat contre tout le monde, mais il n'est le type dominé de personne — c'est
 * son vrai atout, et il est entièrement passif.
 */
export function typeMult(att: TopType, def: TopType): number {
  if (att === 'equilibre') return 1 + TYPES.equilibreBonus;
  if (BEATS[att] === def) return 1 + TYPES.dominantBonus;
  return 1;
}
```

- [ ] **Step 5: Lancer les tests, vérifier qu'ils passent**

Run: `npx vitest run src/sim/typeChart.test.ts src/sim/config.test.ts && npm run build`
Expected: PASS, build vert.

- [ ] **Step 6: Commit**

```bash
git add src/sim/typeChart.ts src/sim/typeChart.test.ts src/content/balance.json src/sim/config.ts
git commit -m "feat(2b): triangle des forces en fonction pure, symétrique et testé sur seize cases"
```

---

### Task 3: Le méta — toupies débloquées, cadeau, boutique, migration schéma 3

**Files:**
- Modify: `src/sim/types.ts:60-74` (`MetaState`)
- Modify: `src/sim/meta.ts:8-21` (`createInitialMeta`) et fin de fichier
- Modify: `src/sim/save.ts:7` (`SAVE_SCHEMA`), `:47-64` (`hydrate`), `:96-113` (`isComplete`)
- Modify: `src/content/balance.json`, `src/sim/config.ts`
- Modify: `src/sim/meta.test.ts`, `src/sim/save.test.ts`

**Interfaces:**
- Consumes: `ToupieId`, `TOUPIES`, `STARTER_TOUPIE`, `toupieById` (Task 1)
- Produces:
  - `MetaState.toupies: { unlocked: ToupieId[]; active: ToupieId }`
  - `MetaState.founderGiftClaimed: boolean`
  - `activeToupie(meta: MetaState): Toupie`
  - `setActiveToupie(meta: MetaState, id: ToupieId): boolean`
  - `buyToupie(meta: MetaState, id: ToupieId): boolean`
  - `claimFounderGift(meta: MetaState, id: ToupieId): boolean`
  - `canClaimFounderGift(meta: MetaState): boolean`
  - `TOUPIE_SHOP` export de `config.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à la fin de `src/sim/meta.test.ts` (garder les imports existants, ajouter ceux qui manquent) :

```ts
describe('toupies du méta', () => {
  it('démarre avec la seule toupie de départ, active', () => {
    const meta = createInitialMeta(1);
    expect(meta.toupies.unlocked).toEqual(['brasier-solaire']);
    expect(meta.toupies.active).toBe('brasier-solaire');
    expect(meta.founderGiftClaimed).toBe(false);
  });

  it('n’active que ce qui est débloqué', () => {
    const meta = createInitialMeta(1);
    expect(setActiveToupie(meta, 'typhon-primal')).toBe(false);
    expect(meta.toupies.active).toBe('brasier-solaire');
  });

  it('achète une toupie, une seule fois, et débite les gemmes', () => {
    const meta = createInitialMeta(1);
    meta.gems = TOUPIE_SHOP.priceGems * 2;
    expect(buyToupie(meta, 'typhon-primal')).toBe(true);
    expect(meta.gems).toBe(TOUPIE_SHOP.priceGems);
    expect(meta.toupies.unlocked).toContain('typhon-primal');
    // Deuxième achat de la même : refusé, et surtout pas débité.
    expect(buyToupie(meta, 'typhon-primal')).toBe(false);
    expect(meta.gems).toBe(TOUPIE_SHOP.priceGems);
  });

  it('refuse l’achat sans les gemmes, sans rien débiter', () => {
    const meta = createInitialMeta(1);
    meta.gems = TOUPIE_SHOP.priceGems - 1;
    expect(buyToupie(meta, 'typhon-primal')).toBe(false);
    expect(meta.gems).toBe(TOUPIE_SHOP.priceGems - 1);
    expect(meta.toupies.unlocked).toEqual(['brasier-solaire']);
  });

  it('n’ouvre le cadeau qu’une fois le chapitre validé', () => {
    const meta = createInitialMeta(1);
    expect(canClaimFounderGift(meta)).toBe(false);
    expect(claimFounderGift(meta, 'carapace-abyssale')).toBe(false);
    meta.chapterValidated = true;
    expect(canClaimFounderGift(meta)).toBe(true);
    expect(claimFounderGift(meta, 'carapace-abyssale')).toBe(true);
    expect(meta.toupies.unlocked).toContain('carapace-abyssale');
    expect(meta.founderGiftClaimed).toBe(true);
  });

  // Le drapeau explicite existe pour ce cas précis : la déduction
  // « unlocked.length === 1 » deviendrait fausse dès qu’on achète avant de réclamer.
  it('laisse le cadeau réclamable après un achat en boutique', () => {
    const meta = createInitialMeta(1);
    meta.chapterValidated = true;
    meta.gems = TOUPIE_SHOP.priceGems;
    buyToupie(meta, 'typhon-primal');
    expect(canClaimFounderGift(meta)).toBe(true);
    expect(claimFounderGift(meta, 'tigre-foudre')).toBe(true);
    expect(meta.toupies.unlocked).toHaveLength(3);
  });

  it('ne réclame pas deux fois', () => {
    const meta = createInitialMeta(1);
    meta.chapterValidated = true;
    claimFounderGift(meta, 'carapace-abyssale');
    expect(canClaimFounderGift(meta)).toBe(false);
    expect(claimFounderGift(meta, 'tigre-foudre')).toBe(false);
    expect(meta.toupies.unlocked).not.toContain('tigre-foudre');
  });

  it('refuse de réclamer une toupie déjà possédée', () => {
    const meta = createInitialMeta(1);
    meta.chapterValidated = true;
    expect(claimFounderGift(meta, 'brasier-solaire')).toBe(false);
    expect(meta.founderGiftClaimed).toBe(false);
  });
});
```

Ajouter à `src/sim/save.test.ts` :

```ts
describe('migration schéma 2 → 3', () => {
  it('donne la toupie de départ et un cadeau en attente à une sauvegarde v2', () => {
    const v2 = createInitialMeta(9);
    delete (v2 as unknown as Record<string, unknown>).toupies;
    delete (v2 as unknown as Record<string, unknown>).founderGiftClaimed;
    const restored = deserializeMeta(JSON.stringify({ v: 2, meta: v2 }));
    expect(restored).not.toBeNull();
    expect(restored!.toupies).toEqual({ unlocked: ['brasier-solaire'], active: 'brasier-solaire' });
    expect(restored!.founderGiftClaimed).toBe(false);
  });

  it('retombe sur la toupie de départ si l’active n’est pas débloquée', () => {
    const meta = createInitialMeta(9);
    meta.toupies = { unlocked: ['brasier-solaire'], active: 'tigre-foudre' };
    const restored = deserializeMeta(JSON.stringify({ v: 3, meta }));
    expect(restored!.toupies.active).toBe('brasier-solaire');
  });

  it('rejette un blob au schéma courant privé de ses toupies', () => {
    const meta = createInitialMeta(9);
    delete (meta as unknown as Record<string, unknown>).toupies;
    expect(deserializeMeta(JSON.stringify({ v: 3, meta }))).toBeNull();
  });

  it('écarte un identifiant de toupie inconnu au lieu de le propager', () => {
    const meta = createInitialMeta(9);
    meta.toupies = { unlocked: ['brasier-solaire', 'nawak' as never], active: 'brasier-solaire' };
    const restored = deserializeMeta(JSON.stringify({ v: 3, meta }));
    expect(restored!.toupies.unlocked).toEqual(['brasier-solaire']);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/sim/meta.test.ts src/sim/save.test.ts`
Expected: FAIL — `setActiveToupie is not defined`, `meta.toupies` indéfini.

- [ ] **Step 3: Le prix dans `balance.json` et `config.ts`**

Dans `src/content/balance.json`, ajouter après le bloc `"econ"` :

```json
  "toupieShop": { "priceGems": 900 },
```

Dans `src/sim/config.ts`, dans `Balance` après `econ` :

```ts
  toupieShop: { priceGems: number };
```

et l'export :

```ts
export const TOUPIE_SHOP = BALANCE.toupieShop;
```

- [ ] **Step 4: Étendre `MetaState`**

Dans `src/sim/types.ts`, importer `ToupieId` et ajouter les deux champs à `MetaState` :

```ts
import type { ToupieId } from '../content/toupies';
```

```ts
export interface MetaState {
  rngState: number;
  credits: number;
  gems: number;
  equipped: Record<Slot, PieceInstance>;
  inventory: PieceStack[];
  pity: Record<ChestKind, number>;
  chapterValidated: boolean;
  /** Les toupies possédées et celle qu'on pilote. `unlocked` est une liste et
   *  non un `Set` : elle doit se sérialiser en JSON. */
  toupies: { unlocked: ToupieId[]; active: ToupieId };
  /** Le Fondateur offert à la validation du chapitre a-t-il été réclamé ?
   *  Champ explicite, et non déduit de `unlocked.length` : la déduction
   *  deviendrait fausse dès qu'un joueur achète avant de réclamer. */
  founderGiftClaimed: boolean;
}
```

- [ ] **Step 5: Les opérations dans `meta.ts`**

Dans `src/sim/meta.ts`, ajouter aux imports :

```ts
import { STARTER_TOUPIE, toupieById, type Toupie, type ToupieId } from '../content/toupies';
import { SALLES_PER_CHAPTER, TOUPIE_SHOP } from './config';
```

(`SALLES_PER_CHAPTER` est déjà importé — n'ajouter que `TOUPIE_SHOP`.)

Dans `createInitialMeta`, ajouter au littéral retourné :

```ts
    toupies: { unlocked: [STARTER_TOUPIE], active: STARTER_TOUPIE },
    founderGiftClaimed: false,
```

Puis, à la fin du fichier :

```ts
export function activeToupie(meta: MetaState): Toupie {
  return toupieById(meta.toupies.active);
}

/** Bascule la toupie pilotée. Gratuit et réversible : aucune pièce ne bouge,
 *  toutes sont interchangeables. C'est ce qui fait de la contre-pioche une
 *  décision qu'on reprend avant chaque run, et non un engagement. */
export function setActiveToupie(meta: MetaState, id: ToupieId): boolean {
  if (!meta.toupies.unlocked.includes(id)) return false;
  meta.toupies.active = id;
  return true;
}

export function buyToupie(meta: MetaState, id: ToupieId): boolean {
  if (meta.toupies.unlocked.includes(id)) return false;
  if (meta.gems < TOUPIE_SHOP.priceGems) return false;
  meta.gems -= TOUPIE_SHOP.priceGems;
  meta.toupies.unlocked.push(id);
  return true;
}

export function canClaimFounderGift(meta: MetaState): boolean {
  return meta.chapterValidated && !meta.founderGiftClaimed;
}

/** Le Fondateur offert pour avoir franchi le mur. Le joueur choisit lequel :
 *  c'est ce choix qui ouvre le triangle, jusque-là inerte pour un joueur qui
 *  n'a qu'Équilibre. */
export function claimFounderGift(meta: MetaState, id: ToupieId): boolean {
  if (!canClaimFounderGift(meta)) return false;
  if (meta.toupies.unlocked.includes(id)) return false;
  meta.toupies.unlocked.push(id);
  meta.founderGiftClaimed = true;
  return true;
}
```

- [ ] **Step 6: La migration dans `save.ts`**

Passer `SAVE_SCHEMA` à `3` et remplacer son commentaire par un rappel des deux migrations vivantes.

Ajouter, avant `hydrate` :

```ts
const KNOWN_TOUPIES = new Set<string>(TOUPIES.map((t) => t.id));

/**
 * Normalise le bloc `toupies`. Trois cas se rejoignent ici : le champ absent
 * (schéma 2, migration), un identifiant inconnu (données trafiquées ou
 * catalogue réduit depuis), et une toupie active qu'on ne possède pas. Tous
 * retombent sur la toupie de départ plutôt que de propager une valeur qui
 * ferait lever `toupieById` à la création du run.
 */
function hydrateToupies(raw: unknown): MetaState['toupies'] {
  const fallback = { unlocked: [STARTER_TOUPIE], active: STARTER_TOUPIE };
  if (typeof raw !== 'object' || raw === null) return fallback;
  const t = raw as Record<string, unknown>;
  const unlocked = Array.isArray(t.unlocked)
    ? (t.unlocked.filter((id): id is ToupieId => typeof id === 'string' && KNOWN_TOUPIES.has(id)))
    : [];
  if (!unlocked.includes(STARTER_TOUPIE)) unlocked.unshift(STARTER_TOUPIE);
  const active = typeof t.active === 'string' && unlocked.includes(t.active as ToupieId)
    ? (t.active as ToupieId)
    : STARTER_TOUPIE;
  return { unlocked, active };
}
```

Dans `hydrate`, ajouter au littéral :

```ts
    toupies: hydrateToupies(partial.toupies),
    founderGiftClaimed: partial.founderGiftClaimed === true,
```

Dans `isComplete`, ajouter à la conjonction :

```ts
    typeof m.toupies === 'object' && m.toupies !== null &&
    Array.isArray((m.toupies as Record<string, unknown>).unlocked) &&
    typeof (m.toupies as Record<string, unknown>).active === 'string' &&
```

Imports à ajouter en tête de `save.ts` :

```ts
import { STARTER_TOUPIE, TOUPIES, type ToupieId } from '../content/toupies';
```

- [ ] **Step 7: Lancer les tests, vérifier qu'ils passent**

Run: `npm run test && npm run build`
Expected: tous verts. Les 175 tests d'origine plus les nouveaux.

- [ ] **Step 8: Commit**

```bash
git add src/sim/types.ts src/sim/meta.ts src/sim/save.ts src/sim/meta.test.ts src/sim/save.test.ts src/content/balance.json src/sim/config.ts
git commit -m "feat(2b): toupies dans le méta, boutique et cadeau de validation, migration schéma 3"
```

---

### Task 4: `Top.type` et `Top.mass` — typer joueur et bots

`mass` cesse d'être lu depuis `TalentMods` par le combat : trois systèmes y contribuent désormais (châssis, modèle de Disque, talent Masse), donc `Top` porte le produit résolu. `TalentMods.mass` **reste**, mais comme contribution du seul talent.

**Files:**
- Modify: `src/sim/types.ts` (`Top`, `Stats`)
- Modify: `src/sim/combat.ts:64-71` (l'impulsion)
- Modify: `src/sim/salle.ts:10-33` (`makeBot`)
- Modify: `src/sim/sim.ts:11-29` (`makePlayer`), `:71-82` (`syncRunStats`)
- Modify: `src/content/balance.json`, `src/sim/config.ts`
- Modify: `src/sim/salle.test.ts`, `src/sim/combat.test.ts`

**Interfaces:**
- Consumes: `TopType` (Task 1), `activeToupie` (Task 3)
- Produces: `Top.type: TopType`, `Top.mass: number`, `botTypeFor(chapter: number, salle: number): TopType` exporté de `src/sim/salle.ts`

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/sim/salle.test.ts` :

```ts
describe('types des bots', () => {
  it('suit la table du chapitre 1', () => {
    expect([1, 2, 3].map((s) => botTypeFor(1, s))).toEqual(['endurance', 'endurance', 'endurance']);
    expect([4, 5, 6].map((s) => botTypeFor(1, s))).toEqual(['defense', 'defense', 'defense']);
    expect([7, 8, 9].map((s) => botTypeFor(1, s))).toEqual(['attaque', 'attaque', 'attaque']);
    expect(botTypeFor(1, 10)).toBe('attaque');
  });

  it('borne les salles hors plage au lieu de rendre indéfini', () => {
    expect(botTypeFor(1, 0)).toBe('endurance');
    expect(botTypeFor(1, 99)).toBe('attaque');
  });

  it('retombe sur le chapitre 1 pour un chapitre sans table', () => {
    expect(botTypeFor(7, 5)).toBe(botTypeFor(1, 5));
  });

  it('donne son type au bot qu’il fabrique, et une masse ordinaire', () => {
    const bot = makeBot(1, 5, 0, 0);
    expect(bot.type).toBe('defense');
    expect(bot.mass).toBe(1);
  });
});
```

> **Note pour l'implémenteur** : `makeBot` gagne un paramètre `chapter` en tête. Sa signature devient `makeBot(chapter: number, salle: number, index: number, angle: number)`. Mettre à jour tous les appels — `spawnSalle` et les tests existants de `salle.test.ts`.

Ajouter à `src/sim/combat.test.ts` :

```ts
it('lit la masse sur la toupie, pas sur ses talents', () => {
  const a = top({ pos: { x: -10, y: 0 }, vel: { x: 100, y: 0 } });
  const b = top({ pos: { x: 10, y: 0 }, vel: { x: 0, y: 0 } });
  a.mass = 4;
  const before = b.vel.x;
  resolveCollision(a, b);
  // Une toupie quatre fois plus lourde pousse : la légère repart plus vite
  // que dans un choc à masses égales.
  expect(b.vel.x).toBeGreaterThan(before + 100);
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/sim/salle.test.ts src/sim/combat.test.ts`
Expected: FAIL — `botTypeFor is not defined`, `bot.type` indéfini.

- [ ] **Step 3: La table dans `balance.json` et `config.ts`**

Dans `src/content/balance.json`, ajouter après le bloc `"chapter"` :

```json
  "botTypes": {
    "1": ["endurance", "endurance", "endurance", "defense", "defense", "defense", "attaque", "attaque", "attaque", "attaque"]
  },
```

Dans `src/sim/config.ts`, dans `Balance` après `chapter` :

```ts
  /** Type des bots, par chapitre puis par salle. Un chapitre absent retombe
   *  sur le chapitre 1 — les chapitres 2 à 8 arrivent aux jalons 3 et 4. */
  botTypes: Record<string, TopType[]>;
```

avec l'import `import type { TopType } from '../content/toupies';` en tête, et l'export :

```ts
export const BOT_TYPES = BALANCE.botTypes;
```

Ajouter aussi à `src/sim/config.test.ts` une validation d'exécution, dans le même esprit que les autres :

```ts
it('a une table de types de bots complète pour le chapitre 1', () => {
  const table = BALANCE.botTypes['1'];
  expect(table).toHaveLength(BALANCE.chapter.sallesPerChapter);
  const valid = ['attaque', 'endurance', 'defense', 'equilibre'];
  for (const t of table) expect(valid).toContain(t);
});
```

- [ ] **Step 4: Les deux champs sur `Top` et `Stats`**

Dans `src/sim/types.ts`, ajouter à `Top` :

```ts
  /** Type du triangle des forces. Vient du châssis pour le joueur, de la table
   *  de chapitre pour les bots. */
  type: TopType;
  /** Masse résolue pour le calcul d'impulsion : châssis × modèle de Disque ×
   *  talent Masse. Vit sur la toupie et non dans `talents`, parce que trois
   *  systèmes y contribuent — `talents.mass` n'est plus que l'un d'eux. */
  mass: number;
```

et à `Stats` :

```ts
  accel: number;
  /** Masse issue des seuls profils. Le talent Masse s'y multiplie au montage
   *  de la toupie, pas ici. */
  mass: number;
```

avec `import type { TopType } from '../content/toupies';`.

- [ ] **Step 5: `resolveCollision` lit `Top.mass`**

Dans `src/sim/combat.ts`, remplacer :

```ts
  const ma = a.talents.mass;
  const mb = b.talents.mass;
```

par :

```ts
  const ma = a.mass;
  const mb = b.mass;
```

Le commentaire au-dessus (« Impulsion pondérée par les masses. À masses égales (1 et 1)… ») reste valable tel quel.

- [ ] **Step 6: `botTypeFor` et `makeBot`**

Dans `src/sim/salle.ts`, ajouter `BOT_TYPES` aux imports depuis `./config`, `import type { TopType } from '../content/toupies';`, puis :

```ts
/** Type des bots d'une salle. La table est indexée par chapitre ; un chapitre
 *  sans entrée retombe sur celle du chapitre 1, ce qui laisse les chapitres 2
 *  à 8 arriver un par un sans casser la simulation entre-temps. */
export function botTypeFor(chapter: number, salle: number): TopType {
  const table = BOT_TYPES[String(chapter)] ?? BOT_TYPES['1'];
  return table[Math.min(Math.max(1, salle), table.length) - 1];
}
```

Dans `makeBot`, ajouter le paramètre `chapter` en tête de signature et les deux champs au littéral retourné :

```ts
    type: botTypeFor(chapter, salle),
    mass: 1,
```

`spawnSalle` gagne également `chapter` en premier paramètre et le transmet ; `sim.ts` lui passe `run.chapter`.

- [ ] **Step 7: `makePlayer` et `syncRunStats`**

Dans `src/sim/sim.ts`, importer `activeToupie` de `./meta`. Dans `makePlayer`, ajouter au littéral :

```ts
    type: activeToupie(meta).type,
    mass: stats.mass * resolveTalents(meta).mass,
```

> **Attention** : `resolveTalents(meta)` est déjà appelé plus bas dans le même littéral pour le champ `talents`. Le calculer **une seule fois** dans une variable locale au-dessus du `return`, et l'utiliser aux deux endroits.

Dans `syncRunStats`, ajouter, à côté des autres recopiages :

```ts
  run.player.type = activeToupie(meta).type;
  run.player.accel = stats.accel;
  run.player.mass = stats.mass * talents.mass;
```

en réutilisant la variable `talents` déjà calculée pour `run.player.talents`.

> `Stats.accel` et `Stats.mass` n'existent pas encore à ce stade — la Task 6 les remplit. Pour cette tâche, `playerStats` doit déjà les retourner avec les valeurs neutres : `accel: PLAYER_BASE.accel` et `mass: 1`. La Task 6 y branchera les profils.

- [ ] **Step 8: Lancer les tests, vérifier qu'ils passent**

Run: `npm run test && npm run build`
Expected: tous verts. **Les trois tests du partage de charge doivent passer sans avoir été touchés** — vérifier avec `git diff src/sim/combat.test.ts` que seul le nouveau test de masse a été ajouté.

- [ ] **Step 9: Commit**

```bash
git add src/sim src/content/balance.json
git commit -m "feat(2b): type et masse portés par la toupie, table de types de bots par salle"
```

---

### Task 5: Le triangle dans `damage()`

**Files:**
- Modify: `src/sim/combat.ts:29-38` (`damage`)
- Modify: `src/sim/combat.test.ts`

**Interfaces:**
- Consumes: `typeMult` (Task 2), `Top.type` (Task 4)
- Produces: aucune nouvelle signature — un facteur de plus dans `damage`.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/sim/combat.test.ts` :

```ts
describe('triangle des forces dans le combat', () => {
  /** Deux toupies identiques qui se percutent de face : tout écart de dégâts
   *  ne peut venir que du type. */
  function headOn(attType: TopType, defType: TopType) {
    const a = top({ pos: { x: -10, y: 0 }, vel: { x: 100, y: 0 }, type: attType });
    const b = top({ pos: { x: 10, y: 0 }, vel: { x: -100, y: 0 }, type: defType });
    const spinB = b.spin;
    resolveCollision(a, b);
    return spinB - b.spin;
  }

  it('fait mal quand le type domine', () => {
    const neutre = headOn('attaque', 'attaque');
    const dominant = headOn('attaque', 'endurance');
    expect(dominant).toBeGreaterThan(neutre);
    expect(dominant / neutre).toBeCloseTo(1.25, 2);
  });

  it('donne à Équilibre son +10 % contre tous', () => {
    const neutre = headOn('attaque', 'attaque');
    for (const def of ['attaque', 'endurance', 'defense', 'equilibre'] as TopType[]) {
      expect(headOn('equilibre', def) / neutre).toBeCloseTo(1.1, 2);
    }
  });

  it('n’expose jamais Équilibre au +25 %', () => {
    const neutre = headOn('attaque', 'attaque');
    expect(headOn('attaque', 'equilibre') / neutre).toBeCloseTo(1, 2);
  });

  it('joue dans les deux sens — le bot dominant frappe plus fort aussi', () => {
    const a = top({ pos: { x: -10, y: 0 }, vel: { x: 100, y: 0 }, type: 'attaque' });
    const b = top({ pos: { x: 10, y: 0 }, vel: { x: -100, y: 0 }, type: 'defense' });
    const spinA = a.spin;
    const spinB = b.spin;
    resolveCollision(a, b);
    // Défense domine Attaque : b encaisse moins que ce qu'il inflige.
    expect(spinA - a.spin).toBeGreaterThan(spinB - b.spin);
  });

  // Le triangle s'ajoute au partage de charge, il ne s'y substitue pas.
  it('se compose avec le partage de charge sans l’écraser', () => {
    // Assaut pur : seul a avance. b est immobile.
    const charge = (attType: TopType, defType: TopType) => {
      const a = top({ pos: { x: -10, y: 0 }, vel: { x: 200, y: 0 }, type: attType });
      const b = top({ pos: { x: 10, y: 0 }, vel: { x: 0, y: 0 }, type: defType });
      const spinB = b.spin;
      resolveCollision(a, b);
      return spinB - b.spin;
    };
    const chargeNeutre = charge('attaque', 'attaque');
    const chargeDominante = charge('attaque', 'endurance');
    const frontalNeutre = headOn('attaque', 'attaque');
    // Le rapport de type est le même quel que soit le mode d'engagement…
    expect(chargeDominante / chargeNeutre).toBeCloseTo(1.25, 2);
    // …et la prime de charge existe toujours par-dessus.
    expect(chargeNeutre).toBeGreaterThan(frontalNeutre * 0.9);
  });
});
```

> **Note pour l'implémenteur — le défaut du fabricant `top()` compte.** `top()` (dans `combat.test.ts`) doit accepter un `type` dans ses surcharges, avec **`'attaque'` par défaut**.
>
> Surtout pas `'equilibre'` : ce défaut donnerait +10 % à *toutes* les toupies de *tous* les tests d'avant le jalon et ferait bouger leurs valeurs attendues sans raison. Il faut un type qui ne se domine pas lui-même — `typeMult('attaque', 'attaque')` vaut exactement 1 — pour que les tests existants gardent leurs chiffres au bit près. Si un test d'avant le jalon change de valeur après cette tâche, le défaut est mauvais : le corriger plutôt que d'ajuster le test.

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/sim/combat.test.ts`
Expected: FAIL — les rapports valent 1 partout, le type n'entre pas dans le calcul.

- [ ] **Step 3: Brancher `typeMult` dans `damage`**

Dans `src/sim/combat.ts`, ajouter `import { typeMult } from './typeChart';` et remplacer `damage` :

```ts
/** Dégâts qu'`att` inflige à `def` pour un impact donné. `share` est la part du
 *  rapprochement qu'`att` a elle-même provoquée. Les quatre facteurs se composent :
 *  la charge module selon qui a foncé, Percée retire une part de la défense,
 *  Estoc majore au-delà d'un seuil de vitesse, et le triangle des forces module
 *  selon les types. Aucun ne remplace les autres — en particulier, le triangle
 *  se pose *par-dessus* le partage de charge, qui reste seul juge de qui a foncé. */
function damage(att: Top, def: Top, impact: number, share: number): number {
  const defense = def.defense * (1 - att.talents.defenseIgnore);
  const bonus = impact >= att.talents.estocThreshold ? 1 + att.talents.estocBonus : 1;
  return (
    ((impact * att.attack) / (att.attack + defense)) *
    DAMAGE_K * chargeWeight(share) * bonus * typeMult(att.type, def.type)
  );
}
```

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent**

Run: `npm run test && npm run build`
Expected: tous verts, **y compris les trois tests du partage de charge, non modifiés**.

- [ ] **Step 5: Vérification par mutation — le triangle change vraiment l'issue**

Ceci n'est pas optionnel. Au jalon 2a, trois tests passaient alors que le mécanisme qu'ils prétendaient couvrir était retiré.

1. Retirer `* typeMult(att.type, def.type)` de `damage`.
2. Run: `npx vitest run src/sim/combat.test.ts`
3. **Attendu : ROUGE** sur au moins quatre des cinq tests de `describe('triangle des forces dans le combat')`.
4. Si un test reste vert, il ne prouve rien : le réécrire jusqu'à ce qu'il rougisse.
5. Remettre le facteur, re-vérifier que tout est vert.
6. Consigner le résultat dans le message de commit.

- [ ] **Step 6: Commit**

```bash
git add src/sim/combat.ts src/sim/combat.test.ts
git commit -m "feat(2b): le triangle des forces module les dégâts, des deux côtés du choc"
```

---

### Task 6: Les profils — sept axes, quatre châssis, douze modèles

**Files:**
- Create: `src/sim/profile.ts`
- Create: `src/sim/profile.test.ts`
- Modify: `src/content/balance.json`, `src/sim/config.ts`
- Modify: `src/sim/economy.ts:22-30` (`playerStats`)
- Modify: `src/sim/economy.test.ts`

**Interfaces:**
- Consumes: `activeToupie` (Task 3), `Stats.accel` / `Stats.mass` (Task 4)
- Produces: `ProfileAxis`, `StatProfile`, `NEUTRAL_PROFILE`, `resolveProfile(meta: MetaState): Record<ProfileAxis, number>`

- [ ] **Step 1: Écrire les tests qui échouent**

Créer `src/sim/profile.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { createInitialMeta } from './meta';
import { resolveProfile } from './profile';
import { playerStats } from './economy';
import { PLAYER_BASE } from './config';

describe('resolveProfile', () => {
  it('est strictement neutre pour l’équipement de départ', () => {
    const p = resolveProfile(createInitialMeta(1));
    for (const axis of Object.values(p)) expect(axis).toBe(1);
  });

  it('multiplie châssis, Disque et Pointe sur le même axe', () => {
    const meta = createInitialMeta(1);
    meta.toupies = { unlocked: ['brasier-solaire', 'carapace-abyssale'], active: 'carapace-abyssale' };
    meta.equipped.disque = { model: 'disque.colosse', rank: 1, level: 0 };
    // Carapace ×1,40 et Colosse ×1,30 sur la masse.
    expect(resolveProfile(meta).mass).toBeCloseTo(1.4 * 1.3, 5);
  });

  it('laisse à 1 les axes qu’aucun profil ne touche', () => {
    const meta = createInitialMeta(1);
    meta.equipped.pointe = { model: 'pointe.aiguille', rank: 1, level: 0 };
    expect(resolveProfile(meta).defense).toBe(1);
  });
});

describe('playerStats avec les profils', () => {
  it('ne bouge pas d’un iota pour une sauvegarde neuve', () => {
    const s = playerStats(createInitialMeta(1));
    expect(s.attack).toBeCloseTo(PLAYER_BASE.attack, 9);
    expect(s.defense).toBeCloseTo(PLAYER_BASE.defense, 9);
    expect(s.maxSpeed).toBeCloseTo(PLAYER_BASE.maxSpeed, 9);
    expect(s.spinMax).toBeCloseTo(PLAYER_BASE.spinMax, 9);
    expect(s.spinDecay).toBeCloseTo(PLAYER_BASE.spinDecay, 9);
    expect(s.accel).toBeCloseTo(PLAYER_BASE.accel, 9);
    expect(s.mass).toBe(1);
  });

  it('applique le châssis à l’accélération', () => {
    const meta = createInitialMeta(1);
    meta.toupies = { unlocked: ['brasier-solaire', 'typhon-primal'], active: 'typhon-primal' };
    expect(playerStats(meta).accel).toBeCloseTo(PLAYER_BASE.accel * 1.25, 6);
  });

  // La décroissance est une perte : un multiplicateur < 1 est un gain.
  it('compose la décroissance dans le bon sens', () => {
    const meta = createInitialMeta(1);
    meta.toupies = { unlocked: ['brasier-solaire', 'tigre-foudre'], active: 'tigre-foudre' };
    const base = playerStats(createInitialMeta(1)).spinDecay;
    expect(playerStats(meta).spinDecay).toBeCloseTo(base * 0.75, 6);
    expect(playerStats(meta).spinDecay).toBeLessThan(base);
  });

  it('empile profil et rang sur le même axe sans que l’un n’écrase l’autre', () => {
    const meta = createInitialMeta(1);
    meta.equipped.pointe = { model: 'pointe.furie', rank: 1, level: 0 };
    const withProfile = playerStats(meta).maxSpeed;
    meta.equipped.pointe = { model: 'pointe.furie', rank: 3, level: 0 };
    const withRank = playerStats(meta).maxSpeed;
    expect(withRank).toBeCloseTo(withProfile * Math.pow(1.08, 2), 6);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/sim/profile.test.ts`
Expected: FAIL — `Failed to resolve import "./profile"`.

- [ ] **Step 3: Les profils dans `balance.json`**

Ajouter, après le bloc `"pieceEffect"` :

```json
  "chassis": {
    "brasier-solaire": {},
    "typhon-primal": { "accel": 1.25, "maxSpeed": 1.1, "spinMax": 0.85 },
    "carapace-abyssale": { "mass": 1.4, "defense": 1.2, "spinMax": 1.15, "accel": 0.8 },
    "tigre-foudre": { "spinDecay": 0.75, "maxSpeed": 1.05, "attack": 0.9 }
  },
  "models": {
    "disque.lourd": {},
    "disque.gravite": { "mass": 1.2, "accel": 0.9 },
    "disque.eventail": { "defense": 1.1, "spinDecay": 0.92 },
    "disque.axial": { "defense": 1.15, "mass": 0.95 },
    "disque.colosse": { "mass": 1.3, "defense": 1.25, "maxSpeed": 0.85 },
    "disque.meteorite": { "mass": 1.15, "defense": 0.9, "attack": 1.1 },
    "pointe.plate": {},
    "pointe.aiguille": { "spinDecay": 0.75, "maxSpeed": 0.9 },
    "pointe.orbitale": { "maxSpeed": 1.05, "spinDecay": 0.9, "accel": 0.9 },
    "pointe.gyroscope": { "accel": 1.2, "maxSpeed": 0.95 },
    "pointe.furie": { "maxSpeed": 1.3, "accel": 1.1, "spinDecay": 1.3 },
    "pointe.ressort": { "spinDecay": 0.88, "mass": 1.1, "maxSpeed": 0.95 }
  },
```

> `disque.lourd` et `pointe.plate` — l'équipement de départ — sont **délibérément vides**. C'est le garde-fou du jalon : une sauvegarde neuve ne voit bouger aucune stat de pièce, donc tout écart mesuré au chapitre 1 vient du triangle et de rien d'autre. Ne pas les remplir.

Les Lames et Noyaux signature n'ont pas d'entrée : leur profil est neutre. `resolveProfile` ne consulte que le châssis, le Disque et la Pointe.

Dans `src/sim/config.ts`, ajouter à `Balance` :

```ts
  chassis: Record<string, Partial<Record<ProfileAxis, number>>>;
  models: Record<string, Partial<Record<ProfileAxis, number>>>;
```

avec `import type { ProfileAxis } from './profile';` et les exports :

```ts
export const CHASSIS = BALANCE.chassis;
export const MODELS_PROFILE = BALANCE.models;
```

Ajouter à `src/sim/config.test.ts` :

```ts
it('a un profil de châssis par toupie et laisse la toupie de départ neutre', () => {
  for (const t of TOUPIES) expect(BALANCE.chassis[t.id]).toBeDefined();
  expect(BALANCE.chassis['brasier-solaire']).toEqual({});
});

it('laisse l’équipement de départ strictement neutre', () => {
  expect(BALANCE.models['disque.lourd']).toEqual({});
  expect(BALANCE.models['pointe.plate']).toEqual({});
});

it('n’a que des multiplicateurs strictement positifs', () => {
  for (const p of [...Object.values(BALANCE.chassis), ...Object.values(BALANCE.models)]) {
    for (const v of Object.values(p)) expect(v).toBeGreaterThan(0);
  }
});
```

- [ ] **Step 4: Écrire `profile.ts`**

Créer `src/sim/profile.ts` :

```ts
import { CHASSIS, MODELS_PROFILE } from './config';
import type { MetaState } from './types';

/** Les sept axes qu'un profil peut multiplier. Châssis et modèles génériques
 *  puisent dans le même jeu : rien n'interdit à un Disque de peser sur la
 *  vitesse ni à une Pointe sur la masse. Ce qui distingue les systèmes est
 *  l'emphase, pas l'axe autorisé.
 *
 *  `spinDecay` est le piège : c'est une *perte* de spin par seconde, donc un
 *  multiplicateur inférieur à 1 est un gain. Les six autres vont dans l'autre sens. */
export type ProfileAxis =
  | 'attack' | 'defense' | 'maxSpeed' | 'spinMax' | 'accel' | 'mass' | 'spinDecay';

export type StatProfile = Partial<Record<ProfileAxis, number>>;

const AXES: ProfileAxis[] = [
  'attack', 'defense', 'maxSpeed', 'spinMax', 'accel', 'mass', 'spinDecay',
];

export const NEUTRAL_PROFILE: Record<ProfileAxis, number> = Object.fromEntries(
  AXES.map((a) => [a, 1]),
) as Record<ProfileAxis, number>;

/** Produit des profils qui pèsent sur la toupie : le châssis, le modèle de
 *  Disque et le modèle de Pointe. Les Lames et Noyaux n'ont pas de profil —
 *  leur différenciation passe par le talent signature de leur rang.
 *
 *  Tout se compose par multiplication : rien n'écrase rien. Un Colosse (masse
 *  ×1,30) sur une Carapace Abyssale (×1,40) donne ×1,82, auquel le talent
 *  Masse ajoutera encore son facteur au montage de la toupie. */
export function resolveProfile(meta: MetaState): Record<ProfileAxis, number> {
  const out = { ...NEUTRAL_PROFILE };
  const sources: (StatProfile | undefined)[] = [
    CHASSIS[meta.toupies.active],
    MODELS_PROFILE[meta.equipped.disque.model],
    MODELS_PROFILE[meta.equipped.pointe.model],
  ];
  for (const source of sources) {
    if (!source) continue;
    for (const axis of AXES) {
      const v = source[axis];
      if (v !== undefined) out[axis] *= v;
    }
  }
  return out;
}
```

- [ ] **Step 5: Brancher les profils dans `playerStats`**

Dans `src/sim/economy.ts`, importer `resolveProfile` et remplacer `playerStats` :

```ts
export function playerStats(meta: MetaState): Stats {
  const { lame, disque, pointe, noyau } = meta.equipped;
  const p = resolveProfile(meta);
  return {
    attack: PLAYER_BASE.attack * factor(lame, PIECE_EFFECT.lameAttack) * p.attack,
    defense: PLAYER_BASE.defense * factor(disque, PIECE_EFFECT.disqueDefense) * p.defense,
    maxSpeed: PLAYER_BASE.maxSpeed * factor(pointe, PIECE_EFFECT.pointeSpeed) * p.maxSpeed,
    spinMax: PLAYER_BASE.spinMax * factor(noyau, PIECE_EFFECT.noyauSpin) * p.spinMax,
    // La Pointe *divise* la décroissance par son facteur de rang et de niveau
    // (c'est une perte : diviser est un gain) ; le profil, lui, multiplie, et
    // ses valeurs sont écrites en conséquence — 0,75 veut dire « perd 25 % moins vite ».
    spinDecay: (PLAYER_BASE.spinDecay / factor(pointe, PIECE_EFFECT.pointeDecay)) * p.spinDecay,
    accel: PLAYER_BASE.accel * p.accel,
    mass: p.mass,
  };
}
```

- [ ] **Step 6: Lancer les tests, vérifier qu'ils passent**

Run: `npm run test && npm run build`
Expected: tous verts.

- [ ] **Step 7: Vérification par mutation — le châssis change vraiment le pilotage**

1. Dans `balance.json`, vider le profil de `typhon-primal` (`{}`).
2. Run: `npx vitest run src/sim/profile.test.ts`
3. **Attendu : ROUGE** sur « applique le châssis à l'accélération » et sur le test de composition.
4. Remettre le profil, re-vérifier que tout est vert.

- [ ] **Step 8: Commit**

```bash
git add src/sim/profile.ts src/sim/profile.test.ts src/sim/economy.ts src/sim/economy.test.ts src/sim/config.ts src/sim/config.test.ts src/content/balance.json
git commit -m "feat(2b): profils de stats des châssis et des douze modèles génériques"
```

---

### Task 7: Coffres — les doublons signature suivent les toupies débloquées

**Files:**
- Modify: `src/sim/chest.ts:38-45` (le tirage du modèle)
- Modify: `src/sim/chest.test.ts`

**Interfaces:**
- Consumes: `TOUPIES` (Task 1), `meta.toupies.unlocked` (Task 3)
- Produces: aucune nouvelle signature publique.

> **Déplacement attendu, pas régression.** Le vivier de modèles de Lame et de Noyau passe de 1 à *n* selon le méta. À graine égale, le tirage `r3` ne désigne donc plus les mêmes modèles qu'avant. Des valeurs attendues de `chest.test.ts` **vont changer**. C'est voulu. Le constater, l'écrire dans le message de commit, et **ne pas** « réparer » en figeant le vivier.

- [ ] **Step 1: Écrire les tests qui échouent**

Ajouter à `src/sim/chest.test.ts`. Trois imports manquent au fichier — les ajouter en tête s'ils n'y sont pas déjà :

```ts
import { modelById } from '../content/pieces';
import { nextRandom } from './rng';
import { createInitialMeta } from './meta';
```

```ts
describe('doublons signature', () => {
  const SIGNATURE_SLOTS = new Set(['lame', 'noyau']);

  it('ne tire que les pièces signature des toupies débloquées', () => {
    const meta = createInitialMeta(1);
    meta.gems = 1_000_000;
    for (let i = 0; i < 200; i++) {
      for (const piece of openChest(meta, 'arene', 10)!) {
        if (!SIGNATURE_SLOTS.has(modelById(piece.model).slot)) continue;
        expect(['lame.couronne-solaire', 'noyau.fournaise']).toContain(piece.model);
      }
    }
  });

  it('ouvre le vivier dès qu’une toupie est débloquée', () => {
    const meta = createInitialMeta(1);
    meta.toupies = { unlocked: ['brasier-solaire', 'typhon-primal'], active: 'brasier-solaire' };
    meta.gems = 1_000_000;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      for (const piece of openChest(meta, 'arene', 10)!) seen.add(piece.model);
    }
    expect(seen).toContain('lame.croc-de-tempete');
    expect(seen).toContain('noyau.oeil-du-cyclone');
    // …et toujours rien des deux toupies non débloquées.
    expect(seen).not.toContain('lame.ecaille-abyssale');
    expect(seen).not.toContain('noyau.caparacon');
  });

  it('consomme toujours exactement trois valeurs de RNG par tirage', () => {
    const meta = createInitialMeta(1);
    meta.toupies = { unlocked: ['brasier-solaire', 'typhon-primal', 'tigre-foudre'], active: 'brasier-solaire' };
    meta.gems = 1_000_000;
    const before = meta.rngState;
    openChest(meta, 'arene', 1);
    let expected = before;
    for (let i = 0; i < 3; i++) expected = nextRandom(expected).state;
    expect(meta.rngState).toBe(expected);
  });

  it('laisse les Disques et Pointes hors du filtrage — ils sont génériques', () => {
    const meta = createInitialMeta(1);
    meta.credits = 1_000_000;
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      for (const piece of openChest(meta, 'bronze', 10)!) seen.add(piece.model);
    }
    expect(seen.size).toBeGreaterThan(6);
  });
});
```

- [ ] **Step 2: Lancer les tests, vérifier qu'ils échouent**

Run: `npx vitest run src/sim/chest.test.ts`
Expected: FAIL sur « ouvre le vivier » — aucune pièce de Typhon ne sort, le filtrage n'existe pas encore et `modelsForSlot('lame')` rend les quatre sans condition.

- [ ] **Step 3: Filtrer le vivier**

Dans `src/sim/chest.ts`, ajouter `import { TOUPIES } from '../content/toupies';` puis, avant `drawOne` :

```ts
/** Les modèles qu'un coffre peut rendre pour cet emplacement. Les Lames et les
 *  Noyaux sont **signature** : leurs doublons ne tombent que pour les toupies
 *  débloquées — c'est la seule source de fusion des pièces signature, et elle
 *  ne doit pas récompenser une toupie qu'on ne possède pas. Les Disques et les
 *  Pointes sont génériques : le vivier complet, toujours. */
function poolFor(meta: MetaState, slot: Slot): PieceModel[] {
  const all = modelsForSlot(slot);
  if (slot !== 'lame' && slot !== 'noyau') return all;
  const allowed = new Set(
    TOUPIES.filter((t) => meta.toupies.unlocked.includes(t.id)).map((t) => t.signature[slot]),
  );
  return all.filter((m) => allowed.has(m.id));
}
```

Dans `drawOne`, remplacer :

```ts
  const models = modelsForSlot(slot);
```

par :

```ts
  const models = poolFor(meta, slot);
```

Ajouter `PieceModel` à l'import depuis `../content/pieces`.

- [ ] **Step 4: Lancer les tests, vérifier qu'ils passent, constater le déplacement**

Run: `npm run test`
Expected: les nouveaux tests passent. **Certains tests existants de `chest.test.ts` peuvent rougir** sur des modèles attendus. Pour chacun : vérifier que l'écart vient bien du vivier élargi (et non d'un décalage du flux de RNG — le test « exactement trois valeurs » le prouve), puis mettre à jour la valeur attendue et **noter le déplacement dans le message de commit**.

- [ ] **Step 5: Vérification par mutation — les doublons suivent le déblocage**

1. Dans `poolFor`, retourner `all` inconditionnellement (supprimer le filtrage).
2. Run: `npx vitest run src/sim/chest.test.ts`
3. **Attendu : ROUGE** sur « ne tire que les pièces signature des toupies débloquées ».
4. Remettre le filtrage, re-vérifier que tout est vert.

- [ ] **Step 6: Commit**

```bash
git add src/sim/chest.ts src/sim/chest.test.ts
git commit -m "feat(2b): les doublons signature ne tombent que pour les toupies débloquées"
```

---

### Task 8: L'écran Toupies

**Files:**
- Create: `src/ui/ToupiesScreen.tsx`
- Modify: `src/ui/TabBar.tsx` (retirer le verrou)
- Modify: `src/ui/App.tsx:9` (import), `:98-100` (montage)

**Interfaces:**
- Consumes: `TOUPIES`, `activeToupie`, `setActiveToupie`, `buyToupie`, `claimFounderGift`, `canClaimFounderGift`, `botTypeFor`, `TOUPIE_SHOP`, `CHASSIS`
- Produces: `ToupiesScreen({ metaRef, runRef, onChanged })` — même forme de props que `ForgeScreen`.

- [ ] **Step 1: Retirer le verrou de la barre d'onglets**

Dans `src/ui/TabBar.tsx` : ajouter `'toupies'` au type `Tab`, l'étiquette `Toupies` à `LABELS`, l'entrée dans le tableau itéré, et **supprimer entièrement** le bloc `LOCKED` et son `map` — plus aucun onglet n'est verrouillé au 2b, donc le mécanisme n'a plus d'usage. Pas de code mort.

- [ ] **Step 2: Écrire l'écran**

Créer `src/ui/ToupiesScreen.tsx`. Suivre en tout point le style de `ForgeScreen.tsx` : mêmes jetons CSS (`var(--panel)`, `var(--line)`, `var(--ember)`, `var(--muted)`), même police `Oswald` sur les titres, `minHeight: 44` sur les boutons tactiles, textes en français.

L'écran affiche, dans l'ordre :

1. **Le triangle du chapitre courant.** Sans lui, la contre-pioche est une devinette et le critère d'acceptation du jalon tombe. Lire la composition avec `botTypeFor(1, salle)` pour les dix salles et l'afficher groupé — « Salles 1-3 · Endurance », etc.
2. **Le bandeau du cadeau**, visible seulement si `canClaimFounderGift(meta)` : « Tu as franchi le mur. Choisis ton Fondateur. » Le choix se fait par le bouton *Réclamer* de chaque fiche non possédée.
3. **Les quatre fiches**, dans l'ordre de `TOUPIES` : nom, type (avec sa teinte), profil du châssis rendu lisible (`accel ×1,25` → « Accélération +25 % », `spinDecay ×0,75` → « Décroissance −25 % » — **attention au sens**, un facteur < 1 sur la décroissance est un *gain*), et l'état.

Les actions par fiche, mutuellement exclusives :
- possédée et active → une pastille « Pilotée », aucun bouton ;
- possédée, non active → bouton **Équiper** → `setActiveToupie` ;
- non possédée, cadeau en attente → bouton **Réclamer** → `claimFounderGift` ;
- non possédée, pas de cadeau → bouton **Acheter · 900 💎** (le prix vient de `TOUPIE_SHOP.priceGems`, jamais en dur), désactivé si `meta.gems < TOUPIE_SHOP.priceGems`.

Après toute mutation : appeler `syncRunStats(runRef.current, metaRef.current)` **puis** `onChanged()`. C'est ce que fait `ForgeScreen` après un achat, et c'est ce qui fait qu'un changement de toupie prend effet dans la seconde sur le run en cours au lieu d'attendre le suivant.

- [ ] **Step 3: Monter l'écran dans `App.tsx`**

Importer `ToupiesScreen` et ajouter, à côté des deux lignes existantes :

```tsx
      {tab === 'toupies' ? <ToupiesScreen metaRef={metaRef} runRef={runRef} onChanged={metaChanged} /> : null}
```

- [ ] **Step 4: Vérifier dans un vrai navigateur**

Run: `npm run dev`, ouvrir **`http://localhost:5173/spinforge/`** (la racine renvoie 404, la base est `/spinforge/`).

À vérifier de ses yeux, pas en supposant :
1. l'onglet Toupies s'ouvre et n'est plus verrouillé ;
2. les quatre fiches s'affichent, une seule marquée « Pilotée » ;
3. le triangle du chapitre est lisible ;
4. avec des gemmes forcées dans la console, *Acheter* débite et la fiche bascule sur *Équiper* ;
5. *Équiper* change la toupie **et** le retour à l'onglet Combat montre un pilotage différent (Typhon accélère visiblement plus vite que Carapace) ;
6. rien ne déborde à 460 px de large, les boutons font au moins 44 px de haut.

- [ ] **Step 5: Captures**

Run: `npm run shots` — vérifier que les captures produites montrent bien le nouvel écran.

- [ ] **Step 6: Commit**

```bash
git add src/ui/ToupiesScreen.tsx src/ui/TabBar.tsx src/ui/App.tsx
git commit -m "feat(2b): écran Toupies — équiper, acheter, réclamer, et lire le triangle du chapitre"
```

---

### Task 9: L'arène donne à lire le type des bots

Sans repère visuel, le triangle est invisible pendant le combat : le joueur subit un écart de dégâts qu'il ne peut relier à rien.

**Files:**
- Modify: `src/theme.ts` (teintes de type)
- Modify: `src/render/snapshot.ts:5-17` (`TopSnapshot`), `:24-33` (`snap`)
- Modify: `src/render/topView.ts`
- Modify: `src/render/snapshot.test.ts`

**Interfaces:**
- Consumes: `Top.type` (Task 4)
- Produces: `TYPE_TINT: Record<TopType, number>` dans `theme.ts`, `TopSnapshot.type: TopType`

- [ ] **Step 1: Les teintes dans le thème**

Dans `src/theme.ts`, ajouter après `PALETTE` — **aucune couleur en dur ailleurs**, c'est la règle du fichier :

```ts
/** Une teinte par type, pour le repère porté par chaque toupie. Distinctes de
 *  `PALETTE.player` / `.bot` / `.boss`, qui disent le camp : le camp et le type
 *  sont deux informations différentes et doivent rester lisibles séparément. */
export const TYPE_TINT: Record<TopType, number> = {
  attaque: 0xff5f56,
  endurance: 0x5fd98a,
  defense: 0x5f9dff,
  equilibre: 0xd7c9a8,
};
```

avec `import type { TopType } from './content/toupies';` — **attention au chemin**, `theme.ts` est à la racine de `src/`, donc `./content/toupies`.

- [ ] **Step 2: Le type dans l'instantané**

Dans `src/render/snapshot.ts`, ajouter `type: TopType;` à `TopSnapshot` (avec son import) et `type: top.type,` dans `snap()`.

Ajouter à `src/render/snapshot.test.ts` :

```ts
it('emporte le type de chaque toupie', () => {
  const run = createRun(createInitialMeta(1), 1);
  const s = takeSnapshot(run);
  expect(s.tops[0].type).toBe('equilibre');
  expect(s.tops[1].type).toBe('endurance');
});
```

- [ ] **Step 3: Le repère sur la toupie**

Dans `src/render/topView.ts`, ajouter un petit repère de type sur chaque toupie **non joueur** : un point (ou un arc court) sur l'anneau, teinté par `TYPE_TINT[type]`.

Trois contraintes fermes :
- la teinte du repère est **constante, jamais passée dans `spinTint`**. C'est la règle déjà posée pour le chevron du joueur dans `docs/ameliorations.md` : *un repère d'identité ne suit pas l'état de santé*. Un repère de type qui s'éteint quand le bot agonise disparaît au moment où on le cherche ;
- utiliser un `Sprite` sur une texture, pas un `Graphics` retracé à chaque image — la spec § 3.5 du 1.5 le proscrit, et la dette 1.5 identifie déjà la porte comme la seule survivante de ce modèle. Ne pas en ajouter une deuxième ;
- le repère ne doit pas dépasser du corps de la toupie.

- [ ] **Step 4: Lancer les tests et vérifier au navigateur**

Run: `npm run test && npm run build`, puis `npm run dev` sur `http://localhost:5173/spinforge/`.

À vérifier de ses yeux : les bots des salles 1-3, 4-6 et 7-9 portent bien **trois teintes différentes** ; le repère reste lisible sur un bot presque mort ; rien ne dépasse.

- [ ] **Step 5: Commit**

```bash
git add src/theme.ts src/render/snapshot.ts src/render/snapshot.test.ts src/render/topView.ts
git commit -m "feat(2b): le type de chaque bot se lit dans l'arène"
```

---

### Task 10: La documentation de référence

**Files:**
- Modify: `docs/game-design.md` § « Combat & pilotage » et § « Pièces & stats »

- [ ] **Step 1: Inscrire la règle de la Pointe**

Dans le tableau des pièces de `docs/game-design.md`, la ligne Pointe ne mentionne que le niveau. Elle doit dire que **le rang joue sur les deux axes**. Ajouter sous le tableau :

> **La Pointe est le seul emplacement à double rendement.** Son rang multiplie la vitesse
> **et** divise la décroissance, `1,08^(rang−1)` sur les deux axes — là où la Lame, le Disque
> et le Noyau n'achètent qu'une stat par rang. C'est délibéré : la Pointe est le créneau
> mobilité + survie. À Légende (rang 11), une Pointe de niveau 0 porte à la fois la vitesse
> de 240 à 518 et la décroissance de 20 à 9,26.

- [ ] **Step 2: Inscrire la règle du triangle**

Dans le § « Combat & pilotage », remplacer la ligne « **Types** (jalon 2+) : … » par :

> - **Types** : Attaque > Endurance > Défense > Attaque. Le type dominant inflige **+25 %**.
>   La règle est **symétrique** — un bot dont le type domine celui du joueur frappe plus fort
>   lui aussi, et c'est ce qui fait de la contre-pioche une décision. **Équilibre est hors du
>   triangle** : il inflige +10 % à tout le monde et, surtout, il n'est le type dominé de
>   personne — il ne subit jamais le +25 %. Le facteur de type se **compose** avec le partage
>   de charge et les talents : il ne les remplace pas. Le type est porté par le **châssis** de
>   la toupie, qui n'est pas un cinquième emplacement — toutes les pièces restent
>   interchangeables entre châssis. Le type des bots est fixé par chapitre et par salle.
>   Certaines Lames tournent à gauche (chocs frontaux amplifiés contre rotation droite) —
>   Saison 1, jalon 4.

- [ ] **Step 3: Commit**

```bash
git add docs/game-design.md
git commit -m "docs: la règle du triangle et le double rendement de la Pointe entrent dans la spec de référence"
```

---

### Task 11: Calibration et réglage

**Files:**
- Modify: `scripts/calibrate.mjs`
- Modify: `src/content/balance.json` (`econ.rewardBase`, `toupieShop.priceGems` — **seulement si la mesure le commande**)

> **La calibration va bouger, et on sait pourquoi.** Brasier Solaire est Équilibre : le joueur neuf gagne `typeMult = 1,10` sur chaque coup sans jamais encaisser le +25 % en retour. Le chapitre 1 raccourcit **mécaniquement**. Ce n'est pas une régression à corriger, c'est un effet attendu à compenser. **Mesurer d'abord, comprendre l'écart, n'ajuster qu'ensuite** — et seulement `econ.rewardBase`, jamais le combat : la roadmap établit que l'économie commande la durée et le combat la forme de la difficulté.
>
> Référence d'avant le jalon, mesurée sur `main` le 2026-08-27 : **23 runs, 2,08 h**, premier coffre d'Arène à 2,92 h cumulées, salle la plus meurtrière `[10, 8]`.

- [ ] **Step 1: Mesurer sans rien changer**

Run: `npm run calibrate`

Noter les cinq chiffres. Comparer aux références ci-dessus. L'écart attendu va dans le sens d'un chapitre **plus court**. S'il va dans l'autre sens, **s'arrêter et chercher pourquoi** avant tout réglage : c'est le signe qu'autre chose a bougé.

- [ ] **Step 2: Étendre l'autopilote aux châssis**

Ajouter à `scripts/calibrate.mjs` une mesure comparative des quatre châssis sur le chapitre 1, avec `setActiveToupie` et un `unlocked` forcé. Le tableau doit montrer, pour chacun : runs jusqu'à validation, heures, salle la plus meurtrière.

L'autopilote de la mesure principale **garde Brasier Solaire et n'achète aucune toupie** : le garde-fou doit continuer de mesurer la même chose d'une passe à l'autre.

- [ ] **Step 3: Lire le tableau des châssis**

Le critère est double, et les deux moitiés comptent :
- la contre-pioche **paie** : *Carapace Abyssale* (Défense, qui domine l'Attaque du boss et des salles 7-9) doit valider en **moins** de runs que *Typhon Primal* ;
- **aucun châssis n'est l'unique bonne réponse** : l'écart entre le meilleur et le pire doit rester en deçà d'un facteur 2 sur le nombre de runs.

Si l'un des deux échoue, ajuster les profils de châssis de `balance.json` — et **remesurer**. Ne pas toucher au triangle : ses deux constantes (`0,25` et `0,10`) sont un choix de design arbitré, pas une variable d'ajustement.

- [ ] **Step 4: Ramener le chapitre 1 vers ~2 h**

Ajuster `econ.rewardBase` (aujourd'hui `70`) jusqu'à retrouver **~2 h et ~21-23 runs** avec Brasier Solaire. Une seule variable. Remesurer après chaque changement.

- [ ] **Step 5: Vérifier que la boutique ne casse pas la cible du coffre d'Arène**

Le premier coffre d'Arène doit rester joignable **dans l'heure suivant la validation** (mesuré à 0,82–0,87 h au 2a, soit ~2,92 h en cumulé). Si le prix de 900 gemmes déplace cette cible, l'ajuster.

- [ ] **Step 6: Consigner les chiffres**

Ajouter au § 6 de `docs/superpowers/specs/2026-08-27-jalon-2b-toupies-design.md` une sous-section « Mesures » : chiffres avant, chiffres après, tableau des quatre châssis, et la valeur finale de `rewardBase` avec la raison du réglage.

- [ ] **Step 7: Commit**

```bash
git add scripts/calibrate.mjs src/content/balance.json docs/superpowers/specs/2026-08-27-jalon-2b-toupies-design.md
git commit -m "chore(2b): calibration des châssis et du chapitre 1 après le triangle"
```

---

### Task 12: Revue de branche entière et clôture

Au jalon 2a, l'oubli le plus grave — aucun talent affiché dans l'interface, pourtant exigé par la spec — n'était visible qu'à ce niveau-là. Une revue tâche par tâche ne l'aurait jamais trouvé.

**Files:**
- Modify: `docs/roadmap.md`
- Modify: `docs/ameliorations.md` (si le test au navigateur produit une remarque de joueur)

- [ ] **Step 1: Relire le diff complet contre la spec**

Run: `git diff main...HEAD`

Reprendre la spec **section par section** et pointer, pour chacune, le code qui l'implémente. Lister les manques. Les questions à se poser, apprises du 2a :
- une exigence de la spec est-elle implémentée dans `sim/` **mais jamais montrée au joueur** ?
- un test prétend-il couvrir un mécanisme qu'il ne couvre pas ?
- une constante d'équilibrage a-t-elle atterri ailleurs que dans `balance.json` ?
- reste-t-il du code mort — un export sans appelant, une branche inatteignable ?

- [ ] **Step 2: Vérification complète au navigateur**

Run: `npm run dev` puis `http://localhost:5173/spinforge/`.

Jouer une partie réelle, pas une inspection :
1. piloter, encaisser, mourir, retenter ;
2. constater que le pilotage reste payant — foncer bat attendre ;
3. traverser les trois zones de types et voir le repère changer ;
4. atteindre l'onglet Toupies, réclamer un Fondateur avec des gemmes forcées, l'équiper, et **sentir** que la toupie se conduit autrement ;
5. recharger la page et vérifier que tout est conservé — toupie active comprise ;
6. ouvrir des coffres et vérifier que les Lames tirées correspondent aux toupies possédées.

- [ ] **Step 3: Sortie complète des tests**

Run: `npm run test && npm run build && npm run calibrate`

Coller les trois sorties dans le rapport final. **Ne rien affirmer de vert sans la sortie sous les yeux.**

- [ ] **Step 4: Mettre la roadmap à jour**

Dans `docs/roadmap.md` :
- marquer le jalon 2b et lui ajouter le lien vers son plan, comme les jalons précédents ;
- ajouter une section **« Dette connue (jalon 2b) »** listant chaque point différé **avec sa raison de report** — c'est la forme des deux sections existantes, elle doit être tenue. Y faire figurer au minimum : les capacités de Noyau déclenchables (reportées au jalon 4 avec la Saison 1), la rotation gauche (aucun Fondateur concerné), les tables de types des chapitres 2 à 8 (les chapitres n'existent pas encore), et tout ce que la revue de l'étape 1 aura mis au jour.

- [ ] **Step 5: Commit**

```bash
git add docs/roadmap.md docs/ameliorations.md
git commit -m "chore(2b): roadmap à jour, dette du jalon consignée"
```

---

## Self-review du plan

**Couverture de la spec**, section par section :

| Spec | Tâche |
|---|---|
| § 1.1 périmètre | Tasks 1-9 |
| § 1.2 hors périmètre | Task 12 (consigné en dette) |
| § 2.1 la toupie n'est pas un emplacement | Task 1 |
| § 2.2 contenu / équilibrage | Tasks 1, 3, 6 |
| § 2.3 le méta | Task 3 |
| § 2.4 migration schéma 3 | Task 3 |
| § 2.5 `Top.type` et `Top.mass` | Task 4 |
| § 3.1 la règle `typeMult` | Task 2 |
| § 3.2 entrée dans le combat | Task 5 |
| § 3.3 type des bots | Task 4 |
| § 4.1 sept axes | Task 6 |
| § 4.2 quatre châssis | Task 6 |
| § 4.3 douze modèles | Task 6 |
| § 5.1 écran Toupies | Task 8 |
| § 5.2 boutique | Tasks 3, 8, 11 |
| § 5.3 doublons signature | Task 7 |
| § 5.4 l'arène | Task 9 |
| § 5.5 documentation | Task 10 |
| § 6 mesure et calibration | Task 11 |
| § 7 tests | Tasks 1-9 |
| § 7.1 vérification par mutation | Tasks 5, 6, 7 |
| § 8 ce qui ne doit pas casser | Contraintes globales + Tasks 4, 5, 12 |

**Cohérence des types** — les noms voyagent d'une tâche à l'autre sans dériver : `TopType`, `ToupieId`, `Toupie`, `TOUPIES`, `toupieById`, `STARTER_TOUPIE` (Task 1) ; `typeMult` (Task 2) ; `activeToupie`, `setActiveToupie`, `buyToupie`, `claimFounderGift`, `canClaimFounderGift`, `TOUPIE_SHOP` (Task 3) ; `botTypeFor`, `Top.type`, `Top.mass`, `Stats.accel`, `Stats.mass` (Task 4) ; `ProfileAxis`, `StatProfile`, `NEUTRAL_PROFILE`, `resolveProfile`, `CHASSIS`, `MODELS_PROFILE` (Task 6) ; `poolFor` (Task 7) ; `TYPE_TINT` (Task 9).

**Dépendance décalée assumée** : la Task 4 fait retourner `accel` et `mass` par `playerStats` avec des valeurs neutres, que la Task 6 remplace par les profils. C'est écrit explicitement dans la Task 4, étape 7 — sans quoi la Task 4 ne compilerait pas seule.
