import { smoothstep } from './util.js';
import { STRATA } from './palette.js';
import { regionsSeen, regionSeen } from './clues.js';

// The first mate (Mara) and the starter goals. A short main chain teaches the game one verb at a time;
// side goals are optional and complete themselves whenever you happen to do them.
const HOME_ISLE = '1,-1'; // Hollow Cay Galen, the starter treasure isle

// The story runs in chapters. Each chapter is a few steps; a chapter opens new systems (UNLOCK) and pushes the
// fog wall back (GATES). Goals are nudges from Mara, never markers: no handholding.
export const CHAPTERS = [
  { n: 'I', title: 'Sea legs', act: 'Fair winds' },
  { n: 'II', title: "Perrin's riddle", act: 'Fair winds' },
  { n: 'III', title: 'Working waters', act: 'Fair winds' },
  { n: 'IV', title: 'Check my chart', act: 'Loose talk' },
  { n: 'V', title: 'Strange notes', act: 'Loose talk' },
  { n: 'VI', title: 'The table', act: 'Loose talk' },
];
/** how far from Tama the fog lets you sail, per chapter (the demo ends after chapter VI) */
export const GATES = [430, 430, 820, 1250, 1650, 1650];
/** the chapter a system opens in */
export const UNLOCK = { fish: 1, oars: 2, passengers: 2, crew: 3, dice: 3, haggle: 3, cards: 3, cannons: 3 };   // the demo shows every part of the game, so nothing opens after it ends

