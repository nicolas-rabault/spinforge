# Guidage du joueur — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** rendre visible ce qui attend le joueur — la Forge lit ses emplacements dans l'ordre où ils s'empilent sur la toupie, et un point rouge unique marque, à tous les étages, chaque action gratuite en attente.

**Architecture:** `src/sim/` gagne une seule règle nouvelle — `dominatesEquipped`, qui répond « monter cette pièce ferait-il gagner sans rien coûter ? » en comparant les sept stats après échange. `src/ui/attention.ts` compose cette règle avec `canFuse`, `pendingTotal` et `canClaimFounderGift` en un instantané recalculé à chaque rendu. Aucun champ de sauvegarde : un point s'éteint parce que l'action est faite, jamais parce qu'on a regardé l'écran.

**Tech Stack:** TypeScript, React 19, Vitest 2, Vite 6. Aucune dépendance nouvelle.

**Spec:** `docs/superpowers/specs/2026-09-01-guidage-joueur-design.md`

**Worktree:** `../B-Blades_versus-guidage`, branche `guidage-joueur` (créée depuis `origin/main`). Toutes les commandes ci-dessous s'exécutent depuis ce répertoire.

## Global Constraints

Reprises de `CLAUDE.md` et de la spec. Elles s'appliquent à **toutes** les tâches.

- **`src/sim/` est pur** : aucun import de DOM, PixiJS, React, `src/i18n/`, `Date` ou `Math.random`.
- **Le rendu est un spectateur** : `src/ui/` lit l'état, ne le mute jamais directement.
- **Aucune couleur en dur** hors `src/theme.ts` ; le CSS lit `var(--…)`.
- **Aucune chaîne visible en dur** : tout passe par `src/i18n/`. `fr.ts` fait foi, `en.ts` est `Record<MessageKey, string>` — **toute clé ajoutée doit l'être dans les deux fichiers**, sinon `npm run build` échoue.
- **Aucun champ ajouté à `MetaState`**, aucun changement de `SAVE_SCHEMA`, aucune modification de `src/content/balance.json`. `git diff` ne doit toucher ni `src/sim/save.ts`, ni `src/sim/types.ts`, ni `src/sim/meta.ts`.
- **Pas de code mort** : aucune prop, aucun export « au cas où ». Chaque tâche n'ajoute que ce qu'elle consomme.
- **Tests colocalisés**, imports explicites depuis `vitest` (pas de globals).
- **Chaque test est prouvé par mutation** : on casse le mécanisme qu'il garde, on constate le rouge, on remet. Un test qui passe encore sans son mécanisme ne prouve rien.
- **Commits en français**, sujet à l'impératif ou au présent, préfixe conventionnel (`feat(...)`, `refactor(...)`, `fix(...)`).
- **Jamais `git add -A` ni `git add <répertoire>`** dans ce dépôt : d'autres sessions travaillent dans des worktrees voisins. Lister les fichiers un par un, puis relire `git status --short`.
- **Vérifier `git rev-parse --abbrev-ref HEAD` avant chaque commit** : la réponse doit être `guidage-joueur`.

---

### Task 1: Le sens des axes — une source unique

Le fait que `spinDecay` soit une **perte** (donc que descendre soit un gain) est aujourd'hui écrit deux fois : en commentaire dans `src/sim/profile.ts:10-11` et en code dans `src/ui/profileAxes.ts:31`. La règle de la tâche 2 en serait la troisième copie. On la ramène à une table exportée.

**Files:**
- Modify: `src/sim/profile.ts` (après `PROFILE_AXES`, ligne 22)
- Modify: `src/ui/profileAxes.ts:30-32`
- Test: `src/ui/profileAxes.test.ts` (créer)

**Interfaces:**
- Consumes: `ProfileAxis`, `PROFILE_AXES` (existants, `src/sim/profile.ts`)
- Produces: `HIGHER_IS_BETTER: Record<ProfileAxis, boolean>` exporté par `src/sim/profile.ts`. La tâche 2 le lit.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/ui/profileAxes.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { HIGHER_IS_BETTER, PROFILE_AXES } from '../sim/profile';
import { isGain } from './profileAxes';

describe('HIGHER_IS_BETTER', () => {
  it('couvre les sept axes, une seule fois chacun', () => {
    expect(Object.keys(HIGHER_IS_BETTER).sort()).toEqual([...PROFILE_AXES].sort());
  });

  // `spinDecay` est une perte de spin par seconde : descendre est le gain.
  // C'est le seul axe qui va dans ce sens, et le piège que la table existe
  // pour n'avoir à corriger qu'à un endroit.
  it('inverse spinDecay et lui seul', () => {
    expect(HIGHER_IS_BETTER.spinDecay).toBe(false);
    for (const axis of PROFILE_AXES) {
      if (axis !== 'spinDecay') expect(HIGHER_IS_BETTER[axis]).toBe(true);
    }
  });
});

