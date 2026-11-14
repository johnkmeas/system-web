import * as THREE from "three";

const V = new THREE.Vector3(), Q = new THREE.Quaternion(), E = new THREE.Euler(), S = new THREE.Vector3();

/** Compose a transform matrix in one call. */
export const M = (x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, ry = 0, rx = 0, rz = 0) =>
  new THREE.Matrix4().compose(V.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S.set(sx, sy, sz));

/** Scale a box's UVs so one texture tile covers `cell` world units on every side. */
export function boxUV<T extends THREE.BufferGeometry>(geo: T, w: number, h: number, d: number, cell: { w: number; h: number }) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const per = uv.count / 6;
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [fu, fv] = dims[f];
    for (let i = 0; i < per; i++) {
      const k = f * per + i;
      uv.setXY(k, uv.getX(k) * fu / cell.w, uv.getY(k) * fv / cell.h);
    }
  }
  return geo;
}

export function cylUV(geo: THREE.CylinderGeometry, r: number, h: number, cell: { w: number; h: number }) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const circ = 2 * Math.PI * r;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / cell.w, uv.getY(i) * h / cell.h);
  return geo;
}

/** Unit gable roof: 1 wide (x), 1 deep (z), 1 tall, ridge along z, base at y = 0. */
export function gableGeo() {
  const shape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 1)]);
  const g = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  g.translate(0, 0, -0.5);
  return g;
}

/** Unit hemisphere, flat side down. */
export const dome = (seg = 24) => new THREE.SphereGeometry(1, seg, Math.max(6, seg / 2), 0, Math.PI * 2, 0, Math.PI / 2);

/** Extrude a 2D outline into a centered slab `depth` thick. */
export function slab(points: [number, number][] | THREE.Shape, depth: number, bevel = 0) {
  const shape = points instanceof THREE.Shape ? points : new THREE.Shape(points.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 18 });
  g.center();
  return g;
}

export function heartShape(s = 1) {
  const h = new THREE.Shape();
  h.moveTo(0, -1.6 * s);
  h.bezierCurveTo(-0.6 * s, -1.1 * s, -2 * s, -0.4 * s, -2 * s, 0.6 * s);
  h.bezierCurveTo(-2 * s, 1.6 * s, -0.8 * s, 2 * s, 0, 1.1 * s);
  h.bezierCurveTo(0.8 * s, 2 * s, 2 * s, 1.6 * s, 2 * s, 0.6 * s);
  h.bezierCurveTo(2 * s, -0.4 * s, 0.6 * s, -1.1 * s, 0, -1.6 * s);
  return h;
}

export function gearShape(r: number, teeth = 8) {
  const g = new THREE.Shape();
  const inner = r * 0.78;
  for (let i = 0; i < teeth * 2; i++) {
    const a0 = (i / (teeth * 2)) * Math.PI * 2, a1 = ((i + 1) / (teeth * 2)) * Math.PI * 2;
    const rr = i % 2 ? inner : r;
    if (i === 0) g.moveTo(Math.cos(a0) * rr, Math.sin(a0) * rr); else g.lineTo(Math.cos(a0) * rr, Math.sin(a0) * rr);
    g.lineTo(Math.cos(a1) * rr, Math.sin(a1) * rr);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, r * 0.32, 0, Math.PI * 2, true);
  g.holes.push(hole);
  return g;
}

/** Check mark outline, roughly 5 × 4.4, counter-clockwise. */
export const CHECK: [number, number][] = [[-2.4, 0.4], [-0.6, -1.6], [2.8, 1.8], [1.8, 2.8], [-0.6, 0.4], [-1.4, 1.4]];
