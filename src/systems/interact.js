// Interaction: what E does where the ship is (getInteract), doing it (tryInteract), going ashore on a hand-made place (goAshore),
// and the anchor that holds her still meanwhile (anchorTick, HEAVE_KINDS: RULES 18, E works under way). Moved out of main.js (task R5).
// main.js computes the interaction once a frame into rt.tg (frame step 4); the prompt, the anchor and E all read that one value.
// Everything main.js owns comes through G, read at call time; screens (ui/ other than dom.js) too, since systems sit below them.
import { pierWord } from './hutword.js';
import { guitarDock } from './endgame.js';
import { markSeen, tableOpen } from '../clues.js';
import { G, rt } from '../core/runtime.js';
import { after } from './later.js';
import { DAY_LENGTH } from '../daynight.js';
const VISIT_GAP = 120 / DAY_LENGTH;   // a second visit counts after two minutes of sailing, as before (in game days)
import { state } from '../core/state.js';
import { tod } from '../daynight.js';
import { isOpen } from '../gates.js';
import { pickGreeting, rollGreeting, renamedGreeting } from '../greetings.js';
import * as life from '../harbourlife.js';
import { bearingName, friendLevel, fruitName, fruitOf, plural, repOf } from '../jobs.js';
import { LM } from '../landmarks.js';
import { lootFor } from '../lore.js';
import { customLine, maraAt, firstTime, HUSH, RELIT_LOG, RELIT_MARA, BOUNTY_DEBT } from '../customs.js';
import { goalReached } from '../objectives.js';
import { oilCap } from '../oil.js';
import { stageOf } from '../palette.js';
import { RELIGHT_OIL, RELIGHT_PAY, SALVAGE_MUL, lampDead, laneArrival, regionAt } from '../regions.js';
import { sectorAt } from '../sectors.js';
import { TREASURE_TIERS, rollCheck } from '../tabletop.js';
import { boatStatus } from '../traffic.js';
import { $, harbourEl, promptFill, toast } from '../ui/dom.js';
import { shipwrightLine } from '../upgrades.js';
import { angleDiff, hash2, mulberry32 } from '../util.js';
import { isFestival, isLanternNight, isMarketDay, nightKey, tideAt } from './calendar.js';
import { mendSails, oilOn } from './storybeats.js';
import { letterRumour, placeRumour } from './perrin.js';
import { supperTarget, startSupper } from './lantern.js';
import { raceHere, joinRace } from './race.js';
import { pilotSaying } from './passes.js';
import { chestAdd } from '../chest.js';
import { actEvent } from './seaevents.js';
import { rGreeting } from './rletters.js';
import { gearInteract, gearAct, gearDock } from './gearplay.js';
import { voyageDock } from './voyage.js';
import { REFUSE_AT, owed, payOwed, mark } from './standing.js';
import { handOn } from './hands.js';
import { crewBoarded } from './raiders.js';
import { tradeRumour } from './trade.js';
import { wreckRumour } from './wrecks.js';
import { spiceInteract, spiceAct } from './spice.js';

