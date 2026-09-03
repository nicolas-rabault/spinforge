# Jalon 3, lot C1 — les gimmicks des chapitres 2 à 4 — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Le gabarit d'arène apprend de quel chapitre il vient, et les chapitres 2, 3 et 4 s'en servent — mur élastique, piliers mobiles, geysers — sans qu'un seul bit du chapitre 1 ne bouge.

**Architecture:** Une couture unique, `buildLayout(chapter, salle, rng)`. Le gabarit produit porte alors trois choses de plus, toutes neutres au chapitre 1 : la restitution du mur, une liste de piliers, et des zones qui peuvent être de type `geyser`. La simulation reste pure et déterministe ; le rendu reste spectateur ; tous les chiffres vivent dans `src/content/balance.json`.

**Tech Stack:** TypeScript strict, Vitest (imports explicites, pas de globals), PixiJS pour le rendu, Vite.

**Spec:** `docs/superpowers/specs/2026-09-02-jalon-3-lot-c1-gimmicks-design.md`

## Global Constraints

- `src/sim/` est **pur et déterministe** : aucun import de DOM, PixiJS, React, `src/i18n/`, `Date` ni `Math.random`. Le RNG est sérialisé dans l'état ; le temps avance uniquement par `tick()` à pas fixe de 100 ms.
- **Le rendu est un spectateur** : `src/render/` et `src/ui/` lisent l'état, ne le mutent jamais.
- **Tous les chiffres d'équilibrage vivent dans `src/content/balance.json`**, dont `src/sim/config.ts` est la porte unique. Jamais de constante d'équilibrage en dur ailleurs.
- **Pas de code mort**, pas de code « au cas où ».
- Textes joueur en **français ET anglais** ; `fr.ts` fait foi, `en.ts` est `Record<MessageKey, string>`. **Ce lot n'ajoute aucune chaîne joueur** — si une tâche croit en avoir besoin, elle s'arrête et le signale.
- **Aucun nom officiel Beyblade**, nulle part.
- Tests Vitest colocalisés (`src/**/*.test.ts`), imports explicites depuis `vitest`.
- **Le chapitre 1 n'a aucun piège et doit le rester.**
- Ne jamais lancer `git add -A` ni `git add <répertoire>` : lister les fichiers un par un, et relire `git status --short` avant ET après chaque commit.

**Valeurs d'équilibrage introduites par ce lot** (posées en tâche 2, réglées en tâche 8) :
`arena.chapters` dans `balance.json`, indexé par numéro de chapitre en chaîne. Chapitre 1 **absent** — c'est ce qui le rend neutre.

---

## Structure des fichiers

| Fichier | Rôle | Tâches |
|---|---|---|
| `src/sim/terrain.ts` | Gabarit d'arène : zones, brèches, éclat, **+ piliers, + geysers** | 1, 2, 4, 5 |
| `src/sim/terrain.test.ts` | Tests du gabarit, **+ l'épingle de non-régression du chapitre 1** | 1, 2, 4, 5 |
| `src/sim/physics.ts` | Déplacement, rebond de bord, éjection. **Lit la restitution sur le gabarit** | 3, 4 |
| `src/sim/physics.test.ts` | Tests de déplacement | 3, 4 |
| `src/sim/sim.ts` | `startSalle` passe le chapitre ; `tick()` fait vivre les piliers | 1, 4, 5 |
| `src/sim/config.ts` | Porte unique de `balance.json` : type `ChapterArenaDef`, accesseur `chapterArena()` | 2, 5 |
| `src/sim/config.test.ts` | Validation de forme à l'exécution | 2 |
| `src/content/balance.json` | Les chiffres | 2, 8 |
| `src/render/snapshot.ts` | `zoneModsAt` y prend le tick | 5 |
| `src/render/textures.ts` | Textures de zone (`Record<ZoneKind, Texture>`) **+ pilier** | 6 |
| `src/render/arena.ts` | Calques : **+ piliers, + rafraîchissement des geysers par image** | 6 |

---

### Task 1: L'épingle de non-régression du chapitre 1

Le lot entier repose sur « le chapitre 1 ne bouge pas d'un bit ». Cette tâche pose la preuve **avant** de toucher à quoi que ce soit : un test qui fixe les sorties exactes de `buildLayout` sur le code actuel. Toutes les tâches suivantes doivent le laisser vert.

