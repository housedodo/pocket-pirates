# Retro Pirate & Sea Shanty Game Audio Reference Guide (FL Studio)

## 1. Project & Aesthetic Context
* **Style:** Rustic, retro game aesthetic (16-bit / PS1 era / classic PC adventure games like *Monkey Island*).
* **Genre:** Maritime, sea shanty, tavern folk, and epic naval battle music.
* **Key & Tempo:** **B minor (H-Moll)** / D major family (the game's decided key is D: Bm, G and D all sit in it, so the theme resolves to D). 125 BPM, **6/8** (two big beats per bar, rolling sway). Pick 6/8 and keep it for every piece, so loops from different stages line up.

---

## 2. Chord Progression & Musical Structure
* **Pickup:** Single **B (H)** note.
* **Main Progression (Part A):** $\text{Bm} \rightarrow \text{G} \rightarrow \text{D}$ (played twice).
* **Bass Shift (Part B):** Drops down to a **low D pedal bass** underneath the same chord structures ($\text{Bm/D} \rightarrow \text{G/D} \rightarrow \text{D}$).

### Melodic Hooks & Counter-Melodies
* **Main Shanty Lead (Accordion / Fiddle):**
  * Pickup: `B4`
  * Over Bm: `B4 -> C#5 -> D5 -> F#5 -> D5`
  * Over G: `G5 -> F#5 -> E5 -> D5`
  * Over D: `F#5 -> E5 -> D5 -> A4 -> D5`
* **Whistle Counter-Melody (Airy Lead):**
  * Over Bm: `F#5 (held) -> quick trill (F#5 - G5 - F#5) -> D5`
  * Over G: `High G5 -> E5 -> G5`
  * Over D: `High A5 -> F#5 -> D5`
* **Low D Bass Section:**
  * Pattern: Sustained low `D2` hull rumble with rhythmic lower-register movement (`D2 -> F#2 -> A2`).

---

## 3. Free FL Studio FLEX Instruments
Use the **FLEX Store** (free downloads) to map your core instrumentation:

| Instrument Role | FLEX Pack | Preset Name |
| :--- | :--- | :--- |
| **Main Accordion Lead / Chords** | `General MIDI Library` | **GM Accordion** or **GM Tango Accordion** |
| **Rustic Fiddle Lead** | `Essential Strings` | **Violin Solo** or **Expressive Violin** |
| **Tavern Whistle / Flute** | `Essential Wind` | **Piccolo** or **Irish Flute** |
| **Naval Bass / Cellos** | `Essential Strings` | **Cello Staccato** or **Pizzicato** |
| **Rhythm Strumming** | `Essential Guitars` | **Steel String Acoustic** |

---

## 4. FX Chain Presets for Retro Game Aesthetic
To emulate a vintage sound chip or damp wooden ship cabin, apply these stock FL Studio plugin chains per instrument group:

### A. Tavern Accordion / Concertina Rack
1. **Fruity Parametric EQ 2:** High-pass at 160 Hz, Low-pass at 7.5 kHz.
2. **Bellows wobble:** a slow vibrato, e.g. **Fruity Chorus** with tiny depth, or LFO on pitch (the Delay 3 setting in the first draft is unverified; use whatever gives a gentle 5-8 cent drift).
3. **Fruity Fast Dist:** Mode A, Pre-Gain 15–20% (analog warmth).
4. **Fruity Squeeze:** Sample Rate reduced to **16 kHz – 22 kHz** (90s PC audio crunch).
5. **Fruity Reverb 2:** Small Wooden Room, Decay 1.0s, Wet 20%.

### B. Rogue Fiddle / Violin Rack
1. **Fruity Blood Overdrive:** Pre-amp 1.2x, Color boosted around 4 kHz (scraping bow texture).
2. **Fruity Parametric EQ 2:** Boost 400 Hz (+2.5 dB) for wood body resonance; high-shelf cut at 6 kHz (-4 dB).
3. **Fruity Flanger:** Short delay (1.0 ms), Depth 10%, Wet 15% (classic soundcard chorus).
4. **Fruity Reverb 2:** Medium-small size, high dampening, Wet 15%.

### C. Sub-Mix Bus (Retro Audio Engine Seal)
Route all pirate instruments into a single sub-mix bus before the master output:
1. **Low-Pass Filter:** Brickwall cut at **12 kHz** (mimics retro bandwidth caps).
2. **Fruity Limiter (Compressor Mode):** Ratio 3:1, Threshold -12 dB, Gain +2 dB (glues the mix together into a cohesive game audio asset).
---

## 5. How it plays in the game (added)
The game has **five dread stages** (cosy Caribbean -> cosmic horror) and plays one music loop per stage, cross-fading between neighbours, so write the pieces as a family:
* **Same tempo (125), same 6/8, same key centre** in all five, so a cross-fade never clashes. Stage 1 = the cheerful shanty above. Stage 2 = thinner, slower feel (drop the whistle). Stage 3 = the melody with wrong notes (flat 2nd / tritone, `C5` over Bm, `A#4` over D), sparse. Stage 4 = low D pedal and bass only, melody fragments detuned (-20 to -50 cents). Stage 5 = almost nothing: the D2 rumble, a single held note, the accordion breathing. Horror is implied, never explained: remove and bend things, do not add scary stingers.
* **Seamless loops:** bar-aligned length (16 or 32 bars = about 31 s or 61 s at 125 BPM in 6/8... check in FL; just be exact), render with the reverb tail **wrapped onto the start** (render twice, cut the second pass) so there is no gap.
* **Export:** WAV, 44.1 kHz, 16-bit, peaks about -3 dB (the game mixes on top; the sub-bus limiter in section 4C already glues it). Stereo is fine, keep it narrow.
* **Do not put the retro low-pass and the 16 kHz squeeze on everything:** the game's own look is crunchy, but the music should stay audible under waves and wind. Keep the squeeze on the accordion only.
* In the Sound Studio (F9) use "Preview in game" to hear a loop at its stage; one-shots (battle sting, harbour jingle) go in as non-looping placements.
