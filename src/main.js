// main.js — wiring. Scroll is the climb: it becomes a progress value, the
// plate moves its camera up the tower from it, and the page cuts between
// panes and title cards as the camera crosses from one tier to the next.

import { createPlate } from './plate.js';
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

/* ---------------- sizing ---------------- */
let W = 0, H = 0;
function resize() {
  W = field.clientWidth; H = field.clientHeight;
  plate.resize(W, H);
}
addEventListener('resize', resize);
resize();

/* ---------------- scroll → progress ---------------- */
const maxScroll = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
let target = 0, prog = 0;
const readScroll = () => { target = Math.min(1, Math.max(0, scrollY / maxScroll())); };
addEventListener('scroll', readScroll, { passive: true });
if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

// nav + gauge marks jump the climb to a campaign
function go(id) {
  scrollTo({ top: plate.progressOf(id) * maxScroll() + 2, behavior: reduced ? 'auto' : 'smooth' });
}
document.querySelectorAll('.bar nav a').forEach((a) => a.addEventListener('click', (e) => {
  e.preventDefault();
  go(a.getAttribute('href').slice(1));
}));

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

  plate.frame(prog, now / 1000);
  setActive(plate.sectionAt(prog), now);
  readout(now);
}

initStreak();
scrollTo(0, 0);
readScroll();
requestAnimationFrame(frame);

window.__site = { plate, go, get progress() { return prog; } };
