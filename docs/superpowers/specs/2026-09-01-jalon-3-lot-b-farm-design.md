# Jalon 3, lot B — le farm : spécification de conception

> Spec de référence : `docs/game-design.md`. Lot précédent :
> `docs/superpowers/specs/2026-08-31-jalon-3-lot-a-progression-chapitres-design.md`.
> Découpage du jalon 3 : **A** (le socle, livré) · **B** (le farm, ce document) ·
> **C** (le contenu) · **D** (la sauvegarde).

## État des lieux

Le lot A a posé la mémoire numérotée de ce qu'on a validé (`MetaState.bestChapter`), la
frontière de run explicite (`RunState.phase === 'won'`) et la porte unique du cycle de vie
(`startRun`, qui borne elle-même le chapitre). Trois pièces posées **pour** ce lot-ci : le
farm avait besoin de savoir quoi rejouer, de savoir où une descente se termine, et d'une
porte qu'aucun appelant ne peut contourner.

Ce qui manque : le jeu ne tourne que quand un doigt le pilote. Fermer l'onglet ne rapporte
rien, et le laisser ouvert sans y toucher ne rapporte rien non plus. Le pilier économique
n° 3 de `docs/game-design.md` — « ~60 % des **revenus** viennent de l'idle » — n'a aujourd'hui
aucune implémentation.

## Ce que ce lot livre, en une phrase

Un autopilote déterministe dans `src/sim/`, et un **mécanisme unique de farm** qui s'en sert
des deux côtés : à l'écran quand personne ne joue, et au retour quand l'app était fermée —
sans jamais franchir une salle non validée.

---

## 1 · Les sept décisions

Prises en brainstorming, avant toute ligne de code. Chacune est tranchée, pas ouverte.

1. **L'autopilote est extrait bit à bit du harnais**, jamais réécrit ni amélioré. La preuve
   d'innocuité est que les huit garde-fous de `npm run calibrate` ressortent identiques.
2. **Le hors-ligne rejoue de vrais ticks sur toute la durée**, sans formule fermée — mesure
   à l'appui contre la lettre de `docs/game-design.md` (§ 4.2).
3. **Le taux idle s'applique au temps simulé, pas aux gains** : absent 4 h à 20 % ⇒ on simule
   48 min de farm réel. Un seul chiffre gouverne crédits, gemmes et coffres à la fois.
4. **Taux fixe + bonus de retour** au-delà d'un seuil d'absence, plutôt qu'une courbe par
   paliers : l'équilibrage courant et le ressort de rétention se règlent séparément.
5. **Le farm s'arrête salle 9** — il ne combat jamais le boss. Le pilier passe de « respecté »
   à « structurellement inviolable » (§ 3.2).
6. **L'AUTO est un décor qui ne crédite rien** ; le crédit vient du même `farm()` que le
   hors-ligne. Un seul mécanisme, un seul jeu de tests.
7. **Il n'y a pas de publicité dans ce jeu**, et il n'y en aura pas. Ce n'est pas un report :
   `docs/game-design.md` est corrigé en conséquence (§ 7.1).

**Décision annulée en cours de route.** « La difficulté doit scaler avec le niveau du
joueur » a été demandée puis retirée par son auteur : les niveaux gardent une **difficulté
fixe**, le joueur progresse pour passer le palier suivant. C'est le comportement actuel
(`bot.scaling`, indexé sur salle et chapitre, jamais sur la puissance du joueur) — donc rien
à changer. Consigné ici parce qu'une décision retirée qu'on ne note pas est une décision qui
revient.

---

## 2 · L'autopilote — `src/sim/autopilot.ts`

### 2.1 Ce qui déménage, et ce qui n'est pas touché

`steerWithTerrain` et son aide `nearestBreach` vivent aujourd'hui dans
`scripts/calibrate.mjs`. Elles deviennent `src/sim/autopilot.ts`, **sans un mot changé** :
mêmes constantes (26 px de dépassement, seuil de 18 px), même ordre de tests, même repli
d'angle dans `[-π, π]`. Le harnais les **importe** au lieu de les définir.

`counterFor`, `openLoot`, `spend` et `simulate` **restent dans le harnais** : ce sont des
politiques de mesure, pas de jeu. Le farm n'achète rien et ne contre-pioche pas.

### 2.2 Pourquoi l'extraction, et pourquoi bit à bit

