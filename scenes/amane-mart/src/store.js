import * as THREE from 'three';

const jp = '"Yu Gothic", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Microsoft YaHei", sans-serif';
const sans = 'Arial, Helvetica, sans-serif';
const tau = Math.PI * 2;

function canvasMap(width, height, paint) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  paint(ctx, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function panel(parent, map, x, y, z, w, h, turn = 0, horizontal = false) {
  const material = horizontal ? new THREE.MeshStandardMaterial({map, roughness:.76,metalness:.13}) : new THREE.MeshBasicMaterial({map, toneMapped:false});
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  surface.receiveShadow = horizontal;
  surface.position.set(x,y,z);
  if (horizontal) surface.rotation.x = -Math.PI / 2;
  else surface.rotation.y = turn;
  parent.add(surface);
  return surface;
}

function textAt(c, text, x, y, size, color, weight = 700, face = jp) {
  c.font = `${weight} ${size}px ${face}`;
  c.textBaseline = 'middle';
  c.fillStyle = color;
  c.fillText(text,x,y);
}

// All solid pieces sharing a finish travel together as the store assembles.
// Instancing keeps the individually modelled packages, shelves and trim inexpensive.
function makeStoreResources(){
const cube = new THREE.BoxGeometry(1,1,1);
const cylinder = new THREE.CylinderGeometry(.5,.5,1,16);
const finishes = {
  shell: new THREE.MeshStandardMaterial({color:0xffffff,roughness:.77,metalness:.08}),
  shop: new THREE.MeshStandardMaterial({color:0xffffff,roughness:.77}),
  stock: new THREE.MeshStandardMaterial({color:0xffffff,roughness:.66}),
  bright: new THREE.MeshBasicMaterial({color:0xffffff,toneMapped:false}),
  metal: new THREE.MeshStandardMaterial({color:0xffffff,roughness:.56,metalness:.3})
};

return {cube,cylinder,finishes,labelAtlas:null};
}

function makePieces(parent,resources,castShadow=false) {
  const {cube,cylinder,finishes}=resources;
  const batches = new Map();
  const printVertices=[],printUV=[],printIndices=[];
  const pose = new THREE.Object3D();
  function put(shape,finish,x,y,z,w,h,d,color,rx=0,ry=0,rz=0) {
    const key = `${shape}-${finish}`;
    if (!batches.has(key)) batches.set(key,{geometry:shape==='b'?cube:cylinder, material:finishes[finish], transforms:[],colors:[]});
    const batch = batches.get(key);
    pose.position.set(x,y,z);
    pose.rotation.set(rx,ry,rz);
    pose.scale.set(w,h,d);
    pose.updateMatrix();
    batch.transforms.push(pose.matrix.clone());
    batch.colors.push(new THREE.Color(color));
  }
  return {
    b:(...args)=>put('b',...args), c:(...args)=>put('c',...args),
    print(x,y,z,w,h,cell,turn=0){
      const off=printVertices.length/3,co=Math.cos(turn),si=Math.sin(turn);
      const col=cell%4,row=Math.floor(cell/4),pad=.002;
      for(const [xx,yy,uu,vv] of [[-.5,-.5,0,0],[.5,-.5,1,0],[.5,.5,1,1],[-.5,.5,0,1]]){
        printVertices.push(x+xx*w*co,y+yy*h,z-xx*w*si);
        printUV.push(col/4+pad+uu*(.25-2*pad),1-(row+1)/4+pad+vv*(.25-2*pad));
      }
      printIndices.push(off,off+1,off+2,off,off+2,off+3);
    },
    finish() {
      for (const batch of batches.values()) {
        const mesh = new THREE.InstancedMesh(batch.geometry,batch.material,batch.transforms.length);
        batch.transforms.forEach((m,i)=>{mesh.setMatrixAt(i,m); mesh.setColorAt(i,batch.colors[i]);});
        mesh.computeBoundingSphere();
        mesh.receiveShadow=true;
        mesh.castShadow=castShadow;
        parent.add(mesh);
      }
      if(printVertices.length){
        if(!resources.labelAtlas)resources.labelAtlas=packageArt();
        const geo=new THREE.BufferGeometry();
        geo.setAttribute('position',new THREE.Float32BufferAttribute(printVertices,3));
        geo.setAttribute('uv',new THREE.Float32BufferAttribute(printUV,2));geo.setIndex(printIndices);
        parent.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:resources.labelAtlas,toneMapped:false})));
      }
    }
  };
}

