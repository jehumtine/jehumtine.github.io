// camera.js — how the world is framed.
//
// Right now the camera only fits the whole forum into the viewport: the same
// framing the site has always had. The scroll target below is the seam for
// the next step (Direction B): scroll drives `progress`, and `frame()` starts
// moving the camera instead of re-fitting it.

import { CX, GROUND } from './world.js';

export function createCamera() {
  let target = 0;
  let progress = 0;

  return {
    // 0 = the finished forum, 1 = the empty site. Driven by scroll later.
    setProgressTarget(p) { target = Math.max(0, Math.min(1, p)); },
    update(dt) {
      progress += (target - progress) * Math.min(1, dt * 4);
      return progress;
    },
    get progress() { return progress; },

    frame(vw, vh) {
      const s = vw < 760
        ? (vw * 0.98) / 640
        : Math.min((vw * 0.94) / 1260, (vh * 0.52) / 390, 2);
      const sc = Math.max(1.3, 1.1 / s);
      const tx = vw / 2 - CX * s;
      const ty = vh - 26 - GROUND * s;
      const half = (vw / 2 - 14) / s;
      return { s, sc, tx, ty, minX: CX - half, maxX: CX + half, vw, vh, progress };
    },
  };
}
