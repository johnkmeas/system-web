import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { District, Form } from "./links";

export type Theme = "day" | "night";

interface Palette {
  skyTop: string; skyHorizon: string; skyBottom: string; sun: string;
  fog: string; ground: string; outerGround: string; road: string; roadLine: string;
  facade: string; window: string; roof: string; lit: number;
  rock: string; rockDark: string; snow: string;
  hemiSky: string; hemiGround: string; hemi: number; sunLight: string; sunI: number;
  stars: number; carLight: number;
}

const PALETTES: Record<Theme, Palette> = {
  day: {
    skyTop: "#5B8FD8", skyHorizon: "#F4D9C6", skyBottom: "#C9D6E8", sun: "#FFE9C2",
    fog: "#D9DEE8", ground: "#B9BFC9", outerGround: "#A8B39A", road: "#7A808C", roadLine: "#F2F2F2",
    facade: "#E3E6EC", window: "#9FB5D4", roof: "#C4C9D2", lit: 0,
    rock: "#7D8A9C", rockDark: "#5E6B7E", snow: "#F4F7FB",
    hemiSky: "#CFE0FF", hemiGround: "#8C8070", hemi: 1.6, sunLight: "#FFF1DD", sunI: 2.6,
    stars: 0, carLight: 0.4,
  },
  night: {
    skyTop: "#070B1E", skyHorizon: "#3A2A58", skyBottom: "#0D1226", sun: "#AEB8FF",
    fog: "#231F45", ground: "#1D2238", outerGround: "#161A2E", road: "#2C3247", roadLine: "#6C7494",
    facade: "#48527E", window: "#1E2440", roof: "#2C3352", lit: 1.5,
    rock: "#3A4268", rockDark: "#262C4A", snow: "#A9B2D8",
    hemiSky: "#8C95E6", hemiGround: "#3A3050", hemi: 1.7, sunLight: "#AAB4FF", sunI: 0.9,
    stars: 1, carLight: 2.2,
  },
};

const BLOCK = 20;
/** Per-building tints, multiplied with the facade color. */
const TINTS = ["#FFFFFF", "#F3E9DC", "#DCE6F2", "#E8E2F0", "#D9E4DD", "#F0E0D6"].map(c => new THREE.Color(c));
const CITY_HALF = 160;

/** Deterministic random so the city looks the same on every visit. */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Facade tiles: one canvas for color, one for lit windows (emissive). */
function facadeTextures(seed: number) {
  const W = 128, H = 256, COLS = 4, ROWS = 8;
  const color = document.createElement("canvas"), glow = document.createElement("canvas");
  color.width = glow.width = W; color.height = glow.height = H;
  const c = color.getContext("2d")!, g = glow.getContext("2d")!;
  const r = rng(seed);
  c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
  g.fillStyle = "#000"; g.fillRect(0, 0, W, H);
  const cw = W / COLS, ch = H / ROWS;
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    const px = x * cw + cw * 0.18, py = y * ch + ch * 0.22, w = cw * 0.64, h = ch * 0.56;
    c.fillStyle = "#000"; c.fillRect(px, py, w, h);
    if (r() < 0.42) {
      const warm = r();
      g.fillStyle = warm < 0.7 ? "#FFD9A0" : warm < 0.9 ? "#FFF3D6" : "#9FD4FF";
      g.globalAlpha = 0.55 + r() * 0.45;
      g.fillRect(px, py, w, h);
      g.globalAlpha = 1;
    }
  }
  const mk = (cv: HTMLCanvasElement, srgb: boolean) => {
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  // The color map is a mask: white wall, black window. Tinted in the shader via onBeforeCompile.
  return { mask: mk(color, false), glow: mk(glow, true) };
}

/** One texture tile covers CELL world units (4 × 8 windows, 2 units each). */
const CELL = { w: 8, h: 16 };

function scaleBoxUVs(geo: THREE.BoxGeometry, w: number, h: number, d: number) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  // faces: +x, -x, +y, -y, +z, -z; 4 vertices each
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [fu, fv] = dims[f];
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, uv.getX(k) * fu / CELL.w, uv.getY(k) * fv / CELL.h);
    }
  }
  return geo;
}

function scaleCylUVs(geo: THREE.CylinderGeometry, radius: number, h: number) {
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const circ = 2 * Math.PI * radius;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / CELL.w, uv.getY(i) * h / CELL.h);
  return geo;
}

