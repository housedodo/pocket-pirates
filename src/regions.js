// The rules of each region's waters (2026-11-13, owner; docs/proposals/REGIONS.md). Each region is played differently, and every rule
// says something about the place without a word: the Crown writes you down, the Cays keep quiet at night, the Reef keeps the ships
// that come, the Lantern Guild must keep its lights lit, the Drowned sea breathes. The looks that announce them are regionlook.js and
// regiondecor.js. Numbers live here; the systems that use them are named next to each one.
import { sectorAt } from './sectors.js';

/** whose waters (x, z) are: 'crown' | 'free' | 'reef' | 'lantern' | 'drowned'; Tama's own sector counts as home */
export const regionAt = (x, z, seed) => { const s = sectorAt(x, z, seed); return s.sx === 0 && s.sz === 0 ? 'home' : s.faction.id; };

// ---- Home Sound: what is learnt near home is used far out (REGIONAL_CATALOGUE M-HOME-1..3, P-HOME-2, P-HOME-4; owner 2026-11-17)
export const TAMA_ID = '0,-1';
export const HOME_SOUND_R = 450;    // Home Sound's reach from Tama (systems/home.js HOME_R)
export const GULLS_HOME_R = HOME_SOUND_R;   // M-HOME-3: inside it the dusk gulls fly to Tama's harbour (dawn: out from it), not the nearest land (secrets.js)
export const GULLS_HOME_EDGE = 60;   // and they cross open water from 60 off any shore (120 elsewhere): the Sound is small, the lesson must show
// M-HOME-1 the noon slack: from 11:30 to 12:30 within the bell's reach the hush holds for the hour (systems/home.js, seaplay.js)
export const SLACK_FROM = 11.5, SLACK_TO = 12.5, SLACK_LANES = 0.5;   // hours; the Sound's current lanes run at half strength
// M-HOME-2 the fishers' marks (systems/homemarks.js, fishing.js)
export const MARK_R = 12, MARK_WAIT = 0.7, MARK_FISH = ['snapper', 'bream', 'grouper'];
export const MARK_OUT = 6, MARK_HOME = 15, MARK_SAIL = 1.5;   // the boats lie on their marks from 06:00 to 15:00; an hour and a half each way

// ---- what a harbour's market pays and charges (ui/harbour.js market)
const isNight = (hour) => hour >= 19 || hour < 5;
/** the Cays are quiet while somebody plays (task L5, CANON 2026-11-12): everything safe about their night follows the music
 *  (lull: rt.lullK, systems/lullaby.js), not the hour, so on a storm night nobody plays and the night is unprotected. The demo has
 *  no players: there the hour decides, as it always did. */
export const CAYS_PLAYING = 0.5;
export const caysQuiet = (lull, hour, demo) => (demo ? isNight(hour) : lull > CAYS_PLAYING);
/** the sale price of fish or fruit here: each region pays more for what it lacks; the Cays' market is busiest while they play. quiet: caysQuiet() */
export function sellMul(d, kind, quiet) {
  const r = d.region;
  if (r === 'crown' && kind === 'fruit') return 1.5;     // the Crown towns grow nothing
  if (r === 'lantern' && kind === 'fish') return 1.5;    // the Guild's people tend lamps, not nets
  if (r === 'free' && quiet) return 1.4;                 // the night market (the Cays sleep by day)
  return 1;
}
/** what is cheap here: the Reef has powder and sailcloth off every wreck */
export const buyMul = (d, kind) => (d.region === 'reef' && (kind === 'ammo' || kind === 'kit') ? 0.6 : 1);
/** a short line under the market's SELL heading, or '' */
export function marketNote(d, quiet) {
  if (d.region === 'crown') return 'Fruit fetches half again as much here.';
  if (d.region === 'lantern') return 'Fish fetches half again as much here.';
  if (d.region === 'free') return quiet ? 'The night market: fish and fruit fetch more after dark.' : 'The stalls are shuttered. The market here opens after dark. Most nights.';
  if (d.region === 'reef') return 'Powder and sailcloth are cheap here: off the wrecks.';
  return '';
}

