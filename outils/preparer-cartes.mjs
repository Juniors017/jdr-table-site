// Fabrique les cartes du site (carte qui défile en haut de l'accueil, section « Les cartes ») à partir des cartes
// créées dans l'appli (dossier cartes/ du dépôt https://github.com/Juniors017/table-jdr) :
//   node outils/preparer-cartes.mjs <chemin vers table-jdr>
// Le dessin et les trajets sont faits par le code de l'appli elle-même, ouvert dans Edge sans fenêtre (playwright-core) :
// - chaque carte est dessinée comme dans l'appli (pièces du pack, sans les pièces cachées), 1920 × 1080, avec filigrane ;
// - chaque pion reçoit un trajet calculé avec l'A* de l'appli : il contourne murs, portes fermées, lave et mobilier.
// Écrit public/cartes/ (+ mini/ pour la grille), public/marche-demo/ (planches 4 directions des pions) et src/data/cartes.json.
// Une carte est retenue si elle a au moins 100 pièces ; les copies exactes d'une autre carte sont ignorées.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { chromium } from 'playwright-core';
import { avecFiligrane } from './filigrane.mjs';

const appli = process.argv[2];
if (!appli || !fs.existsSync(path.join(appli, 'cartes')) || !fs.existsSync(path.join(appli, 'js', 'chemins.js'))) {
  console.error("Donne le dossier du dépôt de l'appli table-jdr (celui qui contient cartes/ et js/).");
  process.exit(1);
}
const racine = path.join(import.meta.dirname, '..');
const pub = path.join(racine, 'public');

// Pions de chaque carte (identifiants des figurines du pack). Une carte absente de la liste reçoit DEFAUT.
const DISTRIBUTION = {
  'forteresse-de-noirfer': ['hero_fighter', 'hero_wizard_f', 'hero_rogue', 'mob_orc', 'mob_goblin_archer', 'mob_skeleton', 'npc_alchemist'],
  'taverne-du-dragon-assoupi': ['hero_fighter', 'hero_wizard', 'npc_barmaid', 'npc_innkeeper', 'mob_rat', 'animal_cat'],
  'crypte-des-rois-oublies': ['hero_paladin', 'hero_rogue', 'mob_skeleton', 'mob_mummy', 'mob_wraith'],
  'port-de-haute-mer': ['npc_sailor', 'npc_captain', 'hero_pirate', 'npc_merchant', 'animal_cat'],
  'porte-des-enfers': ['hero_paladin_f', 'hero_warlock', 'mob_imp', 'mob_hellhound', 'mob_demon'],
  'labyrinthe-de-haies': ['hero_halfling', 'hero_bard', 'mob_goblin', 'animal_rabbit'],
  'bosquet-de-la-lune': ['hero_druid', 'mob_dryad', 'mob_pixie', 'animal_deer', 'animal_unicorn'],
  'clairiere-du-vieux-chene': ['hero_ranger', 'hero_elf_archer', 'animal_deer', 'animal_boar', 'mob_wolf'],
  'temple-de-la-lune-brisee': ['hero_cleric_f', 'hero_monk', 'npc_priest', 'mob_cultist', 'mob_shadow'],
  'egouts-de-bas-port': ['hero_rogue_f', 'npc_thief', 'mob_wererat', 'mob_rat', 'mob_slime'],
  'cimetiere': ['hero_cleric', 'mob_skeleton', 'mob_zombie', 'mob_ghost', 'mob_ghoul'],
  'caverne-lvl1': ['hero_dwarf_fighter', 'npc_miner', 'mob_goblin', 'mob_kobold', 'mob_bat'],
};
const DEFAUT = ['hero_fighter', 'hero_wizard_f', 'hero_rogue', 'hero_elf_archer'];
// Ordre de passage en haut de l'accueil : les cartes de cette liste d'abord, les autres (nouvelles) ensuite.
const ORDRE = Object.keys(DISTRIBUTION);
const COLS = 32, ROWS = 18, CASE = 60; // 1920 × 1080
const FIG_PX = 96; // côté maximal d'une image de pion pour une figurine d'une case

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dossier = (nom) => {
  const d = path.join(pub, nom);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  return d;
};

