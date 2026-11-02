import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Highlight, MediaGallery, PageTransition, RotatingText, ScrambleText, Shimmer, TextEffect,
  type CarouselEffect, type GalleryLayout, type GalleryLightbox, type TextEffectName, type TransitionEffect,
} from "../../patterns";
import { NICHES, type NicheId, type StoreProduct } from "../store/niches";
import { Accordion, Icon, Stars, StoreArt, money } from "../store/ui";
import { DEFAULT_PREFS, MotionPrefsProvider, Reveal, RevealItem, type RevealStyle } from "../store/motion";
import "../store/store.css";
import "./pdp.css";

/* ───────── settings ───────── */

type TitleFx = TextEffectName | "scramble" | "none";
type PriceFx = "roll" | "scramble" | "none";
type CartFx = "fly" | "morph" | "drawer";
type Rotator = "off" | "slide" | "blur" | "flip";

interface Prefs {
  layout: GalleryLayout;
  swap: CarouselEffect;
  lightbox: GalleryLightbox;
  hoverZoom: boolean;
  visible: number;
  title: TitleFx;
  price: PriceFx;
  rotator: Rotator;
  shimmer: boolean;
  highlight: boolean;
  page: TransitionEffect;
  cart: CartFx;
  sticky: boolean;
  reveal: RevealStyle;
}

const DEFAULTS: Prefs = {
  layout: "thumbs", swap: "slide", lightbox: "carousel", hoverZoom: true, visible: 4,
  title: "mask", price: "roll", rotator: "slide", shimmer: true, highlight: true,
  page: "circle", cart: "fly", sticky: true, reveal: "rise",
};

const LAYOUTS: [GalleryLayout, string][] = [
  ["thumbs", "Thumbs"], ["thumbs-side", "Side rail"], ["stacked", "Stacked"], ["peek", "Peek"],
  ["coverflow", "Coverflow"], ["cards", "Cards"], ["orbit", "Orbit"],
];
const LAYOUT_NOTES: Record<GalleryLayout, string> = {
  thumbs: "Main image synced with a thumbnail strip; the ring glides between thumbs.",
  "thumbs-side": "Same sync with a vertical rail beside the image (a strip on phones).",
  stacked: "Every image in a grid. “Show more” reveals the rest with a staggered spring.",
  peek: "Swipe slider that shows the edge of the next image, with scaling dots.",
  coverflow: "3D coverflow: drag, flick or use the arrow keys.",
  cards: "A deck: swipe the top image away and it tucks in at the back.",
  orbit: "Thumbnails orbit the product like a ring; picking one opens it with a circle reveal from the planet.",
};

/* ───────── media: eight "shots" of a CSS-drawn product ───────── */

interface Shot { label: string; tilt: number; zoom: number; at?: string; scene?: boolean }
const SHOTS: Shot[] = [
  { label: "Front", tilt: 0, zoom: 1 },
  { label: "Angle", tilt: -12, zoom: 1 },
  { label: "Detail", tilt: 4, zoom: 2.1, at: "50% 38%" },
  { label: "In use", tilt: -6, zoom: 0.82, scene: true },
  { label: "Back", tilt: 10, zoom: 1 },
  { label: "Texture", tilt: 0, zoom: 3.4, at: "42% 58%" },
  { label: "Lifestyle", tilt: 8, zoom: 0.7, scene: true },
  { label: "Scale", tilt: -3, zoom: 0.55 },
];

function ShotArt({ p, s, accent, tag = true }: { p: StoreProduct; s: Shot; accent: string; tag?: boolean }) {
  const bg = s.scene ? `color-mix(in srgb, ${p.bg} 55%, ${accent})` : p.bg;
  return (
    <div className="pd-shot" style={{ background: bg }}>
      <div className="pd-shot-zoom" style={{ transform: `scale(${s.zoom})`, transformOrigin: s.at ?? "50% 50%" }}>
        <StoreArt shape={p.shape} color={p.color} bg={bg} tilt={s.tilt} />
      </div>
      {tag && <span className="pd-shot-tag">{s.label}</span>}
    </div>
  );
}

