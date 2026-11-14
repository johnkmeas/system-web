import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { District, Form } from "./links";
import { STYLES, type CityStyle, type Palette, type Theme } from "./styles";
import { facadeTextures, fieldsTexture, rng, roadTile, type FacadeSpec } from "./textures";
import { M, boxUV, cylUV, dome, gableGeo } from "./geo";
import { addSignature } from "./props";
import { LANDMARK_STYLES, buildLandmark } from "./landmarks";
import { buildFlyers, buildHabitats, buildHuts, buildMegatowers, buildPlanet, buildRain, craters, skyline } from "./fillers";

export const BLOCK = 20;

export interface Hero {
  district: District;
  group: THREE.Group;
  /** Materials that glow on hover, with their resting emissive intensity. */
  glow: { mat: THREE.MeshStandardMaterial | THREE.MeshToonMaterial; base: number; boost: number }[];
  halo: THREE.Mesh;
  beacon: THREE.Mesh;
  hover: number;
  top: number;
}

export interface World {
  group: THREE.Group;
  heroes: Hero[];
  pickables: THREE.Object3D[];
  update(dt: number, t: number, reduced: boolean): void;
  dispose(): void;
}

export type GlowMat = THREE.MeshStandardMaterial | THREE.MeshToonMaterial;

// ------------------------------------------------------------------ materials

export class Kit {
  private ramp?: THREE.DataTexture;
  roofMat: THREE.Material;
  constructor(public style: CityStyle, public p: Palette, public night: boolean) {
    this.roofMat = this.solid(p.roof);
  }

  private toonRamp() {
    if (!this.ramp) {
      this.ramp = new THREE.DataTexture(new Uint8Array([90, 170, 255]), 3, 1, THREE.RedFormat);
      this.ramp.minFilter = this.ramp.magFilter = THREE.NearestFilter;
      this.ramp.needsUpdate = true;
    }
    return this.ramp;
  }

  /** The style's base material for a flat color. */
  solid(color: THREE.ColorRepresentation, o: { rough?: number; metal?: number; flat?: boolean; emissive?: THREE.ColorRepresentation; ei?: number; side?: THREE.Side } = {}): GlowMat {
    const em = { emissive: new THREE.Color(o.emissive ?? "#000000"), emissiveIntensity: o.ei ?? 1, side: o.side ?? THREE.FrontSide };
    if (this.style === "8bit") return new THREE.MeshToonMaterial({ color, gradientMap: this.toonRamp(), ...em });
    if (this.style === "gummy") {
      return new THREE.MeshPhysicalMaterial({
        color, roughness: o.rough ?? 0.3, clearcoat: 1, clearcoatRoughness: 0.12,
        sheen: 0.5, sheenColor: new THREE.Color("#ffffff"), sheenRoughness: 0.5, ...em,
      });
    }
    return new THREE.MeshStandardMaterial({
      color, roughness: o.rough ?? 0.85, metalness: o.metal ?? 0.02, flatShading: o.flat ?? (this.style === "lowpoly" || this.style === "stoneage"), ...em,
    });
  }

  /** Wall with windows: tinted wall color, window color, lit windows at night. */
  facade(spec: FacadeSpec, seed: number, wall: THREE.ColorRepresentation) {
    const tex = facadeTextures(seed, spec);
    const m = this.solid(wall, { flat: false }) as THREE.MeshStandardMaterial;
    m.map = tex.mask;
    m.emissive = new THREE.Color("#ffffff");
    m.emissiveMap = tex.glow;
    m.emissiveIntensity = this.night ? this.p.lit : this.style === "cyberpunk" ? 0.7 : this.style === "space" ? 0.25 : 0;
    const winColor = { value: new THREE.Color(this.p.window) };
    m.onBeforeCompile = shader => {
      shader.uniforms.uWin = winColor;
      shader.fragmentShader = shader.fragmentShader
        .replace("#include <common>", "#include <common>\nuniform vec3 uWin;")
        .replace("#include <map_fragment>", `
          vec4 maskTex = texture2D( map, vMapUv );
          diffuseColor.rgb = mix( uWin, diffuseColor.rgb * maskTex.r, maskTex.g );
        `);
    };
    m.customProgramCacheKey = () => "facade";
    return m;
  }
}

const NEON = ["#FF4FD8", "#3FF0FF", "#FFD84F", "#9F7BFF"];

/** Facade look per style. */
export function facadeSpec(style: CityStyle, kind: "tower" | "house" | "barn" | "factory" | "metal" | "blank" = "tower"): FacadeSpec {
  const cell = { w: 8, h: 16 };
  if (kind === "blank") return { pattern: style === "medieval" ? "stone" : style === "stoneage" ? "mud" : "brick", cols: 0, rows: 0, win: [0, 0], lit: 0, cell: { w: 8, h: 8 } };
  switch (style) {
    case "8bit": return { pattern: "plain", cols: 4, rows: 8, win: [0.5, 0.5], lit: 0.45, cell, res: 16, pixel: true };
    case "gummy": return { pattern: "plain", cols: 3, rows: 6, win: [0.55, 0.42], lit: 0.5, cell, shape: "round" };
    case "medieval": return { pattern: "stone", cols: 2, rows: 2, win: [0.26, 0.42], lit: 0.5, cell: { w: 6, h: 6 }, shape: "arch" };
    case "farm": return kind === "barn"
      ? { pattern: "planks", cols: 2, rows: 2, win: [0.2, 0.24], lit: 0.25, cell: { w: 8, h: 8 } }
      : { pattern: "planks", cols: 2, rows: 2, win: [0.34, 0.4], lit: 0.5, cell: { w: 6, h: 6 } };
    case "industrial": return kind === "metal"
      ? { pattern: "metal", cols: 2, rows: 1, win: [0.7, 0.24], lit: 0.5, cell: { w: 12, h: 12 } }
      : { pattern: "brick", cols: 3, rows: 2, win: [0.6, 0.5], lit: 0.55, cell: { w: 12, h: 12 } };
    case "space": return { pattern: "panel", cols: 2, rows: 4, win: [0.56, 0.26], lit: 0.55, cell, glow: ["#BFE8FF", "#E8F4FF", "#9FFFE0", "#FFE2B0"] };
    case "cyberpunk": return { pattern: "plain", cols: 4, rows: 10, win: [0.66, 0.36], lit: 0.42, cell, glow: NEON.concat("#FFFFFF", "#FFE2B0") };
    case "stoneage": return kind === "house"
      ? { pattern: "mud", cols: 1, rows: 1, win: [0.22, 0.5], lit: 0.7, cell: { w: 6, h: 4 }, shape: "arch", glow: ["#FF9A40", "#FFB860"] }
      : { pattern: "stone", cols: 2, rows: 2, win: [0.2, 0.3], lit: 0.6, cell: { w: 9, h: 11 }, shape: "arch", glow: ["#FF9A40", "#FFB860", "#FF7A2A"] };
    default: return { pattern: "plain", cols: 4, rows: 8, win: [0.64, 0.56], lit: 0.42, cell };
  }
}

// ------------------------------------------------------------------ context

export interface Ctx {
  style: CityStyle; p: Palette; night: boolean; kit: Kit; group: THREE.Group;
  updaters: ((dt: number, t: number, reduced: boolean) => void)[];
  districts: District[]; half: number;
  smokeEmitters: THREE.Vector3[];
  rand: () => number;
  /** Share of filler blocks that get built, 0–1. */
  density: number;
}

export function inst(c: Ctx, geo: THREE.BufferGeometry, mat: THREE.Material | THREE.Material[], items: { m: THREE.Matrix4; color?: THREE.ColorRepresentation }[], shadow = true) {
  if (!items.length) { geo.dispose(); return null; }
  const mesh = new THREE.InstancedMesh(geo, mat, items.length);
  const col = new THREE.Color();
  items.forEach((it, i) => { mesh.setMatrixAt(i, it.m); if (it.color !== undefined) mesh.setColorAt(i, col.set(it.color)); });
  mesh.castShadow = shadow; mesh.receiveShadow = true;
  c.group.add(mesh);
  return mesh;
}

