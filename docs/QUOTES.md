# Pocket Pirates: lines and quotes

Everything the game says, sorted by where it appears. Section 2 lists the odd demo lines added later; they
are all in the game now. Pure instructions (tutorial text such as "press E to dig") are left out.

Dread stages: **0** sunny, **1** off, **2** wrong, **3** eerie, **4** cosmic. The demo stays within the
0-2 range, so the new lines are odd but never spoil the story. They do not name the Eye, the Lady, the
ledger or anything below the sea. Everything should just feel slightly off.

---

## 1. In the game now

### Mara: remarks (one-off, triggered by events)
- *Stage 1:* "Is it just me, or has it gone very quiet out here?"
- *Stage 2:* "The gulls are watching us. I mean really watching us. Please tell me I am imagining it."
- *Stage 3:* "I keep hearing something humming under the keel. Do you hear it?"
- *Stage 4:* "Captain... how long have we been sailing? I cannot remember the name of my own village."
- *Odd catch:* "That one looked back at me. Throw it in the sack."
- *Red sky:* "Red sky tonight... my gran said that means a blow is coming."
- *Fog wall:* "That fog is like a wall, Captain. Whatever is out there can wait for us."
- *Rain:* "Rain. Good for the water barrels, bad for the view."
- *Storm:* "That sky looks angry. Maybe find a harbour, Captain."
- *Storm delivery:* "Delivered in a storm? They will pay extra for that. People are nicer when they are wet."
- *New crew hand:* "A new hand! They do not talk much. Neither do you. You will get along."
- *Volcano:* "Smoke on the horizon! Either a volcano or a very big breakfast."
- *Atoll:* "Look at that water inside the ring. I could swim there all day."
- *Mangrove:* "Mangroves. Mind the roots, Captain, they grab keels."
- *Village:* "A village! Fresh bread, gossip and somewhere to sleep."
- *Morning after the tavern:* "Morning, Captain! Fresh bread, fresh wind. The hull is patched, too."
- *First hut visit:* "I did not like that, Captain. She never blinked. Not once."
- *Third bad throw:* "Three times now. Captain... what is she writing down?"
- *Wish fulfilled:* "Look at {crew}. I have never seen anyone smile with only their eyebrows before."

### Mara: the chapters
- "Morning, Captain! I am Mara, your first mate, and this is the Merry Gull. She is small, but she is ours."
- "Welcome to Tama! Old Perrin left something for you with the harbourmaster."
- "Ha! Treasure! A captain with gold in the hold is a captain with options."
- "A fine start to a map. Perrin would be proud. Probably. Nobody has seen him smile."
- "He was right. About everything. Captain... nobody has ever charted that island. Nobody."
- "There are more bottles in the water out here than there used to be. Somebody has a lot to say."
- "They all mention the same thing. A hut. Who writes about a hut?"
- "I would rather not go there. But you are the captain."
- *Hint in chapter VI:* "Look at the chart. Was it always there?"
- *The hut appears on the chart:* "Captain... was that hut always on our chart? I did not draw it. Did you draw it?"

### Mara: full dread (she breaks)
- "Captain, I c-c-can't remember which way is home. Can you?"
- "We have always been sailing here. Haven't we? Haven't we."
- "Who is steering? Who is steering? Who is st"
- "The crew keeps counting to eleven. We only have nine."
- "I see you, Captain. I see you seeing me."
- "Mara is not here right now. Please leave a message after the tide."
- "Don't look at the water. It looks back. It looks back. It"
- "What was your name? I wrote it in the log and the ink moved."
- ". . . . . . . . . . . ."
- "turn back turn back turn back turn back turn back"
- "The stars are not where I left them."
- *Instead of a hint:* "Mara does not answer. Her hat is lying on the deck." / "Mara is staring at the horizon and will not turn around." / "Someone answers in Mara's voice, from below the deck."

### Harbour gossip (by stage)
- **0:** "Welcome to {harbour}, captain! Fair winds today!" · "Fresh fish, fresh rum, fresh rumours! Take your pick." · "Folk say there is treasure on the little isles to the north-east. Folk say a lot of things."
- **1:** "Funny. The gulls went quiet this morning. All of them, at once." · "Old Perrin's cat will not look at the sea any more. Won't even blink." · "Same tide as yesterday. Exactly the same. Down to the ripple."
- **2:** "The lighthouse lit itself last night. Perrin was very calm about it. Too calm." · "We ran out of fish. The nets come up full, but we ran out of fish." · "Have you been here before? I could swear I've served you. Tomorrow."
- **3:** "Don't look at the water after dusk. Not for long. Not at all." · "Everyone left. I stayed to keep the lamps lit. Someone has to. Someone is always watching." · "The stars are wrong. I counted them. There are more every night."
- **4:** "...you can hear it too, can you not? Under the keel. Humming." · "It is not angry. That is the worst part. It is only very, very patient." · "Welcome home, captain. We saved your seat. It was always your seat."
- *Chapter V (about the hut):* "The black hut? Out past the {direction} water. Do not sit down. Whatever she offers, do not sit."
- *Greetings:* "A new face. Welcome!" · "Back again, captain!" · "Our favourite captain! Your usual discount, of course." · *(stage 3+)* "We remember you. We always remember you."

