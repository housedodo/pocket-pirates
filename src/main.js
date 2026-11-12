import * as THREE from 'three';
import { clamp, smoothstep, angleDiff, mulberry32, hash2 } from './util.js';
import { sampleStage, DARK_THRESHOLD, dreadAtDistance, dreadWithPeak, strataIndex } from './palette.js';
import { U, mats } from './psx.js';
import { WATER, NISL, waveHeight } from './ocean.js';
import { World, mistMat, villager, VILLAGERS, houseKind, HOUSES, shoreR, lighthouseKind } from './world.js';
import { Builder } from './builder.js';
import { TILE } from './textures.js';
import { Ship } from './ship.js';
import { AudioBus } from './audio.js';
import { sfx } from './sfx.js';
import './mixer.js';
import './studio.js';
import './title.js';
import { pickGreeting, rollGreeting, numberWord } from './greetings.js';
import { isOpen } from './gates.js';
import { DigGame } from './digging.js';
import { lootFor, bottleNote, barrelLoot } from './lore.js';
import { Weather } from './weather.js';
import { Fauna } from './fauna.js';
import { Companion } from './companion.js';
import { Caves } from './caves.js';
import './cavescene.js';
import { Threads } from './threads.js';
import { THREAD_IDS } from './marks.js';
import { Traffic } from './traffic.js';
import { SeaFeatures } from './seafeatures.js';
import { repOf, friendLevel, bearingName, nearby, questProgress, questNeed, fruitOf, fruitName, plural } from './jobs.js';
import { Logbook } from './logbook.js';
import { Hut } from './hut.js';
import { passengerTalk } from './passengers.js';
import { sectorAt } from './sectors.js';
import { KINDS, boatStatus } from './traffic.js';
import { Fishing } from './fishing.js';
import { Combat } from './combat.js';
import './sectors.js';
import { markSeen, isKnown, levels as clueLevels, d3Open } from './clues.js';
import { tableOptions, finalThrow, ENDINGS } from './table.js';
import { Objectives, MUSINGS, MAIN_GOALS, unlocked, gateRadius, chapterOf, goalText } from './objectives.js';
import './customize.js';
import { Wind } from './wind.js';
import { WindFX } from './windfx.js';
import './windmeters.js';
import './pixelui.js';
import { applyTimeOfDay, advanceTime, tod, NIGHT_SET } from './daynight.js';
import { computeMods, shipwrightLine } from './upgrades.js';
import { hasTrait, rollCheck, drawCard, renderCard, setDieWear, TREASURE_TIERS } from './tabletop.js';
import './fishing.js';
import { Sighting, SIGHTS } from './sighting.js';
import { pushOut } from './solids.js';
import { Abyss, EFFECTS } from './abyss.js';
import { Places } from './places.js';
import { LM } from './landmarks.js';
import { SeaPlay } from './seaplay.js';
import { Glimpse } from './glimpse.js';
import { installGamepad } from './gamepad.js';
import { Wake } from './wake.js';
import { Secrets, TALES } from './secrets.js';
import { oilCap } from './oil.js';
import * as life from './harbourlife.js';
import './newspaper.js';
import './localgames.js';
// the core layers (config <- state <- engine) and the small shared systems; see docs/ARCHITECTURE.md
import { params, store, saved, DEV, settings, session, SAVE_KEY, SETTINGS_KEY, THREADS_KEY } from './core/config.js';
import { state } from './core/state.js';
import { rt, G } from './core/runtime.js';
import { renderer, post, scene, camera, ocean, sky } from './core/engine.js';
import { $, goldEl, promptEl, promptTxt, promptBar, promptFill, toastsEl, debugEl, helpEl, chartEl, harbourEl, pauseEl, shipEl, toast } from './ui/dom.js';
import { WEEK, weekday, isMarketDay, isLanternNight, isFestival, tideAt, tideFalls } from './systems/calendar.js';
import { addMark, clearMark, keep } from './systems/storyflags.js';
import { lullDread, lullabyTick, playersEar } from './systems/lullaby.js';
import { lostTick } from './systems/lostsailors.js';
import { buildBiome } from './concepts.js';   // dev concept scenes (__game.biome); the Edge builds from it too
import { edgeTick, startEdge } from './systems/edge.js';
import { PITCH_MIN, updateCamera, initCamera1, initCamera2 } from './ui/camera.js';
import { titleEl, startTitle, titleCam, titleKey, INTRO_DUR, endIntro, skipIntro, begin, initTitle1, initTitle2 } from './ui/title.js';
import { fsEl, fsOk, toggleFullscreen, nightViewNow, showPauseMain, pauseBack, mixer, studio, soundSituation, initPause1, initPause2 } from './ui/pause.js';
import { renderYard, initShipyard } from './ui/shipyard.js';
import { hailShip, renderShipTrade, initShipTrade } from './ui/shiptrade.js';
import { renderHarbour, lettersAt, PETS, companions, petOffer, takePet, tabOpened, showGreeting, greetAdvance, buyUpgrade, initHarbour } from './ui/harbour.js';
import { HUT_NOTES, perrinNote, hutNod, revealHut, showDemoEnd, fogLost, WHITE_MIST, seamTick, clueTick, seaGate, seaTick, oilOn, freeCaysNow, oilTick, SAIL_LIMIT, sailTick, mendSails, toggleLamp, buyOil, tackTick, hurtPlayer, onHitEnemy, initStoryBeats } from './systems/storybeats.js';
import { trackTarget, etaText, slipInfo, drawCompass, updateTracker, initHud } from './ui/hud.js';
import { LOCALS, localGames, pig, maraMood, openCard, caveScene, COLOUR_DEEP, COLOUR_SHALLOW, openCave, tabletopTick, signOn, daysLeft, crewLeave, wishDone, initEncounters } from './ui/encounters.js';

// G-REGISTRY START (generated): what main.js lends the modules under it, read at call time
Object.defineProperties(G, {
  CHART_NOTES: { get: () => CHART_NOTES },
  INTRO_DUR: { get: () => INTRO_DUR },
  LOCALS: { get: () => LOCALS },
  abyss: { get: () => abyss },
  audio: { get: () => audio },
  autosave: { get: () => autosave },
  buyOil: { get: () => buyOil },
  cardEl: { get: () => cardEl },
  caveEl: { get: () => caveEl },
  caves: { get: () => caves },
  closeModal: { get: () => closeModal },
  completeJobIfHere: { get: () => completeJobIfHere },
  costMul: { get: () => costMul },
  crewLeave: { get: () => crewLeave },
  daysLeft: { get: () => daysLeft },
  dreamCost: { get: () => dreamCost },
  eventQuiet: { get: () => eventQuiet },
  falseRumour: { get: () => falseRumour },
  fishing: { get: () => fishing },
  fsEl: { get: () => fsEl },
  giveMap: { get: () => giveMap },
  greetEl: { get: () => greetEl },
  hurtPlayer: { get: () => hurtPlayer },
  lateTell: { get: () => lateTell },
  laterOK: { get: () => laterOK },
  lifeOn: { get: () => lifeOn },
  localGames: { get: () => localGames },
  noteSkip: { get: () => noteSkip },
  objectives: { get: () => objectives },
  oilOn: { get: () => oilOn },
  onbQuiet: { get: () => onbQuiet },
  openModal: { get: () => openModal },
  perrinNote: { get: () => perrinNote },
  pig: { get: () => pig },
  pigEl: { get: () => pigEl },
  places: { get: () => places },
  refreshMods: { get: () => refreshMods },
  revealAround: { get: () => revealAround },
  sea: { get: () => sea },
  seaplay: { get: () => seaplay },
  seeClue: { get: () => seeClue },
  ship: { get: () => ship },
  showDemoEnd: { get: () => showDemoEnd },
  sighting: { get: () => sighting },
  signOn: { get: () => signOn },
  threadChoice: { get: () => threadChoice },
  threads: { get: () => threads },
  titleCam: { get: () => titleCam },
  traffic: { get: () => traffic },
  weather: { get: () => weather },
  wind: { get: () => wind },
  world: { get: () => world },
  yardEl: { get: () => yardEl },
});
// G-REGISTRY END

// ---------------------------------------------------------------- params, save, settings (core/config.js), the voyage's state (core/state.js)

// ---------------------------------------------------------------- renderer & scene (core/engine.js)
const world = new World(scene, state.seed, state.dug);
const ship = new Ship(scene);
{ const hd = world.hutDesc; if (hd) U.uMurk.value.set(hd.x, hd.z, hd.r); }   // the dark water round the hut's island (ocean.js)
const audio = new AudioBus();
audio.layerSeed = state.seed; if (DEV && params.get('musicpace')) audio.layerPace = Math.max(0.1, +params.get('musicpace') || 1);   // the stage-1 instruments arrive in a per-voyage order
sfx.play = (k, o) => audio.play(k, o);
for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { if (audio.ctx && audio.ctx.state === 'suspended' && rt.modal !== 'pause') audio.ctx.resume(); });   // browsers start audio muted until a click or key
audio.muted = settings.muted; audio.userVol = { music: 1, amb: 1, sfx: 1, ...(settings.vol || {}) };
const wind = new Wind(state.windT);
const weather = new Weather(scene);
const windfx = new WindFX(scene);
const places = new Places(scene);    // the hand-made islands: barriers, the fog bank, going ashore, far labels
const seaplay = new SeaPlay(scene);  // gusts to catch and currents to ride
const shipWake = new Wake(scene, { len: 5.2, beam: 1.5 });   // the V wake and bow wave (wake.js)
const secrets = new Secrets(scene, world, state.seed);   // the Kestrel, low-tide wrecks, smoke, the dusk watcher, birds (secrets.js)
const glimpse = new Glimpse(scene);  // one wrong moment on the way home from the hut
rt.glimpseWait = 0, rt.sunScale = 1;
// ---- the quiet window: no random remark, musing, passenger chatter or thread line from Mara or anyone else while the hut is near
// (about 30 s of sailing out), from the first throw until the diver has come and gone, and for 30 s after the hut or the diver.
rt.quietUntil = 0;   // tNow
/** the small tells that only the captain has company (CANON 2026-11-12: nobody sees or hears Mara but the captain): each once,
 *  full game only, after the first throw at the hut, never inside the quiet window. Nobody remarks on them. */