// --- Cartes retenues ---
const vues = new Set();
const cartes = fs
  .readdirSync(path.join(appli, 'cartes'))
  .filter((f) => f.endsWith('.json'))
  .sort((a, b) => a.localeCompare(b, 'fr'))
  .map((f) => ({ titre: f.replace(/\.json$/, ''), texte: fs.readFileSync(path.join(appli, 'cartes', f), 'utf8') }))
  .filter((c) => {
    const pieces = JSON.parse(c.texte).pieces || [];
    const cle = JSON.stringify(pieces);
    if (pieces.length < 100 || vues.has(cle)) return false;
    vues.add(cle);
    return true;
  })
  .map((c) => ({ ...c, id: slug(c.titre) }))
  .sort((a, b) => (ORDRE.indexOf(a.id) + 1 || 999) - (ORDRE.indexOf(b.id) + 1 || 999));
console.log(`${cartes.length} cartes : ${cartes.map((c) => c.titre).join(', ')}`);

// --- L'appli, servie en local et ouverte dans Edge ---
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const serveur = http.createServer((q, r) => {
  const f = path.join(appli, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(path.resolve(appli))) return r.writeHead(403).end();
  fs.readFile(f, (e, d) => (e ? r.writeHead(404).end() : r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }).end(d)));
});
await new Promise((ok) => serveur.listen(0, '127.0.0.1', ok));
const navigateur = await chromium.launch({ channel: 'msedge' }).catch(() => chromium.launch({ channel: 'chrome' }));
const page = await navigateur.newPage({ viewport: { width: 1600, height: 900 } });
const erreurs = [];
page.on('pageerror', (e) => erreurs.push(e.message));
await page.goto(`http://127.0.0.1:${serveur.address().port}/index.html`);
await page.waitForFunction(() => typeof setCarte === 'function' && typeof trouverChemin === 'function');

// Exécuté dans la page de l'appli : dessine la carte, puis cherche un trajet pour chaque pion.
const dansAppli = async ({ texte, distribution, graine, COLS, ROWS, CASE }) => {
  state.grid.cols = COLS; // grille de 32 cases de large, comme sur une TV 16:9
  setCarte(JSON.parse(texte));
  const cv = document.createElement('canvas');
  cv.width = COLS * CASE;
  cv.height = ROWS * CASE;
  const g = cv.getContext('2d');
  const dessiner = () => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, cv.width, cv.height);
    g.save();
    g.scale(CASE, CASE);
    for (const pc of ordrePieces()) {
      const A = PIECES[pc.a];
      if (A && !pc.cache) dessinPiece(g, pc, estVivante(A) ? 0 : undefined);
    }
    g.restore();
  };
  dessiner(); // demande les images
  const images = () => Object.values(Fig.img).every((im) => im === null || im.complete);
  for (let k = 0; k < 100 && !images(); k++) await new Promise((r) => setTimeout(r, 100));
  await new Promise((r) => setTimeout(r, 300));
  dessiner();

  // Sol où l'on marche : l'appli laisse le MJ poser un pion n'importe où, mais un pion de démo ne doit marcher ni dans
  // le vide (case sans sol), ni dans l'eau, une rivière ou un gouffre, sauf sur un pont, un ponton, un radeau ou un navire.
  const SOL_INTERDIT = /^(floor_water|river_|chasm_)/, PASSERELLE = /bridge|dock|pier|raft|ship|catwalk|walkway/;
  const marche = new Map();
  for (const pc of ordrePieces()) {
    const A = PIECES[pc.a];
    if (!A || pc.cache || (A.rang !== 0 && !PASSERELLE.test(pc.a))) continue;
    const [fw, fh] = emprise(pc);
    for (let y = Math.round(pc.cy - fh / 2); y < Math.round(pc.cy + fh / 2); y++)
      for (let x = Math.round(pc.cx - fw / 2); x < Math.round(pc.cx + fw / 2); x++)
        if (A.rang === 0) { if (marche.get(x + ',' + y) !== 'passerelle') marche.set(x + ',' + y, !SOL_INTERDIT.test(pc.a)); }
        else marche.set(x + ',' + y, 'passerelle');
  }
  window.__marche = marche;
  if (!window.__placeLibreAppli) {
    window.__placeLibreAppli = placeLibre;
    placeLibre = (x, y, s) => {
      for (let cy = Math.floor(y + 0.001); cy <= Math.floor(y + s - 0.001); cy++)
        for (let cx = Math.floor(x + 0.001); cx <= Math.floor(x + s - 0.001); cx++) if (!window.__marche.get(cx + ',' + cy)) return false;
      return window.__placeLibreAppli(x, y, s);
    };
  }

  // Hasard reproductible : mêmes trajets à chaque passage du script.
  let s = graine;
  const hasard = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const choisir = (l) => l[Math.floor(hasard() * l.length)];
  const pions = [];
  const departs = [];
  for (const id of distribution) {
    const F = DESIGN_FIGS.find((f) => f.id === id);
    if (!F) continue;
    const t = F.w; // emprise en cases
    const libres = [];
    for (let y = 0; y + t <= ROWS; y++)
      for (let x = 0; x + t <= COLS; x++)
        if (placeLibre(x, y, t) && !departs.some(([dx, dy]) => Math.abs(dx - x) < 3 && Math.abs(dy - y) < 3)) libres.push([x, y]);
    let meilleur = null;
    for (let essai = 0; essai < 40 && libres.length; essai++) {
      const depart = choisir(libres);
      const pts = [depart];
      let ici = depart;
      for (let etape = 0; etape < 3; etape++) {
        for (let k = 0; k < 30; k++) {
          const but = choisir(libres), d = Math.hypot(but[0] - ici[0], but[1] - ici[1]);
          if (d < 4 || d > 13) continue;
          const route = ligneLibre(ici, but, t) ? [but] : trouverChemin(ici, but, t);
          if (!route || !route.length || route.some(([x, y]) => x < 0 || y < 0 || x + t > COLS || y + t > ROWS)) continue;
          pts.push(...route);
          ici = but;
          break;
        }
      }
      const long = pts.slice(1).reduce((n, p, i) => n + Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]), 0);
      if (!meilleur || long > meilleur.long) meilleur = { pts, long };
      if (long >= 12) break;
    }
    if (!meilleur || meilleur.long < 4) continue;
    departs.push(meilleur.pts[0]);
    // Garde seulement les virages, et passe du coin haut-gauche au centre du pion.
    const p = meilleur.pts;
    const virages = p.filter((q, i) => i === 0 || i === p.length - 1 || (q[0] - p[i - 1][0]) !== (p[i + 1][0] - q[0]) || (q[1] - p[i - 1][1]) !== (p[i + 1][1] - q[1]));
    pions.push({ id, taille: F.img || t * 1.5, v: Math.min(1.5, Math.max(0.7, F.v || 1)), pts: virages.map(([x, y]) => [x + t / 2, y + t / 2]) });
  }
  return { image: cv.toDataURL('image/png'), pions };
};