**Files:**
- Test: `src/sim/terrain.test.ts` (ajout d'un `describe` en fin de fichier)

**Interfaces:**
- Consumes: `buildLayout(salle, rngState)` — signature **actuelle**, avant la couture.
- Produces: rien de nouveau. Un filet, pas une interface.

- [ ] **Step 1: Écrire l'épingle**

Ajouter à la fin de `src/sim/terrain.test.ts` :

```ts
/**
 * Épingle de non-régression du chapitre 1 (jalon 3, lot C1).
 *
 * Le chapitre 1, Hangar Rouillé, n'a aucun piège et ne doit jamais en avoir.
 * Le lot C1 fait apprendre le chapitre au gabarit ; « neutre au chapitre 1 »
 * y veut dire bit à bit, pas « à peu près comme avant ». Ces valeurs sont
 * relevées sur `origin/main` à d6991fa, AVANT la couture, et aucune tâche du
 * lot n'a le droit de les faire bouger.
 *
 * La salle 10 tient le cas du repli déterministe (`awayFromSpawn`) : sa
 * dernière zone est exactement (0, -122), qu'aucun tirage ne produit.
 */
describe('chapitre 1 — épingle de non-régression (lot C1)', () => {
  const pins = [
    {
      salle: 1, seed: 3, rngState: -631835667, shardTimer: 72,
      zones: [['accelerateur', -4.242, -22.410789, 34]],
      breaches: [] as number[][],
    },
    {
      salle: 5, seed: 999, rngState: -1327611538, shardTimer: 72,
      zones: [
        ['accelerateur', 90.773443, -17.371635, 34],
        ['pointes', -89.244967, 24.937261, 28],
        ['pointes', 27.862806, -42.312898, 28],
      ],
      breaches: [[2.232355, 0.593412], [5.373948, 0.593412]],
    },
    {
      salle: 10, seed: 221, rngState: -951541434, shardTimer: 72,
      zones: [
        ['accelerateur', -62.301051, -38.964414, 34],
        ['pointes', -3.852297, -75.613901, 28],
        ['pointes', -109.751949, 24.860843, 28],
        ['pointes', 0, -122, 28],
      ],
      breaches: [[0.026905, 0.593412], [3.168497, 0.593412]],
    },
  ];

  for (const pin of pins) {
    it(`salle ${pin.salle} rend exactement le gabarit relevé`, () => {
      const { layout, rngState } = buildLayout(pin.salle, pin.seed);
      expect(rngState).toBe(pin.rngState);
      expect(layout.shardTimer).toBe(pin.shardTimer);
      expect(layout.shard).toBeNull();
      expect(layout.zones.map((z) => [z.kind, +z.x.toFixed(6), +z.y.toFixed(6), z.radius]))
        .toEqual(pin.zones);
      expect(layout.breaches.map((b) => [+b.angle.toFixed(6), +b.halfWidth.toFixed(6)]))
        .toEqual(pin.breaches);
    });
  }
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il PASSE**

Run: `npx vitest run src/sim/terrain.test.ts`
Expected: PASS — les valeurs viennent du code actuel. Un échec ici veut dire que l'arbre n'est pas sur `d6991fa` : s'arrêter et le dire.

- [ ] **Step 3: Vérifier par mutation que l'épingle mord**

Dans `src/sim/terrain.ts`, remplacer temporairement `const PLACEMENT_TRIES = 12;` par `= 11;`.
Run: `npx vitest run src/sim/terrain.test.ts`
Expected: **FAIL** sur au moins une des trois salles. Puis **remettre 12** et revérifier que tout passe.

- [ ] **Step 4: Commit**

```bash
git status --short
git add src/sim/terrain.test.ts
git commit -m "test(terrain): épingler le gabarit du chapitre 1 avant d'y toucher"
git status --short
```

---

### Task 2: La couture — `buildLayout` apprend le chapitre

**Files:**
- Modify: `src/content/balance.json` (bloc `arena.chapters`)
- Modify: `src/sim/config.ts` (type + accesseur)
- Modify: `src/sim/terrain.ts` (signature, champs neutres)
- Modify: `src/sim/sim.ts:42` (l'appelant)
- Test: `src/sim/config.test.ts`, `src/sim/terrain.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `export interface ChapterArenaDef { wallRestitution?: number; pillars?: { count: number; radius: number; speed: number }; geysers?: { count: number; periodTicks: number; activeTicks: number; spinDrain: number } }`
  - `export function chapterArena(chapter: number): ChapterArenaDef` dans `src/sim/config.ts` — rend `{}` pour un chapitre sans entrée.
  - `buildLayout(chapter: number, salle: number, rngState: number)` — l'ordre des paramètres est chapitre puis salle, comme `botTypeFor` et `makeBot`.
  - `ArenaLayout` gagne `wallRestitution: number` et `pillars: Pillar[]`.
  - `export interface Pillar { x: number; y: number; radius: number; vx: number; vy: number }`

- [ ] **Step 1: Ajouter le bloc de chiffres, vide de tout gimmick**

Dans `src/content/balance.json`, à l'intérieur de `"arena"`, après `"layouts"`, ajouter :

```json
    "chapters": {}
```

Le bloc naît vide : cette tâche est de la plomberie, et une plomberie qui change déjà le jeu ne se prouve pas neutre. Les entrées arrivent aux tâches 3, 4 et 5.

- [ ] **Step 2: Typer et exposer le bloc**

Dans `src/sim/config.ts`, ajouter avant `export interface Balance` :

```ts
/** Ce qu'un chapitre change à son arène. Tout est optionnel : un chapitre sans
 *  entrée — le chapitre 1, Hangar Rouillé — ne change rien du tout, et c'est ce
 *  qui rend sa neutralité structurelle plutôt que conventionnelle. */
export interface ChapterArenaDef {
  /** Restitution du bord. Absente = `arena.wallRestitution`. */
  wallRestitution?: number;
  pillars?: { count: number; radius: number; speed: number };
  geysers?: { count: number; periodTicks: number; activeTicks: number; spinDrain: number };
}
```

Dans l'interface `Balance`, à l'intérieur de `arena`, après `layouts: LayoutDef[];` :

```ts
    /** Identité d'arène par chapitre, indexée par numéro en chaîne. Un chapitre
     *  absent joue l'arène de base — c'est le cas du chapitre 1. */
    chapters: Record<string, ChapterArenaDef>;
```

En bas du fichier, après `export const LAYOUTS = ...` :

```ts
const CHAPTER_ARENAS = BALANCE.arena.chapters;
/** L'identité d'arène d'un chapitre. Objet vide pour un chapitre sans entrée :
 *  l'appelant multiplie et boucle sans jamais tester la présence d'un gimmick. */
export function chapterArena(chapter: number): ChapterArenaDef {
  return CHAPTER_ARENAS[String(chapter)] ?? {};
}
```

- [ ] **Step 3: Écrire le test de forme**

Dans `src/sim/config.test.ts`, ajouter dans le `describe` qui couvre l'arène :

```ts
  it("le chapitre 1 n'a aucune identité d'arène propre", () => {
    // Hangar Rouillé n'a aucun piège (docs/game-design.md § 8) et c'est le
    // contrôle exact de toute mesure du lot C1.
    expect(chapterArena(1)).toEqual({});
  });

  it("chaque identité d'arène déclarée est complète et bornée", () => {
    for (const [n, def] of Object.entries(BALANCE.arena.chapters)) {
      expect(Number(n), `chapitre ${n}`).toBeGreaterThan(1);
      expect(Number(n), `chapitre ${n}`).toBeLessThanOrEqual(MAX_CHAPTER);
      if (def.wallRestitution !== undefined) {
        expect(def.wallRestitution, `chapitre ${n}`).toBeGreaterThan(0);
      }
      if (def.pillars) {
        expect(def.pillars.count, `chapitre ${n}`).toBeGreaterThan(0);
        expect(def.pillars.radius, `chapitre ${n}`).toBeGreaterThan(0);
        expect(def.pillars.speed, `chapitre ${n}`).toBeGreaterThan(0);
        // Un pilier doit tenir dans l'anneau en laissant le spawn dégagé, comme
        // une zone (voir « le repli de placement reste géométriquement possible »).
        const d = Math.hypot(PLAYER_SPAWN.x, PLAYER_SPAWN.y);
        expect(d + ARENA.radius - def.pillars.radius, `chapitre ${n}`)
          .toBeGreaterThanOrEqual(def.pillars.radius + ARENA.spawnClearance);
      }
      if (def.geysers) {
        expect(def.geysers.count, `chapitre ${n}`).toBeGreaterThan(0);
        expect(def.geysers.activeTicks, `chapitre ${n}`).toBeGreaterThan(0);
        // Une fenêtre plus longue que la période ferait un geyser toujours allumé,
        // c'est-à-dire une zone de pointes déguisée.
        expect(def.geysers.periodTicks, `chapitre ${n}`)
          .toBeGreaterThan(def.geysers.activeTicks);
        expect(def.geysers.spinDrain, `chapitre ${n}`).toBeGreaterThan(0);
      }
    }
  });
```

Ajouter `chapterArena` et `MAX_CHAPTER` aux imports de `./config` en tête de `config.test.ts` s'ils n'y sont pas.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/sim/config.test.ts`
Expected: PASS (le bloc est vide, la boucle ne tourne pas ; `chapterArena(1)` rend `{}`).

- [ ] **Step 5: Faire apprendre le chapitre au gabarit**

Dans `src/sim/terrain.ts` :

Ajouter après l'interface `Breach` :

```ts
/** Obstacle circulaire qui dérive dans l'arène et rebondit sur son bord. Ne fait
 *  aucun dégât : il repousse. La menace est indirecte — couper une ligne
 *  d'attaque, pousser vers une brèche. */
export interface Pillar {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
}
```

Dans `ArenaLayout`, ajouter :

```ts
  /** Restitution du bord pour ce chapitre. Vaut `ARENA.wallRestitution` partout
   *  où le chapitre n'en déclare pas d'autre. */
  wallRestitution: number;
  /** Piliers mobiles. Vide hors chapitre à piliers. */
  pillars: Pillar[];
```

Changer la signature et le retour de `buildLayout` :

```ts
export function buildLayout(
  chapter: number,
  salle: number,
  rngState: number,
): { layout: ArenaLayout; rngState: number } {
  const def = chapterArena(chapter);
  let rng = rngState;
  // ... corps inchangé ...
  return {
    layout: {
      zones,
      breaches,
      shard: null,
      shardTimer: SHARD.everyTicks,
      wallRestitution: def.wallRestitution ?? ARENA.wallRestitution,
      pillars: [],
    },
    rngState: rng,
  };
}
```

Ajouter `chapterArena` à l'import depuis `./config`.

**Le corps entre les deux ne change pas d'une ligne** : mêmes tirages, dans le même ordre.

- [ ] **Step 6: Mettre l'appelant à jour**

Dans `src/sim/sim.ts`, ligne 42 :

```ts
  const built = buildLayout(run.chapter, run.salle, spawned.rngState);
```

- [ ] **Step 7: Mettre les tests existants à jour**

Dans `src/sim/terrain.test.ts` :
- l'auxiliaire `layout()` gagne les deux champs neutres :

```ts
function layout(over: Partial<ArenaLayout> = {}): ArenaLayout {
  return {
    zones: [], breaches: [], shard: null, shardTimer: 0,
    wallRestitution: ARENA.wallRestitution, pillars: [],
    ...over,
  };
}
```

- le littéral du `describe('inBreach')` gagne les mêmes deux champs ;
- **tous** les appels `buildLayout(x, y)` deviennent `buildLayout(1, x, y)` — chapitre 1, pour que les tests existants continuent de décrire exactement ce qu'ils décrivaient. L'épingle de la tâche 1 comprise.

- [ ] **Step 8: Lancer toute la suite**

Run: `npm run test`
Expected: 490 tests PASS. **L'épingle de la tâche 1 doit être verte** — c'est la preuve que la couture est neutre.

- [ ] **Step 9: Poser le test du repli neutre**

Dans `src/sim/terrain.test.ts` :

```ts
  it('un chapitre sans identité propre garde la restitution de l’arène', () => {
    expect(buildLayout(1, 1, 7).layout.wallRestitution).toBe(ARENA.wallRestitution);
    expect(buildLayout(1, 1, 7).layout.pillars).toEqual([]);
  });
```

**Ce test ne peut pas prouver que la couture est branchée** — aucun chapitre ne déclare encore quoi que ce soit, donc `chapterArena(chapter)` et `chapterArena(1)` rendent la même chose. C'est attendu : cette tâche est de la plomberie, et la preuve de branchement arrive en tâche 3, dès qu'un chapitre déclare une valeur différente. Ne pas chercher à fabriquer un rouge ici — exiger la mutation d'un mécanisme qui n'existe pas encore pousse à truquer la condition jusqu'à l'obtenir.

Run: `npx vitest run src/sim/terrain.test.ts` → PASS.

- [ ] **Step 10: Commit**

```bash
git status --short
git add src/content/balance.json src/sim/config.ts src/sim/config.test.ts src/sim/terrain.ts src/sim/terrain.test.ts src/sim/sim.ts
git commit -m "feat(terrain): le gabarit d'arène apprend de quel chapitre il vient"
git status --short
```

---

### Task 3: Chapitre 2 — Dojo Néon, les murs élastiques

**Files:**
- Modify: `src/sim/physics.ts` (`moveAndBounce` lit la restitution sur le gabarit)
- Modify: `src/content/balance.json` (entrée `"2"`)
- Test: `src/sim/physics.test.ts`, `src/sim/terrain.test.ts`

**Interfaces:**
- Consumes: `ArenaLayout.wallRestitution` (tâche 2).
- Produces: rien de nouveau. `moveAndBounce(top, layout)` garde sa signature.

- [ ] **Step 1: Écrire les deux tests qui échouent**

Dans `src/sim/physics.test.ts` :

```ts
  it('rebondit avec la restitution du gabarit, pas avec celle de l’arène', () => {
    const top = makeTop({ pos: { x: ARENA_RADIUS - 12, y: 0 }, vel: { x: 200, y: 0 } });
    const elastique = { ...bareLayout(), wallRestitution: 1.5 };
    expect(moveAndBounce(top, elastique)).toBe(false);
    // v' = v - (1 + r) × v_sortante = 200 - 2,5 × 200 = -300
    expect(top.vel.x).toBeCloseTo(-300, 6);
  });

  it('un mur élastique ne déplace pas le seuil d’éjection', () => {
    // L'éjection se décide AVANT le rebond : à vitesse sortante sous le seuil,
    // aucune restitution ne peut éjecter ; au-dessus, toutes éjectent.
    const dans = { ...bareLayout(), breaches: [{ angle: 0, halfWidth: 0.5 }] };
    const sous = makeTop({
      pos: { x: ARENA_RADIUS - 12, y: 0 },
      vel: { x: BREACH.ejectSpeed - 1, y: 0 },
    });
    expect(moveAndBounce(sous, { ...dans, wallRestitution: 9 })).toBe(false);

    const au = makeTop({
      pos: { x: ARENA_RADIUS - 12, y: 0 },
      vel: { x: BREACH.ejectSpeed + 1, y: 0 },
    });
    expect(moveAndBounce(au, { ...dans, wallRestitution: 0.01 })).toBe(true);
  });
```

Si `src/sim/physics.test.ts` n'a pas déjà d'auxiliaires `makeTop` et `bareLayout`, les écrire en tête du fichier sur le modèle de ceux de `terrain.test.ts` (un `Top` neutre avec `NEUTRAL_TALENTS`, un `ArenaLayout` neutre avec `wallRestitution: ARENA.wallRestitution` et `pillars: []`). Réutiliser ceux du fichier s'ils existent, sous leur nom réel.

Imports nécessaires dans `src/sim/physics.test.ts` : `ARENA`, `ARENA_RADIUS` et `BREACH` depuis `./config`.

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/sim/physics.test.ts`
Expected: **FAIL** sur le premier test — `moveAndBounce` lit encore la constante de module `WALL_RESTITUTION` (0,8), donc `top.vel.x` vaut −160 et non −300.

- [ ] **Step 3: Brancher la restitution du gabarit**

Dans `src/sim/physics.ts`, dans `moveAndBounce`, remplacer :

```ts
  if (out > 0) {
    top.vel.x -= (1 + WALL_RESTITUTION) * out * nx;
    top.vel.y -= (1 + WALL_RESTITUTION) * out * ny;
  }
```

par :

```ts
  if (out > 0) {
    // La restitution vient du GABARIT et non d'une constante de module : c'est
    // ce qui donne au Dojo Néon ses murs élastiques sans toucher aux autres
    // chapitres. Au-dessus de 1, le bord rend plus qu'il ne prend et cesse
    // d'être un refuge. L'éjection, elle, s'est décidée plus haut : un mur
    // élastique ne déplace pas le seuil de brèche.
    top.vel.x -= (1 + layout.wallRestitution) * out * nx;
    top.vel.y -= (1 + layout.wallRestitution) * out * ny;
  }
```

Retirer `WALL_RESTITUTION` de l'import de `./config` **s'il n'a plus aucun usage dans le fichier**. Si l'export `WALL_RESTITUTION` de `config.ts` n'a plus aucun consommateur dans tout `src/`, le supprimer : pas de code mort.

- [ ] **Step 4: Lancer, vérifier que ça passe**

Run: `npx vitest run src/sim/physics.test.ts`
Expected: PASS.

- [ ] **Step 5: Donner son mur au chapitre 2**

Dans `src/content/balance.json`, `arena.chapters` :

```json
    "chapters": {
      "2": { "wallRestitution": 1.5 }
    }
```

1,5 est une **valeur de départ**, pas une valeur retenue : elle sera balayée en tâche 8.

- [ ] **Step 6: Prouver le branchement par chapitre**

Dans `src/sim/terrain.test.ts`, ajouter :

```ts
  it('le Dojo Néon a des murs plus élastiques que le Hangar Rouillé', () => {
    expect(buildLayout(2, 1, 7).layout.wallRestitution)
      .toBeGreaterThan(buildLayout(1, 1, 7).layout.wallRestitution);
  });
```

Run: `npm run test` → PASS, **épingle du chapitre 1 comprise**.

- [ ] **Step 7: Vérifier par mutation**

Dans `terrain.ts`, remplacer `def.wallRestitution ?? ARENA.wallRestitution` par `ARENA.wallRestitution`.
Run: `npx vitest run src/sim/terrain.test.ts`
Expected: **FAIL** sur « le Dojo Néon a des murs plus élastiques ». Remettre.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/sim/physics.ts src/sim/physics.test.ts src/sim/terrain.ts src/sim/terrain.test.ts src/content/balance.json src/sim/config.ts
git commit -m "feat(chapitre 2): au Dojo Néon, le bord renvoie plus fort qu'il ne reçoit"
git status --short
```

(Ne mettre `src/sim/config.ts` et `src/sim/terrain.ts` dans le `git add` que s'ils ont réellement changé — vérifier sur le `git status --short` d'avant.)

---

### Task 4: Chapitre 3 — Marché Souterrain, les piliers mobiles

**Files:**
- Modify: `src/sim/terrain.ts` (placement, `updatePillars`, `bouncePillars`)
- Modify: `src/sim/sim.ts` (ordre du tick)
- Modify: `src/content/balance.json` (entrée `"3"`)
- Test: `src/sim/terrain.test.ts`, `src/sim/sim.test.ts`

**Interfaces:**
- Consumes: `Pillar`, `ArenaLayout.pillars`, `chapterArena` (tâche 2) ; `RESTITUTION` de `config.ts`.
- Produces:
  - `export function updatePillars(layout: ArenaLayout): void` — avance les piliers d'un tick, les fait rebondir sur le bord. Aucun RNG.
  - `export function bouncePillars(layout: ArenaLayout, top: Top): void` — replace `top` au contact et réfléchit sa vitesse. Ne touche jamais au spin.

- [ ] **Step 1: Écrire les tests de placement**

Dans `src/sim/terrain.test.ts` :

```ts
describe('piliers', () => {
  it("le Hangar Rouillé n'a aucun pilier", () => {
    for (let salle = 1; salle <= 10; salle++) {
      expect(buildLayout(1, salle, 42).layout.pillars, `salle ${salle}`).toEqual([]);
    }
  });

  it('le Marché Souterrain en pose le nombre déclaré, dégagés du spawn', () => {
    const def = chapterArena(3).pillars!;
    for (const seed of [1, 77, 4242, 99991]) {
      const { layout } = buildLayout(3, 5, seed);
      expect(layout.pillars).toHaveLength(def.count);
      for (const p of layout.pillars) {
        expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(ARENA_RADIUS - p.radius + 1e-9);
        expect(Math.hypot(p.x - PLAYER_SPAWN.x, p.y - PLAYER_SPAWN.y))
          .toBeGreaterThanOrEqual(p.radius + ARENA.spawnClearance - 1e-9);
        expect(Math.hypot(p.vx, p.vy)).toBeCloseTo(def.speed, 6);
      }
    }
  });
});
```

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/sim/terrain.test.ts`
Expected: **FAIL** — `pillars` est toujours `[]` au chapitre 3, et `chapterArena(3).pillars` est `undefined`.

- [ ] **Step 3: Donner ses piliers au chapitre 3**

Dans `src/content/balance.json`, `arena.chapters` :

```json
      "3": { "pillars": { "count": 2, "radius": 16, "speed": 34 } }
```

Valeurs de départ, balayées en tâche 8.

- [ ] **Step 4: Poser les piliers dans `buildLayout`**

Dans `src/sim/terrain.ts`, **après** le bloc des brèches et **avant** le `return`, ajouter :

```ts
  // Les piliers arrivent APRÈS les brèches dans le flux : au chapitre 1 la
  // boucle ne tourne pas, aucun tirage n'est consommé, et le gabarit du
  // Hangar Rouillé reste bit à bit celui d'avant ce lot.
  const pillars: Pillar[] = [];
  if (def.pillars) {
    const { count, radius, speed } = def.pillars;
    const span = ARENA_RADIUS - radius;
    for (let i = 0; i < count; i++) {
      const drawPos = (): { x: number; y: number } => {
        const ra = nextRandom(rng);
        rng = ra.state;
        const rr = nextRandom(rng);
        rng = rr.state;
        const angle = ra.value * TWO_PI;
        const dist = Math.sqrt(rr.value) * span;
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist };
      };
      const clear = (p: { x: number; y: number }): boolean =>
        Math.hypot(p.x - PLAYER_SPAWN.x, p.y - PLAYER_SPAWN.y) >= radius + ARENA.spawnClearance;
      let pos = drawPos();
      for (let t = 1; t < PLACEMENT_TRIES && !clear(pos); t++) pos = drawPos();
      // Même repli déterministe que les zones : la garantie « jamais sur le point
      // d'apparition » doit être absolue, pas probable.
      if (!clear(pos)) pos = spotAwayFromSpawn(radius);
      const rc = nextRandom(rng);
      rng = rc.state;
      const cap = rc.value * TWO_PI;
      pillars.push({ x: pos.x, y: pos.y, radius, vx: Math.cos(cap) * speed, vy: Math.sin(cap) * speed });
    }
  }
```

et remplacer `pillars: []` par `pillars` dans le `return`.

**`spotAwayFromSpawn` est une extraction, pas une nouvelle formule.** `awayFromSpawn` mêle aujourd'hui la géométrie du repli et la construction d'une `Zone` ; un pilier a besoin de la première sans la seconde. Extraire :

```ts
/** Le point de repli : diamétralement opposé au point d'apparition, à la limite
 *  intérieure de l'anneau. Une seule formule, deux appelants — les zones et les
 *  piliers. */
function spotAwayFromSpawn(radius: number): { x: number; y: number } {
  const span = ARENA_RADIUS - radius;
  const d = Math.hypot(PLAYER_SPAWN.x, PLAYER_SPAWN.y) || 1;
  const k = Math.min(span, d + radius + ARENA.spawnClearance) / d;
  return { x: -PLAYER_SPAWN.x * k, y: -PLAYER_SPAWN.y * k };
}

function awayFromSpawn(kind: ZoneKind, radius: number): Zone {
  return { kind, ...spotAwayFromSpawn(radius), radius, phase: 0 };
}
```

`phase: 0` arrive avec la tâche 5 ; jusque-là, `awayFromSpawn` ne le pose pas. **L'épingle de la tâche 1 vérifie que cette extraction ne déplace pas le repli d'un flottant** : la salle 10 de la graine 221 y passe exactement par ce chemin, et sa dernière zone doit rester `(0, -122)`.

- [ ] **Step 5: Lancer, vérifier que ça passe**

Run: `npx vitest run src/sim/terrain.test.ts`
Expected: PASS, **épingle du chapitre 1 comprise**.

- [ ] **Step 6: Écrire les tests de mouvement et de choc**

Dans `src/sim/terrain.test.ts`, dans le `describe('piliers')` :

```ts
  it('un pilier avance à sa vitesse et ne sort jamais de l’arène', () => {
    const l = layout({ pillars: [{ x: 0, y: 0, radius: 16, vx: 300, vy: 0 }] });
    for (let i = 0; i < 200; i++) {
      updatePillars(l);
      expect(Math.hypot(l.pillars[0].x, l.pillars[0].y))
        .toBeLessThanOrEqual(ARENA_RADIUS - l.pillars[0].radius + 1e-9);
    }
  });

  it('un pilier garde sa vitesse en rebondissant sur le bord', () => {
    const l = layout({ pillars: [{ x: 0, y: 0, radius: 16, vx: 300, vy: 0 }] });
    for (let i = 0; i < 200; i++) updatePillars(l);
    expect(Math.hypot(l.pillars[0].vx, l.pillars[0].vy)).toBeCloseTo(300, 6);
  });

  it('un pilier repousse une toupie sans jamais lui retirer de spin', () => {
    const l = layout({ pillars: [{ x: 0, y: 0, radius: 16, vx: 0, vy: 0 }] });
    const top = makeTop({ pos: { x: 8, y: 0 }, vel: { x: -100, y: 0 } });
    const spinAvant = top.spin;
    bouncePillars(l, top);
    expect(top.spin).toBe(spinAvant);
    expect(Math.hypot(top.pos.x, top.pos.y)).toBeCloseTo(16 + top.radius, 6);
    expect(top.vel.x).toBeGreaterThan(0);
  });

  it('un pilier repousse un bot comme le joueur', () => {
    const l = layout({ pillars: [{ x: 0, y: 0, radius: 16, vx: 0, vy: 0 }] });
    const bot = makeTop({ isPlayer: false, pos: { x: 8, y: 0 }, vel: { x: -100, y: 0 } });
    bouncePillars(l, bot);
    expect(bot.vel.x).toBeGreaterThan(0);
  });
```

`makeTop` : l'auxiliaire de construction de `Top` du fichier. S'il n'existe pas, l'écrire en tête sur le modèle de celui utilisé par les tests de `takeShard`.

- [ ] **Step 7: Lancer, vérifier l'échec**

Run: `npx vitest run src/sim/terrain.test.ts`
Expected: **FAIL** — `updatePillars` et `bouncePillars` n'existent pas.

- [ ] **Step 8: Écrire les deux fonctions**

Dans `src/sim/terrain.ts` :

```ts
/**
 * Fait dériver les piliers d'un tick. Aucun RNG : leur trajectoire est décidée
 * une fois pour toutes au gabarit, et se déroule ensuite. Le rebond de bord est
 * parfait (restitution 1) — un pilier qui perdrait de l'énergie finirait
 * immobile et cesserait d'être mobile.
 */
export function updatePillars(layout: ArenaLayout): void {
  for (const p of layout.pillars) {
    p.x += p.vx * TICK_S;
    p.y += p.vy * TICK_S;
    const d = Math.hypot(p.x, p.y);
    const limit = ARENA_RADIUS - p.radius;
    if (d <= limit || d === 0) continue;
    const nx = p.x / d;
    const ny = p.y / d;
    p.x = nx * limit;
    p.y = ny * limit;
    const out = p.vx * nx + p.vy * ny;
    if (out > 0) {
      p.vx -= 2 * out * nx;
      p.vy -= 2 * out * ny;
    }
  }
}

/**
 * Repousse une toupie hors des piliers qu'elle recouvre. Un pilier est de masse
 * infinie : il ne bouge pas, et il ne retire JAMAIS de spin. La menace d'un
 * pilier est indirecte — il coupe une ligne d'attaque et pousse vers une
 * brèche. Ajouter des dégâts aurait donné deux axes à équilibrer là où un
 * suffit.
 *
 * La restitution est celle du monde (`RESTITUTION`) : un choc rend plus
 * d'énergie qu'il n'en absorbe, ici comme entre deux toupies. C'est ce qui rend
 * un pilier réellement dangereux près d'un bord percé.
 */
export function bouncePillars(layout: ArenaLayout, top: Top): void {
  for (const p of layout.pillars) {
    const dx = top.pos.x - p.x;
    const dy = top.pos.y - p.y;
    const d = Math.hypot(dx, dy);
    const touch = p.radius + top.radius;
    if (d >= touch) continue;
    // Centres exactement confondus : direction arbitraire mais déterministe.
    const nx = d === 0 ? 1 : dx / d;
    const ny = d === 0 ? 0 : dy / d;
    top.pos.x = p.x + nx * touch;
    top.pos.y = p.y + ny * touch;
    const into = top.vel.x * nx + top.vel.y * ny;
    if (into < 0) {
      top.vel.x -= (1 + RESTITUTION) * into * nx;
      top.vel.y -= (1 + RESTITUTION) * into * ny;
    }
  }
}
```

Ajouter `RESTITUTION` et `TICK_S` à l'import depuis `./config`, et `Top` à l'import de type depuis `./types`.

- [ ] **Step 9: Lancer, vérifier que ça passe**

Run: `npx vitest run src/sim/terrain.test.ts`
Expected: PASS.

- [ ] **Step 10: Brancher dans le tick**

Dans `src/sim/sim.ts`, dans `tick()`, juste après `run.ejected = [];` et **avant** `refreshBotAims` :

```ts
  // Les piliers avancent AVANT les toupies : une toupie est ainsi repoussée par
  // la position que le pilier occupe à la fin du tick, celle que le joueur voit.
  updatePillars(run.arena);
```

puis, après la boucle `for (const bot of run.bots) moveTop(run, bot);` et **avant** la première ligne de `resolveCollision` :

```ts
  // Après le déplacement — donc après l'éjection, qui ne se décide qu'en un
  // seul endroit — et avant les collisions entre toupies. Un pilier qui pousse
  // vers une brèche éjecte au tick SUIVANT, quand `moveAndBounce` verra la
  // vitesse sortante : c'est déjà ainsi qu'une toupie poussée par une autre est
  // éjectée, et ça évite un second site d'éjection.
  bouncePillars(run.arena, run.player);
  for (const bot of run.bots) bouncePillars(run.arena, bot);
```

Ajouter `bouncePillars` et `updatePillars` à l'import depuis `./terrain`.

- [ ] **Step 11: Vérifier le déterminisme de bout en bout**

Dans `src/sim/sim.test.ts`, ajouter au `describe` de déterminisme :

```ts
  it('reste déterministe dans les quatre chapitres', () => {
    for (const chapter of [1, 2, 3, 4]) {
      const a = createInitialMeta(4242);
      const b = createInitialMeta(4242);
      const ra = startRun(a, chapter, 777);
      const rb = startRun(b, chapter, 777);
      for (let i = 0; i < 600; i++) {
        tick(ra, { steer: { x: 1, y: 0 } });
        tick(rb, { steer: { x: 1, y: 0 } });
      }
      expect(JSON.stringify(rb), `chapitre ${chapter}`).toBe(JSON.stringify(ra));
    }
  });
```

Adapter les noms d'import (`createInitialMeta`, `startRun`, `tick`) à ceux réellement utilisés dans `sim.test.ts`. Si le chapitre n'est pas jouable sans `bestChapter`, poser `a.bestChapter = b.bestChapter = 3;` avant `startRun` — `startRun` borne le chapitre à `maxPlayableChapter`.

Run: `npm run test`
Expected: PASS, épingle comprise.

- [ ] **Step 12: Vérifier par mutation**

Dans `bouncePillars`, remplacer `if (into < 0)` par `if (false)`.
Run: `npx vitest run src/sim/terrain.test.ts`
Expected: **FAIL** sur « un pilier repousse une toupie » et « repousse un bot comme le joueur ». Remettre.

Puis, dans `bouncePillars`, ajouter `top.spin -= 1;` en fin de boucle.
Expected: **FAIL** sur « sans jamais lui retirer de spin ». Retirer.

- [ ] **Step 13: Commit**

```bash
git status --short
git add src/sim/terrain.ts src/sim/terrain.test.ts src/sim/sim.ts src/sim/sim.test.ts src/content/balance.json
git commit -m "feat(chapitre 3): au Marché Souterrain, des piliers dérivent et repoussent"
git status --short
```

---

### Task 5: Chapitre 4 — Cratère de Magma, les geysers

**Files:**
- Modify: `src/sim/config.ts` (`ZoneKind` gagne `'geyser'`)
- Modify: `src/content/balance.json` (zone `geyser`, entrée `"4"`)
- Modify: `src/sim/terrain.ts` (phase, `zoneModsAt` prend le tick)
- Modify: `src/sim/sim.ts`, `src/render/snapshot.ts` (les appelants)
- Test: `src/sim/terrain.test.ts`

**Interfaces:**
- Consumes: `chapterArena` (tâche 2).
- Produces:
  - `ZoneKind` inclut `'geyser'`.
  - `Zone` gagne `phase: number` — décalage en ticks, 0 pour toute zone non geyser.
  - `zoneModsAt(layout: ArenaLayout, pos: Vec, tick: number): ZoneMods`
  - `export function geyserActive(layout: ArenaLayout, zone: Zone, tick: number): boolean`

- [ ] **Step 1: Écrire les tests qui échouent**

Dans `src/sim/terrain.test.ts` :

```ts
describe('geysers', () => {
  it('un geyser éteint est exactement neutre', () => {
    const l = layout({
      zones: [{ kind: 'geyser', x: 0, y: 0, radius: ZONES.geyser.radius, phase: 0 }],
      geysers: chapterArena(4).geysers,
    });
    const { periodTicks, activeTicks } = chapterArena(4).geysers!;
    // Un tick hors de la fenêtre d'allumage.
    expect(zoneModsAt(l, { x: 0, y: 0 }, activeTicks)).toBe(NEUTRAL_ZONE);
    expect(zoneModsAt(l, { x: 0, y: 0 }, periodTicks - 1)).toBe(NEUTRAL_ZONE);
  });

  it('un geyser allumé draine', () => {
    const l = layout({
      zones: [{ kind: 'geyser', x: 0, y: 0, radius: ZONES.geyser.radius, phase: 0 }],
      geysers: chapterArena(4).geysers,
    });
    expect(zoneModsAt(l, { x: 0, y: 0 }, 0).spinDrain)
      .toBeCloseTo(chapterArena(4).geysers!.spinDrain, 10);
  });

  it("le Cratère de Magma en pose le nombre déclaré, et le Hangar Rouillé aucun", () => {
    expect(buildLayout(4, 5, 31).layout.zones.filter((z) => z.kind === 'geyser'))
      .toHaveLength(chapterArena(4).geysers!.count);
    for (let salle = 1; salle <= 10; salle++) {
      expect(buildLayout(1, salle, 31).layout.zones.some((z) => z.kind === 'geyser'), `salle ${salle}`)
        .toBe(false);
    }
  });

  it('les geysers ne crachent pas tous en même temps', () => {
    const geysers = buildLayout(4, 5, 31).layout.zones.filter((z) => z.kind === 'geyser');
    expect(new Set(geysers.map((g) => g.phase)).size).toBeGreaterThan(1);
  });
});
```

**Note d'interface** : le cycle a besoin de trois chiffres (période, fenêtre, drain) qui vivent dans `chapterArena(n).geysers`. Pour que `zoneModsAt` y accède sans connaître le chapitre, `ArenaLayout` gagne un champ :

```ts
  /** Cycle des geysers de CE chapitre. Absent hors chapitre à geysers. */
  geysers?: { count: number; periodTicks: number; activeTicks: number; spinDrain: number };
```

L'auxiliaire `layout()` du fichier de test le laisse `undefined` par défaut.

- [ ] **Step 2: Lancer, vérifier l'échec**

Run: `npx vitest run src/sim/terrain.test.ts`
Expected: **FAIL** — `'geyser'` n'est pas un `ZoneKind`, `Zone.phase` n'existe pas, `zoneModsAt` ne prend pas de tick.

- [ ] **Step 3: Déclarer le type et les chiffres**

`src/sim/config.ts` :

```ts
export type ZoneKind = 'accelerateur' | 'pointes' | 'glisse' | 'geyser';
```

`src/content/balance.json`, dans `arena.zones` :

```json
      "geyser": { "radius": 30, "speedMult": 1, "accelMult": 1, "friction": 0, "spinDrain": 0 }
```

`spinDrain` vaut **0** ici : le drain d'un geyser est celui de son chapitre (`chapters."4".geysers.spinDrain`), pas celui du type de zone. La zone porte la géométrie, le chapitre porte l'intensité.

`src/content/balance.json`, dans `arena.chapters` :

```json
      "4": { "geysers": { "count": 3, "periodTicks": 70, "activeTicks": 20, "spinDrain": 90 } }
```

Valeurs de départ, balayées en tâche 8.

- [ ] **Step 4: Faire battre les geysers**

Dans `src/sim/terrain.ts` :

`Zone` gagne :

```ts
  /** Décalage du cycle, en ticks. Vaut 0 pour toute zone qui n'est pas un
   *  geyser — le champ est là pour que `Zone` reste une seule forme. */
  phase: number;
```

Toutes les constructions de `Zone` du fichier (`draw()`, `awayFromSpawn`) posent `phase: 0`.

**Après le bloc des brèches** — l'ordre du flux du § 2.3 de la spec : zones, brèches, geysers, piliers. Un geyser est une zone et rejoint le tableau `zones`, mais ses tirages viennent après ceux des brèches. Ajouter, juste avant le bloc des piliers de la tâche 4 :

```ts
  // Les geysers sont des zones comme les autres — même placement, même
  // composition quand elles se recouvrent — à ceci près qu'ils n'agissent que
  // pendant leur fenêtre d'allumage.
  if (def.geysers) {
    for (let i = 0; i < def.geysers.count; i++) {
      const radius = ZONES.geyser.radius;
      const span = ARENA_RADIUS - radius;
      const drawGeyser = (): Zone => {
        const ra = nextRandom(rng);
        rng = ra.state;
        const rr = nextRandom(rng);
        rng = rr.state;
        const angle = ra.value * TWO_PI;
        const dist = Math.sqrt(rr.value) * span;
        return { kind: 'geyser', x: Math.cos(angle) * dist, y: Math.sin(angle) * dist, radius, phase: 0 };
      };
      let candidate = drawGeyser();
      for (let t = 1; t < PLACEMENT_TRIES && !clearOfSpawn(candidate); t++) candidate = drawGeyser();
      if (!clearOfSpawn(candidate)) candidate = awayFromSpawn('geyser', radius);
      // La phase est tirée pour qu'ils ne crachent pas tous ensemble : un
      // chapitre où tout s'allume au même tick est un chapitre à deux états,
      // pas un terrain.
      const rp = nextRandom(rng);
      rng = rp.state;
      candidate.phase = Math.floor(rp.value * def.geysers.periodTicks);
      zones.push(candidate);
    }
  }
```

**Pourquoi cet ordre et pas un autre** : le déterminisme du projet tient à ce que la consommation de tirages soit fixe et connue. L'ordre zones → brèches → geysers → piliers est celui du § 2.3 de la spec, et il place les deux nouveautés **après** tout ce qui existait. Au chapitre 1, `def.geysers` et `def.pillars` sont `undefined` : zéro tirage consommé, épingle de la tâche 1 intacte. Toute autre insertion déplacerait le gabarit des chapitres 2 à 4 sans rien apporter.

Ajouter le cycle et le tick :

```ts
/** Vrai si ce geyser crache à ce tick. Compté, jamais tiré : aucun état mutable,
 *  aucun tirage par tick, déterminisme acquis sans y penser. */
export function geyserActive(layout: ArenaLayout, zone: Zone, tick: number): boolean {
  const def = layout.geysers;
  if (!def) return false;
  return (tick + zone.phase) % def.periodTicks < def.activeTicks;
}
```

`zoneModsAt` prend le tick et saute les geysers éteints :

```ts
export function zoneModsAt(layout: ArenaLayout, pos: Vec, tick: number): ZoneMods {
  let mods: ZoneMods | null = null;
  for (const zone of layout.zones) {
    if (Math.hypot(pos.x - zone.x, pos.y - zone.y) > zone.radius) continue;
    if (zone.kind === 'geyser' && !geyserActive(layout, zone, tick)) continue;
    const def = ZONES[zone.kind];
    mods ??= { ...NEUTRAL_ZONE };
    mods.speedMult *= def.speedMult;
    mods.accelMult *= def.accelMult;
    mods.friction = Math.max(mods.friction, def.friction);
    mods.spinDrain += def.spinDrain + (zone.kind === 'geyser' ? (layout.geysers?.spinDrain ?? 0) : 0);
  }
  return mods ?? NEUTRAL_ZONE;
}
```

Et `buildLayout` pose `geysers: def.geysers` dans le gabarit rendu.

- [ ] **Step 5: Mettre les appelants à jour**

`src/sim/sim.ts` :

```ts
  const playerZone = zoneModsAt(run.arena, run.player.pos, run.tick);
  const botZones = run.bots.map((bot) => zoneModsAt(run.arena, bot.pos, run.tick));
```

`src/render/snapshot.ts` : `snap(top, layout, tick)` et `takeSnapshot` passe `run.tick`.

- [ ] **Step 6: Lancer, vérifier que ça passe**

Run: `npm run test`
Expected: PASS. Les tests existants de `zoneModsAt` doivent recevoir un tick — passer `0`, ce qui ne change rien pour une zone qui n'est pas un geyser.

- [ ] **Step 7: Vérifier le déterminisme et la mutation**

Le test « reste déterministe dans les quatre chapitres » (tâche 4) couvre déjà le chapitre 4. Ajouter dans `src/sim/terrain.test.ts` :

```ts
  it('le cycle d’un geyser ne consomme aucun tirage', () => {
    const l = buildLayout(4, 5, 31).layout;
    const avant = JSON.stringify(l);
    for (let tick = 0; tick < 500; tick++) zoneModsAt(l, { x: 0, y: 0 }, tick);
    expect(JSON.stringify(l)).toBe(avant);
  });
```

Mutation : remplacer `< def.activeTicks` par `< def.periodTicks` dans `geyserActive`.
Expected: **FAIL** sur « un geyser éteint est exactement neutre ». Remettre.

- [ ] **Step 8: Commit**

```bash
git status --short
git add src/sim/config.ts src/sim/terrain.ts src/sim/terrain.test.ts src/sim/sim.ts src/render/snapshot.ts src/content/balance.json
git commit -m "feat(chapitre 4): au Cratère de Magma, les geysers battent au lieu de brûler en continu"
git status --short
```

---

### Task 6: Le rendu — piliers et geysers

**Files:**
- Modify: `src/render/textures.ts` (texture de pilier, texture de geyser)
- Modify: `src/render/arena.ts` (calque des piliers, rafraîchissement des geysers)

**Interfaces:**
- Consumes: `ArenaLayout.pillars`, `Zone.kind === 'geyser'`, `geyserActive` (tâches 4, 5).
- Produces: rien hors du rendu.

- [ ] **Step 1: Ajouter les textures**

`src/render/textures.ts` : `zone: Record<ZoneKind, Texture>` **force** déjà une entrée `geyser` — le build casse sans elle, c'est le filet. Ajouter dans `createTextures()` :

```ts
      geyser: zoneTexture(PALETTE.ember, true),
```

Le pointillé (`dashed: true`) est le vocabulaire visuel du danger, déjà porté par `pointes` ; `ember` distingue le magma du rouge des pointes.

Puis la texture de pilier. Ajouter `pillar: Texture;` à l'interface `Textures`, la fonction :

```ts
/** Pilier du Marché Souterrain : un disque PLEIN, là où toutes les zones sont
 *  des halos translucides. C'est ce qui le fait lire comme un obstacle qu'on
 *  heurte et non comme un sol qu'on traverse — la distinction doit se faire au
 *  coin de l'œil, à pleine vitesse. */
function pillarTexture(): Texture {
  const size = 128;
  const { el, ctx } = canvas(size);
  const r = size / 2;
  ctx.translate(r, r);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.9);
  grad.addColorStop(0, `${hex(PALETTE.panel)}ff`);
  grad.addColorStop(1, `${hex(PALETTE.bg)}ff`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `${hex(PALETTE.rim)}ee`;
  ctx.lineWidth = size * 0.05;
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
  ctx.stroke();
  return Texture.from(el);
}
```

`pillar: pillarTexture(),` dans `createTextures()`, et `t.pillar` ajouté au tableau `all` de `destroyTextures` — un oubli ici fuit une texture à chaque changement de salle.

- [ ] **Step 2: Dessiner les piliers**

Dans `src/render/arena.ts`, après la création de `zoneLayer` :

```ts
  // Les piliers vivent au-dessus des zones et sous les toupies. Comme l'éclat,
  // ils bougent à chaque tick : sprites persistants, repositionnés par image.
  const pillarLayer = new Container();
  floorLayer.addChild(pillarLayer);
  let lastPillars: Pillar[] | null = null;

  function syncPillars(state: RunState): void {
    if (state.arena.pillars !== lastPillars) {
      lastPillars = state.arena.pillars;
      pillarLayer.removeChildren().forEach((child) => child.destroy());
      for (const p of state.arena.pillars) {
        const sprite = new Sprite(tex.pillar);
        sprite.anchor.set(0.5);
        sprite.width = sprite.height = p.radius * 2;
        pillarLayer.addChild(sprite);
      }
    }
    // Position par image : un pilier dérive, sa transform suit.
    state.arena.pillars.forEach((p, i) => {
      const sprite = pillarLayer.children[i];
      sprite.x = p.x;
      sprite.y = p.y;
    });
  }
```

L'appeler depuis la même boucle par image que `syncZones`.

- [ ] **Step 3: Faire respirer les geysers**

C'est le piège annoncé au § 5.4 de la spec. `syncZones` ne reconstruit qu'au changement d'identité du tableau ; un geyser qui s'allume ne changerait rien à l'écran.

Garder les sprites de geyser dans un tableau parallèle, rempli par `syncZones` :

```ts
  let geyserSprites: { sprite: Sprite; zone: Zone }[] = [];
```

Le remplir dans la boucle de `syncZones` (`if (zone.kind === 'geyser') geyserSprites.push({ sprite, zone });`), le vider avant reconstruction, puis dans la boucle par image :

```ts
    // Un geyser s'ANNONCE avant de cracher : sans télégraphe, un piège n'est pas
    // évitable, et le § 5.4 de la spec du lot en fait une exigence. Trois états
    // lisibles — dormant, en charge, en éruption — et la charge monte sur les
    // derniers ticks avant l'allumage pour laisser le temps de sortir du disque.
    const gey = state.arena.geysers;
    for (const { sprite, zone } of geyserSprites) {
      if (!gey) { sprite.alpha = 0.28; continue; }
      if (geyserActive(state.arena, zone, state.tick)) {
        sprite.alpha = 1;
        continue;
      }
      // Ticks restants avant le prochain allumage.
      const dans = (gey.periodTicks - ((state.tick + zone.phase) % gey.periodTicks)) % gey.periodTicks;
      const t = Math.max(0, 1 - dans / CHARGE_TICKS);
      sprite.alpha = 0.28 + 0.5 * t;
    }
```

avec, en tête de `src/render/arena.ts`, à côté des autres constantes de rendu :

```ts
/** Durée du télégraphe d'un geyser, en ticks de simulation. Constante de RENDU
 *  et non d'équilibrage : elle ne change rien à ce que la simulation calcule,
 *  seulement au préavis qu'on en donne à l'œil. */
const CHARGE_TICKS = 12;
```

La valeur exacte se juge en navigateur (tâche 7) : trop court, le geyser surprend ; trop long, il ne se distingue plus d'une zone de pointes.

Imports à ajouter en tête de `src/render/arena.ts` : `geyserActive` et les types `Pillar` et `Zone` depuis `../sim/terrain`.

- [ ] **Step 4: Vérifier que le build passe**

Run: `npm run build`
Expected: PASS. Un `Record<ZoneKind, Texture>` incomplet aurait échoué ici.

- [ ] **Step 5: Commit**

```bash
git status --short
git add src/render/textures.ts src/render/arena.ts
git commit -m "feat(rendu): les piliers dérivent à l'écran et les geysers s'annoncent avant de cracher"
git status --short
```

---

### Task 7: Vérification en navigateur — par le contrôleur, jamais par sous-agent

**Files:** aucun. Cette tâche produit un constat, pas du code.

- [ ] **Step 1: Lancer un serveur sur un port inhabituel et VÉRIFIER LE CONTENU SERVI**

```bash
npx vite --port 5911 --strictPort
```

Puis, avant toute conclusion, poser une empreinte propre à la branche à la racine du worktree, la lire par `curl http://localhost:5911/spinforge/<empreinte>`, vérifier qu'elle revient **à l'identique**, et la supprimer. Un `cd` silencieusement raté a déjà fait passer un harnais au vert contre le code de `main` ; seule cette garde l'attrape. Ports vus occupés : 5173-5178, 5190, 5281, 5295, 5297, 5488, 5947, 41973.

- [ ] **Step 2: Regarder les quatre chapitres**

`http://localhost:5911/spinforge/` (la racine renvoie 404). Pour atteindre les chapitres 2 à 4 sans les jouer, injecter une sauvegarde avec `bestChapter: 3` dans `localStorage['spinforge.save']` — `scripts/verrou.mjs` porte le blob prêt à l'emploi (schéma 5, pièces rang 11 niveau 400, **Pointe laissée d'origine**).