export const MAIN_GOALS = [
  {
    id: 'sail', ch: 0, title: 'Find your sea legs', reward: 12,
    where: 'Open water off Tama',   // the slip's second line when the goal has no single place
    text: 'Steer with A and D, set the sails with W and S. Sail about 100 units.',
    // told one line at a time, each when the player has done the last thing (see onbTick in main.js)
    intro: ['Morning, Captain! I am Mara, your first mate, and this is the Merry Gull. She is small, but she is ours.',
      'There she goes. A and D steer her, and the wind does the rest.',
      'That ring is the wind. Gold means she sails well, red means she crawls. The little triangle is our bow.'],
    outro: ['Good. Beam and downwind is fast; straight into the wind is slow.'],
    hints: ['Hold W to let the sails out, then A or D to turn.', 'Turn until the little triangle sits on a gold part of the wind ring: that is where she runs fast.'],
    check: (c) => c.state.stats.dist >= 100,   // done on the distance (it used to wait for Mara, and the ship sailed on into the fog wall)
  },
  {
    id: 'harbour', ch: 0, title: 'Make landfall', reward: 12,
    text: 'Bring her back to Tama\'s pier and press E.',
    intro: ['Nicely done. Now bring her back to Tama\'s pier and press E. The harbourmaster was waving at us.'],
    outro: (c) => (c.state.story.letterP1 === 'taken' ? [] : ['Old Perrin left something for you with the harbourmaster.']),
    hints: ['Tama is the island with the lighthouse and the long wooden pier.', 'Sail right up to the end of the pier, then press E.'],
    check: (c) => c.state.stats.harbours >= 1,
    onDone: (c) => { c.state.story.letterP1 = c.state.story.letterP1 || 'wait'; },   // Perrin's riddle waits at the Tama board as a letter; the player takes it
  },
  {
    id: 'dig', ch: 1, title: 'Follow the riddle', reward: 36,
    text: 'Perrin\'s riddle is in your orders (M). Find the right shore of Hollow Cay Galen and dig.',
    // if the letter is already taken and read, she does not tell the player to fetch it
    intro: (c) => (c.state.story.letterP1 === 'taken' ? ['Now to find the shore that riddle means. Press E there: we drop anchor and dig.']
      : ['Perrin left you a letter with the harbourmaster: take it at the Board sign in Tama.', 'Then find the shore its riddle means and press E there: we drop anchor and dig.']),
    outro: ['Ha! Treasure! A captain with gold in the hold is a captain with options.'],
    hints: ['Take Perrin\'s letter at the Tama Board sign first (the little letter icon). The riddle is then in your orders (M). Sunrise is east, sunset is west.', 'On the right shore, dig squares (click, or arrows and E): darker, wetter sand means the chest is close. The tide comes in with every dig, and two stones break the shovel.'],
    check: (c) => c.state.dug.has(HOME_ISLE),
    tab: 'board', mark: ['takeLetter'],
  },
  {
    id: 'upgrade', ch: 1, title: 'Spend your loot', reward: 18,
    where: 'Any harbour, at the Shipwright sign',   // the slip's second line when the goal has no single place
    text: 'Buy something from a shipwright.',
    intro: ['That is a good haul. The shipwright in any harbour would love some of it. Better sails, and we could go further.'],
    outro: ['You can feel the difference already.'],
    hints: ['Any harbour has a shipwright: press E at the pier and pick the Shipwright tab.'],
    check: (c) => Object.values(c.state.upgrades).some((v) => v > 0),
    tab: 'wright', mark: ['buy'],   // tutorial: the harbour sign and the button to press are marked (later goals never are)
  },
  {
    id: 'calm', ch: 2, title: 'Dead calm', reward: 24,
    where: 'Right here: the oars, then a line',   // the slip's second line when the goal has no single place
    text: 'The wind has died. Put the oars out (G) and row, then catch a fish (stop, then C).',
    intro: ['Not a breath of wind. Press G for the oars, then W to row us a little way.',
      'Then stop and press C to fish. The rest you will see on the line.'],
    outro: ['Dinner AND exercise. A full day\'s work for a captain.', 'And listen: there is the wind again. Sails up, Captain.'],
    hints: ['Press G to put the oars out, then hold W to row. G again puts them away.', 'Stop the ship (S), press C, then C again to cast (a short cast is easier). When it bites, press C or Space; then strike (C / Space) each time the needle is on a green mark. Three misses and it is gone.'],
    check: (c) => (c.state.stats.rowed || 0) >= ((c.state.story.cal0 || {}).r || 0) + 50 && c.state.stats.fish >= ((c.state.story.cal0 || {}).f || 0) + 1,
    onStart: (c) => { c.state.story.cal0 = { r: c.state.stats.rowed || 0, f: c.state.stats.fish }; if (c.forceCalm) c.forceCalm(420); },
    onDone: (c) => { if (c.forceCalm) c.forceCalm(0); },   // the wind picks up again
  },
  {
    id: 'tack', ch: 2, title: 'Beat to windward', reward: 24,
    where: 'Wherever the wind is against you',   // the slip's second line when the goal has no single place
    text: 'Make headway into the wind by zig-zagging: keep the little triangle on the gold part of the wind ring, and turn across the wind every so often.',
    intro: ['The wind is back, straight in our teeth. A ship can still go upwind if she zig-zags.',
      'Keep the little triangle on the gold edge of the wind ring, then swing across to the other side.'],
    outro: ['There it is. Upwind at last, and not a drop of rowing. Perrin would call that sailing.'],
    hints: ['Dead into the wind she barely moves. Keep the triangle on the gold part of the ring, about 45 degrees off the wind.', 'Turn across the wind (A and D) after a little while, and keep going the same way overall.'],
    check: (c) => (c.state.stats.upwind || 0) >= ((c.state.story.up0 || 0) + 60),
    count: (c) => [Math.round((c.state.stats.upwind || 0) - (c.state.story.up0 || 0)), 60],
    onStart: (c) => { c.state.story.up0 = c.state.stats.upwind || 0; },
  },
  {
    id: 'job', ch: 2, title: 'Earn your keep', reward: 30,
    where: 'Take a delivery from a harbour Board and deliver it',   // the slip's second line when the goal has no single place
    text: 'Take a delivery from a harbour board and bring it where it belongs.',
    intro: ['Harbours pay well for deliveries. Take one from a Board and bring it where it belongs.'],
    outro: ['Reputation matters out here. Harbours remember you.'],
    hints: ['The board in a harbour menu has deliveries. Dock at the other harbour and deliver from the top of its board.'],
    check: (c) => c.state.stats.deliveries >= 1,
    tab: 'board', mark: ['jobAccept', 'doDeliver'],
  },
  {
    id: 'passenger', ch: 2, title: 'Passage', reward: 24,
    where: 'A harbour Board: someone wants passage',   // the slip's second line when the goal has no single place
    text: 'Take a passenger from a harbour board and bring them to where they are bound.',
    intro: ['Some folk pay for passage, and they talk. Take one from a Board and see them to their stop.'],
    outro: ['Good company, and paid for it. Do not tell the cargo.'],
    hints: ['Open the Board sign in a harbour. A passenger is offered there now and then. Drop them off at their harbour.'],
    check: (c) => (c.state.stats.passengers || 0) >= 1,
  },
  {
    id: 'chart', ch: 2, title: 'Chart the sea', reward: 24,
    where: 'Islands you have not sailed up to',   // the slip's second line when the goal has no single place
    text: 'Chart 8 islands by sailing close to them.',
    intro: ['Let us fill in the chart. Sail close to islands and they go on the map (M).'],
    outro: ['A fine start to a map. Perrin would be proud. Probably. Nobody has seen him smile.'],
    hints: ['Islands are charted when you sail close to them. The empty stretches are worth crossing.'],
    check: (c) => Object.keys(c.state.discovered).length >= 8,
    count: (c) => [Object.keys(c.state.discovered).length, 8],
  },
  {
    id: 'tavern', ch: 3, title: 'Meet the locals', reward: 18,
    where: 'Any harbour, at the Tavern sign',   // the slip's second line when the goal has no single place
    text: 'In a harbour, open the Tavern sign: hire a hand, or sit down for a game of dice.',
    intro: ['Taverns are hiring hands these days, Captain. And somebody always wants to play dice. Either would do us good.'],
    outro: (c) => (c.state.crew && c.state.crew.length ? ['Good. A crew is only as good as the company it keeps.'] : ['Good. Even the dice in there are friendly. Mostly.']),
    hints: ['Dock at any harbour and open the Tavern sign (3). A hired hand costs a few coins; dice cost 10 gold a game.'],
    check: (c) => c.state.crew.length >= 1 || (c.state.stats.pig || 0) >= 1,
    tab: 'tavern', mark: ['hireHand', 'playPig'],
  },
  {
    id: 'perrin', ch: 3, title: 'A note from Perrin', reward: 12,
    text: 'Perrin has sent word to Harbour Tama. A letter waits at the Board.',
    intro: ['Word from Tama: the harbourmaster is keeping another letter for us. Perrin again, I bet.'],
    outro: [],
    hints: ['Dock at Harbour Tama. A letter icon on the Board sign means something is waiting for you.'],
    check: (c) => !!c.state.story.perrinNote,
  },
  {
    id: 'checkchart', ch: 3, title: 'Check his chart', reward: 36,
    where: "The isle in Perrin's note (Ship's book)",   // the slip's second line when the goal has no single place
    text: (c) => c.state.story.check ? `Perrin wants to know if ${c.state.story.check.name}, ${c.state.story.check.dir} of Tama, has ${c.state.story.check.detail}. Go and look.` : 'Read Perrin\'s note in your log.',
    intro: (c) => (c.state.story.noteLine === 'done' ? ['It is far out, Captain. Sail close to the island and slow down to have a good look.'] : ['He wants us to check something on his chart. His note is in the Ship\'s book. Far out, Captain.']),
    outro: ['He was right. About everything. Captain... nobody has ever charted that island. Nobody.'],
    hints: ['Perrin\'s note says which island, and roughly where. It is far from Tama.', 'Sail close to the island and slow down to have a good look.'],
    check: (c) => { const k = c.state.story.check; return !!k && Math.hypot(c.ship.pos.x - k.x, c.ship.pos.z - k.z) < k.r + 40 && c.ship.speed < 3; },
  },
  {
    id: 'riddle2', ch: 3, title: 'Riddle me this', reward: 30,
    where: 'Any isle with a stone arch',   // the slip's second line when the goal has no single place
    text: 'Find another treasure isle. Study the arch (E), then dig the shore its riddle describes.',
    intro: ['Every treasure isle has an arch. Study it with E and it tells you where the chest sleeps.'],
    outro: ['Two chests! Perrin would be insufferable.'],
    hints: ['Treasure isles show a stone arch on the chart. Press E at its shore to read it, then read the riddle in the log.', 'Sunrise is east, sunset is west.'],
    check: (c) => (c.state.stats.solved || 0) >= 2,
  },
  {
    id: 'bottles', ch: 4, title: 'What the sea says', reward: 18,
    where: 'Open sea: sail into the bottles',   // the slip's second line when the goal has no single place
    text: 'Bottles drift out here. Read what they say.',
    intro: ['There are more bottles in the water out here than there used to be. Somebody has a lot to say.'],
    outro: ['They all mention the same thing. A hut. Who writes about a hut?'],
    hints: ['Bottles bob on the open sea. Sail into them.'],
    check: (c) => c.state.stats.bottles >= (c.state.story.b0 || 0) + 2,
    count: (c) => [c.state.stats.bottles - (c.state.story.b0 || 0), 2],
    onStart: (c) => { c.state.story.b0 = c.state.stats.bottles; },
  },
  {
    id: 'gossip', ch: 4, title: 'Ask around', reward: 18,
    where: 'Any harbour but Tama',   // the slip's second line when the goal has no single place
    text: 'Somebody in a harbour must know about the hut.',
    intro: ['Harbours hear everything. Somebody at a tavern will know.'],
    outro: [],
    hints: ['Visit any harbour except Tama. Sailors talk.'],
    check: (c) => !!c.state.story.hutKnown,
  },
  {
    id: 'hut', ch: 5, title: 'Find the hut', reward: 0,
    where: 'Look at the chart',   // the slip's second line when the goal has no single place
    text: 'Find the dark hut.',
    intro: ['I would rather not go there. But you are the captain.'],
    outro: [],
    hints: ['Look at the chart. Was it always there?'],
    check: (c) => !!(c.state.hut && c.state.hut.rolls.length),
  },
  // ---- after the hut: Perrin's letters, one per region (2026-11-13). Each sends the captain into a region and never says what to find;
  // it is done when any clue of that region has been seen (clues.js regionSeen). Full game only (`full`). Appended: no index moves (RULES 30).
  {
    id: 'perrin_crown', ch: 5, title: 'Perrin: the Crown waters', reward: 25, region: 'crown', full: true,
    where: "The Crown Traders' waters",
    text: 'The Crown writes down every ship that comes in. Ask to see the book. Tell me whose name is at the top.',
    intro: ['A letter from Perrin came in with the post, Captain.', 'Perrin writes: "The Crown writes down every ship that comes in. Ask to see the book. Tell me whose name is at the top."'],
    outro: [],
    hints: ["Perrin wants us in the Crown Traders' waters. The chart shows whose waters we are in."],
    check: (c) => regionSeen(c.state, 'crown'),
  },
  {
    id: 'perrin_free', ch: 5, title: 'Perrin: the Free Cays', reward: 25, region: 'free', full: true,
    where: "The Free Cays",
    text: 'In the Free Cays they sleep by day and play by night. Go at night. Take nothing but your ears.',
    intro: ['A letter from Perrin came in with the post, Captain.', 'Perrin writes: "In the Free Cays they sleep by day and play by night. Go at night. Take nothing but your ears."'],
    outro: [],
    hints: ["Perrin wants us in the Free Cays. The chart shows whose waters we are in."],
    check: (c) => regionSeen(c.state, 'free'),
  },
  {
    id: 'perrin_lantern', ch: 5, title: 'Perrin: the Lantern waters', reward: 25, region: 'lantern', full: true,
    where: "The Lantern Guild's waters",
    text: "The Guild's lamps burn a colour I have no name for. You will tell me I am wrong. Go and look.",
    intro: ['A letter from Perrin came in with the post, Captain.', 'Perrin writes: "The Guild\'s lamps burn a colour I have no name for. You will tell me I am wrong. Go and look."'],
    outro: [],
    hints: ["Perrin wants us in the Lantern Guild's waters. The chart shows whose waters we are in."],
    check: (c) => regionSeen(c.state, 'lantern'),
  },
  {
    id: 'perrin_reef', ch: 5, title: 'Perrin: the Reef', reward: 25, region: 'reef', full: true,
    where: "The Reef Brotherhood's waters",
    text: 'The Reef counts its wrecks. Count them yourself. I would like a second opinion.',
    intro: ['A letter from Perrin came in with the post, Captain.', 'Perrin writes: "The Reef counts its wrecks. Count them yourself. I would like a second opinion."'],
    outro: [],
    hints: ["Perrin wants us in the Reef Brotherhood's waters. The chart shows whose waters we are in."],
    check: (c) => regionSeen(c.state, 'reef'),
  },
  {
    id: 'perrin_drowned', ch: 5, title: 'Perrin: the Drowned waters', reward: 25, region: 'drowned', full: true,
    where: "The Drowned waters",
    text: 'The Drowned waters have streets, and streets have doors. Go at low water, and count the doors.',
    intro: ['A letter from Perrin came in with the post, Captain.', 'Perrin writes: "The Drowned waters have streets, and streets have doors. Go at low water, and count the doors."'],
    outro: [],
    hints: ["Perrin wants us in the Drowned waters. The chart shows whose waters we are in."],
    check: (c) => regionSeen(c.state, 'drowned'),
  },
];
/** a goal that is a count shows how far along it is, next to its name: " (3/8)" */
export const goalCount = (g, c) => { if (!g.count) return ''; const [have, need] = g.count(c); return ` <b>(${Math.min(have, need)}/${need})</b>`; };
export const goalText = (g, c) => (typeof g.text === 'function' ? g.text(c) : g.text);
export const chapterOf = (state) => { const g = MAIN_GOALS[state.goals.i]; return g ? g.ch : CHAPTERS.length; };
export const unlocked = (state, key) => chapterOf(state) >= UNLOCK[key];
/** The strata gates (docs/WORLD_REDESIGN.md 5.3): what stops you is the ship and the sea, never the script. Each stratum edge is
 *  a fog wall until the ship is fitted for what lies beyond it. `tideFalling` lets the Dim be entered; once past it stays open. */
