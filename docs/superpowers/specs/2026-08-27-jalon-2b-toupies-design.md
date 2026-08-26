# Jalon 2b — Les toupies

> Spec de conception, arrêtée le 2026-08-27. Référence de game design :
> `docs/game-design.md` et la planche Catalogue du canvas (`design/Catalogue.dc.html`).
> Roadmap : `docs/roadmap.md`. Jalon précédent :
> `docs/superpowers/specs/2026-08-25-jalon-2a-pieces-design.md`.

## But

Le jalon 2a a transformé quatre entiers en objets : des pièces qui ont un modèle, un rang,
des talents, qui tombent des coffres et qui fusionnent. Il a laissé intacte une bizarrerie
de fond — **le joueur n'a pas de toupie**. Il a quatre emplacements et rien qui les porte.
Les douze modèles génériques sont d'ailleurs identiques en stats, report assumé du 2a : leur
seul rôle est de fragmenter le vivier de fusion.

Ce jalon donne au joueur un corps : quatre châssis, quatre types, un triangle des forces qui
fait qu'un combat se gagne aussi **avant** d'entrer dans l'arène. Il donne aussi enfin un
caractère aux douze modèles génériques.

Deux critères, tirés de la roadmap :

1. **le triangle des forces change l'issue d'un combat** ;
2. **changer de toupie change le pilotage**.

## 1. Périmètre

### 1.1 Dans le jalon

- Quatre Fondateurs : châssis (type + profil de stats) et paire signature Lame/Noyau.
- Types et triangle des forces, appliqué **symétriquement** au joueur et aux bots.
- Table de types de bots par salle, dans l'équilibrage.
- Profils de stats distincts pour les 12 modèles génériques (6 Disques, 6 Pointes).
- Déblocage : un Fondateur offert à la validation du chapitre 1, les deux autres en boutique.
- Doublons signature : les Lames et Noyaux ne tombent des coffres que pour les toupies
  débloquées.
