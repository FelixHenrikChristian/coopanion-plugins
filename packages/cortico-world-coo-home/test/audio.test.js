import test from 'node:test';
import assert from 'node:assert/strict';
import {createHomeAudio} from '../src/audio.js';

function neutralWave(){
  const bytes=new Uint8Array(44+1600),view=new DataView(bytes.buffer);
  const text=(at,value)=>{for(let i=0;i<value.length;i++)bytes[at+i]=value.charCodeAt(i);};
  text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');view.setUint32(16,16,true);
  view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,1600,true);
  for(let i=0;i<800;i++)view.setInt16(44+i*2,Math.sin(i/16000*Math.PI*2*400)*1000,true);
  return new Blob([bytes],{type:'audio/wav'});
}
class FakeAudioContext{
  state='suspended';currentTime=0;destination={};starts=0;stops=0;closes=0;resumes=0;
  createGain(){return {gain:{value:0},connect(){},disconnect(){}};}
  createStereoPanner(){return {pan:{value:0},connect(){},disconnect(){}};}
  createBufferSource(){const owner=this;return {playbackRate:{value:1},connect(){},disconnect(){},start(){owner.starts++;},stop(){owner.stops++;this.onended?.();}};}
  async decodeAudioData(){return {duration:.05,length:800,numberOfChannels:1};}
  async resume(){this.state='running';this.resumes++;}
  async suspend(){this.state='suspended';}
  async close(){this.state='closed';this.closes++;}
}
const profile=()=>({key:'neutral-profile',assetKey:'neutral-assets',enabled:true,volume:60,kinds:{talk:true,move:true,snore:true},snoreSeconds:1,panByPosition:true,speech:{enabled:true,pitchHz:400,unitsPerSecond:10},voice:{pitch:1},sounds:[{name:'neutral-note',kind:'talk',volume:.4,repeat:'overlap'},{name:'neutral-step',kind:'move',volume:.2,repeat:'finish'}]});
const unit={at:0,key:'a',tone:0,stress:false,weak:false,pos:0,of:1,end:''};
function fixture(options={}){
  const calls=[],context=new FakeAudioContext(),abort=new AbortController();let talked=0;
  const ctx={invoke:async(method,args)=>{calls.push({method,args});if(options.invoke)return options.invoke(method,args);return method==='speechBank'?{hz:400,units:{a:[0,.04]}}:{units:[unit]};},
    invokeBinary:async(method,args)=>{calls.push({method,args,binary:true});return options.binary?options.binary(method,args):neutralWave();}};
  const audio=createHomeAudio({ctx,signal:abort.signal,createContext:()=>context,onTalk:()=>{talked++;}});audio.configure(profile());
  return {audio,context,calls,abort,talked:()=>talked};
}
async function until(check){for(let i=0;i<60;i++){if(check())return;await new Promise(resolve=>setTimeout(resolve,5));}assert(check(),'Audio condition did not settle');}

test('audio requires interaction, respects mute and releases its own context',async()=>{
  const f=fixture();await f.audio.speak('sample');assert.equal(f.calls.length,0);assert.equal(f.audio.getState().contextCount,0);
  await f.audio.unlock();const silent={...profile(),key:'muted',enabled:false};f.audio.configure(silent);
  await f.audio.speak('sample');await f.audio.playFigureSound({name:'neutral-step',kind:'move'});assert.equal(f.calls.length,0);
  await f.audio.dispose();assert.equal(f.context.closes,1);assert.equal(f.audio.getState().disposed,true);
});

test('official syllable protocol plays only in the home context and stops immediately when hidden',async()=>{
  const f=fixture();await f.audio.unlock();const speech=f.audio.speak('sample',{utteranceId:'neutral-reply'});
  await until(()=>f.context.starts>0);assert(f.calls.some(call=>call.method==='speechUnits'));assert(f.calls.some(call=>call.method==='speechBank'&&call.binary));
  f.audio.setShown(false);assert.equal(f.audio.getState().playing,0);assert.equal(f.context.state,'suspended');await speech;
  const started=f.context.starts;f.audio.setShown(true);await new Promise(resolve=>setTimeout(resolve,30));assert.equal(f.context.starts,started);
  await f.audio.speak('sample',{utteranceId:'neutral-reply'});assert.equal(f.context.starts,started,'Repeated replies must not replay');
  await f.audio.dispose();
});

test('hidden and switched profiles discard late speech before any sound starts',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const f=fixture({invoke:async method=>method==='speechBank'?{hz:400,units:{a:[0,.04]}}:gate});
  await f.audio.unlock();const speech=f.audio.speak('sample');await until(()=>f.calls.some(call=>call.method==='speechUnits'));
  f.audio.setShown(false);f.audio.configure({...profile(),key:'next-profile'});release({units:[unit]});await speech;
  assert.equal(f.context.starts,0);f.audio.setShown(true);assert.equal(f.context.starts,0);await f.audio.dispose();
});

test('missing speech service falls back to a declared talk clip, then remains text-only if absent',async()=>{
  const f=fixture({invoke:async()=>{throw Error('Offline');}});await f.audio.unlock();const speech=f.audio.speak('sample');
  await until(()=>f.context.starts>0);assert(f.calls.some(call=>call.method==='soundAsset'&&call.args[0].name==='neutral-note'));
  f.audio.stop();await speech;f.audio.configure({...profile(),key:'without-sounds',sounds:[]});
  const starts=f.context.starts;await f.audio.speak('sample');assert.equal(f.context.starts,starts);await f.audio.dispose();
});

test('Figure audio uses declared classification, ignores unknown sounds and shares no state between panels',async()=>{
  const a=fixture(),b=fixture();await Promise.all([a.audio.unlock(),b.audio.unlock()]);
  a.audio.configure({...profile(),key:'talk-muted',kinds:{talk:false,move:true}});
  await a.audio.playFigureSound({name:'neutral-note',kind:'move'});await a.audio.playFigureSound({name:'not-declared',kind:'move'});assert.equal(a.calls.length,0);
  await Promise.all([a.audio.playFigureSound({name:'neutral-step',kind:'move'}),b.audio.playFigureSound({name:'neutral-step',kind:'move'})]);
  assert.equal(a.context.starts,1);assert.equal(b.context.starts,1);
  a.audio.setShown(false);assert.equal(a.audio.getState().playing,0);assert.equal(b.audio.getState().playing,1);
  await Promise.all([a.audio.dispose(),b.audio.dispose()]);assert.equal(a.context.closes,1);assert.equal(b.context.closes,1);
});

test('abort stops scheduled sources and invalidates inflight buffers',async()=>{
  let release;const gate=new Promise(resolve=>{release=resolve;});const f=fixture({binary:()=>gate});
  await f.audio.unlock();const speech=f.audio.speak('sample');await until(()=>f.audio.getState().pending>0);
  f.abort.abort();release(neutralWave());await speech;await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.context.starts,0);assert.equal(f.context.state,'closed');assert.equal(f.audio.getState().cacheEntries,0);assert.equal(f.audio.getState().playing,0);
});

test('repeated disposal after signal abort awaits the same pending context close',async()=>{
  const f=fixture();await f.audio.unlock();let release;
  f.context.close=()=>{f.context.closes++;return new Promise(resolve=>{release=()=>{f.context.state='closed';resolve();};});};
  f.abort.abort();const first=f.audio.dispose(),second=f.audio.dispose();
  assert.equal(first,second);assert.equal(f.context.closes,1);
  let settled=false;first.then(()=>{settled=true;});await Promise.resolve();assert.equal(settled,false);
  release();await second;assert.equal(settled,true);assert.equal(f.context.state,'closed');
});
