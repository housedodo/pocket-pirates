// Regional customs: what each region says, keeps and does (lore bible L-01 to L-34, adopted 2026-11-18; owner: "add the lore
// proposals"; docs/proposals/LORE_BIBLE.md). Every line is a DRAFT for the writer (docs/WRITER_TODO.txt 4.8).
//  - SAY: one villager line on docking, from the harbour's region (an ordinary custom; the second look is the player's). Each once a voyage.
//  - SIGHT: one thing seen on the quay, on the harbourmaster's board (a place laid nearest the sea, the old hitch, a chalk tally...).
//  - MARA: one remark per region, each once; she stops making it as the dread rises (L-34: her silences say more than a line).
// Never explains, never resolves a storyline, never names her village. Gates (RULES 6, 29): 'any' (also the demo), 'full' (not the
// demo), 'hut' (full game, after the first throw: only then a candle, a twenty). Nothing here raises a question's level (RULES 32).
import { hash2 } from './util.js';

const demo = () => typeof window !== 'undefined' && window.__BUILD === 'demo';
export const afterHut = (state) => !demo() && !!(state.hut && state.hut.rolls && state.hut.rolls.length);
const open = (state, g) => g === 'any' || (g === 'full' ? !demo() : afterHut(state));
const said = (state) => (state.story.cust = state.story.cust || {});
const TAMA = '0,-1', VELTO = '-2,-1';

