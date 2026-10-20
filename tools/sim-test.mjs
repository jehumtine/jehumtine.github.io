// Headless check of the build logic: no DOM, fixed timestep.
// Run with: node tools/sim-test.mjs
import { buildWorld, createBuildState, claim } from '../src/world.js';
import { createCast, stepActor } from '../src/actors.js';
import { createCrane, stepCrane, createDog, stepDog, createOx, stepOx } from '../src/props.js';

const world = buildWorld();
const build = createBuildState();
const cast = createCast();
const crane = createCrane();
const dog = createDog();
const ox = createOx();

const placedOrder = [];
const fx = {
  place(i) {
    if (build.placed[i]) throw new Error('placed twice: ' + i);
    build.placed[i] = true;
    placedOrder.push(i);
  },
  ladder() {}, dropLadder() {}, spark() {}, toggleLamp() {}, skyStar() {},
};

const viewport = { minX: 60, maxX: 1260, pickX: 140, sc: 1.3 };
const ctx = {
  world, build, viewport, fx, ox,
  get sc() { return viewport.sc; },
  get pickX() { return viewport.pickX; },
  claim: (role) => claim(world, build.placed, role),
};

// seed actor positions the way main.js does
cast.list.forEach((w, q) => { if (w.role !== 'astro') w.x = viewport.pickX + q * 16 * viewport.sc; });
dog.x = viewport.pickX + 60 * viewport.sc;

const dt = 1 / 60;
let t = 0;
const limit = 60 * 30; // 30 simulated seconds

while (t < limit && build.placed.filter(Boolean).length < world.parts.length) {
  cast.list.forEach((w) => stepActor(w, dt, ctx));
  stepCrane(crane, dt, ctx);
  stepDog(dog, dt, ctx);
  stepOx(ox, dt, ctx);
  t += dt;
}

const n = build.placed.filter(Boolean).length;
console.log('placed', n, '/', world.parts.length, 'in', t.toFixed(1) + 's');

if (n !== world.parts.length) {
  const missing = world.parts.filter((p) => !build.placed[p.i]);
  console.log('missing:', missing.map((p) => p.i + ':' + p.t).join(' '));
  process.exit(1);
}

// dependency integrity: nothing may be placed before what it rests on
const seen = new Set();
for (const i of placedOrder) {
  const p = world.parts[i];
  for (const a of p.links) {
    if (!seen.has(a)) {
      console.log(`ORDER VIOLATION: part ${i} placed before its link ${a}`);
      process.exit(1);
    }
  }
  seen.add(i);
}
console.log('dependency order: ok');
console.log('first 12 placed:', placedOrder.slice(0, 12).join(','));