export function paintAmaneMark(c,x,y,r) {
  c.save(); c.translate(x,y); c.scale(r,r);
  c.beginPath(); c.roundRect(-1,-1,2,2,.33); c.fillStyle='#147b76'; c.fill();
  c.beginPath(); c.moveTo(-.66,.21); c.quadraticCurveTo(-.58,-.33,-.06,-.58); c.quadraticCurveTo(.47,-.43,.68,.02); c.quadraticCurveTo(.45,-.05,.27,.12); c.quadraticCurveTo(.03,-.02,-.14,.18); c.quadraticCurveTo(-.4,.07,-.66,.21); c.fillStyle='#fff8d8'; c.fill();
  c.strokeStyle='#fff8d8';c.lineWidth=.092;c.lineCap='round';c.beginPath();c.moveTo(.012,.04);c.lineTo(.08,.49);c.quadraticCurveTo(.1,.71,-.15,.64);c.stroke();
  c.beginPath(); c.arc(.46,-.56,.15,0,tau); c.fillStyle='#ff956e'; c.fill();c.restore();
}

function fascia(side) {
  const w = side?1536:2048;
  return canvasMap(w,216,(c,width,h)=>{
    const bg=c.createLinearGradient(0,0,0,h); bg.addColorStop(0,'#feffe6'); bg.addColorStop(.65,'#ffefcc'); bg.addColorStop(1,'#ead4a7');
    c.fillStyle=bg;c.fillRect(0,0,width,h);
    c.fillStyle='#53c0a9'; c.fillRect(0,0,width,11);
    c.fillStyle='#177a79'; c.fillRect(0,15,width,8);
    c.fillStyle='#ee795f'; c.fillRect(0,186,width,9);
    c.fillStyle='#278f85'; c.fillRect(0,202,width,14);
    const x=side?100:132;
    paintAmaneMark(c,x,105,62);
    textAt(c,'雨音マート',x+92,111,105,'#174e53',900);
    const right=width-63;
    c.fillStyle='#215d59'; c.fillRect(right-217,56,2,96);
    textAt(c,'24',right-188,103,92,'#205d59',800,sans);
    textAt(c,'OPEN',right-73,105,28,'#205d59',800,sans);
    if(!side){
      textAt(c,'A M A N E',897,89,47,'#276764',800,sans);
      textAt(c,'M A R T',898,139,34,'#d56a4e',700,sans);
      c.fillStyle='#a1b9a5';c.fillRect(850,62,3,89);
    }
  });
}

function department(names) {
  return canvasMap(1024,70,(c,w,h)=>{
    c.fillStyle='#ffdf98';c.fillRect(0,0,w,h);
    c.fillStyle='#d58a4f';c.fillRect(0,0,w,5);
    c.fillStyle='#ffeec3';c.fillRect(0,h-7,w,4);
    names.forEach((s,i)=>{
      const x=(i+.5)*w/names.length;
      c.textAlign='center';textAt(c,s,x,37,28,'#88583e',800);
      if(i){c.fillStyle='#d8a161';c.fillRect(i*w/names.length,14,2,44);}
    });
  });
}

function poster(blue) {
  return canvasMap(256,364,(c,w,h)=>{
    c.fillStyle=blue?'#f7eccb':'#fff2ce';c.fillRect(0,0,w,h);
    c.fillStyle=blue?'#628d9b':'#e39076';c.fillRect(12,12,w-24,231);
    c.beginPath();c.arc(191,66,34,0,tau);c.fillStyle=blue?'#f5d496':'#ffe09a';c.fill();
    if(blue){
      [[12,213,67,151,109,213],[54,217,142,110,238,217],[115,218,189,150,244,218]].forEach(p=>{c.beginPath();c.moveTo(p[0],p[1]);c.lineTo(p[2],p[3]);c.lineTo(p[4],p[5]);c.fillStyle='#336774';c.fill();});
      c.fillStyle='#b5d9c5';c.fillRect(12,218,232,25);
    }else{
      for(let i=0;i<3;i++){const x=83+(i%2)*74,y=123+Math.floor(i/2)*60;c.beginPath();c.arc(x,y,39,0,tau);c.fillStyle=['#e99545','#f0b458','#e78250'][i];c.fill();c.fillStyle='#657d55';c.beginPath();c.ellipse(x+8,y-35,17,7,-.48,0,tau);c.fill();}
    }
    textAt(c,blue?'旅と、珈琲。':'季節の果実',16,270,36,'#2e4c50',800);
    textAt(c,blue?'COFFEE BREAK':'SEASONAL MARKET',18,302,17,blue?'#507881':'#b56653',700,sans);
    c.fillStyle='#d0bda2';c.fillRect(18,326,182,3);c.fillRect(18,335,141,3);
  });
}

