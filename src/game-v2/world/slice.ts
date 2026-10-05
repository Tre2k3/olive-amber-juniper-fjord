import * as THREE from "three";
import type { Solid } from "../core/types";
import { characters, frameSize, type Facing, type Spawnable } from "../assets/characters";
import { carBody, resetVehicleCards } from "./kits/vehicles";
import { residence } from "./kits/residence";
import { sidewalkRun } from "./kits/street";
import { grass as grassMatKit } from "./kits/materials";
import { matureTree, palmTree, shadeTree, shrub as kitShrub, streetTree } from "./kits/trees";
import { bench, planter, streetlight, trashBin } from "./kits/props";

export { carBody };

export type VehicleKind = "coupe" | "sedan" | "suv" | "van";

export type Board = {
  x: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  nx: number;
};

export type SliceWorld = {
  scene: THREE.Scene;
  solids: Record<"street" | "home" | "hq", Solid[]>;
  exterior: THREE.Group;
  home: THREE.Group;
  hq: THREE.Group;
  courtGate: { x: number; z: number };
  homeDoor: { x: number; z: number };
  hqDoor: { x: number; z: number };
  homeIn: { x: number; z: number };
  hqIn: { x: number; z: number };
  homeOut: { x: number; z: number };
  hqOut: { x: number; z: number };
  hoop: { x: number; z: number; y: number };
  hoops: { x: number; z: number; y: number }[];
  backboards: Board[];
  courtOg: { x: number; z: number };
  wardrobe: { x: number; z: number };
  kAnchor: { x: number; z: number };
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  lamps: THREE.PointLight[];
  courtLights: THREE.PointLight[];
  homeLights: THREE.PointLight[];
  hqLights: THREE.PointLight[];
  pedestrians: THREE.Group[];
  billboards: THREE.Object3D[];
  kSprite: THREE.Object3D;
  headlightMats: THREE.MeshStandardMaterial[];
  glowMats: THREE.MeshStandardMaterial[];
  skyDay: THREE.Texture;
  skyNight: THREE.Texture;
  counterPack: THREE.Object3D;
  figureMats: THREE.MeshBasicMaterial[];
};

const trimMat = new THREE.MeshStandardMaterial({ color: 0xf3efe6, roughness: 0.55 });
const gold = new THREE.MeshStandardMaterial({ color: 0xe0b33a, roughness: 0.35, metalness: 0.72, emissive: 0x5a3e08, emissiveIntensity: 0.2 });
const chrome = new THREE.MeshStandardMaterial({ color: 0xd5d8dc, roughness: 0.22, metalness: 0.92 });
const black = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 });
const glassMat = new THREE.MeshStandardMaterial({ color: 0x17324a, roughness: 0.06, metalness: 0.35, transparent: true, opacity: 0.72 });
const wood = new THREE.MeshStandardMaterial({ color: 0x8a623d, roughness: 0.75 });
const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a4030, roughness: 0.9 });
const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6a34, roughness: 0.95 });
const leafMat2 = new THREE.MeshStandardMaterial({ color: 0x3d7a38, roughness: 0.95 });
const concrete = new THREE.MeshStandardMaterial({ color: 0xb7b2a8, roughness: 0.92 });
const curbMat = new THREE.MeshStandardMaterial({ color: 0x8e8a82, roughness: 0.9 });

function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
}

function canvasTex(draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, w: number, h: number, repeat = false) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  draw(g, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
  }
  return tex;
}

function skyTex(night: boolean) {
  return canvasTex((g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h);
    if (night) {
      grd.addColorStop(0, "#070b16");
      grd.addColorStop(0.55, "#141a30");
      grd.addColorStop(1, "#2a241c");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#f4efe4";
      for (let i = 0; i < 80; i++) g.fillRect((i * 97) % w, (i * 53) % (h * 0.7), i % 5 === 0 ? 2 : 1, 1);
    } else {
      grd.addColorStop(0, "#3e86c8");
      grd.addColorStop(0.45, "#8ec4ee");
      grd.addColorStop(0.82, "#d5e7f4");
      grd.addColorStop(1, "#e7efe4");
      g.fillStyle = grd;
      g.fillRect(0, 0, w, h);
      const haze = g.createLinearGradient(0, h * 0.62, 0, h);
      haze.addColorStop(0, "rgba(255,255,255,0)");
      haze.addColorStop(1, "rgba(232,236,228,0.55)");
      g.fillStyle = haze;
      g.fillRect(0, 0, w, h);
    }
  }, 1024, 512);
}

function grassMat() {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = "#3f7a3a";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {
      const n = (i * 17) % 28;
      g.fillStyle = i % 4 === 0 ? "#2d5e2c" : i % 4 === 1 ? "#4e8c44" : "#3a7036";
      g.fillRect((i * 53) % w, (i * 29) % h, 2, 2 + (n % 3));
    }
  }, 256, 256, true);
  tex.repeat.set(22, 16);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 1 });
}

function asphaltTex() {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = "#34383e";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 9000; i++) {
      const shade = 36 + ((i * 13) % 28);
      g.fillStyle = `rgb(${shade},${shade + 2},${shade + 5})`;
      g.fillRect((i * 73) % w, (i * 41) % h, i % 5 === 0 ? 4 : 2, 2);
    }
    g.fillStyle = "rgba(62, 66, 72, 0.7)";
    g.beginPath();
    g.ellipse(150, 180, 90, 36, 0.2, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(22, 24, 28, 0.55)";
    g.fillRect(280, 70, 120, 48);
    g.fillRect(40, 300, 80, 34);
    g.strokeStyle = "rgba(18, 18, 20, 0.65)";
    g.lineWidth = 2;
    g.beginPath();
    g.moveTo(30, 240);
    g.lineTo(110, 220);
    g.lineTo(150, 260);
    g.lineTo(190, 250);
    g.stroke();
  }, 512, 512, true);
  tex.repeat.set(7, 2.4);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.93, metalness: 0.05 });
}

function sidewalkMat() {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = "#b7b2a6";
    g.fillRect(0, 0, w, h);
    const s = 64;
    for (let y = 0; y < h; y += s) {
      for (let x = 0; x < w; x += s) {
        const n = ((x * 3 + y * 5) % 16) - 7;
        g.fillStyle = `rgb(${186 + n},${181 + n},${170 + n})`;
        g.fillRect(x + 2, y + 2, s - 5, s - 5);
        if ((x + y) % 128 === 0) {
          g.fillStyle = "rgba(90, 80, 70, 0.18)";
          g.fillRect(x + 8, y + 10, 18, 10);
        }
      }
    }
  }, 256, 256, true);
  tex.repeat.set(16, 3);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.94 });
}

