import { Fragment, useEffect, useRef, useState, type CSSProperties, type ElementType, type ReactNode } from "react";
import { AnimatePresence, motion, useInView, type Transition, type Variants } from "motion/react";
import "./text.css";

const EASE = [0.2, 0.7, 0.2, 1] as const;
const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ───────── TextEffect: split text that animates in ───────── */

export type TextEffectName =
  /** elegant */ | "rise" | "fade" | "blur" | "mask" | "track"
  /** slick */ | "flip" | "wave" | "drop";

export interface TextEffectProps {
  text: string;
  effect?: TextEffectName;
  /** Animate each word or each letter. `track` is always per letter. */
  by?: "word" | "char";
  /** `mount` plays straight away; `inView` waits until it scrolls into view. */
  trigger?: "mount" | "inView";
  /** Change to play again. */
  replay?: unknown;
  /** Seconds per piece. */
  duration?: number;
  /** Seconds between pieces; defaults to 0.025 per letter or 0.06 per word. */
  stagger?: number;
  delay?: number;
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
}

const PIECE: Record<TextEffectName, Variants> = {
  rise: { hidden: { opacity: 0, y: "0.45em" }, show: { opacity: 1, y: 0 } },
  fade: { hidden: { opacity: 0 }, show: { opacity: 1 } },
  blur: { hidden: { opacity: 0, y: "0.12em", filter: "blur(10px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)" } },
  mask: { hidden: { y: "105%" }, show: { y: 0 } },
  // letters start spread out from the middle and draw together
  track: {
    hidden: ({ spread }: { spread: number }) => ({ opacity: 0, x: `${spread * 0.3}em`, filter: "blur(4px)" }),
    show: { opacity: 1, x: 0, filter: "blur(0px)" },
  },
  flip: { hidden: { opacity: 0, rotateX: -95, transformPerspective: 500 }, show: { opacity: 1, rotateX: 0, transformPerspective: 500 } },
  wave: { hidden: { opacity: 0, y: "0.7em", scale: 0.5 }, show: { opacity: 1, y: 0, scale: 1 } },
  drop: { hidden: { opacity: 0, y: "-0.8em", rotate: -12 }, show: { opacity: 1, y: 0, rotate: 0 } },
};

/**
 * Text split into words or letters that animate in one after another.
 * Screen readers get the plain text; the animated pieces are hidden from them.
 */
export function TextEffect({
  text, effect = "rise", by = "word", trigger = "mount", replay, duration = 0.6, stagger, delay = 0,
  as: Tag = "span", className, style,
}: TextEffectProps) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const perChar = by === "char" || effect === "track";
  const gap = stagger ?? (perChar ? 0.025 : 0.06);
  const play = trigger === "mount" || inView;
  const words = text.split(" ");
  const total = perChar ? text.replace(/ /g, "").length : words.length;
  const spring = effect === "wave" || effect === "drop";

  if (reduced()) return <Tag className={className} style={style}>{text}</Tag>;

  let n = 0;
  const piece = (content: string, key: string) => {
    const i = n++;
    const transition: Transition = spring
      ? { type: "spring", stiffness: 420, damping: effect === "drop" ? 14 : 18, delay: delay + i * gap }
      : { duration, delay: delay + i * gap, ease: EASE };
    const span = (
      <motion.span key={key} className="tx-piece" variants={PIECE[effect]} custom={{ spread: i - (total - 1) / 2 }}
        transition={transition}>{content}</motion.span>
    );
    return effect === "mask" ? <span key={key} className="tx-mask">{span}</span> : span;
  };

  return (
    <Tag ref={ref} className={"tx" + (className ? " " + className : "")} style={style} aria-label={text}>
      <motion.span key={`${String(replay)}:${text}`} aria-hidden="true" initial="hidden" animate={play ? "show" : "hidden"}>
        {words.map((w, wi) => (
          <Fragment key={wi}>
            {wi > 0 && " "}
            {perChar
              ? <span className="tx-word">{[...w].map((ch, ci) => piece(ch, `${wi}-${ci}`))}</span>
              : piece(w, String(wi))}
          </Fragment>
        ))}
      </motion.span>
    </Tag>
  );
}

/* ───────── RollText: letters roll to a second copy on hover ───────── */

/**
 * The classic slick nav/button hover: each letter rolls up to reveal a copy of itself.
 * Hovering the element, or any ancestor with class `tx-roll-host`, plays it. Pure CSS.
 */
