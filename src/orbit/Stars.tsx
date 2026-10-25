import { useState } from "react";

export function Stars({ count = 140 }: { count?: number }) {
  const [stars] = useState(() => Array.from({ length: count }, () => ({
    l: Math.random() * 100, t: Math.random() * 100,
    s: Math.random() < 0.85 ? 1 : 2, o: 0.25 + Math.random() * 0.6,
  })));
  return (
    <div className="od-stars" aria-hidden="true">
      {stars.map((st, i) => (
        <i key={i} style={{ left: st.l + "%", top: st.t + "%", width: st.s, height: st.s, opacity: st.o }} />
      ))}
    </div>
  );
}
