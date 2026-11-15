import * as THREE from 'three';

const TAU = 2 * Math.PI;
const jp = '"Yu Mincho", "Hiragino Mincho ProN", "Noto Serif JP", "MS Mincho", "Noto Serif CJK SC", serif';
const timber = '#654237', darkWood = '#493331', cedar = '#976345';
const brass = '#a7835b', roofInk = '#354351';

function artwork(width,height,draw){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  draw(canvas.getContext('2d'),width,height);
  const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;
  return map;
}

function picture(g,map,x,y,z,w,h,rotation=0){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map,toneMapped:false,side:THREE.DoubleSide}));
  m.position.set(x,y,z);m.rotation.y=rotation;g.add(m);return m;
}

function brush(c,t,x,y,size,col,align='center'){
  c.font=`700 ${size}px ${jp}`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=col;c.fillText(t,x,y);
}

function crest(c,x,y,r,ink){
  c.save();c.translate(x,y);c.scale(r,r);c.strokeStyle=ink;c.lineWidth=.071;c.beginPath();c.arc(0,0,.91,0,TAU);c.stroke();
  // A tea sprig bent over a cup. This is painted, woven and stamped around the shop.
  c.fillStyle=ink;c.beginPath();c.ellipse(-.27,-.18,.29,.105,.48,0,TAU);c.fill();
  c.beginPath();c.ellipse(.17,-.37,.34,.13,-.57,0,TAU);c.fill();
  c.beginPath();c.moveTo(-.03,.22);c.quadraticCurveTo(-.03,-.05,.24,-.36);c.stroke();
  c.beginPath();c.moveTo(-.51,.13);c.quadraticCurveTo(-.45,.54,0,.55);c.quadraticCurveTo(.43,.52,.5,.13);c.closePath();c.fill();
  c.fillRect(-.23,.61,.44,.065);c.restore();
}

function shopSign(){
  return artwork(864,216,(c,w,h)=>{
    const bg=c.createLinearGradient(0,0,0,h);bg.addColorStop(0,'#bc8c5e');bg.addColorStop(.28,'#ddb47c');bg.addColorStop(.72,'#cfa16c');bg.addColorStop(1,'#a87750');c.fillStyle=bg;c.fillRect(0,0,w,h);
    for(let j=0;j<26;j++){
      const y=j*9.1;c.strokeStyle=j%3?'rgba(100,60,40,.12)':'rgba(255,217,161,.21)';c.lineWidth=(j%4)*.5+1;c.beginPath();c.moveTo(0,y);
      c.bezierCurveTo(175,y+Math.sin(j)*9,450,y-Math.cos(j*.8)*17,865,y+5);c.stroke();
    }
    crest(c,88,110,51,'#64452f');brush(c,'茶房',224,111,57,'#54422d');brush(c,'灯乃庭',535,112,128,'#372b29');
    c.fillStyle='#97513f';c.fillRect(760,141,43,41);brush(c,'庭',781,163,29,'#edcf9e');
  });
}

function clothTexture(i){
  return artwork(196,252,(c,w,h)=>{
    c.fillStyle=['#364e65','#3b5469','#354e63'][i];c.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=3){c.fillStyle=x%4?'rgba(220,225,205,.06)':'rgba(15,29,48,.12)';c.fillRect(x,0,1,h);}
    for(let y=0;y<h;y+=5){c.fillStyle='rgba(203,211,190,.045)';c.fillRect(0,y,w,1);}
    crest(c,w*.5,h*.39,43,'#eadcbb');
    brush(c,['灯','乃','庭'][i],w*.5,h*.78,48,'#d5d1b8');
    c.fillStyle='#90a2a2';c.fillRect(0,h-13,w,2);c.fillRect(0,h-8,w,1);
  });
}

function gable(g,k,x,z,y,width,height,depth){
  const shape=new THREE.Shape();shape.moveTo(-width/2,0);shape.lineTo(width/2,0);shape.lineTo(0,height);shape.closePath();
  const mesh=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:false}),k.mat('#c1aa89'));
  mesh.receiveShadow=true;mesh.castShadow=true;mesh.position.set(x,y,z);g.add(mesh);
}

