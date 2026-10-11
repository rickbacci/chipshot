# Working title: CHIPSHOT — design doc v0.2

A vertical space shooter inspired by Zanac (NES), built for Remix (browser, JavaScript, mobile + desktop).
The hook: you can fly it yourself, command an AI pilot, or watch the AI play.

## Core loop
Fly up a scrolling space level → shoot enemy waves → collect or dodge numbered weapon chips → survive to the boss → score.

## The chip rule (the heart of the game)
- Enemies and carriers drop numbered weapon chips.
- Grab the **same number** as your current special weapon: it levels up (Lv 0 → Lv 5).
- Grab a **different number**: you switch to that weapon at **Lv 0**.
- So chips are both rewards and hazards; you steer around the ones you don't want.
- Floating chips cycle their number every 2–3 s (Zanac-style), so timing a grab is part of the risk.
- Brief invulnerability (~1 s) on pickup, like Zanac.
- Dying resets your special weapon to Lv 0.

### Weapons (prototype = 2, full game = 4; Zanac had 8, we pick our own)
| # | Weapon | Lv 0 | Lv 5 |
|---|--------|------|------|
| 1 | Spread shot | 3-way | 7-way, faster fire |
| 6 | Piercing laser | short beam, pierces 1 | long beam, pierces all + terrain |
| 0 | Shield | absorbs 1 hit | absorbs 4 hits + damages on contact |
| 4 | Orbit balls | 1 ball | 4 balls, faster spin |

The main gun (straight shot) is always on; the special weapon fires alongside it.

## Enemies (full game)
- **Swarmer:** groups of 5, sine-wave sweep across the screen.
- **Diver:** drops to mid-screen, fires an aimed shot, retreats.
- **Gunship:** big, slow armored ship or space station drifting down the screen, fires bullet rings. (Deep-space setting, no ground.)
- **Boss:** end of level, weak point plus bullet patterns.

## Adaptive difficulty ("the director")
Every few seconds, read weapon level, lives, recent kills and hits taken; nudge an intensity value 1–10 that controls spawn rate, enemy speed and bullet density. Playing well heats it up, dying cools it down. Kept hidden from the player.

## Modes
1. **Pilot:** you fly and shoot (keyboard, or touch drag on mobile).
2. **Commander:** the AI flies; you tap a weapon number and the AI hunts that chip, dodges the others and bullets, and fires automatically.
3. **Watch:** the AI also picks weapons (spread for swarms, laser for armor, shield when hurt). Speed-up button; guess how far it gets.

## AI pilot: collaborative diffusion
- The play area is a coarse grid (e.g. 24×40 cells).
- Each tick, "attract scent" spreads out from goals (enemies to line up on, the wanted chip) and "repel scent" from hazards (bullets, enemies at close range, unwanted chips).
- The ship moves toward the neighboring cell with the best score; weights decide how brave or careful it is.
- A debug toggle draws the scent field as a heatmap (useful for tuning, and good to look at in Watch mode).
- One input interface: the game reads `{move, fire}` from either the player's controls or the AI, so all three modes share the same rules.

## Scoring
Points per enemy type, combo multiplier for kills without getting hit (resets on hit), and a bonus for clearing a level with a Lv 5 weapon.

## Look and feel
Retro 8-bit style. Colored shapes first, pixel art later. Chiptune sound, screen shake on hits, big readable chip numbers.

## Prototype scope (milestone 2 — "is it fun?")
- Ship movement + main gun, one scrolling level, one enemy type (swarmer).
- Chips with only weapons 1 and 6, full match/switch rule.
- Lives, score, game over and restart.
- Plain shapes, no sound.
- **Done when:** a 2-minute run feels tense because of the chip choices. If it doesn't, change the rule before building more.

## Milestones
1. Design doc (this file)
2. Prototype: core gameplay
3. Real game: enemy types, director, boss, menus
4. AI pilot + Commander mode
5. Watch mode + stakes
6. Polish + publish on Remix

## Decisions (v0.2)
- **Name:** CHIPSHOT stays a placeholder until the prototype is playable.
- **Chips cycle numbers:** yes, every 2–3 s.
- **Orientation:** portrait everywhere; on desktop the play area is centered with score/weapon info on the sides.
- **Setting:** deep space; ground turrets replaced by armored gunships/stations.
- **Watch mode stakes:** points-based predictions first (guess the level/score the AI reaches); leaderboards later.
- **Art:** colored shapes for the prototype; later a CC0/licensed pixel-art pack or our own sprites. No Zanac names, sprites, music or level layouts.
