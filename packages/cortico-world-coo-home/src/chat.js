import {HomeStore} from './storage.js';
import {safeError,checkAbort,settleWithin} from './model.js';

const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const copy=structuredClone;
const STATUSES=['running','done','cancelled','error'];
const initial=()=>({version:1,revision:0,counter:0,turns:[],clients:[]});
// The local chat receipt is not a provider resource ID. Responses user input
// accepts an omitted ID; sending "home-user-*" fails OpenAI's msg_* validation.
// History is reconstructed here too, so existing saves need no destructive reset.
const userRecord=turn=>({version:2,item:{type:'message',role:'user',status:'completed',content:[{type:'input_text',text:turn.userText}]},context:{ts:new Date(turn.at).toISOString()}});
const boundedText=(value,max)=>typeof value==='string'&&value.length<=max;
export function normalizeChat(raw){
  if(plain(raw)&&Number.isInteger(raw.version)&&raw.version>1)throw safeError('HOME_SAVE_UNSUPPORTED','家园聊天来自较新的插件版本，原文件已保留，请使用新版插件。');
  if(!plain(raw)||raw.version!==1||!Number.isSafeInteger(raw.counter)||raw.counter<0||!Array.isArray(raw.turns)||raw.turns.length>40||!Array.isArray(raw.clients)||raw.clients.length>160)throw Error('Invalid home conversation save');
  const ids=new Set();
  const turns=raw.turns.map(turn=>{
    if(!plain(turn)||!/^chat-\d+$/.test(turn.id)||ids.has(turn.id)||!boundedText(turn.userText,2000)||!boundedText(turn.assistantText??'',16000)||!Number.isFinite(turn.at)||!STATUSES.includes(turn.status)||!Array.isArray(turn.records)||turn.records.length>100)throw Error('Invalid home conversation turn');
    ids.add(turn.id);
    const records=turn.records.map(row=>{
      if(!plain(row)||row.version!==2||!plain(row.item)||!['message','function_call','function_call_output','reasoning'].includes(row.item.type))throw Error('Invalid home conversation record');
      if(row.item.type==='message'&&!['user','assistant'].includes(row.item.role))throw Error('Unexpected home conversation role');
      const context={};for(const key of ['ts','responseId','responseStatus','origin'])if(row.context?.[key]!==undefined)context[key]=copy(row.context[key]);
      return{version:2,item:copy(row.item),context};
    });
    if(JSON.stringify(records).length>180_000)throw Error('Home conversation turn too large');
    return{id:turn.id,userText:turn.userText,assistantText:turn.assistantText??'',at:turn.at,status:turn.status==='running'?'cancelled':turn.status,records,error:turn.status==='running'?'上次请求在家园关闭前未结束，未自动重放任何操作。':boundedText(turn.error,240)?turn.error:null};
  });
  const clients=raw.clients.map(entry=>{if(!plain(entry)||!boundedText(entry.clientId,96)||!/^chat-\d+$/.test(entry.id)||!STATUSES.includes(entry.status))throw Error('Invalid chat receipt');return{clientId:entry.clientId,id:entry.id,status:entry.status==='running'?'cancelled':entry.status};});
  return{version:1,revision:Math.max(0,Math.floor(raw.revision??0)),counter:raw.counter,turns,clients};
}

