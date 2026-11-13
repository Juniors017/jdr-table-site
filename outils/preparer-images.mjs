// Fabrique les images et les données du site à partir du dépôt des assets (https://github.com/Juniors017/assets-table-jdr) :
//   node outils/preparer-images.mjs <chemin vers assets-table-jdr>
// Toutes les images sont en pleine résolution (celle du pack) avec un filigrane léger posé sur l'objet lui-même :
// - objets (pieces/) : image du pack + vignette réduite pour la grille du catalogue (pieces/mini/) ;
// - figurines (marche/) : 2 lignes sur 8 de la planche (repos et marche vers le bas), + version réduite (marche/mini/) ;
// - objets animés (anim/) et dés (des/) : bandes complètes ;
// Les cartes et les pions du haut de page viennent du dépôt de l'appli : voir outils/preparer-cartes.mjs.
// Écrit aussi src/data/catalogue.json (noms, thèmes et sections repris des planches thématiques R*.json du dépôt).
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { avecFiligrane } from './filigrane.mjs';

const depot = process.argv[2];
const pack = depot && path.join(depot, 'pack');
if (!pack || !fs.existsSync(path.join(pack, 'manifeste.json'))) {
  console.error('Donne le dossier du dépôt assets-table-jdr (celui qui contient pack/ et generateur/).');
  process.exit(1);
}
const racine = path.join(import.meta.dirname, '..');
const pub = path.join(racine, 'public');
const manifeste = JSON.parse(fs.readFileSync(path.join(pack, 'manifeste.json'), 'utf8'));
const MINI = 240; // côté maximal des vignettes du catalogue
const MINI_FIG = 150; // côté maximal d'une image de figurine dans les grilles
const dossier = (nom) => {
  const d = path.join(pub, nom);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  return d;
};

const HQ = { quality: 84, alphaQuality: 90, effort: 5 };

// Fait tourner `travail` sur une liste, quelques fichiers à la fois.
const enParallele = async (liste, travail, n = 6) => {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < liste.length) await travail(liste[i++]); }));
};
const progression = (titre, total) => {
  let fait = 0;
  return () => { if (++fait % 100 === 0 || fait === total) console.log(`  ${titre} : ${fait} / ${total}`); };
};

// --- Données : thèmes et sections des planches, noms et tailles du manifeste ---
const planchesDir = path.join(depot, 'generateur', 'planches');
const lirePlanche = (nom) => JSON.parse(fs.readFileSync(path.join(planchesDir, `${nom}.json`), 'utf8'));
const assets = new Map(manifeste.assets.map((a) => [a.id, a]));
const marches = new Map(manifeste.cycles_de_marche.planches.map((p) => [p.id, p]));
const animes = new Map(manifeste.objets_animes.map((a) => [a.id, a]));
const pris = new Set();
const cases = (e) => [e.emprise_cases?.largeur ?? 1, e.emprise_cases?.hauteur ?? 1];

const element = (id) => {
  if (pris.has(id)) return null;
  pris.add(id);
  if (animes.has(id)) {
    const a = animes.get(id);
    const [w, h] = cases(a);
    return { id, nom: a.nom, genre: 'anim', w, h, images: a.images, boucle: !a.lecture.startsWith('aller-retour'), iw: a.image_px.largeur, ih: a.image_px.hauteur };
  }
  if (marches.has(id)) {
    const p = marches.get(id);
    const [w, h] = cases(p);
    return { id, nom: p.nom, genre: 'fig', w, h, v: p.vitesse_cases_par_seconde };
  }
  const a = assets.get(id);
  if (!a) return null;
  const [w, h] = cases(a);
  return { id, nom: a.nom, genre: 'piece', w, h, iw: a.largeur_px, ih: a.hauteur_px };
};
// Une planche → un thème ; les sections de même titre qui se suivent sont fusionnées.
const theme = (id, p, titre = p.title, desc = p.desc) => {
  const sections = [];
  for (const s of p.sections) {
    const ids = (s.c ?? s.items.map((x) => x[1])).map(element).filter(Boolean);
    if (!ids.length) continue;
    const derniere = sections.at(-1);
    if (derniere?.titre === s.t) derniere.items.push(...ids);
    else sections.push({ titre: s.t, items: ids });
  }
  return { id, titre, desc, sections };
};
const parCategorie = (liste, titre) => ({ titre, items: liste.map((x) => element(x.id)).filter(Boolean) });

