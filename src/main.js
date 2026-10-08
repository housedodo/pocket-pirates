import * as THREE from 'three';
import { clamp, smoothstep, angleDiff, mulberry32, hash2 } from './util.js';
import { sampleStage, DARK_THRESHOLD, dreadAtDistance } from './palette.js';
import { U, initMaterials, mats, PostFX } from './psx.js';
import { Ocean } from './ocean.js';
import { Sky } from './sky.js';
import { World, villager, VILLAGERS, houseKind, HOUSES } from './world.js';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
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
import { Hut } from './hut.js';
import { makePassenger, passengerTalk } from './passengers.js';
import { sectorAt, sectorInfo, sectorCoord, FACTIONS } from './sectors.js';
import { KINDS } from './traffic.js';
import { Fishing, fishById } from './fishing.js';
import { Combat } from './combat.js';
import { Objectives, MUSINGS, MAIN_GOALS, CHAPTERS, unlocked, gateRadius, chapterOf, goalText } from './objectives.js';
import { GROUPS, DEFAULT_CUSTOM, byId } from './customize.js';
import { Wind } from './wind.js';
import { WindFX } from './windfx.js';
import { drawWind, PX } from './windmeters.js';
import { installPixelUI, pxi } from './pixelui.js';
import { applyTimeOfDay, advanceTime, tod } from './daynight.js';
import { UPGRADES, MAX_LEVEL, computeMods, shipwrightLine } from './upgrades.js';
import { TRAITS, crewForHire, crewBonus, hasTrait, rollCheck, drawCard, renderCard, Pig } from './tabletop.js';
import { FISH } from './fishing.js';
import { Abyss, EFFECTS, WATCHER_STYLES, WATCHER_NAMES } from './abyss.js';

// ---------------------------------------------------------------- params, save, settings
const params = new URLSearchParams(location.search);
let noSave = false;
const SAVE_KEY = 'pocket-pirates-save-v1', SETTINGS_KEY = 'pocket-pirates-settings-v1';
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* private mode etc. */ } },
};
const saved = params.get('fresh') ? null : store.get(SAVE_KEY);
const DEV = !!params.get('dev');   // ?dev=1: test keys (1-5 dread, 0, [ ], `) and the full-dread effects menu
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
  story: (saved && saved.story) || {},              // chapter flags: perrinNote, check, b0, hutKnown, hutNod, demoEnd, free
  hints: (saved && saved.hints) || {},
  hut: (saved && saved.hut) || null,
  passenger: (saved && saved.passenger) || null,
  crew: (saved && saved.crew) || [],                // hired hands (max 2), each with a trait and a wish
  cardsSeen: (saved && saved.cardsSeen) || [],
  haggle: (saved && saved.haggle) || null,   // someone paying for passage
  tracked: (saved && saved.tracked) || null,       // the one errand shown on the tracker and wind meter: 'job' | 'passenger' | quest id          // the dark hut storyline: every throw is remembered
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
sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));
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
    const cur = objectives.current, hutNote = cur && cur.id === 'bottles' ? HUT_NOTES[(state.stats.bottles - (state.story.b0 || 0)) % HUT_NOTES.length] : null;
    const text = hutNote || bottleNote(mulberry32(hash2(e.o.x | 0, e.o.z | 0, state.seed + 3)), Math.min(4, Math.floor(e.o.dread * 5)));
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
const objectives = new Objectives({ state, world, ship, toast: (t, d) => toast(t, d), giveMap,
  chapterCard: (ch) => { const el = $('landho'); el.querySelector('b').textContent = `CHAPTER ${ch.n}`; el.querySelector('span').textContent = ch.title; el.querySelector('small').textContent = ch.act; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); audio.play('bell', { vol: 0.4 }); },
  onStep: (done, next) => { if (done.id === 'gossip') revealHut(); } });
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

// ---------------------------------------------------------------- the dark hut (storyline minigame)
let glitchT = 0, preGlitch = 0;
const hut = new Hut({ state,
  onWin: (n) => { if (n === 20) toast('A natural twenty. Somewhere far below, something is disappointed.', true, 5000); },
  onFail: () => { preGlitch = dread; glitchT = 0.75; hutEl.classList.add('glitching'); shake = 0.4; },
  onClose: () => closeModal() });
function hutLeft() {
  const h = state.hut;
  if (!h) return;
  if (h.rolls.length && !state.story.demoEnd) { state.story.demoEnd = true; setTimeout(showDemoEnd, 2500); }
  if (h.visits === 1) objectives.mate.say('I did not like that, Captain. She never blinked. Not once.', true);
  else if (h.fails === 3 && !h.toldThree) { h.toldThree = true; objectives.mate.say('Three times now. Captain... what is she writing down?', true); }
}

// ---------------------------------------------------------------- modal state (pause / chart / harbour)
let modal = null; // null | 'pause' | 'chart' | 'harbour' | 'ship'
let logTab = 'map';
let tradeShip = null;
const yardEl = $('yardmodal'), hutEl = $('hutmodal'), cardEl = $('card'), pigEl = $('pig');
let harbourIsl = null;
const keys = new Set();
let started = false;

