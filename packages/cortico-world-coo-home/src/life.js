import {HomeNavigation,timedRoute,routePosition} from './navigation.js';
import {createNavigationQuery} from '../data/navigation-query.js';

const clone=structuredClone,clamp=value=>Math.max(0,Math.min(100,value));
const NEEDS=['energy','hunger','hygiene','comfort'];
const RATES={energy:.14,hunger:.25,hygiene:.10,comfort:.12}; // points per minute
const MAX_QUEUE=16,MAX_EVENTS=30,MAX_TRANSITIONS=256,MAX_OFFLINE=24*60*60*1000;
const ALIASES={'查看':'look','浇水':'water','采收':'harvest'};
const RULES={
  sit:[35_000,'rest',{comfort:10}],nap:[60_000,'rest',{energy:25,comfort:8}],tv:[45_000,'screen',{comfort:15}],phone:[25_000,'screen',{comfort:6}],rest:[45_000,'rest',{energy:8,comfort:12}],
  drink:[12_000,'drink',{hunger:5,comfort:6}],read:[50_000,'reading',{comfort:16}],inspect:[8_000,'inspect',{comfort:2}],toggle:[1800,'light',{}],sleep:[120_000,'rest',{energy:55,comfort:12}],
  dress:[15_000,'wardrobe',{comfort:5}],open:[8_000,'open',{}],look:[10_000,'look',{comfort:3}],eat:[40_000,'meal',{hunger:40}],tea:[25_000,'steam',{hunger:5,comfort:14}],snack:[18_000,'meal',{hunger:20}],
  wash:[20_000,'water',{hygiene:14}],cook:[45_000,'steam',{hunger:20,comfort:6}],heat:[18_000,'warm',{hunger:12}],wear:[10_000,'prepare',{comfort:4}],take:[8000,'tidy',{}],store:[10_000,'tidy',{comfort:4}],
  laundry:[45_000,'laundry',{hygiene:12,comfort:8}],water:[20_000,'water',{comfort:5}],desk:[50_000,'working',{comfort:8}],draw:[45_000,'drawing',{comfort:14}],type:[45_000,'screen',{comfort:8}],
  shower:[45_000,'water',{hygiene:40}],bath:[60_000,'steam',{hygiene:40,comfort:20}],brush:[18_000,'water',{hygiene:14}],toilet:[25_000,'privacy',{hygiene:8,comfort:6}],walk:[0,null,{}]
};
const NOTES={dress:'整理衣物，保留当前角色外观。',wear:'在玄关准备出门，使用现有动作表示。',cook:'模拟简单备餐，以现有动作和独立生活状态表示。',laundry:'模拟整理洗衣；未模拟衣物库存。',sleep:'使用角色已有休息动作；缺少睡姿时停在床边休息。',water:'照看室内植物；菜园种植将在下一阶段接入。'};
const validPosition=p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite);
const scalar=(value,fallback)=>Number.isFinite(value)?value:fallback;
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);

export function buildCatalog(layout){
  return layout.items.map(item=>{
    const plot=item.id.startsWith('plot-');
    const actions=item.actions.map(action=>{
      const value=typeof action==='string'?{id:action,label:action}:action;
      const canonical=value.canonicalId??value.canonical??ALIASES[value.id]??value.id,rule=RULES[canonical];
      if(!rule||(plot&&!['look','inspect','walk'].includes(canonical)))return null;
      return{...clone(value),canonical,label:value.label??value.id,durationMs:rule[0],effect:rule[1],gains:rule[2],
        description:plot?'走到菜畦旁查看；种植、浇水和采收将在种植阶段开放。':NOTES[canonical]??'使用角色已有动作和独立家园状态表示活动；部分电器另有开关效果。',
        stance:clone(value.stance??{position:item.position,facing:[0,1]}),pose:clone(value.pose??{kind:'stand'})};
    }).filter(Boolean);
    return{id:item.id,label:item.label,room:item.room,position:clone(item.position),actions,kind:plot?'plot':'furniture'};
  });
}

