# Site de la Table de JDR

Site de présentation de l'appli Table de JDR et de son pack d'images. Site statique fait avec [Astro](https://astro.build).

## Commandes

| Commande | Effet |
|---|---|
| `npm install` | Installe les dépendances (une seule fois) |
| `npm run dev` | Lance le site en local sur http://localhost:4321/ |
| `npm run build` | Construit le site dans `dist/` |
| `npm run preview` | Affiche le site construit |

## Où changer quoi

- `src/site.ts` : nom et description du site.
- `src/pages/index.astro` : page d'accueil (textes des sections en haut du fichier).
- `src/pages/catalogue.astro` : catalogue des objets, rangé par thème, avec recherche et filtres.
- `src/pages/bestiaire.astro` : toutes les figurines qui marchent (héros, PNJ, animaux, monstres).
- `src/components/Visionneuse.astro` : la fenêtre qui montre un objet ou une figurine en pleine résolution.
- `src/styles/global.css` : couleurs et polices (les mêmes que l'écran du MJ).
- `src/data/catalogue.json` : liste des figurines et objets, **fabriquée** par `outils/preparer-images.mjs` (ne pas la modifier à la main).
- `src/pages/fonctions.astro` : visite complète des fonctions, avec les captures de `public/captures/`.
- `public/clips/` : séquences animées tournées dans l'appli (WebP animé + image fixe), affichées par `src/components/Clip.astro`. Pour les retourner : `outils/clips/` (mode d'emploi en tête de `enregistrer.cjs` ; `joueurs.cjs` tourne la Vue Table et la partie en ligne).
- `public/` : images du pack en pleine résolution avec un filigrane léger (figurines dans une seule direction), plus des vignettes
  réduites pour les grilles (`pieces/mini/`, `marche/mini/`). Après une mise à jour du dépôt des assets
  ([assets-table-jdr](https://github.com/Juniors017/assets-table-jdr)), tout refaire (images et `catalogue.json`) :
  `node outils/preparer-images.mjs <chemin vers assets-table-jdr>`. Les thèmes et sections du catalogue viennent des planches
  `generateur/planches/R*.json` de ce dépôt.

## Mise en ligne

Chaque envoi sur `main` publie le site sur GitHub Pages (`.github/workflows/pages.yml`). À activer une fois :
dépôt GitHub → Settings → Pages → Source : **GitHub Actions**.

Pour GitLab Pages, `.gitlab-ci.yml` fait la même chose. Pour une autre adresse, définir `SITE_URL` et `SITE_BASE`
(voir `astro.config.mjs`).
