import pw from '/opt/node-tools/node_modules/playwright/index.js';
import fs from 'fs';
export const OUT = '/tmp/claude-0/-home-user-pocket-pirates/a2592266-1e06-565b-8be8-51627bf3e1d5/scratchpad/trailer';
export const FPS = 30;
const VIRTUAL = () => {
  let vt = 0; const base = Date.now(), raf = [], timers = new Map(); let tid = 1;
  performance.now = () => vt; Date.now = () => base + vt;
  window.requestAnimationFrame = (cb) => { raf.push(cb); return raf.length; };
  window.cancelAnimationFrame = () => {};
  window.setTimeout = (cb, ms = 0, ...a) => { const id = tid++; timers.set(id, { t: vt + (ms || 0), cb: () => cb(...a) }); return id; };
  window.clearTimeout = (id) => timers.delete(id);
  window.setInterval = (cb, ms = 0, ...a) => { const id = tid++; timers.set(id, { t: vt + ms, cb: () => cb(...a), iv: Math.max(1, ms) }); return id; };
  window.clearInterval = window.clearTimeout;
  window.__step = (dt) => {
    vt += dt * 1000;
    for (const [id, T] of [...timers]) if (T.t <= vt) { if (T.iv) T.t += T.iv; else timers.delete(id); try { T.cb(); } catch (e) { /* ignore */ } }
    const list = raf.splice(0); for (const cb of list) cb(vt);
  };
};
export async function launch() {
  return pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
}
/** open the game with a virtual clock; returns the page once __game exists */
export async function openGame(browser, query, { w = +(process.env.TW || 1920), h = +(process.env.TH || 1080) } = {}) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await page.addInitScript(VIRTUAL);
  await page.goto(`http://127.0.0.1:5173/?${query}`);
  for (let i = 0; i < 400; i++) {
    const ready = await page.evaluate(() => { for (let k = 0; k < 6; k++) window.__step(0.002); return !!(window.__game && window.__game.state && window.__game.world && window.__game.ship); });
    if (ready) break;
    await page.waitForTimeout(60);
  }
  await page.addStyleTag({ content: '#toasts, #prompt, #help, #landho, #qbanner, #introskip, #demoend { display: none !important; }' });
  return page;
}
/** advance the page n small steps without capturing (game time passes) */
export async function warm(page, seconds, dt = 1 / FPS) {
  const n = Math.round(seconds / dt);
  for (let i = 0; i < n; i += 10) await page.evaluate(({ k, dt }) => { for (let j = 0; j < k; j++) window.__step(dt); }, { k: Math.min(10, n - i), dt });
}
/** capture `frames` frames into OUT/<name>/NNNN.jpg; tickSrc is a function body string evaluated each frame with (i, n) */
export async function capture(page, name, frames, tickSrc = '') {
  const dir = `${OUT}/${name}`; fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  await page.evaluate(`window.__tick = (i, n) => { ${tickSrc} }`);
  const t0 = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate(({ i, n, dt }) => { window.__tick(i, n); window.__step(dt); }, { i, n: frames, dt: 1 / FPS });
    await page.screenshot({ path: `${dir}/${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
    if (i % 30 === 29) console.log(name, i + 1, '/', frames, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
}
