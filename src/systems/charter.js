// The Captain's Charter (owner, 2026-11-28: the late-game goal "pay each region's guild to be granted a charter, unlocking special
// cargo, a named crew and a final deep-water route"). Four charters, one from each water's own authority, bought at the harbourmaster's
// board of any harbour in that water once the captain is known there (two deliveries in its waters). Full game only.
//   each     the water's fine goods are sold to you at any of its harbours, thriving or not (ui/harbour.js), and its markets pay a
//            little more for what you bring (CHARTER_SELL).
//   all four Ambrose Teague, charter master, comes aboard (not a hired hand, he keeps the papers): two more crates in the hold
//            (systems/trade.js room). And the Charter Road: a line of lit buoys the guilds keep from Tama out to the Sunken Street,
//            the old deep-water route. Along it storms do half the harm, and the Gull is not lost to the deep (systems/deepseas.js).
import * as THREE from 'three';
import { state } from '../core/state.js';
import { G } from '../core/runtime.js';
import { toast } from '../ui/dom.js';
import { pxi } from '../pixelui.js';
import { scene } from '../core/engine.js';
import { Builder } from '../builder.js';
import { TILE } from '../textures.js';
import { mats } from '../psx.js';

const DEMO = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const CHARTERS = {
  crown:   { name: 'The Crown Charter', from: 'the Board of Trade', cost: 1400, ask: 'A clerk unrolls it without looking up. "Sign, and the Crown sells you its plate at any of its harbours. Fourteen hundred."' },
  free:    { name: 'The Cays Charter', from: 'the Council of the Cays', cost: 1000, ask: '"No paper in the Cays. We shake on it, and you pay the musicians. A thousand, and the tobacco is yours anywhere."' },
  reef:    { name: 'The Brotherhood\'s Mark', from: 'the Brotherhood', cost: 1100, ask: 'A brand, a small one, burnt into your rail. "Eleven hundred. After that the powder is sold to you, and nobody asks why."' },
  lantern: { name: 'The Guild Warrant', from: 'the Lantern Guild', cost: 1200, ask: '"The Guild warrants your lamps and your name. Twelve hundred, and our candles go where you go."' },
};
export const CHARTER_SELL = 1.08, KNOWN_AT = 2, HOLD_MASTER = 2, ROAD_R = 80, ROAD_STEP = 180;
const ROAD = [[0, -60], [1450, 1030]];   // Tama's waters to the Sunken Street (landmarks.js 'street')
const C = () => state.story.charter || (state.story.charter = {});
export const chartered = (region) => !DEMO() && C()[region] != null;   // (the day it was signed; day 0 counts)
export const chartersAll = () => Object.keys(CHARTERS).every((r) => chartered(r));
export const charterSell = (region) => (chartered(region) ? CHARTER_SELL : 1);
export const masterAboard = () => chartersAll() && !!C().master;
const deliveriesIn = (region) => Object.entries(state.rep || {}).reduce((a, [id, r]) => { const [cx, cz] = id.split(',').map(Number), d = G.world && G.world.desc(cx, cz); return a + (d && d.region === region ? r.deliveries || 0 : 0); }, 0);

/** the harbourmaster's board (systems/harbours.js): this water's charter */
export function charterRows(d) {
  if (DEMO() || !d || !CHARTERS[d.region] || d.fogHaven) return '';
  const ch = CHARTERS[d.region];
  if (chartered(d.region)) return `<div class="sec">CHARTER</div><div class="qrow"><div><b>${pxi('letter')} ${ch.name}</b><br><small>held · ${ch.from}</small></div></div>`;
  const known = deliveriesIn(d.region) >= KNOWN_AT, ok = known && state.gold >= ch.cost;
  return `<div class="sec">CHARTER</div><div class="qrow letter"><div><b>${pxi('letter')} ${ch.name}</b><br><small>${known ? ch.ask : 'They do not know you here yet. Bring a few deliveries into these waters first.'} · ${ch.cost} gold</small></div><button data-hb="charter" ${ok ? '' : 'disabled'}>Sign</button></div>`;
}
export function charterAct(d, k) {
  if (k !== 'charter' || !d || !CHARTERS[d.region]) return false;
  const ch = CHARTERS[d.region];
  if (chartered(d.region) || state.gold < ch.cost || deliveriesIn(d.region) < KNOWN_AT) return true;
  state.gold -= ch.cost; C()[d.region] = state.dayN || 0; if (G.audio) G.audio.play('treasure');
  toast(`${ch.name}, from ${ch.from}. It goes in the chest with the ship's papers.`, false, 6000);
  if (chartersAll() && !C().master) setTimeout(() => {
    C().master = true; roadBuilt = false;
    toast('A man in a good coat is waiting at the foot of the gangplank with a box of papers. "Ambrose Teague. The guilds send me to keep your charters straight. I need very little room." He takes less than that, and the hold seems bigger for it.', false, 11000);
    setTimeout(() => { if (G.objectives && G.objectives.mate) G.objectives.mate.say('He says the guilds keep lights on the old road to the Sunken Street. For chartered ships. I did not know there was a road.'); }, 11500);
  }, 6500);
  return true;
}

// ---- the Charter Road: lit buoys every ROAD_STEP from Tama's waters to the Sunken Street; near it the sea is kinder
let roadBuilt = false, roadMesh = null;
const segDist = (x, z) => { const [a, b] = ROAD, dx = b[0] - a[0], dz = b[1] - a[1], L2 = dx * dx + dz * dz, t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / L2)); return Math.hypot(x - (a[0] + dx * t), z - (a[1] + dz * t)); };
/** 1 on the road (storm harm halved there, no foundering), 0 off it */
export const onRoad = (x, z) => (masterAboard() && segDist(x, z) < ROAD_R ? 1 : 0);
export function charterTick() {
  if (DEMO() || roadBuilt || !masterAboard()) return;
  roadBuilt = true; if (roadMesh) { scene.remove(roadMesh); roadMesh.geometry.dispose(); }
  const [a, b] = ROAD, L = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.floor(L / ROAD_STEP), B = new Builder();
  for (let i = 1; i < n; i++) {
    const t = i / n, x = a[0] + (b[0] - a[0]) * t, z = a[1] + (b[1] - a[1]) * t;
    if (G.world && G.world.nearest && G.world.nearest(x, z, 30)) continue;   // never on land
    B.cyl(x, -0.6, z, 0.75, 0.6, 1.1, 6, i % 2 ? '#c8402e' : '#f0e8d8', TILE.planks, true);   // the float, in the guilds' red and white
    B.box(x, 0.4, z, 0.14, 2.4, 0.14, '#2a2622', TILE.stone);
    B.box(x, 2.7, z, 0.5, 0.5, 0.5, '#ffd890', TILE.glow); B.box(x, 3.2, z, 0.62, 0.1, 0.62, '#2a2622', TILE.stone);
  }
  roadMesh = new THREE.Mesh(B.geometry(), mats.props); scene.add(roadMesh);
}
export const roadBuoyCount = () => (roadMesh ? 1 : 0);
// tests and dev
export const charterDebug = { all() { for (const r of Object.keys(CHARTERS)) C()[r] = 1; C().master = true; roadBuilt = false; return { ...C() }; }, state: () => ({ ...C() }) };
