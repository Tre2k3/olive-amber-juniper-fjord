import * as THREE from "three";

export type GoalBoard = {
  x: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  nx: number;
};

const orange = new THREE.MeshStandardMaterial({
  color: 0xff5a1a,
  emissive: 0xe24100,
  emissiveIntensity: 0.55,
  roughness: 0.32,
  metalness: 0.62,
});
const pad = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.72, metalness: 0.2 });
const white = new THREE.MeshStandardMaterial({ color: 0xf7f7f5, roughness: 0.38, metalness: 0.08 });
const red = new THREE.MeshStandardMaterial({ color: 0xd01212, roughness: 0.4, metalness: 0.05 });
const cord = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.92, side: THREE.DoubleSide });

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: THREE.Material, parent: THREE.Object3D) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  parent.add(m);
  return m;
}

function boardTex() {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 320;
  const g = c.getContext("2d")!;
  g.fillStyle = "rgba(214, 230, 242, 0.55)";
  g.fillRect(0, 0, 512, 320);
  g.strokeStyle = "#f4f7fb";
  g.lineWidth = 26;
  g.strokeRect(18, 18, 476, 284);
  g.strokeStyle = "#e10600";
  g.lineWidth = 16;
  g.strokeRect(168, 156, 176, 112);
  g.fillStyle = "#14181e";
  g.font = "800 48px sans-serif";
  g.textAlign = "center";
  g.fillText("901", 256, 86);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const boardMap = boardTex();

function hangNet(rimX: number, rimY: number, z: number, parent: THREE.Object3D) {
  const R = 0.3;
  const strands = 12;
  for (let i = 0; i < strands; i++) {
    const a = (i / strands) * Math.PI * 2;
    const pts: THREE.Vector3[] = [];
    for (let s = 0; s <= 6; s++) {
      const t = s / 6;
      const r = R * (1 - t * 0.46);
      pts.push(new THREE.Vector3(Math.cos(a) * r, -t * 0.48, Math.sin(a) * r));
    }
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 7, 0.008, 4, false), cord);
    mesh.position.set(rimX, rimY - 0.02, z);
    parent.add(mesh);
  }
  for (let k = 1; k <= 4; k++) {
    const t = k / 5;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(R * (1 - t * 0.46), 0.007, 6, 18), cord);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(rimX, rimY - 0.02 - t * 0.48, z);
    parent.add(ring);
  }
}

/**
 * Regulation-shaped goal. `dir` 1 puts the glass's face and the rim toward +X.
 * Rim height stays at the playable 2.72 so existing shot scoring still lands.
 */
export function buildGoal(rimX: number, z: number, dir: 1 | -1, parent: THREE.Object3D) {
  const boardX = rimX - dir * 0.46;
  const poleX = rimX - dir * 1.55;
  const rimY = 2.72;
  const boardY = 3.18;

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 3.55, 12), pad);
  pole.position.set(poleX, 1.78, z);
  pole.castShadow = true;
  parent.add(pole);
  box(0.42, 0.08, 0.42, poleX, 0.05, z, pad, parent);
  const arm = box(Math.abs(boardX - poleX) + 0.08, 0.07, 0.1, (boardX + poleX) / 2, 3.78, z, pad, parent);
  arm.castShadow = true;
  box(0.08, 0.62, 0.1, boardX, boardY + 0.28, z, pad, parent);

  const glassMat = new THREE.MeshStandardMaterial({
    map: boardMap,
    roughness: 0.08,
    metalness: 0.05,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.22), glassMat);
  glass.position.set(boardX, boardY, z);
  glass.rotation.y = dir === 1 ? Math.PI / 2 : -Math.PI / 2;
  parent.add(glass);
  box(0.07, 0.07, 2.04, boardX, boardY + 0.64, z, white, parent);
  box(0.07, 0.07, 2.04, boardX, boardY - 0.64, z, white, parent);
  box(0.07, 1.28, 0.07, boardX, boardY, z - 0.98, white, parent);
  box(0.07, 1.28, 0.07, boardX, boardY, z + 0.98, white, parent);
  const target = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.4), red);
  target.position.set(boardX + dir * 0.03, boardY - 0.22, z);
  target.rotation.y = glass.rotation.y;
  parent.add(target);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.042, 12, 28), orange);
  rim.rotation.x = Math.PI / 2;
  rim.position.set(rimX, rimY, z);
  rim.castShadow = true;
  parent.add(rim);
  box(0.34, 0.055, 0.09, boardX + dir * 0.2, rimY, z, orange, parent);

  hangNet(rimX, rimY, z, parent);

  return {
    hoop: { x: rimX, z, y: rimY },
    board: { x: boardX, minY: boardY - 0.66, maxY: boardY + 0.66, minZ: z - 0.98, maxZ: z + 0.98, nx: dir } satisfies GoalBoard,
  };
}
