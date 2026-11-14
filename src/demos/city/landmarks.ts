/**
 * Theme-native landmarks. Outside the city themes a skyscraper makes no sense,
 * so each district becomes a building that fits the world it is in:
 *
 *              storefront       email             telehealth       backend            test               products (hub)
 *  farm        farmers market   post office       country clinic   grain elevator     slaughterhouse     storage barn
 *  medieval    market hall      dovecote + post   apothecary abbey watermill          forge + lists      castle keep
 *  industrial  freight depot    radio station     works infirmary  power station      testing foundry    distribution warehouse
 *  stone age   trading circle   signal tower      shaman's lodge   stone circle       hunters' camp      longhouse granary
 *  space       trade dome       comms array       med station      fusion reactor     launch complex     cargo hangar
 *
 *              knowledge          media                   analytics
 *  farm        grange library     county fair stage       weather station
 *  medieval    scriptorium        playhouse               astronomer's tower
 *  industrial  Carnegie library   picture palace          observatory
 *  stone age   elders' cave       painted hides + totem   sun watchers' mound
 *  space       data archive       holo theater            deep-space observatory
 *
 * Every building carries the district color (the `accent` material, which
 * glows on hover) on a roof, sign, awning or band so it still reads as "that
 * district" from across the map.
 */
import * as THREE from "three";
import { Builder, type PropCtx, type SigInput } from "./props";
import { boxUV, cylUV, dome, gableGeo, heartShape, slab } from "./geo";
import type { CityStyle } from "./styles";
import type { FacadeSpec } from "./textures";
import { facadeSpec, type GlowMat } from "./world";

type GlowList = { mat: GlowMat; base: number; boost: number }[];
type Mat = THREE.Material;

/** Landmarks are modeled at human scale, then enlarged to hold their own against the filler. */
const LANDMARK_SCALE = 1.5;

export const LANDMARK_STYLES = new Set<CityStyle>(["farm", "medieval", "industrial", "stoneage", "space"]);

/** Build the district's landmark into `s.g`. Returns its height. */
export function buildLandmark(c: PropCtx, s: SigInput, glow: GlowList): number {
  const L = new Landmark(c, s, glow);
  switch (c.style) {
    case "farm": L.farm(); break;
    case "medieval": L.medieval(); break;
    case "industrial": L.industrial(); break;
    case "stoneage": L.stone(); break;
    case "space": L.space(); break;
  }
  s.g.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(L.root).max.y;
}

class Landmark extends Builder {
  root = new THREE.Group();
  constructor(c: PropCtx, s: SigInput, private glowList: GlowList) {
    super(c, s);
    this.root.rotation.y = this.face; // local +z faces the camera's home
    this.root.scale.setScalar(LANDMARK_SCALE);
    s.g.add(this.root);
  }

  // ------------------------------------------------------------------ kit

