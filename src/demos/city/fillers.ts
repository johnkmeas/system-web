/**
 * Filler for the space, cyberpunk and stone age themes: the buildings,
 * skyline and atmosphere that fill the blocks between the landmarks.
 */
import * as THREE from "three";
import { M, boxUV, cylUV, dome } from "./geo";
import { rng } from "./textures";
import { blocks, buildTrees, facadeSpec, inst, pick, type Ctx } from "./world";

// ------------------------------------------------------------------ space

export function buildHabitats(c: Ctx) {
  const r = rng(61);
  const spec = facadeSpec("space");
  const walls = c.kit.facade(spec, 41, "#ffffff");
  const capMat = c.kit.solid(c.night ? "#4A5060" : "#E8ECF2", { rough: 0.35, metal: 0.15, flat: false });
  const radii = [3, 4.4], heights = [6, 10, 16, 24, 34];
  const buckets = new Map<string, { m: THREE.Matrix4; color: string }[]>();
  const caps: { m: THREE.Matrix4 }[] = [], bands: { m: THREE.Matrix4; color: string }[] = [];
  const masts: { m: THREE.Matrix4 }[] = [], tips: { m: THREE.Matrix4 }[] = [];
  const parks: [number, number][] = [];
  for (const b of blocks(c)) {
    if (r() > 0.3 + b.edge) continue;
    if (!b.near && r() < 0.12) { parks.push([b.x, b.z]); continue; }
    const cap = b.near ? 1 : Math.max(0, Math.min(heights.length - 1, Math.floor(b.edge * heights.length + r() * 2 - 0.5)));
    const offs = r() < 0.55 ? [[-4.2, -4.2], [4.2, -4.2], [-4.2, 4.2], [4.2, 4.2]] : [[0, 0]];
    for (const [ox, oz] of offs) {
      if (offs.length > 1 && r() < 0.2) continue;
      const hc = Math.floor(r() * (cap + 1)), rc = offs.length === 1 ? 1 : 0;
      const h = heights[hc], rr = radii[rc], x = b.x + ox, z = b.z + oz;
      const key = `${hc}|${rc}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push({ m: M(x, h / 2, z), color: pick(r, c.p.wall) });
      caps.push({ m: M(x, h, z, rr, rr * 0.55, rr) });
      for (let y = 4; y < h - 1; y += 6 + Math.floor(r() * 2) * 3) bands.push({ m: M(x, y, z, rr + 0.08, 1, rr + 0.08), color: pick(r, c.p.neon) });
      if (r() < 0.22) {
        const mh = 4 + r() * 6;
        masts.push({ m: M(x, h + rr * 0.5 + mh / 2, z, 1, mh, 1) });
        tips.push({ m: M(x, h + rr * 0.5 + mh, z) });
      }
    }
  }
  for (const [key, items] of buckets) {
    const [hc, rc] = key.split("|").map(Number);
    const h = heights[hc], rr = radii[rc];
    inst(c, cylUV(new THREE.CylinderGeometry(rr, rr, h, 24), rr, h, spec.cell), [walls, c.kit.roofMat, c.kit.roofMat], items);
  }
  inst(c, dome(24), capMat, caps);
  inst(c, new THREE.CylinderGeometry(1, 1, 0.45, 24, 1, true), new THREE.MeshBasicMaterial({ color: "#ffffff" }), bands, false);
  inst(c, new THREE.CylinderGeometry(0.12, 0.2, 1, 6), capMat, masts);
  inst(c, new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshBasicMaterial({ color: "#FF5A5A" }), tips, false);

  // Glass biodomes with little forests inside
  const glass = new THREE.MeshStandardMaterial({ color: "#CFEFFF", transparent: true, opacity: 0.22, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  const trees: [number, number, number][] = [];
  for (const [x, z] of parks) {
    const dm = new THREE.Mesh(dome(40), glass); dm.scale.set(8.5, 7, 8.5); dm.position.set(x, 0, z); c.group.add(dm);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(8.5, 0.35, 8, 48), capMat); rim.rotation.x = Math.PI / 2; rim.position.set(x, 0.2, z); c.group.add(rim);
    for (let i = 0; i < 9; i++) trees.push([x + (r() - 0.5) * 10, z + (r() - 0.5) * 10, 0.6 + r() * 0.5]);
  }
  buildTrees(c, trees);
}

/** Moon-surface craters scattered beyond the city. */
export function craters(c: Ctx) {
  const r = rng(13);
  const items: { m: THREE.Matrix4; color: string }[] = [];
  for (let i = 0; i < 70; i++) {
    const a = r() * Math.PI * 2, d = c.half + 40 + r() * 320, s = 6 + r() * 22;
    items.push({ m: M(Math.cos(a) * d, 0, Math.sin(a) * d, s, s * 0.35, s), color: r() < 0.5 ? c.p.rock : c.p.rockDark });
  }
  inst(c, new THREE.TorusGeometry(1, 0.32, 6, 18).rotateX(Math.PI / 2), c.kit.solid("#ffffff", { rough: 1, flat: true }), items, false);
}

/** A ringed planet and a small moon hanging in the black sky. */
export function buildPlanet(c: Ctx) {
  const r = rng(3);
  const cv = document.createElement("canvas"); cv.width = 16; cv.height = 256;
  const ctx = cv.getContext("2d")!;
  const bands = ["#E8B070", "#D89858", "#F2D2A0", "#C8804A", "#EAC088", "#B87040"];
  for (let y = 0; y < 256;) { const h = 6 + r() * 26; ctx.fillStyle = pick(r, bands); ctx.fillRect(0, y, 16, h); y += h; }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const planet = new THREE.Mesh(new THREE.SphereGeometry(170, 48, 32), new THREE.MeshStandardMaterial({ map: tex, roughness: 1, fog: false, emissive: "#3A2A1A", emissiveIntensity: c.night ? 0.6 : 0.3 }));
  planet.position.set(-180, 150, -960);
  planet.rotation.z = 0.35;

  const rcv = document.createElement("canvas"); rcv.width = 256; rcv.height = 4;
  const rc = rcv.getContext("2d")!;
  for (let x = 0; x < 256; x++) {
    const gap = x < 30 || (x > 120 && x < 132) ? 0.1 : 1;
    rc.fillStyle = `rgba(240,210,170,${(0.25 + r() * 0.6) * gap})`; rc.fillRect(x, 0, 1, 4);
  }
  const rtex = new THREE.CanvasTexture(rcv); rtex.colorSpace = THREE.SRGBColorSpace;
  const ringGeo = new THREE.RingGeometry(210, 330, 96, 1);
  // Map U radially so the strip texture draws concentric bands.
  const pos = ringGeo.attributes.position as THREE.BufferAttribute, uv = ringGeo.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (Math.hypot(pos.getX(i), pos.getY(i)) - 210) / 120, 0.5);
  const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ map: rtex, transparent: true, side: THREE.DoubleSide, fog: false, depthWrite: false }));
  ring.rotation.set(-1.2, 0.3, 0);
  planet.add(ring);

  const moon = new THREE.Mesh(new THREE.SphereGeometry(36, 32, 20), new THREE.MeshStandardMaterial({ color: "#B8B4C8", roughness: 1, fog: false, emissive: "#202030", emissiveIntensity: 0.5 }));
  moon.position.set(-870, 300, -450);
  c.group.add(planet, moon);
  c.updaters.push((dt, _t, reduced) => { if (!reduced) planet.rotation.y += dt * 0.02; });
}

// ------------------------------------------------------------------ cyberpunk

function neonSign(seed: number, color: string) {
  const cv = document.createElement("canvas"); cv.width = 64; cv.height = 192;
  const ctx = cv.getContext("2d")!, r = rng(seed);
  ctx.fillStyle = "#06040C"; ctx.fillRect(0, 0, 64, 192);
  ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.strokeRect(4, 4, 56, 184);
  ctx.fillStyle = color;
  // Glyph-like blocks that read as signage from a distance.
  for (let y = 16; y < 176; y += 34) {
    for (let k = 0; k < 4; k++) if (r() < 0.75) ctx.fillRect(12 + (k % 2) * 22, y + Math.floor(k / 2) * 13, 6 + r() * 14, 4 + r() * 6);
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t });
}

export function buildMegatowers(c: Ctx) {
  const r = rng(73);
  const classes = [8, 14, 20, 28, 40, 54];
  const widths = [6, 8.5];
  const buckets = new Map<string, { m: THREE.Matrix4; color: string }[]>();
  const rims: { m: THREE.Matrix4; color: string }[] = [];
  const signs: { x: number; y: number; z: number; ry: number; h: number }[] = [];
  for (const b of blocks(c)) {
    if (r() > 0.55 + b.edge) continue;
    const cap = b.near ? 1 : Math.max(0, Math.min(classes.length - 1, Math.floor(b.edge * classes.length + r() * 2.4 - 0.4)));
    const lots = r() < 0.6 ? 4 : 1;
    const offs = lots === 4 ? [[-4, -4], [4, -4], [-4, 4], [4, 4]] : [[0, 0]];
    for (const [ox, oz] of offs) {
      if (r() < 0.08) continue;
      const hc = Math.floor(r() * (cap + 1)), wc = lots === 1 ? 1 : 0;
      const big = lots === 1 ? 1.5 : 1;
      const h = classes[hc], w = widths[wc] * big, x = b.x + ox, z = b.z + oz;
      const key = `${hc}|${wc}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key)!.push({ m: M(x, h / 2, z, big, 1, big), color: pick(r, c.p.wall) });
      // Neon outlines: four thin bars around the roof edge, sometimes a second band lower down.
      const outline = (y: number, col: string, t: number) => {
        for (const [dx, dz, sx, sz] of [[0, w / 2, w + t, t], [0, -w / 2, w + t, t], [w / 2, 0, t, w + t], [-w / 2, 0, t, w + t]]) {
          rims.push({ m: M(x + dx, y, z + dz, sx, t, sz), color: col });
        }
      };
      outline(h + 0.1, pick(r, c.p.neon), 0.35);
      if (h >= 18 && r() < 0.5) outline(h * (0.35 + r() * 0.4), pick(r, c.p.neon), 0.25);
      if (h >= 18 && r() < 0.45) {
        const ry = (Math.floor(r() * 4) * Math.PI) / 2, d = w / 2 + 0.6;
        signs.push({ x: x + Math.sin(ry) * d, y: h * 0.45 + r() * h * 0.3, z: z + Math.cos(ry) * d, ry, h: Math.min(h * 0.45, 14) });
      }
    }
  }
  const spec = facadeSpec("cyberpunk");
  const matA = c.kit.facade(spec, 19, "#ffffff"), matB = c.kit.facade(spec, 37, "#ffffff");
  for (const [key, items] of buckets) {
    const [hc, wc] = key.split("|").map(Number);
    const h = classes[hc], w = widths[wc];
    const side = hc % 2 ? matA : matB;
    inst(c, boxUV(new THREE.BoxGeometry(w, h, w), w, h, w, spec.cell), [side, side, c.kit.roofMat, c.kit.roofMat, side, side], items);
  }
  inst(c, new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: "#ffffff" }), rims, false);

  // Vertical neon signs hanging off the towers, a few of them on the blink.
  const mats = c.p.neon.map((col, i) => neonSign(100 + i, col));
  const flick: THREE.Mesh[] = [];
  signs.slice(0, 40).forEach((sg, i) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(sg.h / 3, sg.h, 0.4), mats[i % mats.length]);
    m.position.set(sg.x, sg.y, sg.z); m.rotation.y = sg.ry + Math.PI / 2;
    c.group.add(m);
    if (i % 7 === 0) flick.push(m);
  });
  c.updaters.push((_dt, t) => flick.forEach((m, i) => { m.visible = Math.sin(t * (9 + i * 3)) > -0.85 || Math.sin(t * 0.7 + i) > 0; }));
}