function roofTexture(){
  return canvasMap(900,650,(c,w,h)=>{
    c.fillStyle='#35415b';c.fillRect(0,0,w,h);
    let seed=22411;const rnd=()=>((seed=(seed*16807)%2147483647)/2147483647);
    for(let j=0;j<6;j++)for(let i=0;i<8;i++){
      const x=i*120,y=j*120;
      c.fillStyle=`rgba(${rnd()>.5?'184,199,199':'17,27,43'},${.03+rnd()*.04})`;c.fillRect(x+1,y+1,118,118);
      c.fillStyle='#293346';c.fillRect(x,0,2,h);c.fillRect(x,y,120,2);
      c.fillStyle='rgba(199,221,225,.13)';c.fillRect(x+3,0,1,h);
    }
    for(let i=0;i<1800;i++){
      c.fillStyle=`rgba(${rnd()>.5?'207,218,219':'23,35,54'},${rnd()*.09})`;c.fillRect(rnd()*w,rnd()*h,1+rnd()*3,1);
    }
  });
}

function glazing(parent,x,y,z,w,h,turn=0) {
  const glass=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:'#9dddcf',transparent:true,opacity:.065,side:THREE.DoubleSide,depthWrite:false}));
  glass.position.set(x,y,z);glass.rotation.y=turn;glass.renderOrder=4;parent.add(glass);
}

const stockColors=['#d53537','#eba432','#0e8871','#efb93e','#316aa1','#db5e8c','#a3492b','#e6d2ae','#38a1b3','#d65f37','#69598b','#778c36'];
function packageArt(){
  return canvasMap(1024,1024,(c)=>{
    const colors=['#be322e','#d29b22','#16785b','#2a668e','#e47843','#924866','#286f7a','#c5b94c','#de5b54','#33578a','#866135','#76a048','#bf643c','#935b89','#784c39','#2a8e93'];
    const names=['苺','ゆず','抹茶','ラムネ','桃','ぶどう','珈琲','レモン','梅','ソーダ','麦茶','青りんご','焼芋','ベリー','カカオ','香茶'];
    for(let i=0;i<16;i++){
      const x=(i%4)*256,y=Math.floor(i/4)*256;
      c.save();c.translate(x,y);c.beginPath();c.rect(0,0,256,256);c.clip();
      c.fillStyle=colors[i];c.fillRect(0,0,256,256);
      c.fillStyle='#ffdb87';c.fillRect(0,0,256,11);
      c.fillStyle='rgba(30,20,33,.24)';c.fillRect(0,204,256,52);
      c.fillStyle=i%2?'#ffdfa0':'#f8bf6a';c.beginPath();c.ellipse(192,158,59,54,-.23,0,tau);c.fill();
      c.fillStyle=i%2?'#47845e':'#407b6e';c.beginPath();c.ellipse(205,107,24,9,-.51,0,tau);c.fill();
      textAt(c,i%3===0?'AMANE':'おいしさ',15,32,23,'#ffeece',800,sans);
      c.save();c.translate(10,105);c.rotate(-.07);textAt(c,names[i],0,0,names[i].length>2?63:90,'#fff8d2',900);c.restore();
      textAt(c,i%2?'季節限定':'ひとくち',13,224,28,'#fff4db',800);
      c.restore();
    }
  });
}

