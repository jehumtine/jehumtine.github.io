// props.js — the site's machinery: crane, dog, ox.
// Pure state, like actors.js. The SVG lives in render.js.

import { GROUND, JIB } from './world.js';

const rand = (a, b) => a + Math.random() * (b - a);

function mvTo(o, key, target, sp) {
  const d = target - o[key];
  if (Math.abs(d) <= sp) { o[key] = target; return true; }
  o[key] += d > 0 ? sp : -sp;
  return false;
}

/* ------------------------------------------------------------------ *
 * The crane. It lifts the heaviest parts (`h`), and when there is no
 * heavy work left it helps the climbers.
 * ------------------------------------------------------------------ */
export function createCrane() {
  return { tx: 1000, len: 14, st: 'idle', t: 0, job: -1, hold: false };
}

export function stepCrane(c, dt, ctx) {
  const p = c.job >= 0 ? ctx.world.parts[c.job] : null;

  if (c.st === 'idle') {
    let j = ctx.claim('crane');
    if (j < 0) j = ctx.claim('climber');
    if (j >= 0) { c.job = j; c.st = 'load'; }
    else { mvTo(c, 'tx', 1000, 60 * dt); mvTo(c, 'len', 14, 100 * dt); }
  } else if (c.st === 'load') {
    const a = mvTo(c, 'tx', 1228, 300 * dt);
    const b = mvTo(c, 'len', GROUND - 8 - JIB, 340 * dt);
    if (a && b) { c.st = 'hook'; c.t = 0; }
  } else if (c.st === 'hook') {
    c.t += dt;
    if (c.t > 0.4) { c.hold = true; c.st = 'lift'; }
  } else if (c.st === 'lift') {
    if (mvTo(c, 'len', 14, 340 * dt)) c.st = 'trav';
  } else if (c.st === 'trav') {
    if (mvTo(c, 'tx', p.cx, 300 * dt)) c.st = 'low';
  } else if (c.st === 'low') {
    if (mvTo(c, 'len', p.cy - JIB - 5, 340 * dt)) { c.st = 'drop'; c.t = 0; }
  } else if (c.st === 'drop') {
    c.t += dt;
    if (c.t > 0.3) {
      ctx.fx.place(c.job);
      c.hold = false;
      c.job = -1;
      c.st = 'idle';
    }
  }
}

/* ------------------------------------------------------------------ *
 * The dog.
 * ------------------------------------------------------------------ */
export function createDog() {
  return { x: 0, dir: 1, ph: 0, st: 'run', t: 0, tx: 0, init: false };
}

export function stepDog(d, dt, ctx) {
  if (d.st === 'run') {
    if (!d.tx) d.tx = rand(ctx.viewport.minX + 60, ctx.viewport.maxX - 60);
    const delta = d.tx - d.x;
    if (Math.abs(delta) < 3) {
      d.st = 'sit';
      d.t = rand(1.5, 3.5);
      d.tx = 0;
    } else {
      d.dir = delta > 0 ? 1 : -1;
      d.x += d.dir * Math.min(Math.abs(delta), 95 * ctx.sc * dt);
      d.ph += dt * 16;
    }
  } else {
    d.t -= dt;
    d.ph += dt * 8;
    if (d.t <= 0) d.st = 'run';
  }
}

/* ------------------------------------------------------------------ *
 * The ox, walking its waggon between the delivery pile and the works.
 * ------------------------------------------------------------------ */
export function createOx() {
  return { x: 400, dir: 1, st: 'go', t: 0, ph: 0, load: true };
}

export function stepOx(o, dt, ctx) {
  if (o.st === 'go') {
    o.x += o.dir * 22 * ctx.sc * dt;
    o.ph += dt * 5;
    if (o.dir > 0 && o.x >= 860) {
      o.x = 860; o.st = 'rest'; o.t = 3; o.load = false;
    } else if (o.dir < 0 && o.x <= 340) {
      o.x = 340; o.st = 'rest'; o.t = 3; o.load = true;
    }
  } else {
    o.t -= dt;
    if (o.t <= 0) { o.dir *= -1; o.st = 'go'; }
  }
}

export { rand, mvTo };
