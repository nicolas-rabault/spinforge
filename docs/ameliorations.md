# SpinForge — Liste d'améliorations

Retours de test et suites données. Cette liste vit au fil des sessions de jeu : on
y **ajoute les remarques** telles qu'elles viennent, et on coche au fur et à mesure.
Ce n'est pas la roadmap (`docs/roadmap.md`, qui découpe les jalons) ni la dette
technique (même fichier, sections « Dette connue ») — ici on parle de ce que le
joueur ressent.

Statuts : ✅ corrigé · 🔧 en cours · 📋 à faire · 💭 à arbitrer

---

## Session du 2026-08-25 — premier test joueur

Trois remarques, toutes sur l'arène.

### ✅ 1. On ne comprend pas laquelle est sa toupie

> « Les débutants ont des difficultés à comprendre que la toupie bleue est la leur. »

**Diagnostic.** Rien à l'écran ne désignait le joueur. Les deux camps avaient le
même rayon (`radius: 12` des deux côtés), des disques encochés très proches (6 vs
5 encoches) et un halo de même facture ; seule la teinte séparait le cyan de
l'orange — et `spinTint()` l'éteint justement à mesure que le spin baisse, donc le
repère s'effaçait exactement au moment où on le cherchait. Le HUD disait « SPIN »,
un mot qui ne rattache la barre à aucune toupie.

**Correctifs.**
- Chevron permanent au-dessus de la toupie du joueur, et anneau au sol sous elle
  (`src/render/topView.ts`). Leur teinte est `PALETTE.player` **en dur, jamais
  atténuée par le spin** — c'est la règle : un repère d'identité ne suit pas l'état
  de santé. Ils respirent légèrement (1,15 Hz) pour se lire comme de l'interface et
  non comme du décor, et s'effacent en début d'agonie.
- La barre du HUD devient « ▾ TON SPIN », dans la teinte du joueur, avec le même
  chevron que celui porté par la toupie : la barre nomme la toupie autant qu'elle
  la mesure.
- Bandeau d'accueil au premier lancement (une seule fois, `localStorage`
  `spinforge.onboarded`), refermé par le premier vrai glissement — pas par un
  minuteur. Placé **sous** l'arène : en surimpression il masquait les deux toupies
  qu'il désigne.

### ✅ 2. Piloter ne semblait rien changer

> « Il est difficile de comprendre ce que piloter la toupie change, plus que de
> juste attendre que l'adversaire attaque. »

**Ce n'était pas une impression : c'était mesurable.** Autopilote, 5 seeds,
chapitre 1 joué jusqu'à validation avec achats gloutons — le protocole exact qui
avait servi à calibrer le « MUR ~2 h » du jalon 1.5 :

| Pilotage | Runs | Durée |
|---|---|---|
| **ne jamais toucher l'écran** | 18 | 2,00 h |
| foncer sur le bot le plus proche | 23 | 2,39 h |
| interception (vise où le bot sera) | 22 | 1,85 h |

Ne rien faire **valait mieux** que charger. La cause était dans `resolveCollision`
(`src/sim/combat.ts`) : les dégâts étaient proportionnels à la vitesse **relative**
d'impact, la même valeur pour les deux toupies. Foncer et encaisser produisaient
rigoureusement le même `impact`, et comme le joueur gagne l'échange sur ses stats
(30/(30+6) contre 18/(18+10)), il lui suffisait d'exister. Le pilotage ne servait
qu'à provoquer les contacts — jamais à les gagner.