### Harbour greetings (src/greetings.js)
All the greeting lines live in `src/greetings.js`: by speaker (fisher, net-mender, fish-stall woman, child,
harbourmaster, docker, old salt, innkeeper, fiddler, lamplighter, night watchman), by hour, by weather and by
dread stage. A few:
- *Fiddler:* "I know one song. Every night it is a little longer."
- *Harbourmaster:* "Berth three is free. Berth four is free. Do not use berth five."
- *Lamplighter:* "Some nights the lamps light before I reach them. Saves me the walk."
- *Watchman:* "I walk the pier till dawn. The pier is longer at night. I have measured."
- *Fog:* "In fog like this you hear the bell from the old belfry. We have no belfry."
- *Stage 2:* "My reflection waved first today. I waved back. It seemed polite."
- *Stage 3:* "Your ship came in last night as well. We waved. Nobody waved back."
- *Stage 2+, sometimes:* someone on the pier, and only ". . ."

### After a throw at the hut (the pier knows; src/greetings.js)
- **2-9:** "Bad luck travels fast, captain. A three, was it?" · "Heard it came up seven. Nobody told me. I just heard." · "You threw a four last night, did you not? The fish knew before we did." · "Six. Hm. Well. Nobody blames you. Not yet." · "The tide came in seven minutes late this morning. Funny number, seven."
- **10:** "Ten. Nothing at all. She almost smiled, did she not?" · "A ten, they say. Neither here nor there. Like the rest of us."
- **11-16:** "Heard you threw a twelve! The whole pier slept well." · "A fourteen, they say. Good. Good. Keep doing that." · "Calm night, thanks to you. Eleven, was it? Lovely number."
- **17-19:** "Eighteen! The nets came up singing this morning. That was you, was it not?" · "Somebody threw a nineteen and the whole sea went soft. Was that you, captain?"
- **20:** "Twenty. You could hear the whole sea let its breath out." · "Twenty! The old women in the market are crying. Good crying, mostly."
- **1:** someone on the pier: "One."
- *Mara, after the first throw:* "Captain. The bottle. It said seven. How did it know it would be seven?" · "Captain... is the water thicker? It looks thicker." · "Nothing happened. Why does that feel like something happened?" · "Is it me, or is the sea in a good mood all of a sudden?" · "Did you hear that? Like the whole sea sighed. In a nice way. I think." · *(after a 1)* Mara does not say anything for a long time.
- *Bottle (chapter V):* "She has a book. My name is in it now. Twice. She let me throw once. It came up seven. It will come up seven for you too. - R."
- *Prices:* "Prices are up today. Nobody says why." · "Prices are down today. Everyone seems to have slept well." · *(haggle, natural 1)* "The fishmonger spits on the planks. By noon the whole harbour has heard."
- *Hut:* "There are three candles now." · "There are more candles than you can count. The book is open near the end."

### Village customs and the week (src/greetings.js)
- *Whitewash:* "We paint the houses every spring. White walls, blue roofs. Always have." · *Lamps:* "The lamps stay lit all night here. The rule is older than the lamps." · *No children:* "Children? No, not here. Not for a long time. More tea?" · *Choir:* "Stay till dusk, captain. We sing at dusk. Everyone sings." · *Night boats:* "We fish at night here. The fish are braver in the dark. So are we." · *Kites:* "My kite is the red one. No, the other red one." · *Bells:* "You will hear the bells at noon. Twelve, every day. We count."
- *Market day:* "Market day! Everyone is buying, nobody is listening. Perfect." · *Festival:* "Festival today! Eat something. Dance something. Do not ask what the songs are about." · *Lantern night:* "Lantern night. We set them on the water and let them go. They come back, mostly."
- *Mara:* "Market day, Captain! Every harbour pays a bit more for what we bring in." · "Lantern night tonight. They set little lights on the water. I always want to follow one."

