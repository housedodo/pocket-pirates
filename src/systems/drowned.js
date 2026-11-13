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

const LOW = -0.3;   // the belt opens below this tide
let foam = null, hitT = 0, lastR = null;
const N = 48;

function build() {   // white water along the belt near the ship: flat foam patches and black teeth (moved round with the ship)
  const g = new THREE.Group();
  const foamGeo = new THREE.CircleGeometry(4.5, 7); foamGeo.rotateX(-Math.PI / 2);
  const toothGeo = new THREE.ConeGeometry(1.1, 2.6, 5);
  const fm = new THREE.MeshBasicMaterial({ color: 0xf2f6f4, transparent: true, opacity: 0.85 });
  for (let i = 0; i < N; i++) {
    const f = new THREE.Mesh(foamGeo, fm); const t = new THREE.Mesh(toothGeo, mats.props);
    f.userData.i = i; t.userData.i = i; g.add(f, t);
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
        const i = m.userData.i, row = i % 3, a = a0 + (Math.floor(i / 3) - N / 6) * step * 1.6 + row * 0.002;
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
    const tr = out > 0 ? BELT[1] + 3 : BELT[0] - 3;
    p.x *= tr / r; p.z *= tr / r; G.ship.speed *= 0.2;
    if (hitT <= 0) { hurtPlayer(5); hitT = 2; G.objectives.remark('belt', rt.dread); }
  } else if (!inBelt) lastR = r;
}