La tentation de réunir les deux est bonne — un seul pilote dans le projet, et le farm joue
littéralement ce que le harnais mesure. Le danger est que **changer la politique du harnais
change tous les chiffres de référence du projet d'un coup**. D'où la règle : le déménagement
est un déplacement de texte, et sa neutralité est *prouvée par mesure*, pas supposée.

**Étalon relevé sur `origin/main` au démarrage de ce lot — c'est-à-dire sur `764f220` — et
reproduit à l'identique par l'extraction :**

| | validé | cumulé | marginal | descentes | plus meurtrière |
|---|---|---|---|---|---|
| ch. 1 | 10/10 | 0,32 h | +0,32 h | 9 | salle 10, 23 morts |
| ch. 2 | 10/10 | 0,47 h | +0,15 h | 3 | salle 10, 8 morts |
| ch. 3 | 10/10 | 0,58 h | +0,10 h | 2 | salle 10, 5 morts |
| ch. 4 | 10/10 | 0,94 h | +0,36 h | 6 | salle 10, 18 morts |

Plus : premier coffre 0,00 h · passivité jamais validée en 20 h · écart entre châssis ×3,80 ·
verrou du châssis actif · salle 10 la plus meurtrière dans **chaque** chapitre. Vecteur de
morts par salle du chapitre 1 : `0,0,1,0,10,9,21,18,15,23`.

**Un seul de ces nombres qui bouge signifie que l'extraction n'était pas neutre** — et le
correctif est alors de rendre l'extraction neutre, jamais d'accepter le nouveau chiffre.
C'est cette règle-là qui a été appliquée pendant tout le lot, et elle a tenu : aucun des huit
garde-fous n'a bougé d'un chiffre entre `764f220` et la fin du lot.

> **Mise à jour (intégration de `main`, 2026-09-02) — l'étalon ci-dessus est DATÉ ; il n'est
> plus reproductible, et ce n'est pas le lot B qui l'a déplacé.**
>
> `main` a livré `fc827ee`, « le contact se cherche sur le trajet du tick, plus sur son
> arrivée » : la détection de contact était discrète — les positions étaient intégrées sur
> 100 ms entières, puis le chevauchement n'était testé qu'à l'arrivée — et une toupie rapide
> traversait donc sa cible. `contactTime` résout désormais le contact sur le **trajet** du
> tick, et `takeShard` mesure la distance au segment parcouru plutôt qu'au point d'arrivée.
> Le commit le mesure lui-même : **97 chocs encaissés contre 78**, soit près d'un quart des
> collisions qui étaient perdues. Un autopilote qui encaisse un quart de chocs en plus meurt
> davantage, et tout l'équilibrage se déplace avec lui.
>
> **Nouvelle ligne de base, relevée après la fusion :**
>
> | | validé | cumulé | marginal | descentes | plus meurtrière |
> |---|---|---|---|---|---|
> | ch. 1 | 10/10 | 0,42 h | +0,42 h | 20 | salle 10, 72 morts |
> | ch. 2 | 10/10 | 0,54 h | +0,12 h | 2 | salle 10, 30 morts |
> | ch. 3 | 10/10 | 0,69 h | +0,15 h | 3 | salle 10, 16 morts |
> | ch. 4 | 10/10 | 0,77 h | +0,08 h | 5 | salle 10, 33 morts |
>
> Plus : premier coffre 0,00 h · passivité jamais validée · verrou du châssis actif · salle 10
> la plus meurtrière dans **chaque** chapitre — ces quatre-là n'ont pas bougé. Vecteur de morts
> par salle du chapitre 1 : `0,0,0,1,15,17,34,25,35,72`. **Écart entre châssis ×10,80**, contre
> ×3,80 : c'est le seul garde-fou dont le déplacement est une alerte d'équilibrage et pas un
> simple recalage — voir « Née de l'intégration » dans `docs/roadmap.md`.
>
> **Le déplacement est entièrement dû à `fc827ee`.** Prouvé et non supposé : cette ligne de
> base est identique sur `main` seul et sur l'arbre fusionné. Le lot B n'y ajoute rien, ce qui
> est exactement ce que l'étalon d'origine servait à établir — la démonstration de neutralité
> reste valide, c'est seulement la référence à laquelle on la compare qui a changé.
>
> L'étalon de `764f220` est **conservé** ci-dessus plutôt qu'écrasé : c'est contre lui que la
> neutralité de l'extraction a été prouvée, et effacer la mesure rendrait la preuve
> invérifiable. Ce qu'il ne faut plus faire, c'est le traiter comme la cible d'une remesure.