export const pick = <T,>(r: () => number, xs: T[]) => xs[Math.floor(r() * xs.length)];

const blockNoise = (x: number, z: number) => { const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453; return s - Math.floor(s); };

/** City blocks available for filler, with distance info. */
export function blocks(c: Ctx) {
  const out: { x: number; z: number; edge: number; near: boolean }[] = [];
  const heroCells = new Set(c.districts.map(d => `${d.pos[0]},${d.pos[1]}`));
  const clear = LANDMARK_STYLES.has(c.style);
  for (let x = -c.half; x <= c.half; x += BLOCK) for (let z = -c.half; z <= c.half; z += BLOCK) {
    if (heroCells.has(`${x},${z}`)) continue;
    // Thin the city out when density is turned down (stable per block, so it doesn't reshuffle).
    if (c.density < 1 && blockNoise(x, z) > c.density) continue;
    if (Math.abs(x) <= 20 && Math.abs(z) <= 20) continue; // plaza
    // Landmark themes clear the blocks beside each landmark so it has its own grounds.
    if (clear && c.districts.some(d => Math.hypot(d.pos[0] - x, d.pos[1] - z) <= 21)) continue;
    const near = c.districts.some(d => Math.hypot(d.pos[0] - x, d.pos[1] - z) < 34);
    out.push({ x, z, edge: 1 - Math.hypot(x, z) / (c.half * 1.45), near });
  }
  return out;
}

// ------------------------------------------------------------------ build

export function buildWorld(style: CityStyle, theme: Theme, districts: District[], density = 1): World {
  const def = STYLES[style];
  const p = def.palette[theme];
  const night = theme === "night";
  const group = new THREE.Group();
  const c: Ctx = {
    style, p, night, kit: new Kit(style, p, night), group, updaters: [], districts, half: def.half,
    smokeEmitters: [], rand: rng(42), density,
  };

  buildGround(c);
  if (style === "medieval") { buildHouses(c); buildCityWall(c); }
  else if (style === "farm") buildFarms(c);
  else if (style === "industrial") buildFactories(c);
  else if (style === "space") buildHabitats(c);
  else if (style === "cyberpunk") buildMegatowers(c);
  else if (style === "stoneage") buildHuts(c);
  else buildTowers(c);

  const pickables: THREE.Object3D[] = [];
  const heroes = districts.map(d => buildHero(c, d, pickables));
  buildPlaza(c);
  buildMountains(c);
  buildVehicles(c);
  if (style !== "space") buildClouds(c);
  if (style === "space") buildPlanet(c);
  if (style === "cyberpunk") { buildFlyers(c); buildRain(c); }
  if (c.smokeEmitters.length) buildSmoke(c);

  return {
    group, heroes, pickables,
    update(dt, t, reduced) { for (const u of c.updaters) u(dt, t, reduced); },
    dispose() {
      const mats = new Set<THREE.Material>();
      group.traverse(o => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose();
        if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => mats.add(x));
      });
      mats.forEach(m => {
        for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
        m.dispose();
      });
    },
  };
}

// ------------------------------------------------------------------ ground

function buildGround(c: Ctx) {
  const size = c.half * 2 + BLOCK;
  const pixel = c.style === "8bit";
  let tex: THREE.Texture;
  if (c.style === "farm") tex = fieldsTexture(c.p, size, BLOCK, 7);
  else {
    const kind = ({ medieval: "cobble", industrial: "industrial", space: "space", cyberpunk: "neon", stoneage: "trail" } as const)[c.style as "medieval"] ?? "modern";
    tex = roadTile(c.p, kind, 3, pixel);
    tex.repeat.set(size / BLOCK, size / BLOCK); // tile edges (roads) land on x, z = 10 + 20k
  }
  const groundMat = c.style === "8bit" ? c.kit.solid("#ffffff") : new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: c.style === "gummy" ? 0.55 : 0.95 });
  (groundMat as THREE.MeshStandardMaterial).map = tex;
  if (c.style === "cyberpunk" || c.style === "space") {
    // Light strips in the road texture glow.
    const gm = groundMat as THREE.MeshStandardMaterial;
    gm.emissive = new THREE.Color("#ffffff"); gm.emissiveMap = tex; gm.emissiveIntensity = c.night ? 0.4 : 0.12;
    if (c.style === "cyberpunk") { gm.roughness = 0.35; gm.metalness = 0.1; }
  }
  const city = new THREE.Mesh(new THREE.PlaneGeometry(size, size), groundMat);
  city.rotation.x = -Math.PI / 2;
  city.receiveShadow = true;
  c.group.add(city);
  const outer = new THREE.Mesh(new THREE.CircleGeometry(1300, 64), new THREE.MeshStandardMaterial({ color: c.p.outer, roughness: 1 }));
  outer.rotation.x = -Math.PI / 2;
  outer.position.y = -0.08;
  outer.receiveShadow = true;
  c.group.add(outer);
}

// ------------------------------------------------------------------ filler: towers (low poly, 8 bit, gummy)

function buildTowers(c: Ctx) {
  const r = rng(42);
  const gummy = c.style === "gummy", pixel = c.style === "8bit";
  const classes = pixel ? [4, 8, 12, 16, 20, 28] : [5, 8, 12, 16, 22, 30];
  const widths = [5, 6.5];
  const buckets = new Map<string, { m: THREE.Matrix4; color: string }[]>();
  for (const b of blocks(c)) {
    if (r() > 0.25 + b.edge) continue;
    const cap = b.near ? 2 : Math.max(0, Math.min(classes.length - 1, Math.floor(b.edge * classes.length + r() * 2.2 - 0.6)));
    const lots = r() < 0.5 ? 4 : r() < 0.6 ? 2 : 1;
    const offs = lots === 4 ? [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]] : lots === 2 ? [[-3.6, 0], [3.6, 0]] : [[0, 0]];
    for (const [ox, oz] of offs) {
      if (r() < 0.12) continue;
      const hc = Math.floor(r() * (cap + 1));
      const wc = lots === 1 ? 1 : r() < 0.6 ? 0 : 1;
      const key = `${hc}|${wc}|${r() < 0.5 ? "a" : "b"}`;
      const big = lots === 1 ? 1.6 : 1;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push({ m: M(b.x + ox, classes[hc] / 2, b.z + oz, big, 1, big), color: pick(r, c.p.wall) });
    }
  }
  const specA = facadeSpec(c.style), matA = c.kit.facade(specA, 11, "#ffffff"), matB = c.kit.facade(specA, 23, "#ffffff");
  for (const [key, items] of buckets) {
    const [hc, wc, t] = key.split("|");
    const h = classes[+hc], w = widths[+wc];
    const geo = gummy
      ? boxUV(new RoundedBoxGeometry(w, h, w, 2, 0.9), w, h, w, specA.cell)
      : boxUV(new THREE.BoxGeometry(w, h, w), w, h, w, specA.cell);
    const side = t === "a" ? matA : matB;
    inst(c, geo, gummy ? side : [side, side, c.kit.roofMat, c.kit.roofMat, side, side], items);
  }
}

// ------------------------------------------------------------------ filler: medieval houses + wall

