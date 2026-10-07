import * as THREE from 'three';
import { clamp, smoothstep, angleDiff, mulberry32, hash2 } from './util.js';
import { sampleStage, DARK_THRESHOLD, dreadAtDistance } from './palette.js';
import { U, initMaterials, mats, PostFX } from './psx.js';
import { Ocean } from './ocean.js';
import { Sky } from './sky.js';
import { World } from './world.js';
import { Ship } from './ship.js';
import { Horror } from './horror.js';
import { AudioBus, AUDIO_ENABLED } from './audio.js';
import { gossip, lootFor, bottleNote, barrelLoot } from './lore.js';
import { Weather } from './weather.js';
import { Fauna } from './fauna.js';
import { Traffic } from './traffic.js';
import { SeaFeatures } from './seafeatures.js';
import { makeJob, findRumour, repOf, friendLevel, discount, bearingName, nearby, RUMOUR_COST } from './jobs.js';
import { Logbook } from './logbook.js';
import { sectorAt, sectorInfo, sectorCoord, FACTIONS } from './sectors.js';
import { KINDS } from './traffic.js';
import { Fishing, fishById } from './fishing.js';
import { Combat } from './combat.js';
import { Objectives } from './objectives.js';
import { GROUPS, DEFAULT_CUSTOM, byId } from './customize.js';
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
const settings = store.get(SETTINGS_KEY) || { muted: false, musicOff: false };
const state = {
  seed: parseInt(params.get('seed') || (saved && saved.seed) || '1337', 10),
  gold: (saved && saved.gold) || 0,
  dug: new Set((saved && saved.dug) || []),
  discovered: (saved && saved.discovered) || {},
  loot: (saved && saved.loot) || [],
  upgrades: Object.assign({ sails: 0, rudder: 0, lantern: 0, spyglass: 0, crew: 0 }, (saved && saved.upgrades) || {}),
  time: params.has('time') ? parseFloat(params.get('time')) : (saved && saved.time != null ? saved.time : 0.33),
  windT: (saved && saved.windT) || 0,
  collected: new Set((saved && saved.collected) || []),
  notes: (saved && saved.notes) || [],
  rumoured: (saved && saved.rumoured) || {},
  rep: (saved && saved.rep) || {},
  job: (saved && saved.job) || null,
  serial: (saved && saved.serial) || {},
  sectorsSeen: (saved && saved.sectorsSeen) || [],
  jobHistory: (saved && saved.jobHistory) || [],
  buffs: (saved && saved.buffs) || { speed: 0, dig: 0 },
  stats: Object.assign({ dist: 0, harbours: 0, deliveries: 0, fish: 0, wrecks: 0, bottles: 0, sunk: 0, hails: 0, solved: 0, treasures: 0, cosmetics: 0 }, (saved && saved.stats) || {}),
  hp: saved && saved.hp != null ? saved.hp : 100,
  ammo: saved && saved.ammo != null ? saved.ammo : 15,
  custom: Object.assign({}, DEFAULT_CUSTOM, (saved && saved.custom) || {}),
  owned: new Set((saved && saved.owned) || []),
  riddles: (saved && saved.riddles) || {},
  attempts: (saved && saved.attempts) || {},
  catch: (saved && saved.catch) || [],
  fishLog: (saved && saved.fishLog) || {},
  goals: Object.assign({ i: 0, side: {}, started: false }, (saved && saved.goals) || {}),
  hints: (saved && saved.hints) || {},
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
const weather = new Weather(scene);
const fauna = new Fauna(scene, world);
const traffic = new Traffic(scene, world, state.seed);
const sea = new SeaFeatures(scene, world, state.seed, state.collected);
const combat = new Combat(scene, fauna);
audio.musicOn = !settings.musicOff;

ship.pos.set(state.pos.x, 0, state.pos.z);
ship.heading = state.pos.h;
const refreshMods = () => { ship.mods = computeMods(state.upgrades); state.hp = Math.min(state.hp, ship.mods.maxHp); };
ship.setCustom(state.custom);
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
const chartEl = $('chart'), harbourEl = $('harbour'), pauseEl = $('pause'), shipEl = $('shipmodal');
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

weather.onThunder = (delay) => setTimeout(() => audio.play('thunder', { vol: 0.9 }), delay * 1000);
sea.onEvent = (e) => {
  const idx = Math.min(4, Math.floor(dread * 5));
  if (e.type === 'barrel') {
    const loot = barrelLoot(mulberry32(hash2(e.o.x | 0, e.o.z | 0, state.seed)), e.o.dread);
    state.gold += loot.value;
    toast(`Salvaged a ${loot.name} (+${loot.value} gold)`, loot.dark);
    audio.play('splash', { vol: 0.5 });
  } else if (e.type === 'bottle') {
    const text = bottleNote(mulberry32(hash2(e.o.x | 0, e.o.z | 0, state.seed + 3)), Math.min(4, Math.floor(e.o.dread * 5)));
    state.notes.push({ text, dark: idx >= 2 }); state.stats.bottles++;
    toast(`Message in a bottle: "${text}"`, idx >= 2, 10000);
    audio.play('bottle');
  } else if (e.type === 'whirl') {
    toast('A whirlpool tugs at the keel! Sail out of it.', dread > 0.5);
    audio.play('splash', { vol: 0.6 });
  }
};

// ---------------------------------------------------------------- goals, fishing
function giveMap(id, from) {
  const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz);
  if (!d || !d.puzzle) return;
  state.riddles[id] = d.puzzle.text;
  state.rumoured[id] = state.rumoured[id] || { name: d.name, x: Math.round(d.x), z: Math.round(d.z), source: from, found: false };
  toast(`${from} gave you a treasure riddle for ${d.name}. See your log (M, Journal).`, false, 8000);
}
const objectives = new Objectives({ state, world, ship, toast: (t, d) => toast(t, d), giveMap });
const fishing = new Fishing(scene, ship, {
  toast: (t) => toast(t),
  getCtx: () => ({ bonus: Math.max(0, ship.mods.lootMul - 1) }),
  onStart: () => toast('Line cast. Wait for a bite...', false, 2500),
  onBite: (f) => { toast(f.dark ? 'Something heavy takes the bait!' : 'A bite!', f.dark, 1500); },
  onCatch: (f) => {
    state.catch.push(f); state.stats.fish++;
    const l = state.fishLog[f.id] || (state.fishLog[f.id] = { count: 0, best: 0 });
    l.count++; l.best = Math.max(l.best, f.kg);
    toast(`Caught: ${f.name}, ${f.kg}kg (worth ${f.value}g)${l.count === 1 ? ' - new species!' : ''}`, f.dark, 6000);
    if (f.dark) objectives.remark('darkfish', dread);
  },
});

