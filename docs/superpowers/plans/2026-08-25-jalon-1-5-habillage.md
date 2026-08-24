# Jalon 1.5 — L'habillage : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Donner à SpinForge son identité visuelle et son game feel — les toupies tournent, leur incandescence dit leur spin restant, chaque choc claque — sans toucher à la simulation.

**Architecture:** Le rendu est strictement spectateur. Il prend un instantané avant chaque tick, déduit les événements (choc, mort, salle, boss) en comparant deux instantanés, et interpole les positions à 60 fps par-dessus une simulation qui avance à 10 Hz. PixiJS n'affiche que des sprites teintés dont les textures sont fabriquées une seule fois au démarrage en Canvas2D.

**Tech Stack:** TypeScript strict, Vite 6, Vitest 2, PixiJS 8.20, React 19, WebAudio, `@fontsource`.

**Spec:** `docs/superpowers/specs/2026-08-24-jalon-1-5-habillage-design.md`

## Global Constraints

- `src/sim/` reste pur et déterministe. **Une seule modification de logique autorisée sur tout le jalon** : `clampToArena` dans `physics.ts` (Task 2). Interdits dans `src/sim/` : `Date`, `Math.random`, imports DOM/Pixi/React.
- Tout l'équilibrage vit dans `src/sim/config.ts`. Le barème de game feel n'est **pas** de l'équilibrage : il vit dans `src/render/feel.ts`.
- **Aucun facteur d'échelle décoratif sur les toupies.** Le sprite d'une toupie occupe exactement son `radius` de simulation. Si elles paraissent trop petites, le levier est `PLAYER_BASE.radius` / `BOT_BASE.radius` dans `config.ts` — c'est de l'équilibrage, pas du rendu.
- Aucun nom officiel Beyblade nulle part (toupies, personnages, produits).
- Textes joueur en **français**, code et identifiants en **anglais**.
- Tests Vitest colocalisés, imports explicites depuis `vitest` (pas de globals). `environment: 'node'` — donc **aucun test ne peut toucher au DOM ni à Pixi** : seuls les modules purs sont testés unitairement.
- TypeScript strict + `noUnusedLocals` + `noUnusedParameters` : jamais d'import ni de variable inutilisés.
- `design/*.dc.html` ne se modifie que via le skill `/design`. Ce jalon n'y touche pas.
- **Ne jamais pousser sur `main`** : un workflow GitHub Pages déploie publiquement à chaque push. Commits locaux uniquement.
- Le serveur de dev sert sous `http://localhost:5173/spinforge/` (`base: '/spinforge/'`). La racine renvoie 404.

---

### Task 1: Jetons de thème et typographie

**Files:**
- Create: `src/theme.ts`
- Test: `src/theme.test.ts`
- Modify: `package.json` (ajout de `@fontsource/inter`, `@fontsource/oswald`)
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: rien.
- Produces:
  - `PALETTE` — table de couleurs entières (`0xrrggbb`) consommée par PixiJS et par React.
  - `type Camp = 'player' | 'bot' | 'boss'`
  - `spinTint(camp: Camp, ratio: number): number` — la règle « la teinte dit le camp, l'incandescence dit le spin ».
  - `hex(color: number): string` — `0x80e8ff` → `'#80e8ff'`.
  - `applyThemeToDocument(): void` — injecte les jetons en variables CSS sur `:root`.

- [ ] **Step 1: Écrire le test qui échoue**

Créer `src/theme.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { PALETTE, hex, spinTint } from './theme';

describe('hex', () => {
  it('formate un entier de couleur en notation CSS', () => {
    expect(hex(0x80e8ff)).toBe('#80e8ff');
    expect(hex(0x000000)).toBe('#000000');
    expect(hex(0x0b0e13)).toBe('#0b0e13');
  });
});

describe('spinTint', () => {
  it('rend la couleur de camp intacte à plein régime', () => {
    expect(spinTint('player', 1)).toBe(PALETTE.player);
    expect(spinTint('bot', 1)).toBe(PALETTE.bot);
    expect(spinTint('boss', 1)).toBe(PALETTE.boss);
  });

  it('garde 18 % de l’incandescence à spin nul', () => {
    const c = spinTint('player', 0);
    expect((c >> 16) & 0xff).toBe(Math.round(0x80 * 0.18));
    expect((c >> 8) & 0xff).toBe(Math.round(0xe8 * 0.18));
    expect(c & 0xff).toBe(Math.round(0xff * 0.18));
  });

  it('ne fait jamais tourner la teinte : les canaux gardent leur ordre', () => {
    for (const ratio of [0, 0.05, 0.25, 0.5, 0.9, 1]) {
      const c = spinTint('bot', ratio);
      const r = (c >> 16) & 0xff, g = (c >> 8) & 0xff, b = c & 0xff;
      expect(r).toBeGreaterThanOrEqual(g);
      expect(g).toBeGreaterThanOrEqual(b);
    }
  });

  it('est monotone croissante en ratio', () => {
    const lum = (c: number) => ((c >> 16) & 0xff) + ((c >> 8) & 0xff) + (c & 0xff);
    let prev = -1;
    for (const ratio of [0, 0.1, 0.2, 0.4, 0.6, 0.8, 1]) {
      const l = lum(spinTint('player', ratio));
      expect(l).toBeGreaterThan(prev);
      prev = l;
    }
  });

  it('borne les ratios hors [0, 1]', () => {
    expect(spinTint('player', -3)).toBe(spinTint('player', 0));
    expect(spinTint('player', 42)).toBe(spinTint('player', 1));
  });
});
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/theme.test.ts`
Expected: FAIL — `Failed to resolve import "./theme"`.

- [ ] **Step 3: Écrire `src/theme.ts`**

```ts
/**
 * Jetons de la direction artistique « Métal & Braise ».
 * Source unique : PixiJS lit les entiers, React lit les variables CSS injectées par
 * applyThemeToDocument(). Aucune couleur ne doit être écrite en dur ailleurs.
 */

export const PALETTE = {
  bg: 0x0b0e13,
  panel: 0x131922,
  line: 0x2c3644,
  floorInner: 0x2a323d,
  floorOuter: 0x141a22,
  rim: 0x3e4959,
  rimShadow: 0x0a0d12,
  player: 0x80e8ff,
  bot: 0xff7c30,
  boss: 0xba78ff,
  ember: 0xffc24a,
  text: 0xe8eaee,
  muted: 0x8a94a6,
} as const;

export type Camp = 'player' | 'bot' | 'boss';

/** Atténuation multiplicative : l'incandescence baisse, la teinte reste intacte. */
const DIM_FLOOR = 0.18;
const DIM_SPAN = 0.82;
const DIM_EXP = 0.62;

export function spinTint(camp: Camp, ratio: number): number {
  const base = PALETTE[camp];
  const k = DIM_FLOOR + DIM_SPAN * Math.pow(Math.max(0, Math.min(1, ratio)), DIM_EXP);
  const r = Math.round(((base >> 16) & 0xff) * k);
  const g = Math.round(((base >> 8) & 0xff) * k);
  const b = Math.round((base & 0xff) * k);
  return (r << 16) | (g << 8) | b;
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}

export function applyThemeToDocument(): void {
  const root = document.documentElement.style;
  for (const [name, value] of Object.entries(PALETTE)) {
    root.setProperty(`--${name}`, hex(value));
  }
}
```

- [ ] **Step 4: Vérifier que le test passe**

Run: `npx vitest run src/theme.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Installer les polices**

Run: `npm install @fontsource/inter @fontsource/oswald`
Expected: installation propre, `package.json` modifié.

- [ ] **Step 6: Câbler polices et thème au démarrage**

Remplacer `src/main.tsx` :

```tsx
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/oswald/500.css';
import '@fontsource/oswald/600.css';
import { createRoot } from 'react-dom/client';
import { applyThemeToDocument } from './theme';
import { Game } from './ui/Game';

applyThemeToDocument();
createRoot(document.getElementById('root')!).render(<Game />);
```

Ajouter dans `index.html`, dans `<head>`, après le `<title>` :

```html
    <style>
      html, body { margin: 0; background: #0b0e13; }
      body {
        font-family: Inter, ui-sans-serif, system-ui, sans-serif;
        -webkit-font-smoothing: antialiased;
      }
    </style>
```

- [ ] **Step 7: Vérifier le build**

Run: `npm run build`
Expected: build vert, aucune erreur TypeScript.

- [ ] **Step 8: Commit**

```bash
git add src/theme.ts src/theme.test.ts src/main.tsx index.html package.json package-lock.json
git commit -m "feat(theme): jetons Métal & Braise et typographie Oswald + Inter"
```

---

### Task 2: `clampToArena` — la seule correction de simulation du jalon

**Files:**
- Modify: `src/sim/physics.ts`
- Modify: `src/sim/sim.ts` (appel dans `tick`)
- Test: `src/sim/physics.test.ts`

**Interfaces:**
- Consumes: `ARENA_RADIUS` de `config.ts`, `Top` de `types.ts`.
- Produces: `clampToArena(top: Top): void` — repousse une toupie dans l'anneau sans toucher à sa vitesse.

**Contexte :** `resolveCollision` corrige les positions *après* `moveAndBounce`, donc rien ne re-borne avant le tick suivant. Résultat mesuré au jalon 1 : les toupies dépassent visiblement de l'anneau sur ~4,3 % des images.

- [ ] **Step 1: Écrire le test qui échoue**

Ajouter à la fin de `src/sim/physics.test.ts` :

```ts
describe('clampToArena', () => {
  it('repousse une toupie sortie de l’anneau sur le bord', () => {
    const t = top({ pos: { x: 200, y: 0 } });
    clampToArena(t);
    expect(Math.hypot(t.pos.x, t.pos.y)).toBeCloseTo(ARENA_RADIUS - t.radius, 5);
    expect(t.pos.x).toBeGreaterThan(0);
  });

  it('conserve la direction de la position', () => {
    const t = top({ pos: { x: 300, y: 400 } }); // direction 3/4/5
    clampToArena(t);
    const d = Math.hypot(t.pos.x, t.pos.y);
    expect(t.pos.x / d).toBeCloseTo(0.6, 5);
    expect(t.pos.y / d).toBeCloseTo(0.8, 5);
  });

  it('ne touche ni à la vitesse ni à une toupie déjà à l’intérieur', () => {
    const t = top({ pos: { x: 10, y: 10 }, vel: { x: 50, y: -20 } });
    clampToArena(t);
    expect(t.pos).toEqual({ x: 10, y: 10 });
    expect(t.vel).toEqual({ x: 50, y: -20 });
  });

  it('ne divise pas par zéro au centre exact', () => {
    const t = top({ pos: { x: 0, y: 0 } });
    clampToArena(t);
    expect(t.pos).toEqual({ x: 0, y: 0 });
  });
});
```

Et compléter la ligne d'import en tête du fichier :

```ts
import { applySteering, clampToArena, moveAndBounce } from './physics';
```

- [ ] **Step 2: Vérifier l'échec**

Run: `npx vitest run src/sim/physics.test.ts`
Expected: FAIL — `clampToArena is not a function`.

- [ ] **Step 3: Implémenter dans `src/sim/physics.ts`**

Ajouter à la fin du fichier :

```ts
/**
 * Repousse une toupie à l'intérieur de l'anneau sans toucher à sa vitesse.
 * Appelé après les collisions, qui déplacent les positions sans les re-borner.
 */
export function clampToArena(top: Top): void {
  const d = Math.hypot(top.pos.x, top.pos.y);
  const limit = ARENA_RADIUS - top.radius;
  if (d <= limit || d === 0) return;
  const k = limit / d;
  top.pos.x *= k;
  top.pos.y *= k;
}
```

- [ ] **Step 4: Appeler depuis `tick`**

Dans `src/sim/sim.ts`, remplacer la ligne d'import de `physics` :

```ts
import { applySteering, clampToArena, moveAndBounce } from './physics';
```

Puis, dans `tick`, juste après la double boucle de collisions bot↔bot et **avant** `decaySpin(state.player)` :

```ts
  clampToArena(state.player);
  for (const bot of state.bots) clampToArena(bot);
```

- [ ] **Step 5: Vérifier que tout passe**

Run: `npm run test`
Expected: PASS — 44 tests (40 existants + 4 nouveaux). Le test de déterminisme reste vert : `clampToArena` est pur.

- [ ] **Step 6: Commit**

```bash
git add src/sim/physics.ts src/sim/physics.test.ts src/sim/sim.ts
git commit -m "fix(sim): borner les toupies dans l'anneau après les collisions"
```

---

### Task 3: Équilibrage « MUR ~2 h » et mise à jour des documents

**Files:**
- Modify: `src/sim/config.ts:18`
- Modify: `src/sim/economy.test.ts:28-32`
- Modify: `docs/game-design.md`
- Modify: `docs/roadmap.md`

**Interfaces:**
- Consumes: rien.
- Produces: nouvelles valeurs d'`ECON` consommées par `economy.ts` — aucune signature ne change.

**Contexte :** mesuré à l'autopilote, 5 seeds — 124 runs / 12 h 06 aujourd'hui, 21 runs / 2 h 08 après. Seule l'économie bouge : `BOSS.spinMult` et `BOT_SCALING.spinPerSalle` restent intacts pour que le boss demeure le mur du chapitre.

- [ ] **Step 1: Réécrire les assertions qui codent l'ancienne courbe en dur**

Dans `src/sim/economy.test.ts`, remplacer le bloc `it('revenu = 20 × 1,12^(salle−1), boss ×5', ...)` (lignes 28-32) par :

```ts
  it('revenu = rewardBase × rewardGrowth^(salle−1), boss × bossRewardMult', () => {
    expect(salleReward(1, false)).toBeCloseTo(ECON.rewardBase, 5);
    expect(salleReward(5, false)).toBeCloseTo(ECON.rewardBase * Math.pow(ECON.rewardGrowth, 4), 5);
    expect(salleReward(10, true)).toBeCloseTo(
      ECON.rewardBase * Math.pow(ECON.rewardGrowth, 9) * ECON.bossRewardMult,
      5,
    );
  });
```

Et compléter l'import de `config` en ligne 3 :

```ts
import { ECON, PLAYER_BASE } from './config';
```

- [ ] **Step 2: Vérifier que les tests passent encore avec les anciennes valeurs**

Run: `npx vitest run src/sim/economy.test.ts`
Expected: PASS (6 tests) — la formule est désormais dérivée de `config.ts`, elle vaut avant comme après.

- [ ] **Step 3: Appliquer le nouvel équilibrage**

Dans `src/sim/config.ts`, remplacer la ligne 18 :

```ts
export const ECON = { upgradeBase: 100, upgradeGrowth: 1.08, rewardBase: 120, rewardGrowth: 1.13, bossRewardMult: 10 };
```

- [ ] **Step 4: Vérifier que la suite reste verte**

Run: `npm run test`
Expected: PASS — 44 tests. Aucune assertion ne code plus de constante d'économie en dur.

- [ ] **Step 5: Mettre `docs/game-design.md` à jour**

Dans la section « Économie », sous « **Courbes** », remplacer la ligne du revenu par :

```markdown
- `revenu(salle) = 120 × 1,13^(salle−1)` par salle vidée ; boss ×10. (Calibré au jalon 1.5 par mesure : un chapitre 1 se valide en ~21 runs, soit ~2 h.)
```

- [ ] **Step 6: Corriger la dette dans `docs/roadmap.md`**

Dans « Dette connue », remplacer le paragraphe « **Décision de design en attente — équilibrage du chapitre 1.** » en entier par :

```markdown
**Équilibrage du chapitre 1 — tranché au jalon 1.5.** Mesuré à l'autopilote (« fonce sur le bot le plus
proche » + achats gloutons, 5 seeds, médianes) : le chapitre 1 demandait ~124 runs, soit ~12 h. Réglage
retenu « MUR ~2 h » : seule l'économie bouge (`ECON.rewardBase` 20 → 120, `rewardGrowth` 1,12 → 1,13,
`bossRewardMult` 5 → 10), le combat et le boss restent intacts. Résultat : 21 runs, ~2 h 08, et le boss
demeure de loin la salle la plus meurtrière (8 morts contre 3 pour la suivante) — conformément au pilier
« le mur n'est jamais un bug, c'est le produit ». Le balayage a montré que les deux leviers sont
indépendants : l'économie commande la durée, `BOSS.spinMult` commande la forme de la difficulté.
Détail : `docs/superpowers/specs/2026-08-24-jalon-1-5-habillage-design.md` § 6.
```

- [ ] **Step 7: Commit**

```bash
git add src/sim/config.ts src/sim/economy.test.ts docs/game-design.md docs/roadmap.md
git commit -m "balance: chapitre 1 en ~2 h par l'économie seule, le boss reste le mur"
```

---

### Task 4: Instantané, observateur et interpolation

**Files:**
- Create: `src/render/feel.ts`
- Create: `src/render/snapshot.ts`
- Create: `src/render/observer.ts`
- Test: `src/render/observer.test.ts`

**Interfaces:**
- Consumes: `SimState`, `Top`, `Phase` de `src/sim/types`, `TICK_S` et `SALLES_PER_CHAPTER` de `src/sim/config`.
- Produces:
  - `FEEL` — le barème chiffré du game feel.
  - `TopSnapshot`, `Snapshot`, `takeSnapshot(state): Snapshot`, `snapshotById(s): Map<string, TopSnapshot>`
  - `HitEvent`, `DeathEvent`, `RenderEvents`, `observe(before, after): RenderEvents`
  - `lerp(a, b, t): number`

**Contexte :** la simulation n'émet aucun événement. Le rendu les déduit en comparant deux instantanés. Ces trois modules sont **purs** — aucun DOM, aucun Pixi — donc testables sous `environment: 'node'`.

> Écart assumé avec la spec § 3.6 : elle prévoyait un fichier `interpolate.ts` séparé. `lerp` est une ligne et vit dans `snapshot.ts`, avec les données qu'elle interpole. Un fichier pour une fonction de trois mots serait de la cérémonie.

- [ ] **Step 1: Écrire `src/render/feel.ts`**

```ts
/**
 * Barème du game feel. Ce ne sont PAS des chiffres d'équilibrage : rien ici ne
 * touche la simulation, et rien ici n'a sa place dans src/sim/config.ts.
 * Durées en secondes, distances en unités de simulation.
 */
