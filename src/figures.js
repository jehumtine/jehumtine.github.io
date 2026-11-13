// figures.js — the carving vocabulary: people, animals, machines, buildings.
//
// Every function draws into a pen (see pen.js) at frieze coordinates:
// x along the band, y up from the band's lower edge. `g` is the ground line
// a figure stands on, `k` its scale (1 ≈ a standing figure 0.42 tall), `d`
// the direction it faces (1 = along the band, -1 = back).

const sin = Math.sin, cos = Math.cos;

// a limb from (x, y): angle a measured from straight down, + toward facing
function limb(p, x, y, a, l, d) {
  const x2 = x + sin(a) * l * d, y2 = y - cos(a) * l;
  p.seg(x, y, x2, y2);
  return [x2, y2];
}

/* ------------------------------------------------------------------ *
 * People
 * ------------------------------------------------------------------ */
// [front thigh, front shin], [back thigh, back shin], [front upper, fore], [back upper, fore]
export const POSES = {
  stand:  { lean: 0,     l: [[0.08, 0.02], [-0.08, -0.02]], a: [[0.15, 0.25], [-0.12, -0.05]] },
  walk:   { lean: 0.01,  l: [[0.42, 0.05], [-0.35, -0.5]],  a: [[-0.35, -0.1], [0.45, 0.9]] },
  march:  { lean: 0.005, l: [[0.35, 0.05], [-0.3, -0.45]],  a: [[0.9, 2.2], [0.3, 0.9]] },
  run:    { lean: 0.05,  l: [[0.75, 0.2], [-0.45, -1.05]],  a: [[1.0, 2.2], [-0.7, 0.5]] },
  carry:  { lean: 0,     l: [[0.28, 0.02], [-0.25, -0.35]], a: [[2.75, 3.05], [2.95, 3.2]] },
  haul:   { lean: -0.03, l: [[0.55, 0.15], [-0.25, -0.3]],  a: [[1.35, 1.5], [1.45, 1.6]] },
  hammer: { lean: 0.012, l: [[0.22, 0], [-0.2, -0.1]],      a: [[2.7, 1.9], [0.9, 1.5]] },
  point:  { lean: 0,     l: [[0.1, 0], [-0.1, 0]],          a: [[1.75, 1.85], [-0.1, 0.25]] },
  hail:   { lean: 0,     l: [[0.12, 0], [-0.1, 0]],         a: [[2.5, 2.7], [-0.1, 0.25]] },
  look:   { lean: -0.02, l: [[0.07, 0], [-0.07, 0]],        a: [[2.3, 2.6], [0.2, 0.35]] },
  write:  { lean: 0.005, l: [[0.1, 0], [-0.1, 0]],          a: [[1.25, 1.95], [0.5, 1.4]] },
  drive:  { lean: 0.03,  l: [[0.15, 0], [-0.15, 0]],        a: [[1.2, 1.45], [1.3, 1.6]] },
  bend:   { lean: 0.06,  l: [[0.2, 0], [-0.2, 0]],          a: [[0.6, 0.6], [0.4, 0.5]] },
  sit:    { lean: 0,     l: [[1.5, 0.05], [1.4, 0]],        a: [[1.0, 1.6], [0.8, 1.5]], seat: 1 },
};

