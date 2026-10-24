import * as THREE from "three";

/**
 * 901 Bowl interior. The brick shell, four lanes, arrows, pins, seats and
 * neon sign come from districts.ts; this dresses it so the lanes stop sitting
 * in the dark: an always-on light rig (the street lamps are night-only and
 * rationed), a masking unit over the pin decks, ball returns with spare
 * balls, approach dots, neon rails and score monitors. Geometry only, no
 * assets. Lane centres are x−4.6 + i·2.3; foul line is z+5.5; pin decks start
 * at z−5.3.
 */

const mat = (
  color: number,
  roughness = 0.6,
  extra: Partial<THREE.MeshStandardMaterialParameters> = {},
) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });

function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  x: number,
  y: number,
  z: number,
  m: THREE.Material,
) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

function canvasSign(
  lines: { text: string; color: string; size: number }[],
  w = 1024,
  h = 256,
  bg = "#0b0b12",
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.textAlign = "center";
  g.textBaseline = "middle";
  let y = h / (lines.length + 1);
  for (const line of lines) {
    g.font = `bold ${line.size}px 'Bebas Neue', 'DM Sans', sans-serif`;
    g.shadowColor = line.color;
    g.shadowBlur = 18;
    g.fillStyle = line.color;
    g.fillText(line.text, w / 2, y);
    y += h / (lines.length + 1);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function dressBowlingAlley(parent: THREE.Object3D, x: number, z: number) {
  const g = new THREE.Group();
  g.name = "901-bowl-interior";

  // ---- light rig: three always-on lights plus emissive fixtures ----
  const fixture = mat(0xf8f4ea, 0.4, { emissive: 0xfff4dc, emissiveIntensity: 1.6 });
  for (let i = 0; i < 4; i++) {
    const fz = z + 5.2 - i * 3.6;
    box(g, 6.4, 0.06, 0.3, x - 3.45, 5.18, fz, fixture);
    box(g, 6.4, 0.06, 0.3, x + 3.45, 5.18, fz, fixture);
  }
  const ceiling = mat(0x15121a, 0.9);
  box(g, 16.2, 0.04, 14.2, x, 5.22, z, ceiling);
  const warm = new THREE.PointLight(0xffe3c0, 26, 17, 2);
  warm.position.set(x, 4.6, z + 3.5);
  const mid = new THREE.PointLight(0xffe9d0, 18, 15, 2);
  mid.position.set(x, 4.4, z - 1.5);
  const deck = new THREE.PointLight(0xeaf6ff, 22, 9, 2);
  deck.position.set(x, 2.9, z - 5.6);
  g.add(warm, mid, deck);
  // The runtime switches these on only near the alley: a point light costs every lit pixel in view.
  g.userData.lights = [warm, mid, deck];
  g.userData.centre = { x, z };

  // ---- masking unit over the four pin decks ----
  const housing = mat(0x1b1620, 0.75);
  box(g, 10.2, 1.7, 1.3, x - 1.15, 3.1, z - 6.2, housing);
  box(g, 10.2, 0.08, 1.4, x - 1.15, 2.22, z - 6.2, mat(0x4a4452, 0.5, { metalness: 0.5 }));
  const header = canvasSign(
    [
      { text: "9 0 1   B O W L", color: "#ff4fd8", size: 120 },
      { text: "LANE 1        LANE 2        LANE 3        LANE 4", color: "#7af0ff", size: 44 },
    ],
    2048,
    320,
  );
  const headerMat = new THREE.MeshStandardMaterial({
    map: header,
    emissive: 0xffffff,
    emissiveMap: header,
    emissiveIntensity: 0.9,
    roughness: 0.6,
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(10, 1.56), headerMat);
  face.position.set(x - 1.15, 3.1, z - 5.54);
  g.add(face);
  // Lit pin decks: a pale strip under the unit so the pins read as the brightest thing in the room.
  const deckGlow = mat(0xf2f6ff, 0.3, { emissive: 0xdfefff, emissiveIntensity: 0.7 });
  box(g, 10.1, 0.03, 0.12, x - 1.15, 2.2, z - 5.56, deckGlow);
  // Dark curtain behind the pins so dropped pins vanish into black, not brick.
  box(g, 10.3, 2.2, 0.08, x - 1.15, 1.1, z - 6.95, mat(0x08070b, 0.95));

  // ---- ball returns between each lane pair, with spare balls ----
  const returnShell = mat(0x2a2531, 0.45, { metalness: 0.35 });
  const ballColors = [0x9b1c2e, 0x1d4f9c, 0x2a9d5c, 0x6b2fa8];
  [x - 3.45, x + 1.15].forEach((rx, pair) => {
    box(g, 0.56, 0.42, 1.6, rx, 0.42, z + 4.3, returnShell);
    box(g, 0.56, 0.24, 0.5, rx, 0.75, z + 3.65, returnShell);
    box(g, 0.1, 0.1, 11.4, rx, 0.2, z - 1.3, mat(0x1c1822, 0.6));
    for (let b = 0; b < 2; b++) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.109, 20, 14),
        mat(ballColors[(pair * 2 + b) % 4]!, 0.12, { metalness: 0.05 }),
      );
      ball.position.set(rx, 0.74, z + 4.55 - b * 0.26);
      g.add(ball);
    }
  });

  // ---- approach dots per lane ----
  const dot = mat(0x2b2b33, 0.5);
  for (let i = 0; i < 4; i++) {
    const lx = x - 4.6 + i * 2.3;
    for (const dz of [6.4, 7.1]) {
      for (let d = -3; d <= 3; d++) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 10), dot);
        m.position.set(lx + d * 0.25, 0.165, z + dz);
        g.add(m);
      }
    }
  }

  // ---- neon rails along both side walls and score monitors ----
  const pinkNeon = mat(0xff4fd8, 0.3, { emissive: 0xff4fd8, emissiveIntensity: 2.2 });
  const cyanNeon = mat(0x7af0ff, 0.3, { emissive: 0x7af0ff, emissiveIntensity: 2.0 });
  box(g, 0.05, 0.05, 14, x - 8.72, 3.3, z, pinkNeon);
  box(g, 0.05, 0.05, 14, x + 8.72, 3.3, z, cyanNeon);
  box(g, 0.05, 0.05, 14, x - 8.72, 1.1, z, cyanNeon);
  box(g, 0.05, 0.05, 14, x + 8.72, 1.1, z, pinkNeon);
  const monitorTex = canvasSign(
    [
      { text: "901 BOWL", color: "#ff4fd8", size: 96 },
      { text: "FRAME · SCORE · STRIKE THE POCKET", color: "#f4efe4", size: 44 },
    ],
    1024,
    320,
    "#070710",
  );
  const monitorMat = new THREE.MeshStandardMaterial({
    map: monitorTex,
    emissive: 0xffffff,
    emissiveMap: monitorTex,
    emissiveIntensity: 0.8,
    roughness: 0.5,
  });
  [x - 3.45, x + 1.15].forEach((mx) => {
    box(g, 2.3, 1.1, 0.14, mx, 4.1, z + 0.6, mat(0x121018, 0.6));
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.1, 0.92), monitorMat);
    screen.position.set(mx, 4.1, z + 0.68);
    g.add(screen);
  });

  parent.add(g);
  return g;
}