/** Only public household state is retained; appearance and chat never enter a save. */
export function normalizeLifeState(raw,layout,now){
  if(plain(raw)&&Number.isInteger(raw.version)&&raw.version>1){
    const error=Error('家园存档来自较新的插件版本。请恢复使用新版插件；现有进度文件已保留。');error.code='HOME_SAVE_UNSUPPORTED';throw error;
  }
  if(!plain(raw)||![0,1].includes(raw.version))throw Error('Invalid home save version.');
  const migrated=raw.version===0?{...raw,version:1,updatedAt:raw.updatedAt??raw.lastUpdatedAt,current:null,queue:[],recent:[]}:raw;
  if(!validPosition(migrated.position)||!Number.isFinite(migrated.updatedAt)||!plain(migrated.needs))throw Error('Invalid home save.');
  const catalog=buildCatalog(layout),itemIds=new Set(layout.items.map(item=>item.id)),items={},query=createNavigationQuery(layout);
  const allowedActions=new Set(['walk',...catalog.flatMap(item=>item.actions.map(action=>action.id))]);
  const allowedEffects=new Set(Object.values(RULES).map(rule=>rule[1]));
  const offset=Math.min(0,now-migrated.updatedAt),stamp=value=>scalar(value,now)+offset;
  if(!query.locate(migrated.position))throw Error('Saved home position is no longer walkable.');
  for(const id of itemIds){
    const value=migrated.items?.[id];if(!plain(value))continue;
    items[id]={uses:Math.max(0,Math.min(1e8,Math.floor(scalar(value.uses,0)))),lastAction:allowedActions.has(value.lastAction)?value.lastAction:null,effect:allowedEffects.has(value.effect)?value.effect:null,active:false,on:typeof value.on==='boolean'?value.on:layout.defaultFurnitureState?.[id]?.on===true};
  }
  const task=value=>{
    if(!plain(value)||typeof value.id!=='string'||!/^task-\d+$/.test(value.id)||!['manual','autonomous'].includes(value.source))throw Error('Invalid saved task.');
    if(value.itemId!==null&&!itemIds.has(value.itemId))throw Error('Saved task has an unknown item.');
    if(typeof value.actionId!=='string'||value.actionId.length>50||!validPosition(value.destination)||!query.locate(value.destination))throw Error('Invalid saved task destination.');
    if(value.itemId===null?value.actionId!=='walk':!catalog.find(i=>i.id===value.itemId).actions.some(a=>a.id===value.actionId))throw Error('Invalid saved furniture action.');
    return{id:value.id,itemId:value.itemId,actionId:value.actionId,source:value.source,destination:clone(value.destination),requestedAt:stamp(value.requestedAt)};
  };
  let current=null;
  if(migrated.current){
    const value=migrated.current;current=task(value);
    if(!Array.isArray(value.route)||value.route.length<1||value.route.length>2050||value.route.some(p=>!validPosition(p.position)||!Number.isFinite(p.at)))throw Error('Invalid saved route.');
    for(let i=1;i<value.route.length;i++)if(value.route[i].at<value.route[i-1].at)throw Error('Invalid route clock.');
    for(let i=0;i<value.route.length;i++)if(!query.locate(value.route[i].position)||(i&&!query.segmentWalkable(value.route[i-1].position,value.route[i].position)))throw Error('Saved route is no longer walkable.');
    if(!Number.isFinite(value.startedAt)||!Number.isFinite(value.arrivalAt)||!Number.isFinite(value.endsAt)||value.arrivalAt<value.startedAt||value.endsAt<value.arrivalAt||value.endsAt-value.startedAt>60*60*1000)throw Error('Invalid saved activity clock.');
    Object.assign(current,{startedAt:stamp(value.startedAt),arrivalAt:stamp(value.arrivalAt),endsAt:stamp(value.endsAt),route:value.route.map(point=>({position:clone(point.position),at:stamp(point.at)}))});
  }
  if(migrated.queue!==undefined&&!Array.isArray(migrated.queue))throw Error('Invalid saved queue.');
  return{version:1,layoutVersion:layout.layoutVersion??1,revision:Math.max(0,Math.floor(scalar(migrated.revision,0))),counter:Math.max(0,Math.floor(scalar(migrated.counter,0))),updatedAt:Math.min(now,migrated.updatedAt),
    position:clone(migrated.position),needs:Object.fromEntries(NEEDS.map(key=>[key,clamp(scalar(migrated.needs[key],75))])),paused:migrated.paused===true,pausedAt:stamp(migrated.pausedAt),autonomy:migrated.autonomy!==false,
    manualUntil:stamp(migrated.manualUntil),nextAutoAt:stamp(migrated.nextAutoAt),autoIndex:Math.max(0,Math.floor(scalar(migrated.autoIndex,0))),items,current,queue:(migrated.queue??[]).slice(0,MAX_QUEUE).map(task),
    recent:(Array.isArray(migrated.recent)?migrated.recent:[]).filter(v=>plain(v)&&/^task-\d+$/.test(v.id)&&allowedActions.has(v.actionId)&&['completed','cancelled','superseded'].includes(v.outcome)).slice(-MAX_EVENTS).map(v=>({id:v.id,itemId:itemIds.has(v.itemId)?v.itemId:null,actionId:v.actionId,outcome:v.outcome,at:stamp(v.at)}))};
}

