import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {audioProfile,HostAudioBridge} from './audio-bridge.js';

// These are the desktop-pet server's bounded listen policy, not a general
// network scan. A random (zero) port needs a future host discovery API.
const DEFAULT_PORT=7797,PORT_ATTEMPTS=10,MAX_JSON=4*1024*1024;
const ID=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const text=value=>typeof value==='string'&&value.length<=256;
const fingerprint=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const disconnected=message=>({connected:false,descriptor:null,message});

export function localOrigin(value){
  const url=new URL(value);
  if(url.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(url.hostname)||url.username||url.password||url.pathname!=='/'||url.search||url.hash)
    throw Error('The figure service must be a loopback HTTP origin.');
  return url.origin;
}

export function candidates(config){
  if(config.enabled===false)return [];
  const port=config.port??DEFAULT_PORT;
  if(!Number.isInteger(port)||port<1||port>65535)return [];
  return Array.from({length:Math.min(PORT_ATTEMPTS,65536-port)},(_,i)=>`http://127.0.0.1:${port+i}`);
}

export async function readPetConfig(botDir){
  if(typeof botDir!=='string'||!botDir)return {enabled:false};
  const bytes=await readFile(join(botDir,'config.json'));
  if(bytes.byteLength>MAX_JSON)throw Error('Host configuration is too large.');
  const config=JSON.parse(bytes.toString('utf8'));
  const pet=config?.worlds?.['desktop-pet'];
  if(pet!==undefined&&!plain(pet))throw Error('Invalid desktop-pet configuration.');
  return {enabled:pet?.enabled!==false,port:pet?.port??DEFAULT_PORT,skin:plain(pet?.skin)?pet.skin:null};
}

