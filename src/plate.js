// plate.js — the site as one engineering drawing.
//
// A blueprint sheet, white line on slate, with constellations turning slowly
// behind it. Up the right side stands a lattice tower, one tier per campaign,
// and the whole thing is a working site: people rivet, weld, paint, climb and
// carry on every tier, hoist cages run up the side, a materials yard works at
// the foot, and a tower crane on top builds the next tier toward the star.
// Each tier has a detail box with that campaign's drawing (frieze.js), and
// scrolling climbs the sheet, settling on each tier so its panel can be read.
//
// World units: one screen height = 1. y is up. x runs from the left edge of
// the sheet. Everything is drawn into one 2D canvas each frame.

import { createPen, seeded, GROUND } from './pen.js';
import { SCENES } from './frieze.js';
import { man, POSES } from './figures.js';
import { CAMPAIGNS, SUMMIT, KANJI_NUM } from './campaigns.js';

const T = 1;                         // tier height
const BASE = 0.35;                   // footing height
const N = CAMPAIGNS.length;
const TOP = BASE + N * T;            // top of the last listed tier
const FIRST = CAMPAIGNS.findIndex((c) => c.status !== 'done');
const B = FIRST < 0 ? N : FIRST;     // the tier under construction
const EXTRA = B === N;               // all listed tiers built: the crew starts an unnamed next one
const ZONE = BASE + B * T;           // bottom of the tier under construction
const DECK = ZONE + T / 3;           // the working deck
const STAR = EXTRA ? TOP + 0.93 : TOP + 0.62;
const TAPER = EXTRA ? TOP + T : TOP;

const INK = '#f6f4ee';
const BG = '#2a4357';
const FAINT = 'rgba(246,244,238,.5)';
const MONO = '"JetBrains Mono", ui-monospace, monospace';
const SERIF = '"Noto Serif JP", serif';

// camera stops: the ground, each tier, the summit
const STOPS = [0.38, ...CAMPAIGNS.map((_, i) => BASE + i * T + 0.5 * T), EXTRA ? TOP + 0.5 : STAR - 0.14];
// on a phone the window is shorter: sit lower at the ground, higher at the summit
const STOPS_M = [0.29, ...STOPS.slice(1, -1).map((y) => y + 0.07), EXTRA ? TOP + 0.6 : STAR - 0.14];
const IDS = ['intro', ...CAMPAIGNS.map((c) => c.id), SUMMIT.id];
const S = STOPS.length;

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, t) => a + (b - a) * t;
const sin = Math.sin, cos = Math.cos;

// the scene drawings, flat, in their own coordinates (x from 0, y 0..0.9)
const SCN = CAMPAIGNS.map((c, i) => {
  const p = createPen();
  p.seg(0, GROUND, c.len + 0.2, GROUND);
  SCENES[c.id](p, 0.1, c.len, seeded(i * 97 + 13));
  return { segs: p.out.solid, len: c.len + 0.2 };
});

/* ---------------- poses that move ---------------- */
function walkPose(ph) {
  const s = sin(ph), c = cos(ph);
  return {
    lean: 0.01,
    l: [[0.42 * s, 0.42 * s - 0.55 * Math.max(0, c)], [-0.42 * s, -0.42 * s - 0.55 * Math.max(0, -c)]],
    a: [[-0.35 * s, -0.25 * s + 0.15], [0.35 * s, 0.25 * s + 0.15]],
  };
}
function carryPose(ph) { const w = walkPose(ph); return { ...w, a: POSES.carry.a }; }
function climbPose(ph) {
  const s = sin(ph);
  return { lean: 0, l: [[0.9 + 0.45 * s, -0.5], [0.9 - 0.45 * s, -0.5]], a: [[2.6 + 0.3 * s, 2.95], [2.6 - 0.3 * s, 2.95]] };
}
const KNEEL = { seat: 1, lean: 0.05, l: [[1.45, 0.1], [0.25, -1.5]], a: [[1.15, 1.55], [0.6, 1.2]] };

// constellations behind the sheet, on a slower parallax layer
const PAR = 0.35;
const CONST = (() => {
  const r = seeded(31), out = [];
  const span = STAR * PAR + 1.2;
  for (let i = 0; i < Math.ceil(span * 4.5); i++) {
    const cx = r(), cy = -0.5 + r() * span, n = 4 + Math.floor(r() * 4);
    const pts = [];
    let x = 0, y = 0, a = r() * Math.PI * 2;
    for (let j = 0; j < n; j++) {
      pts.push([x, y]);
      a += (r() - 0.5) * 2.2;
      const d = 0.05 + r() * 0.07;
      x += cos(a) * d; y += sin(a) * d;
    }
    out.push({ cx, cy, pts, ph: r() * 20, per: 14 + r() * 10 });
  }
  return out;
})();
const DUST = (() => { const r = seeded(9), o = []; for (let i = 0; i < 420; i++) o.push([r(), -0.5 + r() * (STAR * PAR + 1.2), r() * 1.3 + 0.5, r() * 6]); return o; })();