export function man(p, x, g, o = {}) {
  const d = o.dir ?? 1, k = o.k ?? 1;
  const P = o.P || POSES[o.pose || 'walk'];
  const hipY = g + (P.seat ? 0.1 : 0.17) * k;
  const hip = [x, hipY];
  const neck = [x + P.lean * d * k * 2, hipY + 0.13 * k];

  p.seg(hip[0], hip[1], neck[0], neck[1]);
  const head = [neck[0] + P.lean * d * k * 0.6, neck[1] + 0.036 * k];
  p.circle(head[0], head[1], 0.025 * k, 12);

  // garment
  if (o.robe) {
    p.poly([[x - 0.025 * k, hipY + 0.06 * k], [x - 0.06 * k, g + 0.01 * k], [x + 0.06 * k, g + 0.01 * k], [x + 0.025 * k, hipY + 0.06 * k]]);
  } else if (!P.seat) {
    p.poly([[x - 0.028 * k, hipY + 0.05 * k], [x - 0.04 * k, hipY - 0.045 * k], [x + 0.04 * k, hipY - 0.045 * k], [x + 0.028 * k, hipY + 0.05 * k]]);
  }

  const feet = [];
  if (!o.robe) {
    P.l.forEach(([t, s]) => {
      const kn = limb(p, hip[0], hip[1], t, 0.09 * k, d);
      feet.push(limb(p, kn[0], kn[1], s, 0.085 * k, d));
    });
  }

  const sh = [neck[0], neck[1] - 0.012 * k];
  const hands = P.a.map(([u, f]) => {
    const el = limb(p, sh[0], sh[1], u, 0.07 * k, d);
    return limb(p, el[0], el[1], f, 0.065 * k, d);
  });

  if (o.helm) {
    p.arc(head[0], head[1] + 0.004 * k, 0.03 * k, 0, Math.PI, 8);
    p.seg(head[0] - 0.012 * d * k, head[1] + 0.034 * k, head[0] + 0.01 * d * k, head[1] + 0.045 * k);
  }
  if (o.shield) {
    const sx = x + d * 0.06 * k, sy = hipY - 0.06 * k;
    p.rect(sx - 0.028 * k, sy, 0.056 * k, 0.15 * k);
    p.circle(sx, sy + 0.075 * k, 0.01 * k, 6);
  }
  if (o.spear) {
    const h = hands[1];
    p.seg(h[0], g + 0.005, h[0], h[1] + 0.2 * k);
    p.poly([[h[0] - 0.008 * k, h[1] + 0.2 * k], [h[0], h[1] + 0.235 * k], [h[0] + 0.008 * k, h[1] + 0.2 * k]]);
  }
  if (o.cloak) {
    p.poly([[sh[0], sh[1]], [sh[0] - d * 0.06 * k, hipY - 0.02 * k], [sh[0] - d * 0.03 * k, hipY - 0.05 * k]]);
  }
  return { hands, head, neck, hip, feet, k, d };
}

export function soldier(p, x, g, o = {}) {
  return man(p, x, g, { helm: true, shield: true, pose: 'march', ...o });
}

/* ------------------------------------------------------------------ *
 * Animals and vehicles
 * ------------------------------------------------------------------ */
export function horse(p, x, g, o = {}) {
  const d = o.dir ?? 1, k = o.k ?? 1;
  const by = g + 0.155 * k;
  p.circle(x, by, 0.1 * k, 18, 0.042 * k);
  const X = (u) => x + d * u * k, Y = (v) => by + v * k;
  p.seg(X(0.075), Y(0.02), X(0.125), Y(0.12));
  p.seg(X(0.05), Y(0.035), X(0.105), Y(0.135));
  p.poly([[X(0.105), Y(0.135)], [X(0.135), Y(0.14)], [X(0.19), Y(0.085)], [X(0.178), Y(0.068)], [X(0.135), Y(0.095)], [X(0.125), Y(0.12)]]);
  p.seg(X(0.118), Y(0.138), X(0.112), Y(0.165));
  p.seg(X(-0.09), Y(0.015), X(-0.15), Y(-0.07));
  const fr = [X(0.06), Y(-0.03)], bk = [X(-0.065), Y(-0.03)];
  const legs = o.stand
    ? [[fr, 0.05, 0], [fr, -0.05, 0], [bk, 0.05, 0], [bk, -0.05, 0]]
    : [[fr, 0.55, 0.05], [fr, -0.05, -0.75], [bk, 0.35, 0.65], [bk, -0.55, -0.15]];
  legs.forEach(([o0, a, b]) => {
    const kn = limb(p, o0[0], o0[1], a, 0.06 * k, d);
    limb(p, kn[0], kn[1], b, 0.062 * k, d);
  });
  return { head: [X(0.18), Y(0.09)] };
}

export function chariot(p, x, g, o = {}) {
  const d = o.dir ?? 1, k = o.k ?? 1;
  horse(p, x + d * 0.06 * k, g + 0.035 * k, { dir: d, k: 0.95 * k });
  const h = horse(p, x, g, { dir: d, k });
  const cx = x - d * 0.21 * k, wy = g + 0.065 * k;
  p.circle(cx, wy, 0.065 * k, 18);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 4 + (o.spin || 0);
    p.seg(cx - cos(a) * 0.065 * k, wy - sin(a) * 0.065 * k, cx + cos(a) * 0.065 * k, wy + sin(a) * 0.065 * k);
  }
  p.poly([[cx - d * 0.045 * k, g + 0.075 * k], [cx + d * 0.06 * k, g + 0.075 * k], [cx + d * 0.075 * k, g + 0.16 * k], [cx + d * 0.035 * k, g + 0.18 * k]]);
  p.seg(cx + d * 0.065 * k, g + 0.1 * k, x - d * 0.06 * k, g + 0.13 * k);
  const dr = man(p, cx - d * 0.005 * k, g + 0.075 * k, { dir: d, k: 0.85 * k, pose: 'drive', helm: o.helm });
  dr.hands.forEach((hd) => p.seg(hd[0], hd[1], h.head[0], h.head[1] + 0.01 * k));
  // dust
  for (let i = 0; i < 4; i++) p.arc(cx - d * (0.1 + i * 0.05) * k, g + 0.02 * k, 0.02 * k * (1 + i * 0.4), 0, Math.PI, 6);
}

