import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

/** Static fittings are merged by material: detail without hundreds of draw calls. */
export function detailFoodTruck(group: THREE.Group, width: number, accent: number) {
  const detail = new THREE.Group(); detail.name = "truck-production-fittings"; group.add(detail);
  const steel = new THREE.MeshStandardMaterial({ color: 0xc4c9c9, metalness: .32, roughness: .42 });
  const trim = new THREE.MeshStandardMaterial({ color: accent, metalness: .15, roughness: .48 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x171e20, roughness: .8 });
  const tile = new THREE.MeshStandardMaterial({ color: 0xe4e0d5, roughness: .68 });
  const warm = new THREE.MeshBasicMaterial({ color: 0x967442 });
  const red = new THREE.MeshBasicMaterial({ color: 0xab2722, toneMapped: false });
  const glass = new THREE.MeshStandardMaterial({ color: 0x456b7b, roughness: .26, metalness: .15 });
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const put = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromEuler(new THREE.Euler(rx,ry,rz)),new THREE.Vector3(1,1,1)));
    const list = batches.get(mat) ?? []; list.push(geo); batches.set(mat,list);
  };
  const box = (w: number,h: number,d: number,x: number,y: number,z: number,mat: THREE.Material) => put(new THREE.BoxGeometry(w,h,d),mat,x,y,z);
  const pipe = (a: THREE.Vector3,b: THREE.Vector3,r: number,mat: THREE.Material) => {
    const delta=b.clone().sub(a), geo=new THREE.CylinderGeometry(r,r,delta.length(),8);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
    geo.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2);
    const list=batches.get(mat)??[];list.push(geo);batches.set(mat,list);
  };
  const half=width/2;
  // Hatch frame/supports leave the vendor's illustrated arms and parcel unobstructed.
  for(const x of [-half+.14,half-.14]) {
    box(.045,1.5,.055,x,2.29,-2.65,steel);
    pipe(new THREE.Vector3(x,2.66,-2.64),new THREE.Vector3(x,3.28,-3.33),.026,steel);
    box(.18,.12,.065,x,.84,-2.67,red);
  }
  box(width,.055,.09,0,3.04,-2.67,steel);
  box(width-.3,.055,.13,0,3.18,-2.87,warm);
  box(width,.18,.065,0,1.19,-2.66,trim);
  box(width,.04,.065,0,.81,-2.67,steel);
  // Service doors, hinges, panel seams and recessed ventilation below the counter.
  for(const x of [-.7,.7]) {
    box(.015,.36,.045,x,1.04,-2.67,dark);
    box(.15,.025,.045,x+.2,1.35,-2.68,steel);
  }
  for(let i=0;i<7;i++) box(.5,.025,.04,.95,.94+i*.042,-2.68,dark);
  // Kitchen backsplash, grout, extractor and preparation equipment behind staff.
  box(width-.3,1.22,.035,0,2.26,2.44,tile);
  for(let i=0;i<4;i++) box(width-.3,.013,.025,0,1.71+i*.3,2.41,steel);
  for(let i=0;i<7;i++) box(.012,1.2,.025,-half+.3+i*.45,2.26,2.41,steel);
  box(1.4,.32,.65,-.4,2.92,1.2,steel);
  for(let i=0;i<7;i++) box(.018,.16,.022,-.95+i*.18,2.92,.86,dark);
  box(.48,.6,.45,half-.5,1.85,.85,steel);
  box(.42,.5,.025,half-.5,1.85,.6,dark);
  for(const x of [-.8,-.4,0]) {
    put(new THREE.CylinderGeometry(.055,.07,.23,10),trim,x,1.64,1);
    box(.06,.08,.06,x,1.795,1,dark);
  }
  // Side rub rails, cab windows/handles, roof vent, mirror arms and running boards.
  for(const s of [-1,1]) {
    box(.065,.13,5,s*(half+.025),1.05,0,trim);
    box(.065,.025,5,s*(half+.03),.84,0,steel);
    box(.06,.52,.88,s*1.28,2.02,3.44,glass);
    box(.07,.028,.23,s*1.33,1.59,3.65,steel);
    box(.36,.1,1.4,s*1.35,.64,3.45,steel);
    pipe(new THREE.Vector3(s*1.25,2.05,3.9),new THREE.Vector3(s*1.68,2.05,3.9),.025,dark);
    box(.1,.34,.24,s*1.7,2.12,3.9,dark);
    box(.015,.27,.18,s*1.76,2.12,3.9,steel);
    for(const z of [-1.8,3.25]) {
      const x=s*(half-.04);
      put(new THREE.TorusGeometry(.36,.055,6,20),dark,x,.42,z,0,Math.PI/2);
      put(new THREE.CylinderGeometry(.13,.13,.04,12),steel,x+s*.14,.42,z,0,0,Math.PI/2);
      for(let i=0;i<5;i++) put(new THREE.SphereGeometry(.023,6,4),dark,x+s*.17,.42+Math.sin(i*Math.PI*2/5)*.16,z+Math.cos(i*Math.PI*2/5)*.16);
    }
  }
  box(.8,.22,.75,.6,3.54,.8,steel);
  for(let i=0;i<5;i++) box(.65,.018,.02,.6,3.53+i*.025,.415,dark);
  box(1.5,.22,.055,0,1.1,4.31,dark);
  for(let i=0;i<4;i++) box(1.4,.019,.02,0,1.02+i*.055,4.35,steel);
  for(const x of [-.87,.87]) box(.3,.18,.07,x,1.3,4.33,warm);
  for(const [mat,geos] of batches) {
    const merged=mergeGeometries(geos,false)!;
    const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=!(mat instanceof THREE.MeshBasicMaterial);mesh.receiveShadow=true;detail.add(mesh);
    for(const geo of geos) geo.dispose();
  }
}