### Shipwright
- **0:** "Best timber this side of the reef, captain." · "Fair prices, fair winds."
- **1:** "Odd. The planks came in already cut. I never ordered them."
- **2:** "The hull creaks in a rhythm now. Like breathing. Don't mind it."
- **3:** "Take what you need. I'll stay and mind the lamps. Someone has to."
- **4:** "Upgrade it all. It will not matter, but it will be a comfort."

### Messages in bottles
- **0:** "Dear finder: the fishing is wonderful at Port Tama. Come for the rum, stay for the sunsets. -M." · "If you read this, you owe me a drink. I threw it from a very nice boat." · "Day 12. Spirits high. We have named the parrot 'Admiral'. It disagrees." · "To whoever finds this: the best treasure is the friends we sail with. Also a chest of gold on a small cay, north-east. Mostly the friends."
- **1:** "Day 20. The gulls have stopped following the boat. Cook says it's the weather. There is no weather." · "Same sunset three nights running. Everyone agrees. Nobody minds. That bothers me." · "We counted the crew this morning. Eleven. We are ten. Please advise."
- **2:** "The compass points at the water now, not north. Down. We have stopped looking at it." · "Do not trust the harbour lights after midnight. They know your name already." · "The fish have started to look at us. I want to be clear: they are looking at us."
- **3:** "I have been writing this note for nine days. It is the same note. I think I am the bottle." · "Dont follow the singing. It is not coming from the water. It is coming from underneath the water." · "The stars are doing something. Please tell me you can see it too."
- **4:** "y o u  a r e  n e a r l y  h e r e" · "We are not lost. We have always been exactly here. It was the sea that moved." · "Turn back. Or do not. It has already decided and it is not unkind about it."
- *Chapter V (the hut notes):* "If you find the black hut, do not sit down. I sat down. - R." · "She has a book. My name is in it now. Twice." · "Third bottle I have thrown. The hut is not where I left it. The hut is exactly where I left it."

### Old Perrin
- *Chapter IV note:* "Be a dear and check my chart. {island}, {direction} of Tama, should have {detail}. Nobody has been there to tell me, so I need eyes. Bring back my compass if you find it. It's the one that's wrong."

### Passengers
- **Old Wendel:** "I mended nets in Tama for forty years. Never once caught a fish myself. Did not like the look in their eyes." · "My wife said the sea gives back what it takes. She has been gone eleven years. I am still waiting." · "You hold the tiller like my brother did. He was terrible at it too."
- **Pippa Fairweather:** "Master Perrin sends his maps by bottle now. Nobody has seen him hand one over in years." · "I drew this coast three times. It came out different every time. The coast, I mean. Not my drawing." · "Did you know islands have handwriting? You can tell who drew them by how they curl."
- **Brother Ansel:** "We keep the lamps lit so the ships can find the harbours. And so the harbours can find the ships." · "Count the lighthouses on your way. Then count them on your way back. Tell me if the numbers match." · "The oil smells of the deep. We do not ask where the guild gets it."
- **Mags & Tully:** "Tully says I talk too much. Tully, I do NOT talk too much. See, captain? She is not even listening." · "We are visiting our cousin. She owes us a goat. It is a long story. The goat is longer." · "Best fish soup in the islands is at the far harbour. Worst too. Same pot."
- **Captain Ruy:** "Lost mine to a whirlpool off the Pearl Banks. Sail round them, never through. Never." · "Raiders fly black flags but sail red hulls. If you see red at dusk, put out your lanterns." · "A good crew is worth more than a good ship. Yours seems... spirited."
- *Treasure hint:* "My grandfather swore there was gold buried on {island}, {direction} of here. Mark it, if you like. I never had a boat."
- *Uneasy (high dread):* "The water is so quiet here. Is it always this quiet?" · "I keep hearing my name from under the hull. Probably just the planks. Probably." · "Please do not stop the ship out here."
- *Seasick:* "Captain, I think my breakfast wants to go home before I do." · "Is the ship supposed to lean like this? Do not answer that." · "I will pay double if you make it stop. I will pay triple. I have no more money but I will pay it." · *Mara:* "Lean over the downwind side. The OTHER side!"
- *With Mara:* "Is she always this cheerful?" / "Always! Even in storms. ESPECIALLY in storms." · "Does the captain ever speak?" / "Only in emergencies. And knots. Very expressive knots." · "This ship is smaller than it looked from the dock." / "She is cosy! Cosy is a feature." · "Is that fish hanging from the mast for luck?" / "For lunch. Luck was yesterday's fish." · "How long have you sailed together?" / "Since forever! Well. Since Tuesday. Forever-ish." · "I think a gull just stole my hat." / "He does that. We call him the Quartermaster."

