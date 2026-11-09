// Prises de la vue des joueurs : la vraie fenêtre « Vue Table » (2D puis 3D), puis une partie en ligne avec une page joueur.
// Depuis le dossier de l'appli (après « npm install » dans serveur/) :
//   env -u ELECTRON_RUN_AS_NODE node node_modules/electron/cli.js <site>/outils/clips/joueurs.cjs . <dossier des prises>
const { app, BrowserWindow } = require('electron');
const path = require('path'), fs = require('fs'), { spawn } = require('child_process');
const [ROOT, OUT] = process.argv.slice(2).filter(a => !a.startsWith('--') && !a.endsWith('joueurs.cjs'));
fs.mkdirSync(OUT, { recursive: true });
const PORT = 8087, CODE = 'DRAGON-42';
const orig = BrowserWindow.prototype.loadFile;
BrowserWindow.prototype.loadFile = function (f, o) { return orig.call(this, path.join(ROOT, f), o); };
app.requestSingleInstanceLock = () => true;
app.setPath('userData', path.join(OUT, 'profil'));
require(path.join(ROOT, 'main.js'));
const dort = ms => new Promise(r => setTimeout(r, ms));
const serveur = spawn('node', ['serveur/serveur.js'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) }, stdio: 'ignore' });

const AIDES = `
window.confirm = () => true; window.alert = () => {};
window.att = ms => new Promise(r => setTimeout(r, ms));
window.pion = n => state.tokens.find(t => t.name.includes(n));
window.piece = id => state.carte.pieces.find(p => p.id === id);
`;
const TAVERNE = 'Donjons et Chenapans/1 - La Taverne du Dragon Assoupi';
const bilan = {};

async function photo(win, nom) { fs.writeFileSync(path.join(OUT, nom + '.png'), (await win.webContents.capturePage()).toPNG()); bilan[nom] = 'ok'; }
async function clip(win, nom, duree, action) {
  const dir = path.join(OUT, nom), fps = 12, n = Math.round(duree * fps), prises = [], temps = [];
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const t0 = Date.now();
  Promise.resolve(action()).catch(e => { bilan[nom + ':action'] = e.message; });
  for (let i = 0; i < n; i++) {
    const reste = t0 + (i * 1000) / fps - Date.now();
    if (reste > 0) await dort(reste);
    if (Date.now() - t0 > duree * 1000 + 200) break;
    temps.push(Date.now() - t0);
    prises.push(await win.webContents.capturePage());
  }
  prises.forEach((img, i) => fs.writeFileSync(path.join(dir, String(i).padStart(3, '0') + '.png'), img.toPNG()));
  fs.writeFileSync(path.join(dir, 'temps.json'), JSON.stringify(temps));
  bilan[nom] = { images: prises.length, secondes: (temps.at(-1) / 1000).toFixed(1) };
}

