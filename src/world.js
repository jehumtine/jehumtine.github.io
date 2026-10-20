// world.js — the forum, as pure data. No DOM, no timing, no rendering.
//
// The forum is a dependency graph: every part lists the parts it rests on
// (`links`). Nothing may be placed until everything it links to is placed,
// which is what makes the build order, and the constellation, meaningful.

export const INK = '#f6f4ee';
export const BL = '#2a4357';
export const TUN = '#9fb3c4';

export const GROUND = 310; // y of the ground line, world units
export const JIB = -44; // y of the crane jib
export const CX = 660; // world x the viewport is centred on

/* ------------------------------------------------------------------ *
 * buildWorld() — assembles the forum and returns the graph.
 * Geometry below is hand-authored; do not "tidy" the numbers.
 * ------------------------------------------------------------------ */
export function buildWorld() {
  const P = [];

  const add = (o) => {
    o.i = P.length;
    P.push(o);
    return o.i;
  };

  // rectangle part
  const RR = (x, y, w, h, links, o = {}) => {
    o.t = 'r'; o.x = x; o.y = y; o.w = w; o.h = h;
    o.cx = x + w / 2; o.cy = y + h / 2; o.links = links;
    return add(o);
  };

  // line part
  const LL = (x1, y1, x2, y2, links, o = {}) => {
    o.t = 'l'; o.x1 = x1; o.y1 = y1; o.x2 = x2; o.y2 = y2;
    o.cx = (x1 + x2) / 2; o.cy = (y1 + y2) / 2; o.links = links;
    return add(o);
  };

  // path part
  const PP = (d, cx, cy, links, o = {}) => {
    o.t = 'p'; o.d = d; o.cx = cx; o.cy = cy; o.links = links;
    return add(o);
  };

  // paint (a filled block that gets painted, not lifted)
  const KK = (x, y, w, h, links) => {
    const q = RR(x, y, w, h, links, { paint: 1 });
    P[q].t = 'k';
    return q;
  };

  /* --- stylobate + colonnade --- */
  const s0 = RR(320, 298, 560, 12, []);
  const s1 = RR(340, 286, 520, 12, [s0]);

  const cols = [380, 490, 600, 710, 820];
  const dr = [];
  for (let l = 0; l < 4; l++) {
    for (let c = 0; c < 5; c++) {
      const lk = [l ? dr[(l - 1) * 5 + c] : s1];
      if (c) lk.push(dr[l * 5 + c - 1]);
      dr.push(RR(cols[c] - 14, 256 - l * 30, 28, 30, lk));
    }
  }

  /* --- architrave --- */
  const ar = [];
  for (let i = 0; i < 5; i++) {
    ar.push(RR(340 + i * 104, 142, 104, 24, [dr[15 + i]].concat(i ? [ar[i - 1]] : []), { h: 1 }));
  }

  const pl = LL(330, 142, 600, 84, [ar[0]], { h: 1 });
  const pr = LL(870, 142, 600, 84, [ar[4]], { h: 1 });
  RR(322, 130, 18, 12, [ar[0]]);
  RR(860, 130, 18, 12, [ar[4]]);

  /* --- dome, as a chain of chords --- */
  const dpt = (k) => {
    const a = Math.PI * (1 - k / 6);
    return [600 + 170 * Math.cos(a), 142 - 120 * Math.sin(a)];
  };
  const sg = [];
  for (let k = 0; k < 6; k++) {
    const A = dpt(k), B = dpt(k + 1);
    sg.push(LL(A[0], A[1], B[0], B[1],
      k ? [sg[k - 1]].concat(k === 5 ? [ar[4]] : []) : [ar[0]], { h: 1 }));
  }
  [1, 2, 4, 5].forEach((k) => {
    const B = dpt(k);
    LL(600, 22, B[0], B[1], [sg[k - 1], sg[k]], { h: 1 });
  });
  const oc = RR(588, 12, 24, 10, [sg[2], sg[3]], { h: 1 });
  add({ t: 's', cx: 600, cy: -10, links: [oc], h: 1 }); // the finial: a beacon

  /* --- flanking obelisks --- */
  [292, 908].forEach((cx) => {
    const o0 = RR(cx - 12, 250, 24, 60, []);
    const o1 = RR(cx - 9, 205, 18, 45, [o0]);
    const o2 = RR(cx - 6, 170, 12, 35, [o1]);
    LL(cx - 6, 170, cx, 148, [o2], { h: 1 });
    LL(cx + 6, 170, cx, 148, [o2], { h: 1 });
    PP('M' + (cx - 4) + ' 264L' + (cx - 4) + ' 296M' + cx + ' 264L' + cx + ' 296M' + (cx + 4) + ' 264L' + (cx + 4) + ' 296', cx, 280, [o0], { deco: 1 });
  });

  /* --- side porticoes --- */
  const wcols = [[100, 150, 200, 250], [1100, 1050, 1000, 950]];
  const wbeam = [80, 930];
  const corn = [];
  wcols.forEach((xs, wi) => {
    const top = [];
    xs.forEach((x) => {
      const d = [];
      for (let m = 0; m < 3; m++) d.push(RR(x - 10, 280 - m * 30, 20, 30, m ? [d[m - 1]] : []));
      top.push(d[2]);
    });
    const bm = RR(wbeam[wi], 196, 190, 24, top, { h: 1 });
    corn.push(RR(wbeam[wi] - 4, 188, 198, 8, [bm], { h: 1 }));
  });

  // the fluting on the main columns — sculptor work
  for (let c = 0; c < 5; c++) {
    add({ t: 'f', cx: cols[c], cy: 226, links: [dr[c], dr[5 + c], dr[10 + c], dr[15 + c]], deco: 1 });
  }

  /* --- pediment, entablature, metopes --- */
  for (let i = 0; i < 10; i++) RR(352 + i * 50, 148, 10, 14, [ar[Math.floor(i / 2)]]);

  const r1 = PP('M488 142A112 79 0 0 1 712 142', 600, 63, [sg[1], sg[4]], { h: 1 });
  PP('M535 142A65 46 0 0 1 665 142', 600, 96, [r1], { h: 1 });

  const pd = RR(584, 74, 32, 10, [pl, pr]);
  const ch = RR(574, 58, 52, 16, [pd], { h: 1 });
  LL(574, 58, 556, 46, [ch], { h: 1 });
  LL(626, 58, 644, 46, [ch], { h: 1 });

  wcols.forEach((xs, wi) => {
    const pi = [], ac = [];
    xs.forEach((x) => pi.push(RR(x - 7, 150, 14, 38, [corn[wi]])));
    for (let m = 0; m < 3; m++) {
      const xl = Math.min(xs[m], xs[m + 1]);
      const xr = Math.max(xs[m], xs[m + 1]);
      ac.push(PP('M' + (xl + 7) + ' 150A18 18 0 0 1 ' + (xr - 7) + ' 150', (xl + xr) / 2, 132, [pi[m], pi[m + 1]]));
    }
    const en = RR(wbeam[wi], 114, 190, 16, ac, { h: 1 });
    for (let m = 0; m < 3; m++) RR(wbeam[wi] + 30 + m * 65, 106, 10, 8, [en]);
    for (let m = 0; m < 3; m++) KK(wbeam[wi] + 8 + m * 61, 117, 52, 10, [en]);
  });

  /* --- the two masts with their beacon rings --- */
  [[395, 0], [805, 4]].forEach(([cx, idx]) => {
    const t0 = RR(cx - 15, 102, 30, 40, [ar[idx]]);
    const t1 = RR(cx - 13, 62, 26, 40, [t0]);
    const t2 = RR(cx - 11, 22, 22, 40, [t1]);
    const rl = LL(cx - 11, 22, cx, -8, [t2], { h: 1 });
    const rr = LL(cx + 11, 22, cx, -8, [t2], { h: 1 });
    add({ t: 's', cx, cy: -14, links: [rl, rr], h: 1, beacon: 1 });
  });

  /* --- the four doorways --- */
  [435, 545, 655, 765].forEach((mx) => {
    const nn = PP('M' + (mx - 20) + ' 286L' + (mx - 20) + ' 244A20 20 0 0 1 ' + (mx + 20) + ' 244L' + (mx + 20) + ' 286', mx, 224, [s1]);
    KK(mx - 17, 246, 34, 40, [nn]);
  });

  /* --- workshop stations, along the ground --- */
  const props = [
    { x: 170, pose: 'grind' },
    { x: 210, pose: 'saw', perm: 1 },
    { x: 250, pose: 'hammer', perm: 1, forge: 1 },
    { x: 360, pose: 'hammer', perm: 1, block: 1 },
    { x: 430, pose: 'scope', perm: 1, inst: 1 },
    { x: 800, pose: 'draw' },
    { x: 850, pose: 'plumb' },
    { x: 960, pose: 'mix', perm: 1 },
    { x: 520, pose: 'draw' },
    { x: 700, pose: 'saw' },
  ].map((o) => ({ ...o, who: null }));

  const lamps = [60, 125, 225, 975, 1075, 1105].map((x) => ({ x, on: false }));

  return { parts: P, props, lamps, cols };
}

