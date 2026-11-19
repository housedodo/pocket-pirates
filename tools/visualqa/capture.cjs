// Visual QA capture harness (test tooling only: nothing in src/ imports it, nothing in the game changes).
// Run the dev server first:  npx vite --port 5175 --host 127.0.0.1
// Then:                      node tools/visualqa/capture.cjs <plan.json> <outDir>
// plan.json: { "base": "http://127.0.0.1:5175", "viewport": [960, 600], "shots": [ shot, ... ] }
// shot: { id, x, z, heading?, time? (0..1 of the day), dayN?, weather? {cloud, rain, storm, fog}, dread? (forced, 0..1, null = natural),
//         hut? (true: first throw done, the sea past 1650 open), free? (true: no fog walls), zoom?, pitch?, yaw?,
//         cam? { pos: [x, y, z], look: [x, y, z] } (a fixed camera instead of the ship's), hud? (false hides it), settle? frames (default 90),
//         sweep? { dx, dz, steps, every } (move the ship in steps and capture each; ids get _s0, _s1 ...) }
// Writes <outDir>/<id>.png and <outDir>/telemetry.json: [{ id, coords, heading, cam, state, fps, frameMsMax, drawCalls, triangles,
//         islandsLoaded, fogNear, fogFar, dread, errors: [...] }]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const [planPath, outDir] = process.argv.slice(2);
if (!planPath || !outDir) { console.error('usage: node capture.cjs plan.json outDir'); process.exit(1); }
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));
fs.mkdirSync(outDir, { recursive: true });
const base = plan.base || 'http://127.0.0.1:5175', [VW, VH] = plan.viewport || [960, 600];

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage({ viewport: { width: VW, height: VH } });
  let errs = [];
  page.on('pageerror', (e) => errs.push('pageerror: ' + String(e).slice(0, 300)));
  page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 300)); });
  await page.goto(`${base}/?autostart=1&fresh=1&shot=1&nomate=1`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__game && window.__game.state && window.__game.ship, null, { timeout: 180000 });
  const telemetry = [];
  const one = async (shot, id, x, z) => {
    errs = [];
    await page.evaluate(async ({ shot, x, z }) => {
      const g = window.__game, { rt, G } = await import('/src/core/runtime.js'), st = g.state;
      st.story.free = shot.free !== false;
      if (shot.hut !== false) { st.hut = st.hut || { rolls: [], wins: 0, fails: 0, lastDay: -1, visits: 0 }; if (!st.hut.rolls.length) st.hut.rolls.push({ n: 12, day: 0 }); }
      if (shot.dayN != null) st.dayN = shot.dayN;
      if (shot.time != null) st.time = shot.time;
      G.weather.force = shot.weather ? { cloud: 0, rain: 0, storm: 0, fog: 0, ...shot.weather } : { cloud: 0, rain: 0, storm: 0, fog: 0 };
      rt.forced = shot.dread == null ? null : shot.dread;
      g.teleport(x, z, shot.heading ?? 0);
      if (shot.zoom != null) rt.zoom = shot.zoom;
      if (shot.pitch != null) rt.pitch = shot.pitch;
      if (shot.yaw != null) { rt.yawT = shot.yaw; rt.camYaw = shot.yaw; }
      rt.camOverride = shot.cam ? { pos: shot.cam.pos, look: shot.cam.look } : null;
      const hud = document.getElementById('hud'); if (hud) hud.classList.toggle('hidden', shot.hud === false);
    }, { shot, x, z });
    const settle = shot.settle ?? 90;
    const timing = await page.evaluate(async (n) => {
      const ts = []; for (let i = 0; i < n; i++) ts.push(await new Promise((r) => requestAnimationFrame(r)));
      const d = []; for (let i = 1; i < ts.length; i++) d.push(ts[i] - ts[i - 1]);
      const tail = d.slice(-30), avg = tail.reduce((a, b) => a + b, 0) / Math.max(1, tail.length);
      return { fps: +(1000 / avg).toFixed(1), frameMsMax: +Math.max(...tail).toFixed(1) };
    }, settle);
    const info = await page.evaluate(async () => {
      const { renderer, scene, camera } = await import('/src/core/engine.js'), { rt } = await import('/src/core/runtime.js'), g = window.__game;
      return { drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles, islandsLoaded: g.world.islands.size,
        fogNear: Math.round(scene.fog.near), fogFar: Math.round(scene.fog.far), dread: +(rt.dread || 0).toFixed(2),
        cam: [camera.position.x, camera.position.y, camera.position.z].map((v) => +v.toFixed(1)), time: +g.state.time.toFixed(3) };
    });
    await page.screenshot({ path: path.join(outDir, `${id}.png`) });
    telemetry.push({ id, coords: [Math.round(x), Math.round(z)], heading: shot.heading ?? 0, state: { time: info.time, weather: shot.weather || 'clear', dread: shot.dread ?? 'natural' },
      ...timing, drawCalls: info.drawCalls, triangles: info.triangles, islandsLoaded: info.islandsLoaded, fogNear: info.fogNear, fogFar: info.fogFar, dreadNow: info.dread, cam: info.cam, errors: errs.slice() });
    console.log(id, JSON.stringify({ fps: timing.fps, calls: info.drawCalls, isl: info.islandsLoaded, fog: [info.fogNear, info.fogFar], dread: info.dread, errors: errs.length }));
  };
  for (const shot of plan.shots) {
    if (shot.sweep) { const s = shot.sweep; for (let k = 0; k < s.steps; k++) await one({ ...shot, settle: s.every ?? 25 }, `${shot.id}_s${k}`, shot.x + s.dx * k, shot.z + s.dz * k); }
    else await one(shot, shot.id, shot.x, shot.z);
  }
  fs.writeFileSync(path.join(outDir, 'telemetry.json'), JSON.stringify(telemetry, null, 1));
  await browser.close();
})().catch((e) => { console.error(e); process.exit(1); });
