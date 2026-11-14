/**
 * Sample catalog for the Product hub, shaped like Shopify Admin API data
 * (product, variants, media, metafields, metaobject references, files).
 *
 * To use live data, replace `PRODUCTS` with the result of an Admin GraphQL
 * query run server-side (an Admin token must never ship to the browser).
 */
import { NICHES, type Shape } from "../store/niches";

export interface Variant { id: string; title: string; sku: string; barcode: string; price: number; compareAt?: number; inventory: number; weightG: number }
export interface Media { id: string; label: string; alt: string; width: number; height: number; kb: number; format: "webp" | "png" | "jpg"; tilt: number; bg: string }
export type MetafieldType =
  | "single_line_text_field" | "multi_line_text_field" | "number_integer" | "number_decimal" | "rating"
  | "list.single_line_text_field" | "list.metaobject_reference" | "list.file_reference" | "boolean" | "date";
export interface Metafield { namespace: string; key: string; type: MetafieldType; value: string | number | boolean | string[]; description?: string }
export interface Ingredient { handle: string; name: string; amount: number; unit: string; dv?: string; source: string }
export interface Certification { handle: string; name: string; issuer: string; number: string; expires: string }
export interface PdfDoc { id: string; kind: "spec" | "label" | "sds" | "sell"; title: string; pages: number; kb: number; updated: string; filename: string }
export interface Analyte { name: string; group: "Potency" | "Heavy metals" | "Microbial" | "Screen"; result: string; limit: string; pass: boolean }
export interface Coa { lot: string; mfg: string; expires: string; lab: string; reportNo: string; status: "pass" | "pending" | "fail"; analytes: Analyte[] }