export function strataGate(state, tideFalling) {
  const up = state.upgrades || {}, reach = (state.story && state.story.reach) || 0;
  const S = STRATA;
  const gates = [
    () => true,                                                                                    // S0 Home Sound: open
    () => (up.rudder || 0) >= 2 || Object.keys(state.charts || {}).length > 0 || reach >= S[1].r1,   // S1: a broad rudder or a bought local chart
    () => (up.lantern || 0) >= 1 && (up.hull || 0) >= 2 || reach >= S[2].r1,                       // S2: lamp holds 130+, iron-banded hull
    () => (up.lantern || 0) >= 2,                                                                  // S3: the lens lantern cuts the fog belt
    () => ((up.hull || 0) >= 3 || (up.sails || 0) >= 3) && (tideFalling || reach > S[4].r0 + 2), // S4: outrun the swell, enter on a falling tide
    () => regionsSeen(state) >= 3,                                                                 // S5: three regions read, or the compass will not hold
  ];
  // gates[i] opens stratum i+1's far edge...: the wall for stratum i sits at its outer edge unless gates[i+1] is met
  for (let i = 1; i < S.length; i++) if (!gates[i]()) return S[i - 1].r1;
  return Infinity;
}
export const gateRadius = (state, tideFalling) => {
  if (state.story.free) return Infinity;
  if (typeof window !== 'undefined' && window.__BUILD === 'demo') return GATES[Math.min(GATES.length - 1, chapterOf(state))];   // the demo keeps its chapter fog
  // the first chapters are the tutorial: the wall stays at the edge of Home Sound until the main goals reach the open sea
  const r = strataGate(state, tideFalling);
  const ch = chapterOf(state);
  if (ch < 2) return Math.min(r, GATES[ch]);   // the tutorial: Home Sound only
  if (ch === 2) return Math.max(r, GATES[2]);  // "Working waters" still needs its islands
  if (!(state.hut && state.hut.rolls && state.hut.rolls.length)) return Math.max(r, GATES[Math.min(GATES.length - 1, ch)]);   // until the first throw the story's own goals stay inside the chapter's wall; after it the ship's reach (upgrades) decides
  return Math.max(r, GATES[GATES.length - 1]);   // after it the sea never shrinks: the furthest chapter reach stays, and only the ship and the clues take you past it
};

