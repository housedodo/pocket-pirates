import * as THREE from 'three';
import { clamp, smoothstep, angleDiff, mulberry32, hash2 } from './util.js';
import { sampleStage, DARK_THRESHOLD, dreadAtDistance } from './palette.js';
import { U, initMaterials, mats, PostFX } from './psx.js';
import { Ocean } from './ocean.js';
import { Sky } from './sky.js';
import { World } from './world.js';
import { Ship } from './ship.js';
import { Horror } from './horror.js';
import { AudioBus } from './audio.js';
import { gossip, lootFor } from './lore.js';
import { Wind } from './wind.js';
import { applyTimeOfDay, DAY_LENGTH, tod } from './daynight.js';
import { UPGRADES, MAX_LEVEL, computeMods, shipwrightLine } from './upgrades.js';

// ---------------------------------------------------------------- params, save, settings
const params = new URLSearchParams(location.search);
const SAVE_KEY = 'pocket-pirates-save-v1', SETTINGS_KEY = 'pocket-pirates-settings-v1';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ } },
};
const saved = params.get('fresh') ? null : store.get(SAVE_KEY);
const settings = store.get(SETTINGS_KEY) || { muted: false };
const state = {
  seed: parseInt(params.get('seed') || (saved && saved.seed) || '1337', 10),
  gold: (saved && saved.gold) || 0,
  dug: new Set((saved && saved.dug) || []),
  discovered: (saved && saved.discovered) || {},
  loot: (saved && saved.loot) || [],
  upgrades: Object.assign({ sails: 0, rudder: 0, lantern: 0, spyglass: 0, crew: 0 }, (saved && saved.upgrades) || {}),
  time: params.has('time') ? parseFloat(params.get('time')) : (saved && saved.time != null ? saved.time : 0.33),
  windT: (saved && saved.windT) || 0,
  pos: (saved && saved.pos) || { x: 0, z: 0, h: 0 },
};
if (params.has('x')) state.pos = { x: +params.get('x'), z: +params.get('z') || 0, h: +params.get('h') || 0 };

// ---------------------------------------------------------------- renderer & scene
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!params.get('shot') });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.autoClear = true;
renderer.info.autoReset = false; // we reset once per frame so stats cover both passes
initMaterials();
const post = new PostFX(renderer);

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0xbfeaff, 90, 330);
const camera = new THREE.PerspectiveCamera(62, 1, 0.5, 1600);

const ocean = new Ocean();
scene.add(ocean.mesh);
const sky = new Sky(scene);
const world = new World(scene, state.seed, state.dug);
const ship = new Ship(scene);
const horror = new Horror(scene, world, state.seed);
const audio = new AudioBus();
audio.muted = settings.muted;
const wind = new Wind(state.windT);

ship.pos.set(state.pos.x, 0, state.pos.z);
ship.heading = state.pos.h;
const refreshMods = () => { ship.mods = computeMods(state.upgrades); };
refreshMods();

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  post.resize(w, h);
}
window.addEventListener('resize', resize);
resize();

// ---------------------------------------------------------------- DOM helpers
const $ = (id) => document.getElementById(id);
const goldEl = $('gold').querySelector('b'), foundEl = $('found').querySelector('b');
const nearEl = $('near'), promptEl = $('prompt'), promptTxt = $('prompttxt'), promptBar = promptEl.querySelector('.bar'), promptFill = promptBar.querySelector('i');
const toastsEl = $('toasts'), debugEl = $('debug'), helpEl = $('help');
const chartEl = $('chart'), harbourEl = $('harbour'), pauseEl = $('pause');
const compass = $('compassCv').getContext('2d');
$('compassCv').width = 108; $('compassCv').height = 108;
if (params.get('hud') === '0') $('hud').classList.add('hidden');

function toast(text, dark = false, ms = 5200) {
  const el = document.createElement('div');
  el.className = 'toast panel txt' + (dark ? ' dark' : '');
  el.textContent = text;
  toastsEl.appendChild(el);
  while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
  setTimeout(() => el.remove(), ms);
}

// ---------------------------------------------------------------- modal state (pause / chart / harbour)
let modal = null; // null | 'pause' | 'chart' | 'harbour'
let harbourIsl = null;
const keys = new Set();
let started = false;

