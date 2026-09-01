# Son et haptique — plan d'implémentation

> **Pour les agents exécutants :** SOUS-SKILL REQUIS — utiliser
> `superpowers:subagent-driven-development` (recommandé) ou
> `superpowers:executing-plans` pour dérouler ce plan tâche par tâche. Les étapes
> sont en cases à cocher (`- [ ]`).

**But :** rendre le fond sonore à une musique synthétisée, refaire du choc entre
toupies le son principal du jeu, sonoriser chaque appui de bouton, et faire sentir
les chocs et les gains dans la main via la vibration Android.

**Architecture :** `src/audio/` est éclaté en six fichiers — un barème pur
(`mix.ts`), trois modules purs et testés (`gate.ts`, `haptics.ts`, `settings.ts`),
les primitives WebAudio (`synth.ts`), le séquenceur (`music.ts`) — derrière une
façade unique (`audio.ts`) exposée **en singleton de module**, comme `src/i18n/`.
L'UI appelle des verbes de jeu (`hit`, `reward`, `chestDone`) et ne connaît jamais
un `AudioContext`.

**Pile :** TypeScript, WebAudio API, `navigator.vibrate`, React 19, Vitest
(environnement `node`), Vite.

**Spec :** `docs/superpowers/specs/2026-09-01-son-et-haptique-design.md` — à lire
avant la première tâche. Le plan argumente depuis elle.

**Worktree :** `/Users/nicolasrabault/Projects/B-Blades_versus-son`, branche
`feat/son-et-haptique`, basée sur `main` après l'atterrissage du chantier coffres
(`f4d08f2`).

## Contraintes globales

Elles s'appliquent à **toutes** les tâches, sans être répétées dans chacune.

- **`src/sim/` n'est jamais modifié.** Aucun fichier, aucun test de simulation. Le
  son est un spectateur, comme le rendu.
- **Tous les chiffres du son vivent dans `src/audio/mix.ts`.** Aucune constante
  sonore en dur ailleurs — même règle que `src/render/feel.ts` pour le game feel.
  Aucun chiffre d'équilibrage n'entre dans `mix.ts`.
- **Aucun texte visible en dur.** Toute chaîne passe par `src/i18n/` ; `fr.ts` fait
  foi, `en.ts` est un `Record<MessageKey, string>` — une clé oubliée casse `tsc`.
- **Aucun fichier binaire.** Tout est synthétisé. Le dépôt n'en suit aucun.
- **Code et identifiants en anglais**, sauf le vocabulaire du jeu déjà en place
  (`salle`, `toupie`).
- **Chaque test est validé par mutation avant d'être considéré comme écrit** :
  retirer le mécanisme, constater que le test rougit, remettre. C'est la règle du
  dépôt depuis le jalon 2b, et chaque tâche nomme la mutation attendue.
