// The Drowned waters (2026-11-13, owner; regions.js): the sea breathes. Full game only (the demo never reaches them).
//   - a shoal belt rings them (regions.js BELT, from Tama): at high water it is a white race that throws a ship back and scrapes
//     her; at low water it lies quiet and can be crossed. Going in and coming out each want a low tide (a forced stay, never explained)
//   - their harbours take no coin (ui/harbour.js, drownedTrade)
import * as THREE from 'three';
import { rt, G } from '../core/runtime.js';
import { scene } from '../core/engine.js';
import { mats } from '../psx.js';
import { BELT } from '../regions.js';
import { tideAt } from './calendar.js';
import { hurtPlayer } from './storybeats.js';
import { waveHeight } from '../ocean.js';
import { Builder } from '../builder.js';
import { TILE } from '../textures.js';

const LOW = -0.3;   // the belt opens below this tide
let foam = null, hitT = 0, lastR = null, push = 0, pushOut = 1;
const PUSH = 12;   // the race throws a ship back at 12 units/s, dying over 1 s (G-23): read as water, never a snap
const N = 48;

function build() {   // white water along the belt near the ship: flat foam patches and black teeth (moved round with the ship)
  const g = new THREE.Group();
  // visual QA (2026-11-19): the white water was an unlit white (stark at night and in the dread, off the palette) and the teeth had no
  // vertex colours under the props material (pure black dots); now the game's foam material, which takes the light and snaps, and stone
  // teeth from the builder; patches of several sizes, not a lattice
  const foamGeo = new THREE.CircleGeometry(4.5, 7); foamGeo.rotateX(-Math.PI / 2);
  foamGeo.setAttribute('color', new THREE.Float32BufferAttribute(new Float32Array(foamGeo.attributes.position.count * 4).fill(1), 4));
  const tb = new Builder(); tb.cyl(0, -1.3, 0, 1.1, 0.15, 2.6, 5, '#3a3634', TILE.stone); const toothGeo = tb.geometry();
  for (let i = 0; i < N; i++) {
    const f = new THREE.Mesh(foamGeo, mats.foam); const t = new THREE.Mesh(toothGeo, mats.props);
    const k = 0.45 + 0.75 * ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1; f.scale.set(k, 1, k * (0.7 + 0.5 * ((i * 0.37) % 1)));
    f.rotation.y = i * 1.7; f.renderOrder = 2; f.userData.i = i; t.userData.i = i; g.add(f, t);
  }
  scene.add(g); return g;
}

export function drownedTick(dt, t, wave) {
  if (window.__BUILD === 'demo') return;
  const p = G.ship.pos, r = Math.hypot(p.x, p.z), near = Math.abs(r - (BELT[0] + BELT[1]) / 2) < 260;
  const open = tideAt() < LOW;
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
  const inBelt = r > BELT[0] && r < BELT[1];
  hitT -= dt;
  if (inBelt && !open && !rt.edge && !rt.modal) {
    const out = lastR != null ? Math.sign(lastR - (BELT[0] + BELT[1]) / 2) || 1 : 1;   // which side she came from
    if (push <= 0) { push = PUSH; pushOut = out; G.ship.speed *= 0.2; }   // each throw takes her way off her
    if (hitT <= 0) { hurtPlayer(5); hitT = 2; G.objectives.remark('belt', rt.dread); }
  } else if (!inBelt) lastR = r;
  if (push > 0 && !rt.edge && !rt.modal && r > 0) {
    const k = push * pushOut * dt / r; p.x += p.x * k; p.z += p.z * k;
    push = Math.max(0, push - PUSH * dt);
  }
}
