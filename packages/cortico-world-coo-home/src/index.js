import {AppearanceBridge,disconnected} from './appearance.js';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {HomeLife,normalizeLifeState} from './life.js';
import {HomeStore} from './storage.js';
import {HomeModel,safeError,checkAbort} from './model.js';
import {HomeChat} from './chat.js';
import {HomeBrain} from './brain.js';

const OPERATIONS=['status','catalog','command','walk','cancel','pause','resume'];
const TOOL={name:'coo_home',description:'查询和控制独立的 coo 家园。先用 catalog 找到物件和动作，command/walk 返回接受或排队回执，只有 recent 的 completed 表示已完成。本工具不会操作桌面角色或衣装。',tags:['read','act','write'],parameters:{type:'object',additionalProperties:false,required:['operation'],properties:{operation:{type:'string',enum:OPERATIONS},itemId:{type:'string'},actionId:{type:'string'},position:{type:'array',items:{type:'number'},minItems:3,maxItems:3},enqueue:{type:'boolean'}}}};
export const DESCRIBE=Object.freeze({tools:[TOOL],events:[{type:'coo-home.garden',description:'独立家园的作物成熟与采收近况；不会包含家园聊天记录。',trigger:'piggyback'}]});
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
function toolArgs(value){
  if(!plain(value)||!OPERATIONS.includes(value.operation))throw safeError('HOME_COMMAND','请选择有效的家园操作。');
  const allowed=value.operation==='command'?['operation','itemId','actionId','enqueue']:value.operation==='walk'?['operation','position','enqueue']:['operation'];
  if(Object.keys(value).some(key=>!allowed.includes(key)))throw safeError('HOME_COMMAND','家园操作包含不支持的参数。');
  const args={operation:value.operation};
  if(value.operation==='command'){
    if(!['itemId','actionId'].every(key=>typeof value[key]==='string'&&value[key].length>0&&value[key].length<=96))throw safeError('HOME_COMMAND','请选择目录中的物件与动作。');args.itemId=value.itemId;args.actionId=value.actionId;
  }
  if(value.operation==='walk'){
    if(!Array.isArray(value.position)||value.position.length!==3||!value.position.every(Number.isFinite))throw safeError('HOME_COMMAND','请选择有效的家园位置。');args.position=[...value.position];
  }
  if(['command','walk'].includes(value.operation)){if(value.enqueue!==undefined&&typeof value.enqueue!=='boolean')throw safeError('HOME_COMMAND','排队参数必须是开关。');args.enqueue=value.enqueue??false;}
  return args;
}

