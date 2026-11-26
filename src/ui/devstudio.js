// The Dev Studio (dev builds only: ?dev=1 or the dev single file; never the demo or the playtest build, RULES 29). F10 or the DEV
// tab opens it. A panel to go through the whole game back and forth: gold and goods, time and sky, the goals, places, clues and
// threads, every scene and ending, and snapshots of the whole voyage. It pauses nothing by itself.
// Every scene started here first copies the voyage aside (the "before" copy) and pauses the autosave; Undo puts the copy back in
// place, Leave ends the scene and keeps what changed. A loaded snapshot plays in a sandbox (core/config.js DEV_LIVE_KEY): the real
// save is never written unless "Copy into the real save" is pressed. Nothing here is player-facing text.
import { DEV, DEMO, PLAYTEST, store, session, REAL_SAVE_KEY, DEV_LIVE_KEY } from '../core/config.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { MAIN_GOALS, SIDE_GOALS, gateRadius } from '../objectives.js';
import { UPGRADES, MAX_LEVEL } from '../upgrades.js';
import { oilCap } from '../oil.js';
import { FISH } from '../fishing.js';
import { FRUIT_ORDER } from '../fruit.js';
import { lootFor } from '../lore.js';
import { WEEK, weekday, lowWater, fullMoon } from '../systems/calendar.js';
import { stageOf, dreadAtDistance } from '../palette.js';
import { regionAt } from '../regions.js';
import { LANDMARKS, LM } from '../landmarks.js';
import { shoreR, hasLighthouse } from '../world.js';
import { CLUES, markSeen, levels } from '../clues.js';
import { THREAD_IDS } from '../marks.js';
import { LOST_CARDS } from '../systems/lostsailors.js';
import { ENDINGS } from '../table.js';
import { gameOver, startSeat, endgameReset, onEnding, TABLE_KEY, UNSEEN_AFTER } from '../systems/endgame.js';
import { leaveEdge } from '../systems/edge.js';
import { CAVES } from '../caves.js';
import { NIGHT_MODES } from '../daynight.js';
import { toast } from './dom.js';
import { spawnCrew } from '../systems/raiders.js';

const SLOTS_KEY = 'pocket-pirates-dev-slots-v1', UI_KEY = 'pocket-pirates-dev-studio-ui', NSLOT = 5;
const ss = { get: (k) => { try { return sessionStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v); } catch (e) { /* blocked */ } } };
const STG = ['Fair', 'Grey', 'Wrong', 'Deep', 'Abyss'];
const WEATHER = { Clear: { cloud: 0, rain: 0, storm: 0, fog: 0 }, Cloud: { cloud: 0.85, rain: 0, storm: 0, fog: 0 }, Rain: { cloud: 0.8, rain: 0.7, storm: 0, fog: 0.1 },
  Storm: { cloud: 1, rain: 1, storm: 0.9, fog: 0 }, Fog: { cloud: 0.4, rain: 0, storm: 0, fog: 0.95 }, Auto: null };
