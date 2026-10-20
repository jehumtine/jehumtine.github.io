# jehumtine.github.io

One drawing. Dashed lines are intent, solid lines are achievement, and every
placed joint becomes a star.

## Modules

`index.html` holds markup and content only. All logic lives in `src/` and
loads as native ES modules — no build step, no dependencies. Push to `main`,
GitHub Pages serves it.

| file | owns | may not |
|---|---|---|
| `world.js` | the forum as data: parts, the `links` dependency graph, props, lamps, build rules (`canPlace`, `claim`) | touch the DOM, know about time |
| `figures.js` | costume paths per trade, two-bone IK, the pose vocabulary | touch the DOM, read the world |
| `actors.js` | the workforce state machines (walk → pick → carry → build) | create elements; it calls `fx` |
| `props.js` | crane, dog, ox | draw themselves |
| `render.js` | every SVG element in the scene, and `place()` | decide anything |
| `people.js` | an actor's SVG and its per-frame pose | run the clock |
| `camera.js` | how the world is framed | — |
| `streak.js` | the day-365 bar | — |
| `main.js` | wiring, the clock, resize, reduced motion | contain logic |
| `site.css` | the skin | — |

The seam that keeps this honest: simulation never writes to the DOM. Actors
receive an `fx` object (`{place, ladder, dropLadder, spark, toggleLamp,
skyStar}`) and everything they want to happen goes through it. That is why
`tools/sim-test.mjs` can run the entire build with no browser.

## Checks

```sh
node tools/sim-test.mjs
```

Builds the whole forum headlessly in ~144 simulated seconds and asserts that
no part is ever placed before something it rests on. If that fails, the
constellation is lying.

## Next

`camera.js` has a `progress` value that nothing writes yet. That is the seam
for making scroll drive the build: scroll → `setProgressTarget` → the camera
moves instead of re-fitting the viewport.

`window.__site` exposes `{world, build, scene, camera, cast, viewport, tick}`
in the browser; `tick(dt, now)` advances the world by hand.
