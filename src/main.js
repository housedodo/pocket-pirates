import * as THREE from 'three';
import { clamp, smoothstep, angleDiff, mulberry32, hash2 } from './util.js';
import { sampleStage, DARK_THRESHOLD, dreadAtDistance } from './palette.js';
import { U, initMaterials, mats, PostFX } from './psx.js';
import { Ocean, WATER, NISL } from './ocean.js';
import { Sky } from './sky.js';
import { World, villager, VILLAGERS, houseKind, HOUSES, shoreR, lighthouseKind } from './world.js';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { Ship } from './ship.js';
import { AudioBus, AUDIO_ENABLED } from './audio.js';
import { sfx } from './sfx.js';
import { Mixer } from './mixer.js';
import { TITLE_SCENES, drawTitleLogo } from './title.js';
import { pickGreeting, portrait, speakerName, rollGreeting, numberWord } from './greetings.js';
import { gossip, lootFor, bottleNote, barrelLoot } from './lore.js';
import { Weather } from './weather.js';
import { Fauna } from './fauna.js';
import { Companion } from './companion.js';
import { Caves, CAVES } from './caves.js';
import { CaveScene, caveLook } from './cavescene.js';
import { Threads } from './threads.js';
import { THREAD_DEFS, THREAD_IDS, pickAwake } from './marks.js';
import { Traffic } from './traffic.js';
import { SeaFeatures } from './seafeatures.js';
import { makeJob, setReach, findRumour, repOf, friendLevel, discount, bearingName, nearby, RUMOUR_COST, commissionsFor, questProgress, questNeed, questTitle, QUEST_ICON, questIcon, FRUITS, fruitOf, fruitName, plural } from './jobs.js';
import { Logbook } from './logbook.js';
import { Hut } from './hut.js';
import { makePassenger, passengerTalk } from './passengers.js';
import { sectorAt, sectorInfo, sectorCoord, FACTIONS } from './sectors.js';
import { KINDS, boatStatus } from './traffic.js';
import { Fishing, fishById } from './fishing.js';
import { Combat } from './combat.js';
import { Objectives, MUSINGS, MAIN_GOALS, CHAPTERS, unlocked, gateRadius, chapterOf, goalText, goalCount } from './objectives.js';
import { GROUPS, DEFAULT_CUSTOM, byId } from './customize.js';
import { Wind } from './wind.js';
import { WindFX } from './windfx.js';
import { drawWind, PX } from './windmeters.js';
import { installPixelUI, pxi } from './pixelui.js';
import { applyTimeOfDay, advanceTime, tod } from './daynight.js';
import { UPGRADES, MAX_LEVEL, computeMods, shipwrightLine } from './upgrades.js';
import { TRAITS, crewForHire, crewBonus, hasTrait, rollCheck, drawCard, renderCard, Pig, setDieWear, setAdvProvider, TREASURE_TIERS } from './tabletop.js';
import { FISH, HABITAT } from './fishing.js';
import { Sighting, SIGHTS } from './sighting.js';
import { pushOut } from './solids.js';
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
const DEV = !!params.get('dev') || window.__BUILD === 'dev';   // ?dev=1: test keys (1-5 dread, 0, [ ], `) and the full-dread effects menu
const settings = Object.assign({ muted: false, musicOff: false, vol: { music: 1, amb: 1, sfx: 1 }, windStyle: 'dial', hud: 'classic', tracker: true, abyss: {} }, store.get(SETTINGS_KEY) || {});
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
  board: (saved && saved.board) || { pos: {}, ties: [], note: '', guess: [] },
  halves: (saved && saved.halves) || {},   // arches that hold only half a riddle: isle id -> the isle with the other half
  frags: (saved && saved.frags) || {},
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
  greet: (saved && saved.greet) || { day: {} },
  charts: (saved && saved.charts) || {},
  stats: Object.assign({ dolphins: 0, whales: 0, fruitPicked: 0, dist: 0, harbours: 0, deliveries: 0, fish: 0, wrecks: 0, bottles: 0, sunk: 0, hails: 0, solved: 0, treasures: 0, cosmetics: 0 }, (saved && saved.stats) || {}),
  hp: saved && saved.hp != null ? saved.hp : 100,
  ammo: saved && saved.ammo != null ? saved.ammo : 8,
  custom: Object.assign({}, DEFAULT_CUSTOM, (saved && saved.custom) || {}),
  owned: new Set((saved && saved.owned) || []),
  riddles: (saved && saved.riddles) || {},
  attempts: (saved && saved.attempts) || {},
  catch: (saved && saved.catch) || [],
  fishLog: (saved && saved.fishLog) || {},
  fishHeard: (saved && saved.fishHeard) || {},   // species whose habitat a fisher has described
  fishAsk: (saved && saved.fishAsk) || {},       // harbour id -> the day you last asked there
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
const audio = new AudioBus();
sfx.play = (k, o) => audio.play(k, o);
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { if (audio.ctx && audio.ctx.state === 'suspended' && modal !== 'pause') audio.ctx.resume(); });   // browsers start audio muted until a click or key
audio.muted = settings.muted; audio.userVol = { music: 1, amb: 1, sfx: 1, ...(settings.vol || {}) };
const wind = new Wind(state.windT);
const weather = new Weather(scene);
const windfx = new WindFX(scene);
const fauna = new Fauna(scene, world);
const traffic = new Traffic(scene, world, state.seed);
const sea = new SeaFeatures(scene, world, state.seed, state.collected);
const sighting = new Sighting(scene);
const caves = new Caves(scene, world, state);
const threads = new Threads(scene, world, state);
// the Tide of Threads: which threads this voyage has awake. In the dev build the title screen can choose (or ?threads=colour,bell / all / none)
const THREADS_KEY = 'pocket-pirates-threads-v1';
function threadChoice() {
  const q = params.get('threads');
  if (q) return q === 'all' ? [...THREAD_IDS] : q === 'none' ? [] : q === 'seeded' ? null : q.split(',').filter((id) => THREAD_IDS.includes(id));
  if (DEV) { const c = store.get(THREADS_KEY); if (c && c.mode === 'chosen') return c.ids || []; if (c && c.mode === 'none') return []; }
  return null;
}
threads.setup(threadChoice());
function addMark(key) { if (window.__BUILD === 'demo') return; state.story.marks = { ...(state.story.marks || {}), [key]: 1 }; }   // shown only on the Standing page, in the world's words
function clearMark(key) { if (state.story.marks) { const m = { ...state.story.marks }; delete m[key]; state.story.marks = m; } }
function keep(id, name, text) { if (window.__BUILD === 'demo') return; const k = state.story.keeps = state.story.keeps || []; if (!k.some((o) => o.id === id)) k.push({ id, name, text }); }
threads.bind({
  get state() { return state; }, audio, ship, addMark, clearMark, keep,
  toast: (t, dark, ms) => toast(t, dark, ms), say: (t) => { if (!objectives.mate.busy) objectives.mate.say(t); },
  openScene: (kind, id) => openCave({ id, kind }), tide: () => tideAt(), night: () => tod.night, bearing: (dx, dz) => bearingName(dx, dz),
  refreshMods: () => refreshMods(),
  cool: () => { for (const r of Object.values(state.rep)) r.visits = Math.max(0, r.visits - 2); },
  setLook: (c) => { state.custom = { ...state.custom, ...c }; ship.setCustom(state.custom); },
  teleport: (d) => { const dk = d.dock || { x: 0, z: 0 }; ship.pos.set(d.x + dk.x, 0, d.z + dk.z); ship.speed = 0; state.pos = { x: ship.pos.x, z: ship.pos.z, h: ship.heading }; },
});
function markFromRoll(n) { if (n === 1) addMark('counted'); else if (n === 20) addMark('called'); }   // a natural 1 gets you counted, a natural 20 gets you called   // optional dark threads (Story Bible, "Multiple paths"); the Colour is the first prototype
{ const h = world.desc(0, -1); if (h) caves.force(h, 3); }
const combat = new Combat(scene, fauna);
sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));
traffic.onEvent = (what) => {
  if (!laterOK()) return;   // market and regatta wait for the tutorial
  if (what === 'market') toast('A floating market, with bunting on every line. (Friday)', false, 5000);
  if (what === 'regatta') { toast('A regatta! Five boats, racing.', false, 4500); if (!state.hints.regattaSeen && laterOK()) { state.hints.regattaSeen = true; setTimeout(() => objectives.mate.say('A regatta! Look at them go. I wonder who they are racing, and who is giving the prize.'), 2500); } }
};
fauna.onSpot = (what) => {
  if (!laterOK()) return;   // no dolphins or whales for the first goals
  const k = what === 'migration' ? 'whales' : what; state.stats[k] = (state.stats[k] || 0) + 1;
  toast(what === 'dolphins' ? 'Dolphins!' : what === 'migration' ? 'Another whale, heading east.' : what === 'turtles' ? 'A sea turtle, drifting by.' : 'A whale surfaces in the distance!', false, 2500);
  if (what === 'migration' && !state.hints.migrationSeen && laterOK()) { state.hints.migrationSeen = true; setTimeout(() => objectives.mate.say('They are all going the same way, Captain. East. Every one of them. As if they were called.'), 2500); }
};
audio.musicOn = !settings.musicOff;

// a new voyage begins moored alongside Tama's pier with the sails furled, as if you had just come aboard
if (!saved && !params.has('x')) {
  const d = world.desc(0, -1), th = Math.PI / 2, r = shoreR(d, th) + 9;
  state.pos = { x: d.x + Math.cos(th) * r + Math.sin(th) * 9, z: d.z + Math.sin(th) * r - Math.cos(th) * 9, h: Math.atan2(Math.cos(th), -Math.sin(th)) };
  ship.trim = 0;
}
ship.pos.set(state.pos.x, 0, state.pos.z);
ship.heading = state.pos.h;
const refreshMods = () => { ship.mods = threads.modAdjust(computeMods(state.upgrades)); state.hp = Math.min(state.hp, ship.mods.maxHp); ship.setUpgradeLook(state.upgrades); };
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
document.body.appendChild(toastsEl);   // messages sit above every menu, so a quest or rumour line is never hidden behind the shop
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
    if (hutNote && hutNote.includes('{fate}')) { state.story.fate = state.story.fate || 3 + Math.floor(mulberry32(hash2(state.seed, 20, 20))() * 7); state.story.fateRead = true; }
    const text = hutNote ? hutNote.replace(/\{fate\}/g, numberWord(state.story.fate)) : bottleNote(mulberry32(hash2(e.o.x | 0, e.o.z | 0, state.seed + 3)), Math.min(4, Math.floor(e.o.dread * 5)));
    state.notes.push({ text, dark: idx >= 2 }); state.stats.bottles++;
    toast(`Message in a bottle: "${text}"`, idx >= 2, 10000);
    audio.play('bottle');
  } else if (e.type === 'whirl') {
    toast('A whirlpool tugs at the keel! Sail out of it.', dread > 0.5);
    audio.play('splash', { vol: 0.6 });
  }
};

