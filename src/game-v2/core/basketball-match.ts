import {
  BALL_GRAVITY,
  backboardContact,
  rimContact,
  rimCrossing,
  shotPoints,
  shotVelocity,
  type Backboard,
  type CourtPoint,
} from "./basketball";

export type CourtMode = "half" | "full";
export type Athlete = {
  team: 0 | 1;
  x: number;
  z: number;
  jump: number;
  action: string;
  heading: number;
  dribbleHand: 1 | -1;
};
export type CourtMatch = {
  mode: CourtMode;
  players: Athlete[];
  owner: number;
  possession: 0 | 1;
  score: [number, number];
  clock: number;
  charge: number;
  time: number;
  ball: CourtPoint;
  velocity: CourtPoint;
  phase: "live" | "check" | "finished";
  pause: number;
  cleared: boolean;
  feedback: string;
  shooter: number;
  points: number;
  scored: boolean;
  net: number;
  /** Iron touched on this flight (a make after it is a rattle, not a swish) and the last contact this tick, for sound. */
  touchedRim: boolean;
  contact: "rim" | "backboard" | null;
  actionLeft: number;
  betweenLegs?: boolean;
  dunk: number;
  layup: number;
  layupContest: number;
  crossStartY: number;
};
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value));
export function createCourtMatch(mode: CourtMode): CourtMatch {
  return {
    mode,
    players: [0, 1, 2, 3].map((i) => ({
      team: i < 2 ? 0 : 1,
      x: mode === "half" ? 64 + (i % 2) * 1.2 : 63 + (i % 2) * 4,
      z: -24 + Math.floor(i / 2) * 4,
      jump: 0,
      action: "ready",
      heading: 0,
      dribbleHand: 1 as const,
    })),
    owner: 0,
    possession: 0,
    score: [0, 0],
    clock: 24,
    charge: 0,
    time: 0,
    ball: { x: 64, y: 0.8, z: -24 },
    velocity: { x: 0, y: 0, z: 0 },
    phase: "live",
    pause: 0,
    cleared: true,
    feedback: "FIRST TO 21 · WIN BY 2",
    shooter: -1,
    points: 2,
    scored: false,
    touchedRim: false,
    contact: null,
    net: -1,
    actionLeft: 0,
    dunk: -1,
    layup: -1,
    layupContest: 0,
    crossStartY: 0.8,
  };
}
export function matchRim(match: CourtMatch, hoops: CourtPoint[], team = match.possession) {
  return hoops[match.mode === "half" ? 0 : team === 0 ? 1 : 0]!;
}
function checkBall(match: CourtMatch, team: 0 | 1, message: string) {
  match.possession = team;
  match.owner = team === 0 ? 0 : 2;
  match.clock = 24;
  match.charge = 0;
  match.shooter = -1;
  match.dunk = -1;
  match.layup = -1;
  match.phase = "check";
  match.pause = 1;
  match.cleared = true;
  match.feedback = message;
  for (let i = 0; i < 4; i++) {
    const player = match.players[i]!;
    player.x =
      match.mode === "half" ? 64 + (i % 2) * 1.2 : (team === 0 ? 60 : 72) + ((i % 2) - 0.5) * 2;
    player.z = -24 + Math.floor(i / 2) * 4;
    player.jump = 0;
    player.action = "ready";
  }
}
function shoot(match: CourtMatch, hoops: CourtPoint[], timing: number) {
  if (match.owner < 0 || !match.cleared) return;
  const shooter = match.owner,
    athlete = match.players[shooter]!;
  const rim = matchRim(match, hoops, athlete.team);
  let contest = 0;
  for (const defender of match.players)
    if (defender.team !== athlete.team) {
      contest = Math.max(
        contest,
        clamp(1 - Math.hypot(defender.x - athlete.x, defender.z - athlete.z) / 2, 0, 1),
      );
    }
  // Human releases from the last rendered palm; AI uses its shooting pocket.
  if (shooter !== 0) match.ball = { x: athlete.x, y: 1.75, z: athlete.z };
  const release = shotVelocity(match.ball, rim, timing, contest);
  match.velocity = { x: release.x, y: release.y, z: release.z };
  match.shooter = shooter;
  match.points = shotPoints(athlete, rim);
  match.scored = false;
  match.touchedRim = false;
  match.owner = -1;
  match.charge = 0;
  match.actionLeft = 0.5;
  athlete.jump = 0.18;
  athlete.action = "shoot";
  match.feedback = contest > 0.35 ? "CONTESTED" : release.quality;
}