// ---- the Free Cays: the dark keeps quiet while somebody plays (traffic.js)
/** the chance that a spawned ship in these waters is a raider; the Reef always, the Cays only while nobody plays. quiet: caysQuiet() */
export function raiderChance(faction, quiet) {
  if (faction === 'reef') return 0.22;
  if (faction === 'free') return quiet ? 0 : 0.1;
  return 0;
}

// ---- the Reef: ships come here and stay (main.js salvage, combat)
export const SALVAGE_MUL = { reef: 1.5 };
export const BOUNTY = 40;   // gold for a raider sunk in Reef waters (paid at the next Reef harbour)

// ---- the Crown: a clean record (jobs.js, ui/harbour.js)
/** the pay multiplier from the Crown's shared record: +5% a clean line up to +25%; each black line -15% (never below 0.55) */
export function recordMul(rec) {
  if (!rec) return 1;
  return Math.max(0.55, Math.min(1.25, 1 + 0.05 * Math.min(5, rec.clean || 0) - 0.15 * (rec.black || 0)));
}
/** a Crown delivery's time allowed (game seconds, as on the clock of the voyage): distance / 6 + 60, a good line makes it */
export const deadlineFor = (dist) => Math.round(dist / 6 + 60);
export const PENNANTS = 6;      // M-CROWN-1: a signal mast's pennants; one is struck for each game hour gone on a timed run there (systems/crown.js)
export const TIGHT_DIST = 350;  // P-CROWN-5: the one run whose line is already written is a long one (pier to pier; 118 s allowed)

// ---- the Lantern Guild: the lights must be kept lit (oil.js, ui/harbour.js)
export const OIL_SELL = 0.9;   // what a Lantern harbour pays a unit of oil (Tama sells at OIL_PRICE)
/** the lamp burns half while a lit lighthouse is in sight in Lantern waters, double in the open dark there */
export const lampBurnMul = (region, lighthouseNear) => (region !== 'lantern' ? 1 : lighthouseNear ? 0.5 : 2);

// ---- the Drowned: the sea breathes (main.js, systems/storybeats.js)
export const BELT = [1740, 1800];   // the shoal belt round the Drowned, crossable only at low water

// ---- the Crown's shared record, kept in state.story.crown = { clean, black, lane: { [harbourId]: dayN } }
export const crownRec = (state) => (state.story.crown = state.story.crown || { clean: 0, black: 0, lane: {} });
/** a line in the record: 'clean' or 'black'. Three clean lines in a row wipe out one black one */
export function crownLine(state, kind) {
  const r = crownRec(state);
  if (kind === 'black') { r.black++; r.run = 0; return; }
  r.clean++; r.run = (r.run || 0) + 1;
  if (r.run >= 3 && r.black > 0) { r.black--; r.run = 0; }
}
/** the day clock of the voyage (days, fractional): the deadlines are kept in it, so a save keeps them */
export const nowD = (state) => state.dayN + state.time;
export const DAY_SECONDS = 690;   // daynight.js DAY_LENGTH
/** a day-clock moment as the hour on the harbour clock, '14:30' */
export const clockAt = (d) => { const h = ((d % 1) + 1) % 1 * 24; return `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`; };
/** take a delivery: a timed one gets its deadline now */
export function takeJob(state, j) { if (j.timed) j.due = nowD(state) + j.timed / DAY_SECONDS; return j; }
/** a delivery's pay when it is handed in: a Crown deadline (on time 1.45x, late 0.55x) and the Crown's record for anything to or from it */
/** a Crown delivery is on time up to 15 game seconds past its deadline (G-33: the formula stays, the grace forgives a last tack) */
export const DUE_GRACE = 15;
export const onTime = (state, j) => j.due == null || nowD(state) <= j.due + DUE_GRACE / DAY_SECONDS;
export function jobPay(state, j, toRegion) {
  let pay = j.reward;
  if (j.due != null) pay *= onTime(state, j) ? 1.45 : 0.55;
  if (j.fromRegion === 'crown' || toRegion === 'crown') pay *= recordMul(crownRec(state));
  return Math.round(pay);
}
/** the record as a row of marks, no words: a tick per clean line (up to 8), a dark mark per black one. ahead (the `arrivals`
 *  capability, clue CL-C1-a: the ledger had the name before the ship came): the next line is already there, faint, before it is earned */