app.whenReady().then(() => setTimeout(async () => {
  const mj = BrowserWindow.getAllWindows()[0];
  mj.webContents.setAudioMuted(true);
  const js = c => mj.webContents.executeJavaScript(`(async () => { ${c}\n})()`, true);
  try {
    await js(AIDES + `for (let i = 0; i < 40 && document.visibilityState !== 'visible'; i++) await att(250); await att(1200);
      openScene('${TAVERNE}'); await att(3200); basculerUI('jouer'); await att(300);
      changerCases(32); await att(600); for (const t of state.tokens) { t.auto = false; t.autoUntil = 1e12; }
      // Brouillard : la grande salle est découverte, la réserve et la cuisine restent cachées.
      setFog(true); syncFog(); const f = state.fog; f.cells.fill(1);
      for (let y = 0; y < f.rows; y++) for (let x = 0; x < f.cols; x++) if (y >= 14 || (x >= 8 && x < 18 && y >= 1 && y < 14) || (x >= 1 && x < 25 && y >= 8 && y < 14)) f.cells[y * f.cols + x] = 0;
      f.dirty = true; piece(266).ouvert = true; changePieces();
      openTable(); await att(2500);`);

    // ----- La vraie fenêtre Vue Table (celle qui va sur la TV) -----
    const tv = BrowserWindow.getAllWindows().find(w => w !== mj);
    tv.webContents.setAudioMuted(true);
    tv.setFullScreen(false); await dort(600);
    tv.setContentSize(1280, 720); tv.setPosition(60, 60); tv.show(); tv.moveTop();
    await tv.webContents.executeJavaScript(`document.getElementById('hint').hidden = true; 1`);
    await dort(1500);
    const balade = `const R = pion('Rosie'); R.speed = 2; R.path = { pts: [[9, 9], [9, 12], [20, 12], [18, 9]], i: 0, dir: 1, loop: 'boucle' };
      const H = [['Chevalier', 12, 11], ['Voleuse', 13, 11], ['Magicien', 12, 12], ['Archère', 14, 12]];
      for (const [n, x, y] of H) { const t = pion(n); t.speed = 1.8; t.path = { pts: [[x, y]], i: 0, dir: 1, loop: 'une' }; }`;
    const retour = `for (const [n, x] of [['Chevalier', 11], ['Voleuse', 12], ['Magicien', 13], ['Archère', 14]]) { const t = pion(n); t.path = null; t.route = null; t.x = x; t.y = 16; }`;
    await photo(tv, 'tv-2d');
    await clip(tv, 'tv-2d', 6.5, () => js(`await att(300); ${balade} await att(3600); pion('Gaston').parole = { texte: 'Entrez, entrez !', t0: nowS() };`));
    await photo(tv, 'tv-2d-fin');
    await js(retour + ' await att(500);');
    tv.hide();

    // ----- Partie en ligne -----
    await js(`ouvrirOnglet('annonce'); $('#elServeur').value = 'http://localhost:${PORT}'; $('#elPartie').value = '${CODE}'; $('#elMdp').value = ''; ouvrirPartieEnLigne(); await att(2500);`);
    const joueur = new BrowserWindow({ width: 1280, height: 760, useContentSize: true, x: 80, y: 80, autoHideMenuBar: true, backgroundColor: '#15120f', webPreferences: { backgroundThrottling: false } });
    joueur.webContents.setAudioMuted(true);
    const jj = c => joueur.webContents.executeJavaScript(`(async () => { ${c}\n})()`, true);
    await joueur.loadURL(`http://localhost:${PORT}/?partie=${CODE}`);
    await dort(1200);
    await jj(`document.querySelector('#nom').value = 'Léa';`); await dort(700);
    await photo(joueur, 'enligne-entree');
    await jj(`document.querySelector('#formEntree').requestSubmit();`);
    await dort(2500);
    await js(`pion('Voleuse').ctrl = 'Léa'; renderTokens(); await att(1500);`);
    await photo(joueur, 'enligne-joueur-debut');
    await clip(joueur, 'enligne-joueur', 9, async () => {
      await dort(500);
      await jj(`const t = mesPions()[0]; agir({ f: 'bouge', uid: t.uid, x: 15, y: 10, course: false });`);
      await dort(1200);
      await jj(`document.querySelector('#texte').value = 'Je pousse la porte et je cherche une table libre.'; document.querySelector('#parler').requestSubmit();`);
      await dort(2600);
      await jj(`[...document.querySelectorAll('#des button')].find(b => /d20/i.test(b.textContent)).click();`);
      await dort(1800);
      await js(`ajouterAuChat('MJ', pion('Gaston'), 'Bienvenue au Dragon assoupi, voyageuse !');`);
    });
    await photo(joueur, 'enligne-joueur');
    bilan.joueurDom = await jj(`return { persos: document.querySelector('#persos').innerText, des: document.querySelector('#des').innerText, info: document.querySelector('#info').innerText, fil: document.querySelector('#fil').innerText };`);
    await js(`selectToken(pion('Voleuse').id); await att(600);`);
    await photo(mj, 'enligne-mj');
    bilan.mj = await js(`return { etat: $('#elEtat').innerText, lien: $('#elLienTexte').value, journal: $('#elJournal').innerText };`);
  } catch (e) { bilan.erreur = e.stack; }
  fs.writeFileSync(path.join(OUT, 'bilan-joueurs.json'), JSON.stringify(bilan, null, 1));
  console.log(JSON.stringify(bilan));
  serveur.kill();
  app.exit(0);
}, 2500));