- Onglet Toupies (aujourd'hui verrouillé), migration de sauvegarde schéma 2 → 3.
- Lecture du type d'un bot dans l'arène.

### 1.2 Hors du jalon, et pourquoi

- **Les capacités de Noyau déclenchables** (*Tornade Galopante*, *Spirale Ascendante*,
  *Forteresse*, *Griffe Éclair*). Le canvas les décrit comme déclenchables ; `Input` ne
  contient aujourd'hui que `steer`. Une couche active demande un canal d'entrée, une recharge
  sérialisée dans le run, un retour visuel et sonore, et quatre comportements de simulation —
  c'est un jalon à soi seul. Reporté au jalon 4, avec la Saison 1. Les douze talents de rang
  restent seuls maîtres de la couche « effet spécial » au 2b.
- **La rotation gauche** (« chocs frontaux amplifiés contre rotation droite »). Aucun des
  quatre Fondateurs n'en est ; les deux toupies concernées, *Drake Nocturne* et *Wyrm Doré*,
  appartiennent à la Saison 1. Rien à implémenter avant elle.
- **Les chapitres 2 à 8.** `createRun` fixe `chapter: 1` en dur et `meta.chapterValidated`
  est un booléen : il n'existe qu'un chapitre jouable. La table de types est donc écrite pour
  le chapitre 1 seul, mais **indexée par chapitre** dès maintenant pour que les suivants
  n'aient qu'à ajouter des lignes.

## 2. Le modèle de données

### 2.1 La toupie n'est pas un emplacement

Une toupie est un **châssis** : un identifiant, un type, un profil de multiplicateurs, et une
paire signature (Lame, Noyau). Le canvas est explicite — « le corps de la toupie elle-même,
porteur du bonus passif de type, **pas un 5ᵉ emplacement** ».

Il est tout aussi explicite sur l'autre versant : « **toutes les pièces sont
interchangeables** ». Donc équiper *Couronne Solaire* sur *Carapace Abyssale* est légal.
« Signature » qualifie **l'origine** d'une pièce et la condition de chute de ses doublons ;
jamais une restriction de port.

Conséquence de conception, voulue : **changer de toupie ne redistribue aucune pièce**.
L'opération est gratuite et réversible, ce qui fait de la contre-pioche une décision vivante
avant chaque run plutôt qu'un engagement qu'on hésite à prendre.

### 2.2 Contenu et équilibrage

Le contenu va dans `src/content/toupies.ts` — identifiants, noms français, type, paire
signature. Les **chiffres** vont dans `src/content/balance.json`, dont `src/sim/config.ts`
reste la porte unique. Aucune constante d'équilibrage ailleurs.

```ts
export type TopType = 'attaque' | 'endurance' | 'defense' | 'equilibre';
export type ToupieId = 'brasier-solaire' | 'typhon-primal' | 'carapace-abyssale' | 'tigre-foudre';

export interface Toupie {
  id: ToupieId;
  label: string;
  type: TopType;
  signature: { lame: string; noyau: string };
}
```

### 2.3 Le méta

`MetaState` gagne :

```ts
toupies: { unlocked: ToupieId[]; active: ToupieId };
founderGiftClaimed: boolean;
```

`founderGiftClaimed` est un champ explicite plutôt qu'une déduction du genre
« `chapterValidated && unlocked.length === 1` » : cette déduction devient fausse dès qu'un
joueur achète une toupie en boutique avant d'avoir réclamé son cadeau.

`unlocked` est une liste, pas un `Set` : elle doit se sérialiser en JSON. L'ordre suit celui
de `TOUPIES` pour que l'affichage soit stable.

### 2.4 Migration schéma 2 → 3

`SAVE_SCHEMA` passe de 2 à 3. Une sauvegarde v2 reçoit :

```
toupies: { unlocked: ['brasier-solaire'], active: 'brasier-solaire' }
founderGiftClaimed: false
```

Un joueur qui avait déjà validé le chapitre 1 sous le 2a retrouve donc **son cadeau en
attente** au retour. C'est le comportement voulu : il a franchi le mur, il a droit à la
récompense que le mur donne désormais.

Le filet de validation appliqué au résultat final de la migration (acquis du 2a) doit couvrir
les nouveaux champs : une `active` absente de `unlocked`, ou un identifiant inconnu, retombe
sur `brasier-solaire`.

### 2.5 `Top` : deux champs de plus

```ts
type: TopType;
mass: number;
```

**`mass` sort de `TalentMods`.** C'est une propriété physique, pas un talent, et trois
systèmes veulent désormais y contribuer : le châssis, le modèle de Disque, et le talent
Masse. `resolveCollision` lit `a.mass` au lieu de `a.talents.mass` ; la valeur `2` de
`talents.masse.mass` ne change pas, puisqu'elle était déjà un multiplicateur de sens
(« compte double »). Les bots portent `mass: 1`.

**`friction` reste dans `TalentMods`**, territoire exclusif du talent Glisse. Aucun modèle de
Pointe n'y touche. La raison est concrète : `talents.glisse.friction` vaut `0.96`, une valeur
**absolue** qui remplace `FRICTION = 0.94`. La faire composer avec des multiplicateurs de
modèle exigerait de la retourner en un facteur `1,021` illisible dans le JSON, pour un gain
nul. Un axe, un système.

## 3. Le triangle des forces

### 3.1 La règle

```
BEATS = { attaque: 'endurance', endurance: 'defense', defense: 'attaque' }

typeMult(att, def) =
  att === 'equilibre'   → 1,10
  def === 'equilibre'   → 1,00
  BEATS[att] === def    → 1,25
  sinon                 → 1,00
```

Fonction pure de deux types, sans état, appelée **des deux côtés** de chaque choc. La
symétrie est le cœur du dispositif : si le type d'un bot domine celui du joueur, le bot
inflige +25 % lui aussi. Sans elle, le triangle serait un bonus gratuit et non une décision.

Équilibre est hors du triangle : il n'est ni dominant ni dominé, donc il ne subit **jamais**
le +25 %. Son +10 % contre tous est un plancher, pas un plafond — il échange une pointe de
25 contre l'immunité au contre. C'est ce qui rend Brasier Solaire défendable sans le rendre
optimal.

Lecture retenue pour le « +10 % partout » du canvas : **des dégâts**, pas des stats. Le
« partout » répond au « sur le type dominé » du +25 % ; les deux parlent de la même
grandeur. Un +10 % sur les quatre stats aurait été bien plus généreux qu'il n'y paraît —
+10 % de spin max et de défense pèsent beaucoup plus lourd que +10 % de dégâts — et aurait
écrasé les trois autres châssis.

### 3.2 Où il entre dans le combat

Un facteur de plus dans `damage()`, à côté de ceux qui existent :

```
(impact × attaque / (attaque + défense))
  × DAMAGE_K
  × chargeWeight(share)
  × bonusEstoc
  × typeMult(att.type, def.type)
```

**Le partage de charge n'est pas touché.** `share` continue de se lire impérativement avant
l'impulsion de rebond ; `chargeWeight` continue de sommer à 2 sur un choc frontal. Le
triangle se **compose** avec lui, il ne le remplace pas. Les trois tests qui verrouillent le
partage de charge doivent rester verts **sans être retouchés** — s'ils demandent le moindre
ajustement, c'est que le triangle a mangé l'acquis, et c'est un signal d'arrêt.

**Ce que ça empile en pire cas.** Assaut pur × Estoc × type dominé = `1,3 × 1,3 × 1,25 =
2,11`, avant que Percée ne retire encore 25 % de la défense adverse. C'est le sommet d'une
panoplie Légende contre-piochée. Plausible comme fantasme de puissance, mais à **mesurer**
(§ 6), pas à supposer.

### 3.3 Le type des bots

Table fixe par salle, dans `balance.json`, indexée par chapitre. Déterministe : le joueur
peut la lire avant d'entrer, donc contre-piocher est un choix et non une devinette. Un
tirage aléatoire aurait fait du triangle de la variance subie.

Chapitre 1 — Hangar Rouillé :

| Salles | Type |
|---|---|
| 1-3 | Endurance |
| 4-6 | Défense |
| 7-9 | Attaque |
| 10 (boss) | Attaque |

Le sens de cette table : la Défense est **punie tôt** (l'Endurance la domine en salles 1-3,
les plus faciles, à un bot) et **récompensée là où ça compte** — les salles 7 à 9, à trois
bots chacune, et le boss. La mesure du jalon 1.5 place 36 morts sur 50 à la salle 10 et 14 à
la suivante : le mur est le boss, et *Carapace Abyssale* en est la réponse. Le joueur paie sa
contre-pioche en début de chapitre et l'encaisse à la fin.

## 4. Les profils

### 4.1 Sept axes, un seul mode de composition

Un **profil** est un jeu de multiplicateurs sur sept axes. Châssis et modèles génériques
puisent dans le **même** jeu : rien n'interdit à un Disque de toucher la vitesse ni à une
Pointe de toucher la masse, et les profils du § 4.3 s'en servent.

| Axe | Champ | Sens |
|---|---|---|
| attaque | `attack` | > 1 est meilleur |
| défense | `defense` | > 1 est meilleur |
| vitesse max | `maxSpeed` | > 1 est meilleur |
| spin max | `spinMax` | > 1 est meilleur |
| accélération | `accel` | > 1 est meilleur |
| masse | `mass` | > 1 pousse et se laisse moins pousser |
| **décroissance** | `spinDecay` | **< 1 est meilleur** — c'est une perte par seconde |

Le piège est la décroissance : `×0,75` veut dire « perd son spin 25 % moins vite », donc
*meilleur*. Tous les autres axes vont dans l'autre sens.

Ce qui distingue les systèmes n'est pas l'axe autorisé mais **l'emphase** :

| Système | Emphase |
|---|---|
| Lame · Noyau (rang + niveau) | attaque · spin max |
| Disque (rang + niveau) | défense |
| Pointe (rang + niveau) | vitesse max · décroissance |
| Modèle de Disque | la masse et la défense — le Disque *est* la masse |
| Modèle de Pointe | le contact au sol : vitesse, décroissance, accélération |
| Châssis | le type, plus le tempérament du corps |
| Talents (rangs 4 / 7 / 11) | tout le reste — friction, impulsion, seuils, riposte, sursis |

Tout **se compose par multiplication**, y compris la décroissance : les multiplicateurs de
profil s'appliquent au `spinDecay` déjà résolu par le rang et le niveau de la Pointe (qui,
lui, **divise** — voir § 5.5). Un Disque *Colosse* à masse ×1,30 porté par une *Carapace
Abyssale* à ×1,40, avec le talent Masse (×2), donne `1,30 × 1,40 × 2 = 3,64`. Rien n'écrase
rien.

