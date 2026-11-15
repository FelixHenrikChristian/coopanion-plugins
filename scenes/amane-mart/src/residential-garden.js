import * as THREE from 'three';

// Different silhouettes matter more than individually modelled veins at this
// scale. Each kind of produce uses one colour-instanced mesh per shape.
function leafBlade(lobes=0){
  const pts=[],colour=[];
  function v(t,side){
    const width=Math.pow(Math.max(.002,Math.sin(Math.PI*t)),.72);
    const teeth=lobes?1-.27*Math.pow(Math.sin(t*Math.PI*lobes),2):1;
    return [side*width*teeth,.23*Math.sin(t*Math.PI)+.12*t*t+(side===0?.15*width:-.03*width),t];
  }
  const tint=new THREE.Color();
  function tri(a,b,c,mid){
    for(const [p,rib] of [[a,mid[0]],[b,mid[1]],[c,mid[2]]]){
      pts.push(...p);tint.setRGB(rib?1.0:.85,rib?1.0:.89,rib?.97:.86);colour.push(tint.r,tint.g,tint.b);
    }
  }
  for(let i=0;i<6;i++){
    const a=i/6,b=(i+1)/6;
    for(const side of [-1,1]){
      let l=v(a,side),m=v(a,0),n=v(b,0),o=v(b,side);
      if(side<0){tri(l,n,m,[false,true,true]);tri(l,o,n,[false,false,true]);}
      else{tri(l,m,n,[false,true,true]);tri(l,n,o,[false,true,false]);}
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));
  geo.setAttribute('color',new THREE.Float32BufferAttribute(colour,3));geo.computeVertexNormals();return geo;
}
function onionBlade(){
  const pts=[],ix=[];
  for(let j=0;j<6;j++) {
    const f=j/5,rad=.85*(1-f)+.028;
    for(let i=0;i<5;i++){const t=i*2*Math.PI/5;pts.push(rad*Math.cos(t),f,.19*f*f+rad*Math.sin(t));}
  }
  for(let j=0;j<5;j++)for(let i=0;i<5;i++){
    let a=j*5+i,b=j*5+(i+1)%5;ix.push(a,a+5,b,a+5,b+5,b);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pts,3));g.setIndex(ix);g.computeVertexNormals();return g;
}
const broad=leafBlade(),notched=leafBlade(4),onion=onionBlade();
const smallFruit=new THREE.IcosahedronGeometry(1,1),roundFruit=new THREE.SphereGeometry(1,10,7);
const stemGeo=new THREE.CylinderGeometry(1,1,1,6);
const eggGeo=new THREE.LatheGeometry([[.005,0],[.55,.040],[.86,.19],[1,.38],[.86,.61],[.55,.83],[.31,1]]
  .map(([x,y])=>new THREE.Vector2(x,y)),10);
const cucumberGeo=new THREE.LatheGeometry([[.07,0],[.58,.04],[.87,.12],[1,.57],[.78,.91],[.32,1]]
  .map(([x,y])=>new THREE.Vector2(x,y)),8);