export const SIDE_GOALS = [
  { id: 'fish', title: 'Dinner at sea', reward: 15, text: 'Reef the sails (S) until you slow down, then press C to cast a line.', check: (c) => c.state.stats.fish >= 1 },
  { id: 'hail', title: 'Say hello', reward: 12, text: 'Hail a passing ship with E. Not every ship will want to talk.', check: (c) => c.state.stats.hails >= 1 },
  { id: 'bottle', title: 'Message received', reward: 15, text: 'Pick up a message in a bottle by sailing into it.', check: (c) => c.state.stats.bottles >= 1 },
  { id: 'paint', title: 'A touch of style', reward: 12, text: 'Buy something at a shipyard: paint, sails, a pennant, a figurehead.', check: (c) => c.state.stats.cosmetics >= 1 },
  { id: 'fruit', title: 'Fresh from the tree', reward: 12, text: 'Press E near a jungle or sandbar isle to pick its fruit.', check: (c) => c.state.stats.fruitPicked >= 1 },
  { id: 'dolphin', title: 'Friends of the sea', reward: 12, text: 'Spot a pod of dolphins.', check: (c) => c.state.stats.dolphins >= 1 },
  // optional since the hut was moved forward: they were main goals of chapter IV
  { id: 'errand', title: 'Odd jobs', reward: 24, text: 'Take a commission from a harbour board (fish, fruit, crates...) and hand it in.', check: (c) => (c.state.stats.commissions || 0) >= 1 },
  { id: 'salvage', title: 'Salvage rights', reward: 24, text: 'Find a half-sunk wreck in open water and salvage it (E).', check: (c) => (c.state.stats.wrecks || 0) >= 1 },
  { id: 'raider', title: 'Teach a raider a lesson', reward: 36, text: 'Raiders sail the Reef waters. Sink one: Space fires the cannons at an attacking raider.', check: (c) => (c.state.stats.sunk || 0) >= 1 },
];