function buildHouses(c: Ctx) {
  const r = rng(77);
  const spec = facadeSpec("medieval");
  const walls = c.kit.facade(spec, 31, "#ffffff");
  const roofMat = c.kit.solid("#ffffff");
  const houses: { m: THREE.Matrix4; color: string }[] = [], roofs: { m: THREE.Matrix4; color: string }[] = [];
  for (const b of blocks(c)) {
    if (r() > 0.55 + b.edge) continue;
    const offs = [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2], [0, -4.2], [0, 4.2]];
    for (const [ox, oz] of offs) {
      if (r() < 0.3) continue;
      const w = 3.6 + r() * 1.6, d = 3.6 + r() * 2, h = (b.near ? 3.5 : 4) + r() * (b.near ? 2 : 4);
      const rot = r() < 0.5 ? 0 : Math.PI / 2;
      houses.push({ m: M(b.x + ox, h / 2, b.z + oz, w, h, d, rot), color: pick(r, c.p.wall) });
      roofs.push({ m: M(b.x + ox, h, b.z + oz, w * 1.18, 2.2 + r() * 1.6, d * 1.12, rot), color: pick(r, c.p.roofs) });
    }
  }
  inst(c, boxUV(new THREE.BoxGeometry(1, 1, 1), 5, 6, 5, spec.cell), [walls, walls, c.kit.roofMat, c.kit.roofMat, walls, walls], houses);
  inst(c, gableGeo(), roofMat, roofs);

  // Forest beyond the walls.
  const trees: [number, number, number][] = [];
  for (let i = 0; i < 420; i++) {
    const a = r() * Math.PI * 2, d = c.half + 30 + r() * 260;
    trees.push([Math.cos(a) * d, Math.sin(a) * d, 0.8 + r() * 0.9]);
  }
  buildTrees(c, trees);
}

function buildCityWall(c: Ctx) {
  const R = c.half + 12, H = 9, T = 3;
  const spec = facadeSpec("medieval", "blank");
  const stone = c.kit.facade(spec, 5, c.p.wall[2]);
  const roof = c.kit.solid(c.p.roofs[0]);
  const segs: { m: THREE.Matrix4 }[] = [], merlons: { m: THREE.Matrix4 }[] = [];
  const towers: [number, number][] = [];
  const gate = 14;
  for (let side = 0; side < 4; side++) {
    const horiz = side < 2, sign = side % 2 ? -1 : 1;
    for (const [a, b] of [[-R, -gate], [gate, R]]) {
      const len = b - a, mid = (a + b) / 2;
      const [x, z] = horiz ? [mid, sign * R] : [sign * R, mid];
      segs.push({ m: M(x, H / 2, z, horiz ? len : T, H, horiz ? T : len) });
      for (let t = a + 1.5; t < b; t += 3) {
        const [mx, mz] = horiz ? [t, sign * R] : [sign * R, t];
        merlons.push({ m: M(mx, H + 0.8, mz, horiz ? 1.5 : T, 1.6, horiz ? T : 1.5) });
      }
    }
    for (const t of [-R, -gate - 3, gate + 3, R]) towers.push(horiz ? [t, sign * R] : [sign * R, t]);
  }
  inst(c, boxUV(new THREE.BoxGeometry(1, 1, 1), 40, H, 3, spec.cell), stone, segs);
  inst(c, new THREE.BoxGeometry(1, 1, 1), stone, merlons);
  const uniq = [...new Map(towers.map(t => [`${t[0]},${t[1]}`, t])).values()];
  inst(c, cylUV(new THREE.CylinderGeometry(4, 4.4, 15, 12), 4, 15, spec.cell), stone, uniq.map(([x, z]) => ({ m: M(x, 7.5, z) })));
  inst(c, new THREE.ConeGeometry(5, 7, 12), roof, uniq.map(([x, z]) => ({ m: M(x, 18.5, z) })));
}

// ------------------------------------------------------------------ filler: farms

function buildFarms(c: Ctx) {
  const r = rng(91);
  const barnSpec = facadeSpec("farm", "barn"), houseSpec = facadeSpec("farm", "house");
  const barnWall = c.kit.facade(barnSpec, 3, "#ffffff"), houseWall = c.kit.facade(houseSpec, 9, c.p.wall[2]);
  const metal = c.kit.solid(c.night ? "#4A505A" : "#D2D6DC", { rough: 0.4, metal: 0.15, flat: false });
  const roofMat = c.kit.solid("#ffffff");
  const hay = c.kit.solid(c.night ? "#5A4E26" : "#E2C25A", { rough: 1 });
  const barns: { m: THREE.Matrix4; color: string }[] = [], barnRoofs: { m: THREE.Matrix4; color: string }[] = [];
  const homes: { m: THREE.Matrix4 }[] = [], homeRoofs: { m: THREE.Matrix4; color: string }[] = [];
  const silos: { m: THREE.Matrix4 }[] = [], siloTops: { m: THREE.Matrix4 }[] = [], bales: { m: THREE.Matrix4 }[] = [];
  const trees: [number, number, number][] = [];
  for (const b of blocks(c)) {
    const roll = r();
    if (roll < 0.3 && !b.near) {
      const rot = r() < 0.5 ? 0 : Math.PI / 2, bx = b.x + (r() - 0.5) * 4, bz = b.z + (r() - 0.5) * 4;
      barns.push({ m: M(bx, 3, bz, 7, 6, 10, rot), color: pick(r, [c.p.wall[0], c.p.wall[1], c.p.wall[3]]) });
      barnRoofs.push({ m: M(bx, 6, bz, 8.2, 3.6, 10.6, rot), color: pick(r, c.p.roofs) });
      const sx = bx + (rot ? 7 : 5.8), sz = bz + (rot ? 5.8 : 7) * (r() < 0.5 ? 1 : -1);
      if (r() < 0.75) { const h = 9 + r() * 6; silos.push({ m: M(sx, h / 2, sz, 1.8, h, 1.8) }); siloTops.push({ m: M(sx, h, sz, 1.8, 1.4, 1.8) }); }
      for (let i = 0; i < 2 + r() * 5; i++) bales.push({ m: M(b.x + (r() - 0.5) * 14, 0.8, b.z + (r() - 0.5) * 14, 0.8, 1.4, 0.8, r() * 3, Math.PI / 2) });
    } else if (roll < 0.45) {
      const x = b.x + (r() - 0.5) * 6, z = b.z + (r() - 0.5) * 6, rot = r() < 0.5 ? 0 : Math.PI / 2;
      homes.push({ m: M(x, 2.5, z, 5, 5, 6, rot) });
      homeRoofs.push({ m: M(x, 5, z, 6, 3, 6.6, rot), color: pick(r, c.p.roofs) });
      trees.push([x + 5, z + 4, 1], [x - 5, z + 3, 0.9]);
    } else if (roll < 0.6) {
      // Tree line along one edge of the field.
      const vertical = r() < 0.5;
      for (let t = -8; t <= 8; t += 3.2) trees.push(vertical ? [b.x + 9, b.z + t, 0.7 + r() * 0.5] : [b.x + t, b.z + 9, 0.7 + r() * 0.5]);
    }
  }
  inst(c, boxUV(new THREE.BoxGeometry(1, 1, 1), 8, 6, 10, barnSpec.cell), [barnWall, barnWall, c.kit.roofMat, c.kit.roofMat, barnWall, barnWall], barns);
  inst(c, gableGeo(), roofMat, [...barnRoofs, ...homeRoofs]);
  inst(c, boxUV(new THREE.BoxGeometry(1, 1, 1), 5, 5, 6, houseSpec.cell), [houseWall, houseWall, c.kit.roofMat, c.kit.roofMat, houseWall, houseWall], homes);
  inst(c, new THREE.CylinderGeometry(1, 1, 1, 20), metal, silos);
  inst(c, dome(20), metal, siloTops);
  inst(c, new THREE.CylinderGeometry(1, 1, 1, 14), hay, bales);
  for (let i = 0; i < 260; i++) {
    const a = r() * Math.PI * 2, d = c.half + 25 + r() * 280;
    trees.push([Math.cos(a) * d, Math.sin(a) * d, 0.8 + r() * 0.9]);
  }
  buildTrees(c, trees);

  // Windmills turning in the fields.
  const white = c.kit.solid(c.night ? "#6A6E78" : "#F2EEE6", { flat: false });
  const sail = c.kit.solid(c.night ? "#4A4038" : "#8A6A4A", { side: THREE.DoubleSide });
  for (const [x, z, a] of [[-110, 70, 0.6], [100, -110, 2.4], [120, 90, -0.8], [-90, -120, 1.8]] as const) {
    const mill = new THREE.Group();
    mill.position.set(x, 0, z);
    mill.rotation.y = a;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2.8, 16, 10), white);
    tower.position.y = 8; tower.castShadow = true;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.2, 3, 10), c.kit.solid(c.p.roofs[1] ?? c.p.roof));
    cap.position.y = 17.4;
    const hub = new THREE.Group();
    hub.position.set(0, 15.5, 2.2);
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(1.6, 9, 0.15), sail);
      blade.position.y = 4.8;
      const arm = new THREE.Group();
      arm.rotation.z = (i * Math.PI) / 2;
      arm.add(blade);
      hub.add(arm);
    }
    mill.add(tower, cap, hub);
    c.group.add(mill);
    const speed = 0.6 + Math.random() * 0.3;
    c.updaters.push((dt, _t, reduced) => { if (!reduced) hub.rotation.z -= dt * speed; });
  }
}

