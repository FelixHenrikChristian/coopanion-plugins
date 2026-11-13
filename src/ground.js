// The texture maps use scene metres for both axes, with the front of the shop at +z.
// This keeps painted surfaces, drains and the model geometry in the same coordinates.
export function buildGround(k) {
  const { THREE } = k;
  const base = k.group('鋳型・基台', 0);
  const street = k.group('雨の路面', .18);
  const paving = k.group('歩道と縁石', .34);
  const hardware = k.group('路面標示と排水', .58);
  const size = 2048;
  const x0 = -10.8, z0 = -8.8, side = 18.8;
  const x1 = x0 + side, z1 = z0 + side;
  const ppm = size / side;
  let seed = 307096;
  const rnd = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const between = (a, b) => a + rnd() * (b - a);
  const choose = a => a[Math.floor(rnd() * a.length)];
  const standard = (color, roughness = .66, metalness = .12) =>
    new THREE.MeshStandardMaterial({color, roughness, metalness});

  function corners(x0, z0, x1, z1, radii) {
    const [ne, se, sw, nw] = radii;
    const arc = (x, z, r, begin) => Array.from({length: 9}, (_, i) => {
      const a = begin + i * Math.PI / 16;
      return [x + r * Math.cos(a), z + r * Math.sin(a)];
    });
    return [
      ...arc(x1 - ne, z0 + ne, ne, -Math.PI / 2),
      ...arc(x1 - se, z1 - se, se, 0),
      ...arc(x0 + sw, z1 - sw, sw, Math.PI / 2),
      ...arc(x0 + nw, z0 + nw, nw, Math.PI)
    ];
  }
  function plate(parent, points, height, material) {
    const center = points.reduce((c, p) => [c[0] + p[0] / points.length, c[1] + p[1] / points.length], [0, 0]);
    const positions = [], uvs = [];
    for (let i = 0; i < points.length; i++) {
      for (const [x, z] of [center, points[(i + 1) % points.length], points[i]]) {
        positions.push(x, height, z);
        uvs.push((x - x0) / side, (z1 - z) / side);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function band(parent, pointsA, yA, pointsB, yB, mat) {
    const pos = [];
    for (let i = 0; i < pointsA.length; i++) {
      const j = (i + 1) % pointsA.length;
      const a = [...pointsA[i]], b = [...pointsB[i]], c = [...pointsB[j]], d = [...pointsA[j]];
      const va = [a[0], yA, a[1]], vb = [b[0], yB, b[1]], vc = [c[0], yB, c[1]], vd = [d[0], yA, d[1]];
      pos.push(...va, ...vb, ...vc, ...va, ...vc, ...vd);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function desk(oldHalfWidth, radius) {
    const inset = 7 - oldHalfWidth;
    return corners(x0 + inset, z0 + inset, x1 - inset, z1 - inset, Array(4).fill(radius));
  }
  // The continuous chamfers catch the rim light when the model is turned.
  const sections = [
    [6.79, .20, -.96, '#171c30'],
    [6.90, .20, -.89, '#354059'],
    [6.91, .19, -.82, '#525069'],
    [6.945, .17, -.795, '#796d74'],
    [6.945, .17, -.765, '#282b41'],
    [6.91, .17, -.735, '#29283c'],
    [6.95, .16, -.69, '#303044'],
    [6.995, .135, -.62, '#404055'],
    [6.995, .135, -.135, '#343749'],
    [7, .13, -.12, '#171f31'],
    [7, .13, -.080, '#484b5c'],
    [7, .13, -.042, '#5b5969'],
    [6.975, .12, -.002, '#6a6975']
  ];
  sections.forEach(([r, radius, y, c], i) => {
    if (!i) return;
    const [r0, rad0, y0] = sections[i - 1];
    band(base, desk(r0, rad0), y0, desk(r, radius), y, standard(c, .44, .22));
  });
  const bottom = plate(base, desk(6.79, .20), -.96, standard('#191c29'));
  bottom.material.side = THREE.DoubleSide;
  const roadOutline = desk(6.975, .12);
  const walkX = x0 + .047, walkZ = z0 + .050;
  const walkOutline = corners(walkX,walkZ,3.35,2.55,[.055,.90,.055,.07]);

  function canvas() {
    const e = document.createElement('canvas');
    e.width = e.height = size;
    const g = e.getContext('2d');
    g.setTransform(ppm, 0, 0, ppm, -x0 * ppm, -z0 * ppm);
    return [e, g];
  }
  function mapped(image, transparent = false, emissive = .12) {
    const map = new THREE.CanvasTexture(image);
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = 8;
    return new THREE.MeshStandardMaterial({
      map, color: 0xffffff, roughness: .57, metalness: .07,
      emissive: 0xffffff, emissiveMap: map, emissiveIntensity: emissive,
      transparent, depthWrite: !transparent,
      ...(transparent ? {alphaTest: .1} : {})
    });
  }
  function rect(g, x, z, w, h, color) {
    g.fillStyle = color; g.fillRect(x, z, w, h);
  }
  function stroke(g, coords, color, width, closed = false) {
    g.beginPath(); g.moveTo(...coords[0]);
    coords.slice(1).forEach(p => g.lineTo(...p));
    if (closed) g.closePath();
    g.strokeStyle = color; g.lineWidth = width; g.stroke();
  }
  function oval(g, x, z, rx, rz, fill) {
    g.beginPath(); g.ellipse(x, z, rx, rz, 0, 0, Math.PI * 2);
    g.fillStyle = fill; g.fill();
  }
  function dapples(g, count, palette, extent = .022) {
    for (let i = 0; i < count; i++) {
      const x = between(x0, x1), z = between(z0, z1), s = between(.006, extent);
      rect(g, x, z, s * between(.8, 2.3), s, choose(palette));
    }
  }
  // Staggered water films and little wavelets interrupt the elongated coloured light.
  function reflectedLight(g, x, z, width, length, rgb, strength, lean = 0) {
    const [r, gg, b] = rgb;
    const rgba = a => 'rgba(' + [r, gg, b, a].join(',') + ')';
    g.save();
    g.translate(x, z);
    g.transform(1, 0, lean, 1, 0, 0);
    g.scale(width, length);
    const grad = g.createRadialGradient(0, .45, 0, 0, .45, .77);
    grad.addColorStop(0, rgba(strength * .36));
    grad.addColorStop(.52, rgba(strength * .2));
    grad.addColorStop(1, rgba(0));
    g.fillStyle = grad; g.fillRect(-1, -.35, 2, 1.65);
    g.restore();
    for (let i = 0; i < Math.floor(4 + width * length * 1.25); i++) {
      const t = rnd(), offset = ((rnd()+rnd()+rnd()) / 3 - .5) * width * (1.45 + t);
      const t0 = 1 - t * .74;
      const cx = x + offset + lean * length * t, cz = z + t * length;
      const w = between(.055, .31) * (1 + t * .6);
      const h = between(.007, .020) * (1 - t * .22);
      g.beginPath();
      g.moveTo(cx - w / 2, cz);
      g.lineTo(cx - w * .32, cz - h * .53);
      g.lineTo(cx + w * .5, cz - h * .48);
      g.lineTo(cx + w * .35, cz + h * .46);
      g.lineTo(cx - w * .44, cz + h * .45);
      g.closePath();
      g.fillStyle = rgba(strength * t0 * between(.08, .24)); g.fill();
    }
  }

  const [roadImg, road] = canvas();
  const shade = road.createLinearGradient(x0,-5.0,5.9,z1);
  shade.addColorStop(0,'#222c40'); shade.addColorStop(.52,'#2d374b'); shade.addColorStop(1,'#273247');
  rect(road,x0,z0,side,side,shade);
  for (let i = 0; i < 168; i++) {
    const x = between(x0,x1), z = between(z0,z1), a = between(.22,1.13), b = between(.055,.24);
    road.beginPath();
    for (let j = 0; j < 13; j++) {
      const t = j / 12 * Math.PI * 2;
      const u = x + Math.cos(t) * a * between(.70, 1.1);
      const v = z + Math.sin(t) * b * between(.7, 1.1) - Math.cos(t) * a * .15;
      if (!j) road.moveTo(u,v); else road.lineTo(u,v);
    }
    road.closePath();
    road.fillStyle = choose(['#61758a0c','#73879b0d','#13233713','#141f3014']); road.fill();
  }
  dapples(road,47000,['#a0acba12','#101a281b','#768aa013','#24324616'],.017);
  reflectedLight(road,-8.28,2.40,2.75,5.60,[244,168,100],.55,-.06);
  reflectedLight(road,-4.35,2.51,1.55,3.95,[240,136,131],.52,-.07);
  reflectedLight(road,-1.0,2.51,4.05,4.0,[241,194,140],.45,-.05);
  reflectedLight(road,1.36,2.51,2.04,3.17,[140,200,201],.31,-.04);
  reflectedLight(road,3.56,1.90,1.85,4.59,[250,192,132],.54,-.055);
  reflectedLight(road,3.65,-2.7,1.05,3.48,[112,178,197],.31,.14);
  for (let i = 0; i < 38; i++) {
    const x = between(x0,x1), z = between(z0,z1), r = between(.085,.18);
    road.strokeStyle = choose(['#93b3c34d','#a5c1d048','#879fbd42']);
    road.lineWidth = between(.006,.013);
    road.beginPath(); road.ellipse(x,z,r,r*.82,0,.32,between(3.8,5.9)); road.stroke();
    if (i % 3 === 0) {
      road.beginPath(); road.ellipse(x,z,r*.63,r*.55,0,3.2,6.05); road.stroke();
    }
  }
  plate(street, roadOutline, 0, mapped(roadImg));

  const [walkImg, walk] = canvas();
  rect(walk,x0,z0,side,side,'#4a5562');
  const tilePalette = ['#717b83','#747e88','#6d7983','#737e87','#778089','#6f7a84'];
  const tileW = .79, tileH = .47;
  for (let j = 0; j < Math.ceil(side/tileH); j++) for (let i = -1; i < Math.ceil(side/tileW); i++) {
    const x = x0 + i * tileW + (j % 2) * tileW * .5, z = z0 + j * tileH;
    rect(walk,x+.012,z+.010,tileW-.024,tileH-.020,choose(tilePalette));
    rect(walk,x+.012,z+.010,tileW-.024,.009,'#bac3c44c');
  }
  dapples(walk,28000,['#dbe0db14','#152b3c1a','#3845541a','#d6d7ca10']);
  // The deep alley gets cooler as it passes behind the shop.
  const alley = walk.createLinearGradient(0,-6.7,0,.7);
  alley.addColorStop(0,'#18273788'); alley.addColorStop(.74,'#26364348'); alley.addColorStop(1,'#223e5106');
  rect(walk,x0,z0,side,.7-z0,alley);
  reflectedLight(walk,-8.30,.76,2.58,1.7,[251,174,106],.75,-.05);
  reflectedLight(walk,-4.35,1.07,1.18,1.41,[242,130,128],.55,-.06);
  reflectedLight(walk,-1.55,.52,5.46,1.98,[253,195,133],.68,-.05);
  reflectedLight(walk,1.17,.53,1.33,1.89,[151,220,211],.43,-.06);

  // A gravel service yard, a moss bed and a narrow stone walk connect both back doors.
  rect(walk,walkX,walkZ,13.75,3.97,'#4d514d');
  rect(walk,walkX,walkZ,13.75,2.10,'#37433b');
  rect(walk,walkX,-6.75,4.25,2.49,'#3b453b');
  rect(walk,-6.50,-6.78,1.47,6.38,'#495151');
  rect(walk,walkX+.16,walkZ+.16,13.38,.075,'#62665b');
  rect(walk,walkX+.16,walkZ+.17,.08,4.22,'#64665a');
  for (let i=0;i<11200;i++) {
    const x=between(walkX+.17,2.99),z=between(walkZ+.18,-4.81);
    const planted=z < -6.65 || (x < -6.51 && z < -4.30);
    const tint=planted ? choose(['#9eaa7934','#1f292444','#81906d30']) : choose(['#a4a69b52','#222e3552','#8c938760']);
    const s=between(.011,.036);
    rect(walk,x,z,s*1.28,s,tint);
  }
  function steppingStone(x,z,w,h,angle) {
    walk.save();walk.translate(x,z);walk.rotate(angle);
    const outline=[[-w*.49,-h*.28],[-w*.36,-h*.50],[w*.35,-h*.48],[w*.51,-h*.28],[w*.48,h*.31],[w*.33,h*.5],[-w*.37,h*.48],[-w*.5,h*.23]];
    walk.beginPath();walk.moveTo(...outline[0]);outline.slice(1).forEach(p=>walk.lineTo(...p));walk.closePath();
    walk.fillStyle=choose(['#6c746e','#6e756f','#68716b','#767b73']);walk.fill();
    stroke(walk,outline,'#313d3b',.018,true);
    stroke(walk,outline.slice(0,4),'#969c8d',.012);
    walk.restore();
  }
  for(let z=-.75;z>-8.02;z-=.62) steppingStone(-5.76+between(-.09,.09),z,between(.77,.95),between(.45,.53),between(-.09,.09));
  for(let x=walkX+.55;x<2.77;x+=.70) {
    if(Math.abs(x+5.76)>.54) steppingStone(x,-6.15+between(-.065,.065),between(.55,.64),between(.58,.68),between(-.06,.06));
  }
  // Granite curb units follow the radius instead of ending in a square junction.
  const cornerCenter = [2.45,1.65], radius = .795;
  walk.beginPath(); walk.moveTo(walkX,2.444); walk.lineTo(2.45,2.444);
  walk.arc(cornerCenter[0], cornerCenter[1], radius, Math.PI / 2, 0, true); walk.lineTo(3.245,walkZ);
  walk.lineWidth=.187; walk.strokeStyle='#a4a9a7'; walk.stroke();
  walk.beginPath(); walk.moveTo(walkX,2.522); walk.lineTo(2.45,2.522);
  walk.arc(2.45,1.65,.871,Math.PI/2,0,true); walk.lineTo(3.321,walkZ);
  walk.lineWidth=.016; walk.strokeStyle='#d3cdc1'; walk.stroke();
  for (let x = walkX+.20; x < 2.46; x+=.77) {
    stroke(walk,[[x,2.339],[x+.008,2.53]],'#4e5865',.022);
  }
  for (let z=walkZ+.17; z<1.65; z+=.77) stroke(walk,[[3.144,z],[3.346,z-.012]],'#505a65',.022);
  for (let i=0;i<4;i++) {
    const a=i*Math.PI/6;
    stroke(walk,[[2.45+.69*Math.cos(a),1.65+.69*Math.sin(a)],[2.45+.9*Math.cos(a),1.65+.9*Math.sin(a)]],'#515a67',.022);
  }
  // Low yellow tactile tiles lead from the shop frontage to the crossing.
  function tactile(x,z) {
    rect(walk,x,z,.279,.28,'#595448');
    rect(walk,x+.007,z+.007,.265,.262,choose(['#c59b57','#c69e60','#c0a067']));
    for (let a=0;a<4;a++) for (let b=0;b<4;b++) {
      const xx=x+.044+a*.061, zz=z+.038+b*.061;
      oval(walk,xx,zz,.015,.015,'#806e51');
      oval(walk,xx-.003,zz-.004,.012,.010,'#e0bd78');
    }
  }
  for(let x=-2.94;x<.49;x+=.291) tactile(x,2.025);
  for(let z=-.72;z<1.17;z+=.291) tactile(2.777,z);

  // Cut the shelf at the ramp transitions so its large top face actually slopes.
  const xs=[walkX,-3.40,-3,.60,.99,2.97,3.35];
  const zs=[walkZ,-.97,-.72,1.20,1.54,1.98,2.55];
  const unit=n=>Math.max(0,Math.min(1,n));
  function sidewalkHeight(x,z) {
    const front=unit((z-1.98)/.57)*Math.min(unit((x+3.40)/.4),unit((.99-x)/.39));
    const right=unit((x-2.97)/.38)*Math.min(unit((z+.97)/.25),unit((1.54-z)/.34));
    return .18-.143*Math.max(front,right);
  }
  function clip(poly,axis,limit,sign) {
    const out=[];
    for(let i=0;i<poly.length;i++){
      const a=poly[i],b=poly[(i+1)%poly.length];
      const da=sign*(a[axis]-limit),db=sign*(b[axis]-limit);
      if(da>=0) out.push(a);
      if(da*db<0){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
    }
    return out;
  }
  const topVertices=[],topUVs=[],edgeVertices=[];
  for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
    let cell=clip(walkOutline,0,xs[i],1);
    cell=clip(cell,0,xs[i+1],-1);cell=clip(cell,1,zs[j],1);cell=clip(cell,1,zs[j+1],-1);
    for(let t=1;t<cell.length-1;t++)for(const [x,z] of [cell[0],cell[t+1],cell[t]]){
      topVertices.push(x,sidewalkHeight(x,z),z);topUVs.push((x-x0)/side,(z1-z)/side);
    }
  }
  for(let i=0;i<walkOutline.length;i++){
    const [ax,az]=walkOutline[i],[bx,bz]=walkOutline[(i+1)%walkOutline.length],dx=bx-ax,dz=bz-az;
    const breaks=[0,1];
    if(dx)xs.forEach(x=>{const t=(x-ax)/dx;if(t>0&&t<1)breaks.push(t)});
    if(dz)zs.forEach(z=>{const t=(z-az)/dz;if(t>0&&t<1)breaks.push(t)});
    breaks.sort((a,b)=>a-b);
    for(let j=1;j<breaks.length;j++) {
      if(breaks[j]-breaks[j-1]<.00001) continue;
      const x=ax+dx*breaks[j-1],z=az+dz*breaks[j-1],u=ax+dx*breaks[j],v=az+dz*breaks[j];
      const p=[x,.006,z],q=[x,sidewalkHeight(x,z),z],r=[u,sidewalkHeight(u,v),v],s=[u,.006,v];
      edgeVertices.push(...p,...q,...r,...p,...r,...s);
    }
  }
  function surface(parent,vertices,uvs,material) {
    const geo=new THREE.BufferGeometry();
    geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    if(uvs)geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
    geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,material);
    mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  }
  surface(paving,edgeVertices,null,standard('#818789',.70));
  surface(paving,topVertices,topUVs,mapped(walkImg));

  // A recessed charcoal rubber mat aligns with the sliding-door threshold.
  const matOutline = corners(-.27,.635,1.32,1.30,[.042,.042,.042,.042]);
  const matCenter = corners(-.219,.681,1.269,1.253,[.023,.023,.023,.023]);
  band(hardware,matOutline,.181,matOutline,.205,standard('#303940',.82));
  plate(hardware,matOutline,.205,standard('#36434b',.86));
  plate(hardware,matCenter,.207,standard('#515953',.90));
  const ribs=[];
  for(let z=.69;z<1.24;z+=.038) {
    ribs.push(-.204,.211,z, -.204,.211,z+.015, 1.251,.211,z+.015,
      -.204,.211,z, 1.251,.211,z+.015, 1.251,.211,z);
  }
  const ribsGeometry=new THREE.BufferGeometry();
  ribsGeometry.setAttribute('position',new THREE.Float32BufferAttribute(ribs,3));
  ribsGeometry.computeVertexNormals();
  hardware.add(new THREE.Mesh(ribsGeometry,standard('#303d40',.90)));

  const [inkImg, ink] = canvas();
  // Eight equal 45 cm stripes make one 3.60 m pedestrian crossing.
  // The short side street has a separate crossing and its own stop line.
  const chalk=ink.createLinearGradient(0,2.6,0,z1);
  chalk.addColorStop(0,'#d1d5ce');chalk.addColorStop(.46,'#ced4d1');chalk.addColorStop(1,'#b9c3c8');
  for(let i=0;i<8;i++){
    const z=2.88+i*.90;
    rect(ink,-3,z,3.60,.45,chalk);
    rect(ink,-3,z,3.60,.015,'#e4e4d7');
  }
  for(let i=0;i<5;i++){
    const x=3.56+i*.91;
    rect(ink,x,-.48,.45,2.55,'#c3cbc9');
    rect(ink,x,-.48,.013,2.55,'#d7dbd4');
  }
  // The eastern margin accommodates a kei car, leaving ~2.60 m for the one-way lane.
  stroke(ink,[[6.03,-7.83],[7.65,-7.83],[7.65,-4.01],[6.03,-4.01]],'#aebac0',.073);
  stroke(ink,[[6.03,-7.865],[6.03,-7.42]],'#aebac0',.073);
  stroke(ink,[[6.03,-3.975],[6.03,-4.42]],'#aebac0',.073);
  ink.save();ink.translate(6.90,-5.96);ink.rotate(Math.PI/2);ink.scale(.008,.008);
  ink.textAlign='center';ink.textBaseline='middle';ink.font='bold 81px "Yu Gothic", "Noto Sans JP", sans-serif';
  ink.fillStyle='#c1c7bf';ink.fillText('軽',0,0);ink.restore();
  const edge='#aebbc2',lane='#c6ced0',stop='#d4d8d2';
  stroke(ink,[[x0+.04,2.83],[-3.34,2.83]],edge,.083);
  stroke(ink,[[.91,2.83],[1.99,2.83]],edge,.083);
  stroke(ink,[[x0+.04,9.73],[-3.34,9.73]],edge,.083);
  stroke(ink,[[.94,9.73],[x1-.045,9.73]],edge,.083);
  stroke(ink,[[3.59,z0+.05],[3.59,-1.04]],edge,.083);
  stroke(ink,[[7.75,-3.65],[7.75,-1.01]],edge,.083);
  for(const [start,end] of [[x0+.035,-9.35],[-7.9,-5.92],[1.17,2.48]]) {
    stroke(ink,[[start,6.28],[end,6.28]],lane,.115);
  }
  stroke(ink,[[-4.17,2.99],[-4.17,6.06]],stop,.20);
  stroke(ink,[[3.75,-1.22],[7.58,-1.22]],stop,.19);
  ink.save(); ink.globalCompositeOperation='destination-out';
  for(let i=0;i<1900;i++) {
    rect(ink,between(x0,x1),between(z0,z1),between(.009,.034),between(.007,.020),choose(['#0003','#0004','#0005']));
  }
  ink.restore();
  const markings = plate(hardware,roadOutline,.021,mapped(inkImg,true,.19));
  // A thin film of water carries the storefront reflection over the paint.
  markings.material.opacity=.86;
  markings.renderOrder=3;
  markings.receiveShadow = true;

  const [steelImg,steel] = canvas();
  function drain(x,z,angle=0) {
    steel.save(); steel.translate(x,z);steel.rotate(angle);
    rect(steel,-.37,-.135,.74,.27,'#293442');
    rect(steel,-.346,-.12,.692,.24,'#a0a5a2');
    rect(steel,-.332,-.107,.664,.214,'#535f67');
    for(let i=0;i<13;i++) {
      rect(steel,-.308+i*.048,-.083,.025,.166,'#1b2835');
      rect(steel,-.28+i*.048,-.082,.008,.159,'#9ca6a6');
    }
    for(const xx of [-.324,.324]) for(const zz of [-.099,.099]) oval(steel,xx,zz,.008,.008,'#202b35');
    steel.restore();
  }
  drain(-9.78,2.69);drain(-6.02,2.69);drain(1.65,2.69);drain(3.49,-2.04,Math.PI/2);drain(3.49,-6.57,Math.PI/2);
  function cover(x,z,r) {
    steel.save(); steel.translate(x,z); steel.scale(r,r);
    oval(steel,0,0,1.055,1.055,'#242c38'); oval(steel,0,0,1,1,'#899598');
    oval(steel,0,0,.963,.963,'#46535f'); oval(steel,0,0,.91,.91,'#839299');
    oval(steel,0,0,.885,.885,'#56616c');
    for(let i=0;i<24;i++) {
      const a=i*Math.PI/12;
      const c=Math.cos(a), s=Math.sin(a);
      stroke(steel,[[c*.79,s*.79],[c*.86,s*.86]],'#b1b9b7',.022);
    }
    for(let i=0;i<8;i++) {
      const a=i*Math.PI/4;
      steel.save(); steel.rotate(a); steel.beginPath();
      steel.moveTo(0,-.15); steel.bezierCurveTo(-.3,-.36,-.14,-.67,0,-.76);
      steel.bezierCurveTo(.16,-.58,.25,-.35,0,-.15);
      steel.strokeStyle='#98a4a5'; steel.lineWidth=.028; steel.stroke(); steel.restore();
    }
    oval(steel,0,0,.205,.205,'#a0a9a9'); oval(steel,0,0,.170,.170,'#4d5964');
    for(const xx of [-.61,.61]) {oval(steel,xx,.22,.050,.041,'#1e2d3b');}
    steel.restore();
  }
  cover(1.77,4.52,.37);cover(4.97,-3.07,.285);
  plate(hardware,roadOutline,.026,mapped(steelImg,true,.18)).renderOrder=4;
}
