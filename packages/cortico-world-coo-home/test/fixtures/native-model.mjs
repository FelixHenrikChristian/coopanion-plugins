// Run with the installed host's tsx loader and COOPANION_APP_ROOT.
// Exercises its real Responses HTTP adapter against a strict loopback endpoint.
// All configuration, credentials, conversation and provider responses are synthetic.
import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {mkdtemp,mkdir,writeFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
import {HomeModel,loadHostSdk} from '../../src/model.js';
import {HomeChat} from '../../src/chat.js';

const app=process.env.COOPANION_APP_ROOT;
if(!app)throw Error('Set COOPANION_APP_ROOT to the installed application source directory.');
const temporary=await mkdtemp(join(tmpdir(),'coo-home-native-model-'));
process.env.CORTICO_HOME=join(temporary,'home');
process.env.CORTICO_EXTENSIONS_DIR=join(temporary,'extensions');
const originalFetch=globalThis.fetch;
globalThis.fetch=(input,init)=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
  if(url.hostname!=='127.0.0.1')throw Error('External requests are blocked in the native model fixture');
  return originalFetch(input,init);
};
const requests=[];let server,model,chat,registry,createResponse,toolRuns=0;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function settled(){
  for(let index=0;index<200;index++){if(chat.snapshot().job?.status!=='running')return chat.snapshot();await sleep(10);}
  throw Error('Native model fixture did not settle');
}
try{
  await import(pathToFileURL(join(app,'build/cortico/src/extensions/runtime.ts')).href);
  const sdk=await loadHostSdk();
  ({createResponse}=await import('cortico/protocol/open-responses/index.ts'));
  server=createServer(async(req,res)=>{
    try{
      assert.equal(req.method,'POST');assert.equal(req.url,'/v1/responses');
      assert.equal(req.headers.authorization,'Bearer synthetic-test-only');
      let text='';for await(const chunk of req)text+=chunk;
      const body=JSON.parse(text);requests.push(body);
      const invalid=body.input.findIndex(item=>item.type==='message'&&item.id!==undefined&&!/^msg_[a-zA-Z0-9_-]+$/.test(item.id));
      if(invalid>=0){
        res.writeHead(400,{'content-type':'application/json'});
        res.end(JSON.stringify({error:{type:'invalid_request_error',code:'invalid_value',param:`input[${invalid}].id`,message:"Expected an ID that begins with 'msg'."}}));return;
      }
      assert.equal(body.model,'neutral-fixture-model');assert.equal(body.store,false);assert.equal(body.stream,true);
      const result=createResponse(`resp_fixture_${requests.length}`,body);
      const hasTool=body.tools?.some(tool=>tool.name==='coo_home');
      const lastUser=body.input.findLastIndex(item=>item.type==='message'&&item.role==='user');
      const hasReceipt=body.input.slice(lastUser+1).some(item=>item.type==='function_call_output');
      res.writeHead(200,{'content-type':'text/event-stream'});
      let sequence=0;const emit=event=>res.write(`data: ${JSON.stringify({...event,sequence_number:sequence++})}\n\n`);
      emit({type:'response.created',response:result});
      result.status='completed';result.completed_at=Math.floor(Date.now()/1000);
      result.output=hasTool&&!hasReceipt
        ?[{type:'function_call',id:`fc_fixture_${requests.length}`,call_id:`call_fixture_${requests.length}`,name:'coo_home',arguments:'{"operation":"status"}',status:'completed'}]
        :[{type:'message',id:`msg_fixture_${requests.length}`,role:'assistant',status:'completed',content:[{type:'output_text',text:'Neutral local response.',annotations:[]}]}];
      const item=result.output[0];
      emit({type:'response.output_item.added',output_index:0,item:{...item,status:'in_progress',...(item.type==='message'?{content:[]}:{arguments:''})}});
      if(item.type==='message'){
        const part=item.content[0];
        emit({type:'response.content_part.added',item_id:item.id,output_index:0,content_index:0,part:{...part,text:''}});
        emit({type:'response.output_text.delta',item_id:item.id,output_index:0,content_index:0,delta:part.text});
        emit({type:'response.output_text.done',item_id:item.id,output_index:0,content_index:0,text:part.text});
        emit({type:'response.content_part.done',item_id:item.id,output_index:0,content_index:0,part});
      }else{
        emit({type:'response.function_call_arguments.delta',item_id:item.id,output_index:0,delta:item.arguments});
        emit({type:'response.function_call_arguments.done',item_id:item.id,output_index:0,arguments:item.arguments});
      }
      emit({type:'response.output_item.done',output_index:0,item});
      result.usage={input_tokens:10,output_tokens:5,total_tokens:15,input_tokens_details:{cached_tokens:0},output_tokens_details:{reasoning_tokens:0}};
      emit({type:'response.completed',response:result});res.end();
    }catch{res.writeHead(500,{'content-type':'application/json'});res.end('{"error":{"message":"Neutral fixture contract failure"}}');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const botDir=join(temporary,'bot'),stateRoot=sdk.providersRoot(),providerDir=join(stateRoot,'neutral-endpoint');
  await mkdir(join(botDir,'workspace'),{recursive:true});await mkdir(providerDir,{recursive:true});
  const entry={kind:'openai-responses-compat',baseUrl:`http://127.0.0.1:${server.address().port}/v1`,secret:'FIXTURE_KEY',spec:{model:'neutral-fixture-model',thinking:false}};
  await writeFile(join(botDir,'config.json'),JSON.stringify({activeProvider:'neutral-endpoint'}));
  await writeFile(join(botDir,'workspace','CONSTITUTION.md'),'Neutral native transport fixture.');
  await writeFile(join(providerDir,'config.json'),JSON.stringify(entry));
  await writeFile(join(providerDir,'.env'),'FIXTURE_KEY=synthetic-test-only\n');
  registry=new sdk.ProviderRegistry(()=>({'neutral-endpoint':entry}),{stateRoot,repoRoot:temporary,readBlob:()=>null});
  const client=registry.bind('neutral-endpoint');
  const legacy=sdk.message('user','Neutral legacy request.');legacy.item.id='home-user-chat-1';
  await assert.rejects(client.respond(sdk.responseRequest(entry.spec,[legacy],[]),{context:[legacy],nativeSpec:entry.spec,onEvent(){}}),error=>error.status===400);
  const native=sdk.message('user','Neutral official request.');
  const control=await client.respond(sdk.responseRequest(entry.spec,[native],[]),{context:[native],nativeSpec:entry.spec,onEvent(){}});
  assert.equal(control.response.status,'completed','Official message shape must pass the same endpoint');

  let saved=null;
  const store={async load(normalize){return saved?normalize(structuredClone(saved)):null;},async save(value){saved=structuredClone(value);},async flush(){}};
  model=new HomeModel({ctx:{botDir,repoRoot:temporary},timeoutMs:5000});
  await assert.rejects(model.run({records:[legacy]}),error=>error.code==='HOME_MODEL_REQUEST'&&/HTTP 400/.test(error.message)&&!error.message.includes('home-user'));
  const tools=()=>[{name:'coo_home',description:'Read neutral fixture status.',parameters:{type:'object',properties:{operation:{type:'string'}},required:['operation'],additionalProperties:false},handler:async()=>{toolRuns++;return{text:'{"ok":true}'};}}];
  chat=new HomeChat({store,model,tools});await chat.start();
  await chat.send({text:'Neutral first home request.',clientId:'native-first'});
  const first=await settled();
  assert.equal(first.job.status,'done');assert.equal(toolRuns,1);
  assert.match(requests.at(-1).instructions,/Neutral native transport fixture/);
  await chat.stop();chat=new HomeChat({store,model,tools});await chat.start();
  await chat.send({text:'Neutral second home request.',clientId:'native-second'});
  assert.equal((await settled()).job.status,'done');assert.equal(toolRuns,2);
  const latest=requests.at(-1);
  assert.equal(latest.input.filter(item=>item.type==='message'&&item.role==='user').length,2);
  assert.ok(latest.input.some(item=>item.type==='function_call_output'));
  assert.ok(latest.input.filter(item=>item.type==='message').every(item=>item.id===undefined||item.id.startsWith('msg_')));
  console.log(JSON.stringify({nativeAdapter:'openai-responses-compat',legacyRejection:'HTTP 400',officialControl:'passed',homeChat:'passed',toolFollowup:'passed',savedHistoryReplay:'passed',externalRequests:0}));
}finally{
  await chat?.stop();await model?.close();await registry?.stopAll();
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  globalThis.fetch=originalFetch;await rm(temporary,{recursive:true,force:true});
}