// Bestiaire : figurines qui marchent, plus les héros à terre (image fixe).
const heros = theme('heros', lirePlanche('Rheros'));
heros.sections.push(parCategorie(manifeste.assets.filter((a) => a.categorie === 'Héros' && a.id.endsWith('_down')), 'Héros à terre (0 PV)'));
const pnj = theme('pnj', lirePlanche('Rpnj'), 'PNJ et animaux', 'Habitants, soldats, elfes, animaux, montures et attelages.');
const monstres = theme('monstres', lirePlanche('Rmonstres'), 'Monstres', 'Tout le bestiaire, rangé par taille.');
const restants = [...marches.keys()].filter((id) => !pris.has(id));
if (restants.length) monstres.sections.push({ titre: 'Autres', items: restants.map(element).filter(Boolean) });
const bestiaire = [heros, pnj, monstres];

// Catalogue : les 19 planches thématiques, puis ce qu'elles ne montrent pas (sorts, marqueurs, gabarits, objets animés).
const objets = fs.readdirSync(planchesDir).filter((f) => /^R\d+\.json$/.test(f)).sort()
  .map((f) => { const n = f.replace('.json', ''); return theme(n.toLowerCase(), lirePlanche(n)); });
for (const p of manifeste.cycles_de_marche.planches) pris.add(p.id);
for (const a of manifeste.assets) if (marches.has(a.id)) pris.add(a.id); // image fixe d'une figurine qui marche : déjà au bestiaire
const reste = (categorie) => manifeste.assets.filter((a) => a.categorie === categorie && !pris.has(a.id));
objets.push({
  id: 'sorts', titre: 'Sorts et marqueurs', desc: "Zones de sorts à poser sur la carte, anneaux d'état à poser sur un jeton.",
  sections: [parCategorie(reste('Effets de sorts'), 'Zones de sorts'), parCategorie(reste("Marqueurs d'état"), "Marqueurs d'état")],
});
objets.push({ id: 'outils', titre: 'Gabarits de sorts', desc: 'Sphères, cônes, lignes et cubes translucides, gradués tous les 1,5 m.', sections: [parCategorie(reste('Outils du MJ'), 'Gabarits')] });
const categoriesAnimees = [...new Set(manifeste.objets_animes.map((a) => a.categorie))];
objets.push({
  id: 'animes', titre: 'Objets animés', desc: "Portes et coffres qui s'ouvrent, mimiques, feux, eau, lave et objets magiques.",
  sections: categoriesAnimees.map((c) => parCategorie(manifeste.objets_animes.filter((a) => a.categorie === c), c)),
});
const oublies = manifeste.assets.filter((a) => !pris.has(a.id));
if (oublies.length) objets.push({ id: 'divers', titre: 'Divers', desc: '', sections: [parCategorie(oublies, 'Divers')] });
for (const t of [...objets, ...bestiaire]) t.sections = t.sections.filter((s) => s.items.length);

const compte = (themes) => themes.reduce((n, t) => n + t.sections.reduce((m, s) => m + s.items.length, 0), 0);
const donnees = {
  chiffres: { assets: manifeste.assets.length, figurines: marches.size, animes: animes.size, des: manifeste.des.length },
  objets,
  bestiaire,
};
fs.writeFileSync(path.join(racine, 'src', 'data', 'catalogue.json'), JSON.stringify(donnees, null, 1));
console.log(`Données : ${compte(objets)} objets au catalogue, ${compte(bestiaire)} figurines au bestiaire.`);

