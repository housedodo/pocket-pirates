# Visual audit: interface and screen-space (2026-11-26)

Scope: `index.html` CSS and markup, `src/pixelui.js`, `src/ui/*.js`, the Mate box, chart, Ship's book, toasts, banners, fades,
fonts, dark variants. No source file was edited. Screenshots (1280x720 unless noted) are in
`/tmp/claude-0/-home-user-pocket-pirates/b534b7f9-56fe-56c2-b270-c63faa4dabed/scratchpad/audit_ui/`:
01_hud, 02_pause, 03_chart, 04_toast, 05_hail_speech, 06_hail_strip, 07_hail_strip_phone (420x860), 08_harbour,
09_harbour_phone (420x860), 10_1920_chart_dread, 11_1920_hud_dread (1920x1080, dread 0.7).

## Summary

The interface is mostly one language already: dithered `--pxpanel`/`--pxmenu`/`--pxbtn` tiles, 4px box-shadow "pixel edges",
gold/navy edge pair, DotGothic16 everywhere. The sailing HUD, pause menu, harbour board, Mara box, toasts and the chart
all look like one game. The breaks are at the seams: the new hail strip is the one panel with no pixel edge and no small-screen
layout (it breaks to one word per line at 420 wide), the HUD is drawn at 1x while the world is drawn at about 4x pixel size
(very small at 1920), a handful of overlays collide (prompt over the Mara box on phones, the enemy nameplate over the clock),
and the stylesheet carries three generations of font and size rules plus dead CSS from deleted trials (leather book, `data-uifont`,
`.hbtabs`, border colours on borderless panels) that makes edits unpredictable. Transitions are the other soft spot: modals,
the Mate box and toasts cut in and out hard, while `#fade`, `.toast` and the HUD fade use smooth easing.

Ranked by visual impact. Effort: S under an hour, M a few hours, L a day or more.

---

## Findings

### 1. The hail strip has no layout below about 700px: one word per line
`index.html:385-395` (`#shipmodal #shList { display:flex }`, `.ch { flex:1 }`, no media query). Screenshot `07_hail_strip_phone.png`.
At 420 wide the three choices stay side by side, each about 110px, so "Tell her you are not the one she has not met you before" wraps
to about 14 lines and the strip is 420px tall. It clashes with the harbour tabs, which do have a `max-width:760px` rule.
Fix: `@media (max-width:760px) { #shipmodal #shList { flex-direction:column } #shipmodal #shWide { padding:10px 12px } }`
and put the close button on the right of the name line. Effort S.

### 2. The hail strip is the only panel without a pixel edge, and it has a visible seam
`index.html:391-392` (`box-shadow:none !important; background: rgba(18,12,28,.92) !important`, backdrop `linear-gradient(transparent 45%, rgba(8,6,22,.9) 75%)`). Screenshot `06_hail_strip.png`.
Every other panel (`.menu` gold 4px + navy 8px, `.panel` navy 4px, cave box, card, greet box) has a stepped edge; the strip is a flat
rectangle whose top is a hard straight line at y=540 where the translucent gradient above it meets the 92% slab. The choice
buttons also lose their edge (the `.menu button` rule sets a navy edge, but here they read as flat tiles).
Fix: give `#shWide` the same `0 -4px 0 var(--gold-dim)` top edge (one line, not four) and make the backdrop gradient end at
the slab's top (`transparent 0 calc(100% - 180px)`), or fade the slab's own top with a 4px Bayer-dither row. Effort S.

