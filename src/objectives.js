import { smoothstep } from './util.js';

// The first mate (Mara) and the starter goals. A short main chain teaches the game one verb at a time;
// side goals are optional and complete themselves whenever you happen to do them.
const HOME_ISLE = '1,-1'; // Hollow Cay Galen, the starter treasure isle

export const MAIN_GOALS = [
  {
    id: 'sail', title: 'Find your sea legs', reward: 20,
    text: 'Steer with A and D, set the sails with W and S. Sail about 100 units.',
    intro: ['Morning, Captain! I am Mara, your first mate, and this is the Pocket Pearl. She is small, but she is ours.',
      'Steer with A and D. W lets the sails out, S reefs them. Watch the compass: the blue arrows show where the wind is blowing to.'],
    outro: ['Good. You can already feel how the wind pushes her. Beam and downwind is fast; straight into it is slow.'],
    hints: ['Hold W to open the sails, then A or D to turn. The wind arrow in the compass shows where the wind blows to.', 'Sail with the wind behind or beside you.'],
    check: (c) => c.state.stats.dist >= 100,
  },
  {
    id: 'harbour', title: 'Make landfall', reward: 20,
    text: 'Sail to Harbour Tama, straight north of where you started. Press E near it.',
    intro: ['That is Harbour Tama, straight ahead (north). Sail close and press E: the shipwright, job board and rumours are all there.'],
    outro: ['Welcome to Tama! Old Perrin left something for you with the harbourmaster.'],
    hints: ['Tama is straight north of where you started, with a lighthouse and a long dock.', 'Get within about 15 units of the shore, then press E.'],
    check: (c) => c.state.stats.harbours >= 1,
    onDone: (c) => c.giveMap(HOME_ISLE, 'Old Perrin'),
  },
  {
    id: 'dig', title: 'Follow the riddle', reward: 60,
    text: 'Hollow Cay Galen lies north-east of Tama. Read the riddle in your log (J, Journal tab), find the right shore, and press E to dig.',
    intro: ['Perrin wrote you a riddle: the chest is buried on one particular shore of Hollow Cay Galen, north-east of here. It is in your log, under Journal.',
      'Sail around the island, find the shore the riddle means, and press E to dig. Wrong shore? We will just try another.'],
    outro: ['Ha! Treasure! A captain with gold in the hold is a captain with options.'],
    hints: ['Open the log with M and look at the Journal tab for the riddle. Sunrise is east, sunset is west, the pole star is north.', 'Try the shore the riddle describes. A wrong shore only costs a few seconds.'],
    check: (c) => c.state.dug.has(HOME_ISLE),
  },
  {
    id: 'upgrade', title: 'Spend your loot', reward: 30,
    text: 'Visit a harbour shipwright (E) and buy any ship upgrade.',
    intro: ['That is a good haul. Spend some of it at the shipwright in any harbour. Sails and a rudder make her much nicer to sail.'],
    outro: ['You can feel the difference already.'],
    hints: ['Sail back to Harbour Tama and press E. The shipwright is at the bottom of the harbour menu.'],
    check: (c) => Object.values(c.state.upgrades).some((v) => v > 0),
  },
  {
    id: 'job', title: 'Earn your keep', reward: 50,
    text: 'Take a delivery job from a harbour job board and deliver it.',
    intro: ['Harbours pay well for deliveries. Take a job from the board in a harbour menu, then sail to the destination and press E there.'],
    outro: ['Reputation matters out here. Harbours remember you, and so do the ships nearby.'],
    hints: ['Press E at a harbour and look for "Job board". The compass shows a small orange marker toward your destination.'],
    check: (c) => c.state.stats.deliveries >= 1,
  },
  {
    id: 'chart', title: 'Chart the sea', reward: 40,
    text: 'Chart 6 islands by sailing close to them. Check your map (M).',
    intro: ['Now let us fill in the chart. Sail close to islands and they are marked on your map. Press M to see it.'],
    outro: ['A fine start to a map.'],
    hints: ['Islands are charted when you get within about 30 units of them.'],
    check: (c) => Object.keys(c.state.discovered).length >= 6,
  },
  {
    id: 'sector', title: 'Beyond the sound', reward: 60,
    text: 'Sail into a new sector. The sea changes as you go.',
    intro: ['The world is split into sectors, each run by a different faction. Cross into a new one and see what you find.'],
    outro: ['Ships and harbours here wear different colours. And the further you go, the odder things get. I do not like the gulls out here.'],
    hints: ['Sectors are about 550 units wide. Sail in one direction for a minute or so.'],
    check: (c) => c.state.sectorsSeen.length >= 3,
  },
];

