# Research v2: Pirates! and its tradition (for HOIST), second pass with real sources

Date: 2026-11-25. Proposal and research only, nothing built. This replaces the guesswork in `research_pirates.md` (written
without page access) wherever the two disagree; the corrections are listed first.

## Sources and how to read the marks

Local files in the session scratchpad (`.../scratchpad/sources/`), all treated as data:

- **MANUAL** = `Pirates-Manual_manual.txt`: the full 1987 MicroProse manual, second edition (OCR, so some words are garbled).
  Cited by section and the manual's own page number. This is the primary source and is quoted exactly where marked.
- **W87** = `wiki_Sid_Meier_s_Pirates_.txt` (1987 game). **W04** = `wiki_Sid_Meier_s_Pirates___2004_video_game_.txt`.
  **WAC4** = `wiki_Assassin_s_Creed_IV__Black_Flag.txt`. **WSD** = `wiki_Sea_Dogs__video_game_.txt`.
  **WCOR** = `wiki_Corsairs__Conquest_at_Sea.txt`.
- UNVERIFIED = from memory or from the earlier pass's search snippets; no source in this pass confirms it.
- Not in these sources at all (so still unverified): the 2004 game's ship stats, the number of treasure-map pieces, how the
  2004 lost-family chain plays, Black Flag's fleet numbers, Resynced details. The manual is the 1987 game only; the dance,
  chain/grape shot and the town-assault grid belong to 2004 and come from W04.
- No web fetch was needed: the local files cover the questions. (The manual has no recruiting-rumour list, no map-piece count and
  no lost-family section; do not look for them there.)

## Corrections to `research_pirates.md` and `GAMES_RESEARCH.md`

| Earlier claim | What the sources say | Verdict |
|---|---|---|
| "Sea Dogs / Corsairs / Age of Pirates: three names for one series" | WSD: Akella's Russian title is "Korsary: Proklyat'ye dal'nikh morey" (Corsairs: Curse of the Distant Seas); Sea Dogs is the English name; sequels renamed for legal and brand reasons. WCOR: "Corsairs: Conquest at Sea" (Microids, 1999) is a different, unrelated game (campaign scenarios, or "capture all the ports" adventure mode). | Partly wrong. Two different games share "Corsairs". The GameSpot "Corsairs 2000: cumbersome interface, lackluster presentation" line was probably about the Microids game (WCOR: "buggy... outdated sound and graphics"), so it was likely credited to the wrong series. UNVERIFIED which game the review covered. |
| "Sea Dogs widely seen as the first 3D pirate game" | WSD: "one of the first successful Russian games", custom 3D engine, "gameplay similar to Pirates!" plus an RPG. Nothing says first 3D pirate game. | Overstated. |
| Sea Dogs reviews | WSD: Metacritic "average"; IGN positive; GameSpot "enthralling despite its many problems"; NextGen "flawed design choices and lack of atmosphere". The plot is a search for the player's father, needing several flag changes. | Adds "lack of atmosphere" and the father quest. |
| Treasure map "in four fragments" [M] | MANUAL p18: "Maps is a file of all your map fragments... all maps have the objective... in the center. Unfortunately, it's a secret map, so parts may be missing." No count given. W04: portions of each historical pirate's treasure map are sold in taverns. | The count of four stays UNVERIFIED. The mechanism below is solid. |
| "Age as the clock" (idea 1) | MANUAL p33-35: the clock is health ("career is limited to five to ten years of active endeavor") and a separate crew-impatience clock ("difficult to keep the crew pleased for more than a year"). W04: age slows the player's swordplay, "one of the methods for ensuring that older characters are pressed into retirement". | The age clock is a skill-and-health clock, not a timer. Still not for HOIST (CANON: dread by place, never time). |
| "Skill-scaled duel: opponent reads the captain's age and crew mood" | W04: the PLAYER's moves slow with age; in boarding duels crew size and morale decide casualties; challenge duels (tavern, rival suitor) have no crew effect. | The mechanism was described wrongly. |
| "Dance with a harbour notable" | The dance is 2004 only (W04); the 1987 manual has no dance. The partner is the governor's daughter; steps are hand signals (left, right, back, forward, spin left, spin right); reward is "amour", gifts or valuable information. MANUAL p79 (designers' note) says the daughter stands for inside political information. | Confirmed and sharpened. |
| "Towns differ in architecture and flag by nation" [M] | Not in the manual. What differs by nation is trade law and welcome (MANUAL p38-39). | UNVERIFIED, drop. |
| "Crew shares and morale decide mutiny" [M] | MANUAL p33-34: confirmed, with exact rules (angry too long = mutiny; desertion at every port; defections if food runs out). | Confirmed. |
| Black Flag criticism "handles like a bus, wind has little meaning, endless reinforcements" | WAC4 reception does NOT list these. WAC4 lists: repetitive story missions, eavesdropping and tailing missions (including naval tailing) "heavily criticized", clunky stealth, monotonous melee, weak enemy AI. | The earlier items stay UNVERIFIED (snippet only). The sourced worst-offender is the tailing mission. |
| Resynced "26 May 2026" | WAC4: showcase 23 April 2026, released 9 July 2026, adds a dynamic weather system, three officers, new side quests; modern-day story and multiplayer cut. | Release date differs (26 May may be the date of the Ubisoft article; UNVERIFIED). |
| 1987 "random events" | W87: "random events do not have any graphical representation, and the player can do nothing to prevent them." | HOIST's plan to show events from the sea (CANON 2026-11-25) is an improvement on the source, not a copy. |

## 1. Sailing and ships

