import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useAnimationFrame, useReducedMotion } from "motion/react";
import { Carousel, CarouselArrows, CarouselDots, CarouselThumbs, Lightbox, useCarousel, type CarouselEffect } from "../carousel";
import { CardStack } from "../card-stack/CardStack";
import { PageTransition } from "../transitions/PageTransition";
import "./media-gallery.css";

/**
 * How the media is laid out.
 * - `thumbs` / `thumbs-side`: main image synced with a thumbnail strip below / rail beside it
 * - `peek`: swipeable slider showing the edge of the next image, with dots
 * - `coverflow`: 3D coverflow
 * - `cards`: a deck you swipe through; the top card tucks in at the back
 * - `stacked`: a grid of every image, with a "show more" button that reveals the rest
 * - `orbit`: thumbnails orbit the main image like a ring; picking one opens it with a circle reveal
 */
export type GalleryLayout = "thumbs" | "thumbs-side" | "peek" | "coverflow" | "cards" | "stacked" | "orbit";
/** `zoom`: the image grows out of its spot. `carousel`: a full-screen swipeable viewer revealed from the click. */
export type GalleryLightbox = "none" | "zoom" | "carousel";

export interface MediaGalleryProps<T> {
  items: T[];
  /** Draw one item; it should fill its box. */
  render: (item: T, index: number) => ReactNode;
  /** Thumbnail drawing; defaults to `render`. */
  renderThumb?: (item: T, index: number) => ReactNode;
  layout?: GalleryLayout;
  /** How the main image changes in the `thumbs` layouts. */
  effect?: CarouselEffect;
  lightbox?: GalleryLightbox;
  /** Magnify under the mouse pointer (mouse only). */
  hoverZoom?: boolean;
  /** Width ÷ height of the media (default 4 / 5). Lightboxes take this shape so images never stretch. */
  aspect?: number;
  /** `stacked`: how many show before "Show more". */
  visible?: number;
  /** Shown over the main image (e.g. a badge). */
  overlay?: ReactNode;
  label?: string;
  className?: string;
  style?: CSSProperties;
}

type Origin = { x: number; y: number };
interface Open { index: number; origin: Origin }

