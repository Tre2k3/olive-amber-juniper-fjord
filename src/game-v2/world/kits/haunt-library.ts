import * as THREE from "three";
import type { Solid } from "../../core/types";
import { hauntSurface } from "./haunt-architecture";

const animations = new WeakMap<THREE.Object3D, (time: number) => void>();
export function animateHauntLibrary(parent: THREE.Object3D, time: number) {
  animations.get(parent)?.(time);
}

// Small repeatable textile, drawn once; it never includes room or character art.
function libraryTextile() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 384;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#54212a"; ctx.fillRect(0, 0, 512, 384);
  ctx.strokeStyle = "#aa8354";
  for (const inset of [12, 19, 42, 48]) {
    ctx.lineWidth = inset === 42 ? 4 : 1.5;
    ctx.strokeRect(inset, inset, 512 - inset * 2, 384 - inset * 2);
  }
  const leaf = (x: number, y: number, size: number) => {
    ctx.beginPath(); ctx.moveTo(x, y - size);
    ctx.quadraticCurveTo(x + size, y, x, y + size);
    ctx.quadraticCurveTo(x - size, y, x, y - size); ctx.stroke();
  };
  ctx.lineWidth = 1.5;
  for (let x = 32; x < 490; x += 22) { leaf(x, 31, 7); leaf(x, 353, 7); }
  for (let y = 62; y < 330; y += 22) { leaf(31, y, 7); leaf(481, y, 7); }
  for (let x = 76; x < 460; x += 40) for (let y = 72; y < 330; y += 40) {
    leaf(x, y, 9); ctx.fillStyle = "#9a6849"; ctx.fillRect(x - 1, y - 1, 2, 2);
  }
  ctx.fillStyle = "#372729";
  ctx.beginPath(); ctx.ellipse(256, 192, 87, 112, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  for (let i = 0; i < 12; i++) {
    const a = i * Math.PI / 6;
    leaf(256 + Math.cos(a) * 45, 192 + Math.sin(a) * 67, 16);
  }
  leaf(256, 192, 35);
  // Deterministic faded fibers soften the design without per-frame work.
  for (let i = 0; i < 2400; i++) {
    ctx.fillStyle = i % 2 ? "#e3bc8020" : "#160f1428";
    ctx.fillRect((i * 137) % 512, (i * 83) % 384, 1, 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map, roughness: 0.98, color: 0xb4a29b });
}


/** Worn wood is a material surface, never a picture of a room. */
export function libraryWood() {
  const canvas = document.createElement("canvas");
  canvas.width = 512; canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  for (let row = 0; row < 8; row++) {
    const tone = 55 + row * 17 % 27;
    ctx.fillStyle = `rgb(${tone + 30},${tone + 7},${tone - 12})`;
    ctx.fillRect(0, row * 32, 512, 32);
    ctx.strokeStyle = "#21120955";
    ctx.lineWidth = .7;
    for (let line = 2; line < 31; line += 3) {
      ctx.beginPath();
      for (let x = 0; x <= 512; x += 8) {
        const y = row * 32 + line + Math.sin(x * Math.PI / 128 + row * .7) * 1.3;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.fillStyle = "#a77c4628"; ctx.fillRect(0, row * 32 + 1, 512, 1);
  }
  for (let i = 0; i < 1800; i++) {
    ctx.fillStyle = i % 3 ? "#d2a66a18" : "#1d100b35";
    ctx.fillRect(i * 137 % 512, i * 83 % 256, 1 + i % 5, 1);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  const bump = map.clone(); bump.colorSpace = THREE.NoColorSpace; bump.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ map, bumpMap: bump, bumpScale: .016, roughness: .64 });
}

/** Dense bindings are instanced: three book draw calls instead of ninety. */
export function buildLibraryBookcases(parent: THREE.Object3D) {
  const group = new THREE.Group(); group.name = "library-bound-books"; parent.add(group);
  const wood = libraryWood();
  const leather = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .9 });
  const gilt = new THREE.MeshStandardMaterial({ color: 0xa58b53, metalness: .4, roughness: .62 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xb4a180, roughness: .98 });
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const books = new THREE.InstancedMesh(geometry, leather, 120);
  const bands = new THREE.InstancedMesh(geometry, gilt, 480);
  const pages = new THREE.InstancedMesh(geometry, paper, 120);
  const matrix = new THREE.Matrix4(), rotation = new THREE.Quaternion();
  const position = new THREE.Vector3(), size = new THREE.Vector3();
  const colors = [0x69452c, 0x2d4b46, 0x571e2b, 0x63533b].map(c => new THREE.Color(c));
  let index = 0;
  const part = (w: number, h: number, d: number, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wood);
    mesh.position.set(x, y, z); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
  };
  for (let bay = 0; bay < 5; bay++) {
    const z = 1.15 + bay * 1.15;
    part(.12, 3.4, 1.1, 24.45, 1.8, z);
    for (const y of [.2, .95, 1.7, 2.5, 3.35]) part(.6, .06, 1.12, 24.7, y, z);
    for (const dz of [-.54, .54]) {
      part(.065, 3.35, .055, 24.97, 1.8, z + dz);
      part(.1, .1, .08, 24.98, 3.36, z + dz);
    }
    part(.64, .14, 1.14, 24.7, 3.51, z);
    part(.67, .035, 1.16, 24.7, 3.6, z);
    for (let book = 0; book < 6; book++) for (const base of [.23, .98, 1.73, 2.53]) {
      const h = .5 + (book + bay) % 3 * .075;
      const bz = z - .4 + book * .15;
      books.setMatrixAt(index, matrix.compose(position.set(24.75, base + h / 2, bz), rotation, size.set(.36, h, .105)));
      books.setColorAt(index, colors[(book + bay) % colors.length]!);
      pages.setMatrixAt(index, matrix.compose(position.set(24.745, base + h + .004, bz), rotation, size.set(.32, .008, .082)));
      for (let band = 0; band < 4; band++) {
        const by = base + (band === 0 ? .065 : band === 1 ? .13 : band === 2 ? h - .13 : h - .065);
        bands.setMatrixAt(index * 4 + band, matrix.compose(position.set(24.938, by, bz), rotation, size.set(.012, .009, .089)));
      }
      index++;
    }
  }
  for (const mesh of [books, bands, pages]) {
    mesh.castShadow = mesh.receiveShadow = true;
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere(); group.add(mesh);
  }
}