export function getInteract() {
  if (rt.boat) {   // in the ship's boat (systems/gearplay.js): the Gull to climb back aboard, a landing, or a hand-made place's shore
    const gb = gearInteract(true); if (gb) return gb;
    { const sp = spiceInteract(); if (sp) return sp; }   // saffron in the Mangroves, cloves on the Tide Rocks (spice.js)
    const lb = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 16); if (lb && lb.desc.lm) return { kind: 'landmark', key: 'lm' + lb.desc.id, isl: lb };
    return null;
  }
  const hi = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 18);
  if (hi && hi.desc.hut && G.world.hutShown) return { kind: 'hut', key: 'hut', isl: hi };
  const sg = G.sighting.near(G.ship.pos.x, G.ship.pos.z); if (sg) return { kind: 'sighting', key: 'sight', s: sg };
  const cvs = G.caves.near(G.ship.pos.x, G.ship.pos.z); if (cvs) return { kind: 'cave', key: cvs.id, site: cvs };
  const spr = G.threads.springNear(G.ship.pos.x, G.ship.pos.z); if (spr) return { kind: 'spring', key: 'spring', src: spr };
  const thr = G.threads.interact(G.ship); if (thr) return { kind: 'thread', key: thr.key, th: thr };
  // a harbour is entered at its pier; anywhere else along its shore you only get a hint
  // the hint "sail to the pier" is kept for last (G-13): it is not an action, so it never hides one
  const hb = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 38, ['harbour']);
  let far = null;
  if (hb) {
    const d = hb.desc, dk = d.dock;
    if (dk && Math.hypot(G.ship.pos.x - (d.x + dk.x), G.ship.pos.z - (d.z + dk.z)) < 22) return (!G.onbAll() && !goalReached(state, 'harbour')) ? null : { kind: 'harbour', key: d.id, isl: hb };   // no "visit" at the very start: Mara sends you when it is time
    if (G.world.lastEdge < 16) far = { kind: 'harbourfar', key: d.id, isl: hb };
  }
  { const sp = spiceInteract(); if (sp) return sp; }   // with the herbalist aboard (spice.js): before the island's other things
  const sc = G.secrets.near(G.ship.pos.x, G.ship.pos.z, state.collected); if (sc && !(sc.kind === 'camp' && state.story.secrets && state.story.secrets[sc.key + '@'] === state.dayN)) return { kind: 'secret', key: sc.key, sc };
  { const gi = gearInteract(false); if (gi) return gi; }
  // (the bell's sites and the boat's are above; spice comes before the island's secrets)
  const lmI = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 16);
  if (lmI && lmI.desc.lm) return { kind: 'landmark', key: 'lm' + lmI.desc.id, isl: lmI };
  const isl = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 16, ['treasure']);
  if (isl) return { kind: isl.desc.type, key: isl.desc.id, isl };
  if (G.sea.nearWreck) return { kind: 'wreck', key: G.sea.nearWreck.o.id, o: G.sea.nearWreck.o };
  if (state.sailsTorn && state.patchKits > 0) return { kind: 'patch', key: 'patch' };   // anywhere at sea: patch the sail with a kit (above fruit and hails, G-13)
  { const ra = raceHere(); if (ra) return ra; }   // at the regatta's start line: E to race (race.js, owner 2026-11-19)
  for (const s of G.traffic.ships) if (s.struck && !s.boarded && !s.sinking && Math.hypot(s.x - G.ship.pos.x, s.z - G.ship.pos.z) < 16) return { kind: 'board', key: 'board' + s.id, s, prompt: '[E] Board her' };   // dismasted by chain shot (combat.js)
  const sh = G.traffic.nearestHail(G.ship.pos.x, G.ship.pos.z, 24);
  if (sh) return { kind: 'ship', key: 'ship' + sh.id, s: sh };
  const fi = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 14, ['jungle', 'sandbar']);
  if (fi) return { kind: 'fruit', key: 'fruit' + fi.desc.id, isl: fi };
  { const li = G.world.nearest(G.ship.pos.x, G.ship.pos.z, 45); if (li && G.world.lit && li.desc.lampAt && lampDead(state, li.desc, nightKey())) return { kind: 'relight', key: 'relight:' + li.desc.id, isl: li }; }   // a dead Guild light
  { const su = supperTarget(); if (su) return su; }   // a Guild keeper on his gallery at dusk (lantern.js, P-LANT-3)
  return far;
}