const centerOf = (e: MouseEvent): Origin => {
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export function MediaGallery<T>({
  items, render, renderThumb = render, layout = "thumbs", effect = "slide", lightbox = "zoom",
  hoverZoom = false, aspect = 4 / 5, visible = 4, overlay, label = "Product media", className, style,
}: MediaGalleryProps<T>) {
  const uid = useId();
  const [open, setOpen] = useState<Open | null>(null);
  // Index to land on when a layout or the viewer hands control back.
  const [index, setIndex] = useState(0);
  const close = useCallback((last?: number) => {
    if (last !== undefined) setIndex(last);
    setOpen(null);
  }, []);

  const media = (i: number, opts: MediaOpts = {}) => {
    const onOpen = lightbox === "none" ? undefined : (e: MouseEvent) => {
      const o = centerOf(e);
      const go = () => setOpen({ index: i, origin: o });
      if (opts.guard) opts.guard(go)(); else go();
    };
    // While the zoom lightbox shows an item, its spot keeps an empty box so the shared element can fly.
    const hidden = lightbox === "zoom" && open?.index === i;
    return (
      <Media key={i} layoutId={lightbox === "zoom" ? `${uid}-${i}` : undefined} hidden={hidden}
        hoverZoom={hoverZoom} onOpen={onOpen} wholeClick={opts.wholeClick !== false} label={`${label}, image ${i + 1} of ${items.length}`}>
        {render(items[i], i)}
      </Media>
    );
  };

  const common = { items, media, renderThumb, overlay, label, index, setIndex };
  let body: ReactNode;
  switch (layout) {
    case "stacked": body = <Stacked {...common} visible={visible} />; break;
    case "peek": body = <Slider {...common} effect="slide" itemSize={0.84} kind="peek" />; break;
    case "coverflow": body = <Slider {...common} effect="coverflow" itemSize={0.62} kind="coverflow" />; break;
    case "cards": body = <Cards {...common} />; break;
    case "orbit": body = <OrbitGallery {...common} />; break;
    default: body = <Thumbs {...common} effect={effect} side={layout === "thumbs-side"} />;
  }

  return (
    <div className={"mg-root is-" + layout + (className ? " " + className : "")}
      style={{ "--mg-ar": aspect, ...style } as CSSProperties} role="region" aria-label={label}>
      {body}
      {createPortal(
        <AnimatePresence>
          {open && lightbox === "zoom" && (
            <Lightbox key="zoom" layoutId={`${uid}-${open.index}`} onClose={() => close()} label={label} aspect={aspect}>
              <div className="mg-fill">{render(items[open.index], open.index)}</div>
            </Lightbox>
          )}
          {open && lightbox === "carousel" && (
            <Viewer key="viewer" items={items} render={render} renderThumb={renderThumb} start={open.index}
              origin={open.origin} onClose={close} label={label} aspect={aspect} />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

/* ───────── one image: hover zoom + click to open ───────── */

type MediaOpts = {
  /** Wrap the open handler so it doesn't fire at the end of a drag. */
  guard?: (fn: () => void) => () => void;
  /** `false`: only the enlarge button opens (for draggable decks). */
  wholeClick?: boolean;
};

function Media({ layoutId, hidden, hoverZoom, onOpen, wholeClick, label, children }: {
  layoutId?: string; hidden: boolean; hoverZoom: boolean; onOpen?: (e: MouseEvent) => void; wholeClick: boolean;
  label: string; children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  if (hidden) return <div className="mg-media is-placeholder" />;
  const zoom = hoverZoom ? {
    onPointerMove: (e: React.PointerEvent) => {
      const el = ref.current;
      if (!el || e.pointerType !== "mouse") return;
      const r = el.getBoundingClientRect();
      el.style.setProperty("--zx", ((e.clientX - r.left) / r.width) * 100 + "%");
      el.style.setProperty("--zy", ((e.clientY - r.top) / r.height) * 100 + "%");
      el.classList.add("is-zoomed");
    },
    onPointerLeave: () => ref.current?.classList.remove("is-zoomed"),
  } : {};
  return (
    <motion.div ref={ref} layoutId={layoutId} className={"mg-media" + (onOpen && wholeClick ? " is-openable" : "")} {...zoom}
      onClick={wholeClick ? onOpen : undefined}>
      <div className="mg-media-inner">{children}</div>
      {onOpen && (
        <button className="mg-open" aria-label={"Enlarge " + label}
          onPointerDown={e => e.stopPropagation()}
          onClick={wholeClick ? undefined /* bubbles to the image */ : e => { e.stopPropagation(); onOpen(e); }}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      )}
    </motion.div>
  );
}

interface LayoutProps<T> {
  items: T[];
  media: (i: number, opts?: MediaOpts) => ReactNode;
  renderThumb: (item: T, i: number) => ReactNode;
  overlay?: ReactNode;
  label: string;
  index: number;
  setIndex: (i: number) => void;
}

/* ───────── thumbnails synced to the main image ───────── */

function Thumbs<T>({ items, media, renderThumb, overlay, label, index, setIndex, effect, side }: LayoutProps<T> & {
  effect: CarouselEffect; side: boolean;
}) {
  const api = useCarousel({ count: items.length, loop: true, initialIndex: index, onChange: setIndex });
  useEffect(() => { if (index !== api.index) api.go(index); }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  const narrow = effect === "coverflow" || effect === "cards";
  return (
    <div className={"mg-thumbs" + (side ? " is-side" : "")}>
      <div className="mg-main">
        <Carousel api={api} items={items} effect={effect} itemSize={narrow ? 0.78 : 1} gap={0} height="100%" label={label}
          renderItem={(_, ctx) => media(ctx.index, { guard: api.clickGuard })} />
        {overlay}
        <div className="mg-arrows"><CarouselArrows api={api} /></div>
        <span className="mg-count" aria-hidden="true">{api.index + 1} / {items.length}</span>
      </div>
      <CarouselThumbs api={api} items={items} renderThumb={(it, i) => <div className="mg-thumb">{renderThumb(it, i)}</div>} className="mg-strip" />
    </div>
  );
}

/* ───────── peek slider / coverflow ───────── */

function Slider<T>({ items, media, overlay, label, index, setIndex, effect, itemSize, kind }: LayoutProps<T> & {
  effect: CarouselEffect; itemSize: number; kind: string;
}) {
  const api = useCarousel({ count: items.length, loop: kind === "coverflow", initialIndex: index, onChange: setIndex });
  useEffect(() => { if (index !== api.index) api.go(index); }, [index]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className={"mg-slider is-" + kind}>
      <div className="mg-slider-view">
        <Carousel api={api} items={items} effect={effect} itemSize={itemSize} gap={12} height="100%" label={label}
          align={kind === "peek" ? "start" : "center"}
          renderItem={(_, ctx) => media(ctx.index, { guard: api.clickGuard })} />
        {overlay}
      </div>
      <div className="mg-slider-foot">
        <CarouselDots api={api} scaling visible={7} />
        <span className="mg-count is-inline" aria-hidden="true">{api.index + 1} / {items.length}</span>
      </div>
    </div>
  );
}

/* ───────── swipeable deck ───────── */

function Cards<T>({ items, media, overlay }: LayoutProps<T>) {
  const deck = items.map((_, i) => ({ id: String(i), title: "", color: "transparent", i }));
  return (
    <div className="mg-cards">
      <CardStack items={deck} renderItem={d => <div className="mg-card">{media(d.i, { wholeClick: false })}</div>} />
      {overlay}
    </div>
  );
}

/* ───────── stacked grid with reveal more ───────── */

function Stacked<T>({ items, media, visible }: LayoutProps<T> & { visible: number }) {
  const [more, setMore] = useState(false);
  const extra = Math.max(0, items.length - visible);
  const btn = useRef<HTMLButtonElement>(null);
  return (
    <div className="mg-stacked">
      <motion.div className="mg-grid" layout transition={{ type: "spring", stiffness: 260, damping: 32 }}>
        <AnimatePresence initial={false}>
          {items.map((_, i) => (i < visible || more) && (
            <motion.div key={i} className={"mg-cell" + (i === 0 ? " is-hero" : "")} layout
              initial={{ opacity: 0, y: 40, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 26, delay: Math.max(0, i - visible) * 0.07 } }}
              exit={{ opacity: 0, y: 24, scale: 0.96, transition: { duration: 0.2, delay: (items.length - 1 - i) * 0.03 } }}>
              {media(i)}
            </motion.div>
          ))}
        </AnimatePresence>
        {!more && extra > 0 && <div className="mg-fade" aria-hidden="true" />}
      </motion.div>
      {extra > 0 && (
        <motion.button ref={btn} layout className="mg-more" aria-expanded={more} onClick={() => setMore(m => !m)}>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={String(more)} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}>
              {more ? "Show less" : `Show ${extra} more`}
            </motion.span>
          </AnimatePresence>
          <motion.svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" animate={{ rotate: more ? 180 : 0 }}>
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </motion.svg>
        </motion.button>
      )}
    </div>
  );
}

/* ───────── thumbnails orbiting the main image ───────── */

function OrbitGallery<T>({ items, media, renderThumb, overlay, index, setIndex }: LayoutProps<T>) {
  const reduced = useReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const planets = useRef<(HTMLButtonElement | null)[]>([]);
  const angle = useRef(0);
  const hover = useRef(false);
  const [origin, setOrigin] = useState<Origin | null>(null);
  const n = items.length;

  // A tilted ring: planets pass in front of the image along the bottom, behind it along the top.
  useAnimationFrame((_, dt) => {
    const el = box.current;
    if (!el) return;
    const speed = hover.current ? 0.04 : reduced ? 0.03 : 0.16;
    angle.current += (dt / 1000) * speed;
    const w = el.clientWidth, h = el.clientHeight;
    const rx = w * 0.5, ry = h * 0.13, cy = h * 0.6;
    planets.current.forEach((p, i) => {
      if (!p) return;
      const th = angle.current + (i / n) * Math.PI * 2;
      const depth = Math.sin(th); // 1 = nearest the viewer
      const s = 0.72 + 0.28 * (depth + 1) / 2;
      p.style.transform = `translate3d(${(w / 2 + Math.cos(th) * rx).toFixed(1)}px, ${(cy + depth * ry).toFixed(1)}px, 0) translate(-50%, -50%) scale(${s.toFixed(3)})`;
      p.style.zIndex = depth > 0 ? "3" : "1";
      p.style.opacity = (0.55 + 0.45 * (depth + 1) / 2).toFixed(3);
    });
  });

  const pick = (i: number, e: MouseEvent) => {
    if (i === index) return;
    const r = box.current?.getBoundingClientRect(), b = (e.currentTarget as HTMLElement).getBoundingClientRect();
    if (r) setOrigin({ x: b.left + b.width / 2 - r.left, y: b.top + b.height / 2 - r.top });
    setIndex(i);
  };

  return (
    <div className="mg-orbit" ref={box}
      onPointerEnter={() => { hover.current = true; }} onPointerLeave={() => { hover.current = false; }}>
      <svg className="mg-orbit-ring" aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="none">
        <ellipse cx="50" cy="60" rx="50" ry="13" />
      </svg>
      <div className="mg-orbit-main">
        <PageTransition pageKey={String(index)} effect="circle" origin={origin} duration={0.75} className="mg-orbit-pt">
          {media(index)}
        </PageTransition>
        {overlay}
      </div>
      <div className="mg-orbit-planets" role="group" aria-label="Images">
        {items.map((it, i) => (
          <button key={i} ref={el => { planets.current[i] = el; }} className="mg-planet"
            aria-label={`Show image ${i + 1}`} aria-current={i === index || undefined} onClick={e => pick(i, e)}>
            <div className="mg-thumb">{renderThumb(it, i)}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────── full-screen viewer, revealed as a circle from the click ───────── */

function Viewer<T>({ items, render, renderThumb, start, origin, onClose, label, aspect }: {
  items: T[]; render: (item: T, i: number) => ReactNode; renderThumb: (item: T, i: number) => ReactNode;
  start: number; origin: Origin; onClose: (last?: number) => void; label: string; aspect: number;
}) {
  const api = useCarousel({ count: items.length, loop: true, initialIndex: start });
  const closeRef = useRef<HTMLButtonElement>(null);
  const idx = useRef(start);
  idx.current = api.index;
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose(idx.current);
      else if (e.key === "ArrowRight") api.next();
      else if (e.key === "ArrowLeft") api.prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [api, onClose]);
  const at = `${origin.x}px ${origin.y}px`;
  return (
    <motion.div className="mg-viewer" role="dialog" aria-modal="true" aria-label={label}
      initial={{ clipPath: `circle(0px at ${at})` }}
      animate={{ clipPath: `circle(150% at ${at})` }}
      exit={{ clipPath: `circle(0px at ${at})` }}
      transition={{ duration: 0.6, ease: [0.76, 0, 0.24, 1] }}>
      <div className="mg-viewer-top">
        <span className="mg-viewer-count" aria-live="polite">{api.index + 1} / {items.length}</span>
        <button ref={closeRef} className="cr-btn" aria-label="Close" onClick={() => onClose(idx.current)}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
      </div>
      <div className="mg-viewer-stage">
        <Carousel api={api} items={items} effect="slide" itemSize={1} gap={24} height="100%" label={label}
          renderItem={(it, ctx) => (
            <div className="mg-viewer-cell" style={{ "--mg-ar": aspect } as CSSProperties}>
              <div className="mg-viewer-slide">{render(it, ctx.index)}</div>
            </div>
          )} />
        <div className="mg-viewer-arrows"><CarouselArrows api={api} /></div>
      </div>
      <CarouselThumbs api={api} items={items} renderThumb={(it, i) => <div className="mg-thumb">{renderThumb(it, i)}</div>} className="mg-strip is-viewer" />
    </motion.div>
  );
}