// Concave pan and raised roll over every pitch. Short courses overlap like fired kawara.
function layTiles(g,at,down,along,width,depth,rows,bays,tileTone){
  const positions=[],colors=[];
  const point=(u,v,relief)=>[at[0]+u*down[0]+v*along[0],at[1]+u*down[1]+v*along[1]+relief,at[2]+u*down[2]+v*along[2]];
  function tri(a,b,c,col){positions.push(...a,...b,...c);for(let i=0;i<3;i++)colors.push(col.r,col.g,col.b);}
  const profile=t=>.010-.038*Math.sin(Math.PI*t)+.055*Math.exp(-Math.pow((t-.78)/.12,2));
  const palette=tileTone.map(t=>new THREE.Color(t));
  for(let r=0;r<rows;r++)for(let n=0;n<bays;n++){
    const u0=r*depth/rows,u1=(r+1)*depth/rows;
    const colour=palette[(r*173+n*219+Math.floor(n/3))%palette.length];
    for(let j=0;j<7;j++){
      const t0=j/7,t1=(j+1)/7,v0=(n+t0)*width/bays,v1=(n+t1)*width/bays;
      const a=point(u0,v0,profile(t0)+.015),b=point(u0,v1,profile(t1)+.015);
      const c=point(u1,v1,profile(t1)+.044),d=point(u1,v0,profile(t0)+.044);
      tri(a,b,d,colour);tri(b,c,d,colour);
      const lip=palette[(r+n+2)%palette.length].clone().multiplyScalar(.55);
      const e=point(u1,v1,profile(t1)+.009),f=point(u1,v0,profile(t0)+.009);
      tri(d,c,f,lip);tri(c,e,f,lip);
    }
  }
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));geo.computeVertexNormals();
  const mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.53,metalness:.21,side:THREE.DoubleSide});
  const mesh=new THREE.Mesh(geo,mat);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);
}

function teaPot(k,g,x,y,z,scale,col){
  const vessel=(r,h,dy,colour)=>k.cyl(g,x,y+dy*scale,z,r*scale,r*.89*scale,h*scale,colour,{segments:18});
  vessel(.15,.035,.02,'#463f3e');vessel(.185,.055,.056,col);vessel(.198,.135,.14,col);vessel(.163,.067,.23,col);
  vessel(.141,.028,.279,'#8d8570');vessel(.041,.033,.308,'#655e51');
  k.line(g,[[x-.13*scale,y+.12*scale,z],[x-.24*scale,y+.18*scale,z],[x-.31*scale,y+.272*scale,z]],col,.045*scale);
  const pts=[];for(let i=0;i<=10;i++){const t=i*Math.PI/10;pts.push([x+Math.cos(t)*.158*scale,y+(.225+.225*Math.sin(t))*scale,z]);}
  k.line(g,pts,'#463e37',.019*scale);
}

