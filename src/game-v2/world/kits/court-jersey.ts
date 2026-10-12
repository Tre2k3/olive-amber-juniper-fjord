import * as THREE from "three";
import { flagshipLogo } from "./brand";
import { canvasTex } from "./materials";

/** Reversible 3D practice jersey over the untouched illustrated body. */
export function createCourtJersey(number: number, team: number) {
  const group=new THREE.Group();group.name="sack-court-jersey";group.visible=false;
  const garment=(neck:number)=>{const shape=new THREE.Shape();shape.moveTo(-.24,-.3);shape.lineTo(-.28,.02);shape.quadraticCurveTo(-.21,.12,-.20,.31);shape.lineTo(-.11,.31);shape.quadraticCurveTo(-.11,neck,0,neck);shape.quadraticCurveTo(.11,neck,.11,.31);shape.lineTo(.20,.31);shape.quadraticCurveTo(.21,.12,.28,.02);shape.lineTo(.24,-.3);shape.closePath();return new THREE.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelSegments:2,steps:1,bevelSize:.008,bevelThickness:.006});};
  const geometry=garment(.14),backGeometry=garment(.28);
  const weave=canvasTex((g,w,h)=>{g.fillStyle='#dedede';g.fillRect(0,0,w,h);g.fillStyle='#b8b8b8';for(let y=0;y<h;y+=6)for(let x=0;x<w;x+=6)g.fillRect(x+(y%12?2:0),y,1,2);},128,128,true);
  const fabric=new THREE.MeshStandardMaterial({color:team===0?0x154d35:0xc29a45,map:weave,roughness:.92,metalness:0});
  const jersey=new THREE.Mesh(geometry,fabric);jersey.renderOrder=7;group.add(jersey);
  const ink=team===0?0xf5e8c7:0x17231c;
  const logo=flagshipLogo(.44,ink);logo.position.set(0,.02,.048);logo.renderOrder=7;group.add(logo);
  const numerals=canvasTex((g,w,h)=>{g.clearRect(0,0,w,h);g.fillStyle=team===0?'#f5e8c7':'#17231c';g.textAlign='center';g.textBaseline='middle';g.font='900 175px Arial';g.fillText(String(number),w/2,h/2);},256,256);
  const numberMaterial=new THREE.MeshBasicMaterial({map:numerals,transparent:true,depthWrite:false,toneMapped:false});
  const back=new THREE.Mesh(new THREE.PlaneGeometry(.32,.32),numberMaterial);back.position.set(0,-.07,.05);back.renderOrder=7;group.add(back);
  const hem=new THREE.Mesh(new THREE.BoxGeometry(.52,.022,.045),new THREE.MeshBasicMaterial({color:ink}));hem.position.set(0,-.25,.015);group.add(hem);
  // The source skin/arms remain above the jersey, preventing cloth covering hands.
  const skinMaterial=new THREE.MeshBasicMaterial({transparent:true,alphaTest:.15,depthWrite:false,side:THREE.DoubleSide});
  skinMaterial.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#include <map_fragment>\n vec3 pigment=diffuseColor.rgb/max(diffuse,vec3(.001));\n if (!(pigment.r > pigment.g * 1.12 && pigment.g > pigment.b * 1.10 && pigment.g > pigment.r * .24)) discard;');};
  skinMaterial.customProgramCacheKey=()=>"court-original-skin-layer-v2";
  const skin=new THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>(new THREE.PlaneGeometry(1,1),skinMaterial);skin.name="court-original-arms";skin.renderOrder=8;skin.position.z=.075;
  let source:THREE.Mesh|null=null;const initialSkinGeometry=skin.geometry;
  return {
    group,
    update(mesh:THREE.Mesh,enabled:boolean,rear:boolean,side:number,torsoY:number=1.02,torsoX=0,height=1) {
      if(source!==mesh){source?.remove(group,skin);source=mesh;mesh.add(group,skin);}
      group.visible=enabled&&mesh.visible;skin.visible=group.visible;
      group.position.set(torsoX,torsoY,.035);group.scale.set((mesh.scale.x<0?-1:1)*side,height,1);jersey.geometry=rear?backGeometry:geometry;
      logo.position.y=rear?.17:.02;logo.scale.setScalar(rear?.68:1);back.visible=rear;
      skin.geometry=mesh.geometry;
      const material=mesh.material as THREE.MeshBasicMaterial;skinMaterial.map=material.map;
      skinMaterial.color.copy(material.color);
    },
    dispose(){source?.remove(group,skin);initialSkinGeometry.dispose();skinMaterial.dispose();geometry.dispose();backGeometry.dispose();fabric.dispose();weave.dispose();numerals.dispose();numberMaterial.dispose();back.geometry.dispose();hem.geometry.dispose();(hem.material as THREE.Material).dispose();logo.geometry.dispose();(logo.material as THREE.Material).dispose();},
  };
}