// ------------------------------------------------------------------ filler: factories

function buildFactories(c: Ctx) {
  const r = rng(55);
  const brick = c.kit.facade(facadeSpec("industrial"), 13, "#ffffff");
  const metal = c.kit.facade(facadeSpec("industrial", "metal"), 17, "#ffffff");
  const roofMat = c.kit.solid("#ffffff");
  const concrete = c.kit.solid(c.night ? "#4A4644" : "#B8B2A8");
  const band = c.kit.solid("#C8402E", { emissive: "#C8402E", ei: c.night ? 0.25 : 0 });
  const tankMat = c.kit.solid(c.night ? "#5A5E64" : "#DCDDDA", { rough: 0.5, metal: 0.1, flat: false });
  const cont = c.kit.solid("#ffffff", { rough: 0.6 });
  const halls: Record<"brick" | "metal", { m: THREE.Matrix4; color: string }[]> = { brick: [], metal: [] };
  const teeth: { m: THREE.Matrix4; color: string }[] = [], stacks: { m: THREE.Matrix4 }[] = [], bands: { m: THREE.Matrix4 }[] = [];
  const tanks: { m: THREE.Matrix4 }[] = [], tankTops: { m: THREE.Matrix4 }[] = [], boxes: { m: THREE.Matrix4; color: string }[] = [];
  const containerColors = ["#C8402E", "#2E6AC8", "#E8A030", "#3A8A4A", "#8A8A8A"];
  for (const b of blocks(c)) {
    if (r() > 0.35 + b.edge) continue;
    const roll = r();
    if (roll < 0.62) {
      const w = 11 + r() * 4, d = 8 + r() * 5, h = (b.near ? 5 : 6) + r() * (b.near ? 2 : 5);
      const rot = r() < 0.5 ? 0 : Math.PI / 2;
      const kind = r() < 0.65 ? "brick" : "metal";
      halls[kind].push({ m: M(b.x, h / 2, b.z, w, h, d, rot), color: kind === "brick" ? pick(r, c.p.wall.slice(0, 2).concat(c.p.wall[5])) : pick(r, c.p.wall.slice(2, 5)) });
      // Sawtooth roof: a row of gables across the hall.
      const n = Math.max(2, Math.floor(d / 3)), step = d / n;
      for (let i = 0; i < n; i++) {
        const off = -d / 2 + step * (i + 0.5);
        const [ox, oz] = rot ? [off, 0] : [0, off];
        teeth.push({ m: M(b.x + ox, h, b.z + oz, w, 1.8, step * 0.98, rot + Math.PI / 2), color: pick(r, c.p.roofs) });
      }
      if (!b.near && r() < 0.18) {
        const sh = 18 + r() * 16, sx = b.x + (r() < 0.5 ? 1 : -1) * (w / 2 + 2), sz = b.z + (r() - 0.5) * 4;
        stacks.push({ m: M(sx, sh / 2, sz, 1, sh, 1) });
        bands.push({ m: M(sx, sh - 1.5, sz, 1.06, 2, 1.06) });
        c.smokeEmitters.push(new THREE.Vector3(sx, sh + 1, sz));
      }
    } else if (roll < 0.82) {
      for (const [ox, oz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) {
        if (r() < 0.25) continue;
        const h = 6 + r() * 4, rr = 3 + r() * 0.8;
        tanks.push({ m: M(b.x + ox, h / 2, b.z + oz, rr, h, rr) });
        tankTops.push({ m: M(b.x + ox, h, b.z + oz, rr, 1.2, rr) });
      }
    } else {
      for (let i = 0; i < 10; i++) {
        const lvl = Math.floor(r() * 3), ox = (r() - 0.5) * 12, oz = (r() - 0.5) * 12, rot = r() < 0.5 ? 0 : Math.PI / 2;
        boxes.push({ m: M(b.x + ox, 1.3 + lvl * 2.6, b.z + oz, 2.4, 2.6, 6, rot), color: pick(r, containerColors) });
      }
    }
  }
  const box = (spec: FacadeSpec) => boxUV(new THREE.BoxGeometry(1, 1, 1), 13, 8, 10, spec.cell);
  inst(c, box(facadeSpec("industrial")), [brick, brick, c.kit.roofMat, c.kit.roofMat, brick, brick], halls.brick);
  inst(c, box(facadeSpec("industrial", "metal")), [metal, metal, c.kit.roofMat, c.kit.roofMat, metal, metal], halls.metal);
  inst(c, gableGeo(), roofMat, teeth);
  inst(c, new THREE.CylinderGeometry(0.8, 1.2, 1, 14), concrete, stacks);
  inst(c, new THREE.CylinderGeometry(0.9, 0.9, 1, 14), band, bands, false);
  inst(c, new THREE.CylinderGeometry(1, 1, 1, 24), tankMat, tanks);
  inst(c, dome(20), tankMat, tankTops);
  inst(c, new THREE.BoxGeometry(1, 1, 1), cont, boxes);
  const trees: [number, number, number][] = [];
  for (let i = 0; i < 120; i++) { const a = r() * Math.PI * 2, d = c.half + 30 + r() * 220; trees.push([Math.cos(a) * d, Math.sin(a) * d, 0.7 + r() * 0.6]); }
  buildTrees(c, trees);
}

// ------------------------------------------------------------------ landmarks

type Tier =
  | { kind: "box"; w: number; h: number; d: number; y: number; x?: number; rot?: number; cap?: boolean }
  | { kind: "cyl"; r: number; h: number; y: number; seg: number; cap?: boolean };

const FORMS: Record<Form, Tier[]> = {
  stepped: [
    { kind: "box", w: 16, h: 22, d: 16, y: 0 }, { kind: "box", w: 12, h: 14, d: 12, y: 22 }, { kind: "box", w: 8, h: 10, d: 8, y: 36, cap: true },
  ],
  spire: [{ kind: "box", w: 10, h: 46, d: 10, y: 0, cap: true }],
  hospital: [{ kind: "box", w: 20, h: 10, d: 18, y: 0 }, { kind: "box", w: 11, h: 26, d: 11, y: 0, cap: true }],
  library: [{ kind: "box", w: 20, h: 12, d: 14, y: 0 }, { kind: "box", w: 14, h: 10, d: 10, y: 12, cap: true }],
  gallery: [{ kind: "box", w: 18, h: 12, d: 16, y: 0 }, { kind: "box", w: 13, h: 10, d: 13, y: 12, rot: 0.5, cap: true }],
  observatory: [{ kind: "box", w: 18, h: 8, d: 18, y: 0 }, { kind: "cyl", r: 7, h: 14, y: 8, seg: 24 }],
  datacenter: [{ kind: "box", w: 18, h: 14, d: 14, y: 0 }, { kind: "box", w: 8, h: 22, d: 8, y: 0, x: -5, cap: true }],
  twist: Array.from({ length: 7 }, (_, i) => ({ kind: "box" as const, w: 10, h: 6, d: 10, y: i * 6, rot: i * 0.16, cap: i === 6 })),
  hub: [
    { kind: "cyl", r: 13, h: 26, y: 0, seg: 8 }, { kind: "cyl", r: 10, h: 22, y: 26, seg: 8 }, { kind: "cyl", r: 7, h: 16, y: 48, seg: 8, cap: true },
  ],
};

function buildHero(c: Ctx, d: District, pickables: THREE.Object3D[]): Hero {
  const g = new THREE.Group();
  g.position.set(d.pos[0], 0, d.pos[1]);
  const { style, kit, p, night } = c;
  const modern = style === "lowpoly" || style === "8bit" || style === "space" || style === "cyberpunk";
  const color = new THREE.Color(d.color);
  const glow: Hero["glow"] = [];

  // Walls
  const spec = facadeSpec(style, style === "farm" ? "barn" : "tower");
  const stone = style === "stoneage";
  const wallColor =
    style === "medieval" ? new THREE.Color(p.wall[2]) :
    stone ? new THREE.Color(night ? "#7A6A58" : "#D2BC98").lerp(color, 0.08) :
    style === "cyberpunk" ? new THREE.Color(p.wall[0]).lerp(color, 0.12) :
    style === "space" ? new THREE.Color(p.wall[0]).lerp(color, night ? 0.2 : 0.12) :
    style === "farm" ? new THREE.Color("#CDBFA2").lerp(color, 0.55) :
    style === "industrial" ? new THREE.Color(p.wall[0]).lerp(color, 0.15) :
    style === "gummy" ? color.clone().lerp(new THREE.Color("#ffffff"), 0.3) :
    new THREE.Color(p.wall[0]).lerp(color, night ? 0.22 : 0.3);
  const walls = kit.facade(spec, d.id.length * 31 + 5, wallColor) as GlowMat;
  if (style === "farm" || style === "gummy") glow.push({ mat: walls, base: walls.emissiveIntensity, boost: 0.25 });

  // Accent: the district's color, glowing in modern styles.
  const accentBase = style === "cyberpunk" ? (night ? 2.4 : 1.4) : modern ? 0.6 + (night ? 0.6 : 0) : style === "industrial" ? (night ? 0.5 : 0.1) : night ? 0.25 : 0;
  const accent = kit.solid(color, { emissive: color, ei: accentBase, rough: 0.4, flat: style === "lowpoly" });
  glow.push({ mat: accent, base: accentBase, boost: modern ? 1.4 : 0.9 });
  const trim = style === "farm" ? kit.solid(night ? "#7A7A80" : "#F4F1EA", { flat: false }) : accent;
  const stoneDark = kit.solid(new THREE.Color(p.wall[2]).multiplyScalar(0.75));

  let top = 0;
  const mark = (y: number) => { top = Math.max(top, y); };
  const add = <T extends THREE.Object3D>(o: T, shadow = true) => { o.traverse(x => { x.castShadow = shadow; x.receiveShadow = true; }); g.add(o); return o; };
  const merlons: THREE.Matrix4[] = [];
  const tiers = FORMS[d.form];
  const custom = LANDMARK_STYLES.has(style);
  if (custom) top = buildLandmark(c, { d, g, top: 0, accent, foot: 10 }, glow);
  else {
  for (const t of tiers) {
    const yTop = t.y + t.h;
    mark(yTop);
    if (t.kind === "box") {
      const geo = style === "gummy"
        ? boxUV(new RoundedBoxGeometry(t.w, t.h, t.d, 3, Math.min(1.6, t.w * 0.12)), t.w, t.h, t.d, spec.cell)
        : boxUV(new THREE.BoxGeometry(t.w, t.h, t.d), t.w, t.h, t.d, spec.cell);
      const m = add(new THREE.Mesh(geo, style === "gummy" ? walls : [walls, walls, kit.roofMat, kit.roofMat, walls, walls]));
      m.position.set(t.x ?? 0, t.y + t.h / 2, 0);
      m.rotation.y = t.rot ?? 0;
      const tg = new THREE.Group(); // tier-local decorations
      tg.position.set(t.x ?? 0, 0, 0); tg.rotation.y = t.rot ?? 0;
      g.add(tg);
      const ring = (h: number, mat: THREE.Material, grow = 0.4) => {
        const s = style === "gummy" ? new THREE.Mesh(new RoundedBoxGeometry(t.w + grow, h, t.d + grow, 2, h * 0.45), mat) : new THREE.Mesh(new THREE.BoxGeometry(t.w + grow, h, t.d + grow), mat);
        s.position.y = yTop; tg.add(s); return s;
      };
      // Corner strips
      if (modern || style === "farm") for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.5, t.h, 0.5), trim);
        s.position.set((x * t.w) / 2, t.y + t.h / 2, (z * t.d) / 2); tg.add(s);
      }
      if (!t.cap) {
        if (style === "medieval") for (let i = -t.w / 2 + 0.8; i <= t.w / 2; i += 2) for (const sgn of [-1, 1]) {
          merlons.push(M(i, yTop + 0.8, (sgn * t.d) / 2, 1.2, 1.6, 1.2).premultiply(tg.matrix.clone().compose(tg.position, tg.quaternion, new THREE.Vector3(1, 1, 1))));
          merlons.push(M((sgn * t.w) / 2, yTop + 0.8, i, 1.2, 1.6, 1.2).premultiply(tg.matrix.clone().compose(tg.position, tg.quaternion, new THREE.Vector3(1, 1, 1))));
        } else ring(0.6, trim);
      } else {
        if (modern) ring(0.6, accent);
        else if (style === "gummy") {
          ring(1.4, accent, 0.8);
          const cherry = new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), accent); cherry.position.y = yTop + 2.4; tg.add(cherry); mark(yTop + 4);
        } else if (style === "medieval") {
          const h = t.w * 0.95;
          const roof = new THREE.Mesh(new THREE.ConeGeometry(t.w * 0.78, h, 4), accent);
          roof.position.y = yTop + h / 2; roof.rotation.y = Math.PI / 4; tg.add(roof); mark(yTop + h);
          addFlag(c, tg, yTop + h, color); mark(yTop + h + 6);
        } else if (style === "farm") {
          const h = t.w * 0.45;
          const roof = new THREE.Mesh(gableGeo(), kit.roofMat);
          roof.scale.set(t.w + 1, h, t.d + 1); roof.position.y = yTop; tg.add(roof); mark(yTop + h);
          const vane = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2.2, 6), accent); vane.position.y = yTop + h + 1.1; tg.add(vane); mark(yTop + h + 2.2);
        } else if (stone) {
          // Thatched pyramid over a band of the district's color
          ring(0.6, accent);
          const h = t.w * 0.7;
          const roof = new THREE.Mesh(new THREE.ConeGeometry(t.w * 0.82, h, 4), kit.solid(p.roof, { rough: 1 }));
          roof.position.y = yTop + h / 2 + 0.3; roof.rotation.y = Math.PI / 4; tg.add(roof);
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 5), accent); tip.position.y = yTop + h + 1; tg.add(tip);
          mark(yTop + h + 2);
        } else if (style === "industrial") {
          ring(0.9, accent);
          const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3, 14), stoneDark);
          tank.position.set(t.w * 0.18, yTop + 2.4, 0); tg.add(tank);
          const legs = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1, 2.6), stoneDark); legs.position.set(t.w * 0.18, yTop + 0.5, 0); tg.add(legs);
          mark(yTop + 4);
        }
      }
      add(tg);
    } else {
      const seg = style === "gummy" ? 40 : t.seg;
      const m = add(new THREE.Mesh(cylUV(new THREE.CylinderGeometry(t.r, t.r, t.h, seg, 1), t.r, t.h, spec.cell), [walls, kit.roofMat, kit.roofMat]));
      m.position.y = t.y + t.h / 2;
      // Bands up the drum
      const bandMat = style === "medieval" || stone ? stoneDark : style === "farm" ? kit.solid(night ? "#3A3E44" : "#8A9098", { metal: 0.1, rough: 0.4 }) : accent;
      const thick = style === "gummy" ? 0.7 : style === "farm" ? 0.18 : 0.32;
      const ringsAt = [yTop];
      for (const y of ringsAt) {
        if (y > yTop) continue;
        const ring = new THREE.Mesh(new THREE.TorusGeometry(t.r + 0.15, thick, 8, seg), bandMat);
        ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI / seg; ring.position.y = y;
        add(ring, false);
      }
      if (t.cap) {
        if (style === "medieval") {
          const h = t.r * 1.9;
          const roof = add(new THREE.Mesh(new THREE.ConeGeometry(t.r * 1.18, h, seg), accent));
          roof.position.y = yTop + h / 2; mark(yTop + h);
          addFlag(c, g, yTop + h, color); mark(yTop + h + 6);
        } else if (style === "farm" || style === "gummy") {
          const cap = add(new THREE.Mesh(dome(seg), style === "farm" ? kit.solid(night ? "#5A5E66" : "#D2D6DC", { metal: 0.15, rough: 0.35, flat: false }) : accent));
          cap.scale.set(t.r, t.r * (style === "farm" ? 0.7 : 0.9), t.r); cap.position.y = yTop; mark(yTop + t.r * 0.9);
          if (style === "gummy") { const cherry = add(new THREE.Mesh(new THREE.SphereGeometry(1.6, 24, 16), accent)); cherry.position.y = yTop + t.r * 0.9 + 1.2; mark(yTop + t.r * 0.9 + 2.8); }
        } else if (stone) {
          const h = t.r * 1.2;
          const roof = add(new THREE.Mesh(new THREE.ConeGeometry(t.r * 1.3, h, Math.max(8, seg)), kit.solid(p.roof, { rough: 1 })));
          roof.position.y = yTop + h / 2; mark(yTop + h);
          const tip = add(new THREE.Mesh(new THREE.ConeGeometry(1, 2.4, 6), accent)); tip.position.y = yTop + h + 0.9; mark(yTop + h + 2);
        } else if (style === "space") {
          const glass = new THREE.MeshStandardMaterial({ color: "#BFE8FF", transparent: true, opacity: 0.32, roughness: 0.1, metalness: 0.1, depthWrite: false, emissive: d.color, emissiveIntensity: night ? 0.25 : 0.05 });
          const cap = add(new THREE.Mesh(dome(40), glass), false);
          cap.scale.set(t.r, t.r * 0.8, t.r); cap.position.y = yTop; mark(yTop + t.r * 0.8);
        } else if (modern && d.form === "hub") {
          const crown = add(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 7, 7, 8), accent));
          crown.position.y = yTop + 3.5; mark(yTop + 7);
        } else if (style === "industrial") {
          const rail = add(new THREE.Mesh(new THREE.TorusGeometry(t.r - 0.2, 0.12, 6, seg), stoneDark), false);
          rail.rotation.x = Math.PI / 2; rail.position.y = yTop + 1.1;
        }
      } else if (style === "medieval") {
        // Merlons around the drum's ledge
        const n = Math.round((t.r * 2 * Math.PI) / 2.2);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          merlons.push(M(Math.cos(a) * (t.r - 0.4), yTop + 0.8, Math.sin(a) * (t.r - 0.4), 1.2, 1.6, 1.2, -a));
        }
      }
      if (modern && d.form === "hub" && !t.cap && t.y === 0) {
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
          const s = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, t.h, 0.5), accent), false);
          s.position.set(Math.cos(a) * (t.r - 0.9), t.h / 2, Math.sin(a) * (t.r - 0.9));
        }
      }
    }
  }

  if (merlons.length) {
    const mm = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), walls, merlons.length);
    merlons.forEach((m, i) => mm.setMatrixAt(i, m));
    mm.castShadow = true;
    g.add(mm);
  }

  // Form signatures that identify the district in every style.
  if (d.form === "spire" && (style === "lowpoly" || style === "8bit" || style === "cyberpunk")) {
    const ant = add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 10, 8), kit.roofMat));
    ant.position.y = top + 5; mark(top + 10);
  }
  if (style === "industrial") {
    // Every industrial landmark gets its own smokestack.
    const off = d.form === "hub" ? 15 : 10, sh = Math.max(24, top * 0.7);
    const stack = add(new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.4, sh, 14), kit.solid(night ? "#4A4644" : "#B8B2A8")));
    stack.position.set(off, sh / 2, -off * 0.4);
    const bandM = add(new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 2, 14), accent), false);
    bandM.position.set(off, sh - 1.5, -off * 0.4);
    c.smokeEmitters.push(new THREE.Vector3(d.pos[0] + off, sh + 1, d.pos[1] - off * 0.4));
  }

  // The district's signature feature, in this theme's language.
  const foot = ({ stepped: 8, spire: 5, hospital: 9, datacenter: 7, twist: 5, library: 7, gallery: 8, observatory: 9, hub: 13 } as const)[d.form];
  top = addSignature(c, { d, g, top, accent, foot });
  }

  // Beacon, ground halo, generous hit box
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, style === "8bit" ? 4 : 16, style === "8bit" ? 2 : 12), new THREE.MeshBasicMaterial({ color: d.color, transparent: true }));
  beacon.position.y = top + 1.4;
  g.add(beacon);
  const hub = d.form === "hub";
  const halo = new THREE.Mesh(
    new THREE.RingGeometry(custom ? (hub ? 27 : 21) : hub ? 15 : 11, custom ? (hub ? 28.6 : 22.6) : hub ? 17 : 12.6, style === "8bit" ? 8 : 64),
    new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = 0.06;
  g.add(halo);
  // Landmarks vary in footprint, so size their hit box from their bounds.
  let hw = hub ? 28 : 20, hd = hw, hx = 0, hz = 0;
  if (custom) {
    g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(g);
    hw = Math.max(16, bb.max.x - bb.min.x); hd = Math.max(16, bb.max.z - bb.min.z);
    hx = (bb.max.x + bb.min.x) / 2 - d.pos[0]; hz = (bb.max.z + bb.min.z) / 2 - d.pos[1];
  }
  const hit = new THREE.Mesh(new THREE.BoxGeometry(hw, top + 4, hd), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(hx, (top + 4) / 2, hz);
  hit.userData.district = d.id;
  g.add(hit);
  pickables.push(hit);
  c.group.add(g);
  return { district: d, group: g, glow, halo, beacon, hover: 0, top };
}

function addFlag(c: Ctx, parent: THREE.Object3D, y: number, color: THREE.Color) {
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 6, 6), c.kit.solid("#3A3028"));
  pole.position.y = y + 3;
  const flagPivot = new THREE.Group();
  flagPivot.position.y = y + 5;
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.8, 6, 1), c.kit.solid(color, { emissive: color, ei: c.night ? 0.4 : 0, side: THREE.DoubleSide, flat: false }));
  flag.position.x = 1.6;
  flagPivot.add(flag);
  parent.add(pole, flagPivot);
  const phase = Math.random() * 6;
  c.updaters.push((_dt, t, reduced) => { if (!reduced) flagPivot.rotation.y = Math.sin(t * 1.8 + phase) * 0.35; });
}