export function courtAction(
  match: CourtMatch,
  action: "pass" | "cross" | "legs" | "dunk" | "layup" | "steal",
  hoops: CourtPoint[],
) {
  if (match.phase !== "live" || match.actionLeft > 0) return false;
  const athlete = match.players[0]!;
  if (action === "steal") {
    if (match.owner < 2) return false;
    const holder = match.players[match.owner]!;
    match.actionLeft = 0.75;
    athlete.action = "steal";
    if (Math.hypot(holder.x - athlete.x, holder.z - athlete.z) < 1.1) {
      match.owner = 0;
      match.possession = 0;
      match.cleared = match.mode === "full";
      match.clock = 24;
      match.feedback = "STEAL · CLEAR BEYOND THE ARC";
      return true;
    }
    match.feedback = "REACH MISSED";
    return false;
  }
  if (match.owner !== 0) return false;
  if (action === "pass") {
    const receiver = match.players[1]!;
    // A visible travelling pass can be intercepted, not an instant teleport.
    const time = 0.35;
    match.velocity = {
      x: (receiver.x - athlete.x) / time,
      y: (1 - match.ball.y + (BALL_GRAVITY * time * time) / 2) / time,
      z: (receiver.z - athlete.z) / time,
    };
    match.owner = -1;
    match.shooter = -1;
    match.actionLeft = 0.45;
    athlete.action = "pass";
    match.feedback = "PASS";
    return true;
  }
  if (action === "cross" || action === "legs") {
    match.betweenLegs = action === "legs";
    match.crossStartY = match.ball.y;
    athlete.dribbleHand = athlete.dribbleHand === 1 ? -1 : 1;
    match.actionLeft = 0.4;
    athlete.action = "crossover";
    match.feedback = match.betweenLegs
      ? "BETWEEN THE LEGS"
      : athlete.dribbleHand === -1
        ? "CROSSOVER · LEFT HAND"
        : "CROSSOVER · RIGHT HAND";
    return true;
  }
  const rim = matchRim(match, hoops);
  if (action === "layup") return startLayup(match, hoops, 0);
  if (!match.cleared || Math.hypot(athlete.x - rim.x, athlete.z - rim.z) > 1.8) {
    match.feedback = "DRIVE CLOSER TO DUNK";
    return false;
  }
  if (match.players.some((p) => p.team === 1 && Math.hypot(p.x - rim.x, p.z - rim.z) < 0.85)) {
    match.feedback = "DUNK CONTESTED";
    return false;
  }
  match.dunk = 0;
  match.actionLeft = 0.85;
  match.charge = 0;
  athlete.action = "dunk";
  match.feedback = "DUNK";
  athlete.x = rim.x + (rim.x < 66 ? 0.6 : -0.6);
  athlete.z = rim.z;
  match.shooter = 0;
  match.points = 2;
  match.scored = false;
  match.touchedRim = false;
  return true;
}

function startLayup(match: CourtMatch, hoops: CourtPoint[], index: number) {
  const athlete = match.players[index]!,
    rim = matchRim(match, hoops, athlete.team);
  if (!match.cleared || Math.hypot(athlete.x - rim.x, athlete.z - rim.z) > 2.6) {
    match.feedback = "DRIVE CLOSER TO LAY UP";
    return false;
  }
  match.layupContest = Math.max(
    0,
    ...match.players
      .filter((p) => p.team !== athlete.team)
      .map((p) => clamp(1 - Math.hypot(p.x - athlete.x, p.z - athlete.z) / 1.6, 0, 1)),
  );
  match.layup = index;
  match.actionLeft = 1.15;
  match.charge = 0;
  match.shooter = index;
  match.points = 2;
  match.scored = false;
  match.touchedRim = false;
  athlete.action = "layup";
  match.feedback = match.layupContest > 0.5 ? "CONTESTED LAYUP" : "LAYUP";
  return true;
}