export function eagle(p, x, y, k = 1, d = 1) {
  p.poly([[x - 0.09 * k, y + 0.03 * k], [x - 0.045 * k, y + 0.045 * k], [x - 0.012 * k, y], [x + 0.012 * k, y], [x + 0.045 * k, y + 0.045 * k], [x + 0.09 * k, y + 0.03 * k]]);
  p.seg(x - 0.012 * k, y, x + d * 0.035 * k, y - 0.005 * k);
  p.seg(x - d * 0.012 * k, y, x - d * 0.04 * k, y - 0.012 * k);
}

export function drone(p, x, y, k = 1) {
  p.rect(x - 0.025 * k, y, 0.05 * k, 0.016 * k);
  [-1, 1].forEach((s) => {
    const mx = x + s * 0.075 * k;
    p.seg(x + s * 0.025 * k, y + 0.012 * k, mx, y + 0.02 * k);
    p.seg(mx, y + 0.012 * k, mx, y + 0.03 * k);
    p.circle(mx, y + 0.032 * k, 0.045 * k, 12, 0.006 * k);
    p.seg(x + s * 0.018 * k, y, x + s * 0.03 * k, y - 0.022 * k);
  });
  p.circle(x, y + 0.008 * k, 0.006 * k, 6);
}

/* ------------------------------------------------------------------ *
 * Standards, lettering, Victory
 * ------------------------------------------------------------------ */
export function aquila(p, x, g, k = 1) {
  const top = g + 0.6 * k;
  p.seg(x, g, x, top);
  for (let i = 0; i < 3; i++) p.circle(x, top - 0.16 * k - i * 0.055 * k, 0.017 * k, 8);
  p.seg(x - 0.04 * k, top - 0.05 * k, x + 0.04 * k, top - 0.05 * k);
  p.poly([[x - 0.07 * k, top + 0.06 * k], [x - 0.03 * k, top + 0.01 * k], [x, top + 0.03 * k], [x + 0.03 * k, top + 0.01 * k], [x + 0.07 * k, top + 0.06 * k]]);
  p.circle(x, top + 0.045 * k, 0.01 * k, 6);
}

export function vexillum(p, x, g, k = 1) {
  const top = g + 0.58 * k;
  p.seg(x, g, x, top);
  p.seg(x - 0.06 * k, top - 0.03 * k, x + 0.06 * k, top - 0.03 * k);
  p.rect(x - 0.05 * k, top - 0.15 * k, 0.1 * k, 0.12 * k);
  for (let i = 0; i < 5; i++) p.seg(x - 0.04 * k + i * 0.02 * k, top - 0.15 * k, x - 0.04 * k + i * 0.02 * k, top - 0.17 * k);
}

// Roman numerals as strokes — every letter we need is straight lines
export function numeral(p, cx, cy, h, str) {
  const w = h * 0.55, adv = (c) => (c === 'I' ? w * 0.55 : w * 1.15);
  let tot = 0;
  for (const c of str) tot += adv(c);
  let x = cx - tot / 2, y = cy - h / 2;
  for (const c of str) {
    const a = adv(c), m = x + a / 2 - (c === 'I' ? 0 : w * 0.075);
    if (c === 'I') p.seg(m, y, m, y + h);
    else if (c === 'V') { p.seg(m - w / 2, y + h, m, y); p.seg(m, y, m + w / 2, y + h); }
    else if (c === 'X') { p.seg(m - w / 2, y, m + w / 2, y + h); p.seg(m - w / 2, y + h, m + w / 2, y); }
    else if (c === 'L') { p.seg(m - w / 2, y + h, m - w / 2, y); p.seg(m - w / 2, y, m + w / 2, y); }
    x += a;
  }
}

