// The hand-made places at play time (the look is in landmarks.js): what keeps you out until the ship is fitted for it,
// the fog bank you can see from far off, what you find when you go ashore, and the labels on far shapes that a spyglass
// can read. main.js calls tick() each frame, visit() on E, and reads fog for the scene fog.
import { rt } from './core/runtime.js';
import { FogBank, FogWall } from './fogbank.js';
import * as THREE from 'three';
import { LANDMARKS, LM, BARRIERS, lmHere } from './landmarks.js';
const _lv = new THREE.Vector3();   // made once: these run every frame (task R6)
import { clamp, smoothstep } from './util.js';
import { tableOpen } from './clues.js';

// what you find ashore. once: the first visit; again: later visits (null = nothing more to take); every: days between repeat gifts
const VISITS = {
  crag: {
    once: { text: 'Gannets on every ledge, and nothing grows. On the top, a cairn; in it, a tin box with a list of ships in many hands, the last one crossed out: KESTREL. You add the Merry Gull. Inside, someone has scratched a little drawing: a white post, standing exactly in front of this rock. And two places.', note: 'The Grey Tooth: a tin box, a list of ships; KESTREL crossed out. Inside the box a drawing: a white post exactly in front of the Tooth.', chart: ['ribs', 'bell'] },
    again: 'The gannets do not look up. The list in the tin box has not changed.',
  },
  bell: {
    clue: 'CL-BELL-a',
    once: { text: 'The tower leans out over a street you can see under the water: doorsteps, a well, a cart. The bell has no clapper. From the top you can make out a lighthouse to the south-east.', note: 'The Drowned Bell: a street under the water. The bell has no clapper.', chart: ['keeper'] },
    again: 'The street is still down there. Someone has left a light on in one of the windows.', againDark: true,
  },
  grove: {
    once: { text: 'Fresh water, shade and good timber. The crew fill the casks, patch the planks and come back with their arms full of fruit.', note: 'Hollowgreen: a spring, a clearing, a stone table. Good timber for the hull.', heal: true, fruit: 3 },
    again: 'The crew patch the hull with Hollowgreen timber and fill the casks.', every: 1, heal: true, fruit: 2,
  },
  keeper: {
    once: { text: 'Wick keeps the light. He walks you up to the gallery without a word: from up there you can see half the sea. You copy what you can onto your chart.', note: "Wick's Rock: Wick keeps the light. From the gallery you can see half the sea.", chart: ['crag', 'bell', 'grove', 'ribs', 'lagoon', 'broken'], around: true },
    again: 'Wick waves from the gallery. He does not come down.',
  },
  ribs: {
    clue: 'CL-RIBS-a',
    once: { text: 'Ships come here to die: ribs in rows, a snapped mast, a figurehead up to her waist in sand. The crew pick through the wreckage.', note: 'The Ribs: a graveyard of ships behind the breakers.', gold: [40, 70], ammo: 4 },
    again: 'The sea has brought in more wreckage since you were here.', every: 3, gold: [25, 50], ammo: 2,
  },
  lagoon: {
    clue: 'CL-LAG-a',
    once: { text: 'The water inside the reef is so clear the boat seems to hang in the air. On the bottom, among the coral, a chest. Somebody\'s savings, a long time ago.', note: 'Glass Lagoon: water like glass, coral, and a chest on the bottom.', gold: [150, 150] },
    again: 'The water is so clear the boat seems to hang in the air.',
  },
  broken: {
    clue: 'CL-HALF-a',
    once: { text: 'The cliff is clean, as if cut. Half a house stands on the edge: three walls, half a roof, the beds still made. Half a strongbox, with half the coins in it.', note: 'The Halved Isle: half a house on a clean cliff. Half a strongbox.', gold: [60, 60] },
    again: 'Nobody has come back for the other half.',
  },

  // ---- the places of the exploration story (docs/WORLD_REDESIGN.md 5.6). Bright reading first; nothing is explained.
  // need(ctx): what the sea must be doing for the clue to be there (ctx: night, calm, tide, mara); no: what you find otherwise
  customs: {
    clue: 'CL-C1-a',
    once: { text: 'A man in a blue coat waves you to the end of the pier and opens a ledger. He writes THE MERRY GULL and the date, and leaves the line for the master blank. "Always blank. It has always been blank." Tired, kind, he turns the page: ships that have not come in yet.', note: 'Customs Pier: the ledger has the Merry Gull on it, and a blank line for the master.', chart: ['archive'] },
    again: 'The ledger is open. Someone has left a second cup on the desk.',
  },
  teo: {
    clue: 'CL-F1-a', when: 'night', need: (c) => c.night && c.still, no: 'A sandbar and a cold fire. He plays at night, when the water is quiet.',
    once: { text: 'Teo, on the sand, plays eight bars and stops. Across the water a violin takes the tune where he left it. "She answers. We have never met. Forty years. It is manners."', note: 'Teo and Ilse: two players on two islands, forty years, never met.' },
    again: 'Teo plays eight bars and stops. "Never sat at her table. Never will. We play instead." The violin waits.',
    second: 'Teo tunes up. "Who began it? The violin did, long before me. I only answer."',   // L-38 C: each says the other began (a draft)
  },
  ilse: {
    clue: 'CL-F1-a', when: 'night', need: (c) => c.night && c.still, no: 'A rock with a stool on it. She plays at night, when the water is quiet.',
    once: { text: 'Ilse, on the rock: "He starts it. I finish it. If one of us goes quiet, the other waits."', note: 'Ilse finishes what Teo starts.' },
    again: 'The violin takes the tune where the guitar left it.',
    second: 'Ilse rosins her bow. "Who began it? The guitar did. I only answer it."',   // L-38 C
  },
  cup: {
    clue: 'CL-F3-a', when: 'high', need: () => true,   /* no tides: always across (owner, 2026-11-26) */ no: 'A white cloth on a beach, across a reef the water is too low to cross.',
    once: { text: 'A table laid for two on the sand, a lamp, a cup with MERRY GULL painted on it in a hand you do not know. The tea is still warm. The other cup has a name on it, rubbed out.', note: 'A table for two. One cup says Merry Gull. The other had a name; the first letter was a K.' },
    again: 'The cup is cold. The other cup is gone.',
  },
  hammock: {
    clue: 'CL-F2-a',
    once: { text: 'By day everyone is asleep: fishers by their boats, a woman with a basket on her knees, a child with one foot hanging. "What is today?" a woman asks, kindly, and asks again before you have answered.', note: 'The Hammock Isle: everyone sleeps by day. One of them murmurs numbers.' },
    again: 'The hammocks sway. Someone murmurs a number and does not wake.',
  },
  namewall: {
    clue: 'CL-R1-a',
    once: { text: 'The whole cliff is names, every ship that went down on this coast, painted by someone who climbed to do it. The paint at the bottom is dry. The paint at the top is wet.', note: 'The Name Wall: every ship that went down. The paint at the top is wet.' },
    again: 'The paint at the top is still wet.',
  },
  archive: {
    clue: 'CL-C2-a',
    once: { text: 'A clerk lets you into a long room of shelves. "Every bad day of the sea, as far back as we have it. We never worked out why we keep it." Beside every black page, in a tiny hand, a number. Never above nine.', note: "The Governor's Fort: every bad day of the sea, with a small number beside it." },
    again: 'The clerk is at a different shelf. A page with the date is tabbed.',
    second: 'Tucked into the first shelf, a slip for the next clerk: "The black pages are in order. The small numbers beside them are not ours. I have checked every hand in the building. None of them is above nine. I tried to add one. I wrote a ten beside a bad day in the spring before last. In the morning it was a one, and the ink was dry. Do not try to add one." The name is scratched through.',   // lore connection A (2026-11-19): every ledger is a copy; a draft
  },
  press: {
    clue: 'CL-L1-a',
    once: { text: 'The oil comes from a fish nobody names. "From the deep. We do not go down for it. It comes up." Every lamp in the town burns a little bluer than it should.', note: 'The Oil Press: lamps that burn blue. Oil that comes up by itself.', oil: true },
    again: 'The lamps burn blue. Every house has a second door facing the water.',
  },
  wreck: {
    clue: 'CL-R2-a', when: 'low', need: (c) => c.tide < -0.3, no: 'A mast with a rag, and the sea over a hull. It is only bare at low water.',
    once: { text: 'The schooner Marigold, hull split. In the cabin a table, a captain\'s chair, and a die with a number missing. A log: "Day 31. A 1 at the hut. Nothing happened. I was relieved and ashamed."', note: 'The Marigold: a die with no seven. The log is in a captain\'s hand.' },
    again: 'The chair is turned toward the door.',
  },
  ledger: {
    clue: 'CL-L2-a',
    once: { text: 'The lamp is lit at noon. A keeper calls: "Come up, if you want to see your own." The ledger has a date a long way ahead, in a hand that is not yours.', note: 'The Keepers\' Ledger: a date, in a hand that is not ours.' },
    again: 'The light burns at noon. The keeper does not look round.',
  },
  tower: {
    clue: 'CL-L3-a', when: 'night', need: (c) => c.night && c.calm, no: 'A black tower, the door shut. On a calm night it stands open.',
    once: { text: 'The door is open. A stair goes down, and at the bottom a window looks up, through the sea, at the sky.', note: 'The Dark Tower: a window at the bottom of the stair, looking up through the water.' },
    again: 'The stair goes down. The window is still there.',
  },
  street: {
    clue: 'CL-D1-a', when: 'low', need: (c) => c.tide < -0.5 && c.mara, no: 'Roof peaks, and the sea over a street. At the lowest water it shows.',
    once: { text: 'At the lowest water the roofs are bare: doors, a well, a cart. One door is blue. Mara goes very quiet, and then very kind.', note: 'The Sunken Street: a blue door. Mara did not say why.' },
    again: 'The street is under the water again. The blue door is the last to go.',
  },
  table: {
    once: { text: 'A table at the water\'s edge. One chair on this side, one on the other. A die, waiting.', note: 'The Table by the Water.' },
    again: 'The chair on the other side has not moved.',
    bare: 'A bare sandbar at the end of the chart. The sea here is very still. Nothing is laid.',
  },
};

