import { useState, type ReactNode } from "react";
import {
  Highlight, RollText, RotatingText, ScrambleText, Shimmer, TextEffect, Typewriter,
  type ScrambleOptions, type TextEffectName,
} from "../patterns";

type Split = "word" | "char";
const SPEEDS = { Slow: 1.5, Normal: 1, Fast: 0.6 } as const;
type Speed = keyof typeof SPEEDS;

const ELEGANT: { fx: TextEffectName; name: string; note: string; by?: Split }[] = [
  { fx: "rise", name: "Rise", note: "Words drift up and fade in. The safe default for headlines." },
  { fx: "mask", name: "Mask reveal", note: "Each word slides up out of its own clip box. Editorial, very clean." },
  { fx: "blur", name: "Blur in", note: "Comes into focus. Soft and premium, good on hero copy." },
  { fx: "track", name: "Tracking", note: "Letters gather in from a wide spread. Feels like a luxury brand.", by: "char" },
  { fx: "fade", name: "Letter fade", note: "A quiet letter-by-letter fade for subheads and captions.", by: "char" },
];
const SLICK: { fx: TextEffectName; name: string; note: string; by?: Split }[] = [
  { fx: "flip", name: "Flip up", note: "Letters flip into place like a split-flap board.", by: "char" },
  { fx: "wave", name: "Pop wave", note: "A springy wave. Playful, good for short punchy words.", by: "char" },
  { fx: "drop", name: "Drop in", note: "Letters fall and bounce into line. Use sparingly.", by: "char" },
];
const SCRAMBLES: { name: string; note: string; opts: ScrambleOptions }[] = [
  { name: "Decode (subtle)", note: "Only a few letters ahead of the cursor scramble, in matching case. Reads as a quick settle.",
    opts: { mode: "decode", charset: "letters", window: 3, rate: 70 } },
  { name: "Decode (terminal)", note: "Same reveal with symbol glyphs, for dev tools and tech brands.",
    opts: { mode: "decode", charset: "symbols", window: 5, rate: 50 } },
  { name: "Full sweep", note: "The original: everything scrambles, settling left to right. Loudest option.",
    opts: { mode: "sweep", charset: "symbols", rate: 50 } },
  { name: "Blocks", note: "Block glyphs for a glitchy, lo-fi look.", opts: { mode: "decode", charset: "blocks", window: 6, rate: 60 } },
];