### 3. HUD scale: the interface is drawn at 1x, the world at about 4x pixels
`index.html` `.panel`, `#stats`, `#mate` (fixed px sizes), `src/pixelui.js:96-98` (textures at 8px shown at 32px). Screenshot `11_1920_hud_dread.png`.
At 1080p the world pixel is 4 screen pixels, the HUD font pixel is 1 (16px DotGothic), the icons 3. At 1920 the HUD
panels are about 5% of the width, Mara's box stays 430px, and the compass is 144px; the chart's side column is a fixed 270px next
to a 1700px map. The two pixel densities do not match, which is the single biggest "UI looks pasted on" cue at 1080p and above.
Fix: one `--ui: clamp(1, round(100vw/960), 2)` applied by `zoom` (or `font-size` base and `calc()`) on `#hud`, the
modals and the chart side panel; whole numbers only so text stays on DotGothic's 16px grid. Effort M.

### 4. On phones the prompt sits on top of the Mara box
`index.html:39` (`#prompt bottom:84px`), `412` (`#mate bottom:124px`, centred, width min(520px,92vw)). Screenshot `07_hail_strip_phone.png`, earlier frame at 420 wide.
"[E] Visit Harbour Tama" wraps to two lines, covers the third line of Mara's speech and is itself drawn over it. The two are siblings
in `#hud` with no shared stacking rule. From 900 up Mara is moved to the left, which hides it, but between 420 and 899 they collide, and
the help strip (`#help`, three lines when narrow) collides with Mara at the same widths.
Fix: below 900 put `#prompt` at `bottom: calc(124px + var(--mateH))` via a class the Mate box toggles, or stack them in a flex column container. Effort S-M.

### 5. Enemy nameplate floats over the HUD panels
`index.html:410` (`#ebar`, positioned from the projected ship in `main.js:1506`, no clamp). Seen in an early frame (not kept; `05_hail_speech.png` shows the same plate near the right column).
The "Red Widow" plate with its red bar is placed at the ship's screen position; with a ship at the top-left it sits on the clock panel
and half over the place name, and it can cover the compass or the hull bars. It also has no dark variant and still reads "11px" in the
source.
Fix: clamp the plate to a safe rectangle that excludes `#stats` and the right column, and hide it while a hail is open. Effort S.

### 6. Three generations of font and size rules; the first two are dead
`index.html:43,412,414,632-653` and `524` (`*{font-family:var(--pxfont) !important}`), `654-656`. Visible effect: sizes like 11, 13, 14, 15, 22,
30, 44px in the source are overridden by later `!important` 16/32/48 blocks, so what is written is not what is drawn.
Examples: `.toast { font-size:15px }` is 16px in play; `#landho span 40px` is 48px; `.menu h2 28px` is 32px; `.cs-title 30px`, `#mapCard b 22px`,
`#caveTitle b 44px` ask for Pirata One but the global `*{font-family !important}` wins, so the chart title and cave title are
DotGothic at a non-grid size (30px, 22px, 44px: slightly blurred, visible in `03_chart.png` "Tama Sound").
Why it matters: anyone editing a size sees nothing happen, and RULES 22 (Pirata One for place names) is silently not true for the
chart side title and the cave title.
Fix: collapse to one ladder (16, 32, 48 plus a 24 for story text), delete the superseded declarations, and decide on purpose whether
`.cs-title` and `#caveTitle b` are Pirata One (add `!important` like `.hbName`) or DotGothic 32. Effort M.

### 7. Place-name banners use two different looks
`index.html:623-628,646` (`#landho`: DotGothic 48, cream, flat shadow), `42,579` (`.hbName`, `.qbBig`: Pirata One, gold or cream with a red 3D shadow).
"LAND HO / Tama" is the only title card in the game without the blackletter and the red double shadow; the harbour name that
follows seconds later has both. The chapter card reuses `#landho`, so chapters look like land-ho.
Fix: give `#landho span` the `.hbName` treatment (Pirata One with `!important`, `3px 3px 0 #5a1612, 6px 6px 0 #1a0606`). Effort S.

