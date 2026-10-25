import { Coverflow, type CoverflowItem } from "../patterns";

const ITEMS: CoverflowItem[] = [
  { id: "aurora", title: "Aurora", subtitle: "Light study", color: "#7FD1C7" },
  { id: "dune", title: "Dune", subtitle: "Desert series", color: "#FFB37C" },
  { id: "tide", title: "Tide", subtitle: "Coastal prints", color: "#8ED0F5" },
  { id: "bloom", title: "Bloom", subtitle: "Botanicals", color: "#F49AC1" },
  { id: "ember", title: "Ember", subtitle: "Night market", color: "#F4C95D" },
  { id: "moss", title: "Moss", subtitle: "Forest floor", color: "#BFE3A0" },
  { id: "dusk", title: "Dusk", subtitle: "City at six", color: "#C9A7F5" },
  { id: "frost", title: "Frost", subtitle: "Winter light", color: "#9FB4FF" },
];

export function CoverflowDemo() {
  return (
    <main className="gx-demo">
      <header className="gx-demo-head">
        <h1>Coverflow</h1>
        <p>Drag or flick the cards, click one to bring it forward, or focus the carousel and use ← → Home End.</p>
      </header>
      <Coverflow items={ITEMS} initialIndex={3} />
    </main>
  );
}
