// The interface opens up with the story. At the start only what the current quest needs can be clicked; every other sign,
// button and log tab is greyed out and only answers with a short line, and each opens when the quest that first needs it comes up (the id
// of that main goal in MAIN_GOALS: it opens once the chain reaches that goal). Once every main goal is done, all is open.
// Story moments (a letter, a line on the pier, a pet, the grey buyer) are never locked: they only appear when they matter.
import { MAIN_GOALS, goalIdx } from './objectives.js';
import { isKnown } from './clues.js';

const GATE = {
  // harbour signs
  tab: { board: 'sail', wright: 'upgrade', market: 'calm', tavern: 'tavern', sail: 'sail' },
  // harbour buttons, by id
  btn: {
    jobAccept: 'job', doDeliver: 'job', doDropoff: 'job',      // deliveries: "Earn your keep"
    takePass: 'passenger',                                     // passengers
    sellFish: 'calm', sellFruit: 'calm', askFish: 'chart',     // the market: fish from "Dead calm" on; the fishers talk once you chart
    buyChart: 'chart',                                         // charts with "Chart the sea"
    hireHand: 'tavern', playPig: 'tavern', haggle: 'tavern',   // the tavern and haggling (chapter III)
    rumourBuy: 'perrin', buyAmmo: 'tavern',                    // rumours with Perrin's note; cannonballs once cannons are yours
    restBed: 'tavern',                                         // a bed for the night, with the tavern
    openYard: 'passenger',                                     // paint and figureheads a little after the first upgrade
  },
  // harbour buttons, by data attribute (commissions)
  data: { accept: 'tavern', hand: 'tavern', dismiss: 'tavern' },   // commissions open with the tavern chapter (Odd jobs is an optional goal now)
  // captain's log tabs
  log: { map: 'sail', goals: 'sail', journal: 'dig', riddles: 'dig', ship: 'upgrade', quests: 'job', standing: 'job' },
};

/** is this part of the interface open yet? kind: 'tab' | 'btn' | 'data' | 'log', or 'know': a capability the captain has SEEN the
 *  clue for (clues.js), the second gate kind: what the world has shown you opens controls, not a quest index */
export function isOpen(state, kind, key) {
  if (kind === 'know') return isKnown(state, key);
  const n = GATE[kind] && GATE[kind][key];
  if (n == null) return true;
  const i = (state.goals && state.goals.i) || 0;
  return i >= goalIdx(n) || i >= MAIN_GOALS.length;
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
