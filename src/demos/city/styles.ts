/** Visual themes for Ops City. Each one has a day and a night palette. */
export type Theme = "day" | "night";
export type CityStyle = "lowpoly" | "8bit" | "gummy" | "farm" | "medieval" | "industrial" | "space" | "cyberpunk" | "stoneage";

export interface Palette {
  skyTop: string; skyHorizon: string; skyBottom: string; sun: string;
  fog: string; fogNear: number; fogFar: number;
  hemiSky: string; hemiGround: string; hemi: number; sunColor: string; sunI: number; exposure: number;
  stars: boolean;
  ground: string; road: string; roadLine: string; outer: string; pad: string;
  wall: string[]; window: string; lit: number; roof: string; roofs: string[];
  rock: string; rockDark: string; snow: string; snowLine: number;
  leaf: string[]; trunk: string; cloud: string;
  candy: string[]; fields: string[]; smoke: string; carLight: number;
  /** Accent light colors: neon signs, window glow, hover pods. */
  neon: string[];
}

export interface StyleDef {
  id: CityStyle;
  name: string;
  blurb: string;
  /** Colors for the picker thumbnail. */
  swatch: string[];
  /** Render at 1/pixel resolution, upscaled with hard edges. */
  pixel?: number;
  /** Half-width of the built-up area (world units). */
  half: number;
  palette: Record<Theme, Palette>;
}

const base: Palette = {
  skyTop: "#5B8FD8", skyHorizon: "#F4D9C6", skyBottom: "#C9D6E8", sun: "#FFE9C2",
  fog: "#D9DEE8", fogNear: 260, fogFar: 980,
  hemiSky: "#CFE0FF", hemiGround: "#8C8070", hemi: 1.6, sunColor: "#FFF1DD", sunI: 2.6, exposure: 1,
  stars: false,
  ground: "#B9BFC9", road: "#7A808C", roadLine: "#F2F2F2", outer: "#A8B39A", pad: "#6E9A5E",
  wall: ["#E3E6EC", "#F3E9DC", "#DCE6F2", "#E8E2F0", "#D9E4DD", "#F0E0D6"], window: "#9FB5D4", lit: 0,
  roof: "#C4C9D2", roofs: ["#C4C9D2"],
  rock: "#7D8A9C", rockDark: "#5E6B7E", snow: "#F4F7FB", snowLine: 0.68,
  leaf: ["#4F7D4A", "#5E8F52"], trunk: "#5A4636", cloud: "#FFFFFF",
  candy: ["#FF8FB8", "#FFD36E", "#8FE3FF", "#B6F27A", "#C9A2FF"], fields: ["#8DB255"], smoke: "#9A9A9A", carLight: 0.4,
  neon: ["#FF4FD8", "#3FF0FF", "#FFD84F", "#9F7BFF"],
};

const night = (p: Partial<Palette>): Partial<Palette> => ({
  stars: true, sun: "#AEB8FF", sunColor: "#AAB4FF", sunI: 0.9, exposure: 1.15, carLight: 2.2, lit: 1.5, ...p,
});

const mk = (day: Partial<Palette>, nightP: Partial<Palette>) => {
  const d = { ...base, ...day };
  return { day: d, night: { ...d, ...night(nightP) } };
};

