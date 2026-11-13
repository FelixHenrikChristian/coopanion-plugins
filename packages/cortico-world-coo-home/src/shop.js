import * as T from 'three';
import { position } from './life.js';

// Four independently batched construction layers share shop-local coordinates.
export function buildStore(h, logo) {
  const {
    B,
    C,
    O,
    group,
    face,
    flat,
    interactive,
    textile,
    label,
    materials,
    neon,
  } = h;
  const layers = ['plinth', 'walls', 'stock', 'roof'].map((id) => {
    const g = group(19.35, 0, 0.45);
    g.name = 'shop-' + id;
    g.userData.assembly = id;
    return g;
  });
  const [base, shell, stock, roof] = layers;
  const brass = '#b2a483',
    silver = '#aeb9b9',
    dark = '#3d4e54',
    paper = '#e6ddbd',
    trim = '#597d71';
  const wall = textile(
    256,
    256,
    (g, w, H) => {
      g.fillStyle = '#a6aca5';
      g.fillRect(0, 0, w, H);
      g.lineWidth = 1;
      g.strokeStyle = '#8f9997';
      for (let y = 0; y < H; y += 48) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(w, y);
        g.stroke();
        for (let x = 0; x < w; x += 86)
          g.strokeRect(x + (y % 96 ? 43 : 0), y, 86, 48);
      }
    },
    2,
    2,
  );
  const tile = textile(
    128,
    128,
    (g, w, H) => {
      g.fillStyle = '#d3cdbc';
      g.fillRect(0, 0, w, H);
      g.strokeStyle = '#b6ae9c';
      g.strokeRect(0.5, 0.5, 127, 127);
    },
    12,
    10,
  );
  const led = neon('#fff2ca', 1.6),
    glass = new T.MeshPhysicalMaterial({
      color: '#b8deda',
      transparent: true,
      opacity: 0.075,
      roughness: 0.19,
      side: T.DoubleSide,
      depthWrite: false,
    });
  materials.add(glass);
  B(base, 0, -0.06, 0, 7.8, 0.15, 6.88, '#616d73');
  flat(base, 0, 0.022, 0, 7.59, 6.68, tile);
  B(shell, 0, 1.41, -3.37, 7.77, 2.82, 0.14, wall);
  for (const x of [-3.8, 3.8]) {
    B(shell, x, 0.25, 0, 0.14, 0.5, 6.76, wall);
    B(shell, x, 2.63, 0, 0.15, 0.37, 6.76, wall);
    for (const z of [-3.31, -1.2, 0.96, 3.31])
      B(shell, x, 1.5, z, 0.16, 2.29, 0.09, dark);
    for (const z of [-2.26, -0.12, 2.14])
      B(shell, x, 1.48, z, 0.025, 1.92, 2.02, glass);
  }
  for (const sign of [-1, 1]) {
    const x = sign * 2.34;
    B(shell, x, 0.22, 3.35, 2.91, 0.42, 0.13, wall);
    face(shell, x, 1.43, 3.36, 2.85, 1.96, glass);
    B(shell, x, 0.46, 3.4, 2.9, 0.039, 0.055, trim);
    for (const xx of [0.86, 2.31, 3.75])
      B(shell, sign * xx, 1.43, 3.36, 0.066, 2.83, 0.12, dark);
    B(shell, x, 2.46, 3.36, 2.91, 0.066, 0.095, dark);
  }

  const doors = [-1, 1].map((sign) => {
    const leaf = group(sign * 0.43, 0, 3.37, shell);
    leaf.userData.dynamic = true;
    face(leaf, 0, 1.26, 0, 0.855, 2.47, glass);
    for (const x of [-0.413, 0.413])
      B(leaf, x, 1.25, 0.018, 0.031, 2.5, 0.059, silver);
    for (const y of [0.1, 1.24, 2.45])
      B(leaf, 0, y, 0.018, 0.85, 0.033, 0.055, y === 1.24 ? trim : silver);
    return leaf;
  });
  flat(
    base,
    0,
    0.028,
    3.91,
    1.64,
    0.75,
    textile(128, 32, (g, w, H) => {
      g.fillStyle = '#424e50';
      g.fillRect(0, 0, w, H);
      g.strokeStyle = '#677270';
      for (let x = 0; x < w; x += 4) {
        g.beginPath();
        g.moveTo(x, 0);
        g.lineTo(x, H);
        g.stroke();
      }
    }),
  );
  // Fascia stays visible when the roof is cut away. Lettering is original.
  B(shell, 0, 2.77, 3.45, 7.84, 0.49, 0.37, trim);
  face(shell, 0, 2.79, 3.645, 7.58, 0.38, logo);
  B(shell, 0, 2.5, 3.68, 7.98, 0.1, 0.7, '#5c776c');
  B(shell, 0, 2.44, 3.96, 7.7, 0.028, 0.052, led);
  B(roof, 0, 2.95, 0, 7.97, 0.13, 6.99, '#59686d');
  for (const x of [-3.85, 3.85])
    B(roof, x, 3.05, 0, 0.13, 0.15, 6.89, '#879491');
  for (const z of [-3.42, 3.42])
    B(roof, 0, 3.05, z, 7.77, 0.15, 0.11, '#89938a');
  for (let i = 0; i < 2; i++) {
    const ac = group(-2.78 + i * 0.94, 3.1, -2.32, roof);
    B(ac, 0, 0.26, 0, 0.78, 0.5, 0.58, '#aab2ae');
    for (let ix = 0; ix < 9; ix++)
      B(ac, -0.28 + ix * 0.068, 0.25, 0.303, 0.027, 0.34, 0.018, '#687879');
  }
  // Merchandise just inside the display windows gives the street view depth at eye level.
  for (const side of [-1, 1]) {
    const table = group(side * 2.08, 0, 2.56, stock);
    B(table, 0, 0.32, 0, 1.27, 0.64, 0.44, '#b79771');
    B(table, 0, 0.68, 0, 1.34, 0.056, 0.52, '#e4cfaa');
    for (let j = 0; j < 5; j++)
      for (let k = 0; k < 2; k++) {
        const x = (j - 2) * 0.22,
          z = (k - 0.5) * 0.19,
          y = 0.79 + k * 0.045;
        B(
          table,
          x,
          y,
          z,
          0.178,
          0.18 + k * 0.06,
          0.145,
          ['#bb7258', '#bc9a51', '#758c69', '#e6c79c', '#75979c'][(j + k) % 5],
        );
        B(table, x, y, z + 0.074, 0.13, 0.07, 0.007, '#f6dfac');
      }
    label(
      table,
      0,
      0.44,
      0.229,
      0.67,
      0.16,
      side < 0 ? '旬 の 菓子' : '新 発 売',
      '#f0d7a5',
      '#775341',
      57,
    );
  }
  const poster = group(-2.95, 1.72, 3.43, shell);
  label(poster, 0, 0, 0, 0.42, 0.57, 'おでん', '#ba6748', '#fff1ce', 75);
  // Tall projecting shop light, canopy frame, umbrella stand and separated bins.
  const flag = group(3.91, 1.85, 2.58, shell);
  B(flag, 0, 0, 0, 0.46, 1.68, 0.22, trim);
  for (let j = 0; j < 3; j++)
    label(
      flag,
      0,
      0.48 - j * 0.46,
      0.121,
      0.39,
      0.43,
      ['月', '見', '店'][j],
      '#f3e3b5',
      '#45665b',
      74,
    );
  const bin = group(-3.35, 0, 3.72, base);
  for (let i = 0; i < 2; i++) {
    B(bin, i * 0.32, 0.31, 0, 0.29, 0.59, 0.36, i ? '#6d8582' : '#758fa1');
    B(bin, i * 0.32, 0.63, -0.01, 0.3, 0.05, 0.37, paper);
    B(bin, i * 0.32, 0.664, 0.03, 0.14, 0.015, 0.125, trim);
  }
  const stand = group(1.15, 0, 3.67, base);
  C(stand, 0, 0.22, 0, 0.155, 0.4, '#5e7777');
  for (let j = 0; j < 3; j++) {
    const a = group((j - 1) * 0.074, 0, 0, stand);
    a.rotation.z = (j - 1) * 0.12;
    C(a, 0, 0.49, 0, 0.023, 0.62, '#a98b65');
    O(a, 0, 0.43, 0, 0.06, 0.22, 0.056, j % 2 ? '#8e7786' : '#879fa6');
  }
  const palette = [
    '#d08a65',
    '#86a68c',
    '#c5a058',
    '#a67077',
    '#769da6',
    '#d4c9a3',
    '#787eab',
    '#c47657',
  ];
  const wrapper = palette.map((col, i) =>
    textile(128, 96, (g, w, H) => {
      g.fillStyle = col;
      g.fillRect(0, 0, w, H);
      g.fillStyle = '#eae1ca';
      g.fillRect(0, 5, w, 5);
      g.fillRect(8, 30, 112, 39);
      g.fillStyle = col;
      g.beginPath();
      g.arc(33, 49, 11 + (i % 3), 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#565a59';
      g.fillRect(53, 41, 51, 4);
      g.fillRect(53, 51, 33, 2);
      g.fillStyle = '#dfceae';
      for (let j = 0; j < 7; j++) g.fillRect(12 + j * 7, 79, 4, 4);
    }),
  );
  // Gondolas with two stocked sides, shelf-edge tickets, end caps and individually modelled goods.
  function gondola(x, z, kind, target) {
    const g = group(x, 0, z, stock);
    B(g, 0, 0.16, 0, 0.76, 0.3, 1.61, '#9eaa9c');
    B(g, 0, 0.86, 0, 0.055, 1.48, 1.61, '#c1c4b2');
    for (let level = 0; level < 3; level++) {
      const y = 0.33 + level * 0.46;
      B(g, 0, y, 0, 0.76, 0.04, 1.61, ivory);
      for (const side of [-1, 1]) {
        B(g, side * 0.38, y + 0.016, 0, 0.026, 0.063, 1.61, '#b39a68');
        for (let j = 0; j < 7; j++) {
          const zz = -0.68 + j * 0.219,
            col = (j + 2 * level + kind) % 8,
            xx = side * 0.212;
          if ((kind + level) % 2 === 0) {
            C(g, xx, y + 0.17, zz, 0.08, 0.29, wrapper[col]);
            C(g, xx, y + 0.326, zz, 0.044, 0.039, trim);
          } else B(g, xx, y + 0.17, zz, 0.23, 0.29, 0.158, wrapper[col]);
          if (j % 2 === 0)
            B(g, side * 0.398, y + 0.014, zz, 0.008, 0.037, 0.094, paper);
        }
      }
    }
    for (const side of [-1, 1])
      B(g, 0, 0.78, side * 0.82, 0.76, 1.43, 0.036, trim);
    label(
      g,
      0,
      1.39,
      0.85,
      0.63,
      0.2,
      kind ? '種 と 園芸' : 'おやつ',
      kind ? '#739075' : '#ae7d55',
      '#fff2cd',
      54,
    );
    interactive(g, target);
  }
  const ivory = '#d5d1bd';
  gondola(-1.72, -0.66, 0, 'market');
  gondola(1.75, -0.66, 1, 'seeds');
  // A full wall of chilled cabinets, luminous shelf backs and cold drinks, with handles in front.
  for (let bay = 0; bay < 5; bay++) {
    const x = -2.84 + bay * 1.37,
      g = group(x, 0, -2.96, stock);
    B(g, 0, 1.04, -0.05, 1.31, 2.03, 0.48, '#667a76');
    B(g, 0, 1.11, 0.215, 1.19, 1.59, 0.034, neon('#b7d1ba', 0.48));
    for (let l = 0; l < 3; l++) {
      const y = 0.41 + l * 0.42;
      B(g, 0, y, 0.29, 1.19, 0.036, 0.29, '#c7caaf');
      for (let j = 0; j < 6; j++) {
        const xx = (j - 2.5) * 0.179,
          c = wrapper[(bay + l + j) % 8];
        if (bay < 2) {
          B(g, xx, y + 0.083, 0.32, 0.149, 0.112, 0.22, c);
          B(g, xx, y + 0.15, 0.32, 0.151, 0.021, 0.224, '#e7d9b4');
        } else {
          C(g, xx, y + 0.145, 0.32, 0.06, 0.23, c);
          C(g, xx, y + 0.27, 0.32, 0.038, 0.04, paper);
        }
      }
    }
    face(g, 0, 1.09, 0.49, 1.22, 1.61, glass);
    B(g, -0.57, 1.13, 0.512, 0.03, 0.35, 0.046, silver);
    label(
      g,
      0,
      1.95,
      0.22,
      1.13,
      0.19,
      ['お弁当', 'おにぎり', 'お茶', 'ミルク', '果汁'][bay],
      '#dbead5',
      '#476767',
      52,
    );
    interactive(g, 'market');
  }
  // Checkout with scanner, touchscreen, till, basket stack and hot-food stainless display.
  const till = group(-2.95, 0, 1.12, stock);
  B(till, 0, 0.49, 0, 1.03, 0.97, 1.88, '#947960');
  B(till, 0, 1.01, 0, 1.11, 0.1, 1.99, '#d2cab0');
  for (let i = 0; i < 8; i++)
    B(till, 0.523, 0.46, -0.78 + i * 0.217, 0.016, 0.75, 0.036, '#b69871');
  B(till, 0, 1.21, 0.18, 0.37, 0.3, 0.17, dark);
  face(till, 0, 1.21, 0.27, 0.29, 0.2, neon('#a6c4b3', 0.45));
  B(till, 0.18, 1.09, 0.52, 0.22, 0.055, 0.23, '#6f797a');
  B(till, 0, 1.16, -0.46, 0.67, 0.12, 0.52, silver);
  for (const x of [-0.3, 0.3])
    B(till, x, 1.37, -0.46, 0.022, 0.38, 0.52, glass);
  B(till, 0, 1.575, -0.46, 0.67, 0.033, 0.52, ivory);
  for (let i = 0; i < 5; i++)
    O(
      till,
      ((i % 3) - 0.9) * 0.17,
      1.25,
      -0.47 + Math.floor(i / 3) * 0.16,
      0.087,
      0.061,
      0.074,
      '#dca05e',
    );
  interactive(till, 'sell');
  for (let i = 0; i < 5; i++)
    B(
      stock,
      2.9,
      0.14 + i * 0.077,
      2.25,
      0.5,
      0.155,
      0.36,
      i % 2 ? '#769a90' : '#547a78',
    );
  // Fluorescent strips hang clear of the gondolas. These lights use the shared light budget.
  for (const x of [-2.65, -0.83, 1.1, 2.97])
    B(roof, x, 2.83, -0.03, 0.12, 0.034, 4.7, led);
  h.registerSolids(roof);
  let start = null,
    opened = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  return {
    layers,
    update(s, now, aim, half) {
      if (start === null && (aim.x > 8.8 || half > 7)) start = now;
      const elapsed = reduced || start === null ? 10 : (now - start) / 1000;
      layers.forEach((g, i) => {
        const q = T.MathUtils.clamp((elapsed - i * 0.31) / 0.68, 0, 1),
          e = q * q * (3 - 2 * q);
        g.scale.y = 0.002 + 0.998 * e;
        g.position.y = (1 - e) * (0.12 + i * 0.19);
      });
      const [x, z] = position(s, now);
      const near = Math.hypot(x - 19.35, z - 3.8) < 1.5;
      opened = T.MathUtils.lerp(opened, near ? 1 : 0, 0.22);
      doors.forEach(
        (d, i) => (d.position.x = (i ? 1 : -1) * (0.43 + 0.86 * opened)),
      );
      // Inspect from above or pan through the entrance; roof lifts out of the line of sight.
      const interior =
        aim.x > 15.38 &&
        aim.x < 23.4 &&
        aim.z > -3.2 &&
        aim.z < 3.99 &&
        half < 5.7;
      roof.visible = !interior;
      shell.userData.inside = interior;
      return elapsed < 1.75;
    },
  };
}