function openModal(name) {
  if (!started) return;
  closeModal(true);
  modal = name;
  keys.clear();
  ({ pause: pauseEl, chart: chartEl, harbour: harbourEl })[name].classList.add('open');
  if (name === 'pause') { showPauseMain(); }
  if (name === 'chart') drawChart();
  if (name === 'harbour') renderHarbour();
  audio.play(name === 'pause' ? 'pause' : 'ui');
  audio.setPaused(name === 'pause');
}
function closeModal(silent = false) {
  if (!modal) return;
  pauseEl.classList.remove('open'); chartEl.classList.remove('open'); harbourEl.classList.remove('open');
  if (modal === 'pause') audio.setPaused(false);
  modal = null; harbourIsl = null;
  if (!silent) lastTs = performance.now();
}

// ---------------------------------------------------------------- input
const touch = { L: false, R: false, U: false, D: false };
const titleEl = $('title');
function begin() {
  if (started) return;
  started = true;
  titleEl.style.display = 'none';
  audio.start();
}
let forced = params.has('dread') ? clamp(parseFloat(params.get('dread')), 0, 1) : null;

window.addEventListener('keydown', (e) => {
  if (!started) { begin(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    e.preventDefault();
    if (modal === 'pause') { if ($('pauseControls').style.display !== 'none') showPauseMain(); else closeModal(); }
    else if (modal) closeModal(); else openModal('pause');
    return;
  }
  if (modal === 'pause') {
    const btns = [...pauseEl.querySelectorAll('button')].filter((b) => b.offsetParent);
    const i = btns.indexOf(document.activeElement);
    if (e.code === 'ArrowDown') { btns[(i + 1) % btns.length].focus(); e.preventDefault(); }
    if (e.code === 'ArrowUp') { btns[(i - 1 + btns.length) % btns.length].focus(); e.preventDefault(); }
    return;
  }
  if (modal === 'harbour') {
    if (e.code === 'KeyE') closeModal();
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= UPGRADES.length) buyUpgrade(UPGRADES[n - 1].id);
    return;
  }
  if (e.code === 'KeyM') { if (modal === 'chart') closeModal(); else openModal('chart'); return; }
  if (modal) return;
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'KeyH') $('hud').classList.toggle('hidden');
  if (e.code === 'Backquote') debugEl.style.display = debugEl.style.display === 'block' ? 'none' : 'block';
  if (e.code === 'Digit0') forced = null;
  if (/^Digit[1-5]$/.test(e.code)) forced = (parseInt(e.code.slice(5), 10) - 1) / 4;
  if (e.code === 'BracketRight') state.time = (state.time + 1 / 24) % 1;
  if (e.code === 'BracketLeft') state.time = (state.time - 1 / 24 + 1) % 1;
});
window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => { if (started && !modal && !params.get('shot')) openModal('pause'); });
titleEl.addEventListener('pointerdown', begin);

let zoom = parseFloat(params.get('zoom') || '24'), zoomT = zoom;
let pitch = parseFloat(params.get('pitch') || '0.72'), pitchT = pitch;
canvas.addEventListener('wheel', (e) => { zoomT = clamp(zoomT * (1 + Math.sign(e.deltaY) * 0.1), 14, ship.mods.zoomMax); e.preventDefault(); }, { passive: false });
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { y: e.clientY, p: pitchT }; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { if (drag && !modal) pitchT = clamp(drag.p + (e.clientY - drag.y) * 0.006, 0.3, 1.35); });
canvas.addEventListener('pointerup', () => { drag = null; });

for (const [id, k] of [['tL', 'L'], ['tR', 'R'], ['tU', 'U'], ['tD', 'D']]) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { begin(); touch[k] = true; e.preventDefault(); });
  const up = () => { touch[k] = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
}
$('tE').addEventListener('pointerdown', (e) => { begin(); if (modal === 'harbour') closeModal(); else tryInteract(); e.preventDefault(); });
$('tP').addEventListener('pointerdown', (e) => { begin(); if (modal) closeModal(); else openModal('pause'); e.preventDefault(); });