`accel` et `mass` sont des axes que **aucune pièce ne touchait** avant ce jalon : `accel`
venait de `PLAYER_BASE` seul, `mass` n'existait que comme champ de talent. Il y avait donc de
la place pour différencier sans inventer de machinerie.

### 4.2 Les quatre châssis

| Toupie | Type | Profil | Ce qu'on doit ressentir |
|---|---|---|---|
| **Brasier Solaire** | Équilibre | **×1 partout** | la référence, la toupie de départ |
| **Typhon Primal** | Attaque | accél. ×1,25 · vitesse ×1,10 · spin max ×0,85 | vif, nerveux, fragile |
| **Carapace Abyssale** | Défense | masse ×1,40 · défense ×1,20 · spin max ×1,15 · accél. ×0,80 | lourde, lente à lancer, encaisse |
| **Tigre Foudre** | Endurance | décroissance ×0,75 · vitesse ×1,05 · attaque ×0,90 | dure longtemps, frappe peu |

Chiffres de départ, **à mesurer et à ajuster** (§ 6). Le critère « changer de toupie change le
pilotage » se juge au doigt dans le navigateur, pas au tableau : c'est `accel` qui porte
l'essentiel de cette sensation, d'où l'écart ×1,25 / ×0,80 entre Typhon et Carapace.