export const SIDE_GOALS = [
  { id: 'fish', title: 'Dinner at sea', reward: 25, text: 'Reef the sails (S) until you slow down, then press C to cast a line.', check: (c) => c.state.stats.fish >= 1 },
  { id: 'hail', title: 'Say hello', reward: 20, text: 'Hail a passing ship with E. Not every ship will want to talk.', check: (c) => c.state.stats.hails >= 1 },
  { id: 'bottle', title: 'Message received', reward: 25, text: 'Pick up a message in a bottle by sailing into it.', check: (c) => c.state.stats.bottles >= 1 },
  { id: 'wreck', title: 'Salvage rights', reward: 40, text: 'Find a wreck and salvage it (E).', check: (c) => c.state.stats.wrecks >= 1 },
  { id: 'paint', title: 'A touch of style', reward: 20, text: 'Buy something at a shipyard: paint, sails, a pennant, a figurehead.', check: (c) => c.state.stats.cosmetics >= 1 },
  { id: 'riddle', title: 'Riddle me this', reward: 50, text: 'Solve a second treasure riddle: study the arch on a treasure isle, then dig the right shore.', check: (c) => c.state.stats.solved >= 2 },
  { id: 'raider', title: 'Teach a raider a lesson', reward: 60, text: 'Optional: sink a raider. Space fires your cannons.', check: (c) => c.state.stats.sunk >= 1 },
];

// one-off remarks the mate makes when things happen
export const REMARKS = {
  dusk: ['The sun is going. Lighthouses only light at dusk, so keep one in sight if you can.'],
  rain: ['Rain. Good for the water barrels, bad for the view.'],
  storm: ['That sky looks angry. Maybe find a harbour, Captain.'],
  fog: ['Fog. Sail slowly, and keep your eyes open.'],
  raider: ['Raiders, off the bow! They are Reef Brotherhood. You can outrun them, pay tribute, or fight with Space.'],
  lowhp: ['We are taking on water, Captain! Harbours repair us for free.'],
  noammo: ['We are out of cannonballs. Any harbour sells more.'],
  notarget: ['No raider in range. Space only fires at raiders that are attacking us.'],
  stage2: ['Is it just me, or has it gone very quiet out here?'],
  stage3: ['The gulls are watching us. I mean really watching us. Please tell me I am imagining it.'],
  stage4: ['I keep hearing something humming under the keel. Do you hear it?'],
  stage5: ['Captain... how long have we been sailing? I cannot remember the name of my own village.'],
  darkfish: ['That one looked back at me. Throw it in the sack.'],
  riddle: ['Every treasure isle has an arch with an inscription. Study it with E and it will tell you where the chest sleeps.'],
};

export class Mate {
  constructor() {
    this.el = document.getElementById('mate');
    this.txt = document.getElementById('matetxt');
    this.queue = []; this.cur = null; this.t = 0;
  }
  say(text, dark = false) {
    this.queue.push({ text, dark, ms: Math.max(3.5, 2 + text.length * 0.05) });
  }
  update(dt) {
    if (!this.cur && this.queue.length) {
      this.cur = this.queue.shift(); this.t = this.cur.ms;
      this.txt.textContent = this.cur.text;
      this.el.classList.toggle('dark', this.cur.dark);
      this.el.style.display = 'flex';
    }
    if (this.cur) {
      this.t -= dt;
      if (this.t <= 0) { this.cur = null; if (!this.queue.length) this.el.style.display = 'none'; }
    }
  }
}

export class Objectives {
  constructor(deps) {
    this.d = deps; // { state, world, ship, toast, giveMap }
    this.mate = new Mate();
    this.timer = 0;
    this.hintI = 0;
  }
  get state() { return this.d.state; }
  get current() { return MAIN_GOALS[this.state.goals.i] || null; }

  start() {
    const g = this.state.goals;
    if (g.started) return;
    g.started = true;
    for (const l of MAIN_GOALS[0].intro) this.mate.say(l);
  }

  say(text, dark) { this.mate.say(text, dark); }

  remark(key, dread = 0) {
    const h = this.state.hints;
    if (h[key] || !REMARKS[key]) return;
    h[key] = true;
    for (const l of REMARKS[key]) this.mate.say(l, dread > 0.6);
  }

  askHint(dread) {
    const g = this.current;
    if (!g) { this.mate.say('We are free to sail wherever you like, Captain. The side goals in your log (Goals tab) are always there.'); return; }
    this.mate.say(g.hints[this.hintI++ % g.hints.length], dread > 0.6);
  }

  complete(goal, side) {
    this.d.state.gold += goal.reward;
    this.d.toast(`Goal complete: ${goal.title} (+${goal.reward} gold)`);
    if (side) this.state.goals.side[goal.id] = true;
  }

  update(dt, dread) {
    this.mate.update(dt);
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.5;
    const c = this.d, g = this.state.goals;
    const cur = this.current;
    if (cur && cur.check(c)) {
      this.complete(cur, false);
      for (const l of cur.outro || []) this.mate.say(l, dread > 0.6);
      if (cur.onDone) cur.onDone(c);
      g.i++; this.hintI = 0;
      const next = this.current;
      if (next) for (const l of next.intro) this.mate.say(l, dread > 0.6);
      else this.mate.say('That is everything I know how to teach you, Captain. From here on the sea is yours. Check the Goals tab for more to do.');
    }
    for (const s of SIDE_GOALS) if (!g.side[s.id] && s.check(c)) this.complete(s, true);
  }
}
