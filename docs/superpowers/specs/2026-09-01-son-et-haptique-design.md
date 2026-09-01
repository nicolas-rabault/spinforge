# Son et haptique — « le choc est le sujet »

Spec de conception. Date : 2026-09-01. Branche : `feat/son-et-haptique`.

## Le problème

Retour de test du 2026-09-01 : *« les sons de la toupie sont très prenants et
désagréables ; appuie plutôt sur les chocs entre toupies »*, plus trois manques
nommés — pas de musique, pas de son de bouton, pas de vibration.

La session du 2026-08-26 (`docs/ameliorations.md` § 3) avait traité les **défauts
mesurables** du son : le bourdon de scie sauteuse, la mitraille d'impacts, les clics
de discontinuité, la saturation. Elle se terminait sur « à valider à l'oreille », et
c'est ce verdict-là qui tombe aujourd'hui. Ce qui reste n'est plus un défaut, c'est
un **rapport de forces** :

| Ce qu'on entend | Durée sur un run de 60 s | Ce que ça devrait être |
|---|---|---|
| Rotor (souffle continu, `whirrGain` 0,055 + sub 0,05) | ~60 s, sans interruption | une texture qu'on oublie |
| Chocs (`hit`) | ~2,2/s × 80 ms ≈ 2,6 s | **le sujet** |
| Mort, porte de salle | ~4 événements | des ponctuations |
| Musique | — | le fond sonore |
| Boutons (16 boutons, 7 fichiers) | — | un retour à chaque appui |
| Vibration | — | le poids des chocs et des gains |

Le son continu occupe 95 % du temps et porte 0 % de l'information intéressante. La
correction n'est pas « baisser le rotor » : c'est **donner le fond sonore à la
musique**, pour que l'arène ne parle plus que lorsqu'il se passe quelque chose.

## Principe directeur

**Un son = un événement.** Le seul son tenu est la musique. Tout le reste est une
ponctuation, et chaque ponctuation a un jumeau haptique quand elle représente un
choc ou un gain.

Corollaire opérationnel : quand deux sons se disputent l'attention, c'est le plus
informatif qui gagne — la musique et le rotor s'effacent sous un choc fort
(*ducking*), jamais l'inverse.

## § 1. Architecture — cinq fichiers, une façade

`src/audio/audio.ts` fait aujourd'hui 205 lignes et mélange le barème, les
primitives WebAudio et les événements de jeu. Ajouter un séquenceur musical et une
couche haptique dedans le porterait au-delà de 600. On l'éclate comme `src/render/`
sépare `feel.ts` (le barème) de `arena.ts` (le rendu) :

```
src/audio/
  mix.ts        — LE BARÈME : tous les chiffres du son, des motifs, des seuils. Pur.
  synth.ts      — primitives WebAudio : bus, limiteur, enveloppes, bruit, corps métallique
  music.ts      — le séquenceur : planifie les pas à l'avance sur l'horloge audio
  haptics.ts    — traduit un événement en motif de vibration, sous garde de débit. Pur.
  settings.ts   — les trois interrupteurs, leur persistance, leur migration. Pur.
  audio.ts      — la façade `Audio` consommée par l'UI, en verbes de jeu
```

**La règle de `feel.ts` s'applique telle quelle** : `mix.ts` ne contient aucun
chiffre d'équilibrage et ne touche jamais `src/sim/`. Inversement, aucun chiffre de
son n'a sa place ailleurs que dans `mix.ts`.

**Ce qui est pur est testé, ce qui touche WebAudio ne l'est pas.** `haptics.ts`,
`settings.ts`, la garde de débit et le choix des couches musicales sont des
fonctions pures : elles se testent sous Vitest en environnement `node`, sans DOM.
`synth.ts` et le corps de `music.ts` se jugent à l'oreille, au banc d'essai du § 8.

L'interface que l'UI consomme, en verbes de jeu et non en termes d'audio :

```ts
export type TapKind = 'tap' | 'chest' | 'fuse' | 'upgrade';

export interface Audio {
  start(): void;                              // premier geste : naissance du contexte
  setIntensity(value: number): void;          // 0…1, la densité de la musique
  hit(power: number): void;
  death(): void;
  door(): void;
  bossDown(): void;                           // `chapterValidated` de l'observateur
  reward(chests: number): void;
  chestShake(): void;
  chestStep(index: number): void;
  chestOpened(): void;                        // le couvercle a fini de céder
  pieceRevealed(tier: number): void;
  chestDone(bestTier: number): void;          // toutes les pièces sont rangées
  fuse(): void;
  upgrade(): void;
  equip(): void;
  tap(kind: TapKind): void;
  setSpin(ratio: number | null): void;
  settings(): AudioSettings;
  setSetting(key: keyof AudioSettings, on: boolean): void;
  destroy(): void;
}
```

