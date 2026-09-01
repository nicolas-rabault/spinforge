# Calibration des chapitres — le combat (jalon 3, lot A)

Passe de calibration de **`bot.scaling.spinPerChapter`** et
**`bot.scaling.attackPerChapter`**, les deux facteurs géométriques appliqués en
`Math.pow(facteur, chapitre - 1)` et multipliés au palier linéaire par salle.
Ils portaient depuis la tâche 6 des valeurs provisoires — **1,2** et **1,1** —
que personne n'avait jamais mesurées.

`econ.rewardPerChapter` **n'a pas bougé** de sa valeur provisoire 1,25 pendant
toute la passe. Ce projet a payé deux fois pour avoir mélangé une passe de
combat et une passe d'économie dans un même changement ; l'économie est la
tâche suivante.

## Les garde-fous, dans l'ordre où ils priment

1. **Dans CHAQUE chapitre, la salle 10 reste la salle la plus meurtrière.**
   « Le mur n'est jamais un bug, c'est le produit. »
2. **Le chapitre 1 ne bouge pas d'un chiffre** : 0,32 h · 9 descentes ·
   `[10,23]` · premier coffre 0,00 h. Son exposant vaut 0 — s'il bouge, c'est
   un bug, pas un réglage.
3. **La passivité reste « jamais »**, et les séries châssis / contre-pioche
   restent identiques (bornées au chapitre 1, elles ne peuvent pas bouger).
4. Seulement ensuite les cibles : chapitre 3 nettement plus coûteux que le 2,
   chapitre 4 au-dessus, et 10/10 graines partout — ou aussi près que les
   garde-fous le permettent.

## Les valeurs de départ

| Bouton | Valeur provisoire |
| --- | --- |
| `bot.scaling.spinPerChapter` | 1,2 |
| `bot.scaling.attackPerChapter` | 1,1 |
| `econ.rewardPerChapter` | 1,25 — **gelé, non balayé** |

Relevé de la tâche 8 à ces valeurs (dix graines) :

```
Chapitre 1 : 0.32 h cumulées ·  9 descentes · [10,23]   · garde-fou oui
Chapitre 2 : 10/10 · 0.47 h (+0.15) ·  2 descentes · [10,5]    · oui
Chapitre 3 : 10/10 · 1.23 h (+0.76) · 12 descentes · [10,43]   · oui
Chapitre 4 :  1/10 · 1.02 h          · 10 descentes · [3,3034] · NON
```

## Le balayage brut — 26 mesures, dix graines chacune

Grille étendue vers le bas au fil des données : la consigne partait de
`spin ∈ [1,10 ; 1,40]`, or le chapitre 4 réclamait bien plus bas. Deux points
sont des **diagnostics**, pas des candidats : `1,00 / 1,00` (le plancher, où
`Math.pow(1, n) = 1` rend les chapitres 2 à 4 bit à bit identiques au chapitre 1)
et `0,90 / 0,90` (sous le plancher, chapitre 4 plus faible que le chapitre 1).

| `spin` | `attack` | ch. 1 | ch. 2 : +h · desc. · plus meurtrière | ch. 3 : +h · desc. · plus meurtrière | ch. 4 : validé · plus meurtrière | GF 1 sur ch. 1-3 |
|---|---|---|---|---|---|---|
| **0.90** | **0.90** | ✓ | +0.11 h · 3 · s.7 (5) **✗** | +0.08 h · 3 · s.6 (3) **✗** | 10/10 · s.4 (37) **✗** | **✗** |
| **1.00** | **1.00** | ✓ | +0.23 h · 3 · s.10 (12) ✓ | +0.10 h · 2 · s.10 (12) ✓ | 8/10 · s.3 (1224) **✗** | **✓** |
| **1.02** | **1.02** | ✓ | +0.12 h · 2 · s.10 (5) ✓ | +0.15 h · 3 · s.10 (6) ✓ | 6/10 · s.3 (2553) **✗** | **✓** |
| **1.04** | **1.02** | ✓ | +0.13 h · 2 · s.9 (3) **✗** | +0.16 h · 3 · s.10 (11) ✓ | 9/10 · s.3 (754) **✗** | **✗** |
| **1.05** | **1.02** | ✓ | +0.15 h · 2 · s.10 (6) ✓ | +0.23 h · 2 · s.10 (12) ✓ | 8/10 · s.3 (1180) **✗** | **✓** |
| **1.06** | **1.02** | ✓ | +0.14 h · 2 · s.10 (4) ✓ | +0.27 h · 3 · s.10 (9) ✓ | 6/10 · s.3 (2304) **✗** | **✓** |
| **1.10** | **1.02** | ✓ | +0.12 h · 1 · s.7 (2) **✗** | +0.28 h · 4 · s.10 (11) ✓ | 4/10 · s.3 (3014) **✗** | **✗** |
| **1.15** | **1.02** | ✓ | +0.22 h · 3 · s.10 (15) ✓ | +0.11 h · 2 · s.10 (9) ✓ | 0/10 · s.3 (3935) **✗** | **✓** |
| **1.02** | **1.05** | ✓ | +0.10 h · 2 · s.10 (4) ✓ | +0.27 h · 3 · s.10 (9) ✓ | 7/10 · s.3 (1917) **✗** | **✓** |
| **1.04** | **1.05** | ✓ | +0.11 h · 2 · s.10 (3) ✓ | +0.23 h · 5 · s.10 (20) ✓ | 3/10 · s.3 (4121) **✗** | **✓** |
| **1.05** | **1.05** | ✓ | +0.20 h · 3 · s.10 (8) ✓ | +0.12 h · 2 · s.10 (9) ✓ | 6/10 · s.3 (2264) **✗** | **✓** |
| **1.06** | **1.05** | ✓ | +0.21 h · 2 · s.10 (10) ✓ | +0.16 h · 3 · s.10 (12) ✓ | 4/10 · s.3 (3490) **✗** | **✓** |
| **1.08** | **1.05** | ✓ | +0.11 h · 1 · s.5 (1) **✗** | +0.23 h · 3 · s.10 (6) ✓ | 4/10 · s.3 (3277) **✗** | **✗** |
| **1.10** | **1.05** | ✓ | +0.10 h · 1 · s.10 (3) ✓ | +0.33 h · 4 · s.10 (10) ✓ | 1/10 · s.3 (4631) **✗** | **✓** |
| **1.15** | **1.05** | ✓ | +0.16 h · 2 · s.10 (9) ✓ | +0.37 h · 4 · s.10 (17) ✓ | 2/10 · s.3 (3358) **✗** | **✓** |
| **1.00** | **1.10** | ✓ | +0.16 h · 2 · s.10 (6) ✓ | +0.09 h · 2 · s.10 (6) ✓ | 4/10 · s.3 (3704) **✗** | **✓** |
| **1.02** ← | **1.10** | ✓ | +0.18 h · 3 · s.10 (7) ✓ | +0.27 h · 2 · s.10 (10) ✓ | 7/10 · s.3 (1954) **✗** | **✓** |
| **1.03** | **1.10** | ✓ | +0.14 h · 2 · s.10 (8) ✓ | +0.11 h · 2 · s.10 (5) ✓ | 7/10 · s.3 (1891) **✗** | **✓** |
| **1.04** | **1.10** | ✓ | +0.17 h · 2 · s.10 (3) ✓ | +0.21 h · 2 · s.10 (6) ✓ | 6/10 · s.3 (2320) **✗** | **✓** |
| **1.05** | **1.10** | ✓ | +0.25 h · 3 · s.10 (15) ✓ | +0.20 h · 3 · s.10 (11) ✓ | 7/10 · s.3 (2269) **✗** | **✓** |
| **1.06** | **1.10** | ✓ | +0.16 h · 2 · s.10 (8) ✓ | +0.16 h · 2 · s.10 (20) ✓ | 7/10 · s.3 (1787) **✗** | **✓** |
| **1.08** | **1.10** | ✓ | +0.16 h · 2 · s.10 (7) ✓ | +0.22 h · 4 · s.10 (11) ✓ | 5/10 · s.3 (2945) **✗** | **✓** |
| **1.10** | **1.10** | ✓ | +0.17 h · 3 · s.10 (10) ✓ | +0.24 h · 4 · s.10 (13) ✓ | 3/10 · s.3 (3631) **✗** | **✓** |
| **1.15** | **1.10** | ✓ | +0.25 h · 2 · s.10 (13) ✓ | +0.25 h · 4 · s.10 (6) ✓ | 2/10 · s.3 (3514) **✗** | **✓** |
| **1.20** | **1.10** | ✓ | +0.15 h · 2 · s.10 (5) ✓ | +0.76 h · 12 · s.10 (43) ✓ | 1/10 · s.3 (3034) **✗** | **✓** |
| **1.02** | **1.15** | ✓ | +0.18 h · 1 · s.10 (6) ✓ | +0.16 h · 2 · s.10 (7) ✓ | 7/10 · s.3 (1953) **✗** | **✓** |