export function buildTeahouse(k){
  const {group,box,cyl,line,glow}=k;
  const left=-10.10,right=-6.57,zBack=-4.0,zFront=.73,mid=(left+right)/2,zc=(zBack+zFront)/2;
  const foundation=group('Tea house · stonework and tatami',.58);
  box(foundation,mid,.286,zc,3.55,.22,4.75,'#787976');
  for(let i=0;i<9;i++)box(foundation,left+.20+i*.394,.289,zFront+.024,.383,.166,.05,['#979488','#8b8c85','#a0988a'][i%3]);
  box(foundation,mid,.432,zc,3.5,.104,4.64,'#8b644b');
  // Alternating tatami seams and exposed cedar step boards.
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    const x=left+.49+col*.855,z=zBack+.62+row*1.105;
    box(foundation,x,.502,z,.85,.043,1.09,['#ae9e79','#bbae83','#c2ae87'][(row+col)%3]);
    box(foundation,x-.411,.527,z,.028,.011,1.086,'#617267');
  }
  box(foundation,mid,.375,zFront+.153,3.55,.13,.30,'#76543f');
  for(let i=0;i<3;i++)box(foundation,mid,.456,zFront+.023+i*.10,3.56,.043,.09,['#ac7a52','#946749','#a47351'][i]);
  box(foundation,-7.27,.264,1.18,1.05,.139,.43,'#8c8a80');

  const timberwork=group('Tea house · timber and plaster',1.06);
  box(timberwork,mid,1.53,zBack,3.51,2.08,.105,'#b8aa8d');
  box(timberwork,left,1.51,zc,.10,2.08,4.65,'#b5a487');
  box(timberwork,right,1.43,-3.14,.099,1.95,1.69,'#ac997d');
  box(timberwork,mid,.79,zBack+.06,3.44,.57,.05,timber);
  for(let i=0;i<13;i++)box(timberwork,left+.15+.269*i,.78,zBack+.094,.018,.55,.018,cedar);
  for(const x of [left,left+1.79,right-.93,right])box(timberwork,x,1.53,zFront,.106,2.10,.13,darkWood);
  for(const z of [zBack,-2.37,-.94,zFront])for(const x of [left,right]){
    box(timberwork,x,1.53,z,.12,2.12,.12,timber);box(timberwork,x,.52,z,.146,.104,.147,'#736c60');
  }
  for(const y of [.54,.97,2.27,2.56]){
    box(timberwork,mid,y,zBack+.071,3.50,.065,.077,darkWood);
    box(timberwork,left+.056,y,zc,.075,.066,4.66,timber);
    box(timberwork,right-.013,y,zc,.095,.074,4.66,timber);
  }
  box(timberwork,mid,2.42,zFront,3.60,.243,.16,timber);
  box(timberwork,mid,2.255,zFront,3.59,.051,.18,cedar);
  // Low cedar boarding lets the illuminated front counter remain open to view.
  box(timberwork,-8.87,.726,zFront,2.31,.56,.10,'#825e45');
  for(let i=0;i<=17;i++)box(timberwork,-9.981+i*.132,.723,zFront+.062,.024,.54,.025,'#6c4b39');
  box(timberwork,-8.87,1.027,zFront,2.33,.063,.20,cedar);
  box(timberwork,-6.762,1.62,zFront,.33,1.30,.072,'#d2c2a4');
  for(const y of [1.22,1.64,2.04])box(timberwork,-6.765,y,zFront+.043,.334,.034,.032,cedar);
  // A small bedside bay of shoji faces the alley, while its front bay stays open.
  const paper={emissive:'#e5a260',intensity:.48};
  box(timberwork,right,1.56,-1.653,.06,1.22,1.31,'#e5c99a',paper);
  for(let i=0;i<6;i++)box(timberwork,right+.05,1.56,-2.30+i*.258,.051,1.26,.03,timber);
  for(let i=0;i<5;i++)box(timberwork,right+.052,1.014+i*.276,-1.656,.055,.035,1.31,timber);
  box(timberwork,right,.744,-.08,.08,.55,1.57,timber);
  for(let i=0;i<11;i++)box(timberwork,right+.049,.752,-.84+i*.149,.021,.54,.025,'#93694b');
  // A fine asymmetric grille only occupies the end of the display window.
  for(let i=0;i<6;i++)box(timberwork,left+.14+i*.092,1.649,zFront+.024,.026,1.19,.044,'#855d43');
  for(let i=0;i<4;i++)box(timberwork,left+.378,1.11+i*.356,zFront+.048,.53,.025,.035,timber);
  for(let i=0;i<6;i++)box(timberwork,right+.05,1.65,-.81+i*.091,.034,1.18,.026,'#825d45');

  const room=group('Tea house · counter and tea ware',1.57);
  const counterX=-8.94;
  box(room,counterX,.827,-.105,1.99,.67,.56,'#886047');
  for(let i=0;i<16;i++)box(room,-9.872+i*.125,.827,.185,.027,.65,.027,'#735442');
  box(room,counterX,1.205,-.09,2.08,.102,.62,'#bb8c60');
  box(room,-8.90,1.27,-.11,.59,.035,.40,'#555c57');
  teaPot(k,room,-8.89,1.292,-.105,1.12,'#545a56');
  const ware=['#c4d0b7','#b5ccc5','#a9b9a9','#d4c09d'];
  for(let i=0;i<4;i++){
    const x=-9.72+(i%2)*.205,z=-.04+Math.floor(i/2)*.168;
    cyl(room,x,1.27,z,.091,.11,.021,'#8f6a4e');cyl(room,x,1.34,z,.083,.059,.117,ware[i],{segments:16});
    cyl(room,x,1.4,z,.067,.068,.008,'#776849');
  }
  box(room,-8.21,1.277,-.012,.44,.034,.28,'#7c4937');
  for(let i=0;i<3;i++){
    const c=new THREE.Mesh(new THREE.SphereGeometry(1,12,7),k.mat(['#ce8f86','#adc6a1','#e3c88d'][i]));
    c.scale.set(.061,.041,.057);c.position.set(-8.35+i*.135,1.329,-.012);room.add(c);
  }
  // Tea canisters sit in open wooden niches with individual paper labels.
  const shelvesX=-9.13;
  box(room,shelvesX,1.58,-2.22,1.54,1.57,.14,'#845d44');
  for(const sy of [.85,1.382,1.915,2.36])box(room,shelvesX,sy,-2.13,1.60,.059,.38,'#ae8058');
  for(const x of [shelvesX-.76,shelvesX+.76])box(room,x,1.60,-2.14,.057,1.54,.33,timber);
  for(let row=0;row<3;row++)for(let i=0;i<6;i++){
    const x=-9.73+i*.242,y=.88+row*.529,h=(row===2?.235:.29)+(i%2)*.039;
    cyl(room,x,y+h/2,-2.07,.087,.088,h,['#b88249','#648a80','#9c6554','#868b68','#b79969','#938587'][(row+i)%6]);
    cyl(room,x,y+h+.011,-2.07,.093,.093,.025,brass);box(room,x,y+h*.53,-1.98,.117,.095,.012,'#ddc8a2');
    box(room,x,y+h*.53,-1.97,.046,.013,.011,'#8c7460');
  }
  box(room,-7.64,.785,-1.71,1.02,.102,.76,'#a67f5c');
  for(const x of [-8.045,-7.236])for(const z of [-2.0,-1.42])box(room,x,.65,z,.085,.231,.086,timber);
  for(const z of [-2.33,-1.06])box(room,-7.64,.575,z,.62,.085,.43,'#788a78');
  for(let i=0;i<2;i++)cyl(room,-7.8+i*.29,.885,-1.67,.068,.052,.106,'#c1b99e');
  const scroll=artwork(160,300,(c,w,h)=>{c.fillStyle='#d2bd98';c.fillRect(0,0,w,h);c.fillStyle='#548176';c.beginPath();c.arc(98,103,31,0,TAU);c.fill();for(let i=0;i<4;i++){c.fillStyle=['#78877a','#4d746c','#56766e','#89937e'][i];c.beginPath();c.moveTo(0,230-i*14);c.quadraticCurveTo(40+i*10,120+i*12,90,185-i*5);c.lineTo(160,147+i*15);c.lineTo(160,260);c.lineTo(0,260);c.fill();}brush(c,'庭',124,272,19,'#9c544c');});
  picture(room,scroll,-7.48,1.71,zBack+.078,.49,.94);
  for(const y of [1.219,2.201])box(room,-7.48,y,zBack+.09,.56,.047,.05,timber);
  const light=new THREE.PointLight(0xffb56f,5.1,4.3,2);light.position.set(-8.65,2.07,-.47);room.add(light);

  const eaves=group('Tea house · gable timber and eaves',2.36);
  gable(eaves,k,mid,.663,2.52,3.57,1.11,.107);gable(eaves,k,mid,-4.037,2.52,3.57,1.11,.13);
  for(const z of [zFront+.07,zBack-.03]){
    box(eaves,mid,2.57,z,3.67,.125,.10,darkWood);
    for(const dx of [-.65,0,.65])box(eaves,mid+dx,2.55+(1.09-Math.abs(dx)*.61)/2,z,.078,1.09-Math.abs(dx)*.61,.083,timber);
    line(eaves,[[mid-1.81,2.52,z],[mid,3.69,z],[mid+1.81,2.52,z]],darkWood,.084);
  }
  const leftEave=-10.454,rightEave=-6.318,half=(rightEave-leftEave)/2,spine=(leftEave+rightEave)/2;
  const top=3.89,edge=2.65,z0=-4.38,z1=1.015;
  for(const sign of [-1,1]){
    const x=spine+sign*half/2;
    const deck=box(eaves,x,(top+edge)/2-.066,(z0+z1)/2,Math.hypot(half,top-edge),.116,z1-z0,roofInk);
    deck.rotation.z=-sign*Math.atan2(top-edge,half);
    box(eaves,spine+sign*half,edge-.063,(z0+z1)/2,.13,.145,z1-z0+.055,darkWood);
    for(let i=0;i<11;i++){
      const z=z0+.19+i*.503;
      line(eaves,[[spine+sign*(half-.36),edge+.061,z],[spine+sign*(half+.008),edge-.131,z]],cedar,.052);
    }
    for(const z of [z0-.022,z1+.018])line(eaves,[[spine,top-.035,z],[spine+sign*half,edge-.035,z]],'#6d5546',.065);
  }

  const roof=group('Tea house · ceramic tile courses',2.80);
  const tones=['#4c606d','#526775','#586c78','#4c626e','#607480','#526572','#5a6d79'];
  for(const sign of [-1,1]){
    layTiles(roof,[spine,top,z0],[sign,(edge-top)/half,0],[0,0,1],z1-z0,half,9,29,tones);
    const x=spine+sign*half;
    for(let i=0;i<29;i++){
      const z=z0+(i+.77)*(z1-z0)/29;
      const end=cyl(roof,x+sign*.015,edge+.058,z,.054,.061,.045,'#74838a',{segments:12});end.rotation.z=Math.PI/2;
      const face=cyl(roof,x+sign*.042,edge+.06,z,.031,.031,.007,roofInk,{segments:8});face.rotation.z=Math.PI/2;
    }
  }
  box(roof,spine,top+.079,(z0+z1)/2,.207,.129,z1-z0+.05,'#4a5c68');
  for(let i=0;i<16;i++){
    const d=(z1-z0)/16,p=cyl(roof,spine,top+.172,z0+(i+.5)*d,.108,.103,d+.017,tones[(2*i+1)%tones.length]);p.rotation.x=Math.PI/2;
    const lip=cyl(roof,spine,top+.171,z0+(i+1)*d-.014,.114,.114,.032,'#71838b');lip.rotation.x=Math.PI/2;
  }
  for(const z of [z0-.042,z1+.042]){
    const tip=cyl(roof,spine,top+.17,z,.126,.126,.058,'#84939a',{segments:20});tip.rotation.x=Math.PI/2;
    const seal=cyl(roof,spine,top+.173,z+(z>0?.032:-.032),.073,.073,.013,'#536975',{segments:8});seal.rotation.x=Math.PI/2;
  }
  // Warm copper is visible beneath the pitched tile and as a downpipe toward the alley.
  for(const x of [leftEave-.012,rightEave+.012])line(roof,[[x,edge-.109,z0+.012],[x,edge-.14,z1]],'#947054',.053);
  line(roof,[[rightEave,edge-.12,-3.65],[rightEave,2.44,-3.65],[-6.49,2.30,-3.65],[-6.49,.29,-3.65]],'#967358',.045);

  const shopfront=group('Tea house · entry canopy and noren',2.99);
  const sx0=left-.14,sx1=right+.13,az=.53,canopyZ=1.165,ay=2.54,endY=2.28,run=canopyZ-az;
  const underside=box(shopfront,mid,(ay+endY)/2-.039,(az+canopyZ)/2,sx1-sx0,.081,Math.hypot(run,ay-endY),'#60493c');underside.rotation.x=Math.atan2(ay-endY,run);
  layTiles(shopfront,[sx0,ay,az],[0,(endY-ay)/run,1],[1,0,0],sx1-sx0,run,4,21,tones);
  box(shopfront,mid,endY-.061,canopyZ,3.82,.107,.091,'#805d43');
  for(let i=0;i<9;i++)box(shopfront,sx0+.16+i*.431,endY-.096,canopyZ-.24,.059,.107,.48,'#a27650');
  line(shopfront,[[sx0-.02,endY-.018,canopyZ+.043],[sx1+.01,endY-.027,canopyZ+.043]],'#986d50',.038);
  // Cedar sign suspended against the light plaster of the gable.
  box(shopfront,mid,2.814,.848,2.22,.486,.103,'#684936');
  picture(shopfront,shopSign(),mid,2.814,.903,2.148,.435);
  for(const dx of [-.98,.98]){box(shopfront,mid+dx,3.069,.798,.051,.112,.066,'#483d32');cyl(shopfront,mid+dx,3.125,.801,.06,.045,.025,brass);}
  const doorX=-7.257;
  const rod=cyl(shopfront,doorX,2.086,.777,.026,.026,1.22,brass);rod.rotation.z=Math.PI/2;
  for(let i=0;i<3;i++){
    const x=doorX+(i-1)*.338,yy=1.782+(i%2)*.061;
    const cloth=picture(shopfront,clothTexture(i),x,yy,.806,.321,i===1?.476:.603);cloth.rotation.y=(i-1)*.045;
    for(const dx of [-.095,.096])box(shopfront,x+dx,2.069,.80,.028,.087,.032,'#46576a');
  }
  for(const x of [-9.58,-8.53]){
    box(shopfront,x,2.182,.942,.52,.041,.067,'#ad8f72');box(shopfront,x,2.153,.942,.446,.026,.04,'#fff0c6',{emissive:'#ffba73',intensity:1.3});
  }

  const garden=group('Tea house · lantern and courtyard',3.34);
  // Ribbed chochin with a printed tea crest and condensed calligraphy.
  const lx=-6.70,lz=.998,ly=1.69;
  line(garden,[[lx,2.22,.73],[lx,2.22,lz],[lx,2.02,lz]],'#685547',.023);
  const lanternTone={emissive:'#ffc181',intensity:.92};
  const ribs=[[0,.157],[.07,.229],[.19,.269],[.36,.269],[.50,.224],[.563,.155]];
  for(let n=0;n<ribs.length-1;n++){
    const [h0,d0]=ribs[n],[h1,d1]=ribs[n+1];cyl(garden,lx,ly-.28+(h0+h1)/2,lz,d1*.65,d0*.65,h1-h0,'#efd1a2',lanternTone);
  }
  for(let i=0;i<11;i++){
    const t=i/10,rad=(.15+.12*Math.sin(t*Math.PI)**.65)*.65;
    cyl(garden,lx,ly-.28+t*.563,lz,rad+.004,rad+.004,.009,'#b68c62',{emissive:'#bd8550',intensity:.43});
  }
  for(const h of [-.30,.302])cyl(garden,lx,ly+h,lz,.116,.116,.045,'#665244');
  k.label(garden,'茶',lx,ly,lz+.177,.175,.206,{color:'#694637',font:`bold 112px ${jp}`});glow(garden,lx,ly,lz,'#ffc490',1.02,.17);
  const warm=new THREE.PointLight(0xffa461,1.25,2.25,2);warm.position.set(lx,ly,lz+.09);garden.add(warm);

  // Bamboo water basin, river stones and dwarf ornamental maple at the outer left.
  const bx=-9.93,bz=1.13;
  cyl(garden,bx,.31,bz,.222,.19,.215,'#666b65',{segments:10});
  cyl(garden,bx,.428,bz,.24,.232,.062,'#91938a',{segments:12});
  cyl(garden,bx,.46,bz,.172,.172,.012,'#678d8c',{roughness:.2,metalness:.42,segments:16});
  line(garden,[[bx-.23,.24,bz-.04],[bx-.23,.795,bz-.04]],'#a39b69',.032);
  line(garden,[[bx-.23,.724,bz-.04],[bx+.017,.625,bz-.04]],'#bab180',.046);
  for(let i=0;i<5;i++){
    const t=.6+i*1.13;const stone=new THREE.Mesh(new THREE.DodecahedronGeometry(1),k.mat(i%2?'#888c83':'#666f6c'));stone.position.set(bx+Math.cos(t)*.279,.243,bz+Math.sin(t)*.233);stone.scale.set(.1,.055,.065);garden.add(stone);
  }
  const px=-6.67,pz=1.33;cyl(garden,px,.346,pz,.168,.124,.249,'#855f50',{segments:14});cyl(garden,px,.475,pz,.181,.174,.054,'#ad856e');
  cyl(garden,px,.505,pz,.152,.152,.011,'#564840');line(garden,[[px,.49,pz],[px+.019,.98,pz],[px-.047,1.135,pz]],'#79674c',.02);
  const leafShape=new THREE.OctahedronGeometry(1);
  for(let j=0;j<13;j++){
    const t=j*2.4,h=.615+(j%5)*.104,rad=.087+.06*(j%3),xx=px+Math.cos(t)*rad,zz=pz+Math.sin(t)*rad;
    line(garden,[[px,h-.066,pz],[xx,h+.055,zz]],'#8a7650',.010);
    for(let l=0;l<3;l++){
      const a=t+l*2.1;const leaf=new THREE.Mesh(leafShape,k.mat(['#8a694c','#a57548','#647e5e','#a85f42'][((j+l)*3)%4]));
      leaf.scale.set(.055,.025,.093);leaf.position.set(xx+Math.sin(a)*.042,h+.071,zz+Math.cos(a)*.047);leaf.rotation.set(.21,a,.34);garden.add(leaf);
    }
  }
}
