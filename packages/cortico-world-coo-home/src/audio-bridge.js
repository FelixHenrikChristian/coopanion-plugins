import {createHash} from 'node:crypto';

const KINDS=['move','touch','face','snore','talk','ui','alert'];
const BODY_KINDS=new Set(['move','touch','face','snore','talk']);
const NAME=/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/;
const MAX_AUDIO=8*1024*1024,MAX_CACHE=24*1024*1024,MAX_JSON=256*1024;
const plain=value=>value&&typeof value==='object'&&!Array.isArray(value);
const number=(value,min,max,fallback)=>Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const unavailable=()=>Error('家园声音暂不可用。');

export function audioProfile(state,pack,origin,baseUrl,assetUrl){
  const files=new Map(),sounds=[];
  for(const [name,value] of Object.entries(plain(pack.sounds)?pack.sounds:{}).slice(0,64)){
    if(!NAME.test(name)||!plain(value)||!BODY_KINDS.has(value.kind)||typeof value.file!=='string')continue;
    try{
      const url=assetUrl(value.file,origin,baseUrl);
      if(!/\.(ogg|mp3|wav)$/i.test(new URL(url).pathname))continue;
      files.set(name,url);sounds.push({name,kind:value.kind,volume:number(value.volume,0,1,1),
        repeat:['restart','finish'].includes(value.repeat)?value.repeat:'overlap'});
    }catch{/* An invalid optional sound must not prevent the figure loading. */}
  }
  const settings=plain(state.sounds)?state.sounds:{},speech=plain(state.speech)?state.speech:{};
  const assetKey=hash([origin,baseUrl,[...files],sounds]);
  const publicValue={assetKey,enabled:state.sound===true,volume:number(settings.volume,0,100,100),
    kinds:Object.fromEntries(KINDS.map(kind=>[kind,settings[kind]!==false])),
    snoreSeconds:number(settings.snoreSeconds,0,86400,0),panByPosition:settings.panByPosition!==false,
    speech:{enabled:speech.enabled===true,pitchHz:number(speech.pitchHz,200,700,400),unitsPerSecond:number(speech.unitsPerSecond,6,20,13)},
    voice:{pitch:number(pack.voice?.pitch,.5,2,1)},sounds};
  publicValue.key=hash(publicValue);
  return {publicValue,files,origin};
}

