import * as THREE from "three";
import { detailFoodTruck } from "./truck-detail";
import { FOOD_VENDORS, type FoodVendor } from "../play/food-court";

export function buildFoodCourt(parent: THREE.Object3D) {
  const loader = new THREE.TextureLoader();
  const trucks = {} as Record<FoodVendor, THREE.Group>;
  for (const id of ["brothers", "catch901"] as const) {
    const spec = FOOD_VENDORS[id], group = new THREE.Group();
    group.name = `${id}-food-truck`; group.position.set(spec.x, 0, 27.2); parent.add(group); trucks[id] = group;
    const body = new THREE.MeshStandardMaterial({ color: id === "brothers" ? 0xb92925 : 0x134630, roughness: .48, metalness: .25 });
    const steel = new THREE.MeshStandardMaterial({ color: 0xc0c3c4, roughness: .32, metalness: .7 });
    const black = new THREE.MeshStandardMaterial({ color: 0x17191b, roughness: .75 });
    const gold = new THREE.MeshStandardMaterial({ color: 0xdbb343, roughness: .38, metalness: .55 });
    const add = (w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); mesh.position.set(x,y,z);
      mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh); return mesh;
    };
    // Open service wall, modeled kitchen/cab; artwork is signage and staff only.
    add(3.4,.18,5.2,0,.74,0,black); add(3.4,.14,5.3,0,3.3,0,body);
    add(.14,2.5,5.2,-1.65,2,0,body); add(.14,2.5,5.2,1.65,2,0,body);
    add(3.4,2.5,.14,0,2,2.55,body); add(3.4,.72,.14,0,1.1,-2.55,body);
    for (const x of [-1.52,1.52]) add(.25,1.8,.14,x,2.32,-2.55,body);
    add(3.4,.18,.14,0,3.2,-2.55,body); add(3.6,.07,.64,0,1.52,-2.8,steel);
    add(3.9,.1,1.1,0,3.32,-2.85,gold); add(3.4,.05,.12,0,1,-2.65,gold);
    add(3,.65,.8,0,1.14,1.3,steel); add(1,.05,.7,-.75,1.49,1.3,black);
    for (const x of [-1,-.6]) { const ring = new THREE.Mesh(new THREE.TorusGeometry(.15,.024,6,16),steel); ring.rotation.x=Math.PI/2;ring.position.set(x,1.53,1.3);group.add(ring); }
    add(.7,.55,.6,1,1.75,1.3,steel); add(2.5,1.8,1.65,0,1.4,3.4,body);
    add(2.15,.64,.06,0,2,4.25,new THREE.MeshStandardMaterial({color:0x314e62,roughness:.18,metalness:.3}));
    add(2.5,.16,.18,0,.8,4.35,steel);
    for(const x of [-.9,.9]) add(.32,.18,.08,x,1.1,4.3,new THREE.MeshBasicMaterial({color:0xffe9b3}));
    for (const z of [-1.8,3.25]) for(const x of [-1.53,1.53]) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.25,16),black);tire.rotation.z=Math.PI/2;tire.position.set(x,.42,z);group.add(tire);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.22,.22,.26,12),steel);hub.rotation.z=Math.PI/2;hub.position.copy(tire.position);group.add(hub);
    }
    const logo = loader.load(spec.logo); logo.colorSpace = THREE.SRGBColorSpace;
    const signMat = new THREE.MeshBasicMaterial({map:logo,color:0xcccccc,toneMapped:false});
    const aspect = id === "brothers" ? 864/721 : 1.5;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.05,2.05/aspect),signMat);
    sign.name = `${id}-original-logo`;sign.rotation.y=Math.PI;sign.position.set(0,4.21,-2.64);group.add(sign);
    add(2.15,2.05/aspect+.1,.08,0,4.21,-2.58,black);
    const side = new THREE.Mesh(new THREE.PlaneGeometry(2.3,2.3/aspect),signMat);side.position.set(1.73,2,0);side.rotation.y=Math.PI/2;group.add(side);
    const vendors: THREE.Mesh[] = [];
    const textures: THREE.Texture[][] = [];
    if (id === "brothers") for (let i=0;i<2;i++) {
      const maps=[`brother-${i+1}.png`,...Array.from({length:4},(_,n)=>`brother-${i+1}-serve-${n+1}.png`)].map(file=>{
        const texture=loader.load(`/game-v2/vendors/food-court/${file}`);texture.colorSpace=THREE.SRGBColorSpace;return texture;
      });
      textures.push(maps);const image=maps[0];
      const actor = new THREE.Mesh(new THREE.PlaneGeometry(512*1.9/460,512*1.9/460),new THREE.MeshBasicMaterial({map:image,transparent:true,alphaTest:.25,toneMapped:false}));
      actor.rotation.y=Math.PI;actor.position.set(i===0?.67:-.67,.8+(487-256)*1.9/460,-2.42);
      actor.name=`brother-wingz-${i+1}`;group.add(actor);vendors.push(actor);
    }
    // 901 Catch Kitchen: the fish cook at the window, framed exactly like the brothers.
    if (id === "catch901") {
      const tex=loader.load("/game-v2/vendors/food-court/catch-vendor.png");tex.colorSpace=THREE.SRGBColorSpace;
      const actor=new THREE.Mesh(new THREE.PlaneGeometry(512*1.9/460,512*1.9/460),new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.25,toneMapped:false}));
      actor.rotation.y=Math.PI;actor.position.set(0,.8+(487-256)*1.9/460,-2.42);actor.name="catch901-vendor";group.add(actor);vendors.push(actor);
    }
    const tray=new THREE.Group();tray.name=`${id}-order-tray`;tray.visible=false;group.add(tray);
    const parcel=new THREE.Mesh(new THREE.BoxGeometry(.35,.12,.25),new THREE.MeshBasicMaterial({color:0xeae5dd,toneMapped:false}));tray.add(parcel);
    const lid=new THREE.Mesh(new THREE.BoxGeometry(.37,.02,.27),new THREE.MeshBasicMaterial({color:0xeae5dd,toneMapped:false}));lid.position.y=.07;tray.add(lid);
    if(id === "brothers") {
      const stripe=new THREE.Mesh(new THREE.BoxGeometry(.24,.006,.15),new THREE.MeshBasicMaterial({color:0xe62f2f,toneMapped:false}));stripe.position.y=.083;tray.add(stripe);
    }
    group.userData.vendors=vendors;group.userData.textures=textures;group.userData.frames=[0,0];
    detailFoodTruck(group,3.4,id === "brothers" ? 0xe3b14a : 0xd8c795);
  }
  return trucks;
}
export function animateFoodCourt(trucks:Record<FoodVendor,THREE.Group>, serving:FoodVendor|null,left:number,customer:THREE.Vector3,activeBrother:number) {
  for(const id of ["brothers","catch901"] as const) {
    const truck=trucks[id],tray=truck.getObjectByName(`${id}-order-tray`)!;
    const progress=4-left;
    const isServing=serving===id&&left>0;
    const frame=!isServing?0:progress<.8?1:progress<1.65?2:progress<2.3?3:4;
    if(id === "brothers") {
      const vendors=truck.userData.vendors as THREE.Mesh[];
      const textures=truck.userData.textures as THREE.Texture[][];
      const frames=vendors.map((actor,i)=>{
        const current=i===activeBrother?frame:0;
        (actor.material as THREE.MeshBasicMaterial).map=textures[i]![current]!;return current;
      });
      truck.userData.frames=frames;
    }
    if(id === "catch901") {
      // A gentle sway while she plates your order; still otherwise.
      const cook=(truck.userData.vendors as THREE.Mesh[])[0];
      if(cook) cook.position.y=.8+(487-256)*1.9/460+(isServing?Math.sin(progress*7)*.025:0);
    }
    // The carton exists in the held artwork until the empty-hand retract key.
    // Only then transfer the matching 3D carton; never draw two food boxes.
    const handoffStart=id === "brothers"?2.3:.7;
    tray.visible=isServing&&progress>=handoffStart&&progress<3.65;
    if(tray.visible) {
      const linear=THREE.MathUtils.clamp((progress-handoffStart)/.8,0,1);
      const p=linear*linear*(3-2*linear);
      const handX=id === "brothers"?(truck.userData.vendors as THREE.Mesh[])[activeBrother]!.position.x:0;
      tray.position.set(THREE.MathUtils.lerp(handX,customer.x-truck.position.x,p),
        THREE.MathUtils.lerp(1.86,customer.y+1.06,p),THREE.MathUtils.lerp(-2.42,customer.z-truck.position.z+.25,p));
    }
  }
}
