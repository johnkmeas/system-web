import { useEffect, useRef, useState, type ReactNode } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import "./card-stack.css";

export interface StackItem {
  id: string;
  title: string;
  body?: string;
  color: string;
}

export interface CardStackProps<T extends StackItem> {
  items: T[];
  /** Called after a card is swiped away, with the direction it left in. */
  onSwipe?: (item: T, dir: -1 | 1) => void;
  renderItem?: (item: T) => ReactNode;
  className?: string;
}

const VISIBLE = 4;
const THRESHOLD = 120; // px
const FLING = 600;     // px/s

/** A deck of cards: swipe (or use the buttons / arrow keys) to send the top card to the back. */
export function CardStack<T extends StackItem>({ items, onSwipe, renderItem, className }: CardStackProps<T>) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const fly = useRef<((dir: -1 | 1) => void) | null>(null);

  const sendBack = (dir: -1 | 1) => {
    onSwipe?.(items[order[0]], dir);
    setOrder(o => [...o.slice(1), o[0]]);
  };

  return (
    <div className={"cs-root" + (className ? " " + className : "")}>
      <div className="cs-deck" tabIndex={0} aria-label="Card stack. Use left and right arrows to swipe."
        onKeyDown={e => {
          if (e.key === "ArrowLeft") { e.preventDefault(); fly.current?.(-1); }
          else if (e.key === "ArrowRight") { e.preventDefault(); fly.current?.(1); }
        }}>
        {order.map((itemIndex, depth) => {
          const item = items[itemIndex];
          return (
            <StackCard key={item.id} depth={depth} total={items.length} onGone={sendBack}
              register={depth === 0 ? f => { fly.current = f; } : undefined}>
              {renderItem ? renderItem(item) : (
                <div className="cs-face" style={{ background: item.color }}>
                  <h3>{item.title}</h3>
                  {item.body && <p>{item.body}</p>}
                </div>
              )}
            </StackCard>
          );
        })}
      </div>
      <div className="cs-controls">
        <button className="cs-btn" onClick={() => fly.current?.(-1)}>← Skip</button>
        <button className="cs-btn" onClick={() => fly.current?.(1)}>Keep →</button>
      </div>
    </div>
  );
}

function StackCard({ depth, total, onGone, register, children }: {
  depth: number; total: number; onGone: (dir: -1 | 1) => void;
  register?: (fly: (dir: -1 | 1) => void) => void; children: ReactNode;
}) {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-320, 320], [-16, 16]);
  const isTop = depth === 0;
  const leaving = useRef(false);

  const flyOut = (dir: -1 | 1) => {
    if (leaving.current) return;
    leaving.current = true;
    animate(x, dir * Math.max(window.innerWidth, 800), { duration: 0.38, ease: [0.4, 0, 1, 1] })
      .finished.then(() => onGone(dir));
  };

  useEffect(() => { if (isTop) register?.(flyOut); });

  // Once the card has moved to the back, bring it home out of sight.
  useEffect(() => {
    if (depth !== 0) { x.jump(0); leaving.current = false; }
  }, [depth, x]);

  const shown = depth < VISIBLE;
  return (
    <motion.div
      className="cs-card"
      style={{ x, rotate, zIndex: total - depth }}
      animate={{ scale: 1 - depth * 0.06, y: depth * 18, opacity: shown ? 1 : 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      drag={isTop ? "x" : false}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > THRESHOLD || Math.abs(info.velocity.x) > FLING) {
          flyOut(info.offset.x > 0 ? 1 : -1);
        } else {
          animate(x, 0, { type: "spring", stiffness: 400, damping: 30 });
        }
      }}
      whileDrag={{ cursor: "grabbing" }}
      aria-hidden={!isTop}>
      {children}
    </motion.div>
  );
}