// ---------------------------------------------------------------- modal state (pause / chart / harbour)
let modal = null; // null | 'pause' | 'chart' | 'harbour' | 'ship'
let logTab = 'map';
let tradeShip = null;
const yardEl = $('yardmodal');
let harbourIsl = null;
const keys = new Set();
let started = false;

function openModal(name) {
  if (!started) return;
  closeModal(true);
  modal = name;
  keys.clear();
  if (fishing.active) fishing.cancel();
  ({ pause: pauseEl, chart: chartEl, harbour: harbourEl, ship: shipEl, yard: yardEl })[name].classList.add('open');
  if (name === 'pause') { showPauseMain(); }
  if (name === 'chart') logbook.open(logTab);
  if (name === 'harbour') renderHarbour();
  if (name === 'ship') renderShipTrade();
  if (name === 'yard') renderYard();
  audio.play(name === 'pause' ? 'pause' : 'ui');
  audio.setPaused(name === 'pause');
}
function closeModal(silent = false) {
  if (!modal) return;
  pauseEl.classList.remove('open'); chartEl.classList.remove('open'); harbourEl.classList.remove('open'); shipEl.classList.remove('open'); yardEl.classList.remove('open');
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
  if (!params.get('nomate')) objectives.start();
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
  if (modal === 'ship') {
    if (e.code === 'KeyE') closeModal();
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) { const b = shipEl.querySelectorAll('#shList button')[n - 1]; if (b && !b.disabled) b.click(); }
    return;
  }
  if (modal === 'chart') {
    if (e.code === 'ArrowRight') logbook.step(1);
    else if (e.code === 'ArrowLeft') logbook.step(-1);
    else if (/^Digit[1-7]$/.test(e.code)) logbook.tabByIndex(parseInt(e.code.slice(5), 10) - 1);
    else if (e.code === 'KeyM') closeModal();
    else if (e.code === 'KeyJ') { if (logbook.tab === 'jobs') closeModal(); else logbook.open('jobs'); }
    logTab = logbook.tab;
    return;
  }
  if (modal === 'harbour') {
    if (e.code === 'KeyE') closeModal();
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= UPGRADES.length) buyUpgrade(UPGRADES[n - 1].id);
    return;
  }
  if (e.code === 'KeyM') { logTab = 'map'; openModal('chart'); return; }
  if (e.code === 'KeyJ') { logTab = 'jobs'; openModal('chart'); return; }
  if (modal) return;
  if (e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Space') { if (fishing.active) { fishing.hold = true; fishing.press(true); } else fireCannons(); }
  if (e.code === 'KeyC') fishing.press();
  if (e.code === 'KeyY') objectives.askHint(dread);
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'KeyH') $('hud').classList.toggle('hidden');
  if (e.code === 'Backquote') debugEl.style.display = debugEl.style.display === 'block' ? 'none' : 'block';
  if (e.code === 'Digit0') forced = null;
  if (/^Digit[1-5]$/.test(e.code)) forced = (parseInt(e.code.slice(5), 10) - 1) / 4;
  if (e.code === 'BracketRight') state.time = (state.time + 1 / 24) % 1;
  if (e.code === 'BracketLeft') state.time = (state.time - 1 / 24 + 1) % 1;
});
window.addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'Space') fishing.hold = false; });
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
$('tC').addEventListener('pointerdown', (e) => { begin(); if (fishing.active) { fishing.hold = true; fishing.press(true); } else fishing.press(); e.preventDefault(); });
$('tC').addEventListener('pointerup', () => { fishing.hold = false; });
$('tX').addEventListener('pointerdown', (e) => { begin(); fireCannons(); e.preventDefault(); });
$('tP').addEventListener('pointerdown', (e) => { begin(); if (modal) closeModal(); else openModal('pause'); e.preventDefault(); });

// ---------------------------------------------------------------- pause menu
if (!AUDIO_ENABLED) { $('pbSound').style.display = 'none'; $('pbMusic').style.display = 'none'; }
function showPauseMain() {
  $('pauseMain').style.display = 'block'; $('pauseControls').style.display = 'none';
  $('pbSound').textContent = `Sound: ${audio.muted ? 'off' : 'on'}`;
  $('pbMusic').textContent = `Music: ${audio.musicOn ? 'on' : 'off'}`;
  $('pbResume').focus();
}
$('pbResume').addEventListener('click', () => closeModal());
$('pbControls').addEventListener('click', () => { $('pauseMain').style.display = 'none'; $('pauseControls').style.display = 'block'; $('pbBack').focus(); });
$('pbBack').addEventListener('click', showPauseMain);
$('pbLog').addEventListener('click', () => { logTab = 'map'; openModal('chart'); });
$('pbMusic').addEventListener('click', () => {
  audio.setMusic(!audio.musicOn);
  settings.musicOff = !audio.musicOn; store.set(SETTINGS_KEY, settings);
  showPauseMain(); $('pbMusic').focus();
});
$('pbSound').addEventListener('click', () => {
  audio.setMuted(!audio.muted);
  settings.muted = audio.muted; store.set(SETTINGS_KEY, settings);
  showPauseMain(); $('pbSound').focus();
});
pauseEl.addEventListener('pointerdown', (e) => { if (e.target === pauseEl) closeModal(); });
chartEl.addEventListener('pointerdown', (e) => { if (e.target === chartEl) closeModal(); });
harbourEl.addEventListener('pointerdown', (e) => { if (e.target === harbourEl) closeModal(); });
shipEl.addEventListener('pointerdown', (e) => { if (e.target === shipEl) closeModal(); });
$('shClose').addEventListener('click', () => closeModal());
$('hbClose').addEventListener('click', () => closeModal());

