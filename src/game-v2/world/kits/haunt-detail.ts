import * as THREE from "three";

/**
 * Haunted-house detail. Everything here is set dressing on top of the real
 * architecture in haunt.ts: it never adds collision, it keeps the door lines
 * and room centres clear, and it is built from geometry and materials only.
 * Rooms are 8 m squares at (col·8, row·8) in haunt-local coordinates.
 *
 * Also owns the apparition: one translucent figure that drifts a fixed route
 * through the Portrait Hall, Seance and Dining Hall and fades out whenever
 * the player gets close — a controlled effect, never something in the way.
 */

type M = THREE.Material;
const std = (
  color: number,
  roughness = 0.7,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

const mats = {
  wood: std(0x5e3a26, 0.75),
  darkWood: std(0x2e1a12, 0.7),
  iron: std(0x3a3d42, 0.45, { metalness: 0.6 }),
  brass: std(0xb8923a, 0.35, { metalness: 0.6 }),
  velvet: std(0x5a1030, 0.85),
  linen: std(0xd9cfbf, 0.9),
  bone: std(0xe8dfc8, 0.6),
  glass: std(0xa9d8ff, 0.05, { transparent: true, opacity: 0.35, metalness: 0.1 }),
  ember: std(0xff6a1a, 0.4, { emissive: 0xff5a10, emissiveIntensity: 1.4 }),
  web: new THREE.MeshBasicMaterial({
    color: 0xdedede,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  paper: std(0xcbb089, 0.95),
  cloth: std(0x8a8f99, 0.95),
  toy: std(0xd23b3b, 0.5),
  toyBlue: std(0x2d5fd0, 0.5),
};

function mesh(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  m: M,
  x: number,
  y: number,
  z: number,
  ry = 0,
  rx = 0,
  rz = 0,
) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.rotation.set(rx, ry, rz);
  parent.add(o);
  return o;
}
const box = (
  p: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m: M,
  ry = 0,
) => mesh(p, new THREE.BoxGeometry(w, h, d), m, x, y, z, ry);
const cyl = (
  p: THREE.Object3D,
  r: number,
  h: number,
  x: number,
  y: number,
  z: number,
  m: M,
  rz = 0,
  rx = 0,
  seg = 10,
) => mesh(p, new THREE.CylinderGeometry(r, r, h, seg), m, x, y, z, 0, rx, rz);

/** Translucent cobweb in a wall corner: two crossed triangles. */
function cobweb(p: THREE.Object3D, x: number, y: number, z: number, ry: number, size = 0.9) {
  const tri = new THREE.BufferGeometry();
  tri.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      [0, 0, 0, size, 0, 0, 0, -size, 0, 0, 0, 0, 0, -size, 0, 0, 0, size],
      3,
    ),
  );
  const w = new THREE.Mesh(tri, mats.web);
  w.position.set(x, y, z);
  w.rotation.y = ry;
  p.add(w);
  // Strands.
  for (let i = 1; i <= 3; i++) {
    const t = i / 4;
    const strand = new THREE.Mesh(
      new THREE.BoxGeometry(size * (1 - t) * 1.4, 0.008, 0.008),
      mats.web,
    );
    strand.position.set(size * t * 0.5, -size * t, 0);
    strand.rotation.z = -0.78;
    w.add(strand);
  }
}

function frame(
  p: THREE.Object3D,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  ry: number,
  canvas: M,
  eyes = false,
) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.y = ry;
  box(g, w + 0.16, h + 0.16, 0.06, 0, 0, 0, mats.brass);
  box(g, w, h, 0.02, 0, 0, 0.035, canvas);
  if (eyes) {
    const eye = std(0xfff2c0, 0.2, { emissive: 0xffe08a, emissiveIntensity: 0.9 });
    for (const ex of [-0.11, 0.11])
      mesh(g, new THREE.SphereGeometry(0.022, 8, 6), eye, ex, h * 0.18, 0.05);
  }
  p.add(g);
}

