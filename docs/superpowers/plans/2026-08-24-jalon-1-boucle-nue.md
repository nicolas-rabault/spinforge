# Jalon 1 — La Boucle Nue : Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un premier SpinForge jouable dans le navigateur : on pilote sa toupie au doigt, on vide 10 salles (boss en 10ᵉ) dans le Hangar Rouillé, on gagne des crédits et on améliore ses 4 pièces — sur une simulation 100 % déterministe à tick fixe.

**Architecture:** Cœur de simulation pur dans `src/sim/` (aucun import DOM/Pixi/React, RNG sérialisé dans l'état, tick fixe 100 ms) ; PixiJS (`src/render/`) et React (`src/ui/`) sont des spectateurs qui lisent l'état et n'écrivent que via les fonctions de `src/sim/`.

**Tech Stack:** TypeScript strict, Vite, Vitest, PixiJS 8, React 19.

**Spec:** `docs/game-design.md` (+ règles d'architecture dans `CLAUDE.md`).

## Global Constraints

- `src/sim/` : interdits — `Date`, `Math.random`, imports DOM/Pixi/React. Tout aléa passe par `nextRandom(rngState)`.
- Tick fixe : `TICK_S = 0.1` (100 ms). Déterminisme testé : même seed + mêmes inputs ⇒ `JSON.stringify` identiques.
- Tous les chiffres d'équilibrage dans `src/sim/config.ts`, jamais en dur ailleurs.
- Courbes de la spec : `coût(niveau) = 100 × 1,08^niveau` ; `revenu(salle) = 20 × 1,12^(salle−1)`, boss ×5.
- Un chapitre = 10 salles, la 10ᵉ est le boss. Mort → retour salle 1, crédits conservés.
- Textes joueur en français. Aucun nom officiel Beyblade nulle part.
- Tests Vitest colocalisés `src/sim/*.test.ts`, imports explicites depuis `vitest` (pas de globals).
- TypeScript strict + `noUnusedLocals` : ne jamais laisser d'import ou de variable inutilisés.

---

### Task 1: Scaffold Vite + React + Vitest

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`

**Interfaces:**
- Consumes: rien (repo vide côté code).
- Produces: `npm run dev` / `npm run test` / `npm run build` fonctionnels pour toutes les tâches suivantes.

- [ ] **Step 1: Écrire `package.json`**

```json
{
  "name": "spinforge",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "pixi.js": "^8.6.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0"
  }
}
```

- [ ] **Step 2: Écrire `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Écrire `vite.config.ts`**

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
```

- [ ] **Step 4: Écrire `index.html`**

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>SpinForge</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Écrire `src/main.tsx` (placeholder, remplacé en Task 9)**

```tsx
import { createRoot } from 'react-dom/client';

createRoot(document.getElementById('root')!).render(<h1>SpinForge</h1>);
```

- [ ] **Step 6: Installer et vérifier**

Run: `npm install && npm run build`
Expected: build Vite vert, aucune erreur TypeScript.

Run: `npx vitest run --passWithNoTests`
Expected: "No test files found" toléré, exit 0.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json vite.config.ts index.html src/main.tsx
git commit -m "feat: scaffold Vite + React + Vitest pour SpinForge"
```

---

### Task 2: RNG déterministe sérialisable

**Files:**
- Create: `src/sim/rng.ts`
- Test: `src/sim/rng.test.ts`

**Interfaces:**
- Produces: `nextRandom(state: number): { value: number; state: number }` — `value` ∈ [0, 1), pur, l'état suivant se stocke dans `SimState.rngState`.

- [ ] **Step 1: Écrire le test qui échoue**

```ts
import { describe, expect, it } from 'vitest';
import { nextRandom } from './rng';

describe('nextRandom', () => {
  it('est déterministe pour un même état', () => {
    expect(nextRandom(42)).toEqual(nextRandom(42));
  });

  it('produit des séquences différentes selon la graine', () => {
    expect(nextRandom(42).value).not.toBe(nextRandom(7).value);
  });

  it('reste dans [0, 1) sur 1000 tirages chaînés', () => {
    let s = 1;
    for (let i = 0; i < 1000; i++) {
      const r = nextRandom(s);
      expect(r.value).toBeGreaterThanOrEqual(0);
      expect(r.value).toBeLessThan(1);
      s = r.state;
    }
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npm run test` — Expected: FAIL (`rng.ts` introuvable).

- [ ] **Step 3: Implémenter `src/sim/rng.ts` (mulberry32 à état explicite)**

```ts
export function nextRandom(state: number): { value: number; state: number } {
  const a = (state + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { value, state: a };
}
```

- [ ] **Step 4: Vérifier le vert** — Run: `npm run test` — Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/sim/rng.ts src/sim/rng.test.ts
git commit -m "feat: RNG mulberry32 pur a etat serialisable"
```

---

### Task 3: Config, types et économie

**Files:**
- Create: `src/sim/config.ts`, `src/sim/types.ts`, `src/sim/economy.ts`
- Test: `src/sim/economy.test.ts`

**Interfaces:**
- Consumes: rien.
- Produces (utilisés par toutes les tâches suivantes) :
  - `config.ts` : `TICK_S`, `ARENA_RADIUS`, `SALLES_PER_CHAPTER`, `FRICTION`, `WALL_RESTITUTION`, `RESTITUTION`, `DAMAGE_K`, `HEAL_BETWEEN_SALLES`, `PLAYER_BASE`, `BOT_BASE`, `BOT_SCALING`, `BOSS`, `ECON`.
  - `types.ts` : `Vec`, `Top`, `PieceLevels`, `Stats`, `Phase`, `Input`, `SimState`.
  - `economy.ts` : `upgradeCost(level: number): number`, `salleReward(salle: number, boss: boolean): number`, `playerStats(pieces: PieceLevels): Stats`, `syncPlayerStats(state: SimState): void`, `tryUpgrade(state: SimState, piece: keyof PieceLevels): boolean`.

- [ ] **Step 1: Écrire `src/sim/config.ts`**

```ts
export const TICK_S = 0.1;
export const ARENA_RADIUS = 150;
export const SALLES_PER_CHAPTER = 10;
export const FRICTION = 0.94;
export const WALL_RESTITUTION = 0.8;
export const RESTITUTION = 0.8;
export const DAMAGE_K = 0.35;
export const HEAL_BETWEEN_SALLES = 0.2;

export const PLAYER_BASE = { accel: 900, maxSpeed: 240, radius: 12, spinMax: 3000, spinDecay: 20, attack: 30, defense: 10 };
export const BOT_BASE = { accel: 500, maxSpeed: 140, radius: 12, spinMax: 1200, spinDecay: 12, attack: 18, defense: 6 };
export const BOT_SCALING = { spinPerSalle: 0.15, attackPerSalle: 0.08 };
export const BOSS = { spinMult: 4, attackMult: 1.5, radius: 18 };
export const ECON = { upgradeBase: 100, upgradeGrowth: 1.08, rewardBase: 20, rewardGrowth: 1.12, bossRewardMult: 5 };
```

- [ ] **Step 2: Écrire `src/sim/types.ts`**

```ts
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
}