### 2.3 Ce que l'extraction ne corrige pas

Le harnais **n'équipe jamais une pièce tirée et n'appelle jamais la fusion** (dette « Le
modèle du harnais de calibration », `docs/roadmap.md`). Ce lot **ne corrige pas** ce défaut :
le corriger changerait tous les chiffres au moment précis où ils servent d'étalon. La dette
reste ouverte, et son énoncé est mis à jour pour dire que le lot B l'a laissée sciemment.

---

## 3 · Le farm — `src/sim/farm.ts`

### 3.1 La porte

```ts
/** La descente que le farm a en cours. Vit entre deux appels : sans elle, chaque
 *  appel repartirait en salle 1 (§ 3.1.1). Jamais sauvegardée — fermer l'app en
 *  plein farm équivaut à abandonner la descente, comme en jeu piloté. */
export interface FarmSession {
  run: RunState | null;
  chapter: number;      // le chapitre de `run` — sert à détecter un bestChapter qui a monté
  carry: number;        // secondes reçues mais pas encore converties en ticks
}

export interface FarmReport {
  seconds: number;      // temps de jeu réellement simulé
  credits: number;      // crédits gagnés
  gems: number;         // toujours 0 — voir § 3.2
  chests: Record<ChestKind, number>;
  salles: number;       // salles vidées
  chapter: number;      // le chapitre farmé, pour l'écran de retour
}

export function newFarmSession(): FarmSession;
export function farm(
  meta: MetaState, session: FarmSession, seconds: number, seed: number,
): FarmReport;
```

> **Corrigé après la relecture de branche.** Le rapport portait aussi un
> `runs: number` — « descentes ouvertes ». Écrit à deux endroits, lu nulle part : ni écran,
> ni test, ni harnais. Retiré (§ 11).

`farm` fait avancer `session` de `seconds` de jeu, applique au méta ce qu'elle produit et
retourne le compte rendu — l'écran de retour n'a rien à recalculer. Elle est **pure au sens
du projet** : aucun `Date`, aucun `Math.random`, aucun DOM. Le temps réel lui est **fourni**
par l'appelant, converti en secondes de jeu ; il n'entre jamais dans `src/sim/`.

Elle ne fait rien et retourne un rapport vide si `meta.bestChapter === 0` : il n'y a alors
aucun chapitre validé à rejouer.

### 3.1.1 Pourquoi la session, et pas seulement une durée

Le hors-ligne appelle `farm` **une fois** avec 48 minutes ; l'AUTO l'appelle **en continu**
avec de petits paquets. Sans état de continuité, chaque paquet ouvrirait une descente neuve
et l'abandonnerait aussitôt : l'AUTO ne verrait jamais que des salles 1, quand le hors-ligne
enchaîne les dix. Comme le revenu croît en `1,13^(salle−1)`, les deux faces du farm
paieraient des tarifs très différents — l'inverse exact de ce que la décision 6 promet.

La session est donc **la** pièce qui rend « un seul mécanisme » vrai plutôt qu'annoncé. Le
hors-ligne en crée une, s'en sert, la jette ; l'AUTO garde la sienne vivante entre les
paquets. Même code, même rendement par minute.

**Si `meta.bestChapter` a monté** depuis l'ouverture de la descente en cours (le joueur vient
de valider un chapitre en pilotant), la session est repartie sur le nouveau chapitre : le
farm suit toujours le meilleur chapitre validé, sans attendre la fin d'une descente en cours
sur l'ancien.

**`carry` répond au même défaut sur l'autre axe.** La simulation avance par pas fixes de
100 ms, mais rien ne garantit qu'un paquet vaille un nombre entier de ticks : à un taux de
15 %, un paquet d'une seconde réelle vaut 0,15 s de jeu, soit un tick et demi. Tronquer à
chaque paquet perdrait la moitié de ce tick **à chaque fois** — un tiers du farm évaporé sans
que rien ne le signale. Les secondes non converties sont donc reportées au paquet suivant, ce
qui rend `farm` exacte pour n'importe quel taux plutôt que pour les seuls taux qui tombent
juste.

