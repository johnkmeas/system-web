import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  animate, useMotionValue, useMotionValueEvent,
  type AnimationPlaybackControls, type MotionValue, type PanInfo, type ValueAnimationTransition,
} from "motion/react";

export interface CarouselOptions {
  count: number;
  /** Wrap around forever (no clones needed). */
  loop?: boolean;
  /** Snap to slides on release. `false` = free scroll with momentum. */
  snap?: boolean;
  orientation?: "x" | "y";
  /** Right-to-left: first slide on the right, arrows and drag reversed. */
  rtl?: boolean;
  /** Milliseconds per slide; 0 disables autoplay. */
  autoplay?: number;
  initialIndex?: number;
  onChange?: (index: number) => void;
}

export interface CarouselApi {
  count: number;
  index: number;
  loop: boolean;
  orientation: "x" | "y";
  rtl: boolean;
  /** Fractional slide position (unbounded when looping). */
  pos: MotionValue<number>;
  /** Pixel distance between slides in the interactive viewport (set by <Carousel>). */
  step: MotionValue<number>;
  /** Autoplay progress through the current slide, 0–1. */
  progress: MotionValue<number>;
  maxPos: number;
  /** Called by the interactive <Carousel> after it measures itself. */
  setLayout: (step: number, maxPos: number) => void;
  canPrev: boolean;
  canNext: boolean;
  playing: boolean;
  setPlaying: (playing: boolean) => void;
  go: (index: number) => void;
  next: () => void;
  prev: () => void;
  /** Jump the track to a 0–1 fraction (for scrubbers); call `release` when done. */
  scrub: (fraction: number) => void;
  release: () => void;
  /** Wrap a click handler so it doesn't fire at the end of a drag. */
  clickGuard: <A extends unknown[]>(fn: (...args: A) => void) => (...args: A) => void;
  viewportProps: {
    ref: (el: HTMLDivElement | null) => void;
    tabIndex: number;
    onPanStart: () => void;
    onPan: (e: PointerEvent, info: PanInfo) => void;
    onPanEnd: (e: PointerEvent, info: PanInfo) => void;
    onKeyDown: (e: KeyboardEvent) => void;
    onPointerEnter: () => void;
    onPointerLeave: () => void;
    onFocus: () => void;
    onBlur: () => void;
  };
}

const SPRING = { type: "spring", stiffness: 300, damping: 34, mass: 0.9 } as const;
export const wrap = (i: number, n: number) => ((i % n) + n) % n;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
// past the ends, the track follows the finger at a fraction of the distance
const rubber = (p: number, max: number) => (p < 0 ? p * 0.3 : p > max ? max + (p - max) * 0.3 : p);
const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Position of slide `i` relative to the track position, in slides (0 = at the anchor). */
export function slotOf(i: number, p: number, n: number, loop: boolean) {
  const d = i - p;
  return loop ? wrap(d + n / 2, n) - n / 2 : d;
}

