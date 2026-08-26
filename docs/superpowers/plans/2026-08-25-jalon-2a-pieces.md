# Jalon 2a — Les pièces : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transformer les quatre entiers de progression du jalon 1 en objets — pièces à modèle et rang, sorties de coffres, empilées, fusionnées, équipées — sur les deux fondations qui les rendent possibles : l'équilibrage en JSON statique et la sauvegarde.

**Architecture:** `SimState` se scinde en `RunState` (ce qui vit à la cadence du tick) et `MetaState` (ce qui survit au run et à la fermeture de l'app), reliés par une frontière explicite : `tick()` retourne ses récompenses au lieu de muter le méta, `createRun`/`syncRunStats` recopient l'équipement vers le joueur. Deux flux de RNG indépendants. Tout l'équilibrage vit dans `src/content/balance.json`, dont `src/sim/config.ts` reste la porte unique.

**Tech Stack:** TypeScript strict, Vite 6, React 19, PixiJS 8, Vitest 2, Playwright (devDependency, captures de vérification).

**Spec:** `docs/superpowers/specs/2026-08-25-jalon-2a-pieces-design.md`

## Global Constraints

Ces contraintes s'appliquent à **toutes** les tâches. Elles viennent de `CLAUDE.md` et de la § « Contraintes non négociables » de la spec.

- **`src/sim/` est pur et déterministe** : aucun import de DOM, PixiJS, React, `Date` ou `Math.random`. Le RNG est sérialisé dans l'état, le temps n'avance que par `tick()` à pas fixe de 100 ms.
- **Le rendu est spectateur** : `src/render/` et `src/ui/` lisent l'état, ne le mutent jamais directement — toute mutation passe par une fonction de `src/sim/`.
- **Tout l'équilibrage vit dans `src/content/balance.json`**, exposé par `src/sim/config.ts`. Jamais de constante d'équilibrage en dur ailleurs.
- **Aucun nom officiel Beyblade** (toupies, personnages, produits) dans le code, les données ou l'UI.
- **Textes joueur en français**, code et identifiants en anglais. Vocabulaire du jeu (`salle`, `toupie`) accepté dans les types métier.
- **Tests** : Vitest, colocalisés (`src/**/*.test.ts`), imports explicites depuis `vitest` — pas de globals.
- **Commits** en français, format `type(scope): sujet`, comme l'historique existant.
- **Le farm ne progresse jamais** — pilier de design, aucune de ces tâches ne doit l'entamer.
- **Le partage de charge est un acquis.** Ajouté à `resolveCollision` le 2026-08-25 après mesure
  (`docs/ameliorations.md`), il est ce qui rend le pilotage payant. `docs/game-design.md`
  § Combat en fait une règle du jeu. Toute réécriture de `combat.ts` doit le préserver, ainsi
  que les deux tests de `combat.test.ts` qui le verrouillent. La base économique associée est
  `rewardBase = 70`, **pas 120**.

## Hors périmètre

Repris de la § 10 de la spec. Aucune tâche ne doit s'y aventurer, même si l'occasion se
présente — chacun de ces points a sa raison d'être ailleurs :

- Les trois autres Fondateurs, les types, le triangle des forces → **jalon 2b**
- Les comportements distincts des modèles génériques (les six Disques et les six Pointes
  sont identiques en stats à ce jalon ; ils ne servent qu'à fragmenter le vivier de fusion) → **2b**
- Le coffre Arène gratuit toutes les 4 h → **jalon 3** : il demande l'horloge murale, que
  `src/sim/` ne peut pas lire, et c'est la machinerie même du hors-ligne plafonné
- Les Fragments et le démantèlement → le sacrifice de fusion en tient lieu
- L'auto-fusion → **jalon 4** (arbre de Refonte)
- Les talents aux rangs intermédiaires +1/+2/+3 → seuls les trois paliers nommés en portent
- La migration vers `break_infinity.js` → les valeurs restent loin de la précision de `number`
- La généralisation de `chapterValidated` en « meilleur chapitre jamais validé » → **jalon 3**

---

## Structure des fichiers

**Créés**

| Fichier | Responsabilité |
|---|---|
| `src/content/balance.json` | Toutes les valeurs d'équilibrage. Versionné dans git. |
| `src/content/pieces.ts` | Catalogue des modèles de pièces (id, emplacement, libellé français). |
| `src/sim/piece.ts` | Types `Slot`/`PieceInstance`/`PieceStack`, échelle de rareté, étiquettes de rang. |
| `src/sim/talents.ts` | Table des douze talents, `TalentMods`, `NEUTRAL_TALENTS`, résolution depuis l'équipement. |
| `src/sim/meta.ts` | `MetaState` : création, récompenses, inventaire, équipement. |
| `src/sim/chest.ts` | Tirage des coffres et compteurs de pity. |
| `src/sim/fusion.ts` | Recettes et exécution de la fusion. |
| `src/sim/save.ts` | Sérialisation et migrations — **pur**, pas de `localStorage`. |
| `src/storage/localSave.ts` | Accès `localStorage`, débounce, clé de secours — **impur**, hors `src/sim/`. |
| `src/ui/ChestScreen.tsx` | Écran Coffres et révélation des tirages. |
| `src/ui/InventoryPanel.tsx` | Bloc « Inventaire » de la Forge : piles, Équiper, Fusionner. |
| `scripts/calibrate.mjs` | Autopilote headless de calibration. Conservé. |

**Modifiés**

| Fichier | Nature du changement |
|---|---|
| `src/sim/config.ts` | Devient le chargeur typé de `balance.json`. |
| `src/sim/types.ts` | `SimState` → `RunState` ; `PieceLevels` disparaît ; `Top` gagne `talents` et `decayPauseTicks` ; `Stats` perd `accel`. |
| `src/sim/sim.ts` | `createRun`, `resetRun`, `syncRunStats` ; `tick()` retourne `RunReward | null`. |
| `src/sim/economy.ts` | Travaille sur `MetaState` et des `PieceInstance`. |
| `src/sim/combat.ts` | Masse, impulsion reçue, seuils de dégâts, riposte, décroissance modulée. |
| `src/sim/physics.ts` | Friction par toupie, vitesse maximale modulée par le spin. |
| `src/sim/salle.ts` | `botCountFor` lit `botsPerSalle` du JSON. |
| `src/render/snapshot.ts` | `SimState` → `RunState` ; `spinDecay` → `decayPerTick` (décroissance **effective**). |
| `src/render/observer.ts`, `src/render/arena.ts` | Type `RunState`, champ `decayPerTick`. |
| `src/ui/useGameLoop.ts` | Route `RunReward` vers le méta. |
| `src/ui/App.tsx` | Deux refs (run, meta), gemmes au HUD, chargement et sauvegarde, onglet Coffres. |
| `src/ui/CombatScreen.tsx` | Type `RunState`, `resetRun(run, meta)`. |
| `src/ui/ForgeScreen.tsx` | Équipement par pièce, puis bloc inventaire. |
| `src/ui/TabBar.tsx` | Déverrouille Coffres, laisse Toupies verrouillé. |
| `tsconfig.json` | `resolveJsonModule`. |
| `package.json` | Script `calibrate`. |
| `docs/roadmap.md` | Marquage du jalon, dette refermée. |

---

## Task 1 : L'équilibrage en JSON

Refactor pur : aucun comportement ne change. C'est le socle de tout le reste, et il referme au passage la dette « `salle.ts` code en dur le nombre de bots par palier ».

**Files:**
- Create: `src/content/balance.json`
- Create: `src/sim/config.test.ts`
- Modify: `src/sim/config.ts` (remplacement complet)
- Modify: `src/sim/salle.ts:6-9`
- Modify: `tsconfig.json`

**Interfaces:**
- Consumes: rien.
- Produces: `BALANCE: Balance` et les constantes nommées `TICK_S`, `ARENA_RADIUS`, `SALLES_PER_CHAPTER`, `FRICTION`, `WALL_RESTITUTION`, `RESTITUTION`, `DAMAGE_K`, `HEAL_BETWEEN_SALLES`, `PLAYER_SPAWN`, `BOT_AI`, `PLAYER_BASE`, `BOT_BASE`, `BOT_SCALING`, `BOSS`, `BOT_SPAWN_RING`, `ECON`, `PIECE_EFFECT`, `CHARGE_BONUS` — **mêmes noms et mêmes formes qu'aujourd'hui**, plus `RARITY`, `TALENTS`, `FUSION`, `CHESTS`, `BOTS_PER_SALLE`. Les tâches suivantes n'importent que depuis `./config`.

- [ ] **Step 1: Activer `resolveJsonModule`**

Dans `tsconfig.json`, ajouter à `compilerOptions` :

```json
    "resolveJsonModule": true,
```

- [ ] **Step 2: Écrire `src/content/balance.json`**

Les valeurs sous `arena`, `combat`, `chapter`, `player`, `bot`, `boss`, `econ` et `pieceEffect` sont **exactement celles de l'actuel `src/sim/config.ts`** — ne rien recalibrer ici. Deux d'entre elles viennent de la passe du 2026-08-25 et sont faciles à écraser par réflexe : `combat.chargeBonus` vaut **0,3** (c'est `CHARGE_BONUS`) et `econ.rewardBase` vaut **70**, pas 120. Vérifier dans le fichier source avant d'écrire. `econ.bossGems`, `rarity`, `talents`, `fusion` et `chests` sont nouveaux et viennent de la spec ; `bossGems` et les deux `speedThreshold` seront réglés par la Task 11.

```json
{
  "version": 1,
  "tickSeconds": 0.1,
  "arena": { "radius": 150, "friction": 0.94, "wallRestitution": 0.8, "restitution": 0.8 },
  "combat": { "damageK": 0.35, "chargeBonus": 0.3, "healBetweenSalles": 0.2 },
  "chapter": { "sallesPerChapter": 10, "botsPerSalle": [1, 1, 1, 2, 2, 2, 3, 3, 3, 1] },
  "player": {
    "spawn": { "x": 0, "y": 80 },
    "base": { "accel": 900, "maxSpeed": 240, "radius": 12, "spinMax": 3000, "spinDecay": 20, "attack": 30, "defense": 10 }
  },
  "bot": {
    "base": { "accel": 500, "maxSpeed": 140, "radius": 12, "spinMax": 1200, "spinDecay": 12, "attack": 18, "defense": 6 },
    "scaling": { "spinPerSalle": 0.15, "attackPerSalle": 0.08 },
    "spawnRing": 0.6,
    "ai": { "retargetEveryTicks": 10, "aimJitter": 1.2 }
  },
  "boss": { "spinMult": 4, "attackMult": 1.5, "radius": 18 },
  "econ": {
    "upgradeBase": 100, "upgradeGrowth": 1.08,
    "rewardBase": 70, "rewardGrowth": 1.13, "bossRewardMult": 10,
    "bossGems": 40
  },
  "pieceEffect": {
    "lameAttack": 0.1, "disqueDefense": 0.1,
    "pointeSpeed": 0.04, "pointeDecay": 0.05, "noyauSpin": 0.08
  },
  "rarity": { "step": 1.08, "legendRank": 11 },
  "talents": {
    "estoc": { "rank": 4, "speedThreshold": 150, "damageBonus": 0.3 },
    "riposte": { "rank": 7, "reflect": 0.15 },
    "percee": { "rank": 11, "defenseIgnore": 0.25 },
    "ancrage": { "rank": 4, "impulseTaken": 0.7 },
    "frolement": { "rank": 7, "speedThreshold": 40 },
    "masse": { "rank": 11, "mass": 2 },
    "glisse": { "rank": 4, "friction": 0.96 },
    "relance": { "rank": 7, "ticks": 20 },
    "toupieFolle": { "rank": 11, "maxSpeedAtZero": 0.4 },
    "reserve": { "rank": 4, "heal": 0.35 },
    "secondSouffle": { "rank": 7, "revive": 0.2 },
    "coeurGyre": { "rank": 11, "decayMult": 0.6 }
  },
  "fusion": [
    { "throughRank": 3, "identical": 3, "sacrifice": 0 },
    { "throughRank": 9, "identical": 2, "sacrifice": 1 },
    { "throughRank": 10, "identical": 3, "sacrifice": 0 },
    { "throughRank": 0, "identical": 2, "sacrifice": 0 }
  ],
  "chests": {
    "bronze": {
      "currency": "credits", "price": 2000, "price10": 18000,
      "slots": ["disque", "pointe"],
      "ranks": [{ "rank": 1, "p": 0.75 }, { "rank": 2, "p": 0.22 }, { "rank": 3, "p": 0.03 }],
      "pityThreshold": 0, "pityRank": 0
    },
    "arene": {
      "currency": "gems", "price": 300, "price10": 2680,
      "slots": ["lame", "disque", "pointe", "noyau"],
      "ranks": [{ "rank": 2, "p": 0.7 }, { "rank": 3, "p": 0.25 }, { "rank": 4, "p": 0.05 }],
      "pityThreshold": 10, "pityRank": 4
    },
    "mythique": {
      "currency": "gems", "price": 1500, "price10": 13500,
      "slots": ["lame", "disque", "pointe", "noyau"],
      "ranks": [{ "rank": 4, "p": 0.88 }, { "rank": 7, "p": 0.115 }, { "rank": 11, "p": 0.005 }],
      "pityThreshold": 30, "pityRank": 11
    }
  }
}
```

La convention « `pityThreshold: 0` = ce coffre n'a pas de pity » est documentée dans l'interface `Balance` à l'étape suivante — le JSON ne porte aucune clé de commentaire, `CHESTS` étant itéré par `Object.entries`.

- [ ] **Step 2b: Vérifier le JSON écrit**

Run: `node --input-type=module -e "import b from './src/content/balance.json' with { type: 'json' }; console.log(b.chests.mythique.pityRank, Object.keys(b.chests).join(','), b.chapter.botsPerSalle.length)"`
Expected: `11 bronze,arene,mythique 10`

- [ ] **Step 3: Réécrire `src/sim/config.ts`**

Remplacer **tout** le contenu du fichier :

```ts
import raw from '../content/balance.json';

/** Emplacement d'une pièce. Répété ici plutôt qu'importé de `piece.ts` : ce
 *  fichier est la racine des dépendances de la simulation, il n'importe rien d'elle. */
export type SlotName = 'lame' | 'disque' | 'pointe' | 'noyau';

export interface RankOdds { rank: number; p: number }

export interface ChestDef {
  currency: 'credits' | 'gems';
  price: number;
  price10: number;
  slots: SlotName[];
  ranks: RankOdds[];
  /** 0 = ce coffre n'a pas de pity. */
  pityThreshold: number;
  pityRank: number;
}

export interface FusionRule {
  /** Dernier rang de départ couvert par la règle. 0 = « tous les rangs au-delà ». */
  throughRank: number;
  identical: number;
  sacrifice: number;
}

export interface Balance {
  version: number;
  tickSeconds: number;
  arena: { radius: number; friction: number; wallRestitution: number; restitution: number };
  combat: { damageK: number; chargeBonus: number; healBetweenSalles: number };
  chapter: { sallesPerChapter: number; botsPerSalle: number[] };
  player: {
    spawn: { x: number; y: number };
    base: { accel: number; maxSpeed: number; radius: number; spinMax: number; spinDecay: number; attack: number; defense: number };
  };
  bot: {
    base: { accel: number; maxSpeed: number; radius: number; spinMax: number; spinDecay: number; attack: number; defense: number };
    scaling: { spinPerSalle: number; attackPerSalle: number };
    spawnRing: number;
    ai: { retargetEveryTicks: number; aimJitter: number };
  };
  boss: { spinMult: number; attackMult: number; radius: number };
  econ: {
    upgradeBase: number; upgradeGrowth: number;
    rewardBase: number; rewardGrowth: number; bossRewardMult: number;
    bossGems: number;
  };
  pieceEffect: { lameAttack: number; disqueDefense: number; pointeSpeed: number; pointeDecay: number; noyauSpin: number };
  rarity: { step: number; legendRank: number };
  talents: {
    estoc: { rank: number; speedThreshold: number; damageBonus: number };
    riposte: { rank: number; reflect: number };
    percee: { rank: number; defenseIgnore: number };
    ancrage: { rank: number; impulseTaken: number };
    frolement: { rank: number; speedThreshold: number };
    masse: { rank: number; mass: number };
    glisse: { rank: number; friction: number };
    relance: { rank: number; ticks: number };
    toupieFolle: { rank: number; maxSpeedAtZero: number };
    reserve: { rank: number; heal: number };
    secondSouffle: { rank: number; revive: number };
    coeurGyre: { rank: number; decayMult: number };
  };
  fusion: FusionRule[];
  chests: Record<string, ChestDef>;
}

/** Double assertion délibérée. TypeScript infère du JSON des types élargis
 *  (`string[]` pour `slots`, `number` pour tout littéral), qui ne sont pas
 *  assignables aux unions de `Balance` sans passer par `unknown`. La sûreté
 *  réelle vient de `config.test.ts`, qui valide la forme à l'exécution. */
export const BALANCE = raw as unknown as Balance;

export const TICK_S = BALANCE.tickSeconds;
export const ARENA_RADIUS = BALANCE.arena.radius;
export const FRICTION = BALANCE.arena.friction;
export const WALL_RESTITUTION = BALANCE.arena.wallRestitution;
export const RESTITUTION = BALANCE.arena.restitution;
export const DAMAGE_K = BALANCE.combat.damageK;
export const CHARGE_BONUS = BALANCE.combat.chargeBonus;
export const HEAL_BETWEEN_SALLES = BALANCE.combat.healBetweenSalles;
export const SALLES_PER_CHAPTER = BALANCE.chapter.sallesPerChapter;
export const BOTS_PER_SALLE = BALANCE.chapter.botsPerSalle;
export const PLAYER_SPAWN = BALANCE.player.spawn;
export const PLAYER_BASE = BALANCE.player.base;
export const BOT_BASE = BALANCE.bot.base;
export const BOT_SCALING = BALANCE.bot.scaling;
export const BOT_SPAWN_RING = BALANCE.bot.spawnRing;
export const BOT_AI = BALANCE.bot.ai;
export const BOSS = BALANCE.boss;
export const ECON = BALANCE.econ;
export const PIECE_EFFECT = BALANCE.pieceEffect;
export const RARITY = BALANCE.rarity;
export const TALENTS = BALANCE.talents;
export const FUSION = BALANCE.fusion;
export const CHESTS = BALANCE.chests;
```

- [ ] **Step 4: Faire lire le JSON à `salle.ts`**

Dans `src/sim/salle.ts`, remplacer l'import et `botCountFor` :

```ts
import { ARENA_RADIUS, BOSS, BOTS_PER_SALLE, BOT_BASE, BOT_SCALING, BOT_SPAWN_RING, SALLES_PER_CHAPTER } from './config';
```

```ts
export function botCountFor(salle: number): number {
  return BOTS_PER_SALLE[Math.min(Math.max(1, salle), BOTS_PER_SALLE.length) - 1];
}
```

- [ ] **Step 5: Écrire le test de validation du JSON**

Créer `src/sim/config.test.ts`. C'est ce test qui remplace la sûreté de type perdue par la double assertion — il doit donc être précis.

```ts
import { describe, expect, it } from 'vitest';
import { BALANCE, BOTS_PER_SALLE, CHESTS, FUSION, SALLES_PER_CHAPTER } from './config';

const SLOTS = ['lame', 'disque', 'pointe', 'noyau'];

describe('balance.json', () => {
  it('a autant d’entrées de bots que de salles par chapitre', () => {
    expect(BOTS_PER_SALLE).toHaveLength(SALLES_PER_CHAPTER);
    expect(BOTS_PER_SALLE.every((n) => Number.isInteger(n) && n >= 1)).toBe(true);
    // La 10ᵉ salle est le boss : un seul adversaire.
    expect(BOTS_PER_SALLE[SALLES_PER_CHAPTER - 1]).toBe(1);
  });

  it('chaque coffre ne tire que des emplacements valides', () => {
    for (const chest of Object.values(CHESTS)) {
      expect(chest.slots.length).toBeGreaterThan(0);
      for (const slot of chest.slots) expect(SLOTS).toContain(slot);
      expect(['credits', 'gems']).toContain(chest.currency);
    }
  });

  it('chaque distribution de rang somme à 1', () => {
    for (const [name, chest] of Object.entries(CHESTS)) {
      const total = chest.ranks.reduce((acc, r) => acc + r.p, 0);
      expect(total, `coffre ${name}`).toBeCloseTo(1, 10);
      expect(chest.ranks.every((r) => Number.isInteger(r.rank) && r.rank >= 1)).toBe(true);
    }
  });

  it('un coffre qui a un pity vise un rang qu’il peut garantir', () => {
    for (const [name, chest] of Object.entries(CHESTS)) {
      if (chest.pityThreshold === 0) continue;
      expect(chest.pityRank, `coffre ${name}`).toBeGreaterThan(0);
      // Le rang garanti doit être le meilleur que le coffre sait produire,
      // sans quoi le pity serait une régression déguisée.
      const best = Math.max(...chest.ranks.map((r) => r.rank));
      expect(chest.pityRank, `coffre ${name}`).toBe(best);
    }
  });

  it('les règles de fusion couvrent tous les rangs, la dernière étant ouverte', () => {
    expect(FUSION.length).toBeGreaterThan(0);
    expect(FUSION[FUSION.length - 1].throughRank).toBe(0);
    const bounded = FUSION.slice(0, -1).map((r) => r.throughRank);
    // Bornes strictement croissantes : sans quoi une règle en masquerait une autre.
    for (let i = 1; i < bounded.length; i++) expect(bounded[i]).toBeGreaterThan(bounded[i - 1]);
    for (const rule of FUSION) expect(rule.identical).toBeGreaterThanOrEqual(2);
  });

  it('porte un numéro de version', () => {
    expect(Number.isInteger(BALANCE.version)).toBe(true);
    expect(BALANCE.version).toBeGreaterThanOrEqual(1);
  });
});
```

- [ ] **Step 6: Lancer les tests**

Run: `npm run test`
Expected: 61 tests verts (55 existants + 6 nouveaux). **Aucun test existant ne doit changer** : ce refactor ne modifie aucune valeur.

- [ ] **Step 7: Vérifier la compilation**

Run: `npm run build`
Expected: vert. Si `tsc` se plaint de l'import JSON, c'est que `resolveJsonModule` n'a pas été ajouté à l'étape 1.

- [ ] **Step 8: Commit**

```bash
git add tsconfig.json src/content/balance.json src/sim/config.ts src/sim/config.test.ts src/sim/salle.ts
git commit -m "refactor(sim): l'équilibrage passe en JSON statique versionné

config.ts devient le chargeur typé de src/content/balance.json et reste la
porte unique par laquelle la simulation lit un chiffre. Le nombre de bots par
salle, jusqu'ici codé en dur dans salle.ts, y entre sous forme de tableau —
dernier manquement à la règle « tout l'équilibrage dans config.ts ».

Aucune valeur ne change : le comportement est strictement identique."
```

---

## Task 2 : Le modèle de pièce

Types et catalogue, sans aucune intégration. Purement additif : rien de l'existant ne bouge, donc rien ne peut casser.

**Files:**
- Create: `src/content/pieces.ts`
- Create: `src/sim/piece.ts`
- Create: `src/sim/piece.test.ts`

**Interfaces:**
- Consumes: `RARITY` depuis `./config` (Task 1).
- Produces:
  - `type Slot = 'lame' | 'disque' | 'pointe' | 'noyau'`
  - `interface PieceModel { id: string; slot: Slot; label: string }`
  - `MODELS: PieceModel[]`, `modelById(id: string): PieceModel`, `modelsForSlot(slot: Slot): PieceModel[]`
  - `interface PieceInstance { model: string; rank: number; level: number }`
  - `interface PieceStack { model: string; rank: number; count: number; bestLevel: number }`
  - `rarityMult(rank: number): number`, `rankLabel(rank: number): string`
  - `STARTER_EQUIPMENT: Record<Slot, PieceInstance>`

- [ ] **Step 1: Écrire le catalogue**

Créer `src/content/pieces.ts`. Il suit la forme de `src/content/chapters.ts`, déjà en place. Les libellés sont ceux de `docs/game-design.md` — **univers original, aucun nom officiel Beyblade**.

```ts
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
```

- [ ] **Step 2: Écrire le test de l'échelle de rareté (il doit échouer)**

Créer `src/sim/piece.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { rankLabel, rarityMult, STARTER_EQUIPMENT } from './piece';
import { MODELS, modelById, modelsForSlot } from '../content/pieces';
import { RARITY } from './config';

describe('rarityMult', () => {
  it('vaut 1 au rang Commun', () => {
    expect(rarityMult(1)).toBe(1);
  });

  it('multiplie par le pas de rareté à chaque rang', () => {
    expect(rarityMult(2)).toBeCloseTo(RARITY.step, 10);
    expect(rarityMult(11)).toBeCloseTo(Math.pow(RARITY.step, 10), 10);
  });

  it('ne connaît aucun plafond — Légende +N continue de multiplier', () => {
    expect(rarityMult(20)).toBeGreaterThan(rarityMult(11));
    expect(rarityMult(21) / rarityMult(20)).toBeCloseTo(RARITY.step, 10);
  });
});

describe('rankLabel', () => {
  it('nomme les onze rangs de l’échelle', () => {
    expect(rankLabel(1)).toBe('Commun');
    expect(rankLabel(4)).toBe('Excellent');
    expect(rankLabel(6)).toBe('Excellent +2');
    expect(rankLabel(7)).toBe('Épique');
    expect(rankLabel(10)).toBe('Épique +3');
    expect(rankLabel(11)).toBe('Légende');
  });

  it('prolonge en Légende +N au-delà du onzième', () => {
    expect(rankLabel(12)).toBe('Légende +1');
    expect(rankLabel(30)).toBe('Légende +19');
  });
});

describe('catalogue', () => {
  it('n’a aucun identifiant en double', () => {
    expect(new Set(MODELS.map((m) => m.id)).size).toBe(MODELS.length);
  });

  it('donne six Disques et six Pointes génériques, une Lame et un Noyau signature', () => {
    expect(modelsForSlot('disque')).toHaveLength(6);
    expect(modelsForSlot('pointe')).toHaveLength(6);
    expect(modelsForSlot('lame')).toHaveLength(1);
    expect(modelsForSlot('noyau')).toHaveLength(1);
  });

  it('refuse un identifiant inconnu plutôt que de rendre undefined', () => {
    expect(() => modelById('disque.inexistant')).toThrow();
  });
});

describe('équipement de départ', () => {
  it('donne quatre pièces Commun niveau 0, une par emplacement', () => {
    for (const slot of ['lame', 'disque', 'pointe', 'noyau'] as const) {
      const piece = STARTER_EQUIPMENT[slot];
      expect(piece.rank).toBe(1);
      expect(piece.level).toBe(0);
      expect(modelById(piece.model).slot).toBe(slot);
    }
  });
});
```

- [ ] **Step 3: Lancer le test pour le voir échouer**

Run: `npx vitest run src/sim/piece.test.ts`
Expected: FAIL — `Failed to resolve import "./piece"`.

- [ ] **Step 4: Écrire `src/sim/piece.ts`**

```ts
import { RARITY } from './config';
import type { Slot } from '../content/pieces';

export type { Slot, PieceModel } from '../content/pieces';

/** Une pièce possédée : un modèle, un rang de rareté, un niveau d'amélioration.
 *  Deux pièces sont *identiques* — donc fusionnables — si `model` et `rank`
 *  coïncident. Le niveau n'entre pas dans l'identité : sans quoi la stratégie
 *  optimale deviendrait « ne jamais améliorer avant d'avoir fini de fusionner ». */
export interface PieceInstance {
  model: string;
  rank: number;
  level: number;
}

/** Les doublons vivent en piles. `bestLevel` n'existe que pour ne rien perdre
 *  lorsqu'on déséquipe une pièce améliorée : les doublons dorment au niveau 0. */
export interface PieceStack {
  model: string;
  rank: number;
  count: number;
  bestLevel: number;
}

const RANK_LABELS = [
  'Commun', 'Bon', 'Rare',
  'Excellent', 'Excellent +1', 'Excellent +2',
  'Épique', 'Épique +1', 'Épique +2', 'Épique +3',
  'Légende',
];

/** Multiplicateur de la stat portée par la pièce. Aucun plafond : la formule
 *  se prolonge d'elle-même dans Légende +N, ce que « rang infini » exige. */
export function rarityMult(rank: number): number {
  return Math.pow(RARITY.step, rank - 1);
}

export function rankLabel(rank: number): string {
  if (rank <= RANK_LABELS.length) return RANK_LABELS[rank - 1];
  return `Légende +${rank - RANK_LABELS.length}`;
}

export const STARTER_EQUIPMENT: Record<Slot, PieceInstance> = {
  lame: { model: 'lame.couronne-solaire', rank: 1, level: 0 },
  noyau: { model: 'noyau.fournaise', rank: 1, level: 0 },
  disque: { model: 'disque.lourd', rank: 1, level: 0 },
  pointe: { model: 'pointe.plate', rank: 1, level: 0 },
};
```

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run src/sim/piece.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 6: Vérifier que rien d'autre n'a bougé**

Run: `npm run test && npm run build`
Expected: 70 tests verts, build vert.

- [ ] **Step 7: Commit**

```bash
git add src/content/pieces.ts src/sim/piece.ts src/sim/piece.test.ts
git commit -m "feat(sim): modèle de pièce — catalogue, échelle de rareté, équipement de départ

Onze rangs nommés puis Légende +N sans plafond, un multiplicateur de stat de
1,08 par rang, et le catalogue des douze modèles génériques plus les deux
pièces signature de Brasier Solaire."
```

---

## Task 3 : La scission `RunState` / `MetaState`

La tâche structurante, et la plus large. Elle est **atomique** : on ne peut pas la faire à moitié et compiler. Elle sort `credits` et `pieces` de l'état de combat, adopte les `PieceInstance` de la Task 2, et met à jour tous les consommateurs.

**Files:**
- Create: `src/sim/meta.ts`
- Create: `src/sim/meta.test.ts`
- Modify: `src/sim/types.ts` (remplacement complet)
- Modify: `src/sim/sim.ts` (remplacement complet)
- Modify: `src/sim/economy.ts` (remplacement complet)
- Modify: `src/sim/economy.test.ts` (remplacement complet)
- Modify: `src/sim/sim.test.ts`
- Modify: `src/render/snapshot.ts`, `src/render/observer.ts:1-8`, `src/render/arena.ts` (types)
- Modify: `src/ui/useGameLoop.ts`, `src/ui/CombatScreen.tsx`, `src/ui/ForgeScreen.tsx`, `src/ui/App.tsx`

**Interfaces:**
- Consumes: `PieceInstance`, `PieceStack`, `Slot`, `rarityMult`, `STARTER_EQUIPMENT` (Task 2) ; toutes les constantes de `./config` (Task 1).
- Produces:
  - `interface RunState { tick; rngState; chapter; salle; player; bots; phase; secondSouffleUsed }`
  - `interface MetaState { rngState; credits; gems; equipped; inventory; pity; chapterValidated }`
  - `interface RunReward { credits: number; gems: number }`
  - `createInitialMeta(seed: number): MetaState`, `applyReward(meta, reward): void`
  - `createRun(meta: MetaState, seed: number): RunState`, `resetRun(run, meta): void`, `syncRunStats(run, meta): void`
  - `tick(run: RunState, input: Input): RunReward | null`
  - `playerStats(meta: MetaState): Stats`, `tryUpgrade(meta: MetaState, slot: Slot): boolean`, `salleReward(salle, boss): RunReward`

- [ ] **Step 1: Réécrire `src/sim/types.ts`**

```ts
import type { PieceInstance, PieceStack, Slot } from './piece';
import type { TalentMods } from './talents';

export interface Vec {
  x: number;
  y: number;
}

export interface Top {
  id: string;
  isPlayer: boolean;
  pos: Vec;
  vel: Vec;
  aim: Vec | null; // direction IA (bots) — null pour le joueur
  radius: number;
  spin: number;
  spinMax: number;
  spinDecay: number;
  attack: number;
  defense: number;
  maxSpeed: number;
  accel: number;
  /** Modificateurs de talent. Les bots partagent `NEUTRAL_TALENTS`. */
  talents: TalentMods;
  /** Ticks restants de suspension de la décroissance (talent Relance). */
  decayPauseTicks: number;
}

export interface Stats {
  attack: number;
  defense: number;
  maxSpeed: number;
  spinMax: number;
  spinDecay: number;
}

export type Phase = 'fighting' | 'dead';

export interface Input {
  steer: Vec | null;
}

export type ChestKind = 'bronze' | 'arene' | 'mythique';

/** Ce qu'une salle vidée rapporte. `tick()` le retourne, il ne l'applique pas :
 *  la simulation de combat ne touche jamais au méta. */
export interface RunReward {
  credits: number;
  gems: number;
}

/** Ce qui vit à la cadence du tick. Jamais sauvegardé : fermer l'onglet en
 *  plein combat équivaut à abandonner le run. */
export interface RunState {
  tick: number;
  rngState: number;
  chapter: number;
  salle: number;
  player: Top;
  bots: Top[];
  phase: Phase;
  secondSouffleUsed: boolean;
}

/** Ce qui survit au run et à la fermeture de l'app. Seul état sauvegardé. */
export interface MetaState {
  rngState: number;
  credits: number;
  gems: number;
  equipped: Record<Slot, PieceInstance>;
  inventory: PieceStack[];
  pity: Record<ChestKind, number>;
  chapterValidated: boolean;
}
```

`Stats.accel` disparaît : aucune pièce ne le modifie, `createRun` pose l'accélération du joueur depuis `PLAYER_BASE`. C'est une des trois dettes que ce jalon referme.

`types.ts` importe `TalentMods` depuis `./talents`, qui importe `MetaState` depuis `./types` :
le cycle est **type-only** dans les deux sens, donc entièrement effacé à la compilation. Ne pas
chercher à le rompre en dupliquant un type.

- [ ] **Step 2: Écrire un `talents.ts` minimal**

Les effets viennent aux Tasks 5 et 6 ; ici on ne pose que la forme, pour que `types.ts` compile. **Valeurs neutres** : pas de branche `if (talent)` dans le code de combat, jamais.

Créer `src/sim/talents.ts` :

```ts
import { FRICTION } from './config';

/** Modificateurs appliqués à une toupie. Chaque champ a une valeur *neutre*,
 *  celle d'une toupie sans talent : le code de combat multiplie et compare
 *  sans jamais tester la présence d'un talent. */
export interface TalentMods {
  /** Vitesse d'impact au-delà de laquelle Estoc majore les dégâts. Infinity = jamais. */
  estocThreshold: number;
  estocBonus: number;
  /** Part des dégâts encaissés renvoyée à l'agresseur (Riposte). */
  riposte: number;
  /** Part de la défense adverse ignorée (Percée). */
  defenseIgnore: number;
  /** Facteur sur l'impulsion *reçue* (Ancrage). 1 = intacte. */
  impulseTaken: number;
  /** Vitesse d'impact en-deçà de laquelle aucun dégât n'est subi (Frôlement). 0 = jamais. */
  frolementThreshold: number;
  /** Masse dans le calcul d'impulsion (Masse). 1 = ordinaire. */
  mass: number;
  /** Friction au sol propre à cette toupie (Glisse). */
  friction: number;
  /** Ticks de suspension de la décroissance après un choc (Relance). 0 = aucune. */
  relanceTicks: number;
  /** Gain de vitesse maximale à spin nul (Toupie folle). 0 = aucun. */
  toupieFolle: number;
  /** Facteur sur la décroissance naturelle (Cœur Gyre). 1 = ordinaire. */
  spinDecayMult: number;
}

/** Partagé par tous les bots — figé pour qu'aucun effet ne puisse fuiter sur eux. */
export const NEUTRAL_TALENTS: TalentMods = Object.freeze({
  estocThreshold: Infinity,
  estocBonus: 0,
  riposte: 0,
  defenseIgnore: 0,
  impulseTaken: 1,
  frolementThreshold: 0,
  mass: 1,
  friction: FRICTION,
  relanceTicks: 0,
  toupieFolle: 0,
  spinDecayMult: 1,
});
```

Les Tasks 5 et 6 ajouteront ici la table des douze talents et `resolveTalents(meta)`. À ce
stade le fichier ne porte que la forme et les valeurs neutres — c'est tout ce dont `types.ts`
a besoin pour compiler.

- [ ] **Step 3: Écrire `src/sim/meta.ts`**

```ts
import { STARTER_EQUIPMENT } from './piece';
import type { MetaState, RunReward } from './types';

export function createInitialMeta(seed: number): MetaState {
  return {
    rngState: seed >>> 0 || 1,
    credits: 0,
    gems: 0,
    equipped: {
      lame: { ...STARTER_EQUIPMENT.lame },
      disque: { ...STARTER_EQUIPMENT.disque },
      pointe: { ...STARTER_EQUIPMENT.pointe },
      noyau: { ...STARTER_EQUIPMENT.noyau },
    },
    inventory: [],
    pity: { bronze: 0, arene: 0, mythique: 0 },
    chapterValidated: false,
  };
}

export function applyReward(meta: MetaState, reward: RunReward): void {
  meta.credits += reward.credits;
  meta.gems += reward.gems;
}
```

- [ ] **Step 4: Réécrire `src/sim/economy.ts`**

```ts
import { ECON, PIECE_EFFECT, PLAYER_BASE } from './config';
import { rarityMult, type PieceInstance, type Slot } from './piece';
import type { MetaState, RunReward, Stats } from './types';

export function upgradeCost(level: number): number {
  return ECON.upgradeBase * Math.pow(ECON.upgradeGrowth, level);
}

export function salleReward(salle: number, boss: boolean): RunReward {
  const base = ECON.rewardBase * Math.pow(ECON.rewardGrowth, salle - 1);
  return boss
    ? { credits: base * ECON.bossRewardMult, gems: ECON.bossGems }
    : { credits: base, gems: 0 };
}

/** Les deux axes d'une pièce se multiplient : le niveau est linéaire, le rang
 *  est géométrique. Dès le niveau 3 un rang vaut plus qu'un niveau. */
function factor(piece: PieceInstance, perLevel: number): number {
  return (1 + perLevel * piece.level) * rarityMult(piece.rank);
}

export function playerStats(meta: MetaState): Stats {
  const { lame, disque, pointe, noyau } = meta.equipped;
  return {
    attack: PLAYER_BASE.attack * factor(lame, PIECE_EFFECT.lameAttack),
    defense: PLAYER_BASE.defense * factor(disque, PIECE_EFFECT.disqueDefense),
    maxSpeed: PLAYER_BASE.maxSpeed * factor(pointe, PIECE_EFFECT.pointeSpeed),
    spinMax: PLAYER_BASE.spinMax * factor(noyau, PIECE_EFFECT.noyauSpin),
    spinDecay: PLAYER_BASE.spinDecay / factor(pointe, PIECE_EFFECT.pointeDecay),
  };
}

export function tryUpgrade(meta: MetaState, slot: Slot): boolean {
  const piece = meta.equipped[slot];
  const cost = upgradeCost(piece.level);
  if (meta.credits < cost) return false;
  meta.credits -= cost;
  piece.level++;
  return true;
}
```

`tryUpgrade` ne resynchronise plus le joueur : il ne connaît pas le run. C'est l'appelant qui enchaîne `syncRunStats` — voir l'étape 6 et la Task 3 Step 12.

- [ ] **Step 5: Réécrire `src/sim/sim.ts`**

```ts
import { BOT_AI, HEAL_BETWEEN_SALLES, PLAYER_BASE, PLAYER_SPAWN, SALLES_PER_CHAPTER } from './config';
import { salleReward, playerStats } from './economy';
import { decaySpin, resolveCollision } from './combat';
import { applySteering, clampToArena, moveAndBounce } from './physics';
import { nextRandom } from './rng';
import { spawnSalle } from './salle';
import { NEUTRAL_TALENTS } from './talents';
import type { Input, MetaState, RunReward, RunState, Top } from './types';

function makePlayer(meta: MetaState): Top {
  const stats = playerStats(meta);
  return {
    id: 'player',
    isPlayer: true,
    aim: null,
    pos: { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y },
    vel: { x: 0, y: 0 },
    radius: PLAYER_BASE.radius,
    spin: stats.spinMax,
    spinMax: stats.spinMax,
    spinDecay: stats.spinDecay,
    attack: stats.attack,
    defense: stats.defense,
    maxSpeed: stats.maxSpeed,
    accel: PLAYER_BASE.accel,
    talents: NEUTRAL_TALENTS,
    decayPauseTicks: 0,
  };
}

function startSalle(run: RunState): void {
  const spawned = spawnSalle(run.salle, run.rngState);
  run.bots = spawned.bots;
  run.rngState = spawned.rngState;
  run.player.pos = { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y };
  run.player.vel = { x: 0, y: 0 };
}

export function createRun(meta: MetaState, seed: number): RunState {
  const run: RunState = {
    tick: 0,
    rngState: seed >>> 0 || 1,
    chapter: 1,
    salle: 1,
    player: makePlayer(meta),
    bots: [],
    phase: 'fighting',
    secondSouffleUsed: false,
  };
  startSalle(run);
  return run;
}

export function resetRun(run: RunState, meta: MetaState): void {
  run.salle = 1;
  run.phase = 'fighting';
  run.secondSouffleUsed = false;
  run.player = makePlayer(meta);
  startSalle(run);
}

/**
 * Recopie l'équipement du méta vers le joueur du run **en cours**.
 *
 * Sans cela, améliorer une pièce ne changerait plus rien avant le run suivant —
 * une régression sur le jalon 1, où `tryUpgrade` appelait `syncPlayerStats`.
 * Le spin est **borné vers le bas, jamais soigné** : sinon améliorer son Noyau
 * à 3 % de spin serait un soin gratuit.
 */
export function syncRunStats(run: RunState, meta: MetaState): void {
  const stats = playerStats(meta);
  run.player.attack = stats.attack;
  run.player.defense = stats.defense;
  run.player.maxSpeed = stats.maxSpeed;
  run.player.spinMax = stats.spinMax;
  run.player.spinDecay = stats.spinDecay;
  run.player.spin = Math.min(run.player.spin, stats.spinMax);
}

function refreshBotAims(run: RunState): void {
  for (const bot of run.bots) {
    const r = nextRandom(run.rngState);
    run.rngState = r.state;
    const jitter = (r.value - 0.5) * BOT_AI.aimJitter;
    const angle = Math.atan2(run.player.pos.y - bot.pos.y, run.player.pos.x - bot.pos.x) + jitter;
    bot.aim = { x: Math.cos(angle), y: Math.sin(angle) };
  }
}

/** Retourne la récompense de la salle qui vient d'être vidée, `null` sinon.
 *  N'applique rien : le méta est hors de portée de la simulation de combat. */
export function tick(run: RunState, input: Input): RunReward | null {
  run.tick++;
  if (run.phase !== 'fighting') return null;
  if (run.tick % BOT_AI.retargetEveryTicks === 1) refreshBotAims(run);
  applySteering(run.player, input.steer);
  for (const bot of run.bots) applySteering(bot, bot.aim);
  moveAndBounce(run.player);
  for (const bot of run.bots) moveAndBounce(bot);
  for (const bot of run.bots) resolveCollision(run.player, bot);
  for (let i = 0; i < run.bots.length; i++) {
    for (let j = i + 1; j < run.bots.length; j++) {
      resolveCollision(run.bots[i], run.bots[j]);
    }
  }
  clampToArena(run.player);
  for (const bot of run.bots) clampToArena(bot);
  decaySpin(run.player);
  for (const bot of run.bots) decaySpin(bot);
  run.bots = run.bots.filter((b) => b.spin > 0);
  if (run.player.spin <= 0) {
    run.phase = 'dead';
    return null;
  }
  if (run.bots.length === 0) {
    const boss = run.salle === SALLES_PER_CHAPTER;
    const reward = salleReward(run.salle, boss);
    if (boss) run.salle = 1;
    else run.salle++;
    run.player.spin = Math.min(run.player.spinMax, run.player.spin + HEAL_BETWEEN_SALLES * run.player.spinMax);
    startSalle(run);
    return reward;
  }
  return null;
}
```

`chapterValidated` n'est plus posé ici : il vit dans le méta. C'est l'appelant qui le met à jour en même temps qu'il applique la récompense — voir l'étape 6.

- [ ] **Step 6: Ajouter le pont dans `meta.ts`**

`applyReward` seul ne suffit pas : valider le chapitre est aussi une mutation du méta déclenchée par le run. Ajouter à `src/sim/meta.ts` :

```ts
import { SALLES_PER_CHAPTER } from './config';
import type { RunState } from './types';

/** Applique au méta ce qu'une salle vidée vient de produire. `salleJustCleared`
 *  est la salle **avant** l'avancement — `tick()` a déjà fait avancer `run.salle`. */
export function applyRunReward(meta: MetaState, reward: RunReward, salleJustCleared: number): void {
  applyReward(meta, reward);
  if (salleJustCleared === SALLES_PER_CHAPTER) meta.chapterValidated = true;
}
```

L'appelant doit donc lire `run.salle` **avant** d'appeler `tick()`. C'est ce que fait `useGameLoop` à l'étape 10.

- [ ] **Step 7: Écrire le test de `meta.ts` (il doit échouer d'abord)**

Créer `src/sim/meta.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { applyReward, applyRunReward, createInitialMeta } from './meta';
import { SALLES_PER_CHAPTER } from './config';

describe('createInitialMeta', () => {
  it('démarre sans monnaie, sans doublon, avec quatre pièces équipées', () => {
    const meta = createInitialMeta(42);
    expect(meta.credits).toBe(0);
    expect(meta.gems).toBe(0);
    expect(meta.inventory).toHaveLength(0);
    expect(Object.keys(meta.equipped).sort()).toEqual(['disque', 'lame', 'noyau', 'pointe']);
    expect(meta.pity).toEqual({ bronze: 0, arene: 0, mythique: 0 });
    expect(meta.chapterValidated).toBe(false);
  });

  it('ne partage aucun objet avec le modèle d’équipement de départ', () => {
    const a = createInitialMeta(1);
    const b = createInitialMeta(1);
    a.equipped.lame.level = 5;
    expect(b.equipped.lame.level).toBe(0);
  });

  it('a son propre flux de RNG, distinct de la graine brute nulle', () => {
    expect(createInitialMeta(0).rngState).toBe(1);
    expect(createInitialMeta(42).rngState).toBe(42);
  });
});

describe('applyReward', () => {
  it('ajoute crédits et gemmes', () => {
    const meta = createInitialMeta(1);
    applyReward(meta, { credits: 120, gems: 0 });
    applyReward(meta, { credits: 30, gems: 40 });
    expect(meta.credits).toBe(150);
    expect(meta.gems).toBe(40);
  });
});

describe('applyRunReward', () => {
  it('ne valide pas le chapitre sur une salle ordinaire', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 120, gems: 0 }, 3);
    expect(meta.chapterValidated).toBe(false);
  });

  it('valide le chapitre quand la salle vidée était la dernière', () => {
    const meta = createInitialMeta(1);
    applyRunReward(meta, { credits: 1, gems: 40 }, SALLES_PER_CHAPTER);
    expect(meta.chapterValidated).toBe(true);
    expect(meta.gems).toBe(40);
  });
});
```

- [ ] **Step 8: Mettre `salle.ts` en conformité avec le nouveau `Top`**

`makeBot` doit poser les deux nouveaux champs. Dans `src/sim/salle.ts`, ajouter l'import et les deux lignes dans l'objet retourné par `makeBot` :

```ts
import { NEUTRAL_TALENTS } from './talents';
```

```ts
    maxSpeed: BOT_BASE.maxSpeed,
    accel: BOT_BASE.accel,
    talents: NEUTRAL_TALENTS,
    decayPauseTicks: 0,
  };
```

- [ ] **Step 9: Adapter le rendu au nouveau type**

Dans `src/render/snapshot.ts`, remplacer les deux occurrences de `SimState` par `RunState` :

```ts
import type { Phase, RunState } from '../sim/types';
```

```ts
function snap(top: RunState['player']): TopSnapshot {
```

`Snapshot.chapterValidated` doit disparaître : le drapeau vit désormais dans le méta, que le
rendu ne voit pas. Il ne servait qu'à `observe()`, pour émettre l'événement une seule fois — or
`observe()` compare **deux** instantanés, donc la salle suffit à déduire le même événement.
Retirer le champ de l'interface et du constructeur :

```ts
export interface Snapshot {
  salle: number;
  phase: Phase;
  tops: TopSnapshot[];
}

export function takeSnapshot(run: RunState): Snapshot {
  return {
    salle: run.salle,
    phase: run.phase,
    tops: [snap(run.player), ...run.bots.map(snap)],
  };
}
```

Et dans `src/render/observer.ts`, remplacer la ligne du retour :

```ts
    chapterValidated: before.salle === SALLES_PER_CHAPTER && after.salle === 1,
```

C'est exactement l'événement voulu — « la salle 10 vient d'être vidée » — et il se déduit des deux instantanés sans que le rendu ait à connaître le méta.

- [ ] **Step 10: Router la récompense dans `useGameLoop`**

Dans `src/ui/useGameLoop.ts` : importer `applyRunReward`, prendre une `metaRef`, et lire la salle avant le tick.

```ts
import { useEffect, useRef } from 'react';
import { TICK_S } from '../sim/config';
import { tick } from '../sim/sim';
import { applyRunReward } from '../sim/meta';
import type { MetaState, RunState, Vec } from '../sim/types';
```

```ts
export interface GameLoopHandlers {
  /** Appelé juste avant chaque tick : le rendu y prend son instantané. */
  beforeTick(run: RunState): void;
  /** Appelé juste après chaque tick : le rendu y déduit ses événements. */
  afterTick(run: RunState): void;
  /** Appelé une fois par image. `alpha` ∈ [0, 1) interpole entre les deux derniers ticks. */
  draw(run: RunState, alpha: number): void;
  /** Appelé quand une salle vient d'être vidée, après application au méta. */
  onReward(reward: RunReward): void;
}

export function useGameLoop(
  runRef: { current: RunState },
  metaRef: { current: MetaState },
  steerRef: { current: Vec | null },
  handlers: GameLoopHandlers,
  running: boolean,
): void {
```

Et dans la boucle, remplacer le corps du `while` :

```ts
      while (acc >= STEP_MS) {
        h.beforeTick(runRef.current);
        const salleBefore = runRef.current.salle;
        const reward = tick(runRef.current, { steer: steerRef.current });
        if (reward) {
          applyRunReward(metaRef.current, reward, salleBefore);
          h.onReward(reward);
        }
        h.afterTick(runRef.current);
        acc -= STEP_MS;
      }
```

Ajouter `RunReward` à l'import de types, et `metaRef` aux dépendances de l'effet : `}, [runRef, metaRef, steerRef]);`

- [ ] **Step 11: Adapter `CombatScreen`**

Dans `src/ui/CombatScreen.tsx` :
- l'import de type devient `import type { MetaState, RunState, RunReward, Vec } from '../sim/types';`
- la prop `stateRef` devient `runRef: { current: RunState }` et une prop `metaRef: { current: MetaState }` s'ajoute ;
- l'appel devient `useGameLoop(runRef, metaRef, steerRef, { … }, running)` ;
- ajouter le rappel manquant dans l'objet handlers, juste après `draw` :

```ts
      onReward: (_reward: RunReward) => { onTick(); },
```

- le bouton Retenter devient :

```tsx
          onClick={() => { resetRun(runRef.current, metaRef.current); onTick(); }}
```

- toutes les lectures `stateRef.current` / `state.` deviennent `runRef.current` / `run.`, et `const s = stateRef.current;` devient `const s = runRef.current;`.

- [ ] **Step 12: Adapter `ForgeScreen` — transposition minimale**

La Forge lit désormais l'équipement. Le bloc Inventaire arrive à la Task 10 ; ici on transpose l'existant, à l'identique du point de vue du joueur. Remplacer le contenu de `src/ui/ForgeScreen.tsx` :

```tsx
import { formatCredits } from './format';
import { playerStats, tryUpgrade, upgradeCost } from '../sim/economy';
import { syncRunStats } from '../sim/sim';
import { rankLabel, type Slot } from '../sim/piece';
import { modelById } from '../content/pieces';
import type { MetaState, RunState, Stats } from '../sim/types';

interface SlotRow {
  key: Slot;
  label: string;
  stat: string;
  read: (s: Stats) => number;
}

const SLOTS: SlotRow[] = [
  { key: 'lame', label: 'Lame', stat: 'Attaque', read: (s) => s.attack },
  { key: 'disque', label: 'Disque', stat: 'Défense', read: (s) => s.defense },
  { key: 'pointe', label: 'Pointe', stat: 'Vitesse', read: (s) => s.maxSpeed },
  { key: 'noyau', label: 'Noyau', stat: 'Spin max', read: (s) => s.spinMax },
];

export function ForgeScreen({
  metaRef, runRef, onChanged,
}: {
  metaRef: { current: MetaState };
  runRef: { current: RunState };
  onChanged: () => void;
}) {
  const meta = metaRef.current;
  const before = playerStats(meta);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
        Ta toupie
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
        Le combat est en pause pendant que tu améliores.
      </p>
      {SLOTS.map((row) => {
        const piece = meta.equipped[row.key];
        const cost = upgradeCost(piece.level);
        const after = row.read(
          playerStats({ ...meta, equipped: { ...meta.equipped, [row.key]: { ...piece, level: piece.level + 1 } } }),
        );
        const affordable = meta.credits >= cost;
        return (
          <button
            key={row.key}
            disabled={!affordable}
            onClick={() => {
              if (tryUpgrade(metaRef.current, row.key)) {
                syncRunStats(runRef.current, metaRef.current);
                onChanged();
              }
            }}
            style={{
              minHeight: 64, textAlign: 'left', padding: '10px 14px', borderRadius: 11, cursor: affordable ? 'pointer' : 'default',
              border: '1px solid var(--line)', background: 'var(--panel)',
              color: affordable ? 'var(--text)' : 'var(--muted)', opacity: affordable ? 1 : 0.55,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
            }}
          >
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ font: '500 17px Oswald, ui-sans-serif, sans-serif' }}>
                {row.label} <span style={{ color: 'var(--muted)' }}>niv. {piece.level}</span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {modelById(piece.model).label} · {rankLabel(piece.rank)}
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {row.stat} {row.read(before).toFixed(0)} → {after.toFixed(0)}
              </span>
            </span>
            <span style={{ font: '600 15px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)', fontVariantNumeric: 'tabular-nums' }}>
              {formatCredits(cost)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 13: Adapter `App.tsx`**

Deux refs au lieu d'une. Le HUD gagne les gemmes.

```tsx
  const [initialMeta] = useState(() => createInitialMeta(Date.now() >>> 0));
  const metaRef = useRef(initialMeta);
  const runRef = useRef(createRun(initialMeta, Date.now() >>> 0));
```

Imports : `import { createRun } from '../sim/sim';` et `import { createInitialMeta } from '../sim/meta';`

Dans le bandeau, après le `<span>` des crédits, ajouter le compteur de gemmes :

```tsx
        <span
          style={{
            border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 9,
            padding: '5px 11px', fontSize: 12.5,
          }}
        >
          Gemmes{' '}
          <span style={{ color: 'var(--player)', fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
            {Math.floor(metaRef.current.gems)}
          </span>
        </span>
```

et remplacer `stateRef.current.credits` par `metaRef.current.credits`.

Les deux écrans reçoivent les nouvelles props :

```tsx
        <CombatScreen runRef={runRef} metaRef={metaRef} running={tab === 'combat'} onTick={redraw} audio={audioRef.current} />
```

```tsx
      {tab === 'forge' ? <ForgeScreen metaRef={metaRef} runRef={runRef} onChanged={redraw} /> : null}
```

- [ ] **Step 14: Adapter `arena.ts`**

Dans `src/render/arena.ts`, remplacer chaque occurrence du type `SimState` par `RunState` dans les signatures de `beforeTick`, `afterTick` et `draw`, et l'import de type correspondant. Aucune logique ne change.

Run: `grep -n "SimState" src/render/arena.ts`
Expected après correction : aucune ligne.

- [ ] **Step 15: Réécrire `src/sim/economy.test.ts`**

L'ancien fabriquait un `SimState` complet à la main. Le nouveau part du méta, ce qui le raccourcit nettement.

```ts
import { describe, expect, it } from 'vitest';
import { playerStats, salleReward, tryUpgrade, upgradeCost } from './economy';
import { createInitialMeta } from './meta';
import { ECON, PLAYER_BASE } from './config';
import { rarityMult } from './piece';

describe('courbes', () => {
  it('coût = 100 × 1,08^niveau', () => {
    expect(upgradeCost(0)).toBe(100);
    expect(upgradeCost(10)).toBeCloseTo(215.89, 1);
  });

  it('revenu = rewardBase × rewardGrowth^(salle−1), boss × bossRewardMult', () => {
    expect(salleReward(1, false).credits).toBeCloseTo(ECON.rewardBase, 5);
    expect(salleReward(5, false).credits).toBeCloseTo(ECON.rewardBase * Math.pow(ECON.rewardGrowth, 4), 5);
    expect(salleReward(10, true).credits).toBeCloseTo(
      ECON.rewardBase * Math.pow(ECON.rewardGrowth, 9) * ECON.bossRewardMult,
      5,
    );
  });

  it('seul le boss donne des gemmes', () => {
    expect(salleReward(9, false).gems).toBe(0);
    expect(salleReward(10, true).gems).toBe(ECON.bossGems);
  });
});

describe('pièces', () => {
  it('équipement de départ = stats de base', () => {
    const s = playerStats(createInitialMeta(1));
    expect(s.attack).toBeCloseTo(PLAYER_BASE.attack, 10);
    expect(s.spinDecay).toBeCloseTo(PLAYER_BASE.spinDecay, 10);
  });

  it('la Lame monte l’attaque de 10 % par niveau', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.level = 5;
    expect(playerStats(meta).attack).toBeCloseTo(PLAYER_BASE.attack * 1.5, 5);
  });

  it('le rang multiplie par-dessus le niveau', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.level = 5;
    meta.equipped.lame.rank = 4;
    expect(playerStats(meta).attack).toBeCloseTo(PLAYER_BASE.attack * 1.5 * rarityMult(4), 5);
  });
});

describe('tryUpgrade', () => {
  it('débite et incrémente le niveau de la pièce équipée', () => {
    const meta = createInitialMeta(1);
    meta.credits = 100;
    expect(tryUpgrade(meta, 'lame')).toBe(true);
    expect(meta.credits).toBe(0);
    expect(meta.equipped.lame.level).toBe(1);
    expect(playerStats(meta).attack).toBeCloseTo(PLAYER_BASE.attack * 1.1, 5);
  });

  it('refuse si crédits insuffisants', () => {
    const meta = createInitialMeta(1);
    meta.credits = 50;
    expect(tryUpgrade(meta, 'lame')).toBe(false);
    expect(meta.equipped.lame.level).toBe(0);
    expect(meta.credits).toBe(50);
  });
});
```

- [ ] **Step 16: Adapter `src/sim/sim.test.ts`**

Les **assertions de déterminisme restent mot pour mot**. Seuls les deux helpers changent : ils sérialisent désormais run **et** méta, ce qui rend le test strictement plus fort qu'avant.

Remplacer l'entête et les deux helpers :

```ts
import { describe, expect, it } from 'vitest';
import { createRun, resetRun, syncRunStats, tick } from './sim';
import { applyRunReward, createInitialMeta } from './meta';
import { salleReward } from './economy';
import { spawnSalle, botCountFor } from './salle';
import { SALLES_PER_CHAPTER } from './config';

function play(seed: number, n: number, clearEvery: number | null): string {
  const meta = createInitialMeta(seed);
  const run = createRun(meta, seed);
  for (let i = 0; i < n; i++) {
    if (clearEvery !== null && i % clearEvery === clearEvery - 1) for (const b of run.bots) b.spin = 0.0001;
    const salleBefore = run.salle;
    const reward = tick(run, { steer: i % 20 < 10 ? { x: 1, y: 0.5 } : null });
    if (reward) applyRunReward(meta, reward, salleBefore);
  }
  return JSON.stringify({ run, meta });
}

const runTicks = (seed: number, n: number) => play(seed, n, null);
// Force la salle à se vider régulièrement : sans ça, 300 ticks se jouent
// entièrement dans la salle 1 et le déterminisme n'est testé que sur la physique.
const runTicksThroughSalles = (seed: number, n: number) => play(seed, n, 25);
```

Puis, dans le bloc `describe('déterminisme')`, la seule ligne à corriger est le garde-fou :

```ts
    expect(JSON.parse(a).meta.chapterValidated).toBe(true);
```

Remplacer `describe('createInitialState')` par :

```ts
describe('createRun', () => {
  it('démarre chapitre 1, salle 1, phase fighting, avec les bots de la salle 1', () => {
    const run = createRun(createInitialMeta(42), 42);
    expect(run.chapter).toBe(1);
    expect(run.salle).toBe(1);
    expect(run.phase).toBe('fighting');
    expect(run.bots).toHaveLength(botCountFor(1));
    expect(run.player.spin).toBe(run.player.spinMax);
  });
});
```

Et le bloc `describe('progression')` en entier :

```ts
describe('progression', () => {
  it('vider une salle retourne la récompense et fait avancer', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    for (const b of run.bots) b.spin = 0.0001; // le decay du prochain tick les achève
    const reward = tick(run, { steer: null });
    expect(reward?.credits).toBeCloseTo(salleReward(1, false).credits, 5);
    expect(run.salle).toBe(2);
    expect(run.bots).toHaveLength(botCountFor(2));
    // tick() n'a rien appliqué : le méta est hors de sa portée.
    expect(meta.credits).toBe(0);
  });

  it('vider la salle 10 valide le chapitre et repart en salle 1', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    run.salle = SALLES_PER_CHAPTER;
    const spawned = spawnSalle(SALLES_PER_CHAPTER, run.rngState);
    run.bots = spawned.bots;
    run.rngState = spawned.rngState;
    for (const b of run.bots) b.spin = 0.0001;
    const reward = tick(run, { steer: null })!;
    applyRunReward(meta, reward, SALLES_PER_CHAPTER);
    expect(meta.chapterValidated).toBe(true);
    expect(run.salle).toBe(1);
    expect(meta.credits).toBeCloseTo(salleReward(SALLES_PER_CHAPTER, true).credits, 5);
    expect(meta.gems).toBe(salleReward(SALLES_PER_CHAPTER, true).gems);
  });

  it('spin à zéro ⇒ mort ; resetRun repart salle 1 en gardant les crédits', () => {
    const meta = createInitialMeta(1);
    meta.credits = 500;
    const run = createRun(meta, 1);
    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
    resetRun(run, meta);
    expect(run.phase).toBe('fighting');
    expect(run.salle).toBe(1);
    expect(meta.credits).toBe(500);
    expect(run.player.spin).toBe(run.player.spinMax);
  });
});

describe('syncRunStats', () => {
  it('applique l’amélioration au joueur du run en cours', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    const before = run.player.attack;
    meta.equipped.lame.level = 5;
    syncRunStats(run, meta);
    expect(run.player.attack).toBeGreaterThan(before);
  });

  it('borne le spin vers le bas et ne soigne jamais', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    run.player.spin = 100;
    meta.equipped.noyau.level = 10; // spinMax augmente
    syncRunStats(run, meta);
    expect(run.player.spin).toBe(100);

    run.player.spin = run.player.spinMax;
    meta.equipped.noyau.level = 0; // spinMax redescend
    syncRunStats(run, meta);
    expect(run.player.spin).toBe(run.player.spinMax);
  });
});
```

- [ ] **Step 17: Adapter `observer.test.ts`**

Les onze tests construisent des `Snapshot`. Retirer la propriété `chapterValidated` de chaque littéral, et remplacer les assertions qui la portaient par le nouveau critère `before.salle === SALLES_PER_CHAPTER && after.salle === 1`.

Run: `grep -n "chapterValidated" src/render/observer.test.ts`
Expected après correction : seules les lignes qui **assertent** `events.chapterValidated` subsistent ; plus aucune ne le pose dans un instantané.

- [ ] **Step 18: Lancer toute la suite**

Run: `npm run test`
Expected: tous verts. Le compte a bougé (tests ajoutés en Task 1, 2, et ici) — l'important est qu'**aucun ne soit rouge et qu'aucune assertion de déterminisme n'ait été affaiblie**.

- [ ] **Step 19: Vérifier la compilation et l'absence de résidus**

Run: `npm run build && grep -rn "SimState\|PieceLevels\|createInitialState\|syncPlayerStats" src/ | grep -v node_modules`
Expected: build vert, et **aucune** ligne de `grep`.

- [ ] **Step 20: Vérifier dans le navigateur**

Run: `npm run dev` puis ouvrir `http://localhost:5173/spinforge/` (la racine renvoie 404, `base: '/spinforge/'`).