### 3.1.2 La graine et la continuité du flux

`seed` n'ouvre que la **première** descente d'une session. Chaque descente suivante prend
`run.rngState` de celle qu'elle remplace — le flux continue, exactement comme le fait le
bouton « Nouvelle descente » de l'écran de combat depuis le lot A.

C'est ce qui rend vrai le test du § 8.1 : si la graine d'une descente dépendait du paramètre
`seed` plutôt que du flux, découper le même temps en paquets différents produirait des
descentes différentes, et « N petits paquets valent un gros paquet » serait faux.

### 3.2 Le farm s'arrête salle 9 — le pilier devient inviolable

Dès que la descente atteint `SALLES_PER_CHAPTER`, elle est **abandonnée** et une nouvelle
s'ouvre en salle 1. Le farm ne combat jamais le boss.

Trois conséquences, toutes voulues :

- **Aucune progression n'est mécaniquement possible.** `applyRunReward` ne fait monter
  `bestChapter` que sur `reward.boss`. Un farm qui ne bat jamais de boss ne peut pas
  déclencher ce `Math.max`, quoi qu'il arrive. Le critère du jalon — « l'AUTO ne franchit
  jamais une salle non validée » — cesse d'être une convention à tenir pour devenir une
  propriété du code. C'est plus fort que ce que le lot A garantissait : `startRun` empêchait
  d'*ouvrir* un chapitre non débloqué, le farm s'interdit désormais d'en *terminer* un.
- **Le farm ne rapporte aucune gemme.** `ECON.bossGems` n'est versé que par le boss. Les
  gemmes deviennent **exclusivement actives**, ce qui est exactement ce que dit
  `docs/game-design.md` (« Gemmes (premium — boss, quêtes) ») et ce qui garde une raison de
  piloter soi-même quand le farm tourne.
- **Le farm ne rapporte ni Arène garanti ni Mythique.** Les deux sont du butin de boss
  (`loot.boss`). Le farm tire du Bronze à chaque salle et de l'Arène à 20 % à partir de la
  salle 4 — le robinet du jalon 2.5, sans son étage haut.

**La règle vit dans la boucle de farm, jamais dans `tick()`.** Le jeu piloté garde son boss
intact : `src/sim/sim.ts` n'est pas modifié par ce lot.

### 3.3 Le chapitre farmé

`meta.bestChapter`, et lui seul. Pas de choix offert au joueur : le pilier dit « rejouent le
meilleur chapitre jamais validé ». `farm` appelle `startRun(meta, meta.bestChapter, …)` —
dont la borne `maxPlayableChapter` est alors non contraignante, ce qui est le signe qu'on est
du bon côté.

### 3.4 Le châssis

Celui du méta (`meta.toupies.active`), lu par `startRun` comme pour toute descente. Le farm
n'a aucune politique de châssis : contre-piocher est une décision de joueur, et le verrou du
châssis s'applique à ses descentes comme aux autres.

### 3.5 L'équipement

`farm` appelle `syncRunStats` après chaque salle vidée, comme le fait la boucle de jeu — les
pièces prennent effet dans la seconde. Elle **n'achète rien** : elle ne dépense ni crédits en
améliorations ni en coffres. Le farm est un robinet, pas un joueur.

---

## 4 · Le temps

### 4.1 La formule

```
tempsSimulé = min(absence, offline.capHours) × offline.rate × bonus
bonus       = absence ≥ offline.winbackAfterHours ? offline.winbackMult : 1
```

L'absence est plafonnée **avant** l'application du taux : le plafond porte sur le temps
d'absence, pas sur le temps simulé.

En dessous de `offline.minSeconds`, `farm` n'est pas appelée et aucun écran ne s'ouvre — sans
quoi un simple rechargement de page afficherait un bilan.

**Le paquet en ligne obéit au même plafond**, et c'est une correction de la relecture de
branche (§ 11) : la formule ci-dessus vivait dans `offlineSeconds`, mais le paquet du décor
faisait son calcul à la main dans `App.tsx`, sans borne. Les deux ont maintenant chacun leur
fonction pure dans `src/sim/farm.ts` :

```
offlineSeconds(absence) = min(absence, offline.capHours) × offline.rate × bonus
onlineSeconds(écoulé)   = min(écoulé,  offline.capHours) × offline.rate
```

