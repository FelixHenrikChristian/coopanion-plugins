import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {HomeModel,selectedModel} from '../src/model.js';

const origin={instance:'fixture-endpoint',module:'fixture-provider',model:'fixture-model',compatibilityDomain:'fixture-domain'};
const msg=text=>({type:'message',role:'assistant',id:'fixture-message',status:'completed',content:[{type:'output_text',text,annotations:[]}]});
const fn=(id='fixture-call',args='{}',status='completed')=>({type:'function_call',id:'fixture-function',call_id:id,name:'coo_home',arguments:args,...(status===null?{}:{status})});
const attempt=id=>({id,origin,meters:{input:10,output:2,cachedInput:4,uncachedInput:6,reasoning:null},charges:[]});
const generation=(output,id='one')=>({origin,response:{id:'response-'+id,status:'completed',output},attempts:[attempt(id)]});
function adapter(respond){
  const seen=[];
  const sdk={ProviderRegistry:class{constructor(entries){this.entries=entries;}bind(name){seen.push(this.entries()[name]);return{respond};}async stopAll(){}},
    message:(role,text)=>({version:2,item:{type:'message',role,content:[{type:'input_text',text}]},context:{}}),
    responseRequest:(spec,records,tools)=>({model:spec.model,input:records.map(row=>row.item),tools}),
    responseRecords:(response,origin)=>response.output.map(item=>({version:2,item,context:{responseId:response.id,origin}})),
    functionResult:(call_id,output)=>({version:2,item:{type:'function_call_output',call_id,output,status:'completed'},context:{}}),
    itemText:item=>(item.content??[]).map(part=>part.text??'').join(''),
    usageCounters:meters=>({promptTokens:meters.input,completionTokens:meters.output,cacheHitTokens:meters.cachedInput,cacheMissTokens:meters.uncachedInput})};
  const usage=[],selection=async()=>({name:'fixture-endpoint',entry:{kind:'fixture-provider',spec:{model:'fixture-model',thinking:true}},spec:{model:'fixture-model',thinking:true},stateRoot:'unused-fixture-root',keepThinking:true,constitution:'Neutral fixture personality'});
  return{sdk,seen,usage,model:new HomeModel({ctx:{},host:{reportUsage:(...args)=>usage.push(args)},sdkLoader:async()=>sdk,selection})};
}

test('official context shape, origin, duplicate calls and every tool round usage are retained',async()=>{
  let round=0,actions=0,reserved=0;const requests=[];
  const f=adapter(async(request,options)=>{requests.push({request,options});return++round===1?generation([fn(),fn()],'a'):generation([msg('Accepted, not yet completed.')],'b');});
  const result=await f.model.run({system:'Home-only tools.',tools:[{name:'coo_home',handler:async()=>{actions++;return{text:'{"ok":true,"outcome":"accepted"}'};}}],beforeRespond:async()=>{reserved++;}});
  assert.equal(actions,1);assert.equal(round,2);assert.equal(reserved,2);assert.equal(f.usage.length,2);
  assert.equal(requests[1].options.context.filter(row=>row.item.type==='function_call_output').length,2);
  assert.deepEqual(result.records[0].context.origin,origin);assert.match(requests[0].request.input[0].content[0].text,/Neutral fixture personality/);
  assert.equal(f.usage[0][0].cacheHitTokens,4);await f.model.close();
});

test('omitted completed-call status works; changed duplicate arguments never run twice',async()=>{
  let round=0,actions=0;
  const f=adapter(async()=>++round===1?generation([fn('same','{}',null),fn('same','{"other":true}')]):generation([msg('Finished reply')],'two'));
  const result=await f.model.run({tools:[{name:'coo_home',handler:async()=>{actions++;return'ok';}}]});
  assert.equal(actions,1);assert.match(result.records.filter(row=>row.item.type==='function_call_output')[1].item.output,/重复/);await f.model.close();
});

