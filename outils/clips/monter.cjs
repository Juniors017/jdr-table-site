// Monte les images de chaque clip en WebP animé + une image fixe (pour « mouvement réduit »).
//   node outils/clips/monter.cjs <dossier des prises> brouillard pions …
const sharp = require('sharp');
const fs = require('fs'), path = require('path');
const OUT = path.resolve(process.argv[2]), DEST = path.join(__dirname, '..', '..', 'public', 'clips');
fs.mkdirSync(DEST, { recursive: true });
const LARGE = { createur: 960, scenes: 960, 'enligne-joueur': 960 };
(async () => {
  for (const nom of process.argv.slice(3)) {
    const dir = path.join(OUT, nom), f = fs.readdirSync(dir).filter(x => x.endsWith('.png')).sort();
    const temps = JSON.parse(fs.readFileSync(path.join(dir, 'temps.json'), 'utf8'));
    const width = LARGE[nom] || 720;
    const images = [];
    for (const x of f) images.push(await sharp(path.join(dir, x)).resize({ width }).png().toBuffer());
    const delay = temps.map((t, i) => Math.max(40, Math.round((temps[i + 1] ?? t + 1200) - t))); // la dernière image reste 1,2 s
    const info = await sharp(images, { join: { animated: true } }).webp({ quality: 58, effort: 4, delay, loop: 0 }).toFile(path.join(DEST, nom + '.webp'));
    const fixe = f[Math.floor(f.length * 0.6)];
    await sharp(path.join(dir, fixe)).resize({ width }).webp({ quality: 72 }).toFile(path.join(DEST, nom + '-fixe.webp'));
    console.log(nom, f.length, 'images', info.width + 'x' + info.pageHeight, Math.round(info.size / 1024) + ' Ko');
  }
})();