const ROLL = { sleep: 20, dreams: 14, rises: 4 };   // the face a throw ending is shown with
const SETS = ['dug', 'collected', 'owned'];
const clone = (o) => JSON.parse(JSON.stringify(o));
const hhmm = (t) => { const h = (((t % 1) + 1) % 1) * 24; return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`; };

let gm = null, X = null, el = null, before = null, beforeForced = null, harbours = null;

// ---------------------------------------------------------------- the voyage as data: copy aside, put back in place
const capture = () => clone(X.saveData(true));
/** put a saved voyage back into the running game without a reload (same sea): every field, the story whole, the ship where it was */
function restore(data) {
  if (!data) return;
  data = clone(data);
  const dugWas = new Set(state.dug);
  for (const [k, v] of Object.entries(data)) {
    if (k === 'pos' || k === 'windT' || k === 'seed') continue;
    if (SETS.includes(k)) state[k] = new Set(v || []);
    else if (k === 'story') { for (const s of Object.keys(state.story)) delete state.story[s]; Object.assign(state.story, v || {}); }
    else state[k] = v;
  }
  for (const id of new Set([...dugWas, ...state.dug])) { const isl = gm.world.islands.get(id); if (isl && isl.setDug && dugWas.has(id) !== state.dug.has(id)) isl.setDug(state.dug.has(id)); }
  gm.refreshMods();
  if (data.pos) go(data.pos.x, data.pos.z, data.pos.h, false);
}

// ---------------------------------------------------------------- scenes: start (copy aside first), leave, undo
function scene(fn) {
  return () => {
    if (!before) { before = capture(); beforeForced = rt.forced; }
    session.noSave = true;   // nothing a scene does reaches the save until it is left
    if (rt.modal) gm.closeModal(true);
    fn(); render();
  };
}
/** end whatever runs now: the Edge, the waking, the diver, a sign at sea, the cards, the endings' after-effects */
function stopAll() {
  if (rt.modal) gm.closeModal(true);
  leaveEdge(gm.ship, gm.world); rt.edgeAfter = null; rt.edgeHush = 0;
  const a = gm.abyss;
  if (a.ending) { a.ending = null; a.overlay.className = ''; a.overlay.innerHTML = ''; document.body.classList.remove('awakening'); }
  a.solo = null; a.fullTime = 0;
  const g = gm.glimpse; g.t = -1; g.k = 0; g.fig.visible = false;
  gm.sighting.clear();
  endgameReset();
  const fade = document.getElementById('fade'); fade.style.background = ''; fade.style.transition = ''; fade.classList.remove('on');
  document.getElementById('demoend').classList.remove('show');
  gm.ship.speed = 0;
}
function leave() { stopAll(); before = null; session.noSave = false; toast('Dev: left the scene (changes kept)', false, 2000); render(); }
function undo() {
  stopAll();
  if (before) { restore(before); rt.forced = beforeForced; }
  before = null; session.noSave = false; toast('Dev: back to before the scene', false, 2000); render();
}

// ---------------------------------------------------------------- places
function go(x, z, h, peak = true) {
  if (rt.modal) gm.closeModal(true);
  gm.teleport(x, z, h); gm.ship.speed = 0; rt.yawT = 0;
  if (peak) state.story.peakDread = dreadAtDistance(Math.hypot(x, z));   // the dread of where she is now, not of where she was
}
/** arrive just off a shore: off the pier for a harbour, else on the side facing Tama, bow to the land */
function arrive(d, label) {
  if (!d) { toast(`Dev: ${label} not found`, false, 2500); return; }
  const th = d.dockTh !== undefined ? d.dockTh : Math.atan2(-1 - d.z, -d.x);
  let r; try { r = shoreR(d, th); } catch (e) { r = 0; }
  if (!(r > 0)) r = d.r || 15;
  const off = r + (d.dockTh !== undefined ? 24 : 28), x = d.x + Math.cos(th) * off, z = d.z + Math.sin(th) * off;
  if (el.querySelector('#dsFree').checked && Math.hypot(x, z) > gateRadius(state, true) - 20) state.story.free = true;
  go(x, z, Math.atan2(d.x - x, -(d.z - z)));
  toast(`Dev: ${label}`, false, 2000);
}
const descAt = (key) => { const [cx, cz] = key.split(',').map(Number); return gm.world.desc(cx, cz); };
function scanHarbours() {   // one harbour of each region (the nearest to Tama), and a lone Lantern keeper rock
  if (harbours) return harbours;
  const best = {}, home = descAt('0,-1');
  for (let cx = -22; cx <= 22; cx++) for (let cz = -23; cz <= 21; cz++) {
    const d = gm.world.desc(cx, cz); if (!d || d.hut) continue;
    const dist = Math.hypot(d.x - home.x, d.z - home.z);
    const kind = d.type === 'harbour' && d.region !== 'home' ? d.region : d.region === 'lantern' && d.type !== 'harbour' && !d.lm && hasLighthouse(d) ? 'keeper' : null;
    if (kind && (!best[kind] || dist < best[kind].dist)) best[kind] = { d, dist };
  }
  return (harbours = best);
}
const lmDesc = (l) => descAt(l.key) || l;
function placeList() {
  const out = [['Tama', () => descAt('0,-1')], ['The hut', () => gm.world.hutDesc]];
  for (const l of LANDMARKS) out.push([l.name, () => lmDesc(l)]);
  out.push(['The Reef stake', () => { const k = state.story.reefStake; return k ? { x: k.x, z: k.z, r: 2, id: 'stake' } : null; }]);
  return out;
}
const HARB = ['crown', 'free', 'reef', 'lantern', 'drowned', 'keeper'];
/** the harbours of each region and the keeper rock: scanned the first time the Places section is opened (2,000 cells) */
function fillHarbours() {
  const box = el.querySelector('#dsHarb'); if (box.dataset.done) return; box.dataset.done = '1';
  const H = scanHarbours();
  box.innerHTML = HARB.filter((r) => H[r]).map((r) => B(`harb:${r}`, r === 'keeper' ? `Lantern keeper rock (${H[r].d.name || H[r].d.id})` : `${r} harbour: ${H[r].d.name}`)).join('');
}

// ---------------------------------------------------------------- time and low water (no tides: systems/calendar.js lowWater)
function jumpLow() {   // the next night the sea draws back (round a new or a full moon), at 22:00
  const d0 = state.dayN, t0 = state.time;
  for (let k = 0; k < 20; k++) { state.dayN = d0 + k; state.time = 22 / 24; if (lowWater() && (k > 0 || t0 < 22 / 24)) { X.devTime(22); return; } }
  state.dayN = d0; state.time = t0;
}

// ---------------------------------------------------------------- endings and what they leave behind
function ending(id) { const n = ROLL[id]; gm.showEnding(id, n ? { n, w: 0, total: n, end: id } : null); }
function devCredits() {
  const c = document.getElementById('credits'); document.getElementById('ending').classList.remove('show'); c.classList.add('show');
  const off = (e) => { e.stopImmediatePropagation(); c.classList.remove('show'); c.removeEventListener('click', off, true); };
  c.addEventListener('click', off, true);
}
/** "Go back to the table" without the reload: the voyage as it was on arriving (or as it is), the die remembering its face */
function backToTable() {
  const st = state.story, face = (st.ending && st.ending.face) || ROLL.rises, wasRises = st.over === 'rises' || (st.ending && st.ending.id === 'rises');
  stopAll();
  const snap = store.get(TABLE_KEY); if (snap) restore(snap);
  delete state.story.over; delete state.story.ending; delete state.story.againSaid;
  if (wasRises) state.story.again = { n: face };
  arrive(lmDesc(LM.table), 'the Table');
  setTimeout(() => gm.openTable(), 300);
}
function startSeatAt(from) { state.story.ending = { id: 'sit', day: state.dayN, n: null }; onEnding('sit'); startSeat(devCredits, from); }

// ---------------------------------------------------------------- snapshots
const slots = () => { const s = store.get(SLOTS_KEY); return Array.isArray(s) ? s : []; };
function saveSlot(i) {
  const all = slots(), name = (el.querySelector(`#dsName${i}`).value || `Slot ${i + 1}`).slice(0, 40);
  const g = MAIN_GOALS[state.goals.i];
  all[i] = { name, at: new Date().toISOString().slice(0, 16).replace('T', ' '), info: `${g ? g.id : 'done'} · ${hhmm(state.time)} ${WEEK[weekday()]}`, data: capture() };
  store.set(SLOTS_KEY, all); toast(`Dev: saved "${name}"`, false, 2000); render();
}
function reloadInto(data) {   // the sandbox: this tab now plays `data` and saves beside the real save
  store.set(DEV_LIVE_KEY, data); ss.set('hoist-dev-sandbox', '1'); ss.set('hoist-new', '1');
  session.noSave = true; location.reload();
}
function loadSlot(i) { const s = slots()[i]; if (s && s.data) reloadInto(s.data); }
function delSlot(i) { const all = slots(); all[i] = null; store.set(SLOTS_KEY, all); render(); }
function backToReal() { ss.set('hoist-dev-sandbox', null); ss.set('hoist-new', '1'); session.noSave = true; location.reload(); }
function copyToReal() {
  if (!confirm('Write this voyage over the real save?')) return;
  store.set(REAL_SAVE_KEY, capture()); toast('Dev: the real save now holds this voyage', false, 3000);
}

