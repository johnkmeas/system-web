import type { CSSProperties, ReactNode } from "react";

export interface Scene {
  id: string;
  title: string;
  text: string;
  color: string;
  color2: string;
}

export const SCENES: Scene[] = [
  { id: "aurora", title: "Aurora", text: "Cold light over a quiet ridge.", color: "#7FD1C7", color2: "#9FB4FF" },
  { id: "dune", title: "Dune", text: "Wind-shaped sand at golden hour.", color: "#FFB37C", color2: "#F4C95D" },
  { id: "tide", title: "Tide", text: "The sea pulling back from the rocks.", color: "#8ED0F5", color2: "#7FD1C7" },
  { id: "bloom", title: "Bloom", text: "A field turning pink in a week.", color: "#F49AC1", color2: "#FFB37C" },
  { id: "ember", title: "Ember", text: "Night market lanterns, warm and close.", color: "#F4C95D", color2: "#F49AC1" },
  { id: "moss", title: "Moss", text: "Soft green on old stone walls.", color: "#BFE3A0", color2: "#7FD1C7" },
  { id: "dusk", title: "Dusk", text: "The city at six, purple going blue.", color: "#C9A7F5", color2: "#8ED0F5" },
  { id: "frost", title: "Frost", text: "Windows etched overnight.", color: "#9FB4FF", color2: "#C9A7F5" },
  { id: "coral", title: "Coral", text: "Reef color under clear water.", color: "#FF9F8E", color2: "#F4C95D" },
  { id: "sage", title: "Sage", text: "Dry hills after the first rain.", color: "#B9D8C2", color2: "#BFE3A0" },
  { id: "lilac", title: "Lilac", text: "Spring arriving all at once.", color: "#D9B8F0", color2: "#F49AC1" },
  { id: "slate", title: "Slate", text: "Storm clouds stacking up offshore.", color: "#A9B8D6", color2: "#9FB4FF" },
];

export interface Product {
  id: string;
  name: string;
  price: number;
  was?: number;
  tag?: string;
  rating: number;
  color: string;
  color2: string;
  colorName: string;
  shape: "bottle" | "box" | "sphere" | "shoe";
}

export const PRODUCTS: Product[] = [
  { id: "p1", name: "Field Bottle", price: 34, rating: 4.8, color: "#7FD1C7", color2: "#E4F6F3", colorName: "Lagoon", shape: "bottle", tag: "New" },
  { id: "p2", name: "Cloud Runner", price: 128, was: 160, rating: 4.6, color: "#F49AC1", color2: "#FCE6EF", colorName: "Blush", shape: "shoe", tag: "Sale" },
  { id: "p3", name: "Orbit Lamp", price: 89, rating: 4.9, color: "#F4C95D", color2: "#FCF2D6", colorName: "Sun", shape: "sphere" },
  { id: "p4", name: "Stack Box", price: 42, rating: 4.4, color: "#9FB4FF", color2: "#E6ECFF", colorName: "Sky", shape: "box" },
  { id: "p5", name: "Trail Bottle", price: 38, rating: 4.7, color: "#BFE3A0", color2: "#EEF8E6", colorName: "Fern", shape: "bottle" },
  { id: "p6", name: "Dusk Runner", price: 140, rating: 4.5, color: "#C9A7F5", color2: "#F1E8FC", colorName: "Iris", shape: "shoe", tag: "Limited" },
  { id: "p7", name: "Pebble Lamp", price: 74, was: 92, rating: 4.3, color: "#FFB37C", color2: "#FFEEDF", colorName: "Apricot", shape: "sphere", tag: "Sale" },
  { id: "p8", name: "Crate Box", price: 56, rating: 4.6, color: "#8ED0F5", color2: "#E2F3FC", colorName: "Pool", shape: "box" },
  { id: "p9", name: "Peak Bottle", price: 36, rating: 4.9, color: "#FF9F8E", color2: "#FFE8E4", colorName: "Coral", shape: "bottle" },
  { id: "p10", name: "Moss Runner", price: 132, rating: 4.7, color: "#B9D8C2", color2: "#EAF4ED", colorName: "Sage", shape: "shoe" },
];

export const money = (v: number) => `$${v.toFixed(0)}`;

/** Gradient "photograph" so the demos need no image assets. */
export function Art({ scene, children, style }: { scene: Pick<Scene, "color" | "color2">; children?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="art" style={{
      background: `radial-gradient(120% 90% at 15% 20%, ${scene.color2} 0%, transparent 55%),
        radial-gradient(90% 80% at 85% 85%, color-mix(in srgb, ${scene.color} 70%, #141A33) 0%, transparent 60%),
        ${scene.color}`,
      ...style,
    }}>
      <span className="art-sun" style={{ background: scene.color2 }} />
      <span className="art-hill" style={{ background: `color-mix(in srgb, ${scene.color} 55%, #141A33)` }} />
      {children}
    </div>
  );
}

/** A simple product render: a shape on a soft studio backdrop. */
export function ProductArt({ product, children }: { product: Product; children?: ReactNode }) {
  return (
    <div className="product-art" style={{ background: `radial-gradient(80% 70% at 50% 40%, #fff 0%, ${product.color2} 70%)` }}>
      <span className={"product-shape is-" + product.shape} style={{ background: product.color }} />
      <span className="product-shadow" />
      {children}
    </div>
  );
}
