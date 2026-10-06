export type Lane = {
  id: string;
  pts: { x: number; z: number }[];
  len: number[];
  total: number;
};

function build(id: string, pts: { x: number; z: number }[]): Lane {
  const len: number[] = [0];
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i]!.x - pts[i - 1]!.x;
    const dz = pts[i]!.z - pts[i - 1]!.z;
    len.push(len[i - 1]! + Math.hypot(dx, dz));
  }
  const last = pts[0]!;
  const end = pts[pts.length - 1]!;
  const total = len[len.length - 1]! + Math.hypot(last.x - end.x, last.z - end.z);
  return { id, pts, len, total };
}

/**
 * Home-block road profile, meters, centerline z = 0.
 * Asphalt 8.2 wide (z -4.1 to 4.1). Two 3.7 m lanes, centers at z = ±1.85.
 * Sidewalks stay at z = ±6.35 (about 1.8 m wide) with a grass parkway between curb and walk.
 * Traffic stays on the asphalt. Do not move one of these without the others.
 */
export function productionLanes(): Lane[] {
  return [
    build("avenue", [
      { x: -48, z: -1.85 },
      { x: 108, z: -1.85 },
      { x: 124, z: -1.85 },
      { x: 130, z: -0.55 },
      { x: 130, z: 0.55 },
      { x: 124, z: 1.85 },
      { x: 108, z: 1.85 },
      { x: -48, z: 1.85 },
      { x: -58, z: 1.85 },
      { x: -64, z: 0.55 },
      { x: -64, z: -0.55 },
      { x: -58, z: -1.85 },
    ]),
    build("cross", [
      { x: 6.55, z: 18 },
      { x: 6.55, z: -22 },
      { x: 9.45, z: -22 },
      { x: 9.45, z: 18 },
    ]),
  ];
}

export function sampleLane(lane: Lane, s: number): { x: number; z: number; yaw: number } {
  const dist = ((s % lane.total) + lane.total) % lane.total;
  const pts = lane.pts;
  const len = lane.len;
  let i = 1;
  while (i < len.length && len[i]! < dist) i++;
  const i0 = i - 1;
  const a = pts[i0]!;
  const b = pts[i] ?? pts[0]!;
  const segStart = len[i0]!;
  const segEnd = pts[i] ? len[i]! : lane.total;
  const t = segEnd <= segStart ? 0 : (dist - segStart) / (segEnd - segStart);
  const x = a.x + (b.x - a.x) * t;
  const z = a.z + (b.z - a.z) * t;
  const yaw = Math.atan2(b.x - a.x, b.z - a.z);
  return { x, z, yaw };
}
