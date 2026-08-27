# SpinForge — Spécification de game design

> Version texte de référence pour le développement. Le canvas visuel (source des décisions, à jour au 2026-08-24) est publié sur https://claude.ai/code/artifact/c1a8bbd5-4ab4-406d-8a2f-44dab59bd99f et ses fichiers de travail vivent dans `design/`.

## Pitch & piliers

SpinForge croise le **run piloté** d'Archero (on dirige sa toupie salle après salle) et la **boucle des idle games** (farm hors-ligne, coffres, fusion, prestige). Progression infinie, pas de niveau maximum.

Piliers non négociables :
1. **La progression des chapitres est 100 % active** — on n'avance qu'en pilotant.
2. **L'AUTO farme, il ne progresse jamais** — le mode AUTO (débloqué au chapitre 3) et le farm hors-ligne rejouent le meilleur chapitre jamais validé.
3. ~60 % des **revenus** viennent de l'idle, le jeu actif paie mieux à la minute.
4. Le mur n'est jamais un bug, c'est le produit — sorties : fusionner, améliorer ses pièces, ou déclencher une Refonte.

## Combat & pilotage

- La « vie » d'une toupie est sa **rotation** (spin). Elle décroît lentement avec le temps (endurance) et chute sous les chocs ; à 0 la toupie s'arrête.
- **Pilotage** : glisser le doigt n'importe où = direction visée (joystick virtuel relatif au point de contact, zone morte 8 px) ; la toupie accélère dans cette direction ; relâcher = elle file sur sa lancée avec friction.
- Dégâts d'un choc : proportionnels à la vitesse relative d'impact, modulés par `attaque de l'attaquant / (attaque + défense du défenseur)`. Les deux perdent du spin, le défenseur davantage si son ratio est défavorable.
- **Partage de charge** : la vitesse relative d'impact est la somme exacte des deux vitesses de fermeture, et les dégâts se répartissent selon la part que chacun a lui-même provoquée. Un assaut pur inflige ×1,3 et encaisse ×0,7 (`CHARGE_BONUS`) ; un choc frontal, où les deux avancent autant, reste rigoureusement symétrique. **Sans cette règle le pilotage ne sert à rien** : mesuré à l'autopilote, un joueur qui ne touchait jamais l'écran validait le chapitre 1 aussi vite qu'un joueur qui charge. Voir `docs/ameliorations.md`.
- **Types** (jalon 2+) : Attaque > Endurance > Défense > Attaque (+25 % de dégâts sur le type dominé), Équilibre neutre (+10 % partout). Certaines Lames tournent à gauche (chocs frontaux amplifiés contre rotation droite).
- **Répulsion** (jalon 2.5) : un choc rend plus d'énergie qu'il n'absorbe (`restitution` 1,6) — la rotation est le réservoir d'énergie du monde du jeu, chaque contact en convertit une part en recul. Le plafond de vitesse ne borne plus que le **pilotage** : un joueur ne dépasse jamais sa vitesse de Pointe par son seul doigt, mais le recul d'un choc peut le franchir — il retombe au plafond ordinaire en une poignée de ticks (amortissement de surcharge), assez pour se voir clairement « envoyé valser ». Voir `docs/ameliorations.md` pour la panne que cette règle a corrigée : sans elle, la répulsion existait dans le calcul mais n'était jamais parcourue.
- **Brèches et éjection** (jalon 2.5) : le bord de l'arène porte des secteurs mortels. Y être poussé — vitesse sortante au-dessus d'un seuil, dans le secteur — élimine la toupie au même titre qu'un spin tombé à 0. Deux brèches par salle, réparties régulièrement : il reste toujours un secteur de bord plein assez large pour s'y adosser, une éjection est donc toujours évitable. Le boss est éjectable — c'est le moment de bravoure du chapitre — mais lourd (masse ×3) : il faut vraiment le travailler pour l'y pousser.
- **Zones au sol** (jalon 2.5) : trois types de disques posés sur le terrain d'une salle, qui se composent quand ils se recouvrent — accélérateur (vitesse et accélération relevées), pointes (perte de spin continue, y compris pendant une pause d'endurance : ce sont des dégâts, pas de l'endurance), plaque glissante (friction quasi nulle — bon pour foncer, mortel près d'une brèche).
- **Éclat de Gyre** (jalon 2.5) : apparaît périodiquement sur le terrain, entre 15 % et 70 % du rayon de l'arène. Le premier à le toucher — joueur ou bot — récupère 18 % de son spin maximal ; sans preneur, il s'efface après un délai. Dispute directe entre joueur et bots : le prendre, ou empêcher l'adversaire de le prendre — la répulsion devient ainsi un outil offensif autant que défensif.

