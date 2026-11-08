import { launch, openGame, warm, capture } from './lib.mjs';
const only = process.argv.slice(2);
const b = await launch();
const HIDE = '#hud, #mate, #prompt, #placeline { display: none !important; }';
const ORBIT = (a0, a1, r0, r1, h0, h1, lookY = 2.4, lead = 3, spd = 5.5) => `const g = window.__game; g.ship.speed = ${spd}; g.ship.trim = 1; const k = i / n, a = ${a0} + (${a1} - ${a0}) * k, r = ${r0} + (${r1} - ${r0}) * k, hh = ${h0} + (${h1} - ${h0}) * k, h = g.ship.heading, P = g.ship.pos; g.setOverride({ pos: [P.x + Math.sin(a) * r, hh, P.z - Math.cos(a) * r], look: [P.x + Math.sin(h) * ${lead}, ${lookY}, P.z - Math.cos(h) * ${lead}] });`;
const open = async (q, css = HIDE) => { const p = await openGame(b, `autostart=1&fresh=1&nomate=1&${q}`); await p.addStyleTag({ content: css }); return p; };

const BARS = 60 / 99 * 4, FR = (b) => Math.round(b * BARS * 30) + 4;
async function game(name, id, title, tick, warmS = 0.4) {
  const p = await open('time=0.5', '#mate, #toasts { display: none !important; }');
  await p.evaluate(() => { const g = window.__game; g.teleport(30, -40, 0.9); });
  await warm(p, 1);
  await p.evaluate(([id, title]) => { const g = window.__game; g.openModal('local'); g.localGames.open(id, title, () => {}); }, [id, title]);
  await warm(p, warmS);
  await capture(p, name, FR(1), tick);
  await p.close();
}
const S = {
  async b1() {   // Tama: the greeting, then the board with Ada the baker on top
    const p = await open('time=0.42', '#mate, #toasts { display: none !important; }');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.42); g.state.goals.started = true; g.state.goals.i = 14; g.state.story.onbAll = true; g.ship.speed = 0; });
    await warm(p, 0.5);
    await p.evaluate(() => window.__game.openHarbour('0,-1', 'board'));
    await warm(p, 2.5);
    await capture(p, 'b1', FR(1), '');
    await p.close();
  },
  async b6() {   // a gust caught: dark ruffled water ahead, the sails fill
    const p = await open('time=0.5');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.5); g.teleport(160, 30, -2.0); g.ship.trim = 1; });
    await warm(p, 1.5);
    await p.evaluate(() => { const g = window.__game, P = g.ship.pos, h = g.ship.heading; g.seaplay.spawnAt(P.x + Math.sin(h) * 22, P.z - Math.cos(h) * 22); });
    await capture(p, 'b6', FR(1), ORBIT(2.9, 3.4, 12, 10, 4.5, 3.2, 1.6, 10, 6));
    await p.close();
  },
  async b2() {   // the new chart, with a card over Velto
    const p = await open('time=0.5', '#mate, #toasts { display: none !important; }');
    await p.evaluate(() => { const g = window.__game, st = g.state; g.teleport(30, -40, 0.9); st.goals.i = 14;
      for (let cx = -6; cx <= 6; cx++) for (let cz = -6; cz <= 6; cz++) { const d = g.world.desc(cx, cz); if (d && Math.hypot(d.x, d.z) < 650) st.discovered[d.id] = { name: d.name }; }
      const v = g.world.desc(-2, -1); st.job = { toId: v.id, toName: v.name, x: v.x, z: v.z, item: 'a parcel of fine tea', reward: 40 }; st.tracked = 'job'; st.story.lanes = { 'the Tooth Run': true }; });
    await warm(p, 1);
    await p.evaluate(() => { const g = window.__game; g.logbook.view.sc = 0.7; g.logbook.view.follow = true; g.openModal('chart'); });
    await warm(p, 1);
    await capture(p, 'b2', FR(1), `const g = window.__game, lb = g.logbook; lb.view.sc = 0.7 + 0.45 * (i / n); lb.drawMap();
      if (i === Math.floor(n * 0.45)) { const v = lb.view, cv = document.getElementById('mapCv'), r = cv.getBoundingClientRect(), d = g.world.desc(-2, -1);
        const x = r.left + (lb.MW / 2 + (d.x - v.cx) * v.sc) * r.width / lb.MW, y = r.top + (lb.MH / 2 + (d.z - v.cz) * v.sc) * r.height / lb.MH; cv.dispatchEvent(new PointerEvent('pointermove', { clientX: x, clientY: y, bubbles: true })); }`);
    await p.close();
  },
  async b3() { await game('b3', 'kite', 'KITE DAY', `const L = window.__game.localGames; L.held.clear(); const g = L.g; if (g && g.x > 168) L.held.add('KeyA'); else if (g && g.x < 152) L.held.add('KeyD');`); },
  async b4() { await game('b4', 'bells', 'RING THE PEAL', ''); },
  async b5() { await game('b5', 'shy', 'COCONUT SHY', `const L = window.__game.localGames, g = L.g; if (g && !g.shot && g.nuts.some((q) => q.up && Math.abs(q.p - g.a) < 0.03)) L.key('Space');`); },
  async b7() { await game('b7', 'arm', 'STRONGARM NIGHT', `const L = window.__game.localGames, g = L.g; if (g) { const ph = (g.t % g.beat) / g.beat; if (ph < 0.06 && (window.__lb || -1) !== Math.floor(g.t / g.beat)) { window.__lb = Math.floor(g.t / g.beat); L.key('Space'); } }`); },
  async b12() { await game('b12', 'skip', 'SKIP A STONE', `const L = window.__game.localGames, g = L.g; if (g && g.phase === 'power' && g.k > 0.92) L.key('Space'); else if (g && g.phase === 'angle' && Math.abs(g.k - 0.25) < 0.04) L.key('Space');`, 0.6); },
  async b8() { await game('b8', 'lanterns', 'LANTERN VIGIL', `const L = window.__game.localGames, g = L.g; if (g && g.left > 0 && !g.flying.some((f) => f.y > 120)) { const T = g.t + 108 / 80, gx = 160 + Math.sin(T * (1.1 + (6 - g.left) * 0.08)) * 110; if (Math.abs(gx - 160) < 12) L.key('Space'); }`, 0.2); },
  async b13() {   // sunset, a long low pass
    const p = await open('time=0.76');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.76); g.teleport(-160, 120, 1.7); g.ship.trim = 1; });
    await warm(p, 2);
    await capture(p, 'b13', FR(2), ORBIT(4.4, 5.3, 12, 9, 3.0, 2.0, 2.2, 4, 5));
    await p.close();
  },
  async b9() {   // inside the hut: the die is thrown
    const p = await open('time=0.86', '#mate, #toasts, #hud { display: none !important; }');
    await p.evaluate(() => { const g = window.__game, d = g.world.hutDesc; g.setTime(0.86); g.setDread(0.6); g.state.goals.started = true; g.state.goals.i = 18; g.state.story.hutKnown = true;
      const a = Math.atan2(d.z, d.x) + Math.PI; g.teleport(d.x + Math.cos(a) * (d.r + 10), d.z + Math.sin(a) * (d.r + 10), 0); g.ship.speed = 0; });
    await warm(p, 3);
    await p.evaluate(() => window.__game.openModal('hut'));
    await warm(p, 1.0);
    await capture(p, 'b9', FR(2.5), `if (i === 18) { try { window.__game.hut.roll(); } catch (e) {} }`);
    await p.close();
  },

  async a1() {   // dawn, the ship alone on a gold sea, the camera drifts in from high
    const p = await open('time=0.27');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.27); g.weather.force = { cloud: 0.15, rain: 0, storm: 0, fog: 0.25 }; g.teleport(150, 60, -2.2); g.ship.trim = 0.6; });
    await warm(p, 2);
    await capture(p, 'a1', 149, `const g = window.__game, k = i / n, P = g.ship.pos, h = g.ship.heading; g.ship.speed = 3.5; g.setOverride({ pos: [P.x + Math.sin(h + 2.4) * (26 - 12 * k), 13 - 9 * k, P.z - Math.cos(h + 2.4) * (26 - 12 * k)], look: [P.x, 1.6, P.z] });`);
    await p.close();
  },
  async a2() {   // Tama: lighthouse, roofs, the pier
    const p = await open('time=0.36');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.36); g.teleport(55, -52, 2.5); g.ship.trim = 1; });
    await warm(p, 1);
    await capture(p, 'a2', 149, `const g = window.__game; g.ship.speed = 4; g.ship.trim = 1; const k = i / n; g.setOverride({ pos: [92 - 54 * k, 3.2 + 1.2 * k, -42 - 20 * k], look: [2 + 4 * k, 7.5, -118] });`);
    await p.close();
  },
  async a3_unused() {   // the harbour board: Perrin's letter, marked
    const p = await open('time=0.42', '#mate, #toasts { display: none !important; }');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.42); g.state.goals.started = true; g.state.goals.i = 1; g.state.story.onbAll = true; g.ship.speed = 0; });
    await warm(p, 0.5);
    await p.keyboard.press('KeyE'); await warm(p, 0.4);
    await p.evaluate(() => { if (document.getElementById('greet').classList.contains('open')) document.getElementById('greet').click(); });
    await warm(p, 1.2);
    await capture(p, 'a3', 73, '');
    await p.close();
  },
  async a4() {   // the bite ring
    const p = await open('time=0.6', '#mate, #toasts, #tracker { display: none !important; }');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.6); g.state.goals.started = true; g.state.goals.i = 9; g.teleport(140, 40, -1.0); g.ship.speed = 0; g.ship.trim = 0; });
    await warm(p, 1);
    await p.evaluate(() => { const f = window.__game.fishing; f.start(); });
    await warm(p, 0.4);
    await p.evaluate(() => { const f = window.__game.fishing; f.power = 0.6; f.cast(); });
    await warm(p, 1.2);
    await p.evaluate(() => { const f = window.__game.fishing; f.timer = 99; });
    await warm(p, 0.15);
    await p.evaluate(() => { const f = window.__game.fishing; if (f.mode === 'bite') f.press(true); });
    await warm(p, 0.3);
    await capture(p, 'a4', 77, `const f = window.__game.fishing; window.__ls = window.__ls || -99;
      if (f.mode === 'reel' && i - window.__ls > 14) { const D = (a, b) => { let d = (a - b) % 6.2832; if (d > 3.1416) d -= 6.2832; if (d < -3.1416) d += 6.2832; return d; };
        if (f.zones.some((z) => Math.abs(D(f.a, z.a0 + z.len / 2)) < z.len * 0.2)) { f.meter = Math.min(0.9, f.meter); f.strike(); window.__ls = i; } }`);
    await p.close();
  },
  async a5() {   // probing the shore
    const p = await open('time=0.5', '#mate, #toasts, #tracker { display: none !important; } #digui { width: 600px !important; bottom: 120px !important; } #digcv { max-width: 560px !important; } #digmsg { font-size: 19px !important; }');
    await p.evaluate(() => { const g = window.__game, d = g.world.desc(1, -1); g.setTime(0.5); g.state.goals.started = true; g.state.goals.i = 2; g.state.riddles[d.id] = { text: 'x' }; g.state.halves = {}; const a = d.puzzle.angle, R = d.r + 6; g.teleport(d.x + Math.cos(a) * R, d.z + Math.sin(a) * R, a + 1.57); g.ship.speed = 0; g.ship.trim = 0; });
    await warm(p, 1.5);
    await p.keyboard.press('KeyE'); await warm(p, 0.3);
    const plan = await p.evaluate(() => { const G = window.__game.digGame; if (!G.active) return null; const path = [];
      for (const want of [6, 4, 2, 1, 0]) { let best = null, bd = 99; for (let y = 0; y < G.rows; y++) for (let x = 0; x < G.cols; x++) { const c = G.cells[y * G.cols + x]; if (c.stone || c.lie || path.some((q) => q[0] === x && q[1] === y)) continue; const e = Math.abs(G.dist(x, y) - want); if (e < bd) { bd = e; best = [x, y]; } } path.push(best); }
      return path; });
    await capture(p, 'a5', 77, `const G = window.__game.digGame, plan = ${JSON.stringify(plan)}; const k = Math.floor(i / 13);
      if (G.active && plan && i % 13 === 6 && plan[k]) { G.cx = plan[k][0]; G.cy = plan[k][1]; G.draw(); }
      if (G.active && plan && i % 13 === 12 && plan[k]) G.press();`);
    await p.close();
  },
  async a6() {   // full sail at noon, a low orbit
    const p = await open('time=0.47');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.47); g.teleport(120, 20, -2.4); g.ship.trim = 1; });
    await warm(p, 1.5);
    await capture(p, 'a6', 77, ORBIT(1.2, 1.9, 10, 8, 2.6, 2.2));
    await p.close();
  },
  async a7() {   // night, the lantern
    const p = await open('time=0.95');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.95); g.teleport(-70, 60, -1.0); g.ship.trim = 1; g.state.goals.i = 8; });
    await warm(p, 1.5);
    await capture(p, 'a7', 149, ORBIT(1.0, 2.1, 10, 7.5, 2.6, 1.9, 2.3));
    await p.close();
  },
  async a8() {   // the storm
    const p = await open('time=0.46');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.46); g.weather.force = { cloud: 1, rain: 1, storm: 0.95, fog: 0.15, calm: 0 }; Object.assign(g.weather, { cloud: 1, rain: 1, storm: 0.95 }); g.teleport(130, 90, -2.0); g.ship.trim = 1; });
    await warm(p, 5);
    await capture(p, 'a8', 149, ORBIT(0.2, 1.4, 9, 8, 2.2, 2.0, 2.2) + ' if (i === 40 || i === 112) { window.__game.weather.flash = 1; window.__game.weather.flashQueue = 1; }');
    await p.close();
  },
  async a9() {   // grey skies: dread is rising, the sea forgets its colour
    const p = await open('time=0.55');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.55); g.setDread(0.42); g.weather.force = { cloud: 0.6, rain: 0, storm: 0, fog: 0.45 }; g.teleport(-420, 500, 0.8); g.ship.trim = 1; });
    await warm(p, 6);
    await capture(p, 'a9', 149, ORBIT(2.6, 3.5, 13, 9, 4.2, 2.4, 2.2, 6, 4.5));
    await p.close();
  },
  async a10() {   // the hut's island at dusk, murky water, sailing in
    const p = await open('time=0.79');
    await p.evaluate(() => { const g = window.__game, d = g.world.hutDesc; g.setTime(0.79); g.setDread(0.6); g.state.goals.started = true; g.state.goals.i = 18; g.state.story.hutKnown = true;
      const a = Math.atan2(d.z, d.x) + Math.PI; g.teleport(d.x + Math.cos(a) * (d.r + 75), d.z + Math.sin(a) * (d.r + 75), Math.atan2(-Math.cos(a), Math.sin(a)) + Math.PI); g.ship.trim = 0.5; window.__hut = { x: d.x, z: d.z, a }; });
    await warm(p, 5);
    await capture(p, 'a10', 295, `const g = window.__game, H = window.__hut, d = g.world.hutDesc, hp = d.hutPos || { x: 0, z: 0, y: 3 }, k = i / n; g.ship.speed = 3.2;
      const tx = H.x + hp.x, tz = H.z + hp.z, P = g.ship.pos, dx = tx - P.x, dz = tz - P.z, L = Math.hypot(dx, dz);
      g.ship.heading = Math.atan2(dx, -dz);
      g.setOverride({ pos: [P.x - dx / L * (9 - 3 * k) + dz / L * 3, 3.6 - 1.2 * k, P.z - dz / L * (9 - 3 * k) - dx / L * 3], look: [tx, (hp.y || 3) + 2, tz] });`);
    await p.close();
  },
  async a11_unused() {   // a glimpse of the deep
    const p = await open('time=0.5');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.5); g.setDread(0.97); g.teleport(-600, 700, 1.2); g.ship.trim = 1; });
    await warm(p, 7);
    await capture(p, 'a11', 40, ORBIT(0.4, 0.7, 11, 10, 3.0, 2.6, 2.6));
    await p.close();
  },
  async a12() {   // the hut, close: the purple window
    const p = await open('time=0.82');
    await p.evaluate(() => { const g = window.__game, d = g.world.hutDesc; g.setTime(0.82); g.setDread(0.6); g.state.goals.i = 18; g.state.story.hutKnown = true;
      const a = Math.atan2(d.z, d.x) + Math.PI; g.teleport(d.x + Math.cos(a) * (d.r + 30), d.z + Math.sin(a) * (d.r + 30), 0); g.ship.speed = 0; g.ship.trim = 0; });
    await warm(p, 5);
    await capture(p, 'a12', 149, `const g = window.__game, d = g.world.hutDesc, hp = d.hutPos, k = i / n, hx = d.x + hp.x, hz = d.z + hp.z, a = hp.th + 0.25;
      g.setOverride({ pos: [hx + Math.cos(a) * (12 - 4 * k), hp.y + 3.2 - 0.6 * k, hz + Math.sin(a) * (12 - 4 * k)], look: [hx, hp.y + 2.2, hz] });`);
    await p.close();
  },
};
for (const k of Object.keys(S)) if (!k.includes('unused') && (!only.length || only.includes(k))) { console.log('==', k); await S[k](); }
await b.close();
