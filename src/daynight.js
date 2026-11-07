import * as THREE from 'three';
import { smoothstep, lerp } from './util.js';

// Day/night layered on top of the dread palette. t: 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset.
export const DAY_LENGTH = 690; // real seconds per full day (11.5 minutes)
// Uneven pacing: daylight (06:00-19:00) takes 7.5 minutes, the night (19:00-06:00) 4, long enough for the night music to play out.
export const DAY_START = 6, DAY_END = 19, DAY_SECONDS = 450, NIGHT_SECONDS = DAY_LENGTH - DAY_SECONDS;
/** in-game hours that pass per real second at time t (0..1) */
export function hoursPerSecond(t) {
  const h = (((t % 1) + 1) % 1) * 24;
  return h >= DAY_START && h < DAY_END ? (DAY_END - DAY_START) / DAY_SECONDS : (24 - DAY_END + DAY_START) / NIGHT_SECONDS;
}
/** advance the clock by dt real seconds */
export const advanceTime = (t, dt) => (t + (hoursPerSecond(t) * dt) / 24) % 1;

const NIGHT_TOP = new THREE.Color('#04061a'), NIGHT_HOR = new THREE.Color('#111a3a'), NIGHT_FOG = new THREE.Color('#080d22');   // a real dark: only lamps, windows and the moon stand out
const DUSK_TOP = new THREE.Color('#5a5aa0'), DUSK_HOR = new THREE.Color('#ff9a5a'), DUSK_FOG = new THREE.Color('#d8a080');
const DUSK_SUN = new THREE.Color('#ff8a4a');
const NIGHT_TINT = new THREE.Color(0.78, 0.88, 1.18), DUSK_TINT = new THREE.Color(1.1, 0.96, 0.86), WHITE = new THREE.Color(1, 1, 1);

// how far you can see on a clear night, and how strong the lantern is: four settings each, chosen in the pause menu
// (Night view / Lamp) or ?nightview=0..3&lamp=0..3. far = the share of the day's view distance left at full night.
export const NIGHT_VIEWS = [{ name: 'Pitch dark', far: 0.2, light: 0.065 }, { name: 'Dark', far: 0.45, light: 0.17 }, { name: 'Moonlit', far: 0.65, light: 0.26 }, { name: 'Bright moon', far: 0.85, light: 0.36 }];   // far: view distance left at full night; light: how much moonlight
export const LAMPS = [{ name: 'Candle', k: 0.5 }, { name: 'Lantern', k: 1 }, { name: 'Bright', k: 1.6 }, { name: 'Beacon', k: 2.4 }];
export const NIGHT_SET = { view: 0, lamp: 0, auto: true };   // auto: moon phases, each night either a new moon (Pitch dark) or a full one (Moonlit)
export const NIGHT_MODES = ['Moon phases', ...NIGHT_VIEWS.map((v) => v.name)];

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

  stage.skyTop.lerp(NIGHT_TOP, nm * 0.96).lerp(DUSK_TOP, tw * 0.35);
  stage.skyHorizon.lerp(NIGHT_HOR, nm * 0.92).lerp(DUSK_HOR, tw * 0.75);
  stage.fog.lerp(NIGHT_FOG, nm * 0.96).lerp(DUSK_FOG, tw * 0.5);
  stage.sun.lerp(DUSK_SUN, tw * 0.8);
  stage.cloud.multiplyScalar((0.35 + 0.65 * day) * (1 - night * (1 - Math.min(1, 0.4 + 2.2 * NIGHT_VIEWS[NIGHT_SET.view].light))));   // on a new moon the clouds are dark too
  { const nl = NIGHT_VIEWS[NIGHT_SET.view].light; stage.light = Math.max(nl, stage.light * (nl + 0.02 + (0.98 - nl) * day)); }
  { const f = NIGHT_VIEWS[NIGHT_SET.view].far; stage.fogFar *= 1 - (1 - f) * night; stage.fogNear *= 1 - (1 - f * 0.9) * night; }   // the dark closes in: islands are shapes, then nothing

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
