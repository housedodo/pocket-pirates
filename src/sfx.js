// A tiny hook so modules without access to the AudioBus can still make a sound. main.js plugs it in.
export const sfx = { play: (key, opts) => {} };   // eslint-disable-line no-unused-vars