// r: region ('home', 'crown', 'free', 'reef', 'lantern', 'drowned', or 'any'); at: one harbour only; c: the moment it needs
export const SAY = [
  // Home Sound: Tama rings gently (L-07); Velto is the plain harbour everything else is told apart from (L-05); "past hearing" (L-06)
  { id: 'ring', r: 'home', at: TAMA, who: 'netmender', g: 'any', text: 'We ring it gently here. It carries further that way.' },
  { id: 'velto', r: 'home', at: VELTO, who: 'harbourmaster', g: 'any', text: 'Velto. Nets, gulls, pie. Mind the second step.' },
  { id: 'hearing', r: 'home', who: 'oldsalt', g: 'any', text: 'In my day you did not go past hearing. Past where the bell carries.' },
  { id: 'order', r: 'home', who: 'fisher', g: 'any', text: 'Old wrecks? Ask three people which went down first. You will get four answers.' },   // L-01
  // anywhere: time in people, then in things (L-02); the old charts (L-03); gulls (L-30); the post (L-32)
  { id: 'older', r: 'any', who: 'oldsalt', g: 'any', text: 'That wall is older than my grandmother. Older than the lamps, even.' },
  { id: 'charts', r: 'any', who: 'child', g: 'any', text: 'Master says every chart draws the sea the same. It is the coasts that will not sit still.' },
  { id: 'gulls', r: 'any', who: 'oldsalt', g: 'any', text: 'Gulls carry the news. That is why they shout.' },
  { id: 'post', r: 'any', who: 'market', g: 'any', c: (x) => x.job, text: 'The post! Anything for this quay?' },
  // the Crown: lines and books (L-08), the buoys (L-09), the loud bells (L-10), "off the book" (L-06), the old charts (L-03), fog (L-29)
  { id: 'lane', r: 'crown', who: 'harbourmaster', g: 'any', c: (x) => x.lane, text: 'Between the buoys you are in the book, Captain. Outside them you are weather.' },
  { id: 'clean', r: 'crown', who: 'harbourmaster', g: 'any', text: 'Clean lines, calm water. My father said it, and his.' },
  // lore connections (2026-11-19, docs/proposals/LORE_CONNECTIONS.md; drafts): A, every ledger is a copy, told two ways that disagree
  { id: 'archold', r: 'crown', who: 'harbourmaster', g: 'full', text: 'The archive was here before the Fort. We built the Fort round it.' },
  { id: 'archgov', r: 'crown', who: 'oldsalt', g: 'full', text: 'A governor started the archive. Nobody can find his portrait. Nobody can find his name.' },
  { id: 'nocount', r: 'free', who: 'harbourmaster', g: 'full', text: 'In the Cays we do not count. So nothing is wrong with our numbers.' },
  // B, the lights give something to look at
  { id: 'watch', r: 'lantern', who: 'lamplighter', g: 'full', text: 'Keep it burning. It has to have something to watch.' },
  // micro 1, the Reef's dice
  { id: 'seven', r: 'reef', who: 'fisher', g: 'full', text: 'Find a die at sea, scratch the seven off. So it cannot come up.' },
  { id: 'loud', r: 'crown', who: 'docker', g: 'any', text: 'Tama? Your bell is too soft to count by. Ours you can count from the next island.' },
  { id: 'offbook', r: 'crown', who: 'harbourmaster', g: 'any', text: 'Out past the lanes? That is off the book, Captain.' },
  { id: 'rename', r: 'crown', who: 'harbourmaster', g: 'any', text: 'On the old charts this quay had another name. The old charts are wrong about a lot.' },
  { id: 'fogc', r: 'crown', who: 'watchman', g: 'any', c: (x) => x.fog, text: 'Fog bell? Ours hangs on the Fort. You can count by it.' },
  // the Free Cays: night hours (L-13), fires for the players (L-14), storm nights (L-15), "where nobody plays" (L-06), no fog bell (L-29)
  { id: 'crier', r: 'free', who: 'market', g: 'any', c: (x) => x.night, text: 'Fish after dark, fruit after dark, sleep after breakfast!' },
  { id: 'dusk', r: 'free', who: 'fisher', g: 'any', c: (x) => x.dusk, text: 'Morning, Captain! We are only just up.' },
  { id: 'storm', r: 'free', who: 'oldsalt', g: 'any', c: (x) => x.storm, text: 'Nobody plays, nobody sleeps. Pull up a stool.' },
  { id: 'hush', r: 'free', who: 'netmender', g: 'full', c: (x) => x.night && x.still, text: 'Hush now. Somebody is playing. Sleep while they play.' },
  { id: 'fire', r: 'free', who: 'fisher', g: 'full', c: (x) => x.night && x.still, text: 'I keep the fire. They keep the tune. Everyone keeps something.' },
  { id: 'nobody', r: 'free', who: 'fisher', g: 'any', text: 'Past the last cay is where nobody plays. We do not fish there.' },
  { id: 'nobell', r: 'free', who: 'fiddler', g: 'any', text: 'Bells in the fog? Not here. Not while somebody plays.' },
  // the Reef: the naming right (L-16), the tide rule (L-18), "the quiet water" (L-06), the wreck that rings (L-29), the stool (L-26)
  { id: 'paint', r: 'reef', who: 'docker', g: 'full', text: 'A name goes up the day a ship does not come in. Nobody sees the day it sinks.' },
  { id: 'tide', r: 'reef', who: 'docker', g: 'any', text: 'The sea goes out a long way under a new moon, and a full one. Salvage then. Be back before it remembers.' },
  { id: 'quiet', r: 'reef', who: 'fisher', g: 'any', text: 'Out there is the quiet water. Nothing to wreck, nothing to take.' },
  { id: 'rings', r: 'reef', who: 'fisher', g: 'any', c: (x) => x.fog, text: 'In fog the old wreck rings. Nobody has ever found the wreck.' },
  { id: 'stool', r: 'reef', who: 'innkeeper', g: 'any', c: (x) => x.evening, text: 'The stool at the sea end is not for sitting. Ask anyone.' },
  // the Lantern: lights, not ships (L-19), the pressers' grace (L-20), past the last light (L-21), the bell under the water (L-29)
  { id: 'rhyme', r: 'lantern', who: 'child', g: 'any', text: 'Two long for the Point, one short for the Rock. Count them home.' },
  { id: 'grace', r: 'lantern', who: 'innkeeper', g: 'any', c: (x) => x.evening, text: 'It comes up. We thank it. We do not go down.' },
  { id: 'last', r: 'lantern', who: 'lamplighter', g: 'any', text: 'Past the last light the water is anyone\'s. The Guild does not chart it.' },
  { id: 'under', r: 'lantern', who: 'lamplighter', g: 'full', c: (x) => x.fog, text: 'In fog you hear a bell under the water. The Guild says it is the Point\'s. The Point has no bell.' },
  // the Drowned (full game only): names called home (L-22), kept, not taken (L-24), the far water (L-06), they stop to listen (L-29)
  { id: 'names', r: 'drowned', who: 'fisher', g: 'full', text: 'We call our names on the way in. So the harbour knows who it is getting.' },
  { id: 'kept', r: 'drowned', who: 'innkeeper', g: 'full', text: 'Thank us? No. Nothing was taken. It was kept.' },
  { id: 'down', r: 'drowned', who: 'harbourmaster', g: 'full', text: 'The harbourmaster follows your look out to sea, then points down at the pier. Politely.' },
  { id: 'listen', r: 'drowned', who: 'fisher', g: 'full', c: (x) => x.fog, text: 'On fog nights we stop rowing and listen. Then we row on.' },
];