## § 2. La musique — forge sombre, densité variable

Une boucle de **8 mesures** en **ré phrygien** (`ré, mi♭, fa, sol, la, si♭, do`) — le
mode le plus sombre qui reste chantable, et le demi-ton `ré → mi♭` est exactement la
tension qu'on veut pour le boss. **92 BPM constants** : on ne change jamais le tempo,
seulement la densité — une bascule de tempo entre le combat et la Forge s'entend
comme un raté de lecture.

| Couche | Recette | Apparaît à |
|---|---|---|
| **Bourdon** | sinus ré1 (36,7 Hz) + bruit passe-bas 180 Hz, tenus | toujours |
| **Pouls** | grosse caisse synthétique : sinus 110 → 44 Hz en 90 ms, temps forts | intensité ≥ 0,25 |
| **Enclume** | bruit dans un filtre en peigne accordé sur ré — la signature « forge » | ≥ 0,55 |
| **Motif** | 4 notes à l'arpège (ré4, la4, si♭4, fa4), double-croches pointées | ≥ 0,65 |
| **Tension** | nappe mi♭3 tenue contre le bourdon ré — le demi-ton phrygien | ≥ 0,90 |

L'intensité est une **fonction pure du contexte**, testable :

```
intensityFor(tab, salle, phase) :
  phase === 'dead'                  → 0      (fondu 0,6 s)
  tab !== 'combat'                  → 0,35   (bourdon + pouls)
  salle === SALLES_PER_CHAPTER      → 1,00   (les cinq couches)
  sinon                             → 0,70   (bourdon + pouls + enclume + motif)
```

Les transitions se font par `setTargetAtTime` sur le gain de chaque couche
(constante 0,35 s) : une couche n'apparaît jamais d'un coup.

**Planification.** Un minuteur de 25 ms planifie tout ce qui tombe dans les 100 ms à
venir, sur `ctx.currentTime` et jamais sur `setTimeout` — c'est la seule façon
d'avoir un rythme juste dans un onglet qui rame (technique standard *lookahead
scheduling*). Le minuteur est arrêté quand la musique est coupée et quand l'onglet
est caché.

**Bus séparé.** La musique a son propre `GainNode` avant le limiteur, ce qui permet
deux choses : la couper sans toucher aux bruitages, et la *ducker* (§ 4).

## § 3. Les bruitages — le choc reconstruit

### `hit(power)` — trois composantes

C'est le son du jeu. Aujourd'hui c'est un bruit passe-bande unique ; il claque mais
il n'a pas de corps, et deux chocs successifs se ressemblent trop.

| Composante | Recette | Rôle |
|---|---|---|
| **Transitoire** | bruit → passe-haut 3 200 Hz, 8 ms, gain 0,05 + 0,10·p | l'attaque, ce qui fait « maintenant » |
| **Corps** | 3 partiels inharmoniques `f`, 2,76·f, 5,40·f (ratios de plaque), `f = 520 − 180·p` Hz, décroissance 0,12 + 0,18·p s, gain 0,06 + 0,12·p | le métal — c'est lui qui manque |
| **Sub** | sinus 120 → 55 Hz en 0,12 s, gain 0,05·p, **seulement si p > 0,30** | le poids |

`f` **descend** quand la puissance monte : un gros choc est plus grave, comme dans la
vraie vie. Chaque coup est désaccordé de ±8 % au hasard — c'est ce qui empêche
l'effet mitraillette perçu, indépendamment du débit réel.

### Le rotor — conservé, mais rendu à sa place

`whirrGain` 0,055 → **0,018**, `subGain` 0,05 → **0,020**, et surtout : il est
**ducké à 35 % pendant 200 ms après chaque choc**. Un son tenu qui s'interrompt
cesse d'être un son tenu ; c'est ce qui le fait disparaître de la conscience sans le
supprimer de la scène.

### Le reste du catalogue

