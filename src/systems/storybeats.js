// Story beats at sea: the chapter notes, the fog wall and being lost in it, the sea gates, the seams and clues noticed by being somewhere,
// lamp oil, torn sails, tacking, the hull (hurt, sinking), and the demo's end. Called from main.js frame() and the harbour screens.
import * as THREE from 'three';
import { clamp, smoothstep, angleDiff, mulberry32, hash2 } from '../util.js';
import { setReach, bearingName, nearby } from '../jobs.js';
import { sectorAt, bumpSectors } from '../sectors.js';
import { KINDS } from '../traffic.js';
import { isKnown } from '../clues.js';
import { BOUNTY, lampBurnMul, lampDead, regionAt } from '../regions.js';
import { nightKey } from './calendar.js';
import { maraRemembers } from '../table.js';
import { gateRadius } from '../objectives.js';
import { tod } from '../daynight.js';
import { LM } from '../landmarks.js';
import { OIL_FROM, oilCap, oilRate, lanternLit, OIL_PRICE } from '../oil.js';
import * as life from '../harbourlife.js';
import { params, session, SAVE_KEY } from '../core/config.js';
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { scene } from '../core/engine.js';
import { $, toast } from '../ui/dom.js';
import { tideFalls } from './calendar.js';

export let WHITE_MIST, oilOn;   // set by the init function(s) below, at the point in boot where main.js had them