Trois différences, toutes délibérées. `onlineSeconds` n'accorde **pas** le bonus de retour —
il récompense une absence, pas une veille. Elle n'applique **pas** `minSeconds` — ce seuil
n'existe que pour ne pas ouvrir un écran de bilan sur un rechargement de page, et un paquet
en ligne n'ouvre aucun écran ; ce qui ne fait pas un tick entier est de toute façon reporté
par le `carry` de la session (§ 3.1.1). Elle rend 0 sur une durée nulle ou négative, comme sa
sœur.

**Pourquoi le plafond doit valoir sur les deux chemins.** Les minuteries d'un onglet suspendu
ne tournent pas. Un portable refermé 24 h faisait tirer 86 400 s au premier paquet du réveil :
288 min de jeu créditées au lieu des 72 que le plafond autorise (×3,9), et 197 ms de gel du
fil principal — ×11,8 et 570 ms à 72 h. Cela contredisait frontalement la promesse du § 5.1
et ruinait la calibration du taux idle, qui est bâtie sur ce plafond. **Un plafond qui ne vaut
que sur un chemin n'est pas un plafond.**

### 4.2 Pourquoi de vrais ticks, contre la lettre de la spec

`docs/game-design.md` prescrit « fast-forward de ticks (formule fermée au-delà d'1 h) ». La
formule fermée était une optimisation contre un coût qui n'existe pas. **Mesuré** sur la
machine de développement, autopilote branché :

| durée simulée | coût |
|---|---|
| 1 h | 50 ms |
| 4 h (plafond) | **136 ms** |
| 12 h (plafond du jalon 4) | 389 ms |

Et le plafond de 4 h n'est jamais simulé en entier : à 20 %, 4 h d'absence coûtent 48 min de
simulation, soit ~28 ms. La formule fermée achèterait des millisecondes contre une
approximation, deux chemins de code et deux jeux de tests. Elle est **écartée**.

**Ce que cela laisse ouvert** : la mesure vient d'un ordinateur de bureau. Un mobile bas de
gamme est 5 à 10 fois plus lent, soit 0,7 à 1,4 s pour un plafond de 4 h simulé en entier —
jamais atteint au taux retenu, mais à remesurer si le taux ou le plafond montent (jalon 4,
plafond 12 h par l'arbre d'atouts).

### 4.3 Où vit l'horodatage

`MetaState.lastSeenAt: number` — millisecondes epoch. **Écrit par la couche storage**
(`src/storage/localSave.ts`), jamais par `src/sim/`, qui n'a pas le droit de lire `Date`.
C'est la même discipline que `rngState` : la donnée vit dans le méta, la source vit dehors.

`0` signifie « jamais vu » : premier lancement, ou sauvegarde antérieure au schéma 6. Aucun
écran de retour n'est alors affiché.

### 4.4 La sauvegarde — schéma 5 → 6

`SAVE_SCHEMA` passe à 6. La migration tient dans `hydrate` : un blob antérieur est, par
construction, un méta auquel il manque `lastSeenAt`, qui retombe à `0` — exact.

Normalisation, à l'image de ce que le lot A a dû ajouter pour `bestChapter` : un
`lastSeenAt` négatif, fractionnaire ou dans le futur produirait une absence absurde. Il est
tronqué et borné à `≥ 0` à l'hydratation, et une absence négative (horloge reculée) est
traitée comme une absence nulle.

`isComplete` gagne `typeof m.lastSeenAt === 'number'`.

---

## 5 · L'AUTO — le décor

### 5.1 Ce que c'est, et ce que ce n'est pas

Quand **aucune partie n'est en cours** et que `meta.bestChapter ≥ 1`, une descente tourne en
fond, visible derrière les écrans, sur tous les onglets. Elle n'est **pas jouable** : le doigt
ne la pilote pas, et elle ne crédite rien.

**Le décor porte donc une invite permanente** — ajoutée par la relecture de branche (§ 11),
sans laquelle le jeu était injouable. Sur l'onglet Combat, tant que le décor tourne, un
panneau posé bas offre le choix du chapitre et le bouton qui part. Ce n'est pas un voile
plein écran comme celui de fin de descente : le décor doit rester visible derrière, c'est
tout son objet. Le panneau lui-même est le **même composant** que celui du voile
(`RunPicker`), monté à deux endroits — deux panneaux de choix de chapitre divergeraient.

**Deux métas, et pas un.** Le décor lit le **vrai** méta pour tout ce qu'il montre et tout ce
qu'il lance : art équipé, pastilles de chapitre, et le `startRun` de l'invite. Un clone
jetable n'existe que pour **encaisser les récompenses** de la boucle de rendu, qu'on jette
avec lui — c'est ainsi que « le décor ne crédite rien » est tenu. Faire tourner le décor
tout entier sur un clone pris au montage aurait fait partir le joueur sans les pièces qu'il
venait d'acheter, sans son châssis actif, et sur un `bestChapter` antérieur au rattrapage
hors-ligne.

Le crédit vient de `farm()`, appelée par paquets réguliers sur une **session vivante**
(§ 3.1.1) pendant que le décor tourne, avec le même taux **et le même plafond** que le
hors-ligne (§ 4.1). Fermer l'app ou la laisser ouverte rapporte donc **exactement la même
chose par minute** — il n'y a aucune stratégie à optimiser contre le jeu.

**Le farm tourne dès que la descente pilotée n'avance pas**, et pas seulement quand aucune
partie n'est en cours : quitter l'onglet Combat gèle la boucle de jeu, et vingt minutes
passées à la Forge doivent payer ce que fermer l'app aurait payé.

**La cadence des paquets est un détail sans conséquence sur les gains** : la session étant
continue, appeler `farm` une fois par seconde ou une fois par minute produit la même suite de
descentes. Le choix se fait donc sur le confort — assez souvent pour que les compteurs
montent visiblement, assez rare pour ne rien coûter au rendu. Une seconde réelle convient et
coûte, au taux retenu, deux ticks de simulation.

### 5.2 Le changement d'architecture dans `App.tsx`

Aujourd'hui l'app démarre toujours sur un run en cours (`useState(() => startRun(…))`) et
`runRef.current` est toujours une partie. Ce lot introduit deux états distincts :

- **partie pilotée** — le joueur l'a lancée, son doigt pilote, le boss est atteignable, les
  gains sont pleins ;
- **décor AUTO** — personne ne joue, l'autopilote pilote, la salle 10 n'est jamais jouée, les
  gains viennent de `farm()`.

Le passage de l'un à l'autre : lancer une descente depuis l'écran de combat — voile de fin de
descente ou invite du décor, c'est le même `RunPicker` — entre en partie pilotée. On en sort
en **quittant l'onglet Combat une fois la descente close**, et non à la fin de la descente
elle-même : le voile doit rester atteignable tant qu'on reste sur l'onglet, sans quoi le
choix du chapitre suivant disparaîtrait avant d'avoir été lu.

### 5.3 Déblocage

`meta.bestChapter ≥ 1`, la même condition que le hors-ligne — une seule règle pour les deux
faces du farm. La mention « AUTO débloqué au chapitre 3 » de `docs/game-design.md` est
corrigée (§ 7.1) : un décor de fond qui n'apparaît qu'au troisième chapitre laisserait une
fenêtre où fermer l'app rapporte alors que la laisser ouverte ne rapporte rien.

---

## 6 · L'écran « Pendant ton absence »

S'ouvre au chargement quand l'absence dépasse `offline.minSeconds` et que
`meta.bestChapter ≥ 1`. Il annonce la durée d'absence prise en compte, le chapitre farmé, les
crédits et les coffres gagnés, et le bonus de retour s'il s'est appliqué. Un seul bouton :
réclamer.

**Pas de ×2, et pas de publicité** — ni maintenant ni plus tard (§ 1, décision 7).

Textes en français **et** en anglais, par clés de catalogue dans `src/i18n/fr.ts` et
`src/i18n/en.ts`, comme toute chaîne joueur depuis le jalon i18n.

---

## 7 · Les documents de référence

### 7.1 `docs/game-design.md` — trois corrections

1. **La publicité disparaît.** La phrase « ×2 contre pub récompensée ou gemmes. Pubs toujours
   optionnelles (×2 gains 15 min, coffre gratuit, relance de boss) » est retirée. Décision de
   l'auteur du jeu : il n'y aura pas de publicité.
2. **La formule fermée disparaît** de la description de la stack, remplacée par « fast-forward
   de ticks », avec la mesure qui le justifie.
3. **L'AUTO est disponible dès le premier chapitre validé**, et non au chapitre 3.

### 7.2 `docs/roadmap.md`

La section « Lot B » est rédigée à la livraison, sur le modèle du lot A : ce qui est livré, ce
qui est mesuré, les dettes fermées et celles ouvertes.

---

## 8 · Vérification

### 8.1 Les tests à vérifier par mutation

Un test qui prouve un mécanisme doit rougir quand on retire le mécanisme. Ce projet a
attrapé six tests menteurs sur les derniers lots par ce moyen, dont deux que le plan
lui-même rendait incapables d'échouer. Les quatre à vérifier :

| Test | Mutation qui doit le faire rougir |
|---|---|
| le farm ne fait jamais monter `bestChapter` | retirer l'abandon salle 9 : le farm bat le boss, `bestChapter` monte |
| le farm ne rapporte aucune gemme | même mutation |
| `farm` est déterministe à graine égale | faire lire une source de hasard hors `rngState` |
| le temps simulé suit taux et plafond | retirer le plafond, ou le taux |
| **N petits paquets valent un gros paquet** | jeter la session entre deux appels (§ 3.1.1) |

Le dernier test est celui qui garde la promesse « un seul mécanisme » : il compare le rapport
cumulé de N appels de `d` secondes au rapport d'un seul appel de `N × d` secondes, sur la même
graine. Les deux doivent être **identiques**, pas seulement proches — c'est ce qui prouve que
l'AUTO et le hors-ligne paient bien le même tarif. Il naît d'un défaut trouvé pendant
l'auto-relecture de cette spec, où `farm` ne portait pas encore de session.

**Piège à éviter, déjà rencontré au lot A** : un test qui vérifie `bestChapter` après un farm
sur `bestChapter = 4` ne peut pas échouer, `MAX_CHAPTER` valant 4. Il doit farmer un chapitre
strictement inférieur au maximum.

### 8.2 Les garde-fous de calibration

`npm run calibrate` après l'extraction, comparé **ligne à ligne** à l'étalon du § 2.2. La
comparaison est exacte, pas approximative.

### 8.3 En navigateur, par moi et pas par délégation

`npm run dev` sur un port dédié, en vérifiant le **contenu servi** avant toute mesure — un
port est une adresse, pas une identité, et ce dépôt fait tourner plusieurs sessions en
parallèle. À vérifier de mes yeux : le décor tourne en fond sur tous les onglets ; lancer une
partie l'interrompt ; le décor ne franchit jamais la salle 10 ; l'écran de retour s'affiche
avec des chiffres cohérents ; les deux langues.

`npm run verrou` doit rester vert : le farm ne doit pas déplacer le châssis.

### 8.4 La dette de performance du jalon 1.5

**Remesurer d'abord.** La mesure de référence (médiane 58,8 images/s, p90 à 25,5 ms sous
throttling ×4) est antérieure à la refonte graphique, qui a beaucoup alourdi le rendu, et
antérieure à ce lot, qui fait tourner l'arène **en continu sur tous les écrans**. Les deux
suspects nommés dans la roadmap — la texture du sol régénérée à chaque pixel de
redimensionnement, la porte retracée en `Graphics` à chaque image — sont des hypothèses de
2026-08-25 qu'aucune mesure récente n'a confirmées.