À vérifier de ses yeux, sans quoi cette tâche n'est pas finie :
1. La toupie se pilote au doigt/à la souris, le combat tourne.
2. Le bandeau affiche **Crédits** et **Gemmes**.
3. Vider une salle crédite — le compteur monte.
4. L'onglet Forge liste les quatre emplacements avec **modèle, rang et niveau** (« Couronne Solaire · Commun »).
5. Améliorer une pièce débite, et **en revenant au Combat la toupie est réellement plus forte** — c'est ce que `syncRunStats` protège.
6. Mourir puis « Retenter » repart salle 1 en gardant les crédits.

- [ ] **Step 21: Commit**

```bash
git add src/sim src/render src/ui
git commit -m "refactor(sim): scission RunState / MetaState

L'état de combat et l'état de progression vivent désormais séparément, avec
deux flux de RNG distincts. tick() retourne la récompense d'une salle vidée au
lieu de muter le méta ; syncRunStats recopie l'équipement vers le joueur du run
en cours, ce qui préserve le retour immédiat de la Forge.

Les quatre niveaux de pièces deviennent quatre PieceInstance équipées, à modèle
et rang. Stats.accel disparaît, aucune pièce ne le modifiait."
```

---

## Task 4 : La sauvegarde

C'est la tâche qui rend le gacha réellement jouable — accumuler trois puis neuf pièces identiques ne tient pas dans une session. Elle se coupe en deux moitiés pour ne pas violer la règle de pureté : sérialisation et migrations dans `src/sim/`, `localStorage` dehors.

