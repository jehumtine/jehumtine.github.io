// figures.js — how a worker is drawn. Pure geometry, no DOM.
//
// Two things live here:
//   costumeOps(role, n)  the hand-drawn tunic / headgear / tool for each trade
//   poseTargets(actor)   where the hands and feet go, given the current pose
//   limbPath(...)        two-bone IK that turns a foot target into a leg

import { INK, BL, TUN } from './world.js';

/* ------------------------------------------------------------------ *
 * costumeOps — a list of {tag, attrs} to be materialised into SVG.
 * Everything inherits stroke/fill from the actor group unless set here.
 * ------------------------------------------------------------------ */
export function costumeOps(role, n) {
  const ops = [];
  const Q = (d, a = {}) => ops.push({ tag: 'path', attrs: { ...a, d } });

  const long = role === 'architect' || role === 'astro';
  const apron = /^(sculptor|smith|stonecutter|mixer)$/.test(role);

  Q(long ? 'M-3.8 -17.6L3.8 -17.6L5.4 -1L-5.4 -1Z' : 'M-3.8 -17.6L3.8 -17.6L5 -6.3L-5 -6.3Z',
    { fill: TUN, stroke: 'none' });

  if (apron) Q('M-3 -15.5L3 -15.5L4 -6.3L-4 -6.3Z', { fill: BL, stroke: 'none' });
  else if (role === 'architect') Q('M-3.6 -17L4 -8', { stroke: BL, 'stroke-width': 1.8, fill: 'none' });
  else Q('M-4.4 -10.8L4.4 -10.8', { stroke: BL, 'stroke-width': 1.3, fill: 'none' });

  ops.push({ tag: 'circle', attrs: { cx: 0, cy: -21, r: 3.4, fill: INK, stroke: 'none' } });

  const cap = () => Q('M-3.7 -22.6Q0 -27.8 3.7 -22.6Z', { fill: BL, stroke: 'none' });
  const band = () => Q('M-3.6 -22.2L3.6 -22.2', { stroke: BL, 'stroke-width': 1.3, fill: 'none' });
  const brim = () => {
    Q('M-6 -23L6 -23', { stroke: BL, 'stroke-width': 1.6, fill: 'none' });
    Q('M-3.2 -23Q0 -28.5 3.2 -23Z', { fill: BL, stroke: 'none' });
  };

  if (role === 'climber') {
    Q('M-4.6 -22.4Q0 -30 4.6 -22.4Z', { fill: INK, stroke: BL, 'stroke-width': 0.9 });
    Q('M0 -29.4L0 -25.5', { stroke: BL, 'stroke-width': 1.2, fill: 'none' });
  } else if (role === 'painter') {
    Q('M-4.4 -19.5Q-4.4 -29 1.5 -34Q4.4 -28 4.4 -19.5Z', { fill: BL, stroke: INK, 'stroke-width': 0.8 });
  } else if (role === 'astro') {
    Q('M-3.9 -23L0 -35L3.9 -23Z', { fill: BL, stroke: INK, 'stroke-width': 0.8 });
  } else if (role === 'architect') {
    Q('M-4.2 -22.6Q0 -27 4.2 -22.6', { stroke: BL, 'stroke-width': 1.8, fill: 'none' });
  } else if (role === 'surveyor' || role === 'driver' || role === 'staff') {
    brim();
  } else if (role === 'mason' || role === 'cart' || role === 'lamp') {
    band();
  } else {
    cap();
  }

  // the foreman gets a plume
  if (role === 'mason' && n === 0) Q('M-5.2 -26Q0 -34 5.2 -26Z', { fill: BL, stroke: INK, 'stroke-width': 0.8 });

  return ops;
}

/* ------------------------------------------------------------------ *
 * Two-bone IK. Returns the path plus the clamped tip.
 * bias pulls the joint toward one side (elbows back, knees forward).
 * ------------------------------------------------------------------ */
export function limbPath(sx, sy, tx, ty, L, bias) {
  let dx = tx - sx, dy = ty - sy;
  let d = Math.hypot(dx, dy);
  const r = 2 * L - 0.4;

  if (d > r) {
    tx = sx + (dx * r) / d;
    ty = sy + (dy * r) / d;
    dx = tx - sx;
    dy = ty - sy;
    d = r;
  }
  if (d < 0.5) d = 0.5;

  const h = Math.sqrt(Math.max(0, L * L - (d * d) / 4));
  const nx = -dy / d, ny = dx / d;
  const sg = ny * bias.y + nx * bias.x >= 0 ? 1 : -1;
  const ex = sx + dx / 2 + nx * h * sg;
  const ey = sy + dy / 2 + ny * h * sg;

  return {
    d: 'M' + sx + ' ' + sy + 'L' + ex.toFixed(2) + ' ' + ey.toFixed(2) + 'L' + tx.toFixed(2) + ' ' + ty.toFixed(2),
    tx, ty,
  };
}

