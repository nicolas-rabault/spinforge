# Jalon 2a — Les pièces : spécification de conception

> Première moitié du jalon 2 de `docs/roadmap.md`. La seconde — les quatre Fondateurs, les
> types et le triangle des forces — fera l'objet d'une spec distincte (jalon 2b).

## But

Le jalon 1.5 a donné au jeu son identité visuelle ; il n'a rien ajouté à ce qu'on y fait. La
progression tient encore en quatre entiers : `pieces: { noyau, lame, disque, pointe }`, chacun
monté au crédit, sans objet, sans choix, sans rien à collectionner.

Ce jalon transforme ces quatre entiers en **objets** : des pièces qui ont un modèle, un rang de
rareté, des talents, qui sortent de coffres, qui s'empilent, qui fusionnent et qu'on équipe. Il
apporte aussi les deux fondations sans lesquelles rien de tout cela ne tient : **l'équilibrage
en JSON statique** et **la sauvegarde**.

La sauvegarde n'était pas prévue avant le jalon 3. Elle remonte ici pour une raison
dirimante : le critère « fusionner jusqu'à changer de rang » suppose d'accumuler trois, puis
neuf pièces identiques. Cela ne tient pas dans une session, et aujourd'hui `App.tsx` appelle
`createInitialState(Date.now())` à chaque chargement — tout repart de zéro à chaque F5.

## Contraintes non négociables

1. **`src/sim/` reste pur et déterministe.** Aucun import DOM, PixiJS, React, `Date` ou
   `Math.random`. La sauvegarde y entre donc par sa moitié pure — sérialisation et
   migrations — et le `localStorage` reste dehors.
2. **Le rendu demeure spectateur.** `src/render/` et `src/ui/` lisent, ne mutent pas.
3. **Tout l'équilibrage dans le JSON**, `src/sim/config.ts` restant sa porte unique.
4. **Aucun nom officiel Beyblade.** Le catalogue de `docs/game-design.md` fait foi.
5. **Textes joueur en français**, code et identifiants en anglais.
6. Le test de déterminisme existant doit rester vrai **au mot près**.
7. **Le partage de charge est un acquis, pas une base négociable.** Ajouté le 2026-08-25 après
   mesure (`docs/ameliorations.md`), il est ce qui rend le pilotage payant : sans lui, un joueur
   qui ne touche jamais l'écran valide le chapitre 1 aussi vite qu'un joueur qui charge. Toute
   réécriture de `resolveCollision` doit le préserver, ainsi que les deux tests qui le
   verrouillent. `docs/game-design.md` § Combat en fait désormais une règle du jeu.

---

## 1 · Architecture de l'état

### 1.1 La scission

`SimState` mélange aujourd'hui ce qui change dix fois par seconde (positions, vitesses, spin) et
ce qui survit au run (crédits, niveaux de pièces). Le gacha aggrave le mélange : inventaire,
gemmes, compteurs de pity. On sépare.

```ts
export interface RunState {
  tick: number;
  rngState: number;          // flux du run : angles de spawn, jitter des bots
  chapter: number;
  salle: number;
  player: Top;
  bots: Top[];
  phase: Phase;
  secondSouffleUsed: boolean; // talent Noyau/Épique, une fois par run
}

export interface MetaState {
  rngState: number;                        // flux méta : tirages de coffre
  credits: number;
  gems: number;
  equipped: Record<Slot, PieceInstance>;
  inventory: PieceStack[];
  pity: Record<ChestKind, number>;
  chapterValidated: boolean;
}
```

`chapterValidated` est déplacé tel quel. La roadmap réserve explicitement sa généralisation
(« meilleur chapitre *jamais* validé ») au jalon 3 ; on ne l'anticipe pas.

`secondSouffleUsed` est le seul champ que les talents ajoutent au run — les onze autres se
calculent à partir de l'équipement, sans mémoire.

### 1.2 La frontière

```ts
export function createRun(meta: MetaState, seed: number): RunState;
export function tick(run: RunState, input: Input): RunReward | null;
export function resetRun(run: RunState, meta: MetaState): void;
export function syncRunStats(run: RunState, meta: MetaState): void;
export function applyReward(meta: MetaState, reward: RunReward): void;

export interface RunReward { credits: number; gems: number; }
```

`tick()` ne touche plus jamais au méta. Une salle vidée **retourne** sa récompense ; l'appelant
— la boucle de jeu — l'applique. Le méta n'entre dans le run que **par valeur**, jamais par
référence : les stats du joueur sont recopiées depuis l'équipement, elles ne sont pas lues à
travers un lien vivant.