/* ------------------------------------------------------------------ *
 * Build rules: what may be placed, and who places it.
 * ------------------------------------------------------------------ */
export function canPlace(p, role, placed) {
  if (p.claimed || placed[p.i]) return false;
  for (let q = 0; q < p.links.length; q++) if (!placed[p.links[q]]) return false;
  if (role === 'painter') return !!p.paint;
  if (p.paint) return false;
  if (role === 'crane') return !!p.h;
  if (role === 'sculptor') return !!p.deco;
  if (p.deco) return false;
  if (role === 'cart') return p.cy >= 268 && !p.h;
  if (role === 'mason') return p.cy >= 150 && !p.h;
  return true;
}

export function claim(world, placed, role) {
  for (let q = 0; q < world.parts.length; q++) {
    if (canPlace(world.parts[q], role, placed)) {
      world.parts[q].claimed = true;
      return q;
    }
  }
  return -1;
}

export function peek(world, placed, role) {
  for (let q = 0; q < world.parts.length; q++) if (canPlace(world.parts[q], role, placed)) return true;
  return false;
}

export function isNode(p) {
  return p.t === 'f' || p.t === 'k' || !!p.deco;
}

export function createBuildState() {
  return { placed: [], drawn: {} };
}

export function clearClaimFlags(world) {
  world.parts.forEach((p) => { p.claimed = false; });
}