| Événement | Recette | Durée |
|---|---|---|
| `death()` | corps métallique grave + descente 190 → 55 Hz, rotor coupé | 0,55 s |
| `door()` | ré5 puis la5 (inchangé — ce sont déjà des degrés du mode, elles s'accordent avec la musique) | 0,27 s |
| `reward(chests)` | **les pièces dans la caisse** : 4 grains (+1 si un coffre est tombé), bruit passe-bande 1 800 → 3 200 Hz Q 6, 25 ms chacun, espacés de 45 ± 15 ms, hauteur montante — puis un fond de caisse, sinus 90 Hz, 90 ms | ~0,3 s |
| `chestShake()` | grondement : bruit passe-bas 220 Hz modulé en amplitude | 0,60 s (= `SHAKE_MS`) |
| `chestStep(i)` | craquement par pose : bruit passe-bande 700 Hz Q 2, 40 ms, hauteur montante avec `i` | 3 × 0,11 s |
| `chestOpened()` | éclat : bruit passe-haut + accord ré/la | 0,35 s |
| `pieceRevealed(tier)` | « ting » : sinus + partiel, hauteur par palier de rang — 622 / 784 / 932 / 1 175 Hz (mi♭5, sol5, si♭5, ré6, tous degrés de ré phrygien) | 0,18 s |
| `chestDone(bestTier)` | trois notes montantes, la dernière donnée par le meilleur palier tiré | 0,45 s |
| `bossDown()` | le chapitre tombe : coup d'enclume plein + accord ré/la/ré montant | 0,9 s |
| `fuse()` | balayage 300 → 2 000 Hz sur 0,35 s, puis coup d'enclume accordé sur ré | 0,7 s |
| `upgrade()` | coup d'enclume court | 0,2 s |
| `equip()` | claquement mécanique : deux transitoires à 40 ms d'intervalle | 0,1 s |
| `tap('tap')` | clic doux : bruit passe-bande 1 200 Hz Q 4, 25 ms, gain 0,03 — **deux variantes alternées** (×1 et ×1,12) pour tuer la répétition | 25 ms |
| `tap('chest' \| 'fuse' \| 'upgrade')` | même clic, plus un partiel grave : l'appui qui engage une dépense sonne plus lourd | 40 ms |

## § 4. Le débit — priorité, pas simple garde

La garde de 140 ms entre deux chocs est **conservée** : elle est mesurée (pic 20/s
sans elle, 5/s avec ; cf. `ameliorations.md` § 3.2) et elle doit rester supérieure au
tick de 100 ms pour filtrer quoi que ce soit.

Mais elle est aveugle : un effleurement à `p = 0,05` peut avaler le coup décisif
arrivé 50 ms plus tard. On la transforme en **priorité** — fonction pure, testée :

```
shouldPlayHit(state, now, power) :
  now − state.lastAt ≥ 0,140              → oui   (garde ordinaire)
  power ≥ state.lastPower + 0,25
    ET now − state.lastAt ≥ 0,040         → oui   (un choc nettement plus fort passe)
  sinon                                    → non
```

Le plancher de 40 ms empêche deux sons de se superposer sur la même image.

**Ducking.** Un choc de puissance ≥ 0,45 fait descendre le bus musique à 55 % et le
rotor à 35 % pendant 150 ms (retour en 0,25 s). C'est ce qui donne du punch sans
monter le volume — et c'est précisément l'inverse de ce que fait le son actuel, où
le rotor couvre le choc.

## § 5. La vibration

`navigator.vibrate` est supporté sur Android Chrome, absent sur Safari iOS. La cible
de test est Android ; sur iOS la couche est un **no-op silencieux**, jamais une
exception.

| Événement | Motif (ms) | Pourquoi |
|---|---|---|
| `tap` | `8` | le bouton a pris |
| `hit(p)` | `round(8 + 10·p)`, **rien sous p = 0,35** | le poids du choc, sans buzz continu |
| `reward` | `[12, 40, 12]` | deux petits coups : les pièces qui tombent |
| `chestOpened` | `[18]` | le couvercle cède |
| `chestDone` | `[30, 60, 18, 40, 45]` | le butin est rangé — la salve de fin d'animation |
| `fuse` | `[20, 50, 45]` | la fusion aboutit |
| `equip` | `[10]` | la pièce se clipse |
| `bossDown` | `[40, 40, 40, 40, 80]` | le chapitre tombe |
| `death` | `[40, 60, 90]` | la défaite |

**Deux garde-fous, purs et testés** — sans eux le moteur haptique d'Android sature et
écrase les motifs les uns sur les autres :

- **Intervalle minimum** : 60 ms entre deux appels ; un appel plus rapproché est
  ignoré (sauf `chestDone` et `bossDown`, qui priment).
- **Budget glissant** : au plus 220 ms vibrées par fenêtre d'une seconde. Au-delà,
  les motifs sont abandonnés jusqu'à ce que la fenêtre se libère.

L'émetteur (`(pattern) => navigator.vibrate(pattern)`) est **injecté** dans
`createHaptics()` : c'est ce qui rend la couche testable sous Vitest en `node`, et
ce qui fait de l'absence d'API un cas ordinaire plutôt qu'un `try/catch`.

## § 6. Les boutons — un seul écouteur, aucun `onClick` touché

16 boutons répartis sur 7 fichiers. Les câbler un par un ferait 16 modifications et
en oublierait au prochain bouton ajouté. À la place, **un écouteur `pointerdown` en
capture sur la racine de `App`** : s'il trouve un `closest('button')`, il joue le
clic et l'impulsion de 8 ms.

Trois propriétés qui rendent cette solution correcte et pas seulement courte :

1. Les boutons `disabled` **n'émettent aucun événement de pointeur** — ils se taisent
   sans qu'on ait à le coder.
2. Le type de clic est déclaratif : un `data-sfx="chest|fuse|upgrade"` sur les
   boutons qui engagent une dépense suffit à changer de son.
3. **Le contexte audio naît là.** Aujourd'hui c'est `CombatScreen.onDown` qui appelle
   `audio.start()` : un joueur qui démarre l'application sur l'onglet Coffres n'a
   *aucun son* tant qu'il n'a pas touché l'arène. L'écouteur de la racine voit tous
   les premiers gestes, boutons compris.

Le son de **réussite** (`fuse`, `upgrade`, `equip`, `chestDone`) n'est jamais joué à
l'appui : il est appelé dans le gestionnaire, au moment du résultat. Trois points
d'accroche suffisent — `act()` dans `InventoryPanel` (équiper et fusionner passent
tous les deux par lui et connaissent déjà le booléen de réussite), le `onClick`
d'amélioration de `ForgeScreen`, et les transitions de phase de `ChestScreen`.