// ------------------------------------------------------------------ plaza & trees

export function buildTrees(c: Ctx, at: [number, number, number][]) {
  if (!at.length) return;
  const r = rng(at.length);
  const s = c.style;
  const leafGeo =
    s === "8bit" ? new THREE.BoxGeometry(3.2, 3.2, 3.2) :
    s === "gummy" ? new THREE.SphereGeometry(1.7, 24, 16) :
    s === "medieval" ? new THREE.ConeGeometry(1.9, 5.2, 7) :
    s === "farm" ? new THREE.IcosahedronGeometry(2, 1) :
    s === "stoneage" ? new THREE.ConeGeometry(2.3, 6.5, 6) :
    new THREE.IcosahedronGeometry(1.8, 0);
  const trunkGeo = s === "8bit" ? new THREE.BoxGeometry(0.8, 2, 0.8) : s === "gummy" ? new THREE.CylinderGeometry(0.16, 0.16, 3.2, 8) : new THREE.CylinderGeometry(0.25, 0.35, 2, 6);
  const leafMat = c.kit.solid("#ffffff", { flat: s !== "farm" && s !== "gummy" });
  const trunkMat = c.kit.solid(c.p.trunk);
  const leaves: { m: THREE.Matrix4; color: string }[] = [], trunks: { m: THREE.Matrix4 }[] = [];
  const trunkH = s === "gummy" ? 3.2 : 2;
  for (const [x, z, sc] of at) {
    const ry = s === "8bit" ? 0 : r() * 6;
    const leafY = s === "medieval" ? trunkH + 2.2 * sc : s === "stoneage" ? trunkH + 2.9 * sc : s === "gummy" ? trunkH + 1.4 * sc : trunkH + 1.5 * sc;
    leaves.push({ m: M(x, leafY, z, sc, sc * (s === "lowpoly" ? 1.2 : 1), sc, ry), color: pick(r, c.p.leaf) });
    trunks.push({ m: M(x, trunkH / 2, z, s === "gummy" ? 1 : sc, 1, s === "gummy" ? 1 : sc) });
  }
  inst(c, leafGeo, leafMat, leaves);
  inst(c, trunkGeo, trunkMat, trunks);
}