// --- Images ---
const sorties = { pieces: dossier('pieces'), mini: path.join(pub, 'pieces', 'mini'), marche: dossier('marche'), anim: dossier('anim'), des: dossier('des') };
sorties.marcheMini = path.join(sorties.marche, 'mini');
for (const d of [sorties.mini, sorties.marcheMini]) fs.mkdirSync(d, { recursive: true });

// Objets fixes (y compris les héros à terre), sauf les images fixes des figurines qui marchent.
const fixes = manifeste.assets.filter((a) => !marches.has(a.id));
let suite = progression('objets', fixes.length);
await enParallele(fixes, async (a) => {
  const fichier = path.join(pack, a.fichier);
  const seuil = a.type.startsWith('calque') ? 24 : 200;
  await (await avecFiligrane(sharp(fichier), { seuil })).webp(HQ).toFile(path.join(sorties.pieces, `${a.id}.webp`));
  const petit = sharp(fichier).resize({ width: MINI, height: MINI, fit: 'inside', withoutEnlargement: true });
  await (await avecFiligrane(petit, { seuil, force: 0.16 })).webp({ quality: 74, alphaQuality: 85, effort: 5 }).toFile(path.join(sorties.mini, `${a.id}.webp`));
  suite();
});

// Figurines : planche 8 × 8 → lignes 1 (repos ↓) et 5 (marche ↓).
const planches = manifeste.cycles_de_marche.planches;
suite = progression('figurines', planches.length);
await enParallele(planches, async (p) => {
  const fichier = path.join(pack, p.fichier);
  const { width, height } = await sharp(fichier).metadata();
  const cw = width / 8, ch = height / 8;
  const ligne = (i) => sharp(fichier).extract({ left: 0, top: Math.round(i * ch), width, height: Math.round(ch) }).toBuffer();
  const deux = await sharp({ create: { width, height: Math.round(ch) * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: await ligne(0), top: 0, left: 0 }, { input: await ligne(4), top: Math.round(ch), left: 0 }]).png().toBuffer();
  await (await avecFiligrane(sharp(deux), { cw, ch, force: 0.18 })).webp(HQ).toFile(path.join(sorties.marche, `${p.id}.webp`));
  // Version réduite pour les grilles (images de 150 px au plus), la pleine résolution s'ouvre dans la visionneuse.
  const mc = Math.min(Math.round(cw), MINI_FIG);
  const petite = await sharp(deux).resize({ width: mc * 8, height: mc * 2, fit: 'fill' }).png().toBuffer();
  await (await avecFiligrane(sharp(petite), { cw: mc, ch: mc, force: 0.16 })).webp({ quality: 76, alphaQuality: 85, effort: 5 }).toFile(path.join(sorties.marcheMini, `${p.id}.webp`));
  suite();
});

// Objets animés : bandes horizontales de n images.
await enParallele(manifeste.objets_animes, async (a) => {
  const fichier = path.join(pack, a.fichier);
  await (await avecFiligrane(sharp(fichier), { cw: a.image_px.largeur, ch: a.image_px.hauteur, force: 0.18 })).webp(HQ).toFile(path.join(sorties.anim, `${a.id}.webp`));
});
console.log(`  objets animés : ${animes.size}`);

// Dés : bandes de résultats et de lancer (images carrées).
for (const f of fs.readdirSync(path.join(pack, 'animations', 'des')).filter((x) => x.endsWith('.png'))) {
  const fichier = path.join(pack, 'animations', 'des', f);
  const { height } = await sharp(fichier).metadata();
  await (await avecFiligrane(sharp(fichier), { cw: height, ch: height, force: 0.14 })).webp(HQ).toFile(path.join(sorties.des, f.replace('.png', '.webp')));
}
console.log('  dés : faits');

console.log('Images préparées dans public/.');
