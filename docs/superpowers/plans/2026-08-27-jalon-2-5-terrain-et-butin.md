# Jalon 2.5 — Le terrain et le butin : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendre le pilotage lisible à l'échelle d'un combat (répulsion réellement parcourue, bord à brèches, zones au sol, éclat à disputer) et ouvrir le robinet de butin (un coffre par salle vidée, Bronze à 250 crédits), pour amener le chapitre 1 de 2,08 h à ~15 min et le premier coffre ouvert de 2,92 h à moins de 2 min.

**Architecture:** Un module pur `src/sim/terrain.ts` porte le contenu d'arène — `ZoneMods` à valeurs neutres sur le modèle de `TalentMods`, `ArenaLayout` construit depuis `run.rngState` à chaque entrée de salle. `RunState` gagne `arena` et `ejected` ; `MetaState` gagne `pending`. Les fonctions de `physics.ts` et `combat.ts` prennent un `ZoneMods` en paramètre et le composent sans jamais tester la présence d'une zone. `src/sim/` reste pur et déterministe ; le rendu lit `RunState` comme aujourd'hui.

**Tech Stack:** TypeScript strict, Vite 6, React 19, PixiJS 8, Vitest 2, Playwright (devDependency, captures de vérification), `vite-node` (harnais de calibration headless).

**Spec:** `docs/superpowers/specs/2026-08-26-jalon-2-5-terrain-et-butin-design.md`

## Global Constraints

Ces contraintes s'appliquent à **toutes** les tâches. Elles viennent de `CLAUDE.md` et de la § « Contraintes non négociables » de la spec.

- **`src/sim/` est pur et déterministe** : aucun import de DOM, PixiJS, React, `Date` ou `Math.random`. Le RNG est sérialisé dans l'état, le temps n'avance que par `tick()` à pas fixe de 100 ms (`TICK_S = 0.1`).
- **Le rendu est spectateur** : `src/render/` et `src/ui/` lisent l'état, ne le mutent jamais directement.
- **Tout l'équilibrage vit dans `src/content/balance.json`**, exposé par `src/sim/config.ts`. Jamais de constante d'équilibrage en dur ailleurs — y compris les rayons de zone, les seuils d'éjection et les chances de butin.
- **Le partage de charge est un acquis.** `CHARGE_BONUS` et les deux tests de `combat.test.ts` qui le verrouillent survivent intacts. Aucune tâche ne retouche la répartition des dégâts de `resolveCollision`.
- **Le test de déterminisme de `sim.test.ts` reste vrai sans être réécrit.** C'est le garde-fou de tout ce jalon.
- **Aucun nom officiel Beyblade.** L'« éclat de Gyre » dérive du lore déjà écrit (la météorite « Cœur Gyre » de `docs/game-design.md`).
- **Textes joueur en français**, code et identifiants en anglais. Vocabulaire du jeu (`salle`, `toupie`) accepté dans les types métier.
- **Tests** : Vitest, colocalisés (`src/**/*.test.ts`), imports explicites depuis `vitest` — pas de globals.
- **Commits** en français, format `type(scope): sujet`, comme l'historique existant.
- **Pas de code mort.** Rien qui ne soit atteignable aujourd'hui.

## Hors périmètre

Repris de la § 7 de la spec. Aucune tâche ne s'y aventure :

- Les identités d'arène des chapitres 2 à 8 (murs élastiques, piliers mobiles, geysers, bascule, gravité réduite, Vortex) → contenu à poser sur le système livré ici.
- Un second gabarit d'arène : `tick()` remet `run.salle` à 1 après le boss sans toucher `run.chapter`, donc le chapitre 2 n'est pas atteignable — ce serait du code mort (§ 3.4 de la spec).
- L'enchaînement des chapitres, le mode AUTO, le hors-ligne, l'atout temporaire par salle → **jalon 3**.
- La dette 1.5 et 2a de `docs/roadmap.md`, sauf les deux points touchés par nécessité : `decayPerTick` de l'instantané (Task 5) et la teinte des zones, qui entre dans `PALETTE` (Task 12).

---

## Structure des fichiers

**Créés**

| Fichier | Responsabilité |
|---|---|
| `src/sim/terrain.ts` | Contenu d'arène pur : `Zone`/`Breach`/`Shard`/`ArenaLayout`, `ZoneMods` et leur composition, construction du gabarit, cycle de l'éclat. |
| `src/sim/terrain.test.ts` | Tests du module ci-dessus. |

> **Pourquoi `terrain.ts` et pas `arena.ts`** — que la spec § 6 nommait ainsi : `src/render/arena.ts` existe déjà. Deux fichiers de même nom de base dans deux couches rendraient chaque import ambigu à la lecture. `terrain` est aussi le mot employé par la spec pour désigner cette moitié du jalon.

**Modifiés**

| Fichier | Nature du changement |
|---|---|
| `src/content/balance.json` | Clés `arena.overspeedDamping`, `arena.spawnClearance`, `arena.breach`, `arena.shard`, `arena.zones`, `arena.layouts`, `boss.mass`, `loot`. `arena.restitution` 0,8 → 1,6 (Task 8). `chests.bronze.price` 2 000 → 250 (Task 9). |
| `src/sim/config.ts` | Types `ZoneKind`/`ZoneDef`/`LayoutDef`/`ChestName`, champs correspondants de `Balance`, nouveaux exports. |
| `src/sim/config.test.ts` | Validation à l'exécution des nouvelles clés. |
| `src/sim/types.ts` | `Top.mass` ; `RunState.arena`, `RunState.ejected` ; `MetaState.pending` ; `RunReward.chests`. |
| `src/sim/physics.ts` | `applySteering(top, steer, zone)` avec amortissement de surcharge ; `moveAndBounce(top, layout)` retourne l'éjection. |
| `src/sim/combat.ts` | `drainPerTick(top, zone)` ; `decaySpin(top, zone)` ; masse propre à la toupie dans l'impulsion. |
| `src/sim/sim.ts` | Layout à l'entrée de salle, lecture des zones, éjection, éclat, ciblage des bots, butin de salle. |
| `src/sim/salle.ts` | `mass` du bot et du boss. |
| `src/sim/economy.ts` | `salleReward(salle, boss, rngState)` retourne butin + nouvel état de RNG. |
| `src/sim/chest.ts` | `drawPulls` extrait, `grantChest` ajouté. |
| `src/sim/meta.ts` | `pending` à la création, incrémenté par `applyReward` ; `pendingTotal`. |
| `src/sim/save.ts` | `SAVE_SCHEMA` 2 → 3, `pending` dans `hydrate` et `isComplete`. |
| `src/render/snapshot.ts` | `decayPerTick` de l'instantané inclut la perte de zone ; `Snapshot.ejected`. |
| `src/render/observer.ts` | `DeathEvent.cause`. |
| `src/render/textures.ts` | Textures de zone, d'éclat, de brèche. |
| `src/render/arena.ts` | Sprites de zone, secteurs de brèche, éclat, éjection. |
| `src/theme.ts` | Teintes de zone dans `PALETTE`. |
| `src/ui/ChestScreen.tsx` | Section « Butin » au-dessus de la boutique. |
| `src/ui/TabBar.tsx` | Pastille de coffres en attente. |
| `src/ui/App.tsx` | Passe le total en attente à `TabBar`. |
| `scripts/calibrate.mjs` | Politique d'autopilote qui utilise le terrain, durée par salle, heure du premier coffre. |
| `docs/game-design.md`, `docs/roadmap.md`, `docs/ameliorations.md` | Mise à jour finale. |

**Ordre et pourquoi.** Tasks 1-3 posent des fondations pures que rien ne consomme encore — le jeu tourne à l'identique. Task 4 corrige à elle seule la cause racine et se joue immédiatement. Tasks 5-8 branchent le terrain, une capacité à la fois, chacune jouable. Tasks 9-11 ouvrent le butin. Tasks 12-13 donnent à voir. Task 14 calibre — **et elle seule fixe les chiffres d'`econ`**. Task 15 met les docs à jour.

---

## Task 1 : Le terrain dans l'équilibrage

Poser toutes les valeurs dans `balance.json` et les exposer par `config.ts`, avant que la moindre ligne ne les consomme. Aucun changement de comportement : `restitution` reste à 0,8 et le prix du Bronze à 2 000 — ils bougent aux Tasks 8 et 9, pour que chaque changement d'équilibre soit isolé dans son commit.

**Files:**
- Modify: `src/content/balance.json`
- Modify: `src/sim/config.ts`
- Test: `src/sim/config.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `type ZoneKind = 'accelerateur' | 'pointes' | 'glisse'`
  - `type ChestName = 'bronze' | 'arene' | 'mythique'`
  - `interface ZoneDef { radius: number; speedMult: number; accelMult: number; friction: number; spinDrain: number }`
  - `interface LayoutDef { fromSalle: number; zones: ZoneKind[] }`
  - `interface LootRule { chest: ChestName; extra: ChestName; extraChance: number }`
  - exports `ARENA`, `ZONES`, `LAYOUTS`, `BREACH`, `SHARD`, `LOOT` (les exports existants sont conservés tels quels)

- [ ] **Step 1 : Ajouter les clés à `src/content/balance.json`**

Remplacer le bloc `"arena"` (ligne 4) par :

```json
  "arena": {
    "radius": 150, "friction": 0.94, "wallRestitution": 0.8, "restitution": 0.8,
    "overspeedDamping": 0.9,
    "spawnClearance": 30,
    "breach": { "count": 2, "halfWidthDeg": 22, "ejectSpeed": 110, "fromSalle": 3 },
    "shard": {
      "everyTicks": 90, "lifeTicks": 60, "radius": 14, "spinGain": 0.18,
      "minRadius": 0.15, "maxRadius": 0.7
    },
    "zones": {
      "accelerateur": { "radius": 34, "speedMult": 1.6, "accelMult": 1.6, "friction": 0, "spinDrain": 0 },
      "pointes": { "radius": 28, "speedMult": 1, "accelMult": 1, "friction": 0, "spinDrain": 55 },
      "glisse": { "radius": 40, "speedMult": 1, "accelMult": 1, "friction": 0.99, "spinDrain": 0 }
    },
    "layouts": [
      { "fromSalle": 1, "zones": ["accelerateur"] },
      { "fromSalle": 3, "zones": ["accelerateur", "pointes"] },
      { "fromSalle": 4, "zones": ["accelerateur", "pointes", "pointes"] },
      { "fromSalle": 6, "zones": ["accelerateur", "accelerateur", "pointes", "pointes"] },
      { "fromSalle": 8, "zones": ["accelerateur", "pointes", "pointes", "glisse"] },
      { "fromSalle": 10, "zones": ["accelerateur", "pointes", "pointes", "pointes"] }
    ]
  },
```

Remplacer le bloc `"boss"` (ligne 17) par :

```json
  "boss": { "spinMult": 4, "attackMult": 1.5, "radius": 18, "mass": 3 },
```

Ajouter, juste après le bloc `"econ"` :

```json
  "loot": {
    "bySalle": { "chest": "bronze", "extra": "arene", "extraChance": 0.2, "fromSalle": 4 },
    "boss": { "chest": "arene", "extra": "mythique", "extraChance": 0.15 }
  },
```

- [ ] **Step 2 : Écrire les tests de forme dans `src/sim/config.test.ts`**

Ajouter à l'import de tête : `ARENA, BREACH, LAYOUTS, LOOT, SHARD, ZONES, CHESTS` (certains y sont déjà — ne pas les dupliquer). Ajouter ces cas dans le `describe('balance.json', …)` existant :

```ts
  it('les zones portent des modificateurs de valeurs neutres plausibles', () => {
    const kinds = Object.keys(ZONES);
    expect(kinds.length).toBeGreaterThan(0);
    for (const [name, zone] of Object.entries(ZONES)) {
      expect(zone.radius, `zone ${name}`).toBeGreaterThan(0);
      // Une zone ne peut pas ralentir : les malus passent par spinDrain ou par la
      // friction, jamais par un plafond de vitesse rabaissé — sans quoi une zone
      // pourrait tronquer un recul, exactement le défaut que ce jalon corrige.
      expect(zone.speedMult, `zone ${name}`).toBeGreaterThanOrEqual(1);
      expect(zone.accelMult, `zone ${name}`).toBeGreaterThanOrEqual(1);
      // friction 0 = neutre ; sinon c'est un plancher strictement inférieur à 1.
      expect(zone.friction, `zone ${name}`).toBeGreaterThanOrEqual(0);
      expect(zone.friction, `zone ${name}`).toBeLessThan(1);
      expect(zone.spinDrain, `zone ${name}`).toBeGreaterThanOrEqual(0);
    }
  });

  it('les gabarits couvrent toutes les salles et ne citent que des zones connues', () => {
    expect(LAYOUTS[0].fromSalle).toBe(1);
    for (let i = 1; i < LAYOUTS.length; i++) {
      expect(LAYOUTS[i].fromSalle).toBeGreaterThan(LAYOUTS[i - 1].fromSalle);
    }
    expect(LAYOUTS[LAYOUTS.length - 1].fromSalle).toBeLessThanOrEqual(SALLES_PER_CHAPTER);
    for (const entry of LAYOUTS) {
      for (const kind of entry.zones) expect(Object.keys(ZONES)).toContain(kind);
    }
  });

  it('la salle 1 n’a aucune zone punitive', () => {
    // Le premier objet de terrain rencontré doit être un bonus. Spec § 3.4.
    for (const kind of LAYOUTS[0].zones) expect(ZONES[kind].spinDrain).toBe(0);
  });

  it('les brèches n’apparaissent pas avant que le pilotage soit compris', () => {
    expect(BREACH.fromSalle).toBeGreaterThanOrEqual(2);
    expect(BREACH.count).toBeGreaterThanOrEqual(1);
    // Les secteurs mortels doivent laisser plus de bord plein que de trou : à
    // count brèches régulièrement réparties, chacune occupe 2 × halfWidth du
    // tour, et 360 / count est l'écart entre deux centres.
    expect(BREACH.halfWidthDeg * 2).toBeLessThan(360 / BREACH.count / 2);
    expect(BREACH.ejectSpeed).toBeGreaterThan(0);
  });

  it('l’éclat reste dans l’anneau et rend une part bornée du spin', () => {
    expect(SHARD.minRadius).toBeGreaterThan(0);
    expect(SHARD.maxRadius).toBeLessThan(1);
    expect(SHARD.maxRadius).toBeGreaterThan(SHARD.minRadius);
    expect(SHARD.spinGain).toBeGreaterThan(0);
    expect(SHARD.spinGain).toBeLessThan(1);
    expect(SHARD.everyTicks).toBeGreaterThan(SHARD.lifeTicks);
  });

  it('l’amortissement de surcharge résorbe sans jamais figer', () => {
    expect(ARENA.overspeedDamping).toBeGreaterThan(0);
    expect(ARENA.overspeedDamping).toBeLessThan(1);
  });

  it('le butin ne cite que des coffres existants', () => {
    for (const rule of [LOOT.bySalle, LOOT.boss]) {
      expect(Object.keys(CHESTS)).toContain(rule.chest);
      expect(Object.keys(CHESTS)).toContain(rule.extra);
      expect(rule.extraChance).toBeGreaterThan(0);
      expect(rule.extraChance).toBeLessThan(1);
    }
  });
```

- [ ] **Step 3 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/config.test.ts`
Expected: FAIL — erreurs de typage/`undefined` sur `ZONES`, `LAYOUTS`, `BREACH`, `SHARD`, `LOOT` qui ne sont pas encore exportés.

- [ ] **Step 4 : Déclarer les types et les exports dans `src/sim/config.ts`**

Ajouter après la déclaration de `SlotName` (ligne 5) :

```ts
/** Types de zone au sol. Répété ici comme `SlotName` : ce fichier est la racine
 *  des dépendances de la simulation, il n'importe rien d'elle. */
export type ZoneKind = 'accelerateur' | 'pointes' | 'glisse';

/** Répété ici pour la même raison que `SlotName` — `ChestKind` vit dans `types.ts`. */
export type ChestName = 'bronze' | 'arene' | 'mythique';

export interface ZoneDef {
  radius: number;
  /** Facteur sur la vitesse maximale. 1 = sans effet. */
  speedMult: number;
  /** Facteur sur l'accélération. 1 = sans effet. */
  accelMult: number;
  /** Friction *plancher* de la zone. 0 = sans effet. */
  friction: number;
  /** Spin perdu par seconde. 0 = sans effet. */
  spinDrain: number;
}

/** Palier de gabarit : s'applique à partir de `fromSalle` jusqu'au palier suivant. */
export interface LayoutDef {
  fromSalle: number;
  zones: ZoneKind[];
}

export interface LootRule {
  chest: ChestName;
  extra: ChestName;
  extraChance: number;
}
```

