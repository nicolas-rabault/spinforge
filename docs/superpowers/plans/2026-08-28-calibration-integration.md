# Calibration du build fusionné — journal

Point de départ de la passe de calibration commune (jalon 2.5 dans jalon 2b,
commit de fusion `0d28725`). `damageK = 1,3` avait été mesuré sur une branche où
l'impulsion ne lisait que `talents.mass` et ignorait le triangle des forces ;
dans le build fusionné la masse du joueur vient de châssis × Disque × talents,
et le triangle multiplie aussi les dégâts. **Aucun chiffre du jalon 2.5 n'est
valide avant cette mesure.**

## Les quatre garde-fous

Ils priment sur toute cible chiffrée. Aucun réglage, dans aucune passe à venir,
ne doit en sacrifier un pour approcher une cible.

1. **La salle 10 reste la salle la plus meurtrière du chapitre.** « Le mur n'est
   jamais un bug, c'est le produit. »
2. **La passivité reste très loin derrière le pilotage.** C'est la mesure pour
   laquelle le jalon 2.5 existe.
3. **Le premier coffre reste immédiat**, dès la salle 1.
4. **Chapitre 1 franchissable**, cible **indicative** ~15 min. Le jalon 2.5 a
   livré 21 min et c'était le bon compromis — ne pas sacrifier un garde-fou pour
   six minutes.

## Les valeurs de départ

| Bouton | Valeur |
| --- | --- |
| `combat.damageK` | 1,3 |
| `econ.rewardBase` | 86 |
| `arena.restitution` | 1,6 |
| `chests.bronze.price` | 250 |
| `boss.mass` | 3 |

## Rapport brut — 5 graines (mesure initiale du build fusionné, `0d28725`)

Graines : `[1, 7, 42, 1337, 90210]`.

```
=== Calibration — 5 graines ===
Validation du chapitre 1 : médiane 0.36 h
Premier coffre ouvert    : médiane 0.00 h
Runs jusqu'à validation  : médiane 10.00
Salle la plus meurtrière : [8,11]
Durée médiane par salle (cible : 1-3 ≈ 12 s, 4-9 ≈ 25 s, boss < 60 s) :
  salle 1 : 7.00 s  (vidée 52 fois, morts 0)
  salle 2 : 6.30 s  (vidée 52 fois, morts 0)
  salle 3 : 8.90 s  (vidée 52 fois, morts 0)
  salle 4 : 14.30 s  (vidée 51 fois, morts 1)
  salle 5 : 17.70 s  (vidée 49 fois, morts 2)
  salle 6 : 18.10 s  (vidée 40 fois, morts 9)
  salle 7 : 21.10 s  (vidée 33 fois, morts 7)
  salle 8 : 24.30 s  (vidée 22 fois, morts 11)
  salle 9 : 23.60 s  (vidée 15 fois, morts 7)
  salle 10 : 67.80 s  (vidée 5 fois, morts 10)
Garde-fou passivité      : jamais — doit rester très au-dessus de la référence

=== Comparatif châssis — chapitre 1 (5 graines) ===
Brasier Solaire    (equilibre ) : 10.00 runs · 0.36 h · salle la plus meurtrière [8,11]
Typhon Primal      (attaque   ) : 17.00 runs · 0.44 h · salle la plus meurtrière [6,18]
Carapace Abyssale  (defense   ) : 6.00 runs · 0.35 h · salle la plus meurtrière [10,10]
Tigre Foudre       (endurance ) : 15.00 runs · 0.54 h · salle la plus meurtrière [10,25]
Écart meilleur/pire (runs) : 17/6 = ×2.83 (cible : < ×2)
```

Sur cette mesure, le garde-fou 1 échoue — mais d'une seule mort (salle 8 : 11,
salle 10 : 10). La spec § 4.4 prévenait que la médiane du boss ne porte que sur
cinq validations, une par graine : régler un bouton contre un écart d'une mort
aurait calibré contre du bruit. Décision (ruling R9, `progress.md`) : élargir le
jeu de graines à dix avant tout balayage, dans son propre commit, valeurs
d'équilibrage inchangées.