// winged Victory writing the campaign's number on a shield — the frieze's
// own section break, exactly as on the real column
export function victory(p, x, g, num) {
  const k = 1.4;
  const v = man(p, x, g, { pose: 'write', k, robe: true });
  const [nx, ny] = v.neck;
  p.poly([[nx - 0.01, ny - 0.03], [nx - 0.12, ny + 0.14], [nx - 0.19, ny + 0.16], [nx - 0.17, ny + 0.06], [nx - 0.2, ny - 0.02], [nx - 0.13, ny - 0.1], [nx - 0.04, ny - 0.08]]);
  for (let i = 0; i < 4; i++) p.seg(nx - 0.04 - i * 0.03, ny - 0.06 + i * 0.02, nx - 0.09 - i * 0.025, ny + 0.06 + i * 0.02);
  const sx = x + 0.24, sy = g + 0.44;
  p.seg(sx, g, sx, sy - 0.12);
  p.rect(sx - 0.04, g, 0.08, 0.03);
  p.circle(sx, sy, 0.12, 24);
  p.circle(sx, sy, 0.105, 24);
  numeral(p, sx, sy, 0.085, num);
}

/* ------------------------------------------------------------------ *
 * Things
 * ------------------------------------------------------------------ */
export function tree(p, x, g, k = 1) {
  p.seg(x, g, x, g + 0.32 * k);
  p.seg(x, g + 0.2 * k, x + 0.06 * k, g + 0.28 * k);
  p.seg(x, g + 0.17 * k, x - 0.05 * k, g + 0.24 * k);
  [[0, 0.4, 0.08], [0.07, 0.31, 0.06], [-0.06, 0.28, 0.055], [0.03, 0.47, 0.05]].forEach(([dx, dy, r]) =>
    p.circle(x + dx * k, g + dy * k, r * k, 12, r * 0.7 * k));
}

export function tent(p, x, g, k = 1) {
  p.poly([[x - 0.09 * k, g], [x, g + 0.13 * k], [x + 0.09 * k, g]], true);
  p.poly([[x - 0.02 * k, g], [x, g + 0.06 * k], [x + 0.02 * k, g]]);
  p.seg(x, g + 0.13 * k, x + 0.14 * k, g + 0.11 * k);
  p.seg(x + 0.09 * k, g, x + 0.14 * k, g + 0.11 * k);
}

export function block(p, x, y, w = 0.07, h = 0.035) { p.rect(x - w / 2, y, w, h); }

// a wall of coursed blocks, height profile given per column of blocks
export function wall(p, x0, g, cols, prof, bw = 0.07, bh = 0.035) {
  for (let c = 0; c < cols; c++) {
    const rows = prof(c / Math.max(1, cols - 1));
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * bw * 0.5;
      if (c === cols - 1 && off) continue;
      p.rect(x0 + c * bw + off, g + r * bh, bw, bh);
    }
  }
}

export function treadCrane(p, x, g, k = 1) {
  const wy = g + 0.14 * k;
  p.circle(x, wy, 0.13 * k, 22);
  p.circle(x, wy, 0.11 * k, 22);
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI) / 6;
    p.seg(x - cos(a) * 0.11 * k, wy - sin(a) * 0.11 * k, x + cos(a) * 0.11 * k, wy + sin(a) * 0.11 * k);
  }
  p.seg(x - 0.08 * k, g, x, wy);
  p.seg(x + 0.08 * k, g, x, wy);
  const top = [x + 0.12 * k, g + 0.6 * k];
  p.seg(x - 0.02 * k, g, top[0], top[1]);
  p.seg(x + 0.16 * k, g, top[0], top[1]);
  p.seg(top[0], top[1], top[0] + 0.15 * k, top[1] + 0.03 * k);
  p.seg(top[0] + 0.15 * k, top[1] + 0.03 * k, top[0] + 0.15 * k, g + 0.3 * k);
  p.seg(x, wy, top[0], top[1]);
  block(p, top[0] + 0.15 * k, g + 0.26 * k, 0.08 * k, 0.04 * k);
  man(p, x, g + 0.03 * k, { pose: 'walk', k: 0.55 * k });
}

export function groma(p, x, g, k = 1) {
  const top = g + 0.42 * k;
  p.seg(x, g, x, top);
  p.seg(x - 0.08 * k, top, x + 0.08 * k, top);
  p.seg(x - 0.03 * k, top + 0.02 * k, x + 0.03 * k, top - 0.02 * k);
  [-0.08, 0.08].forEach((dx) => { p.seg(x + dx * k, top, x + dx * k, top - 0.12 * k); p.circle(x + dx * k, top - 0.13 * k, 0.008 * k, 6); });
}

