# Visual audit, 2026-11-26: what to fix, in order

Two Sonnet passes: the world (`visual_world.md`, 23 findings) and the interface (`visual_ui.md`, 24). Ranked by the lead on impact per effort.
Nothing changed yet.

## Batch 1: quick, high impact (all S)
1. The sun and moon discs show through cloud cover: fade them by cover (`sky.js`).
2. Night clouds are the brightest thing on screen: darken the painted clouds' lit colour by night and moonlight.
3. The halo, corona, Eye and meteor draw over ships and islands: depth-test them as the stars now are.
4. The storm bank can show a hard vertical seam due west: make its noise wrap round.
5. Rain is too bright at night, and the rain rings add flat light: scale both by the light.
6. Storm clouds crawl at the calm speed (`cloudSpeed` set, never read): drift the painted clouds with it.
7. Lighthouse beams show as flat bars on the noon horizon: fade them by daylight and fog.
8. The hail strip has no pixel edge, a seam in its backdrop and no dread variant; on a phone its three columns break word by word:
   give it the panel edge, a dark variant, and stack the choices below 600 px.
9. On a phone the `[E]` prompt sits on Mara's speech box; the enemy nameplate can sit on the clock.

## Batch 2: cohesion (S to M)
10. Cirrus are smooth faceted lozenges: paint them into the dome with the clouds.
11. Open-sea pale patches look like the new sandbanks and teach the wrong signal: tone them down or make them a different colour.
12. Sitting birds hover a little and the flock swaps gull to crow in one frame: lower them onto the ground, swap bird by bird.
13. Toasts vanish in one frame and the stack jumps; the speech box and modals cut in and out: one stepped open/close (2 or 3 steps).
14. Banner styles disagree (land-ho in plain type vs harbour names in Pirata One with the red shadow): one banner style.
15. Dead CSS from deleted trials and the old book look: remove it.

## Batch 3: larger (M to L, owner decisions)
16. The HUD is drawn at 1x while the world is about 4x pixels; at 1920 it looks small and pasted on: a whole-number UI zoom.
17. Three generations of font-size rules overriding each other, many sizes off DotGothic's 16 px grid: one size scale.
18. The palette has drifted (4 inks, about 7 creams, extra golds): fold into the tokens.
19. Night darks crushed by the 15-bit colour step: quantise in gamma space.
20. The sea does not take the sky's colour at dusk and in dread (pink sky, teal sea; a step at the horizon at dread 0.6): a small sky tint on the sea.
21. Words on the HUD that break the wordless rule ("QUEST COMPLETE", "Voyage saved", "(45%)" on a hail choice, the dig legend).