### 8. Toast layer: abrupt removal, smooth scale-in, and overlap with other banners
`src/ui/dom.js:25-29` (`setTimeout(() => el.remove(), ms)`, 4th toast removes the first at once), `index.html:43-45` (`pop .25s ease-out`, scale .85 to 1), `42`, `574`, `623`.
Toasts vanish in one frame and every toast below jumps up; the scale-in is a smooth transform of text (blurs DotGothic mid-animation)
while every other cue uses `steps()`. Placement `top:14%` with up to three toasts (about 150px) runs into `#qbanner` (top:14px, up to 150px tall)
and into `#landho` (top:32% of 720 = 230px). At 1920 a dread toast also lands on top of the open chart's map (`10_1920_chart_dread.png`).
Fix: `animation: pop .2s steps(3)`, add a `.out` class with a 3-step opacity drop before `remove()`, and move toasts to
`top: calc(14% + var(--qbH))` while `#qbanner.show`. Effort S-M.

### 9. Mate box and modals cut in and out; only the HUD fades
`src/objectives.js:382,404` (`style.display = 'flex'/'none'`), `index.html:51-52` (`.modal.open {display:flex}`), `265` (`body.ashore #hud {transition: opacity .3s}`), `435` (`#fade 1s linear opacity`).
Mara's box, the pause menu, the chart, harbour and cards appear and disappear on a single frame (a flash of dithered panels), but the HUD
behind them fades smoothly over 300ms and the black fade takes a full second with a smooth ramp. Mixed signals: some changes are stepped,
some smooth, most instant.
Fix: a shared `.modal.open > .menu, #mate { animation: pxin .18s steps(3) }` (translateY 8px to 0, opacity 0 to 1) and the same
reversed on close; make `#fade` and `body.ashore #hud` `steps(6)` or a 4-frame dither. Effort M.

### 10. Pixel-edge language breaks in four places (rounded corners, smooth borders)
- `index.html:499` `#touch button { border-radius:12px; border:2px solid var(--edge); background:var(--panel) }`: the on-screen controls on every phone are
  smooth, translucent rounded squares next to pixel-edged panels. `#tP` (`:477`) the same without radius.
- `index.html:223` `#lgFoot { border-radius:8px; border:3px solid #241a22; background:rgba(28,20,30,.82) }`: the local-game (Table) caption.
- `index.html:123` `.mc-ic { border-radius:50% }` (chart hover card badge): dead in play because `data-chartstyle` is always set (`750` overrides it) but a
  trap if the style is ever unset (RULES 23 says no round badges).
- `.metername` (`:609-610`) arrow is a CSS border triangle (diagonal, antialiased).
Fix: `#touch button` and `#tP` get `border:none; border-radius:0; box-shadow: 0 -3px 0 var(--pxedge), ...` and `background: var(--pxbtn)`;
`#lgFoot` takes `.panel`; delete `.mc-ic` radius; use a `clip-path` stepped arrow. Effort S.

### 11. Dead CSS from removed trials (will bite when someone edits near it)
Evidence by grep (no markup and no JS reference):
- the whole base "leather" book look: `index.html:87-107` (`.book` clip-path polygon, `.ribbons button` gradient + clip-path, ribbon colour cycle, `.bookbar button` gradient) is overridden
  because `#chart` is hard-coded `data-book="pixel"` (`:799`); the `#chart:not([data-book="leather"])` selectors (`:140-148`) are always true. About 25 lines of overridden rules.
- the pairing switch: `chartstyles.js:17 UI_FONT = null` leaves `:738-743` (`data-uifont` rules, the Jersey 10 `@font-face` at `:737`, `--dS/--dM/--dL`) never applied, plus `"Jersey 10"` font file shipped.
  RULES 22 says "switched off, not deleted", so this is a decision, but `--pxdisp` references scatter through `#hbPane .paper` and will silently fall back.
- `.hbtabs` (`:303-305`, `520`), `.pigrow/.pigdie/#pigWide` (dice minigame without markup use), `#hutWide`.
- borders on borderless panels: `.toast.dark { border-color }` (`:44`), `#mate.dark { border-color }` (`:416`), `#harbour.dark .menu { border-color }` (`:400`),
  `#fishmark { border-radius }` (`:428`, reset at `:522`), `#mate .face` rules (`:414-416`; the element is `#mateface`, 32px, not `.face` text).
  `.panel`/`.menu` have `border:none`, so the dark pink edge comes only from the `--pxedge` line at `:508`; the `border-color` lines are noise.
