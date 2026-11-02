import { clamp } from "./math";
import type { NodePos, TransitionMode } from "./types";

/**
 * Page transitions. Each one is a pure function of `progress` (0 = orbit, 1 = page open),
 * called every frame by the orbit engine with the tracked node's live position, so closing
 * is simply the same motion played backwards and always lands on the node you're reading.
 */

export interface TransitionInfo {
  id: TransitionMode;
  label: string;
  blurb: string;
  /** Open/close duration, seconds. */
  duration: number;
}

export const TRANSITIONS: TransitionInfo[] = [
  { id: "zoom", label: "Zoom", duration: 0.9, blurb: "The camera dives into the node while its color grows to fill the screen." },
  { id: "drawer", label: "Drawer", duration: 0.75, blurb: "The page slides in beside the orbit, which pulls back to stay in view. Click other nodes to switch pages." },
  { id: "eclipse", label: "Eclipse", duration: 1.25, blurb: "The node glides in front of the nucleus, the corona flares, then the page swallows the sky." },
  { id: "slingshot", label: "Slingshot", duration: 1.2, blurb: "The node whips around the nucleus on a gravity assist and flings open into the page." },
  { id: "warp", label: "Warp", duration: 1.1, blurb: "Stars streak past as you jump to light speed toward the node." },
  { id: "collapse", label: "Collapse", duration: 1.3, blurb: "The system spirals into the nucleus like a black hole, then the page bursts out as a shockwave." },
];

export const transitionDuration = (m: TransitionMode) => TRANSITIONS.find(t => t.id === m)?.duration ?? 0.9;

/** At or above this viewport width the drawer opens from the right; below it, from the bottom. */
export const DRAWER_WIDE = 900;
/** Share of the viewport the drawer covers. */
export const DRAWER_SIZE = { wide: 0.5, narrow: 0.58 };

