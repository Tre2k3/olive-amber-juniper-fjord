import * as THREE from "three";
export const VELI_ANCHOR = { x: 62, z: 22.4 };
const root = "/game-v2/vendors/veli/";
export function buildVeliTruck(parent: THREE.Object3D) {
  const group = new THREE.Group(); group.name = "velis-wings-truck"; group.position.set(62,0,27.2); parent.add(group);
  const cream = new THREE.MeshStandardMaterial({ color: 0xf4ecd9, roughness:.62 });
  const gold = new THREE.MeshStandardMaterial({ color:0xc89a40, roughness:.35,metalness:.65 });
  const dark = new THREE.MeshStandardMaterial({ color:0x23282a,roughness:.8 });
  const steel = new THREE.MeshStandardMaterial({color:0xbec2c1,roughness:.3,metalness:.65});
  const box = (w:number,h:number,d:number,x:number,y:number,z:number,mat:THREE.Material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat); m.position.set(x,y,z); m.castShadow=true;m.receiveShadow=true;group.add(m);return m;
  };
  // Real box truck with an open service hatch, kitchen floor and counter.
  box(3.1,.2,5.2,0,.7,0,dark); box(3.15,.17,5.3,0,3.35,0,cream);
  box(.15,2.6,5.2,-1.5,2.05,0,cream); box(.15,2.6,5.2,1.5,2.05,0,cream);
  box(3.1,2.6,.16,0,2.05,2.55,cream);
  box(3.1,.75,.16,0,1.12,-2.55,cream);
  box(.42,1.55,.16,-1.35,2.26,-2.55,cream); box(.42,1.55,.16,1.35,2.26,-2.55,cream);
  box(3.1,.3,.16,0,3.12,-2.55,cream);
  box(3.25,.08,.62,0,1.52,-2.78,steel);
  box(3.6,.1,1.2,0,3.35,-2.8,gold);
  box(3.1,.08,.1,0,.96,-2.67,gold);
  box(2.45,.65,.7,0,1.12,1.4,steel); box(.7,.1,.55,.85,1.52,1.1,dark);
  box(.2,.6,.2,-.85,1.58,1.4,steel);
  // Cab is behind the kitchen, so it cannot occlude the serving window.
  box(2.5,1.8,1.7,0,1.45,3.4,cream);
  box(2.1,.65,.08,0,2,4.28,new THREE.MeshStandardMaterial({color:0x264656,roughness:.2,metalness:.25}));
  for (const z of [-1.8,3.25]) for(const x of [-1.4,1.4]) {
    const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.42,.42,.25,16),dark);
    wheel.rotation.z=Math.PI/2;wheel.position.set(x,.42,z);group.add(wheel);
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(.21,.21,.26,12),steel);hub.rotation.z=Math.PI/2;hub.position.copy(wheel.position);group.add(hub);
  }
  const loader=new THREE.TextureLoader();
  const menu=loader.load(root+"menu-original.png"); menu.colorSpace=THREE.SRGBColorSpace;
  // Original portrait menu includes the actual logo; no redesigned brand art.
  const menuMat=new THREE.MeshBasicMaterial({map:menu,toneMapped:false});
  const board=new THREE.Mesh(new THREE.PlaneGeometry(1.12,1.68),menuMat); board.name="veli-original-menu";board.rotation.y=Math.PI;board.position.set(-2.05,1.52,-3.68);group.add(board);
  box(1.23,1.8,.12,-2.05,1.52,-3.59,dark);box(.12,.7,.12,-2.05,.35,-3.6,steel);
  const side=new THREE.Mesh(new THREE.PlaneGeometry(1.5,2.25),menuMat);side.position.set(1.59,2.01,0);side.rotation.y=Math.PI/2;group.add(side);
  // Exact original logo crop, with UVs limiting the supplied menu texture.
  const logo=menu.clone();logo.repeat.set(1,.405);logo.offset.set(0,.595);
  const logoPanel=new THREE.Mesh(new THREE.PlaneGeometry(2.2,1.34),new THREE.MeshBasicMaterial({map:logo,toneMapped:false}));
  logoPanel.name="veli-original-logo";logoPanel.rotation.y=Math.PI;logoPanel.position.set(0,4.02,-2.59);group.add(logoPanel);
  box(2.28,1.42,.1,0,4.02,-2.53,cream);
  const textures=["idle.png","serve-1.png","serve-2.png","serve-3.png","serve-4.png"].map(p=>{const t=loader.load(root+p);t.colorSpace=THREE.SRGBColorSpace;return t;});
  const mat=new THREE.MeshBasicMaterial({map:textures[0],transparent:true,alphaTest:.25,depthWrite:true,toneMapped:false});
  // Processed frames use 512px cells, 460px visible bodies and a 487px sole.
  const vendor=new THREE.Mesh(new THREE.PlaneGeometry(512*1.9/460,512*1.9/460),mat);
  vendor.name="yungveli";vendor.rotation.y=Math.PI;vendor.position.set(0,.8+(487-256)*1.9/460,-2.46);group.add(vendor);
  const handoff=new THREE.Group();handoff.name="veli-customer-box";group.add(handoff);handoff.visible=false;
  const food=new THREE.Mesh(new THREE.BoxGeometry(.33,.12,.23),cream);handoff.add(food);
  const lid=new THREE.Mesh(new THREE.BoxGeometry(.35,.025,.25),gold);lid.position.y=.072;handoff.add(lid);
  group.userData.vendor=vendor;group.userData.textures=textures;group.userData.frame=0;
  return group;
}
export function animateVeliTruck(group:THREE.Group, serving:number, customer:THREE.Vector3) {
  const vendor=group.userData.vendor as THREE.Mesh;
  const textures=group.userData.textures as THREE.Texture[];
  const elapsed=4-serving;
  const frame=serving<=0?0:elapsed<.8?1:elapsed<1.65?2:elapsed<2.3?3:4;
  (vendor.material as THREE.MeshBasicMaterial).map=textures[frame]!;
  group.userData.frame=frame;
  const parcel=group.getObjectByName("veli-customer-box")!;
  parcel.visible=serving>0&&elapsed>=2.3&&elapsed<3.65;
  if(parcel.visible) {
    const p=Math.min(1,(elapsed-2.3)/.75);
    parcel.position.set(THREE.MathUtils.lerp(0,customer.x-62,p),THREE.MathUtils.lerp(1.9,customer.y+.74,p),THREE.MathUtils.lerp(-2.46,customer.z-27.2,p));
  }
}
