import * as THREE from "three";
import { classifyRenderer } from "./gpu-tier";

/**
 * Rendering quality that costs no assets:
 *
 * - an MSAA composer target (the renderer's own antialiasing is discarded once
 *   post-processing renders through bloom's targets)
 * - a procedural sky environment map per lighting mode, so PBR materials get
 *   specular response and sky-coloured ambient instead of flat matte shading
 * - a sun shadow frustum that follows the player with a 4K map on desktop:
 *   ~1.5 cm per texel around you instead of 10 cm smeared over the whole slice
 * - a film grade pass: vignette, gentle contrast, mode-specific tint
 */

export type LightMode = "day" | "golden" | "night" | "interior" | "haunt";

export const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignette: { value: 0.42 },
    saturation: { value: 1.08 },
    contrast: { value: 1.05 },
    tint: { value: new THREE.Color(1, 1, 1) },
    tintAmount: { value: 0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette, saturation, contrast, tintAmount;
    uniform vec3 tint;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(lum), c.rgb, saturation);
      c.rgb = (c.rgb - 0.18) * contrast + 0.18;
      c.rgb = mix(c.rgb, c.rgb * tint, tintAmount);
      float d = distance(vUv, vec2(0.5)) * 1.25;
      c.rgb *= 1.0 - vignette * smoothstep(0.45, 1.0, d);
      gl_FragColor = c;
    }`,
};

export function createRenderQuality(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  sun: THREE.DirectionalLight,
) {
  const isWebGL2 = renderer.capabilities.isWebGL2;
  const coarse = typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;
  // Software rendering (SwiftShader / llvmpipe): what Chrome falls back to on blocklisted or
  // missing GPUs, and what CI uses. The scene stays identical; only the per-pixel cost drops.
  const gl = renderer.getContext();
  const dbg = gl.getExtension("WEBGL_debug_renderer_info");
  const rendererName = String(
    dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  );
  const kind = classifyRenderer(rendererName);
  // ?tier=low forces the integrated-GPU path (for testing light mode on any machine).
  if (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("tier") === "low"
  ) {
    kind.integrated = true;
    kind.software = false;
  }
  // The light tier (no MSAA, 1024 shadows, no IBL/bloom/reflections) runs on software
  // renderers AND integrated GPUs — Trey's Intel UHD ran the full tier at 6 fps.
  const software = kind.software || kind.integrated;
  const samples = software ? 0 : isWebGL2 ? (coarse ? 2 : 4) : 0;

  // ---- environment maps from a gradient sky, one per mode ----
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envFor = (top: number, horizon: number, ground: number) => {
    const sky = new THREE.Scene();
    const geo = new THREE.SphereGeometry(60, 32, 24);
    const colors: number[] = [];
    const t = new THREE.Color(top),
      h = new THREE.Color(horizon),
      g = new THREE.Color(ground),
      c = new THREE.Color();
    const pos = geo.getAttribute("position");
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 60;
      if (y >= 0) c.copy(h).lerp(t, Math.pow(y, 0.6));
      else c.copy(h).lerp(g, Math.min(1, -y * 2.2));
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    sky.add(
      new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }),
      ),
    );
    const tex = pmrem.fromScene(sky, 0.03).texture;
    geo.dispose();
    return tex;
  };
  const envBase = {
    day: envFor(0x6fa8e6, 0xe9dfca, 0x5b5a3e),
    golden: envFor(0x5b4f8e, 0xffb77a, 0x5a3a26),
    night: envFor(0x070b16, 0x1b2436, 0x08090b),
    interior: envFor(0x3a3a3a, 0x8a8178, 0x2a2622),
  };
  const env: Record<LightMode, THREE.Texture> = { ...envBase, haunt: envBase.interior };
  const intensity: Record<LightMode, number> = {
    day: 0.85,
    golden: 0.75,
    night: 0.4,
    interior: 0.55,
    haunt: 0.35,
  };

  // ---- shadows ----
  const mapSize = software ? 1024 : coarse ? 2048 : 4096;
  sun.shadow.mapSize.set(mapSize, mapSize);
  sun.shadow.bias = -0.00025;
  sun.shadow.normalBias = 0.02;
  const half = 34;
  sun.shadow.camera.left = -half;
  sun.shadow.camera.right = half;
  sun.shadow.camera.top = half;
  sun.shadow.camera.bottom = -half;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.camera.updateProjectionMatrix();
  if (!sun.target.parent) scene.add(sun.target);
  const sunDir = new THREE.Vector3();
  const texel = (half * 2) / sun.shadow.mapSize.x;

  return {
    samples,
    software,
    /** True CPU rendering (CI): the adaptive ladder stays off there so tests are deterministic. */
    cpuRenderer: kind.software,
    /** Integrated GPU: cap pixel ratio at 1. */
    lowPower: kind.integrated,
    rendererName,
    gradeShader: GradeShader,
    renderTarget(width: number, height: number) {
      return new THREE.WebGLRenderTarget(width, height, { type: THREE.HalfFloatType, samples });
    },
    applyMode(mode: LightMode, grade: { uniforms: Record<string, { value: unknown }> }) {
      // Software renderers skip image-based lighting: it is a per-pixel cost on every material.
      scene.environment = software ? null : env[mode];
      scene.environmentIntensity = intensity[mode];
      const u = grade.uniforms;
      (u.vignette!.value as number) =
        mode === "haunt" ? 0.66 : mode === "night" ? 0.55 : mode === "interior" ? 0.3 : 0.4;
      (u.saturation!.value as number) =
        mode === "haunt" ? 1.2 : mode === "golden" ? 1.12 : mode === "night" ? 0.96 : 1.08;
      (u.contrast!.value as number) = mode === "haunt" ? 1.16 : mode === "night" ? 1.08 : 1.05;
      (u.tint!.value as THREE.Color).set(
        mode === "haunt"
          ? 0xffb080
          : mode === "night"
            ? 0x9fb4ff
            : mode === "golden"
              ? 0xffc89a
              : 0xffffff,
      );
      (u.tintAmount!.value as number) =
        mode === "haunt" ? 0.24 : mode === "night" ? 0.22 : mode === "golden" ? 0.16 : 0;
    },
    /** Keep the crisp shadow box centred on the player, snapped to texels so it never shimmers. */
    followShadows(player: THREE.Vector3) {
      // The lighting pass stores its sun direction; we only slide the box with the player.
      const dir = sun.userData.dir as THREE.Vector3 | undefined;
      if (dir) sunDir.copy(dir);
      else sunDir.set(-18, 26, 18);
      const tx = Math.round(player.x / texel) * texel;
      const tz = Math.round(player.z / texel) * texel;
      sun.target.position.set(tx, 0, tz);
      sun.position.set(tx + sunDir.x, sunDir.y, tz + sunDir.z);
      sun.target.updateMatrixWorld();
    },
    dispose() {
      pmrem.dispose();
      for (const t of Object.values(env)) t.dispose();
    },
  };
}