export function tickCourtMatch(
  match: CourtMatch,
  dt: number,
  hoops: CourtPoint[],
  human: { x: number; z: number },
  hold: boolean,
  boards: Backboard[] = [],
) {
  match.net = -1;
  if (match.phase === "finished") return;
  match.time += dt;
  if (match.phase === "check") {
    match.pause -= dt;
    if (match.pause <= 0) match.phase = "live";
  } else {
    const p = match.players[0]!;
    if (match.dunk < 0 && match.layup < 0) {
      p.x = clamp(human.x, match.mode === "half" ? 56 : 56, match.mode === "half" ? 66 : 76);
      p.z = clamp(human.z, -28, -16);
    }
    match.clock -= dt;
    if (match.clock <= 0 && match.owner >= 0)
      checkBall(match, match.possession === 0 ? 1 : 0, "SHOT CLOCK · TURNOVER");
  }
  match.actionLeft = Math.max(0, match.actionLeft - dt);
  for (const athlete of match.players) {
    athlete.jump = Math.max(0, athlete.jump - dt * 4);
    if (match.actionLeft <= 0) athlete.action = "ready";
  }
  const rim = matchRim(match, hoops);
  if (match.mode === "half" && !match.cleared && match.owner >= 0) {
    const holder = match.players[match.owner]!;
    if (Math.hypot(holder.x - rim.x, holder.z - rim.z) >= 6.25) {
      match.cleared = true;
      match.feedback = "CLEARED";
    }
  }
  if (match.phase === "live")
    for (let i = 1; i < 4; i++) {
      const athlete = match.players[i]!;
      if (i === match.layup) continue;
      const attacking = athlete.team === match.possession;
      const ownRim = matchRim(match, hoops, athlete.team);
      // Man-to-man assignments stop both defenders swarming the same person.
      const mark = match.players[athlete.team === 1 ? i - 2 : 3]!;
      const target = attacking ? ownRim : mark;
      let tx = target.x,
        tz = target.z;
      if (match.owner < 0 && match.shooter >= 0 && !match.scored) {
        const flight =
          (match.velocity.y +
            Math.sqrt(match.velocity.y ** 2 + 2 * BALL_GRAVITY * Math.max(0, match.ball.y - 0.6))) /
          BALL_GRAVITY;
        tx = match.ball.x + match.velocity.x * Math.min(1, flight) + (i % 2 ? 0.45 : -0.45);
        tz = match.ball.z + match.velocity.z * Math.min(1, flight) + (athlete.team ? 0.45 : -0.45);
      } else if (match.owner < 0 && match.shooter < 0) {
        tx = match.ball.x + match.velocity.x * 0.18;
        tz = match.ball.z + match.velocity.z * 0.18;
      } else if (attacking && match.owner !== i) {
        const cut = match.clock < 13 && Math.sin(match.time * 0.7 + i) > 0.7;
        tx += (target.x < 66 ? 1 : -1) * (cut ? 2.8 : 5.0);
        tz = -22 + (i % 2 ? 4.3 : -4.3);
      } else if (!attacking) {
        const defensiveRim = matchRim(match, hoops, mark.team),
          mx = defensiveRim.x - mark.x,
          mz = defensiveRim.z - mark.z,
          d = Math.hypot(mx, mz) || 1;
        const gap = match.owner === match.players.indexOf(mark) ? 1.35 : 0.75;
        tx += (mx / d) * gap;
        tz += (mz / d) * gap;
      } else if (!match.cleared) tx = 65;
      const dx = tx - athlete.x,
        dz = tz - athlete.z,
        length = Math.hypot(dx, dz);
      if (length > (attacking && match.owner === i && match.cleared ? 2.5 : 0.35)) {
        const step = Math.min(length, dt * (match.owner === i ? 4.9 : 5.6));
        athlete.x = clamp(athlete.x + (dx / length) * step, 56, match.mode === "half" ? 66 : 76);
        athlete.z = clamp(athlete.z + (dz / length) * step, -28, -16);
        athlete.heading = Math.atan2(dx, dz);
        athlete.action = match.owner === i ? "dribble" : "run";
      }
      if (match.owner === i && match.cleared && match.actionLeft <= 0 && match.time % 2.5 < dt) {
        if (Math.hypot(athlete.x - rim.x, athlete.z - rim.z) <= 2.6) startLayup(match, hoops, i);
        else shoot(match, hoops, 0.65);
      }
    }
  // Body separation keeps the four participants from standing inside each other.
  for (let i = 0; i < 4; i++)
    for (let j = i + 1; j < 4; j++) {
      const a = match.players[i]!,
        b = match.players[j]!;
      const dx = b.x - a.x,
        dz = b.z - a.z,
        length = Math.hypot(dx, dz);
      if (length < 1.05) {
        const safeLength = Math.max(length, 0.001),
          nx = length > 0.001 ? dx / safeLength : 1,
          nz = length > 0.001 ? dz / safeLength : 0;
        const push = (1.05 - length) * 0.5;
        a.x -= nx * push;
        a.z -= nz * push;
        b.x += nx * push;
        b.z += nz * push;
      }
    }
  for (const athlete of match.players) {
    athlete.x = clamp(athlete.x, 56, match.mode === "half" ? 66 : 76);
    athlete.z = clamp(athlete.z, -28, -16);
  }
  if (match.owner === 0 && match.dunk < 0 && match.layup < 0) {
    if (hold) {
      match.charge = Math.min(1, match.charge + dt / 0.85);
      match.players[0]!.action = "gather";
    }
    if ((!hold || match.charge >= 1) && match.charge > 0.02) {
      if (match.cleared) shoot(match, hoops, match.charge);
      else {
        match.charge = 0;
        match.feedback = "CLEAR BEYOND THE ARC FIRST";
      }
    }
  }
  if (match.layup >= 0) {
    const index = match.layup,
      athlete = match.players[index]!;
    const progress = clamp(1 - match.actionLeft / 1.15, 0, 1);
    athlete.jump = Math.sin(progress * Math.PI) * 0.42;
    athlete.action = "layup";
    if (match.owner === index && progress >= 0.55) {
      // Release from the last held palm position. Runtime synchronizes this
      // with the illustrated hand; core-only simulations use the held fallback.
      const flight = 0.55,
        targetZ = rim.z + match.layupContest * 0.38;
      match.velocity = {
        x: (rim.x - match.ball.x) / flight,
        y: (rim.y - match.ball.y + (BALL_GRAVITY * flight * flight) / 2) / flight,
        z: (targetZ - match.ball.z) / flight,
      };
      match.owner = -1;
    }
    if (match.actionLeft <= 0) match.layup = -1;
  }
  if (match.dunk >= 0) {
    const progress = 1 - match.actionLeft / 0.85;
    const athlete = match.players[match.dunk]!;
    athlete.jump = Math.sin(Math.min(1, progress) * Math.PI) * 1.1;
    match.ball.x = rim.x;
    match.ball.z = rim.z;
    match.ball.y = 1.4 + athlete.jump * 1.5;
    if (progress >= 0.65 && !match.scored) {
      match.ball.y = rim.y - 0.02;
      match.net = match.mode === "half" ? 0 : match.possession === 0 ? 1 : 0;
      match.scored = true;
      recordPoints(match, 2);
    }
    if (match.scored) match.ball.y = rim.y - 0.02 - (Math.max(0, progress - 0.65) / 0.35) * 1.6;
    if (match.actionLeft <= 0) finishBasket(match);
  } else if (match.owner >= 0) {
    const holder = match.players[match.owner]!;
    const crossing = holder.action === "crossover";
    const cross =
      holder.dribbleHand * (crossing ? Math.cos((match.actionLeft / 0.4) * Math.PI) : 1);
    const dx = rim.x - holder.x,
      dz = rim.z - holder.z,
      length = Math.hypot(dx, dz) || 1;
    // Anatomical right/left follows the attacking direction, not the world's X axis.
    const progress = 1 - match.actionLeft / 0.4;
    const endHeight = 0.17 + 0.85 * Math.abs(Math.cos((match.time + match.actionLeft) * 10.5));
    const bounceHeight =
      0.17 +
      Math.max(0, (progress < 0.5 ? match.crossStartY : endHeight) - 0.17) *
        Math.cos(progress * Math.PI) ** 2;
    // Between the legs: the ball dips lower and passes just behind the front leg.
    const back = crossing && match.betweenLegs ? Math.sin(progress * Math.PI) * 0.2 : 0;
    match.ball = {
      x: holder.x - (dz / length) * 0.36 * cross - (dx / length) * back,
      z: holder.z + (dx / length) * 0.36 * cross - (dz / length) * back,
      y:
        match.layup >= 0
          ? 1.75 + holder.jump
          : match.charge > 0
            ? 1.15 + match.charge * 0.55
            : crossing
              ? bounceHeight * (match.betweenLegs ? 0.6 : 1)
              : 0.17 + 0.85 * Math.abs(Math.cos(match.time * 7)),
    };
  } else {
    const previous = { ...match.ball };
    match.ball.x += match.velocity.x * dt;
    match.ball.z += match.velocity.z * dt;
    match.ball.y += match.velocity.y * dt - (BALL_GRAVITY * dt * dt) / 2;
    match.velocity.y -= BALL_GRAVITY * dt;
    match.contact = null;
    for (const board of boards)
      if (backboardContact(previous, match.ball, match.velocity, board))
        match.contact = "backboard";
    // Dunks and layups are carried to the rim by the athlete: no iron on those flights.
    if (match.dunk < 0 && match.layup < 0)
      for (const hoop of hoops)
        if (rimContact(match.ball, match.velocity, hoop)) {
          match.contact = "rim";
          match.touchedRim = true;
        }
    if (match.shooter >= 0 && !match.scored && rimCrossing(previous, match.ball, rim)) {
      match.scored = true;
      recordPoints(match, match.points);
      match.net = match.mode === "half" ? 0 : match.possession === 0 ? 1 : 0;
      if (!match.feedback.endsWith("WINS"))
        match.feedback = match.points === 3 ? "THREE!" : "BUCKET!";
    }
    if (
      match.ball.x < 55.5 ||
      match.ball.x > (match.mode === "half" ? 66.5 : 76.5) ||
      match.ball.z < -28.5 ||
      match.ball.z > -15.5
    ) {
      if (match.scored) finishBasket(match);
      else checkBall(match, match.possession === 0 ? 1 : 0, "OUT OF BOUNDS");
    } else if (match.ball.y < 0.17) {
      match.ball.y = 0.17;
      match.velocity.y = Math.abs(match.velocity.y) * 0.48;
      match.velocity.x *= 0.75;
      match.velocity.z *= 0.75;
      if (match.scored) finishBasket(match);
    }
    if (!match.scored && match.ball.y < 1.4 && match.velocity.y < 1)
      for (let i = 0; i < 4; i++) {
        const athlete = match.players[i]!;
        if (
          Math.hypot(athlete.x - match.ball.x, athlete.z - match.ball.z) < 0.7 &&
          (i !== match.shooter || match.ball.y < 0.5)
        ) {
          const changed = athlete.team !== match.possession;
          match.owner = i;
          match.possession = athlete.team;
          match.shooter = -1;
          match.clock = changed ? 24 : 14;
          match.cleared = !changed || match.mode === "full";
          match.feedback = changed ? "REBOUND · NEW POSSESSION" : "OFFENSIVE REBOUND";
          break;
        }
      }
  }
}
function recordPoints(match: CourtMatch, points: number) {
  match.score[match.possession] += points;
  if (Math.max(...match.score) >= 21 && Math.abs(match.score[0] - match.score[1]) >= 2) {
    match.phase = "finished";
    match.feedback = match.score[0] > match.score[1] ? "GREEN TEAM WINS" : "GOLD TEAM WINS";
  }
}
function finishBasket(match: CourtMatch) {
  if (match.phase === "finished") {
    match.dunk = -1;
    return;
  }
  checkBall(match, match.possession === 0 ? 1 : 0, "CHECK BALL · POSSESSION CHANGES");
}