**Files:**
- Create: `src/sim/save.ts`
- Create: `src/sim/save.test.ts`
- Create: `src/storage/localSave.ts`
- Modify: `src/ui/App.tsx`

**Interfaces:**
- Consumes: `MetaState` (Task 3), `createInitialMeta` (Task 3).
- Produces:
  - `SAVE_SCHEMA: number`
  - `serializeMeta(meta: MetaState): string`
  - `deserializeMeta(json: string): MetaState | null` — `null` sur blob illisible ou schéma inconnu
  - `loadMeta(): { meta: MetaState; recovered: boolean }`, `scheduleSave(meta): void`, `flushSave(): void`, `installFlushOnHide(getMeta): () => void`

- [ ] **Step 1: Écrire le test (il doit échouer)**

Créer `src/sim/save.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { SAVE_SCHEMA, deserializeMeta, serializeMeta } from './save';
import { createInitialMeta } from './meta';

function filled() {
  const meta = createInitialMeta(7);
  meta.credits = 1234.5;
  meta.gems = 80;
  meta.equipped.lame = { model: 'lame.couronne-solaire', rank: 4, level: 12 };
  meta.inventory = [
    { model: 'disque.lourd', rank: 1, count: 7, bestLevel: 3 },
    { model: 'pointe.furie', rank: 3, count: 2, bestLevel: 0 },
  ];
  meta.pity = { bronze: 0, arene: 6, mythique: 19 };
  meta.chapterValidated = true;
  return meta;
}

describe('aller-retour', () => {
  it('restitue un méta identique', () => {
    const meta = filled();
    const back = deserializeMeta(serializeMeta(meta));
    expect(back).toEqual(meta);
  });

  it('ne partage aucune référence avec l’original', () => {
    const meta = filled();
    const back = deserializeMeta(serializeMeta(meta))!;
    back.inventory[0].count = 99;
    expect(meta.inventory[0].count).toBe(7);
  });

  it('écrit le numéro de schéma courant', () => {
    expect(JSON.parse(serializeMeta(filled())).v).toBe(SAVE_SCHEMA);
  });
});

describe('robustesse', () => {
  it('rejette un JSON illisible', () => {
    expect(deserializeMeta('{pas du json')).toBeNull();
  });

  it('rejette un blob sans enveloppe de version', () => {
    expect(deserializeMeta(JSON.stringify({ credits: 10 }))).toBeNull();
  });

  it('rejette un schéma venu du futur', () => {
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA + 1, meta: filled() }))).toBeNull();
  });

  it('rejette un méta amputé d’un champ obligatoire', () => {
    const meta = filled() as Partial<ReturnType<typeof filled>>;
    delete meta.equipped;
    expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
  });
});

describe('migration', () => {
  // Le schéma naît à 1 : aucune version antérieure réelle n'existe. Ce test en
  // fabrique une pour prouver que le chemin de migration fonctionne — c'est tout
  // l'intérêt de bâtir le mécanisme maintenant, la forme du méta changera au 2b.
  it('fait remonter un blob v0 jusqu’au schéma courant', () => {
    const v0 = { v: 0, meta: { credits: 300, gems: 0 } };
    const back = deserializeMeta(JSON.stringify(v0));
    expect(back).not.toBeNull();
    expect(back!.credits).toBe(300);
    // Les champs absents en v0 prennent leur valeur de départ.
    expect(back!.inventory).toEqual([]);
    expect(back!.equipped.lame.rank).toBe(1);
  });
});
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run: `npx vitest run src/sim/save.test.ts`
Expected: FAIL — `Failed to resolve import "./save"`.

- [ ] **Step 3: Écrire `src/sim/save.ts`**

```ts
import { createInitialMeta } from './meta';
import type { MetaState } from './types';

