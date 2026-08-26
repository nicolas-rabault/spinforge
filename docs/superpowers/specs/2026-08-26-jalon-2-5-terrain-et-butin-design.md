# Jalon 2.5 — Le terrain et le butin : spécification de conception

> S'intercale entre le jalon 2a (les pièces) et le jalon 2b (les toupies) de
> `docs/roadmap.md`. Origine : session de test du 2026-08-26, dont les trois remarques
> sont reportées dans `docs/ameliorations.md`.

## But

Le jalon 2a a livré un système d'optimisation complet — quatre emplacements, onze rangs,
douze talents, trois coffres, quatre paliers de fusion — que **le joueur ne voit jamais**.
Mesuré au harnais `npm run calibrate` et à une sonde de rythme :

| | Mesure du 2026-08-26 |
|---|---|
| Salles 1-3 | 20 à 24 s |
| Salles 4-9 | 41 à 67 s |
| Salle 10 (boss) | **183 s**, 8 morts dessus |
| Run complet | ~9,5 min |
| Runs jusqu'à validation du chapitre 1 | 23 |
| **Chapitre 1 validé** | **2,08 h** |
| **Premier coffre Arène ouvert** | **2,92 h** |

Trois heures avant d'ouvrir quoi que ce soit, dans un jeu dont le doc de design annonce
que 60 % de l'intérêt est dans les coffres et la fusion. Le premier run meurt salle 4 après
70 s de jeu. Et pendant ces trois heures, piloter ne se *voit* pas : la mesure dit que
charger est payant (1,76 h contre 8,33 h en restant immobile), le joueur, lui, ne peut
relier aucun geste à aucun effet lisible à l'échelle d'un combat.

Ce jalon corrige les deux à la fois, parce qu'ils sont le même problème vu de deux côtés :

1. **L'arène devient un terrain** — répulsion violente, bord à brèches, zones au sol,
   éclat à disputer. Le pilotage cesse d'être une optimisation statistique invisible pour
   devenir une cause immédiate et visible.
2. **Le butin coule** — chaque salle vidée lâche un coffre, les prix s'effondrent. Il y a
   en permanence quelque chose à ouvrir et un arbitrage à faire.
3. **La courbe se resserre** — chapitre 1 en ~15 min au lieu de 2,08 h. Le mur ne
   disparaît pas, il déménage au chapitre 3-4, après que le joueur a vu la fusion, les
   rangs et les talents.

## Contraintes non négociables

1. **`src/sim/` reste pur et déterministe.** Aucun import DOM, PixiJS, React, `Date` ou
   `Math.random`. Tout le contenu d'arène nouveau est tiré de `run.rngState` et vit dans
   `RunState`, jamais dans `MetaState`.
2. **Le rendu demeure spectateur.** `src/render/` et `src/ui/` lisent, ne mutent pas.
3. **Tout l'équilibrage dans `src/content/balance.json`**, `src/sim/config.ts` restant sa
   porte unique. Aucune constante d'arène en dur ailleurs.
4. **Le partage de charge est un acquis.** `CHARGE_BONUS` et les deux tests qui le
   verrouillent (`combat.test.ts`) survivent intacts. Ce jalon ajoute de la répulsion,
   il ne retouche pas la répartition des dégâts.
5. **Le test de déterminisme reste vrai au mot près.** Il doit couvrir le nouveau contenu
   sans être réécrit.
6. **Aucun nom officiel Beyblade.** L'« éclat de Gyre » dérive du lore déjà écrit dans
   `docs/game-design.md` (la météorite « Cœur Gyre »).
7. **Textes joueur en français**, code et identifiants en anglais.
8. **Pas de code mort.** Voir § 3.4 : c'est ce qui fait tomber le second gabarit d'arène.

---

## 1 · L'arène devient un terrain

### 1.1 La cause racine : le plafond de vitesse efface la répulsion

Avant d'ajouter quoi que ce soit, il faut réparer ce qui est déjà cassé.

L'ordre d'un tick (`sim.ts`) est `applySteering → moveAndBounce → resolveCollision`. Une
collision au tick N fixe une vitesse de recul ; au tick N+1, `applySteering` la tronque à
`maxSpeed` **avant** que `moveAndBounce` ne s'en serve :