// one-off remarks the mate makes when things happen
// Mara, now and then on a quiet stretch once the sea starts to feel off: cheerful, a little wrong
export const MUSINGS = [
  'Do you hear that? No? Good. Me neither.',
  'Back home we never whistled on deck. I forget why. Probably nothing.',
  'I counted the waves once. Got to a very big number and then I lost count. Or it did.',
  'Funny how the horizon never gets any closer, isn\'t it? Not funny ha-ha.',
  'The bell back home rang twice every hour. Nobody knew why. Nobody minded.',
  'If anyone asks, you have always been the captain. Seems like the sort of thing people ask out here.',
  'The water is the right colour today. I checked.',
  'Somebody has been coiling the ropes while we sleep. Nicely, too.',
  'I keep thinking we passed that rock before. Different rock. Same thought.',
  'The gulls have stopped following us. Gulls know things. Or they are lazy.',
  'Remember when the sea was loud? I miss it a little.',
  'If I start humming, tell me. I do not always notice.',
];
export const REMARKS = {
  dusk: ['The sun is going. Lighthouses only light at dusk, so keep one in sight if you can.'],
  rain: ['Rain. Good for the water barrels, bad for the view.'],
  storm: ['That sky looks angry. Maybe find a harbour, Captain.'],
  fog: ['Fog. Sail slowly, and keep your eyes open.'],
  thickfog: ['I cannot trust the compass in this. Keep a lighthouse in sight, and I will ring the bell.'],
  calm: ['Not a breath of wind. Press G for the oars, Captain. I will steer. You row.'],
  tack: ['Into the wind she crawls. Zig-zag, Captain: keep the little triangle on the gold part of the wind ring, and turn across every so often.'],
  gate: ['That fog is like a wall, Captain. Whatever is out there can wait for us.'],
  gate2: ['The shipwrights say a stronger hull or better sails go further than this, and on a falling tide. Past that, nobody sells charts.'],
  crew: ['A new hand! They do not talk much. Neither do you. You will get along.'],
  oars: ['Oars out! W to pull, S to back water, G to put them away again.'],
  redsky: ['Red sky tonight... my gran said that means a blow is coming.'],
  broadside: ['Turn into the waves, Captain! Or take the sail in. She cannot take them side-on.'],
  stormpay: ['Delivered in a storm? They will pay extra for that. People are nicer when they are wet.'],
  raider: ['Raiders, off the bow! Reef Brotherhood. Outrun them, pay them, or fight.'],
  lowhp: ['We are taking on water, Captain! Harbours repair us for free.'],
  noammo: ['We are out of cannonballs. Any harbour sells more.'],
  stage2: ['Is it just me, or has it gone very quiet out here?'],
  stage3: ['The gulls are watching us. I mean really watching us. Please tell me I am imagining it.'],
  stage4: ['I keep hearing something humming under the keel. Do you hear it?'],
  stage5: ['Captain... how long have we been sailing? I cannot remember the name of my own village.'],
  stage5b: ['Captain... how long have we been sailing? I can see my own street. I wish I could not, out here.'],   // once her village has come back to her (table.js)
  darkfish: ['That one looked back at me. Throw it in the sack.'],
  sight_volcano: ['Smoke on the horizon! Either a volcano or a very big breakfast.'],
  sight_atoll: ['Look at that water inside the ring. I could swim there all day.'],
  sight_mangrove: ['Mangroves. Mind the roots, Captain, they grab keels.'],
  sight_harbour: ['A village! Fresh bread, gossip and somewhere to sleep.'],
  rested: ['Morning, Captain! Fresh bread, fresh wind. The hull is patched, too.'],
  riddle: ['Every treasure isle has an arch with an inscription. Study it with E and it will tell you where the chest sleeps.'],
};

