// The interface opens up with the story. At the start only what the current quest needs can be clicked; every other sign,
// button and log tab is greyed out and does nothing, and each opens when the quest that first needs it comes up (the number
// is the index of that main goal in MAIN_GOALS, i.e. how many main goals are done). Once every main goal is done, all is open.
// Story moments (a letter, a line on the pier, a pet, the grey buyer) are never locked: they only appear when they matter.
import { MAIN_GOALS } from './objectives.js';

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
  data: { accept: 12, hand: 12, dismiss: 12 },
  // captain's log tabs
  log: { map: 0, goals: 0, journal: 2, riddles: 2, ship: 3, quests: 6, standing: 6 },
};

/** is this part of the interface open yet? kind: 'tab' | 'btn' | 'data' | 'log' */
export function isOpen(state, kind, key) {
  const n = GATE[kind] && GATE[kind][key];
  if (n == null) return true;
  const i = (state.goals && state.goals.i) || 0;
  return i >= n || i >= MAIN_GOALS.length;
}

/** grey out and disable every locked button inside a rendered pane */
export function lockPane(state, pane) {
  for (const id of Object.keys(GATE.btn)) {
    const el = pane.querySelector(`#${id}`);
    if (el && !isOpen(state, 'btn', id)) { el.disabled = true; el.classList.add('locked'); el.title = 'Not yet'; }
  }
  for (const attr of Object.keys(GATE.data)) {
    if (isOpen(state, 'data', attr)) continue;
    pane.querySelectorAll(`[data-${attr}]`).forEach((el) => { el.disabled = true; el.classList.add('locked'); el.title = 'Not yet'; });
  }
}