export class Places {
  constructor(scene) {
    this.scene = scene;
    this.fog = 0;            // 0..1 how deep in a fog bank the ship is (main.js thickens the scene fog)
    this.toastT = {};
    // the fog bank: a ragged wall of fog standing round the Halved Isle (fogbank.js; owner, 2026-11-26: look a)
    this.bank = new FogBank(scene);   // the low mist round the ship inside it (fogbank.js); the rest is the scene's haze closing in
    this.wall = LM.broken && lmHere('broken') ? new FogWall(scene, LM.broken.x, LM.broken.z, BARRIERS.broken.R) : null;   // the bank on the horizon, seen from outside (fogbank.js FogWall)
    // labels for far shapes
    this.labels = new Map();
    this.layer = document.createElement('div'); this.layer.id = 'farlabels';
    document.body.appendChild(this.layer);
  }

  /** is this upgrade enough to get past the barrier round landmark lm */
  open(lm, upgrades) { const B = BARRIERS[lm]; return !B || (upgrades[B.up] || 0) >= B.lv || (lm === 'broken' && !!(rt.haven && rt.haven.lifted)); }   // the fog harbour come back: the bank is gone (systems/foghaven.js)

  /** each frame: keep the ship out of places it is not fitted for, thicken the fog in the bank. Returns a message to show, or null. */
  tick(dt, ship, upgrades, fogColor, freeze, pass) {   // pass(lm, ship): another way through a fog bank (systems/leadlight.js, trial)
    let msg = null;
    this.fog = 0; this.lost = null;
    for (const [lm, B] of Object.entries(BARRIERS)) {
      const l = LM[lm], dx = ship.pos.x - l.x, dz = ship.pos.z - l.z, d = Math.hypot(dx, dz);
      const by = !this.open(lm, upgrades) && d < B.R + 70 && !!pass && pass(lm, ship);   // another way in (systems/passes.js): the leading light, high water, the lull
      // (owner, 2026-11-26: "the fog slowly dissipates when entering with a lantern, so the Halved Isle is actually visible"): with the
      // lens lantern lit it is a wall at the edge and thins as you go in, until the isle stands in a clear pocket; the bank's own walls
      // go thin round you. With the lamp out it stays thick.
      const lit = this.open(lm, upgrades) && !rt.lampOut, clear = lit ? smoothstep(B.R * 0.3, B.R * 0.85, d) : 1;
      const hk = lm === 'broken' && rt.haven ? rt.haven.fogDensity : 1;   // the fog harbour's people back: the bank thins with them (systems/foghaven.js)
      // it comes on slowly over a long way (owner: "the player feels like he is slowly getting surrounded"), nothing to see from afar
      if (B.kind === 'fog') { const f = hk * smoothstep(B.R + 220, B.R * 0.6, d) * (lm === 'broken' ? (lit ? 0.9 : 1) : lit ? 0.45 * clear : this.open(lm, upgrades) ? 0.7 : by ? 0.7 : 1);   /* the Halved Isle's bank stays thick with the lantern too (owner, 2026-11-27: "it should seem there is no way out"); the lamp keeps only your deck clear */ this.fog = Math.max(this.fog, f); if (lm === 'broken') { this.bankFog = f; this.bankClear = lit ? 14 : 6; } }
      if (d > B.R + 4 || freeze || by) continue;
      const k = `${lm}`;
      if (this.open(lm, upgrades)) {
        if (!this.toastT[k + 'ok'] && d < B.R) { this.toastT[k + 'ok'] = 1; msg = { text: B.yes }; }
        continue;
      }
      // not fitted for it: the reef stops you dead, the breakers throw you back, the fog turns you round
      if (d < B.R && B.kind === 'fog') {   // lost in the fog: main.js takes the helm and the ship drifts out the way it came
        this.lost = { x: dx / Math.max(d, 0.01), z: dz / Math.max(d, 0.01) };
        if ((this.toastT[k] || 0) <= 0) { this.toastT[k] = 25; msg = { text: B.no }; }
        continue;
      }
      if (d < B.R) {
        const push = B.R - d;
        ship.pos.x += dx / Math.max(d, 0.01) * push; ship.pos.z += dz / Math.max(d, 0.01) * push;
        ship.speed *= B.kind === 'fog' ? 1 - Math.min(0.9, dt * 1.6) : 0.4;
        if (B.kind === 'fog') ship.heading += dt * 0.6;   // the bow swings round in the fog
        if ((this.toastT[k] || 0) <= 0) { this.toastT[k] = 20; msg = { text: B.no, hurt: B.kind === 'breakers' ? 4 : B.kind === 'reef' ? 2 : 0 }; }
      }
    }
    for (const k of Object.keys(this.toastT)) if (!k.endsWith('ok')) this.toastT[k] -= dt;
    // the mist round the ship takes the scene's fog colour, so it is grey at dusk and dark at night
    { const col = this._bc || (this._bc = new THREE.Color()); col.copy(fogColor); this.bank.update(dt, ship, col, Math.min(1, (this.bankFog || 0) * 1.8), this.bankClear || 6); if (this.wall) this.wall.update(dt, ship, col, rt.haven ? Math.max(0.15, rt.haven.fogDensity) : 1); }
    return msg;
  }

