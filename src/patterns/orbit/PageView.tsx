import type { CSSProperties, Ref } from "react";
import { AnimatePresence, motion, type Variants } from "motion/react";
import type { NavState, ResolvedSlide, SlideRenderContext } from "./types";

const contentVariants: Variants = {
  enter: ({ dir, fresh }: NavState) => ({ opacity: 0, x: fresh ? 0 : dir * 70, y: fresh ? 28 : 0 }),
  center: ({ fresh }: NavState) => ({
    opacity: 1, x: 0, y: 0,
    transition: { duration: 0.55, delay: fresh ? 0.42 : 0.04, ease: [0.2, 0.7, 0.2, 1] },
  }),
  exit: ({ dir }: NavState) => ({ opacity: 0, x: -dir * 70, transition: { duration: 0.22, ease: "easeIn" } }),
};

export const Chevron = ({ left }: { left: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"
    style={{ transform: left ? "none" : "scaleX(-1)" }}>
    <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/** Built-in page layout: title, lead paragraph, points grid, and a table of contents on home. */
function DefaultSlideBody({ index, slides, go }: SlideRenderContext) {
  const s = slides[index];
  return (
    <>
      <h1 id="od-page-title">{s.title}</h1>
      {s.lead && <p className="od-lead">{s.lead}</p>}
      {s.points && (
        <ul className="od-points">
          {s.points.map(p => <li key={p.h}><h2>{p.h}</h2><p>{p.t}</p></li>)}
        </ul>
      )}
      {index === 0 && (
        <nav className="od-toc" aria-label="Pages">
          {slides.slice(1).map((p, j) => (
            <button key={p.id} className="od-chip" style={{ "--c": p.color } as CSSProperties}
              onClick={() => go(j + 1, 1)}><i />{p.title}</button>
          ))}
        </nav>
      )}
    </>
  );
}

interface PageViewProps {
  slides: ResolvedSlide[];
  index: number;
  nav: NavState;
  onClose: () => void;
  onGo: (index: number, dir: 1 | -1) => void;
  backBtnRef: Ref<HTMLButtonElement>;
  closeLabel?: string;
}

export function PageView({ slides, index, nav, onClose, onGo, backBtnRef, closeLabel = "Back to orbit" }: PageViewProps) {
  const s = slides[index];
  const n = slides.length;
  const ctx: SlideRenderContext = { index, slides, go: (i, dir) => onGo(i, dir ?? (i > index ? 1 : -1)), close: onClose };

  return (
    <div className="od-page-inner">
      <header className="od-page-top">
        <button className="od-back" ref={backBtnRef} onClick={onClose}>
          <Chevron left /> {closeLabel} <kbd>Esc</kbd>
        </button>
        <span className="od-count">{index + 1} of {n}</span>
      </header>

      <AnimatePresence mode="wait" custom={nav} initial>
        <motion.article
          key={s.id}
          className="od-content"
          custom={nav}
          variants={contentVariants}
          initial="enter" animate="center" exit="exit">
          {s.render ? s.render(ctx) : <DefaultSlideBody {...ctx} />}
        </motion.article>
      </AnimatePresence>

      <footer className="od-page-nav">
        <button className="od-pn" aria-label="Previous page" onClick={() => onGo((index - 1 + n) % n, -1)}><Chevron left /></button>
        <div className="od-dots">
          {slides.map((p, j) => (
            <button key={p.id} className="od-dot" style={{ "--c": p.color } as CSSProperties}
              aria-label={p.title} aria-current={j === index ? "true" : "false"}
              onClick={() => j !== index && onGo(j, j > index ? 1 : -1)}><i /></button>
          ))}
        </div>
        <button className="od-pn" aria-label="Next page" onClick={() => onGo((index + 1) % n, 1)}><Chevron left={false} /></button>
      </footer>
    </div>
  );
}