const figureMats: THREE.MeshBasicMaterial[] = [];

function paintLabel(g: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, color: string, start: number) {
  let size = start;
  g.textAlign = "center";
  g.textBaseline = "middle";
  do {
    g.font = `700 ${size}px sans-serif`;
    size -= 2;
  } while (g.measureText(text).width > maxW && size > 18);
  g.fillStyle = color;
  g.fillText(text, x, y);
}

function sign(title: string, sub: string, w: number, h: number) {
  const tex = canvasTex((g, W, H) => {
    g.fillStyle = "#121212";
    g.fillRect(0, 0, W, H);
    paintLabel(g, title, W / 2, H * 0.38, W * 0.9, "#e0b33a", 110);
    paintLabel(g, sub, W / 2, H * 0.72, W * 0.8, "#f4efe4", 56);
  }, 1024, 512);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55, emissive: 0xffe0b0, emissiveMap: tex, emissiveIntensity: 0.25 });
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  return { plane, mat };
}

function actor(url: string, w: number, h: number, x: number, z: number, parent: THREE.Object3D) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.38, 14),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.38, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.035;
  g.add(shadow);
  const mat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.18, side: THREE.DoubleSide });
  figureMats.push(mat);
  const sprite = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  sprite.name = "sprite";
  sprite.position.y = h / 2;
  sprite.castShadow = true;
  g.add(sprite);
  parent.add(g);
  new THREE.TextureLoader().load(url, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    mat.map = tex;
    mat.needsUpdate = true;
  });
  return g;
}

function spawn(asset: Spawnable, x: number, z: number, parent: THREE.Object3D) {
  const size = frameSize(asset);
  const g = actor(size.src, size.w, size.h, x, z, parent);
  g.userData.asset = asset;
  g.userData.views = asset.views;
  g.userData.heading = Math.PI;
  const tex: Partial<Record<Facing, THREE.Texture>> = {};
  g.userData.tex = tex;
  for (const face of ["front", "back", "left", "right"] as const) {
    const view = asset.views[face];
    if (!view) continue;
    new THREE.TextureLoader().load(view.src, (map) => {
      map.colorSpace = THREE.SRGBColorSpace;
      tex[face] = map;
    });
  }
  return g;
}

function shrub(x: number, z: number, parent: THREE.Object3D, s = 1) {
  kitShrub(x, z, parent, s);
}

function tree(x: number, z: number, parent: THREE.Object3D, scale = 1) {
  if (scale > 1.2) matureTree(x, z, parent);
  else if (Math.abs(Math.round(x)) % 2 === 0) shadeTree(x, z, parent, scale);
  else streetTree(x, z, parent, scale);
}

function palm(x: number, z: number, parent: THREE.Object3D) {
  palmTree(x, z, parent);
}

function lamp(x: number, z: number, parent: THREE.Object3D, lights: THREE.PointLight[]) {
  streetlight(x, z, parent, lights);
}

function gable(width: number, depth: number, rise: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, 0);
  shape.lineTo(width / 2, 0);
  shape.lineTo(0, rise);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

function shingleMat(color: number) {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = `#${color.toString(16).padStart(6, "0")}`;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,0.28)";
    g.lineWidth = 2;
    for (let row = 0; row < 8; row++) {
      const y = row * (h / 8);
      const off = row % 2 ? 16 : 0;
      for (let x = -20 + off; x < w; x += 32) g.strokeRect(x, y + 2, 30, h / 8 - 3);
    }
  }, 128, 128, true);
  tex.repeat.set(2, 2);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.88 });
}

function sidingMat(color: string) {
  const tex = canvasTex((g, w, h) => {
    g.fillStyle = color;
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(0,0,0,0.07)";
    g.lineWidth = 2;
    for (let y = 0; y < h; y += 10) {
      g.beginPath();
      g.moveTo(0, y);
      g.lineTo(w, y);
      g.stroke();
    }
  }, 128, 256);
  return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.84 });
}

function windowUnit(parent: THREE.Object3D, glow: THREE.MeshStandardMaterial[], x: number, y: number, z: number, yaw: number) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = yaw;
  const frame = box(1.05, 1.28, 0.1, 0, 0, 0, trimMat, g);
  frame.castShadow = true;
  const glass = new THREE.MeshStandardMaterial({
    color: 0x9fd0ea,
    roughness: 0.08,
    metalness: 0.15,
    transparent: true,
    opacity: 0.72,
    emissive: 0xffb15a,
    emissiveIntensity: 0.08,
  });
  glow.push(glass);
  box(0.86, 1.08, 0.04, 0, 0, 0.05, glass, g);
  box(0.04, 1.08, 0.05, 0, 0, 0.07, trimMat, g);
  box(0.86, 0.04, 0.05, 0, 0, 0.07, trimMat, g);
  box(1.15, 0.08, 0.16, 0, -0.68, 0.02, trimMat, g);
  parent.add(g);
}

function carSolid(x: number, z: number, yaw: number, length: number, width: number): Solid {
  const alongZ = Math.abs(Math.cos(yaw)) > 0.5;
  const hx = (alongZ ? width : length) / 2;
  const hz = (alongZ ? length : width) / 2;
  return { minX: x - hx, maxX: x + hx, minZ: z - hz, maxZ: z + hz };
}

export function parkedCar(x: number, z: number, yaw: number, kind: VehicleKind, parent: THREE.Object3D) {
  const car = carBody(kind);
  car.position.set(x, 0, z);
  car.rotation.y = yaw;
  parent.add(car);
  return car;
}

function collectLights(root: THREE.Object3D, into: THREE.MeshStandardMaterial[]) {
  root.traverse((obj) => {
    const mats = obj.userData.headlights as THREE.MeshStandardMaterial[] | undefined;
    if (mats) into.push(...mats);
  });
}

