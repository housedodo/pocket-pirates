// Lamp oil: the one thing a long voyage uses up. The lantern burns it whenever it is lit (night, thick fog, a storm), so
// how far you dare to go after dark is a plan, not a given. Running dry is never a game over: the lantern goes out,
// you see much less, you cannot fish in the dark, and Mara says so. Later in the game the dark is hungrier (dread).
// It starts to count once the market opens (main goal 4, "Dead calm"), where it is sold; Wick fills it for nothing.
export const OIL_FROM = 'calm';                              // the main goal (id) from which oil burns
export const oilCap = (up) => 100 + 30 * ((up && up.lantern) || 0);   // a bigger lantern holds more
export const OIL_PRICE = 0.42;                               // gold per unit of oil at the market (before discounts)

/** is the lantern lit right now? */
export const lanternLit = (c) => c.night > 0.35 || c.fog > 0.5 || c.storm > 0.5;

/** the flame, read off the same dread term the burn uses (task L6): { h: its height, 1 upright and full .. 0.45; lean: radians }.
 *  Upright and steady in home waters; shorter and leaning the further out. Never a meter, never a word. */
export const flameShape = (dread) => { const k = Math.min(1, Math.max(0, dread || 0)); return { h: 1 - 0.55 * k, lean: 0.75 * k }; };

/** oil burnt per second: a full lamp lasts about a night and a half (a night is ~4 minutes) */
export function oilRate(c) {
  if (!lanternLit(c)) return 0;
  return 0.26 * (1 + 0.8 * (c.dread || 0)) * (c.rowing ? 0.85 : 1);
}
