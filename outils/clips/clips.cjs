const Q = 'Donjons et Chenapans/';
const TAVERNE = Q + '1 - La Taverne du Dragon Assoupi', CLAIRIERE = Q + '2 - La Clairière du vieux chêne', CRYPTE = Q + '5 - La Crypte du Roi Oublié';
module.exports = [
  { nom: 'brouillard', duree: 6.5,
    prep: `await ouvrir('${TAVERNE}'); vue(1.45); state.ui.vueJoueurs = true; state.ui.mode = 'tokens'; setFog(true); syncFog(); state.fog.cells.fill(1); state.ui.brush = 5;
      for (const x of [11, 13, 15]) paintFog({ x, y: 16.5 }); state.fog.dirty = true;`,
    action: `const pts = [[13,16],[13,14],[13,12],[13,10],[10,10],[7,10],[4,10],[4,12],[8,12],[12,12],[16,12],[20,12],[22,10],[19,9],[15,8],[12,5],[15,4],[11,3],[14,3]];
      await att(500); let p = pts[0];
      for (const q of pts.slice(1)) { for (let k = 1; k <= 4; k++) { paintFog({ x: p[0] + (q[0] - p[0]) * k / 4, y: p[1] + (q[1] - p[1]) * k / 4 }); await att(70); } p = q; }` },
  { nom: 'pions', duree: 6.5, cadre: [11, 2, 25, 10],
    prep: `await ouvrir('${CRYPTE}'); vue(2.3, 18, 6); state.ui.vueJoueurs = true;`,
    action: `const S = state.tokens.filter(t => t.name === 'Squelette'); await att(500);
      basculerCache(S[0]); await att(700); basculerCache(S[1]); await att(1500);
      const touche = t => { t.hitAt = nowS(); hitFx(...tokenCenter(t), tokenSound(t, 'hit')); };
      touche(S[0]); await att(800); touche(S[0]); await att(700); tuerPion(S[0]); await att(900); touche(S[1]);` },
  { nom: 'trajets', duree: 8, cadre: [1, 1, 25, 14.5],
    prep: `await ouvrir('${TAVERNE}'); vue(1.9, 13, 7.75); state.ui.vueJoueurs = false; state.ui.voirZones = false;
      const R = pion('Rosie'); R.speed = 2.2; R.path = { pts: [[9, 9], [9, 12], [20, 12], [18, 9]], i: 0, dir: 1, loop: 'boucle' };
      const L = pion('Lulu'); L.speed = 2; L.wander = { x0: 3, y0: 3, x1: 6, y1: 6, until: 0 }; L.x = 4; L.y = 5;
      const G = pion('Gaston'); G.speed = 1.2; G.wander = { x0: 9, y0: 2, x1: 16, y1: 3, until: 0 };
      const C = pion('Moustache'); C.speed = 1.6; C.wander = { x0: 3, y0: 9, x1: 9, y1: 12, until: 0 };
`,
    action: `await att(100);` },
  { nom: 'effets', duree: 7,
    prep: `await ouvrir('${CRYPTE}'); vue(1.45); state.ui.vueJoueurs = true;`,
    action: `const P = [[16, 5], [20, 8], [17, 11], [22, 5], [14, 9], [19, 12], [25, 8], [18, 7]]; await att(300); let i = 0;
      for (const k of Object.keys(EFFECTS)) { const [x, y] = P[i++ % P.length]; try { EFFECTS[k].run(x, y); } catch (e) {} await att(800); }` },
  { nom: 'meteo', duree: 7.5,
    prep: `await ouvrir('${CLAIRIERE}'); vue(1.45); state.ui.vueJoueurs = true;`,
    action: `await att(300); setWeather('rain', true); await att(2200); setWeather('rain', false); setWeather('snow', true); await att(2200);
      setWeather('snow', false); setWeather('night', true); setWeather('embers', true); await att(2400); setWeather('mist', true);` },
  { nom: 'des', duree: 6.5, cadre: [9, 4, 23, 12],
    prep: `await ouvrir('${TAVERNE}'); vue(2.3, 16, 8); state.ui.vueJoueurs = true; $('#deSecret').checked = false; $('#deBonus').value = 0;`,
    action: `await att(400); lancerDe('d20'); await att(3000); lancerDe('d6');` },
  { nom: 'carte-vivante', duree: 6.5, cadre: [13, 1, 27, 9],
    prep: `await ouvrir('${TAVERNE}'); vue(2.3, 20, 5); state.ui.vueJoueurs = true;`,
    action: `await att(500); basculer(piece(206)); await att(1300); basculer(piece(148)); await att(1500); basculer(piece(206)); await att(1300); basculer(piece(148));` },
  { nom: 'declencheur', duree: 8.5,
    prep: `await ouvrir('${TAVERNE}'); vue(1.45); state.ui.vueJoueurs = false; state.ui.voirZones = true;
      piece(206).ouvert = true; changePieces(); const C = pion('Chevalier'); C.x = 14; C.y = 6; C.speed = 1.6; C.route = null;`,
    action: `await att(700); const C = pion('Chevalier'); C.path = { pts: [[16, 5], [20, 5]], i: 0, dir: 1, loop: 'une' };` },
  { nom: 'createur', duree: 9, fps: 10, zone: 'fenetre',
    prep: `await ouvrir('${TAVERNE}', 'preparer'); ouvrirOnglet('mat'); vue(1.45);
      state.tokens.length = 0; renderTokens(); Object.assign(state.carte, { pieces: [], lignes: [], zones: [] }); changePieces(); await att(600); nettoyerListe();`,
    action: `const pose = (a, x, y, rot, ligne) => { if (!PIECES[a]) return; poserPiece(a, calerPiece(PIECES[a], { x, y }, rot || 0, ligne)); changePieces(); };
      await att(400); Carte.rot = 0; remplirSol(PIECES.floor_grass); await att(700);
      for (let y = 4; y < 14; y += 2) for (let x = 8; x < 24; x += 2) { pose('floor_wood', x + 0.5, y + 0.5); await att(45); }
      const w = PIECES.wall_stone.w;
      for (let x = 8; x < 24; x += w) { pose('wall_stone', x + w / 2, 4, 0, { horiz: true, v: 4 }); await att(40); }
      for (let y = 4; y < 14; y += w) { pose('wall_stone', 24, y + w / 2, 0, { horiz: false, v: 24 }); await att(40); }
      for (let x = 24 - w; x >= 8; x -= w) { if (Math.abs(x + w / 2 - 16) > 1.1) pose('wall_stone', x + w / 2, 14, 0, { horiz: true, v: 14 }); await att(40); }
      for (let y = 14 - w; y >= 4; y -= w) { pose('wall_stone', 8, y + w / 2, 0, { horiz: false, v: 8 }); await att(40); }
      pose('door_double', 16, 14, 0, { horiz: true, v: 14 }); await att(350);
      for (const [a, x, y, r] of [['bar_counter', 16, 6], ['barrels', 9.5, 5.5], ['fireplace', 22.9, 9, 1], ['table_round', 12, 10], ['chair', 10.5, 10.5], ['chair', 13.5, 10.5], ['table_long', 18, 11], ['bench', 18, 12.2], ['rug', 16, 9], ['bookshelf', 21, 5], ['chest', 22.5, 12.5], ['candelabra', 9.5, 12.5], ['tree_oak', 4, 5], ['bush', 27, 12], ['well', 28, 6], ['cart', 4, 13]]) { pose(a, x, y, r); await att(300); }` },
  { nom: 'scenes', duree: 9, fps: 10, zone: 'fenetre',
    prep: `await ouvrir('${TAVERNE}'); vue(1.45); state.ui.vueJoueurs = false;`,
    action: `await att(1500); sceneStep(1); await att(2400); sceneStep(1); await att(2400); sceneStep(1);` },
  { nom: 'paroles', duree: 7.5, cadre: [3, 0.5, 29, 15.125],
    prep: `await ouvrir('${TAVERNE}'); vue(1.78, 16, 7.8); state.ui.vueJoueurs = true;`,
    action: `await att(400); pion('Gaston').parole = { texte: 'Bienvenue au Dragon assoupi !', t0: nowS() }; await att(1700);
      pion('Rosie').parole = { texte: 'Une chope pour nos aventuriers ?', t0: nowS() }; await att(1700);
      pion('Tilou').parole = { texte: '*accorde son luth*', t0: nowS() }; await att(1400);
      Object.assign(state.announce, { text: 'La nuit tombe…', both: false, visible: true }); setWeather('night', true);` },
];