function courtTexture() {
  return canvasTex((g, w, h) => {
    g.fillStyle = "#1a4c86";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#f4efe4";
    g.lineWidth = 10;
    g.strokeRect(24, 24, w - 48, h - 48);
    g.beginPath();
    g.moveTo(w / 2, 24);
    g.lineTo(w / 2, h - 24);
    g.stroke();
    g.beginPath();
    g.arc(w / 2, h / 2, 70, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = "#8e2a2a";
    g.fillRect(24, h * 0.28, 150, h * 0.44);
    g.fillRect(w - 174, h * 0.28, 150, h * 0.44);
    g.strokeRect(24, h * 0.28, 150, h * 0.44);
    g.strokeRect(w - 174, h * 0.28, 150, h * 0.44);
    g.fillStyle = "#f4efe4";
    g.font = "700 92px sans-serif";
    g.textAlign = "center";
    g.fillText("901", w / 2, h / 2 + 10);
    g.font = "600 28px sans-serif";
    g.fillText("MEMPHIS", w / 2, h / 2 + 48);
  }, 1024, 640);
}

function muralTexture() {
  return canvasTex((g, w, h) => {
    g.fillStyle = "#16324f";
    g.fillRect(0, 0, w, h);
    g.fillStyle = "#e0b33a";
    g.font = "800 180px sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("901", w / 2, h * 0.42);
    g.fillStyle = "#f4efe4";
    g.font = "700 54px sans-serif";
    g.fillText("MEMPHIS", w / 2, h * 0.72);
  }, 1024, 512);
}

function hoopRig(rimX: number, z: number, dir: 1 | -1, parent: THREE.Object3D) {
  const boardX = rimX - dir * 0.48;
  box(0.12, 3.3, 0.12, boardX - dir * 0.2, 1.65, z, black, parent);
  const board = new THREE.MeshStandardMaterial({ color: 0xf7f7f7, roughness: 0.35 });
  box(0.08, 1.05, 1.7, boardX, 3.15, z, board, parent);
  box(0.02, 0.42, 0.55, boardX + dir * 0.05, 2.95, z, new THREE.MeshStandardMaterial({ color: 0xb43322, roughness: 0.4 }), parent);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 18), gold);
  rim.position.set(rimX, 2.72, z);
  rim.rotation.y = Math.PI / 2;
  rim.castShadow = true;
  parent.add(rim);
  const net = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.42, 8, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xf4efe4, transparent: true, opacity: 0.4, side: THREE.DoubleSide, roughness: 1 }),
  );
  net.rotation.x = Math.PI;
  net.position.set(rimX, 2.46, z);
  parent.add(net);
  return {
    hoop: { x: rimX, z, y: 2.72 },
    board: { x: boardX, minY: 2.6, maxY: 3.7, minZ: z - 0.85, maxZ: z + 0.85, nx: dir },
  };
}

function chainMat() {
  const tex = canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.strokeStyle = "rgba(214,220,226,0.95)";
    g.lineWidth = 2;
    const step = 16;
    for (let i = -h; i < w + h; i += step) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i - h, h);
      g.stroke();
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i + h, h);
      g.stroke();
    }
  }, 128, 256, true);
  tex.repeat.set(8, 1.2);
  return new THREE.MeshStandardMaterial({
    map: tex,
    transparent: true,
    alphaTest: 0.12,
    side: THREE.DoubleSide,
    roughness: 0.42,
    metalness: 0.62,
    color: 0xd7dee6,
  });
}

function signal(x: number, z: number, parent: THREE.Object3D) {
  box(0.1, 3.6, 0.1, x, 1.8, z, black, parent);
  box(0.28, 0.72, 0.28, x, 3.5, z, black, parent);
  const green = new THREE.MeshStandardMaterial({ color: 0x39ff14, emissive: 0x39ff14, emissiveIntensity: 0.8 });
  mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0x661111, emissive: 0x330000, emissiveIntensity: 0.2 }), x, 3.72, z + 0.15, parent);
  mesh(new THREE.SphereGeometry(0.07, 8, 8), new THREE.MeshStandardMaterial({ color: 0x887722, emissive: 0x443300, emissiveIntensity: 0.15 }), x, 3.5, z + 0.15, parent);
  mesh(new THREE.SphereGeometry(0.07, 8, 8), green, x, 3.28, z + 0.15, parent);
}