// ---------------------------------------------------------------- the panel
const B = (act, label, title = '') => `<button data-a="${act}"${title ? ` title="${title}"` : ''}>${label}</button>`;
function html() {
  const up = UPGRADES.map((u) => `<div class="dsrow"><span>${u.name}</span>${B(`up:${u.id}:-1`, '-')}<b class="dsv" data-v="up:${u.id}"></b>${B(`up:${u.id}:1`, '+')}</div>`).join('');
  const goals = MAIN_GOALS.map((g, i) => `<option value="${i}">${i + 1}. ${g.id}: ${g.title}</option>`).join('') + `<option value="${MAIN_GOALS.length}">(all done)</option>`;
  const side = SIDE_GOALS.map((s) => `<label class="dschk"><input type="checkbox" data-side="${s.id}"> ${s.title}</label>`).join('');
  const places = placeList().map(([n], i) => B(`place:${i}`, n)).join('');
  const clues = CLUES.map((c) => `<label class="dschk dsclue" title="${c.line.replace(/"/g, '&quot;')}"><input type="checkbox" data-clue="${c.id}"> ${c.id} <small>${c.region}</small></label>`).join('');
  const caves = Object.keys(CAVES).map((k) => `<option value="${k}">${CAVES[k].name || k}</option>`).join('');
  const endings = Object.keys(ENDINGS).map((id) => B(`end:${id}`, ENDINGS[id].title)).join('');
  const slotRows = Array.from({ length: NSLOT }, (_, i) => `<div class="dsrow dsslot"><input id="dsName${i}" placeholder="Slot ${i + 1}" maxlength="40">${B(`save:${i}`, 'Save')}${B(`load:${i}`, 'Load')}${B(`del:${i}`, 'x', 'forget this slot')}<small data-slot="${i}"></small></div>`).join('');
  const sec = (id, title, body) => `<details data-sec="${id}"><summary>${title}</summary><div class="dsbody">${body}</div></details>`;
  return `<div class="dshead"><b>DEV STUDIO</b> <small>F10</small>${B('close', 'x', 'close (F10)')}
    <pre class="dsread"></pre><div class="dsscene"><span class="dsst"></span>${B('leave', 'Leave', 'end the scene, keep what changed')}${B('undo', 'Undo', 'end the scene and put the voyage back as it was before it')}</div></div>
  <div class="dslist">
  ${sec('money', 'Money and goods', `<div class="dsrow">${B('gold:10', '+10')}${B('gold:100', '+100')}${B('gold:1000', '+1000')}<input id="dsGold" type="number" min="0" step="1">${B('goldset', 'Set')}</div>
    <div class="dsrow">${B('oil', 'Fill oil')}${B('ammo', '+10 balls')}${B('hull', 'Repair hull')}${B('sails', 'Mend sails')}</div>
    <div class="dsrow">Raider ${B('raider:schooner', 'Spawn schooner', 'a Reef raider 70 off the beam, coming for you')}${B('raider:galleon', 'Spawn galleon')}${B('chain', '+10 chain shot')}</div>
    <div class="dsrow">Crew ${B('crew:wolves', 'Red Widow')}${B('crew:tollmen', 'The Toll')}${B('crew:beggars', 'The Patience')}${B('crew:collectors', 'Quiet Hand')}</div>
    ${up}
    <div class="dsrow"><select id="dsFish">${FISH.map((f) => `<option value="${f.id}">${f.name}</option>`).join('')}</select>${B('fish', 'Fish to hold')}</div>
    <div class="dsrow"><select id="dsFruit">${FRUIT_ORDER.map((f) => `<option>${f}</option>`).join('')}</select>${B('fruit', 'Fruit to hold')}${B('loot', 'A treasure')}</div>`)}
  ${sec('time', 'Time and sky', `<div class="dsrow"><input id="dsHour" type="range" min="0" max="23.75" step="0.25"><b class="dsv" data-v="hour"></b></div>
    <div class="dsrow">${B('day:-1', '&lt; day')}<b class="dsv" data-v="day"></b>${B('day:1', 'day &gt;')}</div>
    <div class="dsrow">Water ${B('low:1', 'Next low water night')}</div>
    <div class="dsrow">${Object.keys(WEATHER).map((w) => B(`wx:${w}`, w)).join('')}</div>
    <div class="dsrow">${B('calm:1', 'Dead calm')}${B('calm:0', 'Wind back')}</div>
    <div class="dsrow">Dread <input id="dsDread" type="range" min="0" max="1" step="0.01">${B('dread:auto', 'auto')}<b class="dsv" data-v="dread"></b></div>
    <div class="dsrow">Night ${B('moon', 'cycle')}<b class="dsv" data-v="moon"></b></div>`)}
  ${sec('goals', 'Missions', `<div class="dsrow">${B('goal:-1', '&lt;')}<select id="dsGoal">${goals}</select>${B('goal:1', '&gt;')}</div>
    <div class="dsrow">${B('finish', 'Finish current')}<b class="dsv" data-v="goal"></b></div>
    <div class="dsrow"><label class="dschk"><input type="checkbox" id="dsWall"> chapter fog wall</label><b class="dsv" data-v="wall"></b></div>
    <div class="dsrow">${B('throw', 'Mark first throw done')}${B('unthrow', 'Undo the throws')}</div>
    <div class="dssub">Side goals</div><div class="dsgrid">${side}</div>`)}
  ${sec('places', 'Places', `<label class="dschk"><input type="checkbox" id="dsFree" checked> lift the fog wall when going past it</label><div class="dsgrid">${places}</div><div class="dssub">One harbour of each region</div><div class="dsgrid" id="dsHarb"></div>`)}
  ${sec('clues', 'Clues and threads', `<div class="dsrow"><b class="dsv" data-v="levels"></b></div>
    <div class="dsrow">${B('clues:all', 'All seen')}${B('clues:none', 'None seen')}</div><div class="dsgrid">${clues}</div>
    <div class="dssub">Threads</div><div class="dsrow"><select id="dsThread">${THREAD_IDS.map((t) => `<option>${t}</option>`).join('')}</select>${B('wake', 'Wake')}${B('sleep', 'Sleep')}${B('thgo', 'Go to it')}</div>
    <div class="dsrow"><b class="dsv" data-v="threads"></b></div>`)}
  ${sec('scenes', 'Scenes and sequences', `<div class="dssub">At sea</div><div class="dsgrid">${B('edge', 'The Edge')}${B('wakeup', 'The waking')}${B('diver', 'The diver')}
      ${Object.keys(LOST_CARDS).map((k) => B(`lost:${k}`, LOST_CARDS[k].title)).join('')}${B('hut', 'The hut card')}${B('race', 'Sunday race (13:50 off Tama)')}</div>
    <div class="dsrow"><select id="dsCave">${caves}</select>${B('cave', 'Open scene')}</div>
    <div class="dssub">The Table and the endings</div><div class="dsgrid">${B('table', 'Arrive at the Table')}${endings}</div>
    <div class="dssub">After the endings</div><div class="dsgrid">${B('rises:wake', 'Rises: the last waking')}${B('rises:over', 'Rises: game over')}${B('rises:back', 'Back to the table')}
      ${B('guitar', 'The guitar errand')}${B('unseen:soon', 'Unseen: the turn soon')}${B('unseen:table', 'Unseen: the table ahead')}
      ${B('seat:book', 'Seat: the book')}${B('seat:newcomer', 'Seat: the newcomer')}${B('seat:pan', 'Seat: the last look')}${B('credits', 'Credits')}</div>`)}
  ${sec('snap', 'Snapshots', `<div class="dsrow"><span class="dsv" data-v="sandbox"></span></div>${slotRows}
    <div class="dsrow">${B('fresh', 'Reset to a fresh voyage')}${B('real', 'Back to the real save')}${B('copyreal', 'Copy into the real save')}</div>`)}
  </div>`;
}
const CSS = `
#devstudio { position: fixed; right: 12px; top: 12px; bottom: 12px; width: min(500px, 94vw); z-index: calc(var(--z-dev) + 1); display: none; flex-direction: column;
  background: var(--pxmenu) 0 0 / 32px 32px; image-rendering: pixelated; color: #fff4d8; font: 16px "DotGothic16", monospace;
  box-shadow: 0 -4px 0 var(--gold-dim), 0 4px 0 var(--gold-dim), -4px 0 0 var(--gold-dim), 4px 0 0 var(--gold-dim), 8px 8px 0 rgba(0,0,0,.5); }
#devstudio.open { display: flex; }
#devstudio button, #devstudio select, #devstudio input[type=number], #devstudio input:not([type]) { font: 16px "DotGothic16", monospace; color: #fff4d8; background: var(--pxbtn) 0 0 / 32px 32px; border: none; padding: 2px 6px; cursor: pointer;
  box-shadow: 0 -2px 0 var(--gold-dim), 0 2px 0 var(--gold-dim), -2px 0 0 var(--gold-dim), 2px 0 0 var(--gold-dim); }
#devstudio select, #devstudio input[type=number], #devstudio input:not([type]) { background: #241c4c; max-width: 230px; }
#devstudio input[type=number] { width: 80px; } #devstudio input:not([type]) { width: 120px; cursor: text; }
#devstudio button:hover, #devstudio button:focus-visible { color: #ffd84a; outline: none; }
#devstudio input[type=range] { width: 160px; accent-color: #ffd84a; } #devstudio input[type=checkbox] { accent-color: #ffd84a; }
#devstudio .dshead { padding: 8px 12px; border-bottom: 4px solid #3a2a60; } #devstudio .dshead > b { color: #ffd84a; font-weight: 400; }
#devstudio .dshead > small { color: #c8b890; } #devstudio .dshead > button[data-a=close] { float: right; }
#devstudio .dsread { margin: 6px 0; font: 14px "DotGothic16", monospace; color: #c8e8ff; white-space: pre-wrap; }
#devstudio .dsscene { display: flex; gap: 8px; align-items: center; } #devstudio .dsst { flex: 1; color: #c8b890; font-size: 14px; }
#devstudio .dsscene.on .dsst { color: #ff8ad8; }
#devstudio .dslist { overflow-y: auto; padding: 4px 12px 12px; }
#devstudio summary { color: #ffd84a; margin: 10px 0 4px; cursor: pointer; list-style: none; } #devstudio summary::before { content: '+ '; } #devstudio details[open] > summary::before { content: '- '; }
#devstudio .dsrow { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin: 5px 0; } #devstudio .dsrow > span:first-child { min-width: 80px; }
#devstudio .dsv { font-weight: 400; color: #ffd84a; min-width: 28px; text-align: center; } #devstudio .dssub { color: #c8b890; margin: 8px 0 2px; }
#devstudio .dsgrid { display: flex; flex-wrap: wrap; gap: 6px; } #devstudio .dschk { display: inline-flex; gap: 4px; align-items: center; margin-right: 8px; cursor: pointer; }
#devstudio .dsclue { min-width: 140px; font-size: 14px; } #devstudio .dsclue small { color: #a898c8; }
#devstudio .dsslot small { color: #a898c8; font-size: 13px; flex-basis: 100%; }
#devtab { position: fixed; left: 0; top: 42%; z-index: var(--z-dev); font: 14px "DotGothic16", monospace; color: #fff4d8; background: #241c4c; border: 0; padding: 6px 4px;
  writing-mode: vertical-rl; cursor: pointer; box-shadow: 0 0 0 2px #3a3070; opacity: .75; } #devtab:hover { opacity: 1; color: #ffd84a; }`;

