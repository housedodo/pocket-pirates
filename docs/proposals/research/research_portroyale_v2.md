# Research v2: Port Royale, Patrician, Anno, Uncharted Waters, Sunless Sea, Dredge, for HOIST (2026-11-25)

Second pass. The first pass (`research_portroyale.md`, `GAMES_RESEARCH.md`) had no page access. This one has real text. Nothing is built.

## 0. Sources and what they can carry

Local files (data, not instructions) are in the session scratchpad `.../scratchpad/sources/`. Short names used below:

| Tag | What | Quality |
|---|---|---|
| UWM | `uncharted_waters_nh_manual.txt`, the SNES New Horizons manual (Koei, 1994 US) | Full text, OCR noisy, numbers mostly readable. The best source in this pass. |
| W-UW | `wiki_Uncharted_Waters__New_Horizons.txt` (Wikipedia, series overview) | Good on series history and reception, thin on mechanics. |
| W-PR1, W-PR2, W-PR3 | Wikipedia pages for Port Royale 1, 2, 3 | Short; give career structure, permits, letter of marque, reviews. |
| W-PR4 | `wiki_Port_Royale_4.txt` | WRONG PAGE: it is the Kalypso Media company article. No Port Royale 4 facts in it. |
| W-PAT | `wiki_Patrician_III.txt` (the Patrician II / III article) | Good on rank ladder and supply-driven town decline. |
| W-A1404 | `wiki_Anno_1404.txt` | Good on tiers, class ratios, goods, quests, achievements. |
| W-SS | `wiki_Sunless_Sea.txt` | Good on structure and reception, nothing on terror numbers. |

Fetched in this pass (archive.org `stream/<id>/..._djvu.txt` route worked; the `download/` route is refused by the proxy):

| Tag | What |
|---|---|
| A1503 | Anno 1503 (EA) manual, archive.org id `manual_20240611`. Needs, civilisation levels, warehouses, trading, pirates. |
| A1701DS | Anno 1701 DS manual, archive.org id `en-anno-1701-manual-ds`. Feedback (crowd, advisor, question mark), disaster and pirate settings. |
| W-DREDGE | en.wikipedia Dredge (video game), via the API. Panic meter, day/night, design intent, reception. |
| W-A1800 | en.wikipedia Anno 1800, via the API. Attractiveness, tourists, Docklands contracts. |