export const STYLES: Record<CityStyle, StyleDef> = {
  lowpoly: {
    id: "lowpoly", name: "Low poly", blurb: "Faceted towers, snowy peaks", half: 160,
    swatch: ["#5B8FD8", "#F4D9C6", "#7D8A9C", "#E3E6EC"],
    palette: mk({}, {
      skyTop: "#070B1E", skyHorizon: "#3A2A58", skyBottom: "#0D1226",
      fog: "#231F45", ground: "#1D2238", outer: "#161A2E", road: "#2C3247", roadLine: "#6C7494", pad: "#1F3326",
      wall: ["#48527E", "#4E5482", "#44507A", "#4C4E7C", "#465680", "#504E78"], window: "#1E2440", roof: "#2C3352",
      rock: "#3A4268", rockDark: "#262C4A", snow: "#A9B2D8",
      hemiSky: "#8C95E6", hemiGround: "#3A3050", hemi: 1.7, leaf: ["#1E3A2A", "#24402E"], cloud: "#3A3F66",
    }),
  },
  "8bit": {
    id: "8bit", name: "8 bit", blurb: "Chunky pixels, voxel mountains", half: 160, pixel: 4,
    swatch: ["#3C7BFF", "#7CCB5B", "#F5C26B", "#F08A5D"],
    palette: mk({
      skyTop: "#2F6BFF", skyHorizon: "#9FD8FF", skyBottom: "#7FB8FF", sun: "#FFF6B0", fog: "#A8D8FF", fogNear: 420, fogFar: 1500,
      ground: "#7CCB5B", road: "#5A5F72", roadLine: "#FFE45C", outer: "#5DAE45", pad: "#4FB347",
      wall: ["#ECECEC", "#F5C26B", "#F08A5D", "#B8DE6F", "#6FC2E8", "#C49CE8"], window: "#2B4A8C", roof: "#3A3A4A",
      rock: "#8A7660", rockDark: "#5E4E3E", snow: "#FFFFFF", snowLine: 0.62,
      leaf: ["#3FA34D", "#2E8B3A"], trunk: "#7A4A2A", hemi: 1.9, sunI: 2.2,
    }, {
      skyTop: "#0A0A2A", skyHorizon: "#2A1A5A", skyBottom: "#100A30", fog: "#1A1440",
      ground: "#1E3A2A", road: "#20222E", roadLine: "#AA9930", outer: "#14281E", pad: "#1A3A22",
      wall: ["#4A4E6E", "#6A5A4A", "#6A4A44", "#4E5E44", "#3E5A6E", "#5A4A6E"], window: "#141830", lit: 1.8,
      rock: "#3A3448", rockDark: "#26222E", snow: "#9AA0C8", leaf: ["#1E4A28", "#18402A"], hemiSky: "#6A70C8", hemi: 1.4, cloud: "#3A3A6A",
    }),
  },
  gummy: {
    id: "gummy", name: "Shaded gummy", blurb: "Glossy candy, gumdrop hills", half: 160,
    swatch: ["#FF8FB8", "#8FE3FF", "#FFD36E", "#B6F27A"],
    palette: mk({
      skyTop: "#8EC5FF", skyHorizon: "#FFD6EC", skyBottom: "#FFE8F4", sun: "#FFFFFF", fog: "#FFE0F0",
      ground: "#BDF2D5", road: "#FF9EC4", roadLine: "#FFFFFF", outer: "#C8F5DC", pad: "#9FEFC0",
      wall: ["#FF8FB8", "#FFD36E", "#8FE3FF", "#B6F27A", "#C9A2FF", "#FF9F7A", "#7FF0D0"], window: "#FFFFFF", roof: "#FFFFFF",
      candy: ["#FF6FA5", "#8FE870", "#FFC94D", "#7FCBFF", "#B98CFF", "#FF8F6B"],
      leaf: ["#FF6FA5", "#FFC94D", "#7FCBFF", "#B98CFF"], trunk: "#FFFFFF", cloud: "#FFF4FA",
      hemiSky: "#FFFFFF", hemiGround: "#FFC4DE", hemi: 1.5, sunI: 2.2, carLight: 0.2,
    }, {
      skyTop: "#1B0E3A", skyHorizon: "#6A2A7A", skyBottom: "#2A1446", fog: "#2E1650",
      ground: "#2E5A4A", road: "#7A2E5A", roadLine: "#E8A8C8", outer: "#25483C", pad: "#2E6A4A",
      wall: ["#B84A7A", "#B8963E", "#4A96B8", "#7AA84A", "#8A64C0", "#B8644A", "#3EA88E"], window: "#2A1840", lit: 1.6,
      candy: ["#A8406E", "#5AA048", "#B8862E", "#4A84B0", "#7A58B0", "#B05A40"],
      hemiSky: "#C08AFF", hemiGround: "#5A2A5A", hemi: 1.5, cloud: "#6A4A8A",
    }),
  },
  farm: {
    id: "farm", name: "Farm", blurb: "Barns, silos, windmills, fields", half: 160,
    swatch: ["#C9B458", "#8DB255", "#B33A2E", "#6FA8E8"],
    palette: mk({
      skyTop: "#5E9BE6", skyHorizon: "#F6E7C8", skyBottom: "#DDE6EE", sun: "#FFF2C8", fog: "#E6E2D0",
      ground: "#7FA650", road: "#B89A6A", roadLine: "#A08458", outer: "#86A85A", pad: "#6E9A4A",
      wall: ["#B33A2E", "#A8402F", "#F2EEE4", "#C24A32"], window: "#3A3028", roof: "#6E747C", roofs: ["#6E747C", "#7A4A36", "#5A5F66"],
      rock: "#7F8F7A", rockDark: "#5F6F5A", snow: "#F2F4F0", snowLine: 0.82,
      fields: ["#C9B458", "#8DB255", "#6E9A44", "#A0784A", "#D8C878", "#7FA650", "#B8A040"],
      leaf: ["#4E8A3A", "#5F9A44", "#3F7A30"], trunk: "#5A4030", hemi: 1.7,
    }, {
      skyTop: "#081226", skyHorizon: "#2A3A5A", skyBottom: "#0E1626", fog: "#1A2234",
      ground: "#1E2A1A", road: "#3A3226", roadLine: "#2E281E", outer: "#18221A", pad: "#1A2A18",
      wall: ["#5A2420", "#542622", "#6A6A70", "#602A22"], window: "#141210", lit: 1.4, roof: "#2E3238", roofs: ["#2E3238", "#3A2620", "#2A2E32"],
      rock: "#2A3440", rockDark: "#1E2630", snow: "#8A96AE",
      fields: ["#3A3620", "#26341C", "#22301A", "#32281C", "#3E3A26", "#283420", "#3A3420"],
      leaf: ["#1A2E18", "#1E3420", "#162A14"], hemiSky: "#6A7AB8", hemi: 1.3, cloud: "#3A4258",
    }),
  },
  medieval: {
    id: "medieval", name: "Medieval", blurb: "Stone keeps, city walls, banners", half: 120,
    swatch: ["#D9CDB4", "#9C3B2A", "#2F5A33", "#7FA6D8"],
    palette: mk({
      skyTop: "#6E9AD6", skyHorizon: "#F2D8B0", skyBottom: "#D8DCE0", sun: "#FFE6B8", fog: "#D8D2C4",
      ground: "#7FA05A", road: "#9A8A72", roadLine: "#857660", outer: "#6F944E", pad: "#6F944E",
      wall: ["#D9CDB4", "#E6DCC6", "#BFB39B", "#CFC2A8", "#DDD3BE"], window: "#2A2420", roof: "#8A8070",
      roofs: ["#9C3B2A", "#7A4A2E", "#4F5560", "#A8582F", "#8A3A2A"],
      leaf: ["#2F5A33", "#3D6B3A", "#2A4E2E"], trunk: "#4A3A2A",
    }, {
      skyTop: "#060A1A", skyHorizon: "#2A2440", skyBottom: "#0E1020", fog: "#1C1A2A",
      roadLine: "#26221E",
      wall: ["#7A7266", "#857C6E", "#6E675C", "#7A7064", "#80786A"], window: "#120E0C", lit: 1.7, roof: "#3A342E",
      roofs: ["#4A2018", "#3A2618", "#2A2E34", "#4A2A1A", "#40201A"],
      rock: "#3A4062", rockDark: "#282C44", snow: "#A4ACCE", leaf: ["#1E3A24", "#24402A", "#1A3420"], hemiSky: "#8A90D8", hemiGround: "#3A3248", hemi: 2, cloud: "#363A54",
      ground: "#26321E", outer: "#1E2A1E", pad: "#22301E", road: "#3A342C",
    }),
  },
  industrial: {
    id: "industrial", name: "Industrial", blurb: "Brick factories, stacks, smog", half: 160,
    swatch: ["#8C4A36", "#4A4C50", "#E8C030", "#BDB3A0"],
    palette: mk({
      skyTop: "#8A9AAA", skyHorizon: "#D8C8A8", skyBottom: "#C8C0B0", sun: "#FFE0B0", fog: "#BDB3A0", fogNear: 180, fogFar: 820,
      ground: "#9C9A94", road: "#4A4C50", roadLine: "#E8C030", outer: "#7A7666", pad: "#6A7A4A",
      wall: ["#8C4A36", "#9A5A44", "#7A6A5A", "#6A7078", "#8A8070", "#A0624A"], window: "#2A3038", roof: "#5A5E64",
      roofs: ["#5A5E64", "#6A6058", "#4E5258"],
      rock: "#6E665C", rockDark: "#4E4840", snow: "#C8C4BC", snowLine: 0.8,
      leaf: ["#6B7A4A", "#5E6A44"], trunk: "#4A4036", cloud: "#B8B0A4", smoke: "#8C8A86",
      hemiSky: "#E0D8C8", hemiGround: "#6A6050", sunI: 2.2,
    }, {
      skyTop: "#100C10", skyHorizon: "#5A3A2A", skyBottom: "#1A1414", fog: "#2A2020", fogNear: 160, fogFar: 760,
      ground: "#26241F", road: "#1A1A1C", roadLine: "#8A7020", outer: "#1E1C18", pad: "#1E2418",
      wall: ["#4A2A22", "#523428", "#3E3832", "#363A40", "#46423A", "#563A2C"], window: "#141210", lit: 1.6,
      sun: "#FFB070", sunColor: "#FFB880", hemiSky: "#C08A6A", hemiGround: "#3A2A20", hemi: 1.3,
      rock: "#3A2E2A", rockDark: "#26201C", snow: "#7A6A64", leaf: ["#22281A", "#1E2418"], cloud: "#4A3A34", smoke: "#4A4442",
    }),
  },
  space: {
    id: "space", name: "Space city", blurb: "Domed habitats, a ringed planet", half: 150,
    swatch: ["#05060F", "#7FD8FF", "#C8CED8", "#E8B070"],
    palette: mk({
      skyTop: "#020308", skyHorizon: "#141A36", skyBottom: "#04050C", sun: "#FFF4E0", fog: "#0A0E1E", fogNear: 420, fogFar: 1500,
      hemiSky: "#DCE4F4", hemiGround: "#5A5650", hemi: 1.7, sunColor: "#FFF6EA", sunI: 3, exposure: 1.05, stars: true,
      ground: "#8A8E96", road: "#4A4E58", roadLine: "#7FD8FF", outer: "#6E6A68", pad: "#5A6070",
      wall: ["#E6EAF0", "#D8DEE8", "#F2F4F8", "#CDD4DE", "#E0E4EA"], window: "#1A2440", lit: 1.2, roof: "#B8C0CC", roofs: ["#B8C0CC"],
      rock: "#8A8480", rockDark: "#5A5652", snow: "#C8C4C0", snowLine: 0.92,
      leaf: ["#3AA87A", "#4AC08A"], trunk: "#6A6E78", cloud: "#2A3050", carLight: 1.6,
      neon: ["#7FD8FF", "#9FFFE0", "#FFD08A", "#B8A0FF"],
    }, {
      skyTop: "#010104", skyHorizon: "#0A0E24", skyBottom: "#020308", fog: "#05070F", sunI: 1.1, exposure: 1.2,
      ground: "#2E323C", road: "#1C1E26", outer: "#24221F", pad: "#20242E",
      wall: ["#5A6070", "#525A6A", "#626878", "#4E5666", "#5C6272"], window: "#0A1020", lit: 2,
      rock: "#3A3634", rockDark: "#26231F", snow: "#5A5652", hemiSky: "#6A7AC8", hemi: 1.1, carLight: 3,
    }),
  },
  cyberpunk: {
    id: "cyberpunk", name: "Cyberpunk", blurb: "Neon megatowers, rain, flying cars", half: 150,
    swatch: ["#0B0618", "#FF4FD8", "#3FF0FF", "#FFD84F"],
    palette: mk({
      skyTop: "#2A1A4A", skyHorizon: "#C86A9A", skyBottom: "#3A2A5A", sun: "#FFB0D8", fog: "#5A3A6A", fogNear: 160, fogFar: 1050,
      hemiSky: "#C8A0FF", hemiGround: "#3A2040", hemi: 1.4, sunColor: "#FFD0E8", sunI: 1.6,
      ground: "#3A3848", road: "#22202C", roadLine: "#3FF0FF", outer: "#2A2834", pad: "#2A3A3A",
      wall: ["#3A3A4E", "#44425A", "#363648", "#4A4458", "#3E4054"], window: "#14121E", lit: 1.2, roof: "#2A2A36", roofs: ["#2A2A36"],
      rock: "#2A2838", rockDark: "#1E1C28", snow: "#4A4658", snowLine: 1,
      leaf: ["#2A6A5A", "#3A7A6A"], trunk: "#2A2A30", cloud: "#6A4A7A", smoke: "#5A4A6A", carLight: 2,
    }, {
      skyTop: "#05020E", skyHorizon: "#4A1A5A", skyBottom: "#0A0618", fog: "#1E0E2E", fogNear: 150, fogFar: 1000,
      sun: "#FF6AD8", sunColor: "#A080FF", sunI: 0.7, stars: false, hemiSky: "#8A50C8", hemiGround: "#2A1030", hemi: 1.2, exposure: 1.25,
      ground: "#14121C", road: "#0A0A10", outer: "#100E16", pad: "#10201E",
      wall: ["#1A1A26", "#1E1C2A", "#161622", "#221E2C", "#1A1C28"], window: "#08080E", lit: 1.7,
      leaf: ["#123A30", "#1A4A3A"], cloud: "#3A1E4A", carLight: 3.2,
    }),
  },
  stoneage: {
    id: "stoneage", name: "Stone age", blurb: "Huts, fire pits, deep forest", half: 110,
    swatch: ["#6E5034", "#C8A050", "#3F6A34", "#FF8A2A"],
    palette: mk({
      skyTop: "#6AA0D8", skyHorizon: "#F2DCB0", skyBottom: "#D8DCD0", sun: "#FFE8B8", fog: "#C8D0B8", fogNear: 200, fogFar: 900,
      ground: "#6E9048", road: "#A08860", roadLine: "#A08860", outer: "#5E8040", pad: "#5E8040",
      wall: ["#9A7A58", "#8A6A4A", "#A88A64", "#7E6448"], window: "#2A1E14", lit: 1, roof: "#C8A050", roofs: ["#C8A050", "#B89040", "#D2AE60"],
      rock: "#7A7468", rockDark: "#5A564C", snow: "#EEF0EC", snowLine: 0.78,
      leaf: ["#2E5A2A", "#3A6A30", "#284E26", "#4A7434"], trunk: "#4A3424", smoke: "#B0AAA0", hemi: 1.6,
    }, {
      skyTop: "#050A16", skyHorizon: "#2A2A3A", skyBottom: "#0A0E16", fog: "#141A1E",
      ground: "#2A3A1E", road: "#3E3424", roadLine: "#3E3424", outer: "#22301A", pad: "#22301A",
      wall: ["#4A3A2A", "#423224", "#524030", "#3E3022"], window: "#0E0A06", lit: 1.8, roof: "#5A4A26", roofs: ["#5A4A26", "#4E4020", "#62522C"],
      rock: "#2E3238", rockDark: "#1E2026", snow: "#8A92A6", leaf: ["#1A3420", "#203E22", "#18301A", "#284626"],
      hemiSky: "#8A9AD8", hemiGround: "#4A3A2A", hemi: 2.2, exposure: 1.3, smoke: "#5A5854", carLight: 0,
    }),
  },
};

export const STYLE_LIST = Object.values(STYLES);