/** A ring of distant megastructures instead of mountains. */
export function skyline(c: Ctx) {
  const r = rng(88);
  const spec = { ...facadeSpec("cyberpunk"), cell: { w: 14, h: 28 } };
  const mat = c.kit.facade(spec, 53, c.p.wall[1]);
  const items: { m: THREE.Matrix4 }[] = [], tips: { m: THREE.Matrix4 }[] = [];
  for (const [count, rMin, rMax, hMin, hMax] of [[44, 580, 660, 70, 170], [52, 720, 860, 120, 280]] as const) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r() * 0.1, d = rMin + r() * (rMax - rMin), h = hMin + r() * (hMax - hMin), w = 18 + r() * 22;
      const x = Math.cos(a) * d, z = Math.sin(a) * d;
      items.push({ m: M(x, h / 2, z, w / 30, h / 160, w / 30, -a) });
      tips.push({ m: M(x, h + 2, z) });
    }
  }
  inst(c, boxUV(new THREE.BoxGeometry(30, 160, 30), 30, 160, 30, spec.cell), mat, items, false);
  inst(c, new THREE.SphereGeometry(1.4, 8, 6), new THREE.MeshBasicMaterial({ color: "#FF3A5A" }), tips, false);
}

/** Flying cars streaming along sky lanes. */
export function buildFlyers(c: Ctx) {
  const r = rng(29);
  const n = 90;
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.6, 0.8, 3.4), new THREE.MeshBasicMaterial({ color: "#ffffff" }), n);
  const L = c.half + 40;
  const cars = Array.from({ length: n }, (_, i) => {
    mesh.setColorAt(i, new THREE.Color(pick(r, c.p.neon.concat("#FFFFFF", "#FF5A5A"))));
    const dir = r() < 0.5 ? 1 : -1;
    return { axis: r() < 0.5 ? "x" : "z", lane: (Math.floor(r() * 9) - 4) * 40 + 10, y: 34 + Math.floor(r() * 3) * 14, pos: (r() - 0.5) * L * 2, speed: dir * (18 + r() * 14) };
  });
  const tmp = new THREE.Object3D();
  const place = (dt: number) => {
    cars.forEach((car, i) => {
      car.pos += car.speed * dt;
      if (car.pos > L) car.pos -= L * 2; else if (car.pos < -L) car.pos += L * 2;
      if (car.axis === "x") { tmp.position.set(car.pos, car.y, car.lane); tmp.rotation.set(0, Math.PI / 2, 0); }
      else { tmp.position.set(car.lane, car.y, car.pos); tmp.rotation.set(0, 0, 0); }
      tmp.updateMatrix(); mesh.setMatrixAt(i, tmp.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  };
  place(0);
  c.group.add(mesh);
  c.updaters.push((dt, _t, reduced) => { if (!reduced) place(dt); });
}

export function buildRain(c: Ctx) {
  const n = 2200, R = 240, H = 180, len = 3.2;
  const pos = new Float32Array(n * 6);
  const r = rng(17);
  const drops = Array.from({ length: n }, () => ({ x: (r() - 0.5) * R * 2, y: r() * H, z: (r() - 0.5) * R * 2, v: 90 + r() * 50 }));
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: c.night ? "#9A8AFF" : "#C8C8E8", transparent: true, opacity: c.night ? 0.4 : 0.3, depthWrite: false }));
  lines.frustumCulled = false;
  const write = () => {
    drops.forEach((d, i) => { pos.set([d.x, d.y, d.z, d.x + 0.4, d.y + len, d.z], i * 6); });
    geo.attributes.position.needsUpdate = true;
  };
  write();
  c.group.add(lines);
  c.updaters.push((dt, _t, reduced) => {
    if (reduced) return;
    for (const d of drops) { d.y -= d.v * dt; if (d.y < 0) d.y += H; }
    write();
  });
}

