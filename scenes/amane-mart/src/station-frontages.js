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
    const underside=y-.475;
    box(glass,x,(underside+.454)/2,z,w-.119,underside-.454,.395,'#765741');
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
  // Everything in the listening room sits on the oak finish over its slab.
  // The front and return windows look across the room to its actual rear wall.
  const loftFloor=3.098,loftCeiling=5.039;
  box(shells,9.365,3.0865,-.764,4.41,.023,3.90,'#ae8666');
  for(let i=1;i<17;i++)box(shells,7.159+i*.260,loftFloor+.001,-.764,.009,.002,3.897,'#927052');
  box(shells,9.36,4.079,-2.696,4.34,1.96,.026,'#c1a582',{emissive:'#d3ad86',intensity:.10});
  box(shells,9.36,3.406,-2.671,4.34,.605,.023,'#9f795c');
  box(shells,9.36,3.718,-2.657,4.35,.036,.041,'#bc9068');
  box(shells,9.36,5.050,-.764,4.42,.022,3.90,'#c1a481');
  for(const z of [-1.98,-.67,.66])box(shells,9.36,5.010,z,4.43,.059,.079,'#8a6951');
  const loftInside=orient(glass,0,loftFloor,0);
  // A continuous vintage hi-fi cabinet has a recessed plinth, four open bays
  // and one electronics bay; split spines, cover art and veneer have real depth.
  const cabinet=orient(loftInside,8.854,0,.015);
  box(cabinet,0,.073,0,2.425,.146,.481,'#6c5140');
  box(cabinet,0,.171,0,2.55,.050,.562,'#9c7354');
  box(cabinet,0,.465,-.244,2.53,.565,.049,'#785b48');
  for(const xx of [-1.244,-.749,-.244,.244,.749,1.244])box(cabinet,xx,.461,0,.043,.577,.539,'#ac805b');
  box(cabinet,0,.771,0,2.605,.067,.609,'#c19067');
  const spines=['#c9a57e','#5f7774','#d1bc9c','#9b6958','#b99b7a','#748388'];
  for(let bay=0;bay<5;bay++){
    const cx=-.997+bay*.499;
    if(bay===3){
      box(cabinet,cx,.297,.043,.409,.195,.363,'#4f5a57');
      box(cabinet,cx,.301,.231,.378,.144,.015,'#aaab9b');
      disc(cabinet,cx+.107,.301,.250,.044,.021,'#7e847e',12);
      box(cabinet,cx-.073,.321,.248,.122,.049,.015,'#415653');continue;
    }
    for(let j=0;j<7;j++){
      const sx=cx-.168+j*.054,h=.335+((j+3*bay)%4)*.021;
      box(cabinet,sx,.197+h/2,.030,.042,h,.385,spines[(j+bay)%spines.length]);
      box(cabinet,sx,.292,.228,.026,.046,.008,'#e6d3ab');
    }
    if(bay===0||bay===4){box(cabinet,cx,.393,.239,.341,.386,.022,'#695e4d');plate(cabinet,cx,.396,.254,.322,.354,bay===0?featureAlbum:rackGraphic);}
  }
  const player=orient(cabinet,.126,.805,0,-.043);
  box(player,0,.041,0,.652,.082,.448,'#73553e');box(player,0,.090,0,.629,.019,.429,'#a2a294');
  cyl(player,-.073,.106,-.006,.177,.177,.023,'#2e3b40',{segments:24});cyl(player,-.073,.121,-.006,.051,.051,.012,'#ce9473');
  line(player,[[.236,.136,-.137],[.228,.165,-.071],[.091,.159,.053]],'#bfc2ad',.011);
  function speaker(parent,x,y,z,w,h){
    box(parent,x,y+h/2,z,w,h,.30,'#715742');box(parent,x,y+h/2,z+.157,w-.035,h-.038,.022,'#3e4645');
    disc(parent,x,y+h*.385,z+.178,w*.34,.023,'#787b6e',18);disc(parent,x,y+h*.385,z+.193,w*.253,.016,'#4d5554',18);
    disc(parent,x,y+h*.769,z+.18,w*.105,.019,'#a5a28b',12);
  }
  speaker(cabinet,-1.021,.805,-.033,.303,.526);speaker(cabinet,1.014,.805,-.033,.303,.526);
  const armchair=orient(loftInside,10.831,0,.328,-Math.PI*.60);
  for(const xx of [-.266,.266])for(const zz of [-.239,.239])box(armchair,xx,.179,zz,.064,.358,.069,'#947051');
  box(armchair,0,.358,0,.644,.091,.621,'#947151');box(armchair,0,.455,.015,.614,.115,.584,'#809183');
  const chairBack=box(armchair,0,.682,-.247,.636,.438,.110,'#7a8b7f');chairBack.rotation.x=-.105;
  for(const xx of [-.336,.336]){box(armchair,xx,.524,.162,.046,.291,.05,cedar);box(armchair,xx,.666,-.007,.062,.052,.511,'#b18a64');}
  const table=orient(loftInside,10.26,0,.618);
  cyl(table,0,.026,0,.174,.185,.052,'#817766',{segments:16});cyl(table,0,.242,0,.038,.038,.385,'#887e65',{segments:10});
  cyl(table,0,.460,0,.268,.26,.048,'#c09970',{segments:20});cyl(table,.078,.50,-.051,.061,.063,.028,'#a8aea0',{segments:14});
  cyl(table,.078,.546,-.051,.051,.041,.072,'#ced1b6',{segments:14});
  // An acoustic wall and display rail are fixed against the real back surface.
  for(let j=0;j<9;j++)box(loftInside,7.59+j*.147,.995,-2.642,.068,1.82,.042,'#a47b59');
  box(loftInside,10.088,.825,-2.535,1.62,.059,.212,'#9a7253');
  for(const [x,tex] of [[9.64,rackGraphic],[10.17,featureAlbum],[10.68,album(2)]]){
    box(loftInside,x,1.061,-2.622,.414,.414,.025,'#866b53');plate(loftInside,x,1.061,-2.605,.387,.387,tex);
  }
  // The leads visibly connect to canopy roses at the actual ceiling.
  for(const [x,z] of [[8.49,.42],[10.55,-.35]]){
    cyl(glass,x,loftCeiling-.016,z,.088,.088,.032,'#92785b',{segments:12});
    line(glass,[[x,loftCeiling-.031,z],[x,4.604,z]],'#7e725d',.012);
    lamp(glass,x,4.407,z,1.02);
  }
  // A short bracketed window box leaves a clear view of the listening chair.
  for(const x of [9.36,9.91])line(glass,[[x,3.28,1.23],[x,3.42,1.51],[x,3.42,1.23]],'#72695b',.021);
  box(glass,9.635,3.449,1.38,.82,.055,.37,'#877358');
  planter(glass,9.635,3.477,1.40,.71,0);
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
  const tariff=graphic('laundry tariff',400,156,(c,w,h)=>{
    c.fillStyle='#6e978e';c.fillRect(0,0,w,h);c.fillStyle='#edf0dd';c.fillRect(5,5,w-10,h-10);
    letter(c,'ご利用料金',18,37,30,'#406660',jp);c.fillStyle='#a7b7a5';c.fillRect(16,61,w-32,2);
    letter(c,'洗濯  30分',20,89,20,'#58746e',jp);letter(c,'¥ 400',265,89,21,'#466963','Arial');
    letter(c,'乾燥  10分',20,123,20,'#58746e',jp);letter(c,'¥ 100',265,123,21,'#466963','Arial');
  });
  plate(glass,14.31,1.972,-2.855,1.02,.398,tariff);
  const counter=orient(glass,16.44,0,-.359,Math.PI/2);
  box(counter,.01,1.095,0,1.27,.076,.62,'#d0b68e');for(const x of [-.494,.494])for(const z of [-.211,.212])box(counter,x,.764,z,.059,.624,.059,grout);
  for(let j=0;j<3;j++)box(counter,-.207,1.163+j*.050,.01,.416,.049,.279,['#c6d0b5','#e7dfc6','#ccab96'][j]);
  // A regular laundry basket and a compact waiting bench stay to the sides of the entrance.
  box(glass,15.828,.545,-.648,.43,.063,.303,'#a4b6ad');
  for(const y of [.655,.77]){for(const dx of [-.206,.206])box(glass,15.828+dx,y,-.648,.014,.020,.292,grout);for(const dz of [-.15,.15])box(glass,15.828,y,-.648+dz,.426,.02,.014,grout);}
  for(let i=0;i<6;i++)for(const dz of [-.143,.143])box(glass,15.633+i*.077,.638,-.648+dz,.013,.245,.014,'#879d95');
  // The two machines stand against the west wall, with their doors aimed
  // across the room. There is working space on the hinge side of both drums.
  const wallPair=orient(glass,12.842,0,-.285,Math.PI/2);
  box(wallPair,0,.544,0,1.96,.203,.557,'#91a59b');box(wallPair,0,.666,0,1.99,.041,.60,'#b4bfb1');
  washer(wallPair,-.474,.686,0,.922,'#468d87',.377);washer(wallPair,.474,.686,0,.922,'#438681',.377);
  // Three towels now belong on the folding counter, with a small care card.
  for(let j=0;j<3;j++){
    const tx=.32+(j%2)*.017,yy=1.162+j*.058;
    box(counter,tx,yy,-.054,.386,.057,.283,['#ce857d','#edd9b8','#a3c4b3'][j]);
    box(counter,tx,yy-.005,.092,.333,.009,.009,['#ae6b64','#ceb796','#81a995'][j]);
  }
  plate(glass,12.552,2.029,-.525,.359,.51,washPoster,Math.PI/2);
  // Two waiting seats flank a low magazine shelf behind the display glass.
  // Their backrests face the window and seated customers face the machines.
  const seat=orient(glass,14.061,.442,.822,Math.PI);
  for(const x of [-.437,.437]){
    for(const z of [-.164,.164])box(seat,x,.211,z,.046,.422,.050,'#6d827b');
    box(seat,x,.144,0,.042,.037,.373,'#85978d');
  }
  box(seat,0,.395,0,1.143,.075,.392,'#9c825f');
  for(const xx of [-.286,.286]){
    box(seat,xx,.47,.007,.532,.088,.387,'#a8b7a2');
    for(const dx of [-.179,.18])box(seat,xx+dx,.605,-.171,.038,.322,.035,grout);
    box(seat,xx,.723,-.175,.537,.191,.052,'#b39369');
  }
  const rack=orient(glass,13.333,.442,.823,Math.PI);
  for(const xx of [-.114,.114])box(rack,xx,.236,0,.029,.472,.224,grout);
  box(rack,0,.119,0,.258,.04,.235,'#9a866c');
  box(rack,0,.289,-.046,.248,.342,.052,'#bfae8b');
  const guide=plate(rack,0,.294,.012,.221,.278,washPoster);guide.rotation.x=-.14;
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
  const bodyLeft=ax-aw/2,bodyRight=ax+aw/2,innerX=bodyRight-1.22,innerZ=af-1.95;
  const cream='#baafa0',clay='#a78b77',rail='#667a7d';
  box(shells,(bodyLeft+innerX)/2,3.64,(back+innerZ)/2,innerX-bodyLeft,6.89,innerZ-back,'#a79f92');
  box(shells,bodyLeft+.061,3.64,az,.122,6.91,ad,'#aaa59a');
  box(shells,(bodyLeft+bodyRight)/2,3.64,back,aw,6.92,.142,'#b3a99a');
  const windowPaint=['#ebb77e','#9eb5ae','#e2c49b','#b48376','#6a8491','#f0bc85','#b6b59e','#edc997','#91a8ac'];
  const windowGlow=[.78,.35,.56,.32,.15,.85,.32,.68,.34];
  // Measure the rear row from the actual wall edges so both end frames
  // stay inside the masonry, with the same corner clearance on each side.
  const rearWindowCount=6,rearWindowWidth=.837,rearWindowInset=.38;
  const rearWindowFirst=bodyLeft+rearWindowInset+rearWindowWidth/2;
  const rearWindowStep=(aw-2*rearWindowInset-rearWindowWidth)/(rearWindowCount-1);
  // The sash is the outermost skin of the dwelling. Two separate glazed
  // leaves sit in different tracks, with the curtains and room behind both.
  const sashInk='#485557',sashLip='#9a9a88';
  const nightGlass=new THREE.MeshBasicMaterial({color:'#778f9b',transparent:true,opacity:.17,depthWrite:false,side:THREE.DoubleSide});
  const curtainProfiles=[
    [.19,.12,'#c6ac8d'],[.70,.20,'#89a8a2'],[.12,.44,'#c88974'],
    [.27,.57,'#b2b8a6'],[.80,.60,'#8797a0'],[.13,.14,'#d7b891'],
    [.14,.12,'#cab398'],[.28,.28,'#c68f7d'],[.39,.13,'#a9b29b']
  ];
  function drape(g,outerX,direction,amount,color){
    const segments=14,positions=[],indices=[];
    for(let i=0;i<=segments;i++){
      const t=i/segments,fold=Math.cos(i*Math.PI*2/3.5);
      const x=outerX+direction*amount*t,z=-.162+.034*fold;
      positions.push(x,1.913,z,x-direction*.014*t,.174+.018*fold,z-.025);
      if(i<segments){const a=2*i;indices.push(a,a+1,a+2,a+2,a+1,a+3);}
    }
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setIndex(indices);geometry.computeVertexNormals();
    const material=new THREE.MeshStandardMaterial({color,roughness:1,side:THREE.DoubleSide,emissive:color,emissiveIntensity:.20});
    g.add(new THREE.Mesh(geometry,material));
  }
  function balconyDoors(g,variant){
    const w=1.61,h=1.86,sill=.126,top=sill+h,half=w/2;
    const walls=['#c0ad94','#ac9d87','#b6a38c'];
    for(const side of [-1,1]){
      box(g,side*.947,1.082,0,.285,2.166,.17,walls[variant%3]);
      box(g,side*(half+.016),(sill+top)/2,.032,.068,h+.068,.156,sashInk);
      box(g,side*(half+.053),(sill+top)/2,.074,.018,h+.084,.043,sashLip);
    }
    box(g,0,2.073,0,w+.035,.179,.17,walls[variant%3]);
    box(g,0,top,.028,w+.082,.075,.144,sashInk);
    box(g,0,sill,.017,w+.087,.062,.217,sashLip);
    for(const side of [-1,1]){
      const mid=side*(w/4-.009),z=side>0?.041:-.014,leafW=half+.017;
      const glassPane=new THREE.Mesh(new THREE.PlaneGeometry(leafW-.079,h-.097),nightGlass);
      glassPane.position.set(mid,(top+sill)/2,z);g.add(glassPane);
      for(const sign of [-1,1]){
        box(g,mid+sign*(leafW/2-.017),(sill+top)/2,z+.004,.035,h-.037,.037,sashInk);
      }
      box(g,mid,sill+.065,z+.008,leafW,.092,.042,sashLip);
      box(g,mid,top-.044,z+.008,leafW,.050,.042,sashLip);
      // Pane dividers and recessed pulls make the sliding mechanism legible.
      box(g,mid,.829,z+.013,leafW-.034,.036,.034,sashInk);
      if((variant+side)%3===0){
        box(g,mid,.497,z-.017,leafW-.053,.605,.018,'#abc0b6',{emissive:'#acae97',intensity:.16});
      }
    }
    box(g,.045,1.067,.072,.034,.151,.025,'#bca587');
    const [left,right,color]=curtainProfiles[variant];
    drape(g,-half,1,left,color);drape(g,half,-1,right,color);
    if(variant===2||variant===6){
      // One parked shoji screen overlaps the fixed leaf inside its reveal.
      const x=variant===2?-.559:.559,z=-.116;
      box(g,x,1.062,z,.462,1.755,.018,'#e8d3a7',{emissive:'#f5c487',intensity:.56});
      for(const offset of [-.228,0,.228])box(g,x+offset,1.06,z+.017,.019,1.78,.031,'#967b5e');
      for(let i=0;i<6;i++)box(g,x,.177+i*.353,z+.019,.471,.019,.036,'#967b5e');
    }
  }
  function livingBay(g,variant){
    const depth=1.65,tone=windowPaint[variant],fixture={emissive:tone,intensity:windowGlow[variant]};
    box(g,0,1.098,-depth,2.135,2.049,.084,tone,fixture);
    box(g,0,.191,-depth+.049,2.106,.159,.051,'#a68c73');
    box(g,0,.097,-depth/2,2.138,.036,depth,'#ba9471');
    box(g,-1.055,1.095,-depth/2,.066,2.048,depth,'#bdac93');
    box(g, 1.055,1.095,-depth/2,.066,2.048,depth,'#b1a28a');
    const floor=.115;
    if(variant%3===0){
      const z=-1.17;
      for(const x of [-.68,.42])for(const dz of [-.235,.235])box(g,x,floor+.072,z+dz,.071,.144,.067,walnut);
      box(g,-.13,floor+.275,z,1.29,.262,.601,'#99876d');
      box(g,-.13,floor+.425,z,1.27,.089,.593,'#c7aa80');
      box(g,-.13,floor+.611,z-.259,1.30,.345,.115,'#b19575');
      const pillow=box(g,-.465,floor+.566,z-.112,.304,.220,.080,'#b97766');pillow.rotation.x=-.17;
    }else if(variant%3===1){
      const z=-1.31;
      for(const x of [-.50,.49])for(const dz of [-.178,.178])box(g,x,floor+.32,z+dz,.049,.64,.049,walnut);
      box(g,0,floor+.676,z,1.16,.072,.459,'#b59168');
      for(let i=0;i<4;i++)box(g,-.387+i*.069,floor+.829,z-.046,.062,.233,.15,['#a46f56','#b8a175','#698785','#79879b'][i]);
    }else{
      const z=-1.41;
      box(g,-.27,floor+.322,z,1.19,.644,.31,'#ac8567');
      for(const yy of [.25,.53]){box(g,-.27,floor+yy,z+.161,1.15,.236,.022,'#ba9470');box(g,-.27,floor+yy+.064,z+.179,.119,.021,.02,brass);}
      box(g,-.27,floor+.664,z,1.24,.043,.354,'#cfab7b');
      cyl(g,-.56,floor+.760,z,.057,.060,.149,'#67918a',{segments:14});
      for(const side of [-1,1])line(g,[[-.56,floor+.825,z],[-.56+side*.103,floor+1.025,z+.041]],'#78886b',.009);
    }
    if(variant===1||variant===7){
      // A calendar against the far wall and a task lamp over the writing
      // surface are separated from the threshold by the full room depth.
      const cal=graphic('residents wall calendar',176,235,(c,w,h)=>{
        c.fillStyle='#e2d8bd';c.fillRect(0,0,w,h);
        c.fillStyle='#6c928d';c.fillRect(7,9,w-14,111);
        c.fillStyle='#eabd94';c.beginPath();c.arc(131,38,13,0,Math.PI*2);c.fill();
        c.fillStyle='#526d78';c.beginPath();c.moveTo(7,97);c.lineTo(67,54);c.lineTo(92,76);c.lineTo(123,59);c.lineTo(169,100);c.lineTo(169,121);c.lineTo(7,121);c.fill();
        for(let j=0;j<5;j++)for(let i=0;i<7;i++){
          const date=i+j*7-1;if(date>=1&&date<=30)letter(c,String(date),12+i*23,145+j*17,10,i===0?'#bd7764':'#565c51','Arial');
        }
      });
      box(g,-.46,1.386,-depth+.057,.344,.458,.028,'#937a5f');
      plate(g,-.46,1.385,-depth+.073,.319,.428,cal);
      cyl(g,.35,.831,-1.37,.089,.092,.059,'#7e8f84',{segments:12});
      line(g,[[.35,.86,-1.37],[.35,1.096,-1.37],[.26,1.149,-1.34]],'#77827b',.014);
      cyl(g,.26,1.116,-1.34,.051,.091,.085,'#8c9d8d',{segments:12});
      cyl(g,.26,1.073,-1.34,.082,.084,.01,'#f9dc9f',{segments:12,emissive:'#edc187',intensity:.55});
    }
    if(variant===3||variant===6){
      // Reed strip paneling anchors one half of the living room, on the
      // actual back wall behind the sofa.
      box(g,.44,1.28,-depth+.054,.676,1.38,.017,'#a48767');
      for(let i=0;i<8;i++)box(g,.139+i*.085,1.28,-depth+.079,.029,1.38,.042,'#b59a75');
    }
    balconyDoors(g,variant);
  }
  function balconyRail(g,w,z){
    const h=.994,post='#697b7a';
    box(g,0,h,z,w+.043,.052,.076,'#b4b4a6');box(g,0,.158,z,w,.048,.051,rail);
    const n=Math.ceil(w/.175);
    for(let i=0;i<=n;i++)box(g,-w/2+i*w/n,.578,z,i===0||i===n?.046:.025,.814,.035,post);
  }
  for(let row=0;row<3;row++){
    const by=.355+row*2.27;
    box(shells,ax,by,az,aw+.026,.158,ad+.025,'#ada89a');box(shells,ax,by+2.151,az,aw+.053,.145,ad+.036,cream);
    for(let j=0;j<3;j++){
      const x=8.801+j*2.181,variant=row*3+j;
      const g=orient(glass,x,by,af-.18);
      livingBay(g,variant);
    }
    // The slab and its tiled edge run continuously across the three homes.
    // Half-height divisions with full-height escape panels separate neighbors.
    const balcony=orient(glass,10.982,by,af-.18);
    const w=6.62,d=.83,face=d-.015;
    box(balcony,0,.029,d*.5-.01,w,.110,d+.04,'#abaaa0');
    box(balcony,0,.009,face,w+.04,.16,.10,'#a48e79');
    box(balcony,0,-.057,face+.051,w+.04,.025,.026,'#807367');
    balconyRail(balcony,w,face);
    for(const x of [-w/2,w/2]){
      box(balcony,x,.994,face*.50,.056,.052,face,'#b4b4a6');
      box(balcony,x,.158,face*.50,.038,.044,face,rail);
      for(let i=0;i<5;i++)box(balcony,x,.579,face*i/5,.028,.813,.030,rail);
    }
    for(const x of [-1.091,1.091]){
      box(balcony,x,.857,.351,.042,1.398,.566,'#abada1');
      for(const z of [.060,.641])box(balcony,x,.829,z,.049,1.474,.043,'#657574');
      box(balcony,x,1.569,.35,.051,.051,.634,'#80918d');
    }
    if(row!==1)planter(balcony,1.57,.085,.61,.59,row+1);
    // East end wall turns the street elevation into the service alley. A
    // flush, frosted stair window uses a sill rather than a fictitious balcony.
    box(shells,14.691,by+1.09,af-.102,.906,2.17,.181,clay);
    const end=orient(glass,bodyRight-.012,by,af-1.49,Math.PI/2);
    box(end,0,1.062,0,2.97,2.131,.116,'#b8a896');
    box(end,.04,1.302,.066,1.63,1.16,.107,sashInk);
    box(end,.04,1.302,.124,1.52,1.05,.017,windowPaint[(row*2+1)%9],{emissive:'#c5bda5',intensity:.25});
    box(end,.04,1.30,.147,.045,1.09,.032,sashInk);
    box(end,.04,.719,.113,1.72,.076,.23,sashLip);
    // The translucent stairwell reveals actual diagonal flights and landings at night.
    const well=orient(glass,bodyRight-.07,by,back+1.52,Math.PI/2);
    // Close the strip between the top of the stair window plan and the
    // rear corner, including its overlap with the solid rear masonry.
    box(shells,bodyRight-.056,by+1.068,back+.21,.112,2.15,.51,clay);
    box(well,0,1.058,-.749,2.17,1.94,.052,'#b5beb0',{emissive:'#e0c59e',intensity:.28});
    for(let j=0;j<9;j++){
      const t=j/8,x=(row%2===0?1:-1)*(-.81+t*1.61);
      box(well,x,.147+j*.178,-.406,.251,.082,.584,'#9fa59a');
    }
    line(well,[[(row%2?-1:1)*-.884,.635,-.164],[(row%2?-1:1)*.84,2.075,-.164]],'#7e918d',.021);
    for(const x of [-1.07,0,1.07])box(well,x,1.029,.007,.055,1.981,.071,'#6e817e');
    for(const y of [.134,1.11,2.01])box(well,0,y,.009,2.169,.047,.079,'#85958e');pane(well,0,1.066,-.01,2.09,1.88);
    for(let column=0;column<rearWindowCount;column++){
      const x=rearWindowFirst+column*rearWindowStep;
      box(glass,x,by+1.09,back-.084,rearWindowWidth,.91,.049,iron);box(glass,x,by+1.09,back-.118,.769,.839,.031,windowPaint[(column+row*3)%6],softLight);
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
