import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CityScene, type CityStyle, type Theme } from "./scene";
import { STYLE_LIST, STYLES } from "./styles";
import { DISTRICTS, districtById, type CityLink, type District } from "./links";
import { ProductHub } from "./ProductHub";
import { CheckIcon, CloseIcon, ExternalIcon, MoonIcon, PaletteIcon, ResetIcon, SunIcon } from "./icons";
import "./city.css";

const go = (path: string) => { window.location.hash = "#/city" + (path ? "/" + path : ""); };

function useCityPath() {
  const read = () => window.location.hash.replace(/^#\/?city\/?/, "").split("/").filter(Boolean);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => setParts(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return parts;
}

const STYLE_KEY = "ops-city-style";
function readStyle(): CityStyle {
  try { const v = localStorage.getItem(STYLE_KEY); if (v && v in STYLES) return v as CityStyle; } catch { /* storage blocked */ }
  return "lowpoly";
}

function useMedia(q: string) {
  const [m, setM] = useState(() => window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

export function CityDemo() {
  const [districtId, ...rest] = useCityPath();
  const district = districtById(districtId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<CityScene | null>(null);
  const labels = useMemo(() => new Map<string, HTMLElement>(), []);
  const [hovered, setHovered] = useState<string | null>(null);
  const prefersDark = useMedia("(prefers-color-scheme: dark)");
  const reducedMotion = useMedia("(prefers-reduced-motion: reduce)");
  const narrow = useMedia("(max-width: 760px)");
  const [themeChoice, setThemeChoice] = useState<Theme | null>(null);
  const theme: Theme = themeChoice ?? (prefersDark ? "night" : "day");
  const [webgl, setWebgl] = useState(true);
  const [style, setStyle] = useState<CityStyle>(readStyle);
  const [picker, setPicker] = useState(false);
  const chooseStyle = (s: CityStyle) => {
    setStyle(s);
    try { localStorage.setItem(STYLE_KEY, s); } catch { /* storage blocked */ }
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    let scene: CityScene;
    try {
      scene = new CityScene(canvas, {
        districts: DISTRICTS, style, theme, reducedMotion, labels,
        onHover: setHovered,
        onSelect: id => go(id),
      });
    } catch {
      setWebgl(false);
      return;
    }
    sceneRef.current = scene;
    return () => { scene.dispose(); sceneRef.current = null; };
    // Scene is built once; look and focus are pushed in by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { sceneRef.current?.setLook(style, theme); }, [style, theme]);

  const wide = district?.id === "products";
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.focus(district?.id ?? null);
    if (!district) s.setInset(0, 0);
    else if (narrow) s.setInset(0, window.innerHeight * 0.72);
    else s.setInset(wide ? Math.min(window.innerWidth - 220, 1180) : Math.min(560, window.innerWidth * 0.5), 0);
  }, [district, narrow, wide]);

  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (picker) setPicker(false); else if (district) go("");
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [district, picker]);

  return (
    <div className={"cy-root is-" + theme + " look-" + style + (district ? " has-panel" : "") + (wide ? " has-wide" : "")}>
      <canvas ref={canvasRef} className="cy-canvas" aria-label="3D city. Each landmark building opens a page of links." />
      {!webgl && <p className="cy-nogl">This view needs WebGL. Use the district list below.</p>}

      <div className="cy-labels" aria-hidden={district ? "true" : undefined}>
        {DISTRICTS.map(d => (
          <button key={d.id} ref={el => { if (el) labels.set(d.id, el); else labels.delete(d.id); }}
            className={"cy-label" + (hovered === d.id ? " is-hover" : "") + (district?.id === d.id ? " is-active" : "")}
            style={{ "--c": d.color } as CSSProperties} data-hidden="true"
            tabIndex={district ? -1 : 0}
            onPointerEnter={() => sceneRef.current?.hover(d.id)} onPointerLeave={() => sceneRef.current?.hover(null)}
            onFocus={() => sceneRef.current?.hover(d.id)} onBlur={() => sceneRef.current?.hover(null)}
            onClick={() => go(d.id)}>
            <span className="cy-label-kicker">{d.kicker}</span>
            <span className="cy-label-name">{d.name}</span>
          </button>
        ))}
      </div>

      <header className="cy-hud">
        <h1>Ops City</h1>
        <p>{narrow ? "Drag to orbit · pinch to zoom · tap a landmark" : "Drag to orbit · scroll to zoom · right-drag to pan · click a landmark"}</p>
      </header>
      <div className="cy-tools">
        <button className={"cy-tool" + (picker ? " is-open" : "")} onClick={() => setPicker(v => !v)}
          aria-label={`Theme: ${STYLES[style].name}`} aria-expanded={picker} aria-controls="cy-themes">
          <PaletteIcon />
        </button>
        <button className="cy-tool" onClick={() => setThemeChoice(theme === "day" ? "night" : "day")} aria-label={`Switch to ${theme === "day" ? "night" : "day"}`}>
          {theme === "day" ? <MoonIcon /> : <SunIcon />}
        </button>
        <button className="cy-tool" onClick={() => { go(""); sceneRef.current?.resetView(); }} aria-label="Reset view"><ResetIcon /></button>
      </div>
      <AnimatePresence>
        {picker && (
          <>
            <div className="cy-scrim" onPointerDown={() => setPicker(false)} />
            <motion.div id="cy-themes" className="cy-themes" role="group" aria-label="City theme"
              initial={{ opacity: 0, y: -8, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: reducedMotion ? 0 : 0.18, ease: [0.2, 0.7, 0.2, 1] }}>
              <p className="cy-themes-title">Theme</p>
              {STYLE_LIST.map(s => (
                <button key={s.id} className={"cy-theme" + (s.id === style ? " is-active" : "")} aria-pressed={s.id === style}
                  onClick={() => chooseStyle(s.id)}>
                  <span className={"cy-theme-swatch is-" + s.id} aria-hidden="true">
                    {s.swatch.map(col => <span key={col} style={{ background: col }} />)}
                  </span>
                  <span className="cy-theme-text"><strong>{s.name}</strong><small>{s.blurb}</small></span>
                  {s.id === style && <CheckIcon />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav className="cy-dock" aria-label="Districts">
        {DISTRICTS.map(d => (
          <a key={d.id} href={"#/city/" + d.id} className={"cy-chip" + (district?.id === d.id ? " is-active" : "")}
            style={{ "--c": d.color } as CSSProperties} aria-current={district?.id === d.id ? "page" : undefined}
            onPointerEnter={() => sceneRef.current?.hover(d.id)} onPointerLeave={() => sceneRef.current?.hover(null)}>
            <span className="cy-chip-dot" />{d.name}
          </a>
        ))}
      </nav>

      <AnimatePresence>
        {district && (
          <motion.aside key={wide ? "wide" : "panel"} role="dialog" aria-label={district.name}
            className={"cy-panel" + (wide ? " is-wide" : "")}
            style={{ "--c": district.color } as CSSProperties}
            initial={narrow ? { y: "100%" } : { x: "105%" }}
            animate={narrow ? { y: 0 } : { x: 0 }}
            exit={narrow ? { y: "100%" } : { x: "105%" }}
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 32, delay: 0.25 }}>
            <button className="cy-close" onClick={() => go("")} aria-label="Close and return to the city"><CloseIcon /></button>
            {wide ? <ProductHub path={rest} /> : <DistrictPage key={district.id} district={district} />}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
}

function DistrictPage({ district }: { district: District }) {
  const [q, setQ] = useState("");
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.focus({ preventScroll: true }); }, []);
  const groups = district.groups
    .map(g => ({ ...g, links: g.links.filter(l => !q || `${g.title} ${l.label} ${l.note ?? ""} ${l.url}`.toLowerCase().includes(q.toLowerCase())) }))
    .filter(g => g.links.length);
  const todo = district.groups.reduce((n, g) => n + g.links.filter(l => l.todo).length, 0);
  const total = district.groups.reduce((n, g) => n + g.links.length, 0);

  return (
    <div className="cy-page">
      <header className="cy-page-head">
        <span className="cy-kicker"><span className="cy-chip-dot" />{district.kicker}</span>
        <h2 ref={head} tabIndex={-1}>{district.name}</h2>
        <p>{district.blurb}</p>
        <div className="cy-page-meta">
          <span>{total} links</span>
          {todo > 0 && <span className="cy-todo-count" title="Edit src/demos/city/links.ts">{todo} need a URL</span>}
        </div>
        {total > 6 && (
          <input className="cy-search" type="search" placeholder={`Filter ${district.name.toLowerCase()} links`}
            value={q} onChange={e => setQ(e.target.value)} aria-label="Filter links" />
        )}
      </header>
      {groups.map((g, gi) => (
        <motion.section key={g.title} className="cy-group"
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 + gi * 0.06, duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}>
          <h3>{g.title}</h3>
          <ul>{g.links.map(l => <LinkRow key={l.label + l.url} link={l} />)}</ul>
        </motion.section>
      ))}
      {!groups.length && <p className="cy-empty">No links match “{q}”.</p>}
    </div>
  );
}

function LinkRow({ link }: { link: CityLink }) {
  const [copied, setCopied] = useState(false);
  let host = link.url;
  try { host = new URL(link.url).host + new URL(link.url).pathname.replace(/\/$/, ""); } catch { /* keep raw */ }
  const copy = async () => {
    try { await navigator.clipboard.writeText(link.url); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* no clipboard */ }
  };
  return (
    <li className="cy-link">
      <a href={link.url} target="_blank" rel="noreferrer noopener">
        <span className="cy-link-avatar" aria-hidden="true">{link.label[0]}</span>
        <span className="cy-link-text">
          <span className="cy-link-label">
            {link.label}
            {link.env && <span className={"cy-env is-" + link.env}>{link.env}</span>}
            {link.todo && <span className="cy-todo">needs URL</span>}
          </span>
          <span className="cy-link-host">{link.note ? `${link.note} · ` : ""}{host}</span>
        </span>
        <ExternalIcon />
      </a>
      <button className="cy-copy" onClick={copy} aria-label={`Copy ${link.label} URL`}>{copied ? "Copied" : "Copy"}</button>
    </li>
  );
}