// ---------------------------------------------------------------- harbour shipwright
const upCost = (u, lv, rep) => Math.ceil(u.cost[lv] * discount(rep));
function renderHarbour() {
  const d = harbourIsl.desc, rep = repOf(state, d.id), lvl = friendLevel(rep);
  $('hbName').textContent = d.name;
  $('hbLine').textContent = harbourLine;
  $('hbGold').textContent = state.gold;
  $('hbRep').textContent = `Reputation here: ${'★'.repeat(lvl)}${'☆'.repeat(3 - lvl)}${lvl ? `  (-${lvl * 5}% prices)` : ''}`;

  // job board
  const jobEl = $('hbJob');
  if (state.job) {
    const j = state.job;
    jobEl.innerHTML = `<div class="job"><b>Your job:</b> deliver ${j.item} to ${j.toName}, ${bearingName(j.x - d.x, j.z - d.z)}. Pays ${j.reward}g.</div>`;
  } else {
    const j = makeJob(world, d, state.serial[d.id] || 0);
    jobEl.innerHTML = j ? `<div class="job"><b>Job board:</b> deliver ${j.item} to ${j.toName}, ${j.dist} fathoms ${bearingName(j.x - d.x, j.z - d.z)}. Pays ${j.reward}g. <button id="jobAccept">Accept</button></div>` : '';
    const b = $('jobAccept');
    if (b) b.addEventListener('click', () => { state.job = j; toast(`Job taken: ${j.toName} (+${j.reward}g on delivery)`, j.dark); audio.play('buy'); renderHarbour(); });
  }
  // rumours
  const r = findRumour(world, d, state);
  $('hbRumour').innerHTML = r ? `<div class="job"><b>Rumours:</b> a drunk sailor talks about buried treasure. <button id="rumourBuy" ${state.gold >= RUMOUR_COST ? '' : 'disabled'}>Buy a rumour ${RUMOUR_COST}g</button></div>` : '';
  const rb = $('rumourBuy');
  if (rb) rb.addEventListener('click', () => {
    if (state.gold < RUMOUR_COST) return;
    state.gold -= RUMOUR_COST;
    state.rumoured[r.d.id] = { name: r.d.name, x: Math.round(r.d.x), z: Math.round(r.d.z), source: `a drunk in ${d.name}`, found: false };
    toast(`Rumour: ${r.d.name} lies to the ${bearingName(r.d.x - d.x, r.d.z - d.z)}, about ${Math.round(r.dist)} fathoms. It is marked on your map.`, dread > 0.5, 8000);
    audio.play('buy'); renderHarbour();
  });

  const sellVal = Math.round(state.catch.reduce((a, f) => a + f.value, 0) * (1 + 0.05 * lvl));
  const ammoCost = Math.ceil(25 * discount(rep));
  $('hbExtra').innerHTML = `<div class="job"><b>Dock market:</b><br>
    ${state.catch.length ? `<button id="sellCatch">Sell catch (${state.catch.length} fish) +${sellVal}g</button>` : '<small>No fish to sell: slow down at sea and press C to fish.</small>'}
    <button id="buyAmmo" ${state.gold >= ammoCost ? '' : 'disabled'}>10 cannonballs ${ammoCost}g (have ${state.ammo})</button>
    <button id="openYard">Shipyard: paint &amp; figureheads</button></div>`;
  const sc = $('sellCatch');
  if (sc) sc.addEventListener('click', () => { state.gold += sellVal; toast(`Sold ${state.catch.length} fish for ${sellVal} gold.`); state.catch.length = 0; audio.play('buy'); renderHarbour(); });
  $('buyAmmo').addEventListener('click', () => { if (state.gold < ammoCost) return; state.gold -= ammoCost; state.ammo += 10; audio.play('buy'); renderHarbour(); });
  $('openYard').addEventListener('click', () => openModal('yard'));
  $('hbList').innerHTML = UPGRADES.map((u, i) => {
    const lv = state.upgrades[u.id], maxed = lv >= MAX_LEVEL;
    const cost = maxed ? 0 : upCost(u, lv, rep);
    const can = !maxed && state.gold >= cost;
    return `<div class="up"><div><span class="nm">${i + 1}. ${u.name}</span> <span class="pips">${'■'.repeat(lv)}${'□'.repeat(MAX_LEVEL - lv)}</span></div>
      <button data-id="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'MAX' : `Buy ${cost}g`}</button>
      <div class="ds">${maxed ? 'Fully upgraded.' : u.text[lv]}</div></div>`;
  }).join('');
  $('hbList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => buyUpgrade(b.dataset.id)));
}
let harbourLine = '';

function buyUpgrade(id) {
  const u = UPGRADES.find((x) => x.id === id), lv = state.upgrades[id];
  const cost = u && lv < MAX_LEVEL ? upCost(u, lv, repOf(state, harbourIsl.desc.id)) : 0;
  if (!u || lv >= MAX_LEVEL || state.gold < cost) return;
  state.gold -= cost;
  state.upgrades[id] = lv + 1;
  refreshMods();
  if (id === 'hull') state.hp = ship.mods.maxHp;
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
  if (state.job) {
    const a = Math.atan2(state.job.x - ship.pos.x, -(state.job.z - ship.pos.z));
    c.save(); c.translate(m, m); c.rotate(a); c.fillStyle = '#ff9a3a';
    c.beginPath(); c.moveTo(0, -50); c.lineTo(6, -40); c.lineTo(-6, -40); c.closePath(); c.fill(); c.restore();
  }
  c.save(); c.translate(m, m); c.rotate(heading);
  c.fillStyle = '#ffd23a'; c.beginPath(); c.moveTo(0, -11); c.lineTo(7, 9); c.lineTo(0, 5); c.lineTo(-7, 9); c.closePath(); c.fill();
  c.restore();
}

// ---------------------------------------------------------------- game state
let dread = forced !== null ? forced : dreadAtDistance(Math.hypot(ship.pos.x, ship.pos.z));
let dark = dread > DARK_THRESHOLD;
let dig = null;     // { isl, t }
let tNow = 0;
let curSector = null;
let lastSave = 0, lastNear = null, lastHour = Math.floor(state.time * 24);
const shipInput = { steer: 0, sail: 0 };

function fireCannons() {
  const r = combat.playerFire(ship, traffic, state, ship.mods);
  if (r === 'ammo') { toast('Out of cannonballs! Buy more at a harbour.'); objectives.remark('noammo'); }
  else if (r === 'target') objectives.remark('notarget');
}

function getInteract() {
  const isl = world.nearest(ship.pos.x, ship.pos.z, 16, ['harbour', 'treasure']);
  if (isl) return { kind: isl.desc.type, key: isl.desc.id, isl };
  if (sea.nearWreck) return { kind: 'wreck', key: sea.nearWreck.o.id, o: sea.nearWreck.o };
  const sh = traffic.nearestHail(ship.pos.x, ship.pos.z, 24);
  if (sh) return { kind: 'ship', key: 'ship' + sh.id, s: sh };
  return null;
}

function completeJobIfHere(d) {
  const j = state.job;
  if (!j || j.toId !== d.id) return;
  state.gold += j.reward;
  repOf(state, d.id).deliveries++; repOf(state, j.fromId).deliveries++;
  state.serial[j.fromId] = (state.serial[j.fromId] || 0) + 1;
  state.jobHistory.push({ item: j.item, to: d.name, reward: j.reward });
  state.stats.deliveries++;
  toast(`Delivered ${j.item} to ${d.name}: +${j.reward} gold`, j.dark, 7000);
  audio.play('treasure');
  state.job = null;
}

function tryInteract() {
  if (!started || modal) return;
  const tg = getInteract();
  if (!tg) return;
  if (tg.kind === 'harbour') {
    const d = tg.isl.desc, rep = repOf(state, d.id);
    if (!rep.last || Date.now() - rep.last > 120000) rep.visits++;
    rep.last = Date.now();
    completeJobIfHere(d);
    state.stats.harbours++;
    if (state.hp < ship.mods.maxHp) { state.hp = ship.mods.maxHp; toast('The harbour crew patches up your hull for free.', false, 3000); }
    const rng = mulberry32(hash2(d.seed, Math.floor(tNow / 8), 3));
    const idx = Math.min(4, Math.floor(dread * 5)), lvl = friendLevel(rep);
    const hello = idx >= 3 ? 'We remember you. We always remember you.' : lvl >= 3 ? 'Our favourite captain! Your usual discount, of course.' : rep.visits > 1 ? 'Back again, captain!' : 'A new face. Welcome!';
    harbourLine = `${hello}\n${gossip(rng, idx, d.name)}\nShipwright: ${shipwrightLine(rng, idx)}`;
    harbourIsl = tg.isl;
    harbourEl.classList.toggle('dark', idx >= 3);
    openModal('harbour');
    audio.play('harbour');
  } else if (tg.kind === 'treasure' && !tg.isl.dug && !dig) {
    const d = tg.isl.desc;
    if (!state.riddles[d.id]) {
      dig = { key: tg.key, t: 0, need: 2.2, done: () => {
        state.riddles[d.id] = d.puzzle.text;
        toast(`The arch inscription reads: "${d.puzzle.text}"`, d.dread > 0.5, 11000);
        objectives.remark('riddle');
      } };
      audio.play('dig');
    } else {
      dig = { key: tg.key, t: 0, need: 2.6 * ship.mods.digTime * (state.buffs.dig > 0 ? 0.7 : 1), done: () => {
        const ang = Math.atan2(ship.pos.z - d.z, ship.pos.x - d.x);
        if (Math.abs(angleDiff(ang, d.puzzle.angle)) > 0.85) {
          state.attempts[d.id] = (state.attempts[d.id] || 0) + 1;
          toast(state.attempts[d.id] >= 2 ? 'Nothing here but sand. Reread the riddle in your log (Journal) and try another shore.' : 'The crew digs and finds only sand and crabs. Wrong shore!', false, 6000);
          return;
        }
        const loot = lootFor(mulberry32(hash2(d.seed, 7, state.seed)), d.dread);
        loot.value = Math.round(loot.value * ship.mods.lootMul);
        state.dug.add(d.id); tg.isl.setDug(true); state.stats.treasures++; state.stats.solved++;
        state.gold += loot.value; state.loot.push(loot);
        toast(`Treasure! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
        audio.play('treasure');
      } };
      audio.play('dig');
    }
  } else if (tg.kind === 'ship') {
    hailShip(tg.s);
  } else if (tg.kind === 'wreck' && !dig) {
    const o = tg.o;
    dig = { key: tg.key, t: 0, need: 3.4 * ship.mods.digTime * (state.buffs.dig > 0 ? 0.7 : 1), done: () => {
      const loot = lootFor(mulberry32(o.rngSeed), o.dread);
      loot.value = Math.round(loot.value * 1.3 * ship.mods.lootMul);
      loot.name = `From the wreck: ${loot.name}`;
      o.salvaged = true; state.collected.add(o.id); state.stats.wrecks++;
      state.gold += loot.value; state.loot.push(loot);
      toast(`Salvaged! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
      audio.play('treasure');
    } };
    audio.play('dig');
  }
}

// ---------------------------------------------------------------- hailing other ships
function localStanding(x, z) {
  let max = 0, sum = 0;
  for (const [id, r] of Object.entries(state.rep)) {
    const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz);
    if (!d || Math.hypot(d.x - x, d.z - z) > 450) continue;
    const l = friendLevel(r); max = Math.max(max, l); sum += l;
  }
  return { max, sum };
}
const hailChance = (sh) => { const st = localStanding(sh.x, sh.z); return clamp(0.28 + 0.14 * st.max + 0.03 * Math.min(6, st.sum) + sh.faction.mood, 0.1, 0.88); };
const REFUSALS = ['The crew glances at you and looks away.', 'A sailor waves you off. They are not in the mood.', 'The captain pretends not to hear you.', 'They hoist a little more sail and leave you behind.'];

function hailShip(sh) {
  const rng = mulberry32(sh.seed);
  state.stats.hails++;
  if (sh.hostile && sh.hp > 0) { sh.state = 'open'; tradeShip = sh; openModal('ship'); return; }
  if (sh.mode === 'derelict') {
    sh.state = 'done';
    const loot = lootFor(rng, dread); loot.value = Math.round(loot.value * 0.6);
    loot.name = `From the drifting ${KINDS[sh.kind].label}: ${loot.name}`;
    state.gold += loot.value; state.loot.push(loot);
    toast(`You board the empty ship and find: ${loot.name} (+${loot.value}g)`, true, 7000);
  } else if (sh.mode === 'ghost') {
    sh.state = 'done';
    toast('Your hail comes back as your own voice, from a very long way off.', true, 6000);
  } else if (sh.roll < hailChance(sh)) {
    sh.state = 'open'; tradeShip = sh; openModal('ship');
  } else {
    sh.state = 'refused';
    const hint = localStanding(sh.x, sh.z).max < 1 ? ' (Perhaps they would listen if you were better known in these waters.)' : '';
    toast(REFUSALS[Math.floor(rng() * REFUSALS.length)] + hint, false, 6000);
  }
}

const FACTION_GREET = {
  crown: 'Ahoy! The Crown Traders always have time for honest custom.',
  free: 'The Free Cays welcome you, friend! Come aboard, metaphorically.',
  reef: 'Make it quick. We have somewhere to be, and none of it is here.',
  lantern: 'The Lantern Guild keeps the lamps burning. State your business.',
};
function shipOffers(sh) {
  if (sh.offers) return sh.offers;
  if (sh.hostile) return (sh.offers = [
    { id: 'tribute', label: 'Pay tribute', cost: 30 + Math.round(KINDS[sh.kind].scale * 15), desc: 'they take the coin and let you pass in peace', used: false },
    { id: 'bluff', label: 'Bluff', cost: 0, desc: 'they may believe you have a fleet behind you (45%)... or open fire', used: false },
    { id: 'defy', label: 'Defy them', cost: 0, desc: 'press Space to fire once they are in range', used: false },
  ]);
  const rng = mulberry32(sh.seed + 11), pool = [];
  if (findRumour(world, { x: sh.x, z: sh.z }, state)) pool.push({ id: 'chart', label: 'Sea-chart scrap', cost: 35, desc: 'marks a treasure isle on your map' });
  pool.push({ id: 'supplies', label: 'Fresh supplies', cost: 25, desc: '+15% speed for 3 minutes' });
  pool.push({ id: 'rum', label: 'Rum rations', cost: 20, desc: 'your crew digs 30% faster for 3 minutes' });
  pool.push({ id: 'news', label: 'Swap news', cost: 0, desc: 'a forecast and a rumour of the sea' });
  pool.push({ id: 'tale', label: 'Swap tall tales', cost: 0, desc: 'you jot one down in your journal' });
  if (nearby(world, sh.x, sh.z, 0, 700, 'harbour').length) pool.push({ id: 'message', label: 'Carry a message', cost: 0, desc: 'a delivery job for a nearby harbour' });
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
  sh.offers = pool.slice(0, 3).map((o) => ({ ...o, used: false }));
  return sh.offers;
}
function renderShipTrade() {
  const sh = tradeShip;
  $('shName').textContent = sh.name;
  $('shLine').textContent = sh.hostile ? 'The raider captain grins: "Nice ship. Shame if something happened to it. A little tribute, perhaps?"' : (FACTION_GREET[sh.faction.id] || 'Ahoy!');
  $('shGold').textContent = state.gold;
  $('shList').innerHTML = shipOffers(sh).map((o, i) => `<div class="up"><div><span class="nm">${i + 1}. ${o.label}</span></div>
    <button data-i="${i}" ${o.used || state.gold < o.cost ? 'disabled' : ''}>${o.used ? 'Done' : o.cost ? `${o.cost}g` : 'Free'}</button><div class="ds">${o.desc}</div></div>`).join('');
  $('shList').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => doOffer(parseInt(b.dataset.i, 10))));
}
function doOffer(i) {
  const sh = tradeShip, o = shipOffers(sh)[i];
  if (!o || o.used || state.gold < o.cost) return;
  const rng = mulberry32(sh.seed + 77 + i);
  const idx = Math.min(4, Math.floor(dread * 5));
  if (o.id === 'tribute') { sh.hostile = false; sh.engaged = false; toast('The raiders take your coin, grinning, and sail on.'); }
  else if (o.id === 'bluff') {
    if (Math.random() < 0.45) { sh.hostile = false; sh.engaged = false; toast('The raiders squint at the horizon, then think better of it.'); }
    else { sh.fireCd = 0.3; toast('They laugh, and open fire!'); }
  } else if (o.id === 'defy') { toast('You hoist your colours. Fire when ready (Space).'); }
  else if (o.id === 'chart') {
    const r = findRumour(world, { x: sh.x, z: sh.z }, state);
    if (!r) return;
    state.rumoured[r.d.id] = { name: r.d.name, x: Math.round(r.d.x), z: Math.round(r.d.z), source: `the ${sh.name}`, found: false };
    toast(`Chart scrap: ${r.d.name} lies ${bearingName(r.d.x - sh.x, r.d.z - sh.z)} of here. It is marked on your map.`, false, 7000);
  } else if (o.id === 'supplies') { state.buffs.speed = 180; toast('Fresh supplies stowed: the ship feels lighter.'); }
  else if (o.id === 'rum') { state.buffs.dig = 180; toast('Rum rations handed out: the crew is in high spirits.'); }
  else if (o.id === 'news') {
    const lines = [wind.fromName ? `Winds from the ${wind.fromName}, they say, and shifting.` : '', weather.storm > 0.3 ? 'A bad blow is on the way: batten down.' : weather.rain > 0.3 ? 'Rain all week out east.' : 'Fair skies for the next day or so.', tod.night > 0.5 ? 'Keep to the lit harbours after dark.' : 'Lighthouses burn only after dusk, so mind your hour.'];
    toast(`News from the ${sh.name}: ${lines[Math.floor(rng() * lines.length)]}`, false, 7000);
  } else if (o.id === 'tale') {
    const text = bottleNote(rng, idx);
    state.notes.push({ text, dark: idx >= 2 });
    toast(`A tall tale, written in your journal: "${text}"`, idx >= 2, 8000);
  } else if (o.id === 'message') {
    if (state.job) { toast('You already have a delivery to make.'); return; }
    const from = nearby(world, sh.x, sh.z, 0, 700, 'harbour').sort((a, b) => a.dist - b.dist)[0].d;
    const j = makeJob(world, from, (state.serial[from.id] || 0) + 100 + sh.id);
    if (!j) { toast('They have nothing to send right now.'); return; }
    j.fromName = `the ${sh.name}`; j.reward = Math.round(j.reward * 0.8);
    state.job = j;
    toast(`Message taken: deliver ${j.item} to ${j.toName} (+${j.reward}g)`, j.dark, 7000);
  }
  state.gold -= o.cost; o.used = true;
  renderShipTrade();
}

