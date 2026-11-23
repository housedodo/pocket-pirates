// The sea's own character (2026-11-15, owner: "make the sea more detailed, more character and variety ... the water around the
// islands should look more smooth"). Drawn by the water shader itself (ocean.js), so it adds nothing to the map:
//   - by the islands the water lies smoother: lower swell within ~40 units of a shore, smooth light instead of facets and chop out to ~110,
//     and the shallows drawn as a fine dithered gradient in the water (the flat pale sheet round each shore is left out: the swell cut it into jagged shapes);
//   - out at sea, large still patches: darker blue over deep water, pale sandy-green banks where the bottom shows (looks only: no grounding);
//   - current lines: long thin broken foam lines with a glassy band beside them, bending slowly, where the water meets;
//   - each region's water (uSea, set by systems/regionlook.js): Crown long and clean, Free Cays glassy over sand, Reef white water
//     breaking over hidden heads, Lantern oily slicks with a dull rainbow, the Drowned flat and lead-grey.
// The cat's paws (gusts) were already there (seaplay.js). `?sea=0` turns all of this off, to compare.
import * as THREE from 'three';
import { U } from './psx.js';
import { params } from './core/config.js';

export const SEA_ON = params.get('sea') !== '0';
U.uSea = { value: new THREE.Vector4(0, 0, 0, 0) };   // the region's water: glass, banks, breakers, oil
U.uSeaLead = { value: 0 };                          // the Drowned's flat grey
const DBG = params.get('sea') === 'debug';
U.uSeaOn = { value: SEA_ON ? (DBG ? 2 : 1) : 0 };   // ?sea=debug: the features alone, in flat colours (deep blue, bank yellow, current lines white, glass grey)

/** how much the swell is laid down by a shore (CPU twin of the GLSL below): shore 0 open .. 1 at the shore */
export const shoreCalm = (shore) => (SEA_ON ? 1 - 0.5 * shore : 1);

// the swell's height by a shore (vertex and the CPU twin in ocean.js)
export const GLSL_CALM = /* glsl */`uniform float uSeaOn;
float shoreCalmF(vec2 p) { return 1.0 - 0.5 * min(uSeaOn, 1.0) * shoreF(p); }`;

export const GLSL_SEA_HEAD = /* glsl */`uniform vec4 uSea; uniform float uSeaLead;
float isleSm(vec2 p) { float s = 0.0; for (int i = 0; i < ${20}; i++) { vec3 I = uIsl[i]; s = max(s, 1.0 - smoothstep(10.0, 110.0, length(p - I.xy) - I.z * 1.1)); } return s; }`;