export class Mate {
  constructor() {
    this.el = document.getElementById('mate');
    this.txt = document.getElementById('matetxt');
    this.face = document.getElementById('mateface');
    this.more = document.getElementById('matemore');
    this.queue = []; this.cur = null; this.shown = 0; this.acc = 0; this.wait = -1; this.pause = 0; this.pin = false;
    this.history = [];
    this.hush = null;   // () => true while chatter must hold its tongue (main.js eventQuiet: the hut, the diver, 30 s either side)
    this.onBlip = null;   // (dark, guest) a soft voice blip every few letters (main.js plugs in audio.blip)
    this.el.addEventListener('pointerdown', () => this.skip());
  }
  say(text, dark = false, who = null) { this.queue.push({ text, dark, who }); }
  get busy() { return !!this.cur || this.queue.length > 0; }
  /** click / Enter: finish typing, or move on to the next line */
  skip() {
    if (!this.cur) return;
    if (this.shown < this.cur.text.length) { this.shown = this.cur.text.length; this.render(); this.wait = this.holdTime(); }
    else this.wait = 0;
  }
  holdTime() { return 3.2 + this.cur.text.length * 0.065; }   // time to read it before the next line (slow on purpose)
  render() {
    this.txt.textContent = this.cur.text.slice(0, this.shown);
    this.more.style.visibility = this.shown >= this.cur.text.length ? 'visible' : 'hidden';
  }
  update(dt) {
    if (!this.cur && this.queue.length) {
      if (this.pause > 0) { this.pause -= dt; return; }   // a breath between lines
      this.cur = this.queue.shift(); this.shown = 0; this.acc = 0; this.wait = -1;
      this.history.push(this.cur.text); if (this.history.length > 14) this.history.shift();
      this.el.classList.toggle('dark', this.cur.dark);
      this.el.classList.toggle('guest', !!this.cur.who);
      document.getElementById('mateName').textContent = this.cur.who || 'Mara, first mate';
      this.el.style.display = 'flex'; this.render();
    }
    if (!this.cur) return;
    const len = this.cur.text.length;
    if (this.shown < len) {
      this.acc += dt;
      for (;;) {
        const prev = this.cur.text[Math.max(0, this.shown - 1)];
        const delay = ',;:'.includes(prev) ? 0.16 : '.!?'.includes(prev) ? 0.34 : 0.032;
        if (this.acc < delay || this.shown >= len) break;
        this.acc -= delay; this.shown++;
        const ch = this.cur.text[this.shown - 1];
        if (this.onBlip && this.shown % 3 === 1 && /[A-Za-z0-9]/.test(ch)) this.onBlip(this.cur.dark, !!this.cur.who);
      }
      this.render();
      // Undertale-style: the portrait bobs and tilts while she talks, a little jolt on each few letters
      const k = Math.floor(this.shown / 3) % 2;
      this.face.style.transform = k ? 'rotate(-10deg) translateY(-3px) scale(1.06)' : 'rotate(9deg) translateY(1px) scale(0.98)';
      if (this.shown >= len) this.wait = this.holdTime();
    } else {
      this.face.style.transform = '';
      this.wait -= dt;
      if (this.wait <= 0) { this.cur = null; this.pause = 1.4; if (!this.queue.length && !this.pin) this.el.style.display = 'none'; }
    }
  }
}