export interface PieceLevels {
  noyau: number;
  lame: number;
  disque: number;
  pointe: number;
}

export interface Stats {
  attack: number;
  defense: number;
  maxSpeed: number;
  accel: number;
  spinMax: number;
  spinDecay: number;
}

export type Phase = 'fighting' | 'dead';

export interface Input {
  steer: Vec | null;
}

export interface SimState {
  tick: number;
  rngState: number;
  chapter: number;
  salle: number;
  credits: number;
  pieces: PieceLevels;
  player: Top;
  bots: Top[];
  phase: Phase;
  chapterValidated: boolean;
}
```

- [ ] **Step 3: Écrire le test qui échoue (`src/sim/economy.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { playerStats, salleReward, tryUpgrade, upgradeCost } from './economy';
import { PLAYER_BASE } from './config';
import type { SimState, Top } from './types';

function fakeState(credits: number): SimState {
  const player: Top = {
    id: 'player', isPlayer: true, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: PLAYER_BASE.radius,
    spin: PLAYER_BASE.spinMax, spinMax: PLAYER_BASE.spinMax, spinDecay: PLAYER_BASE.spinDecay,
    attack: PLAYER_BASE.attack, defense: PLAYER_BASE.defense,
    maxSpeed: PLAYER_BASE.maxSpeed, accel: PLAYER_BASE.accel,
  };
  return {
    tick: 0, rngState: 1, chapter: 1, salle: 1, credits,
    pieces: { noyau: 0, lame: 0, disque: 0, pointe: 0 },
    player, bots: [], phase: 'fighting', chapterValidated: false,
  };
}

describe('courbes', () => {
  it('coût = 100 × 1,08^niveau', () => {
    expect(upgradeCost(0)).toBe(100);
    expect(upgradeCost(10)).toBeCloseTo(215.89, 1);
  });

  it('revenu = 20 × 1,12^(salle−1), boss ×5', () => {
    expect(salleReward(1, false)).toBe(20);
    expect(salleReward(5, false)).toBeCloseTo(31.47, 2);
    expect(salleReward(10, true)).toBeCloseTo(277.31, 1);
  });
});

describe('pièces', () => {
  it('la Lame monte l’attaque de 10 % par niveau', () => {
    expect(playerStats({ noyau: 0, lame: 5, disque: 0, pointe: 0 }).attack).toBeCloseTo(PLAYER_BASE.attack * 1.5, 5);
  });

  it('niveau 0 = stats de base', () => {
    const s = playerStats({ noyau: 0, lame: 0, disque: 0, pointe: 0 });
    expect(s.attack).toBe(PLAYER_BASE.attack);
    expect(s.spinDecay).toBe(PLAYER_BASE.spinDecay);
  });
});

describe('tryUpgrade', () => {
  it('débite, incrémente le niveau et applique la stat au joueur', () => {
    const state = fakeState(100);
    expect(tryUpgrade(state, 'lame')).toBe(true);
    expect(state.credits).toBe(0);
    expect(state.pieces.lame).toBe(1);
    expect(state.player.attack).toBeCloseTo(PLAYER_BASE.attack * 1.1, 5);
  });

  it('refuse si crédits insuffisants', () => {
    const state = fakeState(50);
    expect(tryUpgrade(state, 'lame')).toBe(false);
    expect(state.pieces.lame).toBe(0);
    expect(state.credits).toBe(50);
  });
});
```

- [ ] **Step 4: Vérifier l'échec** — Run: `npm run test` — Expected: FAIL (`economy.ts` introuvable).

- [ ] **Step 5: Implémenter `src/sim/economy.ts`**

```ts
import { ECON, PLAYER_BASE } from './config';
import type { PieceLevels, SimState, Stats } from './types';

export function upgradeCost(level: number): number {
  return ECON.upgradeBase * Math.pow(ECON.upgradeGrowth, level);
}

export function salleReward(salle: number, boss: boolean): number {
  const base = ECON.rewardBase * Math.pow(ECON.rewardGrowth, salle - 1);
  return boss ? base * ECON.bossRewardMult : base;
}

