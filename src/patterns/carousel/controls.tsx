import { useEffect, useId, useRef, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, useTransform } from "motion/react";
import { wrap, type CarouselApi } from "./useCarousel";

const pad = (v: number) => String(v).padStart(2, "0");
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function Arrow({ dir, orientation }: { dir: 1 | -1; orientation: "x" | "y" }) {
  const rot = orientation === "x" ? (dir > 0 ? 0 : 180) : dir > 0 ? 90 : -90;
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" style={{ transform: `rotate(${rot}deg)` }}>
      <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CarouselArrows({ api, className }: { api: CarouselApi; className?: string }) {
  // in RTL the "previous" arrow sits on the right, so it points right
  const flip = api.rtl ? -1 : 1;
  return (
    <div className={"cr-arrows" + (className ? " " + className : "")}>
      <button className="cr-btn" aria-label="Previous slide" disabled={!api.canPrev} onClick={api.prev}>
        <Arrow dir={(-1 * flip) as 1 | -1} orientation={api.orientation} />
      </button>
      <button className="cr-btn" aria-label="Next slide" disabled={!api.canNext} onClick={api.next}>
        <Arrow dir={(1 * flip) as 1 | -1} orientation={api.orientation} />
      </button>
    </div>
  );
}

/** Pagination dots. `scaling` keeps a window of `visible` dots and shrinks those far from the active one. */
export function CarouselDots({ api, scaling = false, visible = 5 }: { api: CarouselApi; scaling?: boolean; visible?: number }) {
  const n = api.count;
  const DOT = 18;
  const win = Math.min(visible, n);
  const start = scaling ? clamp(api.index - Math.floor(win / 2), 0, n - win) : 0;
  const dots = Array.from({ length: n }, (_, i) => {
    const d = Math.abs(i - api.index);
    const inWin = i >= start && i < start + win;
    const s = !scaling ? (d === 0 ? 1 : 0.6) : !inWin ? 0 : d === 0 ? 1 : d === 1 ? 0.8 : d === 2 ? 0.6 : 0.42;
    return (
      <button key={i} className="cr-dot" aria-label={`Go to slide ${i + 1}`} aria-current={d === 0 || undefined}
        onClick={() => api.go(i)} tabIndex={scaling && !inWin ? -1 : 0}>
        <motion.i animate={{ scale: s, opacity: d === 0 ? 1 : 0.45 }} transition={{ type: "spring", stiffness: 500, damping: 32 }} />
      </button>
    );
  });
  if (!scaling) return <div className="cr-dots">{dots}</div>;
  return (
    <div className="cr-dots is-scaling" style={{ width: win * DOT }}>
      <motion.div className="cr-dots-row" animate={{ x: -start * DOT }} transition={{ type: "spring", stiffness: 400, damping: 36 }}>
        {dots}
      </motion.div>
    </div>
  );
}

/** "03 / 12" with the number rolling in the direction of travel. */
export function CarouselCounter({ api }: { api: CarouselApi }) {
  const prev = useRef(api.index);
  const n = api.count;
  let dir = api.index > prev.current ? 1 : -1;
  if (api.loop && prev.current === n - 1 && api.index === 0) dir = 1;
  if (api.loop && prev.current === 0 && api.index === n - 1) dir = -1;
  useEffect(() => { prev.current = api.index; });
  return (
    <span className="cr-counter" aria-live="polite" aria-label={`Slide ${api.index + 1} of ${n}`}>
      <span className="cr-roll" aria-hidden="true">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.span key={api.index} custom={dir}
            initial={{ y: `${dir * 100}%`, opacity: 0 }} animate={{ y: "0%", opacity: 1 }}
            exit={{ y: `${-dir * 100}%`, opacity: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
            {pad(api.index + 1)}
          </motion.span>
        </AnimatePresence>
      </span>
      <span aria-hidden="true" className="cr-total"> / {pad(n)}</span>
    </span>
  );
}

/** A draggable progress track that scrubs through the slides. */
export function CarouselScrubber({ api, label = "Slide" }: { api: CarouselApi; label?: string }) {
  const track = useRef<HTMLDivElement>(null);
  const n = api.count;
  const frac = useTransform(() => {
    const p = api.pos.get();
    return api.loop ? clamp(wrap(p, n) / Math.max(n - 1, 1), 0, 1) : clamp(p / Math.max(api.maxPos, 0.0001), 0, 1);
  });
  const left = useTransform(frac, f => `${f * 100}%`);
  const at = (e: React.PointerEvent) => {
    const r = track.current!.getBoundingClientRect();
    api.scrub((e.clientX - r.left) / r.width);
  };
  return (
    <div ref={track} className="cr-scrubber" role="slider" tabIndex={0}
      aria-label={label} aria-valuemin={1} aria-valuemax={n} aria-valuenow={api.index + 1}
      onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); at(e); }}
      onPointerMove={e => { if (e.currentTarget.hasPointerCapture(e.pointerId)) at(e); }}
      onPointerUp={() => api.release()}
      onPointerCancel={() => api.release()}
      onKeyDown={e => {
        if (e.key === "ArrowRight" || e.key === "ArrowUp") { e.preventDefault(); api.next(); }
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") { e.preventDefault(); api.prev(); }
      }}>
      <motion.span className="cr-scrub-fill" style={{ width: left }} />
      <motion.span className="cr-scrub-handle" style={{ left }} />
    </div>
  );
}

