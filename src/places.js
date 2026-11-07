// The hand-made places at play time (the look is in landmarks.js): what keeps you out until the ship is fitted for it,
// the fog bank you can see from far off, what you find when you go ashore, and the labels on far shapes that a spyglass
// can read. main.js calls tick() each frame, visit() on E, and reads fog for the scene fog.
import * as THREE from 'three';
import { LANDMARKS, LM, BARRIERS } from './landmarks.js';
import { clamp, smoothstep } from './util.js';

// what you find ashore. once: the first visit; again: later visits (null = nothing more to take); every: days between repeat gifts
const VISITS = {
  crag: {
    once: { text: 'Gannets on every ledge, and nothing grows. On the top, a cairn; in it, a tin box with a list of ships in many hands, the last one crossed out: KESTREL. You add the Merry Gull. On the lid someone has scratched a little drawing: a white post, standing exactly in front of this rock. And two places.', note: 'The Grey Tooth: a tin box, a list of ships; KESTREL crossed out. On the lid a drawing: a white post exactly in front of the Tooth.', chart: ['ribs', 'bell'] },
    again: 'The gannets do not look up. The list in the tin box has not changed.',
  },
  bell: {
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
    once: { text: 'Ships come here to die: ribs in rows, a snapped mast, a figurehead up to her waist in sand. The crew pick through the wreckage.', note: 'The Ribs: a graveyard of ships behind the breakers.', gold: [40, 70], ammo: 4 },
    again: 'The sea has brought in more wreckage since you were here.', every: 3, gold: [25, 50], ammo: 2,
  },
  lagoon: {
    once: { text: 'The water inside the reef is so clear the boat seems to hang in the air. On the bottom, among the coral, a chest. Somebody\'s savings, a long time ago.', note: 'Glass Lagoon: water like glass, coral, and a chest on the bottom.', gold: [150, 150] },
    again: 'The water is so clear the boat seems to hang in the air.',
  },
  broken: {
    once: { text: 'The cliff is clean, as if cut. Half a house stands on the edge: three walls, half a roof, the beds still made. Half a strongbox, with half the coins in it.', note: 'The Halved Isle: half a house on a clean cliff. Half a strongbox.', gold: [60, 60] },
    again: 'Nobody has come back for the other half.',
  },
};

export class Places {
  constructor(scene) {
    this.scene = scene;
    this.fog = 0;            // 0..1 how deep in a fog bank the ship is (main.js thickens the scene fog)
    this.toastT = {};
    // the fog bank: a lumpy white dome you can see from a long way off
    const b = LM.broken, R = BARRIERS.broken.R;
    this.fogMat = new THREE.MeshBasicMaterial({ color: '#dfe6e8', transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, fog: false });
    this.fogGroup = new THREE.Group(); this.fogGroup.position.set(b.x, 0, b.z);
    const geo = new THREE.IcosahedronGeometry(1, 1);
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, rr = i === 0 ? 0 : R * 0.55;
      const m = new THREE.Mesh(geo, this.fogMat);
      m.position.set(Math.cos(a) * rr, -4, Math.sin(a) * rr);
      const s = i === 0 ? R * 0.95 : R * (0.5 + 0.08 * (i % 3));
      m.scale.set(s, s * (i === 0 ? 0.38 : 0.3), s); m.rotation.y = i;
      m.renderOrder = 6;
      this.fogGroup.add(m);
    }
    scene.add(this.fogGroup);
    // labels for far shapes
    this.labels = new Map();
    this.layer = document.createElement('div'); this.layer.id = 'farlabels';
    document.body.appendChild(this.layer);
  }

  /** is this upgrade enough to get past the barrier round landmark lm */
  open(lm, upgrades) { const B = BARRIERS[lm]; return !B || (upgrades[B.up] || 0) >= B.lv; }

  /** each frame: keep the ship out of places it is not fitted for, thicken the fog in the bank. Returns a message to show, or null. */
  tick(dt, ship, upgrades, fogColor, freeze) {
    let msg = null;
    this.fog = 0; this.lost = null;
    for (const [lm, B] of Object.entries(BARRIERS)) {
      const l = LM[lm], dx = ship.pos.x - l.x, dz = ship.pos.z - l.z, d = Math.hypot(dx, dz);
      if (B.kind === 'fog') this.fog = Math.max(this.fog, smoothstep(B.R + 70, B.R - 30, d) * (this.open(lm, upgrades) ? 0.45 : 1));
      if (d > B.R + 4 || freeze) continue;
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
    // the dome takes the scene's fog colour, so it is grey at dusk and dark at night; thinner from inside
    this.fogMat.color.copy(fogColor).lerp(new THREE.Color('#ffffff'), 0.35);
    this.fogMat.opacity = 0.55 * (1 - 0.8 * this.fog);
    return msg;
  }

  /** go ashore on a landmark. Returns what happened, for main.js to apply */
  visit(lm, state) {
    const v = VISITS[lm]; if (!v) return null;
    const seen = (state.story.lm = state.story.lm || {});
    const first = seen[lm] === undefined;
    if (first) { seen[lm] = state.dayN; return { ...v.once, first: true }; }
    if (v.every && state.dayN - seen[lm] >= v.every) { seen[lm] = state.dayN; return { text: v.again, heal: v.heal, fruit: v.fruit, gold: v.gold, ammo: v.ammo }; }
    return { text: v.again, dark: !!v.againDark, nothing: true };
  }

  /** labels over far landmarks: '?' by eye, what it looks like through a spyglass, its name once you have been */
  labelsTick(camera, ship, spy, discovered, W, H, show) {
    const range = 170 + 110 * spy, v = new THREE.Vector3();
    for (const l of LANDMARKS) {
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
      el.style.opacity = String(clamp((range - d) / 60, 0, 1) * 0.85);
    }
  }
}
