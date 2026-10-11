import * as THREE from "three";
import type { CourtMatch } from "../../core/basketball-match";
import { solidCutout } from "../feet";

type Action = "dribble" | "shoot" | "dunk" | "shoot-back" | "dunk-back" | "cross-back" | "cross" | "layup-back";
const actions: Action[] = ["dribble", "shoot", "dunk", "shoot-back", "dunk-back", "cross-back", "cross", "layup-back"];
// Alpha bounds measured from the supplementary sheets. No canonical PNG is edited.
const regions: Record<Action, number[][]> = {
  dribble: [[226,63,287,548],[821,89,283,522],[235,672,266,543],[839,670,240,546]],
  shoot: [[280,89,218,479],[847,81,194,487],[252,640,236,530],[828,683,248,514]],
  dunk: [[292,102,225,491],[789,33,267,546],[244,627,336,509],[820,739,294,478]],
  "shoot-back": [[237,118,220,438],[808,101,206,454],[261,623,163,560],[809,655,221,544]],
  "dunk-back": [[241,173,245,386],[804,67,228,514],[191,644,279,545],[790,842,297,362]],
  "cross-back": [[161,85,373,507],[733,94,383,498],[112,692,460,491],[745,690,439,500]],
  "layup-back": [[225,63,295,513],[753,50,322,509],[196,608,335,597],[791,693,280,505]],
  cross: [[126,32,433,559],[702,38,462,554],[100,658,465,554],[706,647,434,565]],
};
const scale: Record<Action, number> = { dribble: 0.0028, shoot: 0.00315, dunk: 0.00315, "shoot-back": 0.00315, "dunk-back": 0.00315, "cross-back": 0.0028, cross: 0.0028, "layup-back": 0.00315 };
// Hand centers relative to the alpha box: x from left, y from top.
const hands: Record<Action, number[][]> = {
  dribble: [[249,337],[181,415],[105,266],[103,267]],
  shoot: [[186,204],[171,94],[216,13],[224,18]],
  dunk: [[203,311],[128,26],[304,20],[269,62]],
  "shoot-back": [[112,138],[106,12],[136,20],[179,18]],
  "dunk-back": [[127,118],[181,15],[247,18],[268,201]],
  "cross-back": [[333,359],[156,345],[26,332],[66,207]],
  "layup-back": [[275,227],[299,83],[304,30],[259,287]],
  cross: [[27,436],[296,394],[425,419],[351,278]],
};