À constater de ses yeux :
- chapitre 1 — rien de neuf, l'arène est celle qu'on connaît ;
- chapitre 2 — le rebond sur le bord renvoie visiblement plus fort ;
- chapitre 3 — les piliers dérivent, rebondissent sur le bord, repoussent, et **la barre de spin ne bouge pas** au contact ;
- chapitre 4 — les geysers s'annoncent puis crachent, et **le sprite change à l'écran** (§ 5.4 de la spec).

- [ ] **Step 3: Relancer le verrou**

```bash
PORT=5911 npm run verrou
```
Expected: « Verrou vérifié de bout en bout ». Il joue le chapitre 1 : il ne devrait rien voir de neuf.

- [ ] **Step 4: Consigner**

Écrire ce qui a été vu dans une section de `docs/superpowers/plans/2026-09-03-jalon-3-lot-c1-gimmicks.md` (ce fichier), puis commiter.

```bash
git status --short
git add docs/superpowers/plans/2026-09-03-jalon-3-lot-c1-gimmicks.md
git commit -m "docs(plan): ce que les quatre chapitres donnent en navigateur"
git status --short
```

---

### Task 8: La passe de mesure — régler les gimmicks contre les garde-fous

C'est la passe d'équilibrage du lot. **Le contrôleur lance les balayages lui-même ; les sous-agents jugent les relevés.** Produire la donnée n'a aucune surface de relecture.