## Structure : chapitres & salles

- Un chapitre = **10 salles, la 10ᵉ est le boss**. Vider la salle ouvre la porte vers la suivante.
- Chaque salle franchie offre un **choix d'atout temporaire** (jalon 3) et rapporte des crédits.
- Nombre de bots par salle : salles 1-3 → 1, salles 4-6 → 2, salles 7-9 → 3, salle 10 → 1 boss (spin ×4, attaque ×1,5, rayon supérieur).
- **Terrain** (jalon 2.5) : chaque salle porte un gabarit d'arène tiré du RNG du run — zones au sol dès la salle 1 (le premier objet de terrain rencontré est toujours un bonus, jamais une punition), brèches au bord à partir de la salle 3, quand le pilotage est acquis. Le gabarit s'enrichit par paliers jusqu'à la salle 10. Un seul gabarit existe à ce jour, pour le chapitre 1 (voir § 8 arènes-chapitres) — les chapitres suivants ne sont pas encore atteignables.
- Mort du joueur → fin du run, retour salle 1 du chapitre, **crédits conservés**.
- Valider la salle 10 = chapitre validé → chapitre suivant débloqué, et ce chapitre devient éligible au farm.

## Pièces & stats

Une toupie = 4 emplacements. **Lame + Noyau sont signature** d'une toupie ; **Disques + Pointes sont génériques**.

| Pièce | Stat portée | Effet par niveau |
|---|---|---|
| Lame | attaque | ×(1 + 0,10 × niveau) |
| Disque | défense | ×(1 + 0,10 × niveau) |
| Pointe | vitesse max / décroissance du spin | vitesse ×(1 + 0,04 × niv), décroissance ÷(1 + 0,05 × niv) |
| Noyau | spin max (+ capacité signature, jalon 2+) | spin max ×(1 + 0,08 × niveau) |

Chaque pièce progresse sur deux axes infinis : **niveau** (crédits/fragments) et **rareté** (fusion).

## Économie