export class HomeLife{
  constructor({layout,state=null,clock=()=>Date.now()}={}){
    this.layout=layout;this.clock=clock;this.navigation=new HomeNavigation(layout);this.catalog=buildCatalog(layout);
    this.itemMap=new Map(this.catalog.map(item=>[item.id,item]));const now=clock();
    this.state=state?normalizeLifeState(state,layout,now):{version:1,layoutVersion:layout.layoutVersion??1,revision:0,counter:0,updatedAt:now,position:clone(layout.spawn),needs:{energy:80,hunger:75,hygiene:85,comfort:75},paused:false,pausedAt:now,autonomy:true,manualUntil:0,nextAutoAt:now+15_000,autoIndex:0,items:{},current:null,queue:[],recent:[]};
    const grounded=this.navigation.ground(this.state.position);if(!grounded)throw Error('Saved home position is no longer walkable.');this.state.position=grounded;
    this.navigation.prepare(grounded);
    for(const id of Object.keys(layout.defaultFurnitureState??{}))this.itemState(id);
    if(this.state.current)this.decorate(this.state.current);
    for(const queued of this.state.queue)this.definition(queued);
    this.offline={elapsedMs:0,simulatedMs:0,approximate:false,completed:0};this.visible=false;
  }
  definition(task){
    if(task.itemId===null&&task.actionId==='walk')return{canonical:'walk',id:'walk',label:'走到这里',durationMs:0,effect:null,gains:{},pose:{kind:'stand'},stance:{position:task.destination,facing:[0,1]}};
    const item=this.itemMap.get(task.itemId),action=item?.actions.find(a=>a.id===task.actionId||a.canonical===task.actionId);
    if(!action)throw Error('这个物件暂不支持此动作。');return action;
  }
  decorate(task){
    const action=this.definition(task),item=this.itemMap.get(task.itemId);
    const word=action.pose.kind==='lying'?'sleep':action.pose.kind==='seated'?'sit':['nap','sleep'].includes(action.canonical)?'sleep':'stand';
    Object.assign(task,{label:item?`${item.label} · ${action.label}`:action.label,word,pose:clone(action.pose),effect:action.effect,stance:clone(action.stance),approach:clone(action.stance.position),fallback:clone(action.fallback??{kind:'standing',position:action.stance.position,facing:action.stance.facing??[0,1]}),target:clone(action.target??item?.position??task.destination),facing:clone(action.stance.facing??[0,1]),durationMs:action.durationMs});
    return task;
  }
  export(){
    const task=value=>value?Object.fromEntries(['id','itemId','actionId','source','destination','requestedAt','startedAt','arrivalAt','endsAt','route'].filter(key=>value[key]!==undefined).map(key=>[key,clone(value[key])])):null;
    return{...clone(this.state),current:task(this.state.current),queue:this.state.queue.map(task)};
  }
  snapshot(){
    const state=clone(this.state),now=state.updatedAt,time=state.paused?state.pausedAt:now;
    if(state.current){state.current.phase=time<state.current.arrivalAt?'walking':'acting';state.current.progress=time<state.current.arrivalAt?Math.min(1,(time-state.current.startedAt)/Math.max(1,state.current.arrivalAt-state.current.startedAt)):Math.min(1,(time-state.current.arrivalAt)/Math.max(1,state.current.endsAt-state.current.arrivalAt));}
    return{...state,now,simulation:this.visible?'visible':'background',offline:clone(this.offline)};
  }
  touch(){this.state.revision++;}
  decay(duration){if(duration<=0)return;for(const key of NEEDS)this.state.needs[key]=clamp(this.state.needs[key]-RATES[key]*duration/60_000);}
  record(task,outcome,time){this.state.recent.push({id:task.id,itemId:task.itemId,actionId:task.actionId,outcome,at:time});this.state.recent=this.state.recent.slice(-MAX_EVENTS);}
  itemState(id){return this.state.items[id]??=( {uses:0,lastAction:null,effect:null,active:false,on:this.layout.defaultFurnitureState?.[id]?.on===true});}
  makeTask(itemId,actionId,source,time,destination){
    const task={id:`task-${++this.state.counter}`,itemId,actionId,source,requestedAt:time,destination:destination??[0,0,0]};
    const action=this.definition(task);task.actionId=action.id;task.destination=clone(destination??action.stance.position);return task;
  }
  begin(task,time){
    const route=this.navigation.preparedRoute(this.state.position,task.destination),points=timedRoute(route,time);
    task.route=points;task.startedAt=time;task.arrivalAt=points.at(-1).at;task.endsAt=task.arrivalAt+this.definition(task).durationMs;
    this.decorate(task);this.state.current=task;this.touch();
  }
  finish(time){
    const task=this.state.current;if(!task)return;
    const action=this.definition(task);for(const [key,gain] of Object.entries(action.gains))this.state.needs[key]=clamp(this.state.needs[key]+gain);
    if(task.itemId){const item=this.itemState(task.itemId);item.uses++;item.lastAction=task.actionId;item.active=false;item.effect=task.effect;if(action.canonical==='toggle')item.on=!item.on;}
    this.state.position=clone(task.route.at(-1).position);this.record(task,'completed',time);this.state.current=null;this.state.nextAutoAt=time+12_000;this.touch();
  }
  abandon(outcome,time,clearQueue=true){
    // A user can stop between graph nodes; prepare that new rest point once
    // during the explicit control, so later background activities stay cheap.
    this.navigation.prepare(this.state.position);
    const task=this.state.current;if(task){this.record(task,outcome,time);if(task.itemId)this.itemState(task.itemId).active=false;this.state.current=null;}
    if(clearQueue){for(const queued of this.state.queue)this.record(queued,outcome,time);this.state.queue=[];}
    this.touch();
  }
  automatic(time){
    if(!this.state.autonomy||time<Math.max(this.state.manualUntil,this.state.nextAutoAt))return null;
    const needs=this.state.needs;
    const preferred=needs.energy<38?['sleep','nap','rest']:needs.hunger<40?['eat','snack','cook']:needs.hygiene<40?['shower','wash','bath']:needs.comfort<45?['tea','read','rest']:['read','rest','tea','look','desk','drink','sit'];
    const choices=this.catalog.flatMap(item=>item.actions.filter(a=>preferred.includes(a.canonical)&&item.kind!=='plot').map(action=>({item,action})));
    if(!choices.length)return null;
    choices.sort((a,b)=>preferred.indexOf(a.action.canonical)-preferred.indexOf(b.action.canonical));
    const priority=needs.energy<38||needs.hunger<40||needs.hygiene<40||needs.comfort<45;
    const chosen=choices[priority?0:this.state.autoIndex++%choices.length];
    return this.makeTask(chosen.item.id,chosen.action.id,'autonomous',time);
  }
  advance(now=this.clock(),{visible=this.visible,offline=false}={}){
    if(!Number.isFinite(now))throw Error('Invalid household clock.');now=Math.max(this.state.updatedAt,now);this.visible=visible;
    const start=this.state.updatedAt,elapsed=now-start;if(this.state.paused){this.state.updatedAt=now;if(offline)this.offline={elapsedMs:elapsed,simulatedMs:0,approximate:false,completed:0};return this.snapshot();}
    const cutoff=Math.min(now,start+MAX_OFFLINE);let time=start,transitions=0,completed=0;
    while(time<=cutoff&&transitions<MAX_TRANSITIONS){
      let task=this.state.current;
      if(!task){
        const queued=this.state.queue.shift(),next=queued??this.automatic(time);
        if(next){try{this.begin(next,time);}catch{this.record(next,'cancelled',time);this.state.nextAutoAt=time+30_000;this.touch();}transitions++;task=this.state.current;if(!task)continue;}
        else {
          const due=this.state.autonomy?Math.max(this.state.manualUntil,this.state.nextAutoAt):Infinity;
          const target=due>time?Math.min(cutoff,due):cutoff;
          this.decay(target-time);time=target;if(time===cutoff)break;continue;
        }
      }
      const target=Math.min(cutoff,task.endsAt);this.decay(target-time);time=target;
      this.state.position=routePosition(task.route,Math.min(time,task.arrivalAt));
      this.state.position[1]=this.navigation.query.surfaceAt(this.state.position[0],this.state.position[2])?.y??this.state.position[1];
      if(task.itemId){const item=this.itemState(task.itemId);item.active=time>=task.arrivalAt;item.effect=task.effect;}
      if(time>=task.endsAt){this.finish(task.endsAt);completed++;transitions++;if(time===cutoff)break;}else break;
    }
    const approximate=time<now;
    if(approximate){
      // Long absences are bounded: finish the small manual queue exactly, then
      // settle the remaining need drift without hundreds of simulated routes.
      this.decay(now-time);
      if(this.state.current&&this.state.current.endsAt<=now){this.finish(this.state.current.endsAt);completed++;}
      if(this.state.autonomy&&!this.state.queue.length)for(const key of NEEDS)this.state.needs[key]=Math.max(this.state.needs[key],55);
      this.state.nextAutoAt=now+12_000;
    }
    this.state.updatedAt=now;if(elapsed>0)this.touch();
    if(offline)this.offline={elapsedMs:elapsed,simulatedMs:time-start,approximate,completed};
    return this.snapshot();
  }
  command({itemId,actionId,enqueue=false}={}){
    if(typeof itemId!=='string'||typeof actionId!=='string'||typeof enqueue!=='boolean')throw Error('请选择物件和动作。');
    this.advance();const now=this.state.updatedAt,task=this.makeTask(itemId,actionId,'manual',now);
    // Validate reachability before superseding a working manual task.
    this.navigation.route(this.state.position,task.destination);
    if(enqueue&&this.state.current?.source==='manual'){
      if(this.state.queue.length>=MAX_QUEUE)throw Error('家园队列已满，请先完成或取消一些任务。');this.state.queue.push(task);
    }else{this.abandon('superseded',now);this.begin(task,now);if(this.state.paused)this.state.pausedAt=now;}
    this.state.manualUntil=(this.state.paused?this.state.pausedAt:now)+15_000;this.touch();return this.snapshot();
  }
  walk({position,enqueue=false}={}){
    this.advance();const grounded=this.navigation.ground(position);if(!grounded)throw Error('请选择可以行走的地面。');
    if(typeof enqueue!=='boolean')throw Error('Invalid walk queue option.');
    this.navigation.route(this.state.position,grounded);const now=this.state.updatedAt,task=this.makeTask(null,'walk','manual',now,grounded);
    if(enqueue&&this.state.current?.source==='manual'){if(this.state.queue.length>=MAX_QUEUE)throw Error('家园队列已满。');this.state.queue.push(task);}
    else{this.abandon('superseded',now);this.begin(task,now);if(this.state.paused)this.state.pausedAt=now;}
    this.state.manualUntil=(this.state.paused?this.state.pausedAt:now)+15_000;this.touch();return this.snapshot();
  }
  cancel(){this.advance();this.abandon('cancelled',this.state.updatedAt);this.state.manualUntil=(this.state.paused?this.state.pausedAt:this.state.updatedAt)+15_000;return this.snapshot();}
  pause(){this.advance();if(!this.state.paused){this.state.paused=true;this.state.pausedAt=this.state.updatedAt;this.touch();}return this.snapshot();}
  resume(){
    const now=Math.max(this.state.updatedAt,this.clock());
    if(this.state.paused){const shift=now-this.state.pausedAt,task=this.state.current;if(task){for(const key of ['startedAt','arrivalAt','endsAt'])task[key]+=shift;for(const point of task.route)point.at+=shift;}
      this.state.manualUntil+=shift;this.state.nextAutoAt+=shift;this.state.paused=false;this.state.updatedAt=now;this.touch();}
    return this.snapshot();
  }
  settings({autonomy}={}){
    if(typeof autonomy!=='boolean')throw Error('请选择是否开启自主生活。');this.advance();this.state.autonomy=autonomy;
    if(!autonomy&&this.state.current?.source==='autonomous')this.abandon('cancelled',this.state.updatedAt,false);
    this.state.nextAutoAt=(this.state.paused?this.state.pausedAt:this.state.updatedAt)+1000;this.touch();return this.snapshot();
  }
}
