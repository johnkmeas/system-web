import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { motion } from "motion/react";
import { Carousel, CarouselArrows, CarouselAutoplay, CarouselThumbs, useCarousel } from "../../patterns";
import type { Niche, Shape, StoreProduct } from "./niches";
import { AnimatedGrid, CountUp, HoverCard, Marquee, Reveal, RevealItem, Shelf, useMotionPrefs, useParallax } from "./motion";
import { Accordion, Icon, money, Stars, StoreArt } from "./ui";

export type Route =
  | { page: "home" }
  | { page: "collection"; id: string }
  | { page: "product"; id: string }
  | { page: "cart" }
  | { page: "about" }
  | { page: "faq" };

export interface CartLine { id: string; option: string; qty: number; price: number; plan?: string }

export interface StoreCtx {
  niche: Niche;
  nav: (to: Route, e?: MouseEvent) => void;
  cart: CartLine[];
  addToCart: (p: StoreProduct, option: string, qty?: number, price?: number, plan?: string) => void;
  setQty: (id: string, option: string, qty: number) => void;
}

const find = (n: Niche, id: string) => n.products.find(p => p.id === id) ?? n.products[0];
/** True for backgrounds dark enough to need light text. */
const isDark = (hex: string) => {
  const v = parseInt(hex.slice(1), 16);
  return 0.299 * (v >> 16) + 0.587 * ((v >> 8) & 255) + 0.114 * (v & 255) < 128;
};

/* ───────── Shared sections ───────── */

function ProductCard({ p, ctx }: { p: StoreProduct; ctx: StoreCtx }) {
  return (
    <HoverCard className="st-card-wrap"><article className="st-card">
      <button className="st-card-media" onClick={e => ctx.nav({ page: "product", id: p.id }, e)} aria-label={`View ${p.name}`}>
        <StoreArt shape={p.shape} color={p.color} bg={p.bg} />
        {p.badge && <span className="st-badge">{p.badge}</span>}
      </button>
      <div className="st-card-body">
        <button className="st-card-title" onClick={e => ctx.nav({ page: "product", id: p.id }, e)}>{p.name}</button>
        <Stars rating={p.rating} count={p.reviews} />
        <div className="st-card-foot">
          <span className="st-price">{money(p.price)}{p.compareAt && <s>{money(p.compareAt)}</s>}</span>
          <button className="st-btn st-btn-sm" onClick={() => ctx.addToCart(p, p.option.values[0])}>Add</button>
        </div>
      </div>
    </article></HoverCard>
  );
}

/** Products as a grid or a slider, per the Motion settings. */
function ProductShelf({ products, ctx, kicker, title, action }: {
  products: StoreProduct[]; ctx: StoreCtx; kicker?: string; title: string; action?: ReactNode;
}) {
  return (
    <section className="st-section">
      <Shelf items={products} label={title} gridClass="st-grid"
        head={arrows => <SectionHead kicker={kicker} title={title} action={<div className="st-head-actions">{action}{arrows}</div>} />}
        render={p => <ProductCard p={p} ctx={ctx} />} />
    </section>
  );
}

/** Art whose product drifts against the scroll. */
function ParallaxArt({ shape, color, bg, tilt, className, strength }: {
  shape: Shape; color: string; bg: string; tilt?: number; className?: string; strength?: number;
}) {
  const [ref, y] = useParallax<HTMLDivElement>(strength);
  return <StoreArt ref={ref} shape={shape} color={color} bg={bg} tilt={tilt} className={className} floatY={y} />;
}

/** Full-bleed ticker band in the accent colour. */
function Ticker({ n, reverse }: { n: Niche; reverse?: boolean }) {
  const words = [...n.usps.map(u => u.title), ...n.collections.map(c => c.name)];
  return (
    <Marquee className="st-ticker" reverse={reverse}>
      {words.map(w => <span key={w} className="st-ticker-item">{w}<span aria-hidden="true" className="st-ticker-dot">✦</span></span>)}
    </Marquee>
  );
}