**Files:**
- Modify: `src/content/balance.json` (valeurs retenues)
- Modify: ce plan (journal du balayage)

- [ ] **Step 1: Monter les bancs parallèles**

Hors du dépôt, six copies de l'arbre, `node_modules` en lien symbolique, un `balance.json` par banc.

- [ ] **Step 2: Passer la porte de fidélité — obligatoire**

Chaque banc rejoue la ligne de base **au chiffre près** avant qu'on lui fasse confiance :

```
ch.1 0,37 h (+0,37) · 17 descentes · salle 10, 229 morts · 85 %/tentative · salle 10 : 46,40 s
ch.2 0,49 h (+0,12) · 3 · ch.3 0,64 h (+0,15) · 3 · ch.4 0,85 h (+0,21) · 5
premier coffre 0,00 h · passivité jamais · verrou du châssis actif
salle 10 la plus meurtrière DANS CHAQUE chapitre · écart entre châssis ×4,88
vecteur de morts ch.1 : 0,0,3,5,47,63,103,111,129,229
```

Un banc qui ne la reproduit pas est écarté, pas corrigé à la main.

- [ ] **Step 3: Balayer, une constante à la fois**

Trois axes, à l'autre figé :
- `chapters."2".wallRestitution` — autour de 1,5 ;
- `chapters."3".pillars` — `count` puis `speed`, `radius` figé ;
- `chapters."4".geysers` — `spinDrain` puis le rapport `activeTicks / periodTicks`.