function discover(isl) {
  const d = isl.desc;
  if (state.discovered[d.id]) return;
  state.discovered[d.id] = { name: d.name, type: d.type, x: Math.round(d.x), z: Math.round(d.z) };
  state.gold += 15;
  if (state.rumoured[d.id]) state.rumoured[d.id].found = true;
  toast(`Charted: ${d.name} (+15 gold)`, dread > 0.5);
  audio.play('discover');
}

// ---------------------------------------------------------------- shipyard (cosmetics)
function renderYard() {
  $('yardGold').textContent = state.gold;
  $('yardBody').innerHTML = GROUPS.map(([g, label, list]) => `<div class="yardgrp">${label}</div><div class="swatches">${list.map((o) => {
    const key = `${g}:${o.id}`, owned = !o.cost || state.owned.has(key), locked = o.ok && !o.ok(state), on = state.custom[g] === o.id;
    const col = g === 'hull' ? o.upper : g === 'flag' ? o.color : g === 'sail' ? `rgb(${o.tint.map((v) => Math.min(255, v * 235) | 0)})` : '#caa';
    return `<button data-g="${g}" data-id="${o.id}" class="${on ? 'on' : ''}" ${locked || (!owned && state.gold < o.cost) ? 'disabled' : ''} title="${locked ? o.req : ''}"><span class="dot" style="background:${col}"></span>${o.name}${on ? '' : owned ? '' : locked ? ` <small>(${o.req})</small>` : ` ${o.cost}g`}</button>`;
  }).join('')}</div>`).join('');
  $('yardBody').querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
    const g = b.dataset.g, list = GROUPS.find((x) => x[0] === g)[2], o = byId(list, b.dataset.id), key = `${g}:${o.id}`;
    if (o.cost && !state.owned.has(key)) { if (state.gold < o.cost) return; state.gold -= o.cost; state.owned.add(key); state.stats.cosmetics++; audio.play('buy'); }
    state.custom[g] = o.id; ship.setCustom(state.custom); renderYard();
  }));
}
$('yardClose').addEventListener('click', () => closeModal());
yardEl.addEventListener('pointerdown', (e) => { if (e.target === yardEl) closeModal(); });

