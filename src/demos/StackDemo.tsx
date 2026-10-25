import { useState } from "react";
import { CardStack, type StackItem } from "../patterns";

const ITEMS: StackItem[] = [
  { id: "a", title: "Swipe me", body: "Drag this card left or right past the threshold, or flick it.", color: "#F4C95D" },
  { id: "b", title: "Back of the line", body: "Swiped cards tuck in at the back, so the deck never runs out.", color: "#9FB4FF" },
  { id: "c", title: "Keyboard too", body: "Focus the deck and press ← or →. The buttons below work as well.", color: "#F49AC1" },
  { id: "d", title: "Spring physics", body: "Let go before the threshold and the card springs back into place.", color: "#BFE3A0" },
  { id: "e", title: "Your content", body: "Pass renderItem to put anything on a card: images, forms, video.", color: "#FFB37C" },
  { id: "f", title: "Depth", body: "Cards below scale down and drop slightly so the stack reads as 3D.", color: "#C9A7F5" },
];

export function StackDemo() {
  const [log, setLog] = useState<string[]>([]);
  return (
    <main className="gx-demo">
      <header className="gx-demo-head">
        <h1>Card stack</h1>
        <p>{log.length ? `Last: ${log[0]}` : "Swipe the top card to send it to the back."}</p>
      </header>
      <CardStack items={ITEMS}
        onSwipe={(item, dir) => setLog(l => [`${dir > 0 ? "kept" : "skipped"} “${item.title}”`, ...l].slice(0, 5))} />
    </main>
  );
}