Dans l'interface `Balance`, remplacer les lignes `arena` et `boss` et ajouter `loot` :

```ts
  arena: {
    radius: number; friction: number; wallRestitution: number; restitution: number;
    overspeedDamping: number;
    spawnClearance: number;
    breach: { count: number; halfWidthDeg: number; ejectSpeed: number; fromSalle: number };
    shard: {
      everyTicks: number; lifeTicks: number; radius: number; spinGain: number;
      minRadius: number; maxRadius: number;
    };
    zones: Record<ZoneKind, ZoneDef>;
    layouts: LayoutDef[];
  };
  boss: { spinMult: number; attackMult: number; radius: number; mass: number };
  loot: { bySalle: LootRule & { fromSalle: number }; boss: LootRule };
```

Ajouter les exports à la suite de ceux qui existent (ne rien retirer) :

```ts
export const ARENA = BALANCE.arena;
export const BREACH = BALANCE.arena.breach;
export const SHARD = BALANCE.arena.shard;
export const ZONES = BALANCE.arena.zones;
export const LAYOUTS = BALANCE.arena.layouts;
export const LOOT = BALANCE.loot;
```

- [ ] **Step 5 : Lancer les tests**

Run: `npx vitest run src/sim/config.test.ts`
Expected: PASS.

- [ ] **Step 6 : Vérifier que rien n'a bougé ailleurs**

Run: `npm run test && npm run build`
Expected: tout vert, aucun test existant modifié.

- [ ] **Step 7 : Commit**

```bash
git add src/content/balance.json src/sim/config.ts src/sim/config.test.ts
git commit -m "feat(config): le terrain et le butin entrent dans l'équilibrage

Zones, gabarits par salle, brèches, éclat de Gyre, masse du boss et table de
butin, tous en JSON avec leur validation de forme. Aucun consommateur encore :
restitution et prix du Bronze ne bougeront qu'aux tâches qui les jouent."
```

---

## Task 2 : `ZoneMods` et leur composition

Le module `terrain.ts` naît avec ses types et la seule fonction qui lit les zones. Rien ne le consomme encore.

**Files:**
- Create: `src/sim/terrain.ts`
- Create: `src/sim/terrain.test.ts`

**Interfaces:**
- Consumes: `ZONES`, `ZoneKind` (Task 1) ; `Vec` de `./types`.
- Produces:
  - `interface Zone { kind: ZoneKind; x: number; y: number; radius: number }`
  - `interface Breach { angle: number; halfWidth: number }`
  - `interface Shard { x: number; y: number; ttl: number }`
  - `interface ArenaLayout { zones: Zone[]; breaches: Breach[]; shard: Shard | null; shardTimer: number }`
  - `interface ZoneMods { speedMult: number; accelMult: number; friction: number; spinDrain: number }`
  - `const NEUTRAL_ZONE: ZoneMods`
  - `zoneModsAt(layout: ArenaLayout, pos: Vec): ZoneMods`

- [ ] **Step 1 : Écrire `src/sim/terrain.test.ts`**

```ts
import { describe, expect, it } from 'vitest';
import { NEUTRAL_ZONE, zoneModsAt, type ArenaLayout, type Zone } from './terrain';
import { ZONES } from './config';

function layout(over: Partial<ArenaLayout> = {}): ArenaLayout {
  return { zones: [], breaches: [], shard: null, shardTimer: 0, ...over };
}

function zone(kind: Zone['kind'], x: number, y: number): Zone {
  return { kind, x, y, radius: ZONES[kind].radius };
}

describe('zoneModsAt', () => {
  it('rend les valeurs neutres hors de toute zone', () => {
    const l = layout({ zones: [zone('pointes', 100, 0)] });
    expect(zoneModsAt(l, { x: -100, y: 0 })).toBe(NEUTRAL_ZONE);
  });

  it('rend les valeurs neutres sur une arène nue', () => {
    expect(zoneModsAt(layout(), { x: 0, y: 0 })).toBe(NEUTRAL_ZONE);
  });

  it('applique la zone dont on occupe le centre', () => {
    const l = layout({ zones: [zone('accelerateur', 0, 0)] });
    const mods = zoneModsAt(l, { x: 0, y: 0 });
    expect(mods.speedMult).toBeCloseTo(ZONES.accelerateur.speedMult, 10);
    expect(mods.accelMult).toBeCloseTo(ZONES.accelerateur.accelMult, 10);
  });

  it('appartenir à une zone se juge au centre de la toupie, pas à son bord', () => {
    // Le repère au sol sous la toupie est ce que le joueur voit : la règle doit
    // être celle-là, pas un chevauchement de disques qu'il ne peut pas estimer.
    const r = ZONES.pointes.radius;
    const l = layout({ zones: [zone('pointes', 0, 0)] });
    expect(zoneModsAt(l, { x: r - 1, y: 0 }).spinDrain).toBe(ZONES.pointes.spinDrain);
    expect(zoneModsAt(l, { x: r + 1, y: 0 }).spinDrain).toBe(0);
  });

  it('compose deux zones superposées : produit, maximum, somme', () => {
    const l = layout({ zones: [zone('accelerateur', 0, 0), zone('pointes', 0, 0), zone('glisse', 0, 0)] });
    const mods = zoneModsAt(l, { x: 0, y: 0 });
    expect(mods.speedMult).toBeCloseTo(ZONES.accelerateur.speedMult, 10);
    expect(mods.spinDrain).toBeCloseTo(ZONES.pointes.spinDrain, 10);
    expect(mods.friction).toBeCloseTo(ZONES.glisse.friction, 10);
  });

  it('somme la perte de spin de deux zones de pointes superposées', () => {
    const l = layout({ zones: [zone('pointes', 0, 0), zone('pointes', 0, 0)] });
    expect(zoneModsAt(l, { x: 0, y: 0 }).spinDrain).toBeCloseTo(ZONES.pointes.spinDrain * 2, 10);
  });

  it('ne laisse jamais muter les valeurs neutres', () => {
    // NEUTRAL_ZONE est rendu par référence dans le cas courant : une mutation
    // accidentelle contaminerait toutes les toupies de toutes les salles.
    expect(Object.isFrozen(NEUTRAL_ZONE)).toBe(true);
  });
});
```

- [ ] **Step 2 : Lancer le test pour le voir échouer**

Run: `npx vitest run src/sim/terrain.test.ts`
Expected: FAIL — `Failed to resolve import "./terrain"`.

- [ ] **Step 3 : Écrire `src/sim/terrain.ts`**

```ts
import { ZONES, type ZoneKind } from './config';
import type { Vec } from './types';

/** Disque posé au sol. Une toupie y est soumise dès que son **centre** y entre :
 *  c'est ce que le joueur voit sous sa toupie, donc la seule règle qu'il puisse
 *  anticiper. */
export interface Zone {
  kind: ZoneKind;
  x: number;
  y: number;
  radius: number;
}

/** Secteur mortel du bord. Angles en **radians**, centre de l'arène pour origine.
 *  `balance.json` porte la demi-ouverture en degrés (plus lisible à régler) ; la
 *  conversion a lieu une fois, à la construction du gabarit. */
export interface Breach {
  angle: number;
  halfWidth: number;
}

export interface Shard {
  x: number;
  y: number;
  /** Ticks restants avant disparition. */
  ttl: number;
}

export interface ArenaLayout {
  zones: Zone[];
  breaches: Breach[];
  shard: Shard | null;
  /** Ticks avant la prochaine apparition d'éclat. */
  shardTimer: number;
}

/** Modificateurs de terrain appliqués à une toupie. Même principe que
 *  `TalentMods` : chaque champ a une valeur *neutre*, de sorte que le code de
 *  simulation multiplie, compare et additionne sans jamais tester la présence
 *  d'une zone. */
export interface ZoneMods {
  /** Facteur sur la vitesse maximale. 1 = neutre. */
  speedMult: number;
  /** Facteur sur l'accélération. 1 = neutre. */
  accelMult: number;
  /** Friction *plancher* de la zone. 0 = neutre : `max(talents.friction, zone.friction)`
   *  laisse alors la friction du talent intacte, et la plaque glissante l'emporte
   *  toujours sur elle — sans branche. */
  friction: number;
  /** Spin perdu par seconde. 0 = neutre. */
  spinDrain: number;
}

export const NEUTRAL_ZONE: ZoneMods = Object.freeze({
  speedMult: 1,
  accelMult: 1,
  friction: 0,
  spinDrain: 0,
});

/** Modificateurs subis à cette position. Rend `NEUTRAL_ZONE` **par référence**
 *  hors zone — le cas courant, dix fois par seconde et par toupie : aucune
 *  allocation. L'objet étant gelé, l'appelant ne peut pas le contaminer. */
export function zoneModsAt(layout: ArenaLayout, pos: Vec): ZoneMods {
  let mods: ZoneMods | null = null;
  for (const zone of layout.zones) {
    if (Math.hypot(pos.x - zone.x, pos.y - zone.y) > zone.radius) continue;
    const def = ZONES[zone.kind];
    mods ??= { ...NEUTRAL_ZONE };
    mods.speedMult *= def.speedMult;
    mods.accelMult *= def.accelMult;
    mods.friction = Math.max(mods.friction, def.friction);
    mods.spinDrain += def.spinDrain;
  }
  return mods ?? NEUTRAL_ZONE;
}
```

- [ ] **Step 4 : Lancer les tests**

Run: `npx vitest run src/sim/terrain.test.ts`
Expected: PASS — 7 tests.

- [ ] **Step 5 : Vérifier l'ensemble**

Run: `npm run test && npm run build`
Expected: tout vert.

- [ ] **Step 6 : Commit**

```bash
git add src/sim/terrain.ts src/sim/terrain.test.ts
git commit -m "feat(sim): les modificateurs de terrain, sur le modèle des talents

ZoneMods à valeurs neutres — produit pour les multiplicateurs, maximum pour la
friction, somme pour la perte de spin — pour que le code de simulation compose
sans jamais tester la présence d'une zone. Hors zone, NEUTRAL_ZONE est rendu
par référence : aucune allocation dans le cas courant."
```

---

## Task 3 : Le gabarit d'arène

Construire un `ArenaLayout` à partir d'un numéro de salle et d'un état de RNG. Toujours aucun consommateur.

**Files:**
- Modify: `src/sim/terrain.ts`
- Modify: `src/sim/terrain.test.ts`

**Interfaces:**
- Consumes: `ARENA_RADIUS`, `ARENA`, `BREACH`, `LAYOUTS`, `PLAYER_SPAWN`, `SHARD`, `ZONES` (Task 1) ; `nextRandom` de `./rng` ; les types de la Task 2.
- Produces:
  - `buildLayout(salle: number, rngState: number): { layout: ArenaLayout; rngState: number }`
  - `inBreach(layout: ArenaLayout, angle: number): boolean`

- [ ] **Step 1 : Ajouter les tests à `src/sim/terrain.test.ts`**

Compléter l'import de tête : `import { buildLayout, inBreach, NEUTRAL_ZONE, zoneModsAt, type ArenaLayout, type Zone } from './terrain';` et `import { ARENA, ARENA_RADIUS, BREACH, LAYOUTS, PLAYER_SPAWN, SHARD, ZONES } from './config';`. Ajouter :

```ts
describe('buildLayout', () => {
  it('suit le gabarit de la salle', () => {
    for (const entry of LAYOUTS) {
      const { layout } = buildLayout(entry.fromSalle, 12345);
      expect(layout.zones.map((z) => z.kind)).toEqual(entry.zones);
    }
  });

  it('garde le gabarit du dernier palier franchi', () => {
    // La salle 5 n'a pas d'entrée propre : elle hérite du palier 4.
    const palier4 = LAYOUTS.find((e) => e.fromSalle === 4)!;
    const { layout } = buildLayout(5, 999);
    expect(layout.zones.map((z) => z.kind)).toEqual(palier4.zones);
  });

  it('rend exactement le même gabarit pour la même graine', () => {
    const a = buildLayout(8, 4242);
    const b = buildLayout(8, 4242);
    expect(a.layout).toEqual(b.layout);
    expect(a.rngState).toBe(b.rngState);
  });

  it('fait avancer l’état du RNG', () => {
    const { rngState } = buildLayout(8, 4242);
    expect(rngState).not.toBe(4242);
  });

  it('ne pose aucune zone sur le point d’apparition du joueur', () => {
    // Commencer une salle dans les pointes serait une perte de spin qu'aucun
    // geste ne peut éviter.
    for (let seed = 1; seed <= 200; seed++) {
      const { layout } = buildLayout(10, seed);
      for (const z of layout.zones) {
        const d = Math.hypot(z.x - PLAYER_SPAWN.x, z.y - PLAYER_SPAWN.y);
        expect(d, `graine ${seed}, zone ${z.kind}`).toBeGreaterThanOrEqual(z.radius + ARENA.spawnClearance);
      }
    }
  });

  it('garde chaque zone entièrement dans l’anneau', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const { layout } = buildLayout(10, seed);
      for (const z of layout.zones) {
        expect(Math.hypot(z.x, z.y) + z.radius, `graine ${seed}`).toBeLessThanOrEqual(ARENA_RADIUS + 1e-9);
      }
    }
  });

  it('n’ouvre aucune brèche avant la salle prévue', () => {
    for (let salle = 1; salle < BREACH.fromSalle; salle++) {
      expect(buildLayout(salle, 7).layout.breaches).toHaveLength(0);
    }
    expect(buildLayout(BREACH.fromSalle, 7).layout.breaches).toHaveLength(BREACH.count);
  });

  it('répartit les brèches régulièrement — il reste toujours du bord plein', () => {
    for (let seed = 1; seed <= 100; seed++) {
      const { layout } = buildLayout(10, seed);
      for (let i = 1; i < layout.breaches.length; i++) {
        const gap = layout.breaches[i].angle - layout.breaches[i - 1].angle;
        expect(gap).toBeCloseTo((Math.PI * 2) / BREACH.count, 10);
      }
    }
  });

  it('arme le compte à rebours de l’éclat sans éclat présent', () => {
    const { layout } = buildLayout(1, 3);
    expect(layout.shard).toBeNull();
    expect(layout.shardTimer).toBe(SHARD.everyTicks);
  });
});

describe('inBreach', () => {
  const l: ArenaLayout = {
    zones: [], breaches: [{ angle: 0, halfWidth: 0.4 }], shard: null, shardTimer: 0,
  };

  it('reconnaît un angle dans le secteur', () => {
    expect(inBreach(l, 0)).toBe(true);
    expect(inBreach(l, 0.39)).toBe(true);
    expect(inBreach(l, -0.39)).toBe(true);
  });

  it('rejette un angle hors du secteur', () => {
    expect(inBreach(l, 0.41)).toBe(false);
    expect(inBreach(l, Math.PI)).toBe(false);
  });

  it('recolle les angles à 2π près', () => {
    // atan2 rend ]-π, π] ; une brèche centrée sur 0,1 rad et un point à 6,2 rad
    // sont au même endroit, et un écart calculé naïvement les croirait opposés.
    const wrapped: ArenaLayout = {
      zones: [], breaches: [{ angle: 6.2, halfWidth: 0.4 }], shard: null, shardTimer: 0,
    };
    expect(inBreach(wrapped, 0.05)).toBe(true);
  });

  it('rend faux sans aucune brèche', () => {
    expect(inBreach({ zones: [], breaches: [], shard: null, shardTimer: 0 }, 0)).toBe(false);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/terrain.test.ts`
Expected: FAIL — `buildLayout` et `inBreach` ne sont pas exportés.

- [ ] **Step 3 : Implémenter dans `src/sim/terrain.ts`**

Compléter l'import de tête :

```ts
import { ARENA, ARENA_RADIUS, BREACH, LAYOUTS, PLAYER_SPAWN, SHARD, ZONES, type ZoneKind } from './config';
import { nextRandom } from './rng';
import type { Vec } from './types';
```

Ajouter à la fin du fichier :

