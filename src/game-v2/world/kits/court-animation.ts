import * as THREE from "three";
import type { CourtMatch } from "../../core/basketball-match";
import { solidCutout } from "../feet";

type Action = "dribble" | "shoot" | "dunk" | "shoot-back" | "dunk-back" | "cross-back" | "cross";
const actions: Action[] = ["dribble", "shoot", "dunk", "shoot-back", "dunk-back", "cross-back", "cross"];
// Alpha bounds measured from the supplementary sheets. No canonical PNG is edited.
const regions: Record<Action, number[][]> = {
  dribble: [[226,63,287,548],[821,89,283,522],[235,672,266,543],[839,670,240,546]],
  shoot: [[280,89,218,479],[847,81,194,487],[252,640,236,530],[828,683,248,514]],
  dunk: [[292,102,225,491],[789,33,267,546],[244,627,336,509],[820,739,294,478]],
  "shoot-back": [[237,118,220,438],[808,101,206,454],[261,623,163,560],[809,655,221,544]],
  "dunk-back": [[241,173,245,386],[804,67,228,514],[191,644,279,545],[790,842,297,362]],
  "cross-back": [[161,85,373,507],[733,94,383,498],[112,692,460,491],[745,690,439,500]],
  cross: [[126,32,433,559],[702,38,462,554],[100,658,465,554],[706,647,434,565]],
};
const scale: Record<Action, number> = { dribble: 0.0028, shoot: 0.00315, dunk: 0.00315, "shoot-back": 0.00315, "dunk-back": 0.00315, "cross-back": 0.0028, cross: 0.0028 };
// Hand centers relative to the alpha box: x from left, y from top.
const hands: Record<Action, number[][]> = {
  dribble: [[249,337],[181,415],[105,266],[103,267]],
  shoot: [[186,204],[171,94],[216,13],[224,18]],
  dunk: [[203,311],[128,26],[304,20],[269,62]],
  "shoot-back": [[112,138],[106,12],[136,20],[179,18]],
  "dunk-back": [[127,118],[181,15],[247,18],[268,201]],
  "cross-back": [[333,359],[156,345],[26,332],[66,207]],
  cross: [[27,436],[296,394],[425,419],[351,278]],
};

export function createCourtAnimation(parent: THREE.Object3D) {
  const material = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.15,
    side: THREE.DoubleSide, depthWrite: true });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1,1), material);
  mesh.name = "benji-basketball-action"; mesh.visible = false; mesh.renderOrder = 6;
  parent.add(mesh);
  const initialGeometry = mesh.geometry;
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
      action = null;
      if (match && match.phase !== "finished") {
        const athlete = match.players[0]!;
        if (match.dunk === 0) { action = rear ? "dunk-back" : "dunk"; frame = Math.min(3, Math.floor((1 - match.actionLeft / 0.85) * 4)); }
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
      mesh.position.y = match?.players[0]?.jump ?? 0;
      mesh.updateWorldMatrix(true, false);
      const r = regions[action][frame]!, h = hands[action][frame]!;
      hand.set((h[0]! - r[2]! / 2) * scale[action], (r[3]! - h[1]!) * scale[action], action.endsWith("-back") ? -0.04 : 0.04);
      return true;
    },
    handWorld(target: THREE.Vector3) { return mesh.localToWorld(target.copy(hand)); },
    state() { return { action, frame, visible: mesh.visible, loaded: Object.keys(maps).length }; },
    dispose() {
      disposed = true; material.dispose();
      initialGeometry.dispose();
      for (const key of actions) {
        geometry[key].forEach(g => g.dispose()); maps[key]?.forEach(t => t.dispose());
      }
      sources.forEach(t => t.dispose()); parent.remove(mesh);
    },
  };
}
