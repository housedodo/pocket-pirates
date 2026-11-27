// The camera: zoom (wheel), tilt and orbit (drag), and the per-frame follow: the swell, shake, the title shot, ashore views,
// the opening cinematic, the shipyard turntable and dev overrides. Its values live in rt (zoom, pitch, camYaw, camHeading...).
import { waveHeight } from '../ocean.js';
import { U } from '../psx.js';
import * as THREE from 'three';
import { clamp, smoothstep, angleDiff } from '../util.js';
import { params, settings } from '../core/config.js';
import { rt, G } from '../core/runtime.js';
import { canvas, camera } from '../core/engine.js';
import { $ } from './dom.js';
import { terrainHeight } from '../world.js';

export let camPos, camLook;   // set by the init function(s) below, at the point in boot where main.js had them

export const PITCH_MIN = 0.06;   // low, almost level with the deck: the view tilts up to the sky instead of dipping under the hull
/** zoom without a wheel (G-15): - / = and the pad's right stick, x1.6 a second, between ZOOM_MIN and the spyglass's zoomMax */
export const ZOOM_RATE = 1.6, ZOOM_MIN = 14;
/** look-ahead (G-16): the look point runs LOOK_REST x zoom ahead at rest, LOOK_FULL x zoom at full speed (11), eased LOOK_EASE a second; anchored it stays at rest */
/** a hill between the lens and the deck (G-27; seen in a headless sweep of every harbour: low tilts, stern to a cliff, terraced or hill
 *  village): the tilt rises up to OCC_LIFT over OCC_TIME seconds while the player's own tilt is blocked, and settles back after */
export const OCC_LIFT = 0.25, OCC_TIME = 0.5;
export const LOOK_REST = 0.2, LOOK_FULL = 0.32, LOOK_EASE = 1, LOOK_SPEED = 11;

