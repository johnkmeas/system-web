import { useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Carousel, CarouselArrows, CarouselAutoplay, CarouselCounter, CarouselDots, CarouselThumbs, Lightbox, useCarousel,
} from "../patterns";
import { Art, money, PRODUCTS, ProductArt, SCENES, type Product } from "./slider-data";

export function SliderExamples() {
  const [bag, setBag] = useState(0);
  const add = () => setBag(b => b + 1);
  return (
    <main className="gx-demo">
      <header className="gx-demo-head">
        <h1>Slider examples</h1>
        <div className="ex-bag" aria-live="polite">
          Bag
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.b key={bag} initial={{ y: -12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>{bag}</motion.b>
          </AnimatePresence>
        </div>
      </header>

      <Section title="Product page gallery" tag="E-commerce"
        note="Fade between colorways, pick from thumbnails or swatches, open the lightbox. The product details stay in sync.">
        <ProductGallery onAdd={add} />
      </Section>
      <Section title="Product shelf" tag="E-commerce" note="Start-aligned, snapping row of product cards with quick add.">
        <ProductShelf onAdd={add} />
      </Section>
      <Section title="Promo hero" tag="E-commerce" note="Looping autoplay with parallax art, segmented progress and a synced headline. Hover to pause.">
        <PromoHero />
      </Section>
      <Section title="Synced image + text" tag="Sync"
        note="One engine, two tracks: horizontal images lead, a vertical text track follows.">
        <SplitSync />
      </Section>
      <Section title="Category grid" tag="Grid" note="Two rows per slide with scaling pagination dots.">
        <CategoryGrid />
      </Section>
      <Section title="Reviews ticker" tag="Vertical" note="Vertical, looping autoplay with a scale effect.">
        <Reviews />
      </Section>
      <Section title="Lookbook ring" tag="3D" note="Slides placed on a rotating cylinder. Drag it round.">
        <Lookbook />
      </Section>
      <Section title="Stories" tag="2D cards" note="A card deck that advances on a timer, with story-style progress.">
        <Stories />
      </Section>
      <Section title="Right-to-left shelf" tag="RTL" note="First item on the right; arrows, drag and keys are mirrored.">
        <RtlShelf onAdd={add} />
      </Section>
    </main>
  );
}

function Section({ title, tag, note, children }: { title: string; tag: string; note: string; children: ReactNode }) {
  return (
    <section className="ex-section">
      <div className="ex-head">
        <h2>{title} <span className="ex-tag-pill">{tag}</span></h2>
        <p>{note}</p>
      </div>
      {children}
    </section>
  );
}

/* ── E-commerce: product detail gallery ── */
const COLORWAYS: Product[] = PRODUCTS.filter(p => p.shape === "shoe")
  .concat([{ ...PRODUCTS[1], id: "cw-sun", color: "#F4C95D", color2: "#FCF2D6", colorName: "Sun" },
    { ...PRODUCTS[1], id: "cw-sky", color: "#9FB4FF", color2: "#E6ECFF", colorName: "Sky" }]);

function ProductGallery({ onAdd }: { onAdd: () => void }) {
  const api = useCarousel({ count: COLORWAYS.length, loop: true });
  const [open, setOpen] = useState<string | null>(null);
  const p = COLORWAYS[api.index];
  return (
    <div className="ex-pdp">
      <div className="ex-pdp-media">
        <Carousel api={api} items={COLORWAYS} effect="fade" itemSize={1} gap={0} height="min(70vw, 460px)"
          label="Product images"
          renderItem={item => open === item.id ? <div className="ex-fill" /> : (
            <motion.div layoutId={"pdp-" + item.id} className="ex-fill ex-zoomable"
              onClick={api.clickGuard(() => setOpen(item.id))}>
              <ProductArt product={item} />
            </motion.div>
          )} />
        <div className="ex-pdp-arrows"><CarouselArrows api={api} /></div>
        <CarouselThumbs api={api} items={COLORWAYS} renderThumb={item => <ProductArt product={item} />} />
      </div>
      <div className="ex-pdp-info">
        <span className="ex-kicker">Running · Unisex</span>
        <h3>Cloud Runner</h3>
        <p className="ex-price"><b>{money(p.price)}</b>{p.was && <s>{money(p.was)}</s>}</p>
        <p className="ex-colorname">Color: <AnimatePresence mode="wait" initial={false}>
          <motion.b key={p.colorName} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18 }}>{p.colorName}</motion.b>
        </AnimatePresence></p>
        <div className="ex-swatches" role="group" aria-label="Color">
          {COLORWAYS.map((c, i) => (
            <button key={c.id} className="ex-swatch" aria-label={c.colorName} aria-pressed={i === api.index}
              style={{ background: c.color }} onClick={() => api.go(i)} />
          ))}
        </div>
        <button className="ex-cta" onClick={onAdd}>Add to bag · {money(p.price)}</button>
        <p className="ex-fine">Free returns within 30 days. Click the image to zoom.</p>
      </div>
      <AnimatePresence>
        {open && (
          <Lightbox key="lb" layoutId={"pdp-" + open} onClose={() => setOpen(null)} label="Product image">
            <ProductArt product={COLORWAYS.find(c => c.id === open)!} />
          </Lightbox>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── E-commerce: product shelf ── */
function ProductCard({ p, onAdd }: { p: Product; onAdd: () => void }) {
  return (
    <article className="ex-card">
      <ProductArt product={p}>{p.tag && <span className="ex-tag">{p.tag}</span>}</ProductArt>
      <div className="ex-card-body">
        <h3>{p.name}</h3>
        <span className="ex-rating">★ {p.rating}</span>
        <p className="ex-price"><b>{money(p.price)}</b>{p.was && <s>{money(p.was)}</s>}</p>
        <button className="ex-add" onClick={onAdd}>Add</button>
      </div>
    </article>
  );
}

function ProductShelf({ onAdd }: { onAdd: () => void }) {
  const api = useCarousel({ count: PRODUCTS.length });
  return (
    <div className="ex-stack">
      <Carousel api={api} items={PRODUCTS} itemSize={230} gap={16} align="start" height={360} label="Products"
        renderItem={p => <ProductCard p={p} onAdd={api.clickGuard(onAdd)} />} />
      <div className="ex-row"><CarouselDots api={api} scaling /><CarouselArrows api={api} /></div>
    </div>
  );
}

function RtlShelf({ onAdd }: { onAdd: () => void }) {
  const api = useCarousel({ count: PRODUCTS.length, rtl: true });
  return (
    <div className="ex-stack" dir="rtl">
      <Carousel api={api} items={PRODUCTS} itemSize={230} gap={16} align="start" height={360} label="Products"
        renderItem={p => <ProductCard p={p} onAdd={api.clickGuard(onAdd)} />} />
      <div className="ex-row"><CarouselCounter api={api} /><CarouselArrows api={api} /></div>
    </div>
  );
}

/* ── E-commerce: promo hero ── */
const PROMOS = [
  { ...SCENES[1], title: "Summer sale", text: "Up to 40% off sandals, bottles and lamps.", cta: "Shop the sale" },
  { ...SCENES[6], title: "New: Dusk Runner", text: "Limited colorway, dropping this week.", cta: "Get notified" },
  { ...SCENES[2], title: "Free shipping", text: "On every order over $50, all season.", cta: "Start shopping" },
  { ...SCENES[5], title: "Gift cards", text: "Let them pick. Delivered instantly.", cta: "Send a gift" },
];

function PromoHero() {
  const api = useCarousel({ count: PROMOS.length, loop: true, autoplay: 5000 });
  const p = PROMOS[api.index];
  return (
    <div className="ex-hero">
      <Carousel api={api} items={PROMOS} effect="parallax" itemSize={1} gap={0} height="min(60vw, 440px)" label="Promotions"
        renderItem={s => <Art scene={s} />} />
      <div className="ex-hero-copy" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={p.id} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.4, ease: [0.2, 0.7, 0.2, 1] }}>
            <h3>{p.title}</h3>
            <p>{p.text}</p>
            <button className="ex-cta">{p.cta}</button>
          </motion.div>
        </AnimatePresence>
      </div>
      <CarouselAutoplay api={api} style={{ position: "absolute", left: 20, right: 20, bottom: 18, color: "#141A33" }} />
    </div>
  );
}

/* ── Sync: images lead, text follows ── */
function SplitSync() {
  const items = SCENES.slice(0, 7);
  const api = useCarousel({ count: items.length, loop: true });
  return (
    <div className="ex-split">
      <div className="ex-split-media">
        <Carousel api={api} items={items} effect="scale" itemSize={0.62} gap={12} height={340} label="Places"
          renderItem={s => <Art scene={s} />} />
        <div className="ex-row"><CarouselDots api={api} /><CarouselArrows api={api} /></div>
      </div>
      <Carousel api={api} items={items} interactive={false} orientation="y" effect="slide" itemSize={1} gap={0}
        height={160} className="ex-split-text" label="Place details"
        renderItem={s => (
          <div className="ex-split-copy">
            <span className="ex-kicker">Destination</span>
            <h3>{s.title}</h3>
            <p>{s.text}</p>
          </div>
        )} />
    </div>
  );
}

/* ── Grid ── */
function CategoryGrid() {
  const items = SCENES;
  const rows = 2;
  const api = useCarousel({ count: Math.ceil(items.length / rows) });
  return (
    <div className="ex-stack">
      <Carousel api={api} items={items} rows={rows} itemSize={190} gap={14} align="start" height={420} label="Categories"
        renderItem={s => <Art scene={s}><span className="art-label">{s.title}</span></Art>} />
      <div className="ex-row"><CarouselDots api={api} scaling /><CarouselArrows api={api} /></div>
    </div>
  );
}

/* ── Vertical reviews ── */
const REVIEWS = [
  { id: "r1", who: "Maya, Lisbon", text: "Lighter than my last pair and the color is even better in person.", stars: 5 },
  { id: "r2", who: "Jon, Austin", text: "The lamp is the first thing people ask about when they come over.", stars: 5 },
  { id: "r3", who: "Priya, Leeds", text: "Bottle keeps water cold all afternoon on the trail.", stars: 4 },
  { id: "r4", who: "Tomás, Mexico City", text: "Arrived in two days. Packaging was all recyclable.", stars: 5 },
  { id: "r5", who: "Ana, Toronto", text: "Ordered a second box for the kids' room.", stars: 4 },
  { id: "r6", who: "Kenji, Osaka", text: "Fit was true to size and comfortable from day one.", stars: 5 },
];

function Reviews() {
  const api = useCarousel({ count: REVIEWS.length, loop: true, orientation: "y", autoplay: 3500 });
  return (
    <div className="ex-reviews">
      <Carousel api={api} items={REVIEWS} effect="scale" itemSize={0.42} gap={12} height={400} label="Reviews"
        renderItem={(r, ctx) => (
          <blockquote className={"ex-review" + (ctx.active ? " is-active" : "")}>
            <span aria-label={`${r.stars} stars`}>{"★".repeat(r.stars)}</span>
            <p>{r.text}</p>
            <cite>{r.who}</cite>
          </blockquote>
        )} />
      <div className="ex-col"><CarouselArrows api={api} /><CarouselCounter api={api} /></div>
    </div>
  );
}

/* ── 3D ring ── */
function Lookbook() {
  const api = useCarousel({ count: SCENES.length, loop: true });
  return (
    <div className="ex-stack">
      <Carousel api={api} items={SCENES} effect="ring" itemSize={200} gap={14} height={340} label="Lookbook"
        renderItem={s => <Art scene={s}><span className="art-label">{s.title}</span></Art>} />
      <div className="ex-row ex-center"><CarouselArrows api={api} /><CarouselCounter api={api} /></div>
    </div>
  );
}

/* ── Stories ── */
function Stories() {
  const items = SCENES.slice(0, 6);
  const api = useCarousel({ count: items.length, loop: true, autoplay: 3000 });
  return (
    <div className="ex-stories">
      <CarouselAutoplay api={api} />
      <Carousel api={api} items={items} effect="cards" itemSize={0.58} height={440} label="Stories"
        renderItem={s => <Art scene={s}><span className="art-label">{s.title}<br /><small>{s.text}</small></span></Art>} />
    </div>
  );
}