```ts
const TWO_PI = Math.PI * 2;
const DEG = Math.PI / 180;
/** Essais de placement avant d'accepter un chevauchement. Borné pour que le
 *  nombre de tirages consommés reste fini quelle que soit la graine — un
 *  rejet non borné rendrait la durée d'une entrée de salle imprévisible. */
const PLACEMENT_TRIES = 12;

/** Gabarit du dernier palier franchi. La table est triée par `fromSalle`
 *  croissant, ce que `config.test.ts` vérifie. */
function zoneKindsFor(salle: number): ZoneKind[] {
  let kinds: ZoneKind[] = [];
  for (const entry of LAYOUTS) {
    if (salle >= entry.fromSalle) kinds = entry.zones;
  }
  return kinds;
}

/** Vrai si la zone laisse le point d'apparition du joueur dégagé. */
function clearOfSpawn(candidate: Zone): boolean {
  const toSpawn = Math.hypot(candidate.x - PLAYER_SPAWN.x, candidate.y - PLAYER_SPAWN.y);
  return toSpawn >= candidate.radius + ARENA.spawnClearance;
}

/** Vrai si la zone ne recouvre aucune zone déjà posée. */
function clearOfZones(candidate: Zone, placed: Zone[]): boolean {
  return placed.every(
    (other) => Math.hypot(candidate.x - other.x, candidate.y - other.y) >= candidate.radius + other.radius,
  );
}

/**
 * Repli déterministe : diamétralement opposé au point d'apparition, à la limite
 * intérieure de l'anneau. Il rend la garantie « jamais sur le point d'apparition »
 * **absolue** au lieu de probable — le tirage rejeté est borné à douze essais, il
 * pourrait donc rendre un candidat fautif. Le chevauchement entre zones, lui,
 * reste toléré : il ne coûte qu'un peu de lisibilité, jamais du spin imparable.
 */
function awayFromSpawn(kind: ZoneKind, radius: number): Zone {
  const span = ARENA_RADIUS - radius;
  const d = Math.hypot(PLAYER_SPAWN.x, PLAYER_SPAWN.y) || 1;
  const k = Math.min(span, d + radius + ARENA.spawnClearance) / d;
  return { kind, x: -PLAYER_SPAWN.x * k, y: -PLAYER_SPAWN.y * k, radius };
}

export function buildLayout(salle: number, rngState: number): { layout: ArenaLayout; rngState: number } {
  let rng = rngState;
  const zones: Zone[] = [];

  for (const kind of zoneKindsFor(salle)) {
    const radius = ZONES[kind].radius;
    // La zone entière doit tenir dans l'anneau : son centre reste à `radius` du bord.
    const span = ARENA_RADIUS - radius;
    const draw = (): Zone => {
      const ra = nextRandom(rng);
      rng = ra.state;
      const rr = nextRandom(rng);
      rng = rr.state;
      const angle = ra.value * TWO_PI;
      // La racine carrée donne une densité uniforme sur le disque ; sans elle,
      // toutes les zones s'agglutineraient au centre.
      const dist = Math.sqrt(rr.value) * span;
      return { kind, x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, radius };
    };
    let candidate = draw();
    for (
      let t = 1;
      t < PLACEMENT_TRIES && !(clearOfSpawn(candidate) && clearOfZones(candidate, zones));
      t++
    ) {
      candidate = draw();
    }
    zones.push(clearOfSpawn(candidate) ? candidate : awayFromSpawn(kind, radius));
  }

  const breaches: Breach[] = [];
  if (salle >= BREACH.fromSalle) {
    const rb = nextRandom(rng);
    rng = rb.state;
    // Un seul tirage : l'orientation de la paire. L'écart entre deux brèches est
    // fixe et régulier, ce qui garantit qu'il reste toujours un secteur de bord
    // plein assez large pour s'y adosser — une éjection est toujours évitable.
    const base = rb.value * TWO_PI;
    for (let i = 0; i < BREACH.count; i++) {
      breaches.push({ angle: base + (i * TWO_PI) / BREACH.count, halfWidth: BREACH.halfWidthDeg * DEG });
    }
  }

  return {
    layout: { zones, breaches, shard: null, shardTimer: SHARD.everyTicks },
    rngState: rng,
  };
}

/** Vrai si cet angle de bord tombe dans un secteur mortel. */
export function inBreach(layout: ArenaLayout, angle: number): boolean {
  for (const breach of layout.breaches) {
    // Écart signé replié dans [-π, π] : sans ce repli, une brèche à 6,2 rad et
    // un point à 0,05 rad — le même endroit à 2π près — sembleraient opposés.
    const raw = angle - breach.angle;
    const wrapped = Math.atan2(Math.sin(raw), Math.cos(raw));
    if (Math.abs(wrapped) <= breach.halfWidth) return true;
  }
  return false;
}
```

- [ ] **Step 4 : Poser le garde-fou d'équilibrage du repli dans `src/sim/config.test.ts`**

```ts
  it('le repli de placement reste géométriquement possible', () => {
    // buildLayout replie une zone diamétralement opposée au point d'apparition
    // quand douze tirages n'ont rien trouvé. Ce repli n'existe que si l'anneau
    // est assez large pour la plus grosse zone.
    const d = Math.hypot(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
    for (const [name, zone] of Object.entries(ZONES)) {
      expect(d + ARENA.radius - zone.radius, `zone ${name}`)
        .toBeGreaterThanOrEqual(zone.radius + ARENA.spawnClearance);
    }
  });
```

Compléter l'import avec `PLAYER_SPAWN`.

- [ ] **Step 5 : Lancer les tests**

Run: `npx vitest run src/sim/terrain.test.ts src/sim/config.test.ts`
Expected: PASS — 21 tests de terrain.

- [ ] **Step 6 : Vérifier l'ensemble**

Run: `npm run test && npm run build`
Expected: tout vert.

- [ ] **Step 7 : Commit**

```bash
git add src/sim/terrain.ts src/sim/terrain.test.ts src/sim/config.test.ts
git commit -m "feat(sim): construction du gabarit d'arène

Zones tirées du flux du run par rejet borné à douze essais — jamais sur le
point d'apparition du joueur, jamais débordantes. Brèches régulièrement
réparties depuis une orientation tirée : il reste toujours un secteur de bord
plein assez large pour s'y adosser, donc une éjection est toujours évitable."
```

---

## Task 4 : L'amortissement de surcharge

La cause racine, corrigée seule. `applySteering` gagne son paramètre de zone ; `sim.ts` lui passe `NEUTRAL_ZONE` en attendant la Task 5. Effet immédiat et jouable : le recul d'une collision est enfin parcouru.

**Files:**
- Modify: `src/sim/physics.ts`
- Modify: `src/sim/sim.ts:98-99`
- Test: `src/sim/physics.test.ts`

**Interfaces:**
- Consumes: `ARENA` (Task 1) ; `NEUTRAL_ZONE`, `ZoneMods` (Task 2).
- Produces: `applySteering(top: Top, steer: Vec | null, zone: ZoneMods): void` — la signature change, tous les appelants doivent passer une zone.

- [ ] **Step 1 : Adapter les tests existants et ajouter les nouveaux dans `src/sim/physics.test.ts`**

Compléter les imports de tête :

```ts
import { ARENA, ARENA_RADIUS, FRICTION, TICK_S, ZONES } from './config';
import { NEUTRAL_ZONE, type ZoneMods } from './terrain';
```

Les trois appels existants à `applySteering(t, …)` prennent un troisième argument `NEUTRAL_ZONE`. Le test « plafonne à maxSpeed » reste vrai tel quel : la toupie y part de 239, donc sous le plafond. Ajouter ensuite :

```ts
function zoneMods(over: Partial<ZoneMods> = {}): ZoneMods {
  return { ...NEUTRAL_ZONE, ...over };
}

describe('applySteering — amortissement de surcharge', () => {
  it('ne tronque plus une vitesse reçue d’un choc', () => {
    // Le défaut d'origine : le recul d'une collision était ramené au plafond au
    // tick suivant, AVANT que moveAndBounce ne l'ait parcouru d'un seul pixel.
    const t = top({ vel: { x: 500, y: 0 } });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeGreaterThan(240);
  });

  it('amortit d’un facteur constant tant qu’on est au-dessus du plafond', () => {
    const t = top({ vel: { x: 500, y: 0 } });
    applySteering(t, null, NEUTRAL_ZONE);
    // La friction du relâchement s'applique d'abord, l'amortissement ensuite.
    expect(t.vel.x).toBeCloseTo(500 * FRICTION * ARENA.overspeedDamping, 5);
  });

  it('ne descend jamais sous le plafond par amortissement', () => {
    const t = top({ vel: { x: 241, y: 0 }, talents: { ...NEUTRAL_TALENTS, friction: 1 } });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeCloseTo(240, 5);
  });

  it('converge vers le plafond en une poignée de ticks', () => {
    const t = top({ vel: { x: 500, y: 0 } });
    for (let i = 0; i < 20; i++) applySteering(t, null, NEUTRAL_ZONE);
    expect(Math.hypot(t.vel.x, t.vel.y)).toBeLessThanOrEqual(240 + 1e-9);
  });
});

describe('applySteering — zones', () => {
  it('un accélérateur relève le plafond', () => {
    const zone = zoneMods({ speedMult: ZONES.accelerateur.speedMult });
    const t = top({ vel: { x: 239, y: 0 } });
    applySteering(t, { x: 1, y: 0 }, zone);
    expect(Math.hypot(t.vel.x, t.vel.y)).toBeGreaterThan(240);
  });

  it('un accélérateur multiplie l’accélération', () => {
    const zone = zoneMods({ accelMult: 2 });
    const t = top();
    applySteering(t, { x: 1, y: 0 }, zone);
    expect(t.vel.x).toBeCloseTo(900 * 2 * TICK_S, 5);
  });

  it('une plaque glissante l’emporte sur la friction ordinaire', () => {
    const zone = zoneMods({ friction: 0.99 });
    const t = top({ vel: { x: 100, y: 0 } });
    applySteering(t, null, zone);
    expect(t.vel.x).toBeCloseTo(100 * 0.99, 5);
  });

  it('une zone ne peut pas rendre une toupie plus adhérente qu’elle ne l’est', () => {
    // friction de zone neutre = 0 : le `max` laisse la friction du talent intacte.
    const t = top({ vel: { x: 100, y: 0 }, talents: { ...NEUTRAL_TALENTS, friction: 0.96 } });
    applySteering(t, null, NEUTRAL_ZONE);
    expect(t.vel.x).toBeCloseTo(100 * 0.96, 5);
  });
});
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/physics.test.ts`
Expected: FAIL — `applySteering` n'accepte que deux arguments ; les nouveaux cas d'amortissement échouent sur une vitesse tronquée à 240.

- [ ] **Step 3 : Réécrire `applySteering` dans `src/sim/physics.ts`**

Compléter l'import de tête :

```ts
import { ARENA, ARENA_RADIUS, TICK_S, WALL_RESTITUTION } from './config';
import type { ZoneMods } from './terrain';
import type { Top, Vec } from './types';
```

Remplacer `applySteering` :

```ts
export function applySteering(top: Top, steer: Vec | null, zone: ZoneMods): void {
  if (steer) {
    const len = Math.hypot(steer.x, steer.y) || 1;
    const accel = top.accel * zone.accelMult;
    top.vel.x += (steer.x / len) * accel * TICK_S;
    top.vel.y += (steer.y / len) * accel * TICK_S;
  } else {
    // Une zone ne peut que rendre plus glissant : à friction de zone neutre (0),
    // le `max` laisse celle du talent intacte.
    const friction = Math.max(top.talents.friction, zone.friction);
    top.vel.x *= friction;
    top.vel.y *= friction;
  }
  const max = effectiveMaxSpeed(top) * zone.speedMult;
  const speed = Math.hypot(top.vel.x, top.vel.y);
  if (speed > max) {
    // Au-delà du plafond, cette vitesse vient d'un choc, pas du doigt du joueur :
    // on la laisse se résorber au lieu de la trancher. Tronquer ici annulait le
    // recul d'une collision AVANT que `moveAndBounce` ne l'ait parcouru d'un seul
    // pixel — la répulsion n'existait tout simplement pas. Le plafond continue de
    // borner le pilotage, il ne borne plus les coups reçus.
    const target = Math.max(max, speed * ARENA.overspeedDamping);
    const k = target / speed;
    top.vel.x *= k;
    top.vel.y *= k;
  }
}
```

- [ ] **Step 4 : Mettre à jour les appelants dans `src/sim/sim.ts`**

Compléter l'import : `import { NEUTRAL_ZONE } from './terrain';`. Remplacer les deux lignes de `tick()` :

```ts
  // NEUTRAL_ZONE en attendant que les zones soient branchées : la valeur neutre
  // traverse le calcul sans rien changer.
  applySteering(run.player, input.steer, NEUTRAL_ZONE);
  for (const bot of run.bots) applySteering(bot, bot.aim, NEUTRAL_ZONE);
```

- [ ] **Step 5 : Lancer les tests**

Run: `npx vitest run src/sim/physics.test.ts`
Expected: PASS.

- [ ] **Step 6 : Vérifier l'ensemble et mesurer l'effet**

Run: `npm run test && npm run build && npm run calibrate`
Expected: tout vert. La calibration bouge — c'est attendu, et **on ne la corrige pas ici** : les chiffres d'`econ` se règlent en une seule fois à la Task 14. Noter la valeur obtenue dans le message de commit.

- [ ] **Step 7 : Vérifier à l'œil**

Run: `npm run dev` puis jouer une salle.
Expected: percuter un bot le projette visiblement ; il ne repart plus « à vitesse normale » comme si de rien n'était.

- [ ] **Step 8 : Commit**

```bash
git add src/sim/physics.ts src/sim/physics.test.ts src/sim/sim.ts
git commit -m "fix(sim): le plafond de vitesse n'annule plus la répulsion

applySteering tronquait à maxSpeed la vitesse issue d'une collision, au tick
suivant, AVANT que moveAndBounce ne s'en serve : le recul n'était jamais
parcouru. Chiffré sur un choc frontal joueur/bot, le bot repartait à 202 px/s
et ressortait à 140 — près d'un tiers du recul jeté, quand le joueur, sous son
plafond de 240, gardait le sien en entier.

Au-dessus du plafond on amortit désormais (×0,9/tick) au lieu de trancher : le
plafond borne le pilotage, plus les coups reçus. applySteering prend au
passage son paramètre de zone, encore neutre à ce commit."
```

---

## Task 5 : Les zones actives

Le layout entre dans `RunState`, les zones agissent, et le rendu cesse de prendre les pointes pour un choc.

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/sim.ts`
- Modify: `src/sim/combat.ts`
- Modify: `src/render/snapshot.ts`
- Test: `src/sim/combat.test.ts`, `src/render/snapshot.test.ts`, `src/sim/sim.test.ts`

**Interfaces:**
- Consumes: `buildLayout`, `zoneModsAt`, `NEUTRAL_ZONE`, `ArenaLayout`, `ZoneMods` (Tasks 2-3).
- Produces:
  - `RunState.arena: ArenaLayout`
  - `drainPerTick(top: Top, zone: ZoneMods): number`
  - `decaySpin(top: Top, zone: ZoneMods): void` — la signature change.

- [ ] **Step 1 : Écrire les tests dans `src/sim/combat.test.ts`**

Compléter l'import : `import { NEUTRAL_ZONE, type ZoneMods } from './terrain';`. Les appels existants à `decaySpin(t)` prennent `NEUTRAL_ZONE` en second argument. Ajouter :

```ts
describe('decaySpin — zones', () => {
  it('ajoute la perte de zone à la décroissance naturelle', () => {
    const zone: ZoneMods = { ...NEUTRAL_ZONE, spinDrain: 50 };
    const t = top({ spinDecay: 20 });
    decaySpin(t, zone);
    expect(t.spin).toBeCloseTo(1000 - (20 + 50) * TICK_S, 5);
  });

  it('Relance suspend la décroissance naturelle, pas les pointes', () => {
    // Les pointes sont des dégâts, pas de l'endurance : aucun talent d'endurance
    // ne doit en protéger.
    const zone: ZoneMods = { ...NEUTRAL_ZONE, spinDrain: 50 };
    const t = top({ spinDecay: 20, decayPauseTicks: 3 });
    decaySpin(t, zone);
    expect(t.spin).toBeCloseTo(1000 - 50 * TICK_S, 5);
  });

  it('ne reprend la décroissance qu’au tick qui suit la fin de la pause', () => {
    // La valeur doit être lue AVANT le décrément : lue après, le dernier tick de
    // pause reprendrait la décroissance un tick trop tôt.
    const t = top({ spinDecay: 20, decayPauseTicks: 1 });
    decaySpin(t, NEUTRAL_ZONE);
    expect(t.spin).toBe(1000);
    expect(t.decayPauseTicks).toBe(0);
    decaySpin(t, NEUTRAL_ZONE);
    expect(t.spin).toBeCloseTo(1000 - 20 * TICK_S, 5);
  });
});

