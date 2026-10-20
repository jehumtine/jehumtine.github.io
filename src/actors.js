// actors.js — the workforce. State machines only: no SVG, no timing loop.
//
// Every worker is a small automaton: it looks for work it is allowed to do,
// walks to it, performs it, and the part it built becomes a star. The only
// way out is through `fx`, so this file can be run headless.

import { GROUND, peek } from './world.js';

const ALT = ['sweep', 'hammer', 'saw', 'draw', 'sweep'];

export function createActor(role, n, opts = {}) {
  return {
    role,
    n,
    x: 0,
    y: 0,
    by: GROUND,
    dir: 1,
    ph: n * 2,
    st: 'ret',
    t: 0,
    carry: false,
    job: -1,
    sp: 46 + (n % 4) * 5,
    off: (n % 2 ? 1 : -1) * (24 + n * 9),
    pose: 'walk',
    mv: false,
    ...opts,
  };
}

/* ------------------------------------------------------------------ *
 * The cast — order matters, it is the draw order.
 * ------------------------------------------------------------------ */
export function createCast() {
  const W = [];
  let n = 0;
  const mk = (role, opts) => {
    const w = createActor(role, n++, opts);
    W.push(w);
    return w;
  };

  for (let i = 0; i < 8; i++) mk('mason');
  for (let i = 0; i < 4; i++) mk('cart');
  for (let i = 0; i < 8; i++) mk('climber');
  for (let i = 0; i < 3; i++) mk('painter');
  for (let i = 0; i < 3; i++) mk('sculptor');

  const architect = mk('architect', { st: 'walk' });
  const lamp = mk('lamp', { st: 'walk', li: 0 });
  const astro = mk('astro', { x: 62, pose: 'scope', st: 'scan', t: 2 });

  mk('smith', { si: 2 });
  mk('sawyer', { si: 1 });
  mk('mixer', { si: 7 });
  mk('stonecutter', { si: 3 });
  mk('surveyor', { si: 4 });
  mk('staff');
  mk('water', { st: 'toWell' });
  mk('driver');

  return { list: W, architect, lamp, astro };
}

/* ------------------------------------------------------------------ *
 * Movement helpers
 * ------------------------------------------------------------------ */
function walkTo(w, tx, dt, sc, m) {
  const d = tx - w.x;
  w.mv = true;
  if (Math.abs(d) < 2) {
    w.mv = false;
    return true;
  }
  w.dir = d > 0 ? 1 : -1;
  w.x += w.dir * Math.min(Math.abs(d), w.sp * sc * dt * (m || 1) * 1.25);
  w.ph += dt * 9;
  return false;
}

function noWork(w, ctx) {
  let q = null, best = 1e9;
  ctx.world.props.forEach((t) => {
    if (!t.perm && !t.who) {
      const d = Math.abs(t.x - w.x);
      if (d < best) { best = d; q = t; }
    }
  });
  w.t = 0;
  if (q) { q.who = w; w.stn = q; w.st = 'stn'; }
  else { w.st = 'sweep'; w.stn = null; }
}

function idleWork(w, dt, ctx) {
  const q = w.stn;
  w.mv = false;
  if (w.st === 'stn' && Math.abs(w.x - (q.x - 15 * ctx.sc)) > 2) {
    w.pose = 'walk';
    walkTo(w, q.x - 15 * ctx.sc, dt, ctx.sc);
    return;
  }
  if (q) w.dir = 1;
  w.pose = q ? q.pose : ALT[w.n % 5];
  w.ph += dt * 8;
  w.t += dt;
  if (w.t > 0.5) {
    w.t = 0;
    if (peek(ctx.world, ctx.build.placed, w.role)) {
      if (q) { q.who = null; w.stn = null; }
      w.st = 'ret';
    }
  }
}

/* ------------------------------------------------------------------ *
 * One tick of one worker.
 * ------------------------------------------------------------------ */