  /** go ashore on a landmark. Returns what happened, for main.js to apply */
  visit(lm, state, ctx = {}) {
    const v = VISITS[lm]; if (!v || !lmHere(lm)) return null;
    if (lm === 'table' && !tableOpen(state)) return { text: v.bare, nothing: true };   // the table stands once you have thrown at the hut (or understood three questions)
    if (v.need && !v.need(ctx)) { if (v.when) (state.story.notyet = state.story.notyet || {})[lm] = v.when; return { text: v.no, nothing: true }; }   // K6: the chart keeps a pencil sign of what the sea must be doing               // the sea must be doing the right thing for the clue to be there
    const seen = (state.story.lm = state.story.lm || {});
    const first = seen[lm] === undefined;
    if (first) { seen[lm] = state.dayN; return { ...v.once, first: true, clue: v.clue }; }
    if (v.second && !(state.story.lm2 = state.story.lm2 || {})[lm]) { state.story.lm2[lm] = 1; return { text: v.second, nothing: true, clue: v.clue }; }   // a second visit hears one more thing, once
    if (v.every && state.dayN - seen[lm] >= v.every) { seen[lm] = state.dayN; return { text: v.again, heal: v.heal, fruit: v.fruit, gold: v.gold, ammo: v.ammo, clue: v.clue }; }
    return { text: v.again, dark: !!v.againDark, nothing: true, clue: v.clue };
  }

