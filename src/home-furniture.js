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
  const greenCheck=cloth('mustard pinstripe','#d8a651','#e8bf6c','#b99255');
  const redCheck=cloth('coral pinstripe','#e67d70','#f19e83','#d16b66');
  const blueCheck=cloth('midnight windowpane','#465d71','#91a4ad','#738c9c');
  // A sewn border and large spaced sashiko fans remain legible at dollhouse scale.
  function quiltPrint(name,base,stitch,edge){
    return tex(name,512,512,(c,w,h)=>{
      c.fillStyle=base;c.fillRect(0,0,w,h);
      c.strokeStyle=stitch;c.lineWidth=2.7;c.setLineDash([6,3]);
      for(let j=-1;j<9;j++)for(let i=-1;i<9;i++){
        const x=i*72+(j%2)*36,y=j*54;
        for(const r of [10,20,30]){c.beginPath();c.arc(x,y,r,Math.PI,2*Math.PI);c.stroke();}
      }
      c.setLineDash([]);c.fillStyle=edge;c.fillRect(0,h-76,w,76);
      for(const y of [h-69,h-57,h-16]){
        c.strokeStyle=stitch;c.lineWidth=2;c.beginPath();c.moveTo(0,y);c.lineTo(w,y);c.stroke();
      }
      for(let n=0;n<w;n+=28){
        c.strokeStyle=stitch;c.setLineDash([4,3]);c.beginPath();c.moveTo(n,h-39);c.lineTo(n+8,h-46);c.lineTo(n+16,h-39);c.lineTo(n+8,h-32);c.closePath();c.stroke();
      }
      c.fillStyle='rgba(245,225,196,.07)';for(let n=0;n<w;n+=4)c.fillRect(n,0,1,h);
    });
  }
  function stripedOak(g,x,y,z,w,d,lamp=false){
    const map=tex(lamp?'chestnut under desk lamp':'chestnut grain',512,288,(c,wi,he)=>{
      c.fillStyle='#bb916c';c.fillRect(0,0,wi,he);
      for(let i=0;i<87;i++){
        c.strokeStyle=i%4?'rgba(93,58,40,.09)':'rgba(250,222,175,.25)';
        c.lineWidth=i%5===0?2:1;c.beginPath();const yy=i*3.52;
        c.moveTo(0,yy);c.bezierCurveTo(118,yy+Math.sin(i*.23)*10,324,yy+Math.cos(i*.47)*13,wi,yy+2);c.stroke();
      }
      if(lamp){
        // The small enamel lamp warms the wood just around the print.
        c.save();c.translate(103,151);c.scale(1.40,1);
        const wash=c.createRadialGradient(0,0,0,0,0,125);
        wash.addColorStop(0,'rgba(255,215,139,.63)');wash.addColorStop(.46,'rgba(255,203,135,.38)');wash.addColorStop(1,'rgba(255,186,128,0)');
        c.fillStyle=wash;c.fillRect(-126,-126,252,252);c.restore();
      }
    });
    return surface(g,map,x,y,z,w,d,0,true);
  }
  function kotatsuSkirt(g){
    const positions=[],uv=[],ix=[],segments=96;
    const profile=[[.312,.552,.285],[.301,.602,.324],[.244,.635,.37],[.149,.692,.438],[.084,.739,.478],[.049,.765,.50]];
    for(let j=0;j<profile.length;j++){
      const [height,hx,hz]=profile[j],drop=j/(profile.length-1);
      for(let i=0;i<=segments;i++){
        const a=i/segments*Math.PI*2,cs=Math.cos(a),sn=Math.sin(a);
        // A superellipse with a gentle radial pleat drapes over all four corners.
        const fold=(.5+.5*Math.sin(a*18+.35*Math.sin(a*5)))*drop;
        positions.push(Math.sign(cs)*Math.pow(Math.abs(cs),.42)*(hx+.019*fold),
          height+.026*fold+drop*.006*Math.sin(a*7),
          Math.sign(sn)*Math.pow(Math.abs(sn),.42)*(hz+.022*fold));
        uv.push(i/segments*4,1-drop);
        if(i<segments&&j<profile.length-1){
          const p=j*(segments+1)+i,n=p+segments+1;
          ix.push(p,p+1,n,p+1,n+1,n);
        }
      }
    }
    const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
    geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geom.setIndex(ix);geom.computeVertexNormals();
    const print=quiltPrint('kotatsu indigo wave','#40576a','#c5cab9','#a35d43');
    print.wrapS=THREE.RepeatWrapping;
    const skirt=add(g,geom,new THREE.MeshStandardMaterial({map:print,roughness:1,side:THREE.DoubleSide}),0,0,0);
    skirt.name='kotatsu-quilt';
  }
  const sofa=furniture('living','sofa','布艺沙发',-7.50,10.78,[-6.30,10.30],['sit','nap','tv','phone'],'living/sofa',[.18,.435,-.07]);
  legs(sofa,0,0,1.88,.62,.20,steel,.029);
  soft(sofa,0,.244,0,2.14,.28,.83,.06,'#627d76');
  soft(sofa,0,.585,.315,2.05,.56,.245,.095,'#82998a');
  for(const i of [-1,1]){
    soft(sofa,i*.474,.398,-.068,.927,.162,.61,.07,'#a7b7a1');
    soft(sofa,i*1.02,.493,-.007,.169,.43,.781,.076,'#809789');
    const p=soft(sofa,i*.641,.632,.105,.38,.36,.16,.072,i>0?redCheck:greenCheck);p.rotation.set(-.21,0,i*.15);
  }
  // A loose knitted throw wraps the far arm and falls behind the seat, visible from the garden.
  soft(sofa,.596,.875,.315,.391,.033,.255,.015,'#c98968');
  soft(sofa,.596,.696,.449,.391,.339,.032,.014,'#c98968');
  for(let n=0;n<7;n++)box(sofa,.433+n*.053,.511,.450,.014,.062,.018,'#d9b08a');
  const rug=furniture('living','rug','棉织暖桌敷垫',-7.43,9.80,[-6.30,9.90],['sit','rest'],'living/rug',[.93,.022,.33]);
  soft(rug,0,.011,0,2.64,.022,1.73,.01,'#596973');
  const rugArt=tex('woven cotton runner',512,320,(c,w,h)=>{
    c.fillStyle='#c8ab8c';c.fillRect(0,0,w,h);
    for(const edge of [0,w-70]){
      c.fillStyle='#a38f78';c.fillRect(edge,0,70,h);
      for(const x of [edge+9,edge+17,edge+55]){c.fillStyle='#e4cfad';c.fillRect(x,0,3,h);}
    }
    for(let y=0;y<h;y+=3){c.fillStyle=y%2?'rgba(255,244,216,.25)':'rgba(82,68,59,.15)';c.fillRect(0,y,w,1);}
  });
  surface(rug,rugArt,0,.023,0,2.606,1.70,0,true);
  const coffee=furniture('living','coffeeTable','被炉与煎茶',-7.51,9.78,[-6.55,9.83],['drink','read'],null,[0,.384,.06]);
  legs(coffee,0,0,.89,.445,.320,oak,.029);
  kotatsuSkirt(coffee);
  soft(coffee,0,.313,0,1.23,.048,.666,.023,'#b07154');
  soft(coffee,0,.354,0,1.21,.064,.63,.031,'#ab7853');
  stripedOak(coffee,0,.387,0,1.167,.587);
  soft(coffee,-.151,.401,.001,.510,.025,.292,.012,'#785045');
  const tea='#62887b';
  orb(coffee,-.223,.474,.002,.086,.066,.076,tea);
  cyl(coffee,-.223,.533,.002,.055,.072,.017,tea,{segments:18});
  orb(coffee,-.223,.550,.002,.019,.011,.018,'#526f65');
  rod(coffee,[-.277,.476,-.003],[-.346,.520,-.014],.021,tea);
  rod(coffee,[-.218,.498,-.048],[-.179,.531,-.120],.016,'#8f7358');
  cup(coffee,.011,.418,.045,'#e7d9b8',.69,'#85905c');
  bowl(coffee,.251,.390,.019,.116,'#92a1a2');
  for(const [x,y,z] of [[.217,.466,.030],[.282,.468,-.004],[.259,.492,.050]]){
    orb(coffee,x,y,z,.044,.039,.043,'#dd9850');orb(coffee,x,y+.037,z,.008,.004,.008,'#7e8561');
  }
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

  const bed=furniture('bedroom','bed','桦木床与棉绗被',-7.93,14.54,[-6.76,14.27],['sleep','nap'],'her_room/bed',[0,.488,.17]);
  legs(bed,0,0,1.43,1.97,.223,'#816b57',.053);
  soft(bed,0,.215,0,1.72,.165,2.18,.037,'#b39170');
  soft(bed,0,.375,0,1.61,.238,2.049,.083,'#eee4d2');
  // Eight softly pinched tufts interrupt the high loft of the kakebuton.
  // The continuously curved surface carries its printed border over the foot.
  const duvetGeo=new THREE.PlaneGeometry(1,1,36,40);
  const vertices=duvetGeo.attributes.position;
  for(let i=0;i<vertices.count;i++){
    const x=vertices.getX(i)*1.69,z=.246-vertices.getY(i)*1.55;
    const side=Math.pow(Math.abs(x)/.845,4),foot=Math.max(0,(z-.744)/.277);
    let y=.645-.099*side-.085*foot*foot+.012*Math.cos(x*11+z*1.7);
    for(const col of [-.56,-.19,.19,.56])for(const row of [.012,.546])
      y-=.050*Math.exp(-((x-col)**2/.0042+(z-row)**2/.012));
    vertices.setXYZ(i,x,y,z);
  }
  vertices.needsUpdate=true;duvetGeo.computeVertexNormals();
  const duvetMap=tex('apricot hinoki quilt',512,640,(c,w,h)=>{
    c.fillStyle='#c99c86';c.fillRect(0,0,w,h);
    c.strokeStyle='#d8b4a0';c.lineWidth=3;c.setLineDash([7,4]);
    for(let n=-5;n<11;n++){
      c.beginPath();c.moveTo(n*76,0);c.lineTo(n*76+h*.65,h);c.stroke();
      c.beginPath();c.moveTo(n*76,0);c.lineTo(n*76-h*.65,h);c.stroke();
    }
    c.setLineDash([]);c.fillStyle='#915e51';c.fillRect(0,h*.78,w,h*.22);
    c.fillStyle='#f0d8b9';c.fillRect(0,h*.801,w,7);c.fillRect(0,h*.952,w,5);
    for(let i=-1;i<12;i++){
      c.fillStyle='#d6ac8c';c.beginPath();c.moveTo(i*49,h*.88);c.lineTo(i*49+16,h*.836);c.lineTo(i*49+32,h*.88);c.lineTo(i*49+16,h*.924);c.closePath();c.fill();
    }
  });
  const duvet=add(bed,duvetGeo,new THREE.MeshStandardMaterial({map:duvetMap,roughness:1,side:THREE.DoubleSide}),0,0,0);
  duvet.name='kakebuton';
  for(const side of [-1,1])soft(bed,side*.814,.499,.253,.078,.135,1.41,.038,'#c49a85');
  soft(bed,0,.643,-.415,1.645,.046,.203,.022,'#f0e6d2').rotation.z=.006;
  for(const s of [-1,1]){
    const pillow=soft(bed,s*.397,.542,-.747,.687,.175,.392,.081,'#f0e8d5');
    pillow.rotation.y=s*.041;
    soft(bed,s*.397+s*.235,.599,-.752,.057,.045,.314,.018,'#bdc5b1').rotation.y=s*.041;
  }
  soft(bed,0,.581,-1.055,1.73,.548,.090,.040,'#ad8d70');
  for(let i=0;i<10;i++)box(bed,-.715+i*.159,.60,-1.002,.040,.410,.014,'#bfa180');
  const bedside=furniture('bedroom','bedside','床头文库与纸灯',-6.76,13.45,[-6.62,13.93],['read','toggle'],'her_room/bedside',[0,.54,0]);
  legs(bedside,0,0,.345,.315,.13,walnut,.029);box(bedside,0,.286,0,.454,.329,.374,oak);
  box(bedside,0,.314,.194,.394,.189,.015,maple);box(bedside,0,.33,.212,.098,.015,.027,brass);
  const lampX=-.082,lampZ=-.044;
  cyl(bedside,lampX,.472,lampZ,.087,.109,.034,'#594d44',{segments:15});
  rod(bedside,[lampX,.483,lampZ],[lampX,.558,lampZ],.016,'#736b56');
  const shadeProfile=[[.047,.536],[.094,.548],[.125,.585],[.144,.65],[.143,.729],[.118,.80],[.078,.832],[.049,.838]];
  const shadeShape=new THREE.LatheGeometry(shadeProfile.map(([r,y])=>new THREE.Vector2(r,y)),24);
  add(bedside,shadeShape,k.mat('#ffe8bf',{emissive:'#ffd296',intensity:.70}),lampX,0,lampZ);
  for(const [r,y] of shadeProfile.slice(1,-1))cyl(bedside,lampX,y,lampZ,r+.001,r+.001,.0032,'#b09a7b',{segments:24});
  cyl(bedside,lampX,.839,lampZ,.048,.05,.009,'#7e6856',{segments:16});
  k.glow(bedside,lampX,.69,lampZ,'#ffd4a2',.47,.13);
  book(bedside,.127,.454,.080,.108,.026,.16,'#758c91');book(bedside,.124,.482,.072,.105,.022,.15,'#c59776');
  box(bedside,.135,.503,.15,.021,.002,.037,'#aa725c');
  const ward=furniture('bedroom','wardrobe','杉木推拉衣柜',-5.31,14.80,[-5.98,14.66],['dress','open'],'her_room/wardrobe',[0,1.04,.287],-Math.PI/2);
  const cabinetCedar=tex('quarter sawn cedar',288,576,(c,w,h)=>{
    c.fillStyle='#c29b72';c.fillRect(0,0,w,h);
    for(let i=0;i<77;i++){
      const x=i*3.92-5, bow=8*Math.sin(i*.21);
      c.strokeStyle=i%3?'rgba(112,74,49,.15)':'rgba(244,214,166,.40)';
      c.lineWidth=i%5===0?2.7:1.2;c.beginPath();c.moveTo(x,-1);
      c.bezierCurveTo(x+bow,h*.42,x-bow*.5,h*.73,x+2*Math.sin(i*.41),h+1);c.stroke();
    }
  });
  const walnutEdge='#90694d',cedarFrame='#b38b64';
  soft(ward,0,.943,0,1.226,1.806,.442,.012,'#aa805e');
  box(ward,0,.052,0,1.166,.104,.392,'#725441');
  box(ward,0,1.867,0,1.269,.044,.486,'#c7a47b');
  stripedOak(ward,0,1.890,0,1.239,.455);
  for(const s of [-1,1]){
    const x=s*.299;
    // Lower bypass doors and paper-faced overhead storage share a slim stile.
    box(ward,x,.723,.226,.585,1.229,.037,cedarFrame);
    surface(ward,cabinetCedar,x,.723,.246,.541,1.183);
    soft(ward,s*.077,.753,.248,.040,.143,.010,.005,'#a68260');
    soft(ward,s*.077,.753,.254,.023,.116,.002,.001,'#6c5142');
    box(ward,x,1.57,.223,.585,.442,.038,cedarFrame);
    box(ward,x,1.57,.246,.530,.386,.008,'#e2d2ae');
    box(ward,x,1.564,.254,.534,.012,.009,'#c4a783');
    // The exposed narrow end is a single veneered panel framed in hardwood.
    box(ward,s*.612,.962,0,.018,1.729,.416,walnutEdge);
    surface(ward,cabinetCedar,s*.624,.962,0,.379,1.680,s*Math.PI/2);
  }
  // Eleven full-height oak battens articulate the reverse seen in cutaway.
  box(ward,0,.962,-.222,1.196,1.746,.018,'#88674f');
  const battenTones=['#b8926a','#c5a179','#b68c65','#bb9770'];
  for(let i=0;i<11;i++){
    box(ward,(i-5)*.105,.964,-.234,.082,1.665,.016,battenTones[i%battenTones.length]);
  }
  for(const y of [.105,1.823])box(ward,0,y,-.233,1.211,.050,.020,'#ac845f');
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
  stripedOak(dining,0,.777,0,1.542,.836);
  soft(dining,0,.784,0,.258,.014,.903,.006,'#576e75');
  for(const s of [-1,1])box(dining,s*.106,.793,0,.008,.003,.861,'#d6c2a4');
  for(const x of [-.402,.402])for(const s of [-1,1]){
    stool(dining,x,s*.678,s===1?0:Math.PI);
    soft(dining,x,.790,s*.232,.547,.026,.337,.012,'#7f5c49');
    soft(dining,x,.807,s*.232,.512,.010,.307,.005,'#996e54');
    const riceX=x-.116, soupX=x+.114;
    bowl(dining,riceX,.817,s*.215,.075,s===1?'#7c9890':'#94a4a8');
    orb(dining,riceX,.853,s*.215,.060,.024,.060,'#f7ecd5');
    bowl(dining,soupX,.817,s*.169,.063,'#704438','#a97842');
    for(const d of [-.015,.016])orb(dining,soupX+d,.848,s*.160,.010,.003,.008,'#809264');
    soft(dining,x+.014,.829,s*.290,.131,.019,.074,.009,'#d4d9c5');
    orb(dining,x+.010,.849,s*.289,.052,.016,.024,'#c78568');
    for(const d of [-.009,.009])rod(dining,[x-.110,.820,s*.362+d],[x+.079,.821,s*.362+d],.004,'#423c39');
  }
  cyl(dining,0,.855,-.006,.061,.077,.124,'#7d9590',{segments:18});
  cyl(dining,0,.930,-.006,.034,.051,.035,'#9ab0a4',{segments:18});
  for(const s of [-1,1]){
    const branch=[[0,.94,-.006],[s*.022,1.04,s*.005],[s*.055,1.128,s*.013],[s*.096,1.181,s*.020]];
    for(let i=1;i<branch.length;i++)rod(dining,branch[i-1],branch[i],.0045,'#766454');
    for(let i=1;i<4;i++){const [x,y,z]=branch[i];orb(dining,x,y+.008,z,.019,.015,.018,i%2?'#ead0b8':'#dcad9e');}
  }
  const sideboard=furniture('dining','teaCabinet','茶罐与珐琅水壶',-3.26,8.59,[-2.13,9.01],['tea','inspect'],null,[0,.827,.15]);
  box(sideboard,0,.38,0,1.34,.71,.357,'#638787');box(sideboard,0,.75,0,1.38,.042,.396,'#d2c7ad');
  for(const x of [-.32,.32]){
    box(sideboard,x,.379,.186,.603,.59,.022,'#779b95');
    box(sideboard,x,.414,.202,.056,.017,.019,brass);
  }
  bowl(sideboard,-.32,.772,.00,.116,'#79969a');cup(sideboard,-.07,.773,.024,cream,.76);
  for(let i=0;i<3;i++)cyl(sideboard,-.435,.786+i*.014,-.037,.109,.101,.014,'#dbe1ce',{segments:18});
  cyl(sideboard,.096,.845,-.073,.048,.046,.140,'#869b8b',{segments:14});
  cyl(sideboard,.096,.922,-.073,.050,.050,.020,'#b39764',{segments:14});
  soft(sideboard,.410,.789,-.008,.245,.035,.241,.017,'#59585a');
  const kettleProfile=[[.062,.810],[.096,.821],[.114,.853],[.115,.932],[.097,.976],[.073,.996]];
  add(sideboard,new THREE.LatheGeometry(kettleProfile.map(([r,y])=>new THREE.Vector2(r,y)),20),k.mat('#b65343',{roughness:.30}),.410,0,-.008);
  cyl(sideboard,.41,1.0,-.008,.064,.082,.022,'#c9785b',{segments:20});
  cyl(sideboard,.41,1.023,-.008,.020,.026,.022,walnut,{segments:12});
  rod(sideboard,[.321,.882,-.008],[.262,.915,-.013],.023,'#b85b47');
  rod(sideboard,[.262,.915,-.013],[.231,.966,-.022],.016,'#c67659');
  rod(sideboard,[.426,.974,-.096],[.469,1.078,-.045],.012,charcoal);
  rod(sideboard,[.469,1.078,-.045],[.469,1.078,.049],.017,'#ae8e69');
  rod(sideboard,[.469,1.078,.049],[.427,.974,.085],.012,charcoal);

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
  // A small appliance pull-out keeps the rice cooker over the existing shelf
  // footprint. The vermilion lacquer soup bowl sits beside it.
  soft(pantry,-.045,1.287,.022,1.032,.033,.416,.013,'#b88e65');
  soft(pantry,-.196,1.426,.025,.348,.246,.301,.066,'#dfd5bc');
  soft(pantry,-.196,1.554,.025,.356,.071,.307,.033,'#c9c4ae');
  soft(pantry,-.196,1.529,.168,.319,.025,.024,.008,'#8c8e80');
  soft(pantry,-.196,1.572,.075,.164,.028,.112,.012,'#7f8980');
  box(pantry,-.213,1.588,.066,.081,.004,.039,'#b1c3a3');
  cyl(pantry,-.126,1.587,.088,.014,.014,.005,'#bf8a67',{segments:10});
  for(let i=0;i<4;i++)box(pantry,-.285+i*.022,1.592,-.070,.012,.004,.037,'#96988d');
  const lidHandle=add(pantry,geo('rice-cooker handle',()=>new THREE.TorusGeometry(.13,.012,6,18,Math.PI)),k.mat('#8a8978'),-.196,1.421,.028);
  lidHandle.rotation.x=-.18;
  bowl(pantry,.272,1.307,.010,.112,'#9c4d3a','#59443a');
  bowl(pantry,.272,1.346,.010,.114,'#9a4938','#745142');
  rod(pantry,[.194,1.424,.080],[.374,1.426,-.064],.008,'#645443');
  rod(pantry,[.208,1.424,.093],[.389,1.426,-.051],.008,'#645443');

  // A narrow wheeled work table leaves both routes between the hob and sink open.
  const prep=furniture('kitchen','prepCart','木质备菜推车',-3.49,14.40,[-3.41,13.80],['inspect','cook'],null,[0,.77,.11],-.08);
  for(const x of [-.40,.40])for(const z of [-.21,.21]){
    const wheel=cyl(prep,x,.058,z,.056,.056,.039,'#4c4e4a',{segments:12});
    wheel.rotation.z=Math.PI/2;
    box(prep,x,.414,z,.060,.673,.060,'#a87955');
  }
  box(prep,0,.771,0,1.00,.086,.57,'#bf916a');
  box(prep,0,.722,0,.92,.045,.486,'#8e6047');
  for(let i=0;i<5;i++)box(prep,0,.219,-.192+i*.096,.86,.033,.077,'#ab845e');
  soft(prep,-.18,.329,.024,.334,.196,.297,.027,'#bc9870');
  for(const y of [.263,.301,.341,.380,.418])box(prep,-.18,y,.177,.340,.016,.012,'#d1ac7d');
  for(const x of [-.28,-.175,-.07])box(prep,x,.336,.180,.011,.174,.009,'#aa805a');
  bowl(prep,.226,.239,-.01,.131,'#c4d0bb');bowl(prep,.226,.276,-.01,.131,'#7b9390');
  box(prep,.292,.821,0,.27,.012,.55,'#ad6d58');
  box(prep,.292,.736,.289,.27,.18,.013,'#ad6d58');
  for(const x of [.19,.206,.379,.394])box(prep,x,.741,.297,.006,.16,.004,'#e1c6a3');
  soft(prep,-.135,.834,-.008,.53,.037,.342,.016,'#d5ac79');
  const root=orb(prep,-.16,.898,-.012,.122,.056,.054,'#e4e1bd');root.rotation.z=.12;
  for(const [x,z] of [[.070,.043],[.086,-.030],[.045,-.081]]){
    rod(prep,[-.057,.914,-.012],[x,.956,z],.009,'#749561');
    const leaf=orb(prep,x,.958,z,.042,.013,.030,'#5a805b');leaf.rotation.y=-z*4;
  }
  for(const z of [.064,.13])cyl(prep,-.29,.860,z,.043,.042,.015,'#e9e1c2',{segments:14});

  const shoes=furniture('genkan','shoe','玄关鞋柜',2.54,9.48,[1.94,9.95,.327],['dress','open'],'foyer/shoe',[0,.71,.17],-Math.PI/2,.327);
  // A flip day-calendar and lacquer key tray are fixed to the
  // shoe cabinet itself, so the entry remains furnished in the wall-free view.
  const calendarPrint=tex('genkan day calendar',192,238,(c,w,h)=>{
    c.fillStyle='#f3e9ce';c.fillRect(0,0,w,h);c.fillStyle='#4f696b';c.fillRect(0,0,w,45);
    c.fillStyle='#e8dfc3';c.textAlign='center';c.font='bold 20px "Yu Gothic",sans-serif';c.fillText('霜　月',w/2,31);
    c.fillStyle='#594c49';c.font='bold 106px Georgia,serif';c.fillText('14',w/2,151);
    c.strokeStyle='#a77c62';c.lineWidth=2;c.beginPath();c.moveTo(28,169);c.lineTo(164,169);c.stroke();
    c.fillStyle='#966d55';c.font='bold 18px "Yu Gothic",sans-serif';c.fillText('土 曜 日',w/2,201);
  });
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
  // The mirror and canvas market bag sit on a rack fixed to the shoe cabinet.
  for(const x of [-.552,.552])box(shoes,x,1.126,-.176,.05,.89,.052,'#ad8058');
  box(shoes,0,1.539,-.175,1.154,.088,.054,'#ae815f');
  const rim=cyl(shoes,-.247,1.322,-.128,.238,.238,.043,'#9c7655',{segments:32});
  rim.rotation.x=Math.PI/2;
  const mirror=cyl(shoes,-.247,1.322,-.100,.215,.215,.019,'#a7b8b5',{segments:32,metalness:.35,roughness:.30});
  mirror.rotation.x=Math.PI/2;
  box(shoes,.310,1.503,-.118,.032,.044,.088,'#a58b63');
  k.line(shoes,[[.210,1.296,-.090],[.282,1.473,-.091],[.311,1.49,-.088],[.402,1.296,-.088]],'#a38a6b',.014);
  soft(shoes,.302,1.128,-.082,.310,.368,.088,.033,'#d7c4a2');
  for(const x of [.198,.216,.393])box(shoes,x,1.117,-.033,.012,.326,.005,'#7e8882');
  box(shoes,-.035,.789,.003,.191,.028,.161,'#745447');
  rod(shoes,[-.035,.811,-.032],[-.035,1.030,-.059],.008,brass);
  box(shoes,-.035,.956,-.044,.143,.168,.022,'#866d56');
  surface(shoes,calendarPrint,-.035,.956,-.031,.133,.158);
  soft(shoes,.123,.781,.088,.168,.030,.105,.014,'#915e4e');
  const keyLoop=add(shoes,geo('entry key ring',()=>new THREE.TorusGeometry(.020,.003,5,12)),k.mat(brass),.094,.798,.088);
  keyLoop.rotation.x=-Math.PI/2;box(shoes,.130,.799,.090,.052,.006,.010,chrome);
  // A flat indigo runner across the lower genkan follows the timber step.
  // It belongs to the shoe station's geometry and leaves the walking height intact.
  const genkanRug=tex('genkan indigo sashiko runner',480,172,(c,w,h)=>{
    c.fillStyle='#536c74';c.fillRect(0,0,w,h);
    c.fillStyle='#829694';c.fillRect(6,5,w-12,h-10);
    c.fillStyle='#526a70';c.fillRect(12,12,w-24,h-24);
    c.strokeStyle='#dacb9f';c.lineWidth=2;c.setLineDash([5,4]);c.beginPath();
    for(let x=-38;x<w+40;x+=46)for(let y=-8;y<h+20;y+=44){
      c.moveTo(x,y+22);c.lineTo(x+23,y);c.lineTo(x+46,y+22);c.lineTo(x+23,y+44);c.closePath();
    }
    c.stroke();c.setLineDash([]);
    for(let y=2;y<h;y+=4){c.fillStyle='rgba(245,234,208,.06)';c.fillRect(0,y,w,1);}
  });
  const runner=surface(shoes,genkanRug,.21,.006,1.55,1.19,.432,0,true);
  runner.rotateZ(Math.PI/2);
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
  const gallery=furniture('corridor','gallery','走廊边柜与南天插花',-7.48,12.40,[-7.48,11.91],['look'],'corridor/gallery',[0,.88,-.06]);
  box(gallery,0,.072,-.045,1.24,.144,.28,'#655045');
  box(gallery,0,.34,-.045,1.37,.42,.32,'#986c4e');
  box(gallery,0,.577,-.045,1.45,.055,.37,'#c99d73');
  for(const y of [.247,.447]){
    box(gallery,0,y,-.216,1.29,.178,.030,'#b28664');
    for(const x of [-.35,.35])box(gallery,x,y,-.237,.125,.022,.017,'#605044');
  }
  soft(gallery,-.35,.614,-.047,.44,.016,.36,.006,'#934f45');
  box(gallery,-.35,.544,-.230,.44,.124,.012,'#934f45');
  book(gallery,-.34,.623,-.05,.31,.040,.23,'#566b68');
  book(gallery,-.32,.663,-.05,.25,.026,.20,'#e8c58f');
  const vaseProfile=[[0,0],[.082,0],[.120,.036],[.155,.19],[.118,.258],[.063,.30],[.064,.321],[.047,.321],[.045,.295]];
  add(gallery,new THREE.LatheGeometry(vaseProfile.map(([r,y])=>new THREE.Vector2(r,y)),22),
    k.mat('#578886',{roughness:.30}),.25,.606,-.055);
  // One tall, one leaning and one short branch make an asymmetric arrangement.
  const stem=[.25,.91,-.055];
  for(const [x,y,z] of [[.43,1.46,-.025],[.02,1.28,-.095],[.51,1.17,-.096]]){
    const joint=[(stem[0]+x)/2,(stem[1]+y)/2,(stem[2]+z)/2];
    rod(gallery,stem,joint,.010,'#66533c');rod(gallery,joint,[x,y,z],.006,'#66533c');
    for(const s of [-1,1]){
      const end=[x+s*.070,y-.088,z+s*.036];
      rod(gallery,joint,end,.005,'#775b41');
      const leaf=orb(gallery,...end,.035,.080,.016,s<0?'#78895b':'#566f52');leaf.rotation.z=-s*.70;
      for(const [ox,oy] of [[0,0],[.027,.018],[-.018,.030]])
        orb(gallery,x+ox+s*.035,y+oy,z+s*.014,.022,.024,.022,'#ba5041');
    }
  }

  const fig=furniture('corridor','ficus','窗边的伞叶榕',-8.57,12.08,[-8.15,11.79],['water','look'],null,[0,.63,.09]);
  cyl(fig,0,.023,0,.247,.221,.045,'#9e7358',{segments:20});
  cyl(fig,0,.223,0,.235,.170,.386,'#bd805e',{segments:20});
  cyl(fig,0,.409,0,.244,.241,.061,'#c68f6c',{segments:20});
  cyl(fig,0,.439,0,.218,.218,.015,'#534d3d',{segments:20});
  const trunk=[[0,.44,0],[-.052,.81,.021],[.056,1.12,.018],[-.018,1.37,-.04]];
  k.line(fig,trunk,'#776348',.023);
  // Facets meet along a raised midrib. The taper at the tip reads in silhouette.
  const leafShape=new THREE.BufferGeometry();
  leafShape.setAttribute('position',new THREE.Float32BufferAttribute([
    0,0,0, -.12,.03,.14, 0,.065,.15, .12,.03,.14, 0,-.035,.35,
  ],3));
  leafShape.setIndex([0,1,2,0,2,3,1,4,2,2,4,3]);leafShape.computeVertexNormals();
  for(let i=0;i<12;i++){
    const a=i*2.40,h=.80+i*.048,reach=.19+.11*(.5+.5*Math.cos(i*1.8));
    const start=[Math.sin(a)*reach,h+.08,Math.cos(a)*reach];
    rod(fig,[.018,h,0],start,.008,'#807754');
    const leaf=add(fig,leafShape,k.mat(['#506e58','#6d875e','#859666'][i%3]),...start);
    leaf.rotation.set(.04+.18*Math.cos(i),a,.19*Math.sin(i));leaf.scale.setScalar(.65+.22*(i%3));
  }

  const desk=furniture('study','desk','窗边的绘图与刻印书桌',.016,15.54,[-.10,14.43],['desk','read','draw'],'her_room/desk',[0,.51,.595],Math.PI);
  for(const x of [-.731,.731]){
    box(desk,x,.388,0,.067,.684,.475,'#9f785a');
    box(desk,x,.058,0,.099,.072,.545,'#926e52');
  }
  box(desk,0,.23,-.168,1.47,.078,.057,'#916d50');
  soft(desk,0,.748,0,1.686,.073,.652,.03,'#bd966f');
  stripedOak(desk,0,.786,0,1.626,.604,true);
  box(desk,.461,.596,0,.531,.225,.481,oak);box(desk,.461,.600,.251,.49,.171,.024,maple);
  pull(desk,.461,.625,.279,.138);stool(desk,0,.595,0);
  soft(desk,.012,.791,-.008,.58,.015,.352,.006,'#6e8983');
  box(desk,-.466,.796,.095,.335,.017,.243,'#eadbb6');
  const proof=tex('two-colour rain print',256,180,(c,w,h)=>{
    c.fillStyle='#eee2c2';c.fillRect(0,0,w,h);c.fillStyle='#598183';c.fillRect(16,18,220,124);
    c.fillStyle='#e7bf86';c.beginPath();c.arc(176,52,19,0,Math.PI*2);c.fill();
    c.fillStyle='#304f62';c.beginPath();c.moveTo(16,111);c.lineTo(69,89);c.lineTo(107,108);c.lineTo(150,84);c.lineTo(236,99);c.lineTo(236,142);c.lineTo(16,142);c.fill();
    c.strokeStyle='#d9e2d2';c.lineWidth=1.5;
    for(let i=0;i<19;i++){const px=22+i*11,py=29+(i*29)%70;c.beginPath();c.moveTo(px,py);c.lineTo(px-4,py+9);c.stroke();}
    c.fillStyle='#a65847';c.fillRect(218,148,12,12);
  });
  surface(desk,proof,-.466,.805,.095,.318,.226,0,true,.12);
  // The baren's knotted bamboo sheath is used to rub a sheet against its block.
  cyl(desk,-.709,.806,.127,.064,.070,.026,'#a4784e',{segments:20});
  cyl(desk,-.709,.824,.127,.062,.065,.013,'#c5ad75',{segments:20});
  k.line(desk,[[-.751,.831,.127],[-.737,.851,.127],[-.710,.864,.127],[-.682,.855,.127],[-.669,.831,.127]],'#957348',.010);
  const inkStone=soft(desk,-.338,.815,-.116,.113,.032,.118,.018,'#434b4a');
  inkStone.rotation.y=.09;
  for(const x of [-.56,-.51]){
    rod(desk,[x,.817,-.027],[x+.077,.816,.112],.007,'#a87755');
    rod(desk,[x+.077,.816,.112],[x+.089,.816,.136],.006,'#344b4d');
  }
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
  books(studyShelf,.13,.851,.025,8,.573);plant(studyShelf,-.296,1.269,.015,.48);
  // A framed first proof and an open box of small seal blocks rest on the top shelf.
  box(studyShelf,.14,1.448,-.055,.324,.315,.030,'#976f4e');
  surface(studyShelf,proof,.14,1.449,-.037,.284,.249);
  soft(studyShelf,.350,1.293,.046,.161,.059,.126,.012,'#b98e63');
  for(let i=0;i<3;i++){box(studyShelf,.300+i*.048,1.345,.042,.034,.087,.040,'#8b6150');}

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
  // Partially retracted slatted tub cover, leaving the bathing point open.
  for(let i=0;i<6;i++)
    soft(bath,-.754+i*.072,.637,.003,.070,.034,.912,.011,i%2?'#c1b190':'#caB997');
  rod(bath,[-.754,.657,-.349],[-.388,.657,-.349],.007,'#a49b86');
  rod(bath,[-.754,.657,.349],[-.388,.657,.349],.007,'#a49b86');
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
  // A folded cotton hand towel hangs from the end of the washstand.
  rod(vanity,[-.354,.685,-.151],[-.408,.685,-.151],.012,chrome);
  rod(vanity,[-.354,.685,.133],[-.408,.685,.133],.012,chrome);
  rod(vanity,[-.410,.685,-.158],[-.410,.685,.141],.014,chrome);
  soft(vanity,-.422,.534,-.006,.027,.316,.227,.012,'#eee1c8');
  soft(vanity,-.397,.586,-.006,.021,.208,.222,.010,'#cfc7af');
  for(const y of [.402,.422])box(vanity,-.438,y,-.006,.007,.008,.226,'#9ba494');
  const toilet=furniture('bathroom','toilet','坐便器',1.39,13.57,[1.90,14.17],['toilet'],'bathroom/toilet',[0,.47,.07],Math.PI/2);
  orb(toilet,0,.292,.014,.202,.192,.289,ceramic);
  soft(toilet,0,.166,.031,.224,.287,.33,.072,'#d6d9c7');
  soft(toilet,0,.418,.009,.427,.062,.565,.030,'#e4e0cd');
  soft(toilet,0,.454,.009,.415,.044,.536,.021,'#ecE8d8');
  soft(toilet,0,.559,-.253,.437,.407,.157,.042,'#dee3d1');
  soft(toilet,0,.773,-.250,.448,.045,.172,.020,ceramic);
  box(toilet,.193,.672,-.183,.044,.021,.036,chrome);
  const veranda=furniture('engawa','chair','缘侧坐垫',-7.73,16.54,[-7.00,16.54,.437],['sit','rest'],'balcony/chair',[0,.208,.012],0,.437);
  for(const x of [-.267,.267])box(veranda,x,.036,0,.053,.072,.494,'#836447');
  soft(veranda,0,.085,0,.742,.066,.606,.022,'#b08b65');
  soft(veranda,0,.161,0,.669,.109,.546,.046,'#597377');
  // Padded zaisu with an open-centred bentwood back, seated anchor unchanged.
  for(const x of [-.259,.259])rod(veranda,[x,.097,-.229],[x,.463,-.292],.024,'#a5805e');
  soft(veranda,0,.420,-.286,.580,.149,.055,.024,'#a57e57').rotation.x=-.16;
  soft(veranda,-.105,.36,-.228,.286,.251,.081,.039,redCheck).rotation.x=-.14;
  book(veranda,.468,.010,.019,.183,.025,.208,'#936955');
  book(veranda,.464,.036,.024,.157,.019,.172,'#bfbb96');
  const pot=furniture('engawa','plant','廊下的山茶',-2.62,16.63,[-3.28,16.53,.437],['water','look'],'balcony/plant',[0,.599,0],0,.437);
  plant(pot,0,0,0,1.04,true);bowl(pot,-.279,.007,.08,.113,'#7c9897');
}
