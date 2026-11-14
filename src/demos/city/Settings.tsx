import type { CSSProperties } from "react";
import { STYLE_LIST, type CityStyle } from "./styles";
import { LAYOUTS, type Layout } from "./layout";
import type { LiveWeather } from "./weather";
import { ChevronIcon, CloudIcon, GearIcon, MoonIcon, ShuffleIcon, SunIcon } from "./icons";

export interface CitySettings {
  style: CityStyle;
  /** 0 = midday, 1 = night. */
  time: number;
  layout: Layout;
  /** Seed for the random layout. */
  seed: number;
  /** Landmark spacing multiplier. */
  spread: number;
  /** Share of filler blocks built. */
  density: number;
  /** Live Vancouver weather on/off. */
  weather: boolean;
  /** Panel expanded. */
  open: boolean;
}

export const DEFAULT_SETTINGS: Omit<CitySettings, "time"> = {
  style: "lowpoly", layout: "classic", seed: 1, spread: 1, density: 1, weather: false, open: false,
};

export function timeLabel(t: number) {
  return t < 0.18 ? "Midday" : t < 0.4 ? "Afternoon" : t < 0.5 ? "Golden hour" : t < 0.62 ? "Dusk" : t < 0.82 ? "Evening" : "Night";
}

interface Props {
  s: CitySettings;
  set: (patch: Partial<CitySettings>) => void;
  live: LiveWeather | null;
  liveError: boolean;
  reducedMotion: boolean;
}

export function SettingsPanel({ s, set, live, liveError }: Props) {
  const theme = STYLE_LIST.find(x => x.id === s.style)!;
  const pct = (v: number, lo: number, hi: number) => ({ "--fill": `${((v - lo) / (hi - lo)) * 100}%` } as CSSProperties);
  const summary = [theme.name, timeLabel(s.time), s.weather && live ? `${Math.round(live.tempC)}° ${live.label}` : null].filter(Boolean).join(" · ");

  return (
    <section className={"cy-settings" + (s.open ? " is-open" : "")} aria-label="City settings">
      <button className="cy-set-head" aria-label="Settings" onClick={() => set({ open: !s.open })} aria-expanded={s.open} aria-controls="cy-set-body">
        <GearIcon />
        <span className="cy-set-title">
          <strong>Settings</strong>
          {!s.open && <small>{summary}</small>}
        </span>
        <span className="cy-set-chev"><ChevronIcon /></span>
      </button>

      {s.open && (
        <div id="cy-set-body" className="cy-set-body">
          <div className="cy-set-group" role="group">
            <div className="cy-set-label">Theme <span>{theme.blurb}</span></div>
            <div className="cy-set-themes">
              {STYLE_LIST.map(t => (
                <button key={t.id} className={"cy-set-theme" + (t.id === s.style ? " is-active" : "")} aria-pressed={t.id === s.style}
                  onClick={() => set({ style: t.id })} title={t.blurb}>
                  <span className={"cy-theme-swatch is-" + t.id} aria-hidden="true">{t.swatch.map(c => <span key={c} style={{ background: c }} />)}</span>
                  <span>{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="cy-set-group" role="group">
            <div className="cy-set-label">Time of day <span>{timeLabel(s.time)}</span></div>
            <div className="cy-range-row">
              <SunIcon />
              <input type="range" className="cy-range" min={0} max={1} step={0.01} value={s.time} style={pct(s.time, 0, 1)}
                onChange={e => set({ time: +e.target.value })} aria-label="Time of day" aria-valuetext={timeLabel(s.time)} />
              <MoonIcon />
            </div>
          </div>

          <div className="cy-set-group" role="group">
            <div className="cy-set-label">Arrangement</div>
            <div className="cy-seg">
              {LAYOUTS.map(l => (
                <button key={l.id} className={l.id === s.layout ? "is-active" : ""} aria-pressed={l.id === s.layout}
                  onClick={() => set(l.id === "random" && s.layout === "random" ? { seed: s.seed + 1 } : { layout: l.id })}>
                  {l.name}
                </button>
              ))}
            </div>
            {s.layout === "random" && (
              <button className="cy-set-btn" onClick={() => set({ seed: s.seed + 1 })}>
                <ShuffleIcon /> New pattern <small>#{s.seed}</small>
              </button>
            )}
          </div>

          <div className="cy-set-group" role="group">
            <div className="cy-set-label">Landmark spread <span>{s.spread.toFixed(2)}×</span></div>
            <input type="range" className="cy-range" min={0.7} max={1.5} step={0.05} value={s.spread} style={pct(s.spread, 0.7, 1.5)}
              onChange={e => set({ spread: +e.target.value })} aria-label="Landmark spread" />
          </div>

          <div className="cy-set-group" role="group">
            <div className="cy-set-label">City density <span>{Math.round(s.density * 100)}%</span></div>
            <input type="range" className="cy-range" min={0.1} max={1} step={0.05} value={s.density} style={pct(s.density, 0.1, 1)}
              onChange={e => set({ density: +e.target.value })} aria-label="City density" />
          </div>

          <div className="cy-set-group" role="group">
            <div className="cy-set-label">Weather</div>
            <label className="cy-switch">
              <span className="cy-switch-text"><CloudIcon /> Live weather · Vancouver</span>
              <input type="checkbox" role="switch" checked={s.weather} onChange={e => set({ weather: e.target.checked })} />
              <span className="cy-switch-track" aria-hidden="true" />
            </label>
            {s.weather && (
              <p className="cy-wx" aria-live="polite">
                {liveError ? "Couldn't reach the weather service. Retrying every 10 minutes."
                  : !live ? "Checking the sky over Vancouver…"
                  : <>
                      <strong>{Math.round(live.tempC)}°C · {live.label}</strong>
                      <span>Wind {Math.round(live.wind)} km/h · cloud {Math.round(live.cloud * 100)}% · updated {live.updated.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</span>
                      {s.style === "space" && <span>There's no weather in space, so this theme ignores it.</span>}
                    </>}
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