describe('drainPerTick', () => {
  it('somme décroissance naturelle et perte de zone', () => {
    const zone: ZoneMods = { ...NEUTRAL_ZONE, spinDrain: 50 };
    expect(drainPerTick(top({ spinDecay: 20 }), zone)).toBeCloseTo(70, 10);
  });

  it('ne compte que la zone pendant une suspension', () => {
    const zone: ZoneMods = { ...NEUTRAL_ZONE, spinDrain: 50 };
    expect(drainPerTick(top({ spinDecay: 20, decayPauseTicks: 3 }), zone)).toBeCloseTo(50, 10);
  });
});
```

Ajouter `drainPerTick` à l'import depuis `./combat`.

- [ ] **Step 2 : Ajouter le test de `src/render/snapshot.test.ts`**

```ts
it('la décroissance annoncée inclut la perte de zone', () => {
  // observer.ts déduit la puissance d'un choc du spin perdu MOINS cette valeur :
  // sans la perte de zone, une toupie posée sur des pointes produirait des
  // étincelles et une secousse en continu, sans qu'aucun contact ait eu lieu.
  const run = createRun(createInitialMeta(1), 1);
  run.arena.zones = [
    { kind: 'pointes', x: run.player.pos.x, y: run.player.pos.y, radius: ZONES.pointes.radius },
  ];
  const snap = takeSnapshot(run);
  const player = snap.tops.find((t) => t.isPlayer)!;
  expect(player.decayPerTick).toBeCloseTo(decayPerTick(run.player) + ZONES.pointes.spinDrain, 10);
});
```

Adapter les imports de tête du fichier : `createRun` de `../sim/sim`, `createInitialMeta` de `../sim/meta`, `decayPerTick` de `../sim/combat`, `ZONES` de `../sim/config`.

- [ ] **Step 3 : Ajouter le test de `src/sim/sim.test.ts`**

```ts
it('chaque salle reçoit son gabarit d’arène', () => {
  const run = createRun(createInitialMeta(1), 1);
  expect(run.arena.zones.length).toBeGreaterThan(0);
  expect(run.arena.shard).toBeNull();
});
```

- [ ] **Step 4 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/combat.test.ts src/render/snapshot.test.ts src/sim/sim.test.ts`
Expected: FAIL — `drainPerTick` non exporté, `decaySpin` à un seul argument, `run.arena` inexistant.

- [ ] **Step 5 : Ajouter `arena` à `RunState` dans `src/sim/types.ts`**

Compléter l'import de tête : `import type { ArenaLayout } from './terrain';`. Ajouter dans `RunState`, après `bots` :

```ts
  /** Le terrain de la salle en cours. Reconstruit à chaque entrée de salle
   *  depuis `rngState` — donc jamais sauvegardé, et couvert par le test de
   *  déterminisme sans qu'il ait à le connaître. */
  arena: ArenaLayout;
```

- [ ] **Step 6 : Réécrire la décroissance dans `src/sim/combat.ts`**

Compléter l'import : `import type { ZoneMods } from './terrain';`. Remplacer `decaySpin` et ajouter `drainPerTick` juste après `decayPerTick` :

```ts
/** Spin perdu par seconde, terrain compris. `snapshot.ts` s'en sert pour prédire
 *  le tick à venir : sans la perte de zone, `observer.ts` prendrait les pointes
 *  pour un choc et couvrirait l'arène d'étincelles sans contact. */
export function drainPerTick(top: Top, zone: ZoneMods): number {
  return decayPerTick(top) + zone.spinDrain;
}

export function decaySpin(top: Top, zone: ZoneMods): void {
  // Lu AVANT le décrément : lu après, le dernier tick d'une pause de Relance
  // reprendrait la décroissance naturelle un tick trop tôt.
  const drain = drainPerTick(top, zone);
  // Relance suspend l'endurance, jamais les pointes — celles-ci sont des dégâts.
  if (top.decayPauseTicks > 0) top.decayPauseTicks--;
  top.spin -= drain * TICK_S;
}
```

- [ ] **Step 7 : Brancher le terrain dans `src/sim/sim.ts`**

Remplacer l'import de terrain par : `import { buildLayout, zoneModsAt } from './terrain';` (`NEUTRAL_ZONE` n'est plus utilisé ici).

Dans `startSalle`, après le `spawnSalle` :

```ts
function startSalle(run: RunState): void {
  const spawned = spawnSalle(run.salle, run.rngState);
  run.bots = spawned.bots;
  // Bots d'abord, terrain ensuite : l'ordre de consommation du flux fait partie
  // du contrat de déterminisme.
  const built = buildLayout(run.salle, spawned.rngState);
  run.arena = built.layout;
  run.rngState = built.rngState;
  run.player.pos = { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y };
  run.player.vel = { x: 0, y: 0 };
  run.player.decayPauseTicks = 0;
}
```

Dans `createRun`, initialiser le champ avant l'appel à `startSalle` (TypeScript exige que l'objet soit complet) :

```ts
    bots: [],
    // Remplacé par startSalle juste après ; l'initialiser vide évite un état
    // partiellement construit que le typage refuserait.
    arena: { zones: [], breaches: [], shard: null, shardTimer: 0 },
    phase: 'fighting',
```

Dans `tick`, remplacer le bloc pilotage/décroissance :

```ts
  if (run.tick % BOT_AI.retargetEveryTicks === 1) refreshBotAims(run);
  // Le terrain est lu UNE fois par toupie et par tick, avant le pilotage, et la
  // même valeur sert au pilotage et à la décroissance : une toupie qui traverse
  // une zone pendant un tick est traitée selon sa position de départ. Cohérent,
  // borné, et sans deux lectures divergentes dans le même tick.
  const playerZone = zoneModsAt(run.arena, run.player.pos);
  const botZones = run.bots.map((bot) => zoneModsAt(run.arena, bot.pos));
  applySteering(run.player, input.steer, playerZone);
  run.bots.forEach((bot, i) => applySteering(bot, bot.aim, botZones[i]));
```

et plus bas :

```ts
  decaySpin(run.player, playerZone);
  // `run.bots` n'est filtré qu'après : les index restent alignés sur `botZones`.
  run.bots.forEach((bot, i) => decaySpin(bot, botZones[i]));
```

- [ ] **Step 8 : Corriger `src/render/snapshot.ts`**

```ts
import { drainPerTick } from '../sim/combat';
import { zoneModsAt, type ArenaLayout } from '../sim/terrain';
import type { Phase, RunState, Top } from '../sim/types';
```

Le champ `decayPerTick` de `TopSnapshot` garde son nom — c'est ce qu'`observer.ts` retranche —, mais sa valeur inclut désormais le terrain. Mettre à jour son commentaire et les deux fonctions :

```ts
  /** Perte de spin **effective** du tick à venir : décroissance naturelle,
   *  talents et terrain compris. `observe()` la retranche pour isoler ce qui
   *  vient d'un choc — sans le terrain, une toupie posée sur des pointes
   *  produirait des étincelles en continu sans qu'aucun contact ait eu lieu. */
  decayPerTick: number;
```

```ts
function snap(top: Top, layout: ArenaLayout): TopSnapshot {
  return {
    id: top.id,
    x: top.pos.x,
    y: top.pos.y,
    spin: top.spin,
    decayPerTick: drainPerTick(top, zoneModsAt(layout, top.pos)),
    isPlayer: top.isPlayer,
  };
}

export function takeSnapshot(run: RunState): Snapshot {
  return {
    salle: run.salle,
    phase: run.phase,
    tops: [snap(run.player, run.arena), ...run.bots.map((bot) => snap(bot, run.arena))],
  };
}
```

- [ ] **Step 9 : Lancer les tests**

Run: `npm run test`
Expected: PASS — y compris le test de déterminisme de `sim.test.ts`, **non modifié**.

- [ ] **Step 10 : Vérifier le build et l'œil**

Run: `npm run build && npm run dev`
Expected: build vert. En jeu, la toupie accélère nettement dans une zone et perd du spin sur les pointes. Les zones ne sont pas encore dessinées (Task 12) — c'est attendu, on les repère à l'effet.

- [ ] **Step 11 : Commit**

```bash
git add src/sim/types.ts src/sim/sim.ts src/sim/combat.ts src/sim/combat.test.ts src/render/snapshot.ts src/render/snapshot.test.ts src/sim/sim.test.ts
git commit -m "feat(sim): les zones d'arène agissent

Le gabarit entre dans RunState à chaque entrée de salle et module pilotage et
décroissance. Deux pièges évités : Relance suspend l'endurance mais pas les
pointes (lues avant le décrément de la pause, sinon la décroissance reprend un
tick trop tôt), et l'instantané du rendu annonce la perte de zone — sans quoi
observer.ts prendrait les pointes pour un choc et couvrirait l'arène
d'étincelles sans contact."
```

---

## Task 6 : Les brèches et l'éjection

**Files:**
- Modify: `src/sim/physics.ts`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/sim.ts`
- Test: `src/sim/physics.test.ts`, `src/sim/sim.test.ts`

**Interfaces:**
- Consumes: `inBreach`, `ArenaLayout` (Task 3) ; `ARENA` (Task 1).
- Produces:
  - `moveAndBounce(top: Top, layout: ArenaLayout): boolean` — retourne l'éjection ; la signature change.
  - `RunState.ejected: string[]`

- [ ] **Step 1 : Adapter et compléter `src/sim/physics.test.ts`**

Les appels existants à `moveAndBounce(t)` prennent un second argument. Ajouter un fabricant de gabarit en tête du fichier :

```ts
import type { ArenaLayout } from './terrain';

function layout(breaches: ArenaLayout['breaches'] = []): ArenaLayout {
  return { zones: [], breaches, shard: null, shardTimer: 0 };
}
```

Remplacer les appels existants par `moveAndBounce(t, layout())`, puis ajouter :

```ts
describe('moveAndBounce — brèches', () => {
  // Une brèche centrée sur l'axe +x : une toupie qui sort par la droite y passe.
  const breached = () => layout([{ angle: 0, halfWidth: 0.4 }]);
  const atRim = () => ({ x: ARENA_RADIUS - 12 - 1, y: 0 });

  it('éjecte au-dessus du seuil, dans la brèche', () => {
    const t = top({ pos: atRim(), vel: { x: ARENA.breach.ejectSpeed + 50, y: 0 } });
    expect(moveAndBounce(t, breached())).toBe(true);
  });

  it('n’éjecte pas hors brèche, à la même vitesse', () => {
    // Même toupie, même vitesse, brèche à l'opposé : le mur tient.
    const t = top({ pos: atRim(), vel: { x: ARENA.breach.ejectSpeed + 50, y: 0 } });
    expect(moveAndBounce(t, layout([{ angle: Math.PI, halfWidth: 0.4 }]))).toBe(false);
  });

  it('n’éjecte pas sous le seuil, même dans la brèche', () => {
    const t = top({ pos: atRim(), vel: { x: ARENA.breach.ejectSpeed - 20, y: 0 } });
    expect(moveAndBounce(t, breached())).toBe(false);
  });

  it('n’éjecte jamais sur une arène sans brèche', () => {
    const t = top({ pos: atRim(), vel: { x: 900, y: 0 } });
    expect(moveAndBounce(t, layout())).toBe(false);
  });

  it('arrête net la toupie éjectée, au bord', () => {
    // Sinon le sursis de Second souffle la ressusciterait au bord, toujours
    // sortante, pour la faire éjecter au tick suivant.
    const t = top({ pos: atRim(), vel: { x: 400, y: 0 } });
    moveAndBounce(t, breached());
    expect(t.vel.x).toBe(0);
    expect(t.vel.y).toBe(0);
    expect(Math.hypot(t.pos.x, t.pos.y)).toBeCloseTo(ARENA_RADIUS - 12, 5);
  });

  it('rebondit normalement quand il n’y a pas éjection', () => {
    const t = top({ pos: atRim(), vel: { x: 100, y: 0 } });
    moveAndBounce(t, layout([{ angle: Math.PI, halfWidth: 0.4 }]));
    expect(t.vel.x).toBeLessThan(0);
  });
});
```

- [ ] **Step 2 : Ajouter le test de `src/sim/sim.test.ts`**

```ts
it('une éjection met le spin à zéro et se signale au rendu', () => {
  const run = createRun(createInitialMeta(1), 1);
  run.arena.breaches = [{ angle: 0, halfWidth: 0.6 }];
  const bot = run.bots[0];
  bot.pos = { x: ARENA_RADIUS - bot.radius - 1, y: 0 };
  bot.vel = { x: 600, y: 0 };
  bot.aim = { x: 1, y: 0 };
  tick(run, { steer: null });
  expect(run.ejected).toContain(bot.id);
  // Le bot éjecté est retiré par le filtre habituel : une éjection est une mort
  // comme une autre pour la simulation.
  expect(run.bots.some((b) => b.id === bot.id)).toBe(false);
});

it('vide la liste des éjectés à chaque tick', () => {
  const run = createRun(createInitialMeta(1), 1);
  run.ejected = ['fantome'];
  tick(run, { steer: null });
  expect(run.ejected).not.toContain('fantome');
});
```

Compléter les imports du fichier avec `ARENA_RADIUS` depuis `./config`.

- [ ] **Step 3 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/physics.test.ts src/sim/sim.test.ts`
Expected: FAIL — `moveAndBounce` ne prend qu'un argument et ne retourne rien ; `run.ejected` n'existe pas.

- [ ] **Step 4 : Réécrire `moveAndBounce` dans `src/sim/physics.ts`**

Compléter l'import : `import { inBreach, type ArenaLayout, type ZoneMods } from './terrain';`

```ts
/**
 * Avance la toupie d'un tick et la garde dans l'anneau. Retourne `true` si elle
 * vient d'être **éjectée** — franchissement du bord, dans un secteur de brèche,
 * à une vitesse sortante suffisante. L'appelant met alors son spin à zéro : pour
 * la simulation, une éjection est une mort comme une autre.
 */
export function moveAndBounce(top: Top, layout: ArenaLayout): boolean {
  top.pos.x += top.vel.x * TICK_S;
  top.pos.y += top.vel.y * TICK_S;
  const d = Math.hypot(top.pos.x, top.pos.y);
  const limit = ARENA_RADIUS - top.radius;
  if (d <= limit || d === 0) return false;
  const nx = top.pos.x / d;
  const ny = top.pos.y / d;
  const out = top.vel.x * nx + top.vel.y * ny;
  top.pos.x = nx * limit;
  top.pos.y = ny * limit;
  if (out >= ARENA.breach.ejectSpeed && inBreach(layout, Math.atan2(ny, nx))) {
    // Arrêtée net : le sursis de Second souffle ressusciterait sinon le joueur au
    // bord, toujours sortant, pour le faire éjecter au tick suivant.
    top.vel.x = 0;
    top.vel.y = 0;
    return true;
  }
  if (out > 0) {
    top.vel.x -= (1 + WALL_RESTITUTION) * out * nx;
    top.vel.y -= (1 + WALL_RESTITUTION) * out * ny;
  }
  return false;
}
```

- [ ] **Step 5 : Ajouter `ejected` à `RunState` dans `src/sim/types.ts`**

```ts
  /** Ids éjectés pendant le dernier tick. Vidé en début de tick, lu par le rendu
   *  seul — c'est ce qui distingue une éjection d'une mort par épuisement. */
  ejected: string[];
```

- [ ] **Step 6 : Brancher dans `src/sim/sim.ts`**

Ajouter `ejected: []` dans l'objet de `createRun`, et dans `resetRun` : `run.ejected = [];`.

Ajouter la fonction, au-dessus de `tick` :

```ts
/** Avance une toupie et encaisse l'éjection s'il y a lieu. */
function moveTop(run: RunState, top: Top): void {
  if (!moveAndBounce(top, run.arena)) return;
  top.spin = 0;
  run.ejected.push(top.id);
}
```

Dans `tick`, après `if (run.phase !== 'fighting') return null;` :

```ts
  run.ejected = [];
```

et remplacer les deux lignes de mouvement :