/** the camera: follow the ship (zoom, tilt, orbit, swell), shake, the title shot, ashore, the intro, the yard turntable, overrides */
export function updateCamera(rawDt, live, ashore) {
  rt.zoomT = Math.min(rt.zoomT, G.ship.mods.zoomMax);
  rt.zoom += (rt.zoomT - rt.zoom) * Math.min(1, rawDt * 5);
  rt.pitch += (rt.pitchT - rt.pitch) * Math.min(1, rawDt * 5);
  rt.lookUpK += ((G.abyss.lookUp ? 1 : 0) - rt.lookUpK) * Math.min(1, rawDt * 0.6);
  let pitchNow = rt.pitch + (0.3 - rt.pitch) * rt.lookUpK;
  rt.occ = (rt.occ || 0) + ((live && !rt.edge && hidden(pitchNow) ? OCC_LIFT : 0) - (rt.occ || 0)) * Math.min(1, rawDt / OCC_TIME);
  pitchNow += rt.occ;
  rt.camHeading += angleDiff(rt.camHeading, G.ship.heading) * Math.min(1, rawDt * 1.6);
  rt.camYaw += (rt.yawT - rt.camYaw) * Math.min(1, rawDt * 7);
  const ch = rt.camHeading + rt.camYaw;
  const fx = Math.sin(ch), fz = -Math.cos(ch);
  if (rt.sightPull > 0) rt.sightPull = Math.max(0, rt.sightPull - rawDt);
  const pull = 1 + 0.15 * Math.sin(Math.PI * (1 - (rt.sightPull || 0) / 2)) * (rt.sightPull > 0 ? 1 : 0);   // first sight of an island: out about 15% and back over two seconds
  const back = rt.zoom * pull * Math.cos(pitchNow), up = rt.zoom * pull * Math.sin(pitchNow);
  // the camera rises and falls with the slow swell (not with every wave), so on a big swell the ship does not sit in a pit with the water walls above the lens
  rt.camSwell += ((G.ship.float && G.ship.float.y !== undefined ? clamp(G.ship.float.y, -4, 4) * 0.65 : 0) - rt.camSwell) * Math.min(1, rawDt * 1.1);
  camPos.set(G.ship.pos.x - fx * back, up + 1 + rt.camSwell, G.ship.pos.z - fz * back);
  const skyK = clamp((0.3 - pitchNow) / (0.3 - PITCH_MIN), 0, 1);   // below the old limit the camera looks up instead of down
  const lookT = LOOK_REST + (LOOK_FULL - LOOK_REST) * (G.ship.anchored ? 0 : clamp(G.ship.speed / LOOK_SPEED, 0, 1));
  rt.lookK = rt.lookK == null ? LOOK_REST : rt.lookK + (lookT - rt.lookK) * Math.min(1, rawDt * LOOK_EASE);
  camLook.set(G.ship.pos.x + fx * rt.zoom * rt.lookK, 1.5 + rt.camSwell * 0.7 + rt.lookUpK * 9 + skyK * rt.zoom * 0.42, G.ship.pos.z + fz * rt.zoom * rt.lookK);
  camPos.y = Math.max(camPos.y, 3.2);                                 // never at or under the waterline
  { // a crest between the lens and the ship must not hide her (owner, 2026-11-19: "the boat sometimes still goes underwater going in and out
    // of waves": the hull was not under the water, a nearer crest was in the way). The water is read at a few points on the line to the deck,
    // and the lens is lifted just enough to see over the highest one; up quickly, down slowly.
    const F = G.ship.float, deck = (F && F.y !== undefined ? F.y : 0) + 1.1, sx = G.ship.pos.x, sz = G.ship.pos.z, t = U.uTime.value, amp = U.uWave.value;
    let need = -1e9;
    for (const f of [0.25, 0.45, 0.6, 0.72, 0.82]) {
      const x = camPos.x + (sx - camPos.x) * f, z = camPos.z + (sz - camPos.z) * f, h = waveHeight(x, z, t, amp) + 0.35;
      need = Math.max(need, (h - deck * f) / (1 - f));
    }
    const lift = Math.max(0, need - camPos.y);
    rt.camClear = (rt.camClear || 0) + (lift - (rt.camClear || 0)) * Math.min(1, rawDt * (lift > (rt.camClear || 0) ? 6 : 1.2));
    camPos.y += rt.camClear;
  }
  const still = !settings.comfort.shake;   // comfort: no shake, no tremor, no roll (G4)
  if (rt.shake > 0) { rt.shake = Math.max(0, rt.shake - rawDt * 1.8); if (!still) { camPos.x += Math.sin(rt.tNow * 70) * rt.shake; camPos.y += Math.cos(rt.tNow * 63) * rt.shake * 0.7; } }
  if (rt.dread > 0.85 && live && !still) { const s = (rt.dread - 0.85) * 0.5; camPos.x += Math.sin(rt.tNow * 31) * s; camPos.y += Math.sin(rt.tNow * 23 + 1) * s; }
  if (rt.titleScene) G.titleCam(rawDt);
  rt.ashoreK += ((ashore && rt.ashoreCam ? 1 : 0) - rt.ashoreK) * Math.min(1, rawDt * 2.2);
  if (rt.ashoreCam && rt.ashoreK > 0.001) { const k = smoothstep(0, 1, rt.ashoreK); camPos.lerp(rt.ashoreCam.pos, k); camLook.lerp(rt.ashoreCam.look, k); }
  if (rt.introT >= 0) {   // the opening shot: high over Tama, easing down to the usual place behind the ship
    const k = clamp(rt.introT / G.INTRO_DUR, 0, 1), e = k * k * (3 - 2 * k), i0 = G.world.desc(0, -1);
    camPos.x += -34 * (1 - e); camPos.y += 78 * (1 - e); camPos.z += 52 * (1 - e);
    if (i0) camLook.set(i0.x + (camLook.x - i0.x) * e, 8 + (camLook.y - 8) * e, i0.z + (camLook.z - i0.z) * e);
  }
  if (rt.modal === 'yard') {   // the turntable: the ship turns slowly by itself until you take over
    if (!rt.yardDrag) { rt.yardIdle += rawDt; if (rt.yardIdle > 2.5) rt.yardYaw += rawDt * 0.35; }
    const a = G.ship.heading + rt.yardYaw, r = 11 * rt.yardZoom;
    camPos.set(G.ship.pos.x + Math.sin(a) * r, 3.2 + 2 * rt.yardZoom, G.ship.pos.z - Math.cos(a) * r); camLook.set(G.ship.pos.x, 2.6, G.ship.pos.z);
    $('yAngle').textContent = ['stern', 'port', 'bow', 'starboard'][Math.round((((rt.yardYaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) / (Math.PI / 2)) % 4];
  }
  if (rt.camLeave) {   // from a set framing back to the follow camera, eased (Good Dreams' card: endcards.js)
    const L = rt.camLeave; L.t += rawDt; const k = Math.min(1, L.t / L.dur), e = k * k * (3 - 2 * k);
    camPos.set(L.pos[0] + (camPos.x - L.pos[0]) * e, L.pos[1] + (camPos.y - L.pos[1]) * e, L.pos[2] + (camPos.z - L.pos[2]) * e);
    camLook.set(L.look[0] + (camLook.x - L.look[0]) * e, L.look[1] + (camLook.y - L.look[1]) * e, L.look[2] + (camLook.z - L.look[2]) * e);
    if (k >= 1) rt.camLeave = null;
  }
  if (rt.camOverride) { camPos.set(...rt.camOverride.pos); camLook.set(...rt.camOverride.look); }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  if ((live || params.get('shot')) && !rt.edge && !still) camera.rotateZ(G.abyss.roll(rt.tNow));   // the Edge's shots stay level
  camera.updateMatrixWorld();
}

/** is the deck hidden by the nearest island's ground from the lens at this tilt (the test always uses the player's tilt, so the lift never hunts) */
function hidden(pitch) {
  const s = G.ship, isl = G.world && G.world.nearest(s.pos.x, s.pos.z, 60); if (!isl) return false;
  const d = isl.desc, ch = rt.camHeading + rt.camYaw, back = rt.zoom * Math.cos(pitch), cy = Math.max(3.2, rt.zoom * Math.sin(pitch) + 1);
  const cx = s.pos.x - Math.sin(ch) * back, cz = s.pos.z + Math.cos(ch) * back;
  for (let i = 1; i < 10; i++) { const t = i / 10, x = cx + (s.pos.x - cx) * t, z = cz + (s.pos.z - cz) * t, y = cy + (2 - cy) * t; if (terrainHeight(d, x - d.x, z - d.z) > y + 0.5) return true; }
  return false;
}
/** zoom by keys and pad (G-15), once a frame with the game's dt (it stops in menus): - out, = in, rt.padZoom from the right stick (down = out) */
export function camInput(dt, live, keys) {
  if (!live) return;
  const z = (keys.has('Minus') || keys.has('NumpadSubtract') ? 1 : 0) - (keys.has('Equal') || keys.has('NumpadAdd') ? 1 : 0) + (rt.padZoom || 0);
  if (z) rt.zoomT = clamp(rt.zoomT * Math.pow(ZOOM_RATE, z * dt), ZOOM_MIN, G.ship.mods.zoomMax);
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initCamera1() {
  rt.zoom = parseFloat(params.get('zoom') || '24'), rt.zoomT = rt.zoom;
  rt.pitch = parseFloat(params.get('pitch') || '0.72'), rt.pitchT = rt.pitch;
  canvas.addEventListener('wheel', (e) => { rt.zoomT = clamp(rt.zoomT * (1 + Math.sign(e.deltaY) * 0.1), ZOOM_MIN, G.ship.mods.zoomMax); e.preventDefault(); }, { passive: false });
  rt.drag = null;
  rt.yawT = 0, rt.camYaw = 0, rt.lastCamInput = -99;   // orbit around the boat (drag sideways, Z / X, V resets)
  // two fingers pinch to zoom (owner, 2026-11-27: "a full version for mobile phone"); one finger drags the view as the mouse does
  const fingers = new Map(); let pinch = null;
  const spread = () => { const [a, b] = [...fingers.values()]; return Math.hypot(a.x - b.x, a.y - b.y) || 1; };
  canvas.addEventListener('pointerdown', (e) => { fingers.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (fingers.size === 2) { rt.drag = null; pinch = { d: spread(), z: rt.zoomT }; return; }
    rt.drag = { x: e.clientX, y: e.clientY, p: rt.pitchT, yaw: rt.yawT }; rt.lastCamInput = rt.tNow; canvas.setPointerCapture(e.pointerId); });
  const lift = (e) => { fingers.delete(e.pointerId); if (fingers.size < 2) pinch = null; };
  canvas.addEventListener('pointerup', lift); canvas.addEventListener('pointercancel', lift);
  canvas.addEventListener('pointermove', (e) => { if (fingers.has(e.pointerId)) fingers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && fingers.size === 2 && !rt.modal) { rt.zoomT = clamp(pinch.z * pinch.d / spread(), ZOOM_MIN, G.ship.mods.zoomMax); rt.lastCamInput = rt.tNow; return; }
    if (rt.drag && !rt.modal) { rt.pitchT = clamp(rt.drag.p + (e.clientY - rt.drag.y) * 0.006, PITCH_MIN, 1.35); rt.yawT = rt.drag.yaw + (e.clientX - rt.drag.x) * 0.008; /* drag right, the view swings right (it felt inverted) */ rt.lastCamInput = rt.tNow; } });
  canvas.addEventListener('pointerup', () => { rt.drag = null; });
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initCamera2() {
  camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
  rt.camHeading = G.ship.heading;
  rt.lookUpK = 0;
  rt.camSwell = 0;   // how far the camera has risen with the swell
  rt.camOverride = null; // { pos:[x,y,z], look:[x,y,z] } for concept shots
}
