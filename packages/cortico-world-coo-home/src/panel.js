import { createScene } from './scene.js';
import { furniture, rooms, roomAt } from './layout.js';
import {
  health,
  position,
  phase,
  verbs,
  crops,
  channels,
  plantStage,
  plotAction,
} from './life.js';

const names = {
  tv: '电视',
  sofa: '沙发',
  stove: '灶台',
  table: '餐桌',
  bed: '床',
  sink: '洗手台',
  bath: '浴缸',
  stroll: '街口路牌',
  vendor: '自动贩卖机',
  market: '便利店',
  sell: '蔬菜收购台',
  seeds: '种子架',
  desk: '书桌',
  shelf: '书架',
  washer: '洗衣机',
  rack: '晾衣架',
  shoes: '玄关鞋柜',
  tea: '茶柜',
};
const titles = {
  menu: '小屋面板',
  camera: '镜头',
  coo: 'Coo',
  events: '刚刚发生',
  tv: '电视',
  garden: '菜园',
  store: '便利店',
  chat: '和 Coo 聊聊',
  settings: '环境与操作',
  items: '房间里的物件',
};
const actNames = {
  wave: '挥手',
  nod: '点头',
  look: '张望',
  hop: '蹦一下',
  jump: '跳一下',
  smile: '微笑',
  happy: '开心',
  stretch: '伸懒腰',
  bow: '鞠躬',
  spin: '转一圈',
  sit: '坐下',
  stand: '站起来',
  sleep: '打盹',
};
const stages = {
  empty: '空地',
  dry: '待浇水',
  sprout: '发芽',
  leaf: '长叶',
  ripe: '可采收',
};
const times = {
  auto: '跟随本机时间',
  day: '白天',
  dusk: '黄昏',
  night: '夜晚',
};
const time = (t) =>
  new Date(t).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  });
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (x) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        x
      ],
  );
const button = (action, label, extra = '') =>
  '<button type="button" data-cmd="' +
  esc(action) +
  '" ' +
  extra +
  '>' +
  esc(label) +
  '</button>';
const group = (html) => '<div class="hh-row">' + html + '</div>';
const field = (label, id, values, selected) =>
  '<label class="hh-field"><span>' +
  esc(label) +
  '</span><select data-field="' +
  id +
  '" aria-label="' +
  esc(label) +
  '">' +
  Object.entries(values)
    .map(
      ([v, t]) =>
        '<option value="' +
        esc(v) +
        '" ' +
        (String(selected) === v ? 'selected' : '') +
        '>' +
        esc(t) +
        '</option>',
    )
    .join('') +
  '</select></label>';
const text = (s) => '<p>' + esc(s) + '</p>';
const stat = (k, v) =>
  '<div class="hh-stat"><span>' + esc(k) + '</span><b>' + esc(v) + '</b></div>';