`syncRunStats` existe pour préserver un comportement d'aujourd'hui qu'il serait facile de perdre
dans la scission : `tryUpgrade` appelle `syncPlayerStats`, donc **améliorer une pièce renforce le
joueur immédiatement, run en cours**. Avec `createRun` seul, l'amélioration n'aurait plus rien
changé avant le run suivant — une régression silencieuse. La Forge appelle donc `syncRunStats`
après chaque mutation de l'équipement (amélioration, changement de pièce, fusion). Comme
aujourd'hui, la resynchronisation **clampe le spin vers le bas et ne soigne jamais** : sans quoi
améliorer son Noyau à 3 % de spin deviendrait un soin gratuit.

### 1.3 Deux flux de RNG

Un seul compteur sert aujourd'hui aux angles de spawn et au jitter des bots. Y brancher les
coffres rendrait le déterminisme du combat sensible au nombre de coffres ouverts entre deux
salles : le test resterait techniquement vrai, mais pour une raison qu'aucun lecteur ne
devinerait. Deux flux séparés, et un test explicite le vérifie (§ 11).

---

## 2 · L'équilibrage en JSON

`src/content/balance.json` est versionné dans git et porte un champ `version`. `src/sim/config.ts`
devient son chargeur typé — il reste la porte unique par laquelle la simulation lit un chiffre,
donc la règle 3 de `CLAUDE.md` tient sans réécriture.

Le fichier reprend l'intégralité des constantes de l'actuel `config.ts` — `CHARGE_BONUS`
compris, arrivé avec le partage de charge — plus tout ce que ce jalon introduit. Il fait entrer au passage le **nombre de bots par salle**, aujourd'hui codé en
dur dans `salle.ts` sous la forme `Math.min(1 + Math.floor((salle - 1) / 3), 3)` — dernier
manquement à la règle 3, et la roadmap programme sa reprise précisément ici. Il devient un
tableau explicite, indexé par `salle - 1` :

```json
"chapter": { "sallesPerChapter": 10, "botsPerSalle": [1, 1, 1, 2, 2, 2, 3, 3, 3, 1] }
```

La dixième entrée vaut 1 : le boss. Un tableau plutôt qu'une formule, parce qu'un tableau se
modifie sans relire de code, ce qui est tout l'objet du passage en JSON.

Le typage se fait par une interface `Balance` déclarée à côté du chargeur et une assertion à
l'import, pour que TypeScript vérifie la forme du fichier plutôt que d'inférer des littéraux.
`resolveJsonModule` est activé dans `tsconfig.json`.

---

## 3 · La sauvegarde

**Coupée en deux pour ne pas violer la contrainte 1.**

```ts
// src/sim/save.ts — pur
export const SAVE_SCHEMA = 1;
export function serializeMeta(meta: MetaState): string;
export function deserializeMeta(json: string): MetaState | null;

// src/storage/localSave.ts — impur, hors src/sim
export function loadMeta(): MetaState | null;
export function saveMeta(meta: MetaState): void;
```

Le blob porte `{ v: SAVE_SCHEMA, meta: … }`. À l'ouverture : un schéma antérieur passe par les
migrations, un schéma inconnu ou un JSON illisible renvoie `null` — la partie démarre neuve — et
**le blob fautif est recopié sous une clé de secours** (`spinforge.save.backup`) au lieu d'être
écrasé en silence. Perdre une progression sans laisser de trace est le pire défaut qu'une
sauvegarde puisse avoir.

L'écriture est débouncée (≈ 1 s) sur les mutations du méta — récompense de salle, coffre,
fusion, équipement, amélioration — avec un flush sur `pagehide`.

**Le run en cours n'est pas sauvegardé.** Fermer l'onglet en plein combat équivaut à abandonner
le run ; les crédits déjà gagnés sont acquis, ayant été versés au méta salle par salle. C'est
cohérent avec « mort du joueur → retour salle 1, crédits conservés », et cela évite de
sérialiser un état qui change dix fois par seconde.

---

## 4 · Le modèle de pièce

### 4.1 Identité

```ts
export type Slot = 'lame' | 'disque' | 'pointe' | 'noyau';
export interface PieceInstance { model: ModelId; rank: number; level: number; }
```

L'emplacement découle du modèle. Deux pièces sont **identiques** — donc fusionnables — si
`model` et `rank` coïncident. **Le niveau n'entre pas dans l'identité** : sans quoi la stratégie
optimale deviendrait « ne jamais améliorer avant d'avoir fini de fusionner », et le joueur qui
améliore spontanément serait puni de l'avoir fait.