export const FEEL = {
  // rotation : ω = base + span × ratio^exp   (rad/s)
  omegaBase: 2,
  omegaSpan: 18,
  omegaExp: 1.15,

  // incandescence
  haloRadiusMult: 1.9,
  haloAlphaBase: 0.2,
  haloAlphaSpan: 0.8,

  // usure : seuils de bascule des textures ébréchées
  wearLevel1: 0.45,
  wearLevel2: 0.22,
  chipStart: 0.4,
  chipCount: 5,

  // traînée
  trailSpeedRatio: 0.55,
  trailMax: 9,
  trailLife: 0.22,

  // impact — hitReference est ABSOLU : normaliser contre spinMax ferait faiblir
  // les chocs à mesure que le joueur monte son Noyau.
  hitReference: 70,
  hitEpsilon: 1e-6,
  flashLife: 0.11,
  waveLife: 0.38,
  waveRadius: 46,
  shakeMax: 9,
  shakePerHit: 5,
  shakeDamping: 0.86,
  sparkBase: 6,
  sparkSpan: 8,
  sparkPool: 120,
  sparkLife: 0.5,

  // agonie
  deathLife: 0.9,

  // boss
  bossHaloMult: 2.7,
  bossRingSpeed: -0.42,
  bossEntryLife: 1.2,

  // transition « reforge »
  reforgeLife: 0.45,
  reforgeFlashLife: 0.22,
  reforgeQuickWindow: 3,
  reforgeQuickScale: 0.4,
} as const;

/** Vitesse de rotation à l'écran, en rad/s, pour un ratio de spin donné. */
export function spinOmega(ratio: number): number {
  const r = Math.max(0, Math.min(1, ratio));
  return FEEL.omegaBase + FEEL.omegaSpan * Math.pow(r, FEEL.omegaExp);
}
```

- [ ] **Step 2: Écrire `src/render/snapshot.ts`**

```ts
import type { Phase, SimState } from '../sim/types';

/** Ce que le rendu retient d'une toupie entre deux ticks. */
export interface TopSnapshot {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  spin: number;
  spinMax: number;
  spinDecay: number;
  radius: number;
  isPlayer: boolean;
}

export interface Snapshot {
  tick: number;
  salle: number;
  phase: Phase;
  chapterValidated: boolean;
  tops: TopSnapshot[];
}

function snap(top: SimState['player']): TopSnapshot {
  return {
    id: top.id,
    x: top.pos.x,
    y: top.pos.y,
    vx: top.vel.x,
    vy: top.vel.y,
    spin: top.spin,
    spinMax: top.spinMax,
    spinDecay: top.spinDecay,
    radius: top.radius,
    isPlayer: top.isPlayer,
  };
}

export function takeSnapshot(state: SimState): Snapshot {
  return {
    tick: state.tick,
    salle: state.salle,
    phase: state.phase,
    chapterValidated: state.chapterValidated,
    tops: [snap(state.player), ...state.bots.map(snap)],
  };
}

