import {AppearanceBridge,disconnected} from './appearance.js';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {HomeLife,normalizeLifeState} from './life.js';
import {HomeStore} from './storage.js';
import {CROP_CATALOG,validateCrop} from './garden.js';
import {HomeModel,safeError,checkAbort} from './model.js';
import {HomeChat} from './chat.js';
import {HomeBrain} from './brain.js';
import {HomePreferences,homePromptDocument} from './preferences.js';
import {HOME_DEFAULTS,HOME_SETTING_KEYS,homeConfigGroups,readHomeConfig,migrateHomeConfig} from './native-config.js';

const OPERATIONS=['status','catalog','command','gardenPlan','walk','cancel','pause','resume'];
const PARAMETERS={operation:{type:'string',enum:OPERATIONS},itemId:{type:['string','null']},actionId:{type:['string','null']},cropId:{type:['string','null'],enum:[...CROP_CATALOG.map(crop=>crop.id),null]},plotIds:{type:['array','null'],items:{type:'string'},minItems:1,maxItems:8},position:{type:['array','null'],items:{type:'number'},minItems:3,maxItems:3},enqueue:{type:['boolean','null']}};
const TOOL={name:'coo_home',strict:true,description:'查询和控制独立的 coo 家园。先用 catalog 找物件、动作和作物。不适用的字段填 null。command/walk 安排单项活动；gardenPlan 用 plotIds 和 cropId 一次安排最多8块田的播种及首次浇水，自动跳过已种同作物或被其他作物占用的田，不会铲除现有作物。批量种田必须用 gardenPlan，不能逐条发送互相覆盖的播种指令。回执 accepted/queued 仅表示安排，只有 recent 或 plans 的 completed 才表示完成。不会操作桌面角色或衣装。',tags:['read','act','write'],parameters:{type:'object',additionalProperties:false,required:Object.keys(PARAMETERS),properties:PARAMETERS}};
export const DESCRIBE=Object.freeze({tools:[TOOL],events:[{type:'coo-home.garden',description:'独立家园的作物成熟与采收近况；不会包含家园聊天记录。',trigger:'piggyback'}]});
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function toolArgs(value){
  if(!plain(value)||!OPERATIONS.includes(value.operation))throw safeError('HOME_COMMAND','请选择有效的家园操作。');
  if(Object.keys(value).some(key=>!Object.hasOwn(PARAMETERS,key)))throw safeError('HOME_COMMAND','家园操作包含不支持的参数。');
  // Responses strict schemas fill all optional slots. Only known null slots
  // mean omitted; unknown keys and unrelated non-null values still fail closed.
  value=Object.fromEntries(Object.entries(value).filter(([,entry])=>entry!==null));
  const allowed=value.operation==='command'?['operation','itemId','actionId','cropId','enqueue']:value.operation==='gardenPlan'?['operation','plotIds','cropId','enqueue']:value.operation==='walk'?['operation','position','enqueue']:['operation'];
  if(Object.keys(value).some(key=>!allowed.includes(key)))throw safeError('HOME_COMMAND','家园操作包含不支持的参数。');
  const args={operation:value.operation};
  if(value.operation==='command'){
    if(!['itemId','actionId'].every(key=>typeof value[key]==='string'&&value[key].length>0&&value[key].length<=96))throw safeError('HOME_COMMAND','请选择目录中的物件与动作。');args.itemId=value.itemId;args.actionId=value.actionId;
    if(value.cropId!==undefined)args.cropId=validateCrop(value.cropId);
  }
  if(value.operation==='gardenPlan'){
    if(!Array.isArray(value.plotIds)||value.plotIds.length<1||value.plotIds.length>8||value.plotIds.some(id=>typeof id!=='string'||!/^plot-[1-8]$/.test(id))||new Set(value.plotIds).size!==value.plotIds.length)throw safeError('HOME_COMMAND','请选择1–8块不重复的菜畦。');
    args.plotIds=[...value.plotIds];args.cropId=validateCrop(value.cropId);
  }
  if(value.operation==='walk'){
    if(!Array.isArray(value.position)||value.position.length!==3||!value.position.every(Number.isFinite))throw safeError('HOME_COMMAND','请选择有效的家园位置。');args.position=[...value.position];
  }
  if(['command','gardenPlan','walk'].includes(value.operation)){if(value.enqueue!==undefined&&typeof value.enqueue!=='boolean')throw safeError('HOME_COMMAND','排队参数必须是开关。');args.enqueue=value.enqueue??false;}
  return args;
}