function packAsset(raw,origin,base){
  if(typeof raw!=='string'||!raw||raw.length>1024)throw Error('Invalid figure asset.');
  const decoded=decodeURIComponent(raw);
  if(/[\\\x00-\x1f<>]/.test(decoded)||decoded.split('/').includes('..'))throw Error('Invalid figure asset.');
  const url=new URL(raw,base??origin+'/');
  if(url.origin!==origin||url.username||url.password||url.search||url.hash||!/^\/(?:packs|web)\//.test(url.pathname)||(base&&!url.href.startsWith(base)))throw Error('Figure asset left its local package.');
  return url.href;
}

function schemeOf(pack,skin){
  // Match the host's lookOf contract. Only its public built-in default figure
  // uses individual skin slots; installed packages own their scheme strings.
  if(pack.id!=='coo')return text(skin.scheme)?skin.scheme:'';
  return pack.axes.map(axis=>String(skin[axis.id]??axis.options[0].id)).join('-');
}

function skinOf(skin,axes){
  const selected={};
  for(const key of new Set(['figure','scheme','palette','head','side','glasses','neck',...axes.map(a=>a.id)])){
    if(text(skin[key]))selected[key]=skin[key];
  }
  if(plain(skin.colors)){
    const colors={};
    for(const [slot,value] of Object.entries(skin.colors).slice(0,32)){
      if(!ID.test(slot)||!plain(value))continue;
      const entry={};for(const key of ['main','acc'])if(typeof value[key]==='string'&&/^#[0-9a-f]{3,8}$/i.test(value[key]))entry[key]=value[key];
      if(Object.keys(entry).length)colors[slot]=entry;
    }
    selected.colors=colors;
  }
  return selected;
}

function validateState(state,config){
  if(!plain(state)||!plain(state.skin)||!text(state.skin.figure)||!ID.test(state.skin.figure))throw Error('No selected figure.');
  // A listener occupying an adjacent candidate port must agree with this
  // deployment's selected skin; do not attach to another local companion.
  if(plain(config.skin))for(const key of ['figure','scheme']){
    if(text(config.skin[key])&&config.skin[key]!==state.skin[key])throw Error('Different deployment appearance.');
  }
  return state.skin;
}

function selectPack(list,skin){
  if(!Array.isArray(list)||list.length>2048)throw Error('Invalid figure catalog.');
  const pack=list.find(item=>plain(item)&&item.id===skin.figure);
  if(!pack||!text(pack.export)||!/^[$A-Z_a-z][$\w]*$/.test(pack.export)||!Array.isArray(pack.vocab)||!Array.isArray(pack.axes)||!Array.isArray(pack.presets)||!plain(pack.can))throw Error('Unsupported figure catalog entry.');
  if(pack.axes.length>32||pack.axes.some(a=>!plain(a)||!ID.test(a.id)||!Array.isArray(a.options)||!a.options.length||a.options.some(o=>!plain(o)||!text(o.id))))throw Error('Invalid figure options.');
  return pack;
}

export class AppearanceBridge{
  constructor({botDir,readConfig=()=>readPetConfig(botDir),fetcher=fetch,createSocket=url=>new WebSocket(url),retryMs=3000,timeoutMs=1000,onChange=()=>{}}={}){
    Object.assign(this,{readConfig,fetcher,createSocket,retryMs,timeoutMs,onChange});
    this.value=disconnected('家园尚未连接桌宠服务。');this.active=false;this.generation=0;
    this.audio=new HostAudioBridge({fetcher,timeoutMs:Math.max(timeoutMs,2500)});this.watchVersion=0;this.validatedWatchVersion=0;this.watchSnapshot={};
  }
  snapshot(){return structuredClone(this.value);}
  publish(value){
    if(!value.connected)this.audio.reset();
    if(JSON.stringify(value)===JSON.stringify(this.value))return;
    this.value=value;this.onChange(this.snapshot());
  }
  async json(url,signal){
    const response=await this.fetcher(url,{method:'GET',redirect:'error',signal:AbortSignal.any([signal,AbortSignal.timeout(this.timeoutMs)])});
    if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw Error('Figure service is unavailable.');
    const length=Number(response.headers.get('content-length'));if(length>MAX_JSON)throw Error('Figure response is too large.');
    const reader=response.body?.getReader();if(!reader)throw Error('Empty figure response.');
    let size=0;const chunks=[];
    try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_JSON)throw Error('Figure response is too large.');chunks.push(value);}}
    finally{await reader.cancel().catch(()=>{});}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  async readAppearance(base,config,signal){
    const origin=localOrigin(base);
    const [state,list]=await Promise.all([this.json(origin+'/api/state',signal),this.json(origin+'/api/figures',signal)]);
    const skin=validateState(state,config),pack=selectPack(list,skin),baseUrl=packAsset(pack.base,origin);
    if(!baseUrl.endsWith('/'))throw Error('Invalid figure package base.');
    const entry=packAsset(pack.entry,origin,baseUrl);
    const model=pack.model?await this.json(packAsset(pack.model,origin,baseUrl),signal):null;
    const descriptor={frameUrl:`${origin}/figure-frame?pack=${encodeURIComponent(pack.id)}`,entry,exportName:pack.export,baseUrl,model,
      scheme:schemeOf(pack,skin),skin:skinOf(skin,pack.axes),words:pack.vocab.filter(v=>plain(v)&&text(v.id)&&ID.test(v.id)).map(v=>v.id),can:{walk:pack.can.walk===true}};
    descriptor.key=fingerprint(descriptor);
    const profile=audioProfile(state,pack,origin,baseUrl,packAsset);
    return {appearance:{connected:true,descriptor,audio:profile.publicValue},profile,
      watched:Object.fromEntries(['skin','sound','sounds','speech'].filter(key=>Object.hasOwn(state,key)).map(key=>[key,state[key]]))};
  }
  speechUnits(args){return this.audio.speechUnits(args);}
  speechBank(args){return this.audio.speechBank(args);}
  soundAsset(args){return this.audio.soundAsset(args);}
  async start(){
    if(this.active)return;
    this.active=true;this.generation++;this.controller=new AbortController();
    this.publish(disconnected('正在连接当前桌宠形象。'));
    this.timer=setInterval(()=>{void this.refresh();},this.retryMs);this.timer.unref?.();
    await this.refresh();
  }
  closeSocket(){
    const socket=this.socket;this.socket=null;
    if(socket){this.unlisten?.();this.unlisten=null;try{socket.close();}catch{}}
  }
  async stop(){
    this.active=false;this.generation++;clearInterval(this.timer);this.timer=null;
    this.controller?.abort();this.audio.reset();this.closeSocket();this.base=null;this.watchSnapshot={};this.refreshAgain=false;
    await this.inflight?.catch(()=>{});this.inflight=null;
    this.publish(disconnected('家园已停用。'));
  }
  watch(base){
    if(this.socket&&this.socketBase===base)return;
    this.closeSocket();const generation=this.generation;
    const url=new URL('/socket?role=watcher',base);url.protocol='ws:';
    let socket;try{socket=this.createSocket(url.href);}catch{return;}
    this.socket=socket;this.socketBase=base;
    const message=event=>{
      if(!this.active||generation!==this.generation||socket!==this.socket)return;
      if(typeof event.data!=='string'||event.data.length>MAX_JSON)return;
      try{
        const data=JSON.parse(event.data);if(!['init','prefs'].includes(data.t))return;
        const next={...this.watchSnapshot};
        for(const key of ['skin','sound','sounds','speech'])if(Object.hasOwn(data,key))next[key]=data[key];
        if(fingerprint(next)!==fingerprint(this.watchSnapshot)){this.watchSnapshot=next;this.watchVersion++;void this.refresh();}
      }catch{}
    };
    const lost=()=>{
      if(!this.active||generation!==this.generation||socket!==this.socket)return;
      this.closeSocket();this.base=null;this.publish(disconnected('桌宠连接中断，正在重连。'));
    };
    socket.addEventListener('message',message);socket.addEventListener('close',lost);socket.addEventListener('error',lost);
    this.unlisten=()=>{socket.removeEventListener('message',message);socket.removeEventListener('close',lost);socket.removeEventListener('error',lost);};
  }
  refresh(){
    if(!this.active)return Promise.resolve();
    if(this.inflight){this.refreshAgain=true;return this.inflight;}
    const generation=this.generation,signal=this.controller.signal;
    const work=async()=>{
      do{
        this.refreshAgain=false;
        try{
          const config=await this.readConfig(),origins=candidates(config);
          if(!this.active||generation!==this.generation)return;
          if(!origins.length){this.closeSocket();this.base=null;this.publish(disconnected(config.enabled===false?'请先启用 Coopanion 的桌宠功能。':'当前随机端口无法自动发现，请使用宿主支持的固定桌宠端口。'));return;}
          const configKey=JSON.stringify({enabled:config.enabled,port:config.port,skin:config.skin});
          if(this.base&&origins.includes(this.base)&&this.socket?.readyState===1&&configKey===this.configKey){
            // Still verify live appearance after watcher messages; ordinary
            // periodic retries only read the small host configuration.
            if(this.watchVersion===this.validatedWatchVersion)return;
          }
          const order=this.base&&origins.includes(this.base)?[this.base,...origins.filter(x=>x!==this.base)]:origins;
          let found=false;
          for(const base of order){
            if(signal.aborted)return;
            try{
              const watchVersion=this.watchVersion;
              const {appearance,profile,watched}=await this.readAppearance(base,config,signal);
              if(!this.active||generation!==this.generation)return;
              this.base=base;this.configKey=configKey;this.validatedWatchVersion=watchVersion;
              if(this.watchVersion===watchVersion)this.watchSnapshot=watched;
              this.audio.configure(profile);
              this.publish(appearance);this.watch(base);found=true;break;
            }catch{if(signal.aborted)return;}
          }
          if(!found){this.closeSocket();this.base=null;this.publish(disconnected('暂未找到可用的桌宠服务，家园场景仍可查看。'));}
        }catch{
          if(this.active&&generation===this.generation){this.closeSocket();this.base=null;this.publish(disconnected('暂时无法读取桌宠连接信息，稍后自动重试。'));}
        }
      }while(this.refreshAgain&&this.active&&generation===this.generation);
    };
    this.inflight=work().finally(()=>{if(generation===this.generation)this.inflight=null;});
    return this.inflight;
  }
}