### 4.3 Les douze modèles génériques

Profils de multiplicateurs dans `balance.json`, sur les axes du § 4.1. Point non négociable :
***Lourd* et *Plate*, l'équipement de départ, restent neutres à ×1 sur tous leurs axes.**

C'est le garde-fou structurel du jalon : une sauvegarde neuve ne voit bouger **aucune** stat
de pièce. Tout écart mesuré sur le chapitre 1 vient donc du triangle et de rien d'autre, ce
qui rend la re-calibration du § 6 interprétable.

Disques — l'axe est la masse et la défense :

| Modèle | Profil | Le caractère du canvas |
|---|---|---|
| Lourd | ×1 partout | « masse brute — le standard Défense » |
| Gravité | masse ×1,20 · accél. ×0,90 | « inertie max, démarrage lent » |
| Éventail | défense ×1,10 · décroissance ×0,92 | « large et plat : stabilise l'Endurance » |
| Axial | défense ×1,15 · masse ×0,95 | « centre de gravité bas : anti-basculement » |
| Colosse | masse ×1,30 · défense ×1,25 · vitesse ×0,85 | « le plus lourd du jeu, pénalise la vitesse » |
| Météorite | masse ×1,15 · défense ×0,90 · attaque ×1,10 | « masse asymétrique » |

Pointes — l'axe est le contact au sol : vitesse, décroissance, accélération.

| Modèle | Profil | Le caractère du canvas |
|---|---|---|
| Plate | ×1 partout | « course large et agressive — l'Attaque de référence » |
| Aiguille | décroissance ×0,75 · vitesse ×0,90 | « friction minimale au centre : l'endurance pure » |
| Orbitale | vitesse ×1,05 · décroissance ×0,90 · accél. ×0,90 | « encaisse sans ralentir » |
| Gyroscope | accél. ×1,20 · vitesse ×0,95 | « bille libre : se redresse après chaque choc » |
| Furie | vitesse ×1,30 · accél. ×1,10 · décroissance ×1,30 | « vitesse extrême, s'épuise vite » |
| Ressort | décroissance ×0,88 · masse ×1,10 · vitesse ×0,95 | « amortit les impacts, anti-éjection » |