// ------------------------------------------------------------------ stone age

export function buildHuts(c: Ctx) {
  const r = rng(47);
  const spec = facadeSpec("stoneage", "house");
  const mud = c.kit.facade(spec, 7, "#ffffff");
  const thatch = c.kit.solid("#ffffff", { rough: 1 });
  const hide = c.kit.solid(c.night ? "#5A4A38" : "#D2B48A", { rough: 1 });
  const poleMat = c.kit.solid(c.p.trunk);
  const rock = c.kit.solid("#ffffff", { rough: 1 });
  const sizes = [2.2, 3];
  const huts: { m: THREE.Matrix4; color: string }[][] = [[], []], roofs: { m: THREE.Matrix4; color: string }[] = [];
  const tipis: { m: THREE.Matrix4 }[] = [], poles: { m: THREE.Matrix4 }[] = [], boulders: { m: THREE.Matrix4; color: string }[] = [];
  const fires: [number, number][] = [];
  const trees: [number, number, number][] = [];
  for (const b of blocks(c)) {
    const roll = r();
    if (b.near || roll < 0.45) {
      // A ring of dwellings around a shared fire
      const n = b.near ? 3 : 4 + Math.floor(r() * 3);
      const ring = 5.5 + r() * 1.5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r() * 0.4, x = b.x + Math.cos(a) * ring, z = b.z + Math.sin(a) * ring;
        if (r() < 0.65) {
          const sc = r() < 0.5 ? 0 : 1, rr = sizes[sc], h = 2.6 + r() * 0.8;
          // Door faces the fire.
          huts[sc].push({ m: M(x, h / 2, z, 1, h / 3, 1, -a - Math.PI / 2), color: pick(r, c.p.wall) });
          roofs.push({ m: M(x, h + rr * 0.6, z, rr * 1.35, rr * 1.3, rr * 1.35, r() * 3), color: pick(r, c.p.roofs) });
        } else {
          const h = 6 + r() * 2;
          tipis.push({ m: M(x, h / 2, z, 2.4, h, 2.4, r() * 3) });
          for (let k = 0; k < 3; k++) {
            const pa = (k / 3) * Math.PI * 2 + r();
            poles.push({ m: M(x + Math.cos(pa) * 0.3, h + 0.6, z + Math.sin(pa) * 0.3, 1, 2.4, 1, 0, Math.sin(pa) * 0.3, -Math.cos(pa) * 0.3) });
          }
        }
      }
      if (fires.length < 9 && !b.near) fires.push([b.x, b.z]);
    } else if (roll < 0.85) {
      for (let i = 0; i < 9; i++) trees.push([b.x + (r() - 0.5) * 17, b.z + (r() - 0.5) * 17, 0.7 + r() * 0.7]);
    }
    if (r() < 0.4) for (let i = 0; i < 2; i++) {
      const s = 0.8 + r() * 1.8;
      boulders.push({ m: M(b.x + (r() - 0.5) * 16, s * 0.4, b.z + (r() - 0.5) * 16, s, s * 0.75, s * 1.1, r() * 3), color: r() < 0.5 ? c.p.rock : c.p.rockDark });
    }
  }
  huts.forEach((items, i) => inst(c, cylUV(new THREE.CylinderGeometry(sizes[i], sizes[i] * 1.06, 3, 12), sizes[i], 3, spec.cell), [mud, thatch, thatch], items));
  inst(c, new THREE.ConeGeometry(1, 1, 10), thatch, roofs);
  inst(c, new THREE.ConeGeometry(1, 1, 8), hide, tipis);
  inst(c, new THREE.CylinderGeometry(0.08, 0.08, 1, 4), poleMat, poles);
  inst(c, new THREE.DodecahedronGeometry(1, 0), rock, boulders);

  // Fire pits: stone ring, flickering flame, rising smoke, warm light at night
  const ember = c.kit.solid("#FF8A2A", { emissive: "#FF8A2A", ei: 2 });
  const core = c.kit.solid("#FFE07A", { emissive: "#FFE07A", ei: 2.4 });
  const stones: { m: THREE.Matrix4; color: string }[] = [];
  for (const [x, z] of fires) {
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; stones.push({ m: M(x + Math.cos(a) * 1.4, 0.3, z + Math.sin(a) * 1.4, 0.5, 0.45, 0.5, a), color: c.p.rockDark }); }
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 7), ember); f.position.set(x, 1.2, z);
    const k = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.5, 6), core); k.position.set(x, 0.8, z);
    c.group.add(f, k);
    if (c.night) {
      const light = new THREE.PointLight("#FF9A40", 30, 26, 1.6); light.position.set(x, 3, z); c.group.add(light);
      c.updaters.push((_dt, t) => { light.intensity = 26 + Math.sin(t * 11 + x) * 5 + Math.sin(t * 23 + z) * 3; });
    }
    c.updaters.push((_dt, t, reduced) => {
      if (reduced) return;
      const s = 0.85 + Math.sin(t * 13 + x) * 0.1 + Math.sin(t * 29 + z) * 0.06;
      f.scale.set(1, s, 1); k.scale.set(1, 1.15 - s * 0.2, 1);
    });
    c.smokeEmitters.push(new THREE.Vector3(x, 3, z));
  }
  inst(c, new THREE.DodecahedronGeometry(1, 0), rock, stones);

  // Deep forest all around
  for (let i = 0; i < 700; i++) {
    const a = r() * Math.PI * 2, d = c.half + 18 + r() * 300;
    trees.push([Math.cos(a) * d, Math.sin(a) * d, 0.9 + r() * 1.1]);
  }
  buildTrees(c, trees);
}
