// The title screen and the way into a voyage: the live title scene (the ship alone at sea at a random hour), its menu and keys,
// New voyage, the dev thread chooser, and the opening cinematic over Tama (begin, skip, end). State in rt (titleScene, introT...).
import { TITLE_SCENES, drawTitleLogo } from '../title.js';
import { THREAD_DEFS, pickAwake } from '../marks.js';
import { params, store, saved, DEV, session, SAVE_KEY, THREADS_KEY } from '../core/config.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { $ } from './dom.js';

export let titleEl, introWanted;   // set by the init function(s) below, at the point in boot where main.js had them

export function startTitle() {
  if (params.get('autostart') || params.get('notitle')) return;
  const sc = TITLE_SCENES[params.has('title') ? Math.max(0, TITLE_SCENES.findIndex((t) => t.id === params.get('title'))) : Math.floor(Math.random() * TITLE_SCENES.length)];
  // an empty stretch of sea (no island within three cells), searched outward from home
  let spot = [0, 600];
  find: for (let r = 250; r < 2000; r += 55) for (let a = 0; a < 6.28; a += 0.3) {
    const x = Math.cos(a) * r, z = Math.sin(a) * r, cx = Math.round(x / 110), cz = Math.round(z / 110);
    let ok = true; for (let dx = -3; dx <= 3 && ok; dx++) for (let dz = -3; dz <= 3; dz++) if (G.world.desc(cx + dx, cz + dz)) { ok = false; break; }
    if (ok) { spot = [x, z]; break find; }
  }
  rt.titleScene = { sc, keep: { x: G.ship.pos.x, z: G.ship.pos.z, h: G.ship.heading, time: state.time, trim: G.ship.trim, forced: rt.forced }, t: 0 };
  G.ship.pos.set(spot[0], 0, spot[1]); G.ship.heading = 0.8; rt.camHeading = 0.8; G.ship.trim = 0.9;
  state.time = sc.time; rt.forced = 0; rt.dread = 0;
  G.weather.force = sc.weather; Object.assign(G.weather, sc.weather);
  $('hud').classList.add('hidden');
  $('tNew').style.display = saved ? '' : 'none';
  document.fonts.load("86px 'Pirata One'").then(() => drawTitleLogo($('titleLogo')));
  setTimeout(() => $('tSail').focus(), 50);
}
export function titleCam(dt) {
  const ts = rt.titleScene, [ang, dist, hgt, lookY] = ts.sc.cam; ts.t += dt;
  const a = G.ship.heading + ang + Math.sin(ts.t * 0.05) * 0.25;   // a slow drift around the ship
  G.ship.speed = 0;                                                    // she only bobs in place
  rt.camOverride = { pos: [G.ship.pos.x + Math.sin(a) * dist, hgt + Math.sin(ts.t * 0.4) * 0.15, G.ship.pos.z - Math.cos(a) * dist], look: [G.ship.pos.x, lookY, G.ship.pos.z] };
}
export function endTitle() {
  if (!rt.titleScene) return;
  const k = rt.titleScene.keep; rt.titleScene = null; rt.camOverride = null;
  G.ship.pos.set(k.x, 0, k.z); G.ship.heading = k.h; rt.camHeading = k.h; G.ship.trim = k.trim; G.ship.speed = 0;
  state.time = k.time; rt.forced = k.forced; G.weather.force = null;
  if (params.get('hud') !== '0') $('hud').classList.remove('hidden');
}
export function setSail() {
  if (rt.sailing || rt.started) return; rt.sailing = true;
  G.threads.setup(G.threadChoice());   // dev: the choice made on the title screen
  $('fade').classList.add('on');
  setTimeout(() => { begin(); setTimeout(() => $('fade').classList.remove('on'), 250); }, 1000);
}
export function titleItems() { return [...document.querySelectorAll('#titleMenu button')].filter((b) => b.style.display !== 'none'); }
export function titleKey(e) {
  const items = titleItems(); let i = Math.max(0, items.indexOf(document.activeElement));
  if (['ArrowDown', 'KeyS', 'ArrowUp', 'KeyW'].includes(e.code)) { i = (i + (e.code === 'ArrowDown' || e.code === 'KeyS' ? 1 : items.length - 1)) % items.length; items[i].focus(); e.preventDefault(); }
  if (['Enter', 'Space', 'KeyE'].includes(e.code)) { e.preventDefault(); (document.activeElement && items.includes(document.activeElement) ? document.activeElement : items[0]).click(); }
}
// ---- a new voyage opens with a short cinematic: the camera starts high over Tama and drifts down to behind the ship, then the game begins.
// Any key or click skips it. Test runs (autostart, nomate) and continued voyages go straight in.
export const INTRO_DUR = 9;
export function endIntro() {
  if (rt.introT < 0) return;
  rt.introT = -1; document.body.classList.remove('intro');
  if (!params.get('nomate')) G.objectives.start();
}
export function skipIntro() { if (rt.introT >= 0 && rt.introT > 0.8) rt.introT = Math.max(rt.introT, INTRO_DUR - 1.2); }
export function begin() {
  if (rt.started) return;
  rt.started = true;
  endTitle();
  titleEl.style.display = 'none';
  G.audio.start();
  if (introWanted()) { rt.introT = 0; document.body.classList.add('intro'); }
  else if (!params.get('nomate')) G.objectives.start();
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initTitle1() {
  titleEl = $('title');
  // ---- the title screen: the ship alone on open sea at a random hour, until you set sail
  rt.titleScene = null;
  // only Set sail leaves the title: a fade to black, then you are back aboard where your voyage left off
  rt.newAskT = 0, rt.sailing = false;
  $('tSail').addEventListener('click', (e) => { e.stopPropagation(); setSail(); });
  // ---- dev: choose which threads are awake before the game starts (title screen)
  {
    const panel = $('thPanel'), btn = $('tThreads');
    if (DEV && !params.get('threads')) btn.style.display = '';
    const cur = () => store.get(THREADS_KEY) || { mode: 'seeded', ids: [] };
    const render = () => {
      const c = cur(), seeded = pickAwake(state.seed);
      $('thSeed').textContent = `(this seed wakes: ${seeded.map((id) => THREAD_DEFS.find((t) => t.id === id).name).join(', ')})`;
      panel.querySelectorAll('input[name=thmode]').forEach((r) => { r.checked = r.value === c.mode; });
      $('thList').innerHTML = THREAD_DEFS.map((t) => `<label class="throw ${c.mode === 'chosen' ? '' : 'off'}"><input type="checkbox" data-id="${t.id}" ${c.mode === 'chosen' && (c.ids || []).includes(t.id) ? 'checked' : ''} ${c.mode === 'chosen' ? '' : 'disabled'}> <span>${t.name}</span> <small>${t.note}</small> ${t.built ? '' : '<em>not built</em>'}</label>`).join('');
    };
    const save = (patch) => { store.set(THREADS_KEY, { ...cur(), ...patch }); render(); };
    btn.addEventListener('click', (e) => { e.stopPropagation(); render(); panel.classList.add('open'); $('thDone').focus(); });
    panel.addEventListener('change', (e) => {
      if (e.target.name === 'thmode') save({ mode: e.target.value });
      else if (e.target.dataset && e.target.dataset.id) save({ ids: [...panel.querySelectorAll('#thList input:checked')].map((i) => i.dataset.id) });
    });
    $('thDone').addEventListener('click', (e) => { e.stopPropagation(); panel.classList.remove('open'); btn.focus(); });
    panel.addEventListener('pointerdown', (e) => e.stopPropagation());
    panel.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.code === 'Escape') { panel.classList.remove('open'); btn.focus(); } });
    panel.addEventListener('keyup', (e) => e.stopPropagation());
  }
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initTitle2() {
  $('tNew').addEventListener('click', (e) => {
    e.stopPropagation();
    if (performance.now() - rt.newAskT > 4000) { rt.newAskT = performance.now(); $('tNew').textContent = 'Really? Press again'; return; }
    session.noSave = true; try { localStorage.removeItem(SAVE_KEY); sessionStorage.setItem('hoist-new', '1'); if (G.fsEl()) sessionStorage.setItem('hoist-fs', '1'); } catch (err) { /* storage blocked */ }
    location.href = location.pathname;
  });
  rt.introT = -1;
  introWanted = () => params.get('intro') === '1' || (!state.goals.started && !params.get('autostart') && !params.get('nomate') && !params.has('x'));
}