/* ───────── small motion pieces ───────── */

/** Price that rolls digit by digit, decodes, or just changes. */
function Price({ value, mode, className }: { value: number; mode: PriceFx; className?: string }) {
  const text = money(value);
  if (mode === "scramble") return <ScrambleText className={className} text={text} replay={text} duration={0.5} />;
  if (mode === "none") return <span className={className}>{text}</span>;
  const chars = text.split("");
  return (
    <span className={"pd-roll " + (className ?? "")} aria-label={text}>
      {chars.map((ch, i) => (
        // keyed from the right so the cents stay put while dollars grow
        <span key={chars.length - i} className="pd-roll-slot" aria-hidden="true">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={ch} initial={{ y: "-100%", opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 420, damping: 30, delay: (chars.length - i) * 0.025 }}>{ch}</motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}

function Title({ text, fx, replay }: { text: string; fx: TitleFx; replay: string }) {
  const cls = "st-h1 st-pdp-title";
  if (fx === "none") return <h1 className={cls}>{text}</h1>;
  if (fx === "scramble") return <ScrambleText as="h1" className={cls} text={text} replay={replay} mode="decode" />;
  return <TextEffect as="h1" className={cls} text={text} effect={fx} replay={replay}
    by={fx === "wave" || fx === "drop" || fx === "flip" ? "char" : "word"} />;
}

/** Lead paragraph with its opening phrase highlighted. */
function Blurb({ text, on }: { text: string; on: boolean }) {
  const cut = text.search(/[,.—]/);
  const at = cut > 12 && cut < 70 ? cut : Math.min(text.length, text.indexOf(" ", 28) + 1 || text.length);
  // keep the space outside the highlight so it isn't collapsed
  const head = text.slice(0, at).trimEnd();
  return (
    <p className="st-lead">
      {on ? <Highlight color="color-mix(in srgb, var(--s-accent) 38%, transparent)">{head}</Highlight> : head}
      {text.slice(head.length)}
    </p>
  );
}

/* ───────── page ───────── */

interface Line { id: string; name: string; option: string; qty: number; price: number; color: string; product: StoreProduct }
interface Flight { id: number; x0: number; y0: number; x1: number; y1: number; color: string }

export function PdpPlayground() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [nicheId, setNicheId] = useState<NicheId>("tees");
  const [productId, setProductId] = useState(NICHES.tees.products[0].id);
  const [dockOpen, setDockOpen] = useState(false);
  const [tab, setTab] = useState<"media" | "text" | "motion" | "product">("media");
  const set = <K extends keyof Prefs>(k: K) => (v: Prefs[K]) => setPrefs(p => ({ ...p, [k]: v }));
  const n = NICHES[nicheId];

  const switchNiche = (id: NicheId) => { setNicheId(id); setProductId(NICHES[id].products[0].id); };

  return (
    <div className="sd-shell">
      <Pdp key={nicheId} nicheId={nicheId} productId={productId} setProductId={setProductId} prefs={prefs} />

      <div className={"sd-dock pd-dock" + (dockOpen ? "" : " is-collapsed")} role="region" aria-label="Playground settings">
        <button className="sd-dock-toggle" aria-expanded={dockOpen} onClick={() => setDockOpen(o => !o)}>
          {dockOpen ? "Hide" : "✦ Customize motion"}
        </button>
        {dockOpen && (
          <div className="sd-dock-body">
            <div className="sd-tabs" role="tablist" aria-label="Settings">
              {(["media", "text", "motion", "product"] as const).map(t => (
                <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
            <div className="sd-panel" role="tabpanel" aria-label={tab}>
              {tab === "media" && <>
                <Seg label="Gallery" value={prefs.layout} options={LAYOUTS.map(l => l[0])} onChange={set("layout")}
                  names={v => LAYOUTS.find(l => l[0] === v)![1]} />
                <p className="sd-hint">{LAYOUT_NOTES[prefs.layout]}</p>
                {(prefs.layout === "thumbs" || prefs.layout === "thumbs-side") && (
                  <Seg label="Image swap" value={prefs.swap} options={["slide", "fade", "scale", "parallax", "cards", "coverflow"] as CarouselEffect[]} onChange={set("swap")} />
                )}
                {prefs.layout === "stacked" && (
                  <Seg label="Shown before “more”" value={prefs.visible} options={[2, 3, 4, 6]} onChange={set("visible")} />
                )}
                <Seg label="Lightbox" value={prefs.lightbox} options={["carousel", "zoom", "none"] as GalleryLightbox[]} onChange={set("lightbox")}
                  names={v => ({ carousel: "Full viewer", zoom: "Zoom", none: "Off" })[v]} />
                <Seg label="Hover magnify" value={prefs.hoverZoom ? "on" : "off"} options={["on", "off"]} onChange={v => set("hoverZoom")(v === "on")} />
              </>}
              {tab === "text" && <>
                <Seg label="Title" value={prefs.title} options={["mask", "rise", "blur", "track", "flip", "wave", "drop", "fade", "scramble", "none"] as TitleFx[]} onChange={set("title")} />
                <Seg label="Price" value={prefs.price} options={["roll", "scramble", "none"] as PriceFx[]} onChange={set("price")} />
                <Seg label="Perk ticker" value={prefs.rotator} options={["slide", "blur", "flip", "off"] as Rotator[]} onChange={set("rotator")} />
                <Seg label="Button shimmer" value={prefs.shimmer ? "on" : "off"} options={["on", "off"]} onChange={v => set("shimmer")(v === "on")} />
                <Seg label="Highlight lead" value={prefs.highlight ? "on" : "off"} options={["on", "off"]} onChange={v => set("highlight")(v === "on")} />
                <p className="sd-hint">Change quantity or the purchase type to watch the price animate.</p>
              </>}
              {tab === "motion" && <>
                <Seg label="Product to product" value={prefs.page}
                  options={["circle", "diamond", "wipe", "split", "slide", "stack", "flip", "zoom", "blur", "blinds", "fade"] as TransitionEffect[]} onChange={set("page")} />
                <Seg label="Add to cart" value={prefs.cart} options={["fly", "morph", "drawer"] as CartFx[]} onChange={set("cart")}
                  names={v => ({ fly: "Fly to cart", morph: "Button morph", drawer: "Cart drawer" })[v]} />
                <Seg label="Sticky buy bar" value={prefs.sticky ? "on" : "off"} options={["on", "off"]} onChange={v => set("sticky")(v === "on")} />
                <Seg label="Section reveal" value={prefs.reveal} options={["rise", "fade", "slide", "zoom", "blur", "mask", "off"] as RevealStyle[]} onChange={set("reveal")} />
                <p className="sd-hint">Open a product under “You may also like”: circle and diamond grow from the card you tapped.</p>
              </>}
              {tab === "product" && <>
                <Seg label="Store" value={nicheId} options={Object.keys(NICHES) as NicheId[]} onChange={switchNiche} names={id => NICHES[id].label} />
                <Seg label="Product" value={productId} options={n.products.slice(0, 6).map(p => p.id)} onChange={setProductId}
                  names={id => n.products.find(p => p.id === id)!.name} />
                <button className="sd-tour" onClick={() => setPrefs(DEFAULTS)}>Reset all</button>
              </>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Pdp({ nicheId, productId, setProductId, prefs }: {
  nicheId: NicheId; productId: string; setProductId: (id: string) => void; prefs: Prefs;
}) {
  const n = NICHES[nicheId];
  const th = n.theme;
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [dir, setDir] = useState<1 | -1>(1);
  const [lines, setLines] = useState<Line[]>([]);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [bump, setBump] = useState(0);
  const [drawer, setDrawer] = useState(false);
  const [stuck, setStuck] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const cartRef = useRef<HTMLButtonElement>(null);

  const open = (id: string, e?: MouseEvent) => {
    if (id === productId) return;
    const stage = stageRef.current?.getBoundingClientRect();
    if (e && stage) {
      const b = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setOrigin({ x: b.left + b.width / 2 - stage.left, y: b.top + b.height / 2 - stage.top });
    } else setOrigin(null);
    const ids = n.products.map(p => p.id);
    setDir(ids.indexOf(id) >= ids.indexOf(productId) ? 1 : -1);
    setStuck(false);
    setProductId(id);
  };

  const add = (p: StoreProduct, option: string, qty: number, price: number, from: HTMLElement) => {
    setLines(ls => {
      const hit = ls.find(l => l.id === p.id && l.option === option);
      return hit ? ls.map(l => (l === hit ? { ...l, qty: l.qty + qty } : l))
        : [...ls, { id: p.id, name: p.name, option, qty, price, color: p.color, product: p }];
    });
    if (prefs.cart === "drawer") { setDrawer(true); return; }
    if (prefs.cart === "fly") {
      const a = from.getBoundingClientRect(), b = cartRef.current?.getBoundingClientRect();
      if (b) setFlights(f => [...f, { id: Date.now(), x0: a.left + a.width / 2, y0: a.top + a.height / 2, x1: b.left + b.width / 2, y1: b.top + b.height / 2, color: p.color }]);
      return;
    }
    setBump(b => b + 1);
  };

  const count = lines.reduce((s, l) => s + l.qty, 0);
  const themeVars = {
    "--s-bg": th.bg, "--s-surface": th.surface, "--s-text": th.text, "--s-muted": th.muted, "--s-line": th.line,
    "--s-accent": th.accent, "--s-accent-text": th.accentText, "--s-radius": th.radius,
    "--s-display": th.display, "--s-body": th.body, "--s-case": th.displayCase, "--s-weight": th.displayWeight,
  } as CSSProperties;

  return (
    <div className="st-site pd-site" style={themeVars} data-niche={nicheId}>
      <header className="st-header pd-header">
        <span className="st-logo">{n.brand}</span>
        <span className="pd-header-tag">PDP playground</span>
        <div className="st-header-icons">
          <motion.button ref={cartRef} key={bump} className="st-cart-btn" aria-label={`Cart, ${count} items`}
            animate={bump ? { scale: [1, 1.3, 0.9, 1], rotate: [0, -10, 8, 0] } : undefined} transition={{ duration: 0.5 }}
            onClick={() => setDrawer(true)}>
            <Icon name="cart" />
            {count > 0 && <span className="st-cart-count">{count}</span>}
          </motion.button>
        </div>
      </header>

      <div ref={stageRef} className="st-stage-wrap">
        <AnimatePresence>
          {prefs.sticky && stuck && (
            <StickyBar key="sticky" p={n.products.find(p => p.id === productId)!} prefs={prefs}
              onTop={() => stageRef.current?.querySelector(".pt-page:last-child")?.scrollTo({ top: 0, behavior: "smooth" })} />
          )}
        </AnimatePresence>
        <MotionPrefsProvider value={{ ...DEFAULT_PREFS, reveal: prefs.reveal }}>
          <PageTransition className="st-stage" pageKey={productId} effect={prefs.page} direction={dir} origin={origin}
            accent={th.accent} duration={0.75}>
            <ProductView key={productId} n={n} id={productId} prefs={prefs} onOpen={open} onAdd={add} onStuck={setStuck} />
          </PageTransition>
        </MotionPrefsProvider>
      </div>

      {flights.map(f => (
        <motion.span key={f.id} className="pd-flight" style={{ background: f.color }}
          initial={{ x: f.x0, y: f.y0, scale: 1 }}
          animate={{ x: [f.x0, (f.x0 + f.x1) / 2, f.x1], y: [f.y0, Math.min(f.y0, f.y1) - 140, f.y1], scale: [1, 1.4, 0.35] }}
          transition={{ duration: 0.8, ease: [0.5, 0, 0.3, 1], times: [0, 0.45, 1] }}
          onAnimationComplete={() => { setFlights(fs => fs.filter(x => x.id !== f.id)); setBump(b => b + 1); }} />
      ))}

      <AnimatePresence>
        {drawer && <CartDrawer key="cart" lines={lines} setLines={setLines} onClose={() => setDrawer(false)} freeOver={n.freeShippingOver} />}
      </AnimatePresence>
    </div>
  );
}

function ProductView({ n, id, prefs, onOpen, onAdd, onStuck }: {
  n: (typeof NICHES)[NicheId]; id: string; prefs: Prefs;
  onOpen: (id: string, e?: MouseEvent) => void;
  onAdd: (p: StoreProduct, option: string, qty: number, price: number, from: HTMLElement) => void;
  onStuck: (v: boolean) => void;
}) {
  const p = n.products.find(x => x.id === id) ?? n.products[0];
  const c = n.collections.find(x => x.id === p.collection) ?? n.collections[0];
  const [option, setOption] = useState(p.option.values[0]);
  const [qty, setQty] = useState(1);
  const [subscribe, setSubscribe] = useState(n.id !== "tees");
  const [added, setAdded] = useState(false);
  const buyRef = useRef<HTMLDivElement>(null);
  const subs = n.id !== "tees";
  const unit = subscribe && subs ? p.price * 0.8 : p.price;
  const related = [...n.products.filter(x => x.id !== p.id && x.collection === p.collection), ...n.products.filter(x => x.collection !== p.collection)].slice(0, 4);
  const idx = n.products.indexOf(p);
  const prev = n.products[(idx - 1 + n.products.length) % n.products.length];
  const next = n.products[(idx + 1) % n.products.length];

  // the sticky bar appears once the buy row has scrolled up out of view
  useEffect(() => {
    const el = buyRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => onStuck(!e.isIntersecting && e.boundingClientRect.top < 0));
    io.observe(el);
    return () => { io.disconnect(); onStuck(false); };
  }, [onStuck]);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1700);
    return () => clearTimeout(t);
  }, [added]);

  const buy = (e: MouseEvent<HTMLButtonElement>) => {
    onAdd(p, option, qty, unit, e.currentTarget);
    if (prefs.cart === "morph") setAdded(true);
  };
  const cta: ReactNode = <>{prefs.shimmer ? <Shimmer>Add to cart</Shimmer> : "Add to cart"} · <Price value={unit * qty} mode={prefs.price} /></>;
  const replay = p.id + prefs.title;

  return (
    <div className="st-page pd-page">
      <nav className="st-crumbs pd-crumbs" aria-label="Product">
        <span>{n.brand} / {c.name}</span>
        <span className="pd-prevnext">
          <button onClick={e => onOpen(prev.id, e)} aria-label={`Previous product: ${prev.name}`}>← {prev.name}</button>
          <button onClick={e => onOpen(next.id, e)} aria-label={`Next product: ${next.name}`}>{next.name} →</button>
        </span>
      </nav>

      <section className="st-pdp">
        <div className="pd-gallery">
          <MediaGallery key={prefs.layout} items={SHOTS} layout={prefs.layout} effect={prefs.swap} lightbox={prefs.lightbox}
            hoverZoom={prefs.hoverZoom} visible={prefs.visible} label={`${p.name} images`}
            render={s => <ShotArt p={p} s={s} accent={n.theme.accent} />}
            renderThumb={s => <ShotArt p={p} s={s} accent={n.theme.accent} tag={false} />}
            overlay={p.badge ? <span className="st-badge">{p.badge}</span> : undefined} />
        </div>

        <div className="st-pdp-info">
          {prefs.rotator !== "off" && (
            <span className="pd-perk"><Icon name="spark" />
              <RotatingText key={prefs.rotator} effect={prefs.rotator}
                words={[`Free shipping over ${money(n.freeShippingOver)}`, "30-day guarantee", `${p.rating.toFixed(1)}★ from ${p.reviews.toLocaleString()} reviews`, "Ships in 24 hours"]} />
            </span>
          )}
          <span className="st-kicker">{c.name}</span>
          <Title text={p.name} fx={prefs.title} replay={replay} />
          <Stars rating={p.rating} count={p.reviews} />
          <p className="st-pdp-price">
            <Price value={unit} mode={prefs.price} />
            {(p.compareAt || unit < p.price) && <s>{money(p.compareAt ?? p.price)}</s>}
          </p>
          <Blurb text={p.blurb} on={prefs.highlight} />

          <fieldset className="st-options">
            <legend>{p.option.label}: <b>{option}</b></legend>
            {p.option.values.map(v => (
              <button key={v} className="st-chip pd-chip" aria-pressed={v === option} onClick={() => setOption(v)}>
                {v === option && <motion.span layoutId="pd-chip" className="pd-chip-bg" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
                <span>{v}</span>
              </button>
            ))}
          </fieldset>

          {subs && (
            <div className="st-purchase" role="radiogroup" aria-label="Purchase type">
              <button role="radio" aria-checked={!subscribe} onClick={() => setSubscribe(false)}>
                <span>One-time purchase</span><b>{money(p.price)}</b></button>
              <button role="radio" aria-checked={subscribe} onClick={() => setSubscribe(true)}>
                <span>Subscribe & save 20%<small>Delivered monthly · cancel anytime</small></span><b>{money(p.price * 0.8)}</b></button>
            </div>
          )}

          <div className="st-buy" ref={buyRef}>
            <div className="st-qty" aria-label="Quantity">
              <button aria-label="Decrease quantity" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <span aria-live="polite">{qty}</span>
              <button aria-label="Increase quantity" onClick={() => setQty(q => q + 1)}>+</button>
            </div>
            <motion.button layout className={"st-btn st-btn-lg st-grow pd-cta" + (added ? " is-added" : "")} onClick={buy}
              transition={{ type: "spring", stiffness: 500, damping: 34 }}>
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span key={added ? "added" : "add"} className="pd-cta-label"
                  initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -18, opacity: 0 }}>
                  {added ? <><Icon name="check" /> Added to cart</> : cta}
                </motion.span>
              </AnimatePresence>
            </motion.button>
          </div>

          <ul className="st-trust">
            <li><Icon name="truck" /> Free shipping over {money(n.freeShippingOver)}</li>
            <li><Icon name="shield" /> 30-day guarantee</li>
            <li><Icon name="leaf" /> Responsibly made</li>
          </ul>
          <Accordion items={n.product.details} />
        </div>
      </section>

      <section className="st-section">
        <div className="st-sec-head"><div><span className="st-kicker">Benefits</span>
          <TextEffect as="h2" className="st-h2" text={n.product.benefitsTitle} effect="rise" trigger="inView" /></div></div>
        <Reveal as="div" stagger className="st-benefits">
          {n.product.benefits.map((b, i) => (
            <RevealItem key={b.title} className="st-benefit">
              <span className="st-benefit-num">0{i + 1}</span><h3>{b.title}</h3><p>{b.text}</p>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <Reveal className="st-section">
        <div className="st-sec-head"><div><span className="st-kicker">Reviews</span>
          <h2 className="st-h2">{p.rating.toFixed(1)} out of 5</h2></div></div>
        <Reveal as="div" stagger className="pd-quotes">
          {n.testimonials.map(t => (
            <RevealItem key={t.name} className="st-quote"><Stars rating={5} /><blockquote>“{t.quote}”</blockquote>
              <figcaption><b>{t.name}</b><span className="st-muted"> · Verified buyer</span></figcaption></RevealItem>
          ))}
        </Reveal>
      </Reveal>

      <section className="st-section pd-related">
        <div className="st-sec-head"><div><span className="st-kicker">Pairs well with</span><h2 className="st-h2">You may also like</h2></div></div>
        <Reveal as="div" stagger className="pd-related-grid">
          {related.map(r => (
            <RevealItem key={r.id} className="st-card">
              <button className="st-card-media" onClick={e => onOpen(r.id, e)} aria-label={`View ${r.name}`}>
                <StoreArt shape={r.shape} color={r.color} bg={r.bg} />
                {r.badge && <span className="st-badge">{r.badge}</span>}
              </button>
              <div className="st-card-body">
                <button className="st-card-title" onClick={e => onOpen(r.id, e)}>{r.name}</button>
                <span className="st-price">{money(r.price)}</span>
              </div>
            </RevealItem>
          ))}
        </Reveal>
      </section>
    </div>
  );
}

function StickyBar({ p, prefs, onTop }: { p: StoreProduct; prefs: Prefs; onTop: () => void }) {
  return (
    <motion.div className="pd-sticky" initial={{ y: "-110%" }} animate={{ y: 0 }} exit={{ y: "-110%" }}
      transition={{ type: "spring", stiffness: 420, damping: 38 }}>
      <span className="pd-sticky-art"><StoreArt shape={p.shape} color={p.color} bg={p.bg} /></span>
      <span className="pd-sticky-name">{p.name}</span>
      <span className="pd-sticky-price"><Price value={p.price} mode={prefs.price} /></span>
      <button className="st-btn st-btn-sm" onClick={onTop}>Choose options</button>
    </motion.div>
  );
}

function CartDrawer({ lines, setLines, onClose, freeOver }: {
  lines: Line[]; setLines: (fn: (l: Line[]) => Line[]) => void; onClose: () => void; freeOver: number;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const left = Math.max(0, freeOver - total);
  return (
    <>
      <motion.div className="st-menu-scrim" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="pd-drawer" role="dialog" aria-modal="true" aria-label="Cart"
        initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 360, damping: 38 }}>
        <div className="st-menu-head"><b className="pd-drawer-title">Your cart</b>
          <button ref={closeRef} className="st-menu-x" aria-label="Close cart" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        </div>
        <div className="pd-ship">
          <span>{left > 0 ? <>{money(left)} away from free shipping</> : <>You’ve unlocked free shipping</>}</span>
          <span className="st-bar"><motion.span animate={{ width: `${Math.min(100, (total / freeOver) * 100)}%` }} transition={{ type: "spring", stiffness: 120, damping: 20 }} /></span>
        </div>
        {lines.length === 0 ? <p className="st-muted">Your cart is empty.</p> : (
          <motion.ul className="pd-lines" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } } }}>
            <AnimatePresence initial={false}>
              {lines.map(l => (
                <motion.li key={l.id + l.option} layout variants={{ hidden: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0 } }}
                  exit={{ opacity: 0, x: 40, transition: { duration: 0.2 } }}>
                  <span className="pd-line-art"><StoreArt shape={l.product.shape} color={l.product.color} bg={l.product.bg} /></span>
                  <span className="pd-line-info"><b>{l.name}</b><span className="st-muted">{l.option} · ×{l.qty}</span></span>
                  <span className="pd-line-price">{money(l.price * l.qty)}</span>
                  <button className="pd-line-x" aria-label={`Remove ${l.name}`} onClick={() => setLines(ls => ls.filter(x => x !== l))}>×</button>
                </motion.li>
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
        <div className="pd-drawer-foot">
          <span>Subtotal</span><b><Price value={total} mode="roll" /></b>
          <button className="st-btn st-btn-lg pd-checkout">Checkout</button>
        </div>
      </motion.aside>
    </>
  );
}

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