export class CooHomeWorld{
  id='coo-home';
  constructor(ctx,{bridgeFactory=options=>new AppearanceBridge(options),clock=()=>Date.now(),layout=null,storage=null,chatStorage=null,brainStorage=null,preferencesStorage=null,modelFactory=options=>new HomeModel(options)}={}){
    this.ctx=ctx;this.bridgeFactory=bridgeFactory;this.bridge=null;this.clock=clock;this.layout=layout;this.storage=storage;this.chatStorage=chatStorage;this.brainStorage=brainStorage;this.preferencesStorage=preferencesStorage;this.modelFactory=modelFactory;
    this.clients=new Set();this.clientPanels=new Map();this.presence=new Map();this.started=false;this.tail=Promise.resolve();this.life=null;this.timer=null;this.savedAt=0;this.storageError=false;this.manualEpoch=0;this.lifecycle=0;this.chat=null;this.brain=null;this.preferences=null;this.model=null;this.host={};this.modelsEnded=true;this.nativeConfig=false;this.configApplied=null;
  }
  serial(action){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
  start(host={}){return this.serial(async()=>{
    if(this.started)return;
    this.life=null;this.host=host;this.lifecycle++;
    this.layout??=JSON.parse(await readFile(new URL('../data/home-layout.json',import.meta.url),'utf8'));
    this.storage??=new HomeStore(this.ctx.dataDir);
    let saved;try{saved=await this.storage.load(raw=>normalizeLifeState(raw,this.layout,this.clock()));}catch(error){this.storageError=true;throw error;}
    this.life=new HomeLife({layout:this.layout,state:saved,clock:this.clock});
    this.recovery=this.storage.recovery;this.life.advance(this.clock(),{offline:true});await this.persist();
    this.model=this.modelFactory({ctx:this.ctx,host,clock:this.clock});
    this.preferences=new HomePreferences({dataDir:this.ctx.dataDir,store:this.preferencesStorage,clock:this.clock,onChange:()=>this.send({phase:'environment',environment:this.preferences.snapshot()})});
    await this.preferences.start();
    this.chat=new HomeChat({dataDir:this.ctx.dataDir,store:this.chatStorage,model:this.model,clock:this.clock,onChange:()=>this.send({phase:'chat',chat:this.chat.snapshot()}),beforeTurn:()=>{this.manual();return{manualEpoch:this.manualEpoch,lifecycle:this.lifecycle};},tools:active=>this.localTools('chat',active),system:()=>this.chatSystem()});
    this.brain=new HomeBrain({dataDir:this.ctx.dataDir,store:this.brainStorage,model:this.model,host,clock:this.clock,timezone:this.ctx.timezone,visible:()=>this.visible(),context:()=>this.homeView(true),environment:()=>this.preferences.text(this.envPromptVars()),canPlan:()=>this.canPlan(),guard:()=>this.planGuard(),tools:active=>this.localTools('autonomous',active),onChange:()=>this.send({phase:'brain',brain:this.brain.snapshot()})});
    await this.chat.start();await this.brain.start(this.life.snapshot().garden.events);
    this.nativeConfig=await migrateHomeConfig(this.ctx,{autonomy:this.life.state.autonomy,brain:this.brain.state.settings});this.configApplied=null;await this.applyNativeConfig();
    this.started=true;this.modelsEnded=true;
    this.bridge=this.bridgeFactory({botDir:this.ctx.botDir,onChange:()=>this.broadcast(true)});
    try{await this.bridge.start();this.timer=setInterval(()=>{void this.tick().catch(()=>{});},1000);this.timer.unref?.();}
    catch{this.started=false;await this.bridge.stop();this.bridge=null;await this.chat.stop();await this.brain.stop();await this.preferences.stop();await this.model.close();throw Error('The home appearance connection could not start.');}
  });}
  stop(){
    this.started=false;this.lifecycle++;clearInterval(this.timer);this.timer=null;this.brain?.cancel();this.chat?.active?.controller.abort();
    return this.serial(async()=>{
      // A start already in the queue may have finished after stop was called.
      this.started=false;this.lifecycle++;clearInterval(this.timer);this.timer=null;this.brain?.cancel();this.chat?.active?.controller.abort();
      const settled=await Promise.allSettled([this.chat?.stop(),this.brain?.stop(),this.preferences?.stop()]);this.modelsEnded=settled.every(row=>row.status==='fulfilled'&&row.value!==false);
      try{if(this.model){const closed=await this.model.close();this.modelsEnded=closed!==false&&this.modelsEnded;}}catch{this.modelsEnded=false;}
      try{if(this.life){this.life.advance(this.clock());await this.persist();await this.storage.flush?.();}}finally{
        await this.bridge?.stop();this.bridge=null;this.broadcast(true);
        for(const socket of this.clients){try{socket.close('Home World stopped.');}catch{}}
        this.clients.clear();this.clientPanels.clear();this.presence.clear();
      }
    });
  }
  visible(){return[...this.presence.values()].some(Boolean);}
  manual(){this.manualEpoch++;this.brain?.cancel();}
  canPlan(){return this.started&&!!this.life&&this.preferences?.snapshot().storage.editable!==false&&!this.life.state.paused&&this.life.state.autonomy&&!this.chat?.active&&this.clock()>=this.life.state.manualUntil&&this.life.state.current?.source!=='manual'&&!this.life.state.queue.some(task=>task.source==='manual');}
  planGuard(){const epoch=this.manualEpoch,lifecycle=this.lifecycle;return()=>this.lifecycle===lifecycle&&this.manualEpoch===epoch&&this.brain?.state.settings.aiEnabled&&this.canPlan();}
  lifeStatus(){return this.life?{...this.life.snapshot(),storage:{ok:!this.storageError,savedAt:this.savedAt,recovery:this.recovery??'new',message:this.storageError?'家园进度暂时无法保存，请检查可用磁盘空间。':null}}:null;}
  status(){return{phase:'life',appearance:this.bridge?.snapshot()??disconnected('家园尚未连接桌宠服务。'),life:this.lifeStatus(),chat:this.chat?.snapshot()??null,brain:this.brain?.snapshot()??null};}
  panelValue(panel,value){
    const keys=panel==='settings'?['life','brain']:panel==='environment'?['environment']:['appearance','life','chat','brain'];
    const result={phase:value.phase};for(const key of keys)if(value[key]!==undefined)result[key]=value[key];return Object.keys(result).length>1?result:null;
  }
  panelStatus(panel){return panel==='environment'?{phase:'environment',environment:this.preferences?.snapshot()??null}:panel==='settings'?{phase:'settings',life:this.lifeStatus(),brain:this.brain?.snapshot()??null}:this.status();}
  send(value){
    for(const socket of this.clients){
      if(!socket.open){this.clients.delete(socket);this.clientPanels.delete(socket);this.presence.delete(socket);continue;}
      const scoped=this.panelValue(this.clientPanels.get(socket)??'home',value);if(!scoped)continue;
      try{socket.send(JSON.stringify(scoped));}catch{this.clients.delete(socket);this.clientPanels.delete(socket);this.presence.delete(socket);try{socket.close('Home stream unavailable.');}catch{}}
    }
  }
  broadcast(full=false){this.send(full?this.status():{phase:'life',life:this.lifeStatus()});}
  async persist(){try{await this.storage.save(this.life.export());this.savedAt=this.clock();this.storageError=false;}catch{this.storageError=true;throw safeError('HOME_SAVE','家园进度暂时无法保存。');}}
  async applyNativeConfig(){
    if(!this.nativeConfig)return;
    const values=readHomeConfig(this.ctx.cfg),signature=JSON.stringify(values);if(signature===this.configApplied)return;
    this.manual();
    if(this.life.state.autonomy!==values.autonomy){const previous=this.life.export();try{this.life.settings({autonomy:values.autonomy});await this.persist();}catch(error){this.life=new HomeLife({layout:this.layout,state:previous,clock:this.clock});throw error;}}
    const brain=Object.fromEntries(HOME_SETTING_KEYS.filter(key=>key!=='autonomy').map(key=>[key,values[key]]));
    if(Object.keys(brain).some(key=>this.brain.state.settings[key]!==brain[key]))await this.brain.settings(brain);
    this.configApplied=signature;
  }
  configure(patch,kind){
    if(!plain(patch)||Object.keys(patch).some(key=>!(kind==='life'?['autonomy']:HOME_SETTING_KEYS.filter(key=>key!=='autonomy')).includes(key)))return Promise.reject(safeError('HOME_CONFIG','家园配置包含不支持的选项。'));
    if(!this.nativeConfig){if(kind==='life')return this.control('settings',[patch]);this.manual();return this.brain.settings(patch).then(brain=>({phase:'brain',brain}));}
    this.manual();return this.serial(async()=>{
      if(!this.started)throw safeError('HOME_DISABLED','请先启用家园。');
      readHomeConfig({...this.ctx.cfg,...patch});await this.ctx.persist(patch);await this.applyNativeConfig();this.broadcast();return kind==='life'?this.status():{phase:'brain',brain:this.brain.snapshot()};
    });
  }
  async tick(){
    const result=await this.serial(async()=>{
      if(!this.started||!this.life)return;
      await this.applyNativeConfig();
      const current=this.life.state.current?.id,phase=this.life.snapshot().current?.phase;
      this.life.advance(this.clock(),{visible:this.visible()});
      try{if(this.clock()-this.savedAt>=5000||current!==this.life.state.current?.id||phase!==this.life.snapshot().current?.phase)await this.persist();}
      finally{this.broadcast();}return this.status();
    });
    if(this.started)this.brain?.poll();return result;
  }
  control(method,args){
    this.manual();
    return this.serial(async()=>{
      if(!this.started||!this.life)throw safeError('HOME_DISABLED','请先启用家园。');
      const previous=this.life.export();
      try{this.life[method](...args);await this.persist();}catch(error){this.life=new HomeLife({layout:this.layout,state:previous,clock:this.clock});this.broadcast();throw error;}
      this.broadcast();return this.status();
    });
  }
  homeView(withEvents=false){
    if(!this.life)return null;
    const state=this.life.snapshot(),brief=task=>task?Object.fromEntries(['id','itemId','actionId','cropId','planId','label','source','phase','arrivalAt','endsAt'].filter(key=>task[key]!==undefined).map(key=>[key,task[key]])):null;
    return{now:state.now,paused:state.paused,autonomy:state.autonomy,position:state.position,needs:state.needs,current:brief(state.current),queue:state.queue.map(brief),plans:state.plans,recent:state.recent,items:state.items,inventory:state.inventory,garden:{plots:state.garden.plots,crops:state.garden.crops,totalHarvests:state.garden.totalHarvests,...(withEvents?{events:state.garden.events}:{})}};
  }
  catalogItems(){return(this.life?.catalog??[]).map(item=>{const plot=this.life.state.garden.plots.find(plot=>plot.id===item.id);return{...structuredClone(item),...(plot?{cropId:plot.cropId,cropLabel:CROP_CATALOG.find(crop=>crop.id===plot.cropId)?.label??null}:{})};});}
  toolCatalog(){return{crops:structuredClone(CROP_CATALOG),items:this.catalogItems().map(item=>({id:item.id,label:item.label,room:item.room,kind:item.kind,...(item.kind==='plot'?{cropId:item.cropId,cropLabel:item.cropLabel}:{}),actions:item.actions.map(action=>({id:action.id,canonicalId:action.canonical,label:action.label,description:action.description}))}))};}
  chatSystem(){return'你是独立的 coo 家园中的陪伴角色。自然聊天，也可以通过 coo_home 工具安排走动、家具活动或种菜。你只知道家园历史，不具有桌面主会话历史。禁止声称正在控制桌面原角色、修改外观或读写文件。先查 catalog 获取合法动作，不猜物件 ID。多块田播种及首次浇水使用一次 gardenPlan；逐项报告 skipped 的原因，不得声称占用的田已被重新播种。工具返回 accepted/queued 仅表示任务已安排，只有当前状态 recent 或 plans 中 completed 才能说已完成。模型出错或停止回复不会自动撤销已接受的家园任务。\n家园环境说明：\n'+this.preferences.text(this.envPromptVars())+'\n当前家园：'+JSON.stringify(this.homeView());}
  localTools(source,active){return[{...TOOL,handler:(args,context)=>this.runTool(args,context,{source,active})}];}
  tools(){return[{...TOOL,handler:(args,context={})=>this.runTool(args,context,{source:'desktop'})}];}
  async runTool(raw,context={},mode={source:'desktop'}){
    try{
      const args=toolArgs(raw);checkAbort(context.signal);
      const result=await this.serial(async()=>{
        checkAbort(context.signal);if(!this.started||!this.life)throw safeError('HOME_DISABLED','请先启用家园。');
        if(mode.source==='chat'&&(this.chat?.active!==mode.active||mode.active.controller.signal.aborted))throw safeError('HOME_CANCELLED','这条聊天请求已经停止，动作未执行。');
        if(mode.source==='autonomous'&&(!mode.active.valid()||mode.active.controller.signal.aborted))throw safeError('HOME_CANCELLED','家园状态已经变化，旧计划已丢弃。');
        if(args.operation==='status')return{ok:true,life:this.homeView()};
        if(args.operation==='catalog')return{ok:true,...this.toolCatalog()};
        if(mode.source==='chat'&&(mode.active.manualEpoch!==this.manualEpoch||mode.active.lifecycle!==this.lifecycle))throw safeError('HOME_CANCELLED','已经收到更新的手动操作，这条旧聊天中的动作未执行。');
        const fingerprint=JSON.stringify(args),callId=context.callId;
        const key=typeof callId==='string'&&callId.length<=160?createHash('sha256').update(JSON.stringify([mode.source,mode.active?.id??context.role??'',mode.source==='desktop'&&Number.isSafeInteger(context.round)?context.round:null,callId])).digest('hex'):null;
        const previousReceipt=key?this.life.state.receipts.find(row=>row.key===key):null;
        if(previousReceipt){if(previousReceipt.fingerprint!==fingerprint)throw safeError('HOME_COMMAND','重复的工具编号不能更换参数。');return{...previousReceipt.result,duplicate:true,life:this.homeView()};}
        if(mode.source==='autonomous'&&(!['command','walk'].includes(args.operation)||args.enqueue||mode.active.acted))throw safeError('HOME_COMMAND','每次 AI 计划只允许安排一项家园动作。');
        if(mode.source!=='autonomous'){this.manual();if(mode.source==='chat')mode.active.manualEpoch=this.manualEpoch;}
        const previous=this.life.export();let value;
        try{
          checkAbort(context.signal);
          const effective={...args};
          // One user's chat turn can describe a sequence. Subsequent tool calls
          // append only while work accepted by this exact turn is still active;
          // a later mouse command/turn still supersedes the entire queue.
          const ownPending=mode.source==='chat'&&[this.life.state.current,...this.life.state.queue].some(task=>task&&mode.active.acceptedTaskIds?.has(task.id));
          if(ownPending&&['command','gardenPlan','walk'].includes(args.operation))effective.enqueue=true;
          if(mode.source==='autonomous')this.life.autonomous(args);
          else if(args.operation==='gardenPlan')value=this.life.gardenPlan(effective);
          else if(['command','walk'].includes(args.operation))this.life[args.operation](effective);
          else this.life[args.operation]();
          if(['command','walk'].includes(args.operation)){
            const task=effective.enqueue&&this.life.state.queue.length?this.life.state.queue.at(-1):this.life.state.current;
            value={ok:true,accepted:true,taskId:task.id,outcome:task===this.life.state.current?'accepted':'queued'};
          }else if(args.operation!=='gardenPlan')value={ok:true,outcome:{cancel:'cancelled',pause:'paused',resume:'resumed'}[args.operation]};
          if(key){this.life.state.receipts.push({key,fingerprint,result:value});this.life.state.receipts=this.life.state.receipts.slice(-128);}
          await this.persist();if(mode.source==='autonomous')mode.active.acted=true;
          if(mode.source==='chat'&&value.accepted){mode.active.acceptedTaskIds??=new Set();for(const id of value.taskIds??[value.taskId])mode.active.acceptedTaskIds.add(id);}
        }catch(error){this.life=new HomeLife({layout:this.layout,state:previous,clock:this.clock});this.broadcast();throw error;}
        this.broadcast();return{...value,life:this.homeView()};
      });
      return{text:JSON.stringify(result)};
    }catch(error){return{failed:true,text:JSON.stringify({ok:false,error:error.code?.startsWith('HOME_')||error.code==='GARDEN_STAGE'?error.message:'家园没有接受这条操作，请先查看目录和当前状态。'})};}
  }
  envPromptVars(){
    if(!this.life)return{'home.activity':'','home.needs':'','home.garden':'','home.inventory':''};
    const state=this.life.snapshot(),stages={empty:'空田',seeded:'已播种，等待首次浇水',seedling:'幼苗',growing:'生长中',ripe:'已成熟'};
    return{'home.activity':state.paused?'家园已暂停':state.current?.label??'正在家园休息','home.needs':Object.entries({energy:'精力',hunger:'饱腹',hygiene:'整洁',comfort:'舒适'}).map(([key,label])=>`${label} ${Math.round(state.needs[key]??0)}/100`).join('，'),'home.garden':state.garden.plots.map((plot,index)=>`菜畦 ${index+1}：${CROP_CATALOG.find(crop=>crop.id===plot.cropId)?.label??''}${stages[plot.stage]??''}`).join('\n'),'home.inventory':state.inventory?.items.map(item=>`${item.label} ${item.quantity}${item.unit}`).join('\n')??''};
  }
  webUi(language='zh'){
    const zh=language!=='en';
    const methods={home:['status','catalog','command','walk','settings','cancel','pause','resume','speechUnits','speechBank','soundAsset','chatSend','chatCancel','chatHistory','chatClear','brainSettings']},prompt=homePromptDocument(this.ctx.dataDir,language);
    return{label:zh?'coo家园':'Coo Home',panels:[{id:'home',title:zh?'家园':'Home'}],config:homeConfigGroups(language),promptDocs:prompt?[prompt]:[],invoke:async(panel,method,args=[])=>{
      if(!Object.hasOwn(methods,panel)||!methods[panel].includes(method)||!Array.isArray(args))throw Error('Unsupported home request.');
      if(method==='status'&&!args.length){await this.tick();return this.panelStatus(panel);}
      if(method==='catalog'&&!args.length)return{items:this.catalogItems(),crops:structuredClone(CROP_CATALOG)};
      if(['command','walk'].includes(method)&&args.length===1)return this.control(method,args);
      if(method==='settings'&&args.length===1)return this.configure(args[0],'life');
      if(['cancel','pause','resume'].includes(method)&&!args.length)return this.control(method,args);
      if(!this.started)throw safeError('HOME_DISABLED','请先启用家园。');
      if(['speechUnits','speechBank','soundAsset'].includes(method)&&args.length===1&&plain(args[0]))return this.bridge[method](args[0]);
      if(method==='chatSend'&&args.length===1)return{phase:'chat',...await this.chat.send(args[0])};
      if(method==='chatCancel'&&args.length===1)return{phase:'chat',chat:await this.chat.cancel(args[0])};
      if(method==='chatHistory'&&!args.length)return{phase:'chat',chat:this.chat.snapshot()};
      if(method==='chatClear'&&!args.length)return{phase:'chat',chat:await this.chat.clear()};
      if(method==='brainSettings'&&args.length===1)return this.configure(args[0],'brain');
      throw Error('Unsupported home request.');
    },stream:(panel,socket)=>{
      if(!Object.hasOwn(methods,panel)||!this.started){socket.close('Home stream unavailable.');return;}
      this.clients.add(socket);this.clientPanels.set(socket,panel);if(panel==='home')this.presence.set(socket,false);socket.onClose(()=>{this.clients.delete(socket);this.clientPanels.delete(socket);this.presence.delete(socket);});
      if(panel==='home')socket.onMessage?.(text=>{if(typeof text!=='string'||text.length>256)return;try{const message=JSON.parse(text);if(message.type==='presence'&&typeof message.visible==='boolean')this.presence.set(socket,message.visible);}catch{}});
      try{socket.send(JSON.stringify(this.panelStatus(panel)));}catch{this.clients.delete(socket);this.clientPanels.delete(socket);this.presence.delete(socket);socket.close('Home stream unavailable.');}
    }};
  }
  shutdownVerification(){return[{key:'appearance-watcher',label:'Home appearance watcher',status:this.started?'still-live':'verified-ended',detail:this.started?'Home watcher is active.':'Home watcher and panel streams are closed.',manualAction:this.started?'Disable the Home World.':''},{key:'home-save',label:'Home progress',status:this.storageError?'unknown':this.started?'still-live':'verified-ended',detail:this.storageError?'The latest household progress could not be saved.':'Household save completed.',manualAction:this.storageError?'Check available disk space and enable the Home World again.':''},{key:'home-model',label:'Home model requests',status:this.started?'still-live':this.modelsEnded?'verified-ended':'unknown',detail:this.modelsEnded?'Home requests ended.':'A provider has not confirmed that its request ended.',manualAction:this.modelsEnded?'':'Close the host if the provider remains unresponsive.'}];}
}

export default{id:'coo-home',label:'coo家园',defaults:()=>({...HOME_DEFAULTS}),create:ctx=>new CooHomeWorld(ctx),describe:DESCRIBE};
