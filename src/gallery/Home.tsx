import type { CSSProperties } from "react";
import { motion } from "motion/react";
import { RollText, TextEffect } from "../patterns";
import { ROUTES, type RouteInfo } from "./routes";

export function Home() {
  return (
    <main className="gx-home">
      <header className="gx-hero">
        <TextEffect as="h1" text="Motion patterns" effect="mask" duration={0.8} stagger={0.08} />
        <p>Reusable navigation, slider and page-transition components for React, built on Motion. Pick one to try it.</p>
      </header>
      <ul className="gx-grid">
        {ROUTES.map((r, i) => <Tile key={r.id} route={r} index={i} />)}
      </ul>
    </main>
  );
}

function Tile({ route, index }: { route: RouteInfo; index: number }) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 + index * 0.06, ease: [0.2, 0.7, 0.2, 1] }}>
      <motion.a href={"#/" + route.id} className="gx-tile tx-roll-host" style={{ "--c": route.color } as CSSProperties}
        whileHover={{ y: -4 }} whileTap={{ scale: 0.98 }}>
        <span className="gx-tile-dot" aria-hidden="true" />
        <RollText as="h2" text={route.title} />
        <p>{route.blurb}</p>
      </motion.a>
    </motion.li>
  );
}
