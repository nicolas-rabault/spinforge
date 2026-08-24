# SpinForge

> ### 🎮 [**Jouer maintenant → nicolas-rabault.github.io/spinforge**](https://nicolas-rabault.github.io/spinforge/)
>
> *(la page se déploie automatiquement à chaque mise à jour de `main` — le jeu arrive avec le jalon 1, voir [État du projet](#état-du-projet))*

Jeu hybride **Archero × idle** : pilote ta toupie au doigt dans des arènes, gagne des crédits, ouvre des coffres de pièces, fusionne les doublons — et laisse le farm automatique tourner pendant ton absence.

- **10 salles par chapitre**, la 10ᵉ est le boss. Mourir renvoie salle 1, les crédits restent.
- **4 pièces** à améliorer et à fusionner (échelle de rareté à 11 rangs).
- **Idle** : le farm rejoue le meilleur chapitre validé — il ne franchit jamais de nouveau contenu.

## État du projet

Le design est figé, le code démarre. La page de jeu publiera le build dès le jalon 1.

| Jalon | Contenu | État |
|---|---|---|
| 1 — La boucle nue | Pilotage au doigt, combat déterministe, salles + boss, crédits, améliorations | 🚧 en cours |
| 2 — Le gacha | Coffres, inventaire, fusion, raretés, toupies Fondateurs | ⏳ |
| 3 — L'idle | Farm hors-ligne plafonné, mode AUTO, chapitres 1-4, sauvegarde | ⏳ |
| 4 — Le long terme | Refonte, arbre d'atouts, Vortex infini, PWA | ⏳ |

Détail : [`docs/roadmap.md`](docs/roadmap.md) · Spec complète : [`docs/game-design.md`](docs/game-design.md)

## Développement

```bash
npm install
npm run dev     # http://localhost:5173
npm run test    # tests unitaires de la simulation (Vitest)
npm run build   # build de production
```

**Stack** : TypeScript strict · Vite · PixiJS 8 · React 19 · Vitest.

L'architecture est décrite dans [`CLAUDE.md`](CLAUDE.md). En résumé : `src/sim/` est une simulation **pure et déterministe** (tick fixe 100 ms, RNG sérialisé dans l'état, aucun accès DOM) ; le rendu PixiJS et l'UI React n'en sont que les spectateurs.

## Déploiement

Chaque push sur `main` déclenche [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) : tests, build Vite, puis publication de `dist/` sur GitHub Pages.

---

Jeu original — aucune affiliation avec une marque de toupies existante.
