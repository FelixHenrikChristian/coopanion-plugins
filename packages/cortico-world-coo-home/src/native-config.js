import {readFile} from 'node:fs/promises';
import {join} from 'node:path';

export const HOME_DEFAULTS=Object.freeze({enabled:false,configVersion:0,autonomy:true,aiEnabled:false,intervalMinutes:30,dailyCalls:12,dailyReports:4,desktopReports:true});
export const HOME_SETTING_KEYS=Object.freeze(['autonomy','aiEnabled','intervalMinutes','dailyCalls','dailyReports','desktopReports']);
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export function readHomeConfig(value={}){
  const out=Object.fromEntries(HOME_SETTING_KEYS.map(key=>[key,value[key]??HOME_DEFAULTS[key]]));
  if(!['autonomy','aiEnabled','desktopReports'].every(key=>typeof out[key]==='boolean')||!Number.isInteger(out.intervalMinutes)||out.intervalMinutes<5||out.intervalMinutes>1440||!Number.isInteger(out.dailyCalls)||out.dailyCalls<0||out.dailyCalls>100||!Number.isInteger(out.dailyReports)||out.dailyReports<0||out.dailyReports>24)throw Object.assign(Error('家园配置无效，请在配置页检查生活开关、计划间隔与额度。'),{code:'HOME_CONFIG'});
  return out;
}
export function homeConfigGroups(language='zh'){
  const en=language==='en',field=(type,title,description,extra={})=>({type,title,description,'x-hot':true,...extra});
  return[{id:'world:coo-home',owner:'world:coo-home',schema:{type:'object',title:en?'Home life and notifications':'家园生活与转达',description:en?'Applies after saving. Home progress remains independent of the desktop companion.':'保存后自动生效；家园生活进度独立于桌面桌宠。',properties:{
    'worlds.coo-home.autonomy':field('boolean',en?'Autonomous life':'自主生活',en?'Local rules arrange rest, meals, reading and watering. Manual instructions take priority.':'按本地规则安排休息、用餐、阅读与浇水，不调用模型；手动指令优先。'),
    'worlds.coo-home.aiEnabled':field('boolean',en?'AI autonomous plans':'AI 自主计划',en?'Requires autonomous life. Allows background model requests while the home page is closed.':'需同时开启自主生活。允许家园关闭页面后在后台调用当前模型安排活动。'),
    'worlds.coo-home.intervalMinutes':field('integer',en?'Plan interval':'计划间隔',en?'Only plans when no manual work is pending.':'没有手动任务时才会安排计划。',{minimum:5,maximum:1440,'x-suffix':en?'minutes':'分钟'}),
    'worlds.coo-home.dailyCalls':field('integer',en?'Daily autonomous model requests':'每日家园自主请求上限',en?'Every provider request counts, including tool continuations. Manual home chat is excluded.':'每次模型请求均计入，包括工具调用后的续轮；手动家园聊天不占这一额度。',{minimum:0,maximum:100}),
    'worlds.coo-home.desktopReports':field('boolean',en?'Relay important home events':'向桌面转达重要家园活动',en?'Summarizes at most every 15 minutes. Hidden with AI off: waits for the next desktop conversation.':'重要消息至少间隔 15 分钟汇总一次。家园页面关闭且 AI 关闭时，只等待桌面下次对话带出。'),
    'worlds.coo-home.dailyReports':field('integer',en?'Daily proactive desktop reports':'每日主动汇报上限',en?'Limits wake-ups, not the desktop model requests they cause. After the limit, reports wait for another desktop turn.':'限制主动唤醒桌面的次数。桌面后续模型请求由宿主管理，不计入家园请求额度；额度用完后消息等待下次对话带出。',{minimum:0,maximum:24})
  }}}];
}

// Seed the host-owned config once from pre-native saves. Explicit deployment
// settings win, including a deliberate value equal to a new package default.
export async function migrateHomeConfig(ctx,{autonomy,brain}){
  if(typeof ctx.persist!=='function'||!plain(ctx.cfg))return false;
  if(ctx.cfg.configVersion===1)return true;
  let explicit={};
  try{const bytes=await readFile(join(ctx.botDir,'config.json'));const text=bytes[0]===255&&bytes[1]===254?bytes.subarray(2).toString('utf16le'):bytes.toString('utf8').replace(/^\uFEFF/,'');const config=JSON.parse(text);if(plain(config.worlds?.['coo-home']))explicit=config.worlds['coo-home'];}
  catch(error){if(error.code!=='ENOENT')throw Object.assign(Error('无法迁移家园配置；原配置与生活存档已保留。'),{code:'HOME_CONFIG'});}
  const values={autonomy,...brain};for(const key of HOME_SETTING_KEYS)if(Object.hasOwn(explicit,key))values[key]=explicit[key];
  await ctx.persist({...readHomeConfig(values),configVersion:1});return true;
}
