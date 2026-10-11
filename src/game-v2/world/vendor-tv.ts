import * as THREE from "three";

/** The supplied clip starts only from a real keyboard/pointer interaction. */
export function createVendorTv(parent: THREE.Group) {
  const group = new THREE.Group(); group.name = "veli-music-tv";
  group.position.set(2.05, 2.65, -2.95); parent.add(group);
  const shell = new THREE.MeshStandardMaterial({ color: 0x171b1d, roughness: .45 });
  const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.64, .984, .14), shell); group.add(bezel);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.3, .08, .12), shell);
  arm.position.set(-.8, -.2, .2); group.add(arm);
  const video = document.createElement("video");
  video.src = "/game-v2/vendors/veli/yung-veli.mp4";
  video.preload = "none"; video.loop = true; video.playsInline = true;
  video.setAttribute("playsinline", ""); video.volume = .55;
  const texture = new THREE.VideoTexture(video); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ color: 0x030303, toneMapped: false });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.5, .844), material);
  screen.name = "veli-tv-picture"; screen.rotation.y = Math.PI; screen.position.z = -.08; group.add(screen);
  let failure = "";
  const loaded = () => { material.map = texture; material.color.set(0xffffff); material.needsUpdate = true; };
  const failed = () => { failure = "Video unavailable. Try again."; };
  video.addEventListener("loadeddata", loaded); video.addEventListener("error", failed);
  const play = () => {
    failure = "";
    // Called synchronously inside keydown/pointer handlers to retain activation.
    void video.play().catch(() => { failure = "Tap Play to start the music."; });
  };
  const pause = () => video.pause();
  return {
    group, video, play, pause,
    toggle: () => video.paused ? play() : pause(),
    mute: () => { video.muted = !video.muted; },
    state: () => ({ playing: !video.paused, muted: video.muted, ready: video.readyState >= 2,
      time: video.currentTime, error: failure, mapped: material.map === texture }),
    dispose: () => {
      pause(); video.removeEventListener("loadeddata", loaded); video.removeEventListener("error", failed);
      video.removeAttribute("src"); video.load(); texture.dispose(); material.dispose(); shell.dispose();
      group.traverse(obj => { if (obj instanceof THREE.Mesh) obj.geometry.dispose(); });
    },
  };
}
