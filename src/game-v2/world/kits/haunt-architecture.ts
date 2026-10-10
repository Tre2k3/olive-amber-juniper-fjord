import * as THREE from "three";
import type { Solid } from "../../core/types";
import { flagshipLogo } from "./brand";

function block(parent: THREE.Object3D, material: THREE.Material, w: number, h: number, d: number, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

/** Surface detail only: no photographed room or building is used as geometry. */
export function hauntSurface(kind: "stone" | "wood" | "tile") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = kind === "wood" ? "#39281f" : "#44413b";
  ctx.fillRect(0, 0, 256, 256);
  const rows = kind === "wood" ? 16 : 8;
  for (let row = 0; row < rows; row++) {
    const height = 256 / rows;
    const width = kind === "wood" ? 128 : 32;
    for (let col = -1; col < 256 / width + 1; col++) {
      const x = col * width + (row % 2) * width / 2;
      const tone = (kind === "stone" ? 122 : 45) + ((row * 13 + col * 7 + 43) % 28);
      ctx.fillStyle = kind === "wood" ? `rgb(${tone + 22},${tone + 5},${tone - 8})`
        : kind === "tile" ? (row + col) % 2 ? "#242829" : "#aaa496" : `rgb(${tone + 10},${tone + 7},${tone})`;
      ctx.fillRect(x + 1, row * height + 1, width - 2, height - 2);
      if (kind === "wood") {
        ctx.strokeStyle = "#21171055";
        for (let grain = 3; grain < height; grain += 4) {
          ctx.beginPath(); ctx.moveTo(x + 3, row * height + grain); ctx.lineTo(x + width - 3, row * height + grain + 1); ctx.stroke();
        }
      }
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === "stone" ? 3 : 2, 2);
  return new THREE.MeshStandardMaterial({ map: texture, roughness: kind === "tile" ? 0.34 : 0.85 });
}

export function buildHauntExterior(parent: THREE.Object3D, hx: number, hz: number, glow: THREE.MeshStandardMaterial[]) {
  const house = new THREE.Group();
  house.name = "haunt-3d-house";
  house.position.set(hx, 0, hz);
  parent.add(house);
  const stone = hauntSurface("stone");
  const wood = hauntSurface("wood");
  const trim = new THREE.MeshStandardMaterial({ color: 0x827660, roughness: 0.78 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x24232a, roughness: 0.82 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x191c20, metalness: 0.65, roughness: 0.48 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x6f8299, emissive: 0x33567d, emissiveIntensity: 0.35, roughness: 0.25 });
  const amber = new THREE.MeshStandardMaterial({ color: 0xffb569, emissive: 0xff942f, emissiveIntensity: 0.6 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xa9854a, metalness: 0.52, roughness: 0.43 });
  const banner = new THREE.MeshStandardMaterial({ color: 0x3b1019, roughness: 0.92 });
  const vine = new THREE.MeshStandardMaterial({ color: 0x263a20, roughness: 0.98 });
  glow.push(amber);
  // Complete side/rear walls, front wall segments and a recessed entrance.
  block(house, stone, 20, 0.3, 12, 0, 0.15, 0);
  block(house, stone, 0.45, 8.8, 12, -9.8, 4.7, 0);
  block(house, stone, 0.45, 8.8, 12, 9.8, 4.7, 0);
  block(house, stone, 20, 8.8, 0.45, 0, 4.7, 5.8);
  for (const x of [-6.1, 6.1]) block(house, stone, 7.4, 8.8, 0.5, x, 4.7, -5.8);
  block(house, stone, 4.8, 5.2, 0.5, 0, 6.5, -5.8);
  block(house, wood, 5, 0.16, 4, 0, 0.24, -5.8);
  block(house, iron, 4.6, 3.4, 0.18, 0, 1.95, -3.9);
  for (const x of [-1.08, 1.08]) {
    block(house, wood, 2.08, 3.15, 0.2, x, 1.88, -4.04);
    for (const y of [1, 2.55]) block(house, trim, 1.65, 0.06, 0.07, x, y, -4.18);
    block(house, amber, 0.06, 0.2, 0.08, x > 0 ? 0.22 : -0.22, 1.55, -4.18);
  }
  // Pitched roof has visible thickness and eaves from every orbit angle.
  for (const side of [-1, 1]) {
    const slope = block(house, roof, 10.9, 0.22, 12.8, side * 4.9, 10.6, 0);
    slope.rotation.z = -side * 0.33;
  }
  block(house, trim, 20.6, 0.22, 12.5, 0, 9.15, 0);
  const gableShape = new THREE.Shape();
  gableShape.moveTo(-10, 9.15); gableShape.lineTo(0, 12.35); gableShape.lineTo(10, 9.15); gableShape.closePath();
  const gableGeometry = new THREE.ExtrudeGeometry(gableShape, { depth: 0.3, bevelEnabled: false });
  for (const z of [-6.12, 5.8]) {
    const gable = new THREE.Mesh(gableGeometry, stone); gable.position.z = z;
    gable.castShadow = gable.receiveShadow = true; house.add(gable);
  }
  block(house, stone, 1.2, 3.2, 1.1, 3.7, 11.7, 3.9);
  block(house, trim, 1.45, 0.18, 1.35, 3.7, 13.35, 3.9);
  for (const x of [-7.3, 7.3]) {
    block(house, stone, 4.6, 11.2, 5.4, x, 5.8, 0.5);
    block(house, trim, 4.95, 0.28, 5.75, x, 11.5, 0.5);
    for (const dx of [-1.8, -0.6, 0.6, 1.8]) {
      block(house, stone, 0.6, 0.85, 0.55, x + dx, 12.02, -2.12);
      block(house, stone, 0.6, 0.85, 0.55, x + dx, 12.02, 3.12);
    }
    for (const z of [-1.55, 0, 1.55]) {
      block(house, stone, 0.55, 0.85, 0.6, x - 2.05, 12.02, z + 0.5);
      block(house, stone, 0.55, 0.85, 0.6, x + 2.05, 12.02, z + 0.5);
    }
  }
  const window = (x: number, y: number, z: number, yaw: number) => {
    const frame = new THREE.Group(); frame.position.set(x, y, z); frame.rotation.y = yaw; house.add(frame);
    block(frame, iron, 1.5, 2.2, 0.22, 0, 0, 0);
    block(frame, glass, 1.28, 1.98, 0.08, 0, 0, -0.15);
    for (const dx of [-0.78, 0.78]) block(frame, trim, 0.14, 2.45, 0.38, dx, 0, -0.12);
    for (const dy of [-1.18, 1.18]) block(frame, trim, 1.7, 0.14, 0.38, 0, dy, -0.12);
    block(frame, iron, 0.065, 2, 0.15, 0, 0, -0.23);
    for (const dy of [-0.4, 0.4]) block(frame, iron, 1.3, 0.06, 0.15, 0, dy, -0.23);
  };
  for (const x of [-8, -4.2, 4.2, 8]) for (const y of [2.3, 6.8]) window(x, y, -6.09, 0);
  for (const x of [-10.08, 10.08]) for (const z of [-3.5, 0.6, 4]) for (const y of [2.3, 6.8]) window(x, y, z, x < 0 ? Math.PI / 2 : -Math.PI / 2);
  // Deep facade relief, hanging banners and creeping vines bring the modeled
  // building closer to the approved festival-house reference.
  block(house, trim, 20.35, 0.32, 0.5, 0, 8.92, -6.05);
  for (const x of [-9.25, -5.95, 5.95, 9.25]) {
    block(house, trim, 0.62, 9.25, 0.58, x, 4.72, -6.2);
    block(house, stone, 0.88, 0.38, 0.75, x, 0.42, -6.28);
    block(house, stone, 0.88, 0.38, 0.75, x, 8.75, -6.28);
  }
  for (const x of [-6.9, 6.9]) {
    block(house, iron, 0.06, 1.05, 0.06, x - 0.75, 9.25, -6.48);
    block(house, iron, 0.06, 1.05, 0.06, x + 0.75, 9.25, -6.48);
    block(house, banner, 2.15, 3.1, 0.11, x, 7.15, -6.46);
    block(house, gold, 2.28, 0.11, 0.16, x, 8.75, -6.5);
    block(house, gold, 2.28, 0.11, 0.16, x, 5.55, -6.5);
    const logo = flagshipLogo(1.95);
    logo.position.set(x, 7.15, -6.53);
    logo.rotation.y = Math.PI;
    house.add(logo);
  }
  const medallion = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.13, 8, 36), trim);
  medallion.position.set(0, 7.18, -6.5); house.add(medallion);
  const medallionCore = new THREE.Mesh(new THREE.SphereGeometry(0.84, 24, 16), banner);
  medallionCore.scale.z = 0.12; medallionCore.position.set(0, 7.18, -6.45); house.add(medallionCore);
  for (const x of [-0.3, 0.3]) {
    const eye = block(house, amber, 0.28, 0.16, 0.08, x, 7.35, -6.58);
    eye.rotation.z = x < 0 ? -0.25 : 0.25;
  }
  for (const [x, tilt] of [[-8.55, -0.22], [-5.2, 0.18], [5.15, -0.18], [8.55, 0.22]] as const) {
    for (let segment = 0; segment < 5; segment++) {
      const stem = block(house, vine, 0.075, 1.65, 0.075, x + segment * tilt, 1.45 + segment * 1.45, -6.54);
      stem.rotation.z = -tilt;
      for (const side of [-1, 1]) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), vine);
        leaf.scale.set(1.5, 0.55, 0.3);
        leaf.position.set(x + segment * tilt + side * 0.18, 1.8 + segment * 1.45, -6.57);
        leaf.rotation.z = side * 0.45; house.add(leaf);
      }
    }
  }
  // Porch, projecting canopy, columns and iron balustrades have real depth.
  block(house, stone, 11, 0.06, 3.6, 0, 0.03, -7.4);
  block(house, roof, 11.3, 0.28, 3.8, 0, 3.9, -7.3);
  for (const x of [-5, -2.5, 2.5, 5]) {
    block(house, trim, 0.22, 3.65, 0.22, x, 2, -8.6);
    block(house, trim, 0.48, 0.25, 0.48, x, 3.65, -8.6);
  }
  for (const x of [-4, 4]) {
    block(house, iron, 2.2, 0.07, 0.08, x, 1.25, -9);
    for (let i = 0; i < 9; i++) block(house, iron, 0.04, 1.08, 0.04, x - 1 + i * 0.25, 0.68, -9);
  }
  for (const x of [-2.1, 2.1, -5.3, 5.3]) {
    block(house, iron, 0.3, 0.55, 0.3, x, 2.6, -6.2);
    block(house, amber, 0.2, 0.38, 0.2, x, 2.6, -6.4);
  }
  return house;
}

