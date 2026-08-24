# Jalon 1.5 — L'habillage : spécification de conception

> Décisions arrêtées en séance de conception le 2026-08-24. Spec de jeu : `docs/game-design.md`.
> Roadmap : `docs/roadmap.md`. Règles d'architecture : `CLAUDE.md`.

## But

Le jalon 1 a livré la boucle, pas le jeu : deux cercles plats sur un disque filaire. La « vie » d'une
toupie **est** sa rotation, et rien ne tourne à l'écran. Ce jalon donne au jeu son identité visuelle et
son game feel, sans toucher à la simulation.

**Le critère qui décide de tout** : on distingue au premier coup d'œil une toupie en pleine forme d'une
toupie mourante, **sans lire le HUD**.

## Contraintes non négociables

- `src/sim/` reste pur, déterministe et **inchangé**, à une seule exception déjà inscrite en dette :
  l'ajout de `clampToArena(top)` dans `physics.ts`. Le rendu est spectateur.
- Tout l'équilibrage reste dans `src/sim/config.ts`. Le barème de game feel n'est **pas** de
  l'équilibrage : il vit dans `src/render/feel.ts` et ne touche jamais la simulation.
- Aucun nom officiel Beyblade nulle part.
- Textes joueur en français, code et identifiants en anglais.
- `design/*.dc.html` ne se modifie que via le skill `/design`. Ce jalon ne les modifie pas.
- Rien n'est poussé sur `main` sans accord explicite : un workflow GitHub Pages déploie publiquement
  à chaque push.

---

## 1 · Direction artistique — « Métal & Braise »

