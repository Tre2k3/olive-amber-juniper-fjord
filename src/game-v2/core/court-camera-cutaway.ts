import * as THREE from "three";

/** NBA-style arena cutaway: hide only static scenery between camera and live play. */
export function createCourtCameraCutaway(root: THREE.Object3D) {
  const candidates: {mesh: THREE.Mesh;bounds: THREE.Box3}[] = [];
  const normal=new THREE.Vector3(),rotation=new THREE.Quaternion();
  root.updateMatrixWorld(true);
  root.traverse(node=>{
    if(!(node instanceof THREE.Mesh) || /plate-(day|night)/.test(node.name)) return;
    if(node.name === "sprite" || node.name === "yungveli" || node.name.startsWith("brother-wingz-")) return;
    for(let host=node.parent;host&&host!==root;host=host.parent) {
      if(host.userData.asset || host.userData.kind) return; // Illustrated cast/traffic are never static scenery.
    }
    const geometry=node.geometry;
    if(geometry instanceof THREE.BoxGeometry) {
      if(geometry.parameters.height<.12 || Math.max(geometry.parameters.width,geometry.parameters.depth)<2) return;
    } else if(geometry instanceof THREE.PlaneGeometry) {
      if(geometry.parameters.width<2 || geometry.parameters.height<1) return;
      node.getWorldQuaternion(rotation);normal.set(0,0,1).applyQuaternion(rotation);
      if(Math.abs(normal.y)>.5) return; // Court illustration and all floors stay intact.
    } else return;
    geometry.computeBoundingBox();
    candidates.push({mesh:node,bounds:geometry.boundingBox!.clone().applyMatrix4(node.matrixWorld)});
  });
  const hidden=new Set<THREE.Mesh>(),ray=new THREE.Ray(),direction=new THREE.Vector3(),hit=new THREE.Vector3(),subject=new THREE.Vector3();
  const restore=()=>{hidden.forEach(mesh=>{mesh.visible=true;});hidden.clear();};
  return {
    get count(){return hidden.size;},
    restore,
    update(camera: THREE.Vector3,points: readonly THREE.Vector3[]) {
      restore();
      for(const {mesh,bounds} of candidates) {
        if(!mesh.visible)continue;
        // Feet/head and ball/rim rays also catch arena seating in a low view.
        for(let i=0;i<Math.min(4,points.length);i++) {
          const point=subject.copy(points[i]!);
          if(i===0)point.y+=.4;
          if(i===1)point.y-=1.15;
          direction.copy(camera).sub(point);const distance=direction.length();
          ray.set(point,direction.normalize());
          if(ray.intersectBox(bounds,hit)&&hit.distanceTo(point)<distance-.1) {
            mesh.visible=false;hidden.add(mesh);break;
          }
        }
      }
    },
  };
}