  /** labels over far landmarks: '?' by eye, what it looks like through a spyglass, its name once you have been */
  labelsTick(camera, ship, spy, discovered, W, H, show, ctx = {}) {   // ctx: { fogFar, table } (docs/ART_SPEC.md R14, 8.2)
    const range = 170 + 110 * spy, v = _lv;
    for (const l of LANDMARKS) {
      if ((l.lm === 'table' && !ctx.table) || !lmHere(l.lm)) { const e = this.labels.get(l.lm); if (e) e.style.display = 'none'; continue; }   // the table has no label until it stands (tableOpen, as going ashore: G-26); the demo has no later places
      let el = this.labels.get(l.lm);
      const d = Math.hypot(l.x - ship.pos.x, l.z - ship.pos.z);
      const known = discovered[l.key];
      const on = show && d > 70 && d < range;
      if (!on) { if (el) el.style.display = 'none'; continue; }
      v.set(l.x, l.H + 6, l.z).project(camera);
      if (v.z > 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) { if (el) el.style.display = 'none'; continue; }
      if (!el) { el = document.createElement('div'); el.className = 'farlabel'; this.layer.appendChild(el); this.labels.set(l.lm, el); }
      el.textContent = known ? known.name : spy > 0 ? l.sight : '?';
      el.style.display = 'block';
      el.style.left = `${((v.x + 1) / 2) * W}px`; el.style.top = `${((1 - v.y) / 2) * H}px`;
      el.style.opacity = String(clamp((range - d) / 60, 0, 1) * 0.85 * (ctx.fogFar ? 1 - smoothstep(ctx.fogFar * 0.6, ctx.fogFar * 0.85, d) : 1));   // labels fade with the fog
    }
  }
}

/** each clue seen ashore at a hand-made place, with where that place stands (for clueLint's region check, clues.js, G-30) */
export const CLUE_PLACES = () => Object.entries(VISITS).filter(([lm, v]) => v.clue && LM[lm]).map(([lm, v]) => ({ lm, clue: v.clue, name: LM[lm].name, x: LM[lm].x, z: LM[lm].z }));
