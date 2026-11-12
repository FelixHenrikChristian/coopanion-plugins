// All geometry and navigation use the same X/Z floor plan in metres.
export const rooms = {
  living: { name: '客厅', center: [-2.6, 1.7], size: 5.5 },
  kitchen: { name: '厨房', center: [-2.55, -2.1], size: 5.1 },
  bedroom: { name: '卧室', center: [2.8, -1.75], size: 5.1 },
  bath: { name: '浴室', center: [4.12, 2.16], size: 3.85 },
  utility: { name: '洗面洗衣室', center: [1.57, 2.13], size: 3.7 },
  entry: { name: '玄关与过道', center: [-1.18, 2.61], size: 4.3 },
  dining: { name: '餐厅', center: [-2.55, -5.86], size: 5.25 },
  study: { name: '书房', center: [2.82, -5.86], size: 5.1 },
  balcony: { name: '阳台', center: [7.12, 2.5], size: 4.7 },
  garden: { name: '菜园', center: [7.25, -0.35], size: 5.3 },
  street: { name: '街口', center: [11.65, 3.45], size: 7.3 },
};
export const floors = [
  ['entry', -1.94, 0.3, 2.55, 3.8],
  ['utility', 0.3, 2.48, 0.6, 3.8],
  ['balcony', 5.5, 9, 1.14, 3.8],
  ['dining', -5.5, 0.3, -7.76, -3.95],
  ['study', 0.3, 5.5, -7.76, -3.95],
  ['living', -5.5, 0.3, -0.5, 3.8],
  ['kitchen', -5.5, 0.3, -3.95, -0.5],
  ['bedroom', 0.3, 5.5, -3.95, 0.6],
  ['bath', 0.3, 5.5, 0.6, 3.8],
  ['garden', 5.5, 9, -3.95, 3.8],
  ['street', -6, 16.8, 3.8, 5.65],
];
// Endpoints and cutaway heights. Gaps are traversable doorways.
export const walls = [
  [-5.5, -7.76, 5.5, -7.76, 2.66],
  [-5.5, -7.76, -5.5, -3.95, 2.35],
  [5.5, -7.76, 5.5, -3.95, 1.14],
  [0.3, -7.76, 0.3, -6.18, 1.55],
  [0.3, -4.94, 0.3, -3.95, 1.36],
  [-5.5, -3.95, -1.7, -3.95, 2.72],
  [-0.27, -3.95, 1.04, -3.95, 1.46],
  [2.36, -3.95, 5.5, -3.95, 2.72],
  [2.48, 0.6, 2.48, 1.76, 1.22],
  [2.48, 2.91, 2.48, 3.8, 0.81],
  [-1.94, 2.6, -1.94, 3.8, 0.59],
  [-0.51, 2.55, 0.3, 2.55, 0.59],
  [-5.5, -3.95, -5.5, 3.8, 2.42],
  [-5.5, -0.5, -2, -0.5, 1.35],
  [-0.6, -0.5, 0.3, -0.5, 0.64],
  [0.3, -3.95, 0.3, -2.2, 1.22],
  [0.3, -0.82, 0.3, 1.52, 0.76],
  [0.3, 2.86, 0.3, 3.8, 0.54],
  [0.3, 0.6, 2.05, 0.6, 1.04],
  [3.35, 0.6, 5.5, 0.6, 1.24],
  [5.5, -3.95, 5.5, -1.65, 0.85],
  [5.5, -0.3, 5.5, 3.8, 0.53],
  [-5.5, 3.8, -2.05, 3.8, 0.22],
  [-0.65, 3.8, 5.5, 3.8, 0.22],
  [5.55, -3.95, 9, -3.95, 1.07],
  [9, -3.95, 9, 3.8, 0.73],
];
export const furniture = {
  shoes: {
    room: 'entry',
    label: '在玄关换鞋',
    point: [-1.12, 2.95],
    object: [-0.38, 3.05],
  },
  desk: {
    room: 'study',
    label: '在书桌前写字',
    point: [3.53, -6.08],
    object: [3.57, -7.14],
  },
  shelf: {
    room: 'study',
    label: '读书',
    point: [1.62, -6.26],
    object: [1.6, -7.32],
  },
  washer: {
    room: 'utility',
    label: '洗衣服',
    point: [1.58, 2.63],
    object: [1.02, 3.27],
  },
  rack: {
    room: 'balcony',
    label: '晾衣服',
    point: [6.64, 1.91],
    object: [7.12, 2.95],
  },
  tea: {
    room: 'dining',
    label: '泡茶',
    point: [-4.33, -6.57],
    object: [-4.79, -7.21],
  },
  seeds: {
    room: 'street',
    label: '买种子',
    point: [11.6, 4.58],
    object: [10.73, 3.96],
  },
  sell: {
    room: 'street',
    label: '出售蔬菜',
    point: [11.97, 4.63],
    object: [12.62, 4.04],
  },
  tv: {
    room: 'living',
    label: '看电视',
    point: [-3.55, 1.52],
    object: [-3.76, -0.16],
  },
  sofa: {
    room: 'living',
    label: '坐沙发',
    point: [-2.03, 1.95],
    object: [-3.58, 2.51],
  },
  stove: {
    room: 'kitchen',
    label: '做饭',
    point: [-2.15, -2.68],
    object: [-2.5, -3.49],
  },
  table: {
    room: 'dining',
    label: '吃饭',
    point: [-2.66, -5.24],
    object: [-3.58, -5.85],
  },
  bed: {
    room: 'bedroom',
    label: '睡觉',
    point: [2.42, -1.83],
    object: [3.8, -2.24],
  },
  sink: {
    room: 'utility',
    label: '洗漱',
    point: [1.61, 1.7],
    object: [1.25, 0.98],
  },
  bath: {
    room: 'bath',
    label: '泡澡',
    point: [3.31, 2.26],
    object: [4.34, 2.39],
  },
  stroll: {
    room: 'street',
    label: '去街口散步',
    point: [4.55, 4.89],
    object: [4.55, 4.89],
  },
  market: {
    room: 'street',
    label: '买便当',
    point: [11.52, 4.57],
    object: [11.52, 3.87],
  },
  vendor: {
    room: 'street',
    label: '买饮料',
    point: [14.65, 4.85],
    object: [14.66, 4.0],
  },
};
export const plots = [
  [6.4, -2.66],
  [7.95, -2.66],
  [6.4, -0.37],
  [7.95, -0.37],
];
plots.forEach(([x, z], i) => {
  furniture['plot' + i] = {
    room: 'garden',
    label: '第 ' + (i + 1) + ' 畦',
    point: [x, z + 0.88],
    object: [x, z],
  };
});
export const obstacles = [
  [-4.35, -3.56, 0.52, 1.11],
  [-5.16, -2.55, -0.38, 0.23],
  [-4.92, -2.24, 2.13, 3.1],
  [-5.25, -0.95, -3.87, -3.17],
  [-4.32, -2.91, -6.29, -5.49],
  [-4.11, -3.03, -5.44, -5.04],
  [-4.11, -3.03, -6.69, -6.29],
  [2.52, 4.65, -7.59, -6.7],
  [0.75, 2.29, -7.66, -7.01],
  [-0.73, -0.02, 2.72, 3.37],
  [0.53, 1.48, 2.94, 3.64],
  [6.35, 7.93, 2.76, 3.16],
  [-5.26, -4.24, -7.64, -6.88],
  [2.85, 4.88, -3.51, -1.06],
  [0.64, 1.9, 0.73, 1.24],
  [3.72, 5.1, 1.55, 3.22],
  [14.18, 15.12, 3.65, 4.36],
  ...plots.map(([x, z]) => [x - 0.53, x + 0.53, z - 0.58, z + 0.58]),
];
export function roomAt([x, z]) {
  return (
    floors.find(
      ([, a, b, c, d]) => x >= a && x <= b && z >= c && z <= d,
    )?.[0] ?? null
  );
}
export const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const blocked = [
  ...walls.map(([a, b, c, d]) => [
    Math.min(a, c) - 0.17,
    Math.max(a, c) + 0.17,
    Math.min(b, d) - 0.17,
    Math.max(b, d) + 0.17,
  ]),
  ...obstacles.map(([a, b, c, d]) => [a - 0.1, b + 0.1, c - 0.1, d + 0.1]),
];
export function walkable(p) {
  return (
    p.every(Number.isFinite) &&
    !!roomAt(p) &&
    !blocked.some(
      ([a, b, c, d]) => p[0] >= a && p[0] <= b && p[1] >= c && p[1] <= d,
    )
  );
}
// Exact parameter interval inside an axis-aligned rectangle, including corner contact.
function clip(a, b, [xmin, xmax, zmin, zmax]) {
  let lo = 0,
    hi = 1;
  for (const [axis, min, max] of [
    [0, xmin, xmax],
    [1, zmin, zmax],
  ]) {
    const delta = b[axis] - a[axis];
    if (Math.abs(delta) < 1e-10) {
      if (a[axis] < min || a[axis] > max) return null;
      continue;
    }
    const p = (min - a[axis]) / delta,
      q = (max - a[axis]) / delta;
    lo = Math.max(lo, Math.min(p, q));
    hi = Math.min(hi, Math.max(p, q));
    if (hi < lo) return null;
  }
  return [lo, hi];
}
const floorBounds = floors.map((f) => f.slice(1));
function clear(a, b) {
  if (blocked.some((rect) => clip(a, b, rect))) return false;
  const spans = floorBounds
    .map((rect) => clip(a, b, rect))
    .filter(Boolean)
    .sort((l, r) => l[0] - r[0]);
  let reached = 0;
  for (const [lo, hi] of spans) {
    if (lo > reached + 1e-8) return false;
    reached = Math.max(reached, hi);
    if (reached >= 1 - 1e-8) return true;
  }
  return false;
}
const step = 0.25,
  key = (x, z) => x + ',' + z,
  coordinates = (k) =>
    k
      .split(',')
      .map(Number)
      .map((n) => n * step);
