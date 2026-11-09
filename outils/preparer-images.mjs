// Fabrique les images du site à partir de celles de l'appli, en version « vitrine » :
// assez belles pour être montrées, pas assez complètes pour remplacer le pack.
//   node outils/preparer-images.mjs <chemin vers table-jdr/assets/design> [<dossier des cartes d'origine>]
// - figurines : 2 lignes sur 8 seulement (repos et marche vers le bas), à 80 % ;
//   seules celles de la démo du haut de page gardent leurs 4 directions (dossier marche-demo/) ;
// - objets : à 70 %, avec un filigrane léger posé sur l'objet (pas sur le fond transparent) ;
// - bandes animées et dés : à 70 % ;
// - cartes prêtes (dossier web/cartes du dépôt des assets, si donné) : 1280 px, avec un filigrane léger.
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const [source, cartes] = process.argv.slice(2);
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

// Filigrane : un texte répété en biais sur toute l'image, blanc à liseré sombre pour rester lisible sur clair comme sur foncé.
const filigrane = (w, h, texte, taille, force) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><pattern id="f" width="${Math.round(taille * texte.length * 0.72)}" height="${Math.round(taille * 3)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
    <text x="0" y="${taille}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${taille}" fill="#fff" fill-opacity="${force}" stroke="#000" stroke-opacity="${force * 0.6}" stroke-width="0.6">${texte}</text>
  </pattern></defs>
  <rect width="100%" height="100%" fill="url(#f)"/>
</svg>`);
// « atop » : le filigrane ne se dessine que là où l'image n'est pas transparente.
const avecFiligrane = async (image, texte, taille, force) => {
  const { data, info } = await image.png().toBuffer({ resolveWithObject: true });
  return sharp(data).composite([{ input: filigrane(info.width, info.height, texte, taille, force), blend: 'atop' }]);
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
  } else if (genre === 'piece') {
    const { width } = await sharp(fichier).metadata();
    const w = Math.round(width * 0.7);
    const image = await avecFiligrane(sharp(fichier).resize({ width: w }), 'TABLE-JDR', Math.max(9, Math.min(15, Math.round(w / 10))), 0.3);
    await image.webp({ quality: 74 }).toFile(path.join(sorties.piece, `${id}.webp`));
  } else {
    await reduire(fichier, path.join(sorties[genre], `${id}.webp`), 0.7);
  }
  n++;
}
console.log(`${n} images préparées dans public/`);

if (cartes && fs.existsSync(cartes)) {
  const sortie = dossier('cartes');
  for (const f of fs.readdirSync(cartes).filter((x) => /\.(webp|png)$/.test(x))) {
    const image = await avecFiligrane(sharp(path.join(cartes, f)).resize({ width: 1280 }), 'table-jdr.docuxlab.com', 20, 0.16);
    await image.webp({ quality: 76 }).toFile(path.join(sortie, f.replace(/\.png$/, '.webp')));
  }
  console.log('Cartes préparées dans public/cartes');
} else {
  console.log('Cartes non refaites (donne le dossier des cartes d\'origine en 2e argument pour les refaire).');
}