function lateTell() { return window.__BUILD !== 'demo' && !!(state.hut && state.hut.rolls.length) && !eventQuiet(); }
function eventQuiet() {
  const st = state.story;
  return glimpse.active || (st.demoEnd === 'pending' && !st.glimpse) || rt.tNow < rt.quietUntil;
}
rt.seaWave = 1;
const fauna = new Fauna(scene, world);
const traffic = new Traffic(scene, world, state.seed);
const sea = new SeaFeatures(scene, world, state.seed, state.collected);
const sighting = new Sighting(scene);
const caves = new Caves(scene, world, state);
const threads = new Threads(scene, world, state);
// the Tide of Threads: which threads this voyage has awake. In the dev build the title screen can choose (or ?threads=colour,bell / all / none)
function threadChoice() {
  const q = params.get('threads');
  if (q) return q === 'all' ? [...THREAD_IDS] : q === 'none' ? [] : q === 'seeded' ? null : q.split(',').filter((id) => THREAD_IDS.includes(id));
  if (DEV) { const c = store.get(THREADS_KEY); if (c && c.mode === 'chosen') return c.ids || []; if (c && c.mode === 'none') return []; }
  return null;
}
threads.setup(threadChoice());
threads.bind({
  get state() { return state; }, audio, ship, addMark, clearMark, keep,
  toast: (t, dark, ms) => toast(t, dark, ms), say: (t) => { if (!objectives.mate.busy) objectives.mate.say(t); },
  openScene: (kind, id) => openCave({ id, kind }), tide: () => tideAt(), night: () => tod.night, bearing: (dx, dz) => bearingName(dx, dz),
  refreshMods: () => refreshMods(),
  cool: () => { for (const r of Object.values(state.rep)) r.visits = Math.max(0, r.visits - 2); },
  setLook: (c) => { state.custom = { ...state.custom, ...c }; ship.setCustom(state.custom); },
  teleport: (d) => { const dk = d.dock || { x: 0, z: 0 }; ship.pos.set(d.x + dk.x, 0, d.z + dk.z); ship.speed = 0; ship.vel = null; state.pos = { x: ship.pos.x, z: ship.pos.z, h: ship.heading }; },
});
{ const h = world.desc(0, -1); if (h) caves.force(h, 3); }
const combat = new Combat(scene, fauna);
sea.syncQuests(state.quests.filter((q) => q.id === state.tracked));
traffic.onEvent = (what) => {
  if (!laterOK()) return;   // market and regatta wait for the tutorial
  if (what === 'market') toast('A floating market, with bunting on every line. (Friday)', false, 5000);
  if (what === 'regatta') { toast('A regatta! Five boats, racing.', false, 4500); if (!state.hints.regattaSeen && laterOK() && !eventQuiet()) { state.hints.regattaSeen = true; setTimeout(() => objectives.mate.say('A regatta! Look at them go. I wonder who they are racing, and who is giving the prize.'), 2500); } }
};
fauna.onSpot = (what) => {
  if (!laterOK()) return;   // no dolphins or whales for the first goals
  const k = what === 'migration' ? 'whales' : what; state.stats[k] = (state.stats[k] || 0) + 1;
  toast(what === 'dolphins' ? 'Dolphins!' : what === 'migration' ? 'Another whale, heading east.' : what === 'turtles' ? 'A sea turtle, drifting by.' : 'A whale surfaces in the distance!', false, 2500);
  if (what === 'migration' && !state.hints.migrationSeen && laterOK() && !eventQuiet()) { state.hints.migrationSeen = true; setTimeout(() => objectives.mate.say('They are all going the same way, Captain. East. Every one of them. As if they were called.'), 2500); }
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
ship.setTorn(state.sailsTorn);


// ---------------------------------------------------------------- DOM helpers (ui/dom.js)
document.body.appendChild(toastsEl);   // messages sit above every menu, so a quest or rumour line is never hidden behind the shop

weather.onThunder = (delay) => setTimeout(() => audio.thunder(0.9), delay * 1000);   // the long distant roll: audio.thunder keeps them from piling up
sea.onEvent = (e) => {
  const idx = Math.min(4, Math.floor(rt.dread * 5));
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
    toast('A whirlpool tugs at the keel! Sail out of it.', rt.dread > 0.5);
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
    if (!quiet) toast(`${from} gave you a treasure riddle for ${d.name}. Saved in your orders.`, false, 8000);
  } else toast(`${from} gave you a riddle. Saved in your orders. Where it points is up to you.`, false, 8000);
}
// ---- autosave
function saveNow() {
  if (params.get('fresh') || session.noSave) return false;
  rt.lastSave = rt.tNow;
  store.set(SAVE_KEY, { seed: state.seed, gold: state.gold, dug: [...state.dug], discovered: state.discovered, loot: state.loot, upgrades: state.upgrades, collected: [...state.collected], notes: state.notes, board: state.board, halves: state.halves, frags: state.frags, rumoured: state.rumoured, rep: state.rep, job: state.job, serial: state.serial, sectorsSeen: state.sectorsSeen, jobHistory: state.jobHistory, buffs: state.buffs, stats: state.stats, quests: state.quests, fruit: state.fruit, harvest: state.harvest, dayN: state.dayN, greet: state.greet, charts: state.charts, hp: state.hp, ammo: state.ammo, oil: state.oil, sailsTorn: state.sailsTorn, patchKits: state.patchKits, custom: state.custom, owned: [...state.owned], riddles: state.riddles, attempts: state.attempts, catch: state.catch, fishLog: state.fishLog, fishHeard: state.fishHeard, fishAsk: state.fishAsk, hut: state.hut, passenger: state.passenger, story: state.story, crew: state.crew, cardsSeen: state.cardsSeen, haggle: state.haggle, tracked: state.tracked, life: state.life, goals: state.goals, hints: state.hints, time: state.time, windT: wind.t, pos: { x: ship.pos.x, z: ship.pos.z, h: ship.heading } });
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
rt.trackerNewUntil = 0;
function questCue(done, next) {
  // QUEST COMPLETE shows at once; the NEW QUEST card waits until Mara has spoken and the next goal is announced (questNew)
  const el = $('qbanner'); $('qbTitle').textContent = done.title; $('qbRew').textContent = `+${done.reward} gold`;
  el.classList.remove('shownew'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  setTimeout(autosave, 600); audio.play('discover', { vol: 0.5 });
  if (!next) setTimeout(() => questNew(null), 3000);
}
function questNew(next, withCard = true) {
  const el = $('qbanner');
  $('qbNext').textContent = next ? next.title : 'Sail where you like'; $('qbText').textContent = next ? goalText(next, { state, ship }) : 'The side goals in your log are always there.';
  if (withCard) { el.classList.remove('show'); el.classList.remove('shownew'); void el.offsetWidth; el.classList.add('shownew'); }
  rt.trackerNewUntil = performance.now() + 9000; const c = $('compass'); c.classList.remove('ping'); void c.offsetWidth; c.classList.add('ping');
  setTimeout(() => c.classList.remove('ping'), 8000); audio.play('discover', { vol: 0.5 });
}
// the story asks for a dead calm (seconds > 0) or for the wind to pick up again (0, and no natural calm for ten minutes)
function setCalm(s) { if (s > 0) weather.calmHold = s; else { weather.calmHold = 0; weather.noCalm = 600; } }
const objectives = new Objectives({ state, world, ship, toast: (t, d) => toast(t, d), giveMap, forceCalm: setCalm, quiet: () => onbQuiet(), later: () => laterOK(),
  chapterCard: (ch) => { $('qbanner').classList.remove('show'); const el = $('landho'); el.querySelector('b').textContent = `CHAPTER ${ch.n}`; el.querySelector('span').textContent = ch.title; el.querySelector('small').textContent = ch.act; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); audio.play('chapter'); },
  questCue: (done, next) => questCue(done, next), questNew: (next, withCard) => questNew(next, withCard),
  onStep: (done, next) => { if (done.id === 'gossip') revealHut(); } });
objectives.mate.hush = () => eventQuiet();
objectives.mate.onBlip = (dark, guest) => audio.blip(dark, guest);   // very soft voice blips while she talks
const abyss = new Abyss({ scene, ship, world, sky, settings, state, mate: objectives.mate, toast: (t, d, ms) => toast(t, d, ms), fade: $('fade'),
  onEnding: () => {
    rt.forced = null; rt.dread = 0.02; abyss.k = 0;
    ship.pos.set(0, 0, -25); ship.heading = 0; ship.speed = 0; rt.camHeading = 0; rt.yawT = 0;
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
  return { zones, label: ZONE_LABEL[zones[0]], hour: state.time * 24, low: tideAt() < -0.3, rough: weather.storm > 0.3 || weather.rain > 0.55, colour: !!threads.patchAt(x, z, 1) };
}
const fishing = new Fishing(scene, ship, {
  toast: (t) => toast(t),
  getCtx: () => ({ bonus: Math.max(0, ship.mods.lootMul - 1) + (life.meal(state) === 'stew' ? 0.8 : 0), dread: rt.dread }),
  onStrike: (k) => { if (k === 'miss') audio.playTone(196, { dur: 0.3, vol: 0.06 }); else audio.playTone(k === 'gold' ? 880 : 660, { dur: 0.35, vol: 0.07 }); },   // the bite ring: a soft note per strike
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
    // once: a catch that somebody else hooked first (at night, from the second fish on; by the sixth fish at the latest)
    const hooked = !state.story.hook && !f.dark && ((tod.night > 0.5 && state.stats.fish >= 2) || state.stats.fish >= 6);
    if (hooked) { state.story.hook = 'aboard'; f.hooked = true; markSeen(state, 'CL-H2-hook'); }
    toast(`Caught: ${f.name}, ${f.kg}kg (worth ${f.value}g)${l.count === 1 ? ' - new species!' : ''}${hooked ? `${l.count === 1 ? '' : '.'} There is a hook in its mouth already: old bronze, the line cut clean.` : ''}`, f.dark, hooked ? 9000 : 6000);
    if (f.dark) objectives.remark('darkfish', rt.dread);
  },
});

// ---------------------------------------------------------------- the dark hut (storyline minigame)
rt.glitchT = 0, rt.preGlitch = 0;
const hut = new Hut({ state,
  onWin: (n) => { if (n === 20) toast('A natural twenty. Somewhere far below, something is disappointed.', true, 5000); },
  onFail: () => { rt.preGlitch = rt.dread; rt.glitchT = 0.75; hutEl.classList.add('glitching'); rt.shake = 0.4; },
  onClose: () => closeModal() });
// ---- the week: market day everywhere on Wednesdays, lantern night on Saturdays, and each harbour its own festival day
const lifeOn = () => isOpen(state, 'tab', 'tavern');   // harbour life opens with the tavern (chapter III)
// two tides a day, drifting a little later each day; low tide (below -0.45) uncovers more at wrecks and widens the shallows
const tideWord = () => { const a = tideAt(), b = tideAt(state.time + 0.02); return a < -0.45 ? 'low tide' : a > 0.45 ? 'high tide' : b > a ? 'tide coming in' : 'tide going out'; };
function dayLine(d) { const ev = isFestival(d) ? 'festival day' : isMarketDay() ? 'market day' : isLanternNight() ? 'lantern night' : ''; return WEEK[weekday()] + (ev ? ` · ${ev}` : '') + ` · ${tideWord()}`; }
// a harbour grows with your trade there: more boats, then a busier quay, then flags over the pier
function noonBells() {   // villages that keep the bells ring them at noon; you hear them if you are near
  for (const isl of world.islands.values()) { const d = isl.desc; if (d.custom !== 'bells') continue; const dist = Math.hypot(d.x - ship.pos.x, d.z - ship.pos.z); if (dist < 260) audio.play('bell', { vol: clamp(1 - dist / 280, 0.15, 0.8) }); }
}
function weekMorning() {   // Mara mentions the day the first couple of times, then never again
  const k = isMarketDay() ? 'market' : isLanternNight() ? 'lanterns' : null; if (!k || !laterOK() || objectives.pending || eventQuiet()) return;   // Mara only talks about the quest in hand until the tutorial is well under way
  const n = state.hints['week:' + k] || 0; if (n >= 2) return; state.hints['week:' + k] = n + 1;
  objectives.mate.say(k === 'market' ? 'Market day, Captain! Every harbour pays a bit more for what we bring in.' : 'Lantern night tonight. They set little lights on the water. I always want to follow one.');
}
function growthOf(id) { const r = state.rep[id]; if (!r) return 0; const sc = (r.deliveries || 0) * 2 + (r.visits || 0); return sc >= 20 ? 3 : sc >= 10 ? 2 : sc >= 4 ? 1 : 0; }
// her last throw colours that day and the next: a kinder sea after a good one, a thicker one after a bad one
function lastThrow() { const h = state.hut, r = h && h.rolls[h.rolls.length - 1]; return r && state.dayN - r.day <= 1 ? r.n : 0; }
function dreamShift() { const n = lastThrow(); const v = !n || n === 10 ? 0 : n === 20 ? -0.3 : n > 10 ? -0.18 : n === 1 ? 0.15 : 0.1; return v > 0 && isKnown(state, 'lamp') ? v * 0.5 : v; }   // the Kestrel's lamp keeps half the dark back   // bad throws only shade home a little; the real dark comes late
function dreamCost() { const n = lastThrow(); return n && n < 10 ? 1.15 : n >= 17 ? 0.9 : 1; }   // harbours feel it in their prices
function costMul() {   // today's prices here: the dream, plus a harbour you insulted with a natural 1
  const id = rt.harbourIsl && rt.harbourIsl.desc.id, hg = state.haggle;
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
rt.modal = null; // null | 'pause' | 'chart' | 'harbour' | 'ship'
rt.logTab = 'map';
rt.tradeShip = null;
const yardEl = $('yardmodal'), hutEl = $('hutmodal'), cardEl = $('card'), pigEl = $('pig'), greetEl = $('greet'), caveEl = $('cave');
rt.harbourIsl = null;
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
  if (METER_NAMES[k]) nameMeter(el, METER_NAMES[k]);
}
// each gauge says its name once, beside itself, the first time it appears (and on hover afterwards: the title)
const METER_NAMES = { sail: 'Sails', wind: 'Wind', hull: 'Hull' };
function nameMeter(el, text) {
  if (!el) return;
  const tag = document.createElement('div'); tag.className = 'metername'; tag.textContent = text; el.appendChild(tag);
  setTimeout(() => tag.remove(), 7000);
}
function nameOnce(key, el, text) { const s = state.story.named || (state.story.named = {}); if (s[key]) return; s[key] = 1; nameMeter(el, text); }
const laterOK = () => !!params.get('nomate') || state.goals.i >= 9;   // Mara's chatter, dolphins, sightings, pets and the optional goals wait until the tavern chapter: before that she only talks about the quest in hand
rt.onbGold0 = null, rt.onbT0 = null, rt.onbStepT = 0, rt.onbNudged = false;
function onbTick() {
  if (!rt.started) return;
  const s = state.story.onb || (state.story.onb = {});
  if (onbAll()) { if (rt.helpMode === 'start') { rt.helpMode = 'legacy'; helpEl.innerHTML = '<span>A/D steer &middot; W/S sails &middot; G oars &middot; E interact<br>M log &middot; Esc pause &middot; drag = tilt &middot; wheel = zoom &middot; H hide HUD &middot; F1 help</span>'; } state.story.onbAll = true; for (const [k, id] of Object.entries(ONB_KEYS)) { const el = $(id); if (el) el.classList.remove('onb-off'); } return; }
  if (rt.onbGold0 === null) { rt.onbGold0 = state.gold; for (const [k, id] of Object.entries(ONB_KEYS)) if (!s[k]) $(id).classList.add('onb-off'); }
  const gi = state.goals.i, intro = MAIN_GOALS[0].intro, step = state.story.onbStep || 0;
  if (rt.onbT0 === null) rt.onbT0 = rt.tNow;
  // step 0: Mara has introduced herself; if the sails stay furled a while she says so once, kindly
  if (step === 0 && !rt.onbNudged && rt.tNow - rt.onbT0 > 14 && ship.trim < 0.12 && !objectives.mate.busy) { rt.onbNudged = true; objectives.say('Whenever you are ready, Captain, W lets the sails out.'); }
  // step 0 -> 1: the first time the sails go out (after she has had time to speak), she says what A and D do and the gauge appears
  if (step === 0 && ship.trim > 0.12 && rt.tNow - rt.onbT0 > 6) { { const m = objectives.mate, nudge = (q) => q && q.text.startsWith('Whenever you are ready'); m.queue = m.queue.filter((q) => !nudge(q)); if (nudge(m.cur)) { m.skip(); m.skip(); } }   // the sails are out: she does not ask for them any more
    state.story.onbStep = 1; rt.onbStepT = rt.tNow; onbShow('sail'); objectives.say(intro[1]); setHelp('A / D   steer'); }
  // step 1 -> 2: once she has really turned or sailed a little, and a good while later, the wind ring is explained
  else if (step === 1 && (Math.abs(ship.rudder) > 0.3 || state.stats.dist > 25) && rt.tNow - rt.onbStepT > 10) { state.story.onbStep = 2; onbShow('wind'); objectives.say(intro[2]); setHelp(''); }
  // every other piece arrives with the thing it belongs to
  if (gi >= 1 || state.gold !== rt.onbGold0) onbShow('gold');
  if (gi >= 1) { onbShow('place'); onbShow('sail'); onbShow('wind'); if (!state.story.onbStep || state.story.onbStep < 2) { state.story.onbStep = 2; setHelp(''); } }
  if (gi >= 2) onbShow('clock');
  if (state.hp < ship.mods.maxHp || unlocked(state, 'cannons')) onbShow('hull');
}
rt.helpMode = 'start';
function setHelp(t) { helpEl.innerHTML = t ? `<span>${t}</span>` : ''; helpEl.style.opacity = t ? '1' : '0'; rt.helpMode = t ? 'tip' : 'off'; }
rt.started = false;

function openModal(name) {
  if (!rt.started) return;
  closeModal(true);
  rt.modal = name;
  keys.clear();
  if (fishing.active) fishing.cancel();
  if (digGame.active) { digGame.cancel(); rt.dig = null; }
  ({ pause: pauseEl, chart: chartEl, harbour: harbourEl, ship: shipEl, yard: yardEl, hut: hutEl, card: cardEl, pig: pigEl, greet: greetEl, cave: caveEl, local: localGames.el })[name].classList.add('open');
  if (name === 'pause') { showPauseMain(); }
  if (name === 'harbour') rt.openLetter = null;
  if (name === 'chart') { abyss.onMapOpen(ship);
    // the first look at the chart after the hut has appeared on it: the chart opens on the hut, so Mara's question has something to point at
    const hd = world.hutDesc;
    if (hd && state.story.hutNod && !state.story.hutFramed && !(state.hut && state.hut.rolls.length)) { state.story.hutFramed = true; rt.logTab = 'map'; logbook.frame(hd.x, hd.z); }
    logbook.open(rt.logTab);
    hutNod(1800); }
  if (name === 'harbour') renderHarbour();
  document.body.classList.toggle('ashore', name === 'harbour' || name === 'greet' || name === 'yard');
  if (name === 'ship') renderShipTrade();
  if (name === 'yard') { rt.yardTry = { ...state.custom }; rt.yardTab = 'hull'; rt.yardIdle = 0; renderYard(); }
  if (name === 'hut') hut.open();
  audio.play(name === 'pause' ? 'pause' : 'ui');
  audio.setPaused(name === 'pause');
}
function closeModal(silent = false) {
  rt.hbPaper = false;
  if (!rt.modal) return;
  document.body.classList.remove('ashore');
  pauseEl.classList.remove('open'); chartEl.classList.remove('open'); harbourEl.classList.remove('open'); shipEl.classList.remove('open'); yardEl.classList.remove('open'); hutEl.classList.remove('open'); cardEl.classList.remove('open'); pigEl.classList.remove('open'); greetEl.classList.remove('open'); caveEl.classList.remove('open'); if (rt.modal === 'local') localGames.finish();
  if (rt.modal === 'pause') audio.setPaused(false);
  if (rt.modal === 'hut') hutLeft();
  if (rt.modal === 'card') sighting.dismiss();
  if (rt.modal === 'cave') { rt.caveRun = null; caveScene.stop(); }
  if (rt.modal === 'yard') { ship.setCustom(state.custom); rt.yardTry = null; }   // anything only tried on is put back
  rt.modal = null; rt.harbourIsl = null;
  if (!silent) rt.lastTs = performance.now();
}

// ---------------------------------------------------------------- input
const touch = { L: false, R: false, U: false, D: false };
initTitle1();   // (ui/title.js)

initPause1();   // (ui/pause.js)
initTitle2();   // (ui/title.js)
rt.forced = params.has('dread') ? clamp(parseFloat(params.get('dread')), 0, 1) : null;

window.addEventListener('pointerdown', () => skipIntro());
window.addEventListener('keydown', (e) => {
  if (rt.introT >= 0) { skipIntro(); return; }
  if (e.target && e.target.closest && e.target.closest('#mixer, #studio') && e.code !== 'F8' && e.code !== 'F9') return;   // arrow keys on a mixer slider move the slider, not the ship
  if (!rt.started && $('thPanel').classList.contains('open')) return;
  if (!rt.started) { if (rt.titleScene) titleKey(e); else begin(); return; }
  if (e.code === 'Escape' || e.code === 'KeyP') {
    e.preventDefault();
    if (rt.modal === 'pause') { if (rt.pausePanel !== 'main') pauseBack(); else closeModal(); }
    else if (rt.modal) closeModal(); else openModal('pause');
    return;
  }
  if (rt.modal === 'pause') {
    const btns = [...pauseEl.querySelectorAll('button')].filter((b) => b.offsetParent);
    const i = btns.indexOf(document.activeElement);
    if (e.code === 'ArrowDown') { btns[(i + 1) % btns.length].focus(); e.preventDefault(); }
    if (e.code === 'ArrowUp') { btns[(i - 1 + btns.length) % btns.length].focus(); e.preventDefault(); }
    return;
  }
  if (rt.modal === 'greet') { if (['KeyE', 'Space', 'Enter', 'NumpadEnter'].includes(e.code)) { e.preventDefault(); greetAdvance(); } return; }
  if (rt.modal === 'cave') {
    if ($('roll').classList.contains('open')) return;
    if (rt.cardBusy === 'done' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) { e.preventDefault(); $('caveDone').click(); return; }
    const n = parseInt(e.key, 10); if (!rt.cardBusy && n >= 1) { const b = $('caveChoices').querySelectorAll('button')[n - 1]; if (b) b.click(); }
    return;
  }
  if (rt.modal === 'card') {
    if ($('roll').classList.contains('open')) return;
    if (rt.cardBusy === 'done' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter')) { $('cardDone').click(); return; }
    const n = parseInt(e.key, 10); if (!rt.cardBusy && n >= 1) { const b = cardEl.querySelectorAll('#cardChoices button')[n - 1]; if (b) b.click(); }
    return;
  }
  if (rt.modal === 'pig') {
    if (e.code === 'Space') { e.preventDefault(); pig.roll(); }
    if (e.code === 'KeyH') pig.hold();
    if (e.code === 'KeyE') $('pigLeave').click();
    return;
  }
  if (rt.modal === 'local') { e.preventDefault(); localGames.key(e.code); return; }
  if (rt.modal === 'hut') {
    if (e.code === 'Space') { e.preventDefault(); hut.roll(); }
    if (e.code === 'KeyE') closeModal();
    return;
  }
  if (rt.modal === 'ship') {
    if (e.code === 'KeyE') closeModal();
    const n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) { const b = shipEl.querySelectorAll('#shList button')[n - 1]; if (b && !b.disabled) b.click(); }
    return;
  }
  if (rt.modal === 'chart') {
    if (e.code === 'ArrowRight') logbook.step(1);
    else if (e.code === 'ArrowLeft') logbook.step(-1);
    else if (e.code === 'ArrowDown' || e.code === 'PageDown') logbook.turn(1);
    else if (e.code === 'ArrowUp' || e.code === 'PageUp') logbook.turn(-1);
    else if (/^Digit[1-3]$/.test(e.code)) logbook.tabByIndex(parseInt(e.code.slice(5), 10) - 1);
    else if (e.code === 'KeyM') closeModal();
    else if (e.code === 'KeyJ') { if (logbook.tab === 'orders') closeModal(); else logbook.open('orders'); }
    rt.logTab = logbook.tab;
    return;
  }
  if (rt.modal === 'harbour') {
    const order = ['board', 'market', 'tavern', 'wright'];
    if (e.code === 'KeyE') { closeModal(); return; }
    if (e.code === 'KeyM') { closeModal(); openModal('chart'); return; }   // Mara says "open your log with M" right after you take a letter here
    const n = parseInt(e.key, 10);
    const open = order.filter((t) => isOpen(state, 'tab', t)), go = (t) => { rt.hbTab = t; (state.story.uiSeen || (state.story.uiSeen = {}))[t] = true; renderHarbour(); };
    if (n >= 1 && n <= 4 && open.includes(order[n - 1])) go(order[n - 1]);
    if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') go(open[(open.indexOf(rt.hbTab) + (e.code === 'ArrowRight' ? 1 : open.length - 1)) % open.length]);
    return;
  }
  if (e.code === 'KeyM') { rt.logTab = state.story.tabMark || 'map'; openModal('chart'); return; }   // the tab Mara sent you to, if she did
  if (e.code === 'KeyL') { toggleLamp(); return; }
  if (e.code === 'KeyJ') { rt.logTab = 'orders'; openModal('chart'); return; }
  if (rt.modal) return;
  if (e.code === 'Space') e.preventDefault();
  if (e.repeat) return;
  if (digGame.active) {   // probing the shore: the arrows / WASD move over the beach, not the ship
    const mv = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], KeyA: [-1, 0], KeyD: [1, 0], KeyW: [0, -1], KeyS: [0, 1] }[e.code];
    if (mv) { digGame.move(...mv); e.preventDefault(); return; }
  }
  keys.add(e.code);
  if (e.code === 'Space' && digGame.active) { digGame.press(); return; }
  if (e.code === 'Space') { if (fishing.active) { fishing.hold = true; fishing.press(true); } else if (objectives.mate.cur) objectives.mate.skip(); else if (unlocked(state, 'cannons')) fireCannons(); }   // Space (or Enter) moves Mara's text on
  if (e.code === 'KeyC' && unlocked(state, 'fish')) { if (rt.lampOut && !fishing.active) { toast('Too dark to see the line. The lamp needs oil.', false, 3500); return; } fishing.press(); }
  if (e.code === 'KeyY' && !abyss.maraHint()) objectives.askHint(rt.dread);
  if (e.code === 'Enter' || e.code === 'NumpadEnter') objectives.mate.skip();
  if (e.code === 'KeyE') { if (digGame.active) digGame.press(); else tryInteract(); }
  if (e.code === 'KeyH') $('hud').classList.toggle('hidden');
  if (e.code === 'F1') { e.preventDefault(); rt.helpMode = rt.helpMode === 'full' ? 'off' : 'full'; helpEl.innerHTML = '<span>A/D steer &middot; W/S sails &middot; G oars &middot; E interact &middot; C fish<br>M log &middot; J orders &middot; Q tracker &middot; Esc pause &middot; H hide HUD &middot; F1 this help</span>'; helpEl.style.opacity = rt.helpMode === 'full' ? '1' : '0'; }
  if (e.code === 'KeyG' && !rt.modal && rt.started && unlocked(state, 'oars')) { ship.rowing = !ship.rowing; toast(ship.rowing ? 'Oars out' : 'Oars in, sails up', false, 2200); if (ship.rowing) objectives.remark('oars', rt.dread); }
  if (e.code === 'KeyQ' && !rt.modal) { settings.tracker = settings.tracker === false; store.set(SETTINGS_KEY, settings); }
  if (!DEV) return;   // test keys only with ?dev=1
  if (e.code === 'F8') { e.preventDefault(); mixer.toggle(); }
  if (e.code === 'F9') { e.preventDefault(); studio.toggle(); }
  if (e.code === 'Backquote') debugEl.style.display = debugEl.style.display === 'block' ? 'none' : 'block';
  if (e.code === 'Digit0') { rt.forced = null; abyss.stopTest(); }
  if (/^Digit[1-4]$/.test(e.code)) devTime([6.5, 12, 19.2, 0][parseInt(e.code.slice(5), 10) - 1]);   // dawn, noon, dusk, night
  if (e.code === 'Comma' && rt.started) devQuest(state.goals.i - 1);
  if (e.code === 'Period' && rt.started) devQuest(state.goals.i + 1);
  if (e.code === 'BracketRight') state.time = (state.time + 1 / 24) % 1;
  if (e.code === 'BracketLeft') state.time = (state.time - 1 / 24 + 1) % 1;
  if (e.code === 'F6') {   // weather: auto -> clear -> light rain -> storm -> auto
    e.preventDefault();
    const W = [['Clear', { cloud: 0, rain: 0, storm: 0, fog: 0 }], ['Light rain', { cloud: 0.7, rain: 0.5, storm: 0, fog: 0 }], ['Storm', { cloud: 1, rain: 1, storm: 0.9, fog: 0 }], ['Auto', null]];
    rt.devWeather = (rt.devWeather + 1) % W.length; weather.force = W[rt.devWeather][1]; toast(`Weather: ${W[rt.devWeather][0]}`, false, 2500);
  }
  if (e.code === 'F7' && rt.started) {   // finish the current main quest (the stage-1 music adds an instrument)
    e.preventDefault();
    if (objectives.current) { logbook.d.skipGoal(); toast(`Quests done: ${state.goals.i} (stage-1 instruments: ${Math.min(6, state.goals.i ? state.goals.i + 1 : 0)})`, false, 3500); }
  }
});
rt.devWeather = 3;   // F6 cycles the forced weather
// ---- dev bar (dev build only): set the hour and jump to any main quest, back and forth
function devTime(h) { state.time = (((h / 24) % 1) + 1) % 1; devBarRender(); }
function devQuest(target) {
  const n = MAIN_GOALS.length; target = Math.max(0, Math.min(n, target));
  const idx = (id) => MAIN_GOALS.findIndex((g) => g.id === id), st = state.story;
  state.goals.started = true; st.onbAll = true;
  if (target > state.goals.i) { while (state.goals.i < target && objectives.current) logbook.d.skipGoal(); }   // forward: each quest's own effects
  else if (target < state.goals.i) {   // back: rewind the story flags that later quests set
    state.goals.i = target;
    if (target <= idx('gossip')) { st.hutKnown = false; st.hutMusicDone = false; st.hutEntered = false; st.hutNod = null; st.hutFramed = false; }
    if (target <= idx('perrin')) { st.perrinNote = false; st.letterP2 = undefined; st.noteLine = undefined; st.check = undefined; }
    if (target <= idx('dig')) { state.dug.delete('1,-1'); const t = world.islands.get('1,-1'); if (t) t.setDug(false); }
    if (target <= idx('harbour')) { st.letterP1 = undefined; st.riddleLine = undefined; }
    if (target === idx('dig') && !st.letterP1) st.letterP1 = 'wait';
  }
  objectives.pending = objectives.current; objectives.gap = 0.3; objectives.newCh = false;   // Mara announces the quest you jumped to
  const g = objectives.current; if (g && g.onStart) g.onStart({ state, forceCalm: setCalm });
  toast(`Quest: ${g ? g.title : 'all done'}`, false, 2500); devBarRender();
}
rt.devBar = null;
function devBarRender() {
  if (!rt.devBar) return;
  const g = objectives.current, h = state.time * 24, hh = String(Math.floor(h)).padStart(2, '0'), mm = String(Math.floor((h % 1) * 60)).padStart(2, '0');
  rt.devBar.querySelector('select').value = String(state.goals.i);
  rt.devBar.querySelector('.dvq').textContent = g ? `${state.goals.i + 1}/${MAIN_GOALS.length}` : 'done';
  rt.devBar.querySelector('.dvt').textContent = `${hh}:${mm}`;
  const sl = rt.devBar.querySelector('#dvDread'), STG = ['Fair', 'Grey', 'Wrong', 'Deep', 'Abyss'];
  if (document.activeElement !== sl) sl.value = String(rt.dread);
  rt.devBar.querySelector('.dvd').textContent = `${rt.dread.toFixed(2)} ${STG[Math.min(4, Math.floor(rt.dread * 5))]}${rt.forced === null ? ' (auto)' : ''}`;
}
if (DEV) {
  rt.devBar = document.createElement('div'); rt.devBar.id = 'devbar';
  rt.devBar.innerHTML = `<button data-q="-1" title="previous quest (,)">&lt;</button><select title="jump to a quest">${MAIN_GOALS.map((g, i) => `<option value="${i}">${i + 1}. ${g.title}</option>`).join('')}<option value="${MAIN_GOALS.length}">(all done)</option></select><button data-q="1" title="next quest (.)">&gt;</button><span class="dvq"></span>
    <span class="dvsep"></span><button data-h="6.5" title="1">Dawn</button><button data-h="12" title="2">Noon</button><button data-h="19.2" title="3">Dusk</button><button data-h="0" title="4">Night</button><span class="dvt"></span>
    <span class="dvsep"></span><label for="dvDread">Dread</label><input id="dvDread" type="range" min="0" max="1" step="0.01" value="0"><button data-auto="1" title="dread follows the distance from Tama again (0)">auto</button><span class="dvd"></span>`;
  document.body.appendChild(rt.devBar);
  rt.devBar.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.auto) { rt.forced = null; abyss.stopTest(); } else if (b.dataset.q) devQuest(state.goals.i + +b.dataset.q); else devTime(+b.dataset.h); b.blur(); devBarRender(); });
  rt.devBar.querySelector('#dvDread').addEventListener('input', (e) => { rt.forced = +e.target.value; devBarRender(); });   // the music and the world follow (eased, like sailing there)
  rt.devBar.querySelector('#dvDread').addEventListener('change', (e) => e.target.blur());
  rt.devBar.querySelector('select').addEventListener('change', (e) => { devQuest(+e.target.value); e.target.blur(); });
  setInterval(devBarRender, 500);
}
window.addEventListener('keyup', (e) => { keys.delete(e.code); if (e.code === 'Space' || e.code === 'KeyC') fishing.hold = false; });
window.addEventListener('blur', () => { if (rt.started && !rt.modal && !params.get('shot') && !(studio && studio.popped)) openModal('pause'); });   // the studio window may take focus: keep playing
titleEl.addEventListener('pointerdown', () => { if (!rt.titleScene) begin(); });   // with the live title, only Set sail starts
initCamera1();   // (ui/camera.js)

