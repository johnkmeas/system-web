# system-web

Reusable, motion-driven navigation patterns for React, built on [Motion](https://motion.dev). Patterns are written from scratch, using the motion.dev gallery as inspiration.

| Pattern | Component | What it does |
|---|---|---|
| Orbit deck | `OrbitDeck` | Pages orbit a home nucleus and open with a zoom-and-reveal camera move |
| Page transitions | `PageTransition` | Circle, diamond, wipe, split, slide, stack, flip, zoom, blur, blinds or fade between keyed pages |
| Carousel engine | `useCarousel`, `Carousel` + controls | Configurable slider: horizontal/vertical, RTL, loop, snap or free scroll, autoplay, grid rows, 2D effects (slide, fade, scale, parallax, cards) and 3D effects (coverflow, ring); followers sync extra tracks |
| Coverflow | `Coverflow` | 3D carousel: drag, flick, click, or ← → Home End |
| Card stack | `CardStack` | Swipe the top card away; it tucks in at the back |
| Scramble text | `ScrambleText`, `useScramble` | Text that resolves out of random glyphs |

The demo app at `/` is a gallery of all of them, and it uses `PageTransition` itself for route changes. `#/playground` lets you mix and match every slider option (and shows the code for the setup); `#/sliders` has real-world setups including e-commerce galleries, shelves and promo heroes.

`#/store` is a full e-commerce flow (home → collection → product → cart → about/FAQ) in three swappable niches: a t-shirt shop, a supplement store and a health brand. Each one has its own content, fonts and colors. The demo-settings dock has two tabs:
- **Flow**: niche, page transition (auto picks one per hop), speed, and a guided tour.
- **Motion**: scroll reveals (rise, fade, slide, zoom, blur, mask) with stagger, grid vs. slider sections with any carousel effect, autoplay, scroll parallax, velocity-reactive marquees and hover lift/tilt. Presets go from Static to Wild.

Collections have 11–12 products each. They can be filtered (new, bestsellers, sale, under the median price, top rated), sorted and shown in 2–5 columns, a bento layout or a list. Grid changes animate with the Motion tab's **Filter** setting: spring, pop, stagger, flip or blur.

Store content lives in `src/demos/store/niches.ts` and the motion layer in `src/demos/store/motion.tsx`.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # typecheck + production build to dist/
```

## Layout

```
src/
  patterns/            # reusable components, no app-specific code
    index.ts           # public exports
    orbit/             # OrbitDeck (engine, physics, views, scoped CSS)
    transitions/       # PageTransition
    carousel/          # useCarousel engine, <Carousel> renderer, controls (arrows, dots, counter, scrubber, thumbs, autoplay, lightbox)
    coverflow/         # Coverflow
    card-stack/        # CardStack
    scramble/          # ScrambleText + useScramble
  gallery/             # gallery shell: hash router + home grid
  demos/               # one demo page per pattern, plus orbit deck content
  App.tsx              # routes, wrapped in a circle PageTransition
orbit-deck.html        # original single-file prototype
```

## Usage

```tsx
import { PageTransition, Coverflow, CardStack, ScrambleText, OrbitDeck } from "./patterns";

<PageTransition pageKey={route} effect="circle" origin={{ x, y }} direction={1}>
  <Page />
</PageTransition>

const api = useCarousel({ count: items.length, loop: true, autoplay: 4000 });
<Carousel api={api} items={items} effect="coverflow" itemSize={0.4} renderItem={item => <Card item={item} />} />
<CarouselDots api={api} scaling /> <CarouselArrows api={api} />
// a second track that follows the first (e.g. captions), on its own axis
<Carousel api={api} items={items} interactive={false} orientation="y" itemSize={1} renderItem={…} />

<Coverflow items={[{ id: "a", title: "Aurora", color: "#7FD1C7" }]} onChange={setIndex} />

<CardStack items={cards} onSwipe={(card, dir) => {}} />

<ScrambleText as="h1" text="Hello" replay={hoverCount} />

<OrbitDeck slides={slides} defaultSettings={{ layout: "solar" }} />
```

Each component accepts a `renderItem` / `render` prop where it makes sense, so the visuals are yours and the motion comes from the pattern. See `src/demos/` for complete examples.
