import { CAVES } from './caves.js';

// The full-screen scenes of the dark threads (Story Bible, "Multiple paths"). Same engine as the one-time caves (caves.js, cavescene.js):
// rooms of choices and d20 checks. Extra fields used here:
//   node.text / node.choices may be functions of the Threads hub (so a room can change with the state of the voyage);
//   choice.if: 'thread:flag[:arg]' (the choice only shows when the flag is true); node.enter: 'thread:event' (runs when the room is shown);
//   result.fx.event: 'thread:event[:arg]' (tells the thread what happened).
const door = (text) => ({ text, choices: [{ label: 'Go closer', go: { text: '', next: 'a' } }, { label: 'Not yet', go: { cancel: true } }] });

// ---- THE STRANGE HIGH HOUSE: a lighthouse whose lamp is always lit; a keeper with all the time there is
CAVES.house = {
  id: 'house', name: 'The Strange High House', icon: 'star', tag: 'THE LAMP IS LIT', look: 'lantern',
  nodes: {
    door: { text: 'The lamp at the top of the tower is lit in broad daylight. The door stands open. Someone has laid out a second cup.', choices: [
      { label: 'Climb', go: { text: '', next: 'hall' } },
      { label: 'Not yet', go: { cancel: true } }] },
    hall: { text: (t) => t.mod('house').hallText(), choices: [
      { label: 'Hear the bargains', if: 'house:canpact', go: { text: '', next: 'offer' } },
      { label: 'Ask to read the ledger of ships', if: 'house:canledger', check: { label: 'Luck', kind: 'luck', dc: 13 },
        ok: { text: 'The keeper turns the book around. Ships, in a neat hand, with dates. Some of the dates are next week. Yours is there. You tear nothing out. You only look.', fx: { event: 'house:ledger' }, next: 'hall' },
        fail: { text: 'He closes the book, kindly. "Not today. There is always another day, you will find."', next: 'hall' } },
      { label: 'Tear out your page', if: 'house:haspage', go: { text: 'It comes away with a sound like a breath. The keeper does not stop you. He watches the pacts go out of the room like moths.', fx: { event: 'house:tear' }, next: 'hall' } },
      { label: 'Go down', go: { text: 'The stairs are longer going down.', end: 'win' } }] },
    offer: { text: 'The keeper turns the ledger toward you. Three entries, each with a price, each in your handwriting.', choices: [
      { label: 'A borrowed wind (a page of your log)', if: 'house:can:wind', go: { text: 'He opens a window. A fair wind comes in, and sits down, and does not leave for a while.', fx: { event: 'house:take', arg: 'wind' }, next: 'hall' } },
      { label: 'A longer day (a morning of yours)', if: 'house:can:hour', go: { text: 'The sun, outside, thinks better of it and waits. You have the afternoon again.', fx: { event: 'house:take', arg: 'hour' }, next: 'hall' } },
      { label: 'A second throw (a harbour\'s kindness)', if: 'house:can:throw', go: { text: 'He weighs something you cannot see. "She will let you throw again. She always does." Somewhere, a harbour goes a little cooler.', fx: { event: 'house:take', arg: 'throw' }, next: 'hall' } },
      { label: 'That is enough', go: { text: '', next: 'hall' } }] },
  },
};

