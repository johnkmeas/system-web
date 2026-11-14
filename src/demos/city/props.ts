/**
 * Signature props for the city themes (low poly, gummy, 8 bit, cyberpunk): each
 * tower gets a rooftop feature that says what its district does. The other
 * themes build whole landmark buildings instead (see landmarks.ts).
 *
 *   storefront → shopping   email → messages   telehealth → the hospital
 *   backend → infrastructure   test → checking   products → the catalog
 *   knowledge → the library   media → the studio   analytics → the observatory
 */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import type { District } from "./links";
import type { CityStyle, Palette } from "./styles";
import { CHECK, M, gearShape, heartShape, slab } from "./geo";
import type { Kit } from "./world";

type GlowMat = THREE.MeshStandardMaterial | THREE.MeshToonMaterial;
type Upd = (dt: number, t: number, reduced: boolean) => void;

export interface PropCtx {
  style: CityStyle; p: Palette; night: boolean; kit: Kit;
  updaters: Upd[]; smokeEmitters: THREE.Vector3[];
}

export interface SigInput {
  d: District;
  g: THREE.Group;
  top: number;
  accent: GlowMat;
  /** Half-width of the building's base. */
  foot: number;
}

/** Add the district's signature feature. Returns the new top height. */
export function addSignature(c: PropCtx, s: SigInput): number {
  const b = new Builder(c, s);
  b.structure();
  switch (c.style) {
    case "lowpoly": case "gummy": b.icons(); break;
    case "8bit": b.pixels(); break;
    case "cyberpunk": b.cyber(); break;
  }
  return b.top;
}

// ------------------------------------------------------------------ shared pieces