À noter : la spec (`docs/game-design.md` § Combat) décrivait déjà ce
comportement (« proportionnels à la vitesse relative d'impact »). Le défaut était
donc dans la règle elle-même, pas dans son implémentation.

**Correctif — partage de charge.** `impact` est exactement la somme des deux
vitesses de fermeture ; on répartit désormais les dégâts selon la part que chacun a
lui-même provoquée (`CHARGE_BONUS = 0,3` dans `src/sim/config.ts`) :

- assaut pur (l'un fonce, l'autre subit) → l'assaillant inflige ×1,3 et encaisse ×0,7 ;
- **choc frontal (les deux avancent autant) → rigoureusement inchangé.** Les deux
  poids somment toujours à 2, donc le total infligé n'a pas bougé : seule la
  répartition change.

Piège rencontré : la part doit se lire **avant** l'impulsion de rebond, qui échange
précisément les vitesses des deux toupies — la lire après inverse la réponse et
récompense la passivité. Deux tests le verrouillent (`src/sim/combat.test.ts`).

**Contre-calibrage.** Le pilotage devenu payant raccourcissait le chapitre 1 à
1,43 h. La roadmap identifie l'économie comme le levier de durée, indépendant de la
forme de la difficulté : `ECON.rewardBase` passe de 120 à **70**. Résultat mesuré,
même protocole :

| Pilotage | Runs | Durée | Écart |
|---|---|---|---|
| foncer sur le bot le plus proche | **21** | 1,76 h | référence |
| interception | 21 | 1,47 h | — |
| **ne jamais toucher l'écran** | **78** | **8,33 h** | **3,7× plus de runs** |
| tourner au bord sans jamais frapper | 75 | 16,04 h | 3,6× |

Le jalon 1.5 documentait « 21 runs, ~2 h 08 » : le nombre de runs est retrouvé à
l'identique, la durée est plus courte parce qu'un run se joue désormais plus vite.
Le pilier « le boss est le mur » tient : salle 10 = 36 morts, la suivante 14.

**Effet de bord gratuit** : le retour visuel suit tout seul. `observer.ts` déduit la
puissance d'un choc du spin réellement perdu, donc une charge produit maintenant
des étincelles et une secousse visiblement plus fortes qu'un choc subi. Le joueur
voit la différence sans qu'on ait ajouté un seul effet.

### ✅ 3. Le son

> « Le son est VRAIMENT mauvais et insupportable. »

Quatre causes distinctes, toutes traitées dans `src/audio/audio.ts` :

1. **Le bourdon.** Une dent de scie tenue à 60–250 Hz dans un passe-bas résonant
   (`Q = 3`) : le timbre d'une scie sauteuse, pas d'une toupie. Remplacé par du
   **bruit filtré en passe-bande** (380 → 2 200 Hz selon le spin) — un vrai souffle
   de rotor — doublé d'un sinus grave très discret pour le corps.
2. **La mitraille d'impacts.** Un contact prolongé émet un choc **par tick**, et
   plusieurs toupies peuvent se toucher dans le même tick. Mesuré sur 60 s de
   combat : **jusqu'à 20 sons par seconde**, 5,6/s en moyenne. Garde de 140 ms entre
   deux sons → pic 5/s, moyenne 2,2/s. La valeur doit rester **supérieure au tick de
   100 ms**, sinon elle ne filtre rien du tout (à 75 ms : pic encore à 10/s).
3. **Les clics.** Chaque son démarrait à pleine amplitude — une discontinuité, donc
   un clic à chaque impact. Toutes les enveloppes ont maintenant 4 à 8 ms d'attaque.
4. **La saturation.** Aucun limiteur, et des gains d'impact jusqu'à 0,62. Gains
   divisés par 4 à 5, `DynamicsCompressor` en sortie, master à 0,5.

Au passage : la porte de salle jouait `door()` **et** `reforge()` en même temps,
deux longs sinus de 0,5 s par-dessus le reste. Fondu en une seule signature brève de
deux notes ; `reforge()` supprimé.

Deux dettes son du jalon 1.5 tombent avec ce lot : le rotor se **tait** maintenant à
la mort et à la bascule vers l'onglet Forge, au lieu de tenir sa dernière fréquence
indéfiniment.

**À valider à l'oreille** — la mesure prouve que la mitraille, les clics et la
saturation sont partis ; elle ne dit rien du goût. Si le rotor reste pénible sur la
durée, les trois boutons sont `MIX.whirrGain`, `MIX.whirrFreqHigh` et `MIX.subGain`.

---

## Session du 2026-08-28 — le verrou du châssis

### ✅ 4. Changer de toupie à chaque salle valait mieux que bien choisir

> « Changer de toupie est gratuit et immédiat, et la table des types est affichée :
> on peut donc changer de châssis à chaque salle pour être toujours du bon côté du
> triangle. »

**Mesuré à l'autopilote, 5 graines, chapitre 1 jusqu'à validation :**

| Politique de châssis | Runs | Durée |
|---|---|---|
| **contre-pioche à chaque salle** | **17** | **1,42 h** |
| contre-pioche au départ de la descente | 30 | 2,11 h |
| Brasier Solaire, jamais changée (référence) | 23 | 1,91 h |

Le contournement pesait donc plus lourd que le triangle lui-même (dont l'écart
meilleur/pire châssis est de ×1,76), et il vidait de son sens la décision centrale
du jalon 2b : contre-piocher n'était plus un pari sur la composition d'un chapitre,
c'était une routine sans coût.

**Correctif — le châssis est figé pour la descente.** `RunState` porte désormais
`toupie`, posé au départ du run et relu par `syncRunStats` à la place de
`meta.toupies.active`. Les pièces continuent de prendre effet dans la seconde —
acquis du jalon 1, intact ; seul le châssis attend. Le choix en attente monte sur la
toupie à deux frontières, et deux seulement : la mort (`resetRun`) et le tour de
chapitre bouclé (`equipPendingToupie`, appelé quand le boss est vidé). Un joueur qui
enchaîne les descentes sans mourir peut donc toujours re-choisir — sans quoi le farm
continu du jalon 3 l'aurait enfermé sur un châssis indéfiniment.

L'écran Toupies distingue maintenant **« Pilotée »** (le run en cours) de
**« Au prochain run »** (le choix en attente), et dit en une ligne pourquoi appuyer
sur « Équiper » ne change rien à l'arène — sans ce texte, le verrou se lit comme un
bug. Sur la carte pilotée, le bouton devient « Annuler le changement » : c'est ce
qu'il fait réellement.

**Garde-fou.** `npm run calibrate` joue désormais les deux politiques de
contre-pioche côte à côte : le châssis étant verrouillé, elles doivent donner le même
résultat au centième près. Vérifié par mutation — en rendant `syncRunStats` relisant
`meta.toupies.active`, la ligne « par salle » retombe exactement à 17 runs / 1,42 h
et le harnais affiche « VERROU ROMPU ».

Aucun chiffre de la mesure principale ne bouge : 23 runs / 1,91 h, premier coffre
d'Arène 0,78 h après validation, salle 10 la plus meurtrière.

---

## En attente d'arbitrage

- 💭 **Un simple mute suffit-il ?** Le bouton actuel est tout ou rien. Un réglage de
  volume (ou un niveau « effets seuls, sans rotor ») serait la vraie réponse si le
  souffle continu gêne — mais c'est de l'UI à dessiner, pas un correctif.
- 💭 **Rendre la charge lisible *avant* le choc.** Le retour existe à l'impact, pas
  pendant l'approche. Une amorce sur le bord d'attaque quand le joueur fonce à
  pleine vitesse vers un adversaire apprendrait la règle sans texte. Coût réel,
  valeur à confirmer une fois le bandeau d'accueil testé sur de vrais débutants.
- 💭 **`CHARGE_BONUS = 0,3` est le réglage doux.** Mesuré aussi à 0,45 (passivité 9×
  plus lente) et 0,6 (21× plus lente). 0,3 a été retenu pour que le débutant qui
  n'a pas encore compris puisse quand même avancer un peu. À remonter si le message
  ne passe toujours pas.
- 📋 **Les autres écrans n'ont pas été testés.** Ce lot ne touche que l'arène ;
  Forge, Coffres et Toupies n'ont reçu aucun retour.

---

## Comment mesurer (à réutiliser)

Les chiffres ci-dessus viennent de sondes jetables, écrites comme des tests Vitest
dans `src/` puis supprimées — la simulation étant pure et déterministe, un chapitre
entier se rejoue en quelques millisecondes hors navigateur.

- **Écart entre stratégies** : boucler `tick()` avec un `steer` calculé (passif,
  charge, interception, kite), racheter gloutonnement à chaque mort, compter les
  runs jusqu'à `chapterValidated`. 5 seeds, moyenne.
- **Cadence sonore** : rejouer `takeSnapshot` / `observe` autour de chaque `tick()`
  et compter les `hits` retenus par le filtre de `CombatScreen`.
- **Rendu** : `npm run dev` puis Playwright (voir `scripts/shots.mjs`) — c'est le
  seul moyen de juger un repère visuel.
- **Vérifier en navigateur un mécanisme qui n'arrive qu'au bout d'une descente**
  (le boss vaincu, par exemple) : jouer les dix salles en temps réel demande une
  dizaine de minutes. Accélérer l'horloge de la page suffit — un `page.addInitScript`
  qui enveloppe `requestAnimationFrame` pour avancer un temps virtuel de 240 ms par
  image et fait pointer `performance.now` dessus. `useGameLoop` consomme alors
  ~2,4 ticks par image au lieu d'un tous les six, soit ×14 : le boss tombe en une
  trentaine de secondes. La simulation avançant par pas fixes de 100 ms,
  **ce qu'elle calcule est rigoureusement inchangé** — seule la cadence
  d'observation bouge. Sauvegarde de départ injectée dans `localStorage` avant le
  premier chargement, pièces au rang 11, pour que les salles tombent vite.