// ---- THE DROWNED BELL: a bell under the reef at low tide; count the strokes, hang the clappers, decide what the bell is for
CAVES.bellreef = {
  id: 'bellreef', name: 'The Belfry Reef', icon: 'star', tag: 'COUNT THE STROKES', look: 'lantern',
  nodes: {
    door: { text: 'Through green water, a belfry roof stands up out of the reef. The tide is low. You hear it as much through the planks as through the air.', choices: [
      { label: 'Listen over the side', go: { text: '', next: 'listen' } },
      { label: 'Not yet', go: { cancel: true } }] },
    listen: { enter: 'bell:tolls', text: 'Slow strokes, one after another, with long gaps. You count them. How many?', choices: (t) => t.mod('bell').countChoices() },
    belfry: { text: (t) => t.mod('bell').belfryText(), choices: [
      { label: 'Hang the clappers and ring it', if: 'bell:hasclappers', go: { text: 'The first stroke goes out across the reef like a door opening. The sea draws back from a street of roofs.', fx: { event: 'bell:ring' }, next: 'town' } },
      { label: 'Ring it to the tune from the fog', if: 'bell:tune', go: { text: 'You strike it in three: low, middle, high. The bell takes the tune the way a mouth takes a name. The street comes up with lamps already lit.', fx: { event: 'bell:ring', arg: 'tune' }, next: 'town' } },
      { label: 'Lay the worn coin on the bell', if: 'bell:coin', go: { text: 'The coin sits on the bronze and does not slide off. The bell does not ring. It is the most complete silence you have ever been in.', fx: { event: 'bell:silence', arg: 'coin' }, end: 'win' } },
      { label: 'Muffle it with canvas', if: 'bell:hasclappers', check: { label: 'Seamanship', kind: 'sea', dc: 12 },
        ok: { text: 'You bind the bell in sailcloth, and lash it, and it sulks. Overhead, every wreck on this coast stops mumbling.', fx: { event: 'bell:silence' }, end: 'win' },
        fail: { text: 'The canvas tears free. For a moment the bell almost rings by itself.', next: 'belfry' } },
      { label: 'Take the bell', if: 'bell:hasclappers', check: { label: 'Seamanship', kind: 'sea', dc: 13 },
        ok: { text: 'It comes up off the reef heavy as a promise. You get it aboard. It is worth a great deal, and it is not quiet.', fx: { event: 'bell:steal' }, end: 'win' },
        fail: { text: 'The bell drops back with a long groan. It will be harder next time. It knows you now.', fx: { hurt: 4 }, end: 'lose' } },
      { label: 'Leave it', go: { text: 'The tide turns, the reef goes under, and the bell is only a thing in the water again.', end: 'lose' } }] },
    town: { text: 'Roofs, stairs, a square with a well and lamps in the windows. Nobody about. There is a stall with a cloth on it, and someone has laid out things from before.', choices: [
      { label: 'Buy a keepsake (30 gold)', if: 'bell:gold30', go: { text: 'You leave the coins on the cloth. You take a shell the size of a fist. It rings, faintly, when you hold it to your ear. It rings your own name, you think. You put it down. You pick it up again.', fx: { event: 'bell:buy', gold: -30 }, end: 'win' } },
      { label: 'Ask whose town it is', go: { text: 'The lamps all lean, very slightly, toward the ship. Nobody answers. Behind you the bell strikes once. It was not you.', fx: { event: 'bell:asked' }, end: 'win' } },
      { label: 'Leave before dawn', go: { text: 'You are back aboard with the tide at your knees. The roofs are gone. Your hands are wet to the wrist.', end: 'win' } }] },
  },
};

// ---- THE FERRYMAN'S COIN: the grey pier on no chart
CAVES.ferry = {
  id: 'ferry', name: 'The Grey Pier', icon: 'star', tag: 'THE FARE', look: 'lantern',
  nodes: {
    door: { text: 'A mooring that is on no chart. One grey lantern. Your passenger stands up for the first time, and holds out a hand, palm up.', choices: [
      { label: 'Pay the fare (30 gold)', if: 'coin:canpay', go: { text: 'You put thirty gold in the palm. The hand closes. The passenger steps onto the pier, and the pier steps away from the ship. The next harbour you reach will light its lamps very early.', fx: { event: 'coin:pay', gold: -30 }, end: 'win' } },
      { label: 'Refuse', go: { text: '"Then I will stay," says the passenger, the first thing they have said in days. They sit down on the rope pile. The pier is gone. You do not remember it going.', fx: { event: 'coin:refuse' }, end: 'win' } },
      { label: 'Take their place for a night', go: { text: 'The passenger smiles, which is worse. You step onto the pier and they step aboard, and a ship you have never seen takes you across the dark. You wake on a quay. Somebody else sailed yours home.', fx: { event: 'coin:swap' }, end: 'win' } },
      { label: 'Not yet', go: { cancel: true } }] },
  },
};

// ---- THE HOLLOW HARBOUR: the welcome
CAVES.hollow = {
  id: 'hollow', name: 'The Harbourmaster', icon: 'talk', tag: 'YOU ARE WELCOME HERE', look: 'lantern',
  nodes: {
    door: { text: 'The harbourmaster has been waiting at the end of the pier all week. He has not blinked. "You have been good to us, Captain. Stay. The water is lovely this time of year."', choices: [
      { label: 'Accept the welcome', go: { text: 'He takes your hand with both of his, and his hands are wet. By morning you have stopped noticing it. The fish bite for you now, and the fog keeps its distance.', fx: { event: 'hollow:accept' }, end: 'win' } },
      { label: 'Not yet', go: { cancel: true } }] },
  },
};

