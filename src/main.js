// main.js — wiring. Scroll is the climb: it becomes a progress value, the
// plate moves its camera up the tower from it, and the page cuts between
// panes and title cards as the camera crosses from one tier to the next.
//
// Two ways to scroll. Desktop: the page is an empty track and its scroll
// position is the climb. Phones (html.m): the sections are an ordinary page,
// with a live view of each tier set between them (an interlude) that drifts
// upward as it passes; the cards follow whichever section is being read.

import { createPlate, drawScene } from './plate.js';
import { CAMPAIGNS, SUMMIT, KANJI_NUM } from './campaigns.js';
import { initStreak } from './streak.js';

const field = document.getElementById('field');
const canvas = document.getElementById('gl');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const still = /[?&]still/.test(location.search); // ?still: no cards, no easing — for screenshots
const noCards = reduced || still;

if (document.documentElement.classList.contains('phone')) throw new Error('phone: guard shown');

const plate = createPlate(canvas);
if (still) plate.drawIn = false;
const ALL = [...CAMPAIGNS, SUMMIT];
const byId = Object.fromEntries(ALL.map((c) => [c.id, c]));

/* ---------------- layout mode and sizing ---------------- */
const root = document.documentElement;
const mobileQ = matchMedia('(max-width:760px), (orientation:portrait) and (max-width:1100px)');
const forceM = /[?&]mobile/.test(location.search);
const isM = () => root.classList.contains('m');

let W = 0, H = 0, mode = null;
function resize() {
  root.classList.toggle('m', forceM || mobileQ.matches);
  const w = field.clientWidth, h = field.clientHeight, m = isM();
  // phones: the address bar sliding in and out changes the height only; ignore that
  if (m && mode === m && w === W && Math.abs(h - H) < 120) return;
  const switched = mode !== null && mode !== m;
  W = w; H = h; mode = m;
  plate.resize(W, H, m);
  figs.forEach((f) => f.draw());
  inters.forEach((it) => it.size());
  if (switched) readScroll();
}

/* ---------------- scroll → progress ---------------- */
const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
let target = 0, prog = 0;

// the sections in climb order: the opening, each tier, the summit
const SEC_IDS = ['intro', ...ALL.map((c) => c.id)];
const secEls = SEC_IDS.map((id) => (id === 'intro' ? document.querySelector('.hero') : document.getElementById(id)));

/* ---------------- phones: a live view of each tier between the sections ---------------- */
const inters = SEC_IDS.map((id, i) => {
  const box = document.createElement('div');
  box.className = 'inter';
  box.setAttribute('aria-hidden', 'true');
  const cv = document.createElement('canvas');
  box.appendChild(cv);
  // the opening's view follows the hero; every tier's view leads its section
  if (id === 'intro') secEls[0].after(box); else secEls[i].before(box);
  const it = { id, box, plate: createPlate(cv), p: plate.progressOf(id), on: false };
  if (still) it.plate.drawIn = false;
  it.size = () => { if (isM()) it.plate.resize(cv.clientWidth, cv.clientHeight, true); };
  new IntersectionObserver((es) => { it.on = es[0].isIntersecting; }).observe(box);
  return it;
});
// where each block starts on a phone: a tier's block begins at its interlude
const blockEl = (i) => (i === 0 ? secEls[0] : inters[i].box);

function readScroll() {
  if (!isM()) { target = clamp01(scrollY / maxScroll()); return; }
  // the block crossing a line 30% down the screen is the one being read
  const probe = innerHeight * 0.3;
  const tops = SEC_IDS.map((_, i) => blockEl(i).getBoundingClientRect().top);
  let f = 0;
  tops.forEach((t, i) => {
    if (t > probe) return;
    const next = i < tops.length - 1 ? tops[i + 1] : t + 1e9;
    f = i + clamp01((probe - t) / Math.max(1, next - t) - 0.6) / 0.4 * (i < tops.length - 1 ? 1 : 0);
  });
  target = clamp01(f / (SEC_IDS.length - 1));
}
addEventListener('scroll', readScroll, { passive: true });
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// nav + gauge marks jump the climb to a campaign
function go(id) {
  const behavior = reduced ? 'auto' : 'smooth';
  if (isM()) {
    const i = SEC_IDS.indexOf(id);
    if (i >= 0) scrollTo({ top: scrollY + blockEl(i).getBoundingClientRect().top - 8, behavior });
    return;
  }
  scrollTo({ top: plate.progressOf(id) * maxScroll() + 2, behavior });
}
const menuBtn = document.querySelector('.bar .menu');
function menu(open) {
  root.classList.toggle('menu-open', open);
  menuBtn.setAttribute('aria-expanded', String(open));
  menuBtn.textContent = open ? 'Close' : 'Index';
}
menuBtn.addEventListener('click', () => menu(!root.classList.contains('menu-open')));
document.querySelectorAll('.bar nav a').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  menu(false);
  go(a.getAttribute('href').slice(1));
}));

