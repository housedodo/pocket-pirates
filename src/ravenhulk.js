import { buildRaven } from './ravenship.js';

// THE EMPTY RAVEN (CANON 2026-11-18): the ship of a captain who went to the hut on purpose, saw his fate sealed there and refused to throw.
// It floats in Reef water, lit and empty, a hand above the sea, and never moves. Nobody is aboard. E brings the ship alongside and opens
// the one page on the desk: dates, a figure beside each (a number from 1 to 20), the last date with none. Nothing is explained.
// Read once: the page goes into the Ship's book and the clue ledger; Mara makes her one offhand joke. After that the desk is bare.
// Not a thread (no Tide, no marks); full game only, and only once the die is known (a throw at the hut). The look is ravenship.js.

const D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** the page: day, weekday and number as the Ship's book writes them; the last day has no number */
export const RAVEN_PAGE = [['Sun 4', 11], ['Mon 5', 7], ['Tue 6', 16], ['Thu 8', 3], ['Fri 9', 18], ['Sat 10', 12], ['Mon 12', 20], ['Wed 14', 5], ['Thu 15', null]];
export const RAVEN_CLUE = 'CL-RAV-a';
export const RAVEN_JOKE = 'Hard to sail a boat without crew, Captain.';   // draft: the owner's wording, said once

const LEAVE = [{ label: 'Step back', go: () => '' }];   // a card needs one choice to be closed
const rowsHTML = () => '<div style="max-width:380px;display:flex;flex-direction:column">' + RAVEN_PAGE.map(([d, n]) =>
  `<div style="display:flex;gap:10px;align-items:baseline"><span>${d}</span><span style="flex:1;border-bottom:3px dotted #8a7a60;transform:translateY(-6px)"></span><span style="min-width:34px;text-align:right">${n == null ? '' : n}</span></div>`).join('') + '</div>';

export function ravenHulk(hub) {
  const tp = hub.tp('raven', { read: false });
  const site = () => hub.pick('raven', 1500, 2000);
  const open = (api) => {
    if (tp.read) { api.openCard({ title: '', icon: 'letter', text: 'The lamps burn. The desk is bare, a clean square of wood where something lay.', choices: LEAVE }); return; }
    tp.read = true;
    api.seeClue(RAVEN_CLUE);
    api.keep('ravenpage', 'A page of dates', 'Dates in a stranger’s hand, a figure beside each. The last has none.');
    api.openCard({ title: '', icon: 'letter', text: '', choices: LEAVE });
    const t = document.getElementById('cardText'); if (t) t.innerHTML = rowsHTML();
    api.after(2.5, () => api.say(RAVEN_JOKE));
  };
  return {
    update({ ship, api }) {
      const s = site(), on = !!(api.state.hut && api.state.hut.rolls && api.state.hut.rolls.length > 0);
      const live = hub.live.get('raven');
      if (!on || D(s, ship.pos) > 520) { if (live) { hub.scene.remove(live); hub.live.delete('raven'); } return; }
      if (!live) hub.live.set('raven', buildRaven(hub.scene, s.x, s.z, 1.1));   // fixed: no bob, no wake, no wobble
    },
    interact({ ship, api }) {
      const s = site();
      if (!(api.state.hut && api.state.hut.rolls && api.state.hut.rolls.length > 0) || D(s, ship.pos) > 40) return null;
      return { key: 'raven', prompt: 'E: come alongside', run: () => open(api) };
    },
  };
}