### 4.2 L'échelle de rareté

Un seul entier `rank ≥ 1`. L'affichage est dérivé.

| rang | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 11+N |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| | Commun | Bon | Rare | Excellent | Exc. +1 | Exc. +2 | Épique | Ép. +1 | Ép. +2 | Ép. +3 | Légende | Légende +N |

Aucun cas particulier au-delà de 11 : la formule de stat et l'étiquette se prolongent d'elles-mêmes.
C'est ce que « rang infini » exige.

### 4.3 Les deux axes

```
stat = base × (1 + perLevel × niveau) × rarityStep^(rang − 1)
```

L'axe **niveau** est inchangé : `PIECE_EFFECT` conserve ses valeurs (Lame 0,10 sur l'attaque,
Disque 0,10 sur la défense, Pointe 0,04 sur la vitesse et 0,05 sur la décroissance, Noyau 0,08
sur le spin max) et le coût reste `100 × 1,08^niveau`. L'axe **rareté** vaut `rarityStep = 1,08`.

Les deux se croisent tôt et proprement. Le gain relatif d'un niveau supplémentaire s'érode
(`0,10 / (1 + 0,10 × L)` : +10 % au niveau 0, +7,7 % au niveau 3, +5 % au niveau 10, +1,7 % au
niveau 50), tandis qu'un rang vaut toujours +8 % du total. **Dès le niveau 3, un rang vaut plus
qu'un niveau** (7,7 % contre 8 %), et l'écart croît ensuite. Commun → Légende = ×2,16, et Légende +N continue.

Le rang reste néanmoins modeste en stat pure : sa vraie valeur est le talent qu'il débloque.

### 4.4 Les modèles au 2a

Génériques, du catalogue : **Disques** — Lourd, Gravité, Éventail, Axial, Colosse, Météorite.
**Pointes** — Plate, Aiguille, Orbitale, Gyroscope, Furie, Ressort.

Ils sont **identiques en stats** à ce jalon. Leur unique rôle mécanique est de fragmenter le
vivier de fusion : il faut trois *Lourd*, pas trois Disques quelconques. Différencier leurs
comportements est du contenu qui appartient au 2b, avec les types.

Lame et Noyau étant signature, il leur faut une toupie. Le joueur en pilote déjà une depuis le
jalon 1, simplement anonyme : **on la nomme, et c'est tout ce que le 2a prend du catalogue.**

> **Brasier Solaire** (Fondateur, type Équilibre) — Lame *Couronne Solaire*, Noyau *Fournaise*.

Le type Équilibre est choisi pour que le triangle des forces ne penche d'aucun côté quand il
arrivera au 2b. Les trois autres Fondateurs se brancheront sur la même structure de données.

**Équipement de départ** : quatre pièces Commun niveau 0 — Lame *Couronne Solaire*, Noyau
*Fournaise*, Disque *Lourd*, Pointe *Plate*. Aucune migration : il n'existe aucune sauvegarde
antérieure.

### 4.5 Inventaire, piles et équipement

```ts
export interface PieceStack { model: ModelId; rank: number; count: number; bestLevel: number; }
```

Les quatre pièces équipées sont des objets à part ; les doublons vivent en piles. Seule une
pièce équipée s'améliore au crédit — les doublons dorment au niveau 0 — et `bestLevel` n'existe
que pour ne rien perdre lorsqu'on déséquipe une pièce améliorée.

L'inventaire n'a **pas de plafond** et il n'y a **pas de démantèlement** : le sacrifice de
fusion (§ 7) est le débouché des rebuts, et il suffit.

---

## 5 · Les talents de rang

Un talent par **palier nommé** — Excellent (rang 4), Épique (rang 7), Légende (rang 11) — et par
emplacement. Douze en tout. Ils sont **cumulatifs** (une pièce Légende porte les trois de son
emplacement) et n'agissent que sur la pièce **équipée**. Les rangs intermédiaires +1/+2/+3
restent des marches de stat pure.

La spec de jeu dit « chaque rang débloque un talent », soit dix par pièce. Restreindre aux
paliers nommés ramène l'écriture de plusieurs dizaines de talents à douze, sans rien retirer à
l'intention : franchir un palier reste l'événement qui change le jeu.