export class HomeChat{
  constructor({dataDir,store,model,clock=()=>Date.now(),tools=()=>[],system=()=>'',onChange=()=>{},beforeTurn=()=>{},onIdle=()=>{}}={}){
    this.store=store??new HomeStore(dataDir,{name:'chat',limit:4*1024*1024});this.model=model;this.clock=clock;this.tools=tools;this.system=system;this.onChange=onChange;this.beforeTurn=beforeTurn;this.onIdle=onIdle;
    this.state=initial();this.tail=Promise.resolve();this.active=null;this.started=false;this.available=true;this.storageError=null;this.pending=new Set();this.streamTimer=null;this.ended=true;
  }
  async start(){
    try{this.state=await this.store.load(normalizeChat)??initial();await this.store.save(this.state);this.available=true;this.storageError=null;}
    catch{this.available=false;this.storageError='家园聊天存档暂时无法读取或保存；原文件已保留，生活模拟仍可使用。';}
    this.started=true;
  }
  serial(action){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
  mutate(action){return this.serial(async()=>{
    if(!this.available)throw safeError('HOME_CHAT_STORAGE',this.storageError);
    const previous=copy(this.state);
    try{const value=await action();this.state.revision++;await this.store.save(this.state);this.storageError=null;this.onChange();return value;}
    catch(error){this.state=previous;if(!error.code?.startsWith('HOME_')){this.storageError='家园聊天暂时无法保存，请检查可用磁盘空间。';this.onChange();throw safeError('HOME_CHAT_STORAGE',this.storageError);}throw error;}
  });}
  snapshot(){
    const turn=this.state.turns.at(-1),active=this.active;
    return{revision:this.state.revision,messages:this.state.turns.flatMap(row=>[
      {id:`${row.id}:user`,role:'user',text:row.userText,at:row.at},
      ...(row.assistantText?[{id:`${row.id}:assistant`,role:'assistant',text:row.assistantText,at:row.at}]:[])
    ]),job:turn?{id:turn.id,status:turn.status,partialText:active?.id===turn.id?active.partialText:'',error:turn.error??null}:null,storage:{ok:!this.storageError,message:this.storageError}};
  }
  async send({text,clientId}={}){
    if(typeof text!=='string'||!text.trim()||text.length>2000||typeof clientId!=='string'||!/^[a-zA-Z0-9._:-]{1,96}$/.test(clientId))throw safeError('HOME_CHAT_INPUT','请输入 1–2000 字的消息。');
    let launch=null;
    const result=await this.mutate(()=>{
      if(!this.started)throw safeError('HOME_CANCELLED','请先启用家园。');
      const old=this.state.clients.find(value=>value.clientId===clientId);if(old)return{jobId:old.id,status:old.status};
      if(this.active)throw safeError('HOME_CHAT_BUSY','上一条消息仍在回复中，可以等待或先停止回复。');
      const token=this.beforeTurn();
      const turn={id:`chat-${++this.state.counter}`,userText:text.trim(),assistantText:'',at:this.clock(),status:'running',records:[],error:null};
      this.state.turns.push(turn);this.state.turns=this.state.turns.slice(-40);
      this.state.clients.push({clientId,id:turn.id,status:'running'});this.state.clients=this.state.clients.slice(-160);
      launch={...token,id:turn.id,controller:new AbortController(),partialText:''};this.active=launch;
      return{jobId:turn.id,status:'running'};
    }).catch(error=>{if(launch&&this.active===launch)this.active=null;throw error;});
    if(launch){const pending=this.execute(launch).finally(()=>this.pending.delete(pending));this.pending.add(pending);}
    return{...result,chat:this.snapshot()};
  }
  async execute(active){
    const valid=()=>this.started&&this.active===active&&!active.controller.signal.aborted;
    const update=async callback=>this.mutate(()=>{checkAbort(active.controller.signal);if(!valid())throw safeError('HOME_CANCELLED','本次请求已停止。');const turn=this.state.turns.find(row=>row.id===active.id);if(!turn)throw safeError('HOME_CANCELLED','本次请求已停止。');callback(turn);});
    try{
      checkAbort(active.controller.signal);
      const turn=this.state.turns.find(row=>row.id===active.id),history=[];let length=0;
      for(const previous of this.state.turns.slice(0,-1).reverse()){
        if(previous.status!=='done')continue;
        const batch=[userRecord(previous),...previous.records],size=JSON.stringify(batch).length;if(length+size>60_000)break;history.unshift(...copy(batch));length+=size;
      }
      const result=await this.model.run({records:[...history,userRecord(turn)],system:this.system(),tools:this.tools(active),signal:active.controller.signal,sessionId:`coo-home/${active.id}`,
        onText:text=>{if(valid()){active.partialText=String(text).slice(0,16000);if(!this.streamTimer)this.streamTimer=setTimeout(()=>{this.streamTimer=null;if(valid())this.onChange();},80);}},
        onRecords:records=>update(current=>{current.records=copy(records);})
      });
      await update(current=>{current.records=copy(result.records);current.assistantText=String(result.text).slice(0,16000);current.status='done';this.receipt(current.id,'done');});
    }catch(error){
      if(this.active===active){
        try{await this.mutate(()=>{const turn=this.state.turns.find(row=>row.id===active.id);if(!turn)return;turn.status=active.controller.signal.aborted||error.code==='HOME_CANCELLED'?'cancelled':'error';turn.error=error.code?.startsWith('HOME_')?error.message:'本次回复未完成，请稍后重试。';this.receipt(turn.id,turn.status);});}catch{}
      }
    }finally{clearTimeout(this.streamTimer);this.streamTimer=null;if(this.active===active){this.active=null;this.onChange();this.onIdle();}}
  }
  receipt(id,status){const value=this.state.clients.find(row=>row.id===id);if(value)value.status=status;}
  async cancel({jobId}={}){
    if(typeof jobId!=='string')throw safeError('HOME_CHAT_INPUT','请选择需要停止的回复。');
    const active=this.active;if(active?.id===jobId)active.controller.abort();
    await this.mutate(()=>{const turn=this.state.turns.find(row=>row.id===jobId);if(turn?.status==='running'){turn.status='cancelled';turn.error='本次请求已停止。已接受的家园任务可另行取消。';this.receipt(jobId,'cancelled');}if(this.active===active)this.active=null;});
    return this.snapshot();
  }
  async clear(){
    this.active?.controller.abort();this.active=null;
    await this.mutate(()=>{this.state.turns=[];for(const receipt of this.state.clients)if(receipt.status==='running')receipt.status='cancelled';});return this.snapshot();
  }
  async stop(){
    this.started=false;clearTimeout(this.streamTimer);this.streamTimer=null;this.active?.controller.abort();
    if(this.active){const active=this.active;try{await this.cancel({jobId:active.id});}catch{}this.active=null;}
    this.ended=await settleWithin([...this.pending]);await this.tail;await this.store.flush?.();return this.ended;
  }
}
