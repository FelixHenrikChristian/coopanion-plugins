import * as THREE from 'three';
import {buildAllotmentStreet, growKitchenBed} from './residential-garden.js';
import { NEIGHBORHOOD, SITE } from './layout.js';

// The original corner keeps its own surfaces. These four panels meet it at
// exact survey coordinates, above a single continuous foundation.
export function buildHomeGrounds(k, register) {
  const {box,cyl,line}=k;
  const {left:west,right:east,back:north,front:south,size:span}=NEIGHBORHOOD;
  const old=SITE;
  const property={west:-10.81,east:17.74,street:7.64,rear:18.15};
  const entries={
    house:{left:-.04,right:1.94}, garden:{left:8.08,right:9.27}, cycle:{left:12.92,right:14.72}
  };
  // Share the cycle gate jamb and a rear T-junction with the perimeter.
  // The flush drain stays entirely on the allotment side of the coping.
  const divider={x:entries.cycle.left,drainX:12.64};
  const foundation=k.group('街区の土台',0);
  const ground=k.group('街路と宅地',.22);
  const details=k.group('街路の設備と町内の囲い',.69);
  const cycles=k.group('集合駐輪場',1.76);
  let seed=972671;
  function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296}
  const pick=a=>a[Math.floor(rand()*a.length)];
  function rectMesh(x0,z0,x1,z1,y,color,parent=ground) {
    const bottom=-.028;
    const mesh=box(parent,(x0+x1)/2,(y+bottom)/2,(z0+z1)/2,x1-x0,y-bottom,z1-z0,color);
    return mesh;
  }
  function rod(g,a,b,r0,r1,color,n=7){
    const begin=new THREE.Vector3(...a),end=new THREE.Vector3(...b),vector=end.clone().sub(begin);
    const middle=begin.lerp(end,.5);
    const m=cyl(g,middle.x,middle.y,middle.z,r1,r0,vector.length(),color,{segments:n});
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),vector.normalize());return m;
  }
  function bevelRing(inset,radius){
    const x0=west+inset,z0=north+inset,x1=east-inset,z1=south-inset;
    const corners=[[x1-radius,z0+radius,-Math.PI/2],[x1-radius,z1-radius,0],
      [x0+radius,z1-radius,Math.PI/2],[x0+radius,z0+radius,Math.PI]];
    return corners.flatMap(([x,z,start])=>Array.from({length:7},(_,j)=>[
      x+radius*Math.cos(start+j*Math.PI/12),z+radius*Math.sin(start+j*Math.PI/12)]));
  }
  let prev;
  for(const [inset,y,r,color] of [[.20,-.95,.25,'#29293b'],[.09,-.88,.19,'#323749'],[.065,-.78,.15,'#494452'],
          [.038,-.755,.13,'#817367'],[.055,-.718,.13,'#3c3944'],[.008,-.65,.09,'#474754'],
          [.006,-.15,.095,'#383b4e'],[0,-.11,.08,'#545465'],[0,-.045,.06,'#494b59'],[.018,-.005,.05,'#65636b']]){
    const ring=bevelRing(inset,r);
    if(prev){
      const pos=[];
      for(let i=0;i<ring.length;i++){
        const j=(i+1)%ring.length;
        const a=[prev.ring[i][0],prev.y,prev.ring[i][1]],b=[ring[i][0],y,ring[i][1]],
          c=[ring[j][0],y,ring[j][1]],d=[prev.ring[j][0],prev.y,prev.ring[j][1]];
        pos.push(...a,...b,...c,...a,...c,...d);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
      geometry.computeVertexNormals();const model=new THREE.Mesh(geometry,k.mat(color,{roughness:.5,metalness:.18}));
      model.receiveShadow=true;model.castShadow=true;foundation.add(model);
    }
    prev={y,ring};
  }
  box(foundation,(west+east)/2,-.922,(north+south)/2,span-.40,.056,span-.40,'#242937');
  // All four map panels share a single painting, so paths and kerbs match.
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2048;
  const g=canvas.getContext('2d'),pixels=canvas.width/span;g.setTransform(pixels,0,0,pixels,-west*pixels,-north*pixels);
  function fill(x,z,w,h,color){g.fillStyle=color;g.fillRect(x,z,w,h)}
  function grain(x,z,w,d,n,colors){
    for(let i=0;i<n;i++){const s=.013+rand()*.038;fill(x+rand()*w,z+rand()*d,s*(.6+rand()),s*.64,pick(colors))}
  }
  function cityTiles(x,z,w,h,tileW,tileD,colors){
    g.save();g.beginPath();g.rect(x,z,w,h);g.clip();fill(x,z,w,h,'#474f58');
    for(let j=0;j<Math.ceil(h/tileD);j++)for(let i=-1;i<Math.ceil(w/tileW);i++){
      const tx=x+tileW*(i+.5*(j%2)),tz=z+tileD*j;
      fill(tx+.009,tz+.009,tileW-.018,tileD-.016,pick(colors));
      fill(tx+.012,tz+.012,tileW-.027,.009,'#d8d9cb24');
    }
    g.restore();
  }
  function diffuseLight(x,z,r,d,color,strength){
    g.save();g.translate(x,z);g.scale(r,d);
    const gradient=g.createRadialGradient(0,0,0,0,0,1);
    gradient.addColorStop(0,'rgba('+color+','+strength+')');
    gradient.addColorStop(.53,'rgba('+color+','+strength*.30+')');
    gradient.addColorStop(1,'rgba('+color+',0)');
    fill(-1,-1,2,2,gradient);g.restore();
  }
  function drainStamp(x,z,w,d){
    fill(x-w/2,z-d/2,w,d,'#313e49');fill(x-w/2+.018,z-d/2+.017,w-.036,d-.034,'#899393');
    const n=Math.max(4,Math.round(w/.069));
    for(let i=0;i<n;i++)fill(x-w/2+.047+i*(w-.087)/n,z-d/2+.047,.024,d-.094,'#35434c');
  }
  fill(west,north,span,span,'#4d5558');
  cityTiles(old.right,north,east-old.right,old.frontCurb-north,1.05,.70,['#59646b','#566168','#586167','#59646a']);
  cityTiles(west,old.front,span,south-old.front,.61,.42,['#747b7e','#727a7e','#778082','#71797c']);
  fill(3.74,7.49,8.98,9.72,'#666c6b');
  for(let x=3.82;x<12.73;x+=1.33)fill(x,7.51,.017,9.62,'#495250');
  for(let z=7.53;z<17.16;z+=1.32)fill(3.75,z,8.93,.016,'#4e5654');
  // Brushed concrete runs between the beds, with narrow brick edging and a
  // flush, weathered tile landing inside the communal entrance.
  cityTiles(4.49,11.82,7.71,1.02,.52,.31,['#96978a','#a1a08f','#93988d','#9d9d90']);
  cityTiles(7.96,7.80,1.42,.75,.36,.26,['#a49d8c','#9d998a','#aaa08c']);
  for(const z of [11.82,12.81]){fill(4.49,z,7.71,.032,'#b2a18a');}
  for(const z of [8.19,16.16])for(let x=4.73;x<12.17;x+=.38)fill(x,z,.357,.122,'#8d8a76');
  // Parallel drainage channels define the gardens and the rear service corridor.
  for(const x of [3.90,divider.drainX-.0525]){fill(x,7.62,.105,9.49,'#485557');fill(x+.015,7.62,.022,9.49,'#989f97');}
  for(const z of [8.65,11.97,15.47]){drainStamp(3.98,z,.26,.48);drainStamp(divider.drainX,z,.28,.50);}
  cityTiles(-1.25,7.24,3.62,1.07,.38,.32,['#92968c','#8a918b','#92958b','#8a8e87']);
  fill(12.97,7.39,4.89,10.53,'#545e64');
  // Light stone sill markers line up with the jambs. The openings remain
  // flush and open toward the house porch and the bicycle shelter forecourt.
  for(const [key,gap] of Object.entries(entries)){
    const from=gap.left+.103,to=gap.right-.103;
    cityTiles(from,7.25,to-from,key==='cycle'?1.09:.66,.31,.31,
      key==='garden'?['#a49c88','#999680','#aaa28e']:['#a7a69b','#a19e92','#b1ae9f']);
    fill(from,property.street+.17,to-from,.028,'#8b8b7c');
  }
  for(let z=8.14;z<14.27;z+=.93){fill(14.10,z,2.04,.040,'#9ca9a7');fill(14.10,z,.041,.29,'#9ca9a7');}
  for(let z=8.69;z<17.67;z+=2.17)drainStamp(17.45,z,.55,.21);
  for(let z=-9.82;z<1;z+=3.11)drainStamp(7.09,z,.44,.20);
  for(let x=7.68;x<east-.35;x+=2.71)drainStamp(x,1.43,.47,.19);
  const asphalt=g.createLinearGradient(west,old.frontCurb,east,old.front);
  asphalt.addColorStop(0,'#293548');asphalt.addColorStop(.51,'#303b4c');asphalt.addColorStop(1,'#283346');
  fill(west,old.frontCurb,span,old.front-old.frontCurb,asphalt);
  fill(old.sideCurb,north,old.right-old.sideCurb,old.frontCurb-north,asphalt);
  grain(west,north,span,span,39000,['#cbd3cd15','#1e26301c','#9eada71c','#33434819']);
  for(const [x,z,rx,rz,rgb,a] of [
    [11.5,3.28,3.75,1.53,'128,221,199',.36],[13.65,4.10,2.66,1.66,'235,137,131',.30],
    [16.65,4.22,1.72,1.54,'251,199,133',.38],[15.03,8.41,2.18,2.25,'150,226,203',.37],
    [15.74,13.10,1.79,2.63,'147,218,198',.36],[13.59,7.02,1.05,1.04,'249,151,127',.33],
    [3.92,8.14,1.38,2.26,'249,191,130',.35],[10.90,17.07,2.17,1.05,'238,168,127',.29],
    [4.22,6.26,2.18,2.48,'255,193,119',.54],[-10.41,6.0,1.60,1.72,'252,194,132',.47],
    [8.68,8.09,1.59,1.58,'248,187,126',.43],[5.22,17.25,1.34,.83,'239,197,144',.33],
    [.89,7.81,1.43,.84,'255,207,148',.38],[-8.0,7.48,1.8,.89,'184,198,184',.18]
  ])diffuseLight(x,z,rx,rz,rgb,a);
  for(const [a,b] of [[west,old.left],[old.right,east]]){
    fill(a,old.front-.187,b-a,.075,'#acb9c0');
    fill(a,old.frontCurb+.24,b-a,.078,'#b0bac0');
  }
  for(let x=old.right+1.13;x<east-.65;x+=3.09)
    fill(x,(old.front+old.frontCurb)/2-.039,Math.min(1.49,east-.11-x),.078,'#c2c9c8');
  for(const x of [old.sideCurb+.103,old.right-.173])fill(x,north,.071,old.back-north,'#acb9c0');
  drainStamp(10.37,old.frontCurb+.15,.55,.195);drainStamp(15.64,old.front-.13,.60,.18);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=8;
  const mapped=new THREE.MeshStandardMaterial({map:tex,color:0xffffff,roughness:.48,metalness:.105,emissive:0xffffff,emissiveMap:tex,emissiveIntensity:.11});
  const pos=[],uv=[];
  function land(x0,z0,x1,z1,y){
    if(x1-x0<.00001||z1-z0<.00001)return;
    for(const [x,z] of [[x0,z0],[x0,z1],[x1,z1],[x0,z0],[x1,z1],[x1,z0]]){
      pos.push(x,y,z);uv.push((x-west)/span,(south-z)/span);
    }
    if(y>0)rectMesh(x0,z0,x1,z1,y-.006,'#575e5c');
  }
  const xx=[west,old.left,old.sideCurb,old.right,6.96,east],zz=[north,old.back,1.58,old.frontCurb,old.front,7.25,south];
  for(let a=0;a<xx.length-1;a++)for(let b=0;b<zz.length-1;b++){
    const mx=(xx[a]+xx[a+1])/2,mz=(zz[b]+zz[b+1])/2;
    if(mx>old.left&&mx<old.right&&mz>old.back&&mz<old.front)continue;
    const road=(mz>=old.frontCurb&&mz<=old.front)||(mx>=old.sideCurb&&mx<=old.right&&mz<=old.frontCurb);
    const pavement=(mz>old.front&&mz<7.25)||(mz<old.frontCurb&&mx>old.right&&(mx<6.96||mz>1.58));
    land(xx[a],zz[b],xx[a+1],zz[b+1],road||pavement?0:mz>old.front?.16:.18);
  }
  const sheet=new THREE.BufferGeometry();sheet.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));sheet.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));sheet.computeVertexNormals();
  const skin=new THREE.Mesh(sheet,mapped);skin.receiveShadow=true;ground.add(skin);

  // A thin paving mesh follows the dropped lip, with no step at either crossing.
  const slabTriangles=[],slabColors=[];
  function tri(a,b,c,color){slabTriangles.push(...a,...b,...c);const tint=new THREE.Color(color);for(let i=0;i<3;i++)slabColors.push(tint.r,tint.g,tint.b)}
  function quad(a,b,c,d,color){tri(a,b,c,color);tri(a,c,d,color)}
  function sidewalk(x0,z0,x1,z1,axis,reverse=false) {
    const alongX=axis==='x',start=alongX?x0:z0,end=alongX?x1:z1;
    const lip=alongX?z0:x0,far=alongX?z1:x1;
    const rampA=alongX?-2.85:-.47,rampB=alongX?.40:1.08;
    const cut=[start,end,rampA-.46,rampA,rampB,rampB+.46].filter(x=>x>=start&&x<=end);
    for(let a=start;a<end;a+=.68)cut.push(a);const cuts=[...new Set(cut)].sort((a,b)=>a-b);
    const iy=[lip,lip+.165,lip+.405,lip+.71,far].filter(v=>v<=far);
    const pt=(a,b,h)=>alongX?[a,h,reverse?far-(b-lip):b]:[b,h,a];
    const smooth=n=>Math.max(0,Math.min(1,n));
    function y(a,b){return .18-.145*Math.min(smooth((a-rampA+.46)/.46),smooth((rampB+.46-a)/.46))*smooth(1-(b-lip)/.65)}
    for(let i=1;i<cuts.length;i++)for(let j=1;j<iy.length;j++){
      const a=cuts[i-1],b=cuts[i],s=iy[j-1],t=iy[j];
      const pts=[pt(a,s,y(a,s)),pt(a,t,y(a,t)),pt(b,t,y(b,t)),pt(b,s,y(b,s))];
      if(!alongX||reverse)pts.reverse();
      quad(...pts,j===1?pick(['#a1a5a1','#979fa0','#a4a7a2']):pick(['#717c83','#6e7880','#768088','#717a83']));
      const seam=.008;if(b-a>seam*2){
        const seamP=[pt(a,s,y(a,s)+.001),pt(a,t,y(a,t)+.001),pt(a+seam,t,y(a+seam,t)+.001),pt(a+seam,s,y(a+seam,s)+.001)];
        if(!alongX||reverse)seamP.reverse();quad(...seamP,'#535e66');
      }
      if(j===1){const front=[pt(a,lip,0),pt(a,lip,y(a,lip)),pt(b,lip,y(b,lip)),pt(b,lip,0)];if(!alongX||reverse)front.reverse();quad(...front,'#8b9291')}
      if(j===iy.length-1){const farEdge=[pt(b,t,0),pt(b,t,y(b,t)),pt(a,t,y(a,t)),pt(a,t,0)];if(!alongX||reverse)farEdge.reverse();quad(...farEdge,'#777f80')}
    }
  }
  sidewalk(west,old.front,east,7.25,'x');
  sidewalk(old.right,north,6.96,old.frontCurb,'z');
  sidewalk(6.96,1.58,east,old.frontCurb,'x',true);
  const pavingGeometry=new THREE.BufferGeometry();
  pavingGeometry.setAttribute('position',new THREE.Float32BufferAttribute(slabTriangles,3));pavingGeometry.setAttribute('color',new THREE.Float32BufferAttribute(slabColors,3));pavingGeometry.computeVertexNormals();
  const pavement=new THREE.Mesh(pavingGeometry,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:.51,metalness:.07}));pavement.receiveShadow=true;ground.add(pavement);
  const studs=[];
  function warningTile(x,z,turn=false){
    const h=.18-.145*Math.max(0,1-((turn?x-old.right:z-old.front)/.65));
    const tilt=Math.atan(.145/.65);
    const tile=box(details,x,h+.012,z,.264,.021,.263,'#ceaa67');
    if(turn)tile.rotation.z=tilt;else tile.rotation.x=-tilt;
    for(let i=0;i<4;i++)for(let j=0;j<4;j++){
      const dx=(i-1.5)*.057,dz=(j-1.5)*.057;
      const studH=h+.024+(turn?dx:dz)*.145/.65;
      studs.push([x+dx,studH,z+dz,.012,.006,.012,'#e2bc78']);
    }
  }
  for(let x=-2.67;x<.33;x+=.29)warningTile(x,old.front+.39);
  for(let z=-.29;z<.99;z+=.29)warningTile(old.right+.39,z,true);
  scatter(details,new THREE.SphereGeometry(1,6,4),studs);
  // One boundary datum for every panel, post and return. The coping panels
  // stop at the square corner caps, leaving no stacked or coplanar corner faces.
  const boundary=new THREE.Group();boundary.name='Residential perimeter fence';details.add(boundary);
  const grade=.16,wallTop=.615,copingTop=.665,lowRail=.760,highRail=1.040,postTop=1.086;
  const vertexMap=new Map(),gateMarks=new Map();
  Object.entries(entries).forEach(([name,e])=>{
    gateMarks.set(e.left+','+property.street,name);gateMarks.set(e.right+','+property.street,name);
  });
  function pierAt(x,z) {
    const key=x+','+z;if(vertexMap.has(key))return vertexMap.get(key);
    const entry=gateMarks.get(key),w=entry ? .186 : .170,capW=w+.036;
    const pier=new THREE.Group();pier.position.set(x,0,z);pier.name=entry?'Gate jamb · '+entry:'Corner pier';
    boundary.add(pier);
    box(pier,0,(grade+wallTop)/2,0,w,wallTop-grade,w,'#92958f');
    box(pier,0,(wallTop+copingTop)/2,0,capW,copingTop-wallTop,capW,'#b5b6aa');
    // At the garden the full-height entrance arch supplies both steel uprights.
    if(entry!=='garden'){
      const pw=entry ? .095 : .070;
      box(pier,0,(postTop+copingTop)/2,0,pw,postTop-copingTop,pw,'#536866');
      box(pier,0,postTop+.012,0,pw+.024,.024,pw+.024,'#89948b');
    }
    const record={x,z,w,capW};vertexMap.set(key,record);return record;
  }
  function fenceRun(name,x0,z0,x1,z1){
    const a=pierAt(x0,z0),b=pierAt(x1,z1),length=Math.hypot(x1-x0,z1-z0);
    const g=new THREE.Group();g.name='Fence run · '+name;g.position.set(x0,0,z0);
    g.rotation.y=-Math.atan2(z1-z0,x1-x0);boundary.add(g);
    function span(lo,hi,y,h,d,color,part){
      const mesh=box(g,(lo+hi)*.5,y,0,hi-lo,h,d,color);mesh.name=part;return mesh;
    }
    const wallA=a.w*.5,wallB=length-b.w*.5,capA=a.capW*.5,capB=length-b.capW*.5;
    span(wallA,wallB,(grade+wallTop)/2,wallTop-grade,.126,'#959891','Concrete plinth');
    span(capA,capB,(wallTop+copingTop)/2,copingTop-wallTop,.151,'#b1b4a9','Coping');
    span(wallA,wallB,.388,.011,.130,'#848a83','Block bed joint');
    const units=Math.max(1,Math.round((wallB-wallA)/.73));
    for(let i=1;i<units;i++){
      const u=wallA+(wallB-wallA)*i/units;
      span(u-.006,u+.006,.385,.431,.130,'#808780','Block joint');
    }
    const bays=Math.max(1,Math.ceil(length/1.42)),bay=length/bays;
    for(const h of [lowRail,highRail])span(0,length,h,.039,.041,'#637674','Continuous steel rail');
    for(let j=1;j<bays;j++){
      const x=bay*j;
      box(g,x,(postTop+copingTop)*.5,0,.050,postTop-copingTop,.053,'#526763');
      box(g,x,postTop+.008,0,.066,.016,.069,'#89968b');
    }
    for(let j=0;j<bays;j++){
      const n=Math.ceil(bay/.164);
      for(let i=1;i<n;i++)box(g,bay*(j+i/n),(lowRail+highRail)/2,0,.020,highRail-lowRail,.023,'#728780');
    }
  }
  const {west:wx,east:ex,street:sz,rear:rz}=property;
  let cursor=wx;
  Object.entries(entries).forEach(([name,e])=>{fenceRun('street to '+name,cursor,sz,e.left,sz);cursor=e.right;});
  fenceRun('street east',cursor,sz,ex,sz);
  fenceRun('east',ex,sz,ex,rz);
  fenceRun('rear cycle yard',ex,rz,divider.x,rz);fenceRun('rear garden',divider.x,rz,wx,rz);
  fenceRun('west',wx,rz,wx,sz);
  // Continue the existing low masonry and open metal railing between the
  // two yards, sharing its end piers with the front and rear perimeter.
  fenceRun('garden and cycle yard divider',divider.x,sz,divider.x,rz);
  // Entrance plinth, post boxes, door buzzer and the very low step from the paving.
  box(details,.95,.191,8.11,1.18,.062,.29,'#aca89d');
  box(details,.95,.275,8.24,1.18,.17,.15,'#a6a59c');
  box(details,2.24,.841,sz-.105,.40,.26,.13,'#748480');
  box(details,2.24,.88,sz-.175,.30,.027,.014,'#293b41');box(details,2.24,.797,sz-.178,.17,.042,.014,'#bcbdb0');
  box(details,1.94,.84,sz-.066,.091,.152,.05,'#536362');cyl(details,1.94,.86,sz-.097,.024,.024,.018,'#c4cbba').rotation.x=Math.PI/2;
  function fixture(parent,x,y,z,tint,power,reach) {
    box(parent,x,y,z,.23,.115,.19,'#4e605f');box(parent,x,y+.009,z-.103,.17,.058,.026,'#efdec3',{emissive:tint,intensity:1.10});
    const lamp=new THREE.PointLight(tint,power,reach,2);lamp.position.set(x,y+.035,z-.09);parent.add(lamp);
  }
  fixture(details,2.65,.742,sz-.076,'#ffbf80',1.85,3.4);
  buildAllotmentStreet(k);
  // A pair of small, pruned street trees belong to the residential side.
  const urbanCrowns=[];
  function streetTree(x,z,s){
    box(details,x,.206,z,1.03,.091,.77,'#989b90');box(details,x,.261,z,.89,.021,.63,'#4f5f57');
    rod(details,[x,.26,z],[x+.06,1.62*s,z],.088*s,.057*s,'#746355');
    const palette=['#537465','#537d69','#67856e','#698b70','#48685d'];
    for(let i=0;i<7;i++){
      const ang=i*2.39996,rr=i?.30+.11*rand():.03;
      const tx=x+Math.cos(ang)*rr*s,tz=z+Math.sin(ang)*rr*s,ty=(i?1.83+rand()*.27:2.21)*s;
      rod(details,[x+.05,1.34*s,z],[tx,ty,tz],.045*s,.019*s,'#786b5b');
      const sz=s*(.37+.085*rand());urbanCrowns.push([tx,ty+.10*s,tz,sz,sz*.95,sz,pick(palette),.1,rand()*5,.05]);
    }
    for(const xx of [-.20,.20])rod(details,[x+xx,.27,z-.11],[x+xx*.5,1.14*s,z],.023,.023,'#8e836d');
    rod(details,[x-.22,1.02*s,z],[x+.23,1.02*s,z],.018,.018,'#6b7466');
  }
  streetTree(-9.87,8.42,.93);streetTree(16.10,8.38,.89);
  scatter(details,new THREE.IcosahedronGeometry(1,1),urbanCrowns);
  function scatter(parent,geo,items,matOptions={}){
    if(!items.length)return;
    const m=new THREE.MeshStandardMaterial({roughness:.82,flatShading:true,...matOptions});
    const im=new THREE.InstancedMesh(geo,m,items.length),d=new THREE.Object3D(),c=new THREE.Color();
    items.forEach(([x,y,z,sx,sy,sz,shade,rx=0,ry=0,rz=0],i)=>{
      d.position.set(x,y,z);d.scale.set(sx,sy,sz);d.rotation.set(rx,ry,rz);d.updateMatrix();
      im.setMatrixAt(i,d.matrix);im.setColorAt(i,c.set(shade));
    });
    im.castShadow=im.receiveShadow=true;im.computeBoundingSphere();parent.add(im);return im;
  }
  const beds=[
    ['tomato','番茄','トマト'],['eggplant','茄子','ナス'],['cucumber','黄瓜','キュウリ'],['pepper','甜椒','ピーマン'],
    ['cabbage','卷心菜','キャベツ'],['daikon','白萝卜','ダイコン'],['carrot','胡萝卜','ニンジン'],['spring-onion','小葱','ネギ']
  ];
  const plotBeds=[];
  // Each plot owns all its visible pieces so a hit on any leaf, board or fruit resolves to that plot.
  beds.forEach(([id,name,jp],index)=>{
    const col=index%4,row=Math.floor(index/4),x=5.37+col*2.00,z=10.12+row*4.23;
    const bed=k.group('畑・'+jp,1.88+index*.09);
    Object.assign(bed.userData,{preserveBatch:true,plotId:index,cropId:id});
    plotBeds.push({id:'plot-'+(index+1),cropId:id,object:bed});
    bed.position.set(x,.16,z);
    const bx=1.45,bz=3.13;
    const soil=new THREE.Group();soil.name=id+' bed soil';Object.assign(soil.userData,{preserveBatch:true,cropRole:'soil'});bed.add(soil);
    box(bed,0,.102,0,bx,.20,bz,'#61513d');box(soil,0,.214,0,bx-.12,.030,bz-.12,'#665848');
    for(const sign of [-1,1]){
      box(bed,sign*bx*.5,.125,0,.078,.25,bz+.09,'#818c89');box(bed,0,.125,sign*bz*.5,bx,.25,.081,'#87938d');
      for(const end of [-1,1])box(bed,sign*bx*.5,.148,end*bz*.5,.105,.296,.107,'#657776');
    }
    for(let j=0;j<2;j++)box(soil,(j-.5)*.64,.237,0,.37,.032,bz-.20,'#72624b');
    growKitchenBed(k,bed,id,index);
    box(bed,.52,.39,-1.415,.038,.35,.036,'#9b8669');
    box(bed,.52,.545,-1.415,.31,.16,.033,'#d6c59d');
    k.label(bed,jp,.52,.545,-1.438,.27,.104,{rotateY:Math.PI,color:'#514e44',font:'bold 92px "Yu Gothic", sans-serif'}).userData.cropRole='label';
    register({id:'plot-'+(index+1),room:'garden',label:name+'种植床',actions:['查看','浇水','采收','播种'],anchor:[x,.98,z],object:bed,approach:[x,.16,z-1.87]});
  });
  // A cantilevered polycarbonate cycle shelter has a clear loading aisle along its western edge.
  const steel='#687d7c', edgeSteel='#869a96', roofShade='#b0c9c7';
  const postX=16.91;
  for(const z of [9.04,12.14,15.22]){
    box(cycles,postX,.222,z,.23,.12,.23,'#a6a69b');
    box(cycles,postX,1.49,z,.102,2.54,.11,steel);
    rod(cycles,[postX,1.85,z],[15.69,2.56,z],.039,.039,steel);
    rod(cycles,[postX,2.75,z],[13.64,2.43,z],.057,.051,edgeSteel);
  }
  const panelAngle=.095;
  for(let i=0;i<7;i++){
    const z=8.74+i*.99;
    const panel=box(cycles,15.27,2.605,z,3.38,.044,.968,roofShade,{opacity:.26,metalness:.05,roughness:.35});
    panel.rotation.z=panelAngle;
    const rib=box(cycles,15.27,2.634,z-.488,3.40,.035,.037,edgeSteel);rib.rotation.z=panelAngle;
  }
  for(const x of [13.58,16.96]){
    box(cycles,x,2.613+(x-15.27)*panelAngle,11.72,.076,.083,7.06,edgeSteel);
  }
  for(let i=0;i<13;i++){
    const x=13.71+i*.262;box(cycles,x,2.635+(x-15.27)*panelAngle,11.72,.009,.012,6.93,'#829a9c');
  }
  box(cycles,13.55,2.43,11.72,.059,.105,7.07,'#536f72');
  box(cycles,13.529,2.46,11.72,.024,.020,6.98,'#b3d2bc',{emissive:'#83cdba',intensity:.29});
  box(cycles,13.59,2.374,8.46,.11,.11,.63,'#a36b68');
  box(cycles,15.28,2.53,11.9,.13,.055,2.03,'#ccdec8',{emissive:'#a2e2cb',intensity:1.20});
  const cycleLight=new THREE.PointLight('#9edbc6',3.5,5.1,2);cycleLight.position.set(15.33,2.32,11.47);cycles.add(cycleLight);
  for(const z of [8.87,9.80,10.73,11.66,12.59,13.52,14.45]){
    line(cycles,[[14.10,.18,z],[14.10,.47,z],[14.15,.55,z],[14.37,.55,z],[14.43,.47,z],[14.43,.18,z]],'#8e9d9b',.024);
    box(cycles,14.24,.185,z,.49,.048,.11,'#747d7a');
  }
  function bicycle(cx,cz,paint,basket) {
    const bike=new THREE.Group();bike.position.set(cx,.16,cz);cycles.add(bike);
    const tire=k.mat('#363c45',{roughness:.75}),metal=k.mat('#aab4ad',{metalness:.33});
    const rubber=new THREE.TorusGeometry(.302,.038,7,28),rim=new THREE.TorusGeometry(.272,.010,5,26);
    for(const x of [-.55,.55]){
      const wheel=new THREE.Mesh(rubber,tire);wheel.position.set(x,.342,0);wheel.castShadow=true;bike.add(wheel);
      const ring=new THREE.Mesh(rim,metal);ring.position.copy(wheel.position);bike.add(ring);
      for(let j=0;j<6;j++){
        const a=j*Math.PI/6,dx=Math.cos(a)*.265,dy=Math.sin(a)*.265;
        rod(bike,[x-dx,.342-dy,0],[x+dx,.342+dy,0],.007,.007,'#aeb6b0',4);
      }
    }
    const back=[.55,.342,0],seat=[.205,.765,0],crank=[.039,.348,0],stem=[-.385,.788,0],front=[-.55,.342,0];
    for(const [a,b] of [[back,seat],[back,crank],[crank,seat],[crank,stem],[stem,seat],[stem,front]])rod(bike,a,b,.027,.026,paint,7);
    rod(bike,[.205,.765,0],[.235,.847,0],.02,.02,'#909c99');
    box(bike,.245,.852,0,.22,.061,.13,'#554d4c');
    rod(bike,[-.385,.768,0],[-.43,.956,0],.018,.018,'#a9b0a9');
    rod(bike,[-.43,.956,-.21],[-.43,.956,.21],.017,.017,'#a9b0a9');
    for(const side of [-1,1]){
      rod(bike,[-.429,.956,side*.137],[-.429,.956,side*.211],.024,.024,'#525453');
      rod(bike,[.039,.348,0],[.03+side*.085,.348+side*.052,side*.071],.015,.015,'#9ca69f');
      box(bike,.03+side*.085,.348+side*.052,side*.092,.08,.027,.062,'#646b65');
    }
    if(basket){
      for(const z of [-.14,.14])line(bike,[[-.68,.72,z],[-.68,.94,z],[-.46,.94,z],[-.46,.73,z]],'#929d96',.011);
      for(const x of [-.68,-.57,-.46])rod(bike,[x,.94,-.14],[x,.94,.14],.010,.010,'#929d96',5);
      box(bike,-.57,.73,0,.22,.023,.28,'#80928c');
    }
  }
  bicycle(14.87,9.79,'#8f655e',true);
  bicycle(14.88,11.65,'#627f81',false);
  bicycle(14.88,13.54,'#9c9d8c',true);
  // A small porcelain station plate at the end nearest the viewer identifies
  // the airy bike shelter while keeping the bikes visible through the roof.
  const endZ=15.30;
  for(const x of [14.78,15.84])box(cycles,x,2.48+(x-15.27)*panelAngle,endZ,.028,.31,.031,'#778483');
  box(cycles,15.31,2.296,endZ,1.44,.306,.058,'#4c6b68');
  box(cycles,15.31,2.459,endZ+.006,1.50,.035,.104,'#9aa59c');
  box(cycles,15.31,2.425,endZ+.042,1.28,.022,.024,'#d3bf96',{emissive:'#ddbc81',intensity:.35});
  k.label(cycles,'駐輪場   01–07',15.31,2.291,endZ+.033,1.21,.185,{color:'#ede3c6',font:'bold 82px "Yu Gothic",sans-serif'});
  // The small shared service yard is tucked against the rear, away from the plot approaches.
  for(const [x,tint] of [[15.34,'#718889'],[16.08,'#6e8176']]){
    box(cycles,x,.521,17.26,.54,.67,.45,tint);
    box(cycles,x,.875,17.26,.61,.067,.50,'#a3b0a5');
    box(cycles,x,.672,17.021,.26,.12,.016,'#d2ceba');
    k.label(cycles,'資源',x,.672,17.008,.21,.083,{color:'#50635a',rotateY:Math.PI});
  }
  box(cycles,16.95,.628,17.37,.62,.93,.43,'#858e8b');
  for(let i=0;i<5;i++)box(cycles,16.95,.58+i*.065,17.143,.45,.023,.018,'#586867');
  // Shelter ID is printed on the metal fascia.
  box(cycles,15.26,2.564,8.232,1.17,.20,.046,'#466d68');
  k.label(cycles,'月極駐輪場',15.26,2.564,8.204,1.02,.140,{color:'#e3e9d4',rotateY:Math.PI});
  return plotBeds;
}
