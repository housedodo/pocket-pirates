// Smoke test (task R9): `npm run smoke`. Boots the full game and the demo build headless, fails on any console error, sails
// 60 game seconds, opens and closes the log, runs the clue lint, goes ashore on a landmark with no VISITS row (the R1 guard),
// checks the demo is closed (R2: test flags, the later places, the clue ledger) and that story delays wait out the pause menu (R7). Starts its own Vite dev server.
// Headless runs at about a tenth of real speed: every wait is on game state, never on the clock. Takes a few minutes.
// Nothing here judges feel or sound.
const path = require('path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');
const ARGS = ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];
const WAIT = 240000;
const fails = [];
const check = (who, ok, what) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${who}: ${what}`); if (!ok) fails.push(`${who}: ${what}`); };

async function lint() {
  globalThis.window = globalThis.window || {};
  const { clueLint } = await import(path.join(ROOT, 'src/clues.js'));
  const { CLUE_PLACES } = await import(path.join(ROOT, 'src/places.js'));
  const { regionAt } = await import(path.join(ROOT, 'src/regions.js'));
  const bad = clueLint({ places: CLUE_PLACES(), regionAt });
  check('lint', bad.length === 0, `clueLint ${bad.length ? 'flags ' + bad.join(', ') : 'passes'}`);
  for (const w of bad.warnings) console.log(`warn lint: ${w}`);   // a clue's place in another region's water (G-30): the owner's call, never a failure
}

async function boot(browser, base, demo, flags) {
  const ctx = await browser.newContext({ viewport: { width: 640, height: 360 } });
  const p = await ctx.newPage();
  if (demo) await p.addInitScript(() => { window.__BUILD = 'demo'; });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
  await p.goto(`${base}/?autostart=1&fresh=1&shot=1&nomate=1&time=0.35${flags}`, { waitUntil: 'load' });
  await p.waitForFunction(() => window.__game && window.__game.world && window.__game.world.islands.size > 0, null, { timeout: WAIT });
  return { p, ctx, errs };
}

/** sail with full sail until 60 game seconds have passed, then open and close the log */
async function sailAndLog(who, p) {
  const t0 = await p.evaluate(async () => {
    const { advanceTime } = await import('/src/daynight.js');
    const g = window.__game; g.state.story.edge = g.state.story.edge || 1;   // never start the Edge in a test
    g.teleport(0, -260, Math.PI); g.ship.trim = 1;
    window.__smoke = { from: [g.ship.pos.x, g.ship.pos.z], until: advanceTime(g.state.time, 60) };
    return g.state.time;
  });
  await p.waitForFunction(() => { const g = window.__game; g.ship.trim = 1; return g.state.time >= window.__smoke.until; }, null, { timeout: WAIT * 3, polling: 500 });   // two games side by side on a slow machine need longer than 8 minutes for 60 game seconds
  const moved = await p.evaluate(() => { const g = window.__game, f = window.__smoke.from; return Math.hypot(g.ship.pos.x - f[0], g.ship.pos.z - f[1]); });
  check(who, moved > 20, `sailed 60 game seconds from time ${t0.toFixed(3)}, moved ${moved.toFixed(0)} units`);
  await p.keyboard.press('m');
  const opened = await p.waitForFunction(() => document.getElementById('chart').classList.contains('open'), null, { timeout: WAIT }).then(() => true, () => false);
  await p.keyboard.press('m');
  const closed = await p.waitForFunction(() => !document.getElementById('chart').classList.contains('open'), null, { timeout: WAIT }).then(() => true, () => false);
  check(who, opened && closed, `the log opens and closes with M (${opened}, ${closed})`);
}

/** story delays run on the game's clock (R7): a line due in 2 game seconds does not fire while the pause menu is open */
async function laterWaits(who, p) {
  await p.evaluate(() => { const g = window.__game; window.__laterAt = null; g.later.after(2, () => { window.__laterAt = { modal: !!document.querySelector('.modal.open') }; }); g.openModal('pause'); });
  await p.waitForTimeout(6000);
  const during = await p.evaluate(() => window.__laterAt);
  await p.evaluate(() => window.__game.closeModal());
  const fired = await p.waitForFunction(() => window.__laterAt, null, { timeout: WAIT }).then(() => true, () => false);
  const at = await p.evaluate(() => window.__laterAt);
  check(who, during === null && fired && at && !at.modal, `a story delay waits out 6 s of pause and fires after it, outside any menu (${JSON.stringify(during)}, ${fired})`);
}

/** going ashore where places.visit returns nothing (a landmark with no VISITS row) must not throw (R1) */
async function ashoreWithoutVisit(who, p) {
  await p.evaluate(() => { const g = window.__game; window.__visited = 0; g.places.visit = () => { window.__visited++; return null; }; g.teleport(280, 78, 0); });
  const prompt = await p.waitForFunction(() => /ashore/i.test((document.getElementById('prompt') || {}).textContent || ''), null, { timeout: WAIT }).then(() => true, () => false);
  await p.keyboard.press('e');
  const went = await p.waitForFunction(() => window.__visited > 0, null, { timeout: WAIT * 2 }).then(() => true, () => false);
  await p.waitForTimeout(1500);
  check(who, prompt && went, `went ashore on the Grey Tooth with no visit row (prompt ${prompt}, landed ${went})`);
}

/** the demo is closed (R2): test flags do nothing, the later places are open water, nothing is recorded in the ledger */
async function demoClosed(who, p) {
  await p.waitForFunction(() => window.__game.state.time > 0, null, { timeout: WAIT });
  const a = await p.evaluate(() => { const g = window.__game; return { dread: g.dread, devbar: !!document.getElementById('devbar'), threads: g.state.story.threads || [], street: !!g.world.desc(13, 9), table: !!g.world.desc(13, -18), bell: !!g.world.desc(1, 2) }; });
  check(who, a.dread === 0, `?dread=0.9 is ignored (dread ${a.dread})`);
  check(who, !a.devbar, '?dev=1 shows no dev bar');
  check(who, a.threads.length === 0, `?threads=all wakes nothing (${JSON.stringify(a.threads)})`);
  check(who, !a.street && !a.table && a.bell, `the Sunken Street and the Table are open water, the Drowned Bell is there (${a.street}, ${a.table}, ${a.bell})`);
  await p.evaluate(() => { const g = window.__game; g.state.goals.i = 15; g.teleport(1450, 1000, 0); });   // the Sunken Street (moved into Drowned water, owner 2026-11-18, D3)
  await p.waitForFunction(() => Math.hypot(window.__game.ship.pos.x - 1450, window.__game.ship.pos.z - 1000) < 40, null, { timeout: WAIT }).catch(() => {});
  await p.waitForTimeout(3000);
  const s = await p.evaluate(() => ({ dread: window.__game.dread, labels: [...document.querySelectorAll('.farlabel')].filter((e) => e.style.display !== 'none').length }));
  check(who, s.dread === 0 && s.labels === 0, `at the Sunken Street's position dread ${s.dread}, ${s.labels} far labels`);
  await p.evaluate(() => window.__game.teleport(80, 226, 0));   // just off the Drowned Bell (80, 240)
  await p.waitForFunction(() => /ashore/i.test((document.getElementById('prompt') || {}).textContent || ''), null, { timeout: WAIT }).catch(() => {});
  await p.keyboard.press('e');
  const went = await p.waitForFunction(() => (window.__game.state.story.lm || {}).bell !== undefined, null, { timeout: WAIT * 2 }).then(() => true, () => false);
  const seen = await p.evaluate(() => Object.keys(window.__game.state.story.seen || {}));
  check(who, went && seen.length === 0, `ashore at the Drowned Bell records no clue (landed ${went}, seen ${JSON.stringify(seen)})`);
}

