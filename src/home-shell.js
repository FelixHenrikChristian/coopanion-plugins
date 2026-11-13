import * as THREE from 'three';

const floorY=.41, wallTop=3.03;
const limestone='#d7d9d1', putty='#e2ddd3', bronze='#948774', aluminium='#818d91';
const ink='#34414a', graphite='#546169', slate='#46535d', birch='#bb9f80';
const warm={emissive:'#ffbe86',intensity:.89};
const mint={emissive:'#68cabb',intensity:.74};
const coral={emissive:'#f18579',intensity:.82};

function nameplate(){
  const cv=document.createElement('canvas');cv.width=1024;cv.height=280;
  const c=cv.getContext('2d');c.fillStyle='#263942';c.fillRect(0,0,1024,280);
  c.fillStyle='#7ed0bd';c.fillRect(32,32,8,216);
  // Three diagonal rain strokes and two offset courtyard outlines form the residence mark.
  c.lineCap='round';c.lineWidth=7;c.strokeStyle='#87cdbb';
  for(const [x,y] of [[78,101],[103,75],[123,100]]){c.beginPath();c.moveTo(x+9,y-12);c.lineTo(x-2,y+5);c.stroke();}
  c.strokeStyle='#d3d0b6';c.lineWidth=7;c.beginPath();c.moveTo(66,134);c.lineTo(66,163);c.lineTo(145,163);c.lineTo(145,115);c.lineTo(117,115);c.stroke();
  c.fillStyle='#e7e4cd';c.textBaseline='middle';c.font='600 91px "Yu Gothic", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Microsoft YaHei", sans-serif';c.fillText('雨庭レジデンス',190,112,779);
  c.font='500 32px Arial, sans-serif';c.fillStyle='#acbeb9';c.fillText('A M A N I W A    R E S I D E N C E',198,205);
  c.fillStyle='#e79682';c.fillRect(878,194,64,5);
  const map=new THREE.CanvasTexture(cv);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;return map;
}

