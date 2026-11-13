import * as T from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { buildStore } from './shop.js';
import { buildDistrict } from './district.js';

// Night exterior: a real shop volume, lit glazing, a rainy pavement and reflective road.
// Surfaces and product labels are authored locally.
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
  const store = buildStore({ ...h, neon }, logo);
  const facade = group(0, 0, 0);
  facade.userData.dynamic = true;
  facade.scale.y = 0;
  // Exterior shell over the apartment only in the street view; room views cut it away.
  B(facade, 0, 1.43, 3.8, 11.12, 2.86, 0.18, masonry);
  B(facade, 5.47, 1.42, -0.05, 0.19, 2.85, 7.87, masonry);
  B(facade, 0, 2.91, -1.98, 11.46, 0.18, 11.98, '#526874');
  for (let i = 0; i < 2; i++) {
    const side = i ? 1 : -1,
      roof = B(facade, side * 2.82, 3.47, -1.98, 5.85, 0.12, 12.06, '#4c626b');
    roof.rotation.z = -side * 0.17;
    for (let z = -7.83; z <= 4; z += 0.44) {
      const seam = B(
        facade,
        side * 2.82,
        3.54,
        z,
        5.82,
        0.035,
        0.032,
        '#60777c',
      );
      seam.rotation.z = roof.rotation.z;
    }
  }
  B(facade, 0, 3.98, -1.98, 0.22, 0.1, 12.1, '#75827f');
  for (const x of [-5.3, 5.3]) {
    C(facade, x, 1.48, 3.95, 0.032, 2.85, '#68777a');
    B(facade, x, 2.85, -1.9, 0.08, 0.06, 11.75, '#56666a');
  }
  for (let i = 0; i < 14; i++)
    B(facade, 0, 0.4 + i * 0.16, 3.899, 11.02, 0.019, 0.026, '#8d9995');
  // Lantern and timber slats frame the residence entrance, facing the sidewalk.
  for (let i = 0; i < 7; i++)
    B(facade, -2.63 + i * 0.077, 1.2, 3.97, 0.032, 2.12, 0.048, '#806b53');
  B(facade, -0.6, 1.62, 4.0, 0.2, 0.32, 0.15, warm);

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
  h.registerSolids(facade);

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
  buildDistrict({ ...h, pool, neon, T });
  for (const x of [17.3, 19.35, 21.46])
    pool(x, 4.16, 2.7, 3.35, '#ffc879', 0.71);
  pool(23.03, 4.54, 2.0, 2.6, '#ed9c75', 0.49);
  pool(8.9, 5.18, 3.2, 3, '#b0d0ef', 0.45);
  pool(-1.33, 4.15, 1.9, 1.7, '#f5c383', 0.6);
  // A wet asphalt mirror uses the actual scene. Dim the reflected colours, add fine ripples and road grain.
  const reflectGeo = new T.PlaneGeometry(34, 34);
  geometries.add(reflectGeo);
  const reflector = new Reflector(reflectGeo, {
    textureWidth: 640,
    textureHeight: 320,
    clipBias: 0.003,
    color: '#696f84',
    multisample: 0,
  });
  reflector.position.set(8, -0.081, 3);
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
    `mix(vec3(.015,.023,.042),base.rgb,.14+.37*wet)+vec3(fract(sin(dot(floor(roadUV*vec2(6500.,490.)),vec2(12.9898,78.233)))*43758.5453)*.0018)`,
  );
  const cityLights = [];
  for (const [x, y, z, c, i] of [
    [17.65, 2.38, 1.22, 0xffd99c, 21],
    [21.45, 2.35, -0.24, 0xffdfb0, 20],
    [19.45, 2.15, 3.01, 0xffe1a6, 13],
    [22.95, 1.6, 4.78, 0xffbc8a, 4],
    [15.5, 3.72, 5.12, 0xaecaff, 8],
  ]) {
    const l = new T.PointLight(c, i, 6, 2);
    l.position.set(x, y, z);
    scene.add(l);
    cityLights.push([l, i]);
  }
  // Keep rain clear of interiors.
  const count = 560,
    positions = new Float32Array(count * 6),
    drops = [];
  for (let i = 0; i < count; i++) {
    let x = rng() * 34 - 9,
      z = rng() * 34 - 14;
    if (x > -5.55 && x < 5.55 && z > -7.9 && z < 3.85) z = 4 + rng() * 6;
    if (x > 15.5 && x < 23.3 && z > -3 && z < 3.9) z = 4 + rng() * 4;
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
    update(s, now, style, outside, aim, half) {
      store.update(s, now, aim, half);
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