/** Facade material: wall color where the mask is white, window color where black, lit windows glow. */
function facadeMaterial(tex: { mask: THREE.Texture; glow: THREE.Texture }, wall: string, win: string, lit: number) {
  const m = new THREE.MeshStandardMaterial({
    color: wall, map: tex.mask, emissive: "#ffffff", emissiveMap: tex.glow, emissiveIntensity: lit,
    roughness: 0.82, metalness: 0.05,
  });
  const winColor = { value: new THREE.Color(win) };
  m.userData.winColor = winColor;
  m.onBeforeCompile = shader => {
    shader.uniforms.uWin = winColor;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform vec3 uWin;")
      .replace("#include <map_fragment>", `
        vec4 maskTex = texture2D( map, vMapUv );
        diffuseColor.rgb = mix( uWin, diffuseColor.rgb, maskTex.r );
      `);
  };
  return m;
}

interface Hero {
  district: District;
  group: THREE.Group;
  meshes: THREE.Mesh[];
  accents: THREE.MeshStandardMaterial[];
  halo: THREE.Mesh;
  beacon: THREE.Mesh;
  hover: number;
  top: number;
}

interface Car { mesh: number; axis: "x" | "z"; lane: number; pos: number; speed: number }

export interface CitySceneOptions {
  districts: District[];
  theme: Theme;
  reducedMotion: boolean;
  onHover: (id: string | null) => void;
  onSelect: (id: string) => void;
  /** Label elements to pin above each district, keyed by id. */
  labels: Map<string, HTMLElement>;
}

