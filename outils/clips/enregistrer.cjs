// Enregistreur de séquences : lance l'appli (copie de travail, profil isolé, son coupé), joue chaque clip et capture ses images.
// À lancer depuis le dossier de l'appli table-jdr (Git Bash) :
//   env -u ELECTRON_RUN_AS_NODE node node_modules/electron/cli.js <site>/outils/clips/enregistrer.cjs . <site>/outils/clips/clips.cjs <dossier des prises> [noms,à,faire]
// puis : node outils/clips/monter.cjs <dossier des prises> <noms…>   (dans le dossier du site)
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs');
const [ROOT, FICHIER, OUT, seuls] = process.argv.slice(2).filter(a => !a.startsWith('--') && !a.endsWith('enregistrer.cjs'));
fs.mkdirSync(OUT, { recursive: true });
const orig = BrowserWindow.prototype.loadFile;
BrowserWindow.prototype.loadFile = function (f, o) { return orig.call(this, path.join(ROOT, f), o); };
app.requestSingleInstanceLock = () => true;
app.setPath('userData', path.join(OUT, 'profil'));
require(path.join(ROOT, 'main.js'));
const dort = ms => new Promise(r => setTimeout(r, ms));

const AIDES = `
window.confirm = () => true; window.alert = () => {};
window.att = ms => new Promise(r => setTimeout(r, ms));
window.ouvrir = async (rel, mode) => {
  openScene(rel); await att(3200); basculerUI(mode || 'jouer'); await att(300);
  state.ui.zoom.k = 1; state.ui.zoom.x = 0.5; state.ui.zoom.y = 0.5; selectToken(null);
  for (const t of state.tokens) { t.auto = false; t.autoUntil = 1e12; }
  await att(200);
};
window.vue = (k, cx, cy) => { const g = gridDims(), T = state.table, Z = state.ui.zoom; Z.k = k; Z.x = cx == null ? 0.5 : (g.ox + cx * g.c) / T.w; Z.y = cy == null ? 0.5 : (g.oy + cy * g.c) / T.h; recadrerVue(); $('#zoomVal').textContent = Math.round(k * 100) + ' %'; };
window.cadre = c => { const r = preview.canvas.getBoundingClientRect(), v = makeView(preview, false, false), g = gridDims(); const [x0, y0, x1, y1] = c || [0, 0, g.cols, g.rows];
  return { x: Math.round(r.left + v.ox + x0 * v.cs), y: Math.round(r.top + v.oy + y0 * v.cs), width: Math.round((x1 - x0) * v.cs), height: Math.round((y1 - y0) * v.cs) }; };
window.pion = n => state.tokens.find(t => t.name.includes(n));
window.piece = id => state.carte.pieces.find(p => p.id === id);
window.basculer = pc => { if (ALTERNE[pc.a]) pc.a = ALTERNE[pc.a]; else { pc.ouvert = !pc.ouvert; pc.t0 = nowS(); } changePieces(); };
window.nettoyerListe = () => [...document.querySelectorAll('#scenario *')].filter(e => e.children.length < 3 && /Poudlard|Quete jade|Quetes de la moria|Scènes libres|^\\s*1\\. Scène 1/.test(e.textContent)).forEach(e => e.remove());
`;

app.whenReady().then(() => setTimeout(async () => {
  const mj = BrowserWindow.getAllWindows()[0];
  mj.webContents.setAudioMuted(true);
  const js = c => mj.webContents.executeJavaScript(`(async () => { ${c}\n})()`, true);
  const bilan = {};
  try {
    await js(AIDES + `for (let i = 0; i < 40 && document.visibilityState !== 'visible'; i++) await att(250); await att(1200);`);
    for (const c of require(FICHIER)) {
      if (seuls && !seuls.split(',').includes(c.nom)) continue;
      const dir = path.join(OUT, c.nom);
      fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
      try {
        await js(c.prep);
        await dort(400);
        const rect = c.zone === 'fenetre' ? undefined : await js(c.zone ? `const r = document.querySelector(${JSON.stringify(c.zone)}).getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height) };` : `return cadre(${JSON.stringify(c.cadre || null)});`);
        const fps = c.fps || 12, n = Math.round(c.duree * fps), t0 = Date.now();
        js(c.action).catch(e => { bilan[c.nom + ':action'] = e.message; });
        const prises = [], temps = [];
        for (let i = 0; i < n; i++) { // on garde les images en mémoire : l'encodage PNG ralentirait la prise
          const reste = t0 + (i * 1000) / fps - Date.now();
          if (reste > 0) await dort(reste);
          if (Date.now() - t0 > c.duree * 1000 + 200) break;
          temps.push(Date.now() - t0);
          prises.push(await mj.webContents.capturePage(rect));
        }
        prises.forEach((img, i) => fs.writeFileSync(path.join(dir, String(i).padStart(3, '0') + '.png'), img.toPNG()));
        fs.writeFileSync(path.join(dir, 'temps.json'), JSON.stringify(temps));
        bilan[c.nom] = { images: prises.length, secondes: (temps.at(-1) / 1000).toFixed(1) };
      } catch (e) { bilan[c.nom] = 'ERREUR ' + e.message; }
    }
  } catch (e) { bilan.erreur = e.message; }
  fs.writeFileSync(path.join(OUT, 'bilan.json'), JSON.stringify(bilan, null, 1));
  console.log(JSON.stringify(bilan));
  app.exit(0);
}, 2500));
