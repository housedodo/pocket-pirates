// The camera: zoom (wheel), tilt and orbit (drag), and the per-frame follow: the swell, shake, the title shot, ashore views,
// the opening cinematic, the shipyard turntable and dev overrides. Its values live in rt (zoom, pitch, camYaw, camHeading...).
import * as THREE from 'three';
import { clamp, smoothstep, angleDiff } from '../util.js';
import { params } from '../core/config.js';
import { rt, G } from '../core/runtime.js';
import { canvas, camera } from '../core/engine.js';
import { $ } from './dom.js';

export let camPos, camLook;   // set by the init function(s) below, at the point in boot where main.js had them

export const PITCH_MIN = 0.06;   // low, almost level with the deck: the view tilts up to the sky instead of dipping under the hull

/** the camera: follow the ship (zoom, tilt, orbit, swell), shake, the title shot, ashore, the intro, the yard turntable, overrides */
export function updateCamera(rawDt, live, ashore) {
  rt.zoomT = Math.min(rt.zoomT, G.ship.mods.zoomMax);
  rt.zoom += (rt.zoomT - rt.zoom) * Math.min(1, rawDt * 5);
  rt.pitch += (rt.pitchT - rt.pitch) * Math.min(1, rawDt * 5);
  rt.lookUpK += ((G.abyss.lookUp ? 1 : 0) - rt.lookUpK) * Math.min(1, rawDt * 0.6);
  const pitchNow = rt.pitch + (0.3 - rt.pitch) * rt.lookUpK;
  rt.camHeading += angleDiff(rt.camHeading, G.ship.heading) * Math.min(1, rawDt * 1.6);
  rt.camYaw += (rt.yawT - rt.camYaw) * Math.min(1, rawDt * 7);
  const ch = rt.camHeading + rt.camYaw;
  const fx = Math.sin(ch), fz = -Math.cos(ch);
  const back = rt.zoom * Math.cos(pitchNow), up = rt.zoom * Math.sin(pitchNow);
  // the camera rises and falls with the slow swell (not with every wave), so on a big swell the ship does not sit in a pit with the water walls above the lens
  rt.camSwell += ((G.ship.float && G.ship.float.y !== undefined ? clamp(G.ship.float.y, -4, 4) * 0.65 : 0) - rt.camSwell) * Math.min(1, rawDt * 1.1);
  camPos.set(G.ship.pos.x - fx * back, up + 1 + rt.camSwell, G.ship.pos.z - fz * back);
  const skyK = clamp((0.3 - pitchNow) / (0.3 - PITCH_MIN), 0, 1);   // below the old limit the camera looks up instead of down
  camLook.set(G.ship.pos.x + fx * rt.zoom * 0.2, 1.5 + rt.camSwell * 0.7 + rt.lookUpK * 9 + skyK * rt.zoom * 0.42, G.ship.pos.z + fz * rt.zoom * 0.2);
  camPos.y = Math.max(camPos.y, 3.2);                                 // never at or under the waterline
  if (rt.shake > 0) { rt.shake = Math.max(0, rt.shake - rawDt * 1.8); camPos.x += Math.sin(rt.tNow * 70) * rt.shake; camPos.y += Math.cos(rt.tNow * 63) * rt.shake * 0.7; }
  if (rt.dread > 0.85 && live) { const s = (rt.dread - 0.85) * 0.5; camPos.x += Math.sin(rt.tNow * 31) * s; camPos.y += Math.sin(rt.tNow * 23 + 1) * s; }
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
  if (rt.camOverride) { camPos.set(...rt.camOverride.pos); camLook.set(...rt.camOverride.look); }
  camera.position.copy(camPos);
  camera.lookAt(camLook);
  if (live || params.get('shot')) camera.rotateZ(G.abyss.roll(rt.tNow));
  camera.updateMatrixWorld();
}

/** boot code that ran at this point in main.js; main.js calls it in the same place */
export function initCamera1() {
  rt.zoom = parseFloat(params.get('zoom') || '24'), rt.zoomT = rt.zoom;
  rt.pitch = parseFloat(params.get('pitch') || '0.72'), rt.pitchT = rt.pitch;
  canvas.addEventListener('wheel', (e) => { rt.zoomT = clamp(rt.zoomT * (1 + Math.sign(e.deltaY) * 0.1), 14, G.ship.mods.zoomMax); e.preventDefault(); }, { passive: false });
  rt.drag = null;
  rt.yawT = 0, rt.camYaw = 0, rt.lastCamInput = -99;   // orbit around the boat (drag sideways, Z / X, V resets)
  canvas.addEventListener('pointerdown', (e) => { rt.drag = { x: e.clientX, y: e.clientY, p: rt.pitchT, yaw: rt.yawT }; rt.lastCamInput = rt.tNow; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener('pointermove', (e) => { if (rt.drag && !rt.modal) { rt.pitchT = clamp(rt.drag.p + (e.clientY - rt.drag.y) * 0.006, PITCH_MIN, 1.35); rt.yawT = rt.drag.yaw - (e.clientX - rt.drag.x) * 0.008; rt.lastCamInput = rt.tNow; } });
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