export const recordMarks = (state, pxi, ahead = false, aheadBlack = false) => { const r = crownRec(state); return pxi('check').repeat(Math.min(8, r.clean)) + (state.story.lineStruck ? '<i class="blackline struck"></i>' : '') + '<i class="blackline"></i>'.repeat(r.black) + (ahead ? `<span class="ahead">${aheadBlack ? '<i class="blackline"></i>' : pxi('check')}</span>` : ''); };   // aheadBlack: P-CROWN-5, the line already written (systems/crown.js); struck: it was beaten
/** a Crown harbour you sail into between its buoys: one clean line a day per harbour (main.js, on docking) */
export function laneArrival(state, d, came) {
  if (d.region !== 'crown' || !came || came.id !== d.id) return false;
  const r = crownRec(state); if (r.lane[d.id] === state.dayN) return false;
  r.lane[d.id] = state.dayN; crownLine(state, 'clean'); return true;
}
/** is the ship in a Crown harbour's buoyed lane right now? (between the buoys, 10 to 70 out from the pier head) */
export function inLane(d, x, z, shoreR) {
  if (!d || d.region !== 'crown' || d.type !== 'harbour') return false;
  const dx = x - d.x, dz = z - d.z, th = Math.atan2(dz, dx), off = Math.atan2(Math.sin(th - d.dockTh), Math.cos(th - d.dockTh));
  const out = Math.hypot(dx, dz) - shoreR(d, d.dockTh), side = Math.sin(off) * Math.hypot(dx, dz);
  return out > 8 && out < 75 && Math.abs(side) < 8.5;
}

// ---- the Lantern Guild's dead lights: half its lighthouses are dark at night until a captain brings oil (main.js relight)
export const RELIGHT_OIL = 30, RELIGHT_PAY = 30;
/** is this lighthouse one of the Guild's dead lights tonight? (state.story.relit[id] = the night it was lit again) */
export function lampDead(state, d, night) {
  if (d.region !== 'lantern' || !d.lampAt || d.lm) return false;
  if (((d.seed * 2654435761) >>> 0) % 100 >= 50) return false;
  return !(state.story.relit && state.story.relit[d.id] === night);
}

// ---- the Drowned's harbours take no coin: what they keep from the hold (ui/harbour.js). The first thing that comes to hand:
// a fish, then fruit, then the newest treasure. Null when the hold is empty.
export function drownedTake(state) {
  if (state.catch.length) return { label: 'one of your fish', take: () => keep(state, { fish: state.catch.splice(0, 1)[0] }) };
  const fr = Object.entries(state.fruit).find(([, n]) => n > 0);
  if (fr) return { label: 'some of your fruit', take: () => { state.fruit[fr[0]]--; keep(state, { fruit: fr[0] }); } };
  if (state.loot.length) { const l = state.loot[state.loot.length - 1]; return { label: l.name.replace(/^From the [a-z ]+: /, '').toLowerCase(), take: () => keep(state, { loot: state.loot.pop() }) }; }
  return null;
}
// what they kept comes back (task L8): the very things, each once, out of the deep (abyss.js wrongCatch, wrongLoot). No word about it.
export const KEPT_MAX = 12;
function keep(state, it) { const k = state.story.drownedKept; k.push(it); if (k.length > KEPT_MAX) k.shift(); }
/** take back the oldest kept thing of a kind ('fish', or 'hold' for fruit and treasure); null when they hold none */
export function keptBack(state, kind) {
  const k = state.story.drownedKept || [], i = k.findIndex((it) => (kind === 'fish' ? it.fish : it.fruit || it.loot));
  return i < 0 ? null : k.splice(i, 1)[0];
}
