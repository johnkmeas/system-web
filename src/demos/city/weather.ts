/**
 * Live weather for Vancouver from Open-Meteo (free, no API key, CORS enabled),
 * and the particle effects that draw it: rain, snow and lightning.
 * Only the city's fixed coordinates are sent; nothing about the viewer.
 */
import * as THREE from "three";

export type WeatherKind = "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "storm";

export interface WeatherState {
  kind: WeatherKind;
  /** Cloud cover, 0–1. */
  cloud: number;
  /** Precipitation strength, 0–1. */
  intensity: number;
  /** Wind speed, km/h. */
  wind: number;
}

export interface LiveWeather extends WeatherState {
  label: string;
  tempC: number;
  isDay: boolean;
  updated: Date;
}

const ENDPOINT = "https://api.open-meteo.com/v1/forecast?latitude=49.2827&longitude=-123.1207"
  + "&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,is_day&timezone=America%2FVancouver";

/** WMO weather code → what to draw. */
const CODES: Record<number, [WeatherKind, string, number]> = {
  0: ["clear", "Clear", 0], 1: ["clear", "Mainly clear", 0], 2: ["cloudy", "Partly cloudy", 0], 3: ["cloudy", "Overcast", 0],
  45: ["fog", "Fog", 0], 48: ["fog", "Freezing fog", 0],
  51: ["drizzle", "Light drizzle", 0.25], 53: ["drizzle", "Drizzle", 0.35], 55: ["drizzle", "Heavy drizzle", 0.45],
  56: ["drizzle", "Freezing drizzle", 0.3], 57: ["drizzle", "Freezing drizzle", 0.45],
  61: ["rain", "Light rain", 0.45], 63: ["rain", "Rain", 0.7], 65: ["rain", "Heavy rain", 1],
  66: ["rain", "Freezing rain", 0.5], 67: ["rain", "Freezing rain", 0.85],
  71: ["snow", "Light snow", 0.4], 73: ["snow", "Snow", 0.7], 75: ["snow", "Heavy snow", 1], 77: ["snow", "Snow grains", 0.3],
  80: ["rain", "Rain showers", 0.5], 81: ["rain", "Rain showers", 0.75], 82: ["rain", "Violent showers", 1],
  85: ["snow", "Snow showers", 0.6], 86: ["snow", "Heavy snow showers", 0.9],
  95: ["storm", "Thunderstorm", 0.8], 96: ["storm", "Thunderstorm, hail", 1], 99: ["storm", "Thunderstorm, hail", 1],
};

export async function fetchVancouverWeather(signal?: AbortSignal): Promise<LiveWeather> {
  const res = await fetch(ENDPOINT, { signal });
  if (!res.ok) throw new Error(`Weather service returned ${res.status}`);
  const { current: c } = await res.json() as { current: { temperature_2m: number; weather_code: number; cloud_cover: number; wind_speed_10m: number; is_day: number; time: string } };
  const [kind, label, intensity] = CODES[c.weather_code] ?? ["cloudy", "Unsettled", 0];
  return {
    kind, label, intensity,
    cloud: Math.max(kind === "clear" ? 0 : 0.3, Math.min(1, c.cloud_cover / 100)),
    wind: c.wind_speed_10m, tempC: c.temperature_2m, isDay: c.is_day === 1, updated: new Date(),
  };
}

// ------------------------------------------------------------------ effects

const RAIN_MAX = 4000, SNOW_MAX = 3000, R = 260, H = 220;

export class WeatherFx {
  group = new THREE.Group();
  private rain: THREE.LineSegments;
  private snow: THREE.Points;
  private drops: Float32Array;
  private flakes: Float32Array;
  private state: WeatherState | null = null;
  private nextBolt = 4;
  private bolt = -1;

