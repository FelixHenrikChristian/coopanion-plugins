// The texture maps use scene metres for both axes, with the front of the shop at +z.
// This keeps painted surfaces, drains and the model geometry in the same coordinates.
export function buildGround(k) {
  const { THREE } = k;
  const base = k.group('鋳型・基台', 0);
  const street = k.group('雨の路面', .18);
  const paving = k.group('歩道と縁石', .34);
  const hardware = k.group('路面標示と排水', .58);
  const size = 1536;
  const ppm = size / 14;
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
        uvs.push(.5 + x / 14, .5 - z / 14);
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
  function desk(out, radius) { return corners(-out, -out, out, out, Array(4).fill(radius)); }
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
  const walkOutline = corners(-6.953, -6.95, 3.35, 2.55, [.055, .90, .055, .07]);
  const walkTop = corners(-6.936, -6.932, 3.335, 2.533, [.05, .89, .05, .062]);

  function canvas() {
    const e = document.createElement('canvas');
    e.width = e.height = size;
    const g = e.getContext('2d');
    g.setTransform(ppm, 0, 0, ppm, size / 2, size / 2);
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
      const x = between(-7, 7), z = between(-7, 7), s = between(.006, extent);
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
    for (let i = 0; i < Math.floor(34 + width * length * 16); i++) {
      const t = rnd(), offset = ((rnd()+rnd()+rnd()) / 3 - .5) * width * (1.45 + t);
      const t0 = 1 - t * .74;
      const cx = x + offset + lean * length * t, cz = z + t * length;
      const w = between(.045, .42) * (1 + t * .7);
      const h = between(.010, .072) * (1 - t * .22);
      g.beginPath();
      g.moveTo(cx - w / 2, cz);
      g.lineTo(cx - w * .32, cz - h * .53);
      g.lineTo(cx + w * .5, cz - h * .48);
      g.lineTo(cx + w * .35, cz + h * .46);
      g.lineTo(cx - w * .44, cz + h * .45);
      g.closePath();
      g.fillStyle = rgba(strength * t0 * between(.15, .80)); g.fill();
    }
  }

  const [roadImg, road] = canvas();
  const shade = road.createLinearGradient(-6.8, -4.0, 4.9, 7);
  shade.addColorStop(0, '#303d56'); shade.addColorStop(.56, '#39455d'); shade.addColorStop(1, '#343f55');
  rect(road, -7, -7, 14, 14, shade);
  for (let i = 0; i < 460; i++) {
    const x = between(-7, 7), z = between(-7, 7), a = between(.08, .84), b = between(.033, .23);
    road.beginPath();
    for (let j = 0; j < 13; j++) {
      const t = j / 12 * Math.PI * 2;
      const u = x + Math.cos(t) * a * between(.70, 1.1);
      const v = z + Math.sin(t) * b * between(.7, 1.1) - Math.cos(t) * a * .15;
      if (!j) road.moveTo(u,v); else road.lineTo(u,v);
    }
    road.closePath();
    road.fillStyle = choose(['#586d861e', '#61769125', '#182c422c', '#1f2c4624', '#8aa0b512']); road.fill();
  }
  dapples(road, 72000, ['#b0b9c21a','#101b3030','#7e94af22','#20314538','#b6bdc818']);
  for (let i = 0; i < 48; i++) {
    const x = between(-7,7), z = between(-7,7);
    const dx = between(-.57,.51), dz = between(-.45,.43);
    stroke(road, [[x,z],[x+dx*.31,z+dz*.2-.02],[x+dx*.4-.04,z+dz*.49],[x+dx,z+dz]], '#1b243770', between(.009,.018));
  }
  reflectedLight(road, -1.13, 2.46, 3.37, 3.24, [239,165,115], .56, -.075);
  reflectedLight(road, -.88, 2.48, 1.4, 2.25, [255,224,154], .45, -.09);
  reflectedLight(road, -5.55, 2.46, 1.17, 3.22, [236,96,105], .64, -.075);
  reflectedLight(road, -4.20, 2.53, 1.28, 1.73, [143,224,216], .44, -.06);
  reflectedLight(road, 2.11, 2.43, 1.86, 2.4, [134,196,209], .40, -.09);
  reflectedLight(road, 3.79, 1.62, 1.26, 3.62, [251,190,126], .60, -.065);
  reflectedLight(road, 3.63, -3.0, .95, 3.18, [102,184,207], .39, .15);
  for (let i = 0; i < 65; i++) {
    const x = between(-7,7), z = between(-7,7), r = between(.06, .22);
    road.strokeStyle = choose(['#93b3c34d','#a5c1d048','#879fbd42']);
    road.lineWidth = between(.006,.013);
    road.beginPath(); road.ellipse(x,z,r,r*.82,0,.32,between(3.8,5.9)); road.stroke();
    if (i % 3 === 0) {
      road.beginPath(); road.ellipse(x,z,r*.63,r*.55,0,3.2,6.05); road.stroke();
    }
  }
  plate(street, roadOutline, 0, mapped(roadImg));

  const [walkImg, walk] = canvas();
  rect(walk,-7,-7,14,14,'#4a5562');
  const tilePalette = ['#727c85','#77818a','#697583','#747e89','#79818a','#6e7985','#6c7886'];
  const tileW = .79, tileH = .47;
  for (let j = 0; j < 31; j++) for (let i = -1; i < 19; i++) {
    const x = -7 + i * tileW + (j % 2) * tileW * .5, z = -7 + j * tileH;
    rect(walk,x+.012,z+.010,tileW-.024,tileH-.020,choose(tilePalette));
    rect(walk,x+.012,z+.010,tileW-.024,.009,'#bac3c44c');
  }
  dapples(walk,37000,['#dbe0db21','#152b3c27','#38455430','#d6d7ca15']);
  // The deep alley gets cooler as it passes behind the shop.
  const alley = walk.createLinearGradient(0,-6.7,0,.7);
  alley.addColorStop(0,'#18273788'); alley.addColorStop(.74,'#26364348'); alley.addColorStop(1,'#223e5106');
  rect(walk,-7,-7,14,8,alley);
  reflectedLight(walk,-1.61,.47,5.5,1.96,[253,195,133],.65,-.08);
  reflectedLight(walk,-5.68,.54,1.18,2,[243,108,119],.62,-.06);
  reflectedLight(walk,1.13,.51,1.34,1.89,[151,220,211],.43,-.06);
  // Granite curb units follow the radius instead of ending in a square junction.
  const cornerCenter = [2.45,1.65], radius = .795;
  walk.beginPath(); walk.moveTo(-7,2.444); walk.lineTo(2.45,2.444);
  walk.arc(cornerCenter[0], cornerCenter[1], radius, Math.PI / 2, 0, true); walk.lineTo(3.245,-7);
  walk.lineWidth=.187; walk.strokeStyle='#a4a9a7'; walk.stroke();
  walk.beginPath(); walk.moveTo(-7,2.522); walk.lineTo(2.45,2.522);
  walk.arc(2.45,1.65,.871,Math.PI/2,0,true); walk.lineTo(3.321,-7);
  walk.lineWidth=.016; walk.strokeStyle='#d3cdc1'; walk.stroke();
  for (let x = -6.74; x < 2.46; x+=.77) {
    stroke(walk,[[x,2.339],[x+.008,2.53]],'#4e5865',.022);
  }
  for (let z=-6.78; z<1.65; z+=.77) stroke(walk,[[3.144,z],[3.346,z-.012]],'#505a65',.022);
  for (let i=0;i<4;i++) {
    const a=i*Math.PI/6;
    stroke(walk,[[2.45+.69*Math.cos(a),1.65+.69*Math.sin(a)],[2.45+.9*Math.cos(a),1.65+.9*Math.sin(a)]],'#515a67',.022);
  }
  // Low yellow tactile tiles lead from the shop frontage to the crossing.
  for (let x=-5.06;x< -2.96;x+=.29) {
    rect(walk,x,1.996,.279,.28,'#414a4c');
    rect(walk,x+.007,2.003,.265,.262,choose(['#c59b57','#c69e60','#c0a067']));
    for (let a=0;a<4;a++) for (let b=0;b<4;b++) {
      const xx=x+.044+a*.061, zz=2.034+b*.061;
      oval(walk,xx,zz,.015,.015,'#806e51');
      oval(walk,xx-.003,zz-.004,.012,.010,'#e0bd78');
    }
  }
  band(paving,walkOutline,.009,walkOutline,.143,standard('#6c737b',.66));
  band(paving,walkOutline,.143,walkTop,.18,standard('#a3a5a2',.52));
  plate(paving,walkTop,.18,mapped(walkImg));

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
  // Road paint has hard silkscreen edges and a small amount of wear.
  for (let i=0;i<6;i++) {
    const z = 2.79 + i * .71;
    rect(ink,-5.15,z,2.07,.365,choose(['#c0c8c9','#bbc4c9','#c5ccca']));
    rect(ink,-5.15,z+.356,2.07,.012,'#d8deda');
    rect(ink,-5.15,z,.014,.366,'#929da7');
  }
  // One marked kei parking bay, aligned parallel to the side street.
  stroke(ink,[[4.64,-5.95],[6.60,-5.95],[6.6,-2.58],[4.64,-2.58]],'#b0bcc1',.055);
  stroke(ink,[[4.64,-5.97],[4.64,-5.59]],'#b0bcc1',.055);
  stroke(ink,[[4.64,-2.55],[4.64,-2.94]],'#b0bcc1',.055);
  ink.save(); ink.translate(5.69,-4.24); ink.rotate(Math.PI/2);
  ink.textAlign='center'; ink.textBaseline='middle'; ink.font='bold .53px "Yu Gothic", "Noto Sans JP", sans-serif';
  ink.fillStyle='#c5c8bc'; ink.fillText('軽',0,0); ink.restore();
  // White edge marks are interrupted at the mouth of the crossing.
  stroke(ink,[[-6.93,2.83],[-5.55,2.83]],'#b1bec487',.048);
  stroke(ink,[[-2.68,2.83],[1.85,2.83]],'#b1bec49c',.051);
  stroke(ink,[[3.63,-6.94],[3.63,-1.60]],'#bec6c785',.049);
  stroke(ink,[[3.63,-1.20],[3.63,-.63]],'#bec6c77a',.049);
  for (const x of [-6.25,-.65,1.9,4.55]) {
    rect(ink,x,5.31,1.25,.067,'#d4b391bc');
  }
  ink.save(); ink.globalCompositeOperation='destination-out';
  for(let i=0;i<22500;i++) {
    rect(ink,between(-7,7),between(-7,7),between(.012,.077),between(.008,.026),choose(['#0007','#000a','#000d']));
  }
  for(let i=0;i<90;i++) {
    const x=between(-5.3,-2.96), z=between(2.72,6.72);
    stroke(ink,[[x,z],[x+.036,z+.009],[x+.099,z+.007]],'#0008',.012);
  }
  ink.restore();
  const markings = plate(hardware,roadOutline,.021,mapped(inkImg,true,.19));
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
  drain(-6.02,2.69);drain(-.85,2.69);drain(3.49,-.16,Math.PI/2);drain(3.49,-4.67,Math.PI/2);
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
  cover(1.48,4.21,.37); cover(5.51,.26,.285);
  plate(hardware,roadOutline,.026,mapped(steelImg,true,.18));
}