  private t(day: string, night: string) { return this.c.night ? night : day; }
  private part(geo: THREE.BufferGeometry, mat: Mat | Mat[], x = 0, y = 0, z = 0, parent: THREE.Object3D = this.root) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  /** Box with its base at y. */
  private box(w: number, h: number, d: number, mat: Mat, x = 0, y = 0, z = 0, parent?: THREE.Object3D) {
    return this.part(new THREE.BoxGeometry(w, h, d), mat, x, y + h / 2, z, parent);
  }
  private cyl(rt: number, rb: number, h: number, seg: number, mat: Mat, x = 0, y = 0, z = 0, parent?: THREE.Object3D) {
    return this.part(new THREE.CylinderGeometry(rt, rb, h, seg), mat, x, y + h / 2, z, parent);
  }
  private cone(r: number, h: number, seg: number, mat: Mat, x = 0, y = 0, z = 0, parent?: THREE.Object3D) {
    const m = this.part(new THREE.ConeGeometry(r, h, seg), mat, x, y + h / 2, z, parent);
    if (seg === 4) m.rotation.y = Math.PI / 4;
    return m;
  }
  private ball(r: number, mat: Mat, x = 0, y = 0, z = 0, parent?: THREE.Object3D) {
    return this.part(new THREE.SphereGeometry(r, 14, 10), mat, x, y, z, parent);
  }
  /** Lit facade material; also brightens on hover. */
  private walls(spec: FacadeSpec, seed: number, color: string) {
    const m = this.kit.facade(spec, seed + this.s.d.id.length * 7, color) as GlowMat;
    this.glowList.push({ mat: m, base: m.emissiveIntensity, boost: 0.25 });
    return m;
  }
  /** Building block with windows on the sides and `roof` on top, base at y. */
  private block(spec: FacadeSpec, wall: Mat, w: number, h: number, d: number, x = 0, y = 0, z = 0, roof: Mat = this.kit.roofMat, parent?: THREE.Object3D) {
    return this.part(boxUV(new THREE.BoxGeometry(w, h, d), w, h, d, spec.cell), [wall, wall, roof, roof, wall, wall], x, y + h / 2, z, parent);
  }
  private tower(spec: FacadeSpec, wall: Mat, r: number, h: number, x = 0, y = 0, z = 0, seg = 16, roof: Mat = this.kit.roofMat, parent?: THREE.Object3D) {
    return this.part(cylUV(new THREE.CylinderGeometry(r, r, h, seg), r, h, spec.cell), [wall, roof, roof], x, y + h / 2, z, parent);
  }
  /** Gable roof: `span` across, ridge running `len` along local z (ry turns it). */
  private gable(span: number, h: number, len: number, mat: Mat, x = 0, y = 0, z = 0, ry = 0, parent?: THREE.Object3D) {
    const m = this.part(gableGeo(), mat, x, y, z, parent);
    m.scale.set(span, h, len); m.rotation.y = ry;
    return m;
  }
  /** Barn roof: two pitches per side, ridge along z. */
  private gambrel(span: number, h: number, len: number, mat: Mat, x = 0, y = 0, z = 0) {
    const shape = new THREE.Shape([[-span / 2, 0], [span / 2, 0], [span * 0.34, h * 0.58], [0, h], [-span * 0.34, h * 0.58]].map(([a, b]) => new THREE.Vector2(a, b)));
    const geo = new THREE.ExtrudeGeometry(shape, { depth: len, bevelEnabled: false });
    geo.translate(0, 0, -len / 2);
    return this.part(geo, mat, x, y, z);
  }
  private flagAt(x: number, y: number, z: number, h: number, color: string, parent: THREE.Object3D = this.root) {
    this.cyl(0.12, 0.14, h, 6, this.solid("#3A3430"), x, y, z, parent);
    const pivot = new THREE.Group(); pivot.position.set(x, y + h - 1, z); parent.add(pivot);
    const flag = this.part(new THREE.PlaneGeometry(3.2, 1.8, 6, 1), this.solid(color, { emissive: color, ei: this.c.night ? 0.4 : 0, side: THREE.DoubleSide, flat: false }), 1.6, 0, 0, pivot);
    flag.castShadow = false;
    const ph = x * 0.3;
    this.on((_dt, t, r) => { if (!r) pivot.rotation.y = Math.sin(t * 1.8 + ph) * 0.35; });
  }
  private fence(x0: number, z0: number, x1: number, z1: number, mat: Mat, h = 1.3) {
    const len = Math.hypot(x1 - x0, z1 - z0), n = Math.max(2, Math.round(len / 1.8));
    for (let i = 0; i <= n; i++) this.box(0.22, h, 0.22, mat, x0 + ((x1 - x0) * i) / n, 0, z0 + ((z1 - z0) * i) / n);
    for (const y of [h * 0.45, h * 0.85]) {
      const rail = this.part(new THREE.BoxGeometry(len, 0.14, 0.1), mat, (x0 + x1) / 2, y, (z0 + z1) / 2);
      rail.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    }
  }
  /** Rising smoke from a local point. */
  private smoke(x: number, y: number, z: number) {
    this.s.g.updateMatrixWorld(true);
    this.c.smokeEmitters.push(this.root.localToWorld(new THREE.Vector3(x, y, z)));
  }
  private fire(x: number, y: number, z: number, s = 1, rocks = true) {
    const rock = this.solid(this.t("#6A665E", "#2E2E30"));
    if (rocks) for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; this.part(new THREE.DodecahedronGeometry(0.4 * s, 0), rock, x + Math.cos(a) * 1.1 * s, y + 0.2, z + Math.sin(a) * 1.1 * s); }
    const flame = this.part(new THREE.ConeGeometry(0.7 * s, 2 * s, 7), this.glow("#FF8A2A", 2), x, y + s, z);
    const core = this.part(new THREE.ConeGeometry(0.4 * s, 1.3 * s, 6), this.glow("#FFE07A", 2.4), x, y + 0.75 * s, z);
    flame.castShadow = core.castShadow = false;
    this.on((_dt, t, r) => { if (!r) { const k = 0.85 + Math.sin(t * 13 + x) * 0.1 + Math.sin(t * 29 + z) * 0.06; flame.scale.set(1, k, 1); core.scale.set(1, 1.1 - k * 0.2, 1); } });
  }
  /** Turn an object about local x / z every frame. */
  private turn(o: THREE.Object3D, axis: "x" | "y" | "z", speed: number) { this.on((dt, _t, r) => { if (!r) o.rotation[axis] += dt * speed; }); }
  private crates(x: number, z: number, n: number, mat: Mat, top: Mat, s = 1.2) {
    for (let i = 0; i < n; i++) {
      const lvl = i < 3 ? 0 : i < 5 ? 1 : 2, k = i < 3 ? i : i < 5 ? i - 3 : 0;
      this.box(s, s, s, mat, x + (k - (lvl === 0 ? 1 : lvl === 1 ? 0.5 : 0)) * (s + 0.1), lvl * s, z);
      if (lvl === 2) this.box(s * 1.02, 0.15, s * 1.02, top, x, s * 3, z);
    }
  }

  // ------------------------------------------------------------------ farm

  farm() {
    const { accent } = this.s;
    const barn = facadeSpec("farm", "barn"), house = facadeSpec("farm", "house");
    const red = this.t("#B33A2E", "#5A2420"), white = this.t("#F4F1EA", "#6E6E74");
    const wood = this.solid(this.t("#9A7048", "#4A3A2A")), whiteM = this.solid(white, { flat: false });
    const roofM = this.solid(this.t("#6E747C", "#2E3238"));
    const metal = this.solid(this.t("#D2D6DC", "#4A505A"), { metal: 0.15, rough: 0.4, flat: false });
    switch (this.s.d.id) {
      case "storefront": {
        // Farmers market: a row of striped stalls in front of an open market shed.
        this.box(26, 0.4, 18, this.solid(this.t("#C8B08A", "#4A4234")), 0, 0, 0);
        this.block(barn, this.walls(barn, 3, red), 26, 6, 5, 0, 0.4, -6.5);
        this.gable(6.6, 3, 27, roofM, 0, 6.4, -6.5, Math.PI / 2);
        this.box(12, 2.6, 0.4, accent, 0, 8.6, -6.5);
        for (let i = 0; i < 3; i++) this.box(1.4, 1.4, 0.2, whiteM, -3.4 + i * 3.4, 9.2, -6.2);
        const produce = [["#E8452E", "#F2B63A", "#6FBF3A"], ["#A04AC8", "#E8452E", "#F2D23A"], ["#6FBF3A", "#F28A2A", "#E8452E"]];
        [-8.5, 0, 8.5].forEach((x, i) => {
          for (const [px, pz] of [[-2.6, -0.8], [2.6, -0.8], [-2.6, 4.8], [2.6, 4.8]]) this.cyl(0.14, 0.14, 4.6, 6, wood, x + px, 0.4, pz);
          this.box(5.6, 1.1, 1.6, wood, x, 0.4, 4.2);
          for (let k = 0; k < 8; k++) this.ball(0.34, this.solid(produce[i][k % 3], { flat: false }), x - 2.2 + k * 0.62, 1.85, 3.9 + (k % 2) * 0.5);
          for (let k = 0; k < 7; k++) this.gable(6.2, 1.8, 0.86, k % 2 ? whiteM : accent, x, 5, -1.1 + k * 0.86);
          this.crates(x - 1.4, 6.4, 3, wood, accent, 0.9);
        });
        // Bunting between the stalls
        for (let k = 0; k < 22; k++) this.part(new THREE.ConeGeometry(0.32, 0.7, 3).rotateX(Math.PI), k % 2 ? whiteM : accent, -11 + k, 4.4, 5.4);
        this.flagAt(-12, 0.4, 7.5, 14, this.s.d.color);
        break;
      }
      case "email": {
        // Post office: clapboard hall with porch, cupola bell, flagpole and a row of mailboxes.
        this.block(house, this.walls(house, 9, this.t("#ECE6D6", "#5E5A52")), 14, 9, 10, 0, 0, -1);
        this.gable(11.2, 4.5, 15, roofM, 0, 9, -1, Math.PI / 2);
        this.box(14, 0.5, 3.6, wood, 0, 0, 5.8);
        for (const x of [-6.4, -2.2, 2.2, 6.4]) this.cyl(0.25, 0.25, 5.2, 8, whiteM, x, 0.5, 7.2);
        this.box(14.8, 0.4, 4, roofM, 0, 5.7, 5.8);
        // Envelope sign over the porch
        this.box(6, 3, 0.3, whiteM, 0, 6.2, 4.2);
        for (const s of [-1, 1]) { const f = this.part(new THREE.BoxGeometry(3.6, 0.3, 0.2), accent, s * 1.45, 7.0, 4.42); f.rotation.z = s * -0.55; }
        // Cupola with bell
        this.box(2.6, 2.6, 2.6, whiteM, 0, 12.5, -1);
        this.ball(0.7, this.solid("#C8A040", { metal: 0.15 }), 0, 13.6, -1);
        this.cone(2.3, 2.6, 4, accent, 0, 15.1, -1);
        this.flagAt(-9, 0, 8, 16, "#D8302A");
        // Mailboxes
        for (let i = 0; i < 5; i++) {
          const x = 2.4 + i * 1.5;
          this.box(0.16, 2.2, 0.16, wood, x, 0, 10);
          this.box(0.9, 0.7, 1.4, i % 2 ? accent : metal, x, 2.2, 10);
        }
        // Mail cart
        this.box(3.2, 1.2, 1.8, wood, -5, 0.7, 10.5);
        for (const s of [-1, 1]) this.part(new THREE.TorusGeometry(0.6, 0.12, 6, 16), wood, -5 + s * 1.2, 0.7, 10.5).rotation.y = Math.PI / 2;
        this.crates(-5.6, 10.5, 2, this.solid("#C89A5A"), accent, 0.7);
        break;
      }
      case "telehealth": {
        // Country clinic: white farmhouse, porch, red cross on the ridge, greenhouse of herbs.
        const w = this.walls(house, 15, white);
        this.block(house, w, 13, 7, 9, -1, 0, -1);
        this.gable(10.6, 4.2, 14, accent, -1, 7, -1, Math.PI / 2);
        this.block(house, w, 6, 5, 7, -9, 0, 0);
        this.gable(7.4, 3, 7.6, accent, -9, 5, 0);
        this.box(1.2, 3.4, 1.2, this.solid(this.t("#9A4A3A", "#4A2420")), 3, 9, -2);
        this.box(13, 0.4, 3, wood, -1, 0, 4.9);
        for (const x of [-7, -1, 5]) this.cyl(0.2, 0.2, 4, 8, whiteM, x, 0.4, 6.1);
        this.box(13.6, 0.35, 3.4, roofM, -1, 4.4, 4.9);
        const cross = this.solid("#D8302A", { emissive: "#D8302A", ei: this.c.night ? 0.8 : 0.1 });
        this.box(4, 1.2, 0.8, cross, -1, 11.4, -1); this.box(1.2, 4, 0.8, cross, -1, 10, -1);
        // Greenhouse
        const glass = new THREE.MeshStandardMaterial({ color: "#D8F0E8", transparent: true, opacity: 0.35, roughness: 0.1, depthWrite: false });
        this.box(6, 3, 5, glass, 8, 0, 1);
        this.gable(6, 1.6, 5, glass, 8, 3, 1, Math.PI / 2);
        for (let i = 0; i < 3; i++) this.box(5, 0.6, 0.8, this.solid("#4E8A3A"), 8, 0, -0.6 + i * 1.6);
        this.fence(-12, 9.5, 11, 9.5, whiteM, 1);
        break;
      }
      case "backend": {
        // Grain elevator, silos and a windpump: the farm's infrastructure.
        const w = this.walls(barn, 21, this.t("#C8B48A", "#5A5040"));
        this.block(barn, w, 7, 24, 7, -3, 0, -2);
        this.block(barn, w, 5, 5, 5, -3, 24, -2);
        this.gable(5.8, 2.4, 5.8, roofM, -3, 29, -2);
        this.box(7.3, 1.8, 7.3, accent, -3, 18, -2);
        for (const [x, z] of [[5, -4.5], [5, 1.5]]) {
          this.cyl(2.8, 2.8, 18, 20, metal, x, 0, z);
          const cap = this.part(dome(20), metal, x, 18, z); cap.scale.set(2.8, 1.6, 2.8);
          for (const y of [6, 12]) this.part(new THREE.TorusGeometry(2.85, 0.1, 6, 24), roofM, x, y, z).rotation.x = Math.PI / 2;
        }
        const leg = this.part(new THREE.BoxGeometry(0.7, 0.7, 8.6), wood, 1.6, 21, -2); leg.rotation.set(0, Math.PI / 2, -0.55);
        // Windpump
        const pump = new THREE.Group(); pump.position.set(-8, 0, 6); this.root.add(pump);
        this.part(new THREE.CylinderGeometry(0.3, 1.8, 16, 4, 1, true), new THREE.MeshStandardMaterial({ color: this.t("#6A6E76", "#3A3E44"), wireframe: true }), 0, 8, 0, pump);
        const hub = new THREE.Group(); hub.position.set(0, 16, 0.8); pump.add(hub);
        for (let i = 0; i < 12; i++) { const b = this.part(new THREE.BoxGeometry(0.5, 2.6, 0.06), whiteM, 0, 1.6, 0, new THREE.Group()); const arm = b.parent!; arm.rotation.z = (i / 12) * Math.PI * 2; hub.add(arm); }
        this.box(0.2, 1.6, 2.6, accent, 0, 15.2, -1.6, pump);
        this.turn(hub, "z", -1.4);
        this.cyl(1.6, 1.6, 1.2, 14, metal, -5, 0, 9);
        break;
      }
      case "test": {
        // Slaughterhouse: whitewashed killing floor with a clerestory, smokehouse and cattle pen.
        const w = this.walls(barn, 27, this.t("#DCD6C8", "#5A5650"));
        this.block(barn, w, 18, 6, 10, 0, 0, -3);
        this.gable(11, 3.2, 18.6, roofM, 0, 6, -3, Math.PI / 2);
        this.box(14, 1.6, 2.6, w, 0, 8.4, -3);
        this.gable(3.4, 1.2, 14.4, roofM, 0, 10, -3, Math.PI / 2);
        this.box(18.2, 0.9, 10.2, accent, 0, 4.4, -3);
        this.box(4, 4.2, 0.3, this.solid(this.t("#7A3A2E", "#3A1E18")), -4, 0, 2.1);
        for (const s of [-1, 1]) { const x = this.part(new THREE.BoxGeometry(5.4, 0.3, 0.1), whiteM, -4, 2.1, 2.3); x.rotation.z = s * 0.81; }
        this.cyl(0.8, 1, 7, 10, this.solid(this.t("#9A4A3A", "#4A2420")), 7, 5, -6);
        this.smoke(7, 13, -6);
        // Loading chute and pen
        const chute = this.part(new THREE.BoxGeometry(2, 0.3, 5), wood, 4, 1, 4.4); chute.rotation.x = -0.35;
        this.fence(-10, 3, -10, 10, wood); this.fence(-10, 10, 10, 10, wood); this.fence(10, 10, 10, 3, wood); this.fence(-10, 3, 2.6, 3, wood);
        const hide = [this.solid("#2A2A2A", { flat: false }), this.solid("#F2EEE6", { flat: false }), this.solid("#8A5A3A", { flat: false })];
        [[-6, 6, 0.4], [-2, 8, -0.8], [5, 7, 2.6]].forEach(([x, z, ry], i) => {
          const cow = new THREE.Group(); cow.position.set(x, 0, z); cow.rotation.y = ry; this.root.add(cow);
          this.box(2.4, 1.2, 1.1, hide[i], 0, 1, 0, cow); this.box(0.9, 0.8, 0.8, hide[(i + 1) % 3], 1.5, 1.6, 0, cow);
          for (const [lx, lz] of [[-0.9, -0.4], [0.9, -0.4], [-0.9, 0.4], [0.9, 0.4]]) this.box(0.25, 1, 0.25, hide[i], lx, 0, lz, cow);
          this.on((_dt, t, r) => { if (!r) cow.rotation.y = ry + Math.sin(t * 0.3 + i * 2) * 0.4; });
        });
        break;
      }
      case "knowledge": {
        // Grange library: a one-room schoolhouse with a belfry, a reading porch and an open-book sign.
        const w = this.walls(house, 37, red);
        this.block(house, w, 12, 7, 15, 0, 0, -3);
        this.gable(13, 5, 15.6, roofM, 0, 7, -3);
        this.box(3, 3.2, 3, whiteM, 0, 10.4, -6);
        this.ball(0.8, this.solid("#C8A040", { metal: 0.15 }), 0, 11.6, -6);
        this.cone(2.6, 2.8, 4, accent, 0, 13.6, -6);
        this.box(12.4, 0.4, 3.4, wood, 0, 0, 6.2);
        for (const x of [-5.6, 5.6]) this.cyl(0.22, 0.22, 4.2, 8, whiteM, x, 0.4, 7.4);
        this.gable(4, 1.6, 13, accent, 0, 4.6, 6.2, Math.PI / 2);
        this.box(2.4, 3.6, 0.2, this.solid(this.t("#5A3A24", "#2A1C12")), 0, 0.4, 4.6);
        for (const x of [-3.6, 3.6]) this.box(1.8, 2, 0.15, this.glow("#FFE2A0", this.c.night ? 1.4 : 0.15), x, 2.4, 4.6);
        this.openBook(-8, 0, 9, 1.3, wood, whiteM);
        // Reading table stacked with books, benches either side
        this.box(5, 1.1, 2, wood, 6, 0, 10);
        this.books(6, 1.1, 10, 7);
        for (const z of [8.4, 11.6]) this.box(5, 0.6, 0.8, wood, 6, 0, z);
        this.fence(-12, 13, 12, 13, whiteM, 1);
        break;
      }
      case "media": {
        // County fair stage: a quilt-painted barn studio and an open-air stage with hay-bale seats.
        this.block(barn, this.walls(barn, 41, this.t("#E8E0D0", "#5E5A54")), 11, 8, 10, -8, 0, -4);
        this.gambrel(11.8, 6, 10.8, roofM, -8, 8, -4);
        const quilt = [accent, whiteM, this.solid("#C8402E"), whiteM, accent, whiteM, this.solid("#2E6AC8"), whiteM, accent];
        quilt.forEach((m, i) => this.box(1.5, 1.5, 0.15, m, -9.5 + (i % 3) * 1.5, 3 + Math.floor(i / 3) * 1.5, 1.05));
        // Easel with a canvas
        for (const s of [-1, 1]) { const leg = this.part(new THREE.BoxGeometry(0.15, 4, 0.15), wood, -14 + s * 0.6, 2, 3); leg.rotation.z = s * 0.15; }
        this.box(2.4, 1.8, 0.1, this.solid("#FFFFFF", { flat: false }), -14, 2.4, 3.15);
        this.box(1.6, 1.1, 0.05, this.solid(this.s.d.color, { flat: false }), -14, 2.8, 3.22);
        // Stage
        const curtain = this.solid(this.t("#A0202A", "#4A1014"), { flat: false });
        this.box(12, 1.2, 7, wood, 6, 0, -2);
        this.box(12, 7, 0.4, curtain, 6, 1.2, -5.3);
        for (const x of [0.4, 11.6]) this.box(1, 8, 1, accent, x, 0, 1.2);
        this.box(13, 1.4, 1.2, accent, 6, 8, 1.2);
        for (const x of [1.8, 10.2]) this.box(1.8, 6.6, 0.3, curtain, x, 1.2, 0.8);
        for (const x of [3, 9]) { const spot = this.cyl(0.4, 0.6, 1, 10, this.solid("#2A2A30"), x, 7.2, 0.4); spot.rotation.x = 0.6; }
        // Hay-bale seats and festoon lights
        const hay = this.solid(this.t("#E2C25A", "#5A4E26"), { rough: 1 });
        for (let row = 0; row < 3; row++) for (let k = 0; k < 4; k++) this.box(2.2, 1, 1.2, hay, 1.6 + k * 2.9, 0, 4.5 + row * 2.2);
        this.festoon(-13, 13, 11, 5.2, 18);
        break;
      }
      case "analytics": {
        // Weather station: a silo crowned with a telescope dome, an anemometer and grain bins rising like a bar chart.
        this.tower(barn, this.walls(barn, 45, this.t("#D8D0C0", "#5A564E")), 4.4, 14, -5, 0, -4, 20);
        this.part(new THREE.TorusGeometry(4.5, 0.25, 6, 24), accent, -5, 14, -4).rotation.x = Math.PI / 2;
        this.observatory(-5, 14.1, -4, 4.7, metal);
        this.block(house, this.walls(house, 47, white), 7, 4.4, 6, -5, 0, 4);
        this.gable(6.6, 2.4, 7.4, roofM, -5, 4.4, 4, Math.PI / 2);
        [3, 5, 7.5, 10.5].forEach((h, i) => {
          const x = 3 + i * 3.4;
          this.cyl(1.5, 1.5, h, 16, metal, x, 0, 3);
          this.cone(1.8, 1.3, 16, i === 3 ? accent : roofM, x, h, 3);
          this.part(new THREE.TorusGeometry(1.53, 0.08, 6, 20), roofM, x, h * 0.5, 3).rotation.x = Math.PI / 2;
        });
        this.anemometer(10, 0, -6, 13, metal);
        break;
      }
      case "products": {
        // Storage barn: gambrel-roofed hay barn, silos, bales and crates of product.
        this.block(barn, this.walls(barn, 33, red), 20, 11, 15, -2, 0, -2);
        this.gambrel(21.4, 10, 16, roofM, -2, 11, -2);
        this.box(7.4, 8.4, 0.4, accent, -2, 0, 5.6);
        this.box(6.6, 7.8, 0.5, this.solid(this.t("#8A2A22", "#40140F")), -2, 0, 5.7);
        for (const s of [-1, 1]) { const x = this.part(new THREE.BoxGeometry(9.6, 0.4, 0.2), whiteM, -2, 3.9, 6.0); x.rotation.z = s * 0.87; }
        this.box(3.4, 3, 0.4, wood, -2, 12.6, 6.1);
        this.box(2.6, 1.2, 0.8, this.solid(this.t("#E2C25A", "#5A4E26")), -2, 12.8, 6.5);
        this.box(0.4, 0.4, 3, wood, -2, 19, 6.8);
        this.box(2.8, 2.4, 2.8, whiteM, -2, 21, -2);
        this.cone(2.6, 2.2, 4, accent, -2, 23.4, -2);
        const vane = new THREE.Group(); vane.position.set(-2, 25.6, -2); this.root.add(vane);
        this.cyl(0.06, 0.06, 1.6, 4, wood, 0, 0, 0, vane); this.box(2.4, 0.1, 0.2, wood, 0, 1.2, 0, vane);
        this.turn(vane, "y", 0.4);
        for (const z of [-6, 1]) {
          this.cyl(3, 3, 22, 20, metal, 12, 0, z);
          const cap = this.part(dome(20), metal, 12, 22, z); cap.scale.set(3, 1.8, 3);
        }
        const hay = this.solid(this.t("#E2C25A", "#5A4E26"), { rough: 1 });
        for (let i = 0; i < 4; i++) this.part(new THREE.CylinderGeometry(1, 1, 1.4, 14), hay, -12 + (i % 2) * 2.2, 1 + Math.floor(i / 2) * 1.9, 6 + (i % 2)).rotation.z = Math.PI / 2;
        this.crates(5, 8, 6, this.solid(this.t("#C89A5A", "#5A4630")), accent, 1.3);
        break;
      }
    }
  }

  // ------------------------------------------------------------------ medieval

  medieval() {
    const { accent } = this.s;
    const stone = facadeSpec("medieval"), blank = facadeSpec("medieval", "blank");
    const wallC = this.t("#D9CDB4", "#7A7266"), tile = this.solid(this.t("#9C3B2A", "#4A2018"));
    const timber = this.solid(this.t("#4A3424", "#241A12")), plaster = this.solid(this.t("#EDE3C8", "#6A6458"), { flat: false });
    const wood = this.solid(this.t("#7A5838", "#3A2E22")), dark = this.solid("#1E1A16");
    switch (this.s.d.id) {
      case "storefront": {
        // Market hall: timber-framed guildhall on stone pillars, stalls beneath and around.
        this.box(17, 0.3, 11, this.solid(this.t("#9A8A72", "#3A342C")), 0, 0, 0);
        for (const x of [-6.5, -2.2, 2.2, 6.5]) for (const z of [-3.6, 3.6]) this.cyl(0.6, 0.7, 4, 10, this.walls(blank, 1, wallC), x, 0.3, z);
        this.box(16, 6, 9, plaster, 0, 4.3, 0);
        for (let x = -7.5; x <= 7.5; x += 2.5) for (const z of [-4.55, 4.55]) this.box(0.4, 6, 0.2, timber, x, 4.3, z);
        for (const y of [4.3, 7.2, 10.1]) for (const z of [-4.6, 4.6]) this.box(16.2, 0.4, 0.2, timber, 0, y, z);
        for (let x = -6.25; x <= 6.25; x += 2.5) { const b = this.part(new THREE.BoxGeometry(3.6, 0.3, 0.15), timber, x, 8.7, 4.62); b.rotation.z = 0.7; }
        this.gable(10.6, 6.5, 17, accent, 0, 10.3, 0, Math.PI / 2);
        for (let i = 0; i < 4; i++) this.ball(0.45, this.solid(["#C8402E", "#E8B040", "#6A8A3A", "#8A4AA8"][i]), -4.5 + i * 3, 1.3, 0);
        for (const x of [-5, 5]) {
          this.box(4.4, 1.1, 1.8, wood, x, 0.3, 7.2);
          for (let k = 0; k < 5; k++) this.gable(4.8, 1.4, 0.6, k % 2 ? plaster : accent, x, 3.6, 6.2 + k * 0.6);
          for (const [px, pz] of [[-2, 6], [2, 6], [-2, 8.6], [2, 8.6]]) this.cyl(0.1, 0.1, 3.6, 5, wood, x + px, 0, pz);
        }
        this.flagAt(0, 16.3, 0, 5, this.s.d.color);
        break;
      }
      case "email": {
        // Dovecote messenger tower with a little post house; pigeons carry letters round it.
        const w = this.walls(stone, 5, wallC);
        this.tower(stone, w, 4, 18, -3, 0, -2, 16);
        const holes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.6, 0.5), dark, 32);
        const m = new THREE.Matrix4();
        for (let i = 0; i < 32; i++) { const a = (i / 16) * Math.PI * 2, y = 14 + Math.floor(i / 16) * 1.6; holes.setMatrixAt(i, m.makeRotationY(-a).setPosition(-3 + Math.cos(a) * 3.85, y, -2 + Math.sin(a) * 3.85)); }
        this.root.add(holes);
        this.part(new THREE.TorusGeometry(4.2, 0.35, 6, 24), w, -3, 12.6, -2).rotation.x = Math.PI / 2;
        this.cone(5.2, 7, 16, accent, -3, 18, -2);
        this.flagAt(-3, 25, -2, 4, this.s.d.color);
        this.block(stone, w, 8, 6, 7, 4.5, 0, 2.5);
        this.gable(7.8, 3.6, 8.6, tile, 4.5, 6, 2.5, Math.PI / 2);
        const sign = new THREE.Group(); sign.position.set(4.5, 4.6, 6.6); this.root.add(sign);
        this.box(0.2, 0.2, 2, wood, 0, 0, 0.8, sign);
        const board = this.part(new THREE.CylinderGeometry(0.9, 0.9, 0.2, 16), accent, 0, -0.9, 1.6, sign); board.rotation.x = Math.PI / 2;
        this.on((_dt, t, r) => { if (!r) board.rotation.y = Math.sin(t * 1.5) * 0.2; });
        this.flock(14, 8, -3, -2);
        break;
      }
      case "telehealth": {
        // Apothecary abbey: stone chapel with rose window and bell tower, herb garden, brewing cauldron.
        const w = this.walls(stone, 11, wallC);
        this.block(stone, w, 8, 8, 15, 0, 0, -2);
        this.gable(9.4, 6, 15.6, tile, 0, 8, -2);
        this.part(new THREE.CircleGeometry(1.6, 24), this.glow(this.s.d.color, this.c.night ? 1.6 : 0.5), 0, 6.4, 5.55);
        this.part(new THREE.TorusGeometry(1.7, 0.25, 6, 24), w, 0, 6.4, 5.6);
        this.block(stone, w, 4, 15, 4, 6, 0, -6);
        this.cone(3.3, 5, 4, accent, 6, 15, -6);
        this.box(0.3, 1.8, 0.3, timber, 6, 20, -6); this.box(1.2, 0.3, 0.3, timber, 6, 21.1, -6);
        for (const [x0, z0, x1, z1] of [[-11, 0, -5, 0], [-11, 8, -5, 8], [-11, 0, -11, 8]]) this.part(new THREE.BoxGeometry(Math.hypot(x1 - x0, z1 - z0) || 0.6, 0.9, 0.6), w, (x0 + x1) / 2, 0.45, (z0 + z1) / 2).rotation.y = x0 === x1 ? Math.PI / 2 : 0;
        for (let i = 0; i < 4; i++) this.box(4.6, 0.5, 0.9, this.solid(i % 2 ? "#4E8A3A" : "#6A9A3A"), -8, 0, 1.6 + i * 1.6);
        for (let i = 0; i < 6; i++) this.ball(0.3, this.solid(["#C86AC8", "#E8D04A", "#E86A4A"][i % 3]), -10 + i * 0.9, 0.8, 1.6 + (i % 4) * 1.6);
        const pot = new THREE.Group(); pot.position.set(6, 0, 5); this.root.add(pot);
        this.part(new THREE.SphereGeometry(1.6, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), this.solid("#2A2A2E", { flat: false, side: THREE.DoubleSide }), 0, 1.8, 0, pot);
        this.part(new THREE.CircleGeometry(1.5, 20), this.glow("#6BFF6B", this.c.night ? 2 : 1.2), 0, 1.7, 0, pot).rotation.x = -Math.PI / 2;
        this.fire(6, 0, 5, 0.6, false);
        break;
      }
      case "backend": {
        // Watermill: stone mill house, a turning wheel and the millrace that drives it.
        const w = this.walls(stone, 17, wallC);
        this.block(stone, w, 10, 8, 9, -3, 0, -1);
        this.gable(10, 5, 10.8, tile, -3, 8, -1, Math.PI / 2);
        this.box(1.4, 4, 1.4, w, -6, 10, -3);
        this.box(10.6, 0.8, 9.6, accent, -3, 6.4, -1);
        const water = this.solid("#4A8AC8", { emissive: "#2A5A8A", ei: 0.25, rough: 0.15, flat: false });
        this.box(3, 0.2, 22, water, 4.4, 0.02, 0);
        this.box(0.3, 1, 22, w, 2.8, 0, 0); this.box(0.3, 1, 22, w, 6, 0, 0);
        this.box(2, 0.6, 9, wood, 4.4, 10.6, -6);
        this.box(1.6, 0.2, 8.6, water, 4.4, 11.0, -6);
        const wheel = new THREE.Group(); wheel.position.set(4.4, 5.6, 0); this.root.add(wheel);
        const axis = new THREE.Group(); axis.rotation.y = Math.PI / 2; wheel.add(axis);
        this.part(new THREE.TorusGeometry(5, 0.35, 8, 24), wood, 0, 0, 0, axis);
        for (let i = 0; i < 8; i++) {
          const sp = this.part(new THREE.BoxGeometry(0.3, 10, 0.3), wood, 0, 0, 0, axis); sp.rotation.z = (i / 8) * Math.PI;
          const pad = this.part(new THREE.BoxGeometry(0.4, 1.4, 2), wood, Math.cos((i / 8) * Math.PI * 2) * 5.2, Math.sin((i / 8) * Math.PI * 2) * 5.2, 0, axis);
          pad.rotation.z = (i / 8) * Math.PI * 2;
        }
        this.part(new THREE.CylinderGeometry(0.6, 0.6, 2.4, 10).rotateX(Math.PI / 2), accent, 0, 0, 0, axis);
        this.turn(axis, "z", -0.7);
        for (let i = 0; i < 2; i++) this.part(new THREE.CylinderGeometry(1.4, 1.4, 0.5, 18), w, -8 + i * 0.4, 0.7 + i * 0.5, 6).rotation.z = i ? 0.2 : 0;
        for (let i = 0; i < 3; i++) this.ball(0.8, plaster, -4 + i * 1.6, 0.7, 6.4).scale.set(1, 1.2, 1);
        break;
      }
      case "test": {
        // Forge and tilting yard: where blades and riders are tried.
        this.box(10, 0.3, 7, this.solid(this.t("#9A8A72", "#3A342C")), -3, 0, -3);
        for (const [x, z] of [[-7.6, -6.2], [1.6, -6.2], [-7.6, 0.2], [1.6, 0.2]]) this.cyl(0.25, 0.25, 5, 6, timber, x, 0, z);
        this.gable(8, 3, 11, accent, -3, 5, -3, Math.PI / 2);
        const w = this.walls(blank, 23, wallC);
        this.block(blank, w, 3.4, 3, 3, -5.5, 0, -4.5);
        this.cyl(0.9, 1.2, 12, 8, w, -5.5, 3, -5);
        this.smoke(-5.5, 15.5, -5);
        this.part(new THREE.BoxGeometry(1.8, 1, 0.2), this.glow("#FF7A2A", this.c.night ? 3 : 1.6), -5.5, 1.6, -2.95);
        this.box(1.2, 0.8, 0.6, this.solid("#3A3A40", { metal: 0.15 }), -1.5, 0.3, -2);
        this.box(0.5, 0.5, 0.5, this.solid("#2A2A2E"), -1.5, 1.1, -2);
        const grind = this.part(new THREE.CylinderGeometry(0.9, 0.9, 0.3, 16).rotateX(Math.PI / 2), w, 0.6, 1.4, -4);
        this.turn(grind, "z", 2);
        // Lists with a striped barrier, a spinning quintain and two targets
        for (let x = -10; x <= 10; x += 2) this.box(0.3, 1.4, 0.3, x % 4 ? plaster : accent, x, 0, 7);
        this.box(20.4, 0.25, 0.25, accent, 0, 1.2, 7);
        const q = new THREE.Group(); q.position.set(5.5, 0, 3); this.root.add(q);
        this.cyl(0.2, 0.25, 3.4, 6, timber, 0, 0, 0, q);
        const arm = new THREE.Group(); arm.position.y = 3.2; q.add(arm);
        this.box(4, 0.25, 0.25, timber, 0, 0, 0, arm); this.box(0.8, 1, 0.15, accent, -2, -0.5, 0, arm); this.ball(0.35, dark, 2, -0.5, 0, arm);
        this.turn(arm, "y", 1.4);
        for (const x of [-10, 10]) {
          const tgt = new THREE.Group(); tgt.position.set(x, 2.2, 10); tgt.rotation.x = -0.15; this.root.add(tgt);
          [["#F2EEE4", 1.6], ["#2A2A2E", 1.2], [this.s.d.color, 0.8], ["#E8C030", 0.4]].forEach(([col, rr], i) => {
            this.part(new THREE.CylinderGeometry(rr as number, rr as number, 0.25, 20).rotateX(Math.PI / 2), this.solid(col as string, { flat: false }), 0, 0, i * 0.05, tgt);
          });
          this.box(0.2, 2.2, 0.2, timber, x, 0, 9.4);
        }
        break;
      }
      case "knowledge": {
        // Scriptorium: a stone library hall with tall lit windows, a round book tower and a great book on a lectern.
        const w = this.walls(stone, 37, wallC);
        this.block(stone, w, 16, 9, 9, -2, 0, -3);
        this.gable(10.2, 5.5, 16.8, tile, -2, 9, -3, Math.PI / 2);
        const lit = this.glow("#FFD88A", this.c.night ? 1.6 : 0.3);
        for (let i = 0; i < 5; i++) {
          const x = -8 + i * 3;
          this.box(1.3, 4.2, 0.2, lit, x, 2.2, 1.56);
          this.part(new THREE.CircleGeometry(0.65, 12, 0, Math.PI), lit, x, 6.4, 1.67);
          if (i < 4) this.box(0.8, 6.5, 1.3, w, x + 1.5, 0, 2);
        }
        this.tower(stone, w, 3.4, 17, 8.5, 0, -4, 14);
        this.cone(4.2, 6.5, 14, accent, 8.5, 17, -4);
        this.flagAt(8.5, 23.5, -4, 4, this.s.d.color);
        this.box(2.6, 3.4, 0.25, dark, 8.5, 0, -0.55);
        this.box(0.6, 2.4, 0.6, timber, -2, 0, 7);
        this.openBook(-2, 2.6, 7, 1.1, accent, plaster, -0.45);
        this.box(4, 1.2, 1.6, wood, 5, 0, 7.5);
        this.books(5, 1.2, 7.5, 6);
        break;
      }
      case "media": {
        // Playhouse: a round timber theater open to the sky, its stage under a painted canopy.
        const n = 12, R = 9;
        this.part(new THREE.CircleGeometry(R, 24), this.solid(this.t("#A89878", "#3E3628"), { rough: 1 }), 0, 0.05, 0).rotation.x = -Math.PI / 2;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2 + Math.PI / n;
          if (Math.abs(a - Math.PI / 2) < 0.3) continue; // entrance faces the camera
          const seg = this.box(4.9, 7, 1.4, plaster, Math.cos(a) * R, 0, Math.sin(a) * R); seg.rotation.y = -a + Math.PI / 2;
          const post = this.box(0.4, 7.2, 0.4, timber, Math.cos(a - Math.PI / n) * (R + 0.7), 0, Math.sin(a - Math.PI / n) * (R + 0.7));
          post.rotation.y = -a;
          for (const y of [3.4, 6.8]) { const b = this.box(4.9, 0.3, 0.2, timber, Math.cos(a) * (R + 0.72), y, Math.sin(a) * (R + 0.72)); b.rotation.y = -a + Math.PI / 2; }
        }
        const ring = this.part(new THREE.CylinderGeometry(R - 0.6, R + 1.6, 2.4, n, 1, true), this.solid(this.t("#B89A5A", "#4A3E24"), { rough: 1, side: THREE.DoubleSide }), 0, 8.2, 0);
        ring.rotation.y = Math.PI / n;
        this.box(3.6, 8.5, 1.6, plaster, 0, 0, R + 0.4);
        this.gable(3, 1.8, 4.2, accent, 0, 8.5, R + 0.4, Math.PI / 2);
        this.box(2, 4, 0.2, dark, 0, 0, R + 1.25);
        // Stage, canopy and tiring house
        this.box(8, 1.4, 4.4, wood, 0, 0, -5);
        for (const x of [-2.6, 2.6]) this.cyl(0.3, 0.3, 5, 8, accent, x, 1.4, -3.4);
        this.gable(7.4, 2.4, 4.6, accent, 0, 6.4, -5, Math.PI / 2);
        this.block(blank, this.walls(blank, 43, wallC), 7, 11, 3, 0, 0, -8.4);
        this.gable(4, 2.4, 7.6, tile, 0, 11, -8.4, Math.PI / 2);
        this.flagAt(0, 13.4, -8.4, 5, this.s.d.color);
        break;
      }
      case "analytics": {
        // Astronomer's tower: a round tower with a turning dome and telescope, and a spinning armillary sphere.
        const w = this.walls(stone, 45, wallC);
        this.tower(stone, w, 4, 20, -3, 0, -3, 16);
        this.part(new THREE.TorusGeometry(4.3, 0.4, 6, 24), w, -3, 20, -3).rotation.x = Math.PI / 2;
        this.observatory(-3, 20.2, -3, 4.3, this.solid(this.t("#B8B0A0", "#4A463E")));
        this.block(stone, w, 7, 6, 6, 5, 0, 1);
        this.gable(6.6, 3, 7.4, tile, 5, 6, 1, Math.PI / 2);
        // Star chart banner on the tower
        const chart = this.box(2.4, 4, 0.1, this.solid("#1E2A4A"), -3, 9, 1.05);
        for (let i = 0; i < 9; i++) this.ball(0.12, this.glow("#FFF2C8", 1.4), -3.9 + (i * 37 % 10) * 0.2, 9.6 + (i * 53 % 30) * 0.1, 1.15);
        chart.castShadow = false;
        this.armillary(6, 0, 8, accent, timber);
        break;
      }
      case "products": {
        // Castle keep: the treasury holds the catalog.
        const w = this.walls(stone, 29, wallC);
        this.block(stone, w, 14, 20, 14, 0, 0, -2);
        const mer = this.walls(blank, 31, wallC);
        for (let i = -6.3; i <= 6.4; i += 2.1) for (const s of [-1, 1]) { this.box(1.2, 1.6, 1.2, mer, i, 20, -2 + s * 6.4); this.box(1.2, 1.6, 1.2, mer, s * 6.4, 20, -2 + i); }
        for (const [x, z] of [[-7.5, -9.5], [7.5, -9.5], [-7.5, 5.5], [7.5, 5.5]]) {
          this.tower(stone, w, 3.2, 25, x, 0, z, 14);
          this.cone(4, 7, 14, accent, x, 25, z);
          this.flagAt(x, 32, z, 4, this.s.d.color);
        }
        this.block(stone, w, 6, 11, 4, 0, 0, 7);
        for (let i = -2.25; i <= 2.3; i += 1.5) this.box(0.9, 1.2, 0.9, mer, i, 11, 8.6);
        this.box(3, 4.6, 0.3, dark, 0, 0, 9.05);
        for (let i = 0; i < 5; i++) this.box(0.15, 4.2, 0.1, this.solid("#3A3A40"), -1.2 + i * 0.6, 0.6, 9.25);
        for (const x of [-4.5, 4.5]) this.box(2, 7, 0.15, accent, x, 10, 5.08);
        const barrel = this.solid(this.t("#8A5A30", "#3A2A1A"), { flat: false });
        for (let i = 0; i < 3; i++) this.cyl(0.8, 0.9, 2, 12, barrel, -6 + i * 1.8, 0, 10.5);
        this.box(2.6, 1.4, 1.6, wood, 5.5, 0, 10.5);
        this.box(2.3, 0.4, 1.3, this.glow("#FFD24A", this.c.night ? 1.6 : 0.6), 5.5, 1.4, 10.5);
        break;
      }
    }
  }

  // ------------------------------------------------------------------ industrial

  industrial() {
    const { accent } = this.s;
    const brick = facadeSpec("industrial"), metal = facadeSpec("industrial", "metal");
    const steel = this.solid(this.t("#8A9098", "#4A4E56"), { metal: 0.15, rough: 0.5 });
    const concrete = this.solid(this.t("#B8B2A8", "#4A4644"));
    const roofM = this.solid(this.t("#5A5E64", "#2A2C30"));
    const yellow = this.solid("#E8B020");
    const sawtooth = (w: number, d: number, y: number, x: number, z: number, n: number) => {
      for (let i = 0; i < n; i++) this.gable(d / n, 2, w + 0.4, roofM, x, y, z - d / 2 + (d / n) * (i + 0.5), Math.PI / 2);
    };
    switch (this.s.d.id) {
      case "storefront": {
        // Freight depot: loading docks with trucks backed in and a lit sign on the roof.
        this.block(metal, this.walls(metal, 3, this.t("#7A8088", "#3A3E44")), 20, 9, 12, 0, 0, -3);
        sawtooth(20, 12, 9, 0, -3, 4);
        this.box(20, 1.2, 2.6, concrete, 0, 0, 4.3);
        for (const x of [-6, 0, 6]) {
          this.box(4.4, 5.4, 0.25, accent, x, 1.2, 3.05);
          this.box(3.8, 5, 0.3, this.solid(this.t("#B8BCC2", "#3A3E44")), x, 1.2, 3.1);
        }
        for (const x of [-6, 6]) {
          this.box(2.6, 3, 8, this.solid(this.t("#F2F2F0", "#6E6E70"), { flat: false }), x, 0.8, 10);
          this.box(2.62, 0.6, 8.02, accent, x, 2.4, 10);
          this.box(2.4, 2.4, 2.2, this.solid("#C8402E"), x, 0.6, 15.2);
        }
        for (const x of [-4.5, 4.5]) this.box(0.3, 3, 0.3, steel, x, 11, -1);
        this.box(11, 2.6, 0.4, accent, 0, 13, -1);
        break;
      }
      case "email": {
        // Radio station: brick transmitter house and a guyed lattice mast broadcasting.
        const w = this.walls(brick, 9, this.t("#8C4A36", "#4A2A22"));
        this.block(brick, w, 11, 7, 8, -3, 0, -3);
        this.box(11.4, 0.6, 8.4, accent, -3, 7, -3);
        const dish = this.part(new THREE.SphereGeometry(1.6, 16, 6, 0, Math.PI * 2, 0, 0.8), steel, -6, 9, -3); dish.rotation.x = -2.2;
        const mast = new THREE.Group(); mast.position.set(5, 0, 2); this.root.add(mast);
        this.part(new THREE.CylinderGeometry(0.3, 1.8, 28, 4, 4, true), new THREE.MeshStandardMaterial({ color: "#C8402E", wireframe: true }), 0, 14, 0, mast);
        for (let y = 4; y < 28; y += 6) this.part(new THREE.BoxGeometry(3.6 - y * 0.11, 0.25, 0.25), this.solid("#F2F2F0"), 0, y, 0, mast);
        const light = this.part(new THREE.SphereGeometry(0.5, 10, 8), new THREE.MeshBasicMaterial({ color: "#FF3A3A" }), 0, 28.4, 0, mast);
        this.on((_dt, t) => { light.visible = Math.sin(t * 4) > 0; });
        this.signal(mast, 27, this.s.d.color, 0, 8);
        // Guy wires from the mast to three ground anchors
        for (const a of [0.4, 2.5, 4.6]) {
          const from = new THREE.Vector3(Math.cos(a) * 7, 0, Math.sin(a) * 7), to = new THREE.Vector3(0, 24, 0);
          const dir = to.clone().sub(from);
          const g = this.part(new THREE.CylinderGeometry(0.04, 0.04, dir.length(), 3), steel, (from.x + to.x) / 2, 12, (from.z + to.z) / 2, mast);
          g.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
          this.box(0.6, 0.4, 0.6, this.solid(this.t("#B8B2A8", "#4A4644")), from.x, 0, from.z, mast);
        }
        break;
      }
      case "telehealth": {
        // Works infirmary: brick block with a white band and red cross, ambulance at the bay.
        const w = this.walls(brick, 15, this.t("#9A5A44", "#523428"));
        this.block(brick, w, 12, 10, 9, -2, 0, -3);
        this.box(12.2, 1.2, 9.2, this.solid(this.t("#F2F2EE", "#7A7A78")), -2, 8, -3);
        const cross = new THREE.MeshBasicMaterial({ color: this.s.d.color });
        this.box(4, 1.3, 0.3, cross, -2, 4.6, 1.6); this.box(1.3, 4, 0.3, cross, -2, 3.25, 1.6);
        this.cyl(0.6, 0.8, 6, 10, concrete, 2, 10, -6);
        this.box(6, 0.3, 6, roofM, 7, 4, 1); for (const [x, z] of [[4.4, 3.6], [9.6, 3.6]]) this.cyl(0.15, 0.15, 4, 6, steel, x, 0, z);
        const amb = new THREE.Group(); amb.position.set(7, 0, 2); this.root.add(amb);
        this.box(2.6, 2.6, 4.4, this.solid("#F4F4F2", { flat: false }), 0, 0.5, 0, amb);
        this.box(2.6, 1.8, 1.6, this.solid("#F4F4F2", { flat: false }), 0, 0.5, 3, amb);
        this.box(2.7, 0.5, 6.1, accent, 0, 1.4, 0.8, amb);
        const red = new THREE.MeshBasicMaterial({ color: "#FF2A3A" }), blue = new THREE.MeshBasicMaterial({ color: "#2A6AFF" });
        const l1 = this.box(0.9, 0.4, 0.5, red, -0.6, 3.1, 1.2, amb), l2 = this.box(0.9, 0.4, 0.5, blue, 0.6, 3.1, 1.2, amb);
        this.on((_dt, t) => { const on = Math.sin(t * 9) > 0; l1.visible = on; l2.visible = !on; });
        break;
      }
      case "backend": {
        // Power station: turbine hall, twin stacks, cooling tower and a transformer yard.
        const w = this.walls(brick, 21, this.t("#8C4A36", "#4A2A22"));
        this.block(brick, w, 14, 12, 10, -4, 0, -3);
        this.gable(10.8, 3, 14.6, roofM, -4, 12, -3, Math.PI / 2);
        for (const x of [-8, -3]) {
          this.cyl(0.9, 1.3, 18, 14, concrete, x, 12, -7);
          this.cyl(1, 1, 2, 14, accent, x, 27, -7);
          this.smoke(x, 31, -7);
        }
        const pts: THREE.Vector2[] = [];
        for (let i = 0; i <= 12; i++) { const y = (i / 12) * 16; const k = (y - 11) / 11; pts.push(new THREE.Vector2(3.6 + k * k * 3.4, y)); }
        this.part(new THREE.LatheGeometry(pts, 28), this.solid(this.t("#CFC8BC", "#5A5652"), { flat: false, side: THREE.DoubleSide }), 7, 0, -2);
        this.part(new THREE.TorusGeometry(4.0, 0.25, 6, 28), accent, 7, 13.5, -2).rotation.x = Math.PI / 2;
        this.smoke(7, 17, -2);
        for (let i = 0; i < 3; i++) this.box(1.6, 2, 1.6, steel, -8 + i * 3, 0, 5);
        this.part(new THREE.CylinderGeometry(0.2, 1.4, 12, 4, 3, true), new THREE.MeshStandardMaterial({ color: this.t("#6A6E76", "#3A3E44"), wireframe: true }), 6, 6, 7);
        this.box(4, 0.2, 0.2, steel, 6, 11, 7);
        break;
      }
      case "test": {
        // Testing foundry: open bay glowing with a furnace, gantry crane hoisting parts to the inspection pad.
        const w = this.walls(metal, 27, this.t("#6A7078", "#363A40"));
        this.block(metal, w, 16, 8, 9, 0, 0, -5);
        sawtooth(16, 9, 8, 0, -5, 3);
        this.box(6, 5, 0.2, this.solid("#1A1614"), 0, 0, -0.45);
        this.box(4, 2.6, 0.3, this.glow("#FF6A1A", this.c.night ? 3 : 1.8), 0, 0.4, -0.7);
        this.cyl(0.8, 0.9, 6, 10, concrete, 5.5, 8, -7); this.smoke(5.5, 15, -7);
        this.box(8, 0.2, 6, this.solid(this.t("#9C9A94", "#36342F")), 0, 0, 5);
        for (let i = 0; i < 8; i++) this.box(1, 0.21, 0.4, i % 2 ? yellow : this.solid("#1A1A1A"), -3.5 + i, 0, 2.2);
        const gt = new THREE.Group(); gt.position.set(0, 0, 5); this.root.add(gt);
        for (const x of [-7, 7]) for (const z of [-2.8, 2.8]) this.box(0.6, 10, 0.6, yellow, x, 0, z, gt);
        for (const z of [-2.8, 2.8]) this.box(14.6, 0.8, 0.6, yellow, 0, 10, z, gt);
        const bridge = new THREE.Group(); bridge.position.y = 10.4; gt.add(bridge);
        this.box(0.8, 0.8, 6.2, yellow, 0, 0, 0, bridge);
        this.box(1.2, 0.8, 1.2, steel, 0, -0.8, 0, bridge);
        this.cyl(0.05, 0.05, 5, 4, steel, 0, -5.8, 0, bridge);
        this.box(1.6, 1.4, 1.6, accent, 0, -7.2, 0, bridge);
        this.on((_dt, t, r) => { if (!r) bridge.position.x = Math.sin(t * 0.5) * 5.5; });
        this.box(1.8, 2.4, 1.6, this.solid(this.t("#E8E4DC", "#5A5854")), 8, 0, 9);
        this.ball(0.35, new THREE.MeshBasicMaterial({ color: "#5BFF8A" }), 8, 2.8, 9.8);
        break;
      }
      case "knowledge": {
        // Carnegie library: brick hall behind a stone portico, a domed reading room and lamp posts.
        const w = this.walls(brick, 37, this.t("#9A5A44", "#523428"));
        this.block(brick, w, 18, 9, 11, 0, 0, -3);
        this.box(18.8, 0.9, 11.8, concrete, 0, 9, -3);
        this.cyl(3.4, 3.4, 2.2, 20, concrete, 0, 9.9, -3);
        const dm = this.part(dome(24), accent, 0, 12.1, -3); dm.scale.set(3.6, 3, 3.6);
        this.cyl(0.2, 0.3, 1.6, 6, concrete, 0, 15, -3);
        for (let i = 0; i < 3; i++) this.box(11 - i * 0.8, 0.5, 2.4 - i * 0.6, concrete, 0, i * 0.5, 4.8 - i * 0.3);
        for (const x of [-4, -1.35, 1.35, 4]) this.cyl(0.5, 0.6, 7, 12, concrete, x, 1.5, 4.2);
        this.box(10.4, 1, 2.2, concrete, 0, 8.5, 3.6);
        const ped = this.part(new THREE.ConeGeometry(1, 1, 3), accent, 0, 10.3, 3.6); ped.scale.set(6.2, 1.6, 1.2);
        const lit = this.glow("#FFD88A", this.c.night ? 1.4 : 0.2);
        for (const x of [-7, -5.5, 5.5, 7]) { this.box(1.1, 4, 0.2, lit, x, 2.6, 2.56); this.part(new THREE.CircleGeometry(0.55, 12, 0, Math.PI), lit, x, 6.6, 2.67); }
        for (const x of [-7.5, 7.5]) { this.cyl(0.12, 0.15, 4.4, 6, this.solid("#2A2A2E"), x, 0, 7.4); this.ball(0.5, this.glow("#FFE8B0", this.c.night ? 2 : 0.4), x, 4.6, 7.4); }
        this.books(0, 1.5, 6.2, 6);
        break;
      }
      case "media": {
        // Picture palace: an art-deco cinema with a blade sign, a marquee of chasing bulbs and poster frames.
        const w = this.walls(brick, 41, this.t("#7A4A3A", "#3E2620"));
        this.block(brick, w, 14, 10, 13, 0, 0, -4);
        this.box(16, 12, 1, concrete, 0, 0, 3);
        this.box(10, 2, 1, concrete, 0, 12, 3);
        this.box(5, 1.6, 1, concrete, 0, 14, 3);
        this.box(0.9, 11, 3, accent, 0, 9, 4.9);
        const bladePts: [number, number, number][] = [];
        for (let i = 0; i < 12; i++) for (const z of [3.5, 6.3]) bladePts.push([0.5, 9.4 + i * 0.9, z]);
        this.chase(bladePts);
        this.box(13, 2.4, 3.6, accent, 0, 4.6, 5.3);
        this.box(11.4, 1.3, 0.1, this.glow("#FFF6E0", this.c.night ? 1.2 : 0.3), 0, 5.1, 7.16);
        const marquee: [number, number, number][] = [];
        for (let i = 0; i < 16; i++) marquee.push([-6.2 + i * 0.83, 4.5, 7.2]);
        this.chase(marquee);
        this.box(6, 3.6, 0.2, this.solid("#1A2A3A", { metal: 0.3, rough: 0.2 }), 0, 0, 3.55);
        ["#C8402E", "#2E6AC8", "#E8A030", "#3A8A4A"].forEach((col, i) => {
          const x = [-6.4, -4.2, 4.2, 6.4][i];
          this.box(1.8, 2.8, 0.2, this.solid("#C8A040", { metal: 0.3 }), x, 0.6, 3.55);
          this.box(1.4, 2.3, 0.1, this.glow(col, this.c.night ? 0.9 : 0.15), x, 0.85, 3.7);
        });
        break;
      }
      case "analytics": {
        // Observatory: a brick hall under a big turning dome, with a gauge tower and a sweeping searchlight.
        const w = this.walls(brick, 45, this.t("#8C4A36", "#4A2A22"));
        this.block(brick, w, 12, 8, 12, -3, 0, -3);
        this.box(12.6, 0.7, 12.6, concrete, -3, 8, -3);
        this.cyl(5.6, 5.6, 2.4, 24, concrete, -3, 8.7, -3);
        this.observatory(-3, 11.1, -3, 5.8, this.solid(this.t("#E8ECF0", "#5A5E66"), { metal: 0.3, rough: 0.3, flat: false }));
        this.block(metal, this.walls(metal, 47, this.t("#7A8088", "#3A3E44")), 5, 12, 5, 7.5, 0, 2);
        const dial = new THREE.Group(); dial.position.set(7.5, 8.5, 4.6); this.root.add(dial);
        this.part(new THREE.CylinderGeometry(1.8, 1.8, 0.3, 24).rotateX(Math.PI / 2), this.glow("#F4F0E0", this.c.night ? 0.8 : 0.1), 0, 0, 0, dial);
        const needle = this.part(new THREE.BoxGeometry(0.15, 1.5, 0.1), accent, 0, 0.6, 0.25, new THREE.Group());
        dial.add(needle.parent!);
        this.on((_dt, t, r) => { needle.parent!.rotation.z = r ? 0 : Math.sin(t * 0.7) * 1.2; });
        const light = new THREE.Group(); light.position.set(7.5, 12, 2); this.root.add(light);
        this.cyl(0.8, 0.8, 1.2, 12, steel, 0, 0, 0, light);
        const beam = this.part(new THREE.ConeGeometry(2.4, 26, 16, 1, true), this.holo(this.s.d.color, this.c.night ? 0.18 : 0.06), 0, 13.6, 0, new THREE.Group());
        beam.castShadow = false; const tilt = beam.parent!; tilt.rotation.z = -0.5; light.add(tilt);
        this.turn(light, "y", 0.5);
        break;
      }
      case "products": {
        // Distribution warehouse: big sawtooth hall, rooftop water tower, containers, conveyor and a forklift.
        const w = this.walls(metal, 33, this.t("#7A8088", "#3A3E44"));
        this.block(metal, w, 28, 10, 18, 0, 0, -3);
        sawtooth(28, 18, 10, 0, -3, 6);
        this.box(28.2, 1.2, 18.2, accent, 0, 7.6, -3);
        for (const x of [-9, -3, 3, 9]) this.box(4, 5, 0.3, this.solid(this.t("#B8BCC2", "#3A3E44")), x, 0, 6.05);
        const tank = new THREE.Group(); tank.position.set(8, 12, -7); this.root.add(tank);
        for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) this.cyl(0.15, 0.15, 5, 6, steel, x, 0, z, tank);
        this.cyl(2.6, 2.6, 4, 16, accent, 0, 5, 0, tank);
        this.cone(2.8, 1.6, 16, roofM, 0, 9, 0, tank);
        const colors = ["#C8402E", "#2E6AC8", "#E8A030", "#3A8A4A", this.s.d.color];
        for (let i = 0; i < 7; i++) this.box(2.4, 2.6, 6, this.solid(colors[i % 5]), -14 + (i % 4) * 2.6, Math.floor(i / 4) * 2.6, 10);
        this.box(14, 0.5, 2, this.solid("#2A2C30"), 6, 1.4, 9);
        const boxes = [0, 1, 2, 3, 4].map(i => ({ b: this.box(1.4, 1.2, 1.4, this.solid(i % 2 ? "#C89A5A" : this.s.d.color), 0, 1.9, 9), ph: i / 5 }));
        this.on((_dt, t, r) => boxes.forEach(({ b, ph }) => { b.position.x = 6 + ((r ? ph : (t * 0.12 + ph) % 1) - 0.5) * 13; }));
        const fl = new THREE.Group(); fl.position.set(1, 0, 13); this.root.add(fl);
        this.box(2, 1.6, 3, yellow, 0, 0.4, 0, fl);
        this.box(0.2, 4, 0.2, steel, -0.7, 0, 1.7, fl); this.box(0.2, 4, 0.2, steel, 0.7, 0, 1.7, fl);
        this.box(1.8, 1.6, 1.8, this.solid("#C89A5A"), 0, 0.6, 2.8, fl);
        this.on((_dt, t, r) => { if (!r) fl.position.x = 1 + Math.sin(t * 0.4) * 4; });
        break;
      }
    }
  }

  // ------------------------------------------------------------------ stone age

  stone() {
    const { accent } = this.s;
    const mud = facadeSpec("stoneage", "house");
    const thatch = this.solid(this.c.p.roof, { rough: 1 });
    const hide = this.solid(this.t("#C8A878", "#5A4A38"), { side: THREE.DoubleSide });
    const wood = this.solid(this.t("#6E5034", "#3A2C20"));
    const rock = this.solid(this.t("#8E8A80", "#4A4A4E"));
    const dirt = this.solid(this.t("#A08860", "#3E3424"), { rough: 1 });
    const clay = ["#A0603A", "#8A4A2A", "#B8784A"];
    switch (this.s.d.id) {
      case "storefront": {
        // Trading circle: hide lean-tos around a cleared ground, goods laid out on blankets.
        this.part(new THREE.CircleGeometry(11, 32), dirt, 0, 0.04, 0).rotation.x = -Math.PI / 2;
        for (let i = 0; i < 5; i++) {
          const a = Math.PI + 0.2 + (i / 4) * (Math.PI - 0.4), x = Math.cos(a) * 8, z = Math.sin(a) * 8 * 0.9;
          const st = new THREE.Group(); st.position.set(x, 0, z); st.rotation.y = -a - Math.PI / 2; this.root.add(st);
          for (const s of [-1.8, 1.8]) this.cyl(0.12, 0.14, 4.4, 5, wood, s, 0, 1.6, st);
          const roof = this.part(new THREE.PlaneGeometry(4.4, 3.6), i % 2 ? accent : hide, 0, 3.1, 0.4, st); roof.rotation.x = -0.9;
          this.box(3.6, 0.08, 2.4, i % 2 ? hide : accent, 0, 0, 2.6, st);
          for (let k = 0; k < 3; k++) this.ball(0.45, this.solid(clay[k], { flat: false }), -1.1 + k * 1.1, 0.45, 2.6, st);
        }
        this.cyl(0.5, 0.6, 7, 8, wood, 0, 0, 0);
        for (let i = 0; i < 3; i++) this.part(new THREE.TorusGeometry(0.62, 0.15, 6, 14), accent, 0, 2.5 + i * 1.6, 0).rotation.x = Math.PI / 2;
        this.cone(0.9, 1.4, 6, accent, 0, 7, 0);
        this.fire(0, 0, 4.5, 0.9);
        break;
      }
      case "email": {
        // Signal tower: lookout on log legs with a beacon fire sending smoke; drum at the foot.
        this.part(dome(20), this.solid(this.t("#6E9048", "#2A3A1E"), { rough: 1 }), 0, 0, 0).scale.set(9, 2.6, 9);
        for (const [x, z] of [[-2.2, -2.2], [2.2, -2.2], [-2.2, 2.2], [2.2, 2.2]]) {
          const leg = this.cyl(0.32, 0.4, 14, 6, wood, x, 1.5, z); leg.rotation.set(z * -0.025, 0, x * 0.025);
        }
        for (const y of [6, 11]) for (const s of [-1, 1]) { this.box(4.8, 0.2, 0.2, wood, 0, y, s * 2.1); this.box(0.2, 0.2, 4.8, wood, s * 2.1, y, 0); }
        this.box(6, 0.5, 6, wood, 0, 15.5, 0);
        for (const s of [-1, 1]) { this.box(6, 1, 0.2, accent, 0, 16, s * 2.9); this.box(0.2, 1, 6, wood, s * 2.9, 16, 0); }
        for (let y = 2.5; y < 15.5; y += 1.1) this.box(1.4, 0.12, 0.12, wood, 0, y, 2.6);
        this.fire(0, 16, 0, 1.3);
        this.smoke(0, 19, 0);
        this.cyl(1.1, 1.1, 1.4, 12, wood, 4.5, 2.4, 4.5);
        this.part(new THREE.CircleGeometry(1.1, 12), hide, 4.5, 3.82, 4.5).rotation.x = -Math.PI / 2;
        break;
      }
      case "telehealth": {
        // Shaman's lodge: great round lodge with painted bands, a heart totem and herb racks.
        const w = this.walls(mud, 3, this.c.p.wall[0]);
        this.tower(mud, w, 6.5, 4.5, 0, 0, -2, 18, thatch);
        for (const y of [1.2, 3.2]) this.part(new THREE.TorusGeometry(6.55, 0.18, 6, 32), accent, 0, y, -2).rotation.x = Math.PI / 2;
        this.cone(8.6, 8, 18, thatch, 0, 4.5, -2);
        this.cone(1.2, 1.4, 8, accent, 0, 12.4, -2);
        this.smoke(0, 13, -2);
        const tt = new THREE.Group(); tt.position.set(6, 0, 5); this.root.add(tt);
        this.cyl(0.9, 1.1, 9, 8, wood, 0, 0, 0, tt);
        for (let i = 0; i < 3; i++) this.part(new THREE.TorusGeometry(1, 0.18, 6, 16), accent, 0, 2 + i * 2.6, 0, tt).rotation.x = Math.PI / 2;
        const heart = this.part(slab(heartShape(0.7), 0.8), this.solid("#C8503A", { emissive: "#C8503A", ei: this.c.night ? 0.6 : 0 }), 0, 10.4, 0, tt);
        this.on((_dt, t, r) => { if (!r) heart.scale.setScalar(1 + Math.max(0, Math.sin(t * 6)) ** 8 * 0.25); });
        for (const x of [-7, -4]) this.cyl(0.12, 0.12, 3.4, 5, wood, x, 0, 6);
        this.part(new THREE.CylinderGeometry(0.1, 0.1, 3.4, 5).rotateZ(Math.PI / 2), wood, -5.5, 3.3, 6);
        for (let i = 0; i < 4; i++) this.part(new THREE.ConeGeometry(0.3, 1, 5).rotateX(Math.PI), this.solid("#5E8A3A"), -6.6 + i * 0.75, 2.6, 6);
        break;
      }
      case "backend": {
        // Stone circle: sarsen ring, inner trilithons and a glowing altar stone.
        const R = 9.5, n = 14;
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          this.part(new THREE.BoxGeometry(1.8, 7, 1.2), rock, Math.cos(a) * R, 3.5, Math.sin(a) * R).rotation.y = -a;
          const a2 = a + Math.PI / n;
          this.part(new THREE.BoxGeometry(1.1, 1, 2 * R * Math.sin(Math.PI / n) + 1.4), rock, Math.cos(a2) * R, 7.5, Math.sin(a2) * R).rotation.y = -a2;
        }
        for (let i = 0; i < 3; i++) {
          const a = Math.PI * 0.75 + (i / 2) * Math.PI * 0.5 + Math.PI, x = Math.cos(a) * 4.5, z = Math.sin(a) * 4.5;
          const tri = new THREE.Group(); tri.position.set(x, 0, z); tri.rotation.y = -a + Math.PI / 2; this.root.add(tri);
          for (const s of [-1, 1]) this.box(1.4, 9, 1.4, rock, s * 1.1, 0, 0, tri);
          this.box(4, 1.2, 1.4, rock, 0, 9, 0, tri);
        }
        this.box(3.6, 0.8, 1.6, rock, 0, 0, 0);
        const gem = this.part(new THREE.IcosahedronGeometry(1.2, 0), this.glow(this.s.d.color, this.c.night ? 1.8 : 0.7), 0, 3, 0);
        gem.castShadow = false; this.spin(gem, 0.5); this.bob(gem, 0.5);
        break;
      }
      case "test": {
        // Hunters' camp: mammoth-bone hut, spear rack and a hide target to practise on.
        const hut = this.part(dome(18), hide, -2, 0, -2); hut.scale.set(5.5, 4.6, 5.5);
        const ivory = this.solid(this.t("#F0E6CC", "#7A7464"), { flat: false });
        for (let i = 0; i < 6; i++) {
          const arc = this.part(new THREE.TorusGeometry(5.6, 0.32, 6, 18, Math.PI), ivory, -2, 0, -2);
          arc.rotation.y = (i / 6) * Math.PI;
        }
        for (const s of [-1, 1]) { const tusk = this.part(new THREE.TorusGeometry(2.2, 0.35, 6, 14, Math.PI * 0.8), ivory, -2 + s * 1.4, 0, 3.2); tusk.rotation.set(0, Math.PI / 2, s > 0 ? 0.2 : Math.PI - 0.2); }
        this.box(1.8, 2.4, 0.2, this.solid("#2A1E14"), -2, 0, 3.4);
        this.part(new THREE.TorusGeometry(5.2, 0.25, 6, 32), accent, -2, 2.2, -2).rotation.x = Math.PI / 2;
        // Spear rack
        for (let i = 0; i < 5; i++) { const sp = this.cyl(0.06, 0.06, 5, 4, wood, 5 + i * 0.5, 0, -4); sp.rotation.z = 0.15; this.cone(0.15, 0.6, 4, rock, 5.4 + i * 0.5, 5, -4); }
        this.box(3, 0.15, 0.15, wood, 6, 3, -3.8);
        // Target
        const tg = new THREE.Group(); tg.position.set(7, 0, 5); this.root.add(tg);
        for (const x of [-2, 2]) this.cyl(0.16, 0.18, 5.4, 5, wood, x, 0, 0, tg);
        this.part(new THREE.PlaneGeometry(3.8, 3.4), hide, 0, 3, 0, tg);
        this.part(new THREE.CircleGeometry(0.9, 16), accent, 0, 3, 0.05, tg);
        for (let i = 0; i < 3; i++) { const s = this.part(new THREE.CylinderGeometry(0.05, 0.05, 3.4, 4), wood, -0.6 + i * 0.6, 3.2 - i * 0.3, 1.4, tg); s.rotation.x = Math.PI / 2 + 0.2; }
        this.fire(1, 0, 7, 0.9);
        this.smoke(1, 2.5, 7);
        break;
      }
      case "knowledge": {
        // Elders' cave: a rock outcrop whose painted wall keeps the tribe's knowledge, with story stones and a fire.
        const big = this.part(new THREE.DodecahedronGeometry(5, 0), rock, -3, 2.6, -6); big.scale.set(1.3, 0.85, 1);
        this.part(new THREE.DodecahedronGeometry(3, 0), rock, -10, 1.4, -4);
        this.part(new THREE.CircleGeometry(2.4, 16, 0, Math.PI), this.solid("#1A140E"), -3, 0.02, -1.2);
        this.part(new THREE.CircleGeometry(1.8, 16, 0, Math.PI), this.glow("#FF9A3A", this.c.night ? 1.4 : 0.5), -3, 0.02, -1.25);
        const wallR = this.box(8, 5.5, 0.8, rock, 6, 0, -2); wallR.rotation.y = -0.35;
        const paint = ["#B8402A", "#E8A040", "#2A2420", this.s.d.color];
        for (let i = 0; i < 7; i++) {
          const m = this.part(new THREE.PlaneGeometry(1 + (i % 3) * 0.4, 0.7 + (i % 2) * 0.4), this.solid(paint[i % 4], { emissive: paint[i % 4], ei: this.c.night ? 0.5 : 0.05 }), 4.2 + i * 0.85, 1.4 + (i * 7 % 5) * 0.7, 0.52 + i * 0.3, wallR.parent!);
          m.rotation.y = -0.35; m.castShadow = false;
        }
        for (let i = 0; i < 5; i++) {
          const a = Math.PI * 0.15 + (i / 4) * Math.PI * 0.7, x = Math.cos(a) * 9, z = 6 + Math.sin(a) * 3;
          const h = 3 + (i % 3) * 0.7;
          this.box(1.3, h, 0.8, rock, x, 0, z).rotation.y = -a + Math.PI / 2;
          this.box(1.36, 0.4, 0.86, accent, x, h * 0.65, z).rotation.y = -a + Math.PI / 2;
        }
        this.fire(-2, 0, 6, 1);
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + 0.4; this.part(new THREE.CylinderGeometry(0.45, 0.45, 2.6, 8).rotateZ(Math.PI / 2), wood, -2 + Math.cos(a) * 3.4, 0.45, 6 + Math.sin(a) * 3.4).rotation.y = -a; }
        break;
      }
      case "media": {
        // Painted hides and a totem: the tribe's art, around a drum circle.
        this.part(new THREE.CircleGeometry(10, 32), dirt, 0, 0.04, 0).rotation.x = -Math.PI / 2;
        const totem = [this.s.d.color, "#B8402A", "#E8C060", "#3A6A4A", "#2A2420"];
        for (let i = 0; i < 5; i++) {
          const seg = this.cyl(1.1, 1.2, 2.4, 8, this.solid(totem[i]), 0, i * 2.4, -6);
          for (const s of [-1, 1]) this.ball(0.25, this.solid("#F4EEDC"), s * 0.45, i * 2.4 + 1.5, -4.95);
          seg.rotation.y = i * 0.2;
        }
        for (const s of [-1, 1]) { const wing = this.box(3.4, 0.8, 0.4, accent, s * 2.4, 9.4, -6); wing.rotation.z = s * 0.25; }
        this.cone(1.4, 2, 6, accent, 0, 12, -6);
        for (let i = 0; i < 4; i++) {
          const a = Math.PI + 0.5 + (i / 3) * (Math.PI - 1), x = Math.cos(a) * 8, z = Math.sin(a) * 6 - 1;
          const f = new THREE.Group(); f.position.set(x, 0, z); f.rotation.y = -a - Math.PI / 2; this.root.add(f);
          for (const px of [-1.6, 1.6]) this.cyl(0.14, 0.16, 5, 5, wood, px, 0, 0, f);
          for (const y of [1, 4.6]) this.box(3.6, 0.2, 0.2, wood, 0, y, 0, f);
          const tex = this.paintedHide(i);
          this.part(new THREE.PlaneGeometry(2.8, 3.2), new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 1 }), 0, 2.8, 0.05, f).castShadow = false;
        }
        const drums: THREE.Object3D[] = [];
        for (let i = 0; i < 3; i++) {
          const x = -3 + i * 3, z = 5 + (i % 2);
          this.cyl(0.9, 0.7, 1.4, 12, this.solid(clay[i]), x, 0, z);
          drums.push(this.cyl(0.92, 0.92, 0.1, 12, hide, x, 1.4, z));
        }
        this.on((_dt, t, r) => { drums.forEach((d, i) => { d.scale.y = r ? 1 : 1 + Math.max(0, Math.sin(t * 7 + i * 2)) ** 6 * 4; }); });
        this.fire(0, 0, 1, 0.8);
        break;
      }
      case "analytics": {
        // Sun watchers' mound: a gnomon pole whose shadow sweeps a ring of marker stones, and a lookout platform.
        const mound = this.part(new THREE.SphereGeometry(9, 24, 10, 0, Math.PI * 2, 0, Math.PI / 2), this.solid(this.t("#7A8A4A", "#323A24"), { rough: 1 }), 0, 0, -1);
        mound.scale.set(1, 0.32, 1);
        this.cyl(0.35, 0.55, 13, 8, wood, 0, 2.6, -1);
        this.cone(0.8, 1.6, 6, accent, 0, 15.6, -1);
        for (let i = 0; i < 9; i++) {
          const a = Math.PI * 0.1 + (i / 8) * Math.PI * 0.8, x = Math.cos(a) * 7.5, z = -1 + Math.sin(a) * 7.5;
          this.box(0.9, 1.6 + (i === 4 ? 1.4 : (i % 2) * 0.5), 0.7, i === 4 ? accent : rock, x, 1.2 - Math.abs(Math.cos(a)) * 0.6, z).rotation.y = -a;
        }
        const shadow = new THREE.Group(); shadow.position.set(0, 2.95, -1); this.root.add(shadow);
        const sm = this.part(new THREE.PlaneGeometry(0.6, 7), new THREE.MeshBasicMaterial({ color: "#1A1A12", transparent: true, opacity: 0.35, depthWrite: false }), 0, 0, 3.5, shadow);
        sm.rotation.x = -Math.PI / 2; sm.castShadow = false;
        this.on((_dt, t, r) => { shadow.rotation.y = r ? 0 : Math.sin(t * 0.2) * 1.1; });
        const plat = new THREE.Group(); plat.position.set(-10, 0, -8); this.root.add(plat);
        for (const [x, z] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) this.cyl(0.18, 0.22, 8, 5, wood, x, 0, z, plat);
        this.box(4, 0.3, 4, wood, 0, 7, 0, plat);
        this.cone(3.2, 2.4, 4, thatch, 0, 9.6, 0, plat);
        for (let y = 1; y < 7; y += 1.1) this.box(1.2, 0.12, 0.12, wood, 0, y, 2.1, plat);
        break;
      }
      case "products": {
        // Longhouse granary: a long thatched hall with raised grain stores and heaps of clay pots.
        const w = this.walls(mud, 11, this.c.p.wall[1]);
        this.block(mud, w, 26, 3.4, 9, 0, 0, -3, thatch);
        this.gable(12, 9, 27, thatch, 0, 3.4, -3, Math.PI / 2);
        for (const s of [-1, 1]) for (const r of [-1, 1]) { const p = this.cyl(0.18, 0.18, 4, 5, wood, s * 13.2, 11, -3 + r * 0.6); p.rotation.x = r * 0.5; }
        this.box(2.4, 2.8, 0.3, accent, 0, 0, 1.6);
        this.box(26.2, 0.6, 9.2, accent, 0, 2.6, -3);
        for (const x of [-10, -5.5, 5.5, 10]) {
          for (const [px, pz] of [[-1.2, -1.2], [1.2, -1.2], [-1.2, 1.2], [1.2, 1.2]]) this.cyl(0.15, 0.15, 2.6, 5, wood, x + px, 0, 7 + pz);
          this.box(3.4, 0.3, 3.4, wood, x, 2.6, 7);
          this.cyl(1.4, 1.5, 2, 10, this.solid(this.c.p.wall[2]), x, 2.9, 7);
          this.cone(2.1, 2.2, 10, thatch, x, 4.9, 7);
        }
        for (let i = 0; i < 9; i++) {
          const x = (i % 3) * 1.8 - 1.8, z = 6.5 + Math.floor(i / 3) * 1.8;
          this.ball(0.8, this.solid(clay[i % 3], { flat: false }), x, 0.8, z).scale.set(1, 1.2, 1);
          if (i % 3 === 1) this.part(new THREE.TorusGeometry(0.62, 0.12, 6, 14), accent, x, 1, z).rotation.x = Math.PI / 2;
        }
        break;
      }
    }
  }

  // ------------------------------------------------------------------ space

  space() {
    const { accent } = this.s;
    const panel = facadeSpec("space");
    const metal = this.solid(this.t("#D8DEE8", "#4A5060"), { metal: 0.15, rough: 0.35, flat: false });
    const dark = this.solid(this.t("#5A6070", "#2A2E38"), { metal: 0.15, rough: 0.5 });
    const glass = new THREE.MeshStandardMaterial({ color: "#CFEFFF", transparent: true, opacity: 0.25, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
    const holo = this.holo(this.s.d.color, 0.6);
    const lights = (r: number, y: number, n: number) => {
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; this.part(new THREE.SphereGeometry(0.25, 8, 6), new THREE.MeshBasicMaterial({ color: this.s.d.color }), Math.cos(a) * r, y, Math.sin(a) * r); }
    };
    switch (this.s.d.id) {
      case "storefront": {
        // Trade dome: kiosks under a glass dome, a hologram bag over the concourse.
        this.cyl(11.5, 12, 0.8, 40, dark, 0, 0, 0);
        this.part(new THREE.TorusGeometry(11.6, 0.3, 8, 64), accent, 0, 0.8, 0).rotation.x = Math.PI / 2;
        const dm = this.part(dome(48), glass, 0, 0.8, 0); dm.scale.set(10.5, 8, 10.5); dm.castShadow = false;
        for (let i = 0; i < 4; i++) this.part(new THREE.TorusGeometry(10.5, 0.15, 6, 48, Math.PI), metal, 0, 0.8, 0).rotation.set(0, (i / 4) * Math.PI, 0);
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          this.box(2.2, 2, 1.6, metal, Math.cos(a) * 6, 0.8, Math.sin(a) * 6).rotation.y = -a;
          this.box(2.4, 0.3, 1.8, i % 2 ? accent : metal, Math.cos(a) * 6, 2.8, Math.sin(a) * 6).rotation.y = -a;
        }
        const bag = this.icon("bag", holo, holo); bag.position.y = 5.5; this.root.add(bag);
        this.spin(bag, 0.7); this.bob(bag, 0.5);
        lights(12.4, 0.5, 16);
        break;
      }
      case "email": {
        // Comms array: panel tower with a big sweeping dish and two small relays.
        const w = this.walls(panel, 7, this.c.p.wall[0]);
        this.tower(panel, w, 2.6, 16, 0, 0, -1, 20, metal);
        this.part(new THREE.TorusGeometry(2.7, 0.2, 6, 24), accent, 0, 8, -1).rotation.x = Math.PI / 2;
        const mount = new THREE.Group(); mount.position.set(0, 16, -1); this.root.add(mount);
        this.cyl(0.5, 0.8, 3, 12, metal, 0, 0, 0, mount);
        const dish = new THREE.Group(); dish.position.y = 3.4; dish.rotation.x = -0.7; mount.add(dish);
        const bowl = this.part(new THREE.SphereGeometry(6, 32, 10, 0, Math.PI * 2, 0, 0.75), this.solid(this.t("#F2F4F8", "#6A7080"), { flat: false, side: THREE.DoubleSide }), 0, 4.1, 0, dish);
        bowl.rotation.x = Math.PI;
        this.cyl(0.12, 0.12, 4.2, 6, metal, 0, 0, 0, dish);
        this.ball(0.55, accent, 0, 4.2, 0, dish);
        this.signal(dish, 4.6, this.s.d.color, 0, 9);
        this.on((_dt, t, r) => { if (!r) mount.rotation.y = Math.sin(t * 0.25) * 1.2; });
        for (const x of [-6, 6]) {
          this.cyl(0.8, 1, 6, 10, metal, x, 0, 3);
          const d = this.part(new THREE.SphereGeometry(1.8, 16, 6, 0, Math.PI * 2, 0, 0.8), metal, x, 7.5, 3); d.rotation.x = Math.PI + 0.6;
        }
        break;
      }
      case "telehealth": {
        // Med station: a pillar carrying a slowly turning habitat ring, hologram cross above.
        const w = this.walls(panel, 13, this.c.p.wall[1]);
        const base = this.part(dome(32), metal, 0, 0, 0); base.scale.set(6, 3.6, 6);
        this.tower(panel, w, 2.2, 20, 0, 0, 0, 20, metal);
        const ring = new THREE.Group(); ring.position.y = 15; ring.rotation.x = 0.12; this.root.add(ring);
        this.part(new THREE.TorusGeometry(8, 1.3, 12, 48), metal, 0, 0, 0, ring).rotation.x = Math.PI / 2;
        this.part(new THREE.TorusGeometry(8, 0.45, 6, 48), accent, 0, 1.1, 0, ring).rotation.x = Math.PI / 2;
        for (let i = 0; i < 4; i++) { const sp = this.part(new THREE.BoxGeometry(16, 0.5, 0.5), dark, 0, 0, 0, ring); sp.rotation.y = (i / 4) * Math.PI; }
        this.turn(ring, "y", 0.25);
        const cross = this.icon("cross", holo, holo); cross.position.y = 24; this.root.add(cross); this.spin(cross, 0.6);
        break;
      }
      case "backend": {
        // Fusion reactor: sphere on struts with gyroscope rings and radiator fins.
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; const s = this.part(new THREE.CylinderGeometry(0.4, 0.6, 8, 6), dark, Math.cos(a) * 4, 3.5, Math.sin(a) * 4); s.rotation.set(Math.sin(a) * 0.4, 0, -Math.cos(a) * 0.4); }
        this.ball(5.4, metal, 0, 9, 0).scale.set(1, 0.95, 1);
        this.part(new THREE.TorusGeometry(5.45, 0.35, 8, 48), this.glow(this.s.d.color, 2), 0, 9, 0).rotation.x = Math.PI / 2;
        const core = this.part(new THREE.SphereGeometry(1.6, 20, 14), this.glow(this.s.d.color, 2.4), 0, 16.5, 0);
        this.on((_dt, t, r) => core.scale.setScalar(r ? 1 : 1 + Math.sin(t * 3) * 0.1));
        [0, 1, 2].forEach(i => {
          const g = new THREE.Group(); g.position.y = 9; this.root.add(g);
          this.part(new THREE.TorusGeometry(7 + i * 1.1, 0.16, 8, 64), metal, 0, 0, 0, g);
          g.rotation.set(i * 0.9, i * 0.5, 0);
          this.on((dt, _t, r) => { if (!r) { g.rotation.x += dt * (0.3 + i * 0.15); g.rotation.y += dt * 0.2; } });
        });
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.box(0.3, 4, 3.4, dark, Math.cos(a) * 10, 0, Math.sin(a) * 10).rotation.y = -a; }
        break;
      }
      case "test": {
        // Launch complex: rocket on its pad beside a service tower, exhaust flickering at the nozzle.
        this.cyl(5, 5.6, 1.2, 24, dark, 0, 0, 0);
        this.part(new THREE.TorusGeometry(5.2, 0.25, 6, 40), accent, 0, 1.25, 0).rotation.x = Math.PI / 2;
        const tw = this.solid("#C8402E");
        for (const [x, z] of [[-5.5, -1.2], [-5.5, 1.2], [-8, -1.2], [-8, 1.2]]) this.box(0.4, 30, 0.4, tw, x, 0, z);
        for (let y = 4; y < 30; y += 4) { this.box(2.9, 0.3, 0.3, tw, -6.75, y, -1.2); this.box(2.9, 0.3, 0.3, tw, -6.75, y, 1.2); }
        for (const y of [12, 22]) this.box(3.4, 0.5, 0.8, tw, -3.8, y, 0);
        const rocket = new THREE.Group(); rocket.position.y = 1.2; this.root.add(rocket);
        const white = this.solid(this.t("#F2F4F8", "#7A8090"), { flat: false });
        this.cyl(1.8, 2, 22, 24, white, 0, 2, 0, rocket);
        this.part(new THREE.CylinderGeometry(1.82, 1.82, 2, 24), accent, 0, 15, 0, rocket);
        this.cone(1.8, 5, 24, accent, 0, 24, 0, rocket);
        for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; const fin = this.box(0.25, 4, 2.4, accent, Math.cos(a) * 2.1, 0.6, Math.sin(a) * 2.1, rocket); fin.rotation.y = -a; }
        const flame = this.part(new THREE.ConeGeometry(1.4, 4, 12), this.holo("#FFB45A", 0.85), 0, 0, 0, rocket); flame.rotation.x = Math.PI;
        this.on((_dt, t, r) => { flame.scale.set(1, r ? 1 : 0.7 + Math.sin(t * 23) * 0.15 + Math.sin(t * 37) * 0.1, 1); });
        lights(5.8, 0.4, 12);
        break;
      }
      case "knowledge": {
        // Data archive: a tower of glowing shelf discs in a glass sheath, data tiles spiraling around it.
        this.cyl(7, 7.5, 1, 32, dark, 0, 0, 0);
        this.part(new THREE.TorusGeometry(7.1, 0.25, 8, 48), accent, 0, 1, 0).rotation.x = Math.PI / 2;
        this.cyl(2.2, 2.2, 22, 20, metal, 0, 1, 0);
        for (let i = 0; i < 7; i++) {
          const r = 5.2 - i * 0.35, y = 2.6 + i * 2.8;
          this.cyl(r, r, 0.6, 32, i % 2 ? metal : dark, 0, y, 0);
          this.part(new THREE.TorusGeometry(r, 0.12, 6, 40), new THREE.MeshBasicMaterial({ color: this.s.d.color }), 0, y + 0.3, 0).rotation.x = Math.PI / 2;
        }
        const sheath = this.cyl(5.7, 5.7, 21, 32, glass, 0, 1, 0); sheath.castShadow = false;
        const helix = new THREE.Group(); this.root.add(helix);
        for (let i = 0; i < 22; i++) {
          const a = i * 0.6, tile = this.part(new THREE.PlaneGeometry(1.2, 1.6), holo, Math.cos(a) * 8, 3 + i * 0.9, Math.sin(a) * 8, helix);
          tile.rotation.y = -a + Math.PI / 2; tile.castShadow = false;
        }
        this.spin(helix, 0.3);
        const book = this.icon("book", holo, this.holo("#FFFFFF", 0.7)); book.position.y = 26; book.scale.setScalar(1.1); this.root.add(book); this.spin(book, 0.6);
        break;
      }
      case "media": {
        // Holo theater: tiered seating arcing round a big animated screen, a projector beam and a hologram on stage.
        this.cyl(11, 11.5, 0.6, 40, dark, 0, 0, 0);
        for (let tier = 0; tier < 4; tier++) {
          const r = 4.5 + tier * 2, h = 0.7 * (tier + 1);
          for (let k = 0; k < 9; k++) {
            const a = Math.PI * 0.1 + (k / 8) * Math.PI * 0.8;
            this.box(2.1, h, 1.8, tier % 2 ? metal : dark, Math.cos(a) * r, 0.6, Math.sin(a) * r).rotation.y = -a + Math.PI / 2;
          }
        }
        this.box(17, 10, 0.7, dark, 0, 0.6, -7);
        const tex = this.scrollTex((ctx, w, h) => {
          const g = ctx.createLinearGradient(0, 0, w, 0);
          ["#FF4FD8", "#3FF0FF", this.s.d.color, "#7A5AFF", "#FF4FD8"].forEach((c, i) => g.addColorStop(i / 4, c));
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
          ctx.fillStyle = "rgba(255,255,255,0.25)"; for (let y = 0; y < h; y += 8) ctx.fillRect(0, y, w, 2);
        }, 256, 64);
        this.part(new THREE.PlaneGeometry(15.6, 8.4), new THREE.MeshBasicMaterial({ map: tex }), 0, 5.8, -6.6).castShadow = false;
        this.on((dt, _t, r) => { if (!r) tex.offset.x += dt * 0.1; });
        const beam = this.part(new THREE.ConeGeometry(4.5, 15, 20, 1, true).rotateX(-Math.PI / 2), this.holo(this.s.d.color, 0.07), 0, 5.8, 1);
        beam.castShadow = false;
        this.cyl(0.8, 1, 1.4, 12, metal, 0, 4.6, 8.6);
        const pal = this.icon("palette", holo, holo); pal.position.set(0, 4.5, -3.5); pal.scale.setScalar(0.8); this.root.add(pal); this.spin(pal, 0.7);
        break;
      }
      case "analytics": {
        // Deep-space observatory: a telescope dome, a tracking radio dish and a live holo chart.
        this.cyl(10, 10.5, 0.8, 40, dark, 0, 0, 0);
        lights(10.2, 0.85, 20);
        this.cyl(4.8, 4.8, 4, 24, metal, -5, 0.8, -4);
        this.observatory(-5, 4.8, -4, 4.8, metal);
        const dish = new THREE.Group(); dish.position.set(4.5, 0.8, 1.5); this.root.add(dish);
        this.cyl(1.4, 2, 6, 12, metal, 0, 0, 0, dish);
        const tilt = new THREE.Group(); tilt.position.y = 7; dish.add(tilt);
        // Cap around the sphere's bottom pole: concave side up, its lowest point at the pivot
        this.part(new THREE.SphereGeometry(6, 28, 8, 0, Math.PI * 2, Math.PI - 0.62, 0.62), this.solid(this.t("#F0F4FA", "#5A6070"), { metal: 0.2, rough: 0.3, flat: false, side: THREE.DoubleSide }), 0, 6, 0, tilt);
        this.part(new THREE.CylinderGeometry(0.1, 0.1, 3.6, 6), metal, 0, 1.8, 0, tilt);
        this.ball(0.6, accent, 0, 3.8, 0, tilt);
        tilt.rotation.x = -0.7;
        this.on((dt, t, r) => { if (!r) { dish.rotation.y += dt * 0.15; tilt.rotation.x = -0.7 + Math.sin(t * 0.3) * 0.2; } });
        const chart = this.icon("chart", holo, this.holo("#FFFFFF", 0.7)); chart.position.set(-5, 15, -4); chart.scale.setScalar(1.2); this.root.add(chart);
        this.animateChart(chart, 1.4);
        break;
      }
      case "products": {
        // Cargo hangar: arched hangar open to the front, containers inside, cargo pods orbiting overhead.
        // Half cylinder lying along z, arching over the floor
        this.part(new THREE.CylinderGeometry(9, 9, 22, 32, 1, true, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2), this.solid(this.t("#C8D0DC", "#3E4452"), { metal: 0.15, rough: 0.4, flat: false, side: THREE.DoubleSide }), 0, 0, -3);
        for (let i = 0; i < 5; i++) this.part(new THREE.TorusGeometry(9.1, 0.3, 6, 32, Math.PI), i === 0 ? accent : metal, 0, 0, -13.5 + i * 5.25);
        this.part(new THREE.CircleGeometry(9, 32, 0, Math.PI), this.solid(this.t("#B8C0CC", "#2E3440"), { side: THREE.DoubleSide }), 0, 0, -14);
        this.box(18, 0.3, 26, dark, 0, 0, -1);
        const colors = ["#E8A030", "#3A8AE8", this.s.d.color, "#E84A6A", "#F2F4F8"];
        for (let i = 0; i < 8; i++) this.box(2.4, 2.4, 5, this.solid(colors[i % 5]), -5 + (i % 4) * 3.2, 0.3 + Math.floor(i / 4) * 2.4, -6 + Math.floor(i / 4) * 0.6);
        this.box(16, 0.6, 0.6, this.solid("#E8B020"), 0, 7.4, 2);
        const orbit = new THREE.Group(); orbit.position.y = 16; this.root.add(orbit);
        colors.concat("#7A5AE8").forEach((col, i) => {
          const a = (i / 6) * Math.PI * 2;
          this.part(new THREE.BoxGeometry(2, 2.2, 4.4), this.solid(col), Math.cos(a) * 13, Math.sin(i) * 1.5, Math.sin(a) * 13, orbit).rotation.y = -a;
        });
        this.spin(orbit, 0.25);
        const tub = this.icon("tub", holo, holo); tub.position.set(0, 13, -3); tub.scale.setScalar(1.2); this.root.add(tub); this.spin(tub, 0.5);
        break;
      }
    }
  }

  // ------------------------------------------------------------------ shared pieces for the new districts

  /** Observatory dome with an open slit and a telescope; turns slowly. */
  private observatory(x: number, y: number, z: number, r: number, shell: Mat) {
    const g = new THREE.Group(); g.position.set(x, y, z); this.root.add(g);
    this.part(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), shell, 0, 0, 0, g);
    const slit = this.solid("#14161E");
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      const s = this.part(new THREE.BoxGeometry(r * 0.26, 0.2, r * 0.3), slit, 0, Math.sin(a) * r * 0.99, Math.cos(a) * r * 0.99, g);
      s.rotation.x = -a;
    }
    const tube = this.part(new THREE.CylinderGeometry(r * 0.13, r * 0.17, r * 1.2, 12), this.s.accent, 0, r * 0.75, r * 0.45, g);
    tube.rotation.x = 0.75;
    this.part(new THREE.TorusGeometry(r, r * 0.04, 6, 32), this.s.accent, 0, 0.1, 0, g).rotation.x = Math.PI / 2;
    this.on((_dt, t, rd) => { if (!rd) g.rotation.y = Math.sin(t * 0.25 + x) * 1.1; });
    return g;
  }
  /** A row of book spines, base at y. */
  private books(x: number, y: number, z: number, n: number) {
    const cols = ["#C8402E", "#2E6AC8", "#E8A030", "#3A8A4A", this.s.d.color, "#7A4AC8"];
    for (let i = 0; i < n; i++) {
      const h = 0.9 + ((i * 7) % 4) * 0.15;
      this.box(0.35, h, 0.9, this.solid(cols[i % cols.length]), x - (n - 1) * 0.2 + i * 0.4, y, z);
    }
  }
  /** Big open book on a slant, as a sign or on a lectern. */
  private openBook(x: number, y: number, z: number, s: number, cover: Mat, page: Mat, tilt = -0.3) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.x = tilt; g.scale.setScalar(s); this.root.add(g);
    if (y === 0) for (const px of [-1, 1]) this.box(0.2, 3, 0.2, cover, px, 0, 0, g);
    const by = y === 0 ? 3 : 0;
    for (const side of [-1, 1]) {
      const leaf = new THREE.Group(); leaf.position.y = by; leaf.rotation.z = side * -0.2; g.add(leaf);
      this.box(2.2, 0.15, 2.8, cover, side * 1.1, 0, 0, leaf);
      this.box(2, 0.25, 2.6, page, side * 1.05, 0.15, 0, leaf);
    }
    return g;
  }
  /** Bulbs that chase along a path, like a theater sign. */
  private chase(pts: [number, number, number][]) {
    const mats = pts.map(([x, y, z]) => {
      const m = new THREE.MeshBasicMaterial({ color: "#FFF4C8" });
      this.part(new THREE.SphereGeometry(0.2, 8, 6), m, x, y, z).castShadow = false;
      return m;
    });
    this.on((_dt, t, r) => { const k = r ? 0 : Math.floor(t * 8); mats.forEach((m, i) => m.color.set((i + k) % 3 === 0 ? "#FFF6D0" : "#8A6A2A")); });
  }
  /** String of glowing bulbs sagging between two points along x. */
  private festoon(x0: number, x1: number, z: number, y: number, n: number) {
    const bulb = this.glow("#FFE8A0", this.c.night ? 2.4 : 0.6);
    for (const x of [x0, x1]) this.cyl(0.12, 0.14, y + 0.4, 6, this.solid("#4A3A2A"), x, 0, z);
    for (let i = 0; i <= n; i++) {
      const k = i / n, sag = Math.sin(k * Math.PI) * 1.4;
      this.part(new THREE.SphereGeometry(0.22, 8, 6), bulb, x0 + (x1 - x0) * k, y - sag, z).castShadow = false;
    }
  }
  /** Weather mast with spinning cups and a vane. */
  private anemometer(x: number, y: number, z: number, h: number, mat: Mat) {
    this.cyl(0.14, 0.2, h, 6, mat, x, y, z);
    const cups = new THREE.Group(); cups.position.set(x, y + h, z); this.root.add(cups);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const arm = this.part(new THREE.BoxGeometry(1.6, 0.08, 0.08), mat, Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8, cups); arm.rotation.y = -a;
      this.ball(0.3, this.s.accent, Math.cos(a) * 1.6, 0, Math.sin(a) * 1.6, cups);
    }
    this.turn(cups, "y", 3);
    const vane = new THREE.Group(); vane.position.set(x, y + h - 1.4, z); this.root.add(vane);
    this.box(1.8, 0.06, 0.06, mat, 0, 0, 0, vane); this.cone(0.25, 0.6, 4, this.s.accent, 0.9, -0.3, 0, vane).rotation.z = -Math.PI / 2;
    this.on((_dt, t, r) => { if (!r) vane.rotation.y = Math.sin(t * 0.4) * 0.8; });
  }
  /** Brass armillary sphere on a plinth, rings turning. */
  private armillary(x: number, y: number, z: number, ring: Mat, base: Mat) {
    this.cyl(0.8, 1, 2, 10, base, x, y, z);
    const g = new THREE.Group(); g.position.set(x, y + 4.2, z); this.root.add(g);
    const brass = this.solid("#C8A040", { metal: 0.4, rough: 0.35, flat: false });
    const rings = [[2, ring], [1.8, brass], [1.6, brass]] as const;
    rings.forEach(([r, m], i) => { const t = this.part(new THREE.TorusGeometry(r, 0.1, 6, 32), m, 0, 0, 0, g); t.rotation.set(i * 0.9, i * 0.6, i * 0.4); });
    this.ball(0.45, this.glow("#FFD24A", this.c.night ? 1.6 : 0.4), 0, 0, 0, g);
    this.cyl(0.06, 0.06, 2.4, 6, brass, 0, -2.4, 0, g);
    this.turn(g, "y", 0.5);
  }
  /** A stretched hide painted with animals, spirals or a sun. */
  private paintedHide(i: number) {
    return this.scrollTex((ctx, w, h) => {
      ctx.fillStyle = "#D8BC8A"; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = ctx.fillStyle = [this.s.d.color, "#8A2A1A", "#2A2018", "#C86A2A"][i % 4];
      ctx.lineWidth = 5; ctx.lineCap = "round";
      if (i % 3 === 0) { ctx.beginPath(); for (let a = 0; a < 18; a += 0.2) ctx.lineTo(w / 2 + Math.cos(a) * a * 2.4, h / 2 + Math.sin(a) * a * 2.4); ctx.stroke(); }
      else if (i % 3 === 1) { ctx.beginPath(); ctx.arc(w / 2, h / 2, 14, 0, Math.PI * 2); ctx.fill(); for (let k = 0; k < 10; k++) { const a = (k / 10) * Math.PI * 2; ctx.beginPath(); ctx.moveTo(w / 2 + Math.cos(a) * 20, h / 2 + Math.sin(a) * 20); ctx.lineTo(w / 2 + Math.cos(a) * 30, h / 2 + Math.sin(a) * 30); ctx.stroke(); } }
      else { ctx.beginPath(); ctx.ellipse(w / 2, h / 2, 22, 11, 0, 0, Math.PI * 2); ctx.fill(); for (const lx of [-14, -6, 6, 14]) { ctx.beginPath(); ctx.moveTo(w / 2 + lx, h / 2 + 6); ctx.lineTo(w / 2 + lx, h / 2 + 24); ctx.stroke(); } ctx.beginPath(); ctx.moveTo(w / 2 + 20, h / 2 - 4); ctx.lineTo(w / 2 + 30, h / 2 - 16); ctx.stroke(); }
    }, 96, 112);
  }

  // ------------------------------------------------------------------ shared creatures

  /** Carrier pigeons circling a point, each with a letter. */
  private flock(y: number, R: number, cx = 0, cz = 0) {
    const flock = new THREE.Group(); flock.position.set(cx, y, cz); this.root.add(flock);
    const bird = this.solid(this.t("#F2F2F0", "#8A8E9A"), { flat: false });
    const wings: { w: THREE.Object3D; side: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2, rr = R + (i % 2) * 2;
      const b = new THREE.Group(); b.position.set(Math.cos(a) * rr, (i % 3) * 1.6, Math.sin(a) * rr); b.rotation.y = -a; flock.add(b);
      this.part(new THREE.SphereGeometry(0.55, 8, 6), bird, 0, 0, 0, b);
      for (const side of [-1, 1]) {
        const w = new THREE.Group(); w.position.x = side * 0.3; b.add(w);
        this.part(new THREE.BoxGeometry(1.5, 0.08, 0.6), bird, side * 0.75, 0, 0, w);
        wings.push({ w, side });
      }
      this.part(new THREE.BoxGeometry(0.6, 0.4, 0.05), this.s.accent, 0, -0.6, 0, b);
    }
    this.on((dt, t, r) => {
      if (r) return;
      flock.rotation.y += dt * 0.6;
      wings.forEach(({ w, side }, i) => { w.rotation.z = Math.sin(t * 12 + i) * 0.6 * side; });
    });
  }
}