/* ---------------- phones: each tier's drawing inside its section ---------------- */
const figs = CAMPAIGNS.filter((c) => !c.wide).map((c) => {
  const art = document.getElementById(c.id);
  const cv = document.createElement('canvas');
  cv.className = 'fig';
  cv.setAttribute('aria-hidden', 'true');
  art.querySelector('header').after(cv);
  const f = { t: still || reduced ? 1 : 0, started: false };
  f.draw = () => { if (isM()) drawScene(cv, c.id, cv.clientWidth, f.t); };
  // plot it in the first time it scrolls into view
  new IntersectionObserver((es) => {
    if (!es[0].isIntersecting || f.started) return;
    f.started = true;
    const t0 = performance.now();
    const step = (now) => {
      f.t = Math.min(1, (now - t0) / 1100);
      f.draw();
      if (f.t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, { threshold: 0.2 }).observe(cv);
  return f;
});
addEventListener('resize', resize);
resize();

/* ---------------- gauge ---------------- */
const marks = document.querySelector('.gauge .marks');
const nowEl = document.querySelector('.gauge .now');
ALL.forEach((c) => {
  const m = document.createElement('button');
  m.className = 'mark' + (c.status === 'intent' ? ' intent' : '');
  m.style.bottom = (plate.progressOf(c.id) * 100).toFixed(2) + '%';
  m.textContent = c.n;
  m.title = c.en;
  m.addEventListener('click', () => go(c.id));
  marks.appendChild(m);
});
document.getElementById('turns').textContent = CAMPAIGNS.length;

/* ---------------- panes and title cards ---------------- */
const panes = [...document.querySelectorAll('.pane')];
const card = document.querySelector('.card');
const setText = (sel, t) => { card.querySelector(sel).textContent = t; };
let active = null, lastCard = -1e9, cardTimer = 0;

function showCard(c) {
  const idx = ALL.indexOf(c) + 1;
  setText('.c-ep', 'Tier ' + c.n + (c.status === 'intent' ? ' — in progress' : ''));
  setText('.c-kan', '第' + KANJI_NUM[idx] + '層' + (c.status === 'intent' ? ' · 未完' : ''));
  card.querySelector('.c-la').innerHTML = c.en.toUpperCase().replace(' ', '<br>');
  setText('.c-jp', c.jp);
  setText('.c-en', c.sub);
  card.classList.remove('on'); void card.offsetWidth; card.classList.add('on');
  clearTimeout(cardTimer);
  cardTimer = setTimeout(() => card.classList.remove('on'), 1050);
}

function setActive(id, now) {
  if (id === active) return;
  const first = active === null;
  active = id;
  panes.forEach((p) => p.classList.toggle('on', p.dataset.k === id));
  const c = byId[id];
  document.getElementById('cname').textContent = c ? c.en.toUpperCase() : 'THE BASE';
  // a hard cut, Gainax style — but never on load, and never in a flurry
  if (!first && c && !noCards && now - lastCard > 1400 && Math.abs(target - prog) < 0.08) {
    lastCard = now;
    showCard(c);
  }
}

/* ---------------- readout, stepped at 12fps like a 90s HUD ---------------- */
const pesEl = document.getElementById('pes'), spiraEl = document.getElementById('spira');
let lastStep = 0;
function readout(now) {
  if (now - lastStep < 83) return;
  lastStep = now;
  pesEl.textContent = String(Math.round(plate.elevation(prog) * 10)).padStart(3, '0');
  spiraEl.textContent = plate.tierAt(prog);
  nowEl.style.bottom = (prog * 100).toFixed(2) + '%';
}

/* ---------------- the loop ---------------- */
let last = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  prog += (target - prog) * (reduced || still ? 1 : 1 - Math.exp(-dt * 3.2)); // soft follow
  if (Math.abs(target - prog) < 1e-5) prog = target;

  if (isM()) {
    // only the interludes on screen are drawn; each drifts up through its
    // tier as it rises past the middle of the screen
    inters.forEach((it) => {
      if (!it.on) return;
      const r = it.box.getBoundingClientRect();
      const mid = (r.top + r.height / 2) / innerHeight;   // 1 at the bottom, 0 at the top
      it.plate.frame(it.p, now / 1000, (0.5 - mid) * 0.45);
    });
  } else plate.frame(prog, now / 1000);
  setActive(plate.sectionAt(prog), now);
  readout(now);
}

initStreak();
scrollTo(0, 0);
readScroll();
requestAnimationFrame(frame);

window.__site = { plate, go, get progress() { return prog; } };
