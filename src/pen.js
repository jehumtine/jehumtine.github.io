// pen.js — drawing in frieze space.
//
// The frieze is a long band that winds up the column. Here it is flat:
// x runs along the band (world units), y runs across it (0 = the lower
// fillet, BAND = the upper). Everything is line segments; column.js wraps
// them onto the cylinder. Two inks: 'solid' for what is carved, 'dashed'
// for what is only laid out (the ordinatio — intent, not yet achievement).

export const BAND = 0.9;
export const GROUND = 0.06;

export function createPen() {
  const out = { solid: [], dashed: [] };
  let cur = out.solid;

  const p = {
    out,
    ink(m) { cur = out[m]; return p; },
    seg(x1, y1, x2, y2) { cur.push(x1, y1, x2, y2); },
    poly(pts, close) {
      for (let i = 0; i < pts.length - 1; i++) p.seg(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
      if (close) { const a = pts[pts.length - 1], b = pts[0]; p.seg(a[0], a[1], b[0], b[1]); }
    },
    arc(cx, cy, r, a0, a1, n = 12, ry = r) {
      const pts = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (i / n);
        pts.push([cx + r * Math.cos(a), cy + ry * Math.sin(a)]);
      }
      p.poly(pts);
    },
    circle(cx, cy, r, n = 14, ry = r) {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        pts.push([cx + r * Math.cos(a), cy + ry * Math.sin(a)]);
      }
      p.poly(pts, true);
    },
    rect(x, y, w, h) { p.poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]], true); },
    wave(x0, x1, y, amp, len) {
      const pts = [];
      for (let x = x0; x <= x1 + 1e-9; x += len / 8) pts.push([x, y + Math.sin(((x - x0) / len) * Math.PI * 2) * amp]);
      p.poly(pts);
    },
  };
  return p;
}

// deterministic randomness, so the frieze is the same carving every visit
export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
