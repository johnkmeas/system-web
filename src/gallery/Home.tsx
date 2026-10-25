import { useState, type CSSProperties } from "react";
import { motion } from "motion/react";
import { ScrambleText } from "../patterns";
import { ROUTES, type RouteInfo } from "./routes";

export function Home() {
  return (
    <main className="gx-home">
      <header className="gx-hero">
        <ScrambleText as="h1" text="Motion patterns" duration={900} />
        <p>Reusable navigation, slider and page-transition components for React, built on Motion. Pick one to try it.</p>
      </header>
      <ul className="gx-grid">
        {ROUTES.map((r, i) => <Tile key={r.id} route={r} index={i} />)}
      </ul>
    </main>
  );
}

function Tile({ route, index }: { route: RouteInfo; index: number }) {
  const [hover, setHover] = useState(0);
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.06, ease: [0.2, 0.7, 0.2, 1] }}>
      <motion.a href={"#/" + route.id} className="gx-tile" style={{ "--c": route.color } as CSSProperties}
        onPointerEnter={() => setHover(h => h + 1)} onFocus={() => setHover(h => h + 1)}
        whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
        <span className="gx-tile-dot" aria-hidden="true" />
        <ScrambleText as="h2" text={route.title} replay={hover} duration={450} />
        <p>{route.blurb}</p>
      </motion.a>
    </motion.li>
  );
}
