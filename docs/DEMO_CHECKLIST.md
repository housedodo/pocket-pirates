# HOIST demo: final checklist before itch.io

Build it with `python3 scripts/single.py`, ship `pocket-pirates-demo.html` (with sound, no dread, no caves, no mixer or test tools).

## 1. Play-through (do it yourself, fresh save, no dev tools)
- [ ] New voyage: intro cinematic plays, skip works (Esc / click)
- [ ] First minute: only ship, tracker, one Mara line, one control hint
- [ ] Sail goal: Mara explains steering and wind ring, nothing arrives too fast
- [ ] Make landfall: "Nicely done" line comes with the NEW QUEST card
- [ ] Perrin's letter at Tama: "Take it" and the Board sign are marked on the first visit, compass dot points to Tama, Mara asks, log tab marked, riddle shown
- [ ] Dig: probing the shore on the right shore (damp = close, stones, the tide), a wrong shore is a short dig, a failed probe can be retried
- [ ] Spend your loot: Shipwright sign opens and glows, buy an upgrade (sails, rudder, hull, cannons all show prices); the Shipyard (paint, figureheads) opens later, with passengers
- [ ] Dead calm: oars dip into the water, wind returns afterwards
- [ ] Beat to windward (tacking), delivery job, passenger (one is always available), charting counter (x/y)
- [ ] Second harbour Velto reachable inside the first fog
- [ ] Tavern: dice game, rumour, crew hire, a bed (optional now, no quest)
- [ ] Fishing: power meter (short = easy, far = big), bite, the bite ring (green / gold marks, three misses lose it), fisherman's log, "ask the fishers"
- [ ] Raider: fights are not constant, escape works, start ammo 8, ammo only bought
- [ ] Sea encounter card appears at least once and can be skipped
- [ ] Companions: cat at Tama, gull at Velto (optional, ignorable)
- [ ] Dark hut: found via goal chain; on the chart it opens framed and is easy to see; the island is dark, the water round it murky; first throw works, someone comments at the next harbour
- [ ] Interface: at each step only what the quest needs can be clicked; the rest is grey and opens quest by quest (new signs glow teal)
- [ ] Passengers: "Take aboard" is always marked
- [ ] End card appears ("To be continued"), "Keep sailing" opens nothing new, deliveries etc. still work
- [ ] Nothing about dread, the Eye or later story is visible anywhere
- [ ] Hand-made places: the Grey Tooth, Hollowgreen and the Drowned Bell are reachable in chapter I-II; going ashore works and charts the next place; Wick's Rock charts the rest
- [ ] Reef (Glass Lagoon), breakers (the Ribs) and fog bank (the Halved Isle) keep you out and say which upgrade; Rudder 2 / Hull 2 / Lantern 2 let you in
- [ ] Gusts appear and give a burst when sailed into; currents carry the ship and show on the chart once ridden
- [ ] The glimpse happens once on the way back from the hut (silence, flat sea, the figure), then Mara asks why you went quiet
- [ ] Controller: stick sails, A interacts, B closes, Y opens the log, Start pauses (test with a real pad in Chrome and Firefox)
- [ ] Chart pins: click to pin, the compass follows it, it clears when you arrive
- [ ] Lamp oil: full until the Market opens, then burns at night / fog / storm; Mara warns at a quarter; empty = dark, no fishing; Market refill and Wick refill work
- [ ] Fishing rings: wreck (snags), night (fading), swell (surging), deep (hold), reef (darting) each show their name and play right
- [ ] Torn sails: full sail in a gale warns, then tears (66% speed, visible holes); patch kit at sea (stop, E), or dock for the sailmaker; kits at the Market
- [ ] Counter melody fades in now and then over the stage-1 band (rare), never at night or in a fight
- [ ] Beaches: shingle (stone dots, three cracks), dunes (holes refill), mud (no tide, squares sink) on different treasure isles

## 2. Softlocks and edge cases
- [ ] Accept a delivery before the passenger goal: never stuck
- [ ] Do goals out of order (docking early, skipping the letter)
- [ ] Close and reopen the page mid-game: save loads, tutorial state intact
- [ ] Clear site data: game starts clean
- [ ] Esc / pause / log with every menu open; fullscreen toggles back
- [ ] Hull at 0 hearts: sensible recovery
- [ ] Fog wall turns you around, no stuck position at the edge

