import {AppearanceBridge,disconnected} from './appearance.js';
import {readFile} from 'node:fs/promises';
import {HomeLife,normalizeLifeState} from './life.js';
import {HomeStore} from './storage.js';

export const DESCRIBE=Object.freeze({tools:[],events:[]});

export class CooHomeWorld{
  id='coo-home';
  constructor(ctx,{bridgeFactory=options=>new AppearanceBridge(options),clock=()=>Date.now(),layout=null,storage=null}={}){
    this.ctx=ctx;this.bridgeFactory=bridgeFactory;this.bridge=null;this.clock=clock;this.layout=layout;this.storage=storage;
    this.clients=new Set();this.presence=new Map();this.started=false;this.tail=Promise.resolve();this.life=null;this.timer=null;this.savedAt=0;this.storageError=false;
  }
  serial(action){const result=this.tail.then(action);this.tail=result.catch(()=>{});return result;}
  start(){return this.serial(async()=>{
    if(this.started)return;
    this.life=null;
    this.layout??=JSON.parse(await readFile(new URL('../data/home-layout.json',import.meta.url),'utf8'));
    this.storage??=new HomeStore(this.ctx.dataDir);
    let saved;
    try{saved=await this.storage.load(raw=>normalizeLifeState(raw,this.layout,this.clock()));}
    catch(error){this.storageError=true;throw error;}
    this.life=new HomeLife({layout:this.layout,state:saved,clock:this.clock});
    this.recovery=this.storage.recovery;this.life.advance(this.clock(),{offline:true});await this.persist();
    this.started=true;
    this.bridge=this.bridgeFactory({botDir:this.ctx.botDir,onChange:()=>this.broadcast(true)});
    try{await this.bridge.start();this.timer=setInterval(()=>{void this.tick().catch(()=>{});},1000);this.timer.unref?.();}catch{
      await this.bridge.stop();this.bridge=null;this.started=false;
      throw Error('The home appearance connection could not start.');
    }
  });}
  stop(){return this.serial(async()=>{
    this.started=false;clearInterval(this.timer);this.timer=null;
    try{if(this.life){this.life.advance(this.clock());await this.persist();await this.storage.flush?.();}}finally{
      await this.bridge?.stop();this.bridge=null;this.broadcast(true);
      for(const socket of this.clients){try{socket.close('Home World stopped.');}catch{}}
      this.clients.clear();this.presence.clear();
    }
  });}
  lifeStatus(){return this.life?{...this.life.snapshot(),storage:{ok:!this.storageError,savedAt:this.savedAt,recovery:this.recovery??'new',message:this.storageError?'家园进度暂时无法保存，请检查可用磁盘空间。':null}}:null;}
  status(){return{phase:'life',appearance:this.bridge?.snapshot()??disconnected('家园尚未连接桌宠服务。'),life:this.lifeStatus()};}
  broadcast(full=false){
    const text=JSON.stringify(full?this.status():{phase:'life',life:this.lifeStatus()});
    for(const socket of this.clients){
      if(!socket.open){this.clients.delete(socket);this.presence.delete(socket);continue;}
      try{socket.send(text);}catch{this.clients.delete(socket);this.presence.delete(socket);try{socket.close('Home stream unavailable.');}catch{}}
    }
  }
  async persist(){
    try{await this.storage.save(this.life.export());this.savedAt=this.clock();this.storageError=false;}
    catch{this.storageError=true;throw Error('家园进度暂时无法保存。');}
  }
  tick(){return this.serial(async()=>{
    if(!this.started||!this.life)return;
    const current=this.life.state.current?.id,phase=this.life.snapshot().current?.phase;
    this.life.advance(this.clock(),{visible:[...this.presence.values()].some(Boolean)});
    try{if(this.clock()-this.savedAt>=5000||current!==this.life.state.current?.id||phase!==this.life.snapshot().current?.phase)await this.persist();}
    finally{this.broadcast();}return this.status();
  });}
  control(method,args){return this.serial(async()=>{
    if(!this.started||!this.life)throw Error('请先启用家园。');
    const previous=this.life.export();
    try{this.life[method](...args);await this.persist();}catch(error){
      this.life=new HomeLife({layout:this.layout,state:previous,clock:this.clock});this.broadcast();throw error;
    }
    this.broadcast();return this.status();
  });}
  tools(){return [];}
  envPromptVars(){return null;}
  webUi(language='zh'){
    const zh=language!=='en';
    return{label:zh?'coo家园':'Coo Home',panels:[{id:'home',title:zh?'家园':'Home'}],
      invoke:async(panel,method,args=[])=>{
        if(panel!=='home'||!Array.isArray(args))throw Error('Unsupported home request.');
        if(method==='status'&&!args.length){await this.tick();return this.status();}
        if(method==='catalog'&&!args.length)return{items:structuredClone(this.life?.catalog??[])};
        if(['command','walk','settings'].includes(method)&&args.length===1)return this.control(method,args);
        if(['cancel','pause','resume'].includes(method)&&!args.length)return this.control(method,args);
        throw Error('Unsupported home request.');
      },
      stream:(panel,socket)=>{
        if(panel!=='home'||!this.started){socket.close('Home stream unavailable.');return;}
        this.clients.add(socket);this.presence.set(socket,false);socket.onClose(()=>{this.clients.delete(socket);this.presence.delete(socket);});
        socket.onMessage?.(text=>{if(typeof text!=='string'||text.length>256)return;try{const message=JSON.parse(text);if(message.type==='presence'&&typeof message.visible==='boolean')this.presence.set(socket,message.visible);}catch{}});
        try{socket.send(JSON.stringify(this.status()));}catch{this.clients.delete(socket);this.presence.delete(socket);socket.close('Home stream unavailable.');}
      }
    };
  }
  shutdownVerification(){return[{key:'appearance-watcher',label:'Home appearance watcher',status:this.started?'still-live':'verified-ended',detail:this.started?'Home watcher is active.':'Home watcher and panel streams are closed.',manualAction:this.started?'Disable the Home World.':''},{key:'home-save',label:'Home progress',status:this.storageError?'unknown':this.started?'still-live':'verified-ended',detail:this.storageError?'The latest household progress could not be saved.':'Household save completed.',manualAction:this.storageError?'Check available disk space and enable the Home World again.':''}];}
}

export default{id:'coo-home',label:'coo家园',defaults:()=>({enabled:false}),create:ctx=>new CooHomeWorld(ctx),describe:DESCRIBE};
