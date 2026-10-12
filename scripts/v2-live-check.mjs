/** Live game-v2 checks. The donor engine's window.__sack is not the running route. */

export function carOnRoad(car) {
  const onAvenue = Math.abs(car.z) < 4.35;
  const onCross = car.x > 3.2 && car.x < 13.2 && car.z > -24 && car.z < 20;
  // Beale uses the authored 84m x 8.2m street slab, centered at (42, -54).
  // Verify the vehicle's center stays on that asphalt, not merely anywhere downtown.
  const onBeale = car.x >= 0 && car.x <= 84 && car.z >= -58.1 && car.z <= -49.9;
  return onAvenue || onCross || onBeale;
}

export async function readHomeBlock(page) {
  return page.evaluate(async () => {
    const frames = (n) =>
      new Promise((resolve) => {
        const step = (left) => {
          if (left <= 0) resolve(undefined);
          else requestAnimationFrame(() => step(left - 1));
        };
        step(n);
      });
    const input = window.__SACK_V2_INPUT__;
    const sack = () => window.__SACK_V2__;
    input.setShot({ x: -32, z: 5.8, yaw: 0, facing: "back", night: false });
    await frames(4);
    const start = { x: sack().x, y: sack().y, z: sack().z, facing: sack().facing };
    window.dispatchEvent(new KeyboardEvent("keydown", { code: "KeyW", key: "w" }));
    await frames(14);
    window.dispatchEvent(new KeyboardEvent("keyup", { code: "KeyW", key: "w" }));
    await frames(3);
    const walked = { x: sack().x, y: sack().y, z: sack().z, facing: sack().facing };
    input.setShot({ x: -32, z: 8.7, yaw: 0, facing: "back" });
    await frames(4);
    input.press("KeyE");
    await frames(6);
    const entered = sack().place;
    input.setShot({ x: -10, z: 3.2, yaw: Math.PI / 2, facing: "right" });
    await frames(6);
    return {
      start,
      walked,
      entered,
      cars: sack().cars || [],
      peds: typeof input.peds === "function" ? input.peds() : [],
    };
  });
}