function magazineCover(index){
  return canvasMap(216,280,(c,w,h)=>{
    const cover=[['#ca4f4f','#ffdd9f','#384b71','暮らし','TOWN JOURNAL'],['#3c8c99','#f1cc82','#264761','路地','SLOW TRIP'],['#efbf70','#b24847','#556f62','喫茶','COFFEE NOTES'],['#586596','#ffa989','#e7d9a6','夜空','NIGHT WALK']][index%4];
    c.fillStyle=cover[0];c.fillRect(0,0,w,h);
    textAt(c,cover[4],13,17,12,cover[1],800,sans);textAt(c,cover[3],8,56,55,cover[1],900);
    c.fillStyle=cover[1];c.beginPath();c.arc(146,131,42,0,tau);c.fill();
    if(index%4===2){
      c.fillStyle=cover[2];c.fillRect(39,159,114,46);c.beginPath();c.ellipse(96,161,57,16,0,0,tau);c.fill();c.strokeStyle=cover[2];c.lineWidth=11;c.beginPath();c.arc(156,169,20,-1.25,1.3);c.stroke();
    }else{
      for(let n=0;n<7;n++){const bh=30+((n*37+index*31)%59);c.fillStyle=n%2?cover[2]:cover[1];c.fillRect(n*34-7,211-bh,38,bh);c.fillStyle=cover[0];for(let j=0;j<2;j++)c.fillRect(n*34+2+j*14,220-bh,6,9);}
    }
    c.fillStyle=cover[2];c.fillRect(0,211,w,69);
    textAt(c,['街の小さな店','坂道をめぐる','遠くの喫茶室','灯りのある街'][index%4],12,232,20,'#fff2cd',800);
    c.fillStyle=cover[1];c.fillRect(13,252,112,3);c.fillRect(13,260,76,3);c.fillStyle='#efe7ce';c.fillRect(171,247,29,20);
  });
}
function merchandise(s,x,y,z,width,height,depth,index,kind,rotation=0) {
  const color=stockColors[(index*5+Math.floor(index/7))%stockColors.length];
  const cal=Math.cos(rotation),sal=Math.sin(rotation);
  const piece=(dy,dz,w,h,d,col,rx=0)=>s.b('stock',x+sal*dz,y+dy,z+cal*dz,w,h,d,col,rx,rotation);
  const print=(dy,dz,w,h)=>s.print(x+sal*dz,y+dy,z+cal*dz,w,h,index%16,rotation);
  if(kind===0){
    s.c('stock',x,y+height*.45,z,width,height*.88,width,color);
    s.c('stock',x,y+height*.95,z,width*.54,height*.12,width*.54,'#eadfc6');
    s.c('stock',x,y+height*.40,z,width*1.013,height*.35,width*1.013,index%3===0?'#c7ab76':'#559483');
    print(height*.44,width*.514,width*.79,height*.50);
  } else if(kind===1){
    piece(height*.5,0,width,height,depth,color);
    print(height*.51,depth*.52,width*.96,height*.93);
  } else if(kind===2){
    piece(height*.24,0,width,height*.45,depth,'#a07955');
    piece(height*.65,0,width*.93,height*.42,depth*.94,color);
    piece(height*.86,0,width*.29,height*.07,depth*.98,'#ece4c4');
    print(height*.54,depth*.51,width*.76,height*.47);
  } else {
    piece(height*.48,0,width,height,depth,color,-.10);
    print(height*.48,depth*.59,width*.91,height*.79);
    piece(height*.94,-depth*.12,width*.98,height*.075,depth*.87,'#f0d6a2');
  }
}

