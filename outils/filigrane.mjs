// Filigrane commun aux scripts de préparation des images (preparer-images.mjs, preparer-cartes.mjs).
import sharp from 'sharp';

// Un texte répété en biais, blanc à liseré sombre pour rester lisible sur clair comme sur foncé.
const filigrane = (w, h, texte, taille, force) =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
  <defs><pattern id="f" width="${Math.round(taille * texte.length * 0.72)}" height="${Math.round(taille * 3)}" patternUnits="userSpaceOnUse" patternTransform="rotate(-28)">
    <text x="0" y="${taille}" font-family="Arial, Helvetica, sans-serif" font-weight="700" font-size="${taille}" fill="#fff" fill-opacity="${force}" stroke="#000" stroke-opacity="${force * 0.6}" stroke-width="${Math.max(0.6, taille / 25)}">${texte}</text>
  </pattern></defs>
  <rect width="100%" height="100%" fill="url(#f)"/>
</svg>`);
const tailleTexte = (cote) => Math.max(10, Math.min(30, Math.round(cote / 11)));

// Pose le filigrane sur une image. Sur une planche (figurines, bandes animées), il est répété à l'identique dans chaque
// case (cw × ch) pour ne pas « glisser » pendant l'animation. Sur fond transparent, il n'est posé que sur l'objet
// (pixels presque opaques : ni le fond, ni l'ombre) ; la transparence d'origine est ensuite remise telle quelle.
// `seuil` : opacité minimale d'un pixel d'objet (plus bas pour les calques translucides, qui n'ont pas d'ombre).
export const avecFiligrane = async (image, { texte = 'TABLE-JDR', cw, ch, force = 0.2, seuil = 200 } = {}) => {
  const { data, info } = await image.png().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  cw ??= w;
  ch ??= h;
  const tuile = await sharp(filigrane(cw, ch, texte, tailleTexte(Math.min(cw, ch)), force)).png().toBuffer();
  const marque =
    cw === w && ch === h
      ? tuile
      : await sharp({ create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
          .composite([{ input: tuile, tile: true, gravity: 'northwest' }]).png().toBuffer();
  if (info.channels < 4) return sharp(data).composite([{ input: marque }]);
  const alpha = await sharp(data).extractChannel('alpha').png().toBuffer();
  const objet = await sharp(alpha).threshold(seuil).toColourspace('b-w').raw().toBuffer();
  const masque = await sharp({ create: { width: w, height: h, channels: 3, background: '#fff' } })
    .joinChannel(objet, { raw: { width: w, height: h, channels: 1 } }).png().toBuffer();
  const marqueSurObjet = await sharp(marque).composite([{ input: masque, blend: 'dest-in' }]).png().toBuffer();
  const couleurs = await sharp(data).composite([{ input: marqueSurObjet }]).removeAlpha().png().toBuffer();
  return sharp(couleurs).joinChannel(alpha);
};