## 3. Text and feel
- [ ] Read every Mara line aloud once: short, charming, no spoilers
- [ ] Typos pass on harbours, rumours, bottles, encounter cards
- [ ] HUD text stays minimal; toasts never overlap important text
- [ ] No test tools: no dev bar, F6-F9 and `?dev=1` do nothing in the demo file

## 4. Technical
- [ ] Open the demo html in Chrome, Firefox and Safari (desktop) and on a phone
- [ ] Console has no errors during a 15-minute run
- [ ] Frame rate acceptable on a normal laptop (no GPU spikes in harbours)
- [ ] File size of the zip is reasonable (< 10 MB); loads in a few seconds
- [ ] Fullscreen works inside the itch.io embed (set viewport 1280x720, enable fullscreen button)
- [ ] Mouse capture / keyboard focus works in the embed (click inside first)

## 5. Sound (decide now)
- [ ] The demo ships with sound (decided). Final mix done in the dev build (F8), `volumes.json` saved, demo rebuilt
- [ ] Listen through the whole demo once with headphones: loops are seamless, no clipping, gulls/coast/rain are not annoying
- [ ] Music: silent until the first quest, then the band builds up one instrument per quest, plays in changing line-ups, the two guitar arps never overlap; muffled tune in taverns; battle layer during a raider fight
- [ ] Weather: light rain and a storm look and sound clearly different; distant thunder now and then in strong rain
- [ ] Voice blips are soft enough not to notice after a minute
- [ ] Sound and Music toggles and the three volume sliders (Music, Sea/rain/gulls, Effects) in the pause menu work, and are remembered; first click starts audio in the itch embed
- [ ] Say "sound on" on the page

## 6. Naming and branding
- [ ] Title everywhere says HOIST (tab title, file name, page title); repo/internal names do not matter
- [ ] Short description (one sentence) and tagline
- [ ] Cover image 630x500 and screenshots (intro, sailing, harbour, shipyard, encounter, hut)
- [ ] Optional: GIF of the intro cinematic

## 7. Feedback and survey
- [ ] A form that really collects answers (Google Form / itch comments); the survey artifact can only copy answers
- [ ] Link on the itch page and in the end card (optional)
- [ ] Note that saves live in the browser; clearing data erases them

## 8. itch.io page
- [ ] Zip with `index.html` (rename the demo file), kind of project: HTML, "played in the browser"
- [ ] Viewport 1280x720, fullscreen on, mobile off (or "best on desktop")
- [ ] Description: what it is, how long (about 30-60 min), controls, tips, known issues
- [ ] Controls table (A/D steer, W/S sails, E interact, M log, Esc pause)
- [ ] Tags: pirate, sailing, exploration, low-poly, ps1, horror (hint only), cozy
- [ ] Visibility: draft, test on a private link first, then public

## 9. Launch
- [ ] One test run from the live itch page, by someone who has never seen it
- [ ] Reddit post (see earlier notes), reply to comments in the first hours
- [ ] Keep a list of feedback; tag blockers for a quick patch

## 10. Added since the last checklist pass (check each once)
- [ ] Handling: the rudder barely turns at a standstill, turns slide briefly, the hull carries a little after letting go; oars still turn easily
- [ ] The ship floats with weight (lags waves, heels, bow lifts, spray in troughs); wake V and bow wave; other ships float and leave wakes
- [ ] Waves low by islands, bigger in open sea; sets of bigger and smaller waves in calm weather
- [ ] Ocean design Chop facets by default; Ocean / Night / Lamp buttons in the pause menu work and are remembered
- [ ] Night: moon phases (new moon pitch dark with no moon, full moon moonlit); candle lamp by default; L puts the lantern out
- [ ] Lantern upgrades let you see further at night and in fog while lit
- [ ] Storms: readable sea and horizon, storm wall rising upwind before and during a storm, sail strain only in real storms
- [ ] Shores: breaking foam lines, seabed and fish shadows in the shallows, rain rings; sun/moon glints twinkle in place (no racing)
- [ ] Fog wall and fog bank: lost in fog (white-out, no helm), the ship drifts back out; no current leads into fog
- [ ] World hints: the Kestrel (posts line up on the Tooth and the Bell; cairn drawing, tales), a low-tide wreck, smoke on some days, the dusk watcher at Tama, birds at dusk/dawn
- [ ] Dig beach: the arch's shadow follows the sun; on a noon-riddle isle the chest is under the noon tip
- [ ] Shops: shipwright cards (now/next, opens tags, short-by, buy flash), market gauge and kit pips, scroll
- [ ] Passengers and bottles: new lines appear; nothing explains the horror

