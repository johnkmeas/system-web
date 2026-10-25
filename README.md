# system-web

Reusable, motion-driven navigation patterns for React. The first one is **Orbit deck**: a presentation or site where pages orbit a home "nucleus" and open with a zoom-and-reveal transition.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

## Layout

```
src/
  orbit/              # the reusable component (no app-specific code)
    OrbitDeck.tsx     # public component: state, history, keyboard, zoom orchestration
    OrbitView.tsx     # nodes + rings, drag to rotate
    useOrbitEngine.ts # requestAnimationFrame loop: 3D projection, rings, zoom tracking
    physics.ts        # 2D collision sim for the "flat" layout
    math.ts           # projection, seeded PRNG, layout targets, defaults
    PageView.tsx      # opened page: default layout or custom render
    SettingsDrawer.tsx
    orbit.css         # all styles, scoped under .od-root, themed via CSS variables
  content/slides.tsx  # demo deck content
  App.tsx
orbit-deck.html       # original single-file prototype
```

## Usage

```tsx
import { OrbitDeck } from "./orbit";

<OrbitDeck
  slides={[
    { id: "home", title: "Home", color: "#F4C95D", lead: "Welcome", points: [{ h: "Hi", t: "…" }] },
    { id: "work", title: "Work", color: "#9FB4FF", size: 80, render: ({ go, close }) => <Work /> },
  ]}
  defaultSettings={{ layout: "solar", stars: false }}
  storageKey={null}       // disable localStorage persistence
  showSettings={false}    // hide the settings drawer
/>
```

Slide 0 is the nucleus. Each other slide uses the built-in layout (`lead` + `points`) or a custom `render(ctx)`, where `ctx` has `index`, `slides`, `go(i, dir?)` and `close()`.