function SectionHead({ kicker, title, action }: { kicker?: string; title: string; action?: ReactNode }) {
  return (
    <div className="st-sec-head">
      <div>{kicker && <span className="st-kicker">{kicker}</span>}<h2 className="st-h2">{title}</h2></div>
      {action}
    </div>
  );
}

function Usps({ n }: { n: Niche }) {
  const icons = ["leaf", "spark", "truck", "shield"] as const;
  return (
    <Reveal stagger className="st-usps">
      {n.usps.map((u, i) => (
        <RevealItem key={u.title} className="st-usp"><span className="st-usp-icon"><Icon name={icons[i % 4]} /></span>
          <div><h3>{u.title}</h3><p>{u.text}</p></div></RevealItem>
      ))}
    </Reveal>
  );
}

function Testimonials({ n }: { n: Niche }) {
  const { sections, autoplay } = useMotionPrefs();
  if (sections === "slider") return <QuoteSlider key={autoplay} n={n} />;
  return (
    <section className="st-section">
      <SectionHead kicker="Reviews" title="Loved by thousands" />
      <Reveal as="div" stagger className="st-quotes">
        {n.testimonials.map(t => (
          <RevealItem as="figure" key={t.name} className="st-quote">
            <Stars rating={5} />
            <blockquote>“{t.quote}”</blockquote>
            <figcaption><b>{t.name}</b><span className="st-muted"> · {t.detail}</span></figcaption>
          </RevealItem>
        ))}
      </Reveal>
    </section>
  );
}

/** One big quote at a time, crossfading, with autoplay bars and a synced avatar rail. */
function QuoteSlider({ n }: { n: Niche }) {
  const { autoplay } = useMotionPrefs();
  const api = useCarousel({ count: n.testimonials.length, loop: true, autoplay: autoplay || 0 });
  return (
    <Reveal className="st-quote-slider">
      <span className="st-kicker">Reviews · Loved by thousands</span>
      <Carousel api={api} items={n.testimonials} effect="fade" itemSize={1} gap={0} height={260} label="Customer reviews"
        renderItem={t => (
          <figure className="st-big-quote">
            <Stars rating={5} />
            <blockquote>“{t.quote}”</blockquote>
            <figcaption><b>{t.name}</b><span> · {t.detail}</span></figcaption>
          </figure>
        )} />
      <div className="st-quote-foot">
        <div className="st-quote-people">
          {n.testimonials.map((t, i) => (
            <button key={t.name} aria-label={`Show review from ${t.name}`} aria-pressed={i === api.index} onClick={() => api.go(i)}>
              {t.name.split(" ").map(w => w[0]).join("")}
              {i === api.index && <motion.span layoutId={"qp-" + n.id} className="st-quote-ring" />}
            </button>
          ))}
        </div>
        {autoplay > 0 ? <CarouselAutoplay api={api} /> : <CarouselArrows api={api} />}
      </div>
    </Reveal>
  );
}

function Steps({ n }: { n: Niche }) {
  return (
    <section className="st-section">
      <SectionHead kicker="Simple" title={n.stepsTitle} />
      <Reveal as="ol" stagger className="st-steps">
        {n.steps.map((s, i) => (
          <RevealItem as="li" key={s.title}><span className="st-step-num">{i + 1}</span><h3>{s.title}</h3><p>{s.text}</p></RevealItem>
        ))}
      </Reveal>
    </section>
  );
}

function Newsletter({ n }: { n: Niche }) {
  const [done, setDone] = useState(false);
  return (
    <Reveal className="st-newsletter">
      <div><h2 className="st-h2">{n.newsletter.title}</h2><p>{n.newsletter.text}</p></div>
      {done ? <p className="st-ok"><Icon name="check" /> You're on the list.</p> : (
        <form className="st-news-form" onSubmit={e => { e.preventDefault(); setDone(true); }}>
          <label className="st-sr" htmlFor={"nl-" + n.id}>Email</label>
          <input id={"nl-" + n.id} type="email" required placeholder="you@email.com" />
          <button className="st-btn">Subscribe</button>
        </form>
      )}
    </Reveal>
  );
}