Registre arrêté : le lore raconté par la matière. Acier usiné, rivets, rouille, et le Cœur Gyre comme
seule source de lumière. Ni néon vectoriel (c'est l'identité annoncée du chapitre 2, Dojo Néon), ni
cel-shading manga (proximité visuelle avec l'anime dont on doit se démarquer).

### 1.1 Le principe unique

> **La teinte dit le camp. L'incandescence dit le spin.**

La chaleur ne fait jamais tourner la teinte, elle l'atténue par multiplication :

```
couleur affichée = couleur de camp × (0,18 + 0,82 × ratio^0,62)
```

où `ratio = spin / spinMax`. À 5 % de spin il reste 22 % de l'incandescence : sombre, mais toujours de
la bonne teinte. Une toupie mourante reste identifiable comme la tienne.

Décision prise contre l'alternative « tout le monde sur la même rampe de chaleur, le camp se lit à la
silhouette » : à l'essai, identifier sa propre toupie demandait un coup d'œil de trop.

### 1.2 Jetons

| Jeton | Valeur | Emploi |
|---|---|---|
| `bg` | `#0B0E13` | fond d'atelier, hors arène |
| `panel` | `#131922` | panneaux du HUD |
| `line` | `#2C3644` | bordures |
| `floorInner` → `floorOuter` | `#2A323D` → `#141A22` | plaque d'acier, dégradé radial |
| `rim` | `#3E4959` sur ombre `#0A0D12` | rebord biseauté |
| `rust` | `rgba(146, 78, 44, .055)` | taches du Hangar Rouillé |
| `player` | `#80E8FF` | Cœur Gyre |
| `bot` | `#FF7C30` | ferraille de récupération |
| `boss` | `#BA78FF` | éclat de météorite brute |
| `ember` | `#FFC24A` | porte, crédits, onglet actif |
| `text` | `#E8EAEE` | texte principal |
| `muted` | `#8A94A6` | texte secondaire |

Ces jetons vivent dans **un seul fichier**, `src/theme.ts`, qui les expose sous deux formes : entiers
pour PixiJS, chaînes injectées en variables CSS pour React. C'est la réponse directe à la dette
« `360` dupliqué entre `render/arena.ts` et `ui/Hud.tsx` sans rien qui garantisse l'accord ».

### 1.3 Typographie

- **Oswald** (condensé) : titres, numéros de salle, tous les chiffres. Chiffres tabulaires activés —
  les crédits ne tressautent plus en montant.
- **Inter** : corps de texte.

Auto-hébergées via `@fontsource/oswald` et `@fontsource/inter`, sous-ensemble latin, ~30 ko au total.
Pas de CDN : le jeu doit rester installable en PWA au jalon 4. Repli système déclaré dans chaque pile.

### 1.4 Formes

Une toupie vue de dessus est un **disque encoché**, pas une étoile : bord d'attaque net pour que le
sens de rotation se lise, creux vers l'intérieur.

| | Encoches | Profil | Rayon (sim) |
|---|---|---|---|
| Joueur | 6 | droites | 12 |
| Bot | 5 | crochues | 12 |
| Boss | 5 | crochues | **18** |

Le rayon du boss vient de `BOSS.radius` dans la simulation — il n'est pas décoratif.

### 1.5 L'arène : le Hangar Rouillé

Plaque d'acier tournée : dégradé radial, rainures concentriques, taches de rouille, grain fin.
Rebord biseauté (ombre extérieure épaisse, liseré intérieur éclairé) et 24 rivets. Vignette douce.
Porte matérialisée par un arc ambré en haut de l'anneau.

---

## 2 · Game feel — le barème

Tout ce tableau vit dans `src/render/feel.ts`. **Ce ne sont pas des chiffres d'équilibrage** : ils ne
touchent jamais la simulation, et n'ont donc rien à faire dans `config.ts`.

| Effet | Barème |
|---|---|
| **Rotation** | `ω = 2 + 18 × ratio^1,15` rad/s — 3,2 tr/s à plein régime, 0,6 tr/s à l'agonie |
| **Incandescence** | halo de rayon 1,9 × toupie, alpha `0,20 + 0,80 × ratio` |
| **Usure** | 3 textures ébréchées, bascule à `ratio < 0,45` puis `< 0,22` |
| **Éclats** | sous `ratio 0,40` : `5 × (1 − ratio / 0,40)` particules détachées |
| **Traînée** | émise au-delà de 55 % de la vitesse max ; 9 fantômes ; 0,22 s de vie |
| **Impact** | flash 0,11 s · onde de choc 0,38 s · secousse ≤ 9 px amortie ×0,86 par image · `6 + 8p` étincelles |
| **Mort** | 0,9 s : ralentit, se couche, racle en étincelles, s'immobilise |
| **Boss** | aura 2,7× · anneau contra-rotatif à `−0,42 ω` · entrée 1,2 s |
| **Reforge** | 0,45 s : éclair 0,22 s, chute des toupies, onde à la retombée |

### 2.1 Ce que la rotation encode, et ce qu'elle n'encode pas

Signaux retenus pour le spin restant : **chaleur + usure**. Le vacillement (précession, inclinaison,
orbite) est **écarté** — il déplace le sprite par rapport à la position réelle de la simulation, donc
il ment sur la hitbox au moment précis où le joueur a le plus besoin de piloter juste. La chaleur et
l'usure sont des signaux gratuits : ils n'ajoutent aucun bruit sur la position.

Exception : la **mort** joue un plan unique où la toupie se couche. Ce n'est pas du vacillement
continu, c'est la ponctuation de fin, et à cet instant la position n'a plus d'enjeu.

### 2.2 `p`, la puissance d'un choc, est déduite

La simulation n'émet aucun événement. Le rendu reconstruit la puissance en comparant deux ticks :

```
perte = spin(avant) − spin(après)
p_brut = perte − spinDecay × TICK_S        // ce qui dépasse la décroissance normale
p = clamp(p_brut / FEEL.hitReference, 0, 1)
```

`hitReference` est une **valeur absolue**, pas un pourcentage de `spinMax`. Normaliser contre `spinMax`
ferait faiblir les impacts à mesure que le joueur monte son Noyau — l'inverse exact du ressenti voulu.

Valeur de départ : **70**. Ordre de grandeur calculé sur les constantes du jalon 1 — un choc franc
ferme à ~200 d'unités de vitesse relative donne `200 × 30/(30+6) × 0,35 ≈ 58` de dégâts au bot et
`200 × 18/(18+10) × 0,35 ≈ 45` au joueur. À confirmer par instrumentation d'une partie réelle pendant
l'implémentation.

### 2.3 Une contrainte découverte dans le code

**La porte ne peut pas s'allumer « quand la salle est vide ».** Cet état n'existe pas une seule image :
dans `sim.ts`, dès que `bots.length === 0` la salle avance dans le même tick. La porte s'allume donc
*pendant* la reforge, comme premier temps de la transition, et non comme un état durable. C'est plus
faible que ce que laisse croire `design/Combat.dc.html`, et c'est assumé.

### 2.4 Le boss et la transition

**Boss — présence + entrée.** Aura permanente, anneau contra-rotatif, puis à l'arrivée en salle 10 :
le sol s'assombrit, une onde violette part du boss, un bandeau « GARDIEN DU HANGAR » s'inscrit
(0,3 s d'apparition, 1,2 s de tenue, 0,6 s de sortie). **La simulation tourne pendant toute l'entrée** —
on ne met jamais le jeu en pause, sous peine de fausser le tick fixe dont dépend le farm du jalon 3.

**Transition — reforge.** L'arène encaisse un éclair de forge et les nouvelles toupies tombent avec
impact au sol. Bornée à 0,45 s. Si deux transitions surviennent à moins de 3 s d'intervalle, l'éclair
est rejoué à 40 % d'intensité : dix fois par chapitre, une transition trop appuyée fatigue.

---

## 3 · Architecture du rendu

### 3.1 Le rendu observe, il ne demande rien

Trois approches envisagées :

1. **Journal d'événements dans la sim** (`state.events` rempli par `tick()`). La plus propre — plus rien
   à deviner. **Écartée** : modifie `src/sim/` au-delà de l'exception autorisée et change la forme de
   l'état sérialisé.
2. **Monter la simulation à 60 Hz.** Supprime le besoin d'interpoler. **Écartée** : le tick fixe à
   100 ms est le contrat de déterminisme, et changer le pas invalide l'équilibrage mesuré.
3. **Observateur par différence d'états.** ✅ **Retenue** : zéro ligne de simulation touchée.

### 3.2 La boucle

```
tant que le temps accumulé ≥ un tick :
    renderer.beforeTick(state)     // instantané compact : id, x, y, spin, spinMax, salle, phase, chapterValidated
    tick(state, input)             // ← inchangé
    renderer.afterTick(state)      // diff instantané ↔ état → événements poussés dans la file d'effets
renderer.draw(state, alpha)        // alpha = temps restant / pas
```

Si plusieurs ticks tombent dans une même image, l'instantané n'est pris qu'avant le dernier.

### 3.3 L'interpolation est le point le plus rentable du jalon

Aujourd'hui la simulation avance 10 fois par seconde et le rendu affiche l'état brut : **tout mouvement
est vu à 10 images par seconde, quel que soit le framerate**. C'est vraisemblablement la moitié de
l'impression de « mort » à l'écran, avant même la question des couleurs.

Le rendu interpole entre l'instantané et l'état courant avec `alpha`. Coût : une soustraction et une
multiplication par toupie. La simulation n'est pas touchée.

### 3.4 L'observateur est une fonction pure

```ts
observe(before: Snapshot, after: Snapshot): RenderEvents
```

```ts
interface RenderEvents {
  hits:   { id: string; x: number; y: number; toward: Vec | null; power: number }[];
  deaths: { id: string; x: number; y: number; isPlayer: boolean }[];
  salleChanged: boolean;
  bossEntered: boolean;
  chapterValidated: boolean;
}
```

Détection :

| Événement | Règle |
|---|---|
| Choc | perte de spin > décroissance attendue + ε |
| Mort d'un bot | présent dans l'instantané, absent après (la sim les filtre) |
| Mort du joueur | `phase` passe à `dead` |
| Salle franchie | `salle` change |
| Entrée du boss | on entre en salle 10 |
| Chapitre validé | `chapterValidated` passe à vrai — aucun retour à l'écran aujourd'hui |

Aucun DOM, aucun Pixi : **testable unitairement**. Le cœur du game feel gagne des tests, ce qui est rare.

Point d'attention : la simulation retire les bots morts de `state.bots` immédiatement. Le rendu garde
donc une vue « agonisante » par identifiant pendant les 0,9 s de l'animation de mort, puis la détruit.

### 3.5 PixiJS : sprites teintés, pas de tracé par image

Le rendu actuel retrace tous les chemins à chaque image. Sur un mobile milieu de gamme avec des
particules, c'est la façon classique de rater les 60 fps.

Les textures sont fabriquées **une fois** au démarrage. Chaque toupie devient 4 sprites : corps acier
(non teinté), liseré, noyau, halo. La chaleur n'est plus qu'un `tint` et une `alpha`, la rotation un
`rotation`, l'usure un échange de texture. Le GPU fait le travail, le CPU n'en fait plus.

```
calque 1  sol         1 sprite, refait uniquement au redimensionnement
calque 2  porte       1 arc
calque 3  traînées    ≤ 24 sprites recyclés
calque 4  toupies     ≤ 4 × 4 sprites
calque 5  effets      ondes + 120 étincelles en pool
```

Moins de 50 appels de dessin. La secousse déplace le conteneur monde, jamais le voile de flash.

### 3.6 Découpage des fichiers

```
src/theme.ts               jetons DA uniques → constantes Pixi ET variables CSS
src/content/chapters.ts    noms des 8 arènes-chapitres (texte joueur, issu de la spec)
src/render/arena.ts        orchestrateur : app, calques, redimensionnement
src/render/textures.ts     fabrique de textures (toupie × camp × 3 usures, étincelle, halo)
src/render/topView.ts      une toupie à l'écran : rotation, teinte, usure, traînée, agonie
src/render/floor.ts        sol + porte
src/render/effects.ts      étincelles, ondes, flashes, secousse
src/render/observer.ts     diff de deux instantanés → événements        ← pur, testé
src/render/interpolate.ts  instantané + lerp                            ← pur, testé
src/render/feel.ts         le barème chiffré de la section 2
src/audio/audio.ts         synthèse WebAudio
src/ui/App.tsx             coquille à onglets
src/ui/CombatScreen.tsx    bandeau, panneau de salle, arène, barre de spin
src/ui/ForgeScreen.tsx     les 4 améliorations
```

`src/ui/Hud.tsx` disparaît, éclaté entre `CombatScreen` et `ForgeScreen`.

---

## 4 · L'écran

### 4.1 Périmètre du HUD

Coquille à **deux onglets réels**, contre le wireframe complet qui afficherait quatre éléments morts
sur dix — un bouton grisé qui ne s'allume pas avant des semaines se lit comme un bug, pas comme une
promesse.

| Affiché maintenant | Réservé |
|---|---|
| Crédits | Gemmes (jalon 2) |
| Chapitre 1 — Hangar Rouillé | AUTO (jalon 3) |
| SALLE n / 10 + progression vers le boss | CAPACITÉ (jalon 2/3) |
| Barre de spin du joueur | |
| Onglet **Combat** | |
| Onglet **Forge** : les 4 améliorations | Onglets Coffres et Toupies, cadenassés et visibles |

Les améliorations quittent l'écran de combat pour leur vraie maison, comme dans le wireframe. L'arène
récupère toute la hauteur.

### 4.2 Correction au wireframe

Le `≡` du bandeau n'ouvre aucun menu et n'en ouvrira pas avant le jalon 2. Il est remplacé par la
**coupure du son**, seul réglage que ce jalon produit réellement. Le `≡` revient quand il aura quelque
chose derrière.

### 4.3 Mise en page

L'arène n'a plus de taille en dur : elle remplit son conteneur, carrée, et Pixi se cale dessus par
`ResizeObserver`. Le `360` dupliqué disparaît, et le rognage sous 360 px de large avec lui.

Onglet Forge : chaque amélioration annonce son delta de stat (« Attaque 30 → 33 ») — sans quoi le
joueur dépense sans savoir ce qu'il achète.

---

## 5 · Le son

Synthèse **WebAudio**, aucun fichier : zéro poids, aucune licence à tracer jusqu'aux stores, et une
hauteur pilotable en continu — ce qu'un échantillon ne permet pas.

Le signal principal n'est pas le choc, c'est le **bourdon** : un oscillateur filtré dont la fréquence
suit `60 + 190 × ratio`. La toupie chante, et son chant descend quand elle meurt — on entend qu'on va
mourir sans regarder l'écran, ce qui sert directement le critère d'acceptation du jalon.

| Son | Synthèse |
|---|---|
| Bourdon | oscillateur + passe-bas, `60 + 190 × ratio` Hz, gain faible |
| Choc | salve de bruit filtré, 60 ms, hauteur et volume pilotés par `p` |
| Mort | glissando descendant + raclement |
| Porte | cloche métallique, quinte juste |
| Reforge | coup sourd + choc à la retombée |

L'audio ne démarre qu'au **premier contact du doigt** — politique des navigateurs, pas un choix.
Coupure persistée en `localStorage`.

---

## 6 · Équilibrage du chapitre 1

Décision de game design prise après mesure (autopilote « fonce sur le bot le plus proche » + achats
gloutons, 5 seeds, médianes) : **réglage « MUR ~2 h »**.

```
ECON.rewardBase          20   →  120
ECON.rewardGrowth        1,12 →  1,13
ECON.bossRewardMult      5    →  10
BOSS.spinMult            4        (inchangé)
BOT_SCALING.spinPerSalle 0,15     (inchangé)
```

| | avant | après |
|---|---|---|
| Runs pour valider le chapitre | 124 | **21** |
| Durée | 12 h 06 | **2 h 08** |
| Spin du joueur face au boss | 8 520 vs 11 280 | 9 000 vs 11 280 |
| Morts sur le boss / salle 4 | 47 / 19 | 8 / 3 |

Le balayage a montré que les deux leviers sont indépendants : **l'économie commande la durée**, **le
boss commande la forme de la difficulté**. Adoucir le boss (`spinMult 4 → 2,5`) ne fait pas gagner de
temps mais fait perdre l'événement — la salle 4 devient aussi meurtrière que le boss et il n'y a plus
de mur. On conserve donc le mur, conformément au pilier « le mur n'est jamais un bug, c'est le
produit », et le joueur affronte toujours le boss en infériorité de spin.

`docs/game-design.md` porte encore l'ancienne courbe (`20 × 1,12^(salle−1)`, marquée « à équilibrer ») :
elle est mise à jour avec les valeurs retenues.

**Correction à `docs/roadmap.md`** : la dette affirme que le boss cause « plus de morts que les salles
4 à 9 réunies ». La mesure donne 47 contre 75 — le boss est de loin la salle la plus meurtrière (47
contre 19 pour la suivante), mais pas plus que leur somme. Le diagnostic de fond tient ; la
formulation est corrigée.

---

## 7 · Dette traitée

- **`clampToArena(top)` dans `physics.ts`**, appelé après les boucles de collision dans `tick()`.
  Seule modification de `src/sim/` du jalon, couverte par un test. Corrige les toupies qui dépassent
  de l'anneau sur ~4,3 % des images.
- **Taille du canvas pilotée par le conteneur** : rognage sous 360 px réglé, `360` dupliqué supprimé.
- **`useGameLoop`** : les rappels passent par une ref rafraîchie à chaque rendu ; la closure figée et
  le commentaire `eslint-disable` orphelin disparaissent.
- **Glisser sur les boutons ne pilote plus la toupie** : les contacts qui naissent sur un élément
  interactif sont ignorés, « glisser n'importe où » est préservé partout ailleurs.

Restent volontairement en dette, comme prévu au jalon 2 : paliers de bots en dur dans `salle.ts`,
`Stats.accel` passe-plat, triple écriture du spin initial dans `createInitialState`, bots inertes
3-4 ticks après spawn, `formatCredits` au-delà du milliard.

---

## 8 · Vérification

**Unitaire (Vitest).** `clampToArena` ; l'observateur de différences ; l'interpolation ; la rampe
d'incandescence. Le cœur du game feel est du code pur, donc testé.

Les 34 tests actuels passent, mais **trois assertions de `src/sim/economy.test.ts` cassent** avec le
nouvel équilibrage : elles codent en dur `salleReward(1, false) === 20`, `31,47` et `277,31`. Elles
sont réécrites pour dériver leurs attentes de `ECON` — ce qui est de toute façon la forme correcte au
regard de la règle « jamais de constante d'équilibrage en dur ailleurs que dans `config.ts` ». Aucune
autre assertion ne dépend des valeurs modifiées.

**Visuel.** Aucun test ne juge « on distingue une toupie en pleine forme d'une toupie mourante ».
Donc : `npm run dev`, `http://localhost:5173/spinforge/` (la racine renvoie 404, `base: '/spinforge/'`),
puis captures Playwright de l'arène à 100 %, 45 % et 12 % de spin — examinées avant d'être présentées.

**Performance.** Sonde de temps par image en développement, mesurée sous throttling CPU ×4 pour
émuler un mobile milieu de gamme. Cible : 60 fps.

## 9 · Critères d'acceptation

1. On distingue au premier coup d'œil une toupie en pleine forme d'une toupie mourante **sans lire le
   HUD** — jugé à l'œil, sur capture.
2. Chaque choc produit un retour visuel **et** sonore.
3. Plus rien ne dépasse du décor.
4. 60 fps sur mobile milieu de gamme (mesuré sous throttling ×4).
5. L'écran de combat correspond à `design/Combat.dc.html`, au périmètre arrêté en § 4.1.
6. `src/sim/` inchangé hors `clampToArena` et les constantes d'équilibrage de `config.ts`.
7. `npm run test` et `npm run build` verts.