export function useCarousel({
  count: n, loop = false, snap = true, orientation = "x", rtl = false,
  autoplay = 0, initialIndex = 0, onChange,
}: CarouselOptions): CarouselApi {
  const pos = useMotionValue(initialIndex);
  const step = useMotionValue(0);
  const progress = useMotionValue(0);
  const [index, setIndex] = useState(initialIndex);
  const [maxPos, setMaxPos] = useState(loop ? Infinity : n - 1);
  const [playing, setPlaying] = useState(() => autoplay > 0 && !prefersReduced());
  const [held, setHeld] = useState(false); // hovered or focused: autoplay pauses
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const dragging = useRef(false);
  const moved = useRef(false);
  const panStart = useRef(0);
  const indexRef = useRef(initialIndex);
  // where the track is heading while an animation runs, so rapid next/prev clicks stack up
  const target = useRef<number | null>(null);
  const sign = orientation === "x" && rtl ? -1 : 1;

  const idxOf = (p: number) => (loop ? wrap(Math.round(p), n) : clamp(Math.round(p), 0, n - 1));

  useMotionValueEvent(pos, "change", p => {
    const i = idxOf(p);
    if (i !== indexRef.current) { indexRef.current = i; setIndex(i); onChange?.(i); }
  });

  const run = (t: number, opts: ValueAnimationTransition<number>) => {
    anim.current?.stop();
    target.current = t;
    const a = animate(pos, t, opts);
    anim.current = a;
    a.finished.then(() => { if (anim.current === a) target.current = null; });
  };
  const stop = () => { anim.current?.stop(); target.current = null; };
  const aim = () => target.current ?? pos.get();

  const settle = (to: number, velocity = 0) => {
    run(loop ? to : clamp(to, 0, maxPos), { ...SPRING, velocity });
    progress.set(0);
  };

  const go = (i: number) => {
    if (!loop) return settle(i);
    // take the short way round
    const cur = Math.round(aim());
    let d = wrap(i, n) - wrap(cur, n);
    if (d > n / 2) d -= n;
    if (d < -n / 2) d += n;
    settle(cur + d);
  };
  const lastIndex = idxOf(maxPos === Infinity ? n - 1 : maxPos);
  const next = () => {
    const at = idxOf(aim());
    return loop || at < lastIndex ? go(at + 1) : autoplay ? go(0) : undefined;
  };
  const prev = () => {
    const at = idxOf(aim());
    return loop || at > 0 ? go(at - 1) : undefined;
  };

  const latest = useRef({ next, settle, maxPos });
  latest.current = { next, settle, maxPos };

  // Wheel / trackpad: native listener so we can preventDefault while we consume the gesture.
  useEffect(() => {
    if (!node) return;
    let t = 0;
    const onWheel = (e: WheelEvent) => {
      const dx = orientation === "x"
        ? (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : 0)
        : e.deltaY;
      if (!dx || !step.get()) return;
      const p = pos.get(), max = latest.current.maxPos;
      // at the ends of a vertical carousel, let the page scroll on
      if (!loop && ((p <= 0 && dx < 0) || (p >= max && dx > 0))) return;
      e.preventDefault();
      stop();
      const np = p + (dx * sign) / step.get();
      pos.set(loop ? np : clamp(np, 0, max));
      clearTimeout(t);
      t = window.setTimeout(() => { if (snap) latest.current.settle(Math.round(pos.get())); }, 140);
    };
    node.addEventListener("wheel", onWheel, { passive: false });
    return () => { node.removeEventListener("wheel", onWheel); clearTimeout(t); };
  }, [node, orientation, loop, snap, sign, pos, step]);

  // Autoplay: advance when progress fills; paused while held, dragging or the tab is hidden.
  useEffect(() => {
    if (!autoplay || !playing || held) return;
    let raf = 0, last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      if (!dragging.current && !document.hidden) {
        const pr = progress.get() + dt / autoplay;
        if (pr >= 1) latest.current.next(); // resets progress
        else progress.set(pr);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [autoplay, playing, held, progress]);

  const axis = (v: { x: number; y: number }) => (orientation === "x" ? v.x : v.y) * sign;

  return {
    count: n, index, loop, orientation, rtl, pos, step, progress, maxPos,
    setLayout: (st, mp) => {
      step.set(st);
      const m = loop ? Infinity : mp;
      setMaxPos(m);
      if (!loop && pos.get() > m) pos.set(m);
    },
    canPrev: loop || index > 0,
    canNext: loop || index < lastIndex,
    playing, setPlaying, go, next, prev,
    scrub: f => {
      stop();
      const range = loop ? n - 1 : maxPos;
      const cycle = loop ? Math.floor(Math.round(pos.get()) / n) * n : 0;
      pos.set(cycle + clamp(f, 0, 1) * range);
    },
    release: () => settle(snap ? Math.round(pos.get()) : pos.get()),
    clickGuard: fn => (...args) => { if (!moved.current) fn(...args); },
    viewportProps: {
      ref: setNode,
      tabIndex: 0,
      onPanStart: () => {
        stop();
        dragging.current = true;
        moved.current = true;
        panStart.current = pos.get();
      },
      onPan: (_, info) => {
        const p = panStart.current - axis(info.offset) / step.get();
        pos.set(loop ? p : rubber(p, maxPos));
      },
      onPanEnd: (_, info) => {
        dragging.current = false;
        setTimeout(() => { moved.current = false; }, 0);
        const v = -axis(info.velocity) / step.get(); // slides per second
        if (snap) {
          // a flick moves at most one slide past where the finger left it
          const t = Math.round(pos.get() + clamp(v * 0.2, -1, 1));
          settle(t, v);
        } else {
          const proj = pos.get() + v * 0.45;
          const t = loop ? proj : clamp(proj, 0, maxPos);
          run(t, { type: "spring", stiffness: 120, damping: 26, velocity: v });
        }
      },
      onKeyDown: e => {
        const fwd = orientation === "x" ? (rtl ? "ArrowLeft" : "ArrowRight") : "ArrowDown";
        const back = orientation === "x" ? (rtl ? "ArrowRight" : "ArrowLeft") : "ArrowUp";
        if (e.key === fwd) { e.preventDefault(); next(); }
        else if (e.key === back) { e.preventDefault(); prev(); }
        else if (e.key === "Home") { e.preventDefault(); go(0); }
        else if (e.key === "End") { e.preventDefault(); go(n - 1); }
      },
      onPointerEnter: () => setHeld(true),
      onPointerLeave: () => setHeld(false),
      onFocus: () => setHeld(true),
      onBlur: () => setHeld(false),
    },
  };
}