// ---- THE MUSIC OUT OF THE FOG: the house on four legs
CAVES.musichouse = {
  id: 'musichouse', name: 'The House on Four Legs', icon: 'star', tag: 'DO NOT ANSWER', look: 'lantern',
  nodes: {
    door: { text: 'A house on four legs, standing in the sea. A lit window. The three notes come from inside, over and over, patient as a pulse.', choices: [
      { label: 'Play it on the ship\'s bell', go: { text: '', next: 'p1' } },
      { label: 'Not yet', go: { cancel: true } }] },
    p1: { text: 'The first note. Which one?', choices: [
      { label: 'Low (D)', go: { text: '', next: 'p2' } },
      { label: 'Middle (G)', go: { text: 'It goes into the water and does not come back. The window goes dark for a moment, and then the music starts again from the beginning.', next: 'p1' } },
      { label: 'High (B)', go: { text: 'It goes into the water and does not come back. The window goes dark for a moment, and then the music starts again from the beginning.', next: 'p1' } }] },
    p2: { text: 'The second.', choices: [
      { label: 'Low (D)', go: { text: 'Wrong. The music starts again from the beginning.', next: 'p1' } },
      { label: 'Middle (G)', go: { text: '', next: 'p3' } },
      { label: 'High (B)', go: { text: 'Wrong. The music starts again from the beginning.', next: 'p1' } }] },
    p3: { text: 'And the third.', choices: [
      { label: 'Low (D)', go: { text: 'Wrong. The music starts again from the beginning.', next: 'p1' } },
      { label: 'Middle (G)', go: { text: 'Wrong. The music starts again from the beginning.', next: 'p1' } },
      { label: 'High (B)', go: { text: 'The three of them, in order. Inside the house, somebody stops playing and turns toward the door.', next: 'answer' } }] },
    answer: { text: 'The door begins to open on its own. Somebody on the other side of it is very glad.', choices: [
      { label: 'Answer: step in', go: { text: 'A room, and a window onto somewhere that is not the sea, and a lantern on the table. "Take it," says a voice, "for a day. Go and see what is wrong." You take it. When you turn around the house is gone, and so is the tune.', fx: { event: 'music:answer' }, end: 'win' } },
      { label: 'Refuse: shut the window', go: { text: 'You do not answer. The music stops in the middle of a note. The fog lifts as if it had never been asked to stay. You are quieter, afterward.', fx: { event: 'music:refuse' }, end: 'win' } },
      { label: 'Change one note', check: { label: 'Luck', kind: 'luck', dc: 13 },
        ok: { text: 'You strike the last one a little flat. The house flinches. The tune, wherever it is kept, is not quite what it was, and neither is anything that was ever written to it.', fx: { event: 'music:change' }, end: 'win' },
        fail: { text: 'You strike the wrong note, and it is not the one you meant. The door opens anyway, but not kindly.', fx: { event: 'music:answer', arg: 'owed' }, end: 'win' } }] },
  },
};

// ---- THE OTHER CAPTAIN: the place where the two ships were swapped
CAVES.raven = {
  id: 'raven', name: 'The Crossing', icon: 'star', tag: 'BEFORE THE THIRD DUSK', look: 'lantern',
  nodes: {
    door: { text: 'Two ships lie side by side on the swell, the same keel, the same scar on the same plank, and neither one is looking at you. One of them is yours. Somebody on it is waving.', choices: [
      { label: 'Come alongside the Merry Gull', check: { label: 'Seamanship', kind: 'sea', dc: 12 },
        ok: { text: 'The planks meet. You step across, and the deck remembers your feet. The other ship drifts off and is not there when you look for it.', fx: { event: 'captain:back' }, end: 'win' },
        fail: { text: 'The swell pushes the two hulls apart. You have until the third dusk.', next: 'door' } },
      { label: 'Open the Raven\'s hold and let her go down', check: { label: 'Seamanship', kind: 'sea', dc: 13 },
        ok: { text: 'She takes the water without a sound. You cross to the Gull as the last of her deck goes under. When you look back there is only a ring of oil on the water, and a name, floating, upside down.', fx: { event: 'captain:sink' }, end: 'win' },
        fail: { text: 'The hold is already full. She does not sink. She waits.', next: 'door' } },
      { label: 'Stay aboard the Raven', go: { text: 'You let the other ship go. It sails off with a stranger at its tiller, and it looks, from a distance, exactly as it should.', fx: { event: 'captain:stay' }, end: 'win' } },
      { label: 'Not yet', go: { cancel: true } }] },
  },
};