const PIXELS: Record<string, string[]> = {
  bag: ["..ooo..", ".o...o.", "XXXXXXX", "XXXXXXX", "XXwwwXX", "XXXXXXX", "XXXXXXX"],
  envelope: ["wwwwwwwww", "wXwwwwwXw", "wwXwwwXww", "wwwXwXwww", "wwwwXwwww", "wwwwwwwww"],
  heart: [".XX.XX.", "XwXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  cloud: ["...www...", "..wwwww..", ".wwwwwwww", "wwwwwwwww", ".XXXXXXX."],
  check: [".......XX", "......XX.", "XX...XX..", ".XX.XX...", "..XXX....", "...X....."],
  tub: [".XXXXX.", ".XXXXX.", "wwwwwww", "wXXXXXw", "wXwwwXw", "wXXXXXw", "wwwwwww"],
  book: [".XXX.XXX.", "XwwwXwwwX", "XwooXwooX", "XwwwXwwwX", "XwooXwooX", "XwwwXwwwX", ".XXXXXXX."],
  palette: ["..XXXXX..", ".XrXXXgX.", "XXXXXXXXX", "XbXX..XXX", "XXXX..XyX", ".XXXXXXX.", "..XXXX..."],
  chart: ["o......X.", "o....X.X.", "o..w.X.X.", "o..w.X.X.", "oX.w.X.X.", "ooooooooo"],
};

/** Ground position of the home camera (see scene.ts). */
const HOME = [175, 245] as const;

export class Builder {
  top: number;
  color: THREE.Color;
  out: THREE.Vector2;
  /** Y rotation that points local +z toward the camera's home position (snapped to a face). */
  face: number;
  constructor(protected c: PropCtx, protected s: SigInput) {
    this.top = s.top;
    this.color = new THREE.Color(s.d.color);
    const [x, z] = s.d.pos;
    // Face the default camera (it sits at +x, +z), so props in front are visible on arrival.
    const v = new THREE.Vector2(HOME[0] - x, HOME[1] - z).normalize();
    this.face = Math.abs(v.x) > Math.abs(v.y) ? (v.x > 0 ? Math.PI / 2 : -Math.PI / 2) : v.y > 0 ? 0 : Math.PI;
    this.out = new THREE.Vector2(Math.sin(this.face), Math.cos(this.face));
  }

  // ---- utilities
  protected get kit() { return this.c.kit; }
  protected solid(color: THREE.ColorRepresentation, o: Parameters<Kit["solid"]>[1] = {}) { return this.kit.solid(color, o); }
  protected glow(color: THREE.ColorRepresentation, ei = 1.2) { return this.kit.solid(color, { emissive: color, ei, flat: false }); }
  protected holo(color: THREE.ColorRepresentation, opacity = 0.6) {
    return new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
  }
  protected add<T extends THREE.Object3D>(o: T, shadow = true) {
    o.traverse(x => { x.castShadow = shadow; x.receiveShadow = true; });
    this.s.g.add(o);
    return o;
  }
  protected mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m;
  }
  protected mark(y: number) { this.top = Math.max(this.top, y); }
  /** A group placed on the ground in front of the building, facing out. */
  protected front(extra = 3) {
    const g = new THREE.Group();
    const d = this.s.foot + extra;
    g.position.set(this.out.x * d, 0, this.out.y * d);
    g.rotation.y = this.face;
    return this.add(g);
  }
  /** A group mounted on the building's outward wall. */
  protected wall(y: number) {
    const g = new THREE.Group();
    g.position.set(this.out.x * (this.s.foot + 0.15), y, this.out.y * (this.s.foot + 0.15));
    g.rotation.y = this.face;
    return this.add(g, false);
  }
  protected on(fn: Upd) { this.c.updaters.push(fn); }
  protected spin(o: THREE.Object3D, speed = 0.6) { this.on((dt, _t, r) => { if (!r) o.rotation.y += dt * speed; }); }
  protected bob(o: THREE.Object3D, amp = 0.8, speed = 1.4, step = 0) {
    const y0 = o.position.y, ph = this.s.d.pos[0] * 0.1;
    this.on((_dt, t, r) => {
      if (r) return;
      let off = Math.sin(t * speed + ph) * amp;
      if (step) off = Math.round(off / step) * step;
      o.position.y = y0 + off;
    });
  }
  /** Expanding, fading rings, like a broadcast signal. */
  protected signal(parent: THREE.Object3D, y: number, color: THREE.ColorRepresentation, tilt = 0, size = 6) {
    const rings = [0, 1, 2].map(i => {
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.08, 6, 40), this.holo(color, 0.8));
      m.rotation.x = Math.PI / 2 + tilt; m.position.y = y;
      parent.add(m);
      return { m, ph: i / 3 };
    });
    this.on((_dt, t, r) => {
      for (const ring of rings) {
        const k = r ? 0.5 : (t * 0.5 + ring.ph) % 1;
        ring.m.scale.setScalar(0.5 + k * size);
        (ring.m.material as THREE.MeshBasicMaterial).opacity = (1 - k) * 0.8;
      }
    });
  }
  protected scrollTex(draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, w = 64, h = 256) {
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    draw(cv.getContext("2d")!, w, h);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ---- icon library (≈ 6 units, centered)
  protected icon(kind: "bag" | "envelope" | "heart" | "cross" | "cloud" | "check" | "magnifier" | "tub" | "gear" | "server" | "book" | "palette" | "chart", mat: THREE.Material, alt: THREE.Material) {
    const soft = this.c.style === "gummy";
    const g = new THREE.Group();
    const box = (w: number, h: number, d: number) => soft ? new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.3) : new THREE.BoxGeometry(w, h, d);
    const bev = soft ? 0.35 : 0;
    switch (kind) {
      case "bag": {
        g.add(this.mesh(box(5, 5, 2.4), mat));
        const handle = this.mesh(new THREE.TorusGeometry(1.4, 0.3, 8, 24, Math.PI), alt, 0, 2.4, 0);
        g.add(handle);
        g.add(this.mesh(box(2.4, 0.5, 2.5), alt, 0, 0.6, 0));
        break;
      }
      case "envelope": {
        g.add(this.mesh(box(6, 4, 0.7), mat));
        for (const side of [1, -1]) for (const dir of [1, -1]) {
          const flap = this.mesh(new THREE.BoxGeometry(3.7, 0.3, 0.1), alt, dir * 1.45, 0.75, side * 0.38);
          flap.rotation.z = dir * -0.6; g.add(flap);
        }
        break;
      }
      case "heart": g.add(this.mesh(slab(heartShape(1.25), 1.4, bev), mat)); break;
      case "cross": g.add(this.mesh(box(5.4, 1.8, 1.8), mat), this.mesh(box(1.8, 5.4, 1.8), mat)); break;
      case "cloud":
        for (const [x, y, z, r] of [[-1.9, 0, 0, 1.5], [0, 0.8, 0, 2.1], [1.9, 0, 0, 1.5], [0.9, -0.4, 0.5, 1.4], [-0.9, -0.4, -0.5, 1.3]]) {
          g.add(this.mesh(new THREE.SphereGeometry(r, soft ? 24 : 7, soft ? 16 : 5), mat, x, y, z));
        }
        break;
      case "check": g.add(this.mesh(slab(CHECK, 1.3, bev), mat)); break;
      case "magnifier": {
        g.add(this.mesh(new THREE.TorusGeometry(1.7, 0.42, 10, 32), mat));
        g.add(this.mesh(new THREE.CircleGeometry(1.4, 32), this.holo("#BFE6FF", 0.35)));
        const h = this.mesh(new THREE.CylinderGeometry(0.38, 0.45, 2.8, 10), alt, 2.2, -2.2, 0);
        h.rotation.z = Math.PI / 4; g.add(h);
        break;
      }
      case "tub": {
        g.add(this.mesh(new THREE.CylinderGeometry(1.9, 1.9, 3.8, 28), mat));
        g.add(this.mesh(new THREE.CylinderGeometry(2.05, 2.05, 0.9, 28), alt, 0, 2.3, 0));
        g.add(this.mesh(new THREE.CylinderGeometry(1.93, 1.93, 1.5, 28), this.solid("#FFFFFF", { flat: false }), 0, -0.1, 0));
        break;
      }
      case "gear": g.add(this.mesh(slab(gearShape(2.6, 9), 1.1, bev), mat)); break;
      case "book": {
        // Open book: two covers in a shallow V with page blocks on top
        for (const side of [-1, 1]) {
          const leaf = new THREE.Group(); leaf.rotation.z = side * -0.28; g.add(leaf);
          leaf.add(this.mesh(box(3.2, 0.35, 4.4), mat, side * 1.6, 0, 0));
          leaf.add(this.mesh(box(2.9, 0.55, 4), alt, side * 1.5, 0.42, 0));
        }
        g.add(this.mesh(new THREE.CylinderGeometry(0.3, 0.3, 4.4, 10).rotateX(Math.PI / 2), mat, 0, -0.1, 0));
        break;
      }
      case "palette": {
        const sh = new THREE.Shape(); sh.absellipse(0, 0, 3.2, 2.4, 0, Math.PI * 2, false, 0);
        const hole = new THREE.Path(); hole.absellipse(1.4, -0.9, 0.55, 0.45, 0, Math.PI * 2, true, 0); sh.holes.push(hole);
        g.add(this.mesh(slab(sh, 0.6, bev), alt));
        ["#E8452E", "#F2C83A", "#4CC85A", "#3A7AE8", this.s.d.color].forEach((col, i) => {
          const a = 2.2 + i * 0.75;
          const blob = this.mesh(new THREE.SphereGeometry(0.5, soft ? 20 : 8, soft ? 14 : 6), this.solid(col, { flat: false }), Math.cos(a) * 2.1, Math.sin(a) * 1.5, 0.45);
          blob.scale.z = 0.6; g.add(blob);
        });
        const brush = this.mesh(new THREE.CylinderGeometry(0.16, 0.22, 5, 8), mat, 1.6, 1.2, 0.8); brush.rotation.z = -0.9; g.add(brush);
        break;
      }
      case "chart": {
        g.add(this.mesh(box(6.4, 0.5, 1.6), alt, 0, -2.6, 0));
        [1.6, 2.8, 2.2, 4.4].forEach((h, i) => {
          const bar = this.mesh(box(1.1, 1, 1.1), i === 3 ? mat : alt, -2.2 + i * 1.5, -2.35, 0);
          bar.geometry.translate(0, 0.5, 0); bar.scale.y = h; bar.userData.h = h; g.add(bar);
        });
        break;
      }
      case "server": {
        const led = this.glow("#5BFF8A", 1.6);
        for (let i = 0; i < 3; i++) {
          g.add(this.mesh(box(4.2, 1.1, 3), mat, 0, i * 1.4 - 1.4, 0));
          for (let k = 0; k < 3; k++) g.add(this.mesh(new THREE.BoxGeometry(0.3, 0.3, 0.1), led, -1.4 + k * 0.5, i * 1.4 - 1.4, 1.52));
        }
        break;
      }
    }
    return g;
  }

  protected sprite(name: keyof typeof PIXELS, px = 1.3) {
    const rows = PIXELS[name];
    const cols: Record<string, string> = { X: this.s.d.color, w: "#FFFFFF", o: "#2A2A3A", r: "#E8452E", g: "#4CC85A", b: "#3A7AE8", y: "#F2C83A" };
    const cells: { x: number; y: number; c: string }[] = [];
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (cols[ch]) cells.push({ x, y, c: cols[ch] }); }));
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(px, px, px * 1.4), this.solid("#ffffff", { emissive: "#ffffff", ei: this.c.night ? 0.25 : 0 }), cells.length);
    const w = rows[0].length, h = rows.length, col = new THREE.Color();
    cells.forEach((cell, i) => {
      mesh.setMatrixAt(i, M((cell.x - (w - 1) / 2) * px, ((h - 1) / 2 - cell.y) * px, 0));
      mesh.setColorAt(i, col.set(cell.c));
    });
    const g = new THREE.Group(); g.add(mesh);
    return g;
  }

  // ------------------------------------------------------------------ building features shared by the city themes

  /** Grow and shrink chart bars made by icon("chart"). */
  protected animateChart(g: THREE.Object3D, speed = 1) {
    const bars: THREE.Object3D[] = [];
    g.traverse(o => { if (o.userData.h) bars.push(o); });
    this.on((_dt, t, r) => { if (!r) bars.forEach((b, i) => { b.scale.y = b.userData.h * (0.7 + 0.3 * Math.sin(t * speed * 1.7 + i * 1.3)); }); });
  }

  /** Structural pieces that make the building read as what it is, before any floating icon. */
  structure() {
    const { d, accent, top } = this.s;
    const soft = this.c.style === "gummy", cyber = this.c.style === "cyberpunk";
    const light = this.solid(cyber ? "#1A1C2A" : soft ? "#FFFFFF" : "#EEF0F4", { flat: !soft });
    const box = (w: number, h: number, dd: number) => soft ? new RoundedBoxGeometry(w, h, dd, 2, Math.min(w, h, dd) * 0.3) : new THREE.BoxGeometry(w, h, dd);
    switch (d.form) {
      case "hospital": {
        // Helipad on the tower, a cross on its face, an ambulance at the door.
        const pad = this.mesh(new THREE.CylinderGeometry(4.6, 4.6, 0.5, soft ? 40 : 24), this.solid(cyber ? "#10121C" : "#3A404C"), 0, top + 0.25, 0);
        this.add(pad);
        const ring = this.mesh(new THREE.TorusGeometry(3.9, 0.18, 6, 40), this.glow(cyber ? d.color : "#F4F6FA", cyber ? 2 : 0.2), 0, top + 0.55, 0); ring.rotation.x = Math.PI / 2; this.add(ring, false);
        const H = new THREE.Group(); H.position.y = top + 0.56; H.rotation.y = this.face; this.add(H, false);
        for (const [w, dd, x] of [[0.6, 3.6, -1.1], [0.6, 3.6, 1.1], [2.2, 0.6, 0]] as const) H.add(this.mesh(new THREE.BoxGeometry(w, 0.1, dd), accent, x, 0, 0));
        const red = this.solid("#E8303A", { emissive: "#E8303A", ei: this.c.night || cyber ? 1.6 : 0.3 });
        const face = new THREE.Group(); face.position.set(this.out.x * 5.65, 19, this.out.y * 5.65); face.rotation.y = this.face; this.add(face, false);
        face.add(this.mesh(new THREE.BoxGeometry(7, 7, 0.3), light, 0, 0, 0));
        face.add(this.mesh(box(5, 1.7, 0.6), red, 0, 0, 0.3), this.mesh(box(1.7, 5, 0.6), red, 0, 0, 0.3));
        // Canopy over the entrance, and an ambulance with its lights going
        const door = this.front(0);
        door.add(this.mesh(new THREE.BoxGeometry(8, 0.5, 3.4), accent, 0, 4.2, -0.4));
        for (const x of [-3.6, 3.6]) door.add(this.mesh(new THREE.CylinderGeometry(0.2, 0.2, 4.2, 8), light, x, 2.1, 0.9));
        const amb = new THREE.Group(); amb.position.set(6.5, 0, 3.4); amb.rotation.y = Math.PI / 2; door.add(amb);
        amb.add(this.mesh(box(2.6, 2.4, 5), light, 0, 1.6, 0), this.mesh(box(2.6, 1.6, 1.6), light, 0, 1.2, 3.2));
        amb.add(this.mesh(new THREE.BoxGeometry(2.7, 0.5, 5.1), red, 0, 1.4, 0));
        for (const z of [-1.6, 2.8]) for (const x of [-1.35, 1.35]) { const w = this.mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.4, 12), this.solid("#1A1A1E"), x, 0.55, z); w.rotation.z = Math.PI / 2; amb.add(w); }
        const lr = new THREE.MeshBasicMaterial({ color: "#FF2A3A" }), lb = new THREE.MeshBasicMaterial({ color: "#2A6AFF" });
        const l1 = this.mesh(new THREE.BoxGeometry(0.8, 0.4, 0.5), lr, -0.6, 3, 2), l2 = this.mesh(new THREE.BoxGeometry(0.8, 0.4, 0.5), lb, 0.6, 3, 2);
        amb.add(l1, l2);
        this.on((_dt, t) => { const on = Math.sin(t * 9) > 0; l1.visible = on; l2.visible = !on; });
        break;
      }
      case "library": {
        // Classical portico: steps, columns and a pediment in the district color.
        const p = this.front(0.2);
        for (let i = 0; i < 3; i++) p.add(this.mesh(box(16 - i * 0.8, 0.5, 4 - i * 0.7), light, 0, 0.25 + i * 0.5, 0.8 - i * 0.35));
        for (let i = 0; i < 6; i++) p.add(this.mesh(new THREE.CylinderGeometry(0.55, 0.65, 8, soft ? 20 : 10), light, -6.25 + i * 2.5, 5.5, 0.6));
        p.add(this.mesh(box(15.6, 0.9, 3.2), light, 0, 9.9, -0.2));
        const ped = this.mesh(new THREE.ConeGeometry(1, 1, 3), accent, 0, 11.6, -0.2);
        ped.scale.set(9.5, 2.6, 1.6); ped.rotation.set(0, 0, 0); p.add(ped);
        // Book spines lining the top tier
        const spines = ["#C8402E", "#2E6AC8", "#E8A030", "#3A8A4A", d.color, "#7A4AC8"];
        const shelf = new THREE.Group(); shelf.position.set(this.out.x * 5.2, 12, this.out.y * 5.2); shelf.rotation.y = this.face; this.add(shelf, false);
        for (let i = 0; i < 16; i++) shelf.add(this.mesh(new THREE.BoxGeometry(0.7, 3 + (i * 7 % 5) * 0.3, 0.4), this.solid(spines[i % spines.length], { emissive: spines[i % spines.length], ei: this.c.night || cyber ? 0.8 : 0 }), -5.6 + i * 0.75, 1.8, 0));
        break;
      }
      case "gallery": {
        // Theater marquee with chasing bulbs over the door.
        const m = this.wall(7);
        m.add(this.mesh(box(14, 3.4, 2.4), accent, 0, 0, 1.2));
        m.add(this.mesh(new THREE.BoxGeometry(12, 2, 0.1), this.solid(cyber ? "#0A0A12" : "#FFF8E8", { emissive: "#FFF2C8", ei: this.c.night ? 0.8 : 0.1 }), 0, 0, 2.45));
        const bulbs: THREE.MeshBasicMaterial[] = [];
        for (let i = 0; i < 24; i++) {
          const top2 = i < 12, x = -6.6 + (i % 12) * 1.2;
          const mat = new THREE.MeshBasicMaterial({ color: "#FFE07A" }); bulbs.push(mat);
          m.add(this.mesh(new THREE.SphereGeometry(0.22, 8, 6), mat, x, top2 ? 1.85 : -1.85, 2.5));
        }
        this.on((_dt, t, r) => { const k = r ? -1 : Math.floor(t * 8); bulbs.forEach((b, i) => b.color.set((i + k) % 3 === 0 ? "#FFF6D0" : "#8A6A2A")); });
        // Framed artworks along the wall
        const art = this.wall(3);
        ["#E8452E", "#3A7AE8", "#F2C83A"].forEach((col, i) => {
          art.add(this.mesh(new THREE.BoxGeometry(3, 2.4, 0.3), light, -5 + i * 5, 0, 0.2));
          art.add(this.mesh(new THREE.PlaneGeometry(2.4, 1.8), this.solid(col, { emissive: col, ei: this.c.night ? 0.5 : 0 }), -5 + i * 5, 0, 0.36));
        });
        break;
      }
      case "observatory": {
        // Rotating dome with an open slit and a telescope.
        const y = top;
        const domeG = new THREE.Group(); domeG.position.y = y; this.add(domeG);
        const shell = this.mesh(new THREE.SphereGeometry(7.2, soft ? 40 : 20, soft ? 20 : 10, 0, Math.PI * 2, 0, Math.PI / 2), this.solid(cyber ? "#1A1E2C" : "#F2F4F8", { metal: 0.2, rough: 0.3, flat: !soft }));
        domeG.add(shell);
        const slit = this.mesh(new THREE.BoxGeometry(1.8, 0.3, 7.6), this.solid("#12141C"), 0, 0, 0);
        const slitG = new THREE.Group(); slitG.rotation.x = 0.25; domeG.add(slitG);
        for (let i = 0; i < 6; i++) { const s2 = slit.clone(); const a = (i / 6) * (Math.PI / 2); s2.position.set(0, Math.sin(a) * 7.05, Math.cos(a) * 7.05); s2.rotation.x = -a; s2.scale.z = 0.25; slitG.add(s2); }
        const tube = this.mesh(new THREE.CylinderGeometry(0.9, 1.2, 9, 14), accent, 0, 5.5, 3.4); tube.rotation.x = 0.75; domeG.add(tube);
        domeG.add(this.mesh(new THREE.TorusGeometry(7.25, 0.3, 6, 40), accent, 0, 0.2, 0).rotateX(Math.PI / 2));
        domeG.rotation.y = this.face;
        this.on((_dt, t, r) => { if (!r) domeG.rotation.y = this.face + Math.sin(t * 0.25) * 1.1; });
        this.mark(y + 8);
        break;
      }
    }
  }

  // ------------------------------------------------------------------ low poly + gummy: floating 3D icons

  icons() {
    const { d, accent } = this.s;
    const white = this.solid(this.c.style === "gummy" ? "#FFFFFF" : "#F4F6FA", { flat: false });
    const at = (o: THREE.Object3D, y: number) => { o.position.y = y; this.add(o); this.mark(y + 4); return o; };
    switch (d.id) {
      case "storefront": {
        const bag = at(this.icon("bag", accent, white), this.top + 6);
        this.spin(bag, 0.7); this.bob(bag);
        // Striped awning over the shop front
        const aw = this.wall(4.5);
        for (let i = 0; i < 8; i++) {
          const s = this.mesh(new THREE.BoxGeometry(1.6, 0.25, 4), i % 2 ? white : accent, -5.6 + i * 1.6, 0, 2);
          s.rotation.x = 0.35; aw.add(s);
        }
        break;
      }
      case "email": {
        const env = at(this.icon("envelope", white, accent), this.top + 7);
        this.spin(env, 0.8); this.bob(env, 1);
        this.signal(this.s.g, this.top + 1, d.color);
        break;
      }
      case "telehealth": {
        const heart = at(this.icon("heart", accent, white), this.top + 6);
        heart.rotation.z = 0;
        this.spin(heart, 0.5);
        this.on((_dt, t, r) => { const k = r ? 1 : 1 + Math.max(0, Math.sin(t * 6)) ** 8 * 0.25; heart.scale.setScalar(k); });
        break;
      }
      case "backend": {
        const cloud = at(this.icon("cloud", white, white), this.top + 7);
        this.bob(cloud, 0.6, 0.9);
        const gear = this.wall(7);
        const gm = this.icon("gear", accent, accent);
        gm.position.z = 0.6; gear.add(gm);
        this.on((dt, _t, r) => { if (!r) gm.rotation.z += dt * 0.9; });
        const rack = this.icon("server", this.solid("#3A4256"), accent);
        rack.position.set(5, 15.6, -4); rack.scale.setScalar(0.8); this.add(rack);
        break;
      }
      case "test": {
        const check = at(this.icon("check", accent, white), this.top + 6);
        this.spin(check, 0.6); this.bob(check);
        const orbit = new THREE.Group(); orbit.position.y = this.s.top * 0.55; this.add(orbit);
        const mag = this.icon("magnifier", white, accent);
        mag.position.x = this.s.foot + 4.5; mag.scale.setScalar(0.9); orbit.add(mag);
        this.spin(orbit, 0.8);
        break;
      }
      case "knowledge": {
        const book = at(this.icon("book", accent, white), this.top + 6);
        book.scale.setScalar(1.2); this.spin(book, 0.5); this.bob(book, 0.8, 1.1);
        break;
      }
      case "media": {
        const pal = at(this.icon("palette", accent, white), this.top + 7);
        pal.rotation.x = -0.3; this.spin(pal, 0.6); this.bob(pal);
        break;
      }
      case "analytics": {
        const chart = at(this.icon("chart", accent, white), this.top + 7);
        chart.rotation.y = this.face; this.animateChart(chart); this.bob(chart, 0.6, 0.9);
        break;
      }
      case "products": {
        const tub = at(this.icon("tub", accent, white), this.top + 6);
        tub.scale.setScalar(1.3); this.spin(tub, 0.4);
        const ring = new THREE.Group(); ring.position.y = this.s.top - 10; this.add(ring);
        for (let i = 0; i < 5; i++) {
          const a = (i / 5) * Math.PI * 2;
          const bx = this.mesh(this.c.style === "gummy" ? new RoundedBoxGeometry(2.4, 2.4, 2.4, 2, 0.5) : new THREE.BoxGeometry(2.4, 2.4, 2.4),
            i % 2 ? white : accent, Math.cos(a) * 13, 0, Math.sin(a) * 13);
          bx.rotation.set(a, a, 0); ring.add(bx);
        }
        this.spin(ring, -0.35);
        break;
      }
    }
  }

  // ------------------------------------------------------------------ 8 bit: pixel sprites

  pixels() {
    const name: keyof typeof PIXELS = ({ storefront: "bag", email: "envelope", telehealth: "heart", backend: "cloud", test: "check", products: "tub", knowledge: "book", media: "palette", analytics: "chart" } as const)[this.s.d.id as "storefront"] ?? "check";
    const sp = this.sprite(name, this.s.d.id === "products" ? 1.6 : 1.3);
    sp.position.y = this.top + 8;
    sp.rotation.y = this.face;
    this.add(sp);
    this.mark(this.top + 14);
    this.bob(sp, 1.2, 2, 0.6);
    // Quarter turns, like an old game pickup
    this.on((_dt, t, r) => { if (!r) sp.rotation.y = this.face + Math.floor(t * 1.2) * (Math.PI / 2) * 0 + Math.round(Math.sin(t * 0.8)) * 0.4; });
    if (this.s.d.id === "email") this.signal(this.s.g, this.s.top + 1, this.s.d.color);
  }

  // ------------------------------------------------------------------ cyberpunk

  cyber() {
    const { d, foot } = this.s;
    const holo = this.holo(d.color, 0.6);
    const neonBlade = (y: number, h: number) => {
      const tex = this.scrollTex((ctx, w, hh) => {
        ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, hh);
        for (let i = 0; i < hh; i += 32) { ctx.fillStyle = d.color; ctx.fillRect(10, i + 4, w - 20, 20); }
      });
      tex.repeat.set(1, h / 8);
      const blade = this.mesh(new THREE.BoxGeometry(0.6, h, 3), new THREE.MeshBasicMaterial({ map: tex, color: "#ffffff" }));
      const g = this.wall(y); blade.position.set(foot * 0.6, 0, 1.6); g.add(blade);
      this.on((dt, _t, r) => { if (!r) tex.offset.y -= dt * 0.6; });
    };
    switch (d.id) {
      case "storefront": {
        const bag = this.icon("bag", holo, holo); bag.position.y = this.top + 7; bag.scale.setScalar(1.5); this.add(bag, false);
        this.spin(bag, 0.6);
        neonBlade(16, 18);
        this.mark(this.top + 14);
        break;
      }
      case "email": {
        const env = this.icon("envelope", holo, this.holo("#FFFFFF", 0.8)); env.position.y = this.top + 8; env.scale.setScalar(1.4); this.add(env, false);
        this.spin(env, 0.9);
        this.signal(this.s.g, this.top + 2, d.color, 0, 8);
        const blink = this.mesh(new THREE.SphereGeometry(0.6, 10, 8), new THREE.MeshBasicMaterial({ color: "#FF2A4A" }), 0, this.top + 1, 0);
        this.add(blink, false);
        this.on((_dt, t) => { blink.visible = Math.sin(t * 5) > 0; });
        this.mark(this.top + 14);
        break;
      }
      case "telehealth": {
        const heart = this.icon("heart", holo, holo); heart.position.y = this.top + 7; heart.scale.setScalar(1.4); this.add(heart, false);
        this.spin(heart, 0.5);
        this.on((_dt, t, r) => { if (!r) heart.scale.setScalar(1.4 * (1 + Math.max(0, Math.sin(t * 6)) ** 8 * 0.25)); });
        // ECG monitor on the wing's face
        const tex = this.scrollTex((ctx, w, h) => {
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = d.color; ctx.lineWidth = 4; ctx.beginPath();
          const mid = h / 2;
          ctx.moveTo(0, mid);
          for (const [x, y] of [[90, mid], [100, mid - 6], [110, mid], [130, mid], [138, mid + 14], [148, mid - 44], [158, mid + 22], [166, mid], [200, mid], [212, mid - 10], [224, mid], [w, mid]]) ctx.lineTo(x, y);
          ctx.stroke();
        }, 256, 64);
        tex.repeat.set(2, 1);
        const screen = this.wall(7.5);
        screen.add(this.mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0, 0.1));
        this.on((dt, _t, r) => { if (!r) tex.offset.x += dt * 0.25; });
        this.mark(this.top + 13);
        break;
      }
      case "backend": {
        // Data streaming up the tower
        const tex = this.scrollTex((ctx, w, h) => {
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
          for (let i = 0; i < 18; i++) { ctx.fillStyle = i % 3 ? d.color : "#FFFFFF"; ctx.fillRect(16, Math.random() * h, w - 32, 6 + Math.random() * 18); }
        });
        tex.repeat.set(1, 3);
        const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
        for (const [x, z] of [[-9.05, 0], [-0.95, 0], [-5, 4.05], [-5, -4.05]]) {
          const strip = this.mesh(new THREE.PlaneGeometry(1.4, 22), mat, x, 11, z);
          strip.rotation.y = x === -9.05 ? -Math.PI / 2 : x === -0.95 ? Math.PI / 2 : z > 0 ? 0 : Math.PI;
          this.add(strip, false);
        }
        this.on((dt, _t, r) => { if (!r) tex.offset.y -= dt * 0.8; });
        const gear = this.icon("gear", holo, holo); gear.position.set(-5, this.top + 7, 0); this.add(gear, false);
        this.on((dt, _t, r) => { if (!r) gear.rotation.z += dt; });
        this.mark(this.top + 12);
        break;
      }
      case "test": {
        const scan = this.mesh(new THREE.TorusGeometry(foot + 1.6, 0.18, 6, 48), this.holo(d.color, 0.9));
        scan.rotation.x = Math.PI / 2; this.add(scan, false);
        const plane = this.mesh(new THREE.CircleGeometry(foot + 1.6, 48), this.holo(d.color, 0.12)); plane.rotation.x = -Math.PI / 2; this.add(plane, false);
        this.on((_dt, t, r) => { const y = r ? this.s.top / 2 : (Math.sin(t * 0.9) * 0.5 + 0.5) * this.s.top; scan.position.y = y; plane.position.y = y; });
        const check = this.icon("check", holo, holo); check.position.y = this.top + 7; check.scale.setScalar(1.4); this.add(check, false);
        this.spin(check, 0.7);
        this.mark(this.top + 13);
        break;
      }
      case "knowledge": {
        const book = this.icon("book", holo, this.holo("#FFFFFF", 0.7)); book.position.y = this.top + 8; book.scale.setScalar(1.6); this.add(book, false);
        this.spin(book, 0.5);
        // Lines of text scrolling up a blade sign
        const tex = this.scrollTex((ctx, w, h) => {
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
          for (let y = 6; y < h; y += 12) { ctx.fillStyle = y % 36 === 6 ? "#FFFFFF" : d.color; ctx.fillRect(8, y, 12 + ((y * 37) % 36), 5); }
        });
        tex.repeat.set(1, 2);
        const g = this.wall(11); g.add(this.mesh(new THREE.BoxGeometry(0.6, 14, 3), new THREE.MeshBasicMaterial({ map: tex }), foot * 0.85, 0, 1.6));
        this.on((dt, _t, r) => { if (!r) tex.offset.y -= dt * 0.3; });
        this.mark(this.top + 14);
        break;
      }
      case "media": {
        const pal = this.icon("palette", holo, holo); pal.position.y = this.top + 8; pal.scale.setScalar(1.5); this.add(pal, false);
        this.spin(pal, 0.6);
        // Video billboard cycling through color bars
        const tex = this.scrollTex((ctx, w, h) => {
          const cols = ["#FF4FD8", "#3FF0FF", "#FFE24A", "#7A5AFF", d.color, "#FFFFFF"];
          cols.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect((i * w) / cols.length, 0, w / cols.length + 1, h); });
        }, 256, 64);
        const bill = this.mesh(new THREE.PlaneGeometry(10, 5.6), new THREE.MeshBasicMaterial({ map: tex }), 0, 0, 0.2);
        const bg = this.wall(16); bg.add(this.mesh(new THREE.BoxGeometry(11, 6.6, 0.3), this.solid("#0A0A12")), bill);
        this.on((dt, _t, r) => { if (!r) tex.offset.x += dt * 0.15; });
        this.mark(this.top + 14);
        break;
      }
      case "analytics": {
        const chart = this.icon("chart", holo, this.holo("#FFFFFF", 0.7)); chart.position.y = this.top + 8; chart.scale.setScalar(1.5); chart.rotation.y = this.face; this.add(chart, false);
        this.animateChart(chart, 1.6);
        this.signal(this.s.g, this.top - 6, d.color, 0, 9);
        this.mark(this.top + 14);
        break;
      }
      case "products": {
        const tub = this.icon("tub", holo, this.holo("#FFFFFF", 0.7)); tub.position.y = this.top + 10; tub.scale.setScalar(2.4); this.add(tub, false);
        this.spin(tub, 0.4);
        const mats: THREE.MeshBasicMaterial[] = [];
        tub.traverse(o => { const m = (o as THREE.Mesh).material as THREE.MeshBasicMaterial; if (m) mats.push(m); });
        this.on((_dt, t) => { const f = Math.sin(t * 23) > 0.96 ? 0.15 : 0.6; mats.forEach(m => (m.opacity = f)); });
        // Ticker band around the crown
        const tex = this.scrollTex((ctx, w, h) => {
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
          for (let x = 0; x < w; x += 40) { ctx.fillStyle = x % 80 ? d.color : "#FFFFFF"; ctx.fillRect(x + 4, 14, 26, h - 28); }
        }, 512, 64);
        tex.repeat.set(2, 1);
        const band = this.mesh(new THREE.CylinderGeometry(7.4, 7.4, 3, 48, 1, true), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }), 0, this.s.top - 4, 0);
        this.add(band, false);
        this.on((dt, _t, r) => { if (!r) tex.offset.x += dt * 0.2; });
        this.mark(this.top + 19);
        break;
      }
    }
  }

}