function buildPlaza(c: Ctx) {
  const r = rng(99);
  const pad = c.style === "gummy" ? new RoundedBoxGeometry(13.6, 0.6, 13.6, 2, 0.28) : new THREE.BoxGeometry(13.6, 0.3, 13.6);
  const padMat = c.kit.solid(c.p.pad, { rough: 1 });
  const pads: { m: THREE.Matrix4 }[] = [];
  const trees: [number, number, number][] = [];
  for (let bx = -20; bx <= 20; bx += BLOCK) for (let bz = -20; bz <= 20; bz += BLOCK) {
    if (bx === 0 && bz === 0) continue;
    pads.push({ m: M(bx, 0.15, bz) });
    const n = c.style === "industrial" ? 3 : 7;
    for (let i = 0; i < n; i++) trees.push([bx + (r() - 0.5) * 11, bz + (r() - 0.5) * 11, 0.7 + r() * 0.7]);
  }
  inst(c, pad, padMat, pads);
  buildTrees(c, trees);
}

// ------------------------------------------------------------------ mountains

function buildMountains(c: Ctx) {
  if (c.style === "8bit") return voxelMountains(c);
  if (c.style === "gummy") return gumdrops(c);
  if (c.style === "farm") { hills(c); return coneMountains(c, [[34, 640, 860, 70, 150]]); }
  if (c.style === "cyberpunk") return skyline(c);
  if (c.style === "space") { craters(c); return coneMountains(c, [[22, 470, 560, 30, 60], [30, 620, 840, 50, 110]]); }
  coneMountains(c, [[26, 470, 560, 38, 85], [34, 620, 840, 70, 150]]);
}

