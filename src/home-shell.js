import * as THREE from 'three';
import {buildDiningPendant} from './dining-pendant.js';
import {layHomeFloor} from './home-floor.js';
import {dressStudyWalls} from './study-walls.js';

const floorY=.41, wallTop=3.03;
const limestone='#d7d9d1', putty='#e2ddd3', bronze='#948774', aluminium='#818d91';
const ink='#34414a', graphite='#546169', slate='#46535d', birch='#bb9f80';
const warm={emissive:'#ffbe86',intensity:.89};
const mint={emissive:'#68cabb',intensity:.74};
const coral={emissive:'#f18579',intensity:.82};

function nameplate(){
  const cv=document.createElement('canvas');cv.width=1024;cv.height=280;
  const c=cv.getContext('2d');c.fillStyle='#e1d4b5';c.fillRect(0,0,1024,280);
  c.strokeStyle='#a99c78';c.lineWidth=3;c.strokeRect(12,12,1000,256);
  c.fillStyle='#947451';c.fillRect(37,48,5,182);
  // Three diagonal rain strokes and two offset courtyard outlines form the residence mark.
  c.lineCap='round';c.lineWidth=7;c.strokeStyle='#47706b';
  for(const [x,y] of [[78,101],[103,75],[123,100]]){c.beginPath();c.moveTo(x+9,y-12);c.lineTo(x-2,y+5);c.stroke();}
  c.strokeStyle='#685c4c';c.lineWidth=7;c.beginPath();c.moveTo(66,134);c.lineTo(66,163);c.lineTo(145,163);c.lineTo(145,115);c.lineTo(117,115);c.stroke();
  c.fillStyle='#414b49';c.textBaseline='middle';c.font='600 91px "Yu Mincho","Hiragino Mincho ProN","Yu Gothic","Microsoft YaHei",serif';c.fillText('雨庭レジデンス',190,112,779);
  c.font='500 32px Arial, sans-serif';c.fillStyle='#676d60';c.fillText('A M A N I W A    R E S I D E N C E',198,205);
  c.fillStyle='#906750';c.fillRect(878,194,64,5);
  const map=new THREE.CanvasTexture(cv);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;return map;
}

function autumnPrint(){
  const canvas=document.createElement('canvas');canvas.width=480;canvas.height=344;
  const c=canvas.getContext('2d');c.fillStyle='#e6dbc2';c.fillRect(0,0,480,344);
  c.save();c.beginPath();c.rect(23,21,434,303);c.clip();
  c.fillStyle='#b6c1ae';c.fillRect(23,21,434,303);
  c.fillStyle='#ead7a8';c.beginPath();c.arc(344,92,49,0,Math.PI*2);c.fill();
  const hill=(color,x1,y1,x2,y2,x3,y3)=>{
    c.fillStyle=color;c.beginPath();c.moveTo(0,300);c.quadraticCurveTo(x1,y1,x2,y2);c.lineTo(x3,y3);c.lineTo(490,350);c.lineTo(0,350);c.fill();
  };
  hill('#8da59b',89,96,198,166,490,121);hill('#647e75',169,107,285,207,490,159);
  hill('#506f6e',80,166,230,238,490,219);
  c.fillStyle='#b7c3ad';c.beginPath();c.moveTo(138,245);c.bezierCurveTo(245,205,333,231,455,207);c.lineTo(455,242);c.bezierCurveTo(322,252,260,227,164,258);c.fill();
  c.strokeStyle='#554f3d';c.lineWidth=7;c.lineCap='round';c.beginPath();c.moveTo(-7,298);c.bezierCurveTo(69,247,95,189,175,156);c.moveTo(63,241);c.lineTo(68,164);c.moveTo(111,194);c.lineTo(116,144);c.stroke();
  for(const [x,y,a,s] of [[39,237,-.30,1],[66,192,-.77,.9],[73,168,-.55,.8],[97,206,.44,1.2],[122,167,.74,1],[144,163,-.55,.8],[168,150,.17,.86],[185,145,-.43,.7]]){
    c.save();c.translate(x,y);c.rotate(a);c.scale(s,s);c.fillStyle=x%2?'#b96950':'#cd8c56';
    c.beginPath();c.moveTo(0,8);c.lineTo(-15,-5);c.lineTo(-7,-5);c.lineTo(-12,-19);c.lineTo(-3,-11);c.lineTo(0,-28);c.lineTo(4,-12);c.lineTo(13,-19);c.lineTo(8,-6);c.lineTo(18,-7);c.closePath();c.fill();c.restore();
  }
  c.fillStyle='#ae634c';c.fillRect(404,269,23,27);c.strokeStyle='#ead7b5';c.lineWidth=2;c.strokeRect(409,274,12,15);c.restore();
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}