  constructor() {
    const r = Math.random;
    this.drops = new Float32Array(RAIN_MAX * 6);
    for (let i = 0; i < RAIN_MAX; i++) {
      const x = (r() - 0.5) * R * 2, y = r() * H, z = (r() - 0.5) * R * 2;
      this.drops.set([x, y, z, x, y + 3, z], i * 6);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute("position", new THREE.BufferAttribute(this.drops, 3));
    this.rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: "#C8D4E8", transparent: true, opacity: 0.35, depthWrite: false }));
    this.rain.frustumCulled = false;

    this.flakes = new Float32Array(SNOW_MAX * 3);
    for (let i = 0; i < SNOW_MAX; i++) this.flakes.set([(r() - 0.5) * R * 2, r() * H, (r() - 0.5) * R * 2], i * 3);
    const sg = new THREE.BufferGeometry();
    sg.setAttribute("position", new THREE.BufferAttribute(this.flakes, 3));
    const dot = document.createElement("canvas"); dot.width = dot.height = 32;
    const g = dot.getContext("2d")!; const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)"); grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad; g.fillRect(0, 0, 32, 32);
    this.snow = new THREE.Points(sg, new THREE.PointsMaterial({ color: "#ffffff", size: 2.8, map: new THREE.CanvasTexture(dot), transparent: true, depthWrite: false }));
    this.snow.frustumCulled = false;

    this.group.add(this.rain, this.snow);
    this.set(null, false);
  }

  set(w: WeatherState | null, night: boolean) {
    this.state = w;
    const wet = w && (w.kind === "rain" || w.kind === "drizzle" || w.kind === "storm");
    this.rain.visible = !!wet;
    this.snow.visible = w?.kind === "snow";
    if (wet) {
      const n = Math.round(RAIN_MAX * Math.max(0.15, w!.intensity));
      this.rain.geometry.setDrawRange(0, n * 2);
      const m = this.rain.material as THREE.LineBasicMaterial;
      m.color.set(night ? "#8A96C8" : "#C8D4E8"); m.opacity = w!.kind === "drizzle" ? 0.22 : 0.38;
    }
    if (w?.kind === "snow") this.snow.geometry.setDrawRange(0, Math.round(SNOW_MAX * Math.max(0.2, w.intensity)));
  }

  /** Advance particles; returns the current lightning flash, 0–1. */
  update(dt: number, t: number, reduced: boolean): number {
    const w = this.state;
    if (!w || reduced) return 0;
    const slant = Math.min(1.2, w.wind / 40);
    if (this.rain.visible) {
      const d = this.drops, speed = w.kind === "drizzle" ? 60 : 110;
      for (let i = 0; i < RAIN_MAX * 6; i += 6) {
        let y = d[i + 1] - speed * dt * (0.8 + ((i / 6) % 7) * 0.05);
        let x = d[i] + slant * speed * 0.25 * dt;
        if (y < 0) { y += H; x = (Math.random() - 0.5) * R * 2; }
        if (x > R) x -= R * 2;
        d[i] = x; d[i + 1] = y; d[i + 3] = x - slant * 1.2; d[i + 4] = y + 3;
      }
      this.rain.geometry.attributes.position.needsUpdate = true;
    }
    if (this.snow.visible) {
      const f = this.flakes;
      for (let i = 0; i < SNOW_MAX * 3; i += 3) {
        let y = f[i + 1] - (6 + ((i / 3) % 5)) * dt;
        let x = f[i] + (Math.sin(t * 0.7 + i) * 2 + slant * 6) * dt;
        if (y < 0) { y += H; x = (Math.random() - 0.5) * R * 2; }
        if (x > R) x -= R * 2;
        f[i] = x; f[i + 1] = y; f[i + 2] += Math.cos(t * 0.5 + i) * dt;
      }
      this.snow.geometry.attributes.position.needsUpdate = true;
    }
    if (w.kind !== "storm") return 0;
    // Lightning: a double pulse every few seconds.
    this.nextBolt -= dt;
    if (this.nextBolt <= 0) { this.bolt = 0; this.nextBolt = 3 + Math.random() * 7; }
    if (this.bolt < 0) return 0;
    this.bolt += dt;
    const b = this.bolt;
    if (b > 0.45) { this.bolt = -1; return 0; }
    return b < 0.08 ? 1 : b < 0.16 ? 0.15 : b < 0.24 ? 0.8 : Math.max(0, 1 - (b - 0.24) / 0.2) * 0.5;
  }

  dispose() {
    this.rain.geometry.dispose(); (this.rain.material as THREE.Material).dispose();
    this.snow.geometry.dispose(); const sm = this.snow.material as THREE.PointsMaterial; sm.map?.dispose(); sm.dispose();
  }
}