export function RollText({ text, as: Tag = "span", className, stagger = 18 }: {
  text: string; as?: ElementType; className?: string; /** ms between letters */ stagger?: number;
}) {
  return (
    <Tag className={"tx-roll" + (className ? " " + className : "")} aria-label={text}>
      <span aria-hidden="true">
        {[...text].map((ch, i) => (
          <span key={i} className="tx-roll-char" data-c={ch === " " ? " " : ch}
            style={{ "--i": i, "--d": `${stagger}ms` } as CSSProperties}>{ch === " " ? " " : ch}</span>
        ))}
      </span>
    </Tag>
  );
}

/* ───────── RotatingText: a word that cycles in place ───────── */

export function RotatingText({ words, interval = 2200, effect = "slide", className }: {
  words: string[]; interval?: number; effect?: "slide" | "blur" | "flip"; className?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (reduced()) return;
    const t = setInterval(() => setI(v => (v + 1) % words.length), interval);
    return () => clearInterval(t);
  }, [words.length, interval]);
  const word = words[i];
  const v: Record<typeof effect, Variants> = {
    slide: { in: { y: "100%", opacity: 0 }, show: { y: 0, opacity: 1 }, out: { y: "-100%", opacity: 0 } },
    blur: { in: { opacity: 0, filter: "blur(8px)" }, show: { opacity: 1, filter: "blur(0px)" }, out: { opacity: 0, filter: "blur(8px)" } },
    flip: {
      in: { rotateX: -90, opacity: 0, transformPerspective: 400 }, show: { rotateX: 0, opacity: 1, transformPerspective: 400 },
      out: { rotateX: 90, opacity: 0, transformPerspective: 400 },
    },
  };
  return (
    <motion.span layout className={"tx-rotate" + (className ? " " + className : "")} aria-live="polite"
      transition={{ layout: { type: "spring", stiffness: 300, damping: 30 } }}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={word} className="tx-rotate-word" aria-label={word}>
          {[...word].map((ch, ci) => (
            <motion.span key={ci} className="tx-piece" aria-hidden="true" variants={v[effect]} initial="in" animate="show" exit="out"
              transition={{ duration: 0.45, delay: ci * 0.025, ease: EASE }}>{ch === " " ? " " : ch}</motion.span>
          ))}
        </motion.span>
      </AnimatePresence>
    </motion.span>
  );
}

/* ───────── Typewriter ───────── */

/** Types each line, pauses, deletes, moves on. Loops. */
export function Typewriter({ lines, speed = 55, pause = 1400, className }: {
  lines: string[]; /** ms per letter */ speed?: number; pause?: number; className?: string;
}) {
  const [line, setLine] = useState(0);
  const [len, setLen] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const full = lines[line];
  useEffect(() => {
    if (reduced()) { setLen(full.length); return; }
    let t: ReturnType<typeof setTimeout>;
    if (!deleting && len < full.length) t = setTimeout(() => setLen(len + 1), speed + Math.random() * speed * 0.6);
    else if (!deleting) t = setTimeout(() => setDeleting(true), pause);
    else if (len > 0) t = setTimeout(() => setLen(len - 1), speed * 0.45);
    else { setDeleting(false); setLine((line + 1) % lines.length); }
    return () => clearTimeout(t);
  }, [len, deleting, full, line, lines.length, speed, pause]);
  return (
    <span className={"tx-type" + (className ? " " + className : "")} aria-label={full}>
      <span aria-hidden="true">{full.slice(0, len)}</span><span className="tx-caret" aria-hidden="true" />
    </span>
  );
}

/* ───────── Shimmer and Highlight ───────── */

/** A soft light sweep across the text, on a loop. Good for "new" labels or loading states. */
export function Shimmer({ children, className, duration = 2.4 }: { children: ReactNode; className?: string; duration?: number }) {
  return <span className={"tx-shimmer" + (className ? " " + className : "")} style={{ "--dur": `${duration}s` } as CSSProperties}>{children}</span>;
}

/** A marker stroke that draws behind the text when it scrolls into view. */
export function Highlight({ children, color, delay = 0.2, className }: {
  children: ReactNode; color?: string; delay?: number; className?: string;
}) {
  return (
    <span className={"tx-hl" + (className ? " " + className : "")}>
      <motion.span className="tx-hl-mark" aria-hidden="true" style={color ? { background: color } : undefined}
        initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.7, delay, ease: [0.65, 0, 0.35, 1] }} />
      <span className="tx-hl-text">{children}</span>
    </span>
  );
}