async function mount(ctx) {
  const root = document.createElement('section');
  root.className = 'cooh';
  ctx.root.append(root);
  root.innerHTML =
    '<div class="ch-stage"><canvas class="ch-canvas" tabindex="0" aria-label="Coo小屋。点击物件查看，拖动 Coo 到家具旁互动。也可以从面板按名称选择物件。"></canvas><div class="hh-nav"><button type="button" data-cmd="open:camera" aria-haspopup="dialog">镜头 · 客厅</button><button type="button" data-cmd="open:menu" aria-haspopup="dialog">面板</button></div><section class="hh-drawer" role="dialog" aria-labelledby="cooh-panel-heading" hidden><header><h2 id="cooh-panel-heading"></h2><button type="button" data-cmd="close" aria-label="收起面板">×</button></header><div class="hh-content"></div></section><div class="hh-drag" hidden></div><p class="hh-toast" role="status" hidden></p></div>';
  const $ = (sel) => root.querySelector(sel),
    stage = $('.ch-stage'),
    canvas = $('canvas'),
    drawer = $('.hh-drawer'),
    heading = $('h2'),
    content = $('.hh-content'),
    toast = $('.hh-toast'),
    dragHint = $('.hh-drag');
  let state,
    scene,
    open = '',
    selected = '',
    region = 'living',
    camera = 'living',
    tab = 'grow',
    plot = 0,
    draft = '',
    figureProblem = '',
    gpuProblem = '',
    busy = false,
    polling = false,
    previousFocus,
    toastSeq = 0,
    signature = '',
    rendered = '',
    roomChoice = 'living';
  let video = null,
    objectUrl = null,
    fileName = '';
  function notify(message) {
    const seq = ++toastSeq;
    toast.hidden = !message;
    toast.textContent = message ?? '';
    if (message)
      ctx.timeout(() => {
        if (seq === toastSeq) toast.hidden = true;
      }, 3700);
  }
  function close() {
    if (!open) return;
    open = '';
    drawer.hidden = true;
    content.replaceChildren();
    signature = '';
    if (previousFocus?.isConnected)
      previousFocus.focus({ preventScroll: true });
    else canvas.focus({ preventScroll: true });
  }
  function show(id) {
    stage.classList.remove('hh-clean');
    if (!open) previousFocus = document.activeElement;
    open = id;
    drawer.hidden = false;
    signature = '';
    rendered = '';
    draw(true);
    drawer.querySelector('[data-cmd=close]').focus({ preventScroll: true });
  }
  function inspect(id) {
    if (id === 'coo') {
      show('coo');
      return;
    }
    if (id.startsWith('plot')) {
      plot = +id.slice(4);
      tab = 'grow';
      show('garden');
      return;
    }
    if (['market', 'sell', 'seeds', 'vendor'].includes(id)) {
      show('store');
      return;
    }
    if (id === 'tv') {
      show('tv');
      return;
    }
    selected = id;
    show('object');
  }
  function focus(id) {
    if (id === 'free') {
      scene?.unlock();
      camera = 'free';
      $('[data-cmd="open:camera"]').textContent = '自由镜头';
      return;
    }
    camera = id;
    if (rooms[id]) {
      region = id;
      roomChoice = id;
    }
    scene?.focus(id);
    $('[data-cmd="open:camera"]').textContent =
      '镜头 · ' + (rooms[id]?.name ?? (id === 'all' ? '全屋' : '跟随'));
  }
  function stopMedia() {
    scene?.video(null);
    if (video) {
      video.pause();
      video.removeAttribute('src');
      video.load();
      video = null;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    objectUrl = null;
    fileName = '';
  }
  async function command(method, args) {
    if (busy || !state) return false;
    busy = true;
    drawer.setAttribute('aria-busy', 'true');
    try {
      const s = await ctx.invoke(method, args);
      if (ctx.signal.aborted) return false;
      adopt(s);
      if (s.notice) notify(s.notice);
      return true;
    } catch (e) {
      if (!ctx.signal.aborted) notify(e.message);
      return false;
    } finally {
      busy = false;
      drawer.removeAttribute('aria-busy');
    }
  }
  async function visit(target, carry = false) {
    return command('visit', [
      typeof target === 'string' ? { target, carry } : target,
    ]);
  }
  async function localVideo(file) {
    if (!file) return;
    stopMedia();
    const player = document.createElement('video');
    video = player;
    player.muted = true;
    player.playsInline = true;
    objectUrl = URL.createObjectURL(file);
    player.src = objectUrl;
    player.addEventListener(
      'ended',
      () => {
        if (player === video) {
          stopMedia();
          draw(true);
        }
      },
      { signal: ctx.signal },
    );
    player.addEventListener(
      'error',
      () => {
        if (video === player) {
          stopMedia();
          draw(true);
          notify('无法解码这个视频。');
        }
      },
      { once: true, signal: ctx.signal },
    );
    try {
      await player.play();
      if (player !== video || ctx.signal.aborted) return;
      if (!(await command('option', ['tvOn', true]))) {
        if (player === video) stopMedia();
        return;
      }
      if (player !== video || ctx.signal.aborted) return;
      fileName = file.name;
      scene?.video(player);
      draw(true);
    } catch {
      if (player === video) {
        stopMedia();
        notify('视频未能播放，请选择浏览器支持的视频。');
      }
    }
  }
  function adopt(s) {
    if (state && s.revision < state.revision) return;
    state = s;
    scene?.state(s);
    if (fileName && !s.tvOn) stopMedia();
    draw();
  }
  function draw(force = false) {
    if (!state || !open) return;
    const s = state,
      now = Date.now(),
      mode = phase(s, now);
    const key = [
      open,
      selected,
      region,
      camera,
      tab,
      plot,
      roomChoice,
      s.revision,
      figureProblem,
      gpuProblem,
      scene?.animations().join(),
      fileName,
      mode,
      s.plots.map((p) => plantStage(p, now)).join(),
      Math.floor(now / 5000),
    ].join('|');
    if (!force && signature === key) return;
    signature = key;
    heading.textContent =
      open === 'object' ? names[selected] || '家具' : titles[open];
    let html = '';
    switch (open) {
      case 'menu':
        html = group(
          [
            'camera',
            'coo',
            'events',
            'tv',
            'garden',
            'store',
            'chat',
            'settings',
            'items',
          ]
            .map((id) => button('open:' + id, titles[id]))
            .join(''),
        );
        break;
      case 'camera':
        html =
          field(
            '观察位置',
            'camera',
            {
              free: '自由镜头',
              all: '街区全景',
              follow: '跟随 Coo',
              ...Object.fromEntries(
                Object.entries(rooms).map(([k, r]) => [k, r.name]),
              ),
            },
            camera,
          ) +
          group(
            button('zoom-', '缩小') +
              button('zoom+', '放大') +
              button('reset', '复位镜头') +
              button('clean-view', '隐藏浮层（H）'),
          );
        break;
      case 'coo': {
        const vitals = health(s, now),
          words = scene?.animations() ?? [];
        html =
          stat('位置', rooms[roomAt(position(s, now))]?.name ?? '小屋') +
          stat(
            '正在做什么',
            mode === 'walking'
              ? '走向' + (names[s.trip.target] ?? '目的地')
              : (verbs[mode] ?? '休息'),
          ) +
          stat('精神', Math.round(vitals.energy) + '/100') +
          stat('饱腹', Math.round(vitals.fullness) + '/100');
        const gestures = Object.keys(actNames).filter((w) => words.includes(w));
        html += gestures.length
          ? '<h3>当前装扮的动作</h3>' +
            group(
              gestures.map((w) => button('pose:' + w, actNames[w])).join(''),
            )
          : text(figureProblem || '当前装扮没有提供这些动作。');
        html += group(
          button('open:chat', '和 Coo 聊聊') + button('follow', '跟随 Coo'),
        );
        break;
      }
      case 'events':
        html = s.history.length
          ? '<ol class="hh-log">' +
            s.history
              .map(
                (h) =>
                  '<li><time>' +
                  esc(time(h.at)) +
                  '</time><small>' +
                  esc(h.who) +
                  '</small><span>' +
                  esc(h.text) +
                  '</span></li>',
              )
              .join('') +
            '</ol>'
          : text('今天刚搬进来。');
        break;
      case 'tv':
        html =
          field(
            '频道',
            'channel',
            Object.fromEntries(channels.map((c, i) => [i, c])),
            s.channel,
          ) +
          group(
            button('power', s.tvOn ? '关掉电视' : '打开电视') +
              button('go:tv', '一起看电视'),
          ) +
          '<h3>本地视频</h3><label class="hh-file">选择视频<input type="file" accept="video/*" aria-label="选择本地视频" data-field="file"></label>';
        if (video && fileName)
          html +=
            text(fileName) +
            group(
              button('mute', video.muted ? '开启原声' : '静音') +
                button('stop-media', '结束播放'),
            );
        break;
      case 'garden': {
        html = group(
          [
            ['grow', '种植'],
            ['inventory', '仓库'],
            ['shop', '种子铺'],
          ]
            .map(([id, label]) =>
              button('tab:' + id, label, 'aria-pressed="' + (tab === id) + '"'),
            )
            .join(''),
        );
        if (tab === 'grow') {
          const p = s.plots[plot],
            st = plantStage(p, now),
            action = plotAction(p, now);
          html +=
            field(
              '菜畦',
              'plot',
              { 0: '第一畦', 1: '第二畦', 2: '第三畦', 3: '第四畦' },
              plot,
            ) +
            stat('长势', (p ? crops[p.kind].name + ' · ' : '') + stages[st]);
          if (!p)
            html += field(
              '种什么',
              'seed',
              Object.fromEntries(
                Object.entries(crops).map(([id, c]) => [id, c.name]),
              ),
              s.seed,
            );
          if (p?.watered && st !== 'ripe')
            html += stat(
              '距离成熟',
              Math.max(
                0,
                Math.ceil((p.watered + crops[p.kind].ms - now) / 1000),
              ) + ' 秒',
            );
          if (action) html += group(button('go:plot' + plot, verbs[action]));
        }
        if (tab === 'inventory')
          html +=
            stat('蔬菜', s.vegetables + ' 份') +
            stat('种子', s.seeds + ' 包') +
            stat('零钱', s.coins) +
            group(
              button(
                'go:sell',
                '去隔壁卖菜 · +55',
                s.vegetables ? '' : 'disabled',
              ),
            );
        if (tab === 'shop')
          html +=
            stat('零钱', s.coins) +
            stat('种子库存', s.seeds + ' 包') +
            group(
              button(
                'go:seeds',
                '买 3 包种子 · 30',
                s.coins >= 30 ? '' : 'disabled',
              ),
            );
        break;
      }
      case 'store':
        html =
          stat('零钱', s.coins) +
          stat(
            '背包',
            s.meals +
              ' 份热饭 · ' +
              s.seeds +
              ' 包种子 · ' +
              s.vegetables +
              ' 份蔬菜',
          ) +
          group(
            [
              ['market', '买便当 · 70', s.coins >= 70],
              ['vendor', '买饮料 · 20', s.coins >= 20],
              ['seeds', '买 3 包种子 · 30', s.coins >= 30],
              ['sell', '卖一份蔬菜 · +55', s.vegetables > 0],
            ]
              .map(([id, n, ok]) => button('go:' + id, n, ok ? '' : 'disabled'))
              .join(''),
          );
        break;
      case 'object':
        html = stat('位置', rooms[furniture[selected].room].name);
        if (['table', 'stove'].includes(selected))
          html += stat(
            '厨房库存',
            s.meals + ' 份热饭 · ' + s.vegetables + ' 份蔬菜',
          );
        if (['washer', 'rack'].includes(selected))
          html += stat('衣物', s.laundry);
        html += group(
          button('go:' + selected, '让 Coo ' + furniture[selected].label),
        );
        break;
      case 'items':
        html =
          field(
            '房间',
            'room',
            Object.fromEntries(
              Object.entries(rooms).map(([k, r]) => [k, r.name]),
            ),
            roomChoice,
          ) +
          group(
            Object.entries(furniture)
              .filter(([, x]) => x.room === roomChoice)
              .map(([k, x]) => button('inspect:' + k, names[k] ?? x.label))
              .join(''),
          );
        break;
      case 'settings':
        html =
          field('光照', 'light', times, s.light) +
          group(
            button('rain', '街区降雨 · ' + (s.rain ? '开' : '关')) +
              button('auto', '自主生活 · ' + (s.auto ? '开' : '关')),
          ) +
          text(
            '左键拖动环绕，右键拖动平移，滚轮缩放。点地面让 Coo 走过去。拖动 Coo 到家具旁，松手即可互动。',
          );
        if (gpuProblem || figureProblem)
          html +=
            text(gpuProblem || figureProblem) + button('retry', '重试装扮');
        break;
      case 'chat': {
        // Keep the input stable during polling, particularly during Chinese IME composition.
        if (!content.querySelector('textarea')) {
          content.innerHTML =
            '<div class="hh-messages" aria-live="polite"></div><textarea rows="2" aria-label="给 Coo 的消息" placeholder="和 Coo 说句话…"></textarea>' +
            group(button('send', '发送'));
          content.querySelector('textarea').value = draft;
        }
        const transcript = content.querySelector('.hh-messages'),
          messages = s.chat ?? [];
        const markup = messages.length
          ? messages
              .map(
                (m) => '<p><b>' + esc(m.who) + '</b> ' + esc(m.text) + '</p>',
              )
              .join('')
          : text('消息会送到当前 Coopanion 对话。');
        if (transcript.innerHTML !== markup) {
          transcript.innerHTML = markup;
          transcript.scrollTop = transcript.scrollHeight;
        }
        return;
      }
    }
    if (rendered !== html) {
      rendered = html;
      const active = document.activeElement,
        command = active?.dataset?.cmd,
        fieldId = active?.dataset?.field;
      const scroll = content.scrollTop;
      content.innerHTML = html;
      content.scrollTop = scroll;
      if (command || fieldId)
        Array.from(content.querySelectorAll('button,select'))
          .find(
            (e) =>
              (e.dataset.cmd === command && command) ||
              (e.dataset.field === fieldId && fieldId),
          )
          ?.focus({ preventScroll: true });
    }
  }
  root.addEventListener(
    'input',
    (e) => {
      if (e.target.tagName === 'TEXTAREA') draft = e.target.value;
    },
    { signal: ctx.signal },
  );
  root.addEventListener(
    'change',
    async (e) => {
      const el = e.target,
        k = el.dataset.field,
        v = el.value;
      if (k === 'camera') {
        focus(v);
        close();
      }
      if (k === 'room') {
        roomChoice = v;
        draw(true);
      }
      if (k === 'plot') {
        plot = +v;
        draw(true);
      }
      if (k === 'light' || k === 'seed') await command('option', [k, v]);
      if (k === 'channel') {
        stopMedia();
        await command('option', ['channel', +v]);
      }
      if (k === 'file') await localVideo(el.files?.[0]);
    },
    { signal: ctx.signal },
  );
  root.addEventListener(
    'click',
    async (e) => {
      const b = e.target.closest('[data-cmd]');
      if (!b || !state) return;
      const [cmd, arg] = b.dataset.cmd.split(':');
      if (cmd === 'open') {
        if (open === arg) close();
        else show(arg);
        return;
      }
      if (cmd === 'close') {
        close();
        return;
      }
      if (cmd === 'inspect') {
        inspect(arg);
        return;
      }
      if (cmd === 'go') {
        if (await visit(arg)) close();
        return;
      }
      if (cmd === 'tab') {
        tab = arg;
        draw(true);
        return;
      }
      if (cmd === 'pose') {
        if (scene?.animate(arg)) close();
        return;
      }
      if (cmd === 'zoom-' || cmd === 'zoom+') {
        scene?.zoom(cmd === 'zoom-' ? 1 / 1.22 : 1.22);
        return;
      }
      if (cmd === 'clean-view') {
        close();
        stage.classList.add('hh-clean');
        canvas.focus({ preventScroll: true });
        return;
      }
      if (cmd === 'reset') {
        focus('living');
        scene?.reset();
        close();
        return;
      }
      if (cmd === 'follow') {
        focus('follow');
        close();
        return;
      }
      if (cmd === 'rain' || cmd === 'auto') {
        await command('option', [cmd, !state[cmd]]);
        return;
      }
      if (cmd === 'power') {
        if (state.tvOn) stopMedia();
        await command('option', ['tvOn', !state.tvOn]);
        return;
      }
      if (cmd === 'stop-media') {
        stopMedia();
        draw(true);
        return;
      }
      if (cmd === 'mute' && video) {
        video.muted = !video.muted;
        draw(true);
        return;
      }
      if (cmd === 'retry') {
        scene?.retry();
        return;
      }
      if (cmd === 'send' && draft.trim()) {
        const sent = draft;
        if ((await command('chat', [sent])) && draft === sent) {
          draft = '';
          if (open === 'chat') content.querySelector('textarea').value = '';
        }
      }
    },
    { signal: ctx.signal },
  );
  root.addEventListener(
    'keydown',
    (e) => {
      if (
        !e.isComposing &&
        !['TEXTAREA', 'INPUT', 'SELECT'].includes(e.target.tagName) &&
        e.key.toLowerCase() === 'h'
      ) {
        e.preventDefault();
        close();
        stage.classList.toggle('hh-clean');
        canvas.focus({ preventScroll: true });
        return;
      }
      if (e.key === 'Escape' && !open) {
        stage.classList.remove('hh-clean');
      }
      if (e.key === 'Escape' && open) {
        e.stopPropagation();
        close();
      }
      if (e.key === 'Enter' && e.ctrlKey && !e.isComposing && open === 'chat')
        content.querySelector('[data-cmd=send]')?.click();
    },
    { signal: ctx.signal },
  );
  try {
    scene = createScene(ctx, {
      free: () => {
        camera = 'free';
        $('[data-cmd="open:camera"]').textContent = '自由镜头';
      },
      stage,
      canvas,
      inspect,
      visit,
      hint: (t) => {
        dragHint.textContent = t;
        dragHint.hidden = !t;
      },
      status: (t) => {
        figureProblem = t;
        if (t && !t.startsWith('正在')) notify(t);
        draw();
      },
    });
  } catch {
    gpuProblem = 'WebGL 2 暂时不可用，可从面板的「房间里的物件」继续操作。';
    notify(gpuProblem);
  }
  ctx.own({ dispose: stopMedia });
  async function sync() {
    if (polling || busy || document.hidden || ctx.signal.aborted) return;
    polling = true;
    try {
      const s = await ctx.invoke('state', []);
      if (!ctx.signal.aborted && (!state || s.revision !== state.revision))
        adopt(s);
    } catch (e) {
      if (!ctx.signal.aborted) notify(e.message);
    } finally {
      polling = false;
    }
  }
  await sync();
  if (!ctx.signal.aborted) {
    ctx.interval(sync, 800);
    ctx.interval(() => draw(), 1000);
  }
}
export default { panels: { room: { mount } } };