function nearest(p) {
  const x = Math.round(p[0] / step),
    z = Math.round(p[1] / step);
  const candidates = [];
  for (let a = x - 2; a <= x + 2; a++)
    for (let b = z - 2; b <= z + 2; b++) {
      const k = key(a, b),
        q = coordinates(k);
      if (clear(p, q)) candidates.push([k, distance(p, q)]);
    }
  return candidates.sort((a, b) => a[1] - b[1])[0]?.[0];
}
export function route(start, end) {
  if (!walkable(start) || !walkable(end)) throw Error('这里没有可站立的地面。');
  if (clear(start, end)) return [start, end];
  const begin = nearest(start),
    goal = nearest(end);
  if (!begin || !goal) throw Error('走不到这个位置。');
  const frontier = [begin],
    parents = new Map([[begin, null]]);
  for (let i = 0; i < frontier.length && !parents.has(goal); i++) {
    const here = frontier[i],
      [x, z] = here.split(',').map(Number);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const next = key(x + dx, z + dz);
      if (parents.has(next) || !clear(coordinates(here), coordinates(next)))
        continue;
      parents.set(next, here);
      frontier.push(next);
    }
  }
  if (!parents.has(goal)) throw Error('走不到这个位置。');
  const path = [end];
  for (let k = goal; k; k = parents.get(k)) path.unshift(coordinates(k));
  path.unshift(start);
  const simple = [start];
  let index = 0;
  while (index < path.length - 1) {
    let far = index + 1;
    while (far + 1 < path.length && clear(path[index], path[far + 1])) far++;
    simple.push(path[far]);
    index = far;
  }
  return simple;
}
