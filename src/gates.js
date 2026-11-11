// The interface opens up with the story. At the start only what the current quest needs can be clicked; every other sign,
// button and log tab is greyed out and only answers with a short line, and each opens when the quest that first needs it comes up (the number
// is the index of that main goal in MAIN_GOALS, i.e. how many main goals are done). Once every main goal is done, all is open.
// Story moments (a letter, a line on the pier, a pet, the grey buyer) are never locked: they only appear when they matter.
import { MAIN_GOALS } from './objectives.js';
import { isKnown } from './clues.js';

const GATE = {
  // harbour signs
  tab: { board: 0, wright: 3, market: 4, tavern: 9, sail: 0 },
  // harbour buttons, by id
  btn: {
    jobAccept: 6, doDeliver: 6, doDropoff: 6,     // deliveries: "Odd jobs"
    takePass: 7,                                   // passengers
    sellFish: 4, sellFruit: 4, askFish: 8,         // the market: fish from "Dead calm" on; the fishers talk once you chart
    buyChart: 8,                                   // charts with "Chart 8 islands"
    hireHand: 9, playPig: 9, haggle: 9,            // the tavern and haggling (chapter III)
    rumourBuy: 10, buyAmmo: 9,                     // rumours with Perrin's note; cannonballs once cannons are yours
    restBed: 9,                                    // a bed for the night, with the tavern
    openYard: 7,                                   // paint and figureheads a little after the first upgrade
  },
  // harbour buttons, by data attribute (commissions)
  data: { accept: 9, hand: 9, dismiss: 9 },   // commissions open with the tavern chapter (Odd jobs is an optional goal now)
  // captain's log tabs
  log: { map: 0, goals: 0, journal: 2, riddles: 2, ship: 3, quests: 6, standing: 6 },
};

/** is this part of the interface open yet? kind: 'tab' | 'btn' | 'data' | 'log', or 'know': a capability the captain has SEEN the
 *  clue for (clues.js), the second gate kind: what the world has shown you opens controls, not a quest index */
export function isOpen(state, kind, key) {
  if (kind === 'know') return isKnown(state, key);
  const n = GATE[kind] && GATE[kind][key];
  if (n == null) return true;
  const i = (state.goals && state.goals.i) || 0;
  return i >= n || i >= MAIN_GOALS.length;
}

// a locked control stays readable and still takes a click, so main.js can answer it with one line (it never runs its own handler)
const lock = (el) => { el.disabled = false; el.setAttribute('aria-disabled', 'true'); el.classList.add('locked'); el.title = 'Not yet'; };
/** grey out and disable every locked button inside a rendered pane */
export function lockPane(state, pane) {
  for (const id of Object.keys(GATE.btn)) {
    const el = pane.querySelector(`#${id}`);
    if (el && !isOpen(state, 'btn', id)) lock(el);
  }
  for (const attr of Object.keys(GATE.data)) {
    if (isOpen(state, 'data', attr)) continue;
    pane.querySelectorAll(`[data-${attr}]`).forEach(lock);
  }
}
