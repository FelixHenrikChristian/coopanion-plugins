import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import storeImage from '../assets/storefront.webp';

// Night exterior: a real shop volume, lit glazing, a rainy pavement and reflective road.
// The backdrop inside the shop is an original illustrated texture. All signs are drawn here.
export function makeCity(h) {
  const {
    scene,
    B,
    C,
    O,
    group,
    face,
    flat,
    textile,
    label,
    interactive,
    materials,
    textures,
    geometries,
  } = h;
  let seed = 4361;
  const rng = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  const neon = (hex, k = 1) => {
    const m = new T.MeshStandardMaterial({
      color: hex,
      emissive: hex,
      emissiveIntensity: k,
      roughness: 0.5,
    });
    materials.add(m);
    return m;
  };
  const steel = '#434d63',
    siding = '#758098',
    trim = '#b4bcc2',
    rubber = '#202c3b';
  const warm = neon('#ffe7a2', 1.3),
    tube = neon('#fff5d8', 2.2),
    jade = neon('#7fd7c1', 0.55),
    ember = neon('#e97e67', 0.85);
  const shop = group(11.65, 0, 1.92);
  const masonry = textile(
    384,
    192,
    (g, w, H) => {
      g.fillStyle = '#83909a';
      g.fillRect(0, 0, w, H);
      for (let i = 0; i < 13000; i++) {
        g.fillStyle =
          rng() > 0.45 ? 'rgba(25,34,50,.04)' : 'rgba(240,236,222,.055)';
        g.fillRect(rng() * w, rng() * H, 1 + rng() * 2, 1);
      }
      g.strokeStyle = '#74808b';
      g.lineWidth = 1;
      for (let y = 0; y < H; y += 32) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
        for (let x = y % 64 ? 32 : 0; x < w; x += 64)
          g.strokeRect(x, y, 64, 32);
      }
    },
    2,
    1,
  );
  const deck = B(shop, 0, 0.12, 0.04, 6.45, 0.25, 4.12, '#667487');
  B(shop, 0, 1.53, -1.89, 6.24, 2.84, 0.18, masonry);
  for (const x of [-3.07, 3.07]) B(shop, x, 1.53, 0, 0.18, 2.84, 3.94, masonry);
  B(shop, 0, 2.94, 0, 6.48, 0.19, 4.15, '#536175');
  B(shop, 0, 3.07, 0, 6.39, 0.1, 4.02, '#8c96a7');
  B(shop, 0, 2.53, 2.04, 6.41, 0.12, 0.48, steel);
  B(shop, 0, 2.47, 2.25, 6.26, 0.035, 0.065, tube);
  // Mechanical units, louvers and a fan on the roof and side.
  function condenser(x, y, z, parent = shop) {
    const unit = group(x, y, z, parent);
    B(unit, 0, 0.23, 0, 0.68, 0.48, 0.45, '#acb4bd');
    B(unit, 0, 0.23, 0.232, 0.55, 0.37, 0.018, steel);
    for (let i = 0; i < 10; i++)
      B(unit, -0.26 + i * 0.056, 0.23, 0.247, 0.018, 0.35, 0.016, '#aeb7bb');
  }
  condenser(-1.86, 3.13, -0.92);
  condenser(-0.98, 3.13, -0.92);
  const sideUnit = group(3.23, 1.72, -0.76, shop);
  sideUnit.rotation.y = Math.PI / 2;
  condenser(0, 0, 0, sideUnit);
  // Emissive interior and actual shelves behind a recessed aluminium shopfront.
  const tex = new T.TextureLoader().load(storeImage);
  tex.colorSpace = T.SRGBColorSpace;
  tex.anisotropy = 4;
  textures.add(tex);
  const inside = new T.MeshBasicMaterial({ map: tex, color: '#fff5e3' });
  materials.add(inside);
  face(shop, 0, 1.37, -1.73, 6.08, 2.22, inside);
  B(shop, 0, 0.258, 0, 5.98, 0.04, 3.65, '#d8c6a8');
  for (const x of [-2.1, 0, 2.06])
    B(shop, x, 2.38, -0.09, 1.42, 0.045, 0.15, tube);
  const glazing = new T.MeshPhysicalMaterial({
    color: '#9dc7d7',
    transparent: true,
    opacity: 0.12,
    roughness: 0.13,
    side: T.DoubleSide,
    depthWrite: false,
  });
  materials.add(glazing);
  for (const [x, w] of [
    [-2.04, 1.79],
    [-0.51, 1.06],
    [0.6, 1.06],
    [2.11, 1.78],
  ]) {
    face(shop, x, 1.41, 1.989, w, 1.94, glazing);
    B(shop, x, 1.75, 2.02, w, 0.045, 0.055, '#a5b8c0');
    B(shop, x, 0.37, 2.01, w, 0.17, 0.072, steel);
    B(shop, x, 0.47, 2.04, w, 0.046, 0.053, jade);
  }
  for (const x of [-3.01, -1.09, 0.04, 1.16, 3.02])
    B(shop, x, 1.42, 2.025, 0.066, 2.18, 0.086, '#8695a1');
  B(shop, 0.04, 1.14, 2.085, 0.065, 0.39, 0.072, '#d2d6d3');
  // Small countertop, menu cards and entrance mats.
  B(shop, -1.85, 0.72, 1.1, 1.51, 0.86, 0.46, '#9ca69e');
  B(shop, -1.85, 1.17, 1.09, 1.61, 0.075, 0.56, '#e6d7ba');
  B(shop, -1.61, 1.33, 1.13, 0.32, 0.28, 0.17, rubber);
  B(shop, -1.61, 1.34, 1.225, 0.25, 0.17, 0.018, jade);
  B(shop, 0.03, 0.031, 2.58, 1.44, 0.035, 0.64, '#394654');
  const logo = textile(
    1024,
    104,
    (g, w, H) => {
      g.fillStyle = '#f1f1db';
      g.fillRect(0, 0, w, H);
      g.fillStyle = '#1d897d';
      g.fillRect(0, 0, w, 7);
      g.fillStyle = '#efb767';
      g.fillRect(0, 92, w, 6);
      g.fillStyle = '#276a68';
      g.beginPath();
      g.arc(58, 45, 25, 0, 2 * Math.PI);
      g.fill();
      g.fillStyle = '#f7efcb';
      g.beginPath();
      g.arc(68, 36, 22, 0, 2 * Math.PI);
      g.fill();
      g.fillStyle = '#244754';
      g.font = 'bold 45px "Yu Gothic","Microsoft YaHei",sans-serif';
      g.fillText('月見ストア', 101, 66);
      g.font = '600 20px sans-serif';
      g.letterSpacing = '2px';
      g.fillText('TSUKIMI  ·  MART', 445, 61);
      g.fillStyle = '#a45146';
      g.fillRect(w - 100, 14, 78, 65);
      g.fillStyle = '#fff9df';
      g.font = 'bold 27px sans-serif';
      g.fillText('24 h', w - 91, 55);
    },
    1,
    1,
    true,
  );
  B(shop, 0, 2.78, 2.065, 6.37, 0.5, 0.3, '#d0d5c9');
  face(shop, 0, 2.8, 2.224, 6.23, 0.41, logo);
  const sign = group(3.23, 1.97, 1.25, shop);
  B(sign, 0, 0, 0, 0.46, 1.81, 0.17, steel);
  const signTex = textile(
    160,
    512,
    (g, w, H) => {
      g.fillStyle = '#f8efd2';
      g.fillRect(0, 0, w, H);
      g.fillStyle = '#31776e';
      g.fillRect(0, 0, w, 18);
      g.fillStyle = '#2d484b';
      g.textAlign = 'center';
      g.font = 'bold 66px "Yu Gothic",sans-serif';
      ['月', '見', '店'].forEach((v, i) => g.fillText(v, 80, 120 + i * 103));
      g.fillStyle = '#a7544d';
      g.fillRect(0, 403, w, 109);
      g.fillStyle = '#fff6db';
      g.font = 'bold 44px sans-serif';
      g.fillText('24 h', 80, 473);
    },
    1,
    1,
    true,
  );
  face(sign, 0, 0, 0.09, 0.41, 1.68, signTex);
  label(shop, 1.71, 1.47, 2.05, 0.41, 0.59, '旬', '#c45548', '#fff3ce', 74);
  label(
    shop,
    -0.57,
    1.58,
    2.075,
    0.48,
    0.19,
    '営業中',
    '#26776c',
    '#fff5e2',
    62,
  );
  for (const [x, c] of [
    [-2.66, '#e4b86d'],
    [2.41, '#668a92'],
  ]) {
    const crate = group(x, 0, 2.29, shop);
    B(crate, 0, 0.21, 0, 0.35, 0.41, 0.33, c);
    B(crate, 0, 0.43, 0, 0.35, 0.032, 0.34, '#c3c7bd');
  }
  interactive(shop, 'market');
  const facade = group(0, 0, 0);
  facade.userData.dynamic = true;
  facade.scale.y = 0;
  // Exterior shell over the apartment only in the street view; room views cut it away.
  B(facade, 0, 1.43, 3.8, 11.12, 2.86, 0.18, masonry);
  B(facade, 5.47, 1.42, -0.05, 0.19, 2.85, 7.87, masonry);
  B(facade, 0, 2.97, 0, 11.37, 0.22, 8.04, '#48586c');
  for (const x of [-4.35, -2.96, 1.32, 3.05, 4.62]) {
    B(facade, x, 1.45, 3.912, 0.94, 1.1, 0.075, steel);
    B(
      facade,
      x,
      1.45,
      3.961,
      0.82,
      0.98,
      0.022,
      x % 2 > 0.5 ? warm : '#45516a',
    );
    B(facade, x, 1.46, 3.99, 0.035, 1, 0.022, steel);
    B(facade, x, 0.89, 4.0, 1.09, 0.055, 0.17, trim);
  }
  B(facade, -1.34, 1.03, 3.917, 1.28, 2.05, 0.12, '#627279');
  B(facade, -1.34, 1.17, 3.988, 0.91, 1.47, 0.04, '#ad967d');
  B(facade, -0.94, 1.02, 4.04, 0.03, 0.22, 0.04, trim);
  label(
    facade,
    -0.45,
    1.64,
    3.914,
    0.51,
    0.24,
    '青葉荘',
    '#687978',
    '#fff0cd',
    71,
  );
  B(facade, -1.33, 2.3, 4.12, 1.73, 0.12, 0.67, steel);
  B(facade, -1.35, 2.22, 4.24, 0.5, 0.04, 0.08, warm);
  const lit = group(-1.34, 1.1, 4.1);
  interactive(lit, 'sofa');
  // Original gradient cookies make the pools of street light persist on hardware without bloom.
  const glowCanvas = document.createElement('canvas');
  glowCanvas.width = glowCanvas.height = 128;
  const gp = glowCanvas.getContext('2d'),
    gr = gp.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,.92)');
  gr.addColorStop(0.24, 'rgba(255,255,255,.49)');
  gr.addColorStop(0.65, 'rgba(255,255,255,.12)');
  gr.addColorStop(1, 'rgba(255,255,255,0)');
  gp.fillStyle = gr;
  gp.fillRect(0, 0, 128, 128);
  const glowTex = new T.CanvasTexture(glowCanvas);
  textures.add(glowTex);
  const glowMats = [];
  function pool(x, z, w, d, col, opacity, y = 0.051) {
    const m = new T.MeshBasicMaterial({
      map: glowTex,
      color: col,
      transparent: true,
      opacity,
      blending: T.AdditiveBlending,
      depthWrite: false,
    });
    materials.add(m);
    glowMats.push([m, opacity]);
    const v = flat(scene, x, y, z, w, d, m);
    v.renderOrder = 2;
    return v;
  }
  for (const x of [9.47, 11.72, 13.55])
    pool(x, 4.16, 2.7, 3.35, '#ffc879', 0.71);
  pool(14.68, 4.45, 2.0, 2.6, '#ed9c75', 0.49);
  pool(8.9, 5.18, 3.2, 3, '#b0d0ef', 0.45);
  pool(-1.33, 4.15, 1.9, 1.7, '#f5c383', 0.6);
  // A wet asphalt mirror uses the actual scene. Dim the reflected colours, add fine ripples and road grain.
  const reflectGeo = new T.PlaneGeometry(40, 3.08);
  geometries.add(reflectGeo);
  const reflector = new Reflector(reflectGeo, {
    textureWidth: 640,
    textureHeight: 320,
    clipBias: 0.003,
    color: '#696f84',
    multisample: 0,
  });
  reflector.position.set(1, -0.095, 7.25);
  reflector.rotation.x = -Math.PI / 2;
  scene.add(reflector);
  const mirror = reflector.material;
  mirror.uniforms.clock = { value: 0 };
  mirror.uniforms.wet = { value: 1 };
  mirror.vertexShader =
    'varying vec2 roadUV;\n' +
    mirror.vertexShader.replace('void main() {', 'void main() { roadUV=uv;');
  mirror.fragmentShader =
    'varying vec2 roadUV; uniform float clock; uniform float wet;\n' +
    mirror.fragmentShader.replace(
      'texture2DProj( tDiffuse, vUv )',
      `texture2DProj(tDiffuse,vUv+vec4((sin(roadUV.y*236.0+clock)*.0014+sin(roadUV.x*470.0+roadUV.y*318.0-clock)*.0008)*vUv.w*wet,0.,0.,0.))`,
    );
  mirror.fragmentShader = mirror.fragmentShader.replace(
    'blendOverlay( base.rgb, color )',
    `mix(vec3(.015,.023,.042),base.rgb,.14+.37*wet)+vec3(fract(sin(dot(floor(roadUV*vec2(6500.,490.)),vec2(12.9898,78.233)))*43758.5453)*.014)`,
  );
  // Thin puddle streaks under the storefront and a kerb drain.
  for (let i = 0; i < 44; i++) {
    let x = 9 + rng() * 6,
      z = 5.82 + rng() * 2.7;
    const k = rng();
    B(
      scene,
      x,
      -0.072,
      z,
      0.05 + rng() * 0.4,
      0.002,
      0.009 + rng() * 0.014,
      k < 0.27 ? '#686779' : k < 0.67 ? '#4c556b' : '#6d6b72',
    );
  }
  for (let i = 0; i < 7; i++)
    B(scene, 13.8 + i * 0.085, -0.018, 5.57, 0.036, 0.013, 0.26, '#2d3547');
  for (let x = 14.9; x < 17; x += 0.66) {
    C(scene, x, 0.29, 5.58, 0.039, 0.61, trim);
    B(scene, x, 0.42, 5.58, 0.67, 0.035, 0.042, trim);
  }
  // Rear service lane and a parked compact van.
  const van = group(16.0, 0.015, 4.71);
  van.rotation.y = -0.08;
  B(van, 0, 0.4, 0, 1.38, 0.53, 0.75, '#687d8b');
  B(van, -0.12, 0.77, 0, 1.06, 0.4, 0.73, '#8b99a5');
  B(van, -0.14, 0.8, 0.376, 0.88, 0.25, 0.024, '#273d51');
  B(van, -0.06, 0.8, 0.397, 0.039, 0.28, 0.016, trim);
  for (const x of [-0.41, 0.45])
    for (const z of [-0.36, 0.36]) {
      let wh = C(van, x, 0.2, z, 0.168, 0.083, rubber);
      wh.rotation.x = Math.PI / 2;
    }
  B(van, 0.7, 0.44, 0.22, 0.024, 0.11, 0.14, warm);
  // A slender sidewalk beacon and genuinely illuminated reflective bollards.
  const pole = group(15.65, 0, 5.23);
  C(pole, 0, 1.72, 0, 0.057, 3.44, '#626c81');
  B(pole, -0.24, 3.43, 0, 0.54, 0.05, 0.06, steel);
  B(pole, -0.48, 3.39, 0, 0.34, 0.061, 0.18, tube);
  const cityLights = [];
  for (const [x, y, z, c, i] of [
    [11.4, 1.78, 3.18, 0xffd99c, 12],
    [13.65, 2.19, 3.33, 0xffdfb0, 8],
    [14.8, 1.4, 4.65, 0xffbc8a, 4],
    [15.25, 3.33, 5.24, 0xaecaff, 8],
  ]) {
    const l = new T.PointLight(c, i, 6, 2);
    l.position.set(x, y, z);
    scene.add(l);
    cityLights.push([l, i]);
  }
  // Keep rain outside the cutaway house.
  const count = 560,
    positions = new Float32Array(count * 6),
    drops = [];
  for (let i = 0; i < count; i++) {
    let x = rng() * 34 - 12,
      z = rng() * 20 - 8;
    if (x > -5.55 && x < 5.55 && z > -7.9 && z < 3.85) z = 4 + rng() * 6;
    drops.push([x, rng() * 8, z, 0.09 + rng() * 0.13, 4 + rng() * 1.8]);
  }
  const rainGeo = new T.BufferGeometry(),
    attr = new T.BufferAttribute(positions, 3);
  attr.setUsage(T.DynamicDrawUsage);
  rainGeo.setAttribute('position', attr);
  geometries.add(rainGeo);
  const rainMat = new T.LineBasicMaterial({
    color: '#b6cada',
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  materials.add(rainMat);
  const rain = new T.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  scene.add(rain);
  let lastStyle = '';
  return {
    update(s, now, style, outside) {
      facade.scale.y += (Number(outside) - facade.scale.y) * 0.1;
      facade.visible = facade.scale.y > 0.015;
      const wet = s.rain !== false;
      rain.visible = wet;
      mirror.uniforms.clock.value = (now % 300000) / 1000;
      mirror.uniforms.wet.value = wet ? 1 : 0;
      if (wet) {
        const t = (now % 120000) / 1000;
        for (let i = 0; i < count; i++) {
          const [x, o, z, len, speed] = drops[i],
            y = 8 - ((o + t * speed) % 8),
            j = i * 6;
          positions[j] = x + y * 0.05;
          positions[j + 1] = y;
          positions[j + 2] = z;
          positions[j + 3] = x + (y - len) * 0.05;
          positions[j + 4] = y - len;
          positions[j + 5] = z;
        }
        attr.needsUpdate = true;
      }
      if (lastStyle !== style + outside) {
        lastStyle = style + outside;
        const k = style === 'night' ? 1 : style === 'dusk' ? 0.68 : 0.23;
        for (const [l, i] of cityLights)
          l.intensity = i * k * (outside ? 1 : 0.15);
        for (const [m, n] of glowMats) m.opacity = n * k;
      }
    },
    dispose() {
      reflector.dispose();
    },
  };
}
