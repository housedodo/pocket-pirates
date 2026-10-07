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
import { makeJob, findRumour, repOf, friendLevel, discount, bearingName, nearby, RUMOUR_COST, commissionsFor, questProgress, questNeed, questTitle, QUEST_ICON, questIcon, FRUITS, fruitOf, fruitName, plural } from './jobs.js';
import { Logbook } from './logbook.js';
import { sectorAt, sectorInfo, sectorCoord, FACTIONS } from './sectors.js';
import { KINDS } from './traffic.js';
import { Fishing, fishById } from './fishing.js';
import { Combat } from './combat.js';
import { Objectives } from './objectives.js';
import { GROUPS, DEFAULT_CUSTOM, byId } from './customize.js';
import { Wind } from './wind.js';
import { WindFX } from './windfx.js';
import { drawWind, PX } from './windmeters.js';
import { installPixelUI } from './pixelui.js';
import { applyTimeOfDay, DAY_LENGTH, tod } from './daynight.js';
import { UPGRADES, MAX_LEVEL, computeMods, shipwrightLine } from './upgrades.js';
import { Abyss, EFFECTS, WATCHER_STYLES, WATCHER_NAMES } from './abyss.js';

// ---------------------------------------------------------------- params, save, settings
const params = new URLSearchParams(location.search);
const SAVE_KEY = 'pocket-pirates-save-v1', SETTINGS_KEY = 'pocket-pirates-settings-v1';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ } },
};
const saved = params.get('fresh') ? null : store.get(SAVE_KEY);
const settings = Object.assign({ muted: false, musicOff: false, windStyle: 'dial', hud: 'classic', tracker: true, abyss: {} }, store.get(SETTINGS_KEY) || {});
installPixelUI();
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
  quests: (saved && saved.quests) || [],
  fruit: (saved && saved.fruit) || {},
  harvest: (saved && saved.harvest) || {},
  dayN: (saved && saved.dayN) || 0,
  stats: Object.assign({ dolphins: 0, whales: 0, fruitPicked: 0, dist: 0, harbours: 0, deliveries: 0, fish: 0, wrecks: 0, bottles: 0, sunk: 0, hails: 0, solved: 0, treasures: 0, cosmetics: 0 }, (saved && saved.stats) || {}),
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
ocean.material.transparent = true; ocean.mesh.renderOrder = -1; // can turn see-through (glass calm)
scene.add(ocean.mesh);
const sky = new Sky(scene);
const world = new World(scene, state.seed, state.dug);
const ship = new Ship(scene);
const horror = new Horror(scene, world, state.seed);
const audio = new AudioBus();
audio.muted = settings.muted;
const wind = new Wind(state.windT);
const weather = new Weather(scene);
const windfx = new WindFX(scene);
const fauna = new Fauna(scene, world);
const traffic = new Traffic(scene, world, state.seed);
const sea = new SeaFeatures(scene, world, state.seed, state.collected);
const combat = new Combat(scene, fauna);
sea.syncQuests(state.quests);
fauna.onSpot = (what) => { state.stats[what]++; toast(what === 'dolphins' ? 'Dolphins!' : 'A whale surfaces in the distance!', false, 2500); };
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
const goldEl = $('gold').querySelector('b');
const promptEl = $('prompt'), promptTxt = $('prompttxt'), promptBar = promptEl.querySelector('.bar'), promptFill = promptBar.querySelector('i');
const toastsEl = $('toasts'), debugEl = $('debug'), helpEl = $('help');
const chartEl = $('chart'), harbourEl = $('harbour'), pauseEl = $('pause'), shipEl = $('shipmodal');
const compass = $('compassCv').getContext('2d');
$('compassCv').width = PX; $('compassCv').height = PX;
if (params.get('hud') === '0') $('hud').classList.add('hidden');

function toast(text, dark = false, ms = 5200) {
  const el = document.createElement('div');
  el.className = 'toast panel txt' + (dark ? ' dark' : '');
  const sp = document.createElement('span'); sp.textContent = text; el.appendChild(sp);
  toastsEl.appendChild(el);
  while (toastsEl.children.length > 3) toastsEl.firstChild.remove();
  setTimeout(() => el.remove(), ms);
}

weather.onThunder = (delay) => setTimeout(() => audio.play('thunder', { vol: 0.9 }), delay * 1000);
sea.onEvent = (e) => {
  const idx = Math.min(4, Math.floor(dread * 5));
  if (e.type === 'qcrate') {
    const have = questProgress(e.q, state), need = questNeed(e.q);
    toast(have >= need ? `Last crate recovered! Return to ${e.q.giverName}.` : `Crate recovered (${have}/${need}).`, false, 4500);
    return;
  }
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
  toast(`${from} gave you a treasure riddle for ${d.name}. Saved in your log: Riddles tab.`, false, 8000);
}
const objectives = new Objectives({ state, world, ship, toast: (t, d) => toast(t, d), giveMap });
const abyss = new Abyss({ scene, ship, world, sky, settings, state, mate: objectives.mate, toast: (t, d, ms) => toast(t, d, ms), fade: $('fade'),
  onEnding: () => {
    forced = null; dread = 0.02; abyss.k = 0;
    ship.pos.set(0, 0, -25); ship.heading = 0; ship.speed = 0; camHeading = 0; yawT = 0;
    state.stats.awakened = (state.stats.awakened || 0) + 1;
    objectives.mate.queue.length = 0;
    objectives.mate.say('Captain? Captain! You were asleep at the wheel. For how long, I... let us just go home.');
  } });