Le premier coffre est resté à **0,00 h** et la passivité à **« jamais »** sur
**les vingt-six** mesures : ces deux garde-fous sont bornés au chapitre 1, donc
insensibles à ces boutons par construction. Ils ne discriminent rien ici — mais
les relever à chaque fois était le seul moyen de le prouver plutôt que de le
supposer.

## Ce que le balayage a appris, et qui vaut bien plus que la valeur retenue

### 1. Le mur du chapitre 4 n'est pas dans ces deux boutons. Aucune valeur ne le répare.

C'est le résultat central de cette passe, et il est négatif.

Au **plancher `1,00 / 1,00`**, `Math.pow(1, n)` vaut 1 pour tout `n` : les bots
du chapitre 4 sont alors **strictement identiques** à ceux du chapitre 1, et le
joueur y arrive avec trois chapitres d'équipement en plus. Le chapitre 4 devrait
être une promenade. Il reste un mur :

```
Chapitre 3 (plancher) : salle 1 vidée   51 fois — plus meurtrière [10,12]  oui
Chapitre 4 (plancher) : salle 1 vidée 2881 fois — plus meurtrière [3,1224] NON
```

**56 fois plus de tentatives, à bots rigoureusement égaux.** La difficulté du
chapitre 4 ne vient donc pas du facteur de chapitre : elle vient de la **table
`botTypes["4"]`**, seule autre différence entre les deux chapitres dans la
simulation. C'est le chapitre « sans contre-pioche gratuite » — trois salles
`equilibre` plus le boss, contre lesquelles Brasier Solaire (`equilibre`, le
châssis de la mesure principale) perd son avantage de type : `typeMult` rend
+10 % aux deux camps au lieu de +10 % au seul joueur.

Descendre **sous** le plancher ne sauve rien non plus : à `0,90 / 0,90`, le
chapitre 4 passe enfin 10/10 — mais le jeu devient si mou que les morts
retombent à 3-5 par chapitre, le classement des salles n'est plus que du bruit,
et le garde-fou casse d'un coup dans **les chapitres 2, 3 et 4**. On échangerait
un échec contre trois.

**Entre « assez dur pour que la salle 10 pèse » et « assez doux pour qu'on y
arrive », il n'y a pas d'intersection sur ces deux boutons.**

### 2. Le garde-fou du chapitre 4 échoue sur un entonnoir, pas sur un pic de difficulté

La métrique du harnais est le **nombre absolu** de morts par salle. Au chapitre
4, la salle 3 la remporte simplement parce qu'elle est la première où l'on meurt :
tout le monde y passe, presque personne n'atteint la salle 10. Les taux de
létalité **par tentative**, aux valeurs retenues, disent l'inverse :

| salle | 3 | 4 | 5 | 6 | 7 | 8 | 9 | **10** |
|---|---|---|---|---|---|---|---|---|
| morts / tentatives | 47 % | 47 % | 44 % | 50 % | 49 % | 44 % | 39 % | **88 %** |

