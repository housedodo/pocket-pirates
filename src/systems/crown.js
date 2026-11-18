// The Crown's book, read off the world (docs/proposals/REGIONAL_CATALOGUE.md, owner 2026-11-17):
//  - M-CROWN-1 Pennants come down: while you carry a timed delivery to a Crown harbour, its signal mast flies one pennant for each
//    game hour left (up to its six) and strikes one each hour; when the last is down you are late. The deadline read off the world.
//  - P-CROWN-1 Rowing the lane: the lane already counts a rowing ship (regions.js inLane is where, not how); Mara says one line, once.
//  - P-CROWN-5 The line already written: once a voyage (full game, after the Customs Pier gave the `arrivals` capability), a long timed
//    Crown run is offered with the record's faint next line already black. Make it on time (no grace) and it is a clean tick, with a
//    faint black mark struck through beside it for good: a clerk's correction. Late, the black line is written as any late line is.
//    One flag (`state.story.lineAhead`), never in the log, never repeated, never remarked on.
import { state } from '../core/state.js';
import { nowD, PENNANTS, TIGHT_DIST } from '../regions.js';
import { setPennants } from '../regiondecor.js';

/** M-CROWN-1: the pennants a Crown harbour's mast flies right now */
export function pennantsAt(id) {
  const j = state.job;
  if (!j || j.due == null || j.toId !== id) return PENNANTS;
  return Math.max(0, Math.min(PENNANTS, Math.ceil((j.due - nowD(state)) * 24)));
}
setPennants(pennantsAt);

/** P-CROWN-1: the first time the ship is rowed up a Crown lane, Mara says so (once) */
export const OARS_LINE = 'Oars, Captain? In front of the whole town?';
export function laneOars(rowing, say) {
  if (!rowing || state.story.laneOars) return;
  state.story.laneOars = 1; say(OARS_LINE);
}

/** P-CROWN-5: is this offered timed delivery the one whose next line is already black? It picks the first long Crown run offered
 *  once `arrivals` is known, and stays that one offer (the same harbour and serial) until it is taken */
export function lineAhead(d, j, arrivals) {
  if (window.__BUILD === 'demo' || !arrivals || !j || !j.timed || state.job) return false;
  const w = state.story.lineAhead, serial = state.serial[d.id] || 0;
  if (w) return !w.taken && w.at === d.id && w.serial === serial;
  if (j.dist < TIGHT_DIST) return false;
  state.story.lineAhead = { at: d.id, serial };
  return true;
}
/** taking that offer: the run is written (it keeps no grace) */
export function takeLine(d, j) {
  const w = state.story.lineAhead;
  if (w && !w.taken && w.at === d.id && w.serial === (state.serial[d.id] || 0)) { w.taken = true; j.written = true; }
}
/** handing the written run in: late is late to the second; beaten, the struck mark stays in the record */
export function lineLate(j) {
  const late = nowD(state) > j.due;
  if (!late) state.story.lineStruck = 1;
  return late;
}