```ts
  moveTop(run, run.player);
  for (const bot of run.bots) moveTop(run, bot);
```

- [ ] **Step 7 : Lancer les tests**

Run: `npm run test`
Expected: PASS, test de déterminisme compris.

- [ ] **Step 8 : Vérifier le build et l'œil**

Run: `npm run build && npm run dev`
Expected: build vert. En jeu, pousser un bot vers un bord franchi le fait disparaître. Les brèches ne sont pas encore visibles (Task 12) : jouer les salles 1-2, sans brèche, pour vérifier que rien n'a régressé, puis la salle 3.

- [ ] **Step 9 : Commit**

```bash
git add src/sim/physics.ts src/sim/physics.test.ts src/sim/types.ts src/sim/sim.ts src/sim/sim.test.ts
git commit -m "feat(sim): le bord à brèches éjecte

Franchir le bord dans un secteur de brèche, à vitesse sortante suffisante, met
le spin à zéro — dans les deux sens. Le reste du tick est inchangé : pour la
simulation, une éjection est une mort comme une autre, elle ne se distingue que
pour le rendu, d'où run.ejected. La toupie éjectée est arrêtée net au bord,
sans quoi Second souffle la ressusciterait sortante pour la faire éjecter au
tick suivant."
```

---

## Task 7 : L'éclat de Gyre

**Files:**
- Modify: `src/sim/terrain.ts`
- Modify: `src/sim/terrain.test.ts`
- Modify: `src/sim/sim.ts`
- Test: `src/sim/sim.test.ts`

**Interfaces:**
- Consumes: `SHARD`, `ARENA_RADIUS` (Task 1) ; `ArenaLayout`, `Shard` (Task 2).
- Produces:
  - `updateShard(layout: ArenaLayout, rngState: number): number`
  - `takeShard(layout: ArenaLayout, tops: Top[]): string | null`

- [ ] **Step 1 : Ajouter les tests à `src/sim/terrain.test.ts`**

```ts
import { takeShard, updateShard } from './terrain';
import { NEUTRAL_TALENTS } from './talents';
import type { Top } from './types';

function shardTop(over: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: 12, spin: 500, spinMax: 1000, spinDecay: 10,
    attack: 10, defense: 10, maxSpeed: 240, accel: 900,
    talents: NEUTRAL_TALENTS, decayPauseTicks: 0,
    ...over,
  };
}

describe('updateShard', () => {
  it('ne fait rien tant que le compte à rebours court', () => {
    const l = layout({ shardTimer: 5 });
    updateShard(l, 1);
    expect(l.shard).toBeNull();
    expect(l.shardTimer).toBe(4);
  });

  it('ne consomme aucun tirage tant qu’aucun éclat n’apparaît', () => {
    const l = layout({ shardTimer: 5 });
    expect(updateShard(l, 77)).toBe(77);
  });

  it('fait apparaître un éclat quand le compte tombe à zéro', () => {
    const l = layout({ shardTimer: 1 });
    const after = updateShard(l, 1234);
    expect(l.shard).not.toBeNull();
    expect(l.shard!.ttl).toBe(SHARD.lifeTicks);
    expect(after).not.toBe(1234);
  });

  it('place l’éclat dans la couronne prévue', () => {
    for (let seed = 1; seed <= 200; seed++) {
      const l = layout({ shardTimer: 1 });
      updateShard(l, seed);
      const d = Math.hypot(l.shard!.x, l.shard!.y);
      expect(d).toBeGreaterThanOrEqual(ARENA_RADIUS * SHARD.minRadius - 1e-9);
      expect(d).toBeLessThanOrEqual(ARENA_RADIUS * SHARD.maxRadius + 1e-9);
    }
  });

  it('efface un éclat expiré et rearme le compte à rebours', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 1 } });
    updateShard(l, 1);
    expect(l.shard).toBeNull();
    expect(l.shardTimer).toBe(SHARD.everyTicks);
  });
});

describe('takeShard', () => {
  it('rend du spin au premier arrivé et efface l’éclat', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const t = shardTop({ id: 'a', spin: 500 });
    expect(takeShard(l, [t])).toBe('a');
    expect(t.spin).toBeCloseTo(500 + SHARD.spinGain * 1000, 5);
    expect(l.shard).toBeNull();
    expect(l.shardTimer).toBe(SHARD.everyTicks);
  });

  it('ne dépasse jamais le spin maximum', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const t = shardTop({ spin: 990 });
    takeShard(l, [t]);
    expect(t.spin).toBe(1000);
  });

  it('n’en donne qu’à un seul, dans l’ordre du tableau', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const a = shardTop({ id: 'a' });
    const b = shardTop({ id: 'b' });
    expect(takeShard(l, [a, b])).toBe('a');
    expect(b.spin).toBe(500);
  });

  it('ignore une toupie hors de portée', () => {
    const l = layout({ shard: { x: 0, y: 0, ttl: 10 } });
    const t = shardTop({ pos: { x: SHARD.radius + 12 + 5, y: 0 } });
    expect(takeShard(l, [t])).toBeNull();
    expect(l.shard).not.toBeNull();
  });

  it('rend null sans éclat', () => {
    expect(takeShard(layout(), [shardTop()])).toBeNull();
  });
});
```

- [ ] **Step 2 : Ajouter le test de ciblage à `src/sim/sim.test.ts`**

```ts
it('un bot plus proche de l’éclat que du joueur va le chercher', () => {
  const run = createRun(createInitialMeta(1), 1);
  const bot = run.bots[0];
  // Éclat à gauche, joueur à droite : le signe de aim.x tranche entre les deux.
  bot.pos = { x: 0, y: 0 };
  run.player.pos = { x: 140, y: 0 };
  run.arena.shard = { x: -60, y: 0, ttl: 30 };
  // Le retarget a lieu au tick dont le numéro vaut 1 modulo 10.
  run.tick = 0;
  tick(run, { steer: null });
  // Il vise la gauche (l'éclat, à 60) et non la droite (le joueur, à 140). Le
  // jitter d'IA ne dépasse jamais ±0,6 rad, donc le signe de aim.x est décidé.
  expect(bot.aim!.x).toBeLessThan(0);
});
```

- [ ] **Step 3 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/terrain.test.ts src/sim/sim.test.ts`
Expected: FAIL — `updateShard` et `takeShard` non exportés.

- [ ] **Step 4 : Implémenter dans `src/sim/terrain.ts`**

Compléter l'import de types : `import type { Top, Vec } from './types';`. Ajouter à la fin :

```ts
/**
 * Fait vivre l'éclat : compte à rebours, apparition, expiration. Retourne le
 * nouvel état du flux — **inchangé** tant qu'aucun éclat n'apparaît, pour que
 * la consommation de tirages reste facile à suivre.
 */
export function updateShard(layout: ArenaLayout, rngState: number): number {
  if (layout.shard) {
    layout.shard.ttl--;
    if (layout.shard.ttl <= 0) {
      layout.shard = null;
      layout.shardTimer = SHARD.everyTicks;
    }
    return rngState;
  }
  layout.shardTimer--;
  if (layout.shardTimer > 0) return rngState;
  const ra = nextRandom(rngState);
  const rr = nextRandom(ra.state);
  const angle = ra.value * TWO_PI;
  const dist = ARENA_RADIUS * (SHARD.minRadius + rr.value * (SHARD.maxRadius - SHARD.minRadius));
  layout.shard = { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, ttl: SHARD.lifeTicks };
  return rr.state;
}

/**
 * Le premier arrivé prend l'éclat. Retourne l'id du preneur, ou `null`.
 * L'ordre du tableau tranche les litiges — le joueur en tête : le cas exact
 * (deux toupies au contact le même tick) est trop rare pour mériter mieux.
 */
export function takeShard(layout: ArenaLayout, tops: Top[]): string | null {
  const shard = layout.shard;
  if (!shard) return null;
  for (const top of tops) {
    if (Math.hypot(top.pos.x - shard.x, top.pos.y - shard.y) > SHARD.radius + top.radius) continue;
    top.spin = Math.min(top.spinMax, top.spin + SHARD.spinGain * top.spinMax);
    layout.shard = null;
    layout.shardTimer = SHARD.everyTicks;
    return top.id;
  }
  return null;
}
```

- [ ] **Step 5 : Brancher dans `src/sim/sim.ts`**

Compléter l'import : `import { buildLayout, takeShard, updateShard, zoneModsAt } from './terrain';`

Remplacer `refreshBotAims` :

```ts
function refreshBotAims(run: RunState): void {
  const shard = run.arena.shard;
  for (const bot of run.bots) {
    const r = nextRandom(run.rngState);
    run.rngState = r.state;
    const jitter = (r.value - 0.5) * BOT_AI.aimJitter;
    // Le bot détourne vers l'éclat quand il en est plus près que du joueur. Deux
    // effets, tous deux voulus : la course devient réelle, et un bot parti le
    // chercher laisse au joueur une fenêtre — qu'il peut lui refuser en le
    // percutant. Le tirage reste à un par bot : le flux ne bouge pas.
    let target: Vec = run.player.pos;
    if (shard) {
      const toShard = Math.hypot(shard.x - bot.pos.x, shard.y - bot.pos.y);
      const toPlayer = Math.hypot(run.player.pos.x - bot.pos.x, run.player.pos.y - bot.pos.y);
      if (toShard < toPlayer) target = shard;
    }
    const angle = Math.atan2(target.y - bot.pos.y, target.x - bot.pos.x) + jitter;
    bot.aim = { x: Math.cos(angle), y: Math.sin(angle) };
  }
}
```

Compléter l'import de types de `sim.ts` avec `Vec`.

Dans `tick`, juste après les `clampToArena` :

```ts
  run.rngState = updateShard(run.arena, run.rngState);
  takeShard(run.arena, [run.player, ...run.bots]);
```

- [ ] **Step 6 : Lancer les tests**

Run: `npm run test`
Expected: PASS, déterminisme compris.

- [ ] **Step 7 : Vérifier le build et l'œil**

Run: `npm run build && npm run dev`
Expected: build vert. L'éclat n'est pas encore dessiné (Task 13) ; se fier au spin qui remonte d'un coup, et aux bots qui s'éloignent parfois du joueur.

- [ ] **Step 8 : Commit**

```bash
git add src/sim/terrain.ts src/sim/terrain.test.ts src/sim/sim.ts src/sim/sim.test.ts
git commit -m "feat(sim): l'éclat de Gyre, à disputer

Apparition périodique dans une couronne de l'arène, 18 % de spin max au premier
qui le touche — joueur ou bot. Les bots le visent quand ils en sont plus près
que du joueur, ce qui rend la course réelle et fait de la répulsion un outil
autant défensif qu'offensif : on prend, ou on empêche de prendre. Le tirage
d'IA reste à un par bot, le flux ne bouge pas."
```

---

## Task 8 : La masse et la répulsion violente

Le dernier réglage de combat, et le plus sensible. Il se joue seul pour être facile à annuler.

**Files:**
- Modify: `src/content/balance.json`
- Modify: `src/sim/types.ts`
- Modify: `src/sim/combat.ts`
- Modify: `src/sim/sim.ts`
- Modify: `src/sim/salle.ts`
- Test: `src/sim/combat.test.ts`, `src/sim/physics.test.ts`, `src/sim/salle.test.ts`

**Interfaces:**
- Consumes: `BOSS.mass` (Task 1).
- Produces: `Top.mass: number` — champ obligatoire, tous les fabricants de `Top` (production **et** tests) doivent le renseigner.

- [ ] **Step 1 : Écrire les tests**

Dans `src/sim/combat.test.ts`, ajouter `mass: 1` au fabricant `top()`, puis :

```ts
describe('resolveCollision — masse', () => {
  it('une toupie lourde encaisse moins d’impulsion', () => {
    const light = top({ pos: { x: 0, y: 0 }, vel: { x: 200, y: 0 } });
    const heavy = top({ pos: { x: 20, y: 0 }, vel: { x: 0, y: 0 }, mass: 3 });
    resolveCollision(light, heavy);
    const ordinary = top({ pos: { x: 0, y: 0 }, vel: { x: 200, y: 0 } });
    const peer = top({ pos: { x: 20, y: 0 }, vel: { x: 0, y: 0 } });
    resolveCollision(ordinary, peer);
    expect(heavy.vel.x).toBeLessThan(peer.vel.x);
  });

  it('la masse de la toupie et celle du talent se composent', () => {
    // Masse (rang 11) doublait déjà la masse ; le champ `mass` la porte
    // désormais aussi, et les deux se multiplient au lieu de se remplacer.
    const a = top({ pos: { x: 0, y: 0 }, vel: { x: 200, y: 0 } });
    const b = top({
      pos: { x: 20, y: 0 }, mass: 2,
      talents: { ...NEUTRAL_TALENTS, mass: 2 },
    });
    resolveCollision(a, b);
    const c = top({ pos: { x: 0, y: 0 }, vel: { x: 200, y: 0 } });
    const d = top({ pos: { x: 20, y: 0 }, mass: 4 });
    resolveCollision(c, d);
    expect(b.vel.x).toBeCloseTo(d.vel.x, 5);
  });
});
```

Dans `src/sim/physics.test.ts`, ajouter `mass: 1` au fabricant `top()`.

Dans `src/sim/salle.test.ts` :

```ts
it('le boss est lourd, le bot ordinaire ne l’est pas', () => {
  expect(makeBot(SALLES_PER_CHAPTER, 0, 0).mass).toBe(BOSS.mass);
  expect(makeBot(1, 0, 0).mass).toBe(1);
});
```

Compléter les imports du fichier avec `BOSS` et `SALLES_PER_CHAPTER` depuis `./config`.

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/combat.test.ts src/sim/salle.test.ts`
Expected: FAIL — `mass` n'existe pas sur `Top`.

- [ ] **Step 3 : Ajouter `mass` à `Top` dans `src/sim/types.ts`**

Après `radius` :

```ts
  /** Masse propre, hors talent. 1 pour toute toupie ordinaire ; le boss est le
   *  seul à en porter davantage aujourd'hui. Se **multiplie** avec
   *  `talents.mass` (Masse, rang 11) au lieu de la remplacer. */
  mass: number;
```

- [ ] **Step 4 : Composer les deux masses dans `src/sim/combat.ts`**

Dans `resolveCollision`, remplacer les deux lignes de masse :

```ts
  const ma = a.mass * a.talents.mass;
  const mb = b.mass * b.talents.mass;
```

- [ ] **Step 5 : Renseigner `mass` chez les fabricants**

`src/sim/sim.ts`, dans `makePlayer`, après `radius` : `mass: 1,`
`src/sim/salle.ts`, dans `makeBot`, après `radius` : `mass: boss ? BOSS.mass : 1,`

- [ ] **Step 6 : Lancer les tests**

Run: `npm run test`
Expected: PASS.

- [ ] **Step 7 : Monter la restitution dans `src/content/balance.json`**

`"restitution": 0.8` devient `"restitution": 1.6` dans le bloc `arena`. `wallRestitution` **ne bouge pas** : le mur reste élastique ordinaire.

- [ ] **Step 8 : Lancer les tests et mesurer**

Run: `npm run test && npm run build && npm run calibrate`
Expected: tout vert. La calibration bouge fortement — attendu, réglée à la Task 14. Noter la valeur.

- [ ] **Step 9 : Vérifier à l'œil — c'est le réglage le plus risqué du jalon**

Run: `npm run dev`
Expected: un choc projette visiblement. **Vérifier explicitement les salles 7 à 9** (trois bots) : si une mêlée devient illisible ou si les toupies se renvoient sans fin, baisser `restitution` par paliers de 0,2 et le noter dans le commit. Le garde-fou est l'amortissement de surcharge de la Task 4, pas la restitution seule.

- [ ] **Step 10 : Commit**

```bash
git add src/content/balance.json src/sim/types.ts src/sim/combat.ts src/sim/combat.test.ts src/sim/sim.ts src/sim/salle.ts src/sim/salle.test.ts src/sim/physics.test.ts
git commit -m "feat(sim): masse propre et répulsion violente

Top.mass sort la masse du seul talent Masse : le boss est lourd (×3) sans
porter une pièce de rang 11, et les deux masses se multiplient. La restitution
passe de 0,8 à 1,6 — le spin est le réservoir d'énergie, un choc en rend plus
qu'il n'en absorbe. L'injection reste bornée par l'amortissement de surcharge
et par la friction."
```

---