Fix: delete after one `npm run smoke` and a screenshot of chart, harbour and Mara dark. Effort S-M.

### 12. The hail strip has no dark or dread version
`index.html:391-395`, `src/ui/shiptrade.js:99-103`. A collectors hail speaks first in the pink-edged dark Mara box, then the choices arrive in the
plain navy and gold strip, as bright as a fruit-seller's. Every other speech surface has a `.dark` variant (`#mate.dark`, `#greet.dark`, `#card.dark`, `#harbour.dark`).
Fix: toggle `.dark` on `#shipmodal` when `sh.crew === 'collectors'` or `rt.dread > .5`; set `--pxedge` and the `.k` badge to `var(--horror)`. Effort S.

### 13. Chart: the book frame lets the HUD show through, and the map is unbounded at wide sizes
`index.html:109,678` (`#chart.mapmode .book { width: calc(100vw - 120px); height: calc(100vh - 40px) }`), `51` (backdrop `rgba(8,6,22,.72)`).
Screenshots `03_chart.png`, `10_1920_chart_dread.png`. The ragged pixel frame has transparent notches; the compass ring, Mara's anchor and the stats panels
show through them and through the 72% backdrop (compass visible over the book's top-right corner). At 1920 the parchment is 1700px of mostly empty vellum with the side panel
still 270px wide and 14px text; no zoom-to-fit on first open.
Fix: raise the modal backdrop to about .88 for `#chart` (or hide `#hud` while the chart is open, as `body.ashore` does), cap `.book` at `min(1600px, ...)` and widen `.chartgrid` to `minmax(270px, 22vw)`. Effort S.

### 14. Low-contrast and small text on the paper surfaces
`index.html:138` `.cs-keys { color:#8a7a60 }` on `#efe0bc` is about 3.2:1 (below 4.5), shown in `03_chart.png` ("drag · wheel zoom · click to pin"); `.cs-h #8a5a2a` about 4:1 at 14px;
`#hbTabs .post.locked` (`:601`) is `grayscale + brightness(.72) + opacity .7`, so locked tab labels fall to about 2.5:1 (`08_harbour.png`, Market/Tavern/Shipwright);
`small { opacity:.78 !important }` (`:654`) on `#c8b890`-ish text over navy is borderline (about 4.4:1). Chart paper small text uses `--cvSoft` (check at dread).
Fix: `.cs-keys` to `#6a5a40`; locked tabs: keep the colour, drop the opacity and grey the plank only. Effort S.

### 15. Words on a HUD that is meant to be wordless
`index.html:785` `#diglegend` ("dark, wet sand = close · pale = far · red squares: shovel cracks · blue bar: tide", 4 clauses, always on while digging);
`:795` `#saveship` "Voyage saved" and `#introskip` "any key to skip"; `:783` `QUEST COMPLETE` / `NEW QUEST` banner (56px blackletter) while the player-facing tab is "Orders" and RULES 16 says the
HUD names a gauge once then is silent; `:93` `src/ui/hud.js` "[Q] hide" and "+N more in your orders (J)" inside the tracker; hail choice text "(45%)" in `shiptrade.js:66`.
Not all are wrong (toasts are story), but the dig legend and the QUEST banner are game-speak in a cosy-pirate voice. The banner is also the only place that says "quest".
Fix: dig legend to a three-colour pixel key (swatch + icon, no text) shown once through `nameOnce`; banner to "Orders" and a pixel flag; saveship keeps the little ship, drop the label. Effort S-M.

### 16. Palette drift: four "ink" browns and about 25 unlisted golds/oranges
`index.html` colour census: `#3a2210` x22, `#22180f` x15, `#1a0f08` x10, `#1a0606` x10, plus the token `--ink-dark #2a1608`; golds: `--gold #ffd23a`, `--gold-dim #c9a85c`,
`#ffd84a` (mixer), `#e2c47a`/`#b8964c` (book buttons), `#f2c96a` (follow row), `#ffe27a/#ff9a2a` (oil), `#ff9a3a` (pulse) used where the token should be. Paper surfaces use `#efe0bc`, `#ecdcae`, `#efe2ba`, `#e6d3a2`, `#e8d9a8`, `#f2e4bc`, `#ead8a8` for the same cream.
Visible: slightly different creams between chart side panel, harbour letter, newspaper and card icon; the focus pulse uses orange where the rest use gold.
Fix: add `--paper-2`, `--ink-brown`, `--edge-wood`, `--gold-hi` tokens, replace by search; keep the chart's `--cv*` set as is. Effort M.

### 17. Non-grid font sizes (about 40 declarations) blur DotGothic16
`index.html` size census: 11 (5), 12 (11), 13 (12), 14 (29), 15 (14), 17-22 (16), 26-34 (about 18). DotGothic16 is drawn on a 16px grid; the later blocks fix most UI to 16, but `#ebar 11px`, `.farlabel 12px` (`:447`),
`.legend 12px`, `button.mini 11-12px`, `.ent small 13px`, `#mapCard small 13px`, `.mc-row 14px`, `.cs-* 14-15px`, `#logBody h3 22px`, `.cs-title 30px`, `#hbPane .letterOpen p 17px` stay off-grid and show uneven strokes (see "Crown Traders · 1 isle charted" in `03_chart.png`).
Fix: restrict to 16 / 24 (1.5x is acceptable) / 32 / 48 via three tokens. Effort M (same pass as 6).

### 18. Speech surfaces use five different text sizes and three different box constructions
`index.html:412` Mara box (`--pxpanel`, 16px), `182-186` cave box (flat `#1d1640`, 22px, own gold edge), `207-212` card (`.menu`, 24px), `274-280` harbour greet (`--pxmenu`, 32px / 44px line), `205` dive line (no box, 22px).
A hail now runs through the 16px Mara box while the villager at the pier next to it speaks at 32px, and the cave box has no dither texture at all. Each is individually fine; side by side the game talks in four voices.
Fix: pick two speech tiers (16px "aside" in the Mate box; 24px "scene" for greet, cave, card, dive) and unify the cave box onto `--pxmenu`. Effort M.

### 19. Mara/hail box jitters as it types, and the guest portrait is smaller than its frame
`index.html:293-295` (`#mateface 32px`), `412` (box grows upward as lines are typed; `bottom` anchored), `src/objectives.js:381-400`. Screenshot `05_hail_speech.png`:
the box starts one line and grows to three, so the name and portrait move up twice per line; the guest portrait (skull in a hat) is a 32px sprite inside a 32px box that
floats at the left of a tall panel while every other speaker portrait (`#grFace`, `#caveFace`, `#cardIcon`) is 64px in a dark well.
Fix: reserve the full text height from the first frame (`min-height:` of the final line count, measured once with the hidden full text) and use the 64px well from `#grFace`. Effort S-M.

### 20. Z-index ladder has a few ordering traps
`index.html:7-9` ladder (`hit 2, hudtop 3, modal 4, scene 5, fade 6, panel 7, toast 8, notice 9`). `#fade` (6) sits under `#thPanel` and `#introbars` (7) and under `#toasts` (8), so a toast or the title panel draws over a
black screen during harbour and title transitions; `#farlabels` (`:446`, z-modal 4) draws island labels over an open modal's backdrop when both are 4 (DOM order decides); `#saveship` (notice 9) draws over the strip at the foot (it sits at right:16/bottom:16, the strip's close button area).
Fix: put `--z-fade` above `--z-panel` and `--z-toast`, give the strip `--z-scene`, and hide `#farlabels` when a modal is open. Effort S.

