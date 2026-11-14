import * as THREE from "three";
import type { Palette } from "./styles";

/** Deterministic random so the city looks the same on every visit. */
export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type WallPattern = "plain" | "brick" | "stone" | "planks" | "metal" | "panel" | "mud";

export interface FacadeSpec {
  pattern: WallPattern;
  /** Windows per tile. 0 columns = blank wall. */
  cols: number; rows: number;
  /** Window size as a fraction of its cell. */
  win: [number, number];
  /** Chance a window is lit at night. */
  lit: number;
  /** World units one tile covers. */
  cell: { w: number; h: number };
  /** Canvas pixels per tile edge (small + nearest filtering = pixel art). */
  res?: number;
  pixel?: boolean;
  shape?: "rect" | "arch" | "round";
  /** Lit-window colors (default: warm interior light). */
  glow?: string[];
}

/**
 * Two textures per facade:
 *  - mask: R = wall shade (brick, plank lines…), G = 0 where a window is, 1 on wall
 *  - glow: lit windows, used as the emissive map
 */
export function facadeTextures(seed: number, s: FacadeSpec) {
  const res = s.res ?? 128;
  const W = res, H = Math.round(res * (s.cell.h / s.cell.w));
  const mask = document.createElement("canvas"), glow = document.createElement("canvas");
  mask.width = glow.width = W; mask.height = glow.height = H;
  const c = mask.getContext("2d")!, g = glow.getContext("2d")!;
  const r = rng(seed);
  const wall = (v: number) => `rgb(${Math.round(v)},255,0)`;
  c.fillStyle = wall(255); c.fillRect(0, 0, W, H);
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);

  if (s.pattern === "brick") {
    const bh = Math.max(2, H / 16), bw = bh * 2.2;
    for (let y = 0, row = 0; y < H; y += bh, row++) {
      for (let x = row % 2 ? -bw / 2 : 0; x < W; x += bw) {
        c.fillStyle = wall(205 + r() * 50); c.fillRect(x + 1, y + 1, bw - 1.5, bh - 1.5);
      }
      c.fillStyle = wall(150); c.fillRect(0, y, W, 1);
    }
  } else if (s.pattern === "stone") {
    for (let y = 0; y < H;) {
      const bh = H / 10 * (0.7 + r() * 0.6);
      c.fillStyle = wall(140); c.fillRect(0, y, W, bh);
      for (let x = -r() * 20; x < W;) {
        const bw = bh * (1.2 + r() * 1.4);
        c.fillStyle = wall(185 + r() * 70); c.fillRect(x + 1.5, y + 1.5, bw - 2.5, bh - 2.5);
        x += bw;
      }
      y += bh;
    }
  } else if (s.pattern === "planks") {
    const pw = W / 10;
    for (let x = 0; x < W; x += pw) {
      c.fillStyle = wall(205 + r() * 50); c.fillRect(x, 0, pw, H);
      c.fillStyle = wall(150); c.fillRect(x, 0, 1.2, H);
    }
  } else if (s.pattern === "panel") {
    const pw = W / 2, ph = H / 4;
    for (let y = 0; y < H; y += ph) for (let x = 0; x < W; x += pw) {
      c.fillStyle = wall(225 + r() * 30); c.fillRect(x + 1, y + 1, pw - 2, ph - 2);
      c.fillStyle = wall(170); c.fillRect(x + 4, y + 4, 2, 2); c.fillRect(x + pw - 6, y + ph - 6, 2, 2);
    }
  } else if (s.pattern === "mud") {
    for (let i = 0; i < 260; i++) { c.fillStyle = wall(190 + r() * 65); c.fillRect(r() * W, r() * H, 3 + r() * 8, 2 + r() * 4); }
  } else if (s.pattern === "metal") {
    for (let x = 0; x < W; x += 6) { c.fillStyle = wall(200); c.fillRect(x, 0, 2, H); }
    c.fillStyle = wall(170); c.fillRect(0, H / 2, W, 1.5);
  }

  if (s.cols > 0) {
    const cw = W / s.cols, ch = H / s.rows;
    for (let y = 0; y < s.rows; y++) for (let x = 0; x < s.cols; x++) {
      const w = cw * s.win[0], h = ch * s.win[1];
      const px = x * cw + (cw - w) / 2, py = y * ch + (ch - h) / 2;
      const path = (ctx: CanvasRenderingContext2D) => {
        ctx.beginPath();
        if (s.shape === "round") ctx.ellipse(px + w / 2, py + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        else if (s.shape === "arch") { ctx.rect(px, py + w / 2, w, h - w / 2); ctx.ellipse(px + w / 2, py + w / 2, w / 2, w / 2, 0, Math.PI, 0); }
        else ctx.rect(px, py, w, h);
        ctx.fill();
      };
      c.fillStyle = "rgb(0,0,0)"; path(c);
      if (r() < s.lit) {
        const warm = r();
        g.fillStyle = s.glow ? s.glow[Math.floor(warm * s.glow.length)] : warm < 0.7 ? "#FFD9A0" : warm < 0.9 ? "#FFF3D6" : "#9FD4FF";
        g.globalAlpha = 0.55 + r() * 0.45; path(g); g.globalAlpha = 1;
      }
    }
  }
  return { mask: canvasTex(mask, false, s.pixel), glow: canvasTex(glow, true, s.pixel) };
}

export function canvasTex(cv: HTMLCanvasElement, srgb: boolean, pixel = false) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (pixel) { t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; }
  else t.anisotropy = 8;
  return t;
}

export type GroundKind = "modern" | "cobble" | "industrial" | "space" | "neon" | "trail";

/** One city block (road edges, lot in the middle), tiled across the ground. */
export function roadTile(p: Palette, kind: GroundKind, seed: number, pixel = false) {
  const S = pixel ? 40 : 256, cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const c = cv.getContext("2d")!;
  const r = rng(seed);
  const road = Math.round(S * 0.15); // 3 of 20 units each side
  c.fillStyle = p.ground; c.fillRect(0, 0, S, S);
  if (kind === "industrial") {
    // Concrete slabs and stains on the lot.
    c.strokeStyle = "rgba(0,0,0,.12)"; c.lineWidth = 1;
    for (let i = road; i < S - road; i += (S - road * 2) / 4) { c.beginPath(); c.moveTo(i, road); c.lineTo(i, S - road); c.moveTo(road, i); c.lineTo(S - road, i); c.stroke(); }
    for (let i = 0; i < 6; i++) { c.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.06})`; c.beginPath(); c.ellipse(road + r() * (S - road * 2), road + r() * (S - road * 2), 6 + r() * 14, 4 + r() * 10, r() * 3, 0, Math.PI * 2); c.fill(); }
  }
  if (kind === "trail") {
    // Worn footpaths wandering through grass, no straight roads.
    for (let i = 0; i < 400; i++) { c.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,240,200"},${0.04 + r() * 0.05})`; c.beginPath(); c.arc(r() * S, r() * S, 2 + r() * 6, 0, Math.PI * 2); c.fill(); }
    c.strokeStyle = p.road; c.lineCap = "round"; c.lineWidth = road * 0.55;
    c.beginPath(); c.moveTo(0, road / 2); c.bezierCurveTo(S * 0.3, road * 1.4, S * 0.6, -road * 0.3, S, road / 2); c.stroke();
    c.beginPath(); c.moveTo(road / 2, 0); c.bezierCurveTo(-road * 0.4, S * 0.35, road * 1.5, S * 0.7, road / 2, S); c.stroke();
    return canvasTex(cv, true, pixel);
  }
  if (kind === "space") {
    // Hex-ish deck plates on the lot.
    for (let y = road; y < S - road; y += 24) for (let x = road; x < S - road; x += 24) {
      c.fillStyle = `rgba(255,255,255,${0.03 + r() * 0.06})`; c.fillRect(x + 1, y + 1, 22, 22);
    }
  }
  c.fillStyle = p.road;
  c.fillRect(0, 0, S, road); c.fillRect(0, S - road, S, road);
  c.fillRect(0, 0, road, S); c.fillRect(S - road, 0, road, S);
  if (kind === "cobble") {
    for (let i = 0; i < (pixel ? 30 : 900); i++) {
      const edge = r() < 0.5, along = r() * S, across = r() * road * 2 - road;
      const x = edge ? along : (across + S) % S, y = edge ? (across + S) % S : along;
      c.fillStyle = `rgba(${r() < 0.5 ? "0,0,0" : "255,255,255"},${0.06 + r() * 0.08})`;
      c.fillRect(x, y, pixel ? 1 : 3, pixel ? 1 : 3);
    }
  } else if (kind === "space" || kind === "neon") {
    // Glowing light strips along both road edges.
    c.fillStyle = p.roadLine; c.globalAlpha = 0.9;
    const th = pixel ? 1 : 3;
    c.fillRect(0, road - th, S, th); c.fillRect(0, S - road, S, th);
    c.fillRect(road - th, 0, th, S); c.fillRect(S - road, 0, th, S);
    if (kind === "neon") {
      c.fillStyle = p.neon[0];
      for (let i = 0; i < S; i += 32) { c.fillRect(i, 0, 14, 2); c.fillRect(0, i, 2, 14); }
      // Wet sheen puddles
      for (let i = 0; i < 10; i++) { c.fillStyle = `rgba(160,120,255,${0.05 + r() * 0.08})`; c.beginPath(); c.ellipse(r() * S, r() * road, 10 + r() * 20, 2 + r() * 4, 0, 0, Math.PI * 2); c.fill(); }
    }
    c.globalAlpha = 1;
  } else {
    c.fillStyle = p.roadLine; c.globalAlpha = kind === "industrial" ? 0.9 : 0.7;
    const dash = pixel ? 4 : 24, len = pixel ? 2 : 12, th = pixel ? 1 : 2;
    for (let i = 0; i < S; i += dash) {
      c.fillRect(i, 0, len, th / 2); c.fillRect(i, S - th / 2, len, th / 2);
      c.fillRect(0, i, th / 2, len); c.fillRect(S - th / 2, i, th / 2, len);
    }
    c.globalAlpha = 1;
  }
  c.fillStyle = "rgba(0,0,0,.14)";
  c.fillRect(road, road, S - road * 2, pixel ? 1 : 3); c.fillRect(road, road, pixel ? 1 : 3, S - road * 2);
  return canvasTex(cv, true, pixel);
}