## Task 9 : La file de butin dans le méta

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/meta.ts`
- Modify: `src/sim/chest.ts`
- Modify: `src/sim/save.ts`
- Modify: `src/content/balance.json`
- Test: `src/sim/chest.test.ts`, `src/sim/save.test.ts`, `src/sim/meta.test.ts`

**Interfaces:**
- Consumes: `ChestKind` de `./types`.
- Produces:
  - `MetaState.pending: Record<ChestKind, number>`
  - `drawPulls(meta: MetaState, kind: ChestKind, count: number): PieceInstance[]`
  - `grantChest(meta: MetaState, kind: ChestKind): PieceInstance[] | null`
  - `pendingTotal(meta: MetaState): number`
  - `SAVE_SCHEMA = 3`

- [ ] **Step 1 : Écrire les tests**

Dans `src/sim/chest.test.ts` :

```ts
describe('grantChest', () => {
  it('rend null quand la file est vide', () => {
    const meta = createInitialMeta(1);
    expect(grantChest(meta, 'bronze')).toBeNull();
  });

  it('consomme un coffre de la file et rend une pièce', () => {
    const meta = createInitialMeta(1);
    meta.pending.bronze = 2;
    const pulls = grantChest(meta, 'bronze');
    expect(pulls).toHaveLength(1);
    expect(meta.pending.bronze).toBe(1);
  });

  it('ne débite aucune monnaie', () => {
    const meta = createInitialMeta(1);
    meta.pending.bronze = 1;
    meta.credits = 5000;
    grantChest(meta, 'bronze');
    expect(meta.credits).toBe(5000);
  });

  it('tire exactement comme un achat — même flux, même pièce', () => {
    // Le drop et l'achat doivent partager le tirage : sinon deux tables de
    // probabilité vivraient côte à côte et dériveraient.
    const bought = createInitialMeta(42);
    bought.gems = 100000;
    const granted = createInitialMeta(42);
    granted.pending.arene = 1;
    expect(grantChest(granted, 'arene')).toEqual(openChest(bought, 'arene', 1));
  });

  it('fait avancer le même compteur de pity que l’achat', () => {
    // Un joueur qui ne ferait que du butin doit atteindre sa garantie.
    const meta = createInitialMeta(7);
    meta.pending.arene = CHESTS.arene.pityThreshold;
    let best = 0;
    for (let i = 0; i < CHESTS.arene.pityThreshold; i++) {
      const pulls = grantChest(meta, 'arene')!;
      best = Math.max(best, pulls[0].rank);
    }
    expect(best).toBeGreaterThanOrEqual(CHESTS.arene.pityRank);
  });
});
```

Compléter les imports avec `grantChest` depuis `./chest` et `CHESTS` depuis `./config`.

Dans `src/sim/meta.test.ts` :

```ts
it('démarre avec une file de butin vide', () => {
  const meta = createInitialMeta(1);
  expect(meta.pending).toEqual({ bronze: 0, arene: 0, mythique: 0 });
  expect(pendingTotal(meta)).toBe(0);
});

it('pendingTotal somme les trois types', () => {
  const meta = createInitialMeta(1);
  meta.pending.bronze = 3;
  meta.pending.arene = 2;
  meta.pending.mythique = 1;
  expect(pendingTotal(meta)).toBe(6);
});
```

Dans `src/sim/save.test.ts` :

```ts
it('charge une sauvegarde de schéma 2 avec une file de butin vide', () => {
  const meta = createInitialMeta(3);
  meta.credits = 1234;
  const v2 = JSON.stringify({ v: 2, meta: { ...meta, pending: undefined } });
  const loaded = deserializeMeta(v2);
  expect(loaded).not.toBeNull();
  expect(loaded!.credits).toBe(1234);
  expect(loaded!.pending).toEqual({ bronze: 0, arene: 0, mythique: 0 });
});

it('refuse une sauvegarde du schéma courant amputée de sa file de butin', () => {
  // Schéma courant : un champ manquant est un blob corrompu, pas une version
  // antérieure — le compléter en silence masquerait le problème.
  const meta = createInitialMeta(3) as Record<string, unknown>;
  delete meta.pending;
  expect(deserializeMeta(JSON.stringify({ v: SAVE_SCHEMA, meta }))).toBeNull();
});
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/chest.test.ts src/sim/meta.test.ts src/sim/save.test.ts`
Expected: FAIL — `pending`, `grantChest`, `pendingTotal` inexistants.

- [ ] **Step 3 : Ajouter `pending` à `MetaState` dans `src/sim/types.ts`**

```ts
  /** Coffres gagnés et pas encore ouverts, par type. Un compteur plutôt qu'une
   *  file : pas de plafond à inventer, donc jamais de butin jeté. */
  pending: Record<ChestKind, number>;
```

- [ ] **Step 4 : Compléter `src/sim/meta.ts`**

Dans `createInitialMeta`, après `pity` : `pending: { bronze: 0, arene: 0, mythique: 0 },`

Ajouter à la fin du fichier :

```ts
/** Nombre total de coffres en attente — la pastille de l'onglet Coffres. */
export function pendingTotal(meta: MetaState): number {
  return meta.pending.bronze + meta.pending.arene + meta.pending.mythique;
}
```

- [ ] **Step 5 : Extraire le tirage dans `src/sim/chest.ts`**

Remplacer `openChest` et ajouter :

```ts
/** Tire `count` pièces d'un coffre. Ne débite rien et ne vérifie rien : c'est le
 *  tirage nu, partagé par l'achat et par le butin de salle — ainsi le pity et la
 *  table de rangs ne peuvent pas diverger entre les deux. */
export function drawPulls(meta: MetaState, kind: ChestKind, count: number): PieceInstance[] {
  const pulls: PieceInstance[] = [];
  for (let i = 0; i < count; i++) pulls.push(drawOne(meta, kind));
  return pulls;
}

/** Retourne les pièces tirées, ou `null` si la monnaie manque — auquel cas
 *  rien n'est débité et le flux de RNG n'avance pas. */
export function openChest(meta: MetaState, kind: ChestKind, count: 1 | 10): PieceInstance[] | null {
  if (!canOpen(meta, kind, count)) return null;
  const { currency, amount } = chestPrice(kind, count);
  if (currency === 'credits') meta.credits -= amount;
  else meta.gems -= amount;
  return drawPulls(meta, kind, count);
}

/** Ouvre un coffre de la file de butin. `null` si la file est vide pour ce type. */
export function grantChest(meta: MetaState, kind: ChestKind): PieceInstance[] | null {
  if (meta.pending[kind] <= 0) return null;
  meta.pending[kind]--;
  return drawPulls(meta, kind, 1);
}
```

- [ ] **Step 6 : Faire passer la sauvegarde au schéma 3 dans `src/sim/save.ts`**

`export const SAVE_SCHEMA = 3;`

Dans `hydrate`, après `pity` :

```ts
    pending: (partial.pending as MetaState['pending']) ?? base.pending,
```

Dans `isComplete`, ajouter la lecture puis la garde :

```ts
  const pending = m.pending as Record<string, unknown> | null | undefined;
```

```ts
    typeof pending === 'object' && pending !== null &&
    chestKinds.every((k) => typeof pending[k] === 'number') &&
```

**Et une borne à corriger, sans quoi ce jalon arme un piège.** `deserializeMeta` applique la migration d'inventaire sur `env.v < SAVE_SCHEMA` — une comparaison au schéma *courant*. Tant que `SAVE_SCHEMA` valait 2, cela ne visait que les blobs v1. À 3, la migration du schéma 1 tournerait aussi sur des blobs **v2**. Sans dégât aujourd'hui (une pile v2 n'a pas de `count`, donc `migrateInventoryV1` la rend intacte), mais c'est faux et la prochaine migration en souffrirait. Remplacer :

```ts
    // Borne explicite : cette migration est celle du schéma 1 vers le 2, et elle
    // seule. La comparer au schéma courant la ferait tourner sur tout blob plus
    // ancien que le courant — donc sur des blobs v2 depuis que SAVE_SCHEMA vaut 3.
    if (env.v < 2) raw.inventory = migrateInventoryV1(raw.inventory);
```

> Aucune migration nouvelle à écrire : un blob v2 n'a pas de `pending`, et c'est exactement ce que `hydrate` comble déjà depuis `createInitialMeta`. La garde `isComplete` ne s'applique au blob brut que pour le schéma courant.

- [ ] **Step 7 : Effondrer le prix du Bronze dans `src/content/balance.json`**

```json
      "currency": "credits", "price": 250, "price10": 2250,
```

- [ ] **Step 8 : Lancer les tests**

Run: `npm run test && npm run build`
Expected: PASS.

- [ ] **Step 9 : Vérifier la reprise d'une vraie sauvegarde**

Run: `npm run dev`
Expected: la sauvegarde existante (schéma 2) se recharge sans bandeau d'erreur, crédits et inventaire intacts.

- [ ] **Step 10 : Commit**

```bash
git add src/sim/types.ts src/sim/meta.ts src/sim/meta.test.ts src/sim/chest.ts src/sim/chest.test.ts src/sim/save.ts src/sim/save.test.ts src/content/balance.json
git commit -m "feat(sim): la file de butin, et le Bronze à 250 crédits

MetaState.pending compte les coffres gagnés et pas encore ouverts — un compteur
par type plutôt qu'une file, donc aucun plafond à inventer et jamais de butin
jeté. drawPulls est extrait d'openChest pour que le butin et l'achat partagent
exactement le même tirage et le même compteur de pity : un joueur qui ne ferait
que du butin atteint quand même sa garantie.

Le Bronze passe de 2 000 à 250 crédits — le seul coffre en concurrence directe
avec les améliorations, donc le seul dont le prix bloquait la découverte.
Sauvegarde au schéma 3, sans migration : hydrate comble déjà les champs absents."
```

---

## Task 10 : Le butin de salle

**Files:**
- Modify: `src/sim/types.ts`
- Modify: `src/sim/economy.ts`
- Modify: `src/sim/meta.ts`
- Modify: `src/sim/sim.ts`
- Test: `src/sim/economy.test.ts`, `src/sim/meta.test.ts`, `src/sim/sim.test.ts`

**Interfaces:**
- Consumes: `LOOT` (Task 1) ; `MetaState.pending` (Task 9).
- Produces:
  - `RunReward.chests: ChestKind[]`
  - `salleReward(salle: number, boss: boolean, rngState: number): { reward: RunReward; rngState: number }` — la signature change.

- [ ] **Step 1 : Écrire les tests**

Dans `src/sim/economy.test.ts`, les quatre appels existants deviennent (lignes 14-24) :

```ts
  it('revenu = rewardBase × rewardGrowth^(salle−1), boss × bossRewardMult', () => {
    expect(salleReward(1, false, 1).reward.credits).toBeCloseTo(ECON.rewardBase, 5);
    expect(salleReward(5, false, 1).reward.credits).toBeCloseTo(
      ECON.rewardBase * Math.pow(ECON.rewardGrowth, 4),
      5,
    );
    expect(salleReward(10, true, 1).reward.credits).toBeCloseTo(
      ECON.rewardBase * Math.pow(ECON.rewardGrowth, 9) * ECON.bossRewardMult,
      5,
    );
  });

  it('seul le boss donne des gemmes', () => {
    expect(salleReward(9, false, 1).reward.gems).toBe(0);
    expect(salleReward(10, true, 1).reward.gems).toBe(ECON.bossGems);
  });
```

Dans `src/sim/meta.test.ts`, les deux appels existants à `applyReward` (lignes 32-33) prennent `chests: []` — sans quoi la boucle `for (const kind of reward.chests)` lèverait :

```ts
    applyReward(meta, { credits: 120, gems: 0, chests: [] });
    applyReward(meta, { credits: 30, gems: 40, chests: [] });