function instanced(parent,name,geometry,items,leaf=false){
  if(!items.length)return;
  const mat=new THREE.MeshStandardMaterial({
    color:0xffffff,vertexColors:!!geometry.attributes.color,roughness:leaf?.78:.64,metalness:0,
    side:leaf?THREE.DoubleSide:THREE.FrontSide,emissive:'#283728',emissiveIntensity:leaf?.17:.10
  });
  const mesh=new THREE.InstancedMesh(geometry,mat,items.length);
  const gardenLight=parent.userData.cropId||parent.name.includes('菜園の入口');
  const p=new THREE.Object3D(),c=new THREE.Color();
  const warmth=new THREE.Color('#d8a46c'),wx=parent.position.x,wz=parent.position.z;
  for(let i=0;i<items.length;i++){
    const [x,y,z,sx,sy,sz,tint,rx=0,ry=0,rz=0,quaternion]=items[i];
    p.position.set(x,y,z);p.scale.set(sx,sy,sz);
    if(quaternion)p.quaternion.copy(quaternion);else p.rotation.set(rx,ry,rz,'YXZ');
    p.updateMatrix();mesh.setMatrixAt(i,p.matrix);c.set(tint);
    if(gardenLight){
      // Radiance baked into the plant colours, strongest under the entrance
      // eave and the western lamp, falling off into the rear allotments.
      const gateDistance=(x+wx-8.64)**2/8+(z+wz-7.85)**2/22;
      const lampDistance=(x+wx-4.30)**2/10+(z+wz-7.2)**2/20;
      const rad=.60*Math.exp(-gateDistance)+.39*Math.exp(-lampDistance);
      c.multiplyScalar(1+.39*rad);c.lerp(warmth,.12*rad);
    }
    mesh.setColorAt(i,c);
  }
  mesh.name=name;mesh.castShadow=mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);
}