**Par tentative, la salle 10 est de très loin la plus meurtrière du chapitre 4
(88 %) — le pilier de design tient.** Ce qui échoue, c'est la façon dont le
harnais le mesure : deux graines bloquées qui brûlent leurs 20 h simulées à
mourir salle 3 écrasent le décompte absolu (98 % des morts du chapitre viennent
d'elles). Le compteur n'est pas faux, il est *dominé par les graines qui ne
valident pas*. Tant que le chapitre 4 n'est pas validé 10/10, sa ligne « salle
la plus meurtrière » ne mesure pas la difficulté des salles mais la longueur de
l'entonnoir. **C'est une limite du harnais à porter à la tâche suivante**, pas
un réglage à forcer ici.

### 3. Les deux boutons ne font pas le même métier — et ce n'est pas celui qu'on croyait

- **`spinPerChapter` pilote le mur du chapitre 4.** La validation s'effondre
  proprement et de façon monotone quand il monte : à `attack = 1,10`, elle passe
  de 7/10 (spin 1,02) à 3/10 (1,10) puis 1/10 (1,20).
- **`attackPerChapter` pilote la lisibilité du garde-fou.** Il ne change presque
  rien à la validation, mais il tient le signal de mortalité au-dessus du bruit
  dans les chapitres 2 et 3. C'est **le seul des trois axes testés dont la
  colonne entière est sans trou** :

| colonne | valeurs de `spin` testées | trous |
|---|---|---|
| `attack = 1,02` | 1,02 · 1,04 · 1,05 · 1,06 · 1,10 · 1,15 | **deux** (1,04 et 1,10 : chapitre 2 tombe sur les salles 9 et 7) |
| `attack = 1,05` | 1,02 · 1,04 · 1,05 · 1,06 · 1,08 · 1,10 · 1,15 | **un** (1,08 : chapitre 2 tombe salle 5, avec **1 seule mort**) |
| `attack = 1,10` | 1,00 · 1,02 · 1,03 · 1,04 · 1,05 · 1,06 · 1,08 · 1,10 · 1,15 · 1,20 | **aucun** |

Les trous ne sont pas des zones de difficulté : ce sont des chapitres 2 devenus
si doux que la salle gagnante ne compte plus qu'**une à trois morts**. À ce
niveau, le classement est tiré au sort. Monter l'attaque ne rend pas le jeu plus
dur au chapitre 2, il rend le pilier *mesurable*.

## Le palier retenu, et pourquoi

**Palier : `attackPerChapter = 1,10`, `spinPerChapter ∈ [1,00 ; 1,20]`.**
Dix valeurs consécutives de `spin` testées, **toutes** tiennent le garde-fou 1
dans les chapitres 1, 2 et 3. Aucune autre colonne du balayage n'y parvient.

Sur l'axe de l'attaque, à `spin = 1,02` : `1,02 · 1,05 · 1,10 · 1,15` tiennent
aussi, quatre valeurs consécutives. **Le point retenu est donc intérieur dans
les deux directions**, avec au moins un voisin qui tient de chaque côté — pas un
pic isolé comme `rewardBase = 86` l'avait été.

### Le choix dans le palier

Les garde-fous 1 à 3 étant tenus partout dans le palier, ils ne départagent
rien : on descend aux cibles, dans l'ordre.

**Cible « 10/10 graines, ou aussi près que possible ».** Sur la colonne
`attack = 1,10`, la validation du chapitre 4 vaut 4, **7, 7**, 6, **7, 7**, 5,
3, 2, 1 pour `spin` = 1,00 · **1,02** · 1,03 · 1,04 · **1,05** · 1,06 · 1,08 ·
1,10 · 1,15 · 1,20. Quatre valeurs sont à égalité au maximum : **1,02 · 1,03 ·
1,05 · 1,06**.

**Cible « chapitre 3 nettement plus coûteux que le chapitre 2 »** (les deux sont
validés 10/10, leurs médianes sont donc comparables — celle du chapitre 4 ne
l'est pas, voir la réserve plus bas). Entre les quatre ex æquo :

| `spin` | ch. 2 | ch. 3 | marche |
|---|---|---|---|
| **1,02** | +0,18 h | +0,27 h | **+50 %** |
| 1,03 | +0,14 h | +0,11 h | −21 % |
| 1,05 | +0,25 h | +0,20 h | −20 % |
| 1,06 | +0,16 h | +0,16 h | 0 % |

**`spin = 1,02` est la seule des quatre qui produise la marche demandée**, et
elle la produit largement. Les trois autres l'aplatissent ou l'inversent.

**Valeurs retenues : `spinPerChapter` 1,2 → 1,02 · `attackPerChapter` 1,1 → 1,1
(inchangée).**

Que l'attaque ne bouge pas n'est pas une passe vide : la mesure transforme une
valeur provisoire jamais vérifiée en la seule valeur de l'axe dont la colonne
entière tient le pilier. Elle est conservée parce que le balayage la désigne.

### La contrainte dure sur 1,0, et sa vérification

Ni l'un ni l'autre des facteurs ne pouvait valoir exactement **1,0** :
`Math.pow(1, n)` vaut 1 pour tout `n`, et les deux tests de `src/sim/salle.test.ts`
qui défendent ce mécanisme deviendraient inertes — ils passeraient même si
l'exposant était faux ou le mécanisme absent. `1,02` laisse `pow(1,02 ; 2) =
1,0404`, soit **80 000 fois la tolérance** de `toBeCloseTo(…, 6)`. Vérifié par
mutation, pas par raisonnement :

| mutation appliquée à `src/sim/salle.ts` | résultat |
|---|---|
| exposant `chapter` au lieu de `chapter - 1` | **2 tests rouges** (`… expected 1224 to be 1200`) |
| facteur de chapitre supprimé (`* 1`) | **1 test rouge** (`… expected 1 to be close to 1.0404`) |

Les deux mutants sont tués. Le mécanisme reste sous test à 1,02.

## Rapport complet aux valeurs retenues

`spinPerChapter = 1,02` · `attackPerChapter = 1,10` · `rewardPerChapter = 1,25`
(inchangé).

```
=== Calibration — 10 graines ===
Premier coffre ouvert    : médiane 0.00 h

--- Chapitre 1 : validé par 10/10 graines · 0.32 h cumulées (+0.32 h) · 9.00 descentes · salle la plus meurtrière [10,23]
    salle 10 la plus meurtrière : oui
    salle 1 : 6.90 s  (vidée 107 fois, morts 0)
    salle 2 : 6.10 s  (vidée 107 fois, morts 0)
    salle 3 : 9.80 s  (vidée 106 fois, morts 1)
    salle 4 : 14.80 s  (vidée 106 fois, morts 0)
    salle 5 : 16.50 s  (vidée 96 fois, morts 10)
    salle 6 : 18.30 s  (vidée 87 fois, morts 9)
    salle 7 : 21.10 s  (vidée 66 fois, morts 21)
    salle 8 : 22.60 s  (vidée 48 fois, morts 18)
    salle 9 : 23.30 s  (vidée 33 fois, morts 15)
    salle 10 : 64.80 s  (vidée 10 fois, morts 23)

--- Chapitre 2 : validé par 10/10 graines · 0.50 h cumulées (+0.18 h) · 3.00 descentes · salle la plus meurtrière [10,7]
    salle 10 la plus meurtrière : oui
    salle 1 : 9.50 s  (vidée 26 fois, morts 0)
    salle 2 : 6.90 s  (vidée 26 fois, morts 0)
    salle 3 : 11.00 s  (vidée 24 fois, morts 2)
    salle 4 : 13.80 s  (vidée 23 fois, morts 1)
    salle 5 : 20.70 s  (vidée 22 fois, morts 1)
    salle 6 : 21.20 s  (vidée 21 fois, morts 1)
    salle 7 : 20.70 s  (vidée 17 fois, morts 4)
    salle 8 : 28.00 s  (vidée 17 fois, morts 0)
    salle 9 : 25.10 s  (vidée 17 fois, morts 0)
    salle 10 : 99.20 s  (vidée 10 fois, morts 7)

--- Chapitre 3 : validé par 10/10 graines · 0.77 h cumulées (+0.27 h) · 2.00 descentes · salle la plus meurtrière [10,10]
    salle 10 la plus meurtrière : oui
    salle 1 : 7.20 s  (vidée 28 fois, morts 0)
    salle 2 : 9.80 s  (vidée 28 fois, morts 0)
    salle 3 : 11.30 s  (vidée 28 fois, morts 0)
    salle 4 : 18.30 s  (vidée 28 fois, morts 0)
    salle 5 : 18.10 s  (vidée 26 fois, morts 2)
    salle 6 : 19.80 s  (vidée 24 fois, morts 2)
    salle 7 : 22.70 s  (vidée 21 fois, morts 3)
    salle 8 : 26.90 s  (vidée 21 fois, morts 0)
    salle 9 : 27.70 s  (vidée 20 fois, morts 1)
    salle 10 : 110.20 s  (vidée 10 fois, morts 10)

--- Chapitre 4 : validé par 7/10 graines · 0.93 h cumulées (+0.16 h) · 6.00 descentes · salle la plus meurtrière [3,1954]
    salle 10 la plus meurtrière : NON
    salle 1 : 11.10 s  (vidée 4174 fois, morts 0)
    salle 2 : 10.40 s  (vidée 4173 fois, morts 0)
    salle 3 : 9.90 s  (vidée 2219 fois, morts 1954)
    salle 4 : 15.80 s  (vidée 1184 fois, morts 1035)
    salle 5 : 18.10 s  (vidée 658 fois, morts 526)
    salle 6 : 19.00 s  (vidée 327 fois, morts 331)
    salle 7 : 21.20 s  (vidée 167 fois, morts 160)
    salle 8 : 24.40 s  (vidée 94 fois, morts 73)
    salle 9 : 28.10 s  (vidée 57 fois, morts 37)
    salle 10 : 97.90 s  (vidée 7 fois, morts 50)

Garde-fou passivité      : jamais — doit rester très au-dessus de la référence

=== Comparatif châssis — chapitre 1 (10 graines) ===
Brasier Solaire    (equilibre ) : 9.00 runs · 0.32 h · salle la plus meurtrière [10,23]
Typhon Primal      (attaque   ) : 19.00 runs · 0.46 h · salle la plus meurtrière [6,27]
Carapace Abyssale  (defense   ) : 5.00 runs · 0.29 h · salle la plus meurtrière [10,16]
Tigre Foudre       (endurance ) : 19.00 runs · 0.82 h · salle la plus meurtrière [10,60]
Écart meilleur/pire (runs) : 19/5 = ×3.80 (cible : < ×2)

=== Verrou du châssis — contre-pioche du triangle (10 graines) ===
rebascule à chaque salle        : 19.00 runs · 0.46 h
même choix, tenu jusqu'au boss  : 19.00 runs · 0.46 h
Verrou actif : changer de châssis en cours de descente ne rapporte rien.
```

## Lecture des garde-fous aux valeurs retenues

| Garde-fou | État | Mesure |
|---|---|---|
| 1. Salle 10 la plus meurtrière — **chapitre 1** | **TENU** | 23 morts contre 21 (salle 7) |
| 1. Salle 10 la plus meurtrière — **chapitre 2** | **TENU** | 7 morts contre 4 (salle 7) |
| 1. Salle 10 la plus meurtrière — **chapitre 3** | **TENU** | 10 morts contre 3 (salle 7) |
| 1. Salle 10 la plus meurtrière — **chapitre 4** | **ÉCHEC** | 50 morts contre 1 954 (salle 3) — **mais 88 % de létalité par tentative contre 47 %** ; voir § 2 |
| 2. Chapitre 1 immobile | **TENU** | identique au chiffre près, ligne à ligne (ci-dessous) |
| 3. Passivité « jamais » | **TENU** | jamais validée en 20 h simulées |
| 3. Premier coffre immédiat | **TENU** | 0,00 h |
| 3. Séries châssis / contre-pioche | **TENU** | identiques à la tâche 8, verrou toujours actif |
| 4. Chapitre 3 plus coûteux que le 2 | **TENU** | +0,27 h contre +0,18 h (+50 %) |
| 4. Chapitre 4 plus coûteux que le 3 | **NON CONCLUANT** | 7/10 graines : sa médiane n'est pas comparable |
| 4. 10/10 graines partout | **TENU ch. 1-3**, 7/10 au ch. 4 | 7/10 est le maximum atteignable sur le palier |

### Non-régression du chapitre 1, ligne à ligne

Le chapitre 1 porte l'exposant 0 : par construction il ne peut pas bouger, et
c'est justement pour ça qu'il sert de détecteur de bug. Comparé au relevé de
référence (tâche 8 / journal du 28 août) :

| | référence | mesuré | |
|---|---|---|---|
| durée cumulée | 0,32 h | 0,32 h | = |
| descentes | 9 | 9 | = |
| salle la plus meurtrière | `[10,23]` | `[10,23]` | = |
| premier coffre | 0,00 h | 0,00 h | = |
| passivité | jamais | jamais | = |
| morts salles 1→10 | 0,0,1,0,10,9,21,18,15,23 | 0,0,1,0,10,9,21,18,15,23 | = |
| durées salles 1→10 (s) | 6,9 · 6,1 · 9,8 · 14,8 · 16,5 · 18,3 · 21,1 · 22,6 · 23,3 · 64,8 | idem | = |
| écart châssis | ×3,80 | ×3,80 | = |
| verrou contre-pioche | 19 runs / 0,46 h des deux côtés | idem | = |

Aucun chiffre du chapitre 1 n'a bougé. Le mécanisme se comporte comme sa
spécification le promet.

## Ce qui reste en dette après cette passe

- **Le garde-fou 1 échoue au chapitre 4, et aucune valeur de ces deux boutons ne
  le répare** (démontré au plancher `1,00 / 1,00` et sous le plancher
  `0,90 / 0,90`). La cause est ailleurs : la table `botTypes["4"]`, qui prive le
  châssis de la mesure de son avantage de type sur quatre salles. Bouton fermé
  dans cette tâche. **C'est la conclusion la plus importante de la passe : la
  prochaine tentative de réparation du chapitre 4 ne doit pas commencer par ces
  deux facteurs.**
- **La métrique « salle la plus meurtrière » du harnais est un décompte absolu**,
  donc écrasée par les graines qui ne valident pas le chapitre. Un ratio
  morts/tentatives — déjà calculable depuis les chiffres imprimés — dirait la
  vérité du pilier là où le décompte absolu ment. À arbitrer par la tâche
  suivante ; ce n'était pas le mandat ici.
- **Le coût du chapitre 4 n'est pas mesurable tant qu'il n'est pas validé
  10/10** : sa médiane porte sur 7 graines, celle du chapitre 3 sur 10. La cible
  « chapitre 4 au-dessus du 3 » reste donc non tranchée, et le +0,16 h du rapport
  ne doit pas être lu comme « moins cher que le chapitre 3 ».
- **La marche du chapitre 2 au chapitre 3 est bruitée dans tout le palier**
  (+50 % à 1,02, mais −21 %, −20 %, 0 % aux trois valeurs voisines à égalité de
  validation). Le palier garantit que le *voisinage* tient le pilier, pas que
  chaque point y donne la même marche — même réserve que celle notée pour
  `rewardBase` le 28 août.
- **L'écart entre châssis reste à ×3,80** pour une cible de ×2. Inchangé par
  cette passe (chapitre 1, exposant 0), toujours porté par les profils de
  châssis, toujours en dette.

---

# Calibration des chapitres — l'économie (jalon 3, lot A)

Passe de calibration d'**`econ.rewardPerChapter`**, le facteur géométrique
appliqué en `Math.pow(facteur, chapitre - 1)` aux crédits que paie une salle
vidée. Il portait depuis le jalon 2 la valeur provisoire **1,25**, jamais
mesurée.

**`bot.scaling.spinPerChapter` (1,02) et `bot.scaling.attackPerChapter` (1,10)
sont restés gelés sur toute la passe.** Ils viennent d'être posés par la passe
de combat contre un palier démontré ; ce projet a payé deux fois pour avoir
mélangé une passe de combat et une passe d'économie dans un même changement.
Le commit de cette tâche ne touche qu'une ligne de `balance.json`.

## L'hypothèse à tester, et son résultat

La passe de combat a démontré un résultat négatif : **les deux facteurs de
combat ne peuvent pas réparer le chapitre 4**. Même au plancher `1,00 / 1,00`,
où les bots du chapitre 4 sont bit à bit identiques à ceux du chapitre 1, le
chapitre 4 restait un mur (salle 1 vidée 2 881 fois contre 51 au chapitre 3).

`rewardPerChapter` est un bouton d'une autre nature : il ne change pas la force
des bots, il change **la vitesse à laquelle le joueur s'équipe avant de les
rencontrer**. D'où l'hypothèse à tester dans les deux sens : *un joueur plus
riche arrivant au chapitre 4 n'est pas la même expérience qu'un chapitre 4 plus
faible.*

**Résultat : l'hypothèse est vraie, et son signe est l'inverse de l'intuition.**

- **Vers le haut — un joueur plus riche ne casse pas le mur, il le déplace vers
  le bas.** À 1,40 le chapitre 4 tombe à 1/10 et le chapitre 3 perd son
  garde-fou ; à 1,60 le chapitre 4 est à 0/10 ; à 2,00 c'est le **chapitre 3**
  qui n'est plus jamais validé (0/10). Plus le joueur est riche, plus tôt le mur
  apparaît.
- **Vers le bas — un joueur plus pauvre répare le chapitre 4, entièrement.** De
  0,60 à 1,20, **onze valeurs consécutives**, le chapitre 4 se valide
  **10/10 graines** et sa ligne « salle 10 la plus meurtrière » repasse à
  **`oui`** sur le décompte absolu.

**Le garde-fou 1 tient donc dans les quatre chapitres, chapitre 4 compris, pour
la première fois du jalon.** C'est le résultat marquant de cette passe : le mur
du chapitre 4 n'était pas dans la table `botTypes["4"]` seule — il était dans
l'interaction entre cette table et un joueur trop vite équipé.

## Le mécanisme : la richesse achète de la vitesse, et la vitesse tue

Contre-intuitif, donc à expliquer plutôt qu'à constater. Dans la simulation, les
bots **ne s'adaptent jamais** au joueur (`makeBot` ne lit que `chapter` et
`salle`). Un joueur plus riche est donc strictement plus fort. Et pourtant il
meurt davantage.

La lecture des morts par salle le dit sans ambiguïté. À `rewardPerChapter =
2,00`, chapitre 3 :

```
salle 1 : vidée 18105 fois, morts     0 ·  0 % létalité/tentative
salle 2 : vidée 18103 fois, morts     0 ·  0 % létalité/tentative
salle 3 : vidée  5831 fois, morts 12272 · 68 % létalité/tentative
```

**Zéro mort sur 18 000 passages aux salles 1 et 2, puis 68 % à la salle 3.** Or
`arena.breach.fromSalle` vaut **3** : la salle 3 est exactement celle où les
brèches d'éjection apparaissent (et où la zone `pointes` entre en jeu). Le
joueur ne meurt pas au combat, il **sort de l'arène**.

Pourquoi la richesse y mène : les crédits partent en `tryUpgrade` sur
l'emplacement le moins cher, donc régulièrement sur la **Pointe**, dont le
niveau multiplie `maxSpeed` (`pieceEffect.pointeSpeed`). L'autopilote « terrain »
vise un point à 26 px derrière la cible sans jamais tenir compte de sa propre
vitesse : passé un certain `maxSpeed`, il dépasse sa consigne et se jette
lui-même dans la brèche. **La richesse achète de la vitesse, et dans un jeu
d'éjection la vitesse non maîtrisée est une cause de mort, pas une force.**

C'est une propriété de l'autopilote de mesure autant que du jeu — un joueur
humain freine. Elle est notée en dette ci-dessous : elle borne ce que ce harnais
peut dire d'un joueur très équipé.

## Le balayage brut — 33 mesures, dix graines chacune

Grille étendue dans les deux directions au fil des données, puis densifiée au
centième au-dessus de 1,0 (la région où la valeur retenue devait tomber, voir
§ « le signe » plus bas). Le premier coffre est resté à **0,00 h**, la passivité
à **« jamais »**, l'écart entre châssis à **×3,80** et le verrou de contre-pioche
actif sur **les trente-trois** mesures : ces séries sont bornées au chapitre 1,
donc insensibles à ce bouton par construction — les relever à chaque fois était
le seul moyen de le prouver plutôt que de le supposer.

| `rewardPerChapter` | ch. 1 | ch. 2 : graines · +h · desc. · plus meurtrière | ch. 3 | ch. 4 | GF 1 sur **les quatre** |
|---|---|---|---|---|---|
| **0.60** | ✓ | 10/10 · +0,18 h · 4 · s.10 (13) ✓ | 10/10 · +0,14 h · 2 · s.10 (4) ✓ | 10/10 · +0,07 h · 1 · s.10 (2) ✓ | **✓** |
| **0.70** | ✓ | 10/10 · +0,18 h · 4 · s.10 (13) ✓ | 10/10 · +0,14 h · 3 · s.10 (7) ✓ | 10/10 · +0,16 h · 2 · s.10 (5) ✓ | **✓** |
| **0.80** | ✓ | 10/10 · +0,18 h · 3 · s.10 (10) ✓ | 10/10 · +0,26 h · 4 · s.10 (14) ✓ | 10/10 · +0,16 h · 3 · s.10 (11) ✓ | **✓** |
| **0.85** | ✓ | 10/10 · +0,18 h · 4 · s.10 (11) ✓ | 10/10 · +0,21 h · 5 · s.10 (13) ✓ | 10/10 · +0,24 h · 4 · s.10 (10) ✓ | **✓** |
| **0.90** | ✓ | 10/10 · +0,18 h · 3 · s.10 (9) ✓ | 10/10 · +0,24 h · 4 · s.10 (14) ✓ | 10/10 · +0,21 h · 4 · s.10 (7) ✓ | **✓** |
| **0.92** | ✓ | 10/10 · +0,18 h · 3 · s.10 (12) ✓ | 10/10 · +0,15 h · 5 · s.10 (10) ✓ | 10/10 · +0,35 h · 4 · s.10 (10) ✓ | **✓** |
| **0.95** | ✓ | 10/10 · +0,18 h · 3 · s.10 (8) ✓ | 10/10 · +0,21 h · 5 · s.10 (17) ✓ | 10/10 · +0,23 h · 4 · s.10 (8) ✓ | **✓** |
| **0.98** | ✓ | 10/10 · +0,18 h · 3 · s.10 (11) ✓ | 10/10 · +0,19 h · 4 · s.10 (13) ✓ | 10/10 · +0,20 h · 4 · s.10 (8) ✓ | **✓** |
| **1.00** | ✓ | 10/10 · +0,18 h · 4 · s.10 (12) ✓ | 10/10 · +0,18 h · 3 · s.10 (11) ✓ | 10/10 · +0,13 h · 4 · s.10 (7) ✓ | **✓** |
| **1.02** | ✓ | 10/10 · +0,18 h · 4 · s.10 (13) ✓ | 10/10 · +0,12 h · 3 · s.10 (6) ✓ | 10/10 · +0,14 h · 2 · s.4 (3) **✗** | **✗** |
| **1.03** | ✓ | 10/10 · +0,15 h · 3 · s.10 (10) ✓ | 10/10 · +0,12 h · 3 · s.4 (6) **✗** | 10/10 · +0,18 h · 2 · s.10 (4) ✓ | **✗** |
| **1.04** | ✓ | 10/10 · +0,18 h · 4 · s.10 (11) ✓ | 10/10 · +0,12 h · 3 · s.4 (5) **✗** | 10/10 · +0,15 h · 2 · s.4 (3) **✗** | **✗** |
| **1.05** | ✓ | 10/10 · +0,18 h · 3 · s.10 (8) ✓ | 10/10 · +0,12 h · 3 · s.10 (7) ✓ | 10/10 · +0,26 h · 3 · s.10 (6) ✓ | **✓** |
| **1.06** | ✓ | 10/10 · +0,18 h · 3 · s.10 (8) ✓ | 10/10 · +0,13 h · 2 · s.5 (5) **✗** | 10/10 · +0,13 h · 3 · s.4 (3) **✗** | **✗** |
| **1.07** | ✓ | 10/10 · +0,18 h · 4 · s.10 (8) ✓ | 10/10 · +0,10 h · 2 · s.10 (4) ✓ | 10/10 · +0,27 h · 4 · s.10 (11) ✓ | **✓** |
| **1.08** | ✓ | 10/10 · +0,18 h · 4 · s.10 (11) ✓ | 10/10 · +0,11 h · 2 · s.10 (6) ✓ | 10/10 · +0,26 h · 3 · s.10 (11) ✓ | **✓** |
| **1.09** | ✓ | 10/10 · +0,18 h · 4 · s.10 (13) ✓ | 10/10 · +0,18 h · 2 · s.10 (6) ✓ | 10/10 · +0,18 h · 4 · s.10 (13) ✓ | **✓** |
| **1.10** | ✓ | 10/10 · +0,18 h · 4 · s.10 (13) ✓ | 10/10 · +0,18 h · 3 · s.10 (7) ✓ | 10/10 · +0,18 h · 3 · s.10 (13) ✓ | **✓** |
| **1.12** | ✓ | 10/10 · +0,15 h · 3 · s.10 (8) ✓ | 10/10 · +0,17 h · 3 · s.10 (7) ✓ | 10/10 · +0,13 h · 3 · s.4 (5) **✗** | **✗** |
| **1.13** | ✓ | 10/10 · +0,15 h · 3 · s.10 (10) ✓ | 10/10 · +0,12 h · 2 · s.10 (6) ✓ | 10/10 · +0,25 h · 3 · s.10 (11) ✓ | **✓** |
| **1.14** | ✓ | 10/10 · +0,17 h · 3 · s.10 (10) ✓ | 10/10 · +0,15 h · 3 · s.10 (7) ✓ | 10/10 · +0,34 h · 6 · s.10 (17) ✓ | **✓** |
| **1.15****←** | ✓ | 10/10 · +0,15 h · 3 · s.10 (8) ✓ | 10/10 · +0,10 h · 2 · s.10 (5) ✓ | 10/10 · +0,36 h · 6 · s.10 (18) ✓ | **✓** |
| **1.16** | ✓ | 10/10 · +0,18 h · 4 · s.10 (8) ✓ | 10/10 · +0,09 h · 2 · s.10 (7) ✓ | 10/10 · +0,29 h · 3 · s.10 (10) ✓ | **✓** |
| **1.17** | ✓ | 10/10 · +0,18 h · 3 · s.10 (11) ✓ | 10/10 · +0,11 h · 2 · s.10 (4) ✓ | 10/10 · +0,33 h · 5 · s.10 (11) ✓ | **✓** |
| **1.18** | ✓ | 10/10 · +0,18 h · 4 · s.10 (10) ✓ | 10/10 · +0,12 h · 2 · s.10 (6) ✓ | 10/10 · +0,37 h · 6 · s.10 (16) ✓ | **✓** |
| **1.19** | ✓ | 10/10 · +0,18 h · 3 · s.10 (7) ✓ | 10/10 · +0,20 h · 2 · s.10 (9) ✓ | 10/10 · +0,28 h · 5 · s.10 (16) ✓ | **✓** |
| **1.20** | ✓ | 10/10 · +0,18 h · 3 · s.10 (7) ✓ | 10/10 · +0,12 h · 2 · s.10 (8) ✓ | 10/10 · +0,29 h · 7 · s.10 (23) ✓ | **✓** |
| **1.21** | ✓ | 10/10 · +0,19 h · 4 · s.10 (10) ✓ | 10/10 · +0,11 h · 2 · s.10 (5) ✓ | 10/10 · +0,44 h · 18 · s.7 (22) **✗** | **✗** |
| **1.22** | ✓ | 10/10 · +0,19 h · 4 · s.10 (12) ✓ | 10/10 · +0,25 h · 2 · s.10 (9) ✓ | 9/10 · +0,41 h · 10 · s.3 (531) **✗** | **✗** |
| **1.25** | ✓ | 10/10 · +0,18 h · 3 · s.10 (7) ✓ | 10/10 · +0,27 h · 2 · s.10 (10) ✓ | 7/10 · +0,16 h · 6 · s.3 (1954) **✗** | **✗** |
| **1.40** | ✓ | 10/10 · +0,18 h · 3 · s.10 (7) ✓ | 10/10 · +0,09 h · 2 · s.6 (5) **✗** | 1/10 · +0,10 h · 8 · s.3 (10323) **✗** | **✗** |
| **1.60** | ✓ | 10/10 · +0,19 h · 1 · s.10 (6) ✓ | 9/10 · +0,18 h · 3 · s.3 (1096) **✗** | 0/10 · +jamais h · — · s.3 (11056) **✗** | **✗** |
| **2.00** | ✓ | 10/10 · +0,18 h · 3 · s.10 (8) ✓ | 0/10 · +jamais h · — · s.3 (12272) **✗** | 0/10 · +jamais h · — · aucune **✗** | **✗** |

Colonne « ch. 1 » : ✓ signifie *bit à bit identique au relevé de la tâche 8*
(0,32 h · 9 descentes · `[10,23]`). **Aucune des trente-trois mesures ne l'a fait
bouger** — l'exposant y vaut 0, et le détecteur de bug n'a jamais sonné.

## Ce que le balayage a appris, et qui vaut plus que la valeur retenue

### 1. Le mur du chapitre 4 se répare — mais en appauvrissant le joueur, pas en l'enrichissant

C'est le résultat marquant. Le garde-fou 1 tenait déjà dans les chapitres 1 à 3 ;
il **repasse à `oui` au chapitre 4**, avec **10/10 graines**, sur une large bande
de valeurs. La passe de combat avait montré que ses deux boutons n'y pouvaient
rien ; celui-ci le peut.

Mais le sens est l'inverse de l'hypothèse de départ. Ce n'est pas « un joueur
mieux équipé franchit le mur » : c'est « un joueur moins vite équipé ne se tue
pas lui-même ». Tout au-dessus de 1,21 le chapitre 4 s'effondre, et au-delà de
1,40 c'est le chapitre 3 qui devient le mur, puis le chapitre 2 qui commence à
souffrir. **La richesse déplace le mur vers le bas, elle ne le franchit pas.**

### 2. Le garde-fou 1 échoue de deux façons distinctes, et il faut les distinguer

Les trous du balayage ne se ressemblent pas :

- **L'entonnoir** (1,21 · 1,22 · 1,25 · 1,40 · 1,60 · 2,00) : le chapitre n'est
  pas validé par toutes les graines, quelques graines bloquées brûlent leurs 20 h
  simulées à mourir tôt, et leur décompte absolu écrase celui de la salle 10.
  À 1,22, la salle 3 compte 531 morts contre 49 à la salle 10 — mais **38 % de
  létalité par tentative contre 84 %**. Le pilier tient, c'est la métrique qui
  ment. (Même diagnostic que le § 2 de la passe de combat.)
- **L'égalité dans le bruit** (1,02 · 1,03 · 1,04 · 1,06 · 1,12) : le chapitre
  est validé 10/10, mais il est devenu si doux que la salle gagnante ne compte
  que **3 à 6 morts**. À 1,02, les salles 3, 4, 6 et **10** sont à égalité
  parfaite à 3 morts ; l'ordre du tri tranche, pas la difficulté. Ces trous ne
  sont pas des zones dangereuses, ce sont des zones **non mesurables**.

Un palier n'est donc solide que si la salle 10 y gagne **avec de la marge**.
D'où la lecture des marges ci-dessous, qui a décidé le choix final.

### 3. Le mécanisme : la richesse achète de la vitesse, et la vitesse éjecte

Voir la section « Le mécanisme » plus haut : zéro mort aux salles 1 et 2 sur
18 000 passages, puis 68 % à la salle 3 — exactement `arena.breach.fromSalle`.
Le joueur trop rapide sort de l'arène. Conséquence pour la suite : **le harnais
ne sait pas mesurer un joueur très équipé**, parce que son autopilote ne freine
pas. Toute lecture du haut de la grille est donc pessimiste par construction.

### 4. Le signe du facteur n'est pas négociable, même si la mesure y invite

De 0,60 à 1,00, **neuf valeurs consécutives** tiennent le garde-fou 1 dans les
quatre chapitres, sans un seul trou — une bande plus large et plus propre que
tout ce qu'on trouve au-dessus de 1,0. Deux d'entre elles (0,85 · 0,95) sont même
les **seules de tout le balayage** à produire l'échelle complète
ch. 2 < ch. 3 < ch. 4 sur le coût marginal.

**Cette bande est pourtant écartée en bloc.** Un facteur inférieur à 1 signifie
qu'une salle d'un chapitre *plus dur* paie *moins* — l'inverse exact de la raison
d'être du bouton, écrite dans `economy.ts` : « sans ce facteur, un chapitre plus
dur paierait pareil : le joueur n'aurait aucune raison d'y descendre, et le farm
du lot B rien à farmer ». Le farm idle est verrouillé sur le meilleur chapitre
validé (pilier de design) : à facteur < 1, **progresser ferait baisser le revenu
hors-ligne**. Le test `economy.test.ts` s'intitule d'ailleurs « le revenu monte
géométriquement d'un chapitre à l'autre » — son assertion passerait, son nom
serait un mensonge, et le brief interdit de toucher aux tests.

La mesure éclaire un choix ; elle ne l'absorbe pas. **Le domaine retenu est
`> 1,0`.**

## Le palier retenu, et pourquoi

Au-dessus de 1,0, la colonne est **trouée** — c'est justement ce qui rend le
palier utile. Valeurs testées au centième et verdict du garde-fou 1 sur les
quatre chapitres :

| 1,02 | 1,03 | 1,04 | 1,05 | 1,06 | 1,07 | 1,08 | 1,09 | 1,10 | 1,12 | **1,13** | **1,14** | **1,15** | **1,16** | **1,17** | **1,18** | **1,19** | **1,20** | 1,21 | 1,22 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ✗ | ✗ | ✗ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |

**Palier retenu : `rewardPerChapter ∈ [1,13 ; 1,20]` — huit valeurs consécutives**,
bornées des deux côtés par un trou démontré (1,12 et 1,21). C'est le plus large
du domaine ; l'autre candidat (1,07–1,10) n'en compte que quatre et jouxte le
trou de 1,06. Les huit valeurs valident **les quatre chapitres 10/10** et
laissent le chapitre 1 immobile.

### Le choix dans le palier

Les garde-fous 1 à 3 étant tenus partout dans le palier, on descend aux cibles —
mais d'abord à la **robustesse** du garde-fou 1, puisque le § 2 vient de montrer
qu'un verdict `oui` gagné à une mort près ne vaut pas un verdict gagné à cinq.

| `rewardPerChapter` | marge s.10 ch. 1 | ch. 2 | ch. 3 | ch. 4 | ch. 2 en ≤ 3 descentes | ch. 4 > ch. 3 |
|---|---|---|---|---|---|---|
| 1,13 | +2 | +8 | +3 | **+7** | ✓ (3) | ✓ |
| 1,14 | +2 | +8 | +3 | +2 | ✓ (3) | ✓ |
| **1,15** | +2 | **+6** | +3 | **+5** | **✓ (3)** | **✓** |
| 1,16 | +2 | +3 | +4 | **+0** | ✗ (4) | ✓ |
| 1,17 | +2 | +5 | +2 | +2 | ✓ (3) | ✓ |
| 1,18 | +2 | +6 | +4 | +1 | ✗ (4) | ✓ |
| 1,19 | +2 | +3 | +7 | +1 | ✓ (3) | ✓ |
| 1,20 | +2 | +3 | +6 | **+6** | ✓ (3) | ✓ |

(Marge = morts de la salle 10 moins celles de la deuxième salle la plus
meurtrière. À 1,16 la marge est **nulle** au chapitre 4 : 10 morts contre 10, le
`oui` ne tient que par l'ordre du tri — le palier tient, ce point-là non.)

Trois valeurs cumulent une marge confortable au chapitre 4 et le chapitre 2 en
3 descentes : **1,13 · 1,15 · 1,20**. De ces trois, **1,13 et 1,20 sont les deux
bords du palier**, chacune adjacente à un trou. **1,15 est la seule qui soit
intérieure**, avec trois voisines qui tiennent de chaque côté.

**Valeur retenue : `econ.rewardPerChapter` 1,25 → 1,15.**

### Pourquoi 1,19 est écartée alors qu'elle coche une cible de plus

1,19 est la **seule** valeur de tout le domaine `> 1,0` où le chapitre 3 coûte
plus cher que le chapitre 2 (+0,20 h contre +0,18 h). Tentant — et c'est
exactement le piège que `rewardBase = 86` a appris à ce projet.

Ses **deux voisines immédiates inversent la marche** : 1,18 donne +0,12 contre
+0,18, et 1,20 donne +0,12 contre +0,18. L'avantage de 1,19 vaut **0,02 h**, soit
deux pas de quantification du relevé (72 s de jeu simulé), sur une grandeur qui
varie de +0,09 à +0,20 dans le palier. C'est un pic isolé sur un critère bruité,
pas une propriété du réglage. Et sa marge au chapitre 4 ne vaut **qu'une seule
mort** (16 contre 15). Un garde-fou fragile échangé contre une cible douteuse :
on refuse l'échange.

### La cible « chapitre 3 nettement plus coûteux que le chapitre 2 » n'est pas atteinte, et c'est structurel

Elle échoue à **sept des huit** valeurs du palier, et la huitième ne la franchit
que d'un cheveu. Ce n'est pas un mauvais choix de valeur : c'est ce que le bouton
fait. Monter le revenu **sur-équipe** le joueur pour le chapitre 3 (qui n'a pas
de particularité de composition) et laisse le chapitre 4 — le chapitre « sans
contre-pioche gratuite », cf. § 1 de la passe de combat — absorber tout le coût.
À 1,15 la forme obtenue est **0,32 → +0,15 → +0,10 → +0,36** : un chapitre 4
**3,6 fois plus cher** que le 3, qui est bien le mur voulu, mais un chapitre 3
qui reste une formalité. **Réparer la marche du chapitre 3 demande un bouton que
cette tâche n'ouvre pas** — sa composition, ou le palier par salle. Porté en
dette.

### La contrainte dure sur 1,0, et sa vérification

`rewardPerChapter` ne pouvait pas valoir exactement **1,0** : `Math.pow(1, n)`
vaut 1 pour tout `n`, et l'assertion de `src/sim/economy.test.ts` qui défend ce
mécanisme — `expect(c3 / c1).toBeCloseTo(Math.pow(ECON.rewardPerChapter, 2), 6)` —
deviendrait inerte : elle vaudrait `1 ≈ 1` quoi que fasse le code. Le palier
retenu ne l'effleure même pas : à 1,15, `pow(1,15 ; 2) = 1,3225`, soit **322 000
fois la tolérance** de `toBeCloseTo(…, 6)`. Vérifié par mutation, pas par
raisonnement :

| mutation appliquée à `src/sim/economy.ts` | résultat |
|---|---|
| exposant `chapter` au lieu de `chapter - 1` | **2 tests rouges** (`expected 119.6 to be close to 104` · `expected 172.5704 to be close to 150.0612`) |
| facteur de chapitre supprimé (`* 1`) | **1 test rouge** (`expected 1 to be close to 1.3224999999999998`) |

Les deux mutants sont tués — mais **pas par la même assertion, et le détail
compte**. Le décalage d'exposant est attrapé par les assertions de *valeur
absolue* (`c1` doit valoir `rewardBase × rewardGrowth³`), pas par l'assertion de
*rapport* : `c3 / c1` vaut `pow(f, 2)` que l'exposant soit `chapter` ou
`chapter - 1`, le décalage s'annulant dans la division. **L'assertion de rapport
est donc aveugle à un décalage d'exposant** ; elle ne défend que la présence et
la valeur du facteur. C'est elle seule qui tue le second mutant, et c'est bien
elle que 1,0 rendrait inerte. Les deux assertions sont nécessaires ; ni l'une ni
l'autre ne suffit.

## Rapport complet à la valeur retenue

`rewardPerChapter = 1,15` · `spinPerChapter = 1,02` · `attackPerChapter = 1,10`
(les deux facteurs de combat inchangés, gelés par consigne).

```
=== Calibration — 10 graines ===
Premier coffre ouvert    : médiane 0.00 h

--- Chapitre 1 : validé par 10/10 graines · 0.32 h cumulées (+0.32 h) · 9.00 descentes · salle la plus meurtrière [10,23]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 70 % de létalité)
    salle 1 : 6.90 s  (vidée 107 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 6.10 s  (vidée 107 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 9.80 s  (vidée 106 fois, morts 1) · 1 % létalité/tentative
    salle 4 : 14.80 s  (vidée 106 fois, morts 0) · 0 % létalité/tentative
    salle 5 : 16.50 s  (vidée 96 fois, morts 10) · 9 % létalité/tentative
    salle 6 : 18.30 s  (vidée 87 fois, morts 9) · 9 % létalité/tentative
    salle 7 : 21.10 s  (vidée 66 fois, morts 21) · 24 % létalité/tentative
    salle 8 : 22.60 s  (vidée 48 fois, morts 18) · 27 % létalité/tentative
    salle 9 : 23.30 s  (vidée 33 fois, morts 15) · 31 % létalité/tentative
    salle 10 : 64.80 s  (vidée 10 fois, morts 23) · 70 % létalité/tentative

--- Chapitre 2 : validé par 10/10 graines · 0.47 h cumulées (+0.15 h) · 3.00 descentes · salle la plus meurtrière [10,8]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 44 % de létalité)
    salle 1 : 9.50 s  (vidée 27 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 6.90 s  (vidée 27 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 8.80 s  (vidée 25 fois, morts 2) · 7 % létalité/tentative
    salle 4 : 13.80 s  (vidée 24 fois, morts 1) · 4 % létalité/tentative
    salle 5 : 20.40 s  (vidée 23 fois, morts 1) · 4 % létalité/tentative
    salle 6 : 19.60 s  (vidée 21 fois, morts 2) · 9 % létalité/tentative
    salle 7 : 21.70 s  (vidée 19 fois, morts 2) · 10 % létalité/tentative
    salle 8 : 25.30 s  (vidée 19 fois, morts 0) · 0 % létalité/tentative
    salle 9 : 25.10 s  (vidée 18 fois, morts 1) · 5 % létalité/tentative
    salle 10 : 99.20 s  (vidée 10 fois, morts 8) · 44 % létalité/tentative

--- Chapitre 3 : validé par 10/10 graines · 0.58 h cumulées (+0.10 h) · 2.00 descentes · salle la plus meurtrière [10,5]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 33 % de létalité)
    salle 1 : 10.30 s  (vidée 22 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 13.00 s  (vidée 22 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 11.30 s  (vidée 22 fois, morts 0) · 0 % létalité/tentative
    salle 4 : 17.00 s  (vidée 20 fois, morts 2) · 9 % létalité/tentative
    salle 5 : 18.10 s  (vidée 19 fois, morts 1) · 5 % létalité/tentative
    salle 6 : 15.70 s  (vidée 18 fois, morts 1) · 5 % létalité/tentative
    salle 7 : 21.00 s  (vidée 16 fois, morts 2) · 11 % létalité/tentative
    salle 8 : 22.90 s  (vidée 16 fois, morts 0) · 0 % létalité/tentative
    salle 9 : 29.20 s  (vidée 15 fois, morts 1) · 6 % létalité/tentative
    salle 10 : 99.60 s  (vidée 10 fois, morts 5) · 33 % létalité/tentative

--- Chapitre 4 : validé par 10/10 graines · 0.94 h cumulées (+0.36 h) · 6.00 descentes · salle la plus meurtrière [10,18]
    salle 10 la plus meurtrière : oui
    (lecture par tentative : salle 10, 64 % de létalité)
    salle 1 : 10.30 s  (vidée 75 fois, morts 0) · 0 % létalité/tentative
    salle 2 : 9.00 s  (vidée 75 fois, morts 0) · 0 % létalité/tentative
    salle 3 : 10.40 s  (vidée 69 fois, morts 6) · 8 % létalité/tentative
    salle 4 : 18.00 s  (vidée 62 fois, morts 7) · 10 % létalité/tentative
    salle 5 : 20.70 s  (vidée 49 fois, morts 13) · 21 % létalité/tentative
    salle 6 : 22.30 s  (vidée 39 fois, morts 10) · 20 % létalité/tentative
    salle 7 : 25.50 s  (vidée 35 fois, morts 4) · 10 % létalité/tentative
    salle 8 : 26.60 s  (vidée 34 fois, morts 1) · 3 % létalité/tentative
    salle 9 : 27.30 s  (vidée 28 fois, morts 6) · 18 % létalité/tentative
    salle 10 : 77.70 s  (vidée 10 fois, morts 18) · 64 % létalité/tentative

Garde-fou passivité      : jamais — doit rester très au-dessus de la référence

=== Comparatif châssis — chapitre 1 (10 graines) ===
Brasier Solaire    (equilibre ) : 9.00 runs · 0.32 h · salle la plus meurtrière [10,23]
Typhon Primal      (attaque   ) : 19.00 runs · 0.46 h · salle la plus meurtrière [6,27]
Carapace Abyssale  (defense   ) : 5.00 runs · 0.29 h · salle la plus meurtrière [10,16]
Tigre Foudre       (endurance ) : 19.00 runs · 0.82 h · salle la plus meurtrière [10,60]
Écart meilleur/pire (runs) : 19/5 = ×3.80 (cible : < ×2)

=== Verrou du châssis — contre-pioche du triangle (10 graines) ===
rebascule à chaque salle        : 19.00 runs · 0.46 h
même choix, tenu jusqu’au boss  : 19.00 runs · 0.46 h
Verrou actif : changer de châssis en cours de descente ne rapporte rien.
```

## Lecture des garde-fous à la valeur retenue

| Garde-fou | État | Mesure |
|---|---|---|
| 1. Salle 10 la plus meurtrière — **chapitre 1** | **TENU** | 23 morts contre 21 (salle 7) · 70 % par tentative |
| 1. Salle 10 la plus meurtrière — **chapitre 2** | **TENU** | 8 contre 2 (salle 3) · 44 % par tentative |
| 1. Salle 10 la plus meurtrière — **chapitre 3** | **TENU** | 5 contre 2 (salles 4 et 7) · 33 % par tentative |
| 1. Salle 10 la plus meurtrière — **chapitre 4** | **TENU** | 18 contre 13 (salle 5) · 64 % par tentative — **premier `oui` du jalon au chapitre 4** |
| 2. Chapitre 1 immobile | **TENU** | identique au chiffre près, ligne à ligne (ci-dessous) |
| 3. Passivité « jamais » | **TENU** | jamais validée en 20 h simulées |
| 3. Premier coffre immédiat | **TENU** | 0,00 h |
| 3. Séries châssis / contre-pioche | **TENU** | identiques à la tâche 8, écart ×3,80, verrou toujours actif |
| 4. 10/10 graines partout | **TENU** | dans **les quatre** chapitres — jamais atteint avant cette passe |
| 4. Chapitre 2 validé en 1 à 3 descentes | **TENU** | 3 descentes |
| 4. Chapitre 3 nettement plus coûteux que le 2 | **ÉCHEC** | +0,10 h contre +0,15 h — structurel, voir plus haut |
| 4. Chapitre 4 plus coûteux que le 3 | **TENU** | +0,36 h contre +0,10 h (**×3,6**), 6 descentes contre 2 |

Les quatre chapitres étant désormais validés 10/10, **leurs médianes sont enfin
comparables entre elles** : la réserve « le coût du chapitre 4 n'est pas mesurable »
que la passe de combat portait en dette est levée.

### Non-régression du chapitre 1, ligne à ligne

| | référence (tâche 8) | mesuré | |
|---|---|---|---|
| durée cumulée | 0,32 h | 0,32 h | = |
| descentes | 9 | 9 | = |
| salle la plus meurtrière | `[10,23]` | `[10,23]` | = |
| premier coffre | 0,00 h | 0,00 h | = |
| passivité | jamais | jamais | = |
| morts salles 1→10 | 0,0,1,0,10,9,21,18,15,23 | 0,0,1,0,10,9,21,18,15,23 | = |
| durées salles 1→10 (s) | 6,9 · 6,1 · 9,8 · 14,8 · 16,5 · 18,3 · 21,1 · 22,6 · 23,3 · 64,8 | idem | = |
| écart châssis | ×3,80 | ×3,80 | = |
| verrou contre-pioche | 19 runs / 0,46 h des deux côtés | idem | = |

Aucun chiffre du chapitre 1 n'a bougé sur **aucune** des trente-trois mesures.

## Ce qui reste en dette après cette passe

- **La marche du chapitre 2 → chapitre 3 est plate, voire inversée, dans tout le
  domaine `> 1,0`** (+0,15 h contre +0,10 h à la valeur retenue). Aucune valeur du
  revenu ne la répare : le bouton sur-équipe le joueur pour un chapitre 3 sans
  particularité de composition. La suite doit chercher ailleurs — `botTypes["3"]`,
  ou le palier linéaire par salle.
- **Le harnais ne sait pas mesurer un joueur très équipé.** Son autopilote vise
  un point sans tenir compte de sa propre vitesse ; passé un certain niveau de
  Pointe il s'éjecte tout seul par les brèches de la salle 3. Toute lecture du
  haut de la grille (≥ 1,40) mesure ce défaut autant que le jeu. Un autopilote
  qui freine à l'approche d'une brèche changerait ces chiffres — **et peut-être
  la valeur retenue**. À arbitrer avant la prochaine passe d'économie.
- **La métrique « salle la plus meurtrière » reste un décompte absolu.** Elle est
  désormais doublée d'une lecture par tentative (tâche 9), mais le **verdict**
  s'appuie toujours sur le décompte, donc reste écrasable par une graine bloquée
  — et, à l'autre extrême, décidable par l'ordre du tri quand le chapitre est
  doux (égalité à 3 morts observée à 1,02, marge nulle observée à 1,16). Faire
  porter le verdict sur le taux par tentative, avec un effectif minimal, le
  rendrait lisible aux deux bouts.
- **Le facteur de revenu et le facteur de difficulté se contredisent en partie.**
  Le design veut qu'un chapitre plus dur paie plus ; la mesure montre que payer
  plus rend le chapitre suivant infranchissable. 1,15 est le compromis mesuré,
  pas une réconciliation : le vrai réglage serait de découpler *ce que paie une
  salle* de *ce que le joueur peut en dépenser* (plafond d'améliorations par
  chapitre, coût d'amélioration indexé sur le chapitre).
- **L'écart entre châssis reste à ×3,80** pour une cible de ×2. Inchangé par
  cette passe (chapitre 1, exposant 0), toujours porté par les profils de
  châssis, toujours en dette.