L'ordre est : mesurer, nommer le coupable par la mesure, corriger, remesurer. Jamais corriger
un suspect nommé sans l'avoir vu coupable.

---

## 9 · Hors périmètre

- **Le lot C** (gimmicks des chapitres 2-4, atout temporaire par salle, quêtes) et le
  **lot D** (IndexedDB, export). `lastSeenAt` va dans le méta localStorage existant.
- **Le plafond hors-ligne à 12 h** : il vient de l'arbre d'atouts, jalon 4. Le plafond est lu
  depuis la configuration, donc l'atout n'aura rien à redécouper.
- **Corriger le modèle du harnais de calibration** (§ 2.3).
- **Interdire l'amélioration pendant une partie pilotée** : demandé pendant le brainstorming,
  consigné dans `docs/ameliorations.md`. Hors de ce lot parce que le harnais améliore
  justement entre deux salles — l'interdire déplacerait les huit garde-fous au moment précis
  où ils servent d'étalon à l'extraction de l'autopilote.
- **Des récompenses de progression par niveau** : demandé pendant le brainstorming, consigné.
  Voisin des quêtes du lot C.

## 10 · Ce que ce lot laisse ouvert

- Le taux idle et le bonus de retour sont posés à des valeurs de départ **mesurées dans leur
  propre passe**, après la livraison du farm et dans leur propre commit — jamais le combat et
  l'économie dans la même passe.