*Météorite* « trajectoires imprévisibles » et *Gyroscope* « se redresse » sont rendus par
leur profil de stats, **pas** par du comportement de simulation dédié. Écrire du code de
simulation par modèle a été écarté : le jalon en porte déjà beaucoup, et douze comportements
noieraient les douze talents de rang, qui sont la vraie couche « effet spécial ».

## 5. Écrans, boutique, coffres

### 5.1 Onglet Toupies

Le 🔒 de `TabBar` tombe. L'écran liste les quatre Fondateurs : nom, type, profil, état
(active / possédée / à acheter). Trois actions :

- **Équiper** — bascule `meta.toupies.active`. Gratuit, réversible, prend effet dans la
  seconde sur le run en cours via `syncRunStats`, comme une amélioration de pièce au 2a.
- **Acheter** — débite les gemmes, ajoute à `unlocked`.
- **Réclamer** — visible seulement si `chapterValidated && !founderGiftClaimed` : le joueur
  choisit **un** Fondateur parmi les trois, `founderGiftClaimed` passe à `true`.

L'écran affiche **le triangle du chapitre courant** — la table du § 3.3. Sans elle la
contre-pioche est une devinette, et le critère d'acceptation tombe.

### 5.2 La boutique

Prix en gemmes dans `balance.json`. Les gemmes viennent des boss (`econ.bossGems = 60`) et
financent aujourd'hui les coffres Arène à 300. Ajouter un puits de gemmes entre en
concurrence avec la cible « premier coffre d'Arène dans l'heure suivant la validation du
chapitre 1 », mesurée à 0,82–0,87 h au 2a.

**Valeur de départ : 900 gemmes**, soit quinze boss — environ trois heures de farm après la
validation, au rythme mesuré au 2a (~5 boss par heure, ~300 gemmes par heure). L'échelle est
délibérée : une toupie est un déblocage permanent, elle doit coûter plus qu'un coffre d'Arène
sans devenir hors d'atteinte, et le joueur en a déjà reçu une gratuitement. Ce chiffre est un
point de départ à confirmer par la mesure du § 6, pas une vérité.

L'autopilote de `npm run calibrate` **n'achète pas de toupie** et garde Brasier Solaire : le
garde-fou doit continuer de mesurer la même chose d'une passe à l'autre.

### 5.3 Doublons signature dans les coffres

`drawOne` filtre les modèles de Lame et de Noyau sur `meta.toupies.unlocked`. Un joueur qui
n'a que Brasier Solaire ne tire que *Couronne Solaire* et *Fournaise* — le comportement exact
du 2a. Les Disques et Pointes ne sont pas concernés : ils sont génériques.

**Conséquence assumée, à ne pas confondre avec une régression** : le vivier de modèles varie
désormais avec l'état du méta, donc le tirage `r3` ne mappe plus sur les mêmes modèles
qu'avant à graine égale. Des tests de coffre existants **changeront de valeurs attendues**.
C'est un déplacement voulu. Le plan doit le dire explicitement pour qu'il soit constaté et
non « corrigé » en douce.

Contrainte préservée : un tirage consomme toujours **exactement trois** valeurs du flux méta,
pity forcé ou non.

### 5.4 L'arène

Le type d'un bot doit se lire à l'écran, sinon le triangle est invisible pendant le combat.
Accent de teinte par type sur l'anneau du bot, et type annoncé dans la transition de salle
qui existe déjà. Une teinte par type dans le thème, pas en dur.

Le rendu **reste spectateur** : il lit `top.type`, il ne le calcule pas.

### 5.5 Documentation

`docs/game-design.md` reçoit deux ajouts :

