import { createContext, useContext, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  AnimatePresence, animate, motion, useAnimationFrame, useInView, useMotionValue, useTransform,
  type MotionValue, type Variants,
} from "motion/react";
import { Carousel, CarouselArrows, CarouselAutoplay, useCarousel, type CarouselEffect } from "../../patterns";

/* ───────── Settings ───────── */

export type RevealStyle = "off" | "rise" | "fade" | "slide" | "zoom" | "blur" | "mask";
export type SectionMode = "grid" | "slider";
export type SliderFx = Extract<CarouselEffect, "slide" | "cards" | "coverflow" | "ring" | "parallax" | "scale">;
export type HoverFx = "off" | "lift" | "tilt";
export type GridFx = "none" | "spring" | "pop" | "stagger" | "flip" | "blur";

export interface MotionPrefs {
  reveal: RevealStyle;
  /** Seconds between staggered children. */
  stagger: number;
  sections: SectionMode;
  sliderFx: SliderFx;
  /** Scroll parallax strength in px (0 = off). */
  parallax: number;
  /** Ticker bands and press logos scroll; 0 = static. Base px/s. */
  marquee: number;
  /** Autoplay for sliders in ms (0 = off). */
  autoplay: number;
  hover: HoverFx;
  /** How product grids animate when filtered, sorted or re-laid out. */
  gridFx: GridFx;
}

export const DEFAULT_PREFS: MotionPrefs = {
  reveal: "rise", stagger: 0.08, sections: "slider", sliderFx: "coverflow",
  parallax: 60, marquee: 60, autoplay: 4000, hover: "tilt", gridFx: "spring",
};

/** Off = everything static, for comparing against a plain template. */
export const STATIC_PREFS: MotionPrefs = {
  reveal: "off", stagger: 0, sections: "grid", sliderFx: "slide", parallax: 0, marquee: 0, autoplay: 0, hover: "off", gridFx: "none",
};

const PrefsCtx = createContext<MotionPrefs>(DEFAULT_PREFS);
export const MotionPrefsProvider = PrefsCtx.Provider;
export const useMotionPrefs = () => useContext(PrefsCtx);

/* ───────── Scroll reveal ───────── */