function coneMountains(c: Ctx, rings: [number, number, number, number, number][]) {
  const r = rng(2024);
  const rock = new THREE.Color(c.p.rock), dark = new THREE.Color(c.p.rockDark), snow = new THREE.Color(c.p.snow), col = new THREE.Color();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 });
  for (const [count, rMin, rMax, hMin, hMax] of rings) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r() * 0.2;
      const dist = rMin + r() * (rMax - rMin);
      const h = hMin + r() * (hMax - hMin);
      const rad = h * (0.9 + r() * 0.7);
      const geo = new THREE.ConeGeometry(rad, h, 7 + Math.floor(r() * 3), 4).toNonIndexed();
      const pos = geo.attributes.position as THREE.BufferAttribute;
      const jit = new Map<string, [number, number, number]>();
      for (let k = 0; k < pos.count; k++) {
        const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
        const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
        if (!jit.has(key)) {
          const peak = y > h / 2 - 0.01, base = y < -h / 2 + 0.01;
          jit.set(key, peak ? [(r() - 0.5) * rad * 0.2, 0, (r() - 0.5) * rad * 0.2]
            : [(r() - 0.5) * rad * 0.28, base ? 0 : (r() - 0.5) * h * 0.14, (r() - 0.5) * rad * 0.28]);
        }
        const [jx, jy, jz] = jit.get(key)!;
        pos.setXYZ(k, x + jx, y + jy, z + jz);
      }
      geo.computeVertexNormals();
      const colors = new Float32Array(pos.count * 3);
      for (let f = 0; f < pos.count; f += 3) {
        const t = ((pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3 + h / 2) / h + (r() - 0.5) * 0.08;
        if (t > c.p.snowLine) col.copy(snow); else col.copy(dark).lerp(rock, Math.min(1, t * 1.4));
        for (let k = 0; k < 3; k++) colors.set([col.r, col.g, col.b], (f + k) * 3);
      }
      geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.cos(a) * dist, h / 2 - 4, Math.sin(a) * dist);
      mesh.rotation.y = r() * Math.PI;
      c.group.add(mesh);
    }
  }
}

function voxelMountains(c: Ctx) {
  const r = rng(808);
  const V = 14;
  const items: { m: THREE.Matrix4; color: THREE.Color }[] = [];
  const grass = new THREE.Color(c.p.leaf[0]), rock = new THREE.Color(c.p.rock), dark = new THREE.Color(c.p.rockDark), snow = new THREE.Color(c.p.snow);
  for (const [count, rMin, rMax, hMin, hMax] of [[20, 470, 540, 5, 8], [26, 620, 800, 8, 13]] as const) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r() * 0.2, dist = rMin + r() * (rMax - rMin);
      const cx = Math.round((Math.cos(a) * dist) / V) * V, cz = Math.round((Math.sin(a) * dist) / V) * V;
      const layers = Math.round(hMin + r() * (hMax - hMin));
      for (let L = 0; L < layers; L++) {
        const rad = (layers - L) * 1.05 + 0.6;
        const t = L / layers;
        const color = t > c.p.snowLine ? snow : t > 0.3 ? rock : t > 0.12 ? dark : grass;
        for (let x = -Math.ceil(rad); x <= rad; x++) for (let z = -Math.ceil(rad); z <= rad; z++) {
          if (x * x + z * z > rad * rad) continue;
          // Hollow inside: only draw the shell of each layer.
          const inner = (Math.abs(x) + 1) ** 2 + (Math.abs(z) + 1) ** 2 <= (rad - 1) ** 2;
          if (inner && L < layers - 1) continue;
          items.push({ m: M(cx + x * V, L * V + V / 2 - 6, cz + z * V, V, V, V), color });
        }
      }
    }
  }
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), c.kit.solid("#ffffff"), items.length);
  items.forEach((it, i) => { mesh.setMatrixAt(i, it.m); mesh.setColorAt(i, it.color); });
  c.group.add(mesh);
}