// ---------------------------------------------------------------- what each button does
function act(a) {
  const [k, p, q] = a.split(':'), ship = gm.ship, st = state.story;
  const A = {
    close: () => toggle(false), leave, undo,
    gold: () => { state.gold += +p; },
    goldset: () => { const v = parseInt(el.querySelector('#dsGold').value, 10); if (v >= 0) state.gold = v; },
    oil: () => { state.oil = oilCap(state.upgrades); },
    ammo: () => { state.ammo += 10; },
    chain: () => { st.chain = (st.chain || 0) + 10; },
    crew: () => { const s = spawnCrew(p, ship.pos.x + Math.sin(ship.heading + 1.3) * 80, ship.pos.z - Math.cos(ship.heading + 1.3) * 80); if (s) toast(`Dev: the ${s.name}`, false, 2500); if (state.ammo < 10) state.ammo = 10; },   // a raider crew (systems/raiders.js)
    raider: () => {   // a hostile Reef ship off the beam, heading for the Gull (traffic.js spawnAt); Space fires, B switches round and chain shot
      const side = ship.heading + Math.PI / 2, x = ship.pos.x + Math.sin(side) * 70, z = ship.pos.z - Math.cos(side) * 70;
      const r = gm.traffic.spawnAt(p, 'reef', x, z, Math.atan2(ship.pos.x - x, -(ship.pos.z - z)), 'live', null, true);
      if (r) { r.age = 0; toast(`Dev: a ${p} raider off the beam`, false, 2500); }
      if (state.ammo < 10) state.ammo = 10;
    },
    hull: () => { state.hp = ship.mods.maxHp; },
    sails: () => { state.sailsTorn = false; ship.setTorn(false); rt.sailStrain = 0; },
    up: () => { state.upgrades[p] = Math.max(0, Math.min(MAX_LEVEL, (state.upgrades[p] || 0) + +q)); gm.refreshMods(); },
    fish: () => { const f = FISH.find((x) => x.id === el.querySelector('#dsFish').value), kg = +(f.kg[0] + Math.random() * (f.kg[1] - f.kg[0])).toFixed(1);
      state.catch.push({ id: f.id, name: f.name, kg, value: Math.max(1, Math.round(kg * f.price)), dark: !!f.dark, zone: '', hour: state.time * 24 }); },
    fruit: () => { const f = el.querySelector('#dsFruit').value; state.fruit[f] = (state.fruit[f] || 0) + 1; },
    loot: () => { const l = lootFor(Math.random, rt.dread); state.loot.push(l); state.gold += l.value; toast(`Dev: ${l.name} (+${l.value}g)`, false, 2500); },
    day: () => { state.dayN = Math.max(0, state.dayN + +p); },
    low: () => jumpLow(),
    wx: () => { gm.weather.force = WEATHER[p] ? { ...WEATHER[p] } : null; rt.devWeather = 3; },
    calm: () => X.setCalm(+p ? 120 : 0),
    dread: () => { rt.forced = null; gm.abyss.stopTest(); },
    moon: () => { rt.nightMode = ((rt.nightMode || 0) + 1) % NIGHT_MODES.length; },
    goal: () => X.devQuest(state.goals.i + +p),
    finish: () => { if (gm.objectives.current) gm.logbook.d.skipGoal(); },
    throw: () => { const h = state.hut = state.hut || { rolls: [], wins: 0, fails: 0, lastDay: -1, visits: 0 }; if (!h.rolls.length) { h.rolls.push({ n: 12, day: state.dayN }); h.visits = Math.max(1, h.visits); } st.hutKnown = true; },
    unthrow: () => { if (state.hut) state.hut.rolls = []; },
    place: () => { const [n, f] = placeList()[+p]; arrive(f(), n); },
    harb: () => { const h = scanHarbours()[p]; arrive(h && h.d, p); },
    clues: () => { if (p === 'all') CLUES.forEach((c) => markSeen(state, c.id)); else st.seen = {}; },
    wake: () => { const id = el.querySelector('#dsThread').value; gm.threads.setup([...new Set([...(st.threads || gm.threads.setup()), id])]); },
    sleep: () => { const id = el.querySelector('#dsThread').value; gm.threads.setup((st.threads || []).filter((t) => t !== id)); },
    thgo: () => { const id = el.querySelector('#dsThread').value, s = st.tp && st.tp[id] && st.tp[id].site; if (s) go(s.x + 30, s.z, -Math.PI / 2); else toast('Dev: that thread has no place yet (wake it, then sail its region)', false, 3500); },
    edge: scene(() => { gm.edge(); }),
    wakeup: scene(() => gm.abyss.startEnding()),
    diver: scene(() => gm.glimpse.start(ship)),
    lost: scene(() => { gm.sighting.clear(); gm.spawnSight(p); }),
    hut: scene(() => gm.openModal('hut')),
    race: scene(() => { while (weekday() !== 6) state.dayN++; delete st.raceDay; rt.forced = null; arrive(descAt('0,-1'), 'Tama, for the race'); X.devTime(13 + 50 / 60); }),
    cave: scene(() => { const kind = el.querySelector('#dsCave').value; gm.openCave({ id: `cave:dev-${kind}`, kind, x: ship.pos.x, z: ship.pos.z, th: 0, r: 10 }); }),
    table: scene(() => { arrive(lmDesc(LM.table), 'the Table'); setTimeout(() => gm.openTable(true), 300); }),
    end: scene(() => ending(p)),
    rises: scene(() => {
      if (p === 'back') { backToTable(); return; }
      st.ending = { id: 'rises', day: state.dayN, n: ROLL.rises }; onEnding('rises', { n: ROLL.rises });
      if (p === 'over') gameOver('rises'); else { gm.abyss.solo = 'leviathan'; rt.forced = 1; gm.abyss.startEnding(true); }
    }),
    guitar: scene(() => { st.guitar = 'waiting'; arrive(descAt('0,-1'), "Tama's quay"); }),
    unseen: scene(() => { st.unseen = p === 'soon' ? { t: UNSEEN_AFTER - 6 } : { t: UNSEEN_AFTER + 150, book: 1, mara: 1 }; }),
    seat: scene(() => startSeatAt(p)),
    credits: scene(devCredits),
    save: () => saveSlot(+p), load: () => loadSlot(+p), del: () => delSlot(+p),
    fresh: () => reloadInto(null), real: backToReal, copyreal: copyToReal,
  };
  if (A[k]) A[k]();
  render();
}