export function TextDemo() {
  const [text, setText] = useState("Make every word count");
  const [split, setSplit] = useState<Split | "auto">("auto");
  const [speed, setSpeed] = useState<Speed>("Normal");
  const [replay, setReplay] = useState(0);
  const k = SPEEDS[speed];
  const sample = text.trim() || " ";

  return (
    <main className="gx-demo te-demo">
      <header className="gx-demo-head">
        <div>
          <h1><TextEffect text="Text effects" effect="mask" /></h1>
          <p>Ways to bring type on screen, from quiet to loud. Click any card to replay it.</p>
        </div>
      </header>

      <div className="te-controls">
        <label className="te-field"><span>Sample text</span>
          <input className="te-input" value={text} onChange={e => setText(e.target.value)} />
        </label>
        <div className="te-field"><span>Split</span>
          <div className="gx-seg" role="group" aria-label="Split">
            {(["auto", "word", "char"] as const).map(s => (
              <button key={s} aria-pressed={split === s} onClick={() => setSplit(s)}>{s === "char" ? "letters" : s === "word" ? "words" : "auto"}</button>
            ))}
          </div>
        </div>
        <div className="te-field"><span>Speed</span>
          <div className="gx-seg" role="group" aria-label="Speed">
            {(Object.keys(SPEEDS) as Speed[]).map(s => <button key={s} aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s}</button>)}
          </div>
        </div>
        <button className="gx-ghost" onClick={() => setReplay(r => r + 1)}>Replay all</button>
      </div>

      <Group title="Elegant" note="Restrained entrances for headlines and body copy.">
        {ELEGANT.map(e => (
          <EffectCard key={e.fx} name={e.name} note={e.note} replay={replay}>
            {r => <TextEffect text={sample} effect={e.fx} by={split === "auto" ? e.by ?? "word" : split} replay={r}
              duration={0.7 * k} stagger={(split === "char" || e.by === "char" ? 0.025 : 0.07) * k} />}
          </EffectCard>
        ))}
      </Group>

      <Group title="Slick" note="More character. Great on short headings, labels and buttons.">
        {SLICK.map(e => (
          <EffectCard key={e.fx} name={e.name} note={e.note} replay={replay}>
            {r => <TextEffect text={sample} effect={e.fx} by={split === "auto" ? e.by ?? "word" : split} replay={r}
              duration={0.55 * k} stagger={0.03 * k} />}
          </EffectCard>
        ))}
        <Card name="Roll on hover" note="Each letter rolls up to a copy of itself. The go-to hover for nav links and buttons.">
          <nav className="te-roll-nav" aria-label="Example navigation">
            {["Work", "Studio", "Journal", "Contact"].map(w => (
              <a key={w} href="#/text" className="tx-roll-host" onClick={e => e.preventDefault()}><RollText text={w} /></a>
            ))}
          </nav>
          <button className="te-roll-btn tx-roll-host"><RollText text="Get started →" /></button>
        </Card>
        <Card name="Rotating word" note="One word cycles in place while the rest of the line holds still.">
          <p className="te-sample">We build <RotatingText words={["websites", "stores", "apps", "brands"]} className="te-accent" /></p>
          <p className="te-sample te-sm">Blur: <RotatingText effect="blur" words={["calm", "clear", "focused"]} /> · Flip: <RotatingText effect="flip" words={["fast", "bold", "loud"]} /></p>
        </Card>
        <Card name="Shimmer" note="A light sweep on a loop. Draws the eye to a label without moving the layout.">
          <p className="te-sample"><Shimmer>New collection, live now</Shimmer></p>
        </Card>
      </Group>

      <Group title="Useful" note="Everyday patterns for real interfaces.">
        <Card name="Typewriter" note="Types, pauses, deletes, repeats. Search placeholders, chat intros, hero prompts.">
          <p className="te-sample"><Typewriter lines={["Search for running shoes", "Search for linen shirts", "Search for gift ideas"]} speed={55 * k} /></p>
        </Card>
        <Card name="Highlight" note="A marker stroke that draws under key words as they scroll into view.">
          <p className="te-sample te-sm">Ship pages that <Highlight>actually convert</Highlight>, with motion that <Highlight delay={0.6}>stays out of the way</Highlight>.</p>
        </Card>
        {SCRAMBLES.map(s => (
          <EffectCard key={s.name} name={"Scramble · " + s.name} note={s.note} replay={replay}>
            {r => <ScrambleText text={sample} replay={r} duration={(s.opts.mode === "sweep" ? 1100 : 900) * k} {...s.opts} />}
          </EffectCard>
        ))}
      </Group>
    </main>
  );
}

function Group({ title, note, children }: { title: string; note: string; children: ReactNode }) {
  return (
    <section className="te-group">
      <div className="te-group-head"><h2>{title}</h2><p>{note}</p></div>
      <div className="te-grid">{children}</div>
    </section>
  );
}

function Card({ name, note, children }: { name: string; note: string; children: ReactNode }) {
  return (
    <article className="te-card">
      <div className="te-stage">{children}</div>
      <h3>{name}</h3><p>{note}</p>
    </article>
  );
}

/** A card whose sample replays when clicked (or when "Replay all" is pressed). */
function EffectCard({ name, note, replay, children }: {
  name: string; note: string; replay: number; children: (replay: number) => ReactNode;
}) {
  const [own, setOwn] = useState(0);
  return (
    <article className="te-card">
      <button className="te-stage te-stage-btn" onClick={() => setOwn(o => o + 1)} aria-label={`Replay ${name}`}>
        <span className="te-sample">{children(replay * 1000 + own)}</span>
      </button>
      <h3>{name}</h3><p>{note}</p>
    </article>
  );
}
