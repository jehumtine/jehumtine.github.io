// frieze.js — the whole carved band, laid out flat.
//
// buildFrieze() lays the campaigns end to end, each preceded by a Victory
// writing its numeral, and returns plain segment arrays plus the x-range of
// every campaign. No DOM, no three.js: tools/frieze-check.mjs runs this.

import { createPen, seeded, BAND, GROUND } from './pen.js';
import { CAMPAIGNS } from './campaigns.js';
import {
  man, soldier, horse, chariot, eagle, drone, aquila, vexillum, victory, tree, tent, block, wall,
  treadCrane, groma, arch, punchCard, loom, chip, furnace, anvil, table, plinth, chair, lamp,
  amphora, draftBoard, armarium, scroll, meta, heads, milestone, numeral,
} from './figures.js';

export const RADIUS = 1;
export const TURN = 2 * Math.PI * RADIUS;
const LEAD = 0.5;      // blank band before the first Victory
const VIC = 0.78;      // a Victory and her shield
const TAIL = 0.9;

const g = GROUND;

// the runner — 10k every day — turns up somewhere in every campaign
const runner = (p, x) => man(p, x, g, { pose: 'run', k: 0.9 });

export const SCENES = {
  /* I — the beginning of the computing age. A river god lets the column
     begin, the legion crosses on a bridge of boats, and what it carries
     across is the punched card. */
  initium(p, x, L, r) {
    // the river god, reclining in the water
    const rx = x + 0.35;
    p.circle(rx + 0.12, g + 0.36, 0.05, 14);
    for (let i = 0; i < 5; i++) p.seg(rx + 0.09 + i * 0.015, g + 0.33, rx + 0.08 + i * 0.018, g + 0.24);
    p.poly([[rx + 0.1, g + 0.3], [rx - 0.15, g + 0.18], [rx - 0.25, g + 0.12]]);
    p.poly([[rx + 0.15, g + 0.32], [rx + 0.3, g + 0.38], [rx + 0.42, g + 0.42]]);
    p.poly([[rx - 0.25, g + 0.12], [rx + 0.2, g + 0.1], [rx + 0.32, g + 0.16]]);
    for (let i = 0; i < 4; i++) p.wave(x, x + 2.6, g + 0.02 + i * 0.03, 0.008, 0.12 + i * 0.02);
    // bridge of boats, legion crossing
    for (let i = 0; i < 9; i++) {
      const bx = x + 0.75 + i * 0.2;
      p.arc(bx, g + 0.12, 0.085, Math.PI, 2 * Math.PI, 8, 0.05);
      p.seg(bx - 0.085, g + 0.12, bx + 0.085, g + 0.12);
    }
    p.seg(x + 0.66, g + 0.14, x + 2.55, g + 0.14);
    for (let i = 0; i < 12; i++) {
      const sx = x + 0.82 + i * 0.145;
      if (i % 4 === 1) aquila(p, sx, g + 0.14, 0.9);
      else soldier(p, sx, g + 0.14, { spear: i % 2 === 0, k: 0.95 });
    }
    // the loom and its cards
    loom(p, x + 2.85, g);
    man(p, x + 2.78, g, { pose: 'sit', k: 0.95 });
    p.seg(x + 2.73, g + 0.1, x + 2.83, g + 0.1);
    for (let i = 0; i < 8; i++) {
      const sx = x + 3.35 + i * 0.16;
      const m = man(p, sx, g, { pose: 'carry', helm: i % 2 === 0, k: 0.95 });
      punchCard(p, m.hands[0][0] - 0.04, m.hands[0][1] + 0.005);
    }
    tree(p, x + 4.75, g + 0.35, 0.8);
    runner(p, x + 4.6);
    // adlocutio — the address to the troops
    p.rect(x + 5.05, g, 0.28, 0.1);
    man(p, x + 5.2, g + 0.1, { pose: 'hail', dir: 1, robe: true, k: 1.05, cloak: true });
    vexillum(p, x + 5.42, g, 1);
    for (let i = 0; i < 9; i++) {
      const sx = x + 5.6 + i * 0.14;
      if (sx > x + L - 0.1) break;
      soldier(p, sx, g, { pose: 'stand', dir: -1, spear: i % 3 === 0 });
      if (i % 3 === 1) soldier(p, sx + 0.06, g + 0.32, { pose: 'stand', dir: -1, k: 0.75 });
    }
  },

  /* II — Argon. Building the camp: walls going up course by course. */
  argon(p, x, L, r) {
    for (let i = 0; i < 9; i++) tent(p, x + 0.3 + i * 0.27, g + 0.5, 0.8);
    // the wall, rising toward a gate
    wall(p, x + 0.35, g, 21, (u) => 1 + Math.round(5 * Math.sin(Math.min(1, u * 1.15) * Math.PI / 2)));
    const gx = x + 1.9;
    p.rect(gx, g, 0.32, 0.38); p.rect(gx + 0.44, g, 0.32, 0.38);
    arch(p, gx + 0.38, g, 0.12, 0.28);
    for (let i = 0; i < 4; i++) { p.rect(gx + i * 0.08, g + 0.38, 0.05, 0.04); p.rect(gx + 0.44 + i * 0.08, g + 0.38, 0.05, 0.04); }
    wall(p, gx + 0.76, g, 12, (u) => Math.max(1, Math.round(6 - u * 5)));
    // workers carry blocks toward it
    for (let i = 0; i < 6; i++) {
      const m = man(p, x + 0.12 + i * 0.13, g + 0.3, { pose: i % 2 ? 'carry' : 'hammer', k: 0.7 });
      if (i % 2) block(p, m.hands[0][0], m.hands[0][1], 0.06, 0.03);
    }
    vexillum(p, gx + 0.38, g + 0.42, 0.7);
    treadCrane(p, x + 3.95, g, 1);
    for (let i = 0; i < 7; i++) {
      const sx = x + 4.45 + i * 0.15;
      const pose = ['carry', 'haul', 'carry', 'hammer', 'carry', 'walk', 'carry'][i];
      const m = man(p, sx, g, { pose, dir: -1, helm: i % 2 === 0 });
      if (pose === 'carry') block(p, m.hands[0][0] - 0.01, m.hands[0][1]);
    }
    runner(p, x + 5.6);
    groma(p, x + 5.9, g);
    man(p, x + 6.0, g, { pose: 'point', dir: -1, robe: true });
  },

  /* III — F1 Replay. The circus: chariots round the spina. */
  f1(p, x, L, r) {
    for (let i = 0; i < 7; i++) arch(p, x + 0.12 + i * 0.07, g, 0.055, 0.2);
    heads(p, x + 0.6, x + L - 0.2, g + 0.62, 0.042);
    heads(p, x + 0.62, x + L - 0.2, g + 0.69, 0.042);
    heads(p, x + 0.6, x + L - 0.2, g + 0.76, 0.042);
    p.seg(x + 0.55, g + 0.57, x + L - 0.15, g + 0.57);
    // the spina, with its turning posts and obelisk
    p.rect(x + 0.9, g + 0.3, L - 1.6, 0.05);
    meta(p, x + 0.85, g + 0.3, 0.9);
    meta(p, x + L - 0.65, g + 0.3, 0.9);
    const ox = x + L / 2;
    p.poly([[ox - 0.03, g + 0.35], [ox - 0.015, g + 0.55], [ox, g + 0.57], [ox + 0.015, g + 0.55], [ox + 0.03, g + 0.35]]);
    for (let i = 0; i < 7; i++) p.circle(x + 1.4 + i * 0.07, g + 0.39, 0.012, 6); // lap eggs
    [1.0, 2.15, 3.15, 4.35, 5.4].forEach((dx, i) => chariot(p, x + dx, g, { k: 1, spin: i * 0.4, helm: i === 2 }));
    runner(p, x + 6.35);
    // the timekeeper with his tablet — telemetry, on wax
    const t = man(p, x + 6.75, g, { pose: 'write', dir: -1, robe: true });
    p.rect(t.hands[0][0] - 0.07, t.hands[0][1] - 0.02, 0.07, 0.05);
    p.poly([[t.hands[0][0] - 0.065, t.hands[0][1] - 0.01], [t.hands[0][0] - 0.05, t.hands[0][1] + 0.015], [t.hands[0][0] - 0.035, t.hands[0][1]], [t.hands[0][0] - 0.02, t.hands[0][1] + 0.02], [t.hands[0][0] - 0.005, t.hands[0][1] + 0.01]]);
  },

  /* IV — Drones. The legion looks up: eagles and machines share the sky. */
  drones(p, x, L, r) {
    for (let i = 0; i < 8; i++) {
      const sx = x + 0.2 + i * 0.14;
      if (i === 2 || i === 6) aquila(p, sx, g, 1);
      else soldier(p, sx, g, { pose: i % 3 === 0 ? 'look' : 'stand', spear: i % 2 === 1 });
    }
    const lx = x + 1.55;
    const m = man(p, lx, g, { pose: 'hail', k: 1.05 });
    drone(p, m.hands[0][0] + 0.02, m.hands[0][1] + 0.03, 0.9);
    const R = r;
    for (let i = 0; i < 14; i++) {
      const dx = x + 1.9 + i * 0.24 + R() * 0.08;
      const dy = g + 0.38 + Math.sin(i * 0.9) * 0.14 + R() * 0.12;
      if (i % 4 === 3) eagle(p, dx, dy, 1.1);
      else drone(p, dx, dy, 0.95 + R() * 0.3);
    }
    for (let i = 0; i < 5; i++) {
      const sx = x + 2.2 + i * 0.3;
      man(p, sx, g, { pose: i % 2 ? 'look' : 'point', helm: true });
    }
    runner(p, x + 3.9);
    groma(p, x + 4.35, g);
    table(p, x + 4.75, g, 0.32, 0.13);
    drone(p, x + 4.67, g + 0.14, 0.9);
    drone(p, x + 4.84, g + 0.14, 0.7);
    man(p, x + 5.15, g, { pose: 'point', dir: -1, robe: true });
  },

  /* V — GPU. The forge, and the spoils carried in triumph: silicon. */
  gpu(p, x, L, r) {
    furnace(p, x + 0.35, g, 1.2);
    man(p, x + 0.62, g, { pose: 'haul', dir: -1 });
    [0.95, 1.4].forEach((dx) => {
      anvil(p, x + dx, g, 1);
      man(p, x + dx - 0.11, g, { pose: 'hammer' });
      man(p, x + dx + 0.12, g, { pose: 'hammer', dir: -1 });
    });
    chip(p, x + 1.18, g + 0.5, 0.14);
    // the ferculum: a die borne on a litter, like the spoils of Dacia
    const fx = x + 2.15;
    p.seg(fx - 0.25, g + 0.26, fx + 0.35, g + 0.26);
    p.rect(fx - 0.12, g + 0.27, 0.34, 0.03);
    chip(p, fx + 0.05, g + 0.33, 0.2);
    [-0.2, -0.05, 0.15, 0.3].forEach((dx) => man(p, fx + dx, g, { pose: 'carry', k: 0.82 }));
    for (let i = 0; i < 7; i++) {
      const sx = x + 2.85 + i * 0.16;
      const m = man(p, sx, g, { pose: i % 3 === 2 ? 'march' : 'carry', helm: true });
      if (i % 3 !== 2) chip(p, m.hands[0][0], m.hands[0][1] + 0.01, 0.08);
      else aquila(p, sx + 0.04, g, 0.95);
    }
    runner(p, x + 4.2);
    table(p, x + 4.65, g, 0.3, 0.14);
    chip(p, x + 4.65, g + 0.15, 0.09);
    man(p, x + 4.95, g, { pose: 'bend', dir: -1, robe: true });
    man(p, x + 5.15, g, { pose: 'point', dir: -1 });
  },

  /* VI — Industrial design. The workshop: drawing, turning, making. */
  design(p, x, L, r) {
    draftBoard(p, x + 0.25, g, 1.2);
    man(p, x + 0.12, g, { pose: 'write' });
    // potter's wheel
    p.circle(x + 0.75, g + 0.1, 0.08, 14, 0.015);
    p.seg(x + 0.75, g, x + 0.75, g + 0.1);
    amphora(p, x + 0.75, g + 0.11, 0.9);
    man(p, x + 0.6, g, { pose: 'sit' });
    // the saw
    table(p, x + 1.3, g, 0.34, 0.12);
    p.rect(x + 1.18, g + 0.12, 0.24, 0.03);
    const s = man(p, x + 1.05, g, { pose: 'haul' });
    p.seg(s.hands[0][0], s.hands[0][1], s.hands[0][0] + 0.14, s.hands[0][1] - 0.01);
    // the gallery of objects
    const objs = [chair, lamp, amphora, chair, lamp];
    objs.forEach((f, i) => {
      const ox = x + 1.9 + i * 0.32;
      const top = plinth(p, ox, g, 0.12, 0.12 + (i % 2) * 0.05);
      f(p, ox, top, 1);
    });
    for (let i = 0; i < 3; i++) man(p, x + 2.05 + i * 0.4, g + 0.38, { pose: i === 1 ? 'point' : 'stand', k: 0.7, dir: i % 2 ? -1 : 1 });
    runner(p, x + 3.75);
    man(p, x + 4.2, g, { pose: 'point', robe: true });
    man(p, x + 4.45, g, { pose: 'stand', dir: -1 });
    p.rect(x + 4.6, g, 0.5, 0.1);
    chair(p, x + 4.75, g + 0.1, 1.1);
    drone(p, x + 4.98, g + 0.13, 0.8);
  },

  /* VII — the Bibliotheca Ulpia, which really stood beside the column. */
  reading(p, x, L, r) {
    armarium(p, x + 0.3, g);
    armarium(p, x + 0.56, g);
    for (let i = 0; i < 3; i++) {
      const sx = x + 0.95 + i * 0.36;
      p.rect(sx - 0.07, g, 0.14, 0.1);
      const m = man(p, sx, g + 0.0, { pose: 'sit' });
      scroll(p, m.hands[0], m.hands[1]);
    }
    for (let i = 0; i < 6; i++) arch(p, x + 2.1 + i * 0.22, g + 0.42, 0.16, 0.36);
    for (let i = 0; i < 5; i++) {
      const m = man(p, x + 2.2 + i * 0.25, g, { pose: 'walk', robe: i % 2 === 0, dir: i % 2 ? -1 : 1 });
      if (i % 2 === 0) scroll(p, m.hands[0], [m.hands[0][0] + 0.05, m.hands[0][1] + 0.01]);
    }
    runner(p, x + 3.6);
    armarium(p, x + 4.1, g);
    const sc = man(p, x + 4.45, g, { pose: 'write', dir: -1, robe: true });
    p.rect(sc.hands[0][0] - 0.06, sc.hands[0][1] - 0.03, 0.06, 0.05);
  },

  /* VIII — the road out: milestones, travellers, the arch at the end. */
  via(p, x, L, r) {
    for (let i = 0; i < 40; i++) p.seg(x + i * 0.105, g, x + i * 0.105 + 0.035, g + 0.02);
    p.seg(x, g + 0.02, x + L - 0.2, g + 0.02);
    ['I', 'II', 'III', 'IV'].forEach((n, i) => milestone(p, x + 0.3 + i * 0.85, g + 0.02, n));
    for (let i = 0; i < 4; i++) tree(p, x + 0.65 + i * 0.85, g + 0.38, 0.75);
    man(p, x + 0.6, g + 0.02, { pose: 'walk', robe: true });
    horse(p, x + 1.05, g + 0.02, { stand: true });
    man(p, x + 1.25, g + 0.02, { pose: 'walk' });
    runner(p, x + 1.8);
    runner(p, x + 2.6);
    man(p, x + 2.95, g + 0.02, { pose: 'hail' });
    // the triumphal arch: the way out, and up
    const ax = x + 3.75;
    p.rect(ax - 0.3, g + 0.02, 0.6, 0.62);
    arch(p, ax, g + 0.02, 0.22, 0.42);
    p.rect(ax - 0.33, g + 0.64, 0.66, 0.05);
    p.rect(ax - 0.2, g + 0.69, 0.4, 0.09);
    numeral(p, ax, g + 0.735, 0.05, 'MMXXVI'.replace(/M/g, '') );
  },
};


export function buildFrieze() {
  const p = createPen();
  const ranges = [];
  let x = LEAD;

  CAMPAIGNS.forEach((c, i) => {
    p.ink(c.status === 'done' ? 'solid' : 'dashed');
    victory(p, x + 0.18, g, c.n);
    const x0 = x + VIC;
    // ground line for the scene
    p.seg(x0 - 0.05, g, x0 + c.len, g);
    SCENES[c.id](p, x0, c.len, seeded(i * 97 + 13));
    ranges.push({ id: c.id, from: x, x0, to: x0 + c.len, status: c.status });
    x = x0 + c.len;
  });

  const length = x + TAIL;
  const turns = Math.ceil(length / TURN);
  return { segs: p.out, ranges, length: turns * TURN, used: length, turns };
}

export { BAND, GROUND };
