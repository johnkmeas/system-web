import type { OrbitTarget } from "./types";

type Vec = { x: number; y: number };

const GAP = 4; // breathing room between bodies, layout units

/**
 * Flat mode: a small 2D physics sim. Each node is steered around its ring,
 * pulled back to its radius by a spring, and bounces off other nodes and the sun.
 * Index 0 is the fixed sun.
 */
export function createFlatSim(n: number) {
  const pos: Vec[] = Array.from({ length: n }, () => ({ x: 0, y: 0 }));
  const vel: Vec[] = Array.from({ length: n }, () => ({ x: 0, y: 0 }));
  const dir = Array.from({ length: n }, (_, i) => (i % 2 ? 1 : -1));
  const lastFlip = Array.from({ length: n }, () => -10);
  let simT = 0;

  function reset(from: Vec[]) {
    for (let i = 1; i < n; i++) {
      pos[i].x = from[i].x; pos[i].y = from[i].y; vel[i].x = 0; vel[i].y = 0;
    }
  }

  function step(h: number, gs: number, cur: OrbitTarget[], rad: number[]) {
    simT += h;
    for (let i = 1; i < n; i++) {
      const P = pos[i], V = vel[i], o = cur[i];
      const r = Math.hypot(P.x, P.y) || 0.001;
      const nx = P.x / r, ny = P.y / r, tx = -ny, ty = nx;
      let vr = V.x * nx + V.y * ny, vt = V.x * tx + V.y * ty;
      const target = dir[i] * o.speed * o.r * gs;
      vt += (target - vt) * (1 - Math.exp(-2.5 * h));
      vr += (-9 * (r - o.r) - 4 * vr) * h;
      V.x = nx * vr + tx * vt; V.y = ny * vr + ty * vt;
      P.x += V.x * h; P.y += V.y * h;
    }
    for (let i = 1; i < n; i++) {
      const A = pos[i], VA = vel[i];
      // the sun is fixed: push out and reflect
      const ds = Math.hypot(A.x, A.y) || 0.001, ms = rad[i] + rad[0] + GAP;
      if (ds < ms) {
        const nx = A.x / ds, ny = A.y / ds;
        A.x = nx * ms; A.y = ny * ms;
        const vn = VA.x * nx + VA.y * ny;
        if (vn < 0) { VA.x -= 2 * vn * nx; VA.y -= 2 * vn * ny; }
      }
      for (let j = i + 1; j < n; j++) {
        const B = pos[j], VB = vel[j];
        const dx = B.x - A.x, dy = B.y - A.y;
        const d = Math.hypot(dx, dy) || 0.001, min = rad[i] + rad[j] + GAP;
        if (d >= min) continue;
        const nx = dx / d, ny = dy / d, ov = (min - d) / 2;
        A.x -= nx * ov; A.y -= ny * ov; B.x += nx * ov; B.y += ny * ov;
        const rel = (VB.x - VA.x) * nx + (VB.y - VA.y) * ny;
        if (rel < 0) {
          // equal-mass elastic bounce along the contact normal
          VA.x += rel * nx; VA.y += rel * ny; VB.x -= rel * nx; VB.y -= rel * ny;
          // both turn around their rings (with a short cooldown so resting contact doesn't jitter)
          if (simT - lastFlip[i] > 0.35) { dir[i] *= -1; lastFlip[i] = simT; }
          if (simT - lastFlip[j] > 0.35) { dir[j] *= -1; lastFlip[j] = simT; }
        }
      }
    }
  }

  return { pos, reset, step };
}
