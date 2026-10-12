import { smoothstep } from './util.js';

// The first mate (Mara) and the starter goals. A short main chain teaches the game one verb at a time;
// side goals are optional and complete themselves whenever you happen to do them.
const HOME_ISLE = '1,-1'; // Hollow Cay Galen, the starter treasure isle

// The story runs in chapters. Each chapter is a few steps; a chapter opens new systems (UNLOCK) and pushes the
// fog wall back (GATES). Goals are nudges from Mara, never markers: no handholding.
export const CHAPTERS = [
  { n: 'I', title: 'Sea legs', act: 'Fair winds' },
  { n: 'II', title: "Perrin's riddle", act: 'Fair winds' },
  { n: 'III', title: 'Earn your keep', act: 'Fair winds' },
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
    text: 'Steer with A and D, set the sails with W and S. Sail about 100 units.',
    // told one line at a time, each when the player has done the last thing (see onbTick in main.js)
    intro: ['Morning, Captain! I am Mara, your first mate, and this is the Merry Gull. She is small, but she is ours.',
      'There she goes. A and D steer her, and the wind does the rest.',
      'That ring is the wind. Gold means she sails well, red means she crawls. The little triangle is our bow.'],
    outro: ['Good. Beam and downwind is fast; straight into the wind is slow.'],
    hints: ['Hold W to let the sails out, then A or D to turn.', 'Turn until the little triangle sits on a gold part of the wind ring: that is where she runs fast.'],
    check: (c) => c.state.stats.dist >= 100 && ((c.state.story.onbStep || 0) >= 2 || !!c.state.story.onbAll),   // not before Mara has explained the steering and the wind ring
    waitMate: true,
  },
  {
    id: 'harbour', ch: 0, title: 'Make landfall', reward: 12,
    text: 'Bring her back to Tama\'s pier and press E.',
    intro: ['Nicely done. Now bring her back to Tama\'s pier and press E. The harbourmaster was waving at us.'],
    outro: ['Old Perrin left something for you with the harbourmaster.'],
    hints: ['Tama is the island with the lighthouse and the long wooden pier.', 'Sail right up to the end of the pier, then press E.'],
    check: (c) => c.state.stats.harbours >= 1,
    onDone: (c) => { c.state.story.letterP1 = c.state.story.letterP1 || 'wait'; },   // Perrin's riddle waits at the Tama board as a letter; the player takes it
  },
  {
    id: 'dig', ch: 1, title: 'Follow the riddle', reward: 36,
    text: 'Perrin\'s riddle is in your log (Journal). Find the right shore of Hollow Cay Galen and dig.',
    intro: ['Perrin left you a letter with the harbourmaster: take it at the Board sign in Tama.',
      'Then find the shore its riddle means, stop the ship and press E to dig.'],
    outro: ['Ha! Treasure! A captain with gold in the hold is a captain with options.'],
    hints: ['Take Perrin\'s letter at the Tama Board sign first (the little letter icon). The riddle is then in the log (M, Riddles tab). Sunrise is east, sunset is west.', 'Try the shore the riddle describes. A wrong shore only costs a few seconds.'],
    check: (c) => c.state.dug.has(HOME_ISLE),
    tab: 'board', mark: ['takeLetter'],
  },
  {
    id: 'upgrade', ch: 1, title: 'Spend your loot', reward: 18,
    text: 'Buy something from a shipwright.',
    intro: ['That is a good haul. The shipwright in any harbour would love some of it. Better sails, and we could go further.'],
    outro: ['You can feel the difference already.'],
    hints: ['Any harbour has a shipwright: press E at the pier and pick the Shipwright tab.'],
    check: (c) => Object.values(c.state.upgrades).some((v) => v > 0),
    tab: 'wright', mark: ['buy'],   // tutorial: the harbour sign and the button to press are marked (later goals never are)
  },
  {
    id: 'calm', ch: 2, title: 'Dead calm', reward: 24,
    text: 'The wind has died. Put the oars out (G) and row, then catch a fish (stop, then C).',
    intro: ['Not a breath of wind. Press G for the oars, then W to row us a little way.',
      'Then slow right down and press C to fish. When it bites, hold Space to reel, and let go to ease off.'],
    outro: ['Dinner AND exercise. A full day\'s work for a captain.', 'And listen: there is the wind again. Sails up, Captain.'],
    hints: ['Press G to put the oars out, then hold W to row. G again puts them away.', 'Stop the ship (S), then press C to cast a line. When it bites, press C or Space, then hold Space to reel.'],
    check: (c) => (c.state.stats.rowed || 0) >= ((c.state.story.cal0 || {}).r || 0) + 50 && c.state.stats.fish >= ((c.state.story.cal0 || {}).f || 0) + 1,
    onStart: (c) => { c.state.story.cal0 = { r: c.state.stats.rowed || 0, f: c.state.stats.fish }; if (c.forceCalm) c.forceCalm(420); },
    onDone: (c) => { if (c.forceCalm) c.forceCalm(0); },   // the wind picks up again
  },
  {
    id: 'tack', ch: 2, title: 'Beat to windward', reward: 24,
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
    text: 'Take a delivery from a harbour board and bring it where it belongs.',
    intro: ['Harbours pay well for deliveries. Take one from a Board and bring it where it belongs.'],
    outro: ['Reputation matters out here. Harbours remember you.'],
    hints: ['The board in a harbour menu has deliveries. Dock at the other harbour and deliver from the top of its board.'],
    check: (c) => c.state.stats.deliveries >= 1,
    tab: 'board', mark: ['jobAccept', 'doDeliver'],
  },
  {
    id: 'passenger', ch: 2, title: 'Passage', reward: 24,
    text: 'Take a passenger from a harbour board and bring them to where they are bound.',
    intro: ['Some folk pay for passage, and they talk. Take one from a Board and see them to their stop.'],
    outro: ['Good company, and paid for it. Do not tell the cargo.'],
    hints: ['Open the Board sign in a harbour. A passenger is offered there now and then. Drop them off at their harbour.'],
    check: (c) => (c.state.stats.passengers || 0) >= 1,
  },
  {
    id: 'chart', ch: 2, title: 'Chart the sea', reward: 24,
    text: 'Chart 8 islands by sailing close to them.',
    intro: ['Let us fill in the chart. Sail close to islands and they go on the map (M).'],
    outro: ['A fine start to a map. Perrin would be proud. Probably. Nobody has seen him smile.'],
    hints: ['Islands are charted when you sail close to them. The empty stretches are worth crossing.'],
    check: (c) => Object.keys(c.state.discovered).length >= 8,
    count: (c) => [Object.keys(c.state.discovered).length, 8],
  },
  {
    id: 'tavern', ch: 3, title: 'Meet the locals', reward: 18,
    text: 'In a harbour, open the Tavern sign: hire a hand, or sit down for a game of dice.',
    intro: ['Taverns are hiring hands these days, Captain. And somebody always wants to play dice. Either would do us good.'],
    outro: ['Good. A crew is only as good as the company it keeps.'],
    hints: ['Dock at any harbour and open the Tavern sign (3). A hired hand costs a few coins; dice cost 10 gold a game.'],
    check: (c) => c.state.crew.length >= 1 || (c.state.stats.pig || 0) >= 1,
    tab: 'tavern', mark: ['hireHand', 'playPig'],
  },
  {
    id: 'perrin', ch: 3, title: 'A note from Perrin', reward: 12,
    text: 'Perrin has sent word to Harbour Tama. A letter waits at the Board.',
    intro: ['The harbourmaster in Tama waved at us with a letter last time. Perrin again, I bet.'],
    outro: [],
    hints: ['Dock at Harbour Tama. A letter icon on the Board sign means something is waiting for you.'],
    check: (c) => !!c.state.story.perrinNote,
  },
  {
    id: 'checkchart', ch: 3, title: 'Check his chart', reward: 36,
    text: (c) => c.state.story.check ? `Perrin wants to know if ${c.state.story.check.name}, ${c.state.story.check.dir} of Tama, has ${c.state.story.check.detail}. Go and look.` : 'Read Perrin\'s note in your log.',
    intro: ['He wants us to check something on his chart. His note is in the Journal. Far out, Captain.'],
    outro: ['He was right. About everything. Captain... nobody has ever charted that island. Nobody.'],
    hints: ['Perrin\'s note says which island, and roughly where. It is far from Tama.', 'Sail close to the island and slow down to have a good look.'],
    check: (c) => { const k = c.state.story.check; return !!k && Math.hypot(c.ship.pos.x - k.x, c.ship.pos.z - k.z) < k.r + 40 && c.ship.speed < 3; },
  },
  {
    id: 'errand', ch: 3, title: 'Odd jobs', reward: 24,
    text: 'Take a commission from a harbour board (fish, fruit, crates...) and hand it in.',
    intro: ['The Boards also carry little errands: fish, fruit, lost crates.'],
    outro: ['A tidy bit of work. The harbour will remember it.'],
    hints: ['Commissions are on the Board sign too. Fish and fruit you can find at sea and on the isles.'],
    check: (c) => (c.state.stats.commissions || 0) >= 1,
  },
  {
    id: 'salvage', ch: 3, title: 'Salvage rights', reward: 24,
    text: 'Find a half-sunk wreck, stop beside it and salvage it (E).',
    intro: ['Wrecks sit half under in open water. Stop beside one and press E.'],
    outro: ['One ship\'s bad day is another one\'s dinner.'],
    hints: ['Look for broken masts and hulls in open water, away from the islands.', 'Stop the ship completely, then press E.'],
    check: (c) => (c.state.stats.wrecks || 0) >= 1,
  },
  {
    id: 'riddle2', ch: 3, title: 'Riddle me this', reward: 30,
    text: 'Find another treasure isle. Study the arch (E), then dig the shore its riddle describes.',
    intro: ['Every treasure isle has an arch. Study it with E and it tells you where the chest sleeps.'],
    outro: ['Two chests! Perrin would be insufferable.'],
    hints: ['Treasure isles show a stone arch on the chart. Press E at its shore to read it, then read the riddle in the log.', 'Sunrise is east, sunset is west.'],
    check: (c) => (c.state.stats.solved || 0) >= 2,
  },
  {
    id: 'rest', ch: 3, title: 'A bed for the night', reward: 18,
    text: 'Sleep at a harbour tavern. Rooms are let from 17:00.',
    intro: ['Rooms are let from five in the afternoon, and the crew mends the hull while you sleep.'],
    outro: ['Slept like a log. A very small log. Good morning!'],
    hints: ['Dock at a harbour after 17:00 and open the Tavern sign.'],
    check: (c) => c.state.story.restDay != null,
  },
  {
    id: 'raider', ch: 3, title: 'Teach a raider a lesson', reward: 36,
    text: 'Raiders sail these waters. Sink one: Space fires the cannons at an attacking raider.',
    intro: ['Raiders, Captain, and one is looking for us. Space fires the cannons: keep her broadside.'],
    outro: ['Splendid! They will think twice. For a day or two.'],
    hints: ['Raiders only fire when they are close. Turn so they are beside you and press Space.', 'Harbours repair the hull for free, and sell cannonballs.'],
    check: (c) => (c.state.stats.sunk || 0) >= 1,
  },
  {
    id: 'bottles', ch: 4, title: 'What the sea says', reward: 18,
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
    text: 'Somebody in a harbour must know about the hut.',
    intro: ['Harbours hear everything. Somebody at a tavern will know.'],
    outro: [],
    hints: ['Visit any harbour except Tama. Sailors talk.'],
    check: (c) => !!c.state.story.hutKnown,
  },
  {
    id: 'hut', ch: 5, title: 'Find the hut', reward: 0,
    text: 'Find the dark hut.',
    intro: ['I would rather not go there. But you are the captain.'],
    outro: [],
    hints: ['Look at the chart. Was it always there?'],
    check: (c) => !!(c.state.hut && c.state.hut.rolls.length),
  },
];
/** a goal that is a count shows how far along it is, next to its name: " (3/8)" */
export const goalCount = (g, c) => { if (!g.count) return ''; const [have, need] = g.count(c); return ` <b>(${Math.min(have, need)}/${need})</b>`; };
export const goalText = (g, c) => (typeof g.text === 'function' ? g.text(c) : g.text);
export const chapterOf = (state) => { const g = MAIN_GOALS[state.goals.i]; return g ? g.ch : CHAPTERS.length; };
export const unlocked = (state, key) => chapterOf(state) >= UNLOCK[key];
export const gateRadius = (state) => (state.story.free ? Infinity : GATES[Math.min(GATES.length - 1, chapterOf(state))]);