export function stepActor(w, dt, ctx) {
  const { fx, world, build } = ctx;
  const sc = ctx.sc;
  const r = w.role;

  w.mv = false;

  if (w.st === 'stn' || w.st === 'sweep') {
    idleWork(w, dt, ctx);
    return;
  }

  let j;

  if (r === 'mason' || r === 'cart' || r === 'climber' || r === 'painter') {
    if (w.st === 'ret') {
      w.pose = 'walk';
      if (walkTo(w, ctx.pickX + w.n * 9 * sc, dt, sc)) { w.st = 'pick'; w.t = 0; }
    } else if (w.st === 'pick') {
      w.pose = 'stand';
      w.t += dt;
      if (w.t > 0.4) {
        j = ctx.claim(r);
        if (j < 0) noWork(w, ctx);
        else {
          w.job = j;
          w.carry = r !== 'painter';
          w.st = 'go';
          const narrow = r === 'climber' || r === 'painter' ? 0.6 : 1;
          w.tx = clamp(world.parts[j].cx + (w.off * sc / 1.3) * narrow, ctx.viewport.minX + 30, ctx.viewport.maxX - 30);
        }
      }
    } else if (w.st === 'go') {
      w.pose = r === 'cart' ? 'push' : r === 'painter' ? 'walk' : 'carry';
      if (walkTo(w, w.tx, dt, sc, r === 'cart' ? 0.8 : 1)) {
        if (r === 'climber' || r === 'painter') {
          w.st = 'up';
          w.ytop = Math.max(10, GROUND - world.parts[w.job].cy - 6);
          fx.ladder(w, w.ytop);
        } else {
          w.st = 'toss';
          w.t = 0;
          w.dur = 0.7 + Math.abs(world.parts[w.job].cx - w.x) / 500 + (GROUND - world.parts[w.job].cy) / 600;
          w.carry = false;
          w.sx = w.x + (r === 'cart' ? w.dir * 16 * sc : 0);
          w.sy = GROUND - (r === 'cart' ? 8 : 31) * sc;
        }
      }
    } else if (w.st === 'toss') {
      w.pose = r === 'cart' ? 'stand' : 'carry';
      toss(w, dt, ctx);
    } else if (w.st === 'up') {
      w.pose = 'climb';
      w.ph += dt * 7;
      w.y += 130 * dt;
      if (w.y >= w.ytop) {
        w.y = w.ytop;
        if (r === 'painter') { w.st = 'paint'; w.t = 0; }
        else { fx.place(w.job); w.carry = false; w.st = 'down'; }
      }
    } else if (w.st === 'paint') {
      w.pose = 'paint';
      w.ph += dt * 10;
      w.t += dt;
      if (w.t > 2.2) { fx.place(w.job); w.st = 'down'; }
    } else if (w.st === 'down') {
      w.pose = 'climb';
      w.ph += dt * 9;
      w.y -= 220 * dt;
      if (w.y <= 0) {
        w.y = 0;
        fx.dropLadder(w);
        w.st = 'ret';
      }
    }
  } else if (r === 'sculptor') {
    if (w.st === 'ret') {
      w.pose = 'walk';
      if (walkTo(w, ctx.pickX + (110 + w.n * 14) * sc, dt, sc)) { w.st = 'pick'; w.t = 0; }
    } else if (w.st === 'pick') {
      w.pose = 'stand';
      w.t += dt;
      if (w.t > 0.5) {
        j = ctx.claim('sculptor');
        if (j < 0) noWork(w, ctx);
        else { w.job = j; w.st = 'go'; w.tx = world.parts[j].cx + (14 + 9) * sc; }
      }
    } else if (w.st === 'go') {
      w.pose = 'walk';
      if (walkTo(w, w.tx, dt, sc)) { w.st = 'chisel'; w.t = 0; w.sp2 = 0; w.dir = -1; }
    } else if (w.st === 'chisel') {
      w.pose = 'chisel';
      w.t += dt;
      w.ph += dt * 14;
      w.sp2 += dt;
      if (w.sp2 > 0.09) { w.sp2 = 0; fx.spark(w.x - 9 * sc, GROUND - 15 * sc); }
      if (w.t > 2.8) { fx.place(w.job); w.st = 'ret'; }
    }
  } else if (r === 'architect') {
    if (w.st === 'walk') {
      w.pose = 'walk';
      if (!w.tx) w.tx = ctx.pickX + rand(40, 260) * sc;
      if (walkTo(w, w.tx, dt, sc, 0.6)) { w.st = 'show'; w.t = 0; w.dir = 1; }
    } else {
      w.pose = 'point';
      w.t += dt;
      if (w.t > rand(3, 5)) { w.st = 'walk'; w.tx = ctx.pickX + rand(40, 260) * sc; w.t = 0; }
    }
  } else if (r === 'lamp') {
    const L = world.lamps[w.li];
    if (w.st === 'walk') {
      w.pose = 'walk';
      if (walkTo(w, L.x - 12 * sc, dt, sc, 1.1)) { w.st = 'light'; w.t = 0; w.dir = 1; }
    } else {
      w.pose = 'lamp';
      w.t += dt;
      if (w.t > 1.1 && !w.did) { w.did = 1; fx.toggleLamp(w.li); }
      if (w.t > 1.6) { w.did = 0; w.li = (w.li + 1) % world.lamps.length; w.st = 'walk'; }
    }
  } else if (r === 'smith' || r === 'sawyer' || r === 'mixer' || r === 'stonecutter' || r === 'surveyor') {
    const q = world.props[w.si];
    w.x = q.x - 15 * sc;
    w.dir = 1;
    w.pose = q.pose;
    w.ph += dt * 8;
    if (r === 'smith' || r === 'stonecutter') {
      w.sp2 = (w.sp2 || 0) + dt;
      if (w.sp2 > 0.26) { w.sp2 = 0; fx.spark(q.x - 1, GROUND - (14 * sc) / 1.3); }
    }
  } else if (r === 'staff') {
    w.x = world.props[4].x + 60;
    w.dir = -1;
    w.pose = 'staff';
    w.ph += dt * 2;
  } else if (r === 'driver') {
    w.x = ctx.ox.x + ctx.ox.dir * 34 * sc * 0.85;
    w.dir = ctx.ox.dir;
    w.mv = ctx.ox.st === 'go';
    w.pose = w.mv ? 'walk' : 'stand';
    if (w.mv) w.ph += dt * 9;
  } else if (r === 'water') {
    const WX = 1040, TX = world.props[7].x;
    if (w.st === 'toWell') {
      w.carry = false;
      w.pose = 'walk';
      if (walkTo(w, WX + 16 * sc, dt, sc)) { w.st = 'fill'; w.t = 0; }
    } else if (w.st === 'fill') {
      w.pose = 'stand';
      w.dir = -1;
      w.t += dt;
      if (w.t > 1) { w.carry = true; w.st = 'toTrough'; }
    } else if (w.st === 'toTrough') {
      w.pose = 'carry';
      if (walkTo(w, TX + 22 * sc, dt, sc, 0.9)) { w.st = 'pour'; w.t = 0; }
    } else if (w.st === 'pour') {
      w.pose = 'carry';
      w.dir = -1;
      w.t += dt;
      if (w.t > 0.9) { w.carry = false; w.st = 'toWell'; }
    }
  } else if (r === 'astro') {
    w.pose = 'scope';
    w.t -= dt;
    if (w.t <= 0) { w.t = rand(3.5, 6); fx.skyStar(); }
  }
}

/* --- carrying a block through the air --- */
function toss(w, dt, ctx) {
  w.t += dt;
  const p = ctx.world.parts[w.job];
  const u = Math.min(1, w.t / w.dur);
  const bx = w.sx + (p.cx - w.sx) * u;
  const by = w.sy + (p.cy - w.sy) * u - Math.sin(u * Math.PI) * 40;

  w.fly = { x: bx, y: by, on: true };
  w.rope = w.role === 'mason' ? { x1: w.x, y1: GROUND - 25 * ctx.sc, x2: bx, y2: by, on: true } : null;

  if (u >= 1) {
    w.fly = null;
    w.rope = null;
    ctx.fx.place(w.job);
    w.st = 'ret';
  }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
