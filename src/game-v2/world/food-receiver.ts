import * as THREE from "three";

/** Supplemental action cutout; the canonical directional sprites stay intact. */
export function createFoodReceiver(player:THREE.Group) {
  const factor=1.82/460, loader=new THREE.TextureLoader();
  const textures=Array.from({length:4},(_,i)=>{
    const map=loader.load(`/game-v2/actions/food-receive/frame-${i+1}.png`);map.colorSpace=THREE.SRGBColorSpace;return map;
  });
  const mat=new THREE.MeshBasicMaterial({map:textures[0],transparent:true,alphaTest:.25,toneMapped:false});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(512*factor,512*factor),mat);
  mesh.position.y=(487-256)*factor;mesh.visible=false;mesh.renderOrder=6;player.add(mesh);
  const grip=new THREE.Vector3(),start=new THREE.Vector3(),position=new THREE.Vector3();
  let parcel:THREE.Object3D|null=null,remaining=0,lastServing=false,progress=0,index=0,truckX=62;
  return {
    mesh,
    get active(){return mesh.visible;},
    get x(){return truckX;},
    control(dt:number,serving:number,box:THREE.Object3D|null,x:number,enabled:boolean) {
      if(!enabled){remaining=0;mesh.visible=false;lastServing=false;return;}
      if(serving>0&&box){parcel=box;truckX=x;progress=4-serving;remaining=.6;lastServing=true;mesh.visible=true;}
      else if(lastServing&&remaining>0){remaining=Math.max(0,remaining-dt);progress=4;mesh.visible=remaining>0;}
      else {mesh.visible=false;lastServing=false;}
    },
    update(camera:THREE.Camera) {
      if(!mesh.visible||!parcel)return;
      index=progress<2.3?0:progress<2.9?1:progress<3.25?2:3;
      mat.map=textures[index]!;
      mesh.rotation.y=Math.atan2(camera.position.x-player.position.x,camera.position.z-player.position.z);
      // Per-key palm centers, measured in the processed 512px cell. The carton
      // bottom sits on the cupped palms; its center is 6cm above their surface.
      const palms=[[-.14,.96],[-.21,1.147],[-.227,.996],[-.113,1.02]];
      const [x,y]=palms[index]!;
      grip.set(x!,y!+.06,.035);grip.applyAxisAngle(new THREE.Vector3(0,1,0),mesh.rotation.y);grip.add(player.position);
      if(progress>=2.3){
        parcel.visible=true;
        const vendor=parcel.parent!;
        const handX=vendor.name==="brothers-food-truck"?(vendor.userData.vendors as THREE.Mesh[])[vendor.userData.receiverBrother ?? 0]!.position.x:0;
        start.set(handX,1.86,-2.42);vendor.localToWorld(start);
        const p=THREE.MathUtils.smoothstep(progress,2.3,3.1);
        position.copy(start).lerp(grip,p);
        vendor.worldToLocal(position);parcel.position.copy(position);
        // Stable grip through the carry phase; only one parcel is used.
        parcel.rotation.y=mesh.rotation.y-vendor.rotation.y;
      }
    },
    reset(){remaining=0;lastServing=false;mesh.visible=false;if(parcel)parcel.visible=false;},
    state(){return {active:mesh.visible,frame:index,progress,grip:{x:grip.x,y:grip.y,z:grip.z},loaded:textures.every(t=>Boolean((t.image as HTMLImageElement)?.naturalWidth)),holding:mesh.visible&&progress>=3.1};},
    dispose(){mesh.geometry.dispose();mat.dispose();textures.forEach(t=>t.dispose());},
  };
}
