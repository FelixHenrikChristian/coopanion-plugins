import * as THREE from 'three';

// Sign painters, glass blocks and anodized metal give each street bay its own
// construction and period. All printed material is drawn locally, in the same
// units and colour space as the shop across the junction.
export function buildStationRow(k){
  const {group,box,cyl,line,glow}=k;
  const shells=group('駅前 · 建物',1.07),glass=group('駅前 · 窓と店内',1.73);
  const plant=group('駅前 · 屋上設備',2.96),signs=group('駅前 · 点灯',3.11);
  const night='#283544',aluminum='#809199',concrete='#8b9598';
  const mint='#78d8be',rose='#e88993';
  function coating(c,n=.39){return {emissive:c,intensity:n,roughness:.47};}
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
    const ring=cyl(p,x,y+.504,z,.155,.155,.028,night,{segments:20});ring.scale.z=.95;
    for(let i=-2;i<=2;i++)box(p,x+i*.047,y+.526,z,.012,.012,.237-Math.abs(i)*.022,'#aebbbb');
    for(const s of [-1,1])box(p,x+s*w*.29,y-.025,z,.105,.05,.54,'#657484');
  }
  function windowRow(x0,x1,y,z,n,h,colors,side=1){
    const pitch=(x1-x0)/n;
    for(let i=0;i<n;i++){
      const x=x0+pitch*(i+.5),w=pitch-.16,c=colors[i%colors.length];
      box(glass,x,y,z,w+.063,h+.073,.065,night);
      box(glass,x,y,z+side*.038,w,h,.015,c,coating(c,c===night?.03:.58));
      box(glass,x-.1*w,y,z+side*.058,.035,h,.02,aluminum);
      box(glass,x,y+.24*h,z+side*.060,w,.025,.019,'#586777');
      if(i%3===1)for(let b=0;b<5;b++)box(glass,x,y+.36*h-b*h*.09,z+side*.063,w*.94,.023,.014,'#68798b');
    }
  }
  // Street-facing record shop. Its displays, listening counter and sleeves can
  // be read through actual open window bays rather than a painted facade.
  const rx=9.37,rz=-.78,rw=4.55,rd=4.31,front=rz+rd*.5;
  box(shells,rx,.30,rz,rw,.23,rd,'#7d8b92');
  box(shells,rx,1.59,rz-rd/2,rw,2.42,.14,'#929398');
  for(const x of [rx-rw/2,rx+rw/2])box(shells,x,1.57,rz,.16,2.45,rd,'#99a3a3');
  for(const x of [7.15,8.68,10.15,11.58])box(glass,x,1.48,front,.077,2.15,.094,'#426371');
  box(glass,8.64,.63,front,2.96,.47,.12,'#647680');
  box(glass,9.39,2.23,front,4.51,.058,.13,'#465c68');
  box(glass,10.91,.42,front,1.36,.061,.12,'#6d7b7b');
  box(glass,10.27,1.37,front+.086,.024,.34,.038,'#ccbea4');
  const tinted=new THREE.MeshBasicMaterial({color:0xa4dae0,transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false});
  const pane=new THREE.Mesh(new THREE.PlaneGeometry(4.3,1.80),tinted);pane.position.set(rx,1.38,front+.031);glass.add(pane);
  for(const z of [-2.75,-.86,.50]){
    const x0=z===.5?7.50:7.41,n=z===.5?5:8,y=z< -2?1.14:.83;
    box(glass,x0+n*.20-.08,y-.23,z,n*.4+.18,.58,.52,'#9e7159');
    for(let i=0;i<n;i++){const x=x0+i*.40;
      plate(glass,x,y+.15,z+.269,.35,.35,album((i+(z<0?3:0))%6));
      box(glass,x,y-.074,z+.29,.395,.074,.06,'#d7b785');
    }
    if(z< -2)for(let i=0;i<7;i++)plate(glass,7.70+i*.52,1.99,z+.105,.435,.435,album((i+1)%6));
  }
  box(shells,rx,3.87,rz,rw,2.49,rd,'#8b929b');roof(rx-rw*.5,rx+rw*.5,rz-rd*.5,front,5.14);
  box(shells,rx,2.63,front+.12,rw+.18,.45,.41,night);
  box(signs,rx,2.68,front+.338,4.48,.54,.052,'#eadfc4',coating('#f8dcb2',.92));
  plate(signs,rx,2.68,front+.370,4.45,.515,recordFace);
  windowRow(7.23,11.52,4.00,front+.01,4,1.12,['#e6b591','#a8c6ca','#43546b','#d6bc9f']);
  box(glass,rx,3.39,front+.10,4.56,.088,.27,'#8999a0');
  const bt=[11.40,4.08,front+.43];box(signs,...bt,.57,2.12,.26,'#ac607a',coating(rose,.8));
  plate(signs,bt[0],bt[1],bt[2]+.136,.52,2.04,blade);
  plate(signs,bt[0],bt[1],bt[2]-.136,.52,2.04,blade,Math.PI);
  for(const y of [3.40,4.78])box(glass,bt[0],y,front+.15,.068,.087,.37,aluminum);
  for(const y of [3.62,4.47])glow(signs,bt[0]+.04,y,bt[2]+.15,'#ff87a3',1.26,.19);
  condenser(plant,8.21,5.37,-1.76);condenser(plant,9.28,5.37,-1.76);
  // Small fluorescent coin laundry with a visible washer bank, sign and benches.
  const lx=14.78,lz=-.96,lf=1.07;
  box(shells,lx,.29,lz,4.70,.21,4.04,'#7e9097');box(shells,lx,1.45,-2.94,4.68,2.32,.17,'#899fa2');
  for(const xx of [12.47,17.09])box(shells,xx,1.46,lz,.16,2.31,4.03,'#879aa0');
  box(glass,lx,1.48,-2.83,4.44,2.15,.09,'#b2c3c1',coating('#809e9f',.29));
  for(let n=0;n<4;n++){
    const x=13.04+n*.91;box(glass,x,.96,-1.22,.86,1.18,.79,'#cadad3');box(glass,x,1.44,-.803,.78,.16,.040,'#7e98a3');
    const bezel=cyl(glass,x,.96,-.803,.297,.297,.052,night,{segments:24});bezel.rotation.x=Math.PI*.5;
    const port=cyl(glass,x,.96,-.765,.230,.230,.04,n%2?'#598397':'#657c92',{segments:24});port.rotation.x=Math.PI*.5;
    box(glass,x+.18,1.44,-.775,.15,.045,.023,mint,coating(mint,1));
  }
  for(const x of [12.48,13.62,15.70,17.08])box(glass,x,1.46,lf,.063,2.18,.076,'#5c7c86');
  box(glass,lx,2.51,lf,4.63,.071,.094,aluminum);box(glass,lx,.44,lf,4.57,.07,.078,aluminum);
  plate(signs,lx,2.77,lf+.13,4.66,.53,laundryFace);
  box(signs,lx,2.77,lf+.064,4.75,.59,.117,'#344d63');
  roof(12.43,17.13,-3.02,lf,3.06);
  box(signs,lx,3.01,lf+.088,4.74,.033,.051,mint,coating(mint,2));
  const glassBlock=graphic('cast sea-glass block',270,150,(c,w,h)=>{
    c.fillStyle='#455f68';c.fillRect(0,0,w,h);
    for(let j=0;j<5;j++)for(let i=0;i<9;i++){
      c.fillStyle=['#84a6a8','#799da5','#8aafac','#789a9e'][(i*7+j*3)%4];c.fillRect(i*30+2,j*30+2,27,27);
      c.fillStyle='#bed6cb';c.fillRect(i*30+3,j*30+3,24,2);c.fillRect(i*30+3,j*30+4,2,19);
      c.fillStyle='#64828d';c.fillRect(i*30+10,j*30+21,15,3);
    }
  });
  plate(glass,17.177,1.76,-1.06,2.13,1.03,glassBlock,Math.PI/2);
  condenser(plant,16.32,3.30,-1.96,1.17);
  // A rear apartment frontage terminates the lane. Setbacks, frosted balcony
  // panels, window blinds and a wired antenna break its silhouette in every orbit.
  const ax=11.37,az=-7.16,aw=7.52,ad=5.23,af=az+ad*.5;
  box(shells,ax,3.67,az,aw,7.00,ad,'#778794');
  const windowTones=[night,'#d4b18e','#8597b1','#587583','#d4c6ab',night];
  for(let n=0;n<3;n++){
    const floor=.36+n*2.27;
    windowRow(7.87,14.92,floor+.97,af+.014,6,1.36,windowTones.slice(n).concat(windowTones.slice(0,n)));
    for(const zz of [af-.27,az-ad/2+.13])box(shells,ax,floor+1.99,zz,aw+.09,.09,.40,concrete);
    box(glass,ax,floor+.03,af+.33,aw+.09,.102,.74,'#9ca4aa');
    box(glass,ax,floor+.45,af+.660,aw-.03,.77,.053,'#6d828c',{roughness:.34,metalness:.37});
    box(glass,ax,floor+.86,af+.664,aw+.07,.039,.082,'#bac2bf');
    for(let j=0;j<=6;j++)box(glass,ax-aw/2+j*(aw/6),floor+.43,af+.689,.044,.86,.034,'#4f626d');
    for(let j=0;j<3;j++) {
      const z=az-1.59+j*1.59,c=windowTones[(j+2*n+1)%6];
      box(glass,ax+aw/2+.018,floor+1.07,z,.047,.83,.86,night);
      box(glass,ax+aw/2+.047,floor+1.07,z,.018,.74,.76,c,coating(c,.43));
      box(glass,ax+aw/2+.059,floor+1.06,z,.026,.75,.034,aluminum);
    }
    windowRow(7.87,14.92,floor+.97,az-ad/2-.053,6,.99,windowTones,-1);
  }
  roof(ax-aw/2,ax+aw/2,az-ad/2,af,7.21);
  box(plant,9.49,7.79,-8.11,1.69,.93,1.48,'#81919c');box(plant,9.49,8.28,-8.11,1.83,.09,1.60,concrete);
  for(let i=0;i<3;i++)condenser(plant,11.02+i*.91,7.44,-8.88);
  cyl(plant,8.32,8.10,-8.73,.023,.033,1.68,aluminum,{segments:8});
  for(let i=0;i<5;i++)box(plant,8.32,8.65,-9.01+i*.14,1.0-.12*i,.019,.023,aluminum);
  box(plant,8.32,8.64,-8.74,.021,.021,.86,aluminum);
  for(const [x,z,top] of [[7.29,-2.78,5.1],[16.98,-2.89,3.04],[14.94,-9.64,7.18]]){
    line(plant,[[x,top,z],[x+.14,top-.18,z-.06],[x+.14,.42,z-.06],[x+.24,.27,z+.01]],'#7c9099',.049);
  }
  for(const [x,y,z,c,power] of [[9.31,2.08,-.54,0xffbf92,7],[11.35,3.10,1.98,0xfe789b,6.8],[14.73,2.17,-.13,0x92efe1,9]]){
    const light=new THREE.PointLight(c,power,5.7,2);light.position.set(x,y,z);signs.add(light);
  }
}