export function playerStats(pieces: PieceLevels): Stats {
  return {
    attack: PLAYER_BASE.attack * (1 + 0.1 * pieces.lame),
    defense: PLAYER_BASE.defense * (1 + 0.1 * pieces.disque),
    maxSpeed: PLAYER_BASE.maxSpeed * (1 + 0.04 * pieces.pointe),
    accel: PLAYER_BASE.accel,
    spinMax: PLAYER_BASE.spinMax * (1 + 0.08 * pieces.noyau),
    spinDecay: PLAYER_BASE.spinDecay / (1 + 0.05 * pieces.pointe),
  };
}

export function syncPlayerStats(state: SimState): void {
  const stats = playerStats(state.pieces);
  state.player.attack = stats.attack;
  state.player.defense = stats.defense;
  state.player.maxSpeed = stats.maxSpeed;
  state.player.accel = stats.accel;
  state.player.spinMax = stats.spinMax;
  state.player.spinDecay = stats.spinDecay;
  state.player.spin = Math.min(state.player.spin, stats.spinMax);
}

export function tryUpgrade(state: SimState, piece: keyof PieceLevels): boolean {
  const cost = upgradeCost(state.pieces[piece]);
  if (state.credits < cost) return false;
  state.credits -= cost;
  state.pieces[piece]++;
  syncPlayerStats(state);
  return true;
}
```

- [ ] **Step 6: Vérifier le vert** — Run: `npm run test` — Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/sim/config.ts src/sim/types.ts src/sim/economy.ts src/sim/economy.test.ts
git commit -m "feat: config d'equilibrage, types de simulation et economie (courbes 1.08/1.12)"
```

---

### Task 4: Physique — pilotage, friction, rebond sur le mur

**Files:**
- Create: `src/sim/physics.ts`
- Test: `src/sim/physics.test.ts`

**Interfaces:**
- Consumes: `Top`, `Vec` (types.ts) ; `ARENA_RADIUS`, `FRICTION`, `TICK_S`, `WALL_RESTITUTION` (config.ts).
- Produces: `applySteering(top: Top, steer: Vec | null): void`, `moveAndBounce(top: Top): void`.