// ---------------------------------------------------------------- combat helpers
let lastHit = -99, shake = 0;
function hurtPlayer(dmg) {
  const d = Math.max(1, Math.round(dmg));
  state.hp -= d; lastHit = tNow; shake = 0.7;
  $('hit').classList.add('on'); setTimeout(() => $('hit').classList.remove('on'), 140);
  if (state.hp < 35) objectives.remark('lowhp', dread);
  if (state.hp <= 0) sinkPlayer();
}
function onHitEnemy(s, dmg) {
  s.hp -= dmg;
  if (s.hp > 0) return;
  s.sinking = true; s.hostile = false; s.state = 'done'; s.engaged = false;
  const gold = Math.round((45 + Math.random() * 70) * KINDS[s.kind].scale), balls = 3 + Math.floor(Math.random() * 4);
  state.gold += gold; state.ammo += balls; state.stats.sunk++;
  toast(`Raider sunk! +${gold} gold, +${balls} cannonballs`, false, 6000);
  if (state.stats.sunk === 1) toast('Unlocked: skull figurehead (see the shipyard).', false, 5000);
}
function sinkPlayer() {
  state.hp = ship.mods.maxHp;
  const lost = Math.round(state.gold * 0.25);
  state.gold -= lost;
  traffic.ships.filter((x) => x.hostile).forEach((x) => { x.hostile = false; x.engaged = false; });
  const hs = nearby(world, ship.pos.x, ship.pos.z, 0, 1500, 'harbour').sort((a, b) => a.dist - b.dist)[0];
  const tgt = hs ? { x: hs.d.x, z: hs.d.z + hs.d.r * 1.7, name: hs.d.name } : { x: 0, z: 0, name: 'Tama' };
  $('fade').classList.add('on');
  setTimeout(() => {
    ship.pos.set(tgt.x, 0, tgt.z); ship.heading = 0; ship.speed = 0; camHeading = 0;
    $('fade').classList.remove('on');
    toast(`The Pearl went under. A fisherman dragged you to ${tgt.name}. You lost ${lost} gold; the hull is repaired.`, false, 8000);
  }, 1100);
}
$('pbHint').addEventListener('click', () => { closeModal(); objectives.askHint(dread); });

