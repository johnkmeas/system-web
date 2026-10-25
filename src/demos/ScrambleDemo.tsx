import { useState } from "react";
import { ScrambleText } from "../patterns";

const WORDS = ["Design", "Motion", "Systems", "Interfaces", "Prototypes"];

export function ScrambleDemo() {
  const [replay, setReplay] = useState(0);
  const [text, setText] = useState("Type something here");
  const [hover, setHover] = useState<Record<string, number>>({});

  return (
    <main className="gx-demo">
      <header className="gx-demo-head">
        <h1>Scramble text</h1>
        <p>Plays on load, on hover, and whenever the text changes. Reduced-motion users see the final text immediately.</p>
      </header>

      <section className="sd-block">
        <ScrambleText as="p" className="sd-big" text="Signal from noise." replay={replay} duration={1100} />
        <button className="gx-ghost" onClick={() => setReplay(r => r + 1)}>Replay</button>
      </section>

      <section className="sd-block">
        <h2 className="sd-label">Hover the words</h2>
        <ul className="sd-words">
          {WORDS.map(w => (
            <li key={w} onPointerEnter={() => setHover(h => ({ ...h, [w]: (h[w] ?? 0) + 1 }))}>
              <ScrambleText text={w} replay={hover[w]} duration={400} />
            </li>
          ))}
        </ul>
      </section>

      <section className="sd-block">
        <label className="sd-label" htmlFor="sd-input">Live text</label>
        <input id="sd-input" className="sd-input" value={text} onChange={e => setText(e.target.value)} />
        <ScrambleText as="p" className="sd-live" text={text || " "} duration={500} />
      </section>
    </main>
  );
}