export function buildSlice(): SliceWorld {
  figureMats.length = 0;
  resetVehicleCards();
  const scene = new THREE.Scene();
  const skyDay = skyTex(false);
  const skyNight = skyTex(true);
  scene.background = skyDay;
  scene.fog = new THREE.Fog(0xd7e6f2, 42, 130);

  const exterior = new THREE.Group();
  const home = new THREE.Group();
  const hq = new THREE.Group();
  home.visible = false;
  hq.visible = false;
  scene.add(exterior, home, hq);

  const sun = new THREE.DirectionalLight(0xfff1d6, 5.5);
  sun.position.set(-22, 32, 14);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 110;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 80;
  sun.shadow.camera.top = 50;
  sun.shadow.camera.bottom = -50;
  scene.add(sun);
  const hemi = new THREE.HemisphereLight(0xc5e4ff, 0x6a8f55, 2.15);
  scene.add(hemi);

  const streetSolids: Solid[] = [];
  const homeSolids: Solid[] = [];
  const hqSolids: Solid[] = [];
  const glowMats: THREE.MeshStandardMaterial[] = [];
  const headlightMats: THREE.MeshStandardMaterial[] = [];
  const asphalt = asphaltTex();

  mesh(new THREE.PlaneGeometry(200, 160), grassMatKit(), 8, 0, -6, exterior).rotation.x = -Math.PI / 2;
  mesh(new THREE.PlaneGeometry(46, 16), new THREE.MeshStandardMaterial({ color: 0x2f552c, roughness: 1 }), -28, 0.004, 16, exterior).rotation.x = -Math.PI / 2;

  const walk = sidewalkMat();
  box(156, 0.06, 9.1, 8, 0.03, 0, asphalt, exterior);
  box(9.1, 0.06, 48, 8, 0.03, -2, asphalt, exterior);
  sidewalkRun(exterior, 6.35, -62, 78, [[-38.2, -32.4], [-18.6, -14.2]]);
  sidewalkRun(exterior, -6.35, -62, 78, [[31.2, 36.4]]);
  box(0.34, 0.22, 40, 4.55, 0.11, -2, curbMat, exterior);
  box(0.34, 0.22, 40, 11.45, 0.11, -2, curbMat, exterior);
  for (let x = -46; x < 68; x += 16) {
    box(0.7, 0.02, 0.45, x, 0.08, 4.15, black, exterior);
    box(0.7, 0.02, 0.45, x + 8, 0.08, -4.15, black, exterior);
  }

  const yellow = new THREE.MeshStandardMaterial({ color: 0xe6c15a, roughness: 0.55 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.7 });
  for (let x = -48; x < 70; x += 4.2) {
    if (x > 2 && x < 14) continue;
    box(1.7, 0.02, 0.12, x, 0.07, 0, yellow, exterior);
  }
  for (let x = -40; x < 70; x += 6) {
    box(2.4, 0.015, 0.08, x, 0.07, 4.15, white, exterior);
    box(2.4, 0.015, 0.08, x, 0.07, -4.15, white, exterior);
  }
  for (let i = 0; i < 8; i++) {
    box(0.16, 0.02, 0.85, 3.4, 0.08, -3.2 + i * 0.9, white, exterior);
    box(0.16, 0.02, 0.85, 12.6, 0.08, -3.2 + i * 0.9, white, exterior);
    box(0.85, 0.02, 0.16, 4.4 + i * 0.9, 0.08, 3.5, white, exterior);
    box(0.85, 0.02, 0.16, 4.4 + i * 0.9, 0.08, -3.5, white, exterior);
  }
  box(0.28, 0.02, 2.4, 2.6, 0.08, -1.25, white, exterior);
  box(0.28, 0.02, 2.4, 13.4, 0.08, 1.25, white, exterior);

  const lamps: THREE.PointLight[] = [];
  for (const x of [-42, -24, -8, 14, 36, 56]) lamp(x, 7.45, exterior, lamps);
  for (const x of [-36, -16, 2, 16, 34, 50]) lamp(x, -8.85, exterior, lamps);
  signal(2.4, 7.2, exterior);
  signal(13.6, -7.2, exterior);

  for (const x of [-46, -38, -24, -14, 16, 34, 46, 62]) tree(x, 11.2, exterior, x % 2 === 0 ? 1 : 1.15);
  for (const x of [-44, -18, 18, 40, 58]) tree(x, -10.5, exterior, 1.2);
  palm(14, -9.2, exterior);
  palm(33, -9.4, exterior);
  palm(-6, 12.4, exterior);
  for (let x = -60; x <= 78; x += 7) tree(x, 26, exterior, 1.35);
  for (let x = -54; x <= 72; x += 9) tree(x + 3, -22, exterior, 1.2);

  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6 });
  const wireMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.8 });
  const poleXs = [-44, -20, 2, 28, 52];
  for (let i = 0; i < poleXs.length; i++) {
    const x = poleXs[i]!;
    box(0.12, 6.2, 0.12, x, 3.1, 8.6, poleMat, exterior);
    box(1.2, 0.08, 0.08, x, 6.1, 8.6, poleMat, exterior);
    if (i < poleXs.length - 1) {
      const x2 = poleXs[i + 1]!;
      const len = x2 - x;
      const wire = box(len, 0.03, 0.03, (x + x2) / 2, 6.05, 8.6, wireMat, exterior);
      wire.castShadow = false;
    }
  }

  const ped = characters.pedestrian;
  const walkers = [
    spawn(ped.male01, -16.4, 6.35, exterior),
    spawn(ped.female01, -14.15, 6.42, exterior),
    spawn(ped.male02, -11.9, 6.3, exterior),
    spawn(ped.female02, -9.65, 6.45, exterior),
    spawn(ped.male03, -7.4, 6.32, exterior),
    spawn(ped.female03, -5.15, 6.4, exterior),
  ];
  const shopper = spawn(ped.male04, 16.4, 6.35, exterior);
  const porch = spawn(characters.mamaDee, -22.4, 6.55, exterior);
  const hqIdle = spawn(characters.nitro, 58.5, 6.4, exterior);
  const unc = spawn(characters.uncJ, 40.5, -6.35, exterior);
  const strike = spawn(characters.strike, 24.2, -6.3, exterior);
  for (const person of [...walkers, shopper, porch, hqIdle, unc, strike]) person.userData.idle = true;
  const pedestrians = [...walkers, shopper, porch, hqIdle, unc, strike];
  const billboards: THREE.Object3D[] = [...pedestrians];

  residence(exterior, streetSolids, glowMats, -32, 14.6, 8.6, 7.4, "#e7d7c0", 0x7a3b32, "#6b3a22", true, 0);
  residence(exterior, streetSolids, glowMats, -20.5, 14.8, 7.4, 6.8, "#d5ddd8", 0x3c4148, "#243044", false, 1);
  residence(exterior, streetSolids, glowMats, -10, 15, 7.8, 7, "#c4a08a", 0x3c4148, "#5c3828", false, 2);
  residence(exterior, streetSolids, glowMats, 18, 14.7, 7.6, 6.8, "#efe6d4", 0x6e4030, "#1f4d3a", false, 0);
  residence(exterior, streetSolids, glowMats, 30, 15.1, 8, 7.2, "#d7c4a3", 0x3c4148, "#5a4030", false, 1);
  residence(exterior, streetSolids, glowMats, 44, 14.5, 7.2, 6.6, "#c9d4cf", 0x7a3b32, "#243044", false, 2);

  for (const [fx, fz] of [
    [-36.2, 9.4],
    [-16.8, 9.6],
    [22, 9.5],
    [48, 9.2],
  ] as const) {
    box(0.12, 0.55, 1.6, fx, 0.35, fz, wood, exterior);
  }
  box(3.4, 0.05, 6.2, -35.6, 0.04, 8.4, asphalt, exterior);
  const coupe = parkedCar(-35.4, 8.9, 2.35, "coupe", exterior);
  collectLights(coupe, headlightMats);
  streetSolids.push(carSolid(-35.4, 8.9, 2.35, 4.75, 1.84));
  const sedan = parkedCar(-16.2, 9.1, Math.PI, "sedan", exterior);
  collectLights(sedan, headlightMats);
  streetSolids.push(carSolid(-16.2, 9.1, Math.PI, 4.6, 1.78));
  const curbSuv = parkedCar(33.5, -3.55, Math.PI / 2, "suv", exterior);
  collectLights(curbSuv, headlightMats);
  streetSolids.push(carSolid(33.5, -3.55, Math.PI / 2, 4.9, 1.96));

  box(0.28, 0.9, 0.28, -28.4, 0.55, 7.15, new THREE.MeshStandardMaterial({ color: 0xb43322, roughness: 0.6 }), exterior);
  box(0.42, 0.28, 0.22, -28.4, 1.05, 7.15, new THREE.MeshStandardMaterial({ color: 0x8d1d1d, roughness: 0.5 }), exterior);
  const bin = new THREE.MeshStandardMaterial({ color: 0x3d463f, roughness: 0.62, metalness: 0.15 });
  const lid = new THREE.MeshStandardMaterial({ color: 0x242824, roughness: 0.5, metalness: 0.25 });
  function trash(tx: number, tz: number) {
    mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.78, 12), bin, tx, 0.42, tz, exterior);
    mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.06, 12), lid, tx, 0.84, tz, exterior);
  }
  trash(-29.6, 6.5);
  for (const [tx, tz] of [[-40, 5.55], [6, -5.5], [38, 5.6], [58, -5.55]] as const) trash(tx, tz);
  box(0.22, 0.55, 0.22, 3.4, 0.35, 5.2, new THREE.MeshStandardMaterial({ color: 0xc4362c, roughness: 0.45 }), exterior);
  box(0.28, 0.16, 0.28, 3.4, 0.7, 5.2, chrome, exterior);
  box(0.7, 0.85, 0.4, 6.8, 0.5, 7.6, new THREE.MeshStandardMaterial({ color: 0x5c6a62, roughness: 0.7 }), exterior);
  box(0.55, 0.4, 0.35, -8, 0.28, -5.7, new THREE.MeshStandardMaterial({ color: 0x3d4a44, roughness: 0.8 }), exterior);
  const ave = sign("901", "AVE", 0.7, 0.4);
  ave.plane.position.set(2.2, 2.4, 5.4);
  exterior.add(ave.plane);
  glowMats.push(ave.mat);

  const hqX = 24;
  const hqZ = -16.4;
  const brick = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.86,
    map: canvasTex((g, w, h) => {
      g.fillStyle = "#8a4632";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "rgba(40,16,10,0.35)";
      for (let row = 0; row < 16; row++) {
        const y = row * (h / 16);
        g.fillRect(0, y, w, 4);
        const off = row % 2 ? 28 : 0;
        for (let x = -40 + off; x < w; x += 56) g.fillRect(x, y, 4, h / 16);
      }
    }, 256, 256, true),
  });
  brick.map!.repeat.set(3, 2);
  const frontZ = hqZ + 5.48;
  box(18, 5.8, 10.6, hqX, 2.9, hqZ, brick, exterior);
  box(18.6, 0.35, 11.2, hqX, 5.95, hqZ, black, exterior);
  box(8.4, 0.55, 0.7, hqX, 6.35, hqZ + 5.2, black, exterior);
  box(2.3, 5.5, 0.7, hqX - 6.4, 2.75, frontZ + 0.12, brick, exterior);
  box(2.3, 5.5, 0.7, hqX + 6.4, 2.75, frontZ + 0.12, brick, exterior);
  box(14.2, 0.45, 0.55, hqX, 0.4, frontZ + 0.16, new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }), exterior);
  box(11.4, 0.12, 1.15, hqX, 2.55, frontZ + 0.55, black, exterior);
  box(18.4, 0.28, 11, hqX, 5.9, hqZ, new THREE.MeshStandardMaterial({ color: 0x2a1814, roughness: 0.8 }), exterior);
  box(6.2, 0.7, 10.8, hqX, 6.35, hqZ, brick, exterior);
  const panel = new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.45, metalness: 0.35 });
  box(10.2, 3.55, 0.28, hqX, 4.35, frontZ, panel, exterior);
  const brandTex = canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#e0b33a";
    const cx = w / 2;
    const cy = h * 0.36;
    g.beginPath();
    g.moveTo(cx - 150, cy + 36);
    g.lineTo(cx - 170, cy - 28);
    g.lineTo(cx - 100, cy + 8);
    g.lineTo(cx, cy - 70);
    g.lineTo(cx + 100, cy + 8);
    g.lineTo(cx + 170, cy - 28);
    g.lineTo(cx + 150, cy + 36);
    g.closePath();
    g.fill();
    g.fillRect(cx - 160, cy + 36, 320, 16);
    paintLabel(g, "$ACKRELIGIOUS", w / 2, h * 0.58, w * 0.9, "#e0b33a", 92);
    paintLabel(g, "HQ", w / 2, h * 0.8, w * 0.3, "#f4efe4", 48);
  }, 1024, 512);
  const brandMat = new THREE.MeshStandardMaterial({
    map: brandTex,
    transparent: true,
    emissive: 0xffe0b0,
    emissiveMap: brandTex,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    depthWrite: false,
  });
  glowMats.push(brandMat);
  const brand = new THREE.Mesh(new THREE.PlaneGeometry(8.6, 3.3), brandMat);
  brand.position.set(hqX, 4.55, frontZ + 0.2);
  exterior.add(brand);
  const signLamp = new THREE.PointLight(0xffc56a, 0, 14, 2);
  signLamp.position.set(hqX, 3.4, frontZ + 2.4);
  exterior.add(signLamp);
  lamps.push(signLamp);
  const frame = new THREE.MeshStandardMaterial({ color: 0x0c0c0c, roughness: 0.4, metalness: 0.5 });
  const warm = new THREE.MeshStandardMaterial({ color: 0xffe0b0, emissive: 0xffb15a, emissiveIntensity: 0.35, roughness: 0.4 });
  glowMats.push(warm);
  for (const ox of [-3.15, 0, 3.15]) {
    box(2.4, 2.25, 0.1, hqX + ox, 1.35, frontZ + 0.02, ox === 0 ? black : frame, exterior);
    if (ox !== 0) {
      box(2.05, 1.9, 0.06, hqX + ox, 1.38, frontZ + 0.1, glassMat, exterior);
      box(1.85, 1.7, 0.04, hqX + ox, 1.38, frontZ + 0.06, warm, exterior);
      box(0.04, 1.9, 0.05, hqX + ox, 1.38, frontZ + 0.14, frame, exterior);
      box(2.05, 0.04, 0.05, hqX + ox, 1.38, frontZ + 0.14, frame, exterior);
    } else {
      box(1.15, 1.95, 0.06, hqX, 1.22, frontZ + 0.12, glassMat, exterior);
      box(1.0, 1.7, 0.04, hqX, 1.22, frontZ + 0.07, warm, exterior);
      box(0.08, 0.12, 0.08, hqX + 0.35, 1.15, frontZ + 0.2, gold, exterior);
    }
  }
  for (const side of [-1, 1]) {
    const banner = sign("K", "901", 0.7, 1.8);
    banner.plane.position.set(hqX + side * 6.35, 3.4, frontZ + 0.08);
    exterior.add(banner.plane);
    glowMats.push(banner.mat);
  }
  box(5.2, 3.2, 4.2, hqX + 11.6, 1.6, hqZ - 1.2, black, exterior);
  streetSolids.push({ minX: hqX + 9, maxX: hqX + 14.2, minZ: hqZ - 3.3, maxZ: hqZ + 0.9 });
  const van = parkedCar(hqX + 11.6, hqZ - 4.6, Math.PI / 2, "van", exterior);
  collectLights(van, headlightMats);
  streetSolids.push(carSolid(hqX + 11.6, hqZ - 4.6, Math.PI / 2, 5.5, 2.05));
  streetSolids.push({ minX: hqX - 9, maxX: hqX - 0.85, minZ: hqZ - 5.5, maxZ: hqZ + 5.5 });
  streetSolids.push({ minX: hqX + 0.85, maxX: hqX + 9, minZ: hqZ - 5.5, maxZ: hqZ + 5.5 });
  streetSolids.push({ minX: hqX - 9, maxX: hqX + 9, minZ: hqZ - 5.5, maxZ: hqZ + 3.6 });
  box(14, 0.08, 6.5, hqX, 0.05, hqZ + 8.2, concrete, exterior);
  for (const px of [hqX - 5.2, hqX + 5.2]) planter(px, hqZ + 6.3, exterior);

  const towerMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.45,
    map: canvasTex((g, w, h) => {
      g.fillStyle = "#8ea0b4";
      g.fillRect(0, 0, w, h);
      g.fillStyle = "#d7e7f4";
      for (let y = 8; y < h; y += 18) for (let x = 6; x < w; x += 16) g.fillRect(x, y, 8, 10);
    }, 128, 256, true),
    emissive: 0xffe0b0,
    emissiveIntensity: 0.05,
  });
  glowMats.push(towerMat);
  for (const [tx, th] of [
    [8, 14],
    [14, 22],
    [20, 16],
    [28, 26],
    [36, 18],
  ] as const) {
    box(3.2, th, 3.2, tx, th / 2, -46, towerMat, exterior);
  }

  const courtX = 52;
  const courtZ = -22;
  const courtMat = new THREE.MeshStandardMaterial({ map: courtTexture(), roughness: 0.62 });
  mesh(new THREE.PlaneGeometry(22, 14), courtMat, courtX, 0.04, courtZ, exterior).rotation.x = -Math.PI / 2;
  const fence = chainMat();
  box(22.4, 2.6, 0.08, courtX, 1.3, courtZ - 7.1, fence, exterior);
  box(9.2, 2.6, 0.08, courtX - 6.4, 1.3, courtZ + 7.1, fence, exterior);
  box(9.2, 2.6, 0.08, courtX + 6.4, 1.3, courtZ + 7.1, fence, exterior);
  box(0.08, 2.6, 14.2, courtX - 11.2, 1.3, courtZ, fence, exterior);
  box(0.08, 2.6, 14.2, courtX + 11.2, 1.3, courtZ, fence, exterior);
  for (let i = 0; i <= 10; i++) box(0.08, 2.75, 0.08, courtX - 11.2 + i * 2.24, 1.35, courtZ - 7.1, black, exterior);
  box(0.1, 2.9, 0.1, courtX - 1.35, 1.45, courtZ + 7.1, black, exterior);
  box(0.1, 2.9, 0.1, courtX + 1.35, 1.45, courtZ + 7.1, black, exterior);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(10, 0.38, 8, 24, Math.PI), new THREE.MeshStandardMaterial({ color: 0x6a5346, metalness: 0.35, roughness: 0.55 }));
  arch.position.set(courtX, 6.8, courtZ - 15);
  exterior.add(arch);
  box(22, 0.4, 1.6, courtX, 11.5, courtZ - 15, new THREE.MeshStandardMaterial({ color: 0x4e4038, roughness: 0.6 }), exterior);
  const benchMate = spawn(characters.pedestrian.female04, courtX - 4.2, courtZ + 8.15, exterior);
  benchMate.userData.idle = true;
  pedestrians.push(benchMate);
  billboards.push(benchMate);
  const mural = new THREE.Mesh(new THREE.PlaneGeometry(8, 3.2), new THREE.MeshStandardMaterial({ map: muralTexture(), roughness: 0.7 }));
  mural.position.set(courtX - 11.05, 1.8, courtZ);
  mural.rotation.y = Math.PI / 2;
  exterior.add(mural);
  streetSolids.push({ minX: courtX - 11.4, maxX: courtX + 11.4, minZ: courtZ - 7.3, maxZ: courtZ - 6.8 });
  streetSolids.push({ minX: courtX - 11.4, maxX: courtX - 1.3, minZ: courtZ + 6.8, maxZ: courtZ + 7.4 });
  streetSolids.push({ minX: courtX + 1.3, maxX: courtX + 11.4, minZ: courtZ + 6.8, maxZ: courtZ + 7.4 });
  streetSolids.push({ minX: courtX - 11.5, maxX: courtX - 10.9, minZ: courtZ - 7, maxZ: courtZ + 7 });
  streetSolids.push({ minX: courtX + 10.9, maxX: courtX + 11.5, minZ: courtZ - 7, maxZ: courtZ + 7 });
  for (let i = 0; i < 4; i++) box(4.2, 0.22, 1.15, courtX - 1 + i * 0.08, 0.18 + i * 0.22, courtZ - 8.5, wood, exterior);
  const west = hoopRig(courtX - 9.6, courtZ, 1, exterior);
  const east = hoopRig(courtX + 9.6, courtZ, -1, exterior);
  const scoreTex = canvasTex((g, w, h) => {
    g.fillStyle = "#0c0c0c";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "#e0b33a";
    g.lineWidth = 8;
    g.strokeRect(8, 8, w - 16, h - 16);
    paintLabel(g, "901 COURT", w / 2, h * 0.28, w * 0.86, "#e0b33a", 54);
    paintLabel(g, "HOME  00", w * 0.28, h * 0.68, w * 0.4, "#ff4d4d", 42);
    paintLabel(g, "GUEST  00", w * 0.72, h * 0.68, w * 0.42, "#7eb6ff", 42);
  }, 768, 384);
  const scoreMat = new THREE.MeshStandardMaterial({ map: scoreTex, emissive: 0xffe0b0, emissiveMap: scoreTex, emissiveIntensity: 0.35, roughness: 0.4 });
  glowMats.push(scoreMat);
  const score = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), scoreMat);
  score.position.set(courtX + 6.2, 3.1, courtZ + 6.55);
  score.rotation.y = Math.PI;
  exterior.add(score);
  box(0.12, 2.4, 0.12, courtX + 5.1, 1.2, courtZ + 6.4, black, exterior);
  box(0.12, 2.4, 0.12, courtX + 7.3, 1.2, courtZ + 6.4, black, exterior);
  bench(courtX + 3.4, courtZ + 8.6, Math.PI, exterior);
  const courtLights: THREE.PointLight[] = [];
  for (const lx of [courtX - 8, courtX + 8]) {
    box(0.1, 6.2, 0.1, lx, 3.1, courtZ - 8.2, black, exterior);
    box(2.2, 0.08, 0.4, lx, 6.15, courtZ - 6.5, black, exterior);
    const bulb = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffe2a8, emissiveIntensity: 0.2 });
    glowMats.push(bulb);
    box(1.6, 0.08, 0.2, lx, 6.05, courtZ - 6.5, bulb, exterior);
    const light = new THREE.PointLight(0xfff1d0, 0, 22, 2);
    light.position.set(lx, 6, courtZ - 4);
    exterior.add(light);
    courtLights.push(light);
  }
  const og = spawn(characters.courtOg, courtX, courtZ + 9.1, exterior);
  billboards.push(og);

  buildHomeInterior(home, homeSolids, glowMats);
  const interior = buildHqInterior(hq, hqSolids, glowMats);
  const counterPack = interior.counterPack;
  const kSprite = interior.kSprite;

  return {
    scene,
    solids: { street: streetSolids, home: homeSolids, hq: hqSolids },
    exterior,
    home,
    hq,
    homeDoor: { x: -32, z: 9.55 },
    hqDoor: { x: hqX, z: hqZ + 6.35 },
    homeOut: { x: -32, z: 8.4 },
    hqOut: { x: hqX, z: hqZ + 7.4 },
    homeIn: { x: 0, z: 3.15 },
    hqIn: { x: 0, z: 4.7 },
    courtGate: { x: courtX, z: courtZ + 7.2 },
    hoop: west.hoop,
    hoops: [west.hoop, east.hoop],
    backboards: [west.board, east.board],
    courtOg: { x: courtX, z: courtZ + 9.1 },
    wardrobe: { x: -3.5, z: -2.5 },
    kAnchor: { x: 1.15, z: 1.9 },
    sun,
    hemi,
    lamps,
    courtLights,
    homeLights: home.userData.lights as THREE.PointLight[],
    hqLights: hq.userData.lights as THREE.PointLight[],
    pedestrians,
    billboards,
    kSprite,
    headlightMats,
    glowMats,
    skyDay,
    skyNight,
    counterPack,
    figureMats,
  };
}