### 21. Wind/sail/hull column is cramped and unevenly aligned
`index.html:31-36,406` (`#sailbar right:12px top:176px width:124px`, `#combatbox top:244px`), `01_hud.png`. The compass is 150px at `right:8px`, the two panels below are 124px at `right:12px`, so their right edges differ by 4px and the panels look pinned to different margins; the left stack uses `left:12px`. Gap between compass tip and sail bar is about 30px and between bars about 18px, versus 6px in the left stack.
Fix: one `--hudgap: 12px` and one right edge for the column. Effort S.

### 22. Harbour board panel clips its last row with no scroll cue
`index.html:259-263,304-310` (`#hbPane` max-height 46vh, 10px scrollbar), `08_harbour.png`: the delivery row is cut mid-text ("13:10 · 116g · late 44m") at the panel's bottom edge on 1280x720 and the scrollbar is the same colour as the rim.
Fix: a 4px dithered fade strip at the bottom edge of `#hbPane` when it can scroll (`mask-image` with steps, or a `::after` gradient), and a gold thumb. Effort S.

### 23. Pause menu leaves the HUD and Mara visible under the dim
`index.html:51` backdrop and `01_hud`/`02_pause.png`: the HUD (compass, stats, Mara text still typing, the help panel) sits dimly behind the pause menu and keeps animating ("shallows, and" in the frame). On a paused game the typing should stop and the HUD should be hidden or frozen.
Fix: `body:has(#pause.open) #hud { visibility:hidden }`; (Check that the typewriter stops while paused; the frame shows it mid-word.) Effort S.

