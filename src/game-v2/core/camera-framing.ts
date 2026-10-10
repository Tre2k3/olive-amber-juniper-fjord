/** Widen portrait views without changing desktop framing or canonical sprite scale. */
export function cameraFraming(aspect: number, baseFov: number, inside: boolean) {
  const portrait = Math.max(0, Math.min(1, (0.9 - aspect) / 0.45));
  return { fov: baseFov + 20 * portrait, distanceScale: inside ? 1 : 1 + 0.25 * portrait };
}