| | Excellent (4) | Épique (7) | Légende (11) |
|---|---|---|---|
| **Lame** | **Estoc** — au-delà d'un seuil de vitesse d'impact, +30 % de dégâts infligés | **Riposte** — 15 % des dégâts encaissés reviennent à l'agresseur | **Percée** — les dégâts infligés ignorent 25 % de la défense adverse |
| **Disque** | **Ancrage** — l'impulsion reçue dans un choc est réduite de 30 % | **Frôlement** — sous un seuil de vitesse d'impact, aucun dégât subi | **Masse** — compte double dans le calcul d'impulsion : pousse, n'est plus poussé |
| **Pointe** | **Glisse** — friction au sol réduite, la vitesse se conserve mieux | **Relance** — la décroissance du spin est suspendue 2 s après chaque choc | **Toupie folle** — la vitesse maximale monte à mesure que le spin baisse |
| **Noyau** | **Réserve** — le soin entre salles passe de 20 % à 35 % | **Second souffle** — une fois par run, arriver à 0 de spin fait repartir à 20 % | **Cœur Gyre** — la décroissance naturelle du spin baisse de 40 % |

Chacun tient en quelques lignes dans `combat.ts` ou `physics.ts`. Toutes leurs constantes vivent
dans le JSON, y compris les deux seuils de vitesse d'*Estoc* et de *Frôlement*, qui sont des
valeurs à régler par la mesure (§ 6.4) et non des vérités.

Les talents de dégâts **se composent** avec le partage de charge, ils ne le remplacent pas :
la part de charge module d'abord les dégâts selon qui a foncé, puis *Estoc* et *Percée*
s'appliquent par-dessus. Un assaut mené par une Lame Légendaire cumule donc les deux effets —
c'est voulu, la Lame est la pièce de l'attaque et charger est la manière d'attaquer.

*Second souffle* est le seul à demander un état : `RunState.secondSouffleUsed`.

---

## 6 · Les coffres

### 6.1 Les trois coffres

| | Prix | ×10 | Emplacements tirés | Distribution de rang | Pity |
|---|---|---|---|---|---|
| **Bronze** | 2 000 crédits | 18 000 | Disque, Pointe | Commun 75 % · Bon 22 % · Rare 3 % | aucun |
| **Arène** | 300 gemmes | 2 680 | les quatre | Bon 70 % · Rare 25 % · Excellent 5 % | Excellent au 10ᵉ |
| **Mythique** | 1 500 gemmes | 13 500 | les quatre | Excellent 88 % · Épique 11,5 % · Légende 0,5 % | Légende au 30ᵉ |

Prix et remises ×10 sont ceux de `docs/game-design.md`. Les distributions de rang n'y figuraient
pas et sont proposées ici.

### 6.2 Le tirage

Trois tirages successifs sur le flux méta : **le rang**, puis **l'emplacement** uniformément
parmi ceux que le coffre autorise, puis **le modèle** uniformément dans cet emplacement.

Tirer l'emplacement avant le modèle évite d'introduire une constante « part de signature » à
régler : Bronze ne connaît que les génériques ; Arène et Mythique tirent les quatre
emplacements, donc produisent des doublons signature — conforme à la spec de jeu. Et l'équilibre
se corrige de lui-même au 2b, quand trois Fondateurs de plus feront passer les Lames de un à
quatre modèles.

**Le tirage de rang a lieu même lorsque le pity le force**, et son résultat est alors écarté.
Chaque tirage consomme ainsi exactement trois valeurs du flux méta, forcé ou non — ce qui rend
les tests de pity lisibles et évite qu'un compteur au seuil ne décale toute la suite.

Un ×10 est dix tirages successifs, pity compris.

### 6.3 Le pity

Un compteur par coffre dans `MetaState`, incrémenté à chaque tirage et **remis à zéro dès qu'un
tirage atteint ou dépasse le rang garanti**. Au seuil, le tirage suivant est forcé à ce rang.

Un ×10 se comporte alors naturellement comme « Excellent garanti au 10ᵉ » sans règle spéciale :
c'est le même mécanisme, pas un second. Le compteur est **affiché en clair** dans l'écran
Coffres — le cacher serait un choix de casino, pas de jeu.

### 6.4 Les gemmes et la cible de calibration

Au 2a, le boss est leur **seule** source ; les salles ordinaires n'en donnent aucune et les
quêtes sont au jalon 3. `RunReward.gems` vaut donc 0 partout sauf en salle 10.

Plutôt que d'avancer un gain au jugé, on reprend la méthode qui a réglé le mur du chapitre 1 au
jalon 1.5 : **fixer une cible en temps de jeu et laisser la mesure trouver la constante.**

