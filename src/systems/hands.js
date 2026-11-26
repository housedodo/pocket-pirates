// Specialist hands (owner, 2026-11-24: "crew specializing", "prerequisites to get a crewmember: fight raiders, trade, and so on",
// "people won't trust me, but a special crewmember for hints"). Six people who will only sign on once the captain has done something
// they respect; each has one job. Two aboard at most (state.story.hands[id] = { aboard: true } or { at: harbourId } when left ashore).
// They are signed on at the tavern (ui/harbour.js, AT THE TABLES) of the kind of harbour they live in. A sullen crew can lose one at the
// next harbour (voyage.js voyageDock); they wait there to be signed on again. Full game only. Names and lines are drafts.
import { state } from '../core/state.js';
import { REEFS_ON } from '../core/config.js';
import { G } from '../core/runtime.js';
import { toast } from '../ui/dom.js';
import { pxi } from '../pixelui.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const HANDS_MAX = 2;
const deliveriesIn = (region) => Object.entries(state.rep || {}).reduce((a, [id, r]) => { const [cx, cz] = id.split(',').map(Number), d = G.world && G.world.desc(cx, cz); return a + (d && d.region === region ? r.deliveries || 0 : 0); }, 0);
const deliveries = () => Object.values(state.rep || {}).reduce((a, r) => a + (r.deliveries || 0), 0);
export const HANDS = {
  gunner: { name: 'Bram Hask', job: 'gunner', where: 'reef', text: 'reloads faster, and reads what a raider wants before she says it',
    earned: () => (state.stats.sunk || 0) + (state.stats.boarded || 0) >= 3, how: 'Sink or take three raiders.',
    hello: '"I watched you take that last one. I have done this before. Do you want me or not?"' },
  trader: { name: 'Odile Marr', job: 'trader', where: 'crown', text: 'a better price on every crate, and word of where goods are wanted',
    earned: () => (state.stats.trades || 0) >= 10, how: 'Run ten crates of cargo.',
    hello: '"You buy cheap and sell dear. Mostly. I can make it always."' },
  spicer: { name: 'Old Tansy', job: 'herbalist', where: 'free', text: 'knows where spice grows, and can find it ashore',
    earned: () => (state.story.crews && state.story.crews.beggars && state.story.crews.beggars.helped >= 1) || deliveriesIn('free') >= 3, how: 'Do the Cays a kindness.',
    hello: '"You were kind to people who could not pay you. I can smell pepper from the beach. Take me with you."' },
  pilot: { name: 'Juno Cray', job: 'pilot', where: null, text: 'knows the shallows: the Gull can edge further in before her keel touches',
    earned: () => (state.story.grounded || 0) >= 2, how: 'Run aground, twice, and come back.', off: () => !REEFS_ON,   // no shallows for now: she waits for the reefs (core/config.js)
    hello: '"Twice aground and you still have a ship. Let me stand at the bow."' },
  diver: { name: 'Teodor Sill', job: 'diver', where: 'reef', text: 'goes down with the bell: half again as much air',
    earned: () => (state.stats.dives || 0) >= 3, how: 'Go down in the bell three times.',
    hello: '"Three times down and you came up each time. I like the odds."' },
  gobetween: { name: 'Ines Wick', job: 'go-between', where: 'home', text: 'goes ashore where they will not talk to you, and comes back with what they said',
    earned: () => deliveries() >= 6, how: 'Make six deliveries.',
    hello: '"My uncle keeps the light at the Rock. People talk to me. They have stopped talking to you, have you noticed?"' },
};
const H = () => state.story.hands || (state.story.hands = {});
export const handOn = (id) => !DEMO() && !!(H()[id] && H()[id].aboard);
export const handsAboard = () => Object.keys(HANDS).filter(handOn);
/** main.js refreshMods: what the hands change in the ship's numbers */
export function handMods(m) { if (handOn('gunner')) m.reload *= 0.8; return m; }
const hereOK = (id, d) => { const h = H()[id]; if (h && h.at) return h.at === d.id; const w = HANDS[id].where; return !w || w === d.region || (w === 'home' && d.id === '0,-1'); };
/** the tavern's rows (ui/harbour.js): who is here to sign on, who can be left here */
export function handRows(d) {
  if (DEMO()) return '';
  let html = '';
  for (const [id, h] of Object.entries(HANDS)) {
    if (h.off && h.off()) continue;
    const on = handOn(id), here = !on && h.earned() && hereOK(id, d);
    if (on) html += `<div class="qrow"><div><b>${pxi('talk')} ${h.name}, ${h.job}</b><br><small>aboard · ${h.text}</small></div><button data-handleave="${id}">Leave ashore</button></div>`;
    else if (here) html += `<div class="qrow"><div><b>${pxi('talk')} ${h.name}, ${h.job}</b><br><small>${h.text}</small></div><button data-handon="${id}" ${handsAboard().length >= HANDS_MAX ? 'disabled title="Two specialists aboard already"' : ''}>Sign on</button></div>`;
  }
  return html ? '<div class="sec">SPECIALISTS</div>' + html : '';
}
export function bindHandRows(pane, d, rerender) {
  pane.querySelectorAll('[data-handon]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.handon, h = HANDS[id]; if (handsAboard().length >= HANDS_MAX) return;
    const first = !H()[id]; H()[id] = { aboard: true, day: state.dayN };
    G.audio.play('buy'); toast(first ? `${h.name}: ${h.hello}` : `${h.name} comes back aboard without a word about it.`, false, 7000);
    if (G.refreshMods) G.refreshMods(); rerender();
  }));
  pane.querySelectorAll('[data-handleave]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.handleave; H()[id] = { at: d.id, day: state.dayN };
    toast(`${HANDS[id].name} goes ashore here, to wait.`, false, 4000); if (G.refreshMods) G.refreshMods(); rerender();
  }));
}
/** voyage.js: a sullen crew loses a specialist at this harbour (after the hired hands) */
export function handLeaves(d) {
  const on = handsAboard(); if (!on.length) return null;
  const id = on[Math.floor(Math.random() * on.length)]; H()[id] = { at: d.id, day: state.dayN };
  if (G.refreshMods) G.refreshMods();
  return `${HANDS[id].name} has had enough of this voyage and goes ashore here. ${HANDS[id].name} might come back, if things were better aboard.`;
}
/** which specialists could be earned next (for the Ship's book: one plain line each, never a count) */
export function handsHint() { return Object.entries(HANDS).filter(([id, h]) => !H()[id] && !h.earned() && !(h.off && h.off())).map(([, h]) => h.how); }