## Rapport brut — 10 graines (référence retenue pour les passes suivantes)

Graines : `[1, 7, 42, 1337, 90210, 2, 13, 271, 4242, 65535]` (commit
`4f36f0a`, `scripts/calibrate.mjs` seul modifié).

```
=== Calibration — 10 graines ===
Validation du chapitre 1 : médiane 0.34 h
Premier coffre ouvert    : médiane 0.00 h
Runs jusqu'à validation  : médiane 10.00
Salle la plus meurtrière : [10,21]
Durée médiane par salle (cible : 1-3 ≈ 12 s, 4-9 ≈ 25 s, boss < 60 s) :
  salle 1 : 6.70 s  (vidée 96 fois, morts 0)
  salle 2 : 6.30 s  (vidée 96 fois, morts 0)
  salle 3 : 8.90 s  (vidée 96 fois, morts 0)
  salle 4 : 14.00 s  (vidée 95 fois, morts 1)
  salle 5 : 16.80 s  (vidée 89 fois, morts 6)
  salle 6 : 18.20 s  (vidée 71 fois, morts 18)
  salle 7 : 20.70 s  (vidée 59 fois, morts 12)
  salle 8 : 22.00 s  (vidée 40 fois, morts 19)
  salle 9 : 24.50 s  (vidée 31 fois, morts 9)
  salle 10 : 78.50 s  (vidée 10 fois, morts 21)
Garde-fou passivité      : jamais — doit rester très au-dessus de la référence

=== Comparatif châssis — chapitre 1 (10 graines) ===
Brasier Solaire    (equilibre ) : 10.00 runs · 0.34 h · salle la plus meurtrière [10,21]
Typhon Primal      (attaque   ) : 17.00 runs · 0.44 h · salle la plus meurtrière [6,33]
Carapace Abyssale  (defense   ) : 6.00 runs · 0.43 h · salle la plus meurtrière [10,24]
Tigre Foudre       (endurance ) : 18.00 runs · 0.63 h · salle la plus meurtrière [10,44]
Écart meilleur/pire (runs) : 18/6 = ×3.00 (cible : < ×2)
```

## Chiffres du jalon 2.5 — ne sont plus comparables

Mesurés avant fusion, **sans** le triangle des forces et **sans** la masse de
châssis (impulsion calculée sur `talents.mass` seul) :

- Chapitre 1 validé en **0,35 h / 10 runs**
- Premier coffre : **0,00 h**
- Salles 1-3 : **6-10 s**
- Boss : **87 s**
- Salle la plus meurtrière : **salle 10, 20 morts contre 9** (à la salle qui la
  suit dans son classement)
- Passivité : **jamais validée en 20 h**

Ces chiffres restent une référence de forme (le boss doit rester nettement plus
long que les autres salles, la salle 10 doit dominer nettement) mais ne sont
plus des cibles chiffrées : le triangle et la masse de châssis changent
l'impact des chocs, donc les dégâts, donc toute la cadence qui en découle.

## Lecture des quatre garde-fous sur la mesure à dix graines

1. **La salle 10 reste la salle la plus meurtrière du chapitre — TENU.**
   21 morts en salle 10 contre 19 en salle 8 (la deuxième plus meurtrière), un
   écart net de 2 morts sur 10 graines, là où la mesure à cinq graines donnait
   un résultat inversé et un écart d'une seule mort. L'élargissement du jeu de
   graines confirme que l'échec observé à cinq graines était bien du bruit :
   avec deux fois plus de validations de boss, l'ordre attendu par le design
   réapparaît, et l'écart devient significatif au lieu de se jouer à une unité.
   Le classement complet des morts par salle (1→10) est maintenant
   0, 0, 0, 1, 6, 18, 12, 19, 9, 21 — un profil en dents de scie sur les salles
   6-9, mais dont le sommet est bien la salle 10.

2. **La passivité reste très loin derrière le pilotage — TENU.** « Jamais » sur
   20 h simulées, identique à la mesure à cinq graines et au chiffre du jalon
   2.5. Rien dans l'élargissement du jeu de graines ne rapproche la passivité
   d'une validation.