**Ne jamais comparer deux chiffres venant de jeux de graines différents.**

- [ ] **Step 4: Juger contre les cibles du § 6 de la spec**

Contrôle exact — **le chapitre 1 ressort au chiffre près**, sinon le lot s'arrête pour l'expliquer.
Cibles ch. 2-4 — quatre chapitres validés 40/40 ; « salle 10 la plus meurtrière » dans chacun ; la forme ch.2 ≈ ch.3 < ch.4 survit, l'étendue du ch. 4 ne recouvrant celle d'aucun autre sur **trois jeux de graines disjoints** ; premier coffre, passivité et verrou inchangés.

- [ ] **Step 5: Retenir, et écrire le journal**

Commiter les valeurs retenues **seules**, puis le journal dans un commit distinct. Le journal dit ce qui a été mesuré, pas seulement ce qui a été retenu : les valeurs écartées et leur raison valent autant.

```bash
git status --short
git add src/content/balance.json
git commit -m "balance(gimmicks): les trois identités d'arène tiennent les garde-fous"
git status --short
```

---

### Task 9: Les documents de référence

**Files:**
- Modify: `docs/game-design.md` (§ Structure, § 8 arènes-chapitres)
- Modify: `docs/roadmap.md` (jalon 3, lot C ; dette ouverte par C1)
- Modify: `docs/ameliorations.md` (ce que ça change pour qui joue)

