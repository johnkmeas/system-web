import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Carousel, CarouselArrows, CarouselAutoplay, CarouselCounter, CarouselDots, CarouselScrubber, CarouselThumbs,
  useCarousel, type CarouselEffect,
} from "../patterns";
import { Art, SCENES } from "./slider-data";

interface Config {
  orientation: "x" | "y";
  rtl: boolean;
  effect: CarouselEffect;
  itemSize: number;
  gap: number;
  align: "center" | "start";
  rows: number;
  loop: boolean;
  snap: boolean;
  autoplay: number;
  height: number;
  count: number;
  arrows: boolean;
  dots: boolean;
  scalingDots: boolean;
  counter: boolean;
  scrubber: boolean;
  thumbs: boolean;
  autoplayBar: boolean;
  caption: boolean;
}

const BASE: Config = {
  orientation: "x", rtl: false, effect: "slide", itemSize: 0.7, gap: 16, align: "center", rows: 1,
  loop: false, snap: true, autoplay: 0, height: 380, count: 10,
  arrows: true, dots: true, scalingDots: false, counter: false, scrubber: false, thumbs: false, autoplayBar: false, caption: true,
};

const PRESETS: { name: string; config: Partial<Config> }[] = [
  { name: "Basic", config: {} },
  { name: "Hero autoplay", config: { effect: "parallax", itemSize: 1, gap: 0, loop: true, autoplay: 4000, autoplayBar: true, dots: false, height: 420 } },
  { name: "Coverflow 3D", config: { effect: "coverflow", itemSize: 0.36, loop: true, counter: true, dots: false } },
  { name: "Ring 3D", config: { effect: "ring", itemSize: 0.26, loop: true, count: 12, scrubber: true, dots: false } },
  { name: "Cards", config: { effect: "cards", itemSize: 0.5, autoplay: 3500, autoplayBar: true, dots: false, loop: true } },
  { name: "Vertical feed", config: { orientation: "y", itemSize: 0.62, effect: "scale", height: 520, dots: false, counter: true, scrubber: false } },
  { name: "Grid shelf", config: { rows: 2, itemSize: 180, align: "start", count: 12, height: 400, dots: false, scrubber: true, caption: false } },
  { name: "Free scroll", config: { snap: false, itemSize: 240, align: "start", dots: false, scrubber: true, caption: false } },
  { name: "Thumbnails", config: { effect: "fade", itemSize: 1, gap: 0, thumbs: true, dots: false, counter: true, loop: true } },
  { name: "RTL", config: { rtl: true, align: "start", itemSize: 260, dots: true, scalingDots: true } },
];

const EFFECTS: { v: CarouselEffect; l: string; d: "2D" | "3D" }[] = [
  { v: "slide", l: "Slide", d: "2D" }, { v: "fade", l: "Fade", d: "2D" }, { v: "scale", l: "Scale", d: "2D" },
  { v: "parallax", l: "Parallax", d: "2D" }, { v: "cards", l: "Cards", d: "2D" },
  { v: "coverflow", l: "Coverflow", d: "3D" }, { v: "ring", l: "Ring", d: "3D" },
];

const SIZES = [
  { v: 1, l: "1 / view" }, { v: 0.8, l: "80%" }, { v: 0.7, l: "70%" }, { v: 0.5, l: "50%" },
  { v: 0.36, l: "36%" }, { v: 0.26, l: "26%" }, { v: 260, l: "260px" }, { v: 180, l: "180px" },
];