// ---------------------------------------------------------------- captain's log
const logbook = new Logbook({ state, world, ship, seed: state.seed, toast: (t) => toast(t), close: () => closeModal(),
  skipGoal: () => { const g = objectives.current; if (!g) return; if (g.onDone) g.onDone({ state, world, ship, giveMap }); state.goals.i++; toast('Goal skipped.'); } });

// ---------------------------------------------------------------- main loop
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), _v = new THREE.Vector3();
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
  if (dt > 0) { state.buffs.speed = Math.max(0, state.buffs.speed - dt); state.buffs.dig = Math.max(0, state.buffs.dig - dt); }
  ship.buff = state.buffs.speed > 0 ? 1.15 : 1;
  const sec = sectorAt(ship.pos.x, ship.pos.z, state.seed);
  if (sec.id !== curSector) {
    curSector = sec.id;
    if (!state.sectorsSeen.includes(sec.id)) state.sectorsSeen.push(sec.id);
    if (live) toast(`Entering ${sec.name}: ${sec.faction.name} waters`, sec.dread > 0.5, 5000);
    $('sectorline').textContent = `${sec.name} \u00b7 ${sec.faction.name}`;
    $('sectorline').style.borderColor = sec.faction.color;
  }
  const windNow = { dir: wind.dir, strength: Math.min(1.4, wind.strength * (1 + 0.25 * weather.storm)) };
  if (live && wind.shifted()) toast(`The wind is shifting: now from the ${wind.fromName}`, false, 4200);

  // ---- ship
  shipInput.steer = (keys.has('KeyD') || keys.has('ArrowRight') || touch.R ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') || touch.L ? 1 : 0);
  shipInput.sail = (keys.has('KeyW') || keys.has('ArrowUp') || touch.U ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') || touch.D ? 1 : 0);
  if (!live) { shipInput.steer = 0; shipInput.sail = 0; }
  if (live && keys.has('KeyR')) pitchT = clamp(pitchT - dt * 0.8, 0.3, 1.35);
  if (live && keys.has('KeyF')) pitchT = clamp(pitchT + dt * 0.8, 0.3, 1.35);
  if (live || params.get('autostart')) ship.update(dt, shipInput, windNow, tNow);
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
  weather.update(dt, wind.t, dread, wind.dir, wind.strength, camera, tod);
  weather.apply(stage);
  stage.fogFar += ship.mods.fogBonus; stage.fogNear += ship.mods.fogBonus * 0.5;

  // ---- world
  const first = world.islands.size === 0;
  world.update(ship.pos.x, ship.pos.z, dark, first ? 200 : 2);
  world.setLit(tod.sunHeight < 0.12 || weather.darkness > 0.6);
  world.tick(tNow, tod);
  horror.update(tNow, dread, ship.pos.x, ship.pos.z);
  ship.place(dt, stepT, stage.wave, dark, tod.night);
  const lifeCtx = { ship, dread, wave: stage.wave, audio, wind: windNow, stage, tod };
  if (live) state.stats.dist += ship.speed * dt;
  fishing.update(dt, stepT, { wave: stage.wave, dread, night: tod.night });
  combat.update(dt, stepT, { ship, traffic, wave: stage.wave, onHitEnemy, onHitPlayer: hurtPlayer });
  if (live && tNow - lastHit > 12 && state.hp < ship.mods.maxHp) state.hp = Math.min(ship.mods.maxHp, state.hp + dt);
  objectives.update(dt, dread);
  if (live) {
    if (tod.night > 0.35 || tod.twilight > 0.6) objectives.remark('dusk');
    if (weather.storm > 0.4) objectives.remark('storm'); else if (weather.rain > 0.4) objectives.remark('rain'); else if (weather.fog > 0.5) objectives.remark('fog');
    for (const [k, v] of [['stage2', 0.25], ['stage3', 0.5], ['stage4', 0.75], ['stage5', 0.95]]) if (dread >= v) objectives.remark(k, dread);
    if (traffic.ships.some((x) => x.hostile && x.engaged)) objectives.remark('raider');
  }
  fauna.update(dt, stepT, lifeCtx);
  traffic.update(dt, stepT, lifeCtx);
  sea.update(dt, stepT, lifeCtx);

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
  mats.wake.color.set(0xffffff).lerp(new THREE.Color(0.35, 1, 0.9), tod.night * 0.9).lerp(new THREE.Color(1, 0.4, 0.95), tod.night * smoothstep(0.55, 0.9, dread) * 0.8);
  sky.update(dt, camera, stage, wind.dir, tod, { rainbow: weather.rainbow });
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
  if (shake > 0) { shake = Math.max(0, shake - rawDt * 1.8); camPos.x += Math.sin(tNow * 70) * shake; camPos.y += Math.cos(tNow * 63) * shake * 0.7; }
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

  const tgt = getInteract();
  if (dig && live) {
    if (!tgt || tgt.key !== dig.key || ship.speed > 4) { dig = null; toast('The crew came back empty-handed. Hold still!'); }
    else {
      dig.t += dt;
      promptFill.style.width = `${Math.min(100, (dig.t / dig.need) * 100)}%`;
      if (dig.t >= dig.need) { const done = dig.done; dig = null; done(); }
    }
  }
  if (tgt && live) {
    promptEl.style.display = 'block';
    if (dig) { promptTxt.textContent = 'Digging...'; promptBar.style.display = 'block'; }
    else {
      promptBar.style.display = 'none';
      promptTxt.textContent = tgt.kind === 'harbour' ? `[E] Visit ${tgt.isl.desc.name}`
        : tgt.kind === 'treasure' ? (tgt.isl.dug ? 'Already plundered' : !state.riddles[tgt.isl.desc.id] ? '[E] Study the ancient arch inscription' : '[E] Dig on this shore')
        : tgt.kind === 'ship' ? (tgt.s.mode === 'derelict' ? `[E] Board the drifting ${KINDS[tgt.s.kind].label}` : tgt.s.mode === 'ghost' ? '[E] Hail the pale ship' : `[E] Hail the ${tgt.s.name}`)
        : '[E] Salvage the wreck';
    }
  } else promptEl.style.display = 'none';

  // ---- HUD
  goldEl.textContent = state.gold;
  foundEl.textContent = Object.keys(state.discovered).length;
  $('clocktxt').textContent = `${tod.clock}  ${weather.label}`;
  const jl = $('jobline');
  if (state.job) { jl.style.display = 'block'; jl.textContent = `Deliver to ${state.job.toName}: ${Math.round(Math.hypot(state.job.x - ship.pos.x, state.job.z - ship.pos.z))}`; } else jl.style.display = 'none';
  $('clockicon').innerHTML = tod.sunElev > 0 ? '&#9728;' : '&#9790;';
  $('sailfill').style.width = `${Math.round(ship.trim * 100)}%`;
  $('eff').textContent = `wind ${Math.round(ship.eff * 100)}%`;
  $('windtxt').textContent = `WIND ${wind.fromName} ${wind.knots} kn`;
  drawCompass(wind, ship.heading);
  if (tNow > 18) helpEl.style.opacity = '0';
  if (modal === 'harbour') { $('hbGold').textContent = state.gold; }
  if (modal === 'ship') { $('shGold').textContent = state.gold; }
  if (debugEl.style.display === 'block') debugEl.textContent = `tris ${renderer.info.render.triangles} calls ${renderer.info.render.calls}  dread ${dread.toFixed(2)} stage ${stage.index + 1} ${forced !== null ? '(forced)' : '(auto)'}  time ${tod.clock}  pos ${ship.pos.x | 0},${ship.pos.z | 0}  spd ${ship.speed.toFixed(1)}  islands ${world.islands.size}`;

  $('hptxt').textContent = `${Math.round(state.hp)}/${ship.mods.maxHp}`;
  $('hpfill').style.width = `${Math.max(0, (state.hp / ship.mods.maxHp) * 100)}%`;
  $('ammotxt').textContent = `Cannonballs: ${state.ammo}`;
  $('reloadfill').style.width = `${100 - Math.min(100, (combat.reload / ship.mods.reload) * 100)}%`;
  const tgtE = combat.target(ship, traffic, 110);
  const eb = $('ebar');
  if (tgtE && live) {
    _v.set(tgtE.x, 5 * KINDS[tgtE.kind].scale + 3, tgtE.z).project(camera);
    if (_v.z < 1) { eb.style.display = 'block'; eb.style.left = `${(_v.x * 0.5 + 0.5) * window.innerWidth}px`; eb.style.top = `${(-_v.y * 0.5 + 0.5) * window.innerHeight}px`; $('ename').textContent = tgtE.name; $('efill').style.width = `${Math.max(0, (tgtE.hp / tgtE.maxHp) * 100)}%`; } else eb.style.display = 'none';
  } else eb.style.display = 'none';
  const gcur = objectives.current, gl = $('goalline');
  if (gcur) { gl.style.display = 'block'; gl.textContent = `Goal: ${gcur.title}. ${gcur.text}`; } else gl.style.display = 'none';
  if (live) {
    const near = world.nearest(ship.pos.x, ship.pos.z, 45);
    audio.update(dt, { dread, speed: ship.speed / 11, night: tod.night, wind: wind.strength, rain: weather.rain, storm: weather.storm, surf: near ? clamp(1 - world.lastEdge / 45, 0, 1) : 0 });
    const hour = Math.floor(state.time * 24);
    if (hour !== lastHour) { lastHour = hour; if (world.nearest(ship.pos.x, ship.pos.z, 80, ['harbour'])) audio.play('bell', { vol: 0.6 }); }
  }

  // ---- save
  if (tNow - lastSave > 4 && !params.get('fresh')) {
    lastSave = tNow;
    store.set(SAVE_KEY, { seed: state.seed, gold: state.gold, dug: [...state.dug], discovered: state.discovered, loot: state.loot, upgrades: state.upgrades, collected: [...state.collected], notes: state.notes, rumoured: state.rumoured, rep: state.rep, job: state.job, serial: state.serial, sectorsSeen: state.sectorsSeen, jobHistory: state.jobHistory, buffs: state.buffs, stats: state.stats, hp: state.hp, ammo: state.ammo, custom: state.custom, owned: [...state.owned], riddles: state.riddles, attempts: state.attempts, catch: state.catch, fishLog: state.fishLog, goals: state.goals, hints: state.hints, time: state.time, windT: wind.t, pos: { x: ship.pos.x, z: ship.pos.z, h: ship.heading } });
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
  ship, world, state, begin, scene, camera, horror, renderer, wind, weather, fauna, traffic, sea, audio, fishing, combat, objectives, hurtPlayer, openModal, closeModal, buyUpgrade, refreshMods,
};
if (params.get('autostart')) begin();
frame();