export class Objectives {
  constructor(deps) {
    this.d = deps; // { state, world, ship, toast, giveMap }
    this.mate = new Mate();
    this.timer = 0;
    this.hintI = 0;
    this.pending = null;   // next goal whose intro has not been told yet
    this.gap = 0;
    this.stall = 0;        // seconds without progress: Mara nudges after a while
  }
  get state() { return this.d.state; }
  get current() { const g = MAIN_GOALS[this.state.goals.i] || null; return g && g.full && typeof window !== 'undefined' && window.__BUILD === 'demo' ? null : g; }   // the demo ends at the hut

  start() {
    const g = this.state.goals;
    if (g.started) return;
    g.started = true;
    this.mate.say(MAIN_GOALS[0].intro[0]);   // the rest comes as the player does each thing; no chapter card for the very first goal
  }
  chapterCard(i) { const ch = CHAPTERS[i]; if (ch && this.d.chapterCard) this.d.chapterCard(ch); }

  say(text, dark) { this.mate.say(text, dark); }

  remark(key, dread = 0) {
    // until the tutorial is well under way Mara only speaks about the quest in hand: the remarks tied to a goal's mechanic come through, the rest wait
    const MECH = ['riddle', 'crew', 'raider', 'noammo', 'notarget', 'lowhp', 'broadside', 'stormpay', 'gate'];
    if (this.d.quiet && this.d.quiet()) return;
    if (this.mate.hush && this.mate.hush()) return;   // kept for later, not lost
    if (this.d.later && !this.d.later() && !MECH.includes(key)) return;
    if (this.mate.busy || this.pending) return;   // never pile a remark onto a line she is still saying, nor in front of the next quest
    const h = this.state.hints;
    if (h[key] || !REMARKS[key]) return;
    h[key] = true;
    for (const l of REMARKS[key]) this.mate.say(l, dread > 0.6);
  }

