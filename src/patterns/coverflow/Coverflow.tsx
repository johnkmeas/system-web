import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform, type MotionValue } from "motion/react";
import "./coverflow.css";

export interface CoverflowItem {
  id: string;
  title: string;
  subtitle?: string;
  color: string;
}

export interface CoverflowProps<T extends CoverflowItem> {
  items: T[];
  initialIndex?: number;
  onChange?: (index: number) => void;
  /** Card contents; defaults to the title and subtitle on the item's color. */
  renderItem?: (item: T, active: boolean) => ReactNode;
  className?: string;
}

const SPRING = { type: "spring", stiffness: 260, damping: 32 } as const;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function Coverflow<T extends CoverflowItem>({ items, initialIndex = 0, onChange, renderItem, className }: CoverflowProps<T>) {
  const n = items.length;
  const [index, setIndex] = useState(initialIndex);
  const [width, setWidth] = useState(900);
  const pos = useMotionValue(initialIndex); // fractional index of the centered card
  const rootRef = useRef<HTMLDivElement>(null);
  const panStart = useRef(0);
  const panned = useRef(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // px per index step while dragging: roughly one card width
  const step = clamp(width * 0.3, 140, 300);

  const go = (i: number) => {
    const t = clamp(i, 0, n - 1);
    setIndex(t);
    onChange?.(t);
    animate(pos, t, SPRING);
  };

  return (
    <div className={"cf-root" + (className ? " " + className : "")}>
      <motion.div
        ref={rootRef}
        className="cf-track"
        role="listbox"
        aria-label="Carousel"
        aria-activedescendant={"cf-" + items[index]?.id}
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === "ArrowRight") { e.preventDefault(); go(index + 1); }
          else if (e.key === "ArrowLeft") { e.preventDefault(); go(index - 1); }
          else if (e.key === "Home") { e.preventDefault(); go(0); }
          else if (e.key === "End") { e.preventDefault(); go(n - 1); }
        }}
        onPanStart={() => { pos.stop(); panStart.current = pos.get(); panned.current = true; }}
        onPan={(_, info) => pos.set(clamp(panStart.current - info.offset.x / step, -0.4, n - 0.6))}
        onPanEnd={(_, info) => {
          go(Math.round(pos.get() - (info.velocity.x / step) * 0.25));
          setTimeout(() => { panned.current = false; }, 0);
        }}
        style={{ touchAction: "pan-y" }}>
        {items.map((item, i) => (
          <CoverCard key={item.id} id={"cf-" + item.id} i={i} pos={pos} width={width} active={i === index}
            onSelect={() => { if (!panned.current) go(i); }}>
            {renderItem ? renderItem(item, i === index) : (
              <div className="cf-face" style={{ background: item.color }}>
                <span className="cf-num">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3>{item.title}</h3>
                  {item.subtitle && <p>{item.subtitle}</p>}
                </div>
              </div>
            )}
          </CoverCard>
        ))}
      </motion.div>

      <div className="cf-controls">
        <button className="cf-btn" aria-label="Previous" onClick={() => go(index - 1)} disabled={index === 0}>←</button>
        <span className="cf-caption" aria-live="polite">{items[index]?.title} <small>{index + 1} / {n}</small></span>
        <button className="cf-btn" aria-label="Next" onClick={() => go(index + 1)} disabled={index === n - 1}>→</button>
      </div>
    </div>
  );
}

function CoverCard({ id, i, pos, width, active, onSelect, children }: {
  id: string; i: number; pos: MotionValue<number>; width: number; active: boolean;
  onSelect: () => void; children: ReactNode;
}) {
  const center = clamp(width * 0.26, 120, 280); // gap between the centered card and its neighbors
  const side = clamp(width * 0.08, 40, 90);     // gap between stacked side cards
  const d = useTransform(pos, p => i - p);
  const x = useTransform(d, v => Math.sign(v) * (Math.min(Math.abs(v), 1) * center + Math.max(Math.abs(v) - 1, 0) * side));
  const rotateY = useTransform(d, v => clamp(-v, -1, 1) * 55);
  const z = useTransform(d, v => -Math.min(Math.abs(v), 1) * 220 - Math.max(Math.abs(v) - 1, 0) * 30);
  const zIndex = useTransform(d, v => 100 - Math.round(Math.abs(v) * 10));
  const opacity = useTransform(d, v => clamp(4.5 - Math.abs(v), 0, 1));

  return (
    <motion.div id={id} role="option" aria-selected={active} className="cf-card"
      style={{ x, z, rotateY, zIndex, opacity }} onClick={onSelect}>
      {children}
    </motion.div>
  );
}