describe('isGain', () => {
  it('lit le sens dans HIGHER_IS_BETTER', () => {
    expect(isGain('attack', 1.1)).toBe(true);
    expect(isGain('attack', 0.9)).toBe(false);
    expect(isGain('spinDecay', 0.9)).toBe(true);
    expect(isGain('spinDecay', 1.3)).toBe(false);
  });

  // Un multiplicateur neutre ne gagne rien, dans les deux sens.
  it('ne prend jamais 1 pour un gain', () => {
    for (const axis of PROFILE_AXES) expect(isGain(axis, 1)).toBe(false);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

```bash
npx vitest run src/ui/profileAxes.test.ts
```

Attendu : ÉCHEC — `HIGHER_IS_BETTER` n'est pas exporté par `../sim/profile`.

- [ ] **Step 3: Ajouter la table dans `src/sim/profile.ts`**

Insérer juste après la déclaration de `PROFILE_AXES` (ligne 22) :

```ts
/** Le sens de chaque axe. Six montent ; `spinDecay` descend — c'est une perte de
 *  spin par seconde, donc moins vaut mieux. Source unique : `ui/profileAxes.isGain`
 *  la lit pour colorer un profil, `sim/upgrade.ts` pour comparer deux montages.
 *  Un piège écrit à deux endroits finit corrigé à un seul. */
export const HIGHER_IS_BETTER: Record<ProfileAxis, boolean> = {
  attack: true,
  defense: true,
  maxSpeed: true,
  spinMax: true,
  accel: true,
  mass: true,
  spinDecay: false,
};
```

- [ ] **Step 4: Faire lire la table à `isGain`**

Dans `src/ui/profileAxes.ts`, remplacer l'import de la ligne 2 et le corps de `isGain` :

```ts
import { HIGHER_IS_BETTER, PROFILE_AXES, type ProfileAxis } from '../sim/profile';
```

```ts
/** > 1 est un gain pour six axes sur sept ; `spinDecay` est une perte, donc < 1
 *  y est le gain. Le sens vient de `HIGHER_IS_BETTER` : le tester ici en plus
 *  ferait deux endroits à corriger. */
export function isGain(axis: ProfileAxis, value: number): boolean {
  return HIGHER_IS_BETTER[axis] ? value > 1 : value < 1;
}
```

- [ ] **Step 5: Lancer le test, vérifier qu'il passe**

```bash
npx vitest run src/ui/profileAxes.test.ts
```

Attendu : 4 tests PASS.

- [ ] **Step 6: Prouver les tests par mutation**

Dans `src/sim/profile.ts`, mettre temporairement `spinDecay: true`, relancer `npx vitest run src/ui/profileAxes.test.ts`.
Attendu : « inverse spinDecay et lui seul » ET « lit le sens dans HIGHER_IS_BETTER » ÉCHOUENT. Remettre `false`, relancer, tout repasse.

- [ ] **Step 7: Vérifier que rien d'autre n'a bougé**

```bash
npm run test && npm run build
```

Attendu : toute la suite passe, `tsc --noEmit` silencieux.

- [ ] **Step 8: Commit**

```bash
git rev-parse --abbrev-ref HEAD   # doit répondre : guidage-joueur
git add src/sim/profile.ts src/ui/profileAxes.ts src/ui/profileAxes.test.ts
git status --short
git commit -m "refactor(profile): le sens des axes ne s'écrit plus qu'à un endroit"
```

---

### Task 2: `dominatesEquipped` — la règle « plus forte que l'équipée »

**Files:**
- Create: `src/sim/upgrade.ts`
- Test: `src/sim/upgrade.test.ts` (créer)

**Interfaces:**
- Consumes: `HIGHER_IS_BETTER`, `PROFILE_AXES` (tâche 1) ; `playerStats` (`src/sim/economy.ts`) ; `modelById` (`src/content/pieces.ts`)
- Produces:
  ```ts
  export function dominatesEquipped(
    meta: MetaState, toupie: ToupieId, model: string, rank: number, level: number,
  ): boolean
  ```
  La tâche 3 l'appelle.

**Chiffres qui rendent les tests constructibles** (relevés dans `src/content/balance.json`, à ne pas recopier dans le code) :
- `rarity.step = 1,08` ⇒ `rarityMult(rang) = 1,08^(rang−1)`
- `pieceEffect.disqueDefense = 0,1` ⇒ `factor = (1 + 0,1 × niveau) × rarityMult(rang)`
- `models['disque.lourd'] = {}` (neutre) · `models['disque.axial'] = { defense: 1,15, mass: 0,95 }`
- `models['pointe.plate'] = {}` (neutre) · `models['pointe.furie'] = { maxSpeed: 1,3, accel: 1,1, spinDecay: 1,3 }`
- L'équipement de départ (`STARTER_EQUIPMENT`) monte `disque.lourd` et `pointe.plate`, rang 1, niveau 0.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/sim/upgrade.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { createInitialMeta } from './meta';
import { dominatesEquipped } from './upgrade';
import { STARTER_TOUPIE } from '../content/toupies';
import type { MetaState } from './types';

/** Un méta neuf dont un seul emplacement a été remplacé. L'inventaire ne joue
 *  aucun rôle ici : la règle compare une pièce *candidate* à celle qui est
 *  montée, pas deux piles. */
function withEquipped(slot: 'disque' | 'pointe', model: string, rank: number, level: number): MetaState {
  const meta = createInitialMeta(1);
  meta.equipped[slot] = { model, rank, level };
  return meta;
}

describe('dominatesEquipped', () => {
  it('un rang au-dessus, même modèle et même niveau, domine', () => {
    const meta = withEquipped('disque', 'disque.lourd', 1, 0);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.lourd', 2, 0)).toBe(true);
  });

  // La raison d'être de la règle. Facteur équipé : (1 + 0,1 × 8) × 1,08^0 = 1,80.
  // Facteur candidat : (1 + 0) × 1,08^1 = 1,08. Le rang monte, la défense tombe.
  it('ne se laisse pas prendre par un rang supérieur au niveau 0', () => {
    const meta = withEquipped('disque', 'disque.lourd', 1, 8);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.lourd', 2, 0)).toBe(false);
  });

  // disque.axial : défense +15 %, masse −5 %. Un échange, pas une évidence.
  it('refuse un gain payé par une perte sur un autre axe', () => {
    const meta = withEquipped('disque', 'disque.lourd', 1, 0);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.axial', 1, 0)).toBe(false);
  });

  // pointe.furie : vitesse +30 %, accélération +10 %, mais spinDecay ×1,30 —
  // et spinDecay est une perte, donc ×1,30 est une aggravation.
  it('lit spinDecay dans le bon sens', () => {
    const meta = withEquipped('pointe', 'pointe.plate', 1, 0);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'pointe.furie', 1, 0)).toBe(false);
  });

  it('ne domine pas une pièce strictement identique', () => {
    const meta = withEquipped('disque', 'disque.lourd', 3, 2);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.lourd', 3, 2)).toBe(false);
  });

  // Le niveau compense le rang dans l'autre sens aussi : (1 + 0,1 × 12) × 1,08^0
  // = 2,20 contre 1,08^2 = 1,1664.
  it('accepte un rang inférieur assez monté pour dominer', () => {
    const meta = withEquipped('disque', 'disque.lourd', 3, 0);
    expect(dominatesEquipped(meta, STARTER_TOUPIE, 'disque.lourd', 1, 12)).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

```bash
npx vitest run src/sim/upgrade.test.ts
```

Attendu : ÉCHEC — impossible de résoudre `./upgrade`.

- [ ] **Step 3: Écrire l'implémentation minimale**

Créer `src/sim/upgrade.ts` :

```ts
import { modelById } from '../content/pieces';
import { playerStats } from './economy';
import { HIGHER_IS_BETTER, PROFILE_AXES } from './profile';
import type { ToupieId } from '../content/toupies';
import type { MetaState } from './types';

/**
 * Monter cette pièce à la place de celle qui occupe son emplacement ferait-il
 * gagner **sans rien coûter** ?
 *
 * Vrai quand aucune des sept stats ne recule et qu'au moins une avance.
 *
 * Comparer le rang seul mentirait : `factor = (1 + perLevel × niveau) ×
 * rarityMult(rang)`, donc une pièce de rang supérieur au niveau 0 est
 * régulièrement plus faible qu'une équipée montée. Et un échange — de la masse
 * contre de la défense — n'est pas une évidence mais un choix du joueur : il ne
 * se signale pas, sinon le point rouge donnerait un mauvais conseil une fois
 * sur deux.
 *
 * Le châssis entre dans le calcul via `resolveProfile`, appelé par
 * `playerStats` : c'est pourquoi `toupie` est un paramètre et non une lecture
 * de `meta.toupies.active`.
 */
export function dominatesEquipped(
  meta: MetaState, toupie: ToupieId, model: string, rank: number, level: number,
): boolean {
  const slot = modelById(model).slot;
  const before = playerStats(meta, toupie);
  const after = playerStats(
    { ...meta, equipped: { ...meta.equipped, [slot]: { model, rank, level } } },
    toupie,
  );
  let gain = false;
  for (const axis of PROFILE_AXES) {
    // Un seul recul suffit à disqualifier : inutile de regarder la suite.
    if (HIGHER_IS_BETTER[axis] ? after[axis] < before[axis] : after[axis] > before[axis]) {
      return false;
    }
    // Aucun recul n'a été toléré au-dessus : toute différence restante est un gain.
    if (after[axis] !== before[axis]) gain = true;
  }
  return gain;
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

```bash
npx vitest run src/sim/upgrade.test.ts
```

Attendu : 6 tests PASS.

- [ ] **Step 5: Prouver les tests par mutation**

Trois mutations, une à la fois, en remettant le code d'origine après chacune :

| Mutation dans `src/sim/upgrade.ts` | Test qui doit rougir |
|---|---|
| remplacer le corps par `return rank > meta.equipped[slot].rank;` | « ne se laisse pas prendre par un rang supérieur au niveau 0 » **et** « accepte un rang inférieur assez monté » |
| ne boucler que sur `['attack', 'defense', 'maxSpeed', 'spinMax']` au lieu de `PROFILE_AXES` | « refuse un gain payé par une perte sur un autre axe » **et** « lit spinDecay dans le bon sens » — les deux perdent leur axe témoin (`mass`, `spinDecay`) |
| dans `src/sim/profile.ts`, mettre `spinDecay: true` | « lit spinDecay dans le bon sens » |

Relancer `npx vitest run src/sim/upgrade.test.ts` après chaque mutation, constater le rouge, restaurer.

- [ ] **Step 6: Vérifier la suite complète**

```bash
npm run test && npm run build
```

- [ ] **Step 7: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add src/sim/upgrade.ts src/sim/upgrade.test.ts
git status --short
git commit -m "feat(sim): une pièce ne domine que si l'échange ne coûte aucune stat"
```

---

### Task 3: `attention()` — ce qui attend le joueur

**Files:**
- Create: `src/ui/attention.ts`
- Test: `src/ui/attention.test.ts` (créer)

**Interfaces:**
- Consumes: `dominatesEquipped` (tâche 2) ; `canFuse` (`src/sim/fusion.ts`) ; `pendingTotal`, `canClaimFounderGift` (`src/sim/meta.ts`) ; `modelById`
- Produces :
  ```ts
  export interface Attention {
    coffres: number;
    stacks: Set<string>;      // clés `model:rank`
    markedSlots: Set<Slot>;   // filtres d'inventaire
    betterSlots: Set<Slot>;   // lignes de la pile en Forge
    toupies: boolean;
  }
  export function stackKey(model: string, rank: number): string
  export function attention(meta: MetaState, toupie: ToupieId): Attention
  export function shoppingToupie(meta: MetaState, run: RunState): ToupieId
  ```
  Les tâches 5, 7 et 8 les consomment.

> **Précision sur la spec.** §2.3 annonçait un seul `slots: Set<Slot>`. Deux
> ensembles sont nécessaires et le plan les nomme explicitement : `betterSlots`
> (une pile **domine** la pièce équipée de cet emplacement → la ligne de la pile
> en Forge) et `markedSlots` (une pile marquée, dominante **ou** fusionnable,
> relève de cet emplacement → le filtre de l'inventaire). Fusionner ne change pas
> la toupie montée : mettre les fusionnables dans `betterSlots` allumerait la
> ligne d'un emplacement sur lequel il n'y a rien à faire.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/ui/attention.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { addPiece, createInitialMeta } from '../sim/meta';
import { STARTER_TOUPIE } from '../content/toupies';
import { attention, stackKey } from './attention';
import type { MetaState } from '../sim/types';

function empty(): MetaState {
  return createInitialMeta(1);
}

describe('attention', () => {
  it('n’allume rien sur une partie neuve', () => {
    const att = attention(empty(), STARTER_TOUPIE);
    expect(att.coffres).toBe(0);
    expect(att.stacks.size).toBe(0);
    expect(att.markedSlots.size).toBe(0);
    expect(att.betterSlots.size).toBe(0);
    expect(att.toupies).toBe(false);
  });

  it('compte les coffres en attente, tous types confondus', () => {
    const meta = empty();
    meta.pending.bronze = 2;
    meta.pending.mythique = 1;
    expect(attention(meta, STARTER_TOUPIE).coffres).toBe(3);
  });

  // Trois exemplaires identiques au rang 1 : la recette de base est réunie.
  it('marque une pile fusionnable, sans allumer sa ligne d’emplacement', () => {
    const meta = empty();
    for (let i = 0; i < 3; i++) addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    const att = attention(meta, STARTER_TOUPIE);
    expect(att.stacks.has(stackKey('disque.lourd', 1))).toBe(true);
    expect(att.markedSlots.has('disque')).toBe(true);
    // Fusionner ne change pas la toupie montée : rien à faire sur la ligne.
    expect(att.betterSlots.has('disque')).toBe(false);
  });

  it('marque une pile dominante et allume sa ligne d’emplacement', () => {
    const meta = empty();
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    const att = attention(meta, STARTER_TOUPIE);
    expect(att.stacks.has(stackKey('disque.lourd', 4))).toBe(true);
    expect(att.betterSlots.has('disque')).toBe(true);
    expect(att.markedSlots.has('disque')).toBe(true);
  });

  it('n’allume que l’emplacement concerné', () => {
    const meta = empty();
    addPiece(meta, { model: 'disque.lourd', rank: 4, level: 0 });
    const att = attention(meta, STARTER_TOUPIE);
    for (const slot of ['lame', 'pointe', 'noyau'] as const) {
      expect(att.betterSlots.has(slot)).toBe(false);
    }
  });

  // Une pile qui ne bat rien et ne se fusionne pas ne doit rien allumer :
  // sans quoi l'inventaire finirait entièrement marqué.
  it('ignore une pile ni dominante ni fusionnable', () => {
    const meta = empty();
    addPiece(meta, { model: 'disque.axial', rank: 1, level: 0 });
    const att = attention(meta, STARTER_TOUPIE);
    expect(att.stacks.size).toBe(0);
    expect(att.markedSlots.size).toBe(0);
  });

  // `chapterValidated` est le champ d'aujourd'hui. `jalon-3-lot-a` le remplace
  // par `bestChapter` (schéma 5) : après un rebase sur leur travail, ce test
  // devra lire le nouveau champ — voir la tâche 9, étape 7.
  it('signale le Fondateur dès qu’il est réclamable', () => {
    const meta = empty();
    meta.chapterValidated = true;
    expect(attention(meta, STARTER_TOUPIE).toupies).toBe(true);
    meta.founderGiftClaimed = true;
    expect(attention(meta, STARTER_TOUPIE).toupies).toBe(false);
  });

  // Le meilleur exemplaire est celui que `equipFromStack` monterait : comparer
  // un autre annoncerait un gain que l'échange ne donnerait pas.
  it('compare le meilleur exemplaire de la pile', () => {
    const meta = empty();
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 0 });
    addPiece(meta, { model: 'disque.lourd', rank: 1, level: 5 });
    const att = attention(meta, STARTER_TOUPIE);
    expect(att.betterSlots.has('disque')).toBe(true);
  });
});
```

- [ ] **Step 2: Lancer le test, vérifier qu'il échoue**

```bash
npx vitest run src/ui/attention.test.ts
```

Attendu : ÉCHEC — impossible de résoudre `./attention`.

- [ ] **Step 3: Écrire l'implémentation**

Créer `src/ui/attention.ts` :

```ts
import { modelById } from '../content/pieces';
import { canFuse } from '../sim/fusion';
import { canClaimFounderGift, pendingTotal } from '../sim/meta';
import { dominatesEquipped } from '../sim/upgrade';
import type { Slot } from '../sim/piece';
import type { ToupieId } from '../content/toupies';
import type { MetaState, RunState } from '../sim/types';

/**
 * Ce qui attend le joueur, à l'instant du rendu.
 *
 * **Dérivé, jamais stocké.** Un point rouge s'éteint parce que l'action est
 * faite, jamais parce qu'on a regardé l'écran — donc aucun champ de sauvegarde
 * et rien à réconcilier entre l'onglet, la section et la vignette : les trois
 * lisent cette même fonction.
 *
 * Ne recense **que des actions gratuites**. Une amélioration payable n'y entre
 * pas : les crédits rentrent en continu, le point serait allumé en permanence,
 * et un point toujours allumé ne dit plus rien.
 */
export interface Attention {
  /** Coffres en attente, tous types confondus — la pastille chiffrée. */
  coffres: number;
  /** Piles marquées : dominantes **ou** fusionnables. Clés `model:rank`. */
  stacks: Set<string>;
  /** Emplacements dont une pile marquée relève — les filtres de l'inventaire. */
  markedSlots: Set<Slot>;
  /** Emplacements dont la pièce équipée est **battue** — les lignes de la pile
   *  en Forge. Distinct de `markedSlots` : fusionner ne change pas la toupie
   *  montée, il n'y a donc rien à faire sur la ligne. */
  betterSlots: Set<Slot>;
  /** Un Fondateur attend d'être réclamé. */
  toupies: boolean;
}

export function stackKey(model: string, rank: number): string {
  return `${model}:${rank}`;
}

/** La toupie sur laquelle porte l'achat : celle de l'arène tant que le run vit,
 *  celle qui attend une fois la descente perdue — `resetRun` la montera au clic.
 *  La Forge et `attention` doivent lire la même, sinon le point rouge et la
 *  ligne « avant → après » juste à côté se contrediraient. */
export function shoppingToupie(meta: MetaState, run: RunState): ToupieId {
  return run.phase === 'dead' ? meta.toupies.active : run.toupie;
}

export function attention(meta: MetaState, toupie: ToupieId): Attention {
  const stacks = new Set<string>();
  const markedSlots = new Set<Slot>();
  const betterSlots = new Set<Slot>();

  for (const stack of meta.inventory) {
    // `levels[0]` est le meilleur exemplaire — celui que `equipFromStack`
    // monterait réellement (`takePiece` sort toujours la tête de pile).
    const better = dominatesEquipped(meta, toupie, stack.model, stack.rank, stack.levels[0]);
    const fusable = canFuse(meta, stack.model, stack.rank);
    if (!better && !fusable) continue;
    const slot = modelById(stack.model).slot;
    stacks.add(stackKey(stack.model, stack.rank));
    markedSlots.add(slot);
    if (better) betterSlots.add(slot);
  }

  return {
    coffres: pendingTotal(meta),
    stacks,
    markedSlots,
    betterSlots,
    toupies: canClaimFounderGift(meta),
  };
}
```

- [ ] **Step 4: Lancer le test, vérifier qu'il passe**

```bash
npx vitest run src/ui/attention.test.ts
```

Attendu : 8 tests PASS.

- [ ] **Step 5: Prouver les tests par mutation**

| Mutation dans `src/ui/attention.ts` | Test qui doit rougir |
|---|---|
| `if (better \|\| fusable) betterSlots.add(slot);` | « marque une pile fusionnable, sans allumer sa ligne d’emplacement » |
| supprimer la ligne `if (better) betterSlots.add(slot);` | « marque une pile dominante et allume sa ligne d’emplacement » |
| retirer le `if (!better && !fusable) continue;` | « ignore une pile ni dominante ni fusionnable » |
| `stack.levels[stack.levels.length - 1]` au lieu de `stack.levels[0]` | « compare le meilleur exemplaire de la pile » |
| `coffres: 0` | « compte les coffres en attente » |

Une mutation à la fois, relancer, constater le rouge, restaurer.

- [ ] **Step 6: Vérifier la suite complète**

```bash
npm run test && npm run build
```

- [ ] **Step 7: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add src/ui/attention.ts src/ui/attention.test.ts
git status --short
git commit -m "feat(ui): un instantané de ce qui attend le joueur, dérivé de l'état"
```

---

### Task 4: Le jeton `alert` et le composant `AlertDot`

**Files:**
- Modify: `src/theme.ts` (dans `PALETTE`, après `ember`)
- Create: `src/ui/art/AlertDot.tsx`
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts`

**Interfaces:**
- Consumes: rien des tâches précédentes
- Produces :
  ```tsx
  export function AlertDot({ label, count, top, right }: {
    label: string; count?: number; top?: number; right?: number;
  }): JSX.Element
  ```
  Clés i18n `alert.todo`, `alert.better`, `alert.fusable`, `alert.gift`. Les tâches 5 à 8 les consomment.

- [ ] **Step 1: Ajouter le jeton**

Dans `src/theme.ts`, à l'intérieur de `PALETTE`, juste après `ember: 0xffc24a,` :

```ts
  /** Le point « quelque chose t'attend ici ». Distinct de `zoneSpike` et de
   *  `bot`, qui vivent dans l'arène : celui-ci ne se rencontre que dans les
   *  menus et sur la barre d'onglets. */
  alert: 0xff3b30,
```

`applyThemeToDocument` parcourt `Object.entries(PALETTE)` : la variable `--alert` est injectée sans autre changement.

- [ ] **Step 2: Ajouter les quatre clés, dans les deux catalogues**

Dans `src/i18n/fr.ts`, après le bloc `tab.*` (ligne 18) :

```ts
  // Étiquettes du point rouge. Il porte une information, pas un décor : sans
  // `aria-label`, un lecteur d'écran ne voit rien du tout.
  'alert.todo': 'quelque chose à faire',
  'alert.better': 'meilleure que celle équipée',
  'alert.fusable': 'fusionnable',
  'alert.gift': 'un Fondateur t’attend',
```

Dans `src/i18n/en.ts`, à la position correspondante :

```ts
  'alert.todo': 'something to do',
  'alert.better': 'better than equipped',
  'alert.fusable': 'ready to fuse',
  'alert.gift': 'a Founder is waiting',
```

- [ ] **Step 3: Écrire le composant**

Créer `src/ui/art/AlertDot.tsx` :

```tsx
/**
 * Le point rouge : « quelque chose t'attend ici ».
 *
 * Il ne marque que des actions **gratuites** — coffre à ouvrir, fusion possible,
 * pièce dominante à équiper, Fondateur à réclamer. Jamais un achat : les crédits
 * rentrent en continu, un point « tu peux payer » resterait allumé en permanence
 * et ne dirait plus rien.
 *
 * Le cerne sombre n'est pas un ornement. Sur l'onglet actif le fond est
 * `--ember` : du rouge posé sur de l'orange ne se voit pas. Le cerne détache le
 * point de ses deux fonds possibles.
 *
 * L'appelant doit porter `position: relative`.
 */
export function AlertDot({
  label, count, top = 4, right = 6,
}: {
  /** Ce que le point veut dire, pour les lecteurs d'écran. */
  label: string;
  /** Absent : un point nu. Présent : la pastille chiffrée. */
  count?: number;
  top?: number;
  right?: number;
}) {
  const base = {
    position: 'absolute' as const, top, right, zIndex: 1, boxSizing: 'border-box' as const,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    borderRadius: 999, background: 'var(--alert)', border: '1.5px solid var(--ink)',
  };

  if (count === undefined) {
    return <span role="img" aria-label={label} style={{ ...base, width: 11, height: 11 }} />;
  }

  return (
    <span
      role="img"
      aria-label={label}
      style={{
        ...base, minWidth: 18, height: 18, padding: '0 4px',
        color: 'var(--text)', fontSize: 11,
        fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontVariantNumeric: 'tabular-nums',
      }}
    >
      {count}
    </span>
  );
}
```

- [ ] **Step 4: Vérifier la compilation et la suite**

```bash
npm run test && npm run build
```

Attendu : tout passe. `en.ts` étant typé `Record<MessageKey, string>`, une clé oubliée d'un côté ferait échouer `tsc` — c'est la vérification.

- [ ] **Step 5: Prouver que le typage des clés mord**

Commenter temporairement `'alert.gift'` dans `src/i18n/en.ts`, lancer `npm run build`.
Attendu : ÉCHEC de `tsc` sur la propriété manquante. Restaurer, relancer, ça passe.

- [ ] **Step 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add src/theme.ts src/ui/art/AlertDot.tsx src/i18n/fr.ts src/i18n/en.ts
git status --short
git commit -m "feat(ui): le point rouge, son jeton de couleur et ses étiquettes"
```

---

### Task 5: Les points de la barre d'onglets

**Files:**
- Modify: `src/ui/TabBar.tsx:56-116`
- Modify: `src/ui/App.tsx:3` (import), `:147` (rendu de `TabBar`)

**Interfaces:**
- Consumes: `Attention`, `attention`, `shoppingToupie` (tâche 3) ; `AlertDot` (tâche 4)
- Produces: `TabBar` prend désormais `att: Attention` au lieu de `pending: number`. `App` expose la variable locale `att`, que les tâches 7 et 8 passeront à `ForgeScreen`.

- [ ] **Step 1: Remplacer la prop `pending` de `TabBar`**

Dans `src/ui/TabBar.tsx`, la ligne 1 importe déjà `t`, `tn` et `MessageKey` :
**ne pas la toucher**. Ajouter seulement les deux imports manquants, juste
en dessous :

```ts
import { AlertDot } from './art/AlertDot';
import type { Attention } from './attention';
```

Signature :

```tsx
export function TabBar({
  tab, onChange, att, floating,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  /** Ce qui attend le joueur — la barre en est le premier niveau d'affichage. */
  att: Attention;
  /** En combat, la barre se pose SUR l'arène plein écran, sur un voile dégradé. */
  floating: boolean;
}) {
```

- [ ] **Step 2: Remplacer la pastille codée en dur par le composant**

Dans `src/ui/TabBar.tsx`, remplacer tout le bloc `{key === 'coffres' && pending > 0 ? (…) : null}` (lignes 100-112) par :

```tsx
            {key === 'coffres' && att.coffres > 0 ? (
              <AlertDot label={tn('tab.chestsBadge', att.coffres)} count={att.coffres} />
            ) : null}
            {key === 'forge' && att.stacks.size > 0 ? <AlertDot label={t('alert.todo')} /> : null}
            {key === 'toupies' && att.toupies ? <AlertDot label={t('alert.gift')} /> : null}
```

Le `<button>` porte déjà `position: 'relative'` (ligne 86) : rien à ajouter.

- [ ] **Step 3: Calculer `attention` dans `App` et le passer**

Dans `src/ui/App.tsx` :

Remplacer l'import de la ligne 3

```ts
import { pendingTotal } from '../sim/meta';
```

par

```ts
import { attention, shoppingToupie } from './attention';
```

Puis, juste avant le `return` (après la déclaration de `overlay`, ligne 58), ajouter :

```tsx
  // Recalculé à chaque rendu : le point rouge est dérivé de l'état, jamais
  // stocké. Le coût est une passe sur l'inventaire — l'arbre n'a de toute façon
  // aucun `memo`, il se repropage entier à chaque tick.
  const att = attention(metaRef.current, shoppingToupie(metaRef.current, runRef.current));
```

Et remplacer la ligne 147 :

```tsx
      <TabBar tab={tab} onChange={setTab} att={att} floating={combat} />
```

- [ ] **Step 4: Vérifier la compilation et la suite**

```bash
npm run test && npm run build
```

Attendu : tout passe. Si `tsc` signale que `pendingTotal` n'est plus utilisé, c'est que l'import de l'étape 3 n'a pas été remplacé mais ajouté — le corriger.

- [ ] **Step 5: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add src/ui/TabBar.tsx src/ui/App.tsx
git status --short
git commit -m "feat(ui): la barre d'onglets porte les points de ce qui attend"
```

---

### Task 6: Le point sur les coffres du butin

**Files:**
- Modify: `src/ui/ChestScreen.tsx:164-186`

**Interfaces:**
- Consumes: `AlertDot` (tâche 4). Aucune prop nouvelle : l'écran lit déjà `meta.pending[kind]`.
- Produces: rien de consommé ailleurs.

- [ ] **Step 1: Importer le composant**

Dans `src/ui/ChestScreen.tsx`, après l'import de `ChestIcon` (ligne 11) :

```ts
import { AlertDot } from './art/AlertDot';
```

- [ ] **Step 2: Poser le point sur chaque coffre de butin**

Dans le bouton de butin (le `<button>` de la ligne 165, qui porte déjà
`position: 'relative'`), après la pastille chiffrée existante et avant `</button>` :

```tsx
                <AlertDot label={t('alert.todo')} top={-2} right={-4} />
```

Le coin haut-droit est libre — le compte occupe le coin bas-droit. Les décalages
négatifs sortent le point de la vignette de 58 px, sinon il mord sur le couvercle
du coffre.

**Ne rien poser sur les cartes d'achat** (le `CHEST_LIST.map` de la ligne 191) :
acheter n'est pas une action gratuite.

- [ ] **Step 3: Vérifier la compilation et la suite**

```bash
npm run test && npm run build
```

- [ ] **Step 4: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add src/ui/ChestScreen.tsx
git status --short
git commit -m "feat(coffres): un point rouge sur le butin, jamais sur un achat"
```

---

### Task 7: Les points de l'inventaire

**Files:**
- Modify: `src/ui/InventoryPanel.tsx:50-167`
- Modify: `src/ui/ForgeScreen.tsx:36-52` (signature) et `:131-134` (rendu de `InventoryPanel`)
- Modify: `src/ui/App.tsx:143` (rendu de `ForgeScreen`)

**Interfaces:**
- Consumes: `Attention`, `stackKey` (tâche 3) ; `AlertDot` (tâche 4) ; la variable `att` de `App` (tâche 5)
- Produces: `ForgeScreen` accepte désormais `att: Attention`. La tâche 8 s'en sert pour les lignes de la pile.

- [ ] **Step 1: Faire descendre `att` jusqu'à l'inventaire**

Dans `src/ui/App.tsx`, ligne 143 :

```tsx
      {tab === 'forge' ? <ForgeScreen metaRef={metaRef} runRef={runRef} att={att} onChanged={metaChanged} /> : null}
```

Dans `src/ui/ForgeScreen.tsx`, ajouter l'import et la prop :

```ts
import type { Attention } from './attention';
```

```tsx
export function ForgeScreen({
  metaRef, runRef, att, onChanged,
}: {
  metaRef: { current: MetaState };
  runRef: { current: RunState };
  /** Ce qui attend le joueur, calculé une fois par `App`. */
  att: Attention;
  onChanged: () => void;
}) {
```

et la transmettre (remplacer le bloc `<InventoryPanel …>` des lignes 131-134) :

```tsx
      <InventoryPanel
        metaRef={metaRef}
        att={att}
        onChanged={() => { syncRunStats(runRef.current, metaRef.current); onChanged(); }}
      />
```

- [ ] **Step 2: Accepter la prop dans `InventoryPanel`**

Dans `src/ui/InventoryPanel.tsx`, ajouter les imports :

```ts
import { AlertDot } from './art/AlertDot';
import { stackKey, type Attention } from './attention';
```

et la signature :

```tsx
export function InventoryPanel({
  metaRef, att, onChanged,
}: {
  metaRef: { current: MetaState };
  att: Attention;
  onChanged: () => void;
}) {
```

- [ ] **Step 3: Poser le point sur les filtres**

Le bouton « Tous » (lignes 89-100) reçoit `position: 'relative'` dans son style,
et juste avant sa fermeture `</button>` :

```tsx
          {t('filter.all')}
          {att.stacks.size > 0 ? <AlertDot label={t('alert.todo')} top={2} right={2} /> : null}
```

Chaque bouton d'emplacement (lignes 101-116) reçoit lui aussi `position: 'relative'`
dans son style, et avant sa fermeture :

```tsx
            <PieceIcon model={SLOT_EMBLEM[slot]} rank={1} size={26} />
            {att.markedSlots.has(slot) ? <AlertDot label={t('alert.todo')} top={2} right={2} /> : null}
```

- [ ] **Step 4: Poser le point sur les vignettes**

Dans le `stacks.map` (lignes 126-166), le bouton porte déjà
`position: 'relative'`. Ajouter, après le halo `fusable` :

```tsx
              {att.stacks.has(stackKey(s.model, s.rank)) ? (
                <AlertDot label={t(fusable ? 'alert.fusable' : 'alert.better')} top={2} right={4} />
              ) : null}
```

Un seul point, même quand la pile est à la fois fusionnable et dominante : elle
attend **une** action, peu importe laquelle. Le halo vert continue de dire
laquelle.

- [ ] **Step 5: Vérifier la compilation et la suite**

```bash
npm run test && npm run build
```

- [ ] **Step 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add src/ui/App.tsx src/ui/ForgeScreen.tsx src/ui/InventoryPanel.tsx
git status --short
git commit -m "feat(inventaire): les filtres et les vignettes portent leur point"
```

---

### Task 8: La pile de la Forge

C'est le cœur du lot. La grille 2×2 devient cinq lignes empilées dans l'ordre où
les pièces se posent sur le portrait dessiné juste au-dessus.

**Files:**
- Modify: `src/ui/ForgeScreen.tsx` (tout le corps de rendu, lignes 29-135)
- Modify: `src/ui/App.tsx:143` (nouvelle prop `onGoToToupies`)
- Modify: `src/i18n/fr.ts`, `src/i18n/en.ts` (deux clés)

**Interfaces:**
- Consumes: `Attention`, `shoppingToupie` (tâche 3) ; `AlertDot` (tâche 4) ; `toupieLabel` (`src/ui/contentLabels.ts`) ; `typeLabel` (`src/ui/typeLabels.ts`) ; `toupieById` (`src/content/toupies.ts`) ; `ToupiePortrait` (`src/ui/art/ToupiePortrait.tsx`)
- Produces: rien de consommé ailleurs.

- [ ] **Step 1: Ajouter les deux clés, dans les deux catalogues**

`src/i18n/fr.ts`, à côté des autres `slot.*` et `forge.*` :

```ts
  'slot.chassis': 'Châssis',
  'forge.changeToupie': 'Changer de toupie',
```

`src/i18n/en.ts`, aux positions correspondantes :

```ts
  'slot.chassis': 'Chassis',
  'forge.changeToupie': 'Change top',
```

- [ ] **Step 2: Remettre `SLOTS` dans l'ordre du portrait**

Dans `src/ui/ForgeScreen.tsx`, remplacer le tableau `SLOTS` (lignes 29-34) :

```ts
/** Des clés et non des chaînes : une table de libellés construite au chargement
 *  du module resterait figée dans la langue du démarrage.
 *
 *  **L'ordre est celui du portrait**, pas celui du modèle de données :
 *  `drawToupiePortrait` pose la Lame en haut, le Noyau en façade au creux de la
 *  couronne, puis le Disque, puis la Pointe. Une grille 2×2 ne disait rien de
 *  cette géométrie ; la pile la rend lisible sans un mot. */
const SLOTS: SlotRow[] = [
  { key: 'lame', label: 'slot.lame', axis: 'attack', read: (s) => s.attack },
  { key: 'noyau', label: 'slot.noyau', axis: 'spinMax', read: (s) => s.spinMax },
  { key: 'disque', label: 'slot.disque', axis: 'defense', read: (s) => s.defense },
  { key: 'pointe', label: 'slot.pointe', axis: 'maxSpeed', read: (s) => s.maxSpeed },
];
```

- [ ] **Step 3: Ajouter les imports et la prop `onGoToToupies`**

En tête de `src/ui/ForgeScreen.tsx` :

```ts
import { toupieById } from '../content/toupies';
import { modelLabel, toupieLabel } from './contentLabels';
import { typeLabel } from './typeLabels';
import { AlertDot } from './art/AlertDot';
import { shoppingToupie, type Attention } from './attention';
```

(l'import existant `import { modelLabel } from './contentLabels';` est remplacé
par celui ci-dessus, qui apporte les deux.)

Signature :

```tsx
export function ForgeScreen({
  metaRef, runRef, att, onGoToToupies, onChanged,
}: {
  metaRef: { current: MetaState };
  runRef: { current: RunState };
  att: Attention;
  /** La ligne Châssis mène à l'onglet Toupies. Un rappel, et non l'onglet
   *  lui-même : la Forge n'a pas à connaître la liste des onglets. */
  onGoToToupies: () => void;
  onChanged: () => void;
}) {
```

Et remplacer le calcul de `toupie` (lignes 43-49, commentaire compris) par
l'appel partagé. **Les deux lignes suivantes ne bougent pas** : `before` et
`talents` restent tels quels, la pile les lit encore.

```tsx
  const meta = metaRef.current;
  const toupie = shoppingToupie(meta, runRef.current);
  const before = playerStats(meta, toupie);
  const talents = SLOTS.flatMap((row) => talentsOf(row.key, meta.equipped[row.key].rank));
```

Dans `src/ui/App.tsx`, ligne 143 :

```tsx
      {tab === 'forge' ? (
        <ForgeScreen
          metaRef={metaRef} runRef={runRef} att={att}
          onGoToToupies={() => setTab('toupies')} onChanged={metaChanged}
        />
      ) : null}
```

- [ ] **Step 4: Remplacer la grille par la pile**

Dans `src/ui/ForgeScreen.tsx`, ajouter au-dessus du composant le style partagé
des lignes :

```ts
/** Le gabarit commun aux cinq lignes. Elles doivent se lire comme une pile
 *  d'objets, pas comme cinq cartes voisines : même hauteur de vignette, même
 *  gouttière, même fond. */
const ROW = {
  position: 'relative' as const, textAlign: 'left' as const, padding: 8,
  borderRadius: 11, border: '1px solid var(--line)', background: 'var(--panel)',
  display: 'flex', gap: 10, alignItems: 'center', width: '100%',
  boxSizing: 'border-box' as const,
};
```

Puis remplacer tout le bloc `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>…</div>`
(lignes 85-129) par :

```tsx
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Le châssis n'est pas un cran de la pile : c'est la pièce qui porte
            toutes les autres, et la seule qui ne s'achète pas ici. Il ouvre la
            liste, sans colonne de prix, et mène là où on en change. */}
        <button onClick={onGoToToupies} aria-label={t('forge.changeToupie')} style={{ ...ROW, cursor: 'pointer', color: 'var(--text)' }}>
          <ToupiePortrait art={playerArt(meta.equipped, toupie)} size={54} />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: '1 1 0' }}>
            <span style={{ font: '500 14px Oswald, ui-sans-serif, sans-serif' }}>{t('slot.chassis')}</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {toupieLabel(toupie)}
            </span>
          </span>
          <span
            style={{
              padding: '2px 9px', borderRadius: 999, fontSize: 11.5, whiteSpace: 'nowrap',
              border: `1px solid var(--type-${toupieById(toupie).type})`,
              color: `var(--type-${toupieById(toupie).type})`,
            }}
          >
            {typeLabel(toupieById(toupie).type)}
          </span>
          <span aria-hidden="true" style={{ color: 'var(--muted)', fontSize: 18 }}>›</span>
        </button>

        <div style={{ height: 1, background: 'var(--line)', margin: '2px 0' }} />

        {SLOTS.map((row) => {
          const piece = meta.equipped[row.key];
          const cost = upgradeCost(piece.level);
          const after = row.read(
            playerStats({ ...meta, equipped: { ...meta.equipped, [row.key]: { ...piece, level: piece.level + 1 } } }, toupie),
          );
          const affordable = meta.credits >= cost;
          return (
            // Le point est HORS du bouton : il annonce une action gratuite
            // (équiper), pas l'achat. Dedans, il s'éteindrait à moitié avec le
            // bouton grisé quand les crédits manquent — exactement le moment où
            // le joueur a le plus besoin de savoir qu'il a mieux en réserve.
            <div key={row.key} style={{ position: 'relative' }}>
              <button
                disabled={!affordable}
                onClick={() => {
                  if (tryUpgrade(metaRef.current, row.key)) {
                    syncRunStats(runRef.current, metaRef.current);
                    onChanged();
                  }
                }}
                style={{
                  ...ROW, cursor: affordable ? 'pointer' : 'default',
                  color: affordable ? 'var(--text)' : 'var(--muted)', opacity: affordable ? 1 : 0.55,
                }}
              >
                <PieceIcon model={piece.model} rank={piece.rank} size={54} tile />
                <span style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: '1 1 0' }}>
                  <span style={{ font: '500 14px Oswald, ui-sans-serif, sans-serif' }}>
                    {t(row.label)}{' '}
                    <span style={{ color: 'var(--muted)' }}>{t('forge.level', { n: piece.level })}</span>
                  </span>
                  <span style={{ fontSize: 11, color: `var(--rank-${rankTier(piece.rank)})`, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {modelLabel(piece.model)}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {axisAbbr(row.axis)} {formatCredits(row.read(before))} → <span style={{ color: 'var(--text)' }}>{formatCredits(after)}</span>
                  </span>
                </span>
                <span style={{ font: '600 15px Oswald, ui-sans-serif, sans-serif', color: 'var(--ember)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                  {formatCredits(cost)}
                </span>
              </button>
              {att.betterSlots.has(row.key) ? <AlertDot label={t('alert.better')} /> : null}
            </div>
          );
        })}
      </div>
```

- [ ] **Step 5: Vérifier la compilation et la suite**

```bash
npm run test && npm run build
```

Attendu : tout passe. Si `tsc` signale `runRef` inutilisé, c'est que l'étape 3 a
laissé l'ancien calcul de `toupie` en place — le supprimer (`runRef` reste utilisé
par `syncRunStats` et par `shoppingToupie`).

- [ ] **Step 6: Commit**

```bash
git rev-parse --abbrev-ref HEAD
git add src/ui/ForgeScreen.tsx src/ui/App.tsx src/i18n/fr.ts src/i18n/en.ts
git status --short
git commit -m "feat(forge): les emplacements s'empilent dans l'ordre de la toupie"
```

---

### Task 9: Vérification en navigateur et garde-fous

Aucun code. C'est la tâche qui décide si le lot est fini. **Elle ne se délègue
pas** : il faut voir les écrans soi-même.

**Files:** aucun (sauf correctifs découverts ici, à commiter séparément).

- [ ] **Step 1: Vérifier que la simulation n'a pas bougé**

```bash
npm run calibrate
```

Attendu, à l'identique d'avant le lot : chapitre 1 à **23 runs / 1,91 h**, premier
coffre d'Arène **0,78 h** après validation, **salle 10 la plus meurtrière**. Toute
dérive signale qu'on a modifié la simulation par accident — arrêter et chercher.

- [ ] **Step 2: Vérifier qu'aucun fichier interdit n'a bougé**

```bash
git diff --stat origin/main...guidage-joueur
```

Attendu : **aucune** ligne pour `src/sim/save.ts`, `src/sim/types.ts`,
`src/sim/meta.ts`, `src/content/balance.json`.

- [ ] **Step 3: Lancer le serveur**

```bash
npm run dev
```

Lire la ligne « Local: » — **le port n'est pas 5173**, une autre session l'occupe.
Ouvrir `http://localhost:<port>/spinforge/` (la racine renvoie 404, la base est
`/spinforge/`).

- [ ] **Step 4: Dérouler le parcours**

1. Partie neuve : **aucun point rouge nulle part**.
2. Finir une salle ⇒ un coffre tombe ⇒ point rouge **chiffré** sur l'onglet
   Coffres, et point sur la vignette de butin dans l'écran Coffres.
3. Ouvrir le coffre ⇒ les deux points s'éteignent **sans changer d'écran**.
4. Si le tirage donne une pièce dominante ⇒ point sur l'onglet Forge, sur le
   filtre de son emplacement, sur sa vignette, et sur la ligne d'emplacement de
   la pile — **même quand les crédits manquent pour l'améliorer** (le point est
   hors du bouton grisé).
5. Équiper la pièce ⇒ les quatre points s'éteignent d'un coup ; le portrait et le
   radar changent.
6. La pile se lit Châssis, Lame, Noyau, Disque, Pointe, et chaque ligne est à la
   hauteur de sa pièce sur le portrait au-dessus.
7. Taper la ligne Châssis ⇒ l'onglet Toupies s'ouvre.
8. Bouton FR/EN : aucune chaîne ne reste en français côté anglais — vérifier
   « Chassis » et « Change top » dans la Forge.
9. Passer en combat : la barre flottante montre toujours ses points, et le rouge
   d'alerte ne se confond pas avec les pointes de l'arène.
10. Valider le chapitre ⇒ point rouge sur l'onglet Toupies ; réclamer le
    Fondateur ⇒ il s'éteint.

Pour atteindre le boss sans jouer dix minutes, réutiliser la méthode de
`scripts/verrou.mjs` : `page.addInitScript` qui enveloppe `requestAnimationFrame`
pour avancer un temps virtuel de 240 ms par image (documenté dans
`docs/ameliorations.md`, section « Comment mesurer »).

- [ ] **Step 5: Consigner le résultat**

Dans `docs/ameliorations.md`, section « Session du 2026-09-01 — guider le
joueur », passer les entrées 🔧 du lot 1 en ✅, et **ajouter toute anomalie vue à
l'écran** comme entrée 📋. Commit :

```bash
git rev-parse --abbrev-ref HEAD
git add docs/ameliorations.md
git status --short
git commit -m "docs: le lot 1 du guidage vérifié en navigateur"
```

- [ ] **Step 6: Relire la branche entière**

Avant de proposer la fusion, relire `git diff origin/main...guidage-joueur` d'un
bloc — pas tâche par tâche. C'est à ce niveau, et à ce niveau seulement, qu'on
voit les incohérences entre tâches (deux étiquettes pour la même chose, un style
dupliqué, une prop qui traverse trois composants sans servir).

- [ ] **Step 7: Refaire le point avant de fusionner**

```bash
git -C ../B-Blades_versus rev-parse --abbrev-ref HEAD
git -C ../B-Blades_versus status --short
git log --oneline origin/main..main
git merge-base --is-ancestor guidage-joueur main && echo "DÉJÀ CONTENUE"
```

`jalon-3-lot-a` touche `src/ui/App.tsx` et `src/ui/ForgeScreen.tsx`. Si cette
branche a été fusionnée entre-temps, **rebaser `guidage-joueur` sur `main`** et
re-dérouler les étapes 1 à 4 : leur panneau « Choisis ta descente » remplace le
bouton « Retenter », donc la condition `run.phase === 'dead'` que `shoppingToupie`
reprend peut avoir changé de forme. Demander au user avant de fusionner.

---

## Notes de relecture du plan

**Couverture de la spec** — chaque section a sa tâche :

| Section de la spec | Tâche |
|---|---|
| §1.2 la disposition, ordre du portrait | 8 |
| §1.2 ligne Châssis, `onGoToToupies` | 8 |
| §2.1 signal dérivé, aucun champ de sauvegarde | 3 (et vérifié en 9, étape 2) |
| §2.2 `dominatesEquipped`, les sept axes | 2 |
| §2.2 `HIGHER_IS_BETTER` source unique | 1 |
| §2.2 niveau `levels[0]`, toupie de l'achat | 3 (`shoppingToupie`, test « meilleur exemplaire ») |
| §2.3 `attention()` | 3 |
| §2.4 carte des points — onglets | 5 |
| §2.4 carte des points — butin | 6 |
| §2.4 carte des points — inventaire et filtres | 7 |
| §2.4 carte des points — lignes de la pile | 8 |
| §2.4 rien sur les achats | 6 (explicite) et 8 (le point est hors du bouton) |
| §2.5 jeton `alert`, `AlertDot`, le cerne | 4 |
| §2.6 les six clés | 4 (quatre `alert.*`) et 8 (`slot.chassis`, `forge.changeToupie`) |
| §4 tests et mutations | 1, 2, 3 |
| §5 vérification navigateur, calibrate | 9 |

**Écart assumé avec la spec** : §2.3 annonçait `slots: Set<Slot>`. Le plan livre
`markedSlots` **et** `betterSlots` (tâche 3), parce que le filtre de l'inventaire
et la ligne de la pile ne répondent pas à la même question. La spec est à jour
sur l'intention, le plan l'est sur les noms.