export function SliderPlayground() {
  const [cfg, setCfg] = useState<Config>(BASE);
  const [preset, setPreset] = useState("Basic");
  const set = <K extends keyof Config>(k: K, v: Config[K]) => { setCfg(c => ({ ...c, [k]: v })); setPreset(""); };

  // Behavior options live in the engine, so changing them remounts the preview.
  const engineKey = [cfg.orientation, cfg.rtl, cfg.loop, cfg.snap, cfg.autoplay, cfg.count, cfg.rows].join("|");

  return (
    <main className="gx-demo">
      <header className="gx-demo-head">
        <h1>Slider playground</h1>
        <p>Mix and match direction, 2D and 3D effects, grid rows, behavior and controls. Every combination is the same engine.</p>
      </header>

      <div className="pg-presets" role="group" aria-label="Presets">
        {PRESETS.map(p => (
          <button key={p.name} className="pg-chip" aria-pressed={preset === p.name}
            onClick={() => { setCfg({ ...BASE, ...p.config }); setPreset(p.name); }}>{p.name}</button>
        ))}
      </div>

      <div className="pg-layout">
        <section className="pg-stage" aria-label="Preview">
          <Preview key={engineKey} cfg={cfg} />
        </section>

        <aside className="pg-panel" aria-label="Settings">
          <Group title="Direction">
            <Seg value={cfg.orientation} onChange={v => set("orientation", v)} options={[["x", "Horizontal"], ["y", "Vertical"]]} />
            {cfg.orientation === "x" && <Toggle label="Right to left" checked={cfg.rtl} onChange={v => set("rtl", v)} />}
          </Group>
          <Group title="Effect">
            <div className="pg-effects">
              {EFFECTS.map(e => (
                <button key={e.v} className="pg-chip" aria-pressed={cfg.effect === e.v} onClick={() => set("effect", e.v)}>
                  {e.l} <small>{e.d}</small>
                </button>
              ))}
            </div>
          </Group>
          <Group title="Layout">
            <label className="pg-row">Slide size
              <select value={cfg.itemSize} onChange={e => set("itemSize", Number(e.target.value))}>
                {SIZES.map(s => <option key={s.v} value={s.v}>{s.l}</option>)}
              </select>
            </label>
            <Range label="Gap" value={cfg.gap} min={0} max={48} step={4} unit="px" onChange={v => set("gap", v)} />
            <Range label="Grid rows" value={cfg.rows} min={1} max={3} step={1} onChange={v => set("rows", v)} />
            <Range label="Height" value={cfg.height} min={240} max={600} step={20} unit="px" onChange={v => set("height", v)} />
            <Range label="Items" value={cfg.count} min={3} max={SCENES.length} step={1} onChange={v => set("count", v)} />
            <Seg value={cfg.align} onChange={v => set("align", v)} options={[["center", "Center"], ["start", "Start"]]} />
          </Group>
          <Group title="Behavior">
            <Toggle label="Infinite loop" checked={cfg.loop} onChange={v => set("loop", v)} />
            <Toggle label="Snap to slides" checked={cfg.snap} onChange={v => set("snap", v)} />
            <label className="pg-row">Autoplay
              <select value={cfg.autoplay} onChange={e => set("autoplay", Number(e.target.value))}>
                <option value={0}>Off</option><option value={2500}>2.5s</option><option value={4000}>4s</option><option value={6000}>6s</option>
              </select>
            </label>
          </Group>
          <Group title="Controls">
            <Toggle label="Arrows" checked={cfg.arrows} onChange={v => set("arrows", v)} />
            <Toggle label="Dots" checked={cfg.dots} onChange={v => set("dots", v)} />
            {cfg.dots && <Toggle label="Scaling dots" checked={cfg.scalingDots} onChange={v => set("scalingDots", v)} />}
            <Toggle label="Page counter" checked={cfg.counter} onChange={v => set("counter", v)} />
            <Toggle label="Progress scrubber" checked={cfg.scrubber} onChange={v => set("scrubber", v)} />
            <Toggle label="Thumbnails" checked={cfg.thumbs} onChange={v => set("thumbs", v)} />
            <Toggle label="Autoplay bar" checked={cfg.autoplayBar} onChange={v => set("autoplayBar", v)} />
            <Toggle label="Synced caption" checked={cfg.caption} onChange={v => set("caption", v)} />
          </Group>
        </aside>
      </div>

      <details className="pg-code">
        <summary>Code for this setup</summary>
        <pre>{codeFor(cfg)}</pre>
      </details>
    </main>
  );
}

