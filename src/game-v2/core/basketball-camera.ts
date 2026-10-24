import * as THREE from "three";

export type BasketballCameraMode = "behind" | "sideline" | "baseline";
export const BASKETBALL_CAMERAS: BasketballCameraMode[] = ["behind", "sideline", "baseline"];

/** Frame the live play by backing away horizontally, never climbing into an aerial shot. */
export function createBasketballCamera(camera: THREE.PerspectiveCamera) {
  const probe = new THREE.PerspectiveCamera(), focus = new THREE.Vector3(), desired = new THREE.Vector3();
  const direction = new THREE.Vector3(), projected = new THREE.Vector3(), center = new THREE.Vector3();
  const bounds = new THREE.Box3();
  let active = false;
  const fits = (view: THREE.PerspectiveCamera, points: readonly THREE.Vector3[], margin: number) => {
    view.updateMatrixWorld();
    return points.every(p => {
      projected.copy(p).project(view);
      // Portrait reserves the lower screen for the stick and court action row.
      const bottom=view.aspect<.8 ? margin>.9?.4:.35 : margin;
      return Math.abs(projected.x) < margin && projected.y < margin && projected.y > -bottom && projected.z > -1 && projected.z < 1;
    });
  };
  return {
    get yaw() { return Math.atan2(focus.x-camera.position.x,focus.z-camera.position.z); },
    get active() { return active; },
    reset() { active = false; },
    update(dt: number, mode: BasketballCameraMode, player: THREE.Vector3, rim: {x: number;y: number;z: number}, points: THREE.Vector3[]) {
      const dx = rim.x-player.x, dz = rim.z-player.z, length = Math.hypot(dx,dz);
      const fx=length>.8?dx/length:rim.x<66?-1:1, fz=length>.8?dz/length:0;
      bounds.setFromPoints(points).getCenter(center);
      // A gentle look-up follows the arc; camera height stays at spectator level.
      center.y = Math.max(1.5,Math.min(4.5,center.y));
      const follow=1-Math.exp(-4*dt);
      if(!active) { focus.copy(center); active=true; }
      else focus.lerp(center,follow);
      if(mode === "behind") direction.set(-fx-fz*.16,0,-fz+fx*.16).normalize();
      // Look from the baseline corner, outside the opaque backboard's sightline.
      else if(mode === "baseline") direction.set(fx*.6-fz*.8,0,fz*.6+fx*.8).normalize();
      else direction.set(0,0,1); // Stable television sideline, independent of possession.
      const height = player.y + (mode === "sideline" ? 5.2 : mode === "baseline" ? 3.8 : 3.3);
      const fov=camera.aspect<.8?62:58;
      probe.aspect=camera.aspect;probe.fov=fov;probe.near=.1;probe.far=220;probe.updateProjectionMatrix();
      let distance=6;
      for(let i=0;i<28;i++) {
        desired.copy(direction).multiplyScalar(distance).add(focus);desired.y=height;
        probe.position.copy(desired);probe.lookAt(focus);
        if(fits(probe,points,.78)) break;
        distance*=1.1;
      }
      camera.position.lerp(desired,follow);
      camera.fov+=(fov-camera.fov)*follow;camera.updateProjectionMatrix();camera.lookAt(focus);
      // During a zoom transition, preserve framing by moving horizontally only.
      direction.set(camera.position.x-focus.x,0,camera.position.z-focus.z);
      if(direction.lengthSq()<.01) direction.set(-fx,0,-fz);
      direction.normalize();
      let current=Math.hypot(camera.position.x-focus.x,camera.position.z-focus.z);
      for(let i=0;i<20&&!fits(camera,points,.92);i++) {
        current=Math.max(6,current*1.1);
        camera.position.x=focus.x+direction.x*current;camera.position.z=focus.z+direction.z*current;
        camera.lookAt(focus);
      }
    },
  };
}