function buildHomeInterior(group: THREE.Group, solids: Solid[], glow: THREE.MeshStandardMaterial[]) {
  group.position.set(0, 0, 200);
  const floorTex = canvasTex((g, w, h) => {
    g.fillStyle = "#c2a078";
    g.fillRect(0, 0, w, h);
    g.strokeStyle = "rgba(90,60,30,0.35)";
    for (let i = 0; i < 8; i++) {
      g.strokeRect(i * 32, 0, 32, h);
    }
  }, 256, 256, true);
  const floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.8 });
  floor.map!.repeat.set(4, 3);
  mesh(new THREE.PlaneGeometry(10, 8), floor, 0, 0, 0, group).rotation.x = -Math.PI / 2;
  const wall = new THREE.MeshStandardMaterial({ color: 0xefe6d6, roughness: 0.9 });
  box(10, 2.8, 0.16, 0, 1.4, -4, wall, group);
  box(0.16, 2.8, 8, -5, 1.4, 0, wall, group);
  box(0.16, 2.8, 8, 5, 1.4, 0, wall, group);
  box(3.5, 2.8, 0.16, -3.2, 1.4, 4, wall, group);
  box(3.5, 2.8, 0.16, 3.2, 1.4, 4, wall, group);
  box(10, 0.12, 8, 0, 2.75, 0, new THREE.MeshStandardMaterial({ color: 0xf7f1e6, roughness: 0.9 }), group);
  solids.push({ minX: -5.2, maxX: 5.2, minZ: -4.2, maxZ: -3.75 });
  solids.push({ minX: -5.2, maxX: -4.75, minZ: -4, maxZ: 4.2 });
  solids.push({ minX: 4.75, maxX: 5.2, minZ: -4, maxZ: 4.2 });
  solids.push({ minX: -5, maxX: -1.15, minZ: 3.75, maxZ: 4.25 });
  solids.push({ minX: 1.15, maxX: 5, minZ: 3.75, maxZ: 4.25 });
  const couch = new THREE.MeshStandardMaterial({ color: 0x1f4d3a, roughness: 0.8 });
  box(2.6, 0.45, 0.9, -2.3, 0.32, -1.6, couch, group);
  box(2.6, 0.7, 0.16, -2.3, 0.75, -2.0, couch, group);
  solids.push({ minX: -3.7, maxX: -0.9, minZ: -2.2, maxZ: -1.1 });
  box(1.2, 0.28, 0.7, -2.2, 0.4, -0.3, wood, group);
  box(1.5, 0.9, 0.35, -3.6, 0.7, 1.6, black, group);
  const screen = new THREE.MeshStandardMaterial({ color: 0x111, emissive: 0x88b7d6, emissiveIntensity: 0.35 });
  glow.push(screen);
  box(1.2, 0.7, 0.06, -3.6, 1.15, 1.78, screen, group);
  box(2.4, 0.9, 0.7, 2.2, 0.5, 0.2, new THREE.MeshStandardMaterial({ color: 0xf4efe4, roughness: 0.6 }), group);
  box(2.2, 0.08, 0.7, 2.2, 0.98, 0.2, wood, group);
  solids.push({ minX: 0.9, maxX: 3.5, minZ: -0.3, maxZ: 0.7 });
  box(1.7, 0.45, 2.2, 3.4, 0.35, -2.2, new THREE.MeshStandardMaterial({ color: 0x243044, roughness: 0.8 }), group);
  box(1.7, 0.35, 0.4, 3.4, 0.55, -1.2, trimMat, group);
  solids.push({ minX: 2.4, maxX: 4.4, minZ: -3.4, maxZ: -1.0 });
  box(1.3, 2.2, 0.7, -3.5, 1.1, -2.5, wood, group);
  solids.push({ minX: -4.3, maxX: -2.7, minZ: -3.0, maxZ: -2.0 });
  const closet = sign("FIT", "CLOSET", 1.1, 0.4);
  closet.plane.position.set(-3.5, 1.7, -2.12);
  group.add(closet.plane);
  const light = new THREE.PointLight(0xffe0b0, 0, 14, 2);
  light.position.set(0, 2.5, 0);
  group.add(light);
  group.userData.lights = [light];
}