export function buildHomeShell(k){
  const {group,box,cyl,line,glow}=k,roof=[],walls=[];
  const stage=(name,time)=>group('Rain garden house · '+name,time);
  function roofGroup(name,time){const g=stage(name,time);roof.push(g);return g;}
  const num=(a,b,sill,head,style='clear')=>({a,b,sill,head,style});
  const clearMaterial=new THREE.MeshBasicMaterial({color:'#add4cf',transparent:true,opacity:.071,depthWrite:false,side:THREE.DoubleSide});
  function pane(g,x,y,z,w,h,material=clearMaterial,turn=0){
    const surface=new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);surface.position.set(x,y,z);surface.rotation.y=turn;surface.renderOrder=3;g.add(surface);return surface;
  }
  function darkTiles(g,u0,u1,y0,y1,depth=.079){
    const w=u1-u0,h=y1-y0;if(w<.028||h<.028)return;
    const tones=['#45515b','#54606a','#4c5963','#525e67','#495760','#58656c'];
    box(g,(u0+u1)/2,(y0+y1)/2,depth-.006,w,h,.025,'#323d47');
    const nr=Math.max(1,Math.round(h/.174)),rh=h/nr;
    for(let j=0;j<nr;j++){
      let x=u0,idx=0;
      while(x<u1-.002){const next=Math.min(u1,x+((j%2&&idx===0)?.235:.453));
        box(g,(x+next)/2,y0+rh*(j+.5),depth+.008,next-x-.009,rh-.009,.024,tones[(idx*13+j*7)%tones.length]);x=next;idx++;}
    }
  }
  function plaster(g,a,b,y0,y1,outer){
    const l=b-a,h=y1-y0;if(l<.003||h<.003)return;
    box(g,(a+b)/2,(y0+y1)/2,0,l,h,outer?.126:.098,outer?limestone:putty);
    if(y0<.52){
      box(g,(a+b)/2,y0+.052,-.062,l,.096,.032,'#b5aea2');
      if(outer)darkTiles(g,a,b,y0,Math.min(y1,.898));else box(g,(a+b)/2,y0+.052,.062,l,.096,.029,'#b5aea2');
    }
    if(outer&&l>.43&&h>.35){
      const rows=Math.max(1,Math.floor(h/.91)),cols=Math.max(1,Math.round(l/.98));
      for(let i=1;i<cols;i++)box(g,a+l*i/cols,(y0+y1)/2,.065,.009,h,.006,'#adb6b2');
      for(let j=1;j<rows;j++)box(g,(a+b)/2,y0+h*j/rows,.065,l,.009,.006,'#aab4b0');
      for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){
        const pin=cyl(g,a+l*(i+.18)/cols,y0+h*(j+.24)/rows,.070,.015,.015,.006,'#b0b5ae',{segments:8});pin.rotation.x=Math.PI/2;
      }
    }
  }
  function opening(g,o,outer){
    const {a,b,sill,head,style}=o,w=b-a,h=head-sill,u=(a+b)/2,y=(sill+head)/2;
    const frame=outer?ink:'#8b8274',v=outer?.146:.112;
    for(const pos of [a,b])box(g,pos,y,0,.054,h+.063,v,frame);
    box(g,u,head+.013,0,w+.085,.073,v,frame);
    if(style==='open')return;
    if(style==='door'||style==='slider'){
      box(g,u,sill+.012,0,w,.024,.141,aluminium);box(g,u,sill+.031,.033,w,.012,.014,'#a9b4ad');
      const leafWidth=style==='door'?.67:Math.min(.63,w*.32),px=b-leafWidth/2-.044;
      if(style==='door'){
        box(g,px,y,.055,leafWidth,h-.073,.085,'#4b5a5b');
        box(g,px+.12,y+.063,.107,.203,h-.49,.017,'#95aaa4',{emissive:'#c1b499',intensity:.13});
        box(g,px-.142,y-.071,.140,.028,.516,.048,'#c5b8a0');
        for(const yy of [y-.279,y+.151])box(g,px-.141,yy,.115,.037,.042,.065,ink);
      }else if(outer){
        pane(g,px,y,.027,leafWidth-.053,h-.14);for(const s of [-1,1]){box(g,px+s*leafWidth/2,y,.034,.035,h-.057,.070,ink);box(g,px,y+s*(h/2-.054),.032,leafWidth,.058,.077,ink);}
        box(g,px-.19,y-.04,.09,.031,.185,.046,bronze);
      }else{
        box(g,px,y,.031,leafWidth,h-.064,.061,'#c8bcaa');box(g,px,y+.34,.069,leafWidth-.106,.75,.018,'#d4ddd2');
        box(g,px+leafWidth*.30,y-.04,.073,.033,.122,.012,'#7e7e73');
      }
      return;
    }
    const projected=style==='bay',vp=projected?.204:.011;
    box(g,u,sill,projected?.129:.031,w+.097,.075,projected?.37:.186,outer?graphite:birch);
    if(projected){
      box(g,u,head,.138,w+.14,.091,.381,graphite);
      for(const pos of [a,b]){box(g,pos,y,.123,.051,h,.247,aluminium);box(g,pos,y,vp,.052,h,.068,ink);}
    }
    if(style==='frost'){
      box(g,u,y,.025,w-.057,h-.052,.032,'#a7bebb',{emissive:'#cac8b4',intensity:.19});
      const n=Math.floor(w/.075);for(let i=0;i<n;i++)box(g,a+.049+i*(w-.083)/n,y,.047,.009,h-.062,.010,'#c1cfbf');
    }else{
      pane(g,u,y,vp+.008,w-.047,h-.062);
      const n=w>2.67?3:w>1.18?2:1;
      for(let i=1;i<n;i++)box(g,a+w*i/n,y,vp,.039,h,.073,ink);
      box(g,u,head-.254,vp,w-.043,.026,.052,aluminium);
      if(style==='curtain'||projected){
        for(const side of [-1,1])for(let j=0;j<3;j++){
          const x=u+side*(w/2-.079-j*.047);box(g,x,y-.015,-.089-.018*(j%2),.057,h-.132-j*.023,.035,j%2?'#cec6b3':'#e1d8c4');
        }
      }
    }
  }
  function wall(name,a,b,outer,openings,start=1.35){
    const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz);
    const g=stage(name,start);g.position.set(a[0],0,a[1]);g.rotation.y=-Math.atan2(dz,dx);
    walls.push({object:g,a,b,outer,...(outer?{outward:[-dz/length,dx/length]}:{})});
    let p=0;for(const o of openings){plaster(g,p,o.a,floorY,wallTop,outer);plaster(g,o.a,o.b,floorY,o.sill,outer);plaster(g,o.a,o.b,o.head,wallTop,outer);opening(g,o,outer);p=o.b;}
    plaster(g,p,length,floorY,wallTop,outer);
    if(outer){box(g,length/2,2.99,.004,length,.095,.152,graphite);box(g,length/2,2.921,.068,length,.015,.026,'#a9b5ad');}
    return g;
  }

  const floor=stage('finished floors and terraces',.56);
  box(floor,-3,.201,12.20,12.044,.247,7.843,'#868d8d');
  layHomeFloor(k,floor);
  function paving(g,x0,x1,z0,z1,top,pitch,palette){
    const nx=Math.ceil((x1-x0)/pitch),nz=Math.ceil((z1-z0)/pitch),w=(x1-x0)/nx,h=(z1-z0)/nz;
    box(g,(x0+x1)/2,top-.051,(z0+z1)/2,x1-x0,.088,z1-z0,'#788286');
    for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)box(g,x0+(i+.5)*w,top-.009,z0+(j+.5)*h,w-.011,.018,h-.011,palette[(i*7+j*11)%palette.length]);
  }
  paving(floor,-1.1,3,8.3,10.09,.327,.56,['#9d998d','#aca698','#aaa596','#a09c90']);
  paving(floor,1,3,12.6,16.1,.41,.345,['#758482','#7f8d87','#7c8c84','#83918b','#728581']);
  box(floor,.95,.367,10.079,4.09,.084,.077,'#a98b6a');
  box(floor,.95,.399,10.042,4.09,.012,.016,'#dbbd90');
  box(floor,-5.25,.320,16.558,6.57,.14,.934,'#68645c');
  // Terrace boards stop outside the fitted bedroom floor.
  for(let i=0;i<37;i++)box(floor,-8.52+(i+.5)*6.54/37,.397,16.5625,6.54/37-.005,.034,.920,
    ['#a88668','#b19272','#ac8e71','#b39779','#a48466'][i%5]);
  box(floor,-5.25,.353,17.026,6.55,.076,.032,'#80674e');
  box(floor,-6.16,.236,17.14,1.32,.105,.247,'#a1a5a0');
  const porch=stage('stone entry landing',.68);
  box(porch,.97,.209,7.999,2.45,.147,.659,'#858e90');paving(porch,-.245,2.185,7.67,8.32,.314,.48,['#abb0ac','#b7b7ac','#a8ada8','#b0b4ad']);
  box(porch,.98,.192,7.60,1.59,.119,.196,'#9ba39e');

  const streetLiving=wall('living street wall',[-4.95,8.30],[-9,8.30],true,[num(.34,3.69,.79,2.66,'bay')]);
  const dining=wall('dining street wall',[-1.10,8.30],[-4.95,8.30],true,[num(.39,3.36,1.08,2.57)]);
  buildDiningPendant(k,dining);
  const entry=wall('entry street wall',[3,8.30],[-1.10,8.30],true,[num(.21,.76,1.02,2.43,'frost'),num(1.32,3.32,.327,2.54,'door')]);
  const livingGarden=wall('living garden wall',[-9,8.30],[-9,12.60],true,[num(.72,3.22,.96,2.55)]);
  const bedroomGarden=wall('bedroom garden side',[-9,12.60],[-9,16.1],true,[num(.63,2.91,1.31,2.60)]);
  const bed=wall('bedroom engawa wall',[-9,16.1],[-4.95,16.1],true,[num(.26,1.64,.82,2.67,'bay'),num(1.81,3.73,.41,2.6,'slider')]);
  const kitchen=wall('kitchen engawa wall',[-4.95,16.1],[-1.1,16.1],true,[num(.28,2.11,.41,2.6,'slider'),num(2.31,3.62,1.10,2.65,'bay')]);
  const study=wall('study rear wall',[-1.1,16.1],[1,16.1],true,[num(.13,1.94,.85,2.63,'bay')]);
  const badge=wall('bath rear wall',[1,16.1],[3,16.1],true,[num(.23,1.71,1.04,1.72,'frost')]);
  const bath=wall('bathroom side wall',[3,16.1],[3,12.60],true,[num(.79,2.66,1.40,2.54,'frost')]);
  const side=wall('entry side wall',[3,12.60],[3,8.30],true,[num(.52,2.93,.92,2.62,'bay')]);

  // Recessed mineral piers, folded steel canopies and a small glazed court on the garden side.
  function slimCanopy(g,u,w,depth,y){
    box(g,u,y,.04+depth/2,w,.083,depth,graphite);box(g,u,y+.045,.04+depth/2,w+.044,.018,depth+.043,aluminium);
    box(g,u,y-.053,depth*.79,w*.84,.022,.032,'#e5b48a',warm);
  }
  slimCanopy(study,1.05,2.08,.43,2.75);slimCanopy(entry,2.14,3.21,.84,2.715);
  slimCanopy(streetLiving,2.012,3.84,.38,2.762);slimCanopy(dining,1.93,3.52,.28,2.707);
  const cedar=['#bd9066','#ac8060','#c29970','#a97f5c'], timber='#a27b55',darkWood='#805e46';
  // Low-frequency warm bounce below paper lamps; no additional scene lights.
  // Fading to transparent leaves the grain and joints readable underneath.
  const spillCanvas=document.createElement('canvas');spillCanvas.width=spillCanvas.height=128;
  const sc=spillCanvas.getContext('2d'),falloff=sc.createRadialGradient(64,64,0,64,64,64);
  falloff.addColorStop(0,'rgba(255,248,223,1)');falloff.addColorStop(.31,'rgba(255,224,189,.68)');
  falloff.addColorStop(.72,'rgba(255,211,169,.18)');falloff.addColorStop(1,'rgba(255,208,168,0)');
  sc.fillStyle=falloff;sc.fillRect(0,0,128,128);
  const spillMap=new THREE.CanvasTexture(spillCanvas);spillMap.colorSpace=THREE.SRGBColorSpace;
  function lampSpill(g,x,y,z,w,h,strength,flat=false){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({
      color:'#efb27d',map:spillMap,transparent:true,opacity:strength,depthWrite:false,
      blending:THREE.AdditiveBlending,toneMapped:false
    }));
    m.position.set(x,y,z);if(flat)m.rotation.x=-Math.PI/2;m.renderOrder=4;g.add(m);
  }
  function verandaEave(g,start,end,postLocations){
    const center=(start+end)/2,length=end-start;
    // Each bay is tied to its own wall, including the posts and soffit lamp.
    box(g,center,2.688,.104,length,.103,.105,timber);
    box(g,center,2.651,.899,length,.119,.089,darkWood);
    const count=Math.ceil(length/.30);
    for(let i=0;i<=count;i++){
      const x=start+.036+i*(length-.072)/count;
      const rafter=box(g,x,2.719,.507,.042,.075,.903,cedar[i%4]);rafter.rotation.x=.065;
    }
    const cap=box(g,center,2.765,.516,length+.018,.029,.957,'#8b9792',{roughness:.85,metalness:.09});
    cap.rotation.x=.065;
    box(g,center,2.679,.975,length+.041,.086,.057,'#5f706e');
    box(g,center,2.724,.110,length*.82,.017,.023,'#ffe2b2',warm);
    for(const x of postLocations){
      box(g,x,1.537,.879,.091,2.228,.090,timber);
      box(g,x,.469,.879,.113,.092,.109,'#52615e');
      box(g,x,2.53,.879,.109,.157,.112,cedar[0]);
    }
  }
  verandaEave(bed,.51,4.05,[.57,3.986]);
  verandaEave(kitchen,0,2.92,[2.855]);
  // Narrow timber reveals and partially lowered roller shades let the glazed
  // bays read as separate occupied rooms without obscuring the view inside.
  function domesticBay(g,a,b,sill,head,blindLen){
    const width=b-a,u=(a+b)/2;
    for(const side of [a,b])box(g,side,(sill+head)/2,.203,.052,head-sill+.074,.065,cedar[0]);
    for(const y of [sill-.019,head+.016])box(g,u,y,.203,width+.084,.059,.099,timber);
    box(g,u,head-.073,-.105,width-.099,.045,.096,darkWood);
    const shadeX=a+width*.29;
    box(g,shadeX,head-.085-blindLen/2,-.121,width*.50,blindLen,.019,'#edd2a1',{emissive:'#eeb57e',intensity:.43});
    for(let j=0;j<Math.floor(blindLen/.053);j++)box(g,shadeX,head-.102-j*.053,-.106,width*.50,.008,.009,'#ae936d');
    box(g,shadeX,head-.082-blindLen,-.111,width*.51,.024,.033,timber);
  }
  domesticBay(bed,.26,1.64,.82,2.67,.49);
  domesticBay(kitchen,2.31,3.62,1.10,2.65,.535);
  domesticBay(side,.52,2.93,.92,2.62,.460);
  // Line the broad street bay as a timber window seat. The deep ledge and
  // shallow box header frame the room but leave the middle glazing transparent.
  for(const u of [.329,3.700])box(streetLiving,u,1.723,-.098,.083,1.978,.154,'#9c7959');
  box(streetLiving,2.014,.765,-.102,3.477,.075,.251,'#b28d67');
  box(streetLiving,2.014,2.676,-.088,3.478,.083,.211,'#a28260');
  box(streetLiving,2.014,2.622,-.123,2.69,.016,.023,'#ffdfb0',{emissive:'#ffca91',intensity:.41});
  box(streetLiving,2.010,.612,-.083,3.493,.211,.031,'#a88f74');
  for(let i=0;i<14;i++)box(streetLiving,.421+i*.242,.612,-.102,.011,.197,.011,'#90765d');
  // One paper lattice leaf and a gathered linen edge occupy the ends only.
  // The screen, low table and sofa stay visible through the central two bays.
  function gatheredLinen(parent,x,z,mirror){
    const pos=[],idx=[];
    for(let i=0;i<=12;i++){
      const f=i/12,xx=x+mirror*f*.246;
      const depth=z-.031*Math.cos(f*6*Math.PI),hem=1.037+.024*Math.cos(f*Math.PI*6);
      pos.push(xx,2.575,depth,x+mirror*(.013+f*.164),1.61,depth-.018,xx,hem,depth-.027);
      if(i<12)for(let j=0;j<2;j++){const q=i*3+j;idx.push(q,q+1,q+3,q+1,q+4,q+3);}
    }
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
    const drape=new THREE.Mesh(g,new THREE.MeshStandardMaterial({color:'#dbbb8e',emissive:'#dda773',emissiveIntensity:.14,roughness:.98,side:THREE.DoubleSide}));
    drape.receiveShadow=true;parent.add(drape);
    box(parent,x+mirror*.093,1.61,z-.044,.189,.031,.060,'#8e6954');
  }
  gatheredLinen(streetLiving,3.576,-.153,-1);
  function illuminatedShoji(g,x,y,w,h){
    // A single slid-aside paper section tucked into the window reveal; over
    // half the glazing remains clear for an unobstructed view of the room.
    box(g,x,y,-.078,w,h,.022,'#f5ddad',{emissive:'#f2ba81',intensity:.70});
    for(const s of [-1,1]){
      box(g,x+s*w/2,y,-.054,.024,h+.028,.034,'#a7835d');
      box(g,x,y+s*h/2,-.054,w+.046,.025,.037,'#a7835d');
    }
    box(g,x,y,-.057,.013,h,.015,'#b69673');
    for(const f of [-.26,0,.26])box(g,x,y+h*f,-.052,w,.014,.022,'#b1926c');
  }
  illuminatedShoji(bed,.665,1.655,.56,1.40);
  illuminatedShoji(kitchen,3.288,1.736,.52,1.08);
  illuminatedShoji(streetLiving,.732,1.696,.546,1.568);
  function paperSconce(g,x,y,z,normal=1){
    box(g,x,y,z,.234,.397,.053,darkWood);
    box(g,x,y,z+normal*.052,.178,.309,.063,'#ffdda6',{emissive:'#f4bc83',intensity:.82});
    for(const yy of [y-.176,y+.176])box(g,x,yy,z+normal*.067,.232,.032,.104,timber);
    for(const sx of [-1,1])box(g,x+sx*.095,y,z+normal*.084,.013,.34,.023,cedar[2]);
    glow(g,x,y,z+normal*.111,'#ffc891',.58,.13);
  }
  paperSconce(bed,1.719,1.829,.104);
  paperSconce(kitchen,2.208,1.704,.104);
  paperSconce(dining,.208,1.930,-.108,-1);
  // Flush timber wainscot along the dining room's street wall and its
  // concealed light shelf give the tea cabinet a domestic backdrop.
  box(dining,1.908,.741,-.072,3.684,.594,.036,'#b39370');
  for(let i=0;i<15;i++)box(dining,.197+i*.240,.741,-.096,.011,.565,.018,'#9c805e');
  box(dining,1.908,1.061,-.096,3.71,.054,.089,'#917350');
  box(dining,1.917,2.656,-.102,3.21,.059,.181,'#997854');
  box(dining,1.917,2.614,-.148,2.86,.017,.023,'#ffe4b8',{emissive:'#f5c28f',intensity:.50});
  lampSpill(bed,1.708,1.712,.086,.79,1.21,.22);
  lampSpill(kitchen,2.213,1.617,.086,.72,1.07,.18);
  lampSpill(bed,1.52,.417,.466,1.32,.83,.30,true);
  lampSpill(kitchen,2.26,.417,.496,1.13,.78,.23,true);
  // Cable rails keep sightlines to the sitting niche and its two entrances clear.
  function balcony(g,a,b){
    const d=.900;
    for(const u of [a,b]){box(g,u,.746,d,.050,.622,.051,timber);box(g,u,.458,d,.074,.062,.073,ink);}
    for(const y of [.629,.787,.947])box(g,(a+b)/2,y,d,b-a,.012,.014,'#83908c');
    box(g,(a+b)/2,1.062,d,b-a+.056,.059,.072,cedar[0]);
  }
  balcony(bed,.51,2.11);balcony(kitchen,.24,2.84);
  for(let j=0;j<7;j++)box(study,.20+j*.261,.658,.216,.031,.458,.052,'#7d898b');
  box(study,1.047,.428,.220,1.98,.088,.395,graphite);
  box(study,1.048,.826,.230,1.98,.020,.055,'#8ec2b3',mint);
  box(badge,.997,2.384,.097,1.956,1.101,.056,darkWood);
  for(let j=0;j<17;j++)box(badge,.085+j*.114,2.385,.141,.077,1.082,.051,cedar[j%4]);
  box(badge,.992,2.304,.195,1.917,.528,.076,'#756552');
  const nameMap=nameplate(),plate=new THREE.Mesh(new THREE.PlaneGeometry(1.84,.501),new THREE.MeshBasicMaterial({map:nameMap,toneMapped:false}));plate.position.set(.993,2.306,.236);badge.add(plate);
  box(badge,.99,2.623,.185,1.97,.046,.200,'#777b68');
  box(badge,.99,2.594,.258,1.77,.015,.026,'#f7d3a1',warm);
  glow(badge,1.00,2.51,.260,'#e7bc8b',.83,.13);
  const addressLamp=new THREE.PointLight(0xffc18f,3.7,3.7,2);
  addressLamp.position.set(1.55,2.19,.50);badge.add(addressLamp);
  darkTiles(bath,.037,.648,.43,2.933);
  for(let i=0;i<3;i++)box(bath,.343,1.995+i*.148,.108,.422,.061,.074,'#b4b6a8');
  k.label(bath,'01',.347,1.501,.118,.49,.37,{color:'#a4d8c8',font:'600 107px Arial'});
  line(bath,[[3.19,2.993,.179],[3.19,2.8,.179],[3.19,2.67,.111],[3.19,.439,.111],[3.19,.369,.191]],'#839094',.041);
  for(const y of [.65,1.40,2.25])box(bath,3.19,y,.108,.104,.031,.109,aluminium);
  // Private foyer with a parcel post slot, doorbell and digit plate.
  darkTiles(entry,3.45,4.03,.444,2.888);
  box(entry,3.75,1.409,.135,.43,.599,.089,graphite);box(entry,3.755,1.536,.187,.332,.127,.024,'#25454d');
  box(entry,3.67,1.546,.201,.083,.058,.011,'#96bcb5',{emissive:'#7fa8a5',intensity:.26});
  for(let j=0;j<4;j++)box(entry,3.763,1.288+j*.035,.184,.211,.012,.011,'#aab7b6');
  box(entry,3.75,2.14,.131,.408,.386,.057,'#2a3944');k.label(entry,'101',3.751,2.149,.166,.354,.192,{color:'#c7e9d9',font:'600 106px Arial'});
  box(entry,.987,1.241,.112,.486,.307,.107,'#788789');box(entry,.983,1.277,.169,.391,.046,.023,'#324349');
  box(entry,.984,1.175,.176,.162,.025,.01,'#c2c5b7');
  for(const u of [.97,3.75]){box(entry,u,2.65,.120,.25,.067,.114,'#809191');box(entry,u,2.611,.122,.17,.012,.070,'#f4c19a',warm);}
  // Solar-control fins touch the visible east bay only, preserving a broad opening onto the interior.
  box(side,3.584,1.661,.105,1.178,2.366,.043,darkWood);
  for(let j=0;j<9;j++){const fin=box(side,3.068+j*.129,1.68,.173,.057,2.315,.155,cedar[j%4]);fin.rotation.y=.16;}
  box(side,1.765,2.725,.219,2.70,.069,.526,graphite);box(side,1.765,2.684,.371,2.48,.016,.042,'#efc9a0',warm);
  box(side,1.714,.892,.28,2.70,.064,.556,cedar[1]);
  for(const x of [.66,2.72]){box(side,x,.749,.199,.064,.217,.103,graphite);box(side,x,.865,.299,.064,.042,.290,graphite);}
  // A collection of ceramic herb pots on the bay ledge.
  for(const [i,x] of [.77,1.07,2.38].entries()){
    const potColor=['#a26c54','#95a08c','#ba9979'][i];
    cyl(side,x,1.020,.36,.110,.081,.196,potColor,{segments:12});
    cyl(side,x,1.118,.36,.111,.113,.023,potColor,{segments:12});
    cyl(side,x,1.133,.36,.091,.091,.009,'#555448',{segments:12});
    for(let h=0;h<7;h++){
      const a=h*2.399,xL=x+.109*Math.cos(a),zL=.36+.085*Math.sin(a),yL=1.245+(h%3)*.053;
      line(side,[[x,1.129,.36],[xL,yL,zL]],'#6b7b60',.007);
      const leaf=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),k.mat(h%2?'#78927c':'#5b7d72'));
      leaf.position.set(xL,yL,zL);leaf.scale.set(.050,.080,.032);leaf.rotation.set(.38,a,.39);side.add(leaf);
    }
  }
  // Exactly the same navigable interior clearances as the previous plan.
  const entryScreen=wall('entry screen',[-1.10,8.30],[-1.10,11.45],false,[num(1.77,3.02,.41,2.54,'open')],1.57);
  const bedHead=wall('bedroom hall partition',[-9,12.60],[-4.95,12.60],false,[num(2.41,3.75,.41,2.48,'slider')],1.57);
  // A small print shelf and shaded reading light make the corridor a lived-in
  // side of the partition, with the bedroom alcove on the opposite face.
  paperSconce(bedHead,.257,1.859,-.093,-1);
  const hallPrints=[['#496b71','#b2c6ac','#e2b88e'],['#787e70','#d6c79d','#a76a59']];
  hallPrints.forEach(([bg,inkColor,sun],i)=>{
    const x=.780+i*.615;
    const cv=document.createElement('canvas');cv.width=192;cv.height=240;const c=cv.getContext('2d');
    c.fillStyle='#e7dfc8';c.fillRect(0,0,192,240);c.fillStyle=bg;c.fillRect(12,12,168,205);
    c.fillStyle=sun;c.beginPath();c.arc(i?133:76,i?81:68,i?22:27,0,Math.PI*2);c.fill();
    c.strokeStyle=inkColor;c.lineWidth=4;
    for(let j=0;j<9;j++){c.beginPath();const y=126+j*7;c.moveTo(12,y);c.quadraticCurveTo(65,y-(i?36:22),102,y+2);c.quadraticCurveTo(130,y+(i?18:9),180,y-4);c.stroke();}
    c.fillStyle='#9a5b4d';c.fillRect(151,223,18,7);
    const mt=new THREE.CanvasTexture(cv);mt.colorSpace=THREE.SRGBColorSpace;
    box(bedHead,x,1.844,-.083,.537,.641,.054,timber);
    const f=new THREE.Mesh(new THREE.PlaneGeometry(.488,.591),new THREE.MeshStandardMaterial({map:mt,roughness:.90}));
    f.position.set(x,1.844,-.115);f.rotation.y=Math.PI;bedHead.add(f);
  });
  box(bedHead,1.074,1.506,-.107,1.279,.033,.147,cedar[1]);
  wall('study hall partition',[-1.10,12.60],[1,12.60],false,[num(.17,1.90,.41,2.49,'open')],1.57);
  wall('bath hall partition',[1,12.60],[3,12.60],false,[num(.40,1.76,.41,2.46,'slider')],1.57);
  wall('bedroom kitchen partition',[-4.95,12.60],[-4.95,16.10],false,[],1.61);
  const studyWest=wall('study kitchen partition',[-1.10,12.60],[-1.10,16.10],false,[],1.61);
  dressStudyWalls(k,study,studyWest);
  wall('bath study partition',[1,12.60],[1,16.10],false,[],1.61);

  // The west windows face the cutaway camera. Each shoji is slid over one
  // bay only; the adjoining full-height sheet of glass stays open to the garden.
  function shoji(g,left,sill,head,width,railWidth){
    const x=left+width/2,h=head-sill,paperBase=sill+.287,paperHead=head-.049;
    box(g,left+railWidth/2,sill-.019,-.132,railWidth+.10,.063,.132,'#aa8a65');
    box(g,left+railWidth/2,head+.023,-.119,railWidth+.10,.074,.115,'#9d805f');
    box(g,x,(paperBase+paperHead)/2,-.119,width-.043,paperHead-paperBase,.021,'#f0dec0',{emissive:'#e0b583',intensity:.29});
    box(g,x,sill+.143,-.123,width-.038,.272,.035,'#ae825d');
    for(const y of [sill+.045,sill+.285,head-.021])box(g,x,y,-.149,width,.047,.063,'#977452');
    for(const xx of [left+.024,left+width-.024])box(g,xx,(sill+head)/2,-.148,.047,h,.067,'#997653');
    for(const s of [.33,.67])box(g,left+width*s,(paperBase+paperHead)/2,-.154,.025,paperHead-paperBase,.038,'#b38f68');
    for(const s of [.33,.67])box(g,x,paperBase+(paperHead-paperBase)*s,-.156,width-.068,.028,.039,'#b38f68');
  }
  shoji(livingGarden,.735,.972,2.536,1.075,2.467);
  shoji(bedroomGarden,.653,1.317,2.584,1.065,2.244);

  // The alcove faces the bed, entirely on the bedroom side of its wall.
  box(bedHead,1.238,1.824,.061,2.26,2.19,.023,'#d5bca1');
  box(bedHead,1.238,.944,.084,2.26,.59,.035,'#b48c69');
  for(let i=0;i<9;i++)box(bedHead,.165+i*.265,.944,.106,.016,.57,.014,'#9c7e61');
  box(bedHead,1.238,1.257,.093,2.30,.064,.066,'#ab8868');
  box(bedHead,1.115,2.05,.097,1.145,.854,.065,'#80674f');
  box(bedHead,1.115,2.05,.134,1.081,.792,.017,'#e8dfc8');
  const art=new THREE.Mesh(new THREE.PlaneGeometry(.993,.709),new THREE.MeshStandardMaterial({map:autumnPrint(),roughness:.96,metalness:0}));
  art.position.set(1.115,2.05,.148);bedHead.add(art);

  // A short indigo noren dresses the opening from the genkan to the dining
  // room. The two leaves are drawn aside with a full-height centre opening.
  for(const x of [1.66,3.10])box(entryScreen,x,2.718,-.102,.061,.073,.125,'#997d61');
  const rod=cyl(entryScreen,2.38,2.715,-.161,.019,.019,1.55,'#987855',{segments:8});rod.rotation.z=Math.PI/2;
  function norenHalf(start,width,mirror){
    const pos=[],uv=[],ind=[],bottom=mirror?2.181:2.154,top=2.682;
    for(let i=0;i<=8;i++){
      const t=i/8,x=start+t*width,z=-.163-.025*Math.sin(t*4*Math.PI);
      const y=bottom+.019*Math.cos(t*2*Math.PI)+(mirror?.017*t:.017*(1-t));
      pos.push(x,y,z,x,top,z+.007);uv.push(t,0,t,1);
      if(i<8){const j=i*2;ind.push(j,j+2,j+1,j+1,j+2,j+3);}
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ind);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,new THREE.MeshStandardMaterial({color:mirror?'#466d77':'#4b717b',roughness:.96,side:THREE.DoubleSide}));
    mesh.receiveShadow=true;entryScreen.add(mesh);
    for(const t of [.14,.86])box(entryScreen,start+width*t,2.689,-.162,.047,.068,.029,'#536f75');
  }
  norenHalf(1.641,.409,false);norenHalf(2.757,.355,true);

  // A roof garden occupies the western half of the roof. The lower gallery has an
  // offset clerestory, capped in pale zinc; the taller volume sits behind the east service bay.
  const deck=roofGroup('parapet and terrace slabs',2.71);
  const x0=-9.155,x1=3.155,z0=8.135,z1=16.30;
  box(deck,-3,3.080,12.218,12.36,.157,8.219,ink);
  box(deck,-3,3.158,12.218,12.24,.126,8.12,'#c0c6c0');
  paving(deck,x0+.073,x1-.073,z0+.073,z1-.073,3.236,.805,['#697980','#727f84','#68777e','#778288','#63727a']);
  for(const z of [z0,z1]){
    box(deck,-3,3.281,z,x1-x0+.066,.288,.108,graphite);box(deck,-3,3.441,z,x1-x0+.10,.050,.158,'#9ba6a2');
    box(deck,-3,3.101,z+(z>12?.070:-.070),x1-x0+.04,.023,.028,'#d1d1bd');
  }
  for(const x of [x0,x1]){box(deck,x,3.284,12.217,.105,.292,z1-z0,graphite);box(deck,x,3.442,12.217,.16,.047,z1-z0+.088,'#9ba6a2');}
  // Warm, shaded soffits mark the residential frontage while rear service
  // flashing stays zinc. The short entries remain individually articulated.
  box(deck,-3.74,3.105,z1+.090,9.76,.054,.039,'#9d8066');
  for(const [x,w] of [[-6.7,2.14],[-3.29,1.79],[1.91,1.30]])box(deck,x,3.074,z1+.078,w,.012,.026,'#eac49c',warm);
  for(const x of [-7.4,-3.85,-.76]){
    box(deck,x,3.029,16.167,.70,.027,.12,'#f8e3b7',warm);
  }
  const pavilion=roofGroup('clerestory and service roof',2.88);
  const pX=-2.30,pZ=10.91,pW=6.74,pD=3.72;
  box(pavilion,pX,3.481,pZ,pW,.50,pD,'#8f9d9c');
  // Tinted ribbed glass catches a muted, real-looking warm light at the roof step.
  for(const sign of [-1,1]){
    const z=pZ+sign*(pD/2+.012);
    for(let i=0;i<11;i++){
      const ww=(pW-.14)/11,x=pX-pW/2+.072+(i+.5)*ww;
      const col=['#abaaa0','#baa996','#9eafa8','#b8b8a6'][i%4];
      box(pavilion,x,3.50,z,ww-.036,.308,.035,col,{emissive:'#cda982',intensity:i%4===0?.42:.26});
      box(pavilion,x+ww/2-.01,3.50,z+sign*.025,.026,.356,.044,ink);
    }
    box(pavilion,pX,3.303,z,pW+.09,.096,.097,ink);
  }
  box(pavilion,pX,3.778,pZ,pW+.21,.17,pD+.20,'#d4d6ca');
  box(pavilion,pX,3.878,pZ,pW+.28,.067,pD+.253,graphite);
  paving(pavilion,pX-pW/2+.028,pX+pW/2-.028,pZ-pD/2+.028,pZ+pD/2-.028,3.923,.817,['#858e91','#7c898d','#889293','#818c90']);
  // Two low scooped rooflights have blue-green glazing, aluminium flashing and raised mullions.
  for(const x of [-3.64,-1.35]){
    const lantern=new THREE.Group();lantern.position.set(x,3.987,pZ+.055);pavilion.add(lantern);
    box(lantern,0,.023,0,1.69,.121,1.43,'#697a80');
    const angled=new THREE.Group();angled.position.y=.108;angled.rotation.x=-.112;lantern.add(angled);
    box(angled,0,.021,0,1.52,.064,1.30,'#718d96',{roughness:.19,metalness:.34});
    for(const j of [-1,0,1])box(angled,j*.741,.060,0,.033,.055,1.35,'#aeb9b7');
    for(const dz of [-.649,.649])box(angled,0,.057,dz,1.55,.051,.035,'#acb7b4');
  }
  const hangar=roofGroup('roof service plant',3.11);
  // Roof service door gives a human scale beside switchgear and refrigeration plant.
  box(hangar,1.78,3.711,10.474,1.83,.946,2.30,'#a1aaa7');
  box(hangar,1.78,4.218,10.467,1.99,.112,2.44,graphite);
  box(hangar,1.78,4.287,10.467,1.96,.040,2.39,'#9aa6a0');
  box(hangar,1.59,3.689,11.637,.751,.831,.038,'#58696a');box(hangar,1.59,3.720,11.663,.65,.703,.032,'#829293');
  box(hangar,1.809,3.673,11.687,.113,.028,.04,ink);box(hangar,1.59,4.043,11.685,.352,.032,.045,'#d3be98',warm);
  for(let j=0;j<6;j++)box(hangar,2.716,3.547+j*.08,10.458,.052,.029,.937,'#5d7178');
  function ac(x,z){
    for(const dx of [-.57,.57])box(hangar,x+dx,3.323,z,.144,.151,1.10,'#596972');
    box(hangar,x,3.593,z,1.615,.474,1.034,'#84938f');box(hangar,x,3.851,z,1.669,.053,1.082,'#9ba6a0');
    for(let j=0;j<6;j++)box(hangar,x,3.426+j*.059,z+.529,1.42,.027,.029,'#708187');
    for(const dx of [-.39,.39]){
      cyl(hangar,x+dx,3.888,z,.333,.333,.052,'#7e9296',{segments:24});cyl(hangar,x+dx,3.919,z,.289,.289,.02,'#485c66',{segments:24});
      for(let j=0;j<5;j++){const a=j*2*Math.PI/5;const b=box(hangar,x+dx+Math.sin(a)*.116,3.935,z+Math.cos(a)*.116,.098,.014,.207,'#839295');b.rotation.y=a+.55;}
      for(let j=-3;j<=3;j++){const d=j*.078;box(hangar,x+dx+d,3.951,z,.013,.013,2*Math.sqrt(.279*.279-d*d),'#acb8b5');}
      cyl(hangar,x+dx,3.966,z,.055,.055,.017,'#b1bab3');
    }
  }
  ac(1.563,13.31);box(hangar,.001,3.359,13.31,1.63,.201,.288,'#8f9fa0');
  box(hangar,-.757,3.36,12.97,.281,.202,.876,'#8d9d9d');
  for(const x of [-.56,.06,.66])box(hangar,x,3.369,13.31,.062,.224,.311,'#b5bcb2');
  box(hangar,1.57,3.344,15.22,1.50,.19,.74,'#879898');
  for(let j=0;j<10;j++)box(hangar,.96+j*.136,3.452,15.22,.045,.042,.634,graphite);

  const terrace=roofGroup('urban roof garden',3.22);
  // A cedar-roof terrace tucked into the west side of the clerestory. A
  // partially drawn linen canvas reveals the table, cushions and shadows.
  const lounge={left:-8.84,right:-3.42,back:12.96,front:15.972};
  box(terrace,-6.13,3.249,14.466,5.425,.047,3.018,'#65594e');
  for(let row=0;row<17;row++){
    const z=lounge.back+(row+.5)*(lounge.front-lounge.back)/17,seam=[-5.88,-7.02,-4.99][row%3];
    for(const [xa,xb] of [[lounge.left,seam],[seam,lounge.right]])box(terrace,(xa+xb)/2,3.27,z,xb-xa-.010,.027,.167,
      ['#a88b71','#b19275','#a5866d','#b49779'][row%4]);
  }
  for(let i=0;i<3;i++)box(terrace,-8.687,3.850,13.085+i*1.343,.061,1.17,.062,ink);
  for(let j=0;j<8;j++)box(terrace,-8.675,3.386+j*.136,14.429,.081,.073,2.83,cedar[j%4]);
  for(let i=0;i<2;i++)box(terrace,-8.654+i*.874,3.847,13.045,.064,1.16,.062,ink);
  for(let j=0;j<8;j++)box(terrace,-8.22,3.386+j*.136,13.052,.924,.073,.082,cedar[j%4]);
  const px0=-8.61,px1=-5.31,pz0=13.08,pz1=15.58;
  for(const x of [px0,px1])for(const z of [pz0,pz1]){
    box(terrace,x,4.070,z,.087,1.604,.087,timber);
    box(terrace,x,3.332,z,.107,.094,.107,ink);
    box(terrace,x,4.725,z,.103,.103,.103,darkWood);
  }
  for(const x of [px0,px1])box(terrace,x,4.849,14.33,.098,.121,2.68,cedar[1]);
  for(let i=0;i<7;i++){
    const z=pz0+i*(pz1-pz0)/6;
    box(terrace,-6.96,4.923,z,3.50,.079,.060,cedar[i%4]);
  }
  const linenCanvas=document.createElement('canvas');linenCanvas.width=128;linenCanvas.height=160;
  const lc=linenCanvas.getContext('2d');lc.fillStyle='#d9c5a6';lc.fillRect(0,0,128,160);
  for(let j=0;j<160;j+=40){lc.fillStyle='#9a827a';lc.fillRect(0,j+5,128,3);lc.fillStyle='#b59179';lc.fillRect(0,j+10,128,2);}
  for(let j=0;j<128;j+=3){lc.fillStyle='rgba(249,240,210,.12)';lc.fillRect(j,0,1,160);}
  const linen=new THREE.CanvasTexture(linenCanvas);linen.colorSpace=THREE.SRGBColorSpace;
  const vertices=[],uv=[],indices=[];
  for(let j=0;j<=30;j++){
    const f=j/30,z=pz0+f*(pz1-pz0)*.67,height=4.972-.079*Math.abs(Math.sin(Math.PI*4*f));
    vertices.push(px0+.034,height,z,px1-.034,height,z);uv.push(0,f,1,f);
    if(j<30){const a=2*j;indices.push(a,a+2,a+1,a+1,a+2,a+3);}
  }
  const cover=new THREE.BufferGeometry();cover.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  cover.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));cover.setIndex(indices);cover.computeVertexNormals();
  const awning=new THREE.Mesh(cover,new THREE.MeshStandardMaterial({map:linen,side:THREE.DoubleSide,roughness:.89}));
  awning.name='Retractable woven shade';awning.castShadow=awning.receiveShadow=true;terrace.add(awning);
  function chair(x,z,angle){
    const g=new THREE.Group();g.position.set(x,3.282,z);g.rotation.y=angle;terrace.add(g);
    for(const xx of [-.292,.292]){
      line(g,[[xx,.065,.316],[xx,.382,.234],[xx,.382,-.268],[xx,.068,-.391]],graphite,.026);
      line(g,[[xx,.409,.226],[xx,.501,.217],[xx,.501,-.205],[xx,.412,-.20]],aluminium,.019);
    }
    box(g,0,.357,0,.614,.093,.635,angle>0?'#728d85':'#a8816f'); const back=box(g,0,.579,-.272,.620,.438,.090,angle>0?'#819f8e':'#bc9580');back.rotation.x=-.182;
    for(let i=0;i<3;i++)box(g,-.178+i*.178,.409,0,.009,.005,.557,angle>0?'#a9bc9f':'#d2b293');
  }
  chair(-7.63,13.94,.263);chair(-6.35,14.11,-.395);
  cyl(terrace,-7.012,3.602,14.861,.389,.380,.051,'#b48766',{segments:28});
  cyl(terrace,-7.012,3.435,14.861,.034,.041,.306,'#798482');cyl(terrace,-7.012,3.291,14.861,.167,.180,.027,'#596a68');
  box(terrace,-7.016,3.636,14.86,.47,.013,.294,'#6e5147');
  cyl(terrace,-7.095,3.707,14.82,.075,.07,.134,'#57776d',{segments:16});
  cyl(terrace,-7.095,3.786,14.82,.052,.074,.032,'#7a9480',{segments:16});
  line(terrace,[[-7.143,3.707,14.82],[-7.208,3.744,14.82]],'#698779',.021);
  for(const [x,z] of [[-6.94,14.79],[-6.94,14.93]]){
    cyl(terrace,x,3.673,z,.045,.033,.060,'#e2dabc',{segments:14});
    cyl(terrace,x,3.705,z,.038,.038,.005,'#899567',{segments:14});
  }
  // A broad washi lantern hangs from the exposed outer rafter. Its light
  // reaches the tea tray and the near deck instead of grazing the front fascia.
  const lx=-7.15,lz=15.163,ly=4.434;
  cyl(terrace,lx,4.766,lz,.009,.009,.244,'#645d4e',{segments:8});
  const terraceWash=new THREE.PointLight(0xffbf89,9.6,5.3,2);
  terraceWash.position.set(lx-.05,4.27,lz-.263);terrace.add(terraceWash);
  const lanternProfile=[[.065,-.202],[.190,-.186],[.281,-.120],[.315,-.037],[.312,.047],[.270,.128],[.175,.188],[.066,.204]];
  const lanternShape=new THREE.LatheGeometry(lanternProfile.map(([r,y])=>new THREE.Vector2(r,y)),28);
  const paper=new THREE.Mesh(lanternShape,k.mat('#ffe5af',{emissive:'#ffc27b',intensity:.90,roughness:.98}));
  paper.name='Roof tea lantern';paper.position.set(lx,ly,lz);terrace.add(paper);
  for(const [r,y] of [[.19,-.186],[.315,-.037],[.270,.128]]){
    const hoop=new THREE.Mesh(new THREE.TorusGeometry(r,.0065,5,28),k.mat('#b58859'));
    hoop.rotation.x=Math.PI/2;hoop.position.set(lx,ly+y,lz);terrace.add(hoop);
  }
  cyl(terrace,lx,4.650,lz,.067,.074,.024,'#886b4e',{segments:16});
  cyl(terrace,lx,4.226,lz,.071,.061,.017,'#82694f',{segments:16});
  glow(terrace,lx,ly,lz,'#ffb974',1.17,.22);
  lampSpill(terrace,-7.15,3.287,14.98,2.49,1.87,.30,true);
  lampSpill(terrace,-7.012,3.630,14.861,.75,.71,.19,true);
  const foliage=new THREE.IcosahedronGeometry(1,0);
  function shrub(x,z,w,shape,idx){
    box(terrace,x,3.432,z,w,.332,.403,shape);box(terrace,x,3.610,z,w+.037,.044,.434,aluminium);
    box(terrace,x,3.638,z,w-.084,.024,.351,'#4b5148');
    const count=Math.ceil(w/.203),pal=['#738b79','#536f68','#92a387','#718b83','#a29571'];
    for(let i=0;i<count;i++)for(let j=0;j<3;j++){
      const q=i*3+j+idx,xx=x-w/2+.115+i*(w-.20)/Math.max(1,count-1),zz=z+(j-1)*.097;
      const m=new THREE.Mesh(foliage,k.mat(pal[(q*13)%pal.length]));m.scale.set(.13+.016*(q%4),.13+.034*(q%5),.114+.013*(q%3));m.position.set(xx+.024*Math.sin(q*4.3),3.735+(q%3)*.045,zz);m.rotation.y=q*1.23;m.castShadow=true;terrace.add(m);
    }
  }
  shrub(-5.36,15.689,2.39,graphite,2);shrub(-8.34,15.597,.61,graphite,1);
  box(terrace,-4.15,3.716,15.67,.051,.912,.053,ink);box(terrace,-4.15,4.151,15.67,.139,.103,.122,slate);
  box(terrace,-4.15,4.131,15.745,.083,.054,.037,'#e3ac89',warm);
  // Door, bedroom, bath, hall and both balcony exits retain open pedestrian spans.
  return {roof,walls};
}