for (const [id, k] of [['tL', 'L'], ['tR', 'R'], ['tU', 'U'], ['tD', 'D']]) {
  const el = $(id);
  el.addEventListener('pointerdown', (e) => { begin(); touch[k] = true; e.preventDefault(); });
  const up = () => { touch[k] = false; };
  el.addEventListener('pointerup', up); el.addEventListener('pointerleave', up); el.addEventListener('pointercancel', up);
}
$('tE').addEventListener('pointerdown', (e) => { begin(); if (rt.modal === 'harbour') closeModal(); else if (digGame.active) digGame.press(); else tryInteract(); e.preventDefault(); });
$('tC').addEventListener('pointerdown', (e) => { begin(); if (fishing.active) { fishing.hold = true; fishing.press(true); } else fishing.press(); e.preventDefault(); });
$('tC').addEventListener('pointerup', () => { fishing.hold = false; });
$('tX').addEventListener('pointerdown', (e) => { begin(); fireCannons(); e.preventDefault(); });
$('tP').addEventListener('pointerdown', (e) => { begin(); if (rt.modal) closeModal(); else openModal('pause'); e.preventDefault(); });

initPause2();   // (ui/pause.js)

initHarbour();   // (ui/harbour.js)

initHud();   // (ui/hud.js)

// ---------------------------------------------------------------- game state
/** the dread the captain feels: by distance, but never reset by turning back (peak hysteresis), and a little more at night from the Trade Belt on */
function felt() {
  const dist = dreadAtDistance(Math.hypot(ship.pos.x, ship.pos.z));
  if (window.__BUILD === 'demo') return dist;
  const st = state.story; if (dist > (st.peakDread || 0)) st.peakDread = dist;
  const nightK = strataIndex(Math.hypot(ship.pos.x, ship.pos.z)) >= 2 ? 0.05 * clamp(tod.night, 0, 1) : 0;
  return dreadWithPeak(dist, st.peakDread) + nightK;
}
rt.dread = rt.forced !== null ? rt.forced : dreadAtDistance(Math.hypot(ship.pos.x, ship.pos.z));
rt.dark = rt.dread > DARK_THRESHOLD;
rt.dig = null;     // { isl, t }
rt.digFix = 0, rt.digFixWhy = '';   // after a failed probe: the tide is in, or the crew fetches the spare shovel, until this time
const digGame = new DigGame({ sound: (k) => { if (k === 'rock') { audio.playTone(1180, { dur: 0.35, vol: 0.09 }); audio.playTone(1530, { dur: 0.25, vol: 0.05 }); } else if (k === 'found') { for (const [f, d] of [[523, 0], [659, 90], [784, 180]]) setTimeout(() => audio.playTone(f, { dur: 0.9, vol: 0.12 }), d); } else audio.play('dig', { vol: 0.35, rate: 1.15 }); } });
rt.tNow = 0;
rt.curSector = null;
const sighted = new Set();
rt.lastSighting = 0;
// ---- lighthouse tidbits: pass close to a lighthouse for the first time and the keeper calls something across the water.
// Three kinds: about the tower itself (one set per design), where the nearest harbours lie, and what the week holds.
rt.lhT = 0;
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
  return near * near * (1 - night * 0.8) * (1 - weather.storm * 0.7) * (1 - weather.rain * 0.4) * (1 - smoothstep(0.2, 0.35, rt.dread));
}
// the quiet coast bed (soft breeze, small waves, far gulls): rises over the last ~110 units before an island's shore and is
// full while you are moored or ashore. Fades away with the dread like the gulls and in storms.
function coastLevel(moored, night) {
  const near = world.nearest(ship.pos.x, ship.pos.z, 110);
  let k = near ? 1 - clamp(world.lastEdge / 110, 0, 1) : 0;
  k = moored ? 0.3 : k * k * 0.75;   // docked: the coast drops to a quiet 30% so the harbour and the music come through
  return k * (1 - night * 0.5) * (1 - weather.storm * 0.8) * (1 - smoothstep(0.25, 0.4, rt.dread));
}
// ashore on a big forest island (1): its forest bed plays very quietly. No island is a forest yet (ROADMAP: forest
// islands); when they exist, mark them with desc.forest and this picks them up
function forestLevel(ashore) {
  if (ashore && rt.harbourIsl && rt.harbourIsl.desc && rt.harbourIsl.desc.forest) return 1;
  const g = LM.grove, d = Math.hypot(ship.pos.x - g.x, ship.pos.z - g.z);   // Hollowgreen: the wood can be heard from the water
  return clamp(1 - (d - g.r - 10) / 40, 0, 1) * 0.8;
}
// a fight with raiders is on: cannons are yours and a raider is engaged or close (the battle layer joins the music)
function inBattle() {
  return unlocked(state, 'cannons') && traffic.ships.some((s) => s.hostile && !s.sinking && s.hp > 0 && (s.engaged || Math.hypot(s.x - ship.pos.x, s.z - ship.pos.z) < 110));
}
// the hut exists once the story has reached it: the goal that asks about it ("Ask around") or later, or it is already known
const GOSSIP_AT = MAIN_GOALS.findIndex((g) => g.id === 'gossip');
// the hut's theme: the first time only. It rises over the last ~280 units as you sail up to the hut, plays inside, and once
// you have been inside and sailed ~260 units off, it is done for good and the normal music returns
function hutMusicTarget() {
  const st = state.story, hd = world.hutDesc;
  if (st.hutMusicDone || !world.hutShown || !hd) return 0;
  if (rt.modal === 'hut') { st.hutEntered = true; return 1; }
  const d = Math.hypot(ship.pos.x - hd.x, ship.pos.z - hd.z) - hd.r;
  if (st.hutEntered && d > 260) { st.hutMusicDone = true; return 0; }
  return 1 - smoothstep(90, 280, d);
}
function hutReached() { return !!state.story.hutKnown || (GOSSIP_AT >= 0 && state.goals.i >= GOSSIP_AT); }
// out on open sea (1) or close to an island (0): the stage-1 music layers fall back near land
function openSea() {
  const near = world.nearest(ship.pos.x, ship.pos.z, 140);
  return near ? smoothstep(10, 60, world.lastEdge) : 1;
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
  el.querySelector('small').textContent = (d.lm && LM[d.lm].sight) || SIGHT_WORDS[d.type] || 'an island';
  el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
  if (d.id !== '0,-1') objectives.remark(`sight_${d.type}`, rt.dread);
}
rt.placeShown = '', rt.lastSave = 0, rt.lastNear = null, rt.lastHour = Math.floor(state.time * 24);
const shipInput = { steer: 0, sail: 0 };

