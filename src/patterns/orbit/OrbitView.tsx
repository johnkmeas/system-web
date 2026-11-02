import { useEffect, useRef, type RefObject } from "react";
import { useReducedMotion, type MotionValue } from "motion/react";
import { clamp } from "./math";
import { useOrbitEngine } from "./useOrbitEngine";
import type { Camera, NodePos, Orbital, OrbitSettings, ResolvedSlide } from "./types";

interface OrbitViewProps {
  slides: ResolvedSlide[];
  orbitals: Orbital[];
  settings: OrbitSettings;
  settingsRef: RefObject<OrbitSettings>;
  progress: MotionValue<number>;
  posRef: RefObject<NodePos[]>;
  trackRef: RefObject<number | null>;
  stageRef: RefObject<HTMLDivElement | null>;
  overlayRef: RefObject<HTMLDivElement | null>;
  fxRef: RefObject<HTMLDivElement | null>;
  /** Node whose page is showing beside the orbit (drawer mode), highlighted. */
  current: number | null;
  cam: RefObject<Camera>;
  onOpen: (index: number) => void;
}

type DragState = { x: number; y: number; yaw: number; tilt: number };

export function OrbitView({
  slides, orbitals, settings, settingsRef, progress, posRef, trackRef, stageRef, overlayRef, fxRef, cam, onOpen, current,
}: OrbitViewProps) {
  const reduced = useReducedMotion();
  const rootRef = useRef<HTMLDivElement>(null);
  const nodeRefs = useRef<(HTMLElement | null)[]>([]);
  const backRef = useRef<SVGPathElement>(null);
  const frontRef = useRef<SVGPathElement>(null);
  const reducedRef = useRef(false);
  const drag = useRef<DragState | null>(null);
  const moved = useRef(false);

  useEffect(() => { reducedRef.current = !!reduced; }, [reduced]);

  useOrbitEngine({
    slides, orbitals, nodeRefs, backRef, frontRef, stageRef, overlayRef, fxRef, trackRef,
    posRef, settingsRef, reducedRef, dragRef: drag, cam, progress,
  });

  const onPointerDown = (e: React.PointerEvent) => {
    const drawer = settingsRef.current.transition === "drawer";
    if ((progress.get() > 0 && !drawer) || e.button > 0 || settingsRef.current.layout === "flat") return;
    moved.current = false;
    drag.current = { x: e.clientX, y: e.clientY, yaw: cam.current.yawT, tilt: cam.current.tiltT };
    const move = (ev: PointerEvent) => {
      if (!drag.current) return;
      const dx = ev.clientX - drag.current.x, dy = ev.clientY - drag.current.y;
      if (!moved.current && Math.hypot(dx, dy) > 6) {
        moved.current = true;
        rootRef.current?.classList.add("is-dragging");
      }
      cam.current.yawT = drag.current.yaw + dx * 0.006;
      cam.current.tiltT = clamp(drag.current.tilt + dy * 0.004, -0.9, 0.9);
    };
    const up = () => {
      drag.current = null;
      rootRef.current?.classList.remove("is-dragging");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
  };

  const click = (i: number) => {
    if (moved.current) { moved.current = false; return; }
    onOpen(i);
  };

  return (
    <div className={"od-orbit" + (settings.labels ? "" : " no-labels")} ref={rootRef} onPointerDown={onPointerDown}>
      <svg className="od-rings r-back" aria-hidden="true"><path ref={backRef} /></svg>
      {slides.map((s, i) => (
        <button
          key={s.id}
          data-node={i}
          ref={el => { nodeRefs.current[i] = el; }}
          className={"od-node" + (i === 0 ? " is-sun" : "") + (i === current ? " is-current" : "")}
          aria-current={i === current ? "page" : undefined}
          style={{ "--c": s.color } as React.CSSProperties}
          aria-label={"Open " + s.title}
          onClick={() => click(i)}>
          {i === 0
            ? <span className="od-sun-title">{s.title}</span>
            : <span className="od-label">{s.title}</span>}
        </button>
      ))}
      <svg className="od-rings r-front" aria-hidden="true"><path ref={frontRef} /></svg>
    </div>
  );
}
