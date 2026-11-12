import {
  furniture,
  rooms,
  route,
  walkable,
  distance,
  roomAt,
} from './layout.js';
export const crops = {
  radish: { name: '萝卜', ms: 90000 },
  tomato: { name: '番茄', ms: 180000 },
  pea: { name: '豌豆', ms: 125000 },
};
export const channels = ['街区天气', '海边慢车', '夜间电台'];
export const verbs = {
  desk: '写字',
  shelf: '读书',
  tea: '泡茶',
  shoes: '换鞋',
  washer: '洗衣',
  rack: '晾衣',
  seeds: '买种子',
  sell: '出售蔬菜',
  tv: '看电视',
  sofa: '坐沙发',
  stove: '做饭',
  table: '吃饭',
  bed: '睡觉',
  sink: '洗漱',
  bath: '泡澡',
  stroll: '散步',
  vendor: '买饮料',
  market: '买便当',
  sow: '播种',
  water: '浇水',
  harvest: '采收',
  walk: '走动',
};
const durations = {
  desk: 14500,
  shelf: 14000,
  tea: 5000,
  shoes: 2300,
  washer: 9500,
  rack: 3800,
  seeds: 2400,
  sell: 2500,
  tv: 25000,
  sofa: 15000,
  stove: 6500,
  table: 7000,
  bed: 30000,
  sink: 5000,
  bath: 15000,
  stroll: 5000,
  vendor: 3500,
  market: 4500,
  sow: 2000,
  water: 2200,
  harvest: 2500,
  walk: 0,
};
export const stationName = (k) => furniture[k]?.label ?? '地面';
export function fresh(now = Date.now()) {
  return {
    version: 2,
    revision: 0,
    pos: [-1.8, 1.5],
    activity: 'idle',
    station: null,
    trip: null,
    auto: true,
    next: now + 18000,
    turn: 0,
    meals: 1,
    vegetables: 0,
    coins: 450,
    seeds: 4,
    laundry: '待洗',
    pages: 0,
    slippers: false,
    fullness: 70,
    energy: 78,
    vitalAt: now,
    plots: [null, null, null, null],
    seed: 'radish',
    channel: 0,
    light: 'night',
    rain: true,
    tvOn: false,
    history: [],
  };
}
export function health(s, now) {
  const mins = Math.max(0, now - s.vitalAt) / 60000;
  return {
    fullness: Math.max(0, s.fullness - mins * 1.4),
    energy: Math.max(0, s.energy - mins * 0.8),
  };
}
export function plantStage(p, now) {
  if (!p) return 'empty';
  if (!p.watered) return 'dry';
  const t = (now - p.watered) / crops[p.kind].ms;
  return t >= 1 ? 'ripe' : t >= 0.45 ? 'leaf' : 'sprout';
}
export function plotAction(p, now) {
  const stage = plantStage(p, now);
  return stage === 'empty'
    ? 'sow'
    : stage === 'dry'
      ? 'water'
      : stage === 'ripe'
        ? 'harvest'
        : null;
}
export function position(s, now) {
  const trip = s.trip;
  if (!trip) return s.pos;
  let left = Math.max(0, (now - trip.start) / 1000) * trip.speed;
  for (let i = 1; i < trip.path.length; i++) {
    const a = trip.path[i - 1],
      b = trip.path[i],
      d = distance(a, b);
    if (left < d && d > 0) return a.map((v, k) => v + ((b[k] - v) * left) / d);
    left -= d;
  }
  return trip.path.at(-1);
}
export function phase(s, now) {
  return s.trip
    ? now < s.trip.arrive
      ? 'walking'
      : s.trip.action
    : s.activity;
}
function record(s, who, text, at) {
  s.history = [{ who, text, at }, ...s.history].slice(0, 32);
}
export function validate(s, target, now) {
  if (target === 'walk') return 'walk';
  if (!Object.hasOwn(furniture, target)) throw Error('找不到这件家具。');
  const price = { vendor: 20, market: 70, seeds: 30 }[target];
  if (price && s.coins < price)
    throw Error('小屋零钱不足，可以把收获的蔬菜拿到隔壁出售。');
  if (target === 'sell' && s.vegetables < 1)
    throw Error('菜篮是空的，先采收一份蔬菜吧。');
  if (target === 'washer' && s.laundry === '待晾')
    throw Error('衣服已经洗好，去阳台晾起来吧。');
  if (target === 'rack' && s.laundry !== '待晾')
    throw Error('先在洗衣室洗一桶衣服吧。');
  if (target.startsWith('plot') && !s.plots[+target.slice(4)] && s.seeds < 1)
    throw Error('种子用完了，隔壁店里可以买到三包。');
  if (target === 'table' && !s.meals)
    throw Error('餐桌上还没有饭。先去灶台做一份吧。');
  if (target.startsWith('plot')) {
    const action = plotAction(s.plots[+target.slice(4)], now);
    if (!action) throw Error('土壤还湿着，等作物长大就能采收。');
    return action;
  }
  return target;
}
export function issue(
  source,
  { target, point, carry = false },
  who = '你',
  now = Date.now(),
) {
  const s = { ...source, ...health(source, now), vitalAt: now },
    action = validate(s, target, now);
  const dest = target === 'walk' ? point : furniture[target].point;
  if (!Array.isArray(dest) || dest.length !== 2 || !walkable(dest))
    throw Error('请选择屋内或人行道上的空地。');
  const start = position(s, now),
    path = carry ? [dest, dest] : route(start, dest);
  const length = path
      .slice(1)
      .reduce((sum, p, i) => sum + distance(path[i], p), 0),
    speed = 1.95;
  const arrive = now + Math.ceil((length / speed) * 1000);
  s.pos = carry ? dest : start;
  s.activity = 'idle';
  s.station = null;
  s.trip = {
    path,
    start: now,
    arrive,
    end: arrive + durations[action],
    action,
    target,
    who,
    speed,
    seed: s.seed,
  };
  s.next = s.trip.end + (who === '自主' ? 11500 : 38000);
  s.revision++;
  const where = rooms[roomAt(dest)]?.name ?? '家里';
  record(
    s,
    who,
    (carry ? '抱到' : '前往') + where + ' · ' + verbs[action],
    now,
  );
  return s;
}
function finish(s, now) {
  const t = s.trip;
  s.pos = t.path.at(-1);
  s.activity = t.action;
  s.station = t.target;
  s.trip = null;
  if (t.action === 'tv') s.tvOn = true;
  if (t.action === 'stove') {
    s.meals = Math.min(12, s.meals + 1);
    if (s.vegetables) s.vegetables--;
  }
  if (t.action === 'table') {
    s.meals = Math.max(0, s.meals - 1);
    s.fullness = Math.min(100, s.fullness + 32);
  }
  const cost = { market: 70, vendor: 20, seeds: 30 }[t.action];
  if (cost) s.coins -= cost;
  if (t.action === 'seeds') s.seeds += 3;
  if (t.action === 'sell') {
    s.vegetables--;
    s.coins += 55;
  }
  if (t.action === 'washer') s.laundry = '待晾';
  if (t.action === 'rack') s.laundry = '已晾';
  if (t.action === 'bath' && s.laundry === '已晾') s.laundry = '待洗';
  if (t.action === 'shoes') s.slippers = !s.slippers;
  if (t.action === 'shelf' || t.action === 'desk') s.pages++;
  if (t.action === 'tea') s.energy = Math.min(100, s.energy + 6);
  if (t.action === 'market') s.meals = Math.min(12, s.meals + 1);
  if (t.action === 'vendor') s.fullness = Math.min(100, s.fullness + 7);
  if (t.action === 'bed') s.energy = Math.min(100, s.energy + 35);
  if (t.action === 'sofa' || t.action === 'bath')
    s.energy = Math.min(100, s.energy + 10);
  if (t.target.startsWith('plot')) {
    s.plots = [...s.plots];
    const i = +t.target.slice(4);
    if (t.action === 'sow') {
      s.seeds--;
      s.plots[i] = { kind: t.seed, planted: now, watered: null };
    }
    if (t.action === 'water' && s.plots[i])
      s.plots[i] = { ...s.plots[i], watered: now };
    if (t.action === 'harvest') {
      s.vegetables++;
      s.plots[i] = null;
    }
  }
  const result = {
    shoes: s.slippers ? '换上了室内拖鞋' : '换好了外出鞋',
    desk: '在书桌上写完一页笔记',
    shelf: '读完了一段书',
    tea: '泡好了一杯茶',
    washer: '这桶衣服洗好了，等着晾晒',
    rack: '把洗好的衣服晾在阳台',
    seeds: '买了三包种子',
    sell: '卖出一份蔬菜，零钱增加 55',
    stove: '热饭做好了',
    table: '吃完了一顿饭',
    sow: '种子埋好了',
    water: '地浇透了',
    harvest: '收了一份蔬菜',
    bed: '睡醒了',
    bath: '泡完澡了',
    sink: '洗漱好了',
    tv: '看完了一段节目',
    sofa: '在沙发上休息了一会儿',
    stroll: '到街口看了看',
    vendor: '在贩卖机买了饮料',
    market: '从便利店带回一份便当',
    walk: '走到了目的地',
  };
  record(s, t.who, result[t.action], now);
  // One-shot chores end when their effect is applied. Sitting and watching may linger.
  if (!['sofa', 'tv'].includes(t.action)) s.activity = 'idle';
}
function choose(s, now) {
  if (s.fullness < 47) return s.meals ? 'table' : 'stove';
  if (s.energy < 38) return 'bed';
  const available = s.plots.findIndex(
    (p) => p && ['ripe', 'dry'].includes(plantStage(p, now)),
  );
  if (available >= 0) return 'plot' + available;
  const hour = new Date(now).getHours();
  const routine =
    hour >= 23 || hour < 7
      ? [
          'tv',
          'stroll',
          'bed',
          'sink',
          'shelf',
          'plot0',
          'stove',
          'table',
          'desk',
          'tea',
        ]
      : [
          'stroll',
          'tv',
          'plot0',
          'stove',
          'table',
          'desk',
          'bath',
          'sofa',
          'washer',
          'rack',
          'shelf',
          'tea',
          'bed',
        ];
  const goal = routine[s.turn % routine.length];
  try {
    validate(s, goal, now);
    return goal;
  } catch {
    return 'stroll';
  }
}
export function tick(src, now = Date.now()) {
  let s = src;
  if (s.trip?.action === 'tv' && now >= s.trip.arrive && !s.tvOn)
    s = { ...s, tvOn: true, revision: s.revision + 1 };
  if (s.trip && now >= s.trip.end) {
    s = { ...s, ...health(s, now), vitalAt: now, revision: s.revision + 1 };
    finish(s, now);
  }
  if (!s.trip && s.auto && now >= s.next) {
    s = { ...s, ...health(s, now), vitalAt: now };
    const target = choose(s, now);
    s = issue(s, { target }, '自主', now);
    s.turn++;
  }
  return s;
}
export function setOption(src, key, value, now = Date.now()) {
  const allowed = {
    rain: [true, false],
    seed: Object.keys(crops),
    light: ['auto', 'day', 'dusk', 'night'],
    channel: [0, 1, 2],
    auto: [true, false],
    tvOn: [true, false],
  };
  if (!allowed[key]?.includes(value)) throw Error('这个设置值不可用。');
  const s = { ...src, [key]: value, revision: src.revision + 1 };
  if (key === 'auto') {
    s.next = now + 10000;
    if (!value && s.trip?.who === '自主') {
      s.pos = position(s, now);
      s.trip = null;
      s.activity = 'idle';
      s.station = null;
    }
  }
  if (key === 'tvOn' && !value && s.trip?.action === 'tv') {
    s.pos = position(s, now);
    s.trip = null;
    s.activity = 'idle';
    s.station = null;
    s.next = now + 38000;
  }
  if (key === 'tvOn' && !value && s.activity === 'tv') s.activity = 'idle';
  return s;
}
export function snapshot(s, now = Date.now()) {
  const pos = position(s, now);
  return {
    位置: rooms[roomAt(pos)]?.name,
    动作:
      phase(s, now) === 'walking' ? '在路上' : (verbs[phase(s, now)] ?? '在家'),
    目的地: s.trip?.target,
    饱腹: Math.round(health(s, now).fullness),
    精神: Math.round(health(s, now).energy),
    热饭: s.meals,
    蔬菜: s.vegetables,
    菜畦: s.plots.map((p) =>
      p
        ? crops[p.kind].name +
          ' ' +
          { dry: '待浇水', sprout: '发芽', leaf: '长叶', ripe: '可收成' }[
            plantStage(p, now)
          ]
        : '空地',
    ),
    零钱: s.coins,
    种子: s.seeds,
    衣物: s.laundry,
    阅读写作页数: s.pages,
    自主生活: s.auto,
  };
}