export function growKitchenBed(k,bed,id,index){
  const {box,cyl}=k;
  let seed=(index+1)*159101;
  const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const choose=list=>list[Math.floor(rand()*list.length)];
  const stems=[],wide=[],serrated=[],bulbs=[],produce=[],shoots=[];
  const greens=['#5b9559','#659e63','#70a363','#719258'],dark=['#4e8053','#5d945a','#527f56'];
  const up=new THREE.Vector3(0,1,0);
  function link(a,b,r,color){
    const direction=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]),len=direction.length();
    if(!len)return;
    stems.push([(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,len,r,color,0,0,0,new THREE.Quaternion().setFromUnitVectors(up,direction.divideScalar(len))]);
  }
  function leaf(arr,x,y,z,len,w,a,lift,c){
    arr.push([x,y,z,w,len*.23,len,c,-lift,a,(rand()-.5)*.14]);
  }
  function rosette(arr,x,y,z,n,len,w,lift,pal){
    const turn=rand()*Math.PI*2;
    for(let j=0;j<n;j++)leaf(arr,x,y,z,len*(.80+.25*rand()),w*(.90+.19*rand()),turn+j*2.39996,lift+(rand()-.5)*.32,choose(pal));
  }
  const start=.248,stake='#a99b70',cord='#849a79';
  if(id==='tomato'){
    // Three independently trained A-frames, each laden with ripening trusses.
    for(const z of [-1.00,0,1.02]){
      link([-.45,start,z],[0,1.76,z],.031,stake);link([.45,start,z],[0,1.76,z],.031,stake);
      for(const sign of [-1,1]){
        const x=sign*.34;let last=[x,start,z];
        for(let t=0;t<4;t++){
          const center=[x*(1-t*.19),.46+t*.29,z+(t%2?.062:-.035)];
          link(last,center,.021,'#657d46');last=center;
          const a=sign*1.04+(t%2?2.42:.0);
          for(let b=0;b<4;b++){const dx=Math.sin(a)*b*.057,dz=Math.cos(a)*b*.057;
            leaf(serrated,center[0]+dx,center[1]+b*.022,center[2]+dz,.14+.025*b,.045,a+(b%2?-.99:.91),.39,choose(greens));}
          if(t===1||t===2){
            const fx=center[0]+sign*.125,fz=center[2]+.16;
            link(center,[fx,center[1]-.06,fz],.010,'#7e8f55');
            for(let j=0;j<3;j++){const fy=center[1]-.035-j*.062,xx=fx+(j%2?.055:-.036);
              bulbs.push([xx,fy,fz,.083,.085,.082,choose(['#e8734e','#cd513c','#f49154','#c25a3c','#9ca653'])]);
              bulbs.push([xx,fy+.072,fz,.032,.012,.034,'#778e4f']);}
          }
        }
      }
    }
    link([0,1.72,-1.28],[0,1.72,1.30],.025,stake);
  }else if(id==='eggplant'){
    for(let j=0;j<4;j++){
      const x=j%2?.18:-.19,z=-1.08+j*.71,h=.81+(j%3)*.06;
      link([x,start,z],[x+.035,h+.24,z],.028,'#766476');
      for(let f=0;f<6;f++){
        const a=f*2.4+j*.24,y=.45+f*.084,xx=x+Math.sin(a)*.15,zz=z+Math.cos(a)*.16;
        link([x,y-.05,z],[xx,y+.052,zz],.015,'#73646e');
        leaf(wide,xx,y+.05,zz,.31,.105,a,.30,choose(['#628654','#597b58','#6f8c59']));
        if(f%2===0){
          produce.push([xx,y-.193,zz+.018,.083,.249,.080,choose(['#745478','#725581','#835779']),.07,a,.15]);
          bulbs.push([xx,y+.046,zz+.017,.047,.037,.046,'#798453']);
        }else if(f===5){
          for(let p=0;p<5;p++){const t=p*Math.PI*.4;bulbs.push([xx+Math.cos(t)*.024,y+.081,zz+Math.sin(t)*.024,.023,.009,.020,'#b196c1']);}
        }
      }
    }
  }else if(id==='cucumber'){
    // One west-to-east leaning net, visibly different from the tomato frames.
    for(const z of [-1.32,1.32]){
      link([-.34,start,z],[.17,1.71,z],.036,'#6c8d78');
      link([.44,start,z],[.17,1.71,z],.027,'#748d79');
    }
    link([.17,1.71,-1.34],[.17,1.71,1.34],.033,'#829a7c');
    for(let z=-1.27;z<1.33;z+=.25)link([-.34,.28,z],[.17,1.70,z],.008,cord);
    for(let j=0;j<6;j++){const x=-.34+j*.10,y=.28+j*.28;link([x,y,-1.30],[x,y,1.30],.009,cord);}
    for(let j=0;j<5;j++){
      const cz=-1.05+j*.51;let last=[-.29,start,cz];
      for(let n=0;n<4;n++){
        const x=-.24+n*.115,y=.49+n*.31,z=cz+Math.sin(n*2+j)*.075;
        link(last,[x,y,z],.015,'#6c915c');last=[x,y,z];
        leaf(wide,x,y,z,.259,.121,(n+j)%2?1.80:-1.67,.41,choose(dark));
        if(n===1||n===3){produce.push([x+.059,y-.264,z+.035,.045,.288,.048,choose(['#608955','#699955','#52845a']),.05,.22,.15]);
          bulbs.push([x+.025,y+.025,z+.068,.033,.025,.031,'#e6c463']);}
      }
    }
  }else if(id==='pepper'){
    for(let j=0;j<6;j++){
      const x=(j%2-.5)*.61,z=-1.00+Math.floor(j/2)*.95,h=.76+rand()*.25;
      link([x,start,z],[x,h,z],.020,'#708454');
      for(let t=0;t<5;t++){
        const a=t*2.4+j*.60,y=.398+t*.105,xx=x+Math.sin(a)*.141,zz=z+Math.cos(a)*.141;
        link([x,y-.028,z],[xx,y+.055,zz],.013,'#71894f');leaf(wide,xx,y+.04,zz,.197,.064,a,.54,choose(greens));
        if(t===1||t===3){const c=choose(['#a2a654','#bb7950','#d6a751','#7a9b57','#bf6347']);
          for(let f=0;f<3;f++){const theta=f*Math.PI*2/3;bulbs.push([xx+Math.sin(theta)*.036,y-.040,zz+Math.cos(theta)*.036,.059,.09,.056,c]);}
          bulbs.push([xx,y+.041,zz,.034,.030,.036,'#61854c']);}
      }
    }
  }else if(id==='cabbage'){
    for(let j=0;j<7;j++){const x=j===6?0:(j%2-.5)*.67,z=j===6?1.20:-1.11+Math.floor(j/2)*.76;
      rosette(wide,x,.273,z,9,.32,.128,.22,['#769d81','#84a68a','#8dac87','#66957b']);
      rosette(wide,x,.34,z,7,.218,.105,.59,['#99b897','#a3ba92','#87ac8e']);
      bulbs.push([x,.40,z,.179,.163,.182,'#b4c799']);}
  }else if(id==='daikon'){
    for(let j=0;j<8;j++){const x=(j%2-.5)*.60,z=-1.09+Math.floor(j/2)*.71;
      bulbs.push([x,.304,z,.081,.123,.079,'#e9dfb9']);
      rosette(serrated,x,.37,z,8,.278,.086,.65,['#719b67','#89a96d','#79a76b']);}
  }else if(id==='carrot'){
    for(let j=0;j<11;j++){
      const x=(j%2-.5)*.61+(rand()-.5)*.07,z=-1.22+Math.floor(j/2)*.46;
      bulbs.push([x,.267,z,.055,.050,.050,'#cc8e56']);
      for(let a=0;a<5;a++){
        const phi=a*2.40+j*.49,sx=Math.sin(phi),sz=Math.cos(phi),length=.22+.08*rand();
        link([x,.292,z],[x+sx*length*.45,.49+length*.25,z+sz*length*.45],.008,'#7a945b');
        for(let d=1;d<5;d++){
          const xx=x+sx*d*.025,zz=z+sz*d*.025;
          leaf(serrated,xx,.31+d*.053,zz,.095,.023,phi+(d%2?.97:-1.04),.52,choose(greens));
        }
      }
    }
  }else{
    for(let j=0;j<12;j++){
      const x=(j%2-.5)*.58,z=-1.13+Math.floor(j/2)*.44;
      for(let f=0;f<5;f++){
        const a=f*2.399+j*.5,xx=x+Math.sin(a)*.053,zz=z+Math.cos(a)*.055,h=.35+rand()*.30;
        link([xx,.246,zz],[xx,.322,zz],.022,'#d7d8b6');
        shoots.push([xx,.318,zz,.023,h,.024,choose(['#759c87','#8bb09b','#70a18a']),Math.sin(a)*.35,a,Math.cos(a)*.28]);}
    }
  }
  instanced(bed,id+' stems and supports',stemGeo,stems);
  instanced(bed,id+' broad leaves',broad,wide,true);instanced(bed,id+' divided leaves',notched,serrated,true);
  instanced(bed,id+' crop',id==='eggplant'?eggGeo:cucumberGeo,produce);
  instanced(bed,id+' heads and fruit',roundFruit,bulbs);instanced(bed,id+' shoots',onion,shoots);
  // Corner tags are attached to the frame, leaving the fronts walkable.
  for(const end of [-1,1]){
    box(bed,-.725,.251,end*1.53,.077,.025,.127,'#b9b9a4');
    cyl(bed,-.725,.269,end*1.53,.018,.018,.010,'#586d69',{segments:6});
  }
}

