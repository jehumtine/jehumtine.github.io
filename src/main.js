// main.js — wiring. Nothing here knows how anything is drawn or how anything
// is simulated; it starts the clock and connects the pieces.

import { buildWorld, createBuildState, claim, clearClaimFlags } from './world.js';
import { createCast, stepActor } from './actors.js';
import { createScene } from './render.js';
import { createFigure, drawFigure } from './people.js';
import { createCamera } from './camera.js';
import { createCrane, stepCrane, createDog, stepDog, createOx, stepOx } from './props.js';
import { initStreak } from './streak.js';

const field = document.getElementById('field');
const svg = document.getElementById('site');

const world = buildWorld();
const build = createBuildState();
const scene = createScene(svg, world);
const camera = createCamera();
const crane = scene.crane;
const dog = createDog();
const ox = createOx();
const cast = createCast();

const figures = cast.list.map((w) => createFigure(w, scene.groups.gPeople, scene.groups.gFx));
const dogFig = scene.createDogFig();
const oxFig = scene.createOxFig();

const viewport = { minX: 0, maxX: 1200, pickX: 100, sc: 1.3 };

const fx = {
  place: (i) => scene.place(i, build),
  ladder: (w, top) => { w.lad = scene.makeLadder(w.x, top, viewport.sc); },
  dropLadder: (w) => { if (w.lad) { w.lad.remove(); w.lad = null; } },
  spark: (x, y) => scene.spark(x, y),
  toggleLamp: (i) => {
    world.lamps[i].on = !world.lamps[i].on;
    scene.drawLamps();
  },
  skyStar: () => scene.skyStar(),
};

const ctx = {
  world,
  build,
  viewport,
  fx,
  ox,
  get sc() { return viewport.sc; },
  get pickX() { return viewport.pickX; },
  claim: (role) => claim(world, build.placed, role),
};

/* ------------------------------------------------------------------ *
 * Sizing
 * ------------------------------------------------------------------ */
function resize() {
  const vw = field.clientWidth;
  const vh = field.clientHeight;
  const view = camera.frame(vw, vh);
  const { pickX } = scene.resize(view, vw, vh);

  Object.assign(viewport, view, { pickX });

  // place the workforce on first layout only — after that it moves itself
  cast.list.forEach((w, q) => {
    if (!w.init && w.role !== 'astro') {
      w.x = w.role === 'lamp' ? world.lamps[0].x : pickX + q * 16 * view.sc;
      w.init = 1;
    }
  });
  if (!dog.init) {
    dog.x = pickX + 60 * view.sc;
    dog.init = 1;
  }
}

let resizeTimer = 0;
addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resize, 120);
});

/* ------------------------------------------------------------------ *
 * Frame
 * ------------------------------------------------------------------ */
let last = 0;
let tt = 0;
let doneAt = 0;
let resetting = false;
let visible = true;

function frame(now) {
  requestAnimationFrame(frame);
  if (!visible) return;
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  tick(dt, now);
}

// one step of the world. Split out of frame() so it can be driven by hand
// (headless checks) and, later, by the scroll camera.
function tick(dt, now) {
  tt += dt;

  scene.advanceGrow(dt);
  scene.stepSparks(dt);
  scene.drawBirds(dt, tt);

  stepDog(dog, dt, ctx);
  scene.drawDog(dog, dogFig);

  scene.animateStations(tt);
  scene.animateWheel(tt);

  stepOx(ox, dt, ctx);
  scene.drawOx(ox, oxFig);

  if (resetting) return;

  cast.list.forEach((w, q) => {
    stepActor(w, dt, ctx);
    drawFigure(figures[q], w, viewport.sc);
  });

  stepCrane(crane, dt, ctx);
  scene.drawCrane(crane);

  if (build.placed.filter(Boolean).length === world.parts.length) {
    if (!doneAt) doneAt = now;
    if (now - doneAt > 9000) {
      resetting = true;
      scene.fadePlaced();
      setTimeout(resetAll, 1800);
    }
  }
}

function resetAll() {
  scene.clearPlaced();
  build.placed = [];
  build.drawn = {};
  clearClaimFlags(world);
  doneAt = 0;

  cast.list.forEach((w) => {
    if (w.lad) { w.lad.remove(); w.lad = null; }
    w.y = 0;
    w.carry = false;
    w.job = -1;
    w.fly = null;
    w.rope = null;
    w.stn = null;
    if (/^(mason|cart|climber|painter|sculptor)$/.test(w.role)) w.st = 'ret';
  });
  world.props.forEach((q) => { q.who = null; });

  crane.st = 'idle';
  crane.hold = false;
  crane.job = -1;
  crane.tx = 1000;
  crane.len = 14;

  scene.unfadePlaced();
  resetting = false;
}

/* ------------------------------------------------------------------ *
 * Start
 * ------------------------------------------------------------------ */
resize();
initStreak();

const reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

if (reduced) {
  world.parts.forEach((p) => scene.place(p.i, build));
  world.lamps.forEach((l) => { l.on = true; });
  scene.drawLamps();
  cast.list.forEach((w, q) => {
    if (w.role !== 'astro') w.pose = 'stand';
    drawFigure(figures[q], w, viewport.sc);
  });
  scene.drawCrane(crane);
  scene.drawDog(dog, dogFig);
  scene.drawOx(ox, oxFig);
} else {
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => { visible = !document.hidden; });

// handy while developing the next stage (scroll camera), and for headless checks
window.__site = { world, build, scene, camera, cast, viewport, tick };
