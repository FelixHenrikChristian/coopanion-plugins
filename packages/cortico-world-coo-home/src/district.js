// Four blocks share a single 34 m square plinth. Shopfronts open onto a continuous
// sidewalk or a paved rear lane. The near crossing is also the path used by Coo.
export function buildDistrict({
  B,
  C,
  O,
  scene,
  group,
  label,
  neon,
  flat,
  textile,
  pool,
  materials,
  T,
}) {
  const asphalt = '#323b4b',
    paving = '#89959e',
    edge = '#b0bbc3',
    paint = '#c6c9b9',
    rail = '#738798';
  const roofMetal = textile(
    128,
    128,
    (g, w, H) => {
      g.fillStyle = '#687882';
      g.fillRect(0, 0, w, H);
      for (let x = 0; x < w; x += 20) {
        g.fillStyle = '#809096';
        g.fillRect(x, 0, 2, H);
        g.fillStyle = '#556773';
        g.fillRect(x + 2, 0, 1, H);
      }
    },
    2,
    2,
  );
  const stucco = ['#aea69a', '#a9aaa1', '#a5a8ae', '#a9a39d'].map((col) =>
    textile(
      160,
      160,
      (g, w, H) => {
        g.fillStyle = col;
        g.fillRect(0, 0, w, H);
        for (let y = 0; y < H; y += 32) {
          g.fillStyle = 'rgba(65,66,68,.15)';
          g.fillRect(0, y, w, 1);
          for (let x = y % 64 ? 25 : 0; x < w; x += 50) g.fillRect(x, y, 1, 32);
        }
      },
      2,
      2,
    ),
  );
  const ground = (x, z, w, d, c, y = -0.1, h = 0.16) =>
    B(scene, x, y, z, w, h, d, c);
  ground(8, 3, 34, 34, '#253147', -0.63, 0.95);
  ground(8, 3, 34.04, 34.04, '#48596b', -0.86, 0.075);
  ground(8, 3, 33.99, 33.99, asphalt, -0.15, 0.12);
  function block(a, b, c, d) {
    ground((a + b) / 2, (c + d) / 2, b - a, d - c, paving, -0.085, 0.15);
  }
  block(-9, 10.2, -14, 5.65);
  block(14, 25, -14, 5.65);
  block(-9, 10.2, 9.35, 20);
  block(14, 25, 9.35, 20);
  function stripe(x, z, w, d, col = paint) {
    B(scene, x, -0.064, z, w, 0.009, d, col);
  }
  for (let x = -8.3; x < 25; x += 2.2)
    if (x < 8 || x > 16.6) stripe(x, 7.5, 1.22, 0.064);
  for (let z = -13.4; z < 20; z += 2.25)
    if (z < 3.4 || z > 12) stripe(12.1, z, 0.055, 1.28);
  for (const x of [9.13, 14.96])
    for (let z = 5.95; z <= 9.2; z += 0.42) stripe(x, z, 1.26, 0.2);
  for (const z of [4.72, 10.32])
    for (let x = 10.51; x <= 13.97; x += 0.43) stripe(x, z, 0.21, 1.21);
  for (const x of [7.99, 16.12]) stripe(x, x < 10 ? 6.61 : 8.41, 0.11, 1.5);
  for (const z of [3.69, 11.36]) stripe(z < 6 ? 13.08 : 11.12, z, 1.53, 0.11);
  for (const [a, b] of [
    [-9, 8.35],
    [9.96, 10.18],
    [14.0, 14.23],
    [15.77, 25],
  ])
    for (const z of [5.63, 9.37])
      ground((a + b) / 2, z, b - a, 0.09, edge, -0.043, 0.1);
  for (const x of [10.18, 14.02])
    for (const [a, b] of [
      [-14, 4.02],
      [5.47, 5.62],
      [9.38, 9.6],
      [11.04, 20],
    ])
      ground(x, (a + b) / 2, 0.09, b - a, edge, -0.043, 0.1);
  // Service alley behind both northern corners.
  for (const [a, b] of [
    [-9, 10.2],
    [14, 25],
  ]) {
    ground((a + b) / 2, -10.14, b - a, 1.58, '#596574', -0.01, 0.025);
  }
  for (const x of [-7.1, -0.7, 5.2, 18.2, 23.3]) {
    ground(x, -12.38, 2.25, 1.85, '#999e9d', 0.001, 0.02);
  }
  function shopfront(x, z, w, d, h, turn, name, accent, num) {
    const g = group(x, 0, z);
    g.rotation.y = turn;
    const wall = ['#89959d', '#ae9c91', '#a4ad9d', '#9ba9ae'][num % 4];
    B(g, 0, h / 2, 0, w, h, d, stucco[num % 4]);
    B(g, 0, h + 0.05, 0, w + 0.14, 0.13, d + 0.19, '#515c6a');
    B(g, 0, 0.16, d / 2 + 0.04, w, 0.31, 0.11, '#61717b');
    const front = d / 2 + 0.075;
    const trim = '#465660';
    B(g, -w * 0.26, 1.05, front, 0.78, 2.1, 0.08, trim);
    B(g, -w * 0.26, 1.23, front + 0.046, 0.64, 1.54, 0.018, '#7b928f');
    B(g, -w * 0.26 + 0.23, 1.03, front + 0.067, 0.038, 0.22, 0.038, '#d0cdb6');
    B(g, w * 0.14, 1.11, front, w * 0.48, 1.42, 0.088, trim);
    B(
      g,
      w * 0.14,
      1.11,
      front + 0.057,
      w * 0.45,
      1.31,
      0.026,
      neon(num % 3 ? '#dbb988' : '#9bc4c3', 0.47),
    );
    for (let j = 0; j < 4; j++) {
      const xx = w * 0.14 + (j - 1.5) * w * 0.103;
      B(
        g,
        xx,
        0.76,
        front + 0.085,
        0.22,
        0.24 + (j % 2) * 0.15,
        0.05,
        ['#788878', '#bca17c', '#8d7876', '#738994'][j],
      );
    }
    B(g, w * 0.14, 1.13, front + 0.08, w * 0.46, 0.035, 0.033, trim);
    B(g, 0, 2.05, front + 0.23, w * 0.92, 0.13, 0.55, accent);
    label(
      g,
      0,
      2.38,
      front + 0.09,
      w * 0.79,
      0.42,
      name,
      '#e5d9bd',
      accent,
      50,
    );
    B(g, -w * 0.26, 0.043, front + 0.41, 1.01, 0.08, 0.77, '#b6b2a5');
    for (let level = 3.16; level < h - 0.36; level += 1.22)
      for (let i = 0; i < 3; i++) {
        const xx = (i - 1) * w * 0.279;
        B(g, xx, level, front, 0.65, 0.66, 0.045, trim);
        B(
          g,
          xx,
          level,
          front + 0.029,
          0.56,
          0.58,
          0.026,
          (i + num) % 3 === 1 ? neon('#efc388', 0.58) : '#6e8497',
        );
        B(g, xx, level - 0.37, front + 0.105, 0.77, 0.06, 0.24, edge);
      }
    // Rear balconies and lit service doors face the paved mews, with no blank walls on rotation.
    const rear = group(0, 0, -d / 2 - 0.036, g);
    rear.rotation.y = Math.PI;
    B(rear, -w * 0.22, 0.91, 0, 0.67, 1.82, 0.07, '#657579');
    B(rear, -w * 0.22, 1.34, 0.047, 0.53, 0.61, 0.035, neon('#abafa6', 0.23));
    B(rear, -w * 0.22, 0.05, 0.19, 0.87, 0.09, 0.43, '#adaea3');
    C(rear, w * 0.43, h * 0.5, 0.06, 0.041, h, rail);
    for (let row = 0; row < Math.max(1, Math.floor((h - 1) / 1.35)); row++)
      for (let j = 0; j < 2; j++) {
        const xx = (j - 0.5) * w * 0.4,
          yy = 2.14 + row * 1.25;
        if (yy > h - 0.35) continue;
        B(rear, xx, yy, 0.04, 0.89, 0.67, 0.06, trim);
        B(
          rear,
          xx,
          yy,
          0.081,
          0.79,
          0.56,
          0.037,
          (num + j + row) % 3 !== 1 ? neon('#d9b788', 0.38) : '#637987',
        );
        B(rear, xx, yy, 0.108, 0.028, 0.58, 0.025, rail);
        B(rear, xx, yy - 0.39, 0.13, 1.01, 0.06, 0.3, edge);
      }
    B(rear, w * 0.28, 0.74, 0.21, 0.61, 0.45, 0.36, '#9da9a7');
    for (let j = 0; j < 7; j++)
      B(
        rear,
        w * 0.28 - 0.22 + j * 0.072,
        0.74,
        0.402,
        0.024,
        0.3,
        0.014,
        '#627176',
      );
    for (let j = 0; j < 2; j++) {
      const wing = B(
        g,
        ((j - 0.5) * w) / 2,
        h + 0.26,
        0,
        w * 0.52,
        0.1,
        d + 0.19,
        roofMetal,
      );
      wing.rotation.z = (j ? -1 : 1) * 0.18;
    }
    B(g, 0, h + 0.46, 0, 0.09, 0.09, d + 0.23, rail);
    pool(x, z + Math.cos(turn) * (d / 2 + 0.53), w * 0.82, 2.1, '#e6af76', 0.3);
    if (h > 4) {
      B(g, 0, h - 0.92, front + 0.24, w * 0.85, 0.1, 0.44, edge);
      B(g, 0, h - 0.56, front + 0.45, w * 0.85, 0.045, 0.036, rail);
      for (let i = 0; i < 9; i++)
        B(
          g,
          (i - 4) * w * 0.1,
          h - 0.72,
          front + 0.45,
          0.026,
          0.34,
          0.027,
          rail,
        );
    }
  }
  const pi = Math.PI;
  // North row opens south onto the service alley. South row faces north onto the main road.
  for (const [i, x] of [-6.8, -2.7, 1.4, 5.55, 17.36, 21.95].entries())
    shopfront(
      x,
      -12.64,
      3.58,
      2.52,
      3.9 + (i % 3) * 0.71,
      0,
      ['藍染工房', '小春洋菓子', '小町文庫', '花と葉', '珈琲 結', 'レコード'][
        i
      ],
      ['#426b69', '#97665c', '#5a6b82'][i % 3],
      i,
    );
  for (const [i, x] of [-6.25, -1.8, 2.72, 7.16, 17.12, 21.95].entries())
    shopfront(
      x,
      14.95,
      3.93,
      5.15,
      3.4 + (i % 3) * 0.77,
      pi,
      [
        'こはる食堂',
        '青葉書店',
        '花日和',
        '喫茶 月灯',
        '山本写真館',
        '菓子 ひより',
      ][i],
      ['#805751', '#37655e', '#596981'][i % 3],
      i + 2,
    );
  // Courtyards, an east-side delivery alley and a properly marked parking bay.
  for (const x of [18.0, 20.35, 22.7]) {
    ground(x, -6.6, 2.28, 4.05, '#505a66', 0.001, 0.024);
    for (const dx of [-1.04, 1.04])
      ground(x + dx, -6.6, 0.044, 3.83, paint, 0.019, 0.012);
    ground(x, -8.42, 2.08, 0.046, paint, 0.019, 0.012);
  }
  // A narrow rear lane links the south row's service entrances to the corner sidewalks.
  for (const [a, b] of [
    [-9, 10.2],
    [14, 25],
  ])
    ground((a + b) / 2, 18.28, b - a, 1.24, '#5c6770', 0.012, 0.024);
  const van = group(20.34, 0, -6.74);
  B(van, 0, 0.57, 0, 1.36, 0.84, 2.45, '#8397a0');
  B(van, 0, 1.14, -0.16, 1.34, 0.42, 1.8, '#a9b9bf');
  B(van, 0, 1.2, 0.77, 1.16, 0.36, 0.03, '#334455');
  for (const x of [-0.69, 0.69])
    for (const z of [-0.75, 0.75]) {
      const tyre = C(van, x, 0.27, z, 0.23, 0.1, '#333d44');
      tyre.rotation.z = pi / 2;
    }
  for (const x of [-0.45, 0.45])
    B(van, x, 0.55, 1.24, 0.25, 0.12, 0.028, neon('#ffdb9b', 0.6));
  // Shops are approachable via the apron and side lanes. Lamps, signs and crossing signals share the curb line.
  const signals = [];
  function pole(x, z, rot, signal = false) {
    const g = group(x, 0, z);
    g.rotation.y = rot;
    C(g, 0, 2.1, 0, 0.067, 4.2, '#526276');
    B(g, -0.48, 4.13, 0, 1.04, 0.075, 0.068, rail);
    B(g, -0.95, 4.055, 0, 0.47, 0.105, 0.23, '#48545e');
    B(g, -0.95, 3.987, 0, 0.38, 0.031, 0.18, neon('#ffdda6', 2));
    pool(x, z, 3.4, 4.0, '#a9bdd9', 0.36);
    if (signal) {
      B(g, 0, 2.54, 0.11, 0.31, 0.63, 0.19, '#283646');
      for (const [y, c] of [
        [2.69, '#e88872'],
        [2.41, '#a4d7b3'],
      ]) {
        const m = neon(c, 0.78);
        signals.push(m);
        O(g, 0, y, 0.219, 0.093, 0.09, 0.024, m);
      }
    }
  }
  for (const [x, z, r, s] of [
    [9.97, 3.46, 0, 1],
    [15.99, 5.51, 0, 1],
    [9.96, 11.3, pi, 1],
    [15.84, 9.58, pi, 1],
    [-6.3, 5.44, pi / 2, 0],
    [23.85, 9.56, pi, 0],
    [14.18, -9.02, -pi / 2, 0],
    [9.9, 18.84, pi, 0],
  ])
    pole(x, z, r, !!s);
  function fence(x, z, n, rot) {
    const g = group(x, 0, z);
    g.rotation.y = rot;
    for (let i = 0; i <= n; i++) C(g, i * 0.7, 0.29, 0, 0.035, 0.55, '#abb9b8');
    for (const y of [0.23, 0.43])
      B(g, n * 0.35, y, 0, n * 0.7, 0.045, 0.041, '#a8b8bd');
  }
  fence(3.95, 5.49, 5, 0);
  fence(17.08, 5.48, 6, 0);
  fence(-3.15, 9.51, 8, 0);
  fence(14.14, -5.9, 6, pi / 2);
  for (const x of [-6.3, -1.5, 5.4, 16.8, 22.5])
    for (const z of [5.49, 9.51]) {
      ground(x, z, 0.54, 0.22, '#303d47', 0.011, 0.02);
      for (let i = 0; i < 6; i++)
        ground(x - 0.21 + i * 0.081, z, 0.025, 0.19, '#879290', 0.025, 0.012);
    }
  // Low opaque boundary, timber slats, and shrubs visually attach the vegetable patch to the home.
  for (const z of [-3.4, -2.0, -0.6, 0.8, 2.2, 3.52]) {
    B(scene, 8.98, 0.99, z, 0.135, 0.76, 0.13, '#806f59');
  }
  for (const y of [0.87, 1.1])
    B(scene, 8.98, y, 0.03, 0.087, 0.12, 7.43, '#9d8565');
  for (const x of [5.89, 6.85, 7.8, 8.71]) {
    B(scene, x, 0.33, 3.63, 0.83, 0.61, 0.3, '#918b76');
    O(scene, x, 0.75, 3.63, 0.43, 0.23, 0.18, '#6b8569');
  }
  // Store-side bicycle parking, a bench, a planter and neighborhood notice board.
  // Slim LED shop signs, umbrella sleeves, parked bicycles and a public litter station.
  for (const [i, x] of [
    [0, 18.39],
    [1, 19.45],
    [2, 20.89],
  ]) {
    const stand = group(x, 0, -3.96);
    stand.rotation.y = 0.28;
    for (const xx of [-0.4, 0.4]) {
      const hoop = O(stand, xx, 0.29, 0, 0.24, 0.245, 0.036, '#45555d');
      O(stand, xx, 0.29, 0.01, 0.177, 0.177, 0.037, '#91a1a5');
    }
    const down = B(stand, -0.18, 0.47, 0, 0.043, 0.49, 0.05, '#8c9d8d');
    down.rotation.z = 0.79;
    const up = B(stand, 0.17, 0.48, 0, 0.047, 0.49, 0.049, '#8c9d8d');
    up.rotation.z = -0.68;
    B(stand, 0, 0.64, 0, 0.57, 0.046, 0.047, '#839991');
    B(stand, -0.18, 0.77, 0, 0.22, 0.044, 0.11, '#554d47');
    B(stand, 0.31, 0.79, 0, 0.058, 0.035, 0.23, rail);
  }
  const bench = group(6.75, 0, 10.88);
  for (const y of [0.4, 0.78])
    B(
      bench,
      0,
      y,
      y > 0.5 ? 0.2 : 0,
      1.38,
      0.1,
      y > 0.5 ? 0.1 : 0.46,
      '#a88866',
    );
  for (const x of [-0.53, 0.53]) B(bench, x, 0.2, 0, 0.09, 0.39, 0.38, rail);
  const board = group(15.13, 0, 2.9);
  for (const x of [-0.39, 0.39]) B(board, x, 0.78, 0, 0.057, 1.53, 0.059, rail);
  B(board, 0, 1.22, 0, 0.91, 0.58, 0.08, '#605b50');
  label(
    board,
    0,
    1.25,
    0.052,
    0.79,
    0.44,
    '町内のお知らせ',
    '#cec4a3',
    '#516364',
    39,
  );
  return { signals };
}