```ts
// physics.ts, état actuel
const max = effectiveMaxSpeed(top);
const speed = Math.hypot(top.vel.x, top.vel.y);
if (speed > max) {
  const k = max / speed;
  top.vel.x *= k;
  top.vel.y *= k;
}
```

**Le recul n'est jamais parcouru : il est annulé avant le premier pixel.**

Chiffré sur un choc frontal joueur/bot aux valeurs actuelles (`maxSpeed` 240 et 140,
`restitution` 0,8) : la vitesse de fermeture vaut 380, l'impulsion `j` vaut 342 à masses
égales. Le bot **repart à 202 px/s — tronqué à 140**, soit près d'un tiers du recul jeté.
Le joueur repart à 102 px/s, sous son plafond de 240 : il garde le sien en entier. D'où la
sensation exacte rapportée en test : on frappe, l'adversaire ne bouge pas ; on est frappé,
on part.

**Correctif.** Au-dessus du plafond, on n'est plus piloté, on est projeté : on amortit au
lieu de tronquer.

```ts
const max = effectiveMaxSpeed(top) * zone.speedMult;
const speed = Math.hypot(top.vel.x, top.vel.y);
if (speed > max) {
  // Au-delà du plafond, cette vitesse vient d'un choc, pas du doigt du joueur.
  // On la laisse se résorber d'elle-même sans jamais descendre sous le plafond.
  const target = Math.max(max, speed * ARENA.overspeedDamping);
  const k = target / speed;
  top.vel.x *= k;
  top.vel.y *= k;
}
```

À `overspeedDamping = 0,90` et 10 ticks/s, une projection à 500 px/s retombe au plafond de
240 en ~7 ticks, soit 0,7 s. C'est la durée d'un « envoyé valser » lisible.

Le plafond continue de borner le **pilotage** — un joueur ne dépasse jamais sa vitesse de
Pointe par son seul doigt. Il ne borne plus les **coups reçus**.

### 1.2 Répulsion violente

`arena.restitution` passe de 0,8 à **1,6**. Un choc rend plus d'énergie qu'il n'en absorbe :
c'est physiquement justifié dans le monde du jeu, où la rotation est le réservoir d'énergie
et où chaque contact en convertit une part en recul. C'est aussi le comportement Beyblade.

Deux garde-fous rendent l'injection d'énergie bornée, donc sûre en mêlée :

- l'amortissement de surcharge du § 1.1 (×0,90/tick au-dessus du plafond) ;
- la friction (`applySteering` sans direction) et le plafond lui-même, atteint dès que la
  surcharge s'est résorbée.

Le calcul d'impulsion de `resolveCollision` n'est **pas** modifié : il tient déjà compte
des masses, et `RESTITUTION` y est déjà le seul bouton.

### 1.3 Les brèches — l'éjection

Le bord de l'arène porte des **secteurs mortels**. Y être poussé assez fort, c'est perdre.

```ts
/** Secteur mortel du bord. Angles en **radians**, centre de l'arène pour origine.
 *  `balance.json` porte la demi-ouverture en degrés (`halfWidthDeg`, plus lisible
 *  à régler) ; la conversion a lieu une fois, à la construction du layout. */
export interface Breach {
  angle: number;
  halfWidth: number;
}
```

Règle, dans `moveAndBounce` :

