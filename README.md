# Site de la Table de JDR

Site de présentation de l'appli Table de JDR et de son pack d'images. Site statique fait avec [Astro](https://astro.build).

## Commandes

| Commande | Effet |
|---|---|
| `npm install` | Installe les dépendances (une seule fois) |
| `npm run dev` | Lance le site en local sur http://localhost:4321/jdr-table-site/ |
| `npm run build` | Construit le site dans `dist/` |
| `npm run preview` | Affiche le site construit |

## Où changer quoi

- `src/site.ts` : nom et description du site.
- `src/pages/index.astro` : page d'accueil (textes des sections en haut du fichier).
- `src/pages/catalogue.astro` : catalogue avec recherche et filtres.
- `src/styles/global.css` : couleurs et polices (les mêmes que l'écran du MJ).
- `src/data/catalogue.json` : liste des figurines et objets, tirée de `js/lib/design.js` de l'appli.
- `src/pages/fonctions.astro` : visite complète des fonctions, avec les captures de `public/captures/`.
- `public/clips/` : séquences animées tournées dans l'appli (WebP animé + image fixe), affichées par `src/components/Clip.astro`. Pour les retourner : `outils/clips/` (mode d'emploi en tête de `enregistrer.cjs` ; `joueurs.cjs` tourne la Vue Table et la partie en ligne).
- `public/` : images du pack en version « vitrine » (réduites, figurines dans une seule direction). Pour les refaire après une mise à jour du pack : `node outils/preparer-images.mjs <chemin vers table-jdr/assets/design>`.

## Mise en ligne

Chaque envoi sur `main` publie le site sur GitHub Pages (`.github/workflows/pages.yml`). À activer une fois :
dépôt GitHub → Settings → Pages → Source : **GitHub Actions**.

Pour GitLab Pages, `.gitlab-ci.yml` fait la même chose. Pour une autre adresse, définir `SITE_URL` et `SITE_BASE`
(voir `astro.config.mjs`).
