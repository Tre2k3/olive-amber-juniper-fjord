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
  const states=new Map<THREE.Mesh,{original:THREE.Material|THREE.Material[];copies:THREE.Material[];alpha:number}>();
  const ray=new THREE.Ray(),direction=new THREE.Vector3(),hit=new THREE.Vector3(),subject=new THREE.Vector3();
  const restore=()=>{states.forEach((state,mesh)=>{mesh.material=state.original;mesh.visible=true;state.alpha=1;});};
  return {
    get count(){let n=0;states.forEach(state=>{if(state.alpha<.98)n++;});return n;},
    restore,
    dispose(){restore();states.forEach(state=>state.copies.forEach(mat=>mat.dispose()));states.clear();},
    update(camera: THREE.Vector3,points: readonly THREE.Vector3[],dt=1/60) {
      for(const {mesh,bounds} of candidates) {
        if(!mesh.visible&&!states.has(mesh))continue;
        let blocked=false;
        for(let i=0;i<Math.min(4,points.length);i++) {
          const point=subject.copy(points[i]!);
          if(i===0)point.y+=.4;
          if(i===1)point.y=points[0]!.y+1.85;
          direction.copy(camera).sub(point);const distance=direction.length();
          ray.set(point,direction.normalize());
          if(ray.intersectBox(bounds,hit)&&hit.distanceTo(point)<distance-.1){blocked=true;break;}
        }
        let state=states.get(mesh);
        if(!state&&blocked){
          const original=mesh.material,materials=Array.isArray(original)?original:[original];
          const copies=materials.map(mat=>{const clone=mat.clone();clone.transparent=true;clone.depthWrite=false;return clone;});
          state={original,copies,alpha:1};states.set(mesh,state);
        }
        if(!state)continue;
        const target=blocked?.015:1,follow=1-Math.exp(-(blocked?18:7)*dt);
        state.alpha+=(target-state.alpha)*follow;
        if(!blocked&&state.alpha>.995){mesh.material=state.original;state.alpha=1;continue;}
        const originals=Array.isArray(state.original)?state.original:[state.original];
        state.copies.forEach((mat,i)=>{mat.opacity=originals[i]!.opacity*state!.alpha;});
        mesh.material=Array.isArray(state.original)?state.copies:state.copies[0]!;
      }
    },
  };
}