- [ ] **Step 1: `docs/game-design.md`**

§ Structure : la phrase « les chapitres 1 à 4 [...] partagent aujourd'hui le même gabarit — leurs identités propres [...] restent à poser dessus, c'est le lot C » n'est plus vraie. La remplacer par ce qui est livré, avec les valeurs retenues.
§ 8 : marquer 2, 3 et 4 comme livrés, 5 à 8 comme hors de portée jusqu'au jalon 4.

- [ ] **Step 2: `docs/roadmap.md`**

Ajouter une section « Lot C1 — les gimmicks » sur le modèle des lots A et B : ce qui est livré, la ligne de base mesurée avant/après, ce que le chapitre 1 prouve, et **la dette ouverte** :
- la difficulté des chapitres 3 et 4 est **majorée** — l'autopilote ne contourne ni piliers ni geysers (décision 5 de la spec) ;
- le balayage a été fait **une constante à la fois** : ce n'est pas une carte du domaine ;
- la clause de remesure des cinq constantes : dire explicitement comment elle a été lue (§ 6.3 de la spec) et ce que cette lecture ne couvre pas.

- [ ] **Step 3: `docs/ameliorations.md`**

Une section datée, dans le vocabulaire du joueur : ce que ça change chapitre par chapitre, et ce qui reste ouvert.

