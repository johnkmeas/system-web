import { useEffect, useState, type ElementType } from "react";

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789#%&*+=/<>";
const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Returns `text` with unresolved characters swapped for random glyphs, settling left to right.
 * Re-runs whenever `text` or `replay` changes.
 */
export function useScramble(text: string, { duration = 700, replay }: { duration?: number; replay?: unknown } = {}) {
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (prefersReduced()) { setOut(text); return; }
    let raf = 0, lastSwap = 0;
    const start = performance.now();
    const noise = text.split("").map(() => GLYPHS[(Math.random() * GLYPHS.length) | 0]);
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      // swap the noise every ~50ms so it shimmers instead of strobing
      if (now - lastSwap > 50) {
        lastSwap = now;
        for (let i = 0; i < noise.length; i++) noise[i] = GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      const settled = Math.floor(p * text.length);
      let s = "";
      for (let i = 0; i < text.length; i++) s += i < settled || text[i] === " " ? text[i] : noise[i];
      setOut(s);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, duration, replay]);

  return out;
}

export interface ScrambleTextProps {
  text: string;
  /** Change this value to play the effect again (e.g. a hover counter). */
  replay?: unknown;
  duration?: number;
  as?: ElementType;
  className?: string;
  id?: string;
}

/** Text that resolves out of random glyphs. Screen readers get the real text. */
export function ScrambleText({ text, replay, duration, as: Tag = "span", className, id }: ScrambleTextProps) {
  const out = useScramble(text, { duration, replay });
  return (
    <Tag className={className} id={id} aria-label={text}>
      <span aria-hidden="true">{out}</span>
    </Tag>
  );
}