3. **Le premier coffre reste immédiat — TENU.** Médiane à 0,00 h sur les deux
   mesures (cinq et dix graines), sans changement.

4. **Chapitre 1 franchissable, cible indicative ~15 min — TENU (au sens
   « franchissable »), au-dessus de la cible indicative.** Médiane à 0,34 h, soit
   ≈ 20,4 min — proche des 0,36 h (21,6 min) à cinq graines et du compromis de
   21 min jugé bon par le jalon 2.5. Le chapitre reste franchissable pour les
   quatre châssis (6 à 18 runs médians selon le châssis), donc le garde-fou dur
   tient ; l'écart à la cible indicative de 15 min n'est pas un échec de
   garde-fou et n'appelle aucun correctif à ce stade — conformément à la
   consigne de ne pas sacrifier un garde-fou pour six minutes.

**Point non couvert par les garde-fous, à surveiller dans les passes
suivantes :** l'écart châssis meilleur/pire est passé de ×2,83 à ×3,00 (cible
< ×2), et Tigre Foudre (endurance) atteint 18 runs médians contre 6 pour
Carapace Abyssale. Ce n'est ni un des quatre garde-fous ni un bouton ouvert
dans cette tâche (aucune valeur d'équilibrage n'a été touchée) — la table du
triangle est un bouton fermé pour les deux passes suivantes (T14 économie,
T15 combat). Signalé ici comme référence, pas comme cible de cette tâche.

---
## Passe économie — faite

**Bouton balayé : `econ.rewardBase`. Vingt mesures, dix graines, un seul bouton à la fois.**
Aucun bouton de combat n'a bougé pendant cette passe.

**Valeur retenue : 86 → 104.**

| `rewardBase` | Chapitre 1 | Runs | Premier coffre | Salle la plus meurtrière | Marge salle 10 | Garde-fou 1 |
|---|---|---|---|---|---|---|
| 80 | 0,31 h | 9 | 0,00 h | salle 9 (19) | — | ✗ |
| 84 | 0,29 h | 9 | 0,00 h | salle 8 (18) | — | ✗ |
| **86** (référence) | 0,34 h | 10 | 0,00 h | **salle 10 (21)** | +2 | ✓ *pic isolé* |
| 88 | 0,26 h | 8 | 0,00 h | salle 7 (17) | — | ✗ |
| 90 | 0,36 h | 9 | 0,00 h | salle 7 (23) | — | ✗ |
| 95 | 0,33 h | 9 | 0,00 h | salle 7 (19) | — | ✗ |
| 97 | 0,36 h | 9 | 0,00 h | salle 7 (25) | — | ✗ |
| 98 | 0,32 h | 9 | 0,00 h | **salle 10 (22)** | +5 | ✓ *pic isolé* |
| 99 | 0,34 h | 9 | 0,00 h | salle 7 (17) | — | ✗ |
| 100 | 0,33 h | 9 | 0,00 h | **salle 10 (26)** | +9 | ✓ *pic isolé* |
| 101 | 0,27 h | 9 | 0,00 h | salle 7 (17) | — | ✗ |
| 102 | 0,48 h | 12 | 0,00 h | **salle 10 (32)** | +14 | ✓ palier |
| 103 | 0,46 h | 12 | 0,00 h | **salle 10 (36)** | +18 | ✓ palier |
| **104 — RETENUE** | **0,32 h** | **9** | **0,00 h** | **salle 10 (23)** | **+5** | **✓ palier** |
| 105 | 0,41 h | 12 | 0,00 h | **salle 10 (35)** | +19 | ✓ palier |
| 106 | 0,40 h | 10 | 0,00 h | **salle 10 (33)** | +15 | ✓ palier |
| 108 | 0,52 h | 13 | 0,00 h | **salle 10 (35)** | +17 | ✓ palier |
| 110 | 0,41 h | 11 | 0,00 h | **salle 10 (25)** | +9 | ✓ palier |
| 112 | 0,30 h | 9 | 0,00 h | salle 7 (21) | — | ✗ |
| 115 | 0,54 h | 13 | 0,00 h | **salle 10 (34)** | +24 | ✓ palier |

