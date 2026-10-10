export type VehicleFace = "front" | "back" | "left" | "right";

/** Retain the current view through small camera/heading oscillations. */
export function vehicleFace(relativeYaw: number, previous?: VehicleFace): VehicleFace {
  const rel = Math.atan2(Math.sin(relativeYaw), Math.cos(relativeYaw));
  const abs = Math.abs(rel);
  const margin = 0.12;
  if (previous === "front" && abs < 0.85 + margin) return previous;
  if (previous === "back" && abs > 2.15 - margin) return previous;
  if ((previous === "left" && rel > 0) || (previous === "right" && rel < 0)) {
    if (abs > 0.85 - margin && abs < 2.15 + margin) return previous;
  }
  return abs < 0.85 ? "front" : abs > 2.15 ? "back" : rel > 0 ? "left" : "right";
}