function fireCannons() {
  const r = combat.playerFire(ship, traffic, state, ship.mods);
  if (r !== 'ammo' && r !== 'target') audio.play('cannon');
  if (r === 'ammo') { toast('Out of cannonballs! Buy more at a harbour.'); objectives.remark('noammo'); }
  else if (r === 'target') objectives.remark('notarget');
}

function getInteract() {
  const hi = world.nearest(ship.pos.x, ship.pos.z, 18);
  if (hi && hi.desc.hut && world.hutShown) return { kind: 'hut', key: 'hut', isl: hi };
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
  const sc = secrets.near(ship.pos.x, ship.pos.z, state.collected); if (sc && !(sc.kind === 'camp' && state.story.secrets && state.story.secrets[sc.key + '@'] === state.dayN)) return { kind: 'secret', key: sc.key, sc };
  const lmI = world.nearest(ship.pos.x, ship.pos.z, 16);
  if (lmI && lmI.desc.lm) return { kind: 'landmark', key: 'lm' + lmI.desc.id, isl: lmI };
  const isl = world.nearest(ship.pos.x, ship.pos.z, 16, ['treasure']);
  if (isl) return { kind: isl.desc.type, key: isl.desc.id, isl };
  if (sea.nearWreck) return { kind: 'wreck', key: sea.nearWreck.o.id, o: sea.nearWreck.o };
  const sh = traffic.nearestHail(ship.pos.x, ship.pos.z, 24);
  if (sh) return { kind: 'ship', key: 'ship' + sh.id, s: sh };
  const fi = world.nearest(ship.pos.x, ship.pos.z, 14, ['jungle', 'sandbar']);
  if (fi) return { kind: 'fruit', key: 'fruit' + fi.desc.id, isl: fi };
  if (state.sailsTorn && state.patchKits > 0) return { kind: 'patch', key: 'patch' };   // anywhere at sea: patch the sail with a kit
  return null;
}

