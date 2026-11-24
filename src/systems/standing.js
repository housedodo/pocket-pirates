// Standing (owner, 2026-11-24: "work on reputation more, expand the mechanics: keep it up, potentially lose it somehow"). A harbour's
// standing (jobs.js friendLevel, -2..3) is its own visits and deliveries, plus the name the captain has in that harbour's whole water
// (state.story.standing[region], in points: three points are one level), minus a slow fade while the captain stays away.
//   earned  deliveries and visits (as before); the Patience helped (Cays); a Guild light relit (Lantern)
//   lost    staying away (from 12 days, a point every 5); giving up a delivery (its water); a bluff the Toll sees through, or fighting
//           the Toll (Crown); robbing the Patience (Cays)
//   shown   in prices (below zero they charge more), in voices (low standing after the first throw: nobody tells you anything, unless the
//           go-between is aboard: systems/hands.js), and at the very bottom an empty quay: nobody takes your line until what is owed is
//           paid (E again at the pier). Never a number on the HUD.
import { state } from '../core/state.js';

export const PER_LEVEL = 3, FADE_FROM = 12, FADE_EVERY = 5, REFUSE_AT = -2, OWED_PER_POINT = 25;
const marks = () => state.story.standing || (state.story.standing = {});
export const regionMark = (region) => (region && marks()[region]) || 0;
/** move a water's name by `points` (negative loses it). Returns the new mark */
export function mark(region, points) { if (!region) return 0; const m = marks(); m[region] = Math.max(-12, Math.min(9, (m[region] || 0) + points)); return m[region]; }
/** points lost to time away from one harbour (never more than it had earned) */
export function fadeOf(r) {
  if (r.last == null || !(r.last < 1e6)) return 0;
  const away = (state.dayN || 0) + (state.time || 0) - r.last;
  return away <= FADE_FROM ? 0 : Math.min(r.visits + 2 * r.deliveries, Math.floor((away - FADE_FROM) / FADE_EVERY) + 1);
}
export const standingPoints = (r) => r.visits + 2 * r.deliveries + regionMark(r.region) - fadeOf(r);
/** what is owed before a refusing harbour takes your line again (gold), and paying it */
export const owed = (region) => Math.max(1, -Math.min(0, regionMark(region)) * OWED_PER_POINT);
export function payOwed(region) { const g = owed(region); if (state.gold < g) return 0; state.gold -= g; marks()[region] = 0; return g; }
