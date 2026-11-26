// The Drowned waters (2026-11-13, owner; regions.js): the sea breathes. Full game only (the demo never reaches them).
//   - a shoal belt rings them (regions.js BELT, from Tama): at high water it is a white race that throws a ship back and scrapes
//     her; at low water it lies quiet and can be crossed. Going in and coming out each want a low tide (a forced stay, never explained)
//   - their harbours take no coin (ui/harbour.js, drownedTrade)
import * as THREE from 'three';
import { rt, G } from '../core/runtime.js';
import { scene } from '../core/engine.js';
import { mats } from '../psx.js';
import { BELT } from '../regions.js';
import { REEFS_ON } from '../core/config.js';
import { lowWater } from './calendar.js';
import { hurtPlayer } from './storybeats.js';
import { waveHeight } from '../ocean.js';
import { Builder } from '../builder.js';
import { TILE } from '../textures.js';

let foam = null, hitT = 0, lastR = null, push = 0, pushOut = 1;
const PUSH = 12, LEE = 30;   // LEE: calm water this far off the shore of an island standing in the belt
   // the race throws a ship back at 12 units/s, dying over 1 s (G-23): read as water, never a snap
const N = 48;

function build() {   // white water along the belt near the ship: flat foam patches and black teeth (moved round with the ship)
  const g = new THREE.Group();
  // visual QA (2026-11-19): the white water was an unlit white (stark at night and in the dread, off the palette) and the teeth had no
  // vertex colours under the props material (pure black dots); now the game's foam material, which takes the light and snaps, and stone
  // teeth from the builder; patches of several sizes, not a lattice
  const foamGeo = new THREE.CircleGeometry(4.5, 7); foamGeo.rotateX(-Math.PI / 2);
  { const n = foamGeo.attributes.position.count, cc = new Float32Array(n * 4); for (let v = 0; v < n; v++) { cc.set([0.82, 0.86, 0.86, v === 0 ? 0.9 : 0.35], v * 4); } foamGeo.setAttribute('color', new THREE.Float32BufferAttribute(cc, 4)); }   // soft-edged: bright in the middle, thin at the rim
  const tb = new Builder(); tb.cyl(0, -1.3, 0, 1.1, 0.15, 2.6, 5, '#3a3634', TILE.stone); const toothGeo = tb.geometry();
  for (let i = 0; i < N; i++) {
    const f = new THREE.Mesh(foamGeo, mats.foam); const t = new THREE.Mesh(toothGeo, mats.props);
    const k = 0.3 + 0.45 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1; f.scale.set(k, 1, k * (0.7 + 0.5 * ((i * 0.37) % 1)));
    f.rotation.y = i * 1.7; f.renderOrder = 2; f.userData.i = i; t.userData.i = i; g.add(f, t);
  }
  scene.add(g); return g;
}

export function drownedTick(dt, t, wave) {
  if (window.__BUILD === 'demo') return;
  if (!REEFS_ON) return;   // the belt is a reef: off with the reefs (owner, 2026-11-26: "the reefs are still following me, remove them completely";
                           // its foam and teeth were laid round the ship's own bearing, so they moved with her). The Drowned are open at any tide meanwhile
  const p = G.ship.pos, r = Math.hypot(p.x, p.z), near = Math.abs(r - (BELT[0] + BELT[1]) / 2) < 260;
  const open = lowWater();   // the belt (off with the reefs) would open on a new or full moon night
  // the white water, only near the belt and only while it is closed (it fades as the tide drops)
  if (near && !foam) foam = build();
  if (foam) {
    foam.visible = near && !open;
    if (foam.visible) {
      const a0 = Math.atan2(p.z, p.x), step = 7 / ((BELT[0] + BELT[1]) / 2);
      foam.children.forEach((m, k) => {
        const i = m.userData.i, row = i % 3, a = a0 + (Math.floor(i / 3) - N / 6) * step * 1.6 + row * 0.002 + Math.sin(i * 3.1) * step * 0.6;   // broken up along the belt
        const rr = BELT[0] + 6 + row * ((BELT[1] - BELT[0] - 12) / 2) + Math.sin(i * 7.3) * 6, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
        if (m.geometry.type === 'CircleGeometry') m.position.set(x, waveHeight(x, z, t, wave) + 0.15 + Math.sin(t * 3 + i) * 0.1, z);
        else m.position.set(x + 2, -0.4 + Math.sin(t * 2 + i) * 0.3, z + 1.5);
      });
    }
  }
  // the race: at high water the belt throws a ship back the way she came, and scrapes her
  // an island standing in the belt (the Sala's dead light) has a lee: the race runs round it, and a ship lying by it is not thrown
  // or scraped (owner, 2026-11-26: "I lose health the whole time" there)
  const isl = r > BELT[0] - 60 && r < BELT[1] + 60 && G.world.nearest(p.x, p.z, 80), lee = !!isl && Math.hypot(p.x - isl.desc.x, p.z - isl.desc.z) < (isl.desc.r || 10) + LEE;
  const inBelt = r > BELT[0] && r < BELT[1] && !lee;
  hitT -= dt;
  if (inBelt && !open && !rt.edge && !rt.modal) {
    const out = lastR != null ? Math.sign(lastR - (BELT[0] + BELT[1]) / 2) || 1 : 1;   // which side she came from
    if (push <= 0) { push = PUSH; pushOut = out; G.ship.speed *= 0.2; }   // each throw takes her way off her
    if (hitT <= 0 && G.ship.speed > 1) { hurtPlayer(5); hitT = 2; G.objectives.remark('belt', rt.dread); }   // it scrapes a ship that drives into it; one lying still is only carried out
  } else if (!inBelt) lastR = r;
  if (push > 0 && !rt.edge && !rt.modal && r > 0) {
    const k = push * pushOut * dt / r; p.x += p.x * k; p.z += p.z * k;
    push = Math.max(0, push - PUSH * dt);
  }
}
