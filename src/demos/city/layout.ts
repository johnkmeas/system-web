/**
 * Landmark arrangements. The product hub always anchors the central plaza;
 * the other five districts are placed by pattern, scaled by `spread`, and
 * snapped to block centers (multiples of 20) so they sit inside a block.
 */
import type { District } from "./links";
import { rng } from "./textures";

export type Layout = "classic" | "ring" | "grid" | "arc" | "spiral" | "random";

export const LAYOUTS: { id: Layout; name: string }[] = [
  { id: "classic", name: "Classic" },
  { id: "ring", name: "Ring" },
  { id: "grid", name: "Grid" },
  { id: "arc", name: "Arc" },
  { id: "spiral", name: "Spiral" },
  { id: "random", name: "Random" },
];

const BLOCK = 20, MIN_GAP = 40;
const snap = (v: number) => Math.round(v / BLOCK) * BLOCK;

/** Place districts by pattern. `half` is the theme's city half-width. */
export function arrange(base: District[], layout: Layout, spread: number, seed: number, half: number): District[] {
  const hub = base.find(d => d.form === "hub");
  const others = base.filter(d => d !== hub);
  const R = 60 * spread, limit = half - BLOCK;
  let raw: [number, number][];
  switch (layout) {
    case "ring":
      raw = others.map((_, i) => polar(R, (i / others.length) * Math.PI * 2 + 0.35));
      break;
    case "grid": {
      const s = 40 * spread;
      raw = [[-s, -s], [0, -s], [s, -s], [-s, 0], [s, 0], [-s, s], [s, s]].slice(0, others.length) as [number, number][];
      break;
    }
    case "arc":
      // A crescent behind the hub, as seen from the default camera.
      raw = others.map((_, i) => polar(R * 1.1, Math.PI * 1.08 + (i / Math.max(1, others.length - 1)) * Math.PI * 0.84 - 0.45));
      break;
    case "spiral":
      raw = others.map((_, i) => polar(R * (0.6 + i * 0.24), i * 1.3 + 0.5));
      break;
    case "random": {
      const r = rng(seed * 7919 + 13);
      raw = others.map(() => polar(R * (0.65 + r() * 0.85), r() * Math.PI * 2));
      break;
    }
    default:
      raw = others.map(d => [d.pos[0] * spread, d.pos[1] * spread]);
  }

  const placed: [number, number][] = [[0, 0]];
  const out = others.map((d, i) => {
    let [x, z] = raw[i];
    let p = fit(x, z, limit);
    // Push outward (then around) until it clears the plaza and the others.
    for (let k = 0; k < 40 && !free(p, placed); k++) {
      const a = Math.atan2(z, x) + (k % 2 ? 0.45 : 0), len = Math.hypot(x, z) + BLOCK;
      x = Math.cos(a) * len; z = Math.sin(a) * len;
      if (len > limit * 1.4) { x = raw[i][0] * 0.5; z = raw[i][1] * 0.5; }
      p = fit(x, z, limit);
    }
    placed.push(p);
    return { ...d, pos: p };
  });
  return hub ? [...out.slice(0, base.indexOf(hub)), { ...hub, pos: [0, 0] as [number, number] }, ...out.slice(base.indexOf(hub))] : out;
}

function polar(r: number, a: number): [number, number] { return [Math.cos(a) * r, Math.sin(a) * r]; }

function fit(x: number, z: number, limit: number): [number, number] {
  const c = (v: number) => Math.max(-limit, Math.min(limit, snap(v)));
  return [c(x), c(z)];
}

function free(p: [number, number], placed: [number, number][]) {
  if (Math.abs(p[0]) <= BLOCK && Math.abs(p[1]) <= BLOCK) return false; // plaza
  return placed.every(q => Math.hypot(p[0] - q[0], p[1] - q[1]) >= MIN_GAP);
}
