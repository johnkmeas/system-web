import { useEffect, type RefObject } from "react";
import type { MotionValue } from "motion/react";
import { clamp, project, targetsFor, TAU } from "./math";
import { createFlatSim } from "./physics";
import type { Camera, NodePos, Orbital, OrbitSettings, OrbitTarget, ResolvedSlide } from "./types";

export interface OrbitEngineOptions {
  slides: ResolvedSlide[];
  orbitals: Orbital[];
  nodeRefs: RefObject<(HTMLElement | null)[]>;
  backRef: RefObject<SVGPathElement | null>;
  frontRef: RefObject<SVGPathElement | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  trackRef: RefObject<number | null>;
  posRef: RefObject<NodePos[]>;
  settingsRef: RefObject<OrbitSettings>;
  reducedRef: RefObject<boolean>;
  dragRef: RefObject<unknown>;
  cam: RefObject<Camera>;
  /** 0 = orbit, 1 = page fully open */
  progress: MotionValue<number>;
}

/**
 * One requestAnimationFrame loop that projects 3D orbits to the screen and writes
 * transforms straight to the DOM (no React renders per frame). It also drives the
 * zoom transition from `progress` and the tracked node's live position.
 */
export function useOrbitEngine(opts: OrbitEngineOptions) {
  const { slides, orbitals } = opts;

  useEffect(() => {
    const {
      nodeRefs, backRef, frontRef, stageRef, overlayRef, trackRef,
      posRef, settingsRef, reducedRef, dragRef, cam, progress,
    } = opts;
    const n = slides.length;
    let raf = 0, last = performance.now(), dirty = true;
    let lastSig = "";
    let targets: OrbitTarget[] = [];
    let cur: OrbitTarget[] | null = null;
    const ang = slides.map(() => 0);
    let W = 0, H = 0, unit = 1, cx = 0, cy = 0;
    const sizes: number[] = [];
    const rad: number[] = []; // body radius per node, layout units
    const sim = createFlatSim(n);
    let flatF = 0, flatInit = false;

    function layout() {
      W = window.innerWidth; H = window.innerHeight;
      const maxR = 450; // fixed so nodes keep their size when the arrangement changes
      unit = Math.min(W / (maxR * 2 + (W < 600 ? 90 : 160)), H / (maxR * 2 + 260));
      cx = W / 2; cy = H / 2;
      dirty = true;
      const minPx = W < 600 ? 38 : 28;
      slides.forEach((s, i) => {
        const px = i === 0 ? Math.max(s.size * unit, 84) : Math.max(s.size * unit, minPx);
        sizes[i] = px;
        rad[i] = px / unit / 2;
        const el = nodeRefs.current[i];
        if (el) el.style.width = el.style.height = px + "px";
      });
    }

    function frame(now: number) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // The orbit never stops, so the zoom can track a node wherever it has moved to.
      const S = settingsRef.current;
      const gs = (S.paused ? 0 : S.speed) * (reducedRef.current ? 0.15 : 1);
      const sig = S.layout + "|" + S.randomness + "|" + S.seed;
      if (sig !== lastSig) {
        targets = targetsFor(slides, orbitals, S);
        lastSig = sig;
        if (!cur) cur = targets.map(o => ({ ...o }));
      }
      const C = cur!;
      // Ease every orbit toward its target so arrangement changes glide instead of jump.
      const ease = 1 - Math.pow(0.03, dt);
      for (let i = 1; i < n; i++) {
        const o = C[i], g = targets[i];
        o.r += (g.r - o.r) * ease;
        o.tilt += (g.tilt - o.tilt) * ease;
        o.spin += (g.spin - o.spin) * ease;
        o.speed += (g.speed - o.speed) * ease;
        o.phase += (g.phase - o.phase) * ease;
        ang[i] += dt * gs * o.speed;
      }
      const pr = progress.get();
      // Fully covered by a page: keep computing positions, skip DOM writes.
      const hidden = pr >= 0.999 && !dirty;
      const c = cam.current;
      const flat = S.layout === "flat";
      if (flat) { c.yawT = 0; c.tiltT = 0; }
      flatF += ((flat ? 1 : 0) - flatF) * ease;
      if (Math.abs((flat ? 1 : 0) - flatF) < 0.002) flatF = flat ? 1 : 0;
      if (S.autoRotate && !flat && !S.paused && !dragRef.current && pr === 0) c.yawT += dt * 0.12 * S.speed;
      c.yaw += (c.yawT - c.yaw) * 0.1;
      c.tilt += (c.tiltT - c.tilt) * 0.1;
      const tilt = clamp(c.tilt, -1.3, 1.3);

      let back = "", front = "";
      const pos = posRef.current;

      const sun = nodeRefs.current[0];
      if (sun) sun.style.transform = `translate3d(${cx}px, ${cy}px, 0) translate(-50%, -50%)`;
      pos[0] = { x: cx, y: cy, r: sizes[0] / 2 };

      const seen = new Set<string>();
      if (S.rings && flatF < 0.05) for (let i = 1; i < n; i++) {
        const o = C[i];
        const key = Math.round(o.r) + "|" + Math.round(o.tilt) + "|" + Math.round(o.spin);
        if (seen.has(key)) continue; // nodes sharing a ring draw it once
        seen.add(key);
        // ring, split into the half behind the sun and the half in front
        const N = 96;
        let prev: boolean | null = null;
        for (let k = 0; k <= N; k++) {
          const p = project(o, (k / N) * TAU, c.yaw, tilt);
          const X = (cx + p.x * unit).toFixed(1), Y = (cy + p.y * unit).toFixed(1);
          const behind = p.z > 0;
          if (behind !== prev) {
            if (prev !== null) { if (prev) back += `L${X} ${Y}`; else front += `L${X} ${Y}`; }
            if (behind) back += `M${X} ${Y}`; else front += `M${X} ${Y}`;
          } else if (behind) back += `L${X} ${Y}`;
          else front += `L${X} ${Y}`;
          prev = behind;
        }
      }
      if (S.rings && flatF > 0.95) {
        // flat rings: plain circles at each node's home radius
        const seenR = new Set<number>();
        for (let i = 1; i < n; i++) {
          const rr = C[i].r * unit, key = Math.round(rr);
          if (seenR.has(key)) continue;
          seenR.add(key);
          back += `M${(cx + rr).toFixed(1)} ${cy.toFixed(1)}A${rr.toFixed(1)} ${rr.toFixed(1)} 0 1 0 ${(cx - rr).toFixed(1)} ${cy.toFixed(1)}A${rr.toFixed(1)} ${rr.toFixed(1)} 0 1 0 ${(cx + rr).toFixed(1)} ${cy.toFixed(1)}`;
        }
      }

      // 3D orbit positions (layout units)
      const p3: ReturnType<typeof project>[] = [];
      for (let i = 1; i < n; i++) p3[i] = project(C[i], C[i].phase + ang[i], c.yaw, tilt);

      // flat physics: start from wherever the nodes are on screen, so the switch is seamless
      if (flatF > 0) {
        if (!flatInit) { sim.reset(p3); flatInit = true; }
        const steps = 3, h = dt / steps;
        for (let k = 0; k < steps; k++) sim.step(h, flat ? gs : 0, C, rad);
      } else flatInit = false;

      for (let i = 1; i < n; i++) {
        const q = p3[i], f = flatF, fp = sim.pos[i];
        const p = f > 0
          ? { x: q.x + (fp.x - q.x) * f, y: q.y + (fp.y - q.y) * f, z: q.z * (1 - f), s: q.s + (1 - q.s) * f }
          : q;
        const X = cx + p.x * unit, Y = cy + p.y * unit;
        const el = nodeRefs.current[i];
        if (el && !hidden) {
          el.style.transform = `translate3d(${X}px, ${Y}px, 0) translate(-50%, -50%) scale(${p.s})`;
          el.style.zIndex = String(clamp(500 - Math.round(p.z), 1, 999));
          const d = clamp((p.z + 420) / 840, 0, 1);
          el.style.setProperty("--label", (1 - d * 0.7).toFixed(3));
        }
        pos[i] = { x: X, y: Y, r: (sizes[i] * p.s) / 2 };
      }
      if (!hidden && backRef.current) backRef.current.setAttribute("d", back);
      if (!hidden && frontRef.current) frontRef.current.setAttribute("d", front);
      dirty = false;

      // Zoom transition, driven by progress (0 = orbit, 1 = page) and the tracked
      // node's live position this frame.
      const st = stageRef.current, ov = overlayRef.current, ti = trackRef.current;
      if (st) {
        if (pr >= 0.999) {
          if (ov && ov.style.clipPath !== "none") ov.style.clipPath = "none";
          st.style.opacity = "0";
        } else if (pr > 0.0005 && ti !== null && pos[ti]) {
          const q = pos[ti], sc = 1 + 2.4 * pr;
          st.style.transformOrigin = `${q.x}px ${q.y}px`;
          st.style.transform = `scale(${sc})`;
          st.style.opacity = String(1 - pr);
          if (ov) {
            const R = Math.hypot(Math.max(q.x, W - q.x), Math.max(q.y, H - q.y)) + 40;
            const r0 = q.r * sc;
            const r = r0 + (R - r0) * pr;
            ov.style.clipPath = `circle(${r.toFixed(1)}px at ${q.x.toFixed(1)}px ${q.y.toFixed(1)}px)`;
          }
        } else if (st.style.transform) {
          st.style.transform = ""; st.style.opacity = ""; st.style.transformOrigin = "";
        }
      }
      raf = requestAnimationFrame(frame);
    }

    layout();
    raf = requestAnimationFrame(frame);
    window.addEventListener("resize", layout);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", layout); };
    // Refs are stable; restart the loop only when the deck's content changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slides, orbitals]);
}