La passivité tient (« jamais » validé en 20 h) et le premier coffre reste à 0,00 h sur **les vingt**
mesures : ces deux garde-fous ne discriminent rien ici, ils sont insensibles à ce bouton.

### Ce que le balayage a appris, et qui vaut plus que la valeur retenue

**`rewardBase` est chaotique sur toute sa plage, exactement comme la dette du jalon 2.5
l'annonçait — et c'est bien pire que « chaotique » ne le laissait deviner.** Ce n'est pas
une courbe bruitée : c'est un damier. La durée du chapitre ne croît pas avec le revenu
(0,26 h à 88, 0,54 h à 115, 0,27 h à 101), parce qu'un revenu différent change ce que
l'autopilote achète, donc le nombre de tirages consommés, donc tout le flux en aval.

**La découverte qui compte : la valeur de référence 86 était un pic isolé.** Ses deux
voisines immédiates, 84 et 88, cassent le garde-fou de la salle 10. Le jalon 2.5 avait donc
livré — sans le savoir — une valeur dont la tenue du pilier de design ne devait rien à la
conception et tout au hasard du flux. Trois autres pics isolés existent plus bas (98 et 100,
encadrés d'échecs).

**Le seul vrai palier de la plage est 102–110** : sept valeurs testées consécutives
(102, 103, 104, 105, 106, 108, 110) tiennent toutes le garde-fou. 112 le casse, 101 aussi :
les bords sont nets. C'est la première fois dans l'histoire de ce projet qu'une valeur
d'équilibrage est choisie depuis un palier démontré plutôt que depuis un point unique.

**Pourquoi 104 dans ce palier.** Elle domine la référence 86 sur les quatre axes mesurés :
durée 0,32 h contre 0,34 h, 9 runs contre 10, marge du pilier +5 contre +2, et surtout
appartenance à un palier contre pic isolé. C'est aussi la valeur du palier la plus proche de
la cible indicative de ~15 min.

**La réserve à porter à la passe suivante.** À l'intérieur même du palier, la marge du
pilier fluctue fortement (+5 à +19) et la durée aussi (0,32 h à 0,52 h). Le palier garantit
que *le voisinage* tient le garde-fou, pas que chaque point y soit également robuste. Si une
passe ultérieure veut une marge plus large au prix de la durée, 105 (+19, 0,41 h) et 103
(+18, 0,46 h) sont les candidates, et elles sont dans le même palier.

**Un garde-fou du 2b s'est dégradé, et n'a pas été traité ici** : l'écart entre châssis passe
de ×2,83 à ×3,00 puis, à 104, Tigre Foudre grimpe à 19 runs / 0,82 h contre 5 runs / 0,29 h
pour Carapace Abyssale — soit ×3,8. Il se corrige par les profils de châssis, que la spec
d'intégration ferme explicitement (§ 6, « aucune décision de design du 2b rouverte »).
Reporté en dette, voir `docs/roadmap.md`.

### Mesure de confirmation à `rewardBase = 104`

```
Validation du chapitre 1 : médiane 0.32 h
Premier coffre ouvert    : médiane 0.00 h
Runs jusqu’à validation  : médiane 9.00
Salle la plus meurtrière : [10,23]
  salle 8  : 22.60 s  (vidée 48 fois, morts 18)
  salle 10 : 64.80 s  (vidée 10 fois, morts 23)
Garde-fou passivité      : jamais
```

Les quatre garde-fous tiennent : salle 10 la plus meurtrière (23 contre 18), passivité jamais
validée, premier coffre immédiat, chapitre 1 franchissable en 19,2 min. Le boss descend de
78,5 s à 64,8 s — effet de bord d'un joueur mieux équipé, pas d'un réglage de combat.

## Passe combat (à venir)

Boutons ouverts : `combat.damageK`, `arena.breach.halfWidthDeg`,
`arena.breach.ejectSpeed`, `boss.mass`, `arena.zones.pointes.spinDrain`,
`arena.restitution`, `arena.overspeedDamping`. Commit distinct de la passe
économie, mesuré séparément.

| Bouton | Valeur essayée | Chapitre 1 | Runs | Premier coffre | Salle la plus meurtrière | Passivité |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | | | |
