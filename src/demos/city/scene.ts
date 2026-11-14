import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { District } from "./links";
import { STYLES, type CityStyle, type Theme } from "./styles";
import { buildWorld, type World } from "./world";

export type { Theme, CityStyle };

export interface CitySceneOptions {
  districts: District[];
  style: CityStyle;
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
  private world!: World;
  private hovered: string | null = null;
  private down: { x: number; y: number } | null = null;
  private raf = 0;
  private clock = new THREE.Clock();
  private ro: ResizeObserver;
  private size = { w: 1, h: 1 };
  private inset = { right: 0, bottom: 0, curR: 0, curB: 0 };
  private fly: null | { t: number; dur: number; fromPos: THREE.Vector3; fromTarget: THREE.Vector3; toPos: THREE.Vector3; toTarget: THREE.Vector3 } = null;
  private home = { pos: new THREE.Vector3(175, 78, 245), target: new THREE.Vector3(0, 22, -10) };
  private style: CityStyle;
  private theme: Theme;
  private swapTimer = 0;

  private sky: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  private stars: THREE.Points;
  private hemi = new THREE.HemisphereLight();
  private sun = new THREE.DirectionalLight();
  private v = new THREE.Vector3();

  constructor(private canvas: HTMLCanvasElement, private opts: CitySceneOptions) {
    this.style = opts.style;
    this.theme = opts.theme;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera.position.copy(this.home.pos);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.copy(this.home.target);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 40;
    this.controls.maxDistance = 520;
    this.controls.minPolarAngle = 0.18;
    this.controls.maxPolarAngle = 1.45;
    this.controls.screenSpacePanning = false;
    this.controls.autoRotate = !opts.reducedMotion;
    this.controls.autoRotateSpeed = 0.35;
    this.controls.addEventListener("start", () => { this.fly = null; this.controls.autoRotate = false; });

    this.scene.fog = new THREE.Fog("#ffffff", 260, 980);
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(1400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide, depthWrite: false, fog: false,
        uniforms: {
          top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, bottom: { value: new THREE.Color() },
          sunColor: { value: new THREE.Color() }, sunDir: { value: new THREE.Vector3(-0.6, 0.18, -0.78).normalize() },
          bands: { value: 0 },
        },
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom; uniform vec3 sunColor; uniform vec3 sunDir; uniform float bands;
          varying vec3 vDir;
          void main(){
            float h = vDir.y;
            float t = pow(smoothstep(0.0, 0.6, h), 0.7);
            if (bands > 0.0) t = floor(t * bands) / bands;
            vec3 col = h > 0.0 ? mix(horizon, top, t) : mix(horizon, bottom, smoothstep(0.0, -0.15, h));
            float s = max(dot(normalize(vDir), sunDir), 0.0);
            float disc = bands > 0.0 ? step(0.9985, s) * 1.2 : pow(s, 600.0) * 1.4;
            float glow = bands > 0.0 ? floor(pow(s, 12.0) * 4.0) / 4.0 * 0.3 : pow(s, 12.0) * 0.28;
            col += sunColor * (disc + glow);
            gl_FragColor = vec4(col, 1.0);
          }`,
      }),
    );
    this.sky.renderOrder = -1;
    this.scene.add(this.sky);
    {
      const r = mulberry(7), n = 900, pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const th = r() * Math.PI * 2, y = 0.08 + r() * 0.92, rad = Math.sqrt(1 - y * y);
        pos.set([Math.cos(th) * rad * 1300, y * 1300, Math.sin(th) * rad * 1300], i * 3);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      this.stars = new THREE.Points(g, new THREE.PointsMaterial({ color: "#DCE3FF", size: 2.2, sizeAttenuation: false, fog: false }));
      this.scene.add(this.stars);
    }
    this.scene.add(this.hemi);
    this.sun.position.set(-160, 220, -120);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -190; sc.right = 190; sc.top = 190; sc.bottom = -190; sc.near = 10; sc.far = 700;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.6;
    this.scene.add(this.sun, this.sun.target);

    this.rebuild();

    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointerleave", this.onLeave);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
    this.resize();
    this.loop();
  }

  // ---------------------------------------------------------------- look

  /** Switch theme and/or day-night. The city fades out, rebuilds, fades back in. */
  setLook(style: CityStyle, theme: Theme) {
    if (style === this.style && theme === this.theme) return;
    this.style = style; this.theme = theme;
    clearTimeout(this.swapTimer);
    if (this.opts.reducedMotion) { this.rebuild(); return; }
    this.canvas.style.transition = "opacity .2s ease";
    this.canvas.style.opacity = "0";
    this.swapTimer = window.setTimeout(() => {
      this.rebuild();
      requestAnimationFrame(() => { this.canvas.style.opacity = "1"; });
    }, 200);
  }

  private rebuild() {
    if (this.world) { this.scene.remove(this.world.group); this.world.dispose(); }
    this.hover(null);
    const def = STYLES[this.style], p = def.palette[this.theme];
    this.world = buildWorld(this.style, this.theme, this.opts.districts);
    this.scene.add(this.world.group);

    const u = this.sky.material.uniforms;
    u.top.value.set(p.skyTop); u.horizon.value.set(p.skyHorizon); u.bottom.value.set(p.skyBottom); u.sunColor.value.set(p.sun);
    u.bands.value = def.pixel ? 7 : 0;
    const fog = this.scene.fog as THREE.Fog;
    fog.color.set(p.fog); fog.near = p.fogNear; fog.far = p.fogFar;
    this.hemi.color.set(p.hemiSky); this.hemi.groundColor.set(p.hemiGround); this.hemi.intensity = p.hemi;
    this.sun.color.set(p.sunColor); this.sun.intensity = p.sunI;
    this.stars.visible = p.stars;
    (this.stars.material as THREE.PointsMaterial).size = def.pixel ? 4 : 2.2;
    this.renderer.toneMapping = this.style === "gummy" || this.style === "8bit" ? THREE.NeutralToneMapping : THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = p.exposure;
    this.canvas.style.imageRendering = def.pixel ? "pixelated" : "";
    this.resize();
  }

  // ---------------------------------------------------------------- camera

  /** Fly to a district (or back to the overview with null). */
  focus(id: string | null) {
    const hero = this.world.heroes.find(h => h.district.id === id);
    let toTarget: THREE.Vector3, toPos: THREE.Vector3;
    if (!hero) {
      toTarget = this.home.target.clone();
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
    this.fly = { t: 0, dur: hero ? 1.5 : 1.3, fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(), toPos, toTarget };
  }

  /** Reserve screen space for an overlay panel; the view re-centers in what's left. */
  setInset(right: number, bottom: number) {
    this.inset.right = right; this.inset.bottom = bottom;
    if (this.opts.reducedMotion) { this.inset.curR = right; this.inset.curB = bottom; this.applyViewOffset(); }
  }

  resetView() {
    this.fly = { t: 0, dur: 1.4, fromPos: this.camera.position.clone(), fromTarget: this.controls.target.clone(), toPos: this.home.pos.clone(), toTarget: this.home.target.clone() };
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
    const pixel = STYLES[this.style].pixel;
    this.renderer.setPixelRatio(pixel ? 1 / pixel : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.8 ? 50 : 42;
    this.camera.updateProjectionMatrix();
    this.applyViewOffset();
  }

  // ---------------------------------------------------------------- input

  private pick() {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.world.pickables, false)[0];
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
    const reduced = this.opts.reducedMotion;

    if (this.fly) {
      this.fly.t = Math.min(1, this.fly.t + dt / this.fly.dur);
      const k = this.fly.t < 0.5 ? 4 * this.fly.t ** 3 : 1 - (-2 * this.fly.t + 2) ** 3 / 2;
      this.camera.position.lerpVectors(this.fly.fromPos, this.fly.toPos, k);
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

    this.world.update(dt, t, reduced);

    for (const h of this.world.heroes) {
      const on = h.district.id === this.hovered ? 1 : 0;
      h.hover += (on - h.hover) * ease;
      const s = 1 + h.hover * 0.04;
      h.group.scale.set(s, 1 + h.hover * 0.03, s);
      for (const g of h.glow) g.mat.emissiveIntensity = g.base + h.hover * g.boost;
      (h.beacon.material as THREE.MeshBasicMaterial).opacity = reduced ? 1 : 0.65 + Math.sin(t * 2.4 + h.district.pos[0]) * 0.35;
      (h.halo.material as THREE.MeshBasicMaterial).opacity = 0.25 + h.hover * 0.55;
      h.halo.scale.setScalar(1 + h.hover * 0.12);
    }

    this.renderer.render(this.scene, this.camera);
    this.placeLabels();
  };

  private placeLabels() {
    const { w, h } = this.size;
    for (const hero of this.world.heroes) {
      const el = this.opts.labels.get(hero.district.id);
      if (!el) continue;
      this.v.set(hero.district.pos[0], hero.top * (1 + hero.hover * 0.03) + 6, hero.district.pos[1]).project(this.camera);
      const behind = this.v.z > 1;
      const x = (this.v.x * 0.5 + 0.5) * w, y = (-this.v.y * 0.5 + 0.5) * h;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -100%)`;
      el.dataset.hidden = behind || x < -80 || x > w + 80 || y < -40 || y > h + 40 ? "true" : "false";
      el.style.zIndex = String(1000 - Math.round(this.camera.position.distanceTo(hero.group.position)));
    }
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.swapTimer);
    this.ro.disconnect();
    this.canvas.removeEventListener("pointermove", this.onMove);
    this.canvas.removeEventListener("pointerdown", this.onDown);
    this.canvas.removeEventListener("pointerup", this.onUp);
    this.canvas.removeEventListener("pointerleave", this.onLeave);
    this.controls.dispose();
    this.world.dispose();
    this.sky.geometry.dispose(); this.sky.material.dispose();
    this.stars.geometry.dispose(); (this.stars.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}

function mulberry(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