/** one villager line for docking here, or null; each line once a voyage. x: { region, hour, night, dusk, evening, storm, still, fog, lane, job } */
export function customLine(state, d, x) {
  const S = said(state);
  const ok = SAY.filter((l) => !S[l.id] && (l.r === 'any' || l.r === x.region) && (!l.at || l.at === d.id) && open(state, l.g) && (!l.c || l.c(x)));
  if (!ok.length) return null;
  const want = ok.filter((l) => l.c || l.at);   // a line for this moment or this harbour comes first
  const l = (want.length ? want : ok)[Math.floor(Math.random() * (want.length ? want : ok).length)];
  S[l.id] = 1;
  return { speaker: l.who, text: l.text };
}

// ---------------------------------------------------------------- what is seen on the quay (the harbourmaster's board)
// One a day per harbour from its region's pool; the old hitch once per region (L-25); the Drowned's tally from what they really kept.
export const SIGHT = {
  home: [
    { g: 'any', text: 'Nets drying, gulls, a pie cart. Nothing else, and nobody minds.' },   // Velto and Tama: the plain harbours (L-05)
  ],
  crown: [
    { g: 'any', text: 'The buoys have been painted again, red and green. The outermost is still wet.' },   // L-09
    { g: 'any', text: 'On the clerk\'s desk at the end of the pier, two cups. He only ever drinks from one.' },   // L-26
    { g: 'hut', text: 'A clerk has stamped a small twenty in the margin of your papers. For luck, he says.' },   // L-31
  ],
  free: [
    { g: 'any', text: 'By the fire, nearest the water, a mat nobody sits on.' },   // L-26
    { g: 'any', text: 'The stalls are shuttered at noon. Lanterns are strung for the evening.' },   // L-13
  ],
  reef: [
    { g: 'any', text: 'Chalked on a plank by the pier: CLAIMED. Named and painted. The Brotherhood.' },   // L-16
    { g: 'any', text: 'At the sea end of the wreckers\' table, a stool. Nobody sits on it.' },   // L-26
    { g: 'hut', text: 'A wrecker\'s oar lies on the planks, a twenty scratched on its loom. For luck.' },   // L-31
  ],
  lantern: [
    { g: 'any', text: 'A Guild notice: THE GUILD COUNTS LIGHTS, NOT SHIPS. Report a dark light at any Guild quay.' },   // L-19
    { g: 'any', text: 'No nets on the quay. The fish comes in by boat, and is paid for.' },   // L-20
    { g: 'any', text: 'A lamp burns in the window of an empty house, the one nearest the sea.' },   // L-26
  ],
  drowned: [
    { g: 'full', text: 'A tide pole by the pier, painted with rings. The oldest are at the bottom. The weed line is above them all.' },   // L-23
    { g: 'full', text: 'At the end of the table nearest the sea, a place is laid. Someone has already eaten from it.' },   // L-26
    { g: 'full', text: 'At dusk the boats come in. Each rower calls out a name: their own.' },   // L-22
  ],
};
const HITCH = {   // L-25: the old hitch, once in each region; it is just a knot
  crown: 'A line on the customs bollard is made fast with an old hitch. The clerks call it that. None of them ties it.',
  free: 'A canoe is tied to the stilts with an old hitch. Its owner shrugs: it came that way.',
  reef: 'A salvaged bell rope, still in an old hitch. The wreckers will not untie it.',
  lantern: 'One lamp-float is moored with an old hitch. The Guild ties a different knot.',
  drowned: 'Every mooring on this quay is tied in the old hitch.',
};
const MARKET_SIGHT = 'A stall sign: SHORT DICE. For looking at, not for playing.';   // L-27, market towns
const WASH_SIGHT = 'Market day. They are washing the chalk off the harbour wall.';     // L-33, chalkers everywhere