Enfin, `visibilitychange` suspend le contexte quand l'onglet est caché : sans ça, la
musique continue en arrière-plan.

## § 7. Les réglages — trois interrupteurs

Le bouton 🔊 de l'en-tête ouvre un panneau de trois interrupteurs : **Musique /
Bruitages / Vibration**. C'est le réglage que cherchent les joueurs mobiles — couper
la musique en gardant les chocs est impossible aujourd'hui.

- **Persistance** : `spinforge.audio` = `{"music":true,"sfx":true,"haptics":true}`.
- **Migration** : `spinforge.muted === '1'` ⇒ les trois à faux, puis l'ancienne clé
  est retirée. Clé absente ou JSON corrompu ⇒ les trois à vrai, sans exception.
- **Icône** : 🔊 tant que musique **ou** bruitages est actif, 🔇 sinon.
- **i18n** — quatre clés nouvelles, `header.mute` et `header.unmute` disparaissent :

| Clé | fr | en |
|---|---|---|
| `audio.settings` | Réglages du son | Sound settings |
| `audio.music` | Musique | Music |
| `audio.sfx` | Bruitages | Sound effects |
| `audio.haptics` | Vibration | Vibration |

`en.ts` est un `Record<MessageKey, string>` : une clé oubliée casse le build, une clé
en trop aussi. C'est le filet.

## § 8. Le banc d'essai — `soundboard.html`

Jumeau de la planche de style, et pour la même raison : **le goût ne se teste pas
unitairement, il s'écoute**. Servi par `npm run dev` sur
`/spinforge/soundboard.html`, jamais construit par `vite build` (qui ne prend que
`index.html`), donc jamais livré.

