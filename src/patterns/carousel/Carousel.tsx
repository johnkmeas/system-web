import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import { slotOf, type CarouselApi } from "./useCarousel";
import "./carousel.css";

/**
 * How slides are placed relative to the track position.
 * 2D: slide, fade, scale, parallax, cards. 3D: coverflow, ring.
 */
export type CarouselEffect = "slide" | "fade" | "scale" | "parallax" | "cards" | "coverflow" | "ring";

export interface SlideContext {
  index: number;
  /** Slides away from the anchor position (0 = current); live, fractional. */
  offset: MotionValue<number>;
  active: boolean;
}

export interface CarouselProps<T> {
  api: CarouselApi;
  items: T[];
  renderItem: (item: T, ctx: SlideContext) => ReactNode;
  effect?: CarouselEffect;
  /** ≤ 1: fraction of the viewport's main axis. > 1: pixels. */
  itemSize?: number;
  gap?: number;
  align?: "center" | "start";
  /** Items per slide on the cross axis (grid). The api's count must be ceil(items / rows). */
  rows?: number;
  /** Viewport height (CSS length or px). */
  height?: number | string;
  /** `false` for a follower that mirrors another carousel's position without its own gestures. */
  interactive?: boolean;
  /** Followers can run on a different axis from the carousel they follow. */
  orientation?: "x" | "y";
  label?: string;
  className?: string;
  style?: CSSProperties;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function Carousel<T>({
  api, items, renderItem, effect = "slide", itemSize = 0.8, gap = 16, align = "center", rows = 1,
  height = 360, interactive = true, orientation: axis, label = "Carousel", className, style,
}: CarouselProps<T>) {
  const { rtl } = api;
  const orientation = (!interactive && axis) || api.orientation;
  const [node, setNode] = useState<HTMLDivElement | null>(null);
  const [main, setMain] = useState(0);
  const step = useMotionValue(0);
  const base = useMotionValue(0);
  const stacked = effect === "fade" || effect === "cards";

  const slides = useMemo(() => {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += rows) out.push(items.slice(i, i + rows));
    return out;
  }, [items, rows]);
  const n = slides.length;

  useEffect(() => {
    if (!node) return;
    const ro = new ResizeObserver(() => setMain(orientation === "x" ? node.clientWidth : node.clientHeight));
    ro.observe(node);
    return () => ro.disconnect();
  }, [node, orientation]);