export class CityScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(42, 1, 1, 3000);
  private controls: OrbitControls;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(-2, -2);
  private heroes: Hero[] = [];
  private pickables: THREE.Object3D[] = [];
  private hovered: string | null = null;
  private down: { x: number; y: number } | null = null;
  private raf = 0;
  private clock = new THREE.Clock();
  private ro: ResizeObserver;
  private size = { w: 1, h: 1 };
  private inset = { right: 0, bottom: 0, curR: 0, curB: 0 };
  private fly: null | { t: number; dur: number; fromPos: THREE.Vector3; fromTarget: THREE.Vector3; toPos: THREE.Vector3; toTarget: THREE.Vector3 } = null;
  private home = { pos: new THREE.Vector3(175, 78, 245), target: new THREE.Vector3(0, 22, -10) };
  private palette: Palette;
  private theme: Theme;

  // themed resources
  private facadeMats: THREE.MeshStandardMaterial[] = [];
  private roofMat = new THREE.MeshStandardMaterial({ roughness: 0.9 });
  private sky!: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private hemi = new THREE.HemisphereLight();
  private sun = new THREE.DirectionalLight();
  private groundMat!: THREE.MeshStandardMaterial;
  private outerMat = new THREE.MeshStandardMaterial({ roughness: 1 });
  private roadTex!: THREE.CanvasTexture;
  private mountainMeshes: THREE.Mesh[] = [];
  private stars!: THREE.Points;
  private cars: Car[] = [];
  private carMesh!: THREE.InstancedMesh;
  private carMat = new THREE.MeshStandardMaterial({ color: "#222", emissive: "#FFE7B0" });
  private tmp = new THREE.Object3D();
  private v = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement, private opts: CitySceneOptions) {
    this.theme = opts.theme;
    this.palette = PALETTES[opts.theme];
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1;

    this.camera.position.copy(this.home.pos);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(this.home.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 40;
    this.controls.maxDistance = 520;
    this.controls.minPolarAngle = 0.18;
    this.controls.maxPolarAngle = 1.45;
    this.controls.enablePan = true;
    this.controls.screenSpacePanning = false;
    this.controls.autoRotate = !opts.reducedMotion;
    this.controls.autoRotateSpeed = 0.35;
    this.controls.addEventListener("start", () => { this.fly = null; this.controls.autoRotate = false; });

    this.build();
    this.applyTheme();

    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointerleave", this.onLeave);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    this.loop();
  }

  // ---------------------------------------------------------------- build

  private build() {
    const p = this.palette;
    this.scene.fog = new THREE.Fog(p.fog, 260, 980);

    // Sky dome
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() },
          sunColor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(-0.6, 0.18, -0.78).normalize() },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunColor; uniform vec3 sunDir;
          varying vec3 vDir;
          void main(){
            float h = vDir.y;
            vec3 col = h > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.6, h), 0.7)) : mix(horizon, bottom, smoothstep(0.0, -0.15, h));
            float s = max(dot(normalize(vDir), sunDir), 0.0);
            col += sunColor * (pow(s, 600.0) * 1.4 + pow(s, 12.0) * 0.28);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);

    // Stars (night)
    {
      const r = rng(7), n = 900, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = r() * Math.PI * 2, y = 0.08 + r() * 0.92, rad = Math.sqrt(1 - y * y);
        pos.set([Math.cos(th) * rad * 1300, y * 1300, Math.sin(th) * rad * 1300], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: "#DCE3FF", size: 2.2, sizeAttenuation: false, fog: false, transparent: true }));
      this.scene.add(this.stars);
    }

    // Lights
    this.scene.add(this.hemi);
    this.sun.position.set(-160, 220, -120);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -190; sc.right = 190; sc.top = 190; sc.bottom = -190; sc.near = 10; sc.far = 700;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);

    // Ground: road grid over the city, plain land beyond it
    this.roadTex = this.makeRoadTexture();
    this.groundMat = new THREE.MeshStandardMaterial({ map: this.roadTex, roughness: 0.95 });
    const city = new THREE.Mesh(new THREE.PlaneGeometry(CITY_HALF * 2 + BLOCK, CITY_HALF * 2 + BLOCK), this.groundMat);
    this.roadTex.repeat.set((CITY_HALF * 2 + BLOCK) / BLOCK, (CITY_HALF * 2 + BLOCK) / BLOCK);
    this.roadTex.offset.set(0.5, 0.5);
    city.rotation.x = -Math.PI / 2;
    city.receiveShadow = true;
    this.scene.add(city);
    const outer = new THREE.Mesh(new THREE.CircleGeometry(1300, 64), this.outerMat);
    outer.rotation.x = -Math.PI / 2;
    outer.position.y = -0.08;
    outer.receiveShadow = true;
    this.scene.add(outer);

    this.buildFiller();
    for (const d of this.opts.districts) this.buildHero(d);
    this.buildPlaza();
    this.buildMountains();
    this.buildCars();
  }

  private makeRoadTexture() {
    const S = 256, cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const c = cv.getContext("2d")!;
    // Drawn in theme colors at applyTheme(); here only layout.
    const draw = (p: Palette) => {
      const road = S * 0.3 / 2; // road half-width in px (6 units of 20)
      c.fillStyle = p.ground; c.fillRect(0, 0, S, S);
      c.fillStyle = p.road;
      c.fillRect(0, 0, S, road); c.fillRect(0, S - road, S, road);
      c.fillRect(0, 0, road, S); c.fillRect(S - road, 0, road, S);
      c.fillStyle = p.roadLine; c.globalAlpha = 0.7;
      for (let i = 0; i < S; i += 24) {
        c.fillRect(i, -1, 12, 2); c.fillRect(i, S - 1, 12, 2);
        c.fillRect(-1, i, 2, 12); c.fillRect(S - 1, i, 2, 12);
      }
      c.globalAlpha = 0.18; c.fillStyle = "#000";
      c.fillRect(road, road, S - road * 2, 3); c.fillRect(road, road, 3, S - road * 2);
      c.globalAlpha = 1;
    };
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    t.userData.draw = draw;
    return t;
  }

  private heroCells() {
    const s = new Set<string>();
    for (const d of this.opts.districts) s.add(`${d.pos[0]},${d.pos[1]}`);
    return s;
  }

  private buildFiller() {
    const r = rng(42);
    const reserved = this.heroCells();
    const near = (x: number, z: number) => this.opts.districts.some(d => Math.hypot(d.pos[0] - x, d.pos[1] - z) < 34);
    // Height classes so window UVs stay square on instanced boxes.
    const classes = [5, 8, 12, 16, 22, 30];
    const widths = [5, 6.5];
    const buckets = new Map<string, THREE.Matrix4[]>();
    const tints = new Map<string, number[]>();
    const tex = facadeTextures(11);
    const texB = facadeTextures(23);
    for (let bx = -CITY_HALF; bx <= CITY_HALF; bx += BLOCK) {
      for (let bz = -CITY_HALF; bz <= CITY_HALF; bz += BLOCK) {
        if (reserved.has(`${bx},${bz}`)) continue;
        if (Math.abs(bx) <= 20 && Math.abs(bz) <= 20) continue; // plaza
        const dist = Math.hypot(bx, bz);
        const edge = 1 - dist / (CITY_HALF * 1.45);
        if (r() > 0.25 + edge) continue; // thin out toward the edge
        const cap = near(bx, bz) ? 2 : Math.max(0, Math.min(classes.length - 1, Math.floor(edge * classes.length + r() * 2.2 - 0.6)));
        const lots = r() < 0.5 ? 4 : r() < 0.6 ? 2 : 1;
        const offs = lots === 4 ? [[-3.6, -3.6], [3.6, -3.6], [-3.6, 3.6], [3.6, 3.6]] : lots === 2 ? [[-3.6, 0], [3.6, 0]] : [[0, 0]];
        for (const [ox, oz] of offs) {
          if (r() < 0.12) continue;
          const hc = Math.floor(r() * (cap + 1));
          const wc = lots === 1 ? 1 : r() < 0.6 ? 0 : 1;
          const key = `${hc}|${wc}|${r() < 0.5 ? "a" : "b"}`;
          const m = new THREE.Matrix4().makeTranslation(bx + ox, classes[hc] / 2, bz + oz);
          if (lots === 1) m.multiply(new THREE.Matrix4().makeScale(1.6, 1, 1.6));
          if (!buckets.has(key)) buckets.set(key, []);
          buckets.get(key)!.push(m);
          if (!tints.has(key)) tints.set(key, []);
          tints.get(key)!.push(Math.floor(r() * TINTS.length));
        }
      }
    }
    for (const [key, mats] of buckets) {
      const [hc, wc, t] = key.split("|");
      const h = classes[+hc], w = widths[+wc];
      const geo = scaleBoxUVs(new THREE.BoxGeometry(w, h, w), w, h, w);
      const side = facadeMaterial(t === "a" ? tex : texB, this.palette.facade, this.palette.window, this.palette.lit);
      this.facadeMats.push(side);
      const mesh = new THREE.InstancedMesh(geo, [side, side, this.roofMat, this.roofMat, side, side], mats.length);
      const tk = tints.get(key)!;
      mats.forEach((m, i) => { mesh.setMatrixAt(i, m); mesh.setColorAt(i, TINTS[tk[i]]); });
      mesh.castShadow = mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
  }

  private buildHero(d: District) {
    const group = new THREE.Group();
    group.position.set(d.pos[0], 0, d.pos[1]);
    const tex = facadeTextures(d.id.length * 31 + 5);
    const side = facadeMaterial(tex, this.palette.facade, this.palette.window, this.palette.lit);
    side.userData.tint = d.color;
    this.facadeMats.push(side);
    const accent = new THREE.MeshStandardMaterial({ color: d.color, emissive: d.color, emissiveIntensity: 0.6, roughness: 0.4 });
    const accents = [accent];
    const meshes: THREE.Mesh[] = [];
    const add = (m: THREE.Mesh) => { m.castShadow = m.receiveShadow = true; group.add(m); meshes.push(m); return m; };
    const box = (w: number, h: number, dd: number, y: number, rot = 0) => {
      const m = add(new THREE.Mesh(scaleBoxUVs(new THREE.BoxGeometry(w, h, dd), w, h, dd), [side, side, this.roofMat, this.roofMat, side, side]));
      m.position.y = y + h / 2; m.rotation.y = rot; return m;
    };
    const cyl = (r: number, h: number, y: number, seg = 32) => {
      const m = add(new THREE.Mesh(scaleCylUVs(new THREE.CylinderGeometry(r, r, h, seg, 1), r, h), [side, this.roofMat, this.roofMat]));
      m.position.y = y + h / 2; return m;
    };
    const strip = (w: number, h: number, dd: number, x: number, y: number, z: number) => {
      const m = add(new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), accent));
      m.position.set(x, y, z); m.castShadow = false; return m;
    };

    let top = d.height;
    const form: Form = d.form;
    if (form === "stepped") {
      box(16, 22, 16, 0); box(12, 14, 12, 22); box(8, 10, 8, 36);
      for (const [x, z] of [[8, 8], [-8, 8], [8, -8], [-8, -8]]) strip(0.5, 22, 0.5, x, 11, z);
      strip(12.4, 0.6, 12.4, 0, 36, 0);
      top = 46;
    } else if (form === "spire") {
      box(10, 46, 10, 0);
      for (const [x, z] of [[5, 5], [-5, 5], [5, -5], [-5, -5]]) strip(0.45, 46, 0.45, x, 23, z);
      const ant = add(new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.5, 10, 8), this.roofMat));
      ant.position.y = 51;
      top = 56;
    } else if (form === "cylinder") {
      cyl(8, 36, 0);
      for (const y of [9, 18, 27, 36]) {
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(8.15, 0.3, 6, 48), accent));
        ring.rotation.x = Math.PI / 2; ring.position.y = y; ring.castShadow = false;
      }
      // rooftop cross sign
      strip(5, 1.4, 1.4, 0, 39, 0); strip(1.4, 5, 1.4, 0, 39, 0);
      top = 42;
    } else if (form === "datacenter") {
      box(18, 14, 14, 0);
      box(8, 22, 8, 0).position.x = -5;
      const tri = add(new THREE.Mesh(new THREE.ConeGeometry(6, 9, 3), accent));
      tri.position.set(5, 18.5, 0); tri.castShadow = true;
      strip(18.4, 0.6, 14.4, 0, 14, 0);
      top = 30;
    } else if (form === "twist") {
      for (let i = 0; i < 7; i++) box(10, 6, 10, i * 6, i * 0.16);
      for (let i = 1; i < 7; i++) {
        const s = strip(10.5, 0.4, 10.5, 0, i * 6, 0); s.rotation.y = i * 0.16;
      }
      top = 44;
    } else if (form === "hub") {
      cyl(13, 26, 0, 8); cyl(10, 22, 26, 8); cyl(7, 16, 48, 8);
      const crown = add(new THREE.Mesh(new THREE.CylinderGeometry(2.5, 7, 7, 8), accent));
      crown.position.y = 67.5;
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        strip(0.5, 26, 0.5, Math.cos(a) * 12.1, 13, Math.sin(a) * 12.1);
      }
      for (const [r, y] of [[13.4, 26], [10.4, 48]] as const) {
        const ring = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.35, 6, 8), accent));
        ring.rotation.x = Math.PI / 2; ring.rotation.z = Math.PI / 8; ring.position.y = y; ring.castShadow = false;
      }
      top = 72;
    }

    const beaconMat = new THREE.MeshBasicMaterial({ color: d.color, transparent: true });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 12), beaconMat);
    beacon.position.y = top + 1.2;
    group.add(beacon);

    const halo = new THREE.Mesh(
      new THREE.RingGeometry(form === "hub" ? 15 : 11, form === "hub" ? 17 : 12.6, 64),
      new THREE.MeshBasicMaterial({ color: d.color, transparent: true, opacity: 0.35, depthWrite: false }),
    );
    halo.rotation.x = -Math.PI / 2;
    halo.position.y = 0.06;
    group.add(halo);

    // Invisible, generous hit box so thin towers are easy to click.
    const hit = new THREE.Mesh(new THREE.BoxGeometry(form === "hub" ? 28 : 20, top + 4, form === "hub" ? 28 : 20), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = (top + 4) / 2;
    hit.userData.district = d.id;
    group.add(hit);
    this.pickables.push(hit);

    group.userData.district = d.id;
    this.scene.add(group);
    this.heroes.push({ district: d, group, meshes, accents, halo, beacon, hover: 0, top });
  }

  private buildPlaza() {
    // Park blocks around the hub: grass pads and trees.
    const grass = new THREE.MeshStandardMaterial({ color: "#5E8A55", roughness: 1 });
    const trunk = new THREE.MeshStandardMaterial({ color: "#5A4636", roughness: 1 });
    const leaf = new THREE.MeshStandardMaterial({ color: "#4F7D4A", roughness: 1, flatShading: true });
    grass.userData.themeable = leaf.userData.themeable = true;
    this.plazaMats = [grass, leaf];
    const r = rng(99);
    const treeGeo = new THREE.IcosahedronGeometry(1.8, 0);
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.35, 2, 6);
    const trees: THREE.Matrix4[] = [], trunks: THREE.Matrix4[] = [];
    for (let bx = -20; bx <= 20; bx += BLOCK) for (let bz = -20; bz <= 20; bz += BLOCK) {
      if (bx === 0 && bz === 0) continue;
      const pad = new THREE.Mesh(new THREE.BoxGeometry(13.6, 0.3, 13.6), grass);
      pad.position.set(bx, 0.15, bz); pad.receiveShadow = true;
      this.scene.add(pad);
      for (let i = 0; i < 7; i++) {
        const x = bx + (r() - 0.5) * 11, z = bz + (r() - 0.5) * 11, s = 0.7 + r() * 0.7;
        trees.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 2.4 * s + 0.3, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, r() * 6, 0)), new THREE.Vector3(s, s * 1.2, s)));
        trunks.push(new THREE.Matrix4().compose(new THREE.Vector3(x, 1.3, z), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1)));
      }
    }
    const tm = new THREE.InstancedMesh(treeGeo, leaf, trees.length);
    const km = new THREE.InstancedMesh(trunkGeo, trunk, trunks.length);
    trees.forEach((m, i) => tm.setMatrixAt(i, m));
    trunks.forEach((m, i) => km.setMatrixAt(i, m));
    tm.castShadow = km.castShadow = true;
    this.scene.add(tm, km);
  }
  private plazaMats: THREE.MeshStandardMaterial[] = [];

  private buildMountains() {
    const r = rng(2024);
    const ring = (count: number, rMin: number, rMax: number, hMin: number, hMax: number) => {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + r() * 0.2;
        const dist = rMin + r() * (rMax - rMin);
        const h = hMin + r() * (hMax - hMin);
        const rad = h * (0.9 + r() * 0.7);
        const geo = new THREE.ConeGeometry(rad, h, 7 + Math.floor(r() * 3), 4).toNonIndexed();
        const pos = geo.attributes.position as THREE.BufferAttribute;
        // Jitter each unique vertex consistently (same key → same offset) so faces stay closed.
        const jit = new Map<string, [number, number, number]>();
        for (let k = 0; k < pos.count; k++) {
          const x = pos.getX(k), y = pos.getY(k), z = pos.getZ(k);
          const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)}`;
          if (!jit.has(key)) {
            const isPeak = y > h / 2 - 0.01, isBase = y < -h / 2 + 0.01;
            jit.set(key, isPeak ? [(r() - 0.5) * rad * 0.2, 0, (r() - 0.5) * rad * 0.2]
              : [(r() - 0.5) * rad * 0.28, isBase ? 0 : (r() - 0.5) * h * 0.14, (r() - 0.5) * rad * 0.28]);
          }
          const [jx, jy, jz] = jit.get(key)!;
          pos.setXYZ(k, x + jx, y + jy, z + jz);
        }
        geo.computeVertexNormals();
        // Vertex colors per face: rock below, snow on top third.
        const col = new Float32Array(pos.count * 3);
        geo.userData.faceY = [] as number[];
        for (let f = 0; f < pos.count; f += 3) {
          const cy = (pos.getY(f) + pos.getY(f + 1) + pos.getY(f + 2)) / 3;
          (geo.userData.faceY as number[]).push((cy + h / 2) / h + (r() - 0.5) * 0.08);
        }
        geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
        const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
        mesh.position.set(Math.cos(a) * dist, h / 2 - 4, Math.sin(a) * dist);
        mesh.rotation.y = r() * Math.PI;
        this.scene.add(mesh);
        this.mountainMeshes.push(mesh);
      }
    };
    ring(26, 470, 560, 38, 85);
    ring(34, 620, 840, 70, 150);
  }

  private paintMountains() {
    const p = this.palette;
    const rock = new THREE.Color(p.rock), dark = new THREE.Color(p.rockDark), snow = new THREE.Color(p.snow), c = new THREE.Color();
    for (const m of this.mountainMeshes) {
      const geo = m.geometry as THREE.BufferGeometry;
      const col = geo.attributes.color as THREE.BufferAttribute;
      const faceY = geo.userData.faceY as number[];
      faceY.forEach((t, fi) => {
        if (t > 0.68) c.copy(snow);
        else c.copy(dark).lerp(rock, Math.min(1, t * 1.4));
        for (let k = 0; k < 3; k++) col.setXYZ(fi * 3 + k, c.r, c.g, c.b);
      });
      col.needsUpdate = true;
    }
  }

  private buildCars() {
    const r = rng(5);
    const n = 140;
    const lanes: number[] = [];
    for (let v = -CITY_HALF - BLOCK / 2; v <= CITY_HALF + BLOCK / 2; v += BLOCK) lanes.push(v);
    this.carMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1.2, 0.7, 2.4), this.carMat, n);
    for (let i = 0; i < n; i++) {
      const dir = r() < 0.5 ? 1 : -1;
      this.cars.push({
        mesh: i, axis: r() < 0.5 ? "x" : "z",
        lane: lanes[Math.floor(r() * lanes.length)] + dir * 1.4,
        pos: (r() - 0.5) * CITY_HALF * 2, speed: dir * (10 + r() * 14),
      });
    }
    this.scene.add(this.carMesh);
    this.updateCars(0);
  }

  private updateCars(dt: number) {
    const L = CITY_HALF + BLOCK / 2;
    for (const c of this.cars) {
      c.pos += c.speed * dt;
      if (c.pos > L) c.pos -= L * 2; else if (c.pos < -L) c.pos += L * 2;
      if (c.axis === "x") { this.tmp.position.set(c.pos, 0.4, c.lane); this.tmp.rotation.set(0, Math.PI / 2, 0); }
      else { this.tmp.position.set(c.lane, 0.4, c.pos); this.tmp.rotation.set(0, 0, 0); }
      this.tmp.updateMatrix();
      this.carMesh.setMatrixAt(c.mesh, this.tmp.matrix);
    }
    this.carMesh.instanceMatrix.needsUpdate = true;
  }

  // ---------------------------------------------------------------- theme

  setTheme(theme: Theme) {
    if (theme === this.theme) return;
    this.theme = theme;
    this.palette = PALETTES[theme];
    this.applyTheme();
  }

  private applyTheme() {
    const p = this.palette;
    const u = this.sky.material.uniforms;
    u.top.value.set(p.skyTop); u.horizon.value.set(p.skyHorizon); u.bottom.value.set(p.skyBottom); u.sunColor.value.set(p.sun);
    (this.scene.fog as THREE.Fog).color.set(p.fog);
    this.hemi.color.set(p.hemiSky); this.hemi.groundColor.set(p.hemiGround); this.hemi.intensity = p.hemi;
    this.sun.color.set(p.sunLight); this.sun.intensity = p.sunI;
    for (const m of this.facadeMats) {
      m.color.set(p.facade);
      if (m.userData.tint) m.color.lerp(new THREE.Color(m.userData.tint), this.theme === "night" ? 0.22 : 0.3);
      (m.userData.winColor as { value: THREE.Color }).value.set(p.window);
      m.emissiveIntensity = p.lit;
    }
    this.roofMat.color.set(p.roof);
    this.outerMat.color.set(p.outerGround);
    (this.roadTex.userData.draw as (p: Palette) => void)(p);
    this.roadTex.needsUpdate = true;
    const night = this.theme === "night";
    this.plazaMats[0]?.color.set(night ? "#1F3326" : "#6E9A5E");
    this.plazaMats[1]?.color.set(night ? "#1E3A2A" : "#4F7D4A");
    (this.stars.material as THREE.PointsMaterial).opacity = p.stars;
    this.stars.visible = p.stars > 0;
    this.carMat.emissiveIntensity = p.carLight;
    this.carMat.color.set(night ? "#111" : "#E4E7EE");
    this.renderer.toneMappingExposure = night ? 1.15 : 1;
    this.paintMountains();
  }

  // ---------------------------------------------------------------- camera

  /** Fly to a district (or back to the overview with null). */
  focus(id: string | null) {
    const hero = this.heroes.find(h => h.district.id === id);
    let toTarget: THREE.Vector3, toPos: THREE.Vector3;
    if (!hero) {
      toTarget = this.home.target.clone();
      // Keep the current viewing angle, just pull back.
      const dir = this.camera.position.clone().sub(this.controls.target).normalize();
      toPos = toTarget.clone().add(dir.multiplyScalar(this.home.pos.distanceTo(this.home.target)));
      toPos.y = Math.max(toPos.y, this.home.pos.y);
    } else {
      const [x, z] = hero.district.pos;
      toTarget = new THREE.Vector3(x, hero.top * 0.55, z);
      const out = new THREE.Vector2(x, z);
      if (out.lengthSq() < 1) out.set(this.camera.position.x, this.camera.position.z);
      out.normalize();
      const dist = 85 + hero.top * 1.5;
      toPos = new THREE.Vector3(x + out.x * dist, hero.top * 0.5 + dist * 0.32, z + out.y * dist);
    }
    this.controls.autoRotate = false;
    if (this.opts.reducedMotion) {
      this.camera.position.copy(toPos); this.controls.target.copy(toTarget); this.fly = null;
      return;
    }
    this.fly = {
      t: 0, dur: hero ? 1.5 : 1.3,
      fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(), toPos, toTarget,
    };
  }

  /** Reserve screen space for an overlay panel; the view re-centers in what's left. */
  setInset(right: number, bottom: number) {
    this.inset.right = right; this.inset.bottom = bottom;
    if (this.opts.reducedMotion) { this.inset.curR = right; this.inset.curB = bottom; this.applyViewOffset(); }
  }

  resetView() {
    this.fly = {
      t: 0, dur: 1.4, fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(),
      toPos: this.home.pos.clone(), toTarget: this.home.target.clone(),
    };
  }

  private applyViewOffset() {
    const { w, h } = this.size;
    const { curR, curB } = this.inset;
    if (curR < 0.5 && curB < 0.5) this.camera.clearViewOffset();
    else this.camera.setViewOffset(w, h, curR / 2, curB / 2, w, h);
  }

  private resize() {
    const w = this.canvas.clientWidth || 1, h = this.canvas.clientHeight || 1;
    this.size = { w, h };
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Pull back on narrow screens so the whole skyline fits.
    this.camera.fov = w / h < 0.8 ? 50 : 42;
    this.camera.updateProjectionMatrix();
    this.applyViewOffset();
  }

  // ---------------------------------------------------------------- input

  private pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.pickables, false)[0];
    return (hit?.object.userData.district as string | undefined) ?? null;
  }

  private setPointer(e: PointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
  }

  private onMove = (e: PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    this.setPointer(e);
    const id = this.pick();
    if (id !== this.hovered) this.hover(id);
  };

  hover(id: string | null) {
    if (id === this.hovered) return;
    this.hovered = id;
    this.canvas.style.cursor = id ? "pointer" : "";
    this.opts.onHover(id);
  }

  private onDown = (e: PointerEvent) => { this.down = { x: e.clientX, y: e.clientY }; };
  private onUp = (e: PointerEvent) => {
    if (!this.down) return;
    const moved = Math.hypot(e.clientX - this.down.x, e.clientY - this.down.y);
    this.down = null;
    if (moved > 6) return;
    this.setPointer(e);
    const id = this.pick();
    if (id) this.opts.onSelect(id);
  };
  private onLeave = () => { if (this.hovered) this.hover(null); };

  // ---------------------------------------------------------------- loop

  private loop = () => {
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;

    if (this.fly) {
      this.fly.t = Math.min(1, this.fly.t + dt / this.fly.dur);
      const k = this.fly.t < 0.5 ? 4 * this.fly.t ** 3 : 1 - (-2 * this.fly.t + 2) ** 3 / 2;
      this.camera.position.lerpVectors(this.fly.fromPos, this.fly.toPos, k);
      // Arc up a little mid-flight so the camera clears towers.
      this.camera.position.y += Math.sin(k * Math.PI) * 18;
      this.controls.target.lerpVectors(this.fly.fromTarget, this.fly.toTarget, k);
      if (this.fly.t >= 1) this.fly = null;
    }
    this.controls.update(dt);

    const ease = 1 - Math.exp(-dt * 7);
    if (Math.abs(this.inset.curR - this.inset.right) > 0.3 || Math.abs(this.inset.curB - this.inset.bottom) > 0.3) {
      this.inset.curR += (this.inset.right - this.inset.curR) * ease;
      this.inset.curB += (this.inset.bottom - this.inset.curB) * ease;
      this.applyViewOffset();
    }

    if (!this.opts.reducedMotion) this.updateCars(dt);

    for (const h of this.heroes) {
      const on = h.district.id === this.hovered ? 1 : 0;
      h.hover += (on - h.hover) * ease;
      const s = 1 + h.hover * 0.04;
      h.group.scale.set(s, 1 + h.hover * 0.03, s);
      for (const a of h.accents) a.emissiveIntensity = 0.6 + h.hover * 1.4 + (this.theme === "night" ? 0.6 : 0);
      const pulse = this.opts.reducedMotion ? 1 : 0.65 + Math.sin(t * 2.4 + h.district.pos[0]) * 0.35;
      (h.beacon.material as THREE.MeshBasicMaterial).opacity = pulse;
      const halo = h.halo.material as THREE.MeshBasicMaterial;
      halo.opacity = 0.25 + h.hover * 0.55;
      h.halo.scale.setScalar(1 + h.hover * 0.12);
    }

    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
  };

  private placeLabels() {
    const { w, h } = this.size;
    for (const hero of this.heroes) {
      const el = this.opts.labels.get(hero.district.id);
      if (!el) continue;
      this.v.set(hero.district.pos[0], hero.top * (1 + hero.hover * 0.03) + 6, hero.district.pos[1]).project(this.camera);
      const behind = this.v.z > 1;
      const x = (this.v.x * 0.5 + 0.5) * w, y = (-this.v.y * 0.5 + 0.5) * h;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      el.dataset.hidden = behind || x < -80 || x > w + 80 || y < -40 || y > h + 40 ? "true" : "false";
      // Nearer labels on top.
      el.style.zIndex = String(1000 - Math.round(this.camera.position.distanceTo(hero.group.position)));
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.ro.disconnect();
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointerleave", this.onLeave);
    this.controls.dispose();
    const mats = new Set<THREE.Material>();
    this.scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      if (m.material) (Array.isArray(m.material) ? m.material : [m.material]).forEach(x => mats.add(x));
    });
    mats.forEach(m => {
      for (const v of Object.values(m)) if (v instanceof THREE.Texture) v.dispose();
      m.dispose();
    });
    this.renderer.dispose();
  }
}