const fishing = new Fishing(scene, ship, {
  toast: (t) => toast(t),
  getCtx: () => ({ bonus: Math.max(0, ship.mods.lootMul - 1) }),
  onStart: () => toast('Line cast. Wait for a bite...', false, 2500),
  onBite: (f) => { toast(f.dark ? 'Something heavy takes the bait!' : 'A bite!', f.dark, 1500); },
  onCatch: (f) => {
    f = abyss.wrongCatch(f);
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
  if (name === 'chart') { abyss.onMapOpen(ship); logbook.open(logTab); }
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
    if (modal === 'pause') { if ($('pauseControls').style.display !== 'none' || $('pauseAbyss').style.display !== 'none') showPauseMain(); else closeModal(); }
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
    else if (e.code === 'ArrowDown' || e.code === 'PageDown') logbook.turn(1);
    else if (e.code === 'ArrowUp' || e.code === 'PageUp') logbook.turn(-1);
    else if (/^Digit[1-8]$/.test(e.code)) logbook.tabByIndex(parseInt(e.code.slice(5), 10) - 1);
    else if (e.code === 'KeyM') closeModal();
    else if (e.code === 'KeyJ') { if (logbook.tab === 'quests') closeModal(); else logbook.open('quests'); }
    logTab = logbook.tab;
    return;
  }
  if (modal === 'harbour') {
    if (e.code === 'KeyE') closeModal();
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= UPGRADES.length && hbTab === 'wright') buyUpgrade(UPGRADES[n - 1].id);
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { const order = ['board', 'market', 'wright']; hbTab = order[(order.indexOf(hbTab) + (e.code === 'ArrowRight' ? 1 : 2)) % 3]; renderHarbour(); }
    return;
  }
  if (e.code === 'KeyM') { logTab = 'map'; openModal('chart'); return; }
  if (e.code === 'KeyJ') { logTab = 'quests'; openModal('chart'); return; }
  if (modal) return;
  if (e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Space') { if (fishing.active) { fishing.hold = true; fishing.press(true); } else fireCannons(); }
  if (e.code === 'KeyC') fishing.press();
  if (e.code === 'KeyY' && !abyss.maraHint()) objectives.askHint(dread);
  if (e.code === 'Enter') objectives.mate.skip();
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'KeyH') $('hud').classList.toggle('hidden');
  if (e.code === 'KeyQ' && !modal) { settings.tracker = settings.tracker === false; store.set(SETTINGS_KEY, settings); }
  if (e.code === 'Backquote') debugEl.style.display = debugEl.style.display === 'block' ? 'none' : 'block';
  if (e.code === 'Digit0') { forced = null; abyss.stopTest(); }
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
let yawT = 0, camYaw = 0, lastCamInput = -99;   // orbit around the boat (drag sideways, Z / X, V resets)
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, p: pitchT, yaw: yawT }; lastCamInput = tNow; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { if (drag && !modal) { pitchT = clamp(drag.p + (e.clientY - drag.y) * 0.006, 0.3, 1.35); yawT = drag.yaw - (e.clientX - drag.x) * 0.008; lastCamInput = tNow; } });
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
  $('pauseMain').style.display = 'block'; $('pauseControls').style.display = 'none'; $('pauseAbyss').style.display = 'none';
  $('pbSound').textContent = `Sound: ${audio.muted ? 'off' : 'on'}`;
  $('pbMusic').textContent = `Music: ${audio.musicOn ? 'on' : 'off'}`;
  $('pbResume').focus();
}
$('pbResume').addEventListener('click', () => closeModal());
$('pbControls').addEventListener('click', () => { $('pauseMain').style.display = 'none'; $('pauseControls').style.display = 'block'; $('pbBack').focus(); });
$('pbBack').addEventListener('click', showPauseMain);
// full-dread effects: switch each one on/off, or try one on its own
function renderAbyssMenu() {
  const on = (id) => settings.abyss[id] !== false;
  $('abList').innerHTML = EFFECTS.map((f, i) => `<div class="abrow"><button class="abtog ${on(f.id) ? 'on' : ''}" data-id="${f.id}">${on(f.id) ? 'ON' : 'OFF'}</button><div class="abtxt"><b>${i + 1}. ${f.name}</b><small>${f.desc}</small></div><button class="abtry" data-id="${f.id}">Try</button>${f.id === 'leviathan' ? '<button class="abtry" data-end="1">Ending</button>' : ''}${f.id === 'watchers' ? `<button class="abstyle">${WATCHER_NAMES[settings.watcherStyle || 'pale']}</button>` : ''}</div>`).join('');
  const st = $('abList').querySelector('.abstyle');
  if (st) st.addEventListener('click', () => { const i = WATCHER_STYLES.indexOf(settings.watcherStyle || 'pale'); settings.watcherStyle = WATCHER_STYLES[(i + 1) % WATCHER_STYLES.length]; store.set(SETTINGS_KEY, settings); renderAbyssMenu(); $('abList').querySelector('.abstyle').focus(); });
  $('abList').querySelectorAll('.abtog').forEach((b) => b.addEventListener('click', () => { settings.abyss[b.dataset.id] = !on(b.dataset.id); store.set(SETTINGS_KEY, settings); renderAbyssMenu(); }));
  $('abList').querySelectorAll('.abtry').forEach((b) => b.addEventListener('click', () => {
    forced = 1; dread = 1; abyss.k = 1;
    if (b.dataset.end) { abyss.solo = 'leviathan'; abyss.startEnding(); closeModal(); return; }
    const id = b.dataset.id;
    abyss.trigger(id); closeModal();
    if (id === 'map') setTimeout(() => { logTab = 'map'; openModal('chart'); }, 150);
  }));
  $('abForce').textContent = forced === 1 ? 'Back to automatic dread' : 'Go to full dread now (all ON effects)';
}
$('pbAbyss').addEventListener('click', () => { $('pauseMain').style.display = 'none'; $('pauseAbyss').style.display = 'block'; renderAbyssMenu(); $('abBack').focus(); });
$('abBack').addEventListener('click', showPauseMain);
$('abAll').addEventListener('click', () => { const any = EFFECTS.some((f) => settings.abyss[f.id] === false); for (const f of EFFECTS) settings.abyss[f.id] = any; store.set(SETTINGS_KEY, settings); renderAbyssMenu(); });
$('abForce').addEventListener('click', () => { abyss.stopTest(); if (forced === 1) forced = null; else { forced = 1; dread = 1; } renderAbyssMenu(); });
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
let hbTab = 'board';
function handIn(q, d) {
  const need = questNeed(q);
  if (questProgress(q, state) < need) return;
  if (q.type === 'fish') { let n = need; state.catch = state.catch.filter((f) => (f.id === q.species && n > 0 ? (n--, false) : true)); }
  if (q.type === 'fruit') state.fruit[q.fruit] -= need;
  state.gold += q.reward;
  repOf(state, d.id).deliveries++;
  state.serial[d.id + '#c'] = (state.serial[d.id + '#c'] || 0) + 1;
  state.quests = state.quests.filter((x) => x.id !== q.id);
  sea.syncQuests(state.quests);
  state.stats.commissions = (state.stats.commissions || 0) + 1;
  toast(`Commission done: ${questTitle(q, dread)} (+${q.reward} gold)`, dread > 0.5, 6000);
  audio.play('treasure');
}
function acceptCommission(o) {
  if (state.quests.length >= 3 || state.quests.some((x) => x.id === o.id)) return;
  const q = { ...o, base: o.type === 'bounty' ? state.stats.sunk : o.type === 'spot' ? state.stats[o.what] : 0 };
  if (q.crates) q.crates = q.crates.map((c) => ({ ...c }));
  state.quests.push(q);
  sea.syncQuests(state.quests);
  toast(`Commission taken: ${questTitle(q, dread)}`, false, 5000);
  audio.play('buy');
}

