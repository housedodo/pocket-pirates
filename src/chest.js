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
  cayssails: { kind: 'look', name: 'Patched sailcloth', text: 'A bolt of patched cloth, left on the deck after the music on the sandbar. Any shipyard can cut sails from it.' },
  clapper: { kind: 'remnant', name: 'A bell clapper', text: 'It came up on the line near the Drowned Bell. Heavy, and wet a long time.', value: 30, sell: 'A clapper. Nobody round here has a bell that size.' },
  cup: { kind: 'remnant', name: 'A cup', text: 'It says MERRY GULL, in a hand you do not know.', value: 0, refuse: 'Your own ship\'s name on it, Captain. I will not take that.' },
};
export const KINDS = [['keep', 'Keepsakes'], ['look', 'For the ship'], ['remnant', 'Remnants']];
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
