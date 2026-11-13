import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

// Furniture uses room-local assemblies and a walk-up point on the adjacent
// floor. Actor anchors sit on the actual mattress, chair or cushion as needed.
export function buildHomeFurniture(k, register) {
  const F=.41, oak='#b28f70', maple='#cdb397', ash='#808c89', walnut='#50535a';
  const cream='#f6ecdf', ceramic='#e3e8de', brass='#ba9b64', charcoal='#29323f', chrome='#a3b1b4';
  const steel='#3c4852', teal='#317579', coral='#ea795f';
  const rooms=new Map(), cache=new Map(), textures=new Map();
  const add=(parent,geometry,material,x,y,z)=>{
    const m=new THREE.Mesh(geometry,material);
    m.position.set(x,y,z);m.receiveShadow=true;m.castShadow=true;parent.add(m);return m;
  };
  function furniture(room,id,label,x,z,access,actions,template,anchor=[0,.42,0],angle=0,y=F){
    if(!rooms.has(room)) rooms.set(room,k.group('Home furniture · '+room,2.24+rooms.size*.075));
    const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=angle;g.name=room+'.'+id;
    g.userData.preserveBatch=true;
    if(template){const [room,spot]=template.split('/');g.userData.templateSpot={room,spot};}
    rooms.get(room).add(g);g.updateWorldMatrix(true,false);
    const point=g.localToWorld(new THREE.Vector3(...anchor)).toArray();
    register({id:g.name,room,label,actions,anchor:point,approach:[access[0],access[2]??F,access[1]],object:g});
    return g;
  }
  function geo(key,make){if(!cache.has(key))cache.set(key,make());return cache.get(key);}
  function soft(g,x,y,z,w,h,d,r,c,opts={}){
    const bevel=Math.min(w/2.01,h/2.01,d/2.01,r);
    const shape=geo(['round',w,h,d,bevel].join(','),()=>new RoundedBoxGeometry(w,h,d,2,bevel));
    return add(g,shape,typeof c==='string'?k.mat(c,opts):c,x,y,z);
  }
  function orb(g,x,y,z,w,h,d,c){
    const m=add(g,geo('orb',()=>new THREE.SphereGeometry(1,16,10)),k.mat(c),x,y,z);
    m.scale.set(w,h,d);return m;
  }
  function rod(g,from,to,r,c){
    const a=new THREE.Vector3(...from),b=new THREE.Vector3(...to),v=b.clone().sub(a),mid=a.lerp(b,.5);
    const m=k.cyl(g,mid.x,mid.y,mid.z,r,r,v.length(),c,{segments:10});
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;
  }
  const box=k.box,cyl=k.cyl;
  function tex(key,w,h,draw){
    if(!textures.has(key)){
      const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);
      const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.set(key,t);
    }
    return textures.get(key);
  }
  function surface(g,map,x,y,z,w,h,ry=0,horizontal=false,lit=0){
    const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({
      map,roughness:.77,emissive:0xffffff,emissiveMap:map,emissiveIntensity:lit,side:THREE.DoubleSide
    }));
    m.position.set(x,y,z);m.rotation.y=ry;if(horizontal)m.rotation.x=-Math.PI/2;g.add(m);return m;
  }
  function cloth(name,bg,warp,weft){
    const t=tex(name,256,256,(c,w,h)=>{
      c.fillStyle=bg;c.fillRect(0,0,w,h);c.globalAlpha=.50;
      for(let i=-16;i<256;i+=64){c.fillStyle=warp;c.fillRect(i,0,17,h);c.fillStyle=weft;c.fillRect(0,i+8,w,16);}
      c.globalAlpha=.87;c.fillStyle=warp;for(let i=14;i<256;i+=64){c.fillRect(i,0,2,h);c.fillRect(0,i+16,w,2);}
      for(let i=1;i<256;i+=3){c.fillStyle='rgba(255,244,222,.14)';c.fillRect(i,0,1,h);c.fillStyle='rgba(37,34,42,.10)';c.fillRect(0,i,w,1);}
    });
    return new THREE.MeshStandardMaterial({map:t,roughness:.98});
  }
  function legs(g,x,z,w,d,top,wood=oak,thick=.045){
    for(const i of [-1,1])for(const j of [-1,1])rod(g,[x+i*w/2,.018,z+j*d/2],[x+i*(w*.49),top,z+j*(d*.49)],thick,wood);
  }
  function cup(g,x,y,z,c=ceramic,size=1,drink='#835843') {
    cyl(g,x,y+.008*size,z,.106*size,.079*size,.014*size,c,{segments:20});
    cyl(g,x,y+.057*size,z,.069*size,.048*size,.091*size,c,{segments:20});
    cyl(g,x,y+.105*size,z,.061*size,.061*size,.004*size,drink,{segments:20});
    const t=add(g,geo('cup handle',()=>new THREE.TorusGeometry(.037,.009,6,14)),k.mat(c),x+.069*size,y+.065*size,z);
    t.scale.setScalar(size);
  }
  function bowl(g,x,y,z,r,c,fill){
    const pts=[[r*.39,0],[r*.67,.012],[r*.96,r*.42],[r,r*.55],[r*.9,r*.56],[r*.65,r*.20],[r*.42,r*.08],[0,r*.07]];
    const m=add(g,geo('bowl'+r,()=>new THREE.LatheGeometry(pts.map(([a,b])=>new THREE.Vector2(a,b)),24)),k.mat(c),x,y,z);
    if(fill)cyl(g,x,y+r*.43,z,r*.87,r*.87,.004,fill,{segments:22});return m;
  }
  function book(g,x,y,z,w,h,d,c) {
    box(g,x,y+h*.50,z,w*.98,h*.86,d*.95,'#dfd4b8');
    box(g,x,y+.006,z,w,.012,d,c);box(g,x,y+h-.006,z,w,.012,d,c);
    box(g,x,y+h*.50,z-d*.47,w,h,d*.055,c);
    box(g,x+w*.02,y+h+.001,z,w*.42,.004,d*.09,'#dbceb0');
  }
  const bindings=['#ba7864','#e6bd8b','#739895','#c6a766','#647889','#a7ae83','#ceaa96'];
  function books(g,x,y,z,count,span=.63){
    let left=x-span/2;
    for(let i=0;i<count;i++){
      const w=span/count*.9,h=.16+((i*7)%5)*.019;
      box(g,left+w/2,y+h/2,z,w,h,.166,bindings[i%bindings.length]);
      box(g,left+w/2,y+h*.78,z+.085,w*.73,.009,.004,cream);
      box(g,left+w/2,y+h*.25,z+.085,w*.76,.012,.004,'#e1cfac');
      left+=span/count;
    }
  }
  function plant(g,x,y,z,s=.6,flower=false){
    cyl(g,x,y+.14*s,z,.16*s,.12*s,.28*s,'#a86d56',{segments:14});
    cyl(g,x,y+.28*s,z,.168*s,.163*s,.043*s,'#c78b6b',{segments:14});
    cyl(g,x,y+.305*s,z,.144*s,.144*s,.009*s,'#514b40',{segments:14});
    for(let i=0;i<13;i++){
      const a=i*2.39996,dist=(.09+(i%4)*.035)*s, yy=(.51+.09*(i%5))*s;
      const xx=x+Math.cos(a)*dist,zz=z+Math.sin(a)*dist;
      rod(g,[x,y+.30*s,z],[xx,y+yy,zz],.009*s,'#6c8666');
      const leaf=orb(g,xx,y+yy,zz,.059*s,.107*s,.028*s,i%3?'#64866b':'#819a7a');
      leaf.rotation.set(.50,a,.55);
      if(flower && i%3===0)orb(g,xx,y+yy+.055*s,zz,.047*s,.038*s,.035*s,'#d4968e');
    }
  }
  function cityFilm(late=false){
    // An original animated-film still: amber train on a wet elevated line,
    // luminous apartments behind it, and a reflected skyline below the track.
    return tex(late?'last train: midnight':'last train: blue hour',768,432,(c,w,h)=>{
      const sky=c.createLinearGradient(0,0,0,h);
      sky.addColorStop(0,late?'#17203d':'#323f79');sky.addColorStop(.52,late?'#535d95':'#d0769a');
      sky.addColorStop(.79,late?'#69a7ad':'#ffb885');sky.addColorStop(1,'#204152');
      c.fillStyle=sky;c.fillRect(0,0,w,h);
      c.fillStyle=late?'#bfe1d5':'#ffe6b4';c.beginPath();c.arc(late?153:569,86,31,0,Math.PI*2);c.fill();
      let seed=late?199:677;
      const rnd=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
      for(let row=0;row<2;row++){
        for(let x=-8;x<w;){
          const bw=15+rnd()*(row?42:25),top=(row?134:95)+rnd()*(row?131:118);
          c.fillStyle=(row?['#203e55','#344760','#304157']:['#717594','#827594','#617c94'])[Math.floor(rnd()*3)];
          c.fillRect(x,top,bw,328-top);
          for(let y=top+8;y<320;y+=10)for(let xx=x+4;xx<x+bw-3;xx+=8){
            if(rnd()>.47){c.fillStyle=['#efb591','#e5c18d','#8cbcc5','#b18eaa'][Math.floor(rnd()*4)];c.fillRect(xx,y,4,3);}
          }
          x+=bw+3;
        }
      }
      c.fillStyle='#223543';c.fillRect(0,290,w,13);c.fillRect(84,287,15,72);c.fillRect(580,287,15,64);
      for(let i=0;i<3;i++){
        const x=194+i*125;c.fillStyle='#d7bbaf';c.fillRect(x,253,121,32);c.fillStyle='#c85f69';c.fillRect(x,277,121,6);
        c.fillStyle='#527782';c.fillRect(x+4,256,113,14);
        for(let n=0;n<8;n++){c.fillStyle=n%3?'#f7c594':'#94c2c0';c.fillRect(x+6+n*14,257,10,11);}
      }
      c.fillStyle='#263d52';c.fillRect(0,350,w,82);
      for(let i=0;i<205;i++){
        c.fillStyle=['#648c9b','#987eaa','#d49a83','#68979d'][i%4];
        c.fillRect(rnd()*w,353+rnd()*77,2+rnd()*26,1+rnd()*2);
      }
      c.strokeStyle='#334056';c.lineWidth=2;c.beginPath();c.moveTo(0,48);c.quadraticCurveTo(367,175,768,91);c.stroke();
    });
  }
  function recordCover(jazz=false){
    return tex(jazz?'record blue':'record vermilion',384,448,(c,w,h)=>{
      c.fillStyle=jazz?'#173f55':'#ee795e';c.fillRect(0,0,w,h);
      c.fillStyle=jazz?'#98d5cf':'#f6e9bd';c.fillRect(19,17,w-38,5);
      c.font='900 56px Arial';c.fillText(jazz?'NIGHT':'CITY',21,84);c.fillText(jazz?'SIGNAL':'LOOPS',21,136);
      c.save();c.beginPath();c.rect(21,153,342,209);c.clip();
      for(let i=0;i<10;i++){
        c.strokeStyle=jazz?(i%2?'#77bec3':'#efac88'):(i%2?'#294856':'#ffe4aa');c.lineWidth=7;
        c.beginPath();c.arc(jazz?70:307,jazz?315:238,21+i*17,0,2*Math.PI);c.stroke();
      }c.restore();
      c.fillStyle=jazz?'#d3e1cf':'#263f4b';c.font='bold 22px "Yu Gothic",sans-serif';c.fillText(jazz?'夜行電波　/　B 面':'環状線　/　レコード',21,398);
      c.font='bold 12px monospace';c.fillText('AMANE PRESS   33⅓ RPM   STEREO',21,426);
    });
  }
  function led(g,x,y,z,w,c){
    box(g,x,y,z,w,.012,.009,c,{emissive:c,intensity:1.14});
  }
  function domeLight(g,x,y,z,s=.75){
    cyl(g,x,y+.018*s,z,.13*s,.138*s,.036*s,steel,{segments:24});
    rod(g,[x,y+.033*s,z],[x,y+.238*s,z],.017*s,brass);
    cyl(g,x,y+.277*s,z,.089*s,.151*s,.078*s,coral,{segments:24});
    cyl(g,x,y+.231*s,z,.14*s,.141*s,.014*s,cream,{segments:24,emissive:'#ffcc92',intensity:1.05});
    orb(g,x,y+.304*s,z,.094*s,.036*s,.094*s,coral);
  }
  const greenCheck=cloth('mustard pinstripe','#d8a651','#e8bf6c','#b99255');
  const redCheck=cloth('coral pinstripe','#e67d70','#f19e83','#d16b66');
  const blueCheck=cloth('midnight windowpane','#465d71','#91a4ad','#738c9c');
  const sofa=furniture('living','sofa','布艺沙发',-7.50,10.78,[-6.30,10.30],['sit','nap','tv','phone'],'living/sofa',[.18,.435,-.07]);
  legs(sofa,0,0,1.88,.62,.20,steel,.029);
  soft(sofa,0,.244,0,2.14,.28,.83,.06,'#4c6970');
  soft(sofa,0,.585,.315,2.05,.56,.245,.095,'#5d8385');
  for(const i of [-1,1]){
    soft(sofa,i*.474,.398,-.068,.927,.162,.61,.07,'#83a6a3');
    soft(sofa,i*1.02,.493,-.007,.169,.43,.781,.076,'#5d8385');
    const p=soft(sofa,i*.641,.632,.105,.38,.36,.16,.072,i>0?redCheck:greenCheck);p.rotation.set(-.21,0,i*.15);
  }
  soft(sofa,.203,.492,-.146,.42,.023,.48,.009,blueCheck);
  soft(sofa,.203,.381,-.408,.42,.222,.019,.007,blueCheck);
  const rug=furniture('living','rug','几何织纹地毯',-7.43,9.80,[-6.30,9.90],['sit','rest'],'living/rug',[.93,.022,.33]);
  soft(rug,0,.011,0,2.64,.022,1.73,.01,'#596973');
  const rugArt=tex('woven circles',512,320,(c,w,h)=>{
    c.fillStyle='#dcd3c1';c.fillRect(0,0,w,h);
    c.fillStyle='#788b8b';c.fillRect(w*.52,0,w*.48,h*.59);
    c.fillStyle='#435e70';c.beginPath();c.arc(0,h*.25,150,-Math.PI/2,Math.PI/2);c.fill();
    c.fillStyle='#cc8c72';c.beginPath();c.arc(w,h*.92,127,Math.PI,2*Math.PI);c.fill();
    c.strokeStyle='#ac9b85';c.lineWidth=3;
    for(let n=0;n<9;n++){c.beginPath();c.arc(308,285,48+n*10,Math.PI,1.95*Math.PI);c.stroke();}
    c.fillStyle='rgba(255,255,255,.13)';for(let y=0;y<h;y+=3)c.fillRect(0,y,w,1);
  });
  surface(rug,rugArt,0,.023,0,2.606,1.70,0,true);
  const coffee=furniture('living','coffeeTable','钢架边几',-7.51,9.78,[-6.55,9.83],['drink','read'],null,[0,.384,.06]);
  for(const s of [-1,1]){
    box(coffee,s*.51,.180,0,.028,.307,.523,steel);
    box(coffee,s*.48,.029,0,.087,.030,.531,steel);
  }
  box(coffee,0,.17,-.171,.995,.024,.105,steel);
  soft(coffee,0,.354,0,1.21,.064,.63,.032,'#b5b2a6');
  book(coffee,-.263,.389,-.018,.27,.03,.222,'#d27060');
  surface(coffee,recordCover(),-.263,.420,-.018,.25,.199,0,true);
  cup(coffee,.22,.389,.032,'#d7dbbf',.83);
  soft(coffee,.031,.403,-.152,.145,.025,.043,.01,charcoal);
  const media=furniture('living','console','影音矮柜',-7.49,8.63,[-6.39,9.17],['inspect'],null,[0,.48,0]);
  for(const x of [-.991,-.195,.991])for(const z of [-.171,.171])box(media,x,.232,z,.035,.414,.035,steel);
  box(media,0,.111,0,2.08,.035,.409,steel);box(media,0,.441,0,2.18,.038,.436,maple);
  soft(media,-.574,.238,.014,.644,.185,.331,.021,'#44515c');
  box(media,-.574,.25,.183,.608,.133,.011,charcoal);
  for(let i=0;i<2;i++){const knob=cyl(media,-.825+i*.498,.245,.196,.039,.039,.022,chrome,{segments:12});knob.rotation.x=Math.PI/2;}
  led(media,-.584,.25,.196,.16,'#a0ddce');
  for(let i=0;i<4;i++)box(media,-.685+i*.056,.205,.194,.022,.019,.01,ash);
  books(media,.104,.137,.04,5,.282);books(media,.666,.137,.031,6,.437);
  const tv=furniture('living','tv','独立电视机',-7.49,8.63,[-6.40,9.25],['tv','toggle'],'living/tv',[0,1.05,.091]);
  for(const s of [-1,1])rod(tv,[s*.479,.56,0],[s*.592,.469,.089],.020,charcoal);
  soft(tv,0,.97,0,1.52,.866,.067,.028,'#303a40');
  const display=surface(tv,cityFilm(),0,.970,.036,1.458,.792,0,false,.80);
  display.name='tv-screen';box(tv,.627,.553,.037,.015,.007,.007,'#94b898',{emissive:'#99cda4',intensity:.74});
  const shelf=furniture('living','shelf','唱片与文库书架',-5.54,8.67,[-5.65,9.30],['read'],'living/shelf',[0,.75,.2]);
  for(const x of [-.375,.375])for(const z of [-.145,.145])box(shelf,x,.500,z,.03,1,.03,teal);
  for(const y of [.096,.411,.717,.976])box(shelf,0,y,0,.80,.027,.359,maple);
  books(shelf,0,.117,.017,9,.66);books(shelf,-.142,.432,.017,6,.41);
  bowl(shelf,.245,.432,.007,.104,'#b9c9ba');books(shelf,.16,.738,.012,5,.34);
  // Display rail bolted to the shelving, with two original LP jackets.
  for(const x of [-.309,.309])box(shelf,x,1.185,-.134,.025,.401,.032,steel);
  for(const [x,art] of [[-.176,recordCover()],[.176,recordCover(true)]]){
    box(shelf,x,1.165,-.083,.319,.328,.019,cream);
    surface(shelf,art,x,1.165,-.071,.313,.322);
    surface(shelf,art,x,1.165,-.095,.313,.322,Math.PI);
  }
  box(shelf,0,1.005,-.04,.742,.024,.024,brass);
  const water=furniture('living','water','玻璃饮水机',-5.30,10.87,[-5.56,10.37],['drink'],'living/water',[0,.91,-.13]);
  soft(water,0,.37,0,.38,.68,.35,.028,'#d3d9c5');box(water,0,.565,-.176,.215,.20,.016,'#697b78');
  cyl(water,0,.865,0,.126,.135,.28,'#a2c1c5',{segments:16,roughness:.30});
  cyl(water,0,.722,0,.137,.144,.038,'#678993',{segments:16});
  box(water,0,.62,-.197,.049,.044,.066,'#bc8b70');cup(water,0,.453,-.176,'#dfdbc4',.56);
  const lightX=-1.22,lightZ=.03;
  cyl(sofa,lightX,.023,lightZ,.126,.135,.046,steel,{segments:24});
  rod(sofa,[lightX,.037,lightZ],[lightX,1.163,lightZ],.016,steel);
  cyl(sofa,lightX,1.188,lightZ,.071,.029,.063,brass,{segments:16});
  const globe=add(sofa,geo('opal globe',()=>new THREE.SphereGeometry(.119,22,14)),k.mat('#ffecc5',{emissive:'#ffd59d',intensity:.68}),lightX,1.286,lightZ);
  globe.scale.set(1,1.16,1);
  k.glow(sofa,lightX,1.286,lightZ,'#ffc586',.46,.16);

  const bed=furniture('bedroom','bed','软包平台床',-7.93,14.54,[-6.76,14.27],['sleep','nap'],'her_room/bed',[0,.488,.17]);
  legs(bed,0,0,1.43,1.97,.223,walnut,.063);
  soft(bed,0,.223,0,1.71,.181,2.16,.037,oak);soft(bed,0,.387,0,1.62,.224,2.067,.075,cream);
  soft(bed,0,.532,.269,1.66,.15,1.56,.064,'#c8bac0');
  soft(bed,0,.625,-.391,1.64,.043,.21,.018,'#e5d9d4');
  soft(bed,0,.622,.743,1.665,.051,.37,.021,blueCheck);
  for(const s of [-1,1])soft(bed,s*.397,.536,-.743,.682,.17,.389,.064,'#eee6cc').rotation.y=s*.04;
  soft(bed,0,.602,-1.055,1.72,.64,.092,.040,'#68737e');
  for(let i=0;i<4;i++)soft(bed,-.628+i*.418,.637,-.998,.400,.461,.074,.034,'#8b949c');
  const bedside=furniture('bedroom','bedside','床头柜与圆帽灯',-6.76,13.45,[-6.62,13.93],['read','toggle'],'her_room/bedside',[0,.54,0]);
  legs(bedside,0,0,.345,.315,.13,walnut,.029);box(bedside,0,.286,0,.454,.329,.374,oak);
  box(bedside,0,.314,.194,.394,.189,.015,maple);box(bedside,0,.33,.212,.098,.015,.027,brass);
  domeLight(bedside,-.07,.455,-.017,.88);book(bedside,.127,.454,.080,.11,.027,.16,'#9ca78d');
  const ward=furniture('bedroom','wardrobe','组合衣柜',-5.31,14.80,[-5.98,14.66],['dress','open'],'her_room/wardrobe',[0,1.04,.287],-Math.PI/2);
  soft(ward,0,.93,0,1.23,1.85,.447,.029,'#8b9b9d');box(ward,0,1.868,0,1.269,.043,.486,'#c6d1cc');
  for(const s of [-1,1]){
    box(ward,s*.298,.976,.231,.58,1.67,.030,'#d3d8cd');
    box(ward,s*.298,1.63,.251,.433,.092,.013,'#b9c4bd');
    for(let j=0;j<4;j++)box(ward,s*.298,1.601+j*.022,.260,.380,.005,.007,'#879a96');
    rod(ward,[s*.065,.927,.277],[s*.065,1.054,.277],.013,brass);
  }
  // Exposed ends have shallow folded-metal panel seams.
  for(const s of [-1,1]){
    box(ward,s*.30,.944,-.228,.552,1.65,.012,'#adb8b5');
    box(ward,s*.618,.94,0,.013,1.65,.346,'#b2bdb7');
    box(ward,s*.618,.455,0,.018,.022,.362,'#8a9c98');
  }
  for(const h of [.107,1.768])box(ward,0,h,-.235,1.207,.050,.018,ash);
  const window=furniture('bedroom','window','窗边一枝花',-8.51,15.76,[-8.14,15.80],['look','rest'],'her_room/window',[0,.657,0]);
  legs(window,0,0,.327,.275,.421,ash,.025);box(window,0,.43,0,.439,.035,.351,maple);plant(window,0,.45,0,.56,true);

  function stool(g,x,z,angle=0){
    const a=new THREE.Group();a.position.set(x,0,z);a.rotation.y=angle;g.add(a);
    legs(a,0,0,.364,.36,.415,steel,.016);soft(a,0,.43,0,.435,.064,.421,.03,maple);
    soft(a,0,.48,0,.383,.062,.355,.029,'#477477');
    for(const s of [-1,1])rod(a,[s*.176,.434,.16],[s*.182,.831,.205],.016,steel);
    soft(a,0,.756,.204,.42,.165,.054,.025,maple).rotation.x=.08;
  }
  const dining=furniture('dining','dining','四人橡木餐桌',-3.24,9.77,[-2.28,10.65],['sit','eat','drink'],'kitchen/dining',[.387,.512,.69]);
  legs(dining,0,0,1.18,.65,.699,oak,.050);
  soft(dining,0,.733,0,1.61,.084,.905,.041,maple);
  soft(dining,0,.784,0,.246,.014,.903,.006,'#516e74');
  for(const x of [-.402,.402])for(const s of [-1,1]){
    stool(dining,x,s*.678,s===1?0:Math.PI);
    cyl(dining,x,.785,s*.201,.134,.122,.018,ceramic,{segments:22});
    bowl(dining,x+.075,.796,s*.213,.077,s===1?'#77949a':'#a5ad8a');
    for(const d of [-.013,.013]) rod(dining,[x-.15,.795,s*.272+d],[x+.027,.795,s*.272+d],.005,walnut);
  }
  plant(dining,0,.793,.014,.36,true);
  const sideboard=furniture('dining','teaCabinet','咖啡与煮饭吧台',-3.26,8.59,[-2.13,9.01],['tea','inspect'],null,[0,.827,.15]);
  box(sideboard,0,.38,0,1.34,.71,.357,'#638787');box(sideboard,0,.75,0,1.38,.042,.396,'#d2c7ad');
  for(const x of [-.32,.32]){
    box(sideboard,x,.379,.186,.603,.59,.022,'#779b95');
    box(sideboard,x,.414,.202,.056,.017,.019,brass);
  }
  bowl(sideboard,-.32,.772,.00,.116,'#79969a');cup(sideboard,-.07,.773,.024,cream,.76);
  soft(sideboard,.421,.906,-.004,.324,.263,.312,.072,'#c6524d');
  soft(sideboard,.421,1.031,-.004,.320,.059,.305,.028,'#eb7b66');
  soft(sideboard,.421,1.066,-.027,.151,.021,.111,.010,'#6f5153');
  box(sideboard,.421,.955,.144,.193,.068,.016,'#443f46');
  led(sideboard,.408,.960,.156,.067,'#9de1bd');
  for(const x of [.475,.501])box(sideboard,x,.953,.156,.015,.012,.007,cream);

  function pull(g,x,y,z,w){box(g,x,y,z,w,.015,.027,brass);}
  function cupboard(g,w,d,c='#527578'){
    box(g,0,.073,0,w-.043,.126,d-.049,walnut);
    box(g,0,.460,0,w,.684,d,c);
    soft(g,0,.814,0,w+.04,.058,d+.045,.022,'#d7d4c7');
    for(const s of [-1,1]){
      box(g,s*w*.244,.468,d*.507,w*.455,.595,.023,'#648c8a');
      pull(g,s*w*.24,.690,d*.55,w*.18);
      box(g,s*w*.238,.473,-d*.504,w*.444,.577,.009,'#577778');
    }
  }
  function tiledFace(g,x,y,z,w,h,cols,rows,turn=0){
    const color=['#377578','#3b7c7d','#428386','#39767b','#337079','#39797d'];
    const t=tex('sea-glass metro '+cols+' '+rows,cols*48,rows*44,(ctx,wi,he)=>{
      ctx.fillStyle='#94aba3';ctx.fillRect(0,0,wi,he);
      for(let j=0;j<rows;j++)for(let i=-1;i<cols;i++){
        const sx=i*48+(j%2)*24;
        ctx.fillStyle=color[(i+1+j*3)%color.length];ctx.fillRect(sx+1,j*44+1,46,42);
        ctx.fillStyle='rgba(214,239,222,.21)';ctx.fillRect(sx+2,j*44+2,44,2);
        ctx.fillStyle='rgba(26,63,75,.23)';ctx.fillRect(sx+2,j*44+41,44,1);
      }
    });return surface(g,t,x,y,z,w,h,turn);
  }
  const fridge=furniture('kitchen','fridge','双门冰箱',-1.58,15.48,[-2.12,15.18],['open','eat','snack'],'kitchen/fridge',[0,1.12,.297],-Math.PI/2);
  soft(fridge,0,.918,0,.702,1.82,.66,.044,'#b8c7ba');
  soft(fridge,0,1.185,.324,.681,1.21,.076,.029,'#d1d9c8');
  soft(fridge,0,.294,.324,.681,.516,.078,.029,'#c4cfc0');
  box(fridge,-.250,.991,.383,.028,.309,.034,chrome);
  box(fridge,-.242,.493,.380,.104,.020,.025,chrome);
  const list=tex('fridge slip',128,168,(c,w,h)=>{
    c.fillStyle='#eadba9';c.fillRect(0,0,w,h);c.fillStyle='#895e4d';c.font='bold 21px sans-serif';c.fillText('買いもの',12,33);
    c.font='18px sans-serif';for(const [i,t] of ['☐ お茶','☑ 卵','☐ みかん'].entries())c.fillText(t,12,69+i*32);
    c.fillStyle='#b9755c';c.beginPath();c.arc(67,10,6,0,2*Math.PI);c.fill();
  });
  surface(fridge,list,.119,1.37,.365,.174,.235).rotation.z=-.055;
  box(fridge,0,.365,-.335,.463,.338,.016,'#838e85');
  for(let i=0;i<8;i++)box(fridge,0,.233+i*.034,-.346,.403,.011,.009,'#5d6c68');
  for(const s of [-1,1]){
    box(fridge,s*.352,1.160,0,.007,.985,.538,'#bdc9bc');
    box(fridge,s*.352,.560,0,.009,.016,.612,'#7e938a');
  }
  const sink=furniture('kitchen','sink','不锈钢洗涤台',-2.83,15.68,[-2.78,14.86],['wash','drink'],'kitchen/sink',[0,.88,.22],Math.PI);
  cupboard(sink,1.42,.60);
  soft(sink,-.13,.845,-.012,.68,.020,.431,.009,'#95a4a0');
  soft(sink,-.13,.857,-.012,.566,.023,.331,.011,'#526e70');
  soft(sink,-.13,.871,-.012,.484,.013,.260,.006,'#849996');
  cyl(sink,-.121,.88,-.015,.029,.029,.006,chrome,{segments:14});
  for(let i=0;i<6;i++)box(sink,.291+i*.049,.850,-.012,.012,.010,.35,chrome);
  rod(sink,[-.18,.845,-.223],[-.18,1.069,-.223],.020,chrome);
  rod(sink,[-.18,1.069,-.223],[-.18,1.069,-.056],.020,chrome);
  rod(sink,[-.18,1.069,-.056],[-.18,1.028,-.056],.019,chrome);
  cyl(sink,.154,.918,-.222,.029,.037,.138,'#b8c69d',{segments:10});box(sink,.154,.997,-.217,.084,.017,.024,chrome);
  box(sink,0,1.057,-.286,1.40,.431,.032,'#8b9d9b');
  tiledFace(sink,0,1.056,-.266,1.382,.402,13,5);
  box(sink,0,1.278,-.286,1.428,.018,.046,chrome);
  const stove=furniture('kitchen','stove','双口灶与汤锅',-1.50,14.20,[-2.30,14.2],['cook','heat'],'kitchen/stove',[0,.907,.11],-Math.PI/2);
  cupboard(stove,1.53,.561);
  box(stove,0,1.024,-.267,1.512,.359,.031,'#8b9d9b');
  tiledFace(stove,0,1.026,-.249,1.490,.340,14,4);
  box(stove,0,1.211,-.267,1.522,.017,.042,chrome);
  soft(stove,-.115,.856,0,.917,.025,.431,.012,charcoal);
  for(const x of [-.337,.115]){
    const ring=add(stove,geo('burner',()=>new THREE.TorusGeometry(.129,.010,7,22)),k.mat('#9aa39d'),x,.881,0);ring.rotation.x=Math.PI/2;
    for(let i=0;i<4;i++){
      const a=i*Math.PI/2;rod(stove,[x+Math.cos(a)*.092,.886,Math.sin(a)*.092],[x+Math.cos(a)*.148,.886,Math.sin(a)*.148],.010,charcoal);
    }
  }
  cyl(stove,-.331,.962,0,.127,.115,.143,'#b55e4e',{segments:22});
  cyl(stove,-.331,1.039,0,.111,.136,.037,'#d08160',{segments:22});
  cyl(stove,-.331,1.069,0,.029,.036,.034,charcoal,{segments:12});
  for(const s of [-1,1])box(stove,-.331+s*.145,.994,0,.054,.025,.034,charcoal);
  soft(stove,.511,.862,-.008,.268,.029,.28,.014,maple);
  for(let i=0;i<3;i++)orb(stove,.462+i*.045,.902,-.021+i*.006,.044,.033,.039,i%2?'#bd6f4f':'#be855f');
  box(stove,-.13,.491,.294,.612,.365,.022,'#586262');box(stove,-.13,.469,.306,.49,.236,.012,'#34474b');
  rod(stove,[-.426,.628,.327],[.164,.628,.327],.014,chrome);
  for(let i=0;i<2;i++)cyl(stove,-.29+i*.23,.722,.309,.025,.025,.02,chrome,{segments:12}).rotation.x=Math.PI/2;
  const pantry=furniture('kitchen','pantry','调味料架',-4.62,13.44,[-3.95,13.60],['inspect'],null,[0,.93,.15],Math.PI/2);
  for(const x of [-.526,.526])box(pantry,x,.634,0,.043,1.24,.321,oak);
  for(const h of [.09,.58,1.066,1.251])box(pantry,0,h,0,1.094,.041,.328,maple);
  for(let i=0;i<4;i++){
    let x=-.37+i*.237;cyl(pantry,x,.748,0,.072,.079,.292,i%2?'#c6c4a4':'#b38e69',{segments:16});
    cyl(pantry,x,.905,0,.076,.079,.031,walnut,{segments:16});
    box(pantry,x,.76,.077,.083,.076,.010,cream);
    bowl(pantry,x,.112,.005,.089,i%2?'#879e95':'#c8bb9d');
  }
  plant(pantry,.24,1.276,.011,.42);cup(pantry,-.28,1.276,0,ceramic,.74);

  const shoes=furniture('genkan','shoe','玄关鞋柜',2.54,9.48,[1.94,9.95,.327],['dress','open'],'foyer/shoe',[0,.71,.17],-Math.PI/2,.327);
  for(const x of [-.6,.60])box(shoes,x,.397,0,.048,.79,.41,oak);
  for(const h of [.083,.352,.739])box(shoes,0,h,0,1.25,.049,.423,maple);
  for(let row=0;row<2;row++)for(let pair=0;pair<2;pair++)for(const foot of [-1,1]){
    const x=(pair-.5)*.54+foot*.095,y=[.112,.382][row];
    soft(shoes,x,y+.034,.035,.141,.065,.271,.028,row?'#89705a':'#424b50');
    const sole=soft(shoes,x,y+.072,.061,.136,.082,.176,.038,row?'#aa8770':'#5b6c6b');
    sole.rotation.x=-.13;box(shoes,x,y+.122,.031,.068,.007,.012,cream);
  }
  plant(shoes,-.31,.769,0,.45,true);
  bowl(shoes,.302,.766,.013,.125,'#88a09a');
  const slips=furniture('genkan','slippers','待客布拖鞋',.015,9.53,[.62,9.60,.327],['wear'],null,[0,.047,.03],.08,.327);
  for(const x of [-.084,.084]){
    soft(slips,x,.021,0,.142,.042,.286,.020,'#816e61');
    soft(slips,x,.049,-.057,.148,.091,.174,.041,blueCheck);
  }
  const um=furniture('genkan','umbrella','伞篓',-.68,8.83,[.003,9.12,.327],['take','store'],null,[0,.606,0],0,.327);
  cyl(um,0,.231,0,.163,.135,.438,'#889b9a',{segments:16});
  cyl(um,0,.45,0,.149,.145,.024,charcoal,{segments:16});
  for(let i=0;i<11;i++){
    const a=i*2*Math.PI/11;rod(um,[.135*Math.cos(a),.059,.135*Math.sin(a)],[.163*Math.cos(a),.435,.163*Math.sin(a)],.006,chrome);
  }
  for(let i=0;i<3;i++){
    const x=(i-1)*.081,z=(i%2)*.042;
    cyl(um,x,.584+i*.018,z,.048,.026,.372,['#a27a6f','#819c93','#8b9faa'][i],{segments:8});
    rod(um,[x,.746,z],[x,.878+i*.019,z],.009,chrome);
    add(um,geo('hook',()=>new THREE.TorusGeometry(.029,.009,6,13,Math.PI)),k.mat(oak),x+.029,.877+i*.019,z);
    rod(um,[x+.058,.877+i*.019,z],[x+.058,.850+i*.019,z],.008,oak);
  }
  const washer=furniture('genkan','washer','家政洗衣机',2.49,10.84,[1.74,10.77],['laundry','open'],'laundry/washer',[0,.70,.32],-Math.PI/2);
  soft(washer,0,.475,0,.719,.944,.658,.032,'#d6d8c7');
  box(washer,0,.766,.332,.684,.178,.017,'#a7b6ad');box(washer,-.179,.785,.348,.181,.077,.013,charcoal);
  for(let n=0;n<3;n++)box(washer,-.214+n*.039,.785,.359,.019,.018,.005,'#a6c9ab');
  const dial=cyl(washer,.191,.785,.355,.052,.052,.028,cream,{segments:18});dial.rotation.x=Math.PI/2;
  for(const [z,r,col] of [[.342,.222,'#84938e'],[.361,.188,'#b8c7be'],[.376,.156,'#59737a']]){
    const disk=cyl(washer,0,.415,z,r,r,.029,col,{segments:28});disk.rotation.x=Math.PI/2;
  }
  for(let i=0;i<3;i++)soft(washer,-.02,.973+i*.042,-.02,.359-i*.02,.046,.225,.02,i===1?'#92afa6':'#d2c2a4');
  const gallery=furniture('corridor','gallery','城市音乐海报与杂志架',-7.48,12.40,[-7.48,11.91],['look'],'corridor/gallery',[0,.88,-.06]);
  for(const s of [-1,1]){
    box(gallery,s*.215,.023,0,.071,.046,.215,walnut);
    box(gallery,s*.215,.347,0,.040,.626,.047,maple);
  }
  box(gallery,0,.145,0,.485,.044,.18,oak);
  books(gallery,0,.169,-.001,6,.373);
  box(gallery,0,.24,.091,.474,.024,.018,brass);
  box(gallery,0,.887,0,.51,.574,.057,walnut);
  for(const s of [-1,1])box(gallery,0,.887,s*.030,.464,.527,.011,cream);
  surface(gallery,recordCover(true),0,.898,-.038,.390,.435,Math.PI);
  surface(gallery,recordCover(),0,.898,.038,.390,.435);

  const desk=furniture('study','desk','工作书桌',.016,15.54,[-.10,14.43],['desk','read','draw'],'her_room/desk',[0,.51,.595],Math.PI);
  legs(desk,0,0,1.49,.51,.729,steel,.025);
  soft(desk,0,.748,0,1.686,.073,.652,.03,maple);
  box(desk,.461,.596,0,.531,.225,.481,oak);box(desk,.461,.600,.251,.49,.171,.024,maple);
  pull(desk,.461,.625,.279,.138);stool(desk,0,.595,0);
  soft(desk,.012,.791,-.008,.58,.015,.352,.006,'#6e8983');
  box(desk,-.48,.792,.095,.249,.012,.177,cream);
  for(let i=0;i<4;i++)box(desk,-.483,.803,.044+i*.025,.170-i*.019,.002,.005,'#95988a');
  rod(desk,[-.559,.815,.022],[-.399,.813,.139],.006,'#966d50');
  books(desk,.546,.788,-.116,5,.36);
  // Counterbalanced lamp: weighted base, parallel lower arm and an enamel
  // shade angled down onto the open notebook.
  cyl(desk,-.649,.805,-.123,.099,.106,.029,steel,{segments:22});
  for(const d of [-.012,.012])rod(desk,[-.649,.829,-.117+d],[-.697,1.073,-.13+d],.009,chrome);
  rod(desk,[-.697,1.073,-.13],[-.521,1.243,-.102],.012,steel);
  orb(desk,-.697,1.073,-.13,.022,.022,.024,coral);
  const shade=cyl(desk,-.505,1.213,-.084,.045,.084,.084,teal,{segments:18});
  shade.rotation.z=.26;
  const lampDisk=cyl(desk,-.495,1.172,-.084,.079,.079,.010,cream,{segments:18,emissive:'#ffdfac',intensity:1.1});lampDisk.rotation.z=.26;
  const pc=furniture('study','laptop','便携电脑',.016,15.54,[-.10,14.43],['desk','type','toggle'],null,[0,1.09,-.127],Math.PI);
  soft(pc,0,.813,0,.462,.027,.30,.012,'#7c8b8b');
  for(let row=0;row<3;row++)for(let col=0;col<8;col++)
    box(pc,-.153+col*.043,.829,-.046+row*.031,.032,.004,.021,'#48575b');
  box(pc,0,.829,.104,.118,.005,.067,'#9caaa6');
  const lid=new THREE.Group();lid.position.set(0,.830,-.138);lid.rotation.x=-.14;pc.add(lid);
  soft(lid,0,.146,0,.461,.291,.025,.011,'#465459');
  surface(lid,cityFilm(true),0,.145,.014,.430,.259,0,false,.65).name='laptop-screen';
  const studyShelf=furniture('study','books','书斋的书与杂志',-.79,13.86,[-.16,13.83],['read'],null,[0,.77,.17],Math.PI/2);
  for(const x of [-.481,.481])box(studyShelf,x,.64,0,.042,1.25,.282,oak);
  for(const h of [.08,.445,.83,1.249])box(studyShelf,0,h,0,.996,.039,.309,maple);
  books(studyShelf,0,.100,.025,12,.883);books(studyShelf,-.165,.466,.005,7,.527);
  book(studyShelf,.28,.467,.007,.24,.046,.21,bindings[2]);book(studyShelf,.27,.514,.007,.22,.045,.19,bindings[0]);
  books(studyShelf,.13,.851,.025,8,.573);plant(studyShelf,-.289,1.269,.015,.40);

  const bath=furniture('bathroom','shower','嵌入式浴缸与花洒',1.99,15.42,[2.04,14.66],['shower','bath'],'bathroom/shower',[0,.348,0]);
  // Continuous enamel inner lining and handmade glazed tiles on the apron.
  box(bath,0,.095,0,1.67,.182,.923,'#849599');
  for(const s of [-1,1]){
    box(bath,s*.817,.316,0,.105,.552,1.02,ceramic);
    box(bath,0,.316,s*.459,1.585,.552,.104,ceramic);
    box(bath,s*.813,.602,0,.137,.048,1.074,'#e3e8df');
    box(bath,0,.602,s*.465,1.543,.048,.136,'#e3e8df');
    tiledFace(bath,0,.310,s*.514,1.616,.527,15,6,s===1?0:Math.PI);
    tiledFace(bath,s*.872,.310,0,.986,.527,9,6,s*Math.PI/2);
  }
  soft(bath,0,.464,0,1.525,.019,.793,.009,'#87afab',{roughness:.22});
  for(const s of [-1,1])box(bath,0,.062,s*.514,1.719,.042,.023,'#63777b');
  rod(bath,[.679,.44,.447],[.679,1.69,.447],.016,chrome);
  rod(bath,[.679,1.67,.447],[.679,1.67,.254],.018,chrome);
  const head=cyl(bath,.679,1.643,.239,.078,.078,.023,chrome,{segments:18});head.rotation.x=-.18;
  box(bath,.533,.842,.437,.279,.079,.082,chrome);
  for(let i=0;i<2;i++){cyl(bath,-.499+i*.138,.697,.449,.042,.043,.149,i?'#9eab96':'#cab697',{segments:10});box(bath,-.499+i*.138,.783,.448,.052,.022,.055,cream);}
  const vanity=furniture('bathroom','sink','洗手盆',2.66,13.45,[2.07,13.54],['wash','brush'],'bathroom/sink',[0,.826,.115],-Math.PI/2);
  box(vanity,0,.395,0,.675,.745,.405,'#637f80');
  for(const s of [-1,1]){box(vanity,s*.159,.411,.210,.297,.564,.025,'#82a3a0');pull(vanity,s*.070,.596,.234,.054);}
  soft(vanity,0,.784,0,.719,.074,.454,.031,'#e7e4d0');
  soft(vanity,0,.824,.010,.427,.017,.251,.008,'#a6b7ac');
  cyl(vanity,0,.836,.006,.020,.020,.007,chrome,{segments:12});
  rod(vanity,[0,.817,-.163],[0,.98,-.163],.017,chrome);rod(vanity,[0,.98,-.163],[0,.98,-.061],.017,chrome);
  box(vanity,0,1.187,-.196,.030,.792,.037,chrome);
  soft(vanity,0,1.383,-.196,.53,.56,.04,.019,'#677777');
  box(vanity,0,1.639,-.169,.420,.014,.013,'#f7e5c1',{emissive:'#ffe7ca',intensity:.79});
  surface(vanity,tex('etched mirror',180,210,(c,w,h)=>{
    const gr=c.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#a0b4af');gr.addColorStop(.54,'#c6d1c3');gr.addColorStop(1,'#869da1');
    c.fillStyle=gr;c.fillRect(0,0,w,h);c.fillStyle='rgba(255,246,211,.30)';c.beginPath();c.moveTo(8,h);c.lineTo(84,0);c.lineTo(111,0);c.lineTo(33,h);c.fill();
  }),0,1.383,-.173,.486,.514);
  cup(vanity,.236,.824,.033,'#bdcac0',.52);
  for(const s of [-1,1])rod(vanity,[.236,.873,.033],[.236+s*.009,.982,.032],.005,s===1?'#7496a2':'#b99c85');
  const toilet=furniture('bathroom','toilet','坐便器',1.39,13.57,[1.90,14.17],['toilet'],'bathroom/toilet',[0,.47,.07],Math.PI/2);
  orb(toilet,0,.292,.014,.202,.192,.289,ceramic);
  soft(toilet,0,.166,.031,.224,.287,.33,.072,'#d6d9c7');
  soft(toilet,0,.418,.009,.427,.062,.565,.030,'#e4e0cd');
  soft(toilet,0,.454,.009,.415,.044,.536,.021,'#ecE8d8');
  soft(toilet,0,.559,-.253,.437,.407,.157,.042,'#dee3d1');
  soft(toilet,0,.773,-.250,.448,.045,.172,.020,ceramic);
  box(toilet,.193,.672,-.183,.044,.021,.036,chrome);
  const veranda=furniture('engawa','chair','缘侧坐垫',-7.73,16.54,[-7.00,16.54,.437],['sit','rest'],'balcony/chair',[0,.208,.012],0,.437);
  soft(veranda,0,.075,0,.72,.135,.59,.047,'#9a8066');
  soft(veranda,0,.159,0,.667,.109,.553,.042,greenCheck);book(veranda,.481,.005,0,.194,.028,.24,'#936955');
  const pot=furniture('engawa','plant','廊下的山茶',-2.62,16.63,[-3.28,16.53,.437],['water','look'],'balcony/plant',[0,.599,0],0,.437);
  plant(pot,0,0,0,1.04,true);bowl(pot,-.279,.007,.08,.113,'#7c9897');
}
