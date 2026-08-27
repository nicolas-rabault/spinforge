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
- **Types** : Attaque > Endurance > Défense > Attaque. Le type dominant inflige **+25 %**.
  La règle est **symétrique** — un bot dont le type domine celui du joueur frappe plus fort
  lui aussi, et c'est ce qui fait de la contre-pioche une décision. **Équilibre est hors du
  triangle** : il inflige +10 % à tout le monde et, surtout, il n'est le type dominé de
  personne — il ne subit jamais le +25 %. Le facteur de type se **compose** avec le partage
  de charge et les talents : il ne les remplace pas. Le type est porté par le **châssis** de
  la toupie, qui n'est pas un cinquième emplacement — toutes les pièces restent
  interchangeables entre châssis. Le type des bots est fixé par chapitre et par salle.
  Certaines Lames tournent à gauche (chocs frontaux amplifiés contre rotation droite) —
  Saison 1, jalon 4.

## Structure : chapitres & salles

- Un chapitre = **10 salles, la 10ᵉ est le boss**. Vider la salle ouvre la porte vers la suivante.
- Chaque salle franchie offre un **choix d'atout temporaire** (jalon 3) et rapporte des crédits.
- Nombre de bots par salle : salles 1-3 → 1, salles 4-6 → 2, salles 7-9 → 3, salle 10 → 1 boss (spin ×4, attaque ×1,5, rayon supérieur).
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

> **La Pointe est le seul emplacement à double rendement.** Son rang multiplie la vitesse
> **et** divise la décroissance, `1,08^(rang−1)` sur les deux axes — là où la Lame, le Disque
> et le Noyau n'achètent qu'une stat par rang. C'est délibéré : la Pointe est le créneau
> mobilité + survie. À Légende (rang 11), une Pointe de niveau 0 porte à la fois la vitesse
> de 240 à 518 et la décroissance de 20 à 9,26.

## Économie

**Monnaies** : Crédits (soft — salles, farm, quêtes → niveaux de pièces, coffre Bronze) · Gemmes (premium — boss, quêtes → coffres Arène/Mythique) · Fragments (démantèlement → hauts paliers de niveau) · Étoiles de Refonte (prestige → arbre d'atouts, jamais réinitialisées).

**Courbes** :
- `coût(niveau) = 100 × 1,08^niveau`
- `revenu(salle) = 60 × 1,13^(salle−1)` par salle vidée ; boss ×10. (Calibré par mesure, à chaque fois sur la seule base : **120 → 70** au jalon 1.5, quand le partage de charge a rendu le pilotage bien plus efficace — à 120 le chapitre tombait à 1,43 h ; puis **70 → 60** au jalon 2b, quand le triangle des forces a donné à la toupie de départ, Équilibre, un +10 % de dégâts qu'elle n'encaisse jamais en retour — à 70 le chapitre tombait à 1,66 h. Chapitre 1 mesuré à 23 runs / 1,91 h. L'économie commande la durée, le combat commande la forme de la difficulté : c'est pourquoi seule cette constante bouge.)

**Coffres** : Bronze (2 000 crédits, ×10 : 18 000 — pièces Commun→Rare) · Arène (300 gemmes, ×10 : 2 680, 1 gratuit/4 h — Bon→Excellent, Excellent garanti au 10ᵉ) · Mythique (1 500 gemmes, ×10 : 13 500 — Excellent→Légende, Légende garantie au 30ᵉ). Arène et Mythique mêlent pièces génériques et **doublons signature** des toupies débloquées (seule source de fusion des Lames/Noyaux).

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

## Règle IP

Beyblade est une IP Takara Tomy/Hasbro. **Aucun nom officiel** (toupies, personnages, produits) dans le jeu — les équivalences « (≈ …) » du canvas sont des références internes de design. Avant lancement store : recherche d'antériorité INPI/EUIPO sur « SpinForge » (classes 9, 28, 41).

## Stack technique

TypeScript strict + Vite. Cœur : simulation pure à tick fixe 100 ms, déterministe (RNG sérialisé), zéro dépendance rendu — le hors-ligne = fast-forward de ticks (formule fermée au-delà d'1 h). Rendu arène : PixiJS. UI : React. Nombres : `number` isolé dans `economy.ts` au jalon 1, migration `break_infinity.js` prévue quand les valeurs dépassent la précision. Sauvegarde : IndexedDB/localStorage + export. PWA puis Capacitor. Équilibrage en JSON statique versionné (à partir du jalon 2).
