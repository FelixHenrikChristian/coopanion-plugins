import { furniture } from './layout.js';

export function household(h) {
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
    station,
    interactive,
    table,
    pot,
    chair,
    materials,
    T,
  } = h;
  const oak = '#a07f60',
    walnut = '#705747',
    ivory = '#e5deca',
    ink = '#414548',
    teal = '#788e89';
  const glow = (c, i) => {
    const m = new T.MeshStandardMaterial({
      color: c,
      emissive: c,
      emissiveIntensity: i,
    });
    materials.add(m);
    return m;
  };
  function cabinet(g, x, z, w, d, hgt) {
    B(g, x, hgt / 2, z, w, hgt, d, oak);
    for (const sign of [-1, 1]) {
      B(
        g,
        x + sign * w * 0.24,
        hgt * 0.51,
        z + d * 0.506,
        w * 0.45,
        hgt * 0.86,
        0.042,
        '#b29a7a',
      );
      B(g, x + sign * 0.08, hgt * 0.55, z + d * 0.56, 0.031, 0.135, 0.035, ink);
    }
    B(g, x, hgt + 0.04, z, w + 0.08, 0.08, d + 0.06, walnut);
  }
  function books(g, x, y, z, n, unit = 0.1) {
    for (let i = 0; i < n; i++) {
      const height = 0.26 + ((i * 13) % 7) * 0.035;
      const xx = x + i * unit,
        c = ['#8b9f93', '#b9806e', '#d7be8b', '#536b7b', '#ab9e90', '#8c8583'][
          i % 6
        ];
      B(g, xx, y + height / 2, z, unit * 0.81, height, 0.25, c);
      B(g, xx, y + height * 0.73, z + 0.129, unit * 0.59, 0.023, 0.008, ivory);
    }
  }
  const entry = station('shoes');
  entry.rotation.y = -Math.PI / 2;
  cabinet(entry, 0, 0, 0.85, 0.48, 0.79);
  B(entry, 0.06, 1.47, -0.1, 0.61, 0.89, 0.046, walnut);
  B(entry, 0.06, 1.47, -0.066, 0.53, 0.8, 0.024, '#a9b8b9');
  C(entry, -0.3, 0.88, 0.06, 0.075, 0.04, '#a8a08a');
  B(entry, -0.29, 0.913, 0.06, 0.082, 0.014, 0.03, ink);
  const slippers = group(-1.17, 0.033, 3.32);
  for (const x of [-0.105, 0.105])
    O(slippers, x, 0.045, 0, 0.085, 0.056, 0.172, '#a49a7c');
  slippers.userData.dynamic = true;
  const umbrella = group(-0.3, 0, 2.62);
  C(umbrella, 0, 0.19, 0, 0.106, 0.36, '#546663');
  for (const sign of [-1, 1]) {
    const stick = C(umbrella, sign * 0.048, 0.47, 0, 0.012, 0.63, walnut);
    stick.rotation.z = sign * 0.09;
    Taper(
      umbrella,
      sign * 0.07,
      0.39,
      0,
      0.038,
      0.077,
      0.42,
      sign === 1 ? '#667e91' : '#9f7f72',
    );
  }
  interactive(entry, 'shoes');
  interactive(slippers, 'shoes');
  interactive(umbrella, 'shoes');
  const desk = station('desk');
  table(desk, 1.98, 0.77, 0.76);
  B(desk, 0.65, 0.44, 0, 0.46, 0.57, 0.6, oak);
  for (let i = 0; i < 2; i++) {
    B(desk, 0.65, 0.28 + i * 0.23, 0.31, 0.4, 0.2, 0.024, '#b7997a');
    B(desk, 0.65, 0.3 + i * 0.23, 0.34, 0.11, 0.023, 0.023, ink);
  }
  const monitor = group(-0.18, 0.81, -0.18, desk);
  B(monitor, 0, 0.02, 0, 0.42, 0.041, 0.28, ink);
  B(monitor, 0, 0.19, 0, 0.056, 0.35, 0.05, ink);
  B(monitor, 0, 0.46, 0, 0.84, 0.49, 0.052, ink);
  const screen = textile(
    320,
    182,
    (g, w, H) => {
      const bg = g.createLinearGradient(0, 0, w, H);
      bg.addColorStop(0, '#527585');
      bg.addColorStop(1, '#314456');
      g.fillStyle = bg;
      g.fillRect(0, 0, w, H);
      g.fillStyle = '#d0ddce';
      g.fillRect(59, 22, 200, 140);
      g.fillStyle = '#92a697';
      for (let i = 0; i < 8; i++)
        g.fillRect(76, 42 + i * 12, i % 3 === 0 ? 111 : 148, 3);
    },
    1,
    1,
    true,
  );
  face(monitor, 0, 0.46, 0.028, 0.77, 0.423, screen);
  B(desk, -0.15, 0.84, 0.15, 0.45, 0.025, 0.16, '#a0a7a1');
  books(desk, 0.48, 0.8, -0.18, 3);
  const note = group(-0.69, 0.84, 0.14, desk);
  note.rotation.y = 0.14;
  B(note, 0, 0, 0, 0.31, 0.026, 0.23, ivory);
  const pencil = B(note, 0.05, 0.024, 0.03, 0.22, 0.012, 0.013, walnut);
  pencil.rotation.y = 0.4;
  chair(desk, -0.13, 0.69);
  interactive(desk, 'desk');
  const shelf = station('shelf');
  B(shelf, 0, 0.82, -0.03, 1.71, 1.66, 0.12, '#88755e');
  for (const x of [-0.84, 0.84])
    B(shelf, x, 0.84, 0.13, 0.07, 1.72, 0.42, walnut);
  for (let j = 0; j < 4; j++) {
    B(shelf, 0, 0.09 + j * 0.52, 0.13, 1.74, 0.065, 0.44, oak);
    if (j < 3) books(shelf, -0.73, 0.134 + j * 0.52, 0.18, 13 - j * 2);
  }
  pot(shelf, 0.45, 1.72, 0.12, 0.49);
  interactive(shelf, 'shelf');
  const tea = station('tea');
  cabinet(tea, 0, 0, 0.94, 0.55, 0.69);
  O(tea, -0.15, 0.84, 0.06, 0.135, 0.13, 0.12, '#b79678');
  C(tea, -0.15, 0.961, 0.06, 0.079, 0.027, walnut);
  Taper(tea, 0.01, 0.87, 0.06, 0.06, 0.042, 0.14, '#a6886b', 12).rotation.z =
    -0.8;
  for (const x of [0.22, 0.35]) {
    C(tea, x, 0.79, 0.04, 0.05, 0.085, '#b5c3b3');
    C(tea, x, 0.835, 0.04, 0.04, 0.003, '#6c7454');
  }
  interactive(tea, 'tea');
  // Sideboard, linen runner, wall clock and a dim pendant give the dining room its own centre.
  const buffet = group(-1.08, 0, -7.19);
  cabinet(buffet, 0, 0, 1.68, 0.49, 0.7);
  pot(buffet, 0.51, 0.78, 0, 0.47);
  for (let i = 0; i < 3; i++)
    C(buffet, -0.49, 0.78 + i * 0.025, 0.04, 0.17, 0.02, ivory);
  const clock = group(-3.68, 1.91, -7.64);
  C(clock, 0, 0, 0, 0.24, 0.069, walnut).rotation.x = Math.PI / 2;
  C(clock, 0, 0, 0.044, 0.205, 0.021, ivory).rotation.x = Math.PI / 2;
  B(clock, 0.041, 0.043, 0.063, 0.012, 0.12, 0.01, ink).rotation.z = -0.62;
  const linen = B(scene, -3.58, 0.793, -5.85, 0.3, 0.016, 0.79, teal);
  interactive(linen, 'table');
  const pendant = group(-3.58, 2.02, -5.85);
  C(pendant, 0, 0.24, 0, 0.014, 0.57, ink);
  Taper(pendant, 0, -0.1, 0, 0.15, 0.31, 0.2, '#aa8664');
  C(pendant, 0, -0.206, 0, 0.27, 0.018, glow('#f4d7a0', 1.2));
  // Washroom and toilet. The small screen leaves the doorway and the bath approach free.
  const washer = station('washer');
  B(washer, 0, 0.49, 0, 0.82, 0.94, 0.66, '#bccbc3');
  B(washer, 0, 0.91, 0.338, 0.75, 0.14, 0.045, '#8c9e9d');
  const drum = C(washer, 0, 0.46, 0.35, 0.252, 0.065, '#849397');
  drum.rotation.x = Math.PI / 2;
  const glass = C(washer, 0, 0.46, 0.392, 0.205, 0.03, '#526a72');
  glass.rotation.x = Math.PI / 2;
  const drumLine = B(washer, 0, 0.46, 0.414, 0.21, 0.033, 0.015, '#a6b9ba');
  drumLine.userData.dynamic = true;
  C(washer, 0.25, 0.91, 0.375, 0.039, 0.025, ivory).rotation.x = Math.PI / 2;
  B(washer, -0.13, 0.91, 0.37, 0.24, 0.061, 0.022, '#45605d');
  interactive(washer, 'washer');
  const basket = group(0.66, 0, 2.57);
  Taper(basket, 0, 0.21, 0, 0.22, 0.17, 0.37, '#b8aa8e');
  for (let i = 0; i < 3; i++)
    B(
      basket,
      0,
      0.33 + i * 0.042,
      0,
      0.3,
      0.055,
      0.28,
      i === 1 ? '#a8b9b4' : ivory,
    );
  const wc = group(4.9, 0, 1.05);
  B(wc, 0, 0.32, -0.13, 0.4, 0.59, 0.21, '#d1dbd1');
  O(wc, 0, 0.3, 0.11, 0.25, 0.19, 0.31, ivory);
  O(wc, 0, 0.42, 0.13, 0.22, 0.043, 0.26, '#dce4da');
  B(wc, 0, 0.72, -0.16, 0.44, 0.32, 0.21, '#d9dfd3');
  const rack = station('rack');
  for (const x of [-0.7, 0.7]) {
    C(rack, x, 0.81, 0, 0.025, 1.55, '#8c9a9c');
    B(rack, x, 0.08, 0, 0.13, 0.09, 0.38, '#778987');
  }
  B(rack, 0, 1.57, 0, 1.56, 0.038, 0.041, '#92a1a2');
  const cloth = group(0, 1.24, 0, rack);
  cloth.userData.dynamic = true;
  for (const x of [-0.37, 0.21]) {
    B(cloth, x, 0, 0, 0.4, 0.57, 0.034, x < 0 ? ivory : '#92a8ab');
    B(cloth, x - 0.1, 0.285, 0.008, 0.029, 0.08, 0.04, '#a98153');
    B(cloth, x + 0.1, 0.285, 0.008, 0.029, 0.08, 0.04, '#a98153');
  }
  interactive(rack, 'rack');
  // Bedroom storage and a writing light, plus a kitchen sink, chopping board and dish rack.
  const closet = group(0.96, 0, -3.3);
  cabinet(closet, 0, 0, 0.95, 0.65, 1.73);
  const prep = group(-3.76, 0, -3.41);
  cabinet(prep, 0, 0, 0.83, 0.69, 0.91);
  B(prep, 0, 0.976, 0, 0.66, 0.043, 0.46, '#9faeaa');
  B(prep, 0, 0.999, 0.035, 0.49, 0.012, 0.31, '#6f8387');
  C(prep, 0.21, 1.13, -0.18, 0.023, 0.26, '#a9b4b4');
  B(prep, 0.16, 1.26, -0.13, 0.13, 0.034, 0.1, '#a9b4b4');
  for (let j = 0; j < 3; j++)
    C(prep, -0.3, 1.07, -0.14 + j * 0.071, 0.089, 0.015, ivory).rotation.x =
      1.17;
  // Shelf labels on the existing shop window are independent world targets.
  const seeds = station('seeds');
  label(seeds, 0, 1.44, 0.073, 0.36, 0.33, '種', '#798d64', '#fff2ce', 80);
  interactive(seeds, 'seeds');
  const sell = station('sell');
  label(sell, 0, 0.96, 0.1, 0.52, 0.21, '青果受付', '#a48761', '#fff2ce', 60);
  interactive(sell, 'sell');
  const lights = [];
  for (const [x, y, z, k] of [
    [-3.58, 1.76, -5.85, 5.8],
    [3.55, 1.48, -7.08, 4.9],
    [1.4, 1.6, -6.1, 2.4],
    [-1.1, 1.35, 3.19, 2.5],
  ]) {
    const l = new T.PointLight(0xffdaa0, k, 4.5, 2);
    l.position.set(x, y, z);
    scene.add(l);
    lights.push([l, k]);
  }
  return {
    update(s, phase, style, exterior, now) {
      slippers.visible = !s.slippers;
      cloth.visible = s.laundry === '已晾';
      if (phase === 'washer') drumLine.rotation.z = now / 365;
      for (const [l, k] of lights)
        l.intensity = exterior ? 0 : k * (style === 'day' ? 0.18 : 1);
    },
  };
}
