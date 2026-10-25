import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, type TargetAndTransition, type Variants } from "motion/react";
import "./transitions.css";

export type TransitionEffect =
  | "fade" | "slide" | "wipe" | "circle" | "blinds"
  | "blur" | "zoom" | "stack" | "flip" | "split" | "diamond";

export interface PageTransitionProps {
  /** Changing this key triggers a transition to the new children. */
  pageKey: string;
  effect?: TransitionEffect;
  /** 1 = forward (from the right), -1 = back. Mirrors slide, wipe and blinds. */
  direction?: 1 | -1;
  /** Where circle and diamond grow from, in px relative to the container. Defaults to the center. */
  origin?: { x: number; y: number } | null;
  /** Strip color for the blinds effect. */
  accent?: string;
  duration?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

interface Ctx {
  effect: TransitionEffect;
  direction: 1 | -1;
  /** Origin as a CSS position, and as its separate x / y parts. */
  at: string;
  ox: string;
  oy: string;
  duration: number;
}

/** Diamond clip-path of "radius" r (a % of the container) around the origin. */
const diamond = ({ ox, oy }: Ctx, r: number) =>
  `polygon(${ox} calc(${oy} - ${r}%), calc(${ox} + ${r}%) ${oy}, ${ox} calc(${oy} + ${r}%), calc(${ox} - ${r}%) ${oy})`;

const EASE = [0.76, 0, 0.24, 1] as const;

/* New pages are layered on top of the old one and revealed. Reveal effects (wipe, circle,
   split, diamond) hold the old page still underneath; the rest move both pages. */
const variants: Variants = {
  initial: (c: Ctx) => {
    const { effect, direction, at } = c;
    switch (effect) {
      case "slide": return { x: `${direction * 100}%` };
      case "wipe": return { clipPath: direction > 0 ? "inset(0% 0% 0% 100%)" : "inset(0% 100% 0% 0%)" };
      case "circle": return { clipPath: `circle(0% at ${at})` };
      case "split": return { clipPath: "inset(50% 0% 50% 0%)" };
      case "diamond": return { clipPath: diamond(c, 0) };
      case "blur": return { opacity: 0, scale: 1.04, filter: "blur(24px)" };
      case "zoom": return { opacity: 0, scale: 1.25 };
      case "stack": return direction > 0 ? { y: "100%" } : { opacity: 0, scale: 0.92 };
      case "flip": return { opacity: 0, rotateY: direction * 90, transformPerspective: 1800 };
      default: return { opacity: 0 };
    }
  },
  animate: (c: Ctx) => {
    const { effect, direction, at, duration } = c;
    const transition = { duration, ease: EASE };
    const reveal = (clipPath: string) => ({ clipPath, transition, transitionEnd: { clipPath: "none" } });
    switch (effect) {
      case "slide": return { x: "0%", transition };
      case "wipe": return reveal("inset(0% 0% 0% 0%)");
      case "circle": return reveal(`circle(200% at ${at})`);
      case "split": return reveal("inset(0% 0% 0% 0%)");
      case "diamond": return reveal(diamond(c, 300));
      case "blur": return {
        opacity: 1, scale: 1, filter: "blur(0px)", transition: { duration, ease: [0.2, 0.7, 0.2, 1] },
        transitionEnd: { filter: "none" },
      };
      case "zoom": return { opacity: 1, scale: 1, transition: { duration, ease: [0.16, 1, 0.3, 1] } };
      case "stack": return direction > 0
        ? { y: "0%", transition }
        : { opacity: 1, scale: 1, transition: { duration, ease: [0.2, 0.7, 0.2, 1] } };
      // the new page turns in once the old one has turned away
      case "flip": return {
        opacity: 1, rotateY: 0, transformPerspective: 1800,
        transition: { duration: duration * 0.55, delay: duration * 0.45, ease: [0.2, 0.7, 0.2, 1] },
      };
      default: return { opacity: 1, transition: { duration: duration * 0.6, ease: "easeOut" } };
    }
  },
  // Exits name clipPath explicitly: Motion animates any value an exit leaves out back to its
  // initial-variant value, which would shrink an old circle/wipe-revealed page to nothing.
  // ("none" won't do: Motion reads it as a zero-size shape.) Set instantly, never interpolated.
  exit: (c: Ctx) => {
    const t = exitFor(c);
    return { ...t, clipPath: "inset(0% 0% 0% 0%)", transition: { ...t.transition, clipPath: { duration: 0 } } };
  },
};

function exitFor({ effect, direction, duration }: Ctx): TargetAndTransition {
    switch (effect) {
      case "slide": return { x: `${direction * -100}%`, transition: { duration, ease: EASE } };
      case "fade": return { opacity: 0, transition: { duration: duration * 0.6, ease: "easeIn" } };
      case "blur": return { opacity: 0, scale: 0.98, filter: "blur(24px)", transition: { duration: duration * 0.8, ease: "easeIn" } };
      case "zoom": return { opacity: 0, scale: 0.85, transition: { duration: duration * 0.8, ease: EASE } };
      // forward: the old page sinks back under the incoming card; back: it lifts away to reveal the one below
      case "stack": return direction > 0
        ? { scale: 0.9, opacity: 0.35, borderRadius: 24, transition: { duration, ease: EASE } }
        : { y: "100%", zIndex: 999, transition: { duration, ease: EASE } };
      case "flip": return {
        opacity: 0, rotateY: direction * -90, transformPerspective: 1800,
        transition: { duration: duration * 0.45, ease: [0.6, 0, 0.8, 0.4] },
      };
      // stay visible underneath while the new page is revealed over it
      default: return { opacity: 0.999, transition: { duration } };
    }
}

export function PageTransition({
  pageKey, effect = "fade", direction = 1, origin, accent = "currentColor",
  duration = 0.7, className, style, children,
}: PageTransitionProps) {
  // The newest page always stacks above the one leaving.
  const layer = useRef(1);
  const lastKey = useRef(pageKey);
  if (lastKey.current !== pageKey) { lastKey.current = pageKey; layer.current += 1; }

  const cls = "pt-root" + (className ? " " + className : "");
  if (effect === "blinds") {
    return (
      <div className={cls} style={style}>
        <Blinds pageKey={pageKey} accent={accent} duration={duration} direction={direction}>{children}</Blinds>
      </div>
    );
  }

  const [ox, oy] = origin ? [`${origin.x}px`, `${origin.y}px`] : ["50%", "50%"];
  const ctx: Ctx = { effect, direction, duration, at: `${ox} ${oy}`, ox, oy };
  return (
    <div className={cls} style={style}>
      <AnimatePresence initial={false} custom={ctx}>
        {/* layoutScroll: pages scroll inside this layer, so layout animations must account for it */}
        <motion.div key={pageKey} layoutScroll className="pt-page" custom={ctx} variants={variants}
          initial="initial" animate="animate" exit="exit" style={{ zIndex: layer.current }}>
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* Blinds: strips close over the old page, the content swaps while covered, then they open. */
function Blinds({ pageKey, accent, duration, direction, strips = 7, children }: {
  pageKey: string; accent: string; duration: number; direction: 1 | -1; strips?: number; children: ReactNode;
}) {
  const [shownKey, setShownKey] = useState(pageKey);
  const [phase, setPhase] = useState<"idle" | "cover" | "reveal">("idle");
  const lastNode = useRef<ReactNode>(children);
  const pending = useRef(pageKey);
  pending.current = pageKey;
  if (shownKey === pageKey) lastNode.current = children;

  useEffect(() => {
    if (phase === "idle" && pageKey !== shownKey) setPhase("cover");
  }, [pageKey, shownKey, phase]);

  const half = duration / 2;
  const stagger = half * 0.35 / strips;
  const done = () => {
    if (phase === "cover") { setShownKey(pending.current); setPhase("reveal"); }
    else if (phase === "reveal") setPhase("idle");
  };

  return (
    <>
      <div className="pt-page">{shownKey === pageKey ? children : lastNode.current}</div>
      <div className="pt-strips" aria-hidden="true">
        {Array.from({ length: strips }, (_, i) => {
          const order = direction > 0 ? i : strips - 1 - i;
          return (
            <motion.div key={i} className="pt-strip"
              style={{
                left: `${(i / strips) * 100}%`, width: `calc(${100 / strips}% + 1px)`,
                background: accent, originY: phase === "reveal" ? 1 : 0,
              }}
              initial={false}
              animate={{ scaleY: phase === "cover" ? 1 : 0 }}
              transition={{ duration: half * 0.65, delay: order * stagger, ease: EASE }}
              onAnimationComplete={order === strips - 1 ? done : undefined} />
          );
        })}
      </div>
    </>
  );
}