### The dark hut
- *Entering:* "A table too big for the hut, one candle, and a chair on the far side, deep in the dark. Something there breathes, slow and patient. A yellowed twenty-sided die waits on the wood."
- *Before chapter V:* "Nobody answers. Inside, a pen scratches, then stops."
- *Already thrown today:* "The die is gone from the table. She is writing. Come back tomorrow."
- *Win:* "She pushes something across the table without looking at it." · "A dry little laugh. She pays." · "She nods once, as if this was always going to happen."
- *10:* "She almost smiles. Nothing happens. That is somehow worse."
- *Lose:* "The lady in the hut does not say anything. She writes something down." · "She does not say anything. Somewhere under the floor, something turns over." · "The lady does not look up. The candle leans toward you." · "She says nothing. You are sure she said your name."
- *Trinkets:* a tooth with a tiny ship carved into it · a fishbone needle · a jar of very old sand · a black pearl that is warm · a knot of hair tied in a sailor's hitch
- *Demo end:* "TO BE CONTINUED. The die is back on the table. Somewhere, a pen is still writing."

### Encounter cards
- **A Floating Chest:** "A sea chest bobs past, iron-bound, still locked." → "Heavy, wet, and full of coins." / "It swings into the hull on the way up. The chest sinks. The dent stays." / "It turns slowly and drifts off. Someone else's luck."
- **A Stowaway:** "A small face peeks out from between the fruit crates." → "They scrub the deck and find a purse wedged in the planks. They keep the button." / "At the next wave they are gone. So are {n} gold." / "They eat like a gull and fall asleep on the rope pile."
- **A Peddler in a Dinghy:** "An old peddler rows alongside, rattling a tray of oddments and folded maps." → "You pay {n} gold for a map that turns out to be a fish recipe." / "He rows away, singing about money."
- **A Squall Line:** "A wall of grey rain stands across your course, and the wind behind it is fast." → "You come out the other side flying." / "The squall slaps the ship flat for a long second. Planks complain." / "A long way round. Dry, at least."
- **A Castaway:** "Someone on a raft, waving a shirt on a stick." → "{name} climbs aboard, drinks a whole bucket of water, and picks up a rope."
- **A Silver Shoal:** "The water boils with little fish all around the hull." → "The shoal turns as one and is gone. The nets come up with one boot." / "They flash and turn like thrown coins. It is very beautiful."
- **Sails on the Horizon:** "Red hulls, black flags, far off. They have not seen you yet." → "They dip their flag at your merchant pennant and sail on. Rude, but harmless." / "One shot, long range, through the rail. Then they lose interest."
- **A Patch of Glass:** "The sea goes perfectly still in a circle around the ship. Something is singing under it." → "You hear the words. You do not remember them, but you have a shell in your hand." / "For a second the sky is the wrong way up." / "Mara rows hard and does not look over the side."

### Tavern, rest and the sea
- *Dice:* "{local} slides two coins forward and grins. First to 30." · "{local} rolls a one and swears at the table." · "{local} pushes the coins over with a sigh."
- *Locals:* a one-eyed net-mender · the harbourmaster's aunt · a sunburnt docker · a very calm child · a fisherman who smells of tar
- *Haggling:* "The fishmonger laughs and gives in." · "The fishmonger folds their arms. Prices just got worse."
- *Crew looks:* missing two fingers · humming all the time · with a parrot that does not talk · very tall · barefoot, always · with a tattoo of an eye · who never blinks first
- *Sleep:* "You sleep like a stone. Gulls wake you at dawn." · "Somebody snored all night. Possibly you." · "You dream of warm water and wake up hungry."
- *Sleep (dark):* "You sleep. Someone sat by your bed all night; the chair is still warm." · "You wake at dawn. Your boots are wet, and full of sand you do not recognise."
- *Hailing refused:* "The crew glances at you and looks away." · "A sailor waves you off. They are not in the mood." · "The captain pretends not to hear you." · "They hoist a little more sail and leave you behind."
- *Fog wall:* "The fog is a wall here. Somehow the bow always ends up pointing home."
- *Time loop:* "You have been here before." · "It is this exact moment again."

### Odd things in the hold
- *Dark loot:* A jar of teeth · A map of somewhere that is not here · A conch that whispers your name · A coin with two faces, both yours · A lantern full of dark · Seaweed that remembers · A drawing of the sea, from underneath · A key to a door you have not found
- *Dark barrels:* barrel of black water · crate of teeth · barrel that hums · sack of wet stars
- *Dark cargo:* a sealed jar (do not open) · a letter in a language nobody speaks · a crate that is slightly too warm · a bell with no clapper · a box that has stopped ticking · a lantern, unlit, heavy
- *Memories on the line:* Your own compass (It points at you.) · A letter in your handwriting (You have not written it yet.) · Mara's hat (It is dry.) · The fish you caught yesterday (Still alive. Still looking at you.) · A key to your cabin (The lock was changed long ago.) · A small wooden ship (It is the Gull, carved by someone who knew it well.) · A lantern, still lit (Underwater. For years.)

