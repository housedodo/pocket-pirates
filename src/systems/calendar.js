// The calendar: weekdays (market day, lantern night, a harbour's festival day), the tide, and tonight's moon. Pure reads of state.
import { state } from '../core/state.js';
import { hash2 } from '../util.js';

/** weekday names, Monday first */
export const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const weekday = () => state.dayN % 7, isMarketDay = () => weekday() === 2, isLanternNight = () => weekday() === 5;
export const isFestival = (d) => d && d.festival === weekday();
// two tides a day, drifting a little later each day; low tide (below -0.45) uncovers more at wrecks and widens the shallows
export const tideAt = (time = state.time, day = state.dayN) => Math.sin(Math.PI * 2 * (time * 2 + day * 0.07));
/** is the tide going out right now (the Dim can only be entered on a falling tide) */
export const tideFalls = () => tideAt(state.time + 0.002) < tideAt(state.time);
/** tonight's moon: a night runs from 19:00 to 06:00; each one is either a new moon (pitch dark, no moon) or a full moon (moonlit) */
export const nightKey = () => Math.floor(state.dayN + state.time - 0.79 + 1);
export const fullMoon = () => (hash2(state.seed, nightKey(), 717) % 100) < 50;