export const SIDE_GOALS = [
  { id: 'fish', title: 'Dinner at sea', reward: 15, text: 'Reef the sails (S) until you slow down, then press C to cast a line.', check: (c) => c.state.stats.fish >= 1 },
  { id: 'hail', title: 'Say hello', reward: 12, text: 'Hail a passing ship with E. Not every ship will want to talk.', check: (c) => c.state.stats.hails >= 1 },
  { id: 'bottle', title: 'Message received', reward: 15, text: 'Pick up a message in a bottle by sailing into it.', check: (c) => c.state.stats.bottles >= 1 },
  { id: 'paint', title: 'A touch of style', reward: 12, text: 'Buy something at a shipyard: paint, sails, a pennant, a figurehead.', check: (c) => c.state.stats.cosmetics >= 1 },
  { id: 'fruit', title: 'Fresh from the tree', reward: 12, text: 'Press E near a jungle or sandbar isle to pick its fruit.', check: (c) => c.state.stats.fruitPicked >= 1 },
  { id: 'dolphin', title: 'Friends of the sea', reward: 12, text: 'Spot a pod of dolphins.', check: (c) => c.state.stats.dolphins >= 1 },
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
  crew: ['A new hand! They do not talk much. Neither do you. You will get along.'],
  oars: ['Oars out! W to pull, S to back water, G to put them away again.'],
  redsky: ['Red sky tonight... my gran said that means a blow is coming.'],
  broadside: ['Turn into the waves, Captain! Or take the sail in. She cannot take them side-on.'],
  stormpay: ['Delivered in a storm? They will pay extra for that. People are nicer when they are wet.'],
  raider: ['Raiders, off the bow! They are Reef Brotherhood. You can outrun them, pay tribute, or fight with Space.'],
  lowhp: ['We are taking on water, Captain! Harbours repair us for free.'],
  noammo: ['We are out of cannonballs. Any harbour sells more.'],
  notarget: ['No raider in range. Space only fires at raiders that are attacking us.'],
  stage2: ['Is it just me, or has it gone very quiet out here?'],
  stage3: ['The gulls are watching us. I mean really watching us. Please tell me I am imagining it.'],
  stage4: ['I keep hearing something humming under the keel. Do you hear it?'],
  stage5: ['Captain... how long have we been sailing? I cannot remember the name of my own village.'],
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
  get current() { return MAIN_GOALS[this.state.goals.i] || null; }

  start() {
    const g = this.state.goals;
    if (g.started) return;
    g.started = true;
    this.mate.say(MAIN_GOALS[0].intro[0]);   // the rest comes as the player does each thing; no chapter card for the very first goal
  }
  chapterCard(i) { const ch = CHAPTERS[i]; if (ch && this.d.chapterCard) this.d.chapterCard(ch); }

  say(text, dark) { this.mate.say(text, dark); }

  remark(key, dread = 0) {
    if (this.d.quiet && this.d.quiet()) return;   // nothing but the first goals at the start
    const h = this.state.hints;
    if (h[key] || !REMARKS[key]) return;
    h[key] = true;
    for (const l of REMARKS[key]) this.mate.say(l, dread > 0.6);
  }

  askHint(dread) {
    const g = this.current;
    this.stall = 0;
    if (!g) { this.mate.say('That is everything we set out to do, Captain. Sail where you like inside the fog: deliveries, errands, treasure and the side goals in your log (Goals tab) are all still there.'); return; }
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
          if (this.newCh) { this.newCh = false; this.chapterCard(next.ch); }
          for (const l of next.intro) this.mate.say(l, dread > 0.6);
        }
      }
      return;
    }
    this.stall += dt;
    if (this.stall > 240 && !this.mate.busy && this.current && this.state.goals.started) this.askHint(dread);   // stuck: a gentle nudge
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    const c = this.d, g = this.state.goals;
    const cur = this.current;
    if (cur && !(cur.waitMate && this.mate.busy) && cur.check(c)) {
      const following = MAIN_GOALS[g.i + 1] || null;
      this.complete(cur, false, following);
      for (const l of cur.outro || []) this.mate.say(l, dread > 0.6);
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
