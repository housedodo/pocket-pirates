// The sea chest (owner, 2026-11-19): a fourth bookmark in the log, there from the first thing put in it (RULES 12, 13). Three kinds,
// all found, never bought:
//   keep     keepsakes with a use: each changes how the sea can be read, never a number on a stat
//   look     found cosmetics: the shipyard can fit them, free (customize.js `found`)
//   remnant  things with no explanation: kept, or sold at a harbour, where whoever buys one says one plain thing (some will not buy)
// No achievements, no "new" badge, no count to complete. The words are drafts (docs/LORE_TO_WRITE.txt G).
import { state } from './core/state.js';
import { toast } from './ui/dom.js';

export const CHEST = {
  kestrellamp: { kind: 'keep', name: "The Kestrel's lamp", text: 'Brought up from the green dark under the two white posts. It burns small and does not go out.' },
  leadline: { kind: 'keep', name: 'A lead line', text: 'A lead and a marked line, out of the wreckage at the Ribs. The crew sounds ahead in shoal water and the ship is held off.' },
  shutter: { kind: 'keep', name: "A lamplighter's shutter", text: 'It came down in the basket with the oil. With the lamp out, the eyes are quicker in the dark.' },
  ribsfigure: { kind: 'look', name: 'The figurehead from the Ribs', text: 'Dug out of the sand at the Ribs, where she stood up to her waist. Any shipyard can fit her.' },
  heskcanvas: { kind: 'look', name: 'The lamp-room canvas', text: 'The old hangings from Hesk Light, given by Hesper when the works were done. Pale, and faintly warm. Any shipyard can cut sails from it.' },
  cayssails: { kind: 'look', name: 'Patched sailcloth', text: 'A bolt of patched cloth, left on the deck after the music on the sandbar. Any shipyard can cut sails from it.' },
  clapper: { kind: 'remnant', name: 'A bell clapper', text: 'It came up on the line near the Drowned Bell. Heavy, and wet a long time.', value: 30, sell: 'A clapper. Nobody round here has a bell that size.' },
  shell: { kind: 'remnant', name: 'A shell', text: 'It came up in the still water. Held to the ear it hums, and the hum sounds like a name.', value: 0, refuse: 'Put it away, Captain. Please.' },
  slips: { kind: 'remnant', name: 'Chart slips', text: 'Strips of paper a chartmaker pastes over a coast that has changed. Under each slip there is an older slip. Under the oldest, the coast is drawn just as it is now.', value: 5, sell: 'Chart slips. Somebody has been correcting the same coast for a long time.' },
  lampglass: { kind: 'remnant', name: 'A lamp glass', text: 'From a doorstep under the Drowned Bell. It was warm when the bell brought it up. It went cold in the air.', value: 12, sell: 'A lamp glass. Good glass. Somebody will want it back.' },
  grounddie: { kind: 'remnant', name: 'A die from the Marigold', text: 'One of a row in the Marigold\'s hold. One face is ground smooth, by hand, a long time ago.', value: 0, refuse: 'Not that one, Captain. Give it back to the sea.' },
  tomorrowkey: { kind: 'remnant', name: 'A ledger key', text: 'On a string from the boat-shed under the fort. The label on the string says tomorrow. It says tomorrow every day.', value: 8, sell: 'A Crown key. I will give you a little for it and not ask.' },
  cup: { kind: 'remnant', name: 'A cup', text: 'It says MERRY GULL, in a hand you do not know.', value: 0, refuse: 'Your own ship\'s name on it, Captain. I will not take that.' },
};
export const KINDS = [['keep', 'Keepsakes'], ['look', 'For the ship'], ['remnant', 'Remnants']];
// the finds for the ship (customize.js marks them `look_<group>_<id>`): one line each, in the chest's own voice
const LOOK_WORDS = {
  hull: (n) => [`A cask of ${n.toLowerCase()} paint`, 'Sealed under wax, still good. Any shipyard will put it on the hull.'],
  sail: (n) => [`A bolt of ${n.toLowerCase()} sailcloth`, 'Dry inside an oilskin. Any shipyard can cut sails from it.'],
  flag: (n) => [`A ${n.toLowerCase()} pennant`, 'Folded small, as if somebody meant to keep it.'],
  flagshape: (n) => [`A pennant cut ${/^long/i.test(n) ? 'long' : 'as a ' + n.toLowerCase()}`, 'Somebody cut it with care. It still holds its shape.'],
  figure: (n) => [`A carved ${n.toLowerCase()}`, 'Wrapped in sacking. A figurehead, with the fixing bolts still in it.'],
};
export const LOOK_IDS = [];
export function registerLooks(groups) {
  for (const [g, , list] of groups) for (const x of list) if (x.found && x.found.startsWith('look_') && !CHEST[x.found]) {
    const [name, text] = LOOK_WORDS[g](x.name); CHEST[x.found] = { kind: 'look', name, text }; LOOK_IDS.push(x.found);
  }
}
/** a find for the ship, by chance (a dug chest, a salvaged wreck, a taken raider): one not yet in the chest */
export function findLook(chance, water = '') {
  if (Math.random() >= chance) return false;
  const left = LOOK_IDS.filter((id) => !list().some((x) => x.id === id)); if (!left.length) return false;
  return chestAdd(left[Math.floor(Math.random() * left.length)], water);
}
const list = () => state.story.chest || (state.story.chest = []);
export const chestHas = (id) => list().some((x) => x.id === id && !x.sold);
export const chestAny = () => list().some((x) => !x.sold);
/** put a thing in the chest (once ever); water is where it was found (the Ship's book's names) */
export function chestAdd(id, water = '') {
  if (!CHEST[id] || list().some((x) => x.id === id)) return false;
  list().push({ id, day: state.dayN, w: water });
  toast(`Into the sea chest: ${CHEST[id].name}.`, false, 5000);
  return true;
}
/** sell a remnant at harbour `name`: the buyer's line, and the gold (0 and a refusal when nobody will buy it) */
export function chestSell(id) {
  const it = CHEST[id], e = list().find((x) => x.id === id && !x.sold); if (!it || !e || it.kind !== 'remnant') return null;
  if (!it.value) return { text: it.refuse, gold: 0 };
  e.sold = state.dayN; state.gold += it.value;
  return { text: it.sell, gold: it.value };
}