// runs after the sea's look is chosen (outc), before the shallows and the seabed are laid over it
// Every broad blend (smooth water, deep and bank patches, glassy lines, the Reef's white water, the oil) fades in 16 dithered steps:
// with 3 or 4 steps each step's edge showed as a hard line in rough water, straight where an island's reach is a wide arc and with a
// corner where two islands' reaches meet (owner 2026-11-18: "everything a smooth transition, not a sudden one").
export const GLSL_SEA_BODY = /* glsl */`
if (uSeaOn > 0.5) {
  vec2 P = vWP.xz; float dq = bay4(gl_FragCoord.xy);
  float openS = 1.0 - landNear(P), calmR = 1.0 - uRough * 0.6;
  // smooth water: by the islands, and under the region's glass
  float smk = clamp(isleSm(P) * 0.9 + uSea.x * 0.55 * openS, 0.0, 1.0) * calmR;
  if (smk > 0.01) {
    float cr2 = clamp(vWP.y / (1.1 * max(uWave, 0.5) * ${'2.00'}) + 0.5, 0.0, 1.0);   // lit by height alone: smooth, and cheap (no extra wave samples)
    float l2 = clamp(0.25 + cr2 * 0.6 + (vn(P * 0.06 + vec2(uTime * 0.03, 0.0)) - 0.5) * 0.15, 0.0, 1.0);
    vec3 sm = mix(uDeep * 0.66, uShallow * 0.92, 0.3 + 0.55 * floor(l2 * 3.0 + dq) / 3.0) * uLight;
    float ph = smoothstep(0.93, 0.99, dot(reflect(-uSunDir, vec3(0.0, 1.0, 0.0)), normalize(cameraPosition - vWP)));
    sm += uSunColor * ph * step(0.96, rnd(floor(P * 1.7) + floor(uTime * 0.6))) * 0.5;   // a few slow glints on the glass
    outc = mix(outc, sm, floor(smk * 16.0 + dq) / 16.0 * 0.9);
  }
  if (openS > 0.01) {
    // deep and shallow patches, still on the water (no time): darker blue over deep water, pale banks where the bottom shows
    float pt = vn(P * 0.011 + 13.1) * 0.6 + vn(P * 0.03 + 5.0) * 0.4;
    float deepK = smoothstep(0.56, 0.68, pt) * openS, bankK = (1.0 - smoothstep(0.3 + 0.12 * uSea.y, 0.42 + 0.12 * uSea.y, pt)) * openS;
    outc = mix(outc, outc * vec3(0.58, 0.7, 0.92), floor(deepK * 16.0 + dq) / 16.0 * 0.8);
    float bedR = 0.5 + 0.5 * sin(dot(P, vec2(0.41, 0.27)) + 2.0 * vn(P * 0.07));
    vec3 bank = mix(mix(uShallow, vec3(0.84, 0.86, 0.6), 0.5), mix(uShallow, vec3(0.95, 0.92, 0.72), 0.6), bedR * 0.5) * uLight;
    outc = mix(outc, bank, floor(bankK * 16.0 + dq) / 16.0 * 0.6 * calmR);
    // current lines: a slow bending field; where it crosses its middle there is a thin broken foam line with glassy water beside it
    vec2 wq = P * 0.01 + vec2(vn(P * 0.003 + 2.0), vn(P * 0.003 + 9.0)) * 1.6 + vec2(uTime * 0.004, -uTime * 0.003);
    float dbgL = 0.0, dbgG = 0.0;
    float c = vn(wq), on = smoothstep(0.32, 0.46, vn(P * 0.004 + 31.0)) * openS * (1.0 - uRough * 0.5);
    if (on > 0.01) {
      float dc = abs(c - 0.5);
      float glass = 1.0 - smoothstep(0.02, 0.07, dc);
      outc = mix(outc, mix(uDeep * 0.7, uShallow * 0.9, 0.55) * uLight, floor(glass * on * 16.0 + dq) / 16.0 * 0.65);   // glassy: one flat tone, no chop
      float line = (1.0 - smoothstep(0.0, 0.02, dc)) * step(0.3, vn(P * 0.25 + vec2(uTime * 0.05, -uTime * 0.04))) * step(0.3, rnd(floor(P * 1.3)));
      outc = mix(outc, vec3(0.92, 0.96, 0.95) * (0.35 + 0.65 * uLight), clamp(line * on, 0.0, 1.0) * 0.8);
      dbgL = line * on; dbgG = glass * on;
    }
    if (uSeaOn > 1.5) outc = mix(mix(mix(vec3(0.3), vec3(0.1, 0.2, 0.7), deepK), vec3(0.9, 0.8, 0.2), bankK), vec3(1.0), max(dbgL, dbgG * 0.5));
    // the Reef: white water breaking over heads you cannot see
    if (uSea.z > 0.01) {
      float hd = vn(P * 0.022 + 40.0), spot = smoothstep(0.8 - 0.06 * uSea.z, 0.86 - 0.06 * uSea.z, hd) * uSea.z * openS;
      if (spot > 0.0) {
        float surge = 0.5 + 0.5 * sin(uTime * 0.7 + rnd(floor(P / 45.0)) * 6.28);
        outc = mix(outc, mix(uShallow, vec3(0.85, 1.0, 0.95), 0.3) * uLight, floor(spot * 16.0 + dq) / 16.0 * 0.35);
        float wf = step(0.55 - 0.25 * surge, vn(P * 0.45 + vec2(uTime * 0.25, uTime * 0.1))) * step(0.5, spot);
        outc = mix(outc, vec3(0.95) * (0.35 + 0.65 * uLight), wf * 0.85);
      }
    }
    // the Lantern: oil lying in slicks, flat and dull, with a faint rainbow at its edges
    if (uSea.w > 0.01) {
      float sl = vn(P * 0.012 + vec2(uTime * 0.003, 0.0) + 70.0), slick = smoothstep(0.6, 0.66, sl) * uSea.w * openS;
      if (slick > 0.0) {
        float hb = floor(fract(vn(P * 0.09 + 3.0) * 3.0 + sl * 6.0) * 3.0);
        vec3 ir = hb < 0.5 ? vec3(0.42, 0.3, 0.5) : hb < 1.5 ? vec3(0.3, 0.46, 0.34) : vec3(0.62, 0.48, 0.24);
        float edge = 1.0 - smoothstep(0.0, 0.03, sl - 0.63);
        vec3 oil = mix(outc * 0.72, ir * uLight, 0.35 * edge);
        outc = mix(outc, oil, floor(slick * 16.0 + dq) / 16.0 * 0.8);
      }
    }
  }
  // the Drowned: flat lead-grey water
  if (uSeaLead > 0.01) { float lum = dot(outc, vec3(0.3, 0.55, 0.15)); outc = mix(outc, vec3(lum) * vec3(0.92, 0.96, 1.0), uSeaLead * 0.65); }
}`;

// each region's water (multiplied by the region's weight in systems/regionlook.js)
export const SEA_CHAR = {
  crown: [0.35, 0, 0, 0, 0],      // long and clean
  free: [0.7, 0.6, 0, 0, 0],      // glassy, sand showing
  reef: [0, 0.2, 1, 0, 0],        // white water over hidden heads
  lantern: [0.15, 0, 0, 1, 0],    // oil
  drowned: [0.5, 0, 0, 0, 1],     // flat lead
};
/** set the region's water from the blend weights (w: id -> weight, already faded for the deep) */
export function setSeaChar(w) {
  const v = [0, 0, 0, 0, 0];
  for (const [id, k] of Object.entries(w)) { const c = SEA_CHAR[id]; if (c && k > 0) for (let i = 0; i < 5; i++) v[i] += c[i] * k; }
  U.uSea.value.set(v[0], v[1], v[2], v[3]); U.uSeaLead.value = v[4];
}