- Le décor AUTO montre une descente qui ne correspond pas, salle pour salle, à ce que `farm()`
  a crédité. C'est un choix assumé (§ 5.1), pas un oubli : le décor est libre, le crédit est
  exact. À rouvrir si un test joueur montre que l'écart se remarque.

---

## 11 · Ce que la relecture de branche entière a corrigé

Écrit **après** la livraison, contre le code réel. Ce document décrivait une conception ; les
sections ci-dessus ont été corrigées en place pour qu'il décrive aussi ce qui tourne. Cette
section-ci dit ce qui a bougé, et pourquoi le noter compte : aucun de ces cinq points n'a été
trouvé par les tests, ni par les relectures tâche par tâche, ni par les vérifications en
navigateur faites pendant l'exécution du plan. Tous l'ont été en relisant la branche entière
d'un bloc.

**Deux défauts graves, invisibles tâche par tâche parce qu'ils naissent d'une interaction.**

1. **Le jeu devenait injouable dès qu'un chapitre était validé.** Le seul code qui repasse en
   partie pilotée est déclenché par le bouton du voile de fin de descente ; or en décor, le
   run est remplacé dès qu'il se ferme, dans le même bloc synchrone que le tick — aucun rendu
   ne voit jamais une descente close, donc le voile ne s'affiche jamais, donc le bouton
   n'existe jamais. Le doigt étant par ailleurs inerte en décor, il ne restait aucun moyen de
   lancer une descente. Chaque moitié de ce mécanisme était correcte et testée ; c'est leur
   rencontre qui fermait le jeu. Corrigé par l'invite permanente du § 5.1.