export function snapshotById(s: Snapshot): Map<string, TopSnapshot> {
  return new Map(s.tops.map((t) => [t.id, t]));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
```

- [ ] **Step 3: Écrire le test qui échoue**

Créer `src/render/observer.test.ts` :

```ts
import { describe, expect, it } from 'vitest';
import { observe } from './observer';
import { FEEL } from './feel';
import { TICK_S, SALLES_PER_CHAPTER } from '../sim/config';
import type { Snapshot, TopSnapshot } from './snapshot';

function topSnap(over: Partial<TopSnapshot> = {}): TopSnapshot {
  return {
    id: 'player', x: 0, y: 0, vx: 0, vy: 0,
    spin: 1000, spinMax: 1000, spinDecay: 20, radius: 12, isPlayer: true,
    ...over,
  };
}

function snapshot(tops: TopSnapshot[], over: Partial<Snapshot> = {}): Snapshot {
  return { tick: 1, salle: 1, phase: 'fighting', chapterValidated: false, tops, ...over };
}

/** Le spin qu'une toupie aurait après un tick sans aucun choc. */
const decayed = (t: TopSnapshot) => t.spin - t.spinDecay * TICK_S;

describe('observe — chocs', () => {
  it('n’émet rien quand seule la décroissance normale s’applique', () => {
    const before = topSnap();
    const after = topSnap({ spin: decayed(before) });
    expect(observe(snapshot([before]), snapshot([after])).hits).toHaveLength(0);
  });

  it('émet un choc quand la perte dépasse la décroissance', () => {
    const before = topSnap();
    const after = topSnap({ spin: decayed(before) - 35 });
    const { hits } = observe(snapshot([before]), snapshot([after]));
    expect(hits).toHaveLength(1);
    expect(hits[0].id).toBe('player');
    expect(hits[0].power).toBeCloseTo(35 / FEEL.hitReference, 5);
  });

  it('borne la puissance à 1 pour un choc énorme', () => {
    const before = topSnap();
    const after = topSnap({ spin: decayed(before) - FEEL.hitReference * 10 });
    expect(observe(snapshot([before]), snapshot([after])).hits[0].power).toBe(1);
  });

  it('oriente le choc vers la toupie la plus proche', () => {
    const p = topSnap({ id: 'player' });
    const b = topSnap({ id: 'bot-1', x: 24, y: 0, isPlayer: false });
    const after = [topSnap({ id: 'player', spin: decayed(p) - 20 }), topSnap({ id: 'bot-1', x: 24, y: 0, isPlayer: false, spin: decayed(b) })];
    const { hits } = observe(snapshot([p, b]), snapshot(after));
    expect(hits[0].nx).toBeCloseTo(1, 5);
    expect(hits[0].ny).toBeCloseTo(0, 5);
  });

  it('ne prend pas un gain de spin (soin entre salles) pour un choc', () => {
    const before = topSnap();
    const after = topSnap({ spin: before.spin + 200 });
    expect(observe(snapshot([before]), snapshot([after])).hits).toHaveLength(0);
  });
});

describe('observe — morts', () => {
  it('émet une mort pour un bot disparu, à sa dernière position connue', () => {
    const p = topSnap();
    const b = topSnap({ id: 'bot-1', x: 40, y: -30, isPlayer: false, spin: 3 });
    const { deaths } = observe(snapshot([p, b]), snapshot([p]));
    expect(deaths).toHaveLength(1);
    expect(deaths[0]).toMatchObject({ id: 'bot-1', x: 40, y: -30, isPlayer: false });
  });

  it('émet la mort du joueur quand la phase bascule', () => {
    const p = topSnap({ x: 5, y: 6 });
    const { deaths } = observe(snapshot([p]), snapshot([p], { phase: 'dead' }));
    expect(deaths).toHaveLength(1);
    expect(deaths[0]).toMatchObject({ id: 'player', isPlayer: true });
  });
});

describe('observe — progression', () => {
  it('signale un changement de salle', () => {
    const p = topSnap();
    const r = observe(snapshot([p]), snapshot([p], { salle: 2 }));
    expect(r.salleChanged).toBe(true);
    expect(r.bossEntered).toBe(false);
  });

  it('signale l’entrée du boss', () => {
    const p = topSnap();
    const r = observe(
      snapshot([p], { salle: SALLES_PER_CHAPTER - 1 }),
      snapshot([p], { salle: SALLES_PER_CHAPTER }),
    );
    expect(r.bossEntered).toBe(true);
  });

  it('signale la validation du chapitre une seule fois', () => {
    const p = topSnap();
    const validated = snapshot([p], { chapterValidated: true });
    expect(observe(snapshot([p]), validated).chapterValidated).toBe(true);
    expect(observe(validated, validated).chapterValidated).toBe(false);
  });

  it('ne signale rien quand rien ne bouge', () => {
    const p = topSnap();
    const r = observe(snapshot([p]), snapshot([p]));
    expect(r).toEqual({ hits: [], deaths: [], salleChanged: false, bossEntered: false, chapterValidated: false });
  });
});
```

- [ ] **Step 4: Vérifier l'échec**

Run: `npx vitest run src/render/observer.test.ts`
Expected: FAIL — `Failed to resolve import "./observer"`.

- [ ] **Step 5: Écrire `src/render/observer.ts`**

```ts
import { SALLES_PER_CHAPTER, TICK_S } from '../sim/config';
import { FEEL } from './feel';
import { snapshotById, type Snapshot, type TopSnapshot } from './snapshot';

export interface HitEvent {
  id: string;
  x: number;
  y: number;
  /** Direction normalisée du contact, vers la toupie la plus proche. */
  nx: number;
  ny: number;
  /** Puissance du choc, bornée à [0, 1]. */
  power: number;
}

export interface DeathEvent {
  id: string;
  x: number;
  y: number;
  isPlayer: boolean;
}

export interface RenderEvents {
  hits: HitEvent[];
  deaths: DeathEvent[];
  salleChanged: boolean;
  bossEntered: boolean;
  chapterValidated: boolean;
}

function nearest(from: TopSnapshot, tops: TopSnapshot[]): { nx: number; ny: number } {
  let bestX = 0;
  let bestY = 0;
  let bestD = Infinity;
  for (const other of tops) {
    if (other.id === from.id) continue;
    const dx = other.x - from.x;
    const dy = other.y - from.y;
    const d = Math.hypot(dx, dy);
    if (d > 0 && d < bestD) {
      bestD = d;
      bestX = dx / d;
      bestY = dy / d;
    }
  }
  return { nx: bestX, ny: bestY };
}

/**
 * Déduit les événements de rendu en comparant deux instantanés.
 * Fonction pure : la simulation n'émet rien, c'est ici qu'on reconstruit.
 */
export function observe(before: Snapshot, after: Snapshot): RenderEvents {
  const wasThere = snapshotById(before);
  const hits: HitEvent[] = [];
  const deaths: DeathEvent[] = [];

  for (const top of after.tops) {
    const prev = wasThere.get(top.id);
    if (!prev) continue;
    // Ce qui a été perdu au-delà de la décroissance d'endurance est un choc.
    const extra = prev.spin - top.spin - prev.spinDecay * TICK_S;
    if (extra <= FEEL.hitEpsilon) continue;
    const { nx, ny } = nearest(top, after.tops);
    hits.push({
      id: top.id,
      x: top.x,
      y: top.y,
      nx,
      ny,
      power: Math.min(1, extra / FEEL.hitReference),
    });
  }

  const stillThere = snapshotById(after);
  for (const top of before.tops) {
    // La simulation retire les bots morts de state.bots dès le tick où ils tombent.
    if (!top.isPlayer && !stillThere.has(top.id)) {
      deaths.push({ id: top.id, x: top.x, y: top.y, isPlayer: false });
    }
  }
  if (before.phase !== 'dead' && after.phase === 'dead') {
    const player = stillThere.get('player') ?? wasThere.get('player');
    if (player) deaths.push({ id: player.id, x: player.x, y: player.y, isPlayer: true });
  }

  return {
    hits,
    deaths,
    salleChanged: before.salle !== after.salle,
    bossEntered: before.salle !== SALLES_PER_CHAPTER && after.salle === SALLES_PER_CHAPTER,
    chapterValidated: !before.chapterValidated && after.chapterValidated,
  };
}
```

- [ ] **Step 6: Vérifier que les tests passent**

Run: `npm run test`
Expected: PASS — 55 tests (44 + 11).

- [ ] **Step 7: Commit**

```bash
git add src/render/feel.ts src/render/snapshot.ts src/render/observer.ts src/render/observer.test.ts
git commit -m "feat(render): observateur pur qui déduit chocs, morts et progression de la sim"
```

---

### Task 5: Boucle de jeu — interpolation, rappels stables, pause

**Files:**
- Modify: `src/ui/useGameLoop.ts`

**Interfaces:**
- Consumes: `TICK_S` de `config`, `tick` de `sim`, `SimState`, `Vec`.
- Produces: `GameLoopHandlers { beforeTick, afterTick, draw }` et la nouvelle signature `useGameLoop(stateRef, steerRef, handlers, running)`.

**Contexte :** deux dettes traitées ici. La boucle actuelle capture la première closure `onFrame` (deps `[]`) et laisse un `eslint-disable` orphelin alors qu'aucun ESLint n'est configuré. Et surtout : elle affiche l'état brut d'une simulation à 10 Hz, donc **tout mouvement est vu à 10 images par seconde** quel que soit le framerate.

- [ ] **Step 1: Réécrire `src/ui/useGameLoop.ts` en entier**

```ts
import { useEffect, useRef } from 'react';
import { TICK_S } from '../sim/config';
import { tick } from '../sim/sim';
import type { SimState, Vec } from '../sim/types';

const STEP_MS = TICK_S * 1000;
const MAX_CATCHUP_MS = 250;

export interface GameLoopHandlers {
  /** Appelé juste avant chaque tick : le rendu y prend son instantané. */
  beforeTick(state: SimState): void;
  /** Appelé juste après chaque tick : le rendu y déduit ses événements. */
  afterTick(state: SimState): void;
  /** Appelé une fois par image. `alpha` ∈ [0, 1) interpole entre les deux derniers ticks. */
  draw(state: SimState, alpha: number): void;
}

export function useGameLoop(
  stateRef: { current: SimState },
  steerRef: { current: Vec | null },
  handlers: GameLoopHandlers,
  running: boolean,
): void {
  // Les rappels changent à chaque rendu ; la boucle lit toujours les derniers
  // via cette ref, ce qui supprime la closure figée de la version précédente.
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  const runningRef = useRef(running);
  runningRef.current = running;

  useEffect(() => {
    let raf = 0;
    let acc = 0;
    let last = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const elapsed = Math.min(now - last, MAX_CATCHUP_MS);
      last = now;
      const h = handlersRef.current;
      if (!runningRef.current) {
        acc = 0;
        return;
      }
      acc += elapsed;
      while (acc >= STEP_MS) {
        h.beforeTick(stateRef.current);
        tick(stateRef.current, { steer: steerRef.current });
        h.afterTick(stateRef.current);
        acc -= STEP_MS;
      }
      h.draw(stateRef.current, acc / STEP_MS);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [stateRef, steerRef]);
}
```

- [ ] **Step 2: Adapter `src/ui/Game.tsx` provisoirement pour que le build passe**

Remplacer l'appel `useGameLoop(...)` (lignes 33-36) par :

```tsx
  useGameLoop(
    stateRef,
    steerRef,
    {
      beforeTick: () => {},
      afterTick: () => setFrame((f) => f + 1),
      draw: () => arenaRef.current?.draw(stateRef.current),
    },
    true,
  );
```

Note : `setFrame` passe de 60 Hz à 10 Hz — les valeurs du HUD ne changent qu'aux ticks, il n'y a aucune raison de re-rendre React à chaque image.

- [ ] **Step 3: Vérifier le build et la suite**

Run: `npm run build && npm run test`
Expected: build vert, 55 tests verts.

- [ ] **Step 4: Vérifier à l'écran que rien n'a régressé**

Run: `npm run dev` puis ouvrir `http://localhost:5173/spinforge/`
Expected: le jeu se pilote toujours au doigt, le HUD se met à jour, les crédits montent.

- [ ] **Step 5: Commit**

```bash
git add src/ui/useGameLoop.ts src/ui/Game.tsx
git commit -m "refactor(loop): rappels par ref, crochets de tick et alpha d'interpolation"
```

---

### Task 6: Coquille à deux onglets

**Files:**
- Create: `src/content/chapters.ts`
- Create: `src/ui/App.tsx`
- Create: `src/ui/TabBar.tsx`
- Create: `src/ui/CombatScreen.tsx`
- Create: `src/ui/ForgeScreen.tsx`
- Delete: `src/ui/Game.tsx`, `src/ui/Hud.tsx`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: `createArena` (signature actuelle, remplacée en Task 7), `useGameLoop` (Task 5), `PALETTE`/`hex` (Task 1), `formatCredits`, `tryUpgrade`, `upgradeCost`, `playerStats`, `resetRun`.
- Produces:
  - `CHAPTERS: { name: string; boss: string }[]`, `chapterOf(n)`.
  - `App` monté par `main.tsx`.
  - `ArenaHost` — la prop `arenaRef` et le `hostRef` que Task 7 remplira.

**Contexte :** les 4 améliorations quittent l'écran de combat pour l'onglet Forge, comme dans `design/Combat.dc.html`. Coffres et Toupies sont visibles et cadenassés. Le `≡` du wireframe n'ouvre aucun menu et n'en ouvrira pas avant le jalon 2 : il devient la coupure du son (câblée en Task 13, inerte ici).

**Décision de comportement :** passer sur l'onglet Forge **met la simulation en pause**. Sans ça, le joueur meurt pendant qu'il fait ses courses. C'est un changement volontaire par rapport au jalon 1.

- [ ] **Step 1: Écrire `src/content/chapters.ts`**

```ts
/** Les 8 arènes-chapitres. Univers original — aucun nom officiel Beyblade. */
export interface Chapter {
  name: string;
  boss: string;
}

export const CHAPTERS: Chapter[] = [
  { name: 'Hangar Rouillé', boss: 'Gardien du Hangar' },
  { name: 'Dojo Néon', boss: 'Maître des Néons' },
  { name: 'Marché Souterrain', boss: 'Doyen des Piliers' },
  { name: 'Cratère de Magma', boss: 'Forgeron du Cratère' },
  { name: 'Temple sous la Glace', boss: 'Veilleur de Givre' },
  { name: 'Jardin Suspendu', boss: 'Sentinelle Suspendue' },
  { name: 'Station Orbitale', boss: 'Pilote Orbital' },
  { name: 'Le Vortex', boss: 'Cœur du Vortex' },
];

export function chapterOf(chapter: number): Chapter {
  return CHAPTERS[Math.min(Math.max(1, chapter), CHAPTERS.length) - 1];
}
```

- [ ] **Step 2: Écrire `src/ui/TabBar.tsx`**

```tsx
export type Tab = 'combat' | 'forge';

const LOCKED = ['Coffres', 'Toupies'];

export function TabBar({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  return (
    <nav style={{ display: 'flex', gap: 7 }}>
      {(['combat', 'forge'] as const).map((t) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          style={{
            flex: '1 1 0', minHeight: 44, borderRadius: 10, cursor: 'pointer',
            fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontSize: 15, letterSpacing: '.02em',
            border: `1px solid ${tab === t ? 'var(--ember)' : 'var(--line)'}`,
            background: tab === t ? 'var(--ember)' : 'var(--panel)',
            color: tab === t ? '#151109' : 'var(--text)',
            fontWeight: tab === t ? 600 : 500,
          }}
        >
          {t === 'combat' ? 'Combat' : 'Forge'}
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

- [ ] **Step 3: Écrire `src/ui/ForgeScreen.tsx`**

```tsx
import { formatCredits } from './format';
import { playerStats, tryUpgrade, upgradeCost } from '../sim/economy';
import type { PieceLevels, SimState } from '../sim/types';

interface Piece {
  key: keyof PieceLevels;
  label: string;
  stat: string;
  read: (p: PieceLevels) => number;
  digits: number;
}

const PIECES: Piece[] = [
  { key: 'lame', label: 'Lame', stat: 'Attaque', read: (p) => playerStats(p).attack, digits: 0 },
  { key: 'disque', label: 'Disque', stat: 'Défense', read: (p) => playerStats(p).defense, digits: 0 },
  { key: 'pointe', label: 'Pointe', stat: 'Vitesse', read: (p) => playerStats(p).maxSpeed, digits: 0 },
  { key: 'noyau', label: 'Noyau', stat: 'Spin max', read: (p) => playerStats(p).spinMax, digits: 0 },
];

export function ForgeScreen({ stateRef, onChanged }: { stateRef: { current: SimState }; onChanged: () => void }) {
  const s = stateRef.current;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0' }}>
      <h2 style={{ font: '600 20px Oswald, ui-sans-serif, sans-serif', margin: 0, letterSpacing: '.02em' }}>
        Forge
      </h2>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--muted)' }}>
        Le combat est en pause pendant que tu améliores.
      </p>
      {PIECES.map((piece) => {
        const level = s.pieces[piece.key];
        const cost = upgradeCost(level);
        const before = piece.read(s.pieces);
        const after = piece.read({ ...s.pieces, [piece.key]: level + 1 });
        const affordable = s.credits >= cost;
        return (
          <button
            key={piece.key}
            disabled={!affordable}
            onClick={() => {
              tryUpgrade(stateRef.current, piece.key);
              onChanged();
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
                {piece.label} <span style={{ color: 'var(--muted)' }}>niv. {level}</span>
              </span>
              <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
                {piece.stat} {before.toFixed(piece.digits)} → {after.toFixed(piece.digits)}
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

- [ ] **Step 4: Écrire `src/ui/CombatScreen.tsx`**

```tsx
import { useEffect, useRef } from 'react';
import { createArena } from '../render/arena';
import { useGameLoop } from './useGameLoop';
import { chapterOf } from '../content/chapters';
import { SALLES_PER_CHAPTER } from '../sim/config';
import { resetRun } from '../sim/sim';
import type { SimState, Vec } from '../sim/types';

const DEAD_ZONE_PX = 8;

export function CombatScreen({
  stateRef, running, onTick,
}: {
  stateRef: { current: SimState };
  running: boolean;
  onTick: () => void;
}) {
  const steerRef = useRef<Vec | null>(null);
  const originRef = useRef<Vec | null>(null);
  const pointerRef = useRef<number | null>(null);
  const arenaRef = useRef<Awaited<ReturnType<typeof createArena>> | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);

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

  useGameLoop(
    stateRef,
    steerRef,
    {
      beforeTick: (state) => arenaRef.current?.beforeTick(state),
      afterTick: (state) => {
        arenaRef.current?.afterTick(state);
        onTick();
      },
      draw: (state, alpha) => arenaRef.current?.draw(state, alpha),
    },
    running,
  );

  const onDown = (e: React.PointerEvent) => {
    // Glisser n'importe où pilote la toupie — sauf sur un bouton.
    if ((e.target as HTMLElement).closest('button')) return;
    if (pointerRef.current !== null) return;
    pointerRef.current = e.pointerId;
    originRef.current = { x: e.clientX, y: e.clientY };
  };
  const onMove = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerRef.current || !originRef.current) return;
    const dx = e.clientX - originRef.current.x;
    const dy = e.clientY - originRef.current.y;
    steerRef.current = Math.hypot(dx, dy) > DEAD_ZONE_PX ? { x: dx, y: dy } : null;
  };
  const onUp = (e: React.PointerEvent) => {
    if (e.pointerId !== pointerRef.current) return;
    pointerRef.current = null;
    originRef.current = null;
    steerRef.current = null;
  };

  const s = stateRef.current;
  const chapter = chapterOf(s.chapter);
  const spinPct = Math.max(0, Math.min(100, (s.player.spin / s.player.spinMax) * 100));

  return (
    <div
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerLeave={onUp}
      onPointerCancel={onUp}
      style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: '1 1 0', touchAction: 'none' }}
    >
      <section style={{ border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 11, padding: '9px 12px' }}>
        <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>
          Chapitre {s.chapter} — {chapter.name}
        </p>
        <p style={{ margin: 0, font: '500 22px/1.15 Oswald, ui-sans-serif, sans-serif', letterSpacing: '.02em' }}>
          SALLE {s.salle} / {SALLES_PER_CHAPTER}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
            {s.salle === SALLES_PER_CHAPTER ? chapter.boss : `Boss : salle ${SALLES_PER_CHAPTER}`}
          </span>
          <div style={{ flex: '1 1 0', height: 7, borderRadius: 4, background: 'var(--bg)', border: '1px solid var(--line)', overflow: 'hidden' }}>
            <div style={{ width: `${((s.salle - 1) / (SALLES_PER_CHAPTER - 1)) * 100}%`, height: '100%', background: 'var(--ember)' }} />
          </div>
        </div>
      </section>

      <div ref={hostRef} style={{ width: '100%', aspectRatio: '1 / 1', borderRadius: 14, overflow: 'hidden', background: '#05070b' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.07em' }}>SPIN</span>
        <div style={{ flex: '1 1 0', height: 9, borderRadius: 5, background: 'var(--bg)', border: '1px solid var(--line)', overflow: 'hidden' }}>
          <div style={{ width: `${spinPct}%`, height: '100%', background: 'var(--player)' }} />
        </div>
      </div>

      {s.phase === 'dead' ? (
        <button
          onClick={() => { resetRun(stateRef.current); onTick(); }}
          style={{
            minHeight: 48, borderRadius: 11, cursor: 'pointer', border: '1px solid var(--ember)',
            background: 'var(--ember)', color: '#151109', font: '600 15px Oswald, ui-sans-serif, sans-serif',
          }}
        >
          Ta toupie s'est arrêtée — Retenter
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 5: Écrire `src/ui/App.tsx`**

```tsx
import { useRef, useState } from 'react';
import { createInitialState } from '../sim/sim';
import { formatCredits } from './format';
import { CombatScreen } from './CombatScreen';
import { ForgeScreen } from './ForgeScreen';
import { TabBar, type Tab } from './TabBar';

export function App() {
  const [initialState] = useState(() => createInitialState(Date.now() >>> 0));
  const stateRef = useRef(initialState);
  const [tab, setTab] = useState<Tab>('combat');
  const [, setFrame] = useState(0);
  const redraw = () => setFrame((f) => f + 1);

  return (
    <div
      style={{
        minHeight: '100vh', maxWidth: 460, margin: '0 auto', padding: '14px 16px 12px',
        display: 'flex', flexDirection: 'column', gap: 10,
        background: 'var(--bg)', color: 'var(--text)', userSelect: 'none',
      }}
    >
      <header style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span
          style={{
            border: '1px solid var(--line)', background: 'var(--panel)', borderRadius: 9,
            padding: '5px 11px', fontSize: 12.5,
          }}
        >
          Crédits{' '}
          <span style={{ color: 'var(--ember)', fontFamily: 'Oswald, ui-sans-serif, sans-serif', fontVariantNumeric: 'tabular-nums' }}>
            {formatCredits(stateRef.current.credits)}
          </span>
        </span>
      </header>

      {/* L'écran de combat reste monté quand on passe en Forge : détruire l'app
          PixiJS à chaque changement d'onglet coûterait un rechargement complet
          des textures. On le masque, la boucle se met en pause. */}
      <div style={{ display: tab === 'combat' ? 'flex' : 'none', flexDirection: 'column', flex: '1 1 0' }}>
        <CombatScreen stateRef={stateRef} running={tab === 'combat'} onTick={redraw} />
      </div>
      {tab === 'forge' ? <ForgeScreen stateRef={stateRef} onChanged={redraw} /> : null}

      <TabBar tab={tab} onChange={setTab} />
    </div>
  );
}
```

- [ ] **Step 6: Adapter `src/render/arena.ts` à la nouvelle interface (version transitoire)**

Remplacer `src/render/arena.ts` par :

```ts
import { Application, Graphics } from 'pixi.js';
import { ARENA_RADIUS } from '../sim/config';
import { PALETTE } from '../theme';
import type { SimState } from '../sim/types';

const MARGIN = 1.06;

export interface Arena {
  beforeTick(state: SimState): void;
  afterTick(state: SimState): void;
  draw(state: SimState, alpha: number): void;
  destroy(): void;
}

export async function createArena(host: HTMLElement): Promise<Arena> {
  const app = new Application();
  await app.init({ resizeTo: host, background: PALETTE.bg, antialias: true, resolution: Math.min(devicePixelRatio || 1, 2), autoDensity: true });
  host.appendChild(app.canvas);
  const g = new Graphics();
  app.stage.addChild(g);

  const scale = () => Math.min(app.screen.width, app.screen.height) / (2 * ARENA_RADIUS * MARGIN);

  return {
    beforeTick() {},
    afterTick() {},
    draw(state) {
      const k = scale();
      const cx = app.screen.width / 2;
      const cy = app.screen.height / 2;
      g.clear();
      g.circle(cx, cy, ARENA_RADIUS * k).stroke({ width: 2, color: PALETTE.rim });
      for (const b of state.bots) {
        g.circle(cx + b.pos.x * k, cy + b.pos.y * k, b.radius * k).fill(PALETTE.bot);
      }
      const p = state.player;
      g.circle(cx + p.pos.x * k, cy + p.pos.y * k, p.radius * k).fill(PALETTE.player);
    },
    destroy() {
      app.destroy(true, { children: true });
    },
  };
}
```

- [ ] **Step 7: Basculer `main.tsx` et supprimer les anciens écrans**

Dans `src/main.tsx`, remplacer l'import et le rendu de `Game` par `App` :

```tsx
import { App } from './ui/App';
...
createRoot(document.getElementById('root')!).render(<App />);
```

Run: `rm src/ui/Game.tsx src/ui/Hud.tsx`

- [ ] **Step 8: Vérifier**

Run: `npm run build && npm run test`
Expected: build vert, 55 tests verts.

Run: `npm run dev` puis `http://localhost:5173/spinforge/`
Expected: deux onglets fonctionnels, Coffres et Toupies cadenassés, les améliorations sont dans Forge avec leur delta de stat, l'arène remplit la largeur et reste carrée, **et elle n'est plus rognée à 320 px de large** (vérifier en réduisant la fenêtre). Passer en Forge met bien le combat en pause.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(ui): coquille à deux onglets, arène redimensionnable, améliorations dans Forge"
```

---

### Task 7: Fabrique de textures

**Files:**
- Create: `src/render/textures.ts`

**Interfaces:**
- Consumes: `PALETTE` de `src/theme`.
- Produces:
  - `type Shape = 'player' | 'bot'`
  - `Textures { body: Record<Shape, Texture[]>; rim: Record<Shape, Texture[]>; core: Texture; halo: Texture; spark: Texture; wave: Texture; shadow: Texture }`
  - `createTextures(): Textures`
  - `destroyTextures(t: Textures): void`

**Contexte :** les textures sont dessinées **une seule fois** en Canvas2D puis enveloppées dans une `Texture` Pixi. Rien n'est retracé par image : la chaleur devient un `tint`, la rotation une `rotation`, l'usure un échange de texture. C'est ce qui tient les 60 fps sur mobile.

Les corps sont dessinés en **acier neutre non teinté** ; seuls le liseré, le noyau, le halo, l'étincelle et l'onde sont dessinés en **blanc** pour être teintés par `spinTint`.

- [ ] **Step 1: Écrire `src/render/textures.ts`**

```ts
import { Texture } from 'pixi.js';
import { hex, PALETTE } from '../theme';

export type Shape = 'player' | 'bot';

/** Résolution des textures de toupie, généreuse : elles sont réduites à l'écran. */
const TOP_PX = 256;
const NOTCHES: Record<Shape, number> = { player: 6, bot: 5 };
const HOOK: Record<Shape, number> = { player: 0, bot: 0.16 };
/** Trois niveaux d'usure : intact, ébréché, très ébréché. */
const WEAR_CHIP = [0, 0.34, 0.6];

export interface Textures {
  body: Record<Shape, Texture[]>;
  rim: Record<Shape, Texture[]>;
  core: Texture;
  halo: Texture;
  spark: Texture;
  wave: Texture;
  shadow: Texture;
}

function canvas(size: number): { el: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const el = document.createElement('canvas');
  el.width = size;
  el.height = size;
  return { el, ctx: el.getContext('2d')! };
}

/**
 * Disque encoché vu de dessus : bord d'attaque net pour que le sens de rotation
 * se lise, creux vers l'intérieur. Le motif d'ébréchure est fixe pour ne pas scintiller.
 */
function notchedDisc(ctx: CanvasRenderingContext2D, r: number, shape: Shape, chip: number): void {
  const n = NOTCHES[shape];
  const hook = HOOK[shape];
  const step = (Math.PI * 2) / n;
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = i * step;
    const worn = chip > 0 && ((i * 7) % n) / n < chip;
    const ro = r * (worn ? 0.86 : 1);
    ctx.arc(0, 0, ro, a, a + step * (0.58 - hook));
    const b = a + step * (0.58 - hook);
    ctx.lineTo(Math.cos(b + step * 0.16) * r * 0.7, Math.sin(b + step * 0.16) * r * 0.7);
    ctx.lineTo(Math.cos(a + step) * r * (0.82 + hook), Math.sin(a + step) * r * (0.82 + hook));
  }
  ctx.closePath();
}

function bodyTexture(shape: Shape, chip: number): Texture {
  const { el, ctx } = canvas(TOP_PX);
  const c = TOP_PX / 2;
  const r = c * 0.94;
  ctx.translate(c, c);
  notchedDisc(ctx, r, shape, chip);
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#5a6779');
  g.addColorStop(0.5, '#3a4450');
  g.addColorStop(1, '#222932');
  ctx.fillStyle = g;
  ctx.fill();
  // disque central rivé
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  const d = ctx.createRadialGradient(-r * 0.24, -r * 0.28, 1, 0, 0, r * 0.6);
  d.addColorStop(0, '#515f71');
  d.addColorStop(1, '#1f252e');
  ctx.fillStyle = d;
  ctx.fill();
  ctx.fillStyle = '#161c24';
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    ctx.beginPath();
    ctx.arc(Math.cos(a) * r * 0.44, Math.sin(a) * r * 0.44, r * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  return Texture.from(el);
}

function rimTexture(shape: Shape, chip: number): Texture {
  const { el, ctx } = canvas(TOP_PX);
  const c = TOP_PX / 2;
  ctx.translate(c, c);
  notchedDisc(ctx, c * 0.94, shape, chip);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = TOP_PX * 0.022;
  ctx.lineJoin = 'round';
  ctx.stroke();
  return Texture.from(el);
}

function radialTexture(size: number, stops: [number, number][]): Texture {
  const { el, ctx } = canvas(size);
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  for (const [offset, alpha] of stops) g.addColorStop(offset, `rgba(255,255,255,${alpha})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(el);
}

function waveTexture(): Texture {
  const size = 256;
  const { el, ctx } = canvas(size);
  const c = size / 2;
  ctx.beginPath();
  ctx.arc(c, c, c * 0.86, 0, Math.PI * 2);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.05;
  ctx.stroke();
  return Texture.from(el);
}

function shadowTexture(): Texture {
  const size = 128;
  const { el, ctx } = canvas(size);
  const c = size / 2;
  const g = ctx.createRadialGradient(c, c, 0, c, c, c);
  g.addColorStop(0, 'rgba(0,0,0,.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return Texture.from(el);
}

export function createTextures(): Textures {
  const shapes: Shape[] = ['player', 'bot'];
  const body = {} as Record<Shape, Texture[]>;
  const rim = {} as Record<Shape, Texture[]>;
  for (const shape of shapes) {
    body[shape] = WEAR_CHIP.map((chip) => bodyTexture(shape, chip));
    rim[shape] = WEAR_CHIP.map((chip) => rimTexture(shape, chip));
  }
  return {
    body,
    rim,
    core: radialTexture(128, [[0, 1], [0.55, 0.75], [1, 0]]),
    halo: radialTexture(256, [[0, 0.55], [1, 0]]),
    spark: radialTexture(32, [[0, 1], [0.4, 0.9], [1, 0]]),
    wave: waveTexture(),
    shadow: shadowTexture(),
  };
}

export function destroyTextures(t: Textures): void {
  const all = [
    ...t.body.player, ...t.body.bot, ...t.rim.player, ...t.rim.bot,
    t.core, t.halo, t.spark, t.wave, t.shadow,
  ];
  for (const tex of all) tex.destroy(true);
}

/** Sol de l'arène : plaque d'acier tournée, rouillée et rivetée du Hangar Rouillé. */
export function floorTexture(pixelSize: number): Texture {
  const { el, ctx } = canvas(pixelSize);
  const c = pixelSize / 2;
  const r = c * 0.94;

  const g = ctx.createRadialGradient(c, c - r * 0.3, r * 0.1, c, c, r);
  g.addColorStop(0, hex(PALETTE.floorInner));
  g.addColorStop(0.72, '#1d242d');
  g.addColorStop(1, hex(PALETTE.floorOuter));
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.fillStyle = g;
  ctx.fill();

  ctx.save();
  ctx.clip();
  ctx.strokeStyle = 'rgba(120,138,164,.05)';
  ctx.lineWidth = Math.max(1, pixelSize / 360);
  for (let rr = r * 0.16; rr < r; rr += r * 0.085) {
    ctx.beginPath();
    ctx.arc(c, c, rr, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = 'rgba(146,78,44,.055)';
  for (const [x, y, s] of [[-0.44, -0.28, 0.2], [0.46, 0.18, 0.15], [-0.06, 0.52, 0.17], [0.24, -0.55, 0.11], [-0.62, 0.34, 0.12]]) {
    ctx.beginPath();
    ctx.ellipse(c + x * r, c + y * r, r * s, r * s * 0.62, x * 2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(120,60,32,.05)';
  const grain = Math.max(2, pixelSize / 180);
  for (let i = 0; i < 90; i++) {
    const a = i * 2.399;
    const d = r * Math.sqrt(((i * 37) % 100) / 100);
    ctx.fillRect(c + Math.cos(a) * d, c + Math.sin(a) * d, grain, grain);
  }
  ctx.restore();

  // rebord biseauté : ombre extérieure épaisse, liseré intérieur éclairé
  ctx.beginPath();
  ctx.arc(c, c, r, 0, Math.PI * 2);
  ctx.lineWidth = pixelSize * 0.026;
  ctx.strokeStyle = hex(PALETTE.rimShadow);
  ctx.stroke();
  ctx.lineWidth = pixelSize * 0.008;
  ctx.strokeStyle = hex(PALETTE.rim);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, r - pixelSize * 0.014, 0, Math.PI * 2);
  ctx.lineWidth = Math.max(1, pixelSize * 0.004);
  ctx.strokeStyle = 'rgba(160,182,212,.22)';
  ctx.stroke();

  ctx.fillStyle = '#151a22';
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * r, c + Math.sin(a) * r, pixelSize * 0.006, 0, Math.PI * 2);
    ctx.fill();
  }
  return Texture.from(el);
}
```

- [ ] **Step 2: Vérifier le build**

Run: `npm run build`
Expected: build vert. Ce module n'a pas de test unitaire : `environment: 'node'` n'a pas de `document`, et une texture ne s'assertit pas — sa vérification est visuelle, en Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/render/textures.ts
git commit -m "feat(render): fabrique de textures Canvas2D pour toupies, sol et effets"
```

---

### Task 8: Les toupies tournent — rotation, incandescence, usure, traînée

**Files:**
- Create: `src/render/topView.ts`
- Modify: `src/render/arena.ts` (réécriture complète)

**Interfaces:**
- Consumes: `Textures`, `floorTexture` (Task 7), `FEEL`/`spinOmega` (Task 4), `takeSnapshot`/`snapshotById`/`lerp` (Task 4), `spinTint`/`PALETTE` (Task 1), `ARENA_RADIUS`.
- Produces:
  - `TopView { container, sync(x, y, ratio, speedRatio, dt), setCamp(camp), destroy() }`
  - `createTopView(tex, shape, camp, radius): TopView`
  - `Arena` complet : `beforeTick`, `afterTick`, `draw(state, alpha)`, `destroy`.

**C'est la tâche qui décide du critère d'acceptation central** : « on distingue une toupie en pleine forme d'une toupie mourante sans lire le HUD ».

- [ ] **Step 1: Écrire `src/render/topView.ts`**

```ts
import { Container, Sprite } from 'pixi.js';
import { spinTint, type Camp } from '../theme';
import { FEEL, spinOmega } from './feel';
import type { Shape, Textures } from './textures';

interface Ghost {
  sprite: Sprite;
  life: number;
}

export interface TopView {
  container: Container;
  /** `dt` en secondes ; `ratio` = spin/spinMax ; `speedRatio` = vitesse/vitesse max. */
  sync(x: number, y: number, ratio: number, speedRatio: number, dt: number): void;
  destroy(): void;
}

function wearIndex(ratio: number): number {
  if (ratio < FEEL.wearLevel2) return 2;
  if (ratio < FEEL.wearLevel1) return 1;
  return 0;
}

export function createTopView(tex: Textures, shape: Shape, camp: Camp, radius: number): TopView {
  const container = new Container();
  const trail = new Container();
  const size = radius * 2;

  const halo = new Sprite(tex.halo);
  halo.anchor.set(0.5);
  halo.blendMode = 'add';
  halo.width = halo.height = size * FEEL.haloRadiusMult * 2;

  const shadow = new Sprite(tex.shadow);
  shadow.anchor.set(0.5);
  shadow.width = size * 1.5;
  shadow.height = size * 0.7;
  shadow.y = radius * 0.5;

  const body = new Sprite(tex.body[shape][0]);
  body.anchor.set(0.5);
  body.width = body.height = size;

  const rim = new Sprite(tex.rim[shape][0]);
  rim.anchor.set(0.5);
  rim.width = rim.height = size;

  const core = new Sprite(tex.core);
  core.anchor.set(0.5);
  core.blendMode = 'add';
  core.width = core.height = size * 0.62;

  const pivot = new Container();
  pivot.addChild(body, rim, core);
  container.addChild(halo, shadow, trail, pivot);

  const ghosts: Ghost[] = [];
  let angle = Math.random() * Math.PI * 2;
  let wear = 0;

  return {
    container,
    sync(x, y, ratio, speedRatio, dt) {
      container.x = x;
      container.y = y;

      angle += spinOmega(ratio) * dt;
      pivot.rotation = angle;

      const tint = spinTint(camp, ratio);
      rim.tint = tint;
      core.tint = tint;
      halo.tint = tint;
      core.alpha = 0.35 + 0.65 * ratio;
      halo.alpha = FEEL.haloAlphaBase + FEEL.haloAlphaSpan * ratio;

      const w = wearIndex(ratio);
      if (w !== wear) {
        wear = w;
        body.texture = tex.body[shape][w];
        rim.texture = tex.rim[shape][w];
      }

      // Traînée : uniquement au-delà du seuil de vitesse, sinon elle ne dit rien.
      if (speedRatio > FEEL.trailSpeedRatio && ghosts.length < FEEL.trailMax) {
        const sprite = new Sprite(tex.rim[shape][w]);
        sprite.anchor.set(0.5);
        sprite.width = sprite.height = size;
        sprite.blendMode = 'add';
        sprite.tint = tint;
        // Les fantômes vivent en coordonnées monde, pas dans le conteneur qui bouge.
        sprite.x = x;
        sprite.y = y;
        sprite.rotation = angle;
        trail.addChild(sprite);
        ghosts.push({ sprite, life: 1 });
      }
      for (let i = ghosts.length - 1; i >= 0; i--) {
        const g = ghosts[i];
        g.life -= dt / FEEL.trailLife;
        if (g.life <= 0) {
          g.sprite.destroy();
          ghosts.splice(i, 1);
        } else {
          g.sprite.alpha = 0.17 * g.life * g.life * ratio;
        }
      }
      // Le conteneur suit la toupie ; les fantômes doivent rester où ils sont nés.
      trail.x = -x;
      trail.y = -y;
    },
    destroy() {
      for (const g of ghosts) g.sprite.destroy();
      ghosts.length = 0;
      container.destroy({ children: true });
    },
  };
}
```

- [ ] **Step 2: Réécrire `src/render/arena.ts`**

```ts
import { Application, Container, Sprite, Texture } from 'pixi.js';
import { ARENA_RADIUS, SALLES_PER_CHAPTER } from '../sim/config';
import { PALETTE } from '../theme';
import type { SimState } from '../sim/types';
import { createTextures, destroyTextures, floorTexture, type Shape } from './textures';
import { createTopView, type TopView } from './topView';
import { lerp, snapshotById, takeSnapshot, type Snapshot } from './snapshot';

/** Marge entre le bord de l'anneau et le bord du canvas. */
const MARGIN = 1.1;

export interface Arena {
  beforeTick(state: SimState): void;
  afterTick(state: SimState): void;
  draw(state: SimState, alpha: number): void;
  destroy(): void;
}

export async function createArena(host: HTMLElement): Promise<Arena> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    background: PALETTE.bg,
    antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
  });
  host.appendChild(app.canvas);

  const tex = createTextures();
  const world = new Container();
  const floorLayer = new Container();
  const topLayer = new Container();
  world.addChild(floorLayer, topLayer);
  app.stage.addChild(world);

  const floor = new Sprite(Texture.EMPTY);
  floor.anchor.set(0.5);
  floor.width = floor.height = ARENA_RADIUS * 2 * 1.06;
  floorLayer.addChild(floor);

  const views = new Map<string, TopView>();
  let before: Snapshot | null = null;
  let snapPositions = true;
  let floorPx = 0;
  let lastDraw = performance.now();

  function layout(): void {
    const size = Math.min(app.screen.width, app.screen.height);
    world.scale.set(size / (2 * ARENA_RADIUS * MARGIN));
    world.x = app.screen.width / 2;
    world.y = app.screen.height / 2;
    const wanted = Math.max(256, Math.round(size * Math.min(window.devicePixelRatio || 1, 2)));
    if (wanted !== floorPx) {
      floorPx = wanted;
      const old = floor.texture;
      floor.texture = floorTexture(wanted);
      if (old !== Texture.EMPTY) old.destroy(true);
    }
  }

  function viewFor(id: string, isPlayer: boolean, radius: number, salle: number): TopView {
    let view = views.get(id);
    if (!view) {
      const shape: Shape = isPlayer ? 'player' : 'bot';
      const boss = !isPlayer && salle === SALLES_PER_CHAPTER;
      view = createTopView(tex, shape, isPlayer ? 'player' : boss ? 'boss' : 'bot', radius);
      topLayer.addChild(view.container);
      views.set(id, view);
    }
    return view;
  }

  return {
    beforeTick(state) {
      before = takeSnapshot(state);
    },
    afterTick(state) {
      // Au changement de salle, la simulation téléporte le joueur au point de
      // départ : interpoler ferait glisser la toupie à travers l'arène.
      if (before && before.salle !== state.salle) snapPositions = true;
    },
    draw(state, alpha) {
      const now = performance.now();
      const dt = Math.min((now - lastDraw) / 1000, 0.05);
      lastDraw = now;
      layout();

      const prev = before ? snapshotById(before) : null;
      const live = new Set<string>();
      const tops = [state.player, ...state.bots];

      for (const top of tops) {
        live.add(top.id);
        const view = viewFor(top.id, top.isPlayer, top.radius, state.salle);
        const p = prev?.get(top.id);
        const useLerp = p && !snapPositions;
        const x = useLerp ? lerp(p.x, top.pos.x, alpha) : top.pos.x;
        const y = useLerp ? lerp(p.y, top.pos.y, alpha) : top.pos.y;
        const ratio = Math.max(0, Math.min(1, top.spin / top.spinMax));
        const speedRatio = Math.hypot(top.vel.x, top.vel.y) / top.maxSpeed;
        view.sync(x, y, ratio, speedRatio, dt);
      }
      snapPositions = false;

      for (const [id, view] of views) {
        if (live.has(id)) continue;
        view.destroy();
        views.delete(id);
      }
    },
    destroy() {
      for (const view of views.values()) view.destroy();
      views.clear();
      if (floor.texture !== Texture.EMPTY) floor.texture.destroy(true);
      destroyTextures(tex);
      app.destroy(true, { children: true });
    },
  };
}
```

- [ ] **Step 3: Vérifier le build**

Run: `npm run build && npm run test`
Expected: build vert, 55 tests verts.

- [ ] **Step 4: Vérifier à l'œil — c'est le critère du jalon**

Run: `npm run dev` puis `http://localhost:5173/spinforge/`

Expected :
- les toupies **tournent** visiblement, et leur vitesse de rotation baisse quand leur spin baisse ;
- le joueur est cyan, les bots braise, le boss violet en salle 10 ;
- une toupie proche de la mort est nettement plus sombre, ébréchée, avec un halo réduit ;
- le mouvement est fluide à 60 fps et non saccadé à 10 Hz (c'est l'interpolation) ;
- l'arène a du relief : rainures, rouille, rebord biseauté, rivets ;
- **les toupies ne dépassent jamais de l'anneau** ;
- la traînée n'apparaît qu'à grande vitesse.

Si les toupies paraissent trop petites : **ne pas ajouter de facteur d'échelle dans le rendu**. Le levier est `PLAYER_BASE.radius` / `BOT_BASE.radius` dans `config.ts`, et c'est une décision d'équilibrage à remonter, pas une correction de rendu.

- [ ] **Step 5: Commit**

```bash
git add src/render/topView.ts src/render/arena.ts
git commit -m "feat(render): les toupies tournent, l'incandescence dit le spin, l'arène a du relief"
```

---

### Task 9: Retour d'impact — flash, onde, secousse, étincelles

**Files:**
- Create: `src/render/effects.ts`
- Modify: `src/render/topView.ts` (ajout de `flash`)
- Modify: `src/render/arena.ts` (branchement de l'observateur)

**Interfaces:**
- Consumes: `Textures`, `FEEL`, `observe`/`RenderEvents` (Task 4), `spinTint`.
- Produces:
  - `Effects { container, hit(x, y, nx, ny, power, tint), wave(x, y, radius, tint), flashScreen(intensity), update(dt), shake: { x, y }, destroy() }`
  - `createEffects(tex: Textures, screen: { width: number; height: number }): Effects`
  - `TopView.flash(power: number)`

- [ ] **Step 1: Écrire `src/render/effects.ts`**

```ts
import { Container, Sprite } from 'pixi.js';
import { FEEL } from './feel';
import type { Textures } from './textures';

interface Spark {
  sprite: Sprite;
  vx: number;
  vy: number;
  life: number;
}

interface Wave {
  sprite: Sprite;
  life: number;
  radius: number;
}

export interface Effects {
  /** À ajouter au conteneur monde (coordonnées de simulation). */
  container: Container;
  hit(x: number, y: number, nx: number, ny: number, power: number, tint: number): void;
  wave(x: number, y: number, radius: number, tint: number): void;
  update(dt: number): void;
  /** Décalage de secousse à appliquer au conteneur monde, en unités de simulation. */
  readonly shake: { x: number; y: number };
  destroy(): void;
}

export function createEffects(tex: Textures): Effects {
  const container = new Container();
  const sparkPool: Sprite[] = [];
  const sparks: Spark[] = [];
  const waves: Wave[] = [];
  let shakeAmount = 0;
  const shake = { x: 0, y: 0 };

  function takeSpark(): Sprite | null {
    if (sparks.length >= FEEL.sparkPool) return null;
    const sprite = sparkPool.pop() ?? new Sprite(tex.spark);
    sprite.anchor.set(0.5);
    sprite.blendMode = 'add';
    sprite.width = sprite.height = 3.2;
    sprite.visible = true;
    container.addChild(sprite);
    return sprite;
  }

  return {
    container,
    shake,
    hit(x, y, nx, ny, power, tint) {
      const count = Math.round(FEEL.sparkBase + FEEL.sparkSpan * power);
      for (let i = 0; i < count; i++) {
        const sprite = takeSpark();
        if (!sprite) break;
        // Gerbe orientée par la normale du contact, ouverte d'environ ±60°.
        const spread = (i / count - 0.5) * 2.1;
        const base = Math.atan2(ny, nx);
        const a = base + spread;
        const speed = 40 + 150 * power * (0.5 + (i % 5) / 5);
        sprite.x = x;
        sprite.y = y;
        sprite.tint = 0xffd9a0;
        sparks.push({ sprite, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: 1 });
      }
      this.wave(x, y, FEEL.waveRadius * (0.5 + power), tint);
      shakeAmount = Math.min(FEEL.shakeMax, shakeAmount + power * FEEL.shakePerHit);
    },
    wave(x, y, radius, tint) {
      const sprite = new Sprite(tex.wave);
      sprite.anchor.set(0.5);
      sprite.blendMode = 'add';
      sprite.tint = tint;
      sprite.x = x;
      sprite.y = y;
      sprite.width = sprite.height = 1;
      container.addChild(sprite);
      waves.push({ sprite, life: 1, radius });
    },
    update(dt) {
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.life -= dt / FEEL.sparkLife;
        if (s.life <= 0) {
          s.sprite.visible = false;
          container.removeChild(s.sprite);
          sparkPool.push(s.sprite);
          sparks.splice(i, 1);
          continue;
        }
        s.sprite.x += s.vx * dt;
        s.sprite.y += s.vy * dt;
        s.vx *= 0.93;
        s.vy = s.vy * 0.93 + 120 * dt;
        s.sprite.alpha = s.life;
      }
      for (let i = waves.length - 1; i >= 0; i--) {
        const w = waves[i];
        w.life -= dt / FEEL.waveLife;
        if (w.life <= 0) {
          w.sprite.destroy();
          waves.splice(i, 1);
          continue;
        }
        const grown = (1 - w.life) * w.radius * 2;
        w.sprite.width = w.sprite.height = grown;
        w.sprite.alpha = w.life * w.life * 0.7;
      }
      shakeAmount *= Math.pow(FEEL.shakeDamping, dt * 60);
      if (shakeAmount < 0.05) shakeAmount = 0;
      // Secousse déterministe en apparence mais sans RNG de simulation : on
      // n'utilise jamais le rngState, le rendu ne doit pas y toucher.
      const t = performance.now() / 1000;
      shake.x = Math.sin(t * 91.7) * shakeAmount;
      shake.y = Math.cos(t * 77.3) * shakeAmount;
    },
    destroy() {
      for (const s of sparks) s.sprite.destroy();
      for (const s of sparkPool) s.destroy();
      for (const w of waves) w.sprite.destroy();
      sparks.length = 0;
      sparkPool.length = 0;
      waves.length = 0;
      container.destroy({ children: true });
    },
  };
}
```

- [ ] **Step 2: Ajouter le flash d'impact à `TopView`**

Dans `src/render/topView.ts`, ajouter à l'interface :

```ts
  flash(power: number): void;
```

Dans `createTopView`, après la création de `core`, ajouter un sprite de flash :

```ts
  const flashSprite = new Sprite(tex.core);
  flashSprite.anchor.set(0.5);
  flashSprite.blendMode = 'add';
  flashSprite.width = flashSprite.height = size * 1.3;
  flashSprite.tint = 0xfff6e4;
  flashSprite.alpha = 0;
```

L'ajouter au conteneur : remplacer `container.addChild(halo, shadow, trail, pivot);` par

```ts
  container.addChild(halo, shadow, trail, pivot, flashSprite);
```

Déclarer l'état, à côté de `let wear = 0;` :

```ts
  let flashLife = 0;
```

Dans `sync`, avant le `return`, faire décroître le flash — ajouter juste après la mise à jour de la traînée :

```ts
      if (flashLife > 0) {
        flashLife = Math.max(0, flashLife - dt / FEEL.flashLife);
        flashSprite.alpha = 0.34 * flashLife * flashLife;
      }
```

Et exposer la méthode dans l'objet retourné, après `sync` :

```ts
    flash(power) {
      flashLife = Math.max(flashLife, Math.min(1, power));
    },
```

- [ ] **Step 3: Brancher l'observateur dans `src/render/arena.ts`**

Ajouter aux imports :

```ts
import { observe } from './observer';
import { createEffects, type Effects } from './effects';
import { spinTint } from '../theme';
```

Après la création de `topLayer`, créer la couche d'effets :

```ts
  const effects: Effects = createEffects(tex);
  world.addChild(floorLayer, topLayer, effects.container);
```

(et supprimer la ligne `world.addChild(floorLayer, topLayer);` qu'elle remplace)

Remplacer le corps de `afterTick` par :

```ts
    afterTick(state) {
      if (!before) return;
      const after = takeSnapshot(state);
      const events = observe(before, after);
      for (const hit of events.hits) {
        const view = views.get(hit.id);
        view?.flash(hit.power);
        const top = [state.player, ...state.bots].find((t) => t.id === hit.id);
        const radius = top?.radius ?? 12;
        const ratio = top ? Math.max(0, Math.min(1, top.spin / top.spinMax)) : 0;
        const camp = hit.id === 'player' ? 'player' : after.salle === SALLES_PER_CHAPTER ? 'boss' : 'bot';
        effects.hit(
          hit.x + hit.nx * radius,
          hit.y + hit.ny * radius,
          hit.nx,
          hit.ny,
          hit.power,
          spinTint(camp, ratio),
        );
      }
      // Au changement de salle, la simulation téléporte le joueur au point de
      // départ : interpoler ferait glisser la toupie à travers l'arène.
      if (before.salle !== after.salle) snapPositions = true;
    },
```

Dans `draw`, après `layout();`, faire avancer les effets et appliquer la secousse :

```ts
      effects.update(dt);
      world.x = app.screen.width / 2 + effects.shake.x * world.scale.x;
      world.y = app.screen.height / 2 + effects.shake.y * world.scale.y;
```

Dans `layout()`, supprimer les deux lignes `world.x = ...` / `world.y = ...` : la position est désormais posée dans `draw`.

Dans `destroy()`, ajouter avant `destroyTextures(tex);` :

```ts
      effects.destroy();
```

- [ ] **Step 4: Vérifier**

Run: `npm run build && npm run test`
Expected: build vert, 55 tests verts.

Run: `npm run dev` puis `http://localhost:5173/spinforge/`
Expected: chaque contact entre deux toupies produit un flash blanc bref, une onde de choc, une gerbe d'étincelles orientée dans l'axe du contact, et une secousse d'écran proportionnelle à la violence du choc. Un frôlement doit être discret, une collision frontale doit claquer.

- [ ] **Step 5: Calibrer `hitReference`**

Ajouter temporairement dans `afterTick`, au début de la boucle sur `events.hits` :

```ts
        console.log('choc', hit.power.toFixed(2));
```

Run: `npm run dev`, jouer une salle complète, lire la console.
Expected: la majorité des chocs entre 0,3 et 0,8 ; les collisions frontales atteignent 1.
Si tout sature à 1, augmenter `FEEL.hitReference`. Si tout reste sous 0,2, le diminuer.
**Retirer le `console.log` avant de committer.**

- [ ] **Step 6: Commit**

```bash
git add src/render/effects.ts src/render/topView.ts src/render/arena.ts src/render/feel.ts
git commit -m "feat(render): retour d'impact — flash, onde de choc, étincelles et secousse"
```

---

### Task 10: L'agonie et la mort

**Files:**
- Modify: `src/render/topView.ts`
- Modify: `src/render/arena.ts`

**Interfaces:**
- Consumes: `RenderEvents.deaths` (Task 4), `FEEL.deathLife`.
- Produces: `TopView.kill()` et `TopView.isFinished(): boolean`.

**Contexte :** la simulation retire les bots morts de `state.bots` au tick même où ils tombent. Sans cette tâche, ils disparaissent d'une image à l'autre. Le rendu garde donc une vue « agonisante » pendant 0,9 s.

- [ ] **Step 1: Étendre `TopView`**

Dans `src/render/topView.ts`, ajouter à l'interface :

```ts
  /** Démarre l'agonie : la toupie se couche, racle, s'immobilise. */
  kill(): void;
  isFinished(): boolean;
```

Dans `createTopView`, à côté de `let flashLife = 0;` :

```ts
  let dying = -1; // -1 = vivante ; sinon progression de l'agonie dans [0, 1]
```

Dans `sync`, remplacer la ligne `angle += spinOmega(ratio) * dt;` par :

```ts
      // Pendant l'agonie la toupie ralentit jusqu'à l'arrêt et se couche.
      const dyingFade = dying < 0 ? 1 : Math.max(0, 1 - dying);
      angle += spinOmega(ratio) * dyingFade * dt;
      if (dying >= 0) {
        dying = Math.min(1, dying + dt / FEEL.deathLife);
        pivot.scale.set(1, 1 - 0.6 * dying);
        pivot.rotation = angle;
        container.alpha = 1 - dying * dying;
        shadow.alpha = 1 - dying;
      }
```

Et exposer les deux méthodes après `flash` :

```ts
    kill() {
      if (dying < 0) dying = 0;
    },
    isFinished() {
      return dying >= 1;
    },
```

- [ ] **Step 2: Déclencher l'agonie depuis `arena.ts`**

Dans `afterTick`, après la boucle sur `events.hits`, ajouter :

```ts
      for (const death of events.deaths) {
        const view = views.get(death.id);
        view?.kill();
        effects.wave(death.x, death.y, 34, 0xffd9a0);
      }
```

Dans `draw`, remplacer la boucle de nettoyage finale :

```ts
      for (const [id, view] of views) {
        if (live.has(id)) continue;
        // La toupie n'est plus dans la simulation : elle finit son agonie sur place.
        view.sync(view.container.x, view.container.y, 0, 0, dt);
        if (!view.isFinished()) continue;
        view.destroy();
        views.delete(id);
      }
```

- [ ] **Step 3: Vérifier**

Run: `npm run build && npm run test`
Expected: build vert, 55 tests verts.

Run: `npm run dev`
Expected: quand un bot tombe, il ralentit, se couche et s'efface en ~0,9 s au lieu de disparaître d'un coup. Quand le joueur meurt, sa toupie fait de même et le bouton « Retenter » apparaît.

- [ ] **Step 4: Commit**

```bash
git add src/render/topView.ts src/render/arena.ts
git commit -m "feat(render): agonie — la toupie ralentit, se couche et s'éteint"
```

---

### Task 11: Le boss se lit comme un boss

**Files:**
- Modify: `src/render/topView.ts` (aura et anneau contra-rotatif)
- Modify: `src/render/arena.ts` (assombrissement + onde d'entrée)
- Modify: `src/ui/CombatScreen.tsx` (bandeau nommé)

**Interfaces:**
- Consumes: `RenderEvents.bossEntered`, `chapterOf` (Task 6), `FEEL.bossHaloMult`/`bossRingSpeed`/`bossEntryLife`.
- Produces: `createTopView(..., { boss: true })` et la prop `bossBanner` de `CombatScreen`.

- [ ] **Step 1: Donner sa présence au boss dans `topView.ts`**

Changer la signature de la fabrique :

```ts
export function createTopView(
  tex: Textures,
  shape: Shape,
  camp: Camp,
  radius: number,
  isBoss = false,
): TopView {
```

Juste après la création de `halo`, élargir son halo et lui ajouter l'anneau :

```ts
  if (isBoss) halo.width = halo.height = size * FEEL.bossHaloMult * 2;

  const ring = isBoss ? new Sprite(tex.wave) : null;
  if (ring) {
    ring.anchor.set(0.5);
    ring.blendMode = 'add';
    ring.width = ring.height = size * 1.9;
    ring.alpha = 0.35;
  }
```

L'ajouter au conteneur — remplacer la ligne `container.addChild(halo, shadow, trail, pivot, flashSprite);` par :

```ts
  container.addChild(halo, shadow, trail, pivot, flashSprite);
  if (ring) container.addChildAt(ring, 1);
```

Dans `sync`, après `pivot.rotation = angle;` (le premier, hors agonie), ajouter :

```ts
      if (ring) {
        ring.rotation = angle * FEEL.bossRingSpeed;
        ring.tint = spinTint(camp, ratio);
        ring.alpha = 0.2 + 0.25 * ratio;
      }
```

- [ ] **Step 2: Créer la vue du boss avec son drapeau**

Dans `src/render/arena.ts`, dans `viewFor`, remplacer la ligne de création :

```ts
      view = createTopView(tex, shape, isPlayer ? 'player' : boss ? 'boss' : 'bot', radius, boss);
```

- [ ] **Step 3: Jouer l'entrée du boss**

Dans `arena.ts`, ajouter l'état près de `let snapPositions = true;` :

```ts
  let bossEntry = 0; // secondes restantes d'entrée du boss
```

Créer le voile d'assombrissement, juste après `floorLayer.addChild(floor);` :

```ts
  const dim = new Sprite(Texture.WHITE);
  dim.anchor.set(0.5);
  dim.tint = 0x04050a;
  dim.alpha = 0;
  dim.width = dim.height = ARENA_RADIUS * 2 * 1.06;
  floorLayer.addChild(dim);
```

Dans `afterTick`, après la boucle sur `events.deaths` :

```ts
      if (events.bossEntered) {
        bossEntry = FEEL.bossEntryLife;
        const boss = state.bots[0];
        if (boss) effects.wave(boss.pos.x, boss.pos.y, ARENA_RADIUS * 1.4, PALETTE.boss);
      }
```

Dans `draw`, après `effects.update(dt);` :

```ts
      if (bossEntry > 0) {
        bossEntry = Math.max(0, bossEntry - dt);
        dim.alpha = 0.72 * (bossEntry / FEEL.bossEntryLife);
      } else if (dim.alpha !== 0) {
        dim.alpha = 0;
      }
```

Ajouter `FEEL` et `PALETTE` aux imports du fichier s'ils n'y sont pas déjà :

```ts
import { FEEL } from './feel';
```

- [ ] **Step 4: Le bandeau nommé**

Dans `src/ui/CombatScreen.tsx`, ajouter un état de bandeau. Après les autres `useRef`, insérer :

```tsx
  const [banner, setBanner] = useState<string | null>(null);
  // Sans ce garde-fou, le bandeau se rejouerait à chaque tick passé en salle 10.
  const bannerDoneRef = useRef(false);
```

Compléter l'import React :

```tsx
import { useEffect, useRef, useState } from 'react';
```

Dans les rappels de `useGameLoop`, remplacer `afterTick` par :

```tsx
      afterTick: (state) => {
        arenaRef.current?.afterTick(state);
        if (state.salle !== SALLES_PER_CHAPTER) {
          bannerDoneRef.current = false;
        } else if (!bannerDoneRef.current) {
          bannerDoneRef.current = true;
          setBanner(chapterOf(state.chapter).boss);
          window.setTimeout(() => setBanner(null), 2100);
        }
        onTick();
      },
```

Envelopper le conteneur de l'arène pour poser le bandeau par-dessus — remplacer la ligne `<div ref={hostRef} ... />` par :

```tsx
      <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
        <div ref={hostRef} style={{ position: 'absolute', inset: 0, borderRadius: 14, overflow: 'hidden', background: '#05070b' }} />
        {banner ? (
          <div
            style={{
              position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)',
              background: 'rgba(8,10,15,.82)', borderTop: '2px solid var(--boss)', borderBottom: '2px solid var(--boss)',
              padding: '10px 0', textAlign: 'center', pointerEvents: 'none',
              font: '600 17px Oswald, ui-sans-serif, sans-serif', letterSpacing: '.06em', textTransform: 'uppercase',
            }}
          >
            {banner}
          </div>
        ) : null}
      </div>
```

- [ ] **Step 5: Vérifier**

Run: `npm run build && npm run test`
Expected: build vert, 55 tests verts.

Atteindre la salle 10 sans jouer deux heures : dans `src/sim/sim.ts`, dans `createInitialState`,
remplacer temporairement `salle: 1,` par `salle: 9,`. Démarrer à la salle 9 (et non 10) est
indispensable — c'est la **transition** vers la salle 10 qui déclenche `bossEntered`.

Run: `npm run dev`, vider la salle 9.

Puis **annuler la modification** : `git checkout src/sim/sim.ts`

Expected: à l'entrée en salle 10, le sol s'assombrit, une onde violette part du boss, le bandeau « GARDIEN DU HANGAR » s'inscrit et disparaît, et le boss porte une aura violette large avec un anneau qui tourne à l'envers. La simulation ne s'arrête jamais pendant l'entrée.

- [ ] **Step 6: Commit**

```bash
git add src/render/topView.ts src/render/arena.ts src/ui/CombatScreen.tsx
git commit -m "feat(render): le boss a sa présence, son aura et son entrée nommée"
```

---

### Task 12: Transition de salle — la porte et la reforge

**Files:**
- Modify: `src/render/arena.ts`

**Interfaces:**
- Consumes: `RenderEvents.salleChanged`, `FEEL.reforgeLife`/`reforgeFlashLife`/`reforgeQuickWindow`/`reforgeQuickScale`.
- Produces: rien de nouveau à l'extérieur.

**Contexte :** la simulation n'a jamais d'état « salle vide » — dès que `bots.length === 0`, la salle avance dans le même tick. La porte s'allume donc *pendant* la transition, comme premier temps, et non comme un état durable.

- [ ] **Step 1: Ajouter la porte et l'éclair dans `src/render/arena.ts`**

Ajouter aux imports :

```ts
import { Graphics } from 'pixi.js';
```

Après la création de `dim`, ajouter la porte et le voile d'éclair :

```ts
  const door = new Graphics();
  floorLayer.addChild(door);

  const flash = new Sprite(Texture.WHITE);
  flash.anchor.set(0.5);
  flash.tint = 0xffe2b2;
  flash.alpha = 0;
  flash.blendMode = 'add';
  flash.width = flash.height = ARENA_RADIUS * 2 * 1.2;
  floorLayer.addChild(flash);
```

Ajouter l'état, près de `let bossEntry = 0;` :

```ts
  let reforge = 0;          // secondes restantes de transition
  let reforgeFlash = 0;     // secondes restantes d'éclair
  let lastReforgeAt = -Infinity;
```

- [ ] **Step 2: Déclencher la transition**

Dans `afterTick`, remplacer le bloc `if (before.salle !== after.salle) snapPositions = true;` par :

```ts
      if (before.salle !== after.salle) {
        snapPositions = true;
        const now = performance.now() / 1000;
        // Dix transitions par chapitre : on atténue quand elles s'enchaînent.
        const quick = now - lastReforgeAt < FEEL.reforgeQuickWindow;
        lastReforgeAt = now;
        reforge = FEEL.reforgeLife;
        reforgeFlash = FEEL.reforgeFlashLife * (quick ? FEEL.reforgeQuickScale : 1);
        for (const bot of state.bots) {
          effects.wave(bot.pos.x, bot.pos.y, 30, PALETTE.ember);
        }
      }
```

- [ ] **Step 3: Animer la porte et l'éclair**

Dans `draw`, après le bloc `if (bossEntry > 0) { ... }`, ajouter :

```ts
      if (reforge > 0) reforge = Math.max(0, reforge - dt);
      if (reforgeFlash > 0) reforgeFlash = Math.max(0, reforgeFlash - dt);
      flash.alpha = reforgeFlash > 0 ? 0.5 * (reforgeFlash / FEEL.reforgeFlashLife) : 0;

      // La porte s'allume le temps de la transition — la simulation n'a jamais
      // d'état « salle vide » à représenter autrement.
      const lit = reforge > 0 ? reforge / FEEL.reforgeLife : 0;
      door.clear();
      door.arc(0, 0, ARENA_RADIUS, -1.9, -1.24);
      door.stroke({ width: 3 + 4 * lit, color: PALETTE.ember, alpha: 0.22 + 0.7 * lit });
```

- [ ] **Step 4: Faire tomber les nouvelles toupies**

Dans `draw`, à l'intérieur de la boucle `for (const top of tops)`, juste avant `view.sync(...)`, ajouter la chute :

```ts
        // Les nouvelles toupies tombent du plafond pendant la reforge.
        const drop = reforge > 0 && !top.isPlayer ? -(reforge / FEEL.reforgeLife) * ARENA_RADIUS * 0.7 : 0;
```

Puis remplacer l'appel par :

```ts
        view.sync(x, y + drop, ratio, speedRatio, dt);
```

- [ ] **Step 5: Vérifier**

Run: `npm run build && npm run test`
Expected: build vert, 55 tests verts.

Run: `npm run dev`
Expected: en vidant une salle, la porte s'allume en haut, l'arène encaisse un éclair de forge et les nouveaux bots tombent avec une onde à la retombée. En enchaînant deux salles rapidement, l'éclair est nettement plus discret la seconde fois.

- [ ] **Step 6: Commit**

```bash
git add src/render/arena.ts
git commit -m "feat(render): transition de salle — porte allumée, éclair de forge, toupies qui tombent"
```

---

### Task 13: Le son

**Files:**
- Create: `src/audio/audio.ts`
- Modify: `src/ui/App.tsx` (bouton de coupure)
- Modify: `src/ui/CombatScreen.tsx` (démarrage au premier contact, bourdon, chocs)
- Modify: `src/render/arena.ts` (expose les événements du dernier tick)

**Interfaces:**
- Consumes: `FEEL`.
- Produces:
  - `Audio { start(), setSpin(ratio), hit(power), death(), door(), reforge(), setMuted(m), isMuted() }`
  - `createAudio(): Audio`
  - `Arena.consumeEvents(): RenderEvents | null` — ce que le dernier tick a produit, pour que l'UI sonorise sans dupliquer l'observation.

**Contexte :** le signal principal n'est pas le choc, c'est le bourdon indexé sur le spin. La toupie chante, et son chant descend quand elle meurt.

- [ ] **Step 1: Écrire `src/audio/audio.ts`**

```ts
const STORAGE_KEY = 'spinforge.muted';

export interface Audio {
  /** À appeler au premier contact du doigt : les navigateurs l'exigent. */
  start(): void;
  setSpin(ratio: number): void;
  hit(power: number): void;
  death(): void;
  door(): void;
  reforge(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  destroy(): void;
}

export function createAudio(): Audio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let humOsc: OscillatorNode | null = null;
  let humFilter: BiquadFilterNode | null = null;
  let muted = localStorage.getItem(STORAGE_KEY) === '1';
  let noise: AudioBuffer | null = null;

  function buildNoise(context: AudioContext): AudioBuffer {
    const buffer = context.createBuffer(1, context.sampleRate * 0.5, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buffer;
  }

  function ensure(): AudioContext | null {
    if (!ctx) return null;
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  }

  function burst(freq: number, q: number, gain: number, duration: number, type: BiquadFilterType = 'bandpass'): void {
    const context = ensure();
    if (!context || !master || !noise) return;
    const src = context.createBufferSource();
    src.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const env = context.createGain();
    env.gain.setValueAtTime(gain, context.currentTime);
    env.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    src.connect(filter).connect(env).connect(master);
    src.start();
    src.stop(context.currentTime + duration);
  }

  function tone(from: number, to: number, duration: number, gain: number, type: OscillatorType = 'sawtooth'): void {
    const context = ensure();
    if (!context || !master) return;
    const osc = context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), context.currentTime + duration);
    const env = context.createGain();
    env.gain.setValueAtTime(gain, context.currentTime);
    env.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
    osc.connect(env).connect(master);
    osc.start();
    osc.stop(context.currentTime + duration);
  }

  return {
    start() {
      if (ctx) {
        void ctx.resume();
        return;
      }
      ctx = new AudioContext();
      noise = buildNoise(ctx);
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);

      humFilter = ctx.createBiquadFilter();
      humFilter.type = 'lowpass';
      humFilter.frequency.value = 900;
      humFilter.Q.value = 3;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.035;
      humOsc = ctx.createOscillator();
      humOsc.type = 'sawtooth';
      humOsc.frequency.value = 250;
      humOsc.connect(humFilter).connect(humGain).connect(master);
      humOsc.start();
    },
    setSpin(ratio) {
      const context = ensure();
      if (!context || !humOsc || !humFilter) return;
      const r = Math.max(0, Math.min(1, ratio));
      humOsc.frequency.setTargetAtTime(60 + 190 * r, context.currentTime, 0.08);
      humFilter.frequency.setTargetAtTime(300 + 1400 * r, context.currentTime, 0.12);
    },
    hit(power) {
      burst(400 + 2600 * power, 1.6, 0.12 + 0.5 * power, 0.06);
    },
    death() {
      tone(200, 40, 0.8, 0.14);
      burst(900, 0.7, 0.1, 0.5, 'highpass');
    },
    door() {
      tone(880, 880, 0.5, 0.05, 'sine');
      tone(1320, 1320, 0.45, 0.03, 'sine');
    },
    reforge() {
      tone(120, 45, 0.35, 0.16, 'sine');
      burst(600, 0.6, 0.16, 0.22);
    },
    setMuted(next) {
      muted = next;
      localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      if (master && ctx) master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
    },
    isMuted() {
      return muted;
    },
    destroy() {
      humOsc?.stop();
      void ctx?.close();
      ctx = null;
      master = null;
      humOsc = null;
      humFilter = null;
    },
  };
}
```

- [ ] **Step 2: Exposer les événements du dernier tick depuis l'arène**

Dans `src/render/arena.ts`, ajouter à l'interface `Arena` :

```ts
  /** Les événements du dernier tick, consommés une seule fois (sonorisation). */
  consumeEvents(): RenderEvents | null;
```

Compléter l'import :

```ts
import { observe, type RenderEvents } from './observer';
```

Ajouter l'état près de `let reforge = 0;` :

```ts
  let pending: RenderEvents | null = null;
```

Dans `afterTick`, juste après `const events = observe(before, after);`, ajouter :

```ts
      pending = events;
```

Et ajouter la méthode dans l'objet retourné, après `afterTick` :

```ts
    consumeEvents() {
      const e = pending;
      pending = null;
      return e;
    },
```

- [ ] **Step 3: Sonoriser depuis `App` et `CombatScreen`**

L'audio est créé **dans `App`** — c'est là que vit le bouton de coupure — puis passé à
`CombatScreen`, qui seul connaît les ticks.

Dans `src/ui/App.tsx`, ajouter l'import :

```tsx
import { createAudio } from '../audio/audio';
```

Dans le corps de `App`, à côté de `stateRef` :

```tsx
  const audioRef = useRef<ReturnType<typeof createAudio> | null>(null);
  if (audioRef.current === null) audioRef.current = createAudio();
  const [muted, setMuted] = useState(() => audioRef.current!.isMuted());
```

Passer l'instance à l'écran de combat — remplacer la balise `<CombatScreen ... />` par :

```tsx
        <CombatScreen stateRef={stateRef} running={tab === 'combat'} onTick={redraw} audio={audioRef.current} />
```

Dans `src/ui/CombatScreen.tsx`, ajouter l'import du type et la prop. Remplacer la signature du
composant par :

```tsx
export function CombatScreen({
  stateRef, running, onTick, audio,
}: {
  stateRef: { current: SimState };
  running: boolean;
  onTick: () => void;
  audio: Audio;
}) {
```

en ajoutant l'import correspondant :

```tsx
import type { Audio } from '../audio/audio';
```

Dans les rappels de `useGameLoop`, compléter `afterTick` — insérer juste après
`arenaRef.current?.afterTick(state);` :

```tsx
        const events = arenaRef.current?.consumeEvents();
        if (events) {
          // Les frôlements entre bots ne méritent pas un son ; les tiens, toujours.
          for (const hit of events.hits) if (hit.id === 'player' || hit.power > 0.25) audio.hit(hit.power);
          if (events.deaths.some((d) => d.isPlayer)) audio.death();
          if (events.salleChanged) { audio.door(); audio.reforge(); }
          audio.setSpin(state.player.spin / state.player.spinMax);
        }
```

Dans `onDown`, démarrer l'audio au premier contact — ajouter en toute première ligne du corps,
**avant** le test sur `button` (le contexte audio doit s'ouvrir même si le doigt tombe sur un
bouton) :

```tsx
    audio.start();
```

Enfin, libérer le contexte au démontage : dans `src/ui/App.tsx`, ajouter :

```tsx
  useEffect(() => () => audioRef.current?.destroy(), []);
```

et compléter l'import React d'`App.tsx` :

```tsx
import { useEffect, useRef, useState } from 'react';
```

- [ ] **Step 4: Ajouter le bouton de coupure dans l'en-tête**

Dans `src/ui/App.tsx`, ajouter dans le `<header>`, après le badge de crédits :

```tsx
        <button
          onClick={() => {
            const next = !muted;
            audioRef.current!.setMuted(next);
            setMuted(next);
          }}
          aria-label={muted ? 'Réactiver le son' : 'Couper le son'}
          style={{
            marginLeft: 'auto', width: 34, height: 34, borderRadius: 9, cursor: 'pointer',
            border: '1px solid var(--line)', background: 'var(--panel)', color: 'var(--muted)', fontSize: 15,
          }}
        >
          {muted ? '🔇' : '🔊'}
        </button>
```

- [ ] **Step 5: Vérifier**

Run: `npm run build && npm run test`
Expected: build vert, 55 tests verts.

Run: `npm run dev`
Expected: au premier glissement, un bourdon démarre. Sa hauteur descend visiblement quand le spin du joueur baisse et remonte au soin entre deux salles. Chaque choc claque. La mort produit un glissando descendant. Le bouton de coupure fonctionne et son état survit à un rechargement de page.

- [ ] **Step 6: Commit**

```bash
git add src/audio/audio.ts src/render/arena.ts src/ui/App.tsx src/ui/CombatScreen.tsx
git commit -m "feat(audio): synthèse WebAudio, bourdon indexé sur le spin et coupure persistée"
```

---

### Task 14: Vérification finale — captures, performance, roadmap

**Files:**
- Create: `scripts/shots.mjs`
- Modify: `docs/roadmap.md`
- Modify: `package.json` (script `shots`)

**Interfaces:**
- Consumes: le jeu complet.
- Produces: des captures dans `.shots/` (ignorées par git) et une roadmap à jour.

- [ ] **Step 1: Écrire le script de capture**

Créer `scripts/shots.mjs` :

```js
// Captures de vérification du jalon 1.5. Nécessite un `npm run dev` déjà lancé.
// Usage : node scripts/shots.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const URL = 'http://localhost:5173/spinforge/';
const OUT = '.shots';

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
page.on('pageerror', (e) => console.error('[pageerror]', e.message));
await page.goto(URL, { waitUntil: 'networkidle' });

// Le pilotage démarre l'audio et met la toupie en mouvement.
await page.mouse.move(195, 500);
await page.mouse.down();
await page.mouse.move(195, 300, { steps: 20 });

for (const [name, wait] of [['debut', 1500], ['milieu', 9000], ['fin', 9000]]) {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log(`${OUT}/${name}.png`);
}

await page.mouse.up();
await browser.close();
```

- [ ] **Step 2: Déclarer le script et ignorer les captures**

Dans `package.json`, ajouter à `scripts` :

```json
    "shots": "node scripts/shots.mjs"
```

Ajouter `.shots/` à `.gitignore`.

Run: `npm install -D playwright && npx playwright install chromium`

- [ ] **Step 3: Prendre les captures et les regarder**

Run: `npm run dev` dans un terminal, puis `npm run shots` dans un autre.
Expected: trois PNG dans `.shots/`.

**Les ouvrir et vérifier à l'œil le critère central** : sur `fin.png`, où le joueur a encaissé, sa toupie doit être visiblement plus sombre, plus ébréchée et moins auréolée que sur `debut.png`, **sans regarder la barre de spin**. Si ce n'est pas net, ajuster `DIM_FLOOR` dans `src/theme.ts` et les seuils `wearLevel1`/`wearLevel2` dans `src/render/feel.ts`, puis recommencer.

- [ ] **Step 4: Mesurer la performance**

Ajouter temporairement dans `src/render/arena.ts`, dans `draw`, après le calcul de `dt` :

```ts
      if (import.meta.env.DEV) {
        (window as unknown as { __ft?: number[] }).__ft ??= [];
        (window as unknown as { __ft: number[] }).__ft.push(dt * 1000);
      }
```

Puis mesurer sous throttling CPU ×4 :

```js
// .shots/perf.mjs — jetable, dans un dossier déjà ignoré par git
import { chromium } from 'playwright';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
const cdp = await p.context().newCDPSession(p);
await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
await p.goto('http://localhost:5173/spinforge/', { waitUntil: 'networkidle' });
await p.mouse.move(195, 500); await p.mouse.down(); await p.mouse.move(195, 300, { steps: 20 });
await p.waitForTimeout(12000);
const ft = await p.evaluate(() => window.__ft.slice(-400));
ft.sort((a, z) => a - z);
console.log('médiane', ft[ft.length >> 1].toFixed(1), 'ms · p95', ft[Math.floor(ft.length * 0.95)].toFixed(1), 'ms');
await b.close();
```

Run: `node .shots/perf.mjs`
Expected: médiane ≤ 16,7 ms. Si le p95 dépasse largement, réduire `FEEL.sparkPool` et `FEEL.trailMax` avant toute autre optimisation.

**Retirer la sonde de `arena.ts` avant de committer** (`.shots/` est déjà ignoré par git).

- [ ] **Step 5: Marquer le jalon dans la roadmap**

Dans `docs/roadmap.md`, remplacer le titre `## Jalon 1.5 — L'habillage` par :

```markdown
## Jalon 1.5 — L'habillage ✦ plan : `docs/superpowers/plans/2026-08-25-jalon-1-5-habillage.md`
```

Et, dans la section « Dette connue », supprimer les trois puces désormais traitées : « Les toupies dépassent visiblement de l'anneau… », « Le canvas est rogné en dessous de 360 px… », « `360` est dupliqué… », ainsi que, sous « Interface », « Les handlers pointer sont sur le conteneur externe… », « `useGameLoop` capture la première closure… » et « Un commentaire `eslint-disable` subsiste… ».

- [ ] **Step 6: Vérifier une dernière fois l'ensemble**

Run: `npm run test && npm run build`
Expected: 55 tests verts, build vert.

- [ ] **Step 7: Commit**

```bash
git add scripts/shots.mjs package.json package-lock.json .gitignore docs/roadmap.md
git commit -m "chore: script de captures de vérification et roadmap du jalon 1.5 à jour"
```

---

## Récapitulatif des vérifications de fin de jalon

| Critère d'acceptation | Comment il est prouvé |
|---|---|
| On distingue une toupie en pleine forme d'une mourante sans lire le HUD | Task 14 Step 3 — captures `.shots/debut.png` vs `.shots/fin.png` |
| Chaque choc produit un retour visuel et sonore | Task 9 Step 4 (visuel) + Task 13 Step 5 (sonore) |
| Plus rien ne dépasse du décor | Task 2 (`clampToArena` + 4 tests) et Task 8 Step 4 |
| 60 fps sur mobile milieu de gamme | Task 14 Step 4 — médiane ≤ 16,7 ms sous throttling ×4 |
| L'écran correspond à `design/Combat.dc.html` | Task 6 Step 8, au périmètre arrêté § 4.1 de la spec |
| `src/sim/` inchangé hors `clampToArena` | Task 2 est la seule tâche qui touche à la logique de `src/sim/` ; Task 3 ne touche que des constantes de `config.ts` |
| `npm run test` et `npm run build` verts | Task 14 Step 6 |