// ---------------------------------------------------------------- the readout and the live values
function render() {
  if (!el || !el.classList.contains('open')) return;
  const ship = gm.ship, x = ship.pos.x, z = ship.pos.z, g = MAIN_GOALS[state.goals.i];
  el.querySelector('.dsread').textContent = `pos ${Math.round(x)}, ${Math.round(z)}  ${regionAt(x, z, state.seed)}  ${Math.round(Math.hypot(x, z))} out\n`
    + `dread ${rt.dread.toFixed(2)} ${STG[stageOf(rt.dread)]}${rt.forced == null ? '' : ' (forced)'}  ${lowWater() ? 'low water' : ''}\n`
    + `${hhmm(state.time)} ${WEEK[weekday()]} (day ${state.dayN})  goal ${state.goals.i + 1}/${MAIN_GOALS.length} ${g ? g.id : 'done'}  gold ${state.gold}`;
  const sc = el.querySelector('.dsscene'); sc.classList.toggle('on', !!before);
  sc.querySelector('.dsst').textContent = before ? 'A scene runs: saving is paused. Leave keeps it, Undo puts it back.' : 'No scene: changes save as usual.';
  const v = (key, t) => { const n = el.querySelector(`[data-v="${key}"]`); if (n) n.textContent = t; };
  for (const u of UPGRADES) v(`up:${u.id}`, String(state.upgrades[u.id] || 0));
  v('hour', hhmm(state.time)); v('day', WEEK[weekday()]);
  v('dread', `${rt.dread.toFixed(2)} ${rt.forced == null ? 'auto' : 'forced'}`);
  v('moon', `${NIGHT_MODES[rt.nightMode || 0]}${rt.nightMode ? '' : fullMoon() ? ' (full tonight)' : ' (new tonight)'}`);
  v('goal', g ? `${state.goals.i + 1}. ${g.title}` : 'all done');
  const free = !!state.story.free, R = gateRadius(state, true);
  v('wall', free ? 'lifted' : `at ${R === Infinity ? 'none' : Math.round(R)}`);
  v('levels', `questions ${levels(state).map((n, i) => `Q${i + 1}:${n}`).join(' ')}`);
  v('threads', `awake: ${(state.story.threads || []).join(', ') || 'none yet'}`);
  v('sandbox', session.sandbox ? 'SANDBOX: a snapshot plays here; the real save is untouched' : 'Playing the real save');
  const active = document.activeElement;
  const set = (sel, val) => { const n = el.querySelector(sel); if (n && n !== active) n.value = val; };
  set('#dsHour', String(Math.round(state.time * 96) / 4)); set('#dsDread', String(rt.dread)); set('#dsGoal', String(state.goals.i));
  if (active !== el.querySelector('#dsGold')) el.querySelector('#dsGold').placeholder = String(state.gold);
  el.querySelector('#dsWall').checked = !free;
  el.querySelectorAll('[data-side]').forEach((c) => { c.checked = !!state.goals.side[c.dataset.side]; });
  el.querySelectorAll('[data-clue]').forEach((c) => { c.checked = !!(state.story.seen && state.story.seen[c.dataset.clue] !== undefined); });
  const all = slots(); el.querySelectorAll('[data-slot]').forEach((s) => { const o = all[+s.dataset.slot]; s.textContent = o ? `${o.name}: ${o.info}, saved ${o.at}` : 'empty'; });
}