// ---------------------------------------------------------------- pause menu
function showPauseMain() {
  $('pauseMain').style.display = 'block'; $('pauseControls').style.display = 'none';
  $('pbSound').textContent = `Sound: ${audio.muted ? 'off' : 'on'}`;
  $('pbResume').focus();
}
$('pbResume').addEventListener('click', () => closeModal());
$('pbControls').addEventListener('click', () => { $('pauseMain').style.display = 'none'; $('pauseControls').style.display = 'block'; $('pbBack').focus(); });
$('pbBack').addEventListener('click', showPauseMain);
$('pbLog').addEventListener('click', () => openModal('chart'));
$('pbSound').addEventListener('click', () => {
  audio.setMuted(!audio.muted);
  settings.muted = audio.muted; store.set(SETTINGS_KEY, settings);
  showPauseMain(); $('pbSound').focus();
});
pauseEl.addEventListener('pointerdown', (e) => { if (e.target === pauseEl) closeModal(); });
chartEl.addEventListener('pointerdown', (e) => { if (e.target === chartEl) closeModal(); });
harbourEl.addEventListener('pointerdown', (e) => { if (e.target === harbourEl) closeModal(); });
$('hbClose').addEventListener('click', () => closeModal());

// ---------------------------------------------------------------- harbour shipwright
function renderHarbour() {
  const d = harbourIsl.desc;
  const idx = Math.min(4, Math.floor(dread * 5));
  $('hbName').textContent = d.name;
  $('hbLine').textContent = harbourLine;
  $('hbGold').textContent = state.gold;
  $('hbList').innerHTML = UPGRADES.map((u, i) => {
    const lv = state.upgrades[u.id], maxed = lv >= MAX_LEVEL;
    const cost = maxed ? 0 : u.cost[lv];
    const can = !maxed && state.gold >= cost;
    return `<div class="up"><div><span class="nm">${i + 1}. ${u.name}</span> <span class="pips">${'■'.repeat(lv)}${'□'.repeat(MAX_LEVEL - lv)}</span></div>
      <button data-id="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'MAX' : `Buy ${cost}g`}</button>
      <div class="ds">${maxed ? 'Fully upgraded.' : u.text[lv]}</div></div>`;
  }).join('');
  $('hbList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => buyUpgrade(b.dataset.id)));
  if (idx >= 3) harbourEl.classList.add('dark');
}
let harbourLine = '';

function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id), lv = state.upgrades[id];
  if (!u || lv >= MAX_LEVEL || state.gold < u.cost[lv]) return;
  state.gold -= u.cost[lv];
  state.upgrades[id] = lv + 1;
  refreshMods();
  audio.play('buy');
  toast(`${u.name} upgraded to level ${lv + 1}`, dread > 0.5);
  renderHarbour();
}