export function buildStore(k) {
  const {group} = k,resources=makeStoreResources();
  const pieces=(parent,castShadow=false)=>makePieces(parent,resources,castShadow);
  const left=-4.95,right=2.15,back=-4.7,front=.55,cx=(left+right)/2,cz=(back+front)/2;
  const floor=group('Store · tiled foundation',.55),base=pieces(floor);
  base.b('shell',cx,.16,cz,7.22,.25,5.35,'#958f88');
  base.b('shop',cx,.304,cz,7.08,.07,5.22,'#eacfa8');
  for(let x=left+.11;x<right;x+=.49)base.b('shop',x,.343,cz,.011,.002,5.14,'#c1a689');
  for(let z=back+.12;z<front;z+=.49)base.b('shop',cx,.344,z,7.03,.002,.011,'#c1a689');
  base.b('shell',cx,.23,front+.09,7.20,.16,.2,'#adb0a8');
  base.finish();

  const walls=group('Store · walls and wainscot',1.08),w=pieces(walls);
  w.b('shell',cx,1.75,back,7.11,2.94,.14,'#71868c');
  w.b('shell',left,1.75,cz,.13,2.94,5.24,'#839298');
  w.b('shop',cx,1.73,back+.077,6.98,2.79,.032,'#e4c696');
  w.b('shop',left+.075,1.73,cz,.034,2.79,5.17,'#e8c999');
  // Tile dados wrap the viewing corner. The automatic doors run down to the threshold.
  const doorL=-.34,doorR=1.39;
  for(const [a,b] of [[left,doorL],[doorR,right]]){
    const mid=(a+b)/2;
    w.b('shell',mid,.49,front,b-a,.40,.12,'#477e7d');
    w.b('metal',mid,.711,front+.015,b-a,.048,.134,'#9daaa7');
    w.b('shell',mid,.298,front+.067,b-a,.045,.022,'#364c54');
    w.b('shell',mid,.477,front+.063,b-a,.009,.01,'#6b9790');
    for(let x=a+.33;x<b-.02;x+=.33)w.b('shell',x,.495,front+.065,.012,.375,.012,'#61908c');
  }
  w.b('shell',right,.49,cz,.14,.40,5.25,'#477c7b');
  w.b('metal',right+.01,.711,cz,.17,.048,5.25,'#9baaa6');
  for(let z=back+.34;z<front;z+=.34)w.b('shell',right+.075,.496,z,.012,.375,.009,'#648d89');
  // Rear utility cladding is visible through a full orbit.
  for(let x=left+.19;x<right;x+=.66)w.b('shell',x,1.71,back-.079,.021,2.82,.015,'#617681');
  for(let z=back+.2;z<front;z+=.65)w.b('shell',left-.076,1.74,z,.014,2.88,.02,'#6b7e83');
  w.b('shell',.72,1.47,back-.084,1.07,2.27,.04,'#455c69');
  w.b('metal',.72,1.44,back-.111,.98,2.15,.031,'#6e8289');
  w.b('metal',1.06,1.33,back-.14,.16,.039,.047,'#c5cbc3');
  w.b('shell',-3.88,1.24,back-.14,.72,.85,.18,'#526c76');
  for(let i=0;i<7;i++)w.b('metal',-3.88,1.01+i*.063,back-.244,.56,.023,.033,'#9da7a1');
  w.finish();

  const cases=group('Store · illuminated refrigerators',1.35),s=pieces(cases);
  const caseX=[-4.17,-2.83,-1.49,-.15,1.19];
  caseX.forEach((x,i)=>{
    s.b('shop',x,1.52,-4.39,1.29,2.35,.38,'#74695c');
    s.b('bright',x,1.55,-4.181,1.185,2.05,.032,i%2?'#698e91':'#7a8582');
    s.b('shop',x,.465,-4.05,1.29,.23,.63,'#7c786d');
    s.b('metal',x,.513,-3.726,1.22,.052,.028,'#928981');
    s.b('bright',x,2.59,-4.035,1.27,.075,.42,'#ffebbd');
    s.b('bright',x,2.54,-3.81,1.19,.029,.028,'#c7fff6');
    s.b('bright',x-.587,1.55,-3.88,.018,1.95,.016,'#8ddcda');
    for(const side of [-1,1])s.b('metal',x+side*.63,1.54,-3.83,.041,2.12,.055,'#a9a899');
    for(let j=0;j<4;j++){
      const sy=.60+j*.48;
      s.b('shop',x,sy,-4.03,1.20,.045,.54,'#98958a');
      s.b('bright',x,sy-.001,-3.752,1.19,.057,.018,j%2?'#699e9d':'#92c8c1');
      for(let t=0;t<5;t++){
        const id=i*53+j*7+t;
        const ht=.261+((id*19)%9)*.009;
        const kind=i===3||i===4?0:(i===0?2:(j%2===0?1:0));
        merchandise(s,x+(t-2)*.226,sy+.027,-3.94,.149,kind===2?.17:ht,.173,id,kind);
        s.b('bright',x+(t-2)*.226,sy+.002,-3.741,.096,.029,.009,'#ffefd0');
      }
    }
  });
  s.b('shop',cx,2.76,-4.06,6.73,.29,.52,'#d9b17e');
  panel(cases,department(['お弁当','サンドイッチ','デザート','お茶 · 飲料','冷たい飲みもの']),cx,2.768,-3.788,6.71,.285);
  s.finish();

  const aisles=group('Store · stocked aisles',1.64),a=pieces(aisles);
  function aisle(x,z,length,levels,sideways=false,offset=0){
    const rot=sideways?Math.PI/2:0;
    const world=(u,v)=>[x+Math.cos(rot)*u+Math.sin(rot)*v,z-Math.sin(rot)*u+Math.cos(rot)*v];
    const part=(u,y,v,w,h,d,col,finish='shop')=>{const p=world(u,v);a.b(finish,p[0],y,p[1],w,h,d,col,0,rot);};
    const pitch=.32;
    part(0,.44,0,length,.18,.57,'#695c51');
    part(0,.51+(levels-1)*pitch/2,-.145,length,.13+(levels-1)*pitch,.07,'#88765f');
    for(const side of [-1,1])part(side*(length/2-.03),.53+(levels-1)*pitch/2,-.17,.043,.2+(levels-1)*pitch,.046,'#b4a38b');
    for(let j=0;j<levels;j++){
      const sy=.53+j*pitch;
      part(0,sy,.013,length,.045,.61,'#ae9e84');
      part(0,sy,.322,length,.079,.033,j===0?'#984f3a':'#956e4d');
      const count=Math.floor(length/.207);
      for(let i=0;i<count;i++){
        const u=(i-(count-1)/2)*(length-.10)/count;
        const p=world(u,.145);
        const kind=(j+offset)%3===0?3:((j+offset)%3===1?1:2);
        const id=offset*11+13*j+i;
        merchandise(a,p[0],sy+.027,p[1],.145+(id%3)*.008,kind===2?.139:.216+(id%4)*.011,.147,id,kind,rot);
        if(i%2===0)part(u,sy,.343,.124,.045,.009,'#fff2d4','bright');
      }
    }
  }
  aisle(-2.77,-1.08,2.65,4,false,2);
  aisle(-1.43,-2.45,2.04,3,false,6);
  aisle(-4.54,-2.38,2.85,5,true,9);
  // A stepped magazine stand faces the glass at the front of the shop.
  a.b('shop',-4.20,.56,.029,1.25,.41,.52,'#745f50');
  a.b('shop',-4.20,.723,.039,1.27,.11,.55,'#a8805c');
  for(const [row,y,z] of [[0,.977,.245],[1,1.316,-.081]]){
    a.b('shop',-4.20,y-.166,z-.021,1.24,.27,.11,'#9b8168',-.14);
    for(let j=0;j<4;j++){
      const mx=-4.65+j*.298,idx=(j+row*2)%4;
      a.b('shop',mx,y,z,.279,.38,.048,'#efdfbf',-.135);
      const book=panel(aisles,magazineCover(idx),mx,y+.004,z+.026,.274,.376);
      book.rotation.x=-.135;
    }
    a.b('metal',-4.20,y-.142,z+.057,1.26,.023,.022,'#697978');
  }
  // Fresh-baked case just inside the display window.
  a.b('shop',-1.04,.6,-.032,.76,.52,.53,'#c49b71');
  a.b('shop',-1.04,.89,-.03,.81,.052,.56,'#ead4aa');
  for(let i=0;i<3;i++)for(let j=0;j<2;j++){
    const bx=-1.29+i*.24,bz=-.13+j*.19;
    a.c('stock',bx,.96,bz,.215,.105,.15,['#dba460','#e8b978','#d6a05e'][i],0,.15*(i-j));
    a.b('bright',bx,1.014,bz,.069,.005,.013,'#eed1a0',0,-.29);
  }
  a.finish();

  const checkout=group('Store · checkout and posters',1.88),co=pieces(checkout);
  co.b('shop',1.31,.77,-2.00,.76,.86,1.80,'#c6a175');
  co.b('shop',1.31,1.227,-2.0,.84,.076,1.90,'#ece1ba');
  co.b('shop',1.701,.9,-2,.025,.12,1.78,'#c48563');
  for(let z=-2.77;z<-1.08;z+=.12)co.b('shop',1.704,.62,z,.021,.42,.017,'#b58e67');
  co.b('metal',1.27,1.276,-1.78,.32,.022,.34,'#7e8580');
  co.b('metal',1.25,1.38,-1.78,.05,.19,.061,'#687473');
  co.b('shell',1.23,1.52,-1.78,.07,.25,.39,'#364a51',0,0,-.16);
  co.b('bright',1.274,1.527,-1.78,.009,.19,.32,'#8ac8bb',0,0,-.16);
  co.b('shop',1.31,1.48,-2.55,.39,.42,.33,'#8d8c7a');
  co.b('bright',1.518,1.53,-2.55,.013,.17,.25,'#d79a68');
  co.b('metal',1.31,1.724,-2.55,.39,.042,.34,'#c7c6ad');
  for(let i=0;i<4;i++)co.c('stock',1.46,1.32,-1.30+i*.09,.058,.115,.058,'#f6e9c8');
  co.finish();
  const art1=poster(false),art2=poster(true);
  panel(checkout,art1,left+.099,2.19,-1.57,.61,.88,Math.PI/2);
  panel(checkout,art2,left+.10,2.20,-.72,.58,.83,Math.PI/2);

  const windows=group('Store · sliding doors and glazing',2.10),f=pieces(windows);
  const frame='#465c65',hi='#9eaaa4';
  const top=2.88;
  for (const px of [left,-3.36,-1.83,doorL,doorR,right]){
    f.b('metal',px,1.67,front,.074,2.43,.10,frame);
    f.b('metal',px+.019,1.67,front+.057,.017,2.41,.012,hi);
  }
  f.b('metal',cx,2.61,front,7.11,.066,.103,frame);
  f.b('metal',cx,top,front,7.11,.11,.15,frame);
  for(const z of [front,-.97,-2.51,-3.77,back]){
    f.b('metal',right,1.72,z,.11,2.34,.071,frame);
    f.b('metal',right+.063,1.72,z+.018,.012,2.3,.019,hi);
  }
  f.b('metal',right,2.61,cz,.105,.065,5.25,frame);
  f.b('metal',right,top,cz,.152,.11,5.25,frame);
  glazing(windows,(left+doorL)/2,1.78,front+.021,doorL-left,2.06);
  glazing(windows,(doorR+right)/2,1.78,front+.021,right-doorR,2.06);
  glazing(windows,right+.021,1.78,cz,5.2,2.08,Math.PI/2);
  for(let i=0;i<2;i++){
    const px=doorL+.433+i*.865;
    const offset=i===0?.036:.054;
    glazing(windows,px,1.45,front+offset,.805,2.11);
    f.b('metal',px,2.51,front+offset,.858,.055,.057,'#778b88');
    f.b('metal',px,.385,front+offset,.858,.076,.065,'#566c70');
    f.b('metal',px+(.414*(i===0?1:-1)),1.46,front+offset,.028,2.14,.059,'#98a69f');
    f.b('bright',px,1.19,front+.086,.82,.032,.015,'#8dbdb0');
    f.b('bright',px,1.143,front+.085,.82,.014,.014,'#f3cf9c');
    f.b('bright',px,1.51,front+.086,.128,.089,.014,'#f2e3bb');
    f.b('bright',px,1.51,front+.097,.078,.026,.009,'#6a9a9a');
  }
  f.b('metal',(doorL+doorR)/2,.351,front+.07,1.76,.043,.21,'#b2b8ae');
  f.b('shell',(doorL+doorR)/2,2.666,front+.083,.26,.082,.091,'#344751');
  f.b('bright',(doorL+doorR)/2+.05,2.66,front+.135,.023,.015,.006,'#e88b71');
  // Two softly coloured notices add scale while preserving the view inside.
  panel(windows,art1,-4.62,1.40,front+.077,.38,.55);
  panel(windows,art2,right+.083,1.37,-3.38,.4,.57,Math.PI/2);
  const hours = canvasMap(320,120,(c,wi,he)=>{
    c.fillStyle='#f3e8c9';c.fillRect(0,0,wi,he);c.fillStyle='#298277';c.fillRect(5,5,310,110);
    c.textAlign='center';textAt(c,'OPEN',160,50,62,'#fff4d5',800,sans);textAt(c,'24  HOURS',160,96,20,'#f3d8ad',700,sans);
  });
  panel(windows,hours,-.636,1.75,front+.078,.44,.165);
  f.finish();

  const awning=group('Store · projecting illuminated canopy',2.70),aw=pieces(awning);
  const canopyFront=1.027,canopyRight=2.51,canopyBack=-4.83,canopyLeft=-5.10;
  const canW=canopyRight-canopyLeft,canD=canopyFront-canopyBack,canX=(canopyRight+canopyLeft)/2,canZ=(canopyFront+canopyBack)/2;
  aw.b('shell',canX,3.215,canZ,canW,.68,canD,'#657782');
  aw.b('shop',canX,2.864,canZ,canW+.02,.06,canD+.015,'#d1b799');
  aw.b('metal',canX,2.851,canopyFront,canW+.06,.063,.071,'#546c74');
  aw.b('metal',canopyRight,2.851,canZ,.071,.063,canD+.055,'#546c74');
  panel(awning,fascia(false),canX,3.231,canopyFront+.007,canW,.67);
  panel(awning,fascia(true),canopyRight+.007,3.231,canZ,canD,.67,Math.PI/2);
  for(const x of [canopyLeft+.11,canopyRight-.11])aw.b('metal',x,3.24,canopyBack-.008,.074,.64,.035,'#8fa0a0');
  // Ceiling battens and warm recessed shop lights are visible from the street.
  for(const x of [-4.2,-2.33,-.47,1.36]){
    aw.b('shop',x,2.819,.795,1.21,.049,.107,'#ad9e83');
    aw.b('bright',x,2.788,.795,1.11,.025,.066,'#fff5cf');
  }
  for(const z of [-.44,-2.08,-3.71])aw.b('bright',2.325,2.791,z,.067,.033,1.1,'#fff0c9');
  for(const x of [-3.80,-1.44,1.02]){
    aw.b('shop',x,2.807,-2.06,.13,.056,3.24,'#c1ac8b');
    aw.b('bright',x,2.766,-2.06,.10,.031,3.12,'#fff4d2');
  }
  aw.finish();
  const frontLight = new THREE.PointLight(0xffd69e, 7.4, 5.7, 2);
  frontLight.position.set(-1.95,2.57,-.15);
  const rearLight = new THREE.PointLight(0xffdfa6, 8.2, 6.2, 2);
  rearLight.position.set(-.14,2.50,-2.75);
  awning.add(frontLight,rearLight);

  const roof=group('Store · roof and parapet',3.02),r=pieces(roof);
  r.b('shell',canX,3.625,canZ,canW+.10,.146,canD+.10,'#475b69');
  panel(roof,roofTexture(),canX,3.704,canZ,canW-.14,canD-.14,0,true);
  for(const z of [canopyBack-.015,canopyFront+.015]){
    r.b('shell',canX,3.76,z,canW+.13,.136,.092,'#455967');
    r.b('metal',canX,3.844,z,canW+.16,.04,.149,'#829298');
    r.b('metal',canX,3.589,z+(z>0?.071:-.071),canW+.14,.029,.024,'#a3aeab');
  }
  for(const x of [canopyLeft-.018,canopyRight+.018]){
    r.b('shell',x,3.763,canZ,.093,.14,canD+.08,'#4c606c');
    r.b('metal',x,3.844,canZ,.146,.04,canD+.1,'#829298');
  }
  r.finish();

  const utility=group('Store · rooftop equipment',3.35),u=pieces(utility,true);
  function aircon(x,z,w,d,h){
    for(const across of [-1,1])u.b('metal',x+across*w*.35,3.778,z,.105,.12,d+.12,'#526471');
    u.b('shell',x,3.827+h/2,z,w,h,d,'#94a4a5');
    u.b('metal',x,3.85+h,z,w+.045,.047,d+.04,'#b2b9b2');
    u.b('shell',x,3.82+h*.48,z+d/2+.008,w*.86,h*.66,.022,'#556977');
    for(let i=0;i<6;i++)u.b('metal',x,3.82+h*.25+i*(h*.086),z+d/2+.034,w*.87,.021,.05,'#a1b0ad',-.2);
    const radius=Math.min(d*.38,w*.23);
    for(const by of [-1,1]){
      const fx=x+w*.23*by,fy=3.881+h;
      u.c('metal',fx,fy,z,radius*2+.053,.032,radius*2+.053,'#788d94');
      u.c('shell',fx,fy+.024,z,radius*2,.026,radius*2,'#475e6b');
      for(let i=0;i<4;i++){
        const angle=i*Math.PI/2+.45;
        u.b('metal',fx+Math.sin(angle)*radius*.39,fy+.042,z+Math.cos(angle)*radius*.39,radius*.52,.009,radius*.81,'#869699',0,angle+.62);
      }
      for(let n=-3;n<=3;n++){
        const offset=n*radius*.245;
        u.b('metal',fx+offset,fy+.061,z,.014,.013,Math.sqrt(radius*radius-offset*offset)*2,'#a3aea9');
      }
      u.c('metal',fx,fy+.074,z,radius*.34,.022,radius*.34,'#b1b6ac');
    }
  }
  aircon(-3.50,-2.75,1.91,1.04,.47);
  u.b('shell',-.60,3.78,-3.67,1.09,.12,.71,'#566a77');
  u.b('metal',-.60,3.876,-3.67,1.00,.087,.63,'#a3aca8');
  for(let j=0;j<8;j++)u.b('shell',-1.02+.12*j,3.926,-3.67,.035,.021,.46,'#7f9196');
  u.b('metal',-1.84,3.79,-2.99,1.36,.117,.159,'#9ca7a2');
  u.b('metal',-1.17,3.79,-3.35,.154,.119,.83,'#9ca7a2');
  for(let i=0;i<3;i++)u.b('metal',-2.43+i*.54,3.795,-2.99,.033,.14,.176,'#647780');
  u.c('metal',1.50,3.91,-4.04,.14,.39,.14,'#86989c');
  u.c('metal',1.50,4.11,-4.04,.22,.066,.22,'#9ca9a8');
  u.finish();
}
