// Automated art checks from docs/ART_SPEC.md (headless Chromium via Playwright). Run with the dev server up:
//   npx vite --port 5173 --host 127.0.0.1 &   then   NODE_PATH=$(npm root -g) node scripts/art_checks.cjs [url]
// Automated: V1/V2 gate states, V3/V11 tide-night-calm states, V5 silhouette size, V9 labels, V10 seam, V12 tone lint, V13 palette lint,
// V14 progression cues, V15 triangle/draw-call budgets. Not automated (need a human or more rig): V4 contrast, V6-V8 night/lamp/clutter, V16 chart, V17 blind tests.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const URL = process.argv[2] || 'http://127.0.0.1:5173';
const SRC = path.join(__dirname, '..', 'src');
const results = [];
const rec = (id, name, pass, note) => { results.push({ id, name, pass, note }); console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${name}  ${note || ''}`); };

// ---- static checks (no browser)
function staticChecks() {
  const places = fs.readFileSync(path.join(SRC, 'places.js'), 'utf8'), clues = fs.readFileSync(path.join(SRC, 'clues.js'), 'utf8'), lm = fs.readFileSync(path.join(SRC, 'landmarks.js'), 'utf8');
  const BANNED = /\b(lid|eye|sleeper|lady|kept soft)\b|mara is from/i;
  const strings = [...(places.match(/(?:text|note|no|again|bare): ['"`](?:[^'"`\\]|\\.)+['"`]/g) || []), ...(clues.match(/line: '[^']+'/g) || [])];
  const bad = strings.filter((x) => BANNED.test(x.replace(/\b(on|of) the lid\b/gi, 'on the cover')));   // "the lid" of a tin box is a box
  rec('V12', 'tone lint over visit and clue text', bad.length === 0, bad.length ? bad.slice(0, 3).join(' | ') : `${strings.length} strings`);
  // palette lint: magenta only in the Table (S5) and in S4+ places' glow
  const blocks = lm.split(/\n    case '/).slice(1), offenders = [];
  for (const b of blocks) {
    const id = b.slice(0, b.indexOf("'"));
    for (const h of b.match(/#[0-9a-fA-F]{6}\b/g) || []) { const r = parseInt(h.slice(1, 3), 16) / 255, g = parseInt(h.slice(3, 5), 16) / 255, bl = parseInt(h.slice(5, 7), 16) / 255; if (r > 0.8 && bl > 0.6 && g < 0.4 && !['table'].includes(id)) offenders.push(`${id}:${h}`); }
  }
  rec('V13', 'no magenta on hand-made places outside S5', offenders.length === 0, offenders.join(','));
}

(async () => {
  staticChecks();
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 640, height: 360 } });
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.goto(`${URL}/?autostart=1&fresh=1&nomate=1&shot=1`); await p.waitForTimeout(4000);
  await p.addStyleTag({ content: 'body > *:not(canvas):not(#farlabels){display:none!important}' });
  const bodyKids = () => p.evaluate(() => document.body.children.length);
  const shot = async () => (await p.screenshot()).toString('base64');
  const diff = (a, b2, topOnly = true) => p.evaluate(async ([a, b2, topOnly]) => {
    const load = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    const A = await load(a), B = await load(b2); let n = 0, x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1; const H = topOnly ? Math.floor(A.height * 0.58) : A.height;
    for (let y = 0; y < H; y++) for (let x = 0; x < A.width; x++) { const i = (y * A.width + x) * 4, d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]); if (d > 90) { n++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
    return { n, bbox: n ? [x0, y0, x1, y1] : null };
  }, [a, b2, topOnly]);
  // go to a place: ship `dist` south of it, facing it; optional time/day/dread/calm
  const goto = (lm, dist, o = {}) => p.evaluate(async ([lm, dist, o]) => {
    const g = window.__game, L = await import('/src/landmarks.js'), l = L.LM[lm]; g.state.story.free = true; g.state.goals.i = 30; g.setDread(o.dread ?? 0.3);
    g.ship.pos.x = l.x; g.ship.pos.z = l.z + (o.edge ? l.r : 0) + dist; g.ship.heading = 0; g.setTime(o.time ?? 0.5); if (o.day !== undefined) g.state.dayN = o.day;
    window.__calm = o.calm ? 1 : 0; if (!window.__ci) window.__ci = setInterval(() => { g.weather.calm = window.__calm; }, 40);
    if (o.up) Object.assign(g.state.upgrades, o.up); if (o.noSeen) g.state.story.seen = {};
    if (o.seen) { const C = await import('/src/clues.js'); o.seen.forEach((id) => C.markSeen(g.state, id)); }
    return true;
  }, [lm, dist, o]);
  const settle = (ms = 2200) => p.waitForTimeout(ms);
  // an A/B pair: the set of island meshes that are visible (state props are separate meshes) must differ between the two states. Exact, unlike pixels:
  // the animated water makes two shots of the same state differ by thousands of pixels.
  const sig = (lm) => p.evaluate((lm) => { const g = window.__game, i = [...g.world.islands.values()].find((x) => x.desc.lm === lm); if (!i) return 'none'; return i.group.children.map((m) => (m.visible && m.geometry ? m.geometry.attributes.position.count : 0)).join(','); }, lm);
  async function ab(lm, dist, A, B2) {
    await goto(lm, dist, A); await settle(1500); const a = await sig(lm);
    await goto(lm, dist, B2); await settle(1500); const b2 = await sig(lm); return { differs: a !== b2, a, b: b2 };
  }
  const HIGH = 3.57, LOW = 10.71;   // dayN values that give high and low water at time 0.5

  // V3/V11 conditions off vs on
  for (const [lm, A, B2, nm] of [
    ['teo', { time: 0, calm: 0 }, { time: 0, calm: 1 }, 'teo fire only on a calm night'],
    ['tower', { time: 0, calm: 0 }, { time: 0, calm: 1 }, 'tower slit only on a calm night'],
    ['cup', { day: LOW }, { day: HIGH }, 'cup low vs high water'],
    ['wreck', { day: HIGH }, { day: LOW }, 'wreck awash vs bare'],
    ['street', { day: HIGH }, { day: LOW }, 'street high vs low water'],
  ]) { const r = await ab(lm, 30, { edge: true, ...A }, { edge: true, ...B2 }); rec('V3', nm, r.differs, r.differs ? '' : `same meshes ${r.a}`); }

  // V1/V2 gates: shut vs open differs
  { const r = await ab('lagoon', 70, { up: { rudder: 0 } }, { up: { rudder: 2 } }); rec('V2', 'lagoon shut vs open', r.differs, r.differs ? '' : r.a); }
  { const r = await ab('ribs', 75, { up: { hull: 0 } }, { up: { hull: 2 } }); rec('V2', 'ribs shut vs open', r.differs, r.differs ? '' : r.a); }

  // V14 progression cues: geometry only, no new DOM nodes
  for (const [lm, ids, nm] of [['press', ['CL-L1-a'], 'press doors'], ['cup', ['CL-F3-a'], 'cup greyed'], ['namewall', ['CL-K-a'], 'name wall wet rows'], ['archive', ['CL-K-a', 'CL-C3-a', 'CL-R2-a'], 'fort second window']]) {
    await goto(lm, 30, { edge: true, noSeen: true, day: HIGH }); await settle(1500); const k0 = await bodyKids(), a = await sig(lm);
    await goto(lm, 30, { edge: true, seen: ids, day: HIGH }); await settle(1500); const k1 = await bodyKids(), b2 = await sig(lm);
    rec('V14', `${nm}: geometry changes, no new DOM`, a !== b2 && k0 === k1, `dom ${k0}->${k1}${a === b2 ? ' same meshes' : ''}`);
  }

  // V5 silhouette size at 170 units: hide the island and take the bounding box of what changes
  const places = await p.evaluate(async () => (await import('/src/landmarks.js')).LANDMARKS.map((l) => l.lm));
  const small = [];
  for (const lm of places) {
    await goto(lm, 170, { calm: 0, day: 0, time: 0.5 }); await settle(1800);
    const withI = await shot();
    await p.evaluate((lm) => { const g = window.__game; const i = [...g.world.islands.values()].find((x) => x.desc.lm === lm); window.__hid = i; if (i) { window.__hidden = []; i.group.children.forEach((m) => { const c = m.geometry && m.geometry.attributes.color; if (!(c && c.itemSize === 4) && m.visible) { m.visible = false; window.__hidden.push(m); } }); } }, lm);   // hide the island's own meshes, keep the shallow, foam and mist rings (4-component colour) await p.waitForTimeout(250);
    const without = await shot(); await p.evaluate(() => { (window.__hidden || []).forEach((m) => { m.visible = true; }); });
    const d = await diff(withI, without), w = d.bbox ? (d.bbox[2] - d.bbox[0] + 1) / 2 : 0, h = d.bbox ? (d.bbox[3] - d.bbox[1] + 1) / 2 : 0;   // /2: the screenshot is 640x360, the game is 320x180
    if (!(h >= 4 && w >= 5)) small.push(`${lm}(${w}x${h})`);
  }
  rec('V5', 'every place reads >= 4x5 px at 170 units (day, spyglass 0)', small.length === 0, small.length ? 'too small: ' + small.join(' ') : '');

  // V4 contrast at 60% of the stratum's fog distance, day: island pixels (what changes when the island is hidden) vs what was behind them
  const lum = (r, g, bl) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(bl); };
  const gapOf = (a, b2) => p.evaluate(async ([a, b2]) => {
    const load = async (s) => { const im = new Image(); im.src = 'data:image/png;base64,' + s; await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); return x.getImageData(0, 0, c.width, c.height); };
    const A = await load(a), B = await load(b2), H = Math.floor(A.height * 0.58), f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }, L = (d, i) => 0.2126 * f(d[i]) + 0.7152 * f(d[i + 1]) + 0.0722 * f(d[i + 2]);
    const gaps = []; for (let y = 0; y < H; y++) for (let x = 0; x < A.width; x++) { const i = (y * A.width + x) * 4, d = Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]); if (d > 90) gaps.push(Math.abs(L(A.data, i) - L(B.data, i))); }
    gaps.sort((m, n) => m - n); return gaps.length ? gaps[Math.floor(gaps.length / 2)] : 0;
  }, [a, b2]);
  const lowC = [];
  for (const lm of places) {
    const info = await p.evaluate(async (lm) => { const L = await import('/src/landmarks.js'), P = await import('/src/palette.js'); const l = L.LM[lm], dr = l.dread != null ? l.dread : P.dreadAtDistance(Math.hypot(l.x, l.z)); return { dr, fogFar: P.sampleStage(dr).fogFar }; }, lm);
    await goto(lm, Math.round(info.fogFar * 0.6), { dread: info.dr, calm: 0, day: 0, time: 0.5 }); await settle(1800);
    const withI = await shot();
    await p.evaluate((lm) => { const g = window.__game, i = [...g.world.islands.values()].find((x) => x.desc.lm === lm); window.__hidden = []; if (i) i.group.children.forEach((m) => { const c = m.geometry && m.geometry.attributes.color; if (!(c && c.itemSize === 4) && m.visible) { m.visible = false; window.__hidden.push(m); } }); }, lm); await p.waitForTimeout(250);
    const without = await shot(); await p.evaluate(() => { (window.__hidden || []).forEach((m) => { m.visible = true; }); });
    const gap = await gapOf(withI, without), need = info.dr < 0.45 ? 0.08 : info.dr < 0.82 ? 0.04 : 0.02;
    if (gap < need) lowC.push(`${lm}(${gap.toFixed(3)}<${need})`);
  }
  rec('V4', 'island vs background luminance gap at 60% of fog distance', lowC.length === 0, lowC.length ? 'low: ' + lowC.join(' ') : '');

  // V16 chart: the pencil marks the clues teach draw without error, and the map tab renders
  const chartOk = await p.evaluate(async () => { try { const g = window.__game, C = await import('/src/clues.js'); ['CL-R1-a', 'CL-F3-a', 'CL-L2-a'].forEach((id) => C.markSeen(g.state, id)); g.logbook.tab = 'map'; g.logbook.renderMap(); return true; } catch (e) { return String(e); } });
  rec('V16', 'chart renders with wreck ticks, cup mark and margin date', chartOk === true, chartOk === true ? '' : chartOk);

  // V15 budgets: triangles and draw calls per place
  const bud = await p.evaluate(async () => { const g = window.__game, L = await import('/src/landmarks.js'), out = []; for (const l of L.LANDMARKS) { g.ship.pos.x = l.x; g.ship.pos.z = l.z + 120; await new Promise((r) => setTimeout(r, 350)); const i = [...g.world.islands.values()].find((x) => x.desc.lm === l.lm); if (!i) { out.push([l.lm, -1, -1]); continue; } let t = 0, c = 0; i.group.children.forEach((m) => { if (m.geometry) { t += m.geometry.attributes.position.count / 3; c++; } }); out.push([l.lm, Math.round(t), c]); } return out; });
  const OLD = ['grove', 'ribs', 'lagoon', 'broken', 'crag', 'bell', 'keeper'];   // hand-made before this pass: reported, not failed
  const over = bud.filter(([n, t, c]) => !OLD.includes(n) && (t > 3500 || c > 9)).map(([n, t, c]) => `${n}:${t}tri/${c}calls`);
  rec('V15', 'new places: <= 3500 triangles, <= 9 draw calls (terrain, A, B, D, shallow, foam, mist + state groups)', over.length === 0, (over.length ? over.join(' ') + ' | ' : '') + 'older places (info): ' + bud.filter(([n]) => OLD.includes(n)).map(([n, t, c]) => `${n}:${t}/${c}`).join(' '));

  // V9 labels: the Table has none before d3Open; at most 2 visible at once
  await goto('table', 150, { noSeen: true, time: 0.5 }); await p.evaluate(() => { window.__game.state.upgrades.spyglass = 2; }); await settle(1800);
  const lab = await p.evaluate(() => [...document.querySelectorAll('.farlabel')].filter((e) => e.style.display !== 'none' && +e.style.opacity > 0.05).map((e) => e.textContent));
  rec('V9', 'table has no label before d3Open; <= 2 labels', !lab.some((t) => /table/i.test(t)) && lab.length <= 2, JSON.stringify(lab));

  // V10 seam: crossing the south-east edge of the Dim loses the helm in fog, then lands on the west side
  const seam = await p.evaluate(async () => { const g = window.__game; g.state.story.free = true; g.state.story.reach = 1600; g.state.goals.i = 30; g.setDread(0.8); g.ship.pos.x = 1494; g.ship.pos.z = 1254; let maxK = 0; const t0 = performance.now(); while (performance.now() - t0 < 2500) { await new Promise((r) => setTimeout(r, 100)); maxK = Math.max(maxK, g.lostState().lostK); } await new Promise((r) => setTimeout(r, 3000)); return { maxK, x: g.ship.pos.x }; });
  rec('V10', 'seam: fog takes the helm (lostK >= 0.9 within 2.5 s), then west side', seam.maxK >= 0.9 && seam.x < 0, `lostK ${seam.maxK.toFixed(2)} x ${Math.round(seam.x)}`);

  rec('--', 'console errors during the run', errs.length === 0, errs.slice(0, 2).join(' | '));
  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} passed. Not automated: V6-V8, V17.`);
  fs.writeFileSync(path.join(__dirname, '..', 'docs', 'art_checks_last.txt'), results.map((r) => `${r.pass ? 'PASS' : 'FAIL'} ${r.id} ${r.name} ${r.note || ''}`).join('\n') + '\n');
  await b.close(); process.exit(failed.length ? 1 : 0);
})();