/** Numéro de schéma du méta sérialisé. À incrémenter dès que la forme de
 *  `MetaState` change, en ajoutant la migration correspondante ci-dessous. */
export const SAVE_SCHEMA = 1;

interface Envelope {
  v: number;
  meta: unknown;
}

export function serializeMeta(meta: MetaState): string {
  return JSON.stringify({ v: SAVE_SCHEMA, meta } satisfies Envelope);
}

/** Complète un méta partiel avec les valeurs de départ. C'est le mécanisme sur
 *  lequel reposent les migrations : une version antérieure est, par
 *  construction, un méta auquel il manque des champs. */
function hydrate(partial: Record<string, unknown>): MetaState {
  const base = createInitialMeta(1);
  const meta: MetaState = {
    rngState: typeof partial.rngState === 'number' ? partial.rngState : base.rngState,
    credits: typeof partial.credits === 'number' ? partial.credits : base.credits,
    gems: typeof partial.gems === 'number' ? partial.gems : base.gems,
    equipped: (partial.equipped as MetaState['equipped']) ?? base.equipped,
    inventory: (partial.inventory as MetaState['inventory']) ?? base.inventory,
    pity: (partial.pity as MetaState['pity']) ?? base.pity,
    chapterValidated: partial.chapterValidated === true,
  };
  return meta;
}

/** Vrai si le méta porte tous ses champs à la forme du schéma courant. Un blob
 *  du schéma courant est refusé s'il est amputé — c'est un blob corrompu, pas
 *  une version antérieure, et le compléter en silence masquerait le problème. */
function isComplete(m: Record<string, unknown>): boolean {
  const slots = ['lame', 'disque', 'pointe', 'noyau'];
  const equipped = m.equipped as Record<string, unknown> | undefined;
  return (
    typeof m.rngState === 'number' &&
    typeof m.credits === 'number' &&
    typeof m.gems === 'number' &&
    Array.isArray(m.inventory) &&
    typeof m.pity === 'object' && m.pity !== null &&
    equipped !== undefined && slots.every((s) => typeof equipped[s] === 'object' && equipped[s] !== null)
  );
}

export function deserializeMeta(json: string): MetaState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const env = parsed as Partial<Envelope>;
  if (typeof env.v !== 'number' || env.v > SAVE_SCHEMA) return null;
  if (typeof env.meta !== 'object' || env.meta === null) return null;

  const raw = env.meta as Record<string, unknown>;
  // Schéma courant : exigence stricte. Schéma antérieur : on complète.
  if (env.v === SAVE_SCHEMA && !isComplete(raw)) return null;
  return hydrate(structuredClone(raw));
}
```

- [ ] **Step 4: Lancer le test**

Run: `npx vitest run src/sim/save.test.ts`
Expected: PASS — 8 tests.

- [ ] **Step 5: Écrire `src/storage/localSave.ts`**

Cette moitié est **impure** : c'est précisément pourquoi elle vit hors de `src/sim/`.

```ts
import { deserializeMeta, serializeMeta } from '../sim/save';
import { createInitialMeta } from '../sim/meta';
import type { MetaState } from '../sim/types';

const KEY = 'spinforge.save';
const BACKUP_KEY = 'spinforge.save.backup';
const DEBOUNCE_MS = 1000;

/** Charge le méta. `recovered` vaut vrai si une sauvegarde existait mais s'est
 *  révélée illisible : elle a alors été recopiée sous une clé de secours plutôt
 *  qu'écrasée. Perdre une progression sans laisser de trace est le pire défaut
 *  qu'une sauvegarde puisse avoir. */
export function loadMeta(): { meta: MetaState; recovered: boolean } {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return { meta: createInitialMeta(Date.now() >>> 0), recovered: false };
  }
  if (raw === null) return { meta: createInitialMeta(Date.now() >>> 0), recovered: false };

  const meta = deserializeMeta(raw);
  if (meta !== null) return { meta, recovered: false };

  try {
    localStorage.setItem(BACKUP_KEY, raw);
  } catch {
    // Quota plein ou stockage refusé : on ne peut pas mieux faire que continuer.
  }
  return { meta: createInitialMeta(Date.now() >>> 0), recovered: true };
}

let timer: ReturnType<typeof setTimeout> | null = null;
let pending: MetaState | null = null;

function write(meta: MetaState): void {
  try {
    localStorage.setItem(KEY, serializeMeta(meta));
  } catch {
    // Stockage indisponible (navigation privée, quota) : la partie continue.
  }
}

/** Écriture débouncée. Appelée à chaque mutation du méta — récompense de salle,
 *  coffre, fusion, équipement, amélioration. */
export function scheduleSave(meta: MetaState): void {
  pending = meta;
  if (timer !== null) return;
  timer = setTimeout(() => {
    timer = null;
    if (pending) write(pending);
    pending = null;
  }, DEBOUNCE_MS);
}

export function flushSave(): void {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
  if (pending) write(pending);
  pending = null;
}

/** Écrit sans attendre le débounce quand la page part. Retourne le désabonnement. */
export function installFlushOnHide(): () => void {
  const onHide = () => flushSave();
  window.addEventListener('pagehide', onHide);
  return () => window.removeEventListener('pagehide', onHide);
}
```

- [ ] **Step 6: Brancher la sauvegarde dans `App.tsx`**

Remplacer l'initialisation du méta par un chargement, et sauvegarder à chaque mutation.

```tsx
import { flushSave, installFlushOnHide, loadMeta, scheduleSave } from '../storage/localSave';
```

```tsx
  const [loaded] = useState(() => loadMeta());
  const metaRef = useRef(loaded.meta);
  const runRef = useRef(createRun(loaded.meta, Date.now() >>> 0));

  // Une seule porte pour « le méta a changé » : redessine et programme l'écriture.
  const metaChanged = () => {
    scheduleSave(metaRef.current);
    redraw();
  };

  useEffect(() => installFlushOnHide(), []);
  useEffect(() => () => flushSave(), []);
```

Passer `metaChanged` là où le méta est muté :

```tsx
        <CombatScreen runRef={runRef} metaRef={metaRef} running={tab === 'combat'} onTick={redraw} onMetaChanged={metaChanged} audio={audioRef.current} />
```

```tsx
      {tab === 'forge' ? <ForgeScreen metaRef={metaRef} runRef={runRef} onChanged={metaChanged} /> : null}
```

Si `loaded.recovered`, afficher un bandeau discret sous l'en-tête — le joueur doit savoir :

```tsx
      {loaded.recovered ? (
        <p style={{ margin: 0, fontSize: 12, color: 'var(--boss)' }}>
          Ta sauvegarde était illisible et n'a pas pu être chargée. Elle a été mise de côté ; une nouvelle partie a démarré.
        </p>
      ) : null}
```

- [ ] **Step 7: Faire remonter les récompenses jusqu'à la sauvegarde**

Dans `src/ui/CombatScreen.tsx`, ajouter la prop `onMetaChanged: () => void` à la signature, et l'appeler à la place de `onTick` dans le rappel de récompense :

```ts
      onReward: () => { onMetaChanged(); },
```

C'est le seul endroit où le combat mute le méta ; le débounce d'une seconde absorbe la cadence.

- [ ] **Step 8: Lancer la suite complète**

Run: `npm run test && npm run build`
Expected: tous verts.

- [ ] **Step 9: Vérifier dans le navigateur — c'est le cœur de cette tâche**

Run: `npm run dev` puis `http://localhost:5173/spinforge/`

1. Jouer jusqu'à gagner des crédits, aller en Forge, améliorer une pièce.
2. **Recharger la page (F5).** Crédits, gemmes et niveau de la pièce doivent être **exactement** ceux d'avant.
3. Valider une salle, recharger dans la seconde : la récompense doit être là (le flush `pagehide` doit avoir joué).
4. Dans la console : `localStorage.setItem('spinforge.save', 'nawak')` puis recharger. Une partie neuve démarre, le bandeau d'avertissement s'affiche, et `localStorage.getItem('spinforge.save.backup')` vaut `'nawak'`.
5. Rejouer un peu, recharger : la nouvelle partie se sauvegarde normalement.

- [ ] **Step 10: Commit**

```bash
git add src/sim/save.ts src/sim/save.test.ts src/storage/localSave.ts src/ui/App.tsx src/ui/CombatScreen.tsx
git commit -m "feat(save): sauvegarde du méta, versionnée et tolérante aux pannes

Sérialisation et migrations pures dans src/sim/save.ts, localStorage isolé dans
src/storage/. Le blob porte un numéro de schéma ; un blob illisible démarre une
partie neuve et se voit recopié sous une clé de secours au lieu d'être écrasé.

Écriture débouncée sur les mutations du méta, flush sur pagehide. Le run en
cours n'est pas sauvegardé : fermer l'onglet équivaut à abandonner le run."
```

---

## Task 5 : Les talents de combat (Lame et Disque)

Six des douze talents, tous implémentés dans `combat.ts`. L'infrastructure de résolution arrive ici et servira aussi à la Task 6.

**Files:**
- Modify: `src/sim/talents.ts`
- Create: `src/sim/talents.test.ts`
- Modify: `src/sim/combat.ts` (remplacement complet)
- Modify: `src/sim/combat.test.ts`
- Modify: `src/sim/sim.ts` (`makePlayer`, `syncRunStats`)

**Interfaces:**
- Consumes: `TALENTS` depuis `./config`, `MetaState` et `Top` depuis `./types`.
- Produces:
  - `type TalentId = 'estoc' | 'riposte' | 'percee' | 'ancrage' | 'frolement' | 'masse' | 'glisse' | 'relance' | 'toupieFolle' | 'reserve' | 'secondSouffle' | 'coeurGyre'`
  - `TALENTS_BY_SLOT: Record<Slot, TalentId[]>`
  - `talentsOf(slot: Slot, rank: number): TalentId[]`
  - `resolveTalents(meta: MetaState): TalentMods`
  - `TalentMods` gagne `healBetweenSalles` et `secondSouffle` (utilisés en Task 6)

- [ ] **Step 1: Écrire le test de résolution (il doit échouer)**

Créer `src/sim/talents.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { NEUTRAL_TALENTS, resolveTalents, talentsOf } from './talents';
import { createInitialMeta } from './meta';
import { TALENTS, FRICTION, HEAL_BETWEEN_SALLES } from './config';

describe('talentsOf', () => {
  it('ne donne rien en dessous du premier palier nommé', () => {
    expect(talentsOf('lame', 1)).toEqual([]);
    expect(talentsOf('lame', 3)).toEqual([]);
  });

  it('donne le talent d’Excellent au rang 4', () => {
    expect(talentsOf('lame', 4)).toEqual(['estoc']);
    expect(talentsOf('disque', 4)).toEqual(['ancrage']);
  });

  it('est cumulatif : une Légende porte les trois de son emplacement', () => {
    expect(talentsOf('lame', 11)).toEqual(['estoc', 'riposte', 'percee']);
    expect(talentsOf('noyau', 11)).toEqual(['reserve', 'secondSouffle', 'coeurGyre']);
  });

  it('ne donne rien de plus au-delà de Légende', () => {
    expect(talentsOf('pointe', 40)).toEqual(talentsOf('pointe', 11));
  });

  it('ne donne pas le talent d’un autre emplacement', () => {
    expect(talentsOf('disque', 11)).not.toContain('estoc');
  });
});

describe('resolveTalents', () => {
  it('rend les valeurs neutres sur l’équipement de départ', () => {
    expect(resolveTalents(createInitialMeta(1))).toEqual(NEUTRAL_TALENTS);
  });

  it('applique Estoc dès que la Lame est Excellente', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.rank = 4;
    const mods = resolveTalents(meta);
    expect(mods.estocThreshold).toBe(TALENTS.estoc.speedThreshold);
    expect(mods.estocBonus).toBe(TALENTS.estoc.damageBonus);
    expect(mods.riposte).toBe(0);
  });

  it('cumule les talents de plusieurs emplacements', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.rank = 11;
    meta.equipped.disque.rank = 11;
    const mods = resolveTalents(meta);
    expect(mods.defenseIgnore).toBe(TALENTS.percee.defenseIgnore);
    expect(mods.mass).toBe(TALENTS.masse.mass);
    expect(mods.impulseTaken).toBe(TALENTS.ancrage.impulseTaken);
  });

  it('laisse leurs valeurs neutres aux champs des emplacements non montés', () => {
    const meta = createInitialMeta(1);
    meta.equipped.lame.rank = 11;
    const mods = resolveTalents(meta);
    expect(mods.friction).toBe(FRICTION);
    expect(mods.spinDecayMult).toBe(1);
    expect(mods.healBetweenSalles).toBe(HEAL_BETWEEN_SALLES);
    expect(mods.secondSouffle).toBe(0);
  });
});
```

- [ ] **Step 2: Lancer le test pour le voir échouer**

Run: `npx vitest run src/sim/talents.test.ts`
Expected: FAIL — `resolveTalents is not a function`.

- [ ] **Step 3: Compléter `src/sim/talents.ts`**

Remplacer le contenu du fichier :

```ts
import { FRICTION, HEAL_BETWEEN_SALLES, TALENTS } from './config';
import type { Slot } from './piece';
import type { MetaState } from './types';

export type TalentId =
  | 'estoc' | 'riposte' | 'percee'
  | 'ancrage' | 'frolement' | 'masse'
  | 'glisse' | 'relance' | 'toupieFolle'
  | 'reserve' | 'secondSouffle' | 'coeurGyre';

/** Modificateurs appliqués à une toupie. Chaque champ a une valeur *neutre*,
 *  celle d'une toupie sans talent : le code de combat multiplie et compare
 *  sans jamais tester la présence d'un talent. */
export interface TalentMods {
  /** Vitesse d'impact au-delà de laquelle Estoc majore les dégâts. Infinity = jamais. */
  estocThreshold: number;
  estocBonus: number;
  /** Part des dégâts encaissés renvoyée à l'agresseur (Riposte). */
  riposte: number;
  /** Part de la défense adverse ignorée (Percée). */
  defenseIgnore: number;
  /** Facteur sur l'impulsion *reçue* (Ancrage). 1 = intacte. */
  impulseTaken: number;
  /** Vitesse d'impact en-deçà de laquelle aucun dégât n'est subi (Frôlement). 0 = jamais. */
  frolementThreshold: number;
  /** Masse dans le calcul d'impulsion (Masse). 1 = ordinaire. */
  mass: number;
  /** Friction au sol propre à cette toupie (Glisse). */
  friction: number;
  /** Ticks de suspension de la décroissance après un choc (Relance). 0 = aucune. */
  relanceTicks: number;
  /** Gain de vitesse maximale à spin nul (Toupie folle). 0 = aucun. */
  toupieFolle: number;
  /** Part de spin rendue entre deux salles (Réserve). */
  healBetweenSalles: number;
  /** Part de spin rendue au sursis (Second souffle). 0 = pas de sursis. */
  secondSouffle: number;
  /** Facteur sur la décroissance naturelle (Cœur Gyre). 1 = ordinaire. */
  spinDecayMult: number;
}

/** Partagé par tous les bots — figé pour qu'aucun effet ne puisse fuiter sur eux. */
export const NEUTRAL_TALENTS: TalentMods = Object.freeze({
  estocThreshold: Infinity,
  estocBonus: 0,
  riposte: 0,
  defenseIgnore: 0,
  impulseTaken: 1,
  frolementThreshold: 0,
  mass: 1,
  friction: FRICTION,
  relanceTicks: 0,
  toupieFolle: 0,
  healBetweenSalles: HEAL_BETWEEN_SALLES,
  secondSouffle: 0,
  spinDecayMult: 1,
});

/** Un talent par palier nommé — Excellent, Épique, Légende — et par emplacement.
 *  L'ordre suit les rangs croissants ; `talentsOf` s'appuie dessus. */
export const TALENTS_BY_SLOT: Record<Slot, TalentId[]> = {
  lame: ['estoc', 'riposte', 'percee'],
  disque: ['ancrage', 'frolement', 'masse'],
  pointe: ['glisse', 'relance', 'toupieFolle'],
  noyau: ['reserve', 'secondSouffle', 'coeurGyre'],
};

export function talentsOf(slot: Slot, rank: number): TalentId[] {
  return TALENTS_BY_SLOT[slot].filter((id) => rank >= TALENTS[id].rank);
}

/** Réduit l'équipement du méta à un jeu de modificateurs. Appelé à la création
 *  d'un run et à chaque changement d'équipement, jamais pendant un tick. */
export function resolveTalents(meta: MetaState): TalentMods {
  const mods: TalentMods = { ...NEUTRAL_TALENTS };
  for (const slot of ['lame', 'disque', 'pointe', 'noyau'] as Slot[]) {
    for (const id of talentsOf(slot, meta.equipped[slot].rank)) {
      switch (id) {
        case 'estoc':
          mods.estocThreshold = TALENTS.estoc.speedThreshold;
          mods.estocBonus = TALENTS.estoc.damageBonus;
          break;
        case 'riposte': mods.riposte = TALENTS.riposte.reflect; break;
        case 'percee': mods.defenseIgnore = TALENTS.percee.defenseIgnore; break;
        case 'ancrage': mods.impulseTaken = TALENTS.ancrage.impulseTaken; break;
        case 'frolement': mods.frolementThreshold = TALENTS.frolement.speedThreshold; break;
        case 'masse': mods.mass = TALENTS.masse.mass; break;
        case 'glisse': mods.friction = TALENTS.glisse.friction; break;
        case 'relance': mods.relanceTicks = TALENTS.relance.ticks; break;
        case 'toupieFolle': mods.toupieFolle = TALENTS.toupieFolle.maxSpeedAtZero; break;
        case 'reserve': mods.healBetweenSalles = TALENTS.reserve.heal; break;
        case 'secondSouffle': mods.secondSouffle = TALENTS.secondSouffle.revive; break;
        case 'coeurGyre': mods.spinDecayMult = TALENTS.coeurGyre.decayMult; break;
      }
    }
  }
  return mods;
}
```