// ---------------------------------------------------------------- compass & HUD
function drawCompass(w, heading) {
  const c = compass, S = 108, m = S / 2;
  c.clearRect(0, 0, S, S);
  c.fillStyle = 'rgba(10,10,30,.55)'; c.beginPath(); c.arc(m, m, 50, 0, 7); c.fill();
  c.strokeStyle = 'rgba(255,247,214,.5)'; c.lineWidth = 2; c.beginPath(); c.arc(m, m, 50, 0, 7); c.stroke();
  c.fillStyle = '#fff7d6'; c.font = 'bold 12px monospace'; c.textAlign = 'center'; c.fillText('N', m, 14);
  // wind chevrons (drawn along the direction the wind blows)
  c.save(); c.translate(m, m); c.rotate(w.dir);
  c.strokeStyle = '#8fe6ff'; c.lineWidth = 3;
  const off = (performance.now() / (95 - 45 * w.strength)) % 16;
  for (let i = -2; i <= 2; i++) {
    const y = -i * 16 + off - 8;
    if (Math.abs(y) > 34) continue;
    c.beginPath(); c.moveTo(-8, y + 6); c.lineTo(0, y - 4); c.lineTo(8, y + 6); c.stroke();
  }
  c.restore();
  c.save(); c.translate(m, m); c.rotate(heading);
  c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(0, -11); c.lineTo(7, 9); c.lineTo(0, 5); c.lineTo(-7, 9); c.closePath(); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- game state
let dread = forced !== null ? forced : dreadAtDistance(Math.hypot(ship.pos.x, ship.pos.z));
let dark = dread > DARK_THRESHOLD;
let dig = null;     // { isl, t }
let tNow = 0;
let lastSave = 0, lastNear = null;
const shipInput = { steer: 0, sail: 0 };

const interactTarget = () => world.nearest(ship.pos.x, ship.pos.z, 16, ['harbour', 'treasure']);

function tryInteract() {
  if (!started || modal) return;
  const isl = interactTarget();
  if (!isl) return;
  const d = isl.desc;
  if (d.type === 'harbour') {
    const rng = mulberry32(hash2(d.seed, Math.floor(tNow / 8), 3));
    const idx = Math.min(4, Math.floor(dread * 5));
    harbourLine = `${gossip(rng, idx, d.name)}\nShipwright: ${shipwrightLine(rng, idx)}`;
    harbourIsl = isl;
    harbourEl.classList.toggle('dark', idx >= 3);
    openModal('harbour');
    audio.play('harbour');
  } else if (d.type === 'treasure' && !isl.dug && !dig) {
    dig = { isl, t: 0 };
    audio.play('dig');
  }
}

function discover(isl) {
  const d = isl.desc;
  if (state.discovered[d.id]) return;
  state.discovered[d.id] = { name: d.name, type: d.type, x: Math.round(d.x), z: Math.round(d.z) };
  state.gold += 15;
  toast(`Charted: ${d.name} (+15 gold)`, dread > 0.5);
  audio.play('discover');
}

// ---------------------------------------------------------------- chart overlay
const chartCv = $('chartCv'), chartList = $('chartList');
function drawChart() {
  const c = chartCv.getContext('2d'), S = chartCv.width, scale = 0.28;
  c.fillStyle = dark ? '#1c2a44' : '#2a8fc0'; c.fillRect(0, 0, S, S);
  c.strokeStyle = 'rgba(255,255,255,.12)';
  for (let i = 0; i < S; i += 30) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, S); c.moveTo(0, i); c.lineTo(S, i); c.stroke(); }
  const colors = { harbour: '#ff6a4a', treasure: '#ffd23a', jungle: '#4ea64a', rocky: '#9a948a', sandbar: '#ecd48f' };
  for (const [id, v] of Object.entries(state.discovered)) {
    const x = S / 2 + (v.x - ship.pos.x) * scale, y = S / 2 + (v.z - ship.pos.z) * scale;
    c.fillStyle = colors[v.type] || '#fff';
    c.beginPath(); c.arc(x, y, v.type === 'sandbar' ? 3 : 6, 0, 7); c.fill();
    c.strokeStyle = '#000'; c.stroke();
    if (state.dug.has(id)) { c.fillStyle = '#d02820'; c.fillText('x', x - 3, y + 4); }
  }
  c.save(); c.translate(S / 2, S / 2); c.rotate(ship.heading);
  c.fillStyle = '#fff'; c.beginPath(); c.moveTo(0, -8); c.lineTo(5, 6); c.lineTo(-5, 6); c.closePath(); c.fill(); c.stroke();
  c.restore();
  const names = Object.values(state.discovered);
  chartList.innerHTML = `<h2>Captain's Log</h2><div>Gold: ${state.gold}</div><hr>` +
    (names.length ? names.map((n) => `<div>&bull; ${n.name} <small>(${n.type})</small></div>`).join('') : '<div>No isles charted yet.</div>') +
    `<hr><div><b>Treasures</b></div>` +
    (state.loot.length ? state.loot.map((l) => `<div class="${l.dark ? 'loot' : ''}">&bull; ${l.name}</div>`).join('') : '<div>None yet.</div>') +
    `<hr><div><b>Ship</b></div>` + UPGRADES.map((u) => `<div>${u.name}: ${state.upgrades[u.id]}/${MAX_LEVEL}</div>`).join('');
}

// ---------------------------------------------------------------- main loop
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
let camHeading = ship.heading;
let camOverride = null; // { pos:[x,y,z], look:[x,y,z] } for concept shots
let lastTs = performance.now();

