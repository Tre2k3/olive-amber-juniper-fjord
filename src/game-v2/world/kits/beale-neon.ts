import * as THREE from "three";
import { sharedScan } from "./materials";

/**
 * Beale's neon (board 7). Sign art is glowing tubing on pure black, drawn
 * additively so the black disappears. Each sign joins the city's glow list,
 * so it follows day / golden / night with every other emissive in Memphis.
 * A 1×1 black placeholder holds the shader steady until the art arrives.
 */
const dark = (() => {
  const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1);
  t.needsUpdate = true;
  return t;
})();

function neon(
  parent: THREE.Object3D,
  glow: THREE.MeshStandardMaterial[],
  file: string,
  w: number,
  h: number,
  x: number,
  y: number,
  z: number,
  ry = 0,
) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0x000000,
    emissive: new THREE.Color(1.9, 1.9, 1.9),
    emissiveMap: dark,
    roughness: 1,
    metalness: 0,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  sharedScan(`/game-v2/places/beale/${file}`, 1, 1).then(
    (t) => {
      t.wrapS = THREE.ClampToEdgeWrapping;
      t.wrapT = THREE.ClampToEdgeWrapping;
      mat.emissiveMap = t;
    },
    () => {
      /* stays dark */
    },
  );
  glow.push(mat);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  sign.position.set(x, y, z);
  sign.rotation.y = ry;
  sign.renderOrder = 2;
  sign.name = `beale-neon-${file.replace(/\.jpg$/, "")}`;
  parent.add(sign);
  return sign;
}

/** The south frontage faces +z at z ≈ −62.8; second-floor signs sit above the awnings. */
export function dressBealeNeon(parent: THREE.Object3D, glow: THREE.MeshStandardMaterial[]) {
  const g = new THREE.Group();
  g.name = "beale-neon";
  neon(g, glow, "blues-club.jpg", 4.8, 2.7, 63.4, 4.75, -62.66);
  neon(g, glow, "live-music.jpg", 4.2, 2.36, 74, 4.6, -62.62);
  neon(g, glow, "bar-b-q.jpg", 4.0, 2.25, 51.7, 4.7, -62.62);
  // Projecting blade signs, read from up and down the street.
  neon(g, glow, "beale-st.jpg", 1.9, 1.9, 57.3, 5.4, -61.9, Math.PI / 2);
  neon(g, glow, "memphis-vertical.jpg", 1.25, 3.9, 45.0, 5.6, -61.95, Math.PI / 2);
  // Iron brackets for the blades.
  const iron = new THREE.MeshStandardMaterial({ color: 0x22262a, metalness: 0.6, roughness: 0.45 });
  for (const [x, y] of [
    [57.3, 6.45],
    [45.0, 7.65],
  ] as const) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.0), iron);
    arm.position.set(x, y, -62.3);
    g.add(arm);
  }
  parent.add(g);
}
