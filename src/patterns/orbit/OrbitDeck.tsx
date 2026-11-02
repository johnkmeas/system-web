import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { animate, AnimatePresence, motion, MotionConfig, useMotionValue, type AnimationPlaybackControls } from "motion/react";
import { DEFAULT_ORBITALS, EASE, resolveSlides } from "./math";
import { DRAWER_WIDE, transitionDuration } from "./transitions";
import { OrbitView } from "./OrbitView";
import { PageView } from "./PageView";
import { SettingsDrawer } from "./SettingsDrawer";
import { Stars } from "./Stars";
import { useSettings } from "./useSettings";
import type { Camera, NavState, NodePos, Orbital, OrbitSettings, OrbitSlide } from "./types";
import "./orbit.css";

export interface OrbitDeckProps {
  /** Slide 0 is the nucleus (home); the rest orbit it. */
  slides: OrbitSlide[];
  /** Ring definitions for the atom layout. */
  orbitals?: Orbital[];
  /** Initial settings, merged over the built-in defaults. */
  defaultSettings?: Partial<OrbitSettings>;
  /** localStorage key for persisting settings; `null` disables persistence. */
  storageKey?: string | null;
  /** Show the settings drawer button. */
  showSettings?: boolean;
  className?: string;
}

// First paint before the engine's next frame takes over.
const pageStart = (drawer: boolean): CSSProperties => !drawer
  ? { clipPath: "circle(0px at -200px -200px)" }
  : { transform: window.innerWidth >= DRAWER_WIDE ? "translate3d(100%, 0, 0)" : "translate3d(0, 100%, 0)" };
const prefersReduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function OrbitDeck({
  slides: rawSlides,
  orbitals = DEFAULT_ORBITALS,
  defaultSettings,
  storageKey = "orbit-deck-settings",
  showSettings = true,
  className,
}: OrbitDeckProps) {
  const slides = useMemo(() => resolveSlides(rawSlides, orbitals), [rawSlides, orbitals]);
  const { settings, set, reset } = useSettings(defaultSettings, storageKey);
  const [active, setActive] = useState<number | null>(null);
  const [menu, setMenu] = useState(false);
  const [nav, setNav] = useState<NavState>({ dir: 0, fresh: true });

  const rootRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef(settings);
  const camRef = useRef<Camera>({ yaw: 0, yawT: 0, tilt: 0, tiltT: 0 });
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuWasOpen = useRef(false);
  const posRef = useRef<NodePos[]>([]);
  const lastIndex = useRef<number | null>(null);
  const trackRef = useRef<number | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<HTMLDivElement>(null);
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const layerRef = useRef(1);
  const closingRef = useRef(false);
  const anim = useRef<AnimationPlaybackControls | null>(null);
  const progress = useMotionValue(0);
  const open = active !== null;

  useEffect(() => { settingsRef.current = settings; }, [settings]);

  const runTo = useCallback((v: number) => {
    anim.current?.stop();
    anim.current = animate(progress, v, {
      duration: prefersReduced() ? 0.3 : transitionDuration(settingsRef.current.transition),
      ease: EASE,
    });
    return anim.current;
  }, [progress]);

  const openPage = useCallback((i: number) => {
    closingRef.current = false;
    lastIndex.current = i;
    trackRef.current = i;
    setNav({ dir: 0, fresh: true });
    setActive(i);
    runTo(1);
    try { history.pushState({ orbitPage: i }, ""); } catch { /* sandboxed */ }
  }, [runTo]);

  const closeAnim = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    runTo(0).finished.then(() => {
      if (closingRef.current && progress.get() <= 0.0005) {
        closingRef.current = false;
        setActive(null);
      }
    });
  }, [runTo, progress]);

  const close = useCallback(() => {
    closeAnim();
    try {
      if (history.state && history.state.orbitPage !== undefined) history.back();
    } catch { /* sandboxed */ }
  }, [closeAnim]);

  const go = useCallback((i: number, dir: 1 | -1) => {
    lastIndex.current = i;
    trackRef.current = i;
    layerRef.current += 1;
    setNav({ dir, fresh: false });
    setActive(i);
    try { history.replaceState({ orbitPage: i }, ""); } catch { /* sandboxed */ }
  }, []);

  // keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (active === null || closingRef.current) return;
      const n = slides.length;
      if (e.key === "Escape") { e.preventDefault(); close(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go((active + 1) % n, 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go((active - 1 + n) % n, -1); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, close, go, slides.length]);

  // browser back closes the page
  useEffect(() => {
    const onPop = () => { if (progress.get() > 0) closeAnim(); };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [closeAnim, progress]);

  // menu: Esc closes it, focus returns to the menu button
  useEffect(() => {
    if (!menu) {
      if (menuWasOpen.current) menuBtnRef.current?.focus({ preventScroll: true });
      menuWasOpen.current = false;
      return;
    }
    menuWasOpen.current = true;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); setMenu(false); } };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menu]);

  const jump = useCallback((i: number) => {
    menuWasOpen.current = false;
    setMenu(false);
    setTimeout(() => openPage(i), 180);
  }, [openPage]);

  // focus moves into the page, then back to the node it came from
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => backBtnRef.current?.focus({ preventScroll: true }), 60);
      return () => clearTimeout(id);
    }
    const i = lastIndex.current;
    if (i !== null) rootRef.current?.querySelector<HTMLElement>(`[data-node="${i}"]`)?.focus({ preventScroll: true });
  }, [open]);

  const drawer = settings.transition === "drawer";
  // In drawer mode the orbit stays live: clicking another node swaps the page.
  const onNode = useCallback((i: number) => {
    if (active !== null && drawer && !closingRef.current) {
      if (i !== active) go(i, i > active ? 1 : -1);
      return;
    }
    openPage(i);
  }, [active, drawer, go, openPage]);

  const resetView = () => { camRef.current.yawT = 0; camRef.current.tiltT = 0; };
  const color = slides[active ?? lastIndex.current ?? 0].color;

  return (
    <MotionConfig reducedMotion="user">
      <div
        ref={rootRef}
        className={"od-root" + (className ? " " + className : "")}
        data-theme={settings.theme === "system" ? undefined : settings.theme}>
        {settings.stars && <Stars />}

        <div className="od-stage" ref={stageRef} inert={open && !drawer} aria-hidden={(open && !drawer) || undefined}>
          <OrbitView slides={slides} orbitals={orbitals} settings={settings} settingsRef={settingsRef}
            progress={progress} posRef={posRef} trackRef={trackRef}
            stageRef={stageRef} overlayRef={overlayRef} fxRef={fxRef} cam={camRef}
            current={open && drawer ? active : null} onOpen={onNode} />
        </div>

        <div className="od-fx" ref={fxRef} aria-hidden="true">
          <div className="od-corona" />
          <div className="od-warp" />
        </div>

        {showSettings && !open && (
          <button className="od-menu-btn" ref={menuBtnRef}
            aria-label="Open settings" aria-expanded={menu}
            onClick={() => setMenu(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        )}

        <AnimatePresence>
          {menu && (
            <motion.div key="scrim" className="od-scrim" onClick={() => setMenu(false)}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }} />
          )}
          {menu && (
            <SettingsDrawer key="drawer" slides={slides} settings={settings} set={set}
              onClose={() => setMenu(false)}
              onResetView={resetView}
              onResetAll={() => { reset(); resetView(); }}
              onJump={jump} />
          )}
        </AnimatePresence>

        <motion.p className="od-hint"
          initial={{ opacity: 0 }}
          animate={{ opacity: open ? 0 : 1 }}
          transition={{ duration: open ? 0.2 : 0.6, delay: open ? 0 : 0.5 }}>
          {settings.layout === "flat" ? "Click a node to open it." : "Click a node to open it. Drag to rotate the view."}
        </motion.p>

        {open && (
          <div className={"od-page" + (drawer ? " is-drawer" : "")} ref={overlayRef} role="dialog"
            aria-modal={!drawer} aria-labelledby="od-page-title" style={pageStart(drawer)}>
            <div className="od-page-bgs" aria-hidden="true">
              <AnimatePresence initial={false}>
                <motion.div
                  key={slides[active].id}
                  className="od-page-bg"
                  style={{ backgroundColor: color, zIndex: layerRef.current }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0.999, transition: { duration: 0.5 } }}
                  transition={{ duration: 0.45, ease: "easeOut" }} />
              </AnimatePresence>
            </div>
            <div className="od-page-scroll">
              <PageView slides={slides} index={active} nav={nav} onClose={close} onGo={go} backBtnRef={backBtnRef}
                closeLabel={drawer ? "Close" : "Back to orbit"} />
            </div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
