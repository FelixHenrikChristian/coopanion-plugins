import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function dressHome(h) {
  const {
    scene,
    B,
    C,
    O,
    Taper,
    group,
    face,
    flat,
    textile,
    label,
    plain,
    interactive,
    materials,
    textures,
    geometries,
    sofa,
    bed,
    tv,
    sink,
    tub,
    hob,
    dining,
    side,
  } = h;
  const lit = (c, k) => {
    const m = new T.MeshStandardMaterial({
      color: c,
      emissive: c,
      emissiveIntensity: k,
      roughness: 0.72,
    });
    materials.add(m);
    return m;
  };
  let seed = 921;
  const random = () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
  function woven(base, warp, weft) {
    return textile(
      256,
      256,
      (g, w, H) => {
        g.fillStyle = base;
        g.fillRect(0, 0, w, H);
        g.lineWidth = 0.8;
        for (let y = 0; y < H; y += 3) {
          g.strokeStyle = warp;
          g.beginPath();
          g.moveTo(0, y);
          g.lineTo(w, y + 0.4);
          g.stroke();
        }
        for (let x = 0; x < w; x += 3) {
          g.strokeStyle = weft;
          g.beginPath();
          g.moveTo(x, 0);
          g.lineTo(x + 0.8, H);
          g.stroke();
        }
        for (let i = 0; i < 800; i++) {
          g.fillStyle = 'rgba(255,255,239,.05)';
          g.fillRect(random() * w, random() * H, 2.5, 0.7);
        }
      },
      2,
      2,
    );
  }
  const linen = woven('#778b89', 'rgba(216,222,206,.22)', 'rgba(46,61,68,.22)');
  const indigo = woven(
    '#526b84',
    'rgba(197,209,210,.18)',
    'rgba(19,39,57,.18)',
  );
  const ochre = woven('#c68d60', 'rgba(253,217,159,.23)', 'rgba(96,65,51,.19)');
  function cushion(p, x, y, z, w, h, d, mat, r = 0.07) {
    const geo = new RoundedBoxGeometry(w, h, d, 2, Math.min(r, h * 0.46));
    geometries.add(geo);
    const m = new T.Mesh(geo, typeof mat === 'string' ? plain(mat) : mat);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    p.add(m);
    return m;
  }
  // Tailored seams and soft edges; fabric is an inexpensive shared weave texture.
  for (const x of [-0.6, 0.6]) {
    cushion(sofa, x, 0.535, -0.06, 1.18, 0.18, 0.79, linen);
    cushion(sofa, x, 0.8, 0.29, 1.18, 0.55, 0.18, linen).rotation.x = -0.12;
  }
  for (const x of [-1.24, 1.24])
    cushion(sofa, x, 0.67, 0, 0.22, 0.24, 1.05, linen);
  cushion(sofa, -0.81, 0.78, 0.12, 0.44, 0.4, 0.18, indigo).rotation.z = 0.2;
  cushion(sofa, 0.77, 0.78, 0.12, 0.43, 0.4, 0.18, ochre).rotation.z = -0.18;
  const blanket = cushion(bed, 0, 0.666, 0.19, 1.88, 0.16, 1.58, indigo);
  cushion(bed, 0, 0.696, -0.77, 1.19, 0.18, 0.42, '#e9e0cb');
  for (let i = 0; i < 6; i++)
    B(bed, -0.72 + i * 0.285, 0.751, 0.34, 0.015, 0.004, 1.16, '#778aa1');
  // Original rainy city matte outside the sash. Individual window lights and reflections sit behind the frame.
  const nightView = textile(
    900,
    450,
    (g, w, H) => {
      const grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#15233c');
      grad.addColorStop(0.63, '#34445a');
      grad.addColorStop(1, '#243448');
      g.fillStyle = grad;
      g.fillRect(0, 0, w, H);
      for (let layer = 0; layer < 3; layer++) {
        let x = -18;
        while (x < w) {
          const bw = 25 + random() * 74,
            bh = 50 + random() * 180 + layer * 9,
            y = 355 - bh;
          g.fillStyle = ['#334056', '#29374d', '#1c283e'][layer];
          g.fillRect(x, y, bw, bh);
          for (let wy = y + 10; wy < 351; wy += 16)
            for (let wx = x + 5; wx < x + bw - 6; wx += 11) {
              const n = random();
              g.fillStyle =
                n > 0.89 ? '#ecbd80' : n > 0.73 ? '#889caa' : '#39475a';
              g.fillRect(wx, wy, 5, 6);
            }
          x += bw + 5 + random() * 12;
        }
      }
      g.fillStyle = '#212e40';
      g.fillRect(0, 356, w, 94);
      for (let i = 0; i < 120; i++) {
        g.fillStyle = ['#bc936a', '#73879b', '#486277', '#766a64'][i % 4];
        g.globalAlpha = 0.23 + random() * 0.37;
        g.fillRect(
          random() * w,
          361 + random() * 86,
          4 + random() * 26,
          0.7 + random() * 2,
        );
      }
      g.globalAlpha = 1;
      for (let wire = 0; wire < 3; wire++) {
        g.strokeStyle = '#192333';
        g.lineWidth = 2;
        g.beginPath();
        g.moveTo(0, 73 + wire * 8);
        g.quadraticCurveTo(380, 190 + wire * 8, 900, 107 + wire * 8);
        g.stroke();
      }
      for (let i = 0; i < 65; i++) {
        const x = random() * w,
          y = random() * H;
        g.fillStyle = 'rgba(183,210,222,.30)';
        g.fillRect(x, y, 1, 2 + random() * 8);
      }
    },
    1,
    1,
    true,
  );
  const win = group(-5.46, 1.61, 1.43);
  win.rotation.y = Math.PI / 2;
  face(win, 0, 0, -0.03, 2.73, 1.37, nightView);
  for (const x of [-1.4, 0, 1.4])
    B(win, x, 0, 0.07, 0.057, 1.5, 0.115, '#435052');
  for (const y of [-0.72, 0.1, 0.72])
    B(win, 0, y, 0.065, 2.85, 0.052, 0.107, '#485459');
  B(win, 0, -0.78, 0.16, 3.13, 0.095, 0.37, '#a18562');
  const curtainMat = woven(
    '#aaa998',
    'rgba(253,244,208,.17)',
    'rgba(56,70,74,.19)',
  );
  for (const sign of [-1, 1])
    for (let i = 0; i < 5; i++) {
      const strip = cushion(
        win,
        sign * (1.47 - i * 0.059),
        -0.1,
        0.17 + (i % 2) * 0.055,
        0.098,
        1.67,
        0.047,
        curtainMat,
        0.018,
      );
      strip.rotation.z = sign * (i - 2) * 0.014;
    }
  B(win, 0, 0.83, 0.15, 3.22, 0.04, 0.055, '#5e5b53');
  // A shaded reading lamp and a low table with ceramic tea, books and a TV remote.
  const walnut = '#74513e',
    brass = '#a48756',
    ink = '#333e42';
  const lamp = group(-5.04, 0, 2.9);
  C(lamp, 0, 0.068, 0, 0.23, 0.095, walnut);
  C(lamp, 0, 0.74, 0, 0.025, 1.37, brass);
  const shade = lit('#efd6a1', 0.48);
  Taper(lamp, 0, 1.52, 0, 0.23, 0.35, 0.39, shade, 40);
  for (const y of [1.33, 1.71])
    C(lamp, 0, y, 0, y > 1.5 ? 0.236 : 0.35, 0.017, '#ba9969');
  const tea = group(-3.99, 0, 0.8);
  for (const x of [-0.32, 0.32])
    for (const z of [-0.19, 0.19]) B(tea, x, 0.19, z, 0.07, 0.36, 0.07, walnut);
  cushion(tea, 0, 0.41, 0, 0.9, 0.075, 0.61, '#99724f', 0.032);
  C(tea, -0.21, 0.485, -0.07, 0.085, 0.055, '#dfd5c0');
  C(tea, -0.21, 0.54, -0.07, 0.067, 0.085, '#adbdb0');
  C(tea, -0.21, 0.586, -0.07, 0.054, 0.004, '#685332');
  const remote = B(tea, 0.19, 0.47, -0.05, 0.079, 0.038, 0.224, ink);
  remote.rotation.y = 0.25;
  for (let i = 0; i < 3; i++)
    B(tea, 0.19, 0.492, -0.11 + i * 0.04, 0.043, 0.006, 0.013, '#8d9b99');
  B(tea, 0.16, 0.47, 0.13, 0.29, 0.036, 0.18, '#bbc0aa');
  interactive(tea, 'tv');
  // Records and a paperback on the console, stereo speaker, a framed woodblock landscape.
  const sleeve = textile(
    180,
    240,
    (g, w, H) => {
      g.fillStyle = '#dfc598';
      g.fillRect(0, 0, w, H);
      g.fillStyle = '#a96854';
      g.beginPath();
      g.arc(119, 62, 28, 0, Math.PI * 2);
      g.fill();
      for (let n = 0; n < 3; n++) {
        g.fillStyle = ['#9aa797', '#748a81', '#506864'][n];
        g.beginPath();
        g.moveTo(0, H);
        for (let x = 0; x <= w; x += 4)
          g.lineTo(x, 111 + n * 26 + 19 * Math.sin(x / 41 + n));
        g.lineTo(w, H);
        g.fill();
      }
    },
    1,
    1,
  );
  const picture = group(-5.41, 1.81, -1.7);
  picture.rotation.y = Math.PI / 2;
  B(picture, 0, 0, 0, 0.7, 0.95, 0.07, walnut);
  B(picture, 0, 0, 0.05, 0.62, 0.86, 0.035, '#e8debd');
  face(picture, 0, 0.01, 0.073, 0.47, 0.64, sleeve);
  const speaker = group(-1.99, 0, -0.06);
  B(speaker, 0, 0.35, 0, 0.3, 0.66, 0.29, walnut);
  const grille = textile(128, 128, (g, w, H) => {
    g.fillStyle = '#49484a';
    g.fillRect(0, 0, w, H);
    g.fillStyle = '#272b2c';
    for (let i = 0; i < w; i += 6)
      for (let j = 0; j < H; j += 6) g.fillRect(i, j, 3, 3);
  });
  face(speaker, 0, 0.36, 0.15, 0.24, 0.54, grille);
  for (let i = 0; i < 5; i++)
    B(
      tv,
      0.92 - i * 0.088,
      0.64,
      0.16,
      0.064,
      0.25 + (i % 2) * 0.04,
      0.19,
      ['#688e8c', '#c88069', '#b6a984'][i % 3],
    );
  const kitchenTile = textile(
    384,
    128,
    (g, w, H) => {
      g.fillStyle = '#bdc5b5';
      g.fillRect(0, 0, w, H);
      for (let i = 0; i < 8; i++)
        for (let j = 0; j < 3; j++) {
          g.fillStyle = ['#9aa99f', '#a8b7a9', '#a9b3a6'][(i + j * 2) % 3];
          g.fillRect(i * 48, j * 43, 46, 41);
        }
    },
    2,
    1,
  );
  face(hob, 0, 1.39, -0.39, 2.31, 0.53, kitchenTile);
  B(hob, 0.1, 1.85, -0.3, 1.52, 0.09, 0.33, '#987758');
  for (let i = 0; i < 4; i++) {
    C(
      hob,
      -0.4 + i * 0.25,
      2.0,
      -0.27,
      0.076,
      0.23,
      ['#ab8761', '#91a39b', '#bc9f73', '#bba58d'][i],
    );
    C(hob, -0.4 + i * 0.25, 2.127, -0.27, 0.076, 0.023, '#665b51');
  }
  const counterLight = lit('#ffdc9a', 1.1);
  B(hob, 0, 1.79, -0.14, 1.32, 0.025, 0.042, counterLight);
  // Bathroom wall mosaic, towel rail, frosted mirror and bath slats.
  const towels = group(4.63, 1.4, 0.71);
  B(towels, 0, 0, 0, 0.73, 0.03, 0.042, brass);
  cushion(towels, -0.1, -0.23, 0.015, 0.36, 0.46, 0.053, '#dedbca', 0.018);
  for (let i = 0; i < 4; i++)
    B(tub, -0.57 + i * 0.093, 0.729, 0.12, 0.065, 0.045, 1.36, '#ad8b66');
  const bottleColors = ['#9aa9a1', '#d7bd87', '#b89384'];
  for (let i = 0; i < 3; i++) {
    C(sink, -0.44 + i * 0.11, 1.065, -0.08, 0.037, 0.16, bottleColors[i]);
    C(sink, -0.44 + i * 0.11, 1.158, -0.08, 0.022, 0.042, ink);
  }
  // Joinery, translucent paper screens, and pools of lamplight tie the rooms to the night street.
  const lattice = group(1.63, 1.72, -7.65);
  B(lattice, 0, 0, 0, 1.76, 1.19, 0.055, '#a2a192');
  for (let col = 0; col < 5; col++)
    B(lattice, (col - 2) * 0.415, 0, 0.043, 0.024, 1.17, 0.036, '#80715f');
  for (let row = 0; row < 4; row++)
    B(lattice, 0, (row - 1.5) * 0.36, 0.044, 1.73, 0.021, 0.039, '#80715f');
  const transom = group(-3.62, 1.72, -7.65);
  B(transom, 0, 0, 0, 2.64, 1.26, 0.07, '#5a6465');
  face(transom, 0, 0, 0.043, 2.53, 1.14, nightView);
  for (const xx of [-1.22, 0, 1.22])
    B(transom, xx, 0, 0.09, 0.044, 1.22, 0.062, '#796958');
  B(transom, 0, -0.27, 0.09, 2.54, 0.032, 0.061, '#796958');
  B(transom, 0, -0.66, 0.13, 2.76, 0.063, 0.22, '#ad9174');
  const lampshade = group(-0.59, 1.8, 3.39);
  C(lampshade, 0, 0, 0, 0.135, 0.34, lit('#ffe0a2', 0.66));
  for (const y of [-0.16, -0.095, 0, 0.095, 0.16])
    C(lampshade, 0, y, 0, 0.138, 0.012, '#8c745b');
  const alcove = group(-4.98, 0, 1.02);
  B(alcove, 0, 0.22, 0, 0.58, 0.42, 0.63, '#a1886d');
  B(alcove, 0, 0.45, 0, 0.62, 0.058, 0.67, '#795f4c');
  B(alcove, 0.03, 0.51, 0.07, 0.36, 0.047, 0.27, '#728e8c');
  B(alcove, -0.02, 0.56, 0.07, 0.3, 0.038, 0.24, '#c4a580');
  O(alcove, -0.03, 0.7, -0.12, 0.084, 0.125, 0.084, '#9eb1ab');
  for (let j = 0; j < 4; j++) {
    const twig = C(
      alcove,
      -0.034 + j * 0.021,
      0.91,
      -0.12,
      0.008,
      0.31,
      '#747e5c',
    );
    twig.rotation.z = (j - 1.5) * 0.13;
    O(
      alcove,
      -0.083 + j * 0.043,
      1.054 + (j % 2) * 0.038,
      -0.12,
      0.043,
      0.029,
      0.037,
      '#c7b093',
    );
  }
  // Soft contact shadows: shared 64px alpha texture instead of a screen-wide SSAO pass.
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const g = cv.getContext('2d'),
    r = g.createRadialGradient(32, 32, 1, 32, 32, 32);
  r.addColorStop(0, 'rgba(15,24,28,.62)');
  r.addColorStop(0.55, 'rgba(15,24,28,.31)');
  r.addColorStop(1, 'rgba(15,24,28,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  const cookie = new T.CanvasTexture(cv);
  textures.add(cookie);
  const shadow = new T.MeshBasicMaterial({
    map: cookie,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  });
  materials.add(shadow);
  for (const [x, z, w, d] of [
    [-3.58, 2.5, 3.3, 1.65],
    [-3.76, -0.07, 2.9, 1.0],
    [-3.99, 0.8, 1.28, 0.87],
    [3.8, -2.2, 2.6, 2.9],
    [-4.3, -2.22, 1.7, 1.2],
    [4.34, 2.39, 2, 2.1],
  ])
    flat(scene, x, 0.031, z, w, d, shadow).renderOrder = 1;
  const lights = [];
  for (const [x, y, z, c, str, range] of [
    [-5.03, 1.43, 2.9, 0xffcd89, 6.3, 4.9],
    [-3.36, 1.14, 0.4, 0xb7d8f7, 2.5, 3.8],
    [-2.46, 1.66, -3.3, 0xffcb86, 5.2, 3.2],
    [1.36, 1.7, 1.06, 0xc7e9de, 2.7, 4.3],
  ]) {
    const l = new T.PointLight(c, str, range, 2);
    l.position.set(x, y, z);
    scene.add(l);
    lights.push([l, str]);
  }
  // Inside focus only needs the room lights. The street focus uses the shop lights.
  return {
    update(style, exterior, tvOn) {
      const factor = style === 'day' ? 0.22 : style === 'dusk' ? 0.7 : 1;
      lights.forEach(([l, s], i) => {
        l.intensity = exterior ? 0 : s * factor * (i === 1 && !tvOn ? 0.14 : 1);
      });
      shade.emissiveIntensity = factor * 0.66;
    },
  };
}
