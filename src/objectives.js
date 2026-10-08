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
  { n: 'IV', title: 'Check my chart', act: 'Rumours of the Drowned' },
  { n: 'V', title: 'Strange notes', act: 'Rumours of the Drowned' },
  { n: 'VI', title: 'The table', act: 'Rumours of the Drowned' },
];
/** how far from Tama the fog lets you sail, per chapter (the demo ends after chapter VI) */
export const GATES = [430, 430, 820, 1250, 1650, 1650];
/** the chapter a system opens in */
export const UNLOCK = { fish: 1, oars: 2, passengers: 2, crew: 3, dice: 3, haggle: 3, cards: 3 };

export const MAIN_GOALS = [
  {
    id: 'sail', ch: 0, title: 'Find your sea legs', reward: 20,
    text: 'Steer with A and D, set the sails with W and S. Sail about 100 units.',
    intro: ['Morning, Captain! I am Mara, your first mate, and this is the Pocket Pearl. She is small, but she is ours.',
      'We are still tied up at Tama, sails furled. W lets them out, S reefs them, A and D steer.',
      'The ring at the top right is the wind: the arrow shows where it blows, and the ring glows where she sails well. The little triangle is our bow.'],
    outro: ['Good. You can already feel how the wind pushes her. Beam and downwind is fast; straight into it is slow.'],
    hints: ['Hold W to let the sails out, then A or D to turn.', 'Turn until the little triangle sits on a bright part of the wind ring: that is where she runs fast.'],
    check: (c) => c.state.stats.dist >= 100,
  },
  {
    id: 'harbour', ch: 0, title: 'Make landfall', reward: 20,
    text: 'Bring her back to Tama\'s pier and press E.',
    intro: ['Nicely done. Now bring her back to Tama\'s pier and press E. The harbourmaster was waving at us.'],
    outro: ['Old Perrin left something for you with the harbourmaster.'],
    hints: ['Tama is the island with the lighthouse and the long wooden pier.', 'Sail right up to the end of the pier, then press E.'],
    check: (c) => c.state.stats.harbours >= 1,
    onDone: (c) => c.giveMap(HOME_ISLE, 'Old Perrin'),
  },
  {
    id: 'dig', ch: 1, title: 'Follow the riddle', reward: 60,
    text: 'Perrin\'s riddle is in your log (Journal). Find the right shore of Hollow Cay Galen and dig.',
    intro: ['Perrin wrote you a riddle. It is in your log, under Journal. Something about Hollow Cay Galen, north-east of Tama.',
      'Find the shore the riddle means, stop the ship, and press E to dig. Oh, and if we stop at sea, C casts a line. Dinner!'],
    outro: ['Ha! Treasure! A captain with gold in the hold is a captain with options.'],
    hints: ['The riddle is in the log (M, Journal tab). Sunrise is east, sunset is west.', 'Try the shore the riddle describes. A wrong shore only costs a few seconds.'],
    check: (c) => c.state.dug.has(HOME_ISLE),
  },
  {
    id: 'upgrade', ch: 1, title: 'Spend your loot', reward: 30,
    text: 'Buy something from a shipwright.',
    intro: ['That is a good haul. The shipwright in any harbour would love some of it. Better sails, and we could go further.'],
    outro: ['You can feel the difference already.'],
    hints: ['Any harbour has a shipwright: press E at the pier and pick the Shipwright tab.'],
    check: (c) => Object.values(c.state.upgrades).some((v) => v > 0),
  },
  {
    id: 'job', ch: 2, title: 'Earn your keep', reward: 50,
    text: 'Take a delivery from a harbour board and bring it where it belongs.',
    intro: ['The fog has lifted a little further out. Good: harbours pay well for deliveries, and some folk pay for passage too.',
      'If the wind dies on us, G puts the oars out. I steer, you row.'],
    outro: ['Reputation matters out here. Harbours remember you.'],
    hints: ['The board in a harbour menu has deliveries. Dock at the other harbour and deliver from the top of its board.'],
    check: (c) => c.state.stats.deliveries >= 1,
  },
  {
    id: 'chart', ch: 2, title: 'Chart the sea', reward: 40,
    text: 'Chart 8 islands by sailing close to them.',
    intro: ['Let us fill in the chart. Sail close to islands and they go on the map (M).'],
    outro: ['A fine start to a map. Perrin would be proud. Probably. Nobody has seen him smile.'],
    hints: ['Islands are charted when you sail close to them. The empty stretches are worth crossing.'],
    check: (c) => Object.keys(c.state.discovered).length >= 8,
  },
  {
    id: 'perrin', ch: 3, title: 'A note from Perrin', reward: 20,
    text: 'Perrin has sent word to Harbour Tama.',
    intro: ['The harbourmaster in Tama waved at us with a letter last time. Perrin again, I bet.',
      'Taverns are hiring hands these days, by the way. And somebody always wants to play dice.'],
    outro: [],
    hints: ['Dock at Harbour Tama.'],
    check: (c) => !!c.state.story.perrinNote,
  },
  {
    id: 'checkchart', ch: 3, title: 'Check his chart', reward: 60,
    text: (c) => c.state.story.check ? `Perrin wants to know if ${c.state.story.check.name}, ${c.state.story.check.dir} of Tama, has ${c.state.story.check.detail}. Go and look.` : 'Read Perrin\'s note in your log.',
    intro: ['He wants us to check something on his chart. His note is in the Journal. Far out, Captain.'],
    outro: ['He was right. About everything. Captain... nobody has ever charted that island. Nobody.'],
    hints: ['Perrin\'s note says which island, and roughly where. It is far from Tama.', 'Sail close to the island and slow down to have a good look.'],
    check: (c) => { const k = c.state.story.check; return !!k && Math.hypot(c.ship.pos.x - k.x, c.ship.pos.z - k.z) < k.r + 40 && c.ship.speed < 3; },
  },
  {
    id: 'bottles', ch: 4, title: 'What the sea says', reward: 30,
    text: 'Bottles drift out here. Read what they say.',
    intro: ['There are more bottles in the water out here than there used to be. Somebody has a lot to say.'],
    outro: ['They all mention the same thing. A hut. Who writes about a hut?'],
    hints: ['Bottles bob on the open sea. Sail into them.'],
    check: (c) => c.state.stats.bottles >= (c.state.story.b0 || 0) + 2,
    onStart: (c) => { c.state.story.b0 = c.state.stats.bottles; },
  },
  {
    id: 'gossip', ch: 4, title: 'Ask around', reward: 30,
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
export const goalText = (g, c) => (typeof g.text === 'function' ? g.text(c) : g.text);
export const chapterOf = (state) => { const g = MAIN_GOALS[state.goals.i]; return g ? g.ch : CHAPTERS.length; };
export const unlocked = (state, key) => chapterOf(state) >= UNLOCK[key];
export const gateRadius = (state) => (state.story.free ? Infinity : GATES[Math.min(GATES.length - 1, chapterOf(state))]);

export const SIDE_GOALS = [
  { id: 'fish', title: 'Dinner at sea', reward: 25, text: 'Reef the sails (S) until you slow down, then press C to cast a line.', check: (c) => c.state.stats.fish >= 1 },
  { id: 'hail', title: 'Say hello', reward: 20, text: 'Hail a passing ship with E. Not every ship will want to talk.', check: (c) => c.state.stats.hails >= 1 },
  { id: 'bottle', title: 'Message received', reward: 25, text: 'Pick up a message in a bottle by sailing into it.', check: (c) => c.state.stats.bottles >= 1 },
  { id: 'wreck', title: 'Salvage rights', reward: 40, text: 'Find a wreck and salvage it (E).', check: (c) => c.state.stats.wrecks >= 1 },
  { id: 'paint', title: 'A touch of style', reward: 20, text: 'Buy something at a shipyard: paint, sails, a pennant, a figurehead.', check: (c) => c.state.stats.cosmetics >= 1 },
  { id: 'riddle', title: 'Riddle me this', reward: 50, text: 'Solve a second treasure riddle: study the arch on a treasure isle, then dig the right shore.', check: (c) => c.state.stats.solved >= 2 },
  { id: 'fruit', title: 'Fresh from the tree', reward: 20, text: 'Press E near a jungle or sandbar isle to pick its fruit.', check: (c) => c.state.stats.fruitPicked >= 1 },
  { id: 'errand', title: 'Odd jobs', reward: 40, text: 'Finish a commission from a harbour board (fish, fruit, crates...).', check: (c) => (c.state.stats.commissions || 0) >= 1 },
  { id: 'dolphin', title: 'Friends of the sea', reward: 20, text: 'Spot a pod of dolphins.', check: (c) => c.state.stats.dolphins >= 1 },
  { id: 'raider', title: 'Teach a raider a lesson', reward: 60, text: 'Optional: sink a raider. Space fires your cannons.', check: (c) => c.state.stats.sunk >= 1 },
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
    this.queue = []; this.cur = null; this.shown = 0; this.acc = 0; this.wait = -1;
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
  holdTime() { return 2.2 + this.cur.text.length * 0.04; }
  render() {
    this.txt.textContent = this.cur.text.slice(0, this.shown);
    this.more.style.visibility = this.shown >= this.cur.text.length ? 'visible' : 'hidden';
  }
  update(dt) {
    if (!this.cur && this.queue.length) {
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
      if (this.wait <= 0) { this.cur = null; if (!this.queue.length) this.el.style.display = 'none'; }
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
    for (const l of MAIN_GOALS[0].intro) this.mate.say(l);
    this.chapterCard(0);
  }
  chapterCard(i) { const ch = CHAPTERS[i]; if (ch && this.d.chapterCard) this.d.chapterCard(ch); }

  say(text, dark) { this.mate.say(text, dark); }

  remark(key, dread = 0) {
    const h = this.state.hints;
    if (h[key] || !REMARKS[key]) return;
    h[key] = true;
    for (const l of REMARKS[key]) this.mate.say(l, dread > 0.6);
  }

  askHint(dread) {
    const g = this.current;
    this.stall = 0;
    if (!g) { this.mate.say('We are free to sail wherever you like, Captain. The side goals in your log (Goals tab) are always there.'); return; }
    this.mate.say(g.hints[this.hintI++ % g.hints.length], dread > 0.6);
  }

  complete(goal, side) {
    this.d.state.gold += goal.reward;
    this.d.toast(`Goal complete: ${goal.title} (+${goal.reward} gold)`, false, 7000);
    if (side) this.state.goals.side[goal.id] = true;
  }

  update(dt, dread) {
    this.mate.update(dt);
    // the next goal is only announced a few seconds after Mara has finished talking
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
    if (cur && cur.check(c) && !this.mate.busy) {
      this.complete(cur, false);
      for (const l of cur.outro || []) this.mate.say(l, dread > 0.6);
      if (cur.onDone) cur.onDone(c);
      g.i++; this.hintI = 0; this.stall = 0;
      const next = this.current;
      if (next) { this.pending = next; this.gap = 7; this.newCh = next.ch !== cur.ch; if (next.onStart) next.onStart(this.d); }
      if (this.d.onStep) this.d.onStep(cur, next);
    }
    for (const s of SIDE_GOALS) if (!g.side[s.id] && s.check(c)) this.complete(s, true);
  }
}
