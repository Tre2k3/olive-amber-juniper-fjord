import * as THREE from "three";
import type { Solid } from "../../core/types";

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
      const tone = 45 + ((row * 13 + col * 7 + 43) % 28);
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
  const candle = new THREE.MeshStandardMaterial({ color: 0xffdd9b, emissive: 0xffa43b, emissiveIntensity: 0.75 }); glow.push(candle);
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
}
