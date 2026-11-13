// Headless check of the frieze: builds it with no browser and asserts every
// stroke stays inside the band. Run: node tools/frieze-check.mjs [out.svg]
import { buildFrieze, BAND, TURN } from '../src/frieze.js';
import { writeFileSync } from 'node:fs';

const f = buildFrieze();
let bad = 0;
for (const ink of ['solid', 'dashed']) {
  const a = f.segs[ink];
  for (let i = 0; i < a.length; i += 2) {
    const x = a[i], y = a[i + 1];
    if (!(y >= -0.005 && y <= BAND + 0.005 && x >= 0 && x <= f.length)) {
      if (bad++ < 8) console.log(`out of band (${ink}): x=${x.toFixed(3)} y=${y.toFixed(3)}`);
    }
  }
}
console.log(`segments: ${f.segs.solid.length / 4} solid, ${f.segs.dashed.length / 4} dashed`);
console.log(`band used ${f.used.toFixed(2)} of ${f.length.toFixed(2)} (${f.turns} turns)`);
f.ranges.forEach((r) => console.log(`  ${r.id.padEnd(8)} ${r.from.toFixed(2)} → ${r.to.toFixed(2)}  ${r.status}`));

const out = process.argv[2];
if (out) {
  // flat proof print of the band, one row per turn
  const S = 260, H = BAND * S;
  let body = '';
  for (const ink of ['solid', 'dashed']) {
    const a = f.segs[ink];
    let d = '';
    for (let i = 0; i < a.length; i += 4) {
      const row = Math.floor(a[i] / TURN);
      const ox = row * TURN, oy = row * (H + 30);
      d += `M${((a[i] - ox) * S).toFixed(1)} ${(oy + H - a[i + 1] * S).toFixed(1)}L${((a[i + 2] - ox) * S).toFixed(1)} ${(oy + H - a[i + 3] * S).toFixed(1)}`;
    }
    body += `<path d="${d}" fill="none" stroke="#f6f4ee" stroke-width="1.2" ${ink === 'dashed' ? 'stroke-dasharray="4 3"' : ''}/>`;
  }
  const W = TURN * S, HH = f.turns * (H + 30);
  writeFileSync(out, `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HH}" viewBox="0 0 ${W} ${HH}"><rect width="100%" height="100%" fill="#2a4357"/>${body}</svg>`);
  console.log('wrote', out);
}
process.exit(bad ? 1 : 0);
