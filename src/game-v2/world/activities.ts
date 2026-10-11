import * as THREE from "three";
import { RACE_LENGTH, RACE_HALF_WIDTH, sampleRace, validateRaceTrack } from "../play/racing";
import { carBody } from "./kits/vehicles";
import { flagshipLogo } from "./kits/brand";
export function buildRaceCircuit(scene: THREE.Scene) {
  validateRaceTrack();
  const group = new THREE.Group(); group.name = "nitro-race-circuit"; group.visible = false; scene.add(group);
  const road = new THREE.MeshStandardMaterial({color:0x393a3e,roughness:.94});
  const grass = new THREE.MeshStandardMaterial({color:0x394e33,roughness:1});
  const base = new THREE.Mesh(new THREE.PlaneGeometry(130,90),grass);
  base.rotation.x=-Math.PI/2; base.position.set(0,.015,-150); group.add(base);
  const positions:number[]=[], uv:number[]=[], index:number[]=[];
  const count=192;
  for(let i=0;i<=count;i++) {
    const p=sampleRace(i*RACE_LENGTH/count);
    const rx=Math.cos(p.yaw), rz=-Math.sin(p.yaw);
    for(const side of [-1,1]) { positions.push(p.x+rx*RACE_HALF_WIDTH*side,.06,p.z+rz*RACE_HALF_WIDTH*side); uv.push(i/4,(side+1)/2); }
    if(i<count) { const a=i*2; index.push(a,a+1,a+2,a+1,a+3,a+2); }
  }
  const geo=new THREE.BufferGeometry(); geo.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geo.setAttribute("uv",new THREE.Float32BufferAttribute(uv,2));geo.setIndex(index);geo.computeVertexNormals();
  const deck=new THREE.Mesh(geo,road);deck.material.side=THREE.DoubleSide;deck.receiveShadow=true;group.add(deck);
  const curbMat=new THREE.MeshStandardMaterial({roughness:.85});
  const curbs=new THREE.InstancedMesh(new THREE.BoxGeometry(1.2,.24,.3),curbMat,count*2);
  const barrier=new THREE.InstancedMesh(new THREE.BoxGeometry(1.2,.65,.2),new THREE.MeshStandardMaterial({color:0x757b7c,metalness:.25,roughness:.7}),count*2);
  const dummy=new THREE.Object3D();
  for(let i=0;i<count;i++) {
    const p=sampleRace((i+.5)*RACE_LENGTH/count);
    for(const [k,side] of [-1,1].entries()) {
      const n=i*2+k;
      dummy.position.set(p.x+Math.cos(p.yaw)*(RACE_HALF_WIDTH+.12)*side,.17,
        p.z-Math.sin(p.yaw)*(RACE_HALF_WIDTH+.12)*side);
      dummy.rotation.set(0,p.yaw+Math.PI/2,0);dummy.updateMatrix();curbs.setMatrixAt(n,dummy.matrix);
      curbs.setColorAt(n,new THREE.Color(i%2?0xe2ded0:0x922e2e));
      dummy.position.x+=Math.cos(p.yaw)*.36*side;dummy.position.z-=Math.sin(p.yaw)*.36*side;
      dummy.position.y=.48;dummy.updateMatrix();barrier.setMatrixAt(n,dummy.matrix);
    }
  }
  curbs.instanceMatrix.needsUpdate=true;barrier.instanceMatrix.needsUpdate=true;group.add(curbs,barrier);
  const flagMat=new THREE.MeshBasicMaterial({color:0xf5edd4});
  const checks=new THREE.InstancedMesh(new THREE.BoxGeometry(.45,.014,.45),flagMat,32);
  for(let i=0;i<32;i++) {
    dummy.position.set(-32+(i%2)*.45,.077,-171.4+Math.floor(i/2)*.45);
    dummy.rotation.set(0,0,0);dummy.updateMatrix();checks.setMatrixAt(i,dummy.matrix);
    checks.setColorAt(i,new THREE.Color((i%2+Math.floor(i/2))%2?0x191a1c:0xf5edd4));
  }
  checks.instanceMatrix.needsUpdate=true;group.add(checks);
  const iron=new THREE.MeshStandardMaterial({color:0x2e3236,roughness:.6,metalness:.3});
  for(const z of [-172,-164]) {const pole=new THREE.Mesh(new THREE.BoxGeometry(.2,4.5,.2),iron);pole.position.set(-32,2.25,z);group.add(pole);}
  const beam=new THREE.Mesh(new THREE.BoxGeometry(.22,.25,8.2),iron);beam.position.set(-32,4.5,-168);group.add(beam);
  const logo=flagshipLogo(3);logo.rotation.y=-Math.PI/2;logo.position.set(-32.18,3.85,-168);group.add(logo);
  const human=carBody("coupe"),nitro=carBody("sedan");group.add(human,nitro);
  const glow=new THREE.MeshBasicMaterial({color:0xffb940,transparent:true,opacity:.75,depthWrite:false});
  const sparks=new THREE.Points(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(new Float32Array(18),3)),
    new THREE.PointsMaterial({color:0xffc357,size:.12,transparent:true,opacity:.8,depthWrite:false}));
  sparks.visible=false;group.add(sparks);
  // An infield flag marker identifies the human without altering the vehicle art.
  const marker=new THREE.Mesh(new THREE.ConeGeometry(.16,.3,8),glow);group.add(marker);
  return {group,human,nitro,sparks,marker};
}
export function buildHauntAtmosphere(group: THREE.Group) {
  const effects=new THREE.Group();effects.name="haunt-atmosphere";group.add(effects);
  const webPositions:number[]=[];
  for(const [x,y,z] of [[.42,6.3,.3],[7.5,6.25,7.65],[24.4,3.95,.3],[31.55,3.9,7.65],[16.4,3.95,.3]]) {
    for(let j=0;j<7;j++) {
      const a=j*Math.PI/12,dx=Math.cos(a)*1.15,dy=-Math.sin(a)*1.15;
      webPositions.push(x!,y!,z!,x!+dx,y!+dy,z!);
      for(const radius of [.35,.6,.85]) {
        const b=a+Math.PI/12;
        webPositions.push(x!+Math.cos(a)*radius,y!-Math.sin(a)*radius,z!,
          x!+Math.cos(b)*radius,y!-Math.sin(b)*radius,z!);
      }
    }
  }
  effects.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position",new THREE.Float32BufferAttribute(webPositions,3)),
    new THREE.LineBasicMaterial({color:0xbdb9ae,transparent:true,opacity:.35})));
  const cloth=new THREE.MeshBasicMaterial({color:0xb9c9ca,transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide});
  for(const [i,p] of [[20.9,2.05,5.8],[36.5,1.95,6.6]].entries()) {
    const ghost=new THREE.Group();ghost.name="haunt-wraith";ghost.position.set(p[0]!,p[1]!,p[2]!);
    ghost.userData.homeY=p[1];ghost.userData.homeX=p[0];ghost.userData.phase=i*2;
    const head=new THREE.Mesh(new THREE.SphereGeometry(.2,12,8),cloth);head.position.y=.43;
    const drape=new THREE.Mesh(new THREE.ConeGeometry(.4,1.1,12,4,true),cloth);drape.position.y=-.1;ghost.add(head,drape);
    const eyes=new THREE.MeshBasicMaterial({color:0xcedce4,transparent:true,opacity:.5});
    for(const x of [-.07,.07]) {const eye=new THREE.Mesh(new THREE.SphereGeometry(.032,6,4),eyes);eye.position.set(x,.46,-.17);ghost.add(eye);}
    effects.add(ghost);
  }
  const dust=new THREE.InstancedMesh(new THREE.SphereGeometry(.009,4,3),new THREE.MeshBasicMaterial({color:0xba9f79,transparent:true,opacity:.3}),40);
  const d=new THREE.Object3D();
  for(let i=0;i<40;i++){d.position.set(.6+(i*37%300)/10,.7+(i%27)/10,.7+(i*13%60)/10);d.updateMatrix();dust.setMatrixAt(i,d.matrix);}
  dust.name="haunt-dust";dust.instanceMatrix.needsUpdate=true;effects.add(dust);
  return effects;
}
export function animateHauntAtmosphere(group: THREE.Group,time:number) {
  const effects=group.getObjectByName("haunt-atmosphere");if(!effects)return;
  for(const node of effects.children) if(node.name==="haunt-wraith") {
    const phase=time*.5+Number(node.userData.phase);
    node.position.y=Number(node.userData.homeY)+Math.sin(phase)*.13;
    node.position.x=Number(node.userData.homeX)+Math.sin(phase*.7)*.17;
    node.rotation.y=Math.sin(phase*.55)*.35;
    for(const child of node.children) if(child instanceof THREE.Mesh && child.material instanceof THREE.MeshBasicMaterial)
      child.material.opacity=child.geometry instanceof THREE.SphereGeometry && child.geometry.parameters.radius < .05 ? .4 : .13+Math.sin(phase)*.05;
  }
  const dust=effects.getObjectByName("haunt-dust");if(dust)dust.position.y=Math.sin(time*.18)*.12;
}