function chair(p: THREE.Object3D, x: number, z: number, ry: number, m: M = mats.darkWood) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.rotation.y = ry;
  box(g, 0.44, 0.05, 0.44, 0, 0.46, 0, m);
  box(g, 0.44, 0.5, 0.05, 0, 0.74, -0.2, m);
  for (const [lx, lz] of [
    [-0.19, -0.19],
    [0.19, -0.19],
    [-0.19, 0.19],
    [0.19, 0.19],
  ])
    box(g, 0.04, 0.46, 0.04, lx, 0.23, lz, m);
  p.add(g);
}

function candelabra(p: THREE.Object3D, x: number, y: number, z: number, wax: M) {
  cyl(p, 0.03, 0.5, x, y + 0.25, z, mats.brass);
  cyl(p, 0.12, 0.03, x, y, z, mats.brass);
  for (const dx of [-0.16, 0, 0.16]) {
    box(p, 0.34, 0.025, 0.025, x, y + 0.5, z, mats.brass);
    cyl(p, 0.025, 0.14, x + dx, y + 0.58, z, wax, 0, 0, 6);
    mesh(p, new THREE.SphereGeometry(0.03, 6, 5), mats.ember, x + dx, y + 0.69, z);
  }
}

export type Apparition = {
  group: THREE.Group;
  light: THREE.PointLight;
  material: THREE.MeshStandardMaterial;
  route: { x: number; z: number }[];
  t: number;
};