function buildHqInterior(group: THREE.Group, solids: Solid[], glow: THREE.MeshStandardMaterial[]) {
  group.position.set(80, 0, 200);
  const floorTex = canvasTex((g, w, h) => {
    g.fillStyle = "#2c2c30";
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1800; i++) {
      g.fillStyle = i % 2 ? "#36363b" : "#242428";
      g.fillRect((i * 29) % w, (i * 17) % h, 10, 6);
    }
  }, 256, 256, true);
  floorTex.repeat.set(4, 3);
  const floor = new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.28, metalness: 0.35 });
  mesh(new THREE.PlaneGeometry(16, 12), floor, 0, 0.01, 0, group).rotation.x = -Math.PI / 2;
  box(16, 3.2, 0.16, 0, 1.6, -6, black, group);
  box(0.16, 3.2, 12, -8, 1.6, 0, black, group);
  box(0.16, 3.2, 12, 8, 1.6, 0, black, group);
  box(6, 3.2, 0.16, -5, 1.6, 6, black, group);
  box(6, 3.2, 0.16, 5, 1.6, 6, black, group);
  box(16, 0.1, 12, 0, 3.15, 0, new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.8 }), group);
  box(6, 0.08, 0.2, 0, 2.9, 6.05, gold, group);
  solids.push({ minX: -8.2, maxX: 8.2, minZ: -6.2, maxZ: -5.75 });
  solids.push({ minX: -8.2, maxX: -7.75, minZ: -6, maxZ: 6.2 });
  solids.push({ minX: 7.75, maxX: 8.2, minZ: -6, maxZ: 6.2 });
  solids.push({ minX: -8, maxX: -1.15, minZ: 5.75, maxZ: 6.25 });
  solids.push({ minX: 1.15, maxX: 8, minZ: 5.75, maxZ: 6.25 });
  const rack = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.2 });
  for (const x of [-4.2, -1.4, 1.5]) {
    box(1.5, 1.7, 0.45, x, 0.9, -2.4, rack, group);
    solids.push({ minX: x - 0.85, maxX: x + 0.85, minZ: -2.8, maxZ: -2.05 });
    for (const [dx, color] of [
      [-0.45, 0x1f7a43],
      [-0.15, 0xb43322],
      [0.15, 0x111111],
      [0.45, 0xf4efe4],
    ] as const) {
      box(0.24, 0.7, 0.06, x + dx, 1.2, -2.12, new THREE.MeshStandardMaterial({ color }), group);
    }
  }
  for (let i = 0; i < 4; i++) {
    box(0.35, 0.16, 0.7, -5.6, 0.2 + i * 0.28, 2.2, rack, group);
    box(0.28, 0.1, 0.5, -5.6, 0.32 + i * 0.28, 2.2, new THREE.MeshStandardMaterial({ color: i % 2 ? 0xe0b33a : 0xf4efe4 }), group);
  }
  box(2.4, 1.05, 0.7, 4.6, 0.55, 1.6, black, group);
  box(2.4, 0.08, 0.7, 4.6, 1.1, 1.6, gold, group);
  solids.push({ minX: 3.3, maxX: 5.9, minZ: 1.15, maxZ: 2.05 });
  box(0.08, 2.3, 2.2, -6.2, 1.15, 0.2, black, group);
  box(1.8, 2.3, 0.08, -6.9, 1.15, -0.9, black, group);
  box(1.8, 2.3, 0.08, -6.9, 1.15, 1.3, black, group);
  const curtain = new THREE.MeshStandardMaterial({ color: 0xe0b33a, roughness: 0.6, side: THREE.DoubleSide });
  box(0.08, 2.1, 1.1, -6.15, 1.15, 0.2, curtain, group);
  solids.push({ minX: -7.9, maxX: -6.1, minZ: -1.0, maxZ: 1.4 });
  const sofa = new THREE.MeshStandardMaterial({ color: 0x1f4d3a, roughness: 0.75 });
  box(2.2, 0.45, 0.8, -3.4, 0.35, -4.4, sofa, group);
  box(2.2, 0.55, 0.16, -3.4, 0.7, -4.75, sofa, group);
  solids.push({ minX: -4.6, maxX: -2.2, minZ: -5.0, maxZ: -3.9 });
  box(2.6, 2.4, 2.4, 6.2, 1.2, -4.2, new THREE.MeshStandardMaterial({ color: 0x242018, roughness: 0.75 }), group);
  box(1.4, 0.08, 0.7, 6.2, 0.78, -3.4, wood, group);
  solids.push({ minX: 4.8, maxX: 7.6, minZ: -5.5, maxZ: -2.9 });
  box(3.2, 2.2, 0.2, 2.4, 1.1, -5.2, black, group);
  box(1.4, 1.2, 0.5, 2.4, 0.7, -4.6, wood, group);
  solids.push({ minX: 0.6, maxX: 4.2, minZ: -5.5, maxZ: -4.2 });
  const banner = sign("$ACKRELIGIOUS", "SHOWROOM", 5.2, 1.15);
  banner.plane.position.set(0, 2.45, -5.85);
  group.add(banner.plane);
  glow.push(banner.mat);
  box(2.2, 0.7, 1.05, -0.6, 0.4, -0.5, black, group);
  box(2.0, 0.08, 0.95, -0.6, 0.78, -0.5, wood, group);
  solids.push({ minX: -1.8, maxX: 0.6, minZ: -1.1, maxZ: 0.1 });
  mesh(new THREE.ConeGeometry(0.28, 0.55, 6), leafMat, -6.6, 0.7, 4.2, group);
  mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.4, 8), black, -6.6, 0.2, 4.2, group);
  mesh(new THREE.ConeGeometry(0.32, 0.6, 6), leafMat2, 6.4, 0.75, 3.6, group);
  mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.4, 8), black, 6.4, 0.2, 3.6, group);
  for (let i = 0; i < 6; i++) {
    const bulb = new THREE.MeshStandardMaterial({ color: 0xfff1d2, emissive: 0xffd28a, emissiveIntensity: 0.8 });
    glow.push(bulb);
    mesh(new THREE.SphereGeometry(0.06, 8, 6), bulb, -4 + i * 1.6, 2.95, 0.2, group);
  }
  const kSize = frameSize(characters.kBlanco);
  const k = actor(kSize.src, kSize.w, kSize.h, 1.15, 1.9, group);
  const pack = box(0.28, 0.16, 0.22, 4.6, 1.22, 2.15, gold, group);
  const light = new THREE.PointLight(0xffe2b0, 0, 20, 2);
  light.position.set(0, 2.8, 0);
  const light2 = new THREE.PointLight(0xfff6e0, 0, 10, 2);
  light2.position.set(4.6, 2.3, 1.4);
  group.add(light, light2);
  group.userData.lights = [light, light2];
  return { kSprite: k.getObjectByName("sprite")!, counterPack: pack };
}
