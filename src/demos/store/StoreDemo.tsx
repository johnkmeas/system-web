import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { PageTransition, type TransitionEffect } from "../../patterns";
import { NICHES, type NicheId, type StoreProduct } from "./niches";
import { AboutPage, CartPage, CollectionPage, FaqPage, HomePage, ProductPage, type CartLine, type Route, type StoreCtx } from "./pages";
import { Icon, money } from "./ui";
import {
  DEFAULT_PREFS, MotionPrefsProvider, STATIC_PREFS,
  type GridFx, type HoverFx, type MotionPrefs, type RevealStyle, type SectionMode, type SliderFx,
} from "./motion";
import "./store.css";

type EffectChoice = "auto" | TransitionEffect;
const EFFECTS: EffectChoice[] = ["auto", "circle", "diamond", "wipe", "split", "slide", "stack", "flip", "zoom", "blur", "blinds", "fade"];
const SPEEDS = { Fast: 0.45, Normal: 0.7, Slow: 1.1 } as const;
type Speed = keyof typeof SPEEDS;

const PRESETS: Record<string, MotionPrefs> = {
  Static: STATIC_PREFS,
  Subtle: { reveal: "fade", stagger: 0.05, sections: "slider", sliderFx: "slide", parallax: 24, marquee: 30, autoplay: 0, hover: "lift", gridFx: "spring" },
  Lively: DEFAULT_PREFS,
  Wild: { reveal: "blur", stagger: 0.14, sections: "slider", sliderFx: "ring", parallax: 120, marquee: 140, autoplay: 2500, hover: "tilt", gridFx: "flip" },
};
const presetOf = (p: MotionPrefs) => Object.keys(PRESETS).find(k => JSON.stringify(PRESETS[k]) === JSON.stringify(p));

/** One row of choices in the dock. */
function Seg<T extends string | number>({ label, value, options, onChange, names }: {
  label: string; value: T; options: readonly T[]; onChange: (v: T) => void; names?: (v: T) => string;
}) {
  return (
    <div className="sd-field"><span>{label}</span>
      <div className="sd-seg" role="group" aria-label={label}>
        {options.map(o => <button key={String(o)} aria-pressed={value === o} onClick={() => onChange(o)}>{names ? names(o) : String(o)}</button>)}
      </div>
    </div>
  );
}

const DEPTH: Record<Route["page"], number> = { home: 0, about: 1, faq: 1, collection: 1, product: 2, cart: 3 };
const keyOf = (r: Route) => r.page + ("id" in r ? ":" + r.id : "");

/** What a real store would likely use for each hop. */
function autoEffect(from: Route, to: Route): TransitionEffect {
  if (to.page === "product") return "circle";                       // grow out of the card you tapped
  if (to.page === "cart") return "stack";                           // the cart lands on top like a sheet
  if (DEPTH[to.page] < DEPTH[from.page]) return "slide";            // going back up the hierarchy
  if (from.page === "home" && to.page === "collection") return "wipe";
  if (from.page === "collection" && to.page === "collection") return "zoom";
  if (to.page === "about" || to.page === "faq") return "blur";     // quieter content pages
  return "fade";
}

const TOUR = (id: NicheId): Route[] => {
  const n = NICHES[id];
  return [
    { page: "home" }, { page: "collection", id: n.collections[0].id }, { page: "product", id: n.products[0].id },
    { page: "cart" }, { page: "about" }, { page: "faq" }, { page: "collection", id: n.collections[1].id },
    { page: "product", id: n.products[4].id }, { page: "home" },
  ];
};