export function buildAllotmentStreet(k){
  const gate=k.group('住宅街 · 菜園の入口と水場',1.44);
  const posts=k.group('住宅街 · 支線の電柱と防犯灯',2.31);
  const wires=k.group('住宅街 · 道路上の引込線',3.91);
  const {box,cyl,glow}=k;
  const yAxis=new THREE.Vector3(0,1,0);
  function rod(parent,a,b,r,color,r2=r,n=8){
    const v=new THREE.Vector3(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    const m=cyl(parent,(a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r2,r,v.length(),color,{segments:n});
    m.quaternion.setFromUnitVectors(yAxis,v.normalize());return m;
  }
  // Open sliding gate parked behind the east boundary: its .99 m opening
  // stays usable, and no upright or tool sits in any of the eight approach paths.
  const gx=8.675,gz=7.64;
  for(const x of [8.08,9.27]){
    box(gate,x,.234,gz,.192,.148,.192,'#a7a69a');
    box(gate,x,1.356,gz,.105,2.32,.104,'#537975');
    box(gate,x,2.498,gz,.157,.046,.154,'#9ba99c');
  }
  box(gate,gx,2.435,gz,1.58,.11,.15,'#526c68');
  box(gate,gx,2.241,gz,1.48,.365,.102,'#ac8a62');
  const canopy=box(gate,gx,2.544,gz,1.82,.063,.49,'#728b81');canopy.rotation.x=.083;
  box(gate,gx,2.475,gz+.014,1.71,.040,.43,'#d6b484');
  const signCv=document.createElement('canvas');signCv.width=640;signCv.height=176;
  const ctx=signCv.getContext('2d');
  const paper=ctx.createLinearGradient(0,0,0,176);
  paper.addColorStop(0,'#f7dfb5');paper.addColorStop(.53,'#e8c48d');paper.addColorStop(1,'#d7a675');
  ctx.fillStyle=paper;ctx.fillRect(0,0,640,176);
  ctx.fillStyle='#906a4f';ctx.fillRect(13,12,614,2);ctx.fillRect(13,162,614,2);
  ctx.strokeStyle='#746946';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(61,129);ctx.quadraticCurveTo(63,95,85,62);ctx.stroke();
  ctx.fillStyle='#81915d';ctx.beginPath();ctx.ellipse(67,93,28,11,-.47,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#8d8058';ctx.beginPath();ctx.ellipse(87,66,23,10,-.74,0,Math.PI*2);ctx.fill();
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#4a4e3a';
  ctx.font='bold 94px "Yu Gothic","Microsoft YaHei",sans-serif';ctx.fillText('共同菜園',366,105,481);
  ctx.font='500 21px "Yu Gothic",sans-serif';ctx.fillText('あ ま ね 町',357,37,194);
  const plaqueTexture=new THREE.CanvasTexture(signCv);plaqueTexture.colorSpace=THREE.SRGBColorSpace;plaqueTexture.anisotropy=4;
  const print=new THREE.MeshBasicMaterial({map:plaqueTexture,toneMapped:false,color:'#fff2d7'});
  for(const o of [-1,1]){
    const sign=new THREE.Mesh(new THREE.PlaneGeometry(1.419,.318),print);
    sign.name='Backlit community garden enamel';sign.position.set(gx,2.241,gz+o*.054);sign.rotation.y=o<0?Math.PI:0;gate.add(sign);
  }
  box(gate,gx,2.438,gz+.165,.95,.029,.039,'#eed2a4',{emissive:'#ffd198',intensity:1.8});
  glow(gate,gx,2.429,gz+.115,'#efb985',.97,.115);
  // A very small milk-glass wall sconce throws warm light onto the real
  // paving and the pots. It costs no extra active light.
  box(gate,9.27,2.169,gz+.18,.094,.056,.34,'#8c816c');
  const lampDisk=new THREE.MeshBasicMaterial({color:'#ffdfa5',toneMapped:false});
  const sconce=new THREE.Mesh(new THREE.CylinderGeometry(.117,.092,.171,10),lampDisk);
  sconce.position.set(9.27,2.054,gz+.328);gate.add(sconce);
  cyl(gate,9.27,2.163,gz+.328,.087,.145,.075,'#787b65',{segments:10});
  glow(gate,9.27,2.066,gz+.329,'#ffce98',1.12,.255);
  const poolCv=document.createElement('canvas');poolCv.width=poolCv.height=128;
  const pc=poolCv.getContext('2d'),pool=pc.createRadialGradient(64,61,0,64,64,63);
  pool.addColorStop(0,'rgba(255,199,124,.71)');pool.addColorStop(.40,'rgba(245,174,102,.40)');
  pool.addColorStop(.73,'rgba(229,154,94,.16)');pool.addColorStop(1,'rgba(224,140,104,0)');
  pc.fillStyle=pool;pc.fillRect(0,0,128,128);
  const poolTex=new THREE.CanvasTexture(poolCv);poolTex.colorSpace=THREE.SRGBColorSpace;
  const poolMat=new THREE.MeshBasicMaterial({map:poolTex,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false});
  function bakedPool(x,y,z,w,d,strength){
    const m=poolMat.clone();m.opacity=strength;
    const q=new THREE.Mesh(new THREE.PlaneGeometry(w,d),m);
    q.name='Baked honey-coloured paving';q.position.set(x,y,z);q.rotation.x=-Math.PI/2;q.renderOrder=2;
    q.raycast=()=>{};gate.add(q);
  }
  bakedPool(8.79,.169,8.29,3.74,2.24,.51);
  bakedPool(8.77,.188,6.81,3.07,.80,.36);
  bakedPool(4.26,.012,5.85,2.89,.59,.38);
  bakedPool(-10.41,.012,5.79,1.95,.66,.33);
  for(const h of [.35,.97])box(gate,9.75,h,gz+.104,.91,.036,.042,'#70877d');
  for(let i=0;i<8;i++)box(gate,9.32+i*.12,.663,gz+.104,.019,.628,.021,'#82948a');
  for(const x of [8.18,9.17])box(gate,x,.175,7.91,.051,.028,.72,'#8c9489');
  // A small enamel basin, plant nursery trays and tools share the back wall.
  const sx=4.86,sz=17.33;
  box(gate,sx,.441,sz,.92,.55,.43,'#a1a599');box(gate,sx,.728,sz,.99,.058,.52,'#d4d8c8');
  for(const h of [-1,1]){
    box(gate,sx+h*.46,.789,sz,.055,.10,.51,'#c6d3c7');
    box(gate,sx,.791,sz+h*.234,.92,.098,.057,'#c6d3c7');
  }
  box(gate,sx,.764,sz,.80,.018,.349,'#91a6a0');cyl(gate,sx+.17,.779,sz,.029,.029,.012,'#586e6b',{segments:12});
  box(gate,sx,.943,sz+.224,.91,.32,.043,'#c3cbbd');
  for(let z=0;z<2;z++)for(let x=0;x<6;x++)box(gate,sx-.368+x*.146,.879+z*.132,sz+.194,.138,.121,.015,['#9cb5aa','#abc3b3','#91aaa5'][(x+z)%3]);
  rod(gate,[sx+.14,.76,sz+.17],[sx+.14,1.07,sz+.17],.023,'#b2a487');
  rod(gate,[sx+.14,1.07,sz+.17],[sx+.14,1.07,sz-.035],.026,'#b2a487');
  rod(gate,[sx+.14,1.07,sz-.035],[sx+.14,1.018,sz-.035],.022,'#aa9e85');
  rod(gate,[sx+.07,1.09,sz+.10],[sx+.20,1.09,sz+.10],.014,'#cb9778');
  box(gate,5.78,.644,17.33,.70,.063,.43,'#83968d');
  for(const x of [5.49,6.08])for(const z of [17.18,17.48])box(gate,x,.409,z,.032,.47,.033,'#6b827a');
  box(gate,5.79,.70,17.32,.61,.064,.33,'#5d706b');
  const seedlings=[],potted=[];
  for(let x=0;x<5;x++)for(let z=0;z<2;z++){
    const xx=5.54+x*.120,zz=17.241+z*.15;
    cyl(gate,xx,.751,zz,.049,.038,.104,'#8b6953',{segments:7});
    seedlings.push([xx,.792,zz,.018,.019,.071,'#84a575',-.70,1.1+x*.33],[xx,.794,zz,.018,.021,.061,'#9cba84',-.78,3.9+x*.33]);
  }
  instanced(gate,'Nursery plugs',broad,seedlings,true);
  const ax=3.94,az=17.12;
  cyl(gate,ax,.313,az,.143,.125,.282,'#95a59a',{segments:12});
  rod(gate,[ax+.092,.338,az],[ax+.315,.548,az+.018],.043,'#95a59a',.026);
  const rose=cyl(gate,ax+.329,.556,az+.021,.067,.049,.046,'#a3b1a0',{segments:10});rose.rotation.z=-.77;
  k.line(gate,[[ax-.113,.353,az],[ax-.200,.413,az],[ax-.188,.542,az],[ax-.071,.544,az]],'#81978c',.019);
  for(let i=0;i<3;i++){
    const hose=new THREE.Mesh(new THREE.TorusGeometry(.185+.012*i,.019,6,20),k.mat('#63847a'));hose.position.set(4.19,.56,17.50-.031*i);
    hose.castShadow=true;gate.add(hose);
  }
  rod(gate,[4.15,.187,17.50],[4.15,1.019,17.50],.024,'#879b91');
  box(gate,6.54,.548,17.32,.35,.64,.31,'#80968a');box(gate,6.54,.887,17.32,.40,.044,.36,'#bcc3ad');
  box(gate,6.54,.658,17.15,.228,.114,.02,'#4f6961');box(gate,6.54,.641,17.136,.147,.021,.009,'#adc3ac');
  const florets=[],gardenStones=[];
  for(const [x,z,s,pot,dye] of [[7.78,7.88,1.05,'#a56e52',['#c7a8bc','#cca3ae','#d6b9c4']],
      [9.61,7.91,.91,'#849792',['#b7abd0','#a4aecb','#b6b5d5']]]){
    cyl(gate,x,.302,z,.21*s,.149*s,.28,pot,{segments:12});
    cyl(gate,x,.449,z,.221*s,.212*s,.042,pot,{segments:12});
    cyl(gate,x,.471,z,.198*s,.198*s,.012,'#6d6250',{segments:12});
    for(let j=0;j<11;j++){const a=j*2.39996,sz=s*(.18+(j%3)*.035);
      potted.push([x+Math.sin(a)*.036,.476+(j%4)*.022,z+Math.cos(a)*.036,.078*s,.048,sz,
        j%3?'#79935f':'#9aa078',-.45-(j%2)*.24,a]);}
    for(let j=0;j<4;j++){
      const a=j*2.39996,ox=x+Math.cos(a)*.12*s,oz=z+Math.sin(a)*.102*s,oy=.61+(j%3)*.055*s;
      rod(gate,[x,.469,z],[ox,oy,oz],.012,'#788961');
      for(let f=0;f<18;f++){
        const t=f*2.39996,rr=.094*s*Math.sqrt((f+.25)/18);
        florets.push([ox+Math.cos(t)*rr,oy+.035+s*.078*(1-rr/(.105*s)),oz+Math.sin(t)*rr,
          .034*s,.019*s,.035*s,dye[(f+j)%3],.18,t]);
      }
    }
    for(const [dx,dz,w,h] of [[-.25,.11,.085,.045],[.17,.17,.088,.041],[-.18,-.14,.07,.04]]){
      gardenStones.push([x+dx,.17+h*.32,z+dz,w,h,w*.76,'#adab91',.1,w*7]);
    }
  }
  instanced(gate,'Broad serrated leaves around the yard gate',notched,potted,true);
  instanced(gate,'Blue and mauve hydrangea florets',smallFruit,florets);
  instanced(gate,'Garden edging pebbles',smallFruit,gardenStones);
  // The old tea-store pole already has insulators on its front-facing arm at
  // x=-10.18, z=1.516, y=6.402. Only this short span crosses the roadway.
  const west={x:-10.42,z:6.81,h:5.87},east={x:4.24,z:6.80,h:5.39};
  function hardware(p,corner){
    cyl(posts,p.x,.263,p.z,.16,.185,.173,'#939995',{segments:12});
    cyl(posts,p.x,.18+p.h*.5,p.z,.074,.133,p.h,'#8f9996',{segments:12});
    for(const y of [.76,1.33,3.41,p.h-.54,p.h-.11])cyl(posts,p.x,y,p.z,.126-y*.006,.127-y*.006,.047,'#626f74',{segments:12});
    for(let j=0;j<3;j++)cyl(posts,p.x,.53+j*.16,p.z,.129,.130,.060,'#bdab75',{segments:12});
    box(posts,p.x,p.h-.07,p.z,.111,.085,.90,'#74858a');
    for(const d of [-.32,.32]){
      rod(posts,[p.x,p.h-.36,p.z],[p.x,p.h-.049,p.z+d],.019,'#75868a');
      for(const y of [p.h-.015,p.h+.047,p.h+.102])cyl(posts,p.x,y,p.z+d,.047,.057,.043,'#bbc7b9',{segments:8});
    }
    if(corner){
      box(posts,p.x,p.h+.15,p.z,.96,.071,.088,'#7e8c91');
      for(const offset of [-.43,.43])for(const yy of [.21,.26,.31])cyl(posts,p.x+offset,p.h+yy,p.z,.048,.055,.037,'#b8c3b6',{segments:7});
    }
    const ly=corner?3.66:3.83,project=corner?.67:.86;
    rod(posts,[p.x,ly-.34,p.z],[p.x,ly-.04,p.z-project*.66],.034,'#728688');
    rod(posts,[p.x,ly+.03,p.z],[p.x,ly+.03,p.z-project],.036,'#718789');
    const headZ=p.z-project;
    // The shallow domed hood is narrower than its opal bowl, so the lens is
    // visible from the side as well as from beneath. Both ends remain luminous.
    const hood=cyl(posts,p.x,ly+.029,headZ,.154,.194,.080,'#73858a',{segments:14});hood.scale.z*=1.57;
    const rim=cyl(posts,p.x,ly-.019,headZ,.195,.197,.025,'#819496',{segments:14});rim.scale.z*=1.57;
    const lens=new THREE.Mesh(new THREE.LatheGeometry([[.024,-.173],[.109,-.162],[.165,-.125],[.187,-.074],[.191,-.025],[.184,-.013]]
      .map(([radius,h])=>new THREE.Vector2(radius,h)),16),lampDisk);
    lens.name='Opal streetlight lens';lens.position.set(p.x,ly,headZ);lens.scale.z=1.57;posts.add(lens);
    const bead=cyl(posts,p.x,ly-.157,headZ,.096,.068,.020,'#b79873',{segments:12});bead.scale.z*=1.48;
    glow(posts,p.x,ly-.086,headZ,'#ffd198',1.43,.30);
    const plate=box(posts,p.x,2.05,p.z-.113,.159,.244,.014,'#586f74');plate.name='Residential street pole identification';
    k.label(posts,corner?'18':'19',p.x,2.05,p.z-.126,.119,.091,{rotateY:Math.PI,color:'#e2d8af'});
    if(!corner){const light=new THREE.PointLight('#ffc995',7.0,6.0,2);light.position.set(p.x,ly-.17,p.z-project);posts.add(light);}
  }
  hardware(west,true);hardware(east,false);
  function cable(a,b,drop,r){
    const points=[];for(let j=0;j<=12;j++){const t=j/12;
      points.push(new THREE.Vector3(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t-4*drop*t*(1-t),a[2]+(b[2]-a[2])*t));}
    const mesh=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),16,r,5,false),k.mat('#454858',{roughness:.84}));
    mesh.name='Residential span';wires.add(mesh);
  }
  for(const sign of [-1,1]){
    cable([-10.18+sign*.429,6.422,1.516],[west.x+sign*.43,west.h+.318,west.z],.245,.014);
    // A short jumper turns the line 90° between the two arms on the corner pole.
    cable([west.x+sign*.43,west.h+.318,west.z],[west.x,west.h+.109,west.z+sign*.32],.043,.012);
    cable([west.x,west.h+.109,west.z+sign*.32],[east.x,east.h+.109,east.z+sign*.32],.54,.014);
  }
}