/** Patchwork fields for the farm, one texture across the whole map. */
export function fieldsTexture(p: Palette, size: number, block: number, seed: number) {
  const S = 1024, cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const c = cv.getContext("2d")!;
  const r = rng(seed);
  const k = S / size, n = Math.round(size / block);
  c.fillStyle = p.road; c.fillRect(0, 0, S, S);
  const lane = 1.6 * k;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const x = i * block * k + lane, y = j * block * k + lane, w = block * k - lane * 2;
    // Split some blocks into two fields.
    const split = r() < 0.4;
    const parts = split ? [[x, y, w / 2 - 0.5, w], [x + w / 2 + 0.5, y, w / 2 - 0.5, w]] : [[x, y, w, w]];
    for (const [fx, fy, fw, fh] of parts) {
      const col = p.fields[Math.floor(r() * p.fields.length)];
      c.fillStyle = col; c.fillRect(fx, fy, fw, fh);
      // Crop rows
      const vertical = r() < 0.5, gap = 2 + Math.floor(r() * 2);
      c.fillStyle = "rgba(0,0,0,.12)";
      for (let t = 0; t < (vertical ? fw : fh); t += gap) {
        if (vertical) c.fillRect(fx + t, fy, 0.8, fh); else c.fillRect(fx, fy + t, fw, 0.8);
      }
    }
  }
  const t = canvasTex(cv, true);
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  return t;
}