**Monnaies** : Crédits (soft — salles, farm, quêtes → niveaux de pièces, coffre Bronze) · Gemmes (premium — boss, quêtes → coffres Arène/Mythique) · Fragments (démantèlement → hauts paliers de niveau) · Étoiles de Refonte (prestige → arbre d'atouts, jamais réinitialisées).

**Courbes** :
- `coût(niveau) = 100 × 1,08^niveau`
- `revenu(salle) = 86 × 1,13^(salle−1)` par salle vidée ; boss ×10. (Calibré au jalon 1.5 par mesure : un chapitre 1 se valide en ~21 runs — base 120 → 70 avec le partage de charge, qui a rendu le pilotage bien plus efficace. Recalibré au jalon 2.5 avec le terrain et le butin de salle : base 70 → 86, chapitre 1 à ~10 runs / 0,35 h. L'économie commande la durée, le combat commande la forme de la difficulté — historique complet des trois calibrations : `docs/roadmap.md`.)

**Butin de salle — première source de pièces** (jalon 2.5). Chaque salle vidée lâche un coffre, sans rien acheter : c'est le robinet qui garantit qu'il y a toujours quelque chose à ouvrir. L'achat (coffres ci-dessous) reste le second robinet, celui qui pose un vrai arbitrage entre un coffre et une amélioration — l'un sans l'autre donne soit un distributeur passif, soit le mur qui bloquait le jeu avant ce jalon.

| Salle | Coffre lâché |
|---|---|
| 1 à 3 | Bronze |
| 4 à 9 | Bronze, + 20 % de chance d'un Arène |
| 10 (boss) | Arène garanti, + 15 % de chance d'un Mythique |

**Coffres** : Bronze (**250** crédits, ×10 : 2 250 — pièces Commun→Rare ; 2 000 avant le jalon 2.5, effondré pour ne plus concurrencer les améliorations, seul coffre acheté en crédits) · Arène (300 gemmes, ×10 : 2 680, 1 gratuit/4 h — Bon→Excellent, Excellent garanti au 10ᵉ) · Mythique (1 500 gemmes, ×10 : 13 500 — Excellent→Légende, Légende garantie au 30ᵉ). Arène et Mythique mêlent pièces génériques et **doublons signature** des toupies débloquées (seule source de fusion des Lames/Noyaux).

**Raretés (11 rangs puis infini)** : Commun → Bon → Rare → Excellent (+1, +2) → Épique (+1, +2, +3) → Légende → Légende+N (∞). Chaque rang franchi débloque un talent de pièce.

**Fusion** (base : 3 identiques → 1 rang au-dessus) :
| Palier franchi | Règle |
|---|---|
| Commun → Excellent | 3 identiques → rang supérieur |
| Excellent → Épique +3 | chaque palier : 2 identiques + 1 sacrifice du même emplacement |
| Épique +3 → Légende | 3 Épique +3 identiques |
| Légende +N | 2 Légende identiques (même emplacement, même +N) → +1, sans limite |

**Refonte (prestige)** : reset chapitres + niveaux de pièces + crédits ; conserve catalogue, raretés, gemmes, quêtes et la **référence de farm** (meilleur chapitre jamais validé). Gain : Étoiles = f(salle max), +2 % de revenus permanents/étoile + arbre d'atouts (plafond hors-ligne 12 h, auto-fusion, vitesse du farm AUTO ×3, second emplacement de toupie…).

**Hors-ligne** : farm automatique du meilleur chapitre jamais validé, dès le chapitre 1, plafond 4 h (extensible 12 h), survit à la Refonte. Écran « Pendant ton absence » au retour, ×2 contre pub récompensée ou gemmes. Pubs toujours optionnelles (×2 gains 15 min, coffre gratuit, relance de boss).

## Catalogue (univers original — voir règle IP)

**Lore** : à Gyrapolis, la météorite « Cœur Gyre » s'est écrasée au centre de la ville ; ses débris forgés en toupies tournent sans s'arrêter. Les quatre premières, les Fondateurs, ont donné naissance aux arènes de quartier.

**Saison 0 — Les Quatre Fondateurs** : Typhon Primal (Attaque), Brasier Solaire (Équilibre), Carapace Abyssale (Défense), Tigre Foudre (Endurance).

**Saison 1 — La Génération Rafale (12)** : Sleipnir Azur, Hydre Écarlate, Ajax Vaillant, Drake Nocturne (rotation gauche), Wyrm Doré (rotation gauche), Estoc Royal, Rafale d'Émeraude, Molosse Stygien, Faucheur Pâle, Vouivre d'Ivoire, Phénix Cendré, Simorgh Vermeil. Détails (types, motifs, capacités) : planche Catalogue du canvas.

**Pièces génériques** : Disques — Lourd, Gravité, Éventail, Axial, Colosse, Météorite. Pointes — Plate, Aiguille, Orbitale, Gyroscope, Furie, Ressort. (Descriptifs fonctionnels, pas des marques.)

**8 arènes-chapitres** : 1 Hangar Rouillé (aucun piège) · 2 Dojo Néon (murs élastiques) · 3 Marché Souterrain (piliers mobiles) · 4 Cratère de Magma (geysers) · 5 Temple sous la Glace (friction réduite) · 6 Jardin Suspendu (arène qui bascule) · 7 Station Orbitale (gravité réduite) · 8 Le Vortex (chapitre infini, modificateur toutes les 10 salles).

Le **système de terrain** (répulsion, brèches, zones au sol, éclat) est livré au jalon 2.5 et actif dès le chapitre 1 ; les identités par chapitre ci-dessus restent du contenu à poser dessus, et sont inatteignables tant que l'enchaînement des chapitres n'existe pas (jalon 3).

## Règle IP

Beyblade est une IP Takara Tomy/Hasbro. **Aucun nom officiel** (toupies, personnages, produits) dans le jeu — les équivalences « (≈ …) » du canvas sont des références internes de design. Avant lancement store : recherche d'antériorité INPI/EUIPO sur « SpinForge » (classes 9, 28, 41).

## Stack technique

TypeScript strict + Vite. Cœur : simulation pure à tick fixe 100 ms, déterministe (RNG sérialisé), zéro dépendance rendu — le hors-ligne = fast-forward de ticks (formule fermée au-delà d'1 h). Rendu arène : PixiJS. UI : React. Nombres : `number` isolé dans `economy.ts` au jalon 1, migration `break_infinity.js` prévue quand les valeurs dépassent la précision. Sauvegarde : IndexedDB/localStorage + export. PWA puis Capacitor. Équilibrage en JSON statique versionné (à partir du jalon 2).
