// Lamp oil: the one thing a long voyage uses up. The lantern burns it whenever it is lit (night, thick fog, a storm), so
// how far you dare to go after dark is a plan, not a given. Running dry is never a game over: the lantern goes out,
// you see much less, you cannot fish in the dark, and Mara says so. Later in the game the dark is hungrier (dread).
// It starts to count once the market opens (main goal 4, "Dead calm"), where it is sold; Wick fills it for nothing.
export const OIL_FROM = 4;                                   // main goal index from which oil burns
export const oilCap = (up) => 100 + 30 * ((up && up.lantern) || 0);   // a bigger lantern holds more
export const OIL_PRICE = 0.42;                               // gold per unit of oil at the market (before discounts)

/** is the lantern lit right now? */
export const lanternLit = (c) => c.night > 0.35 || c.fog > 0.5 || c.storm > 0.5;

/** oil burnt per second: a full lamp lasts about a night and a half (a night is ~4 minutes) */
export function oilRate(c) {
  if (!lanternLit(c)) return 0;
  return 0.26 * (1 + 0.8 * (c.dread || 0)) * (c.rowing ? 0.85 : 1);
}