function apparition(parent: THREE.Object3D): Apparition {
  const g = new THREE.Group();
  const material = std(0xcfe6ff, 0.9, {
    transparent: true,
    opacity: 0.32,
    emissive: 0x9ec8ff,
    emissiveIntensity: 0.6,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  // A tall tapered shroud with a head: readable as a figure from any side, never a face.
  mesh(g, new THREE.ConeGeometry(0.42, 1.9, 14, 1, true), material, 0, 0.95, 0, 0, Math.PI);
  mesh(g, new THREE.SphereGeometry(0.19, 12, 10), material, 0, 1.95, 0);
  for (const s of [-1, 1])
    mesh(
      g,
      new THREE.ConeGeometry(0.1, 0.7, 8, 1, true),
      material,
      s * 0.36,
      1.35,
      0.1,
      0,
      0,
      s * 0.55,
    );
  const light = new THREE.PointLight(0x9ec8ff, 6, 5, 2);
  light.position.set(0, 1.4, 0);
  g.add(light);
  g.name = "haunt-apparition";
  parent.add(g);
  return {
    group: g,
    light,
    material,
    route: [
      { x: 17, z: 2 },
      { x: 22.5, z: 6.5 },
      { x: 20, z: 12 },
      { x: 13, z: 13.5 },
      { x: 11, z: 9.5 },
      { x: 18, z: 5 },
    ],
    t: 0,
  };
}

/** Drift along the route; fade to nothing within 3.5 m of the player so it never blocks the way. */
export function updateApparition(a: Apparition, dt: number, playerX: number, playerLocalZ: number) {
  a.t = (a.t + dt * 0.045) % 1;
  const n = a.route.length;
  const f = a.t * n;
  const i = Math.floor(f);
  const k = f - i;
  const p0 = a.route[i % n]!;
  const p1 = a.route[(i + 1) % n]!;
  const x = p0.x + (p1.x - p0.x) * k;
  const z = p0.z + (p1.z - p0.z) * k;
  const bob = Math.sin(performance.now() / 700) * 0.08;
  a.group.position.set(x, 0.12 + bob, z);
  a.group.rotation.y = Math.atan2(p1.x - p0.x, p1.z - p0.z);
  const d = Math.hypot(playerX - x, playerLocalZ - z);
  const presence = THREE.MathUtils.clamp((d - 3.5) / 2.5, 0, 1);
  a.material.opacity = 0.32 * presence;
  a.light.intensity = 6 * presence;
  a.group.visible = presence > 0.02;
}

export function dressHauntDetail(
  group: THREE.Object3D,
  wax: M,
): { apparition: Apparition; motes: THREE.Points } {
  // ---- Stair Hall (8..16, 0..8): grandfather clock, sconces, runner ----
  box(group, 0.6, 2.1, 0.42, 8.7, 1.05, 6.6, mats.darkWood);
  mesh(group, new THREE.CircleGeometry(0.2, 20), mats.bone, 9.01, 1.72, 6.6, Math.PI / 2);
  cyl(group, 0.05, 0.9, 8.7, 0.95, 6.6, mats.brass);
  box(group, 5.6, 0.02, 1.4, 12, 0.095, 4, mats.velvet);
  for (const z of [2.2, 5.8]) candelabra(group, 15.4, 1.3, z, wax);
  cobweb(group, 8.4, 3.9, 0.4, 0.78);
  cobweb(group, 15.6, 3.9, 7.6, -2.35);

  // ---- Portrait Hall (16..24): a full gallery with watching eyes, busts, runner ----
  const dark = std(0x1c1418, 0.9);
  for (let i = 0; i < 5; i++) {
    frame(group, 0.9, 1.3, 16.38, 1.9, 1.2 + i * 1.35, Math.PI / 2, dark, i % 2 === 0);
    frame(group, 0.9, 1.3, 23.62, 1.9, 1.2 + i * 1.35, -Math.PI / 2, dark, i % 2 === 1);
  }
  frame(group, 1.9, 1.3, 20, 2.2, 7.62, Math.PI, std(0x3a1c2a, 0.9), true);
  for (const x of [17.1, 22.9]) {
    box(group, 0.4, 1.05, 0.4, x, 0.53, 0.9, std(0x8a8c90, 0.5));
    mesh(group, new THREE.SphereGeometry(0.2, 12, 10), mats.bone, x, 1.3, 0.9);
    box(group, 0.5, 0.08, 0.5, x, 1.08, 0.9, mats.bone);
  }
  box(group, 1.6, 0.02, 7, 20, 0.095, 4, mats.velvet);
  cobweb(group, 16.5, 3.8, 0.4, 0.78, 1.1);

  // ---- Attic (32..40): trunks, dust sheets, dress form, lantern ----
  for (const [x, z, ry] of [
    [33.4, 1.3, 0.2],
    [38.2, 1.6, -0.4],
    [38.6, 6.4, 0.1],
  ] as const) {
    box(group, 1.1, 0.6, 0.65, x, 0.32, z, mats.darkWood, ry);
    box(group, 1.12, 0.08, 0.67, x, 0.66, z, mats.brass, ry);
  }
  for (const [x, z] of [
    [33.6, 6.6],
    [36.8, 1.1],
  ] as const) {
    box(group, 1.3, 0.9, 1.0, x, 0.47, z, mats.cloth);
    box(group, 1.45, 0.06, 1.15, x, 0.95, z, mats.cloth);
  }
  cyl(group, 0.03, 1.3, 36.2, 0.65, 6.6, mats.iron);
  mesh(group, new THREE.CylinderGeometry(0.16, 0.24, 0.6, 10), mats.linen, 36.2, 1.55, 6.6);
  mesh(group, new THREE.SphereGeometry(0.11, 8, 6), mats.linen, 36.2, 1.98, 6.6);
  box(group, 0.16, 0.22, 0.16, 36, 3.4, 4, mats.iron);
  mesh(group, new THREE.SphereGeometry(0.06, 8, 6), mats.ember, 36, 3.32, 4);
  for (const [x, z, r] of [
    [32.4, 0.5, 0.78],
    [39.6, 0.5, -0.78],
    [32.4, 7.5, 2.35],
    [39.6, 7.5, -2.35],
  ] as const)
    cobweb(group, x, 3.7, z, r, 1.2);

  // ---- Toy Room (0..8, 8..16): crib, rocking horse, soldiers, music box, mobile ----
  const crib = new THREE.Group();
  crib.position.set(6.2, 0, 10);
  box(crib, 1.3, 0.08, 0.7, 0, 0.5, 0, mats.linen);
  for (let i = 0; i < 9; i++)
    for (const s of [-1, 1])
      box(crib, 0.03, 0.75, 0.03, -0.6 + i * 0.15, 0.62, s * 0.33, mats.bone);
  for (const s of [-1, 1]) box(crib, 1.3, 0.04, 0.04, 0, 1.0, s * 0.33, mats.bone);
  group.add(crib);
  const horse = new THREE.Group();
  horse.position.set(1.4, 0, 14.6);
  horse.rotation.y = 0.5;
  box(horse, 0.9, 0.25, 0.3, 0, 0.55, 0, mats.toy);
  box(horse, 0.25, 0.35, 0.25, 0.45, 0.85, 0, mats.toy);
  box(horse, 0.35, 0.18, 0.2, 0.62, 0.92, 0, mats.toy);
  for (const s of [-1, 1])
    mesh(
      horse,
      new THREE.TorusGeometry(0.42, 0.04, 6, 12, Math.PI),
      mats.wood,
      0,
      0.35,
      s * 0.17,
      0,
      0,
      Math.PI,
    );
  group.add(horse);
  for (let i = 0; i < 6; i++) {
    cyl(group, 0.05, 0.22, 1.2 + i * 0.26, 1.05, 9.0, i % 2 ? mats.toyBlue : mats.toy, 0, 0, 6);
    mesh(group, new THREE.SphereGeometry(0.05, 6, 5), mats.bone, 1.2 + i * 0.26, 1.2, 9.0);
  }
  box(group, 1.8, 0.9, 0.5, 1.9, 0.45, 9.0, mats.darkWood);
  box(group, 0.3, 0.16, 0.2, 5.6, 1.1, 14.2, mats.brass);
  box(group, 0.6, 0.95, 0.4, 5.6, 0.5, 14.2, mats.wood);
  const mobile = new THREE.Group();
  mobile.position.set(6.2, 3.1, 10);
  cyl(mobile, 0.01, 1.2, 0, -0.6, 0, mats.iron);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    box(mobile, 0.5, 0.01, 0.01, Math.cos(a) * 0.25, -1.2, Math.sin(a) * 0.25, mats.iron, a);
    mesh(
      mobile,
      new THREE.SphereGeometry(0.06, 6, 5),
      i % 2 ? mats.toy : mats.toyBlue,
      Math.cos(a) * 0.48,
      -1.45,
      Math.sin(a) * 0.48,
    );
  }
  group.add(mobile);
  // Striped wallpaper band.
  for (let i = 0; i < 14; i++)
    box(
      group,
      0.08,
      2.2,
      0.03,
      0.9 + i * 0.5,
      1.6,
      8.36,
      i % 2 ? std(0x7b4a9c, 0.9) : std(0x5a2f7a, 0.9),
    );

  // ---- Dining Hall (8..16): chairs, chandelier, settings, sideboard, painting ----
  for (const cx of [10.2, 11.4, 12.6, 13.6]) {
    chair(group, cx, 10.9, Math.PI);
    chair(group, cx, 13.5, 0);
  }
  for (const cx of [10.4, 11.6, 12.8, 13.6]) {
    mesh(group, new THREE.CylinderGeometry(0.14, 0.14, 0.015, 16), mats.bone, cx, 0.85, 11.85);
    mesh(group, new THREE.CylinderGeometry(0.14, 0.14, 0.015, 16), mats.bone, cx, 0.85, 12.55);
    cyl(group, 0.035, 0.16, cx + 0.22, 0.93, 11.85, mats.glass, 0, 0, 8);
  }
  const chand = new THREE.Group();
  chand.position.set(12, 3.2, 12.2);
  cyl(chand, 0.015, 0.8, 0, 0.4, 0, mats.iron);
  mesh(chand, new THREE.TorusGeometry(0.5, 0.03, 6, 18), mats.brass, 0, 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    cyl(chand, 0.02, 0.14, Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5, wax, 0, 0, 6);
    mesh(
      chand,
      new THREE.SphereGeometry(0.025, 6, 5),
      mats.ember,
      Math.cos(a) * 0.5,
      0.2,
      Math.sin(a) * 0.5,
    );
  }
  group.add(chand);
  box(group, 2.4, 1.0, 0.5, 11.5, 0.5, 15.35, mats.darkWood);
  box(group, 2.5, 0.06, 0.55, 11.5, 1.03, 15.35, mats.wood);
  frame(group, 1.6, 1.1, 14.2, 2.2, 15.62, Math.PI, std(0x24101a, 0.9));

  // ---- Seance (16..24): crystal ball, spirit board, curtains, chairs, cards ----
  const crystal = new THREE.Mesh(
    new THREE.SphereGeometry(0.17, 16, 12),
    std(0xcfe9ff, 0.05, {
      emissive: 0x7fb6ff,
      emissiveIntensity: 0.9,
      transparent: true,
      opacity: 0.8,
    }),
  );
  crystal.position.set(20, 0.98, 12);
  crystal.name = "haunt-crystal-ball";
  group.add(crystal);
  mesh(group, new THREE.CylinderGeometry(0.1, 0.14, 0.08, 10), mats.brass, 20, 0.84, 12);
  const ouija = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), mats.paper);
  ouija.rotation.x = -Math.PI / 2;
  ouija.position.set(20.5, 0.81, 11.55);
  group.add(ouija);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    chair(group, 20 + Math.cos(a) * 1.5, 12 + Math.sin(a) * 1.5, -a + Math.PI / 2);
  }
  for (const x of [16.6, 23.4]) {
    box(group, 0.3, 3.6, 2.2, x, 1.8, 9.6, mats.velvet);
    box(group, 0.3, 3.6, 2.2, x, 1.8, 14.4, mats.velvet);
  }
  for (let i = 0; i < 5; i++)
    mesh(
      group,
      new THREE.PlaneGeometry(0.1, 0.14),
      mats.paper,
      19.2 + i * 0.12,
      0.82,
      12.6,
      0,
      -Math.PI / 2,
      i * 0.3,
    );

  // ---- Kitchen (24..32): knife rack, hanging pots, stove embers, cleaver, sink ----
  box(group, 1.2, 0.5, 0.05, 28.2, 1.7, 8.4, mats.darkWood);
  for (let i = 0; i < 6; i++) {
    mesh(
      group,
      new THREE.ConeGeometry(0.03, 0.28, 4),
      mats.iron,
      27.75 + i * 0.18,
      1.52,
      8.45,
      0,
      Math.PI,
    );
    box(group, 0.03, 0.09, 0.03, 27.75 + i * 0.18, 1.72, 8.45, mats.wood);
  }
  box(group, 3.0, 0.04, 0.04, 26.2, 2.6, 10.6, mats.iron);
  for (let i = 0; i < 5; i++) {
    cyl(group, 0.006, 0.4, 25 + i * 0.6, 2.4, 10.6, mats.iron);
    mesh(
      group,
      new THREE.CylinderGeometry(0.13, 0.11, 0.14, 10),
      mats.iron,
      25 + i * 0.6,
      2.13,
      10.6,
    );
  }
  box(group, 1.1, 0.9, 0.7, 30.6, 0.45, 9.0, mats.iron);
  box(group, 0.7, 0.3, 0.04, 30.6, 0.4, 9.37, mats.ember);
  box(group, 0.5, 0.3, 0.5, 31.2, 1.06, 13.4, mats.wood);
  box(group, 0.04, 0.22, 0.14, 31.2, 1.35, 13.4, mats.iron, 0.3);
  box(group, 1.0, 0.5, 0.6, 25.2, 1.0, 14.6, std(0x9aa3a8, 0.35, { metalness: 0.5 }));
  cyl(group, 0.015, 0.4, 25.2, 1.45, 14.85, mats.brass);
  for (const [x, z, r] of [
    [24.5, 8.5, 0.78],
    [31.5, 15.5, -2.35],
  ] as const)
    cobweb(group, x, 3.7, z, r);

  // ---- Boiler (32..40): furnace, gauges, valve wheels, pipe runs, hazard stripes ----
  box(group, 1.8, 1.9, 1.1, 33.4, 0.95, 15.0, mats.iron);
  mesh(
    group,
    new THREE.CircleGeometry(0.42, 20),
    std(0x0c0a08, 0.9),
    33.4,
    0.95,
    15.56 - 1.11 + 0.56,
    0,
  );
  for (let i = 0; i < 5; i++)
    box(group, 0.72, 0.04, 0.03, 33.4, 0.65 + i * 0.15, 15.01 - 1.1 / 2 - 0.02, mats.iron);
  box(group, 0.7, 0.5, 0.05, 33.4, 0.9, 14.42, mats.ember);
  cyl(group, 0.5, 1.6, 38.2, 0.8, 14.8, mats.iron, 0, 0, 16);
  mesh(
    group,
    new THREE.SphereGeometry(0.5, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    mats.iron,
    38.2,
    1.6,
    14.8,
  );
  for (const [x, z] of [
    [36.4, 15.6],
    [37.4, 15.6],
    [39.3, 13.6],
  ] as const) {
    mesh(
      group,
      new THREE.CylinderGeometry(0.16, 0.16, 0.06, 16),
      mats.bone,
      x,
      2.0,
      z,
      0,
      Math.PI / 2,
    );
    mesh(group, new THREE.TorusGeometry(0.16, 0.02, 6, 16), mats.brass, x, 2.0, z - 0.03);
  }
  for (const [x, y, z, rz, rx, len] of [
    [36, 3.4, 12, Math.PI / 2, 0, 7.4],
    [32.4, 2.8, 12, 0, Math.PI / 2, 7],
    [39.6, 2.4, 12, 0, Math.PI / 2, 7],
    [36, 1.3, 15.4, Math.PI / 2, 0, 6],
  ] as const)
    cyl(group, 0.09, len, x, y, z, mats.iron, rz, rx);
  for (const [x, z] of [
    [34.4, 15.4],
    [37.6, 15.4],
    [32.4, 10.2],
  ] as const)
    mesh(
      group,
      new THREE.TorusGeometry(0.17, 0.025, 6, 14),
      std(0xb03030, 0.5),
      x,
      1.3,
      z,
      0,
      Math.PI / 2,
    );
  for (let i = 0; i < 10; i++)
    box(
      group,
      0.4,
      0.12,
      0.02,
      32.6 + i * 0.8,
      0.14,
      8.4,
      i % 2 ? std(0xf0c020, 0.6) : std(0x111111, 0.6),
    );
  // Steam: a few faint cones at pipe joints.
  const steam = new THREE.MeshBasicMaterial({
    color: 0xcfd8dc,
    transparent: true,
    opacity: 0.12,
    depthWrite: false,
  });
  for (const [x, z] of [
    [33.2, 15.4],
    [38.9, 15.3],
  ] as const)
    mesh(group, new THREE.ConeGeometry(0.25, 0.9, 8, 1, true), steam, x, 1.9, z, 0, Math.PI);

  // ---- Dust motes through the whole house ----
  const count = 900;
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = Math.random() * 48;
    pos[i * 3 + 1] = 0.3 + Math.random() * 3.2;
    pos[i * 3 + 2] = Math.random() * 16;
  }
  const dust = new THREE.BufferGeometry();
  dust.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  const motes = new THREE.Points(
    dust,
    new THREE.PointsMaterial({
      color: 0xffe9c4,
      size: 0.03,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  motes.name = "haunt-dust";
  group.add(motes);

  return { apparition: apparition(group), motes };
}

/** Slow drift for the dust and a pulse for the crystal ball. */
export function animateHauntDetail(motes: THREE.Points, group: THREE.Object3D, t: number) {
  motes.position.y = Math.sin(t * 0.25) * 0.12;
  motes.position.x = Math.sin(t * 0.11) * 0.2;
  const crystal = group.getObjectByName("haunt-crystal-ball") as THREE.Mesh | undefined;
  if (crystal)
    (crystal.material as THREE.MeshStandardMaterial).emissiveIntensity =
      0.6 + Math.sin(t * 1.7) * 0.35;
}