// Only the verified desktop service and its selected pack can supply bytes.
// Public methods accept symbolic names, never a path or a caller-provided URL.
export class HostAudioBridge{
  constructor({fetcher=fetch,timeoutMs=2500}={}){
    this.fetcher=fetcher;this.timeoutMs=Math.min(5000,Math.max(100,timeoutMs));
    this.profile=null;this.generation=0;this.cache=new Map();this.cacheSize=0;this.pending=new Map();this.busy=0;
  }
  configure(profile){
    if(profile?.publicValue.key===this.profile?.publicValue.key)return;
    this.reset();this.profile=profile;
    if(profile)this.controller=new AbortController();
  }
  reset(){
    this.generation++;this.controller?.abort();this.profile=null;this.cache.clear();this.cacheSize=0;this.pending.clear();
  }
  valid(key){
    if(typeof key!=='string'||key!==this.profile?.publicValue.key||this.controller?.signal.aborted)throw unavailable();
    return this.profile;
  }
  async read(url,{method='GET',body,limit=MAX_AUDIO,json=false}={}){
    const signal=AbortSignal.any([this.controller.signal,AbortSignal.timeout(this.timeoutMs)]);
    const response=await this.fetcher(url,{method,redirect:'error',signal,...(body?{headers:{'content-type':'application/json'},body:JSON.stringify(body)}:{})});
    const mime=(response.headers.get('content-type')??'').split(';')[0].trim().toLowerCase();
    if(!response.ok||(json?!mime.includes('json'):!['audio/ogg','application/ogg','audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave'].includes(mime)))throw unavailable();
    if(Number(response.headers.get('content-length'))>limit)throw unavailable();
    const reader=response.body?.getReader();if(!reader)throw unavailable();
    let size=0;const chunks=[];
    try{for(;;){signal.throwIfAborted();const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit)throw unavailable();chunks.push(value);}}
    finally{await reader.cancel().catch(()=>{});}
    signal.throwIfAborted();return {bytes:Buffer.concat(chunks),mime};
  }
  async request(key,cacheKey,run){
    this.valid(key);const generation=this.generation;
    if(cacheKey&&this.cache.has(cacheKey))return this.cache.get(cacheKey).value;
    if(cacheKey&&this.pending.has(cacheKey))return this.pending.get(cacheKey);
    if(this.busy>=3)throw unavailable();this.busy++;
    const promise=(async()=>{
      try{
        const result=await run();
        if(generation!==this.generation)throw unavailable();this.valid(key);
        if(cacheKey){
          const size=result.size??0;
          while(this.cacheSize+size>MAX_CACHE&&this.cache.size){const first=this.cache.keys().next().value;this.cacheSize-=this.cache.get(first).size;this.cache.delete(first);}
          if(size<=MAX_CACHE){this.cache.set(cacheKey,{size,value:result.value});this.cacheSize+=size;}
        }
        return result.value;
      }catch{throw unavailable();}
      finally{this.busy--;if(generation===this.generation&&cacheKey)this.pending.delete(cacheKey);}
    })();
    if(cacheKey)this.pending.set(cacheKey,promise);
    return promise;
  }
  async speechUnits(args){
    if(!plain(args)||typeof args.text!=='string'||!args.text.trim()||args.text.length>2000)throw unavailable();
    const profile=this.valid(args.key),text=args.text;
    return this.request(args.key,null,async()=>{
      const {bytes}=await this.read(profile.origin+'/api/speech',{method:'POST',body:{text},limit:MAX_JSON,json:true});
      const data=JSON.parse(bytes.toString('utf8'));
      if(!Array.isArray(data.units)||data.units.length>6000)throw unavailable();
      let previous=-1;
      const units=data.units.map(unit=>{
        if(!plain(unit)||!Number.isInteger(unit.at)||unit.at<previous||unit.at<0||unit.at>=text.length||typeof unit.key!=='string'||!NAME.test(unit.key)||!Number.isInteger(unit.tone)||unit.tone<0||unit.tone>5)throw unavailable();
        previous=unit.at;
        return {at:unit.at,key:unit.key,tone:unit.tone,stress:unit.stress===true,weak:unit.weak===true,
          pos:number(unit.pos,0,6000,0),of:number(unit.of,1,6000,1),end:typeof unit.end==='string'?unit.end.slice(0,12):''};
      });
      return {value:{units}};
    });
  }
  async speechBank(args){
    if(!plain(args)||!['manifest','audio'].includes(args.part))throw unavailable();
    const profile=this.valid(args.key);
    if(args.part==='audio')return this.binary(args.key,'speech:audio',profile.origin+'/web/speech/zh.ogg');
    return this.request(args.key,'speech:manifest',async()=>{
      const {bytes}=await this.read(profile.origin+'/web/speech/zh.json',{json:true,limit:MAX_JSON});
      const data=JSON.parse(bytes.toString('utf8'));
      if(!plain(data.units)||!Number.isFinite(data.hz)||data.hz<50||data.hz>2000||Object.keys(data.units).length>3000)throw unavailable();
      const units={};
      for(const [name,pair] of Object.entries(data.units)){
        if(!NAME.test(name)||!Array.isArray(pair)||pair.length!==2||!pair.every(Number.isFinite)||pair[0]<0||pair[0]>3600||pair[1]<=0||pair[1]>10)throw unavailable();
        Object.defineProperty(units,name,{value:[...pair],enumerable:true});
      }
      return {size:bytes.length,value:{hz:data.hz,units}};
    });
  }
  async soundAsset(args){
    if(!plain(args)||typeof args.name!=='string')throw unavailable();
    const profile=this.valid(args.key),url=profile.files.get(args.name);if(!url)throw unavailable();
    return this.binary(args.key,'pack:'+args.name,url);
  }
  binary(key,cacheKey,url){
    return this.request(key,cacheKey,async()=>{
      const {bytes,mime}=await this.read(url);return {size:bytes.length,value:{$binary:{mime,base64:bytes.toString('base64')}}};
    });
  }
}