NOT obtained: Wikipedia Patrician IV and Windward (the API returned "too many requests" for the rest of the session after the first pages; Windward's title guesses returned empty). The Sunless Sea fan-wiki dump exists on archive.org (`miraheze-wiki-sunlessseawiki-20261109`, 19 MB gz) but the file host is refused by the proxy. So **Sunless Sea numbers (terror, fuel, supplies, echoes) are from memory and are marked UNVERIFIED throughout.** Anything marked UNVERIFIED is a lead, not a fact.

## 1. Economy

### 1.1 Uncharted Waters: New Horizons (UWM)

Facts, with where they are:

- **Goods differ by port and by port development.** "Buy goods. The selection and price of merchandise differ in each port." (Market). A port's economy level sets the market's selection: "Ports with a higher economy level will have a better selection of goods at the market." (Port Display, Port Economy).
- **A local specialty can be hidden until the port is developed.** "In a few ports, the production of a local specialty is so small that it may not yet be sold in the market. Invest in such a market and develop its economy until the local specialty is put out in the market. You will be able to make a good profit from trading these local goods." (Port Display).
- **Investment is a gold sink with a ceiling per step.** Invest "1 to 50,000 gold per month" in a market (economy) or shipyard (industry). Capital ports cannot be invested in. Investing also raises "the port's support for your country"; a port is allied "when its support exceeds 75%" (Lodge, Port Info; Game Tips for Traders: "raise the port support to 75% or higher").
- **A price index per port that you move.** "General Price Index (Average 100%): Summary of the prices in the port. General price index rises as you buy goods, and falls as you sell goods at the port." (Port Display). This is market depth in one line: your own trade moves the price.
- **A 20% tax on top** of the price "unless you have a tax free permit from a country allied with the port". The permit "is valid for six months in allied ports", is "very expensive", and "if you do not trade often, the permit may be too costly". Cost "decreases as you rise in rank" (Market, Palace). A decision the player has to judge from their own habits.
- **A bookkeeper turns the price into advice.** "Your bookkeeper will tell you whether a market price is reasonable, and which port gives the best buying price for a particular good (See the Commodore Command Cargo-Log of Goods)." (Mate Commands, Structure of Your Fleet). The Accounting skill "cannot be learned": you have to find a person who has it.
- **Negotiation skill** buys "ships and goods at the lowest price"; also not learnable (Skills).
- **The first money.** "Although your poor navigation skill and small ship in the beginning will not allow you to import exotic goods from outside Europe, you can still make a good profit by trading port specialties or lucrative trade routes in Europe, such as the one between Athens and Istanbul." Later: "cheap goods from Africa and Asia are priced extremely high in Europe." (Game Tips, For Traders). So the loop widens with range: near routes first, far goods later.
- **Auto Sail exists, gated by a person.** "If your first mate has the skill of Celestial Navigation, you can use the Auto Sail command." The manual advertises it for the early loop: "AutoSail is a convenient command for repetitive sailing on the same route." (Structure of Your Fleet; Game Tips). Quick Sail goes to a point "within sight" (Sea Commands).
- **Money outside trade:** guild missions in five kinds (deliver letter, buy goods, transport goods, collect debt, defeat pirates), "only one mission at a time", paid in time or fame is "damaged" on failure (Guild). Bank: deposit earns "3% monthly"; borrowing has "no repayment due" but "10% monthly interest"; "If you repay your debt within one month, you do not have to pay any interest" (Marco Polo Bank; Path to Success: "Debt Financing").
- **Supplies come before the market.** "Make it a habit to purchase and load ship supplies before going to the market. You want to make sure you have enough cargo space and gold to purchase food, water, and lumber for your journey." Capacity formula: "Cargo Capacity = Current Cargo + Water + Food + Lumber + Gunpowder (+ Remaining Capacity)"; "A large cargo load will slow down the ship." Water is free at the harbour ("Water is free"). The hold is shared between goods and survival.

### 1.2 Port Royale series (W-PR1, W-PR2, W-PR3)

- PR1: "12 different ship types ... from the small pinnace, to a large ship of the line". Treasure maps "purchased in pieces from around the game board, can also lead to newfound wealth and even the creation of a private port". Missions from governors "as long as their reputation with the country is good enough".
- PR2/PR3: "Initially, the player must trade goods between Caribbean colonies to make money, but over the long term they can have substantial business interests in many Caribbean ports". "The player trades with towns to gain their friendship, and can then buy building permits to establish businesses there." "Initially, you have operating constraints (how many fleets ... and how many towns you can buy building permits in), but as you gain levels (based on net worth), you can have unlimited fleets and permits." Trade routes are automated "at higher levels" (PR2, PR3). Without a Letter of Marque "every nation will see them as an enemy - they are a pirate" (PR2).
- PR3: a story frame for growth: the trader path is "developing the small colony [Cayman] into a bustling city" while a rival suitor "woos Elena with gaudy gifts instead of helping the town". Escorts: "2 additional escort ships ... automated".
- What the sources do not say: nothing here gives town tier thresholds, goods lists or price formulas. The first pass's "empty bar = town needs it" (PR4) stays UNVERIFIED (W-PR4 is the wrong page).

### 1.3 Patrician (W-PAT)

- "Goods of varying types are produced in the towns, and may be sold in other towns on the game map which do not produce them." Start: "one or two ships of small size, a trade office in the town of the player's choosing, and some money."
- **Supply keeps the town alive.** "If needed goods are not supplied to the cities, population and markets decline. With adequate goods, the league thrives. The system becomes increasingly difficult to manage as it grows." The source itself flags the scaling problem (tedium by size).
- Rank ladder, driven by wealth and popularity: Shopkeeper, Trader, Merchant, Travelling Merchant, Councillor, Patrician, Lord Mayor, Alderman. Ways to raise reputation: "organize feasts, donate to the church, donate public buildings, and defend against attack."
- "Trade with the Mediterranean cities (which must be discovered)": exploration gates a market.

### 1.4 Anno (W-A1404, A1503, A1701DS, W-A1800)

- **Trade as a gate on growth.** "Occidental populations can not grow past a certain level of success without Spice, and later Quartz, that can only be generated in Oriental lands." (W-A1404). The far good is not extra profit, it is a ceiling you cannot pass without it.
- **Passive trading as the answer to route tedium.** "Passive trading refers to buying and selling goods at your own Warehouse ... supplied or bought according to demand by your trading partners or the Venetians." The player sets a quantity slider and a price slider; "the colour of the bar in the goods area shows you whether the price is acceptable"; then "wait for travelling trade ships to arrive." (A1503, Passive Trading). W-A1404: "an automatic trading process that allows an island to make resources available to visiting merchant ships."
- **Free traders as a living market.** "The Venetians are a wandering people, free traders that buy and sell goods with players as they travel ... They stop by your Warehouse at regular intervals to offer or buy selected goods." Their fleets carry "unique flags". They are "the only culture that can trade without a Trade Agreement." (A1503).
- **Barter, give first.** "You must offer goods to a culture first before you receive the equivalent value in barter." (A1503). Trading with pirates: "All goods offered by Pirates are stolen goods", "fly a white flag and be unarmed" to lower the risk of attack; protection money buys safety (A1503).
- **Warehouses.** Goods move by "market wagons" from makers to a "storeroom" in the market building or warehouse; more warehouses give more wagons (A1503). The player sees carts, not a table.
- **Anno 1800 Docklands**: "modular warehouse system and ... trade contracts to create a monopoly on your favorite goods" (W-A1800).

### 1.5 What makes trade satisfying or tedious (from the sources, plus the one flagged inference)

Satisfying, supported:
1. Range widens the loop: first the neighbours' specialties, later far goods that are cheap there and dear here (UWM Tips). Anno 1404 makes the far good a gate (W-A1404).
2. A person who advises: the bookkeeper (UWM). The decision stays yours, the arithmetic does not.
3. Your own trade moves the price (UWM price index), so a route is not a solved sum.
4. Investment returns something you can see: a specialty appearing in the market, a better yard (UWM Port Display).

Tedious, supported:
1. Scale: "increasingly difficult to manage as it grows" (W-PAT). Manual route setup was automated at "higher levels" (W-PR2/3) and UW offers Auto Sail; the genre's own answer to tedium is automation behind a skill or a rank.
2. Slow starts: PR2 "It can take a long time to earn enough money" (W-PR2, Computer Gaming World); PR3 "incredibly slow paced especially during the first few hours" (W-PR3, Midlife Gamer).
3. Money-management without play: Genesis New Horizons "an acquired taste due to the bare bones presentation and frequent money-managing" (W-UW, GamePro).

## 2. Town life

- **Growth by needs, shown on the thing itself (Anno).** "From the beginning your citizens demand consumer goods and public buildings. Fulfilling these needs allows your population to advance." You "click on a house" and see a "coloured field" for current needs and a "grey field" for upcoming ones, in two bars (goods, public buildings) (A1503). Five levels (Pioneers, Settlers, Citizens, Merchants, Aristocrats). "If their demands go unmet, the Aristocrats' houses eventually collapse." (A1503). Population "depends on the number of houses available, how well you supply your inhabitants with the goods they demand and how effectively you protect them against war and disease." (A1503).
- **Class ratios.** In 1404 "a number of peasants are required to support a moderate number of citizens who in turn support a number of patricians and noblemen" (W-A1404): the top is held up by the bottom.
- **Feedback without a number (A1701DS).** "The crowd in front of the office lets you see at a glance how happy the residents of your settlement are with you. If they cheer, you have really done a good job." The advisor "evaluates your actions as good or bad" through "his facial expression". A "question mark" symbol "only appears when the residents have a request or a problem." "Happy residents are happy to pay higher taxes!" (A1701DS). Early help ends: "You receive help until the end of the second civilisation level is reached." (A1503).
- **Events as settings, not as a calendar (A1701DS).** "Pirate attacks: none, rarely, medium and often" and "Disaster frequency: none, low, medium and frequent". Shelter buildings "protect the settlement from fire, disease or crime", and a fire station "must be within the fire station's radius ... and connected to it by a road" to put out a fire (FAQ). Events matter because there is a tool that answers them.
- **Anno 1800 attractiveness (W-A1800).** "With every factory the city's attractiveness rating falls". Tourists "will flock to natural land, local festivities, and various decorative ornaments, but dislike pollution, local unrest, and noisy or smelly industry." A town has a face that draws visitors.
- **Port Royale: the town is a story (W-PR3).** The trader path is the arc of a small, overlooked colony turned into a city, with a rival who gives gifts instead of helping. The same page names towns that "can be owned, built, developed or razed".
- **Uncharted Waters port state.** Port Data shows: fame in three kinds, gold, economy invested, industry invested, price index (UWM). Port Info shows a port's "relations with the six major European countries", allied above 75% support. Business hours vary by building: Harbor 24 h; Market 4:00-19:30; Cafe 3:00-23:00; Guild 4:00-19:00 (some digits OCR-garbled); Lodge 24 h (UWM Calling at Ports). "You will spend 30 minutes to an hour and a half per visit. Plan ahead where to visit as business hours differ." This is a town as a day's route.
- **Unfriendly ports and the night.** "If your friendship level becomes negative ... you may be denied entry into the country's allied ports ... if you find your entry into a port blocked by unfriendly officials, wait until it gets dark. Under the cover of darkness, you can sneak into the port, and even sleep in the lodge. You will be safe from the officials, and even be allowed to trade." (UWM, Your Relations with Countries).
- **Patrician.** Declines when goods are missing; thrives when supplied; ranks grow with "feasts", church and public-building donations (W-PAT).
- **Not in any source:** fire, plague, famine and blockade as scheduled town events in Port Royale or Patrician. The first pass listed them as [mem]/search summaries. Only Anno (A1701DS: fire, disease, crime, as protected-against disasters) and PR2/3 pirates against towns are in the text. The evidence for "events seen from the sea" is therefore HOIST's own design, not a borrowed one. (Already built in `harbours.js`.)

## 3. Exploration, discovery, and the long voyage (UWM)

### 3.1 Discovery and who pays

- **Three fame kinds**, with their sources spelled out (UWM, Seeking Fame):
  - Trade: increase allied ports for your country; "accomplish guild missions except for pirate hunting".
  - Piracy: defeat fleets; hunt pirates for a guild; collect debt for a guild.
  - Adventure: sell information to collectors and cartographers; discover ports and villages outside Europe; collect debt for guild.
  (Debt collection counts for piracy and adventure.)
- **Fame is the gate to rank and story.** "Fame is the key to raise your rank and reach your goal." "As your fame increases, you may be invited to the Palace by the king or governor-general and given a royal mission. When you succeed ... you will be awarded a new rank. There are nine ranks" (the OCR lists seven names: Squire, Knight, Baronet, Duke, Marquis, Earl, Viscount).
- **The Letter of Marque** is free, from the home country only, and needs "higher Fame in Piracy than in Trading and Adventure"; fighting rival fleets under it "will bring extra fame" (Palace). Tax-free permit, ask for gold, ask for a ship also sit at the palace; "Defect" is possible and "may prevent you from achieving your goal".
- **The cartographer** (skill Cartography: Seamanship, Knowledge and Intuition each above 75 to learn it): "Report new geographical discoveries ... Your reward increases as you travel farther." One contract at a time; "If you sign a second contract, your first contract will be automatically canceled." A warning built into the manual: "sign a contract with a cartographer as soon as possible before you start sailing outside Europe ... if you sign a contract after you've already discovered most of the world parts, you will not be able to raise your fame to a level high enough to succeed in your quest." Also "Locate": ask which area a treasure map shows.
- **The collector** (no skill needed, works for one collector): "According to the value of the discoveries (rated S, A, B, C), you will be paid reward. The reward for the same information varies from collector to collector, so sign a contract with a generous one." "Rumor: ask the collector if he has heard any rumors about exotic villages. He may give you a clue for your next discovery." Record Commands has a Discoveries list including "items which you have already reported to collectors".
- **Villages: one thing to find, and how you earn it** (Sea Commands, Go Ashore): "Search ... Every village has one thing to discover." "There are almost 100 discovery items ... about 50 items which appear randomly in each game." "Beware, you may discover an item so fascinating that your crewmen may insist that they stay in the village." "Entertain: ... will cost 2 barrels of food." "Rare items are hard to discover unless you entertain villagers repeatedly and earn their friendship and cooperation." "Plunder ... to seize food. You may lose some crew members if the villagers fight back. The villager friendship level ... drastically drop." "Wait at the shore to safely weather a storm ... Waiting will bring your friendship level back to 0."
- **Looking farther.** "Lookout: ... The more men you assign to Lookout, the further you can view at sea to discover ports and villages." A telescope also helps (Tips). The Cafe and Lodge give "port info", the waitress "tell stories": "Tell the waitress about your discoveries. If she likes your stories, she will become more friendly with you." "Give them precious treasures. They may help you find important clues." (Path to Success, Collecting Information). Stories are a social currency (cf. section 4).
- **Danger as a taught lesson.** "At the beginning of the game, don't attempt to sail outside of Europe. As a novice, it is highly likely that you will wreck and drown." "Load as much food and water as possible ... Go back to Europe periodically to report your discoveries." (Tips, For Adventurers). The loop is: out, find, back to report.

### 3.2 Provisions, health, scurvy, rats, loyalty

- **Lose conditions** (Victory and Defeat): flagship sinks or cannot sail; "You run out of provisions and lose the entire crew"; defeat in battle or duel. Unlike HOIST (empty never kills), UW does end the run by starvation.
- **Fleet data:** Water barrels, Food barrels ("Essential for a healthy crew"), Lumber ("Necessary to repair ships"), Gunpowder. "Hull durability ... Long voyages, storms, and battles will wear out the ship ... When the value drops to 0, the vessel will sink." "Crew health (0-100): Disease and rations will affect their health. You will start losing crew when this value drops below 20."
- **Days at sea.** Sea Display shows "Days Passed: Number of days passed since you've left the last port. Scurvy may spread among the crew after 50 days of sailing."
- **Rations.** "If the food supply is low, you may lower rations with the Commodore Command Crew-Rations." A choice between hunger and health.
- **Cures are items.** "During a long voyage, rats and scurvy may trouble the crew. So keep a cat and lime juice on board. A cat will catch rats and lime juice will cure scurvy. Rat poison also works as a temporary relief ... Your entire supply of rat poison and lime juice is expended when you use them." Also: "balm" for storm damage, rat poison, "lime juice", "measuring instruments", "telescope". Load "more food than water ... It's possible to find a spring on a shore to replenish your water supply."
- **Replacing a sick crew.** "If your crew is terribly weak from sickness or the lack of food and water, you may want to dismiss the entire crew at port and hire fresh, healthy crewmen. But ... you will not be able to hire many men at a port with a poor economy." (Tips). A port's economy sets how many men join; "recruit crew only once a day"; "More men will join you if the port economy is high and if you treat them first" (Cafe).
- **Storms.** "A storm will be the first challenge you will face. Install expensive figureheads ... to avoid most storms" (7 figureheads; "Expensive types provide better protection"). "Land at a nearby shore immediately and wait there until the storm calms down. Always stock some lumber in case you need to fix damaged vessels." Mate warns of an approaching storm.
- **Loyalty is a wage, not a mood.** Mates are "paid at the beginning of each month. Mates dissatisfied with their wage may become disloyal and resign, unless you raise their wage." Battle captains: "cowardly or disloyal captains may desert you and flee." There is NO crew-morale gauge in the manual. The first pass said "crew morale ... mutiny"; the manual has none (see section 6). The fortune teller can "find out the luck and loyalty of your mate" (50 gold).
- **Skills as specialists with prerequisites** (Mate Data): Celestial Navigation (Seamanship>80, Knowledge>80, Intuition>70, learned at an astronomer's house), Cartography (all above 75), Gunnery (Leadership>70, Knowledge>65, Courage>60 per the OCR), Accounting and Negotiation "cannot be learned" ("you will not know what skills a prospect has until he joins you"). Jobs: First Mate, Bookkeeper, Chief Navigator, Navigator; an asterisk marks those "well qualified".
- **Ports and permits (Your Relations with Countries).** Friendship goes down when you "defeat rival fleets" of another country and up when you win allied ports or fleets for your own. Negative friendship: entry may be denied; below zero with home you "may lose your rank or even your nationality". Embargoes: "diplomatic ties will be cut ... a blockade will be ordered and fleets from its rival country will be denied entry" (Guild, Country Info).
- **The round-earth society** and the **fortune teller** give "luck" (Study "will increase your luck"): small flavour/hidden stat actions at a cost.

### 3.3 Sea battles, briefly (UWM)

Out of scope for HOIST (turn-based, grid) except two ideas that touch it: "Destroying the flagship ... automatically allow you to take the remaining enemy ships into your fleet" if you have navigators to captain them (a capture needs a person to command it), and "All battles will end at 9:00pm sunset" and "You cannot start a naval battle at night" (night as a hard rule of the sea).

## 4. Sunless Sea and Dredge: dread, pressure and the loop

### 4.1 Sunless Sea (W-SS verified; the rest UNVERIFIED)

Verified in W-SS:
- "A survival/exploration role-playing video game with roguelike elements." Resources are got by "discovering new locations, trading goods across the Unterzee, battling ships and 'zee monsters', and completing 'storylet' quests."
- "Two modes: the player controlling the movement of the ship on the map ... and a story mode where the player is presented with several choices (sometimes accompanied by a skill challenge) in a card-like format." Islands each have "their own storylet quests". "To progress in the quests, the player has to provide an item or complete a skill check." Skills: Hearts, Iron, Pages, Mirrors, Veils. "Failing them may harm the player and prevent them from trying again for a period of time."
- "The ship movement is quite slow. This, accompanied by the music, creates an atmosphere of tension."
- Permadeath with legacy: "subsequent characters can inherit some of their predecessor's possessions, and a player may create a will."
- Goals are chosen ambitions ("becoming Fallen London's most celebrated explorer or amassing enough wealth to retire").
- Reception: Metacritic 81; "the writing and setting being the most highly praised"; RPS best writing 2014. Criticism (GameSpot 6/10): it attempts "to capture the sheer kinetic thrill of discovery in a bottle without the inevitable entropy of player completion depleting it, and falls well short." Sold 100,000 by Feb 2015, 350,000 by June 2018.

UNVERIFIED (memory; check against the fan wiki before using any number):
- Four pressures shown as bars: Hull, Crew, Supplies (food), Fuel; plus Terror. Terror rises from darkness (lanterns and lit ports calm it), from seeing horrors and from some events; high terror makes crew panic or mutiny; shore leave and some story endings lower it. Eating crew (and "unusual" supplies) is an option.
- Money is "echoes"; goods trade across the Unterzee with large price gaps between ports; stories and secrets and curiosities are sold or traded; "Mr. Fires"-type exchanges. Many items exist only to be handed to a person who wants a story.
- Day/night and lighting: a lantern radius around the ship; the dark at the edge is the threat. Terror is displayed as a gauge, not hidden.
- Criticism: harsh early game, grind of repeated trips, text-heavy, death resets.

Pattern that is solid regardless of numbers: out and back is driven by (a) things that run down (fuel, supplies), (b) a cost for staying away, (c) a payout that only exists when you return (stories and goods sold or told in port), (d) a place that is safe and lit. This is HOIST's existing shape.

### 4.2 Dredge (W-DREDGE, verified)

- Structure: "fishing, survival, and horror"; five archipelagos; "It follows a day-night cycle; the day is serene, while the night contains the game's horror elements".
- Time advances "whenever the player performs actions such as sailing or fishing."
- **Panic meter** (the sanity measure): "Staying out too long after dark or neglecting sleep causes the meter to rise, increasing the likelihood of supernatural events. As panic grows, rocks can appear suddenly in the water, crows may steal the player's catch, and massive sea monsters may begin pursuing the boat. The higher the meter, the more frequently these dangers occur." "Dredge features a game mode that prevents enemies from hunting the player."
- **Dread as design intent.** "The team deliberately designed Dredge to feel unsettling without depending on jump scares ... wanted to leave much to the player's imagination." "The team intentionally made daytime feel calm and inviting so that players would develop a false sense of security before being pressured into dangerous nighttime voyages." "At night, the music gives way to static-like noise." "A fog shader centered on the player rather than the camera." Monsters designed "for specific archipelagos and for the open ocean between them, gradually introducing these threats as players progressed."
- **Selling.** "When selling fish, players earn more money for aberrations and fresher catch." Aberrations are "fish with multiple eyes" and "human-like features". Fish are "each tied to specific times of day and environments" (128 species).
- **Story at the edges.** The main story is "further expanded through messages in bottles and quest descriptions" (diary entries by Julie). Characters "communicate through stylized vocal sounds" (no voice acting).
- **Inventory as a puzzle.** "Items are represented by icons of varying shapes and sizes, that the player can arrange to permit more storage." Upgrades via "materials and 'research parts'". Early versions used a plain upgrade list and "the developers ultimately found this approach unengaging".
- **What critics disliked:** the fishing "dull and repetitive" for some; the Tetris inventory "fiddly" (Push Square) though "most critics commended" it; "Several reviewers complained about the speed of the day-night cycle, considering the days too short"; "late-stage progression" imbalance; map "could have been incorporated as part of the HUD"; "some quests were on a timer"; "Multiple reviewers noted that the game is not difficult"; Lovecraftian elements "mostly present in the final stages" (GameSpot); a chase by a monster "faster than the player" was frustrating (PC Gamer). Praised: "balance of cozy and horror elements".

## 5. What critics and players disliked (all sources, one list)

| Game | Complaint | Source |
|---|---|---|
| Port Royale 2 | "passes the time, but gets old fast"; "somewhat slow to start. It can take a long time to earn enough money" | W-PR2 (PC Format; Computer Gaming World) |
| Port Royale 3 | "incredibly slow paced especially during the first few hours"; the trading overworld map dated; "plenty to do ... none of it was much fun" | W-PR3 (Midlife Gamer 6/10; GameSpot 5/10) |
| Port Royale 3 | The Metacritic average is 54 to 56 | W-PR3 |
| Patrician | Gets "increasingly difficult to manage as it grows" | W-PAT |
| Uncharted Waters (1992) | "flawed and repetitive game play ... one-dimensional NPCs", "user interface could bear improvement" | W-UW (CGW, Dave Arneson) |
| UW New Horizons (Genesis) | "bare bones presentation and frequent money-managing" | W-UW (GamePro) |
| UW III | Drastic changes (no story focus, new engine) "left players uncomfortable"; slave trade controversy | W-UW |
| Anno 1404 | "solid if unspectacular ... a straight-faced The Settlers" (CVG 6.1); achievement files with errors leave some unreachable; 316 achievements many hidden | W-A1404 |
| Sunless Sea | Discovery's thrill is "depleted by player completion" (GameSpot 6/10) | W-SS |
| Dredge | Repetitive fishing for some; days too short; timed quests; map not on HUD; not difficult; horror mostly late; fast chasing monster | W-DREDGE |
| New Horizons (manual itself) | Cartography contract signed after most of the world is mapped cannot raise fame enough: a built-in trap | UWM |

The pattern: slow openings, scale management, depleting novelty, and traps that punish late decisions.

## 6. Corrections to the first pass (`research_portroyale.md`, `GAMES_RESEARCH.md`)

Mark: CORRECTS (a first-pass claim is wrong or unsupported), OVERTURNS (the recommendation changes), CONFIRMS.

1. **CORRECTS**: "Fame is split into three tracks (trade, adventure, battle)" [mem]. The manual says **Trade, Piracy, Adventure** (UWM Seeking Fame), with exact sources of each. Piracy is not "battle": it includes hunting pirates for a guild and collecting debt. This changes idea 8 ("Three kinds of name: trade, sea and fight"): "sea" in HOIST would be adventure; "fight" is piracy.
2. **CORRECTS**: "Supplies (food, water, crew morale, scurvy) limit voyage length" [mem]. UWM has food, water, lumber, gunpowder, **crew health** (not morale; losing crew below 20), scurvy after "50 days" since the last port, rats, and mate **wages** as loyalty. No crew-morale gauge, no mutiny in the manual. HOIST's mood system is closer to Sunless Sea's terror than to UW.
3. **CORRECTS**: "Discoveries are paid in money plus fame, only once, and only when reported at the right port" [mem]. Closer: the collector pays by **rating (S, A, B, C)** and "varies from collector to collector"; the cartographer pays more "as you travel farther" and needs a **skill and a contract** (one at a time; a second cancels the first). "Only once" is supported only as "items you have already reported" stay listed. (HOIST's customs report already pays once.)
4. **CONFIRMS**: "Kings react to your highest fame category and hand out matching missions" (TV Tropes, secondary). Confirmed in a narrower form: the Letter of Marque needs piracy fame above the other two; rank missions come from the palace when fame is high enough.
5. **OVERTURNS (partly)**: "Rare finds paid once, then become known to rivals (UW)" (idea 22). No source says rivals learn of your finds. Drop the "rivals" half.
6. **OVERTURNS (partly)**: "Convoy automation avoided: keep trade manual" as a principle. UW's own manual advertises Auto Sail for "repetitive sailing on the same route", and Anno's answer to route UI pain is passive trading (A1503), not no-automation. The sources show tedium is handled by a **gate** (a skill, a rank) and by **waiting for visitors**, not by refusing automation. See idea 10 (flagged: owner decision).
7. **CORRECTS**: the claim that Port Royale 4 reviewers ("rudderless", "a few barnacles") support the Anno route-UI criticism. Those are search-summary quotes; W-PR4 is the wrong page, so PR4 stays UNVERIFIED. What is verified is PR2/PR3 slowness (W-PR2, W-PR3).
8. **CONFIRMS**: Anno needs shown on the home itself (first-pass candidate 1). Verified, with a better mechanism: coloured vs grey need fields on a house, a question mark over a house with a problem, a cheering crowd at the office (A1503, A1701DS). Those are UI symbols in Anno, so HOIST needs a physical translation (idea 1).
9. **CORRECTS**: "events like fire/plague/pirate blockade" attributed to Port Royale/Patrician [mem]. Not in W-PR1-3 or W-PAT. Only Anno carries fire/disease/crime, and settings for pirate and disaster frequency (A1701DS). HOIST's events are its own invention; that is fine, but do not cite PR as proof.
10. **CORRECTS**: PR2 "supplying a town ... draws other traders" is not in W-PR2; what W-PR2/3 say is "trade with towns to gain their friendship, and can then buy building permits". The friendship-then-permit gate is the verified one.
11. **OVERTURNS**: first-pass "Governors with favour: a letter of marque ... PR" as new. HOIST would add it, but the sources give a precise shape: UW's letter is **free** and gated by which fame is highest (UWM); PR's is a status in which lacking it makes you a pirate to everyone (W-PR2). Pick the UW shape (no coin, only deeds).
12. **ADDS**: the first pass never had the **night entry** rule (UWM), the **tax-free permit with a break-even** (UWM), the **price index that your own trade moves** (UWM), **search and entertain a village with food** (UWM), the **cat and lime juice** pair (UWM), and **Venetian free traders** (A1503).

## 7. For HOIST

Rules checked against every idea: wordless HUD (RULES 16), no game signs (RULES 11, 23), horror implied (RULES 1, 2), procedural (RULES 24), dread by place not by time (CANON), a wrong thing happens once (RULES 8), nothing locked (RULES 13). HOIST already has (do not rebuild): stores in days, mood bands in words and work, night nerves, harbour plenty (-2..3) read in the quay/market/tavern, seeded events (fire, fever, blockade, feast), customs report, lifeline job, weekly price drift, made/wanted multipliers, luxury at plenty 2+, found spices, standing per water, specialist hands, the Toll, raiders and parley, figureheads.

Ranked by fit and size. Effort S (a day or less), M (a few days), L (a week or more).

### 1. The empty hook: a harbour's need is a missing thing (S/M)
- Source: Anno need fields on a house, coloured now and grey later (A1503); question mark over a house with a problem (A1701DS); first-pass candidate 1.
- Today: `WANTS` (crown wants coir, free wants cloth, reef wants salt, lantern wants rum, home wants glass) is told only by price and by a rumour on the pier (`tradeRumour`).
- In HOIST: the harbour's wanted good is **a gap in its own scenery**. A rack by the quay with a coil of coir missing and a bare hook; a salt-pan with empty baskets; a lamp-glass window with one pane out. When the player has sold the want, the hook fills over a few days. Wordless, no sign, readable by anybody who has once seen it hung. The Anno colour bar becomes the amount of gap.
- Why it fits: the player learns the world by looking, as with plenty (`world.js harbourState`). In the deep, the gaps are wrong things: a hook with something on it that is not for sale (the "bright reading first" is the missing cloth; the second look is what hangs there).
- Cost: a new prop set per region in `harbourlife.js`/`world.js`, reading `WANTS[region]` and a per-harbour `filledDay` in `state.story`. Needs the `design` agent for the look.

### 2. Your trade moves the market, and the quay shows it (S)
- Source: "General Price Index ... rises as you buy goods, and falls as you sell goods at the port" (UWM, Port Display). Anno passive trading: price bar colour tells whether it is acceptable (A1503).
- Today: `sellAll` takes the whole stack at a flat `SELL_CUT = 0.9`; drift is weekly and random; no depth.
- In HOIST: each crate sold in a harbour lowers that good's price there by a few percent (`price()` gets a per-harbour `depth[good]` that decays over days); each crate bought raises it. Selling four crates of rum into the Guild's want pays a little less per crate than the first; two trips later it has recovered. The quay shows it: crates the player sold stand stacked on the pier for a while (they leave as the depth recovers). No number.
- Why: removes the single solved route without adding a menu; the satisfaction source in section 1.5 (3). Also makes `tradeRumour` stay meaningful after the player has fed one market.
- Check: `scripts` and `econ.js` (the econ meter) so earnings per hour do not jump; keep the cut small (tune by hand, UNVERIFIED target around 3-5% per crate, recover in about 5 days).

### 3. Rated finds, and a buyer who pays by distance (S)
- Source: collector pays by rating S/A/B/C and "varies from collector to collector"; cartographer reward "increases as you travel farther" (UWM). Trap: late contracts capping progress (UWM); depletion critique (W-SS GameSpot).
- Today: customs report pays flat (`PAY`: island 5, wreck 25, sketch 10) and only at Crown harbours.
- In HOIST: the pay of an island or sketch scales with how far from the reporting harbour (in units, `etaText` scale) it lies, and sketches count by what they show (a plain gull: low; a thing from the deep sea: high). Other waters buy other things: the Guild pays for a wreck's lamp-glass or oil tender, the Cays for curiosities, the Reef asks no questions and pays for wrecks only. "The reward for the same information varies" gives a reason to carry finds to a particular harbour.
- Guard against depletion: pay by distance, so finds far out remain worth more even after the near ones are written; no contract lock-in (the UW trap).
- Why it fits: no new UI; it extends `reportDue()` only. The late "same finds, already entered, in your own hand, dated next week" beat stays untouched.

### 4. Search the island: one thing, found by feeding them (M)
- Source: "Search ... Every village has one thing to discover", "about 50 items which appear randomly in each game", "Entertain ... will cost 2 barrels of food", "Rare items are hard to discover unless you entertain villagers repeatedly", "Plunder ... friendship drastically drops", and "your crewmen may insist that they stay in the village" (UWM).
- In HOIST: at an inhabited isle's pier the captain can leave a share of food (a day's food from `stores`, matching `STORE_BURN`) on the quay. The islanders come down; on a second visit they show one thing (a seeded find per village: a carved float, a pattern, a song for the shanty list, a fruit not seen). Taking food from them (a raid) is not offered: the Cays would hear it (standing `-`). The crew's "stay in the village" becomes `hands.js`: a specialist can ask to be left on a feasting isle once, at high mood; they are met again later. In the deep, the villagers come down only to look at the ship.
- Why: it turns stores (already a pressure) into a gift, links cosy generosity to discovery, and gives `reportDue` and the Ship's book something found by kindness. It is not a marker (RULES 11): the one thing is found only on the second feeding.
- Cost: a per-village find table (procedural), a food-for-find rule in `systems/interact.js`, a line in `logbook.js`. Writer drafts for the finds (RULES 4).

### 5. The long way: days since a harbour, a cat, and green things (M)
- Source: "Days Passed ... Scurvy may spread among the crew after 50 days of sailing"; "Crew health ... You will start losing crew when this value drops below 20"; "keep a cat and lime juice on board. A cat will catch rats and lime juice will cure scurvy"; "lower rations" (UWM). Also "More food than water ... find a spring".
- Today: `voyage.js` has stores in days (max 6) and a mood scale; empty stores never kill; nothing counts "days since land" and the cat does not exist.
- In HOIST: add one quiet number in `state.story.voyage`: days since a harbour or a fruit. After a long stretch (tune: about 2x `STORE_MAX`, so 10-12 days; UW's 50 is relative to a world where sailing took months) one hand "keeps below". The signal is wordless: one fewer figure at the rail, Mara says one short line (RULES 7), the Ship's book "Crew" section reads "one is sick". Fruit picked or a harbour clears it over a day. `FRUIT_FOOD` already exists; give fruit a second job. The rats: some days a barrel is found gnawed (stores lose a fraction) unless **the ship's cat** is aboard.
- **The cat** is a found/gifted thing at a cosy harbour (a kitten from the tavern). Bright reading: a cat on the rail, mice gone. The second look in the deep: the cat will not go below; it sits facing the dark water at night when nerves are up; after the first throw it is gone one morning, once (RULES 8) with no remark. It also gives a cosy item the player grows attached to, which makes the loss land.
- Why this and not mutiny: the sources show no morale gauge; they show a physical cause with a cure the player can carry. That keeps HOIST's "empty never kills" rule but gives the long voyage a second clock (days from land) next to stores.
- Cost: M for the sickness and cat; the `audio` agent for the cat. Needs an owner decision on the cat's loss (canon).

### 6. The back door at night (S)
- Source: "wait until it gets dark. Under the cover of darkness, you can sneak into the port, and even sleep in the lodge ... even be allowed to trade." (UWM, Your Relations with Countries). The first pass asked for recoverable mistakes (Patrician).
- Today: at the very bottom of standing, "an empty quay: nobody takes your line until what is owed is paid" (`standing.js`).
- In HOIST: a refusing harbour at night shows one lit window and a person at the end of a side jetty (not the main pier, RULES 24c). E there gives a market of three goods at +30% and no jobs, no tavern, no yard. It does not restore standing; paying what is owed still does. Dark windows are the normal sign at night, so the one lit window reads naturally.
- Why: another way to recover without a menu; uses time of day already in the game. Dread by place, not time, is kept because it is a harbour rule, not a dread rule.
- Watch: the demo (RULES 29) never needs it; keep it to the full game.

### 7. Three names, derived from deeds already counted (M)
- Source: Trade / Piracy / Adventure with their sources (UWM Seeking Fame); Letter of Marque needs piracy fame highest (UWM Palace); royal missions on high fame (UWM).
- Today: `state.stats` (trades, sunk, treasures, discovered) and `standing` per water exist; hands unlock by single deeds (`hands.js`); no summary of what kind of captain the player is.
- In HOIST: not a number; three tallies that are derived, never stored as a score: **trade** (crates sold, deliveries, `stats.trades`), **sea** (isles, wrecks, sketches, `reportDue` totals), **fight** (raiders struck or sunk). What changes: the Crown's board offers a letter of marque only when fight is highest (raiders of the Crown leave the Gull alone, the Reef's do not, as the first pass said; the sources add that it is free); the Guild offers a lamp-relight errand when sea is highest; the Cays offer a regatta slot when trade is highest. Taverns remark once ("they say you take ships" in Cays/Reef; "the one who writes the charts" at the Crown). One slip line by `etaText` rules.
- Corrects the first pass naming (section 6, item 1).
- Why: it makes different play styles read in the world without a stat. Cost M because it touches `jobs.js`/`ui/harbour.js` offers and needs a writer pass.

### 8. Gifts to the harbour, with a break-even permit variant (M)
- Source: invest "1 to 50,000 gold per month" in a market/yard to raise economy and support (UWM); Patrician's "donate to the church, donate public buildings, feasts" (W-PAT); the tax-free permit with a break-even, "if you do not trade often, the permit may be too costly" (UWM); PR2 friendship then permits (W-PR2).
- Today: plenty rises with deeds, visits, deliveries, sales, help; there is no way to spend money to help a harbour. Gold sinks are upgrades and stores.
- In HOIST: a small standing set of **gifts** at the harbourmaster's board, one a harbour: a lamp for the pier, a bell, a new bench at the quay, a second jetty boat. Each costs gold (a few stages of 20-60), adds `helped` weight to plenty, and appears in the world for good. A neglected harbour keeps the lamp but it is unlit; in dread water the gift is found already fallen (the same wording rule, no explanation). Variant: **the Crown's seal**, a season pass sold at the Customs House: for N days a Crown water charges less at markets; wordless as a stamped tag on the hold's crate. Priced so it pays only for a captain who trades often.
- Why: a visible, permanent, cosy gold sink; gives the economy a place to put surplus without a bank menu. Keeps UW's decision (is the permit worth it).
- Watch: tuning with `econ.js` (the economy meter) so gifts do not become compulsory.

### 9. A free trader sails the water (M)
- Source: Venetians, "free traders ... stop by at regular intervals to offer or buy selected goods ... unique flags ... the only culture that can trade without a Trade Agreement" (A1503); Anno passive trade "wait for travelling trade ships" (A1503); Anno 1404 automatic trading for visiting ships (W-A1404).
- Today: `traffic.js` has ships; trade is only at harbour markets.
- In HOIST: one named wandering peddler per region (a flag the player learns, a slow sail) who can be hailed under way for one good the region does not make (a way to buy a far crate without a long run), at a premium, once per sighting. When hailed, the same boat does not sell coin things: cloth, rum, glass. In the deep, the peddler is seen far past any harbour, with the same flag, with the same crates, and sells without wanting coin (it takes something from the stores). Nothing explains it; the only change is where it is.
- Why: sea life that carries the economy (RULES 24c: sparse, harmless, nothing solid); gives a reason to look at flags.
- Cost: M (a traffic ship type with a hail action in `systems/interact.js`); the `design` agent for the sail and flag.

### 10. Mara takes the helm on a lane you have painted (M, needs owner decision)
- Source: Auto Sail "convenient for repetitive sailing on the same route" and gated by a first mate with Celestial Navigation (UWM); the first pass called route UI the most criticised thing in Anno (UNVERIFIED).
- Today: manual sailing; "E works under way" (RULES 18); HOIST's trade is manual by design.
- In HOIST: a captain who has sailed a lane between two harbours (the chart paints it: "painted means sailed", RULES 23) can ask Mara to take the helm on that lane only. The ship follows the painted line at the wind's pace; the captain may leave the wheel but not the ship's weather (storms, raiders, night all give the helm back). It is refused in dread water (above about 0.55) and at night after the first throw. The time passes at the cost of nothing but a hand's attention (a hand must not be sullen). Accounting for what UW proves: automation was an optional gate, not the main loop.
- Why: tedious repeated crossings are the genre's complaint; sailing is the game's joy, so this must stay optional and must never run the deep.
- Conflicts: `docs/RULES.md` has no rule forbidding it, but `CANON` and `SYSTEMS_FEEL` favour hands on the wheel. Ask the owner before building; keep it for a later phase.

### 11. Fresh and wrong catch at the fish buyer (S)
- Source: "When selling fish, players earn more money for aberrations and fresher catch." (W-DREDGE).
- Today: `fishing.js`/`fishart.js` exist; fish go to stores (`FISH_FOOD`) and possibly sale.
- In HOIST: a fish sold the day it is caught pays more; the third-day fish pays less. A wrong fish (a creature log entry from the deep) pays far more at a harbour of the Reef or Lantern, and the buyer says nothing, takes it, and does not look at it. Eating one is possible and raises mood once, with Mara's one line. The cosy loop (catch, sell on the quay) and the second look (what the buyer wants).
- Why: gives fishing a loop with the harbour and a pull toward deeper water without a marker. Cost S if sale exists; M if it does not.

### Considered and set aside
- **Shaped hold** (Dredge's arrangeable inventory, W-DREDGE): critics liked it and some found it fiddly. A grid hold for crates and "things that will not fit" is strong for horror (an object with an odd shape that fits nowhere), but it is a new UI and a rework of `HOLD`. L. Only if the owner wants an inventory identity; do the plain hold first.
- **Bank with 3% deposits and 10% monthly loans** (UWM): the monthly interest rate is a money-management menu (the thing GamePro disliked). A debt that something calls is nice horror, but HOIST already has "what is owed" at refusing harbours. Skip.
- **Mate wages monthly with loyalty** (UWM): a chore. HOIST's hands already leave when the crew is sullen.
- **Terror gauge shown as a bar** (Sunless Sea, UNVERIFIED): breaks the wordless HUD (RULES 16). HOIST already shows nerves by things seen at night.
- **Panic as time-driven danger** (Dredge): Dredge ties dread to time out after dark; HOIST ties it to place. Do not copy.
- **Unlocking a market by the player's Orient goods** (Anno 1404): HOIST already gates luxuries by plenty and spices by place; adding a hard ceiling on harbour growth would punish a cosy player.
- **Hidden achievements** (Anno 1404: 316, hidden, some broken): contradicts "no game signs".

## 8. Method notes

- Wikipedia: the API was used with a descriptive agent and gaps over 10 s, but returned a rate-limit message for every request after the first successful pages. Not fetched: Patrician IV, Windward. Nothing in this file cites them.
- UWM is OCR with errors (some digits and labels are garbled; the manual itself notes that an astronomer's house and a strategist's house reuse the cartographer's and collector's pictures). Numbers quoted above were cross-checked against the words around them; the ones that are doubtful are marked "per the OCR".
- Everything marked UNVERIFIED should be confirmed on a Sunless Sea fan page before use.
- No other file was edited and nothing was committed.
