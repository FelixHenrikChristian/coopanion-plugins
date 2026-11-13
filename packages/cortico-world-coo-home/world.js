import {
  fresh,
  issue,
  tick,
  setOption,
  migrateMap,
  snapshot,
} from './src/life.js';
import { furniture } from './src/layout.js';
import { figureDescriptor } from './src/appearance.js';
const id = 'coo-home',
  label = 'Coo小屋';
const targetEnum = Object.keys(furniture);
const decls = [
  {
    name: 'coo_home_look',
    description: '查看家里各个房间、当前活动、饱腹、精神、热饭和四块地的长势。',
    tags: ['read'],
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  },
  {
    name: 'coo_home_visit',
    description:
      '走到家中设施并使用。tv 看电视、sofa 休息、desk 写字、shelf 读书、tea 泡茶、shoes 换鞋、washer 洗衣、rack 晾衣、stove 做饭、table 吃饭、bed 睡觉、sink 洗漱、bath 泡澡、stroll 街边散步、vendor 买饮料、market 买便当、seeds 买种子、sell 卖菜、plot0–plot3 按长势播种/浇水/采收。会打断未完成的上一个动作。到达并做完才结算。',
    tags: ['write'],
    parameters: {
      type: 'object',
      properties: { target: { type: 'string', enum: targetEnum } },
      required: ['target'],
      additionalProperties: false,
    },
  },
  {
    name: 'coo_home_tv',
    description:
      '打开或关闭家里的电视，或选择 0 街区天气、1 海边慢车、2 夜间电台。',
    tags: ['write'],
    parameters: {
      type: 'object',
      properties: {
        on: { type: 'boolean' },
        channel: { type: 'integer', enum: [0, 1, 2] },
      },
      required: ['on'],
      additionalProperties: false,
    },
  },
];
decls.push({
  name: 'coo_home_say',
  description: '在小屋聊天面板给对方回一句话。',
  tags: ['write'],
  parameters: {
    type: 'object',
    properties: { text: { type: 'string', maxLength: 360 } },
    required: ['text'],
    additionalProperties: false,
  },
});
export default {
  id,
  label,
  defaults: () => ({ enabled: false, life: fresh() }),
  describe: {
    tools: decls.map((d, i) => ({
      ...d,
      summary: {
        zh: [
          '看看家里。',
          '去家具旁做一件日常小事。',
          '操作小屋里的电视。',
          '在小屋里回复对方。',
        ][i],
        en: [
          'Inspect home.',
          'Visit and use a station.',
          'Control the TV.',
          'Reply in the room.',
        ][i],
      },
    })),
    events: [
      {
        type: 'coo-home.visit',
        description: {
          zh: '用户给小屋中的 Coo 安排了一项活动。',
          en: 'The visitor gave Coo a household activity.',
        },
      },
      {
        type: 'coo-home.chat',
        description: {
          zh: '对方在小屋聊天。',
          en: 'A visitor spoke in the room.',
        },
      },
    ],
  },
  create(ctx) {
    let host, timer;
    const read = () => (ctx.cfg.life?.version === 2 ? ctx.cfg.life : initial);
    const initial = fresh();
    function save(s) {
      ctx.persist({ life: s });
      return s;
    }
    function now() {
      const s = read();
      if (!host) return s;
      const n = tick(s);
      return n === s ? s : save(n);
    }
    function active() {
      if (!host) throw Error('请先在 World 总览中启用 Coo小屋。');
    }
    function visit(args, who) {
      active();
      return save(issue(now(), args, who));
    }
    function option(k, v) {
      active();
      return save(setOption(now(), k, v));
    }
    function speak(who, text) {
      active();
      if (
        typeof text !== 'string' ||
        !text.trim() ||
        [...text.trim()].length > 360
      )
        throw Error('消息需要 1–360 个字。');
      const s = now();
      return save({
        ...s,
        revision: s.revision + 1,
        chat: [
          ...(s.chat ?? []),
          { who, text: text.trim(), at: Date.now() },
        ].slice(-30),
      });
    }
    return {
      id,
      envPromptVars: () => null,
      async start(h) {
        host = h;
        const before = read(),
          migrated = migrateMap(before);
        if (before !== migrated) save(migrated);
        timer = setInterval(() => {
          try {
            now();
          } catch (e) {
            h.log?.warn?.('Coo小屋日程暂停重试', { error: String(e.message) });
          }
        }, 1000);
        timer.unref?.();
      },
      async stop() {
        clearInterval(timer);
        host = undefined;
      },
      tools: () => [
        { ...decls[0], handler: async () => JSON.stringify(snapshot(now())) },
        {
          ...decls[1],
          handler: async ({ target }) => {
            if (!targetEnum.includes(target)) throw Error('未知家具');
            const s = visit({ target }, 'Coo');
            return '已动身。' + JSON.stringify(snapshot(s));
          },
        },
        {
          ...decls[2],
          handler: async ({ on, channel }) => {
            active();
            let s = setOption(now(), 'tvOn', on);
            if (channel !== undefined) s = setOption(s, 'channel', channel);
            save(s);
            return '电视已调整。';
          },
        },
        {
          ...decls[3],
          handler: async ({ text }) => {
            speak('Coo', text);
            return '已在小屋里回复。';
          },
        },
      ],
      webUi: () => ({
        label,
        panels: [{ id: 'room', title: '小屋' }],
        async invoke(panel, method, args) {
          if (panel !== 'room') throw Error('未知页签');
          if (method === 'state') return now();
          if (panel === 'room' && method === 'chat' && args.length === 1) {
            const s = speak('你', args[0]);
            try {
              await host.pushEvent(
                {
                  type: 'coo-home.chat',
                  origin: 'external',
                  source: id,
                  senderKey: 'coo-home-visitor',
                  ts: new Date().toISOString(),
                  text:
                    '对方在 Coo小屋 对你说：' +
                    s.chat.at(-1).text +
                    '（可以用 coo_home_say 在小屋内回复。）',
                },
                { trigger: 'debounce' },
              );
            } catch {
              return { ...s, notice: '消息已保存在小屋，本次未能通知 Coo。' };
            }
            return s;
          }
          if (panel === 'room' && method === 'figure' && args.length === 2)
            return figureDescriptor(...args);
          if (method === 'option' && args.length === 2) return option(...args);
          if (panel === 'room' && method === 'visit' && args.length === 1) {
            const x = args[0];
            if (
              !x ||
              typeof x !== 'object' ||
              (x.carry !== undefined && typeof x.carry !== 'boolean')
            )
              throw Error('活动参数不可用。');
            const s = visit(x, '你');
            const text = s.history[0].text;
            try {
              await host.pushEvent(
                {
                  type: 'coo-home.visit',
                  origin: 'external',
                  source: id,
                  senderKey: 'coo-home-visitor',
                  ts: new Date().toISOString(),
                  text: '对方在家里安排你' + text + '。',
                },
                { trigger: 'piggyback' },
              );
            } catch {
              return { ...s, notice: '动作已安排，本次未能通知对话。' };
            }
            return s;
          }
          throw Error('未知小屋操作。');
        },
      }),
    };
  },
};
