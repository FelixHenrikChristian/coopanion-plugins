import * as THREE from 'three';
import {buildStationFrontages} from './station-frontages.js';

// Sign painters, glass blocks and anodized metal give each street bay its own
// construction and period. All printed material is drawn locally, in the same
// units and colour space as the shop across the junction.
export function buildStationRow(k){
  const {group,box,cyl,line,glow}=k;
  const shells=group('駅前 · 建物',1.07),glass=group('駅前 · 窓と店内',1.73);
  const plant=group('駅前 · 屋上設備',2.96),signs=group('駅前 · 点灯',3.11);
  const night='#283544';
  function plate(p,x,y,z,w,h,map,turn=0){
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,toneMapped:false}));
    mesh.position.set(x,y,z);mesh.rotation.y=turn;p.add(mesh);return mesh;
  }
  const faces=new Map();
  function graphic(key,w,h,draw){
    if(faces.has(key))return faces.get(key);
    const c=document.createElement('canvas');c.width=w;c.height=h;
    draw(c.getContext('2d'),w,h);
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;faces.set(key,t);return t;
  }
  function letter(c,str,x,y,size,color,face='sans-serif',weight=700){
    c.fillStyle=color;c.font=weight+' '+size+'px '+face;c.textBaseline='middle';c.fillText(str,x,y);
  }
  const jp='"Yu Gothic","Hiragino Kaku Gothic ProN","Microsoft YaHei",sans-serif';
  const recordFace=graphic('record shop enamel',1024,184,(c,w,h)=>{
    c.fillStyle='#e8dcc4';c.fillRect(0,0,w,h);
    c.fillStyle='#28505a';c.fillRect(0,0,w,10);c.fillRect(0,h-11,w,11);
    c.fillStyle='#d97979';c.fillRect(14,22,143,140);
    c.fillStyle='#253a4b';c.beginPath();c.arc(85,92,51,0,Math.PI*2);c.fill();
    c.strokeStyle='#b3bcb4';c.lineWidth=1.8;
    for(const r of [29,35,43]){c.beginPath();c.arc(85,92,r,.4,3.9);c.stroke();}
    c.fillStyle='#f3dfae';c.beginPath();c.arc(85,92,12,0,Math.PI*2);c.fill();
    letter(c,'余白レコード',186,75,72,'#233e4b',jp,800);
    letter(c,'Y O H A K U   R E C O R D S',189,135,24,'#40656b','Arial');
    c.fillStyle='#70817d';c.fillRect(792,34,2,116);
    letter(c,'LP / EP',828,69,37,'#3c535d','Arial');letter(c,'中古・新譜',828,124,23,'#826563',jp);
  });
  const blade=graphic('record blade',160,768,(c,w,h)=>{
    c.fillStyle='#e58b98';c.fillRect(0,0,w,h);c.strokeStyle='#ffe5cf';c.lineWidth=4;c.strokeRect(9,11,w-18,h-22);
    c.textAlign='center';letter(c,'33',80,67,52,'#762f4b','Arial');letter(c,'RPM',80,111,20,'#762f4b','Arial');
    ['レ','コ','ー','ド'].forEach((s,i)=>letter(c,s,80,224+i*127,89,'#fff0d5',jp,900));
  });
  const laundryFace=graphic('laundry enamel',768,140,(c,w,h)=>{
    c.fillStyle='#264558';c.fillRect(0,0,w,h);c.fillStyle='#9cd5cc';c.fillRect(0,h-9,w,9);
    c.lineWidth=6;c.strokeStyle='#bddfd5';c.beginPath();c.arc(71,68,39,0,Math.PI*2);c.stroke();
    c.beginPath();c.moveTo(39,69);c.bezierCurveTo(57,50,77,88,105,65);c.stroke();
    letter(c,'コインランドリー',134,57,49,'#e4efd9',jp);letter(c,'S U I S E I     L A U N D R Y',139,109,18,'#a0d4d1','Arial');
    letter(c,'24H',652,70,36,'#efc39e','Arial');
  });
  function album(i){
    return graphic('sleeve'+i,128,128,(c,w,h)=>{
      const bg=['#c27579','#4f8e9c','#e9c68a','#46576d','#ced2ab','#8982a3'];
      c.fillStyle=bg[i%6];c.fillRect(0,0,w,h);c.fillStyle=bg[(i+2)%6];
      if(i%3===0){c.beginPath();c.arc(82,56,39,0,2*Math.PI);c.fill();c.fillStyle='#564562';c.fillRect(0,67,128,7);}
      else if(i%3===1){for(let j=0;j<5;j++){c.fillRect(8+j*25,28+j*8,13,68-j*7);}}
      else{c.beginPath();c.moveTo(0,98);c.lineTo(53,27);c.lineTo(71,67);c.lineTo(96,38);c.lineTo(128,98);c.fill();}
      letter(c,['ORBIT','ECHO','HARBOUR','NEON','SUNDAY','AIR'][i%6],8,115,14,'#f2eadb','Arial');
    });
  }
  function roof(x0,x1,z0,z1,y){
    const x=(x0+x1)/2,z=(z0+z1)/2,w=x1-x0,d=z1-z0;
    box(plant,x,y,z,w+.13,.18,d+.13,'#526370');box(plant,x,y+.12,z,w-.10,.10,d-.10,'#3b4a59');
    for(const zz of [z0,z1])box(plant,x,y+.21,zz,w+.12,.14,.093,'#87939a');
    for(const xx of [x0,x1])box(plant,xx,y+.21,z,.09,.14,d+.04,'#798b96');
    for(let i=x0+.54;i<x1-.30;i+=1.02)box(plant,i,y+.176,z,.017,.009,d-.17,'#616f7c');
  }
  function condenser(p,x,y,z,w=1){
    box(p,x,y+.24,z,.86*w,.48,.47,'#96a8a8');box(p,x,y+.47,z,.89*w,.036,.49,'#c1c6bd');
    for(let i=0;i<7;i++)box(p,x,y+.09+i*.048,z+.243,.72*w,.018,.013,night);
    const ring=cyl(p,x,y+.504,z,.155,.155,.028,night,{segments:20});ring.scale.z*=.95;
    for(let i=-2;i<=2;i++)box(p,x+i*.047,y+.526,z,.012,.012,.237-Math.abs(i)*.022,'#aebbbb');
    for(const s of [-1,1])box(p,x+s*w*.29,y-.025,z,.105,.05,.54,'#657484');
  }
  buildStationFrontages(k,{shells,glass,plant,signs,plate,graphic,letter,jp,album,recordFace,blade,laundryFace,roof,condenser});
}
