// Seen at sea (owner, 2026-11-23, "a creature log, from Dredge's fish book"): what the sea has shown the captain gets a small pencil
// sketch in the Ship's book, the first time, with the day and the water. No count to complete, no reward: a page that fills by looking.
// Two frames stay blank until deep water shows what goes in them (the long shadow under the keel, the cold lights below); they are
// never labelled until then. Fed by fauna.js onSpot (dolphins, turtles, whales, migration, flying fish) and sealife.js (rt.seaSpot:
// weed, a log with its bird, jellyfish). Full game and demo alike, but the demo never reaches the deep two (it has no dread).
import { state } from '../core/state.js';
import { rt, G } from '../core/runtime.js';
import { regionAt } from '../regions.js';

// each sketch: rows of '#' (pencil), '+' (light pencil), '.' (paper)
export const SEALOG = [
  { id: 'dolphins', name: 'Dolphins', note: 'riding the bow wave', rows: ['..........', '....#.....', '...##.....', '.#######..', '##+++++##.', '.######..#', '......#...'] },
  { id: 'flyfish', name: 'Flying fish', note: 'off the bow, all at once', rows: ['..........', '.#....#...', '..#..##...', '..######..', '.##++++#..', '...####...', '..........'] },
  { id: 'turtles', name: 'A sea turtle', note: 'slow, and unbothered', rows: ['..........', '..#....#..', '...####...', '.#######..', '.#++++##..', '..####.#..', '.#....#...'] },
  { id: 'whales', name: 'A whale', note: 'the spout first, then the back', rows: ['...#.#....', '....#.....', '..#####...', '.#++++###.', '##++++++##', '.#######.#', '..........'] },
  { id: 'migration', name: 'Whales, going east', note: 'every one the same way', rows: ['..#...#...', '.###.###..', '##+####+#.', '.#####.###', '...#####..', '..#++++##.', '...####...'] },
  { id: 'jelly', name: 'Jellyfish', note: 'a bloom, just under the water', rows: ['..........', '..####....', '.#++++#...', '.######...', '..#.#.#...', '..#.#..#..', '.#..#.#...'] },
  { id: 'logbird', name: 'A bird on a log', note: 'resting a long way from land', rows: ['....##....', '...####...', '....##+...', '....#.....', '##########', '#++++++++#', '##########'] },
  { id: 'weed', name: 'Drift weed', note: 'going down the wind', rows: ['..........', '.#..#..#..', '..##.##...', '.#.##.#.#.', '..#..##...', '.#.##..#..', '..........'] },
  // the deep two: blank frames until met in deep water
  { id: 'shadow', name: 'The long shadow', note: 'under the keel, longer than the ship', deep: true, rows: ['..........', '..........', '++++++++++', '##########', '##########', '++++++++++', '..........'] },
  { id: 'lights', name: 'Lights below', note: 'cold, and keeping pace', deep: true, rows: ['..........', '.+......+.', '..........', '....+.....', '.+.......+', '......+...', '..+.......'] },
];
const SKETCH = {};
function sketchUrl(e) {
  if (SKETCH[e.id]) return SKETCH[e.id];
  const W = e.rows[0].length, H = e.rows.length, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  e.rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '.') return; c.fillStyle = ch === '#' ? '#3a2a1a' : '#8a7458'; c.fillRect(x, y, 1, 1); }));
  return (SKETCH[e.id] = cv.toDataURL());
}
const log = () => state.story.sealog || (state.story.sealog = {});
/** a sighting: the first time, the sketch goes in the book (quietly: the book is where it is found) */
export function seaSpot(what, dread = rt.dread || 0) {
  if (what === 'whales' && dread >= 0.6) what = 'shadow';    // in deep water the whale is only ever its shadow (fauna.js)
  if (what === 'jelly' && dread >= 0.5) what = 'lights';     // their light turns cold, and they keep pace (sealife.js)
  if (what === 'log') return;                                 // a log with no bird is only a log
  const e = SEALOG.find((x) => x.id === what); if (!e || log()[what]) return;
  if (e.deep && typeof window !== 'undefined' && window.__BUILD === 'demo') return;
  log()[what] = { day: state.dayN, w: G.ship ? regionAt(G.ship.pos.x, G.ship.pos.z, state.seed) : '' };
}
rt.seaSpot = seaSpot;
const WATER = { home: 'Tama Sound', crown: 'Crown waters', free: 'the Cays', reef: 'Reef waters', lantern: 'Guild waters', drowned: 'the Drowned' };
/** the Ship's book's page part (logbook.js): [html, bind] */
export function partSeaLife(h3) {
  const L = log();
  if (!Object.keys(L).length) return null;
  const tiles = SEALOG.map((e) => {
    const s = L[e.id];
    if (!s) return `<div class="sketch blank"><i></i><b>${e.deep ? '' : '...'}</b></div>`;
    return `<div class="sketch"><img src="${sketchUrl(e)}" alt=""><b>${e.name}</b><small>${e.note}<br>day ${s.day + 1}${WATER[s.w] ? ', ' + WATER[s.w] : ''}</small></div>`;
  }).join('');
  return [`${h3('Seen at sea')}<div class="sketches">${tiles}</div>`, () => {}];
}
