/**
 * What kind of GPU is this? `software`: SwiftShader/llvmpipe (CI, blocklisted GPUs).
 * `integrated`: Intel HD/UHD/Iris and phone GPUs (Mali/Adreno/PowerVR/VideoCore) —
 * not Intel Arc (discrete) and not Apple M-series (fast).
 */
export function classifyRenderer(name: string): { software: boolean; integrated: boolean } {
  const software = /swiftshader|llvmpipe|softpipe|software/i.test(name);
  const integrated =
    !software &&
    ((/intel/i.test(name) && !/\barc\b/i.test(name)) ||
      /mali|adreno|powervr|videocore/i.test(name));
  return { software, integrated };
}
