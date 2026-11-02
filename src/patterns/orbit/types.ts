import type { ReactNode } from "react";

export interface SlidePoint {
  h: string;
  t: string;
}

/** Context handed to a slide's custom renderer. */
export interface SlideRenderContext {
  index: number;
  slides: ResolvedSlide[];
  go: (index: number, dir?: 1 | -1) => void;
  close: () => void;
}

/**
 * One page of the deck. Slide 0 is the nucleus (home); every other slide orbits it.
 * Provide `lead`/`points` for the built-in layout, or `render` for fully custom content.
 */
export interface OrbitSlide {
  id: string;
  title: string;
  color: string;
  /** Node diameter in layout units. Reads well between 40 and 90. */
  size?: number;
  /** Index into `orbitals` (atom layout). Auto-assigned if omitted. */
  orbital?: number;
  /** Starting angle on the ring, radians. Auto-assigned if omitted. */
  phase?: number;
  lead?: string;
  points?: SlidePoint[];
  render?: (ctx: SlideRenderContext) => ReactNode;
}

export interface ResolvedSlide extends OrbitSlide {
  size: number;
  orbital: number;
  phase: number;
}

/** r = radius, tilt = how edge-on the ring is (deg), spin = ring angle (deg), speed = rad/s */
export interface Orbital {
  r: number;
  tilt: number;
  spin: number;
  speed: number;
}

export interface OrbitTarget extends Orbital {
  phase: number;
}

export type Layout = "atom" | "solar" | "flat";
export type Theme = "system" | "light" | "dark";
export type TransitionMode = "zoom" | "drawer" | "eclipse" | "slingshot" | "warp" | "collapse";

export interface OrbitSettings {
  speed: number;
  paused: boolean;
  autoRotate: boolean;
  rings: boolean;
  labels: boolean;
  stars: boolean;
  theme: Theme;
  layout: Layout;
  randomness: number;
  seed: number;
  /** How a page opens from its node. */
  transition: TransitionMode;
}

export interface Camera {
  yaw: number;
  yawT: number;
  tilt: number;
  tiltT: number;
}

/** Screen position of a node this frame, in px. */
export interface NodePos {
  x: number;
  y: number;
  r: number;
}

export interface NavState {
  dir: number;
  fresh: boolean;
}
