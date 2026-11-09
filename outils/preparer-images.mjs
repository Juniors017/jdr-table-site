// Fabrique les images du site à partir de celles de l'appli, en version « vitrine » :
// assez belles pour être montrées, pas assez complètes pour remplacer le pack.
//   node outils/preparer-images.mjs <chemin vers table-jdr/assets/design>
// - figurines : 2 lignes sur 8 seulement (repos et marche vers le bas), à 80 % ;
//   seules celles de la démo du haut de page gardent leurs 4 directions (dossier marche-demo/) ;
// - objets, bandes animées et dés : à 70 % ;
// - cartes prêtes (dossier public/cartes) : non touchées ici, déjà réduites à 1280 px.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const source = process.argv[2];
if (!source || !fs.existsSync(source)) {
  console.error('Donne le dossier assets/design de l\'appli.');
  process.exit(1);
}
const pub = path.join(import.meta.dirname, '..', 'public');
const DEMO = ['hero_fighter', 'hero_wizard', 'npc_barmaid', 'mob_rat', 'animal_cat'];
const dossier = (nom) => {
  const d = path.join(pub, nom);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const sorties = { marche: dossier('marche'), demo: dossier('marche-demo'), piece: dossier('pieces'), anim: dossier('anim'), de: dossier('des') };
const reduire = async (fichier, sortie, facteur) => {
  const { width } = await sharp(fichier).metadata();
  await sharp(fichier).resize({ width: Math.round(width * facteur) }).webp({ quality: 72 }).toFile(sortie);
};

let n = 0;
for (const f of fs.readdirSync(source)) {
  const m = f.match(/^(marche|piece|anim|de)-(.+)\.webp$/);
  if (!m) continue;
  const [, genre, id] = m;
  const fichier = path.join(source, f);
  if (genre === 'marche') {
    const { width } = await sharp(fichier).metadata();
    const c = Math.floor(width / 8); // côté d'une image de la planche
    const ligne = (i) => sharp(fichier).extract({ left: 0, top: Math.round((i * width) / 8), width, height: c }).toBuffer();
    await sharp({ create: { width, height: c * 2, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite([{ input: await ligne(0), top: 0, left: 0 }, { input: await ligne(4), top: c, left: 0 }])
      .png().toBuffer()
      .then((b) => sharp(b).resize({ width: Math.round(width * 0.8) }).webp({ quality: 72 }).toFile(path.join(sorties.marche, `${id}.webp`)));
    if (DEMO.includes(id)) await reduire(fichier, path.join(sorties.demo, `${id}.webp`), 0.8);
  } else {
    await reduire(fichier, path.join(sorties[genre], `${id}.webp`), 0.7);
  }
  n++;
}
console.log(`${n} images préparées dans public/`);