> **Cible : le premier coffre Arène tombe dans l'heure qui suit la validation du chapitre 1.**

Le contexte qui justifie cette cible : un chapitre complet rapporte **≈ 3 180 crédits** (neuf
salles à `70 × 1,13^(s−1)`, soit ≈ 1 080, plus le boss ×10, soit ≈ 2 100). Un Bronze ×10 coûte
donc **≈ 5,7 chapitres** — de l'ordre d'une demi-heure de jeu une fois le chapitre 1 maîtrisé,
ce qui reste sain pour un idle.

> Ces chiffres sont ceux de la base **70**, retenue le 2026-08-25 en contrepartie du partage de
> charge : le pilotage étant devenu payant, le chapitre 1 tombait à 1,43 h à l'ancienne base de
> 120. La calibration du § 11 doit repartir de 70.

Mais avec un seul chapitre disponible et aucune quête, **Mythique et Arène ×10 restent hors de
portée à ce jalon** — assumé : ce sont les cibles longues d'un jeu qui aura huit chapitres et
des quêtes. Elles sont construites et testées ici, pas atteintes.

---

## 7 · La fusion

La recette dépend du rang de départ. C'est une table de seuils dans le JSON, donc de
l'équilibrage.

| Rang de départ | Produit | Recette |
|---|---|---|
| **1, 2, 3** — Commun, Bon, Rare | rang + 1 | 3 identiques |
| **4 à 9** — Excellent … Épique +2 | rang + 1 | 2 identiques **+ 1 sacrifice** du même emplacement, modèle et rang quelconques |
| **10** — Épique +3 | 11, Légende | 3 identiques |
| **11 et au-delà** — Légende +N | rang + 1 | 2 identiques |

La colonne de gauche donne le rang **des pièces consommées**, pas une plage de rangs franchis :
trois Rare (3) font un Excellent (4), et c'est la première ligne qui s'applique.

Le **sacrifice** est ce qui donne un débouché aux rebuts sans avoir besoin des Fragments :
n'importe quel Disque nourrit la montée d'un autre Disque.

**Le niveau de la pièce produite est le plus haut de toutes les pièces consommées, sacrifice
compris.** La règle tient en une phrase — *on ne perd jamais de niveau en fusionnant* — et
n'ouvre aucun abus, le coût d'un niveau (`100 × 1,08^niveau`) étant identique quel que soit le
rang de la pièce sur laquelle on l'achète.

Une fusion peut consommer la pièce **équipée** : le résultat prend alors sa place
automatiquement. Pas d'auto-fusion — elle appartient à l'arbre de Refonte du jalon 4.

---

## 8 · Les écrans

**L'onglet Coffres s'ouvre** ; **Toupies reste verrouillé** jusqu'au 2b. Les deux sont déjà
présents, grisés, dans `TabBar.tsx`.

**La Forge** devient une page qui défile, en deux blocs :

1. **Ta toupie** — les quatre emplacements : modèle, rang, niveau, talents actifs, et le bouton
   d'amélioration au crédit (le comportement actuel, transposé de l'emplacement à la pièce).
2. **Inventaire** — les piles, filtrables par emplacement, avec *Équiper* et *Fusionner*.

Un défilement plutôt qu'un sous-menu : à 460 px de large, il se pilote mieux.

**L'écran Coffres** montre les trois coffres, leur prix, ×1 et ×10, et le compteur de pity.
L'ouverture donne une **révélation sobre** : les pièces apparaissent l'une après l'autre en léger
décalage, les rangs élevés s'allument à la couleur braise, une ligne de résumé conclut. React et
CSS seulement — pas de PixiJS, proportionné au jalon.

Le HUD gagne le compteur de **gemmes** à côté des crédits, dans le bandeau d'`App.tsx`.

---

## 9 · Dette traitée

Trois entrées de « Dette connue » de `docs/roadmap.md` se referment ici, parce que ce jalon
réécrit précisément le code concerné :

- `salle.ts` codait en dur le nombre de bots par palier → tableau `botsPerSalle` du JSON (§ 2).
- `Stats.accel` était un passe-plat qu'aucune pièce ne modifie → il disparaît de `Stats`,
  `createRun` posant l'accélération du joueur depuis le JSON.
- `createInitialState` écrivait trois fois la même valeur de spin initial → s'évanouit dans la
  réécriture.

---

## 10 · Hors périmètre

Dit explicitement pour que le plan n'y revienne pas :

