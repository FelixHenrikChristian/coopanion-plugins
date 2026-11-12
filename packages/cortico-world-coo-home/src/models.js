import * as T from 'three';
import { makeCity } from './city.js';
import { dressHome } from './interior.js';
import { household } from './household.js';
import { floors, walls, furniture, plots } from './layout.js';
import { plantStage, phase } from './life.js';

export function furnish(scene) {
  const geometries = new Set(),
    materials = new Set(),
    textures = new Set(),
    cache = new Map(),
    solids = [],
    picks = [];
  const cube = new T.BoxGeometry(1, 1, 1),
    orb = new T.SphereGeometry(1, 14, 10),
    cyl = new T.CylinderGeometry(1, 1, 1, 20);
  [cube, orb, cyl].forEach((g) => geometries.add(g));
  const dark = '#45484b',
    wood = '#986a48',
    honey = '#c59565',
    paper = '#f0e5cb',
    metal = '#879b9b',
    green = '#638577',
    tile = '#9dbbb5';
  function plain(c) {
    if (!cache.has(c)) {
      const m = new T.MeshStandardMaterial({ color: c, roughness: 0.85 });
      materials.add(m);
      cache.set(c, m);
    }
    return cache.get(c);
  }
  function group(x, y, z, parent = scene) {
    const g = new T.Group();
    g.position.set(x, y, z);
    parent.add(g);
    return g;
  }
  function shape(parent, geo, x, y, z, w, h, d, col) {
    const m = new T.Mesh(geo, typeof col === 'string' ? plain(col) : col);
    m.position.set(x, y, z);
    m.scale.set(w, h, d);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  const B = (p, x, y, z, w, h, d, c) => shape(p, cube, x, y, z, w, h, d, c);
  const O = (p, x, y, z, w, h, d, c) => shape(p, orb, x, y, z, w, h, d, c);
  const C = (p, x, y, z, r, h, c) => shape(p, cyl, x, y, z, r, h, r, c);
  function Taper(p, x, y, z, a, b, h, c, n = 20) {
    const geom = new T.CylinderGeometry(a, b, h, n);
    geometries.add(geom);
    return shape(p, geom, x, y, z, 1, 1, 1, c);
  }
  function textile(w, h, paint, repeatX = 1, repeatY = 1, unlit = false) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    const g = cv.getContext('2d');
    paint(g, w, h);
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = 4;
    textures.add(tex);
    const m = unlit
      ? new T.MeshBasicMaterial({ map: tex })
      : new T.MeshStandardMaterial({ map: tex, roughness: 0.93 });
    materials.add(m);
    return m;
  }
  function face(p, x, y, z, w, h, m) {
    const geo = new T.PlaneGeometry(w, h);
    geometries.add(geo);
    const n = shape(p, geo, x, y, z, 1, 1, 1, m);
    n.castShadow = false;
    return n;
  }
  function flat(p, x, y, z, w, d, m) {
    const n = face(p, x, y, z, w, d, m);
    n.rotation.x = -Math.PI / 2;
    return n;
  }
  const floorWood = textile(
    512,
    256,
    (g, w, h) => {
      g.fillStyle = '#dcb795';
      g.fillRect(0, 0, w, h);
      for (let j = 0; j < 8; j++) {
        g.fillStyle = ['#dbb993', '#deb995', '#d9b18a', '#e5c4a4'][j % 4];
        g.fillRect(0, j * 32, w, 31);
        g.fillStyle = '#ab8c71';
        g.fillRect(0, j * 32, w, 1);
        const seam = (j * 137) % w;
        g.fillRect(seam, j * 32, 1, 31);
        g.strokeStyle = '#c5a482';
        g.lineWidth = 0.7;
        for (let i = 0; i < 6; i++) {
          let x = (i * 97 + j * 66) % w,
            y = j * 32 + ((i * 7) % 29);
          g.beginPath();
          g.moveTo(x, y);
          g.bezierCurveTo(x + 12, y - 2, x + 28, y + 2, x + 55, y);
          g.stroke();
        }
      }
    },
    1.4,
    1,
  );
  const ceramic = textile(
    128,
    128,
    (g, w, h) => {
      g.fillStyle = '#c5d7cd';
      g.fillRect(0, 0, w, h);
      g.strokeStyle = '#a3b5ae';
      g.lineWidth = 2;
      g.strokeRect(0, 0, w, h);
    },
    8,
    5,
  );
  const tatami = textile(
    256,
    192,
    (g, w, h) => {
      g.fillStyle = '#d4c59a';
      g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 3) {
        g.fillStyle = y % 2 ? '#d0c095' : '#e0d2ab';
        g.fillRect(0, y, w, 1);
      }
      g.fillStyle = '#697f71';
      g.fillRect(0, 0, 5, h);
      g.fillRect(w - 4, 0, 4, h);
      g.fillRect(0, 0, w, 3);
    },
    2,
    2,
  );
  function label(p, x, y, z, w, h, text, bg, ink, size = 41) {
    const m = textile(
      384,
      112,
      (g, W, H) => {
        g.fillStyle = bg;
        g.fillRect(0, 0, W, H);
        g.fillStyle = ink;
        g.font = 'bold ' + size + 'px "Yu Gothic","Microsoft YaHei",sans-serif';
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.fillText(text, W / 2, H / 2, W - 20);
      },
      1,
      1,
      true,
    );
    return face(p, x, y, z, w, h, m);
  }
  function interactive(g, key) {
    g.userData.target = key;
    g.traverse((m) => {
      if (m.isMesh) {
        m.userData.target = key;
        picks.push(m);
      }
    });
  }
  function station(key) {
    const [x, z] = furniture[key].object;
    return group(x, 0, z);
  }
  function table(g, w, d, h, col = honey) {
    for (const x of [-w * 0.39, w * 0.39])
      for (const z of [-d * 0.35, d * 0.35])
        B(g, x, h / 2, z, 0.09, h, 0.09, wood);
    B(g, 0, h, 0, w, 0.11, d, col);
  }
  function pot(g, x, y, z, size) {
    const pg = group(x, y, z, g);
    Taper(
      pg,
      0,
      0.23 * size,
      0,
      0.28 * size,
      0.2 * size,
      0.46 * size,
      '#bd825e',
    );
    for (let i = 0; i < 7; i++) {
      let a = i * 2.4;
      const l = O(
        pg,
        Math.cos(a) * 0.18 * size,
        (0.58 + (i % 2) * 0.12) * size,
        Math.sin(a) * 0.18 * size,
        0.09 * size,
        0.27 * size,
        0.08 * size,
        ['#627a50', '#89a273', '#779566'][i % 3],
      );
      l.rotation.z = -Math.cos(a) * 0.55;
      l.rotation.x = Math.sin(a) * 0.55;
    }
  }
  function chair(g, x, z, rotate = 0) {
    const c = group(x, 0, z, g);
    c.rotation.y = rotate;
    table(c, 0.54, 0.55, 0.43);
    B(c, 0, 0.66, 0.23, 0.52, 0.39, 0.085, green);
  }
  function registerSolids(g) {
    g.traverse((m) => {
      if (m.isMesh) solids.push(m);
    });
  }
  const block = B(scene, 1.68, -0.29, 0.02, 14.85, 0.52, 8.18, '#8b8a78');
  block.castShadow = false;
  for (const [id, a, b, c, d] of [...floors].reverse()) {
    const g = group((a + b) / 2, 0, (c + d) / 2);
    B(
      g,
      0,
      -0.045,
      0,
      b - a,
      0.09,
      d - c,
      id === 'garden' ? '#ada891' : id === 'street' ? '#b6beb7' : '#d5bfa6',
    );
    if (id !== 'street')
      flat(
        g,
        0,
        ['entry', 'utility', 'balcony'].includes(id) ? 0.019 : 0.009,
        0,
        b - a,
        d - c,
        ['bath', 'utility', 'entry', 'balcony'].includes(id)
          ? ceramic
          : id === 'bedroom'
            ? tatami
            : id === 'garden'
              ? ceramic
              : floorWood,
      );
  }
  for (const [a, b, c, d, h] of walls) {
    const len = Math.hypot(c - a, d - b),
      alongX = b === d;
    const g = group((a + c) / 2, 0, (b + d) / 2);
    if (!alongX) g.rotation.y = Math.PI / 2;
    if (a === -5.5 && c === -5.5 && b === -3.95) {
      // A real opening between z=.02 and 2.84. The sash, artwork and curtains sit in it.
      const lo = -3.95,
        hi = 3.8,
        left = 0.02,
        right = 2.84;
      for (const [start, end] of [
        [lo, left],
        [right, hi],
      ])
        B(
          scene,
          -5.5,
          h / 2,
          (start + end) / 2,
          0.13,
          h,
          end - start,
          '#d2c8b5',
        );
      B(
        scene,
        -5.5,
        0.435,
        (left + right) / 2,
        0.13,
        0.87,
        right - left,
        '#c4bcaa',
      );
      B(
        scene,
        -5.5,
        2.33,
        (left + right) / 2,
        0.13,
        0.18,
        right - left,
        '#d0c9b7',
      );
    } else
      B(g, 0, h / 2, 0, len + 0.05, h, 0.13, h < 1 ? '#b0bdb6' : '#d8d0bc');
    B(g, 0, h + 0.015, 0, len + 0.11, 0.065, 0.18, h < 1 ? '#97a99d' : wood);
    B(g, 0, 0.135, 0, len, 0.22, 0.15, honey);
    registerSolids(g);
  }
  // Back windows: translucent-looking glass painted with reflected sky, timber mullions and a sill.
  for (const [x, span] of [
    [-2.8, 2.5],
    [2.8, 2.9],
  ]) {
    const win = group(x, 1.68, -3.855);
    B(win, 0, 0, 0, span, 1.31, 0.08, wood);
    B(win, 0, 0, 0.05, span - 0.14, 1.15, 0.06, '#a6c8c8');
    for (const dx of [-span * 0.27, 0, span * 0.27])
      B(win, dx, 0, 0.1, 0.044, 1.18, 0.055, wood);
    B(win, 0, -0.08, 0.105, span - 0.06, 0.047, 0.06, wood);
    B(win, 0, -0.69, 0.12, span + 0.2, 0.08, 0.27, honey);
  }
  // Living room: low television, speaker grille, linen sofa and a woven rug.
  const tv = station('tv');
  B(tv, 0, 0.26, 0.08, 2.45, 0.44, 0.58, wood);
  for (const x of [-0.76, 0, 0.76]) {
    B(tv, x, 0.26, 0.382, 0.69, 0.32, 0.035, '#b38762');
    B(tv, x, 0.31, 0.406, 0.16, 0.025, 0.02, dark);
  }
  B(tv, 0, 0.525, 0, 0.7, 0.06, 0.34, dark);
  B(tv, 0, 0.67, 0, 0.14, 0.27, 0.1, dark);
  B(tv, 0, 1.2, 0, 1.98, 1.14, 0.14, '#313a3c');
  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 512;
  screenCanvas.height = 288;
  const pen = screenCanvas.getContext('2d');
  const tvTex = new T.CanvasTexture(screenCanvas);
  tvTex.colorSpace = T.SRGBColorSpace;
  textures.add(tvTex);
  const tvMat = new T.MeshBasicMaterial({ map: tvTex });
  materials.add(tvMat);
  const screen = face(tv, 0, 1.2, 0.076, 1.86, 1.03, tvMat);
  interactive(tv, 'tv');
  registerSolids(tv);
  const sofa = station('sofa');
  B(sofa, 0, 0.22, 0, 2.55, 0.28, 1.02, wood);
  B(sofa, 0, 0.62, 0.41, 2.65, 0.72, 0.23, '#63837e');
  for (const x of [-0.6, 0.6])
    B(sofa, x, 0.42, -0.04, 1.15, 0.29, 0.78, '#93aca0');
  for (const x of [-1.24, 1.24])
    B(sofa, x, 0.47, 0, 0.2, 0.46, 1.04, '#75958a');
  const throwPillow = B(sofa, 0.79, 0.71, 0.21, 0.43, 0.43, 0.14, '#deb079');
  throwPillow.rotation.z = -0.18;
  interactive(sofa, 'sofa');
  registerSolids(sofa);
  const rug = textile(256, 160, (g, w, h) => {
    g.fillStyle = '#b96e58';
    g.fillRect(0, 0, w, h);
    g.strokeStyle = '#ecd4a9';
    g.lineWidth = 3;
    g.strokeRect(9, 8, w - 18, h - 16);
    g.lineWidth = 1;
    g.strokeRect(17, 15, w - 34, h - 30);
    for (let i = 0; i < 9; i++) {
      g.beginPath();
      const x = 30 + 24 * i;
      g.moveTo(x - 7, 80);
      g.lineTo(x, 75);
      g.lineTo(x + 7, 80);
      g.lineTo(x, 85);
      g.closePath();
      g.stroke();
    }
  });
  flat(scene, -3.55, 0.023, 1.42, 3.17, 1.48, rug);
  pot(scene, -5.14, 0, 3.25, 0.9);
  // Kitchen: sink, two hotplates, pan, hanging rail, refrigerator and a set table.
  const hob = station('stove');
  B(hob, 0, 0.51, 0, 2.36, 1, 0.78, '#8ba198');
  B(hob, 0, 1.04, 0, 2.46, 0.1, 0.85, '#ded8ca');
  for (const x of [-0.76, 0, 0.76]) {
    B(hob, x, 0.52, 0.407, 0.7, 0.77, 0.045, '#a8b6a7');
    B(hob, x, 0.8, 0.45, 0.24, 0.035, 0.06, metal);
  }
  for (const x of [-0.38, 0.42]) C(hob, x, 1.105, 0, 0.225, 0.045, dark);
  C(hob, -0.38, 1.21, 0, 0.236, 0.18, '#bf8766');
  B(hob, -0.68, 1.23, 0, 0.3, 0.045, 0.07, wood);
  const steam = group(-0.38, 1.4, 0, hob);
  for (let i = 0; i < 4; i++)
    O(steam, i * 0.055 - 0.1, i * 0.1, 0, 0.038, 0.085, 0.034, '#fff0d3');
  interactive(hob, 'stove');
  registerSolids(hob);
  const fridge = group(-4.85, 0, -3.45);
  B(fridge, 0, 0.84, 0, 0.8, 1.64, 0.79, '#d5dcd3');
  B(fridge, 0, 0.53, 0.405, 0.76, 0.8, 0.032, '#c1cfc7');
  B(fridge, 0.26, 1.26, 0.435, 0.045, 0.28, 0.045, metal);
  interactive(fridge, 'stove');
  registerSolids(fridge);
  const dining = station('table');
  table(dining, 1.32, 0.79, 0.72);
  chair(dining, 0, 0.58);
  chair(dining, 0, -0.58, Math.PI);
  for (const x of [-0.37, 0.34]) {
    C(dining, x, 0.8, 0.06, 0.17, 0.035, '#fcf2d9');
    B(dining, x + 0.19, 0.805, 0, 0.02, 0.018, 0.29, wood);
  }
  const rice = group(0.31, 0.82, 0.04, dining);
  O(rice, 0, 0.05, 0, 0.11, 0.07, 0.11, '#fff2d7');
  interactive(dining, 'table');
  registerSolids(dining);
  // Bedroom: raised futon, folded duvet, a bedside shelf and pendant.
  const bed = station('bed');
  B(bed, 0, 0.19, 0, 1.94, 0.3, 2.35, wood);
  B(bed, 0, 0.43, 0, 1.87, 0.26, 2.28, '#eae2cc');
  B(bed, 0, 0.61, 0.26, 1.88, 0.16, 1.52, '#8396a6');
  for (let i = 0; i < 4; i++)
    B(bed, 0, 0.696, 0.77 + i * 0.07, 1.88, 0.018, 0.026, '#c8ceca');
  B(bed, 0, 0.61, -0.77, 1.14, 0.15, 0.36, '#f6eddc');
  B(bed, 0, 0.6, -1.16, 2, 0.81, 0.14, honey);
  interactive(bed, 'bed');
  registerSolids(bed);
  const side = group(2.02, 0, -3.35);
  table(side, 0.62, 0.64, 0.47);
  C(side, 0, 0.72, 0, 0.04, 0.43, wood);
  Taper(side, 0, 0.98, 0, 0.18, 0.28, 0.33, '#ebd2a3');
  // Washroom with a rimmed ofuro, water, shower pipe, patterned tiles and washstand.
  const tub = station('bath');
  B(tub, 0, 0.32, 0, 1.61, 0.59, 1.71, '#a9bcb3');
  B(tub, 0, 0.63, 0, 1.63, 0.08, 1.74, '#eee8d7');
  const water = B(tub, 0, 0.68, 0, 1.34, 0.025, 1.43, '#8fbec0');
  interactive(tub, 'bath');
  registerSolids(tub);
  const sink = station('sink');
  B(sink, 0, 0.44, 0, 1.15, 0.87, 0.6, '#acb9aa');
  B(sink, 0, 0.92, 0, 1.22, 0.12, 0.68, paper);
  O(sink, 0, 0.97, 0, 0.38, 0.055, 0.22, '#9eafab');
  C(sink, 0.28, 1.09, -0.17, 0.027, 0.26, metal);
  B(sink, 0, 1.61, -0.23, 0.8, 0.75, 0.06, '#9caeaa');
  interactive(sink, 'sink');
  registerSolids(sink);
  const patchGroups = [],
    plantGroups = [];
  plots.forEach(([x, z], i) => {
    const g = group(x, 0.01, z);
    B(g, 0, 0.12, 0, 1.22, 0.23, 1.36, '#966b50');
    B(g, 0, 0.244, 0, 1.12, 0.036, 1.25, '#655241');
    for (let k = 0; k < 4; k++)
      B(g, (k - 1.5) * 0.25, 0.266, 0, 0.06, 0.025, 1.13, '#7e6049');
    const spr = group(0, 0.27, 0, g);
    const fruits = [];
    for (const xx of [-0.26, 0.26])
      for (const zz of [-0.29, 0.29]) {
        C(spr, xx, 0.18, zz, 0.024, 0.34, '#73915b');
        for (const sign of [-1, 1]) {
          const leaf = O(
            spr,
            xx + sign * 0.078,
            0.22,
            zz,
            0.105,
            0.055,
            0.075,
            '#78955d',
          );
          leaf.rotation.z = sign * 0.36;
        }
        fruits.push(O(spr, xx, 0.18, zz + 0.04, 0.089, 0.09, 0.09, '#d16d4d'));
      }
    interactive(g, 'plot' + i);
    patchGroups.push(g);
    plantGroups.push({ spr, fruits });
  });
  // Japanese residential street: paving joints, lane markings, a crossing, shop awnings, balconies and power lines.
  B(scene, 1, -0.21, 5.02, 31, 0.36, 2.34, '#c4c5b7');
  B(scene, 1, -0.25, 7.23, 34, 0.3, 2.93, '#697375');
  B(scene, 1, -0.19, 9.44, 34, 0.38, 1.55, '#b9c0b6');
  for (let x = -14; x <= 16; x += 1.05)
    B(scene, x, -0.022, 5.06, 0.018, 0.01, 2.31, '#a6aea5');
  for (let x = -15; x < 18; x += 3)
    B(scene, x, -0.09, 7.22, 1.26, 0.012, 0.055, '#e2d8b8');
  for (let z = 6.04; z < 8.67; z += 0.38)
    B(scene, 7.5, -0.09, z, 1.3, 0.014, 0.165, '#e8e4ca');
  function building(x, z, w, h, d, c, shop, seed) {
    const g = group(x, -0.1, z);
    B(g, 0, h / 2, 0, w, h, d, c);
    B(g, 0, h + 0.07, 0, w + 0.17, 0.16, d + 0.17, '#788482');
    const cols = Math.max(2, Math.floor(w / 0.97));
    for (let y = 1.25; y < h - 0.42; y += 1.4)
      for (let j = 0; j < cols; j++) {
        let xx = ((j - (cols - 1) / 2) * w) / (cols + 0.3);
        B(
          g,
          xx,
          y,
          d / 2 + 0.018,
          0.58,
          0.71,
          0.06,
          (j + seed) % 3 ? '#91adb4' : '#dfc99d',
        );
        B(g, xx, y - 0.39, d / 2 + 0.08, 0.67, 0.075, 0.19, '#a3aaa1');
      }
    if (shop) {
      B(g, 0, 1.26, d / 2 + 0.12, w * 0.88, 0.15, 0.65, '#74978c');
      for (let j = 0; j < 9; j++)
        B(
          g,
          (j - 4) * w * 0.094,
          1.18,
          d / 2 + 0.4,
          w * 0.094,
          0.24,
          0.04,
          j % 2 ? '#e3d9bd' : '#6f9489',
        );
      label(
        g,
        0,
        1.63,
        d / 2 + 0.06,
        w * 0.65,
        0.46,
        shop,
        '#ece8d6',
        '#47665d',
        44,
      );
    }
    if (h > 4) {
      for (let level = 2.25; level < h - 1; level += 1.45) {
        B(g, 0, level, d / 2 + 0.24, w * 0.82, 0.095, 0.44, '#9daca9');
        B(g, 0, level + 0.38, d / 2 + 0.43, w * 0.82, 0.035, 0.035, '#64777b');
        for (let col = 0; col < 8; col++)
          B(
            g,
            (col - 3.5) * w * 0.1,
            level + 0.19,
            d / 2 + 0.43,
            0.022,
            0.38,
            0.023,
            '#788887',
          );
      }
    }
    if (shop) {
      const curtain = group(0, 0.96, d / 2 + 0.33, g);
      for (let j = 0; j < 3; j++)
        B(curtain, (j - 1) * 0.31, 0, 0, 0.295, 0.48, 0.028, '#687d86');
    }
    return g;
  }
  building(-8.0, -1.4, 3.3, 3.8, 3.4, '#d1c8b4', '喫茶 みどり', 1);
  building(-6.4, -12.8, 4.0, 5.4, 3.0, '#c8c2b4', '青葉商店', 2);
  building(-1.6, -13.7, 4.1, 6.9, 3.7, '#b5c3c4', null, 4);
  building(3.35, -13.25, 4.15, 4.5, 3.25, '#cfbda9', 'パン工房', 0);
  building(8.5, -12.8, 4.1, 5.65, 3.1, '#bfc6b8', null, 2);
  building(15.9, -5.65, 3.42, 5.25, 3.4, '#98a4ae', null, 1);
  const windows = [];
  function lamp(x, z) {
    const g = group(x, 0, z);
    C(g, 0, 1.46, 0, 0.058, 2.94, dark);
    B(g, -0.23, 2.92, 0, 0.54, 0.065, 0.065, dark);
    B(g, -0.46, 2.86, 0, 0.41, 0.09, 0.23, '#5f696b');
    const bulb = new T.MeshStandardMaterial({
      color: '#fee3ac',
      emissive: '#ffbc67',
    });
    materials.add(bulb);
    windows.push(bulb);
    B(g, -0.46, 2.805, 0, 0.32, 0.032, 0.17, bulb);
  }
  for (const x of [-6.7, 9.55]) lamp(x, 5.39);
  // A noren, framed calendar and pendant mark the kitchen doorway.
  const noren = group(-1.3, 2.13, -0.5);
  B(noren, 0, 0.12, 0, 1.37, 0.045, 0.05, wood);
  for (let j = 0; j < 3; j++) {
    B(noren, (j - 1) * 0.4, -0.09, 0, 0.38, 0.37, 0.034, '#718a96');
    B(noren, (j - 1) * 0.4, -0.2, 0.02, 0.13, 0.018, 0.007, '#d3dfd1');
  }
  const calendar = group(-0.55, 1.86, -3.85);
  B(calendar, 0, 0, 0, 0.59, 0.74, 0.035, paper);
  label(calendar, 0, 0, 0.026, 0.5, 0.48, '青葉', '#f1e4ca', '#677969', 68);
  const lampLights = [];
  for (const [x, z] of [
    [-4.3, -2.2],
    [2.03, -3.35],
    [-3.65, 1.4],
  ]) {
    const l = new T.PointLight(0xffb76c, 0, 4, 2);
    l.position.set(x, 2.05, z);
    scene.add(l);
    lampLights.push(l);
  }
  const ceilingShade = group(-4.29, 2.12, -2.2);
  C(ceilingShade, 0, 0.18, 0, 0.015, 0.34, dark);
  Taper(ceilingShade, 0, -0.06, 0, 0.1, 0.34, 0.24, '#d3996c');
  // Cotton curtain at the bedroom window, a half-open book and a patterned runner.
  for (const xx of [1.22, 4.4]) {
    const curtain = group(xx, 1.68, -3.73);
    for (let i = 0; i < 4; i++)
      B(
        curtain,
        i * 0.055,
        0,
        0.025 * (i % 2),
        0.065,
        1.43,
        0.045,
        i % 2 ? '#9caaa3' : '#bac5b6',
      );
  }
  B(side, 0.05, 0.54, 0.02, 0.37, 0.035, 0.29, '#8e6354');
  // Bike in a rack outside the shop, on the far side of the walking strip.
  const bike = group(-6.15, 0.07, 4.81);
  bike.rotation.y = 0.4;
  for (const x of [-0.42, 0.42]) {
    const rim = new T.TorusGeometry(0.28, 0.032, 7, 26);
    geometries.add(rim);
    shape(bike, rim, x, 0.29, 0, 1, 1, 1, dark);
  }
  for (const [x, y, len, a] of [
    [-0.2, 0.46, 0.49, -0.77],
    [0.15, 0.47, 0.51, 0.7],
    [0, 0.61, 0.6, 1.52],
    [0.3, 0.64, 0.52, 0.18],
  ]) {
    const bar = B(bike, x, y, 0, 0.052, len, 0.055, '#658e87');
    bar.rotation.z = a;
  }
  B(bike, -0.12, 0.83, 0, 0.22, 0.054, 0.1, wood);
  B(bike, 0.29, 0.88, 0, 0.05, 0.035, 0.25, dark);
  const vendor = station('vendor');
  B(vendor, 0, 0.91, 0, 0.91, 1.79, 0.62, '#ad655a');
  B(vendor, 0, 1.13, 0.324, 0.74, 1.02, 0.04, '#d5e5da');
  for (let j = 0; j < 3; j++)
    for (let k = 0; k < 5; k++) {
      C(
        vendor,
        (k - 2) * 0.128,
        0.86 + j * 0.25,
        0.368,
        0.038,
        0.15,
        ['#b47055', '#759689', '#dbc78c'][k % 3],
      );
    }
  B(vendor, 0, 0.29, 0.335, 0.55, 0.2, 0.05, dark);
  interactive(vendor, 'vendor');
  registerSolids(vendor);
  const sign = station('stroll');
  C(sign, 0, 0.88, 0, 0.035, 1.76, metal);
  label(sign, 0, 1.63, 0, 0.71, 0.26, '青葉通り', '#406e77', '#fff3d7');
  interactive(sign, 'stroll');
  function tree(x, z, s) {
    C(scene, x, 0.86 * s, z, 0.14 * s, 1.8 * s, wood);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      O(
        scene,
        x + Math.cos(a) * 0.46 * s,
        (1.94 + (i % 3) * 0.26) * s,
        z + Math.sin(a) * 0.46 * s,
        0.72 * s,
        0.66 * s,
        0.68 * s,
        ['#85a28c', '#aeb597', '#c6ac9c'][i % 3],
      );
    }
  }
  tree(-6.8, 3.52, 0.86);
  tree(10.1, -2.8, 0.94);
  tree(-3.0, -10.2, 1.1);
  function wire(a, b, color) {
    const pts = [];
    for (let i = 0; i <= 22; i++) {
      const t = i / 22;
      pts.push(
        new T.Vector3(
          a[0] + (b[0] - a[0]) * t,
          a[1] + (b[1] - a[1]) * t - 0.42 * Math.sin(t * Math.PI),
          a[2] + (b[2] - a[2]) * t,
        ),
      );
    }
    const g = new T.BufferGeometry().setFromPoints(pts);
    geometries.add(g);
    const m = new T.LineBasicMaterial({ color });
    materials.add(m);
    scene.add(new T.Line(g, m));
  }
  for (const x of [-9, 10.8]) {
    C(scene, x, 2.85, -5.7, 0.098, 5.7, '#827866');
    B(scene, x, 5.42, -5.7, 0.13, 0.12, 1.2, dark);
  }
  for (const dz of [-0.44, 0, 0.44])
    wire([-9, 5.44, -5.7 + dz], [10.8, 5.44, -5.7 + dz], '#636c6b');
  B(scene, 0, -0.27, -5.88, 11.14, 0.49, 3.86, '#7d8075');
  B(scene, 0, -0.58, 0, 93, 0.15, 78, '#aeb8aa');
  const skyLight = new T.HemisphereLight('#fff3dc', '#c4bdad', 2.1);
  scene.add(skyLight);
  const sun = new T.DirectionalLight('#ffe3bc', 2.55);
  sun.position.set(-5, 13, 8);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -15,
    right: 16,
    top: 13,
    bottom: -13,
    near: 0.5,
    far: 43,
  });
  sun.shadow.normalBias = 0.028;
  sun.shadow.bias = -0.00022;
  scene.add(sun);
  const home = dressHome({
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
  });
  const everyday = household({
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
    station,
    interactive,
    table,
    pot,
    chair,
    materials,
    T,
  });
  const city = makeCity({
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
  });
  // Draw repeated boards, frames and shelf items in batches while keeping their original hit shapes.
  for (const obj of [steam, rice, ...plantGroups.map((p) => p.spr)])
    obj.userData.dynamic = true;
  scene.updateMatrixWorld(true);
  const batches = new Map();
  scene.traverse((o) => {
    if (!o.isMesh) return;
    o.layers.enable(1);
    for (let p = o; p; p = p.parent) if (p.userData.dynamic) return;
    if (!o.material.isMeshStandardMaterial || o.material.transparent) return;
    const k = [
      o.geometry.uuid,
      o.material.uuid,
      o.castShadow,
      o.receiveShadow,
    ].join('/');
    if (!batches.has(k)) batches.set(k, []);
    batches.get(k).push(o);
  });
  // Only four practical lights reach the GPU, independent of the number of fixtures.
  const fixtures = scene.children.filter((o) => o.isPointLight);
  fixtures.forEach((l) => scene.remove(l));
  const practicals = Array.from({ length: 4 }, () => {
    const l = new T.PointLight();
    scene.add(l);
    return l;
  });
  const instances = [];
  for (const items of batches.values()) {
    if (items.length < 3) continue;
    const first = items[0];
    const inst = new T.InstancedMesh(
      first.geometry,
      first.material,
      items.length,
    );
    items.forEach((m, i) => {
      inst.setMatrixAt(i, m.matrixWorld);
      m.layers.set(1);
    });
    inst.castShadow = first.castShadow;
    inst.receiveShadow = first.receiveShadow;
    inst.computeBoundingSphere();
    scene.add(inst);
    instances.push(inst);
  }
  let lastStyle = '',
    lastFrame = -1,
    videoTex = null,
    lastChannel = -1;
  function broadcast(index, t, playing) {
    const g = pen,
      W = 512,
      H = 288;
    if (!playing) {
      g.fillStyle = '#233438';
      g.fillRect(0, 0, W, H);
      g.fillStyle = '#35494a';
      g.beginPath();
      g.moveTo(0, 0);
      g.lineTo(225, 0);
      g.lineTo(0, 210);
      g.fill();
      return;
    }
    const sky = ['#b2dbe2', '#e6c591', '#403b59'][index],
      base = ['#79a68f', '#618e96', '#6e617c'][index];
    g.fillStyle = sky;
    g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffdb97';
    g.beginPath();
    g.arc(366, 78, 31, 0, Math.PI * 2);
    g.fill();
    for (let i = 0; i < 2; i++) {
      g.fillStyle = i === 0 ? base : ['#52796b', '#49727d', '#48475f'][index];
      g.beginPath();
      g.moveTo(0, H);
      for (let x = 0; x <= W; x += 4)
        g.lineTo(
          x,
          150 + i * 47 + 24 * Math.sin((x + t * (i + 1) * 9) / 79 + i * 2),
        );
      g.lineTo(W, H);
      g.fill();
    }
    if (index === 1) {
      const x = ((t * 24) % 700) - 140;
      g.fillStyle = '#f0dfb5';
      g.fillRect(x, 171, 119, 35);
      for (let i = 0; i < 6; i++) {
        g.fillStyle = '#5d8087';
        g.fillRect(x + 7 + i * 18, 177, 13, 12);
      }
    }
    if (index === 2) {
      g.strokeStyle = '#e7b791';
      g.lineWidth = 4;
      g.beginPath();
      for (let x = 0; x < W; x += 3)
        g.lineTo(
          x,
          180 + 17 * Math.sin(x * 0.049 + t * 2) * Math.sin(x * 0.014),
        );
      g.stroke();
    }
    g.fillStyle = 'rgba(30,48,49,.69)';
    g.fillRect(0, 232, W, 56);
    g.fillStyle = '#fff2d8';
    g.font = 'bold 29px sans-serif';
    g.fillText(['街区天气', '海边慢车', '夜间电台'][index], 19, 269);
  }
  return {
    picks,
    solids,
    screen,
    video(source) {
      videoTex?.dispose();
      videoTex = source ? new T.VideoTexture(source) : null;
      if (videoTex) videoTex.colorSpace = T.SRGBColorSpace;
      tvMat.map = videoTex ?? tvTex;
      tvMat.needsUpdate = true;
      lastFrame = -1;
    },
    update(s, now, outside, aim) {
      const hour = new Date(now).getHours(),
        style =
          s.light === 'auto'
            ? hour < 6 || hour >= 19
              ? 'night'
              : hour >= 16
                ? 'dusk'
                : 'day'
            : s.light;
      city.update(s, now, style, outside);
      home.update(style, outside, s.tvOn || phase(s, now) === 'tv');
      everyday.update(s, phase(s, now), style, outside, now);
      if (style !== lastStyle) {
        lastStyle = style;
        const night = style === 'night',
          dusk = style === 'dusk';
        scene.background = new T.Color(
          night ? '#0e192c' : dusk ? '#dac1ae' : '#d0ddd7',
        );
        scene.fog = new T.Fog(scene.background, 29, 59);
        skyLight.intensity = night ? 0.51 : dusk ? 1.18 : 1.74;
        skyLight.groundColor.set(night ? '#4b5263' : '#c4bdad');
        skyLight.color.set(night ? '#97b3ee' : dusk ? '#d7d2da' : '#f8f4e6');
        sun.intensity = night ? 0.54 : dusk ? 1.88 : 2.38;
        sun.color.set(night ? '#9ab9f3' : dusk ? '#ffc09a' : '#ffe5c3');
        windows.forEach(
          (w) => (w.emissiveIntensity = night ? 2.2 : dusk ? 1 : 0.15),
        );
        lampLights.forEach((l) => (l.intensity = night ? 5.5 : dusk ? 2.5 : 0));
      }
      const near = fixtures
        .filter((l) => l.intensity > 0)
        .sort(
          (a, b) =>
            b.intensity / (2 + b.position.distanceToSquared(aim)) -
            a.intensity / (2 + a.position.distanceToSquared(aim)),
        );
      practicals.forEach((l, i) => {
        const v = near[i];
        l.intensity = v?.intensity ?? 0;
        if (v) {
          l.position.copy(v.position);
          l.distance = v.distance;
          l.color.copy(v.color);
        }
      });
      const f = phase(s, now),
        playing = s.tvOn || f === 'tv',
        tick = playing ? Math.floor(now / 250) : 0;
      if (!videoTex && (tick !== lastFrame || lastChannel !== s.channel)) {
        lastFrame = tick;
        lastChannel = s.channel;
        broadcast(s.channel, now / 1000, playing);
        tvTex.needsUpdate = true;
      }
      rice.visible = s.meals > 0;
      steam.visible = f === 'stove';
      steam.position.y = 1.42 + 0.04 * Math.sin(now / 300);
      water.material.color.set(f === 'bath' ? '#7fbaba' : '#8fbec0');
      plantGroups.forEach(({ spr, fruits }, i) => {
        const plant = s.plots[i],
          stage = plantStage(plant, now);
        spr.visible = !!plant;
        if (plant) {
          const k = { dry: 0.19, sprout: 0.42, leaf: 0.8, ripe: 1.1 }[stage];
          spr.scale.set(k, k, k);
          fruits.forEach((m) => {
            m.visible = stage === 'ripe';
            m.material = plain(
              { radish: '#ece1cc', tomato: '#ce6351', pea: '#85a266' }[
                plant.kind
              ],
            );
          });
        }
      });
    },
    dispose() {
      instances.forEach((i) => i.dispose());
      city.dispose();
      sun.shadow.dispose();
      videoTex?.dispose();
      for (const g of geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
