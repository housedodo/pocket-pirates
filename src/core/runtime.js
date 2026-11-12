// Runtime state shared across the game's modules while it runs (never saved): what screen is open, the dread now, the clock,
// the camera, the title and intro, the harbour screens, the story beats' timers. One object, so any module can read and write
// the same values (rt.modal, rt.dread, rt.tNow...) without importing main.js. Initial values are set by main.js at boot.
export const rt = {};

/** services and functions owned by main.js that other modules call (world, ship, audio, toast, openModal...).
 *  main.js fills it with getters at boot; modules read G.x only at call time, never while they are being imported. */
export const G = {};