### The HUD lies (full dread)
- *Place names:* TURN BACK · it is behind you · HOME? · you were never here · THE EYE · the same water · here · Harbour T̶a̶m̶a̶
- *Gold:* ??? · they count it too · 0 · ∞ · not yours
- *Tracker:* Find your way home · There is nothing to deliver · Keep sailing · Look behind you
- *Chart:* Here · Where you drowned · Tama? · The Last Harbour · Your Island · Nowhere · The Eye

---

## 2. Odd lines for the demo (in the game)

Slightly wrong, never explained. Mara's musings come at most every 4-7 minutes on a quiet stretch once the sea
feels off (dread 0.2-0.7, no passenger aboard), each only once. The three passengers have two more lines each
in `passengers.js`; the cards are in `tabletop.js`.

### Harbour gossip, stage 0 (cheerful, with one odd detail)
- "Lovely weather. Been lovely for a while now. Nobody can say how long."
- "Try the fish stew. Nobody knows who makes it, but it's always hot."
- "Our lighthouse keeper retired. The light still comes on. We think he forgot to tell it."
- "The tide brought in a rowboat this morning. Dry inside. Oars neatly stowed."

### Harbour gossip, stage 1 (something is off)
- "My neighbour's dog barks at the sea every evening at the same minute. Then stops. Then wags."
- "Somebody keeps leaving the harbour bell rope tied in a sailor's knot. Nobody here ties that knot."
- "The children have a new song. Nobody taught it to them. It's quite catchy."
- "Strange. I could have sworn there were four piers yesterday."

### Harbour gossip, stage 2 (wrong, still polite)
- "We stopped counting the boats that come back. It was always one more than went out."
- "The gulls bring us things now. Rings, mostly. Never the same finger size."
- "Don't sleep facing the window. No reason. Just don't."

### Bottles, stage 0 and 1
- "Day 4. Calm seas. Cook swears the soup tastes of rain. We have not had rain."
- "Whoever finds this: you have lovely handwriting. I saw it on the letter you have not sent yet."
- "We dropped anchor and it did not reach the bottom. We pulled it up and it was warm."
- "Please return this bottle. It is my favourite bottle."
- "The parrot has learned a new word. None of us said it."

### Mara, cheerful but off (stage 1 to 2, short)
- "Do you hear that? No? Good. Me neither."
- "Back home we never whistled on deck. I forget why. Probably nothing."
- "I counted the waves once. Got to a very big number and then I lost count. Or it did."
- "Funny how the horizon never gets any closer, isn't it? Not funny ha-ha."
- "The bell back home rang twice every hour. Nobody knew why. Nobody minded."
- "If anyone asks, you have always been the captain. Seems like the sort of thing people ask out here."

### Passengers (new, odd)
- **A quiet woman in grey:** "I'm going home. I'll know it when I see it. I always do. It always moves a little."
- **Pim, a boy with a lantern:** "My mum said keep it lit till we land. She didn't say which land."
- **Master Odo, a notary:** "I have a document for someone on board. It says 'the captain'. It doesn't say which one."

### Shipwright, stage 1 to 2
- "Your hull has a name scratched inside. Not the Gull. I left it."
- "Funny wood, this. Grows back where I cut it."

### Sleeping at the tavern (dark rest lines)
- "You sleep well. The innkeeper says you talked all night, in a voice that was not yours."
- "Your room had two beds. In the morning, both were slept in."

### Encounter card ideas (story-safe)
- **A Rowboat, Empty:** "An empty rowboat drifts alongside, oars stowed, a cup of tea still steaming on the seat." Choices: *Take the tea* (Luck: a pleasant warmth / the cup is full again in the morning) · *Push it away* ("It follows you for an hour, then doesn't.")
- **Singing Buoy:** "A buoy rings with no wind and no waves. It is ringing a tune." Choices: *Sail closer* (Luck: coins tied to its chain / it knocks the hull, politely) · *Ring your own bell back* (it answers, one note wrong)
- **The Same Gull:** "A gull lands on the rail. It has a tiny brass ring on its leg, engraved with your ship's name." Choices: *Feed it* · *Read the ring closely* (Luck: a treasure rumour / it bites you)