  askHint(dread) {
    const g = this.current;
    this.stall = 0;
    if (!g) { this.mate.say('That is everything we set out to do, Captain. Sail where you like inside the fog: deliveries, errands, treasure and the side goals in your orders are all still there.'); return; }
    this.mate.say(g.hints[this.hintI++ % g.hints.length], dread > 0.6);
  }

  complete(goal, side, next = null) {
    this.d.state.gold += goal.reward;
    if (side) this.d.toast(`Goal complete: ${goal.title} (+${goal.reward} gold)`, false, 7000);
    else if (this.d.questCue) this.d.questCue(goal, next);   // main goals get the big banner instead of a toast
    else this.d.toast(`Goal complete: ${goal.title} (+${goal.reward} gold)`, false, 7000);
    if (side) this.state.goals.side[goal.id] = true;
  }

  update(dt, dread) {
    this.mate.update(dt);
    // the next goal is announced a moment after Mara has finished talking
    if (this.pending) {
      if (!this.mate.busy) {
        this.gap -= dt;
        if (this.gap <= 0) {
          const next = this.pending; this.pending = null;
          let done = false; try { done = next.check(this.d); } catch (e) { /* not checkable yet */ }
          if (done) { this.timer = 0; return; }   // already done (bought the sails before she could suggest it): no intro, it completes at once
          const card = this.newCh; if (this.newCh) { this.newCh = false; this.chapterCard(next.ch); }
          if (this.d.questNew) this.d.questNew(next, !card);   // the NEW QUEST card comes with her words
          for (const l of (typeof next.intro === 'function' ? next.intro(this.d) : next.intro)) this.mate.say(l, dread > 0.6);
        }
      }
      return;
    }
    this.stall += dt;
    if (this.stall > 240 && !this.mate.busy && !(this.mate.hush && this.mate.hush()) && this.current && this.state.goals.started) this.askHint(dread);   // stuck: a gentle nudge
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    const c = this.d, g = this.state.goals;
    const cur = this.current;
    if (cur && !(cur.waitMate && this.mate.busy) && cur.check(c)) {
      const following = MAIN_GOALS[g.i + 1] || null;
      this.complete(cur, false, following);
      for (const l of (typeof cur.outro === 'function' ? cur.outro(c) : cur.outro || [])) this.mate.say(l, dread > 0.6);
      if (cur.onDone) cur.onDone(c);
      g.i++; this.hintI = 0; this.stall = 0;
      const next = this.current;
      if (next) { this.pending = next; this.gap = g.i < 7 ? 8 : 5;   // early goals come slowly: time to take it in
         this.newCh = next.ch !== cur.ch; if (next.onStart) next.onStart(this.d); }
      if (this.d.onStep) this.d.onStep(cur, next);
    }
    if (!this.d.later || this.d.later()) for (const s of SIDE_GOALS) if (!g.side[s.id] && s.check(c)) this.complete(s, true);   // optional goals wait until the tutorial is well under way
  }
}