export function StoreDemo() {
  const [niche, setNiche] = useState<NicheId>("tees");
  const [choice, setChoice] = useState<EffectChoice>("auto");
  const [speed, setSpeed] = useState<Speed>("Normal");
  const [route, setRoute] = useState<Route>({ page: "home" });
  const [touring, setTouring] = useState(false);
  const [dockOpen, setDockOpen] = useState(() => !window.matchMedia("(max-width: 640px)").matches);
  const [tab, setTab] = useState<"flow" | "motion">("flow");
  const [prefs, setPrefs] = useState<MotionPrefs>(DEFAULT_PREFS);
  const set = <K extends keyof MotionPrefs>(k: K) => (v: MotionPrefs[K]) => setPrefs(p => ({ ...p, [k]: v }));
  const preset = presetOf(prefs);
  const accent = NICHES[niche].theme.accent;

  // Switching niche keeps you on the same kind of page, pointed at the new store's content.
  const switchNiche = (id: NicheId) => {
    if (id === niche) return;
    const n = NICHES[id];
    setRoute(r => r.page === "collection" ? { page: "collection", id: n.collections[0].id }
      : r.page === "product" ? { page: "product", id: n.products[0].id } : r);
    setNiche(id);
  };

  return (
    <div className="sd-shell">
      <MotionPrefsProvider value={prefs}>
        <PageTransition className="sd-outer" pageKey={niche} effect="blinds" accent={accent} duration={SPEEDS[speed] * 1.4}>
          <Store key={niche} niche={niche} choice={choice} duration={SPEEDS[speed]} route={route} setRoute={setRoute}
            touring={touring} />
        </PageTransition>
      </MotionPrefsProvider>

      <div className={"sd-dock" + (dockOpen ? "" : " is-collapsed")} role="region" aria-label="Demo settings">
        <button className="sd-dock-toggle" aria-expanded={dockOpen} onClick={() => setDockOpen(o => !o)}>
          {dockOpen ? "Hide" : "Demo settings"}
        </button>
        {dockOpen && (
          <div className="sd-dock-body">
            <div className="sd-tabs" role="tablist" aria-label="Settings">
              <button role="tab" aria-selected={tab === "flow"} onClick={() => setTab("flow")}>Flow</button>
              <button role="tab" aria-selected={tab === "motion"} onClick={() => setTab("motion")}>Motion</button>
            </div>
            {tab === "flow" ? (
              <div className="sd-panel" role="tabpanel" aria-label="Flow">
                <Seg label="Niche" value={niche} options={Object.keys(NICHES) as NicheId[]} onChange={switchNiche} names={id => NICHES[id].label} />
                <Seg label="Transition" value={choice} options={EFFECTS} onChange={setChoice} />
                <Seg label="Speed" value={speed} options={Object.keys(SPEEDS) as Speed[]} onChange={setSpeed} />
                <button className="sd-tour" aria-pressed={touring} onClick={() => setTouring(t => !t)}>
                  {touring ? "■ Stop tour" : "▶ Play tour"}
                </button>
                <p className="sd-hint">
                  {choice === "auto"
                    ? "Auto: wipe into collections, zoom between them, circle from the card into products, stack for the cart, blur for content pages, slide back."
                    : `Every link uses “${choice}”.`}
                </p>
              </div>
            ) : (
              <div className="sd-panel" role="tabpanel" aria-label="Motion">
                <Seg label="Preset" value={preset ?? "Custom"} options={[...Object.keys(PRESETS), ...(preset ? [] : ["Custom"])]}
                  onChange={k => PRESETS[k] && setPrefs(PRESETS[k])} />
                <Seg label="Reveal" value={prefs.reveal} options={["off", "rise", "fade", "slide", "zoom", "blur", "mask"] as RevealStyle[]} onChange={set("reveal")} />
                <Seg label="Stagger" value={prefs.stagger} options={[0, 0.05, 0.08, 0.14]} onChange={set("stagger")}
                  names={v => (v ? `${v * 1000}ms` : "none")} />
                <Seg label="Sections" value={prefs.sections} options={["grid", "slider"] as SectionMode[]} onChange={set("sections")} />
                <Seg label="Slider" value={prefs.sliderFx} options={["slide", "scale", "parallax", "cards", "coverflow", "ring"] as SliderFx[]} onChange={set("sliderFx")} />
                <Seg label="Autoplay" value={prefs.autoplay} options={[0, 2500, 4000, 6000]} onChange={set("autoplay")}
                  names={v => (v ? `${v / 1000}s` : "off")} />
                <Seg label="Parallax" value={prefs.parallax} options={[0, 24, 60, 120]} onChange={set("parallax")}
                  names={v => ({ 0: "off", 24: "subtle", 60: "medium", 120: "strong" })[v] ?? String(v)} />
                <Seg label="Marquee" value={prefs.marquee} options={[0, 30, 60, 140]} onChange={set("marquee")}
                  names={v => ({ 0: "still", 30: "slow", 60: "medium", 140: "fast" })[v] ?? String(v)} />
                <Seg label="Filter" value={prefs.gridFx} options={["none", "spring", "pop", "stagger", "flip", "blur"] as GridFx[]} onChange={set("gridFx")} />
                <Seg label="Hover" value={prefs.hover} options={["off", "lift", "tilt"] as HoverFx[]} onChange={set("hover")} />
                <p className="sd-hint">Scroll below the fold: sections reveal, art drifts, tickers speed up with your scroll. “Filter” animates collection grids when you filter, sort or change the layout.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Store({ niche: id, choice, duration, route, setRoute, touring }: {
  niche: NicheId; choice: EffectChoice; duration: number; route: Route;
  setRoute: (r: Route) => void; touring: boolean;
}) {
  const n = NICHES[id];
  const [cart, setCart] = useState<CartLine[]>([]);
  const [effect, setEffect] = useState<TransitionEffect>("fade");
  const [dir, setDir] = useState<1 | -1>(1);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [toast, setToast] = useState<{ name: string; n: number } | null>(null);
  const [menu, setMenu] = useState(false);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const routeRef = useRef(route);
  routeRef.current = route;

  const nav = useCallback((to: Route, e?: MouseEvent) => {
    const from = routeRef.current;
    if (keyOf(to) === keyOf(from)) return;
    const stage = stageRef.current?.getBoundingClientRect();
    if (e && stage) {
      const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setOrigin({ x: b.left + b.width / 2 - stage.left, y: b.top + b.height / 2 - stage.top });
    } else setOrigin(null);
    setEffect(choice === "auto" ? autoEffect(from, to) : choice);
    setDir(DEPTH[to.page] < DEPTH[from.page] ? -1 : 1);
    setRoute(to);
  }, [choice, setRoute]);

  // Guided tour through the whole flow.
  useEffect(() => {
    if (!touring) return;
    const steps = TOUR(id);
    let i = Math.max(0, steps.findIndex(s => keyOf(s) === keyOf(routeRef.current)));
    const t = setInterval(() => { i = (i + 1) % steps.length; nav(steps[i]); }, 2600);
    return () => clearInterval(t);
  }, [touring, id, nav]);

  const addToCart = (p: StoreProduct, option: string, qty = 1, price = p.price, plan?: string) => {
    setCart(c => {
      const hit = c.find(l => l.id === p.id && l.option === option && l.plan === plan);
      return hit ? c.map(l => (l === hit ? { ...l, qty: l.qty + qty } : l)) : [...c, { id: p.id, option, qty, price, plan }];
    });
    setToast(t => ({ name: p.name, n: (t?.n ?? 0) + 1 }));
  };
  const setQty = (pid: string, option: string, qty: number) =>
    setCart(c => (qty <= 0 ? c.filter(l => !(l.id === pid && l.option === option))
      : c.map(l => (l.id === pid && l.option === option ? { ...l, qty } : l))));

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  // Mobile menu: Esc closes it and focus goes back to the burger.
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenu(false); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); menuBtnRef.current?.focus({ preventScroll: true }); };
  }, [menu]);
  const menuNav = (to: Route, e: MouseEvent) => { setMenu(false); nav(to, e); };

  const ctx: StoreCtx = { niche: n, nav, cart, addToCart, setQty };
  const count = cart.reduce((s, l) => s + l.qty, 0);
  const th = n.theme;
  const themeVars = {
    "--s-bg": th.bg, "--s-surface": th.surface, "--s-text": th.text, "--s-muted": th.muted, "--s-line": th.line,
    "--s-accent": th.accent, "--s-accent-text": th.accentText, "--s-radius": th.radius,
    "--s-display": th.display, "--s-body": th.body, "--s-case": th.displayCase, "--s-weight": th.displayWeight,
  } as CSSProperties;

  return (
    <div className="st-site" style={themeVars} data-niche={id}>
      <div className="st-announce">{n.announcement}</div>
      <header className="st-header">
        <button className="st-burger" ref={menuBtnRef} aria-label="Open menu" aria-expanded={menu}
          onClick={() => setMenu(true)}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
        </button>
        <button className="st-logo" onClick={e => nav({ page: "home" }, e)}>{n.brand}</button>
        <nav className="st-nav" aria-label="Main">
          {n.collections.map(c => (
            <button key={c.id} aria-current={route.page === "collection" && route.id === c.id ? "page" : undefined}
              onClick={e => nav({ page: "collection", id: c.id }, e)}>{c.name}</button>
          ))}
          <button aria-current={route.page === "about" ? "page" : undefined} onClick={e => nav({ page: "about" }, e)}>About</button>
          <button aria-current={route.page === "faq" ? "page" : undefined} onClick={e => nav({ page: "faq" }, e)}>Help</button>
        </nav>
        <div className="st-header-icons">
          <button aria-label="Search" onClick={e => nav({ page: "faq" }, e)}><Icon name="search" /></button>
          <button className="st-cart-btn" aria-label={`Cart, ${count} items`} onClick={e => nav({ page: "cart" }, e)}>
            <Icon name="cart" />
            <AnimatePresence>
              {count > 0 && (
                <motion.span key={count} className="st-cart-count" initial={{ scale: 0.4 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 600, damping: 18 }}>{count}</motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </header>

      <div ref={stageRef} className="st-stage-wrap">
        <PageTransition className="st-stage" pageKey={keyOf(route)} effect={effect} direction={dir} origin={origin}
          accent={th.accent} duration={duration}>
          {route.page === "home" && <HomePage ctx={ctx} />}
          {route.page === "collection" && <CollectionPage ctx={ctx} id={route.id} />}
          {route.page === "product" && <ProductPage ctx={ctx} id={route.id} />}
          {route.page === "cart" && <CartPage ctx={ctx} />}
          {route.page === "about" && <AboutPage ctx={ctx} />}
          {route.page === "faq" && <FaqPage ctx={ctx} />}
        </PageTransition>
      </div>

      <AnimatePresence>
        {menu && (
          <motion.div key="scrim" className="st-menu-scrim" onClick={() => setMenu(false)}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
        )}
        {menu && (
          <motion.nav key="menu" className="st-menu" aria-label="Menu"
            initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}>
            <div className="st-menu-head">
              <span className="st-logo">{n.brand}</span>
              <button className="st-menu-x" aria-label="Close menu" autoFocus onClick={() => setMenu(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            </div>
            <motion.ul initial="hidden" animate="show"
              variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.08 } } }}>
              {([
                ["Home", { page: "home" }],
                ...n.collections.map(c => [c.name, { page: "collection", id: c.id }] as [string, Route]),
                ["About", { page: "about" }], ["Help", { page: "faq" }],
                [`Cart${count ? ` (${count})` : ""}`, { page: "cart" }],
              ] as [string, Route][]).map(([label, to]) => (
                <motion.li key={label} variants={{ hidden: { opacity: 0, x: -24 }, show: { opacity: 1, x: 0 } }}>
                  <button aria-current={keyOf(to) === keyOf(route) ? "page" : undefined} onClick={e => menuNav(to, e)}>
                    {label}<span aria-hidden="true">→</span>
                  </button>
                </motion.li>
              ))}
            </motion.ul>
          </motion.nav>
        )}
        {toast && (
          <motion.div key={toast.n} className="st-toast" role="status"
            initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -16, opacity: 0 }}>
            <Icon name="check" /> <span><b>{toast.name}</b> added · Cart total {money(cart.reduce((s, l) => s + l.price * l.qty, 0))}</span>
            <button className="st-link" onClick={e => { setToast(null); nav({ page: "cart" }, e); }}>View cart</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