function Preview({ cfg }: { cfg: Config }) {
  const items = SCENES.slice(0, cfg.count);
  const slides = Math.ceil(items.length / cfg.rows);
  const api = useCarousel({
    count: slides, loop: cfg.loop, snap: cfg.snap, orientation: cfg.orientation, rtl: cfg.rtl,
    autoplay: cfg.autoplay,
  });
  const scene = items[Math.min(api.index * cfg.rows, items.length - 1)];
  const showThumbs = cfg.thumbs && cfg.rows === 1;

  return (
    <div className="pg-preview">
      <Carousel api={api} items={items} effect={cfg.effect} itemSize={cfg.itemSize} gap={cfg.gap}
        align={cfg.align} rows={cfg.rows} height={cfg.height} label="Preview carousel"
        renderItem={(s, ctx) => (
          <Art scene={s}>
            <span className="art-label">{String(ctx.index + 1).padStart(2, "0")} · {s.title}</span>
          </Art>
        )} />

      {(cfg.arrows || cfg.dots || cfg.counter || cfg.scrubber) && (
        <div className="pg-controls">
          {cfg.counter && <CarouselCounter api={api} />}
          {cfg.dots && <CarouselDots api={api} scaling={cfg.scalingDots} />}
          {cfg.scrubber && <CarouselScrubber api={api} />}
          {cfg.arrows && <CarouselArrows api={api} />}
        </div>
      )}
      {cfg.autoplayBar && cfg.autoplay > 0 && <CarouselAutoplay api={api} />}
      {cfg.autoplayBar && !cfg.autoplay && <p className="pg-note">Turn on autoplay to see the progress bar.</p>}
      {showThumbs && (
        <CarouselThumbs api={api} items={items} renderThumb={s => <Art scene={s} />} />
      )}
      {cfg.thumbs && cfg.rows > 1 && <p className="pg-note">Thumbnails need one item per slide (grid rows = 1).</p>}

      {cfg.caption && (
        <div className="pg-caption" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={scene.id}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}>
              <h2>{scene.title}</h2>
              <p>{scene.text}</p>
            </motion.div>
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function codeFor(c: Config) {
  const hook = [`count: ${Math.ceil(c.count / c.rows)}`];
  if (c.loop) hook.push("loop: true");
  if (!c.snap) hook.push("snap: false");
  if (c.orientation === "y") hook.push(`orientation: "y"`);
  if (c.rtl) hook.push("rtl: true");
  if (c.autoplay) hook.push(`autoplay: ${c.autoplay}`);
  const props = [`effect="${c.effect}"`, `itemSize={${c.itemSize}}`, `gap={${c.gap}}`, `height={${c.height}}`];
  if (c.align !== "center") props.push(`align="${c.align}"`);
  if (c.rows > 1) props.push(`rows={${c.rows}}`);
  const ctrls = [
    c.counter && "<CarouselCounter api={api} />",
    c.dots && `<CarouselDots api={api}${c.scalingDots ? " scaling" : ""} />`,
    c.scrubber && "<CarouselScrubber api={api} />",
    c.arrows && "<CarouselArrows api={api} />",
    c.autoplayBar && c.autoplay && "<CarouselAutoplay api={api} />",
    c.thumbs && "<CarouselThumbs api={api} items={items} renderThumb={…} />",
  ].filter(Boolean);
  return `const api = useCarousel({ ${hook.join(", ")} });

<Carousel api={api} items={items} ${props.join(" ")}
  renderItem={(item, { index, offset, active }) => <Slide item={item} />} />
${ctrls.join("\n")}`;
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="pg-group"><legend>{title}</legend>{children}</fieldset>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="pg-row">{label}
      <input type="checkbox" role="switch" className="pg-switch" checked={checked} onChange={e => onChange(e.target.checked)} />
    </label>
  );
}

function Range({ label, value, min, max, step, unit = "", onChange }: {
  label: string; value: number; min: number; max: number; step: number; unit?: string; onChange: (v: number) => void;
}) {
  return (
    <label className="pg-range">
      <span className="pg-row-text">{label}<span>{value}{unit}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(Number(e.target.value))} />
    </label>
  );
}

function Seg<V extends string>({ value, options, onChange }: { value: V; options: [V, string][]; onChange: (v: V) => void }) {
  return (
    <div className="gx-seg pg-seg" role="group">
      {options.map(([v, l]) => <button key={v} aria-pressed={value === v} onClick={() => onChange(v)}>{l}</button>)}
    </div>
  );
}