### 24. Landing and quest cues use `steps()` per keyframe, so they are smooth, not chunky
`index.html:627-628` (`landho 4.5s steps(18)`), `575` (`qbdone 3.2s steps(16)`), `586-592` (`ssfade 2.8s steps(14)`). `steps(n)` applies between each pair of keyframes, so the 0.5s fade-in of "LAND HO" takes 18 steps of about 30ms: visually smooth. The intent in the notes is a pixel fade.
Fix: use `steps(4)` for the in and out legs (use `animation-timing-function` per keyframe), keep holds as they are. Effort S.

---

## Polish opportunities that fit the direction

- **Stepped modal entrance** (see 9): a 3-frame slide of the panel's dither tile, the way the title logo pops. Cheap, and the biggest feel gain.
- **Dread without new panels:** at dread above 0.5 shift `--pxedge` and the `.k` key badges to `--horror` on all `.menu`, the strip, and the chart book spine; today only Mara, toasts and the harbour tab do it (`11_1920_hud_dread.png` shows a cheerful navy HUD in a grey sea). Keep it to the edge colour so nothing is explained.
- **One-line "wrong" in the chart side panel** at high dread: swap one `cs-row` icon for its neighbour's glyph (repetition, not text).
- **Hail strip as a pennant:** a 4px scalloped top edge (flag bunting in 3 palette colours, dithered) instead of the flat rule, tying it to the signal-flag look the owner liked in trial B.
- **Choice keys:** the `.k` badge (26px, plain) could be a pixel "pennant" glyph from `pixelui.js` (7x7 rows), consistent with RULES 9 (icons are sprites).
- **Page-scale save cue:** `#saveship` already a nice sprite; drop the "Voyage saved" label (15) and let the little hull be the whole message.
- **Locked harbour tabs:** show the plank with a pixel padlock-free cue (a chain row sprite, one exists as `chain`), not a grey wash.

## What was checked and not
Verified headless: HUD, pause, chart, toasts, hail speech, hail strip, Tama board at 1280 and 420 wide, HUD and chart at 1920 at dread 0.7. Not run: title screen, cave, dive, card, shipyard,
touch controls (needs `pointer: coarse`), the demo build, motion and timing (the run is about 10x slow), and sound. Items 5, 8, 9, 10 (touch), 20 and 24 are from code reading plus one frame, not a recorded sequence.