function Footer({ ctx }: { ctx: StoreCtx }) {
  const n = ctx.niche;
  return (
    <footer className="st-footer">
      <div className="st-foot-brand"><span className="st-logo">{n.brand}</span><p>{n.footerBlurb}</p></div>
      <nav aria-label="Shop"><h3>Shop</h3>
        {n.collections.map(c => <button key={c.id} onClick={e => ctx.nav({ page: "collection", id: c.id }, e)}>{c.name}</button>)}
      </nav>
      <nav aria-label="Help"><h3>Help</h3>
        <button onClick={e => ctx.nav({ page: "faq" }, e)}>FAQ</button>
        <button onClick={e => ctx.nav({ page: "faq" }, e)}>Shipping & returns</button>
        <button onClick={e => ctx.nav({ page: "cart" }, e)}>Your cart</button>
      </nav>
      <nav aria-label="Company"><h3>Company</h3>
        <button onClick={e => ctx.nav({ page: "about" }, e)}>About us</button>
        <button onClick={e => ctx.nav({ page: "about" }, e)}>Sustainability</button>
        <button onClick={e => ctx.nav({ page: "faq" }, e)}>Contact</button>
      </nav>
      <p className="st-foot-legal">© 2026 {n.brand}. Demo store, not a real shop.</p>
    </footer>
  );
}

function Crumbs({ items, ctx }: { items: [string, Route | null][]; ctx: StoreCtx }) {
  return (
    <nav className="st-crumbs" aria-label="Breadcrumb">
      {items.map(([label, to], i) => (
        <span key={label}>
          {i > 0 && <span aria-hidden="true"> / </span>}
          {to ? <button onClick={e => ctx.nav(to, e)}>{label}</button> : <span aria-current="page">{label}</span>}
        </span>
      ))}
    </nav>
  );
}

function Page({ ctx, children }: { ctx: StoreCtx; children: ReactNode }) {
  const n = ctx.niche;
  return (
    <div className="st-page">
      {children}
      <Marquee className="st-bigtype" label={n.brand}>
        {[n.brand, n.hero.cta, n.brand, n.newsletter.title].map((w, i) => (
          <span key={i} className={i % 2 ? "is-outline" : undefined}>{w}<span aria-hidden="true"> ✦ </span></span>
        ))}
      </Marquee>
      <Newsletter n={n} />
      <Footer ctx={ctx} />
    </div>
  );
}

/* ───────── Home ───────── */

