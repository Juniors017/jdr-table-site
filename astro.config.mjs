// @ts-check
import { defineConfig } from 'astro/config';

// Adresse du site. Par défaut : GitHub Pages du dépôt Juniors017/jdr-table-site.
// Pour un autre hébergeur (GitLab Pages, nom de domaine…), définir SITE_URL et SITE_BASE.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://juniors017.github.io',
  base: process.env.SITE_BASE ?? '/jdr-table-site',
});