function frame() {
  const nowTs = performance.now();
  const rawDt = Math.min(0.05, (nowTs - lastTs) / 1000);
  lastTs = nowTs;
  const live = started && !modal;
  const dt = live ? rawDt : 0;           // simulation time: frozen while a menu is open
  tNow += dt;
  const stepT = Math.floor(tNow * 12) / 12;

  // ---- time of day & wind
  if (live) state.time = (state.time + dt / DAY_LENGTH) % 1;
  wind.update(dt);
  if (live && wind.shifted()) toast(`The wind is shifting: now from the ${wind.fromName}`, false, 4200);

  // ---- ship
  shipInput.steer = (keys.has('KeyD') || keys.has('ArrowRight') || touch.R ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') || touch.L ? 1 : 0);
  shipInput.sail = (keys.has('KeyW') || keys.has('ArrowUp') || touch.U ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') || touch.D ? 1 : 0);
  if (!live) { shipInput.steer = 0; shipInput.sail = 0; }
  if (live && keys.has('KeyR')) pitchT = clamp(pitchT - dt * 0.8, 0.3, 1.35);
  if (live && keys.has('KeyF')) pitchT = clamp(pitchT + dt * 0.8, 0.3, 1.35);
  if (live || params.get('autostart')) ship.update(dt, shipInput, wind, tNow);
  if (world.collide(ship.pos, 2.2)) {
    if (ship.speed > 3 && dt > 0) audio.play('bump', { vol: clamp(ship.speed / 10, 0.3, 1) });
    ship.speed *= 0.9;
  }

  // ---- dread + stage palette + time of day
  const target = forced !== null ? forced : dreadAtDistance(Math.hypot(ship.pos.x, ship.pos.z));
  dread += (target - dread) * Math.min(1, rawDt * (forced !== null ? 1.2 : 0.4));
  if (params.get('shot')) dread = target;
  dark = dread > DARK_THRESHOLD;
  const stage = sampleStage(dread);
  applyTimeOfDay(stage, state.time, dread);
  stage.wave *= 0.7 + 0.5 * wind.strength;
  stage.fogFar += ship.mods.fogBonus; stage.fogNear += ship.mods.fogBonus * 0.5;

  // ---- world
  const first = world.islands.size === 0;
  world.update(ship.pos.x, ship.pos.z, dark, first ? 200 : 2);
  world.tick(tNow);
  horror.update(tNow, dread, ship.pos.x, ship.pos.z);
  ship.place(dt, stepT, stage.wave, dark, tod.night);

  // ---- global shader state
  scene.fog.color.copy(stage.fog); scene.fog.near = stage.fogNear; scene.fog.far = stage.fogFar;
  U.uDread.value = dread; U.uTime.value = stepT; U.uLight.value = stage.light; U.uWave.value = stage.wave;
  U.uDeep.value.copy(stage.deep); U.uShallow.value.copy(stage.shallow);
  U.uSnap.value.set(post.internal.w * 0.5 * stage.snap, post.internal.h * 0.5 * stage.snap);
  mats.shallow.color.copy(stage.shallow).lerp(new THREE.Color(1, 1, 1), 0.25);
  mats.foam.color.set(0xffffff).lerp(stage.skyHorizon, 0.25);
  mats.foam.opacity = 0.55 + 0.25 * Math.sin(tNow * 1.8);
  mats.beam.color.set('#ffe080').lerp(new THREE.Color('#ff50d0'), smoothstep(0.5, 0.8, dread));
  mats.beam.opacity = 0.1 + 0.3 * tod.night;
  sky.update(dt, camera, stage, wind.dir, tod);
  ocean.update(camera.position.x, camera.position.z);

  // ---- camera
  zoomT = Math.min(zoomT, ship.mods.zoomMax);
  zoom += (zoomT - zoom) * Math.min(1, rawDt * 5);
  pitch += (pitchT - pitch) * Math.min(1, rawDt * 5);
  camHeading += angleDiff(camHeading, ship.heading) * Math.min(1, rawDt * 1.6);
  const fx = Math.sin(camHeading), fz = -Math.cos(camHeading);
  const back = zoom * Math.cos(pitch), up = zoom * Math.sin(pitch);
  camPos.set(ship.pos.x - fx * back, up + 1, ship.pos.z - fz * back);
  camLook.set(ship.pos.x + fx * zoom * 0.2, 1.5, ship.pos.z + fz * zoom * 0.2);
  if (dread > 0.85 && live) { const s = (dread - 0.85) * 0.5; camPos.x += Math.sin(tNow * 31) * s; camPos.y += Math.sin(tNow * 23 + 1) * s; }
  if (camOverride) { camPos.set(...camOverride.pos); camLook.set(...camOverride.look); }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  camera.updateMatrixWorld();

  // ---- discovery / interaction / dig
  const nearAny = world.nearest(ship.pos.x, ship.pos.z, 30);
  if (nearAny) {
    if (live) discover(nearAny);
    if (lastNear !== nearAny) { nearEl.textContent = nearAny.desc.name; lastNear = nearAny; }
  } else if (lastNear) { nearEl.textContent = ''; lastNear = null; }

  const tgt = interactTarget();
  if (dig && live) {
    if (tgt !== dig.isl || ship.speed > 4) { dig = null; toast('The crew came back empty-handed. Hold still near the X!'); }
    else {
      dig.t += dt;
      const need = 2.6 * ship.mods.digTime;
      promptFill.style.width = `${Math.min(100, (dig.t / need) * 100)}%`;
      if (dig.t >= need) {
        const d = dig.isl.desc;
        const loot = lootFor(mulberry32(hash2(d.seed, 7, state.seed)), d.dread);
        loot.value = Math.round(loot.value * ship.mods.lootMul);
        state.dug.add(d.id); dig.isl.setDug(true);
        state.gold += loot.value; state.loot.push(loot);
        toast(`Treasure! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
        audio.play('treasure');
        dig = null;
      }
    }
  }
  if (tgt && live) {
    promptEl.style.display = 'block';
    const d = tgt.desc;
    if (dig) { promptTxt.textContent = 'Digging...'; promptBar.style.display = 'block'; }
    else {
      promptBar.style.display = 'none';
      promptTxt.textContent = d.type === 'harbour' ? `[E] Visit ${d.name}` : tgt.dug ? 'Already plundered' : '[E] Send the crew ashore to dig';
    }
  } else promptEl.style.display = 'none';

  // ---- HUD
  goldEl.textContent = state.gold;
  foundEl.textContent = Object.keys(state.discovered).length;
  $('clocktxt').textContent = tod.clock;
  $('clockicon').innerHTML = tod.sunElev > 0 ? '&#9728;' : '&#9790;';
  $('sailfill').style.width = `${Math.round(ship.trim * 100)}%`;
  $('eff').textContent = `wind ${Math.round(ship.eff * 100)}%`;
  $('windtxt').textContent = `WIND ${wind.fromName} ${wind.knots} kn`;
  drawCompass(wind, ship.heading);
  if (tNow > 18) helpEl.style.opacity = '0';
  if (modal === 'harbour') { $('hbGold').textContent = state.gold; }
  if (debugEl.style.display === 'block') debugEl.textContent = `tris ${renderer.info.render.triangles} calls ${renderer.info.render.calls}  dread ${dread.toFixed(2)} stage ${stage.index + 1} ${forced !== null ? '(forced)' : '(auto)'}  time ${tod.clock}  pos ${ship.pos.x | 0},${ship.pos.z | 0}  spd ${ship.speed.toFixed(1)}  islands ${world.islands.size}`;

  if (live) audio.update(dt, dread, ship.speed / 11, tod.night);

  // ---- save
  if (tNow - lastSave > 4 && !params.get('fresh')) {
    lastSave = tNow;
    store.set(SAVE_KEY, { seed: state.seed, gold: state.gold, dug: [...state.dug], discovered: state.discovered, loot: state.loot, upgrades: state.upgrades, time: state.time, windT: wind.t, pos: { x: ship.pos.x, z: ship.pos.z, h: ship.heading } });
  }

  // ---- render
  const pu = post.material.uniforms;
  pu.uDread.value = dread; pu.uTime.value = tNow; pu.uSat.value = stage.sat; pu.uVig.value = stage.vig;
  pu.uDither.value = stage.dither; pu.uTint.value.copy(stage.tint);
  post.render(scene, camera);
  requestAnimationFrame(frame);
}

// handy for tests / screenshots
window.__game = {
  setDread(v) { forced = v; dread = v; },
  setTime(t) { state.time = t; },
  setCam(p, z) { if (p !== undefined) { pitch = pitchT = p; } if (z !== undefined) { zoom = zoomT = z; } },
  setOverride(o) { camOverride = o; },
  teleport(x, z, h) { ship.pos.set(x, 0, z); ship.heading = h; camHeading = h; },
  ship, world, state, begin, scene, camera, horror, renderer, wind, openModal, closeModal, buyUpgrade, refreshMods,
};
if (params.get('autostart')) begin();
frame();