const sortieCartes = dossier('cartes');
fs.mkdirSync(path.join(sortieCartes, 'mini'));
const donnees = [];
for (const [i, c] of cartes.entries()) {
  const { image, pions } = await page.evaluate(dansAppli, { texte: c.texte, distribution: DISTRIBUTION[c.id] ?? DEFAUT, graine: 7919 * (i + 1), COLS, ROWS, CASE });
  const png = Buffer.from(image.split(',')[1], 'base64');
  const marquee = await (await avecFiligrane(sharp(png), { texte: 'table-jdr.docuxlab.com', force: 0.16 })).png().toBuffer();
  await sharp(marquee).webp({ quality: 80, effort: 5 }).toFile(path.join(sortieCartes, `${c.id}.webp`));
  await sharp(marquee).resize({ width: 960 }).webp({ quality: 78, effort: 5 }).toFile(path.join(sortieCartes, 'mini', `${c.id}.webp`));
  donnees.push({ id: c.id, titre: c.titre, pions });
  console.log(`  ${c.titre} : ${pions.length} pions`);
}
await navigateur.close();
serveur.close();
if (erreurs.length) console.warn('Erreurs dans la page de l\'appli :', erreurs);

// Planches des pions (8 × 8 : repos puis marche, 4 directions), réduites et filigranées.
const sortieFigs = dossier('marche-demo');
const figs = [...new Set(donnees.flatMap((c) => c.pions.map((p) => p.id)))];
for (const id of figs) {
  const fichier = path.join(appli, 'assets', 'design', `marche-${id}.webp`);
  const { width } = await sharp(fichier).metadata();
  const pions = donnees.flatMap((c) => c.pions).find((p) => p.id === id);
  const cote = Math.min(width / 8, Math.round((FIG_PX * pions.taille) / 1.5));
  const reduite = await sharp(fichier).resize({ width: cote * 8, height: cote * 8 }).png().toBuffer();
  await (await avecFiligrane(sharp(reduite), { cw: cote, ch: cote, force: 0.18 })).webp({ quality: 82, alphaQuality: 90, effort: 5 }).toFile(path.join(sortieFigs, `${id}.webp`));
}
console.log(`  ${figs.length} planches de pions`);

fs.writeFileSync(path.join(racine, 'src', 'data', 'cartes.json'), JSON.stringify(donnees, null, 1));
console.log('Cartes préparées dans public/cartes/ et src/data/cartes.json.');