2. **Le plafond de 4 h était contournable en laissant l'app ouverte**, jusqu'à ×11,8 après
   72 h de veille. Le hors-ligne plafonnait, le paquet en ligne non — deux chemins pour une
   seule règle, et un seul des deux la portait. Corrigé par `onlineSeconds` (§ 4.1), qui
   déplace la règle dans `src/sim/farm.ts` où elle est **testable**, et l'y prouve par
   mutation comme l'exige le § 8.1.

**Trois corrections mineures.**

3. Le farm ne tournait pas pendant qu'une descente pilotée était gelée sur un autre onglet :
   vingt minutes à la Forge rapportaient zéro là où fermer l'app les aurait payées (§ 5.1).
4. Le décor tournait pour tout sur un clone du méta pris au montage, écran de fin compris —
   le clone n'est plus que le puits de récompenses (§ 5.1).
5. `FarmReport.runs` était du code mort (§ 3.1), et l'écran des toupies annonçait « Tu pilotes
   X » pendant que le décor tournait, alors que le joueur ne pilotait rien.

**Une correction de conception, décidée par l'auteur du jeu après vérification en navigateur.**

6. **L'invite du décor propose par défaut `maxPlayableChapter`**, et non le chapitre que le
   décor rejoue. En décor, `run.chapter` vaut `bestChapter` — c'est correct, le farm rejoue le
   meilleur chapitre validé — mais en hériter renvoyait le joueur qui revient sur du contenu
   déjà fait, à moins qu'il ne remarque la seconde pastille. Le défaut est donc le chapitre le
   plus haut qu'il ait le droit de jouer, cohérent avec le voile qui suggère `chapter + 1`
   après une victoire et avec la descente initiale de l'app avant ce lot. **Seul le défaut
   change** : les pastilles inférieures restent offertes, farmer un chapitre plus facile reste
   un choix de joueur.

**L'enseignement, pour les lots suivants.** Une relecture tâche par tâche vérifie que chaque
pièce fait ce qu'elle annonce. Elle ne peut pas voir qu'une pièce correcte en rend une autre
inatteignable, ni qu'une règle posée à deux endroits n'est tenue qu'à un seul. Ces deux
familles de défauts — l'interaction et la règle à moitié appliquée — sont exactement ce que la
relecture de branche entière attrape, et rien d'autre dans ce projet ne les attrape.
