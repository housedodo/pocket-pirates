// Scripted playthrough of the world rules (docs/WORLD_REDESIGN.md), headless: sail the ship at each stratum wall and check what holds it and what lets it through.
//   npx vite --port 5173 --host 127.0.0.1 &   then   NODE_PATH=$(npm root -g) node scripts/world_checks.cjs [url]
const { chromium } = require('playwright');
const URL = process.argv[2] || 'http://127.0.0.1:5173';
const res = []; const rec = (n, ok, note) => { res.push(ok); console.log(`${ok ? 'PASS' : 'FAIL'}  ${n}  ${note || ''}`); };
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 270 } }); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${URL}/?autostart=1&fresh=1&nomate=1&shot=1`); await p.waitForTimeout(4000);
  // drive the ship outward along a bearing from just inside radius r0 for `secs` seconds; returns the furthest radius reached
  const drive = (r0, ang, secs, setup) => p.evaluate(async ([r0, ang, secs, setup]) => {
    const g = window.__game, st = g.state; Object.assign(st.upgrades, setup.up || {}); st.goals.i = setup.goals ?? 30; st.story.free = false; st.story.reach = setup.reach ?? 0; st.story.seen = setup.seen || {};
    if (setup.time !== undefined) g.setTime(setup.time); if (setup.day !== undefined) st.dayN = setup.day; g.setDread(0.3);
    const a = ang * Math.PI / 180; g.ship.pos.x = Math.cos(a) * r0; g.ship.pos.z = Math.sin(a) * r0; g.ship.heading = Math.atan2(Math.cos(a), -Math.sin(a));
    let max = 0; const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) { g.ship.speed = 9; g.ship.heading = Math.atan2(Math.cos(a), -Math.sin(a)); await new Promise((r) => setTimeout(r, 80)); max = Math.max(max, Math.hypot(g.ship.pos.x, g.ship.pos.z)); }
    return { max: Math.round(max), gate: Math.round(g.gateRadius()) };
  }, [r0, ang, secs, setup]);
  const wall = async (name, r0, wallR, setup, holds) => {
    const r = await drive(r0, 200, holds ? 9 : 16, setup);   // the ship makes about 8 units/s: long enough to pass the wall by 60 if it lets you
    rec(name, holds ? r.max < wallR + 60 : r.max > wallR + 60, `gate ${r.gate}, furthest ${r.max}`);
  };
  // the tutorial wall, then each stratum edge shut and open
  await wall('tutorial holds the ship at Home Sound', 400, 430, { goals: 0 }, true);
  await wall('S1 wall holds with no rudder and no chart', 420, 450, {}, true);
  await wall('S1 opens with a broad rudder', 420, 450, { up: { rudder: 2 } }, false);
  await wall('S2 wall holds without lantern/hull', 770, 800, { up: { rudder: 2 }, reach: 700 }, true);
  await wall('S2 opens with lantern 1 + hull 2', 770, 800, { up: { rudder: 2, lantern: 1, hull: 2 }, reach: 700 }, false);
  await wall('S3 wall holds without lens lantern', 1120, 1150, { up: { rudder: 2, lantern: 1, hull: 2 }, reach: 1000 }, true);
  await wall('S3 opens with lantern 2', 1120, 1150, { up: { rudder: 2, lantern: 2, hull: 2 }, reach: 1000 }, false);
  await wall('S4 wall holds with hull 2 (no hull/sails 3)', 1520, 1550, { up: { rudder: 2, lantern: 2, hull: 2 }, reach: 1300 }, true);
  await wall('S5 wall holds with no clues seen', 1920, 1950, { up: { rudder: 2, lantern: 2, hull: 3, sails: 3 }, reach: 1600 }, true);
  await wall('S5 opens once three regions are read', 1920, 1950, { up: { rudder: 2, lantern: 2, hull: 3, sails: 3 }, reach: 1600, seen: { 'CL-C3-a': 1, 'CL-C1-a': 1, 'CL-F1-a': 1 } }, false);
  // the way home is longer than the way out (the Slack): time to cross 1300 -> 1500 outward vs inward at the same speed
  const t = await p.evaluate(async () => { const g = window.__game, st = g.state; st.story.free = true; g.setDread(0.5);
    const run = async (from, to) => { g.ship.pos.x = from; g.ship.pos.z = 0; const t0 = performance.now(); while (performance.now() - t0 < 80000) { g.ship.speed = 9; g.ship.heading = to > from ? Math.PI / 2 : -Math.PI / 2; await new Promise((r) => setTimeout(r, 60)); if (to > from ? g.ship.pos.x >= to : g.ship.pos.x <= to) break; } return (performance.now() - t0) / 1000; };
    const out = await run(1300, 1450), back = await run(1450, 1300); return { out, back }; });
  rec('the way home is longer than the way out (>= 1.2x)', t.back / t.out >= 1.2, `out ${t.out.toFixed(1)} s, back ${t.back.toFixed(1)} s, ratio ${(t.back / t.out).toFixed(2)}`);
  rec('no console errors', errs.length === 0, errs.slice(0, 2).join(' | '));
  console.log(`\n${res.filter(Boolean).length}/${res.length} passed`); await b.close(); process.exit(res.every(Boolean) ? 0 : 1);
})();
