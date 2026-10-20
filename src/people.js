// people.js — an actor's SVG and how it is posed each frame.
//
// createFigure() builds the body once. drawFigure() is called every frame and
// writes only what changed: leg/arm paths, tool, carried block, transform.

import { el, V } from './dom.js';
import { INK } from './world.js';
import { costumeOps, limbPath, poseTargets, WORKING } from './figures.js';

export function createFigure(w, gPeople, gFx) {
  const g = el('g', { fill: 'none', stroke: INK, 'stroke-width': 1.8 }, gPeople);

  // legs go behind the tunic, arms in front of it
  const leg1 = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2.8 }, g);
  const leg2 = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2.8 }, g);

  costumeOps(w.role, w.n).forEach((op) => el(op.tag, op.attrs, g));

  const arm1 = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2.4 }, g);
  const arm2 = el('path', { fill: 'none', stroke: INK, 'stroke-width': 2.4 }, g);

  const gl = el('circle', { r: 3.2, fill: 'none', stroke: INK, 'stroke-width': 1, class: 'star', visibility: 'hidden' }, g);
  const blk = el('rect', { x: -6, y: -31, width: 12, height: 6, fill: 'rgba(246,244,238,.4)', visibility: 'hidden' }, g);
  const tool = el('line', { x1: 0, y1: 0, x2: 0, y2: 0, 'stroke-width': 1.5, visibility: 'hidden' }, g);

  const scroll = el('rect', {
    x: 3, y: -17, width: 9, height: 5, fill: 'rgba(246,244,238,.5)',
    visibility: w.role === 'architect' || w.role === 'painter' ? 'visible' : 'hidden',
  }, g);

  let jar = null;
  if (w.role === 'water') {
    jar = el('path', { d: 'M-3 -27 Q-6 -33 -3 -36 L3 -36 Q6 -33 3 -27 Z', fill: 'rgba(246,244,238,.3)', visibility: 'hidden' }, g);
  }

  if (w.role === 'astro') {
    [[10, -11, 7, 0], [10, -11, 13, 0], [10, -11, 10, 0]].forEach((a) => {
      el('line', { x1: a[0], y1: a[1], x2: a[2], y2: a[3] }, g);
    });
  }

  const mat = el('rect', { x: 9, y: -4, width: 14, height: 4, fill: 'rgba(246,244,238,.25)', visibility: 'hidden' }, g);

  const cart = el('g', { visibility: w.role === 'cart' ? 'visible' : 'hidden' }, g);
  el('path', { d: 'M8 -9 L22 -9 L20 -2 L10 -2 Z' }, cart);
  el('circle', { cx: 15, cy: -1.6, r: 2 }, cart);
  el('line', { x1: 8, y1: -9, x2: 4, y2: -12 }, cart);
  const cblk = el('rect', { x: 12, y: -14, width: 8, height: 5, fill: 'rgba(246,244,238,.4)', visibility: 'hidden' }, cart);

  // thrown blocks and hoist ropes live above everybody else
  let fly = null, rope = null;
  if (w.role === 'mason' || w.role === 'cart') {
    fly = el('rect', { fill: 'rgba(246,244,238,.4)', stroke: INK, 'stroke-width': 1.2, visibility: 'hidden' }, gFx);
    rope = el('line', { stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '2 3', visibility: 'hidden' }, gFx);
  }

  return { g, leg1, leg2, arm1, arm2, gl, blk, tool, scroll, jar, mat, cart, cblk, fly, rope };
}

export function drawFigure(fig, w, sc) {
  const { legs, arms, tool: tl } = poseTargets(w);
  const r = w.role;

  limbTo(fig.leg1, 0, -7.5, legs[0][0], legs[0][1], 4.4, { x: 1, y: 0.2 });
  limbTo(fig.leg2, 0, -7.5, legs[1][0], legs[1][1], 4.4, { x: 1, y: 0.2 });

  const head = limbTo(fig.arm1, 0, -15.5, arms[0][0], arms[0][1], 7.2, { x: -0.6, y: 1 });
  limbTo(fig.arm2, 0, -15.5, arms[1][0], arms[1][1], 7.2, { x: 0.6, y: 1 });

  if (tl) {
    fig.tool.setAttribute('x1', tl[0]);
    fig.tool.setAttribute('y1', tl[1]);
    fig.tool.setAttribute('x2', tl[2]);
    fig.tool.setAttribute('y2', tl[3]);
    V(fig.tool, 1);
  } else V(fig.tool, 0);

  V(fig.blk, w.carry && r !== 'cart' && r !== 'water');
  if (fig.jar) V(fig.jar, w.carry);
  if (r === 'cart') V(fig.cblk, w.carry);

  const working = WORKING.test(w.pose);
  V(fig.gl, working);
  if (working) {
    fig.gl.setAttribute('cx', head.tx);
    fig.gl.setAttribute('cy', head.ty);
  }

  V(fig.mat, w.st === 'sweep' && (w.pose === 'hammer' || w.pose === 'saw'));

  if (fig.fly) {
    const f = w.fly;
    V(fig.fly, !!f);
    if (f) {
      fig.fly.setAttribute('x', f.x - 6 * sc);
      fig.fly.setAttribute('y', f.y - 3 * sc);
      fig.fly.setAttribute('width', 12 * sc);
      fig.fly.setAttribute('height', 6 * sc);
    }
    const rp = w.rope;
    V(fig.rope, !!rp);
    if (rp) {
      fig.rope.setAttribute('x1', rp.x1);
      fig.rope.setAttribute('y1', rp.y1);
      fig.rope.setAttribute('x2', rp.x2);
      fig.rope.setAttribute('y2', rp.y2);
    }
  }

  fig.g.setAttribute('transform',
    'translate(' + w.x.toFixed(1) + ',' + (w.by - w.y).toFixed(1) + ') scale(' + (w.dir * sc) + ',' + sc + ')');
}

function limbTo(e, sx, sy, tx, ty, L, bias) {
  const p = limbPath(sx, sy, tx, ty, L, bias);
  e.setAttribute('d', p.d);
  return p;
}
