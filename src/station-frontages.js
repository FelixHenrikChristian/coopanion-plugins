import * as THREE from 'three';

// Each building has its own depth, palette and method of construction. Wall
// work can be read from the street, the end of the block and the rear lane.
export function buildStationFrontages(k,art){
  const {box,cyl,line,glow}=k;
  const {shells,glass,plant,signs,plate,graphic,letter,jp,album,recordFace,blade,laundryFace,roof,condenser}=art;
  const iron='#364952',walnut='#82553f',cedar='#b37b52',brass='#b69a6e',grout='#61817c';
  const warm={emissive:'#ffd59b',intensity:.98},cool={emissive:'#a8ded2',intensity:.76};
  const softLight={emissive:'#e5b184',intensity:.21};
  const glassMat=new THREE.MeshBasicMaterial({color:'#abdbd4',opacity:.065,transparent:true,depthWrite:false,side:THREE.DoubleSide});
  function pane(g,x,y,z,w,h,turn=0){const o=new THREE.Mesh(new THREE.PlaneGeometry(w,h),glassMat);o.position.set(x,y,z);o.rotation.y=turn;g.add(o);return o;}
  function orient(parent,x,y,z,turn=0){const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=turn;parent.add(g);return g;}
  function disc(g,x,y,z,r,depth,color,seg=16){const m=cyl(g,x,y,z,r,r,depth,color,{segments:seg});m.rotation.x=Math.PI/2;return m;}
  function lamp(g,x,y,z,size=1){
    cyl(g,x,y+.102*size,z,.016*size,.016*size,.20*size,brass,{segments:6});
    cyl(g,x,y-.041*size,z,.098*size,.156*size,.094*size,'#796858',{segments:14});
    cyl(g,x,y-.094*size,z,.146*size,.141*size,.02*size,'#ffe2b1',warm);
  }
  function timberWindow(g,a,b,low,high,z,mullions=0){
    const mid=(a+b)/2;for(const x of [a,b])box(g,x,(low+high)/2,z,.069,high-low,.095,walnut);
    for(const y of [low,high])box(g,mid,y,z,b-a+.071,.068,.109,cedar);
    for(let i=0;i<mullions;i++)box(g,a+(i+1)*(b-a)/(mullions+1),(low+high)/2,z,.043,high-low,.077,walnut);
    pane(g,mid,(low+high)/2,z-.022,b-a-.055,high-low-.059);
  }
  function door(g,x,z,w,finish){
    const head=2.38;
    for(const side of [-1,1])box(g,x+side*w/2,1.39,z,.069,head-.38,.096,finish);
    box(g,x,head,z,w+.068,.092,.107,finish);box(g,x,.43,z,w+.059,.055,.16,'#a9a99c');
    // The slider is parked against its jamb, leaving a genuine open approach.
    const parked=x+w*.265,pw=w*.41;
    pane(g,parked,1.394,z+.02,pw-.058,1.82);
    for(const s of [-1,1])box(g,parked+s*pw/2,1.401,z+.037,.033,1.88,.061,finish);
    for(const y of [.47,2.328])box(g,parked,y,z+.035,pw,.046,.067,finish);
    box(g,parked-pw*.31,1.36,z+.097,.027,.212,.038,brass);
  }
  function planter(g,x,y,z,length,variant=0){
    box(g,x,y+.073,z,length,.146,.26,['#937662','#768886','#a08669'][variant%3]);
    box(g,x,y+.154,z,length+.036,.032,.292,'#a29a80');box(g,x,y+.176,z,length-.049,.020,.209,'#645647');
    const geo=bushGeo;
    for(let j=0;j<Math.max(3,Math.floor(length/.129));j++){
      const n=Math.max(3,Math.floor(length/.129)),r=j*7+variant,leaf=new THREE.Mesh(geo,k.mat(['#69856b','#86997d','#789281','#a7aa7f'][r%4]));
      leaf.scale.set(.13,.139+.035*(r%3),.119);leaf.position.set(x-length*.40+j*length*.80/(n-1),y+.255+(j%2)*.043,z+Math.sin(j*2)*.035);leaf.rotation.y=r;g.add(leaf);
    }
  }
  const bushGeo=new THREE.IcosahedronGeometry(1,0);
  const woodGraphic=graphic('old cedar facing',256,256,(c,w,h)=>{
    for(let i=0;i<8;i++){
      c.fillStyle=['#94654e','#a06d4e','#a67656','#905e49','#9f7051','#aa7857','#94664e','#a87252'][i];c.fillRect(0,i*32,w,32);
      c.fillStyle='#664b40';c.fillRect(0,i*32+30,w,2);c.fillStyle='#c9946d';c.fillRect(0,i*32+2,w,1);
      for(let j=0;j<3;j++){c.strokeStyle='rgba(79,53,43,.21)';c.lineWidth=1;c.beginPath();c.moveTo(0,i*32+8+j*7);c.bezierCurveTo(65,i*32+5+j*7,150,i*32+15+j*5,256,i*32+9+j*7);c.stroke();}
    }
  });
  const recordPoster=graphic('turntable exhibition',256,388,(c,w,h)=>{
    c.fillStyle='#eddcbd';c.fillRect(0,0,w,h);c.fillStyle='#426964';c.fillRect(12,12,w-24,222);
    for(let i=0;i<7;i++){c.strokeStyle=i===1?'#e6a77d':'#afc9a3';c.lineWidth=i===1?7:2;c.beginPath();c.arc(208,83,31+i*20,.71,4.62);c.stroke();}
    c.fillStyle='#dc866f';c.beginPath();c.arc(55,112,25,0,Math.PI*2);c.fill();
    letter(c,'雨の円盤',19,272,38,'#354c4c',jp,800);letter(c,'LISTENING ROOM',20,319,19,'#906b56','Arial');
    c.fillStyle='#9f7460';c.fillRect(20,349,179,3);c.fillRect(20,359,102,3);
  });
  const openCard=graphic('record hours',200,105,(c,w,h)=>{c.fillStyle='#c8af81';c.fillRect(0,0,w,h);c.fillStyle='#365b56';c.fillRect(4,4,w-8,h-8);c.textAlign='center';letter(c,'OPEN',w/2,45,42,'#efe3bb','Arial',800);letter(c,'11:00 — 21:00',w/2,81,15,'#e3cfac','Arial');});
  const drumArt=graphic('laundry door and clothes',184,184,(c,w,h)=>{
    c.fillStyle='#455a65';c.fillRect(0,0,w,h);c.beginPath();c.arc(92,92,89,0,Math.PI*2);c.fillStyle='#6e95a1';c.fill();
    c.beginPath();c.moveTo(7,103);c.bezierCurveTo(40,59,83,156,132,111);c.quadraticCurveTo(166,71,181,96);c.lineTo(166,148);c.quadraticCurveTo(86,208,23,147);c.fillStyle='#bac6be';c.fill();
    c.beginPath();c.moveTo(18,121);c.quadraticCurveTo(86,163,118,123);c.quadraticCurveTo(156,97,176,115);c.lineTo(157,151);c.quadraticCurveTo(72,202,25,147);c.fillStyle='#899d9b';c.fill();
    c.strokeStyle='#d4e0ce';c.lineWidth=6;c.beginPath();c.arc(88,95,67,3.66,4.90);c.stroke();
  });
  const washPoster=graphic('fabric care hanging print',245,350,(c,w,h)=>{
    c.fillStyle='#f0ead1';c.fillRect(0,0,w,h);c.fillStyle='#70a49c';c.fillRect(11,11,w-22,175);
    c.strokeStyle='#f5edcc';c.lineWidth=6;c.beginPath();c.moveTo(26,74);c.quadraticCurveTo(124,97,219,67);c.stroke();
    for(const [x,y,co] of [[43,80,'#eecb8e'],[102,88,'#d98779'],[161,78,'#d4dbba']]){c.fillStyle=co;c.fillRect(x,y,43,64);c.fillStyle='#80745e';c.fillRect(x+5,y-8,4,13);}
    letter(c,'洗い日和',16,222,38,'#2f635f',jp,800);letter(c,'WASH & FOLD',18,265,22,'#936956','Arial');c.fillStyle='#c0af8c';c.fillRect(18,297,178,3);c.fillRect(18,309,109,3);
  });
  const tileMap=graphic('ceramic teal brick',360,240,(c,w,h)=>{
    c.fillStyle='#647b7b';c.fillRect(0,0,w,h);
    for(let j=0;j<5;j++)for(let i=-1;i<5;i++){
      const x=i*90+(j%2)*45,y=j*48;c.fillStyle=['#669790','#77a59d','#6a9d96','#86aaa0'][Math.abs(i*7+j*11)%4];c.fillRect(x+2,y+2,86,44);
      c.fillStyle='#a2c4b4';c.fillRect(x+3,y+3,81,2);
    }
  });
  function lipTiles(g,x,y,z,w,h,turn=0){plate(g,x,y,z,w,h,tileMap,turn);}

  // A narrow post-war record house: solid walnut shop base and a recessed
  // upstairs listening loft with a real, furnished view around the corner.
  const rx=9.37,rz=-.78,front=1.365;
  box(shells,rx,.30,rz,4.55,.24,4.31,'#8c8880');box(shells,rx,.430,rz,4.46,.048,4.19,'#bc936c');
  for(let i=0;i<9;i++)box(shells,7.31+i*.50,.459,rz,.011,.006,4.13,'#9d7b60');
  box(shells,rx,1.54,-2.91,4.52,2.20,.138,'#987d65');box(shells,7.13,1.55,rz,.13,2.21,4.25,'#ac9176');
  box(shells,11.61,1.53,-2.46,.13,2.17,.91,'#876b57');box(shells,11.61,.705,-.23,.13,.55,3.19,'#805d47');
  box(shells,8.64,.679,front,3.02,.49,.12,'#664e41');plate(glass,8.64,.685,front+.069,2.94,.41,woodGraphic);
  box(shells,rx,2.63,rz,4.65,.142,4.39,'#765745');
  box(shells,rx,2.524,.09,4.49,.065,2.45,'#b99c78');
  for(const x of [7.22,9.94,11.54])box(shells,x,1.49,front,.108,2.05,.155,walnut);
  timberWindow(glass,7.24,9.95,.933,2.455,front+.025,1);door(glass,10.78,front+.022,1.27,walnut);
  box(glass,10.70,.456,1.013,.85,.019,.41,'#6c7370');
  const recordEnd=orient(glass,11.637,0,1.287,Math.PI/2);
  timberWindow(recordEnd,.046,3.207,.963,2.437,0,2);
  plate(recordEnd,1.637,.686,.011,3.10,.46,woodGraphic);
  plate(glass,7.57,1.664,front+.09,.435,.227,openCard);
  // Tilted sleeves in low stepped display crates, spines behind each front record.
  function crate(x,y,z,n,artShift){
    const step=.378,w=n*step+.09;
    box(glass,x,y-.23,z,w,.49,.48,'#956a4c');box(glass,x,y-.007,z+.194,w+.065,.119,.103,'#cb9b69');
    for(let i=0;i<n;i++){
      const xx=x+(i-(n-1)/2)*step;
      for(let j=0;j<4;j++){const s=box(glass,xx,y+.146+j*.025,z-.04-j*.087,.337,.295,.035,['#e5caa0','#617f7e','#bf7565','#b4b7a3'][(i+j)%4]);s.rotation.x=-.15;}
      const p=plate(glass,xx,y+.172,z+.168,.345,.344,album((i+artShift)%6));p.rotation.x=-.15;
      box(glass,xx,y+.022,z+.252,.126,.042,.012,'#ded5af');
    }
  }
  crate(8.562,1.076,.75,6,0);crate(8.914,1.292,-1.20,7,3);
  // A low feature rack faces the street directly against the glass. An exposed
  // disc and two full-size illustrated sleeves are legible above the timber dado.
  const featureAlbum=graphic('moon over the river sleeve',256,256,(c,w,h)=>{
    c.fillStyle='#266364';c.fillRect(0,0,w,h);
    c.fillStyle='#e5ba78';c.beginPath();c.arc(173,84,47,0,Math.PI*2);c.fill();
    for(const [y,shade] of [[156,'#79a9a0'],[188,'#476d77'],[212,'#293e54']]){
      c.fillStyle=shade;c.beginPath();c.moveTo(0,y+14);c.bezierCurveTo(72,y-56,145,y+31,256,y-10);c.lineTo(256,256);c.lineTo(0,256);c.fill();
    }
    letter(c,'川辺の月',13,32,24,'#f5e5c3',jp,800);letter(c,'RIVER MOON',14,231,17,'#e8bf8e','Arial');
  });
  const rackGraphic=graphic('interval sleeve',256,256,(c,w,h)=>{
    c.fillStyle='#c86050';c.fillRect(0,0,w,h);c.fillStyle='#edcf92';c.fillRect(15,14,226,177);
    for(let j=0;j<4;j++){c.strokeStyle=j%2?'#9c6559':'#4b6971';c.lineWidth=9;c.beginPath();c.arc(98+j*28,99,52-j*5,.49,5.38);c.stroke();}
    letter(c,'間  奏',15,219,35,'#f7e3b9',jp,800);letter(c,'INTERLUDE',151,226,14,'#f5ddd0','Arial');
  });
  box(glass,8.80,1.128,1.081,2.36,.128,.227,'#b3895d');
  const vinyl=orient(glass,8.93,1.449,1.154,.03);
  disc(vinyl,0,0,0,.290,.020,'#26343e',32);disc(vinyl,0,0,.015,.23,.007,'#37444b',24);
  disc(vinyl,0,0,.024,.10,.012,'#ebaf77',24);disc(vinyl,0,0,.035,.020,.010,'#574b41');
  for(const [x,f,sz] of [[8.24,featureAlbum,.515],[9.47,rackGraphic,.503]]){
    const copy=plate(glass,x,1.414,1.161,sz,sz,f);copy.rotation.x=-.13;
    box(glass,x,1.149,1.206,sz+.04,.052,.057,brass);
  }
  box(glass,8.86,.975,-2.48,3.19,1.08,.61,'#7a5843');
  for(const y of [1.51,2.15])box(glass,8.87,y,-2.65,3.21,.062,.34,cedar);
  for(let j=0;j<6;j++)plate(glass,7.53+j*.53,1.805,-2.586,.452,.467,album((j+2)%6));
  box(glass,10.54,.871,-.78,.82,.82,1.86,'#976b4f');box(glass,10.54,1.319,-.78,.93,.083,1.95,'#c2946a');
  box(glass,10.55,1.388,-.48,.56,.078,.47,'#4c5656');cyl(glass,10.52,1.436,-.48,.193,.193,.022,'#273b42',{segments:26});cyl(glass,10.52,1.45,-.48,.061,.061,.014,'#dca27f');
  line(glass,[[10.77,1.454,-.643],[10.74,1.489,-.54],[10.65,1.479,-.46]],'#aaa9a0',.012);
  for(const z of [-1.51,-1.10]){box(glass,10.67,1.524,z,.22,.32,.20,'#554639');disc(glass,10.67,1.52,z+.107,.066,.013,'#313c3d');}
  for(const x of [7.62,8.81,9.95,11.06])lamp(glass,x,2.427,.42,.76);
  const loft=orient(shells,7.13,0,1.196);box(loft,2.235,4.01,-3.98,4.46,2.28,.135,'#aa8975');box(loft,.032,4.01,-1.99,.13,2.28,3.99,'#ad927c');
  box(loft,2.235,2.910,-1.96,4.47,.33,3.98,'#97806e');box(loft,4.404,4.01,-3.42,.13,2.26,1.19,'#a38471');
  box(loft,2.225,4.84,.012,4.46,.52,.12,'#ac8872');box(loft,2.222,3.219,.012,4.46,.42,.12,'#a07a64');
  box(loft,4.411,4.84,-1.38,.13,.52,2.84,'#a78a74');box(loft,4.411,3.219,-1.38,.13,.42,2.84,'#a07a64');
  timberWindow(glass,7.24,11.45,3.406,4.606,1.247,4);
  const loftSide=orient(glass,11.60,0,1.131,Math.PI/2);timberWindow(loftSide,.03,2.73,3.407,4.608,0,2);
  box(glass,9.27,4.02,-.13,4.15,1.32,.115,'#d8b485',{emissive:'#e2ae79',intensity:.39});
  for(let q=0;q<3;q++){const px=7.88+q*.96;box(glass,px,3.81,.513,.58,.28,.39,'#8c7158');box(glass,px,3.985,.51,.65,.07,.43,'#c18b63');}
  for(const x of [8.12,9.33,10.48])lamp(glass,x,4.472,.52,1.13);
  box(glass,11.02,3.73,-1.39,.68,.49,1.90,'#8a7465');box(glass,11.0,4.02,-1.39,.86,.11,1.95,'#bc916f');
  plate(glass,10.62,4.083,-.059,.50,.71,recordPoster);
  box(glass,10.32,3.472,1.38,1.97,.136,.39,'#705b49');planter(glass,10.35,3.536,1.45,1.52,0);
  // Deep claret fabric folds over a scalloped hem and slim copper rain lip.
  const cWidth=4.47,cN=13;
  for(let j=0;j<cN;j++){
    const x=rx-cWidth/2+(j+.5)*cWidth/cN,c=j%2?'#a05d58':'#ad6860';
    const sl=box(signs,x,2.525,1.592,cWidth/cN+.006,.041,.833,c);sl.rotation.x=.205;
    box(signs,x,2.335,1.988,cWidth/cN+.007,.187,.038,c);
    const hem=cyl(signs,x,2.249,1.992,.073,.073,.035,c,{segments:12});hem.rotation.x=Math.PI/2;hem.scale.x*=2.32;
  }
  box(signs,rx,2.68,1.28,4.59,.093,.085,brass);box(signs,rx,2.39,1.911,4.34,.028,.042,'#eccc98',warm);
  box(signs,9.249,2.971,1.336,4.14,.56,.122,'#6b4e42');plate(signs,9.249,2.974,1.406,4.027,.467,recordFace);
  box(signs,11.349,3.922,1.664,.538,1.738,.236,'#b1657a',{emissive:'#d07a8b',intensity:.49});
  for(const zz of [1.793,1.535])plate(signs,11.349,3.921,zz,.486,1.65,blade,zz<1.6?Math.PI:0);
  for(const y of [3.22,4.59])line(signs,[[11.35,y,1.19],[11.35,y,1.675]],iron,.031);
  glow(signs,11.37,3.80,1.80,'#e89aa4',1.18,.16);
  roof(7.09,11.65,-2.932,1.336,5.14);
  for(const z of [-2.68,-1.46,-.24,.94])box(plant,11.68,5.236,z,.083,.168,.036,'#8c8375');
  condenser(plant,8.16,5.37,-1.83);condenser(plant,9.09,5.37,-1.83);

  // The laundry sits behind a wraparound glazed corner. Four drums at the
  // back, two stacked dryers at the return and a folding island give it depth.
  const lx=14.78,lf=1.067,lz=-.96;
  box(shells,lx,.29,lz,4.7,.22,4.04,'#909b98');box(shells,lx,.414,lz,4.56,.054,3.94,'#c9c7b0');
  for(let i=0;i<9;i++)box(shells,12.63+i*.505,.444,lz,.013,.005,3.90,'#aeb7a8');for(let j=0;j<8;j++)box(shells,lx,.444,-2.78+j*.50,4.52,.006,.012,'#acb4a7');
  box(shells,lx,1.50,-2.96,4.70,2.20,.14,'#b0c6ba');box(shells,12.47,1.50,lz,.14,2.20,4.01,'#a3b8ad');
  box(shells,17.08,1.48,-2.39,.135,2.19,1.16,'#8ba5a4');
  box(shells,lx,2.575,lz,4.73,.142,4.08,'#81a09a');box(shells,lx,2.511,-.03,4.45,.051,2.07,'#cfdbc6');
  for(const x of [12.52,14.71,15.98,17.036])box(glass,x,1.486,lf,.066,2.10,.14,grout);
  for(const x of [13.60,16.51]){
    const w=x<14?2.15:.99;box(glass,x,.645,lf,w,.425,.12,grout);lipTiles(glass,x,.651,lf+.067,w-.022,.386);
    pane(glass,x,1.665,lf+.012,w-.058,1.62);box(glass,x,2.35,lf,w,.044,.098,'#577574');
  }
  door(glass,15.35,lf+.018,1.20,'#557473');box(glass,15.332,.453,.808,.84,.016,.368,'#678681');
  const le=orient(glass,17.12,0,.979,Math.PI/2);
  box(le,1.344,.66,0,2.72,.45,.127,grout);lipTiles(le,1.35,.67,.068,2.68,.394);
  for(const pos of [.017,1.40,2.745])box(le,pos,1.652,0,.061,1.65,.13,'#637f7e');pane(le,1.37,1.65,.014,2.68,1.57);
  box(le,1.36,2.364,0,2.77,.048,.107,'#718787');
  // A surface-deposited single-sided disk keeps the graphic circular at every viewing angle.
  const discGeom=new THREE.CircleGeometry(1,24),drumMaterial=new THREE.MeshBasicMaterial({map:drumArt,toneMapped:false});
  function washer(g,x,y,z,w,accent,drumSize=.305){
    box(g,x,y+.526,z,w,1.052,.548,'#d2d3bf');box(g,x,y+.989,z+.285,w-.050,.087,.032,'#94aaa1');
    box(g,x,y+.812,z+.289,w-.049,.212,.039,accent);box(g,x+.12*w,y+.829,z+.317,.166,.081,.020,'#426259');
    box(g,x+.12*w,y+.84,z+.329,.103,.031,.01,'#b4d0a6',cool);
    disc(g,x-.195*w,y+.827,z+.317,.044,.026,'#c7cabb');disc(g,x+.344*w,y+.814,z+.318,.032,.025,'#c99d78');
    const r=Math.min(drumSize,w*.437);disc(g,x,y+.412,z+.298,r,.068,'#7c9698',24);disc(g,x,y+.412,z+.338,r*.894,.023,'#526871',24);
    const window=new THREE.Mesh(discGeom,drumMaterial);window.scale.setScalar(r*.811);window.position.set(x,y+.412,z+.355);g.add(window);
    box(g,x+w*.374,y+.412,z+.332,.031,.127,.047,'#839393');box(g,x,y+.049,z+.293,w-.118,.043,.016,'#8e9f92');
  }
  for(let j=0;j<4;j++)washer(glass,12.99+j*.915,.447,-1.71,.86,j%2?'#91b5ad':'#a1bdb2');
  for(const h of [.448,1.478])washer(glass,16.557,h,-1.79,.817,'#9aafa4');
  box(glass,15.15,1.736,-2.848,3.79,.09,.074,'#9bb3a3');
  for(let i=0;i<3;i++)plate(glass,13.37+i*.893,1.99,-2.855,.469,.67,washPoster);
  const counter=orient(glass,16.44,0,-.359,Math.PI/2);
  box(counter,.01,1.095,0,1.27,.076,.62,'#d0b68e');for(const x of [-.494,.494])for(const z of [-.211,.212])box(counter,x,.764,z,.059,.624,.059,grout);
  for(let j=0;j<3;j++)box(counter,-.207,1.163+j*.050,.01,.416,.049,.279,['#c6d0b5','#e7dfc6','#ccab96'][j]);
  // A regular laundry basket and a compact waiting bench stay to the sides of the entrance.
  box(glass,15.828,.545,-.648,.43,.063,.303,'#a4b6ad');
  for(const y of [.655,.77]){for(const dx of [-.206,.206])box(glass,15.828+dx,y,-.648,.014,.020,.292,grout);for(const dz of [-.15,.15])box(glass,15.828,y,-.648+dz,.426,.02,.014,grout);}
  for(let i=0;i<6;i++)for(const dz of [-.143,.143])box(glass,15.633+i*.077,.638,-.648+dz,.013,.245,.014,'#879d95');
  // Street-facing pair on a shallow plinth. Their large circular doors sit
  // above the tile base, even from the elevated corner view. The entrance stays clear.
  const frontPair=orient(glass,13.64,0,.50,.075);
  box(frontPair,0,.547,0,1.96,.213,.557,'#91a59b');box(frontPair,0,.667,0,1.99,.041,.60,'#b4bfb1');
  washer(frontPair,-.474,.685,0,.922,'#468d87',.377);washer(frontPair,.474,.685,0,.922,'#438681',.377);
  // Real folded towel stacks set the household scale and break up the cool face.
  for(let j=0;j<3;j++){
    const tx=-.47+(j%2)*.027,yy=1.768+j*.059;
    box(frontPair,tx,yy,.012,.43,.057,.308,['#ce857d','#edd9b8','#a3c4b3'][j]);
    box(frontPair,tx,yy-.005,.169,.362,.009,.012,['#ae6b64','#ceb796','#81a995'][j]);
  }
  box(frontPair,.48,1.767,.030,.335,.050,.202,'#a48867');
  const promo=plate(frontPair,.477,1.956,.003,.255,.345,washPoster);promo.rotation.x=-.11;
  // Waiting bench sits along the side aisle now that the front bay contains the machines.
  box(glass,12.801,.756,-.602,.346,.096,1.06,'#bd9e76');for(const z of [-.98,-.22])box(glass,12.801,.578,z,.281,.274,.084,grout);
  for(const x of [13.45,15.52]){box(glass,x,2.439,-.01,.976,.056,.137,'#91a69c');box(glass,x,2.400,-.01,.899,.021,.086,'#e9ebca',cool);}
  // A little trolley-hood canopy is made of curved glass strips with metal transverse ribs.
  const hoodShape=new THREE.Shape();hoodShape.moveTo(0,0);hoodShape.quadraticCurveTo(.36,.015,.665,-.253);hoodShape.lineTo(.67,-.286);hoodShape.quadraticCurveTo(.35,-.018,0,-.036);hoodShape.closePath();
  const hood=new THREE.ExtrudeGeometry(hoodShape,{depth:4.72,bevelEnabled:false,curveSegments:5});
  const hoodMesh=new THREE.Mesh(hood,k.mat('#9dbeb0',{roughness:.36,metalness:.18,opacity:.73}));hoodMesh.rotation.y=-Math.PI/2;hoodMesh.position.set(17.13,2.597,1.070);signs.add(hoodMesh);
  for(let q=0;q<8;q++){const x=12.45+.661*q;line(signs,[[x,2.602,1.052],[x,2.576,1.309],[x,2.486,1.54],[x,2.345,1.736]],'#7f9c93',.018);}
  box(signs,lx,2.344,1.742,4.77,.060,.059,'#89c9b6',cool);
  roof(12.43,17.13,-3.02,lf,3.06);
  box(shells,lx,2.846,lf,4.72,.411,.161,'#9eb3a8');
  box(signs,lx,2.851,1.196,4.32,.424,.110,'#385e64');plate(signs,lx,2.853,1.255,4.177,.357,laundryFace);
  // Projecting wet-room glass blocks turn the service end into an architectural return.
  const blockMap=graphic('sea glass masonry',256,256,(c,w,h)=>{c.fillStyle='#597e83';c.fillRect(0,0,w,h);for(let j=0;j<4;j++)for(let i=0;i<4;i++){
    const x=i*64,y=j*64;c.fillStyle=['#8bb1a7','#96c1b3','#7da5a2','#9bbcae'][(i*3+j*7)%4];c.fillRect(x+3,y+3,58,58);c.strokeStyle='#c3d7c0';c.lineWidth=2;c.strokeRect(x+6,y+6,51,50);c.fillStyle='rgba(51,91,90,.26)';c.fillRect(x+9,y+48,43,5);}});
  plate(glass,17.156,1.62,-2.40,.91,.98,blockMap,Math.PI/2);
  const bubble=orient(signs,17.168,2.87,.767,Math.PI/2);
  disc(bubble,0,0,.023,.27,.095,'#427d78',20);disc(bubble,0,0,.080,.218,.03,'#d9d9b9',20);k.label(bubble,'24h',0,.005,.102,.346,.168,{color:'#3c6b69',font:'bold 94px Arial'});
  condenser(plant,16.39,3.30,-1.96,1.17);line(plant,[[16.1,3.293,-1.94],[15.41,3.293,-1.94],[15.41,3.293,-2.44]],'#839998',.042);

  // The walk-up's shared staircase clips the east side. Three individual
  // recessed apartments per storey overlook the shop roofs through warm glass.
  const ax=11.37,az=-7.16,aw=7.52,ad=5.23,af=az+ad/2,back=az-ad/2;
  const bodyLeft=ax-aw/2,bodyRight=ax+aw/2,innerX=bodyRight-.94,innerZ=af-.87;
  const cream='#baafa0',clay='#a78b77',rail='#667a7d';
  box(shells,(bodyLeft+innerX)/2,3.64,(back+innerZ)/2,innerX-bodyLeft,6.89,innerZ-back,'#a79f92');
  box(shells,bodyLeft+.061,3.64,az,.122,6.91,ad,'#aaa59a');
  box(shells,(bodyLeft+bodyRight)/2,3.64,back,aw,6.92,.142,'#b3a99a');
  const windowPaint=['#ebb77e','#9eb5ae','#e2c49b','#b48376','#6a8491','#f0bc85','#b6b59e','#edc997','#91a8ac'];
  const windowGlow=[.78,.35,.56,.32,.15,.85,.32,.68,.34];
  function dwelling(g,width,base,depth,variant){
    const h=1.79,tone=windowPaint[variant%windowPaint.length],ww=width;
    // Backing is set far behind the glass, so curtain, furnishings and pendant separate in parallax.
    box(g,0,base+.996,-depth,ww-.054,1.88,.052,tone,{emissive:tone,intensity:windowGlow[variant%windowGlow.length]});
    box(g,-ww*.438,base+1.015,-depth*.50,.08,1.86,depth,cream);
    box(g,0,base+.067,-depth/2,ww-.065,.086,depth,'#b69c77');
    for(const x of [-ww*.365,ww*.377])for(let j=0;j<2;j++){
      const scol=variant%3===1?'#c5b5a0':variant%3===2?'#93aaa0':'#d0b18f';
      box(g,x+j*.056,base+1.097,-.169,.101,1.61-j*.043,.069,scol,{emissive:scol,intensity:.10});
    }
    box(g,0,base+.73,-depth+.144,ww*.57,.33,.235,variant%3===1?'#849689':'#aa815f');
    box(g,0,base+.91,-depth+.134,ww*.63,.054,.283,'#ba9d7d');
    if(variant%3===1){
      box(g,.15,base+1.096,-depth+.183,.248,.294,.070,iron);box(g,.15,base+1.11,-depth+.223,.198,.21,.01,'#91a7a1');
    }else{
      cyl(g,-.113,base+.990,-depth+.16,.043,.05,.14,'#8f8774');cyl(g,-.113,base+1.14,-depth+.16,.061,.124,.145,'#ecd1a1',{emissive:'#ffd399',intensity:.61});
    }
    for(const xx of [-ww/2,ww/2])box(g,xx,base+1.03,.008,.074,1.94,.094,rail);
    box(g,ww*.027,base+1.027,.011,.045,h+.055,.073,rail);box(g,0,base+1.717,.018,ww,.033,.065,rail);
    box(g,0,base+.116,.013,ww+.03,.114,.106,'#8c9388');pane(g,0,base+1.006,-.018,ww-.07,1.763);
    if(variant%4===0)for(let j=0;j<3;j++)box(g,0,base+1.746+j*.06,-.079,ww*.83,.033,.047,'#b6ab93');
  }
  function railing(g,w,y,z,kind){
    box(g,0,y+.728,z,w,.059,.072,'#b8b9aa');box(g,0,y+.093,z,w,.035,.051,rail);
    const bars=Math.ceil(w/.28);for(let j=0;j<=bars;j++)box(g,-w/2+j*w/bars,y+.403,z,.028,.64,.033,rail);
    if(kind%3===0){box(g,0,y+.362,z-.034,w-.11,.36,.035,'#9ba9a1',{emissive:'#8b9d8f',intensity:.06});}
  }
  for(let row=0;row<3;row++){
    const by=.355+row*2.27;
    box(shells,ax,by,az,aw+.026,.158,ad+.025,'#ada89a');box(shells,ax,by+2.151,az,aw+.053,.145,ad+.036,cream);
    for(const x of [7.71,9.91,12.10,14.32])box(shells,x,by+1.07,af-.25,.162,2.12,.61,clay);
    for(let j=0;j<3;j++){
      const x=8.801+j*2.181,variant=row*3+j,w=j===2?1.89:1.93;
      const g=orient(glass,x,0,af-.148);dwelling(g,w,by,.773,variant);
      const d=j===1?.43:.62;
      box(g,0,by+.008,d*.39,w+.185,.097,d+.18,'#a5a396');box(g,0,by-.013,d-.027,w+.21,.125,.068,clay);
      railing(g,w+.076,by+.015,d+.014,variant);
      for(const xx of [-1,1])box(g,xx*(w*.50+.038),by+.409,d*.51,.033,.748,d,rail);
      if((row+j)%3===1)planter(g,-.36,by+.080,.23,.49,variant);
      if(row>0&&j===2){line(g,[[-.74,by+1.613,.1],[-.74,by+1.613,.425],[.68,by+1.613,.425]],'#a6b1a1',.012);box(g,.099,by+1.37,.432,.324,.456,.013,row===1?'#a1b1a3':'#d7bcaa');}
    }
    // A full-height corner apartment window on the return, with a narrow side balcony.
    const end=orient(glass,bodyRight-.123,0,af-1.17,Math.PI/2);dwelling(end,1.82,by,.724,row+4);
    box(end,0,by-.008,.189,2.08,.107,.501,clay);railing(end,1.995,by+.013,.422,row+1);
    // The translucent stairwell reveals actual diagonal flights and landings at night.
    const well=orient(glass,bodyRight-.07,by,back+1.52,Math.PI/2);
    box(well,0,1.058,-.749,2.17,1.94,.052,'#b5beb0',{emissive:'#e0c59e',intensity:.28});
    for(let j=0;j<9;j++){
      const t=j/8,x=(row%2===0?1:-1)*(-.81+t*1.61);
      box(well,x,.147+j*.178,-.406,.251,.082,.584,'#9fa59a');
    }
    line(well,[[(row%2?-1:1)*-.884,.635,-.164],[(row%2?-1:1)*.84,2.075,-.164]],'#7e918d',.021);
    for(const x of [-1.07,0,1.07])box(well,x,1.029,.007,.055,1.981,.071,'#6e817e');
    for(const y of [.134,1.11,2.01])box(well,0,y,.009,2.169,.047,.079,'#85958e');pane(well,0,1.066,-.01,2.09,1.88);
    for(const x of [7.87,9.18,10.50,11.81,13.12,14.44]){
      box(glass,x,by+1.09,back-.084,.837,.91,.049,iron);box(glass,x,by+1.09,back-.118,.769,.839,.031,windowPaint[(Math.round(x)+row*3)%6],softLight);
      box(glass,x,by+1.07,back-.146,.033,.843,.033,rail);
    }
  }
  // Ground-level side entry faces the alley between the shop roofs and stair tower.
  const entry=orient(glass,bodyRight+.032,0,af-2.55,Math.PI/2);
  box(entry,0,1.325,-.13,.658,1.76,.104,'#59716c');box(entry,.013,1.58,-.071,.51,.94,.019,'#a1b1a1',softLight);
  box(entry,-.197,1.19,-.047,.028,.168,.035,brass);box(entry,0,2.302,.03,.833,.089,.484,rail);
  box(entry,0,2.241,.171,.549,.02,.046,'#dec399',warm);
  roof(bodyLeft,bodyRight,back,af,7.21);
  box(plant,9.42,7.79,-8.21,1.61,.91,1.33,'#9fa396');box(plant,9.42,8.274,-8.21,1.728,.089,1.44,'#bac0ad');
  box(plant,9.42,7.78,-7.526,.67,.757,.048,'#7b8884');box(plant,9.63,7.75,-7.493,.087,.035,.024,brass);
  // A domestic rooftop drying rail and compact service bank crown the stairwell.
  for(const x of [12.27,13.64])line(plant,[[x,7.47,-6.62],[x,8.02,-6.62],[x,8.10,-6.47]],rail,.029);
  box(plant,12.954,8.107,-6.47,1.54,.023,.026,'#aaa9a0');
  for(const x of [10.86,11.85,12.84])condenser(plant,x,7.445,-8.91);
  cyl(plant,8.32,8.10,-8.73,.023,.033,1.68,'#abb4ac',{segments:8});
  for(let i=0;i<5;i++)box(plant,8.32,8.65,-9.01+i*.14,1.0-.12*i,.019,.023,'#a8b3b0');
  box(plant,8.32,8.64,-8.74,.021,.021,.86,'#85979a');
  for(const [x,z,top] of [[7.29,-2.78,5.1],[16.98,-2.89,3.04],[14.94,-9.64,7.18]])
    line(plant,[[x,top,z],[x+.14,top-.18,z-.06],[x+.14,.42,z-.06],[x+.24,.27,z+.01]],'#81938f',.043);
  for(const [x,y,z,c,power] of [[9.31,2.08,-.54,0xffc394,7.4],[11.35,3.10,1.98,0xf58d96,6.6],[14.73,2.17,-.13,0xa5dfcb,8.7]]){
    const light=new THREE.PointLight(c,power,5.7,2);light.position.set(x,y,z);signs.add(light);
  }
}