// who works where on each finished tier: picked once, deterministic
const JOBS = ['carry', 'climb', 'paint', 'rivet', 'weld', 'carry2'];
const CREWS = CAMPAIGNS.map((_, i) => {
  const r = seeded(i * 41 + 5);
  const pool = [...JOBS];
  const picks = [];
  for (let k = 0; k < 5; k++) picks.push({ job: pool.splice(Math.floor(r() * pool.length), 1)[0], ph: r() * 10 });
  return picks;
});

export function createPlate(canvas) {
  const ctx = canvas.getContext('2d');
  let W = 1, H = 1, dpr = 1, s = 1, WW = 1;   // WW: sheet width in world units
  let M = false;                              // portrait: a window on the drawing, tower centred
  const seen = new Array(N).fill(-1);
  let drawIn = true;

  /* ---------------- layout, in world units ---------------- */
  const TX = () => (M ? 0.5 : 0.79) * WW;
  const HW0 = () => (M ? 0.17 : 0.068) * WW, HW1 = () => (M ? 0.1 : 0.04) * WW;
  const hw = (y) => lerp(HW0(), HW1(), clamp((y - BASE) / (TAPER - BASE)));
  const L = (y) => TX() - hw(y), R = (y) => TX() + hw(y);
  const BOX = () => ({ x0: 0.022 * WW, x1: 0.577 * WW });   // matches .panel in site.css

  /* ---------------- camera ---------------- */
  function camAt(p) {
    const st = M ? STOPS_M : STOPS;
    const f = clamp(p * (S - 1), 0, S - 1);
    const i = Math.min(S - 2, Math.floor(f));
    return lerp(st[i], st[i + 1], smooth(0.12, 0.88, f - i));
  }

  /* ---------------- drawing helpers ---------------- */
  let camY = 0;
  const X = (x) => x * s;
  const Y = (y) => H / 2 - (y - camY) * s;
  const solid = [], dashed = [], faint = [];
  const seg = (arr, x1, y1, x2, y2) => arr.push(X(x1), Y(y1), X(x2), Y(y2));
  const inView = (y, m = 0.6) => y > camY - m && y < camY + m;

  function strokeAll(arr, width, color, dash) {
    if (!arr.length) return;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i += 4) { ctx.moveTo(arr[i], arr[i + 1]); ctx.lineTo(arr[i + 2], arr[i + 3]); }
    ctx.lineWidth = width; ctx.strokeStyle = color; ctx.setLineDash(dash || []);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  function text(str, x, y, { size = 11, font = MONO, color = INK, align = 'left', base = 'alphabetic', weight = 400, spacing = 0 } = {}) {
    ctx.font = `${weight} ${size}px ${font}`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = base;
    if ('letterSpacing' in ctx) ctx.letterSpacing = spacing + 'px';
    ctx.fillText(str, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  function vtext(str, x, y, size, color = INK) {
    [...str].forEach((ch, i) => text(ch, x, y + i * size * 1.08, { size, font: SERIF, weight: 900, color, align: 'center', base: 'top' }));
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  // figures draw into a pen in world units; flush() moves them into the solid batch
  function flush(p) { const o = p.out.solid; for (let j = 0; j < o.length; j += 4) seg(solid, o[j], o[j + 1], o[j + 2], o[j + 3]); }

  /* ---------------- the sky behind the sheet ---------------- */
  function sky(now) {
    const py = camY * PAR;
    const SY = (y) => H / 2 - (y - py) * s;
    DUST.forEach(([u, y, r, tw]) => {
      if (y < py - 0.55 || y > py + 0.55) return;
      ctx.globalAlpha = 0.22 + 0.18 * sin(now * 1.3 + tw);
      ctx.fillStyle = INK; ctx.fillRect(u * W, SY(y), r, r);
    });
    ctx.lineWidth = 1; ctx.strokeStyle = INK;
    CONST.forEach((c, ci) => {
      if (c.cy < py - 0.75 || c.cy > py + 0.75 || (M && ci % 2)) return;
      // each constellation draws itself in, holds, and fades, on its own clock
      const t = ((now + c.ph) % c.per) / c.per;
      const grow = smooth(0, 0.35, t), fade = 1 - smooth(0.8, 1, t);
      const n = c.pts.length - 1, upto = grow * n;
      ctx.globalAlpha = 0.22 * fade;
      ctx.beginPath();
      for (let j = 0; j < n && j < upto; j++) {
        const f = Math.min(1, upto - j);
        const [x1, y1] = c.pts[j], [x2, y2] = c.pts[j + 1];
        ctx.moveTo(c.cx * W + x1 * s, SY(c.cy + y1));
        ctx.lineTo(c.cx * W + lerp(x1, x2, f) * s, SY(c.cy + lerp(y1, y2, f)));
      }
      ctx.stroke();
      ctx.globalAlpha = 0.6 * Math.max(0.25, fade);
      c.pts.forEach(([x, y], j) => {
        const r = j / n <= grow + 0.01 ? 2 : 1.2;
        circle(c.cx * W + x * s, SY(c.cy + y), r); ctx.fillStyle = INK; ctx.fill();
      });
    });
    ctx.globalAlpha = 1;
  }

  /* ---------------- the sheet: grid, ground, footing, yard ---------------- */
  function grid() {
    const y0 = camY - 0.55, y1 = camY + 0.55;
    ctx.beginPath();
    for (let y = Math.floor(y0 / 0.05) * 0.05; y < y1; y += 0.05) { ctx.moveTo(0, Y(y)); ctx.lineTo(W, Y(y)); }
    for (let x = 0; x < WW; x += 0.05) { ctx.moveTo(X(x), 0); ctx.lineTo(X(x), H); }
    ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(246,244,238,.03)'; ctx.stroke();
    ctx.beginPath();
    for (let y = Math.floor(y0 / 0.25) * 0.25; y < y1; y += 0.25) { ctx.moveTo(0, Y(y)); ctx.lineTo(W, Y(y)); }
    for (let x = 0; x < WW; x += 0.25) { ctx.moveTo(X(x), 0); ctx.lineTo(X(x), H); }
    ctx.strokeStyle = 'rgba(246,244,238,.06)'; ctx.stroke();
  }

  function footing() {
    if (camY > 1.2) return;
    const tx = TX(), w0 = HW0();
    seg(solid, 0, 0, WW, 0);
    for (let x = 0; x < WW; x += 0.03) seg(faint, x, 0, x - 0.03, -0.03);
    const steps = [[w0 * 2.1, 0, 0.12], [w0 * 1.5, 0.12, 0.24], [w0 * 1.15, 0.24, BASE]];
    steps.forEach(([hw2, a, b]) => {
      seg(solid, tx - hw2, a, tx - hw2, b); seg(solid, tx + hw2, a, tx + hw2, b); seg(solid, tx - hw2, b, tx + hw2, b);
      const xa = tx - hw2, xb = tx + hw2, hh = b - a;
      for (let c = xa - hh; c < xb; c += 0.03) {
        const sx = Math.max(c, xa), ex = Math.min(c + hh, xb);
        if (ex > sx) seg(faint, sx, a + (sx - c), ex, a + (ex - c));
      }
    });
    [-1, 1].forEach((d) => { for (let k = -1; k <= 1; k += 2) seg(solid, tx + d * w0 + k * 0.012, BASE, tx + d * w0 + k * 0.012, BASE - 0.08); });
    text('FOUNDATION · 基礎', X(tx - w0 * 2.1 - 0.03), Y(0.2), { size: 10, color: FAINT, spacing: 2, align: 'right' });
  }

  // the materials yard at the foot of the tower
  function yard(now) {
    if (camY > 1.1) return;
    const p = createPen(), k = 0.3, tx = TX(), edge = tx - HW0() * 2.1;
    // stacked girders
    const sx = edge - 0.62;
    for (let row = 0; row < 4; row++) for (let j = 0; j < 4 - row; j++) {
      const x = sx + j * 0.075 + row * 0.037, y = row * 0.022;
      p.rect(x, y, 0.07, 0.02); p.seg(x, y + 0.01, x + 0.07, y + 0.01);
    }
    // two people carrying a long beam between the stack and the footing
    const span = edge - 0.42 - (sx + 0.36), t = now * 0.09;
    const u = (sin(t * Math.PI * 2) + 1) / 2, dir = cos(t * Math.PI * 2) >= 0 ? 1 : -1;
    const bx = sx + 0.36 + u * span, ph = (u * span) / 0.05 * Math.PI;
    const a = man(p, bx, 0, { P: carryPose(ph), k, dir });
    const b2 = man(p, bx + 0.16, 0, { P: carryPose(ph + Math.PI), k, dir });
    const hy = Math.max(a.hands[0][1], b2.hands[0][1]);
    p.rect(bx - 0.05, hy, 0.26, 0.012);
    // a barrow, pushed back and forth
    const v = (sin(now * 0.4 + 1) + 1) / 2, wx = sx - 0.28 + v * 0.18, wd = cos(now * 0.4 + 1) >= 0 ? 1 : -1;
    const m = man(p, wx, 0, { P: { ...walkPose(v * 18), lean: 0.05, a: [[1.0, 0.9], [1.1, 1.0]] }, k, dir: wd });
    const hx = m.hands[0][0], hy2 = m.hands[0][1];
    p.circle(hx + wd * 0.1, 0.022, 0.022, 12);
    p.poly([[hx, hy2], [hx + wd * 0.1, 0.022], [hx + wd * 0.13, 0.07], [hx + wd * 0.03, 0.07], [hx, hy2]]);
    // the foreman, with the drawing
    const fm = man(p, sx - 0.42, 0, { pose: sin(now * 0.7) > 0.3 ? 'point' : 'write', k, dir: 1 });
    p.rect(fm.hands[1][0] - 0.01, fm.hands[1][1] - 0.025, 0.04, 0.03);
    // a winch, its rope running up to the first platform, a bucket riding it
    const wxx = edge - 0.06;
    p.circle(wxx, 0.04, 0.03, 14); p.seg(wxx - 0.04, 0, wxx, 0.04); p.seg(wxx + 0.04, 0, wxx, 0.04);
    const hm = man(p, wxx - 0.07, 0, { P: { ...POSES.haul, a: [[1.4 + 0.3 * sin(now * 4), 1.5], [1.5 + 0.3 * sin(now * 4), 1.6]] }, k, dir: 1 });
    p.seg(hm.hands[0][0], hm.hands[0][1], wxx, 0.07);
    const top = BASE + T, px = L(top) - 0.05;
    p.seg(wxx, 0.07, px, top + 0.01);
    p.circle(px, top + 0.01, 0.01, 8);
    const by = lerp(0.1, top - 0.08, (sin(now * 0.3) + 1) / 2);
    p.seg(px, top, px, by + 0.04);
    p.poly([[px - 0.025, by + 0.04], [px + 0.025, by + 0.04], [px + 0.018, by], [px - 0.018, by]], true);
    flush(p);
  }

  /* ---------------- the tower ---------------- */
  // which ink a member gets: done tiers solid, intended ones dashed, the
  // tier under construction partly built
  function inkFor(state, panel, which) {
    if (state === 'done') return solid;
    if (state === 'intent') return dashed;
    if (panel === 0) return solid;
    if (panel === 1) return which === 'l' ? solid : dashed;
    return dashed;
  }

  function tier(i) {
    const y0 = BASE + i * T, y1 = y0 + T, tx = TX();
    if (!inView((y0 + y1) / 2, 1.1)) return;
    const c = CAMPAIGNS[i];
    const state = i === B ? 'front' : c.status === 'done' ? 'done' : 'intent';
    const panels = i === N ? 2 : 3;
    for (let k = 0; k < panels; k++) {
      const a = y0 + (k * T) / 3, b = y0 + ((k + 1) * T) / 3, m = (a + b) / 2;
      const lk = inkFor(state, k, 'l'), xk = inkFor(state, k, 'x'), q = 0.013;
      [[L, 1], [R, -1]].forEach(([F, d]) => {
        seg(lk, F(a), a, F(b), b);
        seg(lk, F(a) + d * q, a, F(b) + d * q, b);
        if (lk === solid && !M) for (let y = a, z = 0; y < b - 1e-6; y += 0.028, z ^= 1) {
          const y2 = Math.min(b, y + 0.028);
          seg(faint, F(y) + (z ? d * q : 0), y, F(y2) + (z ? 0 : d * q), y2);
        }
      });
      seg(lk, L(b), b, R(b), b);
      seg(xk, L(a), a, R(b), b);
      seg(xk, R(a), a, L(b), b);
      seg(xk, L(m), m, tx, m + 0.03);
      seg(xk, R(m), m, tx, m + 0.03);
      if (xk === solid) {
        seg(faint, L(a), a, tx, m); seg(faint, R(a), a, tx, m);
        seg(faint, tx, m, L(b), b); seg(faint, tx, m, R(b), b);
      }
      if (lk === solid) [[L(a), a], [R(a), a], [L(b), b], [R(b), b]].forEach(([x, y]) => { circle(X(x), Y(y), 2.2); ctx.fillStyle = INK; ctx.fill(); });
    }
    if (i < N) {
      const pk = inkFor(state, 2, 'l');
      seg(pk, L(y1) - 0.035, y1, R(y1) + 0.035, y1);
      seg(pk, L(y1) - 0.035, y1 + 0.045, R(y1) + 0.035, y1 + 0.045);
      for (let x = L(y1) - 0.035; x <= R(y1) + 0.036; x += 0.035) seg(pk, x, y1, x, y1 + 0.045);
      dimension(i, y0, y1);
      balloon(i, y0 + 0.78 * T);
    } else {
      text('NEXT · 次', X(R(y0 + 0.5) + 0.04), Y(y0 + 0.5), { size: 10, color: FAINT, spacing: 2 });
    }
  }

  function dimension(i, y0, y1) {
    const c = CAMPAIGNS[i], xd = TX() + HW0() + 0.07;
    seg(faint, R(y0) + 0.01, y0, xd + 0.02, y0);
    seg(faint, R(y1) + 0.01, y1, xd + 0.02, y1);
    seg(faint, xd, y0, xd, y1);
    [[y0, 1], [y1, -1]].forEach(([y, d]) => { seg(faint, xd, y, xd - 0.008, y + d * 0.02); seg(faint, xd, y, xd + 0.008, y + d * 0.02); });
    const ym = Y((y0 + y1) / 2);
    ctx.save(); ctx.translate(X(xd) - 6, ym); ctx.rotate(-Math.PI / 2);
    text(`TIER ${c.n} · ${c.en.toUpperCase()}`, 0, 0, { size: 10, align: 'center', color: FAINT, spacing: 2 });
    ctx.restore();
    vtext(c.jp, X(xd) + 20, ym - (c.jp.length * 15 * 1.08) / 2, 15, c.status === 'done' ? INK : FAINT);
  }

  function balloon(i, y) {
    const c = CAMPAIGNS[i], bx = L(y) - 0.075;
    if (!c.wide) seg(faint, BOX().x1, y, bx - 0.028, y);
    circle(X(bx), Y(y), 0.028 * s);
    ctx.fillStyle = BG; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = INK; ctx.setLineDash(c.status === 'done' ? [] : [4, 3]); ctx.stroke(); ctx.setLineDash([]);
    text(c.n, X(bx), Y(y) + 1, { size: 12, align: 'center', base: 'middle', weight: 700 });
    seg(faint, bx + 0.028, y, L(y), y);
  }

  /* ---------------- the workers on each finished tier ---------------- */
  function sparks(p, x, y, dir, t) {
    for (let a = 0; a < 5; a++) {
      const an = dir + (a - 2) * 0.35 + 0.2 * sin(t * 37 + a);
      const r0 = 0.006, r1 = 0.018 + (0.012 * ((a * 7 + Math.floor(t * 20)) % 3)) / 2;
      p.seg(x + cos(an) * r0, y + sin(an) * r0, x + cos(an) * r1, y + sin(an) * r1);
    }
  }
  function riveter(p, ry, k, t) {
    const rx = L(ry);
    p.seg(rx - 0.12, ry, rx, ry);
    p.seg(rx - 0.12, ry, L(ry + 0.17), ry + 0.17); p.seg(rx - 0.002, ry, L(ry + 0.17), ry + 0.17);
    const f = (t * 1.4) % 1, strike = f < 0.15;
    const up = strike ? lerp(2.9, 1.5, f / 0.15) : lerp(1.5, 2.9, smooth(0.15, 0.6, f));
    const m = man(p, rx - 0.06, ry, { P: { lean: 0.01, l: POSES.hammer.l, a: [[up, up - 0.6], [1.35, 1.7]] }, k, dir: 1 });
    const hd = m.hands[0];
    p.seg(hd[0], hd[1], hd[0] + 0.012, hd[1] + 0.03);
    p.rect(hd[0] + 0.004, hd[1] + 0.028, 0.022, 0.011);
    if (strike) sparks(p, L(ry + 0.1) - 0.004, ry + 0.1, Math.PI * 0.6, t);
  }
  function ladder(p, lx, a, b) {
    p.seg(lx - 0.018, a, lx - 0.018, b); p.seg(lx + 0.018, a, lx + 0.018, b);
    for (let y = a + 0.02; y < b; y += 0.028) p.seg(lx - 0.018, y, lx + 0.018, y);
  }

  function work(i, now) {
    const y0 = BASE + i * T, y1 = y0 + T;
    if (!inView((y0 + y1) / 2, 1.1)) return;
    const p = createPen(), k = 0.26;
    CREWS[i].forEach(({ job, ph }) => {
      const t = now + ph;
      if (job === 'carry' || job === 'carry2') {
        // walking a girder with a beam on the shoulder
        const yy = job === 'carry' ? y1 : y0 + T / 3, x0 = L(yy) + 0.03, x1 = R(yy) - 0.03;
        const u = (sin(t * 0.35) + 1) / 2, dir = cos(t * 0.35) >= 0 ? 1 : -1;
        const m = man(p, lerp(x0, x1, u), yy, { P: carryPose((u * (x1 - x0)) / 0.05 * Math.PI), k, dir });
        p.rect(m.hands[0][0] - 0.07, m.hands[0][1], 0.14, 0.01);
      } else if (job === 'climb') {
        const lx = L(y0 + 0.5) + 0.05, a = y0 + 0.05, b = y0 + T / 3 + 0.25;
        ladder(p, lx, a, b + 0.12);
        const u = (sin(t * 0.3) + 1) / 2;
        man(p, lx + 0.004, lerp(a, b, u), { P: climbPose((u * (b - a)) / 0.03 * Math.PI), k, dir: -1 });
      } else if (job === 'paint') {
        // in a bosun's chair outside the right leg
        const yy = y0 + 0.3 + 0.12 * sin(t * 0.15), rx = R(yy) + 0.045;
        p.seg(rx, yy + 0.045, R(y1) + 0.03, y1);
        p.seg(rx - 0.03, yy + 0.01, rx + 0.025, yy + 0.01);
        const sw = sin(t * 3);
        const m = man(p, rx, yy - 0.09, { P: { ...POSES.sit, a: [[1.9 + 0.5 * sw, 2.3 + 0.5 * sw], [0.9, 1.3]] }, k, dir: -1 });
        p.seg(m.hands[0][0], m.hands[0][1], m.hands[0][0] - 0.015, m.hands[0][1] + 0.012);
      } else if (job === 'rivet') {
        riveter(p, y0 + 0.45, k, t);
      } else if (job === 'weld') {
        const yy = y0 + (2 * T) / 3;
        const m = man(p, lerp(L(yy), R(yy), 0.62), yy, { P: KNEEL, k, dir: -1 });
        const hd = m.hands[0];
        p.seg(hd[0], hd[1], hd[0] - 0.02, hd[1] - 0.015);
        if (sin(t * 23) > -0.2) sparks(p, hd[0] - 0.022, hd[1] - 0.017, Math.PI * 1.2, t * 3);
      }
    });
    flush(p);
  }

  // hoist cages running up a rail outside the right leg
  function hoist(now) {
    const p = createPen(), top = DECK;
    const rail = (y) => R(y) + 0.03;
    for (let y = Math.max(0, camY - 0.6); y < Math.min(top, camY + 0.6); y += 0.02) {
      const y2 = Math.min(top, y + 0.02);
      p.seg(rail(y), y, rail(y2), y2); p.seg(rail(y) + 0.05, y, rail(y2) + 0.05, y2);
    }
    for (let j = 0; j < 4; j++) {
      const u = (now * 0.012 + j / 4) % 1, tri = u < 0.5 ? u * 2 : 2 - u * 2;
      const y = lerp(0.02, top - 0.09, smooth(0, 1, tri));
      if (!inView(y, 0.65)) continue;
      const x = rail(y);
      p.rect(x + 0.002, y, 0.046, 0.08);
      p.seg(x + 0.002, y + 0.08, x + 0.025, y + 0.095); p.seg(x + 0.048, y + 0.08, x + 0.025, y + 0.095);
      man(p, x + 0.025, y + 0.004, { pose: 'stand', k: 0.18, dir: -1 });
    }
    flush(p);
  }

  /* ---------------- the crane and crew at the top ---------------- */
  function crane(now) {
    if (!inView(DECK, 0.9)) return;
    const p = createPen(), k = 0.26, tx = TX();
    for (let x = L(DECK) + 0.014; x < R(DECK) - 0.02; x += 0.022) p.seg(x, DECK, x + 0.016, DECK);
    // the tower crane: lattice mast, jib, counter-jib, cab, apex and ties
    const mx = R(DECK) - 0.04, mh = 0.42, jy = DECK + mh, mw = 0.022;
    p.seg(mx - mw, DECK, mx - mw, jy); p.seg(mx + mw, DECK, mx + mw, jy);
    for (let y = DECK, z = 0; y < jy - 1e-6; y += 0.03, z ^= 1) p.seg(mx + (z ? mw : -mw), y, mx + (z ? -mw : mw), Math.min(jy, y + 0.03));
    const jl = 0.5, cj = 0.16;
    p.seg(mx - jl, jy, mx + cj, jy); p.seg(mx - jl, jy + 0.02, mx + cj, jy + 0.02);
    for (let x = mx - jl, z = 0; x < mx + cj - 1e-6; x += 0.025, z ^= 1) p.seg(x, z ? jy : jy + 0.02, Math.min(mx + cj, x + 0.025), z ? jy + 0.02 : jy);
    p.seg(mx, jy + 0.02, mx, jy + 0.1);
    p.seg(mx, jy + 0.1, mx - jl, jy + 0.02); p.seg(mx, jy + 0.1, mx + cj, jy + 0.02);
    p.rect(mx + cj - 0.06, jy - 0.05, 0.05, 0.05);          // counterweight
    p.rect(mx - 0.045, jy - 0.05, 0.035, 0.045);            // cab
    // trolley runs along the jib; the load rises and falls
    const cyc = (now * 0.07) % 1;
    const tu = cyc < 0.5 ? smooth(0, 0.5, cyc) : 1 - smooth(0.5, 1, cyc);
    const trX = lerp(mx - 0.12, mx - jl + 0.04, tu);
    const drop = 0.08 + 0.32 * (0.5 - 0.5 * cos(cyc * Math.PI * 4));
    p.rect(trX - 0.015, jy - 0.012, 0.03, 0.012);
    const hookY = jy - 0.012 - drop;
    p.seg(trX, jy - 0.012, trX, hookY);
    p.seg(trX, hookY, trX - 0.04, hookY - 0.025); p.seg(trX, hookY, trX + 0.04, hookY - 0.025);
    p.rect(trX - 0.06, hookY - 0.04, 0.12, 0.015);
    p.seg(trX - 0.06, hookY - 0.033, trX + 0.06, hookY - 0.033);

    // the crew on the deck
    // the signaller stands out on the jib's walkway, calling the load in
    man(p, mx - 0.14, jy + 0.02, { pose: sin(now * 1.1) > 0 ? 'hail' : 'point', k: 0.22, dir: -1 });
    const w = man(p, lerp(L(DECK), R(DECK), 0.45), DECK, { P: KNEEL, k, dir: 1 });
    p.seg(w.hands[0][0], w.hands[0][1], w.hands[0][0] + 0.02, w.hands[0][1] - 0.015);
    if (sin(now * 19) > -0.3) sparks(p, w.hands[0][0] + 0.022, w.hands[0][1] - 0.017, -0.4, now * 3);
    const tg = man(p, L(DECK) + 0.03, DECK, { P: { ...POSES.haul, a: [[1.9, 2.1], [2.0, 2.2]] }, k, dir: -1 });
    p.seg(tg.hands[0][0], tg.hands[0][1], trX - 0.06, hookY - 0.04);   // tagline to the load
    riveter(p, DECK + 0.14, k, now * 1.07);
    const lx = L(ZONE + 0.2) + 0.05;
    ladder(p, lx, ZONE, DECK);
    const u = (sin(now * 0.4) + 1) / 2;
    man(p, lx + 0.004, lerp(ZONE + 0.02, DECK - 0.17, u), { P: climbPose(u * 30), k, dir: -1 });
    flush(p);
    if (!M) text('CREW AT WORK · 施工中', X(L(DECK) - 0.05), Y(DECK) + 4, { size: 10, align: 'right', color: FAINT, spacing: 2 });
  }

  /* ---------------- the detail boxes ---------------- */
  function detail(i, now) {
    const c = CAMPAIGNS[i];
    if (c.wide || M) return;       // on phones the drawing lives in the section instead
    const sc = SCN[i], box = BOX();
    const cy = STOPS[i + 1], top = cy + 0.43, bot = cy + 0.12;
    if (top < camY - 0.5 || bot > camY + 0.5) return;
    if (seen[i] < 0) seen[i] = now;
    const t = drawIn ? Math.min(1, (now - seen[i]) / 1.1) : 1;

    const head = 0.04, w = box.x1 - box.x0, h = top - bot - head;
    const rows = Math.max(1, Math.ceil(sc.len / (w / ((h / 2) / 0.9))));
    const k = Math.min((h / rows) / 0.9, (w * rows) / sc.len);
    const per = sc.len / rows;
    const fx0 = X(box.x0), fx1 = X(box.x1), fy0 = Y(top), fy1 = Y(bot);
    ctx.fillStyle = 'rgba(19,33,45,.6)'; ctx.fillRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    ctx.lineWidth = 1.4; ctx.strokeStyle = INK; ctx.strokeRect(fx0, fy0, fx1 - fx0, fy1 - fy0);
    ctx.lineWidth = 0.7; ctx.strokeRect(fx0 + 4, fy0 + 4, fx1 - fx0 - 8, fy1 - fy0 - 8);
    const hy = Y(top - head);
    ctx.beginPath(); ctx.moveTo(fx0 + 4, hy); ctx.lineTo(fx1 - 4, hy); ctx.stroke();
    text(`DETAIL ${c.n} — ${c.en.toUpperCase()}`, fx0 + 14, (fy0 + hy) / 2 + 1, { size: 11, base: 'middle', weight: 700, spacing: 2.5 });
    text(`詳細図 ${KANJI_NUM[i + 1]} · ${c.jp}   SCALE 1:${20 + i * 5}`, fx1 - 14, (fy0 + hy) / 2 + 1, { size: 11, base: 'middle', align: 'right', color: FAINT, spacing: 1.5 });

    const out = c.status === 'done' ? solid : dashed;
    const seg4 = sc.segs, n = Math.floor((seg4.length / 4) * t) * 4;
    const ox = box.x0 + (w - per * k) / 2;
    const put = (a, b, c2, d) => {
      const r = Math.min(rows - 1, Math.max(0, Math.floor(((a + c2) / 2) / per)));
      const gy = top - head - (r + 1) * (h / rows) + 0.004;
      seg(out, ox + (a - r * per) * k, gy + b * k, ox + (c2 - r * per) * k, gy + d * k);
    };
    for (let j = 0; j < n; j += 4) {
      const x1 = seg4[j], y1 = seg4[j + 1], x2 = seg4[j + 2], y2 = seg4[j + 3];
      const r1 = Math.min(rows - 1, Math.floor(x1 / per)), r2 = Math.min(rows - 1, Math.floor(x2 / per));
      if (r1 !== r2) {
        const xb = Math.max(r1, r2) * per, u = (xb - x1) / (x2 - x1), yb = y1 + (y2 - y1) * u;
        put(x1, y1, xb - 1e-6, yb); put(xb + 1e-6, yb, x2, y2);
      } else put(x1, y1, x2, y2);
    }
    for (let r = 1; r < rows; r++) {
      const yy = Y(top - head - r * (h / rows));
      ctx.save(); ctx.setLineDash([2, 5]); ctx.strokeStyle = FAINT; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(fx0 + 8, yy); ctx.lineTo(fx1 - 8, yy); ctx.stroke(); ctx.restore();
    }
  }

  /* ---------------- the star ---------------- */
  function star(now) {
    if (!inView(STAR, 0.7)) return;
    const tx = TX();
    // the tower's centre line, dash-dot, running on up to the star
    for (let y = Math.max(BASE, camY - 0.6); y < STAR - 0.08; y += 0.06) seg(faint, tx, y, tx, Math.min(STAR - 0.08, y + 0.035));
    const r = 0.06 * (1 + 0.08 * sin(now * 2));
    for (let a = 0; a < 8; a++) {
      const an = (a * Math.PI) / 4, rr = a % 2 ? r * 0.45 : r;
      seg(solid, tx, STAR, tx + cos(an) * rr, STAR + sin(an) * rr);
    }
    circle(X(tx), Y(STAR), 0.012 * s); ctx.fillStyle = INK; ctx.fill();
    text('星', X(tx) + 0.08 * s, Y(STAR) + 8, { size: 22, font: SERIF, weight: 900 });
  }

  /* ---------------- the sheet border, fixed to the screen ---------------- */
  function border() {
    if (M) return;
    const m = 8;
    ctx.lineWidth = 1; ctx.strokeStyle = FAINT; ctx.strokeRect(m, m, W - 2 * m, H - 2 * m);
    const cols = 'ABCDEFGH';
    for (let i = 0; i < 8; i++) {
      const x = m + ((W - 2 * m) * (i + 0.5)) / 8;
      text(cols[i], x, H - m - 4, { size: 9, align: 'center', color: FAINT });
      const xb = m + ((W - 2 * m) * i) / 8;
      if (i) { ctx.beginPath(); ctx.moveTo(xb, H - m); ctx.lineTo(xb, H - m - 6); ctx.stroke(); }
    }
  }

  /* ---------------- frame ---------------- */
  // dy shifts the camera up or down from the stop, in world units (the
  // phone interludes drift with their position on the screen)
  function frame(p, now, dy = 0) {
    camY = camAt(p) + dy;
    solid.length = dashed.length = faint.length = 0;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = BG; ctx.fillRect(0, 0, W, H);
    sky(now);
    grid();
    footing();
    yard(now);
    for (let i = 0; i <= (EXTRA ? N : N - 1); i++) tier(i);
    hoist(now);
    for (let i = 0; i < B; i++) work(i, now);
    crane(now);
    for (let i = 0; i < N; i++) detail(i, now);
    star(now);
    strokeAll(faint, 1, FAINT);
    strokeAll(dashed, 1.15, INK, [6, 5]);
    strokeAll(solid, 1.3, INK);
    border();
  }

  function resize(w, h, mobile = false) {
    W = w; H = h; M = mobile; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    s = M ? H / 0.75 : H;          // the phone window shows three quarters of a tier
    WW = W / s;
  }

  return {
    frame, resize,
    set drawIn(v) { drawIn = v; },
    stops: S,
    progressOf: (id) => Math.max(0, IDS.indexOf(id)) / (S - 1),
    sectionAt: (p) => IDS[Math.round(clamp(p * (S - 1), 0, S - 1))],
    tierAt: (p) => Math.min(N, Math.max(0, Math.round(p * (S - 1)))),
    elevation: (p) => camAt(p),
  };
}

// One campaign's drawing on its own small canvas, for the phone layout:
// laid out in rows to fit the width, plotted in up to fraction t.
export function drawScene(canvas, id, cssW, t = 1) {
  const i = CAMPAIGNS.findIndex((c) => c.id === id);
  if (i < 0 || !cssW) return;
  const sc = SCN[i], c = CAMPAIGNS[i];
  const rows = Math.max(2, Math.round(sc.len / 2.4)), pad = 6;
  const per = sc.len / rows, k = (cssW - pad * 2) / per, rowH = 0.9 * k;
  const cssH = Math.round(rows * rowH + pad * 2);
  const dpr = Math.min(2, devicePixelRatio || 1);
  if (canvas.width !== Math.round(cssW * dpr) || canvas.height !== Math.round(cssH * dpr)) {
    canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
    canvas.style.height = cssH + 'px';
  }
  const g = canvas.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.clearRect(0, 0, cssW, cssH);
  const put = (a, b, c2, d) => {
    const r = Math.min(rows - 1, Math.max(0, Math.floor(((a + c2) / 2) / per)));
    const base = pad + (r + 1) * rowH;
    g.moveTo(pad + (a - r * per) * k, base - b * k);
    g.lineTo(pad + (c2 - r * per) * k, base - d * k);
  };
  const seg4 = sc.segs, n = Math.floor((seg4.length / 4) * t) * 4;
  g.beginPath();
  for (let j = 0; j < n; j += 4) {
    const x1 = seg4[j], y1 = seg4[j + 1], x2 = seg4[j + 2], y2 = seg4[j + 3];
    const r1 = Math.min(rows - 1, Math.floor(x1 / per)), r2 = Math.min(rows - 1, Math.floor(x2 / per));
    if (r1 !== r2) {
      const xb = Math.max(r1, r2) * per, u = (xb - x1) / (x2 - x1), yb = y1 + (y2 - y1) * u;
      put(x1, y1, xb - 1e-6, yb); put(xb + 1e-6, yb, x2, y2);
    } else put(x1, y1, x2, y2);
  }
  g.lineWidth = 1.1; g.strokeStyle = INK; g.setLineDash(c.status === 'done' ? [] : [5, 4]);
  g.stroke();
  g.setLineDash([2, 5]); g.strokeStyle = FAINT; g.lineWidth = 1;
  g.beginPath();
  for (let r = 1; r < rows; r++) { g.moveTo(pad, pad + r * rowH + 0.5); g.lineTo(cssW - pad, pad + r * rowH + 0.5); }
  g.stroke(); g.setLineDash([]);
}