test('aborting an in-flight provider records failed attempt usage and never executes late tools',async()=>{
  let entered,actions=0;const began=new Promise(resolve=>{entered=resolve;}),controller=new AbortController();
  const f=adapter(async(request,{signal})=>{entered();await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(Object.assign(Error('PRIVATE-provider-diagnostic'),{attempts:[attempt('aborted')]})),{once:true}));return generation([fn()]);});
  const run=f.model.run({signal:controller.signal,tools:[{name:'coo_home',handler:async()=>{actions++;return'ok';}}]});await began;controller.abort();
  await assert.rejects(run,error=>error.code==='HOME_CANCELLED'&&!error.message.includes('PRIVATE'));assert.equal(actions,0);assert.equal(f.usage.length,1);assert.equal(await f.model.close(),true);
});

test('provider errors are masked; incomplete function outputs do not cause actions',async()=>{
  const f=adapter(async()=>{throw Object.assign(Error('PRIVATE-key-or-provider-body'),{attempts:[attempt('failure')]});});
  await assert.rejects(f.model.run(),error=>error.code==='HOME_MODEL_FAILED'&&!error.message.includes('PRIVATE'));assert.equal(f.usage.length,1);await f.model.close();
  let actions=0;const g=adapter(async()=>({...generation([fn()]),response:{id:'incomplete',status:'incomplete',output:[fn()]}}));g.model.maxRounds=1;
  await g.model.run({tools:[{name:'coo_home',handler:async()=>{actions++;return'ok';}}]});assert.equal(actions,0);await g.model.close();
});

test('provider HTTP failures expose only safe categories without upstream private data',async()=>{
  const expected=new Map([[400,'REQUEST'],[422,'REQUEST'],[401,'AUTH'],[403,'ACCESS'],[404,'NOT_FOUND'],[429,'RATE_LIMIT'],[503,'UNAVAILABLE']]);
  for(const [status,category] of expected){
    const f=adapter(async()=>{throw Object.assign(Error('PRIVATE-request-content'),{status,body:'PRIVATE-provider-body',requestId:'PRIVATE-request-id',cause:Error('PRIVATE-key')});});
    await assert.rejects(f.model.run(),error=>{
      assert.equal(error.code,`HOME_MODEL_${category}`);assert.match(error.message,new RegExp(`HTTP ${status}`));
      assert.ok(!error.message.includes('PRIVATE'));assert.equal(error.cause,undefined);assert.equal(error.body,undefined);return true;
    });await f.model.close();
  }
  const f=adapter(async()=>{throw Object.assign(Error('PRIVATE'),{status:'400 PRIVATE'});});
  await assert.rejects(f.model.run(),error=>error.code==='HOME_MODEL_FAILED'&&!error.message.includes('PRIVATE'));await f.model.close();
});

test('selected endpoint and model are read each job, only Constitution is used',async t=>{
  const dir=await mkdtemp(join(tmpdir(),'home-model-test-'));t.after(()=>rm(dir,{recursive:true,force:true}));
  await mkdir(join(dir,'workspace'));await mkdir(join(dir,'providers','fixture-a'),{recursive:true});await mkdir(join(dir,'providers','fixture-b'),{recursive:true});
  await writeFile(join(dir,'workspace','CONSTITUTION.md'),'Neutral friendly fixture');await writeFile(join(dir,'workspace','PARTNER.md'),'Do not read this fixture partner file');
  const config=name=>writeFile(join(dir,'config.json'),JSON.stringify({activeProvider:name,paths:{memory:'workspace'}}));
  for(const name of ['fixture-a','fixture-b'])await writeFile(join(dir,'providers',name,'config.json'),JSON.stringify({kind:'fixture-provider',baseUrl:'http://127.0.0.1:1',spec:{model:name,thinking:false}}));
  const sdk={providersRoot:()=>join(dir,'providers'),providerModule:()=>({})};await config('fixture-a');const first=await selectedModel({botDir:dir},sdk);await config('fixture-b');const second=await selectedModel({botDir:dir},sdk);
  assert.equal(first.spec.model,'fixture-a');assert.equal(second.spec.model,'fixture-b');assert.equal(second.constitution,'Neutral friendly fixture');assert.ok(!JSON.stringify(second).includes('partner file'));
  await config('../outside');await assert.rejects(selectedModel({botDir:dir},sdk),error=>error.code==='HOME_MODEL_CONFIG');
});
