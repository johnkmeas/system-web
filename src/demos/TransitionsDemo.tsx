import { useRef, useState } from "react";
import { PageTransition, type TransitionEffect } from "../patterns";

const PAGES = [
  { id: "home", title: "Home", color: "#F4C95D", body: "Every page in this little site swaps with the effect you pick above. Click around." },
  { id: "work", title: "Work", color: "#9FB4FF", body: "Selected projects, case studies and experiments. The circle grows from the link you clicked." },
  { id: "about", title: "About", color: "#F49AC1", body: "Going back through the nav runs slide, wipe and blinds in reverse, so direction reads naturally." },
  { id: "contact", title: "Contact", color: "#7FD1C7", body: "One component, eleven effects. Swap the effect prop, keep the rest of the page the same." },
];

const EFFECTS: TransitionEffect[] = ["circle", "diamond", "wipe", "split", "slide", "stack", "flip", "zoom", "blur", "blinds", "fade"];

export function TransitionsDemo() {
  const [page, setPage] = useState(0);
  const [effect, setEffect] = useState<TransitionEffect>("circle");
  const [dir, setDir] = useState<1 | -1>(1);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  const go = (i: number, e: React.MouseEvent) => {
    if (i === page) return;
    const s = stageRef.current?.getBoundingClientRect();
    const b = e.currentTarget.getBoundingClientRect();
    if (s) setOrigin({ x: b.left + b.width / 2 - s.left, y: b.top + b.height / 2 - s.top });
    setDir(i > page ? 1 : -1);
    setPage(i);
  };

  const p = PAGES[page];
  return (
    <main className="gx-demo">
      <header className="gx-demo-head">
        <div>
          <h1>Page transitions</h1>
          <a className="gx-inline-link" href="#/store">See them in a full store flow →</a>
        </div>
        <div className="gx-seg" role="group" aria-label="Effect">
          {EFFECTS.map(fx => (
            <button key={fx} aria-pressed={effect === fx} onClick={() => setEffect(fx)}>{fx}</button>
          ))}
        </div>
      </header>

      <nav className="td-nav" aria-label="Demo site">
        {PAGES.map((pg, i) => (
          <button key={pg.id} aria-current={i === page ? "page" : undefined} onClick={e => go(i, e)}>{pg.title}</button>
        ))}
      </nav>

      <div ref={stageRef} className="td-stage-wrap">
        <PageTransition className="td-stage" pageKey={p.id} effect={effect} direction={dir}
          origin={origin} accent="#141A33">
          <section className="td-page" style={{ background: p.color }}>
            <span className="td-kicker">{String(page + 1).padStart(2, "0")} / {String(PAGES.length).padStart(2, "0")}</span>
            <h2>{p.title}</h2>
            <p>{p.body}</p>
          </section>
        </PageTransition>
      </div>
    </main>
  );
}