function openModal(name) {
  if (!started) return;
  closeModal(true);
  modal = name;
  keys.clear();
  if (fishing.active) fishing.cancel();
  ({ pause: pauseEl, chart: chartEl, harbour: harbourEl, ship: shipEl, yard: yardEl, hut: hutEl, card: cardEl, pig: pigEl })[name].classList.add('open');
  if (name === 'pause') { showPauseMain(); }
  if (name === 'chart') { abyss.onMapOpen(ship); logbook.open(logTab);
    if (state.story.hutNod === 'pending') { state.story.hutNod = 'done'; setTimeout(() => objectives.mate.say('Captain... was that hut always on our chart? I did not draw it. Did you draw it?', true), 1800); } }
  if (name === 'harbour') renderHarbour();
  if (name === 'ship') renderShipTrade();
  if (name === 'yard') renderYard();
  if (name === 'hut') hut.open();
  audio.play(name === 'pause' ? 'pause' : 'ui');
  audio.setPaused(name === 'pause');
}
function closeModal(silent = false) {
  if (!modal) return;
  pauseEl.classList.remove('open'); chartEl.classList.remove('open'); harbourEl.classList.remove('open'); shipEl.classList.remove('open'); yardEl.classList.remove('open'); hutEl.classList.remove('open'); cardEl.classList.remove('open'); pigEl.classList.remove('open');
  if (modal === 'pause') audio.setPaused(false);
  if (modal === 'hut') hutLeft();
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
  if (modal === 'card') {
    if ($('roll').classList.contains('open')) return;
    if (cardBusy === 'done' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) { closeModal(); return; }
    const n = parseInt(e.key, 10); if (!cardBusy && n >= 1) { const b = cardEl.querySelectorAll('#cardChoices button')[n - 1]; if (b) b.click(); }
    return;
  }
  if (modal === 'pig') {
    if (e.code === 'Space') { e.preventDefault(); pig.roll(); }
    if (e.code === 'KeyH') pig.hold();
    if (e.code === 'KeyE') $('pigLeave').click();
    return;
  }
  if (modal === 'hut') {
    if (e.code === 'Space') { e.preventDefault(); hut.roll(); }
    if (e.code === 'KeyE') closeModal();
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
  if (e.code === 'KeyC' && unlocked(state, 'fish')) fishing.press();
  if (e.code === 'KeyY' && !abyss.maraHint()) objectives.askHint(dread);
  if (e.code === 'Enter') objectives.mate.skip();
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'KeyH') $('hud').classList.toggle('hidden');
  if (e.code === 'KeyG' && !modal && started && unlocked(state, 'oars')) { ship.rowing = !ship.rowing; toast(ship.rowing ? 'Oars out' : 'Oars in, sails up', false, 2200); if (ship.rowing) objectives.remark('oars', dread); }
  if (e.code === 'KeyQ' && !modal) { settings.tracker = settings.tracker === false; store.set(SETTINGS_KEY, settings); }
  if (!DEV) return;   // test keys only with ?dev=1
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
const PITCH_MIN = 0.06;   // low, almost level with the deck: the view tilts up to the sky instead of dipping under the hull
let pitch = parseFloat(params.get('pitch') || '0.72'), pitchT = pitch;
canvas.addEventListener('wheel', (e) => { zoomT = clamp(zoomT * (1 + Math.sign(e.deltaY) * 0.1), 14, ship.mods.zoomMax); e.preventDefault(); }, { passive: false });
let drag = null;
let yawT = 0, camYaw = 0, lastCamInput = -99;   // orbit around the boat (drag sideways, Z / X, V resets)
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY, p: pitchT, yaw: yawT }; lastCamInput = tNow; canvas.setPointerCapture(e.pointerId); });
canvas.addEventListener('pointermove', (e) => { if (drag && !modal) { pitchT = clamp(drag.p + (e.clientY - drag.y) * 0.006, PITCH_MIN, 1.35); yawT = drag.yaw - (e.clientX - drag.x) * 0.008; lastCamInput = tNow; } });
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
  $('pbNew').textContent = 'New voyage (erase save)';
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
if (!DEV) { $('pbAbyss').style.display = 'none'; settings.abyss = {}; }   // players get every effect, no test menu
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
  sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));
  state.stats.commissions = (state.stats.commissions || 0) + 1;
  toast(`Commission done: ${questTitle(q, dread)} (+${q.reward} gold)`, dread > 0.5, 6000);
  audio.play('treasure');
}
function acceptCommission(o) {
  if (state.quests.length >= 3 || state.quests.some((x) => x.id === o.id)) return;
  const q = { ...o, base: o.type === 'bounty' ? state.stats.sunk : o.type === 'spot' ? state.stats[o.what] : 0 };
  if (q.crates) q.crates = q.crates.map((c) => ({ ...c }));
  state.quests.push(q);
  if (!state.tracked) state.tracked = q.id;
  sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));
  toast(`Commission taken: ${questTitle(q, dread)}`, false, 5000);
  audio.play('buy');
}

const REST_LINES = ['You sleep like a stone. Gulls wake you at dawn.', 'Somebody snored all night. Possibly you.', 'You dream of warm water and wake up hungry.'];
const REST_DARK = ['You sleep. Someone sat by your bed all night; the chair is still warm.', 'You wake at dawn. Your boots are wet, and full of sand you do not recognise.',
  'You sleep well. The innkeeper says you talked all night, in a voice that was not yours.', 'Your room had two beds. In the morning, both were slept in.'];
