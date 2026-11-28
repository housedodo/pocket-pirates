// Trade runs (owner, 2026-11-23, "do 7"): each water makes one thing cheaply and wants another dearly, and the prices drift by the week.
// Bought and sold at a harbour's market, a crate at a time, carried in the hold (room: HOLD + more with a better hull). Word of a good
// price is heard on the pier (`tradeRumour`), never shown on the chart. The Drowned take no coin (their market is its own) and Tama
// trades like anywhere. Full game only. Numbers are here; the market rows are in ui/harbour.js.
import { state } from '../core/state.js';
import { hash2, mulberry32 } from '../util.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const GOODS = {
  cloth: { name: 'Bolts of cloth', one: 'cloth', from: 'crown', base: 22 },
  coir:  { name: 'Coir rope', one: 'coir rope', from: 'free', base: 18 },
  // spices (owner, 2026-11-24: "spices are only available in specific spots"): never sold at a market, only found (systems/spice.js);
  // wanted dear in their waters, and the Guild pays well for any
  pepper:   { name: 'Pepper', one: 'pepper', found: true, base: 46, wanted: ['crown', 'lantern'] },
  saffron:  { name: 'Saffron', one: 'saffron', found: true, base: 70, wanted: ['crown'] },
  clove:    { name: 'Cloves', one: 'cloves', found: true, base: 52, wanted: ['reef', 'lantern'] },
  bluesalt: { name: 'Blue salt', one: 'blue salt', found: true, base: 90, wanted: ['crown', 'free', 'reef', 'lantern', 'home'] },
  rum:   { name: 'Casks of rum', one: 'rum', from: 'reef', base: 20 },
  // fine goods (owner, 2026-11-25: "special ones when the harbour is thriving"): sold only by a thriving harbour of their water (FEEL.luxury),
  // and wanted dear everywhere else: a reason to keep a harbour well
  silver:  { name: 'Crown silver plate', one: 'silver plate', from: 'crown', base: 62, luxury: true },
  tobacco: { name: 'Cays tobacco', one: 'tobacco', from: 'free', base: 40, luxury: true },
  powder:  { name: 'Reef powder', one: 'powder', from: 'reef', base: 46, luxury: true },
  candles: { name: 'Guild candles', one: 'candles', from: 'lantern', base: 34, luxury: true },
  linen:   { name: 'Tama linen', one: 'linen', from: 'home', base: 30, luxury: true },
  glass: { name: 'Lamp glass', one: 'glass', from: 'lantern', base: 24 },
  salt:  { name: 'Salt', one: 'salt', from: 'home', base: 14 },
};
export const WANTS = { crown: 'coir', free: 'cloth', reef: 'salt', lantern: 'rum', home: 'glass' };
export const MADE_MUL = 0.55, WANT_MUL = 1.75, DRIFT = 0.22, SELL_CUT = 0.9;   // made here: cheap; wanted here: dear; the weekly drift; what you get back of a price
export const HOLD = 4, HOLD_HULL = 2;     // crates the hold takes, and more per hull level
export const RUMOUR_P = 0.3;