export interface HubProduct {
  id: string; gid: string; handle: string; title: string; status: "ACTIVE" | "DRAFT" | "ARCHIVED";
  vendor: string; productType: string; tags: string[]; createdAt: string; updatedAt: string; publishedOn: string[];
  description: string; shape: Shape; color: string; bg: string; rating: number; reviews: number;
  optionName: string; optionValues: string[]; swatches: string[];
  variants: Variant[]; media: Media[]; metafields: Metafield[];
  ingredients: Ingredient[]; certifications: Certification[]; pdfs: PdfDoc[]; coas: Coa[];
  seo: { title: string; description: string };
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const day = (base: number, plus: number) => new Date(base + plus * 86400000).toISOString().slice(0, 10);

function rng(seed: number) {
  return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

const INGREDIENTS: Record<string, Omit<Ingredient, "handle">[]> = {
  protein: [
    { name: "Whey protein isolate", amount: 25, unit: "g", dv: "50%", source: "Grass-fed dairy" },
    { name: "Leucine", amount: 2.7, unit: "g", source: "Naturally occurring" },
    { name: "Sunflower lecithin", amount: 0.2, unit: "g", source: "Non-GMO sunflower" },
  ],
  preworkout: [
    { name: "L-Citrulline", amount: 6, unit: "g", source: "Fermented" },
    { name: "Beta-alanine", amount: 3.2, unit: "g", source: "CarnoSyn®" },
    { name: "Natural caffeine", amount: 200, unit: "mg", source: "Green coffee bean" },
    { name: "L-Theanine", amount: 100, unit: "mg", source: "Suntheanine®" },
  ],
  creatine: [{ name: "Creatine monohydrate", amount: 5, unit: "g", source: "Micronized" }],
  hydrate: [
    { name: "Sodium", amount: 1000, unit: "mg", dv: "43%", source: "Sea salt" },
    { name: "Potassium", amount: 200, unit: "mg", dv: "4%", source: "Potassium citrate" },
    { name: "Magnesium", amount: 60, unit: "mg", dv: "14%", source: "Magnesium citrate" },
  ],
  magnesium: [
    { name: "Magnesium glycinate", amount: 200, unit: "mg", dv: "48%", source: "Chelated" },
    { name: "L-Theanine", amount: 100, unit: "mg", source: "Suntheanine®" },
  ],
  omega: [
    { name: "Fish oil", amount: 2000, unit: "mg", source: "Wild anchovy & sardine" },
    { name: "EPA", amount: 900, unit: "mg", source: "Triglyceride form" },
    { name: "DHA", amount: 450, unit: "mg", source: "Triglyceride form" },
  ],
};
const ingredientKey = (name: string, collection: string) =>
  Object.keys(INGREDIENTS).find(k => name.toLowerCase().includes(k)) ?? collection;

const CERTS: Omit<Certification, "handle" | "expires">[] = [
  { name: "Third-party banned substance tested", issuer: "Independent sport lab", number: "BST-" },
  { name: "cGMP facility", issuer: "Facility audit", number: "GMP-" },
  { name: "Non-GMO verified", issuer: "Verification program", number: "NGV-" },
];

const LABS = ["Northfield Analytical", "Clearwater Labs", "Meridian Testing Co."];
const SWATCH = ["#5B3A29", "#F1E3C6", "#3D3D3D", "#E9E6DF", "#3D7DFF", "#FF5C7A", "#8BD17C", "#C9A35B"];
const ANGLES = ["Front", "Back label", "Supplement facts", "Lifestyle", "Scoop", "Side"];

function build(): HubProduct[] {
  const base = Date.parse("2025-03-01T00:00:00Z");
  return NICHES.supplements.products.filter(p => !p.id.includes("x-")).map((p, i) => {
    const r = rng(1000 + i * 77);
    const handle = slug(p.name);
    const id = String(8_123_456_000 + i * 1371);
    const abbr = p.name.split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 3);
    const values = p.option?.values ?? ["Default"];
    const variants: Variant[] = values.map((v, vi) => ({
      id: `gid://shopify/ProductVariant/${4_400_000_000 + i * 100 + vi}`,
      title: v, sku: `PF-${abbr}-${String(vi + 1).padStart(2, "0")}`,
      barcode: `85${String(1000000000 + Math.floor(r() * 899999999))}`,
      price: p.price + (p.option?.label === "Size" ? vi * Math.round(p.price * 0.7) : 0),
      compareAt: p.compareAt, inventory: Math.floor(r() * 900) - (vi === 2 ? 900 : 0), weightG: p.shape === "tub" ? 980 : p.shape === "pouch" ? 420 : 180,
    })).map(v => ({ ...v, inventory: Math.max(0, v.inventory) }));

    const media: Media[] = ANGLES.slice(0, 4 + (i % 3)).map((label, mi) => ({
      id: `gid://shopify/MediaImage/${3_300_000_000 + i * 10 + mi}`,
      label, alt: mi === 2 && i % 2 === 0 ? "" : `${p.name} ${label.toLowerCase()}`,
      width: mi === 3 ? 2400 : 2048, height: mi === 3 ? 1600 : 2048,
      kb: Math.round(180 + r() * 420), format: mi === 3 ? "jpg" : "webp",
      tilt: [0, 8, -6, 0, 14, -12][mi], bg: mi === 3 ? "#2E3440" : p.bg,
    }));

    const coll = p.collection;
    const ingredients = (INGREDIENTS[ingredientKey(p.name, coll)] ?? INGREDIENTS.creatine)
      .filter(x => !(/stim-free/i.test(p.name) && /caffeine/i.test(x.name)))
      .map(x => ({ ...x, handle: slug(x.name) }));
    const certifications = CERTS.slice(0, 2 + (i % 2)).map((c, ci) => ({
      ...c, handle: slug(c.name), number: c.number + String(20000 + i * 31 + ci * 7), expires: day(base, 500 + ci * 120 + i * 9),
    }));

    const servings = p.option?.label === "Size" ? parseInt(values[0]) || 60 : 30;
    const coas: Coa[] = [0, 1, 2, 3].slice(0, 3 + (i % 2)).map(li => {
      const mfg = day(base, 380 - li * 74 + i * 3);
      const status: Coa["status"] = li === 0 && i % 3 === 1 ? "pending" : li === 2 && i === 4 ? "fail" : "pass";
      const claim = ingredients[0];
      const potency = claim.amount * (0.98 + r() * 0.09);
      const metal = (lim: number) => (r() * lim * 0.4).toFixed(3);
      const leadFail = status === "fail";
      const analytes: Analyte[] = status === "pending" ? [] : [
        { name: `${claim.name} (label ${claim.amount}${claim.unit})`, group: "Potency", result: `${potency.toFixed(2)}${claim.unit}`, limit: "90–120% of claim", pass: true },
        { name: "Lead (Pb)", group: "Heavy metals", result: leadFail ? "0.612 ppm" : `${metal(0.5)} ppm`, limit: "≤ 0.5 ppm", pass: !leadFail },
        { name: "Arsenic (As)", group: "Heavy metals", result: `${metal(1)} ppm`, limit: "≤ 1.0 ppm", pass: true },
        { name: "Cadmium (Cd)", group: "Heavy metals", result: `${metal(0.3)} ppm`, limit: "≤ 0.3 ppm", pass: true },
        { name: "Mercury (Hg)", group: "Heavy metals", result: `${metal(0.2)} ppm`, limit: "≤ 0.2 ppm", pass: true },
        { name: "Total aerobic count", group: "Microbial", result: `${Math.round(r() * 800 + 50)} CFU/g`, limit: "≤ 10,000 CFU/g", pass: true },
        { name: "Yeast & mold", group: "Microbial", result: `< 10 CFU/g`, limit: "≤ 1,000 CFU/g", pass: true },
        { name: "E. coli", group: "Microbial", result: "Not detected", limit: "Absent in 10g", pass: true },
        { name: "Salmonella", group: "Microbial", result: "Not detected", limit: "Absent in 25g", pass: true },
        { name: "Banned substance screen (280+)", group: "Screen", result: "None detected", limit: "None detected", pass: true },
      ];
      return {
        lot: `${abbr}${mfg.slice(2, 4)}${mfg.slice(5, 7)}-${String(100 + li * 13 + i).padStart(3, "0")}`,
        mfg, expires: day(Date.parse(mfg), 730), lab: LABS[(i + li) % LABS.length],
        reportNo: `R-${mfg.replace(/-/g, "")}-${(i + 1) * 100 + li}`, status, analytes,
      };
    });

    const updated = day(base, 520 + i * 4);
    const pdfs: PdfDoc[] = [
      { id: "spec", kind: "spec", title: "Product spec sheet", pages: 2, kb: 284, updated, filename: `${handle}-spec-sheet.pdf` },
      { id: "label", kind: "label", title: "Label proof", pages: 1, kb: 1920, updated: day(base, 300 + i), filename: `${handle}-label-v${3 + (i % 3)}.pdf` },
      { id: "sds", kind: "sds", title: "Safety data sheet", pages: 4, kb: 410, updated: day(base, 120 + i), filename: `${handle}-sds.pdf` },
      { id: "sell", kind: "sell", title: "Retail sell sheet", pages: 1, kb: 760, updated: day(base, 410 + i), filename: `${handle}-sell-sheet.pdf` },
    ];

    const metafields: Metafield[] = [
      { namespace: "custom", key: "subtitle", type: "single_line_text_field", value: p.blurb },
      { namespace: "custom", key: "serving_size", type: "single_line_text_field", value: p.shape === "bottle" ? "2 capsules" : "1 scoop (32 g)" },
      { namespace: "custom", key: "servings_per_container", type: "number_integer", value: servings },
      { namespace: "custom", key: "suggested_use", type: "multi_line_text_field", value: p.shape === "bottle" ? "Take 2 capsules daily with water,\nideally 30–60 minutes before bed." : "Mix 1 scoop with 8–12 oz of water.\nUse daily, training or not." },
      { namespace: "custom", key: "ingredients", type: "list.metaobject_reference", value: ingredients.map(x => `gid://shopify/Metaobject/ingredient--${x.handle}`), description: "→ ingredient metaobjects" },
      { namespace: "custom", key: "certifications", type: "list.metaobject_reference", value: certifications.map(x => `gid://shopify/Metaobject/certification--${x.handle}`), description: "→ certification metaobjects" },
      { namespace: "custom", key: "allergens", type: "list.single_line_text_field", value: coll === "protein" && i === 0 ? ["Milk"] : [] },
      { namespace: "custom", key: "vegan", type: "boolean", value: coll !== "protein" || i === 1 },
      { namespace: "custom", key: "coa_files", type: "list.file_reference", value: coas.filter(c => c.status !== "pending").map(c => `gid://shopify/GenericFile/coa-${c.lot}`), description: "→ COA PDFs in Files" },
      { namespace: "custom", key: "spec_sheet", type: "list.file_reference", value: [`gid://shopify/GenericFile/${pdfs[0].filename}`] },
      { namespace: "custom", key: "launch_date", type: "date", value: day(base, i * 21) },
      { namespace: "reviews", key: "rating", type: "rating", value: p.rating, description: "scale 1–5" },
      { namespace: "reviews", key: "rating_count", type: "number_integer", value: p.reviews },
    ];

    return {
      id, gid: `gid://shopify/Product/${id}`, handle, title: p.name,
      status: i === 6 ? "DRAFT" : "ACTIVE",
      vendor: "Peakform", productType: NICHES.supplements.collections.find(c => c.id === coll)?.name ?? coll,
      tags: [coll, p.badge?.toLowerCase(), p.shape, "third-party-tested"].filter(Boolean) as string[],
      createdAt: day(base, i * 21), updatedAt: updated,
      publishedOn: i === 6 ? [] : ["Online Store", "Shop", i % 2 ? "Google & YouTube" : "Facebook & Instagram"],
      description: p.blurb, shape: p.shape, color: p.color, bg: p.bg, rating: p.rating, reviews: p.reviews,
      optionName: p.option?.label ?? "Title", optionValues: values,
      swatches: values.map((_, vi) => (p.option?.label === "Size" ? p.color : vi === 0 ? p.color : SWATCH[(vi * 3 + i) % SWATCH.length])),
      variants, media, metafields, ingredients, certifications, pdfs, coas,
      seo: { title: `${p.name} | Peakform`, description: p.blurb },
    };
  });
}

export const PRODUCTS: HubProduct[] = build();
export const productByHandle = (h: string | undefined) => PRODUCTS.find(p => p.handle === h);
