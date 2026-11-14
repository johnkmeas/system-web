/**
 * Signature props for the city themes (low poly, gummy, 8 bit, cyberpunk): each
 * tower gets a rooftop feature that says what its district does. The other
 * themes build whole landmark buildings instead (see landmarks.ts).
 *
 *   storefront → shopping   email → messages   telehealth → care
 *   backend → infrastructure   test → checking   products → the catalog
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
  protected icon(kind: "bag" | "envelope" | "heart" | "cross" | "cloud" | "check" | "magnifier" | "tub" | "gear" | "server", mat: THREE.Material, alt: THREE.Material) {
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
    const cols: Record<string, string> = { X: this.s.d.color, w: "#FFFFFF", o: "#2A2A3A" };
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
    const name: keyof typeof PIXELS = ({ storefront: "bag", email: "envelope", telehealth: "heart", backend: "cloud", test: "check", products: "tub" } as const)[this.s.d.id as "storefront"] ?? "check";
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
        // ECG monitor wrapped around the drum
        const tex = this.scrollTex((ctx, w, h) => {
          ctx.fillStyle = "#000"; ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = d.color; ctx.lineWidth = 4; ctx.beginPath();
          const mid = h / 2;
          ctx.moveTo(0, mid);
          for (const [x, y] of [[90, mid], [100, mid - 6], [110, mid], [130, mid], [138, mid + 14], [148, mid - 44], [158, mid + 22], [166, mid], [200, mid], [212, mid - 10], [224, mid], [w, mid]]) ctx.lineTo(x, y);
          ctx.stroke();
        }, 256, 64);
        tex.repeat.set(3, 1);
        const band = this.mesh(new THREE.CylinderGeometry(foot + 0.3, foot + 0.3, 4, 48, 1, true), new THREE.MeshBasicMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }), 0, this.s.top * 0.45, 0);
        this.add(band, false);
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