- [ ] **Step 1: Écrire le test qui échoue (`src/sim/physics.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { applySteering, moveAndBounce } from './physics';
import { ARENA_RADIUS, FRICTION, TICK_S } from './config';
import type { Top } from './types';

function top(over: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: 12, spin: 1000, spinMax: 1000, spinDecay: 10,
    attack: 10, defense: 10, maxSpeed: 240, accel: 900,
    ...over,
  };
}

describe('applySteering', () => {
  it('accélère dans la direction visée (normalisée)', () => {
    const t = top();
    applySteering(t, { x: 10, y: 0 });
    expect(t.vel.x).toBeCloseTo(900 * TICK_S, 5);
    expect(t.vel.y).toBe(0);
  });

  it('freine par friction quand on relâche', () => {
    const t = top({ vel: { x: 100, y: 0 } });
    applySteering(t, null);
    expect(t.vel.x).toBeCloseTo(100 * FRICTION, 5);
  });

  it('plafonne à maxSpeed', () => {
    const t = top({ vel: { x: 239, y: 0 } });
    applySteering(t, { x: 1, y: 0 });
    expect(Math.hypot(t.vel.x, t.vel.y)).toBeCloseTo(240, 5);
  });
});

describe('moveAndBounce', () => {
  it('avance de vel × TICK_S', () => {
    const t = top({ vel: { x: 50, y: -30 } });
    moveAndBounce(t);
    expect(t.pos.x).toBeCloseTo(5, 5);
    expect(t.pos.y).toBeCloseTo(-3, 5);
  });

  it('rebondit sur le bord et reste dans l’arène', () => {
    const t = top({ pos: { x: ARENA_RADIUS, y: 0 }, vel: { x: 100, y: 0 } });
    moveAndBounce(t);
    expect(t.pos.x).toBeCloseTo(ARENA_RADIUS - t.radius, 5);
    expect(t.vel.x).toBeLessThan(0);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npm run test` — Expected: FAIL (`physics.ts` introuvable).

- [ ] **Step 3: Implémenter `src/sim/physics.ts`**

```ts
import { ARENA_RADIUS, FRICTION, TICK_S, WALL_RESTITUTION } from './config';
import type { Top, Vec } from './types';

export function applySteering(top: Top, steer: Vec | null): void {
  if (steer) {
    const len = Math.hypot(steer.x, steer.y) || 1;
    top.vel.x += (steer.x / len) * top.accel * TICK_S;
    top.vel.y += (steer.y / len) * top.accel * TICK_S;
  } else {
    top.vel.x *= FRICTION;
    top.vel.y *= FRICTION;
  }
  const speed = Math.hypot(top.vel.x, top.vel.y);
  if (speed > top.maxSpeed) {
    const k = top.maxSpeed / speed;
    top.vel.x *= k;
    top.vel.y *= k;
  }
}

export function moveAndBounce(top: Top): void {
  top.pos.x += top.vel.x * TICK_S;
  top.pos.y += top.vel.y * TICK_S;
  const d = Math.hypot(top.pos.x, top.pos.y);
  const limit = ARENA_RADIUS - top.radius;
  if (d > limit && d > 0) {
    const nx = top.pos.x / d;
    const ny = top.pos.y / d;
    top.pos.x = nx * limit;
    top.pos.y = ny * limit;
    const dot = top.vel.x * nx + top.vel.y * ny;
    if (dot > 0) {
      top.vel.x -= (1 + WALL_RESTITUTION) * dot * nx;
      top.vel.y -= (1 + WALL_RESTITUTION) * dot * ny;
    }
  }
}
```

- [ ] **Step 4: Vérifier le vert** — Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/physics.ts src/sim/physics.test.ts
git commit -m "feat: physique de pilotage, friction et rebond dans l'arene circulaire"
```

---

### Task 5: Combat — collisions et dégâts de rotation

**Files:**
- Create: `src/sim/combat.ts`
- Test: `src/sim/combat.test.ts`

**Interfaces:**
- Consumes: `Top` (types.ts) ; `DAMAGE_K`, `RESTITUTION`, `TICK_S` (config.ts).
- Produces: `resolveCollision(a: Top, b: Top): void`, `decaySpin(top: Top): void`.

- [ ] **Step 1: Écrire le test qui échoue (`src/sim/combat.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { decaySpin, resolveCollision } from './combat';
import { TICK_S } from './config';
import type { Top } from './types';

function top(over: Partial<Top> = {}): Top {
  return {
    id: 't', isPlayer: false, aim: null,
    pos: { x: 0, y: 0 }, vel: { x: 0, y: 0 },
    radius: 12, spin: 1000, spinMax: 1000, spinDecay: 10,
    attack: 10, defense: 10, maxSpeed: 240, accel: 900,
    ...over,
  };
}

describe('decaySpin', () => {
  it('décroît de spinDecay × TICK_S', () => {
    const t = top({ spinDecay: 20 });
    decaySpin(t);
    expect(t.spin).toBeCloseTo(1000 - 20 * TICK_S, 5);
  });
});

describe('resolveCollision', () => {
  it('ne fait rien sans chevauchement', () => {
    const a = top();
    const b = top({ pos: { x: 100, y: 0 } });
    resolveCollision(a, b);
    expect(a.spin).toBe(1000);
    expect(b.spin).toBe(1000);
  });

  it('sépare, fait rebondir et échange des dégâts — l’attaquant fort gagne l’échange', () => {
    const a = top({ id: 'a', vel: { x: 100, y: 0 }, attack: 30, defense: 10 });
    const b = top({ id: 'b', pos: { x: 20, y: 0 }, attack: 18, defense: 6 });
    resolveCollision(a, b);
    const dist = Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y);
    expect(dist).toBeGreaterThanOrEqual(24 - 1e-9);
    expect(a.spin).toBeLessThan(1000);
    expect(b.spin).toBeLessThan(1000);
    expect(b.spin).toBeLessThan(a.spin); // 30/(30+6) > 18/(18+10)
    expect(b.vel.x).toBeGreaterThan(0); // b est poussé
  });

  it('ignore des toupies qui s’éloignent déjà', () => {
    const a = top({ vel: { x: -50, y: 0 } });
    const b = top({ pos: { x: 20, y: 0 }, vel: { x: 50, y: 0 } });
    resolveCollision(a, b);
    expect(a.spin).toBe(1000);
    expect(b.spin).toBe(1000);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npm run test` — Expected: FAIL (`combat.ts` introuvable).

- [ ] **Step 3: Implémenter `src/sim/combat.ts`**

```ts
import { DAMAGE_K, RESTITUTION, TICK_S } from './config';
import type { Top } from './types';

export function decaySpin(top: Top): void {
  top.spin -= top.spinDecay * TICK_S;
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
  const j = (-(1 + RESTITUTION) * vrel) / 2;
  a.vel.x -= j * nx;
  a.vel.y -= j * ny;
  b.vel.x += j * nx;
  b.vel.y += j * ny;
  const impact = -vrel;
  b.spin -= ((impact * a.attack) / (a.attack + b.defense)) * DAMAGE_K;
  a.spin -= ((impact * b.attack) / (b.attack + a.defense)) * DAMAGE_K;
}
```

- [ ] **Step 4: Vérifier le vert** — Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/combat.ts src/sim/combat.test.ts
git commit -m "feat: collisions elastiques et degats de rotation attaque/defense"
```

---

### Task 6: Salles — spawn des bots et boss

**Files:**
- Create: `src/sim/salle.ts`
- Test: `src/sim/salle.test.ts`

**Interfaces:**
- Consumes: `nextRandom` (rng.ts) ; `Top` (types.ts) ; `ARENA_RADIUS`, `BOSS`, `BOT_BASE`, `BOT_SCALING`, `SALLES_PER_CHAPTER` (config.ts).
- Produces: `botCountFor(salle: number): number`, `makeBot(salle: number, index: number, angle: number): Top`, `spawnSalle(salle: number, rngState: number): { bots: Top[]; rngState: number }`.

- [ ] **Step 1: Écrire le test qui échoue (`src/sim/salle.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { botCountFor, makeBot, spawnSalle } from './salle';
import { BOSS, BOT_BASE } from './config';

describe('botCountFor', () => {
  it('suit la table de la spec : 1-3→1, 4-6→2, 7-9→3, 10→1 boss', () => {
    expect(botCountFor(1)).toBe(1);
    expect(botCountFor(3)).toBe(1);
    expect(botCountFor(4)).toBe(2);
    expect(botCountFor(7)).toBe(3);
    expect(botCountFor(9)).toBe(3);
    expect(botCountFor(10)).toBe(1);
  });
});

describe('makeBot', () => {
  it('scale le spin avec la salle', () => {
    const b1 = makeBot(1, 0, 0);
    const b5 = makeBot(5, 0, 0);
    expect(b1.spinMax).toBe(BOT_BASE.spinMax);
    expect(b5.spinMax).toBeCloseTo(BOT_BASE.spinMax * 1.6, 5);
  });

  it('la salle 10 produit un boss', () => {
    const boss = makeBot(10, 0, 0);
    expect(boss.radius).toBe(BOSS.radius);
    expect(boss.spinMax).toBeGreaterThan(makeBot(9, 0, 0).spinMax * 2);
  });
});

describe('spawnSalle', () => {
  it('est déterministe et fait avancer le RNG', () => {
    const a = spawnSalle(4, 123);
    const b = spawnSalle(4, 123);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
    expect(a.bots).toHaveLength(2);
    expect(a.rngState).not.toBe(123);
  });

  it('place les bots dans la moitié haute, loin du spawn joueur', () => {
    const { bots } = spawnSalle(7, 99);
    for (const bot of bots) expect(bot.pos.y).toBeLessThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npm run test` — Expected: FAIL (`salle.ts` introuvable).

- [ ] **Step 3: Implémenter `src/sim/salle.ts`**

```ts
import { ARENA_RADIUS, BOSS, BOT_BASE, BOT_SCALING, SALLES_PER_CHAPTER } from './config';
import { nextRandom } from './rng';
import type { Top } from './types';

export function botCountFor(salle: number): number {
  if (salle === SALLES_PER_CHAPTER) return 1;
  return Math.min(1 + Math.floor((salle - 1) / 3), 3);
}

export function makeBot(salle: number, index: number, angle: number): Top {
  const boss = salle === SALLES_PER_CHAPTER;
  const spinScale = 1 + BOT_SCALING.spinPerSalle * (salle - 1);
  const attackScale = 1 + BOT_SCALING.attackPerSalle * (salle - 1);
  const spinMax = BOT_BASE.spinMax * spinScale * (boss ? BOSS.spinMult : 1);
  const dist = ARENA_RADIUS * 0.6;
  return {
    id: `bot-${salle}-${index}`,
    isPlayer: false,
    aim: null,
    pos: { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist },
    vel: { x: 0, y: 0 },
    radius: boss ? BOSS.radius : BOT_BASE.radius,
    spin: spinMax,
    spinMax,
    spinDecay: BOT_BASE.spinDecay,
    attack: BOT_BASE.attack * attackScale * (boss ? BOSS.attackMult : 1),
    defense: BOT_BASE.defense,
    maxSpeed: BOT_BASE.maxSpeed,
    accel: BOT_BASE.accel,
  };
}

export function spawnSalle(salle: number, rngState: number): { bots: Top[]; rngState: number } {
  const bots: Top[] = [];
  let rng = rngState;
  for (let i = 0; i < botCountFor(salle); i++) {
    const r = nextRandom(rng);
    rng = r.state;
    // angle ∈ [π, 2π] → sin ≤ 0 → moitié haute (y négatif) ; le joueur spawn en (0, 80)
    const angle = Math.PI + r.value * Math.PI;
    bots.push(makeBot(salle, i, angle));
  }
  return { bots, rngState: rng };
}
```

- [ ] **Step 4: Vérifier le vert** — Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/sim/salle.ts src/sim/salle.test.ts
git commit -m "feat: spawn des salles, scaling des bots et boss en salle 10"
```

---

### Task 7: Orchestration — tick, progression, mort, validation

**Files:**
- Create: `src/sim/sim.ts`
- Test: `src/sim/sim.test.ts`

**Interfaces:**
- Consumes: tout ce qui précède (`physics`, `combat`, `salle`, `economy`, `rng`, `config`, `types`).
- Produces (utilisés par l'UI) : `createInitialState(seed: number): SimState`, `tick(state: SimState, input: Input): void`, `resetRun(state: SimState): void`.

- [ ] **Step 1: Écrire le test qui échoue (`src/sim/sim.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { createInitialState, resetRun, tick } from './sim';
import { salleReward } from './economy';
import { spawnSalle } from './salle';
import { botCountFor } from './salle';

function runTicks(seed: number, n: number): string {
  const s = createInitialState(seed);
  for (let i = 0; i < n; i++) {
    tick(s, { steer: i % 20 < 10 ? { x: 1, y: 0.5 } : null });
  }
  return JSON.stringify(s);
}

describe('createInitialState', () => {
  it('démarre chapitre 1, salle 1, phase fighting, avec les bots de la salle 1', () => {
    const s = createInitialState(42);
    expect(s.chapter).toBe(1);
    expect(s.salle).toBe(1);
    expect(s.phase).toBe('fighting');
    expect(s.bots).toHaveLength(botCountFor(1));
    expect(s.player.spin).toBe(s.player.spinMax);
  });
});

describe('déterminisme', () => {
  it('même seed + mêmes inputs ⇒ états strictement identiques', () => {
    expect(runTicks(42, 300)).toBe(runTicks(42, 300));
  });

  it('seeds différentes ⇒ états différents', () => {
    expect(runTicks(42, 300)).not.toBe(runTicks(7, 300));
  });
});

describe('progression', () => {
  it('vider une salle crédite la récompense et fait avancer', () => {
    const s = createInitialState(1);
    for (const b of s.bots) b.spin = 0.0001; // le decay du prochain tick les achève
    tick(s, { steer: null });
    expect(s.credits).toBeCloseTo(salleReward(1, false), 5);
    expect(s.salle).toBe(2);
    expect(s.bots).toHaveLength(botCountFor(2));
  });

  it('vider la salle 10 valide le chapitre et repart en salle 1', () => {
    const s = createInitialState(1);
    s.salle = 10;
    const spawned = spawnSalle(10, s.rngState);
    s.bots = spawned.bots;
    s.rngState = spawned.rngState;
    for (const b of s.bots) b.spin = 0.0001;
    tick(s, { steer: null });
    expect(s.chapterValidated).toBe(true);
    expect(s.salle).toBe(1);
    expect(s.credits).toBeCloseTo(salleReward(10, true), 5);
  });

  it('spin à zéro ⇒ mort ; resetRun repart salle 1 en gardant les crédits', () => {
    const s = createInitialState(1);
    s.credits = 500;
    s.player.spin = 0.0001;
    tick(s, { steer: null });
    expect(s.phase).toBe('dead');
    resetRun(s);
    expect(s.phase).toBe('fighting');
    expect(s.salle).toBe(1);
    expect(s.credits).toBe(500);
    expect(s.player.spin).toBe(s.player.spinMax);
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npm run test` — Expected: FAIL (`sim.ts` introuvable).

- [ ] **Step 3: Implémenter `src/sim/sim.ts`**

```ts
import { HEAL_BETWEEN_SALLES, PLAYER_BASE, SALLES_PER_CHAPTER } from './config';
import { salleReward, syncPlayerStats } from './economy';
import { decaySpin, resolveCollision } from './combat';
import { applySteering, moveAndBounce } from './physics';
import { nextRandom } from './rng';
import { spawnSalle } from './salle';
import type { Input, SimState, Top } from './types';

function makePlayer(): Top {
  return {
    id: 'player',
    isPlayer: true,
    aim: null,
    pos: { x: 0, y: 80 },
    vel: { x: 0, y: 0 },
    radius: PLAYER_BASE.radius,
    spin: PLAYER_BASE.spinMax,
    spinMax: PLAYER_BASE.spinMax,
    spinDecay: PLAYER_BASE.spinDecay,
    attack: PLAYER_BASE.attack,
    defense: PLAYER_BASE.defense,
    maxSpeed: PLAYER_BASE.maxSpeed,
    accel: PLAYER_BASE.accel,
  };
}

function startSalle(state: SimState): void {
  const spawned = spawnSalle(state.salle, state.rngState);
  state.bots = spawned.bots;
  state.rngState = spawned.rngState;
  state.player.pos = { x: 0, y: 80 };
  state.player.vel = { x: 0, y: 0 };
}

export function createInitialState(seed: number): SimState {
  const state: SimState = {
    tick: 0,
    rngState: seed >>> 0 || 1,
    chapter: 1,
    salle: 1,
    credits: 0,
    pieces: { noyau: 0, lame: 0, disque: 0, pointe: 0 },
    player: makePlayer(),
    bots: [],
    phase: 'fighting',
    chapterValidated: false,
  };
  syncPlayerStats(state);
  state.player.spin = state.player.spinMax;
  startSalle(state);
  return state;
}

export function resetRun(state: SimState): void {
  state.salle = 1;
  state.phase = 'fighting';
  syncPlayerStats(state);
  state.player.spin = state.player.spinMax;
  startSalle(state);
}

function refreshBotAims(state: SimState): void {
  for (const bot of state.bots) {
    const r = nextRandom(state.rngState);
    state.rngState = r.state;
    const jitter = (r.value - 0.5) * 1.2;
    const angle = Math.atan2(state.player.pos.y - bot.pos.y, state.player.pos.x - bot.pos.x) + jitter;
    bot.aim = { x: Math.cos(angle), y: Math.sin(angle) };
  }
}

export function tick(state: SimState, input: Input): void {
  state.tick++;
  if (state.phase !== 'fighting') return;
  if (state.tick % 10 === 1) refreshBotAims(state);
  applySteering(state.player, input.steer);
  for (const bot of state.bots) applySteering(bot, bot.aim);
  moveAndBounce(state.player);
  for (const bot of state.bots) moveAndBounce(bot);
  for (const bot of state.bots) resolveCollision(state.player, bot);
  for (let i = 0; i < state.bots.length; i++) {
    for (let j = i + 1; j < state.bots.length; j++) {
      resolveCollision(state.bots[i], state.bots[j]);
    }
  }
  decaySpin(state.player);
  for (const bot of state.bots) decaySpin(bot);
  state.bots = state.bots.filter((b) => b.spin > 0);
  if (state.player.spin <= 0) {
    state.phase = 'dead';
    return;
  }
  if (state.bots.length === 0) {
    const boss = state.salle === SALLES_PER_CHAPTER;
    state.credits += salleReward(state.salle, boss);
    if (boss) {
      state.chapterValidated = true;
      state.salle = 1;
    } else {
      state.salle++;
    }
    state.player.spin = Math.min(state.player.spinMax, state.player.spin + HEAL_BETWEEN_SALLES * state.player.spinMax);
    startSalle(state);
  }
}
```

- [ ] **Step 4: Vérifier le vert** — Run: `npm run test` — Expected: PASS (toute la suite).

- [ ] **Step 5: Commit**

```bash
git add src/sim/sim.ts src/sim/sim.test.ts
git commit -m "feat: boucle de simulation complete - tick, progression, mort, validation de chapitre"
```

---

### Task 8: Rendu PixiJS de l'arène

**Files:**
- Create: `src/render/arena.ts`

**Interfaces:**
- Consumes: `SimState` (types.ts), `ARENA_RADIUS` (config.ts), PixiJS 8 (`Application`, `Graphics`).
- Produces: `createArena(container: HTMLElement): Promise<{ draw(state: SimState): void; destroy(): void }>`.

- [ ] **Step 1: Implémenter `src/render/arena.ts`**

```ts
import { Application, Graphics } from 'pixi.js';
import { ARENA_RADIUS } from '../sim/config';
import type { SimState } from '../sim/types';

const SIZE = 360;
const SCALE = 1.1;
const C = SIZE / 2;

export async function createArena(container: HTMLElement) {
  const app = new Application();
  await app.init({ width: SIZE, height: SIZE, background: '#1c2027', antialias: true });
  container.appendChild(app.canvas);
  const g = new Graphics();
  app.stage.addChild(g);
  return {
    draw(state: SimState) {
      g.clear();
      g.circle(C, C, ARENA_RADIUS * SCALE).stroke({ width: 2, color: 0x46cede });
      for (const b of state.bots) {
        g.circle(C + b.pos.x * SCALE, C + b.pos.y * SCALE, b.radius * SCALE).fill(0xe86a5a);
      }
      const p = state.player;
      g.circle(C + p.pos.x * SCALE, C + p.pos.y * SCALE, p.radius * SCALE).fill(0x46cede);
    },
    destroy() {
      app.destroy(true, { children: true });
    },
  };
}
```

- [ ] **Step 2: Vérifier la compilation** — Run: `npm run build` — Expected: vert (le rendu sera vérifié visuellement en Task 9).

- [ ] **Step 3: Commit**

```bash
git add src/render/arena.ts
git commit -m "feat: rendu PixiJS de l'arene (cercles joueur/bots)"
```

---

### Task 9: Boucle de jeu, joystick virtuel et montage

**Files:**
- Create: `src/ui/useGameLoop.ts`, `src/ui/Game.tsx`
- Modify: `src/main.tsx` (remplacer le placeholder)

**Interfaces:**
- Consumes: `createInitialState`, `tick`, `resetRun` (sim.ts) ; `createArena` (arena.ts) ; `TICK_S` (config.ts) ; `Hud` (Task 10 — voir note Step 3).
- Produces: `useGameLoop(stateRef: { current: SimState }, steerRef: { current: Vec | null }, onFrame: () => void): void` ; composant `Game`.

- [ ] **Step 1: Implémenter `src/ui/useGameLoop.ts` (accumulateur à pas fixe)**

```ts
import { useEffect } from 'react';
import { TICK_S } from '../sim/config';
import { tick } from '../sim/sim';
import type { SimState, Vec } from '../sim/types';

export function useGameLoop(
  stateRef: { current: SimState },
  steerRef: { current: Vec | null },
  onFrame: () => void,
): void {
  useEffect(() => {
    let raf = 0;
    let acc = 0;
    let last = performance.now();
    const loop = (now: number) => {
      acc += Math.min(now - last, 250);
      last = now;
      while (acc >= TICK_S * 1000) {
        tick(stateRef.current, { steer: steerRef.current });
        acc -= TICK_S * 1000;
      }
      onFrame();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // stateRef/steerRef/onFrame sont stables (refs + callback stable par construction)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
```

- [ ] **Step 2: Implémenter `src/ui/Game.tsx` (joystick relatif au point de contact, zone morte 8 px)**

```tsx
import { useEffect, useRef, useState } from 'react';
import { createInitialState } from '../sim/sim';
import { createArena } from '../render/arena';
import { useGameLoop } from './useGameLoop';
import { Hud } from './Hud';
import type { Vec } from '../sim/types';

export function Game() {
  const stateRef = useRef(createInitialState(Date.now() >>> 0));
  const steerRef = useRef<Vec | null>(null);
  const originRef = useRef<Vec | null>(null);
  const arenaRef = useRef<Awaited<ReturnType<typeof createArena>> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const [, setFrame] = useState(0);

  useEffect(() => {
    let disposed = false;
    createArena(hostRef.current!).then((arena) => {
      if (disposed) arena.destroy();
      else arenaRef.current = arena;
    });
    return () => {
      disposed = true;
      arenaRef.current?.destroy();
      arenaRef.current = null;
    };
  }, []);

  useGameLoop(stateRef, steerRef, () => {
    arenaRef.current?.draw(stateRef.current);
    setFrame((f) => f + 1);
  });

  const onDown = (e: React.PointerEvent) => {
    originRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!originRef.current) return;
    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    steerRef.current = Math.hypot(dx, dy) > 8 ? { x: dx, y: dy } : null;
  };
  const onUp = () => {
    originRef.current = null;
    steerRef.current = null;
  };

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      style={{
        touchAction: 'none',
        userSelect: 'none',
        minHeight: '100vh',
        background: '#14171d',
        color: '#e8eaee',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        padding: 16,
      }}
    >
      <div ref={hostRef}></div>
      <Hud stateRef={stateRef} />
    </div>
  );
}
```

Note : `Date.now()` est autorisé ici — l'interdiction ne vaut que dans `src/sim/`. Si la Task 10 n'est pas encore faite, créer `src/ui/Hud.tsx` avec le stub minimal ci-dessous (remplacé en Task 10) :

```tsx
import type { SimState } from '../sim/types';

export function Hud({ stateRef }: { stateRef: { current: SimState } }) {
  return <div>Salle {stateRef.current.salle}</div>;
}
```

- [ ] **Step 3: Remplacer `src/main.tsx`**

```tsx
import { createRoot } from 'react-dom/client';
import { Game } from './ui/Game';

createRoot(document.getElementById('root')!).render(<Game />);
```

- [ ] **Step 4: Vérification manuelle**

Run: `npm run build` — Expected: vert.
Run: `npm run dev`, ouvrir http://localhost:5173 — Expected: arène sombre, cercle cyan (joueur) et cercle(s) rouge(s) (bots) ; glisser la souris/le doigt fait accélérer le joueur dans la direction du glissement ; relâcher le laisse glisser avec friction ; les chocs repoussent les toupies ; vider la salle fait apparaître la suivante.

- [ ] **Step 5: Commit**

```bash
git add src/ui/useGameLoop.ts src/ui/Game.tsx src/ui/Hud.tsx src/main.tsx
git commit -m "feat: boucle de jeu a pas fixe, joystick virtuel et montage React"
```

---

### Task 10: HUD — crédits, salle, spin, améliorations, mort

**Files:**
- Create: `src/ui/format.ts`, remplacer `src/ui/Hud.tsx` (stub de la Task 9)
- Test: `src/ui/format.test.ts`

**Interfaces:**
- Consumes: `tryUpgrade`, `upgradeCost` (economy.ts) ; `resetRun` (sim.ts) ; `SALLES_PER_CHAPTER` (config.ts) ; types.
- Produces: `formatCredits(n: number): string` ; composant `Hud({ stateRef })`.

- [ ] **Step 1: Écrire le test qui échoue (`src/ui/format.test.ts`)**

```ts
import { describe, expect, it } from 'vitest';
import { formatCredits } from './format';

describe('formatCredits', () => {
  it('affiche brut sous 1000', () => {
    expect(formatCredits(950)).toBe('950');
    expect(formatCredits(999.9)).toBe('999');
  });

  it('milliers en « 12,4 k »', () => {
    expect(formatCredits(12400)).toBe('12,4 k');
  });

  it('millions en « 2,50 M »', () => {
    expect(formatCredits(2500000)).toBe('2,50 M');
  });
});
```

- [ ] **Step 2: Vérifier l'échec** — Run: `npm run test` — Expected: FAIL (`format.ts` introuvable). Note : le glob de test de `vite.config.ts` est `src/**/*.test.ts`, il couvre `src/ui/`.

- [ ] **Step 3: Implémenter `src/ui/format.ts`**

```ts
export function formatCredits(n: number): string {
  if (n < 1000) return Math.floor(n).toString();
  if (n < 1e6) return (n / 1000).toFixed(1).replace('.', ',') + ' k';
  return (n / 1e6).toFixed(2).replace('.', ',') + ' M';
}
```

- [ ] **Step 4: Vérifier le vert** — Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Remplacer `src/ui/Hud.tsx`**

```tsx
import { formatCredits } from './format';
import { tryUpgrade, upgradeCost } from '../sim/economy';
import { resetRun } from '../sim/sim';
import { SALLES_PER_CHAPTER } from '../sim/config';
import type { PieceLevels, SimState } from '../sim/types';

const PIECES: { key: keyof PieceLevels; label: string }[] = [
  { key: 'lame', label: 'Lame' },
  { key: 'disque', label: 'Disque' },
  { key: 'pointe', label: 'Pointe' },
  { key: 'noyau', label: 'Noyau' },
];

export function Hud({ stateRef }: { stateRef: { current: SimState } }) {
  const s = stateRef.current;
  const spinPct = Math.max(0, Math.round((s.player.spin / s.player.spinMax) * 100));
  return (
    <div style={{ width: 360, display: 'flex', flexDirection: 'column', gap: 8, fontFamily: 'system-ui' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Crédits {formatCredits(s.credits)}</span>
        <span>
          Chapitre {s.chapter} · Salle {s.salle}/{SALLES_PER_CHAPTER}
          {s.salle === SALLES_PER_CHAPTER ? ' — BOSS' : ''}
        </span>
      </div>
      <div style={{ height: 8, background: '#232830' }}>
        <div style={{ width: `${spinPct}%`, height: '100%', background: '#46cede' }}></div>
      </div>
      {s.chapterValidated ? <div style={{ color: '#6fbf73' }}>Chapitre 1 validé</div> : null}
      {s.phase === 'dead' ? (
        <button style={{ minHeight: 44 }} onClick={() => resetRun(stateRef.current)}>
          Ta toupie s'est arrêtée — Retenter (crédits conservés)
        </button>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {PIECES.map(({ key, label }) => {
          const cost = upgradeCost(s.pieces[key]);
          return (
            <button
              key={key}
              style={{ minHeight: 44 }}
              disabled={s.credits < cost}
              onClick={() => tryUpgrade(stateRef.current, key)}
            >
              {label} niv. {s.pieces[key]} — {formatCredits(cost)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Vérification manuelle**

Run: `npm run dev` — Expected: crédits qui montent en vidant des salles ; barre de spin qui descend sous les chocs ; boutons d'amélioration désactivés tant que trop chers, qui débitent et montent le niveau sinon ; mourir affiche « Retenter » et le clic repart salle 1 avec les crédits.

- [ ] **Step 7: Commit**

```bash
git add src/ui/format.ts src/ui/format.test.ts src/ui/Hud.tsx
git commit -m "feat: HUD - credits, salle, barre de spin, ameliorations, ecran de mort"
```

---

### Task 11: Finition du jalon

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: tout le jalon.
- Produces: jalon 1 taggé.

- [ ] **Step 1: Écrire `README.md`**

```markdown
# SpinForge

Jeu hybride Archero × idle : pilote ta toupie au doigt, vide les salles, améliore tes pièces.

## Démarrer

    npm install
    npm run dev     # http://localhost:5173
    npm run test    # tests de la simulation
    npm run build

## Docs

- Spec : `docs/game-design.md` · Roadmap : `docs/roadmap.md` · Règles d'archi : `CLAUDE.md`
```

- [ ] **Step 2: Passe finale de vérification**

Run: `npm run test && npm run build`
Expected: tout vert.

Checklist manuelle (`npm run dev`) — les critères d'acceptation du jalon 1 (`docs/roadmap.md`) :
- On pilote au doigt/à la souris, la toupie glisse à la relâche.
- Un chapitre complet se joue : salles 1→9 puis boss en salle 10, « Chapitre 1 validé » s'affiche, retour salle 1.
- Mourir → « Retenter », crédits conservés.
- Les 4 améliorations débitent `100 × 1,08^niveau` et changent le comportement (Lame = plus de dégâts, Pointe = plus rapide…).

- [ ] **Step 3: Commit et tag**

```bash
git add README.md
git commit -m "docs: README de demarrage - jalon 1 complet"
git tag jalon-1
```