export function arch(p, x, g, w, h) {
  const r = w / 2;
  p.seg(x - r, g, x - r, g + h - r);
  p.seg(x + r, g, x + r, g + h - r);
  p.arc(x, g + h - r, r, 0, Math.PI, 14);
  p.arc(x, g + h - r, r + 0.025, 0, Math.PI, 14);
}

export function punchCard(p, x, y, w = 0.075, h = 0.045) {
  p.poly([[x, y], [x + w, y], [x + w, y + h], [x + 0.01, y + h], [x, y + h - 0.01]], true);
  for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
    if ((r * 7 + c * 3) % 4 === 0) continue;
    const hx = x + 0.012 + c * (w - 0.024) / 4, hy = y + 0.01 + r * (h - 0.02) / 2;
    p.seg(hx - 0.003, hy, hx + 0.003, hy);
  }
}

export function loom(p, x, g, k = 1) {
  const w = 0.22 * k, h = 0.42 * k;
  p.seg(x, g, x, g + h);
  p.seg(x + w, g, x + w, g + h);
  p.seg(x - 0.02 * k, g + h, x + w + 0.02 * k, g + h);
  p.seg(x, g + 0.2 * k, x + w, g + 0.2 * k);
  for (let i = 1; i < 8; i++) p.seg(x + (i * w) / 8, g + 0.2 * k, x + (i * w) / 8, g + h - 0.05 * k);
  // the chain of punched cards — the beginning of the computing age
  for (let i = 0; i < 6; i++) punchCard(p, x + w * 0.1 + i * 0.012 * k, g + h + 0.01 * k + i * 0.05 * k, 0.07 * k, 0.04 * k);
}

export function chip(p, x, y, s) {
  p.rect(x - s / 2, y, s, s);
  p.rect(x - s * 0.3, y + s * 0.2, s * 0.6, s * 0.6);
  for (let i = 1; i < 3; i++) {
    p.seg(x - s * 0.3 + (i * s * 0.6) / 3, y + s * 0.2, x - s * 0.3 + (i * s * 0.6) / 3, y + s * 0.8);
    p.seg(x - s * 0.3, y + s * 0.2 + (i * s * 0.6) / 3, x + s * 0.3, y + s * 0.2 + (i * s * 0.6) / 3);
  }
  for (let i = 1; i < 6; i++) {
    const t = (i / 6) * s;
    p.seg(x - s / 2 + t, y, x - s / 2 + t, y - s * 0.08);
    p.seg(x - s / 2 + t, y + s, x - s / 2 + t, y + s * 1.08);
    p.seg(x - s / 2, y + t, x - s * 0.58, y + t);
    p.seg(x + s / 2, y + t, x + s * 0.58, y + t);
  }
}

export function furnace(p, x, g, k = 1) {
  p.arc(x, g, 0.13 * k, 0, Math.PI, 16, 0.2 * k);
  p.arc(x, g, 0.05 * k, 0, Math.PI, 8, 0.07 * k);
  p.rect(x - 0.025 * k, g + 0.18 * k, 0.05 * k, 0.12 * k);
  for (let i = 0; i < 3; i++) p.poly([[x - 0.03 * k + i * 0.03 * k, g + 0.02 * k], [x - 0.02 * k + i * 0.03 * k, g + 0.06 * k], [x - 0.03 * k + i * 0.03 * k, g + 0.09 * k]]);
  [0.32, 0.4, 0.47].forEach((h, i) => p.circle(x + 0.02 * k * i, g + h * k, (0.02 + i * 0.008) * k, 8));
}

export function anvil(p, x, g, k = 1) {
  p.poly([[x - 0.02 * k, g], [x - 0.012 * k, g + 0.06 * k], [x - 0.05 * k, g + 0.075 * k], [x + 0.05 * k, g + 0.085 * k], [x + 0.03 * k, g + 0.06 * k], [x + 0.02 * k, g]], true);
}

export function table(p, x, g, w = 0.2, h = 0.12) {
  p.seg(x - w / 2, g + h, x + w / 2, g + h);
  p.seg(x - w / 2 + 0.015, g, x - w / 2 + 0.015, g + h);
  p.seg(x + w / 2 - 0.015, g, x + w / 2 - 0.015, g + h);
}