- Les trois autres Fondateurs, les types, le triangle des forces → **2b**
- Les comportements distincts des modèles génériques → **2b**
- Le coffre Arène gratuit toutes les 4 h → **jalon 3** (demande l'horloge murale, que `src/sim/`
  ne peut pas lire, et c'est la machinerie même du hors-ligne plafonné)
- Les Fragments et le démantèlement → le sacrifice de fusion en tient lieu
- L'auto-fusion → **jalon 4** (arbre de Refonte)
- Les talents aux rangs intermédiaires +1/+2/+3
- La migration vers `break_infinity.js` — les valeurs restent loin de la précision de `number`

---

## 11 · Vérification

**Tests unitaires** (vitest, colocalisés) :

- *Sauvegarde* — aller-retour de sérialisation ; blob corrompu → partie neuve **et** blob recopié
  sous la clé de secours. Le schéma naissant à `1`, il n'existe aucune version antérieure réelle :
  le test de migration en fabrique une (`v: 0`) pour prouver que le chemin existe. C'est tout
  l'intérêt de bâtir le mécanisme maintenant — la forme du méta changera au 2b puis au jalon 3.
- *Coffres* — chaque distribution somme à 1 ; **les deux pity** : dix tirages Arène sans
  Excellent naturel en produisent un au dixième, trente pour Mythique, et le compteur retombe à
  zéro (critère d'acceptation explicite de la roadmap).
- *Fusion* — les quatre paliers ; le niveau conservé au maximum ; le refus quand un composant
  manque ; la pièce équipée remplacée par le résultat.
- *Pièce* — `rarityMult` ; l'étiquette de rang au-delà de 11 (Légende +N).
- *Talents* — un test par talent sur une valeur observable.
- *Déterminisme* — le test existant reste vrai **au mot près** ; plus un nouveau : ouvrir des
  coffres entre deux salles ne change pas l'issue du run.

**Vérification navigateur** — elle compte plus que les tests. Au jalon 1.5, sur huit défauts
réels, **aucun** n'a été attrapé par un test ni par une relecture de code ; tous sont sortis du
navigateur. Donc `npm run dev`, `http://localhost:5173/spinforge/` (la racine renvoie 404,
`base: '/spinforge/'`), et captures Playwright : écran Coffres, une ouverture ×10, l'inventaire
chargé, une fusion, la Forge avec ses talents actifs.

À juger à l'œil, sur capture : la révélation se lit-elle ; distingue-t-on les rangs au premier
coup d'œil ; l'inventaire tient-il à 390 px de large sans débordement ; et — le plus important —
**un rechargement de page conserve-t-il vraiment tout**.

**Calibration** — `npm run calibrate`, autopilote headless (la simulation étant pure, aucun
navigateur n'est nécessaire), cinq graines, conservé cette fois plutôt que jeté : le jalon 3 en
redemandera. Il doit établir que le chapitre 1 se valide toujours en ~2 h — l'économie de base ne
bouge pas, c'est un garde-fou de non-régression — puis mesurer les gemmes par heure et régler le
gain du boss sur la cible du § 6.4, ainsi que les deux seuils de vitesse d'*Estoc* et de
*Frôlement*.

Le garde-fou de non-régression est **≈ 21 runs**, chiffre retrouvé à l'identique de part et
d'autre du recalibrage du 2026-08-25 ; la durée associée est d'environ **1,8 h** avec la
stratégie « foncer sur le bot le plus proche ». C'est le nombre de runs qui fait foi, la durée
dépendant de la vitesse à laquelle un run se joue.

---

## 12 · Critères d'acceptation

1. On ouvre un coffre Bronze et un coffre Arène, et les pièces obtenues entrent dans l'inventaire.
2. On fusionne jusqu'à **changer de rang**, et le rang affiché change.
3. On équipe une pièce et **le combat en est changé** — au minimum une stat, et un talent visible
   dès qu'un palier nommé est atteint.
   Le partage de charge reste en vigueur : ses deux tests passent toujours.
4. **Les deux pity sont vérifiés par test** (Arène au 10ᵉ, Mythique au 30ᵉ).
5. **Un rechargement de page conserve tout** : crédits, gemmes, inventaire, équipement, niveaux,
   compteurs de pity.
6. Tout l'équilibrage est dans `balance.json` — plus aucune constante d'équilibrage ailleurs,
   `salle.ts` compris.
7. `src/sim/` reste pur et déterministe ; le test de déterminisme existant est inchangé.
8. `npm run test` et `npm run build` verts.
