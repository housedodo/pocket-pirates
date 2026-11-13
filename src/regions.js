// The rules of each region's waters (2026-11-13, owner; docs/proposals/REGIONS.md). Each region is played differently, and every rule
// says something about the place without a word: the Crown writes you down, the Cays keep quiet at night, the Reef keeps the ships
// that come, the Lantern Guild must keep its lights lit, the Drowned sea breathes. The looks that announce them are regionlook.js and
// regiondecor.js. Numbers live here; the systems that use them are named next to each one.
import { sectorAt } from './sectors.js';

/** whose waters (x, z) are: 'crown' | 'free' | 'reef' | 'lantern' | 'drowned'; Tama's own sector counts as home */
export const regionAt = (x, z, seed) => { const s = sectorAt(x, z, seed); return s.sx === 0 && s.sz === 0 ? 'home' : s.faction.id; };

// ---- what a harbour's market pays and charges (ui/harbour.js market)
const isNight = (hour) => hour >= 19 || hour < 5;
/** the sale price of fish or fruit here: each region pays more for what it lacks; the Cays' market is busiest at night */
export function sellMul(d, kind, hour) {
  const r = d.region;
  if (r === 'crown' && kind === 'fruit') return 1.5;     // the Crown towns grow nothing
  if (r === 'lantern' && kind === 'fish') return 1.5;    // the Guild's people tend lamps, not nets
  if (r === 'free' && isNight(hour)) return 1.4;         // the night market (the Cays sleep by day)
  return 1;
}
/** what is cheap here: the Reef has powder and sailcloth off every wreck */
export const buyMul = (d, kind) => (d.region === 'reef' && (kind === 'ammo' || kind === 'kit') ? 0.6 : 1);
/** a short line under the market's SELL heading, or '' */
export function marketNote(d, hour) {
  if (d.region === 'crown') return 'Fruit fetches half again as much here.';
  if (d.region === 'lantern') return 'Fish fetches half again as much here.';
  if (d.region === 'free') return isNight(hour) ? 'The night market: fish and fruit fetch more after dark.' : 'The stalls are shuttered. The market here opens after dark.';
  if (d.region === 'reef') return 'Powder and sailcloth are cheap here: off the wrecks.';
  return '';
}

// ---- the Free Cays: the dark keeps quiet while somebody plays (traffic.js)
/** the chance that a spawned ship in these waters is a raider; the Reef always, the Cays only by day */
export function raiderChance(faction, hour) {
  if (faction === 'reef') return 0.22;
  if (faction === 'free') return isNight(hour) ? 0 : 0.1;
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
export function jobPay(state, j, toRegion) {
  let pay = j.reward;
  if (j.due != null) pay *= nowD(state) <= j.due ? 1.45 : 0.55;
  if (j.fromRegion === 'crown' || toRegion === 'crown') pay *= recordMul(crownRec(state));
  return Math.round(pay);
}
/** the record as a row of marks, no words: a tick per clean line (up to 8), a dark mark per black one */
export const recordMarks = (state, pxi) => { const r = crownRec(state); return pxi('check').repeat(Math.min(8, r.clean)) + '<i class="blackline"></i>'.repeat(r.black); };
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
  if (state.catch.length) return { label: 'one of your fish', take: () => state.catch.splice(0, 1) };
  const fr = Object.entries(state.fruit).find(([, n]) => n > 0);
  if (fr) return { label: 'some of your fruit', take: () => { state.fruit[fr[0]]--; } };
  if (state.loot.length) { const l = state.loot[state.loot.length - 1]; return { label: l.name.replace(/^From the [a-z ]+: /, '').toLowerCase(), take: () => state.loot.pop() }; }
  return null;
}