/** Thumbnail strip; the active ring glides between thumbs with a shared layout animation. */
export function CarouselThumbs<T>({ api, items, renderThumb, className }: {
  api: CarouselApi; items: T[]; renderThumb: (item: T, i: number) => ReactNode; className?: string;
}) {
  const id = useId();
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = strip.current, btn = el?.children[api.index] as HTMLElement | undefined;
    if (!el || !btn) return;
    el.scrollTo({ left: btn.offsetLeft - (el.clientWidth - btn.clientWidth) / 2, behavior: "smooth" });
  }, [api.index]);
  return (
    <div ref={strip} className={"cr-thumbs" + (className ? " " + className : "")}>
      {items.map((item, i) => (
        <button key={i} className="cr-thumb" aria-label={`Show slide ${i + 1}`} aria-current={i === api.index || undefined}
          onClick={() => api.go(i)}>
          {renderThumb(item, i)}
          {i === api.index && <motion.span layoutId={id + "ring"} className="cr-thumb-ring"
            transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
        </button>
      ))}
    </div>
  );
}

/** Autoplay progress bar with a pause/play toggle. */
export function CarouselAutoplay({ api, style }: { api: CarouselApi; style?: CSSProperties }) {
  const w = useTransform(api.progress, p => `${p * 100}%`);
  return (
    <div className="cr-autoplay" style={style}>
      <button className="cr-btn" aria-label={api.playing ? "Pause autoplay" : "Play autoplay"} onClick={() => api.setPlaying(!api.playing)}>
        {api.playing
          ? <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14M17 5v14" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
          : <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="currentColor" /></svg>}
      </button>
      <div className="cr-bars">
        {Array.from({ length: api.count }, (_, i) => (
          <span key={i} className="cr-bar">
            {i < api.index && <span className="cr-bar-fill" style={{ width: "100%" }} />}
            {i === api.index && <motion.span className="cr-bar-fill" style={{ width: w }} />}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Full-screen view of one item, zooming out of the slide that shares its `layoutId`. */
export function Lightbox({ layoutId, onClose, children, label = "Image viewer" }: {
  layoutId: string; onClose: () => void; children: ReactNode; label?: string;
}) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    close.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="cr-lightbox" role="dialog" aria-modal="true" aria-label={label}>
      <motion.div className="cr-lightbox-scrim" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.div layoutId={layoutId} className="cr-lightbox-panel" transition={{ type: "spring", stiffness: 260, damping: 30 }}>
        {children}
      </motion.div>
      <motion.button ref={close} className="cr-btn cr-lightbox-close" aria-label="Close" onClick={onClose}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
      </motion.button>
    </div>
  );
}
