import * as THREE from 'three';
import { smoothstep, lerp } from './util.js';

// Day/night layered on top of the dread palette. t: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset.
export const DAY_LENGTH = 300; // real seconds per full day

const NIGHT_TOP = new THREE.Color('#070b22'), NIGHT_HOR = new THREE.Color('#1a2650'), NIGHT_FOG = new THREE.Color('#111b3c');
const DUSK_TOP = new THREE.Color('#5a5aa0'), DUSK_HOR = new THREE.Color('#ff9a5a'), DUSK_FOG = new THREE.Color('#d8a080');
const DUSK_SUN = new THREE.Color('#ff8a4a');
const NIGHT_TINT = new THREE.Color(0.78, 0.88, 1.18), DUSK_TINT = new THREE.Color(1.1, 0.96, 0.86), WHITE = new THREE.Color(1, 1, 1);

export const tod = {
  t: 0.33, sunHeight: 0, day: 1, night: 0, twilight: 0,
  sunAz: 0, sunElev: 0.5, moonAz: 0, moonElev: -0.5, clock: '08:00', tint: new THREE.Color(),
};

export function clockString(t) {
  const m = Math.floor(((t % 1) + 1) % 1 * 24 * 60);
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/** Mutates the (per-frame) dread stage so everything downstream just works. */
export function applyTimeOfDay(stage, t, dread) {
  const sh = Math.sin((t - 0.25) * Math.PI * 2);
  const day = smoothstep(-0.2, 0.3, sh);
  const night = 1 - day;
  const twi = Math.max(0, 1 - Math.abs(sh + 0.02) / 0.32);
  const nm = night * (1 - 0.5 * dread);
  const tw = twi * (1 - 0.6 * dread);

  stage.skyTop.lerp(NIGHT_TOP, nm * 0.92).lerp(DUSK_TOP, tw * 0.35);
  stage.skyHorizon.lerp(NIGHT_HOR, nm * 0.92).lerp(DUSK_HOR, tw * 0.75);
  stage.fog.lerp(NIGHT_FOG, nm * 0.92).lerp(DUSK_FOG, tw * 0.5);
  stage.sun.lerp(DUSK_SUN, tw * 0.8);
  stage.cloud.multiplyScalar(0.35 + 0.65 * day);
  stage.light = Math.max(0.3, stage.light * (0.32 + 0.68 * day));
  stage.fogFar *= 1 - 0.2 * night;

  tod.tint.copy(WHITE).lerp(NIGHT_TINT, night * 0.8).lerp(DUSK_TINT, tw * 0.7);
  stage.tint.multiply(tod.tint);

  const elevScale = stage.sunElev / 0.62; // dread keeps the sun low
  tod.t = t; tod.sunHeight = sh; tod.day = day; tod.night = night; tod.twilight = twi;
  tod.sunAz = (0.5 - t) * Math.PI * 2;
  tod.sunElev = sh >= 0 ? sh * 1.0 * elevScale : sh * 0.8;
  tod.moonAz = tod.sunAz + Math.PI;
  tod.moonElev = -tod.sunElev * 0.9 + 0.05;
  tod.clock = clockString(t);
  return tod;
}
