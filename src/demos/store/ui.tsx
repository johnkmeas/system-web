import { useState, type CSSProperties, type ReactNode, type Ref } from "react";
import { AnimatePresence, motion, type MotionValue } from "motion/react";
import type { Shape } from "./niches";

/**
 * A product "photo" drawn with CSS: a shape on a soft backdrop.
 * `floatY` moves the product against its backdrop (scroll parallax).
 */
export function StoreArt({ shape, color, bg, tilt = 0, className, children, style, floatY, ref }: {
  shape: Shape; color: string; bg: string; tilt?: number; className?: string; children?: ReactNode; style?: CSSProperties;
  floatY?: MotionValue<number>; ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} className={"sa" + (className ? " " + className : "")}
      style={{ background: `radial-gradient(75% 65% at 50% 42%, color-mix(in srgb, ${bg} 40%, white) 0%, ${bg} 72%)`, ...style }}>
      <motion.span className={"sa-shape is-" + shape} style={{ ["--c" as string]: color, rotate: tilt, y: floatY }} />
      <span className="sa-shadow" />
      {children}
    </div>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  return (
    <span className="st-stars" aria-label={`${rating} out of 5 stars${count ? `, ${count} reviews` : ""}`}>
      <span aria-hidden="true" className="st-stars-bar"><span style={{ width: `${(rating / 5) * 100}%` }} /></span>
      <span aria-hidden="true">{rating.toFixed(1)}{count !== undefined && <span className="st-muted"> ({count.toLocaleString()})</span>}</span>
    </span>
  );
}

export function Accordion({ items, defaultOpen = 0 }: { items: [string, string][]; defaultOpen?: number }) {
  const [open, setOpen] = useState<number | null>(defaultOpen);
  return (
    <div className="st-accordion">
      {items.map(([title, body], i) => (
        <div key={title} className="st-acc-item">
          <button className="st-acc-head" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)}>
            {title}
            <motion.span aria-hidden="true" animate={{ rotate: open === i ? 45 : 0 }} className="st-acc-icon">+</motion.span>
          </button>
          <AnimatePresence initial={false}>
            {open === i && (
              <motion.div key="body" className="st-acc-body"
                initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}>
                <p>{body}</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}

export const money = (v: number) => `$${v.toFixed(2).replace(/\.00$/, "")}`;

export function Icon({ name }: { name: "cart" | "search" | "user" | "check" | "truck" | "leaf" | "shield" | "spark" }) {
  const p: Record<string, ReactNode> = {
    cart: <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2M10 21h.01M17 21h.01" />,
    search: <path d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM21 21l-4.3-4.3" />,
    user: <path d="M20 21a8 8 0 0 0-16 0M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10z" />,
    check: <path d="M5 12l5 5L20 7" />,
    truck: <path d="M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM17 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" />,
    leaf: <path d="M5 21c0-9 5-15 16-16-1 11-7 16-16 16zM5 21l8-8" />,
    shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z" />,
    spark: <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M6 18l2.5-2.5M15.5 8.5L18 6" />,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p[name]}</svg>
  );
}