### The nine hulls (MANUAL, "A Gazetteer of Ships, circa 1690", p44-49)
Speeds are leagues per watch (a league about 2.5 miles, a watch about four hours); first value light wind, second strong wind
where given as a range. "Max/typ guns" are heavy cannon; crew is maximum / typical crew and passengers.

| Hull | Rig | Speed | Best point of sail | Guns max/typ | Crew max/typ | Cargo t |
|---|---|---|---|---|---|---|
| Spanish galleon | square | 7-15 | broad reach | 36 / 20-24 | 288 / 275 | 160 |
| Spanish war galleon | square | 7-15 | broad reach or running reach | 32 / 28-32 | 256 / 250 | 140 |
| Fast galleon (N. European) | square | 9-12 | broad reach or running reach | 28 / 24 | 224 / 215 | 120 |
| Frigate | square | 9-12 | broad reach or running reach | 28 / 26-28 | 224 / 190 | 120 |
| Merchantman | square | 9-12 | broad reach | 24 / 6-12 | 198 / 20-45 | 100 |
| Cargo fluyt | square | 9-12 | running reach | 20 / 4-12 | 160 / 12-24 | 80 |
| Barque | fore-and-aft | 9-12 | broad beam reach | 16 / 4-6 | 128 / 12-36 | 60 |
| Sloop | fore-and-aft | 9-10 | broad reach or broad beam reach | 12 / 4-6 | 96 / 8-12 | 40 |
| Pinnace | fore-and-aft | 9-10 | broad beam reach or beam reach | 8 / 2-4 | 64 / 8-12 | 20 |

Character notes worth keeping (all MANUAL p45-49):
- Galleons: "slow to turn, and are especially poor sailers close-hauled. Tacking into the wind is very difficult."
- Frigate: "faster than most square-rigged ships when close-hauled"; "Most pirates and buccaneers disappear over the horizon whenever a frigate appears."
- Fluyt: crews of "12 to 15 men is not uncommon"; draft "so shallow it can enter rivers, coves and small harbors"; "often surrender after a broadside or two."
- Barque: "carry oars, allowing them to row straight into the eye of the wind"; "few Barques return from the Caribbean to Europe" because the stormy North Atlantic route breaks them.
- Sloop: "exceptionally maneuverable... Close-hauled it sails very fast, and under oars it can move directly into the wind"; "shallow draft, allowing them to sail over shoals with no risk"; weakness: "in strong winds it is considerably slower than a large square-rigged ship."
- Pinnace: "faster than a sloop" close-hauled and "much faster when rowing into the wind"; Drake "abandoned his merchantmen in favor of pinnaces."
- Rule of thumb (MANUAL p28, "Best Speed"): "In light winds smaller ships are often faster, while in strong winds bigger, heavier ships sail faster if the wind is in an advantageous position." Fore-and-aft rigs do best on a beam or broad beam reach; square-rigged on a broad or running broad reach.