Il contient une ligne par son du § 3 avec un bouton pour le déclencher, et trois
curseurs : **puissance du choc** (0 → 1), **intensité musicale** (0 → 1, les cinq
couches s'allument à mesure), **palier de rang** (les quatre « ting »). Une colonne
en regard déclenche le motif de vibration correspondant — c'est la surface de test
sur téléphone.

Sans lui, régler un choc demande de lancer une partie et d'attendre qu'un bot vienne
au contact. Avec lui, c'est un clic.

## § 9. Ce qui prouve que ça marche

**Tests unitaires** (Vitest, `node`, colocalisés) — quatre fichiers, tous purs :

| Fichier | Ce qui est prouvé | La mutation qui doit le tuer |
|---|---|---|
| `gate.test.ts` | deux chocs égaux à 100 ms : le second est refusé ; un choc plus fort de +0,25 passe malgré la garde ; deux chocs à 20 ms ne passent jamais | retirer la garde → test 1 rougit ; retirer la clause de priorité → test 2 rougit ; retirer le plancher de 40 ms → test 3 rougit |
| `haptics.test.ts` | rien sous p = 0,35 ; 30 chocs forts en 1 s ne dépassent pas 220 ms vibrées ; l'intervalle de 60 ms est respecté ; émetteur absent ⇒ aucune exception | retirer le seuil / le budget / l'intervalle → un test par garde-fou |
| `settings.test.ts` | `muted === '1'` migre vers trois faux ; clé absente ⇒ trois vrais ; JSON corrompu ⇒ trois vrais sans jeter | supprimer la migration → test 1 rougit ; supprimer le `try/catch` → test 3 rougit |
| `music.test.ts` | `intensityFor` rend 0 à la mort, 1 en salle 10, 0,35 hors combat ; les couches actives suivent les cinq seuils ; **toutes les notes du motif et de la nappe sont des degrés de ré phrygien** | changer un seuil ou sortir une note du mode → rouge |

Chaque test est validé par mutation avant d'être considéré comme écrit : on retire le
mécanisme, on vérifie que le test rougit, on remet. C'est la règle du dépôt depuis le
jalon 2b.

**Vérification en navigateur, non déléguée.** `npm run dev`, puis le banc d'essai
pour chaque son, puis une partie réelle pour le mélange. La musique et les chocs se
jugent au casque.

**Un point que je ne peux pas vérifier seul : la vibration.** Elle n'existe que sur
un téléphone Android. Je livrerai la vague 3 avec l'URL réseau de Vite
(`npm run dev -- --host`) et je te demanderai explicitement de tester les motifs au
banc d'essai — c'est le seul verdict qui compte pour cette partie.

**Non-régression** : `npm run test` et `npm run build` à chaque vague.
`npm run calibrate` n'est pas rejoué — aucun chiffre d'équilibrage ne bouge.

## § 10. Découpage en vagues

| Vague | Contenu | Point d'arrêt |
|---|---|---|
| **1 — le socle** | `mix.ts`, `synth.ts`, `settings.ts`, `haptics.ts`, façade `audio.ts` refondue : `hit` à trois composantes, rotor discret + ducké, mort, porte, récompense. Banc d'essai `soundboard.html`. | **Tous les bruitages s'écoutent au banc avant qu'un seul écran ne bouge.** C'est le moment où une réorientation coûte le moins cher. |
| **2 — la musique** | `music.ts`, les cinq couches, `intensityFor`, le ducking, la suspension sur onglet caché. | Écoute au banc (curseur d'intensité), puis en partie réelle. |
| **3 — l'UI** | Écouteur délégué et `data-sfx`, coffres (secousse / poses / révélations / fin), fusion, amélioration, équipement, panneau de réglages, i18n. | Captures des quatre écrans + **test de la vibration sur ton Android**. |

## § 11. Risques et arbitrages

- **`ChestScreen.tsx` est en zone partagée.** La session `feat/coffres-ouverture-groupee`
  travaille en ce moment sur l'ouverture de coffres (`src/sim/chest.ts` modifié chez
  elle). C'est la raison pour laquelle les coffres sont en **vague 3, la dernière** :
  si sa branche atterrit avant, on rebase sur `main` à jour et on adapte les points
  d'accroche, qui sont peu nombreux (quatre appels dans les transitions de phase).
- **Politique d'autoplay** : le contexte ne peut naître qu'au premier geste. Traité
  par l'écouteur de la racine (§ 6), qui corrige au passage le silence actuel quand
  on démarre hors combat.
- **iOS** : aucune vibration possible. Hors cible — la couche est inerte, pas cassée.
- **Batterie** : le séquenceur tourne à 25 ms. Il est arrêté quand la musique est
  coupée et quand l'onglet est caché.
- **Le goût de la musique reste un pari.** C'est pourquoi la vague 2 est isolée et
  s'arrête sur une écoute : si la boucle ne convient pas, seuls `music.ts` et son
  barème sont à reprendre — le reste du son ne dépend pas d'elle.

## § 12. Hors périmètre

- **La simulation.** Aucun fichier de `src/sim/` n'est modifié, aucun test de
  simulation ne change.
- **L'équilibrage.** Aucun chiffre de `config.ts` ni de `balance.json`.
- **Le rendu.** `src/render/` et `src/art/` ne bougent pas ; le ducking est un effet
  audio, pas un effet visuel.
- **Les fichiers binaires.** Tout est synthétisé : le dépôt n'en suit aucun
  aujourd'hui et n'en suivra aucun à l'issue de ce chantier.
- **`design/*.dc.html`.** Non concernés.