function gumdrops(c: Ctx) {
  const r = rng(321);
  const items: { m: THREE.Matrix4; color: string }[] = [];
  for (const [count, rMin, rMax, hMin, hMax] of [[24, 470, 560, 40, 80], [30, 620, 840, 70, 140]] as const) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r() * 0.2, dist = rMin + r() * (rMax - rMin), h = hMin + r() * (hMax - hMin);
      items.push({ m: M(Math.cos(a) * dist, -4, Math.sin(a) * dist, h * (0.8 + r() * 0.4), h, h * (0.8 + r() * 0.4)), color: pick(r, c.p.candy) });
    }
  }
  inst(c, dome(32), c.kit.solid("#ffffff", { rough: 0.35 }), items, false);
}

function hills(c: Ctx) {
  const r = rng(444);
  const greens = c.p.leaf.concat(c.p.outer);
  const items: { m: THREE.Matrix4; color: string }[] = [];
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + r() * 0.2, dist = 400 + r() * 140, h = 22 + r() * 30, w = 70 + r() * 70;
    items.push({ m: M(Math.cos(a) * dist, -6, Math.sin(a) * dist, w, h, w * (0.7 + r() * 0.5), r() * 3), color: pick(r, greens) });
  }
  inst(c, dome(28), new THREE.MeshStandardMaterial({ color: "#ffffff", roughness: 1 }), items, false);
}

// ------------------------------------------------------------------ vehicles

function buildVehicles(c: Ctx) {
  if (c.style === "farm" || c.style === "medieval" || c.style === "stoneage") return;
  const r = rng(5);
  const n = c.style === "industrial" ? 110 : 140;
  const lanes: number[] = [];
  for (let v = -c.half - BLOCK / 2; v <= c.half + BLOCK / 2; v += BLOCK) lanes.push(v);
  const geo =
    c.style === "gummy" ? new THREE.CapsuleGeometry(0.7, 1.4, 6, 12).rotateX(Math.PI / 2) :
    c.style === "industrial" ? new THREE.BoxGeometry(1.6, 1.5, 4) :
    c.style === "space" ? new THREE.CapsuleGeometry(0.8, 1.6, 4, 10).rotateX(Math.PI / 2) :
    new THREE.BoxGeometry(1.2, 0.7, 2.4);
  const mat = c.style === "space" || c.style === "cyberpunk"
    ? new THREE.MeshBasicMaterial({ color: "#ffffff" })
    : c.kit.solid("#ffffff", { emissive: "#FFE7B0", ei: c.p.carLight, rough: 0.5 });
  const mesh = new THREE.InstancedMesh(geo, mat, n);
  const bodyColors = c.style === "space" || c.style === "cyberpunk" ? c.p.neon : c.style === "gummy" ? c.p.candy : c.style === "industrial" ? ["#E8A030", "#D86A2A", "#C8C2B8", "#4A6A8A"] : c.night ? ["#111111"] : ["#E4E7EE", "#C8CDD8", "#F2F2F2"];
  const cars = Array.from({ length: n }, (_, i) => {
    const dir = r() < 0.5 ? 1 : -1;
    mesh.setColorAt(i, new THREE.Color(pick(r, bodyColors)));
    return {
      axis: r() < 0.5 ? "x" : "z", lane: lanes[Math.floor(r() * lanes.length)] + dir * 1.4,
      pos: (r() - 0.5) * c.half * 2, speed: dir * (c.style === "gummy" ? 6 + r() * 6 : 10 + r() * 14),
    };
  });
  const tmp = new THREE.Object3D(), L = c.half + BLOCK / 2;
  const y = c.style === "industrial" ? 0.75 : c.style === "gummy" ? 0.75 : c.style === "space" ? 1.6 : 0.4;
  const place = (dt: number) => {
    cars.forEach((car, i) => {
      car.pos += car.speed * dt;
      if (car.pos > L) car.pos -= L * 2; else if (car.pos < -L) car.pos += L * 2;
      if (car.axis === "x") { tmp.position.set(car.pos, y, car.lane); tmp.rotation.set(0, Math.PI / 2, 0); }
      else { tmp.position.set(car.lane, y, car.pos); tmp.rotation.set(0, 0, 0); }
      tmp.updateMatrix();
      mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  c.group.add(mesh);
  c.updaters.push((dt, _t, reduced) => { if (!reduced) place(dt); });
}

// ------------------------------------------------------------------ clouds & smoke

function buildClouds(c: Ctx) {
  const r = rng(12);
  const s = c.style;
  const geo = s === "8bit" ? new THREE.BoxGeometry(1, 1, 1) : s === "lowpoly" || s === "medieval" ? new THREE.IcosahedronGeometry(1, 0) : new THREE.SphereGeometry(1, 18, 12);
  const mat = s === "8bit" ? c.kit.solid(c.p.cloud) : new THREE.MeshStandardMaterial({ color: c.p.cloud, roughness: 1, flatShading: s === "lowpoly" || s === "medieval", transparent: true, opacity: s === "industrial" ? 0.75 : s === "cyberpunk" ? 0.55 : 0.95 });
  const puffs: { base: THREE.Vector3; scale: THREE.Vector3 }[] = [];
  const count = 16;
  for (let i = 0; i < count; i++) {
    const cx = (r() - 0.5) * 1000, cz = (r() - 0.5) * 1000, cy = s === "cyberpunk" ? 95 + r() * 25 : s === "industrial" ? 130 + r() * 40 : 120 + r() * 60;
    const n = 4 + Math.floor(r() * 3);
    for (let k = 0; k < n; k++) {
      const sz = s === "8bit" ? 14 + Math.floor(r() * 2) * 7 : 10 + r() * 10;
      puffs.push({
        base: new THREE.Vector3(cx + (k - n / 2) * sz * 0.9, cy + (s === "8bit" ? 0 : (r() - 0.5) * 6), cz + (r() - 0.5) * sz),
        scale: s === "8bit" ? new THREE.Vector3(sz * 1.2, sz * 0.6, sz) : new THREE.Vector3(sz, sz * 0.62, sz * 0.9),
      });
    }
  }
  const mesh = new THREE.InstancedMesh(geo, mat, puffs.length);
  let drift = 0;
  const tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3();
  const place = () => {
    puffs.forEach((pf, i) => {
      p.copy(pf.base); p.x = ((p.x + drift + 600) % 1200 + 1200) % 1200 - 600;
      mesh.setMatrixAt(i, tmp.compose(p, q, pf.scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  place();
  c.group.add(mesh);
  c.updaters.push((dt, _t, reduced) => { if (!reduced) { drift += dt * 6; place(); } });
}

function buildSmoke(c: Ctx) {
  const per = 10;
  const emitters = c.smokeEmitters;
  const n = emitters.length * per;
  const mat = new THREE.MeshStandardMaterial({ color: c.p.smoke, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false, flatShading: true });
  const mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat, n);
  const life = 7;
  const parts = Array.from({ length: n }, (_, i) => ({ e: Math.floor(i / per), age: ((i % per) / per) * life }));
  const tmp = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), s = new THREE.Vector3();
  const place = (dt: number) => {
    parts.forEach((pt, i) => {
      pt.age = (pt.age + dt) % life;
      const k = pt.age / life, e = emitters[pt.e];
      p.set(e.x + k * 14, e.y + k * 22, e.z + Math.sin(pt.e + k * 3) * 2);
      const sc = (1.2 + k * 5) * Math.sin(Math.min(1, k * 1.15) * Math.PI) ** 0.6;
      mesh.setMatrixAt(i, tmp.compose(p, q, s.setScalar(Math.max(0.01, sc))));
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  c.group.add(mesh);
  c.updaters.push((dt, _t, reduced) => place(reduced ? 0 : dt));
}
