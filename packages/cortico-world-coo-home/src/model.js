import {readFile,stat} from 'node:fs/promises';
import {join,resolve,isAbsolute} from 'node:path';

export const safeError=(code,message)=>Object.assign(Error(message),{code});
export function checkAbort(signal){if(signal?.aborted)throw safeError('HOME_CANCELLED','本次请求已停止。');}
export async function settleWithin(promises,ms=5000){let timer;try{return await Promise.race([Promise.allSettled(promises).then(()=>true),new Promise(resolve=>{timer=setTimeout(()=>resolve(false),ms);})]);}finally{clearTimeout(timer);}}
const plain=value=>!!value&&typeof value==='object'&&!Array.isArray(value);
const noop=()=>{};
const quietLog={trace:noop,debug:noop,info:noop,warn:noop,error:noop,emit:noop,child:()=>quietLog};
async function textFile(file,limit,optional=false){
  try{
    if((await stat(file)).size>limit)throw safeError('HOME_MODEL_CONFIG','模型或人格配置过大，暂时无法读取。');
    const bytes=await readFile(file);if(bytes.length>limit)throw safeError('HOME_MODEL_CONFIG','模型或人格配置过大，暂时无法读取。');
    return(bytes[0]===255&&bytes[1]===254?bytes.subarray(2).toString('utf16le'):bytes.toString('utf8')).replace(/^\uFEFF/,'');
  }catch(error){if(optional&&error.code==='ENOENT')return '';throw error;}
}

// The host's resolver maps these specifiers to its own module URLs. In
// particular the provider registry and OAuth clients must not be bundled.
export async function loadHostSdk(){
  const [registry,paths,context,helpers]=await Promise.all([
    import('cortico/providers/registry.ts'),import('cortico/paths.ts'),
    import('cortico/protocol/open-responses/context.ts'),import('cortico/protocol/open-responses/context-helpers.ts')
  ]);
  return{...registry,...paths,...context,...helpers};
}

export async function selectedModel(ctx,sdk){
  try{
    const config=JSON.parse(await textFile(join(ctx.botDir,'config.json'),256*1024));
    const name=config.activeProvider;
    if(typeof name!=='string'||!name||name.length>160||name==='.'||name==='..'||/[\\/\0:]/.test(name))throw Error('No endpoint');
    const stateRoot=sdk.providersRoot(),entry=JSON.parse(await textFile(join(stateRoot,name,'config.json'),256*1024));
    if(!plain(entry)||typeof entry.kind!=='string'||!plain(entry.spec)||typeof entry.spec.model!=='string'||!entry.spec.model.trim()||typeof entry.spec.thinking!=='boolean')throw Error('No selected model');
    const module=sdk.providerModule(entry.kind);
    if(module.availability?.(name,entry,'zh')?.ready===false)throw Error('Unavailable');
    const memory=typeof config.paths?.memory==='string'?config.paths.memory:'workspace';
    const memoryDir=isAbsolute(memory)?memory:resolve(ctx.botDir,memory);
    const constitution=await textFile(join(memoryDir,'CONSTITUTION.md'),64*1024,true);
    return{name,entry:structuredClone(entry),spec:structuredClone(entry.spec),stateRoot,keepThinking:config.context?.keepPastThinking!==false,constitution};
  }catch(error){if(error.code==='HOME_MODEL_CONFIG')throw error;throw safeError('HOME_MODEL_CONFIG','请先在 Coopanion 中选择可用的模型服务与模型；家园会沿用该配置。');}
}