const EASE = [0.2, 0.7, 0.2, 1] as const;
const ITEM: Record<Exclude<RevealStyle, "off">, Variants> = {
  rise: { hidden: { opacity: 0, y: 56 }, show: { opacity: 1, y: 0 } },
  fade: { hidden: { opacity: 0 }, show: { opacity: 1 } },
  slide: { hidden: { opacity: 0, x: -80 }, show: { opacity: 1, x: 0 } },
  zoom: { hidden: { opacity: 0, scale: 0.86 }, show: { opacity: 1, scale: 1 } },
  blur: { hidden: { opacity: 0, y: 24, filter: "blur(14px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } },
  mask: { hidden: { clipPath: "inset(0 0 100% 0)", y: 30 }, show: { clipPath: "inset(0 0 0% 0)", y: 0 } },
};

const tags = { section: motion.section, div: motion.div, ol: motion.ol, li: motion.li, figure: motion.figure, aside: motion.aside };
type Tag = keyof typeof tags;

/**
 * A section that animates in when scrolled into view. With `stagger`, its <RevealItem>
 * children animate one after another instead of the whole block at once.
 */
export function Reveal({ as = "section", stagger = false, className, children, label, style }: {
  as?: Tag; stagger?: boolean; className?: string; children: ReactNode; label?: string; style?: React.CSSProperties;
}) {
  const { reveal, stagger: gap } = useMotionPrefs();
  const M = tags[as] as typeof motion.section;
  if (reveal === "off") return <M className={className} aria-label={label} style={style}>{children}</M>;
  const variants: Variants = stagger
    ? { hidden: {}, show: { transition: { staggerChildren: gap } } }
    : ITEM[reveal];
  return (
    <M className={className} aria-label={label} style={style} variants={variants} initial="hidden" whileInView="show"
      viewport={{ once: true, amount: 0.15 }} transition={{ duration: 0.8, ease: EASE }}>
      {children}
    </M>
  );
}

export function RevealItem({ as = "div", className, children, style }: {
  as?: Tag; className?: string; children: ReactNode; style?: React.CSSProperties;
}) {
  const { reveal } = useMotionPrefs();
  const M = tags[as] as typeof motion.div;
  if (reveal === "off") return <M className={className} style={style}>{children}</M>;
  return <M className={className} style={style} variants={ITEM[reveal]} transition={{ duration: 0.7, ease: EASE }}>{children}</M>;
}

/* ───────── Scroll-linked values ───────── */

/** The page scrolls inside PageTransition's layer, not the window. */
const scroller = (el: Element | null) => el?.closest(".pt-page") as HTMLElement | null;

/**
 * Vertical offset that drifts against the scroll as the element crosses the viewport.
 * Returns a ref for the element to track and the motion value to apply.
 */
export function useParallax<E extends HTMLElement>(strength?: number): [RefObject<E | null>, MotionValue<number>] {
  const { parallax } = useMotionPrefs();
  const px = strength ?? parallax;
  const ref = useRef<E>(null);
  const y = useMotionValue(0);
  useEffect(() => {
    const el = ref.current, sc = scroller(el);
    if (!el || !sc || !px) { y.set(0); return; }
    const update = () => {
      const r = el.getBoundingClientRect(), s = sc.getBoundingClientRect();
      // -1 when the element's centre is at the bottom of the viewport, +1 at the top
      const t = ((s.top + s.height / 2) - (r.top + r.height / 2)) / (s.height / 2 + r.height / 2);
      y.set(Math.max(-1, Math.min(1, t)) * px);
    };
    update();
    sc.addEventListener("scroll", update, { passive: true });
    return () => sc.removeEventListener("scroll", update);
  }, [px, y]);
  return [ref, y];
}

/* ───────── Marquee ───────── */

/**
 * Infinite ticker. Scrolling the page speeds it up and flips its direction,
 * like the scroll-velocity text in the Motion gallery.
 */
export function Marquee({ children, className, speed, reverse = false, label }: {
  children: ReactNode; className?: string; speed?: number; reverse?: boolean; label?: string;
}) {
  const { marquee } = useMotionPrefs();
  const base = speed ?? marquee;
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const skew = useMotionValue(0);
  const dir = useRef(reverse ? 1 : -1);
  const last = useRef<number | null>(null);
  const transform = useTransform(() => `translateX(${x.get()}px) skewX(${skew.get()}deg)`);

  useAnimationFrame((_, delta) => {
    const el = track.current;
    if (!el || !base) return;
    const sc = scroller(el);
    let boost = 0;
    if (sc) {
      const top = sc.scrollTop;
      if (last.current !== null && top !== last.current) {
        const v = (top - last.current) / (delta / 1000); // px/s
        dir.current = (v > 0 ? -1 : 1) * (reverse ? -1 : 1);
        boost = Math.min(Math.abs(v) / 400, 6);
      }
      last.current = top;
    }
    skew.set(skew.get() + ((boost ? -dir.current * Math.min(boost * 2, 10) : 0) - skew.get()) * 0.12);
    const half = el.scrollWidth / 2;
    let next = x.get() + dir.current * base * (1 + boost) * (delta / 1000);
    if (next <= -half) next += half;
    if (next > 0) next -= half;
    x.set(next);
  });

  return (
    <div className={"st-marquee" + (className ? " " + className : "")} aria-label={label} role={label ? "group" : undefined}>
      <motion.div ref={track} className="st-marquee-track" style={{ transform: base ? transform : undefined }}>
        <div className="st-marquee-set">{children}</div>
        {base > 0 && <div className="st-marquee-set" aria-hidden="true">{children}</div>}
      </motion.div>
    </div>
  );
}

/* ───────── Small movers ───────── */

/** Counts up from 0 when it scrolls into view; keeps any prefix/suffix ("4.8★", "200k+"). */
export function CountUp({ value, className }: { value: string; className?: string }) {
  const { reveal } = useMotionPrefs();
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const m = value.match(/^(\D*)([\d.,]+)(.*)$/);
  const [text, setText] = useState(reveal === "off" || !m ? value : value.replace(m[2], "0"));
  useEffect(() => {
    if (!m || reveal === "off" || !inView) { setText(value); return; }
    const target = parseFloat(m[2].replace(/,/g, ""));
    const decimals = (m[2].split(".")[1] ?? "").length;
    const c = animate(0, target, {
      duration: 1.4, ease: EASE,
      onUpdate: v => setText(m[1] + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + m[3]),
    });
    return () => c.stop();
    // m is derived from value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value, reveal]);
  return <b ref={ref} className={className}>{text}</b>;
}

/** Hover lift or 3D tilt toward the pointer. */
export function HoverCard({ children, className }: { children: ReactNode; className?: string }) {
  const { hover } = useMotionPrefs();
  const rx = useMotionValue(0), ry = useMotionValue(0);
  if (hover === "off") return <div className={className}>{children}</div>;
  if (hover === "lift") {
    return (
      <motion.div className={className} whileHover={{ y: -8 }} transition={{ type: "spring", stiffness: 400, damping: 24 }}>
        {children}
      </motion.div>
    );
  }
  return (
    <motion.div className={className} style={{ rotateX: rx, rotateY: ry, transformPerspective: 900 }}
      onPointerMove={e => {
        const b = e.currentTarget.getBoundingClientRect();
        ry.set(((e.clientX - b.left) / b.width - 0.5) * 14);
        rx.set(-((e.clientY - b.top) / b.height - 0.5) * 14);
      }}
      onPointerLeave={() => { animate(rx, 0, { type: "spring", stiffness: 300, damping: 20 }); animate(ry, 0, { type: "spring", stiffness: 300, damping: 20 }); }}>
      {children}
    </motion.div>
  );
}

/* ───────── Filterable grid ───────── */

const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;
const GRID_FX: Record<Exclude<GridFx, "none">, Variants> = {
  spring: { out: { opacity: 0, scale: 0.94 }, in: { opacity: 1, scale: 1 } },
  pop: {
    out: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } },
    in: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 500, damping: 22 } },
  },
  stagger: {
    out: { opacity: 0, y: 40, transition: { duration: 0.2 } },
    in: (i: number) => ({ opacity: 1, y: 0, transition: { duration: 0.5, delay: Math.min(i, 16) * 0.045, ease: EASE } }),
  },
  flip: {
    out: { opacity: 0, rotateY: 90, transformPerspective: 900, transition: { duration: 0.25 } },
    in: (i: number) => ({ opacity: 1, rotateY: 0, transformPerspective: 900, transition: { duration: 0.5, delay: Math.min(i, 16) * 0.03, ease: EASE } }),
  },
  blur: {
    out: { opacity: 0, scale: 0.96, filter: "blur(10px)", transition: { duration: 0.25 } },
    in: { opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration: 0.45, ease: EASE } },
  },
};

