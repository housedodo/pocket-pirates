import { launch, openGame, warm, capture } from './lib.mjs';
const only = process.argv[2];
const b = await launch();
const HIDE_HUD = '#hud { display: none !important; }';
const ORBIT = (a0, a1, r0, r1, h0, h1, lookY = 2.4, lead = 3) => `const g = window.__game; g.ship.speed = 5.5; g.ship.trim = 1; const k = i / n, a = ${a0} + (${a1} - ${a0}) * k, r = ${r0} + (${r1} - ${r0}) * k, hh = ${h0} + (${h1} - ${h0}) * k, h = g.ship.heading, P = g.ship.pos; g.setOverride({ pos: [P.x + Math.sin(a) * r, hh, P.z - Math.cos(a) * r], look: [P.x + Math.sin(h) * ${lead}, ${lookY}, P.z - Math.cos(h) * ${lead}] });`;
const segs = {
  async s1() {   // the opening shot: down from high over Tama to behind the ship
    const p = await openGame(b, 'autostart=1&fresh=1&intro=1&time=0.31');
    await p.addStyleTag({ content: '#mate, #hud { display: none !important; }' });
    await p.evaluate(() => window.__game.setTime(0.31));
    await capture(p, 's1', 165, '');
    await p.close();
  },
  async s2() {   // full sail, morning, a slow orbit
    const p = await openGame(b, 'autostart=1&fresh=1&nomate=1&time=0.33');
    await p.addStyleTag({ content: HIDE_HUD });
    await p.evaluate(() => { const g = window.__game; g.setTime(0.33); g.teleport(120, 20, -2.4); g.ship.trim = 1; });
    await warm(p, 1.5);
    await capture(p, 's2', 150, ORBIT(0.5, 1.9, 12, 8.5, 3.4, 2.4));
    await p.close();
  },
  async s3() {   // Tama and its lighthouse
    const p = await openGame(b, 'autostart=1&fresh=1&nomate=1&time=0.4');
    await p.addStyleTag({ content: HIDE_HUD });
    await p.evaluate(() => { const g = window.__game; g.setTime(0.4); g.teleport(55, -52, 2.5); g.ship.trim = 1; });
    await warm(p, 1.0);
    await capture(p, 's3', 120, `const g = window.__game; g.ship.speed = 4.2; g.ship.trim = 1; const k = i / n; g.setOverride({ pos: [92 - 54 * k, 3.2 + 1.0 * k, -42 - 20 * k], look: [2 + 4 * k, 7.5, -118] });`);
    await p.close();
  },
  async s4() {   // inside a cave: the choices and the d20
    const p = await openGame(b, 'autostart=1&fresh=1&nomate=1&time=0.5');
    await p.addStyleTag({ content: HIDE_HUD });
    await capture(p, 's4', 165, `
      const g = window.__game, click = (q) => { const el = document.querySelector(q); if (el) el.click(); };
      if (i === 0) { g.state.goals.i = 8; g.openCave({ id: 'cave:trailer', kind: 'grotto', x: 0, z: 0, th: 0 }); }
      if (i === 40) click('#caveChoices button[data-i="0"]');
      if (i === 62) click('#caveChoices button[data-i="0"]');   // swim for the chest: the die
    `);
    await p.close();
  },
  async s5() {   // night, lantern lit, with the HUD
    const p = await openGame(b, 'autostart=1&fresh=1&nomate=1&time=0.94');
    await p.addStyleTag({ content: '#mate { display: none !important; }' });
    await p.evaluate(() => { const g = window.__game; g.setTime(0.94); g.teleport(-70, 60, -1.0); g.ship.trim = 1; g.state.goals.i = 8; });
    await warm(p, 1.5);
    await capture(p, 's5', 120, ORBIT(1.0, 2.0, 9.5, 8, 2.4, 2.0, 2.4));
    await p.close();
  },
  async s6() {   // a squall
    const p = await openGame(b, 'autostart=1&fresh=1&nomate=1&time=0.46');
    await p.addStyleTag({ content: HIDE_HUD });
    await p.evaluate(() => { const g = window.__game; g.setTime(0.46); g.weather.force = { cloud: 1, rain: 1, storm: 0.9, fog: 0.2, calm: 0 }; g.teleport(130, 90, -2.0); g.ship.trim = 1; });
    await warm(p, 4);
    await capture(p, 's6', 90, ORBIT(0.3, 1.2, 9, 8, 2.2, 2.0, 2.2));
    await p.close();
  },
  async s7() {   // dusk, sailing away
    const p = await openGame(b, 'autostart=1&fresh=1&nomate=1&time=0.775');
    await p.addStyleTag({ content: HIDE_HUD });
    await p.evaluate(() => { const g = window.__game; g.setTime(0.775); g.teleport(150, 40, -2.6); g.ship.trim = 1; });
    await warm(p, 1.5);
    await capture(p, 's7', 120, ORBIT(0.3, 0.75, 9, 12, 2.0, 3.6, 3.0, 8));
    await p.close();
  },
};
for (const k of Object.keys(segs)) if (!only || only === k) { console.log('==', k); await segs[k](); }
await b.close();