async function run(browser, base, demo) {
  const who = demo ? 'demo' : 'full';
  const { p, ctx, errs } = await boot(browser, base, demo, demo ? '&dev=1&dread=0.9&threads=all' : '');
  try {
    check(who, true, 'boots');
    if (demo) await demoClosed(who, p);
    await sailAndLog(who, p);
    if (!demo) await laterWaits(who, p);
    if (!demo) await ashoreWithoutVisit(who, p);
  } catch (e) { check(who, false, `threw: ${e.message.split('\n')[0]}`); }
  check(who, errs.length === 0, errs.length ? `console errors: ${errs.slice(0, 5).join(' | ')}` : 'no console errors');
  await ctx.close();
}

(async () => {
  const started = Date.now();
  await lint();
  const { createServer } = await import('vite');
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { host: '127.0.0.1', port: 0, strictPort: false } });
  await server.listen();
  const addr = server.httpServer.address(), base = `http://127.0.0.1:${addr.port}`;
  const browser = await chromium.launch({ args: ARGS, ...(process.env.CHROMIUM ? { executablePath: process.env.CHROMIUM } : {}) });
  try { await Promise.all([run(browser, base, false), run(browser, base, true)]); }
  finally { await browser.close(); await server.close(); }
  console.log(`\n${fails.length ? `SMOKE FAILED (${fails.length})` : 'SMOKE PASSED'} in ${Math.round((Date.now() - started) / 1000)} s`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