function renderHarbour() {
  const d = harbourIsl.desc, rep = repOf(state, d.id), lvl = friendLevel(rep);
  $('hbName').textContent = d.name;
  $('hbLine').textContent = harbourLine;
  $('hbGold').textContent = state.gold;
  $('hbTabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === hbTab));
  const pane = $('hbPane');
  let html = '';
  if (hbTab === 'board') {
    html += '<div class="sec">DELIVERY</div>';
    const j = state.job || makeJob(world, d, state.serial[d.id] || 0);
    if (state.job) html += `<div class="qrow"><div><b>📮 ${state.job.item}</b><br><small>to ${state.job.toName} · ${bearingName(state.job.x - d.x, state.job.z - d.z)}</small></div><small>${state.job.reward}g</small></div>`;
    else if (j) html += `<div class="qrow"><div><b>📮 ${j.item}</b><br><small>to ${j.toName} · ${bearingName(j.x - d.x, j.z - d.z)}, ${j.dist} · ${j.reward}g</small></div><button id="jobAccept">Accept</button></div>`;
    else html += '<small>Nothing today.</small>';
    html += `<div class="sec">COMMISSIONS (${state.quests.length}/3)</div>`;
    const mine = state.quests.filter((q) => q.giverId === d.id);
    for (const q of mine) {
      const need = questNeed(q), have = questProgress(q, state);
      html += `<div class="qrow"><div><b>${questIcon(q)} ${questTitle(q, dread)}</b><br><small>${have}/${need} · ${q.reward}g</small></div>${have >= need ? `<button data-hand="${q.id}">Hand in</button>` : ''}</div>`;
    }
    const offers = commissionsFor(world, d, state.serial[d.id + '#c'] || 0).filter((o) => !state.quests.some((x) => x.id === o.id));
    for (const o of offers) {
      const q = { ...o, base: 0 };
      html += `<div class="qrow"><div><b>${questIcon(o)} ${questTitle(q, dread)}</b><br><small>${o.type === 'crates' ? `lost ${bearingName(o.center.x - d.x, o.center.z - d.z)} of here · ` : ''}${o.reward}g</small></div><button data-accept="${o.id}" ${state.quests.length >= 3 ? 'disabled' : ''}>Accept</button></div>`;
    }
    if (!mine.length && !offers.length) html += '<small>The board is empty. Come back after you have been out to sea.</small>';
    const r = findRumour(world, d, state);
    if (r) html += `<div class="sec">RUMOURS</div><div class="qrow"><div><b>🗣 A sailor talks of buried treasure</b></div><button id="rumourBuy" ${state.gold >= RUMOUR_COST ? '' : 'disabled'}>${RUMOUR_COST}g</button></div>`;
    pane.innerHTML = html;
    const ja = $('jobAccept');
    if (ja) ja.addEventListener('click', () => { state.job = j; toast(`Delivery taken: ${j.toName} (+${j.reward}g)`, j.dark); audio.play('buy'); renderHarbour(); });
    pane.querySelectorAll('[data-hand]').forEach((b) => b.addEventListener('click', () => { handIn(state.quests.find((q) => q.id === b.dataset.hand), d); renderHarbour(); }));
    pane.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => { acceptCommission(offers.find((o) => o.id === b.dataset.accept)); renderHarbour(); }));
    const rb = $('rumourBuy');
    if (rb) rb.addEventListener('click', () => {
      if (state.gold < RUMOUR_COST) return;
      state.gold -= RUMOUR_COST;
      state.rumoured[r.d.id] = { name: r.d.name, x: Math.round(r.d.x), z: Math.round(r.d.z), source: `a drunk in ${d.name}`, found: false };
      toast(`Rumour: ${r.d.name}, ${bearingName(r.d.x - d.x, r.d.z - d.z)} of here, ~${Math.round(r.dist)} fathoms. Marked on your map.`, dread > 0.5, 7000);
      audio.play('buy'); renderHarbour();
    });
  } else if (hbTab === 'market') {
    const fishVal = Math.round(state.catch.reduce((a, f) => a + f.value, 0) * (1 + 0.05 * lvl));
    const fruitList = Object.entries(state.fruit).filter(([, n]) => n > 0);
    const fruitVal = Math.round(fruitList.reduce((a, [f, n]) => a + FRUITS[f].price * n, 0) * (1 + 0.05 * lvl));
    const ammoCost = Math.ceil(25 * discount(rep));
    html += `<div class="sec">STANDING HERE</div><small>${'★'.repeat(lvl)}${'☆'.repeat(3 - lvl)}${lvl ? `  (-${lvl * 5}% prices, +${lvl * 5}% for your catch)` : '  (visit and deliver to be remembered)'}</small>`;
    html += '<div class="sec">SELL</div>';
    html += `<div class="qrow"><div><b>🐟 Fish</b><br><small>${state.catch.length ? `${state.catch.length} in the hold` : 'none: slow down and press C at sea'}</small></div>${state.catch.length ? `<button id="sellFish">+${fishVal}g</button>` : ''}</div>`;
    html += `<div class="qrow"><div><b>🍌 Fruit</b><br><small>${fruitList.length ? fruitList.map(([f, n]) => `${n} ${plural(fruitName(f, dread), n)}`).join(', ') : 'none: press E at jungle isles'}</small></div>${fruitList.length ? `<button id="sellFruit">+${fruitVal}g</button>` : ''}</div>`;
    html += '<div class="sec">BUY</div>';
    html += `<div class="qrow"><div><b>💥 10 cannonballs</b><br><small>you have ${state.ammo}</small></div><button id="buyAmmo" ${state.gold >= ammoCost ? '' : 'disabled'}>${ammoCost}g</button></div>`;
    html += '<div class="sec">SHIPYARD</div><div class="qrow"><div><b>🎨 Paint, sails, pennants, figureheads</b></div><button id="openYard">Open</button></div>';
    pane.innerHTML = html;
    const sf = $('sellFish'); if (sf) sf.addEventListener('click', () => { state.gold += fishVal; toast(`Sold ${state.catch.length} fish for ${fishVal} gold.`); state.catch = []; audio.play('buy'); renderHarbour(); });
    const sfr = $('sellFruit'); if (sfr) sfr.addEventListener('click', () => { state.gold += fruitVal; toast(`Sold fruit for ${fruitVal} gold.`); state.fruit = {}; audio.play('buy'); renderHarbour(); });
    $('buyAmmo').addEventListener('click', () => { if (state.gold < ammoCost) return; state.gold -= ammoCost; state.ammo += 10; audio.play('buy'); renderHarbour(); });
    $('openYard').addEventListener('click', () => openModal('yard'));
  } else {
    html += UPGRADES.map((u, i) => {
      const lv = state.upgrades[u.id], maxed = lv >= MAX_LEVEL;
      const cost = maxed ? 0 : upCost(u, lv, rep);
      const can = !maxed && state.gold >= cost;
      return `<div class="qrow"><div><b>${i + 1}. ${u.name}</b> <span class="pips">${'■'.repeat(lv)}${'□'.repeat(MAX_LEVEL - lv)}</span><br><small>${maxed ? 'Fully upgraded' : u.text[lv]}</small></div><button data-id="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'MAX' : `${cost}g`}</button></div>`;
    }).join('');
    pane.innerHTML = html;
    pane.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => buyUpgrade(b.dataset.id)));
  }
}
$('hbTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && harbourIsl) { hbTab = b.dataset.t; renderHarbour(); } });
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
const windView = { dir: 0, strength: 1, gust: 0, floor: 0.27 };
function trackTarget() {
  if (state.job) return { x: state.job.x, z: state.job.z, label: state.job.toName };
  for (const q of state.quests) {
    if (q.type !== 'crates') continue;
    const open = q.crates.filter((c) => !c.got);
    if (!open.length) continue;
    if (Math.hypot(q.center.x - ship.pos.x, q.center.z - ship.pos.z) > 75) return { x: q.center.x, z: q.center.z, label: 'Lost crates' };
    let best = open[0];
    for (const c of open) if (Math.hypot(c.x - ship.pos.x, c.z - ship.pos.z) < Math.hypot(best.x - ship.pos.x, best.z - ship.pos.z)) best = c;
    return { x: best.x, z: best.z, label: 'Crate' };
  }
  const g = objectives.current, cell = g && ({ harbour: [0, -1], dig: [1, -1] })[g.id];
  if (cell) { const d = world.desc(cell[0], cell[1]); if (d) return { x: d.x, z: d.z, label: d.name }; }
  return null;
}
let trackNow = null;
function drawCompass(w, heading) {
  const jobA = trackNow ? Math.atan2(trackNow.x - ship.pos.x, -(trackNow.z - ship.pos.z)) : null;
  windView.dir = abyss.windDir(w.dir); windView.strength = w.strength; windView.gust = w.gust; windView.floor = abyss.windFloor(ship.mods.floor);
  drawWind(compass, windView, heading, performance.now() / 1000, jobA);
}

// mission tracker (Q)
const trackerEl = $('tracker');
let trackerHtml = null;
function updateTracker() {
  trackNow = trackTarget();
  const show = settings.tracker !== false && started && !modal;
  trackerEl.style.display = show ? 'block' : 'none';
  if (!show) return;
  const rows = [];
  const g = objectives.current;
  if (g) rows.push(`<div class="trow main"><i class="ico flag"></i>${g.title}</div>`);
  if (state.job) rows.push(`<div class="trow">\u{1F4EE} ${state.job.toName}</div>`);
  for (const q of state.quests) rows.push(`<div class="trow">${questIcon(q)} ${questTitle(q, dread)} <b>${questProgress(q, state)}/${questNeed(q)}</b></div>`);
  const html = rows.length ? abyss.hud('track', rows.join('')) + '<div class="thint">[Q] hide</div>' : '';
  if (html !== trackerHtml) { trackerHtml = html; trackerEl.innerHTML = html; }
  trackerEl.style.display = html ? 'block' : 'none';
}

// ---------------------------------------------------------------- game state
let dread = forced !== null ? forced : dreadAtDistance(Math.hypot(ship.pos.x, ship.pos.z));
let dark = dread > DARK_THRESHOLD;
let dig = null;     // { isl, t }
let tNow = 0;
let curSector = null;
let placeShown = '', lastSave = 0, lastNear = null, lastHour = Math.floor(state.time * 24);
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
  const fi = world.nearest(ship.pos.x, ship.pos.z, 14, ['jungle', 'sandbar']);
  if (fi) return { kind: 'fruit', key: 'fruit' + fi.desc.id, isl: fi };
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
    harbourIsl = tg.isl; hbTab = 'board';
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
        const loot = abyss.wrongLoot(lootFor(mulberry32(hash2(d.seed, 7, state.seed)), d.dread), state);
        loot.value = Math.round(loot.value * ship.mods.lootMul);
        state.dug.add(d.id); tg.isl.setDug(true); state.stats.treasures++; state.stats.solved++;
        state.gold += loot.value; state.loot.push(loot);
        toast(`Treasure! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
        audio.play('treasure');
      } };
      audio.play('dig');
    }
  } else if (tg.kind === 'fruit' && !dig) {
    const d = tg.isl.desc, f = fruitOf(d);
    if (state.harvest[d.id] != null && state.harvest[d.id] >= state.dayN) { toast(`The ${plural(fruitName(f, d.dread), 2)} here are picked clean for today.`, false, 3500); return; }
    dig = { key: tg.key, t: 0, need: 2.4, done: () => {
      const n = Math.max(1, Math.round((2 + Math.floor(Math.random() * 3)) * ship.mods.lootMul));
      state.fruit[f] = (state.fruit[f] || 0) + n; state.harvest[d.id] = state.dayN; state.stats.fruitPicked += n;
      toast(`The crew picked ${n} ${plural(fruitName(f, d.dread), n)}.`, d.dread > 0.5, 4500);
    } };
  } else if (tg.kind === 'ship') {
    hailShip(tg.s);
  } else if (tg.kind === 'wreck' && !dig) {
    const o = tg.o;
    dig = { key: tg.key, t: 0, need: 3.4 * ship.mods.digTime * (state.buffs.dig > 0 ? 0.7 : 1), done: () => {
      const loot = abyss.wrongLoot(lootFor(mulberry32(o.rngSeed), o.dread), state);
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
    const loot = abyss.wrongLoot(lootFor(rng, dread), state); loot.value = Math.round(loot.value * 0.6);
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
$('pbHint').addEventListener('click', () => { closeModal(); if (!abyss.maraHint()) objectives.askHint(dread); });

// ---------------------------------------------------------------- captain's log
const logbook = new Logbook({ abyss, state, world, ship, seed: state.seed, toast: (t) => toast(t), close: () => closeModal(), mate: objectives.mate, dread: () => dread,
  dropQuest: (id) => { state.quests = state.quests.filter((q) => q.id !== id); sea.syncQuests(state.quests); toast('Commission dropped.'); },
  skipGoal: () => { const g = objectives.current; if (!g) return; if (g.onDone) g.onDone({ state, world, ship, giveMap }); state.goals.i++; toast('Goal skipped.'); } });

// ---------------------------------------------------------------- main loop
const GLASS = new THREE.Color('#07030d');
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), _v = new THREE.Vector3();
let camHeading = ship.heading;
let lookUpK = 0;
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
  if (live) { const pt = state.time; state.time = (state.time + dt / DAY_LENGTH) % 1; if (state.time < pt) state.dayN++; }
  wind.update(dt);
  if (dt > 0) { state.buffs.speed = Math.max(0, state.buffs.speed - dt); state.buffs.dig = Math.max(0, state.buffs.dig - dt); }
  ship.buff = state.buffs.speed > 0 ? 1.15 : 1;
  const sec = sectorAt(ship.pos.x, ship.pos.z, state.seed);
  if (sec.id !== curSector) {
    curSector = sec.id;
    if (!state.sectorsSeen.includes(sec.id)) state.sectorsSeen.push(sec.id);
    if (live) toast(`Entering ${sec.name}: ${sec.faction.name} waters`, sec.dread > 0.5, 5000);
  }
  const windNow = { dir: wind.dir, strength: Math.min(1.4, wind.strength * (1 + 0.25 * weather.storm)) };
  if (live && wind.shifted()) toast(`The wind is shifting: now from the ${wind.fromName}`, false, 4200);

  // ---- ship
  shipInput.steer = (keys.has('KeyD') || keys.has('ArrowRight') || touch.R ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') || touch.L ? 1 : 0);
  shipInput.sail = (keys.has('KeyW') || keys.has('ArrowUp') || touch.U ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') || touch.D ? 1 : 0);
  if (!live) { shipInput.steer = 0; shipInput.sail = 0; }
  if (live && (keys.has('KeyZ') || keys.has('KeyX'))) { yawT += ((keys.has('KeyX') ? 1 : 0) - (keys.has('KeyZ') ? 1 : 0)) * dt * 1.8; lastCamInput = tNow; }
  if (keys.has('KeyV')) { yawT = 0; lastCamInput = tNow; }
  if (!drag && tNow - lastCamInput > 6) yawT += (0 - yawT) * Math.min(1, rawDt * 0.7);   // drifts back behind the boat after a while
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
  abyss.update(dt, { dread, live, camera, camYaw, ch: camHeading + camYaw });
  stage.wave *= abyss.waveMul;
  const waveT = abyss.waveTime(stepT);

  // ---- world
  const first = world.islands.size === 0;
  world.update(ship.pos.x, ship.pos.z, dark, first ? 200 : 2);
  const lp = abyss.lightPhase;
  world.setLit(lp === 'stare' ? true : lp === 'dead' ? false : tod.sunHeight < 0.12 || weather.darkness > 0.6);
  world.stare = lp === 'stare' ? ship.pos : null;
  world.tick(tNow, tod);
  horror.update(tNow, dread, ship.pos.x, ship.pos.z);
  ship.place(dt, waveT, stage.wave, dark, tod.night);
  const lifeCtx = { ship, dread, wave: stage.wave, audio, wind: windNow, stage, tod };
  if (live) state.stats.dist += ship.speed * dt;
  windfx.update(dt, tNow, windNow.dir, windNow.strength, ship.pos, tod.night, Math.min(1, weather.rain * 1.5));
  fishing.update(dt, waveT, { wave: stage.wave, dread, night: tod.night });
  combat.update(dt, waveT, { ship, traffic, wave: stage.wave, onHitEnemy, onHitPlayer: hurtPlayer });
  if (live && tNow - lastHit > 12 && state.hp < ship.mods.maxHp) state.hp = Math.min(ship.mods.maxHp, state.hp + dt);
  objectives.update(dt, dread);
  if (live) {
    if (tod.night > 0.35 || tod.twilight > 0.6) objectives.remark('dusk');
    if (weather.storm > 0.4) objectives.remark('storm'); else if (weather.rain > 0.4) objectives.remark('rain'); else if (weather.fog > 0.5) objectives.remark('fog');
    for (const [k, v] of [['stage2', 0.25], ['stage3', 0.5], ['stage4', 0.75], ['stage5', 0.95]]) if (dread >= v) objectives.remark(k, dread);
    if (traffic.ships.some((x) => x.hostile && x.engaged)) objectives.remark('raider');
  }
  fauna.update(dt, waveT, lifeCtx);
  traffic.update(dt, waveT, lifeCtx);
  sea.update(dt, waveT, lifeCtx);

  // ---- global shader state
  scene.fog.color.copy(stage.fog); scene.fog.near = stage.fogNear; scene.fog.far = stage.fogFar;
  U.uDread.value = dread; U.uTime.value = waveT; U.uLight.value = stage.light; U.uWave.value = stage.wave;
  U.uDeep.value.copy(stage.deep); U.uShallow.value.copy(stage.shallow);
  U.uSnap.value.set(post.internal.w * 0.5 * stage.snap, post.internal.h * 0.5 * stage.snap);
  mats.shallow.color.copy(stage.shallow).lerp(new THREE.Color(1, 1, 1), 0.25);
  mats.foam.color.set(0xffffff).lerp(stage.skyHorizon, 0.25);
  mats.foam.opacity = 0.55 + 0.25 * Math.sin(tNow * 1.8);
  mats.beam.color.set('#ffe080').lerp(new THREE.Color('#ff50d0'), smoothstep(0.5, 0.8, dread));
  mats.beam.opacity = 0.1 + 0.3 * tod.night;
  mats.wake.color.set(0xffffff).lerp(new THREE.Color(0.35, 1, 0.9), tod.night * 0.9).lerp(new THREE.Color(1, 0.4, 0.95), tod.night * smoothstep(0.55, 0.9, dread) * 0.8);
  sky.update(dt, camera, stage, wind.dir, tod, { rainbow: weather.rainbow, sun2: abyss.sun2 });
  ocean.material.opacity = 1 - 0.7 * abyss.seeThrough;
  if (abyss.seeThrough > 0) { U.uDeep.value.lerp(GLASS, 0.8 * abyss.seeThrough); U.uShallow.value.lerp(GLASS, 0.7 * abyss.seeThrough); }
  ocean.update(camera.position.x, camera.position.z);

  // ---- camera
  zoomT = Math.min(zoomT, ship.mods.zoomMax);
  zoom += (zoomT - zoom) * Math.min(1, rawDt * 5);
  pitch += (pitchT - pitch) * Math.min(1, rawDt * 5);
  lookUpK += ((abyss.lookUp ? 1 : 0) - lookUpK) * Math.min(1, rawDt * 0.6);
  const pitchNow = pitch + (0.3 - pitch) * lookUpK;
  camHeading += angleDiff(camHeading, ship.heading) * Math.min(1, rawDt * 1.6);
  camYaw += (yawT - camYaw) * Math.min(1, rawDt * 7);
  const ch = camHeading + camYaw;
  const fx = Math.sin(ch), fz = -Math.cos(ch);
  const back = zoom * Math.cos(pitchNow), up = zoom * Math.sin(pitchNow);
  camPos.set(ship.pos.x - fx * back, up + 1, ship.pos.z - fz * back);
  camLook.set(ship.pos.x + fx * zoom * 0.2, 1.5 + lookUpK * 9, ship.pos.z + fz * zoom * 0.2);
  if (shake > 0) { shake = Math.max(0, shake - rawDt * 1.8); camPos.x += Math.sin(tNow * 70) * shake; camPos.y += Math.cos(tNow * 63) * shake * 0.7; }
  if (dread > 0.85 && live) { const s = (dread - 0.85) * 0.5; camPos.x += Math.sin(tNow * 31) * s; camPos.y += Math.sin(tNow * 23 + 1) * s; }
  if (camOverride) { camPos.set(...camOverride.pos); camLook.set(...camOverride.look); }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  if (live || params.get('shot')) camera.rotateZ(abyss.roll(tNow));
  camera.updateMatrixWorld();

  // ---- discovery / interaction / dig
  const nearAny = world.nearest(ship.pos.x, ship.pos.z, 30);
  if (nearAny) {
    if (live) discover(nearAny);
    lastNear = nearAny;
  } else lastNear = null;
  const placeTxt = lastNear ? lastNear.desc.name : sec.name;
  const placeOut = abyss.hud('place', placeTxt);
  if (placeOut !== placeShown) { placeShown = placeOut; $('placeline').innerHTML = ''; const sp = document.createElement('span'); sp.textContent = placeOut; $('placeline').appendChild(sp); $('placeline').style.setProperty('--pxedge', lastNear ? '#120c1c' : sec.faction.color); }

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
        : tgt.kind === 'fruit' ? (state.harvest[tgt.isl.desc.id] != null && state.harvest[tgt.isl.desc.id] >= state.dayN ? 'Picked clean for today' : `[E] Pick ${plural(fruitName(fruitOf(tgt.isl.desc), tgt.isl.desc.dread), 2)}`)
        : tgt.kind === 'ship' ? (tgt.s.mode === 'derelict' ? `[E] Board the drifting ${KINDS[tgt.s.kind].label}` : tgt.s.mode === 'ghost' ? '[E] Hail the pale ship' : `[E] Hail the ${tgt.s.name}`)
        : '[E] Salvage the wreck';
    }
  } else promptEl.style.display = 'none';

  // ---- HUD
  goldEl.textContent = abyss.hud('gold', String(state.gold));
  $('clocktxt').textContent = abyss.hud('clock', tod.clock);
  $('abyssTag').style.display = abyss.solo ? 'block' : 'none';
  if (abyss.solo) $('abyssTag').textContent = `Testing: ${EFFECTS.find((f) => f.id === abyss.solo).name}  \u00b7  0 = stop`;
  updateTracker();
  $('clockicon').className = `ico ${tod.sunElev > 0 ? 'sun' : 'moon'}`;
  $('sailfill').style.width = `${Math.round(ship.trim * 100)}%`;
  drawCompass(wind, ship.heading);
  if (tNow > 18) helpEl.style.opacity = '0';
  if (modal === 'harbour') { $('hbGold').textContent = state.gold; }
  if (modal === 'ship') { $('shGold').textContent = state.gold; }
  if (debugEl.style.display === 'block') debugEl.textContent = `tris ${renderer.info.render.triangles} calls ${renderer.info.render.calls}  dread ${dread.toFixed(2)} stage ${stage.index + 1} ${forced !== null ? '(forced)' : '(auto)'}  time ${tod.clock}  pos ${ship.pos.x | 0},${ship.pos.z | 0}  spd ${ship.speed.toFixed(1)}  islands ${world.islands.size}`;

  $('hptxt').textContent = '';
  $('hpfill').style.width = `${Math.max(0, (state.hp / ship.mods.maxHp) * 100)}%`;
  $('ammotxt').textContent = `\u25cf ${state.ammo}`;
  $('reloadfill').style.width = `${100 - Math.min(100, (combat.reload / ship.mods.reload) * 100)}%`;
  const tgtE = combat.target(ship, traffic, 110);
  const eb = $('ebar');
  if (tgtE && live) {
    _v.set(tgtE.x, 5 * KINDS[tgtE.kind].scale + 3, tgtE.z).project(camera);
    if (_v.z < 1) { eb.style.display = 'block'; eb.style.left = `${(_v.x * 0.5 + 0.5) * window.innerWidth}px`; eb.style.top = `${(-_v.y * 0.5 + 0.5) * window.innerHeight}px`; $('ename').textContent = tgtE.name; $('efill').style.width = `${Math.max(0, (tgtE.hp / tgtE.maxHp) * 100)}%`; } else eb.style.display = 'none';
  } else eb.style.display = 'none';
  if (live) {
    const near = world.nearest(ship.pos.x, ship.pos.z, 45);
    audio.update(dt, { dread, speed: ship.speed / 11, night: tod.night, wind: wind.strength, rain: weather.rain, storm: weather.storm, surf: near ? clamp(1 - world.lastEdge / 45, 0, 1) : 0 });
    const hour = Math.floor(state.time * 24);
    if (hour !== lastHour) { lastHour = hour; if (world.nearest(ship.pos.x, ship.pos.z, 80, ['harbour'])) audio.play('bell', { vol: 0.6 }); }
  }

  // ---- save
  if (tNow - lastSave > 4 && !params.get('fresh')) {
    lastSave = tNow;
    store.set(SAVE_KEY, { seed: state.seed, gold: state.gold, dug: [...state.dug], discovered: state.discovered, loot: state.loot, upgrades: state.upgrades, collected: [...state.collected], notes: state.notes, rumoured: state.rumoured, rep: state.rep, job: state.job, serial: state.serial, sectorsSeen: state.sectorsSeen, jobHistory: state.jobHistory, buffs: state.buffs, stats: state.stats, quests: state.quests, fruit: state.fruit, harvest: state.harvest, dayN: state.dayN, hp: state.hp, ammo: state.ammo, custom: state.custom, owned: [...state.owned], riddles: state.riddles, attempts: state.attempts, catch: state.catch, fishLog: state.fishLog, goals: state.goals, hints: state.hints, time: state.time, windT: wind.t, pos: { x: ship.pos.x, z: ship.pos.z, h: ship.heading } });
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
  abyss, ship, world, state, begin, scene, camera, horror, renderer, wind, weather, fauna, traffic, sea, audio, fishing, combat, objectives, hurtPlayer, openModal, closeModal, buyUpgrade, refreshMods,
};
if (params.get('autostart')) begin();
frame();
