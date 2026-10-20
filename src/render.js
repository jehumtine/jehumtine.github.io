// render.js — the scene: background, ghosts, placed parts, stars, props.
//
// Everything here is presentation. It reads the world graph and the view the
// camera hands it, and writes SVG. No simulation lives in this file.

import { el, V, S, clear } from './dom.js';
import { INK, BL, GROUND, JIB, isNode } from './world.js';

export function createScene(svg, world) {
  /* ---------------- groups, in paint order ---------------- */
  const gBg = el('g', {}, svg);
  const gBirds = el('g', {}, svg);
  const gScene = el('g', {}, svg);

  const gGround = el('line', {
    y1: GROUND, y2: GROUND, stroke: INK, 'stroke-opacity': 0.7, 'stroke-width': 1.2,
  }, gScene);
  const gGhost = el('g', { opacity: 0.22 }, gScene);
  const gLamps = el('g', {}, gScene);
  const gPile = el('g', {}, gScene);
  const gPieces = el('g', {}, gScene);
  const gLines = el('g', {}, gScene);
  const gStars = el('g', {}, gScene);
  const gCrane = el('g', { fill: 'none', stroke: INK, 'stroke-width': 1.2 }, gScene);
  const gProps = el('g', {}, gScene);
  const gPeople = el('g', {}, gScene);
  const gFx = el('g', {}, gScene);

  const grow = [];
  const sparks = [];
  let bgNodes = [];
  let seed = 5;
  const R = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  let vw = 0, vh = 0, s = 1, sc = 1.3, view = null;

  /* ---------------- ghosts: the unbuilt future ---------------- */
  function ghostParts() {
    clear(gGhost);
    const a = { fill: 'none', stroke: INK, 'stroke-width': 1, 'stroke-dasharray': '3 4' };
    world.parts.forEach((p) => {
      const q = { ...a };
      if (p.t === 'r') { q.x = p.x; q.y = p.y; q.width = p.w; q.height = p.h; el('rect', q, gGhost); }
      else if (p.t === 'l') { q.x1 = p.x1; q.y1 = p.y1; q.x2 = p.x2; q.y2 = p.y2; el('line', q, gGhost); }
      else if (p.t === 'p') { q.d = p.d; el('path', q, gGhost); }
      else if (p.t === 's') { q.cx = p.cx; q.cy = p.cy; q.r = 8; el('circle', q, gGhost); }
    });
  }

  /* ---------------- the crane ---------------- */
  const crane = { tx: 1000, len: 14, st: 'idle', t: 0, job: -1, hold: false };
  const MX = 1262;
  for (let y = GROUND; y > JIB + 22; y -= 22) {
    el('line', { x1: MX - 6, y1: y, x2: MX + 6, y2: y - 22 }, gCrane);
    el('line', { x1: MX + 6, y1: y, x2: MX - 6, y2: y - 22 }, gCrane);
  }
  el('line', { x1: MX - 6, y1: JIB, x2: MX - 6, y2: GROUND }, gCrane);
  el('line', { x1: MX + 6, y1: JIB, x2: MX + 6, y2: GROUND }, gCrane);
  el('line', { x1: 40, y1: JIB, x2: MX + 30, y2: JIB, 'stroke-width': 2.2 }, gCrane);
  [[MX, JIB - 34, 40, JIB], [MX, JIB - 34, MX + 30, JIB], [MX, JIB - 34, MX, JIB]].forEach((a) => {
    el('line', { x1: a[0], y1: a[1], x2: a[2], y2: a[3], 'stroke-width': 0.8 }, gCrane);
  });
  el('rect', { x: MX - 22, y: JIB + 2, width: 14, height: 11, fill: BL }, gCrane);
  el('circle', { cx: MX - 15, cy: JIB + 7, r: 2.2, fill: INK }, gCrane);
  el('rect', { x: MX + 12, y: JIB + 2, width: 12, height: 8, fill: 'rgba(246,244,238,.3)' }, gCrane);

  crane.tr = el('rect', { y: JIB, width: 12, height: 5, fill: INK }, gCrane);
  crane.cb = el('line', { stroke: INK, 'stroke-width': 1 }, gCrane);
  crane.hk = el('circle', { r: 2.2, fill: INK }, gCrane);
  crane.bk = el('rect', { width: 26, height: 10, fill: 'rgba(246,244,238,.4)', visibility: 'hidden' }, gCrane);

  function drawCrane(c) {
    c.tr.setAttribute('x', c.tx - 6);
    c.cb.setAttribute('x1', c.tx);
    c.cb.setAttribute('y1', JIB + 5);
    c.cb.setAttribute('x2', c.tx);
    c.cb.setAttribute('y2', JIB + c.len);
    c.hk.setAttribute('cx', c.tx);
    c.hk.setAttribute('cy', JIB + c.len);
    c.bk.setAttribute('x', c.tx - 13);
    c.bk.setAttribute('y', JIB + c.len + 1);
    V(c.bk, c.hold);
  }

  /* ---------------- lamps ---------------- */
  function drawLamps() {
    clear(gLamps);
    world.lamps.forEach((L) => {
      el('line', { x1: L.x, y1: GROUND, x2: L.x, y2: GROUND - 30, stroke: INK, 'stroke-width': 1.4 }, gLamps);
      el('circle', {
        cx: L.x, cy: GROUND - 34, r: 3.2,
        fill: L.on ? INK : BL, stroke: INK, 'stroke-width': 1.3,
      }, gLamps);
      if (L.on) {
        el('circle', {
          cx: L.x, cy: GROUND - 34, r: 9, fill: 'none', stroke: INK,
          'stroke-opacity': 0.6, 'stroke-width': 1, class: 'glow',
        }, gLamps);
      }
    });
  }

  /* ---------------- workshop stations + well + wheel ---------------- */
  function drawProps() {
    clear(gProps);
    const k = sc / 1.3;

    world.props.forEach((q) => {
      const g = el('g', { fill: 'none', stroke: INK, 'stroke-width': 1.4, transform: 'translate(' + q.x + ',' + GROUND + ') scale(' + k + ')' }, gProps);

      if (q.inst) {
        el('line', { x1: -9, y1: 0, x2: 0, y2: -16 }, g);
        el('line', { x1: 9, y1: 0, x2: 0, y2: -16 }, g);
        el('line', { x1: 0, y1: 0, x2: 0, y2: -16 }, g);
        el('rect', { x: -4, y: -21, width: 8, height: 5, fill: 'rgba(246,244,238,.3)' }, g);
        el('line', { x1: 0, y1: -21, x2: 8, y2: -27 }, g);
      } else if (q.block) {
        el('rect', { x: -9, y: -9, width: 18, height: 9, fill: 'rgba(246,244,238,.2)' }, g);
        el('line', { x1: -2, y1: -9, x2: 0, y2: -13 }, g);
      } else if (q.pose === 'grind') {
        el('circle', { cx: 0, cy: -14, r: 7 }, g);
        el('line', { x1: -6, y1: 0, x2: 0, y2: -14 }, g);
        el('line', { x1: 6, y1: 0, x2: 0, y2: -14 }, g);
        q.sp = el('line', { x1: 0, y1: -14, x2: 6, y2: -14 }, g);
      } else if (q.pose === 'saw') {
        el('line', { x1: -9, y1: 0, x2: -3, y2: -11 }, g);
        el('line', { x1: 9, y1: 0, x2: 3, y2: -11 }, g);
        el('line', { x1: -3, y1: -11, x2: 3, y2: -11 }, g);
        el('rect', { x: -13, y: -14, width: 26, height: 3, fill: 'rgba(246,244,238,.2)' }, g);
      } else if (q.pose === 'hammer') {
        el('rect', { x: -5, y: -7, width: 10, height: 7 }, g);
        el('path', { d: 'M-9 -9 L9 -9 L5 -13 L-6 -13 Z', fill: 'rgba(246,244,238,.2)' }, g);
        if (q.forge) {
          el('path', { d: 'M16 0 L28 0 L25 -8 L19 -8 Z' }, g);
          q.fl = el('path', { fill: INK, 'fill-opacity': 0.75, stroke: 'none' }, g);
        }
      } else if (q.pose === 'mix') {
        el('path', { d: 'M-12 -9 L12 -9 L9 0 L-9 0 Z' }, g);
        el('path', { d: 'M-8 -9 Q0 -15 8 -9' }, g);
      } else if (q.pose === 'draw') {
        el('rect', { x: -12, y: -14, width: 24, height: 3 }, g);
        el('line', { x1: -10, y1: -11, x2: -10, y2: 0 }, g);
        el('line', { x1: 10, y1: -11, x2: 10, y2: 0 }, g);
        el('rect', { x: -6, y: -18, width: 12, height: 4, fill: 'rgba(246,244,238,.3)' }, g);
      } else {
        el('line', { x1: 0, y1: 0, x2: 0, y2: -40 }, g);
        el('line', { x1: 0, y1: -40, x2: 14, y2: -40 }, g);
        q.sl = el('line', { x1: 14, y1: -40, x2: 14, y2: -20 }, g);
        q.bob = el('circle', { cx: 14, cy: -19, r: 2.2, fill: INK }, g);
      }
    });

    // the well
    const wg = el('g', { fill: 'none', stroke: INK, 'stroke-width': 1.4, transform: 'translate(1040,' + GROUND + ') scale(' + k + ')' }, gProps);
    el('ellipse', { cx: 0, cy: -12, rx: 10, ry: 3 }, wg);
    el('line', { x1: -10, y1: -12, x2: -10, y2: 0 }, wg);
    el('line', { x1: 10, y1: -12, x2: 10, y2: 0 }, wg);
    el('line', { x1: -9, y1: -12, x2: -9, y2: -34 }, wg);
    el('line', { x1: 9, y1: -12, x2: 9, y2: -34 }, wg);
    el('line', { x1: -12, y1: -34, x2: 0, y2: -40 }, wg);
    el('line', { x1: 12, y1: -34, x2: 0, y2: -40 }, wg);
    el('line', { x1: 0, y1: -38, x2: 0, y2: -22 }, wg);
    el('rect', { x: -3, y: -22, width: 6, height: 5 }, wg);

    drawWheel();
  }

  /* ---------------- the treadmill wheel ---------------- */
  const tw = { spokes: [], rope: null, bk: null, l1: null, l2: null };

  const WHEEL = { cx: 1180, cy: 262 };

  function drawWheel() {
    const { cx, cy } = WHEEL;
    const r = 24;
    const g = el('g', { fill: 'none', stroke: INK, 'stroke-width': 1.4 }, gProps);

    el('line', { x1: cx - 26, y1: GROUND, x2: cx, y2: cy }, g);
    el('line', { x1: cx + 26, y1: GROUND, x2: cx, y2: cy }, g);
    el('circle', { cx, cy, r }, g);
    el('circle', { cx, cy, r: r - 5, 'stroke-opacity': 0.5 }, g);

    tw.spokes = [];
    for (let m = 0; m < 8; m++) tw.spokes.push(el('line', { x1: cx, y1: cy, x2: cx + r, y2: cy }, g));

    // the post and bucket
    el('line', { x1: 1128, y1: GROUND, x2: 1128, y2: 168 }, g);
    el('line', { x1: 1128, y1: 168, x2: 1146, y2: 171 }, g);
    el('circle', { cx: 1128, cy: 168, r: 3, fill: INK }, g);
    el('line', { x1: cx - r, y1: cy - 6, x2: 1128, y2: 168, 'stroke-dasharray': '2 3' }, g);

    tw.rope = el('line', { x1: 1128, y1: 168, x2: 1128, y2: 260 }, g);
    tw.bk = el('rect', { x: 1121, y: 260, width: 14, height: 9, fill: 'rgba(246,244,238,.35)' }, g);

    // the walker
    el('circle', { cx, cy: cy + 11, r: 3.2, fill: BL }, g);
    el('line', { x1: cx, y1: cy + 14, x2: cx, y2: cy + 23 }, g);
    tw.l1 = el('line', { x1: cx, y1: cy + 23, x2: cx, y2: cy + 31 }, g);
    tw.l2 = el('line', { x1: cx, y1: cy + 23, x2: cx, y2: cy + 31 }, g);
  }

  function animateStations(t) {
    world.props.forEach((q) => {
      if (q.sp) {
        q.sp.setAttribute('x2', 6 * Math.cos(t * 3));
        q.sp.setAttribute('y2', -14 + 6 * Math.sin(t * 3));
      }
      if (q.sl) {
        const bx = 14 + Math.sin(t * 2) * 2.5;
        q.sl.setAttribute('x2', bx);
        q.bob.setAttribute('cx', bx);
      }
      if (q.fl) {
        const f = Math.sin(t * 14) * 2.5;
        q.fl.setAttribute('d', 'M19 -8 Q' + (22 + f) + ' -22 ' + 25 + ' -8 Z');
      }
    });
  }

  function animateWheel(t) {
    const { cx, cy } = WHEEL;
    tw.spokes.forEach((l, m) => {
      const an = t * 1.2 + (m * Math.PI) / 4;
      l.setAttribute('x2', cx + 24 * Math.cos(an));
      l.setAttribute('y2', cy + 24 * Math.sin(an));
    });
    const by = 232 + 55 * Math.sin(t * 0.5);
    const ss = Math.sin(t * 7) * 5;
    tw.rope.setAttribute('y2', by);
    tw.bk.setAttribute('y', by);
    S(tw.l1, cx + ss, cy + 31);
    S(tw.l2, cx - ss, cy + 31);
  }

  /* ---------------- placement: dashed intent becomes solid fact ---------------- */
  function ring(x, y, r) {
    const e = el('circle', { cx: x, cy: y, r, class: 'ring' }, gFx);
    setTimeout(() => e.remove(), 1500);
  }

  function place(i, build) {
    const p = world.parts[i];
    const rs = 3.2 / s;
    let e;

    if (p.t === 'r') {
      e = el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, fill: 'rgba(246,244,238,.16)', stroke: INK, 'stroke-width': 1.5 }, gPieces);
    } else if (p.t === 'l') {
      e = el('line', { x1: p.x1, y1: p.y1, x2: p.x2, y2: p.y2, stroke: INK, 'stroke-width': 2 }, gPieces);
    } else if (p.t === 'p') {
      e = el('path', { d: p.d, fill: 'none', stroke: INK, 'stroke-width': p.deco ? 1.2 : 2 }, gPieces);
    } else if (p.t === 'k') {
      e = el('rect', { x: p.x, y: p.y, width: p.w, height: p.h, fill: 'rgba(246,244,238,.3)' }, gPieces);
    } else if (p.t === 'f') {
      e = el('g', { stroke: INK, 'stroke-width': 1, 'stroke-opacity': 0.8 }, gPieces);
      [-7, 0, 7].forEach((d) => el('line', { x1: p.cx + d, y1: 168, x2: p.cx + d, y2: 284 }, e));
    }
    if (e) e.setAttribute('class', 'pin');

    build.placed[i] = true;
    if (isNode(p)) return;

    const st = el('circle', { cx: p.cx, cy: p.cy, r: p.t === 's' ? 5.5 / s : rs, fill: INK, class: 'star' }, gStars);
    st.style.animationDelay = (i % 7) * 0.4 + 's';
    ring(p.cx, p.cy, rs * 1.4);

    if (p.t === 's') {
      const d = 26 / s;
      el('line', { x1: p.cx, y1: p.cy - d, x2: p.cx, y2: p.cy + d, stroke: INK, 'stroke-width': 1 }, gStars);
      el('line', { x1: p.cx - d, y1: p.cy, x2: p.cx + d, y2: p.cy, stroke: INK, 'stroke-width': 1 }, gStars);
      el('circle', { cx: p.cx, cy: p.cy, r: 12 / s, fill: 'none', stroke: INK, 'stroke-width': 1, class: 'star' }, gStars);
    }

    if (p.beacon) {
      const bm = el('g', { class: 'beam', stroke: INK, 'stroke-opacity': 0.55, 'stroke-width': 1 }, gStars);
      bm.style.transformOrigin = p.cx + 'px ' + p.cy + 'px';
      el('line', { x1: p.cx, y1: p.cy, x2: p.cx + 110, y2: p.cy }, bm);
      el('line', { x1: p.cx, y1: p.cy, x2: p.cx - 110, y2: p.cy }, bm);
    }

    // draw every link whose two ends now exist
    world.parts.forEach((q) => {
      if (isNode(q)) return;
      q.links.forEach((a) => {
        const key = q.i + '-' + a;
        if (build.placed[q.i] && build.placed[a] && !isNode(world.parts[a]) && !build.drawn[key]) {
          build.drawn[key] = 1;
          const ln = el('line', {
            x1: world.parts[a].cx, y1: world.parts[a].cy,
            x2: world.parts[a].cx, y2: world.parts[a].cy,
            stroke: INK, 'stroke-opacity': 0.75, 'stroke-width': 1,
          }, gLines);
          grow.push({ e: ln, x1: world.parts[a].cx, y1: world.parts[a].cy, x2: q.cx, y2: q.cy, t: 0, sp: 1.3 });
        }
      });
    });
  }

  function advanceGrow(dt) {
    for (let i = grow.length - 1; i >= 0; i--) {
      const g = grow[i];
      g.t = Math.min(1, g.t + dt * g.sp);
      g.e.setAttribute('x2', g.x1 + (g.x2 - g.x1) * g.t);
      g.e.setAttribute('y2', g.y1 + (g.y2 - g.y1) * g.t);
      if (g.t >= 1) grow.splice(i, 1);
    }
  }

  function stepSparks(dt) {
    for (let i = sparks.length - 1; i >= 0; i--) {
      const sp = sparks[i];
      sp.t += dt;
      sp.x += sp.vx * dt;
      sp.y += sp.vy * dt;
      sp.vy += 220 * dt;
      sp.e.setAttribute('cx', sp.x);
      sp.e.setAttribute('cy', sp.y);
      sp.e.setAttribute('opacity', Math.max(0, 1 - sp.t / 0.5));
      if (sp.t > 0.5) { sp.e.remove(); sparks.splice(i, 1); }
    }
  }

  function spark(x, y) {
    const e = el('circle', { cx: x, cy: y, r: 1.3, fill: INK }, gFx);
    sparks.push({ e, x, y, vx: rand(-40, 40), vy: rand(-90, -30), t: 0 });
  }

  /* ---------------- stars the astronomer finds ---------------- */
  function skyStar() {
    const x = rand(vw * 0.05, vw * 0.95);
    const y = rand(vh * 0.04, vh * 0.45);
    const c = el('circle', { cx: x, cy: y, r: 2.6, fill: INK, class: 'spark' }, gBg);
    const rg = el('circle', { cx: x, cy: y, r: 3, class: 'ring' }, gBg);
    let ln = null;
    const t = bgNodes.length ? bgNodes[Math.floor(Math.random() * bgNodes.length)] : null;
    if (t) {
      ln = el('line', { x1: x, y1: y, x2: x, y2: y, stroke: INK, 'stroke-width': 1, class: 'sparkl' }, gBg);
      grow.push({ e: ln, x1: x, y1: y, x2: t[0], y2: t[1], t: 0, sp: 1.1 });
    }
    setTimeout(() => { c.remove(); rg.remove(); if (ln) ln.remove(); }, 9500);
  }

  /* ---------------- birds ---------------- */
  const birds = [];
  for (let i = 0; i < 6; i++) {
    birds.push({
      x: Math.random() * 800, y: 0, sp: rand(26, 60), ph: Math.random() * 6, yr: rand(0.06, 0.34),
      p: el('path', { fill: 'none', stroke: INK, 'stroke-width': 1.3, 'stroke-opacity': 0.8 }, gBirds),
    });
  }

  function drawBirds(dt, t) {
    birds.forEach((b) => {
      b.x += b.sp * dt;
      if (b.x > vw + 20) b.x = -20;
      b.ph += dt * 9;
      const y = vh * b.yr + Math.sin(t * 0.6 + b.sp) * 8;
      const f = Math.sin(b.ph) * 4;
      b.p.setAttribute('d', 'M' + (b.x - 6) + ' ' + (y - f) + ' L' + b.x + ' ' + y + ' L' + (b.x + 6) + ' ' + (y - f));
    });
  }

  /* ---------------- background sky ---------------- */
  function buildSky() {
    clear(gBg);
    bgNodes = [];
    seed = 5;

    const count = Math.round((vw * vh) / 9000);
    for (let m = 0; m < count; m++) {
      const st = el('circle', { cx: R() * vw, cy: R() * vh * 0.85, r: 0.7 + R() * 1.1, fill: INK, class: 'star' }, gBg);
      st.style.animationDelay = R() * 4 + 's';
      st.style.animationDuration = 3 + R() * 3 + 's';
    }

    const T = 22;
    for (let m = 0; m < 9; m++) {
      const x = R() * vw, y = R() * vh * 0.48;
      const nn = 4 + Math.floor(R() * 3);
      const ph = -R() * T;
      const pts = [[x, y]];
      for (let q = 1; q < nn; q++) {
        const pr = pts[q - 1];
        pts.push([
          clamp(pr[0] + (R() - 0.35) * 140, 24, vw - 24),
          clamp(pr[1] + (R() - 0.5) * 100, 24, vh * 0.58),
        ]);
      }
      pts.forEach((pt, q2) => {
        bgNodes.push(pt);
        const cn = el('circle', { cx: pt[0], cy: pt[1], r: 2.3, fill: INK, class: 'cn' }, gBg);
        cn.style.animationDuration = T + 's';
        cn.style.animationDelay = ph + q2 * 1.2 + 's';
        if (q2) {
          const pr2 = pts[q2 - 1];
          const len = Math.hypot(pt[0] - pr2[0], pt[1] - pr2[1]);
          const ln = el('line', {
            x1: pr2[0], y1: pr2[1], x2: pt[0], y2: pt[1],
            stroke: INK, 'stroke-width': 1, class: 'cl',
          }, gBg);
          ln.style.setProperty('--l', len + 'px');
          ln.style.animationDuration = T + 's';
          ln.style.animationDelay = ph + q2 * 1.2 - 0.5 + 's';
        }
      });
    }

    for (let m = 0; m < 3; m++) {
      const x1 = R() * vw * 0.6, y1 = R() * vh * 0.3;
      const sh = el('line', { x1, y1, x2: x1 - 44, y2: y1 - 22, stroke: INK, 'stroke-width': 1.3, class: 'shoot' }, gBg);
      sh.style.animationDuration = 13 + m * 5 + 's';
      sh.style.animationDelay = m * 4 + 2 + 's';
    }
  }

  /* ---------------- resize ---------------- */
  function resize(view_, vw_, vh_) {
    view = view_;
    vw = vw_;
    vh = vh_;
    s = view_.s;
    sc = view_.sc;

    svg.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);
    gScene.setAttribute('transform', 'translate(' + view_.tx + ',' + view_.ty + ') scale(' + s + ')');
    gGround.setAttribute('x1', view_.minX - 60);
    gGround.setAttribute('x2', view_.maxX + 60);

    // the delivery pile at the left edge of the world
    clear(gPile);
    const bw = 14 * sc, bh = 7 * sc;
    const pileX = Math.max(view_.minX + 14 * sc, 95);
    [[0, 0], [1, 0], [2, 0], [0.5, 1], [1.5, 1], [1, 2]].forEach((b) => {
      el('rect', {
        x: pileX + b[0] * bw * 1.04, y: GROUND - bh * (b[1] + 1),
        width: bw, height: bh,
        fill: 'rgba(246,244,238,.18)', stroke: INK, 'stroke-width': 1.2,
      }, gPile);
    });

    drawLamps();
    drawProps();
    ghostParts();
    buildSky();

    return { pileX, pickX: pileX + 3 * bw + 12 * sc };
  }

  /* ---------------- dog and ox ---------------- */
  function createDogFig() {
    const g = el('g', { fill: 'none', stroke: INK, 'stroke-width': 1.6 }, gPeople);
    el('line', { x1: -7, y1: -6, x2: 6, y2: -6 }, g);
    el('circle', { cx: 9, cy: -9, r: 2.6, fill: BL }, g);
    el('line', { x1: 8, y1: -11, x2: 9.5, y2: -14 }, g);
    return {
      g,
      tail: el('line', { x1: -7, y1: -6, x2: -11, y2: -11 }, g),
      f1: el('line', { x1: 5, y1: -6, x2: 5, y2: 0 }, g),
      f2: el('line', { x1: 5, y1: -6, x2: 5, y2: 0 }, g),
      b1: el('line', { x1: -5, y1: -6, x2: -5, y2: 0 }, g),
      b2: el('line', { x1: -5, y1: -6, x2: -5, y2: 0 }, g),
    };
  }

  function drawDog(d, fig) {
    const run = d.st === 'run';
    const dd = run ? Math.sin(d.ph) * 5 : 0;
    S(fig.f1, 5 + dd, 0);
    S(fig.f2, 5 - dd, 0);
    S(fig.b1, -5 - dd, 0);
    S(fig.b2, -5 + dd, 0);
    S(fig.tail, -11, -11 + Math.sin(d.ph * 1.4) * 3);
    fig.g.setAttribute('transform',
      'translate(' + d.x.toFixed(1) + ',' + GROUND + ') scale(' + (d.dir * sc * 0.8) + ',' + (sc * 0.8) + ')');
  }

  function createOxFig() {
    const g = el('g', { fill: 'none', stroke: INK, 'stroke-width': 1.6 }, gPeople);
    el('path', { d: 'M-14 -16 Q-14 -24 -4 -24 L10 -24 Q16 -24 16 -16 L16 -10 L-14 -10 Z', fill: '#9fb3c4' }, g);
    el('path', { d: 'M16 -21 L26 -17 L25 -12 L17 -12' }, g);
    el('line', { x1: 22, y1: -20, x2: 21, y2: -27 }, g);
    el('line', { x1: 25, y1: -18, x2: 28, y2: -24 }, g);
    el('line', { x1: -14, y1: -20, x2: -19, y2: -12 }, g);
    const legs = [-10, -5, 8, 13].map((x) => el('line', { x1: x, y1: -10, x2: x, y2: 0 }, g));
    el('line', { x1: -14, y1: -14, x2: -36, y2: -3 }, g);
    el('path', { d: 'M-68 0 Q-72 -3 -66 -3 L-36 -3' }, g);
    return { g, legs, blk: el('rect', { x: -64, y: -14, width: 24, height: 11, fill: 'rgba(246,244,238,.3)' }, g) };
  }

  function drawOx(o, fig) {
    fig.legs.forEach((l, m) => {
      S(l, Number(l.getAttribute('x1')) + (o.st === 'go' ? Math.sin(o.ph + m * 1.6) * 3 : 0), 0);
    });
    V(fig.blk, o.load);
    fig.g.setAttribute('transform',
      'translate(' + o.x.toFixed(1) + ',' + GROUND + ') scale(' + (o.dir * sc * 0.85) + ',' + (sc * 0.85) + ')');
  }

  /* ---------------- ladders ---------------- */
  function makeLadder(x, top, scl) {
    const g = el('g', { stroke: INK, 'stroke-width': 1.2, 'stroke-opacity': 0.8 }, gFx);
    const h = top + 6 * scl;
    el('line', { x1: x - 6 * scl, y1: GROUND, x2: x - 6 * scl, y2: GROUND - h }, g);
    el('line', { x1: x + 6 * scl, y1: GROUND, x2: x + 6 * scl, y2: GROUND - h }, g);
    for (let m = 10 * scl; m < h; m += 10 * scl) {
      el('line', { x1: x - 6 * scl, y1: GROUND - m, x2: x + 6 * scl, y2: GROUND - m }, g);
    }
    return g;
  }

  /* ---------------- the end of a cycle ---------------- */
  function fadePlaced() {
    [gPieces, gLines, gStars].forEach((g) => {
      g.style.transition = 'opacity 1.6s';
      g.style.opacity = 0;
    });
  }

  function unfadePlaced() {
    [gPieces, gLines, gStars].forEach((g) => {
      g.style.transition = 'none';
      g.style.opacity = 1;
    });
  }

  return {
    groups: { gBg, gBirds, gScene, gPeople, gFx, gPile },
    grow, sparks, birds, crane,
    resize, place, spark, skyStar, ring,
    advanceGrow, stepSparks,
    drawCrane, drawLamps, drawProps, ghostParts,
    animateStations, animateWheel, drawBirds,
    createDogFig, drawDog, createOxFig, drawOx, makeLadder,
    fadePlaced, unfadePlaced,
    clearPlaced() {
      clear(gPieces); clear(gLines); clear(gStars);
      grow.length = 0;
    },
  };
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rand = (a, b) => a + Math.random() * (b - a);
