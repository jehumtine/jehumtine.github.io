# jehumtine.github.io

A blueprint. The site is one engineering drawing, white line on slate: a
lattice tower going up the right side of the sheet, one tier per project.
Scroll is the climb, and the camera pauses on each tier so its panel can be
read.

- **Solid** members: finished work.
- **Dashed** construction lines: work in progress.
- It is a working site: people rivet, weld, paint, climb and carry on every
  tier, hoist cages run up the side, a yard works at the foot, and a tower
  crane on top builds the next tier toward the star.
- Constellations draw themselves in and fade behind the sheet.
- Every tier has a detail box with that project's drawing, a numbered
  balloon, and a dimension line with its name in English and Japanese.
- Crossing into a tier hard-cuts to an Evangelion-style title card.
- The tower ends in a dashed spire and a star. Contact lives there.

## Adding or finishing a project

`src/campaigns.js` lists the tiers bottom to top. Flip a tier's `status`
from `'intent'` to `'done'` and it is built: its members and detail drawing
go solid and its panel says 完. The crane and crew always work on the first
unfinished tier (or a new one above the top when everything is done). Keep
finished tiers below unfinished ones. Unready tiers are commented out in
`campaigns.js` and `index.html`.

A new tier needs an entry there, a drawing function in `src/frieze.js`
(`SCENES[id]`), and an `<article data-k="id">` panel in `index.html`.

## Modules

No build step and no external code; just a canvas.

| file | owns |
|---|---|
| `plate.js` | the drawing: grid, footing, tower, detail boxes, crew, star, sheet border, camera |
| `pen.js` | flat line drawing: segments, solid vs dashed ink |
| `figures.js` | the drawing vocabulary: people, poses, horses, chariots, drones, chips… |
| `frieze.js` | `SCENES`: one detail drawing per project (no DOM) |
| `campaigns.js` | tier data and status |
| `main.js` | scroll → progress, panels, title cards, gauge, readout |
| `streak.js` | the run-10k bar |

## Checks

```sh
node tools/frieze-check.mjs            # every stroke of every scene inside its band
node tools/frieze-check.mjs proof.svg  # plus a flat proof print
```

`?still` on the URL disables title cards, easing and the plotter draw-in (for
screenshots). `window.__site.go('f1')` jumps the climb to a tier.
