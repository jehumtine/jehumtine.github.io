// campaigns.js — the tower's tiers, bottom to top.
//
// Each campaign is one tier of the tower on the plate. `status` is the point:
//   'done'   — built. Solid members, a solid detail drawing.
//   'intent' — in progress: construction lines only, drawn dashed.
// The crew always works on the first 'intent' tier. Keep finished tiers
// below unfinished ones; when something ships, flip it to 'done'.
// `len` is the length of its detail drawing (see SCENES in frieze.js).

export const CAMPAIGNS = [
  { id: 'initium', n: 'I',     sub: 'Where it starts',     jp: '始まり',   en: 'Belief',             status: 'done',   len: 7.0 },
  { id: 'argon',   n: 'II',    sub: 'Building the camp',   jp: '陣営',     en: 'Argon Intelligence', status: 'done',   len: 6.4 },
  { id: 'f1',      n: 'III',   sub: 'The race, replayed',  jp: '戦車競走', en: 'F1 Replay',          status: 'done',   len: 7.0 },
  { id: 'reading', n: 'IV',    sub: 'The library',         jp: '図書館',   en: 'Reading',            status: 'done',   len: 5.0, wide: true },
  { id: 'via',     n: 'V',     sub: 'The road out',        jp: '道',       en: 'Elsewhere',          status: 'done',   len: 4.4 },
  // Not ready yet: uncomment when there is something to show (and give the
  // summit the next numeral). Their panels are commented out in index.html.
  // { id: 'drones',  n: 'VI',    sub: 'Taking flight',       jp: '鷲',       en: 'Drones',             status: 'intent', len: 5.6 },
  // { id: 'gpu',     n: 'VII',   sub: 'The forge',           jp: '鍛冶場',   en: 'GPU',                status: 'intent', len: 5.4 },
  // { id: 'design',  n: 'VIII',  sub: 'The workshop',        jp: '工房',     en: 'Industrial Design',  status: 'intent', len: 5.4 },
];

export const SUMMIT = { id: 'astra', n: 'VI', sub: 'To the stars', jp: '星へ', en: 'Get in touch', status: 'done' };

export const KANJI_NUM = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
