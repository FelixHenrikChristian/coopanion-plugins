import * as THREE from 'three';
import {paintAmaneMark} from './store.js';

// Low, feathered light reflected back from the humid air under the canopy.
function lightRibbon(parent,x,y,z,w,h,tint,angle=0,strength=.22) {
  const c=document.createElement('canvas');c.width=320;c.height=96;
  const ctx=c.getContext('2d');ctx.scale(160,48);
  const g=ctx.createRadialGradient(1,1,0,1,1,1);
  g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(.42,'rgba(255,255,255,.58)');
  g.addColorStop(.78,'rgba(255,255,255,.15)');g.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=g;ctx.fillRect(0,0,2,2);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({
    map:new THREE.CanvasTexture(c),color:tint,transparent:true,opacity:strength,
    blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
  }));
  mesh.position.set(x,y,z);mesh.rotation.y=angle;mesh.renderOrder=5;parent.add(mesh);
}

function printed(parent,canvas,x,y,z,w,h,angle=0) {
  const texture=new THREE.CanvasTexture(canvas);
  texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,toneMapped:false}));
  mesh.position.set(x,y,z);mesh.rotation.y=angle;parent.add(mesh);
}

export function addFinishing(k) {
  const {group,box,cyl}=k;
  const p=group('Corner · illuminated Amane sign',2.63);
  const column = new THREE.Group();
  column.position.set(2.89,.18,-3.89);column.rotation.y=.31;p.add(column);
  box(column,0,.07,0,.39,.14,.43,'#718186');
  cyl(column,0,1.98,0,.064,.095,3.90,'#8aa5a2',{metalness:.43});
  box(column,0,3.99,0,1.17,1.30,.22,'#263e4d');
  box(column,0,3.99,.009,1.20,1.22,.215,'#4e9090');
  const canvas=document.createElement('canvas');canvas.width=400;canvas.height=415;
  const c=canvas.getContext('2d');c.fillStyle='#fff2cc';c.fillRect(0,0,400,415);
  paintAmaneMark(c,200,130,91);
  c.textAlign='center';c.fillStyle='#19575a';c.font='900 54px "Yu Gothic","Microsoft YaHei",sans-serif';c.fillText('雨音マート',200,291);
  c.fillStyle='#ee856d';c.fillRect(0,317,400,6);
  c.fillStyle='#187f79';c.fillRect(0,323,400,92);c.fillStyle='#fff4c9';
  c.font='bold 44px Arial';c.fillText('OPEN  24h',200,383);
  printed(column,canvas,0,3.99,.123,1.13,1.205);
  printed(column,canvas,0,3.99,-.116,1.13,1.205,Math.PI);
  box(column,0,3.27,0,.48,.10,.22,'#657e83');

  const light=group('Amane · neon and eave lights',2.79);
  const lineMat={emissive:'#56dbbc',intensity:1.33};
  box(light,-1.30,3.55,1.054,7.61,.023,.019,'#a6f0c4',lineMat);
  box(light,2.55,3.55,-1.90,.019,.023,5.88,'#a6f0c4',lineMat);
  box(light,-1.30,2.895,1.048,7.62,.017,.024,'#ffc799',{emissive:'#ffaf77',intensity:1.70});
  box(light,2.545,2.895,-1.90,.024,.017,5.88,'#ffc799',{emissive:'#ffaf77',intensity:1.70});
  lightRibbon(light,-1.35,3.52,1.075,8.3,.49,'#8de6c4',0,.24);
  lightRibbon(light,-1.35,2.87,1.072,8.6,.55,'#ffad67',0,.31);
  lightRibbon(light,2.57,2.88,-1.90,6.7,.53,'#ffb675',Math.PI/2,.34);
  lightRibbon(light,-4.35,1.85,1.62,1.67,1.83,'#ff9984',0,.15);
  lightRibbon(light,3.885,3.897,1.48,.91,.44,'#ffe0aa',0,.47);
  k.glow(light,3.887,3.90,1.43,'#ffcf93',1.44,.36);

  // A low garden boundary leaves the passage between the shops open to the rear.
  const alley=group('Alley · fence and entrance',1.33);
  const wood=['#615a60','#655c60','#705f61','#605d64','#6b6165'];
  for(let j=0;j<51;j++){
    const x=-10.31+j*.26,h=1.13+(j%7===0?.025:0);
    box(alley,x,h*.5+.18,-8.47,.245,h,.095,wood[j%5]);
  }
  for(const x of [-10.41,-7.8,-5.16,-2.57,.08,2.76])box(alley,x,.78,-8.45,.102,1.22,.17,'#414952');
  for(const y of [.48,1.12])box(alley,-3.81,y,-8.53,13.28,.081,.13,'#414b55');
  box(alley,-3.81,1.34,-8.47,13.28,.062,.154,'#958b88');
}