### Wind, point of sail, weather gauge (MANUAL p20-21, p28)
- "The speed of a ship depends on how the wind blows against it. Travelling directly into the wind is always slowest. Travelling with wind coming diagonally from the rear is generally the fastest. Each type of ship has a different 'point of sailing'."
- Wind is drawn by the sky: "The clouds travelling overhead indicate the direction of the wind, which varies significantly. Clouds are storm fronts that provide strong, fast wind if you are near, but may trap your ship if you sail too close." (p21). W04 repeats it: clouds mark depressions, storms "usually boost sailing in any direction, but also pose a threat"; wind tends to blow west, speeding westward travel (as the manual's Geographical Footnote says: trade winds from the east).
- Weather gauge (p28): "A ship upwind... has the 'weather gauge'. With this advantage a ship can run downwind and rapidly attack its opponent, while the enemy must laboriously tack upwind to reach it." A small ship with it "can tack back and forth across the bow or stern of a much larger ship, firing broadside after broadside with impunity."
- Game assistance: at the hardest level "there is no game assistance for sailing into the wind (as there is at lower levels)" (Notes & Memoranda, p78). W04: in battle most ships cannot sail into the wind; on the sailing map they can, slowly.
- Fleet speed (p21): "the entire fleet travels at the speed of the single largest ship"; prizes that are slow (galleons, badly damaged ships) drag the fleet (p26).

### Crew effects (MANUAL)
- Minimum crew: "It takes at least eight (8) men to sail a ship. If you have fewer than eight men per ship, your men will abandon one." (p21)
- Four crewmen per gun (p25): a small crew means fewer guns fire.
- Gun reload speed depends on crew morale: "A happy crew loads faster than an unhappy one." Changing sails halts reloading "the gun crews are needed aloft." (p26)
- A prize needs eight men to handle it, "eight fewer men available for battle." (p26)

### Damage, repair, storms, shoals
- Shoals and reefs are seen, not marked: "You can see where the sea breaks across shallow reefs and shoals. If you pass over these, one of your ships could lose its bottom. Pinnaces and sloops have a very shallow draft, allowing them to sail across these hazards without risk." (p21). W04: shoals now do hull damage but "rarely sink ships, unlike in previous versions".
- Sail damage trade: full sails for speed, battle sails for "much less risk of rigging damage" (p26). Capt'n Sydney: full sail "dance about 'em smartly... I canna' afford to take any fire, elsewise I'll lose plenty of sail and perhaps a mast." (p27). Battle ends by sailing away, or "nightfall may end the fight" (p26).
- Repair: merchants "can repair or buy ships and cannon" (p19); Sydney says "any ol' anchorage 'd do for repairs" (p22); after dividing the plunder "refitting your ship (which takes a few months)" (p19). W04: repair prices fall with rank and reputation in the city's nation, "eventually are done for free".
- Hurricanes: the Geographical Footnote (p23) says bad weather runs "June to November, with hurricanes not uncommon in the later part". Whether the game models seasons is UNVERIFIED; the manual lists it as history only.
- Anchoring: "You can only anchor in shallow, coastal water. Do this by sailing directly up to the coast. The ship automatically stops and your crew disembarks." (p21). Set sail from the coast in one of eight directions.

### Navigation and how the coast is learned (MANUAL p18, p22; W04; W87)
- The Caribbean is given, not discovered: the map is on screen with "a latitude scale... on the side" (p22). There is no fog of war in the sources. What is hidden is knowledge about towns (see section 3).
- Position: "Take a Sun Sight allows you to spend the day plotting your position with the astrolabe... a technique for finding your latitude." You move the astrolabe under the sun and raise the platform until it touches the bottom of the sun, at noon; "cloudy weather makes sun sightings difficult." Longitude "can be found only through dead reckoning"; an apprentice's sailing master reckons it for you, and takes a large share of the loot in return (p22, p8).
- Sun sighting was removed in the 1993 Gold version (W87: "Sun sighting is not in this version") and in 2004 (W04: "Some elements like sun sighting were removed").
- Starting rite: the game asks when the treasure fleet or silver train reaches a named town; right answer starts you well, wrong "you are warned about an unpromising start" (p9). W87: this was the copy protection.
- The Pirates! 2004 sea shows ships as 3D models you can spot from afar and read "their mission, port of departure, destination, and nationality" (W04).

### Sighting and encounter ladder (MANUAL p24)
"Sail Ho! ... Your first sighting of an enemy ship is its sails and masts coming over the horizon. Continuing your voyage is a nearly foolproof way to evade any encounter. Investigating the sail means you automatically close on the other ship." Then "Ship in View" (whole ship; you may still sail away), then "See Her Colors" (nationality; options: sail away peacefully, "come alongside and talk over the latest news", or attack; a pirate or pirate-hunter "may recognize you and attack, regardless of your choice"). W04 changed this: "enemy ships cannot force the player to fight", they can only bombard.

## 2. Combat and boarding

### Broadside and sea battle (MANUAL p25-27)
- The fight is ship against ship; the hull colour matches the name below. Choose a flagship from your fleet; "the number of men and guns available for battle is a theoretical figure" bounded by hull size and four men per gun.
- Fire Broadside: "your gun captains automatically fire the side of the ship nearest the enemy... to aim your guns, you must turn the ship so its side faces the enemy." Effect "varies with the number of guns firing, and the size of ship hit. For example, a broadside from a 20-gun ship into a galleon may have little effect, while the same into a pinnace might leave her a flaming wreck."
- Enemy reload depends on crew quality: warships, pirate-hunters and pirates are better than "peaceful merchantmen and cargo fluyts".
- Escape: sail away until the range ends it. "If you escape from battle and the enemy ship is undamaged, you may lose a ship to the enemy pursuit" (only with two or more ships).
- Grapple: "If you sail your ship alongside or into the enemy, the ships automatically grapple for a boarding battle. You must lead your men into the fight."
- Sydney's tactics (p27): take the weather gauge, "give her a few cannonades into the stern, and board"; square-riggers outrun fore-and-aft in strong wind; against a fore-and-aft rig "they'll just escape upwind"; "temperament": some sail broadside to broadside, some "hardly fire a cannon" and trust steel.
- LeGrand's galleon (p28): 28 men in a leaking pinnace took a galleon by creeping under her stern at dusk, away from her broadside; the captain "was playing cards".
- Fort fights (p21, p27): "the fort may open fire"; to storm a coastal fort you must ground the flagship near it, "if you land too far away, the men will refuse to march."
- 2004 additions (W04): shot types round (longest range, hull damage), chain (sail damage, can dismast), grape (slow, short, kills crew, slows reload); automatic aim; a 48-gun ship of the line fires a 24-gun broadside; hit in the magazine blows a ship up.

### Surrender and boarding (MANUAL p12, p16; W04)
- Boarding is a sword duel with a crew melee around it. Morale ladder (p15): "Wild! (the best) downward through Strong, Firm, Angry, Shaken and finally Panic." "Surrender occurs when you inflict sufficient hits on an enemy leader in 'panic', or when you've reduced the enemy to just one remaining man and then hit the leader." "Striking a man who surrendered is an unchivalrous deed that may inspire him to rise and fight on."
- Retreat is allowed: "you lose whatever you were fighting over and your reputation suffers" (p12).
- W04: "An enemy ship will always surrender if it is dismasted (except escort ships, which never surrender) although it may also choose to surrender if faced with a powerful boarding party compared to its own crew or if very seriously damaged."

### What a captured ship becomes (MANUAL p26; W04)
- "Prizes & Plunder: When you win a battle at sea, you can either take the enemy ship as a prize (send a prize crew) or you can just take its cargo, while burning and sinking the ship itself." A report gives armament, capacity and free hold space.
- Costs of keeping: eight men for the prize; slows the fleet (galleons, damaged ships); hold space. Benefit: "you can sell the ship as well as its cargo at a friendly port." (p26)
- "Compared to its value, gold weighs virtually nothing" and is taken automatically; goods are chosen by dragging each line to your ship or "throw overboard" (p26-27). Drake had to leave silver behind "because it was too heavy to carry" (p51).
- W04: captured crew specialists "like a sailmaker or a cooper" join automatically; some of the crew join "especially if the crew morale is high"; captured crews "may have news on various events of interest to the player"; the ship can be scuttled or burned if damaged, if no friendly port is near, or if the fleet would be slowed. Recruiting from captures is easiest from a pirate or a ship with a very large crew (MANUAL p33).

### Dividing the plunder, shares, morale, desertion (MANUAL p19, p33-34)
- "Divide up the Plunder: As Captain, you get a fixed percentage... The remainder is divided among the crew... not only is the plunder divided, but also the ships, stores, goods and cannon on them. The crew always disperses... leaving you with just your flagship."
- Numbers (p34): each officer's share "a bit over 2%". Captain with two shares 5% (apprentice), four 10% (journeyman), six 15% (adventurer), eight 20% (swashbuckler). Captain's cut is independent of crew size "to discourage Captains from leading their crews into massacres". A flat 10% goes to sponsors, who usually re-lend it: next voyage starts with "about 10% of the last voyages' profit".
- Difficulty trades help for loot: the better your expert officers (navigator, gunner), the larger the shares they take (p8, p22).
- Morale (p33-34): four words, "happy (the best) to pleased, unhappy, and angry". "The more money the party has, the happier they are. The crew attaches little importance to captured ships, goods, and other items. Their eyes are on gold!" "The crew is impatient... difficult to keep the crew pleased for more than a year, and almost impossible... two years." Unhappy or angry: "they will start deserting whenever you visit port. If they are angry too long, they mutiny." "It is easier to keep a small crew happy than a large crew" (bigger share each). "Converting plundered cargo to gold helps keep morale high, especially if you sell at a town with high prices." "Expect defections if you run out of food." (p18). Share size sets reputation: large shares raise prestige, small shares make recruiting harder.
- Captain elected by the crew; a rival may duel for the captaincy (p36).

## 3. Towns and nations

### The four screens of a town (MANUAL p19)
Visit the Governor, Visit a Tavern, Trade with a Merchant, Divide up the Plunder, Check Information, Leave Town. Designers' note (p78): "colonial port society actually centered around three main elements: recreation (the 'taverns'), trading (the 'merchant'), and politics (the 'governor')."

### Arrival modes (MANUAL p21-22)
Sail into harbor (peaceful, forts may fire if the nation is hostile; if "wary" they fire only if the governor personally dislikes you), Attack Town, Sneak into Town, Leave. Sneak: "hide your ships in a nearby cove and creep into the back streets at night with a few trusted men"; you cannot recruit ("recruiting is a very public activity"), and "the party's loot is left behind", so no dividing. "If your reputation is large, you may be recognized and attacked", then fight out or be imprisoned. Sydney: sneaking into rich ports let him trade where governors would not, "let 'em sense a profit, and they'd be at yer rail and hang what the gov'ner thought" (p22-23), until he got too famous.

### Governors, ranks, nations (MANUAL p37)
- Towns with more than 600 citizens have a governor; his attitude starts from his nation's attitude, plus favors and wrongs to his own area. "You can curry favor with a governor by capturing pirates in waters near his port and then returning that pirate to him." He is dismayed if you take his nation's ships near his town, "especially unhappy if you've plundered his town."
- A hostile governor orders "any harbor forts to fire upon your vessels as they sail in". Visit rule: "Once you have visited the governor of a town, don't expect to gain admittance again soon." (p19)
- Ranks, low to high: Ensign, Captain (of privateers), Major, Colonel (militia), Admiral of privateers. Nobility: Baron, Count, Marquis, Duke. Land grows with each promotion.
- Nation states: attacks make a nation "ill-disposed", then "wary", then "hostile". Wars: "attacks on the Spanish... make the English very happy". Allies remember attacks on an ally (England-Holland example). "Declarations of war, peace and alliance are public knowledge, ends of alliances are not"; the governor's mansion is the best source of the inside news (p37).
- W04 adds: governor's daughter (dance, then gifts or information, a jealous suitor duel, an abduction to rescue, marriage for fame); the nine historical pirates each with a haven, a flag and a buried treasure.

### Letters of marque, privateers, amnesty (MANUAL p37, p41-43)
- Letter of Marque: the crown's official license; privateers keep "a large percentage of whatever they captured" and share with the crown ("the 'price' of the Letter of Marque"). "Letters of Marque are harder and harder to get" by 1680-1700; France offers them again in 1684 (p71). Sydney: forged ones, "a Letter t' kill sheep" (p40). W87: the player starts with a letter from one of four nations and may hold rank with several.
- Pirate Amnesty (p38): "a nation is willing to forget its former hostility toward pirates. Each governor of that nation is empowered to offer former pirates a pardon... sometimes the pardon can be expensive." Caveat: the local governor may still fire on you if your force is large or you attacked nearby; "If you sneak into town you usually have a better chance of getting to the governor and convincing him." Era notes: once you turn hostile "you must wait for a 'Pirate Amnesty' before attempting a trading strategy once more" (p60, p63).
- Standing is per nation and per area ("any particular favors you have done for him are remembered"), shown on a Personal Status screen (p18).

### How towns grow, decline, change (MANUAL p38-40, p72-77)
- Four tiers of Spanish economic vitality (p39): Struggling ("will trade with almost anyone, regardless of laws, excepting only pirates whose reputation in that area is extremely evil... prices and quantities of goods are usually quite low"), Surviving ("fairly decent" reputation needed, modest), Prosperous (only "Captains of high repute", prices fairly high), Wealthy ("almost always follow the letter of the law. Prices are high and goods are plentiful"). So: the richer the harbour, the stricter its welcome; the poorer, the more it asks no questions.
- "The strength of the local merchant community is proportional to the town's economic strength and population. A strong merchant community has many goods for sale, and plenty of money to buy yours. It also has higher prices. Small, poor towns have the lowest prices, but their merchants are poor also, with tiny warehouses." Towns have "special markets and needs... some patterns only last days or weeks, others can last for years."
- Rise and fall (p39-40): colonies "slowly prosper and grow... which attracts population... which obliges the government to install troops and forts". Pirates taking ships near the colony hurt growth. Indian attacks deplete soldiers, not population or economy. Pirate raids take gold and damage the economy. Malaria and disease reduce both garrison and citizens and slow or stop growth. Gold mines give "a one-time upswing... a 'gold rush' mentality boom town". W87: wealth and population "fluctuate constantly" and are "unrelated to player actions" for the random part.
- Fog of knowledge (p18): "If an important event (such as pirate attack or a new governor) radically changes information about a town you'll find 'no information available' until you either visit the town or purchase new information from a traveller in a tavern."
- Places that die or move (Geographical Index p72-77): Nombre de Dios "sited in an unhealthy swamp... plundered mercilessly... At the end of the 16th Century it is abandoned and a new port (Puerto Bello) established nearby"; Isabella "fades in and out of existence as disease takes its toll"; Margarita's pearl beds "fished out... ports abandoned and many families moving to bigger and richer mainland cities"; Gibraltar made "a nonentity" by two sackings; Vera Cruz is "otherwise unhealthy" but a "rich boom town" once a year when the fleet is in; Port Royale destroyed by earthquake in 1692, "considered an act of divine justice".
- The tavern (p37-38): "The first time you visit a tavern openly your reputation will precede you. Men often approach you, hoping to join your crew. Subsequent visits while in port will not yield additional recruits. Men are attracted to heroes, not drunks!" You may keep drinking, time passes, "new crewmen aren't interested in signing up with an old sot" (p19). Travellers sell what they know of other towns: "population, economy, and defenses"; "If you are looking for somebody believed to be at that town, they usually remember if he's been seen there recently." The tavern is "a home for old pirates and other rumormongers".
- Merchant screen (p19-20): food, European goods, the era's export crop, cannon; move the pointer left to buy, right to sell; hold space updates; extra ships can be sold or repaired there; merchants "can repair or buy ships and cannon, but almost never have any for sale". W04: villages carry fewer goods and less gold; pirate-heavy areas pay more for cannon, isolated places more for supplies, spices cheap where they grow.

## 4. Exploration and discovery

- Treasure maps (MANUAL p18): the Maps screen is "a file of all your map fragments to buried treasures and other hidden locations. Initially you have none." The objective is "in the center" and "parts may be missing". Search (p19): "you'll spend a day searching... If you're in the right spot, and have the appropriate map fragment, you'll find what's there. Without a map fragment you always find nothing. This option is not available if you are at sea or in a town." You get there by sailing onto a shore and marching (p21).
- W04: pieces of the nine historical pirates' treasure maps "are sometimes available for purchase in taverns"; digging up a pirate's treasure before defeating him turns him into a hunter of you. Land is also where the player seeks "lost cities" and Montalban's hideout; land combat kicks in at 80 or more soldiers.
- Lost family: the manual only promises you can "rescue helpless waifs from vile slave plantations" (intro, p3). W87: "rescue long-lost family members". W04: the opening is a family enslaved by the Marquis de la Montalban, whose hideout is a late goal (so the whole game has an unspoken background reason). The search clue source is the tavern traveller who "usually remember[s] if he's been seen there recently". Chain details UNVERIFIED.
- The clock: a dated screen ("May 24, 1660"); the calendar matters for the treasure fleet and silver train itineraries printed by era in the manual (e.g. 1660 fleet: Caracas early September, Maracaibo late September... Havana late February, Florida Channel late March). The historical note (p9-10): the flota exists to convoy silver; "Privateer and pirate ships frequently followed it, hoping to pick off stragglers. This was a dangerous business, since a well-handled war galleon could (and sometimes did) turn the tables and capture a pirate!" Heyn took nine small stragglers; the rest scattered (p52).
- How the world is taught without a manual-in-the-game: the era choice (1560 almost all Spanish, to 1680 many colonies), the era notes, and the towns' own screens; W87: "most events in the game are random... early in the game, these can greatly affect future strategic options."
- Famous Expeditions (p6, p50-54): six short scenarios ending when you divide the plunder, graded in difficulty (Hawkins 1569 fairly difficult, Drake 1573 very difficult, Heyn 1628 fairly easy, L'Ollonais 1666 fairly easy, Morgan 1671 very easy, de Pointis 1697 very easy). A "short game" as a different shape for the same sandbox.
- Black Flag (WAC4): "50 other individual locations to explore, including atolls, sea forts, Mayan ruins, sugar plantations, and underwater shipwrecks, with a 60/40 balance between land and naval exploration." The spyglass "can also help determine if an island still has animals to hunt, treasures to find, high points to reach for synchronization or additional side-quests to complete". Underwater shipwrecks are "marked locations". Crew "will remain loyal"; Ubisoft removed their help in combat "believing it allowed players to bypass tense and challenging scenarios too easily."
- Pace praised by critics: WAC4 "The game's pacing and opening were praised, as it introduced the pirate gameplay without the need of an overly long tutorial."

## 5. What makes it beloved, and what people disliked

Sourced (the "feel of arriving in port" is not described in any local source; the town menu is described only as "The town is hustling with activity. Do you: ..."):
- The manual itself: PC Magazine "praised Pirates!'s documentation as enjoyable to read, informative about history, and useful for playing the game"; the Australian Commodore and Amiga Review "noted excellent manual" (W87). Capt'n Sydney's marginal memoirs give each system a voice and a joke; they teach tactics in anecdote (ambush at Caracas, Trinidad made "English").
- "A genre breakthrough" (CGW 1993, W87); "misleadingly easy, with players discovering non-obvious nuances" (Orson Scott Card, W87); "spiritual predecessor of countless others" (W87); over 1 million sold (1987), 1.5 million (2004).
- Designer intent (W87): "designed more around your fantasy of pirates than the actual reality... all the stuff from the movies"; Meier admitted the look came from a trick: art "packed into a font" to load pictures fast; written mostly in BASIC; cut features: "multiple NPCs per town, more detailed sailing including fleet actions, and a subplot involving religion and nobility." Designers' note (p78-79): "no voyage would be complete without buried treasure maps, evil Spaniards, and beautiful women!" and they picked 1660-era Morgan over Blackbeard's age because those later men "had no political intrigue or golden future... just a bullet or a short rope".
- Rhythm: choose your own style (Spain-friendly smuggler, privateer, pirate, trader, "avoid violence altogether" W87); the sessions are small loops (sail, sight, port, plunder) with a chosen retirement; the ending is a position "from beggar to King's advisor" (W87); you can try "a few trial retirements" (MANUAL p5).
- 2004 critics (W04): Metacritic 88; IGN: "solid gameplay design that combines a large variety of activities", "attention to detail in both visuals and sound", "stylized look adding life", but "repetitive nature over time, and some mechanics that feel inconsequential"; CGW "the year's most purely entertaining single-player game". The Xbox port scored 80 and the PSP port 82 on Metacritic.

Disliked or fragile (sourced):
- 1987: PC Magazine: no hard-disk install, bugs, interface issues (W87); strict copy protection (Card defended it).
- 2004 (W04): sword minigame fast at high difficulty with age; repetitive late game; the player cannot be forced into a fight anymore (a softening). 
- Black Flag (WAC4): repetitive story missions; eavesdropping and tailing missions, naval tailing too; stealth controls clunky; melee monotonous.
- Sea Dogs (WSD): "lack of atmosphere"; Corsairs Microids (WCOR): buggy, dated sound and graphics, praised for a decent storyline and creativity ("a lump of coal" for lack of polish).
- (UNVERIFIED snippets from the earlier pass: aimless text-only quests in Age of Pirates; Windward's simple economy.)

## For HOIST

Rules to respect (CANON, RULES): wordless HUD (16); goals found, never marked (11); the game never marks agreement (23a);
pencil means noticed (23); horror implied, never explained (1-2); everything procedural; no time or age clock (CANON 2026-11-12:
"Dread follows where you are, never time"); the owner decides canon (4). Already decided and in the build or the plan (so not
repeated here): harbour state shown ashore, events seen from the sea, specialist hands, standing that can be lost, wrecks as places,
raider crews as wooden ships, the towed boat's drag by point of sail, spyglass/bell/boat gating (CANON 2026-11-23 to 25).
Effort S = a day or less, M = a few days, L = a week or more. CHECK means "see whether the system already does this before building".

### 1. Hail for news; the three-step sighting (S) - corrects the earlier "raider parley" framing
- Source: MANUAL p24 ("sails and masts coming over the horizon... Ship in View... See Her Colors... come alongside and talk over the latest news"); W04 (ship info by spyglass; captured crews "have news").
- In HOIST: ships far off show only sails; closer, the hull; closest, a flag. A sail that never shows a flag in deep water. Any non-hostile ship can be hailed by sailing alongside at a walking pace and holding the bell or lantern: a hand waves, and the chart gets one pencil tick on a harbour (a state, never a goal). Ordinary ships give true ticks, in the deep a tick is a harbour that is not there.
- Fit: wordless, pencil means noticed (23), no marker on a goal (11); builds on parley already in HOIST. Overturns "Pirates! enemies force the fight" (1987 yes, 2004 no); HOIST should follow 2004.

### 2. The back door: a refused harbour entered by boat at night (M)
- Source: MANUAL p21-22 (Sneak into Town: hide the ships in a cove, creep in at night; no recruiting, loot left aboard so no dividing; recognition grows with reputation; Sydney p22-23).
- In HOIST: a harbour that refuses the Gull can be reached by the ship's boat from a cove, at night only. Allowed: buy stores, sell a little; refused: hiring hands, big sales, the shipwright. The more a water's standing sinks, the more a lantern on the quay watches the cove. No text; a refused harbour's side stair is lit or dark.
- Fit: ship's boat exists (CANON 2026-11-23); "standing can be lost" (2026-11-24) gets a way back that is not a fee. Effort M (cove placement per harbour, night gating). Not in earlier research.

### 3. Stale knowledge: the chart keeps what you last saw; travellers refresh it (M) - refines "Harbours show their state"
- Source: MANUAL p18 ("no information available until you either visit the town or purchase new information from a traveller in a tavern"), p37-38 (travellers recall "population, economy, and defenses"; and whether someone "has been seen there recently").
- In HOIST: the chart draws a harbour as the player last saw it (a quay full or bare, a smoke plume or none); a sailor at a quay or a passing hull gives a pencil redraw of one named harbour, which may be wrong in the deep. A person searched for (Teo, Ilse, the castaways) is "remembered" the same way: a sailor says by gesture which way a boat went. No numbers.
- Fit: wordless; works with the harbour-state decision of 2026-11-25. Dread: a sketch that is newer than the visit. Care with 23a: never mark two sources that agree. CHECK how the chart stores harbour state. Effort M. Strengthens the earlier idea (3, 4) rather than replacing it.

### 4. Rich harbours ask questions, poor ones do not (S)
- Source: MANUAL p39 (four tiers; Struggling towns "will trade with almost anyone, regardless of laws, excepting only pirates whose reputation... is extremely evil"; Wealthy towns "almost always follow the letter of the law"; "Prices are high and goods plentiful"). Overturns nothing in the earlier research but adds a rule it lacked.
- In HOIST: welcome is set by wealth against standing: a plentiful harbour shuts the door on a captain with a low name (refusal already exists); a dying harbour in the deep opens to anyone and takes anything, which is the bright reading (cheap, friendly, no questions) and the wrong one (nobody on the quay asks who you are, or why your hold is that full).
- Fit: uses the existing state tiers and refusal; implied horror, no explanation. Note the manual has a different price rule from the owner's 2026-11-25 decision: there, poor towns have the LOWEST prices and tiny stocks; HOIST decided dying harbours charge MORE and pay less. Not a conflict in my proposal, but if the owner wants "bargains in the failing places" the manual supports it. Effort S.

### 5. The noon sight: an instrument that cannot be argued with (M)
- Source: MANUAL p22 (astrolabe latitude at noon; cloud hinders; dead reckoning for longitude; the sailing master does it for you at a cost in shares); removed in 1993 and 2004 (W87, W04: players did not miss it enough to keep it).
- In HOIST: at noon, holding the Gull still, the captain raises a brass sight to the sun; a pencil band (a latitude, not a dot) appears on the chart's edge. Cloud ruins it. In deep dread the band lands somewhere the dead-reckoned track cannot be, or the sun stands at an hour it should not. The chart still never marks a goal (11).
- Fit: new instrument, tool-gated like the spyglass; wordless; the ship's place on the chart is something earned, not given. CHECK what the chart already shows of the ship. The 2004 removal is the warning: keep it one key, one noon, no minigame, or it will be dropped again. Effort M. Needs owner OK (it changes what the chart tells). Not in earlier research.

### 6. What a prize costs (S) - corrects and extends the earlier "what a captured ship becomes"
- Source: MANUAL p26-27 (eight men to handle a prize; slowest ship sets the fleet's pace; hold space; gold "weighs virtually nothing", goods are chosen and thrown overboard); W04 (specialists from captured crews join; captured crews carry news; sink or burn if no friendly port).
- In HOIST: a struck ship can be towed (drag by point of sail, as the boat already does), taking one or two hands off the Gull for the tow; a specialist among the captured crew (sailmaker, cooper) signs on by choice, shown only as a new figure at the rail; cargo is chosen by weight (what fits in the hold). The Reef notices burning (CANON region rule), the Crown rewards bringing a raider into the nearest quay (MANUAL p37: capture pirates in waters near a port and hand them over).
- Fit: matches the earlier ideas 7 and 9 but with sourced costs. "Strip her to mend the Gull" has no source here (it comes from Resynced snippets: UNVERIFIED). Effort S (tow drag exists) to M (specialist roll).

### 7. Shares on the quay (M) - needs a check against the crew-spirits system
- Source: MANUAL p33-34 (morale comes from coin per head, not from goods: "Their eyes are on gold"; converting cargo to gold lifts it; small crews are happier; desertion at port when unhappy; mutiny if angry too long; defections when out of food; "Men are attracted to heroes, not drunks" p37).
- In HOIST: after a good run the hands count coin on the quay into small stacks, one per head; the stacks' size is the mood, shown only as how loud the crew is aboard next morning (singing, quiet, backs turned). Desertion only appears as an empty berth at a harbour, never a text. Hands do not rejoin a drinker (no repeat recruiting on one stay).
- Fit: wordless crew mood (idea 24 earlier), uses existing "crew's spirits" (CANON 2026-11-23). I have not read the code; CHECK whether coin already feeds spirits. The impatience clock (about a year) is a time clock: do not copy it; keep mood tied to stores, night and shore rest. Effort M.

### 8. Cloud shadows as the wind, and a storm front you can ride (S-M)
- Source: MANUAL p21 ("The clouds travelling overhead indicate the direction of the wind... Clouds are storm fronts that provide strong, fast wind if you are near, but may trap your ship if you sail too close"); W04 (depressions; boost in any direction, threat beneath).
- In HOIST: cloud shadows drift with the wind across the water, so the player reads the wind without a gauge; a dark front is a gift (fast reach) and a trap (becalmed in its centre, or the dread's swell). Fits the wordless HUD, the "wind that matters" tradition, and the 2026-11-24 deep seas.
- CHECK first: HOIST already shows wind by telltales and pennants. This adds only the sky as a second reader. Effort S-M. Overturns nothing; confirms Pirates! made the sky the instrument.

### 9. The spyglass tells what is left, and sometimes lies (S)
- Source: WAC4 ("the spyglass... can also help determine if an island still has animals to hunt, treasures to find... or additional side-quests"); W04 (ship mission, origin, destination, nationality read from afar).
- In HOIST: through the glass an island with something undone shows a sign (a waved cloth, a glint, birds circling a place); a spent island shows washing in, boats pulled up. A ship's glass reading is a small fixed set (what she carries by how she sits; where she came from by her wake). In the deep the glass shows what is not there. Never a marker; the glass already gates places.
- Fit: wordless; "no sighting messages" (CANON 2026-11-13). Effort S. Not in earlier research.

### 10. The cache you dig has an owner (S)
- Source: W04 (treasure of each pirate is buried; pieces of the map are sold in taverns; digging up a pirate's treasure before beating him turns him into a hunter); MANUAL p18-19 (searching takes a day at the right spot, only with the fragment, never at sea or in a town; "without a map fragment you always find nothing").
- In HOIST: the four raider crews (CANON 2026-11-24) each have a cache; digging one before dealing with the crew sets that crew hunting the Gull (one raider at a time, parley still possible). Digging stays a deliberate act with its time and place. No new lore: the cache is an ordinary hole with ordinary things.
- Fit: uses existing dig, maps in halves, and raiders. Effort S. Corrects "treasure map in four fragments": HOIST's halves are its own choice, not a Pirates! fact.

### 11. A dance with a notable at the feast (M)
- Source: W04 (dance by hand signals left, right, back, forward, spin; reward amour, gifts or information); MANUAL p79 (the daughter stands for confidential information); the dance is not in the 1987 game, so the earlier pass's "Pirates! 1987" attribution should read 2004.
- In HOIST: at a harbour's feast (a bunting event, already planned) a notable offers a hand: a few steps shown by the partner's feet, answered with two or three keys; success earns a rumour as a pencil tick (idea 1's ink), a favour at the quay, or a reduced fee. In the deep a partner stops looking at you; the steps go out of time with the band.
- Fit: wordless (the captain never speaks), cosy first, strange second (RULES 2). It is a skill game; keep it short, forgiving, and optional (a decline has no penalty) because the 2004 minigames "outstay their welcome" is UNVERIFIED but a common complaint. No courtship or marriage. Effort M. The first synthesis left this unranked; I rate it a good wordless social beat.

### 12. A convoy with a route, not a date (L, owner decision)
- Source: MANUAL p9-10 and the itineraries per era (the silver train and treasure fleet visit named towns in order, a named half-month each); the stragglers rule ("pick off stragglers", "a war galleon could turn the tables"); Heyn p52 (nine stragglers taken); the 1987 copy protection that asked the date.
- In HOIST: a Crown payship convoy sails a fixed loop through three or four harbours; the loop is learned by seeing it twice (a line of lights at dusk, harbour bunting when it is due), never by date or a screen. Stragglers can be hailed; the escorts do not fight a boat that keeps its distance. In the deep the same loop sails with one more hull than it left with; nobody mentions it.
- Fit: adds a place-bound rhythm without a time clock (the weekday already shown could set it, but I would tie it to harbours instead). Touches the Crown's story (the Strange High House, Ferryman's Coin threads), so it needs the owner (RULES 4). Effort L. Not in earlier research.

### Smaller sourced notes (not ranked)
- **Amnesty as a window (S).** MANUAL p38, p60: a nation can offer pardon, "sometimes expensive", and a hostile local fort may still fire; sneaking helps. HOIST: after a Crown event (a coronation, a peace) a harbour lowers a flag for a day and standing can be mended for a deed or a fee. Uses standing-can-be-lost.
- **Hull class by wind strength (S-M).** MANUAL p28: small hulls win in light airs, big hulls in strong wind; sloops and pinnaces are the shoal boats; barques, sloops and pinnaces "row straight into the eye of the wind". HOIST: the shipwright's upgrades could trade light-wind speed for gale speed. Sweeps for the Gull touch the cut third oar (CANON 2026-11-12), so ask first.
- **First visit only.** MANUAL p37: only the first open tavern visit brings recruits. HOIST: hired hands present themselves on a first visit; waiting around on a quay does not bring more.
- **Governor visit once.** MANUAL p19: "don't expect admittance again soon." HOIST: the harbour's notable gives a task once per stay; the door closes after.
- **Sydney's timing advice.** MANUAL p41: attack after a plague or an Indian attack, not after a pirate raid (garrison reinforced). HOIST: after a raid a harbour's quay guards are doubled for a spell (refusal stricter).
- **The Pirates! 2004 softening.** Shoals rarely sink ships; enemies cannot force a fight; captured ships can be sunk without penalty. HOIST is cosy first, so follow the 2004 line.
- **Black Flag crew rule.** WAC4: Ubisoft removed crew help in combat so players could not bypass tension. HOIST's specialist hands should unlock options and calm moods, never solve an encounter.

## Not recommended (confirmed or sharpened by the sources)
- **An age and retirement clock.** MANUAL p33-35 and W04 are explicit that age and health are the clock, plus a one-year crew-patience clock. CANON forbids time clocks. The retirement tally ("beggar to King's advisor", W87) could be read as the endings card, but the six endings already do that job.
- **A sword duel with the captain.** MANUAL p11-16 and W04 describe a skill minigame (combinations or three attacks and parries). The captain never speaks and the HOIST boarding is wordless; a duel pulls toward action.
- **Tailing and eavesdropping errands.** WAC4: the worst-received missions, including naval tailing. Do not add "follow that ship" jobs.
- **Land assault grids, pike and shot.** MANUAL p29-32, W04: a whole second game. Not for a cosy sailing game.
- **A copy-protection-style start question** (treasure fleet date): a 1987 artefact (W87).

## Open questions for the owner
1. Does the chart show the ship's own place? (Needed before the noon sight, item 5.)
2. May harbours be hailed or told apart by pencil ticks on the chart without breaking rule 23a? (Items 1 and 3.)
3. May a Crown convoy exist as sea traffic with no story meaning (item 12)?
4. Should failing harbours welcome strangers (item 4), given the 2026-11-25 price decision?
5. A feast dance (item 11): in or out as a skill beat?