function completeJobIfHere(d) {
  const j = state.job;
  if (!j || j.toId !== d.id) return;
  const wet = weather.storm > 0.35 ? Math.round(j.reward * 0.6) : 0;   // delivered through a storm: they pay extra
  j.reward += wet; if (wet) objectives.remark('stormpay', rt.dread);
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
rt.waterRough = -1;
rt.ashoreCam = null, rt.ashoreK = 0, rt.animT = 0;
function frameVillage(d) {
  const dx = d.x - ship.pos.x, dz = d.z - ship.pos.z, L = Math.hypot(dx, dz) || 1, ux = dx / L, uz = dz / L, px = -uz, pz = ux;
  const up = Math.max(0, d.H - 1.15);   // a village up on a hill or cliff: lift the camera over the lip
  rt.ashoreCam = { pos: new THREE.Vector3(ship.pos.x + ux * 9 - px * 3, 7.5 + up * 1.15, ship.pos.z + uz * 9 - pz * 3), look: new THREE.Vector3(d.x - ux * d.r * 0.2 + px * d.r * 0.3, 2.5 + up * 0.9, d.z - uz * d.r * 0.2 + pz * d.r * 0.3) };
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
// ---- oars: a soft stroke sound while rowing
rt.oarPhase = 0;
function oarTick(dt) {
  if (!(ship.rowing && ship.rowIn !== 0)) return;
  const ph = Math.floor(ship.stroke / (Math.PI * 2));
  if (ph !== rt.oarPhase) { rt.oarPhase = ph; audio.play('oar', { vol: 0.5 }); }
}
const HEAVE_KINDS = new Set(['thread', 'spring', 'cave', 'treasure', 'fruit', 'wreck', 'landmark', 'patch']);
rt.heave = null, rt.anchorAt = null;   // heave: E was pressed under way, the anchor is going down; anchorAt: where she lies while it is down
/** the anchor: down while going ashore, digging, salvaging, patching or fishing, so the ship cannot drift off the spot */
function anchorTick() {
  if (rt.heave) {
    const tg = getInteract();
    if (!tg || tg.key !== rt.heave.key || rt.tNow - rt.heave.t > 8 || rt.modal) rt.heave = null;
    else if (ship.speed <= 0.3) { rt.heave = null; tryInteract(); }
  }
  ship.anchored = !!rt.heave || !!rt.dig || fishing.active;
  if (!ship.anchored) { rt.anchorAt = null; return; }
  if (!rt.anchorAt && ship.speed < 0.3) rt.anchorAt = { x: ship.pos.x, z: ship.pos.z };
  if (rt.anchorAt) { ship.pos.x = rt.anchorAt.x; ship.pos.z = rt.anchorAt.z; }   // currents and leeway do not move an anchored ship
}
function tryInteract() {
  if (!rt.started || rt.modal) return;
  const tg = getInteract();
  if (!tg) return;
  if (tg.kind === 'sighting') { openCard(tg.s.card); return; }
  // E under way: the anchor goes down first, and the crew goes ashore as soon as she lies still (no need to stop her by hand)
  if (HEAVE_KINDS.has(tg.kind) && ship.speed > 0.3 && !rt.dig && !(tg.kind === 'treasure' && tg.isl.dug)) { if (!rt.heave) audio.play('ui'); rt.heave = { key: tg.key, t: rt.tNow }; return; }
  if (tg.kind === 'thread') { if (ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; } tg.th.run(); return; }
  if (tg.kind === 'spring') { if (ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; } openCave({ id: `spring:${threads.c.src.id}`, kind: 'colourspring' }); return; }
  if (tg.kind === 'cave') { if (ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; } openCave(tg.site); return; }
  if (tg.kind === 'hut') { if (!state.story.hutKnown) { audio.play('knock'); toast('Nobody answers. Inside, a pen scratches, then stops.', true, 4500); return; } openModal('hut'); return; }
  if ((tg.kind === 'treasure' || tg.kind === 'fruit' || tg.kind === 'wreck' || tg.kind === 'landmark') && ship.speed > 0.35) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; }
  if (tg.kind === 'landmark') { if (!rt.dig) goAshore(tg); return; }
  if (tg.kind === 'secret') {
    if (ship.speed > 0.6) { toast('Bring the ship to a full stop first (S to reef the sails).', false, 3000); return; }
    if (!rt.dig) rt.dig = { key: tg.key, t: 0, label: tg.sc.kind === 'kestrel' ? 'Someone goes down on a rope...' : tg.sc.kind === 'camp' ? 'Going ashore...' : 'Salvaging...', need: tg.sc.kind === 'kestrel' ? 5 : 3.2, done: () => secretFound(tg.sc) };
    return;
  }
  if (tg.kind === 'patch') {
    if (ship.speed > 0.6) { toast('Bring the ship to a stop to patch the sail (S, and wait).', false, 3000); return; }
    if (!rt.dig) rt.dig = { key: 'patch', t: 0, label: 'Patching the mainsail...', need: 4.5, done: () => { state.patchKits--; mendSails(`Patched. The sail holds again (${state.patchKits} ${state.patchKits === 1 ? 'kit' : 'kits'} left).`); } };
    return;
  }
  if (tg.kind === 'harbour') {
    const d = tg.isl.desc, rep = repOf(state, d.id);
    if (!rep.last || Date.now() - rep.last > 120000) rep.visits++;
    rep.last = Date.now();
    state.stats.harbours++;
    if (state.hp < ship.mods.maxHp) { state.hp = ship.mods.maxHp; toast('The harbour crew patches up your hull for free.', false, 3000); }
    if (state.sailsTorn) setTimeout(() => mendSails('The sailmaker stitches your mainsail whole again.'), 600);
    const rng = mulberry32(hash2(d.seed, Math.floor(rt.tNow / 8), 3));
    const idx = Math.min(4, Math.floor(rt.dread * 5)), lvl = friendLevel(rep);
    rt.hbShipLine = shipwrightLine(rng, idx);
    threads.onDock(d);
    // someone on the pier may speak first: always on a first visit or a story beat, otherwise rarely
    let say = null;
    { const cur = objectives.current;
      if (cur && cur.id === 'harbour' && d.id === '0,-1' && !state.story.letterP1) state.story.letterP1 = 'wait';   // landfall done: the letter is already waiting, before the goal catches up
      if (cur && cur.id === 'perrin' && d.id === '0,-1' && !state.story.perrinNote && !state.story.letterP2) state.story.letterP2 = 'wait';   // the note waits as a letter; the player takes it
      if (cur && cur.id === 'gossip' && d.id !== '0,-1' && !state.story.hutKnown) { state.story.hutKnown = true; say = { speaker: 'fisher', text: `The black hut? Out past the ${bearingName(world.hutDesc.x - d.x, world.hutDesc.z - d.z)} water. There is a table, they say.`, dark: true, story: true }; } }
    const g = state.greet, h = state.hut, told = state.story.rollSeen || 0, ending = state.story.demoEnd === 'pending', free = g.lastDay !== state.dayN || ending;   // one voice a day, wherever you dock
    if (!say && free && h && h.rolls.length > told) {   // someone already knows the number: always after the first throw, then about half the time
      state.story.rollSeen = h.rolls.length;
      if (told === 0 || ending || Math.random() < 0.5) { say = rollGreeting(h.rolls[h.rolls.length - 1].n, state.time * 24, Math.random); if (ending) say.endsDemo = true; }
    }
    if (!say && ending && h && h.rolls.length) { say = rollGreeting(h.rolls[h.rolls.length - 1].n, state.time * 24, Math.random); say.endsDemo = true; state.story.rollSeen = h.rolls.length; }
    if (!say && free && laterOK() && window.__BUILD !== 'demo' && !state.story.lullRumour && sectorAt(d.x, d.z, state.seed).faction.id === 'free') { state.story.lullRumour = 1; say = { speaker: 'oldsalt', text: 'In the Cays they say the dark keeps quiet while somebody plays.', story: true }; }   // points at the Two Players (the gentle ending)
    if (!say && free && !state.story.tellGreet && lateTell() && Math.random() < 0.5) { state.story.tellGreet = 1; say = { speaker: 'harbourmaster', text: 'Captain. Just yourself again? I will put you down as one.', story: true }; }   // a tell: they greet only you
    if (!say && free && laterOK() && isOpen(state, 'tab', 'tavern') && Math.random() < 0.6) say = life.gossipAt(state, d);
    if (!say && free && laterOK() && rt.dread < 0.6) say = taleAt(d);
    if (!say && free && laterOK() && (g.day[d.id] == null || Math.random() < 0.3)) say = pickGreeting({ hour: state.time * 24, weather: weather.label, dread: rt.dread, rnd: Math.random, custom: d.custom, event: isFestival(d) ? 'festival' : isMarketDay() ? 'market' : isLanternNight() ? 'lantern' : null, boat: (() => { const b = boatStatus(d, state.dayN, rt.dread, state.seed); return b.today === 'stayed' ? 'stayed' : b.yesterday === 'lost' ? 'lost' : null; })() });
    if (!say && free && window.__BUILD !== 'demo') { const tl = threads.harbourLine(d); if (tl) say = { speaker: 'fisher', text: tl, dark: true, story: true }; }
    rt.harbourIsl = tg.isl; rt.hbTab = 'board'; frameVillage(d); autosave();
    if (lettersAt(d).length) setTimeout(() => toast('A letter waits for you at the harbourmaster\'s board.', false, 6000), 900);
    else if (petOffer(d)) setTimeout(() => { const po = PETS[petOffer(d)]; toast(`${po.title}. ${po.sub[0].toUpperCase()}${po.sub.slice(1)}.`, false, 6000); }, 900);
    for (const c of state.crew) if (c.wish && !c.wish.done && c.wish.kind === 'harbour' && c.wish.id === tg.isl.desc.id) wishDone(c);
    harbourEl.classList.toggle('dark', idx >= 3);
    $('hbBannerName').textContent = d.name; $('hbSaid').textContent = ''; $('hbLine').style.display = 'none'; $('hbDay').textContent = dayLine(d);
    if (say && objectives.mate.busy && !say.endsDemo && !say.story) say = null;   // Mara is speaking about the quest: a passing greeting waits for another day
    if (say) { g.day[d.id] = state.dayN; g.lastDay = state.dayN; showGreeting(d, say); } else openModal('harbour');
    audio.play('harbour');
  } else if (tg.kind === 'treasure' && !tg.isl.dug && !rt.dig) {
    const d = tg.isl.desc;
    if (!state.riddles[d.id]) {
      rt.dig = { key: tg.key, t: 0, label: 'Reading the inscription...', need: 2.2, done: () => { readArch(d); objectives.remark('riddle'); } };
      audio.play('dig');
    } else if (state.halves[d.id]) {
      toast('Half a riddle is not enough to dig by. The other half is written on another arch.', false, 5000);
    } else if (rt.digFix > rt.tNow) {
      toast('The crew is still digging out the collapsed hole.', false, 2500);
    } else {
      rt.dig = { key: tg.key, t: 0, mini: true, label: 'Digging...', need: 1, done: () => {
        const ang = Math.atan2(ship.pos.z - d.z, ship.pos.x - d.x);
        if (Math.abs(angleDiff(ang, d.puzzle.angle)) > 0.85) {
          state.attempts[d.id] = (state.attempts[d.id] || 0) + 1;
          toast(state.attempts[d.id] >= 2 ? 'Nothing here but sand. Reread the riddle in your orders and try another shore.' : 'The crew digs and finds only sand and crabs. Wrong shore!', false, 6000);
          return;
        }
        let loot = abyss.wrongLoot(lootFor(mulberry32(hash2(d.seed, 7, state.seed)), d.dread), state);
        const first = d.id === '1,-1';   // the first treasure always pays for one starter upgrade
        if (first) loot = { name: 'Perrin\'s chest: a bag of old doubloons', value: 120, dark: false };
        const land = (tier) => {
          loot.value = Math.round(loot.value * ship.mods.lootMul * (tier ? tier.mult : 1));
          if (tier && tier.mult < 1) loot.name = `${loot.name} (water-damaged)`; else if (tier && tier.mult >= 2) loot.name = `${loot.name} (and more beneath it)`;
          state.stats.treasures++; state.stats.solved++; if (!first) life.news(state, 'treasure', { where: d.name });
          state.gold += loot.value; state.loot.push(loot);
          toast(`Treasure! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
          audio.play('treasure');
        };
        state.dug.add(d.id); tg.isl.setDug(true);   // claimed now, so the throw cannot be started twice
        if (first) land(null); else rollCheck(state, { label: 'The chest: how good a find?', kind: 'luck', dark: loot.dark, tiers: TREASURE_TIERS, treasure: true, attempts: state.attempts[d.id] || 0 }, (ok, n, total, tier) => land(tier));
      } };
      { // probing the shore (digging.js), only on the right shore: a wrong shore is a short dig that finds sand, as before
        const right = Math.abs(angleDiff(Math.atan2(ship.pos.z - d.z, ship.pos.x - d.x), d.puzzle.angle)) <= 0.85;
        if (!right) { rt.dig.mini = false; rt.dig.need = 2.2; }
        else {
          const first = d.id === '1,-1', tools = (1 - ship.mods.digTime) * 6 + (state.buffs.dig > 0 ? 2 : 0);   // the first treasure (tutorial) is kinder; better tools, more digs before the tide
          const beach = first ? 'sand' : ['sand', 'shingle', 'dune', 'mud'][Math.abs(hash2(d.seed, 41, 3)) % 4];   // every treasure isle has its own kind of beach (digging.js BEACHES)
          const pa = d.puzzle.angle, ox = Math.cos(pa), oz = Math.sin(pa), rx = Math.sin(pa), rz = -Math.cos(pa);   // the beach: o out to sea, r along it
          const sun = () => { const sx = -Math.sin(tod.sunAz), sz = Math.cos(tod.sunAz); return { elev: tod.sunElev, gx: sx * rx + sz * rz, gy: sx * ox + sz * oz, dim: 1 - 0.75 * Math.max(weather.cloud || 0, weather.rain || 0) }; };   // the arch's shadow on the sand, from where the sun is now
          const noon = d.puzzle.shadow ? { elev: Math.max(0.3, rt.sunScale), gx: rz, gy: oz } : null;
          const predug = !first && !state.story.predug && state.stats.treasures >= 1;   // the second chest: one hole is there already, over the chest (once)
          if (predug) state.story.predug = 1;
          digGame.start({ cols: 8, rows: 5, beach, sun, noon, predug, digs: Math.round((first ? 13 : 10) + tools - (d.dread > 0.5 ? 1 : 0)), stones: first ? 2 : 3 + (d.dread > 0.4 ? 1 : 0), lie: d.dread > 0.5 ? 0.3 : 0,
            onDone: () => { const done = rt.dig && rt.dig.done; rt.dig = null; if (done) done(); if (predug && digGame.preFound) markSeen(state, 'CL-H3-hole'); if (predug && digGame.preFound) setTimeout(() => objectives.say('Somebody dug here first, and stopped a spade short. Lucky us.'), 3000); },
            onFail: (why) => { rt.dig = null; rt.digFix = rt.tNow + 6; rt.digFixWhy = why; state.attempts[d.id] = (state.attempts[d.id] || 0) + 1;
              toast(why === 'tide' ? 'The tide comes in and fills every hole. The crew waits for it to go out again.' : why === 'mud' ? 'The light goes and the mud is everywhere. The crew scrapes the shovels clean and tries again.' : 'The shovel breaks on a second stone. The crew fetches the spare.', false, 5500); } });
        }
      }
      audio.play('dig');
    }
  } else if (tg.kind === 'fruit' && !rt.dig) {
    const d = tg.isl.desc, f = fruitOf(d);
    if (state.harvest[d.id] != null && state.harvest[d.id] >= state.dayN) { toast(`The ${plural(fruitName(f, d.dread), 2)} here are picked clean for today.`, false, 3500); return; }
    rt.dig = { key: tg.key, t: 0, label: 'Picking fruit...', need: 2.4, done: () => {
      const n = Math.max(1, Math.round((2 + Math.floor(Math.random() * 3)) * ship.mods.lootMul)) + (life.meal(state) === 'pepper' ? 2 : 0);
      state.fruit[f] = (state.fruit[f] || 0) + n; state.harvest[d.id] = state.dayN; state.stats.fruitPicked += n;
      toast(`The crew picked ${n} ${plural(fruitName(f, d.dread), n)}.`, d.dread > 0.5, 4500);
    } };
  } else if (tg.kind === 'ship') {
    hailShip(tg.s);
  } else if (tg.kind === 'wreck' && !rt.dig) {
    const o = tg.o;
    rt.dig = { key: tg.key, t: 0, label: 'Salvaging the wreck...', need: 3.4 * ship.mods.digTime * (state.buffs.dig > 0 ? 0.7 : 1), done: () => {
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

/** a clue is seen: one flag, one added line in the log in another hand, and whatever it grants (clues.js). Never a popup. */
function seeClue(id) {
  const c = markSeen(state, id); if (!c) return;
  state.notes.push({ text: c.line, dark: false });
  if (c.cap === 'streetline') state.story.streetSeen = true;
}
// the world's quiet secrets (secrets.js): what is found
const CAMP_LINES = ['A man with a beard down to his belt. He has been here since before the lighthouse at Tama, he says, and asks for nothing.', 'The fire is warm. Nobody is here. A fish is drying on a stick, half eaten.', 'He is mending a net that will never go in the water. He says the gulls told him you were coming.', 'Nobody. Footprints go down to the water and come back.'];
function secretFound(sc) {
  const S = state.story.secrets || (state.story.secrets = {});
  if (sc.kind === 'kestrel') {
    state.collected.add('kestrel'); state.loot.push({ name: "The Kestrel's bell", value: 40 }); audio.play('treasure'); seeClue('CL-K-a');
    toast("Down in the green dark: a ship on her side, KESTREL on the stern. Her lamp comes up, and her bell, still ringing.", false, 9000);   // a lamp, not gold: it cuts the dark (dreamShift)
    state.notes.push({ text: 'Where the two white posts sat on the Tooth and the Bell: the Kestrel, on the bottom. Her bell still rings.', dark: false });
  } else if (sc.kind === 'tidewreck') {
    state.collected.add(sc.key);
    const loot = abyss.wrongLoot(lootFor(mulberry32(hash2(Math.round(sc.m.x), Math.round(sc.m.z), 41)), rt.dread), state); loot.value = Math.round(loot.value * 1.4 * ship.mods.lootMul * threads.salvageMul()); loot.name = `From the low water: ${loot.name}`;
    state.gold += loot.value; state.loot.push(loot); state.stats.wrecks++; audio.play('treasure');
    { const x = threads.onSalvage(); if (x) setTimeout(() => toast(x, true, 6000), 1500); }
    toast(`The tide is out and the wreck is bare. ${loot.name} (+${loot.value} gold). The water is already coming back.`, loot.dark, 7000);
    if (!S.tideNote) { S.tideNote = 1; state.notes.push({ text: 'Some wrecks only show at low water. The tide hides more than it shows.', dark: false }); }
  } else if (sc.kind === 'camp') {
    const id = sc.key, n = S[id] = (S[id] || 0) + 1;
    if (n === 1) {   // the first time he draws an island on your chart
      let best = null, bd = 900;
      for (let dz = -7; dz <= 7; dz++) for (let dx = -7; dx <= 7; dx++) { const o = world.desc(Math.round(sc.m.x / 110) + dx, Math.round(sc.m.z / 110) + dz); if (o && o.puzzle && !state.dug.has(o.id) && !state.riddles[o.id]) { const dd = Math.hypot(o.x - sc.m.x, o.z - sc.m.z); if (dd < bd && dd < gateRadius(state, tideFalls()) - 40) { bd = dd; best = o; } } }
      toast(CAMP_LINES[0] + (best ? ' Before you go he scratches an island into your chart with a fish bone.' : ''), false, 9000);
      if (best) { state.discovered[best.id] = state.discovered[best.id] || { name: best.name, type: best.type, x: Math.round(best.x), z: Math.round(best.z) }; giveMap(best.id, 'The man by the fire', true, true); }
      state.notes.push({ text: `Smoke on an empty island: a man who has been there longer than the lighthouse.${best ? ' He drew an island on my chart.' : ''}`, dark: false });
    } else toast(CAMP_LINES[1 + (n + state.dayN) % 3], false, 6500);
    S[id + '@'] = state.dayN;   // one visit a day: after that it is just an island again until tomorrow
  }
}
/** the pier tales (secrets.js TALES): rare, once each; the two that matter disagree about everything but their line */
function taleAt(d) {
  const T = state.story.tales || (state.story.tales = {});
  for (const [k, tl] of Object.entries(TALES)) {
    if (T[k]) continue;
    if (tl.harbour === d.id && Math.random() < 0.3) { T[k] = 1; if (tl.note) state.notes.push({ text: tl.note, dark: false }); return { speaker: tl.speaker, text: tl.text, story: true }; }
    if (!tl.harbour && d.id !== '0,-1' && d.id !== '-2,-1' && (T.calm || T.squall) && Math.random() < 0.25) { T[k] = 1; return { speaker: tl.speaker, text: tl.text, story: true }; }
  }
  return null;
}

// going ashore on a hand-made place (places.js says what you find)
function goAshore(tg) {
  const d = tg.isl.desc;
  rt.dig = { key: tg.key, t: 0, label: 'Going ashore...', need: 2.6, done: () => {
    if (d.lm === 'table' && d3Open(state) && !state.story.ending && window.__BUILD !== 'demo') { places.visit(d.lm, state, {}); openTable(); return; }
    const r = places.visit(d.lm, state, { night: tod.night > 0.45, calm: weather.calm > 0.5, tide: tideAt(), mara: true }); if (!r) return;
    if (r.clue) seeClue(r.clue);   // the ledger takes it; no popup (docs/WORLD_REDESIGN.md 6.7)
    const demo = window.__BUILD === 'demo';
    let text = r.dark && demo ? r.text.split('. ')[0] + '.' : r.text;
    const bits = [];
    if (r.gold) { const g = Math.round((r.gold[0] + Math.random() * (r.gold[1] - r.gold[0])) * (r.first ? 1 : ship.mods.lootMul)); state.gold += g; bits.push(`+${g} gold`); audio.play('treasure'); }
    if (r.ammo) { state.ammo += r.ammo; bits.push(`+${r.ammo} cannonballs`); }
    if (r.heal && state.hp < ship.mods.maxHp) { state.hp = ship.mods.maxHp; bits.push('hull mended'); }
    if (r.fruit) { const f = 'mango'; state.fruit[f] = (state.fruit[f] || 0) + r.fruit; bits.push(`+${r.fruit} ${plural(fruitName(f, 0), r.fruit)}`); }
    if (r.chart) { let n = 0; for (const id of r.chart) { const l = LM[id], [cx, cz] = l.key.split(',').map(Number), o = world.desc(cx, cz); if (o && !state.discovered[o.id]) { state.discovered[o.id] = { name: o.name, type: o.type, x: Math.round(o.x), z: Math.round(o.z) }; n++; } } if (n) bits.push(`${n} new ${n === 1 ? 'place' : 'places'} on your chart`); }
    if (r.around) { const n = revealAround(d.x, d.z); if (n) bits.push(`${n} ${n === 1 ? 'isle' : 'isles'} charted`); }
    if (d.lm === 'keeper' && oilOn() && state.oil < oilCap(state.upgrades) - 1) { state.oil = oilCap(state.upgrades); bits.push('Wick fills your lamp'); }
    if (r.oil && oilOn() && state.oil < oilCap(state.upgrades) - 1) { state.oil = oilCap(state.upgrades); bits.push('the lamp is filled'); }
    if (r.note) state.notes.push({ text: r.note, dark: false });
    toast(text + (bits.length ? ` (${bits.join(', ')})` : ''), !!r.dark && !demo, 9000);
    if (r.first) state.stats.places = (state.stats.places || 0) + 1;
  } };
}

// ---------------------------------------------------------------- the Table by the Water: the end of a voyage (table.js)
function openTable() {
  const opts = tableOptions(state), memory = (state.story.maraMem || 0) >= 4;
  rt.cardBusy = false; rt.cardNext = null; openModal('card'); audio.play('card');
  const done = $('cardDone'), out = (t, next) => { $('cardOut').textContent = t; done.style.display = ''; done.textContent = 'Go on [E]'; cardEl.querySelectorAll('#cardChoices button').forEach((b) => { b.disabled = true; }); rt.cardBusy = 'done'; rt.cardNext = next; };
  renderCard({ icon: 'pip', title: 'THE TABLE BY THE WATER', dark: true, text: `A table at the water's edge. One chair on this side, one on the other. A die, waiting.${memory ? ' Mara, quietly: "I do not think we are here to throw."' : ''}`,
    choices: opts.map((o) => ({ label: o.label, id: o.id })) }, (ch) => {
    if (rt.cardBusy) return; rt.cardBusy = true;
    if (ch.id === 'throw') {
      const r = finalThrow(state, 1 + Math.floor(Math.random() * 20)); audio.play('roll_d20', { rate: 0.8 });
      state.hut = state.hut || { rolls: [], wins: 0, fails: 0, lastDay: -1, visits: 0 }; state.hut.rolls.push({ n: r.n, day: state.dayN, last: true });
      const words = ['', 'one', 'two', 'three'];
      out(`The die clatters across the table. ${r.n}.${r.w ? ` She turns the book round. It ${r.w > 0 ? 'gives' : 'takes'} ${words[Math.abs(r.w)]}.` : ''}`, () => { closeModal(); showEnding(r.end, r); });
    } else if (ch.id === 'ask') {   // she does not tell sailors apart: to her they are all one, the sailor (CANON 2026-11-12). Never explained.
      state.story.asked = 1;
      out('She writes your question on a clean line: WHO COUNTS? Under it, one word. YOU. Every line above it, as far back as the book goes, ends with the same word.', () => { closeModal(true); openTable(); });
    } else if (ch.id === 'mara') {   // she wants to try; the die does not move for her. Never explained.
      state.story.maraTried = 1;
      out('Mara reaches for the die. Her fingers close round it, and it does not move. She tries again. "Slippery thing," she says, and laughs, a little too quickly.', () => { closeModal(true); openTable(); });
    } else { closeModal(); showEnding(ch.id); }
  });
}
function showEnding(id, roll = null) {
  const e = ENDINGS[id]; if (!e) return;
  state.story.ending = { id, day: state.dayN, n: roll ? roll.total : null };
  const el = $('ending'); el.classList.toggle('dark', !!e.dark);
  el.querySelector('h1').textContent = e.title;
  el.querySelector('div').innerHTML = e.lines.map((l) => `<p>${l}</p>`).join('');
  el.classList.add('show'); audio.play('ending'); autosave();
}
$('endGo').addEventListener('click', () => {
  const e = state.story.ending; $('ending').classList.remove('show'); if (!e) return;
  if (e.id === 'rises') { abyss.solo = 'leviathan'; rt.forced = 1; abyss.startEnding(); return; }   // the Eye opens; you wake off Tama
  if (e.id === 'sleep' || e.id === 'dreams' || e.id === 'tune') {   // the sea is quiet again: morning, off Tama, as if you had only been out for the night
    state.story.peakDread = 0; rt.forced = null; rt.dread = 0.02; abyss.k = 0; state.time = 0.3;
    ship.pos.set(0, 0, -25); ship.heading = 0; ship.speed = 0; ship.vel = null; rt.camHeading = 0; rt.yawT = 0; objectives.mate.queue.length = 0;
  }
  if (ENDINGS[e.id].mara) objectives.mate.say(ENDINGS[e.id].mara);
});
initShipTrade();   // (ui/shiptrade.js)

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
  if (!v) { toast(FALSE_NOTHING[n % FALSE_NOTHING.length], rt.dread > 0.4, 7000); return; }
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
  if (!onbQuiet()) toast(`Charted: ${d.name} (+5 gold)`, rt.dread > 0.5);
  if (rum && rum.fake !== undefined) setTimeout(() => resolveFalseRumour(d, rum), 1800);
  audio.play('discover');
}

initShipyard();   // (ui/shipyard.js)

// ---------------------------------------------------------------- combat helpers
rt.lastHit = -99, rt.shake = 0;
// Weather that pushes back: storms shove the ship sideways and waves hitting the side wear the hull;
// a dead calm leaves only the oars. Thick fog (later in the voyage) fogs the instruments too.
rt.stormWear = 0, rt.galeWear = 0, rt.bellT = 0;
function stormAndCalm(dt) {
  const st = weather.storm, sail = ship.trim;
  if (st > 0.15) {
    const gust = 0.6 + 0.4 * Math.sin(rt.tNow * 0.9) * Math.sin(rt.tNow * 2.3);
    const push = st * gust * (2.4 + 3.2 * sail) * (ship.rowing ? 0.6 : 1) * dt;                  // shoved downwind, more with the sail up
    ship.pos.x += Math.sin(wind.dir) * push; ship.pos.z -= Math.cos(wind.dir) * push;
    const side = Math.abs(Math.sin(angleDiff(ship.heading, wind.dir)));   // waves run with the wind
    const salt = (hasTrait(state, 'salt') ? 0.5 : 1) * ((state.upgrades.hull || 0) >= 2 ? 0.5 : 1);   // an iron-banded hull rides storms better
    if (st > 0.4 && side > 0.6) {   // waves hitting the side
      rt.stormWear += dt * st * (side - 0.5) * (0.6 + 1.6 * sail) * 1.4 * salt;
      if (rt.stormWear >= 4) { rt.stormWear = 0; hurtPlayer(7); objectives.remark('broadside', rt.dread); }
    }
    // a gale with the sails out tears at the rigging, whatever the heading: reef them (S) or take the oars
    if (st > 0.45 && sail > 0.35 && !ship.rowing) {
      rt.galeWear += dt * (st - 0.4) * (sail - 0.25) * 0.6 * salt;   // full storm, full sail: a hit every 4-5 s
      if (rt.galeWear >= 1) { rt.galeWear = 0; hurtPlayer(6); if (!state.hints.gale) { state.hints.gale = true; toast('The gale tears at the sails! Reef them (S) or put the oars out (G).', true, 6000); } }
    } else rt.galeWear = Math.max(0, rt.galeWear - dt * 0.2);
  }
  if (weather.calm > 0.5) {
    objectives.remark('calm', rt.dread);
  }
  if (weather.redSky > 0.4) objectives.remark('redsky', rt.dread);
  const thick = weather.fog > 0.5 && (state.dayN >= 3 || rt.dread > 0.3);
  document.body.classList.toggle('fogged', thick);
  if (thick) {
    objectives.remark('thickfog', rt.dread);
    if ((rt.bellT -= dt) <= 0) { rt.bellT = 14 + Math.random() * 8; audio.play('bell', { vol: 0.5 }); }
  }
}

initEncounters();   // (ui/encounters.js)

initStoryBeats();   // (systems/storybeats.js)

// ---------------------------------------------------------------- captain's log
const logbook = new Logbook({ slip: () => slipInfo(), eta: (d) => etaText(d), abyss, state, world, ship, seed: state.seed, locked: (tab) => !isOpen(state, 'log', tab), toast: (t) => toast(t), close: () => closeModal(), mate: objectives.mate, dread: () => rt.dread, mood: () => maraMood(), tabOpened: (t) => tabOpened(t),
  retrack: () => sea.syncQuests(state.quests.filter((q) => q.id === state.tracked)),
  gate: () => gateRadius(state, tideFalls()), track: () => trackTarget(),
  skipGoal: () => { const g = objectives.current; if (!g) return; if (g.onDone) g.onDone({ state, world, ship, giveMap, forceCalm: setCalm });
    if (g.id === 'perrin') perrinNote(); if (g.id === 'gossip') { state.story.hutKnown = true; revealHut(); }
    state.goals.i++; const n = objectives.current; if (n && n.onStart) n.onStart({ state }); toast('Goal skipped.'); } });

// ---------------------------------------------------------------- main loop
const GLASS = new THREE.Color('#07030d');
const _v = new THREE.Vector3();
initCamera2();   // (ui/camera.js)
rt.lastTs = performance.now();
function frame() {
  const nowTs = performance.now();
  const rawDt = Math.min(0.05, (nowTs - rt.lastTs) / 1000);
  rt.lastTs = nowTs;
  if (rt.introT >= 0) { rt.introT += rawDt; if (rt.introT >= INTRO_DUR) endIntro(); }
  const live = rt.started && !rt.modal && rt.introT < 0;
  const dt = live ? rawDt : 0;           // simulation time: frozen while a menu is open
  const ashore = rt.modal === 'harbour' || rt.modal === 'greet' || rt.modal === 'yard';
  const vdt = live || ashore || rt.titleScene ? rawDt : 0;  // ashore the world keeps moving (people, gulls, waves) while the clock stands still
  rt.tNow += dt; rt.animT += vdt;
  const stepT = Math.floor(rt.animT * 12) / 12;

  // ---- time of day & wind
  if (live) { const pt = state.time; state.time = advanceTime(state.time, dt); if (state.time < pt) { noteSkip(); state.dayN++; crewLeave(); }
    if (pt < 0.5 && state.time >= 0.5) noonBells();
    if (tideAt() < -0.45 && !state.hints['tide:low'] && laterOK() && !objectives.pending && !objectives.mate.busy && !eventQuiet()) { state.hints['tide:low'] = true; objectives.mate.say('The tide is out, Captain. Keep off the shallows, and the wrecks give up more at low water.'); }
    if (pt < 0.27 && state.time >= 0.27) weekMorning(); }
  wind.update(dt);
  if (dt > 0) { state.buffs.speed = Math.max(0, state.buffs.speed - dt); state.buffs.dig = Math.max(0, state.buffs.dig - dt); }
  ship.buff = (state.buffs.speed > 0 ? 1.15 : 1) * (life.meal(state) === 'pie' ? 1.06 : 1);
  { const m = life.meal(state); ship.trimMul = m === 'bread' ? 1.7 : 1; ship.lampBoost = m === 'tea' ? 1.6 : 1; }   // the house dish you ate (harbourlife.js)
  ship.lampOut = rt.lampOut; ship.stormLight = weather.heavy || 0;   // the lantern also shows in a storm
  const sec = sectorAt(ship.pos.x, ship.pos.z, state.seed);
  if (sec.id !== rt.curSector) {
    rt.curSector = sec.id;
    if (!state.sectorsSeen.includes(sec.id)) state.sectorsSeen.push(sec.id);
    if (live && !onbQuiet()) toast(`Entering ${sec.name}: ${sec.faction.name} waters`, sec.dread > 0.5, 5000);
  }
  { // early chapters: a gentler wedge into the wind, and around Tama the wind leans across the first routes
    const early = chapterOf(state) < 2;
    let want = wind.raw;
    ship.floorMin = early ? 0.45 : 0; ship.wedge = (early ? 0.68 : 0.6) * Math.PI; ship.wedgeEnd = (early ? 0.97 : 0.95) * Math.PI;
    if (early && !rt.titleScene) {
      const t = world.desc(0, -1), g = world.desc(1, -1), dTama = Math.hypot(ship.pos.x - t.x, ship.pos.z - t.z);
      const k = clamp(1 - (dTama - 450) / 150, 0, 1);
      if (g && k > 0) { const target = Math.atan2(g.x - t.x, -(g.z - t.z)) + Math.PI / 2; want = target + angleDiff(target, want) * (1 - 0.75 * k); }
    }
    wind.dir += angleDiff(wind.dir, want) * Math.min(1, dt * 0.45);   // the felt wind swings round over a few seconds
  }
  { // the glimpse: once, a little while after you sail away from your first throw at the hut
    const hd = world.hutDesc;
    if (hd && Math.hypot(ship.pos.x - hd.x, ship.pos.z - hd.z) < 400) rt.quietUntil = Math.max(rt.quietUntil, rt.tNow + 30);   // the hut is within about 30 s of sailing
    if (live && state.story.demoEnd === 'pending' && !state.story.glimpse && hd && Math.hypot(ship.pos.x - hd.x, ship.pos.z - hd.z) > 150) {
      rt.glimpseWait += dt;
      if (rt.glimpseWait > 45 && !objectives.mate.busy) { state.story.glimpse = 1; glimpse.start(ship); }
    }
    if (live && glimpse.update(dt)) { rt.quietUntil = rt.tNow + 30; setTimeout(() => objectives.mate.say('Captain? You went quiet.'), 2500); }
    audio.hush(Math.max(glimpse.k * 0.97, rt.edgeHush || 0));   // the glimpse, and the Edge (systems/edge.js)
  }
  const windNow = { dir: wind.dir, strength: Math.min(1.4, wind.strength * (1 + 0.25 * weather.storm)) * (1 - 0.92 * weather.calm) * (1 - glimpse.k) };
  if (live && wind.shifted() && onbAll()) toast(`The wind is shifting: now from the ${wind.fromName}`, false, 4200);

  // ---- ship
  shipInput.steer = (keys.has('KeyD') || keys.has('ArrowRight') || touch.R ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') || touch.L ? 1 : 0);
  shipInput.sail = (keys.has('KeyW') || keys.has('ArrowUp') || touch.U ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') || touch.D ? 1 : 0);
  if (!live || digGame.active || rt.lostK > 0.3 || rt.edgeLock) { shipInput.steer = 0; shipInput.sail = 0; }   // (lost in fog: the helm does not answer)   // (probing the shore: the keys move over the beach)
  if (live && (keys.has('KeyZ') || keys.has('KeyX'))) { rt.yawT += ((keys.has('KeyX') ? 1 : 0) - (keys.has('KeyZ') ? 1 : 0)) * dt * 1.8; rt.lastCamInput = rt.tNow; }
  if (keys.has('KeyV')) { rt.yawT = 0; rt.lastCamInput = rt.tNow; }
  if (!rt.drag && rt.tNow - rt.lastCamInput > 6) rt.yawT += (0 - rt.yawT) * Math.min(1, rawDt * 0.7);   // drifts back behind the boat after a while
  if (live && keys.has('KeyR')) rt.pitchT = clamp(rt.pitchT - dt * 0.8, PITCH_MIN, 1.35);
  if (live && keys.has('KeyF')) rt.pitchT = clamp(rt.pitchT + dt * 0.8, 0.3, 1.35);
  if (live || params.get('autostart')) ship.update(dt, shipInput, windNow, rt.tNow);
  if (live && dt > 0) { stormAndCalm(dt); tabletopTick(dt); seaGate(dt); clueTick(dt); seamTick(dt); tackTick(dt); seaTick(dt, windNow); oilTick(dt); sailTick(dt, windNow); fogLost(dt); }
  if (live) { anchorTick(); oarTick(dt); }
  if (live && dt > 0 && window.__BUILD !== 'demo') edgeTick({ dt, dread: rt.dread, ship, quiet: eventQuiet() || !!rt.modal || rt.lostK > 0 || !!rt.gateLost,
    clearAhead: () => { const f = [Math.sin(ship.heading), -Math.cos(ship.heading)]; for (const d of [60, 140, 220, 300]) if (world.nearest(ship.pos.x + f[0] * d, ship.pos.z + f[1] * d, 120)) return false; return true; },
    fadeEl: $('fade'), onDone: () => { rt.quietUntil = rt.tNow + 30; } });   // the Edge, once, at the deepest dread
  if (live && dt > 0 && window.__BUILD !== 'demo') lostTick({ dt, dread: rt.dread, sighting, ship, world, quiet: eventQuiet() || !!rt.modal || !!rt.edge });   // the sailors who went mad
  if (live && dt > 0 && window.__BUILD !== 'demo') lullabyTick({ dt, free: !!freeCaysNow(), night: tod.night, storm: weather.storm });   // the Two Players keep the Cays quiet
  const solid = [];
  traffic.solids(solid); fauna.solids(solid); sea.solids(solid); sighting.solids(solid); secrets.solids(solid);
  if (world.collide(ship.pos, 2.2) | pushOut(ship.pos, 2.2, solid)) {
    if (ship.speed > 3 && dt > 0) audio.play('bump', { vol: clamp(ship.speed / 10, 0.3, 1) });
    ship.speed *= 0.9;
  }

  // ---- dread + stage palette + time of day
  const target = rt.forced !== null ? rt.forced : lullDread(clamp(felt() + (window.__BUILD === 'demo' ? 0 : dreamShift()), 0, 1));   // the Cays' night quiet holds it down (systems/lullaby.js)
  rt.dread += (target - rt.dread) * Math.min(1, rawDt * (rt.forced !== null ? 1.2 : 0.4));
  if (params.get('shot')) rt.dread = target;
  if (rt.glitchT > 0) { rt.glitchT -= rawDt; rt.dread = 1; if (rt.glitchT <= 0) { rt.dread = rt.preGlitch; hutEl.classList.remove('glitching'); } } // the hut's bad throw
  rt.dark = rt.dread > DARK_THRESHOLD;
  const stage = sampleStage(rt.dread);
  nightViewNow();
  applyTimeOfDay(stage, state.time, rt.dread);
  rt.sunScale = stage.sunElev / 0.62;   // how high the sun climbs today (the dig's noon shadow uses it)
  stage.wave *= 0.7 + 0.5 * wind.strength;
  weather.update(dt, wind.t, rt.dread, wind.dir, wind.strength, camera, tod);
  weather.apply(stage);
  if (rt.titleScene && rt.titleScene.sc.tint) { const t = rt.titleScene.sc.tint; stage.skyTop.lerp(new THREE.Color(t.top), t.k * 0.6); stage.skyHorizon.lerp(new THREE.Color(t.hor), t.k); stage.fog.lerp(new THREE.Color(t.fog), t.k); }
  stage.fogFar += ship.mods.fogBonus; stage.fogNear += ship.mods.fogBonus * 0.5;
  stage.wave *= 1 - 0.85 * glimpse.k;   // the sea goes flat
  rt.seaWave = stage.wave;
  const fogK = Math.max(rt.gateFog, places.fog, rt.lostK);   // the fog wall at the edge of the chapter, or the bank round the Halved Isle
  { const L = state.upgrades.lantern || 0, dk = Math.max(tod.night, weather.fog || 0, (weather.heavy || 0) * 0.7);   // a lit lantern lets you see further in the dark and in fog: +15% a level
    const tea = life.meal(state) === 'tea' ? 0.25 : 0;
    if ((L || tea) && !rt.lampOut && dk > 0.05) { const k = 1 + (0.15 * L + tea) * dk; stage.fogFar *= k; stage.fogNear *= k; } }
  if (rt.lampOut) { stage.fogFar *= 0.32; stage.fogNear *= 0.25; stage.fog.multiplyScalar(1 - 0.6 * tod.night); stage.light *= 1 - 0.35 * tod.night; }   // no lamp: the dark comes in close
  if (fogK > 0) { stage.fogFar = Math.max(30, stage.fogFar * (1 - 0.85 * fogK)); stage.fogNear = Math.max(4, stage.fogNear * (1 - 0.9 * fogK)); stage.fog.lerp(new THREE.Color('#b8c0c4'), fogK * 0.7); }
  if (rt.lostK > 0) { stage.fogFar = Math.max(10, stage.fogFar * (1 - 0.7 * rt.lostK)); stage.fogNear = Math.max(1, stage.fogNear * (1 - 0.9 * rt.lostK)); stage.fog.lerp(new THREE.Color('#c8ced0'), rt.lostK * 0.5); }   // lost: you can barely see the bow
  abyss.update(dt, { dread: rt.dread, live, camera, camYaw: rt.camYaw, ch: rt.camHeading + rt.camYaw });
  stage.wave *= abyss.waveMul;
  const waveT = abyss.waveTime(stepT);
  if (glimpse.active) glimpse.fig.position.y = waveHeight(glimpse.fig.position.x, glimpse.fig.position.z, waveT, rt.seaWave);   // the diver stands ON the swell

  // ---- world
  const first = world.islands.size === 0;
  world.update(ship.pos.x, ship.pos.z, rt.dark, first ? 200 : 2);
  const lp = abyss.lightPhase;
  world.setLit(lp === 'stare' || glimpse.k > 0.5 ? true : lp === 'dead' ? false : tod.sunHeight < 0.12 || weather.darkness > 0.6);
  world.stare = lp === 'stare' || glimpse.k > 0.5 ? ship.pos : null;
  world.week = { wd: weekday(), market: isMarketDay(), lantern: isLanternNight() }; world.growthOf = growthOf; world.lifeDoneOf = (id) => life.arcDone(state, id); world.tide = tideAt();
  { // a storm front every sixth afternoon (after chapter III), warned by a red sky the evening before; and the sector's own weather
    const h = state.time * 24, fd = state.dayN % 6 === 5 && unlocked(state, 'passengers'), fa = state.dayN % 6 === 4 && unlocked(state, 'passengers');
    weather.front = fd ? smoothstep(12, 16, h) * (1 - smoothstep(19, 22, h)) * (0.55 + 0.45 * rt.dread) : 0;
    weather.frontAhead = fa && h >= 15 ? 1 : 0;
    const fac = sectorAt(ship.pos.x, ship.pos.z, state.seed).faction.id;
    const R = { reef: [1.3, 1.5, 0.9], lantern: [0.9, 0.8, 1.5], drowned: [1, 1.1, 1.4], free: [1.1, 0.8, 0.8] }[fac] || [1, 1, 1];
    weather.region.rain = R[0]; weather.region.storm = R[1]; weather.region.fog = R[2];
    if (fa && h >= 17 && laterOK() && !eventQuiet() && !state.hints['front:' + state.dayN]) { state.hints['front:' + state.dayN] = true; if (!state.hints.frontSeen) { state.hints.frontSeen = true; objectives.mate.say('That red in the west... a front is coming in tomorrow afternoon, Captain. I would be in a harbour by then.'); } }
  }
  { // the sea: it grows unruly with distance (dread) and storms, but only slowly, as real water does; and lighter and shallower near islands
    const target = window.__waterLock && window.__waterLock.rough != null ? window.__waterLock.rough : clamp(0.85 * smoothstep(0.28, 0.82, rt.dread) + 1.1 * weather.heavy + 0.05 * weather.rain, 0, 1);   // light rain leaves the water quiet; a storm whips it up
    rt.waterRough = rt.waterRough < 0 ? target : rt.waterRough + (target - rt.waterRough) * (1 - Math.exp(-Math.min(vdt, 0.5) / (25 - 13 * (weather.heavy || 0))));
    WATER.rough = rt.waterRough; U.uRough.value = rt.waterRough;
    const near = []; for (const isl of world.islands.values()) { const d = isl.desc, dd = Math.hypot(d.x - ship.pos.x, d.z - ship.pos.z); if (dd < 500) near.push([d.x, d.z, d.r, dd]); }
    near.sort((a, b) => a[3] - b[3]); near.length = Math.min(near.length, NISL); WATER.isl = near;
    for (let i = 0; i < NISL; i++) { const n = near[i]; U.uIsl.value[i].set(n ? n[0] : 1e6, n ? n[1] : 1e6, n ? n[2] : 0); }
  }
  world.hutShown = hutReached();   // no hut on its island before the story gets there
  world.gctx = { calm: weather.calm > 0.5, up: state.upgrades, seen: state.story.seen || {}, lvl: clueLevels(state), d3: d3Open(state), ship: { x: ship.pos.x, z: ship.pos.z } };   // what the places' state props read (ART_SPEC 8)
  world.tick(rt.animT, tod);
  places.labelsTick(camera, ship, (state.upgrades.spyglass || 0), state.discovered, window.innerWidth, window.innerHeight, !onbQuiet() && !$('hud').classList.contains('hidden'), { fogFar: scene.fog.far, d3: d3Open(state) });   // far labels: ?, what it looks like, its name; fade with the fog
  ship.place(vdt, waveT, stage.wave, rt.dark, tod.night);
  secrets.update(vdt, waveT, { ship, time: state.time, dayN: state.dayN, tide: tideAt(), wave: stage.wave, light: Math.min(1, 0.25 + stage.light * 0.9), dread: rt.dread, collected: state.collected, windX: Math.sin(wind.dir), windZ: -Math.cos(wind.dir), heading: ship.heading, fogFar: scene.fog.far });
  shipWake.update(vdt, waveT, stage.wave, { pos: ship.pos, heading: ship.heading, speed: ship.rowing ? ship.speed * 0.6 : ship.speed, max: 11 }, Math.min(1, 0.25 + stage.light * 0.9));
  const lifeCtx = { light: Math.min(1, 0.25 + stage.light * 0.9), freeze: glimpse.k > 0.3 ? 0 : null, ship, dread: rt.dread, wave: stage.wave, audio, wind: windNow, stage, tod, faction: sec.faction.id, sched: { wd: weekday(), hour: state.time * 24, dayN: state.dayN, dread: rt.dread } };
  if (live) { state.stats.dist += ship.speed * dt; if (ship.rowing) state.stats.rowed = (state.stats.rowed || 0) + ship.speed * dt; }
  { const cg = objectives.current; if (cg && cg.id === 'calm' && state.goals.started) weather.calmHold = Math.max(weather.calmHold, 8); }   // the calm lasts until you have rowed and fished
  windfx.update(vdt, rt.animT, windNow.dir, windNow.strength, ship.pos, tod.night, Math.min(1, weather.rain * 1.5));
  fishing.update(dt, waveT, { wave: stage.wave, dread: rt.dread, night: tod.night, env: fishEnv() });
  setDieWear(clamp(state.dayN / 12 + rt.dread * 0.6, 0, 1));
  combat.update(dt, waveT, { ship, traffic, wave: stage.wave, onHitEnemy, onHitPlayer: hurtPlayer });
  { const pork = life.meal(state) === 'pork'; if (live && rt.tNow - rt.lastHit > 12 && (weather.storm < 0.3 || pork) && state.hp < ship.mods.maxHp) state.hp = Math.min(ship.mods.maxHp, state.hp + dt * (pork ? 2 : 1)); }   // no mending in a storm
  { // while Perrin's letter is being read about, Mara stays on screen even ashore or in the log: she is the tutorial
    const st = state.story, on = st.riddleLine === 'wait' || st.noteLine === 'wait' || (st.mateTail && objectives.mate.busy);
    if (!(st.riddleLine === 'wait' || st.noteLine === 'wait') && !objectives.mate.busy) st.mateTail = false; else if (st.riddleLine === 'done' || st.noteLine === 'done') st.mateTail = true;
    objectives.mate.pin = st.riddleLine === 'wait' || st.noteLine === 'wait';
    document.body.classList.toggle('onb-mate', !!on && !!rt.modal);
    if (rt.modal && on) objectives.mate.update(rawDt);
  }
  objectives.update(dt, rt.glitchT > 0 ? rt.preGlitch : rt.dread);   // the hut's flash is not real water: Mara does not react to it
  if (live && !state.passenger && rt.dread > 0.2 && rt.dread < 0.7 && ship.speed > 1) {   // Mara muses on quiet stretches
    rt.musingT -= dt;
    if (rt.musingT <= 0 && !objectives.mate.busy && !eventQuiet()) { rt.musingT = 240 + Math.random() * 200; const m = MUSINGS.filter((x) => !state.hints['muse:' + x]); if (m.length) { const l = m[Math.floor(Math.random() * m.length)]; state.hints['muse:' + l] = true; objectives.mate.say(l); } }
  }
  if (live && state.passenger && ship.speed > 1) passengerTalk(state.passenger, dt, { mate: objectives.mate, world, ship, state, dread: rt.dread, storm: weather.storm });
  if (live) {
    if (tod.night > 0.35 || tod.twilight > 0.6) objectives.remark('dusk');
    if (weather.storm > 0.4) objectives.remark('storm'); else if (weather.rain > 0.4) objectives.remark('rain'); else if (weather.fog > 0.5) objectives.remark('fog');
    for (const [k, v] of [['stage2', 0.25], ['stage3', 0.5], ['stage4', 0.75], ['stage5', 0.95]]) if (rt.dread >= v) objectives.remark(k === 'stage5' && (state.story.maraMem || 0) >= 3 ? 'stage5b' : k, rt.dread);
    if (traffic.ships.some((x) => x.hostile && x.engaged)) objectives.remark('raider');
  }
  fauna.quiet = !laterOK();
  fauna.update(vdt, waveT, lifeCtx);
  threads.update(vdt, ship, window.__BUILD !== 'demo' && laterOK(), waveT, lifeCtx.wave, (txt) => { if (!objectives.mate.busy && !eventQuiet()) objectives.mate.say(txt); });
  for (const k of ['_pet', '_pet2']) if (window.__game[k]) window.__game[k].update(vdt);
  for (const c of Object.values(companions)) { c.m.g.visible = c.fly > 0 || rt.dread < 0.6; if (c.m.g.visible) c.update(vdt); }
  traffic.update(dt, waveT, lifeCtx);
  sea.update(dt, waveT, lifeCtx);

  // ---- global shader state
  scene.fog.color.copy(stage.fog); scene.fog.near = stage.fogNear; scene.fog.far = stage.fogFar;
  if (rt.edge && rt.edge.t < 37) { scene.fog.near = Math.max(scene.fog.near, 90); scene.fog.far = Math.max(scene.fog.far, 420); }   // the Edge: the ship stays clear while the far shapes stand sharp
  mistMat.color.copy(stage.fog).lerp(WHITE_MIST, 0.25);   // the sea mist round the foot of deep places
  U.uDread.value = rt.dread; U.uTime.value = waveT;
  if (window.__waterLock) { const wl = window.__waterLock; if (wl.t != null) U.uTime.value = Math.floor(wl.t * 12) / 12; if (wl.rough != null) { rt.waterRough = wl.rough; U.uRough.value = WATER.rough = wl.rough; } }   // dev: water previews (docs/concept/water)
  U.uLight.value = stage.light; U.uWave.value = stage.wave; U.uWindDir.value.set(Math.sin(wind.dir), -Math.cos(wind.dir)); U.uRain.value = weather.rain || 0;   // (this sat inside the comment above since 21 Oct: night light and wave height never reached the shaders)
  U.uDeep.value.copy(stage.deep); U.uShallow.value.copy(stage.shallow);
  if (threads.worldTint > 0.001) { U.uDeep.value.lerp(COLOUR_DEEP, threads.worldTint); U.uShallow.value.lerp(COLOUR_SHALLOW, threads.worldTint * 0.8); scene.fog.color.lerp(COLOUR_SHALLOW, threads.worldTint * 0.25); }   // a sea that is slowly losing a hue
  U.uSnap.value.set(post.internal.w * 0.5 * stage.snap, post.internal.h * 0.5 * stage.snap);
  mats.shallow.color.copy(stage.shallow).lerp(new THREE.Color(1, 1, 1), 0.25);
  mats.foam.color.set(0xffffff).lerp(stage.skyHorizon, 0.25);
  mats.foam.opacity = 0.55 + 0.25 * Math.sin(rt.animT * 1.8);
  mats.beam.color.set('#ffe080').lerp(new THREE.Color('#ff50d0'), smoothstep(0.5, 0.8, rt.dread));
  mats.beam.opacity = 0.1 + 0.3 * tod.night;
  mats.wake.color.set(0xffffff).lerp(new THREE.Color(0.35, 1, 0.9), tod.night * 0.9).lerp(new THREE.Color(1, 0.4, 0.95), tod.night * smoothstep(0.55, 0.9, rt.dread) * 0.8);
  sky.update(window.__waterLock ? 0 : dt, camera, stage, wind.dir, tod, { sun2: abyss.sun2, storm: weather.heavy || 0, stormWall: Math.max(weather.frontAhead || 0, (weather.stormAhead || 0) * 0.9, (weather.storm || 0) * 0.7) });
  if (NIGHT_SET.view === 0) sky.moon.visible = false;   // a new moon: no moon in the sky
  ocean.material.opacity = 1 - 0.7 * abyss.seeThrough;
  if (abyss.seeThrough > 0) { U.uDeep.value.lerp(GLASS, 0.8 * abyss.seeThrough); U.uShallow.value.lerp(GLASS, 0.7 * abyss.seeThrough); }
  ocean.update(camera.position.x, camera.position.z);

  // ---- camera
  updateCamera(rawDt, live, ashore);

  // ---- discovery / interaction / dig
  // first sight of an island you have never charted: a moment of "land ho!"
  if (live && rt.tNow - rt.lastSighting > 1) {
    rt.lastSighting = rt.tNow;
    const seen = world.nearest(ship.pos.x, ship.pos.z, 150);
    if (seen && !state.discovered[seen.desc.id] && !sighted.has(seen.desc.id)) { sighted.add(seen.desc.id); landHo(seen.desc); }
  }
  if (live && laterOK() && rt.tNow - rt.lhT > 0.8) { rt.lhT = rt.tNow; lighthouseTidbit(); }
  const nearAny = world.nearest(ship.pos.x, ship.pos.z, 30);
  if (nearAny) {
    if (live) discover(nearAny);
    rt.lastNear = nearAny;
  } else rt.lastNear = null;
  const placeTxt = rt.lastNear ? rt.lastNear.desc.name : sec.name;
  const placeOut = abyss.hud('place', placeTxt);
  if (placeOut !== rt.placeShown) { rt.placeShown = placeOut; $('placeline').innerHTML = ''; const sp = document.createElement('span'); sp.textContent = placeOut; $('placeline').appendChild(sp); $('placeline').style.setProperty('--pxedge', rt.lastNear ? '#120c1c' : sec.faction.color); }

  const tgt = getInteract();
  if (rt.dig && live) {
    if (!tgt || tgt.key !== rt.dig.key) { rt.dig = null; digGame.cancel(); toast('The crew came back empty-handed.'); }
    else if (rt.dig.mini) digGame.update(dt);
    else {
      rt.dig.t += dt;
      promptFill.style.width = `${Math.min(100, (rt.dig.t / rt.dig.need) * 100)}%`;
      if (rt.dig.t >= rt.dig.need) { const done = rt.dig.done; rt.dig = null; done(); }
    }
  }
  if (tgt && live) {
    promptEl.style.display = 'block';
    if (rt.dig) { promptTxt.textContent = rt.dig.label || 'Digging...'; promptBar.style.display = rt.dig.mini ? 'none' : 'block'; }
    else if (rt.digFix > rt.tNow && tgt.kind === 'treasure') { promptBar.style.display = 'none'; promptTxt.textContent = rt.digFixWhy === 'tide' ? 'The tide is in. Wait for it to go out...' : rt.digFixWhy === 'mud' ? 'Scraping the shovels clean...' : 'Fetching the spare shovel...'; }
    else {
      promptBar.style.display = 'none';
      promptTxt.textContent = tgt.kind === 'thread' ? tgt.th.prompt : tgt.kind === 'spring' ? '[E] Look into the water' : tgt.kind === 'cave' ? '[E] Look into the cave' : tgt.kind === 'sighting' ? `[E] ${tgt.s.label}` : tgt.kind === 'harbourfar' ? 'Sail to the pier to go ashore' : tgt.kind === 'hut' ? '[E] Knock on the dark hut' : tgt.kind === 'harbour' ? `[E] Visit ${tgt.isl.desc.name}`
        : tgt.kind === 'treasure' ? (tgt.isl.dug ? 'Already plundered' : !state.riddles[tgt.isl.desc.id] ? '[E] Study the ancient arch inscription' : '[E] Dig on this shore')
        : tgt.kind === 'landmark' ? `[E] Go ashore on ${tgt.isl.desc.name}`
        : tgt.kind === 'secret' ? (ship.speed > 0.6 ? '' : `[E] ${tgt.sc.label}`)
        : tgt.kind === 'patch' ? `[E] Patch the torn sail (${state.patchKits} ${state.patchKits === 1 ? 'kit' : 'kits'})`
        : tgt.kind === 'fruit' ? (state.harvest[tgt.isl.desc.id] != null && state.harvest[tgt.isl.desc.id] >= state.dayN ? 'Picked clean for today' : `[E] Pick ${plural(fruitName(fruitOf(tgt.isl.desc), tgt.isl.desc.dread), 2)}`)
        : tgt.kind === 'ship' ? (tgt.s.mode === 'derelict' ? `[E] Board the drifting ${KINDS[tgt.s.kind].label}` : tgt.s.mode === 'ghost' ? '[E] Hail the pale ship' : `[E] Hail the ${tgt.s.name}`)
        : '[E] Salvage the wreck';
      if (tgt.kind === 'secret' && ship.speed > 0.6) promptEl.style.display = 'none';
      if (rt.heave) promptTxt.textContent = 'Dropping anchor...';
    }
  } else promptEl.style.display = 'none';

  // ---- HUD
  goldEl.textContent = abyss.hud('gold', String(state.gold));
  $('clocktxt').textContent = abyss.hud('clock', tod.clock);
  $('abyssTag').style.display = abyss.solo ? 'block' : 'none';
  if (abyss.solo) $('abyssTag').textContent = `Testing: ${EFFECTS.find((f) => f.id === abyss.solo).name}  \u00b7  0 = stop`;
  updateTracker();
  mixer.update();
  if (studio) studio.update(rawDt, soundSituation());
  $('clockicon').className = `ico ${tod.sunElev > 0 ? 'sun' : 'moon'}`;
  $('sailfill').style.width = `${Math.round(ship.trim * 100)}%`;
  $('sailbar').classList.toggle('torn', state.sailsTorn); $('sailbar').classList.toggle('strain', rt.sailStrain > SAIL_LIMIT * 0.35);
  drawCompass(wind, ship.heading);
  onbTick();
  if (onbAll() && rt.tNow > 18 && rt.helpMode !== 'full') helpEl.style.opacity = '0';
  if (rt.modal === 'harbour') { $('hbGold').textContent = state.gold; }
  if (rt.modal === 'hut') hut.update(rawDt);
  if (rt.modal === 'ship') { $('shGold').textContent = state.gold; }
  if (debugEl.style.display === 'block') debugEl.textContent = `tris ${renderer.info.render.triangles} calls ${renderer.info.render.calls}  dread ${rt.dread.toFixed(2)} stage ${stage.index + 1} ${rt.forced !== null ? '(forced)' : '(auto)'}  time ${tod.clock}  pos ${ship.pos.x | 0},${ship.pos.z | 0}  spd ${ship.speed.toFixed(1)}  islands ${world.islands.size}`;

  { // the hull is five planks: each one is a fifth of its strength; a damaged plank drains, so every hit shows
    const frac = Math.max(0, state.hp / ship.mods.maxHp), key = Math.round(frac * 100);
    if (key !== rt.hullShown) {
      const hit = rt.hullShown > key; rt.hullShown = key;
      $('hptxt').innerHTML = `<span class="hp5${hit ? ' hurt' : ''}">${[0, 1, 2, 3, 4].map((i) => { const f = clamp(frac * 5 - i, 0, 1); return f >= 0.999 ? '<i class="on"></i>' : f <= 0.001 ? '<i class="off"></i>' : `<i class="part" style="--f:${Math.round(f * 100)}%"></i>`; }).join('')}</span>`;
      $('hpfill').parentNode.style.display = 'none';
    }
  }
  $('ammotxt').textContent = `\u25cf ${state.ammo}`;
  document.body.classList.toggle('nooil', !oilOn());
  if (oilOn() && rt.started && !rt.modal) nameOnce('oil', $('oilrow'), 'Lamp oil');
  { const f = state.oil / oilCap(state.upgrades); $('oilfill').style.width = `${Math.round(f * 100)}%`; $('oilrow').classList.toggle('low', f < 0.25); }
  { const can = unlocked(state, 'cannons'); traffic.noRaiders = !can; document.body.classList.toggle('nocannons', !can); if (can && rt.started && !rt.modal) nameOnce('ammo', $('ammotxt'), 'Cannonballs'); }
  $('reloadfill').style.width = `${100 - Math.min(100, (combat.reload / ship.mods.reload) * 100)}%`;
  const tgtE = combat.target(ship, traffic, 110);
  const eb = $('ebar');
  if (tgtE && live) {
    _v.set(tgtE.x, 5 * KINDS[tgtE.kind].scale + 3, tgtE.z).project(camera);
    if (_v.z < 1) { eb.style.display = 'block'; eb.style.left = `${(_v.x * 0.5 + 0.5) * window.innerWidth}px`; eb.style.top = `${(-_v.y * 0.5 + 0.5) * window.innerHeight}px`; $('ename').textContent = tgtE.name; $('efill').style.width = `${Math.max(0, (tgtE.hp / tgtE.maxHp) * 100)}%`; } else eb.style.display = 'none';
  } else eb.style.display = 'none';
  audio.setLoop('coast', coastLevel(ashore, tod.night));
  audio.setLoop('forest', forestLevel(ashore) * 0.3);   // ashore on a forest island: very quietly under everything
  if (ashore) audio.setLoop('gulls', gullLevel(tod.night) * 0.3 * 0.9);   // moored: the colony is a background murmur, not a racket
  audio.hutUpdate(rawDt, hutMusicTarget());   // the hut's theme, first visit only
  audio.tavernUpdate(rawDt, rt.modal === 'pig' || (rt.modal === 'harbour' && rt.hbTab === 'tavern') ? 1 : ashore ? 0.35 : 0);   // tavern music through the wall
  if (live) {
    audio.update(dt, { dread: rt.dread, speed: ship.speed / 11, night: tod.night, freecays: freeCaysNow(), players: window.__BUILD === 'demo' ? null : playersEar(ship), lull: rt.lullK || 0, wind: wind.strength, rain: weather.rain, storm: weather.storm, gulls: gullLevel(tod.night),
      quests: state.goals.i, open: openSea(), battle: inBattle() });
    const hour = Math.floor(state.time * 24);
    if (hour !== rt.lastHour) { rt.lastHour = hour; if (world.nearest(ship.pos.x, ship.pos.z, 80, ['harbour'])) audio.play('bell', { vol: 0.6 }); }
  }

  // ---- save (every few seconds, and at once when a quest is finished or you dock; those two also show the little ship)
  if (rt.tNow - rt.lastSave > 4) saveNow();

  // ---- render
  const pu = post.material.uniforms;
  pu.uDread.value = rt.dread; pu.uTime.value = rt.tNow; pu.uSat.value = stage.sat; pu.uVig.value = stage.vig;
  pu.uDither.value = stage.dither; pu.uTint.value.copy(stage.tint);
  if (rt.modal === 'local' && localGames.view) localGames.render(post); else post.render(scene, camera);   // a tavern game shows its own little 3D scene
  requestAnimationFrame(frame);
}

// handy for tests / screenshots
$('oilrow').addEventListener('pointerdown', (e) => { if (rt.started && !rt.modal) { toggleLamp(); e.preventDefault(); } });
$('oilrow').classList.toggle('off', !!state.story.lampOff);
installGamepad(() => toast('Controller connected: stick to sail, A to interact, Y for the log, Start to pause.', false, 6000));
window.__game = { secrets, tideAt: () => tideAt(), lostState: () => ({ lostK: rt.lostK, gateLost: rt.gateLost, placesLost: places.lost, heading: ship.heading, trim: ship.trim }), places, seaplay, glimpse, fishing, sails: () => ({ torn: state.sailsTorn, kits: state.patchKits, strain: rt.sailStrain }), oilState: () => ({ oil: state.oil, lampOut: rt.lampOut }),
  readArch, partnerOf, maraMood, windfx, logbook,
  life, localGames, openHarbour(id, tab = 'board') { const isl = [...world.islands.values()].find((i) => i.desc.id === id); if (!isl) return false; closeModal(true); rt.harbourIsl = isl; rt.hbTab = tab; frameVillage(isl.desc); openModal('harbour'); return true; }, renderHarbour: () => renderHarbour(),
  audio,
  objectives, perrinNote, gateRadius: () => gateRadius(state, tideFalls()), trackTarget: () => trackTarget(), digGame,
  openCard, openTable, edge: () => startEdge(ship, $('fade')), sighting, spawnSight: (id) => { const c = (SIGHTS[id] && drawCard(0, [], { [id]: 1 })); return c && sighting.spawn(c, ship, world); },
  weather,
  setDread(v) { rt.forced = v; rt.dread = v; },
  get dread() { return rt.dread; },
  setTime(t) { state.time = t; },
  setCam(p, z) { if (p !== undefined) { rt.pitch = rt.pitchT = p; } if (z !== undefined) { rt.zoom = rt.zoomT = z; } },
  setOverride(o) { rt.camOverride = o; },
  /** concept (dev): cut the sea off north of z (the Edge concept); null puts it back */
  clipSea(z) { renderer.localClippingEnabled = z != null; ocean.material.clippingPlanes = z != null ? [new THREE.Plane(new THREE.Vector3(0, 0, 1), -z)] : null; ocean.material.needsUpdate = true; },
  setAshoreCam: (pos, look) => { rt.ashoreCam = { pos: new THREE.Vector3(...pos), look: new THREE.Vector3(...look) }; },   // dev: aim the harbour camera (village screenshots)
  get companions() { return companions; }, petOffer, takePet, caves, openCave, threads, addMark,
  /** concept sketch: put a cat or a gull on deck (dev only) */
  companion(kind = 'cat', slot = '_pet') { if (this[slot]) ship.root.remove(this[slot].m.g); this[slot] = kind ? new Companion(ship, kind) : null; return !!this[slot]; },
  teleport(x, z, h) { ship.pos.set(x, 0, z); ship.heading = h; rt.camHeading = h; ship.vel = null; },
  /** biome concept scenes (dev): kind 'coral' | 'rain' | 'sunken' */
  async biome(kind, x, z) {   // concepts.js is imported statically (the Edge uses it): a dynamic import here would split the bundle
    if (this._biome) scene.remove(this._biome); this._biome = buildBiome(scene, kind, x, z); return true; },
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
rt.newVoyage = false;   // New voyage reloads straight into the game, no title in between
try { rt.newVoyage = sessionStorage.getItem('hoist-new') === '1'; sessionStorage.removeItem('hoist-new'); } catch (e) { /* storage blocked */ }
// New voyage reloads the page, and a reload always leaves fullscreen; the browser only allows going back in on a key press
// or click, so the first one after the reload does it
try {
  if (sessionStorage.getItem('hoist-fs') === '1') {
    sessionStorage.removeItem('hoist-fs');
    const back = () => { removeEventListener('pointerdown', back, true); removeEventListener('keydown', back, true); if (fsOk && !fsEl()) toggleFullscreen(); };
    addEventListener('pointerdown', back, true); addEventListener('keydown', back, true);
  }
} catch (e) { /* storage blocked */ }
if (params.get('autostart') || rt.newVoyage) begin(); else startTitle();
frame();