- [ ] **Step 4: Lancer le test de résolution**

Run: `npx vitest run src/sim/talents.test.ts`
Expected: PASS — 9 tests.

- [ ] **Step 5: Poser les talents sur le joueur**

Dans `src/sim/sim.ts` : importer `resolveTalents`, et dans `makePlayer` remplacer `talents: NEUTRAL_TALENTS,` par `talents: resolveTalents(meta),`. Ajouter la même ligne à la fin de `syncRunStats` :

```ts
  run.player.talents = resolveTalents(meta);
```

Et remplacer, dans `tick`, la constante de soin entre salles par celle du talent :

```ts
    run.player.spin = Math.min(
      run.player.spinMax,
      run.player.spin + run.player.talents.healBetweenSalles * run.player.spinMax,
    );
```

L'import de `HEAL_BETWEEN_SALLES` dans `sim.ts` devient inutile — le retirer.

- [ ] **Step 6: Écrire les tests des six talents de combat (ils doivent échouer)**

Ajouter à `src/sim/combat.test.ts`. **Conserver les six tests existants**, dont les deux qui
verrouillent le partage de charge : ils sont la preuve que foncer paie, et les casser rouvrirait
le défaut le plus grave remonté par le premier test joueur.

Le helper `headOn` ci-dessous lance les deux toupies à ±100 : un choc frontal parfait, donc
`share = 0,5` et `chargeWeight = 1` des deux côtés. Les mesures de talent ci-dessous sont donc
prises sur un choc où la charge est neutre — c'est voulu, chaque test n'isole qu'un effet.

```ts
import { NEUTRAL_TALENTS } from './talents';
import { TALENTS } from './config';
import type { Top } from './types';

function top(overrides: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: 12, spin: 1000, spinMax: 1000, spinDecay: 10,
    attack: 30, defense: 10, maxSpeed: 200, accel: 500,
    talents: NEUTRAL_TALENTS, decayPauseTicks: 0,
    ...overrides,
  };
}

/** Deux toupies qui se rentrent dedans de face, en collision garantie. */
function headOn(a: Partial<Top>, b: Partial<Top>): [Top, Top] {
  return [
    top({ id: 'a', pos: { x: -10, y: 0 }, vel: { x: 100, y: 0 }, ...a }),
    top({ id: 'b', pos: { x: 10, y: 0 }, vel: { x: -100, y: 0 }, ...b }),
  ];
}

describe('talent Estoc', () => {
  it('majore les dégâts au-delà du seuil de vitesse', () => {
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);
    const plain = 1000 - b0.spin;

    const [a1, b1] = headOn({ talents: { ...NEUTRAL_TALENTS, estocThreshold: 0, estocBonus: TALENTS.estoc.damageBonus } }, {});
    resolveCollision(a1, b1);
    expect(1000 - b1.spin).toBeCloseTo(plain * (1 + TALENTS.estoc.damageBonus), 6);
  });

  it('ne fait rien sous le seuil', () => {
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);
    const plain = 1000 - b0.spin;

    const [a1, b1] = headOn({ talents: { ...NEUTRAL_TALENTS, estocThreshold: Infinity, estocBonus: 5 } }, {});
    resolveCollision(a1, b1);
    expect(1000 - b1.spin).toBeCloseTo(plain, 6);
  });
});

describe('talent Percée', () => {
  it('ignore une part de la défense adverse', () => {
    const [a0, b0] = headOn({}, { defense: 100 });
    resolveCollision(a0, b0);
    const plain = 1000 - b0.spin;

    const [a1, b1] = headOn({ talents: { ...NEUTRAL_TALENTS, defenseIgnore: 0.5 } }, { defense: 100 });
    resolveCollision(a1, b1);
    expect(1000 - b1.spin).toBeGreaterThan(plain);
  });
});

describe('talent Riposte', () => {
  it('renvoie une part des dégâts encaissés à l’agresseur', () => {
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);
    const takenByA = 1000 - a0.spin;
    const takenByB = 1000 - b0.spin;

    const [a1, b1] = headOn({}, { talents: { ...NEUTRAL_TALENTS, riposte: 0.5 } });
    resolveCollision(a1, b1);
    expect(1000 - a1.spin).toBeCloseTo(takenByA + takenByB * 0.5, 6);
    // Le porteur du talent n'encaisse pas plus pour autant.
    expect(1000 - b1.spin).toBeCloseTo(takenByB, 6);
  });
});

describe('talent Frôlement', () => {
  it('annule les dégâts subis sous le seuil', () => {
    const [a, b] = headOn({}, { talents: { ...NEUTRAL_TALENTS, frolementThreshold: Infinity } });
    resolveCollision(a, b);
    expect(b.spin).toBe(1000);
    // L'autre encaisse normalement : le talent ne protège que son porteur.
    expect(a.spin).toBeLessThan(1000);
  });
});

describe('talent Ancrage', () => {
  it('réduit l’impulsion reçue sans changer celle de l’autre', () => {
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);

    const [a1, b1] = headOn({}, { talents: { ...NEUTRAL_TALENTS, impulseTaken: 0.5 } });
    resolveCollision(a1, b1);
    expect(Math.abs(b1.vel.x)).toBeLessThan(Math.abs(b0.vel.x));
    expect(a1.vel.x).toBeCloseTo(a0.vel.x, 6);
  });
});

describe('talent Masse', () => {
  it('fait reculer l’autre davantage et soi-même moins', () => {
    const [a0, b0] = headOn({}, {});
    resolveCollision(a0, b0);

    const [a1, b1] = headOn({ talents: { ...NEUTRAL_TALENTS, mass: 2 } }, {});
    resolveCollision(a1, b1);
    expect(Math.abs(a1.vel.x)).toBeLessThan(Math.abs(a0.vel.x));
    expect(Math.abs(b1.vel.x)).toBeGreaterThan(Math.abs(b0.vel.x));
  });
});

describe('talent Relance', () => {
  it('arme la suspension de décroissance sur le porteur uniquement', () => {
    const [a, b] = headOn({ talents: { ...NEUTRAL_TALENTS, relanceTicks: 20 } }, {});
    resolveCollision(a, b);
    expect(a.decayPauseTicks).toBe(20);
    expect(b.decayPauseTicks).toBe(0);
  });
});

describe('décroissance modulée', () => {
  it('Cœur Gyre ralentit la perte naturelle', () => {
    const t = top({ talents: { ...NEUTRAL_TALENTS, spinDecayMult: 0.5 } });
    decaySpin(t);
    expect(1000 - t.spin).toBeCloseTo(10 * 0.5 * 0.1, 10);
  });

  it('Relance suspend la perte et consomme un tick', () => {
    const t = top({ decayPauseTicks: 2 });
    decaySpin(t);
    expect(t.spin).toBe(1000);
    expect(t.decayPauseTicks).toBe(1);
    decaySpin(t);
    expect(t.decayPauseTicks).toBe(0);
    decaySpin(t);
    expect(t.spin).toBeLessThan(1000);
  });
});
```

Les imports à ajouter en tête du fichier sont ceux qu'utilisent ces tests : `NEUTRAL_TALENTS`
depuis `./talents`, `TALENTS` depuis `./config`, `Top` depuis `./types`, et `decaySpin` doit
figurer dans l'import existant de `./combat`.

- [ ] **Step 7: Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/combat.test.ts`
Expected: FAIL sur les nouveaux tests (les quatre anciens restent verts).

- [ ] **Step 8: Réécrire `src/sim/combat.ts`**

```ts
import { CHARGE_BONUS, DAMAGE_K, RESTITUTION, TICK_S } from './config';
import type { Top } from './types';

/** Décroissance effective d'un tick pour cette toupie. Le rendu s'en sert pour
 *  distinguer un choc de l'endurance qui s'épuise (`observer.ts`) — d'où
 *  l'export : la formule doit rester en un seul endroit. */
export function decayPerTick(top: Top): number {
  if (top.decayPauseTicks > 0) return 0;
  return top.spinDecay * top.talents.spinDecayMult;
}

export function decaySpin(top: Top): void {
  if (top.decayPauseTicks > 0) {
    top.decayPauseTicks--;
    return;
  }
  top.spin -= decayPerTick(top) * TICK_S;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/** 1 quand les deux avancent autant, 1 + CHARGE_BONUS pour un assaut pur. */
function chargeWeight(share: number): number {
  return 1 - CHARGE_BONUS + 2 * CHARGE_BONUS * share;
}

/** Dégâts qu'`att` inflige à `def` pour un impact donné. `share` est la part du
 *  rapprochement qu'`att` a elle-même provoquée. Les trois facteurs se composent :
 *  la charge module selon qui a foncé, Percée retire une part de la défense,
 *  Estoc majore au-delà d'un seuil de vitesse. */
function damage(att: Top, def: Top, impact: number, share: number): number {
  const defense = def.defense * (1 - att.talents.defenseIgnore);
  const bonus = impact >= att.talents.estocThreshold ? 1 + att.talents.estocBonus : 1;
  return ((impact * att.attack) / (att.attack + defense)) * DAMAGE_K * chargeWeight(share) * bonus;
}

export function resolveCollision(a: Top, b: Top): void {
  const dx = b.pos.x - a.pos.x;
  const dy = b.pos.y - a.pos.y;
  const dist = Math.hypot(dx, dy);
  const minDist = a.radius + b.radius;
  if (dist === 0 || dist >= minDist) return;
  const nx = dx / dist;
  const ny = dy / dist;
  const overlap = (minDist - dist) / 2;
  a.pos.x -= nx * overlap;
  a.pos.y -= ny * overlap;
  b.pos.x += nx * overlap;
  b.pos.y += ny * overlap;
  const rvx = b.vel.x - a.vel.x;
  const rvy = b.vel.y - a.vel.y;
  const vrel = rvx * nx + rvy * ny;
  if (vrel >= 0) return;
  const impact = -vrel;

  // Qui a provoqué le rapprochement ? Se lit IMPÉRATIVEMENT avant l'impulsion, qui
  // échange précisément les vitesses des deux toupies et inverserait la réponse —
  // récompensant alors la passivité. `impact` étant la somme exacte des deux
  // vitesses de fermeture, les deux poids de charge somment toujours à 2 : un choc
  // frontal reste rigoureusement ce qu'il était.
  const share = clamp01((a.vel.x * nx + a.vel.y * ny) / impact);

  // Impulsion pondérée par les masses. À masses égales (1 et 1), j vaut
  // -(1+e)·vrel/2 et chacun en reçoit la moitié — exactement le calcul du jalon 1.
  const ma = a.talents.mass;
  const mb = b.talents.mass;
  const j = (-(1 + RESTITUTION) * vrel) / (1 / ma + 1 / mb);
  a.vel.x -= (j / ma) * nx * a.talents.impulseTaken;
  a.vel.y -= (j / ma) * ny * a.talents.impulseTaken;
  b.vel.x += (j / mb) * nx * b.talents.impulseTaken;
  b.vel.y += (j / mb) * ny * b.talents.impulseTaken;

  // Frôlement protège son porteur seul : chaque camp teste son propre seuil.
  const toB = impact < b.talents.frolementThreshold ? 0 : damage(a, b, impact, share);
  const toA = impact < a.talents.frolementThreshold ? 0 : damage(b, a, impact, 1 - share);
  // Riposte renvoie une part de ce que son porteur vient d'encaisser.
  b.spin -= toB + toA * a.talents.riposte;
  a.spin -= toA + toB * b.talents.riposte;

  if (a.talents.relanceTicks > 0) a.decayPauseTicks = a.talents.relanceTicks;
  if (b.talents.relanceTicks > 0) b.decayPauseTicks = b.talents.relanceTicks;
}
```

- [ ] **Step 9: Lancer les tests**

Run: `npx vitest run src/sim/combat.test.ts`
Expected: PASS — les quatre anciens **et** les nouveaux.

- [ ] **Step 10: Vérifier que le combat de base n'a pas bougé**

Le calcul d'impulsion a été réécrit ; à masses neutres il doit produire exactement les mêmes nombres qu'avant.

Run: `npm run test`
Expected: tous verts, et en particulier :
- **les deux tests de partage de charge** de `combat.test.ts` — s'ils cassent, la part de charge
  a probablement été calculée après l'impulsion au lieu d'avant ;
- **les trois tests de déterminisme de `sim.test.ts`** — s'ils cassent, la réécriture de
  l'impulsion a changé la physique neutre, et c'est la formule qu'il faut corriger, pas le test.

- [ ] **Step 11: Commit**

```bash
git add src/sim/talents.ts src/sim/talents.test.ts src/sim/combat.ts src/sim/combat.test.ts src/sim/sim.ts
git commit -m "feat(sim): les six talents de combat — Lame et Disque

Estoc, Riposte, Percée, Ancrage, Frôlement et Masse, résolus depuis
l'équipement en un jeu de modificateurs à valeurs neutres : le code de combat
multiplie et compare sans jamais tester la présence d'un talent.

L'impulsion est désormais pondérée par les masses ; à masses égales elle
reproduit exactement le calcul du jalon 1."
```

---

## Task 6 : Les talents de mouvement et d'endurance (Pointe et Noyau)

Les six restants, plus **la correction de l'observateur** que Relance et Cœur Gyre rendent nécessaire. C'est le point le plus subtil du jalon : il ne casse aucun test et se voit immédiatement à l'écran.

**Files:**
- Modify: `src/sim/physics.ts`
- Modify: `src/sim/physics.test.ts`
- Modify: `src/sim/sim.ts` (sursis de Second souffle)
- Modify: `src/sim/sim.test.ts`
- Modify: `src/render/snapshot.ts`, `src/render/observer.ts`, `src/render/observer.test.ts`

**Interfaces:**
- Consumes: `TalentMods` et `decayPerTick` (Task 5).
- Produces: `TopSnapshot.decayPerTick` remplace `TopSnapshot.spinDecay`.

- [ ] **Step 1: Écrire les tests de Glisse et Toupie folle (ils doivent échouer)**

Ajouter à `src/sim/physics.test.ts` (conserver les neuf tests existants) :

```ts
import { NEUTRAL_TALENTS } from './talents';
import { FRICTION } from './config';
import type { Top } from './types';

function movingTop(overrides: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 100, y: 0 },
    radius: 12, spin: 1000, spinMax: 1000, spinDecay: 10,
    attack: 30, defense: 10, maxSpeed: 200, accel: 500,
    talents: NEUTRAL_TALENTS, decayPauseTicks: 0,
    ...overrides,
  };
}

describe('talent Glisse', () => {
  it('conserve mieux la vitesse en roue libre', () => {
    const plain = movingTop();
    applySteering(plain, null);

    const glisse = movingTop({ talents: { ...NEUTRAL_TALENTS, friction: 0.99 } });
    applySteering(glisse, null);

    expect(glisse.vel.x).toBeGreaterThan(plain.vel.x);
    expect(plain.vel.x).toBeCloseTo(100 * FRICTION, 10);
  });
});

describe('talent Toupie folle', () => {
  it('ne change rien à spin plein', () => {
    const t = movingTop({ vel: { x: 1000, y: 0 }, talents: { ...NEUTRAL_TALENTS, toupieFolle: 0.4 } });
    applySteering(t, null);
    expect(t.vel.x).toBeCloseTo(200, 6);
  });

  it('relève la vitesse maximale à mesure que le spin baisse', () => {
    const t = movingTop({ vel: { x: 1000, y: 0 }, spin: 0, talents: { ...NEUTRAL_TALENTS, toupieFolle: 0.4 } });
    applySteering(t, null);
    expect(t.vel.x).toBeCloseTo(200 * 1.4, 6);
  });

  it('ne fait rien sans le talent', () => {
    const t = movingTop({ vel: { x: 1000, y: 0 }, spin: 0 });
    applySteering(t, null);
    expect(t.vel.x).toBeCloseTo(200, 6);
  });
});
```

- [ ] **Step 2: Lancer pour voir échouer**

Run: `npx vitest run src/sim/physics.test.ts`
Expected: FAIL sur les quatre nouveaux tests.

- [ ] **Step 3: Modifier `src/sim/physics.ts`**

Seul `applySteering` change ; `moveAndBounce` et `clampToArena` restent intacts.

```ts
import { ARENA_RADIUS, TICK_S, WALL_RESTITUTION } from './config';
import type { Top, Vec } from './types';

/** Vitesse maximale effective. Toupie folle la relève à mesure que le spin
 *  baisse : à spin nul, `maxSpeed × (1 + toupieFolle)`. */
function effectiveMaxSpeed(top: Top): number {
  if (top.talents.toupieFolle === 0) return top.maxSpeed;
  const lost = top.spinMax > 0 ? 1 - Math.max(0, Math.min(1, top.spin / top.spinMax)) : 1;
  return top.maxSpeed * (1 + top.talents.toupieFolle * lost);
}

export function applySteering(top: Top, steer: Vec | null): void {
  if (steer) {
    const len = Math.hypot(steer.x, steer.y) || 1;
    top.vel.x += (steer.x / len) * top.accel * TICK_S;
    top.vel.y += (steer.y / len) * top.accel * TICK_S;
  } else {
    top.vel.x *= top.talents.friction;
    top.vel.y *= top.talents.friction;
  }
  const max = effectiveMaxSpeed(top);
  const speed = Math.hypot(top.vel.x, top.vel.y);
  if (speed > max) {
    const k = max / speed;
    top.vel.x *= k;
    top.vel.y *= k;
  }
}
```

`FRICTION` n'est plus importé ici — il vient de `top.talents.friction`, dont la valeur neutre **est** `FRICTION`. Retirer l'import.

- [ ] **Step 4: Lancer les tests de physique**

Run: `npx vitest run src/sim/physics.test.ts`
Expected: PASS — 13 tests.

- [ ] **Step 5: Écrire le test de Second souffle (il doit échouer)**

Ajouter à `src/sim/sim.test.ts` :

```ts
describe('talent Second souffle', () => {
  it('accorde un sursis au lieu de la mort, une seule fois par run', () => {
    const meta = createInitialMeta(1);
    meta.equipped.noyau.rank = 7; // Épique : Réserve + Second souffle
    const run = createRun(meta, 1);

    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('fighting');
    expect(run.player.spin).toBeCloseTo(run.player.spinMax * 0.2, 5);
    expect(run.secondSouffleUsed).toBe(true);

    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
  });

  it('resetRun réarme le sursis', () => {
    const meta = createInitialMeta(1);
    meta.equipped.noyau.rank = 7;
    const run = createRun(meta, 1);
    run.secondSouffleUsed = true;
    resetRun(run, meta);
    expect(run.secondSouffleUsed).toBe(false);
  });

  it('sans le talent, spin à zéro tue toujours', () => {
    const meta = createInitialMeta(1);
    const run = createRun(meta, 1);
    run.player.spin = 0.0001;
    tick(run, { steer: null });
    expect(run.phase).toBe('dead');
  });
});

describe('talent Réserve', () => {
  it('rend davantage de spin entre deux salles', () => {
    const meta = createInitialMeta(1);
    meta.equipped.noyau.rank = 4; // Excellent : Réserve
    const run = createRun(meta, 1);
    run.player.spin = 100;
    for (const b of run.bots) b.spin = 0.0001;
    tick(run, { steer: null });
    // 0,35 du spin max au lieu de 0,20.
    expect(run.player.spin).toBeGreaterThan(100 + 0.3 * run.player.spinMax);
  });
});
```

- [ ] **Step 6: Implémenter le sursis dans `src/sim/sim.ts`**

Remplacer le bloc de mort dans `tick` :

```ts
  if (run.player.spin <= 0) {
    // Second souffle : un sursis par run, sinon la mort.
    if (!run.secondSouffleUsed && run.player.talents.secondSouffle > 0) {
      run.secondSouffleUsed = true;
      run.player.spin = run.player.spinMax * run.player.talents.secondSouffle;
    } else {
      run.phase = 'dead';
      return null;
    }
  }