/** One bounded request chain, independent of the desktop Persona's sessions. */
export class HomeModel{
  constructor({ctx,host={},sdkLoader=loadHostSdk,selection=selectedModel,timeoutMs=90_000,maxRounds=4}={}){
    this.ctx=ctx;this.host=host;this.sdkLoader=sdkLoader;this.selection=selection;this.timeoutMs=timeoutMs;this.maxRounds=maxRounds;this.registry=null;this.entries={};this.reported=new Set();this.closed=false;this.controller=new AbortController();this.inflight=new Set();this.ended=true;
  }
  async run({records=[],system='',tools=[],signal,onText=noop,onRecords=async()=>{},beforeRespond=async()=>{},sessionId='home'}={}){
    checkAbort(signal);if(this.closed)throw safeError('HOME_CANCELLED','家园已关闭。');
    const timeout=AbortSignal.timeout(this.timeoutMs),combined=AbortSignal.any([this.controller.signal,timeout,...(signal?[signal]:[])]);
    let sdk,selected;
    try{sdk=await this.sdkLoader();selected=await this.selection(this.ctx,sdk);}catch(error){if(error.code?.startsWith('HOME_'))throw error;throw safeError('HOME_MODEL_CONFIG','当前宿主暂不支持家园模型连接，请更新 Coopanion。');}
    checkAbort(combined);
    this.entries[selected.name]=selected.entry;
    if(!this.registry)this.registry=new sdk.ProviderRegistry(()=>this.entries,{stateRoot:selected.stateRoot,repoRoot:this.ctx.repoRoot,readBlob:()=>null,keepThinking:()=>this.keepThinking,log:quietLog});
    this.keepThinking=selected.keepThinking;
    const client=this.registry.bind(selected.name),spec=selected.spec;
    const prefix=sdk.message('system',[system,'以下是只读沿用的人格设定。家园只能操作本次工具表中的家园物件，不能访问桌面、文件、主会话或修改人格。',selected.constitution].join('\n\n'));
    const context=[prefix,...structuredClone(records)],added=[],calls=new Map();let finalText='',totalCalls=0;
    const report=attempts=>{for(const attempt of attempts??[]){if(!attempt||this.reported.has(attempt.id))continue;this.reported.add(attempt.id);try{this.host.reportUsage?.(sdk.usageCounters(attempt.meters),{model:attempt.origin?.model??spec.model,label:'coo家园',charges:attempt.charges??[]});}catch{}}if(this.reported.size>1024)this.reported=new Set([...this.reported].slice(-512));};
    const append=async values=>{context.push(...values);added.push(...values);if(JSON.stringify(added).length>180_000)throw safeError('HOME_MODEL_LIMIT','本轮回复内容过长，已停止继续生成。');await onRecords(structuredClone(added));};
    try{
      for(let round=0;round<this.maxRounds;round++){
        checkAbort(combined);await beforeRespond();checkAbort(combined);totalCalls++;
        let generated,streamText='';
        try{
          const request=client.respond(sdk.responseRequest(spec,context,tools),{context,nativeSpec:spec,signal:combined,role:'worlds.coo-home',sessionId,
            onEvent:event=>{if(combined.aborted)return;if(event.type==='response.output_text.delta'&&typeof event.delta==='string'){streamText=(streamText+event.delta).slice(0,16_000);onText(streamText);}}
          });this.inflight.add(request);try{generated=await request;}finally{this.inflight.delete(request);}report(generated.attempts);
        }catch(error){report(error.attempts);throw error;}
        checkAbort(combined);
        if(!plain(generated.response)||!Array.isArray(generated.response.output))throw Error('Invalid provider response');
        const output=sdk.responseRecords(generated.response,generated.origin);
        await append(output);
        const text=output.filter(row=>row.item.type==='message').map(row=>sdk.itemText(row.item)).join('').slice(0,16_000);
        if(text){finalText=text;onText(text);}
        const functions=generated.response.output.filter(item=>item.type==='function_call');
        if(!functions.length)return{records:added,text:finalText||'这次没有生成文字回复。',calls:totalCalls};
        if(functions.length>8)throw safeError('HOME_MODEL_LIMIT','本轮请求的动作过多，已停止继续执行。');
        for(const call of functions){
          checkAbort(combined);
          const key=call.call_id,fingerprint=JSON.stringify([call.name,call.arguments]),previous=calls.get(key);
          let receipt;
          if(typeof key!=='string'||key.length>160)throw Error('Invalid tool call');
          if(previous)receipt=previous.fingerprint===fingerprint?previous.text:JSON.stringify({ok:false,error:'重复的工具编号不能更换参数。'});
          else{
            const tool=tools.find(value=>value.name===call.name);
            if(call.status!==undefined&&call.status!=='completed'||generated.response.status!=='completed')receipt=JSON.stringify({ok:false,error:'模型输出尚未完整，动作未执行。'});
            else if(!tool)receipt=JSON.stringify({ok:false,error:'这个工具不属于家园。'});
            else{
              try{
                if(typeof call.arguments!=='string'||call.arguments.length>8000)throw Error('Invalid arguments');
                const args=JSON.parse(call.arguments||'{}');if(!plain(args))throw Error('Invalid arguments');
                const value=await tool.handler(args,{signal:combined,role:'worlds.coo-home',callId:key,log:quietLog});
                receipt=typeof value==='string'?value:value?.text;
                if(typeof receipt!=='string')throw Error('Invalid tool result');
              }catch(error){checkAbort(combined);receipt=JSON.stringify({ok:false,error:error.code?.startsWith('HOME_')?error.message:'家园没有接受这条操作，请检查当前状态和动作参数。'});}
            }
            calls.set(key,{fingerprint,text:receipt});
          }
          await append([sdk.functionResult(key,receipt)]);
        }
      }
      return{records:added,text:finalText||'本轮已到达处理上限。已接受的家园任务会继续执行，可在活动列表查看。',calls:totalCalls};
    }catch(error){
      if(signal?.aborted||this.closed)throw safeError('HOME_CANCELLED','本次请求已停止。');
      if(timeout.aborted)throw safeError('HOME_MODEL_TIMEOUT','模型回复超时，请稍后重试。');
      if(error.code?.startsWith('HOME_'))throw error;
      throw safeError('HOME_MODEL_FAILED','模型服务暂时无法完成回复，请稍后重试；已接受的家园任务仍可在活动列表查看。');
    }
  }
  async close(){this.closed=true;this.controller.abort();this.ended=await settleWithin([...this.inflight]);let stopping;try{stopping=this.registry?.stopAll();}catch{}if(stopping)this.ended=(await settleWithin([stopping]))&&this.ended;return this.ended;}
}