// ---------------------------------------------------------------- goals, fishing
// A riddle handed over by someone. Only the tutorial riddle (reveal = true) says which island it is and marks it on the chart;
// every later riddle is just the words: working out where it points is the player's job.
function giveMap(id, from, reveal = false, quiet = false) {
  const [cx, cz] = id.split(',').map(Number), d = world.desc(cx, cz);
  if (!d || !d.puzzle) return;
  state.riddles[id] = d.puzzle.text;
  if (reveal) {
    state.rumoured[id] = state.rumoured[id] || { name: d.name, x: Math.round(d.x), z: Math.round(d.z), source: from, found: false };
    if (!quiet) toast(`${from} gave you a treasure riddle for ${d.name}. Saved in your log: Riddles tab.`, false, 8000);
  } else toast(`${from} gave you a riddle. Saved in your log: Riddles tab. Where it points is up to you.`, false, 8000);
}
// ---- autosave
function saveNow() {
  if (params.get('fresh') || noSave) return false;
  lastSave = tNow;
  store.set(SAVE_KEY, { seed: state.seed, gold: state.gold, dug: [...state.dug], discovered: state.discovered, loot: state.loot, upgrades: state.upgrades, collected: [...state.collected], notes: state.notes, board: state.board, halves: state.halves, frags: state.frags, rumoured: state.rumoured, rep: state.rep, job: state.job, serial: state.serial, sectorsSeen: state.sectorsSeen, jobHistory: state.jobHistory, buffs: state.buffs, stats: state.stats, quests: state.quests, fruit: state.fruit, harvest: state.harvest, dayN: state.dayN, greet: state.greet, charts: state.charts, hp: state.hp, ammo: state.ammo, custom: state.custom, owned: [...state.owned], riddles: state.riddles, attempts: state.attempts, catch: state.catch, fishLog: state.fishLog, fishHeard: state.fishHeard, fishAsk: state.fishAsk, hut: state.hut, passenger: state.passenger, story: state.story, crew: state.crew, cardsSeen: state.cardsSeen, haggle: state.haggle, tracked: state.tracked, goals: state.goals, hints: state.hints, time: state.time, windT: wind.t, pos: { x: ship.pos.x, z: ship.pos.z, h: ship.heading } });
  return true;
}
const SS_ART = ['.........FF.........', '.........M..........', '........MSS.........', '........MSSs........', '........MSSSs.......', '........MSSSSs......', '........MSSSSSs.....', '........MSSSSSss....', '........M...........', '..HHHHHHHHHHHHHHH...', '...HhhhhhhhhhhhHH...'];
const SS_COL = { M: '#6b4a2e', S: '#f4ecd0', s: '#cbbf9a', H: '#5a3a1c', h: '#8a5a30', F: '#d24a3e' };
{ const c = $('ssCv').getContext('2d'); SS_ART.forEach((row, y) => [...row].forEach((ch, x) => { if (SS_COL[ch]) { c.fillStyle = SS_COL[ch]; c.fillRect(x, y, 1, 1); } })); }
function autosave() {   // a quest was finished or you docked: save now and show the ship
  if (!saveNow()) return;
  const el = $('saveship'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
}

// ---- quest cues (design A): QUEST COMPLETE, then NEW QUEST, the tracker flashes and the wind ring pulses
let trackerNewUntil = 0;
function questCue(done, next) {
  // QUEST COMPLETE shows at once; the NEW QUEST card waits until Mara has spoken and the next goal is announced (questNew)
  const el = $('qbanner'); $('qbTitle').textContent = done.title; $('qbRew').textContent = `+${done.reward} gold`;
  el.classList.remove('shownew'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  setTimeout(autosave, 600); audio.play('discover');
  if (!next) setTimeout(() => questNew(null), 3000);
}
function questNew(next, withCard = true) {
  const el = $('qbanner');
  $('qbNext').textContent = next ? next.title : 'Sail where you like'; $('qbText').textContent = next ? goalText(next, { state, ship }) : 'The side goals in your log are always there.';
  if (withCard) { el.classList.remove('show'); el.classList.remove('shownew'); void el.offsetWidth; el.classList.add('shownew'); }
  trackerNewUntil = performance.now() + 9000; const c = $('compass'); c.classList.remove('ping'); void c.offsetWidth; c.classList.add('ping');
  setTimeout(() => c.classList.remove('ping'), 8000); audio.play('discover');
}
// the story asks for a dead calm (seconds > 0) or for the wind to pick up again (0, and no natural calm for ten minutes)
function setCalm(s) { if (s > 0) weather.calmHold = s; else { weather.calmHold = 0; weather.noCalm = 600; } }
const objectives = new Objectives({ state, world, ship, toast: (t, d) => toast(t, d), giveMap, forceCalm: setCalm, quiet: () => onbQuiet(), later: () => laterOK(),
  chapterCard: (ch) => { $('qbanner').classList.remove('show'); const el = $('landho'); el.querySelector('b').textContent = `CHAPTER ${ch.n}`; el.querySelector('span').textContent = ch.title; el.querySelector('small').textContent = ch.act; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); audio.play('chapter'); },
  questCue: (done, next) => questCue(done, next), questNew: (next, withCard) => questNew(next, withCard),
  onStep: (done, next) => { if (done.id === 'gossip') revealHut(); } });
const abyss = new Abyss({ scene, ship, world, sky, settings, state, mate: objectives.mate, toast: (t, d, ms) => toast(t, d, ms), fade: $('fade'),
  onEnding: () => {
    forced = null; dread = 0.02; abyss.k = 0;
    ship.pos.set(0, 0, -25); ship.heading = 0; ship.speed = 0; camHeading = 0; yawT = 0;
    state.stats.awakened = (state.stats.awakened || 0) + 1;
    objectives.mate.queue.length = 0;
    objectives.mate.say('Captain? Captain! You were asleep at the wheel. For how long, I... let us just go home.');
  } });
// what kind of water the ship is in, for the fish (never shown to the player)
const ZONE_LABEL = { wreck: 'over a wreck', lagoon: 'in a ring-island lagoon', mangrove: 'by mangroves', harbour: 'by a harbour', reef: 'off a rocky edge', shallows: 'in the shallows', deep: 'in deep water', open: 'in open water', mid: 'between islands' };
function fishEnv() {
  const x = ship.pos.x, z = ship.pos.z, zones = [];
  world.nearest(x, z, 400); const edge = world.lastEdge;
  const at = (types, r) => !!world.nearest(x, z, r, types);
  if (sea.wreckNear(x, z, 30)) zones.push('wreck');
  if (at(['atoll'], 30)) zones.push('lagoon');
  if (at(['mangrove'], 30)) zones.push('mangrove');
  if (at(['harbour'], 45)) zones.push('harbour');
  if (at(['rocky', 'volcano'], 45)) zones.push('reef');
  if (edge < 40) zones.push('shallows');
  if (edge > 230) zones.push('deep'); else if (edge > 110) zones.push('open');
  if (!zones.length) zones.push('mid');
  return { zones, label: ZONE_LABEL[zones[0]], hour: state.time * 24, low: tideAt() < -0.3, colour: !!threads.patchAt(x, z, 1) };
}
const fishing = new Fishing(scene, ship, {
  toast: (t) => toast(t),
  getCtx: () => ({ bonus: Math.max(0, ship.mods.lootMul - 1) }),
  onStart: () => audio.play('cast'),
  onSplash: () => { audio.play('splash', { vol: 0.4 }); toast('Line cast. Wait for a bite...', false, 2500); },
  onBite: (f) => { toast(f.dark ? 'Something heavy takes the bait!' : 'A bite!', f.dark, 1500); audio.play('bite'); },
  onCatch: (f) => {
    f = abyss.wrongCatch(f);
    if (f.value && threads.fishBonus() > 1) f = { ...f, value: Math.round(f.value * threads.fishBonus()) };
    state.catch.push(f); state.stats.fish++; audio.play('catch');
    const l = state.fishLog[f.id] || (state.fishLog[f.id] = { count: 0, best: 0 });
    l.count++; l.best = Math.max(l.best, f.kg);
    if (f.zone && !f.dark) { l.where = l.where || {}; l.where[f.zone] = (l.where[f.zone] || 0) + 1; const h = f.hour; l.when = l.when || {}; const per = h >= 5 && h < 11 ? 'morning' : h >= 11 && h < 17 ? 'afternoon' : h >= 17 && h < 22 ? 'evening' : 'night'; l.when[per] = (l.when[per] || 0) + 1; }
    if (f.bright) {   // the Colour: huge, bright, tasteless, and the crew go a little quiet
      const c = threads.c; if (c) c.fish++;
      const c0 = state.crew.find((m) => m.wish && !m.wish.done && !m.wish.faded); if (c0) { c0.wish.faded = true; c0.wish.text = 'has stopped saying what they want'; }
      toast(`Caught: something bright and enormous, ${f.kg}kg (worth ${f.value}g). It smells of nothing.`, false, 7000); return;
    }
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
// ---- the week: market day everywhere on Wednesdays, lantern night on Saturdays, and each harbour its own festival day
const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const weekday = () => state.dayN % 7, isMarketDay = () => weekday() === 2, isLanternNight = () => weekday() === 5;
const isFestival = (d) => d && d.festival === weekday();
// two tides a day, drifting a little later each day; low tide (below -0.45) uncovers more at wrecks and widens the shallows
const tideAt = (time = state.time, day = state.dayN) => Math.sin(Math.PI * 2 * (time * 2 + day * 0.07));
const tideWord = () => { const a = tideAt(), b = tideAt(state.time + 0.02); return a < -0.45 ? 'low tide' : a > 0.45 ? 'high tide' : b > a ? 'tide coming in' : 'tide going out'; };
function dayLine(d) { const ev = isFestival(d) ? 'festival day' : isMarketDay() ? 'market day' : isLanternNight() ? 'lantern night' : ''; return WEEK[weekday()] + (ev ? ` · ${ev}` : '') + ` · ${tideWord()}`; }
// a harbour grows with your trade there: more boats, then a busier quay, then flags over the pier
function noonBells() {   // villages that keep the bells ring them at noon; you hear them if you are near
  for (const isl of world.islands.values()) { const d = isl.desc; if (d.custom !== 'bells') continue; const dist = Math.hypot(d.x - ship.pos.x, d.z - ship.pos.z); if (dist < 260) audio.play('bell', { vol: clamp(1 - dist / 280, 0.15, 0.8) }); }
}
function weekMorning() {   // Mara mentions the day the first couple of times, then never again
  const k = isMarketDay() ? 'market' : isLanternNight() ? 'lanterns' : null; if (!k || !laterOK()) return;   // Mara only talks about the quest in hand until the tutorial is well under way
  const n = state.hints['week:' + k] || 0; if (n >= 2) return; state.hints['week:' + k] = n + 1;
  objectives.mate.say(k === 'market' ? 'Market day, Captain! Every harbour pays a bit more for what we bring in.' : 'Lantern night tonight. They set little lights on the water. I always want to follow one.');
}
function growthOf(id) { const r = state.rep[id]; if (!r) return 0; const sc = (r.deliveries || 0) * 2 + (r.visits || 0); return sc >= 20 ? 3 : sc >= 10 ? 2 : sc >= 4 ? 1 : 0; }
// her last throw colours that day and the next: a kinder sea after a good one, a thicker one after a bad one
function lastThrow() { const h = state.hut, r = h && h.rolls[h.rolls.length - 1]; return r && state.dayN - r.day <= 1 ? r.n : 0; }
function dreamShift() { const n = lastThrow(); return !n || n === 10 ? 0 : n === 20 ? -0.3 : n > 10 ? -0.18 : n === 1 ? 0.15 : 0.1; }   // bad throws only shade home a little; the real dark comes late
function dreamCost() { const n = lastThrow(); return n && n < 10 ? 1.15 : n >= 17 ? 0.9 : 1; }   // harbours feel it in their prices
function costMul() {   // today's prices here: the dream, plus a harbour you insulted with a natural 1
  const id = harbourIsl && harbourIsl.desc.id, hg = state.haggle;
  return dreamCost() * (hg && hg.id === id && hg.day === state.dayN && hg.n === 1 ? 1.1 : 1);
}
const MARA_THROW = {
  low: 'Captain... is the water thicker? It looks thicker.', ten: 'Nothing happened. Why does that feel like something happened?',
  high: 'Is it me, or is the sea in a good mood all of a sudden?', twenty: 'Did you hear that? Like the whole sea sighed. In a nice way. I think.',
};
// a day without a throw, once she knows you, is written down too. Nobody tells the player.
function noteSkip() { const h = state.hut; if (h && h.rolls.length && h.lastDay !== state.dayN) (h.skips || (h.skips = [])).push(state.dayN); }
function hutLeft() {
  const h = state.hut;
  if (!h) return;
  if (h.rolls.length && !state.story.demoEnd) state.story.demoEnd = 'pending';   // the demo ends at the next harbour, when someone speaks of the throw
  if (h.visits === 1) objectives.mate.say('I did not like that, Captain. She never blinked. Not once.', true);
  const last = h.rolls[h.rolls.length - 1];
  if (last && h.rolls.length === 1 && !state.story.throwTold) {   // the first throw: Mara notices, and if a bottle called the number, she noticed that too
    state.story.throwTold = true; const n = last.n;
    if (state.story.fateRead && n === state.story.fate && n !== 1) objectives.mate.say(`Captain. The bottle. It said ${numberWord(n)}. How did it know it would be ${numberWord(n)}?`, true);
    if (n === 1) toast('Mara does not say anything for a long time.', true, 5000);
    else objectives.mate.say(MARA_THROW[n === 20 ? 'twenty' : n > 10 ? 'high' : n === 10 ? 'ten' : 'low'], n < 10);
  }
  else if (h.fails === 3 && !h.toldThree) { h.toldThree = true; objectives.mate.say('Three times now. Captain... what is she writing down?', true); }
}

// ---------------------------------------------------------------- modal state (pause / chart / harbour)
let modal = null; // null | 'pause' | 'chart' | 'harbour' | 'ship'
let logTab = 'map';
let tradeShip = null;
const yardEl = $('yardmodal'), hutEl = $('hutmodal'), cardEl = $('card'), pigEl = $('pig'), greetEl = $('greet'), caveEl = $('cave');
let harbourIsl = null;
const keys = new Set();
// ---- a quiet start: the HUD and Mara's explanations arrive one at a time, each when the player has done the last thing.
// (Finished tutorials, old saves and test runs show everything at once.)
const ONB_KEYS = { gold: 'gold', clock: 'clock', place: 'placeline', wind: 'compass', sail: 'sailbar', hull: 'combatbox' };
const onbAll = () => params.get('nomate') || state.story.onbAll || (state.goals.started && state.goals.i >= 3);
const onbQuiet = () => !onbAll() && state.goals.i < 2;   // no discovery toasts or "land ho" while the first goals are going
function onbShow(k) {
  const s = state.story.onb || (state.story.onb = {}); if (s[k]) return; s[k] = 1;
  const el = $(ONB_KEYS[k]); if (!el) return;
  el.classList.remove('onb-off'); el.classList.remove('onb-pop'); void el.offsetWidth; el.classList.add('onb-pop');
  setTimeout(() => el.classList.remove('onb-pop'), 3000);
}
const laterOK = () => !!onbAll() || state.goals.i >= 7;   // dolphins, sightings and the optional goals wait until the tutorial is well under way
let onbGold0 = null, onbT0 = null, onbStepT = 0, onbNudged = false;
function onbTick() {
  if (!started) return;
  const s = state.story.onb || (state.story.onb = {});
  if (onbAll()) { if (helpMode === 'start') { helpMode = 'legacy'; helpEl.innerHTML = '<span>A/D steer &middot; W/S sails &middot; G oars &middot; E interact<br>M log &middot; Esc pause &middot; drag = tilt &middot; wheel = zoom &middot; H hide HUD &middot; F1 help</span>'; } state.story.onbAll = true; for (const [k, id] of Object.entries(ONB_KEYS)) { const el = $(id); if (el) el.classList.remove('onb-off'); } return; }
  if (onbGold0 === null) { onbGold0 = state.gold; for (const [k, id] of Object.entries(ONB_KEYS)) if (!s[k]) $(id).classList.add('onb-off'); }
  const gi = state.goals.i, intro = MAIN_GOALS[0].intro, step = state.story.onbStep || 0;
  if (onbT0 === null) onbT0 = tNow;
  // step 0: Mara has introduced herself; if the sails stay furled a while she says so once, kindly
  if (step === 0 && !onbNudged && tNow - onbT0 > 14 && ship.trim < 0.12 && !objectives.mate.busy) { onbNudged = true; objectives.say('Whenever you are ready, Captain, W lets the sails out.'); }
  // step 0 -> 1: the first time the sails go out (after she has had time to speak), she says what A and D do and the gauge appears
  if (step === 0 && ship.trim > 0.12 && tNow - onbT0 > 6) { state.story.onbStep = 1; onbStepT = tNow; onbShow('sail'); objectives.say(intro[1]); setHelp('A / D   steer'); }
  // step 1 -> 2: once she has really turned or sailed a little, and a good while later, the wind ring is explained
  else if (step === 1 && (Math.abs(ship.rudder) > 0.3 || state.stats.dist > 25) && tNow - onbStepT > 10) { state.story.onbStep = 2; onbShow('wind'); objectives.say(intro[2]); setHelp(''); }
  // every other piece arrives with the thing it belongs to
  if (gi >= 1 || state.gold !== onbGold0) onbShow('gold');
  if (gi >= 1) { onbShow('place'); onbShow('sail'); onbShow('wind'); if (!state.story.onbStep || state.story.onbStep < 2) { state.story.onbStep = 2; setHelp(''); } }
  if (gi >= 2) onbShow('clock');
  if (state.hp < ship.mods.maxHp || unlocked(state, 'cannons')) onbShow('hull');
}
let helpMode = 'start';
function setHelp(t) { helpEl.innerHTML = t ? `<span>${t}</span>` : ''; helpEl.style.opacity = t ? '1' : '0'; helpMode = t ? 'tip' : 'off'; }
let started = false;

function openModal(name) {
  if (!started) return;
  closeModal(true);
  modal = name;
  keys.clear();
  if (fishing.active) fishing.cancel();
  ({ pause: pauseEl, chart: chartEl, harbour: harbourEl, ship: shipEl, yard: yardEl, hut: hutEl, card: cardEl, pig: pigEl, greet: greetEl, cave: caveEl })[name].classList.add('open');
  if (name === 'pause') { showPauseMain(); }
  if (name === 'chart') { abyss.onMapOpen(ship); logbook.open(logTab);
    hutNod(1800); }
  if (name === 'harbour') renderHarbour();
  document.body.classList.toggle('ashore', name === 'harbour' || name === 'greet' || name === 'yard');
  if (name === 'ship') renderShipTrade();
  if (name === 'yard') { yardTry = { ...state.custom }; yardTab = 'hull'; yardIdle = 0; renderYard(); }
  if (name === 'hut') hut.open();
  audio.play(name === 'pause' ? 'pause' : 'ui');
  audio.setPaused(name === 'pause');
}
function closeModal(silent = false) {
  if (!modal) return;
  document.body.classList.remove('ashore');
  pauseEl.classList.remove('open'); chartEl.classList.remove('open'); harbourEl.classList.remove('open'); shipEl.classList.remove('open'); yardEl.classList.remove('open'); hutEl.classList.remove('open'); cardEl.classList.remove('open'); pigEl.classList.remove('open'); greetEl.classList.remove('open'); caveEl.classList.remove('open');
  if (modal === 'pause') audio.setPaused(false);
  if (modal === 'hut') hutLeft();
  if (modal === 'card') sighting.dismiss();
  if (modal === 'cave') { caveRun = null; caveScene.stop(); }
  if (modal === 'yard') { ship.setCustom(state.custom); yardTry = null; }   // anything only tried on is put back
  modal = null; harbourIsl = null;
  if (!silent) lastTs = performance.now();
}

// ---------------------------------------------------------------- input
const touch = { L: false, R: false, U: false, D: false };
const titleEl = $('title');
// ---- the title screen: the ship alone on open sea at a random hour, until you set sail
let titleScene = null;
function startTitle() {
  if (params.get('autostart') || params.get('notitle')) return;
  const sc = TITLE_SCENES[params.has('title') ? Math.max(0, TITLE_SCENES.findIndex((t) => t.id === params.get('title'))) : Math.floor(Math.random() * TITLE_SCENES.length)];
  // an empty stretch of sea (no island within three cells), searched outward from home
  let spot = [0, 600];
  find: for (let r = 250; r < 2000; r += 55) for (let a = 0; a < 6.28; a += 0.3) {
    const x = Math.cos(a) * r, z = Math.sin(a) * r, cx = Math.round(x / 110), cz = Math.round(z / 110);
    let ok = true; for (let dx = -3; dx <= 3 && ok; dx++) for (let dz = -3; dz <= 3; dz++) if (world.desc(cx + dx, cz + dz)) { ok = false; break; }
    if (ok) { spot = [x, z]; break find; }
  }
  titleScene = { sc, keep: { x: ship.pos.x, z: ship.pos.z, h: ship.heading, time: state.time, trim: ship.trim, forced }, t: 0 };
  ship.pos.set(spot[0], 0, spot[1]); ship.heading = 0.8; camHeading = 0.8; ship.trim = 0.9;
  state.time = sc.time; forced = 0; dread = 0;
  weather.force = sc.weather; Object.assign(weather, sc.weather);
  $('hud').classList.add('hidden');
  $('tNew').style.display = saved ? '' : 'none';
  document.fonts.load("86px 'Pirata One'").then(() => drawTitleLogo($('titleLogo')));
  setTimeout(() => $('tSail').focus(), 50);
}
function titleCam(dt) {
  const ts = titleScene, [ang, dist, hgt, lookY] = ts.sc.cam; ts.t += dt;
  const a = ship.heading + ang + Math.sin(ts.t * 0.05) * 0.25;   // a slow drift around the ship
  ship.speed = 0;                                                    // she only bobs in place
  camOverride = { pos: [ship.pos.x + Math.sin(a) * dist, hgt + Math.sin(ts.t * 0.4) * 0.15, ship.pos.z - Math.cos(a) * dist], look: [ship.pos.x, lookY, ship.pos.z] };
}
function endTitle() {
  if (!titleScene) return;
  const k = titleScene.keep; titleScene = null; camOverride = null;
  ship.pos.set(k.x, 0, k.z); ship.heading = k.h; camHeading = k.h; ship.trim = k.trim; ship.speed = 0;
  state.time = k.time; forced = k.forced; weather.force = null;
  if (params.get('hud') !== '0') $('hud').classList.remove('hidden');
}
// only Set sail leaves the title: a fade to black, then you are back aboard where your voyage left off
let newAskT = 0, sailing = false;
function setSail() {
  if (sailing || started) return; sailing = true;
  threads.setup(threadChoice());   // dev: the choice made on the title screen
  $('fade').classList.add('on');
  setTimeout(() => { begin(); setTimeout(() => $('fade').classList.remove('on'), 250); }, 1000);
}
function titleItems() { return [...document.querySelectorAll('#titleMenu button')].filter((b) => b.style.display !== 'none'); }
function titleKey(e) {
  const items = titleItems(); let i = Math.max(0, items.indexOf(document.activeElement));
  if (['ArrowDown', 'KeyS', 'ArrowUp', 'KeyW'].includes(e.code)) { i = (i + (e.code === 'ArrowDown' || e.code === 'KeyS' ? 1 : items.length - 1)) % items.length; items[i].focus(); e.preventDefault(); }
  if (['Enter', 'Space', 'KeyE'].includes(e.code)) { e.preventDefault(); (document.activeElement && items.includes(document.activeElement) ? document.activeElement : items[0]).click(); }
}
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

// fullscreen: on the title and in the pause menu (holding Esc or F11 also leave it)
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsOk = !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
function toggleFullscreen() {
  const d = document, el = d.documentElement;
  try {
    if (fsEl()) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
    else { const r = (el.requestFullscreen || el.webkitRequestFullscreen).call(el, { navigationUI: 'hide' }); if (r && r.catch) r.catch(() => {}); }
  } catch (err) { /* not allowed here */ }
}
function fsLabels() { $('tFull').textContent = fsEl() ? 'Windowed' : 'Fullscreen'; $('pbFull').textContent = `Fullscreen: ${fsEl() ? 'on' : 'off'}`; }
if (!fsOk) { $('tFull').style.display = 'none'; $('pbFull').style.display = 'none'; }
// in fullscreen, Esc should still pause instead of throwing you out: the keyboard lock keeps it for the game
// (Chrome/Edge; holding Esc still leaves fullscreen). Elsewhere P pauses too.
function fsChanged() {
  fsLabels(); const kb = navigator.keyboard;
  try { if (kb && kb.lock) { if (fsEl()) kb.lock(['Escape']).catch(() => {}); else kb.unlock(); } } catch (err) { /* not supported */ }
}
document.addEventListener('fullscreenchange', fsChanged); document.addEventListener('webkitfullscreenchange', fsChanged);
$('tFull').addEventListener('click', (e) => { e.stopPropagation(); toggleFullscreen(); });
$('pbFull').addEventListener('click', () => { toggleFullscreen(); $('pbFull').focus(); });
$('tNew').addEventListener('click', (e) => {
  e.stopPropagation();
  if (performance.now() - newAskT > 4000) { newAskT = performance.now(); $('tNew').textContent = 'Really? Press again'; return; }
  noSave = true; try { localStorage.removeItem(SAVE_KEY); sessionStorage.setItem('hoist-new', '1'); if (fsEl()) sessionStorage.setItem('hoist-fs', '1'); } catch (err) { /* storage blocked */ }
  location.href = location.pathname;
});

// ---- a new voyage opens with a short cinematic: the camera starts high over Tama and drifts down to behind the ship, then the game begins.
// Any key or click skips it. Test runs (autostart, nomate) and continued voyages go straight in.
const INTRO_DUR = 9;
let introT = -1;
const introWanted = () => params.get('intro') === '1' || (!state.goals.started && !params.get('autostart') && !params.get('nomate') && !params.has('x'));
function endIntro() {
  if (introT < 0) return;
  introT = -1; document.body.classList.remove('intro');
  if (!params.get('nomate')) objectives.start();
}
function skipIntro() { if (introT >= 0 && introT > 0.8) introT = Math.max(introT, INTRO_DUR - 1.2); }
function begin() {
  if (started) return;
  started = true;
  endTitle();
  titleEl.style.display = 'none';
  audio.start();
  if (introWanted()) { introT = 0; document.body.classList.add('intro'); }
  else if (!params.get('nomate')) objectives.start();
}
let forced = params.has('dread') ? clamp(parseFloat(params.get('dread')), 0, 1) : null;

window.addEventListener('pointerdown', () => skipIntro());
window.addEventListener('keydown', (e) => {
  if (introT >= 0) { skipIntro(); return; }
  if (e.target && e.target.closest && e.target.closest('#mixer') && e.code !== 'F8') return;   // arrow keys on a mixer slider move the slider, not the ship
  if (!started && $('thPanel').classList.contains('open')) return;
  if (!started) { if (titleScene) titleKey(e); else begin(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    e.preventDefault();
    if (modal === 'pause') { if ($('pauseControls').style.display !== 'none' || $('pauseAbyss').style.display !== 'none' || $('pauseSound').style.display !== 'none') showPauseMain(); else closeModal(); }
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
  if (modal === 'greet') { if (['KeyE', 'Space', 'Enter', 'NumpadEnter'].includes(e.code)) { e.preventDefault(); greetAdvance(); } return; }
  if (modal === 'cave') {
    if ($('roll').classList.contains('open')) return;
    if (cardBusy === 'done' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); $('caveDone').click(); return; }
    const n = parseInt(e.key, 10); if (!cardBusy && n >= 1) { const b = $('caveChoices').querySelectorAll('button')[n - 1]; if (b) b.click(); }
    return;
  }
  if (modal === 'card') {
    if ($('roll').classList.contains('open')) return;
    if (cardBusy === 'done' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) { $('cardDone').click(); return; }
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
    const order = ['board', 'market', 'tavern', 'wright'];
    if (e.code === 'KeyE') { closeModal(); return; }
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) { hbTab = order[n - 1]; renderHarbour(); }
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') { hbTab = order[(order.indexOf(hbTab) + (e.code === 'ArrowRight' ? 1 : 3)) % 4]; renderHarbour(); }
    return;
  }
  if (e.code === 'KeyM') { logTab = 'map'; openModal('chart'); return; }
  if (e.code === 'KeyJ') { logTab = 'quests'; openModal('chart'); return; }
  if (modal) return;
  if (e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  keys.add(e.code);
  if (e.code === 'Space') { if (fishing.active) { fishing.hold = true; fishing.press(true); } else if (objectives.mate.cur) objectives.mate.skip(); else if (unlocked(state, 'cannons')) fireCannons(); }   // Space (or Enter) moves Mara's text on
  if (e.code === 'KeyC' && unlocked(state, 'fish')) fishing.press();
  if (e.code === 'KeyY' && !abyss.maraHint()) objectives.askHint(dread);
  if (e.code === 'Enter' || e.code === 'NumpadEnter') objectives.mate.skip();
  if (e.code === 'KeyE') tryInteract();
  if (e.code === 'KeyH') $('hud').classList.toggle('hidden');
  if (e.code === 'F1') { e.preventDefault(); helpMode = helpMode === 'full' ? 'off' : 'full'; helpEl.innerHTML = '<span>A/D steer &middot; W/S sails &middot; G oars &middot; E interact &middot; C fish<br>M log &middot; J quests &middot; Q tracker &middot; Esc pause &middot; H hide HUD &middot; F1 this help</span>'; helpEl.style.opacity = helpMode === 'full' ? '1' : '0'; }
  if (e.code === 'KeyG' && !modal && started && unlocked(state, 'oars')) { ship.rowing = !ship.rowing; toast(ship.rowing ? 'Oars out' : 'Oars in, sails up', false, 2200); if (ship.rowing) objectives.remark('oars', dread); }
  if (e.code === 'KeyQ' && !modal) { settings.tracker = settings.tracker === false; store.set(SETTINGS_KEY, settings); }
  if (!DEV) return;   // test keys only with ?dev=1
  if (e.code === 'F8') { e.preventDefault(); mixer.toggle(); }
  if (e.code === 'Backquote') debugEl.style.display = debugEl.style.display === 'block' ? 'none' : 'block';
  if (e.code === 'Digit0') { forced = null; abyss.stopTest(); }
  if (/^Digit[1-5]$/.test(e.code)) forced = (parseInt(e.code.slice(5), 10) - 1) / 4;
  if (e.code === 'BracketRight') state.time = (state.time + 1 / 24) % 1;
  if (e.code === 'BracketLeft') state.time = (state.time - 1 / 24 + 1) % 1;
});
window.addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'Space') fishing.hold = false; });
window.addEventListener('blur', () => { if (started && !modal && !params.get('shot')) openModal('pause'); });
titleEl.addEventListener('pointerdown', () => { if (!titleScene) begin(); });   // with the live title, only Set sail starts

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
if (!AUDIO_ENABLED) $('pbSoundMenu').style.display = 'none';
$('pbSoundMenu').addEventListener('click', () => { $('pauseMain').style.display = 'none'; $('pauseSound').style.display = 'block'; $('sdBack').focus(); });
$('sdBack').addEventListener('click', () => { showPauseMain(); $('pbSoundMenu').focus(); });
let volT = 0;
for (const r of $('pbVols').querySelectorAll('.pvol')) {   // the player's own volume sliders
  const inp = r.querySelector('input'), k = inp.dataset.k;
  inp.value = Math.round((audio.userVol[k] != null ? audio.userVol[k] : 1) * 100); r.querySelector('b').textContent = `${inp.value}%`;
  inp.addEventListener('input', () => { r.querySelector('b').textContent = `${inp.value}%`; audio.setUserVol(k, inp.value / 100); if (modal === 'pause' && audio.ctx) { audio.ctx.resume(); clearTimeout(volT); volT = setTimeout(() => { if (modal === 'pause') audio.ctx.suspend(); }, 1800); }   // the sound plays for a moment while you drag, so you can hear the level
    settings.vol = { ...audio.userVol }; store.set(SETTINGS_KEY, settings); });
  inp.addEventListener('keydown', (e) => { if (e.code.startsWith('Arrow')) e.stopPropagation(); });   // arrows move the slider, not the pause menu focus (Esc still closes)
}
function showPauseMain() {
  $('pbNew').textContent = 'New voyage (erase save)';
  $('pauseMain').style.display = 'block'; $('pauseControls').style.display = 'none'; $('pauseAbyss').style.display = 'none'; $('pauseSound').style.display = 'none';
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
if (!DEV) { $('pbAbyss').style.display = 'none'; $('pbMixer').style.display = 'none'; $('devKeys').style.display = 'none'; settings.abyss = {}; }   // players get every effect, no test menu
const mixer = new Mixer(audio, (t, d, ms) => toast(t, d, ms));
$('pbMixer').addEventListener('click', () => { closeModal(); mixer.toggle(true); });
//   // players get every effect, no test menu
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
shipEl.addEventListener('pointerdown', (e) => { if (e.target === shipEl) closeModal(); });
$('shClose').addEventListener('click', () => closeModal());
$('hbClose').addEventListener('click', () => closeModal());

// ---------------------------------------------------------------- harbour shipwright
const UP_MUL = [1.3, 1.6, 1.9];   // economy: the shipwright charges more, steeply for the higher levels
const upCost = (u, lv, rep) => Math.ceil(u.cost[lv] * UP_MUL[lv] * discount(rep) * costMul());
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
  const dk = dread > 0.6, hbd = harbourIsl && harbourIsl.desc;
  closeModal();
  $('fade').classList.add('on');
  setTimeout(() => {
    if (state.time * 24 >= 6) { noteSkip(); state.dayN++; crewLeave(); }    // slept past midnight
    state.time = 6 / 24; state.story.restDay = state.dayN;   // Mara is rested
    state.hp = ship.mods.maxHp;
    $('fade').classList.remove('on');
    toast(dk ? REST_DARK[Math.floor(Math.random() * REST_DARK.length)] : REST_LINES[Math.floor(Math.random() * REST_LINES.length)], dk, 6000);
    objectives.remark('rested', dread);
    { const x = hbd ? threads.onRest(hbd) : ''; if (x) setTimeout(() => toast(x, true, 8000), 2400); }
  }, 1100);
}
function renderHarbour() {
  const d = harbourIsl.desc, rep = repOf(state, d.id), lvl = friendLevel(rep);
  $('hbName').textContent = d.name;
  $('hbLine').textContent = harbourLine;
  $('hbBannerName').textContent = d.name;
  $('hbGold').textContent = state.gold;
  $('hbTabs').querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.t === hbTab));
  $('hbPlace').textContent = { board: "Harbourmaster's board", market: 'Market', tavern: 'Tavern', wright: 'Shipwright' }[hbTab];
  postBadges(d, rep);
  const pane = $('hbPane');
  let html = '';
  if (hbTab === 'board') {
    // finish what you came for first: deliveries, passengers and finished commissions for this harbour
    const due = [];
    if (state.job && state.job.toId === d.id) due.push(`<div class="qrow"><div><b>${pxi('letter')} Deliver ${state.job.item}</b><br><small>+${state.job.reward}g</small></div><button id="doDeliver">Deliver</button></div>`);
    if (state.passenger && state.passenger.toId === d.id) due.push(`<div class="qrow"><div><b>${pxi('talk')} ${state.passenger.name} goes ashore</b><br><small>+${state.passenger.reward}g fare</small></div><button id="doDropoff">Drop off</button></div>`);
    for (const q of state.quests.filter((x) => x.giverId === d.id && questProgress(x, state) >= questNeed(x))) due.push(`<div class="qrow"><div><b>${questIcon(q)} ${questTitle(q, dread)}</b><br><small>done · +${q.reward}g</small></div><button data-hand="${q.id}">Finish</button></div>`);
    for (const lt of lettersAt(d)) html += `<div class="sec">A LETTER</div><div class="qrow letter"><div><b>${pxi('letter')} ${lt.title}</b><br><small>${lt.sub}</small></div><button id="takeLetter" data-letter="${lt.key}">Take it</button></div>`;
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
    const pass = !state.passenger && unlocked(state, 'passengers') && makePassenger(world, d, (state.serial[d.id + '#p'] || 0) + state.dayN * 7, !!(objectives.current && objectives.current.id === 'passenger'));
    if (pass) html += `<div class="sec">PASSAGE</div><div class="qrow"><div><b>${pxi('talk')} ${pass.name}, ${pass.who}</b><br><small>wants passage to ${pass.toName} · pays ${pass.reward}g</small></div><button id="takePass">Take aboard</button></div>`;
    const r = findRumour(world, d, state);
    if (r) html += `<div class="sec">RUMOURS</div><div class="qrow"><div><b>${pxi('talk')} A sailor talks of buried treasure</b></div><button id="rumourBuy" ${state.gold >= RUMOUR_COST ? '' : 'disabled'}>${RUMOUR_COST}g</button></div>`;
    const chartCost = Math.ceil(30 * costMul());
    if (!state.charts[d.id]) html += `<div class="sec">LOCAL CHART</div><div class="qrow"><div><b>${pxi('flag')} A hand-drawn chart of these waters</b><br><small>the islands around ${d.name}, as the locals know them</small></div><button id="buyChart" ${state.gold >= chartCost ? '' : 'disabled'}>${chartCost}g</button></div>`;
    for (const r of threads.harbourRows(d)) html += `<div class="sec">ON THE PIER</div><div class="qrow letter"><div><b>${pxi('talk')} ${r.html}</b></div><button class="thrAct" data-act="${r.id}">${r.btn}</button></div>`;
    const po = petOffer(d); if (po) html += `<div class="sec">ON THE PIER</div><div class="qrow letter"><div><b>${pxi('talk')} ${PETS[po].title}</b><br><small>${PETS[po].sub}</small></div><button id="takePet" data-pet="${po}">${PETS[po].btn}</button></div>`;
    pane.innerHTML = html;
    const bc = $('buyChart'); if (bc) bc.addEventListener('click', () => {
      if (state.gold < chartCost) return; state.gold -= chartCost; state.charts[d.id] = true;
      const k = revealAround(d.x, d.z);
      const note = CHART_NOTES[d.custom]; if (note) state.notes.push({ text: `${d.name}'s chart: ${note}`, dark: ['nochildren', 'statues', 'bells'].includes(d.custom) });
      toast(k ? `A hand-drawn chart of ${d.name}'s waters. ${k} island${k > 1 ? 's' : ''} added to your map.` : `A hand-drawn chart of ${d.name}'s waters. You know them all already. It is a lovely drawing.`, false, 6000);
      audio.play('buy'); renderHarbour(); });
    const ja = $('jobAccept');
    if (ja) ja.addEventListener('click', () => { state.job = j; toast(`Delivery taken: ${j.toName} (+${j.reward}g)`, j.dark); audio.play('buy'); renderHarbour(); });
    pane.querySelectorAll('.thrAct').forEach((b) => b.addEventListener('click', () => { const id = b.dataset.act; threads.harbourAct(id, d); if (id === 'hollow') return; renderHarbour(); }));
    const tkp = $('takePet'); if (tkp) tkp.addEventListener('click', () => { takePet(tkp.dataset.pet); renderHarbour(); });
    const tl = $('takeLetter'); if (tl) tl.addEventListener('click', () => { takeLetter(tl.dataset.letter); renderHarbour(); });
    const dv = $('doDeliver'); if (dv) dv.addEventListener('click', () => { completeJobIfHere(d); renderHarbour(); });
    const dp = $('doDropoff'); if (dp) dp.addEventListener('click', () => {
      const p = state.passenger; state.gold += p.reward; state.passenger = null; state.stats.passengers = (state.stats.passengers || 0) + 1;
      repOf(state, d.id).deliveries++; toast(`${p.name} waves goodbye from the pier. (+${p.reward}g)`, false, 6000); audio.play('treasure');
      if (state.crew.length < 2 && Math.random() < 0.3 && !state.crew.some((c) => c.name === p.name)) {   // now and then a passenger asks to sail along for a few days
        const ids = Object.keys(TRAITS); signOn({ name: p.name, look: 'who did not want to get off', trait: ids[Math.floor(Math.random() * ids.length)], wish: { kind: 'volcano', text: 'wants to see a fire mountain', done: false }, cost: 0 }, 3);
        setTimeout(() => toast(`${p.name} asks to sail along for a few days. (${TRAITS[state.crew[state.crew.length - 1].trait].name} joins the crew.)`, false, 7000), 1800);
      }
      renderHarbour(); });
    const tp = $('takePass'); if (tp) tp.addEventListener('click', () => {
      state.passenger = pass; state.serial[d.id + '#p'] = (state.serial[d.id + '#p'] || 0) + 1; state.tracked = 'passenger';
      toast(`${pass.name} comes aboard, bound for ${pass.toName}.`, false, 5000); renderHarbour(); });
    pane.querySelectorAll('[data-hand]').forEach((b) => b.addEventListener('click', () => { handIn(state.quests.find((q) => q.id === b.dataset.hand), d); renderHarbour(); }));
    pane.querySelectorAll('[data-accept]').forEach((b) => b.addEventListener('click', () => { acceptCommission(offers.find((o) => o.id === b.dataset.accept)); renderHarbour(); }));
    const rb = $('rumourBuy');
    if (rb) rb.addEventListener('click', () => {
      if (state.gold < RUMOUR_COST) return;
      state.gold -= RUMOUR_COST;
      const f = falseRumour(d), t = f || r.d, dist = f ? f.dist : r.dist;   // not everything a sailor says is true; nothing tells you which
      state.rumoured[t.id] = { name: t.name, x: Math.round(t.x), z: Math.round(t.z), source: `a drunk in ${d.name}`, found: false };
      if (f) state.rumoured[t.id].fake = f.variant;
      toast(`Rumour: ${t.name}, ${bearingName(t.x - d.x, t.z - d.z)} of here, ~${Math.round(dist)} fathoms. Marked on your map.`, dread > 0.5, 7000);
      audio.play('buy'); renderHarbour();
    });
  } else if (hbTab === 'market') {
    const hg = state.haggle && state.haggle.id === d.id && state.haggle.day === state.dayN ? state.haggle : null, hm = (hg ? hg.mult : 1) / dreamCost() * (isMarketDay() ? 1.25 : 1) * (threads.touched(d) ? 1.15 : 1) * threads.priceMul(d);
    const fishVal = Math.round(state.catch.reduce((a, f) => a + f.value, 0) * 0.7 * (1 + 0.05 * lvl) * hm * (isFestival(d) ? 1.5 : 1));
    const fruitList = Object.entries(state.fruit).filter(([, n]) => n > 0);
    const fruitVal = Math.round(fruitList.reduce((a, [f, n]) => a + FRUITS[f].price * n, 0) * 0.7 * (1 + 0.05 * lvl) * hm);
    const ammoCost = Math.ceil(25 * discount(rep) * costMul());
    html += `<div class="sec">STANDING HERE</div><small>${pxi('star').repeat(lvl)}${pxi('nostar').repeat(3 - lvl)}${lvl ? `  (-${lvl * 5}% prices, +${lvl * 5}% for your catch)` : '  (visit and deliver to be remembered)'}</small>`;
    html += '<div class="sec">SELL</div>' + priceNote() + (isFestival(d) ? '<small>Festival day: fish fetch half again as much.</small>' : isMarketDay() ? '<small>Market day: everything sells for a quarter more.</small>' : '');
    if (unlocked(state, 'haggle')) html += `<div class="qrow"><div><b>${pxi('coin')} Haggle</b><br><small>${hg ? (hg.mult > 1 ? `they pay ${Math.round((hg.mult - 1) * 100)}% more today` : hg.n === 1 ? 'word got round: 20% less for your catch, everything else 10% dearer' : 'they are offended: 10% less today') : 'a talk roll, once a day: 12 or more'}</small></div>${hg ? '' : '<button id="haggle">Roll</button>'}</div>`;
    html += `<div class="qrow"><div><b>${pxi('fish')} Fish</b><br><small>${state.catch.length ? `${state.catch.length} in the hold` : 'none: slow down and press C at sea'}</small></div>${state.catch.length ? `<button id="sellFish">+${fishVal}g</button>` : ''}</div>`;
    html += `<div class="qrow"><div><b>${pxi('banana')} Fruit</b><br><small>${fruitList.length ? fruitList.map(([f, n]) => `${n} ${plural(fruitName(f, dread), n)}`).join(', ') : 'none: press E at jungle isles'}</small></div>${fruitList.length ? `<button id="sellFruit">+${fruitVal}g</button>` : ''}</div>`;
    { // the Colour thread: the quiet buyer, and a market the colour has already reached
      const cb = threads.c, hold = state.catch.filter((f) => f.bright), bv = Math.round(hold.reduce((a, f) => a + f.value, 0) * 2.2);
      if (threads.touched(d)) html += '<small>The fish stalls are full of bright ones today. Nobody says where from.</small>';
      if (cb && hold.length && !cb.end) html += `<div class="sec">A QUIET BUYER</div><div class="qrow"><div><b>${pxi('fish')} The bright ones</b><br><small>a stranger in a grey coat would take ${hold.length} off your hands at more than twice the price, and not ask where</small></div><button id="sellBright">+${bv}g</button></div>`;
    }
    if (unlocked(state, 'cannons')) html += `<div class="sec">BUY</div><div class="qrow"><div><b>${pxi('ball')} 10 cannonballs</b><br><small>you have ${state.ammo}</small></div><button id="buyAmmo" ${state.gold >= ammoCost ? '' : 'disabled'}>${ammoCost}g</button></div>`;
    html += `<div class="sec">SHIPYARD</div><div class="qrow"><div><b>${pxi('paint')} Paint, sails, pennants, figureheads</b></div><button id="openYard">Open</button></div>`;
    pane.innerHTML = html;
    const sf = $('sellFish'); if (sf) sf.addEventListener('click', () => { state.gold += fishVal; toast(`Sold ${state.catch.length} fish for ${fishVal} gold.`); state.catch = []; audio.play('buy'); renderHarbour(); });
    const sb = $('sellBright'); if (sb) sb.addEventListener('click', () => {
      const cb = threads.c, hold = state.catch.filter((f) => f.bright), v = Math.round(hold.reduce((a, f) => a + f.value, 0) * 2.2);
      state.gold += v; state.catch = state.catch.filter((f) => !f.bright); if (cb) cb.end = 'sold'; addMark('salt');
      toast(`+${v} gold. He does not weigh it. He lifts it once, nods, and is not on the quay when you look again.`, false, 8000); audio.play('buy'); renderHarbour(); });
    const sfr = $('sellFruit'); if (sfr) sfr.addEventListener('click', () => { state.gold += fruitVal; toast(`Sold fruit for ${fruitVal} gold.`); state.fruit = {}; audio.play('buy'); renderHarbour(); });
    if ($('buyAmmo')) $('buyAmmo').addEventListener('click', () => { if (state.gold < ammoCost) return; state.gold -= ammoCost; state.ammo += 10; audio.play('buy'); renderHarbour(); });
    $('openYard').addEventListener('click', () => openModal('yard'));
    const hgb = $('haggle'); if (hgb) hgb.addEventListener('click', () => {
      rollCheck(state, { label: 'Talk', kind: 'talk', dc: 12, harbour: d.id, extra: lvl ? [['standing', lvl]] : [] }, (ok, n) => {
        state.haggle = { id: d.id, day: state.dayN, n, mult: ok ? (n === 20 ? 1.5 : 1.3) : n === 1 ? 0.8 : 0.9 };
        toast(ok ? 'The fishmonger laughs and gives in.' : n === 1 ? 'The fishmonger spits on the planks. By noon the whole harbour has heard.' : 'The fishmonger folds their arms. Prices just got worse.', false, 4000); if (harbourIsl) renderHarbour(); }); });
  } else if (hbTab === 'tavern') {
    { // rooms are let from 17:00, you wake at 06:00 with the hull mended
      const hour = state.time * 24, open = hour >= 17 || hour < 5, bedCost = Math.ceil(8 * discount(rep) * costMul());
      html += `<div class="sec">ROOMS</div><div class="qrow"><div><b>${pxi('bed')} A bed for the night</b><br><small>${open ? 'sleep until 06:00, the crew mends the hull' : 'rooms are let from 17:00'}</small></div><button id="restBed" ${open && state.gold >= bedCost ? '' : 'disabled'}>${bedCost}g</button></div>`;
    }
    { // the fishers at the quay will tell you where one kind bites, once a day per harbour: the only way to be told
      const asked = state.fishAsk[d.id] === state.dayN, unheard = FISH.filter((f) => !f.dark && !state.fishHeard[f.id]);
      html += `<div class="sec">AT THE QUAY</div><div class="qrow"><div><b>${pxi('fish')} Ask the fishers</b><br><small>${asked ? 'they have said what they will for today' : unheard.length ? 'where does anything bite?' : 'you have heard it all'}</small></div><button id="askFish" ${asked || !unheard.length ? 'disabled' : ''}>Ask</button></div>`;
    }
    if (window.__BUILD !== 'demo' && laterOK()) { const cl = threads.clueLines(); if (cl.length) html += `<div class="sec">OVERHEARD</div><small>${cl[Math.abs(hash2(d.seed, state.dayN, 5)) % cl.length]}</small>`; }
    if (unlocked(state, 'crew')) { // hands for hire, and dice with the locals
      const hand = crewForHire(d, state.dayN, state, world);
      html += '<div class="sec">AT THE TABLES</div>';
      if (hand && !state.crew.some((c) => c.name === hand.name)) html += `<div class="qrow"><div><b>${pxi('talk')} ${hand.name}, ${hand.look}</b><br><small>${TRAITS[hand.trait].name}: ${TRAITS[hand.trait].text} · ${hand.wish.text} · stays ${hand.stay || 4} days</small></div><button id="hireHand" ${state.gold >= hand.cost && state.crew.length < 2 ? '' : 'disabled'}>${state.crew.length < 2 ? `Hire ${hand.cost}g` : 'Crew full'}</button></div>`;
      for (const c of state.crew) html += c.permanent ? `<div class="qrow"><div><b>${pxi('talk')} ${c.name}</b> <small>(${TRAITS[c.trait].name}, stays)</small></div></div>` : `<div class="qrow"><div><b>${pxi('talk')} ${c.name}</b> <small>(${TRAITS[c.trait].name}, ${daysLeft(c)} days left)</small></div><button data-dismiss="${c.name}">Let go</button></div>`;
      html += `<div class="qrow"><div><b>${pxi('pip')} Dice with the locals</b><br><small>first to 30 · stake 10g</small></div><button id="playPig" ${state.gold >= 10 ? '' : 'disabled'}>Sit down</button></div>`;
      pendingHand = hand;
    } else html += '<small>A fiddler, a fire, a lot of very old chairs. Nobody here knows you yet.</small>';
    pane.innerHTML = html;
    $('restBed').addEventListener('click', () => restAtTavern(Math.ceil(8 * discount(rep) * costMul())));
    const af = $('askFish'); if (af) af.addEventListener('click', () => {
      const cl = threads.c;
      if (cl && !cl.found && !cl.rumoured && state.fishAsk[d.id] !== state.dayN && Math.random() < 0.5) { cl.rumoured = true; state.fishAsk[d.id] = state.dayN; toast(`A fisher at the quay: "Out by ${cl.src.name} the water has gone a shade I have no word for. The fish there are too big. Nobody has eaten one twice."`, false, 11000); audio.play('ui'); renderHarbour(); return; }
      const unheard = FISH.filter((f) => !f.dark && !state.fishHeard[f.id]); if (!unheard.length || state.fishAsk[d.id] === state.dayN) return;
      const f = unheard[Math.floor(Math.random() * unheard.length)];
      state.fishHeard[f.id] = true; state.fishAsk[d.id] = state.dayN;
      toast(`A fisher at the quay: "${HABITAT[f.id].say}" (Fisherman's log)`, false, 9000); audio.play('ui'); renderHarbour();
    });
    const hh = $('hireHand'); if (hh) hh.addEventListener('click', () => {
      const h = pendingHand; if (!h || state.gold < h.cost || state.crew.length >= 2) return;
      state.gold -= h.cost; signOn(h, h.stay || 4); audio.play('buy'); toast(`${h.name} signs on. ${h.name} nods once and says nothing.`, false, 5000); objectives.remark('crew', dread); renderHarbour(); });
    pane.querySelectorAll('[data-dismiss]').forEach((b) => b.addEventListener('click', () => { state.crew = state.crew.filter((c) => c.name !== b.dataset.dismiss); toast(`${b.dataset.dismiss} goes ashore with a small wave.`); renderHarbour(); }));
    if ($('playPig')) $('playPig').addEventListener('click', () => { if (state.gold < 10) return; state.gold -= 10; state.stats.pig = (state.stats.pig || 0) + 1; const isl = harbourIsl; openModal('pig'); pigHome = isl; pig.start(LOCALS[Math.floor(Math.random() * LOCALS.length)], 10); });
  } else {
    if (hbShipLine) html += `<p class="quote">${hbShipLine}</p>`;
    html += priceNote();   // the shipwright talks here, not over the welcome
    html += UPGRADES.map((u, i) => {
      const lv = state.upgrades[u.id], maxed = lv >= MAX_LEVEL;
      const cost = maxed ? 0 : upCost(u, lv, rep);
      const can = !maxed && state.gold >= cost;
      return `<div class="qrow"><div><b>${i + 1}. ${u.name}</b> <span class="pips">${pxi('pip').repeat(lv)}${pxi('nopip').repeat(MAX_LEVEL - lv)}</span><br><small>${maxed ? 'Fully upgraded' : u.text[lv]}</small></div><button data-id="${u.id}" ${can ? '' : 'disabled'}>${maxed ? 'MAX' : `${cost}g`}</button></div>`;
    }).join('');
    pane.innerHTML = html;
    pane.querySelectorAll('button[data-id]').forEach((b) => b.addEventListener('click', () => buyUpgrade(b.dataset.id)));
  }
  tutorialMarks();
}
$('hbTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b || !harbourIsl) return; if (b.dataset.t === 'sail') { closeModal(); return; } hbTab = b.dataset.t; audio.play('ui', { vol: 0.4 }); renderHarbour(); });
// a red number on a sign when something waits there
// the tutorial marks the sign (and the button) the current goal needs; goals later in the story carry no mark at all
const tutorialGoal = () => { const g = objectives.current; if (!g || !g.tab) return null; try { if (g.check({ state, ship, world })) return null; } catch (e) { /* not checkable yet */ } return g; };   // a goal already done carries no mark
function tutorialMarks() {
  let g = tutorialGoal();
  if (g && g.id === 'job' && state.job && harbourIsl && state.job.toId !== harbourIsl.desc.id) g = null;   // accepted already: nothing to press here
  if (g && g.id === 'dig' && (state.story.letterP1 !== 'wait' || !harbourIsl || harbourIsl.desc.id !== '0,-1')) g = null;   // only while Perrin's letter waits, and only at Tama
  $('hbTabs').querySelectorAll('.post').forEach((b) => b.classList.toggle('next', !!g && b.dataset.t === g.tab));
  $('hbPane').querySelectorAll('.hl').forEach((e) => e.classList.remove('hl'));
  if (!g || hbTab !== g.tab) return;
  for (const id of g.mark || []) {
    const el = id === 'buy' ? $('hbPane').querySelector('button[data-id]:not([disabled])') : $(id);
    if (el && !el.disabled) el.classList.add('hl');
  }
}
// pressing a marked button clears every mark at once (the goal catches up a moment later)
$('hbPane').addEventListener('click', (e) => { if (e.target.closest('.hl')) { $('hbPane').querySelectorAll('.hl').forEach((x) => x.classList.remove('hl')); $('hbTabs').querySelectorAll('.next').forEach((x) => x.classList.remove('next')); } }, true);
// ---- letters: Perrin's riddle and his notes wait at the Tama board as a letter. Nothing is handed over until the player takes it.
function lettersAt(d) {
  const out = [];
  if (d.id === '0,-1') {
    if (state.story.letterP1 === 'wait') out.push({ key: 'letterP1', title: 'A letter from Old Perrin', sub: 'sealed, left with the harbourmaster' });
    if (state.story.letterP2 === 'wait') out.push({ key: 'letterP2', title: 'Another letter from Old Perrin', sub: 'the harbourmaster waves it at you' });
  }
  return out;
}
// ---- ship's companions: a stray cat on the pier and a gull on a piling. Optional, harbour events, never needed for anything.
const PETS = {
  cat: { title: 'A ginger cat on the pier', sub: 'she has been watching your ship all morning', btn: 'Take her aboard', toast: 'The cat steps aboard as if she had paid for the ticket.' },
  gull: { title: 'A gull on the piling', sub: 'it eyes your catch and not much else', btn: 'Offer a fish', toast: 'The gull hops onto the rail. It has opinions about your sailing.' },
};
const companions = {};
function addCompanion(kind) { if (!companions[kind]) companions[kind] = new Companion(ship, kind, hash2(state.seed, kind === 'cat' ? 5 : 6, 1)); return companions[kind]; }
/** which companion (if any) waits at this harbour: Tama has the cat, Velto the gull, other harbours roughly two in seven */
function petOffer(d) {
  if (!laterOK()) return null;
  const own = state.story.pets || {};
  const k = d.id === '0,-1' ? 'cat' : d.id === '-2,-1' ? 'gull' : [ 'cat', 'gull' ][hash2(d.seed, 31, 7) % 7];
  return k && PETS[k] && !own[k] ? k : null;
}
function takePet(kind) {
  state.story.pets = { ...(state.story.pets || {}), [kind]: 1 };
  addCompanion(kind); audio.play('discover'); toast(PETS[kind].toast, false, 6000); autosave();
}
for (const k of Object.keys(state.story.pets || {})) if (PETS[k]) addCompanion(k);   // companions from an earlier session
function takeLetter(key) {
  state.story[key] = 'taken'; audio.play('ui');
  const mate = objectives.mate;
  if (key === 'letterP1') {
    giveMap('1,-1', 'Old Perrin', true, true);   // no pile of text: Mara asks what you have, then sends you to the log
    mate.say('A letter? What have you got there, Captain?'); mate.say('Open your log with M and look under the Riddles tab.');
    state.story.tabMark = 'riddles'; state.story.riddleLine = 'wait';
  } else if (key === 'letterP2') {
    perrinNote(true);
    mate.say('Another letter from Perrin? Open your log with M and read it under the Journal tab.');
    state.story.tabMark = 'journal'; state.story.noteLine = 'wait';
  }
}
/** the log was opened on a tab: if Mara sent you there, she answers (once) and the mark goes */
function tabOpened(tab) {
  const st = state.story;
  if (st.tabMark === tab) st.tabMark = null;
  if (tab === 'riddles' && st.riddleLine === 'wait') { st.riddleLine = 'done'; objectives.say('Perrin and his riddles! Find the shore it describes, stop the ship and press E to dig.'); }
  if (tab === 'journal' && st.noteLine === 'wait') { st.noteLine = 'done'; objectives.say('He wants us to check his chart. Read the note, then go and look.'); }
}
function postBadges(d, rep) {
  let due = (state.job && state.job.toId === d.id ? 1 : 0) + (state.passenger && state.passenger.toId === d.id ? 1 : 0);
  due += state.quests.filter((x) => x.giverId === d.id && questProgress(x, state) >= questNeed(x)).length;
  const goods = state.catch.length + Object.values(state.fruit).reduce((a, n) => a + n, 0);
  const canUp = UPGRADES.some((u) => state.upgrades[u.id] < MAX_LEVEL && state.gold >= upCost(u, state.upgrades[u.id], rep));
  const set = (t, v) => { $('hbTabs').querySelector(`[data-t="${t}"] em`).textContent = v || ''; };
  set('board', due); set('market', goods);
  if (lettersAt(d).length) $('hbTabs').querySelector('[data-t="board"] em').innerHTML = pxi('letter');   // a little letter on the sign set('tavern', ''); set('wright', canUp ? '!' : ''); set('sail', '');
}
// one quiet line when the Lady's last throw moved the prices; nobody says why
const priceNote = () => { const k = dreamCost(); return k > 1 ? '<small>Prices are up today. Nobody says why.</small>' : k < 1 ? '<small>Prices are down today. Everyone seems to have slept well.</small>' : ''; };
let harbourLine = '', hbShipLine = '';
// the greeting: a villager's line types out in a box like Mara's, then the harbour menu comes up
let greetNow = null;
function showGreeting(d, say) {
  const isl = harbourIsl;
  openModal('greet'); harbourIsl = isl;
  greetEl.classList.toggle('dark', !!say.dark);
  $('grName').textContent = d.name; $('grFace').src = portrait(say.speaker); $('grWho').textContent = speakerName(say.speaker);
  $('grTxt').textContent = ''; $('grMore').classList.remove('on');
  greetNow = { say, shown: 0, timer: setInterval(() => {
    const t = greetNow.say.text; greetNow.shown++; greetText(t.slice(0, greetNow.shown), say.slow);
    if (greetNow.shown >= t.length) { clearInterval(greetNow.timer); greetNow.timer = null; $('grMore').classList.add('on'); }
  }, say.slow ? 1300 : say.slowWord ? 320 : 34) };   // the stare: one dot at a time, slowly
}
function greetText(t, dots) {
  if (dots) $('grTxt').innerHTML = '<i class="gdot"></i>'.repeat(t.length); else $('grTxt').textContent = t;
}
function greetAdvance() {
  if (!greetNow) return;
  if (greetNow.timer) { clearInterval(greetNow.timer); greetNow.timer = null; greetText(greetNow.say.text, greetNow.say.slow); $('grMore').classList.add('on'); return; }
  const said = greetNow.say; greetNow = null;
  if (said.endsDemo && state.story.demoEnd === 'pending') {   // someone spoke of the throw: that is where the demo ends
    state.story.demoEnd = 'done'; closeModal(); setTimeout(showDemoEnd, 1800); return;
  }
  const isl = harbourIsl; closeModal(true); harbourIsl = isl;
  $('hbSaid').textContent = said.slow ? '' : `"${said.text}"`;   // the line stays under the name while you are ashore
  openModal('harbour');
}
$('grBox').addEventListener('click', () => greetAdvance());

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
  windView.dir = abyss.windDir(w.dir); windView.strength = w.strength; windView.gust = w.gust; windView.floor = abyss.windFloor(Math.max(ship.mods.floor, ship.floorMin || 0)); windView.wedge = ship.wedge; windView.wedgeEnd = ship.wedgeEnd;
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
  const g = objectives.pending ? null : objectives.current;   // the next goal shows when Mara announces it
  const fresh = performance.now() < trackerNewUntil; trackerEl.classList.toggle('flash', fresh);
  if (g) { const ch = CHAPTERS[g.ch]; rows.push(`<div class="thint">${ch.n} · ${ch.title}</div><div class="trow main"><i class="ico flag"></i>${g.title}${goalCount(g, { state, ship })}${fresh ? '<span class="tag">NEW</span>' : ''}</div>`); }
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
// ---- lighthouse tidbits: pass close to a lighthouse for the first time and the keeper calls something across the water.
// Three kinds: about the tower itself (one set per design), where the nearest harbours lie, and what the week holds.
let lhT = 0;
const LH_LINES = {
  classic: ['Red and white, so the gulls can find it. And so can I on foggy mornings.', 'Two hundred and twelve steps. I count them every night, for company.', 'Built forty years before the village. The village grew up round her, like ivy.'],
  slim: ['Narrow as a fishing rod. She sways a hand\'s breadth in a gale. I find it restful.', 'The lamp is tiny and the lens is huge. Somebody was very proud of that lens.', 'Only one person fits on the stairs at a time. I have never had to give way.'],
  brick: ['Every brick came by boat. Every single one. Do not ask me how many.', 'The bricks are warm in the evening. The cat knows. The cat lives here now.', 'Mortar from shell and lime. In the right light she looks like a very tall sunset.'],
  iron: ['Cast in pieces and bolted together on the beach. She hums when the wind is from the east.', 'Iron rusts, they said. I paint her every spring and she thanks me by rusting.', 'On a cold night she rings a little when the tide turns. Do not worry. That is just her.'],
  squat: ['Short, because the rock under her is tall. The lamp sits low, so I can wave at the fishers.', 'Nobody has ever fallen down my stairs. There are nine.', 'Small and round and stubborn. Like me.'],
  pagoda: ['The roofs are for the rain. The bells are for luck. The lamp is for the ships. Do not mix them up.', 'Five roofs, one for every sea I have heard of. I am told there are more.', 'The little bells ring when a boat goes by that is thinking of home.'],
};
const LH_WEEK = ['Market day is Wednesday. Bring fish, not complaints.', 'The floating market sails by on Fridays. Bring coin, and a bag with no holes.', 'The regatta is on Sunday afternoons. Do not stand in the way of the canoes.', 'The whales pass in numbers on Thursdays. Always the same direction. I do not ask why.', 'Low tide uncovers the wrecks. Go then, with a strong back.', 'A red sky in the evening means a storm in the afternoon after. Ask me how I know.', 'Saturday night the lanterns go up in the villages. Make for any harbour and join in.'];
// the recorded gull colony: silent far off, fades up inside ~120 units of the nearest circling gull, full close in.
// Gulls go quiet at night, in storms and rain, and as the dread rises (they stop sounding like gulls).
function gullLevel(night) {
  const d = fauna.nearBird;
  if (!(d < 160)) return 0;
  const near = 1 - clamp((d - 8) / 112, 0, 1);
  return near * near * (1 - night * 0.8) * (1 - weather.storm * 0.7) * (1 - weather.rain * 0.4) * (1 - smoothstep(0.2, 0.35, dread));
}
// the quiet coast bed (soft breeze, small waves, far gulls): rises over the last ~110 units before an island's shore and is
// full while you are moored or ashore. Fades away with the dread like the gulls and in storms.
function coastLevel(moored, night) {
  const near = world.nearest(ship.pos.x, ship.pos.z, 110);
  let k = near ? 1 - clamp(world.lastEdge / 110, 0, 1) : 0;
  k = Math.max(k * k * 0.75, moored ? 0.85 : 0);
  return k * (1 - night * 0.5) * (1 - weather.storm * 0.8) * (1 - smoothstep(0.25, 0.4, dread));
}
function lighthouseTidbit() {
  state.story.lh = state.story.lh || {};
  for (const isl of world.islands.values()) {
    const d = isl.desc; if (!d.lhPos || state.story.lh[d.id]) continue;
    if (Math.hypot(ship.pos.x - (d.x + d.lhPos.x), ship.pos.z - (d.z + d.lhPos.z)) > 42) continue;
    state.story.lh[d.id] = 1;
    const k = hash2(d.seed, 17, 3) % 3, own = LH_LINES[lighthouseKind(d)] || LH_LINES.classic;
    let line;
    if (k === 0) line = own[hash2(d.seed, 19, 5) % own.length];
    else if (k === 1) {
      const hs = nearby(world, ship.pos.x, ship.pos.z, 40, 600, 'harbour').filter((o) => o.d.id !== d.id).sort((a, b) => a.dist - b.dist);
      line = hs.length ? `${hs[0].d.name} lies ${bearingName(hs[0].d.x - ship.pos.x, hs[0].d.z - ship.pos.z)} of here, about ${Math.round(hs[0].dist)} fathoms. Good water between.` : own[0];
    } else line = LH_WEEK[hash2(d.seed, 21, 9) % LH_WEEK.length];
    toast(`The lamp-keeper calls across the water: "${line}"`, false, 9000);
    return;
  }
}
const SIGHT_WORDS = { harbour: 'a village', jungle: 'a jungle isle', sandbar: 'a sandbar', rocky: 'a rock', treasure: 'an old arch on the shore', volcano: 'a smoking mountain', atoll: 'a ring of sand', mangrove: 'a mangrove isle' };
function landHo(d) {
  if (onbQuiet()) return;   // nothing but the first goals for a while
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
  if (r !== 'ammo' && r !== 'target') audio.play('cannon');
  if (r === 'ammo') { toast('Out of cannonballs! Buy more at a harbour.'); objectives.remark('noammo'); }
  else if (r === 'target') objectives.remark('notarget');
}

function getInteract() {
  const hi = world.nearest(ship.pos.x, ship.pos.z, 18);
  if (hi && hi.desc.hut) return { kind: 'hut', key: 'hut', isl: hi };
  const sg = sighting.near(ship.pos.x, ship.pos.z); if (sg) return { kind: 'sighting', key: 'sight', s: sg };
  const cvs = caves.near(ship.pos.x, ship.pos.z); if (cvs) return { kind: 'cave', key: cvs.id, site: cvs };
  const spr = threads.springNear(ship.pos.x, ship.pos.z); if (spr) return { kind: 'spring', key: 'spring', src: spr };
  const thr = threads.interact(ship); if (thr) return { kind: 'thread', key: thr.key, th: thr };
  // a harbour is entered at its pier; anywhere else along its shore you only get a hint
  const hb = world.nearest(ship.pos.x, ship.pos.z, 30, ['harbour']);
  if (hb) {
    const d = hb.desc, dk = d.dock;
    if (dk && Math.hypot(ship.pos.x - (d.x + dk.x), ship.pos.z - (d.z + dk.z)) < 13) return (!onbAll() && state.goals.i < 1) ? null : { kind: 'harbour', key: d.id, isl: hb };   // no "visit" at the very start: Mara sends you when it is time
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

// ashore the camera rests on the village, a little to the left so the panel on the right does not cover it
let waterRough = -1;
let ashoreCam = null, ashoreK = 0, animT = 0;
function frameVillage(d) {
  const dx = d.x - ship.pos.x, dz = d.z - ship.pos.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, px = -uz, pz = ux;
  const up = Math.max(0, d.H - 1.15);   // a village up on a hill or cliff: lift the camera over the lip
  ashoreCam = { pos: new THREE.Vector3(ship.pos.x + ux * 9 - px * 3, 7.5 + up * 1.15, ship.pos.z + uz * 9 - pz * 3), look: new THREE.Vector3(d.x - ux * d.r * 0.2 + px * d.r * 0.3, 2.5 + up * 0.9, d.z - uz * d.r * 0.2 + pz * d.r * 0.3) };
}
// ---- half riddles: now and then an arch holds only half a riddle; the other half is written on a second arch nearby
const halfSeed = (d) => hash2(Math.round(d.x), Math.round(d.z), state.seed + 55) % 3;
function partnerOf(d) {   // the isle holding the other half of this isle's riddle, or null
  if (d.id === '1,-1' || halfSeed(d) !== 0) return null;
  const list = nearby(world, d.x, d.z, 40, 450, 'treasure').filter((o) => o.d.id !== '1,-1' && o.d.id !== d.id && halfSeed(o.d) !== 0).sort((a, b) => a.dist - b.dist);
  return list.length ? list[0].d : null;
}
function backOf(d) {   // an isle whose riddle is half-written on this one
  for (const o of nearby(world, d.x, d.z, 40, 450, 'treasure')) { const p = partnerOf(o.d); if (p && p.id === d.id) return o.d; }
  return null;
}
const halvesOf = (text) => { const w = text.split(' '), k = Math.max(2, Math.round(w.length * 0.55)); return [`${w.slice(0, k).join(' ')} ...`, `... ${w.slice(k).join(' ')}`]; };
function readArch(d) {
  const p = partnerOf(d), dark = d.dread > 0.5;
  if (p && !state.riddles[p.id]) {
    state.riddles[d.id] = halvesOf(d.puzzle.text)[0]; state.halves[d.id] = p.id;
    toast(`The arch inscription stops mid-sentence: "${state.riddles[d.id]}" Only half a riddle. The rest must be written on another arch, ${bearingName(p.x - d.x, p.z - d.z)} of here.`, dark, 11000);
  } else {
    state.riddles[d.id] = d.puzzle.text;
    toast(`The arch inscription reads: "${d.puzzle.text}"`, dark, 11000);
    if (p) delete state.frags[p.id];   // its twin's end is already known
  }
  const a = backOf(d);
  if (a) { state.frags[d.id] = halvesOf(a.puzzle.text)[1]; toast(`Scratched small on the back of the arch: "${state.frags[d.id]}" It reads like the end of something else.`, false, 9000); }
  for (const [aid, bid] of Object.entries(state.halves)) {   // a twin has been read: the two halves fit
    if (!state.riddles[bid]) continue;
    const [cx, cz] = aid.split(',').map(Number), ad = world.desc(cx, cz);
    delete state.halves[aid]; delete state.frags[bid];
    if (ad) { state.riddles[aid] = ad.puzzle.text; toast(`The two halves fit: "${ad.puzzle.text}" (${ad.name})`, false, 11000); }
  }
}
function tryInteract() {
  if (!started || modal) return;
  const tg = getInteract();
  if (!tg) return;
  if (tg.kind === 'sighting') { openCard(tg.s.card); return; }
  if (tg.kind === 'thread') { if (ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; } tg.th.run(); return; }
  if (tg.kind === 'spring') { if (ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; } openCave({ id: `spring:${threads.c.src.id}`, kind: 'colourspring' }); return; }
  if (tg.kind === 'cave') { if (ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; } openCave(tg.site); return; }
  if (tg.kind === 'hut') { if (!state.story.hutKnown) { audio.play('knock'); toast('Nobody answers. Inside, a pen scratches, then stops.', true, 4500); return; } openModal('hut'); return; }
  if ((tg.kind === 'treasure' || tg.kind === 'fruit' || tg.kind === 'wreck') && ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; }
  if (tg.kind === 'harbour') {
    const d = tg.isl.desc, rep = repOf(state, d.id);
    if (!rep.last || Date.now() - rep.last > 120000) rep.visits++;
    rep.last = Date.now();
    state.stats.harbours++;
    if (state.hp < ship.mods.maxHp) { state.hp = ship.mods.maxHp; toast('The harbour crew patches up your hull for free.', false, 3000); }
    const rng = mulberry32(hash2(d.seed, Math.floor(tNow / 8), 3));
    const idx = Math.min(4, Math.floor(dread * 5)), lvl = friendLevel(rep);
    hbShipLine = shipwrightLine(rng, idx);
    threads.onDock(d);
    // someone on the pier may speak first: always on a first visit or a story beat, otherwise rarely
    let say = null;
    { const cur = objectives.current;
      if (cur && cur.id === 'harbour' && d.id === '0,-1' && !state.story.letterP1) state.story.letterP1 = 'wait';   // landfall done: the letter is already waiting, before the goal catches up
      if (cur && cur.id === 'perrin' && d.id === '0,-1' && !state.story.perrinNote && !state.story.letterP2) state.story.letterP2 = 'wait';   // the note waits as a letter; the player takes it
      if (cur && cur.id === 'gossip' && d.id !== '0,-1' && !state.story.hutKnown) { state.story.hutKnown = true; say = { speaker: 'fisher', text: `The black hut? Out past the ${bearingName(world.hutDesc.x - d.x, world.hutDesc.z - d.z)} water. Do not sit down. Whatever she offers, do not sit.`, dark: true }; } }
    const g = state.greet, h = state.hut, told = state.story.rollSeen || 0, ending = state.story.demoEnd === 'pending', free = g.lastDay !== state.dayN || ending;   // one voice a day, wherever you dock
    if (!say && free && h && h.rolls.length > told) {   // someone already knows the number: always after the first throw, then about half the time
      state.story.rollSeen = h.rolls.length;
      if (told === 0 || ending || Math.random() < 0.5) { say = rollGreeting(h.rolls[h.rolls.length - 1].n, state.time * 24, Math.random); if (ending) say.endsDemo = true; }
    }
    if (!say && ending && h && h.rolls.length) { say = rollGreeting(h.rolls[h.rolls.length - 1].n, state.time * 24, Math.random); say.endsDemo = true; state.story.rollSeen = h.rolls.length; }
    if (!say && free && laterOK() && (g.day[d.id] == null || Math.random() < 0.3)) say = pickGreeting({ hour: state.time * 24, weather: weather.label, dread, rnd: Math.random, custom: d.custom, event: isFestival(d) ? 'festival' : isMarketDay() ? 'market' : isLanternNight() ? 'lantern' : null, boat: (() => { const b = boatStatus(d, state.dayN, dread, state.seed); return b.today === 'stayed' ? 'stayed' : b.yesterday === 'lost' ? 'lost' : null; })() });
    if (!say && free && window.__BUILD !== 'demo') { const tl = threads.harbourLine(d); if (tl) say = { speaker: 'fisher', text: tl, dark: true }; }
    harbourIsl = tg.isl; hbTab = 'board'; frameVillage(d); autosave();
    if (lettersAt(d).length) setTimeout(() => toast('A letter waits for you at the harbourmaster\'s board.', false, 6000), 900);
    else if (petOffer(d)) setTimeout(() => { const po = PETS[petOffer(d)]; toast(`${po.title}. ${po.sub[0].toUpperCase()}${po.sub.slice(1)}.`, false, 6000); }, 900);
    for (const c of state.crew) if (c.wish && !c.wish.done && c.wish.kind === 'harbour' && c.wish.id === tg.isl.desc.id) wishDone(c);
    harbourEl.classList.toggle('dark', idx >= 3);
    $('hbBannerName').textContent = d.name; $('hbSaid').textContent = ''; $('hbDay').textContent = dayLine(d);
    if (say) { g.day[d.id] = state.dayN; g.lastDay = state.dayN; showGreeting(d, say); } else openModal('harbour');
    audio.play('harbour');
  } else if (tg.kind === 'treasure' && !tg.isl.dug && !dig) {
    const d = tg.isl.desc;
    if (!state.riddles[d.id]) {
      dig = { key: tg.key, t: 0, label: 'Reading the inscription...', need: 2.2, done: () => { readArch(d); objectives.remark('riddle'); } };
      audio.play('dig');
    } else if (state.halves[d.id]) {
      toast('Half a riddle is not enough to dig by. The other half is written on another arch.', false, 5000);
    } else {
      dig = { key: tg.key, t: 0, label: 'Digging...', need: 2.6 * ship.mods.digTime * (state.buffs.dig > 0 ? 0.7 : 1), done: () => {
        const ang = Math.atan2(ship.pos.z - d.z, ship.pos.x - d.x);
        if (Math.abs(angleDiff(ang, d.puzzle.angle)) > 0.85) {
          state.attempts[d.id] = (state.attempts[d.id] || 0) + 1;
          toast(state.attempts[d.id] >= 2 ? 'Nothing here but sand. Reread the riddle in your log (Journal) and try another shore.' : 'The crew digs and finds only sand and crabs. Wrong shore!', false, 6000);
          return;
        }
        let loot = abyss.wrongLoot(lootFor(mulberry32(hash2(d.seed, 7, state.seed)), d.dread), state);
        const first = d.id === '1,-1';   // the first treasure always pays for one starter upgrade
        if (first) loot = { name: 'Perrin\'s chest: a bag of old doubloons', value: 120, dark: false };
        const land = (tier) => {
          loot.value = Math.round(loot.value * ship.mods.lootMul * (tier ? tier.mult : 1));
          if (tier && tier.mult < 1) loot.name = `${loot.name} (water-damaged)`; else if (tier && tier.mult >= 2) loot.name = `${loot.name} (and more beneath it)`;
          state.stats.treasures++; state.stats.solved++;
          state.gold += loot.value; state.loot.push(loot);
          toast(`Treasure! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
          audio.play('treasure');
        };
        state.dug.add(d.id); tg.isl.setDug(true);   // claimed now, so the throw cannot be started twice
        if (first) land(null); else rollCheck(state, { label: 'The chest: how good a find?', kind: 'luck', dark: loot.dark, tiers: TREASURE_TIERS, treasure: true, attempts: state.attempts[d.id] || 0 }, (ok, n, total, tier) => land(tier));
      } };
      audio.play('dig');
    }
  } else if (tg.kind === 'fruit' && !dig) {
    const d = tg.isl.desc, f = fruitOf(d);
    if (state.harvest[d.id] != null && state.harvest[d.id] >= state.dayN) { toast(`The ${plural(fruitName(f, d.dread), 2)} here are picked clean for today.`, false, 3500); return; }
    dig = { key: tg.key, t: 0, label: 'Picking fruit...', need: 2.4, done: () => {
      const n = Math.max(1, Math.round((2 + Math.floor(Math.random() * 3)) * ship.mods.lootMul));
      state.fruit[f] = (state.fruit[f] || 0) + n; state.harvest[d.id] = state.dayN; state.stats.fruitPicked += n;
      toast(`The crew picked ${n} ${plural(fruitName(f, d.dread), n)}.`, d.dread > 0.5, 4500);
    } };
  } else if (tg.kind === 'ship') {
    hailShip(tg.s);
  } else if (tg.kind === 'wreck' && !dig) {
    const o = tg.o;
    dig = { key: tg.key, t: 0, label: 'Salvaging the wreck...', need: 3.4 * ship.mods.digTime * (state.buffs.dig > 0 ? 0.7 : 1), done: () => {
      const loot = abyss.wrongLoot(lootFor(mulberry32(o.rngSeed), o.dread), state);
      loot.value = Math.round(loot.value * 1.3 * ship.mods.lootMul * (tideAt() < -0.45 ? 1.3 : 1));   // the tide has uncovered more
      loot.name = `From the wreck: ${loot.name}`;
      o.salvaged = true; state.collected.add(o.id); state.stats.wrecks++;
      state.gold += loot.value; state.loot.push(loot);
      loot.value = Math.round(loot.value * threads.salvageMul());
      toast(`Salvaged! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
      { const x = threads.onSalvage(); if (x) setTimeout(() => toast(x, true, 6000), 1500); }
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
  if (sh.special === 'regatta') { sh.state = 'done'; toast('They wave without slowing down. It is a race, and they are winning.', false, 5000); return; }
  if (sh.special === 'market') { sh.state = 'open'; tradeShip = sh; openModal('ship'); return; }
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
  if (sh.special === 'market') return (sh.offers = [
    { id: 'sellall', label: 'Sell your catch aboard', cost: 0, desc: 'fish and fruit fetch a third more than ashore', used: false },
    { id: 'mchart', label: 'A hand-drawn chart', cost: 25, desc: 'the islands round here, as the traders know them', used: false },
    { id: 'oddment', label: 'An oddment from the back', cost: 12, desc: 'nobody remembers where it came from', used: false },
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
  $('shLine').textContent = sh.special === 'market' ? 'A trader leans on the rail among the lanterns: "Everything must go. Everything always goes. Come aboard, captain."' : sh.hostile ? 'The raider captain grins: "Nice ship. Shame if something happened to it. A little tribute, perhaps?"' : (FACTION_GREET[sh.faction.id] || 'Ahoy!');
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
  if (o.id === 'sellall') {
    const fish = state.catch.reduce((a, f) => a + f.value, 0) * 0.7, fruit = Object.entries(state.fruit).reduce((a, [f, n]) => a + FRUITS[f].price * n, 0) * 0.7, v = Math.round((fish + fruit) * 1.33);
    if (!v) { toast('Nothing in the hold to sell. They are very polite about it.'); return; }
    state.gold += v; state.catch = []; state.fruit = {}; toast(`Sold your hold aboard the market for ${v} gold.`); audio.play('buy');
  } else if (o.id === 'mchart') {
    const k = revealAround(sh.x, sh.z); toast(k ? `A hand-drawn chart: ${k} island${k > 1 ? 's' : ''} added to your map.` : 'You know these waters already. It is a lovely drawing.', false, 6000);
  } else if (o.id === 'oddment') {
    const odd = ['a brass button that is always cold', 'a spoon with a second, smaller bowl', 'a map of a room you have not been in', 'a bell the size of a thumb. It rings when nobody touches it'];
    const it = odd[Math.floor(rng() * odd.length)]; state.loot.push({ name: `From the floating market: ${it}`, value: 0, dark: false }); toast(`An oddment: ${it}.`, false, 6000);
  } else if (o.id === 'tribute') { sh.hostile = false; sh.engaged = false; toast('The raiders take your coin, grinning, and sail on.'); }
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

// each village draws its chart in its own voice (a note goes into the journal)
const CHART_NOTES = {
  whitewash: 'in the margin, in white paint: "Mind the reef. It is not painted."', lanterns: 'pencilled by lamplight: "Every island has a light somewhere. Find it before dark."',
  nochildren: 'in a very tidy hand: "There is an island near here we do not visit. We are quite sure of that."', choir: 'a few bars of music in the margin. You hum them. They stay.',
  nightboats: 'a greasy thumbprint on the best fishing water: "Go at night. They come up for the lamps."', kites: 'small drawn kites mark the windy side of every island.',
  bells: 'twelve little bells drawn along the coast, one for each island the bell can be heard from. There are thirteen.', laundry: 'a blue stain in one corner. Somebody washed this chart.',
  statues: 'a small carved face drawn over one island. Underneath: "Do not look back."', silent: 'no words at all. Only careful arrows, and one island circled twice.',
};
function revealAround(x, z) {   // a hand-drawn chart: every island within three cells goes on the map
  const cx = Math.round(x / 110), cz = Math.round(z / 110); let k = 0;
  for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) { const o = world.desc(cx + dx, cz + dz); if (o && !o.hut && !state.discovered[o.id]) { state.discovered[o.id] = { name: o.name, type: o.type, x: Math.round(o.x), z: Math.round(o.z) }; k++; } }
  return k;
}
// ---- false rumours: about one in three is wrong. Most lead to nothing at all; a few lead somewhere stranger.
const FALSE_NOTHING = [
  'Only sand, and someone else\'s footprints. They go down to the water and do not come back up.',
  'A flat rock, a dead crab and a lot of sky. Somebody was disappointed here before you.',
  'Gulls. Nothing but gulls. One of them looks as if it has heard this rumour before.',
  'There is no treasure. There is a very nice view, if that helps.',
];
const FALSE_STRANGE = [
  { text: 'A table laid for two on the sand. The tea is still warm. One cup has your ship\'s name scratched into it.', note: 'A table for two on a bare island, tea still warm. One cup said Merry Gull.' },
  { text: 'A bottle stands upright in the sand. Inside: a drawing of this island from above, and a small cross where you are standing.', note: 'A bottle with a drawing of the island I was standing on. A cross, where my feet were.' },
  { text: 'A cairn of white shells, freshly built. On the top a note: "Thank you for coming. We were not sure you would."', note: 'A cairn of white shells. "Thank you for coming. We were not sure you would."', loot: 'a white shell, still warm' },
];
function falseRumour(from) {
  const rng = mulberry32(hash2(state.seed, Object.keys(state.rumoured).length, 31 + state.dayN));
  if (rng() > 0.32) return null;
  const list = [];
  for (const ty of ['sandbar', 'jungle', 'rocky', 'atoll', 'mangrove']) for (const o of nearby(world, from.x, from.z, 60, 520, ty)) if (!state.discovered[o.d.id] && !state.rumoured[o.d.id] && !o.d.hut) list.push(o);
  if (!list.length) return null;
  const o = list[Math.floor(rng() * list.length)];
  return { id: o.d.id, name: o.d.name, x: o.d.x, z: o.d.z, dist: o.dist, variant: rng() < 0.35 ? 1 + Math.floor(rng() * FALSE_STRANGE.length) : 0, pick: Math.floor(rng() * 4) };
}
function resolveFalseRumour(d, r) {
  const v = r.fake, n = (hash2(Math.round(d.x), Math.round(d.z), state.seed) >>> 0);
  if (!v) { toast(FALSE_NOTHING[n % FALSE_NOTHING.length], dread > 0.4, 7000); return; }
  const st = FALSE_STRANGE[v - 1];
  toast(st.text, true, 9000); state.notes.push({ text: st.note, dark: true });
  if (st.loot) state.loot.push({ name: `From ${d.name}: ${st.loot}`, value: 0, dark: true });
  if (!state.story.strangeRumour) { state.story.strangeRumour = true; setTimeout(() => objectives.mate.say('Captain... that was no treasure. Who goes to this much trouble to make a rumour come true?', true), 2500); }
}

function discover(isl) {
  const d = isl.desc;
  if (state.discovered[d.id]) return;
  state.discovered[d.id] = { name: d.name, type: d.type, x: Math.round(d.x), z: Math.round(d.z) };
  state.gold += 5;
  const rum = state.rumoured[d.id]; if (rum) rum.found = true;
  if (!onbQuiet()) toast(`Charted: ${d.name} (+5 gold)`, dread > 0.5);
  if (rum && rum.fake !== undefined) setTimeout(() => resolveFalseRumour(d, rum), 1800);
  audio.play('discover');
}

// ---------------------------------------------------------------- shipyard (cosmetics)
// ---- the shipyard: a turntable. Anything can be tried on first (owned or not); nothing is paid for until Buy.
let yardTab = 'hull', yardTry = null, yardYaw = 0.9, yardZoom = 1, yardIdle = 0, yardDrag = null;
const yardSel = () => { const [g, , list] = GROUPS.find((x) => x[0] === yardTab); return { g, list, o: byId(list, yardTry[g]) }; };
function renderYard() {
  if (!yardTry) yardTry = { ...state.custom };
  ship.setCustom(yardTry);
  $('yardGold').textContent = state.gold;
  $('yardTabs').innerHTML = GROUPS.map(([g, label]) => `<button data-tab="${g}" class="${g === yardTab ? 'on' : ''}">${label.replace('Hull paint', 'Hull').replace('Pennant colour', 'Colour').replace('Pennant shape', 'Shape').replace('Figurehead', 'Figure')}</button>`).join('');
  const { g, list, o } = yardSel();
  $('yardBody').innerHTML = `<div class="swatches">${list.map((x) => {
    const key = `${g}:${x.id}`, owned = !x.cost || state.owned.has(key), locked = x.ok && !x.ok(state), on = yardTry[g] === x.id;
    const col = g === 'hull' ? x.upper : g === 'flag' ? x.color : g === 'sail' ? `rgb(${x.tint.map((v) => Math.min(255, v * 235) | 0)})` : '';
    return `<button data-id="${x.id}" class="${on ? 'on' : ''}${locked ? ' lock' : ''}" title="${locked ? x.req : ''}">${col ? `<span class="dot" style="background:${col}"></span>` : ''}${x.name}${owned || locked ? '' : ` ${x.cost}g`}</button>`;
  }).join('')}</div>`;
  const key = `${g}:${o.id}`, owned = !o.cost || state.owned.has(key), locked = o.ok && !o.ok(state), worn = state.custom[g] === o.id;
  $('yardTry').innerHTML = locked ? `${o.name}<small>Locked: ${o.req}</small>` : `${worn ? 'Wearing' : 'Trying'}: ${o.name}<small>${owned ? 'yours' : `${o.cost} gold`}</small>`;
  const buy = $('yardBuy');
  buy.textContent = owned ? 'Wear it' : `Buy ${o.cost}g`;
  buy.disabled = locked || worn || (!owned && state.gold < o.cost);
  $('yardBack').disabled = yardTry[g] === state.custom[g];
}
$('yardTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { yardTab = b.dataset.tab; audio.play('ui', { vol: 0.4 }); renderYard(); } });
$('yardBody').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; yardTry[yardTab] = b.dataset.id; audio.play('ui', { vol: 0.3 }); renderYard(); });
$('yardBuy').addEventListener('click', () => {
  const { g, o } = yardSel(), key = `${g}:${o.id}`;
  if (o.cost && !state.owned.has(key)) { if (state.gold < o.cost) return; state.gold -= o.cost; state.owned.add(key); state.stats.cosmetics++; audio.play('buy'); }
  state.custom[g] = o.id; renderYard();
});
$('yardBack').addEventListener('click', () => { const { g } = yardSel(); yardTry[g] = state.custom[g]; renderYard(); });
const yardTurn = (d) => { yardYaw += d; yardIdle = 0; };
$('yTurnL').addEventListener('click', () => yardTurn(-Math.PI / 2)); $('yTurnR').addEventListener('click', () => yardTurn(Math.PI / 2));
$('yardClose').addEventListener('click', () => closeModal());
yardEl.addEventListener('pointerdown', (e) => { if (e.target === yardEl) { yardDrag = { x: e.clientX, yaw: yardYaw }; yardEl.setPointerCapture(e.pointerId); } });
yardEl.addEventListener('pointermove', (e) => { if (yardDrag) { yardYaw = yardDrag.yaw - (e.clientX - yardDrag.x) * 0.01; yardIdle = 0; } });
yardEl.addEventListener('pointerup', () => { yardDrag = null; });
yardEl.addEventListener('wheel', (e) => { yardZoom = clamp(yardZoom * (e.deltaY < 0 ? 0.92 : 1.08), 0.45, 1.8); e.preventDefault(); }, { passive: false });

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
let pendingHand = null, pigHome = null, cardT = 900 + Math.random() * 600, cardBusy = false, wishT = 0;
const pig = new Pig(pigEl, { onEnd: (won) => { if (won) { state.gold += 20; audio.play('treasure'); if (Math.random() < 0.5) { const r = cardCtx().rumour('a sore loser at the tavern'); if (r) toast(r, false, 7000); } } } });
$('pigRoll').addEventListener('click', () => pig.roll());
$('pigHold').addEventListener('click', () => pig.hold());
$('pigLeave').addEventListener('click', () => { if (pig.busy) return; closeModal(); if (pigHome) { harbourIsl = pigHome; hbTab = 'tavern'; openModal('harbour'); } });
let cardNext = null;
$('cardDone').addEventListener('click', () => { if (cardNext) { const f = cardNext; cardNext = null; f(); return; } closeModal(); });
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
      signOn(c, 3); return `${c.name} climbs aboard, drinks a whole bucket of water, and picks up a rope. (${TRAITS[c.trait].name} joins the crew.)`;
    },
  };
}
// Mara's mood, from how the voyage has treated her: cheerful (rested within two days, hull sound, the water still bright),
// rattled (a battered hull or the water gone wrong), steady otherwise. Cheerful and rattled tip sea and luck rolls.
function maraMood() {
  const hull = state.hp / Math.max(1, ship.mods.maxHp), rested = state.story.restDay != null && state.dayN - state.story.restDay <= 2;
  if (hull < 0.3 || dread >= 0.6) return 'rattled';
  if (rested && hull >= 0.6 && dread < 0.5) return 'cheerful';
  return 'steady';
}
// advantage and disadvantage on the d20: the die is thrown twice and the better (or worse) one stands
setAdvProvider((check) => {
  let a = 0; const why = [];
  const up = (t) => { a++; why.push(t); }, down = (t) => { a--; why.push(t); };
  if (check.treasure && !check.attempts) up('right shore first try');
  { const mood = maraMood(); if (check.kind === 'sea' || check.kind === 'luck') { if (mood === 'cheerful') up('Mara is cheerful'); else if (mood === 'rattled') down('Mara is rattled'); } }
  if (check.kind === 'talk') {   // standing: regulars are heard, a stranger at their own counter is not
    const h = check.harbour ? { desc: { id: check.harbour } } : world.nearest(ship.pos.x, ship.pos.z, 400, ['harbour']);
    if (h) { const lvl = friendLevel(repOf(state, h.desc.id)); if (lvl >= 2) up('known here'); else if (lvl === 0 && check.harbour) down('a stranger here'); }
  }
  if (check.treasure && state.buffs.dig > 0) up('rum rations');
  if (check.kind === 'sea' && weather.storm > 0.35) down('storm');
  if ((check.kind === 'sea' || check.kind === 'luck') && tod.night > 0.6 && !state.upgrades.lantern) down('dark, no lantern');
  a = Math.max(-1, Math.min(1, a));
  return [a, a ? why : []];
});
function openCard(card) {
  if (!card) return;
  cardBusy = false; cardNext = null; $('cardDone').textContent = 'Sail on [E]'; openModal('card'); audio.play('card');
  const out = (t) => { $('cardOut').textContent = t; $('cardDone').style.display = ''; cardEl.querySelectorAll('#cardChoices button').forEach((b) => { b.disabled = true; }); cardBusy = 'done'; };
  renderCard(card, (ch) => {
    if (cardBusy) return; cardBusy = true;
    if (!ch.check) { out(ch.go(cardCtx())); return; }
    rollCheck(state, ch.check, (ok, n) => { markFromRoll(n); out((ok ? ch.ok : ch.fail)(cardCtx())); });
  });
}
// ---- one-time caves: a few rooms of choices and d20 checks on their own full screen; when it is over, won or lost, the sea closes over the mouth
let caveRun = null;
const caveScene = new CaveScene($('caveCv'));
const COLOUR_DEEP = new THREE.Color('#5a2a8a'), COLOUR_SHALLOW = new THREE.Color('#b068e8');
const CAVE_TIDE = { door: 0.2, ledge: 0.34, chest: 0.5 };
const hermitFace = () => '<i style="position:absolute;left:18px;top:14px;width:28px;height:14px;background:#e8e0d0"></i><i style="position:absolute;left:22px;top:28px;width:20px;height:24px;background:#e8e0d0"></i><i style="position:absolute;left:23px;top:20px;width:18px;height:11px;background:#e8b890"></i><i style="position:absolute;left:10px;top:12px;width:44px;height:7px;background:#7a3a2a"></i>';
function openCave(site) {
  const cv = CAVES[site.kind]; if (!cv) return;
  caveRun = site; cardNext = null; cardBusy = false; openModal('cave'); audio.play('card');
  const look = caveLook(site.kind);
  caveEl.classList.toggle('passage', look === 'passage'); caveEl.classList.toggle('lantern', look === 'lantern');
  $('caveTitle').querySelector('b').textContent = cv.name;
  caveScene.start();
  const done = $('caveDone');
  const show = (id) => {
    const node = cv.nodes[id]; cardBusy = false; cardNext = null;
    const tide = CAVE_TIDE[id] != null ? CAVE_TIDE[id] : 0.2;
    caveScene.show(site.kind, id, tide);
    $('caveTitle').querySelector('small').textContent = cv.tag || (site.kind === 'grotto' ? 'THE TIDE IS COMING IN' : site.kind === 'colourspring' ? 'THE WATER HUMS' : id === 'door' ? 'THE MOUTH OF THE CAVE' : '');
    if (node.enter) threads.event(node.enter, null, site);   // a room can do something when it is shown (the bell tolls)
    $('caveTide').firstElementChild.style.height = `${Math.round(tide / 0.6 * 100)}%`;
    const face = $('caveFace'); face.classList.toggle('gone', look === 'passage');
    face.innerHTML = site.kind === 'larder' && id === 'tea' ? hermitFace() : `<i class="pxi ico ${cv.icon}"></i>`;
    $('caveWho').textContent = site.kind === 'larder' && id === 'tea' ? 'The hermit' : '';
    const list = (typeof node.choices === 'function' ? node.choices(threads) : node.choices).filter((ch) => !ch.if || threads.flag(ch.if));
    $('caveBox').classList.remove('resolved'); $('caveSay').textContent = typeof node.text === 'function' ? node.text(threads) : node.text; $('caveOut').textContent = ''; done.style.display = 'none';
    $('caveChoices').innerHTML = list.map((ch, i) => `<button data-i="${i}">${i + 1}. ${ch.label}${ch.check ? ` <small>(${ch.check.label} ${ch.check.dc})</small>` : ''}</button>`).join('');
    $('caveChoices').querySelectorAll('button').forEach((bt) => bt.addEventListener('click', () => choose(list[+bt.dataset.i])));
  };
  const resolve = (r) => {
    if (r.cancel) { closeModal(); return; }   // not yet: the cave stays
    let text = r.text || ''; const fx = r.fx || {}, ctx = cardCtx();
    if (!text && r.next && !Object.keys(fx).length) { show(r.next); return; }   // the doorway: straight into the first room
    if (fx.gold) { state.gold = Math.max(0, state.gold + fx.gold); text += ` (${fx.gold > 0 ? '+' : ''}${fx.gold} gold)`; }
    if (fx.hurt) ctx.hurt(fx.hurt);
    if (fx.note) state.notes.push({ text: fx.note, dark: false });
    if (fx.time) state.time = (state.time + fx.time) % 1;
    if (fx.rep) ctx.repNear();
    if (fx.colour === 'seal') threads.seal();
    if (fx.event) { const extra = threads.event(fx.event, fx.arg, site); if (extra) text += ` ${extra}`; }
    if (fx.rumour) { const rm = ctx.rumour('a folded chart in a cave'); text += ` ${rm || 'You cannot read where it leads.'}`; }
    $('caveOut').textContent = text; $('caveBox').classList.add('resolved'); cardBusy = 'done';
    if (!r.next) { caves.finish(site, r.end || 'win'); done.textContent = 'Back to the ship [E]'; cardNext = null; }
    else { done.textContent = 'Go deeper [E]'; cardNext = () => show(r.next); }
    done.style.display = 'inline-block';
  };
  const choose = (ch) => {
    if (cardBusy) return; cardBusy = true;
    if (!ch.check) { resolve(ch.go); return; }
    rollCheck(state, ch.check, (ok, n) => { markFromRoll(n); resolve(ok ? ch.ok : ch.fail); });
  };
  done.onclick = () => { if (cardNext) { const f = cardNext; cardNext = null; f(); return; } closeModal(); };
  show('door');
}
let raiderT = 8;
function tabletopTick(dt) {
  // the raider goal: make sure there is one to find (Reef Brotherhood, not far, coming our way)
  { const g = objectives.current;
    if (g && g.id === 'raider' && !traffic.ships.some((s) => s.hostile && !s.sinking)) {
      if ((raiderT -= dt) <= 0) {
        const a = Math.random() * 6.28, x = ship.pos.x + Math.cos(a) * 140, z = ship.pos.z + Math.sin(a) * 140;
        if (world.nearest(x, z, 30)) raiderT = 1;   // that spot is land: try another bearing
        else { raiderT = 30; traffic.spawnAt('schooner', 'reef', x, z, Math.atan2(ship.pos.x - x, -(ship.pos.z - z)), 'live', 6, true); }
      }
    } else raiderT = 8; }
  // encounter signs: rare, out on open water, never in weather, never part of any story
  sighting.update(dt, tNow, ship);
  caves.update(dt, ship, window.__BUILD !== 'demo' && laterOK() && dread < 0.5);   // caves are a full-game feature: not in the demo build
  if (unlocked(state, 'cards') && !sighting.active && ship.speed > 2 && dread < 0.95 && weather.fog < 0.3 && weather.storm < 0.3 && !world.nearest(ship.pos.x, ship.pos.z, 90) && !fishing.active) {
    cardT -= dt;
    if (cardT <= 0) {
      const card = drawCard(dread, state.cardsSeen, SIGHTS);
      if (card && sighting.spawn(card, ship, world)) { state.cardsSeen.push(card.id); if (state.cardsSeen.length > 5) state.cardsSeen.shift(); cardT = 1500 + Math.random() * 1000; }
      else cardT = 30;
    }
  }
  ship.rowBoost = hasTrait(state, 'rower') ? 1.4 : 1;
  document.body.classList.toggle('eyes', hasTrait(state, 'eyes'));
  // crew wishes
  if ((wishT -= dt) > 0) return; wishT = 2;
  for (const c of state.crew) {
    const w = c.wish; if (!w || w.done || w.faded) continue;
    const hit = w.kind === 'harbour' ? false : world.nearest(ship.pos.x, ship.pos.z, 70, [w.kind]);
    if (hit) wishDone(c);
  }
}
// ---- crew only stay a while: a hired hand for 3-5 days, a castaway or a passenger for 3, a fulfilled wish adds two. Then they go ashore.
for (const c of state.crew) if (c.until == null) c.until = state.dayN + 4;   // crew from an older save
function signOn(c, stay) { c.until = state.dayN + stay; state.crew.push(c); }
const daysLeft = (c) => Math.max(0, (c.until || 0) - state.dayN);
function crewLeave() {
  for (const c of [...state.crew]) {
    if (c.until == null) c.until = state.dayN + 4;   // crew from an older save
    if (c.permanent || c.until > state.dayN) continue;
    state.crew = state.crew.filter((x) => x !== c);
    toast(`${c.name} has gone ashore. ${c.wish && c.wish.done ? 'Smiling, mostly.' : 'No hard feelings.'} (${TRAITS[c.trait].name} leaves the crew.)`, false, 7000);
  }
}
function wishDone(c) {
  c.wish.done = true; c.until = Math.max(c.until || state.dayN, state.dayN) + 2;
  toast(`${c.name} stands at the rail a long time. (${c.name}'s wish came true: their bonus grows by 1.)`, false, 7000);
  objectives.mate.say(`Look at ${c.name}. I have never seen anyone smile with only their eyebrows before.`);
}

// ---------------------------------------------------------------- story: chapter beats, the fog wall, the demo end
const HUT_NOTES = [
  'If you find the black hut, do not sit down. I sat down. - R.',
  'She has a book. My name is in it now. Twice. She let me throw once. It came up {fate}. It will come up {fate} for you too. - R.',
  'Third bottle I have thrown. The hut is not where I left it. The hut is exactly where I left it.',
];
const CHECKS = [['a red rock on its north shore', 'red'], ['three palms in a row on its east side', 'palms'], ['a bell on a post by the water', 'bell'], ['a white stone shaped like a tooth', 'tooth']];
function perrinNote(quiet = false) {
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
  if (!quiet) toast('The harbourmaster hands you a folded note from Old Perrin. (Journal)', false, 6000);
}
// Mara notices the hut on the chart: when the chart is next opened, or within a minute of sailing, whichever comes first (and never after the first throw)
function hutNod(delay) {
  if (state.story.hutNod !== 'pending') return;
  state.story.hutNod = 'done';
  if (state.hut && state.hut.rolls.length) return;
  setTimeout(() => objectives.mate.say('Captain... was that hut always on our chart? I did not draw it. Did you draw it?', true), delay);
}
function revealHut() {
  const h = world.hutDesc; if (!h) return;
  state.discovered[h.id] = state.discovered[h.id] || 1;
  state.story.hutNod = 'pending';
  setTimeout(() => hutNod(0), 60000);
}
function showDemoEnd() { $('demoend').classList.add('show'); audio.play('ending'); }
$('demoGo').addEventListener('click', () => {
  $('demoend').classList.remove('show');
  if (window.__BUILD === 'demo') toast('Keep sailing: everything inside the fog is still yours to do.', false, 5000);   // the demo opens nothing more
  else { state.story.free = true; toast('The fog thins. The sea is yours.', false, 5000); }
});
let gateFog = 0, gateToastT = 0, musingT = 120;
function seaGate(dt) {
  const R = gateRadius(state), d = Math.hypot(ship.pos.x, ship.pos.z);
  setReach(R);
  // an errand or passenger that points beyond the fog (taken before the fog was understood, or from an old save) is released
  for (const [key, label] of [['job', 'The delivery'], ['passenger', 'Your passenger']]) {
    const o = state[key];
    if (o && Math.hypot(o.x, o.z) > R - 30) { state[key] = null; if (state.tracked === key) state.tracked = null; toast(`${label} was bound beyond the fog. It is let go, and nothing is lost.`, false, 6000); }
  }
  gateFog = R === Infinity ? 0 : clamp((d - (R - 160)) / 160, 0, 1);
  if (d > R) {   // the fog turns you around: push back toward Tama and bleed speed
    const k = Math.min(d - R + 1, (4 + (d - R) * 0.8) * dt);
    ship.pos.x -= ship.pos.x / d * k; ship.pos.z -= ship.pos.z / d * k;
    ship.speed *= 1 - Math.min(0.9, dt * 1.4);
    objectives.remark('gate', dread);
    if ((gateToastT -= dt) <= 0) { gateToastT = 25; toast('The fog is a wall here. Somehow the bow always ends up pointing home.', false, 4500); }
  }
}

// tacking: Mara's one-time tip when you point straight into the wind, and progress made upwind for the side goal
let intoWindT = 0;
function tackTick(dt) {
  const rel = Math.abs(angleDiff(ship.heading, wind.dir));
  if (rel > 0.8 * Math.PI && ship.trim > 0.4 && !ship.rowing) { intoWindT += dt; if (intoWindT > 4) objectives.remark('tack', dread); } else intoWindT = 0;
  if (rel > 0.5 * Math.PI && rel < 0.8 * Math.PI && !ship.rowing) state.stats.upwind = (state.stats.upwind || 0) + ship.speed * dt * -Math.cos(rel);
}

let hullShown = -1;
function hurtPlayer(dmg) {
  const d = Math.max(1, Math.round(dmg));
  state.hp -= d; lastHit = tNow; shake = 0.7; audio.play('hit');
  $('hit').classList.add('on'); setTimeout(() => $('hit').classList.remove('on'), 140);
  if (state.hp / ship.mods.maxHp < 0.35) objectives.remark('lowhp', dread);
  if (state.hp <= 0) sinkPlayer();
}
function onHitEnemy(s, dmg) {
  s.hp -= dmg;
  if (s.hp > 0) return;
  s.sinking = true; s.hostile = false; s.state = 'done'; s.engaged = false;
  const gold = Math.round((45 + Math.random() * 70) * KINDS[s.kind].scale);   // cannonballs are only ever bought, so every volley counts
  state.gold += gold; state.stats.sunk++;
  toast(`Raider sunk! +${gold} gold`, false, 6000);
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
    toast(`The Gull went under. A fisherman dragged you to ${tgt.name}. You lost ${lost} gold; the hull is repaired.`, false, 8000);
  }, 1100);
}
let newAsk = 0;
$('pbNew').addEventListener('click', () => {
  if (performance.now() - newAsk > 4000) { newAsk = performance.now(); $('pbNew').textContent = 'Really? Click again to start over'; return; }
  noSave = true; try { localStorage.removeItem(SAVE_KEY); sessionStorage.setItem('hoist-new', '1'); if (fsEl()) sessionStorage.setItem('hoist-fs', '1'); } catch (e) { /* storage blocked */ }
  location.href = location.pathname;
});
$('pbHint').addEventListener('click', () => { closeModal(); if (!abyss.maraHint()) objectives.askHint(dread); });

// ---------------------------------------------------------------- captain's log
const logbook = new Logbook({ abyss, state, world, ship, seed: state.seed, toast: (t) => toast(t), close: () => closeModal(), mate: objectives.mate, dread: () => dread, mood: () => maraMood(), tabOpened: (t) => tabOpened(t),
  retrack: () => sea.syncQuests(state.quests.filter((q) => q.id === state.tracked)),
  gate: () => gateRadius(state),
  skipGoal: () => { const g = objectives.current; if (!g) return; if (g.onDone) g.onDone({ state, world, ship, giveMap, forceCalm: setCalm });
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
  if (introT >= 0) { introT += rawDt; if (introT >= INTRO_DUR) endIntro(); }
  const live = started && !modal && introT < 0;
  const dt = live ? rawDt : 0;           // simulation time: frozen while a menu is open
  const ashore = modal === 'harbour' || modal === 'greet' || modal === 'yard';
  const vdt = live || ashore ? rawDt : 0;  // ashore the world keeps moving (people, gulls, waves) while the clock stands still
  tNow += dt; animT += vdt;
  const stepT = Math.floor(animT * 12) / 12;

  // ---- time of day & wind
  if (live) { const pt = state.time; state.time = advanceTime(state.time, dt); if (state.time < pt) { noteSkip(); state.dayN++; crewLeave(); }
    if (pt < 0.5 && state.time >= 0.5) noonBells();
    if (tideAt() < -0.45 && !state.hints['tide:low'] && laterOK()) { state.hints['tide:low'] = true; objectives.mate.say('The tide is out, Captain. Keep off the shallows, and the wrecks give up more at low water.'); }
    if (pt < 0.27 && state.time >= 0.27) weekMorning(); }
  wind.update(dt);
  if (dt > 0) { state.buffs.speed = Math.max(0, state.buffs.speed - dt); state.buffs.dig = Math.max(0, state.buffs.dig - dt); }
  ship.buff = state.buffs.speed > 0 ? 1.15 : 1;
  const sec = sectorAt(ship.pos.x, ship.pos.z, state.seed);
  if (sec.id !== curSector) {
    curSector = sec.id;
    if (!state.sectorsSeen.includes(sec.id)) state.sectorsSeen.push(sec.id);
    if (live && !onbQuiet()) toast(`Entering ${sec.name}: ${sec.faction.name} waters`, sec.dread > 0.5, 5000);
  }
  { // early chapters: a gentler wedge into the wind, and around Tama the wind leans across the first routes
    const early = chapterOf(state) < 2;
    let want = wind.raw;
    ship.floorMin = early ? 0.45 : 0; ship.wedge = (early ? 0.68 : 0.6) * Math.PI; ship.wedgeEnd = (early ? 0.97 : 0.95) * Math.PI;
    if (early && !titleScene) {
      const t = world.desc(0, -1), g = world.desc(1, -1), dTama = Math.hypot(ship.pos.x - t.x, ship.pos.z - t.z);
      const k = clamp(1 - (dTama - 450) / 150, 0, 1);
      if (g && k > 0) { const target = Math.atan2(g.x - t.x, -(g.z - t.z)) + Math.PI / 2; want = target + angleDiff(target, want) * (1 - 0.75 * k); }
    }
    wind.dir += angleDiff(wind.dir, want) * Math.min(1, dt * 0.45);   // the felt wind swings round over a few seconds
  }
  const windNow = { dir: wind.dir, strength: Math.min(1.4, wind.strength * (1 + 0.25 * weather.storm)) * (1 - 0.92 * weather.calm) };
  if (live && wind.shifted() && onbAll()) toast(`The wind is shifting: now from the ${wind.fromName}`, false, 4200);

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
  if (live && dt > 0) { stormAndCalm(dt); tabletopTick(dt); seaGate(dt); tackTick(dt); }
  const solid = [];
  traffic.solids(solid); fauna.solids(solid); sea.solids(solid); sighting.solids(solid);
  if (world.collide(ship.pos, 2.2) | pushOut(ship.pos, 2.2, solid)) {
    if (ship.speed > 3 && dt > 0) audio.play('bump', { vol: clamp(ship.speed / 10, 0.3, 1) });
    ship.speed *= 0.9;
  }

  // ---- dread + stage palette + time of day
  const target = forced !== null ? forced : clamp(dreadAtDistance(Math.hypot(ship.pos.x, ship.pos.z)) + (window.__BUILD === 'demo' ? 0 : dreamShift()), 0, 1);
  dread += (target - dread) * Math.min(1, rawDt * (forced !== null ? 1.2 : 0.4));
  if (params.get('shot')) dread = target;
  if (glitchT > 0) { glitchT -= rawDt; dread = 1; if (glitchT <= 0) { dread = preGlitch; hutEl.classList.remove('glitching'); } } // the hut's bad throw
  dark = dread > DARK_THRESHOLD;
  const stage = sampleStage(dread);
  applyTimeOfDay(stage, state.time, dread);
  stage.wave *= 0.7 + 0.5 * wind.strength;
  weather.update(dt, wind.t, dread, wind.dir, wind.strength, camera, tod);
  weather.apply(stage);
  if (titleScene && titleScene.sc.tint) { const t = titleScene.sc.tint; stage.skyTop.lerp(new THREE.Color(t.top), t.k * 0.6); stage.skyHorizon.lerp(new THREE.Color(t.hor), t.k); stage.fog.lerp(new THREE.Color(t.fog), t.k); }
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
  world.week = { wd: weekday(), market: isMarketDay(), lantern: isLanternNight() }; world.growthOf = growthOf; world.tide = tideAt();
  { // a storm front every sixth afternoon (after chapter III), warned by a red sky the evening before; and the sector's own weather
    const h = state.time * 24, fd = state.dayN % 6 === 5 && unlocked(state, 'passengers'), fa = state.dayN % 6 === 4 && unlocked(state, 'passengers');
    weather.front = fd ? smoothstep(12, 16, h) * (1 - smoothstep(19, 22, h)) * (0.55 + 0.45 * dread) : 0;
    weather.frontAhead = fa && h >= 15 ? 1 : 0;
    const fac = sectorAt(ship.pos.x, ship.pos.z, state.seed).faction.id;
    const R = { reef: [1.3, 1.5, 0.9], lantern: [0.9, 0.8, 1.5], drowned: [1, 1.1, 1.4], free: [1.1, 0.8, 0.8] }[fac] || [1, 1, 1];
    weather.region.rain = R[0]; weather.region.storm = R[1]; weather.region.fog = R[2];
    if (fa && h >= 17 && laterOK() && !state.hints['front:' + state.dayN]) { state.hints['front:' + state.dayN] = true; if (!state.hints.frontSeen) { state.hints.frontSeen = true; objectives.mate.say('That red in the west... a front is coming in tomorrow afternoon, Captain. I would be in a harbour by then.'); } }
  }
  { // the sea: it grows unruly with distance (dread) and storms, but only slowly, as real water does; and lighter and shallower near islands
    const target = window.__waterLock && window.__waterLock.rough != null ? window.__waterLock.rough : clamp(0.85 * smoothstep(0.28, 0.82, dread) + 0.95 * weather.storm + 0.3 * weather.rain, 0, 1);
    waterRough = waterRough < 0 ? target : waterRough + (target - waterRough) * (1 - Math.exp(-Math.min(vdt, 0.5) / 25));
    WATER.rough = waterRough; U.uRough.value = waterRough;
    const near = []; for (const isl of world.islands.values()) { const d = isl.desc, dd = Math.hypot(d.x - ship.pos.x, d.z - ship.pos.z); if (dd < 500) near.push([d.x, d.z, d.r, dd]); }
    near.sort((a, b) => a[3] - b[3]); near.length = Math.min(near.length, NISL); WATER.isl = near;
    for (let i = 0; i < NISL; i++) { const n = near[i]; U.uIsl.value[i].set(n ? n[0] : 1e6, n ? n[1] : 1e6, n ? n[2] : 0); }
  }
  world.tick(animT, tod);
  ship.place(vdt, waveT, stage.wave, dark, tod.night);
  const lifeCtx = { ship, dread, wave: stage.wave, audio, wind: windNow, stage, tod, faction: sec.faction.id, sched: { wd: weekday(), hour: state.time * 24, dayN: state.dayN, dread } };
  if (live) { state.stats.dist += ship.speed * dt; if (ship.rowing) state.stats.rowed = (state.stats.rowed || 0) + ship.speed * dt; }
  { const cg = objectives.current; if (cg && cg.id === 'calm' && state.goals.started) weather.calmHold = Math.max(weather.calmHold, 8); }   // the calm lasts until you have rowed and fished
  windfx.update(vdt, animT, windNow.dir, windNow.strength, ship.pos, tod.night, Math.min(1, weather.rain * 1.5));
  fishing.update(dt, waveT, { wave: stage.wave, dread, night: tod.night, env: fishEnv() });
  setDieWear(clamp(state.dayN / 12 + dread * 0.6, 0, 1));
  combat.update(dt, waveT, { ship, traffic, wave: stage.wave, onHitEnemy, onHitPlayer: hurtPlayer });
  if (live && tNow - lastHit > 12 && state.hp < ship.mods.maxHp) state.hp = Math.min(ship.mods.maxHp, state.hp + dt);
  { // while Perrin's letter is being read about, Mara stays on screen even ashore or in the log: she is the tutorial
    const st = state.story, on = st.riddleLine === 'wait' || st.noteLine === 'wait' || (st.mateTail && objectives.mate.busy);
    if (!(st.riddleLine === 'wait' || st.noteLine === 'wait') && !objectives.mate.busy) st.mateTail = false; else if (st.riddleLine === 'done' || st.noteLine === 'done') st.mateTail = true;
    objectives.mate.pin = st.riddleLine === 'wait' || st.noteLine === 'wait';
    document.body.classList.toggle('onb-mate', !!on && !!modal);
    if (modal && on) objectives.mate.update(rawDt);
  }
  objectives.update(dt, glitchT > 0 ? preGlitch : dread);   // the hut's flash is not real water: Mara does not react to it
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
  fauna.quiet = !laterOK();
  fauna.update(vdt, waveT, lifeCtx);
  threads.update(vdt, ship, window.__BUILD !== 'demo' && laterOK(), waveT, lifeCtx.wave, (txt) => { if (!objectives.mate.busy) objectives.mate.say(txt); });
  for (const k of ['_pet', '_pet2']) if (window.__game[k]) window.__game[k].update(vdt);
  for (const c of Object.values(companions)) { c.m.g.visible = c.fly > 0 || dread < 0.6; if (c.m.g.visible) c.update(vdt); }
  traffic.update(dt, waveT, lifeCtx);
  sea.update(dt, waveT, lifeCtx);

  // ---- global shader state
  scene.fog.color.copy(stage.fog); scene.fog.near = stage.fogNear; scene.fog.far = stage.fogFar;
  U.uDread.value = dread; U.uTime.value = waveT;
  if (window.__waterLock) { const wl = window.__waterLock; if (wl.t != null) U.uTime.value = Math.floor(wl.t * 12) / 12; if (wl.rough != null) { waterRough = wl.rough; U.uRough.value = WATER.rough = wl.rough; } }   // dev: water previews (docs/concept/water) U.uLight.value = stage.light; U.uWave.value = stage.wave;
  U.uDeep.value.copy(stage.deep); U.uShallow.value.copy(stage.shallow);
  if (threads.worldTint > 0.001) { U.uDeep.value.lerp(COLOUR_DEEP, threads.worldTint); U.uShallow.value.lerp(COLOUR_SHALLOW, threads.worldTint * 0.8); scene.fog.color.lerp(COLOUR_SHALLOW, threads.worldTint * 0.25); }   // a sea that is slowly losing a hue
  U.uSnap.value.set(post.internal.w * 0.5 * stage.snap, post.internal.h * 0.5 * stage.snap);
  mats.shallow.color.copy(stage.shallow).lerp(new THREE.Color(1, 1, 1), 0.25);
  mats.foam.color.set(0xffffff).lerp(stage.skyHorizon, 0.25);
  mats.foam.opacity = 0.55 + 0.25 * Math.sin(animT * 1.8);
  mats.beam.color.set('#ffe080').lerp(new THREE.Color('#ff50d0'), smoothstep(0.5, 0.8, dread));
  mats.beam.opacity = 0.1 + 0.3 * tod.night;
  mats.wake.color.set(0xffffff).lerp(new THREE.Color(0.35, 1, 0.9), tod.night * 0.9).lerp(new THREE.Color(1, 0.4, 0.95), tod.night * smoothstep(0.55, 0.9, dread) * 0.8);
  sky.update(window.__waterLock ? 0 : dt, camera, stage, wind.dir, tod, { sun2: abyss.sun2 });
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
  if (titleScene) titleCam(rawDt);
  ashoreK += ((ashore && ashoreCam ? 1 : 0) - ashoreK) * Math.min(1, rawDt * 2.2);
  if (ashoreCam && ashoreK > 0.001) { const k = smoothstep(0, 1, ashoreK); camPos.lerp(ashoreCam.pos, k); camLook.lerp(ashoreCam.look, k); }
  if (introT >= 0) {   // the opening shot: high over Tama, easing down to the usual place behind the ship
    const k = clamp(introT / INTRO_DUR, 0, 1), e = k * k * (3 - 2 * k), i0 = world.desc(0, -1);
    camPos.x += -34 * (1 - e); camPos.y += 78 * (1 - e); camPos.z += 52 * (1 - e);
    if (i0) camLook.set(i0.x + (camLook.x - i0.x) * e, 8 + (camLook.y - 8) * e, i0.z + (camLook.z - i0.z) * e);
  }
  if (modal === 'yard') {   // the turntable: the ship turns slowly by itself until you take over
    if (!yardDrag) { yardIdle += rawDt; if (yardIdle > 2.5) yardYaw += rawDt * 0.35; }
    const a = ship.heading + yardYaw, r = 11 * yardZoom;
    camPos.set(ship.pos.x + Math.sin(a) * r, 3.2 + 2 * yardZoom, ship.pos.z - Math.cos(a) * r); camLook.set(ship.pos.x, 2.6, ship.pos.z);
    $('yAngle').textContent = ['stern', 'port', 'bow', 'starboard'][Math.round((((yardYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % 4];
  }
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
  if (live && laterOK() && tNow - lhT > 0.8) { lhT = tNow; lighthouseTidbit(); }
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
    if (dig) { promptTxt.textContent = dig.label || 'Digging...'; promptBar.style.display = 'block'; }
    else {
      promptBar.style.display = 'none';
      promptTxt.textContent = tgt.kind === 'thread' ? (ship.speed > 0.35 ? 'Stop the ship completely (S)' : tgt.th.prompt) : tgt.kind === 'spring' ? (ship.speed > 0.35 ? 'Stop the ship completely (S) to look closer' : '[E] Look into the water') : tgt.kind === 'cave' ? (ship.speed > 0.35 ? 'Stop the ship completely (S) to look inside' : '[E] Look into the cave') : tgt.kind === 'sighting' ? `[E] ${tgt.s.label}` : tgt.kind === 'harbourfar' ? 'Sail to the pier to go ashore' : tgt.kind === 'hut' ? '[E] Knock on the dark hut' : tgt.kind === 'harbour' ? `[E] Visit ${tgt.isl.desc.name}`
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
  mixer.update();
  $('clockicon').className = `ico ${tod.sunElev > 0 ? 'sun' : 'moon'}`;
  $('sailfill').style.width = `${Math.round(ship.trim * 100)}%`;
  drawCompass(wind, ship.heading);
  onbTick();
  if (onbAll() && tNow > 18 && helpMode !== 'full') helpEl.style.opacity = '0';
  if (modal === 'harbour') { $('hbGold').textContent = state.gold; }
  if (modal === 'hut') hut.update(rawDt);
  if (modal === 'ship') { $('shGold').textContent = state.gold; }
  if (debugEl.style.display === 'block') debugEl.textContent = `tris ${renderer.info.render.triangles} calls ${renderer.info.render.calls}  dread ${dread.toFixed(2)} stage ${stage.index + 1} ${forced !== null ? '(forced)' : '(auto)'}  time ${tod.clock}  pos ${ship.pos.x | 0},${ship.pos.z | 0}  spd ${ship.speed.toFixed(1)}  islands ${world.islands.size}`;

  { // the hull is five planks: each one is a fifth of its strength
    const frac = Math.max(0, state.hp / ship.mods.maxHp), planks = frac <= 0 ? 0 : Math.max(1, Math.ceil(frac * 5 - 0.001));
    if (planks !== hullShown) { hullShown = planks; $('hptxt').innerHTML = `<span class="hp5">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < planks ? 'on' : 'off'}"></i>`).join('')}</span>`; $('hpfill').parentNode.style.display = 'none'; }
  }
  $('ammotxt').textContent = `\u25cf ${state.ammo}`;
  { const can = unlocked(state, 'cannons'); traffic.noRaiders = !can; document.body.classList.toggle('nocannons', !can); }
  $('reloadfill').style.width = `${100 - Math.min(100, (combat.reload / ship.mods.reload) * 100)}%`;
  const tgtE = combat.target(ship, traffic, 110);
  const eb = $('ebar');
  if (tgtE && live) {
    _v.set(tgtE.x, 5 * KINDS[tgtE.kind].scale + 3, tgtE.z).project(camera);
    if (_v.z < 1) { eb.style.display = 'block'; eb.style.left = `${(_v.x * 0.5 + 0.5) * window.innerWidth}px`; eb.style.top = `${(-_v.y * 0.5 + 0.5) * window.innerHeight}px`; $('ename').textContent = tgtE.name; $('efill').style.width = `${Math.max(0, (tgtE.hp / tgtE.maxHp) * 100)}%`; } else eb.style.display = 'none';
  } else eb.style.display = 'none';
  audio.setLoop('coast', coastLevel(ashore, tod.night));
  if (live) {
    const near = world.nearest(ship.pos.x, ship.pos.z, 45);
    audio.update(dt, { dread, speed: ship.speed / 11, night: tod.night, wind: wind.strength, rain: weather.rain, storm: weather.storm, surf: near ? clamp(1 - world.lastEdge / 45, 0, 1) : 0, rowing: ship.rowIn > 0, gulls: gullLevel(tod.night) });
    const hour = Math.floor(state.time * 24);
    if (hour !== lastHour) { lastHour = hour; if (world.nearest(ship.pos.x, ship.pos.z, 80, ['harbour'])) audio.play('bell', { vol: 0.6 }); }
  }

  // ---- save (every few seconds, and at once when a quest is finished or you dock; those two also show the little ship)
  if (tNow - lastSave > 4) saveNow();

  // ---- render
  const pu = post.material.uniforms;
  pu.uDread.value = dread; pu.uTime.value = tNow; pu.uSat.value = stage.sat; pu.uVig.value = stage.vig;
  pu.uDither.value = stage.dither; pu.uTint.value.copy(stage.tint);
  post.render(scene, camera);
  requestAnimationFrame(frame);
}

// handy for tests / screenshots
window.__game = {
  readArch, partnerOf, maraMood, windfx, logbook,
  audio,
  objectives, perrinNote, gateRadius: () => gateRadius(state),
  openCard, sighting, spawnSight: (id) => { const c = (SIGHTS[id] && drawCard(0, [], { [id]: 1 })); return c && sighting.spawn(c, ship, world); },
  weather,
  setDread(v) { forced = v; dread = v; },
  get dread() { return dread; },
  setTime(t) { state.time = t; },
  setCam(p, z) { if (p !== undefined) { pitch = pitchT = p; } if (z !== undefined) { zoom = zoomT = z; } },
  setOverride(o) { camOverride = o; },
  setAshoreCam: (pos, look) => { ashoreCam = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) }; },   // dev: aim the harbour camera (village screenshots)
  get companions() { return companions; }, petOffer, takePet, caves, openCave, threads, addMark,
  /** concept sketch: put a cat or a gull on deck (dev only) */
  companion(kind = 'cat', slot = '_pet') { if (this[slot]) ship.root.remove(this[slot].m.g); this[slot] = kind ? new Companion(ship, kind) : null; return !!this[slot]; },
  teleport(x, z, h) { ship.pos.set(x, 0, z); ship.heading = h; camHeading = h; },
  /** biome concept scenes (dev): kind 'coral' | 'rain' | 'sunken' */
  async biome(kind, x, z) { const { buildBiome } = await import('./concepts.js'); if (this._biome) scene.remove(this._biome); this._biome = buildBiome(scene, kind, x, z); return true; },
  /** design lineups for screenshots: 'villagers' or 'houses' on a raft at (x, z) */
  showcase(kind, x = 0, z = 60) {
    if (this._show) scene.remove(this._show);
    const b = new Builder(), list = kind === 'houses' ? HOUSES : VILLAGERS, gap = kind === 'houses' ? 7.5 : 1.5, n = list.length, rng = mulberry32(5);
    b.box(0, -0.6, 0, gap * n + 1, 0.8, kind === 'houses' ? 10 : 2.6, '#9a7a50', TILE.planks);
    list.forEach((k, i) => { const px = (i - (n - 1) / 2) * gap; if (kind === 'houses') houseKind(b, b, px, 0.2, 0, 0, rng, k); else villager(b, px, 0.2, 0, 0, rng, k); });
    this._show = new THREE.Mesh(b.geometry(), mats.props); this._show.position.set(x, 0.4, z); scene.add(this._show);
    return list;
  },
  /** the six lighthouse designs side by side on a raft (for screenshots) */
  async lighthouses(x = 0, z = 60) {
    const { lighthouse, LH_KINDS } = await import('./world.js');
    if (this._show) scene.remove(this._show);
    const b = new Builder(), ex = {};
    b.box(0, -0.6, 0, 16 * LH_KINDS.length + 4, 0.8, 14, '#9a7a50', TILE.planks);
    LH_KINDS.forEach((k, i) => { lighthouse(b, ex, (i - (LH_KINDS.length - 1) / 2) * 16, 0.2, 0, 1, null, k); b.cyl(ex.lamp.x, ex.lamp.y, ex.lamp.z, 1.0, 1.0, 1.3, 6, '#4a4450', TILE.stone, false); });   // the lantern room, as an island adds it
    this._show = new THREE.Mesh(b.geometry(), mats.props); this._show.position.set(x, 0.4, z); scene.add(this._show); return LH_KINDS;
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
  sectorAt: (x, z) => sectorAt(x, z, state.seed), traffic, abyss, hut, ship, world, state, begin, scene, camera, renderer, wind, weather, fauna, traffic, sea, audio, fishing, combat, objectives, hurtPlayer, openModal, closeModal, buyUpgrade, refreshMods,
};
let newVoyage = false;   // New voyage reloads straight into the game, no title in between
try { newVoyage = sessionStorage.getItem('hoist-new') === '1'; sessionStorage.removeItem('hoist-new'); } catch (e) { /* storage blocked */ }
// New voyage reloads the page, and a reload always leaves fullscreen; the browser only allows going back in on a key press
// or click, so the first one after the reload does it
try {
  if (sessionStorage.getItem('hoist-fs') === '1') {
    sessionStorage.removeItem('hoist-fs');
    const back = () => { removeEventListener('pointerdown', back, true); removeEventListener('keydown', back, true); if (fsOk && !fsEl()) toggleFullscreen(); };
    addEventListener('pointerdown', back, true); addEventListener('keydown', back, true);
  }
} catch (e) { /* storage blocked */ }
if (params.get('autostart') || newVoyage) begin(); else startTitle();
frame();