/** the lines seen on this harbour's quay today: [{ text, dark }]. x: { region, market } */
export function sightsAt(state, d, x) {
  const out = [], pool = (SIGHT[x.region] || []).filter((s) => open(state, s.g));
  if (x.region === 'drowned' && !demo()) {   // L-24: the chalk tally of what they kept (regions.js drownedTake keeps it)
    const k = (state.story.drownedKept || []).slice(-3).map((it) => (it.fish ? 'a fish' : it.fruit ? 'some fruit' : it.loot ? it.loot.name.replace(/^From the [a-z ]+: /, '').toLowerCase() : 'something'));
    if (k.length) out.push({ text: `A chalk board on the quay: ${k.map((w) => `KEPT: ${w}.`).join(' ')}`, dark: true });
  }
  const H = (state.story.hitch = state.story.hitch || {}), key = `${d.id}@${state.dayN}`;
  if (HITCH[x.region] && !demo() && (!H[x.region] || H[x.region] === key)) { H[x.region] = key; out.push({ text: HITCH[x.region] }); }
  else if (pool.length) out.push({ text: pool[Math.abs(hash2(d.seed | 0, state.dayN, 61)) % pool.length].text });
  if (x.market && d.style === 'market') out.push({ text: MARKET_SIGHT });
  else if (x.market && Math.abs(hash2(d.seed | 0, state.dayN, 62)) % 3 === 0) out.push({ text: WASH_SIGHT });
  return out;
}

// ---------------------------------------------------------------- Mara by region (L-34)
// One remark per region, each once. She makes it only while the water is still light: past HUSH she stops (tired, then rattled, then
// breaking, CANON 7); in the Drowned she says almost nothing at all. Never explains, never confirms (RULES 7).
export const MARA = {
  home: { g: 'any', at: VELTO, text: 'Velto again? Good. I like a place that stays where we left it.' },
  crown: { g: 'any', text: 'Another stamp, Captain. I am starting a collection.' },
  free: { g: 'full', c: (x) => x.night && x.still, text: 'Listen. They are at it again.' },
  reef: { g: 'any', text: 'That is another wreck by the way in. I have stopped counting them. Nearly.' },
  lantern: { g: 'any', text: 'Long, long, short. That one is the Point. I think.' },
  drowned: { g: 'full', text: 'Everyone is very kind here. I keep checking my pockets.' },
};
export const HUSH = { home: 0.3, crown: 0.3, free: 0.45, reef: 0.35, lantern: 0.35, drowned: 1 };
export const RELIT_MARA = 'There. Now the harbour can find us.';   // S-28, the first light relit
export const RELIT_LOG = 'The keeper writes in his log: "Relit at dusk by a passing captain. Ships seen: all. Ships expected: all but one."';   // S-26, L-19

/** Mara's remark for docking here, or null. x: { region, dread, visits, night, still } */
export function maraAt(state, d, x) {
  const m = MARA[x.region], S = said(state);
  if (!m || S['mara:' + x.region] || x.dread >= HUSH[x.region] || !open(state, m.g)) return null;
  if (m.at && (m.at !== d.id || x.visits < 2)) return null;
  if (m.c && !m.c(x)) return null;
  S['mara:' + x.region] = 1;
  return m.text;
}

// ---------------------------------------------------------------- small customs heard elsewhere
export const CANDLE = 'Someone at the next stall laughs. "Ah. That is a candle. Buy the next round and we will say no more."';   // L-28 (a low haggle roll, after the hut)
export const OAR = 'A twenty is scratched on the loom of the oar. For luck, the last owner said.';   // L-31 (a hand signs on, after the hut)
export const BOUNTY_DEBT = 'The Brotherhood remembers a debt both ways, Captain.';   // L-17
export const CUSTOMS_SLIP = 'CROWN CUSTOMS. Vessel: MERRY GULL. Cargo: as declared. Master: ______';   // L-08, kept in the log (full game)
/** a once-a-voyage flag for the small customs above; true the first time */
export const firstTime = (state, id) => { const S = said(state); if (S[id]) return false; S[id] = 1; return true; };