export function createCourtAnimation(parent: THREE.Object3D) {
  const material = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.15,
    side: THREE.DoubleSide, depthWrite: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1,1), material);
  mesh.name = "benji-basketball-action"; mesh.visible = false; mesh.renderOrder = 6;
  parent.add(mesh);
  const initialGeometry = mesh.geometry;
  // Reuse the actual illustrated fingers, cropped from the SAME frame, over
  // the ball's near edge. The rest of the body still uses normal depth testing.
  const gripMaterial = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: .15,
    side: THREE.DoubleSide, depthTest: false, depthWrite: false });
  const grip = new THREE.Mesh(new THREE.PlaneGeometry(1,1), gripMaterial);
  grip.name = "benji-ball-grip"; grip.renderOrder = 8; grip.visible = false; mesh.add(grip);
  const gripMaps: Partial<Record<Action, THREE.Texture[]>> = {};
  const maps: Partial<Record<Action, THREE.Texture[]>> = {};
  const sources: THREE.Texture[] = [];
  const geometry = {} as Record<Action, THREE.PlaneGeometry[]>;
  let disposed = false, action: Action | null = null, frame = 0;
  for (const key of actions) {
    geometry[key] = regions[key].map((r) => {
      const geo = new THREE.PlaneGeometry(r[2]! * scale[key], r[3]! * scale[key]);
      geo.translate(0, r[3]! * scale[key] / 2, 0); return geo;
    });
    new THREE.TextureLoader().load(`/game-v2/actions/benji/${key}.png`, (source) => {
      if (disposed) { source.dispose(); return; }
      solidCutout(source); sources.push(source);
      if (key === "dunk" || key === "dunk-back" || key === "layup-back") {
        gripMaps[key] = regions[key].map((r, i) => {
          const h = hands[key][i]!, texture = source.clone();
          const gx = Math.max(0, h[0]! - 20), gy = Math.max(0, h[1]! - 20);
          const width = Math.min(40, r[2]! - gx), height = Math.min(42, r[3]! - gy);
          texture.repeat.set(width / 1254, height / 1254);
          texture.offset.set((r[0]! + gx) / 1254, 1 - (r[1]! + gy + height) / 1254);
          texture.needsUpdate = true; return texture;
        });
      }
      maps[key] = regions[key].map((r) => {
        const texture = source.clone();
        texture.repeat.set(r[2]! / 1254, r[3]! / 1254);
        texture.offset.set(r[0]! / 1254, 1 - (r[1]! + r[3]!) / 1254);
        texture.needsUpdate = true; return texture;
      });
    });
  }
  const hand = new THREE.Vector3();
  return {
    mesh,
    update(match: CourtMatch | null, direction: number, yaw: number, rear: boolean) {
      action = null; grip.visible = false;
      if (match && match.phase !== "finished") {
        const athlete = match.players[0]!;
        if (match.layup === 0) {
          action = "layup-back";
          const progress = 1 - match.actionLeft / 1.15;
          frame = progress < .2 ? 0 : progress < .45 ? 1 : progress < .8 ? 2 : 3;
        }
        else if (match.dunk === 0) { action = rear ? "dunk-back" : "dunk"; frame = Math.min(3, Math.floor((1 - match.actionLeft / 0.85) * 4)); }
        else if (match.owner === 0 && match.charge > 0) { action = rear ? "shoot-back" : "shoot"; frame = match.charge < 0.45 ? 0 : 1; }
        else if (match.shooter === 0 && athlete.action === "shoot" && match.actionLeft > 0) {
          action = rear ? "shoot-back" : "shoot"; frame = match.actionLeft > 0.3 ? 2 : 3;
        } else if (match.owner === 0 && athlete.action === "crossover") {
          action = rear ? "cross-back" : "cross";
          const key = Math.min(3, Math.floor((1 - match.actionLeft / 0.4) * 4));
          frame = athlete.dribbleHand === -1 ? key : 3 - key;
        } else if (match.owner === 0 && athlete.dribbleHand === -1 && rear) {
          action = "cross-back"; frame = Math.abs(Math.cos(match.time * 7)) > 0.65 ? 3 : 2;
        } else if (match.owner === 0) {
          action = "dribble"; frame = [3,0,1,2][Math.floor(((match.time * 7 / Math.PI) % 1) * 4)]!;
        }
      }
      const texture = action ? maps[action]?.[frame] : undefined;
      mesh.visible = Boolean(texture);
      if (!action || !texture) return false;
      mesh.geometry = geometry[action][frame]!;
      if (material.map !== texture) { material.map = texture; material.needsUpdate = true; }
      mesh.rotation.y = yaw; mesh.scale.set(action.endsWith("-back") || action === "cross" ? 1 : direction,1,1);
      mesh.position.set(0, match?.players[0]?.jump ?? 0, 0);
      mesh.updateWorldMatrix(true, false);
      const r = regions[action][frame]!, h = hands[action][frame]!;
      hand.set((h[0]! - r[2]! / 2) * scale[action], (r[3]! - h[1]!) * scale[action], action.endsWith("-back") ? -0.04 : 0.04);
      const holdingFinish = match?.owner === 0 && !match.scored && (match.dunk === 0 || match.layup === 0);
      const gripTexture = gripMaps[action]?.[frame];
      if (holdingFinish && gripTexture && frame < 3) {
        const gx = Math.max(0, h[0]! - 20), gy = Math.max(0, h[1]! - 20);
        const width = Math.min(40, r[2]! - gx), height = Math.min(42, r[3]! - gy);
        grip.scale.set(width * scale[action], height * scale[action], 1);
        grip.position.set((gx + width / 2 - r[2]! / 2) * scale[action],
          (r[3]! - gy - height / 2) * scale[action], .2);
        gripMaterial.map = gripTexture; gripMaterial.needsUpdate = true; grip.visible = true;
      }
      return true;
    },
    gripWorld(target: THREE.Vector3) {
      // The palm supports the lower/back edge instead of occupying ball center.
      return mesh.localToWorld(target.copy(hand).add(new THREE.Vector3(0, .075, .025)));
    },
    alignGrip(target: THREE.Vector3, scratch: THREE.Vector3) {
      mesh.localToWorld(scratch.copy(hand).add(new THREE.Vector3(0, .075, .025)));
      mesh.position.add(scratch.sub(target).multiplyScalar(-1)); mesh.updateWorldMatrix(true, false);
    },
    handWorld(target: THREE.Vector3) { return mesh.localToWorld(target.copy(hand)); },
    state() { return { action, frame, visible: mesh.visible, loaded: Object.keys(maps).length, gripVisible: grip.visible }; },
    dispose() {
      disposed = true; material.dispose(); gripMaterial.dispose(); grip.geometry.dispose();
      initialGeometry.dispose();
      for (const key of actions) {
        geometry[key].forEach(g => g.dispose()); maps[key]?.forEach(t => t.dispose()); gripMaps[key]?.forEach(t => t.dispose());
      }
      sources.forEach(t => t.dispose()); parent.remove(mesh);
    },
  };
}