```

- [ ] **Step 7: Lancer les tests**

Run: `npx vitest run src/sim/sim.test.ts`
Expected: PASS.

- [ ] **Step 8: Corriger l'observateur — la décroissance effective**

`observe()` distingue un choc de l'endurance qui s'épuise en soustrayant `prev.spinDecay * TICK_S`. Relance (décroissance suspendue) et Cœur Gyre (−40 %) rendent cette soustraction fausse : le rendu retrancherait une perte qui n'a pas eu lieu, et **masquerait des chocs réels**. Aucun test ne le verrait ; le joueur, si.

L'instantané doit porter la décroissance **effective du tick à venir**, pas la valeur brute. Il est pris dans `beforeTick`, donc `decayPerTick` y prédit exactement ce que le tick va retrancher.

Dans `src/render/snapshot.ts` :

```ts
import { decayPerTick } from '../sim/combat';
```

```ts
/** Ce que le rendu retient d'une toupie entre deux ticks. */
export interface TopSnapshot {
  id: string;
  x: number;
  y: number;
  spin: number;
  /** Décroissance **effective** du tick à venir, talents compris. `observe()`
   *  la retranche pour isoler ce qui vient d'un choc ; la valeur brute
   *  `spinDecay` mentirait dès qu'un talent module l'endurance. */
  decayPerTick: number;
  isPlayer: boolean;
}
```

```ts
function snap(top: RunState['player']): TopSnapshot {
  return {
    id: top.id,
    x: top.pos.x,
    y: top.pos.y,
    spin: top.spin,
    decayPerTick: decayPerTick(top),
    isPlayer: top.isPlayer,
  };
}
```

Dans `src/render/observer.ts`, une seule ligne change :

```ts
    const extra = prev.spin - top.spin - prev.decayPerTick * TICK_S;
```

- [ ] **Step 9: Mettre `observer.test.ts` à jour**

Remplacer chaque `spinDecay:` par `decayPerTick:` dans les instantanés fabriqués par les tests. Puis ajouter le test qui verrouille la correction :

```ts
it('ne masque pas un choc quand la décroissance est suspendue', () => {
  const before: Snapshot = {
    salle: 1, phase: 'fighting',
    tops: [
      { id: 'player', x: 0, y: 0, spin: 1000, decayPerTick: 0, isPlayer: true },
      { id: 'bot-1-0', x: 30, y: 0, spin: 500, decayPerTick: 12, isPlayer: false },
    ],
  };
  const after: Snapshot = {
    salle: 1, phase: 'fighting',
    tops: [
      { id: 'player', x: 0, y: 0, spin: 950, decayPerTick: 0, isPlayer: true },
      { id: 'bot-1-0', x: 30, y: 0, spin: 500 - 1.2, decayPerTick: 12, isPlayer: false },
    ],
  };
  const events = observe(before, after);
  // Le joueur a perdu 50 sans décroissance : c'est un choc, il doit être vu.
  expect(events.hits.some((h) => h.id === 'player')).toBe(true);
  // Le bot n'a perdu que son endurance : ce n'en est pas un.
  expect(events.hits.some((h) => h.id === 'bot-1-0')).toBe(false);
});
```

Run: `grep -n "spinDecay" src/render/observer.test.ts src/render/snapshot.ts src/render/observer.ts`
Expected: aucune ligne.

- [ ] **Step 10: Lancer toute la suite et compiler**

Run: `npm run test && npm run build`
Expected: tous verts.

- [ ] **Step 11: Vérifier dans le navigateur**

Run: `npm run dev` puis `http://localhost:5173/spinforge/`

Les talents ne sont pas encore atteignables par le jeu ; pour les voir, se donner du rang depuis la console :

```js
// Rendre la Pointe et le Noyau Légendaires, puis resynchroniser.
// (À exécuter dans l'onglet Combat, puis passer en Forge et revenir.)
localStorage.setItem('spinforge.save', JSON.stringify({
  v: 1,
  meta: {
    rngState: 1, credits: 999999, gems: 0,
    equipped: {
      lame: { model: 'lame.couronne-solaire', rank: 11, level: 0 },
      disque: { model: 'disque.lourd', rank: 11, level: 0 },
      pointe: { model: 'pointe.plate', rank: 11, level: 0 },
      noyau: { model: 'noyau.fournaise', rank: 11, level: 0 },
    },
    inventory: [], pity: { bronze: 0, arene: 0, mythique: 0 }, chapterValidated: false,
  },
}));
location.reload();
```

À vérifier de ses yeux :
1. La toupie **glisse visiblement plus longtemps** quand on lâche le doigt (Glisse).
2. À spin bas, elle **accélère au lieu de mollir** (Toupie folle) — c'est le baroud d'honneur voulu.
3. Arriver à 0 de spin **relance le joueur à 20 %** au lieu d'afficher « Retenter » (Second souffle), une seule fois.
4. **Les étincelles d'impact continuent d'apparaître à chaque choc** — c'est la vérification de l'étape 8. Si des chocs ne produisent plus d'étincelles alors que la barre de spin chute, la correction de `decayPerTick` n'a pas pris.

- [ ] **Step 12: Commit**

```bash
git add src/sim/physics.ts src/sim/physics.test.ts src/sim/sim.ts src/sim/sim.test.ts src/render
git commit -m "feat(sim): les six talents de mouvement et d'endurance — Pointe et Noyau

Glisse, Relance, Toupie folle, Réserve, Second souffle et Cœur Gyre.

L'instantané du rendu porte désormais la décroissance effective du tick plutôt
que la valeur brute : Relance et Cœur Gyre la modulent, et observer() aurait
retranché une perte qui n'a pas eu lieu, masquant des chocs réels."
```

---

## Task 7 : Les coffres et le pity

Simulation pure, sans interface. Le pity est un critère d'acceptation explicite de la roadmap.

**Files:**
- Create: `src/sim/chest.ts`
- Create: `src/sim/chest.test.ts`

**Interfaces:**
- Consumes: `CHESTS` (Task 1), `nextRandom` (existant), `MODELS`/`modelsForSlot` (Task 2), `MetaState`/`ChestKind` (Task 3).
- Produces:
  - `chestPrice(kind: ChestKind, count: 1 | 10): { currency: 'credits' | 'gems'; amount: number }`
  - `canOpen(meta: MetaState, kind: ChestKind, count: 1 | 10): boolean`
  - `openChest(meta: MetaState, kind: ChestKind, count: 1 | 10): PieceInstance[] | null`

- [ ] **Step 1: Écrire les tests (ils doivent échouer)**

Créer `src/sim/chest.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { canOpen, chestPrice, openChest } from './chest';
import { createInitialMeta } from './meta';
import { CHESTS } from './config';
import { modelById } from '../content/pieces';
import type { MetaState } from './types';

function rich(): MetaState {
  const meta = createInitialMeta(12345);
  meta.credits = 10_000_000;
  meta.gems = 10_000_000;
  return meta;
}

describe('prix', () => {
  it('applique la remise du ×10', () => {
    expect(chestPrice('bronze', 1)).toEqual({ currency: 'credits', amount: CHESTS.bronze.price });
    expect(chestPrice('bronze', 10)).toEqual({ currency: 'credits', amount: CHESTS.bronze.price10 });
    expect(CHESTS.bronze.price10).toBeLessThan(CHESTS.bronze.price * 10);
  });

  it('Arène et Mythique se paient en gemmes', () => {
    expect(chestPrice('arene', 1).currency).toBe('gems');
    expect(chestPrice('mythique', 10).currency).toBe('gems');
  });
});

describe('débit', () => {
  it('refuse et ne touche à rien si la monnaie manque', () => {
    const meta = createInitialMeta(1);
    meta.credits = 100;
    expect(canOpen(meta, 'bronze', 1)).toBe(false);
    expect(openChest(meta, 'bronze', 1)).toBeNull();
    expect(meta.credits).toBe(100);
    expect(meta.rngState).toBe(createInitialMeta(1).rngState);
  });

  it('débite la bonne monnaie et rend le bon nombre de pièces', () => {
    const meta = rich();
    const before = meta.credits;
    const pulls = openChest(meta, 'bronze', 10)!;
    expect(pulls).toHaveLength(10);
    expect(meta.credits).toBe(before - CHESTS.bronze.price10);
    expect(meta.gems).toBe(10_000_000);
  });
});

describe('contenu', () => {
  it('Bronze ne tire que des Disques et des Pointes, du Commun au Rare', () => {
    const meta = rich();
    for (let i = 0; i < 40; i++) {
      for (const piece of openChest(meta, 'bronze', 10)!) {
        expect(['disque', 'pointe']).toContain(modelById(piece.model).slot);
        expect(piece.rank).toBeGreaterThanOrEqual(1);
        expect(piece.rank).toBeLessThanOrEqual(3);
        expect(piece.level).toBe(0);
      }
    }
  });

  it('Arène tire les quatre emplacements, donc des doublons signature', () => {
    const meta = rich();
    const slots = new Set<string>();
    for (let i = 0; i < 40; i++) {
      for (const piece of openChest(meta, 'arene', 10)!) slots.add(modelById(piece.model).slot);
    }
    expect(slots).toEqual(new Set(['lame', 'disque', 'pointe', 'noyau']));
  });
});

describe('pity', () => {
  it('Arène garantit un Excellent au dixième tirage sans Excellent', () => {
    const meta = rich();
    // On force le compteur au seuil moins un : le prochain tirage doit être forcé.
    meta.pity.arene = CHESTS.arene.pityThreshold - 1;
    const piece = openChest(meta, 'arene', 1)![0];
    expect(piece.rank).toBe(CHESTS.arene.pityRank);
    expect(meta.pity.arene).toBe(0);
  });

  it('un ×10 ne peut pas repartir sans Excellent', () => {
    const meta = rich();
    meta.pity.arene = 0;
    const pulls = openChest(meta, 'arene', 10)!;
    expect(pulls.some((p) => p.rank >= CHESTS.arene.pityRank)).toBe(true);
  });

  it('Mythique garantit une Légende au trentième', () => {
    const meta = rich();
    meta.pity.mythique = CHESTS.mythique.pityThreshold - 1;
    expect(openChest(meta, 'mythique', 1)![0].rank).toBe(CHESTS.mythique.pityRank);
    expect(meta.pity.mythique).toBe(0);
  });

  it('le compteur retombe à zéro dès qu’un tirage naturel atteint le rang garanti', () => {
    const meta = rich();
    let sawNatural = false;
    for (let i = 0; i < 200 && !sawNatural; i++) {
      meta.pity.arene = 3; // loin du seuil : tout Excellent obtenu ici est naturel
      const piece = openChest(meta, 'arene', 1)![0];
      if (piece.rank >= CHESTS.arene.pityRank) {
        expect(meta.pity.arene).toBe(0);
        sawNatural = true;
      } else {
        expect(meta.pity.arene).toBe(4);
      }
    }
    expect(sawNatural).toBe(true);
  });

  it('Bronze n’a pas de pity : son compteur ne bouge pas', () => {
    const meta = rich();
    openChest(meta, 'bronze', 10);
    expect(meta.pity.bronze).toBe(0);
  });
});

describe('déterminisme', () => {
  it('même graine ⇒ mêmes tirages', () => {
    const a = rich();
    const b = rich();
    expect(openChest(a, 'arene', 10)).toEqual(openChest(b, 'arene', 10));
  });

  it('chaque tirage consomme le même nombre de valeurs, forcé ou non', () => {
    const free = rich();
    free.pity.arene = 0;
    openChest(free, 'arene', 1);
    const freeAdvance = free.rngState;

    const forced = rich();
    forced.pity.arene = CHESTS.arene.pityThreshold - 1;
    openChest(forced, 'arene', 1);

    // Les deux tirages donnent des rangs différents, mais consomment le même
    // nombre de valeurs : trois pas de RNG depuis l'état initial dans les deux cas.
    const probe = rich();
    for (let i = 0; i < 3; i++) probe.rngState = nextState(probe.rngState);
    expect(forced.rngState).toBe(probe.rngState);
    expect(freeAdvance).toBe(probe.rngState);
  });
});

// Reproduit l'avancement du RNG sans exposer d'API supplémentaire.
function nextState(state: number): number {
  return (state + 0x6d2b79f5) | 0;
}
```

- [ ] **Step 2: Lancer pour voir échouer**

Run: `npx vitest run src/sim/chest.test.ts`
Expected: FAIL — `Failed to resolve import "./chest"`.

- [ ] **Step 3: Écrire `src/sim/chest.ts`**

```ts
import { CHESTS } from './config';
import { nextRandom } from './rng';
import { modelsForSlot, type Slot } from '../content/pieces';
import type { PieceInstance } from './piece';
import type { ChestKind, MetaState } from './types';

export function chestPrice(kind: ChestKind, count: 1 | 10): { currency: 'credits' | 'gems'; amount: number } {
  const def = CHESTS[kind];
  return { currency: def.currency, amount: count === 10 ? def.price10 : def.price };
}

export function canOpen(meta: MetaState, kind: ChestKind, count: 1 | 10): boolean {
  const { currency, amount } = chestPrice(kind, count);
  return (currency === 'credits' ? meta.credits : meta.gems) >= amount;
}

/** Un tirage consomme **exactement trois** valeurs du flux méta — rang,
 *  emplacement, modèle — que le pity force ou non le rang. Le tirage de rang a
 *  lieu de toute façon et son résultat est écarté quand il est forcé : sans
 *  quoi un compteur au seuil décalerait toute la suite, et les tests de pity
 *  deviendraient illisibles. */
function drawOne(meta: MetaState, kind: ChestKind): PieceInstance {
  const def = CHESTS[kind];
  const hasPity = def.pityThreshold > 0;
  const forced = hasPity && meta.pity[kind] + 1 >= def.pityThreshold;

  const r1 = nextRandom(meta.rngState);
  meta.rngState = r1.state;
  let rank = def.ranks[def.ranks.length - 1].rank;
  let acc = 0;
  for (const odds of def.ranks) {
    acc += odds.p;
    if (r1.value < acc) {
      rank = odds.rank;
      break;
    }
  }
  if (forced) rank = def.pityRank;

  const r2 = nextRandom(meta.rngState);
  meta.rngState = r2.state;
  const slot = def.slots[Math.min(def.slots.length - 1, Math.floor(r2.value * def.slots.length))] as Slot;

  const r3 = nextRandom(meta.rngState);
  meta.rngState = r3.state;
  const models = modelsForSlot(slot);
  const model = models[Math.min(models.length - 1, Math.floor(r3.value * models.length))];

  if (hasPity) {
    meta.pity[kind] = rank >= def.pityRank ? 0 : meta.pity[kind] + 1;
  }
  return { model: model.id, rank, level: 0 };
}

/** Retourne les pièces tirées, ou `null` si la monnaie manque — auquel cas
 *  rien n'est débité et le flux de RNG n'avance pas. */
export function openChest(meta: MetaState, kind: ChestKind, count: 1 | 10): PieceInstance[] | null {
  if (!canOpen(meta, kind, count)) return null;
  const { currency, amount } = chestPrice(kind, count);
  if (currency === 'credits') meta.credits -= amount;
  else meta.gems -= amount;

  const pulls: PieceInstance[] = [];
  for (let i = 0; i < count; i++) pulls.push(drawOne(meta, kind));
  return pulls;
}
```

- [ ] **Step 4: Lancer les tests**

Run: `npx vitest run src/sim/chest.test.ts`
Expected: PASS — 12 tests. Le test « un ×10 ne peut pas repartir sans Excellent » est la traduction directe du critère de la roadmap.

- [ ] **Step 5: Vérifier que les tirages ne perturbent pas le combat**

Ajouter à `src/sim/sim.test.ts`, dans le bloc `describe('déterminisme')` :

```ts
  it('ouvrir des coffres entre deux salles ne change pas l’issue du run', () => {
    const play = (openChests: boolean) => {
      const meta = createInitialMeta(42);
      meta.credits = 10_000_000;
      const run = createRun(meta, 42);
      for (let i = 0; i < 300; i++) {
        if (i % 25 === 24) {
          for (const b of run.bots) b.spin = 0.0001;
          if (openChests) openChest(meta, 'bronze', 10);
        }
        const salleBefore = run.salle;
        const reward = tick(run, { steer: i % 20 < 10 ? { x: 1, y: 0.5 } : null });
        if (reward) applyRunReward(meta, reward, salleBefore);
      }
      return JSON.stringify(run);
    };
    // C'est tout l'intérêt d'avoir séparé les deux flux de RNG.
    expect(play(true)).toBe(play(false));
  });
```

Importer `openChest` depuis `./chest` en tête de `sim.test.ts`.

- [ ] **Step 6: Lancer toute la suite et compiler**

Run: `npm run test && npm run build`
Expected: tous verts. Si le nouveau test échoue, c'est que `chest.ts` puise dans `run.rngState` au lieu de `meta.rngState`.

- [ ] **Step 7: Commit**

```bash
git add src/sim/chest.ts src/sim/chest.test.ts src/sim/sim.test.ts
git commit -m "feat(sim): les trois coffres et le pity

Tirage en trois temps sur le flux méta — rang, emplacement, modèle — ce qui
évite d'avoir à régler une part de signature : Arène et Mythique tirent les
quatre emplacements, donc produisent des doublons signature.

Le pity est un compteur remis à zéro dès qu'un tirage atteint le rang garanti ;
un ×10 se comporte alors comme « garanti au 10ᵉ » sans règle spéciale. Chaque
tirage consomme trois valeurs de RNG, forcé ou non."
```

---

## Task 8 : La fusion

