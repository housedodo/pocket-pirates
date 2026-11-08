import { launch, openGame, warm, capture } from './lib.mjs';
const only = process.argv.slice(2);
const b = await launch();
const HIDE = '#hud, #mate, #prompt, #placeline { display: none !important; }';
const ORBIT = (a0, a1, r0, r1, h0, h1, lookY = 2.4, lead = 3, spd = 5.5) => `const g = window.__game; g.ship.speed = ${spd}; g.ship.trim = 1; const k = i / n, a = ${a0} + (${a1} - ${a0}) * k, r = ${r0} + (${r1} - ${r0}) * k, hh = ${h0} + (${h1} - ${h0}) * k, h = g.ship.heading, P = g.ship.pos; g.setOverride({ pos: [P.x + Math.sin(a) * r, hh, P.z - Math.cos(a) * r], look: [P.x + Math.sin(h) * ${lead}, ${lookY}, P.z - Math.cos(h) * ${lead}] });`;
const open = async (q, css = HIDE) => { const p = await openGame(b, `autostart=1&fresh=1&nomate=1&${q}`); await p.addStyleTag({ content: css }); return p; };
const S = {
  async a1() {   // dawn, the ship alone on a gold sea, the camera drifts in from high
    const p = await open('time=0.27');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.27); g.weather.force = { cloud: 0.15, rain: 0, storm: 0, fog: 0.25 }; g.teleport(150, 60, -2.2); g.ship.trim = 0.6; });
    await warm(p, 2);
    await capture(p, 'a1', 145, `const g = window.__game, k = i / n, P = g.ship.pos, h = g.ship.heading; g.ship.speed = 3.5; g.setOverride({ pos: [P.x + Math.sin(h + 2.4) * (26 - 12 * k), 13 - 9 * k, P.z - Math.cos(h + 2.4) * (26 - 12 * k)], look: [P.x, 1.6, P.z] });`);
    await p.close();
  },
  async a2() {   // Tama: lighthouse, roofs, the pier
    const p = await open('time=0.36');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.36); g.teleport(55, -52, 2.5); g.ship.trim = 1; });
    await warm(p, 1);
    await capture(p, 'a2', 145, `const g = window.__game; g.ship.speed = 4; g.ship.trim = 1; const k = i / n; g.setOverride({ pos: [92 - 54 * k, 3.2 + 1.2 * k, -42 - 20 * k], look: [2 + 4 * k, 7.5, -118] });`);
    await p.close();
  },
  async a3() {   // the harbour board: Perrin's letter, marked
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
    await capture(p, 'a4', 73, `const f = window.__game.fishing; window.__ls = window.__ls || -99;
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
    await capture(p, 'a5', 73, `const G = window.__game.digGame, plan = ${JSON.stringify(plan)}; const k = Math.floor(i / 13);
      if (G.active && plan && i % 13 === 6 && plan[k]) { G.cx = plan[k][0]; G.cy = plan[k][1]; G.draw(); }
      if (G.active && plan && i % 13 === 12 && plan[k]) G.press();`);
    await p.close();
  },
  async a6() {   // full sail at noon, a low orbit
    const p = await open('time=0.47');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.47); g.teleport(120, 20, -2.4); g.ship.trim = 1; });
    await warm(p, 1.5);
    await capture(p, 'a6', 73, ORBIT(1.2, 1.9, 10, 8, 2.6, 2.2));
    await p.close();
  },
  async a7() {   // night, the lantern
    const p = await open('time=0.95');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.95); g.teleport(-70, 60, -1.0); g.ship.trim = 1; g.state.goals.i = 8; });
    await warm(p, 1.5);
    await capture(p, 'a7', 145, ORBIT(1.0, 2.1, 10, 7.5, 2.6, 1.9, 2.3));
    await p.close();
  },
  async a8() {   // the storm
    const p = await open('time=0.46');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.46); g.weather.force = { cloud: 1, rain: 1, storm: 0.95, fog: 0.15, calm: 0 }; Object.assign(g.weather, { cloud: 1, rain: 1, storm: 0.95 }); g.teleport(130, 90, -2.0); g.ship.trim = 1; });
    await warm(p, 5);
    await capture(p, 'a8', 145, ORBIT(0.2, 1.4, 9, 8, 2.2, 2.0, 2.2) + ' if (i === 40 || i === 112) { window.__game.weather.flash = 1; window.__game.weather.flashQueue = 1; }');
    await p.close();
  },
  async a9() {   // grey skies: dread is rising, the sea forgets its colour
    const p = await open('time=0.55');
    await p.evaluate(() => { const g = window.__game; g.setTime(0.55); g.setDread(0.42); g.weather.force = { cloud: 0.6, rain: 0, storm: 0, fog: 0.45 }; g.teleport(-420, 500, 0.8); g.ship.trim = 1; });
    await warm(p, 6);
    await capture(p, 'a9', 145, ORBIT(2.6, 3.5, 13, 9, 4.2, 2.4, 2.2, 6, 4.5));
    await p.close();
  },
  async a10() {   // the hut's island at dusk, murky water, sailing in
    const p = await open('time=0.79');
    await p.evaluate(() => { const g = window.__game, d = g.world.hutDesc; g.setTime(0.79); g.setDread(0.6); g.state.goals.started = true; g.state.goals.i = 18; g.state.story.hutKnown = true;
      const a = Math.atan2(d.z, d.x) + Math.PI; g.teleport(d.x + Math.cos(a) * (d.r + 75), d.z + Math.sin(a) * (d.r + 75), Math.atan2(-Math.cos(a), Math.sin(a)) + Math.PI); g.ship.trim = 0.5; window.__hut = { x: d.x, z: d.z, a }; });
    await warm(p, 5);
    await capture(p, 'a10', 218, `const g = window.__game, H = window.__hut, d = g.world.hutDesc, hp = d.hutPos || { x: 0, z: 0, y: 3 }, k = i / n; g.ship.speed = 3.2;
      const tx = H.x + hp.x, tz = H.z + hp.z, P = g.ship.pos, dx = tx - P.x, dz = tz - P.z, L = Math.hypot(dx, dz);
      g.ship.heading = Math.atan2(dx, -dz);
      g.setOverride({ pos: [P.x - dx / L * (9 - 3 * k) + dz / L * 3, 3.6 - 1.2 * k, P.z - dz / L * (9 - 3 * k) - dx / L * 3], look: [tx, (hp.y || 3) + 2, tz] });`);
    await p.close();
  },
  async a11() {   // a glimpse of the deep
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
    await capture(p, 'a12', 60, `const g = window.__game, d = g.world.hutDesc, hp = d.hutPos, k = i / n, hx = d.x + hp.x, hz = d.z + hp.z, a = hp.th + 0.25;
      g.setOverride({ pos: [hx + Math.cos(a) * (12 - 4 * k), hp.y + 3.2 - 0.6 * k, hz + Math.sin(a) * (12 - 4 * k)], look: [hx, hp.y + 2.2, hz] });`);
    await p.close();
  },
};
for (const k of Object.keys(S)) if (!only.length || only.includes(k)) { console.log('==', k); await S[k](); }
await b.close();
