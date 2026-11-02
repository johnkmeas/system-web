import { useEffect, useState, type ElementType } from "react";
import "../text/text.css";

const SETS = {
  /** Same-case letters only: the calmest, the word just "settles". */
  letters: "",
  /** Uppercase, digits and a few symbols: the classic hacker look. */
  symbols: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&*+=/<>",
  binary: "01",
  blocks: "░▒▓█▚▞",
} as const;
export type ScrambleCharset = keyof typeof SETS;

const LOWER = "abcdefghijklmnopqrstuvwxyz", UPPER = LOWER.toUpperCase(), DIGITS = "0123456789";
const pick = (s: string) => s[(Math.random() * s.length) | 0];
/** A random glyph that looks like `ch`'s kind, so widths and case stay close to the real text. */
const glyphFor = (ch: string, set: ScrambleCharset) => {
  if (set !== "letters") return pick(SETS[set]);
  if (/[a-z]/.test(ch)) return pick(LOWER);
  if (/[A-Z]/.test(ch)) return pick(UPPER);
  if (/\d/.test(ch)) return pick(DIGITS);
  return ch;
};
const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export interface ScrambleOptions {
  duration?: number;
  replay?: unknown;
  charset?: ScrambleCharset;
  /**
   * `decode`: only a few letters ahead of the cursor scramble; the rest are hidden until reached.
   * `sweep`: every unresolved letter scrambles and they settle left to right.
   */
  mode?: "decode" | "sweep";
  /** How many letters scramble ahead of the cursor in decode mode. */
  window?: number;
  /** ms between glyph swaps; higher is calmer. */
  rate?: number;
}

export interface ScrambleState {
  /** The resolved part. */
  done: string;
  /** Letters currently scrambling. */
  live: string;
  /** Letters not reached yet (decode mode only; render them hidden to hold the width). */
  rest: string;
}

/** Scramble state split into resolved, scrambling and not-yet-reached parts. */
export function useScrambleState(text: string, {
  duration = 700, replay, charset = "letters", mode = "decode", window: win = 4, rate = 60,
}: ScrambleOptions = {}): ScrambleState {
  const [state, setState] = useState<ScrambleState>({ done: text, live: "", rest: "" });

  useEffect(() => {
    if (prefersReduced()) { setState({ done: text, live: "", rest: "" }); return; }
    let raf = 0, lastSwap = 0;
    const start = performance.now();
    const noise = [...text].map(ch => glyphFor(ch, charset));
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      if (now - lastSwap > rate) {
        lastSwap = now;
        for (let i = 0; i < noise.length; i++) noise[i] = glyphFor(text[i], charset);
      }
      const settled = Math.floor(p * text.length);
      const end = mode === "sweep" ? text.length : Math.min(text.length, settled + win);
      let live = "";
      for (let i = settled; i < end; i++) live += text[i] === " " ? " " : noise[i];
      setState({ done: text.slice(0, settled), live, rest: text.slice(end) });
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, replay, charset, mode, win, rate]);

  return state;
}

/** The visible string only (resolved + scrambling). Prefer `<ScrambleText>`, which also holds the width. */
export function useScramble(text: string, opts: ScrambleOptions = {}) {
  const s = useScrambleState(text, opts);
  return s.done + s.live;
}

export interface ScrambleTextProps extends ScrambleOptions {
  text: string;
  as?: ElementType;
  className?: string;
  id?: string;
}

/** Text that resolves out of random glyphs. Screen readers get the real text. */
export function ScrambleText({ text, as: Tag = "span", className, id, ...opts }: ScrambleTextProps) {
  const s = useScrambleState(text, opts);
  return (
    <Tag className={className} id={id} aria-label={text}>
      <span aria-hidden="true">
        {s.done}
        {s.live && <span className="tx-scramble-live">{s.live}</span>}
        {s.rest && <span className="tx-scramble-rest">{s.rest}</span>}
      </span>
    </Tag>
  );
}