export function plinth(p, x, g, w = 0.1, h = 0.1) {
  p.rect(x - w / 2, g, w, h);
  p.seg(x - w / 2 - 0.01, g + h, x + w / 2 + 0.01, g + h);
  return g + h;
}

export function chair(p, x, g, k = 1) {
  // a cantilever chair — the industrial-design anachronism
  p.poly([[x - 0.05 * k, g + 0.17 * k], [x - 0.045 * k, g + 0.08 * k], [x + 0.04 * k, g + 0.08 * k], [x + 0.03 * k, g], [x - 0.06 * k, g]]);
}

export function lamp(p, x, g, k = 1) {
  p.seg(x - 0.03 * k, g, x + 0.03 * k, g);
  p.poly([[x, g], [x - 0.02 * k, g + 0.12 * k], [x + 0.05 * k, g + 0.18 * k]]);
  p.arc(x + 0.06 * k, g + 0.16 * k, 0.03 * k, 0, Math.PI, 8);
}

export function amphora(p, x, g, k = 1) {
  const pts = [[0, 0], [0.025, 0.04], [0.035, 0.1], [0.02, 0.15], [0.012, 0.18], [0.016, 0.2]];
  p.poly(pts.map(([u, v]) => [x + u * k, g + v * k]));
  p.poly(pts.map(([u, v]) => [x - u * k, g + v * k]));
  p.arc(x + 0.02 * k, g + 0.16 * k, 0.015 * k, -1.5, 1.5, 6);
  p.arc(x - 0.02 * k, g + 0.16 * k, 0.015 * k, 1.64, 4.64, 6);
}

export function draftBoard(p, x, g, k = 1) {
  p.seg(x, g, x + 0.04 * k, g + 0.2 * k);
  p.seg(x + 0.1 * k, g, x + 0.06 * k, g + 0.2 * k);
  p.poly([[x - 0.05 * k, g + 0.18 * k], [x + 0.13 * k, g + 0.2 * k], [x + 0.1 * k, g + 0.32 * k], [x - 0.07 * k, g + 0.3 * k]], true);
  p.arc(x + 0.03 * k, g + 0.25 * k, 0.035 * k, 0.2, 2.6, 8);
  p.seg(x - 0.03 * k, g + 0.23 * k, x + 0.08 * k, g + 0.27 * k);
}

export function armarium(p, x, g, k = 1) {
  const w = 0.2 * k, h = 0.48 * k;
  p.rect(x - w / 2, g, w, h);
  p.poly([[x - w / 2 - 0.01, g + h], [x, g + h + 0.05 * k], [x + w / 2 + 0.01, g + h]]);
  for (let r = 0; r < 4; r++) {
    const y = g + 0.04 * k + r * 0.11 * k;
    p.seg(x - w / 2, y, x + w / 2, y);
    for (let c = 0; c < 5; c++) p.circle(x - w / 2 + 0.025 * k + c * 0.037 * k, y + 0.022 * k, 0.015 * k, 7);
  }
}

export function scroll(p, a, b) {
  p.circle(a[0], a[1], 0.012, 6);
  p.circle(b[0], b[1], 0.012, 6);
  p.seg(a[0], a[1] + 0.012, b[0], b[1] + 0.012);
  p.seg(a[0], a[1] - 0.012, b[0], b[1] - 0.012);
}

export function meta(p, x, g, k = 1) {
  p.rect(x - 0.07 * k, g, 0.14 * k, 0.04 * k);
  [-0.045, 0, 0.045].forEach((dx) => p.poly([[x + dx * k - 0.016 * k, g + 0.04 * k], [x + dx * k, g + 0.2 * k], [x + dx * k + 0.016 * k, g + 0.04 * k]]));
}

export function heads(p, x0, x1, y, step = 0.04, r = 0.014) {
  for (let x = x0; x < x1; x += step) {
    p.circle(x, y, r, 8);
    p.arc(x, y - r * 2.2, r * 1.6, 0.3, Math.PI - 0.3, 5);
  }
}

export function milestone(p, x, g, num, k = 1) {
  p.seg(x - 0.035 * k, g, x - 0.035 * k, g + 0.18 * k);
  p.seg(x + 0.035 * k, g, x + 0.035 * k, g + 0.18 * k);
  p.arc(x, g + 0.18 * k, 0.035 * k, 0, Math.PI, 8);
  p.rect(x - 0.045 * k, g, 0.09 * k, 0.02 * k);
  numeral(p, x, g + 0.11 * k, 0.04 * k, num);
}
