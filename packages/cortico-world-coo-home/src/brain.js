import {createHash} from 'node:crypto';
import {HomeStore} from './storage.js';
import {safeError,checkAbort,settleWithin} from './model.js';

const clone=structuredClone,plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
export const BRAIN_DEFAULTS=Object.freeze({aiEnabled:false,intervalMinutes:30,dailyCalls:12,dailyReports:4,desktopReports:true});
const COOLDOWN=15*60_000;
const dayAt=(time,zone)=>{try{return new Intl.DateTimeFormat('en-CA',{timeZone:zone??'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(time);}catch{return new Date(time).toISOString().slice(0,10);}};
function validateSettings(patch,base=BRAIN_DEFAULTS){
  if(!plain(patch)||Object.keys(patch).some(key=>!Object.hasOwn(BRAIN_DEFAULTS,key)))throw safeError('HOME_SETTINGS','家园 AI 设置无效。');
  const value={...base,...patch};
  if(typeof value.aiEnabled!=='boolean'||typeof value.desktopReports!=='boolean'||!Number.isInteger(value.intervalMinutes)||value.intervalMinutes<5||value.intervalMinutes>1440||!Number.isInteger(value.dailyCalls)||value.dailyCalls<0||value.dailyCalls>100||!Number.isInteger(value.dailyReports)||value.dailyReports<0||value.dailyReports>24)throw safeError('HOME_SETTINGS','AI 间隔需为 5–1440 分钟，请求额度为 0–100，主动汇报额度为 0–24。');
  return value;
}
const initial=(time,zone,seen=[])=>({version:1,revision:0,settings:{...BRAIN_DEFAULTS},usage:{day:dayAt(time,zone),calls:0,reports:0},nextPlanAt:time+30*60_000,lastReportAt:0,seen:seen.slice(-256),outbox:null});
export function normalizeBrain(raw){
  if(plain(raw)&&Number.isInteger(raw.version)&&raw.version>1)throw safeError('HOME_SAVE_UNSUPPORTED','家园 AI 设置来自较新的版本，原文件已保留。');
  if(!plain(raw)||raw.version!==1||!plain(raw.usage)||!/^\d{4}-\d{2}-\d{2}$/.test(raw.usage.day)||!['calls','reports'].every(key=>Number.isSafeInteger(raw.usage[key])&&raw.usage[key]>=0)||!Number.isFinite(raw.nextPlanAt)||!Number.isFinite(raw.lastReportAt)||!Array.isArray(raw.seen)||raw.seen.length>256||raw.seen.some(id=>typeof id!=='string'||id.length>120))throw Error('Invalid home AI save');
  const settings=validateSettings(raw.settings),outbox=raw.outbox;
  if(outbox!==null&&(!plain(outbox)||!/^home-report:[a-f0-9]{24}$/.test(outbox.id)||!Number.isFinite(outbox.at)||!Array.isArray(outbox.eventIds)||outbox.eventIds.length>64||outbox.eventIds.some(id=>typeof id!=='string'||id.length>120)||typeof outbox.text!=='string'||outbox.text.length>500||typeof outbox.wake!=='boolean'))throw Error('Invalid home report');
  return{version:1,revision:Math.max(0,Math.floor(raw.revision??0)),settings,usage:{day:raw.usage.day,calls:raw.usage.calls,reports:raw.usage.reports},nextPlanAt:raw.nextPlanAt,lastReportAt:raw.lastReportAt,seen:[...new Set(raw.seen)],outbox:outbox?{id:outbox.id,at:outbox.at,eventIds:clone(outbox.eventIds),text:outbox.text,wake:outbox.wake}:null};
}

export class HomeBrain{
  constructor({dataDir,store,model,host={},clock=()=>Date.now(),timezone='UTC',context=()=>({}),tools=()=>[],canPlan=()=>false,guard=()=>()=>false,onChange=()=>{},visible=()=>false}={}){
    this.store=store??new HomeStore(dataDir,{name:'brain'});this.model=model;this.host=host;this.clock=clock;this.timezone=timezone;this.context=context;this.tools=tools;this.canPlan=canPlan;this.guard=guard;this.onChange=onChange;this.visible=visible;
    this.state=initial(clock(),timezone);this.tail=Promise.resolve();this.started=false;this.available=true;this.storageError=null;this.active=null;this.job=null;this.reporting=null;this.pending=new Set();this.ended=true;
  }
  async start(events=[]){
    try{this.state=await this.store.load(normalizeBrain)??initial(this.clock(),this.timezone,events.map(event=>event.id));await this.store.save(this.state);this.available=true;this.storageError=null;}
    catch{this.available=false;this.storageError='家园 AI 设置暂时无法读取或保存；原文件已保留，AI 与主动汇报已停用。';}
    this.started=true;
  }
  serial(action){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
  update(action){return this.serial(async()=>{
    if(!this.available)throw safeError('HOME_BRAIN_STORAGE',this.storageError);
    const previous=clone(this.state);
    try{this.day();const result=await action();this.state.revision++;await this.store.save(this.state);this.storageError=null;this.onChange();return result;}
    catch(error){this.state=previous;if(!error.code?.startsWith('HOME_')){this.storageError='家园 AI 设置暂时无法保存，暂不启动新的模型请求。';this.onChange();throw safeError('HOME_BRAIN_STORAGE',this.storageError);}throw error;}
  });}
  day(){const day=dayAt(this.clock(),this.timezone);if(day>this.state.usage.day)this.state.usage={day,calls:0,reports:0};}
  snapshot(){return{revision:this.state.revision,settings:clone(this.state.settings),usage:clone(this.state.usage),nextPlanAt:this.state.nextPlanAt,lastReportAt:this.state.lastReportAt,job:this.job?clone(this.job):null,storage:{ok:!this.storageError,message:this.storageError}};}
  async settings(patch){
    const next=validateSettings(patch,this.state.settings);this.cancel();
    await this.update(()=>{const was=this.state.settings.aiEnabled;this.state.settings=next;if(!was&&next.aiEnabled)this.state.nextPlanAt=this.clock()+5000;else this.state.nextPlanAt=Math.max(this.clock(),Math.min(this.state.nextPlanAt,this.clock()+next.intervalMinutes*60_000));});return this.snapshot();
  }
  cancel(){if(this.active){this.active.controller.abort();this.active=null;this.job={status:'cancelled',at:this.clock()};this.onChange();}}
  async reserveCall(active){
    checkAbort(active.controller.signal);
    await this.update(()=>{checkAbort(active.controller.signal);if(!active.valid())throw safeError('HOME_CANCELLED','家园状态已经变化，旧计划已丢弃。');if(this.state.usage.calls>=this.state.settings.dailyCalls)throw safeError('HOME_AI_BUDGET','今天的家园 AI 请求额度已用完，规则生活会继续。');this.state.usage.calls++;});
  }
  poll(){
    if(!this.started||!this.available)return;
    if(!this.reporting&&this.state.settings.desktopReports){const work=this.report().catch(()=>{}).finally(()=>{if(this.reporting===work)this.reporting=null;});this.reporting=work;}
    if(!this.active&&this.state.settings.aiEnabled&&this.clock()>=this.state.nextPlanAt&&this.canPlan()){
      const active={id:`plan-${this.clock()}-${this.state.revision}`,controller:new AbortController(),valid:this.guard(),acted:false};this.active=active;this.job={status:'running',at:this.clock()};this.onChange();
      active.promise=this.plan(active).finally(()=>this.pending.delete(active.promise));this.pending.add(active.promise);
    }
  }
  async plan(active){
    try{
      await this.update(()=>{checkAbort(active.controller.signal);this.state.nextPlanAt=this.clock()+this.state.settings.intervalMinutes*60_000;});
      checkAbort(active.controller.signal);
      const result=await this.model.run({records:[],system:'你是独立家园中的角色。根据当前生活状态选择一项轻量活动，可使用 coo_home 查看目录和状态。只安排一项家园动作，不访问桌面、文件或外部世界，不重复安排已经接受的任务。用户的手动操作永远优先。\n当前家园：'+JSON.stringify(this.context()),
        tools:this.tools(active),signal:active.controller.signal,sessionId:'coo-home/autonomy',beforeRespond:()=>this.reserveCall(active)
      });
      checkAbort(active.controller.signal);if(!active.valid())throw safeError('HOME_CANCELLED','旧计划已丢弃。');
      this.job={status:'done',at:this.clock(),acted:active.acted,calls:result.calls??0};
    }catch(error){if(this.active===active)this.job={status:error.code==='HOME_CANCELLED'||active.controller.signal.aborted?'cancelled':'error',at:this.clock(),error:error.code?.startsWith('HOME_')?error.message:'本次 AI 计划未完成，规则生活会继续。'};}
    finally{if(this.active===active)this.active=null;this.onChange();}
  }
  async report(){
    if(!this.host.pushEvent||!this.started||!this.state.settings.desktopReports)return;
    const events=(this.context().garden?.events??[]).filter(event=>!this.state.seen.includes(event.id));
    if(!this.state.outbox&&(!events.length||this.state.lastReportAt>0&&this.clock()-this.state.lastReportAt<COOLDOWN))return;
    if(!this.state.outbox){
      const ids=events.map(event=>event.id).sort(),ripe=events.filter(event=>event.kind==='ripe').length,harvest=events.filter(event=>event.kind==='harvest').length;
      await this.update(()=>{
        if(!this.started||!this.state.settings.desktopReports)throw safeError('HOME_CANCELLED','家园汇报已停止。');
        const wake=(this.visible()||this.state.settings.aiEnabled)&&this.state.usage.reports<this.state.settings.dailyReports;
        if(wake)this.state.usage.reports++;
        this.state.outbox={id:'home-report:'+createHash('sha256').update(ids.join('|')).digest('hex').slice(0,24),eventIds:ids,at:this.clock(),wake,text:`家园菜园近况：${[ripe?`${ripe} 块菜畦的作物已成熟`:null,harvest?`完成了 ${harvest} 次采收`:null].filter(Boolean).join('，')}。这是独立家园的状态，可以简短转告使用者，无需操作桌面角色。`};
      });
    }
    if(!this.started||!this.state.settings.desktopReports)return;
    const outbox=clone(this.state.outbox);
    const delivered=(await this.host.store?.range?.({source:'coo-home',senderKey:outbox.id,limit:1}))?.length>0;
    if(!delivered){
      const wake=outbox.wake&&(this.visible()||this.state.settings.aiEnabled);
      await this.host.pushEvent({type:'coo-home.garden',source:'coo-home',origin:'external',ts:new Date(outbox.at).toISOString(),senderKey:outbox.id,text:outbox.text,meta:{eventIds:outbox.eventIds}},{trigger:wake?'debounce':'piggyback'});
    }
    await this.update(()=>{if(this.state.outbox?.id!==outbox.id)return;this.state.seen=[...new Set([...this.state.seen,...outbox.eventIds])].slice(-256);this.state.lastReportAt=this.clock();this.state.outbox=null;});
  }
  async stop(){this.started=false;this.cancel();this.ended=await settleWithin([...this.pending,...(this.reporting?[this.reporting]:[])]);await this.tail;await this.store.flush?.();return this.ended;}
}