function restAtTavern(cost) {
  if (state.gold < cost) return;
  state.gold -= cost;
  const dk = dread > 0.6;
  closeModal();
  $('fade').classList.add('on');
  setTimeout(() => {
    if (state.time * 24 >= 6) state.dayN++;    // slept past midnight
    state.time = 6 / 24;
    state.hp = ship.mods.maxHp;
    $('fade').classList.remove('on');
    toast(dk ? REST_DARK[Math.floor(Math.random() * REST_DARK.length)] : REST_LINES[Math.floor(Math.random() * REST_LINES.length)], dk, 6000);
    objectives.remark('rested', dread);
  }, 1100);
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
    // finish what you came for first: deliveries, passengers and finished commissions for this harbour
    const due = [];
    if (state.job && state.job.toId === d.id) due.push(`<div class="qrow"><div><b>${pxi('letter')} Deliver ${state.job.item}</b><br><small>+${state.job.reward}g</small></div><button id="doDeliver">Deliver</button></div>`);
    if (state.passenger && state.passenger.toId === d.id) due.push(`<div class="qrow"><div><b>${pxi('talk')} ${state.passenger.name} goes ashore</b><br><small>+${state.passenger.reward}g fare</small></div><button id="doDropoff">Drop off</button></div>`);
    for (const q of state.quests.filter((x) => x.giverId === d.id && questProgress(x, state) >= questNeed(x))) due.push(`<div class="qrow"><div><b>${questIcon(q)} ${questTitle(q, dread)}</b><br><small>done · +${q.reward}g</small></div><button data-hand="${q.id}">Finish</button></div>`);
    if (due.length) html += `<div class="sec">FINISH HERE</div>${due.join('')}`;
    html += '<div class="sec">DELIVERY</div>';
    const j = state.job || makeJob(world, d, state.serial[d.id] || 0);
    if (state.job) html += `<div class="qrow"><div><b>${pxi('letter')} ${state.job.item}</b><br><small>to ${state.job.toName} · ${bearingName(state.job.x - d.x, state.job.z - d.z)}</small></div><small>${state.job.reward}g</small></div>`;
    else if (j) html += `<div class="qrow"><div><b>${pxi('letter')} ${j.item}</b><br><small>to ${j.toName} · ${bearingName(j.x - d.x, j.z - d.z)}, ${j.dist} · ${j.reward}g</small></div><button id="jobAccept">Accept</button></div>`;
    else html += '<small>Nothing today.</small>';
    html += `<div class="sec">COMMISSIONS (${state.quests.length}/3)</div>`;
    const mine = state.quests.filter((q) => q.giverId === d.id);
    for (const q of mine) {
      const need = questNeed(q), have = questProgress(q, state);
      if (have < need) html += `<div class="qrow"><div><b>${questIcon(q)} ${questTitle(q, dread)}</b><br><small>${have}/${need} · ${q.reward}g</small></div></div>`;
    }
    const offers = commissionsFor(world, d, state.serial[d.id + '#c'] || 0).filter((o) => !state.quests.some((x) => x.id === o.id));
    for (const o of offers) {
      const q = { ...o, base: 0 };
      html += `<div class="qrow"><div><b>${questIcon(o)} ${questTitle(q, dread)}</b><br><small>${o.type === 'crates' ? `lost ${bearingName(o.center.x - d.x, o.center.z - d.z)} of here · ` : ''}${o.reward}g</small></div><button data-accept="${o.id}" ${state.quests.length >= 3 ? 'disabled' : ''}>Accept</button></div>`;
    }
    if (!mine.length && !offers.length) html += '<small>The board is empty. Come back after you have been out to sea.</small>';
    const pass = !state.passenger && unlocked(state, 'passengers') && makePassenger(world, d, (state.serial[d.id + '#p'] || 0) + state.dayN * 7);
    if (pass) html += `<div class="sec">PASSAGE</div><div class="qrow"><div><b>${pxi('talk')} ${pass.name}, ${pass.who}</b><br><small>wants passage to ${pass.toName} · pays ${pass.reward}g</small></div><button id="takePass">Take aboard</button></div>`;
    const r = findRumour(world, d, state);
    if (r) html += `<div class="sec">RUMOURS</div><div class="qrow"><div><b>${pxi('talk')} A sailor talks of buried treasure</b></div><button id="rumourBuy" ${state.gold >= RUMOUR_COST ? '' : 'disabled'}>${RUMOUR_COST}g</button></div>`;
    pane.innerHTML = html;
    const ja = $('jobAccept');
    if (ja) ja.addEventListener('click', () => { state.job = j; toast(`Delivery taken: ${j.toName} (+${j.reward}g)`, j.dark); audio.play('buy'); renderHarbour(); });
    const dv = $('doDeliver'); if (dv) dv.addEventListener('click', () => { completeJobIfHere(d); renderHarbour(); });
    const dp = $('doDropoff'); if (dp) dp.addEventListener('click', () => {
      const p = state.passenger; state.gold += p.reward; state.passenger = null; state.stats.passengers = (state.stats.passengers || 0) + 1;
      repOf(state, d.id).deliveries++; toast(`${p.name} waves goodbye from the pier. (+${p.reward}g)`, false, 6000); audio.play('treasure'); renderHarbour(); });
    const tp = $('takePass'); if (tp) tp.addEventListener('click', () => {
      state.passenger = pass; state.serial[d.id + '#p'] = (state.serial[d.id + '#p'] || 0) + 1; state.tracked = 'passenger';
      toast(`${pass.name} comes aboard, bound for ${pass.toName}.`, false, 5000); renderHarbour(); });
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
    const hg = state.haggle && state.haggle.id === d.id && state.haggle.day === state.dayN ? state.haggle : null, hm = hg ? hg.mult : 1;
    const fishVal = Math.round(state.catch.reduce((a, f) => a + f.value, 0) * (1 + 0.05 * lvl) * hm);
    const fruitList = Object.entries(state.fruit).filter(([, n]) => n > 0);
    const fruitVal = Math.round(fruitList.reduce((a, [f, n]) => a + FRUITS[f].price * n, 0) * (1 + 0.05 * lvl) * hm);
    const ammoCost = Math.ceil(25 * discount(rep));
    { // the tavern: rooms are let from 17:00, you wake at 06:00 with the hull mended
      const hour = state.time * 24, open = hour >= 17 || hour < 5, bedCost = Math.ceil(8 * discount(rep));
      html += `<div class="sec">TAVERN</div><div class="qrow"><div><b>${pxi('bed')} A bed for the night</b><br><small>${open ? 'sleep until 06:00, the crew mends the hull' : 'rooms are let from 17:00'}</small></div><button id="restBed" ${open && state.gold >= bedCost ? '' : 'disabled'}>${bedCost}g</button></div>`;
    }
    if (unlocked(state, 'crew')) { // hands for hire, and dice with the locals
      const hand = crewForHire(d, state.dayN, state, world);
      if (hand && !state.crew.some((c) => c.name === hand.name)) html += `<div class="qrow"><div><b>${pxi('talk')} ${hand.name}, ${hand.look}</b><br><small>${TRAITS[hand.trait].name}: ${TRAITS[hand.trait].text} · ${hand.wish.text}</small></div><button id="hireHand" ${state.gold >= hand.cost && state.crew.length < 2 ? '' : 'disabled'}>${state.crew.length < 2 ? `Hire ${hand.cost}g` : 'Crew full'}</button></div>`;
      for (const c of state.crew) html += `<div class="qrow"><div><b>${pxi('talk')} ${c.name}</b> <small>(${TRAITS[c.trait].name})</small></div><button data-dismiss="${c.name}">Let go</button></div>`;
      html += `<div class="qrow"><div><b>${pxi('pip')} Dice with the locals</b><br><small>first to 30 · stake 10g</small></div><button id="playPig" ${state.gold >= 10 ? '' : 'disabled'}>Sit down</button></div>`;
      pendingHand = hand;
    }
    html += `<div class="sec">STANDING HERE</div><small>${pxi('star').repeat(lvl)}${pxi('nostar').repeat(3 - lvl)}${lvl ? `  (-${lvl * 5}% prices, +${lvl * 5}% for your catch)` : '  (visit and deliver to be remembered)'}</small>`;
    html += '<div class="sec">SELL</div>';
    if (unlocked(state, 'haggle')) html += `<div class="qrow"><div><b>${pxi('coin')} Haggle</b><br><small>${hg ? (hm > 1 ? `they pay ${Math.round((hm - 1) * 100)}% more today` : 'they are offended: 10% less today') : 'a talk roll, once a day: 12 or more'}</small></div>${hg ? '' : '<button id="haggle">Roll</button>'}</div>`;
    html += `<div class="qrow"><div><b>${pxi('fish')} Fish</b><br><small>${state.catch.length ? `${state.catch.length} in the hold` : 'none: slow down and press C at sea'}</small></div>${state.catch.length ? `<button id="sellFish">+${fishVal}g</button>` : ''}</div>`;
    html += `<div class="qrow"><div><b>${pxi('banana')} Fruit</b><br><small>${fruitList.length ? fruitList.map(([f, n]) => `${n} ${plural(fruitName(f, dread), n)}`).join(', ') : 'none: press E at jungle isles'}</small></div>${fruitList.length ? `<button id="sellFruit">+${fruitVal}g</button>` : ''}</div>`;
    html += '<div class="sec">BUY</div>';
    html += `<div class="qrow"><div><b>${pxi('ball')} 10 cannonballs</b><br><small>you have ${state.ammo}</small></div><button id="buyAmmo" ${state.gold >= ammoCost ? '' : 'disabled'}>${ammoCost}g</button></div>`;
    html += `<div class="sec">SHIPYARD</div><div class="qrow"><div><b>${pxi('paint')} Paint, sails, pennants, figureheads</b></div><button id="openYard">Open</button></div>`;
    pane.innerHTML = html;
    const sf = $('sellFish'); if (sf) sf.addEventListener('click', () => { state.gold += fishVal; toast(`Sold ${state.catch.length} fish for ${fishVal} gold.`); state.catch = []; audio.play('buy'); renderHarbour(); });
    const sfr = $('sellFruit'); if (sfr) sfr.addEventListener('click', () => { state.gold += fruitVal; toast(`Sold fruit for ${fruitVal} gold.`); state.fruit = {}; audio.play('buy'); renderHarbour(); });
    $('buyAmmo').addEventListener('click', () => { if (state.gold < ammoCost) return; state.gold -= ammoCost; state.ammo += 10; audio.play('buy'); renderHarbour(); });
    $('openYard').addEventListener('click', () => openModal('yard'));
    $('restBed').addEventListener('click', () => restAtTavern(Math.ceil(8 * discount(rep))));
    const hh = $('hireHand'); if (hh) hh.addEventListener('click', () => {
      const h = pendingHand; if (!h || state.gold < h.cost || state.crew.length >= 2) return;
      state.gold -= h.cost; state.crew.push(h); audio.play('buy'); toast(`${h.name} signs on. ${h.name} nods once and says nothing.`, false, 5000); objectives.remark('crew', dread); renderHarbour(); });
    pane.querySelectorAll('[data-dismiss]').forEach((b) => b.addEventListener('click', () => { state.crew = state.crew.filter((c) => c.name !== b.dataset.dismiss); toast(`${b.dataset.dismiss} goes ashore with a small wave.`); renderHarbour(); }));
    if ($('playPig')) $('playPig').addEventListener('click', () => { if (state.gold < 10) return; state.gold -= 10; const isl = harbourIsl; openModal('pig'); pigHome = isl; pig.start(LOCALS[Math.floor(Math.random() * LOCALS.length)], 10); });
    const hgb = $('haggle'); if (hgb) hgb.addEventListener('click', () => {
      rollCheck(state, { label: 'Talk', kind: 'talk', dc: 12, extra: lvl ? [['standing', lvl]] : [] }, (ok, n) => {
        state.haggle = { id: d.id, day: state.dayN, mult: ok ? (n === 20 ? 1.5 : 1.3) : 0.9 };
        toast(ok ? 'The fishmonger laughs and gives in.' : 'The fishmonger folds their arms. Prices just got worse.', false, 4000); if (harbourIsl) renderHarbour(); }); });
  } else {
    html += UPGRADES.map((u, i) => {
      const lv = state.upgrades[u.id], maxed = lv >= MAX_LEVEL;
      const cost = maxed ? 0 : upCost(u, lv, rep);
      const can = !maxed && state.gold >= cost;
      return `<div class="qrow"><div><b>${i + 1}. ${u.name}</b> <span class="pips">${pxi('pip').repeat(lv)}${pxi('nopip').repeat(MAX_LEVEL - lv)}</span><br><small>${maxed ? 'Fully upgraded' : u.text[lv]}</small></div><button data-id="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'MAX' : `${cost}g`}</button></div>`;
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
function trackedOne() {
  const t = state.tracked;
  if (t === 'job' && state.job) return 'job';
  if (t === 'passenger' && state.passenger) return 'passenger';
  if (t && state.quests.some((q) => q.id === t)) return t;
  state.tracked = state.passenger ? 'passenger' : state.job ? 'job' : state.quests.length ? state.quests[0].id : null;
  sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));   // only the followed errand's crates float
  return state.tracked;
}
function trackTarget() {
  const tr = trackedOne();
  if (tr === 'job') return { x: state.job.x, z: state.job.z, label: state.job.toName };
  if (tr === 'passenger') return { x: state.passenger.x, z: state.passenger.z, label: state.passenger.toName };
  for (const q of state.quests) {
    if (q.id !== tr) continue;
    if (questProgress(q, state) >= questNeed(q)) { const [cx, cz] = q.giverId.split(',').map(Number), gd = world.desc(cx, cz); if (gd) return { x: gd.x, z: gd.z, label: q.giverName }; }
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
  if (g) { const ch = CHAPTERS[g.ch]; rows.push(`<div class="thint">${ch.n} · ${ch.title}</div><div class="trow main"><i class="ico flag"></i>${g.title}</div>`); }
  const tr = trackedOne(), others = (state.job ? 1 : 0) + (state.passenger ? 1 : 0) + state.quests.length - (tr ? 1 : 0);
  if (tr === 'job') rows.push(`<div class="trow">${pxi('letter')} ${state.job.toName}</div>`);
  else if (tr === 'passenger') rows.push(`<div class="trow">${pxi('talk')} ${state.passenger.name} to ${state.passenger.toName}</div>`);
  else { const q = state.quests.find((x) => x.id === tr); if (q) rows.push(`<div class="trow">${questIcon(q)} ${questTitle(q, dread)} <b>${questProgress(q, state)}/${questNeed(q)}</b></div>`); }
  if (others > 0) rows.push(`<div class="thint">+${others} more in the log (J)</div>`);
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
const sighted = new Set();
let lastSighting = 0;
const SIGHT_WORDS = { harbour: 'a village', jungle: 'a jungle isle', sandbar: 'a sandbar', rocky: 'a rock', treasure: 'an old arch on the shore', volcano: 'a smoking mountain', atoll: 'a ring of sand', mangrove: 'a mangrove isle' };
function landHo(d) {
  const el = $('landho');
  el.querySelector('b').textContent = d.dread > 0.6 ? 'LAND?' : 'LAND HO!';
  el.querySelector('span').textContent = d.name;
  el.querySelector('small').textContent = SIGHT_WORDS[d.type] || 'an island';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  if (d.id !== '0,-1') objectives.remark(`sight_${d.type}`, dread);
}
let placeShown = '', lastSave = 0, lastNear = null, lastHour = Math.floor(state.time * 24);
const shipInput = { steer: 0, sail: 0 };

function fireCannons() {
  const r = combat.playerFire(ship, traffic, state, ship.mods);
  if (r === 'ammo') { toast('Out of cannonballs! Buy more at a harbour.'); objectives.remark('noammo'); }
  else if (r === 'target') objectives.remark('notarget');
}

function getInteract() {
  const hi = world.nearest(ship.pos.x, ship.pos.z, 18);
  if (hi && hi.desc.hut) return { kind: 'hut', key: 'hut', isl: hi };
  // a harbour is entered at its pier; anywhere else along its shore you only get a hint
  const hb = world.nearest(ship.pos.x, ship.pos.z, 30, ['harbour']);
  if (hb) {
    const d = hb.desc, dk = d.dock;
    if (dk && Math.hypot(ship.pos.x - (d.x + dk.x), ship.pos.z - (d.z + dk.z)) < 13) return { kind: 'harbour', key: d.id, isl: hb };
    if (world.lastEdge < 16) return { kind: 'harbourfar', key: d.id, isl: hb };
  }
  const isl = world.nearest(ship.pos.x, ship.pos.z, 16, ['treasure']);
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
  const wet = weather.storm > 0.35 ? Math.round(j.reward * 0.6) : 0;   // delivered through a storm: they pay extra
  j.reward += wet; if (wet) objectives.remark('stormpay', dread);
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
  if (tg.kind === 'hut') { if (!state.story.hutKnown) { toast('Nobody answers. Inside, a pen scratches, then stops.', true, 4500); return; } openModal('hut'); return; }
  if ((tg.kind === 'treasure' || tg.kind === 'fruit' || tg.kind === 'wreck') && ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; }
  if (tg.kind === 'harbour') {
    const d = tg.isl.desc, rep = repOf(state, d.id);
    if (!rep.last || Date.now() - rep.last > 120000) rep.visits++;
    rep.last = Date.now();
    state.stats.harbours++;
    if (state.hp < ship.mods.maxHp) { state.hp = ship.mods.maxHp; toast('The harbour crew patches up your hull for free.', false, 3000); }
    const rng = mulberry32(hash2(d.seed, Math.floor(tNow / 8), 3));
    const idx = Math.min(4, Math.floor(dread * 5)), lvl = friendLevel(rep);
    const hello = idx >= 3 ? 'We remember you. We always remember you.' : lvl >= 3 ? 'Our favourite captain! Your usual discount, of course.' : rep.visits > 1 ? 'Back again, captain!' : 'A new face. Welcome!';
    harbourLine = `${hello}\n${gossip(rng, idx, d.name)}\nShipwright: ${shipwrightLine(rng, idx)}`;
    { const cur = objectives.current;
      if (cur && cur.id === 'perrin' && d.id === '0,-1' && !state.story.perrinNote) perrinNote();
      if (cur && cur.id === 'gossip' && d.id !== '0,-1' && !state.story.hutKnown) { state.story.hutKnown = true; harbourLine = `${hello}\nAn old fisher leans in: "The black hut? Out past the ${bearingName(world.hutDesc.x - d.x, world.hutDesc.z - d.z)} water. Do not sit down. Whatever she offers, do not sit."\nShipwright: ${shipwrightLine(rng, idx)}`; } }
    harbourIsl = tg.isl; hbTab = 'board';
    for (const c of state.crew) if (c.wish && !c.wish.done && c.wish.kind === 'harbour' && c.wish.id === tg.isl.desc.id) wishDone(c);
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
    const lines = [wind.fromName ? `Winds from the ${wind.fromName}, they say, and shifting.` : '', weather.storm > 0.3 || weather.stormAhead > 0.3 ? 'Watch the evening sky. Red means a blow.' : weather.rain > 0.3 ? 'Rain all week out east.' : 'Fair skies for the next day or so.', tod.night > 0.5 ? 'Keep to the lit harbours after dark.' : 'Lighthouses burn only after dusk, so mind your hour.'];
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
// Weather that pushes back: storms shove the ship sideways and waves hitting the side wear the hull;
// a dead calm leaves only the oars. Thick fog (later in the voyage) fogs the instruments too.
let stormWear = 0, bellT = 0;
function stormAndCalm(dt) {
  const st = weather.storm, sail = ship.trim;
  if (st > 0.15) {
    const gust = 0.6 + 0.4 * Math.sin(tNow * 0.9) * Math.sin(tNow * 2.3);
    const push = st * gust * (2.4 + 3.2 * sail) * (ship.rowing ? 0.6 : 1) * dt;                  // shoved downwind, more with the sail up
    ship.pos.x += Math.sin(wind.dir) * push; ship.pos.z -= Math.cos(wind.dir) * push;
    const side = Math.abs(Math.sin(angleDiff(ship.heading, wind.dir)));   // waves run with the wind
    if (st > 0.4 && side > 0.6) {
      stormWear += dt * st * (side - 0.5) * (0.6 + 1.6 * sail) * 1.4 * (hasTrait(state, 'salt') ? 0.5 : 1);
      if (stormWear >= 4) { stormWear = 0; hurtPlayer(3); objectives.remark('broadside', dread); }
    }
  }
  if (weather.calm > 0.5) {
    objectives.remark('calm', dread);
  }
  if (weather.redSky > 0.4) objectives.remark('redsky', dread);
  const thick = weather.fog > 0.5 && (state.dayN >= 3 || dread > 0.3);
  document.body.classList.toggle('fogged', thick);
  if (thick) {
    objectives.remark('thickfog', dread);
    if ((bellT -= dt) <= 0) { bellT = 14 + Math.random() * 8; audio.play('bell', { vol: 0.5 }); }
  }
}

// ---------------------------------------------------------------- tabletop: encounter cards, crew wishes, dice
const LOCALS = ['a one-eyed net-mender', 'the harbourmaster\'s aunt', 'a sunburnt docker', 'a very calm child', 'a fisherman who smells of tar'];
let pendingHand = null, pigHome = null, cardT = 150 + Math.random() * 120, cardBusy = false, wishT = 0;
const pig = new Pig(pigEl, { onEnd: (won) => { if (won) { state.gold += 20; audio.play('treasure'); if (Math.random() < 0.5) { const r = cardCtx().rumour('a sore loser at the tavern'); if (r) toast(r, false, 7000); } } } });
$('pigRoll').addEventListener('click', () => pig.roll());
$('pigHold').addEventListener('click', () => pig.hold());
$('pigLeave').addEventListener('click', () => { if (pig.busy) return; closeModal(); if (pigHome) { harbourIsl = pigHome; hbTab = 'market'; openModal('harbour'); } });
$('cardDone').addEventListener('click', () => closeModal());
function cardCtx() {
  return {
    state, FISH,
    hurt: (n) => hurtPlayer(n),
    glitch: () => { preGlitch = dread; glitchT = 0.75; shake = 0.4; },
    repNear: () => { const h = world.nearest(ship.pos.x, ship.pos.z, 900, ['harbour']); if (h) repOf(state, h.desc.id).deliveries++; },
    rumour: (src) => { const r = findRumour(world, { x: ship.pos.x, z: ship.pos.z }, state); if (!r) return null;
      state.rumoured[r.d.id] = { name: r.d.name, x: Math.round(r.d.x), z: Math.round(r.d.z), source: src, found: false };
      return `A map: treasure on ${r.d.name}, ${bearingName(r.d.x - ship.pos.x, r.d.z - ship.pos.z)} of here. Marked on your chart.`; },
    castaway: () => {
      if (state.crew.length >= 2) { cardCtx().repNear(); return 'They are dropped off at the next harbour with a story to tell. Your crew is full.'; }
      const ids = Object.keys(TRAITS), names = ['Wren', 'Old Ibbs', 'Salt Annie', 'Pim'];
      const c = { name: names.find((n) => !state.crew.some((x) => x.name === n)) || 'Pim', look: 'still salty from the raft', trait: ids[Math.floor(Math.random() * ids.length)], wish: { kind: 'volcano', text: 'wants to see a fire mountain', done: false }, cost: 0 };
      state.crew.push(c); return `${c.name} climbs aboard, drinks a whole bucket of water, and picks up a rope. (${TRAITS[c.trait].name} joins the crew.)`;
    },
  };
}
function openCard() {
  const card = drawCard(dread, state.cardsSeen); if (!card) return;
  state.cardsSeen.push(card.id); if (state.cardsSeen.length > 5) state.cardsSeen.shift();
  cardBusy = false; openModal('card'); audio.play('bottle');
  const out = (t) => { $('cardOut').textContent = t; $('cardDone').style.display = ''; cardEl.querySelectorAll('#cardChoices button').forEach((b) => { b.disabled = true; }); cardBusy = 'done'; };
  renderCard(card, (ch) => {
    if (cardBusy) return; cardBusy = true;
    if (!ch.check) { out(ch.go(cardCtx())); return; }
    rollCheck(state, ch.check, (ok) => out((ok ? ch.ok : ch.fail)(cardCtx())));
  });
}
function tabletopTick(dt) {
  // encounter cards: out on the open sea, now and then
  if (unlocked(state, 'cards') && ship.speed > 2 && dread < 0.95 && !world.nearest(ship.pos.x, ship.pos.z, 90) && !fishing.active) {
    cardT -= dt;
    if (cardT <= 0) { cardT = 200 + Math.random() * 160; openCard(); return; }
  }
  ship.rowBoost = hasTrait(state, 'rower') ? 1.4 : 1;
  document.body.classList.toggle('eyes', hasTrait(state, 'eyes'));
  // crew wishes
  if ((wishT -= dt) > 0) return; wishT = 2;
  for (const c of state.crew) {
    const w = c.wish; if (!w || w.done) continue;
    const hit = w.kind === 'harbour' ? false : world.nearest(ship.pos.x, ship.pos.z, 70, [w.kind]);
    if (hit) wishDone(c);
  }
}
function wishDone(c) {
  c.wish.done = true;
  toast(`${c.name} stands at the rail a long time. (${c.name}'s wish came true: their bonus grows by 1.)`, false, 7000);
  objectives.mate.say(`Look at ${c.name}. I have never seen anyone smile with only their eyebrows before.`);
}

// ---------------------------------------------------------------- story: chapter beats, the fog wall, the demo end
const HUT_NOTES = [
  'If you find the black hut, do not sit down. I sat down. - R.',
  'She has a book. My name is in it now. Twice.',
  'Third bottle I have thrown. The hut is not where I left it. The hut is exactly where I left it.',
];
const CHECKS = [['a red rock on its north shore', 'red'], ['three palms in a row on its east side', 'palms'], ['a bell on a post by the water', 'bell'], ['a white stone shaped like a tooth', 'tooth']];
function perrinNote() {
  // an island far from Tama that Perrin "checks": the farthest ring the fog allows in chapter IV
  const rng = mulberry32(hash2(state.seed, 77, 9)), cands = [];
  for (let cz = -12; cz <= 12; cz++) for (let cx = -12; cx <= 12; cx++) {
    const d = world.desc(cx, cz); if (!d || d.type === 'harbour' || d.hut) continue;
    const r = Math.hypot(d.x, d.z); if (r > 720 && r < 1080) cands.push(d);
  }
  const d = cands[Math.floor(rng() * cands.length)] || world.desc(1, -1);
  const [detail] = CHECKS[Math.floor(rng() * CHECKS.length)];
  state.story.check = { id: d.id, name: d.name, x: Math.round(d.x), z: Math.round(d.z), r: d.r, dir: bearingName(d.x, d.z), detail };
  state.story.perrinNote = true;
  state.notes.push({ text: `Perrin: "Be a dear and check my chart. ${d.name}, ${state.story.check.dir} of Tama, should have ${detail}. Nobody has been there to tell me, so I need eyes. Bring back my compass if you find it. It's the one that's wrong."`, dark: false });
  toast('The harbourmaster hands you a folded note from Old Perrin. (Journal)', false, 6000);
}
function revealHut() {
  const h = world.hutDesc; if (!h) return;
  state.discovered[h.id] = state.discovered[h.id] || 1;
  state.story.hutNod = 'pending';     // the nod comes the next time the chart is opened
}
function showDemoEnd() { $('demoend').classList.add('show'); }
$('demoGo').addEventListener('click', () => { $('demoend').classList.remove('show'); state.story.free = true; toast('The fog thins. The sea is yours.', false, 5000); });
let gateFog = 0, gateToastT = 0, musingT = 120;
function seaGate(dt) {
  const R = gateRadius(state), d = Math.hypot(ship.pos.x, ship.pos.z);
  gateFog = R === Infinity ? 0 : clamp((d - (R - 160)) / 160, 0, 1);
  if (d > R) {   // the fog turns you around: push back toward Tama and bleed speed
    const k = Math.min(d - R + 1, (4 + (d - R) * 0.8) * dt);
    ship.pos.x -= ship.pos.x / d * k; ship.pos.z -= ship.pos.z / d * k;
    ship.speed *= 1 - Math.min(0.9, dt * 1.4);
    objectives.remark('gate', dread);
    if ((gateToastT -= dt) <= 0) { gateToastT = 25; toast('The fog is a wall here. Somehow the bow always ends up pointing home.', false, 4500); }
  }
}

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
let newAsk = 0;
$('pbNew').addEventListener('click', () => {
  if (performance.now() - newAsk > 4000) { newAsk = performance.now(); $('pbNew').textContent = 'Really? Click again to start over'; return; }
  noSave = true; try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked */ }
  location.href = location.pathname;
});
$('pbHint').addEventListener('click', () => { closeModal(); if (!abyss.maraHint()) objectives.askHint(dread); });

// ---------------------------------------------------------------- captain's log
const logbook = new Logbook({ abyss, state, world, ship, seed: state.seed, toast: (t) => toast(t), close: () => closeModal(), mate: objectives.mate, dread: () => dread,
  retrack: () => sea.syncQuests(state.quests.filter((q) => q.id === state.tracked)),
  gate: () => gateRadius(state),
  skipGoal: () => { const g = objectives.current; if (!g) return; if (g.onDone) g.onDone({ state, world, ship, giveMap });
    if (g.id === 'perrin') perrinNote(); if (g.id === 'gossip') { state.story.hutKnown = true; revealHut(); }
    state.goals.i++; const n = objectives.current; if (n && n.onStart) n.onStart({ state }); toast('Goal skipped.'); } });

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
  if (live) { const pt = state.time; state.time = advanceTime(state.time, dt); if (state.time < pt) state.dayN++; }
  wind.update(dt);
  if (dt > 0) { state.buffs.speed = Math.max(0, state.buffs.speed - dt); state.buffs.dig = Math.max(0, state.buffs.dig - dt); }
  ship.buff = state.buffs.speed > 0 ? 1.15 : 1;
  const sec = sectorAt(ship.pos.x, ship.pos.z, state.seed);
  if (sec.id !== curSector) {
    curSector = sec.id;
    if (!state.sectorsSeen.includes(sec.id)) state.sectorsSeen.push(sec.id);
    if (live) toast(`Entering ${sec.name}: ${sec.faction.name} waters`, sec.dread > 0.5, 5000);
  }
  const windNow = { dir: wind.dir, strength: Math.min(1.4, wind.strength * (1 + 0.25 * weather.storm)) * (1 - 0.92 * weather.calm) };
  if (live && wind.shifted()) toast(`The wind is shifting: now from the ${wind.fromName}`, false, 4200);

  // ---- ship
  shipInput.steer = (keys.has('KeyD') || keys.has('ArrowRight') || touch.R ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') || touch.L ? 1 : 0);
  shipInput.sail = (keys.has('KeyW') || keys.has('ArrowUp') || touch.U ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') || touch.D ? 1 : 0);
  if (!live) { shipInput.steer = 0; shipInput.sail = 0; }
  if (live && (keys.has('KeyZ') || keys.has('KeyX'))) { yawT += ((keys.has('KeyX') ? 1 : 0) - (keys.has('KeyZ') ? 1 : 0)) * dt * 1.8; lastCamInput = tNow; }
  if (keys.has('KeyV')) { yawT = 0; lastCamInput = tNow; }
  if (!drag && tNow - lastCamInput > 6) yawT += (0 - yawT) * Math.min(1, rawDt * 0.7);   // drifts back behind the boat after a while
  if (live && keys.has('KeyR')) pitchT = clamp(pitchT - dt * 0.8, PITCH_MIN, 1.35);
  if (live && keys.has('KeyF')) pitchT = clamp(pitchT + dt * 0.8, 0.3, 1.35);
  if (live || params.get('autostart')) ship.update(dt, shipInput, windNow, tNow);
  if (live && dt > 0) { stormAndCalm(dt); tabletopTick(dt); seaGate(dt); }
  if (world.collide(ship.pos, 2.2)) {
    if (ship.speed > 3 && dt > 0) audio.play('bump', { vol: clamp(ship.speed / 10, 0.3, 1) });
    ship.speed *= 0.9;
  }

  // ---- dread + stage palette + time of day
  const target = forced !== null ? forced : dreadAtDistance(Math.hypot(ship.pos.x, ship.pos.z));
  dread += (target - dread) * Math.min(1, rawDt * (forced !== null ? 1.2 : 0.4));
  if (params.get('shot')) dread = target;
  if (glitchT > 0) { glitchT -= rawDt; dread = 1; if (glitchT <= 0) { dread = preGlitch; hutEl.classList.remove('glitching'); } } // the hut's bad throw
  dark = dread > DARK_THRESHOLD;
  const stage = sampleStage(dread);
  applyTimeOfDay(stage, state.time, dread);
  stage.wave *= 0.7 + 0.5 * wind.strength;
  weather.update(dt, wind.t, dread, wind.dir, wind.strength, camera, tod);
  weather.apply(stage);
  stage.fogFar += ship.mods.fogBonus; stage.fogNear += ship.mods.fogBonus * 0.5;
  if (gateFog > 0) { stage.fogFar = Math.max(30, stage.fogFar * (1 - 0.85 * gateFog)); stage.fogNear = Math.max(4, stage.fogNear * (1 - 0.9 * gateFog)); stage.fog.lerp(new THREE.Color('#b8c0c4'), gateFog * 0.7); }
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
  if (live && !state.passenger && dread > 0.2 && dread < 0.7 && ship.speed > 1) {   // Mara muses on quiet stretches
    musingT -= dt;
    if (musingT <= 0 && !objectives.mate.busy) { musingT = 240 + Math.random() * 200; const m = MUSINGS.filter((x) => !state.hints['muse:' + x]); if (m.length) { const l = m[Math.floor(Math.random() * m.length)]; state.hints['muse:' + l] = true; objectives.mate.say(l); } }
  }
  if (live && state.passenger && ship.speed > 1) passengerTalk(state.passenger, dt, { mate: objectives.mate, world, ship, state, dread, storm: weather.storm });
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
  sky.update(dt, camera, stage, wind.dir, tod, { sun2: abyss.sun2 });
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
  const skyK = clamp((0.3 - pitchNow) / (0.3 - PITCH_MIN), 0, 1);   // below the old limit the camera looks up instead of down
  camLook.set(ship.pos.x + fx * zoom * 0.2, 1.5 + lookUpK * 9 + skyK * zoom * 0.42, ship.pos.z + fz * zoom * 0.2);
  camPos.y = Math.max(camPos.y, 3.2);                                 // never at or under the waterline
  if (shake > 0) { shake = Math.max(0, shake - rawDt * 1.8); camPos.x += Math.sin(tNow * 70) * shake; camPos.y += Math.cos(tNow * 63) * shake * 0.7; }
  if (dread > 0.85 && live) { const s = (dread - 0.85) * 0.5; camPos.x += Math.sin(tNow * 31) * s; camPos.y += Math.sin(tNow * 23 + 1) * s; }
  if (camOverride) { camPos.set(...camOverride.pos); camLook.set(...camOverride.look); }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  if (live || params.get('shot')) camera.rotateZ(abyss.roll(tNow));
  camera.updateMatrixWorld();

  // ---- discovery / interaction / dig
  // first sight of an island you have never charted: a moment of "land ho!"
  if (live && tNow - lastSighting > 1) {
    lastSighting = tNow;
    const seen = world.nearest(ship.pos.x, ship.pos.z, 150);
    if (seen && !state.discovered[seen.desc.id] && !sighted.has(seen.desc.id)) { sighted.add(seen.desc.id); landHo(seen.desc); }
  }
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
    if (!tgt || tgt.key !== dig.key || ship.speed > 0.6) { dig = null; toast('The crew came back empty-handed. Hold still!'); }
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
      promptTxt.textContent = tgt.kind === 'harbourfar' ? 'Sail to the pier to go ashore' : tgt.kind === 'hut' ? '[E] Knock on the dark hut' : tgt.kind === 'harbour' ? `[E] Visit ${tgt.isl.desc.name}`
        : tgt.kind === 'treasure' ? (tgt.isl.dug ? 'Already plundered' : !state.riddles[tgt.isl.desc.id] ? '[E] Study the ancient arch inscription' : '[E] Dig on this shore')
        : tgt.kind === 'fruit' ? (state.harvest[tgt.isl.desc.id] != null && state.harvest[tgt.isl.desc.id] >= state.dayN ? 'Picked clean for today' : `[E] Pick ${plural(fruitName(fruitOf(tgt.isl.desc), tgt.isl.desc.dread), 2)}`)
        : tgt.kind === 'ship' ? (tgt.s.mode === 'derelict' ? `[E] Board the drifting ${KINDS[tgt.s.kind].label}` : tgt.s.mode === 'ghost' ? '[E] Hail the pale ship' : `[E] Hail the ${tgt.s.name}`)
        : '[E] Salvage the wreck';
      if ((tgt.kind === 'treasure' || tgt.kind === 'fruit' || tgt.kind === 'wreck') && ship.speed > 0.35) promptTxt.textContent = 'Stop the ship completely (S) to go ashore';
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
  if (modal === 'hut') hut.update(rawDt);
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
  if (tNow - lastSave > 4 && !params.get('fresh') && !noSave) {
    lastSave = tNow;
    store.set(SAVE_KEY, { seed: state.seed, gold: state.gold, dug: [...state.dug], discovered: state.discovered, loot: state.loot, upgrades: state.upgrades, collected: [...state.collected], notes: state.notes, rumoured: state.rumoured, rep: state.rep, job: state.job, serial: state.serial, sectorsSeen: state.sectorsSeen, jobHistory: state.jobHistory, buffs: state.buffs, stats: state.stats, quests: state.quests, fruit: state.fruit, harvest: state.harvest, dayN: state.dayN, hp: state.hp, ammo: state.ammo, custom: state.custom, owned: [...state.owned], riddles: state.riddles, attempts: state.attempts, catch: state.catch, fishLog: state.fishLog, hut: state.hut, passenger: state.passenger, story: state.story, crew: state.crew, cardsSeen: state.cardsSeen, haggle: state.haggle, tracked: state.tracked, goals: state.goals, hints: state.hints, time: state.time, windT: wind.t, pos: { x: ship.pos.x, z: ship.pos.z, h: ship.heading } });
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
  objectives, perrinNote, gateRadius: () => gateRadius(state),
  openCard,
  weather,
  setDread(v) { forced = v; dread = v; },
  setTime(t) { state.time = t; },
  setCam(p, z) { if (p !== undefined) { pitch = pitchT = p; } if (z !== undefined) { zoom = zoomT = z; } },
  setOverride(o) { camOverride = o; },
  teleport(x, z, h) { ship.pos.set(x, 0, z); ship.heading = h; camHeading = h; },
  /** design lineups for screenshots: 'villagers' or 'houses' on a raft at (x, z) */
  showcase(kind, x = 0, z = 60) {
    if (this._show) scene.remove(this._show);
    const b = new Builder(), list = kind === 'houses' ? HOUSES : VILLAGERS, gap = kind === 'houses' ? 7.5 : 1.5, n = list.length, rng = mulberry32(5);
    b.box(0, -0.6, 0, gap * n + 1, 0.8, kind === 'houses' ? 10 : 2.6, '#9a7a50', TILE.planks);
    list.forEach((k, i) => { const px = (i - (n - 1) / 2) * gap; if (kind === 'houses') houseKind(b, b, px, 0.2, 0, 0, rng, k); else villager(b, px, 0.2, 0, 0, rng, k); });
    this._show = new THREE.Mesh(b.geometry(), mats.props); this._show.position.set(x, 0.4, z); scene.add(this._show);
    return list;
  },
  /** size comparison: three houses with villagers in front, the ship beside them, a 1-unit ruler */
  scaleShot(x = 0, z = 60) {
    if (this._show) scene.remove(this._show);
    const b = new Builder(), rng = mulberry32(9);
    b.box(-2, -0.6, 0, 26, 0.8, 9, '#9a7a50', TILE.planks);
    houseKind(b, b, -11, 0.2, -1, 0, rng, 'cottage'); houseKind(b, b, -3.5, 0.2, -1.5, 0, rng, 'tavern'); houseKind(b, b, 4, 0.2, -1, 0, rng, 'townhouse');
    VILLAGERS.forEach((k, i) => villager(b, -12 + i * 2.6, 0.2, 3.3, 0, rng, k));
    b.box(12, -0.6, 2.5, 4, 0.8, 2, '#8a6a40', TILE.planks); villager(b, 12.6, 0.2, 2.6, Math.PI / 2, rng, 'docker'); villager(b, 11.4, 0.2, 2.2, Math.PI / 2, rng, 'fisher');   // a pier beside the ship
    for (let i = 0; i < 4; i++) b.box(-14.5, 0.2 + i, 3.3, 0.25, 1, 0.25, i % 2 ? '#ffffff' : '#d84a3c', TILE.white);   // 4-unit ruler
    this._show = new THREE.Mesh(b.geometry(), mats.props); this._show.position.set(x, 0.4, z); scene.add(this._show);
    ship.pos.set(x + 15, 0, z + 2.5); ship.heading = Math.PI / 2; ship.speed = 0; ship.trim = 1;
  },
  abyss, hut, ship, world, state, begin, scene, camera, horror, renderer, wind, weather, fauna, traffic, sea, audio, fishing, combat, objectives, hurtPlayer, openModal, closeModal, buyUpgrade, refreshMods,
};
if (params.get('autostart')) begin();
frame();