/** Furnishings inspired by the library reference, built from actual geometry. */
export function buildHauntLibrary(parent: THREE.Object3D, solids: Solid[], lights: THREE.PointLight[]) {
  const room = new THREE.Group();
  room.name = "haunt-3d-library";
  parent.add(room);
  const wood = libraryWood();
  const brass = new THREE.MeshStandardMaterial({ color: 0xa58246, metalness: 0.55, roughness: 0.46 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x211c19, metalness: 0.5, roughness: 0.62 });
  const velvet = new THREE.MeshStandardMaterial({ color: 0x62232b, roughness: 0.95 });
  const paper = new THREE.MeshStandardMaterial({ color: 0xc9b68c, roughness: 0.98 });
  const stone = hauntSurface("stone");
  const flame = new THREE.MeshBasicMaterial({ color: 0xf27a22, transparent: true, opacity: 0.8, depthWrite: false });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    room.add(mesh);
    return mesh;
  };
  const block = (w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material = wood) =>
    add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  const panel = (w: number, h: number, d: number, radius: number, x: number, y: number, z: number, mat: THREE.Material) => {
    const shape = new THREE.Shape();
    const l = -w / 2, r = w / 2, b = -h / 2, t = h / 2;
    shape.moveTo(l + radius, b); shape.lineTo(r - radius, b);
    shape.quadraticCurveTo(r, b, r, b + radius); shape.lineTo(r, t - radius);
    shape.quadraticCurveTo(r, t, r - radius, t); shape.lineTo(l + radius, t);
    shape.quadraticCurveTo(l, t, l, t - radius); shape.lineTo(l, b + radius);
    shape.quadraticCurveTo(l, b, l + radius, b);
    const geometry = new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: false, curveSegments: 4, steps: 1 });
    geometry.translate(0, 0, -d / 2);
    return add(geometry, mat, x, y, z);
  };
  // Shallow, physical wall treatment adds depth without narrowing the walkable route.
  // The east wall is split around its doorway, matching the existing solid wall sections.
  for (const z of [1.4, 6.4]) {
    block(0.075, 1.52, 2.34, 31.83, 0.86, z);
    block(0.11, 0.14, 2.48, 31.8, 1.63, z, brass);
    block(0.12, 0.18, 2.5, 31.79, 3.78, z);
    for (const panelZ of [z - 0.76, z, z + 0.76]) {
      const inset = panel(0.58, 1.12, 0.035, 0.045, 31.775, 0.84, panelZ, wood);
      inset.rotation.y = Math.PI / 2;
      const inner = panel(0.42, 0.92, 0.02, 0.035, 31.738, 0.84, panelZ, velvet);
      inner.rotation.y = Math.PI / 2;
    }
  }
  // A modest coffered crown makes the library read as architecture from the gameplay camera.
  for (const z of [0.45, 7.55]) block(7.25, 0.16, 0.2, 28.15, 3.82, z);
  for (const x of [24.55, 31.72]) block(0.2, 0.16, 7.1, x, 3.82, 4);
  for (const x of [26.35, 28.15, 29.95]) block(0.11, 0.1, 7.0, x, 3.73, 4, brass);

  const candle = (x: number, y: number, z: number, height: number) => {
    add(new THREE.CylinderGeometry(0.085, 0.13, 0.055, 10), brass, x, y + 0.025, z);
    add(new THREE.CylinderGeometry(0.035, 0.065, 0.13, 8), brass, x, y + 0.115, z);
    add(new THREE.CylinderGeometry(0.055, 0.065, height, 10), paper, x, y + 0.18 + height / 2, z);
    const light = add(new THREE.SphereGeometry(0.035, 8, 6), flame, x, y + 0.2 + height, z);
    light.scale.set(0.7, 2, 0.7); light.castShadow = false;
  };

  // Suspended iron-and-brass chandelier: actual geometry, not a ceiling image.
  const chandelier = new THREE.Group();
  chandelier.name = "library-candle-chandelier";
  room.add(chandelier);
  const chandelierX = 28.15, chandelierZ = 3.55, ringY = 2.86;
  const canopy = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.13, 0.08, 12), iron);
  canopy.position.set(chandelierX, 3.78, chandelierZ);
  canopy.castShadow = true; chandelier.add(canopy);
  const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.85, 7), iron);
  chain.position.set(chandelierX, 3.32, chandelierZ);
  chain.castShadow = true; chandelier.add(chain);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.035, 7, 32), iron);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(chandelierX, ringY, chandelierZ);
  ring.castShadow = true; chandelier.add(ring);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.16, 10), brass);
  hub.position.set(chandelierX, ringY, chandelierZ);
  hub.castShadow = true; chandelier.add(hub);
  const up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < 6; i++) {
    const angle = i * Math.PI / 3;
    const direction = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.026, 0.58, 7), brass);
    arm.quaternion.setFromUnitVectors(up, direction);
    arm.position.set(chandelierX + direction.x * 0.29, ringY, chandelierZ + direction.z * 0.29);
    arm.castShadow = true; chandelier.add(arm);
    const candleX = chandelierX + direction.x * 0.62;
    const candleZ = chandelierZ + direction.z * 0.62;
    candle(candleX, ringY + 0.01, candleZ, 0.24 + i % 2 * 0.05);
  }
  const chandelierLight = new THREE.PointLight(0xffb164, 0, 6.5, 2);
  chandelierLight.name = "library-chandelier-light";
  chandelierLight.userData.baseIntensity = 4.5;
  chandelierLight.position.set(chandelierX, 3.05, chandelierZ);
  room.add(chandelierLight);
  lights.push(chandelierLight);

  // Paired hearth sconces brighten the fireplace silhouette without adding lights.
  for (const x of [29.05, 31.85]) {
    const plate = panel(0.25, 0.5, 0.045, 0.09, x, 2.08, 7.28, wood);
    plate.castShadow = true;
    const bracket = add(new THREE.TorusGeometry(0.12, 0.018, 6, 16), brass, x, 1.96, 7.18);
    bracket.rotation.x = Math.PI / 2;
    candle(x, 1.96, 7.08, 0.3);
  }

  // Carved desk panels and separate legs retain the previous collision footprint.
  block(1.8, 0.13, 0.8, 27.2, 0.9, 4.6);
  for (const x of [26.45, 27.95]) for (const z of [4.32, 4.88]) block(0.12, 0.72, 0.12, x, 0.46, z);
  block(1.48, 0.32, 0.12, 27.2, 0.69, 4.25);
  for (const x of [26.72, 27.2, 27.68]) {
    block(0.4, 0.23, 0.035, x, 0.69, 4.17);
    block(0.13, 0.035, 0.06, x, 0.69, 4.14, brass);
  }
  // Open book: angled page blocks, spine and ink lines, never a room photograph.
  for (const side of [-1, 1]) {
    const pages = block(0.22, 0.045, 0.3, 27.28 + side * 0.11, 1.01, 4.48, paper);
    pages.rotation.z = side * 0.12;
    for (let line = 0; line < 5; line++) block(0.16, 0.006, 0.008,
      27.28 + side * 0.11, 1.045, 4.38 + line * 0.042, iron);
  }
  candle(26.7, 0.98, 4.62, 0.24);
  candle(26.92, 0.98, 4.74, 0.16);
  const globe = add(new THREE.SphereGeometry(0.18, 16, 12),
    new THREE.MeshStandardMaterial({ color: 0x435862, roughness: 0.72 }), 27.78, 1.24, 4.63);
  globe.rotation.z = 0.2;
  const globeRing = add(new THREE.TorusGeometry(0.205, 0.013, 6, 24), brass, 27.78, 1.24, 4.63);
  globeRing.rotation.y = Math.PI / 2;
  add(new THREE.CylinderGeometry(0.1, 0.13, 0.075, 12), iron, 27.78, 1.005, 4.63);

  // Tufted armchair sits outside the east-west doorway corridor.
  const cx = 28.65, cz = 6;
  for (const x of [cx - 0.38, cx + 0.38]) for (const z of [cz - 0.33, cz + 0.33]) block(0.095, 0.42, 0.095, x, 0.28, z);
  block(0.98, 0.15, 0.9, cx, 0.55, cz);
  const seat = panel(0.82, 0.76, 0.17, 0.12, cx, 0.69, cz, velvet);
  seat.rotation.x = -Math.PI / 2;
  panel(0.92, 1.2, 0.12, 0.2, cx, 1.18, cz + 0.34, wood);
  panel(0.77, 0.99, 0.16, 0.18, cx, 1.22, cz + 0.25, velvet);
  const crown = add(new THREE.TorusGeometry(0.21, 0.025, 6, 24), wood, cx, 1.75, cz + 0.34);
  crown.scale.set(1.55, 0.65, 1);
  add(new THREE.SphereGeometry(0.055, 8, 6), brass, cx, 1.89, cz + 0.34);
  for (const x of [cx - 0.48, cx + 0.48]) {
    block(0.12, 0.54, 0.12, x, 0.77, cz - 0.28);
    block(0.15, 0.13, 0.8, x, 1.05, cz);
  }
  for (const x of [cx - 0.22, cx, cx + 0.22]) for (const y of [0.98, 1.23, 1.48])
    add(new THREE.SphereGeometry(0.025, 6, 4), brass, x, y, cz + 0.16);
  // Upholstery nail trim follows the inset, rather than extending the collider.
  const nails = new THREE.InstancedMesh(new THREE.SphereGeometry(0.012, 4, 3), brass, 20);
  let nailIndex = 0;
  for (const x of [cx - 0.33, cx + 0.33]) for (let i = 0; i < 10; i++)
    nails.setMatrixAt(nailIndex++, new THREE.Matrix4().makeTranslation(x, 0.83 + i * 0.075, cz + 0.16));
  nails.receiveShadow = true; room.add(nails);
  solids.push({ minX: cx - 0.56, maxX: cx + 0.56, minZ: cz - 0.5, maxZ: cz + 0.48 });

  // Shelf ladder and brass rail create depth against the existing bookcases.
  block(0.055, 0.055, 5.7, 25.12, 2.66, 3.45, brass);
  for (const z of [1.32, 1.94]) {
    const side = block(0.065, 2.7, 0.065, 25.45, 1.43, z);
    side.rotation.z = 0.23;
  }
  for (let i = 0; i < 8; i++) block(0.085, 0.06, 0.7, 25.75 - i * 0.075, 0.3 + i * 0.3, 1.63);
  solids.push({ minX: 25.05, maxX: 25.9, minZ: 1.17, maxZ: 2.1 });

  // Shallow fireplace leaves the north doorway at x=28 clear.
  const fx = 30.55, fz = 7.45;
  block(1.65, 0.13, 0.85, fx, 0.16, fz - 0.1, stone);
  const soot = hauntSurface("stone");
  soot.color.set(0x39302b);
  block(1.45, 1.42, 0.13, fx, 0.86, fz + 0.21, soot);
  for (const x of [fx - 0.69, fx + 0.69]) block(0.25, 1.5, 0.45, x, 0.97, fz, stone);
  block(1.76, 0.2, 0.62, fx, 1.76, fz, wood);
  block(1.43, 0.16, 0.35, fx, 1.52, fz, stone);
  block(1.83, 0.055, 0.67, fx, 1.89, fz, wood);
  for (const x of [fx - 0.69, fx + 0.69]) {
    block(0.28, 0.08, 0.48, x, 0.27, fz, stone);
    block(0.29, 0.08, 0.48, x, 1.6, fz, stone);
    for (let i = 0; i < 3; i++) block(0.012, 1.1, 0.015, x - 0.065 + i * 0.065, 0.98, fz - 0.234, brass);
  }
  const mantelRosette = add(new THREE.TorusGeometry(0.065, 0.018, 6, 12), brass, fx, 1.77, fz - 0.317);
  mantelRosette.scale.x = 1.7;
  // Layered over-mantel frame and dark aged mirror are real shallow geometry.
  panel(1.32, 1.08, 0.08, 0.12, fx, 2.55, fz - 0.265, wood);
  panel(1.05, 0.81, 0.035, 0.1, fx, 2.55, fz - 0.318,
    new THREE.MeshStandardMaterial({ color: 0x17191a, metalness: 0.28, roughness: 0.3 }));
  for (const x of [fx - 0.58, fx + 0.58]) {
    add(new THREE.SphereGeometry(0.055, 8, 6), brass, x, 2.55, fz - 0.36);
  }
  const crest = add(new THREE.TorusGeometry(0.19, 0.026, 7, 24), wood, fx, 3.13, fz - 0.3);
  crest.scale.set(1.6, 0.72, 1);
  const charcoal = new THREE.MeshStandardMaterial({ color: 0x251a13, roughness: 1 });
  const ember = new THREE.MeshBasicMaterial({ color: 0xc9400e });
  for (const x of [fx - 0.28, fx + 0.23]) {
    const log = add(new THREE.CylinderGeometry(0.075, 0.06, 0.65, 8), charcoal, x, 0.36, fz - 0.04);
    log.rotation.z = Math.PI / 2;
    for (let i = 0; i < 3; i++) block(0.055, 0.016, 0.022, x - 0.2 + i * 0.18, 0.415, fz - 0.06, ember);
  }
  // Tapered volumes share geometry; animate transforms rather than allocating
  // particles, textures or extra point lights each frame.
  const flameGeometry = new THREE.LatheGeometry([
    new THREE.Vector2(0, 0), new THREE.Vector2(0.07, 0.035),
    new THREE.Vector2(0.055, 0.14), new THREE.Vector2(0.025, 0.28),
    new THREE.Vector2(0, 0.42),
  ], 8);
  const goldFlame = new THREE.MeshBasicMaterial({ color: 0xffba45, transparent: true, opacity: 0.85, depthWrite: false });
  const fires: THREE.Group[] = [];
  for (let i = 0; i < 7; i++) {
    const fire = new THREE.Group(); fire.name = "library-hearth-flame";
    fire.position.set(fx - 0.39 + i * 0.13, 0.38, fz - 0.14);
    const outer = new THREE.Mesh(flameGeometry, flame);
    const inner = new THREE.Mesh(flameGeometry, goldFlame);
    inner.scale.set(0.5, 0.65, 0.5); inner.position.set(0, 0.01, -0.045);
    fire.add(outer, inner); room.add(fire); fires.push(fire);
  }
  // Low grate stands in front of the logs and leaves the flames readable.
  for (let i = 0; i < 7; i++) block(0.022, 0.2, 0.028, fx - 0.44 + i * 0.145, 0.36, fz - 0.3, iron);
  block(1.02, 0.025, 0.03, fx, 0.45, fz - 0.3, iron);
  candle(fx - 0.6, 1.87, fz, 0.22);
  candle(fx + 0.55, 1.87, fz, 0.3);
  const hearthLight = new THREE.PointLight(0xff8c3b, 0, 7, 2);
  hearthLight.name = "library-hearth-light";
  hearthLight.userData.baseIntensity = 4.5;
  hearthLight.position.set(fx, 0.8, fz - 0.6);
  room.add(hearthLight);
  lights.push(hearthLight);
  animations.set(parent, (time) => {
    fires.forEach((fire, i) => {
      fire.scale.set(0.82 + Math.sin(time * 3.1 + i * 1.8) * 0.1,
        0.85 + i % 3 * 0.14 + Math.sin(time * 5.2 + i * 2.3) * 0.14, 0.7);
      fire.rotation.z = Math.sin(time * 2.8 + i * 1.7) * 0.12;
    });
    if (hearthLight.visible) hearthLight.intensity = 4.5 * (0.94 + Math.sin(time * 7.2) * 0.06);
  });
  solids.push({ minX: fx - 0.88, maxX: fx + 0.88, minZ: fz - 0.58, maxZ: 7.9 });
  // Physical rug border stays flush with the existing floor.
  const rug = add(new THREE.PlaneGeometry(3.6, 2.8), libraryTextile(), 28.3, 0.104, 5.4);
  rug.rotation.x = -Math.PI / 2;
  rug.castShadow = false;
  for (const z of [4.08, 6.72]) block(3.45, 0.008, 0.025, 28.3, 0.107, z, brass);
  for (const x of [26.62, 29.98]) block(0.025, 0.008, 2.6, x, 0.107, 5.4, brass);
}
