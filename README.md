# CHIPSHOT

A portrait space shooter for one question: does chasing or dodging numbered weapon chips make a short run feel tense?

You fly a ship up a scrolling starfield, shoot a wave of swarmers, and deal with floating chips marked **1** (spread) or **6** (piercing laser). The number flips every 2–3 seconds. Match your current special to level it up, up to LV 5. Grab the other number and you switch to that weapon at LV 0. Picking a chip up makes you invulnerable for about a second. Dying keeps the weapon but drops it back to LV 0.

## Run

No install and no build. From a fresh clone:

```bash
node server.js
```

Open [http://localhost:8080](http://localhost:8080). `npm start` is the same command. Use the local server rather than opening `index.html` as a file — the game is an ES module.

## Play

- **Move:** arrow keys or WASD. Drag on the canvas with a finger or the mouse.
- **Shoot:** the main gun is always on. Your special fires with it.
- **Start:** Enter, Space, or the Start button.
- **Restart:** Enter, Space, R, or the button on the game over screen. R also restarts a run in progress.

Desktop puts score and lives on the left and the special weapon on the right. The play area stays portrait. Narrow windows stack that info above and below the canvas.

## Test

```bash
node --test
```

`npm test` runs the same check. The chip rule (match, switch, cap, death, cycle) lives in `js/chip-rule.js`. The ship only moves and fires from `{ move, fire }` on a pluggable input source, so a later AI pilot can drive the same rules.

## Tuning

Balance numbers are in `js/tunables.js`: chip cycle time, drop rate, fall speed, and the LV 0–5 stats for spread and laser. Change those after a playtest. Leave the rule itself in `js/chip-rule.js`.