- [ ] **Step 4: Commit**

```bash
git status --short
git add docs/game-design.md docs/roadmap.md docs/ameliorations.md
git commit -m "docs: les trois arènes rejoignent la spec, la roadmap et les retours de jeu"
git status --short
```

---

### Task 10: Relecture de branche entière

**Files:** aucun a priori.

- [ ] **Step 1: Faire relire la branche entière**

`git diff origin/main...HEAD`, relu **d'un bloc** et non tâche par tâche. C'est cette relecture, et rien d'autre dans ce projet, qui attrape les deux familles de défauts que les tests et les relectures de tâche laissent passer : une pièce correcte qui en rend une autre inatteignable, et une règle posée à deux endroits mais tenue à un seul.

À chercher spécifiquement :
- un chemin où le chapitre 1 cesse d'être neutre ;
- un geyser dont l'effet existe dans le calcul mais jamais à l'écran (le défaut annoncé au § 5.4) ;
- un pilier qui éjecte à un second site ;
- un chiffre d'équilibrage écrit ailleurs que dans `balance.json` ;
- une affirmation de la documentation démentie par une mesure du même document.

- [ ] **Step 2: Après chaque correctif, relire à nouveau**

**Chaque round de correctif introduit un nouveau défaut de la même famille** — observé à tous les rounds de la remesure. Relire après chaque correction en cherchant l'élargissement silencieux : « la paire » devenue « le groupe », puis « la bande », puis « le domaine ».

- [ ] **Step 3: Les quatre harnais, une dernière fois**

```bash
npm run test && npm run build && npm run calibrate
PORT=5911 npm run verrou
```

Aucun n'est optionnel. `calibrate` et `verrou` ne sont dans aucune suite : ils meurent en silence.
