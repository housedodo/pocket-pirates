// Lamp out to see the shore (P-FREE-3; docs/proposals/REGIONAL_CATALOGUE.md, owner 2026-11-17). Your own lamp's glow washes out the
// far lights: with it lit at night, lit windows, lantern strings and lamps further than FAR_FROM are dimmed. Put it out (L) and after a
// moment, as eyes do, the far lights come up brighter than before and carry further through the dark, while the water round the ship
// goes black (the lamp-out dark is storybeats/main.js's, unchanged). It is everywhere, but in the Cays it pays: a lit shore and a safe
// dark. In Lantern water the dark is the danger. The shader side is one uniform (psx.js uFarLight). Mara says one line, once, the
// first time it happens in Cays water at night. Demo-safe.
import { U } from '../psx.js';
import { clamp } from '../util.js';
import { FAR_FROM, FAR_LIT, FAR_OUT, FAR_REACH, FAR_EYES, FAR_EYES_RAMP } from '../regions.js';

let outT = 0;
/** with the lamp out the dark comes in close: the fog's far edge is cut to this (main.js). Far lights are measured against the lamp-lit fog */
export const LAMP_OUT_FAR = 0.32;
export const LIGHTS_LINE = 'Lamp out a moment. There. Lights.';

/** each frame (sim time). lampOut: rt.lampOut (the lamp is needed and not burning); night 0..1. Returns true the moment the far
 *  lights have come up (for the one Mara line) */
export function farLightTick(dt, lampOut, night) {
  const was = outT >= FAR_EYES + FAR_EYES_RAMP;
  outT = lampOut ? outT + dt : 0;
  const eyes = clamp((outT - FAR_EYES) / FAR_EYES_RAMP, 0, 1), want = lampOut ? FAR_LIT + (FAR_OUT - FAR_LIT) * eyes : FAR_LIT;
  U.uFarLight.value.set(FAR_FROM, 1 + (want - 1) * night, 1 + (FAR_REACH / LAMP_OUT_FAR - 1) * eyes * night);   // twice as far as with the lamp lit
  return !was && outT >= FAR_EYES + FAR_EYES_RAMP;
}
