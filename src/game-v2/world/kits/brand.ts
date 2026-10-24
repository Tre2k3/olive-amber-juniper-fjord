import * as THREE from "three";

let logoTexture: THREE.Texture | undefined;

/** Exact flagship silhouette; ink can follow the approved cream/gold/green palette. */
export function flagshipLogo(width: number, ink = 0xf4c66f) {
  if (!logoTexture) {
    logoTexture = new THREE.TextureLoader().load("/game-v2/brand/flagship-logo.png");
    logoTexture.colorSpace = THREE.SRGBColorSpace;
  }
  const material = new THREE.MeshBasicMaterial({
    map: logoTexture, color: ink, transparent: true, alphaTest: 0.02,
    depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  // The supplied PNG has black ink and transparent edges. Retain its alpha
  // exactly while choosing legible sign ink; do not approximate its lettering.
  material.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>",
      "#include <map_fragment>\n diffuseColor.rgb = diffuse;");
  };
  material.customProgramCacheKey = () => "flagship-logo-alpha-v1";
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width * 341 / 732), material);
  mesh.name = "flagship-brand-logo";
  return mesh;
}