export const tradeOn = (d) => !DEMO() && d && d.region !== 'drowned';
const week = () => Math.floor((state.dayN || 0) / 7);
const drift = (region, good) => 1 + (mulberry32(hash2(week(), region.length * 31 + good.length, (state.seed || 1) + 77))() - 0.5) * 2 * DRIFT;
// the market remembers (owner, 2026-11-28: "selling lowers the local price and it recovers over days"): each crate sold in a water
// pushes that good's price there down, each bought pushes it up; the push fades by RECOVER a day. Kept per water (state.story.market).
export const SELL_PUSH = 0.07, BUY_PUSH = 0.05, PUSH_MIN = -0.45, PUSH_MAX = 0.4, RECOVER = 0.06;
const today = () => (state.dayN || 0) + (state.time || 0);
const mkt = () => state.story.market || (state.story.market = {});
export function pressure(region, good) {
  const m = mkt()[region + ':' + good]; if (!m) return 0;
  const fade = RECOVER * Math.max(0, today() - m.day), v = Math.sign(m.v) * Math.max(0, Math.abs(m.v) - fade);
  return v;
}
function push(region, good, dv) { const v = Math.max(PUSH_MIN, Math.min(PUSH_MAX, pressure(region, good) + dv)); mkt()[region + ':' + good] = { v, day: today() }; }
/** the price of one crate of `good` in a harbour of `region`, this week, after what the captain has bought and sold there */
export function price(region, good) { return Math.max(2, Math.round(basePrice(region, good) * (1 + pressure(region, good)))); }
function basePrice(region, good) {
  const G = GOODS[good];
  if (G.found) return Math.max(2, Math.round(G.base * ((G.wanted || []).includes(region) ? 1.6 : 0.8) * (region === 'lantern' ? 1.25 : 1) * drift(region, good)));   // spice: only sold, never bought
  if (G.luxury) return Math.max(2, Math.round(G.base * (G.from === region ? 0.8 : 1.5) * drift(region, good)));
  const k = G.from === region ? MADE_MUL : WANTS[region] === good ? WANT_MUL : 1;
  return Math.max(2, Math.round(G.base * k * drift(region, good)));
}
export const sellPrice = (region, good) => Math.max(1, Math.round(price(region, good) * SELL_CUT));
export const cargo = () => { const c = state.story.cargo || (state.story.cargo = {}); if (c.spice) { c.pepper = (c.pepper || 0) + c.spice; delete c.spice; } return c; };   // (saves from before the spices carried 'spice')
export const carried = () => Object.values(cargo()).reduce((a, b) => a + b, 0);
export const room = () => HOLD + HOLD_HULL * ((state.upgrades && state.upgrades.hull) || 0);
export function buy(region, good, mul = 1) {
  if (GOODS[good].found) return 0;
  const p = Math.ceil(price(region, good) * mul);
  if (state.gold < p || carried() >= room()) return 0;
  state.gold -= p; cargo()[good] = (cargo()[good] || 0) + 1; push(region, good, BUY_PUSH); return p;
}
export function sellAll(region, good, mul = 1) {
  const n = cargo()[good] || 0; if (!n) return 0;
  let g = 0; for (let i = 0; i < n; i++) { g += sellPrice(region, good) * mul; push(region, good, -SELL_PUSH); }   // each crate sold lowers the next one's price
  g = Math.round(g); state.gold += g; delete cargo()[good];
  state.stats.trades = (state.stats.trades || 0) + n; return g;
}
const RNAME = { crown: 'the Crown harbours', free: 'the Cays', reef: 'the Reef', lantern: 'the Guild harbours', home: 'Tama' };
const LINES = [
  (g, r) => `${g} is fetching a fine price in ${r} this week. Somebody will get rich, and it will not be me.`,
  (g, r) => `They say ${r} cannot get enough ${g} just now.`,
  (g, r) => `If you have any ${g}, take it to ${r}. Not here. We are drowning in it.`,
];
/** a voice on the pier at harbour d: where something sells well this week (the best gain from here), or null */
export function tradeRumour(d) {
  if (!tradeOn(d) || Math.random() >= RUMOUR_P) return null;
  let best = null;
  for (const good of Object.keys(GOODS).filter((g) => !GOODS[g].found && !GOODS[g].luxury)) for (const r of Object.keys(RNAME)) {
    if (r === d.region) continue;
    const gain = sellPrice(r, good) - price(d.region, good);
    if (!best || gain > best.gain) best = { gain, good, r };
  }
  if (!best || best.gain < 8) return null;
  const line = LINES[Math.floor(Math.random() * LINES.length)](GOODS[best.good].one, RNAME[best.r]);
  return { speaker: 'docker', text: line.charAt(0).toUpperCase() + line.slice(1) };
}