function toggle(on = !el.classList.contains('open')) {
  el.classList.toggle('open', on);
  if (on) {
    const all = slots(); for (let i = 0; i < NSLOT; i++) if (all[i]) el.querySelector(`#dsName${i}`).value = all[i].name;
    render();
  }
  try { const u = store.get(UI_KEY) || {}; u.open = on; store.set(UI_KEY, u); } catch (e) { /* storage blocked */ }
}

/** boot (main.js, dev builds only): gm is window.__game (the test hook), x the few dev functions main.js keeps (devQuest, devTime, setCalm, saveData) */
export function initDevStudio(game, x) {
  if (!DEV || DEMO || PLAYTEST || window.__BUILD === 'demo') return;
  gm = game; X = x;
  const style = document.createElement('style'); style.textContent = CSS; document.head.appendChild(style);
  el = document.createElement('div'); el.id = 'devstudio'; el.innerHTML = html(); document.body.appendChild(el);
  const tab = document.createElement('button'); tab.id = 'devtab'; tab.textContent = 'DEV'; tab.title = 'Dev Studio (F10)'; document.body.appendChild(tab);
  tab.addEventListener('click', (e) => { e.stopPropagation(); toggle(); tab.blur(); });
  const ui = store.get(UI_KEY) || {};
  el.querySelectorAll('details').forEach((d) => {
    d.open = !!(ui.secs && ui.secs[d.dataset.sec]);
    d.addEventListener('toggle', () => { if (d.open && d.dataset.sec === 'places') fillHarbours(); const u = store.get(UI_KEY) || {}; (u.secs = u.secs || {})[d.dataset.sec] = d.open; store.set(UI_KEY, u); });
  });
  el.addEventListener('click', (e) => {
    e.stopPropagation();   // the title starts the game on a click; the studio's clicks are its own
    const b = e.target.closest('button[data-a]'); if (b) { act(b.dataset.a); b.blur(); return; }
  });
  el.addEventListener('pointerdown', (e) => e.stopPropagation());
  el.addEventListener('change', (e) => {
    const t = e.target, st = state.story;
    if (t.id === 'dsGoal') X.devQuest(+t.value);
    else if (t.id === 'dsWall') st.free = !t.checked;
    else if (t.dataset.side) { if (t.checked) state.goals.side[t.dataset.side] = true; else delete state.goals.side[t.dataset.side]; }
    else if (t.dataset.clue) { if (t.checked) markSeen(state, t.dataset.clue); else if (st.seen) delete st.seen[t.dataset.clue]; }
    if (t.tagName !== 'INPUT' || t.type !== 'number') t.blur();
    render();
  });
  el.addEventListener('input', (e) => {
    if (e.target.id === 'dsHour') X.devTime(+e.target.value);
    if (e.target.id === 'dsDread') { rt.forced = +e.target.value; }
    render();
  });
  // keys typed into the studio stay in it (no steering while a number is typed); F10 and Escape still close it
  el.addEventListener('keydown', (e) => {
    if (e.code === 'F10') return;
    if (e.code === 'Escape') { toggle(false); e.stopPropagation(); return; }
    if (e.code === 'Enter' && e.target.id === 'dsGold') act('goldset');
    if (/^(INPUT|SELECT)$/.test(e.target.tagName)) e.stopPropagation();
  });
  addEventListener('keydown', (e) => { if (e.code === 'F10') { e.preventDefault(); e.stopPropagation(); toggle(); } }, true);
  // while a scene runs, the closed voyage's own buttons would reload the page and rewrite the save: here they stay in the session
  addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button'); if (!before || !b) return;
    const id = b.id;
    if (id === 'endBack' || id === 'tBack') { e.stopImmediatePropagation(); e.preventDefault(); backToTable(); render(); }
    else if (id === 'endAgain' || id === 'tAgain') { e.stopImmediatePropagation(); e.preventDefault(); toast('Dev: "Begin again" would wipe the save; use Snapshots, Reset to a fresh voyage', false, 4000); undo(); }
    else if (id === 'endTitle') { e.stopImmediatePropagation(); e.preventDefault(); devCredits(); }
  }, true);
  if (el.querySelector('details[data-sec=places]').open) fillHarbours();
  setInterval(render, 400);
  if (ui.open) toggle(true);
}
