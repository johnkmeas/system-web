import type { OrbitSlide } from "../patterns";

export const slides: OrbitSlide[] = [
  {
    id: "home", title: "Orbit deck", color: "#F4C95D",
    lead: "A presentation laid out as an atom. This page is the nucleus, and every other page orbits it. Open any node to read it, then press Esc or Back to return to the orbit.",
    points: [
      { h: "Open a page", t: "Click or tap any node. The view zooms into it until it fills the screen." },
      { h: "Move between pages", t: "Use the left and right arrow keys, or the dots at the bottom, without leaving slide view." },
      { h: "Return to the orbit", t: "Press Esc, the Back button, or your browser’s back button." },
    ],
  },
  {
    id: "overview", title: "Overview", color: "#7FD1C7", size: 70,
    lead: "One home page and seven subpages, circling it like electrons around a nucleus. Each ring carries up to two pages.",
    points: [
      { h: "The nucleus", t: "The home page. It sits still at the center and is always the largest node." },
      { h: "The electrons", t: "Subpages, spread across tilted rings that cross at the center." },
      { h: "The order", t: "Arrow keys follow page order, then wrap back to home." },
    ],
  },
  {
    id: "navigation", title: "Getting around", color: "#9FB4FF", size: 54,
    lead: "Everything works with a mouse, a finger or a keyboard.",
    points: [
      { h: "Pointer", t: "Click a node to open it. Drag empty space to spin and tilt the whole system." },
      { h: "Keyboard", t: "Tab moves between nodes, Enter opens one, ← and → change pages, Esc returns." },
      { h: "History", t: "Each opened page adds a history entry, so the browser’s back button closes it." },
    ],
  },
  {
    id: "transitions", title: "Transitions", color: "#F49AC1", size: 86,
    lead: "Opening a page is a camera move, and there are six to choose from in the settings menu. Each one tracks the node’s live position, so closing plays it backwards and lands on the node you’re reading.",
    points: [
      { h: "Zoom", t: "The camera dives into the node while a circle in its color grows to fill the screen." },
      { h: "Drawer", t: "The page slides in beside the orbit, which pulls back so the whole system stays in view. Click other nodes to switch pages." },
      { h: "Eclipse", t: "The node glides in front of the nucleus, the corona flares, then the page swallows the sky." },
      { h: "Slingshot", t: "The node whips around the nucleus on a gravity assist and flings open into the page." },
      { h: "Warp", t: "Stars streak past as you jump to light speed toward the node." },
      { h: "Collapse", t: "The system spirals into the nucleus like a black hole, and the page bursts out as a shockwave." },
    ],
  },
  {
    id: "editing", title: "Editing pages", color: "#BFE3A0", size: 48,
    lead: "Every page is one object in src/demos/orbit-slides.tsx: a title, a color, and either a lead with points or a custom render function.",
    points: [
      { h: "Add a page", t: "Append an object. It’s placed on the next ring automatically." },
      { h: "Reorder", t: "Array order sets ring placement and arrow-key order." },
      { h: "Fine-tune", t: "Set orbital and phase on a page to pick its ring and starting point, or pass your own orbitals." },
    ],
  },
  {
    id: "sizing", title: "Size and weight", color: "#FFB37C", size: 64,
    lead: "Planet size is a field, so it can carry meaning. Make the pages that matter most the biggest bodies in the sky.",
    points: [
      { h: "Size", t: "Diameter in layout units. The nucleus defaults to 160; nodes read well between 40 and 90." },
      { h: "Depth", t: "Perspective shrinks nodes as they swing behind the nucleus." },
      { h: "Small screens", t: "Planets never shrink below a comfortable tap target on phones." },
    ],
  },
  {
    id: "theming", title: "Color and type", color: "#C9A7F5", size: 58,
    lead: "Page backgrounds come straight from each node’s color, so the zoom reads as falling into it. The space around them follows your system’s light or dark setting.",
    points: [
      { h: "Palette", t: "Light, mid-saturation colors keep dark text readable on every page." },
      { h: "Type", t: "Unbounded for titles echoes the round nodes; Figtree handles everything else." },
      { h: "Tokens", t: "Space, ring and text colors are CSS variables on .od-root, so each deck can be themed." },
    ],
  },
  {
    id: "shipping", title: "Under the hood", color: "#8ED0F5", size: 76,
    // A custom page: anything you can render in React can live inside a node.
    render: () => (
      <>
        <h1 id="od-page-title">Under the hood</h1>
        <p className="od-lead">
          React renders the structure, Motion handles the transitions, and a single animation loop moves the nodes.
          This page uses a custom <code>render</code> instead of the built-in layout.
        </p>
        <pre className="demo-code">{`import { OrbitDeck } from "./patterns";

<OrbitDeck
  slides={[
    { id: "home", title: "Home", color: "#F4C95D", lead: "…" },
    { id: "work", title: "Work", color: "#9FB4FF", render: () => <Work /> },
  ]}
  defaultSettings={{ layout: "solar" }}
/>`}</pre>
      </>
    ),
  },
];
