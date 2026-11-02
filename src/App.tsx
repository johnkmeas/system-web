import { useEffect, useRef, useState, type ReactNode } from "react";
import { OrbitDeck, PageTransition } from "./patterns";
import { Home } from "./gallery/Home";
import { ROUTES, useHashRoute } from "./gallery/routes";
import { slides } from "./demos/orbit-slides";
import { TransitionsDemo } from "./demos/TransitionsDemo";
import { CoverflowDemo } from "./demos/CoverflowDemo";
import { StackDemo } from "./demos/StackDemo";
import { TextDemo } from "./demos/TextDemo";
import { SliderPlayground } from "./demos/SliderPlayground";
import { SliderExamples } from "./demos/SliderExamples";
import { StoreDemo } from "./demos/store/StoreDemo";
import { PdpPlayground } from "./demos/pdp/PdpPlayground";

const DEMOS: Partial<Record<string, () => ReactNode>> = {
  orbit: () => <OrbitDeck slides={slides} />,
  transitions: () => <TransitionsDemo />,
  store: () => <StoreDemo />,
  pdp: () => <PdpPlayground />,
  playground: () => <SliderPlayground />,
  sliders: () => <SliderExamples />,
  coverflow: () => <CoverflowDemo />,
  stack: () => <StackDemo />,
  text: () => <TextDemo />,
  scramble: () => <TextDemo />, // old link
};

export function App() {
  const route = useHashRoute();
  const demo = DEMOS[route];
  const key = demo ? route : "home";

  // Route changes reveal with a circle grown from wherever the pointer last pressed.
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const on = (e: PointerEvent) => { lastPointer.current = { x: e.clientX, y: e.clientY }; };
    window.addEventListener("pointerdown", on, true);
    return () => window.removeEventListener("pointerdown", on, true);
  }, []);
  const lastKey = useRef(key);
  if (lastKey.current !== key) {
    lastKey.current = key;
    setOrigin(lastPointer.current);
    lastPointer.current = null;
  }

  useEffect(() => {
    const r = ROUTES.find(r => r.id === key);
    document.title = r ? `${r.title} · Motion patterns` : "Motion patterns";
  }, [key]);

  return (
    <PageTransition className="gx-root" pageKey={key} effect="circle" origin={origin} duration={0.8}>
      {demo ? (
        <>
          {demo()}
          <a href="#/" className="gx-back">← All patterns</a>
        </>
      ) : <Home />}
    </PageTransition>
  );
}
