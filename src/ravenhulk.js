import { buildRaven } from './ravenship.js';

// THE EMPTY RAVEN (CANON 2026-11-18): the ship of a captain who went to the hut on purpose, saw his fate sealed there and refused to throw.
// It floats in Reef water, lit and empty, a hand above the sea, and never moves. Nobody is aboard. E brings the ship alongside and opens
// the one page on the desk: dates, a figure beside each (a number from 1 to 20), the last date with none. Nothing is explained.
// E is a narrated sequence, not a walk: the camera cuts to the empty ship (alongside, the deck, the cabin door, the desk) while a few short lines
// are read, then the page. Read once: the page goes into the Ship's book and the clue ledger; Mara makes her one offhand joke. After that the desk is bare.
// Not a thread (no Tide, no marks); full game only, and only once the die is known (a throw at the hut). The look is ravenship.js.

const D = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
/** the page: day, weekday and number as the Ship's book writes them; the last day has no number */
export const RAVEN_PAGE = [['Sun 4', 11], ['Mon 5', 7], ['Tue 6', 16], ['Thu 8', 3], ['Fri 9', 18], ['Sat 10', 12], ['Mon 12', 20], ['Wed 14', 5], ['Thu 15', null]];
export const RAVEN_CLUE = 'CL-RAV-a';
export const RAVEN_JOKE = 'Hard to sail a boat without crew, Captain.';   // draft: the owner's wording, said once

const LEAVE = [{ label: 'Step back', go: () => '' }];   // a card needs one choice to be closed
const rowsHTML = () => '<div style="max-width:380px;display:flex;flex-direction:column">' + RAVEN_PAGE.map(([d, n]) =>
  `<div style="display:flex;gap:10px;align-items:baseline"><span>${d}</span><span style="flex:1;border-bottom:3px dotted #8a7a60;transform:translateY(-6px)"></span><span style="min-width:34px;text-align:right">${n == null ? '' : n}</span></div>`).join('') + '</div>';

const RY = 1.1, LIFT_Y = 1.585;   // the model's heading, and its group's height above the sea (ravenship.js: keel clearance + hull)
/** a camera position in the ship's own frame -> world (the ship is turned RY about y at the site) */
const view = (s, [lx, ly, lz], [kx, ky, kz]) => { const c = Math.cos(RY), n = Math.sin(RY), w = (x, z) => [s.x + x * c + z * n, s.z - x * n + z * c];
  const [px, pz] = w(lx, lz), [qx, qz] = w(kx, kz); return { pos: [px, LIFT_Y + ly, pz], look: [qx, LIFT_Y + ky, qz] }; };
const SHOTS = {   // ship-local: alongside from the beam; the open door; the desk
  along: [[-17, 1.6, -1], [0, 4.4, 0]], door: [[0.5, 2.7, -0.4], [-0.4, 2.1, 5.5]], desk: [[-0.3, 3.1, 3.7], [-0.5, 2.3, 5.2]],
};

export function ravenHulk(hub) {
  const tp = hub.tp('raven', { read: false });
  const site = () => hub.pick('raven', 1500, 2000);
  const known = (api) => !!(api.state.hut && api.state.hut.rolls && api.state.hut.rolls.length > 0);
  let camOn = false;
  const cam = (api, k) => { const [a, b] = SHOTS[k]; api.camera(view(site(), a, b)); camOn = true; };
  // the narrator: one card per beat, the camera on the empty ship behind it. A card needs a choice to be closed.
  const beat = (api, shot, text, label, next) => {
    cam(api, shot);
    api.openCard({ title: '', icon: 'letter', text, choices: [{ label, go: () => { if (next) setTimeout(next, 0); return ''; } }] });
  };
  const page = (api) => {
    cam(api, 'desk');
    api.openCard({ title: '', icon: 'letter', text: '', choices: [{ label: 'Step back', go: () => '' }] });
    const t = document.getElementById('cardText'); if (t) t.innerHTML = rowsHTML();
    if (!tp.read) {
      tp.read = true;
      api.seeClue(RAVEN_CLUE);
      api.keep('ravenpage', 'A page of dates', 'Dates in a stranger\u2019s hand, a figure beside each. The last has none.');
      api.after(2.5, () => api.say(RAVEN_JOKE));
    }
  };
  const open = (api) => {
    if (tp.read) return beat(api, 'door', 'The lamps burn. The desk is bare, a clean square of wood where something lay.', 'Step back');
    beat(api, 'along', 'Nobody on deck. The lamps are lit, the hatches shut, a rope coiled flat. The sea does not move her.', 'Come alongside',
      () => beat(api, 'door', 'Nobody in the cabin. A lamp on its beam. On the desk, one page under a lidded pot of ink.', 'Read it', () => page(api)));
  };
  return {
    update({ ship, api }) {
      if (camOn && !api.modal()) { api.camera(null); camOn = false; }   // the card is closed: the camera is the player's again
      const s = site(), on = known(api);
      const live = hub.live.get('raven');
      if (!on || D(s, ship.pos) > 520) { if (live) { hub.scene.remove(live); hub.live.delete('raven'); } return; }
      if (!live) hub.live.set('raven', buildRaven(hub.scene, s.x, s.z, RY));   // fixed: no bob, no wake, no wobble
    },
    interact({ ship, api }) {
      if (!known(api) || D(site(), ship.pos) > 40) return null;
      return { key: 'raven', prompt: 'E: come alongside', run: () => open(api) };
    },
  };
}