export function HomePage({ ctx }: { ctx: StoreCtx }) {
  const n = ctx.niche;
  return (
    <Page ctx={ctx}>
      <section className="st-hero">
        <div className="st-hero-copy">
          <span className="st-kicker">{n.hero.kicker}</span>
          <h1 className="st-h1">{n.hero.title}</h1>
          <p className="st-lead">{n.hero.text}</p>
          <div className="st-actions">
            <button className="st-btn st-btn-lg" onClick={e => ctx.nav({ page: "collection", id: n.collections[0].id }, e)}>{n.hero.cta}</button>
            <button className="st-btn st-btn-ghost st-btn-lg" onClick={e => ctx.nav({ page: "about" }, e)}>{n.hero.secondary}</button>
          </div>
          <Stars rating={4.8} count={12480} />
        </div>
        <motion.div className="st-hero-media" initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.2, 0.7, 0.2, 1] }}>
          <ParallaxArt shape={n.hero.shape} color={n.hero.color} bg={n.hero.bg} tilt={-6} />
        </motion.div>
      </section>

      <Ticker n={n} />
      <Usps n={n} />

      <section className="st-section">
        <SectionHead kicker="Collections" title="Shop by category" />
        <Reveal as="div" stagger className="st-tiles">
          {n.collections.map(c => (
            <RevealItem key={c.id}>
              <HoverCard className="st-tile-wrap">
                <button className={"st-tile" + (isDark(c.bg) ? " is-dark" : "")} onClick={e => ctx.nav({ page: "collection", id: c.id }, e)}>
                  <ParallaxArt shape={c.shape} color={c.color} bg={c.bg} strength={30} />
                  <span className="st-tile-text"><b>{c.name}</b><span>{c.blurb}</span></span>
                </button>
              </HoverCard>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <ProductShelf products={n.products.slice(0, 8)} ctx={ctx} kicker="Bestsellers" title="Most loved right now"
        action={<button className="st-link" onClick={e => ctx.nav({ page: "collection", id: n.collections[0].id }, e)}>View all →</button>} />

      <section className="st-split">
        <ParallaxArt shape={n.story.shape} color={n.story.color} bg={n.story.bg} tilt={8} className="st-split-media" />
        <Reveal as="div" stagger className="st-split-copy">
          <RevealItem><span className="st-kicker">{n.story.kicker}</span></RevealItem>
          <RevealItem><h2 className="st-h2">{n.story.title}</h2></RevealItem>
          <RevealItem><p>{n.story.text}</p></RevealItem>
          <RevealItem><button className="st-btn st-btn-ghost" onClick={e => ctx.nav({ page: "about" }, e)}>{n.story.cta}</button></RevealItem>
        </Reveal>
      </section>

      <Steps n={n} />
      <Testimonials n={n} />

      <section className="st-press" aria-label="As seen in">
        <span className="st-muted">As seen in</span>
        <Marquee className="st-press-track" reverse>
          {n.press.map(p => <span key={p} className="st-press-logo">{p}</span>)}
        </Marquee>
      </section>

      <Reveal className="st-section st-faq-preview">
        <SectionHead kicker="Questions" title="Good to know"
          action={<button className="st-link" onClick={e => ctx.nav({ page: "faq" }, e)}>All FAQs →</button>} />
        <Accordion items={n.faq.slice(0, 3).map(f => [f.q, f.a])} />
      </Reveal>
    </Page>
  );
}

/* ───────── Collection ───────── */

type Sort = "featured" | "low" | "high" | "rating" | "reviews";
type Filter = "all" | "new" | "best" | "sale" | "under" | "top";
type View = "2" | "3" | "4" | "5" | "bento" | "list";
const VIEWS: [View, string][] = [["2", "2"], ["3", "3"], ["4", "4"], ["5", "5"], ["bento", "Bento"], ["list", "List"]];
// Remember the layout between collections, like a real store would.
let lastView: View = "4";

export function CollectionPage({ ctx, id }: { ctx: StoreCtx; id: string }) {
  const n = ctx.niche;
  const c = n.collections.find(x => x.id === id) ?? n.collections[0];
  const [sort, setSort] = useState<Sort>("featured");
  const [filter, setFilter] = useState<Filter>("all");
  const [view, setViewState] = useState<View>(lastView);
  const setView = (v: View) => { lastView = v; setViewState(v); };
  const all = useMemo(() => n.products.filter(p => p.collection === c.id), [n, c.id]);
  const under = useMemo(() => {
    const prices = all.map(p => p.price).sort((a, b) => a - b);
    return Math.ceil(prices[Math.floor(prices.length / 2)] ?? 0);
  }, [all]);
  const filters: [Filter, string, (p: StoreProduct) => boolean][] = [
    ["all", "All", () => true],
    ["new", "New", p => p.badge === "New"],
    ["best", "Bestsellers", p => p.badge === "Bestseller" || p.reviews > 1000],
    ["sale", "On sale", p => !!p.compareAt],
    ["under", `Under ${money(under)}`, p => p.price < under],
    ["top", "4.8★ and up", p => p.rating >= 4.8],
  ];
  const items = useMemo(() => {
    const test = filters.find(f => f[0] === filter)![2];
    const list = all.filter(test);
    if (sort === "low") list.sort((a, b) => a.price - b.price);
    if (sort === "high") list.sort((a, b) => b.price - a.price);
    if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
    if (sort === "reviews") list.sort((a, b) => b.reviews - a.reviews);
    return list;
    // filters is rebuilt each render from `all` and `under`
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, under, filter, sort]);
  const more = n.products.filter(p => p.collection !== c.id).slice(0, 10);

  return (
    <Page ctx={ctx}>
      <Crumbs ctx={ctx} items={[["Home", { page: "home" }], ["Shop", null], [c.name, null]]} />
      <section className={"st-col-hero" + (isDark(c.bg) ? " is-dark" : "")} style={{ background: c.bg }}>
        <div>
          <span className="st-kicker">Collection</span>
          <h1 className="st-h1">{c.name}</h1>
          <p className="st-lead">{c.blurb}</p>
          <span className="st-muted">{n.products.filter(p => p.collection === c.id).length} products</span>
        </div>
        <ParallaxArt shape={c.shape} color={c.color} bg={c.bg} tilt={-8} className="st-col-art" />
      </section>

      <div className="st-col-tabs" role="group" aria-label="Collections">
        {n.collections.map(x => (
          <button key={x.id} className="st-chip" aria-pressed={x.id === c.id}
            onClick={e => x.id !== c.id && ctx.nav({ page: "collection", id: x.id }, e)}>{x.name}</button>
        ))}
      </div>

      <div className="st-toolbar">
        <div className="st-filters" role="group" aria-label="Filter products">
          {filters.map(([fid, label, test]) => (
            <button key={fid} className="st-filter" aria-pressed={filter === fid} onClick={() => setFilter(fid)}>
              {filter === fid && <motion.span layoutId={"st-filter-" + n.id} className="st-filter-pill" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
              <span>{label} <small>{all.filter(test).length}</small></span>
            </button>
          ))}
        </div>
        <div className="st-toolbar-end">
          <div className="st-views" role="group" aria-label="Grid layout">
            {VIEWS.map(([v, label]) => (
              <button key={v} aria-pressed={view === v} onClick={() => setView(v)} title={/\d/.test(v) ? `${v} columns` : label}>{label}</button>
            ))}
          </div>
          <label className="st-sort"><span className="st-sr">Sort</span>
            <select value={sort} onChange={e => setSort(e.target.value as Sort)}>
              <option value="featured">Featured</option><option value="low">Price: low to high</option>
              <option value="high">Price: high to low</option><option value="rating">Top rated</option>
              <option value="reviews">Most reviewed</option>
            </select>
          </label>
        </div>
      </div>
      <p className="st-count" aria-live="polite">Showing {items.length} of {all.length}</p>

      {items.length ? (
        <AnimatedGrid items={items} keyOf={p => p.id} className={"st-grid st-pgrid is-" + view}
          itemClass={(_, i) => (view === "bento" && i % 7 === 0 ? "is-big" : undefined)}
          render={p => <ProductCard p={p} ctx={ctx} />} />
      ) : <p className="st-empty">Nothing matches that filter. <button className="st-link" onClick={() => setFilter("all")}>Show all</button></p>}

      <Reveal className="st-banner" style={{ background: n.theme.accent, color: n.theme.accentText }}>
        <div><h2 className="st-h2">{n.announcement.split("·")[0].trim()}</h2><p>{n.usps[2].text}</p></div>
        <button className="st-btn st-btn-invert" onClick={e => ctx.nav({ page: "faq" }, e)}>Learn more</button>
      </Reveal>

      <ProductShelf products={more} ctx={ctx} kicker={n.brand} title="You might also like" />

      <Ticker n={n} reverse />
      <Usps n={n} />

      <Reveal className="st-seo">
        <h2 className="st-h3">About {c.name.toLowerCase()}</h2>
        <p>{c.blurb} {n.about.text} {n.about.paragraphs[0]}</p>
      </Reveal>
    </Page>
  );
}

/* ───────── Product ───────── */

export function ProductPage({ ctx, id }: { ctx: StoreCtx; id: string }) {
  const n = ctx.niche;
  const p = find(n, id);
  const c = n.collections.find(x => x.id === p.collection) ?? n.collections[0];
  const [option, setOption] = useState(p.option.values[0]);
  const [qty, setQty] = useState(1);
  const [subscribe, setSubscribe] = useState(n.id !== "tees");
  const views = [0, -10, 12, -4].map((tilt, i) => ({ tilt, i }));
  const gallery = useCarousel({ count: views.length, loop: true });
  const price = subscribe && n.id !== "tees" ? p.price * 0.8 : p.price;
  const related = [
    ...n.products.filter(x => x.id !== p.id && x.collection === p.collection),
    ...n.products.filter(x => x.collection !== p.collection),
  ].slice(0, 10);

  return (
    <Page ctx={ctx}>
      <Crumbs ctx={ctx} items={[["Home", { page: "home" }], [c.name, { page: "collection", id: c.id }], [p.name, null]]} />
      <section className="st-pdp">
        <div className="st-pdp-gallery">
          <div className="st-pdp-main">
            <Carousel api={gallery} items={views} effect="fade" itemSize={1} gap={0} height="100%" label={`${p.name} images`}
              renderItem={v => <StoreArt shape={p.shape} color={p.color} bg={p.bg} tilt={v.tilt}
                style={{ backgroundPosition: `${v.i * 30}% 50%` }} />} />
            {p.badge && <span className="st-badge">{p.badge}</span>}
            <div className="st-pdp-arrows"><CarouselArrows api={gallery} /></div>
          </div>
          <CarouselThumbs api={gallery} items={views} className="st-thumbs"
            renderThumb={v => <StoreArt shape={p.shape} color={p.color} bg={p.bg} tilt={v.tilt} />} />
        </div>

        <div className="st-pdp-info">
          <span className="st-kicker">{c.name}</span>
          <h1 className="st-h1 st-pdp-title">{p.name}</h1>
          <Stars rating={p.rating} count={p.reviews} />
          <p className="st-pdp-price">{money(price)}{(p.compareAt || price < p.price) && <s>{money(p.compareAt ?? p.price)}</s>}</p>
          <p className="st-lead">{p.blurb}</p>

          <fieldset className="st-options">
            <legend>{p.option.label}: <b>{option}</b></legend>
            {p.option.values.map(v => (
              <button key={v} className="st-chip" aria-pressed={v === option} onClick={() => setOption(v)}>{v}</button>
            ))}
          </fieldset>

          {n.id !== "tees" && (
            <div className="st-purchase" role="radiogroup" aria-label="Purchase type">
              <button role="radio" aria-checked={!subscribe} onClick={() => setSubscribe(false)}>
                <span>One-time purchase</span><b>{money(p.price)}</b></button>
              <button role="radio" aria-checked={subscribe} onClick={() => setSubscribe(true)}>
                <span>Subscribe & save 20%<small>Delivered monthly · cancel anytime</small></span><b>{money(p.price * 0.8)}</b></button>
            </div>
          )}

          <div className="st-buy">
            <div className="st-qty" aria-label="Quantity">
              <button aria-label="Decrease quantity" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
              <span aria-live="polite">{qty}</span>
              <button aria-label="Increase quantity" onClick={() => setQty(q => q + 1)}>+</button>
            </div>
            <button className="st-btn st-btn-lg st-grow" onClick={() => ctx.addToCart(p, option, qty, price, subscribe && n.id !== "tees" ? "Subscription" : undefined)}>Add to cart · {money(price * qty)}</button>
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
        <SectionHead kicker="Benefits" title={n.product.benefitsTitle} />
        <Reveal as="div" stagger className="st-benefits">
          {n.product.benefits.map((b, i) => (
            <RevealItem key={b.title} className="st-benefit">
              <span className="st-benefit-num">0{i + 1}</span><h3>{b.title}</h3><p>{b.text}</p>
            </RevealItem>
          ))}
        </Reveal>
      </section>

      <Ticker n={n} />
      <Steps n={n} />

      <Reveal className="st-section">
        <SectionHead kicker="Reviews" title={`${p.rating.toFixed(1)} out of 5`} />
        <div className="st-reviews">
          <div className="st-review-summary">
            <span className="st-big-rating">{p.rating.toFixed(1)}</span>
            <Stars rating={p.rating} count={p.reviews} />
            {[5, 4, 3, 2, 1].map((s, i) => {
              const share = [0.78, 0.15, 0.04, 0.02, 0.01][i];
              return (
                <div key={s} className="st-bar-row"><span>{s}★</span>
                  <span className="st-bar"><motion.span initial={{ width: 0 }} whileInView={{ width: `${share * 100}%` }} viewport={{ once: true }}
                    transition={{ duration: 1, delay: 0.2 + i * 0.08, ease: [0.2, 0.7, 0.2, 1] }} /></span>
                  <span className="st-muted">{Math.round(share * p.reviews)}</span></div>
              );
            })}
          </div>
          <div className="st-quotes st-quotes-col">
            {n.testimonials.map(t => (
              <figure key={t.name} className="st-quote"><Stars rating={5} /><blockquote>“{t.quote}”</blockquote>
                <figcaption><b>{t.name}</b><span className="st-muted"> · Verified buyer</span></figcaption></figure>
            ))}
          </div>
        </div>
      </Reveal>

      <ProductShelf products={related} ctx={ctx} kicker="Pairs well with" title="You may also like" />
    </Page>
  );
}

/* ───────── Cart ───────── */

export function CartPage({ ctx }: { ctx: StoreCtx }) {
  const n = ctx.niche;
  const lines = ctx.cart.map(l => ({ ...l, p: find(n, l.id) }));
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const left = Math.max(0, n.freeShippingOver - subtotal);
  const shipping = subtotal === 0 || left === 0 ? 0 : 6.95;
  const upsell = n.products.filter(p => !ctx.cart.some(l => l.id === p.id)).slice(0, 8);

  return (
    <Page ctx={ctx}>
      <Crumbs ctx={ctx} items={[["Home", { page: "home" }], ["Cart", null]]} />
      <section className="st-cart-head">
        <h1 className="st-h1">Your cart</h1>
        {lines.length > 0 && (
          <div className="st-ship-progress">
            <p>{left > 0 ? <>You're <b>{money(left)}</b> away from free shipping</> : <><Icon name="check" /> You've unlocked free shipping</>}</p>
            <span className="st-bar"><motion.span animate={{ width: `${Math.min(100, (subtotal / n.freeShippingOver) * 100)}%` }} /></span>
          </div>
        )}
      </section>

      {lines.length === 0 ? (
        <section className="st-empty-cart">
          <p className="st-lead">Your cart is empty.</p>
          <button className="st-btn st-btn-lg" onClick={e => ctx.nav({ page: "collection", id: n.collections[0].id }, e)}>Start shopping</button>
        </section>
      ) : (
        <section className="st-cart">
          <ul className="st-lines">
            {lines.map(l => (
              <motion.li layout key={l.id + l.option} className="st-line">
                <button className="st-line-art" onClick={e => ctx.nav({ page: "product", id: l.id }, e)} aria-label={`View ${l.p.name}`}>
                  <StoreArt shape={l.p.shape} color={l.p.color} bg={l.p.bg} />
                </button>
                <div className="st-line-info">
                  <b>{l.p.name}</b>
                  <span className="st-muted">{l.p.option.label}: {l.option}{l.plan && ` · ${l.plan}`}</span>
                  <div className="st-qty st-qty-sm">
                    <button aria-label="Decrease quantity" onClick={() => ctx.setQty(l.id, l.option, l.qty - 1)}>−</button>
                    <span>{l.qty}</span>
                    <button aria-label="Increase quantity" onClick={() => ctx.setQty(l.id, l.option, l.qty + 1)}>+</button>
                  </div>
                </div>
                <div className="st-line-end">
                  <b>{money(l.price * l.qty)}</b>
                  <button className="st-link st-muted" onClick={() => ctx.setQty(l.id, l.option, 0)}>Remove</button>
                </div>
              </motion.li>
            ))}
          </ul>
          <aside className="st-summary">
            <h2 className="st-h3">Order summary</h2>
            <dl>
              <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
              <div><dt>Shipping</dt><dd>{shipping ? money(shipping) : "Free"}</dd></div>
              <div className="st-total"><dt>Total</dt><dd>{money(subtotal + shipping)}</dd></div>
            </dl>
            <button className="st-btn st-btn-lg st-grow">Checkout</button>
            <p className="st-muted st-small">Taxes calculated at checkout. Demo only, nothing is charged.</p>
          </aside>
        </section>
      )}

      {upsell.length > 0 && (
        <ProductShelf products={upsell} ctx={ctx} kicker="Complete your order" title="Pairs well with" />
      )}
      <Usps n={n} />
    </Page>
  );
}

/* ───────── About ───────── */

export function AboutPage({ ctx }: { ctx: StoreCtx }) {
  const n = ctx.niche;
  return (
    <Page ctx={ctx}>
      <section className="st-about-hero">
        <span className="st-kicker">Our story</span>
        <h1 className="st-h1">{n.about.title}</h1>
        <p className="st-lead">{n.about.text}</p>
      </section>
      <section className="st-split">
        <ParallaxArt shape={n.hero.shape} color={n.hero.color} bg={n.hero.bg} tilt={-10} className="st-split-media" />
        <Reveal as="div" stagger className="st-split-copy">{n.about.paragraphs.map(t => <RevealItem key={t}><p>{t}</p></RevealItem>)}</Reveal>
      </section>
      <Reveal stagger className="st-stats">
        {n.about.stats.map(s => <RevealItem key={s.label}><CountUp className="st-stat" value={s.value} /><span>{s.label}</span></RevealItem>)}
      </Reveal>
      <Ticker n={n} />
      <section className="st-section">
        <SectionHead kicker="What we believe" title="Our values" />
        <Reveal as="div" stagger className="st-benefits">
          {n.about.values.map((v, i) => <RevealItem key={v.title} className="st-benefit"><span className="st-benefit-num">0{i + 1}</span><h3>{v.title}</h3><p>{v.text}</p></RevealItem>)}
        </Reveal>
      </section>
      <section className="st-split st-split-rev">
        <ParallaxArt shape={n.story.shape} color={n.story.color} bg={n.story.bg} tilt={6} className="st-split-media" />
        <Reveal as="div" stagger className="st-split-copy">
          <RevealItem><span className="st-kicker">{n.story.kicker}</span></RevealItem>
          <RevealItem><h2 className="st-h2">{n.story.title}</h2></RevealItem>
          <RevealItem><p>{n.story.text}</p></RevealItem>
        </Reveal>
      </section>
      <Testimonials n={n} />
      <Reveal className="st-banner" style={{ background: n.theme.accent, color: n.theme.accentText }}>
        <div><h2 className="st-h2">Ready to try {n.brand}?</h2><p>{n.hero.text}</p></div>
        <button className="st-btn st-btn-invert" onClick={e => ctx.nav({ page: "collection", id: n.collections[0].id }, e)}>{n.hero.cta}</button>
      </Reveal>
    </Page>
  );
}

/* ───────── FAQ ───────── */

export function FaqPage({ ctx }: { ctx: StoreCtx }) {
  const n = ctx.niche;
  const [q, setQ] = useState("");
  const hits = n.faq.filter(f => (f.q + f.a).toLowerCase().includes(q.toLowerCase()));
  return (
    <Page ctx={ctx}>
      <section className="st-about-hero">
        <span className="st-kicker">Help center</span>
        <h1 className="st-h1">How can we help?</h1>
        <label className="st-search"><Icon name="search" />
          <span className="st-sr">Search FAQs</span>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search shipping, returns, products…" />
        </label>
      </section>
      <section className="st-faq">
        <div>
          {hits.length ? <Accordion key={q} items={hits.map(f => [f.q, f.a])} /> : <p className="st-empty">No answers match “{q}”.</p>}
        </div>
        <aside className="st-contact">
          <h2 className="st-h3">Still need help?</h2>
          <p>Our team replies within a few hours, 7 days a week.</p>
          <button className="st-btn st-grow">Start a chat</button>
          <button className="st-btn st-btn-ghost st-grow">hello@{n.brand.toLowerCase().replace(/\s+/g, "")}.example</button>
        </aside>
      </section>
      <Reveal stagger className="st-info-cards">
        <RevealItem><Icon name="truck" /><h3>Shipping</h3><p>Orders ship in 1–2 business days. Free over {money(n.freeShippingOver)}.</p></RevealItem>
        <RevealItem><Icon name="shield" /><h3>Returns</h3><p>30 days, free return label, refunds in 3–5 days.</p></RevealItem>
        <RevealItem><Icon name="spark" /><h3>Rewards</h3><p>Earn points on every order and get early access to new releases.</p></RevealItem>
      </Reveal>
    </Page>
  );
}