- **Vérification navigateur non déléguée** : `npm run dev` puis
  `http://localhost:<port>/spinforge/` — lire la ligne « Local: », le port n'est pas
  toujours 5173 (d'autres sessions tournent).
- `npm run test` et `npm run build` passent à la fin de chaque tâche.
  `npm run calibrate` n'est jamais rejoué : aucun chiffre d'équilibrage ne bouge.
- **Git** : ne jamais faire `git add <répertoire>` ni `git add -A` dans ce dépôt —
  lister les fichiers un par un, relire `git status --short`, et vérifier
  `git rev-parse --abbrev-ref HEAD` avant chaque commit.

## Structure des fichiers

| Fichier | Responsabilité | Pur ? |
|---|---|---|
| `src/audio/mix.ts` | **créé** — le barème : tous les chiffres du son, des motifs, des seuils | oui |
| `src/audio/gate.ts` | **créé** — décide si un choc mérite son son (garde + priorité) | oui |
| `src/audio/settings.ts` | **créé** — les trois interrupteurs, persistance et migration | oui |
| `src/audio/haptics.ts` | **créé** — traduit un événement en motif de vibration, sous garde de débit | oui |
| `src/audio/synth.ts` | **créé** — primitives WebAudio : bus, enveloppes, bruit, corps métallique | non |
| `src/audio/music.ts` | **créé** — le séquenceur et le choix des couches | partiellement |
| `src/audio/audio.ts` | **refondu** — la façade, en verbes de jeu, exposée en singleton | non |
| `src/ui/AudioSettings.tsx` | **créé** — le panneau à trois interrupteurs | non |
| `src/dev/soundboard.tsx` + `soundboard.html` | **créés** — le banc d'essai, jamais construit | non |
| `src/ui/App.tsx` | modifié — écouteur délégué, intensité musicale, panneau de réglages | — |
| `src/ui/CombatScreen.tsx` | modifié — `reward`, `bossDown`, plus de prop `audio` | — |
| `src/ui/ChestScreen.tsx` | modifié — secousse, poses, révélations, fin | — |
| `src/ui/InventoryPanel.tsx` | modifié — `fuse` / `equip` au moment du résultat | — |
| `src/ui/ForgeScreen.tsx` | modifié — `upgrade` au moment du résultat | — |
| `src/i18n/fr.ts` + `en.ts` | modifiés — 5 clés ajoutées, 2 retirées | — |

**Un choix qui s'écarte de la lecture naïve de la spec :** la façade est un
**singleton de module**, pas une prop. `App.tsx` porte déjà le commentaire qui le
justifie à propos de `t()` — *« lit un singleton de module, ce qui évite d'enfiler
une locale à travers `axisLine`, `rankLabel` et `formatCredits` »*. Le son a
exactement le même profil : cinq composants en ont besoin, dont deux à deux niveaux
de profondeur. On suit le précédent du dépôt plutôt que d'enfiler une prop `audio`
à travers `ForgeScreen` → `InventoryPanel` → `PieceSheet`.

---

## Vague 1 — le socle

### Tâche 1 : le barème et la garde de débit

**Fichiers :**
- Créer : `src/audio/mix.ts`
- Créer : `src/audio/gate.ts`
- Test : `src/audio/gate.test.ts`

**Interfaces :**
- Consomme : rien.
- Produit : `MIX` (barème complet), `LAYERS`, `BUZZ`, `createGate(): GateState`,
  `admitHit(state: GateState, now: number, power: number): boolean`.

- [ ] **Étape 1 : écrire `src/audio/mix.ts`**

```ts
/**
 * Barème du son. Jumeau sonore de `src/render/feel.ts` : ce ne sont PAS des
 * chiffres d'équilibrage, rien ici ne touche la simulation, et rien de ce qui est
 * ici n'a le droit d'exister en dur ailleurs.
 * Durées en secondes (horloge WebAudio). Les motifs haptiques sont en millisecondes,
 * seule unité que comprend `navigator.vibrate`.
 */
export const MIX = {
  master: 0.5,
  musicGain: 0.3,
  sfxGain: 0.85,

  // — le choc —
  /** Garde entre deux chocs. Mesurée : sans elle, l'arène monte à 20 sons/s.
   *  Doit rester SUPÉRIEURE au tick de simulation (100 ms), sinon un contact
   *  prolongé la refranchit à chaque tick et ne filtre rien. */
  hitGapS: 0.14,
  /** Plancher absolu : deux sons plus rapprochés se superposent sur la même image. */
  hitFloorS: 0.04,
  /** De combien un choc doit dépasser le précédent pour casser sa garde. */
  hitPriorityStep: 0.25,
  hitClickHz: 3200,
  hitClickS: 0.008,
  hitClickGain: 0.05,
  hitClickSpan: 0.1,
  /** La fondamentale DESCEND quand la puissance monte : un gros choc est plus grave. */
  hitBodyHz: 520,
  hitBodySpan: -180,
  /** Ratios de plaque : inharmoniques, c'est ce qui fait « métal » plutôt que « note ». */
  hitBodyPartials: [1, 2.76, 5.4],
  hitBodyDecayS: 0.12,
  hitBodyDecaySpan: 0.18,
  hitBodyGain: 0.06,
  hitBodyGainSpan: 0.12,
  /** Désaccord aléatoire : c'est lui qui tue l'effet mitraillette PERÇU, quel que
   *  soit le débit réel. */
  hitDetune: 0.08,
  hitSubThreshold: 0.3,
  hitSubFrom: 120,
  hitSubTo: 55,
  hitSubS: 0.12,
  hitSubGain: 0.05,

  // — le rotor : une texture, plus un personnage —
  whirrGain: 0.018,
  whirrFreqLow: 380,
  whirrFreqHigh: 2200,
  subGain: 0.02,
  subFreqLow: 48,
  subFreqHigh: 96,

  // — ducking : un son tenu qui s'interrompt cesse d'être un son tenu —
  duckPower: 0.45,
  duckMusic: 0.55,
  duckWhirr: 0.35,
  duckHoldS: 0.15,
  duckReleaseS: 0.25,

  // — musique —
  bpm: 92,
  bars: 8,
  stepsPerBar: 16,
  lookaheadS: 0.1,
  timerMs: 25,
  /** Ré1. Toute la musique est dérivée d'elle par demi-tons. */
  rootHz: 36.71,
  layerFadeS: 0.35,
  intensityMenus: 0.35,
  intensityCombat: 0.7,
  intensityBoss: 1,
  deathFadeS: 0.6,

  // — vibration —
  hapticMinGapMs: 60,
  hapticBudgetMs: 220,
  hapticWindowMs: 1000,
  hapticHitThreshold: 0.35,
  hapticHitBaseMs: 8,
  hapticHitSpanMs: 10,
} as const;

/** Intensité à partir de laquelle chaque couche musicale entre. */
export const LAYERS = {
  drone: 0,
  pulse: 0.25,
  anvil: 0.55,
  motif: 0.65,
  tension: 0.9,
} as const;

/** Motifs de vibration, en millisecondes (durée, pause, durée, …). */
export const BUZZ = {
  tap: [8],
  reward: [12, 40, 12],
  chestOpened: [18],
  chestDone: [30, 60, 18, 40, 45],
  fuse: [20, 50, 45],
  equip: [10],
  bossDown: [40, 40, 40, 40, 80],
  death: [40, 60, 90],
} as const;
```

- [ ] **Étape 2 : écrire le test qui échoue** — `src/audio/gate.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { admitHit, createGate } from './gate';

describe('la garde de débit des chocs', () => {
  it('refuse un second choc de même puissance avant 140 ms', () => {
    const gate = createGate();
    expect(admitHit(gate, 0, 0.5)).toBe(true);
    expect(admitHit(gate, 0.1, 0.5)).toBe(false);
  });

  it('accepte un choc nettement plus fort pendant la garde', () => {
    const gate = createGate();
    admitHit(gate, 0, 0.2);
    // +0,4 sur le précédent : c'est le coup décisif, il ne doit pas être avalé
    // par le frôlement qui l'a précédé de 50 ms.
    expect(admitHit(gate, 0.05, 0.6)).toBe(true);
  });

  it('refuse même le plus fort des chocs sous le plancher de 40 ms', () => {
    const gate = createGate();
    admitHit(gate, 0, 0.1);
    expect(admitHit(gate, 0.02, 1)).toBe(false);
  });

  it('accepte de nouveau une fois la garde écoulée', () => {
    const gate = createGate();
    admitHit(gate, 0, 0.5);
    expect(admitHit(gate, 0.14, 0.5)).toBe(true);
  });

  it("n'avance l'horloge que sur un choc accepté", () => {
    const gate = createGate();
    admitHit(gate, 0, 0.5);
    admitHit(gate, 0.1, 0.5); // refusé
    // Si le refus avait quand même repoussé `lastAt` à 0,1, ce choc-ci serait
    // refusé lui aussi et la garde se prolongerait indéfiniment sous contact.
    expect(admitHit(gate, 0.14, 0.5)).toBe(true);
  });
});
```

- [ ] **Étape 3 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run src/audio/gate.test.ts`
Attendu : ÉCHEC — `Failed to resolve import "./gate"`.

- [ ] **Étape 4 : écrire `src/audio/gate.ts`**

```ts
import { MIX } from './mix';

export interface GateState {
  lastAt: number;
  lastPower: number;
}

export function createGate(): GateState {
  return { lastAt: -Infinity, lastPower: 0 };
}

/**
 * Décide si un choc mérite son son, et note son passage.
 *
 * La garde de 140 ms est mesurée (cf. `docs/ameliorations.md` § 3.2), mais elle est
 * aveugle : un effleurement peut avaler le coup décisif arrivé 50 ms plus tard. Un
 * choc nettement plus fort casse donc la garde — jamais l'inverse, et jamais sous
 * le plancher de 40 ms, où deux sons se superposeraient sur la même image.
 *
 * Mute l'état : à n'appeler qu'une fois par choc.
 */
export function admitHit(state: GateState, now: number, power: number): boolean {
  const since = now - state.lastAt;
  const admitted =
    since >= MIX.hitGapS ||
    (power >= state.lastPower + MIX.hitPriorityStep && since >= MIX.hitFloorS);
  if (admitted) {
    state.lastAt = now;
    state.lastPower = power;
  }
  return admitted;
}
```

- [ ] **Étape 5 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run src/audio/gate.test.ts`
Attendu : 5 tests PASSENT.

- [ ] **Étape 6 : valider les tests par mutation**

Trois mutations, une par mécanisme. Après chacune, **remettre le code d'origine**.

| Mutation dans `gate.ts` | Test qui doit rougir |
|---|---|
| remplacer `since >= MIX.hitGapS` par `true` | « refuse un second choc de même puissance » |
| supprimer la clause `power >= state.lastPower + …` | « accepte un choc nettement plus fort » |
| remplacer `since >= MIX.hitFloorS` par `true` | « refuse même le plus fort … sous le plancher » |
| déplacer `state.lastAt = now` hors du `if` | « n'avance l'horloge que sur un choc accepté » |

- [ ] **Étape 7 : commit**

```bash
git add src/audio/mix.ts src/audio/gate.ts src/audio/gate.test.ts
git status --short
git commit -m "feat(son): le barème du son, et une garde de chocs qui sait hiérarchiser

La garde de 140 ms était aveugle : un frôlement pouvait avaler le coup décisif
arrivé 50 ms plus tard. Elle devient une priorité — un choc dépassant le
précédent de 0,25 casse la garde, sans jamais descendre sous le plancher de
40 ms où deux sons se superposeraient sur la même image.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Tâche 2 : les trois interrupteurs et leur migration

**Fichiers :**
- Créer : `src/audio/settings.ts`
- Test : `src/audio/settings.test.ts`

**Interfaces :**
- Consomme : rien.
- Produit : `AudioSettings { music, sfx, haptics }`, `KeyValueStore`,
  `loadSettings(store: KeyValueStore): AudioSettings`,
  `saveSettings(store: KeyValueStore, s: AudioSettings): void`.

Le magasin est **injecté** plutôt que `localStorage` importé : c'est ce qui rend la
migration testable sous Vitest en environnement `node`, où `localStorage` n'existe
pas. `localStorage` satisfait `KeyValueStore` structurellement, aucun adaptateur
n'est nécessaire.

- [ ] **Étape 1 : écrire le test qui échoue** — `src/audio/settings.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { loadSettings, saveSettings, type KeyValueStore } from './settings';

function fakeStore(initial: Record<string, string> = {}): KeyValueStore & { dump(): Record<string, string> } {
  const data = { ...initial };
  return {
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
    removeItem: (k) => { delete data[k]; },
    dump: () => ({ ...data }),
  };
}

describe('les réglages du son', () => {
  it('donne les trois interrupteurs allumés sur une installation neuve', () => {
    expect(loadSettings(fakeStore())).toEqual({ music: true, sfx: true, haptics: true });
  });

  it("migre l'ancien mute global vers les trois interrupteurs éteints", () => {
    const store = fakeStore({ 'spinforge.muted': '1' });
    expect(loadSettings(store)).toEqual({ music: false, sfx: false, haptics: false });
    // L'ancienne clé disparaît : sans ça, la migration se rejouerait à chaque
    // chargement et écraserait les réglages faits depuis.
    expect(store.dump()['spinforge.muted']).toBeUndefined();
    expect(store.dump()['spinforge.audio']).toBeDefined();
  });

  it("migre un ancien son actif vers les trois allumés", () => {
    expect(loadSettings(fakeStore({ 'spinforge.muted': '0' })))
      .toEqual({ music: true, sfx: true, haptics: true });
  });

  it('ignore un JSON corrompu au lieu de casser le démarrage', () => {
    expect(loadSettings(fakeStore({ 'spinforge.audio': '{oops' })))
      .toEqual({ music: true, sfx: true, haptics: true });
  });

  it('relit ce qui a été écrit, y compris un seul interrupteur éteint', () => {
    const store = fakeStore();
    saveSettings(store, { music: false, sfx: true, haptics: true });
    expect(loadSettings(store)).toEqual({ music: false, sfx: true, haptics: true });
  });

  it('ne rejoue pas la migration quand les deux clés coexistent', () => {
    const store = fakeStore({
      'spinforge.muted': '1',
      'spinforge.audio': '{"music":true,"sfx":true,"haptics":true}',
    });
    expect(loadSettings(store)).toEqual({ music: true, sfx: true, haptics: true });
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run src/audio/settings.test.ts`
Attendu : ÉCHEC — `Failed to resolve import "./settings"`.

- [ ] **Étape 3 : écrire `src/audio/settings.ts`**

```ts
export interface AudioSettings {
  music: boolean;
  sfx: boolean;
  haptics: boolean;
}

/** Le sous-ensemble de `localStorage` dont on a besoin. Injecté plutôt qu'importé :
 *  c'est ce qui rend la migration testable hors navigateur. */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

const KEY = 'spinforge.audio';
/** Le mute global d'avant les trois interrupteurs. */
const LEGACY_KEY = 'spinforge.muted';

const ALL_ON: AudioSettings = { music: true, sfx: true, haptics: true };

export function loadSettings(store: KeyValueStore): AudioSettings {
  const raw = store.getItem(KEY);
  if (raw === null) {
    const legacy = store.getItem(LEGACY_KEY);
    if (legacy !== null) {
      const migrated: AudioSettings =
        legacy === '1' ? { music: false, sfx: false, haptics: false } : { ...ALL_ON };
      saveSettings(store, migrated);
      // Retirée pour de bon : la laisser ferait rejouer la migration au prochain
      // chargement et écraserait les réglages faits entre-temps.
      store.removeItem(LEGACY_KEY);
      return migrated;
    }
    return { ...ALL_ON };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    // Tout ce qui n'est pas explicitement `false` est allumé : une clé ajoutée
    // plus tard arrive donc active, sans migration.
    return {
      music: parsed.music !== false,
      sfx: parsed.sfx !== false,
      haptics: parsed.haptics !== false,
    };
  } catch {
    return { ...ALL_ON };
  }
}

export function saveSettings(store: KeyValueStore, settings: AudioSettings): void {
  store.setItem(KEY, JSON.stringify(settings));
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run src/audio/settings.test.ts`
Attendu : 6 tests PASSENT.

- [ ] **Étape 5 : valider les tests par mutation**

| Mutation dans `settings.ts` | Test qui doit rougir |
|---|---|
| supprimer la branche `legacy !== null` | « migre l'ancien mute global » |
| supprimer `store.removeItem(LEGACY_KEY)` | « l'ancienne clé disparaît » (2ᵉ assertion du même test) |
| remplacer `try/catch` par un `JSON.parse` nu | « ignore un JSON corrompu » |
| lire la clé héritée **avant** `KEY` | « ne rejoue pas la migration quand les deux clés coexistent » |

- [ ] **Étape 6 : commit**

```bash
git add src/audio/settings.ts src/audio/settings.test.ts
git status --short
git commit -m "feat(son): trois interrupteurs remplacent le mute global, sans perdre le réglage

Musique, bruitages et vibration deviennent indépendants — couper la musique en
gardant les chocs était impossible. L'ancienne clé \`spinforge.muted\` migre une
fois puis disparaît : la laisser ferait rejouer la migration à chaque
chargement et écraserait les réglages faits depuis.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Tâche 3 : la vibration et ses garde-fous

**Fichiers :**
- Créer : `src/audio/haptics.ts`
- Test : `src/audio/haptics.test.ts`

**Interfaces :**
- Consomme : `MIX`, `BUZZ` (tâche 1).
- Produit : `hitPattern(power: number): number[] | null`,
  `createHapticsState(): HapticsState`,
  `admitBuzz(state, now, pattern, urgent): number[] | null`,
  `createHaptics(emit: Emit | null, enabled: boolean): Haptics` avec
  `Haptics { buzz(kind: BuzzKind, now: number): void; hit(power: number, now: number): void; setEnabled(on: boolean): void }`.

- [ ] **Étape 1 : écrire le test qui échoue** — `src/audio/haptics.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { BUZZ, MIX } from './mix';
import { admitBuzz, createHaptics, createHapticsState, hitPattern } from './haptics';

describe('le motif de choc', () => {
  it('ne vibre pas sous le seuil de puissance', () => {
    expect(hitPattern(0.34)).toBeNull();
  });

  it('vibre plus longtemps quand le choc est plus fort', () => {
    expect(hitPattern(0.35)).toEqual([12]);
    expect(hitPattern(1)).toEqual([18]);
  });
});

describe('les garde-fous de débit', () => {
  it('ignore un motif arrivé trop tôt après le précédent', () => {
    const state = createHapticsState();
    expect(admitBuzz(state, 0, [10], false)).toEqual([10]);
    expect(admitBuzz(state, 30, [10], false)).toBeNull();
    expect(admitBuzz(state, 60, [10], false)).toEqual([10]);
  });

  it('laisse passer un motif urgent malgré l\'intervalle', () => {
    const state = createHapticsState();
    admitBuzz(state, 0, [10], false);
    expect(admitBuzz(state, 30, [18], true)).toEqual([18]);
  });

  it('tient le budget de la fenêtre glissante, même en urgence', () => {
    const state = createHapticsState();
    let vibrated = 0;
    for (let now = 0; now < 1000; now += 60) {
      const out = admitBuzz(state, now, [18], true);
      if (out) vibrated += 18;
    }
    expect(vibrated).toBeLessThanOrEqual(MIX.hapticBudgetMs);
  });

  it('libère le budget une fois la fenêtre passée', () => {
    const state = createHapticsState();
    for (let now = 0; now < 1000; now += 60) admitBuzz(state, now, [18], true);
    expect(admitBuzz(state, 2000, [18], false)).toEqual([18]);
  });
});

describe('la façade haptique', () => {
  it('appelle le moteur avec le motif de son événement', () => {
    const emit = vi.fn();
    createHaptics(emit, true).buzz('reward', 0);
    expect(emit).toHaveBeenCalledWith([...BUZZ.reward]);
  });

  it('ne fait rien quand la vibration est coupée', () => {
    const emit = vi.fn();
    const haptics = createHaptics(emit, true);
    haptics.setEnabled(false);
    haptics.buzz('reward', 0);
    expect(emit).not.toHaveBeenCalled();
  });

  it("ne jette pas quand l'appareil n'a pas de moteur haptique", () => {
    const haptics = createHaptics(null, true);
    expect(() => haptics.buzz('chestDone', 0)).not.toThrow();
    expect(() => haptics.hit(1, 0)).not.toThrow();
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run src/audio/haptics.test.ts`
Attendu : ÉCHEC — `Failed to resolve import "./haptics"`.

- [ ] **Étape 3 : écrire `src/audio/haptics.ts`**

```ts
import { BUZZ, MIX } from './mix';

export type BuzzKind = keyof typeof BUZZ;
export type Emit = (pattern: number[]) => void;

/** Les deux événements qui priment sur l'intervalle minimum : ils concluent une
 *  animation, les décaler ou les perdre casserait le lien avec ce qu'on voit. */
const URGENT: ReadonlySet<BuzzKind> = new Set<BuzzKind>(['chestDone', 'bossDown']);

export interface HapticsState {
  lastAt: number;
  /** Ce qui a été vibré dans la seconde écoulée, pour le budget glissant. */
  window: { at: number; ms: number }[];
}

export function createHapticsState(): HapticsState {
  return { lastAt: -Infinity, window: [] };
}

/** Le motif d'un choc, ou `null` s'il est trop faible pour mériter la main.
 *  Sans ce seuil, une mêlée fait buzzer le téléphone en continu. */
export function hitPattern(power: number): number[] | null {
  if (power < MIX.hapticHitThreshold) return null;
  const clamped = Math.max(0, Math.min(1, power));
  return [Math.round(MIX.hapticHitBaseMs + MIX.hapticHitSpanMs * clamped)];
}

/**
 * Décide si un motif part vraiment, et note ce qu'il coûte.
 *
 * Deux garde-fous : un intervalle minimum entre deux appels, et un budget de
 * millisecondes par seconde glissante. Sans eux, le moteur haptique d'Android
 * empile les motifs et les écrase les uns sur les autres — on sent moins en
 * vibrant plus. Le budget s'applique même aux motifs urgents.
 */
export function admitBuzz(
  state: HapticsState,
  now: number,
  pattern: number[],
  urgent: boolean,
): number[] | null {
  if (!urgent && now - state.lastAt < MIX.hapticMinGapMs) return null;
  const fresh = state.window.filter((e) => now - e.at < MIX.hapticWindowMs);
  const spent = fresh.reduce((sum, e) => sum + e.ms, 0);
  // Seules les durées comptent : dans `[30, 60, 18]`, le 60 est une pause.
  const cost = pattern.filter((_, i) => i % 2 === 0).reduce((sum, ms) => sum + ms, 0);
  if (spent + cost > MIX.hapticBudgetMs) {
    state.window = fresh;
    return null;
  }
  state.lastAt = now;
  state.window = [...fresh, { at: now, ms: cost }];
  return pattern;
}

export interface Haptics {
  buzz(kind: BuzzKind, now: number): void;
  hit(power: number, now: number): void;
  setEnabled(on: boolean): void;
}

/** `emit` est injecté — `null` sur un appareil sans moteur haptique (iOS Safari
 *  n'expose aucune API de vibration). L'absence est un cas ordinaire, pas une
 *  exception à rattraper. */
export function createHaptics(emit: Emit | null, enabled: boolean): Haptics {
  const state = createHapticsState();
  let on = enabled;
  const send = (pattern: number[] | null, urgent: boolean, now: number) => {
    if (!on || !emit || !pattern) return;
    const admitted = admitBuzz(state, now, pattern, urgent);
    if (admitted) emit(admitted);
  };
  return {
    buzz(kind, now) {
      send([...BUZZ[kind]], URGENT.has(kind), now);
    },
    hit(power, now) {
      send(hitPattern(power), false, now);
    },
    setEnabled(next) {
      on = next;
    },
  };
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run src/audio/haptics.test.ts`
Attendu : 8 tests PASSENT.

- [ ] **Étape 5 : valider les tests par mutation**

| Mutation dans `haptics.ts` | Test qui doit rougir |
|---|---|
| supprimer le `if (power < MIX.hapticHitThreshold)` | « ne vibre pas sous le seuil » |
| supprimer la clause d'intervalle minimum | « ignore un motif arrivé trop tôt » |
| supprimer le contrôle de budget | « tient le budget de la fenêtre glissante » |
| ne pas filtrer `state.window` sur la fenêtre | « libère le budget une fois la fenêtre passée » |
| retirer `URGENT` (tout non urgent) | « laisse passer un motif urgent » |
| retirer le garde `!emit` | « ne jette pas quand l'appareil n'a pas de moteur » |

- [ ] **Étape 6 : commit**

```bash
git add src/audio/haptics.ts src/audio/haptics.test.ts
git status --short
git commit -m "feat(son): la vibration, sous intervalle minimum et budget glissant

Le moteur haptique d'Android empile les motifs et les écrase quand on le
sature : on sent moins en vibrant plus. Deux garde-fous purs — 60 ms entre deux
appels, 220 ms vibrées par seconde — et un seuil sous lequel un choc ne mérite
pas la main. Le moteur est injecté, donc son absence (iOS) est un cas ordinaire
et non une exception.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Tâche 4 : les primitives WebAudio, le nouveau choc, et le banc d'essai

C'est la tâche qui bascule le jeu sur le nouveau son. Elle est plus grosse que les
précédentes parce qu'elle ne peut pas être coupée : `audio.ts` est consommé par
`App.tsx` et `CombatScreen.tsx`, remplacer sa façade sans les adapter casse le build.

**Fichiers :**
- Créer : `src/audio/synth.ts`
- Réécrire : `src/audio/audio.ts`
- Créer : `soundboard.html`, `src/dev/soundboard.tsx`
- Modifier : `src/ui/App.tsx`, `src/ui/CombatScreen.tsx`

**Interfaces :**
- Consomme : `MIX` (t1), `admitHit`/`createGate` (t1), `createHaptics` (t3),
  `loadSettings`/`saveSettings` (t2).
- Produit : `Bus { ctx, sfx, music, noise }`, `createBus()`, `noiseBuffer()`,
  `envelope()`, `burst()`, `tone()`, `metalBody()`, `sweep()`, `comb()` ;
  et le singleton `audio` avec, à ce stade, `start`, `setSpin`, `hit`, `death`,
  `door`, `settings`, `setSetting`, `destroy`. Les tâches 5, 7 et 8 étendent ce
  singleton sans changer ce qui est là.

- [ ] **Étape 1 : écrire `src/audio/synth.ts`**

```ts
import { MIX } from './mix';

export interface Bus {
  ctx: AudioContext;
  /** Où branchent les bruitages. */
  sfx: GainNode;
  /** Où branche la musique. Séparée pour pouvoir la couper seule, et la ducker. */
  music: GainNode;
  /** Une seconde de bruit blanc, réutilisée par tous les sons percussifs. */
  noise: AudioBuffer;
}

export function noiseBuffer(ctx: BaseAudioContext, seconds: number): AudioBuffer {
  const buffer = ctx.createBuffer(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createBus(): Bus {
  const ctx = new AudioContext();

  // Limiteur en sortie : l'arène peut empiler chocs, mort et transition de salle
  // sur la même image, et c'est cette saturation-là qui écrête.
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 14;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.18;
  limiter.connect(ctx.destination);

  const master = ctx.createGain();
  master.gain.value = MIX.master;
  master.connect(limiter);

  const sfx = ctx.createGain();
  sfx.gain.value = MIX.sfxGain;
  sfx.connect(master);

  const music = ctx.createGain();
  music.gain.value = MIX.musicGain;
  music.connect(master);

  return { ctx, sfx, music, noise: noiseBuffer(ctx, 2) };
}

/**
 * Enveloppe percussive. L'attaque de quelques millisecondes n'est pas cosmétique :
 * démarrer un son à pleine amplitude est une discontinuité, donc un clic — et
 * c'est ce clic, répété, qui rendait les impacts agressifs.
 */
export function envelope(
  ctx: BaseAudioContext, at: number, peak: number, attack: number, duration: number,
): GainNode {
  const env = ctx.createGain();
  env.gain.setValueAtTime(0.0001, at);
  env.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), at + attack);
  env.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  return env;
}

export interface BurstOptions {
  freq: number;
  gain: number;
  duration: number;
  q?: number;
  type?: BiquadFilterType;
  /** Instant absolu sur l'horloge audio. Par défaut : maintenant. */
  at?: number;
  rate?: number;
  toFreq?: number;
}

/** Une bouffée de bruit filtré : tout ce qui claque, souffle ou craque. */
export function burst(bus: Bus, dest: AudioNode, o: BurstOptions): void {
  const { ctx } = bus;
  const at = o.at ?? ctx.currentTime;
  const src = ctx.createBufferSource();
  src.buffer = bus.noise;
  src.playbackRate.value = o.rate ?? 1;
  const filter = ctx.createBiquadFilter();
  filter.type = o.type ?? 'bandpass';
  filter.frequency.setValueAtTime(o.freq, at);
  if (o.toFreq !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, o.toFreq), at + o.duration);
  }
  filter.Q.value = o.q ?? 1;
  src.connect(filter).connect(envelope(ctx, at, o.gain, 0.004, o.duration)).connect(dest);
  src.start(at);
  src.stop(at + o.duration);
}

export interface ToneOptions {
  from: number;
  gain: number;
  duration: number;
  to?: number;
  type?: OscillatorType;
  at?: number;
  attack?: number;
}

export function tone(bus: Bus, dest: AudioNode, o: ToneOptions): void {
  const { ctx } = bus;
  const at = o.at ?? ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = o.type ?? 'sine';
  osc.frequency.setValueAtTime(o.from, at);
  if (o.to !== undefined && o.to !== o.from) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.to), at + o.duration);
  }
  osc.connect(envelope(ctx, at, o.gain, o.attack ?? 0.008, o.duration)).connect(dest);
  osc.start(at);
  osc.stop(at + o.duration);
}

export interface MetalOptions {
  freq: number;
  gain: number;
  decay: number;
  at?: number;
  partials?: readonly number[];
}

/**
 * Le corps d'un choc métallique. Les partiels sont **inharmoniques** : des
 * multiples entiers donneraient une note de flûte, ce sont les ratios de plaque
 * (1 · 2,76 · 5,40) qui font entendre du métal. Les partiels aigus décroissent
 * plus vite que la fondamentale, comme dans une vraie plaque.
 */
export function metalBody(bus: Bus, dest: AudioNode, o: MetalOptions): void {
  for (const ratio of o.partials ?? MIX.hitBodyPartials) {
    tone(bus, dest, {
      from: o.freq * ratio,
      gain: o.gain / (1 + (ratio - 1) * 1.6),
      duration: o.decay / Math.sqrt(ratio),
      at: o.at,
      attack: 0.004,
    });
  }
}

/**
 * Filtre en peigne : un délai très court rebouclé sur lui-même. Il donne au bruit
 * une hauteur sans lui donner une note — c'est le son d'une enclume frappée, et la
 * signature « forge » de la musique.
 */
export function comb(bus: Bus, dest: AudioNode, hz: number, feedback: number): AudioNode {
  const { ctx } = bus;
  const input = ctx.createGain();
  const delay = ctx.createDelay(0.05);
  delay.delayTime.value = 1 / hz;
  const loop = ctx.createGain();
  loop.gain.value = feedback;
  input.connect(delay);
  delay.connect(loop).connect(delay);
  delay.connect(dest);
  input.connect(dest);
  return input;
}
```

- [ ] **Étape 2 : réécrire `src/audio/audio.ts`**

```ts
import { MIX } from './mix';
import { admitHit, createGate } from './gate';
import { createHaptics, type Haptics } from './haptics';
import { loadSettings, saveSettings, type AudioSettings } from './settings';
import { burst, createBus, metalBody, tone, type Bus } from './synth';

export type TapKind = 'tap' | 'chest' | 'fuse' | 'upgrade';

export interface Audio {
  /** À appeler au premier geste, où qu'il tombe : les navigateurs interdisent de
   *  créer un contexte audio autrement. Idempotent. */
  start(): void;
  /** Le rotor ne souffle que pendant un combat : `null` le coupe. */
  setSpin(ratio: number | null): void;
  hit(power: number): void;
  death(): void;
  door(): void;
  settings(): AudioSettings;
  setSetting(key: keyof AudioSettings, on: boolean): void;
  destroy(): void;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function createAudio(): Audio {
  let bus: Bus | null = null;
  let whirrFilter: BiquadFilterNode | null = null;
  let whirrGain: GainNode | null = null;
  let whirrSource: AudioBufferSourceNode | null = null;
  let sub: OscillatorNode | null = null;
  let subGain: GainNode | null = null;
  let spin = 0;

  const gate = createGate();
  let settings = loadSettings(localStorage);
  const haptics: Haptics = createHaptics(
    typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'
      ? (pattern) => { navigator.vibrate(pattern); }
      : null,
    settings.haptics,
  );

  function live(): Bus | null {
    if (!bus) return null;
    if (bus.ctx.state === 'suspended') void bus.ctx.resume();
    return bus;
  }

  /** Le rotor s'efface sous un choc fort, puis revient. Un son tenu qui
   *  s'interrompt cesse d'être un son tenu : c'est ce qui le fait disparaître de
   *  la conscience sans le retirer de la scène. */
  function duck(power: number): void {
    if (!bus || !whirrGain || power < MIX.duckPower) return;
    const t = bus.ctx.currentTime;
    const target = MIX.whirrGain * (0.25 + 0.75 * spin);
    whirrGain.gain.cancelScheduledValues(t);
    whirrGain.gain.setValueAtTime(target * MIX.duckWhirr, t);
    whirrGain.gain.setTargetAtTime(target, t + MIX.duckHoldS, MIX.duckReleaseS);
  }

  return {
    start() {
      if (bus) {
        void bus.ctx.resume();
        return;
      }
      bus = createBus();
      bus.sfx.gain.value = settings.sfx ? MIX.sfxGain : 0;
      bus.music.gain.value = settings.music ? MIX.musicGain : 0;

      whirrFilter = bus.ctx.createBiquadFilter();
      whirrFilter.type = 'bandpass';
      whirrFilter.frequency.value = MIX.whirrFreqLow;
      whirrFilter.Q.value = 1.1;
      whirrGain = bus.ctx.createGain();
      whirrGain.gain.value = 0;
      whirrSource = bus.ctx.createBufferSource();
      whirrSource.buffer = bus.noise;
      whirrSource.loop = true;
      whirrSource.connect(whirrFilter).connect(whirrGain).connect(bus.sfx);
      whirrSource.start();

      sub = bus.ctx.createOscillator();
      sub.frequency.value = MIX.subFreqLow;
      subGain = bus.ctx.createGain();
      subGain.gain.value = 0;
      sub.connect(subGain).connect(bus.sfx);
      sub.start();
    },

    setSpin(ratio) {
      const b = live();
      if (!b || !whirrFilter || !whirrGain || !sub || !subGain) return;
      const t = b.ctx.currentTime;
      if (ratio === null) {
        spin = 0;
        whirrGain.gain.setTargetAtTime(0, t, 0.1);
        subGain.gain.setTargetAtTime(0, t, 0.1);
        return;
      }
      spin = clamp01(ratio);
      whirrFilter.frequency.setTargetAtTime(
        MIX.whirrFreqLow + (MIX.whirrFreqHigh - MIX.whirrFreqLow) * spin, t, 0.12,
      );
      sub.frequency.setTargetAtTime(MIX.subFreqLow + (MIX.subFreqHigh - MIX.subFreqLow) * spin, t, 0.12);
      whirrGain.gain.setTargetAtTime(MIX.whirrGain * (0.25 + 0.75 * spin), t, 0.1);
      subGain.gain.setTargetAtTime(MIX.subGain * spin, t, 0.1);
    },

    hit(power) {
      const p = clamp01(power);
      // La vibration est indépendante du son : elle a ses propres garde-fous, et
      // elle doit fonctionner même quand les bruitages sont coupés.
      haptics.hit(p, performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      if (!admitHit(gate, b.ctx.currentTime, p)) return;
      duck(p);
      // Le transitoire : l'attaque, ce qui fait « maintenant ».
      burst(b, b.sfx, {
        type: 'highpass',
        freq: MIX.hitClickHz,
        gain: MIX.hitClickGain + MIX.hitClickSpan * p,
        duration: MIX.hitClickS,
        rate: 0.7 + Math.random() * 0.6,
      });
      // Le corps : c'est lui qui manquait. Plus le choc est fort, plus il est grave.
      const detune = 1 + (Math.random() * 2 - 1) * MIX.hitDetune;
      metalBody(b, b.sfx, {
        freq: (MIX.hitBodyHz + MIX.hitBodySpan * p) * detune,
        gain: MIX.hitBodyGain + MIX.hitBodyGainSpan * p,
        decay: MIX.hitBodyDecayS + MIX.hitBodyDecaySpan * p,
      });
      // Le poids : seuls les vrais coups le méritent.
      if (p > MIX.hitSubThreshold) {
        tone(b, b.sfx, {
          from: MIX.hitSubFrom, to: MIX.hitSubTo, duration: MIX.hitSubS, gain: MIX.hitSubGain * p,
        });
      }
    },

    death() {
      haptics.buzz('death', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      metalBody(b, b.sfx, { freq: 190, gain: 0.07, decay: 0.55 });
      tone(b, b.sfx, { from: 190, to: 55, duration: 0.55, gain: 0.06 });
      burst(b, b.sfx, { freq: 520, q: 0.9, gain: 0.05, duration: 0.4 });
    },

    door() {
      const b = live();
      if (!b || !settings.sfx) return;
      // Ré5 puis la5 : deux degrés de ré phrygien, donc deux notes qui
      // s'accordent avec la musique au lieu de lui rentrer dedans.
      tone(b, b.sfx, { from: 587.33, duration: 0.11, gain: 0.045 });
      tone(b, b.sfx, { from: 880, duration: 0.16, gain: 0.04, at: b.ctx.currentTime + 0.09 });
      tone(b, b.sfx, { from: 110, to: 70, duration: 0.22, gain: 0.05 });
    },

    settings() {
      return { ...settings };
    },

    setSetting(key, on) {
      settings = { ...settings, [key]: on };
      saveSettings(localStorage, settings);
      if (key === 'haptics') haptics.setEnabled(on);
      if (!bus) return;
      const t = bus.ctx.currentTime;
      if (key === 'sfx') bus.sfx.gain.setTargetAtTime(on ? MIX.sfxGain : 0, t, 0.03);
      if (key === 'music') bus.music.gain.setTargetAtTime(on ? MIX.musicGain : 0, t, 0.03);
    },

    destroy() {
      whirrSource?.stop();
      sub?.stop();
      void bus?.ctx.close();
      bus = null;
      whirrFilter = null;
      whirrGain = null;
      whirrSource = null;
      sub = null;
      subGain = null;
    },
  };
}

/**
 * Singleton de module, sur le modèle de `src/i18n/`. Cinq composants ont besoin du
 * son, dont deux à deux niveaux de profondeur : enfiler une prop `audio` à travers
 * `ForgeScreen` → `InventoryPanel` → `PieceSheet` coûterait plus que ça ne prouve.
 * Le contexte WebAudio, lui, ne naît qu'au premier geste — voir `start()`.
 */
export const audio: Audio = createAudio();
```

- [ ] **Étape 3 : adapter `src/ui/App.tsx`**

Retirer `audioRef`, `createAudio`, l'état `muted` et l'effet de destruction ;
importer le singleton. Le bouton 🔊 pilote provisoirement les trois interrupteurs
ensemble — **la tâche 6 le remplace par le panneau**.

```tsx
import { audio } from '../audio/audio';
// …
const [sound, setSound] = useState(() => audio.settings());
const soundOn = sound.music || sound.sfx;
```

```tsx
<button
  onClick={() => {
    const next = !soundOn;
    for (const key of ['music', 'sfx', 'haptics'] as const) audio.setSetting(key, next);
    setSound(audio.settings());
  }}
  aria-label={soundOn ? t('header.mute') : t('header.unmute')}
  style={{ /* inchangé */ }}
>
  {soundOn ? '🔊' : '🔇'}
</button>
```

Retirer la prop `audio={audioRef.current}` passée à `<CombatScreen>`.

- [ ] **Étape 4 : adapter `src/ui/CombatScreen.tsx`**

Retirer la prop `audio` et son type ; importer le singleton
(`import { audio } from '../audio/audio';`). Retirer `audio` du tableau de
dépendances de l'effet `if (!running) audio.setSpin(null)` — un singleton de module
n'est pas une dépendance de rendu. Tout le reste (`hit`, `death`, `door`,
`setSpin`, `audio.start()` dans `onDown`) est inchangé.

- [ ] **Étape 5 : créer le banc d'essai**

`soundboard.html` (à la racine, jumeau de `styleboard.html`) :

```html
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SpinForge — banc d'essai sonore</title>
  </head>
  <body style="margin:0;background:#0b0e13;color:#e7ecf3;font-family:ui-sans-serif,system-ui,sans-serif">
    <div id="root"></div>
    <script type="module" src="/src/dev/soundboard.tsx"></script>
  </body>
</html>
```

`src/dev/soundboard.tsx` :

```tsx
import { StrictMode, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { audio } from '../audio/audio';

/**
 * Banc d'essai du son, jumeau de la planche de style — et pour la même raison :
 * le goût ne se teste pas unitairement, il s'écoute. Régler un choc sans lui
 * demanderait de lancer une partie et d'attendre qu'un bot vienne au contact.
 * `vite build` ne construit que `index.html` : ce banc n'est jamais livré.
 */
function Soundboard() {
  const [power, setPower] = useState(0.6);
  const [spin, setSpin] = useState(1);

  const fire = (run: () => void) => () => {
    audio.start();
    run();
  };

  return (
    <main style={{ maxWidth: 620, margin: '0 auto', padding: 20, display: 'grid', gap: 14 }}>
      <h1 style={{ font: '600 22px ui-sans-serif', margin: 0 }}>Banc d'essai sonore</h1>

      <label style={{ display: 'grid', gap: 4 }}>
        Puissance du choc : {power.toFixed(2)}
        <input type="range" min={0} max={1} step={0.01} value={power}
               onChange={(e) => setPower(Number(e.target.value))} />
      </label>
      <button onClick={fire(() => audio.hit(power))} style={BTN}>Choc</button>
      <button onClick={fire(() => { for (let i = 0; i < 12; i++) setTimeout(() => audio.hit(power * Math.random()), i * 90); })} style={BTN}>
        Mêlée — 12 chocs en 1 s (vérifie la garde)
      </button>

      <label style={{ display: 'grid', gap: 4 }}>
        Rotor (spin) : {spin.toFixed(2)}
        <input type="range" min={0} max={1} step={0.01} value={spin}
               onChange={(e) => { setSpin(Number(e.target.value)); audio.start(); audio.setSpin(Number(e.target.value)); }} />
      </label>
      <button onClick={fire(() => audio.setSpin(null))} style={BTN}>Couper le rotor</button>

      <button onClick={fire(() => audio.death())} style={BTN}>Mort</button>
      <button onClick={fire(() => audio.door())} style={BTN}>Porte de salle</button>
    </main>
  );
}

const BTN: React.CSSProperties = {
  minHeight: 44, borderRadius: 10, cursor: 'pointer',
  border: '1px solid #2a3444', background: '#131922', color: '#e7ecf3', fontSize: 15,
};

createRoot(document.getElementById('root')!).render(<StrictMode><Soundboard /></StrictMode>);
```

- [ ] **Étape 6 : vérifier la compilation et les tests**

Lancer : `npm run build && npm run test`
Attendu : build sans erreur TypeScript, 374 tests + les 19 des tâches 1-3 passent.

- [ ] **Étape 7 : écouter, soi-même, dans un vrai navigateur**

Lancer `npm run dev`, lire la ligne « Local: » (le port n'est pas forcément 5173),
puis ouvrir `/spinforge/soundboard.html`. Vérifier à l'oreille :

1. **Le choc a un corps.** À puissance 0,2 il claque sec et clair ; à 1,0 il est
   plus grave, plus long, avec du poids sous lui. Si les deux se ressemblent, c'est
   `hitBodySpan` qui n'agit pas.
2. **Douze chocs en une seconde ne mitraillent pas.** On doit entendre des coups
   distincts, pas un roulement.
3. **Le rotor est une texture.** Au curseur à 1,0 il doit être audible sans jamais
   attirer l'attention ; déclencher un choc fort pendant qu'il tourne doit
   l'effacer perceptiblement puis le laisser revenir.

Puis ouvrir `/spinforge/` et jouer une salle : le choc doit dominer le rotor.

- [ ] **Étape 8 : commit**

```bash
git add src/audio/synth.ts src/audio/audio.ts src/ui/App.tsx src/ui/CombatScreen.tsx soundboard.html src/dev/soundboard.tsx
git status --short
git commit -m "feat(son): le choc gagne un corps métallique, le rotor redevient une texture

Le choc n'était qu'une bouffée de bruit filtré : il claquait sans rien peser. Il
se joue maintenant en trois composantes — transitoire, corps inharmonique aux
ratios de plaque, sub au-delà du seuil — et sa fondamentale DESCEND avec la
puissance, comme un vrai impact. Le rotor passe de 0,055 à 0,018 et s'efface
200 ms sous chaque choc fort.

La façade devient un singleton de module, comme l'i18n : cinq composants en ont
besoin, dont deux à deux niveaux de profondeur.

Le banc d'essai (\`soundboard.html\`, jamais construit) permet de régler un choc
sans lancer une partie et attendre qu'un bot vienne au contact.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Tâche 5 : le reste du catalogue de bruitages

**Fichiers :**
- Modifier : `src/audio/audio.ts`, `src/dev/soundboard.tsx`, `src/ui/CombatScreen.tsx`

**Interfaces :**
- Consomme : tout ce que produit la tâche 4.
- Produit : sur le singleton `audio` — `reward(credits: number, chests: number)`,
  `bossDown()`, `chestShake()`, `chestStep(index: number)`, `chestOpened()`,
  `pieceRevealed(tier: number)`, `chestDone(bestTier: number)`, `fuse()`,
  `upgrade()`, `equip()`, `tap(kind: TapKind)`. Les tâches 9 à 11 les appellent
  depuis l'UI ; ici seuls `reward` et `bossDown` sont branchés.

- [ ] **Étape 1 : ajouter les hauteurs de révélation au barème**

Dans `src/audio/mix.ts`, à la suite de `LAYERS` :

```ts
/** Hauteur du « ting » de révélation, par palier de rang. Mi♭5, sol5, si♭5, ré6 :
 *  quatre degrés de ré phrygien, donc quatre notes qui s'accordent avec la
 *  musique. Un mi ou un si naturels sonneraient faux contre la fondamentale. */
export const REVEAL_HZ = [622.25, 784, 932.33, 1174.66] as const;
```

- [ ] **Étape 2 : ajouter les méthodes à `src/audio/audio.ts`**

Ajouter `REVEAL_HZ` à l'import de `./mix` (`import { MIX, REVEAL_HZ } from './mix';`),
compléter l'interface `Audio` avec les onze signatures ci-dessus, puis, dans l'objet
retourné :

```ts
    reward(credits, chests) {
      haptics.buzz('reward', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      // Les pièces qui tombent dans la caisse : des grains de métal, hauteur
      // montante, espacés irrégulièrement — une cascade, pas un arpège.
      const grains = 4 + Math.min(1, chests);
      for (let i = 0; i < grains; i++) {
        burst(b, b.sfx, {
          freq: 1800 + (3200 - 1800) * (i / grains),
          q: 6,
          gain: 0.035,
          duration: 0.025,
          at: b.ctx.currentTime + i * 0.045 + Math.random() * 0.015,
        });
      }
      // Le fond de la caisse.
      tone(b, b.sfx, { from: 90, duration: 0.09, gain: 0.04, at: b.ctx.currentTime + 0.02 });
    },

    bossDown() {
      haptics.buzz('bossDown', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const t = b.ctx.currentTime;
      metalBody(b, b.sfx, { freq: 146.83, gain: 0.09, decay: 0.9 });
      // Ré4, la4, ré5 : la fondamentale, sa quinte, son octave.
      [293.66, 440, 587.33].forEach((hz, i) => {
        tone(b, b.sfx, { from: hz, duration: 0.5, gain: 0.05, at: t + i * 0.12 });
      });
    },

    chestShake() {
      const b = live();
      if (!b || !settings.sfx) return;
      // Un grondement sourd tenu le temps de la secousse (600 ms côté écran).
      burst(b, b.sfx, { type: 'lowpass', freq: 220, gain: 0.05, duration: 0.6, rate: 0.4 });
    },

    chestStep(index) {
      const b = live();
      if (!b || !settings.sfx) return;
      burst(b, b.sfx, { freq: 700 * (1 + index * 0.18), q: 2, gain: 0.045, duration: 0.04 });
    },

    chestOpened() {
      haptics.buzz('chestOpened', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      burst(b, b.sfx, { type: 'highpass', freq: 2600, gain: 0.05, duration: 0.35 });
      tone(b, b.sfx, { from: 293.66, duration: 0.35, gain: 0.04 });
      tone(b, b.sfx, { from: 440, duration: 0.35, gain: 0.035 });
    },

    pieceRevealed(tier) {
      const b = live();
      if (!b || !settings.sfx) return;
      const hz = REVEAL_HZ[Math.max(0, Math.min(REVEAL_HZ.length - 1, tier))];
      tone(b, b.sfx, { from: hz, duration: 0.18, gain: 0.035, type: 'triangle' });
      tone(b, b.sfx, { from: hz * 2.4, duration: 0.09, gain: 0.015 });
    },

    chestDone(bestTier) {
      haptics.buzz('chestDone', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const top = REVEAL_HZ[Math.max(0, Math.min(REVEAL_HZ.length - 1, bestTier))];
      // Décalé de 0,12 s : la dernière pièce révélée sonne au même instant, et
      // les deux sons empilés s'annulaient au lieu de se succéder.
      const t = b.ctx.currentTime + 0.12;
      [top / 2, (top * 3) / 4, top].forEach((hz, i) => {
        tone(b, b.sfx, { from: hz, duration: 0.25, gain: 0.04, at: t + i * 0.1, type: 'triangle' });
      });
    },

    fuse() {
      haptics.buzz('fuse', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const t = b.ctx.currentTime;
      // La montée, puis l'enclume au bout : on entend l'effort avant le résultat.
      burst(b, b.sfx, { freq: 300, toFreq: 2000, q: 3, gain: 0.045, duration: 0.35 });
      metalBody(b, b.sfx, { freq: 293.66, gain: 0.09, decay: 0.35, at: t + 0.35 });
    },

    upgrade() {
      const b = live();
      if (!b || !settings.sfx) return;
      metalBody(b, b.sfx, { freq: 392, gain: 0.06, decay: 0.2 });
    },

    equip() {
      haptics.buzz('equip', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      const t = b.ctx.currentTime;
      burst(b, b.sfx, { freq: 1400, q: 5, gain: 0.035, duration: 0.03 });
      burst(b, b.sfx, { freq: 900, q: 5, gain: 0.03, duration: 0.04, at: t + 0.04 });
    },

    tap(kind) {
      haptics.buzz('tap', performance.now());
      const b = live();
      if (!b || !settings.sfx) return;
      // Deux variantes alternées : deux clics rigoureusement identiques à la
      // suite s'entendent comme un défaut, pas comme un retour.
      tapAlt = !tapAlt;
      burst(b, b.sfx, {
        freq: 1200 * (tapAlt ? 1 : 1.12), q: 4, gain: 0.03, duration: 0.025,
      });
      if (kind !== 'tap') {
        // L'appui qui engage une dépense sonne plus lourd que celui qui navigue.
        tone(b, b.sfx, { from: 160, to: 120, duration: 0.04, gain: 0.03 });
      }
    },
```

Déclarer `let tapAlt = false;` à côté de `let spin = 0;`.

- [ ] **Étape 3 : brancher `reward` et `bossDown` dans `src/ui/CombatScreen.tsx`**

```tsx
          if (events.chapterValidated) audio.bossDown();
          else if (events.salleChanged) audio.door();
```

(le bandeau du boss reste dans le `if (events.salleChanged)` d'origine — le
déplacer changerait le comportement visuel ; garder la condition existante pour le
bandeau et n'aiguiller que le son.)

Et dans les `handlers` :

```tsx
      onReward: (reward) => {
        audio.reward(reward.credits, reward.chests.length);
        onMetaChanged();
      },
```

- [ ] **Étape 4 : ajouter les rangées au banc d'essai**

Dans `src/dev/soundboard.tsx`, ajouter un curseur de palier de rang et une rangée
par son :

```tsx
  const [tier, setTier] = useState(3);
  // …
      <label style={{ display: 'grid', gap: 4 }}>
        Palier de rang : {tier}
        <input type="range" min={0} max={3} step={1} value={tier}
               onChange={(e) => setTier(Number(e.target.value))} />
      </label>
      <button onClick={fire(() => audio.reward(1200, 1))} style={BTN}>Récompense de salle</button>
      <button onClick={fire(() => audio.bossDown())} style={BTN}>Boss vaincu</button>
      <button onClick={fire(() => audio.chestShake())} style={BTN}>Coffre — secousse</button>
      <button onClick={fire(() => [0, 1, 2].forEach((i) => setTimeout(() => audio.chestStep(i), i * 110)))} style={BTN}>
        Coffre — les trois poses
      </button>
      <button onClick={fire(() => audio.chestOpened())} style={BTN}>Coffre — le couvercle cède</button>
      <button onClick={fire(() => audio.pieceRevealed(tier))} style={BTN}>Pièce révélée (palier {tier})</button>
      <button onClick={fire(() => audio.chestDone(tier))} style={BTN}>Butin rangé (palier {tier})</button>
      <button onClick={fire(() => audio.fuse())} style={BTN}>Fusion</button>
      <button onClick={fire(() => audio.upgrade())} style={BTN}>Amélioration</button>
      <button onClick={fire(() => audio.equip())} style={BTN}>Équiper</button>
      <button onClick={fire(() => audio.tap('tap'))} style={BTN}>Bouton — appui simple</button>
      <button onClick={fire(() => audio.tap('chest'))} style={BTN}>Bouton — appui qui dépense</button>
```

- [ ] **Étape 5 : vérifier la compilation et les tests**

Lancer : `npm run build && npm run test`
Attendu : aucune erreur, tous les tests passent.

- [ ] **Étape 6 : écouter le catalogue complet au banc**

Ouvrir `/spinforge/soundboard.html` et écouter chaque rangée. Trois vérifications
qui ne sont pas des questions de goût :

1. **La récompense fait entendre plusieurs grains distincts**, pas un seul bruit.
2. **Les quatre paliers de révélation montent** — palier 0 puis palier 3 doivent
   être clairement séparés en hauteur.
3. **Deux appuis consécutifs sur « appui simple » ne sont pas identiques.**

Puis en jeu (`/spinforge/`) : finir une salle et entendre les pièces tomber dans la
caisse.

- [ ] **Étape 7 : commit**

```bash
git add src/audio/mix.ts src/audio/audio.ts src/ui/CombatScreen.tsx src/dev/soundboard.tsx
git status --short
git commit -m "feat(son): onze bruitages de plus, dont les pièces qui tombent dans la caisse

Chaque gain a maintenant sa ponctuation : la récompense de salle est une cascade
de grains métalliques suivie d'un fond de caisse, la révélation d'une pièce un
« ting » dont la hauteur suit son palier de rareté, le boss vaincu un accord
ré/la/ré sur une enclume pleine.

Toutes les hauteurs sont des degrés de ré phrygien, le mode de la musique à
venir : un mi ou un si naturels sonneraient faux contre la fondamentale.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Tâche 6 : le panneau de réglages

**Fichiers :**
- Créer : `src/ui/AudioSettings.tsx`
- Modifier : `src/ui/App.tsx`, `src/i18n/fr.ts`, `src/i18n/en.ts`

**Interfaces :**
- Consomme : `audio.settings()` / `audio.setSetting()` (tâche 4).
- Produit : `<AudioSettings onClose={() => void} />`.

- [ ] **Étape 1 : ajouter les clés i18n**

Dans `src/i18n/fr.ts`, **retirer** `'header.mute'` et `'header.unmute'`, et ajouter :

```ts
  'audio.settings': 'Réglages du son',
  'audio.music': 'Musique',
  'audio.sfx': 'Bruitages',
  'audio.haptics': 'Vibration',
  'audio.close': 'Fermer',
```

Dans `src/i18n/en.ts`, retirer les deux mêmes et ajouter :

```ts
  'audio.settings': 'Sound settings',
  'audio.music': 'Music',
  'audio.sfx': 'Sound effects',
  'audio.haptics': 'Vibration',
  'audio.close': 'Close',
```

- [ ] **Étape 2 : vérifier que le filet i18n fonctionne**

Lancer : `npm run build`
Attendu : **ÉCHEC** tant que `App.tsx` référence encore `header.mute` — c'est le
filet du dépôt (`en.ts` est un `Record<MessageKey, string>`) qui joue son rôle. On
continue à l'étape suivante ; l'erreur disparaît en étape 4.

- [ ] **Étape 3 : écrire `src/ui/AudioSettings.tsx`**

```tsx
import { audio } from '../audio/audio';
import { t } from '../i18n';
import type { AudioSettings as Settings } from '../audio/settings';

const ROWS = [
  { key: 'music', label: 'audio.music' },
  { key: 'sfx', label: 'audio.sfx' },
  { key: 'haptics', label: 'audio.haptics' },
] as const;

/** Trois interrupteurs plutôt qu'un mute global : couper la musique en gardant
 *  les chocs est le réglage que cherchent les joueurs mobiles, et il était
 *  impossible. Le panneau lit et écrit directement le singleton — il n'y a pas
 *  d'état à remonter, `onChanged` sert seulement à redessiner l'icône. */
export function AudioSettings({ settings, onChanged, onClose }: {
  settings: Settings;
  onChanged: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 10, background: 'rgba(6,8,12,.6)' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute', top: 52, right: 12, width: 208, padding: 10,
          display: 'flex', flexDirection: 'column', gap: 6,
          border: '1px solid var(--line)', borderRadius: 11, background: 'var(--panel)',
        }}
      >
        {ROWS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { audio.setSetting(key, !settings[key]); onChanged(); }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              minHeight: 40, padding: '0 10px', borderRadius: 9, cursor: 'pointer',
              border: '1px solid var(--line)', background: 'var(--bg)',
              color: settings[key] ? 'var(--text)' : 'var(--muted)',
              font: '500 13.5px Oswald, ui-sans-serif, sans-serif',
            }}
          >
            <span>{t(label)}</span>
            {/* L'état se lit sur la pastille, pas sur un mot : trois lignes qui
                diraient « activé / désactivé » se relisent une par une. */}
            <span
              style={{
                width: 30, height: 17, borderRadius: 999, padding: 2,
                background: settings[key] ? 'var(--ember)' : 'var(--line)',
                display: 'flex', justifyContent: settings[key] ? 'flex-end' : 'flex-start',
              }}
            >
              <span style={{ width: 13, height: 13, borderRadius: '50%', background: 'var(--ink)' }} />
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Étape 4 : brancher le panneau dans `src/ui/App.tsx`**

Remplacer le bouton provisoire de la tâche 4 :

```tsx
const [soundOpen, setSoundOpen] = useState(false);
const [sound, setSound] = useState(() => audio.settings());
const soundOn = sound.music || sound.sfx;
```

```tsx
<button
  onClick={() => setSoundOpen((open) => !open)}
  aria-label={t('audio.settings')}
  style={{ /* inchangé */ }}
>
  {soundOn ? '🔊' : '🔇'}
</button>
```

et, avant la fermeture du conteneur :

```tsx
{soundOpen ? (
  <AudioSettings
    settings={sound}
    onChanged={() => setSound(audio.settings())}
    onClose={() => setSoundOpen(false)}
  />
) : null}
```

- [ ] **Étape 5 : vérifier la compilation et les tests**

Lancer : `npm run build && npm run test`
Attendu : build sans erreur (les clés `header.mute`/`header.unmute` ne sont plus
référencées nulle part), tous les tests passent — dont `src/i18n/i18n.test.ts` et
`src/i18n/catalog.test.ts`.

- [ ] **Étape 6 : vérifier dans le navigateur**

Ouvrir `/spinforge/` : le bouton 🔊 ouvre le panneau, chaque interrupteur bascule,
l'icône passe à 🔇 quand musique **et** bruitages sont éteints. Recharger la page :
les réglages sont retenus. Basculer la langue : les trois libellés suivent.

- [ ] **Étape 7 : commit**

```bash
git add src/ui/AudioSettings.tsx src/ui/App.tsx src/i18n/fr.ts src/i18n/en.ts
git status --short
git commit -m "feat(son): trois interrupteurs remplacent le bouton muet

Musique, bruitages et vibration se coupent séparément. L'état se lit sur une
pastille et non sur un mot : trois lignes « activé / désactivé » se reliraient
une par une.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Vague 2 — la musique

### Tâche 7 : le séquenceur et ses cinq couches

**Fichiers :**
- Créer : `src/audio/music.ts`
- Test : `src/audio/music.test.ts`
- Modifier : `src/dev/soundboard.tsx`

**Interfaces :**
- Consomme : `MIX`, `LAYERS` (t1) ; `Bus`, `tone`, `burst`, `comb` (t4) ;
  `SALLES_PER_CHAPTER` de `src/sim/config` (lecture seule — le son est un
  spectateur, comme le rendu).
- Produit : `PHRYGIAN`, `MOTIF`, `TENSION`, `intensityFor(combat, salle, dead)`,
  `activeLayers(intensity)`, `noteHz(semitone, octave)`,
  `createMusic(): Music` avec `attach(bus)`, `setIntensity(v)`, `duck()`,
  `suspend()`, `resume()`.

- [ ] **Étape 1 : écrire le test qui échoue** — `src/audio/music.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { MIX } from './mix';
import { SALLES_PER_CHAPTER } from '../sim/config';
import { MOTIF, PHRYGIAN, TENSION, activeLayers, intensityFor, noteHz } from './music';

describe("l'intensité de la musique", () => {
  it('se tait quand le joueur est mort', () => {
    expect(intensityFor(true, 3, true)).toBe(0);
  });

  it('reste basse hors combat', () => {
    expect(intensityFor(false, 3, false)).toBe(MIX.intensityMenus);
  });

  it('monte en combat', () => {
    expect(intensityFor(true, 3, false)).toBe(MIX.intensityCombat);
  });

  it('atteint son maximum dans la salle du boss', () => {
    expect(intensityFor(true, SALLES_PER_CHAPTER, false)).toBe(MIX.intensityBoss);
  });
});

describe('les couches actives', () => {
  it("n'en allume aucune à intensité nulle", () => {
    expect(activeLayers(0)).toEqual([]);
  });

  it('empile les couches à mesure que ça monte', () => {
    expect(activeLayers(MIX.intensityMenus)).toEqual(['drone', 'pulse']);
    expect(activeLayers(MIX.intensityCombat)).toEqual(['drone', 'pulse', 'anvil', 'motif']);
    expect(activeLayers(MIX.intensityBoss)).toEqual(['drone', 'pulse', 'anvil', 'motif', 'tension']);
  });
});

describe('le matériau musical', () => {
  it('ne joue que des degrés de ré phrygien', () => {
    // Un mi ou un si NATURELS (4 et 11 demi-tons) sonneraient faux contre la
    // fondamentale : le mode porte un mi bémol et un si bémol.
    for (const semitone of [...MOTIF, TENSION]) expect(PHRYGIAN).toContain(semitone);
  });

  it('place la fondamentale à ré4 trois octaves au-dessus de la racine', () => {
    expect(noteHz(0, 3)).toBeCloseTo(293.68, 1);
  });

  it('monte bien de la quinte pour le la du motif', () => {
    expect(noteHz(7, 3)).toBeCloseTo(440.03, 1);
  });
});
```

- [ ] **Étape 2 : lancer le test et vérifier qu'il échoue**

Lancer : `npx vitest run src/audio/music.test.ts`
Attendu : ÉCHEC — `Failed to resolve import "./music"`.

- [ ] **Étape 3 : écrire `src/audio/music.ts`**

```ts
import { SALLES_PER_CHAPTER } from '../sim/config';
import { LAYERS, MIX } from './mix';
import { burst, comb, noiseBuffer, tone, type Bus } from './synth';

/** Ré phrygien, en demi-tons depuis la fondamentale. Le mode le plus sombre qui
 *  reste chantable — et son demi-ton ré → mi♭ EST la tension du boss. */
export const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10] as const;
/** Le motif : ré, la, si♭, fa. */
export const MOTIF = [0, 7, 8, 3] as const;
/** La nappe de tension : le mi♭ tenu contre le bourdon en ré. */
export const TENSION = 1;

export type LayerName = keyof typeof LAYERS;

/** Hauteur d'un degré du mode, à l'octave demandée au-dessus de la racine. */
export function noteHz(semitone: number, octave: number): number {
  return MIX.rootHz * Math.pow(2, octave + semitone / 12);
}

/** L'intensité est une fonction pure du contexte : c'est ce qui permet de la
 *  tester, et ce qui garantit que deux écrans ne se disputent pas la musique. */
export function intensityFor(combat: boolean, salle: number, dead: boolean): number {
  if (dead) return 0;
  if (!combat) return MIX.intensityMenus;
  return salle >= SALLES_PER_CHAPTER ? MIX.intensityBoss : MIX.intensityCombat;
}

export function activeLayers(intensity: number): LayerName[] {
  if (intensity <= 0) return [];
  return (Object.keys(LAYERS) as LayerName[]).filter((name) => intensity >= LAYERS[name]);
}

export interface Music {
  attach(bus: Bus): void;
  setIntensity(value: number): void;
  /** Baisse la musique le temps d'un choc fort. */
  duck(): void;
  suspend(): void;
  resume(): void;
}

const STEP_S = 60 / MIX.bpm / 4; // une double-croche
const TOTAL_STEPS = MIX.bars * MIX.stepsPerBar;

export function createMusic(): Music {
  let bus: Bus | null = null;
  /** Nœud propre au ducking : le gain de la musique côté `Bus` appartient au
   *  réglage « Musique », les deux ne doivent pas se marcher dessus. */
  let duckNode: GainNode | null = null;
  let droneGain: GainNode | null = null;
  let tensionGain: GainNode | null = null;
  let anvilIn: AudioNode | null = null;
  let timer: number | null = null;
  let intensity = 0;
  let step = 0;
  let nextAt = 0;

  function scheduleStep(b: Bus, index: number, at: number): void {
    const layers = activeLayers(intensity);
    const inBar = index % MIX.stepsPerBar;
    const bar = Math.floor(index / MIX.stepsPerBar);

    // Le pouls en demi-temps : deux frappes par mesure. À 92 BPM, une frappe par
    // temps ferait une marche ; c'est une forge, pas une parade.
    if (layers.includes('pulse') && inBar % 8 === 0) {
      tone(b, duckNode!, { from: 110, to: 44, duration: 0.09, gain: 0.16, at, attack: 0.003 });
    }
    // L'enclume, sur les contretemps : c'est elle qui donne le lieu.
    if (layers.includes('anvil') && (inBar === 6 || inBar === 11)) {
      burst(b, anvilIn!, { freq: 1400, q: 1.2, gain: 0.05, duration: 0.05, at });
    }
    // Le motif n'entre qu'une mesure sur deux : entendu huit fois d'affilée, il
    // devient une sonnerie.
    if (layers.includes('motif') && bar % 4 >= 2) {
      const slot = [0, 3, 6, 10].indexOf(inBar);
      if (slot >= 0) {
        tone(b, duckNode!, {
          from: noteHz(MOTIF[slot], 3), duration: 0.28, gain: 0.05, at, type: 'triangle',
        });
      }
    }
  }

  /**
   * Planification à l'avance : à chaque réveil du minuteur, on programme tout ce
   * qui tombe dans les 100 ms suivantes, sur l'horloge audio. Un `setTimeout` par
   * note serait à la merci du moindre à-coup du fil principal — et l'arène en
   * produit.
   */
  function pump(): void {
    const b = bus;
    if (!b) return;
    while (nextAt < b.ctx.currentTime + MIX.lookaheadS) {
      scheduleStep(b, step, nextAt);
      step = (step + 1) % TOTAL_STEPS;
      nextAt += STEP_S;
    }
  }

  function runTimer(on: boolean): void {
    if (on && timer === null && bus) {
      nextAt = Math.max(nextAt, bus.ctx.currentTime);
      timer = window.setInterval(pump, MIX.timerMs);
    }
    if (!on && timer !== null) {
      window.clearInterval(timer);
      timer = null;
    }
  }

  return {
    attach(next) {
      bus = next;
      const { ctx } = next;
      duckNode = ctx.createGain();
      duckNode.connect(next.music);

      // Le bourdon : un sinus à la fondamentale doublé d'un souffle très grave.
      droneGain = ctx.createGain();
      droneGain.gain.value = 0;
      droneGain.connect(duckNode);
      const droneOsc = ctx.createOscillator();
      droneOsc.frequency.value = MIX.rootHz * 2;
      droneOsc.connect(droneGain);
      droneOsc.start();
      const droneNoise = ctx.createBufferSource();
      droneNoise.buffer = noiseBuffer(ctx, 3);
      droneNoise.loop = true;
      const droneFilter = ctx.createBiquadFilter();
      droneFilter.type = 'lowpass';
      droneFilter.frequency.value = 180;
      const droneNoiseGain = ctx.createGain();
      droneNoiseGain.gain.value = 0.35;
      droneNoise.connect(droneFilter).connect(droneNoiseGain).connect(droneGain);
      droneNoise.start();

      // La nappe de tension, muette jusqu'au boss.
      tensionGain = ctx.createGain();
      tensionGain.gain.value = 0;
      tensionGain.connect(duckNode);
      const tensionOsc = ctx.createOscillator();
      tensionOsc.type = 'sawtooth';
      tensionOsc.frequency.value = noteHz(TENSION, 2);
      const tensionFilter = ctx.createBiquadFilter();
      tensionFilter.type = 'lowpass';
      tensionFilter.frequency.value = 700;
      tensionOsc.connect(tensionFilter).connect(tensionGain);
      tensionOsc.start();

      // Un seul filtre en peigne pour toutes les frappes d'enclume : en recréer un
      // par note laisserait autant de boucles de délai vivantes derrière soi.
      anvilIn = comb(next, duckNode, noteHz(0, 5), 0.72);
    },

    setIntensity(value) {
      const target = Math.max(0, Math.min(1, value));
      if (target === intensity) return;
      intensity = target;
      if (!bus || !droneGain || !tensionGain) return;
      const t = bus.ctx.currentTime;
      const fade = target === 0 ? MIX.deathFadeS : MIX.layerFadeS;
      droneGain.gain.setTargetAtTime(target > 0 ? 0.09 * (0.5 + target / 2) : 0, t, fade);
      tensionGain.gain.setTargetAtTime(target >= LAYERS.tension ? 0.03 : 0, t, fade);
      runTimer(target > 0);
    },

    duck() {
      if (!bus || !duckNode) return;
      const t = bus.ctx.currentTime;
      duckNode.gain.cancelScheduledValues(t);
      duckNode.gain.setValueAtTime(MIX.duckMusic, t);
      duckNode.gain.setTargetAtTime(1, t + MIX.duckHoldS, MIX.duckReleaseS);
    },

    suspend() {
      runTimer(false);
    },

    resume() {
      runTimer(intensity > 0);
    },
  };
}
```

- [ ] **Étape 4 : lancer le test et vérifier qu'il passe**

Lancer : `npx vitest run src/audio/music.test.ts`
Attendu : 9 tests PASSENT.

- [ ] **Étape 5 : valider les tests par mutation**

| Mutation dans `music.ts` | Test qui doit rougir |
|---|---|
| remplacer `8` par `9` dans `MOTIF` (si naturel) | « ne joue que des degrés de ré phrygien » |
| retirer le `if (dead) return 0` | « se tait quand le joueur est mort » |
| remplacer `salle >= SALLES_PER_CHAPTER` par `false` | « atteint son maximum dans la salle du boss » |
| retirer le `if (intensity <= 0) return []` | « n'en allume aucune à intensité nulle » |
| remplacer `2` par `3` dans l'exposant de `noteHz` | « place la fondamentale à ré4 » |

Le curseur d'intensité du banc d'essai appartient à la **tâche 8** : il appelle
`audio.setIntensity`, que la façade ne gagne qu'à ce moment-là. Cette tâche-ci ne
touche donc pas `src/dev/soundboard.tsx`.

- [ ] **Étape 6 : commit**

```bash
git add src/audio/music.ts src/audio/music.test.ts
git status --short
git commit -m "feat(son): une boucle de forge en ré phrygien, dont la densité suit le jeu

Cinq couches — bourdon, pouls en demi-temps, enclume sur les contretemps, motif
de quatre notes, nappe de tension — qui entrent chacune à un seuil d'intensité.
Le tempo ne bouge jamais : une bascule de tempo entre le combat et la Forge
s'entendrait comme un raté de lecture.

La planification se fait 100 ms à l'avance sur l'horloge audio et non par
\`setTimeout\` : un minuteur par note serait à la merci du moindre à-coup du fil
principal, et l'arène en produit.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Tâche 8 : la musique entre en jeu

**Fichiers :**
- Modifier : `src/audio/audio.ts`, `src/ui/App.tsx`

**Interfaces :**
- Consomme : `createMusic`, `intensityFor` (t7).
- Produit : sur le singleton — `setIntensity(value: number)`.

- [ ] **Étape 1 : brancher le séquenceur dans la façade**

Dans `src/audio/audio.ts` :

```ts
import { createMusic } from './music';
```

Déclarer `const music = createMusic();` à côté de `const gate = createGate();`,
ajouter `setIntensity(value: number): void;` à l'interface `Audio`, puis :

- dans `start()`, après la création du bus : `music.attach(bus);`
- dans l'objet retourné :

```ts
    setIntensity(value) {
      music.setIntensity(value);
    },
```

- dans `duck(power)`, ajouter la musique au même geste :

```ts
  function duck(power: number): void {
    if (power < MIX.duckPower) return;
    music.duck();
    if (!bus || !whirrGain) return;
    // … (le reste inchangé)
  }
```

- [ ] **Étape 2 : suspendre le son quand l'onglet est caché**

Toujours dans `audio.ts`, à la fin de `start()` :

```ts
      // Sans ça, la musique continue dans un onglet en arrière-plan — et le
      // séquenceur continue de tourner pour rien.
      document.addEventListener('visibilitychange', onVisibility);
```

avec, à côté de `duck` :

```ts
  function onVisibility(): void {
    if (!bus) return;
    if (document.hidden) {
      music.suspend();
      void bus.ctx.suspend();
    } else {
      void bus.ctx.resume();
      music.resume();
    }
  }
```

et dans `destroy()` : `document.removeEventListener('visibilitychange', onVisibility);`

- [ ] **Étape 3 : piloter l'intensité depuis `src/ui/App.tsx`**

```tsx
import { intensityFor } from '../audio/music';
```

```tsx
  // App se re-rend à chaque tick : l'effet ne se déclenche donc que quand l'un des
  // trois vrais paramètres change, et `setIntensity` ignore une valeur identique.
  const run = runRef.current;
  useEffect(() => {
    audio.setIntensity(intensityFor(tab === 'combat', run.salle, run.phase === 'dead'));
  }, [tab, run.salle, run.phase]);
```

- [ ] **Étape 4 : ajouter le curseur d'intensité au banc d'essai**

Dans `src/dev/soundboard.tsx` :

```tsx
  const [intensity, setIntensity] = useState(0.7);
  // …
      <label style={{ display: 'grid', gap: 4 }}>
        Intensité musicale : {intensity.toFixed(2)}
        <input type="range" min={0} max={1} step={0.01} value={intensity}
               onChange={(e) => {
                 const v = Number(e.target.value);
                 setIntensity(v);
                 audio.start();
                 audio.setIntensity(v);
               }} />
      </label>
```

- [ ] **Étape 5 : vérifier la compilation et les tests**

Lancer : `npm run build && npm run test`
Attendu : aucune erreur, tous les tests passent.

- [ ] **Étape 6 : écouter en jeu**

Ouvrir `/spinforge/` et vérifier soi-même :

1. **La musique démarre au premier geste**, pas avant (politique d'autoplay).
2. **Passer en Forge allège la musique** ; revenir en combat la rétablit — sans
   changement de tempo perceptible.
3. **Entrer en salle 10 ajoute la nappe de tension** (le demi-ton).
4. **Mourir fait descendre la musique** au lieu de la couper net.
5. **Un choc fort creuse un trou dans la musique** puis elle revient.
6. **Changer d'onglet du navigateur coupe tout**, et le retour reprend.
7. **L'interrupteur Musique coupe la musique en laissant les chocs.**

- [ ] **Étape 7 : commit**

```bash
git add src/audio/audio.ts src/ui/App.tsx src/dev/soundboard.tsx
git status --short
git commit -m "feat(son): la musique prend le fond sonore, et s'efface sous les chocs

L'intensité suit le contexte par une fonction pure — 0,35 hors combat, 0,70 en
salle, 1,0 chez le boss, 0 à la mort — et chaque couche entre par un fondu de
0,35 s. Un choc au-dessus de 0,45 creuse la musique de 45 % pendant 150 ms :
c'est ce qui donne du punch au choc sans monter le volume.

L'onglet caché suspend le contexte ET le séquenceur : sans ça la musique
continue en arrière-plan et le minuteur tourne pour rien.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

## Vague 3 — l'UI

### Tâche 9 : les boutons, par un seul écouteur

**Fichiers :**
- Modifier : `src/ui/App.tsx`, `src/ui/CombatScreen.tsx`, `src/ui/ChestScreen.tsx`,
  `src/ui/InventoryPanel.tsx`, `src/ui/ForgeScreen.tsx`

**Interfaces :**
- Consomme : `audio.tap(kind)` (t5), `audio.start()` (t4).
- Produit : rien de nouveau ; l'attribut `data-sfx` devient le contrat entre l'UI
  et le son.

- [ ] **Étape 1 : poser l'écouteur délégué sur la racine de `App`**

Dans `src/ui/App.tsx`, sur le `<div>` racine :

```tsx
      onPointerDownCapture={(e) => {
        // Le contexte audio ne peut naître qu'au premier geste, et il doit naître
        // ICI : porté par `CombatScreen`, il laissait sans aucun son un joueur qui
        // démarre l'application sur l'onglet Coffres.
        audio.start();
        // Un seul écouteur plutôt que seize `onClick` : les boutons `disabled`
        // n'émettent aucun événement de pointeur, ils se taisent tout seuls, et
        // le prochain bouton ajouté sonnera sans qu'on y pense.
        const button = (e.target as HTMLElement).closest('button');
        if (!button) return;
        const kind = button.dataset.sfx;
        audio.tap(kind === 'chest' || kind === 'fuse' || kind === 'upgrade' ? kind : 'tap');
      }}
```

- [ ] **Étape 2 : retirer l'amorçage devenu redondant dans `CombatScreen`**

Dans `src/ui/CombatScreen.tsx`, `onDown` commence par `audio.start();` avec un
commentaire sur les boutons. Supprimer les deux : la capture sur la racine passe
avant, systématiquement. Le garde `closest('button')` du pilotage, lui, **reste** —
il empêche un appui sur un bouton de piloter la toupie, ce qui n'a rien à voir.

- [ ] **Étape 3 : marquer les boutons qui engagent une dépense**

| Fichier | Bouton | Attribut |
|---|---|---|
| `src/ui/ChestScreen.tsx` | les coffres du butin (`aria-label={t('chest.openOne'…)}`) | `data-sfx="chest"` |
| `src/ui/ChestScreen.tsx` | les deux boutons « Ouvrir ×1 / ×10 » | `data-sfx="chest"` |
| `src/ui/InventoryPanel.tsx` | le bouton `onClick={onFuse}` | `data-sfx="fuse"` |
| `src/ui/ForgeScreen.tsx` | le bouton d'amélioration d'emplacement | `data-sfx="upgrade"` |

- [ ] **Étape 4 : vérifier la compilation et les tests**

Lancer : `npm run build && npm run test`
Attendu : aucune erreur, tous les tests passent.

- [ ] **Étape 5 : vérifier dans le navigateur**

1. **Recharger sur l'onglet Coffres** (le sélectionner, puis F5) et appuyer sur un
   bouton : il y a du son dès le premier appui. C'est la régression que corrige
   l'étape 1 — la vérifier explicitement.
2. Les quatre onglets, le sélecteur de langue, le bouton 🔊 : tous cliquent.
3. Un bouton **grisé** (« Ouvrir ×10 » sans les crédits) ne produit aucun son.
4. Deux appuis de suite ne sonnent pas exactement pareil.
5. Glisser depuis un bouton ne pilote toujours pas la toupie.

- [ ] **Étape 6 : commit**

```bash
git add src/ui/App.tsx src/ui/CombatScreen.tsx src/ui/ChestScreen.tsx src/ui/InventoryPanel.tsx src/ui/ForgeScreen.tsx
git status --short
git commit -m "feat(son): les seize boutons sonnent, par un seul écouteur délégué

Un \`pointerdown\` en capture sur la racine plutôt que seize \`onClick\` : les
boutons désactivés n'émettent aucun événement de pointeur donc se taisent seuls,
et le prochain bouton ajouté sonnera sans qu'on y pense. Un \`data-sfx\` distingue
l'appui qui dépense de l'appui qui navigue.

Au passage, une vraie régression tombe : \`audio.start()\` vivait dans
\`CombatScreen\`, si bien qu'un joueur démarrant sur l'onglet Coffres n'avait
aucun son tant qu'il n'avait pas touché l'arène.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Tâche 10 : l'ouverture d'un coffre, de la secousse au butin rangé

**Fichiers :**
- Modifier : `src/ui/ChestScreen.tsx`

**Interfaces :**
- Consomme : `audio.chestShake/chestStep/chestOpened/pieceRevealed/chestDone` (t5),
  `rankTier` de `src/theme`, `REVEAL` de `src/render/feel`.

Le son se greffe sur l'effet qui **fait déjà** la secousse d'écran : il suit
exactement les mêmes transitions, donc l'image et le son ne peuvent pas diverger.

- [ ] **Étape 1 : sonoriser l'effet de ressenti**

Remplacer le second `useEffect` de `ChestScreen` (celui qui appelle `quake`) par :

```tsx
  // Ce que l'ouverture fait sentir : l'écran tremble, et le son suit exactement
  // les mêmes transitions — un seul effet, donc aucune dérive possible entre ce
  // qu'on voit et ce qu'on entend.
  useEffect(() => {
    if (!opening) return;
    if (phase === 'shake') {
      audio.chestShake();
      return;
    }
    if (phase === 'opening') {
      audio.chestStep(step);
      if (step === 0) quake(CHEST_QUAKE[opening.kind], CHEST_QUAKE_LIFE);
      return;
    }
    if (revealed === 0) {
      // Le couvercle a fini de céder : c'est ici que la main doit le sentir.
      audio.chestOpened();
      return;
    }
    const piece = opening.pulls[revealed - 1];
    const feel = REVEAL[rankTier(piece.rank)];
    audio.pieceRevealed(rankTier(piece.rank));
    if (feel.shake > 0) quake(feel.shake, feel.life);
    if (revealed >= opening.pulls.length) {
      audio.chestDone(rankTier(opening.pulls[opening.pulls.length - 1].rank));
    }
  }, [opening, phase, step, revealed]);
```

Ajouter `import { audio } from '../audio/audio';` en tête de fichier.

- [ ] **Étape 2 : vérifier la compilation et les tests**

Lancer : `npm run build && npm run test`
Attendu : aucune erreur, tous les tests passent.

- [ ] **Étape 3 : vérifier dans le navigateur**

Ouvrir `/spinforge/`, aller sur Coffres, ouvrir un Bronze ×1 puis un ×10 :

1. Le grondement accompagne la secousse, **pas après**.
2. Les trois poses du couvercle font trois craquements montants.
3. Le couvercle qui cède sonne **une** fois.
4. Sur un ×10, les « ting » montent avec la rareté et le meilleur tirage finit la
   séquence.
5. L'accord de fin arrive quand la dernière pièce est posée, pas avant.

- [ ] **Étape 4 : commit**

```bash
git add src/ui/ChestScreen.tsx
git status --short
git commit -m "feat(son): le coffre gronde, craque, cède, puis range son butin

Le son se greffe sur l'effet qui fait déjà la secousse d'écran : il suit
exactement les mêmes transitions de phase, donc l'image et le son ne peuvent pas
diverger. La hauteur de chaque « ting » suit le palier de rareté, comme le
barème de révélation livré avec l'ouverture groupée.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Tâche 11 : la fusion, l'amélioration, l'équipement

**Fichiers :**
- Modifier : `src/ui/InventoryPanel.tsx`, `src/ui/ForgeScreen.tsx`

**Interfaces :**
- Consomme : `audio.fuse()`, `audio.upgrade()`, `audio.equip()` (t5).

Le son de **réussite** n'est jamais joué à l'appui : `act()` et le `onClick`
d'amélioration connaissent déjà le booléen de réussite, c'est là qu'il se branche.
Une fusion refusée faute de doublons ne doit pas sonner comme une fusion réussie.

- [ ] **Étape 1 : sonoriser `act()` dans `src/ui/InventoryPanel.tsx`**

```tsx
  const act = (
    fn: (m: MetaState, model: string, rank: number) => boolean,
    sound: () => void,
  ) => {
    if (!selected) return;
    if (fn(metaRef.current, selected.model, selected.rank)) {
      // Après le succès seulement : une fusion refusée faute de doublons ne doit
      // pas sonner comme une fusion réussie.
      sound();
      setSelected(null);
      onChanged();
    }
  };
```

et aux deux appels :

```tsx
          onEquip={() => act(equipFromStack, () => audio.equip())}
          onFuse={() => act(tryFuse, () => audio.fuse())}
```

Ajouter `import { audio } from '../audio/audio';`.

- [ ] **Étape 2 : sonoriser l'amélioration dans `src/ui/ForgeScreen.tsx`**

```tsx
              onClick={() => {
                if (tryUpgrade(metaRef.current, row.key)) {
                  audio.upgrade();
                  syncRunStats(runRef.current, metaRef.current);
                  onChanged();
                }
              }}
```

Ajouter `import { audio } from '../audio/audio';`.

- [ ] **Étape 3 : vérifier la compilation et les tests**

Lancer : `npm run build && npm run test`
Attendu : aucune erreur, tous les tests passent.

- [ ] **Étape 4 : vérifier dans le navigateur**

1. Améliorer une pièce en Forge : coup d'enclume court, et **rien** quand les
   crédits manquent (le bouton est grisé).
2. Fusionner une pile complète : la montée puis l'enclume.
3. Ouvrir une pile **incomplète** et appuyer sur Fusionner : le clic du bouton se
   fait entendre, mais **pas** le son de fusion.
4. Équiper une pièce : le claquement mécanique.

- [ ] **Étape 5 : commit**

```bash
git add src/ui/InventoryPanel.tsx src/ui/ForgeScreen.tsx
git status --short
git commit -m "feat(son): la fusion, l'amélioration et l'équipement sonnent au résultat

Branchés sur le booléen de réussite que \`act()\` et le bouton d'amélioration
connaissent déjà, jamais sur l'appui : une fusion refusée faute de doublons ne
doit pas sonner comme une fusion réussie.

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

---

### Tâche 12 : relecture de branche, et le verdict sur téléphone

Cette tâche n'ajoute aucune fonctionnalité. Elle existe parce que, au jalon 2b, six
des neuf constats de fin de parcours ne se voyaient qu'à l'échelle de la branche
entière — pas tâche par tâche.

**Fichiers :**
- Modifier : `docs/ameliorations.md`

- [ ] **Étape 1 : relire la branche entière**

```bash
git log --oneline main..HEAD
git diff main...HEAD --stat
git diff main...HEAD
```

Chercher spécifiquement, parce que ce sont les défauts que ce plan peut produire :

1. **Un chiffre de son en dur hors de `mix.ts`.**
   `grep -rnE '[0-9]{2,}' src/audio/*.ts | grep -v mix.ts` — chaque occurrence doit
   être une hauteur musicale nommée dans un commentaire, ou remonter dans `MIX`.
2. **Du code mort laissé par la couture des tâches 4 et 6** : l'état `muted`, les
   clés `header.mute`/`header.unmute`, la prop `audio` de `CombatScreen`,
   `audioRef`, l'ancien `createAudio` exporté.
3. **Un `setTimeout` de justesse musicale** qui aurait échappé au séquenceur.
4. **Un import de `src/audio/` depuis `src/sim/`** — interdit :
   `grep -rn "audio" src/sim/` doit ne rien rendre.

- [ ] **Étape 2 : rejouer la suite complète et le build**

```bash
npm run test && npm run build
```
Attendu : tous les tests passent (374 d'origine + 28 nouveaux : 5 + 6 + 8 + 9), build propre.

- [ ] **Étape 3 : la vérification qui ne peut pas être déléguée — le téléphone**

```bash
npm run dev -- --host
```

Lire l'adresse « Network: » et l'ouvrir sur l'Android. **Demander au user de
tester**, puisque c'est le seul verdict possible sur la vibration :

1. Au banc (`/spinforge/soundboard.html`) : chaque motif se distingue-t-il des
   autres ? Le coffre terminé se sent-il comme une conclusion ?
2. En jeu : un choc fort se sent, une mêlée ne fait pas buzzer le téléphone en
   continu, la fin d'ouverture d'un coffre se sent nettement.
3. L'interrupteur Vibration coupe bien tout.

Consigner la réponse, y compris si elle est négative — les seuils réglables sont
`hapticHitThreshold`, `hapticBudgetMs` et `hapticMinGapMs`.

- [ ] **Étape 4 : consigner le résultat dans `docs/ameliorations.md`**

Ajouter une section `### ✅ Le son, deuxième passe` sous une nouvelle
`## Session du 2026-09-01`, sur le modèle des sections existantes : la remarque
citée, ce qui a été fait, **ce qui a été mesuré**, et ce qui reste à valider à
l'oreille avec les trois boutons de réglage correspondants.

- [ ] **Étape 5 : commit**

```bash
git add docs/ameliorations.md
git status --short
git commit -m "docs(son): consigne la deuxième passe sur le son et son verdict

Co-Authored-By: Claude Opus 5 (1M context) <noreply@anthropic.com>"
```

- [ ] **Étape 6 : le point git avant toute fusion**

Le dépôt est travaillé par plusieurs sessions en parallèle ; `main` a déjà bougé
deux fois pendant la conception de ce chantier.

```bash
git -C /Users/nicolasrabault/Projects/B-Blades_versus rev-parse --abbrev-ref HEAD
git -C /Users/nicolasrabault/Projects/B-Blades_versus status --short
git merge-base --is-ancestor feat/son-et-haptique main && echo "DÉJÀ CONTENUE"
```

Si la branche est déjà contenue dans `main`, **ne pas fusionner** : vérifier à la
place que l'état réel de `main` est sain (tests, build), puisque personne n'a encore
validé *cette* combinaison-là. Sinon, demander au user avant de fusionner.

---

## Auto-relecture du plan

**Couverture de la spec** — chaque section a sa tâche :

| Section de la spec | Tâche(s) |
|---|---|
| § 1 architecture, six fichiers | 1, 2, 3, 4, 7 |
| § 2 la musique, cinq couches, `intensityFor` | 7, 8 |
| § 3 le choc à trois composantes, le rotor, le catalogue | 4, 5 |
| § 4 garde par priorité, ducking | 1, 4, 8 |
| § 5 la vibration et ses garde-fous | 3, puis les appels en 4, 5, 10, 11 |
| § 6 les boutons, l'écouteur délégué, la naissance du contexte | 9 |
| § 7 les trois interrupteurs, migration, i18n | 2, 6 |
| § 8 le banc d'essai | 4, 5, 7 |
| § 9 les tests et leurs mutations | 1, 2, 3, 7 — chaque tâche nomme ses mutations |
| § 10 les trois vagues | découpage 1-6 / 7-8 / 9-12 |
| § 11 risques (coffres partagés, autoplay, onglet caché, iOS, batterie) | 8 (visibilité), 9 (autoplay), 12 (git) |
| § 12 hors périmètre | contraintes globales |

**Aucun point de couture** : le balayage de pré-vol en avait trouvé un — le curseur
d'intensité du banc dépendait d'une méthode livrée par la tâche suivante. Le curseur
a été déplacé dans la tâche 8, avec la méthode dont il dépend.
