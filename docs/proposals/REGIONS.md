# Regions that play differently: proposal (2026-11-13)

Merged from the gameplay and design studies (scripts and screenshots were throwaway; nothing here is built yet).
None of it needs text from the writer. Every idea implies the region's story through rules and pictures, never words.
Before/after prototype shots: `docs/proposals/region_looks.png`.

## What the studies found
- **Every region pays the same**: about 0.2 gold per unit sailed, 46 to 57 gold a minute, wherever you are (jobs.js). The ~1,160 gold
  middle of the game is about 25 minutes of pure hauling; the problem is that it is the same hauling everywhere.
- **The regions look the same**: sea and sky colour come only from the dread palette, so by the Trade Belt everything is the same teal.
- **Gaps**: almost no harbours between 265 and 800 from Tama (no village in the Shoals); the Lantern region often has none at all
  (0 to 4 by seed); the Drowned has 7 to 19.
- Weather settings per region barely show (one clock for the whole sea); raiders exist only in Reef waters and only below dread 0.4;
  past that every region has the same derelicts.

## Per region
| Region | Plays like | What the player sees (the rule, without words) | Implies |
|---|---|---|---|
| **Crown** (north) | Speed and routing: timed contracts (on time 0.28 g/unit, late 0.10); a shared harbour ledger, +5% per clean line, a late delivery costs 15% at every Crown harbour; customs cutters hail and inspect (dark cargo fined) | Cobalt water, crisp horizon; buoyed lanes into every harbour (red/green, lit at night); a signal mast that gains a pennant each time you arrive; a clerk who turns to face your ship | Someone is writing you down (who counts) |
| **Free Cays** (east) | Night is the safe time: no raiders at night, opportunists by day; harbours sleep by day, a night market pays +40% for fish and fruit (lamp oil becomes part of trade); dusk fishing grounds | Lagoon green, golden haze; lantern strings and beach fires on the landing at night; a low firelight on a sandbar on still nights (the silent twin of the Two Players) | The dark keeps quiet while somebody plays |
| **Reef** (south-west) | Salvage and risk: wrecks pay 1.5×, raider bounties; the shoals move each dawn (yesterday's chart marks grey out); storm wrecks surface in a blow and are gone by the next low tide | Jade shoal water, spray haze; breaker rings over black coral heads; wreckers' stakes with white rags; masts that show at low tide | Ships come here and stay |
| **Lantern** (west) | Oil is the currency: lighthouse keepers trade (buy at Tama 0.42, keepers pay ~0.9); relight dead lighthouses at dusk for pay or chart marks; the lamp burns half while a lighthouse is in sight, double in the open dark; fog piloting by each lighthouse's flash pattern | Dark slick water under amber haze; lines of lamp-floats marking the routes; oil sheens; windows lit at noon. After the hut: one lamp burns cold blue | The lights must be kept lit |
| **Drowned** (far out, full game only) | The tide decides: a shoal belt crossable only at low water (two tide windows in and out, a forced stay of about 4 minutes); harbours take no coin, give what you lack and keep one thing from your hold | Lead-grey flat water; roof ridges and chimneys breaking the surface; tide poles with white rings and a weed line that sits above the water even at high tide; streets that become channels at low tide | The sea breathes; the sea is lower than it should be |

## Across the sea
- **A regional price board**: each region pays +50% for what it lacks (Crown fruit, Free Cays oil, Lantern fish, Reef timber). A loop
  of the four regions takes about one in-game day, a natural rhythm.
- **Each region's best activity at 70 to 90 gold a minute**, deliveries stay the floor at ~50: the upgrade middle drops from ~40 minutes
  of hauling to 15 to 20 of varied play. Pay in kind toward upgrades (Reef timber off the hull, a keeper's lens off the lantern).
- **Regional standing** built from harbour reputation opens each region's own work.
- **Signature weather** turned up 2 to 3× per region, one event each (Reef squalls, Lantern noon fog, still nights in the Cays);
  regional derelicts past dread 0.4 so the deep regions stop blurring.
- **Crossing a border**: sea and sky colour blend over a few degrees; a striped daymark buoy where wedges meet; ships near the edge fly
  the neighbour's flag; the night lights change class. Then the text toast "Entering X" could go (owner's call).
- **One or two harbours in each region's Shoals**, and at least one Lantern harbour on every seed.

## Suggested order (all need nothing from the writer)
1. Regional sea and sky colour, soft borders (S, demo-safe; strongest effect for the effort).
2. Regional price board and best-rate activities (S).
3. Free Cays: safe nights, night market, night lights (S then M, demo-safe).
4. Crown: timed contracts, the ledger record, buoyed lanes and the signal mast (S then M, demo-safe).
5. Reef: salvage 1.5×, bounties, breakers over coral heads; later the moving shoals (S then M to L, demo-safe).
6. Lantern: harbours that always exist, the oil trade with keepers, the regional lamp burn, lamp-floats (M).
7. Harbours in the Shoals for every region (S).
8. Drowned: tide-gated belt, tide poles and weed line, "a place set" (M to L, full game only; the place-set trade waits for the owner's
   word on the Hollow Harbour thread).

Not judged headless: how any of it feels, fight difficulty, music, readability of moving shoals. Needs a real playtest.

## Bolder looks (2026-11-13, prototype)
The first prototype only nudged the dread palette and the regions still looked alike. The second (`region_looks_bold.png`) gives each
region a full palette of its own (sky, horizon, fog, deep and shallow water, sun, light, saturation, wave height, view distance) and one
signature silhouette on the water, all at the same low dread:
- **Crown**: cobalt water, clean white sky, long view; a red/green buoyed lane, a white signal mast with a pennant string; red and green lamps at night.
- **Free Cays**: emerald lagoon under a golden haze, calm water; houses on stilts, canoes; coloured lantern strings at night.
- **Reef**: jade water, grey salt sky, heavy chop; black coral heads in white breakers, a mast leaning out of the water.
- **Lantern**: near-black water under amber smoke, short view; a route lined with lamps on floats (one burns the wrong colour), a tall dark tower.
- **Drowned**: lead-grey flat water and fog; roofs to the ridge and chimneys, a leaning belfry (still too faint: needs more contrast).
Still to do: night palettes per region (the night skies all look alike), real lamp glow sprites, and models in the game's own
materials instead of flat colour. As dread rises the dread palette should still win, so the deep sea keeps its own horror.