1. la toupie franchit `ARENA_RADIUS - radius` ;
2. sa vitesse **sortante** (composante normale, vers l'extérieur) atteint
   `ARENA.breach.ejectSpeed` ;
3. l'angle du point de sortie tombe dans une brèche.

Les trois ensemble ⇒ éjection. Sinon, rebond comme aujourd'hui.

```ts
/** Vrai si la toupie vient d'être éjectée. L'appelant met alors son spin à zéro. */
export function moveAndBounce(top: Top, layout: ArenaLayout): boolean {
  top.pos.x += top.vel.x * TICK_S;
  top.pos.y += top.vel.y * TICK_S;
  const d = Math.hypot(top.pos.x, top.pos.y);
  const limit = ARENA_RADIUS - top.radius;
  if (d <= limit || d === 0) return false;
  const nx = top.pos.x / d;
  const ny = top.pos.y / d;
  const out = top.vel.x * nx + top.vel.y * ny;
  const ejected = out >= ARENA.breach.ejectSpeed && inBreach(layout, Math.atan2(ny, nx));
  // Replacée au bord et arrêtée dans tous les cas — y compris éjectée : le sursis
  // de Second souffle ressusciterait sinon le joueur au bord, encore sortant, pour
  // le faire éjecter à nouveau au tick suivant.
  top.pos.x = nx * limit;
  top.pos.y = ny * limit;
  if (ejected) {
    top.vel.x = 0;
    top.vel.y = 0;
    return true;
  }
  if (out > 0) {
    top.vel.x -= (1 + WALL_RESTITUTION) * out * nx;
    top.vel.y -= (1 + WALL_RESTITUTION) * out * ny;
  }
  return false;
}
```

L'éjection met le spin à 0 ; le reste du tick — filtre des bots morts, branche de mort du
joueur, Second souffle — est **inchangé**. C'est délibéré : une éjection est une mort
comme une autre pour la simulation, elle ne se distingue que pour le rendu (§ 4.3).

**Placement.** Deux brèches par salle, réparties : un angle de base tiré du RNG du run,
la seconde à l'opposé plus un jitter. Cela garantit qu'il reste toujours un secteur de
bord plein assez large pour s'y adosser — une éjection est toujours évitable.

**Introduction progressive.** Aucune brèche avant `ARENA.breach.fromSalle` (salle 3) : les
deux premières salles servent à apprendre le doigt et la charge sans sanction. Les zones,
elles, arrivent dès la salle 1 (§ 1.4) : la découverte se fait par le bonus avant de se
faire par la punition.

**Le boss est éjectable.** C'est le remplacement direct des 183 s actuelles et le moment de
bravoure du chapitre. Il n'est pas gratuit pour autant : le boss porte `mass` (voir § 1.6),
donc la même impulsion le déplace bien moins.

### 1.4 Les zones au sol

Trois types, tous des disques posés sur le sol.

| Zone | Effet | Rôle de jeu |
|---|---|---|
| **Accélérateur** | `accel` et `maxSpeed` ×1,6 tant qu'on est dedans | récompense le placement, donne l'élan d'une charge |
| **Pointes** | perte de spin par seconde | le piège où l'on pousse l'adversaire |
| **Plaque glissante** | friction portée à 0,99 | on ne s'arrête plus : bon pour foncer, mortel près d'une brèche |

**Modèle.** Exactement celui de `TalentMods` : un jeu de modificateurs à **valeurs neutres**,
que le code de simulation multiplie et additionne sans jamais tester la présence d'une zone.

```ts
export interface ZoneMods {
  /** Facteur sur la vitesse maximale. 1 = neutre. */
  speedMult: number;
  /** Facteur sur l'accélération. 1 = neutre. */
  accelMult: number;
  /** Friction *plancher* de la zone. 0 = neutre : `max(talents.friction, zone.friction)`
   *  laisse alors la friction du talent intacte, et la plaque glissante l'emporte
   *  toujours sur elle sans branche. */
  friction: number;
  /** Spin perdu par seconde. 0 = neutre. */
  spinDrain: number;
}

export const NEUTRAL_ZONE: ZoneMods = Object.freeze({
  speedMult: 1, accelMult: 1, friction: 0, spinDrain: 0,
});
```

`zoneModsAt(layout, pos)` compose les zones qui se recouvrent : produits pour les
multiplicateurs, maximum pour la friction, somme pour la perte de spin.

**Où ça s'applique.** Deux fonctions gagnent un paramètre :

- `applySteering(top, steer, zone)` — `accel × zone.accelMult`, plafond
  `× zone.speedMult`, friction `max(top.talents.friction, zone.friction)` ;
- `decaySpin(top, zone)` — la perte de zone s'ajoute à la décroissance naturelle.

**Piège identifié — Relance ne protège pas des pointes.** `decaySpin` retourne aujourd'hui
tôt quand `decayPauseTicks > 0`. La perte de zone doit s'appliquer quand même : les pointes
sont des dégâts, pas de l'endurance. Et la valeur doit être **lue avant** le décrément,
sinon le dernier tick de pause reprend la décroissance un tick trop tôt :

```ts
export function drainPerTick(top: Top, zone: ZoneMods): number {
  return decayPerTick(top) + zone.spinDrain;
}

export function decaySpin(top: Top, zone: ZoneMods): void {
  const drain = drainPerTick(top, zone);   // lu AVANT le décrément
  if (top.decayPauseTicks > 0) top.decayPauseTicks--;
  top.spin -= drain * TICK_S;
}
```

À zone neutre, cette réécriture est identique au bit près à l'actuelle.

**Piège identifié — le rendu prendrait les pointes pour un choc.** `observer.ts` déduit la
puissance d'un impact du spin réellement perdu **moins** `TopSnapshot.decayPerTick`. Une
toupie posée sur des pointes produirait donc des étincelles et une secousse en continu, sans
qu'aucun contact ait eu lieu. `takeSnapshot` doit renseigner ce champ avec `drainPerTick`,
zone comprise :

```ts
function snap(top: Top, layout: ArenaLayout): TopSnapshot {
  return { …, decayPerTick: drainPerTick(top, zoneModsAt(layout, top.pos)) };
}
```

### 1.5 L'éclat de Gyre

Toutes les `ARENA.shard.everyTicks` (~9 s), un éclat apparaît à une position tirée du RNG du
run, entre 15 % et 70 % du rayon. **Le premier qui le touche** — joueur ou bot — récupère
18 % de son spin maximal. L'éclat disparaît alors, et le compte à rebours repart. Sans
preneur, il s'efface au bout de `lifeTicks`.

```ts
export interface Shard {
  x: number;
  y: number;
  /** Ticks restants avant disparition. */
  ttl: number;
}
```

**Ordre de ramassage** : le joueur, puis les bots dans l'ordre du tableau. Déterministe,
et le litige exact (deux toupies au contact le même tick) est trop rare pour mériter mieux.

**Ciblage par les bots.** `refreshBotAims` vise l'éclat plutôt que le joueur quand l'éclat
est plus proche du bot que ne l'est le joueur. Deux effets de jeu, tous deux voulus : la
course à l'éclat devient réelle, et un bot parti chercher l'éclat cesse d'attaquer — ce qui
donne au joueur une fenêtre de répit qu'il peut choisir de lui refuser en le percutant.

C'est la pièce qui fait de la répulsion un outil **offensif et défensif** : on prend, ou on
empêche de prendre.

### 1.6 Masse et boss

`Top` gagne un champ `mass`, aujourd'hui porté par `TalentMods.mass` seul. Le déplacement est
mécanique — `resolveCollision` lit déjà `a.talents.mass` — mais nécessaire : un boss doit
être lourd sans porter le talent Masse, réservé aux pièces de rang 11.

```ts
// combat.ts : le seul changement est la source de la valeur.
const ma = a.mass * a.talents.mass;
const mb = b.mass * b.talents.mass;
```

`mass` vaut 1 pour toutes les toupies, `BOSS.mass` (3) pour le boss. Un joueur qui pousse
le boss vers une brèche doit vraiment le travailler.

### 1.7 Où tout cela vit

```ts
export interface ArenaLayout {
  zones: Zone[];
  breaches: Breach[];
  shard: Shard | null;
  /** Ticks avant la prochaine apparition d'éclat. */
  shardTimer: number;
}

export interface RunState {
  …
  arena: ArenaLayout;
  /** Ids éjectés pendant le dernier tick. Vidé en début de tick ; lu par le rendu
   *  seul, pour distinguer une éjection d'une mort par épuisement. */
  ejected: string[];
}
```

`ArenaLayout` est construit dans `startSalle` à partir de `run.rngState` et d'un gabarit
(§ 3.4). Il vit dans `RunState`, qui n'est **jamais sauvegardé** — aucune migration, aucune
surface de sérialisation nouvelle.

Nouvel ordre d'un tick :

On garde l'ordre **phase par phase** du code actuel — toutes les toupies traversent une
étape avant que la suivante commence — plutôt qu'un entrelacement par toupie : c'est ce qui
rend le déterminisme évident à la lecture.

```
run.ejected = []
refreshBotAims                       (tous les 10 ticks — vise le joueur ou l'éclat)
zones ← zoneModsAt(arena, pos)       joueur puis chaque bot ; lu UNE fois, réutilisé plus bas
applySteering(top, steer, zone)      pour chacun
moveAndBounce(top, arena)            pour chacun → éjection ⇒ spin = 0, id dans run.ejected
résolution des collisions            (inchangée)
clampToArena                         (inchangé)
updateShard(run)                     apparition, expiration, ramassage
decaySpin(top, zone)                 pour chacun, avec la MÊME valeur de `zone`
filtre des morts, mort du joueur, salle suivante   (inchangés)
```

Les zones sont donc lues **une seule fois par toupie et par tick**, avant le pilotage, et la
même valeur sert au pilotage et à la décroissance. Une toupie qui traverse une zone pendant
un tick est traitée selon sa position de départ : c'est cohérent, borné, et ça évite deux
lectures divergentes dans le même tick.

---

## 2 · Le robinet de butin

### 2.1 Deux robinets, pas un

Le doc de design ne prévoit qu'une source de pièces : l'achat. Elle est fermée en pratique —
Bronze à 2 000 crédits quand une salle en rapporte 70, et ce sont **les mêmes crédits** que
les améliorations, toujours plus urgentes. Le joueur n'ouvre donc rien.

On ouvre les deux robinets, parce qu'ils ne font pas le même travail :

- **Le drop** garantit qu'il y a *toujours* quelque chose à ouvrir, sans rien demander.
  C'est lui qui remplit la boucle de récompense minute par minute.
- **L'achat** garde une décision à prendre — « ce coffre ou ce niveau de Lame ? ». C'est
  cette décision qui *est* le jeu d'optimisation.

L'un sans l'autre donne soit un distributeur passif, soit le mur actuel.

### 2.2 Chaque salle vidée lâche un coffre

```ts
export interface RunReward {
  credits: number;
  gems: number;
  chests: ChestKind[];
}
```

Table de drop :

| Salle | Coffre lâché |
|---|---|
| 1 à 3 | Bronze |
| 4 à 9 | Bronze, et 20 % de chance d'un Arène en plus |
| 10 (boss) | Arène garanti, et 15 % de chance d'un Mythique en plus |

Un run complet rapporte donc **10 coffres au minimum, 17 au maximum, ~11 en moyenne**.

Le tirage consomme le flux du run : `salleReward(salle, boss, rngState)` retourne
`{ reward, rngState }`, et `tick()` réassigne `run.rngState`. `economy.ts` gagne un import
de `rng.ts` — pur, sans effet sur les autres contraintes.

### 2.3 La file d'attente

```ts
export interface MetaState {
  …
  /** Coffres gagnés et pas encore ouverts, par type. */
  pending: Record<ChestKind, number>;
}
```

Un `Record` de compteurs plutôt qu'un tableau : pas de plafond à inventer, pas de butin
jamais jeté, et l'affichage « 7 Bronze · 2 Arène » sort directement de la structure.

`applyRunReward` incrémente. La pastille de l'onglet Coffres affiche la somme.

**Sauvegarde.** `SAVE_SCHEMA` passe de 2 à **3**. Aucune migration à écrire : `pending`
absent d'un blob v2 est un champ manquant, exactement ce que `hydrate` comble déjà depuis
`createInitialMeta`. Il faut en revanche l'ajouter à `isComplete`, sans quoi une sauvegarde
v3 amputée passerait la garde.

### 2.4 Le tirage partagé

`openChest` fait aujourd'hui deux choses : débiter, et tirer. Le drop ne doit faire que la
seconde, en partageant **exactement** le même tirage et le même compteur de pity — sans quoi
un joueur qui ne fait que du drop n'aurait jamais de garantie.

```ts
/** Tire `count` pièces d'un coffre. Ne débite rien : c'est le tirage nu, partagé
 *  par l'achat (`openChest`) et par le butin de salle (`grantChest`). */
export function drawPulls(meta: MetaState, kind: ChestKind, count: number): PieceInstance[];

/** Ouvre un coffre de la file d'attente. `null` si la file est vide pour ce type. */
export function grantChest(meta: MetaState, kind: ChestKind): PieceInstance[] | null;
```

`openChest` devient « vérifier la monnaie, débiter, `drawPulls` ». Les tests de pity
existants portent sur `drawOne` via `openChest` et restent valides sans être touchés.

### 2.5 Prix effondrés

| Coffre | Avant | Après |
|---|---|---|
| Bronze | 2 000 crédits (×10 : 18 000) | **250** (×10 : 2 250) |
| Arène | 300 gemmes (×10 : 2 680) | inchangé |
| Mythique | 1 500 gemmes (×10 : 13 500) | inchangé |

Seul le Bronze bouge : c'est le seul acheté en crédits, donc le seul en concurrence directe
avec les améliorations. À 250 crédits, il est achetable **dès le premier run, avant la
première mort**, aux revenus actuels comme à ceux que la calibration retiendra (§ 3.2) — la
promesse « acheter des coffres dès la première partie » est tenue par cette ligne seule.

### 2.6 La cascade gratuite

À 10 coffres par run, les doublons arrivent en quelques minutes. La **fusion** devient
utilisable dans la première session, donc les **rangs**, donc les **talents**. Les trois
axes d'optimisation codés au jalon 2a deviennent visibles d'un coup, **sans une ligne de
contenu supplémentaire**. C'est la réponse directe à « il faut très rapidement montrer au
joueur la multitude d'optimisations possibles ».

---

## 3 · La courbe

### 3.1 Cibles

| | Aujourd'hui | Cible |
|---|---|---|
| Salles 1-3 | 20-24 s | ~12 s |
| Salles 4-9 | 41-67 s | ~25 s |
| Salle 10 (boss) | 183 s | ~45 s |
| Run complet | 9,5 min | ~3,5 min |
| Runs jusqu'à validation | 23 | ~4 |
| **Chapitre 1** | **2,08 h** | **~15 min** |
| **Premier coffre ouvert** | 2,92 h | **< 2 min** |

### 3.2 Les boutons, et l'ordre dans lequel on les tourne

La roadmap a déjà établi que les deux leviers sont indépendants : **l'économie commande la
durée, le combat commande la forme de la difficulté.** On garde cette discipline.

1. **D'abord le combat**, sans toucher à `econ` : brèches, zones, éclat, répulsion. On
   mesure la durée d'une salle et le nombre de morts par salle. Cible : la salle 10 sous
   60 s et toujours la plus meurtrière du chapitre.
2. **Ensuite l'économie seule** : `econ.rewardBase`, `econ.rewardGrowth`,
   `econ.upgradeGrowth`. On vise les 4 runs et les 15 minutes.

Aucun chiffre d'`econ` n'est fixé dans cette spec. Les deviner serait refaire l'erreur du
jalon 1, où l'équilibrage a dû être remesuré deux fois.

### 3.3 Comment on vérifie

`scripts/calibrate.mjs` est étendu :

- **une politique d'autopilote qui utilise le terrain** — viser le bot en le poussant vers
  la brèche la plus proche de lui, ramasser l'éclat quand on en est le plus près. Sans
  elle, l'autopilote mesurerait un jeu que personne ne joue.
- **la politique passive conservée** en garde-fou : rester immobile doit rester nettement
  pire que jouer, sinon le pilotage a de nouveau cessé de compter.
- **deux nouvelles sorties** : durée médiane par salle, et heure du premier coffre ouvert.

Le pilier « le mur n'est jamais un bug, c'est le produit » n'est pas supprimé : il
**déménage au chapitre 3-4**. Ce jalon ne le vérifie pas — les chapitres 2+ ne sont pas
atteignables aujourd'hui (§ 3.4). Il l'établira au jalon 3, quand l'enchaînement des
chapitres existera.

### 3.4 Un seul gabarit d'arène — écart assumé

Le design validé en discussion annonçait « deux gabarits (chapitres 1-2) ». **Il n'y en
aura qu'un.** `tick()` remet `run.salle` à 1 après le boss et ne touche jamais à
`run.chapter` : les chapitres 2 et suivants ne sont pas atteignables. Un second gabarit
serait du contenu que personne ne peut voir — du code mort, que `CLAUDE.md` interdit.

Le gabarit est une table de `balance.json`, indexée par salle, avec une entrée par palier :

```json
"layouts": [
  { "fromSalle": 1,  "zones": ["accelerateur"] },
  { "fromSalle": 3,  "zones": ["accelerateur", "pointes"] },
  { "fromSalle": 4,  "zones": ["accelerateur", "pointes", "pointes"] },
  { "fromSalle": 6,  "zones": ["accelerateur", "accelerateur", "pointes", "pointes"] },
  { "fromSalle": 8,  "zones": ["accelerateur", "pointes", "pointes", "glisse"] },
  { "fromSalle": 10, "zones": ["accelerateur", "pointes", "pointes", "pointes"] }
]
```

La salle 1 porte un accélérateur et **aucune** pointe : le premier objet de terrain que le
joueur rencontre doit être un bonus, pas une punition — les pointes n'arrivent qu'à la
salle 3, en même temps que les brèches (§ 1.3).

La structure — une liste de paliers, pas un tableau de dix salles — est déjà ce qu'il faut
pour porter une table par chapitre le jour où les chapitres s'enchaînent. Elle ne coûte rien
de plus aujourd'hui.

**Placement des zones.** Tirage rejeté par échantillonnage : une position au hasard dans le
disque, refusée si elle recouvre une autre zone ou le point d'apparition du joueur (0, 80).
Douze essais au maximum, puis on place quand même. Borné, et déterministe pour une graine
donnée même si le nombre de tirages consommés varie.

### 3.5 Ce que balance.json gagne

```json
"arena": {
  "radius": 150, "friction": 0.94, "wallRestitution": 0.8,
  "restitution": 1.6,
  "overspeedDamping": 0.90,
  "breach": { "count": 2, "halfWidthDeg": 22, "ejectSpeed": 110, "fromSalle": 3 },
  "shard": {
    "everyTicks": 90, "lifeTicks": 60, "radius": 14, "spinGain": 0.18,
    "minRadius": 0.15, "maxRadius": 0.70
  },
  "zones": {
    "accelerateur": { "radius": 34, "speedMult": 1.6, "accelMult": 1.6, "friction": 0,    "spinDrain": 0  },
    "pointes":      { "radius": 28, "speedMult": 1,   "accelMult": 1,   "friction": 0,    "spinDrain": 55 },
    "glisse":       { "radius": 40, "speedMult": 1,   "accelMult": 1,   "friction": 0.99, "spinDrain": 0  }
  },
  "layouts": [ … voir § 3.4 ]
},
"boss": { "spinMult": 4, "attackMult": 1.5, "radius": 18, "mass": 3 },
"loot": {
  "bySalle":  { "chest": "bronze", "extra": "arene",    "extraChance": 0.20, "fromSalle": 4 },
  "boss":     { "chest": "arene",  "extra": "mythique", "extraChance": 0.15 }
}
```

Les valeurs ci-dessus sont des points de départ raisonnés, pas des résultats de mesure. Le
plan d'implémentation les rejoue au harnais (§ 3.3) et consigne les valeurs retenues.

`config.test.ts` valide déjà la forme du JSON à l'exécution : il gagne les nouvelles clés.

---

## 4 · Le rendu

Le rendu reste spectateur : il lit `RunState`, et `arena.draw(state)` reçoit déjà l'état
complet. Aucune nouvelle voie de mutation.

### 4.1 Le sol

`textures.ts` produit une texture par type de zone, teintée depuis `PALETTE` :
accélérateur en teinte joueur, pointes en teinte boss, plaque glissante en teinte froide.
Les sprites sont créés à l'entrée de salle et détruits à la sortie — jamais retracés par
image, conformément à la règle posée au jalon 1.5.

### 4.2 Le bord

Le mur plein reste tel quel. Les secteurs de brèche sont dessinés comme une **absence**
— l'anneau s'interrompt — bordée de deux arêtes qui pulsent. Une brèche doit se lire à un
demi-écran de distance : c'est la seule information dont dépend la survie du joueur.

Dette 1.5 rappelée : la porte est encore retracée en `Graphics` à chaque image. Les brèches
ne doivent pas suivre cet exemple.

### 4.3 L'éjection

`Snapshot` porte les ids éjectés du tick ; `observer.ts` s'en sert pour qualifier le
`DeathEvent` :

```ts
export interface DeathEvent {
  id: string;
  x: number; y: number;
  isPlayer: boolean;
  cause: 'spin' | 'ringout';
}
```

Une mort par épuisement garde l'onde actuelle. Une éjection est une **projection vers
l'extérieur** : la toupie part par la brèche, le cadre tremble plus fort. C'est le retour
qui apprend la règle sans texte.

`RenderEvents.chapterValidated` reste produit et consommé par personne — dette antérieure,
non traitée ici.

### 4.4 L'éclat

Un sprite qui flotte et pulse, avec un halo. À sa disparition par ramassage, un trait bref
vers la toupie qui l'a pris : le joueur doit voir *qui* l'a eu, y compris quand ce n'est
pas lui.

---

## 5 · L'interface

### 5.1 Onglet Coffres — la file de butin

Une section « Butin » **au-dessus** de la boutique : une ligne par type de coffre en attente,
avec son compte, un bouton « Ouvrir » et un « Tout ouvrir ». La révélation réutilise
l'animation existante de `ChestScreen`.

L'ordre compte : le butin gratuit se voit avant ce qui se vend.

### 5.2 Pastille sur l'onglet

`TabBar` affiche le total en attente sur l'onglet Coffres. C'est le rappel permanent
« tu as quelque chose à ouvrir » qui manque aujourd'hui.

`TabBar` n'a toujours ni `role="tablist"` ni `aria-selected` (dette 1.5). La pastille doit
au moins porter un `aria-label` explicite plutôt qu'un nombre nu.

### 5.3 En combat

Rien de neuf, sauf un bref « +1 coffre » à la sortie de salle. Le HUD est déjà chargé ; le
butin se consulte à l'onglet Coffres, pas pendant le combat.

---

## 6 · Tests

| Fichier | Ce qui est verrouillé |
|---|---|
| `physics.test.ts` | l'amortissement de surcharge ne descend jamais sous le plafond et converge vers lui ; à zone neutre, `applySteering` est identique à l'actuelle ; éjection dans une brèche au-dessus du seuil ; **non-éjection** hors brèche à la même vitesse ; non-éjection dans une brèche sous le seuil ; une toupie éjectée est arrêtée au bord |
| `arena.test.ts` (nouveau) | gabarit par salle ; aucune zone ne recouvre le point d'apparition du joueur ; les brèches ne sont jamais adjacentes ; `zoneModsAt` compose (produit, max, somme) et rend `NEUTRAL_ZONE` hors zone ; cycle de l'éclat (apparition, expiration, ramassage par le premier arrivé) ; **même graine ⇒ même layout** |
| `combat.test.ts` | les deux tests de partage de charge inchangés ; `mass` du boss réduit l'impulsion reçue ; Relance ne protège pas des pointes |
| `chest.test.ts` | `grantChest` consomme le même flux et le même compteur de pity que `openChest` ; l'achat ne change pas de comportement |
| `economy.test.ts` | table de drop par salle ; le tirage d'extra consomme exactement une valeur du flux |
| `save.test.ts` | un blob v2 se charge avec `pending` à zéro ; un blob v3 sans `pending` est refusé |
| `sim.test.ts` | le test de déterminisme existant, **non modifié**, couvre zones, brèches et éclat |
| `snapshot.test.ts` | `decayPerTick` d'un instantané inclut la perte de zone |
| `observer.test.ts` | une éjection produit `cause: 'ringout'`, une mort par épuisement `'spin'` |

Le rendu et l'UI se vérifient à la main (`npm run dev`) et par captures (`npm run shots`),
comme aux jalons précédents.

---

## 7 · Hors périmètre

Assumé, et à reprendre plus tard :

- **Les identités d'arène des chapitres 2 à 8** (murs élastiques, piliers mobiles, geysers,
  bascule, gravité réduite, Vortex). Ce jalon livre le *système* de terrain ; les huit
  arènes sont du contenu à poser dessus, et rien ne peut les afficher aujourd'hui (§ 3.4).
- **L'enchaînement des chapitres.** `tick()` remet la salle à 1 après le boss ; faire
  avancer `run.chapter` appartient au jalon 3, avec le mode AUTO et le farm.
- **Le mode AUTO, le hors-ligne, l'atout temporaire par salle** — jalon 3.
- **La dette 1.5 et 2a** listée dans `docs/roadmap.md`, sauf les deux points que ce jalon
  touche par nécessité : `decayPerTick` de l'instantané (§ 1.4) et la teinte des zones,
  qui entre dans `PALETTE` plutôt que d'ajouter une cinquième teinte en dur.

---

## 8 · Ce que ce jalon change dans les docs

- `docs/game-design.md` — § Combat : la répulsion et l'éjection deviennent des règles du
  jeu ; § Structure : les zones et l'éclat entrent dans la description d'une salle ;
  § Économie : le butin de salle devient la première source de pièces.
- `docs/roadmap.md` — insertion du jalon 2.5, et la calibration « MUR ~2 h » du chapitre 1
  est explicitement remplacée par « chapitre 1 ~15 min, mur au chapitre 3-4 ».
- `docs/ameliorations.md` — session du 2026-08-26 : les trois remarques, leur diagnostic
  mesuré et la suite donnée.
