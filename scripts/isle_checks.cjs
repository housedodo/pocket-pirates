// Island checks (2026-11-15, isleforms.js; docs/ART_SPEC.md 7 and A13). With the dev server up:
//   npx vite --port 5173 --host 127.0.0.1 &   then   node scripts/isle_checks.cjs [url]
// Rolls the same seas with and without the island looks (?isles=0) and checks the map is not more crowded:
//   - the same islands in the same places (count and cells), never bigger on the water (total area of land within +5%);
//   - rolled islands keep their budget (ART_SPEC 7: <= 2,000 triangles, <= 4 draw calls); the old ones are reported, not failed;
//   - every region leans to its own kinds (for A13: how far each region's mix of kinds is from the others).
// Headless; nothing here judges how it looks. `--blind DIR` also writes the blind-test pictures for A12 and A13 (ART_SPEC V17):
// one rolled island per stratum and one per region, at noon, no HUD, under shuffled names, with the answers in DIR/key.txt.
// Sort them by eye before opening the key (A12 passes at >= 5 of 6, A13 at >= 4 of 5).
const { chromium } = require('playwright');
const URL = (process.argv[2] && !process.argv[2].startsWith('--')) ? process.argv[2] : 'http://127.0.0.1:5173';
const SEEDS = [11, 2024, 90210];
const BLIND = process.argv.includes('--blind') ? process.argv[process.argv.indexOf('--blind') + 1] : null;
let fails = 0;
const rec = (ok, what) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${what}`); if (!ok) fails++; };

async function roll(b, isles) {
  const p = await (await b.newContext({ viewport: { width: 320, height: 200 } })).newPage();
  await p.goto(`${URL}/?isles=${isles}`, { waitUntil: 'load' });
  return p.evaluate(async (SEEDS) => {
    const W = await import('/src/world.js');
    const out = { n: 0, cells: [], area: 0, kinds: {}, forms: {}, tri: [], calls: [] };
    let built = 0;
    for (const seed of SEEDS) for (let cx = -14; cx <= 14; cx++) for (let cz = -14; cz <= 14; cz++) {
      const d = W.describeCell(cx, cz, seed); if (!d) continue;
      out.n++; out.cells.push(`${seed}:${d.id}`);
      let a = 0; for (let k = 0; k < 64; k++) { const R = W.shoreR(d, (k / 64) * Math.PI * 2); a += (R * R) / 2 * (Math.PI * 2 / 64); }
      out.area += a;
      const reg = d.region || 'none'; (out.kinds[reg] = out.kinds[reg] || {})[d.type] = (out.kinds[reg][d.type] || 0) + 1;
      if (d.form) out.forms[`${d.type}:${d.form}`] = (out.forms[`${d.type}:${d.form}`] || 0) + 1;
      if (!d.lm && !d.blight && d.type !== 'harbour' && d.type !== 'treasure' && built < 260 && (cx + cz) % 2 === 0) {   // a sample of the rolled isles
        built++;
        const isl = new W.Island(d, false); let t = 0, c = 0;
        isl.group.traverse((m) => { if (m.isMesh && m.geometry && m.geometry.attributes.position) { t += m.geometry.attributes.position.count / 3; c++; } });
        out.tri.push([d.type + (d.form ? ':' + d.form : ''), Math.round(t), c]);
        if (isl.dispose) isl.dispose();
      }
    }
    return out;
  }, SEEDS);
}

async function blind(b, dir) {
  const fs = require('fs'); fs.mkdirSync(dir, { recursive: true });
  const p0 = await b.newPage(); await p0.goto(`${URL}/?shot=1`, { waitUntil: 'load' });
  const picks = await p0.evaluate(async () => {
    const W = await import('/src/world.js'), P = await import('/src/palette.js'), all = [];
    for (let cx = -24; cx <= 24; cx++) for (let cz = -24; cz <= 24; cz++) { const d = W.describeCell(cx, cz, 1337); if (d && !d.lm && !d.blight && d.type !== 'harbour') all.push(d); }
    const out = [];
    for (const S of P.STRATA) { const mid = (S.r0 + S.r1) / 2, d = all.filter((x) => Math.abs(Math.hypot(x.x, x.z) - mid) < 120).sort((a, c) => Math.abs(a.r - 15) - Math.abs(c.r - 15))[0]; if (d) out.push(['A12', S.id, d.x, d.z, d.r]); }
    for (const reg of ['crown', 'free', 'reef', 'lantern', 'drowned']) { const d = all.filter((x) => x.region === reg && Math.hypot(x.x, x.z) > 500).sort((a, c) => Math.hypot(a.x, a.z) - Math.hypot(c.x, c.z))[0]; if (d) out.push(['A13', reg, d.x, d.z, d.r]); }
    return out;
  });
  await p0.close();
  const key = [], letters = 'ABCDEFGHIJ';
  for (const test of ['A12', 'A13']) {
    const set = picks.filter((x) => x[0] === test).map((x, i) => [x, (i * 7 + 3) % picks.filter((y) => y[0] === test).length]);   // a fixed shuffle
    for (const [[, id, x, z, r], k] of set) {
      const D = 18 + r * 1.4, px = x + Math.cos(0.6) * D, pz = z + Math.sin(0.6) * D, h = Math.atan2(x - px, -(z - pz));
      const p = await b.newPage({ viewport: { width: 640, height: 360 } });
      await p.goto(`${URL}/?autostart=1&fresh=1&shot=1&nomate=1&time=0.5&x=${Math.round(px)}&z=${Math.round(pz)}`, { waitUntil: 'load', timeout: 300000 });
      await p.waitForFunction(() => window.__game && window.__game.world && window.__game.world.islands.size > 0, null, { timeout: 300000 });
      const go = ([px, pz, h]) => { const g = window.__game; g.state.story.edge = 1; g.state.story.free = true; g.state.story.reach = 2600; g.state.goals.i = 30; g.teleport(px, pz, h); g.ship.trim = 0; document.getElementById('hud').classList.add('hidden'); };
      await p.evaluate(go, [px, pz, h]); await p.waitForTimeout(16000); await p.evaluate(go, [px, pz, h]); await p.waitForTimeout(4000);
      const name = `${test}_${letters[k]}.png`; await p.screenshot({ path: `${dir}/${name}` }); key.push(`${name} = ${id}`);
      await p.close();
    }
  }
  fs.writeFileSync(`${dir}/key.txt`, key.sort().join('\n') + '\n');
  console.log(`      blind-test pictures in ${dir} (answers in key.txt)`);
}

(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const [old, now] = [await roll(b, 0), await roll(b, 1)];
  if (BLIND) await blind(b, BLIND);
  await b.close();
  rec(old.n === now.n && old.cells.join() === now.cells.join(), `the same islands in the same cells (${old.n} before, ${now.n} now, ${SEEDS.length} seas of 29x29 cells)`);
  rec(now.area <= old.area * 1.05, `land on the water: ${Math.round(now.area)} now against ${Math.round(old.area)} before (${(100 * now.area / old.area - 100).toFixed(1)}%)`);
  const max = (l, f) => l.filter(f).reduce((m, x) => Math.max(m, x[1]), 0), maxC = (l, f) => l.filter(f).reduce((m, x) => Math.max(m, x[2]), 0);
  const isNew = (x) => /:/.test(x[0]);
  const tNew = max(now.tri, isNew), cNew = maxC(now.tri, isNew), tOld = max(old.tri, () => true), cOld = maxC(old.tri, () => true);
  rec(tNew <= Math.max(2000, tOld) && cNew <= Math.max(4, cOld), `the new forms: at most ${tNew} triangles and ${cNew} draw calls (budget 2,000 / 4; the old rolled isles reach ${tOld} / ${cOld})`);
  const avg = (l) => { const m = {}; for (const [k, t] of l) { (m[k] = m[k] || []).push(t); } return Object.entries(m).map(([k, v]) => `${k} ${Math.round(v.reduce((a, x) => a + x, 0) / v.length)}`).join(', '); };
  console.log(`      triangles by kind and form (mean): ${avg(now.tri)}`);
  console.log(`      before: ${avg(old.tri)}`);
  console.log(`      forms rolled: ${JSON.stringify(now.forms)}`);
  // A13 help: each region's mix of kinds, and how far apart the mixes are now against before (half the summed difference, 0..1)
  const mix = (k) => { const s = Object.values(k).reduce((a, x) => a + x, 0); const m = {}; for (const [t, v] of Object.entries(k)) m[t] = v / s; return m; };
  const dist = (a, c) => { const ks = new Set([...Object.keys(a), ...Object.keys(c)]); let s = 0; for (const k of ks) s += Math.abs((a[k] || 0) - (c[k] || 0)); return s / 2; };
  const REG = ['crown', 'free', 'reef', 'lantern', 'drowned'].filter((r) => now.kinds[r] && old.kinds[r]);
  const spread = (K) => { let s = 0, n = 0; for (let i = 0; i < REG.length; i++) for (let j = i + 1; j < REG.length; j++) { s += dist(mix(K[REG[i]]), mix(K[REG[j]])); n++; } return n ? s / n : 0; };
  for (const r of REG) console.log(`      ${r.padEnd(8)} (${Object.values(now.kinds[r]).reduce((a, x) => a + x, 0)}) ${Object.entries(mix(now.kinds[r])).sort((a, c) => c[1] - a[1]).map(([t, v]) => `${t} ${Math.round(v * 100)}%`).join(', ')}`);
  const s0 = spread(old.kinds), s1 = spread(now.kinds);
  rec(s1 > s0, `the regions' mixes of kinds are further apart (mean distance ${s0.toFixed(2)} before, ${s1.toFixed(2)} now)`);
  console.log(`\n${fails ? `ISLE CHECKS FAILED (${fails})` : 'ISLE CHECKS PASSED'}`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
