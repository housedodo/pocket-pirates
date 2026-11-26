// The calendar: weekdays (market day, lantern night, a harbour's festival day), low water, and tonight's moon. Pure reads of state.
import { state } from '../core/state.js';
import { hash2 } from '../util.js';
import { litAt, phaseAt, MONTH } from './moon.js';

/** weekday names, Monday first */
export const WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const weekday = () => state.dayN % 7, isMarketDay = () => weekday() === 2, isLanternNight = () => weekday() === 5;
export const isFestival = (d) => d && d.festival === weekday();
// No tides (owner, 2026-11-26: "remove the tide and tide meter altogether"; "go with your pick, moon and always open"). What waited
// on low water waits on the moon now: on the nights round a new or a full moon the sea draws back (the Bell Below, the Tide Rocks,
// the Throwers' Wreck, the Sunken Street, the Drowned planks). Everything else that waited on the tide is open at any hour.
export const SPRING = 1.1;   // days either side of the new and the full moon
const FORCE_LOW = (() => { try { return typeof window !== 'undefined' && window.__BUILD !== 'full' && new URLSearchParams(location.search).get('lowwater') === '1'; } catch (e) { return false; } })();   // tests
/** is the sea drawn back tonight: a night (20:00 to 05:00) within SPRING days of a new or full moon */
export function lowWater() {
  if (FORCE_LOW) return true;
  const h = (state.time || 0) * 24; if (h < 20 && h >= 5) return false;
  const p = phaseAt(), dd = Math.min(p, Math.abs(p - 0.5), 1 - p) * MONTH;   // days from the nearest new or full moon
  return dd <= SPRING;
}
/** the water's level for the places that show it (-1 drawn back, 0.5 as it always is) */
export const waterAt = () => (lowWater() ? -1 : 0.5);
/** tonight's moon: a night runs from 19:00 to 06:00; each one is either a new moon (pitch dark, no moon) or a full moon (moonlit) */
export const nightKey = () => Math.floor(state.dayN + state.time - 0.79 + 1);
export const fullMoon = () => litAt() > 0.85;   // the real round now (systems/moon.js)
