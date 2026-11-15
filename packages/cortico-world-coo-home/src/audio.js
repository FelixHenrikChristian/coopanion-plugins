// Audio belongs to this panel only. The desktop service supplies validated
// syllables/assets; neither speech nor Figure sounds control the desktop pet.
const MAX_DECODED=32*1024*1024,MAX_SOURCES=24,MAX_SECONDS=40;
const KINDS=new Set(['move','touch','face','snore','talk','ui','alert']);
const finite=(n,fallback)=>Number.isFinite(n)?n:fallback;

export function createHomeAudio({ctx,signal,onTalk=()=>{},createContext}={}){
  let profile=null,context=null,master=null,panner=null,disposed=false,disposal=null,shown=true,unlocked=false,generation=0;
  let contextCount=0,spokenCount=0,decodedSize=0,lastSound=0,pending=0,settleSpeech=null,bankPromise=null;
  const sources=new Set(),timers=new Set(),buffers=new Map(),recent=new Set();
  const now=()=>globalThis.performance?.now()??Date.now();
  const can=kind=>!disposed&&!signal?.aborted&&shown&&unlocked&&profile?.enabled===true&&profile.volume>0&&profile.kinds?.[kind]!==false;
  const timer=(fn,ms)=>{const id=setTimeout(()=>{timers.delete(id);fn();},Math.max(0,ms));timers.add(id);return id;};
  function forget(entry){
    sources.delete(entry);try{entry.source.disconnect();entry.gain.disconnect();}catch{}
  }
  function halt(entry){try{entry.source.stop();}catch{}forget(entry);}
  function stop(){
    generation++;for(const id of timers)clearTimeout(id);timers.clear();
    for(const entry of [...sources])halt(entry);
    for(const [name,entry] of buffers)if(!entry.ready)buffers.delete(name);
    bankPromise=null;
    settleSpeech?.();settleSpeech=null;
  }
  function clearBuffers(){buffers.clear();decodedSize=0;bankPromise=null;}
  function gain(){if(master)master.gain.value=.55*(profile?.enabled?finite(profile.volume,0)/100:0);}
  function ensureContext(){
    if(disposed||!shown||!unlocked)return null;
    if(!context){
      try{
        const Factory=globalThis.AudioContext??globalThis.webkitAudioContext;
        context=createContext?createContext():Factory?new Factory():null;if(!context)return null;
        contextCount++;master=context.createGain();gain();
        if(context.createStereoPanner){panner=context.createStereoPanner();master.connect(panner);panner.connect(context.destination);}
        else master.connect(context.destination);
      }catch{return null;}
    }
    return context;
  }
  async function ready(kind){
    if(!can(kind))return null;const audio=ensureContext();if(!audio)return null;
    try{if(audio.state==='suspended')await audio.resume();}catch{return null;}
    return can(kind)&&audio.state!=='closed'?audio:null;
  }
  async function unlock(){
    if(disposed||!shown)return;unlocked=true;
    const audio=ensureContext();if(audio){try{await audio.resume();}catch{}}
  }
  function setShown(value){
    const next=value===true;if(next===shown)return;shown=next;
    if(!shown){stop();void context?.suspend().catch(()=>{});}
  }
  function configure(value){
    const next=value&&typeof value.key==='string'?structuredClone(value):null;
    if(next?.key===profile?.key)return;
    stop();clearBuffers();profile=next;gain();
    if(!profile?.enabled||profile.volume<=0)void context?.suspend().catch(()=>{});
  }
  async function decode(name,method,args,token){
    if(buffers.has(name))return buffers.get(name).promise;
    const entry={promise:null,size:0,ready:false};pending++;
    entry.promise=(async()=>{
      const blob=await ctx.invokeBinary(method,[args]);
      if(blob.size>8*1024*1024||token!==generation||!shown||disposed)throw Error('Audio stopped');
      const bytes=await blob.arrayBuffer(),audio=await ready('talk');
      // Movement audio can be enabled while talking is muted.
      const decoder=audio??ensureContext();if(!decoder||token!==generation)throw Error('Audio stopped');
      const buffer=await decoder.decodeAudioData(bytes);
      if(token!==generation||!shown||disposed)throw Error('Audio stopped');
      const size=buffer.length*buffer.numberOfChannels*4;
      if(!Number.isFinite(size)||size>MAX_DECODED||!Number.isFinite(buffer.duration)||buffer.duration<=0||buffer.duration>3600)throw Error('Unsupported audio');
      while(decodedSize+size>MAX_DECODED&&buffers.size>1){
        const oldest=[...buffers.keys()].find(key=>key!==name);const old=buffers.get(oldest);decodedSize-=old.size;buffers.delete(oldest);
      }
      if(buffers.get(name)===entry){entry.size=size;entry.ready=true;decodedSize+=size;}
      return buffer;
    })().catch(error=>{if(buffers.get(name)===entry)buffers.delete(name);throw error;}).finally(()=>{pending--;});
    buffers.set(name,entry);return entry.promise;
  }
  function play(buffer,{at=context.currentTime,offset=0,duration=buffer.duration,rate=1,volume=1,group='',repeat='overlap',talk=false}={}){
    if(!shown||disposed||sources.size>=MAX_SOURCES||!Number.isFinite(duration)||duration<=0)return false;
    const previous=[...sources].filter(entry=>entry.group===group);
    if(repeat==='finish'&&previous.length)return false;
    if(repeat==='restart')for(const entry of previous)halt(entry);
    const source=context.createBufferSource(),level=context.createGain(),entry={source,gain:level,group};
    source.buffer=buffer;source.playbackRate.value=Math.max(.25,Math.min(3,rate));level.gain.value=Math.max(0,Math.min(1,volume));
    source.connect(level);level.connect(master);sources.add(entry);source.onended=()=>forget(entry);
    try{source.start(at,offset,Math.min(duration,buffer.duration-offset));}catch{forget(entry);return false;}
    if(talk)timer(()=>{if(shown&&!disposed)onTalk();},(at-context.currentTime)*1000);
    return true;
  }
  async function bank(token){
    if(bankPromise)return bankPromise;
    const key=profile.key;
    const work=Promise.all([ctx.invoke('speechBank',[{key,part:'manifest'}]),decode('speech-bank','speechBank',{key,part:'audio'},token)])
      .then(([manifest,buffer])=>{
        if(token!==generation||!Number.isFinite(manifest?.hz)||manifest.hz<=0||!manifest.units||typeof manifest.units!=='object')throw Error('Invalid speech bank');
        const units=new Map();
        for(const [name,pair] of Object.entries(manifest.units))if(Array.isArray(pair)&&pair.length===2&&pair.every(Number.isFinite)&&pair[0]>=0&&pair[1]>0&&pair[0]+pair[1]<=buffer.duration+.005)units.set(name,pair);
        return {buffer,hz:manifest.hz,units};
      });
    bankPromise=work;work.catch(()=>{if(bankPromise===work)bankPromise=null;});return work;
  }
  function schedule(entries,token){
    return new Promise(resolve=>{
      settleSpeech=resolve;let index=0;const start=context.currentTime+.025;
      function pump(){
        if(token!==generation||!can('talk')){if(settleSpeech===resolve)settleSpeech=null;resolve();return;}
        const horizon=context.currentTime+.18;
        while(index<entries.length&&start+entries[index].time<=horizon){
          const item=entries[index++];
          play(item.buffer,{...item,at:Math.max(context.currentTime,start+item.time),talk:true,group:'speech'});
        }
        const last=entries.at(-1),end=last?start+last.time+last.duration/last.rate:start;
        if(index>=entries.length&&context.currentTime>=end){if(settleSpeech===resolve)settleSpeech=null;resolve();return;}
        timer(pump,35);
      }
      pump();
    });
  }
  async function fallback(text,token){
    const choices=(profile.sounds??[]).filter(sound=>sound.kind==='talk');if(!choices.length)return;
    const sound=choices[0],buffer=await decode('pack:'+sound.name,'soundAsset',{key:profile.key,name:sound.name},token);
    if(token!==generation||!can('talk'))return;
    const rate=finite(profile.voice?.pitch,1),entries=[];let time=0;
    for(const char of text){
      if(time>MAX_SECONDS)break;
      if(!/[\s\p{P}]/u.test(char))entries.push({buffer,time,offset:0,duration:Math.min(buffer.duration,.25),rate,volume:sound.volume});
      time+=/[。！？.!?]/u.test(char)?.35:.10;
    }
    await schedule(entries,token);
  }
  async function speak(text,{utteranceId}={}){
    if(typeof text!=='string'||!text.trim()||disposed)return;
    if(utteranceId!==undefined){if(typeof utteranceId!=='string'||utteranceId.length>160||recent.has(utteranceId))return;recent.add(utteranceId);if(recent.size>64)recent.delete(recent.values().next().value);}
    stop();const token=generation;let audio=await ready('talk');if(!audio||token!==generation)return;
    text=text.slice(0,2000);spokenCount++;
    try{
      if(!profile.speech?.enabled){await fallback(text,token);return;}
      const key=profile.key;pending++;
      let speech;
      try{speech=await Promise.all([bank(token),ctx.invoke('speechUnits',[{key,text}])]);}finally{pending--;}
      if(token!==generation||!can('talk'))return;
      const [voice,result]=speech,entries=[];let time=0;
      for(const unit of Array.isArray(result?.units)?result.units.slice(0,6000):[]){
        const pair=voice.units.get(unit.key);if(!pair||time>MAX_SECONDS)continue;
        const rate=Math.max(.25,Math.min(3,profile.speech.pitchHz/voice.hz*(unit.stress?1.03:1)));
        entries.push({buffer:voice.buffer,time,offset:pair[0],duration:pair[1],rate,volume:.45});
        time+=1/Math.max(6,Math.min(20,profile.speech.unitsPerSecond));
        if(unit.pos===unit.of-1&&/[。！？.!?]/.test(unit.end))time+=.3;
      }
      if(entries.length)await schedule(entries,token);else await fallback(text,token);
    }catch{if(token===generation&&can('talk'))try{await fallback(text,token);}catch{/* Text remains available when audio is missing. */}}
  }
  async function playFigureSound(event){
    if(!event||typeof event.name!=='string'||!KINDS.has(event.kind))return;
    const sound=profile?.sounds?.find(sound=>sound.name===event.name);if(!sound||!can(sound.kind))return;
    if(sound.kind==='snore'&&profile.snoreSeconds>0&&finite(event.args?.[0],0)>profile.snoreSeconds)return;
    const stamp=now();if(stamp-lastSound<40)return;lastSound=stamp;
    const token=generation;
    try{
      if(!await ready(sound.kind)||token!==generation)return;
      const buffer=await decode('pack:'+sound.name,'soundAsset',{key:profile.key,name:sound.name},token);
      if(token!==generation||!can(sound.kind))return;
      play(buffer,{duration:Math.min(buffer.duration,10),volume:sound.volume,group:sound.name,repeat:sound.repeat});
    }catch{/* A missing optional sound does not interrupt the household. */}
  }
  function setPan(value){if(panner)panner.pan.value=profile?.panByPosition?Math.max(-.5,Math.min(.5,finite(value,0))):0;}
  function dispose(){
    if(disposed)return disposal;stop();disposed=true;signal?.removeEventListener('abort',abort);clearBuffers();profile=null;recent.clear();
    disposal=(async()=>{try{master?.disconnect();panner?.disconnect();await context?.close();}catch{}})();
    return disposal;
  }
  const abort=()=>{void dispose();};signal?.addEventListener('abort',abort,{once:true});
  if(signal?.aborted)void dispose();
  return {configure,unlock,setShown,speak,playFigureSound,setPan,stop,dispose,
    getState:()=>({contextState:context?.state??'absent',contextCount,playing:sources.size,pending,cacheEntries:buffers.size,generation,shown,unlocked,disposed,spokenCount})};
}
