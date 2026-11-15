// The voyage's state: one object, built from the save (or fresh) when the game loads. Everything the game remembers between
// sessions lives here; main.js saveNow() writes it back. Mutate its fields; never replace the object itself.
import { params, saved } from './config.js';
import { DEFAULT_CUSTOM } from '../customize.js';
import { installPixelUI } from '../pixelui.js';

installPixelUI();   // the pixel-UI textures and icons (CSS); kept here so it runs before the state, as it always has
export const state = {
  seed: parseInt(params.get('seed') || (saved && saved.seed) || '1337', 10),
  gold: (saved && saved.gold) || 0,
  dug: new Set((saved && saved.dug) || []),
  discovered: (saved && saved.discovered) || {},
  loot: (saved && saved.loot) || [],
  upgrades: Object.assign({ sails: 0, rudder: 0, lantern: 0, spyglass: 0, crew: 0, hull: 0, cannons: 0 }, (saved && saved.upgrades) || {}),
  time: params.has('time') ? parseFloat(params.get('time')) : (saved && saved.time != null ? saved.time : 0.33),
  windT: (saved && saved.windT) || 0,
  collected: new Set((saved && saved.collected) || []),
  notes: (saved && saved.notes) || [],
  board: (saved && saved.board) || { pos: {}, ties: [], note: '', guess: [] },
  halves: (saved && saved.halves) || {},   // arches that hold only half a riddle: isle id -> the isle with the other half
  frags: (saved && saved.frags) || {},
  rumoured: (saved && saved.rumoured) || {},
  rep: (saved && saved.rep) || {},
  job: (saved && saved.job) || null,
  serial: (saved && saved.serial) || {},
  sectorsSeen: (saved && saved.sectorsSeen) || [],
  jobHistory: (saved && saved.jobHistory) || [],
  buffs: (saved && saved.buffs) || { speed: 0, dig: 0 },
  quests: (saved && saved.quests) || [],
  fruit: (saved && saved.fruit) || {},
  harvest: (saved && saved.harvest) || {},
  dayN: (saved && saved.dayN) || 0,
  greet: (saved && saved.greet) || { day: {} },
  charts: (saved && saved.charts) || {},
  stats: Object.assign({ dolphins: 0, whales: 0, fruitPicked: 0, dist: 0, harbours: 0, deliveries: 0, fish: 0, wrecks: 0, bottles: 0, sunk: 0, hails: 0, solved: 0, treasures: 0, cosmetics: 0 }, (saved && saved.stats) || {}),
  hp: saved && saved.hp != null ? saved.hp : 100,
  ammo: saved && saved.ammo != null ? saved.ammo : 8,
  oil: saved && saved.oil != null ? saved.oil : 100,   // lamp oil (oil.js)
  sailsTorn: !!(saved && saved.sailsTorn),   // a gale tore the mainsail: two thirds speed until patched
  patchKits: saved && saved.patchKits != null ? saved.patchKits : 1,   // sail patch kits in the hold (one to start with)
  custom: Object.assign({}, DEFAULT_CUSTOM, (saved && saved.custom) || {}),
  owned: new Set((saved && saved.owned) || []),
  riddles: (saved && saved.riddles) || {},
  attempts: (saved && saved.attempts) || {},
  catch: (saved && saved.catch) || [],
  fishLog: (saved && saved.fishLog) || {},
  fishHeard: (saved && saved.fishHeard) || {},   // species whose habitat a fisher has described
  fishAsk: (saved && saved.fishAsk) || {},       // harbour id -> the day you last asked there
  goals: Object.assign({ i: 0, side: {}, started: false }, (saved && saved.goals) || { v: 2 }),   // v: 2 = goal list without "A bed for the night"
  story: (saved && saved.story) || {},              // chapter flags: perrinNote, check, b0, hutKnown, hutNod, demoEnd, free
  hints: (saved && saved.hints) || {},
  hut: (saved && saved.hut) || null,
  passenger: (saved && saved.passenger) || null,
  crew: (saved && saved.crew) || [],                // hired hands (max 2), each with a trait and a wish
  cardsSeen: (saved && saved.cardsSeen) || [],
  haggle: (saved && saved.haggle) || null,   // someone paying for passage
  tracked: (saved && saved.tracked) || null,       // the one errand shown on the tracker and wind meter: 'job' | 'passenger' | quest id          // the dark hut storyline: every throw is remembered
  life: (saved && saved.life) || null,   // harbour life: residents, dishes, local games, gossip, fragments (harbourlife.js)
  pos: (saved && saved.pos) || { x: 0, z: 0, h: 0 },
};
// state.story is a free bag of flags (RULES 31). Its containers get their empty shape here, in one place; a plain flag that is
// absent means "not yet" and stays absent until it happens. (`threads` is left out: absent means "pick the voyage's threads".)
const STORY_SHAPE = { seen: {}, lm: {}, secrets: {}, marks: {}, keeps: [], lost: {}, relit: {}, lanes: {}, lh: {}, caves: {}, pets: {}, placeSet: {}, tp: {}, uiSeen: {}, pins: [], tales: {}, drownedKept: [] };
for (const [k, v] of Object.entries(STORY_SHAPE)) if (state.story[k] == null) state.story[k] = Array.isArray(v) ? [] : {};

// lists that grow with every day at sea are kept to their newest entries when the voyage is saved (task R8); each limit is far above
// what the interface shows (the log shows the last few loot and jobs; letters echo into one entry with a count)
const KEEP = { notes: 400, loot: 120, jobHistory: 60, catch: 200 };
/** trim the growing lists in place before a save: the newest stay. Day-keyed hints ('front:<day>') older than yesterday go. */
export function trimState() {
  for (const [k, n] of Object.entries(KEEP)) if (state[k].length > n) state[k].splice(0, state[k].length - n);
  for (const k of Object.keys(state.hints)) { const m = /^front:(\d+)$/.exec(k); if (m && +m[1] < state.dayN - 1) delete state.hints[k]; }
}
if (params.has('x')) state.pos = { x: +params.get('x'), z: +params.get('z') || 0, h: +params.get('h') || 0 };
if (!state.goals.v) { if (state.goals.i > 15) state.goals.i--; state.goals.v = 2; }
if (state.goals.v < 3) { const i = state.goals.i; state.goals.i = i - (i > 12 ? 1 : 0) - (i > 13 ? 1 : 0) - (i > 15 ? 1 : 0); state.goals.v = 3; }   // saves from before Odd jobs (12), Salvage rights (13) and the raider (15) became optional side goals   // saves from before "A bed for the night" (goal 15) was dropped: it made you wait for 17:00