  const size = itemSize <= 1 ? main * itemSize : itemSize;
  useEffect(() => {
    if (!main) return;
    const st = size + gap;
    const b = align === "center" || stacked ? (main - size) / 2 : rtl ? main - size : 0;
    step.set(st);
    base.set(b);
    if (interactive) {
      const mp = align === "center" || stacked ? n - 1 : Math.max(0, n - (main + gap) / st);
      api.setLayout(st, mp);
    }
    // api.setLayout is recreated every render; the inputs above are what matter
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [main, size, gap, align, rtl, n, interactive, stacked]);

  const viewport = interactive ? api.viewportProps : {};
  const ref = (el: HTMLDivElement | null) => { setNode(el); if (interactive) api.viewportProps.ref(el); };

  return (
    <motion.div
      {...viewport}
      ref={ref}
      className={"cr-viewport" + (interactive ? " is-interactive" : "") + (className ? " " + className : "")}
      data-orientation={orientation}
      data-effect={effect}
      dir={rtl ? "rtl" : undefined}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      style={{ height, touchAction: orientation === "x" ? "pan-y" : "pan-x", ...style }}>
      {main > 0 && slides.map((group, i) => (
        <Slide key={i} api={api} orientation={orientation} i={i} n={n} effect={effect} size={size} step={step} base={base}
          main={main} active={i === api.index} label={`${i + 1} of ${n}`}>
          {offset => rows === 1
            ? renderItem(group[0], { index: i, offset, active: i === api.index })
            : (
              <div className="cr-grid" style={{ ["--rows" as string]: rows, gap }}>
                {group.map((item, j) => (
                  <div key={j} className="cr-cell">
                    {renderItem(item, { index: i * rows + j, offset, active: i === api.index })}
                  </div>
                ))}
              </div>
            )}
        </Slide>
      ))}
    </motion.div>
  );
}

function Slide({ api, orientation, i, n, effect, size, step, base, main, active, label, children }: {
  api: CarouselApi; orientation: "x" | "y"; i: number; n: number; effect: CarouselEffect; size: number;
  step: MotionValue<number>; base: MotionValue<number>; main: number; active: boolean; label: string;
  children: (offset: MotionValue<number>) => ReactNode;
}) {
  const { rtl, loop, pos } = api;
  const dir = orientation === "x" && rtl ? -1 : 1;
  const offset = useTransform(() => slotOf(i, pos.get(), n, loop));
  const ringCount = Math.max(n, 8);
  const ringAngle = 360 / ringCount;

  const t = useTransform(() => {
    const o = offset.get(), s = step.get(), b = base.get(), a = Math.abs(o);
    // how many slides fit on either side before one is fully out of view
    const reach = main / Math.max(s, 1) / 2 + 1.5;
    // ring: slides sit on a cylinder sized so neighbors are one step apart
    const ringR = s / (2 * Math.tan(Math.PI / ringCount));
    let m = b + o * s * dir, z = 0, rot = 0, scale = 1, opacity = a > reach ? 0 : 1;
    switch (effect) {
      case "fade":
        m = b; opacity = clamp(1 - a, 0, 1);
        break;
      case "scale":
        scale = 1 - Math.min(a, 2) * 0.14; opacity = clamp(1 - a * 0.28, 0, 1);
        break;
      case "cards":
        if (o < 0) { m = b + o * s * dir * 1.1; opacity = clamp(1 + o * 1.4, 0, 1); }
        else { m = b + o * 26 * dir; scale = 1 - o * 0.07; opacity = clamp(3.5 - o, 0, 1); }
        break;
      case "coverflow": {
        const near = Math.min(a, 1), far = Math.max(a - 1, 0);
        m = b + Math.sign(o) * (near * s * 0.62 + far * s * 0.24) * dir;
        rot = -clamp(o, -1, 1) * 52 * dir; z = -near * 220 - far * 40;
        break;
      }
      case "ring": {
        const ang = o * ringAngle;
        const rad = (ang * Math.PI) / 180;
        m = b + Math.sin(rad) * ringR * dir; z = (Math.cos(rad) - 1) * ringR;
        rot = -ang * dir; opacity = Math.cos(rad) < -0.1 ? 0 : 1;
        break;
      }
    }
    return { m, z, rot, scale, opacity, zIndex: 100 - Math.round(a * 10) };
  });

  const x = useTransform(() => (orientation === "x" ? t.get().m : 0));
  const y = useTransform(() => (orientation === "y" ? t.get().m : 0));
  const z = useTransform(() => t.get().z);
  const rotateY = useTransform(() => (orientation === "x" ? t.get().rot : 0));
  const rotateX = useTransform(() => (orientation === "y" ? -t.get().rot : 0));
  const scale = useTransform(() => t.get().scale);
  const opacity = useTransform(() => t.get().opacity);
  const zIndex = useTransform(() => t.get().zIndex);
  // parallax: the slide's content drifts against the motion inside its frame
  const px = useTransform(() => (effect === "parallax" ? -offset.get() * size * 0.35 * dir : 0));

  const dims = orientation === "x" ? { width: size, height: "100%" } : { height: size, width: "100%" };
  return (
    <motion.div className="cr-slide" role="group" aria-roledescription="slide" aria-label={label}
      aria-current={active || undefined}
      style={{ ...dims, x, y, z, rotateX, rotateY, scale, opacity, zIndex }}>
      {effect === "parallax" ? (
        <motion.div className="cr-parallax" style={orientation === "x" ? { x: px } : { y: px }}
          data-orientation={orientation}>
          {children(offset)}
        </motion.div>
      ) : children(offset)}
    </motion.div>
  );
}