export interface TransitionFrame {
  pr: number;
  W: number;
  H: number;
  /** Orbit center and its on-screen extent at scale 1, px. */
  cx: number;
  cy: number;
  extW: number;
  extH: number;
  /** Tracked node and the nucleus, live screen positions. */
  q: NodePos;
  sun: NodePos;
  color: string;
  sunColor: string;
  st: HTMLElement;
  ov: HTMLElement | null;
  corona: HTMLElement | null;
  warp: HTMLElement | null;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const ss = (a: number, b: number, x: number) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
/** Radius that covers the whole viewport from (x, y). */
const cover = (x: number, y: number, W: number, H: number) =>
  Math.hypot(Math.max(x, W - x), Math.max(y, H - y)) + 40;

function stage(st: HTMLElement, origin: string, transform: string, opacity: number) {
  st.style.transformOrigin = origin;
  st.style.transform = transform;
  st.style.opacity = String(clamp(opacity, 0, 1));
}
function circle(ov: HTMLElement | null, r: number, x: number, y: number, transform = "") {
  if (!ov) return;
  ov.style.clipPath = `circle(${Math.max(0, r).toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px)`;
  ov.style.transform = transform;
}
function glow(el: HTMLElement | null, x: number, y: number, r: number, opacity: number, color: string) {
  if (!el) return;
  if (opacity <= 0.001) { el.style.display = "none"; return; }
  el.style.display = "block";
  el.style.setProperty("--fx", color);
  el.style.width = el.style.height = (r * 2).toFixed(1) + "px";
  el.style.transform = `translate3d(${(x - r).toFixed(1)}px, ${(y - r).toFixed(1)}px, 0)`;
  el.style.opacity = opacity.toFixed(3);
}
function hide(el: HTMLElement | null) { if (el) el.style.display = "none"; }

const FRAMES: Record<TransitionMode, (f: TransitionFrame) => void> = {
  zoom({ pr, q, W, H, st, ov }) {
    const sc = 1 + 2.4 * pr;
    stage(st, `${q.x}px ${q.y}px`, `scale(${sc})`, 1 - pr);
    const r0 = q.r * sc;
    circle(ov, lerp(r0, cover(q.x, q.y, W, H), pr), q.x, q.y);
  },

  drawer({ pr, W, H, cx, cy, extW, extH, st, ov }) {
    const wide = W >= DRAWER_WIDE;
    // the free part of the viewport the orbit retreats into
    const bw = wide ? W * (1 - DRAWER_SIZE.wide) : W;
    const bh = wide ? H : H * (1 - DRAWER_SIZE.narrow);
    const s = Math.min(1, (bw * 0.94) / extW, (bh * 0.94) / extH);
    const tx = bw / 2 - s * cx, ty = bh / 2 - s * cy;
    stage(st, "0 0", `translate3d(${(tx * pr).toFixed(1)}px, ${(ty * pr).toFixed(1)}px, 0) scale(${lerp(1, s, pr).toFixed(4)})`, 1);
    if (ov) {
      ov.style.clipPath = "none";
      const off = ((1 - pr) * 100).toFixed(2) + "%";
      ov.style.transform = wide ? `translate3d(${off}, 0, 0)` : `translate3d(0, ${off}, 0)`;
    }
  },

  eclipse({ pr, q, sun, W, H, st, ov, corona, sunColor }) {
    const a = ss(0, 0.42, pr), b = ss(0.42, 1, pr);
    const x = lerp(q.x, sun.x, a), y = lerp(q.y, sun.y, a);
    const r1 = lerp(q.r, sun.r * 1.03, a);
    const r = lerp(r1, cover(x, y, W, H), b * b);
    stage(st, `${sun.x}px ${sun.y}px`, `scale(${1 + 0.5 * b})`, 1 - 0.3 * a - 0.7 * b);
    circle(ov, r, x, y);
    // the corona flares while the node sits over the nucleus, then the page swallows it
    glow(corona, x, y, r, ss(0.22, 0.42, pr) * (1 - ss(0.42, 0.75, pr)), sunColor);
  },

  slingshot({ pr, q, sun, W, H, st, ov, corona, color }) {
    const dx = q.x - sun.x, dy = q.y - sun.y;
    const d0 = Math.hypot(dx, dy) || 1, th0 = Math.atan2(dy, dx);
    const sw = ss(0, 0.72, pr), arc = Math.sin(sw * Math.PI);
    // swing 1.5 turns of a half-orbit, dipping close to the nucleus at the apex
    const th = th0 + sw * Math.PI * 1.5;
    const d = d0 * (1 - 0.55 * arc) + sun.r * 1.1 * arc;
    const x = sun.x + Math.cos(th) * d, y = sun.y + Math.sin(th) * d;
    const g = ss(0.5, 1, pr);
    const r = lerp(q.r * (1 + 0.6 * arc), cover(x, y, W, H), g * g);
    stage(st, `${sun.x}px ${sun.y}px`, `rotate(${(-28 * pr).toFixed(2)}deg) scale(${1 + 0.4 * pr})`, 1 - ss(0.45, 1, pr));
    circle(ov, r, x, y);
    glow(corona, x, y, r, Math.sin(Math.PI * ss(0, 0.65, pr)) * 0.9, color);
  },

  warp({ pr, q, W, H, st, ov, warp }) {
    stage(st, `${q.x}px ${q.y}px`, `scale(${1 + 5 * pr * pr})`, 1 - ss(0.25, 0.8, pr));
    const g = ss(0.45, 1, pr);
    // the page opens late out of the vanishing point, accelerating like the stars
    circle(ov, cover(q.x, q.y, W, H) * g * g, q.x, q.y);
    if (warp) {
      const o = Math.sin(Math.PI * clamp(pr * 1.15, 0, 1));
      warp.style.display = o > 0.001 ? "block" : "none";
      warp.style.opacity = o.toFixed(3);
      warp.style.setProperty("--wx", q.x.toFixed(1) + "px");
      warp.style.setProperty("--wy", q.y.toFixed(1) + "px");
      warp.style.setProperty("--wr", (40 + pr * Math.max(W, H) * 0.35).toFixed(1) + "px");
    }
  },

  collapse({ pr, sun, W, H, st, ov, corona, color }) {
    const a = ss(0, 0.55, pr), b = ss(0.48, 1, pr);
    stage(st, `${sun.x}px ${sun.y}px`, `rotate(${(a * a * 240).toFixed(2)}deg) scale(${(1 - 0.97 * a).toFixed(4)})`, 1 - ss(0.35, 0.55, pr));
    const r = cover(sun.x, sun.y, W, H) * Math.pow(b, 1.6);
    circle(ov, r, sun.x, sun.y);
    // shockwave riding the page's edge
    glow(corona, sun.x, sun.y, Math.max(r, sun.r * 0.2 * a), ss(0.4, 0.55, pr) * (1 - ss(0.6, 1, pr)), color);
  },
};

/** Apply one frame of a transition. `pr` is already eased. */
export function applyTransition(mode: TransitionMode, f: TransitionFrame) {
  const drawer = mode === "drawer";
  if (f.pr >= 0.999 && !drawer) {
    // fully open: the page covers everything, the orbit just keeps time underneath
    if (f.ov) { f.ov.style.clipPath = "none"; f.ov.style.transform = ""; }
    f.st.style.opacity = "0";
    hide(f.corona); hide(f.warp);
    return;
  }
  hide(f.corona); hide(f.warp);
  (FRAMES[mode] ?? FRAMES.zoom)({ ...f, pr: Math.min(1, f.pr) });
}

/** Back at rest: clear every inline style the transitions wrote. */
export function resetTransition(st: HTMLElement, corona: HTMLElement | null, warp: HTMLElement | null) {
  st.style.transform = ""; st.style.opacity = ""; st.style.transformOrigin = "";
  hide(corona); hide(warp);
}