export class CooHomeWorld{
  id='coo-home';
  constructor(ctx,{bridgeFactory=options=>new AppearanceBridge(options),clock=()=>Date.now(),layout=null,storage=null,chatStorage=null,brainStorage=null,modelFactory=options=>new HomeModel(options)}={}){
    this.ctx=ctx;this.bridgeFactory=bridgeFactory;this.bridge=null;this.clock=clock;this.layout=layout;this.storage=storage;this.chatStorage=chatStorage;this.brainStorage=brainStorage;this.modelFactory=modelFactory;
    this.clients=new Set();this.presence=new Map();this.started=false;this.tail=Promise.resolve();this.life=null;this.timer=null;this.savedAt=0;this.storageError=false;this.manualEpoch=0;this.lifecycle=0;this.chat=null;this.brain=null;this.model=null;this.host={};this.modelsEnded=true;
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
    this.chat=new HomeChat({dataDir:this.ctx.dataDir,store:this.chatStorage,model:this.model,clock:this.clock,onChange:()=>this.send({phase:'chat',chat:this.chat.snapshot()}),beforeTurn:()=>{this.manual();return{manualEpoch:this.manualEpoch,lifecycle:this.lifecycle};},tools:active=>this.localTools('chat',active),system:()=>this.chatSystem()});
    this.brain=new HomeBrain({dataDir:this.ctx.dataDir,store:this.brainStorage,model:this.model,host,clock:this.clock,timezone:this.ctx.timezone,visible:()=>this.visible(),context:()=>this.homeView(true),canPlan:()=>this.canPlan(),guard:()=>this.planGuard(),tools:active=>this.localTools('autonomous',active),onChange:()=>this.send({phase:'brain',brain:this.brain.snapshot()})});
    await this.chat.start();await this.brain.start(this.life.snapshot().garden.events);
    this.started=true;this.modelsEnded=true;
    this.bridge=this.bridgeFactory({botDir:this.ctx.botDir,onChange:()=>this.broadcast(true)});
    try{await this.bridge.start();this.timer=setInterval(()=>{void this.tick().catch(()=>{});},1000);this.timer.unref?.();}
    catch{this.started=false;await this.bridge.stop();this.bridge=null;await this.chat.stop();await this.brain.stop();await this.model.close();throw Error('The home appearance connection could not start.');}
  });}
  stop(){
    this.started=false;this.lifecycle++;clearInterval(this.timer);this.timer=null;this.brain?.cancel();this.chat?.active?.controller.abort();
    return this.serial(async()=>{
      // A start already in the queue may have finished after stop was called.
      this.started=false;this.lifecycle++;clearInterval(this.timer);this.timer=null;this.brain?.cancel();this.chat?.active?.controller.abort();
      const settled=await Promise.allSettled([this.chat?.stop(),this.brain?.stop()]);this.modelsEnded=settled.every(row=>row.status==='fulfilled'&&row.value!==false);
      try{if(this.model){const closed=await this.model.close();this.modelsEnded=closed!==false&&this.modelsEnded;}}catch{this.modelsEnded=false;}
      try{if(this.life){this.life.advance(this.clock());await this.persist();await this.storage.flush?.();}}finally{
        await this.bridge?.stop();this.bridge=null;this.broadcast(true);
        for(const socket of this.clients){try{socket.close('Home World stopped.');}catch{}}
        this.clients.clear();this.presence.clear();
      }
    });
  }
  visible(){return[...this.presence.values()].some(Boolean);}
  manual(){this.manualEpoch++;this.brain?.cancel();}
  canPlan(){return this.started&&!!this.life&&!this.life.state.paused&&this.life.state.autonomy&&!this.chat?.active&&this.clock()>=this.life.state.manualUntil&&this.life.state.current?.source!=='manual'&&!this.life.state.queue.some(task=>task.source==='manual');}
  planGuard(){const epoch=this.manualEpoch,lifecycle=this.lifecycle;return()=>this.lifecycle===lifecycle&&this.manualEpoch===epoch&&this.brain?.state.settings.aiEnabled&&this.canPlan();}
  lifeStatus(){return this.life?{...this.life.snapshot(),storage:{ok:!this.storageError,savedAt:this.savedAt,recovery:this.recovery??'new',message:this.storageError?'家园进度暂时无法保存，请检查可用磁盘空间。':null}}:null;}
  status(){return{phase:'life',appearance:this.bridge?.snapshot()??disconnected('家园尚未连接桌宠服务。'),life:this.lifeStatus(),chat:this.chat?.snapshot()??null,brain:this.brain?.snapshot()??null};}
  send(value){
    const text=JSON.stringify(value);
    for(const socket of this.clients){
      if(!socket.open){this.clients.delete(socket);this.presence.delete(socket);continue;}
      try{socket.send(text);}catch{this.clients.delete(socket);this.presence.delete(socket);try{socket.close('Home stream unavailable.');}catch{}}
    }
  }
  broadcast(full=false){this.send(full?this.status():{phase:'life',life:this.lifeStatus()});}
  async persist(){try{await this.storage.save(this.life.export());this.savedAt=this.clock();this.storageError=false;}catch{this.storageError=true;throw safeError('HOME_SAVE','家园进度暂时无法保存。');}}
  async tick(){
    const result=await this.serial(async()=>{
      if(!this.started||!this.life)return;
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
    const state=this.life.snapshot(),brief=task=>task?Object.fromEntries(['id','itemId','actionId','label','source','phase','arrivalAt','endsAt'].filter(key=>task[key]!==undefined).map(key=>[key,task[key]])):null;
    return{now:state.now,paused:state.paused,autonomy:state.autonomy,position:state.position,needs:state.needs,current:brief(state.current),queue:state.queue.map(brief),recent:state.recent,items:state.items,garden:{plots:state.garden.plots,totalHarvests:state.garden.totalHarvests,...(withEvents?{events:state.garden.events}:{})}};
  }
  toolCatalog(){return{items:(this.life?.catalog??[]).map(item=>({id:item.id,label:item.label,room:item.room,kind:item.kind,actions:item.actions.map(action=>({id:action.id,canonicalId:action.canonical,label:action.label,description:action.description}))}))};}
  chatSystem(){return'你是独立的 coo 家园中的陪伴角色。自然聊天，也可以通过 coo_home 工具安排走动、家具活动或种菜。你只知道家园历史，不具有桌面主会话历史。禁止声称正在控制桌面原角色、修改外观或读写文件。先查 catalog 获取合法动作，不猜物件 ID。工具返回 accepted/queued 仅表示任务已安排，只有当前状态 recent 中 completed 才能说已完成。模型出错或停止回复不会自动撤销已接受的家园任务。\n当前家园：'+JSON.stringify(this.homeView());}
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
          if(mode.source==='autonomous')this.life.autonomous(args);
          else if(['command','walk'].includes(args.operation))this.life[args.operation](args);
          else this.life[args.operation]();
          if(['command','walk'].includes(args.operation)){
            const task=args.enqueue&&this.life.state.queue.length?this.life.state.queue.at(-1):this.life.state.current;
            value={ok:true,accepted:true,taskId:task.id,outcome:task===this.life.state.current?'accepted':'queued'};
          }else value={ok:true,outcome:{cancel:'cancelled',pause:'paused',resume:'resumed'}[args.operation]};
          if(key){this.life.state.receipts.push({key,fingerprint,result:value});this.life.state.receipts=this.life.state.receipts.slice(-128);}
          await this.persist();if(mode.source==='autonomous')mode.active.acted=true;
        }catch(error){this.life=new HomeLife({layout:this.layout,state:previous,clock:this.clock});this.broadcast();throw error;}
        this.broadcast();return{...value,life:this.homeView()};
      });
      return{text:JSON.stringify(result)};
    }catch(error){return{failed:true,text:JSON.stringify({ok:false,error:error.code?.startsWith('HOME_')||error.code==='GARDEN_STAGE'?error.message:'家园没有接受这条操作，请先查看目录和当前状态。'})};}
  }
  envPromptVars(){return null;}
  webUi(language='zh'){
    const zh=language!=='en';
    return{label:zh?'coo家园':'Coo Home',panels:[{id:'home',title:zh?'家园':'Home'}],invoke:async(panel,method,args=[])=>{
      if(panel!=='home'||!Array.isArray(args))throw Error('Unsupported home request.');
      if(method==='status'&&!args.length){await this.tick();return this.status();}
      if(method==='catalog'&&!args.length)return{items:structuredClone(this.life?.catalog??[])};
      if(['command','walk','settings'].includes(method)&&args.length===1)return this.control(method,args);
      if(['cancel','pause','resume'].includes(method)&&!args.length)return this.control(method,args);
      if(!this.started)throw safeError('HOME_DISABLED','请先启用家园。');
      if(['speechUnits','speechBank','soundAsset'].includes(method)&&args.length===1&&plain(args[0]))return this.bridge[method](args[0]);
      if(method==='chatSend'&&args.length===1)return{phase:'chat',...await this.chat.send(args[0])};
      if(method==='chatCancel'&&args.length===1)return{phase:'chat',chat:await this.chat.cancel(args[0])};
      if(method==='chatHistory'&&!args.length)return{phase:'chat',chat:this.chat.snapshot()};
      if(method==='chatClear'&&!args.length)return{phase:'chat',chat:await this.chat.clear()};
      if(method==='brainSettings'&&args.length===1){this.manual();return{phase:'brain',brain:await this.brain.settings(args[0])};}
      throw Error('Unsupported home request.');
    },stream:(panel,socket)=>{
      if(panel!=='home'||!this.started){socket.close('Home stream unavailable.');return;}
      this.clients.add(socket);this.presence.set(socket,false);socket.onClose(()=>{this.clients.delete(socket);this.presence.delete(socket);});
      socket.onMessage?.(text=>{if(typeof text!=='string'||text.length>256)return;try{const message=JSON.parse(text);if(message.type==='presence'&&typeof message.visible==='boolean')this.presence.set(socket,message.visible);}catch{}});
      try{socket.send(JSON.stringify(this.status()));}catch{this.clients.delete(socket);this.presence.delete(socket);socket.close('Home stream unavailable.');}
    }};
  }
  shutdownVerification(){return[{key:'appearance-watcher',label:'Home appearance watcher',status:this.started?'still-live':'verified-ended',detail:this.started?'Home watcher is active.':'Home watcher and panel streams are closed.',manualAction:this.started?'Disable the Home World.':''},{key:'home-save',label:'Home progress',status:this.storageError?'unknown':this.started?'still-live':'verified-ended',detail:this.storageError?'The latest household progress could not be saved.':'Household save completed.',manualAction:this.storageError?'Check available disk space and enable the Home World again.':''},{key:'home-model',label:'Home model requests',status:this.started?'still-live':this.modelsEnded?'verified-ended':'unknown',detail:this.modelsEnded?'Home requests ended.':'A provider has not confirmed that its request ended.',manualAction:this.modelsEnded?'':'Close the host if the provider remains unresponsive.'}];}
}

export default{id:'coo-home',label:'coo家园',defaults:()=>({enabled:false}),create:ctx=>new CooHomeWorld(ctx),describe:DESCRIBE};
