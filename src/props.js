import * as THREE from 'three';

// Furniture dimensions and offsets are in the same metre-scale as the shop.
export function buildProps(k) {
  const { group, box, cyl, label, mat, glow } = k;
  const ink = '#293044';
  const steel = '#8da7ae';
  const chrome = '#c1cec8';
  const enamel = '#d7dac8';
  const coral = '#e65e55';
  const metal = { roughness: 0.32 };
  const materialCache = new Map();
  const localMaterial = (c, opts = {}) => {
    const key = c + JSON.stringify(opts);
    if (!materialCache.has(key)) materialCache.set(key, mat(c, opts));
    return materialCache.get(key);
  };
  const rodGeometry = new THREE.CylinderGeometry(1, 1, 1, 8);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  function rod(p, from, to, r, color, opts = {}) {
    a.fromArray(from);
    b.fromArray(to).sub(a);
    if (b.lengthSq() < 1e-10) return;
    const s = new THREE.Mesh(rodGeometry, localMaterial(color, opts));
    s.position.copy(a).addScaledVector(b, 0.5);
    s.scale.set(r, b.length(), r);
    s.quaternion.setFromUnitVectors(up, b.normalize());
    p.add(s);
    return s;
  }
  function path(p, points, r, color, opts = {}) {
    for (let i = 1; i < points.length; i++) rod(p, points[i-1], points[i], r, color, opts);
  }
  function curve(p, points, r, color, divisions = 14) {
    const spline = new THREE.CatmullRomCurve3(points.map(q => new THREE.Vector3(...q)));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(spline, divisions, r, 5, false),localMaterial(color));
    p.add(mesh);
    return mesh;
  }
  function part(p, x, y, z, rot = 0) {
    const q = new THREE.Group();
    q.position.set(x,y,z);
    q.rotation.y = rot;
    p.add(q);
    return q;
  }
  function torus(p, x, y, z, radius, thickness, color, arc = Math.PI*2, start = 0) {
    const q = new THREE.Mesh(new THREE.TorusGeometry(radius, thickness, 7, Math.max(12, Math.round(42*arc/(Math.PI*2))), arc), localMaterial(color,metal));
    q.position.set(x,y,z);
    q.rotation.z = start;
    p.add(q);
    return q;
  }
  function panel(p, x,y,z,w,h, draw, rotationY=0, emissive=0) {
    const canvas = document.createElement('canvas');
    canvas.width = 768;
    canvas.height = Math.max(96, Math.round(768 * h/w));
    const ctx = canvas.getContext('2d');
    ctx.scale(canvas.width/1000,canvas.height/(1000*h/w));
    draw(ctx,1000,1000*h/w);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    const material = new THREE.MeshStandardMaterial({
      map:texture, color:0xffffff, roughness:0.51, emissive:0xffffff, emissiveMap:texture, emissiveIntensity:emissive
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w,h),material);
    mesh.position.set(x,y,z); mesh.rotation.y = rotationY; p.add(mesh);
    return mesh;
  }
  function text(ctx, s, x, y, size, color, weight=700, align='left') {
    ctx.fillStyle=color;
    ctx.font=weight+' '+size+'px "Yu Gothic","Meiryo","Noto Sans JP",sans-serif';
    ctx.textAlign=align; ctx.textBaseline='middle'; ctx.fillText(s,x,y);
  }
  function sodaGraphic(c,w,h) {
    c.fillStyle='#d74940'; c.fillRect(0,0,w,h);
    c.fillStyle='#f39371'; c.beginPath(); c.moveTo(0,h*.79); c.bezierCurveTo(w*.27,h*.69,w*.18,h*.19,w*.57,0); c.lineTo(w*.67,0); c.bezierCurveTo(w*.31,h*.37,w*.4,h*.73,0,h*.92);c.fill();
    c.fillStyle='#efc6a5';c.beginPath();c.arc(w*.83,h*.30,h*.13,0,2*Math.PI);c.fill();
    c.fillStyle='#f8eacf';c.beginPath();c.arc(w*.88,h*.165,h*.055,0,2*Math.PI);c.fill();
    text(c,'純喫茶',w*.085,h*.19,46,'#ffe9ca',800);
    text(c,'夕凪ソーダ',w*.085,h*.53,135,'#fff9d9',900);
    text(c,'Y U N A G I    S O D A',w*.09,h*.82,34,'#ffdfbb',700);
  }

  const vendor = part(group('drinks-vending-machine',2.55),-5.69,.18,.32);
  // Recessed product display, three lit shelves, button strip and cash panel.
  for (const x of [-.44,.44]) for(const z of [-.26,.26]) box(vendor,x,.054,z,.19,.108,.19,ink);
  box(vendor,0,1.135,0,1.19,2.09,.80,'#9f393b');
  box(vendor,0,1.145,.014,1.15,2.06,.79,coral,metal);
  box(vendor,0,2.195,.006,1.20,.055,.81,'#f7967a',metal);
  box(vendor,0,2.122,.423,1.08,.09,.052,'#efbaa0');
  label(vendor,'COLD DRINKS',-.20,2.122,.454,.60,.073,{color:'#853e3a'});
  box(vendor,-.088,1.556,.42,.91,1.045,.067,'#732e37');
  box(vendor,-.088,1.556,.459,.859,.983,.025,'#c9e6d8',{emissive:'#fff2cb',intensity:.65});
  const containerColors=['#ffba52','#d9e3b5','#a7d5d5','#dc6353','#edba6a','#5f9e99','#ece0c1','#f6ad8f','#729eb0','#b4b371','#d7af6c','#e4d8ac'];
  for(let row=0;row<3;row++){
    const y=1.15+row*.301;
    for(let col=0;col<7;col++){
      const x=-.433+col*.113;
      const palette=containerColors[(row*4+col*5)%containerColors.length];
      const isCan=(row+col)%3===0;
      cyl(vendor,x,y+.080,.481,.038,.039,.158,palette,{segments:9,emissive:palette,intensity:.18});
      if(!isCan) {
        cyl(vendor,x,y+.172,.481,.017,.037,.037,palette,{segments:9});
        cyl(vendor,x,y+.197,.481,.020,.020,.018,row===1?'#446953':'#f0e6c9',{segments:8});
      } else cyl(vendor,x,y+.160,.481,.034,.037,.011,'#e2dbba',{segments:9});
      cyl(vendor,x,y+.08,.481,.040,.040,.068,row===2?'#f4dcaa':'#f7ebd5',{segments:9});
      box(vendor,x,y+.085,.522,.055,.018,.005,palette);
      box(vendor,x,y-.029,.512,.075,.021,.012,'#304960');
      box(vendor,x,y-.027,.523,.034,.009,.005,'#78c5d8',{emissive:'#59d8f3',intensity:1});
    }
    box(vendor,-.088,y-.002,.468,.859,.026,.108,'#e9dbc5',{emissive:'#eadaaa',intensity:.35});
  }
  box(vendor,-.088,2.006,.48,.855,.024,.04,'#ffffe1',{emissive:'#fffad2',intensity:2});
  box(vendor,.444,1.43,.425,.165,.52,.065,'#763b44');
  box(vendor,.444,1.587,.464,.116,.075,.021,'#384c55');
  box(vendor,.444,1.59,.477,.075,.04,.005,'#8de3bc',{emissive:'#88f7ab',intensity:.75});
  box(vendor,.444,1.482,.469,.084,.013,.018,ink);
  cyl(vendor,.444,1.362,.477,.036,.036,.009,'#d4cfc0',{segments:12}).rotation.x=Math.PI/2;
  box(vendor,.444,1.222,.468,.084,.043,.021,'#b99e85');
  panel(vendor,0,.771,.419,1.055,.448,sodaGraphic,0,.13);
  panel(vendor,.598,1.161,.003,.65,1.59,(c,w,h)=>{
    c.fillStyle='#c64f49';c.fillRect(0,0,w,h);
    c.fillStyle='#e77c64';c.beginPath();c.moveTo(0,h*.82);c.bezierCurveTo(w*.49,h*.78,w*.42,h*.42,w,h*.32);c.lineTo(w,h*.44);c.bezierCurveTo(w*.64,h*.51,w*.65,h*.81,0,h*.93);c.fill();
    text(c,'夕',w*.50,h*.20,390,'#f9dcc2',900,'center');
    text(c,'凪',w*.50,h*.37,390,'#f9dcc2',900,'center');
    text(c,'ソーダ',w*.50,h*.49,215,'#fdeace',800,'center');
    text(c,'YUNAGI',w*.50,h*.87,110,'#f4c4a2',800,'center');
  },Math.PI/2,.13);
  box(vendor,-.102,.339,.425,.70,.222,.06,'#863e3f');
  box(vendor,-.102,.338,.46,.629,.157,.027,'#342e3b');
  box(vendor,-.102,.397,.48,.626,.036,.012,'#937d80');
  for(let t=0;t<6;t++)box(vendor,.402,.245+t*.026,.422,.150,.010,.013,'#9f4644');
  for(let j=0;j<3;j++)box(vendor,-.2,.154+j*.018,.42,.56,.007,.01,'#ac4945');
  const vendLight=new THREE.PointLight(0xff977b,1.8,3.8,2);
  vendLight.position.set(-.1,1.26,.61);vendor.add(vendLight);

  const cycle=part(group('parked-step-through-bicycle',3.04),-2.55,.18,1.80,-.13);
  const paint='#84bbbc', metalDark='#49596a', rim='#bccfcf';
  for(const x of [-.62,.63]){
    torus(cycle,x,.335,0,.301,.035,'#293546');
    torus(cycle,x,.335,.001,.277,.012,rim);
    for(let i=0;i<16;i++){
      const t=i*Math.PI/8;
      rod(cycle,[x+Math.cos(t)*.272,.335+Math.sin(t)*.272,.002],[x,.335,(i%2?1:-1)*.031],.0046,'#a5b5b8');
    }
    rod(cycle,[x,.335,-.044],[x,.335,.044],.03,metalDark);
    torus(cycle,x,.335,0,.346,.016,'#a7c6c7',Math.PI*.91,.14);
  }
  const rear=[-.62,.335,0],crank=[-.095,.333,0],seat=[-.254,.749,.004],head=[.387,.765,.007],front=[.63,.335,0];
  rod(cycle,crank,seat,.031,paint);
  for(const s of [-1,1]){
    rod(cycle,[rear[0],rear[1],s*.036],[seat[0],seat[1],s*.024],.016,paint);
    rod(cycle,[rear[0],rear[1],s*.036],[crank[0],crank[1],s*.022],.018,paint);
    rod(cycle,[head[0]+.008,head[1]-.075,s*.033],[front[0],front[1],s*.043],.022,paint);
  }
  curve(cycle,[[crank[0],crank[1],0],[.097,.369,0],[.234,.514,0],[.373,.702,.004],[head[0],head[1],.006]],.030,paint);
  curve(cycle,[[-.199,.594,0],[-.063,.482,0],[.084,.459,0],[.248,.581,0],[.373,.731,0]],.019,paint);
  rod(cycle,[-.254,.746,0],[-.288,.878,0],.019,chrome);
  box(cycle,-.306,.885,0,.234,.047,.14,'#654b49');
  rod(cycle,[head[0],head[1],0],[.363,.926,0],.019,chrome);
  curve(cycle,[[.265,.959,-.161],[.342,.971,-.128],[.371,.929,0],[.331,.969,.114],[.248,.962,.177]],.015,chrome);
  rod(cycle,[.265,.959,-.161],[.22,.96,-.184],.020,ink);
  rod(cycle,[.287,.967,.163],[.217,.959,.19],.020,ink);
  curve(cycle,[[.25,.943,.15],[.49,.839,.047],[.52,.754,.044],[.476,.658,.04]],.006,'#444753');
  torus(cycle,-.095,.333,.042,.081,.012,'#a5aea9');
  box(cycle,-.32,.352,.047,.50,.065,.024,'#8facad');
  rod(cycle,[-.095,.333,.066],[-.016,.246,.090],.013,chrome);
  box(cycle,-.016,.246,.103,.068,.022,.084,ink);
  rod(cycle,[-.095,.333,-.043],[-.166,.413,-.073],.013,chrome);
  box(cycle,-.166,.413,-.092,.068,.022,.084,ink);
  rod(cycle,[-.265,.363,-.007],[-.37,.032,.127],.012,chrome);
  path(cycle,[[-.61,.354,.048],[-.693,.714,.067],[-.36,.714,.068],[-.619,.344,.043]],.011,metalDark);
  box(cycle,-.597,.717,0,.373,.018,.145,metalDark);
  box(cycle,-.798,.67,.002,.038,.039,.055,'#d85545',{emissive:'#ff594b',intensity:.16});
  // Front wire basket is open at the top, with a tapered woven steel cage.
  for(const side of [-1,1]) {
    path(cycle,[[.441,.73,side*.091],[.727,.73,side*.091],[.764,.949,side*.129],[.412,.949,side*.129],[.441,.73,side*.091]],.009,'#809298');
    for(let n=1;n<6;n++){
      const s=n/6;
      rod(cycle,[.441+.286*s,.73,side*.091],[.412+.352*s,.949,side*.129],.0049,steel);
    }
    rod(cycle,[.425,.841,side*.110],[.744,.841,side*.110],.006,steel);
  }
  for(const x of [.412,.764])rod(cycle,[x,.949,-.129],[x,.949,.129],.009,steel);
  for(const x of [.441,.727])rod(cycle,[x,.73,-.091],[x,.73,.091],.007,steel);
  for(let n=-2;n<=2;n++){
    rod(cycle,[.727,.73,n*.034],[.764,.949,n*.048],.005,steel);
    rod(cycle,[.441,.73,n*.034],[.412,.949,n*.048],.005,steel);
  }
  rod(cycle,[.63,.335,.037],[.724,.715,.067],.009,steel);
  box(cycle,.608,.68,0,.086,.058,.07,'#d6c9a2');
  box(cycle,.655,.68,0,.014,.048,.054,'#ffe4ab',{emissive:'#ffe0af',intensity:.43});

  const umbrellas=part(group('umbrella-stand',2.80),1.63,.18,1.07,-.05);
  box(umbrellas,0,.083,0,.616,.077,.33,'#556b75',metal);
  for (const x of [-.265,.265]) for (const z of [-.12,.12]) rod(umbrellas,[x,.046,z],[x,.513,z],.016,steel);
  for (const z of [-.129,.129]) rod(umbrellas,[-.283,.507,z],[.283,.507,z],.015,chrome);
  for (const x of [-.276,-.096,.096,.276]) rod(umbrellas,[x,.507,-.129],[x,.507,.129],.012,chrome);
  box(umbrellas,0,.403,.137,.44,.097,.017,'#b9c5b6');
  label(umbrellas,'傘 立 て',0,.403,.151,.34,.071,{color:'#394c52'});
  for (const [i,c] of ['#c5ddd9','#db726f','#6f9daf'].entries()){
    const um=part(umbrellas,-.185+.183*i,.077,-.02+(i%2)*.059);
    um.rotation.z=[-.085,.06,-.027][i];
    cyl(um,0,.282,0,.053,.010,.486,c,{segments:7});
    rod(um,[0,0,0],[0,.068,0],.010,'#bcc5c1');
    for(let n=0;n<5;n++){
      const ang=n*Math.PI*2/5;
      rod(um,[.011*Math.cos(ang),.066,.011*Math.sin(ang)],[.054*Math.cos(ang),.523,.054*Math.sin(ang)],.0035,'#c1c2be');
    }
    cyl(um,0,.313,0,.035,.035,.02,'#857d7e',{segments:8});
    rod(um,[0,.507,0],[0,.759,0],.009,steel);
    curve(um,[[0,.739,0],[0,.791,0],[.028,.815,0],[.055,.792,0],[.056,.753,0]],.011,'#e4d9bf');
  }

  const bins=part(group('sorted-recycling-bins',2.88),2.48,.18,-2.89,Math.PI/2);
  ['#6c9cab','#a1b7a5','#c5bba0'].forEach((c,i)=>{
    const x=(i-1)*.405;
    box(bins,x,.328,0,.374,.607,.354,c);
    box(bins,x,.034,0,.375,.054,.356,'#4f6772');
    box(bins,x,.652,0,.399,.076,.374,'#cad0bd');
    box(bins,x,.698,-.037,.392,.053,.259,c);
    box(bins,x,.682,.113,.262,.011,.09,'#425259');
    box(bins,x,.450,.180,.27,.110,.011,'#dedaca');
    label(bins,['かん','びん','ペット'][i],x,.45,.189,.21,.074,{color:'#345058'});
    for(let n=0;n<3;n++)box(bins,x,.146+n*.032,.179,.267,.007,.007,'#89998f');
  });

  const wireTone='#353346', oldWood='#827568', oldMetal='#767f84';
  const poles=[[-6.53,1.91,5.98],[-6.39,-5.83,5.83],[2.84,-5.83,5.60]];
  const towers=group('utility-poles',2.02);
  poles.forEach(([x,z,h],idx)=>{
    const pole=part(towers,x,.18,z);
    cyl(pole,0,h*.5,0,.073,.111,h,oldWood,{segments:12});
    cyl(pole,0,.16,0,.138,.151,.32,'#6d7580',{segments:12});
    cyl(pole,0,.72,0,.112,.117,.78,'#55565a',{segments:12});
    for(let n=0;n<4;n++)cyl(pole,0,.415+n*.16,0,.119-n*.001,.12-n*.001,.068,'#c9a45f',{segments:12});
    function arm(height,w,rotation){
      const arm=part(pole,0,0,0,rotation);
      box(arm,0,height,.046,w,.073,.099,'#8b8174',metal);
      rod(arm,[-w*.38,height-.02,.05],[0,height-.333,.046],.019,oldMetal);
      rod(arm,[w*.38,height-.02,.05],[0,height-.333,.046],.019,oldMetal);
      for (const t of [-.41,0,.41]){
        const px=t*w;
        rod(arm,[px,height,.046],[px,height+.205,.046],.017,oldMetal);
        for(let i=0;i<3;i++)cyl(arm,px,height+.071+i*.044,.046,.051,.055,.026,'#b7c7c6',{segments:9});
      }
    }
    for(const [height,w] of [[h-.25,1.05],[h-.99,.69]]){
      if(idx!==2)arm(height,w,0);
      if(idx!==0)arm(height-.09,w,-Math.PI/2);
    }
    for(const height of [h*.37,h*.70,h-.805,h-.332])cyl(pole,0,height,0,.091,.094,.046,'#505463',{segments:12});
    if(idx===0){
      for(let n=0;n<6;n++)rod(pole,[(n%2?-.06:.06),2.29+n*.33,0],[(n%2?-.195:.195),2.29+n*.33,0],.014,oldMetal);
      const drum=part(pole,-.26,h-1.41,-.011);
      box(drum,.151,-.199,0,.306,.07,.131,'#636b72');
      cyl(drum,0,0,0,.168,.157,.516,'#819098',{segments:16});
      for(const y of [-.242,-.126,.121,.252])cyl(drum,0,y,0,.174,.174,.023,'#6d7f88',{segments:16});
      for (const v of [-.080,.080]) {
        cyl(drum,v,.294,.009,.040,.040,.09,'#b7b9ad',{segments:8});
        curve(drum,[[v,.334,.009],[v,.500,.052],[v+.083,.623,.046],[.245,.713,.047]],.009,wireTone);
      }
      box(pole,0,2.71,.096,.145,.271,.009,'#383f4c');
      label(pole,'17',0,2.729,.104,.132,.135,{color:'#e1d5a4'});
    }else if(idx===2){
      box(pole,-.117,1.22,0,.24,.44,.15,'#829199');
      box(pole,-.117,1.23,.085,.191,.365,.025,'#a3ada9');
      const marker=part(pole,.088,2.230,-.055,Math.PI/2);
      box(marker,.098,0,0,.479,.249,.037,'#afbab8');
      box(marker,.098,0,.021,.449,.220,.012,'#466582');
      label(marker,'裏通り',.098,.019,.032,.356,.107,{color:'#f2f0d5'});
      label(marker,'U R A D O R I',.098,-.070,.032,.290,.036,{color:'#d4dacd'});
    }
  });
  const cables=group('overhead-lines',3.96);
  function suspended(ai, bi, dx, dz, offset, sag, r) {
    const [ax,az,ah]=poles[ai], [bx,bz,bh]=poles[bi];
    const pts=[];
    for(let n=0;n<=18;n++){
      const f=n/18;
      pts.push(new THREE.Vector3(ax+(bx-ax)*f+dx,(ah+(bh-ah)*f)+.18+offset-4*sag*f*(1-f),az+(bz-az)*f+dz));
    }
    const cable=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),18,r,5,false),localMaterial(wireTone));
    cables.add(cable);
  }
  for(const [from,to] of [[0,1],[1,2]]){
    const rear=from===1;
    for(const [off,level,sag,thickness] of [[-.429,-.058,.265,.012],[0,-.058,.306,.012],[.429,-.058,.347,.012],[-.253,-.793,.398,.016],[.253,-.793,.353,.012]]){
      suspended(from,to,rear?-.046:off,rear?off:.046,level-(rear?.09:0),sag,thickness);
    }
  }

  const streetLamp=part(group('corner-streetlight',2.38),3.02,.18,1.43);
  cyl(streetLamp,0,.11,0,.13,.17,.22,'#4f6473',{segments:12});
  cyl(streetLamp,0,.41,0,.087,.123,.55,'#607884',{segments:12});
  cyl(streetLamp,0,1.90,0,.057,.080,2.9,'#84979b',{segments:12});
  curve(streetLamp,[[0,3.24,0],[.008,3.545,0],[.088,3.705,0],[.276,3.802,0],[.72,3.84,0],[.867,3.825,0]],.043,'#899ca1');
  const lampHead=part(streetLamp,.865,3.771,0);
  box(lampHead,0,.049,0,.50,.085,.24,'#566c79',metal);
  box(lampHead,0,.005,0,.468,.036,.228,'#92a8a5',metal);
  box(lampHead,0,-.023,0,.390,.035,.188,'#fff3cf',{emissive:'#ffe9af',intensity:3.4});
  for(const t of [-.12,0,.12])box(lampHead,t,-.045,0,.006,.006,.182,'#abaf9f');
  const cornerLight = new THREE.PointLight(0xffcb90,13,7,2);
  cornerLight.position.set(.865,3.66,.01); streetLamp.add(cornerLight);
  glow(streetLamp,.865,3.719,.01,'#ffd39e',.70,.13);
  // Enameled street nameplate mounted on the existing lamp mast.
  box(streetLamp,-.278,2.89,.043,.65,.204,.032,'#bbc7c6');
  box(streetLamp,-.278,2.89,.066,.615,.166,.018,'#436b88');
  label(streetLamp,'雨音町 三丁目',-.278,2.89,.080,.546,.117,{color:'#f7efdd'});
  box(streetLamp,-.055,2.89,-.06,.19,.060,.10,'#737f83');

  const mirror=part(group('convex-traffic-mirror',3.20),-6.06,.18,2.23,.16);
  cyl(mirror,0,1.171,0,.028,.035,2.342,'#db8050',{segments:10});
  cyl(mirror,0,.12,0,.062,.079,.24,'#758496',{segments:10});
  rod(mirror,[0,2.187,0],[.217,2.283,0],.026,'#a3694c');
  const disk=part(mirror,.219,2.353,.012,.38);
  disk.rotation.x=-.11;
  const lens=cyl(disk,0,0,0,.24,.23,.053,'#d77645',{segments:36});lens.rotation.x=Math.PI/2;
  const glass=cyl(disk,0,0,.036,.213,.213,.015,'#a7bcc0',{segments:36});glass.rotation.x=Math.PI/2;
  // A painted curved reflection reads as a convex street mirror even at this scale.
  const mirrorGeom=new THREE.CircleGeometry(.208,40);
  const texCanvas=document.createElement('canvas');texCanvas.width=192;texCanvas.height=192;
  const mctx=texCanvas.getContext('2d');
  const sky=mctx.createLinearGradient(0,0,0,192);sky.addColorStop(0,'#314658');sky.addColorStop(.54,'#79939f');sky.addColorStop(.57,'#afa3a0');sky.addColorStop(1,'#4b637a');
  mctx.fillStyle=sky;mctx.fillRect(0,0,192,192);mctx.fillStyle='#e4bf96';mctx.beginPath();mctx.moveTo(0,72);mctx.quadraticCurveTo(61,73,101,89);mctx.lineTo(101,111);mctx.quadraticCurveTo(55,102,0,116);mctx.fill();
  mctx.strokeStyle='#596878';mctx.lineWidth=3;for(let n=0;n<5;n++){mctx.beginPath();mctx.moveTo(10+20*n,76+n*2);mctx.lineTo(10+20*n,109-n);mctx.stroke()}
  mctx.strokeStyle='#e7d7b8';mctx.lineWidth=3;mctx.beginPath();mctx.moveTo(4,156);mctx.quadraticCurveTo(42,138,115,109);mctx.stroke();
  const mTex=new THREE.CanvasTexture(texCanvas);mTex.colorSpace=THREE.SRGBColorSpace;
  const mirrorFace=new THREE.Mesh(mirrorGeom,new THREE.MeshStandardMaterial({map:mTex,roughness:.27,emissive:0x607070,emissiveMap:mTex,emissiveIntensity:.35}));mirrorFace.position.z=.049;disk.add(mirrorFace);
  torus(disk,0,0,.049,.226,.018,'#ee9d5e');
  torus(disk,0,0,.071,.232,.021,'#ee9c58',Math.PI*.94,.09);
  box(mirror,.005,1.57,.052,.102,.319,.016,'#e5d9bc');
  label(mirror,'注意',.005,1.57,.064,.093,.083,{color:'#a84934'});

  const rails=group('street-guardrails',1.64);
  function curbRail(x,z,length,rot){
    const rail=part(rails,x,.18,z,rot);
    const span=length/2;
    curve(rail,[[-span,.029,0],[-span,.397,0],[-span+.015,.472,0],[-span+.073,.502,0],[span-.073,.502,0],[span-.015,.472,0],[span,.397,0],[span,.029,0]],.027,'#d4c8a3',28);
    rod(rail,[-span,.257,0],[span,.257,0],.020,'#b4b5a4');
    for(const s of [-1,1]){
      cyl(rail,s*span,.031,0,.069,.078,.062,'#798b92',{segments:10});
      cyl(rail,s*span,.379,0,.030,.031,.052,'#eeaa65',{segments:10});
    }
  }
  curbRail(-4.07,2.377,1.33,0);
  curbRail(3.206,-1.695,1.505,Math.PI/2);
  curbRail(3.206,-3.592,1.505,Math.PI/2);

  const green=group('alley-plants-and-crates',2.46);
  let seed=21413;
  const rand=()=>{ seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
  function herbPot(x,z,size,potColor,flowers=false){
    const p=part(green,x,.18,z);
    cyl(p,0,.173*size,0,.234*size,.158*size,.346*size,potColor,{segments:11});
    cyl(p,0,.338*size,0,.244*size,.240*size,.069*size,potColor,{segments:11});
    cyl(p,0,.375*size,0,.211*size,.211*size,.012*size,'#515246',{segments:11});
    const leafG=new THREE.IcosahedronGeometry(1,0);
    const palette=['#4d8178','#679280','#779c81','#588e7a','#819c7c','#668c78'];
    for(let i=0;i<23;i++){
      const angle=2.39996*i,rad=Math.sqrt(rand())*.23*size;
      const xx=rad*Math.cos(angle),zz=rad*Math.sin(angle);
      const yy=(.51+.16*(1-rad/(.25*size))+.15*rand())*size;
      rod(p,[0,.365*size,0],[xx,yy,zz],.009*size,'#627657');
      const leaf=new THREE.Mesh(leafG,localMaterial(palette[i%palette.length]));
      leaf.position.set(xx,yy,zz);leaf.scale.set(.060*size,.113*size,.068*size);leaf.rotation.set(.61*rand(),angle,.77*(rand()-.5));p.add(leaf);
      if(flowers&&i%4===0){const fl=new THREE.Mesh(leafG,localMaterial(i%3?'#d59a94':'#ead3a2'));fl.position.set(xx,yy+.088*size,zz);fl.scale.setScalar(.036*size);p.add(fl);}
    }
  }
  herbPot(-4.59,1.052,.86,'#ac715e',true);
  herbPot(2.68,-4.26,1.04,'#a97961');
  herbPot(2.59,-4.79,.68,'#92a8a1');
  herbPot(-6.30,-1.31,.75,'#9ba6a2');
  const crates=part(green,-5.43,.18,-2.15,.05);
  function crate(x,y,z,c){
    box(crates,x,y+.02,z,.556,.04,.389,c);
    for(const s of [-1,1]){
      box(crates,x,y+.224,z+s*.188,.562,.041,.025,c);
      box(crates,x,y+.101,z+s*.188,.55,.057,.025,c);
      for(let n=-2;n<=2;n++)box(crates,x+n*.125,y+.119,z+s*.188,.033,.237,.025,c);
      box(crates,x+s*.271,y+.222,z,.025,.044,.369,c);
      box(crates,x+s*.271,y+.096,z,.025,.053,.369,c);
    }
  }
  crate(0,0,0,'#a5804d');crate(.013,.255,-.007,'#b98f4d');crate(.028,0,.429,'#788a75');
}