/* ------------------------------------------------------------------ *
 * poseTargets — the whole animation vocabulary of a worker.
 * Everything is expressed as hip and shoulder targets; limbs are solved.
 * ------------------------------------------------------------------ */
export function poseTargets(w) {
  const { pose: p, role: r, ph } = w;
  const sw = w.mv ? Math.sin(ph) * 4.2 : 0;

  let leg1, leg2, a1, a2, tool = null;

  if (p === 'climb') {
    leg1 = [2, -Math.max(0, Math.sin(ph)) * 5];
    leg2 = [2, -Math.max(0, -Math.sin(ph)) * 5];
  } else {
    leg1 = [sw, 0];
    leg2 = [-sw, 0];
  }

  if (p === 'carry') { a1 = [-4, -25]; a2 = [4, -25]; }
  else if (p === 'climb') { a1 = [3, -18 + Math.sin(ph) * 5]; a2 = [3, -18 - Math.sin(ph) * 5]; }
  else if (p === 'push') { a1 = [8, -11]; a2 = [8, -9]; }
  else if (p === 'chisel') {
    const sj = Math.sin(ph) * 4;
    a1 = [8, -15 + sj]; a2 = [6, -12]; tool = [8, -15 + sj, 14, -21 + sj];
  } else if (p === 'point') { a1 = [8, -24]; a2 = [5, -12]; }
  else if (p === 'scope') { a1 = [6, -15]; a2 = [5, -12]; tool = [4, -13, 19, -25]; }
  else if (p === 'lamp') { a1 = [5, -29.5]; a2 = [3, -9]; tool = [5, -8, 6.5, -37]; }
  else if (p === 'hammer') {
    const hy = -17 - Math.max(0, Math.sin(ph * 1.5)) * 9;
    a1 = [8, hy]; a2 = [6, -10]; tool = [8, hy, 12, hy - 6];
  } else if (p === 'saw') {
    const sx = 6 + Math.sin(ph * 1.4) * 3;
    a1 = [sx, -13]; a2 = [4, -11]; tool = [sx - 1, -13, sx + 12, -12];
  } else if (p === 'grind') {
    a1 = [6 + Math.cos(ph * 1.4) * 3, -14 + Math.sin(ph * 1.4) * 3]; a2 = [4, -10];
  } else if (p === 'mix') {
    const mx = 6 + Math.sin(ph * 1.2) * 4;
    a1 = [mx, -13]; a2 = [5, -11]; tool = [mx, -13, mx + 7, -2];
  } else if (p === 'draw') {
    a1 = [7, -13 + Math.sin(ph * 2) * 1.5]; a2 = [5, -12]; tool = [7, -13, 10, -8];
  } else if (p === 'plumb') { a1 = [6, -26]; a2 = [4, -10]; }
  else if (p === 'paint') {
    const py = -19 + Math.sin(ph) * 5;
    a1 = [9, py]; a2 = [-2, -14]; tool = [9, py, 14, py - 4];
  } else if (p === 'staff') {
    a1 = [4, -14]; a2 = [4, -19]; tool = [6, 0, 6 + Math.sin(ph) * 0.8, -44];
  } else if (p === 'sweep') {
    const sw2 = 5 + Math.sin(ph * 1.3) * 5;
    a1 = [sw2, -13]; a2 = [sw2 - 1, -11]; tool = [sw2 + 1, -22, sw2 + 8, 0];
  } else {
    a1 = [-sw * 0.6, -8]; a2 = [sw * 0.6, -8];
    if (r === 'lamp') tool = [3, -4, 3, -32];
    else if (r === 'driver') tool = [3, -9, 14, -22];
  }

  if (w.mv && p !== 'climb') {
    leg1[1] -= Math.max(0, Math.cos(ph)) * 2.2;
    leg2[1] -= Math.max(0, -Math.cos(ph)) * 2.2;
  }

  return { legs: [leg1, leg2], arms: [a1, a2], tool };
}

// which poses hold a tool tip (a small "star" at the working hand)
export const WORKING = /^(chisel|hammer|saw|grind|mix|draw|paint|scope|lamp)$/;