- La règle de la Pointe, arbitrée le 2026-08-27 et jusqu'ici implicite : **le rang multiplie
  la vitesse et divise la décroissance, `1,08^(rang−1)` sur les deux axes.** La Pointe est
  délibérément le seul emplacement à double rendement. La spec du 2a le prescrivait, le
  document de référence ne le disait pas.
- La règle du triangle telle qu'implémentée : `typeMult`, la symétrie, et le statut
  d'Équilibre hors triangle.

## 6. Mesure et calibration

### 6.1 La calibration va bouger, et on sait pourquoi

Brasier Solaire est Équilibre : le joueur neuf gagne `typeMult = 1,10` sur **chaque** coup,
sans jamais encaisser le +25 % en retour. Le chapitre 1 devient mécaniquement plus court.

**Ce n'est pas une régression à corriger, c'est un effet attendu à compenser.** Le protocole
est celui du 1.5 et du 2a : mesurer d'abord, comprendre l'écart, puis n'ajuster que
`econ.rewardBase` — la roadmap établit que l'économie commande la durée et le combat la forme
de la difficulté. `rewardBase` ne bouge qu'après lecture du chiffre.

Référence d'avant le jalon, mesurée le 2026-08-27 sur `main` : **23 runs, 2,08 h**, premier
coffre d'Arène à 2,92 h cumulées, salles les plus meurtrières `[10, 8]`.

### 6.2 Ce qui se mesure

- Chapitre 1 avec Brasier Solaire : runs et durée, cible ~2 h. Règle `econ.rewardBase`.
- Prix des toupies en boutique : le premier coffre d'Arène doit rester joignable dans l'heure
  suivant la validation.
- Écart entre châssis : rejouer le chapitre 1 avec chacun des quatre. Le critère est que la
  contre-pioche **paie** — Carapace Abyssale doit franchir le boss plus souvent que Typhon
  Primal — sans qu'aucun châssis ne devienne l'unique bonne réponse.
- Pire cas d'empilement du § 3.2, sur une panoplie Légende contre-piochée.

## 7. Tests

- `typeMult` : les seize cases de la matrice, symétrie bot → joueur comprise.
- Composition : `damage()` avec triangle **et** partage de charge **et** Estoc, vérifiée sur
  des valeurs calculées à la main.
- Les trois tests du partage de charge restent verts **sans retouche**.
- Résolution des profils : châssis × modèle × rang × niveau × talent, sur un cas où les
  quatre systèmes touchent le même axe.
- Migration : une sauvegarde v2 réelle relue en v3, et le cas dégradé (`active` hors
  d'`unlocked`).
- Coffres : les Lames et Noyaux tirés appartiennent aux toupies débloquées ; un tirage
  consomme toujours exactement trois valeurs de RNG.
- Déblocage : cadeau réclamable une seule fois ; achat débité une seule fois.
- Déterminisme : deux runs, même graine, mêmes entrées, même toupie ⇒ états identiques.

### 7.1 Vérification par mutation

Trois tests prétendent prouver un mécanisme. Chacun doit être **vérifié par mutation** :
retirer le mécanisme, confirmer que le test rougit, remettre.

1. le triangle change l'issue d'un combat ;
2. le châssis change le pilotage ;
3. les doublons signature suivent le déblocage.

Au 2a, trois tests passaient alors que le mécanisme qu'ils prétendaient couvrir était retiré.
Cette étape n'est pas optionnelle.

## 8. Ce que le jalon ne doit pas casser

- **Le partage de charge dans `resolveCollision`.** Acquis non négociable : c'est lui qui rend
  le pilotage payant. Trois tests le verrouillent.
- **`src/sim/` pur et déterministe** : aucun import DOM, PixiJS, React, `Date` ou
  `Math.random`. RNG sérialisé, temps par `tick()` à pas fixe.
- **Le rendu est spectateur.**
- **Tout l'équilibrage dans `balance.json`**, `config.ts` porte unique.
- **Aucun nom officiel Beyblade.** Textes joueur en français, code en anglais.
- **Le farm ne progresse jamais** — non touché par ce jalon, mais la règle tient.