// ---------------------------------------------------------------- story: chapter beats, the fog wall, the demo end
export const HUT_NOTES = [
  'If you find the black hut, do not sit down. I sat down. - R.',
  'She has a book. My name is in it now. Twice. She let me throw once. It came up {fate}. It will come up {fate} for you too. - R.',
  'Third bottle I have thrown. The hut is not where I left it. The hut is exactly where I left it.',
];
export const CHECKS = [['a red rock on its north shore', 'red'], ['three palms in a row on its east side', 'palms'], ['a bell on a post by the water', 'bell'], ['a white stone shaped like a tooth', 'tooth']];
export function perrinNote(quiet = false) {
  // an island far from Tama that Perrin "checks": the farthest ring the fog allows in chapter IV
  const rng = mulberry32(hash2(state.seed, 77, 9)), cands = [];
  for (let cz = -12; cz <= 12; cz++) for (let cx = -12; cx <= 12; cx++) {
    const d = G.world.desc(cx, cz); if (!d || d.type === 'harbour' || d.hut) continue;
    const r = Math.hypot(d.x, d.z); if (r > 720 && r < 1080) cands.push(d);
  }
  const d = cands[Math.floor(rng() * cands.length)] || G.world.desc(1, -1);
  const [detail] = CHECKS[Math.floor(rng() * CHECKS.length)];
  state.story.check = { id: d.id, name: d.name, x: Math.round(d.x), z: Math.round(d.z), r: d.r, dir: bearingName(d.x, d.z), detail };
  state.story.perrinNote = true;
  state.notes.push({ text: `Perrin: "Be a dear and check my chart. ${d.name}, ${state.story.check.dir} of Tama, should have ${detail}. Nobody has been there to tell me, so I need eyes. Bring back my compass if you find it. It's the one that's wrong."`, dark: false });
  if (!quiet) toast('The harbourmaster hands you a folded note from Old Perrin. (Ship\'s book)', false, 6000);
}
// Mara notices the hut on the chart: when the chart is next opened, or within a minute of sailing, whichever comes first (and never after the first throw)
export function hutNod(delay) {
  if (state.story.hutNod !== 'pending') return;
  state.story.hutNod = 'done';
  if (state.hut && state.hut.rolls.length) return;
  const line = state.story.hutFramed ? 'Captain... was that hut always on our chart? I did not draw it. Did you draw it?'
    : 'Captain... look at our chart. There is a hut on it now. I did not draw it. Did you?';   // not looked yet: she points you to it
  setTimeout(() => G.objectives.mate.say(line, true), delay);
}
export function revealHut() {
  const h = G.world.hutDesc; if (!h) return;
  state.discovered[h.id] = state.discovered[h.id] || 1;
  state.story.hutNod = 'pending';
  setTimeout(() => hutNod(0), 60000);
}
export function showDemoEnd() { $('demoend').classList.add('show'); G.audio.play('ending'); }
/** where the fog leaves no current: 0 in or near any fog (the chapter wall, the fog bank), 1 in clear water */
export function fogEdge(x, z) {
  const R = gateRadius(state, tideFalls()), d = Math.hypot(x, z);
  let k = R === Infinity ? 1 : 1 - smoothstep(R - 220, R - 120, d);
  const b = LM.broken; if (!G.places.open('broken', state.upgrades)) k = Math.min(k, smoothstep(110 + 40, 110 + 100, Math.hypot(x - b.x, z - b.z)));
  return k;
}
/** lost in fog: you see nothing, the helm does not answer, and the ship wanders but is always drawn back out */
export function fogLost(dt) {
  const out = rt.gateLost || G.places.lost || (rt.seamT > 0 ? { x: 0, z: 0 } : null);
  rt.lostK += ((out ? 1 : 0) - rt.lostK) * Math.min(1, dt * (out ? 1.5 : 0.6));
  if (!out) return;
  rt.lostWob += dt;
  const hum = isKnown(state, 'hum');   // the two players' tune carries through fog: the helm half answers, and the way home is plain
  const want = Math.atan2(out.x, -out.z) + (Math.sin(rt.lostWob * 0.7) * 0.6 + Math.sin(rt.lostWob * 1.9) * 0.25) * (hum ? 0.25 : 1);   // aimless, but always bending outward
  G.ship.heading += angleDiff(G.ship.heading, want) * Math.min(1, dt * (hum ? 1.3 : 0.5));
  G.ship.trim += (0.45 - G.ship.trim) * Math.min(1, dt * 0.8);
  G.ship.speed += (3.2 - G.ship.speed) * Math.min(1, dt * 0.6);
  G.ship.pos.x += out.x * 1.8 * dt; G.ship.pos.z += out.z * 1.8 * dt;   // and the fog itself lets go of you
}
export function seamTick(dt) {
  if (window.__BUILD === 'demo') return;
  const d = Math.hypot(G.ship.pos.x, G.ship.pos.z), ang = Math.atan2(G.ship.pos.z, G.ship.pos.x) * 180 / Math.PI;
  if (rt.seamT <= 0 && d > 1925 && d < 2000 && ang > 28 && ang < 52 && (state.story.reach || 0) > 1500) { rt.seamT = 4; rt.seamDone = false; }
  if (rt.seamT > 0) {
    rt.seamT -= dt;
    if (!rt.seamDone && rt.seamT < 2.6) { const a = 220 * Math.PI / 180; G.ship.pos.x = Math.cos(a) * 1930; G.ship.pos.z = Math.sin(a) * 1930; rt.seamDone = true; }
  }
  if (d > 1250) rt.wasDeep = true;
  else if (d < 1000 && rt.wasDeep) { rt.wasDeep = false; state.story.epoch = (state.story.epoch || 0) + 1; bumpSectors(state.story.epoch); }
}
export function clueTick(dt) {
  if (!state.story || G.onbQuiet()) return;
  const slow = G.ship.speed < 1.2, hour = state.time * 24;
  const at = (lm, R) => Math.hypot(G.ship.pos.x - LM[lm].x, G.ship.pos.z - LM[lm].z) < R;
  const dwell = (k, on, T) => { rt.clueDwell[k] = on ? (rt.clueDwell[k] || 0) + dt : 0; return rt.clueDwell[k] >= T; };
  if (dwell('bells', slow && Math.hypot(G.ship.pos.x, G.ship.pos.z) < 150 && hour > 11.8 && hour < 12.4 && state.hut && state.hut.rolls.length > 0, 6)) G.seeClue('CL-C3-a');
  if (window.__BUILD !== 'demo') { const l = maraRemembers(state, dt, G.laterOK() && !G.objectives.mate.busy && !G.objectives.pending && !rt.modal && !G.eventQuiet() && !G.world.nearest(G.ship.pos.x, G.ship.pos.z, 60)); if (l) G.objectives.mate.say(l); }   // her village comes back to her a piece at a time (table.js); the third piece is the blue door, some time after the Sunken Street
  if (isKnown(state, 'rest') && slow && tod.night > 0.4 && state.story.peakDread > 0) state.story.peakDread = Math.max(0, state.story.peakDread - 0.004 * dt);   // the crew rest on deck (CL-F2-a): the worst you have sailed into fades a little while you lie still at night
  if (dwell('players', slow && tod.night > 0.45 && G.weather.storm < 0.3 && (at('teo', 300) || at('ilse', 300)), 10)) G.seeClue('CL-F1-a');
  if ((rt.threadClueT = (rt.threadClueT || 0) - dt) <= 0) { rt.threadClueT = 3; threadClues(); }
}
/** the threads feed the ledger: the first time the captain has met each one (its saved state says so), one clue (clues.js CL-T-*) */
const THREAD_MET = {
  music: (t) => t.nights && t.nights.length > 0, bell: (t) => t.clappers > 0 || t.asked, coin: (t) => t.state && t.state !== 'none',
  house: (t) => t.visits > 0, captain: (t) => t.stage && t.stage !== 'none', hollow: (t) => t.w > 0 || t.accepted,
};
function threadClues() {
  if (window.__BUILD === 'demo') return;
  const tp = state.story.tp || {};
  for (const id in THREAD_MET) if (tp[id] && THREAD_MET[id](tp[id])) G.seeClue('CL-T-' + id);
  if (state.story.colour && state.story.colour.found) G.seeClue('CL-T-colour');
}
export function seaGate(dt) {
  const R = gateRadius(state, tideFalls()), d = Math.hypot(G.ship.pos.x, G.ship.pos.z);
  if (d < R && d > (state.story.reach || 0)) state.story.reach = d;   // how far you have really sailed: a stratum, once entered, stays open
  setReach(R);
  // an errand or passenger that points beyond the fog (taken before the fog was understood, or from an old save) is released
  for (const [key, label] of [['job', 'The delivery'], ['passenger', 'Your passenger']]) {
    const o = state[key];
    if (o && Math.hypot(o.x, o.z) > R - 30) { state[key] = null; if (state.tracked === key) state.tracked = null; toast(`${label} was bound beyond the fog. It is let go, and nothing is lost.`, false, 6000); }
  }
  rt.gateFog = R === Infinity ? 0 : clamp((d - (R - 160)) / 160, 0, 1);
  rt.gateLost = null;
  if (d > R) {   // past the fog wall: lost (fogLost takes the helm and the ship drifts back toward Tama)
    rt.gateLost = { x: -G.ship.pos.x / d, z: -G.ship.pos.z / d };
    G.objectives.remark('gate', rt.dread); if (state.hut && state.hut.rolls.length) G.objectives.remark('gate2', rt.dread);   // after the hut: where the way through is
    if ((rt.gateToastT -= dt) <= 0) { rt.gateToastT = 25; toast('The fog swallows everything. The helm will not answer; somehow the bow comes round toward home.', false, 5000); }
  }
}
export function seaTick(dt, windNow) {
  const ev = G.seaplay.update(dt, { ship: G.ship, wind: windNow, t: G.abyss.waveTime(Math.floor(rt.animT * 12) / 12), wave: rt.seaWave, night: tod.night, calm: G.weather.calm > 0.5, on: !G.onbQuiet() && !G.ship.rowing && rt.lostK < 0.1, slack: window.__BUILD !== 'demo', fogEdge, gustLong: life.meal(state) === 'curry' });
  if (ev.gust && !state.hints.gust) { state.hints.gust = true; toast('Caught a gust! Steer into the dark patches on the water to fill the sails.', false, 5500); }
  if (ev.lane !== rt.laneShown) {
    rt.laneShown = ev.lane;
    if (ev.lane && !G.onbQuiet()) {
      const seen = state.story.lanes = state.story.lanes || {};
      if (!seen[ev.lane.name]) { seen[ev.lane.name] = 1; toast(`A current: ${ev.lane.name}. Ride it and it carries you; fight it and it holds you back.`, false, 6000); }
    }
  }
  const pm = G.places.tick(dt, G.ship, state.upgrades, scene.fog.color, false);
  if (pm) { toast(pm.text, false, 5000); if (pm.hurt) hurtPlayer(pm.hurt); }
}
/** 1 while the ship is in Free Cays waters (their sector), else 0: the night music there is a lone guitar with silences */
export function freeCaysNow() { return sectorAt(G.ship.pos.x, G.ship.pos.z, state.seed).faction.id === 'free' ? 1 : 0; }
export function oilCtx() { return { night: tod.night, fog: G.weather.fog, storm: G.weather.storm, dread: rt.dread, rowing: G.ship.rowing }; }
/** the lamp in the Lantern Guild's waters: half while a lit lighthouse is in sight (within 260), double in the open dark there */
function lampBurn() {
  const p = G.ship.pos, reg = regionAt(p.x, p.z, state.seed); if (reg !== 'lantern') return 1;
  let near = false; for (const isl of G.world.islands.values()) { const a = isl.desc.lampAt; if (a && Math.hypot(a.x - p.x, a.z - p.z) < 260 && !lampDead(state, isl.desc, nightKey())) { near = true; break; } }
  return lampBurnMul(reg, near);
}
export function oilTick(dt) {
  const cap = oilCap(state.upgrades);
  const off = !!state.story.lampOff, needed = lanternLit(oilCtx());   // L puts the lantern out by hand (saves oil, sail by moonlight)
  if (!oilOn()) { state.oil = cap; rt.lampOut = off && needed; return; }
  const lit = needed && !off, before = state.oil;
  if (lit) state.oil = clamp(state.oil - oilRate(oilCtx()) * dt * lampBurn(), 0, cap);   // the Lantern Guild's waters (regions.js)
  rt.lampOut = needed && (off || state.oil <= 0);
  const night = state.dayN * 2 + (state.time > 0.5 ? 1 : 0);   // one warning of each kind per dark spell
  if (lit && before > cap * 0.25 && state.oil <= cap * 0.25 && rt.oilNight !== night && !G.eventQuiet()) { rt.oilNight = night; if (!G.objectives.mate.busy) G.objectives.mate.say('The lamp is getting low, Captain. Oil at any market, or we turn for home.'); else toast('The lamp oil is running low.', false, 4000); }
  if (lit && tod.night > 0.6 && !state.story.tellShadow && G.lateTell()) { state.story.tellShadow = 1; toast('The lamp throws one shadow across the deck.', false, 6000); }   // a tell: one shadow
  if (before > 0 && state.oil <= 0 && lit) { toast('The lantern gutters out. The dark comes right up to the rail.', rt.dread > 0.4, 6000); if (!state.hints.oilOut) { state.hints.oilOut = true; setTimeout(() => G.objectives.mate.say('No light, no line, and I can barely see the bow. Buy oil at a market next time, Captain.'), 3500); } }
}
export const SAIL_LIMIT = 20;   // seconds of full sail in a gale before it tears (longer with better sails, shorter in a storm)
export function sailTick(dt, windNow) {
  if (!oilOn() || state.sailsTorn || G.ship.rowing) { rt.sailStrain = 0; return; }
  const gale = G.weather.storm > 0.6 && windNow.strength > 1.0;   // only a real storm: everyday wind, even a fresh breeze, never tears the canvas
  if (gale && G.ship.trim > 0.55) {
    rt.sailStrain += dt * (G.ship.trim - 0.35) * 1.6 * (0.6 + (G.weather.storm - 0.6) * 2.5 + Math.max(0, windNow.strength - 1.1)) * (1 - 0.15 * (state.upgrades.sails || 0)) * (life.meal(state) === 'rum' ? 0.4 : 1);
    if (!rt.strainWarned && rt.sailStrain > SAIL_LIMIT * 0.35) { rt.strainWarned = true; toast('The canvas is straining in this wind! Reef the sails (S) before it tears.', false, 5000); G.audio.play('ui', { vol: 0.5 }); }
    if (rt.sailStrain >= SAIL_LIMIT) {
      state.sailsTorn = true; G.ship.setTorn(true); rt.sailStrain = 0; rt.strainWarned = false; rt.shake = Math.max(rt.shake, 0.6);
      toast('RRRIP! The mainsail tears. Two thirds speed until it is patched.', false, 6500);
      setTimeout(() => G.objectives.mate.say(state.patchKits > 0 ? 'We have a patch kit, Captain. Bring her to a stop and I will see to it (E).' : 'No patch kit aboard, Captain. We need a harbour and a sailmaker.'), 2500);
    }
  } else { rt.sailStrain = Math.max(0, rt.sailStrain - dt * 0.8); if (rt.sailStrain < 1) rt.strainWarned = false; }
}
export function mendSails(how) { state.sailsTorn = false; G.ship.setTorn(false); rt.sailStrain = 0; toast(how, false, 4000); }
export function toggleLamp() {
  const off = !state.story.lampOff;
  if (!off && oilOn() && state.oil <= 0) { toast('No oil to light it. Buy some at a market.', false, 3500); return; }
  state.story.lampOff = off;
  toast(off ? 'Lantern out. Saving oil; you sail by the moon.' : 'Lantern lit.', false, 3000);
  G.audio.play('ui', { vol: 0.4 });
  $('oilrow').classList.toggle('off', off);
}
export function buyOil(costMulNow) { const cap = oilCap(state.upgrades), need = cap - state.oil, cost = Math.ceil(need * OIL_PRICE * costMulNow); return { need, cost }; }
export function tackTick(dt) {
  const rel = Math.abs(angleDiff(G.ship.heading, G.wind.dir));
  if (rel > 0.8 * Math.PI && G.ship.trim > 0.4 && !G.ship.rowing) { rt.intoWindT += dt; if (rt.intoWindT > 4) G.objectives.remark('tack', rt.dread); } else rt.intoWindT = 0;
  if (rel > 0.5 * Math.PI && rel < 0.8 * Math.PI && !G.ship.rowing) state.stats.upwind = (state.stats.upwind || 0) + G.ship.speed * dt * -Math.cos(rel);
}
export function hurtPlayer(dmg) {
  const d = Math.max(1, Math.round(dmg));
  state.hp -= d; rt.lastHit = rt.tNow; rt.shake = 0.7; G.audio.play('hit');
  $('hit').classList.add('on'); setTimeout(() => $('hit').classList.remove('on'), 140);
  if (state.hp / G.ship.mods.maxHp < 0.35) G.objectives.remark('lowhp', rt.dread);
  if (state.hp <= 0) sinkPlayer();
}
export function onHitEnemy(s, dmg) {
  s.hp -= dmg;
  if (s.hp > 0) return;
  s.sinking = true; s.hostile = false; s.state = 'done'; s.engaged = false;
  const gold = Math.round((45 + Math.random() * 70) * KINDS[s.kind].scale);   // cannonballs are only ever bought, so every volley counts
  state.gold += gold; state.stats.sunk++; life.news(state, 'raider');
  const reef = sectorAt(s.x, s.z, state.seed).faction.id === 'reef';   // the Brotherhood pays for its own raiders' wrecks (regions.js BOUNTY)
  if (reef) state.story.bounty = (state.story.bounty || 0) + BOUNTY;
  toast(`Raider sunk! +${gold} gold${reef ? '. Any Reef harbour will pay a bounty for it.' : ''}`, false, 6000);
  if (state.stats.sunk === 1) toast('Unlocked: skull figurehead (see the shipyard).', false, 5000);
}
export function sinkPlayer() {
  state.hp = G.ship.mods.maxHp;
  const lost = Math.round(state.gold * 0.25);
  state.gold -= lost;
  G.traffic.ships.filter((x) => x.hostile).forEach((x) => { x.hostile = false; x.engaged = false; });
  const hs = nearby(G.world, G.ship.pos.x, G.ship.pos.z, 0, 1500, 'harbour').sort((a, b) => a.dist - b.dist)[0];
  const tgt = hs ? { x: hs.d.x, z: hs.d.z + hs.d.r * 1.7, name: hs.d.name } : { x: 0, z: 0, name: 'Tama' };
  $('fade').classList.add('on');
  setTimeout(() => {
    G.ship.pos.set(tgt.x, 0, tgt.z); G.ship.heading = 0; G.ship.speed = 0; rt.camHeading = 0;
    $('fade').classList.remove('on');
    toast(`The Gull went under. A fisherman dragged you to ${tgt.name}. You lost ${lost} gold; the hull is repaired.`, false, 8000);
  }, 1100);
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initStoryBeats() {
  $('demoGo').addEventListener('click', () => {
    $('demoend').classList.remove('show');
    if (window.__BUILD === 'demo') toast('Keep sailing: everything inside the fog is still yours to do.', false, 5000);   // the demo opens nothing more
    else { state.story.free = true; toast('The fog thins. The sea is yours.', false, 5000); }
  });
  rt.gateFog = 0, rt.gateToastT = 0, rt.musingT = 120, rt.gateLost = null, rt.lostK = 0, rt.lostWob = 0;
  /** clues that are noticed by being somewhere, stopped, at the right time (docs/WORLD_REDESIGN.md 6.2): Tama's noon bells, the Two Players across the water */
  WHITE_MIST = new THREE.Color('#ffffff');
  rt.clueDwell = {};
  // the loop seam (docs/WORLD_REDESIGN.md 5.5): the far south-east edge of the Dim meets the far west of the Lid. Sail east far enough and you
  // arrive west, in fog, with the helm gone for a few seconds. And the deep sectors are named again each time you come home from them.
  rt.seamT = 0, rt.seamDone = true, rt.wasDeep = false;
  bumpSectors((state.story && state.story.epoch) || 0);
  // gusts, currents and the barriers round the hand-made places (seaplay.js, places.js)
  rt.laneShown = null;
  // lamp oil (oil.js): burns while the lantern is lit; empty at night = a dark lantern and a short view
  oilOn = () => state.goals.i >= OIL_FROM || !!params.get('nomate');
  rt.lampOut = false, rt.oilNight = -1;
  // torn sails: too much canvas in a strong wind for too long and the mainsail rips (two thirds speed, ship.torn) until a patch
  // kit is used at sea (stop, E) or a harbour's sailmaker mends it. Counts from the same chapter as the oil.
  rt.sailStrain = 0, rt.strainWarned = false;
  // tacking: Mara's one-time tip when you point straight into the wind, and progress made upwind for the side goal
  rt.intoWindT = 0;
  rt.hullShown = -1;
  rt.newAsk = 0;
  $('pbExit').addEventListener('click', () => { G.saveNow(); location.href = location.pathname; });   // saved, then the title (Set sail continues)
  if (/Electron/.test(navigator.userAgent)) { $('pbQuit').style.display = ''; $('pbQuit').addEventListener('click', () => { G.saveNow(); window.close(); }); }   // the standalone app (electron/)
  $('pbNew').addEventListener('click', () => {
    if (performance.now() - rt.newAsk > 4000) { rt.newAsk = performance.now(); $('pbNew').textContent = 'Really? Click again to start over'; return; }
    session.noSave = true; try { localStorage.removeItem(SAVE_KEY); sessionStorage.setItem('hoist-new', '1'); if (G.fsEl()) sessionStorage.setItem('hoist-fs', '1'); } catch (e) { /* storage blocked */ }
    location.href = location.pathname;
  });
  $('pbHint').addEventListener('click', () => { G.closeModal(); if (!G.abyss.maraHint()) G.objectives.askHint(rt.dread); });
}