export function buildHomeShell(k){
  const {group,box,cyl,line,glow}=k,roof=[],walls=[];
  const stage=(name,time)=>group('Rain garden house · '+name,time);
  function roofGroup(name,time){const g=stage(name,time);roof.push(g);return g;}
  const num=(a,b,sill,head,style='clear')=>({a,b,sill,head,style});
  const clearMaterial=new THREE.MeshBasicMaterial({color:'#add4cf',transparent:true,opacity:.071,depthWrite:false,side:THREE.DoubleSide});
  const smokedMaterial=new THREE.MeshStandardMaterial({color:'#79b4b4',transparent:true,opacity:.28,roughness:.39,metalness:.09,side:THREE.DoubleSide,depthWrite:false});
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
  function oakFloor(x0,x1,z0,z1,bedroom=false){
    const tones=bedroom?['#ac9684','#b99f88','#b19a86','#bda58e','#b09a85']:['#c7b093','#c4af95','#d0b99a','#c8ad91','#c1aa90'];
    const n=Math.ceil((z1-z0)/.236),pitch=(z1-z0)/n;
    box(floor,(x0+x1)/2,.36,(z0+z1)/2,x1-x0,.087,z1-z0,'#a4947e');
    for(let j=0;j<n;j++){
      let pos=x0,i=0;while(pos<x1-.001){const nx=Math.min(x1,pos+(i===0?.63+.17*((j*11)%10):2.12+.08*((i+j)%5)));
        box(floor,(pos+nx)/2,.406,z0+(j+.5)*pitch,Math.max(.001,nx-pos-.007),.008,pitch-.009,tones[(i+j*3)%tones.length]);pos=nx;i++;}
    }
  }
  function paving(g,x0,x1,z0,z1,top,pitch,palette){
    const nx=Math.ceil((x1-x0)/pitch),nz=Math.ceil((z1-z0)/pitch),w=(x1-x0)/nx,h=(z1-z0)/nz;
    box(g,(x0+x1)/2,top-.051,(z0+z1)/2,x1-x0,.088,z1-z0,'#788286');
    for(let i=0;i<nx;i++)for(let j=0;j<nz;j++)box(g,x0+(i+.5)*w,top-.009,z0+(j+.5)*h,w-.011,.018,h-.011,palette[(i*7+j*11)%palette.length]);
  }
  oakFloor(-9,-1.10,8.30,12.60);oakFloor(-1.10,3,10.09,12.6);oakFloor(-4.95,1.0,12.60,16.10);oakFloor(-9,-4.95,12.6,16.1,true);
  paving(floor,-1.1,3,8.3,10.09,.327,.56,['#929797','#a1a29d','#999d98','#979d9d']);
  paving(floor,1,3,12.6,16.1,.41,.345,['#5b6d70','#58676d','#637071','#697574','#53646a']);
  box(floor,.95,.367,10.079,4.09,.084,.077,'#b8a28a');
  box(floor,-5.25,.320,16.558,6.57,.14,.934,ink);
  paving(floor,-8.52,-1.98,16.09,17.025,.414,.5,['#989c99','#a0a29e','#929b9b','#a6a69f']);
  box(floor,-6.16,.236,17.14,1.32,.105,.247,'#a1a5a0');
  const porch=stage('stone entry landing',.68);
  box(porch,.97,.209,7.999,2.45,.147,.659,'#858e90');paving(porch,-.245,2.185,7.67,8.32,.314,.48,['#abb0ac','#b7b7ac','#a8ada8','#b0b4ad']);
  box(porch,.98,.192,7.60,1.59,.119,.196,'#9ba39e');

  const streetLiving=wall('living street wall',[-4.95,8.30],[-9,8.30],true,[num(.34,3.69,.79,2.66,'bay')]);
  const dining=wall('dining street wall',[-1.10,8.30],[-4.95,8.30],true,[num(.39,3.36,1.08,2.57)]);
  const entry=wall('entry street wall',[3,8.30],[-1.10,8.30],true,[num(.21,.76,1.02,2.43,'frost'),num(1.32,3.32,.327,2.54,'door')]);
  wall('living garden wall',[-9,8.30],[-9,12.60],true,[num(.72,3.22,.96,2.55,'curtain')]);
  wall('bedroom garden side',[-9,12.60],[-9,16.1],true,[num(.63,2.91,1.31,2.60,'curtain')]);
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
  slimCanopy(bed,2.08,3.93,.67,2.76);slimCanopy(kitchen,1.91,3.73,.67,2.76);
  slimCanopy(study,1.05,2.08,.43,2.75);slimCanopy(entry,2.14,3.21,.84,2.715);
  slimCanopy(streetLiving,2.012,3.84,.38,2.762);slimCanopy(dining,1.93,3.52,.28,2.707);
  // Openings between the two independent balcony guard sections allow access from the path.
  function balcony(g,a,b){
    const h=.61,y=.785,d=.902;
    for(const u of [a,(a+b)/2,b]){box(g,u,y,d,.041,h+.056,.051,aluminium);box(g,u,.477,d,.082,.075,.088,ink);}
    pane(g,(a+b)/2,y-.012,d,b-a-.04,h-.079,smokedMaterial);
    box(g,(a+b)/2,y+h/2,d,b-a+.05,.043,.066,graphite);
  }
  balcony(bed,.51,2.11);balcony(kitchen,.24,2.84);
  for(let j=0;j<7;j++)box(study,.20+j*.261,.658,.216,.031,.458,.052,'#7d898b');
  box(study,1.047,.428,.220,1.98,.088,.395,graphite);
  box(study,1.048,.826,.230,1.98,.020,.055,'#8ec2b3',mint);
  darkTiles(badge,.026,1.972,1.85,2.937,.093);
  box(badge,.992,2.304,.165,1.917,.528,.084,ink);
  const nameMap=nameplate(),plate=new THREE.Mesh(new THREE.PlaneGeometry(1.84,.501),new THREE.MeshBasicMaterial({map:nameMap,toneMapped:false}));plate.position.set(.993,2.306,.212);badge.add(plate);
  box(badge,.99,2.62,.155,1.93,.047,.138,aluminium);
  box(badge,1.946,2.373,.147,.055,.961,.055,'#ffb3a7',{emissive:'#ff887f',intensity:2.15});
  glow(badge,1.948,2.37,.255,'#f18b81',1.20,.26);
  const addressLamp=new THREE.PointLight(0xff858b,3.7,3.7,2);
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
  for(let j=0;j<5;j++){const fin=box(side,3.12+j*.193,1.68,.167,.046,2.315,.213,aluminium);fin.rotation.y=.20;}
  box(side,1.765,2.725,.219,2.70,.069,.526,graphite);box(side,1.765,2.684,.371,2.48,.016,.042,'#efc9a0',warm);
  // Exactly the same navigable interior clearances as the previous plan.
  wall('entry screen',[-1.10,8.30],[-1.10,11.45],false,[num(1.77,3.02,.41,2.54,'open')],1.57);
  wall('bedroom hall partition',[-9,12.60],[-4.95,12.60],false,[num(2.41,3.75,.41,2.48,'slider')],1.57);
  wall('study hall partition',[-1.10,12.60],[1,12.60],false,[num(.17,1.90,.41,2.49,'open')],1.57);
  wall('bath hall partition',[1,12.60],[3,12.60],false,[num(.40,1.76,.41,2.46,'slider')],1.57);
  wall('bedroom kitchen partition',[-4.95,12.60],[-4.95,16.10],false,[],1.61);
  wall('study kitchen partition',[-1.10,12.60],[-1.10,16.10],false,[],1.61);
  wall('bath study partition',[1,12.60],[1,16.10],false,[],1.61);

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
  box(deck,-3.74,3.105,z1+.090,9.76,.046,.039,'#9ceadb',{emissive:'#67dccd',intensity:1.85});
  box(deck,1.91,3.105,z1+.090,1.33,.044,.039,'#ffb9a4',{emissive:'#f3948c',intensity:1.45});
  for(const x of [-7.4,-3.85,-.76]){
    box(deck,x,3.029,16.167,.70,.027,.12,'#f8e3b7',warm);
  }
  const terraceWash=new THREE.PointLight(0xffceaa,5.3,4.0,2);
  terraceWash.position.set(-5.8,2.90,16.67);deck.add(terraceWash);
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
    box(hangar,x,3.593,z,1.615,.474,1.034,'#a9b2b0');box(hangar,x,3.851,z,1.669,.053,1.082,'#c2c7be');
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
  // Pavers change direction at the floor boundary. A low steel privacy screen shades the lounge.
  paving(terrace,-8.87,-3.41,12.94,15.986,3.265,.664,['#b1aca1','#b7b4a7','#a9aaa2','#b3b0a4']);
  for(let i=0;i<3;i++)box(terrace,-8.687,3.850,13.085+i*1.343,.061,1.17,.062,ink);
  for(let j=0;j<8;j++)box(terrace,-8.675,3.386+j*.136,14.429,.081,.073,2.83,['#818c8a','#8d9792','#858e89'][j%3]);
  for(let i=0;i<2;i++)box(terrace,-8.654+i*.874,3.847,13.045,.064,1.16,.062,ink);
  for(let j=0;j<8;j++)box(terrace,-8.22,3.386+j*.136,13.052,.924,.073,.082,aluminium);
  function chair(x,z,angle){
    const g=new THREE.Group();g.position.set(x,3.265,z);g.rotation.y=angle;terrace.add(g);
    for(const xx of [-.292,.292]){
      line(g,[[xx,.065,.316],[xx,.382,.234],[xx,.382,-.268],[xx,.068,-.391]],graphite,.026);
      line(g,[[xx,.409,.226],[xx,.501,.217],[xx,.501,-.205],[xx,.412,-.20]],aluminium,.019);
    }
    box(g,0,.357,0,.614,.093,.635,'#9b9d8b'); const back=box(g,0,.579,-.272,.620,.438,.090,'#9aa797');back.rotation.x=-.182;
    for(let i=0;i<4;i++)box(g,-.216+i*.145,.409,0,.081,.015,.557,'#aeb5a2');
  }
  chair(-7.63,13.94,.263);chair(-6.35,14.11,-.395);
  cyl(terrace,-7.012,3.588,14.861,.318,.305,.045,'#b6b4a1',{segments:24});
  cyl(terrace,-7.012,3.414,14.861,.034,.041,.304,'#798482');cyl(terrace,-7.012,3.279,14.861,.167,.180,.028,'#7f8a88');
  cyl(terrace,-7.026,3.655,14.84,.051,.047,.091,'#ccad91');
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
