import * as THREE from "three";
import { neonPanel } from "./beale-neon";
import { paintedScan } from "./materials";
import { planter } from "./props";

/**
 * The SackReligious HQ front at night (HQ night mockup): black brick, a gold
 * neon crown on the parapet over the canonical logo sign, black velvet crown
 * banners on the piers, planters at the door and a velvet-rope line with
 * brass stanchions either side of the entrance. Decorative only: nothing here
 * adds collision, and the door stays clear.
 */
export function dressHqExterior(
  parent: THREE.Object3D,
  glow: THREE.MeshStandardMaterial[],
  hqX: number,
  frontZ: number,
  darkBrick: THREE.MeshStandardMaterial,
) {
  paintedScan(darkBrick, "/game-v2/places/hq/black-brick.jpg", 7, 2.6);
  const g = new THREE.Group();
  g.name = "hq-exterior-dressing";

  // Gold neon crown on the parapet face above the logo.
  neonPanel(g, glow, "/game-v2/places/hq/crown-neon.jpg", 1.7, 1.08, hqX, 6.86, frontZ + 0.5);

  // Velvet crown banners on the four piers.
  const banner = paintedScan(
    new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.62, metalness: 0.12 }),
    "/game-v2/places/hq/crown-banner.jpg",
    1,
    1,
  );
  const rod = new THREE.MeshStandardMaterial({ color: 0xc89b45, roughness: 0.32, metalness: 0.85 });
  for (const px of [hqX - 8.15, hqX - 3.7, hqX + 3.7, hqX + 8.15]) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 2.3), banner);
    b.position.set(px, 3.95, frontZ + 0.345);
    g.add(b);
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.7, 8), rod);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(px, 5.12, frontZ + 0.36);
    g.add(bar);
  }

  // Planters either side of the door.
  planter(hqX - 2.1, frontZ + 0.95, g);
  planter(hqX + 2.1, frontZ + 0.95, g);

  // Velvet rope line: brass stanchions with red velvet catenaries, door kept open.
  const brass = new THREE.MeshStandardMaterial({
    color: 0xd2a347,
    roughness: 0.28,
    metalness: 0.9,
  });
  const velvet = new THREE.MeshStandardMaterial({
    color: 0x7a0f1c,
    roughness: 0.75,
    metalness: 0.02,
  });
  const z = frontZ + 2.0;
  for (const side of [-1, 1]) {
    const xs = [3.3, 4.7, 6.1, 7.5].map((d) => hqX + side * d);
    for (const x of xs) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.9, 10), brass);
      post.position.set(x, 0.62, z);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.05, 16), brass);
      base.position.set(x, 0.2, z);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 10), brass);
      knob.position.set(x, 1.09, z);
      g.add(post, base, knob);
    }
    for (let i = 0; i < xs.length - 1; i++) {
      const a = new THREE.Vector3(xs[i]!, 1.0, z);
      const c = new THREE.Vector3(xs[i + 1]!, 1.0, z);
      const mid = a.clone().add(c).multiplyScalar(0.5);
      mid.y -= 0.16;
      const rope = new THREE.Mesh(
        new THREE.TubeGeometry(new THREE.QuadraticBezierCurve3(a, mid, c), 12, 0.028, 6, false),
        velvet,
      );
      g.add(rope);
    }
  }
  parent.add(g);
}
