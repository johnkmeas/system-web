import { useEffect, useState } from "react";

export interface RouteInfo {
  id: string;
  title: string;
  blurb: string;
  color: string;
}

export const ROUTES: RouteInfo[] = [
  { id: "orbit", title: "Orbit deck", color: "#F4C95D", blurb: "Pages orbit a home nucleus and open with six orbital transitions: zoom, drawer, eclipse, slingshot, warp and collapse." },
  { id: "transitions", title: "Page transitions", color: "#F49AC1", blurb: "Eleven effects behind one component: circle, diamond, wipe, split, slide, stack, flip, zoom, blur, blinds, fade." },
  { id: "store", title: "Store flow", color: "#FF5A36", blurb: "A full storefront, home to product to cart, with real-world page transitions across three niches." },
  { id: "playground", title: "Slider playground", color: "#C9A7F5", blurb: "One engine, every combination: direction, 2D and 3D effects, grids, loop, autoplay and controls." },
  { id: "sliders", title: "Slider examples", color: "#FFB37C", blurb: "Product gallery, shelf, promo hero, synced text, grid, vertical, 3D ring, stories, RTL." },
  { id: "coverflow", title: "Coverflow", color: "#9FB4FF", blurb: "A 3D carousel you can drag, flick, click or drive with the keyboard." },
  { id: "stack", title: "Card stack", color: "#BFE3A0", blurb: "Swipe the top card away and it tucks in at the back of the deck." },
  { id: "text", title: "Text effects", color: "#8ED0F5", blurb: "Elegant, slick and everyday type motion: mask reveals, rolls, rotating words, typewriter, decode." },
];

const read = () => window.location.hash.replace(/^#\/?/, "");

/** Minimal hash router: `#/coverflow` → "coverflow", `#/` → "". */
export function useHashRoute() {
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}
