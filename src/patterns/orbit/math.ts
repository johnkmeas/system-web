import type { Orbital, OrbitSettings, OrbitSlide, OrbitTarget, ResolvedSlide } from "./types";

export const EASE = [0.76, 0, 0.2, 1] as const;
export const DUR = 0.9;
export const D2R = Math.PI / 180;
export const TAU = Math.PI * 2;
export const F = 1700; // perspective distance in layout units

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const DEFAULT_SETTINGS: OrbitSettings = {
  speed: 1, paused: false, autoRotate: false, rings: true, labels: true, stars: true, theme: "system",
  layout: "atom", randomness: 0.45, seed: 7, transition: "zoom",
};

/* Atom-style orbitals: rings of equal size, each tilted away from the viewer
   and spun around the center so they cross like the classic atom symbol. */
export const DEFAULT_ORBITALS: Orbital[] = [
  { r: 400, tilt: 72, spin: 0,   speed: 0.55 },
  { r: 400, tilt: 72, spin: 45,  speed: 0.48 },
  { r: 400, tilt: 72, spin: 90,  speed: 0.52 },
  { r: 400, tilt: 72, spin: 135, speed: 0.45 },
];

// Pages fill rings in turn; the second page on a ring sits opposite the first.
export function resolveSlides(slides: OrbitSlide[], orbitals: Orbital[]): ResolvedSlide[] {
  const n = orbitals.length;
  return slides.map((s, i) => {
    if (i === 0) return { ...s, size: s.size ?? 160, orbital: 0, phase: 0 };
    const k = i - 1;
    const orbital = s.orbital ?? k % n;
    const phase = s.phase ?? (k >= n ? Math.PI : 0) + orbital * 0.9;
    return { ...s, size: s.size ?? 60, orbital, phase };
  });
}

// Small seeded PRNG so a shuffle is repeatable and survives reloads.
export function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Target orbit for every node: a tidy base layout, pushed off-axis by `randomness`.
// Index 0 (the nucleus) gets a zero placeholder so indices line up with slides.
export function targetsFor(slides: ResolvedSlide[], orbitals: Orbital[], S: OrbitSettings): OrbitTarget[] {
  const rnd = mulberry32(S.seed * 9973 + 1);
  const R = S.randomness;
  const flat = S.layout === "flat";
  return slides.map((s, i) => {
    if (i === 0) return { r: 0, tilt: 0, spin: 0, speed: 0, phase: 0 };
    const k = i - 1;
    let b: OrbitTarget;
    if (S.layout === "solar") {
      b = { r: 200 + k * 42, tilt: 76, spin: -8, speed: 0.55 / (1 + k * 0.35), phase: k * 2.1 + 0.4 };
    } else if (flat) {
      b = { r: 160 + k * 42, tilt: 0, spin: 0, speed: 0.6 / (1 + k * 0.3), phase: k * 2.1 + 0.4 };
    } else {
      const o = orbitals[s.orbital % orbitals.length];
      b = { ...o, phase: s.phase };
    }
    const a = rnd() * 2 - 1, t = rnd() * 2 - 1, sp = rnd() * 2 - 1, v = rnd() * 2 - 1, ph = rnd();
    return {
      r: b.r * (1 + 0.24 * a * R),
      tilt: flat ? 0 : b.tilt + 40 * t * R,
      spin: flat ? 0 : b.spin + 90 * sp * R,
      speed: b.speed * (1 + 0.55 * v * R),
      phase: b.phase + ph * TAU * R,
    };
  });
}

/** Project a point on a 3D ring to 2D screen space (layout units) with perspective. */
export function project(o: Orbital, th: number, yaw: number, tilt: number) {
  const a = o.tilt * D2R, sp = o.spin * D2R;
  const x = o.r * Math.cos(th);
  const y = o.r * Math.sin(th) * Math.cos(a);
  const z = o.r * Math.sin(th) * Math.sin(a);
  const x1 = x * Math.cos(sp) - y * Math.sin(sp);
  const y1 = x * Math.sin(sp) + y * Math.cos(sp);
  const x2 = x1 * Math.cos(yaw) + z * Math.sin(yaw);
  const z2 = -x1 * Math.sin(yaw) + z * Math.cos(yaw);
  const y3 = y1 * Math.cos(tilt) - z2 * Math.sin(tilt);
  const z3 = y1 * Math.sin(tilt) + z2 * Math.cos(tilt);
  const s = F / (F + z3);
  return { x: x2 * s, y: y3 * s, z: z3, s };
}
