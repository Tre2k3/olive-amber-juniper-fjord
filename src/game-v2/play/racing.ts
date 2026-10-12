export const RACE_RADIUS = 18;
export const RACE_HALF_WIDTH = 3.5;
export const RACE_LENGTH = 128 + Math.PI * 36;
export const RACE_LAPS = 3;
export type Race = {
  x: number; z: number; yaw: number; speed: number;
  phase: "countdown" | "running" | "finished";
  countdown: number; time: number; progress: number; lastS: number; nextGate: number;
  opponent: number; drift: number; boost: number; wasDrifting: boolean; won: boolean; paid: boolean;
};
export function sampleRace(distance: number) {
  let s = ((distance % RACE_LENGTH) + RACE_LENGTH) % RACE_LENGTH;
  if (s < 64) return { x: -32 + s, z: -168, yaw: -Math.PI / 2 };
  s -= 64;
  if (s < Math.PI * 18) {
    const a = -Math.PI / 2 + s / 18;
    return { x: 32 + Math.cos(a) * 18, z: -150 + Math.sin(a) * 18, yaw: -Math.PI - a };
  }
  s -= Math.PI * 18;
  if (s < 64) return { x: 32 - s, z: -132, yaw: Math.PI / 2 };
  s -= 64;
  const a = Math.PI / 2 + s / 18;
  return { x: -32 + Math.cos(a) * 18, z: -150 + Math.sin(a) * 18, yaw: -Math.PI - a };
}
export function nearestRace(x: number, z: number) {
  const candidates = [
    { s: Math.max(0, Math.min(64, x + 32)), x: Math.max(-32, Math.min(32, x)), z: -168 },
    { s: 64 + Math.PI * 18 + Math.max(0, Math.min(64, 32 - x)), x: Math.max(-32, Math.min(32, x)), z: -132 },
  ];
  for (const side of [1, -1]) {
    let a = Math.atan2(z + 150, x - side * 32);
    if (side === 1) a = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, a));
    else { if (a < 0) a += Math.PI * 2; a = Math.max(Math.PI / 2, Math.min(Math.PI * 1.5, a)); }
    candidates.push({ s: side === 1 ? 64 + (a + Math.PI / 2) * 18 : 128 + Math.PI * 18 + (a - Math.PI / 2) * 18,
      x: side * 32 + Math.cos(a) * 18, z: -150 + Math.sin(a) * 18 });
  }
  return candidates.reduce((a, b) => Math.hypot(x-a.x,z-a.z) < Math.hypot(x-b.x,z-b.z) ? a : b);
}
export function createRace(): Race {
  const start = sampleRace(0);
  return { ...start, speed: 0, phase: "countdown", countdown: 3, time: 0, progress: 0, lastS: 0,
    nextGate: 1, opponent: -5, drift: 0, boost: 0, wasDrifting: false, won: false, paid: false };
}
export function tickRace(race: Race, dt: number, throttle: number, steer: number, drifting: boolean) {
  if (race.phase === "finished") return;
  if (race.phase === "countdown") {
    race.countdown = Math.max(0, race.countdown-dt);
    if (race.countdown === 0) race.phase = "running";
    return;
  }
  // Small substeps retain walls and progress gates even at boost speed.
  const steps = Math.max(1, Math.ceil(dt / (1/120))), h = dt / steps;
  for (let i=0;i<steps;i++) {
    race.time += h;
    race.opponent += 17.5 * h;
    const driftActive = drifting && Math.abs(steer) > .15 && race.speed > 5;
    if (driftActive) race.drift = Math.min(1.5, race.drift+h);
    else if (race.wasDrifting) { if (race.drift > .45) race.boost = Math.min(1.8, race.drift); race.drift = 0; }
    race.wasDrifting = driftActive;
    race.boost = Math.max(0, race.boost-h);
    race.speed += (throttle > 0 ? throttle*12 : throttle < 0 ? throttle*23 : -5) * h;
    race.speed = Math.max(0, Math.min(race.boost > 0 ? 30 : 25, race.speed));
    race.yaw += steer * (driftActive ? 1.8 : 1.35) * Math.min(1, race.speed/6) * h;
    race.x -= Math.sin(race.yaw)*race.speed*h;
    race.z -= Math.cos(race.yaw)*race.speed*h;
    const near = nearestRace(race.x, race.z);
    const dx = race.x-near.x, dz = race.z-near.z, distance = Math.hypot(dx,dz);
    if (distance > RACE_HALF_WIDTH-.95) {
      race.x = near.x+dx/distance*(RACE_HALF_WIDTH-.95);
      race.z = near.z+dz/distance*(RACE_HALF_WIDTH-.95);
      race.speed *= Math.exp(-8*h);
    }
    let ds = near.s-race.lastS;
    if (ds > RACE_LENGTH/2) ds -= RACE_LENGTH;
    if (ds < -RACE_LENGTH/2) ds += RACE_LENGTH;
    // No infield shortcuts or projection jumps can skip a gate.
    if (Math.abs(ds) < 36*h+.15) race.progress = Math.max(0,race.progress+ds);
    race.lastS = near.s;
    if (race.progress >= race.nextGate * RACE_LENGTH / 4) race.nextGate++;
    if (race.progress >= RACE_LAPS*RACE_LENGTH && race.nextGate > RACE_LAPS*4) {
      race.phase = "finished"; race.won = race.opponent < RACE_LAPS*RACE_LENGTH; break;
    }
    if (race.time > 180) { race.phase = "finished"; race.won = false; break; }
  }
}
export function validateRaceTrack() {
  const points = Array.from({length:160}, (_,i) => sampleRace(i*RACE_LENGTH/160));
  for(let i=0;i<points.length;i++) for(let j=i+1;j<points.length;j++) {
    const along = Math.min(j-i,points.length-(j-i))*RACE_LENGTH/160;
    if(along > 6*RACE_HALF_WIDTH && Math.hypot(points[i]!.x-points[j]!.x,points[i]!.z-points[j]!.z)<2*RACE_HALF_WIDTH)
      throw new Error("Race corridor self-overlap");
  }
  if(RACE_RADIUS < RACE_HALF_WIDTH*2) throw new Error("Race turn radius too tight");
  return true;
}
