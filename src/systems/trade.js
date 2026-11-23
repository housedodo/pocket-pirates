// Trade runs (owner, 2026-11-23, "do 7"): each water makes one thing cheaply and wants another dearly, and the prices drift by the week.
// Bought and sold at a harbour's market, a crate at a time, carried in the hold (room: HOLD + more with a better hull). Word of a good
// price is heard on the pier (`tradeRumour`), never shown on the chart. The Drowned take no coin (their market is its own) and Tama
// trades like anywhere. Full game only. Numbers are here; the market rows are in ui/harbour.js.
import { state } from '../core/state.js';
import { hash2, mulberry32 } from '../util.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const GOODS = {
  cloth: { name: 'Bolts of cloth', one: 'cloth', from: 'crown', base: 22 },
  spice: { name: 'Spice', one: 'spice', from: 'free', base: 26 },
  rum:   { name: 'Casks of rum', one: 'rum', from: 'reef', base: 20 },
  glass: { name: 'Lamp glass', one: 'glass', from: 'lantern', base: 24 },
  salt:  { name: 'Salt', one: 'salt', from: 'home', base: 14 },
};
export const WANTS = { crown: 'spice', free: 'cloth', reef: 'salt', lantern: 'rum', home: 'glass' };
export const MADE_MUL = 0.55, WANT_MUL = 1.75, DRIFT = 0.22, SELL_CUT = 0.9;   // made here: cheap; wanted here: dear; the weekly drift; what you get back of a price
export const HOLD = 4, HOLD_HULL = 2;     // crates the hold takes, and more per hull level
export const RUMOUR_P = 0.3;

export const tradeOn = (d) => !DEMO() && d && d.region !== 'drowned';
const week = () => Math.floor((state.dayN || 0) / 7);
const drift = (region, good) => 1 + (mulberry32(hash2(week(), region.length * 31 + good.length, (state.seed || 1) + 77))() - 0.5) * 2 * DRIFT;
/** the price of one crate of `good` in a harbour of `region`, this week */
export function price(region, good) {
  const G = GOODS[good], k = G.from === region ? MADE_MUL : WANTS[region] === good ? WANT_MUL : 1;
  return Math.max(2, Math.round(G.base * k * drift(region, good)));
}
export const sellPrice = (region, good) => Math.max(1, Math.round(price(region, good) * SELL_CUT));
export const cargo = () => state.story.cargo || (state.story.cargo = {});
export const carried = () => Object.values(cargo()).reduce((a, b) => a + b, 0);
export const room = () => HOLD + HOLD_HULL * ((state.upgrades && state.upgrades.hull) || 0);
export function buy(region, good, mul = 1) {
  const p = Math.ceil(price(region, good) * mul);
  if (state.gold < p || carried() >= room()) return 0;
  state.gold -= p; cargo()[good] = (cargo()[good] || 0) + 1; return p;
}
export function sellAll(region, good, mul = 1) {
  const n = cargo()[good] || 0; if (!n) return 0;
  const g = Math.round(sellPrice(region, good) * mul * n); state.gold += g; delete cargo()[good];
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
  for (const good of Object.keys(GOODS)) for (const r of Object.keys(RNAME)) {
    if (r === d.region) continue;
    const gain = sellPrice(r, good) - price(d.region, good);
    if (!best || gain > best.gain) best = { gain, good, r };
  }
  if (!best || best.gain < 8) return null;
  const line = LINES[Math.floor(Math.random() * LINES.length)](GOODS[best.good].one, RNAME[best.r]);
  return { speaker: 'docker', text: line.charAt(0).toUpperCase() + line.slice(1) };
}
