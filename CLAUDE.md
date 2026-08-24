# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Le projet

**SpinForge** — jeu hybride Archero × idle : le joueur pilote sa toupie au doigt dans des arènes (10 salles par chapitre, la 10ᵉ est le boss), gagne des crédits, ouvre des coffres de pièces, fusionne les doublons. L'idle = farm automatique du meilleur chapitre validé. Nom de code du repo : B-Blades_versus (historique).

- **Spec de référence** : `docs/game-design.md` (chiffres exacts, règles, catalogue). Le canvas visuel vit dans `design/` (fichiers `.dc.html` — ne les modifier que via le skill `/design`).
- **Roadmap** : `docs/roadmap.md` (4 jalons). Plans d'implémentation : `docs/superpowers/plans/`.

## Commandes

```bash
npm run dev     # serveur Vite (http://localhost:5173/spinforge/)
npm run test    # vitest run (tests unitaires de la simulation)
npm run build   # tsc + vite build
```

## Règles d'architecture (non négociables)

1. **`src/sim/` est pur et déterministe** : aucun import de DOM, PixiJS, React ou `Date`/`Math.random`. Le RNG est sérialisé dans l'état (`rngState`), le temps avance uniquement par `tick()` à pas fixe (100 ms). Deux runs avec même seed + mêmes inputs ⇒ états strictement identiques (c'est testé).
2. **Le rendu est un spectateur** : `src/render/` (PixiJS) et `src/ui/` (React) lisent l'état, ne le modifient jamais directement — toute mutation passe par les fonctions de `src/sim/`.
3. **Tous les chiffres d'équilibrage vivent dans `src/sim/config.ts`** (puis en JSON statique à partir du jalon 2). Jamais de constante d'équilibrage en dur ailleurs.
4. **Le farm ne progresse jamais** : le mode AUTO et le hors-ligne rejouent le meilleur chapitre validé, ils ne franchissent jamais de nouveau contenu. Pilier de design — ne pas « corriger ».
5. **IP** : aucun nom officiel Beyblade (toupies, personnages, produits) dans le code, les données ou l'UI. Le catalogue original est dans `docs/game-design.md` ; les « (≈ …) » sont des références internes de design uniquement.
6. Textes joueur en **français** ; code et identifiants en anglais (sauf vocabulaire du jeu : `salle`, `toupie`, etc. acceptés dans les types métier).

## Tests

Vitest, colocalisés (`src/sim/*.test.ts`). La simulation est testée unitairement ; le rendu et l'UI se vérifient en lançant `npm run dev`. Imports explicites depuis `vitest` (pas de globals).