```

Puis ajouter :

```ts
describe('salleReward — butin', () => {
  it('donne toujours le coffre de base de la salle', () => {
    const { reward } = salleReward(1, false, 1);
    expect(reward.chests[0]).toBe(LOOT.bySalle.chest);
  });

  it('n’ajoute jamais d’extra avant la salle prévue', () => {
    for (let seed = 1; seed <= 300; seed++) {
      for (let salle = 1; salle < LOOT.bySalle.fromSalle; salle++) {
        expect(salleReward(salle, false, seed).reward.chests).toHaveLength(1);
      }
    }
  });

  it('ajoute parfois un extra à partir de la salle prévue', () => {
    const withExtra = Array.from({ length: 300 }, (_, i) =>
      salleReward(LOOT.bySalle.fromSalle, false, i + 1).reward.chests,
    ).filter((c) => c.length === 2);
    expect(withExtra.length).toBeGreaterThan(0);
    expect(withExtra[0][1]).toBe(LOOT.bySalle.extra);
  });

  it('le boss donne toujours son coffre garanti', () => {
    for (let seed = 1; seed <= 50; seed++) {
      expect(salleReward(10, true, seed).reward.chests[0]).toBe(LOOT.boss.chest);
    }
  });

  it('consomme exactement un tirage, extra ou non', () => {
    // Un flux qui n'avancerait pas de la même façon selon la salle rendrait
    // toute mesure de déterminisme illisible.
    const a = salleReward(1, false, 999);
    const b = salleReward(9, false, 999);
    expect(a.rngState).toBe(b.rngState);
    expect(a.rngState).not.toBe(999);
  });
});
```

Compléter les imports avec `LOOT` depuis `./config`.

Dans `src/sim/meta.test.ts` :

```ts
it('le butin d’une récompense rejoint la file', () => {
  const meta = createInitialMeta(1);
  applyReward(meta, { credits: 0, gems: 0, chests: ['bronze', 'arene'] });
  expect(meta.pending.bronze).toBe(1);
  expect(meta.pending.arene).toBe(1);
});
```

Dans `src/sim/sim.test.ts` :

```ts
it('vider une salle rapporte au moins un coffre', () => {
  const run = createRun(createInitialMeta(1), 1);
  let reward = null;
  for (let i = 0; i < 6000 && reward === null; i++) {
    reward = tick(run, { steer: run.bots[0] ? { x: run.bots[0].pos.x - run.player.pos.x, y: run.bots[0].pos.y - run.player.pos.y } : null });
  }
  expect(reward).not.toBeNull();
  expect(reward!.chests.length).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/sim/economy.test.ts src/sim/meta.test.ts src/sim/sim.test.ts`
Expected: FAIL — `salleReward` a deux paramètres et `RunReward` n'a pas de `chests`.

- [ ] **Step 3 : Ajouter `chests` à `RunReward` dans `src/sim/types.ts`**

```ts
export interface RunReward {
  credits: number;
  gems: number;
  /** Coffres lâchés par la salle. Le premier est garanti, le second est l'extra
   *  quand il est tombé. */
  chests: ChestKind[];
}
```

- [ ] **Step 4 : Réécrire `salleReward` dans `src/sim/economy.ts`**

Compléter les imports :

```ts
import { ECON, LOOT, PIECE_EFFECT, PLAYER_BASE } from './config';
import { nextRandom } from './rng';
import type { ChestKind, MetaState, RunReward, Stats } from './types';
```

```ts
/** Ce qu'une salle vidée rapporte, et le nouvel état du flux. Le tirage d'extra
 *  a lieu **de toute façon**, même quand la salle n'y a pas droit : un flux qui
 *  n'avancerait pas de la même façon selon la salle rendrait toute mesure de
 *  déterminisme illisible. */
export function salleReward(
  salle: number,
  boss: boolean,
  rngState: number,
): { reward: RunReward; rngState: number } {
  const base = ECON.rewardBase * Math.pow(ECON.rewardGrowth, salle - 1);
  const rule = boss ? LOOT.boss : LOOT.bySalle;
  const chests: ChestKind[] = [rule.chest];
  const r = nextRandom(rngState);
  const eligible = boss || salle >= LOOT.bySalle.fromSalle;
  if (eligible && r.value < rule.extraChance) chests.push(rule.extra);
  const reward: RunReward = boss
    ? { credits: base * ECON.bossRewardMult, gems: ECON.bossGems, chests }
    : { credits: base, gems: 0, chests };
  return { reward, rngState: r.state };
}
```

- [ ] **Step 5 : Ranger le butin dans `src/sim/meta.ts`**

```ts
export function applyReward(meta: MetaState, reward: RunReward): void {
  meta.credits += reward.credits;
  meta.gems += reward.gems;
  for (const kind of reward.chests) meta.pending[kind]++;
}
```

- [ ] **Step 6 : Adapter l'appelant dans `src/sim/sim.ts`**

```ts
  if (run.bots.length === 0) {
    const boss = run.salle === SALLES_PER_CHAPTER;
    const rolled = salleReward(run.salle, boss, run.rngState);
    run.rngState = rolled.rngState;
    if (boss) run.salle = 1;
    else run.salle++;
    run.player.spin = Math.min(
      run.player.spinMax,
      run.player.spin + run.player.talents.healBetweenSalles * run.player.spinMax,
    );
    startSalle(run);
    return rolled.reward;
  }
```

- [ ] **Step 7 : Lancer les tests**

Run: `npm run test && npm run build`
Expected: PASS.

- [ ] **Step 8 : Vérifier à l'œil**

Run: `npm run dev`
Expected: vider une salle, puis aller à l'onglet Coffres — rien ne s'y voit encore (Task 11), mais l'inspecteur montre `pending` qui monte. À défaut, ajouter temporairement un `console.log` et le retirer avant de committer.

- [ ] **Step 9 : Commit**

```bash
git add src/sim/types.ts src/sim/economy.ts src/sim/economy.test.ts src/sim/meta.ts src/sim/meta.test.ts src/sim/sim.ts src/sim/sim.test.ts
git commit -m "feat(sim): chaque salle vidée lâche un coffre

Bronze aux salles 1-3, Bronze plus 20 % d'Arène aux salles 4-9, Arène garanti
plus 15 % de Mythique au boss : dix coffres au minimum par run complet. Le
tirage d'extra a lieu même quand la salle n'y a pas droit, pour que le flux
avance de la même façon quelle que soit la salle."
```

---

## Task 11 : L'écran Coffres et la pastille

**Files:**
- Modify: `src/ui/ChestScreen.tsx`
- Modify: `src/ui/TabBar.tsx`
- Modify: `src/ui/App.tsx`

**Interfaces:**
- Consumes: `grantChest` (Task 9), `pendingTotal` (Task 9), `MetaState.pending`.
- Produces: rien pour les tâches suivantes.

> Pas de test automatisé : l'UI se vérifie en lançant `npm run dev`, comme aux jalons précédents.

- [ ] **Step 1 : Ajouter la section « Butin » dans `src/ui/ChestScreen.tsx`**

Compléter les imports : `import { canOpen, chestPrice, grantChest, openChest } from '../sim/chest';` et `import { addPiece, pendingTotal } from '../sim/meta';`

Ajouter la fonction d'ouverture, à côté de `open` :

```ts
  const openLoot = (kind: ChestKind) => {
    const drawn = grantChest(metaRef.current, kind);
    if (!drawn) return;
    for (const piece of drawn) addPiece(metaRef.current, piece);
    setPulls(drawn);
    setRevealed(0);
    onChanged();
  };
```

Insérer ce bloc **au-dessus** de `{CHEST_LIST.map(…)}`, juste après le `<h2>Coffres</h2>` — le butin gratuit se voit avant ce qui se vend :

```tsx
      {pendingTotal(meta) > 0 ? (
        <section
          style={{
            border: '1px solid var(--ember)', background: 'var(--panel)', borderRadius: 11,
            padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          <p style={{ margin: 0, font: '500 17px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)' }}>
            Butin — {pendingTotal(meta)} coffre{pendingTotal(meta) > 1 ? 's' : ''}
          </p>
          {CHEST_LIST.filter(({ kind }) => meta.pending[kind] > 0).map(({ kind, name }) => (
            <button
              key={kind}
              onClick={() => openLoot(kind)}
              style={{
                minHeight: 46, borderRadius: 10, cursor: 'pointer',
                border: '1px solid var(--line)', background: 'var(--bg)', color: 'var(--text)',
                font: '500 14px Oswald, ui-sans-serif, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0 12px', gap: 10,
              }}
            >
              <span>{name}</span>
              <span style={{ color: 'var(--ember)', fontVariantNumeric: 'tabular-nums' }}>
                ×{meta.pending[kind]}
              </span>
            </button>
          ))}
        </section>
      ) : null}
```

- [ ] **Step 2 : Ajouter la pastille dans `src/ui/TabBar.tsx`**

```tsx
export function TabBar({ tab, onChange, pending }: { tab: Tab; onChange: (t: Tab) => void; pending: number }) {
```

Dans le `<button>` de chaque onglet, remplacer `{LABELS[t]}` par :

```tsx
          {LABELS[t]}
          {t === 'coffres' && pending > 0 ? (
            <span
              aria-label={`${pending} coffre${pending > 1 ? 's' : ''} à ouvrir`}
              style={{
                marginLeft: 6, padding: '1px 6px', borderRadius: 999, fontSize: 11.5,
                background: 'var(--ember)', color: 'var(--ink)', fontVariantNumeric: 'tabular-nums',
              }}
            >
              {pending}
            </span>
          ) : null}
```

> `TabBar` n'expose toujours ni `role="tablist"` ni `aria-selected` (dette 1.5) ; l'`aria-label` de la pastille évite au moins qu'un lecteur d'écran n'annonce un nombre nu.

- [ ] **Step 3 : Passer le total depuis `src/ui/App.tsx`**

Compléter l'import : `import { pendingTotal } from '../sim/meta';`, puis :

```tsx
      <TabBar tab={tab} onChange={setTab} pending={pendingTotal(metaRef.current)} />
```

- [ ] **Step 4 : Vérifier le build**

Run: `npm run test && npm run build`
Expected: tout vert.

- [ ] **Step 5 : Vérifier à l'œil — c'est le cœur de ce jalon côté joueur**

Run: `npm run dev`
Expected : vider deux ou trois salles, voir la pastille monter sur l'onglet Coffres, ouvrir le butin, voir les pièces révélées une à une, puis la pastille redescendre. Un run complet doit laisser une dizaine de coffres à ouvrir.

- [ ] **Step 6 : Captures**

Run: `npm run shots`
Expected: pas de régression de mise en page sur les trois écrans.

- [ ] **Step 7 : Commit**

```bash
git add src/ui/ChestScreen.tsx src/ui/TabBar.tsx src/ui/App.tsx
git commit -m "feat(ui): la file de butin se voit et s'ouvre

Section « Butin » au-dessus de la boutique — le gratuit se voit avant ce qui se
vend — et pastille de compte sur l'onglet Coffres : le rappel permanent qu'il y
a quelque chose à ouvrir, qui manquait complètement."
```

---

## Task 12 : Le rendu du sol et du bord

**Files:**
- Modify: `src/theme.ts`
- Modify: `src/render/textures.ts`
- Modify: `src/render/arena.ts`
- Test: `src/theme.test.ts`

**Interfaces:**
- Consumes: `RunState.arena` (Task 5), `ZONES` (Task 1).
- Produces: `Textures.zone: Record<ZoneKind, Texture>` dans `src/render/textures.ts`.

- [ ] **Step 1 : Ajouter les teintes de zone à `src/theme.ts`**

Dans `PALETTE`, après `boss` :

```ts
  zoneBoost: 0x6cf2c0,
  zoneSpike: 0xff5a5a,
  zoneSlick: 0x7ab6ff,
```

> Ces trois teintes entrent dans `PALETTE` plutôt que d'être écrites en dur : contrairement aux quatre teintes d'effet listées en dette 1.5, chacune a deux consommateurs dès ce jalon (la texture et le halo de brèche pour `zoneSpike`).

- [ ] **Step 2 : Vérifier que `theme.test.ts` passe sans modification**

`src/theme.test.ts` ne teste que `hex()` et `spinTint()` sur les trois camps ; il n'énumère pas les clés de `PALETTE`. Ajouter des teintes ne le concerne donc pas.

Run: `npx vitest run src/theme.test.ts`
Expected: PASS, fichier inchangé.

- [ ] **Step 3 : Ajouter les textures de zone dans `src/render/textures.ts`**

Ajouter `import type { ZoneKind } from '../sim/config';` puis le champ à `Textures` : `zone: Record<ZoneKind, Texture>;` — dérivé du type de la config plutôt que réécrit, pour qu'un quatrième type de zone ne puisse pas être oublié ici.

Ajouter le générateur, à côté des autres :

```ts
/** Disque de zone : un halo doux au centre, un liseré net au bord. Le liseré est
 * ce qui rend la frontière estimable — sans lui le joueur ne sait pas où il entre. */
function zoneTexture(color: number, dashed: boolean): Texture {
  const size = 256;
  const { el, ctx } = canvas(size);
  const r = size / 2;
  ctx.translate(r, r);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  grad.addColorStop(0, `${hex(color)}44`);
  grad.addColorStop(0.72, `${hex(color)}22`);
  grad.addColorStop(1, `${hex(color)}00`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `${hex(color)}cc`;
  ctx.lineWidth = size * 0.018;
  if (dashed) ctx.setLineDash([size * 0.05, size * 0.04]);
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.93, 0, Math.PI * 2);
  ctx.stroke();
  return Texture.from(el);
}
```

Dans `createTextures()`, ajouter au retour :

```ts
    zone: {
      // Le trait continu se lit comme un sol, le pointillé comme un danger.
      accelerateur: zoneTexture(PALETTE.zoneBoost, false),
      pointes: zoneTexture(PALETTE.zoneSpike, true),
      glisse: zoneTexture(PALETTE.zoneSlick, false),
    },
```

Dans `destroyTextures()`, ajouter : `for (const t of Object.values(tex.zone)) t.destroy(true);`

- [ ] **Step 4 : Dessiner les zones et les brèches dans `src/render/arena.ts`**

Les brèches se lisent depuis `state.arena`, pas depuis la config : l'import de `config` reste `{ ARENA_RADIUS, SALLES_PER_CHAPTER }`, inchangé.

Après la création de `door`, ajouter le conteneur des zones **et** le tracé des brèches — les deux déclarations avant la fonction `draw` qui s'en sert :

```ts
  // Même réserve que la porte (dette 1.5) : retracé par image parce que
  // l'ouverture pulse. Deux arcs par brèche, sans effet mesuré sur la cadence.
  const breachEdges = new Graphics();
  floorLayer.addChild(breachEdges);
```


```ts
  // Les zones vivent sous les toupies et au-dessus du sol. Recréées à chaque
  // changement de gabarit, jamais retracées par image.
  const zoneLayer = new Container();
  floorLayer.addChild(zoneLayer);
  let zoneSignature = '';

  function syncZones(state: RunState): void {
    // Signature du gabarit : tant qu'elle ne change pas, rien à refaire.
    const signature = state.arena.zones.map((z) => `${z.kind}:${z.x.toFixed(1)}:${z.y.toFixed(1)}`).join('|');
    if (signature === zoneSignature) return;
    zoneSignature = signature;
    zoneLayer.removeChildren().forEach((child) => child.destroy());
    for (const zone of state.arena.zones) {
      const sprite = new Sprite(tex.zone[zone.kind]);
      sprite.anchor.set(0.5);
      sprite.width = sprite.height = zone.radius * 2;
      sprite.x = zone.x;
      sprite.y = zone.y;
      zoneLayer.addChild(sprite);
    }
  }
```

Ajouter le tracé des brèches, dans `draw()`, juste après le tracé de `door` :

```ts
      // Les brèches se dessinent comme une ABSENCE : l'anneau s'interrompt, et
      // deux arêtes pulsent de part et d'autre. C'est la seule information dont
      // dépend la survie du joueur : elle doit se lire à un demi-écran.
      const pulse = 0.55 + 0.45 * Math.sin(now / 190);
      breachEdges.clear();
      for (const breach of state.arena.breaches) {
        breachEdges.arc(0, 0, ARENA_RADIUS, breach.angle - breach.halfWidth, breach.angle + breach.halfWidth);
        breachEdges.stroke({ width: 5, color: PALETTE.bg, alpha: 1 });
        breachEdges.arc(0, 0, ARENA_RADIUS * 0.965, breach.angle - breach.halfWidth, breach.angle + breach.halfWidth);
        breachEdges.stroke({ width: 2.5, color: PALETTE.zoneSpike, alpha: 0.35 + 0.5 * pulse });
      }
```

Appeler `syncZones(state)` en tête de `draw()`, juste après `layout()`.

- [ ] **Step 5 : Vérifier**

Run: `npm run test && npm run build && npm run dev`
Expected: tout vert. En jeu, les zones sont visibles dès la salle 1 ; les brèches apparaissent salle 3 et se repèrent sans effort.

- [ ] **Step 6 : Captures**

Run: `npm run shots`

- [ ] **Step 7 : Commit**

```bash
git add src/theme.ts src/render/textures.ts src/render/arena.ts
git commit -m "feat(render): le sol et le bord se lisent

Les zones sont des sprites recréés au changement de gabarit, jamais retracés
par image. Les brèches se dessinent comme une absence — l'anneau s'interrompt,
deux arêtes pulsent : c'est la seule information dont dépend la survie du
joueur, elle doit se lire à un demi-écran."
```

---

## Task 13 : L'éclat et l'éjection à l'écran

**Files:**
- Modify: `src/render/snapshot.ts`
- Modify: `src/render/observer.ts`
- Modify: `src/render/textures.ts`
- Modify: `src/render/arena.ts`
- Test: `src/render/observer.test.ts`

**Interfaces:**
- Consumes: `RunState.ejected` (Task 6), `RunState.arena.shard` (Task 7).
- Produces: `Snapshot.ejected: string[]` ; `DeathEvent.cause: 'spin' | 'ringout'`.

- [ ] **Step 1 : Écrire les tests dans `src/render/observer.test.ts`**

Le fabricant `snapshot()` du fichier (ligne 15) gagne le champ par défaut :

```ts
function snapshot(tops: TopSnapshot[], over: Partial<Snapshot> = {}): Snapshot {
  return { salle: 1, phase: 'fighting', tops, ejected: [], ...over };
}
```

Ajouter ensuite :

```ts
describe('observe — cause de la mort', () => {
  it('qualifie une mort par épuisement', () => {
    const before = snapshot([topSnap({ id: 'bot-1', isPlayer: false, spin: 5 })]);
    const after = snapshot([]);
    expect(observe(before, after).deaths[0].cause).toBe('spin');
  });

  it('qualifie une éjection', () => {
    const before = snapshot([topSnap({ id: 'bot-1', isPlayer: false, spin: 500 })]);
    const after = snapshot([], { ejected: ['bot-1'] });
    expect(observe(before, after).deaths[0].cause).toBe('ringout');
  });
});
```

- [ ] **Step 2 : Lancer les tests pour les voir échouer**

Run: `npx vitest run src/render/observer.test.ts`
Expected: FAIL — `cause` n'existe pas sur `DeathEvent`.

- [ ] **Step 3 : Porter les éjectés dans l'instantané — `src/render/snapshot.ts`**

Dans `Snapshot` :

```ts
export interface Snapshot {
  salle: number;
  phase: Phase;
  tops: TopSnapshot[];
  /** Ids éjectés pendant le tick que cet instantané clôt. */
  ejected: string[];
}
```

Dans `takeSnapshot`, ajouter au retour :

```ts
    // `tick()` réaffecte `run.ejected` à un tableau neuf : cet instantané garde
    // donc bien celui de son propre tick, sans copie.
    ejected: run.ejected,
```

- [ ] **Step 4 : Qualifier la mort — `src/render/observer.ts`**

```ts
export interface DeathEvent {
  id: string;
  x: number;
  y: number;
  isPlayer: boolean;
  /** Ce qui l'a tuée. Une éjection se joue vers l'extérieur, pas sur place. */
  cause: 'spin' | 'ringout';
}
```

Là où les morts sont construites, ajouter :

```ts
      cause: after.ejected.includes(id) ? 'ringout' : 'spin',
```

- [ ] **Step 5 : Ajouter la texture d'éclat dans `src/render/textures.ts`**

Ajouter `shard: Texture;` au champ `Textures`, puis le générateur :

```ts
/** Éclat de Gyre : une étoile à quatre branches dans un halo. Des branches, quand
 * tout le reste de l'arène est fait de disques : il doit se repérer au coin de
 * l'œil sans jamais se confondre avec une toupie. */
function shardTexture(): Texture {
  const size = 128;
  const { el, ctx } = canvas(size);
  const r = size / 2;
  ctx.translate(r, r);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  glow.addColorStop(0, `${hex(PALETTE.ember)}cc`);
  glow.addColorStop(0.45, `${hex(PALETTE.ember)}33`);
  glow.addColorStop(1, `${hex(PALETTE.ember)}00`);
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = hex(PALETTE.text);
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i * Math.PI) / 4;
    const rad = i % 2 === 0 ? r * 0.52 : r * 0.16;
    const x = Math.cos(a) * rad;
    const y = Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  return Texture.from(el);
}
```

Dans `createTextures()`, ajouter au retour : `shard: shardTexture(),`
Dans `destroyTextures()`, ajouter : `tex.shard.destroy(true);`

- [ ] **Step 6 : Dessiner l'éclat et l'éjection dans `src/render/arena.ts`**

Déclarer le sprite à côté de `door` :

```ts
  const shard = new Sprite(tex.shard);
  shard.anchor.set(0.5);
  shard.blendMode = 'add';
  shard.visible = false;
  floorLayer.addChild(shard);
```

Dans `draw()`, après `syncZones(state)` :

```ts
      const live = state.arena.shard;
      shard.visible = live !== null;
      if (live) {
        shard.x = live.x;
        shard.y = live.y;
        const bob = 1 + 0.16 * Math.sin(now / 150);
        shard.width = shard.height = ARENA.shard.radius * 2 * bob;
        shard.rotation = now / 900;
      }
```

Compléter l'import de `config` avec `ARENA`.

Dans `afterTick`, remplacer la boucle des morts :

```ts
      for (const death of events.deaths) {
        const view = views.get(death.id);
        view?.kill();
        if (death.cause === 'ringout') {
          // L'éjection part vers l'extérieur : l'onde s'ouvre plus large et la
          // secousse est franche. C'est le retour qui apprend la règle sans texte.
          effects.wave(death.x, death.y, FEEL.waveRadius * 2.2, PALETTE.zoneSpike);
          const d = Math.hypot(death.x, death.y) || 1;
          effects.hit(death.x, death.y, death.x / d, death.y / d, 1, PALETTE.zoneSpike);
        } else {
          effects.wave(death.x, death.y, FEEL.waveRadius, 0xffd9a0);
        }
      }
```

- [ ] **Step 7 : Vérifier**

Run: `npm run test && npm run build && npm run dev`
Expected: tout vert. L'éclat pulse et tourne au sol ; le prendre remonte le spin. Une éjection projette vers l'extérieur et secoue franchement.

- [ ] **Step 8 : Captures et commit**

```bash
npm run shots
git add src/render/snapshot.ts src/render/observer.ts src/render/observer.test.ts src/render/textures.ts src/render/arena.ts
git commit -m "feat(render): l'éclat pulse, l'éjection projette

L'instantané porte les ids éjectés du tick, ce qui permet à observer.ts de
distinguer une mort par épuisement d'une éjection. L'une garde son onde sur
place, l'autre part vers l'extérieur avec une secousse franche : c'est ce
retour qui apprend la règle du bord sans une ligne de texte."
```

---

## Task 14 : La calibration

La tâche qui fixe les chiffres. **Aucune valeur d'`econ` n'a bougé jusqu'ici** : c'est ici, et seulement ici, qu'on les règle — d'abord le combat, ensuite l'économie, jamais les deux à la fois.

**Files:**
- Modify: `scripts/calibrate.mjs`
- Modify: `src/content/balance.json`

**Interfaces:**
- Consumes: tout ce qui précède.
- Produces: les valeurs finales d'`econ` et, si nécessaire, de `arena`/`boss`.

- [ ] **Step 1 : Étendre `scripts/calibrate.mjs` — la politique qui utilise le terrain**

Ajouter, à côté de `steerTowardNearest` :

```js
/** Politique « terrain » : pousser la cible vers la brèche la plus proche d'elle,
 * et couper vers l'éclat quand on en est le plus près. Sans elle, l'autopilote
 * mesurerait un jeu que personne ne joue. */
function steerWithTerrain(run) {
  const me = run.player.pos;
  const shard = run.arena.shard;
  if (shard) {
    const mine = Math.hypot(shard.x - me.x, shard.y - me.y);
    const contested = run.bots.some((b) => Math.hypot(shard.x - b.pos.x, shard.y - b.pos.y) < mine);
    if (!contested) return { x: shard.x - me.x, y: shard.y - me.y };
  }
  let target = null;
  let best = Infinity;
  for (const bot of run.bots) {
    const d = Math.hypot(bot.pos.x - me.x, bot.pos.y - me.y);
    if (d < best) { best = d; target = bot; }
  }
  if (!target) return null;
  const breach = nearestBreach(run.arena, target.pos);
  if (!breach) return { x: target.pos.x - me.x, y: target.pos.y - me.y };
  // Se placer sur la ligne brèche → cible, du côté opposé à la brèche, pour que
  // le choc pousse la cible dehors.
  const bx = Math.cos(breach.angle) * ARENA_RADIUS;
  const by = Math.sin(breach.angle) * ARENA_RADIUS;
  const dx = target.pos.x - bx;
  const dy = target.pos.y - by;
  const len = Math.hypot(dx, dy) || 1;
  const spot = { x: target.pos.x + (dx / len) * 26, y: target.pos.y + (dy / len) * 26 };
  const toSpot = Math.hypot(spot.x - me.x, spot.y - me.y);
  return toSpot > 18
    ? { x: spot.x - me.x, y: spot.y - me.y }
    : { x: target.pos.x - me.x, y: target.pos.y - me.y };
}

function nearestBreach(arena, pos) {
  const angle = Math.atan2(pos.y, pos.x);
  let best = null;
  let bestGap = Infinity;
  for (const breach of arena.breaches) {
    const raw = angle - breach.angle;
    const gap = Math.abs(Math.atan2(Math.sin(raw), Math.cos(raw)));
    if (gap < bestGap) { bestGap = gap; best = breach; }
  }
  return best;
}
```

Importer `ARENA_RADIUS` depuis `../src/sim/config.ts`.

- [ ] **Step 2 : Réécrire `spend()` et `simulate()`**

Le `spend()` glouton actuel vide les crédits en améliorations à chaque salle : aucun coffre ne serait jamais acheté. Un coffre au plus par salle vidée, puis le glouton :

```js
/** Achats : un coffre Bronze par salle vidée quand il est abordable, puis
 * l'emplacement le moins cher tant qu'il reste des crédits. Un joueur réel
 * arbitre entre les deux ; ce partage est le plus simple qui mesure les deux. */
function spend(meta, { buyChests }) {
  if (buyChests && canOpen(meta, 'bronze', 1)) {
    for (const piece of openChest(meta, 'bronze', 1)) addPiece(meta, piece);
  }
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
```

```js
function simulate(seed, { buyChests, steer }) {
  const meta = createInitialMeta(seed);
  let run = createRun(meta, seed);
  let ticks = 0;
  let runs = 1;
  let salleTicks = 0;
  let ticksToValidate = null;
  let runsToValidate = null;
  let ticksToFirstChest = null;
  const deathsBySalle = new Map();
  const salleDurations = new Map();

  while (ticks < MAX_TICKS && ticksToValidate === null) {
    const salleBefore = run.salle;
    const reward = tick(run, { steer: steer(run) });
    ticks++;
    salleTicks++;
    if (reward) {
      applyRunReward(meta, reward, salleBefore);
      if (!salleDurations.has(salleBefore)) salleDurations.set(salleBefore, []);
      salleDurations.get(salleBefore).push(salleTicks);
      salleTicks = 0;
      // Le butin s'ouvre dès qu'il tombe : c'est ce que fait le joueur.
      for (const kind of ['bronze', 'arene', 'mythique']) {
        while (meta.pending[kind] > 0) {
          for (const piece of grantChest(meta, kind)) addPiece(meta, piece);
          if (ticksToFirstChest === null) ticksToFirstChest = ticks;
        }
      }
      spend(meta, { buyChests });
      // Sans ce recopiage, une amélioration achetée en cours de run ne prendrait
      // effet qu'au run suivant — l'autopilote sous-mesurerait la progression.
      syncRunStats(run, meta);
      if (meta.chapterValidated && ticksToValidate === null) {
        ticksToValidate = ticks;
        runsToValidate = runs;
      }
    }
    if (run.phase === 'dead') {
      deathsBySalle.set(run.salle, (deathsBySalle.get(run.salle) ?? 0) + 1);
      runs++;
      run = createRun(meta, seed + runs);
      salleTicks = 0;
    }
  }

  return {
    hoursToValidate: ticksToValidate === null ? null : (ticksToValidate * TICK_S) / 3600,
    hoursToFirstChest: ticksToFirstChest === null ? null : (ticksToFirstChest * TICK_S) / 3600,
    runs: runsToValidate,
    salleDurations,
    deadliestSalle: [...deathsBySalle.entries()].sort((a, b) => b[1] - a[1])[0] ?? null,
  };
}
```

Importer `grantChest` depuis `../src/sim/chest.ts`.

> **Ce que ce harnais ne mesure pas, et qu'il ne faut pas « corriger ».** Les pièces tirées vont à l'inventaire et ne sont jamais équipées : l'autopilote mesure *quand* les choses arrivent, pas la puissance qu'elles donnent. C'était déjà vrai avant ce jalon. Faire équiper l'autopilote serait un autre travail, et il changerait la signification de toutes les mesures antérieures.

- [ ] **Step 3 : Étendre la sortie**

```js
const results = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: steerWithTerrain }));
// Garde-fou : ne jamais toucher l'écran doit rester très nettement plus lent.
const passive = SEEDS.map((seed) => simulate(seed, { buyChests: true, steer: () => null }));

const fmt = (x) => (x === null ? 'jamais' : x.toFixed(2));
const medianOf = (rs, key) => median(rs.map((r) => r[key]));

console.log('=== Calibration — %d graines ===', SEEDS.length);
console.log('Validation du chapitre 1 : médiane %s h   (cible ~0,25 h)', fmt(medianOf(results, 'hoursToValidate')));
console.log('Premier coffre ouvert    : médiane %s h   (cible < 0,04 h)', fmt(medianOf(results, 'hoursToFirstChest')));
console.log('Runs jusqu’à validation  : médiane %s      (cible ~4)', fmt(medianOf(results, 'runs')));
console.log('Salle la plus meurtrière : %j', results[0].deadliestSalle);
console.log('Durée médiane par salle :');
for (let salle = 1; salle <= SALLES_PER_CHAPTER; salle++) {
  const all = results.flatMap((r) => r.salleDurations.get(salle) ?? []);
  if (all.length === 0) continue;
  console.log('  salle %d : %s s  (n = %d)', salle, fmt(median(all) * TICK_S), all.length);
}
console.log('Garde-fou passivité      : %s h — doit rester très au-dessus de la référence',
  fmt(medianOf(passive, 'hoursToValidate')));
```

- [ ] **Step 4 : Mesurer l'état des lieux**

Run: `npm run calibrate`
Expected: une sortie complète. Noter les valeurs — c'est le point de départ.

- [ ] **Step 5 : Régler le combat, sans toucher à `econ`**

Cibles (spec § 3.1) : salles 1-3 ≈ 12 s, salles 4-9 ≈ 25 s, boss < 60 s, et **la salle 10 reste la plus meurtrière du chapitre**.

Boutons, dans cet ordre de préférence : `arena.breach.halfWidthDeg`, `arena.breach.ejectSpeed`, `boss.mass`, `arena.zones.pointes.spinDrain`. Ne pas toucher à `bot.scaling` ni à `boss.spinMult` — ils portent la forme de la difficulté héritée du jalon 1.5.

Relancer `npm run calibrate` après chaque changement, un bouton à la fois.

- [ ] **Step 6 : Régler l'économie, sans retoucher au combat**

Cibles : ~4 runs, chapitre 1 ≈ 0,25 h, premier coffre ouvert < 0,04 h.

Boutons : `econ.rewardBase`, `econ.rewardGrowth`, `econ.upgradeGrowth`. Le premier coffre est déjà tenu par le drop de la salle 1 — vérifier que la mesure le confirme.

- [ ] **Step 7 : Vérifier le garde-fou de passivité**

La politique « ne jamais toucher l'écran » doit rester **nettement** plus lente que la politique « terrain ». Si l'écart s'est refermé, le pilotage a de nouveau cessé de compter : remonter `CHARGE_BONUS` ou `arena.breach.halfWidthDeg` avant d'aller plus loin.

- [ ] **Step 8 : Lancer l'ensemble**

Run: `npm run test && npm run build`
Expected: tout vert. Si un test d'équilibrage de `config.test.ts` casse, c'est qu'une valeur est sortie de son domaine — corriger la valeur, pas le test.

- [ ] **Step 9 : Vérifier une session complète à la main**

Run: `npm run dev`
Expected : partir d'une sauvegarde vierge (vider `localStorage`), jouer 15 minutes montre en main. Attendus : un coffre ouvert dans les deux premières minutes, le chapitre 1 validé en fin de session, et au moins une fusion possible.

- [ ] **Step 10 : Commit**

```bash
git add scripts/calibrate.mjs src/content/balance.json
git commit -m "chore(balance): calibration du jalon 2.5

Harnais étendu d'une politique d'autopilote qui utilise le terrain — pousser la
cible vers la brèche la plus proche d'elle, couper vers l'éclat quand on en est
le plus près — et de deux sorties : durée médiane par salle, heure du premier
coffre ouvert. La politique passive reste en garde-fou.

Réglage en deux temps, jamais les deux à la fois : le combat d'abord sans
toucher à econ, l'économie ensuite. Valeurs retenues et mesures dans
docs/ameliorations.md."
```

---

## Task 15 : Les documents

**Files:**
- Modify: `docs/game-design.md`
- Modify: `docs/roadmap.md`
- Modify: `docs/ameliorations.md`

- [ ] **Step 1 : `docs/game-design.md`**

- § **Combat & pilotage** : ajouter la répulsion (le plafond de vitesse ne borne que le pilotage), les brèches et la règle d'éjection, les trois types de zone, l'éclat de Gyre.
- § **Structure : chapitres & salles** : une salle porte un gabarit de terrain, avec le calendrier d'introduction (zones dès la salle 1, brèches à partir de la salle 3).
- § **Économie** : le butin de salle devient la **première** source de pièces ; table de drop ; nouveau prix du Bronze.
- § **8 arènes-chapitres** : préciser que le système de terrain est livré, et que les identités par chapitre restent à poser.

- [ ] **Step 2 : `docs/roadmap.md`**

- Insérer le **jalon 2.5** entre 2a et 2b, avec ses critères d'acceptation : un coffre ouvert dans les deux premières minutes ; le chapitre 1 validé en une session de ~15 min ; l'éjection tue le boss ; la politique passive reste très en retrait de la politique « terrain » au harnais.
- Remplacer la calibration « MUR ~2 h » par « chapitre 1 ~15 min, mur au chapitre 3-4 », en **gardant** l'historique des mesures précédentes — c'est ce qui documente pourquoi la valeur a bougé deux fois.
- Ouvrir une section « Dette connue (jalon 2.5) » avec ce qui aura été constaté en chemin.

- [ ] **Step 3 : `docs/ameliorations.md`**

Ajouter une session « 2026-08-26 — deuxième test joueur », avec les trois remarques du joueur, le diagnostic mesuré (le tableau de durées par salle, les 2,08 h / 2,92 h), la cause racine du plafond de vitesse, et les tableaux **avant/après** produits par la Task 14.

- [ ] **Step 4 : Vérifier**

Run: `npm run test && npm run build`
Expected: tout vert.

- [ ] **Step 5 : Commit**

```bash
git add docs/game-design.md docs/roadmap.md docs/ameliorations.md
git commit -m "docs: le jalon 2.5 dans la spec, la roadmap et les retours de jeu

Le terrain et le butin deviennent des règles du jeu. La calibration « MUR ~2 h »
du chapitre 1 est remplacée par « ~15 min, mur au chapitre 3-4 », l'historique
des mesures étant conservé : c'est lui qui documente pourquoi la valeur a bougé."
```

---

## Vérification finale du jalon

- [ ] `npm run test` — tout vert
- [ ] `npm run build` — tout vert
- [ ] `npm run calibrate` — chapitre 1 ≈ 0,25 h, premier coffre < 0,04 h, ~4 runs, salle 10 la plus meurtrière, passivité très en retrait
- [ ] `npm run shots` — aucune régression de mise en page
- [ ] Session à la main depuis une sauvegarde vierge : un coffre ouvert en moins de deux minutes, le chapitre 1 validé en ~15 min, au moins une fusion possible en fin de session
- [ ] Une sauvegarde de schéma 2 se recharge intacte
- [ ] Les salles 7 à 9 (trois bots) restent lisibles malgré la restitution à 1,6