export function buildHauntFoyer(parent: THREE.Object3D, solids: Solid[], glow: THREE.MeshStandardMaterial[]) {
  const room = new THREE.Group(); room.name = "haunt-3d-foyer"; parent.add(room);
  const wood = hauntSurface("wood");
  const iron = new THREE.MeshStandardMaterial({ color: 0x24201c, metalness: 0.6, roughness: 0.4 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xaa874c, metalness: 0.55, roughness: 0.4 });
  const velvet = new THREE.MeshStandardMaterial({ color: 0x571c28, roughness: 0.9 });
  const candle = new THREE.MeshStandardMaterial({ color: 0xffdd9b, emissive: 0xffa43b, emissiveIntensity: 0.9 }); glow.push(candle);
  const plaster = new THREE.MeshStandardMaterial({ color: 0x654940, roughness: 0.94 });
  const pumpkin = new THREE.MeshStandardMaterial({ color: 0xd65a18, emissive: 0x4a1100, emissiveIntensity: 0.24, roughness: 0.82 });
  // A modeled staircase and gallery on the left preserve the central walking route.
  for (let i = 0; i < 12; i++) {
    const top = 0.17 + i * 0.2;
    block(room, wood, 1.55, top, 0.31, 1.6, top / 2 + 0.08, 1.8 + i * 0.31);
    block(room, velvet, 0.85, 0.025, 0.3, 1.6, top + 0.09, 1.8 + i * 0.31);
    block(room, iron, 0.045, 0.8, 0.045, 2.39, top + 0.5, 1.8 + i * 0.31);
  }
  const rail = block(room, gold, 0.07, 0.07, 4.4, 2.39, 2.08, 3.45); rail.rotation.x = -0.57;
  block(room, wood, 2.6, 0.16, 1.7, 1.65, 2.65, 6.2);
  solids.push({ minX: 0.72, maxX: 2.55, minZ: 1.55, maxZ: 7.1 });
  for (let i = 0; i < 10; i++) block(room, iron, 0.045, 0.85, 0.045, 0.4 + i * 0.27, 3.15, 5.35);
  block(room, gold, 2.6, 0.07, 0.07, 1.65, 3.61, 5.35);
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.32, 48), velvet);
  rug.rotation.x = -Math.PI / 2; rug.position.set(4.4, 0.095, 4.5); room.add(rug);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.025, 6, 48), gold);
  rim.rotation.x = Math.PI / 2; rim.position.set(4.4, 0.11, 4.5); room.add(rim);
  // Chandelier: hanging stem, two iron rings, radial arms and candle bodies.
  const chandelier = new THREE.Group(); chandelier.position.set(4.5, 3.5, 3.5); room.add(chandelier);
  block(chandelier, iron, 0.06, 0.6, 0.06, 0, 0.45, 0);
  for (const radius of [0.45, 0.9]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.035, 6, 32), iron); ring.rotation.x = Math.PI / 2; chandelier.add(ring);
    for (let i = 0; i < 8; i++) {
      const angle = i * Math.PI / 4, x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
      const arm = block(chandelier, gold, radius, 0.035, 0.035, x / 2, 0, z / 2); arm.rotation.y = -angle;
      block(chandelier, candle, 0.06, 0.23, 0.06, x, 0.12, z);
    }
  }
  for (const z of [2, 5.9]) {
    block(room, wood, 0.6, 0.85, 1.3, 7.15, 0.5, z);
    block(room, gold, 0.7, 0.08, 1.42, 7.15, 0.98, z);
    block(room, candle, 0.07, 0.3, 0.07, 7.15, 1.15, z);
    solids.push({ minX: 6.8, maxX: 7.5, minZ: z - 0.75, maxZ: z + 0.75 });
  }

  // Layered plaster panels and an arched, curtained opening add architectural
  // depth without using photographed rooms as walls.
  for (const x of [0.55, 1.65, 6.95, 7.5]) {
    block(room, plaster, 0.92, 2.75, 0.12, x, 2.05, 7.73);
    block(room, wood, 0.98, 0.08, 0.18, x, 0.66, 7.65);
    block(room, wood, 0.98, 0.08, 0.18, x, 3.46, 7.65);
  }
  for (const x of [2.8, 6]) {
    block(room, gold, 0.12, 3.2, 0.16, x, 2.04, 7.56);
    for (let fold = 0; fold < 4; fold++) {
      const drape = block(room, velvet, 0.2, 2.85 - fold * 0.12, 0.14,
        x + (x < 4 ? -0.12 - fold * 0.11 : 0.12 + fold * 0.11), 2.15 + fold * 0.06, 7.43);
      drape.rotation.z = (x < 4 ? -1 : 1) * (0.025 + fold * 0.012);
    }
  }
  block(room, gold, 3.28, 0.13, 0.18, 4.4, 3.66, 7.55);
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.075, 7, 28, Math.PI), gold);
  arch.position.set(4.4, 3.62, 7.53); room.add(arch);

  // Candle sconces, pumpkins and a physical portrait grouping echo the approved
  // foyer reference while keeping the walking route and console collisions clear.
  for (const x of [0.42, 7.72]) {
    block(room, iron, 0.08, 0.72, 0.18, x, 2.46, 3.75);
    block(room, gold, 0.42, 0.06, 0.24, x, 2.2, 3.75);
    for (const z of [3.58, 3.92]) block(room, candle, 0.075, 0.34, 0.075, x, 2.38, z);
  }
  const pumpkinGeometry = new THREE.SphereGeometry(1, 18, 12);
  for (const [x, z, scale] of [[3.15, 6.82, 0.34], [6.42, 6.55, 0.26]] as const) {
    for (let lobe = -2; lobe <= 2; lobe++) {
      const body = new THREE.Mesh(pumpkinGeometry, pumpkin);
      body.scale.set(scale * 0.72, scale, scale * 0.78);
      body.position.set(x + lobe * scale * 0.28, scale + 0.1, z + Math.abs(lobe) * scale * 0.025);
      body.castShadow = body.receiveShadow = true; room.add(body);
    }
    block(room, wood, 0.07, 0.15, 0.07, x, scale * 2 + 0.12, z);
    for (const eyeX of [-0.28, 0.28]) block(room, candle, scale * 0.16, scale * 0.13, 0.035,
      x + eyeX * scale, scale * 1.18, z - scale * 0.79);
    block(room, candle, scale * 0.42, scale * 0.08, 0.035, x, scale * 0.72, z - scale * 0.8);
  }
  const portrait = new THREE.Group(); portrait.position.set(0.18, 2.45, 5.45); portrait.rotation.y = Math.PI / 2; room.add(portrait);
  block(portrait, gold, 1.35, 1.75, 0.12, 0, 0, 0);
  block(portrait, new THREE.MeshStandardMaterial({ color: 0x21161d, roughness: 0.75 }), 1.08, 1.48, 0.08, 0, 0, -0.08);

  // Geometric line webs read as real room dressing and stay inexpensive.
  const webMaterial = new THREE.LineBasicMaterial({ color: 0xd8d0c4, transparent: true, opacity: 0.46 });
  const addWeb = (x: number, y: number, z: number, yaw: number) => {
    const web = new THREE.Group(); web.position.set(x, y, z); web.rotation.y = yaw; room.add(web);
    const points: THREE.Vector3[] = [];
    for (let spoke = 0; spoke < 7; spoke++) {
      const a = spoke * Math.PI / 12;
      points.push(new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0));
    }
    for (const radius of [0.28, 0.55, 0.82]) {
      for (let segment = 0; segment < 6; segment++) {
        const a = segment * Math.PI / 12;
        const b = (segment + 1) * Math.PI / 12;
        points.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0),
          new THREE.Vector3(Math.cos(b) * radius, Math.sin(b) * radius, 0));
      }
    }
    web.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(points), webMaterial));
  };
  addWeb(0.27, 3.35, 1.05, Math.PI / 2);
  addWeb(7.73, 3.4, 6.85, -Math.PI / 2);
}