**Files:**
- Create: `src/sim/fusion.ts`
- Create: `src/sim/fusion.test.ts`
- Modify: `src/sim/meta.ts` (helpers d'inventaire)
- Modify: `src/sim/meta.test.ts`

**Interfaces:**
- Consumes: `FUSION` (Task 1), `PieceStack`/`PieceInstance` (Task 2), `MetaState` (Task 3).
- Produces:
  - dans `meta.ts` : `addPiece(meta, piece): void`, `stackOf(meta, model, rank): PieceStack | undefined`, `equipFromStack(meta, model, rank): boolean`
  - dans `fusion.ts` : `fusionRecipe(rank): { identical: number; sacrifice: number }`, `canFuse(meta, model, rank): boolean`, `tryFuse(meta, model, rank): boolean`

- [ ] **Step 1: Ajouter les helpers d'inventaire à `src/sim/meta.ts`**

```ts
import { modelById } from '../content/pieces';
import type { PieceInstance, PieceStack, Slot } from './piece';

export function stackOf(meta: MetaState, model: string, rank: number): PieceStack | undefined {
  return meta.inventory.find((s) => s.model === model && s.rank === rank);
}

/** Range une pièce dans l'inventaire. Les doublons dorment au niveau 0 ;
 *  `bestLevel` ne retient que le meilleur, pour ne rien perdre si l'on
 *  déséquipe une pièce améliorée. */
export function addPiece(meta: MetaState, piece: PieceInstance): void {
  const stack = stackOf(meta, piece.model, piece.rank);
  if (stack) {
    stack.count++;
    stack.bestLevel = Math.max(stack.bestLevel, piece.level);
    return;
  }
  meta.inventory.push({ model: piece.model, rank: piece.rank, count: 1, bestLevel: piece.level });
}

/** Retire un exemplaire. Retourne le niveau du meilleur exemplaire retiré,
 *  ou `null` si la pile n'existe pas ou est vide. */
export function takePiece(meta: MetaState, model: string, rank: number): number | null {
  const stack = stackOf(meta, model, rank);
  if (!stack || stack.count === 0) return null;
  const level = stack.bestLevel;
  stack.count--;
  if (stack.count === 0) meta.inventory = meta.inventory.filter((s) => s !== stack);
  else stack.bestLevel = 0; // le meilleur vient d'être sorti ; les autres dorment au niveau 0
  return level;
}

/** Équipe une pièce de l'inventaire ; celle qu'elle remplace y retourne. */
export function equipFromStack(meta: MetaState, model: string, rank: number): boolean {
  const slot: Slot = modelById(model).slot;
  const level = takePiece(meta, model, rank);
  if (level === null) return false;
  const previous = meta.equipped[slot];
  meta.equipped[slot] = { model, rank, level };
  addPiece(meta, previous);
  return true;
}
```

- [ ] **Step 2: Écrire les tests de fusion (ils doivent échouer)**

Créer `src/sim/fusion.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { canFuse, fusionRecipe, tryFuse } from './fusion';
import { addPiece, createInitialMeta, stackOf } from './meta';
import type { MetaState } from './types';

function withStack(model: string, rank: number, count: number, levels: number[] = []): MetaState {
  const meta = createInitialMeta(1);
  for (let i = 0; i < count; i++) addPiece(meta, { model, rank, level: levels[i] ?? 0 });
  return meta;
}

describe('fusionRecipe', () => {
  it('demande trois identiques du Commun au Rare', () => {
    for (const rank of [1, 2, 3]) expect(fusionRecipe(rank)).toEqual({ identical: 3, sacrifice: 0 });
  });

  it('demande deux identiques et un sacrifice d’Excellent à Épique +2', () => {
    for (const rank of [4, 5, 6, 7, 8, 9]) expect(fusionRecipe(rank)).toEqual({ identical: 2, sacrifice: 1 });
  });

  it('redemande trois identiques pour franchir Épique +3 → Légende', () => {
    expect(fusionRecipe(10)).toEqual({ identical: 3, sacrifice: 0 });
  });

  it('demande deux identiques pour chaque Légende +N, sans limite', () => {
    for (const rank of [11, 12, 30, 500]) expect(fusionRecipe(rank)).toEqual({ identical: 2, sacrifice: 0 });
  });
});

describe('fusion des bas rangs', () => {
  it('trois Communs identiques donnent un Bon', () => {
    const meta = withStack('disque.lourd', 1, 3);
    expect(canFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(tryFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(stackOf(meta, 'disque.lourd', 1)).toBeUndefined();
    expect(stackOf(meta, 'disque.lourd', 2)!.count).toBe(1);
  });

  it('refuse à deux exemplaires', () => {
    const meta = withStack('disque.lourd', 1, 2);
    expect(canFuse(meta, 'disque.lourd', 1)).toBe(false);
    expect(tryFuse(meta, 'disque.lourd', 1)).toBe(false);
    expect(stackOf(meta, 'disque.lourd', 1)!.count).toBe(2);
  });

  it('ne consomme que ce qu’il faut', () => {
    const meta = withStack('disque.lourd', 1, 5);
    tryFuse(meta, 'disque.lourd', 1);
    expect(stackOf(meta, 'disque.lourd', 1)!.count).toBe(2);
  });
});

describe('sacrifice', () => {
  it('exige un troisième exemplaire du même emplacement à partir d’Excellent', () => {
    const meta = withStack('disque.lourd', 4, 2);
    expect(canFuse(meta, 'disque.lourd', 4)).toBe(false);
    addPiece(meta, { model: 'disque.meteorite', rank: 1, level: 0 });
    expect(canFuse(meta, 'disque.lourd', 4)).toBe(true);
    expect(tryFuse(meta, 'disque.lourd', 4)).toBe(true);
    expect(stackOf(meta, 'disque.lourd', 5)!.count).toBe(1);
    expect(stackOf(meta, 'disque.meteorite', 1)).toBeUndefined();
  });

  it('refuse un sacrifice d’un autre emplacement', () => {
    const meta = withStack('disque.lourd', 4, 2);
    addPiece(meta, { model: 'pointe.furie', rank: 1, level: 0 });
    expect(canFuse(meta, 'disque.lourd', 4)).toBe(false);
  });

  it('ne sacrifie jamais un des identiques nécessaires', () => {
    const meta = withStack('disque.lourd', 4, 2);
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    expect(tryFuse(meta, 'disque.lourd', 4)).toBe(true);
    expect(stackOf(meta, 'disque.lourd', 5)!.count).toBe(1);
    expect(stackOf(meta, 'disque.lourd', 1)).toBeUndefined();
  });
});

describe('niveau conservé', () => {
  it('la pièce produite prend le plus haut niveau consommé', () => {
    const meta = withStack('disque.lourd', 1, 3, [0, 12, 5]);
    tryFuse(meta, 'disque.lourd', 1);
    expect(stackOf(meta, 'disque.lourd', 2)!.bestLevel).toBe(12);
  });

  it('le sacrifice compte aussi — on ne perd jamais de niveau en fusionnant', () => {
    const meta = createInitialMeta(1);
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    addPiece(meta, { model: 'disque.colosse', rank: 1, level: 30 });
    tryFuse(meta, 'disque.lourd', 4);
    expect(stackOf(meta, 'disque.lourd', 5)!.bestLevel).toBe(30);
  });
});

describe('pièce équipée', () => {
  it('peut être consommée, et le résultat prend sa place', () => {
    const meta = createInitialMeta(1);
    meta.equipped.disque = { model: 'disque.lourd', rank: 1, level: 7 };
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    expect(canFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(tryFuse(meta, 'disque.lourd', 1)).toBe(true);
    expect(meta.equipped.disque).toEqual({ model: 'disque.lourd', rank: 2, level: 7 });
    expect(stackOf(meta, 'disque.lourd', 1)).toBeUndefined();
    expect(stackOf(meta, 'disque.lourd', 2)).toBeUndefined();
  });

  it('n’est pas consommée si l’inventaire suffit', () => {
    const meta = createInitialMeta(1);
    meta.equipped.disque = { model: 'disque.lourd', rank: 1, level: 7 };
    for (let i = 0; i < 3; i++) addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    tryFuse(meta, 'disque.lourd', 1);
    expect(meta.equipped.disque).toEqual({ model: 'disque.lourd', rank: 1, level: 7 });
    expect(stackOf(meta, 'disque.lourd', 2)!.count).toBe(1);
  });
});
```

- [ ] **Step 3: Lancer pour voir échouer**

Run: `npx vitest run src/sim/fusion.test.ts`
Expected: FAIL — `Failed to resolve import "./fusion"`.

- [ ] **Step 4: Écrire `src/sim/fusion.ts`**

```ts
import { FUSION } from './config';
import { modelById } from '../content/pieces';
import { addPiece, stackOf, takePiece } from './meta';
import type { MetaState } from './types';

/** La recette dépend du rang **des pièces consommées**. `throughRank: 0`
 *  marque la règle ouverte, qui couvre tous les rangs au-delà. */
export function fusionRecipe(rank: number): { identical: number; sacrifice: number } {
  for (const rule of FUSION) {
    if (rule.throughRank === 0 || rank <= rule.throughRank) {
      return { identical: rule.identical, sacrifice: rule.sacrifice };
    }
  }
  const last = FUSION[FUSION.length - 1];
  return { identical: last.identical, sacrifice: last.sacrifice };
}

/** Nombre d'exemplaires disponibles, la pièce équipée comprise. */
function availableIdentical(meta: MetaState, model: string, rank: number): number {
  const slot = modelById(model).slot;
  const equipped = meta.equipped[slot];
  const inStack = stackOf(meta, model, rank)?.count ?? 0;
  const fromEquipped = equipped.model === model && equipped.rank === rank ? 1 : 0;
  return inStack + fromEquipped;
}

/** Une pile du même emplacement utilisable en sacrifice, hors les identiques.
 *  La pièce équipée n'est jamais sacrifiée : elle n'est consommée que comme
 *  identique, où le résultat reprend sa place. */
function sacrificeStack(meta: MetaState, model: string, rank: number) {
  const slot = modelById(model).slot;
  return meta.inventory.find(
    (s) => s.count > 0 && modelById(s.model).slot === slot && !(s.model === model && s.rank === rank),
  );
}

export function canFuse(meta: MetaState, model: string, rank: number): boolean {
  const recipe = fusionRecipe(rank);
  if (availableIdentical(meta, model, rank) < recipe.identical) return false;
  if (recipe.sacrifice > 0 && !sacrificeStack(meta, model, rank)) return false;
  return true;
}

/**
 * Fusionne et range le résultat. Le niveau produit est **le plus haut de toutes
 * les pièces consommées, sacrifice compris** : on ne perd jamais de niveau en
 * fusionnant. Aucun abus possible, le coût d'un niveau étant le même quel que
 * soit le rang de la pièce sur laquelle on l'achète.
 */
export function tryFuse(meta: MetaState, model: string, rank: number): boolean {
  if (!canFuse(meta, model, rank)) return false;
  const recipe = fusionRecipe(rank);
  const slot = modelById(model).slot;

  let bestLevel = 0;
  let taken = 0;
  // On puise d'abord dans l'inventaire : l'équipée n'est consommée qu'en dernier recours.
  while (taken < recipe.identical) {
    const level = takePiece(meta, model, rank);
    if (level === null) break;
    bestLevel = Math.max(bestLevel, level);
    taken++;
  }
  let wasEquipped = false;
  if (taken < recipe.identical) {
    const equipped = meta.equipped[slot];
    bestLevel = Math.max(bestLevel, equipped.level);
    wasEquipped = true;
    taken++;
  }

  if (recipe.sacrifice > 0) {
    const victim = sacrificeStack(meta, model, rank)!;
    const level = takePiece(meta, victim.model, victim.rank)!;
    bestLevel = Math.max(bestLevel, level);
  }

  const result = { model, rank: rank + 1, level: bestLevel };
  if (wasEquipped) meta.equipped[slot] = result;
  else addPiece(meta, result);
  return true;
}
```

- [ ] **Step 5: Lancer les tests**

Run: `npx vitest run src/sim/fusion.test.ts`
Expected: PASS — 13 tests.

- [ ] **Step 6: Ajouter les tests d'inventaire à `meta.test.ts`**

```ts
import { addPiece, equipFromStack, stackOf, takePiece } from './meta';

describe('inventaire', () => {
  it('empile les pièces de même modèle et même rang', () => {
    const meta = createInitialMeta(1);
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 4 });
    expect(meta.inventory).toHaveLength(1);
    expect(stackOf(meta, 'disque.lourd', 1)).toEqual({ model: 'disque.lourd', rank: 1, count: 2, bestLevel: 4 });
  });

  it('sépare les piles quand le rang diffère', () => {
    const meta = createInitialMeta(1);
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 2, level: 0 });
    expect(meta.inventory).toHaveLength(2);
  });

  it('retire la pile quand elle se vide', () => {
    const meta = createInitialMeta(1);
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    expect(takePiece(meta, 'disque.lourd', 1)).toBe(0);
    expect(meta.inventory).toHaveLength(0);
    expect(takePiece(meta, 'disque.lourd', 1)).toBeNull();
  });

  it('équiper renvoie la pièce remplacée dans l’inventaire', () => {
    const meta = createInitialMeta(1);
    const previous = { ...meta.equipped.disque };
    addPiece(meta, { model: 'disque.colosse', rank: 3, level: 2 });
    expect(equipFromStack(meta, 'disque.colosse', 3)).toBe(true);
    expect(meta.equipped.disque).toEqual({ model: 'disque.colosse', rank: 3, level: 2 });
    expect(stackOf(meta, previous.model, previous.rank)!.count).toBe(1);
  });

  it('refuse d’équiper une pièce absente', () => {
    const meta = createInitialMeta(1);
    expect(equipFromStack(meta, 'disque.colosse', 9)).toBe(false);
  });
});
```

- [ ] **Step 7: Lancer toute la suite et compiler**

Run: `npm run test && npm run build`
Expected: tous verts.

- [ ] **Step 8: Commit**

```bash
git add src/sim/fusion.ts src/sim/fusion.test.ts src/sim/meta.ts src/sim/meta.test.ts
git commit -m "feat(sim): la fusion sur les quatre paliers

Trois identiques du Commun au Rare, deux plus un sacrifice du même emplacement
d'Excellent à Épique +2, trois pour franchir Légende, deux par Légende +N.

Le niveau produit est le plus haut de toutes les pièces consommées, sacrifice
compris : on ne perd jamais de niveau en fusionnant. La pièce équipée peut être
consommée, le résultat reprend alors sa place."
```

---

## Task 9 : L'écran Coffres

Première tâche visible du jalon. Le compteur de pity est **affiché en clair** — le cacher serait un choix de casino, pas de jeu.

**Files:**
- Create: `src/ui/rank.ts`
- Create: `src/ui/ChestScreen.tsx`
- Modify: `src/ui/TabBar.tsx`
- Modify: `src/ui/App.tsx`

**Interfaces:**
- Consumes: `chestPrice`, `canOpen`, `openChest` (Task 7) ; `addPiece` (Task 8) ; `rankLabel` (Task 2).
- Produces: `rankColor(rank: number): string` dans `src/ui/rank.ts` ; `type Tab = 'combat' | 'forge' | 'coffres'`.

- [ ] **Step 1: Écrire l'échelle de couleur des rangs**

Créer `src/ui/rank.ts`. Aucune teinte en dur : uniquement des jetons du thème, conformément à la règle 3 et à la dette relevée au jalon 1.5.

```ts
/** Quatre paliers de lisibilité, alignés sur les paliers nommés de l'échelle.
 *  Un rang doit se reconnaître à la couleur sans lire son étiquette. */
export function rankColor(rank: number): string {
  if (rank >= 11) return 'var(--boss)';
  if (rank >= 7) return 'var(--ember)';
  if (rank >= 4) return 'var(--player)';
  return 'var(--muted)';
}
```

- [ ] **Step 2: Déverrouiller l'onglet Coffres**

Remplacer `src/ui/TabBar.tsx` :

```tsx
export type Tab = 'combat' | 'forge' | 'coffres';

const LABELS: Record<Tab, string> = { combat: 'Combat', forge: 'Forge', coffres: 'Coffres' };
const LOCKED = ['Toupies'];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav style={{ display: 'flex', gap: 7 }}>
      {(['combat', 'forge', 'coffres'] as const).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            flex: '1 1 0', minHeight: 44, borderRadius: 10, cursor: 'pointer',
            fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontSize: 15, letterSpacing: '.02em',
            border: `1px solid ${tab === t ? 'var(--ember)' : 'var(--line)'}`,
            background: tab === t ? 'var(--ember)' : 'var(--panel)',
            color: tab === t ? 'var(--ink)' : 'var(--text)',
            fontWeight: tab === t ? 600 : 500,
          }}
        >
          {LABELS[t]}
        </button>
      ))}
      {LOCKED.map((label) => (
        <div
          key={label}
          aria-disabled="true"
          style={{
            flex: '1 1 0', minHeight: 44, borderRadius: 10,
            border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--muted)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontSize: 15, gap: 1,
          }}
        >
          <span>{label}</span>
          <span style={{ fontSize: 10 }} aria-label="verrouillé">🔒</span>
        </div>
      ))}
    </nav>
  );
}
```

- [ ] **Step 3: Écrire `src/ui/ChestScreen.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { canOpen, chestPrice, openChest } from '../sim/chest';
import { addPiece } from '../sim/meta';
import { rankLabel, type PieceInstance } from '../sim/piece';
import { modelById } from '../content/pieces';
import { CHESTS } from '../sim/config';
import { formatCredits } from './format';
import { rankColor } from './rank';
import type { ChestKind, MetaState } from '../sim/types';

const CHEST_LIST: { kind: ChestKind; name: string; blurb: string }[] = [
  { kind: 'bronze', name: 'Coffre Bronze', blurb: 'Disques et Pointes, du Commun au Rare.' },
  { kind: 'arene', name: "Coffre d'Arène", blurb: 'Les quatre emplacements, du Bon à l’Excellent.' },
  { kind: 'mythique', name: 'Coffre Mythique', blurb: 'Les quatre emplacements, de l’Excellent à la Légende.' },
];

const REVEAL_MS = 90;

export function ChestScreen({
  metaRef, onChanged,
}: {
  metaRef: { current: MetaState };
  onChanged: () => void;
}) {
  const [pulls, setPulls] = useState<PieceInstance[] | null>(null);
  const [revealed, setRevealed] = useState(0);
  const meta = metaRef.current;

  // Révélation en léger décalage : les pièces apparaissent l'une après l'autre.
  useEffect(() => {
    if (pulls === null || revealed >= pulls.length) return;
    const id = setTimeout(() => setRevealed((n) => n + 1), REVEAL_MS);
    return () => clearTimeout(id);
  }, [pulls, revealed]);

  const open = (kind: ChestKind, count: 1 | 10) => {
    const drawn = openChest(metaRef.current, kind, count);
    if (!drawn) return;
    for (const piece of drawn) addPiece(metaRef.current, piece);
    setPulls(drawn);
    setRevealed(0);
    onChanged();
  };

  if (pulls !== null) {
    const best = pulls.reduce((m, p) => Math.max(m, p.rank), 0);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0 }}>
        <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
          {pulls.length === 1 ? 'Ton tirage' : `Tes ${pulls.length} tirages`}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
          {pulls.slice(0, revealed).map((piece, i) => (
            <div
              key={i}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                border: `1px solid ${piece.rank >= 7 ? rankColor(piece.rank) : 'var(--line)'}`,
                background: 'var(--panel)', borderRadius: 10, padding: '9px 12px',
              }}
            >
              <span style={{ font: '500 15px Oswald, ui-sans-serif, sans-serif' }}>
                {modelById(piece.model).label}
              </span>
              <span style={{ fontSize: 12.5, color: rankColor(piece.rank), whiteSpace: 'nowrap' }}>
                {rankLabel(piece.rank)}
              </span>
            </div>
          ))}
        </div>
        {revealed >= pulls.length ? (
          <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>
            Meilleur rang obtenu : <span style={{ color: rankColor(best) }}>{rankLabel(best)}</span>. Tout est rangé dans ton inventaire, onglet Forge.
          </p>
        ) : null}
        <button
          onClick={() => { setPulls(null); setRevealed(0); }}
          style={{
            minHeight: 48, borderRadius: 11, cursor: 'pointer', border: '1px solid var(--ember)',
            background: 'var(--ember)', color: 'var(--ink)', font: '600 15px Oswald, ui-sans-serif, sans-serif',
          }}
        >
          Continuer
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
        Coffres
      </h2>
      {CHEST_LIST.map(({ kind, name, blurb }) => {
        const def = CHESTS[kind];
        const unit = chestPrice(kind, 1);
        const ten = chestPrice(kind, 10);
        const label = unit.currency === 'credits' ? 'crédits' : 'gemmes';
        return (
          <section
            key={kind}
            style={{
              border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 11,
              padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
            }}
          >
            <div>
              <p style={{ margin: 0, font: '500 17px Oswald, ui-sans-serif, sans-serif' }}>{name}</p>
              <p style={{ margin: 0, fontSize: 12.5, color: 'var(--muted)' }}>{blurb}</p>
              {def.pityThreshold > 0 ? (
                <p style={{ margin: '3px 0 0', fontSize: 12, color: 'var(--muted)' }}>
                  {rankLabel(def.pityRank)} garanti dans{' '}
                  <span style={{ color: 'var(--ember)', fontVariantNumeric: 'tabular-nums' }}>
                    {def.pityThreshold - meta.pity[kind]}
                  </span>{' '}
                  tirage{def.pityThreshold - meta.pity[kind] > 1 ? 's' : ''}
                </p>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              {([1, 10] as const).map((count) => {
                const price = count === 1 ? unit : ten;
                const affordable = canOpen(meta, kind, count);
                return (
                  <button
                    key={count}
                    disabled={!affordable}
                    onClick={() => open(kind, count)}
                    style={{
                      flex: '1 1 0', minHeight: 46, borderRadius: 10, cursor: affordable ? 'pointer' : 'default',
                      border: '1px solid var(--line)', background: 'var(--bg)',
                      color: affordable ? 'var(--text)' : 'var(--muted)', opacity: affordable ? 1 : 0.5,
                      font: '500 13px Oswald, ui-sans-serif, sans-serif',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                    }}
                  >
                    <span>Ouvrir ×{count}</span>
                    <span style={{ fontSize: 11.5, color: affordable ? 'var(--ember)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {formatCredits(price.amount)} {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Brancher l'écran dans `App.tsx`**

```tsx
import { ChestScreen } from './ChestScreen';
```

```tsx
      {tab === 'coffres' ? <ChestScreen metaRef={metaRef} onChanged={metaChanged} /> : null}
```

- [ ] **Step 5: Compiler et tester**

Run: `npm run test && npm run build`
Expected: tous verts.

- [ ] **Step 6: Vérifier dans le navigateur**

Run: `npm run dev` puis `http://localhost:5173/spinforge/`

Se donner de quoi ouvrir, depuis la console :

```js
const s = JSON.parse(localStorage.getItem('spinforge.save'));
s.meta.credits = 500000; s.meta.gems = 50000;
localStorage.setItem('spinforge.save', JSON.stringify(s));
location.reload();
```

À vérifier de ses yeux :
1. L'onglet **Coffres** est actif, **Toupies** reste grisé et cadenassé.
2. Les trois coffres s'affichent avec leur prix ×1 et ×10, dans la bonne monnaie.
3. Le compteur de pity d'Arène affiche « Excellent garanti dans 10 tirages » et **descend** à mesure qu'on tire.
4. Un ×10 révèle **dix lignes l'une après l'autre**, pas d'un bloc.
5. Les rangs élevés se distinguent **à la couleur**, sans lire l'étiquette.
6. Un coffre trop cher est grisé et ne réagit pas au clic.
7. La liste tient à **390 px de large** sans débordement horizontal (mode responsive du navigateur).
8. Recharger la page : les gemmes dépensées et le compteur de pity sont conservés.

- [ ] **Step 7: Commit**

```bash
git add src/ui/rank.ts src/ui/ChestScreen.tsx src/ui/TabBar.tsx src/ui/App.tsx
git commit -m "feat(ui): écran Coffres, révélation des tirages, compteur de pity visible

Trois coffres avec ×1 et ×10, prix dans leur monnaie, et le nombre de tirages
restant avant le rang garanti affiché en clair. Les pièces se révèlent l'une
après l'autre ; les rangs se distinguent par des jetons du thème, sans teinte
en dur."
```

---

## Task 10 : La Forge — équipement et inventaire

**Files:**
- Create: `src/ui/InventoryPanel.tsx`
- Modify: `src/ui/ForgeScreen.tsx`

**Interfaces:**
- Consumes: `equipFromStack` (Task 8), `canFuse`/`tryFuse`/`fusionRecipe` (Task 8), `rankColor` (Task 9), `syncRunStats` (Task 3).
- **Forme d'une pile** : `PieceStack` est `{ model, rank, levels: number[] }` — un niveau par exemplaire, trié décroissant. Le nombre d'exemplaires est `levels.length`, le meilleur niveau `levels[0]`. La Task 8 a remplacé l'ancien couple `count`/`bestLevel`, qui perdait le niveau des doublons non consommés.
- Produces: rien de nouveau pour les autres tâches.

- [ ] **Step 1: Écrire `src/ui/InventoryPanel.tsx`**

```tsx
import { useState } from 'react';
import { equipFromStack } from '../sim/meta';
import { canFuse, fusionRecipe, tryFuse } from '../sim/fusion';
import { rankLabel, type Slot } from '../sim/piece';
import { modelById } from '../content/pieces';
import { rankColor } from './rank';
import type { MetaState } from '../sim/types';

const SLOT_LABELS: { key: Slot | 'tous'; label: string }[] = [
  { key: 'tous', label: 'Tous' },
  { key: 'lame', label: 'Lames' },
  { key: 'disque', label: 'Disques' },
  { key: 'pointe', label: 'Pointes' },
  { key: 'noyau', label: 'Noyaux' },
];

export function InventoryPanel({
  metaRef, onChanged,
}: {
  metaRef: { current: MetaState };
  onChanged: () => void;
}) {
  const [filter, setFilter] = useState<Slot | 'tous'>('tous');
  const meta = metaRef.current;

  const stacks = meta.inventory
    .filter((s) => filter === 'tous' || modelById(s.model).slot === filter)
    .slice()
    // Rang décroissant puis modèle : les meilleures trouvailles en tête.
    .sort((a, b) => b.rank - a.rank || a.model.localeCompare(b.model));

  return (
    <>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: '6px 0 0', letterSpacing: '.02em' }}>
        Inventaire
      </h2>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {SLOT_LABELS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            style={{
              minHeight: 32, padding: '0 11px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${filter === key ? 'var(--ember)' : 'var(--line)'}`,
              background: filter === key ? 'var(--ember)' : 'var(--panel)',
              color: filter === key ? 'var(--ink)' : 'var(--muted)',
              fontSize: 12.5, fontFamily: 'Oswald, ui-sans-serif, sans-serif',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {stacks.length === 0 ? (
        <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
          Rien ici pour l'instant. Ouvre un coffre pour trouver des pièces.
        </p>
      ) : null}

      {stacks.map((stack) => {
        const model = modelById(stack.model);
        const recipe = fusionRecipe(stack.rank);
        const fusable = canFuse(meta, stack.model, stack.rank);
        return (
          <div
            key={`${stack.model}:${stack.rank}`}
            style={{
              border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 11,
              padding: '9px 12px', display: 'flex', flexDirection: 'column', gap: 7,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
              <span style={{ font: '500 16px Oswald, ui-sans-serif, sans-serif' }}>
                {model.label}{' '}
                <span style={{ color: 'var(--muted)', fontSize: 13 }}>×{stack.levels.length}</span>
              </span>
              <span style={{ fontSize: 12.5, color: rankColor(stack.rank), whiteSpace: 'nowrap' }}>
                {rankLabel(stack.rank)}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 7 }}>
              <button
                onClick={() => { equipFromStack(metaRef.current, stack.model, stack.rank); onChanged(); }}
                style={{
                  flex: '1 1 0', minHeight: 40, borderRadius: 9, cursor: 'pointer',
                  border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)',
                  font: '500 13px Oswald, ui-sans-serif, sans-serif',
                }}
              >
                Équiper
              </button>
              <button
                disabled={!fusable}
                onClick={() => { if (tryFuse(metaRef.current, stack.model, stack.rank)) onChanged(); }}
                style={{
                  flex: '1 1 0', minHeight: 40, borderRadius: 9, cursor: fusable ? 'pointer' : 'default',
                  border: '1px solid var(--line)', background: 'var(--bg)',
                  color: fusable ? 'var(--text)' : 'var(--muted)', opacity: fusable ? 1 : 0.5,
                  font: '500 13px Oswald, ui-sans-serif, sans-serif',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                }}
              >
                <span>Fusionner</span>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                  {recipe.identical} identiques{recipe.sacrifice > 0 ? ' + 1 sacrifice' : ''}
                </span>
              </button>
            </div>
          </div>
        );
      })}
    </>
  );
}
```

- [ ] **Step 2: Brancher le bloc dans `ForgeScreen`**

Ajouter l'import et le rendu du panneau après la liste des quatre emplacements, dans le même conteneur défilant :

```tsx
import { InventoryPanel } from './InventoryPanel';
```

Juste avant la fermeture `</div>` du conteneur principal :

```tsx
      <InventoryPanel
        metaRef={metaRef}
        onChanged={() => { syncRunStats(runRef.current, metaRef.current); onChanged(); }}
      />
