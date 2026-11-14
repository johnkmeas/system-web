import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { AnimatePresence, motion, Reorder } from "motion/react";
import { StoreArt, Stars, money } from "../store/ui";
import { PRODUCTS, productByHandle, type Coa, type HubProduct, type Media, type Metafield, type PdfDoc } from "./products";
import { adminUrl } from "./links";
import { ExternalIcon } from "./icons";
import "../store/store.css";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "images", label: "Images" },
  { id: "metafields", label: "Metafields" },
  { id: "visualizer", label: "Visualizer" },
  { id: "pdf", label: "PDFs" },
  { id: "coa", label: "COAs" },
] as const;
type TabId = (typeof TABS)[number]["id"];

const hubHref = (handle?: string, tab?: string) => "#/city/products" + (handle ? "/" + handle : "") + (tab && tab !== "overview" ? "/" + tab : "");

export function ProductHub({ path }: { path: string[] }) {
  const [handle, tabParam] = path;
  const product = productByHandle(handle);
  const tab: TabId = (TABS.find(t => t.id === tabParam)?.id ?? "overview");
  const [q, setQ] = useState("");
  const list = PRODUCTS.filter(p => !q || `${p.title} ${p.productType} ${p.tags.join(" ")} ${p.variants.map(v => v.sku).join(" ")}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="ph">
      <aside className="ph-side" aria-label="Products">
        <a className="ph-side-head" href={hubHref()}>
          <span className="cy-kicker"><span className="cy-chip-dot" />Catalog</span>
          <strong>Product hub</strong>
        </a>
        <input className="cy-search" type="search" placeholder="Search title, SKU, tag" value={q} onChange={e => setQ(e.target.value)} aria-label="Search products" />
        <ul className="ph-list">
          {list.map(p => (
            <li key={p.id}>
              <a href={hubHref(p.handle, tab)} className={"ph-item" + (p.handle === handle ? " is-active" : "")} aria-current={p.handle === handle ? "page" : undefined}>
                <span className="ph-thumb"><StoreArt shape={p.shape} color={p.color} bg={p.bg} /></span>
                <span className="ph-item-text">
                  <span className="ph-item-title">{p.title}</span>
                  <span className="ph-item-sub">{p.productType} · {p.variants.length} variant{p.variants.length > 1 ? "s" : ""}</span>
                </span>
                {p.status !== "ACTIVE" && <span className="ph-status is-draft">Draft</span>}
              </a>
            </li>
          ))}
          {!list.length && <li className="cy-empty">No products match.</li>}
        </ul>
      </aside>
      <section className="ph-main">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={product?.id ?? "home"} className="ph-main-inner"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.2, 0.7, 0.2, 1] }}>
            {product ? <ProductDetail product={product} tab={tab} /> : <HubHome />}
          </motion.div>
        </AnimatePresence>
      </section>
    </div>
  );
}

function SampleNote() {
  return <p className="ph-note">Sample data shaped like the Shopify Admin API. Swap <code>PRODUCTS</code> in <code>src/demos/city/products.ts</code> for a server-side Admin GraphQL query to go live.</p>;
}

function HubHome() {
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.focus({ preventScroll: true }); }, []);
  const missingAlt = PRODUCTS.flatMap(p => p.media.filter(m => !m.alt).map(m => ({ p, m })));
  const pendingCoa = PRODUCTS.flatMap(p => p.coas.filter(c => c.status !== "pass").map(c => ({ p, c })));
  const lowStock = PRODUCTS.flatMap(p => p.variants.filter(v => v.inventory < 50).map(v => ({ p, v })));
  const drafts = PRODUCTS.filter(p => p.status !== "ACTIVE");
  return (
    <div className="ph-home">
      <header className="cy-page-head">
        <h2 ref={head} tabIndex={-1}>Product hub</h2>
        <p>Pick a product for its admin metadata, images, metafields and metaobjects, visualizer, PDFs and certificates of analysis.</p>
      </header>
      <div className="ph-stats">
        <Stat label="Products" value={PRODUCTS.length} />
        <Stat label="Variants" value={PRODUCTS.reduce((n, p) => n + p.variants.length, 0)} />
        <Stat label="Images missing alt" value={missingAlt.length} warn={missingAlt.length > 0} />
        <Stat label="COAs needing review" value={pendingCoa.length} warn={pendingCoa.length > 0} />
      </div>
      <div className="ph-attn">
        <Attention title="Certificates of analysis" empty="All lots passed."
          items={pendingCoa.map(({ p, c }) => ({ key: p.id + c.lot, href: hubHref(p.handle, "coa"), label: p.title, sub: `Lot ${c.lot}`, pill: c.status }))} />
        <Attention title="Image alt text" empty="Every image has alt text."
          items={missingAlt.map(({ p, m }) => ({ key: m.id, href: hubHref(p.handle, "images"), label: p.title, sub: m.label, pill: "missing" }))} />
        <Attention title="Low stock (< 50)" empty="Stock looks healthy."
          items={lowStock.map(({ p, v }) => ({ key: v.id, href: hubHref(p.handle), label: p.title, sub: `${v.title} · ${v.sku}`, pill: String(v.inventory) }))} />
        <Attention title="Drafts" empty="No drafts."
          items={drafts.map(p => ({ key: p.id, href: hubHref(p.handle), label: p.title, sub: "Not published", pill: "draft" }))} />
      </div>
      <h3 className="ph-h3">All products</h3>
      <ul className="ph-cards">
        {PRODUCTS.map((p, i) => (
          <motion.li key={p.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.04 }}>
            <a href={hubHref(p.handle)} className="ph-card">
              <span className="ph-card-art"><StoreArt shape={p.shape} color={p.color} bg={p.bg} /></span>
              <span className="ph-card-title">{p.title}</span>
              <span className="ph-item-sub">{p.productType} · {money(p.variants[0].price)}</span>
            </a>
          </motion.li>
        ))}
      </ul>
      <SampleNote />
    </div>
  );
}

function Stat({ label, value, warn }: { label: string; value: number | string; warn?: boolean }) {
  return <div className={"ph-stat" + (warn ? " is-warn" : "")}><strong>{value}</strong><span>{label}</span></div>;
}

function Attention({ title, items, empty }: { title: string; empty: string; items: { key: string; href: string; label: string; sub: string; pill: string }[] }) {
  return (
    <section className="ph-box">
      <h3>{title} <span className="ph-count">{items.length}</span></h3>
      {items.length ? (
        <ul>{items.slice(0, 4).map(it => (
          <li key={it.key}><a href={it.href}><span><strong>{it.label}</strong><small>{it.sub}</small></span><span className={"ph-pill is-" + it.pill}>{it.pill}</span></a></li>
        ))}</ul>
      ) : <p className="ph-ok">{empty}</p>}
    </section>
  );
}

// ------------------------------------------------------------------ detail

function ProductDetail({ product: p, tab }: { product: HubProduct; tab: TabId }) {
  const head = useRef<HTMLHeadingElement>(null);
  useEffect(() => { head.current?.focus({ preventScroll: true }); }, [p.id]);
  return (
    <div className="ph-detail">
      <header className="ph-head">
        <span className="ph-head-art"><StoreArt shape={p.shape} color={p.color} bg={p.bg} /></span>
        <div className="ph-head-text">
          <span className="ph-item-sub">{p.vendor} · {p.productType}</span>
          <h2 ref={head} tabIndex={-1}>{p.title}</h2>
          <div className="ph-head-meta">
            <span className={"ph-status is-" + p.status.toLowerCase()}>{p.status.toLowerCase()}</span>
            <Stars rating={p.rating} count={p.reviews} />
          </div>
        </div>
        <a className="ph-admin" href={adminUrl(`/products/${p.id}`)} target="_blank" rel="noreferrer noopener">Open in admin <ExternalIcon /></a>
      </header>
      <nav className="ph-tabs" aria-label="Product sections">
        {TABS.map(t => (
          <a key={t.id} href={hubHref(p.handle, t.id)} className={"ph-tab" + (tab === t.id ? " is-active" : "")} aria-current={tab === t.id ? "page" : undefined}>
            {t.label}
            {tab === t.id && <motion.span layoutId="ph-tab-line" className="ph-tab-line" />}
          </a>
        ))}
      </nav>
      <div className="ph-tabpanel">
        {tab === "overview" && <Overview p={p} />}
        {tab === "images" && <Images key={p.id} p={p} />}
        {tab === "metafields" && <Metafields p={p} />}
        {tab === "visualizer" && <Visualizer key={p.id} p={p} />}
        {tab === "pdf" && <Pdfs key={p.id} p={p} />}
        {tab === "coa" && <Coas key={p.id} p={p} />}
      </div>
      <SampleNote />
    </div>
  );
}

function Overview({ p }: { p: HubProduct }) {
  const total = p.variants.reduce((n, v) => n + v.inventory, 0);
  const prices = p.variants.map(v => v.price);
  const range = Math.min(...prices) === Math.max(...prices) ? money(prices[0]) : `${money(Math.min(...prices))}–${money(Math.max(...prices))}`;
  return (
    <>
      <div className="ph-stats">
        <Stat label="Price" value={range} />
        <Stat label="In stock" value={total.toLocaleString()} warn={total < 100} />
        <Stat label="Variants" value={p.variants.length} />
        <Stat label="Images" value={p.media.length} />
      </div>
      <div className="ph-two">
        <section className="ph-box">
          <h3>Admin fields</h3>
          <dl className="ph-dl">
            <dt>ID</dt><dd><Mono>{p.gid}</Mono></dd>
            <dt>Handle</dt><dd><Mono>{p.handle}</Mono></dd>
            <dt>Status</dt><dd>{p.status}</dd>
            <dt>Vendor</dt><dd>{p.vendor}</dd>
            <dt>Type</dt><dd>{p.productType}</dd>
            <dt>Tags</dt><dd className="ph-tags">{p.tags.map(t => <span key={t}>{t}</span>)}</dd>
            <dt>Sales channels</dt><dd>{p.publishedOn.length ? p.publishedOn.join(", ") : "None"}</dd>
            <dt>Created</dt><dd>{p.createdAt}</dd>
            <dt>Updated</dt><dd>{p.updatedAt}</dd>
          </dl>
        </section>
        <section className="ph-box">
          <h3>Search listing</h3>
          <div className="ph-serp">
            <span className="ph-serp-url">example.com › products › {p.handle}</span>
            <span className="ph-serp-title">{p.seo.title}</span>
            <span className="ph-serp-desc">{p.seo.description}</span>
          </div>
          <h3 style={{ marginTop: 20 }}>Description</h3>
          <p className="ph-p">{p.description}</p>
        </section>
      </div>
      <section className="ph-box">
        <h3>Variants</h3>
        <div className="ph-table-wrap">
          <table className="ph-table">
            <thead><tr><th>{p.optionName}</th><th>SKU</th><th>Barcode</th><th className="num">Price</th><th className="num">Inventory</th><th className="num">Weight</th></tr></thead>
            <tbody>{p.variants.map(v => (
              <tr key={v.id}>
                <td>{v.title}</td><td><Mono>{v.sku}</Mono></td><td><Mono>{v.barcode}</Mono></td>
                <td className="num">{money(v.price)}{v.compareAt && <s className="ph-muted"> {money(v.compareAt)}</s>}</td>
                <td className={"num" + (v.inventory < 50 ? " is-low" : "")}>{v.inventory}</td>
                <td className="num">{v.weightG} g</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
    </>
  );
}

const Mono = ({ children }: { children: ReactNode }) => <code className="ph-mono">{children}</code>;

function Images({ p }: { p: HubProduct }) {
  const [items, setItems] = useState<Media[]>(p.media);
  const dirty = items.some((m, i) => m.id !== p.media[i].id || m.alt !== p.media[i].alt);
  const setAlt = (id: string, alt: string) => setItems(xs => xs.map(m => (m.id === id ? { ...m, alt } : m)));
  return (
    <>
      <div className="ph-row-head">
        <p className="ph-p">Drag to reorder. The first image is the featured image. Edits stay local in this demo.</p>
        {dirty && <button className="ph-btn" onClick={() => setItems(p.media)}>Reset</button>}
      </div>
      <Reorder.Group axis="y" values={items} onReorder={setItems} className="ph-media">
        {items.map((m, i) => (
          <Reorder.Item key={m.id} value={m} className="ph-media-row" whileDrag={{ scale: 1.02, boxShadow: "0 12px 30px rgba(0,0,0,.25)" }}>
            <span className="ph-grip" aria-hidden="true">⋮⋮</span>
            <span className="ph-media-art" style={{ aspectRatio: `${m.width} / ${m.height}` }}>
              <StoreArt shape={p.shape} color={p.color} bg={m.bg} tilt={m.tilt} />
              {i === 0 && <span className="ph-featured">Featured</span>}
            </span>
            <span className="ph-media-info">
              <strong>{m.label}</strong>
              <span className="ph-item-sub">{m.width}×{m.height} · {m.format.toUpperCase()} · {m.kb} KB</span>
              <label className={"ph-alt" + (m.alt ? "" : " is-missing")}>
                <span>Alt text{!m.alt && " · missing"}</span>
                <input value={m.alt} onChange={e => setAlt(m.id, e.target.value)} onPointerDown={e => e.stopPropagation()} placeholder="Describe the image" />
              </label>
            </span>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </>
  );
}

function MetaValue({ f, p }: { f: Metafield; p: HubProduct }) {
  if (f.type === "boolean") return <span className={"ph-pill is-" + (f.value ? "pass" : "neutral")}>{f.value ? "true" : "false"}</span>;
  if (f.type === "rating") return <Stars rating={f.value as number} />;
  if (f.type === "multi_line_text_field") return <span className="ph-pre">{String(f.value)}</span>;
  if (Array.isArray(f.value)) {
    if (!f.value.length) return <span className="ph-muted">empty list</span>;
    if (f.key === "ingredients") return <span className="ph-refs">{p.ingredients.map(x => <span key={x.handle} className="ph-ref">ingredient · {x.name}</span>)}</span>;
    if (f.key === "certifications") return <span className="ph-refs">{p.certifications.map(x => <span key={x.handle} className="ph-ref">certification · {x.name}</span>)}</span>;
    return <span className="ph-refs">{f.value.map(v => <span key={v} className="ph-ref">{v.replace(/^gid:\/\/shopify\/\w+\//, "")}</span>)}</span>;
  }
  return <span>{String(f.value)}</span>;
}

function Metafields({ p }: { p: HubProduct }) {
  return (
    <>
      <section className="ph-box">
        <h3>Metafields <span className="ph-count">{p.metafields.length}</span></h3>
        <div className="ph-table-wrap">
          <table className="ph-table ph-mf">
            <thead><tr><th>Key</th><th>Type</th><th>Value</th></tr></thead>
            <tbody>{p.metafields.map(f => (
              <tr key={f.namespace + f.key}>
                <td><Mono>{f.namespace}.{f.key}</Mono>{f.description && <small className="ph-muted ph-block">{f.description}</small>}</td>
                <td><span className="ph-type">{f.type}</span></td>
                <td><MetaValue f={f} p={p} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>
      <div className="ph-two">
        <section className="ph-box">
          <h3>Metaobjects · ingredient <span className="ph-count">{p.ingredients.length}</span></h3>
          <ul className="ph-mo">
            {p.ingredients.map(x => (
              <li key={x.handle}>
                <Mono>{x.handle}</Mono>
                <dl className="ph-dl is-tight">
                  <dt>name</dt><dd>{x.name}</dd>
                  <dt>amount</dt><dd>{x.amount} {x.unit}{x.dv && <span className="ph-muted"> · {x.dv} DV</span>}</dd>
                  <dt>source</dt><dd>{x.source}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </section>
        <section className="ph-box">
          <h3>Metaobjects · certification <span className="ph-count">{p.certifications.length}</span></h3>
          <ul className="ph-mo">
            {p.certifications.map(x => (
              <li key={x.handle}>
                <Mono>{x.handle}</Mono>
                <dl className="ph-dl is-tight">
                  <dt>name</dt><dd>{x.name}</dd>
                  <dt>issuer</dt><dd>{x.issuer}</dd>
                  <dt>number</dt><dd><Mono>{x.number}</Mono></dd>
                  <dt>expires</dt><dd>{x.expires}</dd>
                </dl>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}

const BACKDROPS = [
  { id: "brand", label: "Brand" },
  { id: "studio", label: "Studio" },
  { id: "dark", label: "Dark" },
  { id: "pdp", label: "On PDP" },
] as const;

function Visualizer({ p }: { p: HubProduct }) {
  const [vi, setVi] = useState(0);
  const [backdrop, setBackdrop] = useState<(typeof BACKDROPS)[number]["id"]>("brand");
  const [tilt, setTilt] = useState(0);
  const [zoom, setZoom] = useState(1);
  const color = p.swatches[vi];
  const bg = backdrop === "studio" ? "#E9ECF2" : backdrop === "dark" ? "#14161C" : p.bg;
  const variant = p.variants[vi] ?? p.variants[0];
  const art = (
    <motion.div className="ph-vis-art" animate={{ scale: zoom }} transition={{ type: "spring", stiffness: 220, damping: 24 }}>
      <StoreArt shape={p.shape} color={color} bg={bg} tilt={tilt} />
    </motion.div>
  );
  return (
    <div className="ph-vis">
      <div className={"ph-vis-stage is-" + backdrop}>
        {backdrop === "pdp" ? (
          <div className="ph-vis-pdp">
            <div className="ph-vis-pdp-media">{art}</div>
            <div className="ph-vis-pdp-copy">
              <span className="ph-item-sub">{p.vendor}</span>
              <strong>{p.title}</strong>
              <Stars rating={p.rating} count={p.reviews} />
              <span className="ph-vis-price">{money(variant.price)}</span>
              <span className="ph-item-sub">{p.optionName}: {p.optionValues[vi]}</span>
              <span className="ph-vis-cta">Add to cart</span>
            </div>
          </div>
        ) : art}
      </div>
      <div className="ph-vis-controls">
        <fieldset>
          <legend>{p.optionName}</legend>
          <div className="ph-swatches">
            {p.optionValues.map((v, i) => (
              <button key={v} className={"ph-swatch" + (i === vi ? " is-active" : "")} onClick={() => setVi(i)} aria-pressed={i === vi}>
                <span style={{ background: p.swatches[i] } as CSSProperties} />{v}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Backdrop</legend>
          <div className="ph-seg">
            {BACKDROPS.map(b => <button key={b.id} className={backdrop === b.id ? "is-active" : ""} onClick={() => setBackdrop(b.id)} aria-pressed={backdrop === b.id}>{b.label}</button>)}
          </div>
        </fieldset>
        <label className="ph-range"><span>Angle <output>{tilt}°</output></span>
          <input type="range" min={-25} max={25} value={tilt} onChange={e => setTilt(+e.target.value)} /></label>
        <label className="ph-range"><span>Zoom <output>{Math.round(zoom * 100)}%</output></span>
          <input type="range" min={0.7} max={1.5} step={0.05} value={zoom} onChange={e => setZoom(+e.target.value)} /></label>
        <dl className="ph-dl is-tight">
          <dt>SKU</dt><dd><Mono>{variant.sku}</Mono></dd>
          <dt>Swatch</dt><dd><Mono>{color}</Mono></dd>
          <dt>Shape</dt><dd>{p.shape}</dd>
        </dl>
      </div>
    </div>
  );
}

function Pdfs({ p }: { p: HubProduct }) {
  const [sel, setSel] = useState<PdfDoc>(p.pdfs[0]);
  return (
    <div className="ph-pdf">
      <ul className="ph-pdf-list">
        {p.pdfs.map(d => (
          <li key={d.id}>
            <button className={"ph-pdf-item" + (d.id === sel.id ? " is-active" : "")} onClick={() => setSel(d)} aria-pressed={d.id === sel.id}>
              <span className="ph-pdf-icon" aria-hidden="true">PDF</span>
              <span><strong>{d.title}</strong><small>{d.filename}</small><small>{d.pages} pp · {d.kb >= 1000 ? (d.kb / 1000).toFixed(1) + " MB" : d.kb + " KB"} · {d.updated}</small></span>
            </button>
          </li>
        ))}
        <li><a className="ph-btn ph-btn-block" href={adminUrl("/content/files")} target="_blank" rel="noreferrer noopener">Open Files in admin <ExternalIcon /></a></li>
      </ul>
      <div className="ph-paper-wrap">
        <AnimatePresence mode="wait">
          <motion.article key={sel.id} className="ph-paper" initial={{ opacity: 0, rotateX: -8, y: 12 }} animate={{ opacity: 1, rotateX: 0, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.3 }}>
            <PaperPage p={p} doc={sel} />
          </motion.article>
        </AnimatePresence>
      </div>
    </div>
  );
}

function PaperPage({ p, doc }: { p: HubProduct; doc: PdfDoc }) {
  const mf = (k: string) => p.metafields.find(f => f.key === k)?.value;
  return (
    <>
      <header className="pp-head">
        <span className="pp-brand">PEAKFORM</span>
        <span className="pp-doc">{doc.title}<br /><small>Rev. {doc.updated}</small></span>
      </header>
      <div className="pp-hero">
        <span className="pp-art"><StoreArt shape={p.shape} color={p.color} bg={p.bg} /></span>
        <div>
          <h4>{p.title}</h4>
          <p>{p.description}</p>
          <dl className="pp-dl">
            <dt>Serving size</dt><dd>{String(mf("serving_size"))}</dd>
            <dt>Servings</dt><dd>{String(mf("servings_per_container"))}</dd>
            <dt>UPC</dt><dd>{p.variants[0].barcode}</dd>
          </dl>
        </div>
      </div>
      {doc.kind === "sds" ? (
        <>
          <h5>1. Identification</h5><p>{p.title}, dietary supplement. Not a hazardous substance under GHS.</p>
          <h5>2. Handling & storage</h5><p>Store in a cool, dry place. Keep lid tightly closed. Keep out of reach of children.</p>
          <h5>3. First aid</h5><p>Eye contact: rinse with water. Ingestion of large amounts: seek medical advice.</p>
        </>
      ) : (
        <>
          <h5>Supplement facts</h5>
          <table className="pp-table">
            <tbody>{p.ingredients.map(x => <tr key={x.handle}><td>{x.name}</td><td>{x.amount} {x.unit}</td><td>{x.dv ?? "†"}</td></tr>)}</tbody>
          </table>
          <h5>Suggested use</h5><p className="ph-pre">{String(mf("suggested_use"))}</p>
          <h5>Certifications</h5><p>{p.certifications.map(c => c.name).join(" · ")}</p>
          {doc.kind === "sell" && <><h5>Wholesale</h5><p>Case pack 6 · MSRP {money(p.variants[0].price)} · MAP enforced</p></>}
        </>
      )}
      <footer className="pp-foot">{doc.filename} · page 1 of {doc.pages}</footer>
    </>
  );
}

function Coas({ p }: { p: HubProduct }) {
  const [open, setOpen] = useState<string | null>(p.coas.find(c => c.status !== "pass")?.lot ?? p.coas[0]?.lot ?? null);
  const counts = useMemo(() => ({
    pass: p.coas.filter(c => c.status === "pass").length,
    pending: p.coas.filter(c => c.status === "pending").length,
    fail: p.coas.filter(c => c.status === "fail").length,
  }), [p]);
  return (
    <>
      <div className="ph-stats">
        <Stat label="Lots on file" value={p.coas.length} />
        <Stat label="Passed" value={counts.pass} />
        <Stat label="Pending" value={counts.pending} warn={counts.pending > 0} />
        <Stat label="Failed" value={counts.fail} warn={counts.fail > 0} />
      </div>
      <p className="ph-p">Linked through <Mono>custom.coa_files</Mono>. Most recent lot first.</p>
      <ul className="ph-coas">
        {p.coas.map(c => <CoaRow key={c.lot} c={c} open={open === c.lot} onToggle={() => setOpen(open === c.lot ? null : c.lot)} />)}
      </ul>
    </>
  );
}

function CoaRow({ c, open, onToggle }: { c: Coa; open: boolean; onToggle: () => void }) {
  const groups = [...new Set(c.analytes.map(a => a.group))];
  return (
    <li className={"ph-coa is-" + c.status}>
      <button className="ph-coa-head" onClick={onToggle} aria-expanded={open}>
        <span className="ph-coa-lot"><Mono>{c.lot}</Mono><small>{c.lab} · {c.reportNo}</small></span>
        <span className="ph-coa-dates"><small>Mfg</small>{c.mfg}</span>
        <span className="ph-coa-dates"><small>Exp</small>{c.expires}</span>
        <span className={"ph-pill is-" + c.status}>{c.status}</span>
        <motion.span className="ph-chev" animate={{ rotate: open ? 180 : 0 }} aria-hidden="true">⌄</motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="ph-coa-body" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.28 }}>
            {c.status === "pending" ? (
              <p className="ph-p">Sample received by {c.lab}. Results usually post in 5–7 business days.</p>
            ) : (
              <div className="ph-table-wrap">
                <table className="ph-table">
                  <thead><tr><th>Analyte</th><th>Result</th><th>Specification</th><th /></tr></thead>
                  {groups.map(g => (
                    <tbody key={g}>
                      <tr className="ph-group-row"><td colSpan={4}>{g}</td></tr>
                      {c.analytes.filter(a => a.group === g).map(a => (
                        <tr key={a.name} className={a.pass ? "" : "is-fail"}>
                          <td>{a.name}</td><td>{a.result}</td><td className="ph-muted">{a.limit}</td>
                          <td className="num">{a.pass ? "✓" : "✕"}</td>
                        </tr>
                      ))}
                    </tbody>
                  ))}
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
