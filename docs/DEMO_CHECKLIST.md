# HOIST demo: final checklist before itch.io

Build it with `python3 scripts/single.py`, ship `pocket-pirates-demo.html` (with sound, no dread, no caves, no mixer or test tools).

## 1. Play-through (do it yourself, fresh save, no dev tools)
- [ ] New voyage: intro cinematic plays, skip works (Esc / click)
- [ ] First minute: only ship, tracker, one Mara line, one control hint
- [ ] Sail goal: Mara explains steering and wind ring, nothing arrives too fast
- [ ] Make landfall: "Nicely done" line comes with the NEW QUEST card
- [ ] Perrin's letter at Tama: pick it up, Mara asks, log tab marked, riddle shown
- [ ] Dig: find the treasure, treasure die roll works
- [ ] Spend your loot: shipyard turntable, buy/try a hull, sail, flag
- [ ] Dead calm: oars, wind returns afterwards
- [ ] Beat to windward (tacking), delivery job, passenger (one is always available), charting counter (x/y)
- [ ] Second harbour Velto reachable inside the first fog
- [ ] Tavern: dice game, rumour, crew hire, sleeping a night
- [ ] Fishing: cast, bite, reel, fisherman's log, "ask the fishers"
- [ ] Raider: fights are not constant, escape works, start ammo 8, ammo only bought
- [ ] Sea encounter card appears at least once and can be skipped
- [ ] Companions: cat at Tama, gull at Velto (optional, ignorable)
- [ ] Dark hut: found via goal chain, first throw works, someone comments at the next harbour
- [ ] End card appears ("To be continued"), "Keep sailing" opens nothing new, deliveries etc. still work
- [ ] Nothing about dread, the Eye or later story is visible anywhere

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
- [ ] No test tools: F8, `?dev=1`, dread keys do nothing in the demo file

## 4. Technical
- [ ] Open the demo html in Chrome, Firefox and Safari (desktop) and on a phone
- [ ] Console has no errors during a 15-minute run
- [ ] Frame rate acceptable on a normal laptop (no GPU spikes in harbours)
- [ ] File size of the zip is reasonable (< 10 MB); loads in a few seconds
- [ ] Fullscreen works inside the itch.io embed (set viewport 1280x720, enable fullscreen button)
- [ ] Mouse capture / keyboard focus works in the embed (click inside first)

## 5. Sound (decide now)
- [ ] The demo ships with sound (decided). Final mix done in the dev build (F8), `volumes.json` saved, demo rebuilt
- [ ] Listen through the whole demo once with headphones: loops are seamless, no clipping, gull/coast/wind are not annoying
- [ ] Sound and Music toggles and the three volume sliders (Music, Sea/wind/gulls, Effects) in the pause menu work, and are remembered; first click starts audio in the itch embed
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