/**
 * Grid whose items animate in, out and into their new places when the list changes.
 * Items keep their key across filters so Motion can move them rather than remount them.
 */
export function AnimatedGrid<T>({ items, keyOf, render, className, itemClass }: {
  items: T[]; keyOf: (item: T) => string; render: (item: T, i: number) => ReactNode;
  className?: string; itemClass?: (item: T, i: number) => string | undefined;
}) {
  const { gridFx } = useMotionPrefs();
  if (gridFx === "none") {
    return <div className={className}>{items.map((it, i) => <div key={keyOf(it)} className={itemClass?.(it, i)}>{render(it, i)}</div>)}</div>;
  }
  return (
    <div className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((it, i) => (
          <motion.div key={keyOf(it)} layout className={itemClass?.(it, i)} custom={i} variants={GRID_FX[gridFx]}
            initial="out" animate="in" exit="out" transition={{ layout: SPRING }}>
            {render(it, i)}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ───────── Sliding sections ───────── */

const FX_LAYOUT: Record<SliderFx, { size: number; align: "start" | "center"; loop: boolean }> = {
  slide: { size: 260, align: "start", loop: false },
  scale: { size: 280, align: "center", loop: true },
  parallax: { size: 300, align: "center", loop: true },
  cards: { size: 300, align: "center", loop: true },
  coverflow: { size: 280, align: "center", loop: true },
  ring: { size: 200, align: "center", loop: true },
};

/**
 * A row of items that is a plain grid or a slider, depending on the Motion settings.
 * `fx` overrides the slider effect set in the dock.
 */
export function Shelf<T>({ items, render, height = 440, label, gridClass, fx, head }: {
  items: T[]; render: (item: T, i: number) => ReactNode; height?: number; label: string; gridClass: string;
  fx?: SliderFx; head?: (arrows: ReactNode) => ReactNode;
}) {
  const { sections, sliderFx, autoplay } = useMotionPrefs();
  if (sections === "grid") {
    return (
      <>
        {head?.(null)}
        <Reveal as="div" stagger className={gridClass}>
          {items.map((it, i) => <RevealItem key={i}>{render(it, i)}</RevealItem>)}
        </Reveal>
      </>
    );
  }
  const effect = fx ?? sliderFx;
  return <ShelfSlider key={`${effect}-${items.length}-${autoplay}`} items={items} render={render} height={height} label={label} effect={effect} head={head} />;
}

function ShelfSlider<T>({ items, render, height, label, effect, head }: {
  items: T[]; render: (item: T, i: number) => ReactNode; height: number; label: string; effect: SliderFx;
  head?: (arrows: ReactNode) => ReactNode;
}) {
  const { autoplay } = useMotionPrefs();
  const lay = FX_LAYOUT[effect];
  const api = useCarousel({ count: items.length, loop: lay.loop, autoplay });
  return (
    <>
      {head?.(<CarouselArrows api={api} />)}
      <Reveal as="div" className={"st-slider is-" + effect}>
        <Carousel api={api} items={items} effect={effect} itemSize={lay.size} gap={effect === "slide" ? 16 : 24} align={lay.align}
          height={height} label={label}
          renderItem={(it, { index }) => <div className="st-slide">{render(it, index)}</div>} />
        {autoplay > 0 && <CarouselAutoplay api={api} />}
      </Reveal>
    </>
  );
}
