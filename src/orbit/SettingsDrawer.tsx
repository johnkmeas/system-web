import { useEffect, useRef, type CSSProperties } from "react";
import { motion } from "motion/react";
import type { Layout, OrbitSettings, ResolvedSlide, Theme } from "./types";

type BoolKey = { [K in keyof OrbitSettings]: OrbitSettings[K] extends boolean ? K : never }[keyof OrbitSettings];

interface SettingsDrawerProps {
  slides: ResolvedSlide[];
  settings: OrbitSettings;
  set: <K extends keyof OrbitSettings>(k: K, v: OrbitSettings[K]) => void;
  onClose: () => void;
  onResetView: () => void;
  onResetAll: () => void;
  onJump: (index: number) => void;
}

const LAYOUTS: [Layout, string][] = [["atom", "Atom"], ["solar", "Solar"], ["flat", "Flat"]];
const THEMES: [Theme, string][] = [["system", "System"], ["light", "Light"], ["dark", "Dark"]];

export function SettingsDrawer({ slides, settings, set, onClose, onResetView, onResetAll, onJump }: SettingsDrawerProps) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const id = setTimeout(() => closeRef.current?.focus({ preventScroll: true }), 60);
    return () => clearTimeout(id);
  }, []);

  const toggle = (k: BoolKey, label: string) => (
    <div className="od-row">
      <label htmlFor={"od-set-" + k}>{label}</label>
      <input id={"od-set-" + k} type="checkbox" role="switch" className="od-switch"
        checked={settings[k]} onChange={e => set(k, e.target.checked)} />
    </div>
  );

  return (
    <motion.aside
      className="od-drawer" role="dialog" aria-modal="true" aria-labelledby="od-drawer-title"
      initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
      transition={{ type: "tween", duration: 0.32, ease: [0.2, 0.7, 0.2, 1] }}>
      <div className="od-drawer-head">
        <h2 id="od-drawer-title">Settings</h2>
        <button className="od-x" ref={closeRef} aria-label="Close settings" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>
      </div>

      <section>
        <h3>Motion</h3>
        <div className="od-row">
          <label htmlFor="od-set-speed">Orbit speed</label>
          <span className="od-val">{settings.speed.toFixed(1)}×</span>
        </div>
        <input id="od-set-speed" className="od-range" type="range" min="0.1" max="3" step="0.1"
          value={settings.speed} onChange={e => set("speed", parseFloat(e.target.value))} />
        {toggle("paused", "Pause orbits")}
        {toggle("autoRotate", "Auto-rotate view")}
      </section>

      <section>
        <h3>Arrangement</h3>
        <div className="od-seg" role="group" aria-label="Layout">
          {LAYOUTS.map(([v, l]) => (
            <button key={v} aria-pressed={settings.layout === v} onClick={() => set("layout", v)}>{l}</button>
          ))}
        </div>
        <div className="od-row">
          <label htmlFor="od-set-random">Randomness</label>
          <span className="od-val">{Math.round(settings.randomness * 100)}%</span>
        </div>
        <input id="od-set-random" className="od-range" type="range" min="0" max="1" step="0.05"
          value={settings.randomness} onChange={e => set("randomness", parseFloat(e.target.value))} />
        <div className="od-btns" style={{ marginTop: "12px" }}>
          <button className="od-ghost" onClick={() => {
            set("seed", Math.floor(Math.random() * 1e6));
            if (settings.randomness < 0.3) set("randomness", 0.6);
          }}>Shuffle arrangement</button>
        </div>
      </section>

      <section>
        <h3>Display</h3>
        {toggle("rings", "Orbit paths")}
        {toggle("labels", "Node labels")}
        {toggle("stars", "Stars")}
        <div className="od-row"><span>Theme</span></div>
        <div className="od-seg" role="group" aria-label="Theme">
          {THEMES.map(([v, l]) => (
            <button key={v} aria-pressed={settings.theme === v} onClick={() => set("theme", v)}>{l}</button>
          ))}
        </div>
      </section>

      <section>
        <h3>Pages</h3>
        <ul className="od-page-list">
          {slides.map((s, i) => (
            <li key={s.id}>
              <button style={{ "--c": s.color } as CSSProperties} onClick={() => onJump(i)}><i />{s.title}</button>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3>Reset</h3>
        <div className="od-btns">
          <button className="od-ghost" onClick={onResetView}>Reset view angle</button>
          <button className="od-ghost" onClick={onResetAll}>Restore defaults</button>
        </div>
      </section>
    </motion.aside>
  );
}