```

`syncRunStats` est indispensable ici : équiper ou fusionner change les stats **et les talents** du joueur, et le run en cours doit s'en apercevoir sans attendre le run suivant.

- [ ] **Step 3: Compiler et tester**

Run: `npm run test && npm run build`
Expected: tous verts.

- [ ] **Step 4: Vérifier dans le navigateur — c'est ici que les critères se prouvent**

Run: `npm run dev` puis `http://localhost:5173/spinforge/`

Se donner de quoi jouer (crédits, gemmes) comme à la Task 9, puis :

1. Ouvrir plusieurs Bronze ×10, aller en **Forge** : l'inventaire liste des piles avec leur compteur (« Lourd ×7 »).
2. Les **filtres** par emplacement fonctionnent.
3. Ouvrir jusqu'à obtenir trois exemplaires identiques : **Fusionner s'active**, le libellé indique « 3 identiques ».
4. Fusionner : la pile disparaît, une pile de rang supérieur apparaît, **l'étiquette de rang a changé** — c'est le critère d'acceptation n° 2.
5. **Équiper** une pièce : le bloc « Ta toupie » affiche le nouveau modèle et le nouveau rang, la pièce remplacée retourne dans l'inventaire.
6. Retourner en **Combat** : la toupie doit **réellement** être différente — critère n° 3. Avec une pièce de rang ≥ 4, un talent doit se sentir.
7. Améliorer une pièce, puis la fusionner : la pièce produite **garde le niveau** — vérifier dans « Ta toupie » que le niveau n'est pas retombé à 0.
8. À **390 px de large**, aucun débordement horizontal ; la page défile verticalement.
9. **Recharger** : inventaire, équipement et niveaux sont intacts — critère n° 5.

- [ ] **Step 5: Commit**

```bash
git add src/ui/InventoryPanel.tsx src/ui/ForgeScreen.tsx
git commit -m "feat(ui): la Forge accueille l'inventaire, l'équipement et la fusion

Une page qui défile en deux blocs — « Ta toupie » et « Inventaire » — plutôt
qu'un sous-menu : à 460 px de large, un défilement se pilote mieux.

Équiper et fusionner resynchronisent le run en cours, sans quoi le changement
n'aurait pris effet qu'au run suivant."
```

---

## Task 11 : Le harnais de calibration

L'autopilote du jalon 1.5 était jetable et a disparu. On le reconstruit **en le gardant** : le jalon 3 en redemandera. La simulation étant pure, il tourne en Node sans navigateur.

**Files:**
- Create: `scripts/calibrate.mjs`
- Modify: `package.json`
- Modify: `src/content/balance.json` (constantes réglées à la mesure)

**Interfaces:**
- Consumes: toute la simulation.
- Produces: `npm run calibrate`.

- [ ] **Step 1: Ajouter le script**

Dans `package.json`, section `scripts` :

```json
    "calibrate": "vite-node scripts/calibrate.mjs",
```

`vite-node` est déjà présent : c'est une dépendance de `vitest`. Il résout TypeScript et l'import JSON sans configuration.

Run: `npx vite-node --version`
Expected: un numéro de version. S'il manque, utiliser `npx vitest run scripts/calibrate.mjs` n'est pas une option — installer alors `vite-node` en devDependency.

- [ ] **Step 2: Écrire l'autopilote**

Créer `scripts/calibrate.mjs` :

```js
// Autopilote de calibration. Conservé volontairement : le jalon 3 en redemandera.
// La simulation étant pure et sans DOM, aucun navigateur n'est nécessaire.
import { createRun, tick } from '../src/sim/sim.ts';
import { applyRunReward, createInitialMeta } from '../src/sim/meta.ts';
import { tryUpgrade, upgradeCost } from '../src/sim/economy.ts';
import { canOpen, openChest } from '../src/sim/chest.ts';
import { addPiece } from '../src/sim/meta.ts';
import { TICK_S, SALLES_PER_CHAPTER, CHESTS } from '../src/sim/config.ts';

const SEEDS = [1, 7, 42, 1337, 90210];
const MAX_TICKS = 60 * 60 * 20 / TICK_S; // garde-fou : 20 h de jeu simulé

/** Politique : foncer sur le bot le plus proche. Même autopilote qu'au jalon 1.5. */
function steerTowardNearest(run) {
  let best = null;
  let bestD = Infinity;
  for (const bot of run.bots) {
    const d = Math.hypot(bot.pos.x - run.player.pos.x, bot.pos.y - run.player.pos.y);
    if (d < bestD) { bestD = d; best = bot; }
  }
  if (!best) return null;
  return { x: best.pos.x - run.player.pos.x, y: best.pos.y - run.player.pos.y };
}

/** Achats gloutons : on améliore l'emplacement le moins cher tant qu'on peut. */
function spend(meta) {
  const slots = ['lame', 'disque', 'pointe', 'noyau'];
  for (;;) {
    let cheapest = null;
    let cost = Infinity;
    for (const slot of slots) {
      const c = upgradeCost(meta.equipped[slot].level);
      if (c < cost) { cost = c; cheapest = slot; }
    }
    if (meta.credits < cost) return;
    tryUpgrade(meta, cheapest);
  }
}

function simulate(seed, { buyChests }) {
  const meta = createInitialMeta(seed);
  let run = createRun(meta, seed);
  let ticks = 0;
  let runs = 1;
  let ticksToValidate = null;
  let ticksToFirstArene = null;
  let arenesOpened = 0;
  const deathsBySalle = new Map();

  while (ticks < MAX_TICKS && (ticksToValidate === null || ticksToFirstArene === null)) {
    const salleBefore = run.salle;
    const reward = tick(run, { steer: steerTowardNearest(run) });
    ticks++;
    if (reward) {
      applyRunReward(meta, reward, salleBefore);
      spend(meta);
      if (meta.chapterValidated && ticksToValidate === null) ticksToValidate = ticks;
      if (buyChests && canOpen(meta, 'arene', 1)) {
        for (const piece of openChest(meta, 'arene', 1)) addPiece(meta, piece);
        arenesOpened++;
        if (ticksToFirstArene === null) ticksToFirstArene = ticks;
      }
    }
    if (run.phase === 'dead') {
      deathsBySalle.set(run.salle, (deathsBySalle.get(run.salle) ?? 0) + 1);
      runs++;
      run = createRun(meta, seed + runs);
    }
  }

  return {
    hoursToValidate: ticksToValidate === null ? null : (ticksToValidate * TICK_S) / 3600,
    hoursToFirstArene: ticksToFirstArene === null ? null : (ticksToFirstArene * TICK_S) / 3600,
    runs,
    gems: meta.gems,
    arenesOpened,
    deadliestSalle: [...deathsBySalle.entries()].sort((a, b) => b[1] - a[1])[0] ?? null,
  };
}

const median = (xs) => {
  const ok = xs.filter((x) => x !== null).sort((a, z) => a - z);
  return ok.length === 0 ? null : ok[ok.length >> 1];
};

const results = SEEDS.map((seed) => simulate(seed, { buyChests: true }));
const fmt = (x) => (x === null ? 'jamais' : x.toFixed(2));

console.log('=== Calibration — %d graines ===', SEEDS.length);
console.log('Validation du chapitre 1 : médiane %s h (garde-fou de non-régression, cible ~2 h)',
  fmt(median(results.map((r) => r.hoursToValidate))));
console.log('Premier coffre Arène     : médiane %s h après le départ (cible : dans l’heure suivant la validation)',
  fmt(median(results.map((r) => r.hoursToFirstArene))));
console.log('Runs jusqu’à validation  : médiane %s', fmt(median(results.map((r) => r.runs))));
console.log('Prix d’un Arène          : %d gemmes', CHESTS.arene.price);
console.log('Salle la plus meurtrière : %j', results[0].deadliestSalle);
console.log('Salles par chapitre      : %d', SALLES_PER_CHAPTER);
```

- [ ] **Step 3: Lancer une première mesure**

Run: `npm run calibrate`
Expected: le tableau s'affiche. Le garde-fou est **≈ 21 runs** pour valider le chapitre 1, soit environ **1,8 h** avec la stratégie « foncer sur le bot le plus proche » — les chiffres mesurés le 2026-08-25 après le passage de `rewardBase` à 70 (`docs/ameliorations.md`). L'économie de base n'est pas touchée par ce jalon : si ce nombre s'est déplacé, quelque chose a cassé et il faut le comprendre avant d'aller plus loin. C'est le **nombre de runs** qui fait foi, la durée dépendant de la vitesse à laquelle un run se joue.

- [ ] **Step 4: Régler `econ.bossGems` sur la cible**

Cible de la spec § 6.4 : **le premier coffre Arène tombe dans l'heure qui suit la validation du chapitre 1**, soit une médiane de `hoursToFirstArene` d'environ `hoursToValidate + 1`.

Ajuster `econ.bossGems` dans `src/content/balance.json` et relancer `npm run calibrate` jusqu'à ce que la médiane tombe dans la fenêtre. Monter la valeur raccourcit le délai, la baisser l'allonge — la relation est quasi linéaire, le boss étant la seule source de gemmes.

**Consigner la valeur retenue et la mesure obtenue** : elles iront dans la roadmap à la Task 12.

- [ ] **Step 5: Régler les deux seuils de vitesse des talents**

`talents.estoc.speedThreshold` et `talents.frolement.speedThreshold` ont été posés à 150 et 40 sans mesure. Instrumenter une fois pour les asseoir : ajouter temporairement, dans `simulate`, la collecte des vitesses d'impact.

Dans `scripts/calibrate.mjs`, remplacer temporairement l'appel à `tick` par une version qui échantillonne — le plus simple est d'ajouter en tête de `simulate` :

```js
  const impacts = [];
```

et, juste après `const reward = tick(...)`, relever les écarts de vitesse relative les plus élevés :

```js
    for (const bot of run.bots) {
      const rvx = bot.vel.x - run.player.vel.x;
      const rvy = bot.vel.y - run.player.vel.y;
      impacts.push(Math.hypot(rvx, rvy));
    }
```

puis retourner `impacts` et afficher ses centiles :

```js
const all = results.flatMap((r) => r.impacts).sort((a, z) => a - z);
console.log('Vitesse relative — p10 %s · médiane %s · p90 %s',
  all[Math.floor(all.length * 0.1)].toFixed(0),
  all[all.length >> 1].toFixed(0),
  all[Math.floor(all.length * 0.9)].toFixed(0));
```

Régler `estoc.speedThreshold` sur le **p90** — Estoc doit récompenser une charge franche, pas le tout-venant — et `frolement.speedThreshold` sur le **p10** — Frôlement annule les effleurements, pas les vrais coups.

**Retirer ensuite l'instrumentation** : `impacts` n'a pas à rester dans le harnais, qui doit mesurer la progression et non la physique.

- [ ] **Step 6: Relancer la suite complète**

Run: `npm run test && npm run build && npm run calibrate`
Expected: tests et build verts ; la calibration confirme ~2 h pour le chapitre 1 et le premier Arène dans la fenêtre visée.

- [ ] **Step 7: Commit**

```bash
git add scripts/calibrate.mjs package.json src/content/balance.json
git commit -m "chore(calibrate): autopilote de calibration conservé, constantes réglées à la mesure

Harnais headless — la simulation étant pure, aucun navigateur n'est requis.
Il mesure le temps de validation du chapitre 1 comme garde-fou de non-régression,
puis règle le gain de gemmes du boss sur la cible « premier Arène dans l'heure »
et les deux seuils de vitesse des talents sur les centiles observés.

Conservé volontairement : celui du jalon 1.5 était jetable et a dû être réécrit."
```

---

## Task 12 : Vérification de fin de jalon

**Files:**
- Modify: `docs/roadmap.md`
- Create: captures dans `.shots/` (ignoré par git)

- [ ] **Step 1: Relancer la suite complète**

Run: `npm run test && npm run build`
Expected: tous verts. Noter le nombre de tests.

- [ ] **Step 2: Vérifier qu'aucune constante d'équilibrage n'a fui**

Run: `grep -rnE "\b(0\.[0-9]{2,}|1\.[0-9]{2,}|[0-9]{3,})\b" src/sim/*.ts | grep -v "\.test\.ts" | grep -v "config.ts"`
Expected: aucune ligne portant un chiffre d'équilibrage. Les seules valeurs admises hors `config.ts` sont structurelles (indices, `0`, `1`, `2`). Toute autre doit rejoindre `balance.json` — c'est le critère d'acceptation n° 6.

- [ ] **Step 3: Vérifier la pureté de `src/sim/`**

Run: `grep -rnE "localStorage|document\.|window\.|Math\.random|new Date|Date\.now|from 'pixi|from 'react" src/sim/`
Expected: aucune ligne. C'est le critère n° 7.

- [ ] **Step 4: Produire les captures de vérification**

Adapter `scripts/shots.mjs` — qui pilote déjà le jeu vers le combat — pour ajouter quatre vues : l'écran Coffres, une révélation ×10 en cours, l'inventaire chargé, la Forge avec un talent actif. Injecter la sauvegarde de départ via `page.addInitScript` avant `goto`, pour disposer de crédits, de gemmes et d'un inventaire.

Run: `npm run shots`
Expected: les fichiers apparaissent dans `.shots/`.

- [ ] **Step 5: Ouvrir les captures et les juger à l'œil**

Les regarder **avant** de les présenter. Sur chacune :
- la mise en page tient à 390 px, rien ne déborde horizontalement ;
- les rangs se distinguent à la couleur sans lire l'étiquette ;
- la révélation se lit comme une succession, pas comme un bloc ;
- aucun nom officiel Beyblade nulle part.

- [ ] **Step 6: Parcours manuel complet**

Run: `npm run dev` puis `http://localhost:5173/spinforge/`

Partir d'une **sauvegarde vierge** (`localStorage.clear()` puis recharger) et parcourir les huit critères d'acceptation de la spec dans l'ordre :

1. Ouvrir un Bronze et un Arène ; les pièces entrent dans l'inventaire.
2. Fusionner jusqu'à changer de rang ; l'étiquette change.
3. Équiper une pièce ; le combat en est changé.
4. (Les pity sont couverts par test — vérifier que `npm run test` les inclut.)
5. Recharger : tout est conservé, compteurs de pity compris.
6. Aucune constante d'équilibrage hors du JSON (étape 2).
7. `src/sim/` pur (étape 3), déterminisme vert.
8. Tests et build verts (étape 1).

- [ ] **Step 7: Mettre la roadmap à jour**

Dans `docs/roadmap.md` :

- remplacer le titre `## Jalon 2 — Le gacha` par une section 2a marquée et une section 2b restante :

```markdown
## Jalon 2a — Les pièces ✦ plan : `docs/superpowers/plans/2026-08-25-jalon-2a-pieces.md`

Équilibrage en JSON statique versionné, sauvegarde du méta, pièces à modèle et rang,
inventaire en piles, douze talents aux paliers nommés, trois coffres avec pity 10/30,
fusion sur les quatre paliers.

**Critères** : ouvrir des coffres, fusionner jusqu'à changer de rang, équiper des pièces qui
changent le gameplay ; pity vérifiés par test ; un rechargement conserve tout.

## Jalon 2b — Les toupies

Les quatre Fondateurs (châssis + Lame/Noyau signature), types et triangle des forces,
comportements distincts des modèles génériques, doublons signature des toupies débloquées.

**Critères** : le triangle des forces change l'issue d'un combat ; changer de toupie change
le pilotage.
```

- supprimer, dans « Dette connue (héritée du jalon 1) », les trois puces désormais traitées : celle de `salle.ts` qui code en dur le nombre de bots, celle de `Stats.accel`, et celle du triple écrit du spin initial dans `createInitialState` ;
- supprimer, dans « Dette connue (jalon 1.5) » § HUD, la puce « `ForgeScreen` n'a pas de `minHeight: 0` sur son conteneur flex » : la Task 3 la lui donne, avec le défilement, au moment même que cette puce annonçait — « à surveiller si la liste d'améliorations s'allonge au jalon 2 » ;
- ajouter, sous « Dette connue (jalon 2a) », les points constatés pendant l'exécution du plan et arbitrés comme non bloquants, avec la raison de chaque report ;
- consigner la valeur retenue pour `econ.bossGems` et les deux seuils de vitesse, avec la mesure qui les justifie.

- [ ] **Step 8: Commit final**

```bash
git add docs/roadmap.md scripts/shots.mjs
git commit -m "chore: roadmap du jalon 2a à jour et captures de vérification"
```

- [ ] **Step 9: Proposer l'intégration**

Le jalon est terminé. Utiliser la skill `superpowers:finishing-a-development-branch` pour décider de la fusion vers `main` — en rappelant qu'un push sur `main` **déclenche un déploiement public** via `.github/workflows/deploy-pages.yml`, et que cette décision appartient à l'utilisateur.

---

## Récapitulatif des vérifications de fin de jalon

| Critère d'acceptation | Comment il est prouvé |
|---|---|
| Ouvrir un Bronze et un Arène, les pièces entrent dans l'inventaire | Task 9 Step 6 (navigateur) + `chest.test.ts` |
| Fusionner jusqu'à changer de rang | Task 10 Step 4 point 4 (navigateur) + `fusion.test.ts` |
| Équiper une pièce change le combat | Task 10 Step 4 point 6 (navigateur) + `talents.test.ts`, `combat.test.ts`, `physics.test.ts` |
| Les deux pity vérifiés par test | Task 7 Step 4 — `chest.test.ts`, pity Arène au 10ᵉ et Mythique au 30ᵉ |
| Un rechargement conserve tout | Task 4 Step 9 et Task 10 Step 4 point 9 (navigateur) + `save.test.ts` |
| Tout l'équilibrage dans `balance.json` | Task 12 Step 2 (`grep`) + `config.test.ts` |
| `src/sim/` pur, déterminisme inchangé | Task 12 Step 3 (`grep`) + les quatre tests de déterminisme de `sim.test.ts` |
| `npm run test` et `npm run build` verts | Task 12 Step 1 |