export const ROLL_GREET_P = 0.35, ROLL_GREET_GAP = 3;   // E6: a greeter speaks of a later throw about one time in three, never two within three days
export const HEAVE_KINDS = new Set(['spice', 'board', 'gear', 'thread', 'spring', 'cave', 'treasure', 'fruit', 'wreck', 'landmark', 'patch', 'supper']);
// E forgives (SYSTEMS_FEEL G-03, G-04, G-10; numbers to tune by hand):
export const E_GRACE_T = 0.6;      // s: the last thing in reach stays E-able this long after it leaves reach...
export const E_GRACE_D = 6;        // ...while the ship has moved no more than this since it was last in reach (about "its range + 6"; never a harbour)
export const HEAVE_HOLD = 8;       // while the anchor goes down the target holds over this much more way (from 11 she stops in about 4.2)
export const HEAVE_GIVE_UP = 8;    // s: the heave gives up if she has not come to rest by then
export const E_BUFFER = 0.25;      // s: an E with nothing in reach waits this long for something to come in reach
export const ACTION_LEASH = 8;     // a running action ends only if the ship is moved more than its range + this from where it began (a sinking, a jump)
export const DIG_LEAVE_HOLD = 0.8; // s: hold E on the beach to pack up (it counts as a failed dig)
const ACTION_RANGE = { spice: 30, board: 16, gear: 16, treasure: 16, landmark: 16, fruit: 14, wreck: 22, secret: 18, supper: 45 };   // the ranges in getInteract
rt.heave = null, rt.anchorAt = null;   // heave: E was pressed under way, the anchor is going down; anchorAt: where she lies while it is down
rt.tgLast = null, rt.tgRaw = null, rt.eBuf = null, rt.eDown = null, rt.digLeave = 0;
/** can E do something with this target now? (the pier hint, a secret under way and a plundered isle cannot) */
function actionable(tg) {
  if (!tg || tg.kind === 'harbourfar') return false;
  if (tg.kind === 'secret' && G.ship.speed > 0.6) return false;
  if (tg.kind === 'treasure' && tg.isl.dug) return false;
  return true;
}
/** once a frame, after getInteract: the target E answers to (grace, a heave and a running action keep theirs), then the anchor */
export function anchorTick() {
  const raw = rt.tg, sx = G.ship.pos.x, sz = G.ship.pos.z;
  rt.tgRaw = raw;
  if (actionable(raw)) rt.tgLast = { tg: raw, t: rt.tNow, x: sx, z: sz };
  else { const L = rt.tgLast; if (L && L.tg.kind !== 'harbour' && rt.tNow - L.t <= E_GRACE_T && Math.hypot(sx - L.x, sz - L.z) <= E_GRACE_D) rt.tg = L.tg; }   // grace (G-04)
  if (rt.dig && rt.dig.at) {   // a running action keeps its own target (G-03); main.js ends it when rt.tg no longer matches
    const a = rt.dig.at;
    rt.tg = Math.hypot(sx - a.x, sz - a.z) > a.r ? null : rt.dig.tg;
  }
  if (rt.heave) {
    const h = rt.heave;
    if (raw && raw.key === h.key) { h.x = sx; h.z = sz; }
    if (rt.dig || rt.tNow - h.t > HEAVE_GIVE_UP || Math.hypot(sx - h.x, sz - h.z) > HEAVE_HOLD) rt.heave = null;
    else { rt.tg = h.tg; if (G.ship.speed <= 0.3) { rt.heave = null; tryInteract(); } }
  }
  if (rt.eBuf != null) { if (rt.tNow - rt.eBuf > E_BUFFER) rt.eBuf = null; else if (actionable(rt.tg) && !rt.dig && !rt.heave) { rt.eBuf = null; tryInteract(); } }   // an early E (G-04)
  G.ship.anchored = !!rt.heave || !!rt.dig || G.fishing.active || !!G.fishing.pending || !!rt.raceHold;   // at the regatta's line until GO (systems/race.js)   // C under way drops it too (G-05)
  if (!G.ship.anchored) { rt.anchorAt = null; return; }
  if (!rt.anchorAt && G.ship.speed < 0.3) { rt.anchorAt = { x: G.ship.pos.x, z: G.ship.pos.z }; rt.anchorBit = true; if (G.ship.float) G.ship.float.vp -= 0.35; }   // the anchor bites: the bow dips (main.js adds the foam)
  if (rt.anchorAt) { G.ship.pos.x = rt.anchorAt.x; G.ship.pos.z = rt.anchorAt.z; }   // currents and leeway do not move an anchored ship
}
/** probing the shore: E held DIG_LEAVE_HOLD packs the crew up (G-10). held: is E down; the prompt bar fills meanwhile */
export function digLeaveTick(held) {
  if (!G.digGame.active || !held || rt.eDown == null) { rt.eDown = held ? rt.eDown : null; rt.digLeave = 0; return; }
  rt.digLeave = Math.min(1, (rt.tNow - rt.eDown) / DIG_LEAVE_HOLD);
  promptFill.style.width = `${Math.round(rt.digLeave * 100)}%`;
  if (rt.digLeave >= 1) { rt.eDown = null; rt.digLeave = 0; G.digGame.leave(); }
}
export function tryInteract() {
  if (!rt.started || rt.modal) return;
  let tg = rt.tg !== undefined ? rt.tg : getInteract();   // this frame's (main.js sets rt.tg once a frame)
  if (rt.heave && actionable(rt.tgRaw) && rt.tgRaw.key !== rt.heave.key) tg = rt.tgRaw;   // another E elsewhere while the anchor goes down
  if (rt.dig) return;   // a running action has E until it ends (G-03)
  if (!actionable(tg)) { rt.eBuf = rt.tNow; return; }   // nothing in reach yet: held a moment (G-04)
  rt.eBuf = null;
  doInteract(tg);
  if (rt.dig && !rt.dig.at) { rt.dig.tg = tg; rt.dig.at = { x: G.ship.pos.x, z: G.ship.pos.z, r: tg.kind === 'patch' ? Infinity : (ACTION_RANGE[tg.kind] || 16) + ACTION_LEASH }; }
}
function doInteract(tg) {
  if (tg.kind === 'sighting') { if (tg.s.card.ev) actEvent(tg.s); else G.openCard(tg.s.card); return; }   // an event's ordinary action (seaevents.js)
  // E under way: the anchor goes down first, and the crew goes ashore as soon as she lies still (no need to stop her by hand)
  if (HEAVE_KINDS.has(tg.kind) && G.ship.speed > 0.3) { if (!rt.heave || rt.heave.key !== tg.key) G.audio.play('ui'); rt.heave = { key: tg.key, tg, t: rt.tNow, x: G.ship.pos.x, z: G.ship.pos.z }; return; }
  if (tg.kind === 'gear') { gearAct(tg); return; }
  if (tg.kind === 'spice') { spiceAct(tg); return; }
  if (tg.kind === 'board') {   // a raider that struck her colours: her hold, and she is left to drift
    if (!rt.dig) rt.dig = { key: tg.key, t: 0, label: 'Boarding...', need: 3.5, done: () => {
      const s = tg.s; if (s.boarded) return; s.boarded = true; s.hostile = false; s.state = 'done';
      const gold = Math.round((70 + Math.random() * 90) * (s.scale || 1)), balls = 4 + Math.floor(Math.random() * 6);
      state.gold += gold; state.ammo += balls; state.stats.boarded = (state.stats.boarded || 0) + 1; state.stats.sunk++;
      G.audio.play('treasure'); toast(`Her crew put up their hands. Her hold: +${gold} gold, +${balls} cannonballs. She is left to drift.`, false, 6000);
      { const cl = crewBoarded(s); if (cl) { state.notes.push({ text: cl, dark: false }); after(3, () => toast(cl, false, 8000)); } }   // a beat of her crew's story (raiders.js)
    } };
    return;
  }
  if (tg.kind === 'thread') { tg.th.run(); return; }
  if (tg.kind === 'spring') { G.openCave({ id: `spring:${G.threads.c.src.id}`, kind: 'colourspring' }); return; }
  if (tg.kind === 'cave') { G.openCave(tg.site); return; }
  if (tg.kind === 'hut') { if (!state.story.hutKnown) { G.audio.play('knock'); toast('Nobody answers. Inside, a pen scratches, then stops.', true, 4500); return; } G.openModal('hut'); return; }
  if (tg.kind === 'landmark') { goAshore(tg); return; }
  if (tg.kind === 'secret') {   // (only when she was stopped by hand: actionable() leaves it out under way)
    if (!rt.dig) rt.dig = { key: tg.key, t: 0, label: tg.sc.kind === 'kestrel' ? 'Someone goes down on a rope...' : tg.sc.kind === 'camp' ? 'Going ashore...' : 'Salvaging...', need: tg.sc.kind === 'kestrel' ? 5 : 3.2, done: () => G.secretFound(tg.sc) };
    return;
  }
  if (tg.kind === 'race') { joinRace(); return; }   // the regatta: confirm racing (race.js)
  if (tg.kind === 'supper') { if (!rt.dig) startSupper(tg); return; }   // the keeper's supper (lantern.js)
  if (tg.kind === 'relight') {   // the Lantern Guild's dead light: oil from your lamp, and the keeper pays and marks the waters
    if (state.oil < RELIGHT_OIL) { toast(`The lamp needs ${RELIGHT_OIL} oil. You have ${Math.floor(state.oil)}.`, false, 3500); return; }
    const d = tg.isl.desc; state.oil -= RELIGHT_OIL; mark('lantern', 1);   // the Guild remembers (systems/standing.js) (state.story.relit = state.story.relit || {})[d.id] = nightKey(); state.gold += RELIGHT_PAY;
    const k = G.revealAround(d.x, d.z); tg.isl.setLit(G.world.lit); G.audio.play('discover', { vol: 0.5 });
    toast(`The light is burning again. The keeper pays ${RELIGHT_PAY} gold${k ? ` and marks ${k} island${k > 1 ? 's' : ''} on your chart` : ''}.`, false, 6000);
    if (firstTime(state, 'relitLog')) { state.notes.push({ text: RELIT_LOG, dark: false }); setTimeout(() => toast(RELIT_LOG, false, 7000), 6500); if (rt.dread < HUSH.lantern) setTimeout(() => { if (!G.objectives.mate.busy) G.objectives.mate.say(RELIT_MARA); }, 2500); }   // L-19 (customs.js)
    return;
  }
  if (tg.kind === 'patch') {
    if (!rt.dig) rt.dig = { key: 'patch', t: 0, label: 'Patching the mainsail...', need: 4.5, done: () => { state.patchKits--; mendSails(`Patched. The sail holds again (${state.patchKits} ${state.patchKits === 1 ? 'kit' : 'kits'} left).`); } };
    return;
  }
  if (tg.kind === 'harbour') {
    const d = tg.isl.desc, rep = repOf(state, d.id);
    rep.region = d.region;   // its water's name counts toward it (systems/standing.js)
    if (window.__BUILD !== 'demo' && friendLevel(rep) <= REFUSE_AT) {   // the empty quay: nobody takes your line until what is owed is paid
      if (rt.oweAsk === d.id) { const g = payOwed(d.region); if (g) { rt.oweAsk = null; G.audio.play('buy'); toast(`You pay the harbourmaster ${g} gold. A boy comes down and takes your line.`, false, 6000); } else toast(`They want ${owed(d.region)} gold before anyone will take your line.`, false, 4000); return; }
      rt.oweAsk = d.id; toast(`Nobody comes down to take your line. The harbourmaster watches from a window. (E again: pay what they say is owed, ${owed(d.region)} gold.)`, false, 7000); return;
    }
    const now = state.dayN + state.time;   // game days (task R8); a save from before kept a wall-clock time here, which reads as long ago
    if (!(rep.last < 1e6) || now - rep.last > VISIT_GAP) rep.visits++;
    rep.last = now;
    state.stats.harbours++;
    if (state.hp < G.ship.mods.maxHp) { state.hp = G.ship.mods.maxHp; toast('The harbour crew patches up your hull for free.', false, 3000); }
    if (state.sailsTorn) setTimeout(() => mendSails('The sailmaker stitches your mainsail whole again.'), 600);
    const rng = mulberry32(hash2(d.seed, Math.floor(rt.tNow / 8), 3));
    const idx = stageOf(rt.dread), lvl = friendLevel(rep);
    rt.hbShipLine = shipwrightLine(rng, idx);
    G.threads.onDock(d);
    guitarDock(d);   // after the tune is kept, something waits on Tama's quay (systems/endgame.js)
    { const vl = voyageDock(d); if (vl) setTimeout(() => toast(vl, false, 7000), 3200); }   // the crew's spirits (voyage.js)
    { const gl = gearDock(d); if (gl) setTimeout(() => toast(gl, false, 7000), 1800); }   // where the boat came ashore after a storm parted its line (gearplay.js)
    // someone on the pier may speak first: always on a first visit or a story beat, otherwise rarely
    let say = null;
    { const cur = G.objectives.current;
      if (cur && cur.id === 'harbour' && d.id === '0,-1' && !state.story.letterP1) state.story.letterP1 = 'wait';   // landfall done: the letter is already waiting, before the goal catches up
      if (cur && cur.id === 'perrin' && d.id === '0,-1' && !state.story.perrinNote && !state.story.letterP2) state.story.letterP2 = 'wait';   // the note waits as a letter; the player takes it
      say = pierWord(d, !!(cur && cur.id === 'gossip')); }   // the hut's way: certain while "Ask around" is open, now and then once the bottles talk (systems/hutword.js, T2)
    const g = state.greet, h = state.hut, told = state.story.rollSeen || 0, ending = state.story.demoEnd === 'pending', free = g.lastDay !== state.dayN || ending;   // one voice a day, wherever you dock
    if (!say && free && h && h.rolls.length > told) {   // someone already knows: always after the first throw, then now and then (E6: a chance, and not two within ROLL_GREET_GAP days)
      state.story.rollSeen = h.rolls.length;
      const last = state.story.rollGreetDay;
      if (told === 0 || ending || (Math.random() < ROLL_GREET_P && !(last != null && state.dayN - last < ROLL_GREET_GAP))) { state.story.rollGreetDay = state.dayN; say = rollGreeting(h.rolls[h.rolls.length - 1].n, state.time * 24, Math.random); if (ending) say.endsDemo = true; }
    }
    if (!say && ending && h && h.rolls.length) { say = rollGreeting(h.rolls[h.rolls.length - 1].n, state.time * 24, Math.random); say.endsDemo = true; state.story.rollSeen = h.rolls.length; }
    if (!say && window.__BUILD !== 'demo') say = letterRumour(state, G.objectives.pending ? null : G.objectives.current, d, state.time * 24);   // asking around for Perrin's letter (systems/perrin.js)
    const cold = window.__BUILD !== 'demo' && state.hut && state.hut.rolls && state.hut.rolls.length && friendLevel(rep) < 1;   // after the first throw, low standing: nobody tells you anything
    if (!say && free && window.__BUILD !== 'demo' && !cold) say = placeRumour(state, d, state.time * 24);
    if (cold && !handOn('gobetween') && free && (state.story.coldDay !== state.dayN)) { state.story.coldDay = state.dayN; setTimeout(() => toast('Somebody on the quay starts to say something, sees who it is, and talks about the weather instead.', false, 6000), 3400); }
    if (handOn('gobetween') && window.__BUILD !== 'demo') { const h = placeRumour(state, d, state.time * 24, true); if (h) setTimeout(() => toast(`Ines comes back from the quay: "${h.text}"`, false, 8000), 4200); }   // the go-between (systems/hands.js)
    if (!say && free && window.__BUILD !== 'demo') say = pilotSaying(d);
    if (!say && free && window.__BUILD !== 'demo') say = rGreeting(d);   // lore connection C: when R. came through (rletters.js)   // how a way through is heard of (systems/passes.js, T4)   // asking around never runs out (T6 c, systems/perrin.js)
    if (!say && free && G.laterOK()) say = renamedGreeting(state, d, Math.random);   // a place that was not always called that (D3)
    if (!say && free && G.laterOK() && window.__BUILD !== 'demo' && !state.story.lullRumour && sectorAt(d.x, d.z, state.seed).faction.id === 'free') { state.story.lullRumour = 1; say = { speaker: 'oldsalt', text: 'In the Cays they say the dark keeps quiet while somebody plays.', story: true }; }   // points at the Two Players (the gentle ending)
    if (!say && free && !state.story.tellGreet && G.lateTell() && Math.random() < 0.5) { state.story.tellGreet = 1; say = { speaker: 'harbourmaster', text: 'Captain. Just yourself again? I will put you down as one.', story: true }; }   // a tell: they greet only you
    if (!say && free && G.laterOK() && isOpen(state, 'tab', 'tavern') && Math.random() < 0.6) say = life.gossipAt(state, d);
    const hr = state.time * 24, cx = { region: regionAt(d.x, d.z, state.seed), hour: hr, night: hr >= 19 || hr < 5, dusk: hr >= 17 && hr < 20, evening: hr >= 17 || hr < 2, storm: G.weather.storm > 0.5, still: G.weather.storm < 0.3, fog: G.weather.fog > 0.4, lane: !!(rt.lane && rt.tNow - rt.lane.t < 90), job: !!state.job, dread: rt.dread, visits: rep.visits };
    if (!say && free && G.laterOK() && rt.dread < 0.6 && Math.random() < 0.35) say = customLine(state, d, cx);   // a regional custom (customs.js, the lore bible)
    { const mr = G.laterOK() ? maraAt(state, d, cx) : null; if (mr) setTimeout(() => { if (!G.objectives.mate.busy) G.objectives.mate.say(mr); }, 2600); }   // Mara, once per region, while the water is light (L-34)
    if (!say && free && G.laterOK() && rt.dread < 0.6) say = G.taleAt(d);
    if (!say && free && G.laterOK()) say = tradeRumour(d);
    if (!say && free && G.laterOK() && window.__BUILD !== 'demo') say = wreckRumour(G.world, d);   // a wreck in its water (wrecks.js)   // where a good price is this week (trade.js)
    if (!say && free && G.laterOK() && (g.day[d.id] == null || Math.random() < 0.3)) say = pickGreeting({ hour: state.time * 24, weather: G.weather.label, dread: rt.dread, rnd: Math.random, custom: d.custom, event: isFestival(d) ? 'festival' : isMarketDay() ? 'market' : isLanternNight() ? 'lantern' : null, boat: (() => { const b = boatStatus(d, state.dayN, rt.dread, state.seed); return b.today === 'stayed' ? 'stayed' : b.yesterday === 'lost' ? 'lost' : null; })() });
    if (!say && free && window.__BUILD !== 'demo') { const tl = G.threads.harbourLine(d); if (tl) say = { speaker: 'fisher', text: tl, dark: true, story: true }; }
    if (laneArrival(state, d, rt.lane && rt.tNow - rt.lane.t < 90 ? rt.lane : null)) setTimeout(() => toast('In by the buoys. The harbourmaster ticks a line in the book.', false, 4500), 1400);   // the Crown's record (regions.js)
    if (d.region === 'reef' && state.story.bounty) { const b = state.story.bounty; state.gold += b; state.story.bounty = 0; setTimeout(() => toast(`The Brotherhood pays the bounty: +${b} gold. "${BOUNTY_DEBT}"`, false, 6000), 1600); }   // raiders sunk in Reef waters (regions.js)
    rt.harbourIsl = tg.isl; rt.hbTab = 'board'; G.frameVillage(d); G.autosave();
    G.ship.speed = 0; G.ship.vel = null; G.ship.trim = 0; rt.heave = null;   // laid alongside: she leaves the harbour at rest, sails in (G-09)
    if (G.lettersAt(d).length) setTimeout(() => toast('A letter waits for you at the harbourmaster\'s board.', false, 6000), 900);
    else if (G.petOffer(d)) setTimeout(() => { const po = G.PETS[G.petOffer(d)]; toast(`${po.title}. ${po.sub[0].toUpperCase()}${po.sub.slice(1)}.`, false, 6000); }, 900);
    for (const c of state.crew) if (c.wish && !c.wish.done && c.wish.kind === 'harbour' && c.wish.id === tg.isl.desc.id) G.wishDone(c);
    harbourEl.classList.toggle('dark', idx >= 3);
    $('hbBannerName').textContent = d.name; $('hbSaid').textContent = ''; $('hbLine').style.display = 'none'; $('hbDay').textContent = G.dayLine(d);
    if (say && G.objectives.mate.busy && !say.endsDemo && !say.story) say = null;   // Mara is speaking about the quest: a passing greeting waits for another day
    if (say && say.rumour) setTimeout(() => toast('Marked on your chart.', false, 4500), 900);
    if (say) { g.day[d.id] = state.dayN; g.lastDay = state.dayN; G.showGreeting(d, say); } else G.openModal('harbour');
    G.audio.play('harbour');
  } else if (tg.kind === 'treasure' && !tg.isl.dug && !rt.dig) {
    const d = tg.isl.desc;
    if (!state.riddles[d.id]) {
      rt.dig = { key: tg.key, t: 0, label: 'Reading the inscription...', need: 2.2, done: () => { G.readArch(d); G.objectives.remark('riddle'); } };
      G.audio.play('dig');
    } else if (state.halves[d.id]) {
      toast('Half a riddle is not enough to dig by. The other half is written on another arch.', false, 5000);
    } else if (rt.digFix > rt.tNow) {
      toast('The crew is still digging out the collapsed hole.', false, 2500);
    } else {
      rt.dig = { key: tg.key, t: 0, mini: true, label: 'Digging...', need: 1, done: () => {
        const ang = Math.atan2(G.ship.pos.z - d.z, G.ship.pos.x - d.x);
        if (Math.abs(angleDiff(ang, d.puzzle.angle)) > 0.85) {
          state.attempts[d.id] = (state.attempts[d.id] || 0) + 1;
          toast(state.attempts[d.id] >= 2 ? 'Nothing here but sand. Reread the riddle in your orders and try another shore.' : 'The crew digs and finds only sand and crabs. Wrong shore!', false, 6000);
          return;
        }
        let loot = G.abyss.wrongLoot(lootFor(mulberry32(hash2(d.seed, 7, state.seed)), d.dread), state);
        const first = d.id === '1,-1';   // the first treasure always pays for one starter upgrade
        if (first) loot = { name: 'Perrin\'s chest: a bag of old doubloons', value: 120, dark: false };
        const land = (tier) => {
          loot.value = Math.round(loot.value * G.ship.mods.lootMul * (tier ? tier.mult : 1));
          if (tier && tier.mult < 1) loot.name = `${loot.name} (water-damaged)`; else if (tier && tier.mult >= 2) loot.name = `${loot.name} (and more beneath it)`;
          state.stats.treasures++; state.stats.solved++; if (!first) life.news(state, 'treasure', { where: d.name });
          state.gold += loot.value; state.loot.push(loot);
          toast(`Treasure! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
          G.audio.play('treasure');
        };
        state.dug.add(d.id); tg.isl.setDug(true);   // claimed now, so the throw cannot be started twice
        if (first) land(null); else rollCheck(state, { label: 'The chest: how good a find?', kind: 'luck', dark: loot.dark, tiers: TREASURE_TIERS, treasure: true, attempts: state.attempts[d.id] || 0 }, (ok, n, total, tier) => land(tier));
      } };
      { // probing the shore (digging.js), only on the right shore: a wrong shore is a short dig that finds sand, as before
        const right = Math.abs(angleDiff(Math.atan2(G.ship.pos.z - d.z, G.ship.pos.x - d.x), d.puzzle.angle)) <= 0.85;
        if (!right) { rt.dig.mini = false; rt.dig.need = 2.2; }
        else {
          const first = d.id === '1,-1', tools = (1 - G.ship.mods.digTime) * 6 + (state.buffs.dig > 0 ? 2 : 0);   // the first treasure (tutorial) is kinder; better tools, more digs before the tide
          const beach = first ? 'sand' : ['sand', 'shingle', 'dune', 'mud'][Math.abs(hash2(d.seed, 41, 3)) % 4];   // every treasure isle has its own kind of beach (digging.js BEACHES)
          const pa = d.puzzle.angle, ox = Math.cos(pa), oz = Math.sin(pa), rx = Math.sin(pa), rz = -Math.cos(pa);   // the beach: o out to sea, r along it
          const sun = () => { const sx = -Math.sin(tod.sunAz), sz = Math.cos(tod.sunAz); return { elev: tod.sunElev, gx: sx * rx + sz * rz, gy: sx * ox + sz * oz, dim: 1 - 0.75 * Math.max(G.weather.cloud || 0, G.weather.rain || 0) }; };   // the arch's shadow on the sand, from where the sun is now
          const noon = d.puzzle.shadow ? { elev: Math.max(0.3, rt.sunScale), gx: rz, gy: oz } : null;
          const predug = !first && !state.story.predug && state.stats.treasures >= 1;   // the second chest: one hole is there already, over the chest (once)
          if (predug) state.story.predug = 1;
          G.digGame.start({ cols: 8, rows: 5, beach, sun, noon, predug, digs: Math.round((first ? 13 : 10) + tools - (d.dread > 0.5 ? 1 : 0)), stones: first ? 2 : 3 + (d.dread > 0.4 ? 1 : 0), lie: d.dread > 0.5 ? 0.3 : 0,
            onDone: () => { const done = rt.dig && rt.dig.done; rt.dig = null; if (done) done(); if (predug && G.digGame.preFound) markSeen(state, 'CL-H3-hole'); if (predug && G.digGame.preFound) after(3, () => G.objectives.say('Somebody dug here first, and stopped a spade short. Lucky us.')); },
            onFail: (why) => { rt.dig = null; rt.digFix = rt.tNow + 6; rt.digFixWhy = why; state.attempts[d.id] = (state.attempts[d.id] || 0) + 1;
              if (why === 'leave') return;   // the crew packed up (G-10): a failed dig, without a word
              toast(why === 'tide' ? 'The tide comes in and fills every hole. The crew waits for it to go out again.' : why === 'mud' ? 'The light goes and the mud is everywhere. The crew scrapes the shovels clean and tries again.' : 'The shovel breaks on a second stone. The crew fetches the spare.', false, 5500); } });
        }
      }
      G.audio.play('dig');
    }
  } else if (tg.kind === 'fruit' && !rt.dig) {
    const d = tg.isl.desc, f = fruitOf(d);
    if (state.harvest[d.id] != null && state.harvest[d.id] >= state.dayN) { toast(`The ${plural(fruitName(f, d.dread), 2)} here are picked clean for today.`, false, 3500); return; }
    rt.dig = { key: tg.key, t: 0, label: 'Picking fruit...', need: 2.4, done: () => {
      const n = Math.max(1, Math.round((2 + Math.floor(Math.random() * 3)) * G.ship.mods.lootMul)) + (life.meal(state) === 'pepper' ? 2 : 0);
      state.fruit[f] = (state.fruit[f] || 0) + n; state.harvest[d.id] = state.dayN; state.stats.fruitPicked += n;
      toast(`The crew picked ${n} ${plural(fruitName(f, d.dread), n)}.`, d.dread > 0.5, 4500);
    } };
  } else if (tg.kind === 'ship') {
    G.hailShip(tg.s);
  } else if (tg.kind === 'wreck' && !rt.dig) {
    const o = tg.o;
    rt.dig = { key: tg.key, t: 0, label: 'Salvaging the wreck...', need: 3.4 * G.ship.mods.digTime * (state.buffs.dig > 0 ? 0.7 : 1), done: () => {
      if (o.fixed) {   // a named wreck (systems/wrecks.js): its own find, once
        const f = o.fixed, g = Math.round(f.gold * G.ship.mods.lootMul); o.salvaged = true; state.collected.add(o.id); state.stats.wrecks++; state.gold += g;
        if (f.oil && state.oil < oilCap(state.upgrades)) state.oil = oilCap(state.upgrades);
        state.notes.push({ text: f.text, dark: !!f.dark }); toast(f.text + (g ? ` (+${g} gold)` : ''), !!f.dark, 9000);
        const rk = 'wreck:' + f.id; if (state.rumoured[rk]) state.rumoured[rk].found = true;
        G.audio.play(g ? 'treasure' : 'discover'); return;
      }
      const loot = G.abyss.wrongLoot(lootFor(mulberry32(o.rngSeed), o.dread), state);
      loot.value = Math.round(loot.value * 1.3 * G.ship.mods.lootMul * (tideAt() < -0.45 ? 1.3 : 1) * G.threads.salvageMul() * (SALVAGE_MUL[regionAt(o.x, o.z, state.seed)] || 1));   // the tide has uncovered more; the Reef keeps the ships that come (regions.js)
      loot.name = `From the wreck: ${loot.name}`;
      o.salvaged = true; if (!o.extra) state.collected.add(o.id); state.stats.wrecks++;
      state.gold += loot.value; state.loot.push(loot);
      toast(`Salvaged! ${loot.name} (+${loot.value} gold)`, loot.dark, 7000);
      { const x = G.threads.onSalvage(); if (x) after(1.5, () => toast(x, true, 6000)); }
      G.audio.play('treasure');
    } };
    G.audio.play('dig');
  }
}

// going ashore on a hand-made place (places.js says what you find)
export function goAshore(tg) {
  const d = tg.isl.desc;
  rt.dig = { key: tg.key, t: 0, label: 'Going ashore...', need: 2.6, done: () => {
    if (d.lm === 'table' && tableOpen(state) && !state.story.ending && window.__BUILD !== 'demo') { G.places.visit(d.lm, state, {}); G.openTable(true); return; }
    const r = G.places.visit(d.lm, state, { night: tod.night > 0.45, calm: G.weather.calm > 0.5, still: G.weather.storm < 0.3, tide: tideAt(), mara: true });   // still: the Two Players play on any night without a storm
    if (!r) return;
    if (r.clue) G.seeClue(r.clue);   // the ledger takes it; no popup (docs/WORLD_REDESIGN.md 6.7)
    const demo = window.__BUILD === 'demo';
    let text = r.dark && demo ? r.text.split('. ')[0] + '.' : r.text;
    const bits = [];
    if (r.gold) { const g = Math.round((r.gold[0] + Math.random() * (r.gold[1] - r.gold[0])) * (r.first ? 1 : G.ship.mods.lootMul)); state.gold += g; bits.push(`+${g} gold`); G.audio.play('treasure'); }
    if (r.ammo) { state.ammo += r.ammo; bits.push(`+${r.ammo} cannonballs`); }
    if (r.heal && state.hp < G.ship.mods.maxHp) { state.hp = G.ship.mods.maxHp; bits.push('hull mended'); }
    if (r.fruit) { const f = 'mango'; state.fruit[f] = (state.fruit[f] || 0) + r.fruit; bits.push(`+${r.fruit} ${plural(fruitName(f, 0), r.fruit)}`); }
    if (r.chart) { let n = 0; for (const id of r.chart) { const l = LM[id], [cx, cz] = l.key.split(',').map(Number), o = G.world.desc(cx, cz); if (o && !state.discovered[o.id]) { state.discovered[o.id] = { name: o.name, type: o.type, x: Math.round(o.x), z: Math.round(o.z) }; n++; } } if (n) bits.push(`${n} new ${n === 1 ? 'place' : 'places'} on your chart`); }
    if (r.around) { const n = G.revealAround(d.x, d.z); if (n) bits.push(`${n} ${n === 1 ? 'isle' : 'isles'} charted`); }
    if (d.lm === 'keeper' && oilOn() && state.oil < oilCap(state.upgrades) - 1) { state.oil = oilCap(state.upgrades); bits.push('Wick fills your lamp'); }
    if (r.oil && oilOn() && state.oil < oilCap(state.upgrades) - 1) { state.oil = oilCap(state.upgrades); bits.push('the lamp is filled'); }
    { const w = regionAt(d.x, d.z, state.seed);   // the sea chest: things found ashore (src/chest.js)
      if (d.lm === 'ribs' && r.first) chestAdd('leadline', w);
      else if (d.lm === 'ribs' && !r.nothing) chestAdd('ribsfigure', w);
      if (d.lm === 'cup' && !r.first && r.nothing && r.clue) chestAdd('cup', w);
      if (d.lm === 'keeper' && !r.first && state.hut && state.hut.rolls.length) chestAdd('slips', w);   // lore micro 2: left on Wick's step
      if ((d.lm === 'teo' || d.lm === 'ilse') && r.nothing && r.clue && state.story.lm2 && state.story.lm2[d.lm]) chestAdd('cayssails', w); }
    if (r.note) state.notes.push({ text: r.note, dark: false });
    toast(text + (bits.length ? ` (${bits.join(', ')})` : ''), !!r.dark && !demo, 9000);
    if (r.first) state.stats.places = (state.stats.places || 0) + 1;
  } };
}
