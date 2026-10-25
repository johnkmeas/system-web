import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SETTINGS } from "./math";
import type { OrbitSettings } from "./types";

function load(defaults: OrbitSettings, key: string | null): OrbitSettings {
  if (!key) return { ...defaults };
  try { return { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") }; }
  catch { return { ...defaults }; }
}

/** Deck settings, persisted per viewer in localStorage (pass `null` to disable). */
export function useSettings(overrides: Partial<OrbitSettings> | undefined, storageKey: string | null) {
  const [defaults] = useState(() => ({ ...DEFAULT_SETTINGS, ...overrides }));
  const [settings, setSettings] = useState(() => load(defaults, storageKey));

  useEffect(() => {
    if (!storageKey) return;
    try { localStorage.setItem(storageKey, JSON.stringify(settings)); } catch { /* storage unavailable */ }
  }, [settings, storageKey]);

  const set = useCallback(<K extends keyof OrbitSettings>(k: K, v: OrbitSettings[K]) =>
    setSettings(s => ({ ...s, [k]: v })), []);
  const reset = useCallback(() => setSettings({ ...defaults }), [defaults]);

  return { settings, set, reset };
}
