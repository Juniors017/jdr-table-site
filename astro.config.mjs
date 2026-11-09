// @ts-check
import { defineConfig } from 'astro/config';

// Adresse du site : nom de domaine relié à GitHub Pages (voir public/CNAME).
// Pour un autre hébergeur (GitLab Pages, nom de domaine…), définir SITE_URL et SITE_BASE.
export default defineConfig({
  site: process.env.SITE_URL ?? 'https://table-jdr.docuxlab.com',
  base: process.env.SITE_BASE ?? '/',
});
