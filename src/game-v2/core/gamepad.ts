/**
 * Controller support through the browser Gamepad API ("standard" layout:
 * Xbox, PlayStation, Switch Pro). Sticks feed the same analog inputs as the
 * touch stick; buttons are replayed as the keyboard keys the game already
 * understands, so every activity works without per-activity wiring.
 */
export const PAD_BUTTON_KEYS: Readonly<Record<number, string>> = {
  0: "KeyE", // A / Cross — interact
  2: "Space", // X / Square — hold to charge, release to shoot
  3: "KeyG", // Y / Triangle — the G action outside a match
  11: "KeyB", // R3 (click right stick) — court camera
  4: "KeyQ", // LB / L1 — orbit camera
  5: "KeyR", // RB / R1 — orbit camera
  7: "ShiftLeft", // RT / R2 — run
  9: "Escape", // Start / Options — pause
  12: "ArrowUp",
  13: "ArrowDown",
  14: "ArrowLeft",
  15: "ArrowRight",
};
/** During a 2v2 match the spare buttons become the basketball moves. */
export const PAD_COURT_KEYS: Readonly<Record<number, string>> = {
  ...PAD_BUTTON_KEYS,
  3: "KeyF", // Y / Triangle — pass
  4: "KeyC", // LB / L1 — crossover
  5: "KeyV", // RB / R1 — dunk
  6: "KeyL", // LT / L2 — layup
};
/** B / Circle closes things (shop, order windows, pause) but never opens the pause menu. */
export const PAD_BACK_BUTTON = 1;

export function deadzone(v: number, dz = 0.18): number {
  const a = Math.abs(v);
  if (!Number.isFinite(v) || a < dz) return 0;
  return (Math.sign(v) * (a - dz)) / (1 - dz);
}

export type PadState = {
  moveX: number;
  moveY: number;
  lookX: number;
  pressed: boolean[];
  id: string;
};

/** First connected controller, or null. Browsers only expose a pad after its first button press. */
export function readPad(
  nav: Navigator | undefined = typeof navigator !== "undefined" ? navigator : undefined,
): PadState | null {
  const pads = nav?.getGamepads?.() ?? [];
  for (const p of pads) {
    if (!p || !p.connected) continue;
    return {
      moveX: deadzone(p.axes[0] ?? 0),
      // Stick up is negative on the Gamepad API; the game's forward is positive.
      moveY: -deadzone(p.axes[1] ?? 0),
      lookX: deadzone(p.axes[2] ?? 0, 0.22),
      pressed: p.buttons.map((b) => b.pressed || b.value > 0.5),
      id: p.id,
    };
  }
  return null;
}

/** Key presses/releases implied by a change in button state. */
export function buttonEdges(
  prev: boolean[],
  next: boolean[],
  map: Readonly<Record<number, string>> = PAD_BUTTON_KEYS,
): { code: string; down: boolean }[] {
  const out: { code: string; down: boolean }[] = [];
  for (const [i, code] of Object.entries(map)) {
    const n = Number(i);
    const was = !!prev[n];
    const now = !!next[n];
    if (was !== now) out.push({ code, down: now });
  }
  return out;
}
